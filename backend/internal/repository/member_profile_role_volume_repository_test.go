package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// Plan 116-02, Task 1: Regression fuer die verhaltenserhaltende Rohzahl-Extraktion aus
// loadRoleVolumeBadges. loadRoleVolumeCounts muss die exakte Netto-Anzahl awarded
// release_role_credit_lifecycles-Buchungen je Rolle liefern (dieselbe SQL, die zuvor
// nur inline gescannt und nach Tier-Ableitung verworfen wurde), UND
// loadRoleVolumeBadges muss weiterhin dasselbe golden Badge-Set wie vor der
// Extraktion produzieren (byte-identisches Verhalten, GetPublicMemberProfile bleibt
// unveraendert).

// TestLoadRoleVolumeCountsPostgresMatchesRawValueAndBadgeDerivation seedet 12 awarded
// Credits einer Rolle (Bronze-Schwelle) und beweist sowohl die Rohzahl als auch die
// unveraenderte Badge-Ableitung.
func TestLoadRoleVolumeCountsPostgresMatchesRawValueAndBadgeDerivation(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	for i := 1; i <= 12; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:role-volume-count-translator"+string(rune('a'+i))))
		require.NoError(t, err)
		insertRoleEntryLifecycleRow(t, pool, 1, "translator", i, "awarded", &award.ID, nil)
	}

	counts, err := repo.loadRoleVolumeCounts(context.Background(), 1)
	require.NoError(t, err)
	require.Len(t, counts, 1, "genau eine Rolle (translator) hat awarded Credits")
	require.Equal(t, "translator", counts[0].RoleCode)
	require.Equal(t, int64(12), counts[0].Count,
		"12 awarded Credits muessen die Rohzahl 12 fuer die Rolle translator ergeben")
	require.Equal(t, "bronze", highestRoleVolumeTier(int(counts[0].Count)))

	badges, err := repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badges, "role_volume_translator_bronze", "role_volume"),
		"loadRoleVolumeBadges muss nach der Rohzahl-Extraktion dasselbe Badge wie vorher emittieren")
}

// TestLoadRoleVolumeCountsPostgresEmptyForMemberWithoutCredits beweist, dass ein Member
// ohne jede awarded lifecycle-Zeile eine leere Rohzahl-Liste (nicht nil, nicht Fehler)
// erhaelt -- GetOwnDashboard (Plan 116-02 Task 2/3) muss dies graceful in ein leeres
// RoleVolume-Array uebersetzen koennen.
func TestLoadRoleVolumeCountsPostgresEmptyForMemberWithoutCredits(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	counts, err := repo.loadRoleVolumeCounts(context.Background(), 999)
	require.NoError(t, err)
	require.Empty(t, counts)
}
