package repository

import (
	"context"
	"errors"
	"fmt"
	"path"
	"regexp"
	"sort"
	"strings"

	"team4s.v3/backend/internal/importutil"
	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type ReleaseCreationCrewSeeder interface {
	SeedCreatedReleaseInTx(context.Context, pgx.Tx, int64, int64) error
}

func upsertImportReleaseGraph(
	ctx context.Context,
	tx pgx.Tx,
	crewSeeder ReleaseCreationCrewSeeder,
	ids episodeImportReleaseIDs,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
	episodeIDsByNumber map[int32]int64,
) (bool, error) {
	// Lock the provider/item row before looking up ownership so concurrent imports
	// into different anime cannot both observe an unbound item and create graphs.
	snapshot := models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: media.MediaSourceID,
		SourcePath: media.Path, StreamsComplete: media.StreamsComplete,
		SelectedAudioIndex: media.SelectedAudioIndex, AudioTracks: media.AudioTracks, SubtitleTracks: media.SubtitleTracks}
	streamSourceID, sourceErr := upsertStreamSourceSnapshot(ctx, tx, "jellyfin", mapping.MediaItemID, media.StreamURL, &snapshot)
	if sourceErr != nil {
		return false, sourceErr
	}
	var variantID, existingAnimeID int64
	err := tx.QueryRow(ctx, `
		SELECT rv.id, ep.anime_id
		FROM stream_sources ss
		JOIN release_streams rs ON rs.stream_source_id = ss.id
		JOIN release_variants rv ON rv.id = rs.variant_id
        JOIN release_versions rev ON rev.id=rv.release_version_id
        JOIN fansub_releases fr ON fr.id=rev.release_id
        JOIN episodes ep ON ep.id=fr.episode_id
		WHERE ss.provider_type = 'jellyfin' AND ss.external_id = $1
		ORDER BY rv.id ASC
		LIMIT 1
	`, mapping.MediaItemID).Scan(&variantID, &existingAnimeID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, fmt.Errorf("query existing release variant media=%s: %w", mapping.MediaItemID, err)
	}

	if err == nil {
		// The apply transaction already owns the input anime lock. Reject another
		// anime before touching its variant lock, preventing inverted lock order
		// and avoiding cross-anime media/assignment ownership changes.
		if existingAnimeID != ids.AnimeID {
			return false, ErrConflict
		}
		if lockErr := tx.QueryRow(ctx, `SELECT id FROM release_variants WHERE id=$1 FOR UPDATE`, variantID).Scan(&variantID); lockErr != nil {
			return false, lockErr
		}
	}

	created := false
	var releaseVersionID int64
	if errors.Is(err, pgx.ErrNoRows) {
		releaseID, err := createFansubRelease(ctx, tx, ids.PrimaryEpisodeID, ids.ReleaseSourceID)
		if err != nil {
			return false, err
		}
		releaseVersionID, err = createReleaseVersion(ctx, tx, releaseID, mapping.ReleaseVersion, episodeImportReleaseTitle(mapping, media))
		if err != nil {
			return false, err
		}
		variantID, err = createReleaseVariant(ctx, tx, releaseVersionID, media)
		if err != nil {
			return false, err
		}
		created = true
	} else {
		if err := tx.QueryRow(ctx, `SELECT release_version_id FROM release_variants WHERE id = $1`, variantID).Scan(&releaseVersionID); err != nil {
			return false, fmt.Errorf("query release version for variant=%d: %w", variantID, err)
		}
		if _, err := tx.Exec(ctx, `
			UPDATE release_variants
			SET filename = COALESCE(NULLIF($1, ''), filename),
			    resolution = COALESCE($2, resolution),
			    video_quality = COALESCE($2, video_quality),
			    video_codec = COALESCE($4, video_codec),
			    audio_codec = COALESCE($5, audio_codec),
			    duration_seconds = COALESCE($6, duration_seconds),
			    container = COALESCE($7, container),
			    updated_at = NOW(),
			    modified_at = NOW()
			WHERE id = $3
		`, episodeImportFilename(media), media.VideoQuality, variantID, media.VideoCodec, media.AudioCodec, media.DurationSeconds, media.Container); err != nil {
			return false, fmt.Errorf("update release variant=%d: %w", variantID, err)
		}
	}

	if err := upsertNormalizedReleaseStream(ctx, tx, variantID, ids.StreamTypeID, streamSourceID, mapping.MediaItemID); err != nil {
		return false, err
	}
	if err := upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media); err != nil {
		return false, err
	}
	if created && crewSeeder != nil {
		if err := seedCreatedReleaseCrews(ctx, tx, crewSeeder, releaseVersionID); err != nil {
			return false, err
		}
	}
	for index, episodeNumber := range mapping.TargetEpisodeNumbers {
		episodeID := episodeIDsByNumber[episodeNumber]
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_variant_episodes (release_variant_id, episode_id, position)
			VALUES ($1, $2, $3)
			ON CONFLICT (release_variant_id, episode_id) DO UPDATE
			SET position = EXCLUDED.position
		`, variantID, episodeID, index+1); err != nil {
			return false, fmt.Errorf("upsert release coverage variant=%d episode=%d: %w", variantID, episodeID, err)
		}
	}
	return created, nil
}

func seedCreatedReleaseCrews(
	ctx context.Context,
	tx pgx.Tx,
	crewSeeder ReleaseCreationCrewSeeder,
	releaseVersionID int64,
) error {
	rows, err := tx.Query(ctx, `
		SELECT fansub_group_id
		FROM release_version_groups
		WHERE release_version_id = $1
		ORDER BY fansub_group_id
	`, releaseVersionID)
	if err != nil {
		return fmt.Errorf("query release creation groups version=%d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	var fansubGroupIDs []int64
	for rows.Next() {
		var fansubGroupID int64
		if err := rows.Scan(&fansubGroupID); err != nil {
			return fmt.Errorf("scan release creation group version=%d: %w", releaseVersionID, err)
		}
		fansubGroupIDs = append(fansubGroupIDs, fansubGroupID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate release creation groups version=%d: %w", releaseVersionID, err)
	}
	for _, fansubGroupID := range fansubGroupIDs {
		if err := crewSeeder.SeedCreatedReleaseInTx(ctx, tx, releaseVersionID, fansubGroupID); err != nil {
			return fmt.Errorf("seed release crew version=%d group=%d: %w", releaseVersionID, fansubGroupID, err)
		}
	}
	return nil
}

func createFansubRelease(ctx context.Context, tx pgx.Tx, episodeID int64, sourceID int64) (int64, error) {
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO fansub_releases (episode_id, source_id, source, modified_at)
		VALUES ($1, $2, $2, NOW())
		RETURNING id
	`, episodeID, sourceID).Scan(&id); err != nil {
		return 0, fmt.Errorf("create fansub release episode=%d: %w", episodeID, err)
	}
	return id, nil
}

