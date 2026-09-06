package repository

import (
	"context"
	"fmt"
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

	// Fünf Einzel-Awards zu je 10 Punkten (der einzige in der Fixture geseedete
	// point_rules-Datensatz, id 101, point_value 10) statt eines einzelnen
	// Awards mit ueberschriebenem RulePointValue=50 -- die Snapshot-Validierung
	// aus Migration 0131 (validate_point_ledger_insert) verlangt seit jeher
	// point_value = point_rules.point_value fuer den referenzierten rule_id, ein
	// einzelner Award mit abweichendem RulePointValue schlaegt fehl (pre-existing
	// Bug, unabhaengig von Plan 150-02 -- fixiert, weil diese Datei in diesem
	// Task's Scope liegt und ihr eigener Verify-Schritt diesen Test gruen
	// erwartet).
	for i := 0; i < 5; i++ {
		award := postgresAwardInputForMember(1, "award:dashboard-point-milestone-"+string(rune('a'+i)))
		_, err := ledger.InsertAward(context.Background(), award)
		require.NoError(t, err)
	}

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

	// distinct-role-entry (+2, beide Rollen haben mind. 1 awarded Credit) + role-volume-bronze
	// (+1, nur encode) + Punkt-Meilenstein (+1, jeder der 25 ledger.InsertAward-Aufrufe erzeugt
	// real 10 Punkte -> total_points=250 >= 1) + contribution_projects-bronze (+1, dieselben
	// release_role_credit_lifecycles-Zeilen decken release_version 30 -- die einzige
	// ledger-erfasste Version fuer anime 100/Gruppe 20 in dieser Fixture -- vollstaendig ab,
	// D-02 "vollstaendig mitgetragene Projekte") = 5. Korrigiert von der urspruenglich falschen
	// Erwartung 3 (pre-existing Bug in dieser Testdatei, unabhaengig von Plan 150-02s
	// Schwellen-Herkunftswechsel -- die Nebenwirkungen der wiederverwendeten
	// release_version=30/fansub_group=20-Fixture-Daten auf total_points und Familie 1 wurden im
	// urspruenglichen Kommentar schlicht nicht mitgerechnet).
	require.Equal(t, 5, data.BadgesCount,
		"BadgesCount muss role_entry (2), role_volume-Bronze (1), Punkt-Meilenstein (1) und contribution_projects-Bronze (1) zaehlen")
}

// TestGetOwnDashboardPostgresRoleVolumeEntryCarriesRegistryTierAndThreshold beweist
// Plan 150-02 Task 2 (D-07 + die Revision fuer CurrentThreshold): eine Rollen-Volumen-
// Zeile traegt jetzt Tier/aktuelle Schwelle/naechste Schwelle/Rest aus
// badges.RoleVolume, nicht mehr nur role_code+count. count=13 (oberhalb Bronze=12)
// liefert CurrentTier "bronze" mit CurrentThreshold 12 und NextThreshold 108 (Silber);
// count=5 (unterhalb Bronze) liefert CurrentTier "" mit CurrentThreshold nil.
func TestGetOwnDashboardPostgresRoleVolumeEntryCarriesRegistryTierAndThreshold(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	for i := 1; i <= 13; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:dashboard-rv-threshold-translator-"+string(rune('a'+i))))
		require.NoError(t, err)
		insertContribLifecycleRow(t, pool, 30, 20, 1, "translator", i, "awarded", &award.ID, nil)
	}
	for i := 1; i <= 5; i++ {
		award, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:dashboard-rv-threshold-typeset-"+string(rune('a'+i))))
		require.NoError(t, err)
		insertContribLifecycleRow(t, pool, 30, 20, 1, "typeset", 100+i, "awarded", &award.ID, nil)
	}

	data, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)

	var translator, typeset *OwnDashboardRoleVolumeEntry
	for i := range data.RoleVolume {
		switch data.RoleVolume[i].RoleCode {
		case "translator":
			translator = &data.RoleVolume[i]
		case "typeset":
			typeset = &data.RoleVolume[i]
		}
	}
	require.NotNil(t, translator)
	require.NotNil(t, typeset)

	require.Equal(t, int64(13), translator.Count)
	require.Equal(t, "bronze", translator.CurrentTier)
	require.NotNil(t, translator.CurrentThreshold)
	require.Equal(t, int64(12), *translator.CurrentThreshold)
	require.NotNil(t, translator.NextThreshold)
	require.Equal(t, int64(108), *translator.NextThreshold)
	require.NotNil(t, translator.RemainingCount)
	require.Equal(t, int64(95), *translator.RemainingCount)
	require.NotNil(t, translator.NextTier)
	require.Equal(t, "silver", *translator.NextTier)

	require.Equal(t, int64(5), typeset.Count)
	require.Equal(t, "", typeset.CurrentTier, "unterhalb Bronze (12) darf keine Stufe stehen")
	require.Nil(t, typeset.CurrentThreshold, "CurrentThreshold muss nil sein, solange CurrentTier leer ist")
	require.NotNil(t, typeset.NextThreshold)
	require.Equal(t, int64(12), *typeset.NextThreshold)
}

// TestGetOwnDashboardPostgresPointsProgressUsesRegistry beweist Plan 150-02 Task 2
// (D-08): PointsProgress ist eine serverautoritative Fortschrittszeile aus
// badges.Points, nicht mehr eine dem Frontend ueberlassene Ableitung aus
// total_points. Bei total_points=0 zeigt sie auf die erste Stufe
// (point_milestone_first, Schwelle 1); ab total_points=2500 ist die hoechste Stufe
// (point_milestone_legend) erreicht und NextThreshold wird nil.
func TestGetOwnDashboardPostgresPointsProgressUsesRegistry(t *testing.T) {
	pool := openOwnDashboardPostgres(t)
	repo := NewMemberProfileRepository(pool, "")

	zeroState, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, "points", zeroState.PointsProgress.Family)
	require.Equal(t, "", zeroState.PointsProgress.CurrentTier)
	require.Equal(t, int64(0), zeroState.PointsProgress.CurrentCount)
	require.NotNil(t, zeroState.PointsProgress.NextThreshold)
	require.Equal(t, int64(1), *zeroState.PointsProgress.NextThreshold)
	require.NotNil(t, zeroState.PointsProgress.RemainingCount)
	require.Equal(t, int64(1), *zeroState.PointsProgress.RemainingCount)
	require.NotNil(t, zeroState.PointsProgress.NextTier)
	require.Equal(t, "point_milestone_first", *zeroState.PointsProgress.NextTier)

	ledger := NewPointLedgerRepository(pool)
	for i := 0; i < 250; i++ {
		award := postgresAwardInputForMember(1, "award:dashboard-points-legend-"+fmt.Sprintf("%d", i))
		_, err := ledger.InsertAward(context.Background(), award)
		require.NoError(t, err)
	}

	legendState, err := repo.GetOwnDashboard(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, int64(2500), legendState.TotalPoints)
	require.Equal(t, "point_milestone_legend", legendState.PointsProgress.CurrentTier)
	require.Nil(t, legendState.PointsProgress.NextThreshold, "hoechste Punkte-Stufe erreicht -- kein naechster Schwellenwert mehr")
	require.Nil(t, legendState.PointsProgress.NextTier)
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
