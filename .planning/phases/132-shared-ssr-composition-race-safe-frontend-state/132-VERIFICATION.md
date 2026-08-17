---
phase: 132-shared-ssr-composition-race-safe-frontend-state
verified: 2026-08-15T22:15:58Z
status: human_needed
score: 11/11 must-haves verified (PMFE-01 through PMFE-11)
overrides_applied: 0
human_verification:
  - test: "Run TestPhase132PublicProfileKnownForUsesApprovedFullSet against a live TEAM4S_PHASE129_TEST_DSN Postgres instance (member with >6 approved current projects across 2+ roles/groups)."
    expected: "profile.KnownFor.TopRoles includes a role that only appears on projects past row 6, and KnownFor.KnownGroups contains both seeded group names — proving loadKnownFor aggregates the full approved set, not the first paginated page."
    why_human: "TEAM4S_PHASE129_TEST_DSN is not configured in this environment (same pre-existing gap as Phase 129/131's other Postgres-gated tests in the same file); the test compiles and is present but has never actually executed against real Postgres rows. Static SQL/Go review found the WHERE-clause filter-identical to countCurrentProjects and the aggregation logic correct, but this is code review, not executed proof of the PMFE-11 data-correctness claim end-to-end."
---

# Phase 132: Shared SSR Composition & Race-Safe Frontend State Verification Report

