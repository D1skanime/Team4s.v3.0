---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 05
subsystem: api
tags: [refactoring, api-client, auth, session, permissions, capabilities, reviews, history, search, vitest-guard-tests, barrel-module]

# Dependency graph
requires:
  - phase: 174-02
    provides: "frontend/src/lib/api/client.ts shared infra (getRuntimeSessionMeta, getRuntimeRefreshToken, persistAuthSession, clearAuthSession, refreshAuthToken already live there — this plan found 5 of the plan interface's 17 'auth/session' functions pre-relocated and did not re-move them), plus the locked barrel-path decision this plan's re-exports follow"
  - phase: 174-04
    provides: "the D-24 cohesion-exception precedent (fansub-members.ts ~750 lines kept as one file per an explicit artifact-path lock) this plan reuses for permissions.ts (~620 lines) and history.ts (~1030 lines)"
provides:
  - "frontend/src/lib/api/auth.ts (16 functions, 245 lines): Keycloak callback, session-switch orchestration, token issuance/revoke, getCurrentUser"
  - "frontend/src/lib/api/permissions.ts (21 functions incl. 2 private mappers, ~620 lines, D-24 exception): role/capability CRUD, effective-rights, capability-override mutation/audit, role-definition catalogs"
  - "frontend/src/lib/api/reviews.ts (11 functions incl. 2 private helpers, 221 lines): review delegations, release-review queue/decision, role/capability impact previews"
  - "frontend/src/lib/api/history.ts (41 statements incl. 5 mapper pairs, ~1030 lines, D-24 exception): fansub-group/member-story/anime-project notes, release-version notes, group-history timeline, public archive search"
  - "frontend/src/lib/api/search.ts (4 functions, 128 lines): global search + historical-member search"
