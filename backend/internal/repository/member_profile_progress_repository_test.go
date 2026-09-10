package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/badges"
	"team4s.v3/backend/internal/models"
)

// Phase 129 (Plan 02, Wave 1, RED): server-autoritativer Badge-Fortschritt darf nur aus
// OEFFENTLICHEN Fakten berechnet werden (PMDA-06, PMPR-06). loadBadgeProgress zaehlt fuer
// die "progress"-Familie COUNT(DISTINCT ac.anime_id) WHERE status='confirmed' OHNE
// is_public_on_member_profile-Filter -- eine bestaetigte, aber nicht-oeffentliche
// Contribution blaeht den Fortschritt faelschlich auf.

// TestPhase129BadgeProgressExcludesPrivateConfirmedContributions deckt PMDA-06 ab: ein
// Member mit einer confirmed+public und einer confirmed+private Contribution (distinkte
// Anime) muss im "progress"-Fortschritt genau 1 zaehlen. Der aktuelle Code zaehlt 2
// (beide confirmed, Sichtbarkeit ignoriert) -> ROT. Nach dem Fix (is_public_on_member_
// profile=true ergaenzen) zaehlt er 1.
func TestPhase129BadgeProgressExcludesPrivateConfirmedContributions(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO members (id, nickname, public_slug) VALUES (1295001, 'phase129-progress', 'phase129-progress');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES (1295201, 'phase129-progress-grp', 'Phase129 Progress Group', 'active');
		INSERT INTO anime (id, title) VALUES (1295301, 'Phase129 Progress Public'), (1295302, 'Phase129 Progress Private');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year)
		VALUES (1295401, 1295201, 1295301, 1295001, 'confirmed', true, 2020);
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year)
		VALUES (1295402, 1295201, 1295302, 1295001, 'confirmed', false, 2021);
	`)

	roleVolumeCounts, err := repo.loadRoleVolumeCounts(context.Background(), 1295001)
	require.NoError(t, err)
	projectsCount, err := repo.loadContribProjectsCount(context.Background(), 1295001)
	require.NoError(t, err)
	chronicleCount, err := repo.loadContribChronicleCount(context.Background(), 1295001)
	require.NoError(t, err)
	archivistCount, err := repo.loadContribArchivistCount(context.Background(), 1295001)
	require.NoError(t, err)
	progress, err := repo.loadBadgeProgress(context.Background(), 1295001, 0, roleVolumeCounts, projectsCount, chronicleCount, archivistCount)
	require.NoError(t, err)

	var found bool
	for _, entry := range progress {
		if entry.Family == "progress" {
			found = true
			require.Equalf(t, int64(1), entry.CurrentCount,
				"PMDA-06: a confirmed-but-private contribution must NOT inflate the public 'progress' badge count; expected 1, got %d", entry.CurrentCount)
		}
	}
	require.True(t, found, "expected a 'progress' badge-progress family entry")
}

// Phase 150 (Plan 03, D-05/D-06/D-24): loadBadgeProgress and buildBadgeProgress read
// their thresholds from the authoritative badges registry, gain a CurrentTier field,
// and every family (including the new role_volume one) now carries an ascending
// Stages ladder. These tests call the real functions directly (buildBadgeProgress is
// DB-free and pure; the role_volume additions require real Postgres via
// loadRoleVolumeCounts) -- never source-substring.

// stagesFromFamily is the test-local mirror of thresholdsFromFamily's output shape,
// used only to build expectation values from the SAME registry the production code
// reads, so these tests never duplicate a threshold literal that could drift from
// backend/internal/badges.
func stagesFromFamily(family badges.Family) []models.BadgeProgressStage {
	stages := make([]models.BadgeProgressStage, 0, len(family.Tiers))
	for _, tier := range family.Tiers {
		stages = append(stages, models.BadgeProgressStage{Code: tier.Code, Threshold: tier.Threshold})
	}
	return stages
}

// TestBuildBadgeProgressPointsCurrentTierAndStagesAtActiveBoundary proves D-05/D-24 for
// the "points" family (full badge codes as tier tokens): at count 50 (the
// point_milestone_active threshold), CurrentTier reports the tier just reached and
// Stages carries the complete, ascending six-entry points ladder.
func TestBuildBadgeProgressPointsCurrentTierAndStagesAtActiveBoundary(t *testing.T) {
	progress := buildBadgeProgress("points", 50, thresholdsFromFamily(badges.Points))

	require.Equal(t, "point_milestone_active", progress.CurrentTier)
	require.Equal(t, stagesFromFamily(badges.Points), progress.Stages)
	require.NotNil(t, progress.NextThreshold)
	require.Equal(t, int64(200), *progress.NextThreshold)
	require.NotNil(t, progress.RemainingCount)
	require.Equal(t, int64(150), *progress.RemainingCount)
	require.NotNil(t, progress.NextTier)
	require.Equal(t, "point_milestone_experienced", *progress.NextTier)
	require.False(t, progress.Complete)
}

// TestBuildBadgeProgressStagesAreIndependentOfCurrentCount proves the second half of
// D-24's explicit requirement: Stages is the STATIC family ladder, not a function of
// the member's own progress -- a below-first-tier member and a terminal (max-tier)
// member must see byte-identical Stages for the same family.
func TestBuildBadgeProgressStagesAreIndependentOfCurrentCount(t *testing.T) {
	thresholds := thresholdsFromFamily(badges.Points)
	belowFirst := buildBadgeProgress("points", 0, thresholds)
	active := buildBadgeProgress("points", 50, thresholds)
	terminal := buildBadgeProgress("points", 2500, thresholds)

	require.Equal(t, belowFirst.Stages, active.Stages)
	require.Equal(t, active.Stages, terminal.Stages)
	require.Equal(t, stagesFromFamily(badges.Points), terminal.Stages)

	require.Equal(t, "", belowFirst.CurrentTier)
	require.Equal(t, "point_milestone_legend", terminal.CurrentTier)
	require.Nil(t, terminal.NextThreshold)
	require.Nil(t, terminal.RemainingCount)
	require.Nil(t, terminal.NextTier)
	require.True(t, terminal.Complete)
}

// TestBuildBadgeProgressContributionProjectsUsesBareTierTokenConvention proves the
// contribution_projects family's CurrentTier/Stages use the SAME bare tier-token
// convention (bronze/silver/gold, not full badge codes) that highestContribProjectsTier
// already uses -- D-24's explicit load-bearing requirement for Plan 150-05.
func TestBuildBadgeProgressContributionProjectsUsesBareTierTokenConvention(t *testing.T) {
	progress := buildBadgeProgress("contribution_projects", 3, thresholdsFromFamily(badges.ContributionProjects))

	require.Equal(t, "bronze", progress.CurrentTier)
	require.Equal(t, []models.BadgeProgressStage{
		{Code: "bronze", Threshold: 1},
		{Code: "silver", Threshold: 5},
		{Code: "gold", Threshold: 15},
	}, progress.Stages)
	require.NotNil(t, progress.NextThreshold)
	require.Equal(t, int64(5), *progress.NextThreshold)
	require.NotNil(t, progress.RemainingCount)
	require.Equal(t, int64(2), *progress.RemainingCount)
	require.NotNil(t, progress.NextTier)
	require.Equal(t, "silver", *progress.NextTier)
}

// TestBuildBadgeProgressZeroMemberStillCarriesFullLockedLadder proves D-24's "locked
// ladder" requirement: a member with zero of a metric gets CurrentTier "", a
// never-negative RemainingCount, and the family's FULL Stages list (not an empty one)
// so a frontend can render every rung, locked.
func TestBuildBadgeProgressZeroMemberStillCarriesFullLockedLadder(t *testing.T) {
	progress := buildBadgeProgress("progress", 0, thresholdsFromFamily(badges.Progress))

	require.Equal(t, "", progress.CurrentTier)
	require.Equal(t, stagesFromFamily(badges.Progress), progress.Stages)
	require.Len(t, progress.Stages, len(badges.Progress.Tiers))
	require.NotNil(t, progress.RemainingCount)
	require.GreaterOrEqual(t, *progress.RemainingCount, int64(0))
	require.False(t, progress.Complete)
}

// openBadgeProgressPostgres extends openContributionBadgesPostgres (Phase 150-02) with
// the two additional tables loadBadgeProgress's own inline queries touch
// (anime_contributions for the "progress" family, hist_fansub_group_members for
// "membership") -- reusing the established fixture chain rather than building a
// separate one from scratch (per this plan's own operational guidance). Schema-isolated
// per test (openMemberProfileBadgeLifecyclePostgres -> ... -> testsupport.
// OpenPhase128Postgres), so inserting real point_ledger_entries rows here is safe and
// never pollutes a shared database (unlike openPhase129Postgres's dedicated
// non-schema-isolated fixture).
func openBadgeProgressPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openContributionBadgesPostgres(t)

	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime_contributions (
	id BIGSERIAL PRIMARY KEY,
	member_id BIGINT NOT NULL,
	anime_id BIGINT NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	is_public_on_member_profile BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE hist_fansub_group_members (
	id BIGSERIAL PRIMARY KEY,
	member_id BIGINT NOT NULL,
	joined_date DATE NULL,
	left_date DATE NULL
);
`)
	require.NoError(t, err)
	return pool
}

