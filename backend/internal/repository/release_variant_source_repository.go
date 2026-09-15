package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/models"
)

// Shared DB-only selection for playback, theme assignment and public technical
// projection. Variant ownership is canonical; stream ordering cannot select a
// different variant. Jellyfin retains precedence among streams of that variant.
const selectedReleaseVariantSourceSQL = `
 SELECT rv.id, rv.duration_seconds, source.provider_type,
        source.external_id, source.url, source.binding,
        NULLIF(TRIM(COALESCE(rv.resolution,rv.video_quality)), ''),
        NULLIF(TRIM(rv.container), ''), NULLIF(TRIM(rv.video_codec), ''),
        NULLIF(TRIM(rv.audio_codec), ''), source.audio_language,
        NULLIF(TRIM(rv.subtitle_type), ''), COALESCE(legacy_subtitles.tracks, '[]'::jsonb)
 FROM release_variants rv
 LEFT JOIN LATERAL (
  SELECT ss.provider_type,
   COALESCE(NULLIF(ss.external_id,''), NULLIF(rs.jellyfin_item_id,'')) AS external_id,
   ss.url, ss.metadata->'jellyfin_source' AS binding, NULLIF(TRIM(al.code), '') AS audio_language
  FROM release_streams rs JOIN stream_sources ss ON ss.id=rs.stream_source_id
  LEFT JOIN languages al ON al.id=rs.audio_language_id
  WHERE rs.variant_id=rv.id
  ORDER BY CASE WHEN ss.provider_type='jellyfin' THEN 0 ELSE 1 END, rs.id
  LIMIT 1
 ) source ON TRUE
 LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'language', NULLIF(TRIM(l.code),''),
    'label', COALESCE(NULLIF(TRIM(l.name),''),NULLIF(TRIM(l.code),''),'Untertitel'),
    'format', NULL, 'forced', FALSE, 'default', FALSE
  ) ORDER BY l.code,rs.id) AS tracks
  FROM release_streams rs LEFT JOIN languages l ON l.id=rs.subtitle_language_id
  WHERE rs.variant_id=rv.id AND rs.subtitle_language_id IS NOT NULL
   AND (source.binding IS NULL OR source.binding='null'::jsonb)
 ) legacy_subtitles ON TRUE
 WHERE rv.release_version_id=$1 AND ($2::bigint=0 OR rv.id=$2)
 ORDER BY rv.id
 LIMIT 1
`

type selectedReleaseVariantSource struct {
	VariantID                                                                  int64
	DurationSeconds                                                            *int32
	Provider, ItemID, URL                                                      *string
	Binding                                                                    *models.JellyfinSourceSnapshot
	Resolution, Container, VideoCodec, AudioCodec, AudioLanguage, SubtitleType *string
	LegacySubtitleTracks                                                       []PublicReleaseSubtitleTrack
}

type releaseSourceQuerier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func selectReleaseVariantSource(ctx context.Context, db releaseSourceQuerier, versionID, variantID int64) (*selectedReleaseVariantSource, error) {
	var selected selectedReleaseVariantSource
	var raw, legacyTracks []byte
	err := db.QueryRow(ctx, selectedReleaseVariantSourceSQL, versionID, variantID).Scan(
		&selected.VariantID, &selected.DurationSeconds, &selected.Provider,
		&selected.ItemID, &selected.URL, &raw,
		&selected.Resolution, &selected.Container, &selected.VideoCodec, &selected.AudioCodec,
		&selected.AudioLanguage, &selected.SubtitleType, &legacyTracks)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select release variant source: %w", err)
	}
	if err = json.Unmarshal(legacyTracks, &selected.LegacySubtitleTracks); err != nil {
		return nil, fmt.Errorf("decode selected release subtitles: %w", err)
	}
	selected.Binding, err = decodeSelectedJellyfinSource(raw)
	if err != nil {
		return nil, err
	}
	return &selected, nil
}

func decodeSelectedJellyfinSource(raw []byte) (*models.JellyfinSourceSnapshot, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var binding models.JellyfinSourceSnapshot
	if err := json.Unmarshal(raw, &binding); err != nil {
		return nil, ErrConflict
	}
	if binding.Version != 1 || strings.TrimSpace(binding.MediaSourceID) == "" {
		return nil, ErrConflict
	}
	return &binding, nil
}
