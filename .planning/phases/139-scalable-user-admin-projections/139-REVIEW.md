---
phase: 139-scalable-user-admin-projections
reviewed: 2026-08-24T21:15:01Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_capability_contract_test.go
  - backend/internal/handlers/admin_users_handler.go
  - backend/internal/handlers/admin_users_handler_test.go
  - backend/internal/migrations/fresh_proof_test.go
  - backend/internal/migrations/phase106_member_points_test.go
  - backend/internal/migrations/phase107_review_foundation_test.go
  - backend/internal/migrations/phase108_contribution_sources_test.go
  - backend/internal/migrations/phase108_project_note_lifecycle_test.go
  - backend/internal/migrations/phase109_member_point_totals_test.go
  - backend/internal/migrations/phase128_public_identity_test.go
  - backend/internal/migrations/phase136_capability_policy_catalog_test.go
  - backend/internal/migrations/phase136_role_catalog_palette_correction_test.go
  - backend/internal/migrations/phase136_role_catalog_uat_corrections_test.go
  - backend/internal/migrations/phase137_effective_rights_overrides_test.go
  - backend/internal/migrations/phase137_fansub_group_media_view_test.go
  - backend/internal/migrations/release_review_contribution_rule_test.go
  - backend/internal/migrations/release_review_lifecycle_test.go
  - backend/internal/models/admin_users.go
  - backend/internal/permissions/effective_rights_batch_summary.go
  - backend/internal/permissions/effective_rights_batch_summary_test.go
  - backend/internal/repository/admin_users_contributions_query.go
  - backend/internal/repository/admin_users_contributions_query_test.go
  - backend/internal/repository/admin_users_media_query.go
  - backend/internal/repository/admin_users_media_query_test.go
  - backend/internal/repository/admin_users_query_budget_test.go
  - backend/internal/repository/admin_users_repository.go
  - backend/internal/repository/admin_users_repository_test.go
  - backend/internal/repository/admin_users_rights_summary_query.go
  - backend/internal/repository/admin_users_rights_summary_query_test.go
  - backend/internal/repository/admin_users_tab_repository.go
  - backend/internal/repository/admin_users_tab_repository_test.go
  - backend/internal/repository/authz_permissions_batch.go
  - backend/internal/repository/authz_user_overrides.go
  - backend/internal/testsupport/phase139_postgres.go
  - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
  - frontend/src/app/admin/users/tabs/contributionsTab.module.css
  - frontend/src/app/admin/users/tabs/mediaTab.module.css
  - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
  - frontend/src/app/admin/users/tabs/UserOverviewTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
  - frontend/src/app/admin/users/useUserContributionsFilters.ts
  - frontend/src/app/admin/users/useUserMediaFilters.ts
  - frontend/src/lib/api.ts
  - frontend/src/types/admin-users.ts
  - scripts/README-seed.md
  - scripts/seed-phase139-contribution-fixtures.mjs
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/admin-content.yaml
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: fixed
---

## Post-Review Fix Status

CR-01/WR-04 fixed together (`d843127c`): frontend now sends RFC3339 day-boundary timestamps
(`T00:00:00Z` / `T23:59:59.999Z`) for the `from`/`to` filters instead of the bare `YYYY-MM-DD`
`DatePicker` value; regression test added in `frontend/src/lib/api.admin-users.test.ts`.
WR-01 fixed (`de316a9e`): `listUserContributionsGrouped` now distinguishes
`errors.Is(err, pgx.ErrNoRows)` from a real DB error. WR-02 fixed (`8b342ef6`): added
handler-level query-param parsing tests for `GetUserContributions`/`GetUserMedia`/
`GetUserRightsSummary`, which also guard CR-01 against regression. WR-03 investigated and found
not reproducible — `gofmt -l`/`gofmt -w` show `admin_users.go` already clean; no commit made.
IN-01/IN-02 left as documented, non-blocking follow-up notes per the review's own recommendation.

# Phase 139: Code Review Report

**Reviewed:** 2026-08-24T21:15:01Z
**Depth:** standard
**Files Reviewed:** 40 (approx.; includes the 14 mechanically-renamed migration test files)
**Status:** issues_found

## Summary

