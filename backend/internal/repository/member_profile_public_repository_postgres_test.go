package repository

import (
	"context"
	"encoding/json"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Phase 129 (Plan 02, Wave 1, RED): PostgreSQL-Contracts fuer die KORREKTE oeffentliche
// Member-Projektion (RESEARCH 129 Section 1 Defektkarte, Requirements PMDA-01..11 /
// PMPR-06). Diese Tests seeden ihre eigenen Fixture-Zeilen und behaupten das SOLL-
// Verhalten JEDES Defekts -- sie sind gegen den aktuellen Code bewusst ROT und werden
// zum gruenen Gate fuer die Fix-Plaene 129-03/04/05/07.
//
// Muster: Phase-128-Pattern (dedizierte Test-DSN, skip-if-unset). Neue Env-Variable
// TEAM4S_PHASE129_TEST_DSN. Anders als die schema-isolierte Phase-128-Fixture zeigt
// die Phase-129-DSN auf eine dedizierte Wegwerf-Datenbank (`team4s_phase129_test`), die
// das VOLLE reale Schema traegt (pg_dump --schema-only von team4s_v2). Grund: die
// oeffentliche Projektion (GetPublicMemberProfileByID + Loader) beruehrt Dutzende
// Tabellen; nur das vollstaendige Schema laesst die realen Repository-Queries
// unveraendert laufen. Der DB-Namens-Guard (phase129DatabasePattern) verhindert
// fail-closed, dass ein Test je gegen team4s_v2 (Live-Dev-DB) laeuft. Jeder Test
// leert zuerst alle beruehrten Tabellen (resetPhase129Fixtures), seedet dann frische
// Hoch-ID-Zeilen und pollutet damit weder die Live-Referenzprofile noch andere Tests.

const phase129DSNEnv = "TEAM4S_PHASE129_TEST_DSN"

// phase129DatabasePattern erzwingt fail-closed, dass die DSN auf eine dedizierte
// team4s_phase129_test-Datenbank zeigt -- niemals team4s_v2.
var phase129DatabasePattern = regexp.MustCompile(`^team4s_phase129_test(?:_[a-z0-9]+)?$`)

// openPhase129Postgres oeffnet die dedizierte Phase-129-Datenbank (skip-if-unset).
func openPhase129Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase129DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-129 public projection integration test", phase129DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase129DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase129DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase129DSNEnv, dbName, phase129DatabasePattern)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase129DSNEnv)
	t.Cleanup(pool.Close)

	var runtimeDB string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)

	resetPhase129Fixtures(t, pool)
	return pool
}

// resetPhase129Fixtures leert alle Tabellen, die die Phase-129-RED-Tests seeden, in
// FK-sicherer Kind->Eltern-Reihenfolge. So sind Tests reihenfolgeunabhaengig und
// wiederholbar; die dedizierte Wegwerf-DB startet ohnehin ohne Live-Daten.
func resetPhase129Fixtures(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		DELETE FROM anime_contribution_roles;
		DELETE FROM anime_contributions;
		DELETE FROM release_version_media;
		DELETE FROM media_files;
		DELETE FROM media_assets;
		DELETE FROM hist_group_member_roles;
		DELETE FROM fansub_group_member_roles;
		DELETE FROM fansub_group_members;
		DELETE FROM hist_fansub_group_members;
		DELETE FROM member_claims;
		DELETE FROM release_versions;
		DELETE FROM fansub_releases;
		DELETE FROM episodes;
		DELETE FROM anime;
		DELETE FROM fansub_groups;
		DELETE FROM members;
		DELETE FROM app_users;
		DELETE FROM users;
		DELETE FROM role_definitions;
		DELETE FROM review_statuses;
		DELETE FROM visibilities;
	`)
	require.NoError(t, err, "reset Phase-129 fixtures")
}

func mustExecPhase129(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), sql)
	require.NoError(t, err, "seed Phase-129 fixture")
}

// TestPhase129PublicProfileExposesYearOnlyActivePeriod deckt PMDA-01 ab: ein Member,
// der NUR active_from_year/active_until_year (ohne vollstaendiges Datum) gesetzt hat,
// muss die Jahres-Aktivperiode im oeffentlichen DTO distinkt sichtbar machen. Der
// aktuelle Code selektiert in GetPublicMemberProfileByID nur to_char(active_from_date,
// ...) und traegt die Jahre nicht ins DTO -- das marshalte JSON enthaelt die Jahre nicht
// (ROT). Nach dem Fix (Jahresfelder im PublicMemberProfile) enthaelt es sie.
func TestPhase129PublicProfileExposesYearOnlyActivePeriod(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO members (id, nickname, public_slug, profile_status, profile_visibility,
			is_currently_active, noindex, active_from_year, active_until_year,
			active_from_date, active_until_date)
		VALUES (1291001, 'phase129-year-only', 'phase129-year-only', 'historical', 'public',
			false, false, 2015, 2019, NULL, NULL);
	`)

	profile, err := repo.GetPublicMemberProfileByID(context.Background(), 1291001)
	require.NoError(t, err)

	payload, err := json.Marshal(profile)
	require.NoError(t, err)
	body := string(payload)

	require.Containsf(t, body, "2015",
		"PMDA-01: year-only active_from_year (2015) must be observable in the public DTO; got %s", body)
	require.Containsf(t, body, "2019",
		"PMDA-01: year-only active_until_year (2019) must be observable in the public DTO; got %s", body)
}

