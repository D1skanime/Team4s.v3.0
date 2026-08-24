package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"path"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
)

// AdminUserMediaFilter trägt die optionalen, UND-verknüpften Filter für die
// neue gruppierte/paginierte GetUserMedia-Abfrage (Plan 139-04, D11-D19).
// AppUserID ist Pflicht. Alle anderen Felder sind optional; ein nil/Zero-Wert
// bedeutet "kein Filter".
type AdminUserMediaFilter struct {
	AppUserID        int64
	AnimeID          *int64
	FansubGroupID    *int64
	ReleaseVersionID *int64
	MediaType        *string
	From             *time.Time
	To               *time.Time
	Limit            int
	Offset           int
}

// adminUserMediaItemRow ist die interne, NUR für die Go-Nachbearbeitung
// bestimmte Zwischen-Form eines einzelnen Media-Items. FilePath verlässt
// diese Datei NIEMALS als Response-Feld (D18) — buildAdminMediaPublicURL()
// verbraucht ihn ausschließlich zur Ableitung von PublicURL, und
// deriveOriginalFilename() zur Ableitung des reinen Dateinamens (nie des
// vollständigen Pfads).
type adminUserMediaItemRow struct {
	MediaAssetID  int64  `json:"media_asset_id"`
	MediaType     string `json:"media_type"`
	FilePath      string `json:"file_path"`
	FileSizeBytes int64  `json:"file_size_bytes"`
	UploadedAt    string `json:"uploaded_at"`
}

// listUserMediaGrouped implementiert D11-D19: serverseitige Gruppierung nach
// (anime_id, fansub_group_id, release_version_id) — niemals eine flache
// Pro-Media-Zeilen-Liste —, Paginierung auf Release-/Episoden-Block-Ebene
// (D12), COUNT(*) OVER() auf den GRUPPIERTEN Blöcken (D13), serverseitige
// Filter VOR der Gruppierung (D14) und echte PublicURL/FileSizeBytes-
// Ableitung (D17) statt der alten hartcodierten ''/0-Platzhalter. Alles in
// EINEM Round-Trip (plus der separaten, datenvolumen-unabhängigen
// FilterOptions-Abfrage weiter unten — QUAL-06 erlaubt das explizit für
// O(1)-Lookups).
func (r *AdminUsersRepository) listUserMediaGrouped(
	ctx context.Context,
	filter AdminUserMediaFilter,
) (*models.AdminUserMediaPage, error) {
	limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)

	rows, err := r.db.Query(ctx, adminUserMediaGroupedQuery,
		filter.AppUserID,
		filter.AnimeID,
		filter.FansubGroupID,
		filter.ReleaseVersionID,
		filter.MediaType,
		filter.From,
		filter.To,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list user media grouped: %w", err)
	}
	defer rows.Close()

	result := &models.AdminUserMediaPage{
		Data: []models.AdminMediaReleaseBlock{},
		Meta: models.AdminListMeta{Limit: limit, Offset: offset},
	}
	var total int
	for rows.Next() {
		var block models.AdminMediaReleaseBlock
		var episodeNumber *string
		var itemsJSON []byte
		if err := rows.Scan(
			&block.AnimeID,
			&block.AnimeTitle,
			&block.FansubGroupID,
			&block.FansubGroupName,
			&block.ReleaseVersionID,
			&block.ReleaseVersionLabel,
			&episodeNumber,
			&itemsJSON,
			&total,
		); err != nil {
			return nil, fmt.Errorf("list user media grouped: scan: %w", err)
		}
		block.EpisodeNumber = episodeNumber

		var rawItems []adminUserMediaItemRow
		if len(itemsJSON) > 0 {
			if err := json.Unmarshal(itemsJSON, &rawItems); err != nil {
				return nil, fmt.Errorf("list user media grouped: decode items: %w", err)
			}
		}
		items := make([]models.AdminMediaItem, 0, len(rawItems))
		for _, raw := range rawItems {
			items = append(items, models.AdminMediaItem{
				MediaAssetID:     raw.MediaAssetID,
				MediaType:        raw.MediaType,
				OriginalFilename: deriveOriginalFilename(raw.FilePath),
				PublicURL:        r.buildAdminMediaPublicURL(raw.FilePath),
				FileSizeBytes:    raw.FileSizeBytes,
				UploadedAt:       raw.UploadedAt,
			})
		}
		block.Items = items
		result.Data = append(result.Data, block)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list user media grouped: iterate: %w", err)
	}
	result.Meta.Total = total

	filterOptions, err := r.loadUserMediaFilterOptions(ctx, filter.AppUserID)
	if err != nil {
		return nil, fmt.Errorf("list user media grouped: filter options: %w", err)
	}
	result.FilterOptions = *filterOptions

	return result, nil
}

