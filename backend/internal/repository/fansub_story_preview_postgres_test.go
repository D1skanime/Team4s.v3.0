package repository

import (
	"context"
	"os"
	"regexp"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Plan 162-01: beweist die additive LEFT JOIN LATERAL-Erweiterung von
// ListAnimeFansubs gegen echtes Postgres — Kürzung, Rune-Sicherheit,
// Filterung (visibility/status/deleted_at) und Sortierung (sort_order ASC,
// id ASC) sowie die unveränderte äußere Gruppenreihenfolge
// (is_primary DESC, name ASC).

const fansubStoryPreviewDSNEnv = "TEAM4S_FANSUB_TEST_DSN"

// fansubStoryPreviewDatabasePattern verhindert fail-closed, dass der Test
// gegen team4s_v2 läuft.
var fansubStoryPreviewDatabasePattern = regexp.MustCompile(`^team4s_fansub_test(?:_[a-z0-9]+)?$`)

const (
	fansubStoryPreviewAnimeID   int64 = 926_162_001
	fansubStoryPreviewGroupAID  int64 = 926_162_011 // is_primary, immer zuerst
	fansubStoryPreviewGroupBID  int64 = 926_162_012 // kurzer Text, Name vor Gruppe C
	fansubStoryPreviewGroupCID  int64 = 926_162_013 // keine gültige Story
)

func openFansubStoryPreviewPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(fansubStoryPreviewDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping fansub story preview Postgres test", fansubStoryPreviewDSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", fansubStoryPreviewDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, fansubStoryPreviewDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", fansubStoryPreviewDSNEnv, dbName, fansubStoryPreviewDatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", fansubStoryPreviewDSNEnv)
	t.Cleanup(pool.Close)
	return pool
}

func seedFansubStoryPreviewFixture(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	ctx := context.Background()
	groupIDs := []int64{fansubStoryPreviewGroupAID, fansubStoryPreviewGroupBID, fansubStoryPreviewGroupCID}

	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM fansub_group_notes WHERE fansub_group_id = ANY($1)`, groupIDs)
		_, _ = pool.Exec(ctx, `DELETE FROM anime_fansub_groups WHERE anime_id = $1`, fansubStoryPreviewAnimeID)
		_, _ = pool.Exec(ctx, `DELETE FROM fansub_groups WHERE id = ANY($1)`, groupIDs)
		_, _ = pool.Exec(ctx, `DELETE FROM anime WHERE id = $1`, fansubStoryPreviewAnimeID)
	}
	cleanup()
	t.Cleanup(cleanup)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id, title, type, status, year) VALUES ($1, 'Story Preview Test Anime', 'tv', 'done', 2020)
	`, fansubStoryPreviewAnimeID)
	require.NoError(t, err, "seed anime")

	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_groups (id, slug, name, status) VALUES
			($1, 'story-preview-group-primary', 'Server Primary', 'active'),
			($2, 'story-preview-group-alpha', 'Alpha Fansub', 'active'),
			($3, 'story-preview-group-zulu', 'Zulu Fansub', 'active')
	`, fansubStoryPreviewGroupAID, fansubStoryPreviewGroupBID, fansubStoryPreviewGroupCID)
	require.NoError(t, err, "seed fansub groups")

	_, err = pool.Exec(ctx, `
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary) VALUES
			($1, $2, true),
			($1, $3, false),
			($1, $4, false)
	`, fansubStoryPreviewAnimeID, fansubStoryPreviewGroupAID, fansubStoryPreviewGroupBID, fansubStoryPreviewGroupCID)
	require.NoError(t, err, "seed anime fansub group links")

	longUmlautText := strings.Repeat("äöüß", 200) // 800 runes, weit über der 500-Rune-Grenze
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_notes (fansub_group_id, title, body_text, visibility, status, sort_order, deleted_at) VALUES
			($1, 'Erste Geschichte', $2, 'public', 'published', 1, NULL),
			($1, 'Zweite Geschichte', 'diese Geschichte darf NICHT ausgewaehlt werden', 'public', 'published', 2, NULL)
	`, fansubStoryPreviewGroupAID, longUmlautText)
	require.NoError(t, err, "seed group A stories")

	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_notes (fansub_group_id, title, body_text, visibility, status, sort_order, deleted_at) VALUES
			($1, 'Kurze Geschichte', 'Kurze oeffentliche Geschichte fuer Gruppe B mit Umlauten: ae oe ue.', 'public', 'published', 1, NULL)
	`, fansubStoryPreviewGroupBID)
	require.NoError(t, err, "seed group B story")

	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_notes (fansub_group_id, title, body_text, visibility, status, sort_order, deleted_at) VALUES
			($1, 'Entwurf', 'noch nicht veroeffentlichter Entwurf', 'public', 'draft', 1, NULL)
	`, fansubStoryPreviewGroupCID)
	require.NoError(t, err, "seed group C draft-only story")

	return longUmlautText
}

func TestListAnimeFansubs_StoryPreview(t *testing.T) {
	pool := openFansubStoryPreviewPostgres(t)
	longUmlautText := seedFansubStoryPreviewFixture(t, pool)
	ctx := context.Background()
	repo := NewFansubRepository(pool)

	relations, err := repo.ListAnimeFansubs(ctx, fansubStoryPreviewAnimeID)
	require.NoError(t, err)
	require.Len(t, relations, 3)

	// (1) Bestehende Gruppenreihenfolge is_primary DESC, name ASC bleibt unveraendert:
	// Server Primary (is_primary) zuerst, dann Alpha Fansub, dann Zulu Fansub.
	require.Equal(t, fansubStoryPreviewGroupAID, relations[0].FansubGroupID)
	require.Equal(t, fansubStoryPreviewGroupBID, relations[1].FansubGroupID)
	require.Equal(t, fansubStoryPreviewGroupCID, relations[2].FansubGroupID)

	groupA := relations[0].FansubGroup
	require.NotNil(t, groupA)
	require.NotNil(t, groupA.StoryPreview, "group A has a valid public published story")

	// (2) Exakt fansubStoryPreviewRuneLimit Runes, gueltiges UTF-8.
	require.Equal(t, fansubStoryPreviewRuneLimit, len([]rune(*groupA.StoryPreview)))
	require.True(t, utf8.ValidString(*groupA.StoryPreview))

	// (3) Text stammt aus der Zeile mit dem frueheren sort_order (1), nicht der
	// spaeteren (2) — die ersten fansubStoryPreviewRuneLimit Runes des langen
	// Umlaut-Texts muessen exakt uebereinstimmen.
	expectedPrefix := string([]rune(longUmlautText)[:fansubStoryPreviewRuneLimit])
	require.Equal(t, expectedPrefix, *groupA.StoryPreview)
	require.NotContains(t, *groupA.StoryPreview, "NICHT ausgewaehlt")

	// (4) Gruppe B: kurzer Text unveraendert.
	groupB := relations[1].FansubGroup
	require.NotNil(t, groupB)
	require.NotNil(t, groupB.StoryPreview)
	require.Equal(t, "Kurze oeffentliche Geschichte fuer Gruppe B mit Umlauten: ae oe ue.", *groupB.StoryPreview)

	// (5) Gruppe C: nur ein Entwurf (status=draft) vorhanden, muss ignoriert werden.
	groupC := relations[2].FansubGroup
	require.NotNil(t, groupC)
	require.Nil(t, groupC.StoryPreview, "group C has no public published story")
}
