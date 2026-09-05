# Phase 147: Rollen-Registry — letzte Parallelkataloge auflösen - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 15 (create/modify) + 3 contract/schema + 2 fixture-only test files
**Analogs found:** 15 / 15

All target files already exist (this phase is pure modification, no new files). Every "analog"
below is therefore either (a) a nearby sibling of the file's own established pattern that a second
implementation of the same shape should match, or (b) an existing test-style analog for the new
tests this phase adds. Verified against the actual current file contents (not just CONTEXT.md's
line estimates) — line numbers below are what was read just now (2026-09-05) and may be off by a
line or two from CONTEXT.md's estimates; treat these as authoritative for planning reads.

## File Classification

| File to Modify | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/release_detail_public_repository.go` | repository (DTO+query) | CRUD (read) | `backend/internal/repository/project_member_public_repository.go` (`ProjectMemberNote`) | exact (sibling DTO, same join) |
| `backend/internal/repository/release_detail_public_repository_helpers.go` | repository (DTO+query, 2nd site) | CRUD (read) | same file's sibling query in `release_detail_public_repository.go` | exact (same struct, duplicate query site) |
| `backend/internal/repository/project_member_public_repository.go` | repository (DTO+query) | CRUD (read) | `release_detail_public_repository.go` (`PublicReleaseNote`) | exact (sibling DTO, same join) |
| `backend/internal/models/app_auth.go` | model/constants | config | itself (`KeycloakManagedGlobalRoles` var declaration right below the consts) | exact — new slice follows existing var-of-consts pattern in same file |
| `backend/internal/handlers/admin_capability_handler.go` | handler (config var) | request-response | `admin_users_repository.go`'s `AssignableRoles` literal (same 3 values, different file) | role-match |
| `backend/internal/handlers/admin_users_handler.go` | handler (config var) | request-response | same pattern as above, already imports `models` | role-match |
| `backend/internal/repository/admin_users_repository.go` | repository (literal→const swap) | CRUD (read) | `admin_users_handler.go`'s `validGlobalRoles` (sibling literal) | role-match |
| `backend/internal/handlers/admin_users_mutations_handler.go` | handler (error message) | request-response | itself (two symmetric call sites, `AssignGlobalRole`/`RevokeGlobalRole`) | exact (internal consistency) |
| `backend/internal/permissions/permissions.go` | model/constants | config | n/a (deletion + comment only) | n/a |
| `backend/internal/migrations/*_source_contract_test.go` (new file) | test (source-contract) | file-I/O (read migration SQL) | `backend/internal/migrations/phase142_historical_role_context_test.go` + helpers in `phase136_capability_policy_catalog_test.go` | exact |
| `backend/internal/repository/*_test.go` (new/extended, HC-01 real-result test) | test (repository, real Postgres) | request-response | `backend/internal/repository/release_detail_public_segments_integration_test.go` | exact (real DB, `testsupport.OpenPhase117Postgres`) |
| `frontend/src/lib/roleColors.ts` | utility (to be deleted) | transform | n/a (deletion) | n/a |
| `frontend/src/components/public/PublicNoteCard.tsx` | component | request-response (props) | itself (existing `roleLabel` prop is the template for the new `roleCode` prop) | exact |
| `frontend/src/components/public/PublicNoteCard.test.tsx` | test (component, RTL) | request-response | itself (existing `data-role-code` assertions already exist, just via wrong prop) | exact |
| `frontend/src/types/releaseDetail.ts` | model (TS interface) | transform | `frontend/src/types/projectMember.ts` (`ProjectMemberNote`, sibling DTO shape) | exact |
| `frontend/src/types/projectMember.ts` | model (TS interface) | transform | `frontend/src/types/releaseDetail.ts` (`PublicReleaseNote`, sibling DTO shape) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` | component (consumer) | request-response (props) | `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` (same `PublicNoteCard` prop-threading pattern) | exact |
| `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` | component (consumer) | request-response (props) | `ReleaseNotesList.tsx` (same `PublicNoteCard` prop-threading pattern) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` | hook | transform | `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` (`labelForRole(historyRoleOptions, code)` call sites) | exact — target pattern to migrate onto |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` | component (hook host) | transform | itself (existing `historyRoleOptions` state + `useGroupMembersTab(...)` call ordering) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` | test (unit) | transform | itself (existing `findDuplicateMemberMatches` describe block below the one being removed, real-function-call style) | exact |
| `shared/contracts/openapi.yaml` (`PublicReleaseNote`, `ProjectMemberNote` schemas) | config (contract) | transform | itself (`role_label` property directly above where `role_code` is inserted) | exact |

## Pattern Assignments

### `backend/internal/repository/release_detail_public_repository.go` (repository, CRUD-read)

**Analog:** its own `PublicReleaseNote` struct + cursor query (this is a same-file, same-pattern addition — extend both existing query sites, don't invent a new pattern)

**Struct** (lines 56-67):
```go
// PublicReleaseNote ist ein oeffentlich sichtbarer Textbeitrag einer Release-Version.
type PublicReleaseNote struct {
	ID              int64     `json:"id"`
	FansubGroupID   *int64    `json:"fansub_group_id"`
	MemberID        int64     `json:"member_id"`
	MemberName      string    `json:"member_name"`
	MemberAvatarURL *string   `json:"member_avatar_url"`
	RoleLabel       string    `json:"role_label"`
	Title           string    `json:"title"`
	BodyHTML        string    `json:"body_html"`
	CreatedAt       time.Time `json:"created_at"`
}
```
Add `RoleCode string \`json:"role_code"\`` immediately after `RoleLabel` (mirrors `role_label`'s
position and un-pointered `string` type — note CONTEXT.md's "not required" instruction is about
the OpenAPI schema, not the Go type; the Go field mirrors `COALESCE(rd.code, '')`-style non-null
behavior same as `RoleLabel`).

**Cursor query + Scan** (lines 455-499, the `SELECT ... FROM release_version_notes rvn ...` site):
```go
query := fmt.Sprintf(`
	SELECT
		rvn.id,
		rvn.fansub_group_id,
		rvn.member_id,
		COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
		NULLIF(TRIM(member_avatar.file_path), '') AS member_avatar_url,
		COALESCE(rd.label_de, '') AS role_label,
		COALESCE(NULLIF(TRIM(rvn.title), ''), '') AS title,
		rvn.body_html,
		rvn.created_at
	FROM release_version_notes rvn
	JOIN members m ON m.id = rvn.member_id
	LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
	LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
	LEFT JOIN role_definitions rd ON rd.code = cr.name
	WHERE rvn.release_version_id = $1
	  AND rvn.deleted_at IS NULL
	  AND rvn.visibility = 'public'
	  AND rvn.status = 'published'
	  %s
	ORDER BY rvn.created_at ASC, rvn.id ASC
	LIMIT %d
`, seekSQL, limit+1)
...
if err := rows.Scan(&item.ID, &item.FansubGroupID, &item.MemberID, &item.MemberName, &item.MemberAvatarURL, &item.RoleLabel, &item.Title, &item.BodyHTML, &item.CreatedAt); err != nil {
```
Add `COALESCE(rd.code, '') AS role_code,` right after the `role_label` SELECT line, and
`&item.RoleCode` right after `&item.RoleLabel` in the `Scan(...)` call. The `LEFT JOIN
role_definitions rd ON rd.code = cr.name` already exists — no new join needed.

---

### `backend/internal/repository/release_detail_public_repository_helpers.go` (repository, CRUD-read, 2nd query site)

**Analog:** the sibling query in `release_detail_public_repository.go` above (same struct,
different query implementation — `loadNotes`).

**`loadNotes` query + Scan** (lines 390-425):
```go
func (r *ReleaseDetailPublicRepository) loadNotes(ctx context.Context, releaseVersionID int64) ([]PublicReleaseNote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvn.id,
			rvn.fansub_group_id,
			rvn.member_id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
			NULLIF(TRIM(member_avatar.file_path), '') AS member_avatar_url,
			COALESCE(rd.label_de, '') AS role_label,
			COALESCE(NULLIF(TRIM(rvn.title), ''), '') AS title,
			rvn.body_html,
			rvn.created_at
		FROM release_version_notes rvn
		JOIN members m ON m.id = rvn.member_id
		LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
		LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
		LEFT JOIN role_definitions rd ON rd.code = cr.name
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
		ORDER BY rvn.sort_order ASC, rvn.created_at ASC, rvn.id ASC
	`, releaseVersionID)
	...
	if err := rows.Scan(&item.ID, &item.FansubGroupID, &item.MemberID, &item.MemberName, &item.MemberAvatarURL, &item.RoleLabel, &item.Title, &item.BodyHTML, &item.CreatedAt); err != nil {
```
Identical addition as the cursor query: `COALESCE(rd.code, '') AS role_code,` + `&item.RoleCode` in
Scan. **Both sites must change together** — this is exactly why CONTEXT.md flags it; missing this
second site is the most likely regression.

---

### `backend/internal/repository/project_member_public_repository.go` (repository, CRUD-read)

**Analog:** `release_detail_public_repository.go`'s `PublicReleaseNote` (sibling DTO, identical
`role_definitions` join shape).

**Struct** (lines 43-54):
```go
// ProjectMemberNote ist ein oeffentlicher Textbeitrag des Members im Projekt.
type ProjectMemberNote struct {
	ID                  int64     `json:"id"`
	Title               *string   `json:"title"`
	BodyHTML            string    `json:"body_html"`
	BodyText            string    `json:"body_text"`
	RoleLabel           string    `json:"role_label"`
	EpisodeLabel        string    `json:"episode_label"`
	ReleaseVersionLabel string    `json:"release_version_label"`
	ReleaseVersionID    int64     `json:"release_version_id"`
	CreatedAt           time.Time `json:"created_at"`
}
```
Add `RoleCode string \`json:"role_code"\`` immediately after `RoleLabel`.

**`ListNotes` query + Scan** (lines 237-274):
```go
func (r *ProjectMemberPublicRepository) ListNotes(ctx context.Context, animeID, groupID, memberID int64, cursor string, limit int) ([]ProjectMemberNote, *string, bool, error) {
	...
	q := `
		SELECT rvn.id, rvn.title, rvn.body_html, rvn.body_text,
		       COALESCE(rd.label_de, '') AS role_label,
		       COALESCE(e.episode_number, '') AS episode_label,
		       COALESCE(rv.version, '') AS version_label,
		       rvn.release_version_id, rvn.created_at
		FROM release_version_notes rvn
		JOIN release_versions rv ON rv.id = rvn.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
		LEFT JOIN role_definitions rd ON rd.code = cr.name
		WHERE rvn.member_id = $1 AND e.anime_id = $2 AND rvg.fansub_group_id = $3
		  AND ` + projectMemberPublicNotePredicate + seek + `
		ORDER BY rvn.created_at DESC, rvn.id DESC
		LIMIT ` + fmt.Sprintf("%d", limit+1)
	rows, err := r.db.Query(ctx, q, memberID, animeID, groupID)
	...
	for rows.Next() {
		var n ProjectMemberNote
		if err := rows.Scan(&n.ID, &n.Title, &n.BodyHTML, &n.BodyText, &n.RoleLabel,
			&n.EpisodeLabel, &n.ReleaseVersionLabel, &n.ReleaseVersionID, &n.CreatedAt); err != nil {
```
Add `COALESCE(rd.code, '') AS role_code,` after the `role_label` SELECT line and `&n.RoleCode`
right after `&n.RoleLabel` in `Scan(...)`. Only **one** query site here (unlike release notes).

---

### `backend/internal/models/app_auth.go` (model/constants, config)

**Analog:** itself — `KeycloakManagedGlobalRoles` is the existing "var slice built from the same
three consts" pattern right below; the new `AppGlobalRoles` slice is the more-primary version of
that same shape and should be declared **above** `KeycloakManagedGlobalRoles` (which then
references it).

**Current state** (lines 1-36):
```go
package models

import "time"

const (
	AppUserStatusPending  = "pending"
	AppUserStatusActive   = "active"
	AppUserStatusDisabled = "disabled"

	AppGlobalRolePlatformAdmin = "platform_admin"
	AppGlobalRoleContentAdmin  = "content_admin"
	AppGlobalRoleUser          = "user"
	...
)

// KeycloakManagedGlobalRoles is the set of Keycloak realm-role names that the
// IdP-role-driven JIT sync (repository.AuthzRepository.SyncGlobalRolesFromKeycloak)
// is authoritative for. Only realm roles listed here are ever reconciled into
// app_user_global_roles; any other realm role on the token is ignored (defense
// in depth alongside the DB's chk_app_user_global_roles_role CHECK constraint).
// Names are identical to the AppGlobalRole* constants above today; centralizing
// the mapping here means a future rename only touches one place.
var KeycloakManagedGlobalRoles = []string{
	AppGlobalRolePlatformAdmin,
	AppGlobalRoleContentAdmin,
	AppGlobalRoleUser,
}
```
New `AppGlobalRoles` slice goes right after the `const (...)` block (same exported-var style,
no `import` changes needed since it's the same file):
```go
// AppGlobalRoles is the canonical, ordered set of global App-Rollen (Phase 147 / HC-03).
// Order matches every existing consumer's literal today: platform_admin, content_admin, user.
var AppGlobalRoles = []string{
	AppGlobalRolePlatformAdmin,
	AppGlobalRoleContentAdmin,
	AppGlobalRoleUser,
}
```
Then `KeycloakManagedGlobalRoles`'s body becomes `= AppGlobalRoles` (comment adjusted per
CONTEXT.md's exact wording instruction — keep the "own purpose" clarification, drop the redundant
value list).

---

### `backend/internal/handlers/admin_capability_handler.go` (handler, config var)

**Analog:** `admin_users_repository.go`'s `AssignableRoles` literal / `admin_users_handler.go`'s
`validGlobalRoles` — same three string values, now to be derived from `models.AppGlobalRoles`.

**Current imports** (lines 1-13, `models` NOT imported yet):
```go
package handlers

import (
	"context"
	"log"
	"net/http"
	"slices"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```
Add `"team4s.v3/backend/internal/models"` to the import block (alongside `permissions`/`repository`,
alphabetically sorted per existing convention — see `admin_users_handler.go`'s import block below
for the exact ordering convention to copy: `models`, then `permissions`, then `repository`).

**Current var to replace** (lines 37-40):
```go
// globalAppRoleCodes ist die feste Reihenfolge der drei globalen App-Rollen, die als
// synthetische, nicht-editierbare Zeilen der Capability-Matrix vorangestellt werden.
// Kanonische Quelle für diese drei Codes: admin_users_repository.go AssignableRoles (Zeile 192).
var globalAppRoleCodes = []string{"platform_admin", "content_admin", "user"}
```
Replace the literal with `models.AppGlobalRoles`; update the comment's "Kanonische Quelle"
reference to point at `models.AppGlobalRoles` instead of `admin_users_repository.go`.

---

### `backend/internal/handlers/admin_users_handler.go` (handler, config var)

**Analog:** its own existing `models` import (already present) — pure substitution, no import
change needed.

**Current imports** (lines 1-15, `models` already imported):
```go
import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```

**Current var to replace** (lines 90-95):
```go
// validGlobalRoles enthält die erlaubten globalen Rollenwerte.
var validGlobalRoles = map[string]struct{}{
	"platform_admin": {},
	"content_admin":  {},
	"user":           {},
}
```
Build the map from `models.AppGlobalRoles` (e.g. via a small loop or `slices`-based construction —
`slices` is already imported by the sibling `admin_capability_handler.go`, consider a shared helper
if one already exists, otherwise a 3-line loop is in scope and stays well under 450 lines).

---

### `backend/internal/repository/admin_users_repository.go` (repository, literal→const swap)

**Analog:** same three values already centralized via `models.AppGlobalRole*` consts elsewhere in
this same file (the file already imports `models`).

**Current code** (lines 194-197, in `GetUserGlobalRoles`):
```go
	return &models.AdminUserGlobalRolesResult{
		Roles:           roles,
		AssignableRoles: []string{"platform_admin", "content_admin", "user"},
	}, nil
}
```
Replace `[]string{"platform_admin", "content_admin", "user"}` with `models.AppGlobalRoles`.

---

### `backend/internal/handlers/admin_users_mutations_handler.go` (handler, error message)

**Analog:** itself — two symmetric call sites (`AssignGlobalRole`, `RevokeGlobalRole`) using the
identical error string; both must change together.

**Current imports** (lines 1-11, `strings` NOT imported):
```go
package handlers

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```
Add `"strings"` to the stdlib import group.

**Site 1 — `AssignGlobalRole`** (lines 28-32):
```go
	role := c.Param("role")
	if _, valid := validGlobalRoles[role]; !valid {
		badRequest(c, "Ungültige Rolle. Erlaubte Werte: platform_admin, content_admin, user.")
		return
	}
```
**Site 2 — `RevokeGlobalRole`** (lines 69-73, identical body):
```go
	role := c.Param("role")
	if _, valid := validGlobalRoles[role]; !valid {
		badRequest(c, "Ungültige Rolle. Erlaubte Werte: platform_admin, content_admin, user.")
		return
	}
```
Both become:
```go
badRequest(c, "Ungültige Rolle. Erlaubte Werte: "+strings.Join(models.AppGlobalRoles, ", ")+".")
```
(exact German text/umlauts preserved; `models` already imported in this file).

---

### `backend/internal/permissions/permissions.go` (constants, HC-09 deletion)

**Analog:** none needed — pure deletion + comment update in place.

**Block to edit** (lines 65-83):
```go
const (
	RolePlatformAdmin  = "platform_admin"
	RoleFansubLead     = "fansub_lead"
	RoleProjectLead    = "project_lead"
	RoleTranslator     = "translator"
	RoleTimer          = "timer"
	RoleTypesetter     = "typesetter"
	RoleEditor         = "editor"
	RoleEncoder        = "encoder"
	RoleRawProvider    = "raw_provider"
	RoleQualityChecker = "quality_checker"
	RoleDesigner       = "designer"
)

// Neue Gruppenrollen (D-07): in Migration 0112 mit assignable=true angelegt.
const (
	RoleTechadmin = "techadmin"
	RoleGfxler    = "gfxler"
)
```
Remove `RoleTranslator`, `RoleTypesetter` from the first block; remove the entire second
`const (RoleTechadmin, RoleGfxler)` block (both its members). Add the clarifying comment CONTEXT.md
specifies above the remaining first block (not autoritative, catalog is `role_definitions`, only
codes directly referenced in Go comparisons remain).

**Inert `roleMatrix` block below (lines 103+, do NOT touch — verified fully commented out):**
```go
/* Historical bootstrap grants retained as documentation only. Runtime authority is PostgreSQL.
var roleMatrix = map[string][]Action{
	RoleFansubLead: {
	...
```
This confirms the `/* ... */` block starts at line 103 and contains `RoleTranslator`/`RoleTypesetter`
as dead text only — no compiled reference, safe to leave alone per CONTEXT.md.

**Test fixtures to update to literals** (bare, unqualified — package-internal, same package
`permissions`): `permissions_test.go:466`, `effective_rights_test.go:325`,
`effective_rights_capability_impact_preview_test.go:183`, `capability_registry_test.go:186,197,227,233`.
Example excerpt of the fixture usage style to convert (from `capability_registry_test.go`
around line 220-233):
```go
		RoleGfxler: {
			ActionFansubGroupMediaUpload,
			ActionFansubGroupMediaUpdate,
			ActionFansubGroupMediaUpdateOwn,
			ActionFansubGroupMediaReorder,
		},
		RoleTechadmin: {
			ActionFansubGroupMediaUpload,
			...
```
becomes map keys `"gfxler":` / `"techadmin":` (raw string literals, `founder"` sibling key on the
same map already uses the raw-string-literal style as the pattern to copy — see the `"founder":`
key immediately following in the same map literal).

