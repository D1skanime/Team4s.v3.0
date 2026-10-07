# Phase 176: Bug- und Altlasten-Sammelphase — Pattern Map

**Mapped:** 2026-10-07
**Files analyzed:** 29 (across D-01..D-23, Pakete A–E)
**Analogs found:** 25 / 29 (4 are process/cross-cutting items with no single file analog, or explicit "merge two existing impls into one" cases)

**Note on scope:** This phase has no RESEARCH.md (research explicitly skipped). All analogs below
were found and verified directly in the live codebase via Glob/Grep/Read. Every analog file path,
line range, and code excerpt in this document was re-read from the actual current file content —
none are copied from CONTEXT.md without verification.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/NNNN_theme_types_kuerzel.up/down.sql` (new, D-01) | migration | CRUD (schema) | `database/migrations/0171_fansub_group_kuerzel.up.sql` | role-match |
| `backend/internal/repository/admin_content_anime_themes_core.go` (D-01, add kuerzel to SELECT) | repository | CRUD | itself — existing `tt.name AS theme_type_name` JOIN pattern (lines 56-63, 126-127) | exact |
| `backend/internal/repository/admin_content_anime_segments_crud.go` (D-01, add kuerzel to 3 SELECTs) | repository | CRUD | itself — existing `tt.name AS theme_type_name` JOIN pattern (lines 136,512,616) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` (D-01, remove name-guessing) | utility | transform | n/a — file itself is the thing being corrected; DB-driven kuerzel field replaces `getTypeBadgeLabel`/`getTypeColor`/`isUpperSpur` | exact (self) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts` (D-01, **delete entirely**) | utility (dead code) | transform | n/a — confirmed dead per `data/11-status-label-darstellung.md` (test-only import) | exact (removal target) |
| `backend/internal/repository/anime_contributions_write_repository.go` `Create()` (D-02, root-cause fix) | repository | CRUD | `backend/internal/repository/anime_contributions_upsert_repository.go` `CreateOrUpdate()` (lines 150-217) | role-match (safe upsert sibling in same package) |
| `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts:160` (D-03, `"Tag hinzugefuegt."` → `"Tag hinzugefügt."`) | hook/action | event-driven | `useAdminFansubCreateActions.ts:230` (`"Änderungen gespeichert."`, correct umlaut in same file) | exact (sibling string, same file) |
| `frontend/src/app/admin/fansubs/create/page.tsx` (D-04, 5 native fields: name `<input>`, slug `<input>`, status `<select>`, groupType `<select>`, country `<input>`) | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx` (lines 106-240, same fields already on `Input`/`Select`) | exact |
| `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx` (D-04, 3 native fields: link_type `<select>`, name `<input>`, url `<input>`) | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx` (link rows use `Select`/`Input`, same domain) | role-match |
| `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx` (D-04, 1 native `<input>`) | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx:307-315` (alias `Input` with `invalid` prop) | exact |
| 6 Frontend-Baseline-Tests + `ReleaseDetailHero.test.tsx` + `shared/contracts/openapi.yaml` (~line 2205) (D-05) | test / config | n/a | sibling green tests in same suite; fix-in-place, no new-file analog needed | n/a (fix-in-place) |
| `backend/internal/testsupport/phaseNNN_postgres.go` (new, D-06 fixture schema incl. `user_group_capability_overrides`) | test fixture | batch (schema bootstrap) | `backend/internal/testsupport/phase137_postgres.go` (lines 25-60, builds exact `user_group_capability_overrides`/`...override_history` schema via real migration chain) | exact |
| `backend/internal/testsupport/phase107_postgres.go` (D-06, file being extended/replaced) | test fixture | batch | itself — compare against `phase137_postgres.go`'s broader migration-chain approach | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/*.module.css`-mixing files, 16 occurrences (D-12) | component (CSS wiring) | transform | `frontend/src/components/ui/Select.tsx` (lines 5-9, `Proxy` merge fix from Phase 174-23) | exact |
| `backend/internal/handlers/member_claim_invitations_handler.go:144` `AcceptClaimInvitation` (D-17) | handler | request-response | `backend/internal/handlers/app_auth_invitations.go:310` `AcceptFansubInvitation` (uses `permissionActorFromContext` + `CanAcceptInvitation`) | exact (named Vorbild in CONTEXT.md, verified) |
| `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts:46` (`notes` tab OR-gate) (D-18) | utility (access gate) | transform | same file, `releaseVersionToolsTarget`/`canEditFansubBranding` (narrower AND-style gates in same file) | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` (D-18, add `foundingOnly`-equivalent gating) | component | request-response | `frontend/src/components/groups/GroupHistorySection.tsx` (lines 290, 515-517, `foundingOnly` prop restricts `canAddEntry`/`canEditEntry`/`canDeleteEntry`) — **already wired for founding-only editors** via `FansubEditSecondaryTabs.tsx:133` and `FansubBasicInfoTab.tsx:85` | exact (named Vorbild in CONTEXT.md, verified + already-used integration point found) |
| `backend/internal/handlers/fansub_group_members.go:165` `DeleteFansubMember` (D-19, **delete handler + route**) | handler (dead code) | request-response | n/a — removal target; route at `backend/cmd/server/admin_routes.go:133` | exact (removal target) |
| `backend/internal/repository/anime_contributions_repository.go` / related (D-20, drop `review_status_id` column + all dead references) | repository / migration | CRUD | `backend/internal/handlers/contributions_me_handler.go:365,389` (writes `review_status_id` for `anime_contributions`, never read back) | exact |
| `backend/internal/repository/member_claims_submit_repository.go:48-69` (memorial guard, keep) | repository | CRUD | sibling duplicate below | exact |
| `backend/internal/repository/member_claim_invitations_repository.go:187-215` (memorial guard, **merge into shared helper**) | repository | CRUD | `member_claims_submit_repository.go:48-69` (byte-near-identical `memorial_not_claimable` block) | exact (named Vorbild in CONTEXT.md, verified) |
| `backend/internal/handlers/admin_content_member_stories.go` (D-16, **delete entirely**) | handler (dead code) | CRUD | n/a — removal target; routes at `backend/cmd/server/admin_routes.go:238-242` | exact (removal target) |
| `database/migrations/0062_member_group_stories.*.sql`, `0068_member_group_stories_tiptap.*.sql` (D-16, drop table) | migration | CRUD (schema) | n/a — removal target, 0 Datensätze bestätigt | exact (removal target) |
| `frontend/src/lib/api/history.ts` (D-16, remove `MemberStoryContext*`/`listMemberGroupStories`/etc., ~12 call sites) | API client | request-response | n/a — removal target; 0 Frontend-Konsumenten bestätigt | exact (removal target) |
| `frontend/src/lib/api/fansubs-members.ts:175` (D-16, remove member-stories fetch) | API client | request-response | n/a — removal target | exact (removal target) |
| `frontend/src/lib/api/admin/anime-taxonomy.ts:42-67` `getAdminTagTokens` (D-08, keep — re-exported via `@/lib/api` barrel) | API client | request-response | sibling `getAdminGenreTokens` in same file (lines 15-40) | exact |
| `frontend/src/lib/api/admin-anime-intake.ts:196-220` `getAdminTagTokens` (D-08, **remove, redirect caller**) | API client (duplicate) | request-response | `anime-taxonomy.ts:42-67` — near-identical fetch, different auth/fetch helper (`apiClientFetch` vs `authorizedFetch`) | exact (duplicate pair) |
| `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts:15` (D-08, switch import to `@/lib/api`) | hook | request-response | `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts:3` (already imports `getAdminTagTokens` from `@/lib/api`) | exact |
| `backend/internal/handlers/admin_content_release_version_media_replace_display.go` `rvmReplaceDisplayPath` (D-10, **merge into services variant**) | handler helper (duplicate) | file-I/O | `backend/internal/services/media_service_display_variant.go:108-114` `displayVariantFileName` (canonical, handles both `original.<ext>` and per-asset-name cases) | exact (named Vorbild in CONTEXT.md, verified) |
| `backend/internal/services/release_version_media_cleanup_test.go:454-` `TestRVMPreviewAssignmentIsExclusive`, `backend/internal/handlers/segment_validation_test.go:117-`, `backend/internal/repository/admin_content_theme_asset_locks_test.go:9-`, `backend/internal/repository/segment_playback_resolution_test.go:64-` (D-09, convert to behavior tests) | test (source-inspection, to replace) | n/a | `backend/internal/handlers/admin_content_anime_project_notes_test.go:45-124` (real httptest+fake-repo behavior tests in same package; line 126-130 shows the one CLAUDE.md-sanctioned absence-check exception) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx` (D-11, deflake) | test | event-driven | sibling deterministic tests in same directory (e.g. `FansubBasicInfoTab.test.tsx`) using the same `vi.mock('@/lib/api', ...)` pattern without timing dependency | role-match |

