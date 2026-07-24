# Phase 108: Bestehende Beitragsquellen anbinden - Pattern Map

**Mapped:** 2026-07-24  
**Files analyzed:** 20 likely new/modified files  
**Analogs found:** 20 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `database/migrations/0137_phase108_contribution_sources.up.sql` | migration/config | CRUD | `database/migrations/0131_member_point_foundation.up.sql` | exact |
| `database/migrations/0137_phase108_contribution_sources.down.sql` | migration/config | CRUD | `database/migrations/0131_member_point_foundation.down.sql` | exact |
| `backend/internal/migrations/phase108_contribution_sources_test.go` | test | batch | existing `Phase106` migration tests + migration 0131 | role-match |
| `backend/internal/repository/release_crew_snapshot_repository.go` | repository | CRUD/transform | `backend/internal/repository/anime_contributions_upsert_repository.go` | exact |
| `backend/internal/repository/release_crew_snapshot_repository_test.go` | test | CRUD/concurrency | `backend/internal/repository/anime_contributions_release_lookup_repository_test.go` | role-match |
| `backend/internal/services/release_crew_service.go` | service | CRUD/transactional | `backend/internal/services/point_service.go` | exact |
| `backend/internal/services/release_crew_service_test.go` | test | CRUD/concurrency | `backend/internal/services/point_service_credit_test.go` and `point_service_reverse_test.go` | exact |
| `backend/internal/services/project_note_credit_service.go` | service | CRUD/transactional | `backend/internal/services/point_service.go` + `anime_project_notes_repository.go` | exact |
| `backend/internal/services/project_note_credit_service_test.go` | test | CRUD/concurrency | `backend/internal/services/point_service_credit_test.go` | exact |
| `backend/internal/repository/anime_project_notes_repository.go` | repository | CRUD | same file, existing project-note lifecycle | exact |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | repository | CRUD/transactional | same file, release/group creation transaction | exact |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` | handler | request-response | same file, effective-contributions handler | exact |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` | test | request-response | same file, permission-first handler test | exact |
| `backend/internal/handlers/admin_content_anime_project_notes.go` | handler | request-response | same file, existing note handlers | exact |
| `shared/contracts/openapi.yaml` | contract/config | request-response | existing project-note and admin contribution schemas | exact |
| `shared/contracts/admin-content.yaml` | contract/config | request-response | `EffectiveContributionsResponse` and project-note operations | exact |
| `frontend/src/types/fansub.ts` | model | transform | `EffectiveContributionRow` / `EffectiveContributionsResponse` | exact |
| `frontend/src/lib/api.ts` | service/client | request-response | existing effective-contribution and project-note helpers | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` | component | request-response | same component, staged full-set editor | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` and `frontend/src/lib/api.auth-refresh.test.ts` | test | request-response | same tests | exact |

The research names the two new services and snapshot repository explicitly. Existing handler, note repository, import helper, contract, DTO, client, and drawer seams should be extended rather than paralleled.

## Pattern Assignments

### Release crew service and snapshot repository

**Targets:** `release_crew_service.go`, `release_crew_snapshot_repository.go`, their tests, and the contribution handler.

**Transaction and stable context lock:** copy the advisory transaction-lock convention from `backend/internal/repository/anime_contributions_upsert_repository.go:29-50`, but lock the whole `(release_version_id, fansub_group_id)` snapshot rather than one member:

```go
func contributionMemberContextLockValue(... releaseVersionID *int64) string {
    releaseKey := "anime"
    if releaseVersionID != nil {
        releaseKey = fmt.Sprintf("release:%d", *releaseVersionID)
    }
    return fmt.Sprintf("anime-contribution-member:%d:%d:%d:%s", ...)
}

SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))
```

**Full replacement:** copy the atomic role replacement from `anime_contributions_upsert_repository.go:196-215` and lift it to a complete set:

```go
DELETE FROM anime_contribution_roles WHERE anime_contribution_id = $1

for _, code := range input.RoleCodes {
    INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
    VALUES ($1, $2)
}
```

Normalize requested rows to unique `(member_id, role_code)` units, load the previous complete set under lock, calculate `removed`, `unchanged`, and `added`, replace all stored rows, persist `snapshot_mode`, and invoke ledger operations only for the diff. The existing repository owns its transaction (`anime_contributions_upsert_repository.go:107-111,217-219`), so the new repository must expose DBTX/`...InTx` operations and must not call `CreateOrUpdate` from inside the service.

**Point awards and reversals:** use only `backend/internal/services/point_service.go:50-67` and `112-128`:

```go
rule, err := repository.NewPointRulesRepository(db).
    GetByRef(ctx, cmd.Rule.Code, cmd.Rule.Version)
entry, err := repository.NewPointLedgerRepository(db).InsertAward(ctx,
    repository.PointAwardInput{
        MemberID: cmd.MemberID,
        SourceType: cmd.Source.Type,
        SourceKey: cmd.Source.Key,
        RulePointValue: rule.PointValue,
        IdempotencyKey: buildCreditIdempotencyKey(cmd),
    })

original, err := ledger.GetForUpdate(ctx, cmd.AwardEntryID)
entry, err := ledger.InsertReversal(ctx, repository.PointReversalInput{
    OriginalEntryID: cmd.AwardEntryID,
    IdempotencyKey: "v1|reversal|award:" + strconv.FormatInt(cmd.AwardEntryID, 10),
})
```

`PointService` derives the award key from semantic source data (`point_service.go:90-92`):

```go
return "v1|" + string(cmd.Source.RewardKind) + "|" +
    cmd.Source.Type + "|" + cmd.Source.Key +
    "|beneficiary:" + strconv.FormatInt(cmd.MemberID, 10) +
    "|slot:" + cmd.Source.Slot
```

Use the selected worker `member_id`, real `release_version_id`, group context, role slot, and an adapter-owned restoration generation. The actor is audit context only. D-19a requires a new append-only award generation after a prior reversal; never delete/update ledger history or reuse the permanently consumed initial idempotency key.

**Error handling:** follow wrapped operation-specific errors and map FK/unique violations as in `anime_contributions_upsert_repository.go:188-213`. Any validation, context mismatch, snapshot write, award, reversal, restoration, or commit error rolls back the single outer transaction.

### Release creation and inherited synchronization

**Target:** `backend/internal/repository/episode_import_repository_release_helpers.go` and the project-team mutation seam discovered during implementation.

The creation chain already carries `pgx.Tx`. Seed only after the canonical group association exists. Exact anchor: `episode_import_repository_release_helpers.go:81-94`:

```go
if err := upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media); err != nil {
    return false, err
}
for index, episodeNumber := range mapping.TargetEpisodeNumbers {
    // further writes use the same tx
}
```

The group link itself is full-set reconciliation in `episode_import_repository_release_helpers.go:172-199`:

```go
memberGroups, err := resolveImportFansubSelection(ctx, tx, mapping, media)
DELETE FROM release_version_groups
WHERE release_version_id = $1
  AND fansub_group_id <> ALL($2::bigint[])
INSERT INTO release_version_groups (release_version_id, fansub_group_id)
VALUES ($1, $2)
ON CONFLICT (...) DO NOTHING
```

Call the shared snapshot synchronizer after `upsertReleaseVersionGroup`, inside the surrounding import transaction. Project-team changes call the same synchronizer, restricted to `snapshot_mode='inherited'`. The first manual replace permanently sets `independent`, including for an empty set. Do not implement read fallback or “reset to project”.

### Project-note credit lifecycle

**Targets:** `project_note_credit_service.go`, `anime_project_notes_repository.go`, note handler, and tests.

Retain `anime_fansub_project_notes` as the only content owner. Reuse its server-side context guard (`anime_project_notes_repository.go:12-32`):

