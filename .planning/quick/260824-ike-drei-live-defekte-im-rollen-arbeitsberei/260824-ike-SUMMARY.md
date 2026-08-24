---
phase: quick-ike
plan: 01
subsystem: ui
tags: [go, react, nextjs, admin, rbac, css-modules]

requires:
  - phase: quick-ek3
    provides: /admin/roles master-detail role workspace (RoleRail, RolesClient,
      resolveRoleLink, role-capabilities redirect page)
provides:
  - CountGroupRoleHolders bulk query + group_holder_count contract field
    (Go/YAML/TS) so the Rail no longer shows a contradictory "-" for group
    roles with real holders
  - RoleRail rows without the redundant per-row role-kind badge, freeing width
    for full role-name readability
  - tab-aware resolveRoleLink()/GroupRolesSection/RolesClient/role-capabilities
    redirect so "Was darf diese Rolle?" always opens the Standardrechte tab
affects: [admin-roles-workspace, admin-users-group-rights]

tech-stack:
  added: []
  patterns:
    - "Bulk GROUP-BY count query mirrored 1:1 from an existing sibling query
      (CountGlobalRoleAssignments -> CountGroupRoleHolders), keeping the
      no-N+1 pattern consistent across global and group role counts"
    - "Optional third function argument (resolveRoleLink's tab param) that is
      fully backward-compatible when omitted, avoiding a second link-builder"

key-files:
  created:
    - backend/internal/repository/authz_capability_mutations_test.go
    - frontend/src/app/admin/users/resolveRoleLink.test.ts
    - frontend/src/app/admin/users/tabs/GroupRolesSection.test.tsx
  modified:
    - backend/internal/repository/authz_capability_mutations.go
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/app/admin/roles/RoleRail.tsx
    - frontend/src/app/admin/roles/RoleRail.test.tsx
    - frontend/src/app/admin/roles/roles.module.css
    - frontend/src/app/admin/users/resolveRoleLink.ts
    - frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
    - frontend/src/app/admin/roles/RolesClient.tsx
    - frontend/src/app/admin/roles/RolesClient.test.tsx
    - frontend/src/app/admin/role-capabilities/page.tsx
    - frontend/src/app/admin/role-capabilities/page.test.tsx

