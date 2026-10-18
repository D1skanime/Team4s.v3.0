package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// GetAnimeAniSearchTakeoverSnapshot (quick-261018-l5r Task 2) lädt die aktuellen Werte der 8
// Übernahme-Felder eines BESTEHENDEN Anime -- außerhalb jeder Transaktion, VOR dem additiven
// AniSearch-Link-Schreibvorgang, damit der Handler die Fill/Replace/Keep-Entscheidung treffen
// kann, bevor LinkAniSearchSource seine eigene Transaktion öffnet. Reuses GetAnimeSyncSource
// (TitleDE/TitleEN/Year/MaxEpisodes/Description) und loadNormalizedAnimeMetadata
// (autoritative TitleDE/TitleEN/Genres/Tags aus den Junction-Tabellen, falls vorhanden) statt
// beide Lesewege neu zu implementieren.
func (r *AdminContentRepository) GetAnimeAniSearchTakeoverSnapshot(
	ctx context.Context,
	animeID int64,
) (*models.AdminAnimeAniSearchTakeoverSnapshot, error) {
	syncSource, err := r.GetAnimeSyncSource(ctx, animeID)
	if err != nil {
		return nil, err
	}

	snapshot := &models.AdminAnimeAniSearchTakeoverSnapshot{
		TitleDE:     syncSource.TitleDE,
		TitleEN:     syncSource.TitleEN,
		Year:        syncSource.Year,
		MaxEpisodes: syncSource.MaxEpisodes,
		Description: syncSource.Description,
	}

	if normalized, err := r.loadNormalizedAnimeMetadata(ctx, animeID); err != nil {
		return nil, err
	} else if normalized != nil {
		if normalized.TitleDE != nil {
			snapshot.TitleDE = normalized.TitleDE
		}
		if normalized.TitleEN != nil {
			snapshot.TitleEN = normalized.TitleEN
		}
		snapshot.Genres = normalized.Genres
		snapshot.Tags = normalized.Tags
	}

	typeName, err := r.loadAnimeTypeNameForTakeover(ctx, animeID)
	if err != nil {
		return nil, err
	}
	snapshot.Type = mapAnimeTypeNameToAPI(typeName)

	return snapshot, nil
}

// loadAnimeTypeNameForTakeover liest den rohen anime_types.name-Wert (v2-Schema, über
// anime_type_id) bzw. die flache anime.type-Spalte (Legacy-Schema) eines Anime. Das Ergebnis wird
// über mapAnimeTypeNameToAPI auf den stabilen Team4s-Typ-Wert ("tv"/"film"/"ova"/...) gemappt --
// dieselbe Funktion, die loadAdminAnimeItemV2 bereits für die Anzeige verwendet.
func (r *AdminContentRepository) loadAnimeTypeNameForTakeover(ctx context.Context, animeID int64) (*string, error) {
	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}

	query := `SELECT type FROM anime WHERE id = $1`
	if schema.HasSlug {
		query = `
			SELECT at.name
			FROM anime
			LEFT JOIN anime_types at ON at.id = anime.anime_type_id
			WHERE anime.id = $1
		`
	}

	var typeName *string
	if err := r.db.QueryRow(ctx, query, animeID).Scan(&typeName); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load anime type name for takeover %d: %w", animeID, err)
	}

	return typeName, nil
}