## Pattern Assignments

### D-01 — Theme-type Kürzel aus DB statt Namens-Raten

**Analog (migration):** `database/migrations/0171_fansub_group_kuerzel.up.sql`

```sql
-- kuerzel ist die vom Admin gepflegte Original-Schreibweise (GAP-07: wird
-- überall exakt so angezeigt, nie normalisiert). normalized_kuerzel ist eine
-- ...
ALTER TABLE fansub_groups ADD COLUMN kuerzel VARCHAR(32);
ALTER TABLE fansub_groups ADD COLUMN normalized_kuerzel VARCHAR(32);
CREATE UNIQUE INDEX uq_fansub_groups_normalized_kuerzel
    ON fansub_groups (normalized_kuerzel)
    WHERE normalized_kuerzel IS NOT NULL;
```

Copy this shape for a new `theme_types.kuerzel VARCHAR(8)` column (no normalized/unique variant
needed — kuerzel is fixed enum-like data: `OP`, `ED`, `IN`, `OUT`), seeded directly in the `up.sql`
for the 4 known rows (`theme_types` currently only has `id, name` — confirmed via
`database/migrations/0044_add_db_schema_v2_target_tables.up.sql:47`).

**Analog (repository SELECT to extend):** `backend/internal/repository/admin_content_anime_themes_core.go:50-63`
```go
rows, err := r.db.Query(ctx, `
    SELECT
        t.id,
        t.anime_id,
        t.theme_type_id,
        tt.name AS theme_type_name,
        t.title,
        t.created_at
    FROM themes t
    JOIN theme_types tt ON tt.id = t.theme_type_id
    WHERE t.anime_id = $1
    ORDER BY t.theme_type_id, t.id
