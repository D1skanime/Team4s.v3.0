---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
reviewed: 2026-10-06T13:44:23Z
depth: standard
files_reviewed: 202
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
  - backend/internal/handlers/admin_content_release_version_media_replace.go
  - backend/internal/handlers/admin_content_release_version_media_uploader_test.go
  - backend/internal/handlers/dashboard_me_handler.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/services/media_service_display_filename_test.go
  - backend/internal/services/media_service_display_variant.go
  - backend/internal/services/media_service.go
  - backend/internal/services/release_version_media_cleanup_test.go
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  - frontend/src/app/admin/fansubs/create/page.test.tsx
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 174: Code Review Report

**Reviewed:** 2026-10-06T13:44:23Z
**Depth:** standard
**Files Reviewed:** 202 (139 reviewed in the original pass per `174-BUGS.md`/`174-SUMMARY.md` scope, plus 11 supplemental files covering the phase's 5 documented live-UAT bugfixes — see "Nachtrag" section below; some of the 191 files originally listed in the workflow prompt are not actually part of Phase 174's diff — see Methodology note)
**Status:** issues_found (3 warnings, 4 info — no blockers)

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

## Nachtrag: Bugfix-Dateien (11)

Supplemental pass covering the 11 files touched by Phase 174's 5 live-UAT bugfixes
(BUG-174-01 through BUG-174-05, see `174-BUGS.md`), missed by the original 139-file
review scope. Reviewed at standard depth, cross-referencing `git diff dbf8680d..HEAD`
per file to isolate exactly what Phase 174 changed from what was pre-existing.

Correctness verified directly, with no new defect found:

- **BUG-174-02** (`dashboard_me_handler.go`): the dashboard's group-media attention gate
  was confirmed to use `permissions.ActionFansubGroupEdit` consistently (the diff against
  `dbf8680d..HEAD` shows only this one action-constant change plus an updated comment),
  memoized per distinct `FansubGroupID` the same way the sibling `attachPendingClaimAttention`
  already does. `TestAttachPendingGroupMediaReviewAttentionRequiresGroupEdit` exercises the
  real handler method against a schema-isolated Postgres fixture and a resolver stub, not a
  source-text assertion, and correctly distinguishes a reviewer with only
  `review.image.decide` (must not see the item) from a `fansub_lead` with `fansub_group.edit`
  (must see it).