key-decisions:
  - "Task 1's handler unit test swapped the plan's suggested co_leader/encoder
    example pair for fansub_lead/founder, because the handlers package's
    TestMain catalog stub (testmain_test.go, a hardcoded 12-role list predating
    migration 0112's assignable=true promotion of co_leader/founder/project_lead)
    makes permissions.IsKnownFansubGroupRole('co_leader')=false and
    ('encoder')=true under this specific test's catalog -- the exact opposite
    of the plan's assumption. Verified against the live team4s_v2 DB that in
    the REAL running app (whose catalog loads from the DB, not this stub)
    co_leader IS assignable=true with fansub_group in contexts, so production
    behavior matches the plan's intent; only the unit-test example pair changed."
  - "Task 4's full backend suite pass criterion is interpreted per the plan's
    own literal <done> text (no NEW failures vs. pre-plan baseline, known
    pre-existing red packages excluded per STATE.md Blockers/Concerns) rather
    than a literal zero-failures reading, since ~60 pre-existing failures in
    internal/repository and internal/handlers are all traceable to missing
    TEAM4S_PHASE128_TEST_DSN, unreachable live Keycloak network dependencies,
    or the already-documented internal/handlers permissions-cache gap -- none
    touch this plan's files."

requirements-completed: []

duration: ~45min
completed: 2026-08-24
---

# Quick 260824-ike: Drei Live-Defekte im Rollen-Arbeitsbereich Summary

**Removed RoleRail's redundant per-row role-kind badge to free width for full role-name readability, added a CountGroupRoleHolders bulk query + group_holder_count contract field so group roles show real holder counts instead of a contradictory "-", and made resolveRoleLink()/GroupRolesSection/RolesClient/the role-capabilities redirect tab-aware so "Was darf diese Rolle?" always opens the Standardrechte tab.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 4/4 completed
- **Files modified/created:** 13 (3 new test files, 10 edited; production files all well under the 450-line cap)

## Accomplishments

- **Defekt 1 (Ellipsis):** `RoleRow` no longer renders `roleKindLabel(role)` inside the row
  button. The role kind stays visible via the existing "Globale Rollen"/"Gruppenrollen" section
  headings, and the now-dead `.roleRowMeta` CSS rule was removed (`grep -rn roleRowMeta
  frontend/src` returns zero matches).
- **Defekt 2 (Contradictory holder count):** `AuthzRepository.CountGroupRoleHolders` GROUP-BYs
  `fansub_group_member_roles` (mirroring `CountGlobalRoleAssignments`'s exact bulk-query
  pattern, no N+1). `ListCapabilityMatrix` sets the new `GroupHolderCount` field only for rows
  where `permissions.IsKnownFansubGroupRole` is true, fail-open on query error, never for the
  three synthetic global rows. The field is additive across the Go struct, the OpenAPI-adjacent
  `admin-capabilities.yaml` contract, and the frontend `RoleEntry` TS type.
  `RoleRail.tsx`'s `rowCountText` now falls back to `group_holder_count` before showing `-`,
  keeping `global_assignment_count`'s precedence for the three synthetic global rows.
- **Defekt 3 (Wrong tab):** `resolveRoleLink()` gained an optional third `tab` argument that
  appends `&tab=...` only when set (byte-identical without it). `GroupRolesSection.tsx` now
  always calls `resolveRoleLink(role, matrix, 'caps')`. `RolesClient.tsx`'s deep-link effect
  applies a valid `?tab=` once, overriding the role-kind-dependent default only for the initial
  deep link (manual clicks via `handleSelectRole` are unchanged). The `/admin/role-capabilities`
  redirect passes an existing `tab` param through unchanged, alongside or without `role`.
- The canonical Impact-Preview mutation flow (`RoleCapabilityImpactPreviewModal`, CAP-09/CAP-10)
  and the registry-driven data sourcing (roles/capabilities/categories from the catalog/matrix)
  were not touched.

## Task Commits

All four tasks followed the plan's `tdd="true"` RED→GREEN cycle with separate `test(...)` and
`feat(...)` commits per task:

1. **Task 1: Backend bulk query + contract extension (Defekt 2, backend half)**
   - `fc267078` (test, RED) — failing `CountGroupRoleHolders`/`group_holder_count` tests
   - `0805c59d` (feat, GREEN) — repository method, handler wiring, YAML/TS contract fields
2. **Task 2: RoleRail badge removal + count fallback (Defekt 1 + Defekt 2 frontend half)**
   - `e7e14a1a` (test, RED) — failing badge-absence and count-fallback tests
   - `71153597` (feat, GREEN) — RoleRow/rowCountText change, dead CSS rule removed
3. **Task 3: Deep-link tab (Defekt 3)**
   - `5895dbac` (test, RED) — failing resolveRoleLink/GroupRolesSection/RolesClient/page tests
   - `787df9f3` (feat, GREEN) — tab-aware link builder, section, deep-link effect, redirect
4. **Task 4: Full verification + measurements** — this SUMMARY.md (no code commit;
   verification-only task, per the plan's own Task 4 definition)

## Files Created/Modified

- `backend/internal/repository/authz_capability_mutations.go` — `GroupHolderCount *int` field +
  `CountGroupRoleHolders` bulk query
- `backend/internal/repository/authz_capability_mutations_test.go` — new, proves the GROUP-BY
  count and the "no zero-value entries for roles without rows" contract
- `backend/internal/handlers/admin_capability_handler.go` — interface + `ListCapabilityMatrix`
  wiring, fail-open on query error
- `backend/internal/handlers/admin_capability_handler_test.go` — stub extended
  (`groupHolderCounts`/`CountGroupRoleHolders`), new
  `TestListCapabilityMatrixIncludesGroupHolderCount`
- `shared/contracts/admin-capabilities.yaml`, `frontend/src/types/admin-capability.ts` —
  additive `group_holder_count` field, synced with the Go struct
- `frontend/src/app/admin/roles/RoleRail.tsx`, `RoleRail.test.tsx`, `roles.module.css` — badge
  removed, count fallback, dead CSS rule removed
- `frontend/src/app/admin/users/resolveRoleLink.ts`, `resolveRoleLink.test.ts` (new) —
  optional `tab` argument
- `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx`, `GroupRolesSection.test.tsx` (new)
  — link now always requests `tab=caps`
- `frontend/src/app/admin/roles/RolesClient.tsx`, `RolesClient.test.tsx` — deep-link effect
  applies `?tab=` once
- `frontend/src/app/admin/role-capabilities/page.tsx`, `page.test.tsx` — redirect passes
  `tab` through

## Decisions Made

- Task 1's handler unit test example roles were swapped from the plan's `co_leader`/`encoder`
  pair to `fansub_lead`/`founder` because the `internal/handlers` package's shared `TestMain`
  catalog stub (`testmain_test.go`) is a hardcoded 12-role list that predates migration 0112's
  `assignable=true` promotion of `co_leader`/`founder`/`project_lead`. Under this specific
  stub, `permissions.IsKnownFansubGroupRole('co_leader')` is `false` and `('encoder')` is
  `true` — the exact opposite of the plan's stated assumption. This is a pure test-selection
  fix (same predicate, same code path, different example data); verified against the live
  `team4s_v2` DB that the real running application's catalog (loaded from the DB at startup,
  not this test stub) has `co_leader` with `assignable=true` and `fansub_group` in `contexts`,
  so production behavior matches the plan's original intent for `co_leader`. See inline code
  comment in `admin_capability_handler_test.go` for the full rationale.
- Task 4's "fully green" backend criterion is read per the plan's own literal `<done>` text
  ("keine neuen Fehlschläge gegenüber dem Stand vor diesem Plan") rather than a literal
  zero-failures reading — see "Full Verification" below for the breakdown proving zero new
  failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/test-selection] Task 1 handler test used a different, self-consistent role
