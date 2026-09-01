package migrations_test

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	phase142HistoricalRoleContextsUpFile   = "0158_historical_role_contexts.up.sql"
	phase142HistoricalRoleContextsDownFile = "0158_historical_role_contexts.down.sql"
)

func TestPhase142HistoricalRoleContextsSourceContract(t *testing.T) {
	for _, name := range []string{phase142HistoricalRoleContextsUpFile, phase142HistoricalRoleContextsDownFile} {
		body, err := os.ReadFile(phase136MigrationPath(t, name))
		require.NoError(t, err)
		contents := strings.ToLower(string(body))
		require.Contains(t, contents, "migration_0158_historical_role_context_backup")
	}

	up, err := os.ReadFile(phase136MigrationPath(t, phase142HistoricalRoleContextsUpFile))
	require.NoError(t, err)
	upContents := strings.ToLower(string(up))
	require.Contains(t, upContents, "'group_history'")
	for _, roleCode := range []string{"techadmin", "gfxler", "karaoke_fx", "admin"} {
		require.Contains(t, upContents, "'"+roleCode+"'")
	}
}
