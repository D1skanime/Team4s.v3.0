---
date: 2026-07-03
status: complete
---

# Quick Plan: Fix E2E UI Blockers

## Scope

Fix the three retest blockers that make the next UI-first E2E run unreliable:

1. `YearPicker` opens near the current year when no value is selected, even if the allowed max year is future-facing.
2. `/login` "Erneut anmelden" clears the active app/Keycloak session and forces an identity prompt before starting a new login.
3. Current app members without a linked historical member show a useful app-user label instead of `Mitglied #id`.

Out of scope:
- EP08 title mismatch remains a data-quality/model decision.
- Gruppennotiz link-mark rejection remains a separate editor/backend content-contract quick.

## Read First

- `frontend/src/components/ui/YearPicker.tsx`
- `frontend/src/components/groups/GroupHistoryForm.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/lib/keycloakAuth.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx`
- `backend/internal/repository/fansub_group_app_members_repository.go`
- `backend/internal/models/app_auth.go`

## Acceptance

- YearPicker empty values no longer open at `2088-2099` for `maxYear=2099`.
- Relogin calls central logout before Keycloak login and uses `prompt=login`.
- App-member list can render app-user display/email when no historical member identity exists.
- Relevant focused frontend/backend tests pass.
