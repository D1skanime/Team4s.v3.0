package repository

// Sub-Reads fuer ReleaseDetailPublicRepository.GetPublicReleaseDetail (AO4-02),
// ausgelagert aus release_detail_public_repository.go wegen des 450-Zeilen-Limits.
//
// Sichtbarkeits-Gates:
//   - Bilder (release_version_media): v.name='public', rs.code='approved', ma.status='ready'
//     — identisch zu group_release_media_repository.go.
//   - Texte (release_version_notes): visibility='public', status='published', deleted_at IS NULL
//     — Literale aus Migration 0064 (chk_release_version_notes_visibility/_status).
//   - Beteiligte: gemeinsamer Effective-Contributor-Resolver in
//     public_effective_contributors.go (gruppenlokaler Override, sonst Anime-Default)
//     mit is_public_on_anime_page=true und visibility_id -> 'public'.

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func isPublicReleaseImageCategory(category string) bool {
	switch category {
	case "screenshot", "typesetting_karaoke", "fun_outtake", "other":
		return true
	default:
		return false
	}
}

type publicReleaseTechnical struct {
	DurationSeconds                                              *int32
	Resolution, Container, VideoCodec, AudioCodec, AudioLanguage *string
	SubtitleType                                                 *string
}

func (r *ReleaseDetailPublicRepository) loadReleaseGroups(ctx context.Context, releaseVersionID int64) ([]PublicReleaseGroup, error) {
	rows, err := r.db.Query(ctx, `SELECT fg.id, fg.slug, fg.name, NULLIF(TRIM(COALESCE(logo.file_path, fg.logo_url)), '') FROM release_version_groups rvg JOIN fansub_groups fg ON fg.id=rvg.fansub_group_id LEFT JOIN media_assets logo ON logo.id=fg.logo_id WHERE rvg.release_version_id=$1 ORDER BY fg.name, fg.id`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load groups: %w", err)
	}
	defer rows.Close()
	items := make([]PublicReleaseGroup, 0)
	for rows.Next() {
		var item PublicReleaseGroup
		if err := rows.Scan(&item.ID, &item.Slug, &item.Name, &item.LogoURL); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ReleaseDetailPublicRepository) loadReleaseTechnical(ctx context.Context, releaseVersionID int64) (publicReleaseTechnical, []PublicReleaseSubtitleTrack, error) {
	var out publicReleaseTechnical
	err := r.db.QueryRow(ctx, `SELECT rv.duration_seconds, NULLIF(TRIM(COALESCE(rv.resolution, rv.video_quality)),''), NULLIF(TRIM(rv.container),''), NULLIF(TRIM(rv.video_codec),''), NULLIF(TRIM(rv.audio_codec),''), NULLIF(TRIM(al.code),''), NULLIF(TRIM(rv.subtitle_type),'') FROM release_variants rv LEFT JOIN release_streams ars ON ars.variant_id=rv.id AND ars.audio_language_id IS NOT NULL LEFT JOIN languages al ON al.id=ars.audio_language_id WHERE rv.release_version_id=$1 ORDER BY rv.id LIMIT 1`, releaseVersionID).Scan(&out.DurationSeconds, &out.Resolution, &out.Container, &out.VideoCodec, &out.AudioCodec, &out.AudioLanguage, &out.SubtitleType)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return out, nil, fmt.Errorf("release detail: load technical data: %w", err)
	}
	rows, err := r.db.Query(ctx, `SELECT NULLIF(TRIM(l.code),''), COALESCE(NULLIF(TRIM(l.name),''), NULLIF(TRIM(l.code),''), 'Untertitel'), NULLIF(TRIM(rv.subtitle_type),'') FROM release_variants rv JOIN release_streams rs ON rs.variant_id=rv.id AND rs.subtitle_language_id IS NOT NULL LEFT JOIN languages l ON l.id=rs.subtitle_language_id WHERE rv.release_version_id=$1 ORDER BY l.code, rs.id`, releaseVersionID)
	if err != nil {
		return out, nil, fmt.Errorf("release detail: load subtitle tracks: %w", err)
	}
	defer rows.Close()
	tracks := make([]PublicReleaseSubtitleTrack, 0)
	for rows.Next() {
		var t PublicReleaseSubtitleTrack
		if err := rows.Scan(&t.Language, &t.Label, &t.Format); err != nil {
			return out, nil, err
		}
		tracks = append(tracks, t)
	}
	return out, tracks, rows.Err()
}