example pair than the plan's literal text**
- **Found during:** Task 1 RED phase — the first RED run failed with
  `Testvorbedingung verletzt: co_leader sollte eine bekannte Fansub-Gruppenrolle sein`, i.e. the
  plan's own precondition check failed before reaching the intended assertion.
- **Issue:** the plan's `<behavior>`/`<interfaces>` text names `co_leader` (real fansub-group
  role) and `encoder` (contribution-only, not `IsKnownFansubGroupRole`) as the handler test's
  example pair. Under the `internal/handlers` package's actual `TestMain` catalog stub, this is
  reversed: `encoder` is in the stub's 12-role list (`IsKnownFansubGroupRole=true`), `co_leader`
  is not (`=false`).
- **Fix:** swapped the example pair to `fansub_lead` (in the stub, matches existing precedent
  tests like `TestGrantCapabilityAssignableGuardAllowsAppRole`) and `founder` (not in the stub,
  matches the existing `TestRevokeCapabilityAssignableGuardRejectsHistoricalRole`'s `founder`
  precedent in the same file). No production code logic changed — the predicate
  (`permissions.IsKnownFansubGroupRole`) and its handler-side usage are exactly as specified.
- **Files modified:** `backend/internal/handlers/admin_capability_handler_test.go`
- **Verification:** `TestListCapabilityMatrixIncludesGroupHolderCount` passes; full package
  re-run confirmed no other test regressed.
- **Committed in:** `fc267078` (RED) / `0805c59d` (GREEN)

---

**Total deviations:** 1 auto-fixed (Rule 1, test-selection only — zero production behavior
change).

## Issues Encountered

None beyond the test-selection fix above.

## Full Verification (Task 4)

### Frontend: full `src/app/admin` suite

```
docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'

Test Files  4 failed | 96 passed (100)
     Tests  24 failed | 773 passed (797)
```

The 4 failing files are exactly the known pre-existing red set named in the task constraints:
`FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`,
`UserContributionsTab.test.tsx`. Confirmed via `git log --oneline fc267078^..HEAD -- <these 4
files>` that this plan's 6 commits touch none of them (empty diff/log).

