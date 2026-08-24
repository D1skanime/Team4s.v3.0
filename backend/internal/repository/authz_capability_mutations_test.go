package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCountGroupRoleHolders prüft, dass CountGroupRoleHolders eine korrekte
// GROUP-BY-Zählung über fansub_group_member_roles liefert (D-Rail, 260824-ike Defekt 2):
// zwei co_leader-Zeilen (verschiedene Mitgliedschaften) und eine fansub_lead-Zeile ergeben
// {"co_leader": 2, "fansub_lead": 1}; eine Rolle ohne jede Zeile (raw_provider) fehlt im
// Ergebnis-Map (kein Zero-Value-Eintrag, analog zu CountGlobalRoleAssignments).
func TestCountGroupRoleHolders(t *testing.T) {
	pool := openPhase137RoleHoldersPool(t)
	ctx := context.Background()
	repo := NewAuthzRepository(pool)

	seedPhase138RoleHolderMembership(
		t, pool,
		701, 801, 901,
		"co-leader-a@example.test", "Co Leader A", "Ike Subs", "active", "co_leader",
	)
	seedPhase138RoleHolderMembership(
		t, pool,
		702, 801, 902,
		"co-leader-b@example.test", "Co Leader B", "Ike Subs", "active", "co_leader",
	)
	seedPhase138RoleHolderMembership(
		t, pool,
		703, 801, 903,
		"lead@example.test", "Fansub Lead", "Ike Subs", "active", "fansub_lead",
	)

	counts, err := repo.CountGroupRoleHolders(ctx)
	require.NoError(t, err)

	assert.Equal(t, 2, counts["co_leader"])
	assert.Equal(t, 1, counts["fansub_lead"])

	_, hasRawProvider := counts["raw_provider"]
	assert.False(t, hasRawProvider, "raw_provider hat keine Zeile in fansub_group_member_roles und darf nicht im Ergebnis-Map auftauchen")
}
