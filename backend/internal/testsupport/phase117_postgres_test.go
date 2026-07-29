package testsupport

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase117DSNSelectionIgnoresDatabaseURL(t *testing.T) {
	t.Setenv(phase117DSNEnv, "")
	t.Setenv("DATABASE_URL", "postgres://team4s:secret@localhost:5432/team4s_v2")
	run := false
	ok := t.Run("database-url-alone-skips", func(t *testing.T) {
		OpenPhase117Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)
}

func TestPhase117DSNIsolationBetweenPhases(t *testing.T) {
	t.Setenv(phase106DSNEnv, "postgres://team4s:secret@localhost:5432/team4s_phase106_test_a")
	t.Setenv(phase117DSNEnv, "")
	run := false
	ok := t.Run("phase-106-env-does-not-open-phase-117", func(t *testing.T) {
		OpenPhase117Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)

	require.Error(t, validatePhase106DatabaseName("team4s_phase117_test_a"))
	require.Error(t, validatePhase117DatabaseName("team4s_phase106_test_a"))
}

func TestPhase117DatabaseGuard(t *testing.T) {
	for _, accepted := range []string{"team4s_phase117_test_a", "team4s_phase117_test_abc123"} {
		require.NoError(t, validatePhase117DatabaseName(accepted))
	}
	for _, rejected := range []string{"", "postgres", "template0", "template1", "team4s_v2", "team4s_phase117_test_", "team4s_phase117_test_UPPER", "team4s_phase117_test_a-b"} {
		require.Error(t, validatePhase117DatabaseName(rejected), rejected)
	}
}

func TestPhase117SchemaValidation(t *testing.T) {
	for _, accepted := range []string{"phase117_a", "phase117_abc_123"} {
		require.NoError(t, validatePhase117SchemaName(accepted))
	}
	for _, rejected := range []string{"", "public", "phase106_a", "phase117_ABC", "phase117_a-b", "phase117_"} {
		require.Error(t, validatePhase117SchemaName(rejected), rejected)
	}
}

func TestPhase117DSNEnvironmentNameIsDedicated(t *testing.T) {
	require.Equal(t, "TEAM4S_PHASE117_TEST_DSN", phase117DSNEnv)
	require.NotEqual(t, phase106DSNEnv, phase117DSNEnv)
	_, exists := os.LookupEnv(phase117DSNEnv)
	_ = exists
}