// seedAwardedRoleVolumeCredits inserts `count` awarded release_role_credit_lifecycles
// rows (release_version 30 / fansub_group 20, already seeded by the fixture chain) for
// one role, each backed by a real point_ledger_entries award row --
// chk_release_role_credit_lifecycle_shape mandates a non-null award_entry_id for
// 'awarded' rows (Phase 150 Task 1's own fix applies equally here).
func seedAwardedRoleVolumeCredits(t *testing.T, pool *pgxpool.Pool, memberID int64, roleCode string, count int) {
	t.Helper()
	ledger := NewPointLedgerRepository(pool)
	for generation := 1; generation <= count; generation++ {
		key := fmt.Sprintf("award:badge-progress-role-volume-%s-m%d-g%d", roleCode, memberID, generation)
		award, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(memberID, key))
		require.NoError(t, err)
		insertRoleEntryLifecycleRow(t, pool, memberID, roleCode, generation, "awarded", &award.ID, nil)
	}
}

// TestLoadBadgeProgressPostgresIncludesRoleVolumeEntryPerRoleWithSynthesizedEntryStage
// proves D-06/D-24 end-to-end against real Postgres: a member with two active fansub
// roles gets one role_volume badge_progress entry per role (RoleCode set, current_tier/
// next_threshold/remaining_count/next_tier correct per the registry), and BOTH entries
// carry the IDENTICAL Stages list with the Go-synthesized "entry" stage (threshold 1)
// prefixed onto badges.RoleVolume.Tiers -- the only place in the whole phase this
// literal is written down.
func TestLoadBadgeProgressPostgresIncludesRoleVolumeEntryPerRoleWithSynthesizedEntryStage(t *testing.T) {
	pool := openBadgeProgressPostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	seedAwardedRoleVolumeCredits(t, pool, 1, "translator", 13)
	seedAwardedRoleVolumeCredits(t, pool, 1, "timer", 108)

	roleVolumeCounts, err := repo.loadRoleVolumeCounts(context.Background(), 1)
	require.NoError(t, err)
	projectsCount, err := repo.loadContribProjectsCount(context.Background(), 1)
	require.NoError(t, err)
	chronicleCount, err := repo.loadContribChronicleCount(context.Background(), 1)
	require.NoError(t, err)
	archivistCount, err := repo.loadContribArchivistCount(context.Background(), 1)
	require.NoError(t, err)
	progress, err := repo.loadBadgeProgress(context.Background(), 1, 0, roleVolumeCounts, projectsCount, chronicleCount, archivistCount)
	require.NoError(t, err)

	require.Len(t, progress, 8, "six base families plus one role_volume entry per active role")

	expectedStages := append([]models.BadgeProgressStage{{Code: "entry", Threshold: 1}}, stagesFromFamily(badges.RoleVolume)...)

	var translator, timer *models.PublicMemberBadgeProgress
	roleVolumeCount := 0
	for i := range progress {
		entry := &progress[i]
		if entry.Family != "role_volume" {
			continue
		}
		roleVolumeCount++
		require.NotNil(t, entry.RoleCode)
		switch *entry.RoleCode {
		case "translator":
			translator = entry
		case "timer":
			timer = entry
		}
	}
	require.Equal(t, 2, roleVolumeCount)
	require.NotNil(t, translator)
	require.NotNil(t, timer)

	require.Equal(t, int64(13), translator.CurrentCount)
	require.Equal(t, "bronze", translator.CurrentTier)
	require.NotNil(t, translator.NextThreshold)
	require.Equal(t, int64(108), *translator.NextThreshold)
	require.NotNil(t, translator.RemainingCount)
	require.Equal(t, int64(95), *translator.RemainingCount)
	require.NotNil(t, translator.NextTier)
	require.Equal(t, "silver", *translator.NextTier)
	require.False(t, translator.Complete)
	require.Equal(t, expectedStages, translator.Stages)

	require.Equal(t, int64(108), timer.CurrentCount)
	require.Equal(t, "silver", timer.CurrentTier)
	require.NotNil(t, timer.NextThreshold)
	require.Equal(t, int64(320), *timer.NextThreshold)
	require.NotNil(t, timer.RemainingCount)
	require.Equal(t, int64(212), *timer.RemainingCount)
	require.NotNil(t, timer.NextTier)
	require.Equal(t, "gold", *timer.NextTier)
	require.False(t, timer.Complete)
	require.Equal(t, expectedStages, timer.Stages, "both role_volume entries share the IDENTICAL Stages list")

	// The six pre-existing families must also still be present, each with the new
	// CurrentTier/Stages fields populated. Every family is zero-activity EXCEPT
	// contribution_projects: seeding awarded release_role_credit_lifecycles rows on
	// release_version 30/fansub_group 20 above is, by design, also loadContribProjectsCount's
	// own data source -- it inherently makes that release version's project "covered"
	// by member 1, the same genuine cross-family side effect Plan 150-02's SUMMARY
	// documented for its own shared-fixture reuse.
	expectedCurrentTier := map[string]string{
		"progress":               "",
		"points":                 "",
		"contribution_projects":  "bronze",
		"contribution_chronicle": "",
		"contribution_archivist": "",
		"membership":             "",
	}
	families := map[string]bool{}
	for _, entry := range progress {
		if entry.Family == "role_volume" {
			continue
		}
		families[entry.Family] = true
		require.Equalf(t, expectedCurrentTier[entry.Family], entry.CurrentTier,
			"%s CurrentTier mismatch", entry.Family)
		require.NotEmpty(t, entry.Stages, "%s must still carry its full locked-ladder Stages list", entry.Family)
	}
	require.Equal(t, map[string]bool{
		"progress": true, "points": true, "contribution_projects": true,
		"contribution_chronicle": true, "contribution_archivist": true, "membership": true,
	}, families)
}

