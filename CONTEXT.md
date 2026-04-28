# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 26 - Segment Source Asset Upload And Persistence`

## Current State

### What Finished In This Pass
- Phase 25 segment UI alignment is live and UAT-backed.
- The old anime-level themes route was removed from the active operator flow and now redirects back to anime edit.
- Segment work now clearly lives on episode-version edit in the release/group/version context.
- Segment types were normalized to generic `OP`, `ED`, `Insert`, and `Outro` plus free naming.
- Segment source assets can now be uploaded, persisted, replaced, and deleted as Team4s-owned `release_asset` files.
- The segment table now surfaces uploaded file names, and the grouped episode overview now surfaces segment/file status per version row.
- Local Codex startup no longer depends on the stale `.codex/agents/*.toml` set that had been breaking new-thread start.

### What Works
- Phase 20 remains verified complete as the release-native import baseline.
- Phase 21 fansub chip/collaboration wiring works and passed human UAT.
- Anime edit now behaves much closer to anime create and is live on Docker.
- Episode-version segment editing works in real release context with range-aware reuse on covered episodes.
- Suggestions from other releases appear separately from editable same-release segments.
- Segment asset uploads for `release_asset` now persist through the backend and survive reload.
- The grouped episode overview can now show segment presence and uploaded-file presence per version.
- The local backend and frontend are serving on ports `8092` and `3002`.

### What Is Open
- Phase 26 still needs one final live verification pass focused on the segment asset lifecycle and the newly added status visibility.
- The future fansub-self-service upload surface for segment files is still only a product direction, not an implemented route.
- Cross-AI review is still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `26-segment-source-asset-upload-and-persistence`
- Current plan position: implementation materially advanced, live verification/status confirmation still pending
- Immediate next step: verify the segment row filename display and the new episode-overview segment/file badges on the same release/version

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Anime edit should follow anime create directly instead of preserving a separate legacy edit interaction model.
- The per-episode `Korrektur-Sync` action is no longer part of the normal admin episode workflow.
- Collaboration groups may stay persisted for release wiring, but should not appear in the default fansub management list.
- Segment structure belongs to the episode-version/release context, not to a separate anime themes admin page.
- Segment types are generic (`OP`, `ED`, `Insert`, `Outro`); distinctions like `OP1` live in the free name field.
- Segment files are Team4s-owned assets behind `release_asset`; Jellyfin is optional context, not the primary storage model.
