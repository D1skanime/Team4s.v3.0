---
phase: 158-public-anime-detail-reparatur
plan: "02"
subsystem: auth
tags: [anime, auth, watchlist, comments, regression, react]
requires:
  - phase: 49
    provides: Central token-free auth/API client and refresh single-flight
provides:
  - Stable account identity, conservative unknown-metadata generation and synchronous owner guard
  - Client-owned fail-closed watchlist status with visible action errors
  - Session-aware comments and explicit contribution loading, empty, error and retry states
affects: [158-03, 158-04, 159]
tech-stack:
  added: []
  patterns: [keyed owner lifecycle, token-free synchronous session guard, request generation checks]
key-files:
  created:
    - frontend/src/lib/useAuthSession.test.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.test.tsx
    - frontend/src/components/comments/CommentForm.test.tsx
    - frontend/src/components/anime/AnimeContributionsSection.test.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/useAuthSession.ts
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/components/watchlist/WatchlistAddButton.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.module.css
    - frontend/src/components/comments/CommentForm.tsx
    - frontend/src/components/anime/AnimeContributionsSection.tsx
    - frontend/src/components/anime/AnimeContributionsSection.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
    - frontend/src/components/profile/CorrectionReportModal.test.tsx
key-decisions:
  - "Only getWatchlistEntry GET 404 represents known absence; unknown status never mutates."
  - "Use app_user_id only for account identity; missing or unreadable metadata stays null."
  - "Keep owner lifecycles keyed by anime, identity, generation and session presence; guard same-turn callbacks centrally."
requirements-completed: [P158-03, P158-04]
duration: approximately 18min
completed: 2026-09-13
---

# Phase 158 Plan 02: Session-aware Anime Actions Summary

**Watchlist and comments now follow the active access-or-refresh session, reject stale owner results, and expose honest loading/error states without another auth or API path.**

## Execution Boundary

- Canonical repository: `/home/d1sk/team4s`, accessed through `ssh team4s-linux`; all tests/tooling ran in the existing Docker frontend.
- Phase/audit baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
- Plan starting commit: `4395a543ea8a022ed9e5dc01f3ccaf5f11d89100`.
- Implementation end commit: `94c926bf249557562ef7b1868991eb9e37b28337` at 2026-09-13T20:55:13Z.
- First recorded RED run: 2026-09-13T20:42:03Z; completion documentation: 2026-09-13T20:56Z. Initial context-reading time was not separately recorded; approximately 18 minutes total.
- Tasks: 3/3; 14 product/test files plus this summary. Four new test files and 67 new tests.
- No push. The orchestrator owns STATE/ROADMAP/REQUIREMENTS updates.

## Changes and Ownership

### Task 1: Central session identity

`getAuthSessionSnapshot()` adds `accountIdentity: number | null` from the existing validated `getRuntimeSessionMeta().app_user_id`. It exposes no tokens, expiration data, private session ID or inferred display-name identity.

`useAuthSession()` retains access/refresh presence, display name and initialization. Its `accountGeneration` increments only for `AUTH_SESSION_CHANGED_EVENT` while identity is unknown. Focus, storage and visibility resynchronize values without incrementing that generation. Known-account token rotation preserves identity/generation.

The final hook also exposes `isCurrentSession()`, a token-free owner check against hook metadata updated synchronously by the existing events. This handles an old response settling in the same turn as an account change, before React has committed the next render. It performs no token reads, API request or refresh and remains stable across ordinary focus/rotation of the same known account.

The central refresh implementation, single-flight promise, bearer attachment, session event semantics and API endpoint helpers remain unchanged.

### Task 2: Watchlist client status owner

`WatchlistAddButton` calls the existing `getWatchlistEntry` and distinguishes unknown/loading/present/absent/error. Only its documented GET404 becomes absent. GET401, GET500 and network rejection remain unknown, block both mutation types, and show retry. An existing entry selects Delete; a known missing entry selects Add. Mutation failures preserve the known status and are visible even with custom button classes.

Anime, account identity, unknown-account generation and active-session presence key the action lifecycle. Request generations and the synchronous central owner guard protect responses, errors and finally blocks. Old results cannot change a new owner, reenable a new pending action, or trigger a write under an obsolete button state. Same-account focus/rotation does not recheck status.

The optional `initiallyInWatchlist` prop remains accepted for staged integration but is deliberately not authoritative. **158-03 must remove the page's SSR watchlist fetch/prop.** This plan does not edit `page.tsx`.

