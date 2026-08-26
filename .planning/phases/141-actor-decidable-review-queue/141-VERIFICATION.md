---
phase: 141-actor-decidable-review-queue
verified: 2026-08-26T00:00:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 141: Actor-Decidable Review Queue Verification Report

**Phase Goal:** Reviewers see and navigate only work they can decide, while their own submissions remain clearly separated and protected by the same server-side policy.
**Verified:** 2026-08-26
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The actionable queue contains only review kinds the current actor may decide for the relevant group, including immediately granted or revoked specialized delegations | ✓ VERIFIED | `authorizedKinds` (`release_review_handler_authz.go`) resolves via `permissions.Service.ResolveReviewGroupAuthorization` — one live, uncached `ResolveGroupRights` call per request (no cross-request cache anywhere in the chain). Real-Postgres `TestPhase141RevokedDelegationImmediateEffect` (grant → observe in list/counts/decide-allowed → revoke → observe gone, same test, no restart) passes against a live DSN I stood up independently (`team4s_phase107_test_verify141`). |
| 2 | A reviewer's own submissions do not appear in or increment actionable work; when shown, they occupy a separate "wartet auf Fremdprüfung" lane without decision actions | ✓ VERIFIED | Two-signal self-exclusion predicate in `release_review_query_predicates.go` (app_user_id OR verified member-claim, mirroring `review_service.go`'s decision-time check exactly). `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` (real Postgres, both identity signals) passes. `OwnPendingReviewsSection.tsx` renders 5 columns, no `Aktion` column, no per-row link, no decision buttons — confirmed by reading the file and by `OwnPendingReviewsSection.test.tsx` (3/3 passing). |
| 3 | Actionable list rows, type counts, stable cursors, detail access, and "next" navigation use the same actor, group, capability, and self-review predicates | ✓ VERIFIED | `Detail`/`Next` now call the same `releaseReviewExistenceAndIdentity` shared lookup instead of 3 hand-rolled `WHERE` clauses (closes Pitfall 3). `Next`'s internal `List(...)` call threads `ActorAppUserID`/`ActorMemberIDs` (a real bug found and fixed during 141-03, confirmed by reading `release_review_query_repository.go:295-298`). `TestReleaseReviewDetailNextShareListPredicateBuilder` (real Postgres) passes. |
| 4 | Manipulated URLs and stale clients cannot enumerate or decide forbidden entries, and the final transactional decision guard remains authoritative | ✓ VERIFIED | `Detail`/`Next` return `ErrForbidden` → HTTP 403 `REVIEW_FORBIDDEN` (not 404, not 200) for an existing-but-not-actor-decidable review; cross-group/genuinely-missing stays 404 (`writeReadError`, `release_review_handler.go:337-348`). `TestReleaseReviewDetailOwnSubmissionReturns403` and `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` pass. Decision-time guard (`review_service.go`, untouched) re-validates capability/self-review/pending-state inside the transaction; `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` (real Postgres, concurrency) proves a mid-flight delegation revoke resolves deterministically to 403 or success, never a double-apply. Frontend now surfaces a real, distinct 403 branch (`page.tsx:210-216`, locked "Nicht entscheidbar für dich" copy) instead of the old generic-failure catch-all. |
| 5 | Contribution reviews remain in their existing canonical workflow rather than being moved into the text/image release queue | ✓ VERIFIED | `release_review_lifecycle_sources` view (migration 0135) is a `UNION ALL` of exactly two source types (note/media); no third branch added. `TestReleaseReviewQueueNeverIncludesContributionSourceType` (real Postgres, explicit regression guard) passes. `ContributionReviewHandler`/`ReviewRepository.ListProposedByGroup` remain untouched by this phase (confirmed: no file under that name appears in any of the 7 plans' `key-files` lists). |

### Additional Locked-Decision Truths (from 141-CONTEXT.md, verified independently)

| # | Decision | Status | Evidence |
|---|----------|--------|----------|
| 6 | D10 — Filters only expose review types the actor can use | ✓ VERIFIED | `ReleaseReviewQueueCounts.AllowedTypes` (`json:"allowed_types"`) is set by the handler from the request's resolved `AllowedKinds` (never inferred from a zero count). `ReleaseReviewsSection.tsx` omits (not disables) the `Typ` `FormField` entirely when `allowed_types.length <= 1`, and gates each `<option>`/the `Bildkategorie` field on `.includes(...)`. `TestReleaseReviewQueueOwnViewBypassesCapabilityGate` proves `view=own` bypasses the gate structurally (own-pending lane always shows both Texte/Bilder options, per D10's own-lane carve-out). |
| 7 | D11 — Revalidate authorization and state at decision time | ✓ VERIFIED (pre-existing, confirmed unbroken) | `review_service.go`'s transaction-scoped re-check (capability, self-review, pending-state) is untouched by this phase per its own stated non-goal; `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` proves it survives a mid-flight revoke. |
| 8 | D13 — Neutral empty state, exact copy locked | ✓ VERIFIED | `ReleaseReviewsSection.tsx:143-147`: three-way branch produces exactly `"Aktuell keine Prüfungen für dich offen."` for the no-filter/open case, verbatim D13 lock. `releaseReviews.test.tsx` covers both no-filter and filters-active variants (19/19 passing). |
| 9 | D15 — Sorting: newest first, descending | ✓ VERIFIED | `List`'s `ORDER BY source.submitted_at DESC, source.source_type DESC, source.source_id DESC` (`release_review_query_repository.go:109`), cursor "next page" comparison flipped to `<` to match. `TestReleaseReviewQueueRepositorySortsNewestFirst` (real Postgres) passes. |
| 10 | D01/D03 — Own submissions excluded from actionable queue; backend is canonical source; "Wartet auf Fremdprüfung" is a distinct backend-exposed mode | ✓ VERIFIED | `view=own` is a genuine third `ReleaseReviewQueueScope.View` value with inverted-polarity predicate and D10 capability-gate bypass, entirely server-side; frontend performs zero additional authorization filtering (only renders what `useReleaseReviewLane({view: 'own'})` returns). |
| 11 | D04 — Direct access to non-decidable review details returns 403, not 404, not 200 | ✓ VERIFIED | Confirmed at repository level (`Detail` returns `ErrForbidden`), handler level (`writeReadError`'s `REVIEW_FORBIDDEN` branch), and frontend level (`page.tsx`'s dedicated 403 render branch with locked copy, distinct from the unchanged 404/network message). Three independent layers of test coverage all pass. |
| 12 | D06/D07 — No leakage of unavailable review work; own-pending reveals no reviewer information | ✓ VERIFIED | Always-fake-zero "Mitwirkungen" badge deleted (not replaced) from `ReleaseReviewsSection.tsx`. `OwnPendingReviewsSection.test.tsx` explicitly asserts absence of reviewer-name/count/assignment language (D07). Two Tab badge counts (`info` vs `muted`) are fetched independently and never summed/compared anywhere in the UI (confirmed by reading `FansubEditSecondaryTabs.tsx`'s `PruefungenTabs`). |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/permissions/review_group_authorization.go` | Single-resolution review authorization | ✓ VERIFIED | Exists, calls `ResolveGroupRights` exactly once, replicates `CanReviewForFansubGroup`'s full guard chain including the stricter `ReviewContextResolver` gate. |
| `backend/internal/handlers/release_review_handler_authz.go` | Extracted `authorizedKinds`, single-resolution | ✓ VERIFIED | Calls the new entry point once per handler invocation; no `CanReviewForFansubGroup` reference remains in the handler layer. |
| `backend/internal/repository/release_review_query_predicates.go` | Shared predicate builder + existence/identity lookup | ✓ VERIFIED | Two-signal self-exclusion (`view=open/history`) / self-inclusion (`view=own`) predicate; `releaseReviewExistenceAndIdentity` shared by `Detail`/`Next`. |
| `backend/internal/handlers/release_review_handler_identity.go` | Shared actor-identity resolver | ✓ VERIFIED | `resolveActorMemberIDs`, used by `Detail`/`Next`/`Decide`/`queueOptions`. |
| `backend/internal/repository/errors.go` (ErrForbidden) | 403 sentinel | ✓ VERIFIED | Added, wired into `writeReadError` → `REVIEW_FORBIDDEN`/403. |
| `frontend/.../useReleaseReviewLane.ts` | Shared fetch/pagination hook | ✓ VERIFIED | 5/5 tests pass; `ReleaseReviewsSection.tsx` and `OwnPendingReviewsSection.tsx` both consume it. |
| `frontend/.../OwnPendingReviewsSection.tsx` | Read-only own-pending lane | ✓ VERIFIED | 290 lines, no Aktion/Einreicher column, no per-row link, no decision actions; 3/3 tests pass. |
| `frontend/.../FansubEditSecondaryTabs.tsx` (`PruefungenTabs`) | Two-track Tabs wrapper | ✓ VERIFIED | `Tabs` primitive, `info`/`muted` badge asymmetry, independent counts, `keepMountedIds`. |
| `frontend/.../NextReviewControl.tsx` | Shared resolving/available/exhausted/error control | ✓ VERIFIED | 98 lines, both `post-decision` and `standalone` modes implemented, locked exhausted-message constant shared by both. |
| `frontend/.../page.tsx` (review detail) | Honest 403 branch + Next wiring | ✓ VERIFIED | `loadError: unknown`, dedicated 403 render branch with locked copy, `NextReviewControl` wired at both call sites; 446 lines (within 450 cap). |

All files stay within CLAUDE.md's 450-line cap (verified via `wc -l`: 373, 290, 154, 446, 98 lines respectively for the frontend files; backend handler files confirmed at 443-444 lines per SUMMARY claims, consistent with `go build`/`go vet` passing with no split-related breakage).

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `List`/`Counts` | `releaseReviewQueuePredicates` | direct call | WIRED | Both call the same function; confirmed by reading `release_review_query_repository.go:100,156`. |
| `Detail`/`Next` | `releaseReviewExistenceAndIdentity` | direct call | WIRED | Both call the same shared lookup before proceeding; confirmed lines 194-207 and 257-270. |
| `Next` (internal) | `List` | direct call, actor identity threaded | WIRED | `Next`'s own `r.List(...)` call passes `ActorAppUserID`/`ActorMemberIDs` (line 295-298) — the D05 fix found during 141-03. |
| Handler `queueOptions`/`Detail`/`Next`/`Decide` | `ResolveReviewGroupAuthorization` | `authorizedKinds` | WIRED | One resolution per handler call, proven by `TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts`. |
| `main.go` | `NewReleaseReviewHandler(..., authzRepo)` | constructor wiring | WIRED | `authzRepo` (already constructed `AuthzRepository`) passed as the 4th argument; no duplicate instance created. |
| `ReleaseReviewsSection.tsx`/`OwnPendingReviewsSection.tsx` | `useReleaseReviewLane` | hook call | WIRED | Both components call the hook with different `view` values; confirmed by reading both files. |
| `page.tsx` | `NextReviewControl` | component usage, both modes | WIRED | `mode="standalone"` in the decision-actions row, `mode="post-decision"` in the success block. |
| `page.tsx` | `ApiError.status === 403` | render branch | WIRED | Distinct `ErrorState` render, confirmed distinct from the unchanged 404/network branch. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `ReleaseReviewsSection.tsx` counters | `counts.text`/`counts.image` | `useReleaseReviewLane` → `getReleaseReviewCounts` → backend `Counts()` (real SQL `COUNT(*) FILTER`) | Yes | ✓ FLOWING |
| `PruefungenTabs` badges | `actionableCount`/`ownPendingCount` | Two independent `getReleaseReviewCounts` calls (`view: 'open'`, `view: 'own'`) | Yes | ✓ FLOWING |
| `OwnPendingReviewsSection.tsx` table rows | `items` | `useReleaseReviewLane({view: 'own'})` → backend `List()` with inverted self-inclusion predicate | Yes | ✓ FLOWING |
| `ReleaseReviewsSection.tsx` Typ filter | `counts.allowed_types` | Handler sets `counts.AllowedTypes = options.AllowedKinds` from the real per-request `ResolveReviewGroupAuthorization` resolution | Yes | ✓ FLOWING |

No hollow props or hardcoded-empty data paths found in any of the touched files.

### Behavioral Spot-Checks / Probe Execution

Not run as live HTTP calls (no exposed local port for direct curl per this environment's SSH-tunnel setup) — instead, equivalent proof was obtained via real-Postgres integration tests exercising the exact same repository/handler code paths end to end (see Requirements Coverage below). This is treated as equivalent-strength evidence to a live HTTP spot-check because it verifies the same SQL/authorization code that the HTTP handlers call directly, not a mock.

**Independently executed (not merely re-run from the task prompt), with a real Postgres DSN I stood up myself** (`team4s_phase107_test_verify141`, created and dropped by me during this verification session, per `TEAM4S_PHASE107_TEST_DSN` convention):

```
go test ./internal/repository ./internal/handlers ./internal/services -run "ReleaseReview|Phase141" -count=1 -v
```

Result: all `internal/repository` and `internal/handlers` `ReleaseReview*`/`Phase141*` tests PASS (13 repository tests including all 7 Wave-0-required new Postgres tests; 17 handler tests). `internal/services` also shows `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` PASS, plus 8 pre-existing, unrelated failures in `release_review_cleanup_test.go`/`release_review_concurrency_test.go`/`release_review_decision_test.go`/`release_review_submission_test.go` — all traced to a documented, pre-existing, package-wide missing-table/missing-cache-load gap in fixtures Phase 141 never touched (`deferred-items.md`), confirmed independent of this phase by the SUMMARY's own investigation and consistent with the failure signature (`relation "user_group_capability_overrides" does not exist`) being identical across all of them.

Without the DSN set (the state the original "already run and passing" verification command left things in), all of these Postgres-backed tests silently SKIP rather than run — this was independently confirmed and then corrected for in this verification by supplying the DSN and re-running.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RDEL-05 | 141-01, 141-02 | Revoked delegation loses effect immediately, consistently, on decision/list/counter | ✓ SATISFIED | `TestPhase141RevokedDelegationImmediateEffect`, `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` — both pass against real Postgres. |
| RQUE-01 | 141-01, 141-02, 141-06 | Open list server-side contains only actor-decidable review kinds | ✓ SATISFIED | `authorizedKinds`/`ResolveReviewGroupAuthorization`; `allowed_types` echoed and used for D10 filter gating; existing typed-kind tests all green. |
| RQUE-02 | 141-02, 141-03 | Own submissions excluded from list/counts, no actionable count increment | ✓ SATISFIED | Two-signal exclusion predicate + `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts`; D04 403 at Detail/Next. |
| RQUE-03 | 141-02, 141-04, 141-05 | Own pending submissions shown separately as "Wartet auf Fremdprüfung", no decision action | ✓ SATISFIED | `view=own` scope, `OwnPendingReviewsSection.tsx`, `PruefungenTabs`. |
| RQUE-04 | 141-01, 141-02, 141-03 | List, counts, detail, next share the same predicates | ✓ SATISFIED | `releaseReviewQueuePredicates`/`releaseReviewExistenceAndIdentity` shared by all four; `TestReleaseReviewDetailNextShareListPredicateBuilder`. |
| RQUE-05 | 141-01, 141-03, 141-07 | Direct access/decision attempts stay server-side protected even with manipulated URL/stale client | ✓ SATISFIED | 403/409 mapping at handler + repository + frontend layers, concurrency-revoke test. |
| RQUE-06 | 141-02 | Contribution reviews stay in their own canonical workflow | ✓ SATISFIED | `TestReleaseReviewQueueNeverIncludesContributionSourceType`; `release_review_lifecycle_sources` view structurally unchanged (2 branches only). |

No orphaned requirements found — REQUIREMENTS.md attributes exactly RDEL-05 and RQUE-01–06 to Phase 141, and all 7 appear in at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `shared/contracts/openapi.yaml` | 8942, 9200-9214 | `ReleaseReviewView` enum still `[open, history]` (missing `own`); `ReleaseReviewCounts` schema missing `allowed_types` | ⚠️ Warning | Backend/frontend are in sync with each other (verified), but the OpenAPI contract — the project's own documented cross-layer sync mechanism (QUAL-01 discipline, CLAUDE.md "Contracts are tracked alongside code in shared/contracts/") — was not updated for this phase's two new/changed queue fields. Does not affect runtime correctness (frontend types and backend DTOs were independently verified consistent with each other), but is real documentation drift that any future contract-driven tooling or client generator would miss. None of the 7 plans' `key-files` lists include any `shared/contracts/*.yaml` file, confirming this was never in scope for any individual plan. |
| `backend/internal/services/release_review_cleanup_test.go`, `release_review_concurrency_test.go`, `release_review_decision_test.go`, `release_review_submission_test.go` | various | Pre-existing missing `user_group_capability_overrides` table / missing role-cache load in fixtures unrelated to Phase 141 | ℹ️ Info | Documented transparently in `deferred-items.md`; confirmed by independent DSN-backed test run in this verification session; none of the affected tests exercise Phase 141's own new behavior (RQUE-0x/RDEL-05/D0x); confirmed pre-existing (not a regression) via the SUMMARY's own before/after comparison using `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder`. |

No TBD/FIXME/XXX debt markers, no placeholder/coming-soon copy, and no empty-implementation stubs found in any of the 15 files this phase created or modified.

### Human Verification Required

None. All Phase-141 must-haves are server-side-driven and were verified through direct code reading plus real-Postgres/component test execution I ran independently in this session (not merely re-stated from the task prompt). No plan's `<verify>` block contains a deferred `<human-check>`. Visual/color/spacing polish (Badge variant asymmetry, Tabs primitive appearance) is covered by 141-UI-SPEC.md's locked contract and structural component tests; live cross-browser/viewport UAT is explicitly attributed to Phase 142 (QUAL-07) in REQUIREMENTS.md, not this phase.

### Gaps Summary

No blocking gaps. Two non-blocking observations are recorded above as informational/warning anti-patterns:

1. **OpenAPI contract drift (Warning):** `shared/contracts/openapi.yaml`'s `ReleaseReviewView` enum and `ReleaseReviewCounts` schema were not updated to reflect the new `own` view value and `allowed_types` field this phase introduced. Recommend a small follow-up (not a plan-checker blocker) to sync the contract file, since CLAUDE.md documents contracts as tracked alongside code.
2. **Pre-existing test-fixture debt (Info):** A documented, transparent, pre-existing gap in 4 unrelated `internal/services` test files (missing table/missing cache load) was found and explicitly logged rather than fixed, consistent with the phase's stated scope boundary. Confirmed independently in this verification session to be pre-existing and unrelated to any Phase 141 code path.

Every roadmap Success Criterion (1-5) and every locked CONTEXT.md decision explicitly named in the verification brief (D01, D03-D08, D10, D11, D13-D15) was independently confirmed present, wired, and covered by real-Postgres or component-level automated tests that I executed myself in this session (including standing up a fresh Postgres test database to force the previously-skipped Wave-0 integration tests to actually run, since the task's pre-supplied verification command had left `TEAM4S_PHASE107_TEST_DSN` unset and every Postgres-backed proof silently skipped).

---

*Verified: 2026-08-26*
*Verifier: Claude (gsd-verifier)*