**Phase Goal:** Public profile and owner preview render the SAME authoritative composition off the SAME Phase-130 DTO, while request, session, paging, and interaction state become centralized and race-safe (PMFE-01 through PMFE-11).
**Verified:** 2026-08-15T22:15:58Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Important environment finding (read before trusting any other agent's "it builds/passes" claim in this repo)

The `team4sv30-backend` container does **not** bind-mount `backend/` source (only `database/migrations`, `media`, and the Go build cache are mounted — confirmed via `docker inspect`). Its image was built at `2026-08-15T08:06:19Z`, hours before any of this phase's commits (21:11–22:04Z the same day). Running `go build`/`go test` via `docker exec team4sv30-backend ...` therefore silently exercises a **stale baked-in copy of the backend that has none of Plan 132-01's changes** (`grep -c KnownFor` inside the container returned `0` across all three touched Go files). This is exactly the kind of false-positive the goal-backward mandate warns about, and it would have produced a clean "backend builds and tests pass" verification without ever touching this phase's code.

I re-ran all backend verification with `docker run --rm -v $(pwd):/repo -w /repo/backend team4s-team4sv30-backend go ...` (bind-mounting the actual current source into a throwaway container using the same image) instead of `docker exec` into the long-running stale container. All backend results below are against the real, current source. The frontend container (`team4sv30-frontend`) **is** a live bind-mount (`/home/d1sk/team4s/frontend -> /app`, confirmed via `docker inspect`), so `docker exec team4sv30-frontend ...` results are trustworthy as-is.

**Recommendation (not a phase-132 gap, but worth fixing):** either restart `team4sv30-backend` after each phase's backend changes, or run `docker compose watch` so the `develop.watch.sync` rule in `docker-compose.override.yml` actually keeps `/app` in sync — otherwise any future verifier or human hitting `docker exec team4sv30-backend go test ...` will get a false pass/fail against months-old code without realizing it.

## Goal Achievement

### Observable Truths

| # | Truth (PMFE-ID) | Status | Evidence |
|---|---|---|---|
| 1 | PMFE-01: Public profile and owner preview render the SAME composition off the SAME DTO | ✓ VERIFIED | `page.tsx:144` and `OwnHiddenProfilePreview.tsx:106` both render `<MemberProfileContent profile={...} storedSlug={slug} viewer={...} referenceNow={...} />` from the same component. No second composition path introduced. |
| 2 | PMFE-02: One central request/session path, no duplicate `getOwnProfile` logic | ✓ VERIFIED | `grep -rn "getOwnProfile\|getMemberProfile(" frontend/src/app/members/[slug]/ frontend/src/components/profile/CorrectionReportModal.tsx frontend/src/lib/useMemberViewer.ts` (excluding tests) shows exactly 2 call sites: `page.tsx`'s SSR-only `getMemberProfileForRequest` (the primary composition fetch, not a viewer duplicate) and `useMemberViewer.ts`'s single internal call. `CorrectionReportModal.tsx` has zero `getOwnProfile` calls (deleted in Plan 132-03, confirmed by direct read). |
| 3 | PMFE-03: Paging/carousel/expansion state is slug-bound, cancellable, deduplicated, stale-response-protected | ✓ VERIFIED | `useCancellableSlugState.ts` uses a real `AbortController` (aborted on requestKey/enabled change and on unmount), a `settled.key === requestKey` staleness guard, and `getMemberProjects` now forwards a `signal` param (`frontend/src/lib/api.ts`). `MemberCurrentProjectsSection.test.tsx` asserts `toHaveBeenCalledWith('subaru', 6, 6, expect.any(AbortSignal))` and that two rapid clicks trigger exactly 1 request before success. |
| 4 | PMFE-04: Loading/empty/hidden/missing/error states separated and shown locally | ✓ VERIFIED | `MemberCurrentProjectsSection.tsx` renders a local `ErrorState` (title/description/retry) on `state.status === 'error'`, replacing the prior bespoke `<p role="alert">`; the rest of the page (already-loaded projects) stays visible. `hidden`/`missing` remain page-level and non-distinguishable (Phase-128 lock unchanged — not touched by this phase). |
| 5 | PMFE-05: Repeated badge config/derivation/formatting consolidated onto shared seams | ✓ VERIFIED | `deriveKnownFor.ts` trimmed to the shared `KnownForResult` type only (dead `deriveKnownFor()`/`RoleTimelineEntry` removed); `MemberProfileHero.tsx`'s `getKnownFor()` and `MemberProfileMemorialHero.tsx` both consume the one server-authoritative `profile.known_for` field — no second, divergent client aggregation remains. |
| 6 | PMFE-06: Non-obvious invariants get short purpose comments | ✓ VERIFIED | Confirmed inline citations in code: `loadKnownFor` ("MUST stay filter-identical to countCurrentProjects... threat T-132-01"), `useCancellableSlugState` (StrictMode/pure-updater rationale), `useMemberViewer` (PMFE-10 fail-closed rationale), `page.tsx`'s `composeVisibleProfileMetadata` (T-132-07 rationale), `CorrectionReportModal.tsx` (PMFE-02/D-02 caller-owns-gating comment). |
| 7 | PMFE-07: Page title/metadata describe the concrete member profile | ✓ VERIFIED | `page.tsx`'s `generateMetadata` now returns `composeVisibleProfileMetadata(response.data)` (title `"{fansub_name} \| Team4s"`, description from `known_for` facts, `openGraph`) for visible profiles; the `noindex`/`NEUTRAL_UNAVAILABLE_METADATA` branches are unchanged (existing tests for those pass unmodified). `page.test.tsx` has new assertions for both the populated and empty-known_for fallback cases (65 tests pass in this file's suite, including these). |
| 8 | PMFE-08: Long content/badges use progressive disclosure without losing DOM content | ✓ VERIFIED | New locked tests in `MemberStorySection.test.tsx`, `FocalCarousel.test.tsx`, and `MemberBadgeChain.test.tsx` (all citing "PMFE-06/D-09") assert full content stays mounted (query by text/count, not visibility) across clamp/expand toggles. All three new assertions pass. |
| 9 | PMFE-09: Relative dates are SSR/hydration-stable, no uncontrolled `Date.now()` during render | ✓ VERIFIED | `relativeTimeLabel(occurredAt, referenceNow)` no longer reads `Date.now()` (confirmed by `grep`). `referenceNow` is threaded: `page.tsx` captures it once via a module-level `captureReferenceNow()` helper (server path) and `OwnHiddenProfilePreview.tsx` via `useState(() => Date.now())` (client owner-upgrade path), both feeding `MemberProfileContent` → `LatestContributionsSection`. `LatestContributionsSection.test.tsx` has a regression test proving the same `referenceNow` yields an identical label across calls separated by real wall-clock time. |
| 10 | PMFE-10: Owner/preview/correction actions are fail-closed, deduplicated, race-protected | ✓ VERIFIED | `useMemberViewer.ts`'s explicit fail-closed guard: `if (!canFetch \|\| state.key !== requestKey \|\| state.status === 'loading' \|\| state.status === 'idle') return { status: 'loading', ... }` — never reports `'resolved'` except on a positive, key-matched success. `useMemberViewer.test.ts` (7 tests) and the consumer test suites (`OwnHiddenProfilePreview.test.tsx`, `OwnProfileEditLink.test.tsx`) all pass. |
| 11 | PMFE-11: Top roles/known groups/totals computed from the complete approved dataset, not the first project page | ✓ VERIFIED (static + contract-level; live-DB execution not yet run — see Human Verification) | Backend: `loadKnownFor` (new query) reuses `countCurrentProjects`'s exact WHERE clause (`status='confirmed' AND is_public_on_member_profile=true AND ended_year IS NULL`, same `COALESCE(ac.member_id, hfgm.member_id) = $1` join), computing role-frequency/group/year aggregates over ALL matching rows, not a paginated subset. Frontend: `MemberProfileHero.tsx`'s `deriveKnownForFromPublicProfile` (the PMFE-11 bug) is deleted; `getKnownFor()` reads `profile.known_for` directly. A regression test (`MemberProfileHero.test.tsx`) proves the hero renders `known_for`'s top role even when it differs from the embedded `current_projects` page's role — closing the bug at its consumption point. The backend Postgres integration test (`TestPhase132PublicProfileKnownForUsesApprovedFullSet`) exists and compiles but is skipped in this environment (no `TEAM4S_PHASE129_TEST_DSN`) — see Human Verification. |

