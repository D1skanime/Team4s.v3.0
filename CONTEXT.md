# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 22 - Anime Edit On Create-Flow Foundation`

## Current State

### What Finished In This Pass
- Phase 21 is fully UAT-complete.
- Anime edit was pulled onto the shared create-style workspace instead of leaving the old edit UI in place.
- The edit route now uses simpler Jellyfin reselection, create-style metadata sections, and a cleaner review/save surface.
- Edit asset rendering now merges Jellyfin fallback assets with manual uploads instead of hiding one side.
- Individual Jellyfin assets can now be dismissed in edit without dropping the whole Jellyfin linkage.
- The episode-version delete path now has a real backend implementation and no longer fails with a deferred `500`.
- The default fansub admin list now hides collaboration records so only real groups appear as everyday fansub groups.

### What Works
- Phase 20 remains verified complete as the release-native import baseline.
- Phase 21 fansub chip/collaboration wiring works and passed human UAT.
- Anime edit now behaves much closer to anime create and is live on Docker.
- Jellyfin relink in edit uses the simplified create-style candidate flow.
- Manual and Jellyfin assets can coexist visibly in edit for backgrounds and background videos.
- Episode version deletion works through the backend release-native graph cleanup path.
- The local backend and frontend are serving on ports `8092` and `3002`.

### What Is Open
- Phase 22 is still in active refinement rather than formally closed.
- The remaining question is whether the current anime edit source/context area still needs another trimming pass before formal verification.
- Cross-AI review is still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `22-anime-edit-on-create-flow-foundation`
- Current plan position: implementation materially advanced, formal close/verify still pending
- Immediate next step: do one more honest pass on anime edit completeness, then either verify/close Phase 22 or record the next gap precisely

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Anime edit should follow anime create directly instead of preserving a separate legacy edit interaction model.
- The per-episode `Korrektur-Sync` action is no longer part of the normal admin episode workflow.
- Collaboration groups may stay persisted for release wiring, but should not appear in the default fansub management list.
