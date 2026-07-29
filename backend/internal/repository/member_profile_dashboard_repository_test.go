package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Plan 116-02, Task 2: Postgres-backed Regressionstests fuer GetOwnDashboard
// (D-03/D-04). Reuses die Phase-113-Fixture (openContributionBadgesPostgres, die
// bereits die Release->Episode->Anime-Kette, member_claims/app_users-Autor-Seam,
// release_version_notes/anime_fansub_project_notes/fansub_group_notes und
// release_version_media mitbringt) und ergaenzt zusaetzlich anime_contributions +
// hist_fansub_group_members fuer die D-03-Kennzahl "Projekte (Anzahl)" (Pitfall 6).

// openOwnDashboardPostgres erweitert openContributionBadgesPostgres um die minimalen
// Tabellen, die GetOwnDashboard zusaetzlich zu den bereits vorhandenen Rohzahl-
// Bausteinen braucht: anime_contributions (Projekte-Kennzahl) und
// hist_fansub_group_members (Autor-Seam fuer die anime_contributions-COALESCE).
func openOwnDashboardPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openContributionBadgesPostgres(t)

	_, err := pool.Exec(context.Background(), `
CREATE TABLE hist_fansub_group_members (
	id BIGINT PRIMARY KEY,
	member_id BIGINT NOT NULL
);
CREATE TABLE anime_contributions (
	id BIGSERIAL PRIMARY KEY,
	anime_id BIGINT NOT NULL,
	fansub_group_id BIGINT NOT NULL,
	fansub_group_member_id BIGINT NULL,
	member_id BIGINT NULL,
	status TEXT NOT NULL DEFAULT 'draft'
);
`)
	require.NoError(t, err)

	return pool
}

func TestGetOwnDashboardPostgresZeroStateForMemberWithoutActivity(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, data.HasMemberProfile)
	require.Equal(t, int64(0), data.TotalPoints)
	require.Equal(t, 0, data.BadgesCount)
	require.Equal(t, int64(0), data.ProjectsCount)
	require.Equal(t, int64(0), data.ImagesCount)
	require.Equal(t, int64(0), data.ContributionsCount)
	require.Empty(t, data.RoleVolume)
	require.Len(t, data.CategoryProgress, 3)

	expectedNextThresholds := map[string]int64{
		"contribution_projects":  1,
		"contribution_chronicle": 10,
		"contribution_archivist": 10,
	}
	for _, row := range data.CategoryProgress {
		require.Equal(t, "", row.CurrentTier, "family %s ohne Aktivitaet darf keine Stufe haben", row.Family)
		require.Equal(t, int64(0), row.CurrentCount)
		require.NotNil(t, row.NextThreshold)
		require.Equal(t, expectedNextThresholds[row.Family], *row.NextThreshold)
	}
}

func TestGetOwnDashboardPostgresPointMilestoneIncrementsBadgesCount(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	awardInput := postgresAwardInputForMember(1, "award:dashboard-point-milestone")
	awardInput.RulePointValue = 50
	_, err := ledger.InsertAward(context.Background(), awardInput)
	require.NoError(t, err)

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(50), data.TotalPoints)
	require.Equal(t, 1, data.BadgesCount, "total_points >= 1 muss genau +1 fuer den Punkt-Meilenstein beitragen")
}