func (r *ReleaseDetailPublicRepository) countImagesByCategory(ctx context.Context, releaseVersionID int64) (PublicReleaseImageCategoryTotals, error) {
	var out PublicReleaseImageCategoryTotals
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FILTER(WHERE rvm.category='screenshot'), COUNT(*) FILTER(WHERE rvm.category='typesetting_karaoke'), COUNT(*) FILTER(WHERE rvm.category='fun_outtake'), COUNT(*) FILTER(WHERE rvm.category='other') FROM release_version_media rvm JOIN media_assets ma ON ma.id=rvm.media_asset_id JOIN visibilities v ON v.id=ma.visibility_id JOIN review_statuses rs ON rs.id=ma.review_status_id WHERE rvm.release_version_id=$1 AND rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'`, releaseVersionID).Scan(&out.Screenshot, &out.TypesettingKaraoke, &out.FunOuttake, &out.Other)
	return out, err
}

// loadReleaseSegments liefert die oeffentlich sichtbaren Kara-Segmente einer
// Release-Version, ueber theme_segment_assignments statt (wie zuvor) direkt ueber
// theme_segment_playback_sources — ein geteiltes Kara kann seit Plan 117-01 mehrere
// Zuweisungen (eine je Release-Version) haben, die konkrete Playback-Quelle bleibt
// ueber den zusaetzlichen LEFT JOIN auf theme_segment_playback_sources fuer das
// Readiness-Feld erreichbar. Nach dem Laden unterdrueckt loadReleaseSegments
// (D-02/UI-SPEC Surface 3) jedes Segment, dessen theme_segment_id bereits auf der
// Vorfolge (loadAdjacentReleases) zugewiesen war — ein reiner Zeit-Offset (D-01)
// ohne echten Segment-Wechsel erzeugt so keinen erneuten Timeline-Eintrag. Fehlt die
// Vorfolge (Anime-Anfang, Luecke in der Episodennummerierung), gilt die aktuelle
// Folge automatisch als Span-Start, es wird nicht gefiltert.
func (r *ReleaseDetailPublicRepository) loadReleaseSegments(ctx context.Context, animeID, groupID, releaseVersionID int64, version, episodeNumber string, contributors []PublicReleaseContributor) ([]PublicReleaseSegment, error) {
	rows, err := r.db.Query(ctx, `SELECT ts.id, COALESCE(NULLIF(TRIM(t.title),''),tt.name), tt.name, EXTRACT(EPOCH FROM ts.start_time)::int, EXTRACT(EPOCH FROM ts.end_time)::int, CASE WHEN ts.start_time IS NOT NULL AND ts.end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (ts.end_time-ts.start_time))::int END, CASE WHEN cache.status='ready' THEN 'ready' ELSE 'unavailable' END FROM theme_segment_assignments tsa JOIN theme_segments ts ON ts.id=tsa.theme_segment_id JOIN themes t ON t.id=ts.theme_id JOIN theme_types tt ON tt.id=t.theme_type_id LEFT JOIN theme_segment_playback_sources src ON src.theme_segment_id=ts.id AND src.release_version_id=tsa.release_version_id LEFT JOIN LATERAL (SELECT status FROM theme_segment_render_cache WHERE theme_segment_id=ts.id ORDER BY id DESC LIMIT 1) cache ON TRUE WHERE tsa.release_version_id=$1 ORDER BY ts.start_time NULLS LAST,ts.id`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load segments: %w", err)
	}
	defer rows.Close()
	items := make([]PublicReleaseSegment, 0)
	karaParticipants := make([]PublicReleaseContributor, 0)
	for _, c := range contributors {
		label := strings.ToLower(c.RoleLabel)
		if strings.Contains(label, "kara") || strings.Contains(label, "typeset") {
			karaParticipants = append(karaParticipants, c)
		}
	}
	for rows.Next() {
		var item PublicReleaseSegment
		if err := rows.Scan(&item.ThemeSegmentID, &item.Name, &item.Type, &item.StartSeconds, &item.EndSeconds, &item.DurationSeconds, &item.Readiness); err != nil {
			return nil, err
		}
		item.Participants = karaParticipants
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	items, err = r.suppressSegmentsAlreadyVisibleOnPreviousEpisode(ctx, items, animeID, groupID, releaseVersionID, version)
	if err != nil {
		return nil, err
	}

	if err := r.applyAppliesThroughEpisode(ctx, items, episodeNumber); err != nil {
		return nil, err
	}

	return items, nil
}

// suppressSegmentsAlreadyVisibleOnPreviousEpisode entfernt jedes Segment aus items,
// dessen theme_segment_id bereits der direkten Vorfolge (loadAdjacentReleases)
// zugewiesen war (D-02). Ist prev == nil (keine Vorfolge oder Luecke), wird nicht
// gefiltert — die aktuelle Folge gilt automatisch als Span-Start.
func (r *ReleaseDetailPublicRepository) suppressSegmentsAlreadyVisibleOnPreviousEpisode(ctx context.Context, items []PublicReleaseSegment, animeID, groupID, releaseVersionID int64, version string) ([]PublicReleaseSegment, error) {
	if len(items) == 0 {
		return items, nil
	}
	prev, _, err := r.loadAdjacentReleases(ctx, animeID, groupID, releaseVersionID, version)
	if err != nil {
		return nil, err
	}
	if prev == nil {
		return items, nil
	}

	rows, err := r.db.Query(ctx, `SELECT theme_segment_id FROM theme_segment_assignments WHERE release_version_id=$1`, prev.ReleaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load previous episode segment assignments: %w", err)
	}
	defer rows.Close()
	assignedOnPrevious := make(map[int64]bool)
	for rows.Next() {
		var themeSegmentID int64
		if err := rows.Scan(&themeSegmentID); err != nil {
			return nil, err
		}
		assignedOnPrevious[themeSegmentID] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(assignedOnPrevious) == 0 {
		return items, nil
	}

	filtered := make([]PublicReleaseSegment, 0, len(items))
	for _, item := range items {
		if assignedOnPrevious[item.ThemeSegmentID] {
			continue
		}
		filtered = append(filtered, item)
	}
	return filtered, nil
}

// applyAppliesThroughEpisode befuellt AppliesThroughEpisode fuer jedes verbliebene
// (also sichtbare, nicht unterdrueckte) Segment mit der hoechsten Episodennummer
// aller seiner Zuweisungen (theme_segment_assignments) -- gleiches Join-Muster wie
// hydrateSegmentAssignmentMetadataList (theme_segment_playback_resolution.go,
// release_versions -> fansub_releases -> episodes) -- sofern es mehr als eine
// Zuweisung hat und diese hoechste Episodennummer von der aktuellen Folge abweicht
// (UI-SPEC Surface 3, „Gilt auch fuer Folge {von}-{bis}"-Badge). Reines
// Anzeige-Feld, aendert die Entdopplungslogik selbst nicht.
func (r *ReleaseDetailPublicRepository) applyAppliesThroughEpisode(ctx context.Context, items []PublicReleaseSegment, episodeNumber string) error {
	if len(items) == 0 {
		return nil
	}
	segmentIDs := make([]int64, len(items))
	for i, item := range items {
		segmentIDs[i] = item.ThemeSegmentID
	}

	rows, err := r.db.Query(ctx, `
		SELECT tsa.theme_segment_id, COUNT(*), (ARRAY_AGG(e.episode_number ORDER BY COALESCE(e.sort_index, e.id) DESC))[1]
		FROM theme_segment_assignments tsa
		JOIN release_versions rv ON rv.id = tsa.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		WHERE tsa.theme_segment_id = ANY($1)
		GROUP BY tsa.theme_segment_id
	`, segmentIDs)
	if err != nil {
		return fmt.Errorf("release detail: load segment assignment span: %w", err)
	}
	defer rows.Close()

	type span struct {
		count            int
		maxEpisodeNumber string
	}
	spanBySegmentID := make(map[int64]span)
	for rows.Next() {
		var themeSegmentID int64
		var s span
		if err := rows.Scan(&themeSegmentID, &s.count, &s.maxEpisodeNumber); err != nil {
			return err
		}
		spanBySegmentID[themeSegmentID] = s
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for i := range items {
		s, ok := spanBySegmentID[items[i].ThemeSegmentID]
		if !ok || s.count <= 1 || s.maxEpisodeNumber == episodeNumber {
			continue
		}
		maxEpisodeNumber := s.maxEpisodeNumber
		items[i].AppliesThroughEpisode = &maxEpisodeNumber
	}
	return nil
}

func (r *ReleaseDetailPublicRepository) loadAdjacentReleases(ctx context.Context, animeID, groupID, releaseVersionID int64, version string) (*PublicReleaseNavigationTarget, *PublicReleaseNavigationTarget, error) {
	load := func(direction string) (*PublicReleaseNavigationTarget, error) {
		op := "<"
		order := "DESC"
		if direction == "next" {
			op = ">"
			order = "ASC"
		}
		q := fmt.Sprintf(`WITH current AS (SELECT e.sort_index,e.number_decimal,e.id FROM release_versions rv JOIN fansub_releases fr ON fr.id=rv.release_id JOIN episodes e ON e.id=fr.episode_id WHERE rv.id=$1), adjacent AS (SELECT e.id FROM episodes e,current c WHERE e.anime_id=$2 AND (COALESCE(e.sort_index,e.id),e.id) %s (COALESCE(c.sort_index,c.id),c.id) ORDER BY COALESCE(e.sort_index,e.id) %s,e.id %s LIMIT 1) SELECT rv.id,e.episode_number,NULLIF(TRIM(e.title),''),rv.version,$3 FROM adjacent a JOIN episodes e ON e.id=a.id JOIN fansub_releases fr ON fr.episode_id=e.id JOIN release_versions rv ON rv.release_id=fr.id JOIN release_version_groups rvg ON rvg.release_version_id=rv.id AND rvg.fansub_group_id=$3 ORDER BY CASE WHEN rv.version=$4 THEN 0 ELSE 1 END,rv.id DESC LIMIT 1`, op, order, order)
		var t PublicReleaseNavigationTarget
		err := r.db.QueryRow(ctx, q, releaseVersionID, animeID, groupID, version).Scan(&t.ReleaseVersionID, &t.EpisodeNumber, &t.EpisodeTitle, &t.Version, &t.GroupID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, nil
			}
			return nil, err
		}
		return &t, nil
	}
	prev, err := load("previous")
	if err != nil {
		return nil, nil, err
	}
	next, err := load("next")
	return prev, next, err
}

// uploaderAuthorNameJoin loest den Anzeigenamen des Hochladers eines
// release_version_media-Bildes auf (AO4-18 Autor-Chip). Prioritaet identisch zu
// den uebrigen Public-Reads dieser Datei (Mitglieds-Anzeigename > App-User-Anzeigename
// > legacy Username). Liefert NULL (kein Join-Treffer), wenn uploaded_by_user_id NULL
// ist oder kein Anzeigename ermittelbar ist. Nutzt eine LATERAL-Subquery statt
// direkter JOINs, damit ein Bild pro Ausgabezeile bestehen bleibt (kein Zeilen-
// Fan-out ueber mehrere member_claims-Zeilen desselben app_user_id).
const uploaderAuthorNameJoin = `
	LEFT JOIN LATERAL (
		SELECT COALESCE(
			NULLIF(TRIM(mem.display_name), ''),
			NULLIF(TRIM(mem.nickname), ''),
			NULLIF(TRIM(au.display_name), ''),
			NULLIF(TRIM(au.preferred_username), ''),
			NULLIF(TRIM(u.username), '')
		) AS name
		FROM users u
		LEFT JOIN app_users au ON au.legacy_user_id = u.id
		LEFT JOIN member_claims mc ON mc.app_user_id = au.id AND mc.claim_status = 'verified'
		LEFT JOIN members mem ON mem.id = mc.member_id
		WHERE u.id = rvm.uploaded_by_user_id
		ORDER BY mc.id DESC
		LIMIT 1
	) uploader_author ON TRUE
`

// loadContributors liefert Name+Rolle der oeffentlich sichtbaren Beteiligten einer
// Release-Version, sortiert nach Name. Mehrere Rollen eines Mitglieds werden zu
// einem kommagetrennten role_label zusammengefasst.
func (r *ReleaseDetailPublicRepository) loadContributors(ctx context.Context, releaseVersionID int64) ([]PublicReleaseContributor, error) {
	contributorsByRelease, err := loadPublicEffectiveContributors(ctx, r.db, []int64{releaseVersionID})
	if err != nil {
		return nil, fmt.Errorf("release detail: load contributors for version %d: %w", releaseVersionID, err)
	}
	items := contributorsByRelease[releaseVersionID]
	if items == nil {
		items = make([]PublicReleaseContributor, 0)
	}
	return items, nil
}

// loadImages liefert oeffentlich sichtbare release_version_media, inkl. category,
// sortiert nach sort_order ASC, id ASC.
func (r *ReleaseDetailPublicRepository) loadImages(ctx context.Context, releaseVersionID int64) ([]PublicReleaseImage, error) {
	rows, err := r.db.Query(ctx, r.imagesQuery(), releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load images for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseImage, 0)
	for rows.Next() {
		var (
			item          PublicReleaseImage
			thumbnailPath *string
			originalPath  *string
		)
		if err := rows.Scan(&item.ID, &item.FansubGroupID, &item.Category, &item.Caption, &thumbnailPath, &originalPath, &item.AuthorName, &item.IsPreviewCandidate); err != nil {
			return nil, fmt.Errorf("release detail: scan image row: %w", err)
		}
		if thumbnailPath != nil {
			item.ThumbnailURL = publicMediaURLForPath(*thumbnailPath, r.mediaStorageDir)
		}
		if originalPath != nil {
			item.OriginalURL = publicMediaURLForPath(*originalPath, r.mediaStorageDir)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate image rows: %w", err)
	}
	return items, nil
}

// countImages zaehlt die oeffentlich sichtbaren Bilder unabhaengig von einer
// eventuell spaeter eingefuehrten Pagination (AO4-03).
func (r *ReleaseDetailPublicRepository) countImages(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE rvm.release_version_id = $1
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
	`, releaseVersionID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("release detail: count images for version %d: %w", releaseVersionID, err)
	}
	return count, nil
}

// imagesQuery ist die gemeinsame Query fuer loadImages; identisches Sichtbarkeits-Gate
// wie group_release_media_repository.go (v.name='public', rs.code='approved', ma.status='ready').
func (r *ReleaseDetailPublicRepository) imagesQuery() string {
	return fmt.Sprintf(`
		SELECT
			rvm.id,
			rvm.fansub_group_id,
			rvm.category,
			rvm.caption,
			COALESCE(mf_thumb.path, '') AS thumbnail_path,
			COALESCE(mf_orig.path, ma.file_path, '') AS original_path,
			uploader_author.name AS author_name
			,rvm.is_preview_candidate
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		%s
		WHERE rvm.release_version_id = $1
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		ORDER BY rvm.sort_order ASC, rvm.id ASC
	`, uploaderAuthorNameJoin)
}

// loadNotes liefert oeffentlich sichtbare release_version_notes (visibility='public',
// status='published'), sortiert nach sort_order/created_at.
func (r *ReleaseDetailPublicRepository) loadNotes(ctx context.Context, releaseVersionID int64) ([]PublicReleaseNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvn.id,
			rvn.fansub_group_id,
			rvn.member_id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
			NULLIF(TRIM(member_avatar.file_path), '') AS member_avatar_url,
			COALESCE(rd.label_de, '') AS role_label,
			COALESCE(rd.code, '') AS role_code,
			COALESCE(rd.color_key, '') AS role_color_key,
			COALESCE(NULLIF(TRIM(rvn.title), ''), '') AS title,
			rvn.body_html,
			rvn.created_at
		FROM release_version_notes rvn
		JOIN members m ON m.id = rvn.member_id
		LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
		LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
		LEFT JOIN role_definitions rd ON rd.code = cr.name
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
		ORDER BY rvn.sort_order ASC, rvn.created_at ASC, rvn.id ASC
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("release detail: load notes for version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	items := make([]PublicReleaseNote, 0)
	for rows.Next() {
		var item PublicReleaseNote
		if err := rows.Scan(&item.ID, &item.FansubGroupID, &item.MemberID, &item.MemberName, &item.MemberAvatarURL, &item.RoleLabel, &item.RoleCode, &item.RoleColorKey, &item.Title, &item.BodyHTML, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("release detail: scan note row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("release detail: iterate note rows: %w", err)
	}
	return items, nil
}

// countNotes zaehlt die oeffentlich sichtbaren Texte unabhaengig von einer
// eventuell spaeter eingefuehrten Pagination (AO4-03).
func (r *ReleaseDetailPublicRepository) countNotes(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_notes rvn
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
	`, releaseVersionID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("release detail: count notes for version %d: %w", releaseVersionID, err)
	}
	return count, nil
}
