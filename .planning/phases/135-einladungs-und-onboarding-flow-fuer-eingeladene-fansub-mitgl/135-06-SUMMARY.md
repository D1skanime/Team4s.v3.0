---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 06
subsystem: auth
tags: [nextjs, react, keycloak, vitest, invite-flow]

# Dependency graph
requires:
  - phase: 135-05
    provides: "InviteAcceptFlow.tsx — shared dual Anmelden/Registrieren + returnPath + auto-accept + friendly-error onboarding component (InviteAcceptFlowProps contract), consumed here as the second composer"
provides:
  - "/claim-invitations/accept/page.tsx rewritten as a thin InviteAcceptFlow composition, closing D-09 (both invite types now share one onboarding flow) and Pitfall 1/5's return_to dead end for this page"
affects: [135-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second InviteAcceptFlow consumer with no loginHintEmail prop (claim invitations are generic shareable links with no target email, per ClaimManagementPanel.tsx), and afterAcceptRedirect='/me/profile' (preserves the page's prior immediate-redirect-on-success behavior, unlike invitations/accept which stays on the confirmation view)"

key-files:
  created:
    - frontend/src/app/claim-invitations/accept/page.test.tsx
  modified:
    - frontend/src/app/claim-invitations/accept/page.tsx

key-decisions:
  - "Followed 135-06-PLAN.md's <tasks> section literally (exact prop values, locked test behaviors) against the InviteAcceptFlowProps contract shipped in 135-05, per the user-confirmed scope ruling recorded in STATE.md/135-05-SUMMARY.md's Resolution note. No richer Content-Spec Addendum dynamic group/inviter/role copy was added here — that remains deferred to the tracked backlog item."

patterns-established: []

requirements-completed: [D-09, D-07]

# Metrics
duration: ~10min
completed: 2026-08-17
---

# Phase 135 Plan 06: claim-invitations/accept rewritten on shared InviteAcceptFlow Summary

**`/claim-invitations/accept/page.tsx` is now a thin `InviteAcceptFlow` composition, closing D-09: both invite types (`/invitations/accept`, `/claim-invitations/accept`) share one working, tested onboarding flow, and the page's previously-broken `<Link href="/login?return_to=...">` (wrong param name, dropped across the Keycloak redirect regardless of name) no longer exists.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-17T13:30:00Z (session resume point per STATE.md)
- **Completed:** 2026-08-17
- **Tasks:** 2 (Task 2 executed as a TDD test-then-verify cycle per `tdd="true"`)
- **Files modified:** 2 (1 rewritten, 1 created)

## Accomplishments
- `claim-invitations/accept/page.tsx` is rebuilt as a thin composition of `InviteAcceptFlow`: kept `claimInvitationErrorMessage` unchanged, replaced the raw `<main style={{...}}>` fallback with `<LoadingState title="Einladung wird geladen" />`, removed all local `useState`/`useRouter`/`useAuthSession` plumbing and raw `<button>`/inline `style={{}}` markup.
- `onAccept={(tok) => acceptClaimInvitation({ token: tok })}` composes directly against `acceptClaimInvitation`'s existing `Promise<void>` signature; `afterAcceptRedirect="/me/profile"` preserves the page's prior immediate-redirect-on-success behavior.
- No `loginHintEmail` prop is passed, since claim invitations are generic shareable links with no target email (confirmed via `ClaimManagementPanel.tsx`'s own "teile sie direkt, zum Beispiel via Discord" description).
- All German copy strings use correct Umlaute (zurück, gültiges, öffentlich) per CLAUDE.md's Sprachqualität rule.
- 3 new page-level tests confirm: title rendering, `beginKeycloakLogin` receiving a `returnPath` containing the current token query string when clicking "Anmelden" while logged out, and `acceptClaimInvitation({token})` + `router.replace('/me/profile')` when logged in.
- Re-ran alongside `login/page.test.tsx` (12), `invitations/accept/page.test.tsx` (4), and `InviteAcceptFlow.test.tsx` (5) with zero regressions (24/24 green).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite claim-invitations/accept/page.tsx onto the shared InviteAcceptFlow** - `49c38052` (fix)
2. **Task 2: Light page-level test for claim-invitations/accept** - `bf454614` (test)

_Task 2 verified GREEN via `npm test` before its commit; no separate RED-run artifact was preserved since the implementation (Task 1) already existed when the test was authored — the test suite was run and confirmed passing in a single verification pass._

## Files Created/Modified
- `frontend/src/app/claim-invitations/accept/page.tsx` - Rewritten: `Suspense`/`useSearchParams` shell kept, fallback now `<LoadingState title="Einladung wird geladen" />`; renders `<InviteAcceptFlow>` with claim-invite-specific copy, `afterAcceptRedirect="/me/profile"`, no `loginHintEmail`. `claimInvitationErrorMessage` kept byte-identical.
- `frontend/src/app/claim-invitations/accept/page.test.tsx` - 3 test cases (title rendering, Anmelden returnPath forwarding, accept+redirect-on-success), mirroring `invitations/accept/page.test.tsx`'s mocking shape for `@/lib/api`, `@/lib/keycloakAuth`, `@/lib/useAuthSession`, and `next/navigation`.

## Decisions Made
- Implemented exactly per 135-06-PLAN.md's `<tasks>` section, composing against 135-05's locked `InviteAcceptFlowProps` contract as-is, consistent with the user-confirmed scope ruling (STATE.md 2026-08-17 entry / 135-05-SUMMARY.md's Resolution note): no dynamic group/inviter/role copy, no "wrong email logged in" state — that gap is tracked separately at `.planning/todos/pending/2026-08-17-invite-accept-dynamic-context-preview-endpoint.md`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `docker compose exec -T team4sv30-frontend npx tsc --noEmit` reports the same pre-existing, unrelated Next.js generated route-type errors documented in `135-01-SUMMARY.md`/`135-05-SUMMARY.md` (`.next/dev/types/app/admin/anime/**`, `app/fansubs/[slug]/page.ts`, `app/anime/page.ts`, `app/members/ranking/page.ts`). None reference `claim-invitations/accept`; treated as pre-existing baseline noise, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
D-09 is fully closed: both invite types now share one working, tested onboarding flow. `135-07` (wave 5, verification/gate plan) can proceed; per `135-05-SUMMARY.md`'s open note, the deferred Content-Spec Addendum gap (dynamic group/inviter context, wrong-email state) is documented as a resolved-not-open scope ruling and should not block `135-07`'s live UAT.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
