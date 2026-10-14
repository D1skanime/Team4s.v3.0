---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
reviewed: 2026-10-13T00:00:00Z
depth: standard
files_reviewed: 102
files_reviewed_list:
  - backend/internal/handlers/contributions_me_project_handler.go
  - backend/internal/handlers/contributions_me_project_handler_test.go
  - backend/internal/repository/anime_contributions_member_project_repository.go
  - backend/internal/repository/anime_contributions_member_project_repository_sentinel_test.go
  - frontend/next.config.mjs
  - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx
  - frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.test.tsx
  - frontend/src/app/admin/users/tabs/UserMediaTab.tsx
  - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
  - frontend/src/app/me/dashboard/components/attentionHelpers.ts
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/releases/[versionId]/edit/episodeNeighborNavigation.test.ts
  - frontend/src/app/releases/[versionId]/edit/episodeNeighborNavigation.ts
  - frontend/src/app/releases/[versionId]/edit/page.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorChangelogTab.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.test.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.test.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.module.css
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.test.tsx
  - frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx
  - frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.test.ts
  - frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts
  - frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.test.ts
  - frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts
  - frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.test.ts
  - frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.ts
  - frontend/src/app/releases/[versionId]/edit/useProjectNeighborNavigation.test.ts
  - frontend/src/app/releases/[versionId]/edit/useProjectNeighborNavigation.ts
  - frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.test.tsx
  - frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.ts
  - frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.test.ts
  - frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/contributions/ContributionCard.test.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx
  - frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx
  - frontend/src/components/releaseEditor/EpisodeClassificationSection.module.css
  - frontend/src/components/releaseEditor/EpisodeClassificationSection.tsx
  - frontend/src/components/releaseEditor/episodeVersionEditorUtils.test.ts
  - frontend/src/components/releaseEditor/episodeVersionEditorUtils.ts
  - frontend/src/components/releaseEditor/JellyfinEnrichmentNotice.module.css
  - frontend/src/components/releaseEditor/JellyfinEnrichmentNotice.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaEditDrawer.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaGrid.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaReplaceControls.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.helpers.test.ts
  - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.helpers.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.module.css
  - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.test.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaUploadDrawer.test.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMediaUploadDrawer.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionMetadataFields.module.css
  - frontend/src/components/releaseEditor/ReleaseVersionMetadataFields.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.module.css
  - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.test.tsx
  - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.tsx
  - frontend/src/components/releaseEditor/SegmentAssetSection.tsx
  - frontend/src/components/releaseEditor/SegmentAssignmentsRow.tsx
  - frontend/src/components/releaseEditor/SegmentBasicFieldsSection.tsx
  - frontend/src/components/releaseEditor/SegmentContributorsField.tsx
  - frontend/src/components/releaseEditor/SegmentEditPanel.tsx
  - frontend/src/components/releaseEditor/SegmenteTab.assignment-conflicts.test.tsx
  - frontend/src/components/releaseEditor/SegmenteTab.formHelpers.ts
  - frontend/src/components/releaseEditor/SegmenteTab.helpers.tsx
  - frontend/src/components/releaseEditor/SegmenteTab.module.css
  - frontend/src/components/releaseEditor/SegmenteTab.test.tsx
  - frontend/src/components/releaseEditor/SegmenteTab.tsx
  - frontend/src/components/releaseEditor/SegmentOverrideField.tsx
  - frontend/src/components/releaseEditor/SegmentPlaybackPreviewSection.tsx
  - frontend/src/components/releaseEditor/SegmentPreviewImagePicker.tsx
  - frontend/src/components/releaseEditor/SegmentPreviewImageSection.module.css
  - frontend/src/components/releaseEditor/SegmentPreviewImageSection.test.tsx
  - frontend/src/components/releaseEditor/SegmentPreviewImageSection.tsx
  - frontend/src/components/releaseEditor/SegmentsListSection.tsx
  - frontend/src/components/releaseEditor/useReleaseSegments.ts
  - frontend/src/components/releaseEditor/useReleaseVersionMedia.test.ts
  - frontend/src/components/releaseEditor/useReleaseVersionMedia.ts
  - frontend/src/components/releaseEditor/useSegmentAssetHandlers.ts
  - frontend/src/components/releaseEditor/useSegmentContributors.ts
  - frontend/src/components/releaseEditor/useSegmentPreviewImageHandlers.test.ts
  - frontend/src/components/releaseEditor/useSegmentPreviewImageHandlers.ts
  - frontend/src/components/ui/AdjacentNavigation.module.css
  - frontend/src/components/ui/AdjacentNavigation.test.tsx
  - frontend/src/components/ui/AdjacentNavigation.tsx
  - frontend/src/lib/releaseEditorRedirects.d.mts
  - frontend/src/lib/releaseEditorRedirects.mjs
  - frontend/src/lib/releaseEditorRedirects.test.ts
  - shared/contracts/contributions.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 181: Code Review Report

