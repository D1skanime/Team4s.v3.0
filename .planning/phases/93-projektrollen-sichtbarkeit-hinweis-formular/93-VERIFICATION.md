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

Status: superseded by Add-on 3.

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

## Add-on 3 - Hinweis-Formular als Schritt-Assistent

Scope: Add-on 3 replaces Add-on 2 for the hint form. The project-role/offene-Aktionen block remains untouched.

Implemented:

- `ProposalForm` is now a 3-step `Drawer` bottom-sheet assistant: `Gruppe & Projekt`, `Rolle`, `Hinweis & Zeitraum`.
- The removed "Worum geht es?" project-vs-release scope is no longer rendered; until release-version hints exist, submissions are project-scoped.
- The assistant shows three progress segments plus `Schritt X von 3`, and footer navigation uses `Weiter`, `Zurück`, and final `Hinweis senden`.
- Group/project selection uses local custom select controls with initials avatars and option lists. The project selector is disabled until a group is selected, then shows a compact `Gruppe · Projekt` chip.
- Group scoping remains verified: groups come only from `ProposalForm.ownGroups`, loaded on `/me/contributions` via `getMyMemberships()` from `/api/v1/me/memberships`; backend submit ownership checks stay in `contribution_proposals_me_handler.go`.
- Role selection is now single-select with large chips, active fill, and a check icon.
- The note field has a 280-character limit and live counter; year fields still use `YearPicker`.
- Successful submit now shows an in-assistant `Hinweis gesendet` confirmation with group, project, and role summary. `Fertig` closes and resets the assistant.

Verification:

- `npm --prefix frontend test -- src/components/contributions/ProposalForm.test.tsx`
- `npm --prefix frontend test -- src/components/contributions/ReportModal.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run lint` passed with existing unrelated warnings only.
- `git diff --check`
- `npm --prefix frontend run build`
- `docker compose build team4sv30-frontend`
- `docker compose up -d team4sv30-frontend`
- Live browser check as `ao-encoder`: mobile 420px step 1 opens as bottom-sheet, project select is disabled before group selection, and no horizontal overflow was detected (`scrollWidth = clientWidth = 420`).
- Live browser check as `ao-encoder`: after selecting `AnimeOwnage` and `Naruto`, the confirmation chip renders as `AnimeOwnage · Naruto`, project select is enabled, and no horizontal overflow was detected.
- Live browser check as `ao-encoder`: step 2 role chips render as touch-sized radio choices with `Zurück`/`Weiter`.
- Live browser check as `ao-encoder`: step 3 clips note input to 280 characters, shows `280/280`, shows the 90-day note, keeps year pickers visible, and has no horizontal overflow at 420px.
- Live browser check as `ao-encoder`: desktop 1280px step 1 opens without horizontal overflow.

Live-submit note: superseded by Add-on 4 verification below.

## Add-on 4 - Hinweis-Assistent Layout, Duplikat-Anzeige, Submit-500

Scope: Add-on 4 keeps the 3-step assistant from Add-on 3. It fixes step-3 layout defects and verifies duplicate-warning behavior. The already-correct project-role/offene-Aktionen block remains untouched.

Teil A duplicate verification:

- Checked local DB for `ao-encoder` / member `4`, group `AnimeOwnage` (`fansub_group_id=1`), project `Naruto` (`anime_id=1`), historical group member `3`.
- Existing contribution found before the fix: `anime_contributions.id=2`, `status=confirmed`, `note='Encoding im Naruto-Projekt.'`, roles `{encoder,timer}`, created/confirmed at `2026-06-08 19:15:03.683007+00`.
- Conclusion: a warning for the exact existing roles is correct, but the old combination-level duplicate block was too broad for another role in the same project.

Implemented:

- Duplicate handling is now role-scoped: a member can submit another role for the same group/project/member context, while identical role duplicates still return `409`.
- Proposal writes now populate canonical `anime_contributions.member_id` from `hist_fansub_group_members`, fixing the live `500` on `/api/v1/me/contribution-proposals` after migration `0105`.
- Shared contribution row scans now include `fansub_group_member_id`, so create responses no longer return `fansub_group_member_id: 0`.
- Step label appears only once per assistant view.
- Progress segments use the indigo/violet gradient from the reference prototype.
- `YearPicker` opens as a fixed portal overlay with footer-aware positioning, so it does not push or deform the drawer footer.
- Step 3 validates `Bis Jahr` before `Von Jahr` and shows `Das Bis-Jahr darf nicht vor dem Von-Jahr liegen.`.

Verification:

- `go test ./internal/repository -run "TestCreateProposal_IsRoleScopedAndSerialized|TestMemberContributionWithProposalRow_HasEpisodeFields"`
- `go test ./internal/repository ./internal/handlers -run "TestCreateProposal|TestListMemberships|TestMemberContributionWithProposalRow|TestCreateProposal_IsRoleScoped"`
- `npm --prefix frontend test -- src/components/contributions/ProposalForm.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run lint` passed with existing unrelated warnings only.
- `npm --prefix frontend run build`
- `docker compose build team4sv30-backend`
- `docker compose up -d --no-deps --force-recreate team4sv30-backend`
- `git diff --check`
- `http://127.0.0.1:8092/health` returned HTTP 200.
- `http://127.0.0.1:3000/me/contributions` returned HTTP 200.
- Live API submit as `ao-encoder` for `AnimeOwnage` / `Naruto` / `raw_provider` returned HTTP 201 with `fansub_group_member_id=3`, `member_id=4`, `status=proposed`; the temporary test row was deleted immediately after verification.
- Backend logs after redeploy show the submit as `201` and no `500` for `/api/v1/me/contribution-proposals`.

Live layout checks:

- Mobile 420px: exactly one `Schritt 3 von 3` label; progress computed as `linear-gradient(90deg, rgb(79, 70, 229) 0%, rgb(124, 58, 237) 100%)`.
- Mobile 420px: open year picker panel stayed fixed above the footer (`panel bottom 386`, footer top `633` in the measured run), with footer buttons retaining stable dimensions and no horizontal overflow.
- Desktop-width smoke check: `/me/contributions` loaded successfully after redeploy.
