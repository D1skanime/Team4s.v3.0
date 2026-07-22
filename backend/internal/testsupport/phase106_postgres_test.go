package testsupport

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase106DSNSelectionIgnoresDatabaseURL(t *testing.T) {
	t.Setenv(phase106DSNEnv, "")
	t.Setenv("DATABASE_URL", "postgres://team4s:secret@localhost:5432/team4s_v2")
	run := false
	ok := t.Run("database-url-alone-skips", func(t *testing.T) {
		OpenPhase106Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)
}

func TestPhase106DatabaseGuard(t *testing.T) {
	for _, accepted := range []string{"team4s_phase106_test_a", "team4s_phase106_test_abc123"} {
		require.NoError(t, validatePhase106DatabaseName(accepted))
	}
	for _, rejected := range []string{"", "postgres", "template0", "template1", "team4s_v2", "team4s_phase106_test_", "team4s_phase106_test_UPPER", "team4s_phase106_test_a-b"} {
		require.Error(t, validatePhase106DatabaseName(rejected), rejected)
	}
}

func TestPhase106SchemaValidation(t *testing.T) {
	for _, accepted := range []string{"phase106_a", "phase106_abc_123"} {
		require.NoError(t, validatePhase106SchemaName(accepted))
	}
	for _, rejected := range []string{"", "public", "phase105_a", "phase106_ABC", "phase106_a-b", "phase106_"} {
		require.Error(t, validatePhase106SchemaName(rejected), rejected)
	}
}

func TestPhase106PublicTargetGuard(t *testing.T) {
	for _, sql := range []string{
		"CREATE TABLE public.point_rules (id bigint)",
		"INSERT INTO public.point_rules VALUES (1)",
		"UPDATE public.point_rules SET id = 2",
		"DELETE FROM public.point_rules",
		"DROP TABLE IF EXISTS public.point_rules",
		"TRUNCATE public.point_rules",
		`CREATE TABLE "public".point_rules (id bigint)`,
		`ALTER TABLE "public".point_rules ADD COLUMN value bigint`,
		"DROP SCHEMA public CASCADE",
		"ALTER SCHEMA public RENAME TO unsafe_public",
		`DROP SCHEMA "public" CASCADE`,
	} {
		require.Error(t, validatePhase106SQL(sql), sql)
	}
	require.NoError(t, validatePhase106SQL("CREATE TABLE point_rules (id bigint)"))
	require.NoError(t, validatePhase106SQL("-- public.point_rules is documentation only"))
}

func TestPhase106DSNEnvironmentNameIsDedicated(t *testing.T) {
	require.Equal(t, "TEAM4S_PHASE106_TEST_DSN", phase106DSNEnv)
	_, exists := os.LookupEnv(phase106DSNEnv)
	_ = exists // Environment presence is intentionally not required for unit tests.
}