---

### HC-03 — Backend source-contract test (new file)

**Analog:** `backend/internal/migrations/phase142_historical_role_context_test.go` (full file, 31
lines — shortest existing `*SourceContract` test) + helpers from
`backend/internal/migrations/phase136_capability_policy_catalog_test.go`.

**Full analog file** (`phase142_historical_role_context_test.go`):
```go
package migrations_test

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	phase142HistoricalRoleContextsUpFile   = "0158_historical_role_contexts.up.sql"
	phase142HistoricalRoleContextsDownFile = "0158_historical_role_contexts.down.sql"
)

func TestPhase142HistoricalRoleContextsSourceContract(t *testing.T) {
	for _, name := range []string{phase142HistoricalRoleContextsUpFile, phase142HistoricalRoleContextsDownFile} {
		body, err := os.ReadFile(phase136MigrationPath(t, name))
		require.NoError(t, err)
		contents := strings.ToLower(string(body))
		require.Contains(t, contents, "migration_0158_historical_role_context_backup")
	}
	...
}
```

**Reusable helper** (`phase136_capability_policy_catalog_test.go`, lines 417-422 — same
`migrations_test` package, do not duplicate, call directly):
```go
func phase136MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
```

**Target migration fragment to assert against** (`database/migrations/0072_keycloak_app_users_foundation.up.sql`, lines 25-31):
```sql
CREATE TABLE IF NOT EXISTS app_user_global_roles (
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (app_user_id, role),
    CONSTRAINT chk_app_user_global_roles_role CHECK (role IN ('platform_admin', 'content_admin', 'user'))
);
```
New test: read `0072_keycloak_app_users_foundation.up.sql` via `phase136MigrationPath(t, name)`,
extract the three quoted values from the `CHECK (role IN (...))` clause (regex or
`strings.Split`/`strings.Cut` on the `role IN (` .. `)` substring), and
`require.ElementsMatch(t, extractedValues, models.AppGlobalRoles)` — note this new test needs to
import `"team4s.v3/backend/internal/models"`, which the two existing analog test files do NOT
import (they only read raw SQL text) — this is the one intentional deviation from the analogs.