// buildAdminMediaPublicURL portiert AdminContentHandler.buildRVMPublicURL's
// exakte String-Manipulations-Konvention (admin_content_release_version_media.go:
// 535-541) in dieses Repository, das mediaStorageDir NICHT über den Handler,
// sondern denselben cfg.MediaStorageDir-Konstruktorwert erhält, den main.go
// bereits an NewFansubRepository/NewMediaRepository reicht (D17).
func (r *AdminUsersRepository) buildAdminMediaPublicURL(storagePath string) string {
	if storagePath == "" {
		return ""
	}
	rel := strings.TrimPrefix(storagePath, r.mediaStorageDir)
	rel = strings.TrimPrefix(rel, "/")
	rel = strings.ReplaceAll(rel, "\\", "/")
	return "/media/" + rel
}

// deriveOriginalFilename gibt NUR den Dateinamen zurück, niemals den
// physischen Pfad (D18) — anders als die alte Query, die versehentlich den
// vollständigen Storage-Pfad in dieses Feld schrieb.
func deriveOriginalFilename(storagePath string) string {
	if storagePath == "" {
		return ""
	}
	return path.Base(strings.ReplaceAll(storagePath, "\\", "/"))
}

// loadUserMediaFilterOptions lädt die verfügbaren Anime-/Gruppen-/Release-
// bzw.-Episoden-/Medientyp-Filter, beschränkt auf die Medien-Historie DIESES
// Users (niemals den gesamten Katalog) — unabhängig von den aktuell
// gewählten Filtern, damit ein Admin zwischen Filtern wechseln kann. O(1)
// bezüglich der Datenmenge (ein zusätzlicher Round-Trip, keine Pro-Zeile-
// Abfrage, QUAL-06-konform).
func (r *AdminUsersRepository) loadUserMediaFilterOptions(
	ctx context.Context,
	appUserID int64,
) (*models.AdminMediaFilterOptions, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			a.id, a.title,
			COALESCE(rvm.fansub_group_id, (
				SELECT MIN(rvg.fansub_group_id) FROM release_version_groups rvg
				WHERE rvg.release_version_id = rv.id
			)) AS fansub_group_id,
			fg.name,
			rvm.release_version_id,
			COALESCE(ep.episode_number, '') || CASE WHEN rv.version IS NOT NULL AND rv.version <> '' THEN ' - ' || rv.version ELSE '' END,
			COALESCE(mt.name, ma.mime_type, 'media')
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		LEFT JOIN media_types mt ON mt.id = ma.media_type_id
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime a ON a.id = ep.anime_id
		LEFT JOIN fansub_groups fg ON fg.id = COALESCE(rvm.fansub_group_id, (
			SELECT MIN(rvg2.fansub_group_id) FROM release_version_groups rvg2
			WHERE rvg2.release_version_id = rv.id
		))
		WHERE rvm.uploaded_by_user_id = $1
		  AND rvm.deleted_at IS NULL
		ORDER BY a.title, fg.name, rvm.release_version_id
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("load media filter options: %w", err)
	}
	defer rows.Close()

	animeSeen := map[int64]bool{}
	groupSeen := map[int64]bool{}
	releaseSeen := map[int64]bool{}
	mediaTypeSeen := map[string]bool{}
	options := &models.AdminMediaFilterOptions{
		Animes:             []models.AdminFilterOption{},
		Groups:             []models.AdminFilterOption{},
		ReleasesOrEpisodes: []models.AdminFilterOption{},
		MediaTypes:         []string{},
	}
	for rows.Next() {
		var animeID int64
		var animeTitle string
		var groupID *int64
		var groupName *string
		var releaseVersionID int64
		var releaseLabel string
		var mediaType string
		if err := rows.Scan(&animeID, &animeTitle, &groupID, &groupName, &releaseVersionID, &releaseLabel, &mediaType); err != nil {
			return nil, fmt.Errorf("load media filter options: scan: %w", err)
		}
		if !animeSeen[animeID] {
			animeSeen[animeID] = true
			options.Animes = append(options.Animes, models.AdminFilterOption{ID: animeID, Name: animeTitle})
		}
		if groupID != nil && !groupSeen[*groupID] {
			groupSeen[*groupID] = true
			name := ""
			if groupName != nil {
				name = *groupName
			}
			options.Groups = append(options.Groups, models.AdminFilterOption{ID: *groupID, Name: name})
		}
		if !releaseSeen[releaseVersionID] {
			releaseSeen[releaseVersionID] = true
			options.ReleasesOrEpisodes = append(options.ReleasesOrEpisodes, models.AdminFilterOption{ID: releaseVersionID, Name: releaseLabel})
		}
		if !mediaTypeSeen[mediaType] {
			mediaTypeSeen[mediaType] = true
			options.MediaTypes = append(options.MediaTypes, mediaType)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load media filter options: iterate: %w", err)
	}
	return options, nil
}

