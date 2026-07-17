---
phase: 104-registrierungs-login-und-account-onboarding-hardening
plan: 02
subsystem: auth
tags: [keycloak, oidc, pkce, react, sessionStorage, ui-primitives]

requires:
  - phase: 104-01
    provides: German-branded, Team4s-themed Keycloak login/registration realm with registrationAllowed=true
provides:
  - Intent-aware beginKeycloakLogin (login vs register) reusing the single PKCE state/verifier/challenge transaction
  - Registration starts on Keycloak's native /protocol/openid-connect/registrations endpoint instead of a second flow
  - Session-scoped, consume-once registration-completion marker (registrationCompletion.ts) creatable only from a validated registration callback
  - Visible German Anmelden/Registrieren CTAs on /login built on the @/components/ui Button primitive
affects: [104-03, 104-04, 104-05, 104-06]

tech-stack:
  added: []
  patterns:
    - "Keycloak self-registration reached via the same OAuth2/PKCE query params as login, just on /protocol/openid-connect/registrations instead of /protocol/openid-connect/auth"
    - "Peek-vs-consume pair (hasPendingRegistrationCompletion / consumeRegistrationCompletion) lets one browser tab both redirect on the marker (login page) and later render it exactly once (future /me/profile page) without a shared in-memory store"

key-files:
  created:
    - frontend/src/lib/registrationCompletion.ts
    - frontend/src/lib/registrationCompletion.test.ts
  modified:
    - frontend/src/lib/keycloakAuth.ts
    - frontend/src/lib/keycloakAuth.test.ts
    - frontend/src/app/login/page.tsx
    - frontend/src/app/login/page.test.tsx
    - frontend/src/app/login/page.module.css
    - .planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md

key-decisions:
  - "Registration reuses the exact same PKCE state/verifier/challenge transaction as login (one seam, `intent: 'login' | 'register'`), only swapping the Keycloak endpoint path from /protocol/openid-connect/auth to /protocol/openid-connect/registrations — both endpoints accept identical OAuth2/PKCE query parameters and land on the same redirect_uri/callback."
  - "The completion marker's storage key ('team4s.registration.completed') deliberately avoids the substrings auth/access_token/refresh_token/pkce so it never trips the Phase-49 no-token-boundary scan, even though registrationCompletion.ts isn't in that test's central-client/Keycloak allowlists."
  - "markRegistrationCompleted() is only ever called from inside exchangeKeycloakCode's success path, after state has already been validated against the stored PKCE transaction — no exported setter exists that a page/component or an arbitrary query value could call directly."
  - "clearRegistrationCompletion() runs at the start of every beginKeycloakLogin call and on every exchangeKeycloakCode failure path (state mismatch, non-OK response, malformed token payload), so a stale marker from an abandoned/cancelled attempt can never leak into a later, unrelated flow."
  - "Login-page redirect decision uses a non-destructive peek (hasPendingRegistrationCompletion), not the consuming read — the marker must survive into the /me/profile page (Plan 104-03) to render the one-shot confirmation there."

requirements-completed: [P104-REG-1, P104-AUTH-1]

duration: ~35min
completed: 2026-07-17
---

# Phase 104 Plan 02: Registration entry point and trusted completion handoff Summary

**Extended `beginKeycloakLogin` with a login/register intent that starts registration on Keycloak's native `/protocol/openid-connect/registrations` endpoint through the same PKCE transaction, added a session-scoped one-shot `registrationCompletion` marker creatable only from a validated registration callback, and replaced the native login button with distinct German `Anmelden`/`Registrieren` CTAs on the `@/components/ui` Button primitive.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-17T17:00Z (approx)
- **Completed:** 2026-07-17T17:35Z
- **Tasks:** 2 completed
- **Files modified/created:** 8

## Accomplishments