func TestGetOwnDashboardPostgresRoleVolumeRawEntriesVersusBadgesCount(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	// Rolle "encode": 20 awarded Credits -> erreicht Bronze (12+).
	for i := 1; i <= 20; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:dashboard-rv-encode-"+string(rune('a'+i))))
		require.NoError(t, err)
		insertContribLifecycleRow(t, pool, 30, 20, 1, "encode", i, "awarded", &award.ID, nil)
	}
	// Rolle "typeset": 5 awarded Credits -> erreicht keine Stufe (< 12).
	for i := 1; i <= 5; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:dashboard-rv-typeset-"+string(rune('a'+i))))
		require.NoError(t, err)
		insertContribLifecycleRow(t, pool, 30, 20, 1, "typeset", 100+i, "awarded", &award.ID, nil)
	}

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Len(t, data.RoleVolume, 2, "beide Rollen muessen als Rohzahl-Eintrag erscheinen, unabhaengig von der Stufe")

	var encodeCount, typesetCount int64
	for _, entry := range data.RoleVolume {
		switch entry.RoleCode {
		case "encode":
			encodeCount = entry.Count
		case "typeset":
			typesetCount = entry.Count
		}
	}
	require.Equal(t, int64(20), encodeCount)
	require.Equal(t, int64(5), typesetCount)

	// distinct-role-entry (+2, beide Rollen haben mind. 1 awarded Credit) + role-volume-bronze (+1, nur encode) = 3
	require.Equal(t, 3, data.BadgesCount,
		"BadgesCount muss fuer role_entry beide Rollen zaehlen, aber fuer role_volume nur die Bronze-Stufe (encode)")
}

// TestGetOwnDashboardPostgresProjectsCountDivergesFromFamilyOneRawCount ist der
// verbindliche Pitfall-6-Beweis: die D-03-Kennzahl "Projekte (Anzahl)"
// (loadOwnDashboardProjectsCount) MUSS von der Familie-1-Rohzahl
// (loadContribProjectsCount, "vollstaendig mitgetragene Projekte") abweichen koennen,
// wenn ein Member mehr bestaetigte Projekt-Beteiligungen hat als voll
// ledger-abgedeckte Projekte.
func TestGetOwnDashboardPostgresProjectsCountDivergesFromFamilyOneRawCount(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	// Familie 1 (Vollabdeckung): Member 1 deckt release_version 30 (anime 100 / group 20) voll ab.
	awardV30, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:dashboard-pitfall6-v30"))
	require.NoError(t, err)
	insertContribLifecycleRow(t, pool, 30, 20, 1, "encode", 1, "awarded", &awardV30.ID, nil)

	// anime_contributions (D-03 Kennzahl): Member 1 hat zusaetzlich eine bestaetigte
	// Beteiligung an einem ZWEITEN, ledger-unabhaengigen Projekt (anime 200 / group 20).
	_, err = pool.Exec(context.Background(), `
		INSERT INTO anime_contributions (anime_id, fansub_group_id, member_id, status)
		VALUES (100, 20, 1, 'confirmed'), (200, 20, 1, 'confirmed')
	`)
	require.NoError(t, err)

	familyOneRawCount, err := repo.loadContribProjectsCount(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(1), familyOneRawCount, "Familie 1 sieht nur das voll ledger-abgedeckte Projekt (anime 100)")

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(2), data.ProjectsCount,
		"Projekte (Anzahl) zaehlt beide bestaetigten anime_contributions-Projekte, nicht nur die ledger-voll-abgedeckten")
	require.NotEqual(t, familyOneRawCount, data.ProjectsCount,
		"Pitfall 6: ProjectsCount und die Familie-1-Rohzahl duerfen nicht versehentlich aliasiert sein")
}

func TestGetOwnDashboardPostgresImagesAndContributionsCountsUsePitfall2Sources(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	_, err := pool.Exec(context.Background(), `INSERT INTO app_users (id, legacy_user_id) VALUES (11, 555)`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO member_claims (member_id, app_user_id, claim_status) VALUES (1, 11, 'verified')
	`)
	require.NoError(t, err)

	for i := 0; i < 3; i++ {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO release_version_media (release_version_id, uploaded_by_user_id, deleted_at)
			VALUES (30, 555, NULL)
		`)
		require.NoError(t, err)
	}
	for i := 0; i < 4; i++ {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO release_version_notes (release_version_id, member_id, status, deleted_at)
			VALUES (30, 1, 'published', NULL)
		`)
		require.NoError(t, err)
	}

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(3), data.ImagesCount, "hochgeladene Bilder = archivistCount (Familie 3), nicht previous_contributions_count")
	require.Equal(t, int64(4), data.ContributionsCount, "geschriebene Beitraege = chronicleCount (Familie 2), nicht previous_contributions_count (Pitfall 2)")
}
