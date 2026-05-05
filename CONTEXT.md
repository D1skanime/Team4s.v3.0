# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Phase 32 fansub release side drawer follow-through plus fansub-domain guardrails`

## Current State

### What Finished In This Pass
- Phase 30 explicit fansub-release API routes and canonical release-context loading are implemented and documented.
- Phase 31 turned fansub edit into a tabbed workspace with `Anime & Releases` as the release-context entry point.
- Phase 32 added the release side drawer and release-theme-asset upload/delete wiring on top of existing release-native seams.
- Live browser/UAT was run on a real fansub context (`/admin/fansubs/88/edit`) instead of the stale `/admin/fansubs/7/edit` assumption.
- Release-theme-asset upload, reload persistence, delete, and physical file cleanup were verified on two real release/theme cases.
- New release-theme uploads now land under `media/release-theme-assets/release_<releaseId>/theme_<themeId>/...` instead of flat `media/`.
- Backend guardrails now block release-specific uploads when a global/admin theme segment already covers that episode range.
- `docs/architecture/db-schema-fansub-domain.md` now exists as a repo-local domain reference for Codex/GSD agents.
- `AGENTS.md` was consolidated so the default workflow, stop conditions, domain rules, migration rules, UI rules, screenshot-to-UI rules, diff discipline, validation, and output requirements are all explicit in one place.

### What Works
- Phase 20 remains the verified release-native import baseline.
- Phase 21 fansub chip/collaboration wiring remains part of the baseline.
- Phase 28 runtime playback/fallback remains live-verified.
- Phase 29 canonical fansub-group plus generic-link work is implemented in the dirty worktree.
- Phase 30 automated verification artifacts are present; the canonical release context is treated as explicit API truth instead of theme-asset side effects.
- The local backend health endpoint returned `200` on 2026-05-05, and `/admin/fansubs/88/edit` served the verified real UAT path.
- Release 41 and Release 42 both completed a real theme-asset round-trip: upload, persist after reopen, delete, and physical file removal.
- Release-theme delete now removes both the DB/link state and the underlying file from `media/`.
- The upload path is now explicitly user-triggered via `Upload starten` instead of relying only on file-input change behavior.

### What Is Open
- The broader release-drawer state/race audit is not fully closed yet; detail/theme drawer switching still deserves one more intentional pass.
- Migrations `0055` to `0057` exist as untracked cleanup-boundary work and need chain/risk review before further migration work.
- Transitional fansub fields and the legacy `release_version_groups.fansubgroup_id` cleanup boundary still need follow-through verification.
- The worktree is intentionally dirty across product code, planning files, and repo-local GSD/Codex tooling.
- Cross-AI review is still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase: `32-fansub-release-side-drawer`
- Current plan position: Phase 32 execution plus real release-theme-asset verification is present in the worktree; cleanup-boundary audit is now the next main open block
- Immediate next step: audit migrations `0055` to `0057` and the `fansubgroup_id` cleanup boundary before adding more schema work

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Fansub links are authored canonically through `fansub_group_links`; fixed URL columns are compatibility projections only.
- Collaboration-member management is explicit and separate from ordinary group profile editing.
- `release_version_groups.fansub_group_id` is the runtime truth; legacy `fansubgroup_id` is cleanup-only.
- Anime and episodes stay neutral; release and group media must stay on their existing release/group seams.
- The release side drawer must reuse existing `release_theme_assets` and release-native APIs instead of inventing new media tables or hidden release discovery.
- Global/admin theme segments that cover an episode range must lock out conflicting release-specific uploads for the covered releases.