---

### HC-01 — Backend real-result test (repository test)

**Analog:** `backend/internal/repository/release_detail_public_segments_integration_test.go`
(real Postgres integration test, skips cleanly without `TEAM4S_PHASE117_TEST_DSN`) — this is the
"echtes Response-Ergebnis" pattern CONTEXT.md requires (NOT the source-substring style used in
`project_member_public_repository_test.go`, which is legacy Altlast per `CLAUDE.md`'s Teststil
section and must not be copied for new assertions).

**Pattern excerpt** (lines 21-34, 53-56, 93-100):
```go
import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestReleaseDetailPublicSegments(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")
	...
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	...
	t.Run("span-start Folge (keine Vorfolge) zeigt das Segment und traegt die Span-Reichweite", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionA, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1, "...")
		require.Equal(t, themeSegmentXID, segments[0].ThemeSegmentID)
	})
}
```
For HC-01: insert a `role_definitions` row + `contributor_roles` row + `release_version_notes` row
(or the `ProjectMemberNote` equivalent tables), call the repository method that returns
`PublicReleaseNote`/`ProjectMemberNote`, and `require.Equal(t, expectedCode, result[0].RoleCode)` —
plus a second sub-test that changes only `label_de` and asserts `RoleCode` is unaffected (this is
CONTEXT.md's explicit "label_de change must not affect role_code" requirement, mirrored from the
frontend regression test requirement below). `testsupport.OpenPhase117Postgres(t)` is the existing
DSN-gated pool opener to reuse (no new test infra needed).