```go
SELECT EXISTS (
    SELECT 1 FROM anime_fansub_groups
    WHERE anime_id = $1 AND fansub_group_id = $2
)
```

Use `BodyText` as the eligibility predicate (`anime_project_notes_repository.go:35-55,71-83`) and `strings.TrimSpace(bodyText) != ""`; do not infer non-empty content from HTML or JSON shells.

Refactor the existing upsert and soft-delete SQL into DBTX-compatible methods, preserving their semantics:

```go
// anime_project_notes_repository.go:183-201
INSERT INTO anime_fansub_project_notes (...)
VALUES (...)
ON CONFLICT (anime_id, fansub_group_id) WHERE deleted_at IS NULL
DO UPDATE SET body_text = EXCLUDED.body_text, updated_at = NOW()

// lines 247-254
UPDATE anime_fansub_project_notes
SET deleted_at = NOW(), deleted_by_user_id = $4
WHERE id = $1 AND anime_id = $2 AND fansub_group_id = $3
  AND deleted_at IS NULL
```

Within one service transaction: lock/read lifecycle, resolve actor `app_user` to an existing member (or none), mutate note, then credit/reverse. Missing member skips only the credit; it must not block content persistence. A small adapter lifecycle row owns first-author member, award entry, generation/status; it must not duplicate note content.

### Handlers and permission boundary

**Targets:** contribution replace handler and project-note mutation handlers.

Keep permission before data access, as in `admin_content_fansub_releases_contributions_handlers.go:15-37,43-60`:

```go
versionID, ok := h.requireReleaseVersionViewAccess(c)
if !ok { return }
fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
if err != nil || fansubGroupID <= 0 {
    badRequest(c, "fansub_group_id fehlt oder ungültig")
    return
}
```

Add an edit-specific permission guard for Replace rather than weakening the existing view guard. Parse only the complete row set. The browser must not supply beneficiary, actor, point value, rule version, idempotency key, award status, effective time, or reviewer. The service joins release version → release → episode → anime and verifies the requested group/member/roles server-side.

Tests should copy the denied-before-repository and allowed response assertions from `admin_content_fansub_releases_contributions_handlers_test.go:92-161`. Preserve localized, correctly umlauted errors.

### Shared contracts, frontend DTOs, and API helper

**Targets:** both YAML contracts, `types/fansub.ts`, and `api.ts`.

Extend the existing typed seam at `frontend/src/types/fansub.ts:728-742`:

```ts
export interface EffectiveContributionRow {
  contribution_id: number;
  member_id: number;
  member_display_name: string;
  role_codes: string[];
}
export interface EffectiveContributionsResponse {
  data: EffectiveContributionRow[];
  meta: { is_override: boolean; source: 'release_version' | 'anime_default' };
}
```

Replace legacy metadata with additive canonical `snapshot_mode: 'inherited' | 'independent'` and define one request such as:

```ts
export interface ReplaceReleaseCrewRequest {
  rows: Array<{ member_id: number; role_codes: string[] }>;
}
```

Keep schema names aligned with `shared/contracts/admin-content.yaml:923,1134-1139`; update the canonical `shared/contracts/openapi.yaml` too. Do not expose ledger-internal fields in request schemas.

Use the central protected seam (`frontend/src/lib/api.ts:1371-1381`):

```ts
export async function apiClientFetch(pathOrUrl: string, options = {}) {
  const input = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${getApiBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  return authorizedFetch(input, options);
}
```

Follow existing error parsing from `api.ts:7517-7603`, but add exactly one `replaceReleaseCrew(...)` helper. Existing project-note helpers remain the mutation surface; only their response typing changes if needed.

### Release contribution drawer

**Target:** `ReleaseContributionDrawer.tsx`.

Keep the existing staged editor, scoped loading/error, cancellation guard, global UI primitives, member picker, and role toggles (`ReleaseContributionDrawer.tsx:3-27,51-111,113-179`). Replace only the save orchestration.