// adminUserMediaGroupedQuery ist die Kernabfrage für D11-D19.
//
// Aufbau:
//  1. base: gefilterte, pro release_version_media-Zeile aufgelöste Zeile
//     inkl. echter media_files-Größe (D17) und der aufgelösten
//     Fansubgruppe für die Gruppierung (rvm.fansub_group_id, wenn gesetzt,
//     sonst deterministisch die kleinste release_version_groups-Gruppe für
//     diese Release-Version — niemals ein zweiter unbegrenzter Fan-out).
//     Server-seitige WHERE-Klauseln (nur $N-Platzhalter, nie String-
//     Konkatenation, T-139-07) für anime_id, fansub_group_id,
//     release_version_id, media_type, from/to (gegen
//     release_version_media.created_at).
//  2. release_blocks: GROUP BY (anime_id, fansub_group_id,
//     release_version_id) — ein Eintrag pro Release-/Episoden-Block (D11),
//     Items als json_agg in EINEM Round-Trip (keine Pro-Block-Abfrage).
//  3. filtered_blocks/paged: COUNT(*) OVER() auf den GRUPPIERTEN Blöcken
//     (D13), Paginierung auf Block-Ebene (D12) — nie auf Rohzeilen.
const adminUserMediaGroupedQuery = `
WITH base AS (
    SELECT
        rvm.media_asset_id,
        rvm.created_at,
        COALESCE(mt.name, ma.mime_type, 'media') AS media_type,
        ma.file_path,
        COALESCE(mf.size, 0) AS file_size_bytes,
        a.id AS anime_id,
        a.title AS anime_title,
        COALESCE(rvm.fansub_group_id, (
            SELECT MIN(rvg.fansub_group_id) FROM release_version_groups rvg
            WHERE rvg.release_version_id = rv.id
        )) AS fansub_group_id,
        rvm.release_version_id,
        rv.version AS release_version_label,
        ep.episode_number
    FROM release_version_media rvm
    JOIN media_assets ma ON ma.id = rvm.media_asset_id
    LEFT JOIN media_types mt ON mt.id = ma.media_type_id
    LEFT JOIN media_files mf ON mf.media_id = ma.id AND (mf.variant = 'original' OR mf.variant IS NULL)
    JOIN release_versions rv ON rv.id = rvm.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    JOIN anime a ON a.id = ep.anime_id
    WHERE rvm.uploaded_by_user_id = $1
      AND rvm.deleted_at IS NULL
      AND ($2::bigint IS NULL OR a.id = $2)
      AND ($3::bigint IS NULL OR COALESCE(rvm.fansub_group_id, (
              SELECT MIN(rvg2.fansub_group_id) FROM release_version_groups rvg2
              WHERE rvg2.release_version_id = rv.id
          )) = $3)
      AND ($4::bigint IS NULL OR rvm.release_version_id = $4)
      AND ($5::text IS NULL OR COALESCE(mt.name, ma.mime_type, 'media') = $5)
      AND ($6::timestamptz IS NULL OR rvm.created_at >= $6)
      AND ($7::timestamptz IS NULL OR rvm.created_at <= $7)
),
release_blocks AS (
    SELECT
        anime_id,
        MIN(anime_title) AS anime_title,
        fansub_group_id,
        release_version_id,
        MIN(release_version_label) AS release_version_label,
        MIN(episode_number) AS episode_number,
        jsonb_agg(
            jsonb_build_object(
                'media_asset_id', media_asset_id,
                'media_type', media_type,
                'file_path', file_path,
                'file_size_bytes', file_size_bytes,
                'uploaded_at', created_at::text
            ) ORDER BY created_at DESC
        ) AS items_json
    FROM base
    WHERE fansub_group_id IS NOT NULL
    GROUP BY anime_id, fansub_group_id, release_version_id
),
filtered_blocks AS (
    SELECT rb.*, fg.name AS fansub_group_name
    FROM release_blocks rb
    JOIN fansub_groups fg ON fg.id = rb.fansub_group_id
),
paged AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered_blocks
    ORDER BY anime_title, fansub_group_name, release_version_id DESC
    LIMIT $8 OFFSET $9
)
SELECT
    anime_id, anime_title, fansub_group_id, fansub_group_name,
    release_version_id, release_version_label, episode_number,
    items_json, total_count
FROM paged
`