---

### Contracts — `shared/contracts/openapi.yaml`

**Analog:** the existing `role_label` property directly above the insertion point in both schemas.

**`PublicReleaseNote` schema** (lines 14894-14918):
```yaml
    PublicReleaseNote:
      type: object
      required: [id, member_id, member_name, member_avatar_url, role_label, body_html, created_at]
      properties:
        id:
          type: integer
          format: int64
        fansub_group_id:
          type: integer
          format: int64
          nullable: true
        member_name:
          type: string
        member_id:
          type: integer
          format: int64
        member_avatar_url:
          type: string
          nullable: true
        role_label:
          type: string
        body_html:
          type: string
        created_at:
          type: string
```
Add `role_code: {type: string}` as a new property (block-style, matching the surrounding multi-line
property style, e.g. right after `role_label`), and do **not** add it to `required` (per CONTEXT.md
— notes without `role_id` yield empty string via the same `COALESCE` pattern as `role_label`).

**`ProjectMemberNote` schema** (lines 15152-15164, uses the compact single-line property style):
```yaml
    ProjectMemberNote:
      type: object
      required: [id, body_html, body_text, role_label, episode_label, release_version_label, release_version_id, created_at]
      properties:
        id: {type: integer, format: int64}
        title: {type: string, nullable: true}
        body_html: {type: string}
        body_text: {type: string}
        role_label: {type: string}
        episode_label: {type: string}
        release_version_label: {type: string}
        release_version_id: {type: integer, format: int64}
        created_at: {type: string, format: date-time}
```
Add `role_code: {type: string}` in the same single-line compact style, right after `role_label:
{type: string}`. Not added to `required`, matching the `PublicReleaseNote` decision above.

