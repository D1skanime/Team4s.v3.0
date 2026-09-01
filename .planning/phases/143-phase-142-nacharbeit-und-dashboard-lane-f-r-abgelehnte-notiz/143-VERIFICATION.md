---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
verified: 2026-09-01T23:58:00Z
status: passed
score: 7/7 success criteria verified
overrides_applied: 0
---

# Phase 143 Verification Report

**Phase Goal:** Die in der externen Codeprüfung vom 2026-09-01 belegten Defekte der Phase-142-Nacharbeit
sind geschlossen, und abgelehnte eigene Release-Notizen sind gruppiert im persönlichen Dashboard
sichtbar.

**Verified:** 2026-09-01T23:58:00Z
**Verdict: ACHIEVED**

All 7 ROADMAP.md success criteria were independently re-verified against the running codebase (not
against SUMMARY.md claims): full backend build/vet, a full frontend `npx vitest run` (288/289 files,
2150/2154 tests, 0 unexpected failures), the DSN-gated migration idempotency/reversibility proof
(re-run live against `team4sv30-db`, not just trusted from a prior SUMMARY), a live `npx eslint .`
run confirming the `no-restricted-syntax` ratchet, and direct source inspection of every file named
in ROADMAP.md's criteria text. Additionally, the 4 code-review fixes the user explicitly authorized
after 143-REVIEW.md (CR-01, CR-02, WR-01, WR-04, IN-01 — 5 items, 2 Critical) were re-confirmed present
in the current source, not just claimed in REVIEW.md's "Post-Review Fix Status" addendum.

Two lower-severity findings remain intentionally open by explicit prior user direction (WR-02, WR-03)
and are called out below as residual, non-blocking debt — they do not fail any ROADMAP success
criterion.

## Goal Achievement — ROADMAP Success Criteria

