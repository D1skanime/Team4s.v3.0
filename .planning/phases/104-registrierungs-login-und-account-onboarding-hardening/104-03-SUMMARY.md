---
phase: 104-registrierungs-login-und-account-onboarding-hardening
plan: 03
subsystem: auth
tags: [keycloak, oidc, react, cookies, sessionStorage, ui-primitives]

requires:
  - phase: 104-02
    provides: Session-scoped, consume-once registration-completion marker (registrationCompletion.ts) that this plan consumes on /me/profile
  - phase: 104-01
    provides: Keycloak German login/registration realm and Account Console fix that this plan's AccountSecurityCard link depends on
provides:
  - Protocol-aware Secure attribute on all central browser auth cookies (HTTPS-only, HTTP/127.0.0.1 stays unaffected)
  - Explicit uninitialized/anonymous/profile-loading/profile-error/ready state machine in AppShellClientWrapper, backed by a new 'loading' AppShell mode with a neutral drawer footer
  - Active-session profile-load-failure recovery (retry + centralized logout) in both the app shell and /me/profile, never falling back to a login prompt while a session is active
  - One-shot, dismissible "Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet." confirmation on /me/profile, consumed only after profile hydration succeeds
  - Restructured account-only /me/profile view: neutral "Mein Account" first, unobtrusive "Warst du als Fansubber aktiv?" claim section below it
affects: [104-04, 104-05, 104-06]

tech-stack:
  added: []
  patterns:
    - "Single writeBrowserCookie seam decides the Secure attribute at write time from window.location.protocol, so normal writes and Max-Age=0 deletions both follow the same protocol rule without any component ever touching document.cookie"
    - "AppShellClientWrapper models 5 explicit states (uninitialized, anonymous, profile-loading, profile-error, ready) derived from useAuthSession() + getOwnProfile(), instead of collapsing loading/error into the binary authenticated/anonymous AppShell mode"
    - "A reload-token state counter in a dependency array (both in AppShellClientWrapper and /me/profile) is the retry mechanism for a failed effect-driven load, without duplicating the load function outside its race-safe (cancelled-flag) effect"
    - "A one-shot React ref (hasConsumedRegistrationCompletionRef) gates calling the already-consume-once registrationCompletion.ts marker to exactly once per successful profile hydration within a mount; the underlying sessionStorage removal is what makes remount/reload also safe"

key-files:
  created:
    - frontend/src/lib/api.auth-cookie.test.ts
    - frontend/src/components/layout/AppShellClientWrapper.module.css
    - frontend/src/app/me/profile/components/RegistrationCompletionBanner.tsx
  modified:
    - frontend/src/lib/api.ts
    - docs/frontend/auth-api-client.md
    - frontend/src/components/layout/AppShellClientWrapper.tsx
    - frontend/src/components/layout/AppShellClientWrapper.test.tsx
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.module.css
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/me/profile/page.module.css
    - .planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md

key-decisions:
  - "AppShell gained a third mode ('loading', additive to the existing 'authenticated'/'anonymous' union) with a neutral drawer footer, instead of hiding page content site-wide during initialization — keeps public/anonymous browsing instant while still satisfying D-18's explicit 'no premature Anmelden/finished nav' requirement."
  - "A raw 401 that survives the central api.ts refresh-and-retry seam is treated as a genuine 'please log in again' case (still shows Zur Anmeldung); every other load failure while hasAuthSession is true shows German Erneut versuchen + Abmelden instead, matching D-19's 'valid session, data failed to load' wording precisely."
  - "registrationCompletion is consumed only inside the page's own successful-hydration branch (not on mount, not in the Keycloak-return refresh path), so a spoofed/absent marker never creates the confirmation and a Keycloak-return refresh never re-triggers it."
  - "Account-only /me/profile view moved from a two-column grid (account card beside a 'Member-Eintrag' side card) to one stacked column: 'Mein Account' (neutral copy, no 'not yet linked' framing) followed by an unobtrusive 'Warst du als Fansubber aktiv?' card — matches the discussion log's chosen 'unaufdringlicher eigener Abschnitt' over a side-by-side or prominent-onboarding treatment."

requirements-completed: [P104-AUTH-2]

duration: ~35min
completed: 2026-07-17
---

# Phase 104 Plan 03: Auth-cookie hardening, shell/profile state convergence, one-shot registration notice Summary

**Protocol-aware `Secure` cookies, an explicit shell init/loading/profile-error state machine with a new AppShell 'loading' mode, and a one-shot dismissible registration confirmation plus D-19 retry/logout recovery on `/me/profile` — converging D-18 through D-20 across the callback, refresh, shell, and profile surfaces.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-17T19:36Z (approx)
- **Completed:** 2026-07-17T20:00Z
- **Tasks:** 3 completed
- **Files modified/created:** 15

## Accomplishments