Existing main-button styling is retained; retry reuses the global Button primitive. Status/error copy is independently rendered with status/alert semantics. Message color inherits the surrounding surface, and success text uses “hinzugefügt”.

### Task 3: Comments and contributions

Comment display/submit gates use Access OR Refresh via the central hook and respond to login/logout/display-name changes after mount. The existing `createAnimeComment` helper still owns transport and refresh. Owner-keyed form state prevents draft leakage between accounts/anime; generation and synchronous owner checks protect success callbacks, router refresh, errors and finally. Current-account rotation preserves a pending submission and its draft. Existing content validation/rate-limit handling remains.

Contributions now always has a heading and shows loading, a successful empty result, or a request error with global Button retry. Old-anime responses are cancelled/ignored, loaded groups disappear immediately when the anime changes, and expansion state belongs to the anime. Existing contribution/group rendering remains unchanged. Heading and status use the existing `--color-white` token on the dark anime surface; no token registry or layout redesign was introduced.

## Task Commits and TDD Evidence

| Task | Commit | Evidence |
|---|---|---|
| 1 RED | `8ca85aa4` — test(158-02): cover reactive account identity and anime action refresh | Hook: 8 failed / 37 existing tests passed; API extension separately failed its two missing-identity assertions. |
| 1 GREEN | `5491a018` — feat(158-02): expose stable token-free session identity and generation | Four auth test files, 47/47 passed. |
| 2 RED | `a257da37` — test(158-02): cover fail-closed watchlist status and stale sessions | 30/30 new watchlist regressions failed on the original component. |
| 2 GREEN | `1e69b3aa` — fix(158-02): load watchlist status fail-closed for the active owner | 30/30 watchlist tests passed. |
| Typed fixture correction | `56eb4521` — test(158-02): align typed auth fixtures with session identity | Full typecheck exposed five new TS2345 errors; corrected fixtures, their 90 tests and typecheck passed. |
| 3 RED | `338cf952` — test(158-02): cover comment session boundaries and contribution errors | 25 failed / 1 passed before the component changes. |
| 3 additional RED | `ca39af68` — test(158-02): expose same-turn account switch callback race | Same-turn account-change test failed with the old parent callback invoked; 18 other comment tests passed. |
| 3 GREEN | `94c926bf` — fix(158-02): bind comment results to live sessions and expose contribution states | Central synchronous guard closes the additional race; final combined suite 194/194 passed. |

Every regression was executed before the corresponding product fix. The same-turn test is a behavior test, not a source assertion. CSS token assertions are explicitly limited to wiring; actual computed-color/browser evidence belongs to 158-04.

## Checks Executed

All commands ran from the canonical repository.

Final combined regression:

```sh
docker compose exec -T team4sv30-frontend npm test -- \
  src/lib/api.auth-refresh.test.ts \
  src/lib/api.session-switch.test.ts \
  src/lib/api.no-token-boundary.test.ts \
  src/lib/useAuthSession.test.tsx \
  src/components/watchlist/WatchlistAddButton.test.tsx \
  src/components/comments/CommentForm.test.tsx \
  src/components/anime/AnimeContributionsSection.test.tsx \
  src/components/profile/CorrectionReportModal.test.tsx \
  'src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx'
```

**Exit 0: 9 files, 194 tests passed.** No skipped case or live database fixture was counted.

| Suite | Tests | Covered behavior |
|---|---:|---|
| api.auth-refresh | 27 | Existing refresh/single-flight plus concurrent real central Watchlist GET + Comment POST helpers with absent or expired access and valid refresh; one refresh, current bearer, updated account snapshot. |
| api.session-switch | 3 | Existing storage/custom/focus/visibility resynchronization and account-switch signaling. |
| api.no-token-boundary | 9 | Token/cookie/storage/bearer/refresh ownership stays central. |
| useAuthSession | 8 | Access only, refresh only, both, neither; token-free fields; account switch/login/logout after mount; same-account rotation/focus/storage/visibility stability; missing and blocked metadata with unchanged booleans and conservative generation. |
| WatchlistAddButton | 30 | Unknown/SSR-hint rejection; refresh-only existing-entry delete; GET401/500/network and retry; visible custom Add/Delete errors; login/logout; stable focus/rotation; stale status/mutation success and failure after anime/account/logout/null-meta/blocked-meta changes; old finally during a new pending mutation. |
| CommentForm | 19 | Refresh-only submission; reactive login/logout/display name; 401/500/network/429 feedback; stale success/failure after anime/account/logout/null-meta/blocked-meta changes; stable current-account draft/rotation; same-turn account-switch callback suppression; unmount. |
| AnimeContributionsSection | 8 | Loading versus successful empty; 401/500/network errors and retry to real group data; stale old-anime success/failure; loaded-group reset; existing light-token wiring. |
| Existing typed auth consumers | 90 | SegmenteTab 87, CorrectionReportModal 3 after their additive fixture update. |

