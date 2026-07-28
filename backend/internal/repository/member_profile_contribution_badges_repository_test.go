package repository

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// TestHighestContribProjectsTier deckt die Grenzwerte der Familie-1-Schwellenlogik
// (Bronze 1 / Silber 5 / Gold 15, D-02) DB-frei ab.
func TestHighestContribProjectsTier(t *testing.T) {
	require.Equal(t, "", highestContribProjectsTier(0))
	require.Equal(t, "bronze", highestContribProjectsTier(1))
	require.Equal(t, "bronze", highestContribProjectsTier(4))
	require.Equal(t, "silver", highestContribProjectsTier(5))
	require.Equal(t, "silver", highestContribProjectsTier(14))
	require.Equal(t, "gold", highestContribProjectsTier(15))
}

// TestHighestContribChronicleTier deckt die Grenzwerte der Familie-2-Schwellenlogik
// (Bronze 10 / Silber 50 / Gold 150, D-03) DB-frei ab.
func TestHighestContribChronicleTier(t *testing.T) {
	require.Equal(t, "", highestContribChronicleTier(9))
	require.Equal(t, "bronze", highestContribChronicleTier(10))
	require.Equal(t, "bronze", highestContribChronicleTier(49))
	require.Equal(t, "silver", highestContribChronicleTier(50))
	require.Equal(t, "silver", highestContribChronicleTier(149))
	require.Equal(t, "gold", highestContribChronicleTier(150))
}

// TestHighestContribArchivistTier deckt die Grenzwerte der Familie-3-Schwellenlogik
// (Bronze 10 / Silber 50 / Gold 150, D-04) DB-frei ab.
func TestHighestContribArchivistTier(t *testing.T) {
	require.Equal(t, "", highestContribArchivistTier(9))
	require.Equal(t, "bronze", highestContribArchivistTier(10))
	require.Equal(t, "bronze", highestContribArchivistTier(49))
	require.Equal(t, "silver", highestContribArchivistTier(50))
	require.Equal(t, "silver", highestContribArchivistTier(149))
	require.Equal(t, "gold", highestContribArchivistTier(150))
}

// openContributionBadgesPostgres erweitert die Phase-112-Badge-Lifecycle-Fixture
// (openMemberProfileBadgeLifecyclePostgres) um die zusaetzlichen Tabellen/Spalten, die
// loadContributionBadges fuer alle drei Familien braucht: die Release->Episode->Anime-
// Kette fuer Familie 1, member_claims + app_users.legacy_user_id fuer den Autor-Seam
// (Familie 2 optional-additiv, Familie 3 Pflicht), sowie die drei Notiz-Tabellen und
// release_version_media. Members 1 und 2 sowie fansub_group 20/release_version 30 sind
// bereits aus der Basis-Fixture vorhanden; ein zweites release_version 31 in derselben
// Gruppe wird fuer die Familie-1-Luecken-/Vollabdeckungs-Szenarien ergaenzt.
func openContributionBadgesPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openMemberProfileBadgeLifecyclePostgres(t)

	_, err := pool.Exec(context.Background(), `
ALTER TABLE release_versions ADD COLUMN release_id BIGINT;
ALTER TABLE app_users ADD COLUMN legacy_user_id BIGINT;

INSERT INTO members (id) VALUES (2);

CREATE TABLE fansub_releases (
	id BIGINT PRIMARY KEY,
	episode_id BIGINT NOT NULL
);
CREATE TABLE episodes (
	id BIGINT PRIMARY KEY,
	anime_id BIGINT NOT NULL
);
CREATE TABLE member_claims (
	id BIGSERIAL PRIMARY KEY,
	member_id BIGINT NOT NULL,
	app_user_id BIGINT NOT NULL,
	claim_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE release_version_notes (
	id BIGSERIAL PRIMARY KEY,
	release_version_id BIGINT NOT NULL,
	member_id BIGINT NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE anime_fansub_project_notes (
	id BIGSERIAL PRIMARY KEY,
	created_by_user_id BIGINT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE fansub_group_notes (
	id BIGSERIAL PRIMARY KEY,
	created_by_user_id BIGINT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE release_version_media (
	id BIGSERIAL PRIMARY KEY,
	release_version_id BIGINT NOT NULL,
	uploaded_by_user_id BIGINT NULL,
	deleted_at TIMESTAMPTZ NULL
);

INSERT INTO episodes (id, anime_id) VALUES (1, 100), (2, 100);
INSERT INTO fansub_releases (id, episode_id) VALUES (1, 1), (2, 2);
UPDATE release_versions SET release_id = 1 WHERE id = 30;
INSERT INTO release_versions (id, release_id) VALUES (31, 2);
INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (31, 20);
`)
	require.NoError(t, err)

	return pool
}