func createReleaseVersion(ctx context.Context, tx pgx.Tx, releaseID int64, version *string, title *string) (int64, error) {
	versionText := strings.TrimSpace(derefString(version))
	if versionText == "" {
		versionText = "v1"
	}
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO release_versions (release_id, version, title, modified_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id
	`, releaseID, versionText, title).Scan(&id); err != nil {
		return 0, fmt.Errorf("create release version release=%d: %w", releaseID, err)
	}
	return id, nil
}

func createReleaseVariant(ctx context.Context, tx pgx.Tx, releaseVersionID int64, media models.EpisodeImportMediaCandidate) (int64, error) {
	filename := episodeImportFilename(media)
	container := media.Container
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO release_variants (release_version_id, container, resolution, video_quality, video_codec, audio_codec, filename, duration_seconds, modified_at)
		VALUES ($1, NULLIF($2, ''), $3, $3, $4, $5, NULLIF($6, ''), $7, NOW())
		RETURNING id
	`, releaseVersionID, container, media.VideoQuality, media.VideoCodec, media.AudioCodec, filename, media.DurationSeconds).Scan(&id); err != nil {
		return 0, fmt.Errorf("create release variant version=%d: %w", releaseVersionID, err)
	}
	return id, nil
}

func upsertReleaseVersionGroup(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
) error {
	memberGroups, err := resolveImportFansubSelection(ctx, tx, mapping, media)
	if err != nil || len(memberGroups) == 0 {
		return err
	}

	animeID, err := lookupAnimeIDByReleaseVersion(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}
	if err := lockSegmentAssignmentAnimeTx(ctx, tx, animeID); err != nil {
		return err
	}

	newIDs := make([]int64, len(memberGroups))
	for i, g := range memberGroups {
		newIDs[i] = g.ID
	}
	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND fansub_group_id <> ALL($2::bigint[])
	`, releaseVersionID, newIDs); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}

	// Phase 156, Workstream B (P156-04): Episoden-Sortindex + normalisierte Version EINMAL
	// aufloesen (nicht pro Gruppe), damit das nachfolgende Auto-Assign gebuendelt pro Gruppe
	// laufen kann statt pro Segment. Siehe episode_import_repository_release_autoassign.go.
	episodeSortIndex, normalizedVersion, err := resolveReleaseVersionEpisodeSortIndexAndVersion(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}

	for _, group := range memberGroups {
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id)
			VALUES ($1, $2)
			ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
		`, releaseVersionID, group.ID); err != nil {
			return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
		}
	}
	if err := autoAssignThemeSegmentsForNewReleaseVersion(ctx, tx, releaseVersionID, newIDs, normalizedVersion, episodeSortIndex); err != nil {
		return err
	}

	return ensureAnimeFansubGroupLinksForMembers(ctx, tx, animeID, memberGroups)
}

