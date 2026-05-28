# RISKS

## Top Risks

### 1. Closed planning state drifts after push
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Phase 54-56 now span several planning artifacts. A stale checkbox or pending-gate note can mislead the next session.
- **Mitigation:** Start next session with a 15-minute roadmap/status reconcile and confirm Phase 54-56 are consistently closed.

### 2. Future cropper work accidentally crosses media ownership boundaries
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Phase 56 deliberately kept the cropper as UI/export infrastructure only. Uploads still belong to profile avatar and fansub group media seams separately.
- **Mitigation:** Keep `Team4sCropper` domain-neutral. Profile uploads go through `uploadOwnProfileAvatar`; fansub group media goes through `MediaUpload`/`uploadFansubMedia`; no release/anime/episode media shortcuts.

### 3. TipTap profile story persistence regresses to plain-text-only behavior
- **Impact:** High
- **Likelihood:** Low
- **Why it matters:** Phase 55 moved profile story persistence onto a real TipTap JSON, server-sanitized HTML, and derived plain text contract.
- **Mitigation:** Preserve the Phase 55 migration, backend validation/sanitizing, OpenAPI/frontend DTO alignment, and tests when touching `/me/profile`.

### 4. New upload flows duplicate existing domain flows
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Parallel upload logic makes media ownership, progress state, and API contracts drift.
- **Mitigation:** Before any new upload work, inspect `MediaUpload`, `ReleaseVersionMediaSection`/`useReleaseVersionMedia`, anime upload planning, and `frontend/src/lib/api.ts` upload helpers.

### 5. Release-version media is collapsed back onto release-level media
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Versioned Admin/Fansub process media belongs to `release_version_media.release_version_id`; using `release_id` or `release_media` here breaks domain ownership.
- **Mitigation:** Keep `AGENTS.md`, `DECISIONS.md`, domain docs, contracts, and tests aligned.

## Current Blockers
- No known blocker remains for Phase 55 or Phase 56.
- Older parking-lot tasks remain intentionally deferred.
