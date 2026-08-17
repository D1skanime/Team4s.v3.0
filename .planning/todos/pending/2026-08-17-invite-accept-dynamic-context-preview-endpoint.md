---
created: 2026-08-17T00:00:00+02:00
title: Dynamischer Kontext-Text auf InviteAcceptFlow (Gruppe/Einlader/Rolle)
area: onboarding-invites
files:
  - frontend/src/components/auth/InviteAcceptFlow.tsx
  - frontend/src/app/invitations/accept/page.tsx
  - frontend/src/app/claim-invitations/accept/page.tsx
  - backend/internal/handlers
  - backend/internal/repository
---

## Problem

`135-CONTEXT.md`'s Content-Spec Addendum (D-11, locked 2026-08-17, "AUTORITATIV") specifies
that both invite-accept pages should render a dynamic context line naming the group, inviter,
and role (e.g. "{Einlader} hat dich als {Rolle} in die Fansub-Gruppe "{Gruppe}" eingeladen.").

Phase 135's `InviteAcceptFlow` (135-05) intentionally ships with generic, static copy instead.
The dynamic variant requires an invite-preview-by-token backend endpoint (resolving group name,
inviter display name, and role label from an unauthenticated invite token) that no Phase-135
plan provides, and building it was explicitly ruled out of Phase 135 scope to avoid delaying
the phase's BLOCKER fix (Finding #10 cold-invite dead end, already resolved by 135-05 as shipped).

All other Content-Spec Addendum items shipped in Phase 135: dual Anmelden/Registrieren CTA,
friendly non-Keycloak-jargon copy, friendly error states (135-05), rich context in the invite
mail itself (135-03), and the Keycloak register-page email lock (135-08). Only the accept-page
dynamic context line and the "wrong email logged in" state (which also needs the same preview
data) remain deferred.

## Desired Outcome

Add a small, unauthenticated invite-preview-by-token backend endpoint (group name, inviter
display name, invited role label -- no PII beyond what the invite mail itself already discloses)
and wire `InviteAcceptFlow` to consume it, rendering the D-11 dynamic title/context line and the
D-11 "wrong email logged in" state on both `/invitations/accept` and `/claim-invitations/accept`.
Keep the existing generic copy as a fallback if the preview lookup fails (matching the
fail-open pattern already used for the invite mail in 135-03).
