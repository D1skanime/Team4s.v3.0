# WORKING_NOTES

## Current Workflow Phase
- Phase: Admin anime intake and edit-flow hardening
- Focus: make local create/edit/public behavior coherent before expanding ownership/media complexity

## Project State
- Done:
  - create flow with title + cover requirement
  - Jellyfin-assisted draft flow
  - multiple Jellyfin backgrounds in draft
  - local auth bypass for easier local testing
  - public cover resolution for absolute Jellyfin/media URLs
  - admin overview with visible persisted anime entries
  - create redirect back to overview with explicit confirmation state
  - edit poster upload rerouted to working local cover endpoint
  - runtime UI-review against Docker/localhost with real screenshots
  - server-prefetched edit route wrapper for `/admin/anime/[id]/edit`
- In progress:
  - edit UX clarification
  - save semantics cleanup
  - deciding next phase sequencing
- Blocked:
  - generic backend media upload for broader asset types is schema-misaligned

## Key Decisions & Context
- Create success should be visible from the overview, not hidden behind an immediate edit redirect
- The anime overview itself is part of the verification path
- Overview confirmation should be explicit, not just a subtle hash jump
- Local testing should stay low-friction; auth lifecycle must not dominate every manual check
- Poster upload can use the local cover route until the generic media backend is truly ready
- Runtime UI-review should prefer the live Docker stack whenever localhost is available

## Assumptions
- The current local environment remains the main verification target
- Future asset uploads will likely need a different treatment than the old generic upload repository currently provides
- The next productive conversation should start from edit/save semantics, not from re-litigating finished create/overview fixes

## Parking Lot
- relations management phase still needs full UI/backend delivery
- provenance badges and sync ownership rules are still intentionally light
- general media upload backend needs a later cleanup/design pass

### Day 2026-03-27
- Phase: anime intake runtime review and continuity hardening
- Accomplishments:
  - updated local GSD UI-review docs to support runtime screenshot use on localhost/Docker
  - exercised the create flow with `Bleach` and `Air`
  - improved create-to-overview continuity with `?created=<id>#anime-<id>` plus explicit success confirmation
  - moved the edit route to a server-prefetched wrapper and verified `/admin/anime/3/edit` renders with real content
  - rebuilt the frontend Docker service so localhost reflects the latest UI fixes
- Key Decisions:
  - runtime UI-review should use the live app when available, not just code inspection
  - post-create continuity must include explicit confirmation in the overview
  - edit route reviewability matters; server-prefetch is preferable to the old loading shell
- Risks/Unknowns:
  - edit-save semantics are still not formally locked
  - local review artifacts and uploaded covers are still uncommitted working files
- Next Steps:
  - write down every edit action that still bypasses the save bar
  - turn that inventory into the final edit-save contract
  - decide whether generic media upload gets patched now or deferred behind the current local cover route
- First task tomorrow: inspect `AnimeEditWorkspace.tsx` and record every immediate-save action in `WORKING_NOTES.md`
- Mental unload: the biggest gain today was trust. The flow is not just working in code now; it is reviewable and explainable on the running stack. The next hard part is removing ambiguity inside edit mode before more uploads or sync rules land.

### Day 2026-03-26
- Phase: anime intake stabilization and admin/public parity hardening
- Accomplishments:
  - added Codex `day-closeout` skill
  - fixed public cover resolution for absolute URLs
  - fixed edit poster upload by using the local cover route
  - made `/admin/anime` a real overview with persisted anime entries
  - changed create redirect to go back to `/admin/anime`
  - verified Docker stack and runtime routes again
- Key Decisions:
  - overview must visibly prove persistence after create
  - local safe upload path is preferable to the broken generic backend path for poster edits
  - `/admin/anime` must render dynamically at runtime, not as a baked static error state
- Risks/Unknowns:
  - generic media backend still broken for richer asset flows
  - edit flow save semantics still need explicit design
- Next Steps:
  - define edit save behavior cleanly
  - continue edit-screen improvements
  - decide whether to patch or defer the generic media upload backend
- First task tomorrow: compare `page.tsx` and `AnimeEditWorkspace.tsx` and note which edit actions are immediate versus save-bar-driven
- Mental unload: The biggest hidden issue today was not persistence but observability; create was fine, the overview simply did not prove it. Now the local flow is much easier to trust. The remaining hard part is not another tactical fix but clarifying edit behavior before adding more complexity.
