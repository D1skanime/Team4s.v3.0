package repository

import (
	"context"
	"errors"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

// Quick 260916 (Episoden-Metadaten): Canon/Filler und technischer Episodentyp
// gehören genau einmal zur Episode, werden über PATCH /admin/episodes/:id
// gepflegt, von Übersicht und Versionseditor gemeinsam gelesen und von einem
// normalen aniSearch-Reimport nicht überschrieben, wenn sie manuell gesetzt sind.

const episodeMetadataDSNEnv = "TEAM4S_EPISODE_METADATA_TEST_DSN"

var episodeMetadataDatabasePattern = regexp.MustCompile(`^team4s_episode_metadata_test(?:_[a-z0-9]+)?$`)

const (
	episodeMetadataAnimeID int64 = 926_170_001
	episodeMetadataEp1ID   int64 = 926_170_101
	episodeMetadataEp2ID   int64 = 926_170_102
)

var episodeMetadataReleaseVersionIDs = []int64{926_170_301, 926_170_302, 926_170_303}

func openEpisodeMetadataPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(episodeMetadataDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping episode metadata Postgres test", episodeMetadataDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", episodeMetadataDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, episodeMetadataDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", episodeMetadataDSNEnv, dbName, episodeMetadataDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", episodeMetadataDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}

// seedEpisodeMetadataFixture legt einen Anime mit EP 01 (drei Release-Versionen)
// und EP 02 an. Beide starten wie importiert: unknown/anisearch + episode/NULL.
func seedEpisodeMetadataFixture(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = $1`, episodeMetadataAnimeID)
	}
	cleanup()
	t.Cleanup(cleanup)

	_, err := pool.Exec(ctx, `
		INSERT INTO episode_filler_types (name, is_filler) VALUES
			('unknown', false), ('canon', false), ('filler', true), ('mixed', true), ('recap', true)
		ON CONFLICT (name) DO NOTHING;
		INSERT INTO episode_types (name) VALUES
			('episode'), ('special'), ('ova'), ('ona'), ('movie'),
			('recap'), ('preview'), ('prologue'), ('epilogue'), ('bonus')
		ON CONFLICT (name) DO NOTHING;
	`)
	require.NoError(t, err, "seed lookup tables")

	_, err = pool.Exec(ctx, `
		INSERT INTO anime (id, title, type, status) VALUES ($1, 'Episode Metadata 11eyes', 'tv', 'done');
	`, episodeMetadataAnimeID)
	require.NoError(t, err, "seed anime")

	for _, ep := range []struct {
		id     int64
		number int
		title  string
	}{{episodeMetadataEp1ID, 1, "Rote Nacht"}, {episodeMetadataEp2ID, 2, "Das Kristallmädchen"}} {
		_, err = pool.Exec(ctx, `
			INSERT INTO episodes (id, anime_id, episode_number, number, title, episode_type_id, filler_type_id, filler_source)
			VALUES ($1, $2, $5, $3, $4,
				(SELECT id FROM episode_types WHERE name = 'episode'),
				(SELECT id FROM episode_filler_types WHERE name = 'unknown'),
				'anisearch')
		`, ep.id, episodeMetadataAnimeID, ep.number, ep.title, strconv.Itoa(ep.number))
		require.NoError(t, err, "seed episode")
	}

	for i, releaseVersionID := range episodeMetadataReleaseVersionIDs {
		releaseID := releaseVersionID - 100
		_, err = pool.Exec(ctx, `
			INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2);
			`, releaseID, episodeMetadataEp1ID)
		require.NoErrorf(t, err, "seed fansub release %d", i)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id) VALUES ($1, $2)`, releaseVersionID, releaseID)
		require.NoErrorf(t, err, "seed release version %d", i)
	}
}

type episodeMetadataRow struct {
	FillerType, FillerSource, EpisodeType, EpisodeTypeSource *string
}

