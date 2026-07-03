---
date: 2026-07-03
status: complete
---

# Quick Summary: Fix E2E UI Blockers

## Result

Fixed three blockers from the UI-first retest before restarting the full E2E Auftrag:

1. Empty `YearPicker` instances now open around the current year instead of the far-future max-year page.
2. `/login` relogin clears the active app/Keycloak session through the central auth API before starting a new Keycloak login with `prompt=login`.
3. Fansub app members without a linked historical member now render app-user display data from the backend payload instead of falling back to `Mitglied #id`.

## Files Changed

- `frontend/src/components/ui/YearPicker.tsx`
- `frontend/src/components/ui/YearPicker.test.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/page.test.tsx`
- `frontend/src/lib/keycloakAuth.ts`
- `frontend/src/lib/keycloakAuth.test.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`
- `backend/internal/repository/fansub_group_app_members_repository.go`
- `backend/internal/repository/fansub_group_app_members_repository_test.go`

## Checks

- `npm run test -- src/components/ui/YearPicker.test.tsx src/app/login/page.test.tsx src/lib/keycloakAuth.test.ts "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx"`
- `go test ./internal/repository -run "TestListByFansubGroupIncludesAppUserPayload|TestEvaluateMemberMutationConflict|TestCreateCanLinkOpenHistoricalMemberByVerifiedClaim"`
- `npm run typecheck`
- `npm run lint` passes with existing warnings.
- `git diff --check`

## Remaining Risks

- EP08 title mismatch remains a data-quality/source-of-truth decision.
- Gruppennotiz link markup rejection remains a separate editor/backend contract quick.
- Existing lint warnings remain unrelated and were not changed in this quick.
