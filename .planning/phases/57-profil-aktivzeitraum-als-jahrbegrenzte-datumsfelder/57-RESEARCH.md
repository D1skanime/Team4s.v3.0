# Phase 57: Research

## Research Question

What do we need to know to plan the profile activity-period conversion well?

## Current Runtime Findings

| Area | Current state | Evidence |
|---|---|---|
| DB | `members.active_from_year` and `members.active_until_year` are `INTEGER`; `is_currently_active` is boolean. | `database/migrations/0077_member_profiles_mvp.up.sql` |
| Backend model | `MemberProfile` exposes `active_from_year`, `active_until_year`, `is_currently_active`. | `backend/internal/models/member_profile.go` |
| Backend repository | `UpdateOwnProfile` validates years as positive integers and writes year columns. | `backend/internal/repository/member_profile_repository.go` |
| Handler | `updateOwnProfileRequest` accepts year fields on `PUT /api/v1/me/profile`. | `backend/internal/handlers/app_profile.go` |
| OpenAPI | `MemberProfile` and `UpdateMemberProfileRequest` document `active_from_year` / `active_until_year`. | `shared/contracts/openapi.yaml` |
| Frontend DTO | `MemberProfileData` and `UpdateMemberProfileRequest` expose year fields. | `frontend/src/types/profile.ts` |
| UI | `ProfileBasicsForm` uses numeric inputs for `Aktiv seit` and `Aktiv bis`. | `frontend/src/app/me/profile/components/ProfileBasicsForm.tsx` |
| Tests | Profile tests cover invalid activity years and protected refresh-session behavior. | `frontend/src/app/me/profile/page.test.tsx` |

## Recommended Contract

Use additive date fields as the new runtime source:

- `members.active_from_date DATE`
- `members.active_until_date DATE`
- keep `members.is_currently_active BOOLEAN`

Normalize selected years to January 1 in storage:

- UI year `2016` -> API value `2016-01-01`
- API value `2016-01-01` -> UI display `2016`

This satisfies "DB date field" while keeping the product contract year-limited. Arbitrary dates such as `2016-05-12` should be rejected by backend validation or normalized only if the contract explicitly decides that normalization is safe. For this phase, reject arbitrary month/day to prevent hidden semantics.

## Migration Strategy

1. Preflight `git status --short database/migrations`.
2. Add `0079_member_profile_activity_dates.up.sql` and `.down.sql`.
3. Add date columns with `IF NOT EXISTS`.
4. Backfill from old integer years using `make_date(active_from_year, 1, 1)`.
5. Add constraints:
   - `active_from_date IS NULL OR active_from_date = make_date(EXTRACT(YEAR FROM active_from_date)::int, 1, 1)`
   - same for `active_until_date`
   - `active_until_date IS NULL OR active_from_date IS NULL OR active_until_date >= active_from_date`
6. Do not drop old integer columns in this phase unless an explicit destructive cleanup check is added and approved. Runtime should read/write date columns first.

## API Strategy

Expose the new documented fields:

- `active_from_date?: string | null` with `format: date`
- `active_until_date?: string | null` with `format: date`
- `is_currently_active?: boolean | null`

Compatibility options:

- Response can temporarily include old year fields if existing consumers still use them, but `/me/profile` should migrate to the date fields.
- Request should prefer date fields. If old year fields remain accepted temporarily, handler should convert them through the same validator and tests must mark them compatibility-only.

## UI Strategy

Use a year-limited semantic control, not free text. The existing global `Select` is available and fits a constrained year picker without adding a new generic component. A small profile-local `YearSelect` helper is acceptable if it stays display-only and avoids API/domain logic.

Required behavior:

- `Aktiv seit` and `Aktiv bis` choose from bounded years, e.g. current year down to 1970, plus an empty option.
- Labels and messages use proper umlauts.
- `Aktuell aktiv` remains a checkbox.
- Checking `Aktuell aktiv` clears/disables `Aktiv bis`.
- Save payload sends `active_from_date` and `active_until_date`, not year fields.
- Dirty-state and Keycloak-return refresh preserve unsaved values.

## Risks

| Risk | Mitigation |
|---|---|
| Old and new fields drift | Runtime reads/writes date fields as source; old years are compatibility/backfill only. |
| Month/day semantics sneak in | Backend validates `MM-DD == 01-01`; OpenAPI says year-limited date. |
| Protected UI regresses | Keep `hasAccessToken || hasRefreshToken` gate and central API helpers; test expired/missing access token with valid refresh session. |
| Broad profile redesign | Limit files to profile contract and controls; no avatar/story/membership redesign. |

## Ready for Planning

Yes.
