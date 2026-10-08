---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
reviewed: 2026-10-08T12:30:02Z
depth: standard
files_reviewed: 152
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_content_anime.go
  - backend/internal/handlers/admin_content_fansub_group_notes.go
  - backend/internal/handlers/admin_content_fansub_notes_test.go
  - backend/internal/handlers/admin_content_member_stories.go
  - backend/internal/handlers/admin_content_release_theme_assets.go
  - backend/internal/handlers/admin_content_release_version_media_patch.go
  - backend/internal/handlers/admin_content_release_version_media_replace_display.go
  - backend/internal/handlers/admin_content_release_version_media_replace.go
  - backend/internal/handlers/admin_content_release_version_media_test.go
  - backend/internal/handlers/app_auth.go
  - backend/internal/handlers/contribution_proposals_me_handler.go
  - backend/internal/handlers/contribution_proposals_me_test.go
  - backend/internal/handlers/contributions_me_handler.go
  - backend/internal/handlers/fansub_anime_contributions_handler.go
  - backend/internal/handlers/fansub_default_crew_handler.go
  - backend/internal/handlers/fansub_group_create_validation.go
  - backend/internal/handlers/fansub_group_create_validation_test.go
  - backend/internal/handlers/fansub_group_members.go
  - backend/internal/handlers/fansub_group_patch_validation.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/fansub_requests.go
  - backend/internal/handlers/fansub_test.go
  - backend/internal/handlers/member_claim_invitations_handler.go
  - backend/internal/handlers/member_claim_invitations_handler_test.go
  - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
  - backend/internal/handlers/segment_render_worker.go
  - backend/internal/handlers/segment_validation_test.go
  - backend/internal/middleware/comment_auth.go
  - backend/internal/models/admin_anime_themes.go
  - backend/internal/models/fansub.go
  - backend/internal/repository/admin_content_anime_segments_crud.go
  - backend/internal/repository/admin_content_anime_themes_core.go
  - backend/internal/repository/admin_content_theme_asset_locks_test.go
  - backend/internal/repository/authz_permissions_test.go
  - backend/internal/repository/episode_import_repository_release_autoassign.go
  - backend/internal/repository/fansub_group_notes_repository.go
  - backend/internal/repository/fansub_notes_repository_test.go
  - backend/internal/repository/fansub_repository_groups.go
  - backend/internal/repository/fansub_repository_public_profile.go
  - backend/internal/repository/group_repository_cursor_timeline.go
  - backend/internal/repository/hist_group_member_roles_assignable_test.go
  - backend/internal/repository/hist_group_member_roles_repository.go
  - backend/internal/repository/member_claim_invitations_repository.go
  - backend/internal/repository/member_claims_memorial_guard_test.go
  - backend/internal/repository/member_claims_submit_repository.go
  - backend/internal/repository/member_group_stories_repository.go
  - backend/internal/repository/member_group_story_context_repository.go
  - backend/internal/repository/memorial_guard.go
  - backend/internal/repository/phase176_fansub_create_kuerzel_test.go
  - backend/internal/repository/release_crew_snapshot_repository.go
  - backend/internal/repository/release_crew_snapshot_repository_test.go
  - backend/internal/repository/release_detail_public_repository_helpers.go
  - backend/internal/repository/release_review_lifecycle_revision_guard.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/repository/release_version_notes_repository.go
  - backend/internal/repository/segment_playback_resolution_test.go
  - backend/internal/repository/theme_segment_assignment_slots.go
  - backend/internal/repository/theme_segment_assignment_slots_outro_kuerzel_integration_test.go
  - backend/internal/repository/theme_segment_type.go
  - backend/internal/services/media_service_display_filename_test.go
  - backend/internal/services/media_service_display_variant.go
  - backend/internal/services/release_review_submission_test.go
  - backend/internal/services/release_version_media_cleanup_test.go
  - backend/internal/services/review_service_test.go
  - backend/internal/testsupport/phase107_postgres.go
  - backend/internal/testsupport/phase117_postgres.go
  - database/migrations/0178_drop_member_group_stories.down.sql
  - database/migrations/0178_drop_member_group_stories.up.sql
  - database/migrations/0179_theme_types_kuerzel.down.sql
  - database/migrations/0179_theme_types_kuerzel.up.sql
  - database/migrations/0180_drop_anime_contributions_review_status_id.down.sql
  - database/migrations/0180_drop_anime_contributions_review_status_id.up.sql
  - frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
  - frontend/src/app/admin/anime/create/page.test.tsx
  - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.assignment-conflicts.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentPreviewImageSection.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.test.ts
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx
  - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts
  - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
  - frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx
  - frontend/src/app/admin/fansubs/create/page.test.tsx
  - frontend/src/app/admin/fansubs/create/page.tsx
  - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts
  - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteForm.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.test.ts
  - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormatters.ts
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts
  - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditGroupLoad.ts
  - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts
  - frontend/src/app/admin/fansubs/page.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
  - frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
  - frontend/src/components/admin/FansubGroupKuerzelField.tsx
  - frontend/src/components/contributions/contributionRoles.ts
  - frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx
  - frontend/src/lib/api/admin-anime-intake.ts
  - frontend/src/lib/api.auth-refresh.test.ts
  - frontend/src/lib/api.fansubNotes.test.ts
  - frontend/src/lib/api/fansubs-members.ts
  - frontend/src/lib/api/history.ts
  - frontend/src/lib/cssCustomProperties.guard.test.ts
  - frontend/src/lib/fansub-labels.ts
  - frontend/src/lib/__tests__/fansub-labels.test.ts
  - frontend/src/types/admin.ts
  - frontend/src/types/fansubNotes.ts
  - frontend/src/types/fansub.ts
  - shared/contracts/admin-content.yaml
  - shared/contracts/fansubs.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 176: Code Review Report

