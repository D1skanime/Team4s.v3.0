package repository

import (
	"context"
	"errors"
	"fmt"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"team4s.v3/backend/internal/importutil"
	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type resolvedImportFansubGroup struct {
	ID   int64
	Name string
	Slug string
}

type resolvedImportFansubSelection struct {
	EffectiveGroup *resolvedImportFansubGroup
	MemberGroups   []resolvedImportFansubGroup
}

func upsertImportReleaseGraph(
	ctx context.Context,
	tx pgx.Tx,
	ids episodeImportReleaseIDs,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
	episodeIDsByNumber map[int32]int64,
) (bool, error) {
	var variantID int64
	err := tx.QueryRow(ctx, `
		SELECT rv.id
		FROM stream_sources ss
		JOIN release_streams rs ON rs.stream_source_id = ss.id
		JOIN release_variants rv ON rv.id = rs.variant_id
		WHERE ss.provider_type = 'jellyfin' AND ss.external_id = $1
		ORDER BY rv.id ASC
		LIMIT 1
		FOR UPDATE
	`, mapping.MediaItemID).Scan(&variantID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, fmt.Errorf("query existing release variant media=%s: %w", mapping.MediaItemID, err)
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
		if err := createReleaseStream(ctx, tx, variantID, ids.StreamTypeID, mapping, media); err != nil {
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
			    updated_at = NOW(),
			    modified_at = NOW()
			WHERE id = $3
		`, episodeImportFilename(media), media.VideoQuality, variantID); err != nil {
			return false, fmt.Errorf("update release variant=%d: %w", variantID, err)
		}
	}

	if err := upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media); err != nil {
		return false, err
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
	container := strings.TrimPrefix(strings.ToLower(filepath.Ext(filename)), ".")
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO release_variants (release_version_id, container, resolution, video_quality, filename, modified_at)
		VALUES ($1, NULLIF($2, ''), $3, $3, NULLIF($4, ''), NOW())
		RETURNING id
	`, releaseVersionID, container, media.VideoQuality, filename).Scan(&id); err != nil {
		return 0, fmt.Errorf("create release variant version=%d: %w", releaseVersionID, err)
	}
	return id, nil
}

func createReleaseStream(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	streamTypeID int64,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
) error {
	streamSourceID, err := upsertStreamSource(ctx, tx, mapping.MediaItemID, media.StreamURL)
	if err != nil {
		return err
	}
	if err := upsertNormalizedReleaseStream(ctx, tx, variantID, streamTypeID, streamSourceID, mapping.MediaItemID); err != nil {
		return fmt.Errorf("create release stream variant=%d media=%s: %w", variantID, mapping.MediaItemID, err)
	}
	return nil
}

func upsertStreamSource(ctx context.Context, tx pgx.Tx, mediaItemID string, streamURL *string) (int64, error) {
	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO stream_sources (provider_type, external_id, url)
		VALUES ('jellyfin', $1, $2)
		ON CONFLICT (provider_type, external_id) DO UPDATE
		SET url = COALESCE(EXCLUDED.url, stream_sources.url)
		RETURNING id
	`, mediaItemID, streamURL).Scan(&id); err != nil {
		return 0, fmt.Errorf("upsert stream source media=%s: %w", mediaItemID, err)
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
	selection, err := resolveImportFansubSelection(ctx, tx, mapping, media)
	if err != nil || selection == nil || selection.EffectiveGroup == nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND COALESCE(fansubgroup_id, fansub_group_id) <> $2
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id, fansubgroup_id)
		VALUES ($1, $2, $2)
		ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE
		SET fansubgroup_id = EXCLUDED.fansubgroup_id
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, selection.EffectiveGroup.ID, err)
	}

	animeID, err := lookupAnimeIDByReleaseVersion(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}
	if err := ensureAnimeFansubGroupLinks(ctx, tx, animeID, *selection); err != nil {
		return err
	}
	return nil
}

func resolveImportFansubSelection(
	ctx context.Context,
	tx pgx.Tx,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
) (*resolvedImportFansubSelection, error) {
	if len(mapping.FansubGroups) > 0 {
		return resolveImportFansubSelectionFromInputs(ctx, tx, mapping.FansubGroups)
	}

	if mapping.FansubGroupID != nil && *mapping.FansubGroupID > 0 {
		group := &resolvedImportFansubGroup{ID: *mapping.FansubGroupID}
		return &resolvedImportFansubSelection{
			EffectiveGroup: group,
			MemberGroups:   []resolvedImportFansubGroup{*group},
		}, nil
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

func resolveImportFansubSelectionFromInputs(
	ctx context.Context,
	tx pgx.Tx,
	inputs []models.SelectedFansubGroupInput,
) (*resolvedImportFansubSelection, error) {
	memberGroups := make([]resolvedImportFansubGroup, 0, len(inputs))
	for _, input := range inputs {
		group, err := resolveImportSelectedFansubGroup(ctx, tx, input)
		if err != nil {
			return nil, err
		}
		if group != nil {
			memberGroups = append(memberGroups, *group)
		}
	}
	memberGroups = canonicalizeResolvedImportFansubGroups(memberGroups)
	if len(memberGroups) == 0 {
		return nil, nil
	}
	if len(memberGroups) == 1 {
		return &resolvedImportFansubSelection{
			EffectiveGroup: &memberGroups[0],
			MemberGroups:   memberGroups,
		}, nil
	}

	collaboration, err := upsertImportCollaborationGroup(ctx, tx, memberGroups)
	if err != nil || collaboration == nil {
		return nil, err
	}
	return &resolvedImportFansubSelection{
		EffectiveGroup: collaboration,
		MemberGroups:   memberGroups,
	}, nil
}

func upsertImportCollaborationGroup(
	ctx context.Context,
	tx pgx.Tx,
	memberGroups []resolvedImportFansubGroup,
) (*resolvedImportFansubGroup, error) {
	memberGroups = canonicalizeResolvedImportFansubGroups(memberGroups)
	if len(memberGroups) == 0 {
		return nil, nil
	}
	if len(memberGroups) == 1 {
		group := memberGroups[0]
		return &group, nil
	}

	collaboration, err := upsertImportFansubGroup(ctx, tx, buildImportCollaborationName(memberGroups), nil, models.FansubGroupTypeCollaboration)
	if err != nil || collaboration == nil {
		return collaboration, err
	}
	for _, memberGroup := range memberGroups {
		if _, err := tx.Exec(ctx, `
			INSERT INTO fansub_collaboration_members (collaboration_id, member_group_id)
			VALUES ($1, $2)
			ON CONFLICT (collaboration_id, member_group_id) DO NOTHING
		`, collaboration.ID, memberGroup.ID); err != nil {
			return nil, fmt.Errorf("upsert import collaboration member collaboration=%d member=%d: %w", collaboration.ID, memberGroup.ID, err)
		}
	}
	return collaboration, nil
}

func resolveImportSelectedFansubGroup(
	ctx context.Context,
	tx pgx.Tx,
	input models.SelectedFansubGroupInput,
) (*resolvedImportFansubGroup, error) {
	if input.ID != nil && *input.ID > 0 {
		group, err := lookupImportFansubGroupByID(ctx, tx, *input.ID)
		if err != nil {
			return nil, err
		}
		return group, nil
	}
	return upsertImportFansubGroup(ctx, tx, derefString(input.Name), input.Slug, models.FansubGroupTypeGroup)
}

func upsertImportFansubGroup(
	ctx context.Context,
	tx pgx.Tx,
	name string,
	preferredSlug *string,
	groupType models.FansubGroupType,
) (*resolvedImportFansubGroup, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, nil
	}
	slug := strings.TrimSpace(derefString(preferredSlug))
	if slug == "" {
		slug = slugifyAnimeTitle(name)
	}
	if slug == "" {
		return nil, nil
	}

	group := resolvedImportFansubGroup{}
	if err := tx.QueryRow(ctx, `
		INSERT INTO fansub_groups (slug, name, status, group_type)
		VALUES ($1, $2, 'active', $3)
		ON CONFLICT (slug) DO UPDATE
		SET name = COALESCE(NULLIF(BTRIM(fansub_groups.name), ''), EXCLUDED.name),
		    group_type = CASE
		      WHEN fansub_groups.group_type = 'group' AND EXCLUDED.group_type = 'collaboration' THEN EXCLUDED.group_type
		      ELSE fansub_groups.group_type
		    END,
		    updated_at = NOW()
		RETURNING id, slug, COALESCE(NULLIF(BTRIM(name), ''), $2)
	`, slug, name, groupType).Scan(&group.ID, &group.Slug, &group.Name); err != nil {
		return nil, fmt.Errorf("upsert import fansub group %q: %w", name, err)
	}
	return &group, nil
}

func lookupImportFansubGroupByID(ctx context.Context, tx pgx.Tx, groupID int64) (*resolvedImportFansubGroup, error) {
	group := resolvedImportFansubGroup{}
	if err := tx.QueryRow(ctx, `
		SELECT id, slug, name
		FROM fansub_groups
		WHERE id = $1
	`, groupID).Scan(&group.ID, &group.Slug, &group.Name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("selected fansub group %d not found: %w", groupID, ErrNotFound)
		}
		return nil, fmt.Errorf("lookup selected fansub group %d: %w", groupID, err)
	}
	return &group, nil
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

func ensureAnimeFansubGroupLinks(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	selection resolvedImportFansubSelection,
) error {
	for _, groupID := range buildAnimeFansubLinkGroupIDs(selection) {
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

func canonicalizeResolvedImportFansubGroups(groups []resolvedImportFansubGroup) []resolvedImportFansubGroup {
	unique := make(map[string]resolvedImportFansubGroup, len(groups))
	for _, group := range groups {
		if group.ID <= 0 && strings.TrimSpace(group.Name) == "" && strings.TrimSpace(group.Slug) == "" {
			continue
		}
		unique[normalizedImportFansubIdentity(group)] = group
	}
	items := make([]resolvedImportFansubGroup, 0, len(unique))
	for _, group := range unique {
		items = append(items, group)
	}
	sort.Slice(items, func(i, j int) bool {
		return normalizedImportFansubIdentity(items[i]) < normalizedImportFansubIdentity(items[j])
	})
	return items
}

func normalizedImportFansubIdentity(group resolvedImportFansubGroup) string {
	if slug := strings.TrimSpace(group.Slug); slug != "" {
		return strings.ToLower(slug)
	}
	if name := strings.TrimSpace(group.Name); name != "" {
		return strings.ToLower(name)
	}
	return fmt.Sprintf("id:%d", group.ID)
}

func buildImportCollaborationName(groups []resolvedImportFansubGroup) string {
	canonical := canonicalizeResolvedImportFansubGroups(groups)
	parts := make([]string, 0, len(canonical))
	for _, group := range canonical {
		label := strings.TrimSpace(group.Name)
		if label == "" {
			label = strings.TrimSpace(group.Slug)
		}
		if label == "" {
			label = fmt.Sprintf("Group %d", group.ID)
		}
		parts = append(parts, label)
	}
	return strings.Join(parts, " & ")
}

func buildAnimeFansubLinkGroupIDs(selection resolvedImportFansubSelection) []int64 {
	seen := make(map[int64]struct{}, len(selection.MemberGroups)+1)
	result := make([]int64, 0, len(selection.MemberGroups)+1)
	appendGroupID := func(groupID int64) {
		if groupID <= 0 {
			return
		}
		if _, exists := seen[groupID]; exists {
			return
		}
		seen[groupID] = struct{}{}
		result = append(result, groupID)
	}

	if selection.EffectiveGroup != nil {
		appendGroupID(selection.EffectiveGroup.ID)
	}
	for _, group := range selection.MemberGroups {
		appendGroupID(group.ID)
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
