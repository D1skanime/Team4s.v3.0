package testsupport

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPhase165DatabaseGuard(t *testing.T) {
	for _, accepted := range []string{"team4s_phase165_test_a", "team4s_phase165_test_abc123"} {
		require.NoError(t, validatePhase165DatabaseName(accepted), accepted)
	}
	for _, rejected := range []string{
		"", "postgres", "template0", "template1", "team4s_v2", "team4s_phase165_test",
		"team4s_phase165_test_", "team4s_phase165_test_UPPER", "team4s_phase165_test_a-b",
	} {
		require.Error(t, validatePhase165DatabaseName(rejected), rejected)
	}
}

func TestPhase165SchemaValidation(t *testing.T) {
	for _, accepted := range []string{"phase165_a", "phase165_abc_123"} {
		require.NoError(t, validatePhase165SchemaName(accepted), accepted)
	}
	for _, rejected := range []string{"", "public", "phase106_a", "phase165_ABC", "phase165_a-b", "phase165_"} {
		require.Error(t, validatePhase165SchemaName(rejected), rejected)
	}
}

func TestPhase165DSNEnvironmentNameIsDedicated(t *testing.T) {
	require.Equal(t, "TEAM4S_PHASE165_TEST_DSN", phase165DSNEnv)
	require.NotEqual(t, phase106DSNEnv, phase165DSNEnv)
	require.NotEqual(t, phase117DSNEnv, phase165DSNEnv)
	require.NotEqual(t, phase150DSNEnv, phase165DSNEnv)
}

func TestPhase165DSNSelectionIgnoresDatabaseURL(t *testing.T) {
	t.Setenv(phase165DSNEnv, "")
	t.Setenv("DATABASE_URL", "postgres://team4s:secret@localhost:5432/team4s_v2")
	run := false
	ok := t.Run("database-url-alone-skips", func(t *testing.T) {
		OpenPhase165Postgres(t)
		run = true
	})
	require.True(t, ok)
	require.False(t, run)
}