**Reviewed:** 2026-10-08T12:30:02Z
**Depth:** standard
**Files Reviewed:** 152
**Status:** issues_found

## Summary

Phase 176 is a large bug/Altlasten collection phase (15 plans + 5 user-authorized scope
additions) spanning backend handler/repository changes (role-assignability enforcement,
memorial-claim guard consolidation, project_lead crew-snapshot scoping, Outro-gets-its-own-slot
segment classification via `theme_types.kuerzel`), two DB migrations (drop
`member_group_stories`, add `theme_types.kuerzel`), and a large frontend sweep (fansub
create/edit page cleanup, Proxy-based CSS-module merging, dead-code removal of the
Member-Group-Story surface).

I traced every diff against `4e9d891e..HEAD` (63 commits) rather than trusting the commit
messages' own "fixed"/"closed" claims, and cross-checked removed backend surfaces
(`DeleteFansubMember`, `member_group_stories`, `group_type`) against both route registration
and frontend callers to confirm no dangling references remain. I also re-derived the
`theme_types` row IDs that migration 0179 hardcodes from the historical migration chain
(0044 → 0048 → 0050) to verify the mapping is actually correct for a Team4s environment that
ran every migration in order, and verified the new optimistic-concurrency guard
(`CheckMediaRevisionConflict`) commits/rolls back correctly inside the existing
`PatchReleaseVersionMedia` transaction.

No BLOCKER-level defects were found: the removed backend surfaces are fully dereferenced,
the new permission/validation checks (`RoleCodeIsAssignableForContext`,
`checkMemorialNotClaimable`, `CanAcceptInvitation` gate, Kürzel uniqueness) are consistently
wired on both the create and update paths, and the Outro/ED segment-slot fix is applied
uniformly across all four read paths that classify segment type (admin segment CRUD, public
project timeline, public release detail, auto-assign-on-new-release-version). The findings
below are WARNING/INFO-level robustness, data-fragility, and consistency gaps.

## Warnings

### WR-01: `theme_types.kuerzel` backfill keys on hardcoded row IDs, not names