**Reviewed:** 2026-10-13
**Depth:** standard
**Files Reviewed:** 102
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Phase 181 merges the admin-only release editor (`/admin/episode-versions/:id/edit`) and the
member-workspace release editor (`/me/releases/:id/workspace`) into a single rights-based page at
`/releases/:id/edit`, relocates the shared tab content to `components/releaseEditor/`, repoints 11
external entry points, and activates permanent redirects for the two retired routes. It also ships
an unrelated, narrowly-scoped backend fix (D-05: `GetMemberProjectDetail` now uses `LEFT JOIN
own_roles` so a platform admin with no verified `member_claims` row gets a graceful 200 instead of
a 404).

The mechanical parts of the merge are solid: the redirect module, the tab-visibility matrix
(`buildReleaseEditorTabIds`), the routing/return-path allowlist (`getSafeReturnPath`), the
navigation-context facade (`useReleaseEditorNavigation`), and the relocated media/segments/notes
components all carry correct, consistent import paths and well-targeted tests. The D-05 backend
fix is minimal, exactly targeted (one `JOIN` → `LEFT JOIN`), and backed by both a handler-level and
a repository-level regression test that would have caught the original bug.

The one genuine BLOCKER is in `ReleaseEditorPage.tsx`: the "Member-Profil fehlt" error banner was
carried over verbatim from the old member-only workspace page without adding the `isPlatformAdmin`
exception that the rest of the page's capability model already uses everywhere else. As a result,
a platform admin who has no member profile — precisely the scenario this phase's own D-05 backend
fix was built to support gracefully — will see an incorrect "your notes aren't available" error
banner on every release edit page, even though the Notes tab works correctly for them.

## Critical Issues

### CR-01: "Member-Profil fehlt" error banner ignores `isPlatformAdmin`, contradicting this phase's own D-05 graceful-degradation goal

**File:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx:377-382`

**Issue:** The banner that explains why Notes aren't available is rendered with:

```tsx
{capabilities.can_edit_notes && memberId == null ? (
  <ErrorState
    title="Member-Profil fehlt"
    description="Notizen sind erst verfügbar, wenn dein App-Profil mit einem Member-Profil verknüpft ist."
  />
) : null}
```

This condition was ported verbatim from the old `/me/releases/:id/workspace` page
(`capabilities.can_edit_notes && memberId == null`, see `0bda3021^:.../workspace/page.tsx:433`),
where it was correct because that page was *only* ever reached by non-admin members. In the merged
page, the same condition is now evaluated for platform admins too. The platform-admin capability
model elsewhere in this exact file always treats `isPlatformAdmin` as a bypass — notably:

- `canUseNotes = capabilities != null && capabilities.can_edit_notes && memberId != null` (no
  `isPlatformAdmin` override — by design, since `buildReleaseEditorTabIds` already does
  `isPlatformAdmin || canUseNotes` for tab visibility), and
- the Notes tab content itself is rendered for admins via
  `<ReleaseVersionNotesTab versionId={version.id} memberIdFilter={isPlatformAdmin ? null : memberId} />`,
  which works correctly for an admin with `memberId == null` (it shows all members' notes).

`GetReleaseVersionCapabilities` (`backend/internal/handlers/admin_content_release_version_media_capabilities.go`)
computes `can_edit_notes` via the generic permission service (`ActionReleaseVersionNotesWrite`),
which is expected to allow platform admins unconditionally regardless of their own member profile
— i.e. exactly the `can_edit_notes=true && memberId==null` combination this phase's D-05 fix was
built to support. The banner therefore fires for the very user this phase set out to support
gracefully, telling them notes are unavailable immediately below a fully functional Notes tab.

**Fix:** Mirror the `isPlatformAdmin` bypass used everywhere else on this page:

```tsx
{!isPlatformAdmin && capabilities.can_edit_notes && memberId == null ? (
  <ErrorState
    title="Member-Profil fehlt"
    description="Notizen sind erst verfügbar, wenn dein App-Profil mit einem Member-Profil verknüpft ist."
  />
) : null}
```

Add a regression test to `ReleaseEditorPage.test.tsx` asserting the banner does NOT render for a
platform admin with `getOwnProfile` returning `member_id <= 0` (the exact D-05 scenario), since no
existing test in this phase covers this combination for the admin case.

## Warnings

### WR-01: `scopeGeneration` ref is written but never read — the "generation guard" claimed in the comment does not exist

**File:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx:55,65-69,74,92`

