package testsupport

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase107DSNSelectionIgnoresDatabaseURL(t *testing.T) {
	t.Setenv(phase107DSNEnv, "")
	t.Setenv("DATABASE_URL", "postgres://team4s:secret@localhost:5432/team4s_v2")
	run := false
	ok := t.Run("database-url-alone-skips", func(t *testing.T) {
		OpenPhase107Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)
}

func TestPhase107DSNIsolationBetweenPhases(t *testing.T) {
	t.Setenv(phase106DSNEnv, "postgres://team4s:secret@localhost:5432/team4s_phase106_test_a")
	t.Setenv(phase107DSNEnv, "")
	run := false
	ok := t.Run("phase-106-env-does-not-open-phase-107", func(t *testing.T) {
		OpenPhase107Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)

	require.Error(t, validatePhase106DatabaseName("team4s_phase107_test_a"))
	require.Error(t, validatePhase107DatabaseName("team4s_phase106_test_a"))
}

func TestPhase107DatabaseGuard(t *testing.T) {
	for _, accepted := range []string{"team4s_phase107_test_a", "team4s_phase107_test_abc123"} {
		require.NoError(t, validatePhase107DatabaseName(accepted))
	}
	for _, rejected := range []string{"", "postgres", "template0", "template1", "team4s_v2", "team4s_phase107_test_", "team4s_phase107_test_UPPER", "team4s_phase107_test_a-b"} {
		require.Error(t, validatePhase107DatabaseName(rejected), rejected)
	}
}

func TestPhase107SchemaValidation(t *testing.T) {
	for _, accepted := range []string{"phase107_a", "phase107_abc_123"} {
		require.NoError(t, validatePhase107SchemaName(accepted))
	}
	for _, rejected := range []string{"", "public", "phase106_a", "phase107_ABC", "phase107_a-b", "phase107_"} {
		require.Error(t, validatePhase107SchemaName(rejected), rejected)
	}
}

func TestPhase107PublicTargetGuard(t *testing.T) {
	for _, sql := range []string{
		"CREATE TABLE public.review_decisions (id bigint)",
		"INSERT INTO public.review_decisions VALUES (1)",
		"UPDATE public.review_decisions SET id = 2",
		"DELETE FROM public.review_decisions",
		"DROP TABLE IF EXISTS public.review_decisions",
		"TRUNCATE public.review_decisions",
		`CREATE TABLE "public".review_decisions (id bigint)`,
		`ALTER TABLE "public".review_decisions ADD COLUMN value bigint`,
		"DROP SCHEMA public CASCADE",
		"ALTER SCHEMA public RENAME TO unsafe_public",
	} {
		require.Error(t, validatePhase106SQL(sql), sql)
	}
	require.NoError(t, validatePhase106SQL("CREATE TABLE review_decisions (id bigint)"))
}

func TestPhase107DSNEnvironmentNameIsDedicated(t *testing.T) {
	require.Equal(t, "TEAM4S_PHASE107_TEST_DSN", phase107DSNEnv)
	require.NotEqual(t, phase106DSNEnv, phase107DSNEnv)
	_, exists := os.LookupEnv(phase107DSNEnv)
	_ = exists
}