func readEpisodeMetadataRow(t *testing.T, pool *pgxpool.Pool, episodeID int64) episodeMetadataRow {
	t.Helper()
	var row episodeMetadataRow
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT eft.name, e.filler_source, et.name, e.episode_type_source
		FROM episodes e
		LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id
		LEFT JOIN episode_types et ON et.id = e.episode_type_id
		WHERE e.id = $1
	`, episodeID).Scan(&row.FillerType, &row.FillerSource, &row.EpisodeType, &row.EpisodeTypeSource))
	return row
}

func patchClassification(fillerType, episodeType string) models.AdminEpisodePatchInput {
	input := models.AdminEpisodePatchInput{ActorUserID: 0}
	if fillerType != "" {
		input.FillerType = models.OptionalString{Set: true, Value: &fillerType}
	}
	if episodeType != "" {
		input.EpisodeType = models.OptionalString{Set: true, Value: &episodeType}
	}
	return input
}

func strValue(value *string) string {
	if value == nil {
		return "<nil>"
	}
	return *value
}

func TestEpisodeClassification_PatchDimensionsIndependently(t *testing.T) {
	pool := openEpisodeMetadataPostgres(t)
	seedEpisodeMetadataFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	// unknown -> canon: episode_type bleibt unverändert.
	item, err := repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("canon", ""))
	require.NoError(t, err)
	require.Equal(t, "canon", strValue(item.FillerType))
	require.Equal(t, "manual", strValue(item.FillerTypeSource))
	row := readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "canon", strValue(row.FillerType))
	require.Equal(t, "episode", strValue(row.EpisodeType))
	require.Nil(t, row.EpisodeTypeSource, "episode_type must stay untouched")

	// episode -> special: filler_type bleibt unverändert.
	item, err = repo.UpdateEpisode(ctx, episodeMetadataEp2ID, patchClassification("", "special"))
	require.NoError(t, err)
	require.Equal(t, "special", strValue(item.EpisodeType))
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp2ID)
	require.Equal(t, "special", strValue(row.EpisodeType))
	require.Equal(t, "manual", strValue(row.EpisodeTypeSource))
	require.Equal(t, "unknown", strValue(row.FillerType))
	require.Equal(t, "anisearch", strValue(row.FillerSource), "filler provenance must stay untouched")

	// mixed + ova gemeinsam.
	_, err = repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("mixed", "ova"))
	require.NoError(t, err)
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "mixed", strValue(row.FillerType))
	require.Equal(t, "ova", strValue(row.EpisodeType))

	// recap ist in beiden Dimensionen unabhängig.
	_, err = repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("recap", "episode"))
	require.NoError(t, err)
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "recap", strValue(row.FillerType))
	require.Equal(t, "episode", strValue(row.EpisodeType))

	_, err = repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("canon", "recap"))
	require.NoError(t, err)
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "canon", strValue(row.FillerType))
	require.Equal(t, "recap", strValue(row.EpisodeType))
}

func TestEpisodeClassification_UnknownLookupNameIsConflictNotFallback(t *testing.T) {
	pool := openEpisodeMetadataPostgres(t)
	seedEpisodeMetadataFixture(t, pool)
	repo := NewAdminContentRepository(pool)

	_, err := repo.UpdateEpisode(context.Background(), episodeMetadataEp1ID, patchClassification("", "not-a-type"))
	require.True(t, errors.Is(err, ErrConflict), "expected ErrConflict, got %v", err)
	row := readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "episode", strValue(row.EpisodeType))
	require.Equal(t, "unknown", strValue(row.FillerType))
}

func TestEpisodeClassification_SharedAcrossVersionsAndViews(t *testing.T) {
	pool := openEpisodeMetadataPostgres(t)
	seedEpisodeMetadataFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	var episodesBefore int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM episodes WHERE anime_id = $1`, episodeMetadataAnimeID).Scan(&episodesBefore))

	// Übersicht setzt Canon + Special.
	_, err := repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("canon", "special"))
	require.NoError(t, err)

	// Alle drei Versionseditoren sehen denselben Episode-Datensatz.
	for _, releaseVersionID := range episodeMetadataReleaseVersionIDs {
		classification, err := repo.GetEpisodeClassificationByReleaseVersion(ctx, releaseVersionID)
		require.NoError(t, err)
		require.Equal(t, episodeMetadataEp1ID, classification.EpisodeID)
		require.Equal(t, "canon", strValue(classification.FillerType))
		require.Equal(t, "special", strValue(classification.EpisodeType))
	}

	// Versionseditor ändert auf Mixed + Episode (gleicher PATCH-Pfad).
	fromEditor, err := repo.GetEpisodeClassificationByReleaseVersion(ctx, episodeMetadataReleaseVersionIDs[2])
	require.NoError(t, err)
	_, err = repo.UpdateEpisode(ctx, fromEditor.EpisodeID, patchClassification("mixed", "episode"))
	require.NoError(t, err)

	// Übersicht liest danach genau diese Werte.
	listed, err := repo.ListEpisodeClassificationsByAnime(ctx, episodeMetadataAnimeID)
	require.NoError(t, err)
	require.Len(t, listed, 2)
	byID := map[int64]models.EpisodeClassification{}
	for _, item := range listed {
		byID[item.EpisodeID] = item
	}
	require.Equal(t, "mixed", strValue(byID[episodeMetadataEp1ID].FillerType))
	require.Equal(t, "episode", strValue(byID[episodeMetadataEp1ID].EpisodeType))
	require.Equal(t, "unknown", strValue(byID[episodeMetadataEp2ID].FillerType), "other episodes stay untouched")

	for _, releaseVersionID := range episodeMetadataReleaseVersionIDs {
		classification, err := repo.GetEpisodeClassificationByReleaseVersion(ctx, releaseVersionID)
		require.NoError(t, err)
		require.Equal(t, "mixed", strValue(classification.FillerType))
		require.Equal(t, "episode", strValue(classification.EpisodeType))
	}

	var episodesAfter int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM episodes WHERE anime_id = $1`, episodeMetadataAnimeID).Scan(&episodesAfter))
	require.Equal(t, episodesBefore, episodesAfter, "classification must never create episode rows")

	var versionColumns int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name IN ('fansub_releases', 'release_versions', 'release_variants')
		  AND (column_name LIKE '%filler%' OR column_name LIKE 'episode_type%')
	`).Scan(&versionColumns))
	require.Zero(t, versionColumns, "no per-version classification columns may exist")
}

