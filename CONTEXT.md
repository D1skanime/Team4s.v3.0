# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** v1.1 asset lifecycle hardening
- **Current slice:** the next AniSearch/admin slice is now chosen as edit-route relation UX on top of the verified Phase-13 (`AniSearch Relation Follow-Through Repair`) baseline

## Current State

### What Finished Today
- Phase 13 create-side AniSearch relation carry-through was completed and verified.
- The create route now keeps AniSearch relation rows in the final create payload and the backend persists them after anime creation.
- Idempotent relation skips are now treated as accounted successful outcomes rather than false-warning failures.
- The final parser bug on AniSearch relation pages was fixed: mixed `anime` object plus empty `manga` / `movie` arrays in `data-graph` no longer break relation parsing.
- The concrete `Ace of the Diamond: Staffel 2` case was traced through the parser and confirmed after the fix.
- The corrected baseline was pushed to GitHub `main`.

### What Works
- Docker stack remains usable for browser verification on `http://localhost:3002` and `http://localhost:8092`.
- Local non-Docker dev startup also works through `scripts/start-backend-dev.ps1` and `scripts/start-frontend-dev.ps1`.
- Anime create can persist AniSearch relation follow-through into the DB after save.
- AniSearch create duplicate/idempotent relation rows downgrade cleanly into `skipped_existing` counts without misleading warnings.
- The AniSearch relation parser now reads relation graphs such as `10250` correctly and no longer collapses to zero candidates because of mixed node container types.
- Backend package tests pass, targeted AniSearch create frontend tests pass, and live API checks succeeded against the running local backend.
- GitHub `main` now includes the Phase-13 closeout commits plus the AniSearch parser fix commit `e5d934c`.

### What Is Open
- Edit-route relation UX is the active next thread and still needs concrete scope/planning.
- Broader relation-label decisions remain a separate follow-up after the edit-route UX slice.
- Some root handoff files and older Phase-11 planning artifacts are still dirty in the worktree and should be treated as active local context, not silently cleaned up.
- Cross-AI review is still unavailable without an independent reviewer CLI.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Verified/executed phases: `06-provisioning-and-lifecycle-foundations`, `07-generic-upload-and-linking`, `10-create-tags-and-metadata-card-refactor`, `12-create-anisearch-intake-reintroduction-and-draft-merge-control`, `13-anisearch-relation-follow-through-repair`
- Next required GSD step: scope and plan the edit-route relation UX slice without reopening the verified create relation seam or pulling in relation taxonomy expansion
- Do **not** reopen Phase 13 unless a fresh relation persistence or AniSearch parser regression appears.

## Key Decisions In Force
- Anime-first and V2-first remains the current execution scope.
- Manual create/edit/delete flows must use the same generic upload seam rather than slot-specific legacy endpoints.
- Tags behave analog to genres: normalized reference table plus junction table, authoritative write on save, junction cleanup on delete.
- Replace/remove/delete cleanup must stay aligned between DB ownership and filesystem cleanup.
- `Team4s` is now the canonical local Git repo; `Team4sV2` was only the recovery workspace.
- AniSearch create relation follow-through is now part of the verified baseline, not an experimental path.
- AniSearch relation-page parsing must tolerate mixed node container types in `data-graph`; empty `manga` / `movie` arrays must never discard valid anime relations.
- Post-Phase-13 follow-up order is now explicit: handle edit-route relation UX before broader relation-label normalization or extra AniSearch polish.

## Quality Bar
- Keep build/test commands in `STATUS.md` runnable on both Docker and local-dev paths.
- Tomorrow's first task should be a concrete edit-route relation UX scoping action that takes under 15 minutes.
- Any new metadata or AniSearch work should extend the current V2/admin contracts instead of reviving legacy slot-specific paths.
