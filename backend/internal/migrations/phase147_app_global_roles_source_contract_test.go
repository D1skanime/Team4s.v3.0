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

// phase147CheckRoleInPattern captures the parenthesized value list of the
// CHECK (role IN (...)) constraint that fences app_user_global_roles.role.
var phase147CheckRoleInPattern = regexp.MustCompile(`CHECK \(role IN \(([^)]+)\)\)`)

// TestPhase147AppGlobalRolesSourceContract proves models.AppGlobalRoles (Phase 147 / HC-03)
// matches the DB CHECK constraint chk_app_user_global_roles_role in migration 0072, without
// introducing any runtime database query for the global App-Rollen set.
func TestPhase147AppGlobalRolesSourceContract(t *testing.T) {
	body, err := os.ReadFile(phase136MigrationPath(t, phase147AppGlobalRolesMigrationFile))
	require.NoError(t, err)

	matches := phase147CheckRoleInPattern.FindStringSubmatch(string(body))
	require.Len(t, matches, 2, "expected exactly one CHECK (role IN (...)) constraint in %s", phase147AppGlobalRolesMigrationFile)

	var extractedValues []string
	for _, raw := range strings.Split(matches[1], ",") {
		value := strings.Trim(strings.TrimSpace(raw), "'")
		extractedValues = append(extractedValues, value)
	}

	require.Len(t, extractedValues, 3, "sanity floor: CHECK constraint must list exactly three values")
	require.ElementsMatch(t, extractedValues, models.AppGlobalRoles)
}