func TestEpisodeClassification_EpisodeNumberPatchKeepsManualType(t *testing.T) {
	pool := openEpisodeMetadataPostgres(t)
	seedEpisodeMetadataFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	_, err := repo.UpdateEpisode(ctx, episodeMetadataEp2ID, patchClassification("", "bonus"))
	require.NoError(t, err)

	number := "12"
	_, err = repo.UpdateEpisode(ctx, episodeMetadataEp2ID, models.AdminEpisodePatchInput{
		EpisodeNumber: models.OptionalString{Set: true, Value: &number},
	})
	require.NoError(t, err)
	row := readEpisodeMetadataRow(t, pool, episodeMetadataEp2ID)
	require.Equal(t, "bonus", strValue(row.EpisodeType), "manual episode type must survive a number change")
}

func TestEpisodeClassification_ReimportRespectsManualOverride(t *testing.T) {
	pool := openEpisodeMetadataPostgres(t)
	seedEpisodeMetadataFixture(t, pool)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	var episodeTypeID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM episode_types WHERE name = 'episode'`).Scan(&episodeTypeID))

	reimport := func(number int32, fillerType string) (int64, bool) {
		t.Helper()
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(ctx) }()
		source := "anisearch"
		title := "Import"
		id, created, err := upsertImportEpisode(ctx, tx, episodeMetadataAnimeID, episodeTypeID, models.EpisodeImportCanonicalEpisode{
			EpisodeNumber: number,
			Title:         &title,
			FillerType:    &fillerType,
			FillerSource:  &source,
		})
		require.NoError(t, err)
		require.NoError(t, tx.Commit(ctx))
		return id, created
	}

	// Import liefert canon (belegbarer aniSearch-Wert).
	id, created := reimport(1, "canon")
	require.Equal(t, episodeMetadataEp1ID, id)
	require.False(t, created)
	row := readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "canon", strValue(row.FillerType))
	require.Equal(t, "anisearch", strValue(row.FillerSource))

	// Admin überschreibt manuell: filler + special.
	_, err := repo.UpdateEpisode(ctx, episodeMetadataEp1ID, patchClassification("filler", "special"))
	require.NoError(t, err)

	// Normaler Reimport liefert wieder canon: manueller Wert bleibt, keine Duplikat-Episode.
	id, created = reimport(1, "canon")
	require.Equal(t, episodeMetadataEp1ID, id, "manually retyped episode must be found again")
	require.False(t, created, "reimport must not create a duplicate episode")
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp1ID)
	require.Equal(t, "filler", strValue(row.FillerType))
	require.Equal(t, "manual", strValue(row.FillerSource))
	require.Equal(t, "special", strValue(row.EpisodeType))

	var ep1Count int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM episodes WHERE anime_id = $1 AND number = 1`, episodeMetadataAnimeID).Scan(&ep1Count))
	require.Equal(t, 1, ep1Count)

	// Nicht manuell gepflegte Episoden übernehmen weiterhin den aniSearch-Wert.
	reimport(2, "recap")
	row = readEpisodeMetadataRow(t, pool, episodeMetadataEp2ID)
	require.Equal(t, "recap", strValue(row.FillerType))
	require.Equal(t, "episode", strValue(row.EpisodeType), "filler recap must not change episode type")
}
