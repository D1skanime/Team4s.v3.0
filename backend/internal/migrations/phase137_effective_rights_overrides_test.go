package migrations_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// Phase 137 makes the Phase-136 override schema usable: migration 0150 adds a
// dedicated, non-overridable override-management capability and flips exactly
// ten approved group/review actions to user_overridable = true. Migration 0146
// itself must never be edited by this or any later migration.
const (
	phase137UpFile   = "0150_effective_rights_overrides.up.sql"
	phase137DownFile = "0150_effective_rights_overrides.down.sql"

	phase137ManagementAction = "user_group_capability_override.manage"
)

var phase137OverridableActions = []string{
	"fansub_group_media.upload",
	"fansub_group_media.update",
	"fansub_group_media.reorder",
	"fansub_group_page.general_edit",
	"fansub_group_page.technical_links_edit",
	"fansub_group_page.founding_history_edit",
	"fansub_group_links.update",
	"review.text.decide",
	"review.image.decide",
	"review.contribution.decide",
}

var phase137ExplicitlyProtectedActions = []string{
	"fansub_group.members.manage",
	"fansub_group.invitations.create",
	"fansub_group.invitations.cancel",
}

func TestPhase137MigrationSourceContract(t *testing.T) {
	up := readPhase136Migration(t, phase137UpFile)
	requirePhase136SQLContains(t, up,
		"user_group_capability_override.manage",
		"fansub_group_media.upload",
		"fansub_group_media.update",
		"fansub_group_media.reorder",
		"fansub_group_page.general_edit",
		"fansub_group_page.technical_links_edit",
		"fansub_group_page.founding_history_edit",
		"fansub_group_links.update",
		"review.text.decide",
		"review.image.decide",
		"review.contribution.decide",
		"user_overridable = true",
		"insert into role_capabilities",
		"'fansub_lead', 'user_group_capability_override.manage'",
	)
	require.NotContains(t, up, "'founder', 'user_group_capability_override.manage'",
		"founder must not be seeded onto the management capability by role name")
	require.NotContains(t, up, "'co_leader', 'user_group_capability_override.manage'",
		"co_leader must not be seeded onto the management capability by role name")

	down := readPhase136Migration(t, phase137DownFile)
	requirePhase136SQLContains(t, down,
		"delete from role_capabilities",
		"user_group_capability_override.manage",
		"user_overridable = false",
		"delete from action_definitions",
	)
}

func TestPhase137MigrationLiveUpDownUp(t *testing.T) {
	if _, err := os.Stat(phase136MigrationPath(t, phase137UpFile)); err != nil {
		t.Fatalf("Phase-137 migration is required: %v", err)
	}
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137Prerequisites(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, "0146_capability_policy_catalog.up.sql"))

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137UpFile))
	assertPhase137Catalog(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137DownFile))
	assertPhase137RolledBack(t, pool)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137UpFile))
	assertPhase137Catalog(t, pool)
}

func TestPhase137ManagementCapabilityNonOverridable(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137Prerequisites(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, "0146_capability_policy_catalog.up.sql"))
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137UpFile))

	_, err := pool.Exec(context.Background(), `
		UPDATE action_definitions SET user_overridable = true
		WHERE code = $1
	`, phase137ManagementAction)
	require.Error(t, err, "the override-management capability must remain structurally non-overridable")
}

func TestPhase137ProtectedCapabilityClassesRemainFalse(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137Prerequisites(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, "0146_capability_policy_catalog.up.sql"))
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137UpFile))

	for _, code := range phase137ExplicitlyProtectedActions {
		var overridable bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT user_overridable FROM action_definitions WHERE code = $1
		`, code).Scan(&overridable))
		require.False(t, overridable, "explicitly protected action %s must remain fail-closed", code)
	}

	// Representative role/security/delegation/audit classes: the 0146 CHECK
	// constraint must still reject a flip attempt after 0150 is applied.
	for _, code := range []string{
		"role_hierarchy.assign",
		"security_incident.review",
		"delegation.grant",
		"audit_log.export",
	} {
		_, err := pool.Exec(context.Background(), `
			UPDATE action_definitions SET user_overridable = true WHERE code = $1
		`, code)
		require.Error(t, err, "protected capability class for %s must remain rejected by the catalog CHECK constraint", code)
	}

	// Representative platform/admin classes: not touched by the ten-action
	// pilot set, so they simply remain at their default false state.
	for _, code := range []string{
		"platform_settings.manage",
		"content_admin.moderate",
	} {
		var overridable bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT user_overridable FROM action_definitions WHERE code = $1
		`, code).Scan(&overridable))
		require.False(t, overridable, "representative platform/admin capability %s must remain false", code)
	}
}