- `beginKeycloakLogin({ intent })` now drives both login and registration through one PKCE seam: same verifier/state/challenge generation, same `saveTransientAuthState`/`consumeTransientAuthState` round trip, only the target Keycloak endpoint path differs (`/protocol/openid-connect/auth` vs `/protocol/openid-connect/registrations`), so a successful registration auto-signs-in exactly like login without a second manual step (D-01).
- `exchangeKeycloakCode` creates the new `registrationCompletion` marker exclusively after state has matched its own stored PKCE transaction and the token exchange itself succeeded, and only for `intent === 'register'` — an arbitrary or spoofed `state`/query value can never create it (D-03/D-04's "not solely a manipulable query parameter" requirement).
- The marker is cleared defensively at the start of every new `beginKeycloakLogin` call and on every `exchangeKeycloakCode` failure branch (state mismatch, non-OK token response, malformed token payload), so a cancelled or failed attempt never leaves a stale marker for a later unrelated flow to pick up.
- `/login` now renders visible German `Anmelden` (or `Erneut anmelden` when already signed in) and `Registrieren` CTAs, both through the existing `@/components/ui` Button primitive; the page-local `.button` CSS class was removed since the primitive owns all button styling (D-23).
- After callback exchange, the login page peeks the marker (non-destructively, via `hasPendingRegistrationCompletion`) to decide the redirect target: a completed registration always lands on `/me/profile` regardless of an arbitrary/foreign `next` query value, while ordinary login keeps the existing safe-`next` behavior (including rejecting external `next` targets).
- 25 new/updated focused tests cover both endpoint selection, marker creation only on a validated registration callback, spoofed-state rejection with marker clearing, code/state replay rejection, exchange-failure marker clearing, Button-based CTA rendering/visibility, and the next-path safety matrix (local, external, and registration-overrides-next cases).

## Task Commits

1. **Task 1: Extend the single PKCE transaction with registration intent** - `87e5b157` (feat)
2. **Task 2: Add visible global-Button login and registration actions** - `285fb735` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `frontend/src/lib/registrationCompletion.ts` - session-scoped, consume-once registration-completion marker: `markRegistrationCompleted` (set, called only from `keycloakAuth.ts`), `hasPendingRegistrationCompletion` (non-destructive peek), `consumeRegistrationCompletion` (destructive read+remove, for the future `/me/profile` confirmation), `clearRegistrationCompletion` (defensive removal)
- `frontend/src/lib/registrationCompletion.test.ts` - covers default-absent, peek-does-not-consume, consume-exactly-once, clear-after-mark, no-op clear, and session- vs local-storage key isolation
- `frontend/src/lib/keycloakAuth.ts` - `beginKeycloakLogin` accepts `intent: 'login' | 'register'`, selects the Keycloak endpoint path accordingly, and stores intent alongside verifier/state; `exchangeKeycloakCode` returns the same `KeycloakTokenBundle` as before but now creates/clears the completion marker based on validated intent and outcome
- `frontend/src/lib/keycloakAuth.test.ts` - added a `createMemoryStorage`/`stubBrowserGlobals` test helper pair (also used to simplify the pre-existing identity-prompt test) plus 7 new tests for register/login URL selection, marker creation on validated registration success, no-marker on ordinary login, spoofed-state rejection with marker clearing, replay rejection, and exchange-failure marker clearing
- `frontend/src/app/login/page.tsx` - added `handleRegister` (starts `beginKeycloakLogin({ intent: 'register' })`), replaced the native `<button>` with two `@/components/ui` `Button`s (`Anmelden`/`Erneut anmelden` and `Registrieren`, the latter hidden while already signed in), and the callback-completion redirect now checks `hasPendingRegistrationCompletion()` to override `nextPath` with `/me/profile` for a just-completed registration
- `frontend/src/app/login/page.test.tsx` - relabeled the login-button assertions to `Anmelden`/`Registrieren`, added tests for the register-intent CTA, CTA visibility while signed in, external-`next` rejection, and registration-overrides-`next` redirect behavior
- `frontend/src/app/login/page.module.css` - removed the now-unused `.button`/`.button:disabled` rules (button styling is fully owned by the global primitive)
- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md` - logged two pre-existing, out-of-scope `api.no-token-boundary.test.ts` failures found during verification (see Issues Encountered)

## Decisions Made

See `key-decisions` in frontmatter above for the full list. Most consequential: reusing Keycloak's `/protocol/openid-connect/registrations` endpoint with identical OAuth2/PKCE query parameters means there is exactly one authorization-code/callback seam for both intents (per Task 1's acceptance criteria), rather than a second registration-specific flow.

## Deviations from Plan

None - plan executed exactly as written. The `frontend/src/app/login/page.module.css` edit (removing the now-dead `.button` rules) was not separately listed in the plan's `files_modified`, but falls directly out of Task 2's explicit instruction not to add/keep native page-local button styling once the global Button primitive owns that role; it required no new logic or scope, only deleting now-unused CSS in the same file already covered by the task.

## Issues Encountered

- `cd frontend && npm test -- src/lib/api.no-token-boundary.test.ts` (part of this plan's overall `<verification>` block) shows 2 pre-existing failures unrelated to this plan's changes: `src/components/groups/GroupHistorySection.tsx` still threads an `authToken?: string` prop, and `src/app/me/profile/components/ProfileBackgroundCard.tsx:67` calls `fetch(...)` directly outside the central client. Neither file is in this plan's scope or touched by this session (`git diff --stat` is empty for both); both were last modified by Phase 101 commits. Logged in `deferred-items.md` and left unfixed per the executor scope boundary. All of this plan's own focused tests (`keycloakAuth.test.ts`, `registrationCompletion.test.ts`, `login/page.test.tsx`) pass, and `npm run typecheck` is clean.

## User Setup Required

None - no external service configuration required. Phase 104-01 already enabled `registrationAllowed: true` and the German Team4s login theme in the realm this plan targets.

## Next Phase Readiness

- Plan 104-03 (Task 2, "Finish the neutral account profile and registration notice") can now import `consumeRegistrationCompletion` from `frontend/src/lib/registrationCompletion.ts` to render the exact one-shot `Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.` confirmation on `/me/profile`, dismissible/one-time as required by D-03/D-04.
- The `/login` page is now a complete, discoverable entry point for both flows (D-01 through D-04, D-23 hold end-to-end at the auth-boundary level); Plan 104-03's cookie/session hardening (Task 0/1) and profile completion (Task 2) are independent of this plan's PKCE/CTA changes.

---
*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 3 commit hashes
(`87e5b157`, `285fb735`, `1a4d57a7`) verified present in `git log --oneline --all`.
