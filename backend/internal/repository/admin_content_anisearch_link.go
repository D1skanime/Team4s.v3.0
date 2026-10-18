package repository

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// LinkAniSearchSource (quick-261018-l5r Task 1) additively links an anime to an AniSearch source,
// mirroring linkAdditionalJellyfinSource (anime_source_links.go, Phase 165-07) for the symmetric
// AniSearch case: a "Verknüpfen"-Klick in der Anime-Bearbeitung darf NIEMALS eine bestehende
// anime.source (z. B. jellyfin:<id>, der Fall bei Anime 12/13,
// .planning/debug/anisearch-link-missing-on-create.md) force-überschreiben. Schreibt additiv genau
// zwei Dinge: (1) eine anisearch:<id>-Zeile in anime_source_links über die bereits vorhandene,
// konflikt-sichere linkAdditionalJellyfinSource-Hilfsfunktion (deren Name "jellyfin" trägt, deren
// Insert-/Konflikt-Logik aber generisch für jede source-Spalten-Zeile ist -- anime_source_links.go
// bleibt dabei unverändert, wie von der Planung vorgegeben), und (2) -- sofern das Schema die
// Spalte kennt (animeV2SchemaInfo.HasAniSearchID) -- die eigene anime.anisearch_id-Spalte. anime.
// source wird an KEINER Stelle in dieser Funktion geschrieben.
func (r *AdminContentRepository) LinkAniSearchSource(ctx context.Context, animeID int64, aniSearchID string) error {
	trimmed := strings.TrimSpace(aniSearchID)
	if animeID <= 0 || trimmed == "" {
		return fmt.Errorf("link anisearch source: aniSearchID darf nicht leer sein (anime=%d)", animeID)
	}
	sourceTag := "anisearch:" + trimmed

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin link anisearch source tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	// Additiver, konflikt-sicherer Insert in anime_source_links -- wirft repository.ErrConflict,
	// wenn ein ANDERER Anime dieselbe anisearch:<id>-Quelle bereits besitzt (ON CONFLICT(source),
	// Eigentümer-Nachprüfung). Re-Link auf denselben Anime ist idempotent (kein Fehler).
	if err := linkAdditionalJellyfinSource(ctx, tx, animeID, sourceTag); err != nil {
		return err
	}

	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return err
	}
	if schema.HasAniSearchID {
		if schema.AniSearchIDIsNumber {
			numericID, convErr := strconv.ParseInt(trimmed, 10, 64)
			if convErr != nil {
				return fmt.Errorf("anisearch_id %q ist nicht numerisch, anime.anisearch_id erwartet aber eine Zahl: %w", trimmed, convErr)
			}
			if _, execErr := tx.Exec(ctx, `UPDATE anime SET anisearch_id = $1 WHERE id = $2`, numericID, animeID); execErr != nil {
				if isUniqueViolation(execErr) {
					return ErrConflict
				}
				return fmt.Errorf("update anime.anisearch_id (numeric) anime=%d: %w", animeID, execErr)
			}
		} else {
			if _, execErr := tx.Exec(ctx, `UPDATE anime SET anisearch_id = $1 WHERE id = $2`, trimmed, animeID); execErr != nil {
				if isUniqueViolation(execErr) {
					return ErrConflict
				}
				return fmt.Errorf("update anime.anisearch_id (text) anime=%d: %w", animeID, execErr)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit link anisearch source tx: %w", err)
	}
	return nil
}