**Issue:** The scope-loading effect is introduced with the comment:

> "Own generation-guarded Promise.all for admin/contributor scope data, mirroring
> workspace/page.tsx:64,86-122 -- independent of useReleaseEditorData's internal race guard..."

and declares `const scopeGeneration = useRef(0)`, incrementing it on each effect run and on
cleanup. However, `scopeGeneration.current` is never read or compared anywhere in the file — the
only actual race protection is the local `cancelled` closure variable inside the effect. The ref is
dead state: it does nothing, despite the comment explicitly claiming it provides
"generation"-based guarding independent of the `cancelled` flag. This is misleading for future
maintainers who may rely on the comment's claim (e.g. when adding a new async branch inside the
same effect and assuming `scopeGeneration` already protects it).

**Fix:** Either remove the unused ref and correct the comment to describe the actual (and
sufficient) `cancelled`-based guard, or — if a true generation guard is actually wanted (e.g. to
let a stale in-flight request's `.then()` detect it's not the latest request even after a
remount/cleanup/re-mount cycle that `cancelled` alone can't distinguish) — actually compare a
captured generation number inside the `.then()`/`.catch()` callbacks, e.g.:

```tsx
const generation = ++scopeGeneration.current
void Promise.all([...]).then((...) => {
  if (generation !== scopeGeneration.current) return
  ...
})
```

### WR-02: Episode-context breadcrumb/back-navigation hardcodes platform-admin-only routes, reachable by non-admin contributors

**File:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx:174-184,240,317-319`

**Issue:** When `isEpisodeContext` is true, the breadcrumb always links "Anime" to `/admin/anime`,
and `animeTitleHref` resolves to `/admin/anime/${animeId}/edit` — both platform-admin-only pages.
`isEpisodeContext` is reachable not only by platform admins but also by non-admin fansub-group
leads who have `can_view_releases` (via `/admin/fansubs/:id/edit?tab=releases`, which a non-admin
can legitimately access per `fansubEditAccess.ts`'s `canUseMainTab('releases', ...)`), since
`resolveNavigationContext` treats any `return_to` matching `/^\/admin\/fansubs\/\d+\/edit$/` as
`'episode'` context. For such a non-admin user, the computed `backHref` correctly falls back to
`safeReturnTo` (their own accessible fansub page), but the **breadcrumb** "Anime" link and the
anime-title link both still point at `/admin/anime` / `/admin/anime/:id/edit`, which this user
cannot open.

This defect pre-dates phase 181 (the old admin-only `EpisodeVersionEditorPage.tsx` had the exact
same unconditional `<Link href="/admin/anime">Anime</Link>`), but it was effectively harmless there
because, at the time, non-admin contributors were a secondary, less-traveled path through that
page. Phase 181 explicitly re-platforms this page as "the one rights-based release edit page" for
both audiences, which was the natural point to close this gap — it does not.

**Fix:** Gate the breadcrumb "Anime" link (and `animeTitleHref`) on `isPlatformAdmin` the same way
the rest of the page does, e.g. render a non-link breadcrumb crumb (or point at `safeReturnTo` /
the fansub group page) when `isEpisodeContext && !isPlatformAdmin`.

### WR-03: `ReleaseEditorFilesTab.tsx`'s "Advanced Mode" uses a native `<details>/<summary>` instead of the `Accordion` UI primitive

**File:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx:76-97`

**Issue:** This file was explicitly reauthored in this phase ("Dateien-Tab primitive-konform
portiert", commit `5f9d62fe`) to move native form chrome onto `@/components/ui` primitives, and it
does so correctly for `Button`/`Input`/`FormField`. The collapsible "Advanced Mode: manuelle
Media-Override" section, however, still uses a raw `<details>`/`<summary>` pair even though
`@/components/ui` already ships an `Accordion` primitive (`frontend/src/components/ui/Accordion.tsx`)
purpose-built for exactly this toggle-a-panel interaction, with matching `aria-expanded`/
`aria-controls` wiring. The project's global-UI-system rule's enumerated native elements
(`select`/`input`/`textarea`/`button`) don't literally name `details`, but the intent of "use the
existing primitive instead of hand-rolled native markup" clearly applies here, and this is a newly
authored piece of UI in this exact phase.

**Fix:** Replace the `<details>` block with `<Accordion items={[{ id: 'advanced', title: 'Advanced Mode: manuelle Media-Override', children: <>...</> }]} openIds=... onOpenChange=... />`,
wiring `editor.advancedMode`/`editor.setAdvancedMode` through `openIds`/`onOpenChange`.

## Info

### IN-01: "Ungespeicherte Änderungen" badge is suppressed for non-admin contributors even though they can also leave the metadata form dirty

**File:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx:348`

**Issue:** `{isPlatformAdmin && editor.hasUnsavedChanges ? <Badge variant="warning">Ungespeicherte Änderungen</Badge> : null}`
gates the dirty-state badge on `isPlatformAdmin`, but `editor.hasUnsavedChanges` is computed from
the same `useReleaseEditorData()` form state that a non-admin contributor with `canEditMetadata`
also edits via `ReleaseEditorMetadataTab`. A non-admin who edits the Basisdaten form and navigates
away without saving gets no visual cue that changes are pending, while an admin editing the
identical form does. This is a minor UX inconsistency rather than a functional bug (there is no
`beforeunload`/navigation guard anywhere tied to `hasUnsavedChanges` either way), so it is not
blocking, but it's an easy one-line fix: drop the `isPlatformAdmin &&` gate (the badge's underlying
state is already role-agnostic).

---

## Addendum: Fixes Applied (orchestrator, 2026-10-13)

- **CR-01 (fixed, commit `3b07cc62`):** Added the `!isPlatformAdmin` bypass to the "Member-Profil
  fehlt" banner condition in `ReleaseEditorPage.tsx`. Added a regression test
  (`ReleaseEditorPage.test.tsx` — "zeigt den 'Member-Profil fehlt'-Banner nicht fuer einen
  Plattform-Admin ohne Member-Profil") asserting the banner does not render for a platform admin
  with `member_id <= 0`.
- **WR-03 (fixed, commit `69fbff96`):** Replaced the native `<details>/<summary>` in
  `ReleaseEditorFilesTab.tsx` with the `@/components/ui` `Accordion` primitive (controlled via
  `openIds`/`onOpenChange`, mapped to `editor.advancedMode`/`editor.setAdvancedMode`). Updated the
  corresponding test to toggle via the accordion header instead of the native `toggle` event.
- **WR-01, WR-02, IN-01 (left open, not fixed in this pass):** These are real but lower-severity
  findings that either pre-date phase 181 (WR-02) or require a judgment call beyond the plan's
  confirmed scope (WR-01's dead ref, IN-01's badge visibility for non-admins). Flagged for the user
  as follow-up items rather than fixed unilaterally.
- Full verification after fixes: `tsc --noEmit` clean, targeted + full `npm test` 389/390 files /
  3526 tests green (incl. the 1 new regression test), `eslint` clean on all 4 touched files.

---

_Reviewed: 2026-10-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
