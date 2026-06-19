# Phase 88 UAT

## Scope

Medium-scope browser UAT for the member-facing fansubber workspace and copy cleanup. This checklist verifies that Team4s speaks in neutral project/member language, keeps release-version media and notes on existing seams, and does not imply that a user directly proved work on an anime or release.

## 1. Mobile And Desktop Layout

Routes: `/me/contributions`, `/me/profile`, `/admin/my-groups`, `/admin/my-groups/[id]`, `/me/releases/[versionId]/workspace`.

Expected: At 375px and desktop width, headers, tabs, badges, release buttons, modals, and form actions wrap without horizontal overflow. The release workspace shows the global page header and tab pattern cleanly.

Method: Open each route in the browser, check 375px mobile and desktop viewport, then tab through primary controls.

## 2. False Claim/Credit Language

Routes: `/me/contributions`, `/me/profile`, `/admin/my-groups`, `/admin/my-groups/[id]`, `/me/releases/[versionId]/workspace`.

Expected: Runtime UI avoids direct ownership wording such as `mein Beitrag`, `ich habe bei dem Anime mitgemacht`, `Claim`, `Credit-Claim`, `Beitragsprüfung`, and `Prüffall`. Acceptable meaning is limited to user statements like `Ich war in diesem Projekt dabei`, group participation, identity linking, or project hints that Team4s checks.

Method: Browser-read the visible strings and run a targeted copy grep on touched routes.

## 3. Route Correctness

Routes: `/admin/my-groups`, `/admin/my-groups/[id]`, `/me/releases/[versionId]/workspace`.

Expected: Release actions from `Meine Gruppen` route to `/me/releases/[versionId]/workspace`. Workspace breadcrumb/actions route back to `/me/contributions` with the visible label `Meine Projekte`.

Method: Click a release workspace CTA from a member group detail page and confirm the final URL. Click the workspace breadcrumb/action and confirm `/me/contributions`.

## 4. Auth Refresh Session

Routes: `/me/contributions`, `/me/profile`, `/admin/my-groups`, `/admin/my-groups/[id]`, `/me/releases/[versionId]/workspace`.

Expected: With no access token but a valid refresh session, protected pages do not show logged-out UI; central API helpers perform the refresh path. UI code does not pass `authToken` props or parameters.

Method: Use existing tests/mocks for `hasAccessToken=false` and `hasRefreshToken=true`; in browser UAT, verify the same flow after access-token expiry.

## 5. Modal, Keyboard, And Touch Operation

Routes: `/me/contributions`, `/me/profile`.

Expected: The contribution hint modal and identity-link form are usable by keyboard and touch. Focus remains in the modal, Escape closes it where supported by the shared modal, and submit buttons expose neutral copy like `Hinweis senden` or `Das bin ich`.

Method: Open the modal, tab through fields, submit validation-empty state, close with keyboard, then repeat on mobile width.

## 6. Empty And Disabled States

Routes: `/admin/my-groups`, `/admin/my-groups/[id]`, `/me/profile`, `/me/releases/[versionId]/workspace`.

Expected: No-group, no-membership, no media permission, no notes permission, and missing member-profile states explain the exact limitation without implying credits or immediate proof. Historical links are context only and grant no group rights.

Method: Use mocked test states or fixture accounts for no group membership, media-only access, notes-only access, and missing `member_id`.

## Media And Notes Affordance Status

Media is reused through `ReleaseVersionMediaSection` and `useReleaseVersionMedia`, backed by `uploadReleaseVersionMedia`, `patchReleaseVersionMediaItem`, `deleteReleaseVersionMediaItem`, and `reorderReleaseVersionMedia`. Visibility is controlled by existing release-version capability booleans such as `can_view_media`, `can_upload_media`, `can_update_media`, and `can_delete_media`.

Notes are reused through `ReleaseVersionNotesTab`, backed by `listReleaseVersionNotes` and `bulkUpsertReleaseVersionNotes`. The member workspace passes `memberIdFilter={memberId}` so the member route only shows that member's release-version notes. A delete API helper exists, but the reused notes tab does not expose a delete button; keep that as a later exact gap unless a future phase adds it through the existing notes seam.