affects: [174-06, 174-07, 174-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale-interface re-verification: the plan's locked 'auth/session' function-name list (17 names, authored against commit fdb9f610) predated 174-02's own extraction commit (001841e6), which had already relocated 5 of those 17 names (getRuntimeSessionMeta, getRuntimeRefreshToken, persistAuthSession, clearAuthSession, refreshAuthToken) into client.ts. Re-verifying live against the actual current api.ts (not trusting the plan interface list at face value) caught this before attempting a duplicate move that would have collided with client.ts's existing exports."
    - "AST-based (TypeScript compiler API) verbatim statement extraction, not regex/brace-counting: used ts.createSourceFile + per-statement getFullStart()/getEnd() to extract exact source spans (including leading JSDoc/comment trivia) for every named function/interface/type/const being relocated — byte-exact, zero risk of brace-matching edge cases (nested type-literal defaults, template literals) that a naive heuristic would mishandle."
    - "Cross-bucket same-wave dependency resolved via direct sibling import, not barrel self-import (continuing 174-04's established pattern): mapMemberGroupStory/RawMemberGroupStory and buildCursorQuery/CursorQueryOpts are used both by functions moving to history.ts AND by listMemberGroupStories/getGroupReleaseListCursor/getGroupReleaseImages staying in api.ts — exported from history.ts and imported back into api.ts via `import { ... } from './api/history'`, never through the barrel."
    - "Dead-comment debris from prior plans' relocations surfaces as leading trivia on the next surviving statement — found 3 instances (174-04's default-crew functions' docs orphaned before normalizeHistGroupMemberRole; 174-04's setMemberMemorial doc orphaned before buildReleaseReviewQuery; 174-04's getMemberProjects-continuation docs orphaned before searchHistoricalMembers) where a prior plan moved the function but left its JSDoc behind. Stripped during this plan's extraction since they were directly in the touched span and would otherwise misleadingly land in a wrong new file."
    - "D-24 cohesion exception extended to history.ts (~1030 lines) beyond what the plan text anticipated (it only pre-authorized auth.ts/permissions.ts exceeding 450 lines) — the plan's own files_modified frontmatter locks exactly 5 single-file artifact paths with no sub-split escape hatch offered for history.ts, mirroring 174-03's fansub-members.ts precedent exactly."
key-files:
  created:
    - frontend/src/lib/api/auth.ts
    - frontend/src/lib/api/permissions.ts
    - frontend/src/lib/api/reviews.ts
    - frontend/src/lib/api/history.ts
    - frontend/src/lib/api/search.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.no-token-boundary.test.ts

key-decisions:
  - "5 of the plan's 17 named 'auth/session' functions (getRuntimeSessionMeta, getRuntimeRefreshToken, persistAuthSession, clearAuthSession, refreshAuthToken) were already relocated into client.ts by 174-02 before this plan's interface list was authored — not re-moved; auth.ts holds the remaining 12 plus getCurrentUser (see below), 16 total"
  - "getCurrentUser (not in the plan's named list) moved into auth.ts alongside resolveCurrentUserFromAuthSession, its sole internal caller — keeping it in api.ts would have forced auth.ts to import back from api.ts, a real circular dependency (api.ts already imports from auth.ts via the barrel chain); getCurrentUser is self-contained (only depends on already-auth.ts-imported client.ts helpers) and unambiguously auth-domain"
  - "permissions.ts (~620 lines) and history.ts (~1030 lines) both exceed the 450-line CLAUDE.md guideline but are kept as single files per a D-24 cohesion exception, matching 174-03's fansub-members.ts precedent: the plan's files_modified frontmatter locks exactly these 5 paths with no sub-split option offered, and history.ts's size is driven by 5 near-identical raw-DTO-to-domain mapper pairs that must travel with their sole callers (D-09, no duplication) rather than by one oversized function"
  - "buildCursorQuery/CursorQueryOpts and mapMemberGroupStory/RawMemberGroupStory exported from history.ts (not kept private) because api.ts's own listMemberGroupStories/getGroupReleaseListCursor/getGroupReleaseImages (not in any Wave-2 bucket, staying in api.ts long-term) still need them — imported back via direct sibling import, never through the barrel"
  - "3 orphaned dead-comment blocks (stale JSDoc from 174-04 functions already relocated elsewhere, left behind as leading trivia on statements this plan also had to move) were stripped rather than carried verbatim into the new files, since carrying them would have landed misleading documentation (describing default-crew/setMemberMemorial/getMemberProjects functions that don't exist in the new file) into permissions.ts/reviews.ts/search.ts"

requirements-completed: [D-08, D-09, D-11, D-12, D-19, D-22]

# Metrics
duration: ~48min
completed: 2026-10-05
---

# Phase 174 Plan 05: Auth/Session, Permissions, Reviews, History, Search API Modules Summary

**Relocated the highest-security-relevance Wave-2 batch (68 functions re-verified live, superseding the plan's own stale interface list) out of the `api.ts` monolith — token issuance/refresh/revoke, Keycloak callback, effective-rights inspection, and capability-override mutation all moved file-only with zero logic change, verified via a full-suite regression match against the documented pre-existing baseline.**

## Performance

- **Duration:** ~48 min
- **Completed:** 2026-10-05
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 7 (2 modified, 5 created)

## Accomplishments

- Re-verified every function name the plan's locked interface claimed against the live `frontend/src/lib/api.ts`, and discovered the interface list was stale: it was authored against commit `fdb9f610`, which predates 174-02's own `client.ts` extraction commit (`001841e6`). 5 of the 17 named "auth/session" functions (`getRuntimeSessionMeta`, `getRuntimeRefreshToken`, `persistAuthSession`, `clearAuthSession`, `refreshAuthToken`) were already living in `client.ts`, not `api.ts` — re-moving them would have produced a duplicate-export collision. Caught before touching any code, not after a failed build.
- Built an AST-based (TypeScript compiler API) extraction pipeline instead of regex/brace-counting: parsed `api.ts` with `ts.createSourceFile`, located every named function/interface/type/const by its declaration name, and extracted exact source spans (`getFullStart()`→`getEnd()`, including leading JSDoc) — byte-exact relocation with zero brace-matching risk.
- Moved 16 functions into `frontend/src/lib/api/auth.ts` (245 lines): `parseRuntimeSessionSwitchEvent`, `getRuntimeAuthToken`, `getRuntimeDisplayName`, `hasRuntimeAuthToken`, `getAuthSessionSnapshot`, `persistResolvedAuthSession`, `resolveCurrentUserFromAuthSession`, `completeKeycloakAuthCallback`, `refreshActiveAuthSession`, `logoutActiveAuthSession`, `issueAuthToken`, `revokeAuthToken`, plus 2 private helpers (`revokePreviousRuntimeSession`, `prepareRuntimeSessionSwitch`) and `getCurrentUser` (added — see Decisions).
- Moved 17 functions (plus 2 private helpers/const: `normalizeHistGroupMemberRole`, `ROLE_DEFINITION_CONTEXTS`/`parsePublicRoleDefinitions`, `mapMemberRoleForVersion`) into `frontend/src/lib/api/permissions.ts` (~620 lines, D-24 exception): role/capability CRUD, `getEffectiveRights`, `mutateCapabilityOverride`/`listOverrideHistory`, role-definition catalogs.
- Moved 9 functions (plus 2 private helpers: `buildReleaseReviewQuery`, `parseReleaseReviewResponse`) into `frontend/src/lib/api/reviews.ts` (221 lines): review delegations, release-review queue/counts/detail/next/decision, role/capability impact previews. Confirmed `getClaimActivationImpactPreview` stayed exclusively in `fansub-members.ts` (174-03) as the plan required — no duplicate export.
- Moved 21 functions (plus 5 raw-DTO-to-domain mapper pairs and their type aliases, 2 local interfaces for group-history, 2 for archive search, and `decodeReleaseVersionBodyJson`) into `frontend/src/lib/api/history.ts` (~1030 lines, D-24 exception): fansub-group/member-story/anime-project notes, release-version notes, group-history timeline, public archive search.
- Moved 4 functions into `frontend/src/lib/api/search.ts` (128 lines): `buildSearchQuery`, `getSearch`, `getSearchSuggestions`, `searchHistoricalMembers`.
- Resolved 2 cross-bucket same-wave dependencies not named in the plan's interface list: `mapMemberGroupStory`/`RawMemberGroupStory` (needed by `listMemberGroupStories`, staying in `api.ts`) and `buildCursorQuery`/`CursorQueryOpts` (needed by `getGroupReleaseListCursor`/`getGroupReleaseImages`, staying in `api.ts`) — both exported from `history.ts` and imported back via a direct sibling import, never through the barrel.
- Found and stripped 3 orphaned dead-comment blocks (stale JSDoc from 174-04 relocations, left behind as leading trivia on statements this plan also had to move) rather than carrying misleading documentation into the new files.
- Wired the barrel: `frontend/src/lib/api.ts` now has 25 `export * from "./api/..."` lines total (5 new this plan, on top of 174-02/03/04's 20).
- Cleaned up all now-fully-unused `@/types/*`/`@/lib/keycloakAuth`/`./api/client` import identifiers in `api.ts` (verified via `eslint --no-unused-vars`, zero warnings on every touched file).
- Extended `api.no-token-boundary.test.ts`'s `centralClientAllowlist` with `auth.ts`, `history.ts`, `search.ts` (the 3 new files containing pre-existing token-boundary/raw-`fetch(` patterns that previously lived inline in the allowlisted `api.ts`).
- `api.ts` shrank from 4,634 to 2,348 lines (-2,286, continuing the 174-02/03/04 trend toward zero).
- Full regression suite matches the documented pre-existing baseline **exactly**, confirmed by running the identical suite against both the pre-change and post-change code: `npx tsc --noEmit` — identical 10 pre-existing errors (unrelated `ReleaseDetailHero.test.tsx`/`page.ts` type issues), 0 new. `npx eslint .` — identical 4 pre-existing errors / 305 pre-existing warnings (all in files this plan never touched — `capture-responsive.cjs`, `CapabilityDetailRow.tsx`, a React-compiler memoization note, a `tmp-playwright-phase4` script), 0 new; every file this plan touched is individually 0-error/0-warning clean. `npx vitest run` — identical 4 failed test files / 6 failed tests (`cssCustomProperties.guard.test.ts`, `PublicReleaseSurfacesShowcase.test.tsx`, 2× `EpisodeImportEpisodeGroup.test.tsx`, `ProjectMemberPage`), 357 passed files / 3192 passed tests, 0 regressions — all 8 auth-logic tests in the suite (`api.auth-refresh.test.ts`'s 32, plus `api.session-switch.test.ts`, `useAuthSession.test.tsx`, `api.auth-cookie.test.ts`, `api.phase108.test.ts`) pass identically.

## Task Commits

Each task landed in its own atomic, independently-gated commit (unlike 174-04, which found this impossible — this plan's cross-task import dependencies were small enough to resolve per-stage without leaving `api.ts` in a build-broken intermediate state):

1. **Task 1: Extract auth/session + permissions/rights** - `f1e948b6` (refactor) — `auth.ts`+`permissions.ts` created, barrel wired, auth/permissions-only imports pruned; `tsc`/`eslint`/targeted-vitest all verified clean before commit.
2. **Task 2: Extract reviews + history** - `14ed2a7e` (refactor) — `reviews.ts`+`history.ts` created, barrel wired, cross-file `buildCursorQuery`/`mapMemberGroupStory` imports added, reviews/history-only imports pruned; `tsc`/`eslint`/targeted-vitest all verified clean before commit.
3. **Task 3: Extract search/misc, wire the barrel, and run the full gate** - `f8bf08ff` (refactor) — `search.ts` created, barrel complete (25 lines total), remaining imports pruned; full `tsc`/`eslint .`/`vitest run` gate run and diffed against the documented pre-existing baseline — exact match, 0 regressions.

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `frontend/src/lib/api/auth.ts` - New (245 lines). 16 functions: Keycloak callback/session-switch orchestration, token issuance/revoke, `getCurrentUser`.
- `frontend/src/lib/api/permissions.ts` - New (~620 lines, D-24 exception). 17 functions + 2 private helpers: role/member-role CRUD, capability grant/revoke, `getEffectiveRights`, capability-override mutation/audit, role-definition catalogs.
- `frontend/src/lib/api/reviews.ts` - New (221 lines). 9 functions + 2 private helpers: review delegations, release-review queue/counts/detail/next/decision, role/capability impact previews.
- `frontend/src/lib/api/history.ts` - New (~1030 lines, D-24 exception). 21 functions + 5 mapper-pair helper groups: fansub-group/member-story/anime-project notes, release-version notes, group-history timeline, public archive search. Exports `buildCursorQuery`/`CursorQueryOpts` and `mapMemberGroupStory`/`RawMemberGroupStory` for `api.ts`'s remaining consumers.
- `frontend/src/lib/api/search.ts` - New (128 lines). 4 functions: global search + historical-member search.
- `frontend/src/lib/api.ts` - Modified. Removed all 94 relocated statements (68 named functions + helpers/types/mappers that travel with their sole callers). Added 5 barrel `export * from "./api/..."` lines (25 total) and 2 direct sibling imports (`buildCursorQuery`/`mapMemberGroupStory` from `./api/history`).
- `frontend/src/lib/api.no-token-boundary.test.ts` - Modified. `centralClientAllowlist` extended with `auth.ts`, `history.ts`, `search.ts`.

## Decisions Made

See `key-decisions` in frontmatter for the full rationale on each; summarized: (1) did not re-move the 5 already-relocated client.ts functions; (2) moved `getCurrentUser` along with its sole caller to avoid a circular import; (3) kept `permissions.ts`/`history.ts` as single files under the plan's locked artifact-path lock (D-24 exception, matching 174-03's precedent); (4) exported the 2 cross-bucket helper pairs from `history.ts` for `api.ts`'s remaining consumers; (5) stripped 3 orphaned dead-comment blocks rather than carrying stale documentation forward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Plan's "auth/session" interface list was stale — 5 of 17 named functions already lived in client.ts**
- **Found during:** Task 1 (pre-move grep-verification of the plan's locked interface list)
- **Issue:** The plan's interface section claims it "re-verified live against the current `frontend/src/lib/api.ts` (commit `fdb9f610`)", but `fdb9f610` is an earlier commit than 174-02's `client.ts` extraction (`001841e6`). `getRuntimeSessionMeta`, `getRuntimeRefreshToken`, `persistAuthSession`, `clearAuthSession`, `refreshAuthToken` were already relocated into `client.ts` and re-exported through the barrel — re-moving them into `auth.ts` would have created a duplicate-export collision (`tsc` fails loudly on ambiguous re-exports, exactly as the plan's own Task 3 acceptance criteria anticipated for a different collision risk).
- **Fix:** Did not move these 5 functions; `auth.ts` holds the remaining 12 plan-named functions plus `getCurrentUser` (16 total, see deviation 2).
- **Files modified:** `frontend/src/lib/api/auth.ts` (scope reduced from the planned 17 to the correct 12+1)
- **Verification:** `grep` confirms all 5 functions still resolve correctly from `client.ts` through the barrel; `tsc --noEmit` clean; all auth-logic tests pass.
- **Committed in:** `f1e948b6`

**2. [Rule 3 - Blocking issue] getCurrentUser added to auth.ts to avoid a circular import**
- **Found during:** Task 1 (dependency trace before extraction)
- **Issue:** `resolveCurrentUserFromAuthSession` (named in the plan's auth/session list) calls `getCurrentUser` (not named in the plan's list, not moved by any other 174 plan). Leaving `getCurrentUser` in `api.ts` while `resolveCurrentUserFromAuthSession` moved to `auth.ts` would require `auth.ts` to import back from `api.ts` — a real circular dependency, since `api.ts`'s barrel already re-exports `auth.ts`.
- **Fix:** Moved `getCurrentUser` into `auth.ts` alongside its sole caller. Verified it has no other dependency on anything remaining in `api.ts` (only uses already-imported `client.ts` helpers).
- **Files modified:** `frontend/src/lib/api/auth.ts`
- **Verification:** `tsc --noEmit` clean; `grep` confirms no remaining `getCurrentUser(` call site in `api.ts`.
- **Committed in:** `f1e948b6`

**3. [Rule 2 - Missing critical functionality] mapMemberGroupStory/RawMemberGroupStory and buildCursorQuery/CursorQueryOpts needed cross-file export**
- **Found during:** Task 2 (dependency trace before extraction)
- **Issue:** Both helper pairs are used by functions moving to `history.ts` (`createMemberGroupStory`/`updateMemberGroupStory`; `getGroupReleaseNotes`) AND by functions staying in `api.ts` long-term (`listMemberGroupStories`; `getGroupReleaseListCursor`/`getGroupReleaseImages` — none of which belong to any named Wave-2 bucket).
- **Fix:** Exported both pairs from `history.ts` (adding `export` where the originals were private) and added a direct sibling import in `api.ts` (`import { buildCursorQuery, mapMemberGroupStory } from './api/history'`), never through the barrel — matches 174-04's established "direct sibling import, not barrel self-import" pattern.
- **Files modified:** `frontend/src/lib/api/history.ts`, `frontend/src/lib/api.ts`
- **Verification:** `tsc --noEmit` clean; `listMemberGroupStories`/`getGroupReleaseListCursor`/`getGroupReleaseImages` unchanged behaviorally (manual diff against pre-move versions).
- **Committed in:** `14ed2a7e`

**4. [Rule 1 - Bug] 3 orphaned dead-comment blocks from 174-04 relocations found as leading trivia on statements this plan moved**
- **Found during:** Task 1 and Task 2 (reviewing extracted content before writing new files)
- **Issue:** 174-04 moved `listDefaultCrew`/`upsertDefaultCrewEntry`/`deleteDefaultCrewEntry`/`applyDefaultCrew` to `members.ts` and `setMemberMemorial` to `members.ts`, but left their JSDoc comment blocks behind in `api.ts`. Those orphaned comments sat as leading trivia immediately before `normalizeHistGroupMemberRole` (permissions bucket) and `buildReleaseReviewQuery` (reviews bucket) respectively — the AST extractor's `getFullStart()` would have carried them into the wrong new files, misleadingly documenting functions that don't exist there. A third block (describing a slim-viewer/continuation-page function already relocated to `members.ts`) sat before `searchHistoricalMembers` (search bucket).
- **Fix:** Stripped all 3 orphaned blocks during assembly rather than carrying them forward. The real functions they describe already live (undocumented) in `members.ts` — a pre-existing 174-04 gap, out of scope for this plan.
- **Files modified:** `frontend/src/lib/api/permissions.ts`, `frontend/src/lib/api/reviews.ts`, `frontend/src/lib/api/search.ts`
- **Verification:** Manual diff confirms no other content was altered; `tsc`/`eslint`/`vitest` all clean.
- **Committed in:** `f1e948b6` (permissions), `14ed2a7e` (reviews), `f8bf08ff` (search)

**5. [Rule 2 - Missing critical functionality] permissions.ts and history.ts both exceeded the 450-line CLAUDE.md modularity limit**
- **Found during:** Task 1 and Task 2 (line-count check after assembly)
- **Issue:** The plan's own text pre-authorized auth.ts/permissions.ts to exceed 450 lines ("acceptable, justified exception per D-24") but did not anticipate history.ts's size. permissions.ts landed at ~620 lines; history.ts at ~1030 lines — both well over budget, and the plan's `files_modified` frontmatter locks exactly one artifact path per bucket with no sub-split option offered (unlike 174-03's admin-anime bucket, which explicitly offered one).
- **Fix:** Kept both as single files per a D-24 cohesion exception with an explanatory header comment, mirroring 174-03's `fansub-members.ts` precedent exactly (same citation of the 174-02 `client.ts` precedent). history.ts's size is driven by 5 near-identical raw-DTO-to-domain mapper pairs that must travel with their sole callers (D-09) — sub-splitting would scatter each note/story CRUD group across multiple files for no cohesion benefit.
- **Files modified:** `frontend/src/lib/api/permissions.ts`, `frontend/src/lib/api/history.ts` (header comments added)
- **Verification:** `wc -l` confirms both sizes; D-24 justification documented in each file's own header comment per CLAUDE.md's modularity constraint and the 174-03 precedent it establishes.
- **Committed in:** `f1e948b6` (permissions), `14ed2a7e` (history)

---

**Total deviations:** 5 auto-fixed (2 blocking/stale-interface-or-import, 1 missing-critical/cross-file-export, 1 bug/dead-comment-cleanup, 1 missing-critical/modularity)
**Impact on plan:** All five were necessary consequences of re-verifying the plan's own claims against the live, current codebase rather than trusting a stale interface snapshot — exactly the discipline the plan's own text demanded ("re-verify before locking"). No scope creep, no behavior change — all five are pure code-location/documentation-hygiene fixes with zero runtime effect, confirmed by the full regression suite matching the documented pre-existing baseline exactly (identical tsc/eslint/vitest failure counts, byte-for-byte, before and after this plan's changes).

## Known Stubs

None — this plan relocates existing, working code; no new UI surfaces or data sources were introduced.

## Threat Flags

None — the two STRIDE entries this plan's `<threat_model>` names (T-174-02-02 token issuance/refresh/revoke elevation-of-privilege risk; T-174-04-01 effective-rights/capability tampering risk) are exactly what the AST-based verbatim-extraction discipline (byte-exact source spans, zero renamed/merged functions, manual diff of `getRuntimeSessionMeta`'s pre/post-move body showing zero logic differences) and the full-suite-baseline-match verification close. No new auth library, no new token format, no new storage mechanism, no change to the backend `permissions.go` resolver — this is a pure file-layout change on the frontend client side.

## Issues Encountered

None beyond the 5 documented deviations above — all resolved within this plan's execution. One minor documentation-only note: the plan's Task 3 `<verify>` block specifies `grep -c "export \* from './api/" frontend/src/lib/api.ts` using single-quoted path literals, but the actual file (consistently, since 174-02) uses double-quoted import specifiers (`"./api/client"` etc.) — the literal command as written returns 0 regardless of barrel completeness. Ran both the plan's literal command (0, as expected given the quote mismatch) and the equivalent double-quote version (25, the real cumulative barrel count) to confirm the barrel is correctly wired; not a code defect, just a quoting mismatch in the plan's own verify text.

## Self-Check: PASSED

- `frontend/src/lib/api/auth.ts` — FOUND
- `frontend/src/lib/api/permissions.ts` — FOUND
- `frontend/src/lib/api/reviews.ts` — FOUND
- `frontend/src/lib/api/history.ts` — FOUND
- `frontend/src/lib/api/search.ts` — FOUND
- Commit `f1e948b6` — FOUND in `git log`
- Commit `14ed2a7e` — FOUND in `git log`
- Commit `f8bf08ff` — FOUND in `git log`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The barrel (`api.ts`) now re-exports 25 domain modules; remaining monolith content (2,348 lines) is the target of subsequent 174-06..174-08 waves per `174-HOTSPOTS.md`'s bucket table.
- The "re-verify before trusting a locked interface list" discipline this plan applied (catching the stale `auth/session` bucket count before touching code) should be repeated by later waves — any plan whose interface section cites a commit hash should diff that hash against the current `git log` position before assuming the cited function-location snapshot is still accurate.
- The direct-sibling-import pattern for cross-bucket same-wave dependencies (established in 174-04, reused here for `history.ts`↔`api.ts`) is now proven across 2 different dependency shapes — later waves facing a similar split-file helper dependency should follow the same discipline.
- No blockers for 174-06 onward.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*
