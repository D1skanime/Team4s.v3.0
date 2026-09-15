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
        source.external_id, source.url, source.binding
 FROM release_variants rv
 LEFT JOIN LATERAL (
  SELECT ss.provider_type,
   COALESCE(NULLIF(ss.external_id,''), NULLIF(rs.jellyfin_item_id,'')) AS external_id,
   ss.url, ss.metadata->'jellyfin_source' AS binding
  FROM release_streams rs JOIN stream_sources ss ON ss.id=rs.stream_source_id
  WHERE rs.variant_id=rv.id
  ORDER BY CASE WHEN ss.provider_type='jellyfin' THEN 0 ELSE 1 END, rs.id
  LIMIT 1
 ) source ON TRUE
 WHERE rv.release_version_id=$1 AND ($2::bigint=0 OR rv.id=$2)
 ORDER BY rv.id
 LIMIT 1
`

type selectedReleaseVariantSource struct {
	VariantID             int64
	DurationSeconds       *int32
	Provider, ItemID, URL *string
	Binding               *models.JellyfinSourceSnapshot
}

type releaseSourceQuerier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func selectReleaseVariantSource(ctx context.Context, db releaseSourceQuerier, versionID, variantID int64) (*selectedReleaseVariantSource, error) {
	var selected selectedReleaseVariantSource
	var raw []byte
	err := db.QueryRow(ctx, selectedReleaseVariantSourceSQL, versionID, variantID).Scan(
		&selected.VariantID, &selected.DurationSeconds, &selected.Provider,
		&selected.ItemID, &selected.URL, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select release variant source: %w", err)
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