`, animeID)
```
Add `tt.kuerzel AS theme_type_kuerzel` to this SELECT and the 3 equivalent SELECTs in
`backend/internal/repository/admin_content_anime_segments_crud.go` (lines 136, 512, 616, all with
the identical `tt.name AS theme_type_name ... JOIN theme_types tt` shape).

**Removal target:** `frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts`
(full file, 78 lines) — confirmed dead per `data/11-status-label-darstellung.md` (test-only
import). The surviving `SegmenteTab.helpers.tsx` keeps the same function *names*
(`getTypeBadgeLabel`, `getTypeColor`, `isUpperSpur`, `SegmentTimeline`) but their *bodies* switch
from `typeName.toUpperCase().includes('OP')`-style guessing (lines 7-38) to reading the new
`theme_type_kuerzel` field directly off `AdminThemeSegment`.

**Behavior-change note:** the existing test asserting `Outro → PV` must be corrected to assert
`Outro → OUT` (bewusste Verhaltenskorrektur per D-01, not "grün biegen").

---

### D-02 — `anime_contributions` duplicate rows, code fix

**Two parallel write paths exist** — the root-cause investigation (`D-02`'s explicit "Ursache
finden" task) should compare these:

**Path 1 — unsafe, no upsert:** `backend/internal/repository/anime_contributions_write_repository.go:16-62`
```go
func (r *AnimeContributionsRepository) Create(ctx context.Context, fansubGroupID int64, animeID int64, input AnimeContributionInput) (*AnimeContributionRow, error) {
    ...
    err = tx.QueryRow(ctx, `
        INSERT INTO anime_contributions (
            fansub_group_id, anime_id, member_id, status, note,
            started_year, ended_year, is_public_on_anime_page,
            is_public_on_member_profile, created_by, updated_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9, $9, NOW(), NOW())
        RETURNING id
    `, ...)
```
No `ON CONFLICT` clause — relies entirely on the caller never invoking `Create` twice for the same
`(fansub_group_id, anime_id, member_id, release_version_id)` tuple. `release_version_id` is not
even passed here (implicitly NULL), which interacts with the `UNIQUE NULLS NOT DISTINCT` constraint
differently than Path 2.

**Path 2 — safe upsert (the pattern to copy):** `backend/internal/repository/anime_contributions_upsert_repository.go:150-217`
```go
err = tx.QueryRow(ctx, `
    INSERT INTO anime_contributions (
        fansub_group_id, anime_id, member_id, status, note,
        started_year, ended_year, is_public_on_anime_page,
        is_public_on_member_profile, release_version_id,
        created_by, updated_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $11, $10, $10, NOW(), NOW())
    RETURNING id
`, ...)
```
(the `if idExists { UPDATE ... } else { INSERT ... }` branch above it, lines 125-179, is the
upsert-by-known-id guard worth copying into `Create` or replacing `Create`'s callers with this
repository instead).

**Constraint history (for the fix):** `UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, member_id, release_version_id)`
was introduced in `database/migrations/0105_anime_contributions_member_id.up.sql:69` (superseding
the 3-column constraint from `0088_anime_contributions_constraints.up.sql:23` and the
`release_version_id`-inclusive one from `0091_anime_contributions_release_version.up.sql:27`). Any
fix must either (a) add `ON CONFLICT (fansub_group_id, anime_id, member_id, release_version_id) DO
NOTHING/UPDATE` to `Create`, or (b) migrate `Create`'s callers onto the upsert repository.

---

### D-03 — ASCII-Umlaute

**Violation:** `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts:160`
```ts
setToast("Tag hinzugefuegt.");
```
**Correct sibling in the same file** (line 230):
```ts
setToast("Änderungen gespeichert.");
```
Fix: `"Tag hinzugefuegt."` → `"Tag hinzugefügt."`. Also grep repo-wide for further ASCII-umlaut
user-strings (`ae|oe|ue|Ae|Oe|Ue|ss` substitutions) per D-03's broader mandate — this file is only
the one CONTEXT.md names explicitly.

---

### D-04 — Native Felder → `@/components/ui` Primitives (Fansub-Anlegeseite)

**Analog (already-migrated sibling page, same domain):** `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`

**Imports pattern** (line 11):
```tsx
import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";
```

**Input pattern** (lines 106-119):
```tsx
<Input
  id="fansub-group-name"
  disabled={!canEditGeneral}
  value={form.name}
  onChange={(e) =>
    setForm((c) => ({ ...c, name: e.target.value }))
  }
  required
  minLength={2}
  invalid={Boolean(nameError)}
/>
```

**Select pattern** (lines 219-226):
```tsx
<Select
  id="fansub-group-type"
  value={form.groupType}
  disabled={!canEditBroad}
  onChange={(event) => setForm((current) => ({ ...current, groupType: event.target.value as typeof current.groupType }))}
>
  <option value="group">Fansubgruppe</option>
</Select>
```

**Violations to migrate** (exact native counterparts, confirmed 9 total):
- `frontend/src/app/admin/fansubs/create/page.tsx:379` (name `<input>`), `:406` (slug `<input>`),
  `:457` (status `<select>`), `:477` (groupType `<select>`), `:491` (country `<input>`)
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx:66` (link_type
  `<select>`), `:88` (name `<input>`), `:104` (url `<input>`)
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx:43` (alias `<input>`)

Each maps 1:1 onto a field already migrated in `FansubBasicInfoTab.tsx` (name, slug, status,
groupType, country are literally the same field set). Alias `Input` analog is
`FansubBasicInfoTab.tsx:307-315` (`invalid` prop + `onKeyDown` for Enter-to-add).

---

### D-06 — Test-DB-Fixture nachziehen

**Analog (broader, already includes the needed schema):** `backend/internal/testsupport/phase137_postgres.go:25-35`
```go
// OpenPhase137Postgres opens the dedicated Phase-137 fixture and prepares the
// minimal member/app_user/fansub_group/membership stand-in tables plus the
// real migration chain (0085, 0100, 0108, 0112, 0146, 0150) that together
// build the exact action_definitions/role_definitions/role_capabilities/
// user_group_capability_overrides/user_group_capability_override_history
// schema the Phase-137 repository primitives are tested against.
func OpenPhase137Postgres(t *testing.T) *pgxpool.Pool {
    t.Helper()
    return openPhasePostgres(
        t,
        phase137DSNEnv,
        phase137DatabasePattern,
        "phase137_",
        phase137SchemaPattern,
        createPhase137Prerequisites,
    )
}
```
**File to extend:** `backend/internal/testsupport/phase107_postgres.go` (125 lines, builds
`members`/`app_users`/`fansub_groups`/`fansub_group_members`/`member_claims`/`audit_logs` etc. but
is missing `user_group_capability_overrides`). Follow `phase137_postgres.go`'s pattern of running
the *real migration chain* for the capability-override tables rather than hand-rolling
`CREATE TABLE` stubs for them (hand-rolled stubs are what `phase107_postgres.go` currently does for
its other tables, lines 56-161) — the 137 approach is the more current, less-drift-prone pattern
per CLAUDE.md's "most recently modified" analog-ranking rule.

---

### D-08 — `getAdminTagTokens` doppelt

**Kept/canonical version (re-exported via `@/lib/api` barrel):** `frontend/src/lib/api/admin/anime-taxonomy.ts:42-67`
```ts
export async function getAdminTagTokens(
  params: { query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminTagTokensResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  const tagQuery = (params.query || "").trim();
  if (tagQuery) query.set("query", tagQuery);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    query.set("limit", String(params.limit));
  const url = `${API_BASE_URL}/api/v1/admin/tags${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authorizedFetch(url, { authToken, cache: "no-store" });
  ...
}
```
Confirmed in barrel: `frontend/src/lib/api.ts:6` → `export * from "./api/admin/anime-taxonomy";`
Confirmed consumer already on the correct one:
`frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts:3` → `import { getAdminGenreTokens, getAdminTagTokens } from '@/lib/api'`.

**Duplicate to remove:** `frontend/src/lib/api/admin-anime-intake.ts:196-220` (uses
`apiClientFetch`/relative URL instead of `authorizedFetch`/`getApiBaseUrl`, and is NOT re-exported
from the `@/lib/api` barrel — only reachable via direct deep import).

**Caller to redirect:** `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts:14-15`
```ts
import {
  getAdminTagTokens,
} from "@/lib/api/admin-anime-intake";
```
→ change to import from `@/lib/api` (barrel), matching `useAnimePatchImpl.ts`'s existing import.

---

### D-09 — Quelltext-Inspektionstests → Verhaltenstests

**Files to rewrite (confirmed to exist with the `os.ReadFile`+`strings.Contains` pattern):**
- `backend/internal/services/release_version_media_cleanup_test.go:454-` `TestRVMPreviewAssignmentIsExclusive`
  (`src, err := os.ReadFile("../handlers/admin_content_release_version_media_patch.go")`)
- `backend/internal/handlers/segment_validation_test.go:117-` `TestCreateUpdateAnimeSegment_SharedValidationSeamExists`
- `backend/internal/repository/admin_content_theme_asset_locks_test.go:9-25` `TestThemeAssetUploadLocks_SourceInvariants`
- `backend/internal/repository/segment_playback_resolution_test.go` (multiple, via a shared `content, err := os.ReadFile(...)` helper at line 18)

**Analog for the replacement (real behavior test, same package style):** `backend/internal/handlers/admin_content_anime_project_notes_test.go:45-69`
```go
func TestAnimeProjectNoteUpsertDelegatesOnceAndKeepsResponseShape(t *testing.T) {
    gin.SetMode(gin.TestMode)
    loadAppAuthCapabilityTestCache(t)
    created := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)
    stub := &projectNoteCreditStub{note: &repository.AnimeFansubProjectNote{...}}
    handler := &AdminContentHandler{
        permissionSvc:        permissions.NewService(contributionsPermissionResolverAllowed{}),
        tiptapSvc:            services.NewTipTapService(),
        projectNoteCreditSvc: stub,
    }
    body := []byte(`{"title":"Projekt", ...}`)
    c, recorder := projectNoteHandlerContext(http.MethodPut, "/api/v1/admin/fansubs/41/anime/61/notes", body)

    handler.UpsertAnimeFansubProjectNote(c)

    require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
    require.Equal(t, 1, stub.upsertCalls)
    require.Contains(t, recorder.Body.String(), `"ID":91`)
}
```
Note: the *same file* also contains `TestAnimeProjectNoteHandlerOwnsNoLedgerPolicy` (lines 126-131)
using `os.ReadFile`+`strings.Contains` — this is the CLAUDE.md-sanctioned **absence-check
exception** ("ein Bezeichner darf NIRGENDS in der Datei vorkommen"), not a pattern to remove. Use
it only as a model for genuinely-absence-only assertions; everything else must become a real
`httptest`+fake-repo call per CLAUDE.md's Teststil rule.

---

### D-10 — `displayVariantFileName` / `rvmReplaceDisplayPath` merge

**Canonical (keep, extend):** `backend/internal/services/media_service_display_variant.go:102-114`
```go
// displayVariantFileName names the display variant after its original so several originals in
// one shared directory never overwrite each other's display file. ...
func displayVariantFileName(originalPath string, ext string) string {
    base := filepath.Base(originalPath)
    stem := strings.TrimSuffix(base, filepath.Ext(base))
    if stem == "" || stem == "original" {
        return "display." + ext
    }
    return stem + "_display." + ext
}
```
**Duplicate (remove, redirect caller):** `backend/internal/handlers/admin_content_release_version_media_replace_display.go:18-20`
```go
func rvmReplaceDisplayPath(assetDir string, ext string) string {
    return filepath.Join(assetDir, "display."+ext)
}
```
Caller at `backend/internal/handlers/admin_content_release_version_media_replace.go:269`:
```go
displayPath := rvmReplaceDisplayPath(assetDir, displayExt)
```
`rvmReplaceDisplayPath`'s behavior is a *subset* of `displayVariantFileName`'s "original" branch
(always `"display.<ext>"`, no per-asset-name case) — since replace always targets the
`original.<ext>` file per the handler's own context, redirecting the caller to
`displayVariantFileName(originalAssetPath, displayExt)` (cross-package call, `services` → import
into `handlers`) replaces both with the one already-exercised function.

---

### D-16 — Member-Group-Story-Entfernung (Paket A, no checkpoint)

**Handler to delete entirely:** `backend/internal/handlers/admin_content_member_stories.go` (228 lines)
**Routes to delete:** `backend/cmd/server/admin_routes.go:238-242`
```go
v1.GET("/admin/fansubs/:id/member-stories/context", auth, deps.adminContentHandler.GetMemberGroupStoryContext)
v1.GET("/admin/fansubs/:id/member-stories", auth, deps.adminContentHandler.ListMemberGroupStories)
v1.POST("/admin/fansubs/:id/member-stories", auth, deps.adminContentHandler.CreateMemberGroupStory)
v1.PATCH("/admin/fansubs/:id/member-stories/:storyId", auth, deps.adminContentHandler.UpdateMemberGroupStory)
v1.DELETE("/admin/fansubs/:id/member-stories/:storyId", auth, deps.adminContentHandler.DeleteMemberGroupStory)
```
**Migrations to drop (0 Datensätze):** `database/migrations/0062_member_group_stories.{up,down}.sql`,
`database/migrations/0068_member_group_stories_tiptap.{up,down}.sql`.
**Frontend to clean up:** `frontend/src/lib/api/history.ts` — all `MemberStoryContext*`/
`*MemberGroupStory*` exports (types imported at line 12, raw mappers at lines 148-241, fetchers at
lines 398-530, all hitting `/api/v1/admin/fansubs/:id/member-stories*`); and
`frontend/src/lib/api/fansubs-members.ts:175` (one fetch call plus the "joined this file" comment
at line 4 explaining history). Both confirmed 0 frontend consumers outside these definitions.

---

### D-17 — `AcceptClaimInvitation` fehlender `disabled`-Check

**Vorbild (verified):** `backend/internal/handlers/app_auth_invitations.go:310-324`
```go
func (h *AppAuthHandler) AcceptFansubInvitation(c *gin.Context) {
    identity, actor, ok := permissionActorFromContext(c)
    if !ok {
        return
    }
    if h.invitationRepo == nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
        return
    }

    result := h.permissionSvc.CanAcceptInvitation(actor)
    if !result.Allowed {
        writePermissionDenied(c, result)
        return
    }
    ...
