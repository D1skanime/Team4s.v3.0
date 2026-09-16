package repository

import (
	"context"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

// Quick 260916: aniSearch "Alternative Version" wird als Nebengeschichte
// importiert. Dieser Test prüft den Speicherpfad gegen echtes Postgres:
// speichern, im Admin wieder auslesen, Re-Import ohne Duplikat, manuelle
// Relationen bleiben erhalten, Filler-Einstufung bleibt unangetastet.

const animeRelationsDSNEnv = "TEAM4S_RELATIONS_TEST_DSN"

// animeRelationsDatabasePattern verhindert fail-closed, dass der Test gegen
// team4s_v2 läuft.
var animeRelationsDatabasePattern = regexp.MustCompile(`^team4s_relations_test(?:_[a-z0-9]+)?$`)

const (
	relationsTestMainAnimeID   int64 = 926_160_001
	relationsTestOVAAnimeID    int64 = 926_160_002
	relationsTestManualAnimeID int64 = 926_160_003
)

func openAnimeRelationsPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(animeRelationsDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping anime relations Postgres test", animeRelationsDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", animeRelationsDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, animeRelationsDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", animeRelationsDSNEnv, dbName, animeRelationsDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", animeRelationsDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}

func seedAnimeRelationsFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = ANY($1)`,
			[]int64{relationsTestMainAnimeID, relationsTestOVAAnimeID, relationsTestManualAnimeID})
	}
	cleanup()
	t.Cleanup(cleanup)

	_, err := pool.Exec(ctx, `
		INSERT INTO relation_types (name) VALUES ('full-story'), ('side-story'), ('sequel'), ('summary')
		ON CONFLICT (name) DO NOTHING;
	`)
	require.NoError(t, err, "seed relation types")
	_, err = pool.Exec(ctx, `
		INSERT INTO episode_filler_types (name, is_filler) VALUES ('unknown', false)
		ON CONFLICT (name) DO NOTHING;
	`)
	require.NoError(t, err, "seed filler types")

	_, err = pool.Exec(ctx, `
		INSERT INTO anime (id, title, type, status, year) VALUES
			($1, 'Relations Test 11eyes', 'tv', 'done', 2009),
			($2, 'Relations Test 11eyes: Pink Phantasmagoria', 'ova', 'done', 2010),
			($3, 'Relations Test Manual Target', 'tv', 'done', 2011)
	`, relationsTestMainAnimeID, relationsTestOVAAnimeID, relationsTestManualAnimeID)
	require.NoError(t, err, "seed anime")

	_, err = pool.Exec(ctx, `
		INSERT INTO episodes (anime_id, episode_number, filler_type_id, filler_source)
		SELECT $1, '1', eft.id, 'anisearch' FROM episode_filler_types eft WHERE eft.name = 'unknown'
	`, relationsTestOVAAnimeID)
	require.NoError(t, err, "seed OVA episode")
}

func TestAdminAnimeRelations_AniSearchSideStoryPersistsWithoutDuplicatesOrSideEffects(t *testing.T) {
	pool := openAnimeRelationsPostgres(t)
	seedAnimeRelationsFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	// Manuell gepflegte Relation, die ein aniSearch-Import nicht anfassen darf.
	require.NoError(t, repo.CreateAdminAnimeRelation(ctx, relationsTestMainAnimeID, relationsTestManualAnimeID, "Fortsetzung"))

	imported := []models.AdminAnimeRelation{
		{TargetAnimeID: relationsTestOVAAnimeID, RelationLabel: "Nebengeschichte"},
	}

	first, err := repo.ApplyAdminAnimeEnrichmentRelationsDetailed(ctx, relationsTestMainAnimeID, imported)
	require.NoError(t, err)
	require.Equal(t, 1, first.Applied)
	require.Equal(t, 0, first.SkippedExisting)

	// Re-Import derselben aniSearch-Daten.
	second, err := repo.ApplyAdminAnimeEnrichmentRelationsDetailed(ctx, relationsTestMainAnimeID, imported)
	require.NoError(t, err)
	require.Equal(t, 0, second.Applied)
	require.Equal(t, 1, second.SkippedExisting)

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_relations WHERE source_anime_id = $1 AND target_anime_id = $2
	`, relationsTestMainAnimeID, relationsTestOVAAnimeID).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "re-import must not duplicate the relation")

	// Keine künstliche Gegenrelation.
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_relations WHERE source_anime_id = $1
	`, relationsTestOVAAnimeID).Scan(&rowCount))
	require.Equal(t, 0, rowCount, "import must not create a reverse relation")

	// Gespeichert als side-story, nicht als alternative-version.
	var storedType string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT rt.name FROM anime_relations ar JOIN relation_types rt ON rt.id = ar.relation_type_id
		WHERE ar.source_anime_id = $1 AND ar.target_anime_id = $2
	`, relationsTestMainAnimeID, relationsTestOVAAnimeID).Scan(&storedType))
	require.Equal(t, "side-story", storedType)

	// Admin-Relationsansicht aus Sicht des Hauptanime.
	listed, err := repo.ListAdminAnimeRelations(ctx, relationsTestMainAnimeID)
	require.NoError(t, err)
	labels := make(map[int64]string, len(listed))
	for _, relation := range listed {
		labels[relation.TargetAnimeID] = relation.RelationLabel
	}
	require.Len(t, listed, 2)
	require.Equal(t, "Nebengeschichte", labels[relationsTestOVAAnimeID])
	require.Equal(t, "Fortsetzung", labels[relationsTestManualAnimeID], "manual relation must survive the import")

	// Filler-Einstufung der OVA-Episode bleibt "unknown".
	var fillerName string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT eft.name FROM episodes e JOIN episode_filler_types eft ON eft.id = e.filler_type_id
		WHERE e.anime_id = $1 AND e.episode_number = '1'
	`, relationsTestOVAAnimeID).Scan(&fillerName))
	require.Equal(t, "unknown", fillerName)
}