Phase 139 rewrote the Contributions/Media/Rights-Summary admin endpoints from unbounded flat
fetches into server-side grouped, paginated, filtered SQL projections, and rewrote the
corresponding frontend tabs to consume them. The SQL is careful about the specific
`ARRAY_AGG(text[])[1]` static-typing bug the plan called out (verified independently in both
`admin_users_media_query.go` and `admin_users_rights_summary_query.go` — neither reproduces it;
the fixed `MIN()`-over-arrays pattern from 139-03 is used correctly and consistently in
`admin_users_contributions_query.go`). All new SQL parameters are bound via numbered `$N`
placeholders with no string concatenation anywhere in the reviewed files. The three QUAL-06
constant-query-budget tests (`admin_users_query_budget_test.go`) are genuinely rigorous —
they seed both a "few" and a "many" fixture and assert equal, pinned query counts, which is a
credible proof that no N+1 pattern crept back in for any of the three endpoints.

However, one concrete, provable functional defect was found: the new "Von"/"Bis" (from/to) date
filters on both the Contributions tab and the Media tab are silently non-functional end-to-end,
because the UI's `DatePicker` component emits plain `YYYY-MM-DD` strings while the backend
handler parses `from`/`to` exclusively as strict RFC3339 timestamps — a mismatch the project's
own OpenAPI contract confirms was intended to be `format: date-time`. Neither the frontend nor
backend test suites exercise this path end-to-end, which is why it shipped unnoticed. A second,
lower-severity issue was found in the new `admin_users_contributions_query.go`: a real
member-lookup DB error (timeout, connection loss, etc.) is indistinguishable from "user has no
verified claim" and is silently converted into a successful empty response — this exact pattern
is carried over unchanged from the pre-139 code (not a new regression), but it was reproduced
in the newly-authored file without adopting the more careful `errors.Is(err, pgx.ErrNoRows)`
distinction Phase 139 itself uses correctly elsewhere in the same plan (`authz_user_overrides.go`,
`admin_users_rights_summary_query.go`). Both are flagged below.

## Critical Issues

### CR-01: "Von"/"Bis" date-range filters are silently non-functional on both Contributions and Media tabs

**File:** `frontend/src/components/ui/DatePicker.tsx:54-59` (emits `toIsoDate` → `YYYY-MM-DD`),
consumed by `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx:284-306`,
`frontend/src/app/admin/users/tabs/UserMediaTab.tsx:278-300`, and
`frontend/src/app/admin/users/useUserContributionsFilters.ts` /
`frontend/src/app/admin/users/useUserMediaFilters.ts` (pass the value through to `frontend/src/lib/api.ts:3868-3869` /
`:3902-3903` unmodified); backend parsing at `backend/internal/handlers/admin_claims_list_handler.go:111-121`
(`parseOptionalRFC3339`), invoked from `backend/internal/handlers/admin_users_handler.go:303-308`
(`GetUserContributions`) and `:354-358` (`GetUserMedia`).

**Issue:** `DatePicker.onChange` always calls `toIsoDate(date)`, which formats as `"2026-08-24"`
(date-only, no time component). `useUserContributionsFilters`/`useUserMediaFilters` write that
string straight into the URL and `api.ts`'s `getAdminUserContributions`/`getAdminUserMedia`
forward it unmodified as the `from`/`to` query parameters. On the backend,
`GetUserContributions`/`GetUserMedia` parse `from`/`to` exclusively via `parseOptionalRFC3339`,
which calls `time.Parse(time.RFC3339, trimmed)` — `time.RFC3339` is
`"2006-01-02T15:04:05Z07:00"`, which **requires** a `T`-separated time-of-day and a timezone
offset. `time.Parse` returns an error for a bare date like `"2026-08-24"`. `parseOptionalRFC3339`
swallows that error and returns `ok=false`, silently treating the value as "no filter" (see
`admin_claims_list_handler.go:111-121`). The result: an admin selects a "Von"/"Bis" date range in
either tab, the request round-trips successfully, and the response is **completely unfiltered by
date** — with no error, no warning, and no visual indication that the filter had zero effect. This
directly contradicts `shared/contracts/admin-content.yaml:1812-1813` and `:1837-1838`, which both
document `from`/`to` as `format: date-time` — the contract itself confirms a full timestamp was
expected, not the date-only value the shipped `DatePicker` produces.

Neither `admin_users_contributions_query_test.go` nor `admin_users_media_query_test.go` sets
`Filter.From`/`Filter.To` in any test case (both files only call `time.Now()` for unrelated
timestamp columns), and `admin_users_handler_test.go` never exercises
`GetUserContributions`/`GetUserMedia`/`GetUserRightsSummary` at the handler layer at all — so this
gap was structurally invisible to the test suite in both layers.

