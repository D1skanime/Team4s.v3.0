package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/require"
)

func findPublicBadge(badges []models.PublicMemberBadge, badgeCode string) *models.PublicMemberBadge {
	for i := range badges {
		if badges[i].BadgeCode == badgeCode {
			return &badges[i]
		}
	}
	return nil
}

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

func TestLoadRoleVolumeBadgesPostgresProgressBoundaries(t *testing.T) {
	tests := []struct {
		count         int
		badgeCode     string
		currentTier   string
		nextThreshold int64
		remaining     int64
		nextTier      string
	}{
		{count: 0},
		{count: 1, badgeCode: "role_entry_translator", currentTier: "entry", nextThreshold: 12, remaining: 11, nextTier: "bronze"},
		{count: 11, badgeCode: "role_entry_translator", currentTier: "entry", nextThreshold: 12, remaining: 1, nextTier: "bronze"},
		{count: 12, badgeCode: "role_volume_translator_bronze", currentTier: "bronze", nextThreshold: 108, remaining: 96, nextTier: "silver"},
		{count: 107, badgeCode: "role_volume_translator_bronze", currentTier: "bronze", nextThreshold: 108, remaining: 1, nextTier: "silver"},
		{count: 108, badgeCode: "role_volume_translator_silver", currentTier: "silver", nextThreshold: 320, remaining: 212, nextTier: "gold"},
		{count: 319, badgeCode: "role_volume_translator_silver", currentTier: "silver", nextThreshold: 320, remaining: 1, nextTier: "gold"},
		{count: 320, badgeCode: "role_volume_translator_gold", currentTier: "gold", nextThreshold: 510, remaining: 190, nextTier: "platinum"},
		{count: 509, badgeCode: "role_volume_translator_gold", currentTier: "gold", nextThreshold: 510, remaining: 1, nextTier: "platinum"},
		{count: 510, badgeCode: "role_volume_translator_platinum", currentTier: "platinum", nextThreshold: 510, remaining: 0},
	}

	for _, tc := range tests {
		t.Run(fmt.Sprintf("count_%d", tc.count), func(t *testing.T) {
			pool := openMemberProfileBadgeLifecyclePostgres(t)
			ledger := NewPointLedgerRepository(pool)
			repo := NewMemberProfileRepository(pool, "")
			for generation := 1; generation <= tc.count; generation++ {
				// chk_release_role_credit_lifecycle_shape mandates a non-null
				// award_entry_id for 'awarded' rows -- pre-existing bug fixed in
				// passing (Phase 150 Task 1, Rule 1): this loop previously passed nil,
				// which real Postgres has always rejected (this fixture had never
				// actually been run against a real DSN).
				award, err := ledger.InsertAward(context.Background(), postgresAwardInput(fmt.Sprintf("award:role-volume-boundary-%d-g%d", tc.count, generation)))
				require.NoError(t, err)
				insertRoleEntryLifecycleRow(t, pool, 1, "translator", generation, "awarded", &award.ID, nil)
			}

			badges, err := repo.loadRoleVolumeBadges(context.Background(), 1)
			require.NoError(t, err)
			if tc.count == 0 {
				require.Empty(t, badges)
				return
			}

			badge := findPublicBadge(badges, tc.badgeCode)
			require.NotNil(t, badge)
			require.NotNil(t, badge.CurrentCount)
			require.Equal(t, int64(tc.count), *badge.CurrentCount)
			require.NotNil(t, badge.CurrentTier)
			require.Equal(t, tc.currentTier, *badge.CurrentTier)
			require.NotNil(t, badge.NextThreshold)
			require.Equal(t, tc.nextThreshold, *badge.NextThreshold)
			require.NotNil(t, badge.RemainingCount)
			require.Equal(t, tc.remaining, *badge.RemainingCount)
			if tc.nextTier == "" {
				require.Nil(t, badge.NextTier)
			} else {
				require.NotNil(t, badge.NextTier)
				require.Equal(t, tc.nextTier, *badge.NextTier)
			}
		})
	}
}

func TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	// chk_release_role_credit_lifecycle_shape mandates a non-null award_entry_id for
	// 'awarded' rows (and a non-null reversal_entry_id for 'reversed' rows) -- pre-
	// existing bug fixed in passing (Phase 150 Task 1, Rule 1): this test previously
	// passed nil award/reversal entries, which real Postgres has always rejected
	// (this fixture had never actually been run against a real DSN).
	type awardedLifecycle struct {
		lifecycleID int64
		awardID     int64
	}
	var translatorEntries []awardedLifecycle
	for generation := 1; generation <= 12; generation++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInput(fmt.Sprintf("award:role-volume-independent-translator-g%d", generation)))
		require.NoError(t, err)
		lifecycleID := insertRoleEntryLifecycleRow(t, pool, 1, "translator", generation, "awarded", &award.ID, nil)
		translatorEntries = append(translatorEntries, awardedLifecycle{lifecycleID: lifecycleID, awardID: award.ID})
	}
	for generation := 1; generation <= 108; generation++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInput(fmt.Sprintf("award:role-volume-independent-timer-g%d", generation)))
		require.NoError(t, err)
		insertRoleEntryLifecycleRow(t, pool, 1, "timer", generation, "awarded", &award.ID, nil)
	}

	badges, err := repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	translator := findPublicBadge(badges, "role_volume_translator_bronze")
	timer := findPublicBadge(badges, "role_volume_timer_silver")
	require.NotNil(t, translator)
	require.NotNil(t, timer)
	require.Equal(t, int64(12), *translator.CurrentCount)
	require.Equal(t, int64(108), *timer.CurrentCount)

	firstReversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{
		OriginalEntryID: translatorEntries[0].awardID,
		ActorAppUserID:  10,
		IdempotencyKey:  "reverse:role-volume-independent-translator-g1",
		EffectiveAt:     time.Date(2026, 7, 28, 12, 0, 0, 0, time.UTC),
		Reason:          "Testkorrektur",
	})
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		UPDATE release_role_credit_lifecycles
		SET lifecycle_status = 'reversed', reversal_entry_id = $1
		WHERE id = $2
	`, firstReversal.ID, translatorEntries[0].lifecycleID)
	require.NoError(t, err)

	badges, err = repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	require.Nil(t, findPublicBadge(badges, "role_volume_translator_bronze"))
	translator = findPublicBadge(badges, "role_entry_translator")
	require.NotNil(t, translator)
	require.Equal(t, int64(11), *translator.CurrentCount)
	require.Equal(t, "entry", *translator.CurrentTier)
	require.Equal(t, int64(108), *findPublicBadge(badges, "role_volume_timer_silver").CurrentCount)

	for i, entry := range translatorEntries[1:] {
		reversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{
			OriginalEntryID: entry.awardID,
			ActorAppUserID:  10,
			IdempotencyKey:  fmt.Sprintf("reverse:role-volume-independent-translator-g%d", i+2),
			EffectiveAt:     time.Date(2026, 7, 28, 12, 0, 0, 0, time.UTC),
			Reason:          "Testkorrektur",
		})
		require.NoError(t, err)
		_, err = pool.Exec(context.Background(), `
			UPDATE release_role_credit_lifecycles
			SET lifecycle_status = 'reversed', reversal_entry_id = $1
			WHERE id = $2
		`, reversal.ID, entry.lifecycleID)
		require.NoError(t, err)
	}

	badges, err = repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	require.Nil(t, findPublicBadge(badges, "role_entry_translator"))
	require.NotNil(t, findPublicBadge(badges, "role_volume_timer_silver"))
}

func TestRoleVolumeProgressBadgeBoundaryMetadata(t *testing.T) {
	tests := []struct {
		count int64
		tier  string
	}{
		{1, "entry"}, {11, "entry"}, {12, "bronze"}, {107, "bronze"},
		{108, "silver"}, {319, "silver"}, {320, "gold"}, {509, "gold"},
		{510, "platinum"},
	}
	for _, tc := range tests {
		badge := roleVolumeProgressBadge("translator", tc.count)
		require.NotNil(t, badge)
		require.Equal(t, tc.count, *badge.CurrentCount)
		require.Equal(t, tc.tier, *badge.CurrentTier)
	}
	require.Nil(t, roleVolumeProgressBadge("translator", 0))
}

func TestRoleVolumeProgressBadgeGeneratesKaraokeFXCodesGenerically(t *testing.T) {
	entry := roleVolumeProgressBadge("karaoke_fx", 1)
	require.NotNil(t, entry)
	require.Equal(t, "role_entry_karaoke_fx", entry.BadgeCode)
	require.Equal(t, "role_entry", entry.BadgeCategory)

	bronze := roleVolumeProgressBadge("karaoke_fx", 12)
	require.NotNil(t, bronze)
	require.Equal(t, "role_volume_karaoke_fx_bronze", bronze.BadgeCode)
	require.Equal(t, "role_volume", bronze.BadgeCategory)
	require.Equal(t, int64(12), *bronze.CurrentCount)
}