// TestPhase129CurrentProjectsCountMatchesListedRows deckt PMDA-08 ab: ein bestaetigtes,
// oeffentliches Projekt OHNE anime_contribution_roles-Zeile. loadCurrentProjects
// INNER-JOINt acr und liefert daher 0 Zeilen, waehrend countCurrentProjects acr NICHT
// joint und 1 zaehlt -> count > gelistete Zeilen (ROT). Nach dem Angleichen der
// Praedikate muessen beide uebereinstimmen.
func TestPhase129CurrentProjectsCountMatchesListedRows(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO members (id, nickname, public_slug) VALUES (1293001, 'phase129-count', 'phase129-count');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES (1293201, 'phase129-count-grp', 'Phase129 Count Group', 'active');
		INSERT INTO anime (id, title) VALUES (1293301, 'Phase129 Count Anime');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year)
		VALUES (1293401, 1293201, 1293301, 1293001, 'confirmed', true, 2020, NULL);
	`)

	items, err := repo.loadCurrentProjects(context.Background(), 1293001, 6, 0)
	require.NoError(t, err)
	count, err := repo.countCurrentProjects(context.Background(), 1293001)
	require.NoError(t, err)

	require.Equalf(t, len(items), count,
		"PMDA-08: current_projects_count (%d) must equal the number of listed current-project rows (%d)", count, len(items))
}

// TestPhase129CurrentProjectRolesCarryCodeAndLabel deckt PMDA-04 ab: Projekt-Rollen
// muessen als {code,label}-Paare geliefert werden, nicht label-only. Der aktuelle Code
// emittiert ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) -> nur das Label
// ("Uebersetzer"), nie der Code ("translator"). Das marshalte Projekt-JSON enthaelt
// deshalb den Code nicht (ROT). Nach dem Fix (Code+Label serverseitig) enthaelt es ihn.
func TestPhase129CurrentProjectRolesCarryCodeAndLabel(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer');
		INSERT INTO members (id, nickname, public_slug) VALUES (1294001, 'phase129-roles', 'phase129-roles');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES (1294201, 'phase129-roles-grp', 'Phase129 Roles Group', 'active');
		INSERT INTO anime (id, title) VALUES (1294301, 'Phase129 Roles Anime');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year)
		VALUES (1294401, 1294201, 1294301, 1294001, 'confirmed', true, 2021, NULL);
		INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code) VALUES (1294501, 1294401, 'translator');
	`)

	items, err := repo.loadCurrentProjects(context.Background(), 1294001, 6, 0)
	require.NoError(t, err)
	require.Lenf(t, items, 1, "expected exactly one listed current project, got %d", len(items))

	payload, err := json.Marshal(items[0])
	require.NoError(t, err)
	body := string(payload)

	require.Containsf(t, body, "translator",
		"PMDA-04: project role must carry the stable role_code 'translator' (code+label pair), not label-only; got %s", body)
}

// TestPhase129PublicRecentMediaExcludesUnapprovedPrivateMedia deckt PMDA-07 / PMPR-06
// ab: die oeffentliche recent-media-Projektion darf keine privaten/nicht-freigegebenen
// Release-Medien leaken. loadRecentMedia filtert aktuell weder auf visibilities.public
// noch review_statuses.approved -> ein privates, nicht-approved (aber ready) Medien-
// Asset des Members wird faelschlich geliefert (ROT). Nach dem Fix (Sichtbarkeits-/
// Review-Joins bzw. Entfernen des Loaders aus dem public Pfad) ist die Liste leer.
func TestPhase129PublicRecentMediaExcludesUnapprovedPrivateMedia(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	// loadRecentMedia matcht member_claims.app_user_id direkt gegen
	// release_version_media.uploaded_by_user_id (users.id). Deshalb ist der uploader
	// hier = app_users.id = users.id = 1296801 (dieselbe numerische ID in beiden
	// FK-Zielen), damit der Owner-EXISTS-Join greift.
	mustExecPhase129(t, pool, `
		INSERT INTO visibilities (id, name) VALUES (1296011, 'public'), (1296012, 'private');
		INSERT INTO review_statuses (id, code, label_de) VALUES (1296021, 'approved', 'Freigegeben'), (1296022, 'pending', 'Ausstehend');
		INSERT INTO members (id, nickname, public_slug) VALUES (1296001, 'phase129-media', 'phase129-media');
		INSERT INTO users (id, username, email, password_hash) VALUES (1296801, 'phase129-media-user', 'p129media@example.test', 'x');
		INSERT INTO app_users (id, keycloak_subject, email, display_name, legacy_user_id)
		VALUES (1296801, 'phase129-media-kc', 'p129media@example.test', 'Phase129 Media', 1296801);
		INSERT INTO member_claims (member_id, app_user_id, claim_status) VALUES (1296001, 1296801, 'verified');
		INSERT INTO media_assets (id, file_path, mime_type, status, visibility_id, review_status_id)
		VALUES (1296701, 'phase129/private-leak.jpg', 'image/jpeg', 'ready', 1296012, 1296022);
		INSERT INTO media_files (id, media_id, path, status, variant)
		VALUES (1296611, 1296701, 'phase129/private-leak.jpg', 'ready', 'original');
		INSERT INTO anime (id, title) VALUES (1296301, 'Phase129 Media Anime');
		INSERT INTO episodes (id, anime_id, episode_number) VALUES (1296401, 1296301, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES (1296501, 1296401);
		INSERT INTO release_versions (id, release_id) VALUES (1296601, 1296501);
		INSERT INTO release_version_media (id, release_version_id, media_asset_id, category, uploaded_by_user_id)
		VALUES (1296911, 1296601, 1296701, 'screenshot', 1296801);
	`)

	media, err := repo.loadRecentMedia(context.Background(), 1296001)
	require.NoError(t, err)
	require.Emptyf(t, media,
		"PMDA-07/PMPR-06: private, non-approved release media must not leak into the public recent-media projection; got %d row(s)", len(media))
}
