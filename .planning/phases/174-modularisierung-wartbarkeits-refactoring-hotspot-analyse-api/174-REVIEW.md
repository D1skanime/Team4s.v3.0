---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
reviewed: 2026-10-06T13:44:23Z
depth: standard
files_reviewed: 139
files_reviewed_list:
  - backend/internal/handlers/admin_content_release_version_media_capabilities.go
  - backend/internal/handlers/admin_content_release_version_media_delete.go
  - backend/internal/handlers/admin_content_release_version_media.go
  - backend/internal/handlers/admin_content_release_version_media_list.go
  - backend/internal/handlers/admin_content_release_version_media_patch.go
  - backend/internal/handlers/admin_content_release_version_media_permissions.go
  - backend/internal/handlers/admin_content_release_version_media_upload.go
  - backend/internal/handlers/admin_content_release_version_media_upload_process.go
  - backend/internal/handlers/segment_validation_test.go
  - backend/internal/repository/admin_content_anime_segments_crud.go
  - backend/internal/repository/admin_content_anime_segments_library.go
  - backend/internal/repository/admin_content_anime_segments_playback.go
  - backend/internal/repository/admin_content_anime_themes_core.go
  - backend/internal/repository/admin_content_anime_themes_test.go
  - backend/internal/repository/admin_content_release_theme_assets.go
  - backend/internal/repository/admin_content_test.go
  - backend/internal/repository/admin_content_theme_asset_locks_test.go
  - backend/internal/repository/anime_assets_background.go
  - backend/internal/repository/anime_assets_background_reconcile.go
  - backend/internal/repository/anime_assets_background_video.go
  - backend/internal/repository/anime_assets_banner_logo.go
  - backend/internal/repository/anime_assets_cover.go
  - backend/internal/repository/anime_assets.go
  - backend/internal/repository/anime_assets_provider.go
  - backend/internal/repository/anime_assets_resolve.go
  - backend/internal/repository/anime_assets_test.go
  - backend/internal/repository/fansub_repository_aliases.go
  - backend/internal/repository/fansub_repository_anime_links.go
  - backend/internal/repository/fansub_repository.go
  - backend/internal/repository/fansub_repository_groups.go
  - backend/internal/repository/fansub_repository_links.go
  - backend/internal/repository/fansub_repository_members.go
  - backend/internal/repository/fansub_repository_merge_core.go
  - backend/internal/repository/fansub_repository_merge_duplicates.go
  - backend/internal/repository/fansub_repository_public_profile.go
  - backend/internal/repository/fansub_repository_test.go
  - backend/internal/repository/runtime_authority_test.go
  - backend/internal/repository/segment_playback_resolution_test.go
  - frontend/eslint.config.mjs
  - frontend/src/app/admin/anime/create/internal/admin-anime-create/types.ts
  - frontend/src/app/admin/anime/create/internal/admin-anime-create/useAniSearchIntakeActions.ts
  - frontend/src/app/admin/anime/create/internal/admin-anime-create/useAssetStagingActions.ts
  - frontend/src/app/admin/anime/create/internal/admin-anime-create/useCreateSubmitAction.ts
  - frontend/src/app/admin/anime/create/internal/admin-anime-create/useJellyfinIntakeActions.ts
  - frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
  - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
  - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts
  - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx
  - frontend/src/app/admin/fansubs/create/page.tsx
  - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts
  - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewBulkActionBar.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/RoleToggleGroup.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/RoleToggleGroup.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewActions.ts
  - frontend/src/components/ui/AccentRule.module.css
  - frontend/src/components/ui/AccentRule.tsx
  - frontend/src/components/ui/Accordion.module.css
  - frontend/src/components/ui/Accordion.tsx
  - frontend/src/components/ui/ActionBar.module.css
  - frontend/src/components/ui/ActionBar.tsx
  - frontend/src/components/ui/AdjacentNavigation.module.css
  - frontend/src/components/ui/AdjacentNavigation.tsx
  - frontend/src/components/ui/AvatarStack.module.css
  - frontend/src/components/ui/AvatarStack.tsx
  - frontend/src/components/ui/Badge.module.css
  - frontend/src/components/ui/Badge.tsx
  - frontend/src/components/ui/Button.module.css
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/Card.module.css
  - frontend/src/components/ui/Card.tsx
  - frontend/src/components/ui/DatePicker.module.css
  - frontend/src/components/ui/DatePicker.tsx
  - frontend/src/components/ui/DisclosureIndicator.module.css
  - frontend/src/components/ui/DisclosureIndicator.tsx
  - frontend/src/components/ui/Drawer.module.css
  - frontend/src/components/ui/Drawer.tsx
  - frontend/src/components/ui/EmptyState.module.css
  - frontend/src/components/ui/EmptyState.tsx
  - frontend/src/components/ui/FormField.module.css
  - frontend/src/components/ui/FormField.tsx
  - frontend/src/components/ui/HeroMetrics.module.css
  - frontend/src/components/ui/HeroMetrics.test.tsx
  - frontend/src/components/ui/HeroMetrics.tsx
  - frontend/src/components/ui/LoadingState.module.css
  - frontend/src/components/ui/LoadingState.tsx
  - frontend/src/components/ui/Modal.module.css
  - frontend/src/components/ui/Modal.tsx
  - frontend/src/components/ui/PageHeader.module.css
  - frontend/src/components/ui/PageHeader.tsx
  - frontend/src/components/ui/Pagination.module.css
  - frontend/src/components/ui/Pagination.tsx
  - frontend/src/components/ui/SectionHeader.module.css
  - frontend/src/components/ui/SectionHeader.test.tsx
  - frontend/src/components/ui/SectionHeader.tsx
  - frontend/src/components/ui/Select.module.css
  - frontend/src/components/ui/Select.tsx
  - frontend/src/components/ui/Switch.module.css
  - frontend/src/components/ui/Switch.tsx
  - frontend/src/components/ui/Table.module.css
  - frontend/src/components/ui/Table.tsx
  - frontend/src/components/ui/Tabs.module.css
  - frontend/src/components/ui/Tabs.tsx
  - frontend/src/components/ui/Textarea.module.css
  - frontend/src/components/ui/Textarea.tsx
  - frontend/src/components/ui/Toolbar.module.css
  - frontend/src/components/ui/Toolbar.tsx
  - frontend/src/components/ui/ui.module.css
  - frontend/src/components/ui/YearPicker.module.css
  - frontend/src/components/ui/YearPicker.tsx
  - frontend/src/lib/api/admin/anime-assets.ts
  - frontend/src/lib/api/admin/anime-core.ts
  - frontend/src/lib/api/admin/anime-jellyfin.ts
  - frontend/src/lib/api/admin/anime-relations.ts
  - frontend/src/lib/api/admin/anime-release-assets.ts
  - frontend/src/lib/api/admin/anime-taxonomy.ts
  - frontend/src/lib/api/admin/anime-themes.ts
  - frontend/src/lib/api/admin/episodes.ts
  - frontend/src/lib/api/admin/fansub-media.ts
  - frontend/src/lib/api/admin/fansub-members.ts
  - frontend/src/lib/api/admin/segment-assets.ts
  - frontend/src/lib/api/admin/segments.ts
  - frontend/src/lib/api/admin/users.ts
  - frontend/src/lib/api.auth-refresh.test.ts
  - frontend/src/lib/api/auth.ts
  - frontend/src/lib/api/canary.barrel.consumer.ts
  - frontend/src/lib/api/canary.barrel.import-actual.test.ts
  - frontend/src/lib/api/canary.barrel.literal-mock.test.ts
  - frontend/src/lib/api/canary.barrel.real.test.ts
  - frontend/src/lib/api/canary.barrel.spyon.test.ts
  - frontend/src/lib/api/client.ts
  - frontend/src/lib/api/comments.ts
  - frontend/src/lib/api/contributions-admin.ts
  - frontend/src/lib/api/contributions-me.ts
  - frontend/src/lib/api/episodes.ts
  - frontend/src/lib/api/fansubs-aliases.ts
  - frontend/src/lib/api/fansubs-core.ts
  - frontend/src/lib/api/fansubs-groups.ts
  - frontend/src/lib/api/fansubs-members.ts
  - frontend/src/lib/api/history.ts
  - frontend/src/lib/api/media.ts
  - frontend/src/lib/api/members-media.ts
  - frontend/src/lib/api/members-me.ts
  - frontend/src/lib/api/members.ts
  - frontend/src/lib/api.no-token-boundary.test.ts
  - frontend/src/lib/api/permissions.ts
  - frontend/src/lib/api/projects.ts
  - frontend/src/lib/api/releases.ts
  - frontend/src/lib/api/reviews.ts
  - frontend/src/lib/api/search.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/api/watchlist.ts
  - frontend/src/lib/roleCatalog.accessibility.test.ts
  - frontend/src/types/__tests__/v12-projection-contract.test.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 174: Code Review Report