**Fix:** Either (a) have the frontend send a full RFC3339 timestamp
(`` `${value}T00:00:00Z` `` for `from`, `` `${value}T23:59:59Z` `` for `to`, or use `Date.toISOString()` after
constructing a UTC boundary) before calling `getAdminUserContributions`/`getAdminUserMedia`, or
(b) relax the backend parser to accept a plain `YYYY-MM-DD` value in addition to full RFC3339 (e.g.
try `time.Parse("2006-01-02", trimmed)` as a fallback, treating `from` as start-of-day and `to` as
end-of-day in the server's timezone convention). Either fix should land with at least one
integration test asserting that a `from`/`to` filter value in the **exact format the shipped
`DatePicker` emits** actually narrows the result set — the current test suites would not have
caught this and will not catch a regression either.

## Warnings

### WR-01: `listUserContributionsGrouped` masks real database errors as "user has no contributions"

**File:** `backend/internal/repository/admin_users_contributions_query.go:48-59`

**Issue:**
```go
var memberID int64
err := r.db.QueryRow(ctx, `
    SELECT mc.member_id FROM member_claims mc
    WHERE mc.app_user_id = $1 AND mc.claim_status = 'verified'
    ORDER BY mc.id LIMIT 1
`, filter.AppUserID).Scan(&memberID)
if err != nil {
    limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)
    empty.Meta.Limit = limit
    empty.Meta.Offset = offset
    return empty, nil
}
```
Any error from this `QueryRow` — not just `pgx.ErrNoRows` for "no verified claim exists" — is
treated identically and converted into a successful, empty `AdminUserContributionsPage`. A
transient connection failure, statement timeout, or permissions error on this specific query
would be silently reported to the admin UI as "this user has made no contributions," which is
indistinguishable from the truth and could mask a real outage or misconfiguration. This exact
"any error ⇒ empty result" shape is carried over unchanged from the pre-139
`ListUserContributions` (verified against `git show 3ebec933:...admin_users_tab_repository.go`,
which has the identical `if err != nil { return emptyResult, nil }`), so it is not a new
regression — but 139-03 authored a brand-new file here and, in the same phase,
`admin_users_rights_summary_query.go:181-201`'s `loadRightsSummaryActor` and
`authz_user_overrides.go`'s `LockTargetMembership`/`LoadOverridePolicy` correctly distinguish
`errors.Is(err, pgx.ErrNoRows)` from a real error and propagate the latter. The new file did not
adopt that same, already-established-in-this-phase convention.

**Fix:**
```go
import (
    "errors"
    "github.com/jackc/pgx/v5"
)
...
err := r.db.QueryRow(ctx, `...`, filter.AppUserID).Scan(&memberID)
if errors.Is(err, pgx.ErrNoRows) {
    limit, offset := ClampAdminListPage(filter.Limit, filter.Offset)
    empty.Meta.Limit = limit
    empty.Meta.Offset = offset
    return empty, nil
}
if err != nil {
    return nil, fmt.Errorf("list user contributions grouped: resolve member: %w", err)
}
```

### WR-02: New query-param parsing paths on `GetUserContributions`/`GetUserMedia`/`GetUserRightsSummary` have zero handler-level test coverage

**File:** `backend/internal/handlers/admin_users_handler.go:274-422`,
`backend/internal/handlers/admin_users_handler_test.go`

**Issue:** `admin_users_handler_test.go` defines `adminUsersRepoStub` with the full
`ListUserContributions`/`GetUserMedia`/`GetUserRightsSummary` surface, but no test in the file
ever calls `handler.GetUserContributions(c)`, `handler.GetUserMedia(c)`, or
`handler.GetUserRightsSummary(c)` — all five tests in the file exercise `ListUsers`,
`AssignGlobalRole`, `RevokeGlobalRole`, and `UpdateUserStatus` only. This means the query-string
parsing logic added in this phase (`parseOptionalPositiveID`, `parseOptionalRFC3339`,
`only_deviations == "true"`, limit/offset wiring) is only ever exercised indirectly through
repository-level Postgres integration tests, which do not go through the HTTP handler's
`c.Query(...)` parsing at all. CR-01 above is a direct consequence of this gap: the exact
translation from "HTTP query string" to "typed filter struct" was never unit-tested.

**Fix:** Add handler-level tests (using `httptest` + a fixed `adminUsersRepoStub`) that build a
request with `?from=...&to=...&only_deviations=true&anime_id=...` and assert the
`AdminUserContributionsFilter`/`AdminUserMediaFilter` the stub received matches expectations —
this both documents the exact expected wire format and would have caught CR-01 immediately.

### WR-03: `admin_users.go` DTO struct tags are not `gofmt`-aligned

**File:** `backend/internal/models/admin_users.go:290-294`

**Issue:**
```go
type AdminUserContributionsPage struct {
	Data          []AdminContributionProjectBlock `json:"data"`
	Meta          AdminListMeta                    `json:"meta"`
	FilterOptions AdminContributionFilterOptions   `json:"filter_options"`
}
```
The struct-tag column for `Meta` and `FilterOptions` starts one column later (47) than `Data`'s
(46) — `gofmt` would align all three tags to the same column based on the longest type
(`[]AdminContributionProjectBlock`, 31 chars). Running `gofmt -l` against this file would flag it
as needing reformatting. Purely cosmetic, but indicates the file was not run through `gofmt`
before commit, and Go tooling/CI in other stacks commonly gates on a clean `gofmt -l`.

**Fix:** Run `gofmt -w backend/internal/models/admin_users.go`.

### WR-04: Contributions/Media date filters use inclusive-boundary comparisons without day-granularity handling

**File:** `backend/internal/repository/admin_users_contributions_query.go:226-227`,
`backend/internal/repository/admin_users_media_query.go:298-299`

**Issue:** Both queries filter with `ac.created_at >= $5`/`ac.created_at <= $6` (contributions)
and `rvm.created_at >= $6`/`rvm.created_at <= $7` (media) against `timestamptz` columns. Once
CR-01 is fixed and a real timestamp is supplied for `to`, a `to` value corresponding to
"midnight of the selected day" (e.g. `2026-08-24T00:00:00Z`, the naive fix of appending
`T00:00:00Z` to both `from` and `to`) would exclude every contribution/media row created later
that same day — an off-by-one/boundary bug that would only surface after CR-01 is fixed. This is
not yet observable today only because CR-01 makes the filter a no-op.

**Fix:** When fixing CR-01, make sure the `to` boundary is end-of-day inclusive (e.g.
`` `${value}T23:59:59.999Z` `` from the frontend, or add one day and use `<` server-side) rather than
naively mirroring the `from` transformation.

## Info

### IN-01: Hardcoded default admin password in dev seed script

**File:** `scripts/seed-phase139-contribution-fixtures.mjs:39,44`

**Issue:** `SEED_ADMIN_PW` defaults to the literal `'123'` when the env var is unset. This mirrors
the pre-existing convention in `scripts/seed-member-profile-fixtures.mjs` (documented in this
file's own header comment) and is fully overridable via env var, and the script only ever targets
a specific internal dev VM IP (`192.168.235.196`) — so this is not a new practice introduced by
Phase 139 and is not exploitable against any non-dev environment by construction. Still worth
flagging: a hardcoded credential fallback in a committed script is the kind of pattern that is
easy to accidentally point at a shared/staging environment later.

**Fix:** No action required for this phase; consider (in a follow-up, not blocking) requiring
`SEED_ADMIN_PW` to be explicitly set with no default, matching a "fail closed" posture for
credential-adjacent tooling.

### IN-02: `release_blocks`'s `WHERE fansub_group_id IS NOT NULL` silently drops unresolvable media rows

**File:** `backend/internal/repository/admin_users_media_query.go:301,319`

**Issue:** The `release_blocks` CTE requires a non-null `fansub_group_id` (resolved from
`rvm.fansub_group_id` or the `MIN(rvg.fansub_group_id)` fallback). A `release_version_media` row
whose release version has zero rows in `release_version_groups` and no direct
`rvm.fansub_group_id` would silently vanish from the Media tab entirely (not shown, not counted,
no error) rather than surfacing as an "ungrouped" item or a visible data-quality issue. This may
be an acceptable, intentional trade-off (there is no sensible group to display it under), but it
is worth confirming with product/UI-SPEC intent, since it means "the user has this media" and "the
media tab shows this media" are not always the same fact for these edge-case rows.

**Fix:** If this is intentional, add a one-line comment stating so explicitly (mirroring the
file's existing thorough D-comment style) so a future reader does not mistake it for an oversight.

---

_Reviewed: 2026-08-24T21:15:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