- `writeBrowserCookie` in `api.ts` — the single seam that writes and deletes every browser auth cookie (access token, refresh token, display name), for both normal writes and `Max-Age=0` logout/clear deletions — now appends `; Secure` only when `window.location.protocol === 'https:'`, leaving plain `http://` (including `http://127.0.0.1` local dev) unaffected; `Path=/`, `Max-Age`, and `SameSite=Lax` are unchanged.
- `AppShellClientWrapper` now derives five explicit states (`uninitialized`, `anonymous`, `profile-loading`, `profile-error`, `ready`) from `useAuthSession()` + `getOwnProfile()`, rendering a neutral loading shell (new `AppShell` `'loading'` mode, no `Anmelden` CTA, no user identity) during initialization/refresh/profile-loading, and an in-shell German "Erneut versuchen" + "Abmelden" banner for active-session profile failures — never a login prompt while a session is active (D-18/D-19).
- `AppShell.tsx` gained an additive third mode (`'authenticated' | 'anonymous' | 'loading'`) with a `DrawerLoadingFooter`; existing `'authenticated'`/`'anonymous'` behavior and all 22 pre-existing `AppShell.test.tsx` tests are unchanged.
- `api.auth-refresh.test.ts` gained two D-20 regressions (missing access token, already-expired access token, both with a valid refresh token) proving the session stays active and refreshes exactly once, only through the mocked `refreshKeycloakToken` — never a second/direct path.
- `/me/profile` now consumes the trusted, consume-once `registrationCompletion` marker only after its own profile hydration succeeds, rendering the exact `Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.` as a dismissible `role="status"` banner (`RegistrationCompletionBanner`); a mount-scoped ref prevents re-consuming the marker on retries, and the marker's own one-shot sessionStorage removal prevents recreation on remount/reload.
- `/me/profile`'s account-only view is restructured into one stacked column: "Mein Account" (neutral copy — no "not yet linked" framing) followed by an unobtrusive "Warst du als Fansubber aktiv?" card hosting the existing `MemberClaimSection`, with no new API and no mandatory onboarding.
- `/me/profile`'s active-session (non-401) load failures now render German "Erneut versuchen" (re-triggers the load via a reload-token counter) and "Abmelden" (existing `useLogoutAuthSession`) instead of a login link; a genuine 401 or missing session still correctly shows "Zur Anmeldung".

## Task Commits