func TestPhase137ManagementCapabilitySeededOnlyToFansubLead(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase137Prerequisites(t, pool)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, "0146_capability_policy_catalog.up.sql"))
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase137UpFile))

	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities
		WHERE action_code = $1
	`, phase137ManagementAction).Scan(&count))
	require.Equal(t, 1, count, "exactly one role must be seeded onto the management capability")

	var roleCode string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT role_code FROM role_capabilities WHERE action_code = $1
	`, phase137ManagementAction).Scan(&roleCode))
	require.Equal(t, "fansub_lead", roleCode)

	for _, role := range []string{"founder", "co_leader"} {
		var exists bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT EXISTS (
				SELECT 1 FROM role_capabilities
				WHERE role_code = $1 AND action_code = $2
			)
		`, role, phase137ManagementAction).Scan(&exists))
		require.False(t, exists, "%s must not be promoted onto the management capability merely by role name", role)
	}
}

func createPhase137Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE role_definitions (
			code TEXT PRIMARY KEY,
			label_de TEXT NOT NULL,
			contexts TEXT[] NOT NULL DEFAULT '{}',
			sort_order INT NOT NULL DEFAULT 0,
			assignable BOOLEAN NOT NULL DEFAULT false
		);
		CREATE TABLE action_definitions (
			code TEXT PRIMARY KEY,
			label_de TEXT NOT NULL,
			category TEXT,
			sort_order INT NOT NULL DEFAULT 0
		);
		CREATE TABLE role_capabilities (
			role_code TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
			action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
			PRIMARY KEY (role_code, action_code)
		);
		INSERT INTO role_definitions(code, label_de, contexts, assignable) VALUES
			('fansub_lead', 'Fansub-Leitung', ARRAY['fansub_group'], true),
			('founder', 'Gründer', ARRAY['fansub_group'], true),
			('co_leader', 'Co-Leitung', ARRAY['fansub_group'], true),
			('gfxler', 'GFX', ARRAY['fansub_group'], true),
			('techadmin', 'Technik-Admin', ARRAY['fansub_group'], true);
		INSERT INTO action_definitions(code, label_de, category, sort_order) VALUES
			('fansub_group.members.manage', 'Mitglieder verwalten', 'gruppe', 40),
			('fansub_group.invitations.create', 'Einladungen erstellen', 'gruppe', 60),
			('fansub_group.invitations.cancel', 'Einladungen abbrechen', 'gruppe', 70),
			('review.text.decide', 'Texte prüfen', 'review', 90),
			('review.image.decide', 'Bilder prüfen', 'review', 91),
			('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92),
			('role_hierarchy.assign', 'Rollenhierarchie zuweisen', 'sicherheit', 100),
			('security_incident.review', 'Sicherheitsvorfälle prüfen', 'sicherheit', 101),
			('delegation.grant', 'Delegationen erteilen', 'sicherheit', 102),
			('audit_log.export', 'Audit-Protokoll exportieren', 'sicherheit', 103),
			('platform_settings.manage', 'Plattformeinstellungen verwalten', 'plattform', 104),
			('content_admin.moderate', 'Inhalte administrieren', 'plattform', 105);
	`)
	require.NoError(t, err)
}

func assertPhase137Catalog(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var overridableCount int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM action_definitions WHERE user_overridable = true
	`).Scan(&overridableCount))
	require.Equal(t, len(phase137OverridableActions), overridableCount,
		"exactly the approved pilot set may be overridable, nothing else")

	for _, code := range phase137OverridableActions {
		var overridable bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT user_overridable FROM action_definitions WHERE code = $1
		`, code).Scan(&overridable))
		require.True(t, overridable, "approved action %s must be overridable", code)
	}

	var managementOverridable bool
	var managementLabel, managementCategory, managementDescription, managementHelp *string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT user_overridable, label_de, category, description_de, help_text_de
		FROM action_definitions WHERE code = $1
	`, phase137ManagementAction).Scan(&managementOverridable, &managementLabel, &managementCategory, &managementDescription, &managementHelp))
	require.False(t, managementOverridable, "override-management capability must remain non-overridable")
	require.NotNil(t, managementLabel)
	require.NotEmpty(t, *managementLabel)
	require.NotNil(t, managementCategory)
	require.NotEmpty(t, *managementCategory)
	require.NotNil(t, managementDescription)
	require.NotEmpty(t, *managementDescription)
	require.NotNil(t, managementHelp)
	require.NotEmpty(t, *managementHelp)
}

func assertPhase137RolledBack(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	var exists bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (SELECT 1 FROM action_definitions WHERE code = $1)
	`, phase137ManagementAction).Scan(&exists))
	require.False(t, exists, "override-management capability must be removed by the down migration")

	for _, code := range phase137OverridableActions {
		var overridable bool
		require.NoError(t, pool.QueryRow(context.Background(), `
			SELECT user_overridable FROM action_definitions WHERE code = $1
		`, code).Scan(&overridable))
		require.False(t, overridable, "approved action %s must be restored to false by the down migration", code)
	}

	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT 1 FROM role_capabilities WHERE action_code = $1
		)
	`, phase137ManagementAction).Scan(&exists))
	require.False(t, exists, "the fansub_lead management-capability mapping must be removed by the down migration")
}
