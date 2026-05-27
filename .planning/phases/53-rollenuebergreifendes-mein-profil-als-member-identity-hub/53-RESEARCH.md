# Phase 53 Research: Rollenuebergreifendes Mein Profil als Member Identity Hub

**Researched:** 2026-05-27  
**Mode:** Inline research after `$gsd-plan-phase 53` research gate  
**Status:** Ready for replanning

## Scope

This research answers what the Phase 53 plans must know before execution. It focuses on implementation seams, existing reusable code, contract gaps, and execution risks for `/me/profile`.

## Existing Profile Route And Data

- The current own-profile UI is `frontend/src/app/admin/profile/page.tsx`.
- The component is named `AdminProfilePage` and imports `./page.module.css`, which makes the current implementation admin-coupled by name and by CSS ownership.
- The current page is stateful and uses auth/session refresh, dirty form state, save/upload state, and local form conversion. `/me/profile` therefore needs a client component boundary or a thin route wrapper plus client leaf.
- Existing frontend API helpers already exist in `frontend/src/lib/api.ts`: `getOwnProfile`, `updateOwnProfile`, `uploadOwnProfileAvatar`, and `refreshActiveAuthSession`.
- Backend runtime endpoints already exist for:
  - `GET /api/v1/me/profile`
  - `PUT /api/v1/me/profile`
  - `POST /api/v1/me/profile/avatar`
- `shared/contracts/openapi.yaml` still needs the own-profile contract documented and kept in sync with runtime/DTO changes.

## Navigation And Shell

- Search found no reusable global app shell named `AppShell`, `UserMenu`, or equivalent for authenticated `/me/*` surfaces.
- Known current own-profile links are admin-context links:
  - `frontend/src/app/admin/page.tsx` links to `/admin/profile`.
  - `frontend/src/app/admin/my-groups/page.tsx` links to `/admin/profile`.
  - `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` mentions `/admin/profile`.
- This means normal members may not have a non-admin entry point to `/me/profile`.
- Phase 53A must include a reusable authenticated shell or auth-adjacent navigation seam that exposes `Mein Profil` to all signed-in users.
- The shell must be global/reusable, not hardcoded inside the profile page. `/me/profile` is the first consumer; wider app migration is deferred.
- Missing shell targets such as `/me/groups` or `/me/contributions` must be disabled/Coming soon unless real routes already exist.

## Rich Text And `member_story`

- Current profile behavior is not true TipTap persistence:
  - `richTextFromPlainText(profile.member_story || '')` wraps legacy text for the editor.
  - `richTextToPlainText(form.memberStory)` converts the editor state back to plain text before saving.
- Existing profile DTOs only expose `member_story?: string | null`.
- Existing Phase 41 rich-text infrastructure exists and must be reused:
  - `backend/internal/services/tiptap_service.go`
  - `backend/internal/handlers/admin_content_member_stories.go`
  - `backend/internal/repository/member_group_stories_repository.go`
  - `frontend/src/components/editor/RichTextEditor.tsx`
  - `frontend/src/components/editor/RichTextRenderer.tsx`
- `RichTextRenderer.tsx` uses `dangerouslySetInnerHTML`, with a security comment saying it may only receive server-sanitized `body_html`.
- 53B must not create a second TipTap service, renderer, sanitizer, or storage pattern.
- Existing plain-text `member_story` values are production data. A real TipTap change requires either data migration or a legacy-text fallback renderer before switching the profile story to JSON/HTML rendering.

## Avatar And Crop

- Existing profile avatar upload is handled by `backend/internal/handlers/app_profile.go`.
- `UploadOwnProfileAvatar` calls `detectAvatarImage(file, fileHeader.Size)`.
- `detectAvatarImage` currently checks `size > maxImageSize`, where `maxImageSize` is the generic 50 MB image upload limit from `media_upload.go`.
- Phase 53B needs a profile-specific avatar limit, expected around 5 MB, checked before decode/save and not silently inherited from the 50 MB generic image path.
- No profile avatar remove endpoint was found. Avatar remove must be explicitly deferred or implemented as its own DELETE/remove contract; no production remove button without a backend contract.
- Existing crop primitives are under `frontend/src/components/admin`:
  - `MediaUpload.tsx`
  - `mediaUploadCropMath.ts`
  - `mediaUploadA11y.ts`
- `MediaUpload.tsx` already uses pointer events (`pointerdown`, `pointermove`, `pointerup`) and focus helpers, so mobile/touch support can likely reuse pointer-based behavior.
- The current crop code lives in an admin directory. `/me/profile` must not permanently import reusable crop primitives from `frontend/src/components/admin`; shared code should move to a media/app-neutral location or the transition must be explicitly documented.
- Avatar crop has stricter geometry than generic/group-logo crop: enforced 1:1 output, round preview, and round canvas/mask output. Existing math can be reused only after avatar-specific geometry tests are added.
- Client-side raster crop can lose the original source. If future variants or recrop matter, the contract must retain original plus crop output/metadata, or document the limitation.

## Activity, Visibility, Memberships, Contributions

- Current profile activity fields are year-only: `active_from_year`, `active_until_year`, `is_currently_active`.
- Month/year UI must not be invented from memberships, credits, or free text. It needs a migration and contract or an honest year-only control.
- Current visibility values are `members_only | public`. A third option such as `Für Gruppen sichtbar` requires DB/backend/OpenAPI/public-query semantics before becoming interactive.
- Membership data is available in the profile aggregate but group logo is not in the current membership DTO. 53A can use fallback icons; logo requires contract expansion.
- Contributions are currently aggregate historical credits, not paginated detail rows. Phase 53 must keep detail expansion deferred and must not fake Anime/Episode/Release-Version rows from counts.

## Migration And File Ownership Risks

- Latest migration files are `0077_member_profiles_mvp.up.sql` and `.down.sql`.
- Before adding any Phase 53 migration, execution must inspect:
  - highest existing migration number,
  - untracked migration files,
  - whether another 53B task already created a migration.
- Wave 2 touches overlapping files (`app_profile.go`, `member_profile.go`, repository, DTOs, OpenAPI). These tasks must be serialized or coordinated; they are not safe as blind parallel execution.

## Planning Implications

53A must explicitly cover:

- reusable global/authenticated shell as first consumer for `/me/profile`,
- non-admin navigation entry,
- active creation of `frontend/src/app/me/profile/page.test.tsx` with real assertions,
- component split before `page.tsx` exceeds the line guardrail,
- `member_story` visible in 53A without claiming rich persistence,
- `/me/profile` CSS ownership separate from admin CSS,
- `use client` or client-leaf boundary verification,
- OpenAPI baseline for existing own-profile endpoints,
- aggregate/honest contributions only.

53B must explicitly cover:

- shared crop primitive extraction or documented transitional coupling,
- avatar-specific 1:1/circular geometry tests,
- profile-specific avatar size limit before decode/save,
- avatar remove deferred unless a contract is added,
- original image retention decision for crop/variants,
- TipTap reuse through existing Phase 41 stack,
- legacy plain-text story migration/fallback,
- migration numbering guardrails,
- fixed defer of contribution detail expansion,
- mobile shell hardening and accessibility.

## Research Complete

The phase is ready to replan. The current plans are conceptually aligned but must be updated so the execution contract covers the remaining implementation-level blockers and all context decisions D-40 through D-58.
