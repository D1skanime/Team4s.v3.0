---
created: 2026-05-28T11:52:00.0000000+02:00
title: Profile hub content activity redesign
area: ui
files:
  - frontend/src/app/me/profile/page.tsx
  - frontend/src/app/me/profile/components/MemberProfileHero.tsx
  - frontend/src/app/me/profile/components/ProfileBasicsForm.tsx
  - frontend/src/app/me/profile/components/ProfileStoryCard.tsx
  - frontend/src/app/me/profile/components/VisibilityCard.tsx
  - frontend/src/app/me/profile/components/MembershipsSection.tsx
  - frontend/src/app/me/profile/components/ContributionsSection.tsx
  - frontend/src/app/me/profile/components/AccountSecurityCard.tsx
  - .planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-HUMAN-UAT.md
---

## Problem

Phase 53 UAT 3 found that `/me/profile` still reads too much like an admin/contract explanation instead of a member-facing profile hub. The page contains technical helper text that should not be visible to normal users, unclear badges, confusing labels, and a weak activity model.

Specific issues to address:

- Remove member-facing technical/internal copy: visibility fallback explanation, TipTap/plain-text defer explanation, Keycloak read-only description, Basisdaten description, Mitgliedschaften description, and other contract-oriented text.
- Remove or redesign the always-visible/unclear hero badges such as `Mitglied`, fansub-name badge, and `Ungespeicherte Änderungen`.
- Clarify or remove confusing concepts: `Fansub-Name` vs `Anzeigename`, `Plattformrollen`, `Fansub Lead`, duplicated `Aktiv` badges, and unclear membership status badges.
- Membership cards currently do not show the group image/logo, show duplicated status, and use unclear navigation text (`Gruppenbereich`). The action should clearly lead to the group if a route contract exists.
- Replace the abstract `Meine Beiträge`/historical credit aggregate with a member-useful activity surface, preferably latest three media uploads plus latest texts/notes the user wrote for media/releases. This likely needs a new backend contract.
- Drawer direction should not duplicate `Meine Gruppen`; a later drawer/detail surface should focus on `Meine Medien` or `Meine Aktivität` with filters.
- Consider whether membership belongs on the main page as a compact identity summary, while detailed media/activity belongs in a separate view/drawer.
- Keep the account/display name out of the editable Team4s profile form. The editable fansub identity field should be labelled `Fansub-Nick` and continue to map to API `fansub_name` / database `members.nickname`.

## Solution

Plan a follow-up phase for profile hub content and activity redesign. Keep membership on the main page only as a compact identity summary: group logo, group name, readable role, optional timeframe, and a clear `Zur Gruppe` link. Build a new activity contract for latest member media uploads and latest authored texts/notes, then render it as `Letzte Aktivitäten` on the main profile page. Remove admin/internal copy and replace unclear badges with plain labels or omit them.