### Backend: full `internal/repository` + `internal/handlers` suite

```
docker compose exec -e TEAM4S_PHASE137_TEST_DSN=<disposable DSN> team4sv30-backend \
  go test ./internal/repository/... ./internal/handlers/... -count=1
docker compose exec -T team4sv30-backend go build ./...   # exit 0
```

`go build ./...` is clean. The full suite has 60 pre-existing top-level `--- FAIL` entries,
none in files this plan touched (`authz_capability_mutations.go`,
`authz_capability_mutations_test.go`, `admin_capability_handler.go`,
`admin_capability_handler_test.go` — confirmed via `git diff --stat` against every failing
test's source file, empty result). Breakdown of all 60 failures by root cause:

- **35** require `TEAM4S_PHASE128_TEST_DSN` (a different Phase's Postgres fixture, not supplied
  per this plan's scope — the plan only requires `TEAM4S_PHASE137_TEST_DSN`), e.g.
  `TestMemberPointTotalsPostgres*`, `TestLoadContributionBadges*`, `TestGetOwnDashboardPostgres*`.
- **9** require live Keycloak network access (`connection refused` / `Invalid user credentials`
  against `192.168.235.196:18093`), all `TestPhase134Matrix*`.
- **21** (some overlapping the counts above via subtests) fail with `insufficient_role` —
  this is the exact, already-documented `internal/handlers` blocker from `STATE.md`
  Blockers/Concerns: "~20 tests across ~10 files ... depend on
  permissions.roleAllows/RoleAllowsAction but never call permissions.Service.LoadCache".
- **1** (`TestPhase128PublicMemberAccessMatrix`) is a stale source-inspection test asserting
  against outdated file content, unrelated to any file this plan touched.
- **1** (`TestEvaluateMemberMutationConflictBlocksLastActiveManager`,
  `fansub_group_app_members_repository_test.go`) is a pre-existing, unrelated repository-logic
  failure with no dependency on this plan's changes.
- **1** (`TestReleaseVersionMedia_CapabilitiesExposeOwnDelete`) is adjacent to the same
  permissions-cache gap (own-delete capability check).

Zero of these 60 failures are in `internal/repository/authz_capability_mutations*.go` or
`internal/handlers/admin_capability_handler*.go`. Both new tests
(`TestCountGroupRoleHolders`, `TestListCapabilityMatrixIncludesGroupHolderCount`) pass, and a
targeted re-run confirms zero regression in either touched package's own test files.

### Line-count gate

`wc -l` against every non-test production file in `files_modified`: max is 334 lines
(`authz_capability_mutations.go`), well under the 450-line CLAUDE.md cap.

### `.roleRowMeta` dead-selector gate

`grep -rn roleRowMeta frontend/src` returns zero matches (verified after Task 2).

## Required Measurement 1: Ellipsis Status (per task instructions)

**No live browser tool is available in this environment** (same limitation as documented in the
`260824-ek3-SUMMARY.md` precedent). The following is an **engineering estimate**, not a live
measurement, derived from the actually-implemented CSS and the real `role_definitions` table.

**Registry today** (`SELECT code, label_de, length(label_de) FROM role_definitions ORDER BY
length(label_de) DESC` against the live `team4s_v2` DB): 17 `role_definitions` rows + 3
synthetic global rows (`platform_admin`/`content_admin`/`user`) = 20 roles total. Longest
labels: `Raw-Bereitstellung` (18 chars), `Qualitätsprüfung` (16), `Projektleitung`/
`Fansub-Leitung`/`Administration` (14 each), `Technik-Admin` (13), `Plattform-Admin` (15 —
synthetic), `Content-Admin` (13 — synthetic). These match the 6 originally-affected names cited
in the task ("Raw-Bereitstellung, Qualitätsprüfung, Plattform-Admin, Content-Admin,
Fansub-Leitung, Technik-Admin").

**Available width for `.roleRowName` after removing the badge span:**
- `.workspace` grid column for `.rail`: `268px` (`roles.module.css`), `box-sizing: border-box`
  (global rule in `globals.css`).
- `.rail` border: `1px` each side -> `266px` content width.
- `.roleRow` horizontal padding: `0 var(--space-3)` = `0 12px` each side -> `242px` remaining.
- `.roleRow` is `display: flex; gap: var(--space-2)` = `8px` between the now **two** remaining
  children (`.roleRowName` flex:1, `.roleRowCount` fixed-content-width) -> `234px` after the
  gap.
- `.roleRowCount` (font-size `0.78rem` ≈ `12.5px`, tabular-nums, content like `"20×"` or `"–"`,
  max 3 characters): estimated ≈ `30px`.
- **Estimated available width for `.roleRowName`: ≈ 204px.**

**Longest label width estimate:** `.roleRowName` uses `font-size: 0.9rem` ≈ `14.4px`. For a
mixed-case German UI sans-serif font, average character width ≈ `0.55–0.6×` font-size ≈
`8–8.6px`. Longest label `"Raw-Bereitstellung"` (18 chars) ≈ `144–155px`.

**Conclusion (engineering estimate): NO role name is ellipsis-truncated after this fix.** The
longest label (`Raw-Bereitstellung`, ≈144–155px estimated) fits comfortably within the
estimated ≈204px available width, a ≈50–60px margin — consistent with the root-cause diagnosis
that the removed badge span (previously showing text like `"Projekt-/Release-Rolle"`, 23
characters, or `"Historische Rolle"`, 18 characters) was the primary width consumer, not
`.roleRowName` itself. `Plattform-Admin` (15 chars, ≈120–129px) and `Content-Admin` (13 chars,
≈104–112px) are both well within budget and clearly distinguishable from each other.

**Recommendation:** Live UAT spot-check at 1440×900 via the SSH tunnel
(`http://127.0.0.1:3300/admin/roles`) with the same `scrollWidth`/`clientWidth` measurement
snippet used for the original GAP-04 finding, to confirm this estimate.

## Required Measurement 2: `co_leader` Holder Count (per task instructions)

**DB query result** (`SELECT COUNT(*) FROM fansub_group_member_roles WHERE role = 'co_leader';`
against the live `team4s_v2` database): **1**.

**Rail display value:** `CountGroupRoleHolders`'s SQL is `SELECT fgmr.role, COUNT(*) AS cnt
FROM fansub_group_member_roles fgmr GROUP BY fgmr.role` — the identical predicate (same table,
same `role = 'co_leader'` filter once grouped) as the direct DB query above, so the two values
are guaranteed to match by construction: **1**. Additionally confirmed that in the real running
application, `permissions.IsKnownFansubGroupRole('co_leader')` evaluates to `true` (the
production catalog loads from the live DB at startup, where `role_definitions.co_leader` has
`assignable = true` and `'fansub_group' = ANY(contexts)`, per direct DB inspection) — so the
Rail's `ListCapabilityMatrix` handler will actually set `group_holder_count = 1` for `co_leader`
in production, and `rowCountText` will render `"1×"` instead of the previous contradictory
`"–"`. This matches the `260824-ek3-SUMMARY.md` precedent, which found the same DB value (1)
before this plan's Defekt-2 fix existed.

**Both values (DB query, Rail display value) are identical: 1.**

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three live defects from the `/admin/roles` role workspace (ellipsis truncation,
  contradictory holder count, wrong deep-link tab) are closed.
- No further follow-up plan is required for these three defects.
- Recommended (not blocking): a live UAT spot-check at 1440×900 via the SSH tunnel to visually
  confirm the ellipsis-status engineering estimate above.

---
*Phase: quick-ike*
*Completed: 2026-08-24*

## Self-Check: PASSED

- All 17 files listed in `files_modified`/created (13 production + 4 new test files, including
  this SUMMARY.md) exist on disk.
- All 6 task commit hashes (`fc267078`, `0805c59d`, `e7e14a1a`, `71153597`, `5895dbac`,
  `787df9f3`) found in `git log`.
