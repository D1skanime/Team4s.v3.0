---
status: passed
phase: 93-projektrollen-sichtbarkeit-hinweis-formular
updated: 2026-06-29
---

# Phase 93 Verification

## Teil A Results

### Punkt 1 - Gruppen-Scoping im Hinweis-Formular

Status: expected behavior confirmed.

Evidence:

- `frontend/src/app/me/contributions/page.tsx` loads `getMyMemberships()` into `ownGroups`.
- `frontend/src/components/contributions/ProposalForm.tsx` renders the group dropdown only from `ownGroups`.
- The dropdown value is `fansub_group_member_id`, and submit derives `fansub_group_id` from the selected membership row.
- `backend/internal/handlers/contribution_proposals_me_handler.go` lists memberships for the resolved verified member through `hist_fansub_group_members`.
- The submit handler checks that the submitted `fansub_group_member_id` belongs to the submitting member and that it belongs to the submitted `fansub_group_id`.

Conclusion: The form does not freely list arbitrary groups; it is scoped to the member's own verified memberships.

### Punkt 2 - Wirkung des Sichtbarkeits-Toggles

Status: expected behavior not confirmed.

Evidence:

- `backend/internal/handlers/contributions_me_handler.go` updates only `anime_contributions.is_public_on_member_profile`.
- `backend/internal/repository/anime_contributions_public_repository.go` uses `ac.is_public_on_member_profile = true` for the public member role timeline and projects `ac.note AS notes`, so contribution notes follow the role flag.
- `backend/internal/repository/group_release_media_repository.go` exposes release-version media only when `media_assets.status = 'ready'`, `visibilities.name = 'public'`, and `review_statuses.code = 'approved'`.
- `release_version_media` media therefore has an independent media visibility/review path and is not toggled by `anime_contributions.is_public_on_member_profile`.

Conclusion: The current toggle controls role visibility and the anime contribution note in the public role timeline, but not related project/release media. A help text claiming role, notes, and images are all controlled together would be misleading.

## Execution Result

Option 3 was selected on 2026-06-29: implement the UI polish, but do not add an explanatory visibility help text for notes/images.

Implemented:

- `AnimeGroupCard` uses a separate chevron disclosure button and keeps "Projekt öffnen" independent.
- The expanded role area renders each role code as a separate row with "Für das gesamte Projekt" for anime-wide roles.
- `VisibilityDropdown` now renders a segmented `Profil` / `Intern` button control while preserving `patchAnimeContributionVisibility`.
- `ProposalForm` keeps group selection scoped to `ownGroups`, shows "Bestimmte Folgen / Release-Version" as "Bald verfügbar", and displays a selected group/project breadcrumb.

Verification:

- `npm --prefix frontend test -- AnimeGroupCard ProposalForm VisibilityDropdown` passed.
- `npm --prefix frontend run typecheck` passed.
- `npm --prefix frontend run lint` passed with existing unrelated warnings only.
- `npm --prefix frontend run build` passed.
- `docker compose build team4sv30-frontend` passed.
- `docker compose up -d team4sv30-frontend` recreated and started the frontend container.
- `http://127.0.0.1:3000/me/contributions` returned HTTP 200.

## Add-on 2 - Hinweis-Formular UI

Scope: only the "Ich war in diesem Projekt dabei" form. The already-correct project-role/offene-Aktionen block was not changed.

Implemented:

- The unavailable follow-up scope is no longer a disabled full button. It is a compact static notice with a thin border, smaller type, lower height, and the existing "Bald verfügbar" tag.
- Add-on 2 tablet fix: modals now have a viewport-bound height with an internal scrollable body, so the close action and footer stay reachable on narrow/tablet viewports.
- Add-on 2 tablet fix: the form's scope row now wraps below 640px, preventing the compact "Bestimmte Folge / Release-Version" notice from pushing the dialog wider than the screen.
- Add-on 2 tablet fix: role buttons can wrap within the picker instead of forcing horizontal overflow.
- The selected group/project breadcrumb renders only after both dropdowns have values and is removed when either selection is reset.
- Group scoping remains unchanged and verified: the dropdown is populated only from `ownGroups`, which is loaded via `getMyMemberships()` from `/api/v1/me/memberships`; backend membership listing and submit ownership checks stay in `contribution_proposals_me_handler.go`.

Verification:

- `npm --prefix frontend test -- src/components/contributions/ProposalForm.test.tsx`
- `npm --prefix frontend test -- src/components/ui/Modal.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run lint` passed with existing unrelated warnings only.
