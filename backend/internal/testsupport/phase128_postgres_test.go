package testsupport

import (
	"os"
	"os/exec"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

const phase128MissingDSNProcess = "TEAM4S_PHASE128_MISSING_DSN_PROCESS"

func TestPhase128OpenWithoutDSNProcess(t *testing.T) {
	if os.Getenv(phase128MissingDSNProcess) != "1" {
		return
	}
	OpenPhase128Postgres(t)
}

func TestPhase128MissingDSNFailsClosedAndIgnoresDatabaseURL(t *testing.T) {
	command := exec.Command(os.Args[0], "-test.run=^TestPhase128OpenWithoutDSNProcess$", "-test.v")
	command.Env = append(filteredPhase128Environment(os.Environ()),
		phase128MissingDSNProcess+"=1",
		"DATABASE_URL=postgres://team4s:secret@localhost:5432/team4s_v2",
	)
	output, err := command.CombinedOutput()
	require.Error(t, err, "missing dedicated DSN must fail instead of skipping")
	require.Contains(t, string(output), phase128DSNEnv+" is required")
	require.NotContains(t, strings.ToLower(string(output)), "skipping postgresql")
}

func TestPhase128DatabaseGuard(t *testing.T) {
	for _, accepted := range []string{"team4s_phase128_test", "team4s_phase128_test_a", "team4s_phase128_test_abc123"} {
		require.NoError(t, validatePhase128DatabaseName(accepted), accepted)
	}
	for _, rejected := range []string{
		"", "postgres", "template0", "template1", "team4s_v2",
		"team4s_phase128_test_", "team4s_phase128_test_UPPER", "team4s_phase128_test_a-b",
	} {
		require.Error(t, validatePhase128DatabaseName(rejected), rejected)
	}
}

func TestPhase128SchemaValidation(t *testing.T) {
	for _, accepted := range []string{"phase128_a", "phase128_abc_123"} {
		require.NoError(t, validatePhase128SchemaName(accepted), accepted)
	}
	for _, rejected := range []string{"", "public", "phase106_a", "phase128_ABC", "phase128_a-b", "phase128_"} {
		require.Error(t, validatePhase128SchemaName(rejected), rejected)
	}
}

func TestPhase128DSNEnvironmentNameIsDedicated(t *testing.T) {
	require.Equal(t, "TEAM4S_PHASE128_TEST_DSN", phase128DSNEnv)
	require.NotEqual(t, phase106DSNEnv, phase128DSNEnv)
	require.NotEqual(t, phase117DSNEnv, phase128DSNEnv)
}

func filteredPhase128Environment(environment []string) []string {
	prefix := phase128DSNEnv + "="
	filtered := make([]string, 0, len(environment))
	for _, value := range environment {
		if !strings.HasPrefix(value, prefix) {
			filtered = append(filtered, value)
		}
	}
	return filtered
}