| # | Criterion (paraphrased) | Status | Evidence |
|---|---|---|---|
| 1 | 17 red frontend test files green or documented debt; contract-drift + missing-provider fixes | ✓ VERIFIED | Full `npx vitest run` inside `team4sv30-frontend`: **288 files passed, 1 skipped (289); 2150 tests passed, 1 skipped, 3 todo (2154); 0 unexpected failures.** `v12-projection-contract.test.ts` (contract-drift file) passes (6/6). The previously-flagged exception `TestPhase136NarrowRoleDefaultsSeedToHandlerContract` (fixed same-day per STATE.md, commit `fa023325`) re-run directly and passes. |
| 2 | Migration 0154 replaced by an idempotent migration with a working `down` that resolves 0153 instead of re-deleting it | ✓ VERIFIED | Read `database/migrations/0159_role_capability_defaults_reset.{up,down}.sql` directly: `up.sql` is additive-only (`INSERT ... ON CONFLICT (role_code, action_code) DO NOTHING`, **no `DELETE`** — confirms CR-02's post-review fix genuinely landed); `down.sql` deletes only the 220 non-techadmin tuples `up.sql` inserted, explicitly preserving all techadmin rows. Re-ran `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` live (`docker compose exec` inside the running backend container, `TEAM4S_PHASE134_MIGRATION_DSN` pointed at the `postgres` maintenance DB) — **PASS (0.60s)**, proving a second raw re-application of 0159 is a true no-op and its `down` leaves 13 techadmin rows intact. |
| 3 | 3 raw-SQL methods moved from `dashboard_me_handler.go` into the repository layer; group-media review permission corrected to a review action; N+1 permission calls memoized; new tests | ✓ VERIFIED (1 minor WARNING) | `grep -c "h.db.Query" backend/internal/handlers/dashboard_me_handler.go` → **0**. `attachPendingGroupMediaReviewAttention`/`attachPendingReleaseReviewAttention` are now thin permission-filtering loops delegating to `ReleaseReviewQueryRepository.{PendingGroupMediaReviewAttention,PendingReleaseReviewAttention}`; gate confirmed as `permissions.ActionReviewImageDecide` (not `ActionFansubGroupEdit`); both loops memoize per distinct `FansubGroupID` via a local map (read at source). Live-ran the 3 new repository tests (`TestPendingReleaseReviewAttentionExcludesActorsOwnSubmissionsViaBothSignals`, `TestPendingGroupMediaReviewAttentionExcludesLogoBannerAndNonReviewItems`, `TestPendingOwnNoteRevisionAttentionOnlyRejectedOwnNotes`) against a real Postgres fixture — **all 3 PASS**. `TestDashboardMeHandler*`/`TestGetOwnDashboard*` handler tests pass. **Minor WARNING:** the self-exclusion predicate (`submitter_app_user_id <>`) still exists in **2** repository-layer locations (`release_review_query_repository.go`'s new `PendingReleaseReviewAttention` method, and the pre-existing Phase-141 `release_review_query_predicates.go` shared builder used by `List`/`Counts`) — not literally the single occurrence the code's own comment claims ("the ONLY copy of this rule left in the codebase") or that VALIDATION.md's grep check targets. Functionally correct and non-duplicative with the handler layer (the actual regression risk CONTEXT.md flagged), but the two implementations could drift independently over time. Non-blocking — see Gaps/Residual Debt below. |
| 4 | Focus tests for `ReleaseMetadataCreditService.AwardIfCompleted` (incl. ambiguous ID lookup) and `UpdateAnimeFansubProjectTimeline`'s date validation | ✓ VERIFIED | `TestReleaseMetadataCreditServiceAwardIfCompleted` (2 subtests, incl. `AmbiguousIDCollisionCreditsTheWrongReleaseVersion`) — **PASS**, live Postgres fixture. `TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease` (3 subtests) — **PASS**. `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker` re-run — **PASS**, and its route string is confirmed fixed to `/timeline` (not `/project-timeline`) by direct grep. |
| 5 | `has_own_notes` excludes rejected notes; frontend `isDone()` reflects the corrected flag | ✓ VERIFIED | `anime_contributions_member_project_repository.go`'s `has_own_notes` `EXISTS` subquery now `LEFT JOIN`s `release_version_note_review_lifecycle` and requires `(lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')`. `TestGetMemberProjectDetailHasOwnNotesExcludesRejectedNote` / `...IncludesNoLifecycleNote` / `...ExcludesTombstonedNote` all **PASS** against a live Postgres fixture. Frontend `isDone()` (`me/projects/[animeId]/group/[fansubGroupId]/page.tsx:53`) is unchanged (`has_own_notes \|\| has_own_media`) and correctly inherits the upstream fix without needing its own logic change. |
| 6 | `ReleaseVersionMetadataFields.tsx`/`AnimeProjectTimelineSection.tsx`/`workspace.module.css` on design-system primitives/tokens; `no-restricted-syntax` at `error` with a frozen, shrink-only legacy exemption list | ✓ VERIFIED | Live `npx eslint .` inside `team4sv30-frontend`: **exit 1, but the 11 errors present are all pre-existing/unrelated** (`no-require-imports`, `react-hooks` setState-in-effect, `react/no-unescaped-entities` — confirmed by grep that none are `no-restricted-syntax`). `grep -nE "<input\|<select\|<textarea\|<button"` on both Criterion-6 target `.tsx` files → **0 matches**. `.metadataError`/`.metadataSuccess` in `workspace.module.css` now use `var(--color-error)`/`var(--color-success)`/`color-mix(...)` and `var(--space-*)`/`var(--radius-sm)` — no raw hex, no `padding: 10px 12px`. `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs` contains exactly **67** entries (matches VALIDATION.md's measured count) and does **not** list either Criterion-6 target file. |
| 7 | Rejected own release notes appear under "Braucht deine Aufmerksamkeit," grouped per anime + fansub group, with Folge/title/link to `/me/releases/{versionId}/workspace?tab=notes`; `rejected` only, never `tombstoned`; reuses Criterion-3's repository aggregation with no new handler query; DTO/TS/OpenAPI in sync | ✓ VERIFIED | Backend: `ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention` filters `lifecycle.review_state = 'rejected'` explicitly (excludes `tombstoned`/`pending`/`confirmed`) plus `rvn.deleted_at IS NULL`. `dashboard_me_handler.go`'s `attachPendingOwnNoteRevisionAttention` calls only this repository method (0 new `h.db.Query`, confirmed above). Contract chain confirmed present end-to-end: `OwnDashboardData.PendingOwnNoteRevisions` (Go) → `pending_own_note_revisions` (`shared/contracts/openapi.yaml`, `OwnDashboardPendingOwnNoteRevisionGroup`/`Item` schemas) → `pending_own_note_revisions` (`frontend/src/types/dashboard.ts`) → `AttentionSection.tsx`'s `pendingOwnNoteRevisions` prop, rendered as a 5th grouped lane (per `anime_id`+`fansub_group_id`) with `Folge {n}`/note title/`Link href="/me/releases/{id}/workspace?tab=notes"`. `dashboard/page.tsx` wires `state.dashboardData.pending_own_note_revisions` into the prop. `npx vitest run src/app/me/dashboard` — **41/41 tests pass** across 7 files, including 13 `AttentionSection.test.tsx` cases. |

**Score:** 7/7 ROADMAP success criteria verified. 0 BLOCKERS. 1 minor WARNING (Criterion 3's "exactly once" self-exclusion nuance, non-functional).

## Post-Review Fix Verification (independent re-check, not trusted from REVIEW.md)

143-REVIEW.md found 2 Critical + 4 Warning + 1 Info issues; the user explicitly authorized fixing 5
of the 7 (both Criticals + 2 Warnings + the Info) before this verification pass. Re-checked each
directly against current source rather than trusting REVIEW.md's "Post-Review Fix Status" addendum:

| Finding | Claimed fix | Independently confirmed |
|---|---|---|
| CR-01 (unescaped HTML injection in invitation emails) | `37961c60` | ✓ `app_auth_invitations.go:182-187` wraps `inviterName`/`groupName` in `html.EscapeString(...)` at all 3 interpolation sites. |
| CR-02 (migration wipes `role_capabilities` unconditionally) | `00218f58` | ✓ `0159...up.sql` has no `DELETE`; additive `INSERT ... ON CONFLICT DO NOTHING` only. Live DSN-gated test re-run confirms idempotency + techadmin-row survival (see Criterion 2 above). |
| WR-01 (mojibake German strings in `app_auth_*` split files) | `251a00b1` | ✓ `grep -c "Ã"` across `app_auth*.go` → 0. (Mojibake remains in 3 unrelated files outside this phase's scope — `fansub_media_review_handler.go`, `config.go`, `segment_grant.go` — correctly out of WR-01's stated file scope.) |
| WR-04 (vacuous test assertion, mojibake literal) | `20564956` | ✓ `page.test.tsx:417` now reads `"Notizen / Beiträge"` (correct UTF-8), matching every other assertion in the file. |
| IN-01 (dead `errors` import keeper) | `c431531f` | ✓ No `errors` import or `var _ = errors.New` line remains in `contribution_proposals_me_test.go`. |
| WR-02 (`GetOwnDashboard` omits `PendingGroupMediaReviews: []...{}` init) | **open, out of scope this pass** | ✓ Confirmed still open — `member_profile_dashboard_repository.go:253-265`'s struct literal has no `PendingGroupMediaReviews` field set. Masked in practice by the handler's unconditional overwrite (same as REVIEW.md described); non-blocking, documented residual debt. |
| WR-03 (ambiguous `rv.id`/`rev.id` credit lookup) | **open, deliberately deferred** | ✓ Query unchanged (`release_metadata_credit_service.go:43-51` still has the `OR`-joined lookup); the new test explicitly documents rather than fixes the behavior, matching VALIDATION.md's stated test-only phase scoping and 143-10-SUMMARY.md's "Documented Finding" section. |

## Required Artifacts (file-size cap)

ROADMAP.md's Randbedingungen names 4 pre-existing over-cap files plus a 4-way split of `app_auth.go`.
All were re-measured directly (not trusted from SUMMARY line-count claims):

| File | Cap | Current lines | Status |
|---|---|---|---|
| `backend/internal/repository/member_claims_repository.go` | 450 | 344 | ✓ VERIFIED |
| `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` | 450 | 425 | ✓ VERIFIED |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | 450 | 251 | ✓ VERIFIED |
| `backend/internal/repository/member_profile_projects_repository.go` | 450 | 323 | ✓ VERIFIED |
| `backend/internal/handlers/app_auth.go` | 450 | 183 | ✓ VERIFIED |
| `backend/internal/handlers/app_auth_invitations.go` | 450 | 391 | ✓ VERIFIED |
| `backend/internal/handlers/app_auth_group_members.go` | 450 | 207 | ✓ VERIFIED |
| `backend/internal/handlers/app_auth_group_member_roles.go` (deviation: split from `app_auth_group_members.go`, documented in STATE.md) | 450 | 306 | ✓ VERIFIED |
| `backend/internal/handlers/app_auth_capabilities.go` | 450 | 272 | ✓ VERIFIED |

All newly-created Criterion-7 files also measured under cap: `release_review_query_own_note_revisions.go` (78), `release_review_query_repository.go` (408), `release_review_query_scan_helpers.go` (117), `workspaceHelpers.ts` (57), `ReleaseVersionMetadataFields.tsx` (138), `AnimeProjectTimelineSection.tsx` (125), `AttentionSection.tsx` (230).

## Backend Build/Vet

`go build ./...` — **clean, exit 0** (re-run live inside `team4sv30-backend`, confirmed container source is
in sync with host via a spot-check diff of `CR-01`'s `html.EscapeString` fix and `CR-02`'s migration
SQL, both byte-identical between host and container).
`go vet ./...` — **clean, exit 0**.

## Data-Flow Trace (Level 4) — Criterion 7 dashboard lane

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `AttentionSection.tsx` | `pendingOwnNoteRevisions` prop | `dashboard/page.tsx`'s `state.dashboardData.pending_own_note_revisions` | ✓ — traced to `GET /api/v1/me/dashboard` → `GetOwnDashboard`/`attachPendingOwnNoteRevisionAttention` → `ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention` (real SQL query against `release_version_notes`/`release_version_note_review_lifecycle`, not a static/empty return) | ✓ FLOWING |

## Requirements Coverage

No requirement IDs map to this phase — explicitly a remediation phase (143-VALIDATION.md: "No
requirement IDs exist for this phase"). ROADMAP.md's 7 numbered success criteria (verified above)
are the phase's full accountability surface.

## Anti-Patterns Found

None blocking. Scanned all files touched by this phase's diff (`80 files changed` per `git diff
--stat`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder patterns — none found in production code
paths beyond the already-tracked, explicitly-scoped-out items (WR-02, WR-03, and the backlog item
`.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md`, all of which are
named debt with an owner path, not silent stubs).

## Residual, Non-Blocking Debt (does not fail any ROADMAP criterion)

1. **Criterion 3's self-exclusion predicate exists in 2 repository-layer locations, not literally 1**
   (`release_review_query_repository.go` vs. the pre-existing `release_review_query_predicates.go`
   shared builder). The code comment overstates this ("the ONLY copy... left in the codebase"). Both
   implementations are correct and independently tested; the actual regression risk CONTEXT.md
   identified (handler duplicating the repository's rule) is fully resolved. Recommend a follow-up
   quick-task to either fold `PendingReleaseReviewAttention`'s inline predicate into
   `releaseReviewQueuePredicates` or correct the comment's claim.
2. **WR-02** (`PendingGroupMediaReviews` defense-in-depth nil-init) — open, explicitly deferred by the
   user this pass.
3. **WR-03** (ambiguous `rv.id`/`rev.id` credit-service lookup) — open, explicitly deferred; tracked in
   143-10-SUMMARY.md and re-confirmed present today.
4. **No-restricted-syntax legacy migration** (67 files, 264 violations) — tracked at
   `.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md`, explicitly out
   of this phase's scope per the user's checkpoint decision.

None of the above are must-haves under ROADMAP.md's 7 success criteria; they are pre-existing or
explicitly-scoped-out items surfaced by 143-REVIEW.md and knowingly left open. No override entry is
required since none of them constitute a FAILED must-have — they are documented, not silently
dropped.

## Human Verification Required

None. Per 143-VALIDATION.md, all 7 criteria have automated verification (test command, eslint
command, or grep assertion) and none require visual/UX judgment beyond what the new
`AttentionSection.test.tsx` cases (13 tests, including empty-state and multi-group-grouping cases)
already cover. This verification pass independently re-ran every one of those automated checks live
against the codebase rather than trusting SUMMARY.md claims.

---

_Verified: 2026-09-01T23:58:00Z_
_Verifier: Claude (gsd-verifier)_