**File:** `database/migrations/0179_theme_types_kuerzel.up.sql:9-12`
**Issue:** The migration assigns `kuerzel` by literal primary key (`WHERE id = 4`, `= 6`, `= 8`,
`= 9`) instead of by `name` (`'OP'`, `'ED'`, `'Insert'`, `'Outro'`). I reconstructed the
migration history (0044 seeds `opening/ending/insert_song` → 0048 deletes those and inserts
`OP1/OP2/ED1/ED2/Insert/Outro` → 0050 deletes `OP2/ED2` and renames `OP1→OP`/`ED1→ED`) and the
IDs do line up for an environment that applied every migration in the documented order with no
manual intervention. But this is a sequence-counter assumption baked into a data migration with
no defensive check: if any environment's `theme_types` table ever diverges from this exact
history (a manually reseeded dev/staging DB, a future out-of-order migration replay, or a
future `theme_types` row inserted with a different ID before 0179 runs), the `kuerzel` values
silently land on the wrong rows and `CanonicalSegmentTypeFromKuerzel` will misclassify segments
with no error — which is the exact class of bug (`Outro` colliding with `ED`) this phase set
out to fix in the first place, just moved into data instead of code.
**Fix:** Key the `UPDATE` on `name` instead of `id`, e.g. `UPDATE theme_types SET kuerzel = 'OP'
WHERE name = 'OP'; ... SET kuerzel = 'OUT' WHERE name = 'Outro';`. This is resilient to ID drift
and self-documents the intended mapping without requiring a change-history archaeology to
verify.

### WR-02: Non-uploader metadata edit silently skips the revision guard when `source_revision` is omitted