- **BUG-174-04** (`admin_content_release_version_media_replace.go` / sibling
  `admin_content_release_version_media_patch.go`, read for cross-reference although not
  itself one of the 11): the `isReleaseVersionMediaUploader` re-submission gate is applied
  identically in both handlers — `SubmitMedia` (which re-enters the review lifecycle) only
  fires when the acting legacy user ID equals the relation's `uploaded_by_user_id`; a
  non-uploader editor with "update all" rights now keeps the existing review state in both
  code paths, closing the original "Leitung kann fremde Bilder nicht speichern" 422 for both
  metadata (Patch) and full binary replacement (Replace). `isReleaseVersionMediaUploader`'s
  own edge cases (nil uploader, actor without a legacy ID, uploader editing their own medium,
  lead editing someone else's) are unit-tested in
  `admin_content_release_version_media_uploader_test.go`.
- **BUG-174-05** (`media_service_display_variant.go` / `media_service.go`): `SaveUpload` now
  passes the full `absolutePath` (not just `filepath.Dir(absolutePath)`) into
  `buildDisplayVariant`, and every call site that writes a display variant derives its
  filename from `displayVariantFileName(originalPath, ext)` instead of a fixed
  `"display.<ext>"`. Collision-avoidance edge cases were traced explicitly: user-supplied
  original filenames can never influence the generated name (`SaveUpload` discards
  `originalName` entirely — `_ = originalName` — and derives the on-disk name from
  `buildFilename(kind, ext)`, which mixes a `crypto/rand` 8-byte suffix into every filename),
  so "two originals with the same base name", "special characters", and "long names" are not
  reachable inputs to `displayVariantFileName` in practice; concurrent uploads to the same
  `fansub/<group_id>/` directory get independent random suffixes and therefore independent
  stems. `TestDisplayVariantFileNameIsUniquePerOriginal` covers the two real-world shapes
  (shared fansub-group directory vs. per-asset directory with a fixed `original.<ext>` stem)
  plus an explicit non-collision assertion for a banner and a gallery image in the same group
  folder.
- **BUG-174-03** (`useReleaseVersionMedia.ts`): the `git diff` against `dbf8680d..HEAD` shows
  the fix is a single, additive `useMemo` (`syncedStoryItems`) with no other code moved or
  changed. It re-projects every `storyItems` entry of `type: 'media'` onto the current `items`
  state by ID, dropping entries whose media no longer exists in `items` (deleted) and
  substituting the live object when it differs by reference (patched/replaced), while passing
  non-media (`kara`) entries through unchanged. Because `items` and `storyItems` are always
  set together inside the same render-phase update block on reload, and `syncedStoryItems` is
  a pure derivation with no `setState` call inside it, there is no risk of infinite
  update loops or stale-closure drift; the hook's own test file
  (`useReleaseVersionMedia.test.ts`) adds two new assertions ("entfernt ein geloeschtes
  Medium sofort auch aus der Galerie-Liste" / "zeigt eine Medienaenderung sofort auch in der
  Galerie-Liste") that call `deleteItem`/`patchItem` and assert directly on `result.current.storyItems`,
  genuinely exercising the derivation rather than asserting against a mock.

New findings, all quality/maintainability-class (no new BLOCKER):

### WR-02: A test this phase actively edited still reads its own target's source as a string instead of executing it

**File:** `backend/internal/services/release_version_media_cleanup_test.go:454-471` (`TestRVMPreviewAssignmentIsExclusive`)

**Issue:** This test does not call `PatchReleaseVersionMedia`, or any handler, or any
repository method. It opens `../handlers/admin_content_release_version_media_patch.go` with
`os.ReadFile`, converts it to a string, and asserts `strings.Contains(content,
"ClearPreviewCandidateForVersion")` plus `strings.Index(...) < strings.Index(...)` to "prove"
call order. This is precisely the pattern CLAUDE.md's Teststil-Regel forbids ("Das Lesen der
eigenen `.go`-Quelldatei eines Handlers per `os.ReadFile` und die Prüfung eines Substrings per
`strings.Contains` ... ohne den Code je aufzurufen und eine echte Response zu prüfen") and
that `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` (WR-02) already catalogues as an
Altlast spanning 49 files / 236 assertions across `handlers`, `repository`, and `services` —
this file is one more instance in the `services` package, not previously named in that note.

What makes this one relevant to Phase 174 specifically rather than just inherited debt:
`git diff dbf8680d..HEAD` shows Phase 174 *edited this exact test* — only to repoint the
`os.ReadFile` target from the pre-split monolith (`admin_content_release_version_media.go`)
to the new post-174-20-split file (`admin_content_release_version_media_patch.go`). The
review independently confirmed the repointed path is correct (the asserted
`ClearPreviewCandidateForVersion` call genuinely precedes `PatchReleaseVersionMedia(...)` in
the new file, so this is not a live D-03 regression today) — but the phase had the file open
for exactly this reason and left the underlying anti-pattern in place rather than converting
it to a real assertion, so the next split of this handler carries the same stale-pointer risk
173-174's own hotspot analysis warns about, with zero behavioral coverage in between.

**Fix:** Replace the source-text assertion with a real `httptest` call against
`PatchReleaseVersionMedia` using the package's existing fake/stub `mediaRepo`, asserting the
actual effect (a second preview candidate on the same version loses `is_preview_candidate`
after the patch) rather than source call order:
```go
func TestRVMPreviewAssignmentIsExclusive(t *testing.T) {
    // seed two media rows on the same version, one already is_preview_candidate=true
    // PATCH the second row with {"is_preview_candidate": true}
    // assert (via httptest response body or repo state) the FIRST row is no longer the preview
}
```

### WR-03: BUG-174-04's "keep review state" rule applies identically to metadata edits and full binary replacement, with no test proving the Replace-specific consequence

**File:** `backend/internal/handlers/admin_content_release_version_media_replace.go:421-449`

**Issue:** The root-cause note in `174-BUGS.md` for BUG-174-04 explicitly covers both
"bearbeiten/ersetzen" (edit/replace), and the fix is deliberately symmetric: a non-uploader
editor with "update all" rights (group/project lead) keeps the relation's current
`review_state` whether they only change a caption (Patch, no pixel content changes) or replace
the entire file's bytes (Replace, the exact artifact a reviewer evaluated). For Patch this is
clearly safe — metadata changes don't invalidate a prior image review. For Replace it is a
materially different claim: a project lead can swap an already-`accepted` release image for
completely different image content, and the relation keeps reporting `review_state: accepted`
against the new bytes, without ever re-entering the review queue, because `SubmitMedia` (the
only call that would reset it to pending) is gated by `isReleaseVersionMediaUploader` and
skipped entirely for this actor. Within the files reviewed here, this specific
scenario — non-uploader Replace on an already-reviewed relation — has no behavioral test
coverage; `admin_content_release_version_media_uploader_test.go` only unit-tests the pure
`isReleaseVersionMediaUploader(uploadedByUserID, actorLegacyUserID) bool` helper, not the
end-to-end review-state outcome of a Replace call. `174-BUGS.md` reports "65 grün" handler
tests for the surrounding file, but that file (`admin_content_release_version_media_replace_test.go`)
is outside this supplemental review's 11-file scope and was already flagged in the WR-02
Altlast note as using the same source-text-assertion pattern for this handler, so it is not
established that those 65 passing tests actually exercise this content-substitution path
end-to-end. This is distinct from the already-tracked F-14 (revision-conflict protection for
non-uploader edits) — this is about review-state integrity after a full content swap, not
optimistic-concurrency safety.

**Fix:** Add (or confirm the existence of) an integration test that: seeds a
`release_version_media` row with `review_state: 'accepted'` and `uploaded_by_user_id: A`,
calls `ReplaceReleaseVersionMediaFile` as actor `B` (holding update-all rights, `B != A`) with
a new file, and asserts the persisted `review_state` is unchanged post-replace. If that is
confirmed as intended (matching the documented "Nutzerentscheidung Option 1"), add an explicit
code comment at the call site noting that full binary replacement — not just metadata — is
deliberately exempt from re-review for update-all editors, since a future maintainer reading
only the BUG-174-04 title ("Leitung kann Titel/Beschreibung ... nicht speichern") could
reasonably assume the exemption was metadata-only.

## Info

### IN-02: Side-effecting call embedded in an `else if` condition reduces readability

**File:** `backend/internal/handlers/admin_content_release_version_media_replace.go:421-449`

**Issue:** The uploader gate is written as:
```go
if !isReleaseVersionMediaUploader(relationMeta.UploadedByUserID, identity.UserID) {
    // Edit by a non-uploader with update-all rights: keep the current review state (BUG-174-04).
} else if _, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
    ctx, repository.ReleaseReviewSubmissionInput{...},
); err != nil {
    ...
}
```
The first branch is an empty block that exists only to hold a comment; the actual `SubmitMedia`
call and its error handling live inside the `else if`'s condition and body. This is logically
correct (equivalent to `if isUploader { if err := ...; err != nil { ... } }`) but the control
flow reads backwards on first pass — a reviewer has to notice the branch is empty before
realizing the real work is in the "else" condition.

**Fix:**
```go
if isReleaseVersionMediaUploader(relationMeta.UploadedByUserID, identity.UserID) {
    if _, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
        ctx, repository.ReleaseReviewSubmissionInput{...},
    ); err != nil {
        ...
    }
}
// else: non-uploader edit by an update-all-rights actor keeps the current review state (BUG-174-04).
```

### IN-03: The "original.<ext> keeps a fixed display name" invariant is encoded twice, in two packages

**File:** `backend/internal/handlers/admin_content_release_version_media_replace_display.go:18-20` (`rvmReplaceDisplayPath`) vs. `backend/internal/services/media_service_display_variant.go:108-115` (`displayVariantFileName`)

**Issue:** Both functions implement the same rule — "a file whose original is named
`original.<ext>` gets a display file literally named `display.<ext>`" — but as two separate,
unexported implementations in two different packages. `rvmReplaceDisplayPath` is correct today
only because `ReplaceReleaseVersionMediaFile` always writes into a freshly-generated
`assetUUID` directory (so there is never more than one `original.<ext>` per directory, the same
invariant `displayVariantFileName`'s fallback branch assumes for per-asset directories). If a
future change ever made RVM reuse a directory across replaces — the exact class of change that
caused BUG-174-05 for fansub media — a maintainer fixing `displayVariantFileName` in the
`services` package could easily miss that `rvmReplaceDisplayPath` in `handlers` encodes the
identical assumption and needs the same fix.

**Fix:** Export `displayVariantFileName` from `services` (e.g. `services.DisplayVariantFileName`)
and have `rvmReplaceDisplayPath` delegate to it instead of hard-coding `"display."+ext`, so the
BUG-174-05 collision-avoidance logic has exactly one implementation:
```go
func rvmReplaceDisplayPath(assetDir string, originalExt string, displayExt string) string {
    return filepath.Join(assetDir, services.DisplayVariantFileName("original."+originalExt, displayExt))
}
```

### IN-04: BUG-174-01 regression coverage in `page.test.tsx` is implicit (non-hang) rather than an explicit assertion

**File:** `frontend/src/app/admin/fansubs/create/page.test.tsx:310-327` (`createGroupViaUI` and its callers, e.g. "save (Erfolg)")

**Issue:** BUG-174-01 ("Maximum update depth exceeded" infinite render loop on
`/admin/fansubs/create` after the first save) is not exercised by any assertion that checks a
render count or a stable busy-state transition. The tests in this file that call
`createGroupViaUI` (which creates a group then waits for the "Speichern" button, i.e. the point
at which the fixed media section mounts) only pass because the component no longer hangs; if
the no-op guard in `AdminFansubCreateMediaSection.tsx` were to regress to a *partial* fix
(e.g., a large-but-finite number of extra re-renders instead of a true infinite loop), these
tests would still pass, and a *full* regression would surface only as an opaque Vitest/jsdom
timeout on `await screen.findByRole(...)` rather than a readable assertion failure naming the
loop. `174-BUGS.md` itself notes this indirectly ("Nebenbefund: erklärt die 3 endlos
hängenden Klick-Tests aus dem ersten 174-09-Versuch").

**Fix:** Add a small, explicit regression test alongside the existing characterization suite
that renders `AdminFansubCreateMediaSection` (or the full page) with a wrapped
`onBusyChange`/render-count spy and asserts the call/render count stays bounded after the
group is created and the media section mounts, so a future partial regression fails with a
clear count-based message instead of relying on test-runner timeout behavior.

---

_Reviewed: 2026-10-06T13:44:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