The current anti-pattern is concrete at lines 206-234:

```ts
await Promise.all(removedIds.map((id) => deleteAnimeContribution(...)))
await Promise.all(rowsToWrite.map((row) => upsertAnimeContribution(...)))
```

Replace it with one typed call containing the normalized complete `stagedRows` set. Close only after success. Remove fallback-specific constraints and messages at lines 190-194 and 257-265: an empty independent snapshot is valid and never falls back. Render status from `snapshot_mode`; do not add a “Projektbesetzung neu übernehmen” action.

### Migration and focused test patterns

**Targets:** migration 0137 and all Phase-108 tests.

Follow immutable rule/ledger constraints in `0131_member_point_foundation.up.sql:3-10,24-55`:

```sql
UNIQUE (rule_code, rule_version);
UNIQUE (idempotency_key);
CREATE UNIQUE INDEX uq_point_ledger_direct_reversal
ON point_ledger_entries (reversal_of_entry_id)
WHERE reversal_of_entry_id IS NOT NULL;
```

Add schema/status/lifecycle structures and fixed rule rows only. No `INSERT ... SELECT`, backfill, reconciliation, compatibility view, historical award scan, or edits to old migrations. Re-check `git status` and the migration chain immediately before implementation.

For service tests, copy the transaction doubles and lifecycle assertions from `point_service_credit_test.go:21-59,164-180`; inject failures after domain replacement/note mutation and after individual ledger operations. Copy semantic idempotency assertions from lines 116-160. Add sequential and concurrent retries, restoration, and the exact Gon/Mia/Anton Release 176 set-diff.

For UI tests, keep staged-before-save behavior from `ReleaseContributionDrawer.test.tsx:265-313`, but assert a single Replace call with the entire set and no row-level calls. Test inherited/independent display, empty independent persistence, Anton preservation, and absence of reset control.

For auth regression, copy the refresh-only session pattern from `frontend/src/lib/api.auth-refresh.test.ts:235-297`: missing/expired access plus valid refresh token must refresh centrally and complete the new Replace and project-note mutations.

## Shared Patterns

### Atomic ownership

- One outer service transaction owns domain mutation plus every `CreditInTx`, `ReverseInTx`, and restoration.
- Repositories accept the caller's DBTX; do not nest their current self-owned transactions.
- Lock the full snapshot/note lifecycle before reading the “before” state.
- Server joins and validates anime, group, release version, member, and role ownership before writes.

### Points

- Beneficiary is always `members.id`; `app_user` is optional actor/audit.
- Rule value comes from immutable `point_rules`, never request/service constants.
- Ledger remains append-only. Removal produces one reversal; restoration produces a new generation award.
- No admin, assignment, confirmation, review, metadata, release-version-note, media, or upload credits.

### API and auth

- Permission/IDOR check precedes repository access.
- Shared OpenAPI, focused admin contract, backend DTO, frontend type, and API helper change together.
- Protected browser calls use the central auth-refresh seam; components do not construct bearer headers.

### Domain and data boundaries

- Real contribution context is a real `release_version_id`, never an episode or release-level media seam.
- Project note content stays in `anime_fansub_project_notes`.
- Phase 107.1 release-version notes/media remain untouched.
- Test data is disposable: schema migration and fresh canonical entry only, no preservation/backfill.

## No Analog Found

None. The new files have direct transactional, repository, handler, client, UI, migration, and test analogs. The restoration-generation schema is new domain state, but its ledger behavior must extend the existing append-only `PointService` pattern rather than create a parallel ledger seam.

## Metadata

**Analog search scope:** `backend/internal/{services,repository,handlers,migrations}`, `database/migrations`, `frontend/src/{app,lib,types}`, `shared/contracts`  
**Strong analogs read:** 8 primary files plus focused tests/contracts  
**Pattern extraction date:** 2026-07-24
