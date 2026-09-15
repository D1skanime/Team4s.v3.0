package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/models"
)

// GetJellyfinSourceBindings is one batch query, independent of track/source count.
// Item identity remains external_id; the private namespace carries the selection.
func (r *EpisodeImportRepository) GetJellyfinSourceBindings(ctx context.Context, itemIDs []string) (map[string]models.JellyfinSourceSnapshot, error) {
	result := make(map[string]models.JellyfinSourceSnapshot)
	if len(itemIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Query(ctx, `SELECT external_id, metadata->'jellyfin_source'
 FROM stream_sources WHERE provider_type='jellyfin' AND external_id=ANY($1::text[])
 AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source' <> 'null'::jsonb`, itemIDs)
	if err != nil {
		return nil, fmt.Errorf("read jellyfin source bindings: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var itemID string
		var raw []byte
		var snapshot models.JellyfinSourceSnapshot
		if err := rows.Scan(&itemID, &raw); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &snapshot); err != nil {
			return nil, fmt.Errorf("decode jellyfin source binding: %w", ErrConflict)
		}
		if snapshot.Version != 1 || strings.TrimSpace(snapshot.MediaSourceID) == "" {
			return nil, ErrConflict
		}
		result[itemID] = snapshot
	}
	return result, rows.Err()
}

// upsertStreamSourceSnapshot owns provider/item identity and updates only its
// private namespace. A row lock serializes selection validation with persistence.
// The provider caller must validate item/anime ownership and resolve unique paths.
func upsertStreamSourceSnapshot(ctx context.Context, tx pgx.Tx, provider, itemID string, streamURL *string, next *models.JellyfinSourceSnapshot) (int64, error) {
	if next == nil {
		var id int64
		err := tx.QueryRow(ctx, `INSERT INTO stream_sources(provider_type,external_id,url)
   VALUES($1,$2,$3) ON CONFLICT(provider_type,external_id) DO UPDATE
   SET url=COALESCE(EXCLUDED.url,stream_sources.url) RETURNING id`, provider, itemID, streamURL).Scan(&id)
		return id, err
	}
	if provider != "jellyfin" || strings.TrimSpace(itemID) == "" || next.Version != 1 || strings.TrimSpace(next.MediaSourceID) == "" {
		return 0, ErrConflict
	}
	// Do not change URL/metadata until the stored binding has been checked.
	if _, err := tx.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id)
  VALUES($1,$2) ON CONFLICT(provider_type,external_id) DO NOTHING`, provider, itemID); err != nil {
		return 0, err
	}
	var id int64
	var raw []byte
	if err := tx.QueryRow(ctx, `SELECT id,metadata->'jellyfin_source' FROM stream_sources
  WHERE provider_type=$1 AND external_id=$2 FOR UPDATE`, provider, itemID).Scan(&id, &raw); err != nil {
		return 0, err
	}
	var stored *models.JellyfinSourceSnapshot
	if len(raw) > 0 && string(raw) != "null" {
		stored = &models.JellyfinSourceSnapshot{}
		if err := json.Unmarshal(raw, stored); err != nil {
			return 0, ErrConflict
		}
		if stored.Version != 1 || !sameJellyfinSourceBinding(*stored, *next) {
			return 0, ErrConflict
		}
	}
	snapshot := *next
	if !snapshot.StreamsComplete {
		if stored == nil || !stored.StreamsComplete {
			return 0, fmt.Errorf("incomplete jellyfin source: %w", ErrConflict)
		}
		snapshot.AudioTracks = stored.AudioTracks
		snapshot.SubtitleTracks = stored.SubtitleTracks
		snapshot.SelectedAudioIndex = stored.SelectedAudioIndex
		snapshot.StreamsComplete = true
	}
	data, err := json.Marshal(snapshot)
	if err != nil {
		return 0, err
	}
	if _, err = tx.Exec(ctx, `UPDATE stream_sources
  SET url=COALESCE($2,url), metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{jellyfin_source}',$3::jsonb,true)
  WHERE id=$1`, id, streamURL, data); err != nil {
		return 0, err
	}
	return id, nil
}

func sameJellyfinSourceBinding(stored, next models.JellyfinSourceSnapshot) bool {
	if stored.MediaSourceID == next.MediaSourceID {
		return true
	}
	normalize := func(s string) string { return strings.ReplaceAll(strings.TrimSpace(s), "\\", "/") }
	oldPath, newPath := normalize(stored.SourcePath), normalize(next.SourcePath)
	return oldPath != "" && oldPath == newPath
}