---

### `frontend/src/types/releaseDetail.ts` (TS interface)

**Analog:** `frontend/src/types/projectMember.ts`'s `ProjectMemberNote` (sibling DTO — same
addition needed there too).

**Current interface** (lines 26-36):
```typescript
export interface PublicReleaseNote {
  id: number;
  fansub_group_id?: number | null;
  title?: string | null;
  member_name: string;
  member_id: number;
  member_avatar_url: string | null;
  role_label: string;
  body_html: string;
  created_at: string;
}
```
Add `role_code: string;` immediately after `role_label: string;`.

---

### `frontend/src/types/projectMember.ts` (TS interface)

**Analog:** `frontend/src/types/releaseDetail.ts`'s `PublicReleaseNote` (sibling DTO).

**Current interface** (lines 21-31):
```typescript
export interface ProjectMemberNote {
  id: number
  title: string | null
  body_html: string
  body_text: string
  role_label: string
  episode_label: string
  release_version_label: string
  release_version_id: number
  created_at: string
}
```
Add `role_code: string` immediately after `role_label: string` (note: no semicolons in this file's
style, unlike `releaseDetail.ts` — preserve each file's existing statement-terminator convention).

---

### `frontend/src/components/public/PublicNoteCard.tsx` (component, props)

**Analog:** itself — the existing `roleLabel` prop is the exact template; `roleCode` is added as a
sibling prop, and `data-role-code` switches from a derived value to the direct prop.

**Current imports (line 9, to be removed)**:
```typescript
import { roleColorCode } from '@/lib/roleColors'
```

**Current props interface** (lines 23-25):
```typescript
export interface PublicNoteCardProps {
  /** Rolle → färbt das Header-Band (--role-accent) und wird in der Rollen-Variante als Titel gezeigt. */
  roleLabel?: string | null
```
Add a new prop right after `roleLabel`:
```typescript
  /** Stabiler Rollen-Code (role_definitions.code) für data-role-code; unabhängig vom Anzeigelabel. */
  roleCode?: string | null
```

**Current destructure + usage** (line 54, 76):
```typescript
export function PublicNoteCard({
  roleLabel,
  ...
```
add `roleCode,` alongside `roleLabel,`.

```typescript
    <article className={styles.card} data-role-code={roleColorCode(roleLabel ?? '')}>
```
becomes:
```typescript
    <article className={styles.card} data-role-code={roleCode || 'other'}>
```
(preserving the existing "unknown → other" fallback semantics that `roleColorCode` provided, now
driven by the prop directly instead of a label→code map). `roleLabel` usages elsewhere in the file
(header text at line 97, 103) are unchanged — they remain pure display text.

---

### `frontend/src/components/public/PublicNoteCard.test.tsx` (test, RTL)

**Analog:** itself — existing assertions already check `data-role-code`, just need a `roleCode`
prop added to each render call plus one new "label change doesn't affect code" case.

**Existing assertion style to extend** (lines 11-28):
```tsx
  it('role variant: renders role, date, context line, body and footer link', () => {
    render(
      <PublicNoteCard
        roleLabel="Qualitätsprüfung"
        dateLabel="12.04.2024"
        contextLine="Notiz zu Folge 08"
        bodyText="kurzer Text"
        footer={{ href: '/p/releases/41', label: 'Folge 08 · v1 →' }}
      />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-role-code')).toBe('quality_checker')
```
Update each existing `render(<PublicNoteCard roleLabel="..." .../>)` call to also pass
`roleCode="..."` and change the `data-role-code` expectation to assert the prop value directly
(e.g. `roleCode="quality_checker"` → `expect(card.getAttribute('data-role-code')).toBe('quality_checker')`).
Add a new test proving `roleLabel` changes do not affect `data-role-code` when `roleCode` is held
fixed — covers CONTEXT.md's explicit "label_de change must not influence the value" requirement,
and covers the eight named roles (`fansub_lead`, `founder`, `co_leader`, `techadmin`, `gfxler`,
`karaoke_fx`, `editor`, `typesetter`) each getting their own `data-role-code` directly from the
prop (parametrize with `it.each` or a loop over role pairs, consistent with this file's existing
`describe`/`it` structure).

---

### `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` (consumer)

**Analog:** `ProjectMemberNoteCard.tsx` (sibling consumer of the same `PublicNoteCard`).

**Current usage** (lines 69-81):
```tsx
          return <PublicNoteCard
            key={note.id}
            roleLabel={note.role_label}
            title={note.title}
            author={{ name: note.member_name, avatarUrl: note.member_avatar_url }}
            metaSuffix={sourceGroupName ?? null}
            dateLabel={formatReleaseNoteDate(note.created_at)}
            bodyHtml={note.body_html}
            bodyId={`release-note-body-${note.id}`}
            clampThreshold={320}
            moreLabel="Weiterlesen"
            lessLabel="Weniger anzeigen"
          />
```
Add `roleCode={note.role_code}` alongside `roleLabel={note.role_label}` (same line-per-prop style).

---

### `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` (consumer)

**Analog:** `ReleaseNotesList.tsx` (sibling consumer of the same `PublicNoteCard`).

**Current usage** (lines 24-36):
```tsx
  return (
    <PublicNoteCard
      roleLabel={note.role_label}
      dateLabel={formatDate(note.created_at)}
      contextLine={note.episode_label ? `Notiz zu Folge ${note.episode_label}` : null}
      title={note.title}
      bodyHtml={note.body_html}
      bodyText={note.body_text}
      clampThreshold={180}
      footer={{
        href: `${projectPath}/releases/${note.release_version_id}`,
        label: `Folge ${note.episode_label}${versionSuffix} →`,
      }}
    />
  )
```
Add `roleCode={note.role_code}` alongside `roleLabel={note.role_label}`.

---

### `frontend/src/lib/roleColors.ts` (deletion target)

**Verified sole consumer** (per grep, confirms CONTEXT.md's claim): only
`frontend/src/components/public/PublicNoteCard.tsx` imports `roleColorCode` (line 9) and calls it
(line 76). Once `PublicNoteCard.tsx` is migrated off it, delete the whole file — no other importer
exists in `frontend/src`.

---

### `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` (hook, HC-02)

**Target pattern to migrate onto — `labelForRole`** (`frontend/src/lib/roleCatalog.ts`, lines 37-43):
```typescript
export function getRole(rows: readonly RoleDefinitionOption[], code: string): RoleDefinitionOption | undefined {
  return rows.find((row) => row.code === code)
}

export function labelForRole(rows: readonly RoleDefinitionOption[], code: string): string {
  return getRole(rows, code)?.label_de || readableCodeLabel(code)
}
```

**Live usage to copy the calling convention from** (`GroupMembersTab.tsx`, lines 170, 239):
```tsx
            roleLabelForCode={(code) => labelForRole(historyRoleOptions, code)}
```
(both call sites are identical — `labelForRole(historyRoleOptions, code)`, where
`historyRoleOptions` is `RoleDefinitionOption[]` state owned by `GroupMembersTab.tsx`.)

**Code to remove** (lines 41-69):
```typescript
// Deutsche Rollen-Labels je Code. Git-verifiziert wiederhergestellt aus dem in Commit
// eed757e1 gelöschten ROLE_LABELS-Objekt (ContributionCard.tsx). ...
const ROLE_LABELS: Record<string, string> = {
  translator: 'Übersetzung',
  ...
  other: 'Sonstiges',
}

export function roleLabelForCode(code: string): string {
  return ROLE_LABELS[code] ?? code
}
```

**Options type to extend** (lines 169-173):
```typescript
export type UseGroupMembersTabOptions = {
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
  onActiveAppMembersChanged?: () => void
}

export function useGroupMembersTab({ fansubId, onActionsChange, onActiveAppMembersChanged }: UseGroupMembersTabOptions) {
```
Add `historyRoleOptions: RoleDefinitionOption[]` field (needs
`import type { RoleDefinitionOption } from '@/types/admin-capability'` added to this file's imports
— `GroupMembersTab.tsx` already imports this type the same way, see below) and destructure it in
the function signature.

**Call site to migrate** (lines 275-287, `historicalIdentityOptions`):
```typescript
  const historicalIdentityOptions = useMemo<HistoricalIdentityOption[]>(() => {
    return members
      .filter((member) => !member.app_user_id)
      .map((member) => {
        const openRoles = (rolesByMember.get(member.id) ?? []).filter((role) => !role.ended_date)
        return {
          id: member.id,
          displayName: member.display_name,
          roleSummary: openRoles.map((role) => role.role_label ?? roleLabelForCode(role.role_code)).join(', '),
        }
      })
      .filter((option) => option.roleSummary.length > 0)
  }, [members, rolesByMember])
```
`roleLabelForCode(role.role_code)` becomes `labelForRole(historyRoleOptions, role.role_code)`; add
`historyRoleOptions` to the `useMemo` dependency array. Import `labelForRole` from
`@/lib/roleCatalog` (same import path `GroupMembersTab.tsx` already uses).

---

### `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` (hook host)

**Analog:** itself — existing `historyRoleOptions` state + `labelForRole` import are the exact
pieces to thread into the hook call.

**Existing import** (line 17):
```tsx
import { labelForRole } from '@/lib/roleCatalog'
```

**Existing state + hook call ordering to change** (lines 82-92):
```tsx
  const tab = useGroupMembersTab({ fansubId, onActionsChange, onActiveAppMembersChanged })

  const [historyRoleOptions, setHistoryRoleOptions] = useState<RoleDefinitionOption[]>([])
  const [historyRoleLoadError, setHistoryRoleLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listGroupHistoryRoleDefinitions(fansubId)
      .then((options) => {
        if (!cancelled) {
          setHistoryRoleOptions(mergeHistoricalRoleOptions(options))
          setHistoryRoleLoadError(null)
        }
      })
```
Per CONTEXT.md's recommended (non-mandatory) approach: move the `historyRoleOptions` `useState`
declaration (and ideally the `useEffect` that populates it) **above** the `useGroupMembersTab(...)`
call, then pass `historyRoleOptions` into the hook's options object:
```tsx
  const [historyRoleOptions, setHistoryRoleOptions] = useState<RoleDefinitionOption[]>([])
  const [historyRoleLoadError, setHistoryRoleLoadError] = useState<string | null>(null)

  useEffect(() => { /* unchanged */ }, [fansubId])

  const tab = useGroupMembersTab({ fansubId, onActionsChange, onActiveAppMembersChanged, historyRoleOptions })
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` (test, HC-02)

**Analog:** itself — the sibling `findDuplicateMemberMatches` describe block (lines 39-74) is
already in the required "call the real exported function with a fixture, assert on result" style;
the `roleLabelForCode` describe block (lines 7-16) is the one being removed/migrated.

**Block to remove/replace** (lines 5, 7-16):
```typescript
import { findDuplicateMemberMatches, roleLabelForCode } from './useGroupMembersTab'

describe('roleLabelForCode', () => {
  it('labels historical founder roles neutrally in German', () => {
    expect(roleLabelForCode('founder')).toBe('Gründung')
  })

  it('keeps active role labels and unknown-code fallbacks', () => {
    expect(roleLabelForCode('translator')).toBe('Übersetzung')
    expect(roleLabelForCode('unknown_role')).toBe('unknown_role')
  })
})
```
Remove `roleLabelForCode` from the import; remove this `describe` block entirely (per CONTEXT.md,
behavior should instead be proven via a real call to `roleSummary`/`historicalIdentityOptions`
with a `RoleDefinitionOption[]` fixture — this requires calling the hook itself, e.g. via
`renderHook` from `@testing-library/react`, since `historicalIdentityOptions` is internal hook
state, not a standalone exported function like `findDuplicateMemberMatches`). Check whether the
project already has a `renderHook`-based test elsewhere in `frontend/src/app/admin/fansubs` for
the exact harness style to copy (none found under this specific directory at time of mapping —
planner should grep `renderHook` repo-wide before deciding the exact harness).

## Shared Patterns

### Go: derive literal-list from a canonical `models.*` slice
**Source:** `backend/internal/models/app_auth.go`'s new `AppGlobalRoles` var
**Apply to:** `admin_capability_handler.go`, `admin_users_handler.go`, `admin_users_repository.go`,
`admin_users_mutations_handler.go`
```go
var AppGlobalRoles = []string{
	AppGlobalRolePlatformAdmin,
	AppGlobalRoleContentAdmin,
	AppGlobalRoleUser,
}
```
Each of the four consumers either assigns this slice directly (`admin_users_repository.go`), builds
a `map[string]struct{}` from it (`admin_users_handler.go`), or joins it into an error string
(`admin_users_mutations_handler.go`) — no consumer should re-declare the three string literals.

### Go: `role_definitions` join already present, only SELECT/Scan need extending
**Source:** all three note-repository query sites (`release_detail_public_repository.go`,
`release_detail_public_repository_helpers.go`, `project_member_public_repository.go`)
```sql
LEFT JOIN contributor_roles cr ON cr.id = rvn.role_id
LEFT JOIN role_definitions rd ON rd.code = cr.name
```
This join already exists at all three sites; the phase only adds `COALESCE(rd.code, '') AS
role_code` to the SELECT list and `&item.RoleCode`/`&n.RoleCode` to the corresponding `Scan(...)`
call, in the same position (right after `role_label`) at each site.

### TypeScript: `role_label` + `role_code` sibling fields in note DTOs
**Source:** `frontend/src/types/releaseDetail.ts`, `frontend/src/types/projectMember.ts`
```typescript
role_label: string;
role_code: string;
```
Applies identically to both interfaces — `role_code` always sits directly after `role_label`,
never optional/nullable (mirrors the Go `COALESCE(..., '')` non-null guarantee).

### TypeScript: `PublicNoteCard` prop-threading through adapter components
**Source:** `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` and
`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx`
```tsx
<PublicNoteCard
  roleLabel={note.role_label}
  roleCode={note.role_code}
  ...
/>
```
Both consumers pass `note.role_label` today; both need the identical `roleCode={note.role_code}`
addition, immediately after `roleLabel`.

### TypeScript: catalog-driven role label resolution (`labelForRole`)
**Source:** `frontend/src/lib/roleCatalog.ts` (`labelForRole`, `getRole`), consumed today in
`frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` at two call sites
(`roleLabelForCode={(code) => labelForRole(historyRoleOptions, code)}`, lines 170 and 239)
```typescript
export function labelForRole(rows: readonly RoleDefinitionOption[], code: string): string {
  return getRole(rows, code)?.label_de || readableCodeLabel(code)
}
```
This is the canonical, single kataloggetrieben path all label-lookup call sites in this feature
area should converge on — `useGroupMembersTab.ts`'s `roleSummary` computation is the last holdout.

## No Analog Found

None — every file in this phase's scope is a modification of an existing file with either a
same-file precedent (e.g. `KeycloakManagedGlobalRoles` next to the new `AppGlobalRoles`) or a
sibling file with an identical shape (e.g. `PublicReleaseNote` / `ProjectMemberNote`,
`ReleaseNotesList.tsx` / `ProjectMemberNoteCard.tsx`). No new architectural pattern is introduced.

## Anti-Patterns (explicitly do NOT copy)

- `backend/internal/repository/project_member_public_repository_test.go`'s `TestProjectMemberRepo_*`
  functions (source-substring-on-own-.go-file tests, lines 44-100) — this is exactly the pattern
  `CLAUDE.md`'s Teststil section forbids for new tests ("Altlast... kein Vorbild zum
  Weiterkopieren"). For HC-01's new backend test, use
  `release_detail_public_segments_integration_test.go`'s real-Postgres pattern instead.
- `frontend/src/lib/roleColors.ts`'s `ROLE_CODE_BY_LABEL` label→code reverse map — this is the
  broken pattern being removed (HC-01), not a template for anything new.
- `useGroupMembersTab.ts`'s `ROLE_LABELS`/`roleLabelForCode` — this is the parallel catalog being
  removed (HC-02), not a template.

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/models/`, `backend/internal/permissions/`, `backend/internal/migrations/`,
`database/migrations/`, `frontend/src/lib/`, `frontend/src/types/`, `frontend/src/components/public/`,
`frontend/src/components/fansubs/projectMember/`, `frontend/src/app/admin/fansubs/[id]/edit/`,
`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`, `shared/contracts/`.
**Files scanned:** ~30 (read in full or targeted ranges); all paths named in CONTEXT.md's
`canonical_refs` were located and verified to still match the described line ranges (small drifts
noted inline above where the currently-read line number differs from CONTEXT.md's estimate).
**Pattern extraction date:** 2026-09-05