```
`CanAcceptInvitation` (`backend/internal/permissions/permissions.go:603-616`):
```go
func (s *Service) CanAcceptInvitation(actor Actor) Result {
    if actor.AppUserID <= 0 {
        return denied(ReasonUnauthorized, "aktueller app-user fehlt")
    }
    if strings.TrimSpace(actor.Status) == "disabled" {
        return denied(ReasonDisabledUser, "deaktivierter benutzer")
    }
    return Result{Allowed: true, ReasonCode: ReasonAllowed, ...}
}
```

**Target (currently missing the check):** `backend/internal/handlers/member_claim_invitations_handler.go:144-170`
```go
func (h *MemberClaimInvitationsHandler) AcceptClaimInvitation(c *gin.Context) {
    identity, ok := requireMeIdentity(c)
    if !ok {
        return
    }
    if h.invitationsRepo == nil {
        internalError(c, "interner serverfehler")
        return
    }
    // <-- no permissionSvc.CanAcceptInvitation(...) call here; disabled users pass through.
    var req acceptMemberClaimInvitationRequest
    ...
```
`requireMeIdentity` (`backend/internal/handlers/contributions_me_handler.go:90`) returns an
`AuthIdentity`, not a `permissions.Actor` — to call `CanAcceptInvitation`, either switch to
`permissionActorFromContext(c)` (same helper `AcceptFansubInvitation` uses, in
`backend/internal/handlers/permission_authz.go:13`) or build an `Actor` from the existing identity
plus a status lookup. `h.permissionSvc` is already available on `MemberClaimInvitationsHandler`
(used at lines 60, 113, 199 for `CanForFansubGroup`).

---

### D-18 — Notizen-Tab Gate/Buttons ohne `foundingOnly`-Pendant

**Gate (ODER-Verknüpfung, too broad):** `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts:45-46`
```ts
case "notes":
  return Boolean(capabilities.can_edit_notes || capabilities.can_edit_founding_history);
```

**Vorbild — `foundingOnly` flag, already live elsewhere in this exact file tree:**
`frontend/src/components/groups/GroupHistorySection.tsx:290,345-350,515-517`
```tsx
export function GroupHistorySection({ ..., readOnly = false, foundingOnly = false }: GroupHistorySectionProps) {
  ...
  const eventOptions = useMemo(() => {
    const options = buildHistoryEventOptions(...)
    return foundingOnly ? options.filter((option) => option.value === 'founding') : options
  }, [...])
  ...
  const canAddEntry = !readOnly && (!foundingOnly || !entries.some((entry) => entry.event_type === 'founding'))
  const canEditEntry = (entry: GroupHistoryRow) => !readOnly && (!foundingOnly || entry.event_type === 'founding')
  const canDeleteEntry = !readOnly && !foundingOnly
```
**This flag is already wired for the founding-history-only permission** at the exact call site
that sits next to `NotesTab` in the same tab:
`frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx:128-142`
```tsx
{activeMainTab === "notes" ? (
  <>
    <NotesTab fansubId={fansubID} />
    <GroupHistorySection
      fansubGroupId={fansubID}
      foundingOnly={!isPlatformAdmin && !capabilities?.can_edit_group && Boolean(capabilities?.can_edit_founding_history)}
      ...
    />
  </>
) : null}
```
`NotesTab` (`frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx:65-66`) takes **only**
`{ fansubId }` — no `capabilities`/`isPlatformAdmin`/founding-only prop at all, so a
founding-history-only editor let in by the OR-gate above gets full, unrestricted group-note
CRUD (add/edit/delete buttons at lines 189-222 have no permission gating whatsoever). Fix options
per D-18 (either is acceptable): (a) add a `foundingOnly`-style prop to `NotesTab` mirroring
`GroupHistorySection`'s `canAddEntry`/`canEditEntry`/`canDeleteEntry` booleans and disable/hide the
add/edit/delete controls at lines 210-222 and inside `GroupNoteEditor`/`GroupNotePreview`
(`NotesTab.helpers.tsx`), or (b) introduce `ActionFansubGroupPageFoundingHistoryEdit` and enforce it
server-side in the notes handler, narrowing the frontend gate at `fansubEditAccess.ts:46` to match.
Button-level founding-only precedent to copy either way:
`frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx:83-85`
```tsx
const canEditBroad = isPlatformAdmin || Boolean(capabilities?.can_edit_group);
const canEditGeneral = canEditBroad || Boolean(capabilities?.can_edit_group_general);
const canEditFounding = canEditBroad || Boolean(capabilities?.can_edit_founding_history);
```

---

### D-19 — Legacy `DELETE /fansubs/:id/members/:memberId`

**Handler to delete:** `backend/internal/handlers/fansub_group_members.go:164-207`
```go
// DeleteFansubMember entfernt ein Mitglied aus einer Fansub-Gruppe.
func (h *FansubHandler) DeleteFansubMember(c *gin.Context) {
    identity, ok := h.requireAdmin(c)
    ...
    if err := h.fansubRepo.DeleteMember(c.Request.Context(), fansubID, memberID); errors.Is(err, repository.ErrNotFound) {
    ...
```
**Route to delete:** `backend/cmd/server/admin_routes.go:133`
```go
v1.DELETE("/fansubs/:id/members/:memberId", auth, deps.fansubHandler.DeleteFansubMember)
```
Confirmed 0 frontend callers outside tests (CONTEXT.md claim verified structurally — route is the
only `/fansubs/:id/members/:memberId` DELETE registration in `admin_routes.go`).

---

### D-20 — Tote Spalte `anime_contributions.review_status_id`

**Write-only usage (confirms dead):** `backend/internal/handlers/contributions_me_handler.go:365,389`
(inserts `review_status_id` into `anime_contributions`, never read back for review decisions — all
other `review_status_id` references repo-wide are for `media_assets`, a different table, per the
full grep sweep across `backend/internal/repository/*.go`).
**Schema origin:** `database/migrations/0097_v12_status_foundation.up.sql:58,79,114-116`. Drop via a
new down-style migration plus removal of the two write sites.

---

### D-21 — Doppelter Memorial-Guard

**Keep (Vorbild named in CONTEXT.md, verified):** `backend/internal/repository/member_claims_submit_repository.go:48-69`
```go
if profileStatus == "memorial" {
    _ = func() error {
        if r.auditLogRepo == nil {
            return nil
        }
        return r.auditLogRepo.Write(ctx, AuditLogEntry{
            ActorAppUserID: &input.AppUserID,
            EventType:      "member_claim.memorial_blocked",
            TargetType:     "member",
            TargetID:       &input.MemberID,
            Action:         "submit_claim",
            Outcome:        "denied",
        })
    }()
    return nil, &ClaimMutationError{
        Code:       "memorial_not_claimable",
        Message:    "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.",
        HTTPStatus: 409,
    }
}
```
**Duplicate to merge:** `backend/internal/repository/member_claim_invitations_repository.go:187-215`
(byte-near-identical block, only difference: no `ActorAppUserID` in the audit entry and a different
`Action: "accept_invitation"` value, and the profile_status query is embedded in a transaction).
Extract a shared helper (e.g. `checkMemorialNotClaimable(ctx, db-or-tx, memberID, actorAppUserID,
action) error`) in a shared location (both repos are in package `repository`) and call it from both
sites, preserving each call site's own `Action` string and tx-vs-pool DB handle.

---

## Shared Patterns

### `@/components/ui` primitives (applies to D-04)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx:11` (`import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";`)
**Apply to:** All 9 native-field violations on the fansub create page (D-04).

### CSS Proxy-merge for combined styles objects (applies to D-12)
**Source:** `frontend/src/components/ui/Select.tsx:5-9`
```ts
import ownStyles from './Select.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})
```
**Why not `{ ...shared, ...own }`:** per `174-23-SUMMARY.md`, CSS-module exports under
Vitest/jsdom have `Object.keys() === []` (a bare `get`-trap, no enumerable own keys), so an object
spread silently copies nothing and every class name comes out `undefined` under test — a latent bug
already flagged as present in exactly the 16 `frontend/src/app/admin/fansubs/[id]/edit/*.tsx` files
D-12 targets (e.g. `GroupMembersTab.tsx`, `NotesTab.tsx`, `FansubEditClient.tsx`), currently
undetected only because no existing test asserts a class that lives exclusively in the merged
(non-base) object.
**Apply to:** All 16 `{ ...sharedStyles, ...ownStyles }` sites under `admin/fansubs/[id]/edit/`.

### Behavior-test shape for handler tests (applies to D-09, and D-22's blanket rule)
**Source:** `backend/internal/handlers/admin_content_anime_project_notes_test.go:45-69` (httptest
via `projectNoteHandlerContext(...)` + a hand-rolled fake-repo stub + `recorder.Code`/
`recorder.Body.String()` assertions). **Apply to:** all 4 D-09 target files, and any new
Produktionscode test added anywhere in this phase per D-22.

### Permission actor + disabled-status check (applies to D-17)
**Source:** `backend/internal/permissions/permissions.go:603-616` (`CanAcceptInvitation`) +
`backend/internal/handlers/permission_authz.go:13` (`permissionActorFromContext`).
**Apply to:** `AcceptClaimInvitation` (D-17).

### `foundingOnly`-style capability narrowing (applies to D-18)
**Source:** `frontend/src/components/groups/GroupHistorySection.tsx` (`foundingOnly` prop) and
`frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx:83-85` (`canEditBroad`/
`canEditFounding` boolean derivation). **Apply to:** `NotesTab.tsx` button gating (D-18).

## No Analog Found / Not File-Pattern-Shaped

| Item | Role | Reason |
|---|---|---|
| D-13 (Prüfkette), D-14 (Git-Disziplin), D-15 (globale UI-Regeln, cross-cutting restatement), D-22 (Ausführungsregeln) | process | These are phase-wide execution rules, not individual files — apply them to every plan rather than mapping to a single analog. |
| D-23 (Bestandsdaten-Bereinigung) | data migration / ops | Blocked on a user checkpoint; no code file to pattern-match until the checkpoint is cleared — when it is, the cleanup SQL should follow the backup-then-`DELETE ... WHERE ctid NOT IN (...)`-style dedup pattern common in this repo's `database/migrations/*backfill*.sql` files (none found as an exact precedent for `anime_contributions` dedup specifically — this needs fresh SQL, not a copy). |
| D-05 (6 Frontend-Baseline-Tests, `ReleaseDetailHero.test.tsx`, `openapi.yaml` duplicate key) | test / config fix-in-place | Each is "fix this specific known-red test/file", not a new file needing a role/analog — the fix is local to the file itself; consult its own sibling green tests in the same suite. |

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/permissions/`, `backend/internal/testsupport/`, `backend/cmd/server/`,
`database/migrations/`, `frontend/src/app/admin/fansubs/`, `frontend/src/app/admin/anime/`,
`frontend/src/app/admin/episode-versions/`, `frontend/src/components/groups/`,
`frontend/src/components/ui/`, `frontend/src/lib/api/`.
**Files scanned:** ~60 (targeted Glob/Grep + Read, no full-repo scan).
**Pattern extraction date:** 2026-10-07.