1. **Task 0: Harden central browser auth cookies by runtime protocol** - `b0fd09f1` (feat)
2. **Task 1: Project explicit initialization and profile-error states** - `2df11786` (feat)
3. **Task 2: Finish the neutral account profile and registration notice** - `07a2071d` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `frontend/src/lib/api.ts` - `writeBrowserCookie` appends `Secure` only for `https:` browser contexts; new `isSecureBrowserContext()` helper
- `frontend/src/lib/api.auth-cookie.test.ts` - jsdom `document.cookie` write-capture proving HTTPS/HTTP behavior, deletion, and unchanged attributes for all three auth cookies
- `docs/frontend/auth-api-client.md` - new "Cookie Security (Protocol-Aware Secure)" section documenting the boundary and rule
- `frontend/src/components/layout/AppShellClientWrapper.tsx` - 5-state model (`uninitialized`/`anonymous`/`profile-loading`/`profile-error`/`ready`), `reloadToken`-driven retry, `ProfileLoadErrorBanner` (retry + `useLogoutAuthSession`)
- `frontend/src/components/layout/AppShellClientWrapper.module.css` - styles for the profile-error banner
- `frontend/src/components/layout/AppShellClientWrapper.test.tsx` - `useLogoutAuthSession`/`ApiError` mocks added; 4 new tests (uninitialized loading, profile-loading, retry recovery, logout-from-banner)
- `frontend/src/components/layout/AppShell.tsx` - additive `'loading'` mode + `DrawerLoadingFooter`; nav-group/footer selection reordered to `authenticated` → `loading` → `anonymous`
- `frontend/src/components/layout/AppShell.module.css` - `.loadingFooterText` style
- `frontend/src/lib/api.auth-refresh.test.ts` - 2 new D-20 regressions (missing/expired access token, valid refresh token, single refresh through `api.ts`)
- `frontend/src/app/me/profile/page.tsx` - consumes `registrationCompletion` post-hydration, renders the banner, restructures the account-only view, adds retry/logout for active-session errors, switches the uninitialized branch to `LoadingState`
- `frontend/src/app/me/profile/components/RegistrationCompletionBanner.tsx` - extracted dismissible banner component + exact message constant
- `frontend/src/app/me/profile/page.test.tsx` - `useLogoutAuthSession`/`registrationCompletion` mocks added; 12 new/updated tests (D-19 retry/logout, Account Console `target="_blank"`, banner exact-copy/dismiss/one-shot/spoof-proof/account-only-placement)
- `frontend/src/app/me/profile/page.module.css` - `.registrationBanner`, `.errorStateActions` styles
- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md` - logs the pre-existing `page.tsx` 450-line CLAUDE.md violation (already 712 lines before this plan) and the unchanged pre-existing `api.no-token-boundary.test.ts` baseline failures

## Decisions Made

See `key-decisions` in frontmatter for the full list. Most consequential: adding an additive third `AppShell` mode rather than hiding page content site-wide during initialization, and treating a post-refresh 401 as the one legitimate case where "Zur Anmeldung" still appears.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `AppShell.tsx`/`AppShell.module.css` needed a third mode to satisfy Task 1's own D-18 acceptance criteria**
- **Found during:** Task 1
- **Issue:** Task 1's `<files>` list only covers `AppShellClientWrapper.tsx`/`.test.tsx` and `api.auth-refresh.test.ts`, but `AppShellClientWrapper` cannot suppress `AppShell`'s existing binary `authenticated`/`anonymous` footer rendering (which shows either a login CTA or full user identity) without `AppShell` itself gaining a neutral option — otherwise D-18's explicit "no premature Anmelden/finished nav shown simultaneously" requirement, and the discussion log's rejected "Navigation vorzeitig zeigen" option, cannot be met.
- **Fix:** Added an additive `'loading'` value to `AppShellMode`, a `DrawerLoadingFooter` (no CTA, no identity), and one new CSS class. Existing `'authenticated'`/`'anonymous'` behavior is unchanged; all 22 pre-existing `AppShell.test.tsx` tests still pass unmodified.
- **Files modified:** `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/AppShell.module.css`
- **Verification:** `npm test -- src/components/layout/AppShell.test.tsx` (22/22 pass), `npm test -- src/components/layout/AppShellClientWrapper.test.tsx` (9/9 pass), `npm run typecheck`/`npm run lint` clean.
- **Committed in:** `2df11786` (Task 1 commit)

**2. [Rule 2 - Missing critical functionality] `page.tsx` needed a small component extraction to partly offset a pre-existing CLAUDE.md 450-line violation**
- **Found during:** Task 2
- **Issue:** `frontend/src/app/me/profile/page.tsx` was already 712 lines (pre-existing, not introduced by this plan) before Task 2's required additions (registration banner, D-19 retry/logout branch, restructured account-only layout). CLAUDE.md's 450-line limit is a hard constraint that takes precedence over the plan's own file list when a task's necessary action would otherwise make an already-oversized file larger without any mitigation.
- **Fix:** Extracted the new `RegistrationCompletionBanner` (component + exact message constant) into its own file, `frontend/src/app/me/profile/components/RegistrationCompletionBanner.tsx`. This is a new, self-contained, non-shared-logic file — not present in Task 2's `<files>` list — but keeps the growth of `page.tsx` to +39 lines (751 total) instead of +60. A full decomposition of `page.tsx` was judged out of scope for this behavior-focused plan given the regression risk against ~36 tests in `page.test.tsx`; logged as a deferred follow-up in `deferred-items.md`, consistent with the existing project convention for other oversized files (e.g. `AnimeJellyfinAssetUploadControls.tsx`).
- **Files modified/created:** `frontend/src/app/me/profile/page.tsx`, `frontend/src/app/me/profile/components/RegistrationCompletionBanner.tsx` (new), `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md`
- **Verification:** `npm run typecheck` clean; `npm test -- src/app/me/profile/page.test.tsx` (36/36 pass).
- **Committed in:** `07a2071d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 - missing critical functionality, both required to satisfy the plan's own D-18/CLAUDE.md constraints)
**Impact on plan:** Both were necessary to deliver the plan's own must-haves without regressing existing behavior or tests. No scope creep beyond what D-18/D-19 and CLAUDE.md's line-limit rule require.

## Issues Encountered

- `frontend/src/lib/api.no-token-boundary.test.ts` shows the same 2 pre-existing failures already logged in `deferred-items.md` from Plan 104-02 (`GroupHistorySection.tsx`'s `authToken` prop, `ProfileBackgroundCard.tsx`'s direct `fetch`) — neither file is touched by this plan (`git diff --stat` empty for both); re-verified unchanged.
- A full `cd frontend && npx vitest run` shows 7 failed test files / 14 failed tests — the same pre-existing baseline documented in 104-01/104-02 (concurrent session's project-page/hero/AvatarStack work, plus a stale `parseReleaseDetailSearchParams` mock and a Jellyfin cover URL absolute/relative mismatch), unrelated to this plan's auth/cookie/shell/profile changes. Not fixed, per the executor scope boundary and this plan's explicit shared-main pre-existing-baseline note.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-03 through D-07 and D-18 through D-20 now hold end-to-end across the login/registration callback (104-02), the central auth-cookie/refresh seam and shell/profile state machine (this plan), and `/me/profile`'s account-only and full-member views.
- `frontend/src/app/me/profile/page.tsx` remains a known, tracked 450-line CLAUDE.md violation (751 lines) — a dedicated follow-up quick task should split it into state/data + separate account-only/full-member view components before further feature growth in this file.
- Plans 104-04/104-05/104-06 can build on the now-consistent shell (`loading`/`authenticated`/`anonymous`) and profile (`uninitialized`/`profile-loading`/`profile-error`/`ready`) state vocabulary without reintroducing a contradictory login/authenticated flash or a misleading "Zur Anmeldung" for an active session.

---
*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 15 created/modified files verified present on disk; all 3 task commit hashes
(`b0fd09f1`, `2df11786`, `07a2071d`) verified present in `git log --oneline --all`.