func resolveImportFansubSelection(
	ctx context.Context,
	tx pgx.Tx,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
) ([]resolvedImportFansubGroup, error) {
	if mapping.FansubGroups != nil {
		return resolveImportFansubSelectionFromInputs(ctx, tx, mapping.FansubGroups)
	}

	if mapping.FansubGroupID != nil && *mapping.FansubGroupID > 0 {
		group, err := lookupImportFansubGroupByID(ctx, tx, *mapping.FansubGroupID)
		if err != nil {
			return nil, err
		}
		return []resolvedImportFansubGroup{*group}, nil
	}

	name := strings.TrimSpace(derefString(mapping.FansubGroupName))
	if name == "" {
		name = deriveFansubGroupName(media)
	}
	parsedNames := parseImportFansubGroupNames(name)
	if len(parsedNames) == 0 {
		return nil, nil
	}

	selectedGroups := make([]models.SelectedFansubGroupInput, 0, len(parsedNames))
	for _, parsedName := range parsedNames {
		nextName := parsedName
		selectedGroups = append(selectedGroups, models.SelectedFansubGroupInput{Name: &nextName})
	}
	return resolveImportFansubSelectionFromInputs(ctx, tx, selectedGroups)
}

// resolveImportFansubSelectionFromInputs löst Fansub-Gruppen-Eingaben auf.
// Delegiert an resolveImportFansubMemberGroups aus episode_import_repository_fansub_helpers.go.
func resolveImportFansubSelectionFromInputs(
	ctx context.Context,
	tx pgx.Tx,
	inputs []models.SelectedFansubGroupInput,
) ([]resolvedImportFansubGroup, error) {
	return resolveImportFansubMemberGroups(ctx, tx, inputs)
}

func lookupAnimeIDByReleaseVersion(ctx context.Context, tx pgx.Tx, releaseVersionID int64) (int64, error) {
	var animeID int64
	if err := tx.QueryRow(ctx, `
		SELECT e.anime_id
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		WHERE rev.id = $1
	`, releaseVersionID).Scan(&animeID); err != nil {
		return 0, fmt.Errorf("lookup anime for release version %d: %w", releaseVersionID, err)
	}
	return animeID, nil
}

// ensureAnimeFansubGroupLinksForMembers schreibt idempotente anime_fansub_groups-Zeilen
// für alle echten Mitglieds-Gruppen (D-07 — nur echte Mitglieds-IDs, keine Kombigruppen-ID).
func ensureAnimeFansubGroupLinksForMembers(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	memberGroups []resolvedImportFansubGroup,
) error {
	for _, groupID := range buildAnimeFansubLinkGroupIDs(memberGroups) {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)
			VALUES ($1, $2, false, NULL)
			ON CONFLICT (anime_id, fansub_group_id) DO NOTHING
		`, animeID, groupID); err != nil {
			return fmt.Errorf("ensure anime fansub group link anime=%d group=%d: %w", animeID, groupID, err)
		}
	}
	return nil
}

func parseImportFansubGroupNames(raw string) []string {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return nil
	}
	splitter := regexp.MustCompile(`(?i)\s*(?:&|\+| und )\s*`)
	parts := splitter.Split(normalized, -1)
	return canonicalizeImportFansubGroupNames(parts)
}

func canonicalizeImportFansubGroupNames(names []string) []string {
	type namedGroup struct {
		display    string
		normalized string
	}
	unique := make(map[string]namedGroup, len(names))
	for _, name := range names {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		normalized := strings.ToLower(trimmed)
		if _, exists := unique[normalized]; exists {
			continue
		}
		unique[normalized] = namedGroup{display: trimmed, normalized: normalized}
	}
	items := make([]namedGroup, 0, len(unique))
	for _, item := range unique {
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].normalized < items[j].normalized
	})
	result := make([]string, 0, len(items))
	for _, item := range items {
		result = append(result, item.display)
	}
	return result
}

// buildAnimeFansubLinkGroupIDs extrahiert deduplizierte, sortierte Gruppen-IDs
// aus einer flachen Liste echter Mitglieds-Gruppen (D-07 — kein EffectiveGroup mehr).
func buildAnimeFansubLinkGroupIDs(memberGroups []resolvedImportFansubGroup) []int64 {
	seen := make(map[int64]struct{}, len(memberGroups))
	result := make([]int64, 0, len(memberGroups))
	for _, group := range memberGroups {
		if group.ID <= 0 {
			continue
		}
		if _, exists := seen[group.ID]; exists {
			continue
		}
		seen[group.ID] = struct{}{}
		result = append(result, group.ID)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i] < result[j]
	})
	return result
}

func episodeImportFilename(media models.EpisodeImportMediaCandidate) string {
	if trimmed := strings.TrimSpace(media.FileName); trimmed != "" {
		return trimmed
	}
	normalizedPath := strings.ReplaceAll(strings.TrimSpace(media.Path), "\\", "/")
	if normalizedPath != "" {
		return path.Base(normalizedPath)
	}
	return ""
}

func episodeImportReleaseTitle(mapping models.EpisodeImportMappingRow, media models.EpisodeImportMediaCandidate) *string {
	if filename := episodeImportFilename(media); filename != "" {
		return &filename
	}
	label := fmt.Sprintf("Episode %d", mapping.TargetEpisodeNumbers[0])
	return &label
}

func deriveFansubGroupName(media models.EpisodeImportMediaCandidate) string {
	return importutil.DeriveFansubGroupName(media.FileName, media.Path)
}
