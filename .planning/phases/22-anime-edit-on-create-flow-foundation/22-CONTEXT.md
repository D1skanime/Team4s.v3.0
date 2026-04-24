# Phase 22: Anime Edit On Create-Flow Foundation - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Post-Phase-21 product discussion plus local codebase review of current create/edit routes

<domain>

## Phase Boundary

The anime create route is now the modern admin intake surface: step-based, asset-aware, and already aligned with the Phase-17 product model. The anime edit route is not on that same foundation. It still uses an older workspace with different structure, separate logic seams, and a noticeably different operator experience.

The product direction for this phase is to stop treating edit as a parallel UI product. Instead, edit should reuse the create-flow design and most of its interaction model, while preserving the rules that differ for an existing anime record.

This phase is about replacing the stale edit experience with a shared create/edit foundation. It is not a redesign of episode management, a full admin navigation overhaul, or a broad metadata model change beyond what is needed to support the modernized edit route.

</domain>

<decisions>

## Locked Product Decisions

### Edit Should Reuse The Create-Flow Foundation
- The current anime edit UI is considered stale and too different from create.
- The preferred direction is to replace that divergent UI with the same design and interaction foundation used by `/admin/anime/create`.
- This should be done through shared components and logic, not by maintaining two separate implementations that happen to look similar.

### AniSearch Identity Is Fixed Once Linked
- If an anime already has an AniSearch ID linked, that identity should remain visible in edit but not freely rewritable.
- Edit may explain that AniSearch identity is already anchored, but it should not encourage accidental remapping of the anime to a different AniSearch record.

### Jellyfin Linkage Stays Operator-Controlled And Re-Syncable
- Jellyfin can still be re-searched, relinked, or re-synced from edit.
- That action should be explicit and operator-driven.
- Jellyfin follow-up must not silently overwrite manual values or manually curated assets.

### Existing Anime Data Must Load Into The Shared Surface
- Edit should open with the existing anime values already filled into the create-style workspace.
- Operators should be able to review and update basis data, genres, tags, description, and assets in one coherent surface rather than bouncing across old cards.

### Legacy Edit-Only Form Structure Should Be Removed
- The old standalone edit workspace should not remain as the primary long-term path.
- After the shared surface is live, legacy edit-only UI layers should be removed or collapsed into thin wrappers so create and edit cannot drift again.

## the agent's Discretion

- Exact component extraction boundaries between shared create/edit building blocks and route-specific wrappers.
- Whether the shared foundation is named `AnimeEditorWorkspace`, `AnimeFormWorkspace`, or another clear name.
- Whether some edit-only context blocks remain around the shared form, as long as the main editable surface is the shared foundation and not the old layout.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Modern Create Flow
- `frontend/src/app/admin/anime/create/page.tsx` - current create-page structure, step layout, and section ordering
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - create controller orchestration and source actions
- `frontend/src/app/admin/anime/create/createPageHelpers.ts` - create payload assembly, redirect rules, and Jellyfin/AniSearch helper behavior
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` - current AniSearch create interaction model
- `frontend/src/app/admin/anime/create/CreateJellyfinCard.tsx` - current Jellyfin search/adopt surface
- `frontend/src/app/admin/anime/create/CreateAssetSection.tsx` - current shared asset review area
- `frontend/src/app/admin/anime/create/CreateReviewSection.tsx` - current final review/submit surface

### Existing Edit Flow To Replace
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` - edit route entry point
- `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx` - current edit page shell and Jellyfin sync panel placement
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - stale standalone edit workspace to be replaced
- `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx` - current edit-only AniSearch section
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` - current edit-only genre surface

### Shared Draft And Patch Logic
- `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts` - create-side draft hydration and field ownership rules
- `frontend/src/app/admin/anime/hooks/useAnimePatch.ts` - edit-side persistence seam
- `frontend/src/app/admin/anime/hooks/useAnimeEditor.ts` - shared editor-shell action model
- `frontend/src/app/admin/anime/hooks/useJellyfinSync.ts` - current edit-side Jellyfin sync action model
- `frontend/src/types/admin.ts` - admin draft/edit payload types
- `backend/internal/handlers/admin_content_anime.go` - create and patch anime write seams

### Planning Baseline
- `.planning/ROADMAP.md` - Phase 22 goal and success criteria
- `.planning/STATE.md` - current project decisions and active direction
- `.planning/phases/17-anime-create-ux-ui-follow-through/17-05-PLAN.md` - finalized create UX follow-through intent

</canonical_refs>

<specifics>

## Specific Ideas

### Preferred UX Shape
- Edit should feel almost the same as create.
- The operator should see the same high-level sections: source/context, assets, details, and final save/review.
- Existing values should be prefilled instead of starting from a blank draft.

### AniSearch And Jellyfin Difference
- AniSearch behaves as fixed identity once linked.
- Jellyfin behaves as a reconnectable source with explicit search/resync actions.
- That difference should be visible in the UI and in the saved contract.

### Replace Instead Of Patching The Old Edit Screen
- The current edit screen already proved it can drift from create.
- The safer long-term product move is to treat it as legacy, then rebuild edit on the same foundation as create rather than continuing to enhance the old structure.

</specifics>

<deferred>

## Deferred Ideas

- Episode/version editing redesign
- New relation-management UX beyond what already exists
- Broad admin information architecture cleanup outside the anime edit route

</deferred>

---

*Phase: 22-anime-edit-on-create-flow-foundation*
*Context gathered: 2026-04-23 from product discussion and local code review*
