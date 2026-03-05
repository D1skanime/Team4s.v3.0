# CONTEXT

## Project
- Name: Team4s.v3.0
- Phase: Public Group/Release Experience stabilization + operations handoff
- Milestone: EPIC 0-6 complete; EPIC 7+ pending
- Completion: ~45%

## Project State

### Done
- [x] Public group/release foundation (routes, story view, release feed, playback integration base)
- [x] VS Code programming baseline validated for this workstation
- [x] Recommended extensions installed for coding workflow
- [x] API capability check completed for Jellyfin and Emby folder-creation question
- [x] End-of-day closeout docs synced for restartability

### In Progress
- [ ] Release feed polish and filters behavior refinement
- [ ] Group-aware release browsing UX improvements
- [ ] Operational design for one-click media-folder provisioning

### Blocked
- [ ] No direct Jellyfin/Emby REST endpoint for filesystem folder creation in media roots
- [ ] Folder automation path must be implemented in project-owned backend/service/plugin

## Key Decisions and Context

### Intent and Constraints
- Optimize for maintainability, explicit contracts, and predictable operations.
- Keep security-sensitive filesystem writes in owned services.
- Refuse undocumented server mutations that depend on fragile internal behavior.

### Design and Approach
- Keep API contract-first workflow for product endpoints.
- For folder provisioning, use explicit backend automation with idempotent behavior.
- Keep VS Code terminal GPU acceleration disabled in this CPU-only environment.

### Assumptions
- Risky: media host path permissions can be managed by the same service user as backend automation.
- Risky: naming rules for anime/group assets can be standardized without major legacy conflicts.
- Low risk: extension baseline selected today is compatible with current stack (Go + Next.js + Python tools).

### Quality Bar
- Build and tests must stay green for merged feature work.
- Docs must capture decisions that would otherwise be re-debated tomorrow.
- "First task tomorrow" must be concrete and executable in <=15 minutes.
