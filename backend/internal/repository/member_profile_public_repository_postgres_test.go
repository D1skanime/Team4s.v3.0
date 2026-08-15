package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
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

// projectKeys extracts the (anime_id, fansub_group_id) identity sequence of a current-
// projects page as human-readable strings, so two page loads can be compared for
// identical ordering and pages can be checked for row overlap.
func projectKeys(items []models.PublicMemberCurrentProject) []string {
	keys := make([]string, len(items))
	for i, it := range items {
		keys[i] = fmt.Sprintf("%d:%d", it.AnimeID, it.FansubGroupID)
	}
	return keys
}

// TestPhase131CurrentProjectsPagingIsStableAndTotalHonest covers D-02 (fully tie-broken
// stable ordering) and D-03 (honest total). It seeds four current-project rows that are
// deliberately tie-prone: identical title AND identical updated_at across two anime, each
// paired with two fansub groups. Without the trailing UNIQUE (a.id DESC, fg.id DESC) tie-
// breaker the domain sort keys (MAX(updated_at), title, fg.name) leave the order of these
// rows undefined, so offset pages could wobble between loads. With it, the total order is
// deterministic: a.id DESC then fg.id DESC. The test loads page 1 and page 2 TWICE and
// asserts (a) identical ordering across repeated loads, (b) no row appears on both pages
// (offset stability), and (c) countCurrentProjects equals the number of visible rows
// summed across every page (honest total from the same filtered/visible set).
func TestPhase131CurrentProjectsPagingIsStableAndTotalHonest(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	// fansub_groups.name carries a UNIQUE constraint, so two grouped rows can only tie on
	// (title, fg.name) when the SAME group is paired with two same-titled anime. We seed
	// two same-titled anime (A=...301 < B=...302), each contributed under the SAME two
	// groups G1/G2, all with identical updated_at. The two rows sharing a group then tie on
	// every domain sort key (updated_at, title, fg.name) and can only be ordered by the
	// trailing UNIQUE tie-breaker a.id DESC. Groups sort by name (G1 'A' < G2 'B'), so the
	// expected deterministic total order (fg.name ASC, then a.id DESC) is:
	//   (302,201), (301,201), (302,202), (301,202).
	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer');
		INSERT INTO members (id, nickname, public_slug) VALUES (1310001, 'phase131-stable', 'phase131-stable');
		INSERT INTO anime (id, title) VALUES
			(1310301, 'ZZ Tie Anime'),
			(1310302, 'ZZ Tie Anime');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES
			(1310201, 'phase131-grp-1', 'ZZ Tie Group A', 'active'),
			(1310202, 'phase131-grp-2', 'ZZ Tie Group B', 'active');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year, updated_at) VALUES
			(1310401, 1310201, 1310301, 1310001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1310402, 1310201, 1310302, 1310001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1310403, 1310202, 1310301, 1310001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1310404, 1310202, 1310302, 1310001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00');
		INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code) VALUES
			(1310501, 1310401, 'translator'),
			(1310502, 1310402, 'translator'),
			(1310503, 1310403, 'translator'),
			(1310504, 1310404, 'translator');
	`)

	const memberID int64 = 1310001
	wantPage1 := []string{"1310302:1310201", "1310301:1310201"}
	wantPage2 := []string{"1310302:1310202", "1310301:1310202"}

	// Load each page twice; ordering must be byte-for-byte identical across loads.
	for attempt := 1; attempt <= 2; attempt++ {
		page1, err := repo.loadCurrentProjects(context.Background(), memberID, 2, 0)
		require.NoErrorf(t, err, "attempt %d load page1", attempt)
		page2, err := repo.loadCurrentProjects(context.Background(), memberID, 2, 2)
		require.NoErrorf(t, err, "attempt %d load page2", attempt)

		require.Equalf(t, wantPage1, projectKeys(page1),
			"D-02: attempt %d page1 order must be deterministic and fully tie-broken", attempt)
		require.Equalf(t, wantPage2, projectKeys(page2),
			"D-02: attempt %d page2 order must be deterministic and fully tie-broken", attempt)

		// Offset stability: no row may appear on both pages.
		seen := map[string]bool{}
		for _, k := range projectKeys(page1) {
			seen[k] = true
		}
		for _, k := range projectKeys(page2) {
			require.Falsef(t, seen[k], "D-02: attempt %d row %s appeared on both page1 and page2 (offset wobble)", attempt, k)
		}
	}

	// D-03 honest total: the count must equal the number of visible rows summed across
	// every page (same filtered/visible set that produced the rows).
	total, err := repo.countCurrentProjects(context.Background(), memberID)
	require.NoError(t, err)
	require.Equalf(t, 4, total, "D-03: total must count exactly the 4 visible current-project rows")

	visible := 0
	for offset := 0; ; offset += 2 {
		page, err := repo.loadCurrentProjects(context.Background(), memberID, 2, offset)
		require.NoError(t, err)
		if len(page) == 0 {
			break
		}
		visible += len(page)
	}
	require.Equalf(t, total, visible,
		"D-03: countCurrentProjects (%d) must equal the number of visible rows across all pages (%d)", total, visible)
}

// TestPhase131PreviousContributionsOrderingIsStable covers D-02 for the previous-
// contributions list: seeds tie-prone rows (identical ended_year AND identical title
// across two anime, each under two groups) and asserts the ordering is identical across
// repeated loads. Without the trailing UNIQUE (a.id DESC, fg.id DESC) tie-breaker the
// domain keys (MAX(ended_year), title, fg.name) leave these rows unordered.
func TestPhase131PreviousContributionsOrderingIsStable(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	// Same tie-forcing shape as the current-projects test (fansub_groups.name is UNIQUE):
	// two same-titled anime, each under the SAME two groups, all ended in 2019. The two
	// rows sharing a group tie on every domain key (ended_year, title, fg.name) and are
	// ordered only by the trailing UNIQUE a.id DESC. Expected order (fg.name ASC 'A'<'B',
	// then a.id DESC): (302,201), (301,201), (302,202), (301,202).
	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer');
		INSERT INTO members (id, nickname, public_slug) VALUES (1311001, 'phase131-prev', 'phase131-prev');
		INSERT INTO anime (id, title) VALUES
			(1311301, 'ZZ Prev Anime'),
			(1311302, 'ZZ Prev Anime');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES
			(1311201, 'phase131-prev-grp-1', 'ZZ Prev Group A', 'active'),
			(1311202, 'phase131-prev-grp-2', 'ZZ Prev Group B', 'active');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year) VALUES
			(1311401, 1311201, 1311301, 1311001, 'confirmed', true, 2018, 2019),
			(1311402, 1311201, 1311302, 1311001, 'confirmed', true, 2018, 2019),
			(1311403, 1311202, 1311301, 1311001, 'confirmed', true, 2018, 2019),
			(1311404, 1311202, 1311302, 1311001, 'confirmed', true, 2018, 2019);
		INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code) VALUES
			(1311501, 1311401, 'translator'),
			(1311502, 1311402, 'translator'),
			(1311503, 1311403, 'translator'),
			(1311504, 1311404, 'translator');
	`)

	const memberID int64 = 1311001
	// Expected deterministic order (fg.name ASC, then a.id DESC).
	want := []string{"1311302:1311201", "1311301:1311201", "1311302:1311202", "1311301:1311202"}

	prevKeys := func(items []models.PublicMemberPreviousContribution) []string {
		keys := make([]string, len(items))
		for i, it := range items {
			keys[i] = fmt.Sprintf("%d:%d", it.AnimeID, it.FansubGroupID)
		}
		return keys
	}

	for attempt := 1; attempt <= 2; attempt++ {
		// Load the full set (limit above the seeded row count) so the ordering assertion
		// sees every tie-prone row; bounding is covered by the dedicated 131-05 tests below.
		items, err := repo.loadPreviousContributions(context.Background(), memberID, 24, 0)
		require.NoErrorf(t, err, "attempt %d load previous contributions", attempt)
		require.Equalf(t, want, prevKeys(items),
			"D-02: attempt %d previous-contributions order must be deterministic and fully tie-broken", attempt)
	}
}

