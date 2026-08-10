package repository

// Source-Assertion-Tests fuer ProjectMemberPublicRepository (Phase 122, Plan 122-01).
//
// Das repository-Paket hat keine Live-Postgres-Test-Infrastruktur fuer oeffentliche Read-Repos
// (siehe release_detail_public_repository_test.go / anime_contributions_public_versions_repository_test.go —
// beide pruefen per Source-Assertion). Diese Tests folgen exakt diesem naechsten Analog: sie sichern
// Scoping (Member × Anime × Gruppe), die Visibility-Gates, die Count==Liste-Wiederverwendung, die
// Cursor-Pagination und die D-06-Uploader-Aufloesung auf Quelltext-Ebene ab. Die Laufzeit-Korrektheit
// der SQL wird zusaetzlich im Live-UAT (122-10) gegen echte Daten geprueft.

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func readProjectMemberSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	b, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(b)
}

func pmNorm(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(s)), " ")
}

func projectMemberRepoSource(t *testing.T) string {
	return pmNorm(
		readProjectMemberSource(t, "project_member_public_repository.go") +
			"\n" + readProjectMemberSource(t, "project_member_visibility.go"),
	)
}

func TestProjectMemberRepo_MethodsAndDTOs(t *testing.T) {
	src := projectMemberRepoSource(t)
	required := []string{
		"func (r *projectmemberpublicrepository) resolvememberrelation(ctx context.context, animeid, groupid int64, memberslug string) (int64, bool, error)",
		"func (r *projectmemberpublicrepository) getsummary(",
		"func (r *projectmemberpublicrepository) listnotes(",
		"func (r *projectmemberpublicrepository) listmedia(",
		"func (r *projectmemberpublicrepository) listreleases(",
		`json:"member_slug"`,
		`json:"role_labels"`,
		`json:"release_version_id"`,
		`json:"roles"`,
		`json:"notes"`,
		`json:"media"`,
		`json:"releases"`,
	}
	for _, frag := range required {
		if !strings.Contains(src, frag) {
			t.Fatalf("erwartetes Fragment fehlt: %q", frag)
		}
	}
}

func TestProjectMemberRepo_ScopingMemberAnimeGroup(t *testing.T) {
	src := projectMemberRepoSource(t)
	// Jede Collection muss strikt auf Member × Anime × Gruppe eingeschraenkt sein.
	required := []string{
		"rvn.member_id = $1",                             // notes member-scoped
		"rmr.member_id = $1",                             // roles/releases member-scoped
		"uploaded_by_user_id in (select uid from member_users)", // media member-scoped (D-06)
		"e.anime_id = $2",                                // anime scope
		"rvg.fansub_group_id = $3",                       // group scope (notes/releases/roles)
		"rvm.fansub_group_id = $3",                       // group scope (media, kanonische Spalte)
	}
	for _, frag := range required {
		if !strings.Contains(src, frag) {
			t.Fatalf("Scoping-Fragment fehlt (Contributions duerften aus anderem Anime/Gruppe lecken): %q", frag)
		}
	}
	// Legacy-Spalte fansubgroup_id darf NICHT vorkommen (AGENTS.md Domain-Regel).
	if strings.Contains(src, "fansubgroup_id") {
		t.Fatalf("Legacy-Spalte fansubgroup_id darf nicht verwendet werden")
	}
}

func TestProjectMemberRepo_VisibilityGates(t *testing.T) {
	src := projectMemberRepoSource(t)
	required := []string{
		"rvn.visibility = 'public' and rvn.status = 'published' and rvn.deleted_at is null", // notes gate
		"ma.status = 'ready' and v.name = 'public' and rs.code = 'approved'",                // canonical media gate
		"ac.is_public_on_anime_page = true",                                                 // contribution gate
		"hfgm.visibility = 'public'",
	}
	for _, frag := range required {
		if !strings.Contains(src, frag) {
			t.Fatalf("Visibility-Gate-Fragment fehlt: %q", frag)
		}
	}
}

func TestProjectMemberRepo_CountsReusePredicates(t *testing.T) {
	src := projectMemberRepoSource(t)
	// Counts muessen dieselben Praedikat-Konstanten wie die Listen nutzen (Brief 23: Count==sichtbar).
	// Jede Konstante muss mehrfach referenziert sein (mind. Liste + Count).
	for _, name := range []string{"projectmemberpublicnotepredicate", "projectmemberpublicmediapredicate"} {
		if strings.Count(src, name) < 2 {
			t.Fatalf("Praedikat %q muss von Liste UND Count referenziert werden (>=2 Vorkommen)", name)
		}
	}
	// countReleases zaehlt distinct release_versions.
	if !strings.Contains(src, "count(distinct rv.id)") {
		t.Fatalf("countReleases muss COUNT(DISTINCT rv.id) verwenden")
	}
}

func TestProjectMemberRepo_CursorPagination(t *testing.T) {
	src := projectMemberRepoSource(t)
	required := []string{
		"clampcursorlimit(limit)",
		"trimcursorpage(items, limit,",
		"encodetimeint64cursor(",  // notes cursor
		"decodetimeint64cursor(cursor)",
		"encodeint32int64cursor(", // media + releases cursor
		"decodeint32int64cursor(cursor)",
		"limit+1", // limit+1-Overfetch
	}
	for _, frag := range required {
		if !strings.Contains(src, frag) {
			t.Fatalf("Cursor-Fragment fehlt (unbeschraenkte Arrays / falsche Pagination?): %q", frag)
		}
	}
}

func TestProjectMemberRepo_D06UploaderResolution(t *testing.T) {
	src := projectMemberRepoSource(t)
	// D-06: Uploader (Legacy users.id) -> Member via members.user_id UND verifizierte member_claims.
	required := []string{
		"member_users as (",
		"m.user_id as uid",
		"mc.claim_status = 'verified'",
		"au.legacy_user_id",
	}
	for _, frag := range required {
		if !strings.Contains(src, frag) {
			t.Fatalf("D-06 Uploader-Aufloesung-Fragment fehlt: %q", frag)
		}
	}
}

func TestProjectMemberRepo_RelationGateReturnsExists(t *testing.T) {
	src := projectMemberRepoSource(t)
	// 404-Gate: ResolveMemberRelation prueft EXISTS ueber die Quellen; kein Redirect, nur bool.
	for _, frag := range []string{"select exists (", "union all"} {
		if !strings.Contains(src, frag) {
			t.Fatalf("Relation-Gate-Fragment fehlt: %q", frag)
		}
	}
}
