# Phase 143: Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen - Pattern Map

**Mapped:** 2026-09-01
**Files analyzed:** 15 (new/modified), plus ~17 pre-existing red test files (Criterion 1, mapped as a group)
**Analogs found:** 14 / 15

This is a remediation phase. `143-CONTEXT.md` already names every touched file with exact line
numbers, and `143-UI-SPEC.md` already specifies the retrofit markup for Criterion 6/7 almost
verbatim. This document's job is narrower than usual: for each file, point at the *closest
already-shipped sibling* that proves the pattern already works in this codebase, so the planner
copies proven code instead of inventing new shapes.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0159_role_capability_defaults_reset.up/down.sql` (new, replaces 0154 target state) | migration | batch | `database/migrations/0153_techadmin_default_capabilities.up.sql` + `0154_role_capability_defaults_snapshot.up.sql` | exact (same table, same INSERT/DELETE shape) |
| `backend/internal/migrations/*_test.go` (new idempotency/down-proof test) | test | batch | `backend/internal/migrations/fresh_proof_test.go` | exact (full up/down chain proof against ephemeral DB) |
| `backend/internal/repository/release_review_query_repository.go` (extend: move 3 handler methods in) | repository | CRUD/aggregation | same file's own `Counts()` method (self-exclusion + memoization already absent there — need `attachPendingClaimAttention`'s memoization pattern too) | exact (same repo, same query family) |
| `backend/internal/handlers/dashboard_me_handler.go` (shrink: delegate to repository) | controller/handler | request-response | its own `attachPendingClaimAttention` (already delegates to `MemberClaimsRepository` + memoizes) | exact (in-file self-analog) |
| `backend/internal/repository/release_review_query_repository_test.go` (extend with new method tests) | test | CRUD/aggregation | same file, existing test style | exact |
| `backend/internal/services/release_metadata_credit_service_test.go` (new) | test | event-driven (credit-on-completion) | `backend/internal/services/project_note_credit_service_test.go` | exact (same `PointTxStarter`/`testsupport` pattern, same credit-service shape) |
| `backend/internal/repository/anime_fansub_project_timeline_repository_test.go` (new, date-validation focus) | test | CRUD | `backend/internal/repository/fansub_notes_repository_test.go` (source-inspection style) — but prefer a DB-fixture test analogous to `project_note_credit_service_test.go`'s `testsupport.OpenPhase107Postgres` seeding for the date-validation behavior itself | role-match |
| `backend/internal/handlers/anime_fansub_project_timeline_handler_test.go` (fix existing route bug) | test | request-response | existing `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker` in-place (route string fix only) | exact (in-place fix) |
| `backend/internal/repository/anime_contributions_member_project_repository.go` (fix `has_own_notes` EXISTS clause, lines 139-152) | repository | CRUD | `backend/internal/repository/release_version_notes_repository.go`'s `ListReleaseVersionNotesForMember` (already joins `release_version_note_review_lifecycle` for `review_state`) | exact (lifecycle join source) |
| `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` (`isDone()`, line 53) | component (pure function) | transform | itself — one-line predicate fix, no external analog needed | exact (in-place fix) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx` | component (form fields) | request-response (controlled form) | `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (same dir, already uses `FormField` + `Input`) | exact (sibling file, same CSS module family) |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx` | component (form section) | request-response | `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (`FormField` + `Select` in the same directory) | role-match |
| `frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css` (`.metadataError`/`.metadataSuccess`) | config (CSS module) | n/a | `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css` (`color-mix()` token pattern) | exact |
| `frontend/src/app/me/dashboard/components/AttentionSection.tsx` (new lane appended) | component | CRUD (render list) | itself — three existing lanes (`pendingGroupMediaReviews`, `pendingReleaseReviews`, `pendingClaims`) in the same file | exact (in-file sibling lanes) |
| `frontend/src/app/me/dashboard/components/AttentionSection.module.css` (new classes appended) | config (CSS module) | n/a | itself — existing `.itemCard`/`.itemLink`/`.taskChip` rules | exact |
| `frontend/src/types/dashboard.ts` (new `OwnDashboardPendingOwnNoteRevision*` types + field) | model (TS types) | transform | itself — `OwnDashboardPendingReleaseReview`/`OwnDashboardPendingGroupMediaReview` shapes | exact |
| `frontend/src/app/me/dashboard/page.tsx` (wire new prop through) | component (page) | request-response | itself — existing `pendingClaims`/`pendingGroupMediaReviews`/`pendingReleaseReviews` props | exact |
| `shared/contracts/openapi.yaml` (`PublicMemberBadge.next_tier` enum fix + new dashboard DTO fields) | config (contract) | transform | itself — `PublicMemberBadgeProgress.next_tier` (already has `platinum`, unconstrained) | exact |
| `frontend/src/types/__tests__/v12-projection-contract.test.ts:276` | test | transform | itself — one assertion string change once the contract side is fixed | exact (in-place fix) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`, `.../edit/page.test.tsx` | test | request-response (render) | `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx` (existing `vi.mock('@/providers/RoleCatalogProvider', ...)` pattern) | exact |

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx`, `members/[slug]/page.test.tsx`, the other ~10 red files from Criterion 1 not already covered above | test | n/a | These are pre-existing red tests unrelated to this phase's own code changes (per CONTEXT.md, each needs individual triage — read the specific assertion failure per file rather than following one shared pattern). No single analog applies; the planner should treat each as its own task guided by the failure message, not by a copied pattern. |

---

## Pattern Assignments

### 1. `database/migrations/0159_*.up.sql` / `.down.sql` (new migration replacing 0154's intent)

**Analog:** `database/migrations/0153_techadmin_default_capabilities.up.sql` (insert-only, 21 lines) and
`database/migrations/0154_role_capability_defaults_snapshot.up.sql` (243-line reset snapshot).

**Why not edit 0154 directly:** migrations are append-only (CLAUDE.md convention + CONTEXT.md
Kriterium 2: "0154 bleibt als angewandte Migration stehen"). A **new** migration (0159, since 0155-0158
already exist) must establish the target state.

**0153 pattern to copy (small, additive insert)** — `database/migrations/0153_techadmin_default_capabilities.up.sql:1-21`:
```sql
BEGIN;
INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('techadmin', 'fansub_group.edit'),
    -- ...
ON CONFLICT DO NOTHING;
COMMIT;
```
(Read the actual file for the exact `ON CONFLICT` clause/column list before copying verbatim.)

**0154 pattern to copy (transactional reset shape)** — `database/migrations/0154_role_capability_defaults_snapshot.up.sql:1-8`:
```sql
BEGIN;
DELETE FROM role_capabilities;
INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('co_leader', 'fansub_group.edit'),
    -- 232 rows, 15 roles
COMMIT;
```

**What the new migration must do differently (VALIDATION.md Criterion 2):**
- `up.sql`: same `DELETE` + full `INSERT` reset shape as 0154, but the row set must be a **superset**
  that keeps the 12 `techadmin` rows 0153 inserted (0154 currently wipes them — that is the bug).
- `down.sql`: must NOT be an empty `BEGIN;COMMIT;` (0154's current down does nothing). It must
  reverse to the state 0153 left behind — i.e. delete only the rows this migration added/changed,
  not blanket-wipe `role_capabilities`.
- Idempotency: applying `up.sql` twice must be a no-op (`DELETE` + full re-`INSERT` is naturally
  idempotent as long as the row list itself doesn't change between runs).

---

### 2. Migration idempotency/down-proof test (new)

**Analog:** `backend/internal/migrations/fresh_proof_test.go` (`TestPhase134MigrationFreshUpDownProof`,
`package migrations_test`, full lines read).

**Full-chain up/down proof pattern to copy:**
```go
package migrations_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/migrations"
	"team4s.v3/backend/internal/testsupport"
)

func TestPhase143MigrationFreshUpDownProof(t *testing.T) {
	maintPool := testsupport.OpenPhase134MaintenancePool(t) // reuse existing ephemeral-DB helper
	t.Cleanup(func() { maintPool.Close() })
	testsupport.DropAndCreatePhase134FreshDatabase(t, maintPool)
	t.Cleanup(func() { testsupport.DropAndCreatePhase134FreshDatabase(t, maintPool) })

	freshDSN, err := testsupport.Phase134FreshDatabaseDSN(os.Getenv("TEAM4S_PHASE134_MIGRATION_DSN"))
	require.NoError(t, err)
	freshPool, err := pgxpool.New(context.Background(), freshDSN)
	require.NoError(t, err)
	defer freshPool.Close()

	migrationsDir, err := migrations.ResolveMigrationsDir("")
	require.NoError(t, err)
	runner := migrations.NewRunner(freshPool, migrationsDir)
	ctx := context.Background()

	applied, err := runner.Up(ctx)
	require.NoError(t, err)
	// ... assert role_capabilities row count matches expectation, then apply Up again
	// and assert the row count is unchanged (idempotency), per VALIDATION.md Criterion 2.
}
```

Also useful as a narrower, migration-content-only analog (no live DB needed) is the source-contract
style test: `backend/internal/migrations/phase142_historical_role_context_test.go` (full file read,
23 lines) — asserts specific substrings are present in the `.up.sql`/`.down.sql` files via
`os.ReadFile` + `strings.Contains`. Useful as a *cheap* first assertion (e.g. "down.sql must contain
a `DELETE` targeting only 0159-added rows, not `DELETE FROM role_capabilities;` unqualified") before
reaching for the full ephemeral-DB proof above.

**Migration path helper pattern** (used by both `fresh_proof_test.go`'s ecosystem and
`project_note_credit_service_test.go`) — `backend/internal/testsupport/phase107_postgres.go:118-125`:
```go
func phase107MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-107 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
```

---

### 3. `backend/internal/repository/release_review_query_repository.go` — absorb the 3 raw-SQL handler methods

**Analog:** the file's own `Counts()` method (`backend/internal/repository/release_review_query_repository.go:146-180`)
for the aggregation/query shape, and `attachPendingClaimAttention` in
`backend/internal/handlers/dashboard_me_handler.go:134-179` for the memoization-by-map pattern that
must be *added* to the two currently-unmemoized methods.

**Self-exclusion predicate to preserve verbatim (must exist in exactly ONE place after the move —
VALIDATION.md Criterion 3's grep check)** — currently duplicated at
`backend/internal/handlers/dashboard_me_handler.go:248-256`:
```sql
WHERE lifecycle.review_state = 'pending'
  AND lifecycle.submitter_app_user_id <> $1
  AND NOT EXISTS (
    SELECT 1
    FROM member_claims own_claim
    WHERE own_claim.app_user_id = $1
      AND own_claim.claim_status = 'verified'
      AND own_claim.member_id = lifecycle.submitter_member_id
  )
```
This must move into `release_review_query_repository.go` as a new method (e.g.
`AttentionCounts`/`PendingReviewAttention`) and be deleted from the handler entirely.

**Memoization pattern to copy** (currently correct in `attachPendingClaimAttention`, missing in the
two other methods) — `backend/internal/handlers/dashboard_me_handler.go:153-169`:
```go
allowedByGroup := make(map[int64]bool)
for _, candidate := range candidates {
	allowed, checked := allowedByGroup[candidate.FansubGroupID]
	if !checked {
		result, err := h.permissionSvc.CanForFansubGroup(
			c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersLink, candidate.FansubGroupID,
		)
		if err != nil {
			return err
		}
		allowed = result.Allowed
		allowedByGroup[candidate.FansubGroupID] = allowed
	}
	if !allowed {
		continue
	}
	// ... append
}
```
Apply this exact map-memoization shape to `attachPendingGroupMediaReviewAttention` (currently calls
`CanForFansubGroup` once per row, `dashboard_me_handler.go:205`) after the query moves to the
repository — and fix `permissions.ActionFansubGroupEdit` there to the correct *review* action per
Criterion 3's finding.

**Repository query-interface pattern to copy** (small interface, not a full `*pgxpool.Pool` dependency)
— `backend/internal/repository/release_review_query_repository.go:15-18`:
```go
type releaseReviewQueryDB interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}
```

**Constructor pattern** — `backend/internal/repository/release_review_query_repository.go:83-89`:
```go
type ReleaseReviewQueryRepository struct {
	db releaseReviewQueryDB
}

func NewReleaseReviewQueryRepository(db releaseReviewQueryDB) *ReleaseReviewQueryRepository {
	return &ReleaseReviewQueryRepository{db: db}
}
```

**Handler-side result after the move** should look like `attachPendingClaimAttention` does today —
a thin loop over repository-returned rows, permission-filtering only, zero inline SQL. That existing
method is the target end-state shape for all three.

---

### 4. `backend/internal/services/release_metadata_credit_service_test.go` (new)

**Analog:** `backend/internal/services/project_note_credit_service_test.go` (full file read, 217 lines) —
same package (`services`), same `PointTxStarter`/`*PointService` dependency shape, same
`testsupport.OpenPhase107Postgres(t)` + `ApplySQLFile` fixture-seeding pattern.

**Pool + prerequisite table pattern to copy** — `backend/internal/services/project_note_credit_service_test.go:128-175`:
```go
func openReleaseMetadataCreditPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE ... ` /* release_variants, release_versions, fansub_releases, episodes, anime, etc.,
mirroring the tables release_metadata_credit_service.go's query touches */)
	require.NoError(t, err)
	for _, migration := range []string{
		"0137_phase108_contribution_sources.up.sql",
		// ... whichever migrations create point_ledger_entries / point_rules for this rule code
	} {
		testsupport.ApplySQLFile(t, pool, releaseMetadataMigrationPath(t, migration))
	}
	return pool
}
```

**Ambiguous-ID collision test to write (VALIDATION.md Criterion 4's core ask)** — construct a
`release_variants` row and a `release_versions` row with colliding/adjacent IDs, call
`service.AwardIfCompleted(ctx, collidingID, actorAppUserID)`, and assert (via
`point_ledger_entries.source_key`, which embeds `releaseVersionID`) which row actually got credited —
this documents current behavior of
`backend/internal/services/release_metadata_credit_service.go:43-51`'s `WHERE rv.id = $1 OR rev.id = $1`
query rather than necessarily changing it.

**Balance/ledger-count helper pattern to copy** — `backend/internal/services/project_note_credit_service_test.go:196-209`:
```go
func projectNotePointBalance(t testing.TB, pool *pgxpool.Pool, memberID int64) int64 {
	t.Helper()
	var value int64
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT COALESCE(SUM(point_value), 0) FROM point_ledger_entries WHERE member_id = $1`, memberID).Scan(&value))
	return value
}
```

**Constructor under test:** `services.NewReleaseMetadataCreditService(starter PointTxStarter)` —
`backend/internal/services/release_metadata_credit_service.go:26-28`. The analog's constructor
(`NewProjectNoteCreditService(pool, repository.NewFansubNotesRepository(pool))`) takes a slightly
different second argument; match the actual signature of `NewReleaseMetadataCreditService`, which
only takes `starter`.

---

### 5. `backend/internal/repository/anime_fansub_project_timeline_repository.go` — date-validation test (new)

**File under test, already read in full** —
`backend/internal/repository/anime_fansub_project_timeline_repository.go:56-105`
(`UpdateAnimeFansubProjectTimeline`). The rule to test is at lines 83-85:
```go
if completedOn != nil && latestReleaseCompletion != nil && completedOn.Before(*latestReleaseCompletion) {
	return nil, ErrInvalidProjectTimeline
}
```
This compares `completedOn` against `MAX(COALESCE(rev.release_date, fr.release_date))` joined
through `release_version_groups` → `release_versions` → `fansub_releases` → `episodes` for the same
`fansubGroupID`/`animeID` (query at lines 71-79).

**Analog for DB-fixture-based repository test:** `project_note_credit_service_test.go`'s pool-seeding
pattern (see #4 above) — same `testsupport.OpenPhase107Postgres` + inline `CREATE TABLE` + real
migration application shape applies here, since `anime_fansub_project_timeline_repository.go` shares
the same `FansubNotesRepository` struct/receiver as the note repository already covered by
`fansub_notes_repository_test.go`.

**Existing source-inspection style test in the same struct family** (weaker analog, but same
receiver type) — `backend/internal/repository/fansub_notes_repository_test.go` (full file read, 34
lines): asserts exact substrings of the `.go` source rather than exercising the DB. Only use this
style for the narrow "does the signature/SQL fragment exist" checks; the date-validation rule itself
needs a real fixture-based test per VALIDATION.md Criterion 4, not source inspection.

**Handler test route bug to fix (VALIDATION.md Criterion 4):** the existing
`TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker` test currently POSTs/PUTs to
`/project-timeline` instead of `/timeline` — locate this test's request-building call and correct
the path string only; do not change the assertion logic.

---

### 6. `backend/internal/repository/anime_contributions_member_project_repository.go` — `has_own_notes` fix

**File and exact lines already read** — `backend/internal/repository/anime_contributions_member_project_repository.go:139-152`:
```sql
EXISTS (
	SELECT 1
	FROM release_version_notes rvn
	WHERE rvn.release_version_id = rv.id
	  AND rvn.member_id = $1
	  AND rvn.deleted_at IS NULL
) AS has_own_notes,
```
No review-state filter today — a `rejected` note still counts.

**Analog for the correct lifecycle join** — `backend/internal/repository/release_version_notes_repository.go:148-186`
(`ListReleaseVersionNotesForMember`), lines 162-164:
```sql
FROM release_version_notes rvn
LEFT JOIN release_version_note_review_lifecycle lifecycle
  ON lifecycle.release_version_note_id = rvn.id
```
Apply the same `LEFT JOIN release_version_note_review_lifecycle` to the `EXISTS` subquery in
`anime_contributions_member_project_repository.go`, adding
`AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')` (or equivalent
`NOT EXISTS ... review_state = 'rejected'`) — `NULL` lifecycle rows (notes that never entered review)
must still count as done, only `rejected` must not. No `tombstoned` special-casing is needed since
`release_review_cleanup_repository.go` already sets `deleted_at`, which the existing
`rvn.deleted_at IS NULL` clause already excludes (confirmed in CONTEXT.md Kriterium 5).

**Frontend one-line consequence** (no analog needed, in-place fix) —
`frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:53`:
```ts
function isDone(release: MeProjectReleaseVersion): boolean {
  return release.has_own_notes || release.has_own_media
}
```
Once the backend fix ships, this function needs no code change — it already trusts
`has_own_notes` as an opaque boolean. Add a test only (`isDone()` on a fixture with a rejected-only
note must be `false`).

---

### 7. Criterion 6 — native elements to design-system primitives

**Analog for `ReleaseVersionMetadataFields.tsx`:** sibling file in the exact same directory,
`frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx:6,414-432` (already
imports `{ Switch, FormField, Input, Button } from '@/components/ui'` and wraps a controlled `Input`
in `FormField`):
```tsx
import { Switch, FormField, Input, Button } from '@/components/ui'
// ...
<FormField
  label={`Start (Folge ${currentEpisodeLabel})`}
  htmlFor="segment-override-start"
  hint="Nur Startzeit — Dauer bleibt gleich wie Basis. Ende wird automatisch berechnet."
  error={overrideDisplayError ?? undefined}
>
  <Input
    id="segment-override-start"
    type="text"
    inputMode="numeric"
    value={overrideStartTime}
    onChange={(e) => setOverrideStartTime(e.target.value)}
    onBlur={(e) => { /* parse-on-blur, same as the native <input> being replaced */ }}
  />
</FormField>
```
This is the exact `FormField`+`Input`+`onBlur`-parse shape 143-UI-SPEC.md's Retrofit Map specifies
for the `Gesamtdauer`/`Auflösung`/`Release-Name` fields — copy it directly, only swapping field
names/values per the UI-SPEC's field table.

**Analog for the `Select` replacement (Untertitel-Typ):**
`frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx:309-327`:
```tsx
<FormField label="Person" htmlFor="new-project-member-select">
  <Select
    id="new-project-member-select"
    value={newMemberId != null ? String(newMemberId) : ''}
    onChange={(event) => setNewMemberId(...)}
    disabled={availableMembers.length === 0}
  >
    <option value="">...</option>
    {availableMembers.map((member) => (
      <option key={member.member_id} value={member.member_id}>{member.display_name}</option>
    ))}
  </Select>
</FormField>
```
Apply this `FormField` + `Select` + `<option>` children shape to the Untertitel-Typ field, keeping
the exact 3 existing `<option>` values (`""`/`softsub`/`hardsub`) per 143-UI-SPEC.md's Retrofit Map.

**Analog for `AnimeProjectTimelineSection.tsx`'s `FormField`-wrapped `DatePicker`:** no exact
pre-existing example of `FormField` wrapping `DatePicker` was found in the codebase (the only
existing `DatePicker` usages, in `ReleaseVersionMetadataFields.tsx` itself, use the plain `<span>`
wrapper the UI-SPEC explicitly says to leave unchanged there). 143-UI-SPEC.md's own Retrofit Map
(lines 186-187) is authoritative here — follow it directly rather than searching for a second
analog:
```tsx
<FormField label="Projekt begonnen am" htmlFor={`project-start-${animeId}`}>
  <DatePicker id={`project-start-${animeId}`} label="Projekt begonnen am" value={startedOn} ... />
</FormField>
```

**Analog for converting inline `style={{...}}` to a CSS Module:**
`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css` (already
uses `var(--space-*)` tokens and `color-mix()`; no inline styles anywhere in that file) — the target
end-state pattern for the new `AnimeProjectTimelineSection.module.css` file 143-UI-SPEC.md specifies.

**`workspace.module.css` color-token fix — exact current text**
(`frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css:77-93`):
```css
.metadataError,
.metadataSuccess {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
}
.metadataError { color: #a4262c; background: #fff1f0; }
.metadataSuccess { color: #176b44; background: #edfbf2; }
```
Replace per 143-UI-SPEC.md's Color section (already gives the exact replacement CSS using
`var(--color-error)`/`var(--color-success)` + `color-mix()`, matching the token idiom already used in
`ReleaseVersionNotesTab.module.css`).

---

### 8. Criterion 1 — `RoleCatalogProvider` missing-provider fix

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx:21-23` (and the same
pattern repeated in `ReleaseContributionDrawer.test.tsx`, `AdminGroupsClient.test.tsx`,
`UserContributionsTab.test.tsx`):
```ts
vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))
```
Apply the identical `vi.mock` to the top of `FansubAppMembersSection.test.tsx` and
`admin/fansubs/[id]/edit/page.test.tsx` (whichever renders `FansubAppMembersOverview`, which calls
`useRoleCatalog('fansub_group')` at
`frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx:154`).

Alternative (used in `GroupHistRoleDialog.test.tsx:6,32`) is wrapping with the real
`<RoleCatalogProvider loads={catalogLoads}>` instead of mocking the hook — prefer the `vi.mock` form
above since it matches the majority of existing sibling tests in the same directory.

---

### 9. Criterion 1 — contract drift (`v12-projection-contract.test.ts`)

**Files, exact lines already located:**
- `frontend/src/types/__tests__/v12-projection-contract.test.ts:276`:
  `expect(block).toContain("enum: [bronze, silver, gold]");`
- `shared/contracts/openapi.yaml:11988-11991` (`PublicMemberBadge.next_tier`):
  `enum: [bronze, silver, gold, platinum]`

Decide which side is correct (CONTEXT.md flags this as an open decision — the sibling schema
`PublicMemberBadgeProgress.next_tier` at `openapi.yaml:12013-12015` has NO enum constraint at all,
suggesting `platinum` is the intended full tier set and the test's expectation is stale). Whichever
side is picked, change only that one side so both agree.

---

### 10. Criterion 7 — new dashboard lane

**Backend aggregation:** extend the Criterion-3 repository method(s) in
`release_review_query_repository.go` (see #3 above) to also cover rejected-own-notes, reusing
`ReleaseVersionNotesRepository.ListReleaseVersionNotesForMember`'s existing `ReviewState`/
`RejectionCategory`/`RejectionReason` join shown in #6's analog excerpt
(`release_version_notes_repository.go:148-186`) — group by anime+fansub-group as
143-UI-SPEC.md's `OwnDashboardPendingOwnNoteRevisionGroup` shape requires. No new
`h.db.Query(...)` call may be added to `dashboard_me_handler.go` (VALIDATION.md's explicit
no-new-query assertion).

**Handler wiring analog:** `dashboard_me_handler.go`'s existing three `attachPending*Attention`
call sites in `GetOwnDashboard` (lines 90-101 and 116-129) — add a fourth
`attachPendingOwnNoteRevisionAttention` call in the identical two places (empty-state branch and
main branch), following the exact same `if err := h.attach...(c, identity, data); err != nil { internalError(c, ...); return }`
shape.

**Frontend types — analog:** `frontend/src/types/dashboard.ts:40-52`
(`OwnDashboardPendingGroupMediaReview`/`OwnDashboardPendingReleaseReview`) — add
`OwnDashboardPendingOwnNoteRevisionItem`/`Group` in the same style (flat interface, `snake_case`
fields matching the Go JSON tags), then add `pending_own_note_revisions:
OwnDashboardPendingOwnNoteRevisionGroup[]` to `OwnDashboardData` (line 54-66) — the exact shape is
already fully specified in 143-UI-SPEC.md's "Data shape" section, copy it verbatim.

**Frontend component — analog:** `AttentionSection.tsx`'s existing three lanes
(`pendingGroupMediaReviews.map(...)` at lines 56-81, `pendingReleaseReviews.map(...)` at lines
82-111, `pendingClaims.map(...)` at lines 112-134) — same `<li><Card variant="interactive">
<Link className={styles.itemLink}>...<Badge variant="warning">Offen</Badge>...<ArrowRight/></Link>
</Card></li>` shape for the *lane structure itself*, but 143-UI-SPEC.md's own markup block (already
fully written, lines 267-301 of the UI-SPEC) is the exact target for the new lane's *inner* markup,
since — unlike the other three lanes — this lane's card is NOT a single `<Link>` (multiple rows per
card, each its own `<Link>`). Use the UI-SPEC's markup directly, not the three-lane single-link
pattern, for the inner structure; use the three-lane pattern only for the outer `<li><Card>` wrapper
and the `Badge variant="danger"` placement (a deliberate deviation from `variant="warning"` used by
the other three, per 143-UI-SPEC.md's Copywriting Contract).

**Empty-state gating — analog:** `AttentionSection.tsx:45-48` (the existing four-way `.length === 0`
check) — extend to five conditions:
```tsx
contributionProjects.length === 0 &&
pendingClaims.length === 0 &&
pendingGroupMediaReviews.length === 0 &&
pendingReleaseReviews.length === 0 &&
pendingOwnNoteRevisions.length === 0
```

**CSS — analog:** `AttentionSection.module.css`'s existing `.itemCard`/`.itemAction`/`.taskChip`
rules (lines 14-16, 37-42, 51-61) establish the token vocabulary (`var(--space-*)`,
`var(--color-primary, #2f5fe3)`, `color-mix(in srgb, ...)`) that the new `.noteGroupHeader`/
`.noteRevisionList`/`.noteRevisionRow`/`.noteRevisionEpisode`/`.noteRevisionTitle` classes
(already fully written in 143-UI-SPEC.md) must stay consistent with — no new raw hex values.

**Page wiring — analog:** `frontend/src/app/me/dashboard/page.tsx:147-154` — add
`pendingOwnNoteRevisions={state.dashboardData.pending_own_note_revisions}` as a fifth prop to the
existing `<AttentionSection>` call, matching the three existing `pending*` props' style exactly.

---

## Shared Patterns

### Self-exclusion / "not my own submission" predicate
**Source:** `backend/internal/handlers/dashboard_me_handler.go:248-256` (to be moved into
`backend/internal/repository/release_review_query_repository.go`)
**Apply to:** Any Criterion-3/Criterion-7 repository method that lists pending items belonging to
*other* users, and the new rejected-own-notes aggregation (which is the inverse — it explicitly
WANTS the actor's own rows, so this predicate must NOT be applied there; only the review-queue
methods use it).

### Permission-check memoization by map
**Source:** `backend/internal/handlers/dashboard_me_handler.go:153-169` (`attachPendingClaimAttention`)
**Apply to:** All three moved handler methods (Criterion 3) and any Criterion-7 aggregation that
calls `permissionSvc` per row instead of per distinct group/user pair.

### `FormField` wraps every form control
**Source:** `frontend/src/components/ui/` (primitives themselves), used correctly at
`SegmentEditPanel.tsx:414-432` and `AnimeContributionModal.tsx:309-327`
**Apply to:** `ReleaseVersionMetadataFields.tsx` and `AnimeProjectTimelineSection.tsx` (Criterion 6) —
mandatory per CLAUDE.md's "Frontend-UI (globales Design-System)" section, not optional.

### CSS Module tokens, never raw hex or inline `style={{}}`
**Source:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.module.css`
(`color-mix(in srgb, var(--token) N%, base)` idiom throughout)
**Apply to:** `workspace.module.css`'s `.metadataError`/`.metadataSuccess` and the new
`AnimeProjectTimelineSection.module.css` (Criterion 6).

### `testsupport.OpenPhase107Postgres` + `ApplySQLFile` fixture seeding
**Source:** `backend/internal/services/project_note_credit_service_test.go:128-175`
**Apply to:** `release_metadata_credit_service_test.go` and
`anime_fansub_project_timeline_repository_test.go` (Criterion 4) — both need a real Postgres fixture
with the relevant migrations applied, not a mock.

### Dashboard attention-lane props default to `[]`
**Source:** `frontend/src/app/me/dashboard/components/AttentionSection.tsx:24-25,37-38`
(`pendingGroupMediaReviews = []`, `pendingReleaseReviews = []`)
**Apply to:** The new `pendingOwnNoteRevisions` prop — must default to `[]` identically, per
143-UI-SPEC.md's explicit instruction.

---

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/services/`, `backend/internal/migrations/`, `backend/internal/testsupport/`,
`frontend/src/app/admin/`, `frontend/src/app/me/`, `frontend/src/types/`, `database/migrations/`
**Files scanned:** ~30 (read in full or targeted ranges)
**Pattern extraction date:** 2026-09-01
