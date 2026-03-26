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
  - create redirect back to overview
  - edit poster upload rerouted to working local cover endpoint
- In progress:
  - edit UX clarification
  - save semantics cleanup
  - deciding next phase sequencing
- Blocked:
  - generic backend media upload for broader asset types is schema-misaligned

## Key Decisions & Context
- Create success should be visible from the overview, not hidden behind an immediate edit redirect
- The anime overview itself is part of the verification path
- Local testing should stay low-friction; auth lifecycle must not dominate every manual check
- Poster upload can use the local cover route until the generic media backend is truly ready

## Assumptions
- The current local environment remains the main verification target
- Future asset uploads will likely need a different treatment than the old generic upload repository currently provides
- The next productive conversation should start from edit/save semantics, not from re-litigating finished create/overview fixes

## Parking Lot
- relations management phase still needs full UI/backend delivery
- provenance badges and sync ownership rules are still intentionally light
- general media upload backend needs a later cleanup/design pass

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
