# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** v1.1 asset lifecycle hardening
- **Current slice:** Phase 07 (`Generic Upload And Linking`) is verified and approved; next step is choosing and planning the next phase

## Current State

### What Finished Today
- Phase 07 (`Generic Upload And Linking`) is now verified in automated checks and approved in real browser UAT.
- Manual anime create and edit now share the reusable V2 seam for `cover`, `banner`, `logo`, `background`, and `background_video`.
- Edit-route asset management now lives directly in the asset provenance cards, including integrated cover controls.
- Backgrounds now render with separate provider and active galleries to match additive slot semantics.
- Delete cleanup was rechecked after manual uploads and still removes anime-owned DB rows and filesystem artifacts.

### What Works
- Docker frontend/backend stack is running locally on `http://localhost:3002` and `http://localhost:8092`.
- Manual anime create can stage and link non-cover assets through the typed V2 seam.
- Anime edit can upload/remove banner, logo, background, and background-video assets from the provenance cards.
- Cover upload/remove is integrated into the cover card and no longer split into a separate management block.
- Full anime delete still cleans up the current run's anime-owned media and filesystem tree.
- Phase 07 approval is recorded in `.planning/phases/07-generic-upload-and-linking/07-HUMAN-UAT.md`.

### What Is Open
- The next phase is not selected yet.
- `ROADMAP.md`, milestone tracking, and handoff files may still need post-Phase-07 completion sync.
- Remaining work is now follow-up planning and non-critical UI refinement, not Phase-07 seam reachability.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Verified phases: `06-provisioning-and-lifecycle-foundations`, `07-generic-upload-and-linking`
- Next required GSD step: choose and plan the next phase
- Do **not** reopen Phase 07 unless a fresh regression appears in create/edit/delete asset behavior.

## Key Decisions In Force
- Anime-first and V2-first remains the current execution scope.
- Manual create/edit/delete flows must use the same generic upload seam rather than slot-specific legacy endpoints.
- Replace/remove/delete cleanup must stay aligned between DB ownership and filesystem cleanup.
- Finished Phase-06 and Phase-07 behavior should stay closed unless a real regression appears.

## Quality Bar
- Keep build/test commands in `STATUS.md` runnable on the current Docker setup.
- Tomorrow's first task should be a concrete post-Phase-07 planning or sync task, not reopening already verified lifecycle work.
- Any new upload/linking work should extend the generic V2 seam instead of reviving `frontend/public/covers` or `/api/admin/upload-cover`.