// TestPhase131PreviousContributionsBoundedToInitialPage covers the real gap 131-05 closes:
// loadPreviousContributions was previously UNBOUNDED. It now takes (limit, offset), and the
// initial profile load passes the documented initial page size (previous 6, D-04). A member
// with MORE previous rows than the initial page must return only that first page, and
// PreviousContributionsCount must stay honest against the rows actually shipped (D-03).
func TestPhase131PreviousContributionsBoundedToInitialPage(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const memberID int64 = 1315001
	const totalPrev = 8 // deliberately > the documented initial page size (6)
	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer');
		INSERT INTO members (id, nickname, public_slug) VALUES (1315001, 'phase131-prevbound', 'phase131-prevbound');
	`)
	for i := 0; i < totalPrev; i++ {
		base := int64(1315100 + i)
		// Distinct anime + distinct (uniquely named) group per row so each is its own
		// grouped previous-contribution. ended_year descends so ordering is deterministic.
		mustExecPhase129(t, pool, fmt.Sprintf(`
			INSERT INTO anime (id, title) VALUES (%d, 'Phase131 Prev Anime %d');
			INSERT INTO fansub_groups (id, slug, name, status) VALUES (%d, 'p131-prevb-%d', 'Phase131 PrevBound Group %d', 'active');
			INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year)
				VALUES (%d, %d, %d, 1315001, 'confirmed', true, 2010, %d);
			INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code) VALUES (%d, %d, 'translator');
		`, base, i, base, i, i, base, base, base, 2020-i, base, base))
	}

	// Full profile load must ship only the documented initial page, and the count must
	// match what was shipped (no dishonest grand-total the client cannot page to).
	profile, err := repo.GetPublicMemberProfileByID(context.Background(), memberID)
	require.NoError(t, err)
	require.Lenf(t, profile.PreviousContributions, previousContributionsInitialPageSize,
		"previous_contributions must be bounded to the documented initial page size (%d) even with %d rows",
		previousContributionsInitialPageSize, totalPrev)
	require.Equalf(t, previousContributionsInitialPageSize, profile.PreviousContributionsCount,
		"PreviousContributionsCount must stay honest against the shipped bounded page")

	// The loader itself is now separately-loadable via (limit, offset): page 1 fills, page 2
	// carries the remainder, and a limit above the row count returns the full visible set.
	page1, err := repo.loadPreviousContributions(context.Background(), memberID, previousContributionsInitialPageSize, 0)
	require.NoError(t, err)
	require.Len(t, page1, previousContributionsInitialPageSize)
	page2, err := repo.loadPreviousContributions(context.Background(), memberID, previousContributionsInitialPageSize, previousContributionsInitialPageSize)
	require.NoError(t, err)
	require.Lenf(t, page2, totalPrev-previousContributionsInitialPageSize,
		"offset page must carry exactly the remaining previous rows")
	full, err := repo.loadPreviousContributions(context.Background(), memberID, 100, 0)
	require.NoError(t, err)
	require.Lenf(t, full, totalPrev, "a limit above the row count returns every visible previous row")

	// Offset stability (D-02): no row appears on both pages.
	seen := map[string]bool{}
	for _, it := range page1 {
		seen[fmt.Sprintf("%d:%d", it.AnimeID, it.FansubGroupID)] = true
	}
	for _, it := range page2 {
		require.Falsef(t, seen[fmt.Sprintf("%d:%d", it.AnimeID, it.FansubGroupID)],
			"row %d:%d appeared on both page1 and page2 (offset wobble)", it.AnimeID, it.FansubGroupID)
	}
}

// TestPhase131LatestContributionsBoundedToInitialPage proves the hardcoded `LIMIT 3` in
// loadLatestContributions became a parameterized, documented bound (latest initial 3,
// D-04). It seeds MORE public published notes than the initial page and asserts the
// embedded profile load and the loader both stop at the documented initial size, and that
// the loader pages honestly via offset.
func TestPhase131LatestContributionsBoundedToInitialPage(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const memberID int64 = 1316001
	const totalNotes = 5 // > the documented initial page size (3)
	// contributor_roles is not part of the reset set; ON CONFLICT keeps the test repeatable.
	mustExecPhase129(t, pool, `
		INSERT INTO members (id, nickname, public_slug) VALUES (1316001, 'phase131-latestbound', 'phase131-latestbound');
		INSERT INTO contributor_roles (id, name, label) VALUES (1316000, 'phase131-note-role', 'Phase131 Note Role')
			ON CONFLICT (id) DO NOTHING;
		INSERT INTO anime (id, title) VALUES (1316010, 'Phase131 Latest Anime');
		INSERT INTO episodes (id, anime_id, episode_number) VALUES (1316020, 1316010, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES (1316030, 1316020);
	`)
	for i := 0; i < totalNotes; i++ {
		base := int64(1316100 + i)
		mustExecPhase129(t, pool, fmt.Sprintf(`
			INSERT INTO release_versions (id, release_id, version) VALUES (%d, 1316030, 'v%d');
			INSERT INTO release_version_notes (id, release_version_id, member_id, role_id, body_text, visibility, status, created_at)
				VALUES (%d, %d, 1316001, 1316000, 'Phase131 latest note %d', 'public', 'published', TIMESTAMPTZ '2024-01-%02d 00:00:00+00');
		`, base, i, base, base, i, i+1))
	}

	page1, err := repo.loadLatestContributions(context.Background(), memberID, latestContributionsInitialPageSize, 0)
	require.NoError(t, err)
	require.Lenf(t, page1, latestContributionsInitialPageSize,
		"latest_contributions must be bounded to the documented initial page size (%d), replacing the old hardcoded LIMIT 3",
		latestContributionsInitialPageSize)
	page2, err := repo.loadLatestContributions(context.Background(), memberID, latestContributionsInitialPageSize, latestContributionsInitialPageSize)
	require.NoError(t, err)
	require.Lenf(t, page2, totalNotes-latestContributionsInitialPageSize,
		"offset page must carry exactly the remaining latest rows")

	profile, err := repo.GetPublicMemberProfileByID(context.Background(), memberID)
	require.NoError(t, err)
	require.Lenf(t, profile.LatestContributions, latestContributionsInitialPageSize,
		"embedded profile load must ship only the documented latest initial page")
}

// TestPhase132PublicProfileKnownForUsesApprovedFullSet covers PMFE-11/D-06: the
// known_for aggregate (top roles, known groups) must reflect the member's COMPLETE
// approved current-project set, not just the first embedded page (initial size 6).
// Seeds 7 current projects sharing the SAME updated_at so ordering falls back to
// title ASC -- 6 projects (title "...1".."...6", role "translator", Group A) sort
// ahead of the 7th (title "...7", role "reviewer", Group B), so the embedded
// current_projects page (limit 6) never includes the reviewer role or Group B. If
// loadKnownFor aggregated only that first page it would miss both; aggregating the
// full approved set must surface both.
func TestPhase132PublicProfileKnownForUsesApprovedFullSet(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const memberID int64 = 1320001
	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer'), ('reviewer', 'Korrektur');
		INSERT INTO members (id, nickname, public_slug) VALUES (1320001, 'phase132-knownfor', 'phase132-knownfor');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES
			(1320101, 'phase132-kf-grp-a', 'Phase132 KF Group A', 'active'),
			(1320102, 'phase132-kf-grp-b', 'Phase132 KF Group B', 'active');
		INSERT INTO anime (id, title) VALUES
			(1320201, 'Phase132 KF Anime 1'),
			(1320202, 'Phase132 KF Anime 2'),
			(1320203, 'Phase132 KF Anime 3'),
			(1320204, 'Phase132 KF Anime 4'),
			(1320205, 'Phase132 KF Anime 5'),
			(1320206, 'Phase132 KF Anime 6'),
			(1320207, 'Phase132 KF Anime 7');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year, updated_at) VALUES
			(1320301, 1320101, 1320201, 1320001, 'confirmed', true, 2018, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320302, 1320101, 1320202, 1320001, 'confirmed', true, 2019, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320303, 1320101, 1320203, 1320001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320304, 1320101, 1320204, 1320001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320305, 1320101, 1320205, 1320001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320306, 1320101, 1320206, 1320001, 'confirmed', true, 2020, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00'),
			(1320307, 1320102, 1320207, 1320001, 'confirmed', true, 2024, NULL, TIMESTAMPTZ '2024-01-01 00:00:00+00');
		INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code) VALUES
			(1320401, 1320301, 'translator'),
			(1320402, 1320302, 'translator'),
			(1320403, 1320303, 'translator'),
			(1320404, 1320304, 'translator'),
			(1320405, 1320305, 'translator'),
			(1320406, 1320306, 'translator'),
			(1320407, 1320307, 'reviewer');
	`)

	profile, err := repo.GetPublicMemberProfileByID(context.Background(), memberID)
	require.NoError(t, err)

	require.Lenf(t, profile.CurrentProjects, currentProjectsInitialPageSize,
		"embedded current_projects must stay bounded to the documented initial page (%d) even though 7 rows exist", currentProjectsInitialPageSize)
	for _, p := range profile.CurrentProjects {
		require.NotEqualf(t, int64(1320207), p.AnimeID,
			"the 7th (reviewer/Group B) project must NOT be on the embedded first page -- test setup invariant")
	}

	require.Containsf(t, profile.KnownFor.TopRoles, "Korrektur",
		"PMFE-11/D-06: known_for.top_roles must include the 'reviewer' role which only appears on project #7 (past the embedded first page); got %v", profile.KnownFor.TopRoles)
	require.Containsf(t, profile.KnownFor.KnownGroups, "Phase132 KF Group A",
		"known_for.known_groups must include Group A; got %v", profile.KnownFor.KnownGroups)
	require.Containsf(t, profile.KnownFor.KnownGroups, "Phase132 KF Group B",
		"known_for.known_groups must include Group B, which only appears on project #7 (past the embedded first page); got %v", profile.KnownFor.KnownGroups)
	require.Equalf(t, "2018–2024", profile.KnownFor.ActiveYears,
		"known_for.active_years must span the full approved set's min/max started_year (2018-2024), not just the first-page range; got %q", profile.KnownFor.ActiveYears)
}