**Reviewed:** 2026-10-06T13:44:23Z
**Depth:** standard
**Files Reviewed:** 139 (per `174-BUGS.md`/`174-SUMMARY.md` scope; some of the 191 files listed in the workflow prompt are not actually part of Phase 174's diff — see Methodology note)
**Status:** issues_found (1 warning, 1 info — no blockers)

## Summary

Phase 174 is a large, unusually well-instrumented behavior-preserving modularization effort (26 plans) splitting a Go backend monolith and a Next.js/TypeScript frontend monolith into domain-scoped sibling files, plus two CSS-module splits. The phase's own planning artifacts (`174-HOTSPOTS.md`, `174-FOLLOWUPS.md`, `174-BUGS.md`) are unusually thorough and already self-document the exact class of risk an adversarial reviewer would look for (D-03 "self-inspecting test now points at the wrong file" breakage, the `{...sharedStyles, ...ownStyles}` CSS-module-mock Proxy bug, five live-UAT-caught regressions with root-cause writeups).

This review verified, rather than assumed, that those self-reported claims hold:

- **Backend:** `go build ./...` and `go vet ./internal/handlers/... ./internal/repository/...` are clean inside the real `team4sv30-backend` container. `go test ./internal/repository/... ./internal/handlers/...` was run and its failures were cross-checked line-by-line against `174-HOTSPOTS.md`'s "Pre-Existing Baseline Test Failures" catalogue (Category A DSN-gated tests, Category B same-container-port/permission-cache issues, Category D the pre-existing duplicate-YAML-key `openapi.yaml` bug) — no failure outside that documented baseline was found.
- A sample "byte-identical move" claim (174-20's RVM handler split, `admin_content_release_version_media*.go`) was independently verified by diffing the function-signature set of the pre-split monolith against the concatenated post-split files: identical except for `isReleaseVersionMediaUploader`, which the plan/BUG-174-04 doc explicitly documents as a deliberate post-split addition.
- Every "D-03 import-path exception" self-inspecting test (`os.ReadFile`/`readRepositorySource` pattern reading a sibling file by name) that this prompt's file list touches was checked against `git show`/`git log -S` for the specific function/fragment it asserts on, to rule out a stale assertion silently passing against the wrong file post-split (the exact Phase-143 precedent `174-HOTSPOTS.md` itself warns about). All were confirmed to point at a file that genuinely contains the asserted fragment.
- **Frontend:** `npx tsc --noEmit` surfaces only the already-documented F-06 pre-existing `ReleaseDetailHero.test.tsx` errors (Phase 169, unrelated to this phase's files). Targeted `vitest run` across `frontend/src/lib/api`, `frontend/src/app/admin/anime/create`, `frontend/src/app/admin/fansubs` (incl. `[id]/edit`), and `frontend/src/components/ui` passed 100% (96+36+1 test files, 787+254+23 tests, 0 failures).
- The `components/ui/*` files in scope that the CSS-module-mock Proxy fix (F-12/174-23) targets (`Drawer.tsx`, `Modal.tsx`, `Select.tsx`, `Textarea.tsx`) were manually confirmed to use the corrected `new Proxy({...}, { get: ... })` merge, not the broken `{...sharedStyles, ...ownStyles}` object-spread pattern that 174-FOLLOWUPS.md's F-12 flags as still-present in 16 *other*, out-of-scope `[id]/edit/*` files.

Within the reviewed file set, no new BLOCKER-class bug, security vulnerability, or data-loss risk was found that is attributable to the refactoring split itself. The two findings below are quality/maintainability observations, not regressions.

**Methodology note:** several files named in the prompt's required-reading list (`frontend/eslint.config.mjs`, `adminFansubCreateHelpers.test.ts`, `useAdminFansubCreateActions.test.ts`, `HeroMetrics.test.tsx`, `SectionHeader.test.tsx`) were read/exercised via the test runs above but produced no file-specific findings worth a separate entry; they are listed in `files_reviewed_list` for scope-completeness per the workflow contract.

## Warnings

### WR-01: `getAdminTagTokens` now has two independent implementations, re-surfaced by the split instead of consolidated

**File:** `frontend/src/lib/api/admin/anime-taxonomy.ts:42-67` (new sibling file created by 174-03's split of the `api.ts` monolith) vs. `frontend/src/lib/api/admin-anime-intake.ts:196-213` (pre-existing, outside the `@/lib/api` barrel)

**Issue:** `api.ts` already contained its own `getAdminTagTokens` before Phase 174 (added at the pre-174 baseline, independent of the pre-existing `admin-anime-intake.ts` copy — confirmed via `git log -S` on both files). Plan 174-03 mechanically relocated `api.ts`'s copy, byte-for-byte, into the newly-created `frontend/src/lib/api/admin/anime-taxonomy.ts`, without flagging or deduplicating against the other, functionally-equivalent copy in `admin-anime-intake.ts`. Both hit `GET /api/v1/admin/tags` with the same `{query, limit}` shape, but with *different* plumbing: `anime-taxonomy.ts` uses `apiClientFetch`/`parseApiErrorPayload` (structured `code`/`details` on the thrown `ApiError`), while `admin-anime-intake.ts` uses `authorizedFetch`/`parseApiError` (message only, explicit `authToken` param it no longer effectively needs). Both are live call sites today: `useAnimePatchImpl.ts` imports the barrel version (`anime-taxonomy.ts`), while `useAdminAnimeCreateControllerImpl.ts` imports the `admin-anime-intake.ts` version directly. This is exactly the "doppelte Parallelimplementierungen für dieselbe Fachaufgabe" pattern CLAUDE.md calls out as something to consolidate on sight — Phase 174 was the one editing both of these call sites' import graph and had the opportunity to notice and merge them, but the plan's explicit no-behavior-change scope (D-01) meant it carried the duplicate forward unexamined into a brand-new file rather than either deduplicating or at minimum leaving a cross-reference comment (as the file's own header comment for `getAdminGenreTokens`/`getAdminTagTokens` claims "Uses the same auth-header pattern as the other intake helpers instead of reusing the genre helper so the two token sources stay independently callable" — a claim about *intra*-file independence that doesn't address the *inter*-file duplicate).

**Fix:** Track this under the existing F-17 "Doppelungen nach Fachaufgaben" follow-up inventory (it is not currently named there) or, as a quick win, pick one implementation (recommend `anime-taxonomy.ts`'s, since it threads structured error `code`/`details`) and have `admin-anime-intake.ts` re-export/delegate to it:
```ts
// admin-anime-intake.ts
export { getAdminTagTokens } from "./admin/anime-taxonomy";
```
then remove the now-dead duplicate body, after confirming both call sites tolerate the error-shape difference.

## Info

### IN-01: Inconsistent indentation in the returned `handlers` object literal

**File:** `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts:967-1052`

**Issue:** A handful of entries inside the large `handlers: { ... }` return-object literal use 8-space indentation (`        addGenreSuggestion: addCreateGenreTokens,`, `        clearAniSearchState,`, `        setContentType: setCreateContentType,`) while every neighboring line in the same object uses 6-space indentation. This is cosmetic only — it does not affect behavior and ESLint/Prettier evidently don't enforce this in the current config — but it is a legibility regression introduced while assembling the facade's final return value during the 174-10/174-11 extraction (the surrounding lines were otherwise carefully aligned).

**Fix:** Run the project formatter over this block (or manually re-indent the three affected lines to 6 spaces) to match the rest of the object literal.

---

_Reviewed: 2026-10-06T13:44:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
