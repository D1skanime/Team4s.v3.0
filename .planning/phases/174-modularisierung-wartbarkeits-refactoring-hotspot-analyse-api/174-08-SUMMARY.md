---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 08
subsystem: api
tags: [typescript, nextjs, api-client, module-boundaries, verification]

# Dependency graph
requires:
  - phase: 174-07
    provides: final triage of the 27-name unclear bucket; api.ts reduced to a pure 34-line barrel
provides:
  - "Definitive proof that frontend/src/lib/api/*'s current export surface is a strict superset of the pre-Welle-2 baseline (commit fdb9f610ee4ec939598995ac2b4a488ca6e3e02a): 0 names dropped, 0 silently renamed, exactly 18 newly-exported names (all legitimate D-09 shared-infrastructure helpers needed for cross-module imports, each verified by grep crossref evidence)"
  - "A tightened client.ts: 4 previously-exported-but-zero-consumer helpers (ParsedApiErrorPayload, writeBrowserCookie, isAuthRelatedError, ensureFreshRuntimeSession) made module-private again, closing an unintended barrel surface leak"
  - "Confirmed 0 circular dependencies in frontend/src/lib (matches 174-01 baseline) and exactly 7 unchanged pre-existing cycles in the full frontend/src tree, none newly involving lib/api/*"
  - "Confirmed client.ts's D-11 directional dependency: imports AdminAnimeAniSearchEditConflictResult/AdminAnimeAniSearchCreateConflictResult only from the neutral @/types/admin leaf, never from any lib/api/* domain module"
  - "Full regression gate (tsc, eslint, vitest 362-file suite, docker compose build --no-cache) green against the exact pre-existing baseline — Welle 2 is closed"