// insertContribLifecycleRow ist die Familie-1-Variante von insertRoleEntryLifecycleRow,
// aber mit frei waehlbarem release_version_id/fansub_group_id (die Basis-Helper-Funktion
// haelt (30, 20) fest, Familie-1-Coverage-Tests brauchen jedoch mehrere Release-Versionen).
func insertContribLifecycleRow(
	t *testing.T,
	pool *pgxpool.Pool,
	releaseVersionID int64,
	fansubGroupID int64,
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
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, releaseVersionID, fansubGroupID, memberID, roleCode, generation, lifecycleStatus, awardEntryID, reversalEntryID).Scan(&id)
	require.NoError(t, err)
	return id
}

// TestLoadContributionBadgesPostgres beweist GAM-04 + D-01...D-04 gegen eine echte
// PostgreSQL-Fixture (SKIP statt FAIL ohne TEAM4S_PHASE106_TEST_DSN, s.
// openMemberProfileBadgeLifecyclePostgres -> ... -> testsupport.OpenPhase106Postgres).
// Familie 1 (Coverage): eine Luecke (release_version 31 nicht abgedeckt) verhindert das
// Badge; volle Abdeckung beider ledger-erfassten Release-Versionen produziert es; Storno
// nimmt es beim naechsten Read sofort wieder weg (Live-Projektion). Familie 2 (Chronist):
// published+aktive release_version_notes zaehlen, ein Soft-Delete senkt die Netto-Zahl
// unter die Bronze-Schwelle. Familie 3 (Bildarchivar): jede nicht geloeschte
// release_version_media-Zeile zaehlt (TOTAL), ein Soft-Delete senkt die Netto-Zahl.
// Abschliessend: kein Aufruf hat eine member_badges-Zeile erzeugt (GAM-04).
func TestLoadContributionBadgesPostgres(t *testing.T) {
	pool := openContributionBadgesPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	repo := NewMemberProfileRepository(pool, "")

	var memberBadgeRowsBefore int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM member_badges`).Scan(&memberBadgeRowsBefore))

	// --- Familie 1 (D-02): Luecke verhindert das Badge ---
	awardM2V31, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(2, "award:contrib-fam1-member2-v31"))
	require.NoError(t, err)
	insertContribLifecycleRow(t, pool, 31, 20, 2, "encode", 1, "awarded", &awardM2V31.ID, nil)

	awardM1V30, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:contrib-fam1-member1-v30"))
	require.NoError(t, err)
	insertContribLifecycleRow(t, pool, 30, 20, 1, "encode", 1, "awarded", &awardM1V30.ID, nil)

	badgesWithGap, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesWithGap, "contribution_projects_bronze", "contribution"),
		"Member 1 deckt release_version 31 (ledger-erfasst durch Member 2s Credit) nicht ab -- Projekt zaehlt nicht (D-02 Luecke)")

	// --- Familie 1: Vollabdeckung produziert das Badge ---
	awardM1V31, err := ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:contrib-fam1-member1-v31"))
	require.NoError(t, err)
	fam1LifecycleID := insertContribLifecycleRow(t, pool, 31, 20, 1, "typeset", 1, "awarded", &awardM1V31.ID, nil)

	badgesFullyCovered, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badgesFullyCovered, "contribution_projects_bronze", "contribution"),
		"Member 1 deckt jetzt beide ledger-erfassten Release-Versionen (30, 31) ab -- Projekt zaehlt (D-02)")

	// --- Familie 1 (D-01): Storno stuft sofort zurueck ---
	reversal, err := ledger.InsertReversal(context.Background(), PointReversalInput{
		OriginalEntryID: awardM1V31.ID,
		ActorAppUserID:  10,
		IdempotencyKey:  "reverse:contrib-fam1-member1-v31",
		EffectiveAt:     time.Date(2026, 7, 28, 12, 0, 0, 0, time.UTC),
		Reason:          "Testkorrektur",
	})
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		UPDATE release_role_credit_lifecycles SET lifecycle_status = 'reversed', reversal_entry_id = $1 WHERE id = $2
	`, reversal.ID, fam1LifecycleID)
	require.NoError(t, err)

	badgesAfterReversal, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterReversal, "contribution_projects_bronze", "contribution"),
		"ein Storno auf release_version 31 darf die Vollabdeckung sofort beim naechsten Read wieder aufheben (D-01)")

	// --- Familie 2 (D-03): published+aktiv zaehlt, Soft-Delete senkt unter die Schwelle ---
	var chronicleNoteIDs []int64
	for i := 0; i < 10; i++ {
		var noteID int64
		require.NoError(t, pool.QueryRow(context.Background(), `
			INSERT INTO release_version_notes (release_version_id, member_id, status, deleted_at)
			VALUES (30, 1, 'published', NULL) RETURNING id
		`).Scan(&noteID))
		chronicleNoteIDs = append(chronicleNoteIDs, noteID)
	}
	_, err = pool.Exec(context.Background(), `
		INSERT INTO release_version_notes (release_version_id, member_id, status, deleted_at)
		VALUES (30, 1, 'draft', NULL)
	`)
	require.NoError(t, err)

	badgesWithTenNotes, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badgesWithTenNotes, "contribution_chronicle_bronze", "contribution"),
		"10 veroeffentlichte, nicht geloeschte release_version_notes muessen contribution_chronicle_bronze produzieren (D-03)")

	_, err = pool.Exec(context.Background(), `UPDATE release_version_notes SET deleted_at = NOW() WHERE id = $1`, chronicleNoteIDs[0])
	require.NoError(t, err)

	badgesAfterNoteSoftDelete, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterNoteSoftDelete, "contribution_chronicle_bronze", "contribution"),
		"ein Soft-Delete auf eine veroeffentlichte Notiz muss die Netto-Zahl sofort unter die Bronze-Schwelle senken (D-01/D-03)")

	// --- Familie 3 (D-04): TOTAL Bilder ueber den Autor-Seam, review/visibility egal ---
	_, err = pool.Exec(context.Background(), `
		INSERT INTO app_users (id, legacy_user_id) VALUES (11, 555)
	`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO member_claims (member_id, app_user_id, claim_status) VALUES (1, 11, 'verified')
	`)
	require.NoError(t, err)

	var archivistMediaIDs []int64
	for i := 0; i < 10; i++ {
		var mediaID int64
		require.NoError(t, pool.QueryRow(context.Background(), `
			INSERT INTO release_version_media (release_version_id, uploaded_by_user_id, deleted_at)
			VALUES (30, 555, NULL) RETURNING id
		`).Scan(&mediaID))
		archivistMediaIDs = append(archivistMediaIDs, mediaID)
	}

	badgesWithTenMedia, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.True(t, containsPublicBadge(badgesWithTenMedia, "contribution_archivist_bronze", "contribution"),
		"10 nicht geloeschte release_version_media-Zeilen ueber den Autor-Seam muessen contribution_archivist_bronze produzieren (D-04)")

	_, err = pool.Exec(context.Background(), `UPDATE release_version_media SET deleted_at = NOW() WHERE id = $1`, archivistMediaIDs[0])
	require.NoError(t, err)

	badgesAfterMediaSoftDelete, err := repo.loadContributionBadges(context.Background(), 1)
	require.NoError(t, err)
	require.False(t, containsPublicBadge(badgesAfterMediaSoftDelete, "contribution_archivist_bronze", "contribution"),
		"ein Soft-Delete auf ein Bild muss die TOTAL-Zaehlung sofort unter die Bronze-Schwelle senken (D-04)")

	// --- GAM-04: keiner der obigen Reads hat eine member_badges-Zeile erzeugt ---
	var memberBadgeRowsAfter int
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM member_badges`).Scan(&memberBadgeRowsAfter))
	require.Equal(t, memberBadgeRowsBefore, memberBadgeRowsAfter,
		"loadContributionBadges darf niemals eine member_badges-Zeile persistieren (GAM-04, read-time-only)")
}
