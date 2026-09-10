---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 04
subsystem: api

tags: [go, gin, nextjs, react-hooks, abortsignal, public-profile]

# Dependency graph
requires:
  - phase: 128
    provides: "resolvePublicMemberAccess / ResolvePublicMemberAccess resolver and the recordingPublicMemberAccessResolver httptest fake this plan reuses verbatim"
  - phase: 132
    provides: "useMemberViewer / useCancellableSlugState (PMFE-02/PMFE-10) and the OwnProfileEditLink / OwnHiddenProfilePreview consumer split this plan builds on"
provides:
  - "New GET /api/v1/members/:slug/viewer backend endpoint (56-byte response) reusing the existing access resolver with zero profile load"
  - "getMemberProfile(slug, signal?) and new getMemberViewerAccess(slug, signal?) in api.ts, both threading AbortSignal into apiClientFetch"
  - "useMemberViewer's fetcher now forwards useCancellableSlugState's AbortSignal instead of silently dropping it"
  - "Shared deriveViewerStatus<T> PMFE-10 fail-closed guard backing both useMemberViewer and the new useMemberViewerAccess hook"
  - "OwnProfileEditLink now fetches only viewer facts (via useMemberViewerAccess), no longer a second full-profile load"
affects: [public-member-profile, members-slug-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Slim viewer-only handler mirrors the shape of the existing full-profile handler but skips the profile-loader call entirely (Go, gin)"
    - "Single generic status-derivation helper (deriveViewerStatus<T>) shared by two otherwise-independent React hooks to prevent guard-logic duplication"

key-files:
  created: []
  modified:
    - backend/internal/handlers/app_public_profile.go
    - backend/internal/handlers/app_public_profile_test.go
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - frontend/src/lib/useMemberViewer.ts
    - frontend/src/lib/useMemberViewer.test.ts
    - frontend/src/app/members/[slug]/OwnProfileEditLink.tsx
    - frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
    - frontend/src/app/members/[slug]/not-found.test.tsx
    - .planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/deferred-items.md

key-decisions:
  - "Reused resolvePublicMemberAccess and recordingPublicMemberAccessResolver verbatim for the new handler instead of writing a second resolver seam"
  - "Extracted PMFE-10's fail-closed guard into one generic deriveViewerStatus<T> helper rather than duplicating the loading/stale/error branching in a second hook"
  - "Fixed two pre-existing-in-this-session (but caused by this plan's own signal-forwarding change) test assertions in OwnHiddenProfilePreview.test.tsx and not-found.test.tsx rather than leaving them red"
  - "Logged one genuinely unrelated full-suite failure (api.no-token-boundary.test.ts vs MemberProfileHero.tsx, introduced by prior plan 154-03) to deferred-items.md instead of fixing it out of scope"

requirements-completed: [P154-08, P154-09, P154-10]

# Metrics
duration: ~35min
completed: 2026-09-10
---

# Phase 154 Plan 04: Slim viewer-access endpoint and AbortSignal threading Summary

**New `GET /members/:slug/viewer` endpoint (56-byte response, zero profile load) replaces the edit-link consumer's second full-profile fetch (2738 bytes for the same slug); `getMemberProfile`/`useMemberViewer` now actually forward the AbortSignal `useCancellableSlugState` already produced, closing the gap the RCA-08 report called "already existing".**

## Performance

- **Duration:** ~35 min (approximate — start time was not captured via the `record_start_time` step at session start; reconstructed from conversation span)
- **Completed:** 2026-09-10
- **Tasks:** 3/3
- **Files modified:** 10 production/test files + 1 phase-tracking doc (deferred-items.md)

## Accomplishments

- Closed RCA-08: `OwnProfileEditLink` (the signed-in edit-link consumer) no longer loads the full public profile just to read `is_owner` — it now calls the new slim `/members/:slug/viewer` endpoint via `useMemberViewerAccess`.
- Completed the AbortSignal chain that RCA-08 mistakenly described as "already existing": `getMemberProfile` never accepted a signal parameter at all before this plan; `useMemberViewer`'s fetcher dropped the signal `useCancellableSlugState` was already producing. Both are now fixed.
- Extracted the PMFE-10 fail-closed guard into one shared `deriveViewerStatus<T>` helper used by both `useMemberViewer` (full profile) and the new `useMemberViewerAccess` (slim) — no duplicated guard logic, no weakened invariant.
- `OwnHiddenProfilePreview.tsx` (the other `useMemberViewer` consumer, which genuinely needs the full profile) is byte-for-byte unchanged, confirmed via `grep` and a passing regression test.

## Task Commits

Each task was committed atomically:

1. **Task 1: New slim viewer-access backend endpoint** - `968ad364` (feat)
2. **Task 2: Frontend consumption of the slim endpoint + AbortSignal threading** - `931df6ca` (feat)
3. **Task 3: Extend regression tests, prove the shared invariant and signal forwarding** - `6a6bf333` (test)

**Plan metadata:** (this commit, made after this SUMMARY)

## Real Before/After Numbers

**Backend payload size** (measured live against the rebuilt backend container, real seeded member `d1sk`, `curl ... | wc -c`):
- `GET /api/v1/members/d1sk` (full profile, unchanged): **2738 bytes**
- `GET /api/v1/members/d1sk/viewer` (new slim endpoint): **56 bytes**
- For the edit-link consumer's specific need (`is_owner`/`is_private_preview` only), this is a **98% payload reduction** (2738 → 56 bytes) for that one request, and it no longer touches `profileLoader.GetPublicMemberProfileByID` at all — proven at the handler level by `TestGetPublicMemberViewerReportsOwnerWithoutLoadingProfile` et al. asserting `loaders.profileCalls == 0` and `loaders.projectsCalls == 0`.
- Neutral 404 parity confirmed live: `GET /api/v1/members/nonexistent-slug-xyz/viewer` → `404 {"error":{"message":"Profil nicht verfügbar"}}`, byte-identical to the existing profile endpoint's denial response.

**Backend tests** (`go test ./internal/handlers/... -run 'PublicMemberViewer|GetPublicMemberProfile' -count=1`): **8/8 passed** (4 new `GetPublicMemberViewer*` cases + 4 existing `GetPublicMemberProfile*` cases, all still green).

**Backend build/vet** (`go build ./...`, `go vet ./...`): both clean, exit 0.

**Frontend targeted suite** (`npx vitest run src/lib/useMemberViewer.test.ts "src/app/members/[slug]/OwnProfileEditLink.test.tsx" src/lib/api.auth-refresh.test.ts`): **45/45 passed** — 14 in `useMemberViewer.test.ts` (7 pre-existing `useMemberViewer` cases + 7 new mirrored `useMemberViewerAccess` cases; the plan's frontmatter said "8 existing" but the actual pre-existing count in the file was 7, all still green), 6 in `OwnProfileEditLink.test.tsx`, 25 unmodified in `api.auth-refresh.test.ts`.

**Frontend `tsc --noEmit`:** clean, exit 0, both before and after the full test-file fixes.

**Frontend full unscoped suite** (`npx vitest run`, all 296 files): **294 files passed / 1 file failed (pre-existing, out of scope) / 1 skipped**, **2274/2278 tests passed** (3 todo, unrelated). The one failing file (`api.no-token-boundary.test.ts`) is confirmed via `git log`/`git diff` to be caused by prior plan 154-03's `MemberProfileHero.tsx` raw-`fetch` change, not touched by this plan — logged to `deferred-items.md`, not fixed here (scope-boundary rule).

**Line count** (informational, per CLAUDE.md's 450-line guidance and the plan's acceptance criterion — no split required, `api.ts` is a pre-existing large shared module, kein-Rewrite scope fence):
- `frontend/src/lib/api.ts`: **10790 lines** after this plan's additions (was ~10760 before; +~30 lines for `getMemberViewerAccess` and the `signal` parameter).

## Files Created/Modified

- `backend/internal/handlers/app_public_profile.go` - added `GetPublicMemberViewer`, reusing `resolvePublicMemberAccess`, no `profileLoader` call
- `backend/internal/handlers/app_public_profile_test.go` - 4 new httptest cases for the viewer endpoint (owner, private-preview, 404 denial, exactly-once resolver call with zero loader calls)
- `backend/cmd/server/main.go` - registered `v1.GET("/members/:slug/viewer", authOptionalMiddleware, publicProfileHandler.GetPublicMemberViewer)`
- `frontend/src/lib/api.ts` - `getMemberProfile` gained an optional `signal` parameter; new `getMemberViewerAccess(slug, signal?)`
- `frontend/src/lib/useMemberViewer.ts` - fetcher forwards the AbortSignal; extracted `deriveViewerStatus<T>` shared guard; added `useMemberViewerAccess` export
- `frontend/src/lib/useMemberViewer.test.ts` - 7 new mirrored cases for `useMemberViewerAccess`; fixed the in-flight-fetch assertion to check `(slug, AbortSignal)` instead of `(slug)`
- `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` - now consumes `useMemberViewerAccess` instead of `useMemberViewer`
- `frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx` - mocks `getMemberViewerAccess` instead of `getMemberProfile`, asserts slug + `AbortSignal` instance on the call
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` - **Rule 1 fix**, updated call-args assertion for the now-forwarded signal (see Deviations)
- `frontend/src/app/members/[slug]/not-found.test.tsx` - **Rule 1 fix**, same call-args assertion fix
- `.planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/deferred-items.md` - logged the one unrelated pre-existing full-suite failure

## PMFE-10 Fail-Closed Invariant — Explicit Verification

PMFE-10 ("a hanging or stale request must NEVER report `resolved`") is unchanged in intent and now enforced by exactly ONE implementation (`deriveViewerStatus<T>` in `useMemberViewer.ts`), shared by both `useMemberViewer` and the new `useMemberViewerAccess`. Verified by:
- `useMemberViewer.test.ts`'s existing 7 cases (disabled, null-slug, in-flight, stale-superseded-requestKey, 404→unavailable, generic error, retry) — all still pass unmodified in intent, only the in-flight case's call-args assertion was extended (not weakened) to also check the signal.
- 7 newly added mirrored cases for `useMemberViewerAccess` covering the identical matrix (disabled, null-slug, in-flight, stale-superseded, 404, error, retry) — all pass.
- No second copy of the `!canFetch || state.key !== requestKey || state.status === 'loading' || state.status === 'idle'` guard exists anywhere in the diff; both hooks call the same `deriveViewerStatus` function.
- Threat register item T-154-C-02 (spoofing/elevation via stale-request race) is explicitly covered by this shared-implementation design and the regression tests above.

## Live Verification

- Rebuilt the backend container (`docker compose up -d --build team4sv30-backend`) per the phase's mandatory rule for any new route — required, since the route was 404 before rebuild.
- Confirmed live via `curl` against `http://192.168.235.196:18092` (the mapped `18092:8092` host port, not `8092` directly — corrected after an initial connection-refused on the wrong port):
  - `GET /api/v1/members/d1sk/viewer` → `200 {"viewer":{"is_owner":false,"is_private_preview":false}}` (56 bytes)
  - `GET /api/v1/members/d1sk` (full profile, same slug) → `200 {...}` (2738 bytes)
  - `GET /api/v1/members/nonexistent-slug-xyz/viewer` → `404 {"error":{"message":"Profil nicht verfügbar"}}`
- Restarted the frontend container (`docker restart team4sv30-frontend`) per the phase's HMR-unreliability rule, then verified `GET /members/d1sk` on the live frontend returns `200` with a successful Next.js compile/render (no runtime error in `docker logs`).
- No authenticated browser session was available in this environment to visually click through the owner-vs-non-owner edit-link states; that remains a live/UAT gap consistent with the phase's Phase-153 carryover note about owner-view verification requiring a real login session. The code-level and unit-test coverage (component reads `response.viewer` from the new hook exactly as before, only the data source changed) is the evidence available in this environment.

## Decisions Made

- Reused `resolvePublicMemberAccess` and the existing `recordingPublicMemberAccessResolver` test fake verbatim for the new handler — no new resolver seam, matching the interfaces block's explicit instruction.
- Extracted the PMFE-10 guard into one generic `deriveViewerStatus<T>(canFetch, state, requestKey)` function rather than writing a second copy inline in `useMemberViewerAccess` — directly required by the plan's must-haves ("enforced by one shared implementation, not two").
- Kept `useMemberViewer`'s fetcher dependency array as `[slug]` only (not `[slug, signal]`) per the plan's explicit instruction, since `useCancellableSlugState` supplies the signal at call time, not as a hook input.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, caused directly by this plan's Task 2 change] Two full-suite test files asserted `getMemberProfile` was called with only the slug**
- **Found during:** Task 3, running the full unscoped `npx vitest run` (not just the plan's three named test files) to satisfy the phase context's "no success claim without numbers, check whether a change in this plan caused it before calling it pre-existing" discipline.
- **Issue:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` and `frontend/src/app/members/[slug]/not-found.test.tsx` both assert `expect(getMemberProfileMock).toHaveBeenCalledWith('canonical-owner')`. Task 2's change to `useMemberViewer.ts`'s fetcher (now `(signal) => getMemberProfile(slug, signal)`) means the mock is now called with two arguments, breaking this exact-args assertion in both files — a direct, provable consequence of this plan's own diff (confirmed via `git log`/`git diff` that neither file nor `MemberProfileHero.tsx` was touched by this plan before the fix, ruling out any other cause).
- **Fix:** Updated both assertions to destructure the mock call and assert `slugArg === 'canonical-owner'` and `signalArg instanceof AbortSignal` — strengthens rather than weakens the original assertion's intent.
- **Files modified:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx`, `frontend/src/app/members/[slug]/not-found.test.tsx`
- **Verification:** Full unscoped `npx vitest run` re-run after the fix: both files pass; only the confirmed-unrelated `api.no-token-boundary.test.ts` failure remains.
- **Committed in:** `6a6bf333` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, two test files in one root cause)
**Impact on plan:** Directly required to keep the full suite green after this plan's own signal-forwarding change; no scope creep — no production code outside the plan's declared files was touched.

## Issues Encountered

- Initial live-verification `curl` against `http://192.168.235.196:8092` returned connection-refused; the backend container actually maps host port `18092` to container port `8092` (`docker port team4sv30-backend` → `0.0.0.0:18092->8092/tcp`). Corrected the verification commands to use `18092`; this was a verification-tooling mistake, not a code defect.
- The plan's Task 2 acceptance-criteria grep pattern (`grep -n "signal" frontend/src/lib/api.ts | grep -i getMemberProfile`) does not literally match because the `signal?: AbortSignal` parameter line and the `export async function getMemberProfile(` line are on different source lines. The underlying requirement (both `getMemberProfile` and `getMemberViewerAccess` accept and forward an optional `signal`) IS satisfied and independently confirmed via direct file inspection and `tsc --noEmit`; noting the grep pattern's literal mismatch here for transparency rather than silently declaring the criterion "passed as written".

## Requirements Tracking Note

`gsd-sdk query requirements.mark-complete P154-08 P154-09 P154-10` returned `not_found` for all
three IDs — `REQUIREMENTS.md` has no `P154-*` section at all (`grep -c "P154" REQUIREMENTS.md` →
0), mirroring the identical, already-documented Phase-153 tracking gap noted in `STATE.md`
("`.planning/REQUIREMENTS.md` has weiterhin keinen Phase-153-Abschnitt ... ein
phasenübergreifendes Tracking-Artefakt-Lücke, die keinem einzelnen Plan zuzurechnen ist"). This is
a pre-existing, phase-crossing tracking-artifact gap, not something introduced or fixable by this
plan alone — the three requirements (P154-08/09/10) ARE verified complete against the actual code
(see this SUMMARY's evidence above), just not reflected in `REQUIREMENTS.md`'s traceability table.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RCA-08 (P154-08, P154-09, P154-10) is closed: the edit-link consumer no longer duplicates a full-profile fetch, and the AbortSignal chain the original report mis-described as "already existing" is now genuinely complete end to end.
- This was the last plan in Wave 1 of Phase 154. RCA-05 (four redundant aggregator fact queries) and RCA-06 (ungated locked artwork / heavy original fallback / animated avatar) were addressed by plans 154-01/02/03 per STATE.md; RCA-07 and the Phase-153 listener-growth remeasurement remain explicitly deferred per the phase's stated scope (only meaningful after the graph-shrink work). RCA-04 (reported Chrome tab crash) remains open and unreproduced — not addressed by any 154-0x plan, consistent with STATE.md.
- One pre-existing, out-of-phase-scope full-suite failure remains open (`api.no-token-boundary.test.ts` vs `MemberProfileHero.tsx`, introduced by 154-03) — logged in `deferred-items.md`, not blocking this plan's completion.
- No live/UAT session was available in this environment to click through the owner-vs-non-owner edit-link UI states end to end; recommend a follow-up live check with an authenticated session before considering RCA-08 fully closed from a UX perspective, mirroring the same carryover gap already noted for Phase 153's owner-view checkpoint.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*

## Self-Check: PASSED

All 12 files referenced above (10 modified files + deferred-items.md + this SUMMARY) confirmed present via `[ -f ... ]`. All 3 task commit hashes (`968ad364`, `931df6ca`, `6a6bf333`) confirmed present via `git log --oneline --all`. No missing items.
