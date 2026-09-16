package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// Öffentliche Relationsanzeige: Der Typ beschreibt das verwandte Anime immer aus
// Sicht der angezeigten Seite, und das Cover nutzt denselben Resolver wie die
// Detailseite (inkl. Poster aus anime_media).
func TestGetAnimeRelations_PerspectiveAndPosterCover(t *testing.T) {
	pool := openAnimeRelationsPostgres(t)
	seedAnimeRelationsFixture(t, pool)
	ctx := context.Background()

	const posterPath = "/api/v1/media/image?item_id=relations-test&kind=primary&provider=jellyfin"
	_, err := pool.Exec(ctx, `
		INSERT INTO media_types (name) VALUES ('poster') ON CONFLICT (name) DO NOTHING;
	`)
	require.NoError(t, err)
	var mediaID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type)
		SELECT id, $1, 'image/jpeg' FROM media_types WHERE name = 'poster'
		RETURNING id
	`, posterPath).Scan(&mediaID))
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM anime_media WHERE media_id = $1`, mediaID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM media_assets WHERE id = $1`, mediaID)
	})
	_, err = pool.Exec(ctx, `
		INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0);
		`, relationsTestMainAnimeID, mediaID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE anime SET cover_image = '/media/anime/ova/cover.jpg' WHERE id = $1`, relationsTestOVAAnimeID)
	require.NoError(t, err)

	adminRepo := NewAdminContentRepository(pool)
	require.NoError(t, adminRepo.CreateAdminAnimeRelation(ctx, relationsTestMainAnimeID, relationsTestOVAAnimeID, "Nebengeschichte"))
	require.NoError(t, adminRepo.CreateAdminAnimeRelation(ctx, relationsTestMainAnimeID, relationsTestManualAnimeID, "Fortsetzung"))

	repo := NewAnimeRepository(pool)

	// Hauptserie: OVA ist Nebengeschichte, gespeicherter Typ unverändert.
	fromMain, err := repo.GetAnimeRelations(ctx, relationsTestMainAnimeID)
	require.NoError(t, err)
	byID := map[int64]AnimeRelation{}
	for _, rel := range fromMain {
		byID[rel.AnimeID] = rel
	}
	require.Equal(t, "side-story", byID[relationsTestOVAAnimeID].RelationType)
	require.Equal(t, "sequel", byID[relationsTestManualAnimeID].RelationType)
	require.NotNil(t, byID[relationsTestOVAAnimeID].CoverImage)
	require.Equal(t, "/media/anime/ova/cover.jpg", *byID[relationsTestOVAAnimeID].CoverImage)

	// OVA-Seite: dieselbe Zeile, aus OVA-Sicht ist die Hauptserie die Hauptgeschichte;
	// Cover kommt aus dem Poster, weil anime.cover_image leer ist.
	fromOVA, err := repo.GetAnimeRelations(ctx, relationsTestOVAAnimeID)
	require.NoError(t, err)
	require.Len(t, fromOVA, 1)
	require.Equal(t, relationsTestMainAnimeID, fromOVA[0].AnimeID)
	require.Equal(t, "full-story", fromOVA[0].RelationType)
	require.NotNil(t, fromOVA[0].CoverImage)
	require.Equal(t, posterPath, *fromOVA[0].CoverImage)

	// Fortsetzungs-Seite: Vorgänger erscheint als Hauptgeschichte.
	fromSequel, err := repo.GetAnimeRelations(ctx, relationsTestManualAnimeID)
	require.NoError(t, err)
	require.Len(t, fromSequel, 1)
	require.Equal(t, "full-story", fromSequel[0].RelationType)

	// Existiert zusätzlich eine Relation aus OVA-Sicht, gewinnt die eigene.
	require.NoError(t, adminRepo.CreateAdminAnimeRelation(ctx, relationsTestOVAAnimeID, relationsTestMainAnimeID, "Zusammenfassung"))
	fromOVA, err = repo.GetAnimeRelations(ctx, relationsTestOVAAnimeID)
	require.NoError(t, err)
	require.Len(t, fromOVA, 1)
	require.Equal(t, "summary", fromOVA[0].RelationType)
}