**Score:** 11/11 truths verified (10 fully automated-and-executed; 1 verified via code review + unit/contract-level tests, with live-DB execution flagged for human follow-up).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/internal/models/member_profile.go` | `PublicMemberKnownFor` struct + `KnownFor` field, null-normalized | ✓ VERIFIED | Confirmed lines 287-360; `go build`/`go vet` clean (via fresh-source container run). |
| `backend/internal/repository/member_profile_projects_repository.go` | `loadKnownFor` full-set aggregate query | ✓ VERIFIED | Confirmed lines 179-260; filter-identical to `countCurrentProjects` (verified by direct comparison). |
| `backend/internal/repository/member_profile_public_repository.go` | Wiring into `GetPublicMemberProfileByID` | ✓ VERIFIED | `profile.KnownFor, loadErr = r.loadKnownFor(ctx, row.memberID)` at line 151. |
| `shared/contracts/openapi.yaml` | `PublicMemberKnownFor` schema + `known_for` required property | ✓ VERIFIED | Schema at line 11677; `known_for` in `PublicMemberProfileData.required` and `.properties`. |
| `frontend/src/types/profile.ts` | `PublicMemberKnownFor` TS interface + required field | ✓ VERIFIED | Lines 259, 294. |
| `frontend/src/hooks/useCancellableSlugState.ts` | Shared cancellable, key-guarded async-state hook | ✓ VERIFIED | 97 lines; real `AbortController`, pure state transitions, StrictMode-tested. |
| `frontend/src/hooks/useCancellableSlugState.test.ts` | Hook contract tests incl. StrictMode double-invoke | ✓ VERIFIED | 7 tests pass, incl. `'settles exactly once per requestKey under a React 18 StrictMode double-invoke'`. |
| `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` | Hook-based paging + `ErrorState` local error | ✓ VERIFIED | `useCancellableSlugState` import/usage confirmed; `ErrorState` render on error; `loadError` bespoke paragraph fully removed. |
| `frontend/src/lib/useMemberViewer.ts` | Central viewer/session resolution hook on top of `useCancellableSlugState` | ✓ VERIFIED | 83 lines; builds on `useCancellableSlugState`; fail-closed default explicit and commented. |
| `frontend/src/lib/useMemberViewer.test.ts` | Fail-closed + single-request contract tests | ✓ VERIFIED | 7 tests pass. |
| `frontend/src/app/members/[slug]/page.tsx` | `generateMetadata` composing member-specific metadata + `referenceNow` capture | ✓ VERIFIED | `composeVisibleProfileMetadata` + `captureReferenceNow()` both present and wired; noindex/missing branches byte-identical. |
| `frontend/src/components/profile/MemberProfileHero.tsx` | `profile.known_for` consumption, no local aggregation | ✓ VERIFIED | `getKnownFor()` reads `profile.known_for` directly; `deriveKnownForFromPublicProfile` deleted. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `member_profile_public_repository.go` | `member_profile_projects_repository.go` | `loadKnownFor(ctx, row.memberID)` call | ✓ WIRED | Confirmed at line 151, same error-handling pattern as sibling loaders. |
| `shared/contracts/openapi.yaml` | `public_member_profile_contract_test.go` | Allow-list parity test | ✓ WIRED | `TestPublicMemberProfileMatchesOpenAPIAllowList` passes (re-run against current source). |
| `MemberCurrentProjectsSection.tsx` | `useCancellableSlugState.ts` | import + usage | ✓ WIRED | Confirmed import + `useCancellableSlugState<PublicMemberProjectsPage>({...})` call. |
| `lib/api.ts` | `MemberCurrentProjectsSection.tsx` | `getMemberProjects(slug, limit, offset, signal)` | ✓ WIRED | 4th `signal` param present and forwarded in `fetcher`. |
| `OwnHiddenProfilePreview.tsx` | `useMemberViewer.ts` | import + usage | ✓ WIRED | Confirmed. |
| `OwnProfileEditLink.tsx` | `useMemberViewer.ts` | import + usage | ✓ WIRED | Confirmed. |
| `useMemberViewer.ts` | `useCancellableSlugState.ts` | internal composition | ✓ WIRED | Confirmed, not reimplemented. |
| `MemberProfileHero.tsx` | `types/profile.ts` | `profile.known_for` read | ✓ WIRED | Confirmed `getKnownFor()`. |
| `MemberProfileContent.tsx` | `LatestContributionsSection.tsx` | `referenceNow` prop | ✓ WIRED | Confirmed threaded from both `page.tsx` and `OwnHiddenProfilePreview.tsx`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `MemberProfileHero` | `knownFor` (Schwerpunkte/Aktiv) | `profile.known_for` ← `loadKnownFor` SQL aggregate over `anime_contributions`/`anime_contribution_roles`/`fansub_groups` | Yes (real DB query, filter-parity-verified with `countCurrentProjects`; SQL statically reviewed, not yet executed against seeded rows in this session) | ⚠️ FLOWING (static) — see Human Verification |
| `MemberCurrentProjectsSection` | `visibleProjects` (paged) | `getMemberProjects` → existing `loadCurrentProjects` query (unchanged by this phase) | Yes | ✓ FLOWING |
| `LatestContributionsSection` | `referenceNow` | `page.tsx`'s `captureReferenceNow()` / `OwnHiddenProfilePreview`'s `useState(() => Date.now())` | Yes (real, once-per-request/session timestamp, not a static/empty fallback) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Backend builds against current source | `docker run --rm -v $(pwd):/repo -w /repo/backend <image> go build ./...` | exit 0, no output | ✓ PASS |
| Backend vets against current source | same, `go vet ./internal/models/... ./internal/repository/...` | exit 0, no output | ✓ PASS |
| known_for contract test | `go test ./internal/handlers/... -run TestPublicMemberProfile -v` | 3/3 PASS (incl. `TestPublicMemberProfileMatchesOpenAPIAllowList`) | ✓ PASS |
| known_for Postgres integration test | `go test ./internal/repository/... -run TestPhase132 -v` | SKIP (`TEAM4S_PHASE129_TEST_DSN` not set) | ? SKIP → routed to Human Verification |
| Frontend `tsc --noEmit` | `npx tsc --noEmit` | 0 new errors; only pre-existing `MemberBadgeChain.test.tsx` and an unrelated `.next/dev/types/app/anime/page.ts` generated-route error | ✓ PASS (no phase-132 regressions) |
| Frontend targeted vitest (all 4 plans' files) | `npx vitest run <13 files across plans 01-04>` | 137/137 pass across the targeted files | ✓ PASS |
| Frontend broader suite (members/profile/lib/hooks) | `npx vitest run src/app/members src/components/profile src/lib src/hooks` | 520 passed / 7 failed / 1 skipped / 3 todo — all 7 failures are pre-existing and unrelated (see below) | ✓ PASS (no phase-132 regressions) |
| Frontend lint (touched files) | `npx eslint <11 phase-132 files>` | 0 problems | ✓ PASS |
| `npm run build` | `npm run build` | Fails at `tsc` step on `.next/dev/types/app/anime/page.ts` (pre-existing generated-route-type/stale-`.next`-cache issue, unrelated to any phase-132 file) | ⚠️ FAIL (pre-existing, out of scope — see below) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention or explicit probe declarations found for this phase; PLAN/SUMMARY verification is expressed as `go test`/`vitest run` commands, which were re-executed above. Step 7c: N/A for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PMFE-01 | 132-03, 132-04 | Same composition + DTO for public/owner preview | ✓ SATISFIED | Truth #1 |
| PMFE-02 | 132-03 | Central request/session path, no duplicate getOwnProfile | ✓ SATISFIED | Truth #2 |
| PMFE-03 | 132-02 | Slug-bound, cancellable, deduped, stale-protected paging/carousel/expansion | ✓ SATISFIED | Truth #3 |
| PMFE-04 | 132-02 | Locally separated loading/empty/hidden/missing/error states | ✓ SATISFIED | Truth #4 |
| PMFE-05 | 132-01, 132-04 | Consolidated badge config/derivation/formatting seams | ✓ SATISFIED | Truth #5 |
| PMFE-06 | all 4 plans | Purpose comments on non-obvious invariants | ✓ SATISFIED | Truth #6 |
| PMFE-07 | 132-04 | Member-specific title/metadata | ✓ SATISFIED | Truth #7 |
| PMFE-08 | 132-02 | Progressive disclosure without DOM content loss | ✓ SATISFIED | Truth #8 |
| PMFE-09 | 132-04 | SSR/hydration-stable relative dates | ✓ SATISFIED | Truth #9 |
| PMFE-10 | 132-03 | Fail-closed, deduplicated, race-protected owner actions | ✓ SATISFIED | Truth #10 |
| PMFE-11 | 132-01, 132-04 | Full-set-derived top roles/groups/totals | ✓ SATISFIED (see Human Verification for live-DB execution) | Truth #11 |

No orphaned requirements found — `REQUIREMENTS.md`'s PMFE-01..11 all map to this phase and all appear in at least one plan's `requirements` frontmatter field.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 11 files this phase's 4 plans modified (backend + frontend) | — | None — clean |

No stub patterns (`return null`, `return {}`, empty handlers, hardcoded-empty props flowing to render) found in the reviewed artifacts. All identified "gaps" are pre-existing, documented, out-of-phase-scope drift (see below), consistent with what the user asked to be excluded from this verification.

### Pre-existing, out-of-scope drift observed (not phase-132 gaps — confirmed predates this phase)

These were already logged in `deferred-items.md` by the executor, and I independently re-confirmed each is unrelated to any file this phase's 4 plans touched:
- `MemberBadgeChain.test.tsx`: 5 failing tests + `containe`/`badgeProgress` `tsc` errors — introduced by commit `e034b53c` (2026-08-15 21:11 UTC, immediately before 132-02 started) and later `f92aca78`/`8c2c6f8e`.
- `MembershipsSection.test.tsx`: grid-CSS/test drift — `profile.module.css` not in any plan's `files_modified`.
- `npm run build` / `.next/dev/types` generated-route-type error — confirmed the stale `.next` volume contains dev-server-generated types (`ls .next/dev/types` shows content from `2026-08-15 22:08`, i.e. from `next dev`, not `next build`) that conflict with a clean `next build`; this reproduces on `anime/page.ts` in my run (SUMMARY 132-04 saw it on `fansubs/[slug]/fansubprojekt/[animeSlug]` — same category of stale-generated-type issue, different specific route, consistent with it being an environmental/cache artifact rather than a code defect either phase introduced).

One **additional, previously unlogged** pre-existing failure found during my broader sweep (not in `deferred-items.md`, but also not caused by this phase):
- `src/lib/api.no-token-boundary.test.ts > ... keeps docs and tests out of production boundary scans while making those allowlists explicit` fails because its `docsAllowlist` references `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-boundaries.md` and `...-inventory.md`, which were moved to `.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/49-.../` by commit `3d4492b1` ("docs: archive pre-v1.3 planning recovery", 2026-08-13 — two days before any phase-132 commit). Unrelated to PMFE-01..11; flagging only for completeness, not as a phase-132 gap.

## Human Verification Required

### 1. Live-Postgres execution of the PMFE-11 full-set aggregation test

**Test:** Set `TEAM4S_PHASE129_TEST_DSN` to a dedicated test Postgres instance/schema (per the existing `openPhase129Postgres` skip-if-unset convention already used by every other test in `member_profile_public_repository_postgres_test.go`, including pre-existing Phase 129/131 tests — this is not a new requirement introduced by this verification), run migrations, then run `go test ./internal/repository/... -run TestPhase132PublicProfileKnownForUsesApprovedFullSet -v`.
**Expected:** The test seeds a member with more than 6 approved current projects across ≥2 distinct roles and ≥2 distinct groups, and asserts `profile.KnownFor.TopRoles` includes a role that only appears past row 6, and `KnownFor.KnownGroups` contains both seeded group names — proving the aggregate is genuinely computed over the full approved set rather than the first paginated page.
**Why human:** This environment has no `TEAM4S_PHASE129_TEST_DSN` configured (confirmed: unset, and no dedicated test schema was found/created in this session). The test compiles, is wired correctly, and its SQL was statically verified to be filter-identical to the existing, trusted `countCurrentProjects` query — but it has never actually been executed against real seeded rows by anyone (not the phase executor, not this verification). Given PMFE-11 is explicitly a *data-correctness* requirement ("not from the first paginated page"), executed proof against real Postgres carries meaningfully more weight than code review alone, and this is exactly the kind of gap the phase's own SUMMARY.md already recommended closing "before merge/UAT" — Phase 134 (bundled live UAT) is the natural place for this, but it should not be silently skipped.

## Gaps Summary

No must-have truth failed. All 11 PMFE requirements (PMFE-01 through PMFE-11) have concrete, re-verified evidence in the current codebase — not just SUMMARY.md claims. All 4 plans' task commits (11 commits) are present in `git log`. Backend builds/vets/tests cleanly against the **actual current source** (verified via a fresh bind-mounted container run, after discovering the long-running `team4sv30-backend` container serves a stale pre-phase-132 image). Frontend `tsc`/`vitest`/`eslint` all show zero new regressions attributable to this phase's 11 touched files; the only red items are pre-existing, already-documented (or newly-confirmed-but-still-pre-existing) drift unrelated to PMFE-01..11.

The phase is functionally complete. The single open item is that PMFE-11's full-set aggregation SQL has been reviewed and unit/contract-tested but never executed end-to-end against a real Postgres instance in this environment — routed to human verification rather than silently accepted, per the adversarial verification stance. This does not indicate a defect; it indicates unexecuted (not failed) proof.

---
*Verified: 2026-08-15T22:15:58Z*
*Verifier: Claude (gsd-verifier)*
