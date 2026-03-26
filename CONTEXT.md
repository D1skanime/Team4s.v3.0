# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** Admin anime intake and follow-up editing flow hardening
- **Current slice:** manual create + Jellyfin-assisted intake + public/admin cover consistency

## Current State

### What Finished Recently
- Installed a Codex-local `day-closeout` skill under `.codex/skills/day-closeout/`
- Completed major planning/execution progress for the current anime-admin roadmap:
  - ownership/editor foundations
  - manual intake baseline
  - Jellyfin-assisted intake
- Reduced local auth friction so local testing no longer depends on the full auth-token lifecycle
- Fixed public anime cover rendering so absolute Jellyfin/media URLs work on public pages
- Fixed edit-cover upload by routing it through the known-good local cover upload route
- Extended Jellyfin draft handling to support multiple background images
- Upgraded `/admin/anime` from a static entry page into a real runtime overview that lists created anime
- Changed post-create redirect back to `/admin/anime` so successful creation is visible immediately in the overview

### What Is Working
- `Naruto` exists in the local DB and appears in `/admin/anime`
- `/admin/anime/1/edit` is reachable
- `/anime/1` loads and shows the cover correctly
- Jellyfin intake search/preview is functional enough for local draft creation
- Docker stack is currently the expected local verification path

### What Is Still Pending
- Edit UX is still not fully settled
- Save behavior needs a clean final specification for edit mode
- Generic media upload backend still has schema mismatch and is not yet ready for broader asset types
- Relations management is still planned work, not yet delivered as a full backend+UI flow
- Ownership/provenance rules beyond the current lightweight level still belong to the next phase

## Active Planning Context
- Roadmap moved from DB-heavy thinking back to the real product need:
  - admins creating anime
  - improving anime editing
  - Jellyfin-assisted intake
  - later ownership/resync rules
- The next likely GSD step is:
  - `Phase 4: Data Ownership And Re-Sync Rules`
  - unless relations management is intentionally pulled forward

## Key Decisions In Force
- Manual values remain leading over synced values
- Jellyfin stays preview-only until final save
- Create should return to the anime overview, not drop the user straight into edit by default
- The overview itself must prove persistence by showing the new anime
- For local poster uploads, the stable local cover route is preferred until the generic media backend is reconciled with the newer schema

## Quality Bar
- Docker remains the primary local verification path after each meaningful task
- Public and admin views must agree on cover resolution
- Create success must be observable from the admin overview
- Tomorrow's first task must be tiny, concrete, and restart the flow without re-discovery
