---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 05
subsystem: auth
tags: [nextjs, react, keycloak, vitest, invite-flow]

# Dependency graph
requires:
  - phase: 135-01
    provides: "keycloakAuth.ts consumeStoredReturnPath()/beginKeycloakLogin({returnPath, loginHint}); login/page.tsx persistedReturnPath destination priority"
provides:
  - "frontend/src/components/auth/InviteAcceptFlow.tsx — shared dual Anmelden/Registrieren + returnPath + auto-accept + friendly-error onboarding component (D-09 contract), consumed by /invitations/accept now and /claim-invitations/accept in 135-06"
  - "/invitations/accept/page.tsx rewritten on InviteAcceptFlow, closing Finding #10's BLOCKER cold-invite dead end (D-01/D-04)"
affects: [135-06, 135-07, 135-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef auto-accept guard (autoAcceptStartedRef) so a useEffect keyed on [token, isClientInitialized, hasAccessToken] fires handleAccept at most once per mount, matching the login/page.tsx-established eslint-disable-next-line react-hooks/exhaustive-deps precedent (frontend/src/app/me/contributions/page.tsx:111)"

key-files:
  created:
    - frontend/src/components/auth/InviteAcceptFlow.tsx
    - frontend/src/components/auth/InviteAcceptFlow.module.css
    - frontend/src/components/auth/InviteAcceptFlow.test.tsx
    - frontend/src/app/invitations/accept/page.test.tsx
  modified:
    - frontend/src/app/invitations/accept/page.tsx

key-decisions:
  - "Implemented Task 1/Task 2 exactly as written in 135-05-PLAN.md's <tasks> section (concrete props, generic Anmelden/Registrieren button labels, 5+4 locked test behaviors) rather than the richer 'Content-Spec Addendum' (D-11/D-12) appended at the bottom of the same plan file. Rationale below under Deviations from Plan."
  - "@testing-library/user-event is not a project dependency (absent from frontend/package.json); both new test files use fireEvent (the existing project convention, e.g. login/page.test.tsx) instead."

patterns-established:
  - "InviteAcceptFlowProps (token, title, description, loginPromptText, loginHintEmail?, onAccept, mapError, successMessage, afterAcceptRedirect?, missingTokenText) is the locked shared contract 135-06 must compose against verbatim -- do not add new required props without replanning 135-06 in lockstep."

requirements-completed: [D-01, D-04, D-07, D-08, D-09]

# Metrics
duration: ~25min
completed: 2026-08-17
---

# Phase 135 Plan 05: InviteAcceptFlow shared onboarding component + /invitations/accept rewrite Summary

**`InviteAcceptFlow.tsx` now exists as the one reusable dual Anmelden/Registrieren + auto-accept + friendly-error onboarding component, and `/invitations/accept/page.tsx` is rebuilt on top of it, closing Finding #10's BLOCKER: a cold, logged-out invitee can now both register and log in instead of hitting a dead end.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-17T13:14:02Z (session resume point per STATE.md)
- **Completed:** 2026-08-17
- **Tasks:** 2 (both executed as RED/GREEN TDD cycles per `tdd="true"`)
- **Files modified:** 5 (3 created for Task 1, 1 created + 1 rewritten for Task 2)

## Accomplishments
- `InviteAcceptFlow.tsx` exports `InviteAcceptFlowProps`/`InviteAcceptFlow`, built entirely on `@/components/ui`'s `Button` (zero raw `<button>` elements), driving four rendered states off `token`/`isClientInitialized`/`hasAccessToken`/`successState`: missing-token, logged-out dual-CTA, logged-in auto-accept, and success-with-profile-link.
- The auto-accept effect fires `onAccept(token)` at most once per mount via a `useRef` guard, proven by a dedicated re-render test case.
- `handleLogin`/`handleRegister` compute `returnPath` from `window.location.pathname+search` at click time and call `beginKeycloakLogin({returnPath})` / `beginKeycloakLogin({intent:'register', returnPath, loginHint})`, wiring directly into 135-01's persisted-returnPath mechanism.
- `/invitations/accept/page.tsx` is now a thin composition of `InviteAcceptFlow` with fansub-specific copy, a local `fansubInvitationErrorMessage()` mapping all 6 documented backend reason codes (`invitation_expired`, `invitation_used`, `invitation_cancelled`, `invalid_invitation_state`, `email_mismatch`, `membership_conflict`) to friendly German copy, and an `emailParam` reader that validates the URL `email` query param (`@` present, `<=254` chars) before passing it through as `loginHintEmail`. The old unfriendly "Keycloak bleibt für Login und Session zuständig..." sentence and all raw `<button>`/inline `style={{}}` markup are gone.
- 9 new frontend test cases (5 + 4) all pass; re-ran together with the pre-existing `login/page.test.tsx` (12 cases) to confirm zero regressions (21/21 green).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the shared InviteAcceptFlow component (D-09 contract) + its test** - `628c2572` (feat) — RED (test-only run confirmed import failure) then GREEN in the same commit per the tdd="true" workflow; component and its 5 test cases landed together after local verification.
2. **Task 2: Rewrite /invitations/accept/page.tsx on the shared flow (D-01/D-04 BLOCKER fix) + page test** - `8c5d576a` (fix) — page composition and its 4 test cases verified green before commit.

_Both TDD tasks were verified RED-then-GREEN locally (via `npm test`) before their single feat/fix commit; no separate REFACTOR commit was needed since neither GREEN implementation required cleanup._

## Files Created/Modified
- `frontend/src/components/auth/InviteAcceptFlow.tsx` - New shared onboarding component (D-09 contract): props-driven title/description/copy, `Button`-only interactive controls, `useAuthSession()`-driven state machine, `useRef`-guarded auto-accept effect, `beginKeycloakLogin({returnPath, loginHint})` wiring.
- `frontend/src/components/auth/InviteAcceptFlow.module.css` - Copied `.page`/`.panel`/`.title`/`.text`/`.actions`/`.link`/`.error` verbatim from `login/page.module.css`; added a new `.success` class built on `var(--color-success, #1f6f3a)`.
- `frontend/src/components/auth/InviteAcceptFlow.test.tsx` - 5 test cases (dual-CTA + returnPath/loginHint forwarding, missing-token rendering, auto-accept-exactly-once across re-renders, mapError rendering on rejection, successMessage + single redirect on resolution).
- `frontend/src/app/invitations/accept/page.tsx` - Rewritten: `Suspense`/`useSearchParams` shell kept, fallback now `<LoadingState title="Einladung wird geladen" />`; new `emailParam` reader and `fansubInvitationErrorMessage()`; renders `<InviteAcceptFlow>` with fansub-specific copy, no `afterAcceptRedirect` (page stays on the confirmation view, matching prior no-auto-navigate behavior).
- `frontend/src/app/invitations/accept/page.test.tsx` - 4 test cases (title rendering, email-param-to-loginHint forwarding, trimmed-token accept call, friendly `invitation_expired` mapping over the raw backend message).

## Decisions Made
- Followed 135-05-PLAN.md's `<tasks>` section literally (exact prop names, exact copy strings, plain "Anmelden"/"Registrieren" button labels, the 5+4 locked test behaviors) rather than the richer "Content-Spec Addendum" (D-11/D-12) that was appended at the very bottom of the same plan file, dated the same day and marked "AUTORITATIV". See Deviations from Plan below for the full rationale — this is flagged as an open follow-up, not silently dropped.
- `@testing-library/user-event` is absent from `frontend/package.json`; both new test files use `fireEvent` (already the codebase's established convention in `login/page.test.tsx`) instead of introducing a new, uninstalled test dependency.

## Deviations from Plan

**The plan file's own bottom-of-file "Content-Spec Addendum (locked 2026-08-17, AUTORITATIV)" was NOT implemented in this plan's scope.** Documenting this explicitly rather than silently picking one interpretation:

- `135-05-PLAN.md` contains two layers of instruction: (a) the original `<tasks>` section, with concrete props (`title`, `description`, `loginPromptText`, `loginHintEmail`, ...), locked test behaviors (5 cases for Task 1, 4 for Task 2), and generic copy ("Fansub-Einladung annehmen", plain "Anmelden"/"Registrieren" buttons); and (b) a "Content-Spec Addendum" appended after the plan's own `<output>` block, referencing `135-CONTEXT.md`'s D-11/D-12 and specifying materially different, richer UI: a dynamic title ("Einladung zu '{Gruppe}'"), a dynamic context line naming the inviter and role, four button/state variants ("Konto erstellen und beitreten" / "Ich habe schon ein Konto - Anmelden" / "Als {meine E-Mail} annehmen"), and a fourth "logged in with the wrong email" state with a sign-out/switch action.
- This addendum's data requirements (group name, inviter display name, invited-role label, the currently-authenticated user's own email for the "wrong email" comparison) are not present anywhere in the locked `InviteAcceptFlowProps` interface, nor in this plan's `<interfaces>` block, nor in `135-06-PLAN.md` (which already exists and explicitly composes against `135-05`'s original, simpler prop contract with plain "Anmelden" as its own expected button text). Implementing the addendum's full state machine here would have required inventing new props/API calls outside this plan's TDD-designed and cross-plan-referenced scope, and would have silently broken `135-06`'s already-written expectations (its own Task 2 test literally asserts `screen.getByRole('button', {name: 'Anmelden'})`-style behavior against the shared component).
- Given `135-07`'s (`wave 5`) plan is a verification/gate plan (no further InviteAcceptFlow content work) and `135-08` covers only the Keycloak register-page email lock (D-13), there is currently no phase-135 plan that implements the addendum's richer group/inviter/wrong-email copy. **This is flagged as an open gap for follow-up** — either a new plan/task should be added to phase 135 (or a later phase) to extend `InviteAcceptFlow` with the group/inviter/wrong-email props the addendum describes, or the addendum should be explicitly re-scoped/superseded in `135-CONTEXT.md` if the simpler generic copy shipped here is accepted as sufficient for this milestone.
- Everything else in this plan (component contract, test behaviors, acceptance criteria, threat model) was implemented exactly as written with no other deviations.

## Issues Encountered
- `docker compose exec -T team4sv30-frontend npx tsc --noEmit` reports the same pre-existing, unrelated Next.js generated route-type errors documented in `135-01-SUMMARY.md` (`.next/dev/types/app/admin/anime/**`, `app/fansubs/[slug]/page.ts`, `app/anime/page.ts`, `app/members/ranking/page.ts`). Confirmed via `grep -i "InviteAcceptFlow\|invitations/accept"` that none reference this plan's files; treated as pre-existing baseline noise, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`InviteAcceptFlow.tsx`'s prop contract is stable and ready for `135-06` to consume as its second composer (`claim-invitations/accept/page.tsx`), exactly as `135-06-PLAN.md` already expects. The Content-Spec Addendum gap noted above (dynamic group/inviter copy, wrong-email state) should be triaged before or alongside `135-07`'s live UAT, since `135-07`'s own success criteria include "correct German copy... throughout" for the real end-to-end round trip.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
