# Phase 47 Retro Verification: Member Profile & Historical Identity

**Date:** 2026-05-27  
**Mode:** Retroactive verification from runtime evidence and focused tests.  
**Outcome:** Foundation retro-verified; modern route/UX work carries forward to Phase 53.

## Classification

Phase 47 delivered the own-profile foundation, but not the final modern member profile experience.

- **Close as:** `retro-verified foundation complete`
- **Carry forward to:** Phase 53 `Rollenuebergreifendes Mein Profil als Member Identity Hub`
- **Do not treat as complete for:** modern `/me/profile` UX, avatar crop/variants, month/year activity contract, richer visibility model, public-profile readiness, and full GDS/app-shell polish.

## Runtime Evidence

### Backend Routes

- `backend/cmd/server/main.go` registers:
  - `GET /api/v1/me/profile`
  - `PUT /api/v1/me/profile`
  - `POST /api/v1/me/profile/avatar`
- `backend/internal/handlers/app_profile.go` implements own-profile read/update, avatar upload, capability hydration, Keycloak account URL resolution, and audit writes.

### Data Model And Repository

- `database/migrations/0077_member_profiles_mvp.up.sql` extends `members` with:
  - `display_name`
  - `active_from_year`
  - `active_until_year`
  - `is_currently_active`
  - `profile_visibility`
  - `updated_at`
- `backend/internal/models/member_profile.go` defines the profile aggregate, update input, memberships, historical credits, capabilities, avatar reference, and read-only account fields.
- `backend/internal/repository/member_profile_repository.go` uses `members` as the canonical Team4s profile owner and bridges through `app_users.legacy_user_id`.
- The repository loads memberships from historical `group_members` plus app-user-backed `fansub_group_members` / `fansub_group_member_roles`.
- Historical credits are read-only aggregates from `release_member_roles` via release-version/fansub-group context.
- Avatar upload links to existing `media_assets` / `media_files` using media type `avatar` and stores the reference on `members.avatar_media_id`.

### Frontend

- `frontend/src/lib/api.ts` includes `getOwnProfile`, `updateOwnProfile`, and `uploadOwnProfileAvatar`.
- `frontend/src/types/profile.ts` mirrors the backend profile aggregate.
- `frontend/src/app/admin/profile/page.tsx` implements the current profile UI and Keycloak account handoff.
- `frontend/src/app/admin/profile/page.test.tsx` covers own-profile loading, save behavior, Keycloak return refresh behavior, dirty-form preservation, duplicate focus guard, and avatar error display.

## Focused Checks Run

| Check | Result |
|---|---|
| `cd backend && go test ./internal/handlers ./internal/repository -run "Test.*Profile|Test.*Avatar|TestMemberProfile"` | PASS |
| `cd frontend && npm run test -- src/app/admin/profile/page.test.tsx` | PASS, 8 tests |
| `git diff --check` before docs edits | PASS |

Note: an initial frontend test attempt used the repo-root path from inside `frontend/` and failed with "No test files found"; the corrected relative path passed.

## Success Criteria Review

| Criterion | Retro Status | Evidence / Note |
|---|---|---|
| Analyse existing user/member/media/story seams first | Satisfied | Phase context/research plus runtime implementation around `app_users`, `members`, media, memberships, and credits. |
| Reuse existing profile/member/media structures | Satisfied | `members`, `media_assets`, `media_files`, `group_members`, `fansub_group_members`, `release_member_roles` reused. |
| User can edit own archival profile fields | Satisfied | `PUT /api/v1/me/profile`, frontend helper/page/tests. |
| Keycloak account fields are not locally editable | Satisfied | Handler rejects `email` and `keycloak_subject`; UI treats account data as read-only. |
| Keycloak account link exists when configured | Satisfied | Capability/URL hydration and frontend CTA/tests exist. |
| Avatar upload uses media architecture | Partially satisfied | Uses `media_assets` / `media_files` and `avatar` media type; crop, variants, and tighter avatar-specific limit carry forward to Phase 53B. |
| Memberships and roles display separately from profile data | Satisfied for MVP | Aggregate includes memberships and app-member roles; Phase 53 must improve labels and role-kind separation in UI. |
| Historical credits are read-only and not permissions | Satisfied for MVP | Repository reads credit aggregates only; no authz derivation found in profile seam. |
| Misplaced profile editing in fansub admin surfaces removed/demoted | Partial / needs follow-through | Current profile route is dedicated, but broader app-shell and non-admin route cleanup carry forward to Phase 53. |
| Own profile is protected from foreign edits | Satisfied for own-profile MVP | Endpoints are `/me/*` and resolve from authenticated `app_user_id`; no foreign-profile write path is exposed. |
| Capabilities exist for own profile | Satisfied | `MemberProfileCapabilities` includes own view/edit/avatar/account/membership/credit capabilities. |
| Regression tests cover critical paths | Partially satisfied | Focused backend/frontend tests pass; no live UAT artifact and no complete original Phase 47 closeout existed before this retro verification. |

## Carry-Forward Items

Phase 53 should own these, not Phase 47:

1. Introduce `/me/profile` as the target route for all signed-in users and stop treating `/admin/profile` as the primary profile world.
2. Rename/admin-neutralize profile components such as `AdminProfilePage`.
3. Move from backend-form-like UX to the Member Identity Hub layout.
4. Add avatar crop/zoom/positioning and plan avatar variants.
5. Tighten avatar upload contract to avatar-specific limits and no SVG.
6. Replace year-only activity controls with a clarified month/year contract.
7. Expand or limit profile visibility beyond the current `public | members_only` model.
8. Replace plain-text-ish story editing with safe TipTap/Rich Text integration where appropriate.
9. Separate role kinds clearly in UI labels: platform role, group role, app role, historical credit role, release/project role.
10. Keep Account & Security read-only and Keycloak-owned.
11. Add partial loading/error states and mobile/accessibility QA.
12. Add OpenAPI coverage for `/api/v1/me/profile`, `PUT /api/v1/me/profile`, and `POST /api/v1/me/profile/avatar`.

## Decision

Phase 47 can be marked as retro-verified/closed for the foundation layer because the codebase contains the intended own-profile backend, frontend, data model, avatar reference flow, memberships, read-only credits, Keycloak separation, and focused regression evidence.

The remaining product experience is explicitly not reopened in Phase 47. It is already planned as Phase 53.