affects: [any future phase touching frontend/src/lib/api.ts or frontend/src/lib/api/*; Welle 3 (Frontend-Hotspots) may now proceed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Export-parity audit via normalized name extraction (perl regex over `^export` lines, deduplicated, diffed with comm -23/-13) against a git-historical baseline commit — catches drops/renames that line-count or file-count metrics alone would miss"
    - "Crossref grep evidence before deciding whether a module-private helper needs 'export': grep -rl for a name across every sibling file in lib/api/*, minus the owning file itself, decides keep-exported vs. un-export, not a blanket assumption that cross-file helpers always need export"

key-files:
  modified:
    - frontend/src/lib/api/client.ts

key-decisions:
  - "22 raw 'added' names surfaced by the export diff split into two classes: 18 are genuine D-09 shared-infrastructure exports with real cross-module consumers inside lib/api/* (authorizedFetch, parseApiError, withAuthHeader, getApiBaseUrl, buildCursorQuery, mapMemberGroupStory, etc.) and were left as-is; 4 (ParsedApiErrorPayload, writeBrowserCookie, isAuthRelatedError, ensureFreshRuntimeSession) had zero cross-file consumers anywhere in frontend/src and were un-exported to close the unintended barrel leak and restore closer parity with the 'none added' must-have"
  - "client.ts's pre-existing D-24 line-count exception (documented in 174-02-SUMMARY.md: ~910+ lines, justified because authorizedFetch's auth-refresh-on-401 retry chain is one cohesive unit) still applies unchanged — this plan's edit only removed 4 `export` keywords, no lines added/removed in net content, no new D-24 documentation needed"
  - "Task 2's own verification work required no further code changes, so no 'docs(174-08): verify...' commit was created per the plan's own guidance to skip an empty commit when only verification occurred — this SUMMARY is the record of that verification instead"

requirements-completed: [D-08, D-09, D-10, D-11, D-12, D-19, D-24]

# Metrics
duration: 75min
completed: 2026-10-05
---

# Phase 174 Plan 08: Welle-2 closing export-parity and regression audit Summary

**Full-repo export-diff against the pre-split git baseline found zero dropped/renamed names and exactly 22 newly-surfaced ones; 18 are legitimate shared-infrastructure exports, 4 were an unintended barrel leak now closed by un-exporting them from `client.ts`. Madge, tsc, eslint, the full 362-file Vitest suite, and a `docker compose build --no-cache` production rebuild all confirm Welle 2 is behavior-preserving and complete.**

## Performance

- **Duration:** ~75 min
- **Completed:** 2026-10-05
- **Tasks:** 2 (Task 1 export-diff + fix, Task 2 madge/full-gate verification)
- **Files modified:** 1 (`client.ts`, 4 lines changed)

## Accomplishments

- Reconstructed the complete current export surface of `frontend/src/lib/api/*` (34 files, excluding the 5 canary test files and the 2 pre-existing files `admin-anime-intake.ts`/`segment-contributors.ts` per the plan's explicit exclusion list) and diffed it against the git-historical pre-split baseline (`git show fdb9f610ee4ec939598995ac2b4a488ca6e3e02a:frontend/src/lib/api.ts`)
- Found **zero dropped names** and **zero renamed/re-resolved implementations** — the Tampering threat (T-174-02-01) this plan exists to close is fully mitigated
- Found 22 raw "added" names not in the historical 371; triaged each via `grep -rl` crossref evidence across every sibling `lib/api/*` file: 18 are genuine cross-module shared-infra consumers (keep exported, per D-09), 4 had zero crossrefs anywhere in `frontend/src` (un-exported, closing an unnecessary barrel-surface leak)
- Confirmed `madge --circular` reports 0 cycles for `src/lib` (matches 174-01 baseline) and exactly the same 7 pre-existing cycles for the full `src` tree, none newly involving `lib/api/*`
- Confirmed the specific D-11 directional risk the orchestrator flagged: `client.ts` imports `AdminAnimeAniSearchEditConflictResult`/`AdminAnimeAniSearchCreateConflictResult` only from `@/types/admin` (never from any `lib/api/*` domain module), and neither type is redefined anywhere under `lib/api/`
- Ran the complete gate: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (full 362-file suite), and an authoritative `docker compose build --no-cache team4sv30-frontend` — all green against the documented pre-existing baseline, zero new regressions

## Task 1: Full-repo export-diff proof against the pre-split baseline

**Method:** Normalized every `^export` line in the 34 non-excluded `frontend/src/lib/api/*` files (and the barrel `api.ts` itself, which contributed 0 domain exports — confirmed pure `export * from "./api/..."`) into bare exported names via a perl regex covering `function`/`async function`/`const`/`interface`/`type`/`class` declarations, sorted and deduplicated. Did the same for the historical baseline (`git show fdb9f610ee4ec939598995ac2b4a488ca6e3e02a:frontend/src/lib/api.ts`). Diffed with `comm -23`/`comm -13`.

**Counts:**
| | Raw `^export` lines | Unique names |
|---|---|---|
| Baseline (pre-Welle-2) | 371 | 367 |
| Current (before fix) | 393 | 389 |
| Current (after fix) | 389 | 385 |

**Dropped (baseline names missing from current):** `comm -23` → **empty**. No regression.

**Added (current names not in baseline), before fix — 22 names:** `authorizedFetch`, `AuthorizedRequestOptions`, `authorizedUploadXhr`, `buildCursorQuery`, `clearLegacyTokenStorage`, `CursorQueryOpts`, `ensureFreshRuntimeSession`, `getApiBaseUrl`, `getCurrentUserWithBearerToken`, `isAuthRelatedError`, `mapMemberGroupStory`, `normalizeCurrentUserResponse`, `parseApiError`, `ParsedApiErrorPayload`, `parsePayloadApiError`, `RawMemberGroupStory`, `readBrowserCookie`, `refreshRuntimeSession`, `resolveAuthToken`, `toRuntimeAuthData`, `withAuthHeader`, `writeBrowserCookie`.

**Classification (via `grep -rl` crossref evidence across every sibling `lib/api/*` file, minus the owning file):**
- **18 kept exported — genuine D-09 shared-infrastructure, real cross-module consumers:** `authorizedFetch` (used by all 32 domain files), `getApiBaseUrl` (used by all 32), `withAuthHeader` (used by 20), `parseApiError` (used by 14), `authorizedUploadXhr` (used by 7), `AuthorizedRequestOptions`/`buildCursorQuery`/`CursorQueryOpts` (used by `releases.ts`), `clearLegacyTokenStorage`/`getCurrentUserWithBearerToken`/`normalizeCurrentUserResponse`/`parsePayloadApiError`/`readBrowserCookie`/`refreshRuntimeSession`/`resolveAuthToken`/`toRuntimeAuthData` (used by `auth.ts`), `mapMemberGroupStory`/`RawMemberGroupStory` (used by `fansubs-members.ts`, per the cross-import 174-07 documented). All 18 were module-private (non-exported) in the original monolithic `api.ts`, where same-file scope made `export` unnecessary; splitting into files requires exporting anything another module needs — this is the expected, correct cost of modularization, not a surface regression any external caller can observe (nothing outside `lib/api/*` used these names before, since they were private).
- **4 un-exported — zero cross-file consumers anywhere in `frontend/src`, confirmed via a second grep sweep across the full tree (not just `lib/api/*`):** `ParsedApiErrorPayload`, `writeBrowserCookie`, `isAuthRelatedError`, `ensureFreshRuntimeSession`. These were accidentally leaked through the barrel's `export * from "./api/client"` with no actual need — fixed by removing the `export` keyword in `client.ts` (Rule 1 — a barrel-tampering-adjacent bug, caught exactly by this plan's own purpose).

**Verification counts after the fix:** +18 raw / +18 unique vs. baseline, matching the 18 kept-exported names exactly. Zero dropped. Zero unexplained additions remaining.

## Task 2: madge cycle check and full regression gate

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx --yes madge --circular --extensions ts,tsx src/lib"` → **0 circular dependencies** (113 files processed)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx --yes madge --circular --extensions ts,tsx src"` → **exactly 7 circular dependencies**, all pre-existing (`ReleaseVersionMediaSection.helpers.tsx`↔`useReleaseVersionMedia.ts`, `SegmentEditPanel.tsx`↔`SegmentAssetSection.tsx`, `SegmentEditPanel.tsx`↔`SegmentBasicFieldsSection.tsx`, `GroupMemberFormModals.tsx`↔`useGroupMembersTab.ts`, `GroupMembersTab.tsx`→`GroupMemberFormModals.tsx`→`useGroupMembersTab.ts`, `MediaUpload.tsx`↔`MediaUploadCore.tsx`, `memberBadgeFamilies.ts`↔`memberBadgeLabels.ts`) — none involve any `lib/api/*` file
- D-11 directional check: `grep -n "AdminAnimeAniSearchEditConflictResult\|AdminAnimeAniSearchCreateConflictResult" frontend/src/lib/api/client.ts` shows only an `import type { ... } from "@/types/admin"` (lines 1-4); `grep -rnE "^export (interface|type) (AdminAnimeAniSearchEditConflictResult|AdminAnimeAniSearchCreateConflictResult)" frontend/src/lib/api/` returns **zero matches** — confirmed single source of truth stays `@/types/admin.ts`
- `npx tsc --noEmit` → 10 pre-existing errors, all in `ReleaseDetailHero.test.tsx` (6, last touched by unrelated phase-169 commit `7fec2599`) and a generated `.next/dev/types/.../page.ts` `PageProps` mismatch (4) — zero mentions of `client.ts` or any file this plan touched
- `npx eslint .` → 309 problems (4 errors, 305 warnings), all in files unrelated to this plan (`capture-responsive.cjs`, `useReleaseVersionMedia.ts` React-compiler memoization note, `CapabilityDetailRow.tsx` unescaped-entity) — already documented as pre-existing baseline in 174-05-SUMMARY.md/174-06-SUMMARY.md
- `npx vitest run` → **4 failed test files / 6 failed tests, 357 passed files / 3192 passed tests, 1 skipped, 3 todo (362 total files)** — the 4 failing files (`cssCustomProperties.guard.test.ts`, `PublicReleaseSurfacesShowcase.test.tsx`, `EpisodeImportEpisodeGroup.test.tsx`, `mitwirkende/[memberSlug]/page.test.tsx`) are byte-for-byte the same 4 files 174-07-SUMMARY.md already confirmed as pre-existing and unrelated to any `@/lib/api` relocation. Zero new regressions.
- `docker compose build --no-cache team4sv30-frontend` → **succeeded**, full clean rebuild (`npm run build` inside the builder stage, no cache reuse) with zero errors, confirming the production bundle compiles against the current source including this plan's `client.ts` edit

## Task Commits

1. **Task 1: Export-diff proof + fix** — `15c2ce90` (fix: un-export 4 module-private `client.ts` helpers leaked through barrel)
2. **Task 2: madge/full-gate verification** — no commit (verification-only, no code changes required; per the plan's own guidance, an empty `docs(174-08): verify...` commit was skipped — this SUMMARY is the record)

## Files Created/Modified

- `frontend/src/lib/api/client.ts` (1095 lines, net 0 line-count change) — removed `export` from `ParsedApiErrorPayload`, `writeBrowserCookie`, `isAuthRelatedError`, `ensureFreshRuntimeSession` (zero cross-file consumers confirmed via grep before the change)

## Decisions Made

- 18 of 22 "added" barrel names are correctly exported (D-09 shared infra with real cross-module consumers); only the 4 with zero crossrefs anywhere in `frontend/src` were tightened — avoids both under-fixing (leaving an unnecessary public surface) and over-fixing (breaking genuinely needed cross-module imports that D-09 explicitly calls for)
- `client.ts`'s existing D-24 line-count exception (documented in 174-02-SUMMARY.md) stands unchanged; this plan's edit is a pure visibility change with zero net line delta, so no new D-24 documentation was required

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 4 module-private `client.ts` helpers were unnecessarily leaking through the barrel's `export *`**
- **Found during:** Task 1's export-diff proof
- **Issue:** `ParsedApiErrorPayload`, `writeBrowserCookie`, `isAuthRelatedError`, `ensureFreshRuntimeSession` were marked `export` in `client.ts` despite having zero consumers anywhere outside `client.ts` itself (verified via `grep -rn` across the full `frontend/src` tree). Because `api.ts` does `export * from "./api/client"`, this silently expanded the public `@/lib/api` surface beyond the pre-split baseline — exactly the kind of unverified surface drift this plan exists to catch, even though it is additive rather than a dropped/renamed name.
- **Fix:** Removed the `export` keyword from all four declarations in `client.ts`. No other file references them, so this is a pure visibility tightening with zero behavioral change.
- **Files modified:** `frontend/src/lib/api/client.ts`
- **Verification:** `grep -rn` confirmed zero usages outside `client.ts` before the change; `tsc --noEmit`, `eslint`, `vitest run`, and `docker compose build --no-cache` all green after the change, matching the documented pre-existing baseline exactly
- **Committed in:** `15c2ce90`

---

**Total deviations:** 1 auto-fixed (Rule 1 — unintended barrel-surface leak, caught by this plan's own export-parity audit, not a caller-facing regression since nothing outside `lib/api/*` ever had access to these names)
**Impact on plan:** None of the plan's tasks or acceptance criteria changed; this is exactly the kind of finding Task 1 was designed to surface and resolve before Task 2's gate runs.

## Issues Encountered

**Pre-existing baseline issues, confirmed unrelated to this plan (left untouched per the deviation-rules scope boundary, already documented in prior 174-0x SUMMARYs):**

- `tsc --noEmit`: 10 pre-existing errors in `ReleaseDetailHero.test.tsx` (last touched by unrelated phase-169 commit `7fec2599`) and a generated Next.js `PageProps` type-check artifact — zero relationship to `frontend/src/lib/api/*`
- `eslint .`: 4 pre-existing errors in `capture-responsive.cjs`, `useReleaseVersionMedia.ts`, `CapabilityDetailRow.tsx` — already tracked as baseline in 174-05-SUMMARY.md/174-06-SUMMARY.md
- `vitest run`: 4 pre-existing failing test files (6 tests) — byte-for-byte the same 4 files 174-07-SUMMARY.md already confirmed as pre-existing and unrelated to any `@/lib/api` relocation

One operational note: the first `docker compose build team4sv30-frontend` (without `--no-cache`) returned fully cached layers including `RUN npm run build`, despite `client.ts` having uncommitted changes on disk at that point. Re-ran with `--no-cache` to get an authoritative, non-cached production build result (succeeded cleanly) — flagging this as a build-cache-trust note for future plans needing a guaranteed-fresh verification build, not a code defect.

## Known Stubs

None.

## Threat Flags

None — no new network surface, auth path, or schema change. The only change (un-exporting 4 names) *reduces* the public surface area, closing a minor Tampering-adjacent exposure rather than opening one.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Welle 2 (`frontend/src/lib/api.ts` → `frontend/src/lib/api/*` modularization) is now provably complete: zero dropped exports, zero renamed implementations, zero new dependency cycles, full regression gate green, production build succeeds
- Phase 174 can proceed to Welle 3 (Frontend-Hotspots, P1-only) per the user-locked Wellenstruktur
- `createAnimeComment`'s zero-production-consumer status (noted in 174-07-SUMMARY.md) remains an open, out-of-scope dead-code observation for a future cleanup pass — not a blocker

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

Referenced file `frontend/src/lib/api/client.ts` found on disk; referenced commit `15c2ce90` found in git log.