Additional checks:

- `docker compose exec -T team4sv30-frontend npm run typecheck` — **exit 0**, after the final synchronous guard and fixture changes.
- `docker compose exec -T team4sv30-frontend npx eslint` over all 12 touched TS/TSX files — **exit 0**, 0 errors, 1 existing warning: native textarea in CommentForm. The unchanged warning is recorded at lines 697–698 of `docs/audits/2026-09-13-public-anime-detail/implementation-preflight/baseline-lint.log`; it is not a new phase error.
- `git diff 4395a543..HEAD --check`, scoped diff inspection and post-commit deletion checks — clean; no tracked deletions.
- Existing `api.session-switch.test.ts` emits a React act warning from its preexisting event setup; its three assertions pass. That file was not changed.

Temporary execution logs are under Linux `/tmp/p158-02-*.log`; they are diagnostic artifacts, not tracked product files. The summary records all required results independently.

## Deviations from Plan

1. **[Rule 3 — Blocking issue] Additive typed test fixtures.** The full typecheck exposed five new TS2345 errors in two existing fixtures that directly mock the complete `AuthSessionState`. These were changed narrowly to supply unknown identity, generation 0, and the synchronous owner guard. The two files are outside the original frontmatter list but are directly related contract consumers; the orchestrator was informed. No production consumer was widened and the session type was not weakened. Commits `56eb4521` and `94c926bf`; their 90 tests and full typecheck pass.
2. **[Rule 1 — Bug] Same-turn owner change before React commit.** An owner-keyed component alone prevented normal stale responses but still delivered an old comment callback when a new account event and old promise resolution occurred in one turn. The RED test `ca39af68` reproduced it. The existing hook now updates a token-free owner reference synchronously and exposes `isCurrentSession()`; both action consumers use it. Fixed in `94c926bf`, with final 194/194 tests passing.
3. **Tooling compatibility:** GSD context was loaded through `./scripts/gsd-linux.sh init execute-phase 158` and `state load`, using the installed legacy argument format. Tracking mutation remains delegated to the orchestrator as the plan explicitly specifies.

No architectural/API/domain ownership decision, authentication gate, dependency installation, schema change or remaining task blocker.

## Risks, Boundaries and Open Human-UAT

- **Integration pending:** 158-03 removes the redundant SSR watchlist owner. Until then, the compatible prop is ignored and a page may still issue its old SSR read.
- Full frontend/backend phase suites, full lint, isolated production build, live browser flow, viewport/zoom/computed-color checks and request measurements belong to 158-04. This summary claims the targeted gates only.
- Phase baseline's two CSS guard failures and full-lint 13 errors / 331 warnings are not treated as permission for new regressions; this plan introduces none in its targeted gates.
- Unknown metadata intentionally invalidates on every auth-change event; it cannot claim stable account identity without metadata. Known accounts avoid the focus/rotation loop.
- No live login, comment/watchlist write, database write, seed, migration, backend restart, Docker runtime reconfiguration or external API mutation was used. All mutation verification used mocked transport/helpers.
- No endpoint/request/response/auth requirement changed. Existing Watchlist GET404 and protected error behavior were checked against the backend handler and shared OpenAPI; no contract drift was introduced.
- `frontend/scripts/shot2.mjs` remained untouched/untracked. No global STATE/ROADMAP/REQUIREMENTS files were modified.
- **Human-UAT 156 GAP-02 (14 origin/contributor checks) and 157-06 Task 4 remain OPEN.** Automated results here grant neither sign-off.
- Stub scan found no new unimplemented product state. Empty arrays/null state represent explicit loading/empty/error and unknown metadata; the preexisting empty compatibility authToken remains intentionally token-free.
- Threat review: T-158-03/04/05 remain within the planned auth/async boundaries and are covered above. No additional endpoint, file-access trust boundary, media ownership or schema surface was introduced.

## Self-Check: PASSED

All 14 changed product/test files and all eight listed implementation/test commits exist. No tracked files were deleted. The summary is in the assigned phase directory; all three tasks were complete before its metadata commit.