**File:** `backend/internal/handlers/admin_content_release_version_media_patch.go:243-246`
**Issue:** `CheckMediaRevisionConflict` treats `expectedRevision == nil` as a no-op by design
(matches `SubmitMedia`'s existing contract), but combined with BUG-174-04's decision to route
non-uploader edits away from `SubmitMedia` entirely, this means a non-uploader client that
simply never sends `source_revision` in its PATCH body gets zero optimistic-concurrency
protection — not just "the same protection as before", but silently none, with no warning
surfaced anywhere. Since the frontend client controls whether `source_revision` is sent, this
guard is effectively opt-in per request rather than enforced server-side.
**Fix:** If the project wants an actual hard guarantee (not just "closes the gap for clients
that already send `source_revision`"), consider making `source_revision` required on
metadata-mutating PATCH requests once the frontend is updated to always send it, or at minimum
document in the OpenAPI contract that omitting `source_revision` forfeits conflict detection.

### WR-03: `FansubRepository.DeleteMember` is now dead code after route removal

**File:** `backend/internal/repository/fansub_repository_members.go:171`
**Issue:** D-19 (commit `d24417c2`) removed the unguarded `DELETE
/fansubs/:id/members/:memberId` route and its handler (`FansubHandler.DeleteFansubMember`), and
I confirmed no remaining caller references `DeleteFansubMember`. However, the repository method
`FansubRepository.DeleteMember` that handler called is still present and now has zero
production callers (only test files reference it, if any).
**Fix:** Remove `DeleteMember` from `fansub_repository_groups.go`/`fansub_repository_members.go`
in a follow-up cleanup pass, or confirm via grep that a test still needs it and leave a comment
explaining why it's kept.

### WR-04: Native `<button>` left in a page this phase explicitly migrated to `@/components/ui` primitives

**File:** `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx:112-124`
**Issue:** Commit `798805e1` ("migrate fansub create page's 9 native fields to
`@/components/ui` primitives (D-04)") converted `Name`/`Slug`/`Status`/`Land`/year inputs to
`Input`/`Select`/`YearPicker`, but the adjacent "Auto" slug-regeneration button stayed a raw
`<button type="button" className={styles.buttonSecondary}>`. CLAUDE.md's design-system rule is
explicit that hand-built native `<button>` markup is forbidden wherever `@/components/ui`
already offers the primitive ("Verboten: Handgebaute native `<select>/<input>/<textarea>/
<button>` ... Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen"), and this file is the one
the phase's own commit message claims fully migrated. (The same pattern — native `<button>` for
Bearbeiten/Löschen actions — also persists in `NotesTab.helpers.tsx`, pre-existing and out of
this commit's stated scope, but worth flagging together since it's the same rule.)
**Fix:** Replace with `<Button type="button" variant="secondary" onClick={...}>Auto</Button>`
to match the rest of the now-migrated section.

### WR-05: `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase` mutates a shared package-level permission cache

**File:** `backend/internal/repository/authz_permissions_test.go:195-197`
**Issue:** The new call `permissions.NewService(nil).LoadCache(ctx, authzRepositoryReviewCapabilityCacheLoaderStub{})`
replaces `permissions`' single package-level `loadedCache` variable for the entire
`repository` test binary, not just this test. The test's own comment acknowledges this is
fragile ("omitting a grant another already-passing test ... depends on ... silently breaks
that unrelated test the moment this stub runs first") and works around it by manually
enumerating every action another specific test file needs. This is a pre-existing pattern in
this codebase (`review_service_test.go`'s `reviewServiceCacheLoaderStub`), but every new test
that follows it adds another coupling point between unrelated test files via shared mutable
global state, and a future test added to this package without reading this comment can
reintroduce flakiness that only reproduces based on Go test ordering.
**Fix:** No immediate action required (consistent with existing precedent), but consider a
follow-up to give `permissions.Service` an injectable/non-global cache for tests, removing the
cross-test-file coupling at its root instead of enumerating it away test-by-test.

### WR-06: `member_group_stories` DOWN migration recreates the table, but no production code can write to it if rolled back

**File:** `database/migrations/0178_drop_member_group_stories.down.sql:1-35`
**Issue:** This is a correctness nit on the rollback path, not the forward path: the down
migration faithfully recreates the exact pre-drop schema, but since the entire backend handler
surface (`admin_content_member_stories.go`), repository (`member_group_stories_repository.go`,
`member_group_story_context_repository.go`), and frontend API/UI surface were deleted in the
same phase (commits `a272acdc`/`e7481732`), rolling back this one migration without also
reverting those code commits leaves a schema-only table with zero code path able to read or
write it. This is expected for an intentional Altlast removal, but it means "migrate down" on
this one file alone is not actually a usable rollback in isolation — worth a one-line note in
the down migration itself (not just in code commit messages) for whoever next has to use `migrate
down` under time pressure.
**Fix:** Optional: add a comment to the `.down.sql` header noting it must be paired with
reverting `a272acdc`/`e7481732` to be functionally useful, not just schema-reversible.

## Info

### IN-01: `segmentAssignmentSlotType`'s Outro CSS class still named `badgePv`

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx:28-29`
**Issue:** `getTypeBadgeClass('OUT')` returns `styles.badgePv` — a CSS class whose name still
reflects the pre-fix "PV" vocabulary that `getTypeBadgeLabel`/`isUpperSpur` already moved away
from in this same commit. Purely a naming leftover (the rendered badge text is correctly "OUT"
via `getTypeBadgeLabel`), not a behavioral bug.
**Fix:** Rename the CSS class to `badgeOut` in `SegmenteTab.module.css` and its one reference,
for consistency with the rest of the kuerzel-driven rename.

### IN-02: `fansub_notes_repository_test.go` keeps a source-grep assertion for the surviving group-note path

**File:** `backend/internal/repository/fansub_notes_repository_test.go:9-21`
**Issue:** Commit `e7481732` removed the `member_group_stories`-specific
`os.ReadFile`/`strings.Contains` assertions from this file (a real improvement, consistent with
the phase's own Teststil remediation work elsewhere), but left the pre-existing
`os.ReadFile("fansub_group_notes_repository.go")` + `strings.Contains(...)` source-grep
assertion for the group-note path completely untouched. CLAUDE.md explicitly calls this pattern
out as forbidden-to-extend "Altlast" (49 files/236 assertions) that should not be used as a
model going forward, though it does not require this phase to fix every pre-existing instance
it touches.
**Fix:** Out of this phase's stated scope (D-09/176-12 targeted specific named files), but
since this file was already being edited for the adjacent removal, converting the remaining
assertion to a real `httptest` call (as 176-12 did for `admin_content_fansub_notes_test.go` and
`admin_content_theme_asset_locks_test.go` in the same phase) would have been a natural,
low-cost extension.

### IN-03: `RoleCodeExistsForContext` is now unused by any of the three call sites touched in this phase

**File:** `backend/internal/repository/hist_group_member_roles_repository.go:300-328` (existing
method, unchanged by this phase)
**Issue:** `fansub_anime_contributions_handler.go`, `fansub_default_crew_handler.go`, and
`contribution_proposals_me_handler.go` were all switched from `RoleCodeExistsForContext` to the
new `RoleCodeIsAssignableForContext` in this phase. I did not find any remaining production
caller of `RoleCodeExistsForContext` in the reviewed file set (only test coverage), though I
did not exhaustively grep the entire `handlers`/`repository` packages outside the files listed
for this review, so this may have callers elsewhere untouched by this phase.
**Fix:** If confirmed unused repo-wide, remove `RoleCodeExistsForContext` or document why it is
intentionally kept as a narrower existence-only check distinct from the new
assignability-aware method.

---

_Reviewed: 2026-10-08T12:30:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
