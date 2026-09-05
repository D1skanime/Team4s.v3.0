package migrations_test

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

const phase147AppGlobalRolesMigrationFile = "0072_keycloak_app_users_foundation.up.sql"

// phase147CheckRoleInPattern captures the parenthesized value list of the named
// CHECK constraint that fences app_user_global_roles.role. The constraint name is part
// of the pattern so an unrelated CHECK (role IN (...)) elsewhere in the migration can
// never be matched by accident.
var phase147CheckRoleInPattern = regexp.MustCompile(
	`CONSTRAINT chk_app_user_global_roles_role CHECK \(role IN \(([^)]+)\)\)`,
)

// TestPhase147AppGlobalRolesSourceContract proves models.AppGlobalRoles (Phase 147 / HC-03)
// matches the DB CHECK constraint chk_app_user_global_roles_role in migration 0072, without
// introducing any runtime database query for the global App-Rollen set.
func TestPhase147AppGlobalRolesSourceContract(t *testing.T) {
	body, err := os.ReadFile(phase136MigrationPath(t, phase147AppGlobalRolesMigrationFile))
	require.NoError(t, err)

	matches := phase147CheckRoleInPattern.FindAllStringSubmatch(string(body), -1)
	require.Len(t, matches, 1, "expected exactly one chk_app_user_global_roles_role CHECK constraint in %s", phase147AppGlobalRolesMigrationFile)

	var extractedValues []string
	for _, raw := range strings.Split(matches[0][1], ",") {
		value := strings.Trim(strings.TrimSpace(raw), "'")
		extractedValues = append(extractedValues, value)
	}

	require.NotEmpty(t, extractedValues, "sanity floor: CHECK constraint must list at least one value")
	require.ElementsMatch(t, extractedValues, models.AppGlobalRoles,
		"models.AppGlobalRoles and the DB CHECK constraint have drifted apart")
}
