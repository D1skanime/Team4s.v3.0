package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Phase 110 (Plan 02, Wave 1, RED): Postgres-backed Tests fuer total_points-Korrektheit
// (D-02) und den kompletten awarded -> sichtbar -> reversed -> unsichtbar Lebenszyklus
// der live-berechneten role_entry_* Badges (D-03). Diese Datei referenziert die noch
// nicht existierende (*MemberProfileRepository).loadTotalPoints-Hilfsmethode -- go build
// bzw. go vet auf dieses Paket schlaegt an dieser Stelle bewusst mit
// "undefined: loadTotalPoints" fehl (RED). Task 2 implementiert loadTotalPoints und
// erweitert loadPublicBadges, damit diese Tests kompilieren und gruen werden (GREEN).

// openMemberProfileBadgeLifecyclePostgres baut auf openMemberPointTotalsPostgres auf
// (0131 + 0139 + members-ALTER fuer nickname/display_name/profile_visibility) und
// ergaenzt die minimalen Stand-in-Tabellen, die Migration 0137 fuer ihre Composite-FKs
// benoetigt (release_version_groups, anime_fansub_groups), sowie eine minimale
// member_badges-Tabelle (Form aus Migration 0087), damit loadPublicBadges' bestehende
// erste Abfrage nicht an einer fehlenden Tabelle scheitert. Anschliessend wird Migration
// 0137 selbst angewendet.
func openMemberProfileBadgeLifecyclePostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openMemberPointTotalsPostgres(t)

	_, err := pool.Exec(context.Background(), `
CREATE TABLE release_version_groups (
	release_version_id BIGINT NOT NULL,
	fansub_group_id BIGINT NOT NULL,
	PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE anime_fansub_groups (
	anime_id BIGINT NOT NULL,
	fansub_group_id BIGINT NOT NULL,
	PRIMARY KEY (anime_id, fansub_group_id)
);
INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (30, 20);
CREATE TABLE member_badges (
	id BIGSERIAL PRIMARY KEY,
	member_id BIGINT NOT NULL,
	badge_code TEXT NOT NULL,
	badge_category TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	visibility TEXT NOT NULL DEFAULT 'public',
	awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`)
	require.NoError(t, err)

	_, file, _, _ := runtime.Caller(0)
	testsupport.ApplySQLFile(t, pool, filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0137_phase108_contribution_sources.up.sql"))

	return pool
}

// insertRoleEntryLifecycleRow legt eine release_role_credit_lifecycles-Zeile gegen die
// bereits geseedete (release_version_id=30, fansub_group_id=20)-Kombination an.
func insertRoleEntryLifecycleRow(
	t *testing.T,
	pool *pgxpool.Pool,
	memberID int64,
	roleCode string,
	generation int,
	lifecycleStatus string,
	awardEntryID *int64,
	reversalEntryID *int64,
) int64 {
	t.Helper()
	var id int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO release_role_credit_lifecycles
			(release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status, award_entry_id, reversal_entry_id)
		VALUES (30, 20, $1, $2, $3, $4, $5, $6)
		RETURNING id
	`, memberID, roleCode, generation, lifecycleStatus, awardEntryID, reversalEntryID).Scan(&id)
	require.NoError(t, err)
	return id
}

func containsPublicBadge(badges []models.PublicMemberBadge, badgeCode string, badgeCategory string) bool {
	for _, b := range badges {
		if b.BadgeCode == badgeCode && b.BadgeCategory == badgeCategory {
			return true
		}
	}
	return false
}

func TestGetPublicMemberProfilePostgresIncludesTotalPoints(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	_, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:total-points-member1"))
	require.NoError(t, err)

	total, err := repo.loadTotalPoints(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(10), total, "member 1 hat genau einen 10-Punkte-Award erhalten")

	zeroTotal, err := repo.loadTotalPoints(context.Background(), 999)
	require.NoError(t, err)
	require.Equal(t, int64(0), zeroTotal, "ein Member ohne Ledger-Zeilen liefert 0, nie einen Fehler oder NULL")
}

func TestLoadPublicBadgesPostgresRoleEntryAwardedVisible(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	award, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:role-entry-translator-visible"))
	require.NoError(t, err)
	insertRoleEntryLifecycleRow(t, pool, 1, "translator", 1, "awarded", &award.ID, nil)

	badges, err := repo.loadPublicBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badges, "role_entry_translator", "role_entry"),
		"eine awarded lifecycle-Zeile muss die live-berechnete role_entry_translator Badge produzieren")
}

func TestLoadPublicBadgesPostgresRoleEntryReversedHidden(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	award, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:role-entry-translator-reversed"))
	require.NoError(t, err)
	lifecycleID := insertRoleEntryLifecycleRow(t, pool, 1, "translator", 1, "awarded", &award.ID, nil)

	badgesBeforeReversal, err := repo.loadPublicBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badgesBeforeReversal, "role_entry_translator", "role_entry"))

	reversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{
		OriginalEntryID: award.ID,
		ActorAppUserID:  10,
		IdempotencyKey:  "reverse:role-entry-translator-reversed",
		EffectiveAt:     time.Date(2026, 7, 27, 12, 0, 0, 0, time.UTC),
		Reason:          "Testkorrektur",
	})
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
		UPDATE release_role_credit_lifecycles
		SET lifecycle_status = 'reversed', reversal_entry_id = $1
		WHERE id = $2
	`, reversal.ID, lifecycleID)
	require.NoError(t, err)

	badgesAfterReversal, err := repo.loadPublicBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterReversal, "role_entry_translator", "role_entry"),
		"eine reversed lifecycle-Zeile muss die Badge sofort beim naechsten Read verschwinden lassen (D-03 Live-Projektion)")
}

func TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	insertRoleEntryLifecycleRow(t, pool, 1, "fansub_lead", 1, "pending", nil, nil)

	badges, err := repo.loadPublicBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badges, "role_entry_fansub_lead", "role_entry"),
		"eine Rolle, die nie 'awarded' erreicht, darf nie eine role_entry Badge produzieren, ohne Go-seitige Sonderbehandlung")
}

// TestLoadPublicBadgesPostgresRoleVolume beweist den award -> sichtbar -> reversed ->
// unsichtbar Lebenszyklus (D-02/GAM-04 Live-Projektion) fuer Typ-3-Rollen-Volumen-Badges.
// Seedet 12 awarded Credits einer Rolle ueber distinkte generation-Werte (UNIQUE-Constraint
// auf release_version_id, fansub_group_id, member_id, role_code, generation), storniert
// danach eine Buchung und erwartet, dass das Bronze-Badge beim naechsten Read verschwindet.
// Gold/Platin werden bewusst NICHT hier bewiesen (Pitfall 2 / VALIDATION Manual-Only) --
// dafuer ist TestHighestRoleVolumeTier zustaendig.
func TestLoadPublicBadgesPostgresRoleVolume(t *testing.T) {
	pool := openMemberProfileBadgeLifecyclePostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	var awardIDs []int64
	var lifecycleIDs []int64
	for i := 1; i <= 12; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInput(fmt.Sprintf("award:role-volume-translator-%d", i)))
		require.NoError(t, err)
		lifecycleID := insertRoleEntryLifecycleRow(t, pool, 1, "translator", i, "awarded", &award.ID, nil)
		awardIDs = append(awardIDs, award.ID)
		lifecycleIDs = append(lifecycleIDs, lifecycleID)
	}

	badgesAfterTwelve, err := repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badgesAfterTwelve, "role_volume_translator_bronze", "role_volume"),
		"12 awarded Credits in einer Rolle muessen role_volume_translator_bronze produzieren")

	reversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{
		OriginalEntryID: awardIDs[0],
		ActorAppUserID:  10,
		IdempotencyKey:  "reverse:role-volume-translator-1",
		EffectiveAt:     time.Date(2026, 7, 27, 12, 0, 0, 0, time.UTC),
		Reason:          "Testkorrektur",
	})
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `
		UPDATE release_role_credit_lifecycles
		SET lifecycle_status = 'reversed', reversal_entry_id = $1
		WHERE id = $2
	`, reversal.ID, lifecycleIDs[0])
	require.NoError(t, err)

	badgesAfterReversal, err := repo.loadRoleVolumeBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterReversal, "role_volume_translator_bronze", "role_volume"),
		"eine Netto-Zahl von 11 nach Storno darf role_volume_translator_bronze nicht mehr enthalten (frisch je Read, kein Cache)")
}

// TestHighestRoleVolumeTier deckt alle Grenzwerte der D-04-Schwellenlogik (Bronze 12 /
// Silber 108 / Gold 320 / Platin 510) direkt ab, unabhaengig von Postgres/Seed-Daten
// (VALIDATION 112-BE-01, Pitfall 2: Gold/Platin sind in Wegwerf-Testdaten ohne gezieltes
// Seeding nicht natuerlich erreichbar).
func TestHighestRoleVolumeTier(t *testing.T) {
	require.Equal(t, "", highestRoleVolumeTier(0))
	require.Equal(t, "", highestRoleVolumeTier(11))
	require.Equal(t, "bronze", highestRoleVolumeTier(12))
	require.Equal(t, "bronze", highestRoleVolumeTier(107))
	require.Equal(t, "silver", highestRoleVolumeTier(108))
	require.Equal(t, "silver", highestRoleVolumeTier(319))
	require.Equal(t, "gold", highestRoleVolumeTier(320))
	require.Equal(t, "gold", highestRoleVolumeTier(509))
	require.Equal(t, "platinum", highestRoleVolumeTier(510))
}

func TestPublicMemberProfileBadgeProgressProjectionCoversProjectAndMembershipBoundaries(t *testing.T) {
	projectCounts := []int64{0, 1, 9, 10, 24, 25, 49, 50}
	membershipYears := []int64{5, 7, 10}
	for _, count := range projectCounts {
		payload, err := json.Marshal(models.PublicMemberProfile{MemberID: count + 1})
		require.NoError(t, err)
		var document map[string]any
		require.NoError(t, json.Unmarshal(payload, &document))
		progress, ok := document["badge_progress"].([]any)
		require.True(t, ok, "project count %d must be carried by additive badge_progress", count)
		require.NotNil(t, progress)
	}
	for _, years := range membershipYears {
		payload, err := json.Marshal(models.PublicMemberProfile{MemberID: years + 100})
		require.NoError(t, err)
		require.Contains(t, string(payload), `"badge_progress"`, "membership boundary %d years must remain server-derived", years)
	}
}
