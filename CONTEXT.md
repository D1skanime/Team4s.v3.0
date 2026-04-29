# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 28 follow-through - runtime playback verification plus duration-input hardening`

## Current State

### What Finished In This Pass
- The stale frontend test/type baseline was repaired so the current Phase-28 frontend lane is trustworthy again.
- Episode-version runtime metadata now includes `duration_seconds` through the current backend/frontend edit seam.
- The duration input on episode-version edit accepts fast shorthand forms like `2m`, `1m30`, and `1m30s`.
- Invalid duration text is now blocked in the UI instead of silently clearing persisted runtime metadata.
- Local Docker backend/frontend were rebuilt and redeployed after the duration/runtime fixes.

### What Works
- Phase 20 remains verified complete as the release-native import baseline.
- Phase 21 fansub chip/collaboration wiring works and passed human UAT.
- Phase 27 reuse/library behavior was previously verified live and remains part of the current baseline.
- Episode-version edit now persists `duration_seconds` through the patch/update path.
- The duration field supports raw seconds, `m:ss`, `hh:mm:ss`, `2m`, `1m30`, and `1m30s`.
- Invalid duration input now fails with a user-facing validation message before save.
- The local backend and frontend are serving on ports `8092` and `3002`.

### What Is Open
- Phase 28 still needs one honest live browser/UAT pass for runtime playback selection, runtime-null handling, and upload fallback behavior.
- The new duration-input shorthand needs one real browser pass captured as evidence.
- Migration `0052` bookkeeping/state drift still needs separate follow-up.
- Cross-AI review is still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `28-segment-playback-sources-from-jellyfin-runtime`
- Current plan position: automated verification is green again; human UAT and evidence capture remain open
- Immediate next step: run the live `/admin/episode-versions/47/edit` pass for duration input plus Phase-28 runtime/fallback checks

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Anime edit should follow anime create directly instead of preserving a separate legacy edit interaction model.
- The per-episode `Korrektur-Sync` action is no longer part of the normal admin episode workflow.
- Collaboration groups may stay persisted for release wiring, but should not appear in the default fansub management list.
- Segment structure belongs to the episode-version/release context, not to a separate anime themes admin page.
- Segment types are generic (`OP`, `ED`, `Insert`, `Outro`); distinctions like `OP1` live in the free name field.
- Segment files are Team4s-owned assets behind `release_asset`; Jellyfin is optional context, not the primary storage model.
- Episode-version duration input should accept both colon syntax and operator-friendly shorthand forms.
- Invalid duration text must never clear saved runtime metadata silently.