// TestLoadBadgeProgressPostgresZeroAwardedRolesProducesNoRoleVolumeEntries proves the
// negative case: a member who exists but has never had an awarded
// release_role_credit_lifecycles row gets ZERO role_volume entries -- not one with
// CurrentCount 0 -- mirroring loadRoleVolumeCounts's own "only rows with awarded
// credits" behavior (member 2, seeded by the fixture chain, has no lifecycle rows).
func TestLoadBadgeProgressPostgresZeroAwardedRolesProducesNoRoleVolumeEntries(t *testing.T) {
	pool := openBadgeProgressPostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	roleVolumeCounts, err := repo.loadRoleVolumeCounts(context.Background(), 2)
	require.NoError(t, err)
	projectsCount, err := repo.loadContribProjectsCount(context.Background(), 2)
	require.NoError(t, err)
	chronicleCount, err := repo.loadContribChronicleCount(context.Background(), 2)
	require.NoError(t, err)
	archivistCount, err := repo.loadContribArchivistCount(context.Background(), 2)
	require.NoError(t, err)
	progress, err := repo.loadBadgeProgress(context.Background(), 2, 0, roleVolumeCounts, projectsCount, chronicleCount, archivistCount)
	require.NoError(t, err)

	require.Len(t, progress, 6, "no active roles means no role_volume entries, only the six base families")
	for _, entry := range progress {
		require.NotEqual(t, "role_volume", entry.Family)
	}
}
