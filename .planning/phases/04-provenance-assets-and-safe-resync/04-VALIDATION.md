# Phase 04 Validation - Provenance, Assets, And Safe Resync

Status: planned

## Automated Gates

### Backend

- Add or extend handler/repository tests for persisted provenance context lookup.
- Add tests for metadata resync preview payload generation.
- Add tests for explicit apply semantics:
  - fill-only fields remain unchanged when already set
  - cleared fields can be refilled by explicit resync
  - invalid or missing source linkage fails cleanly
- Add tests for asset slot replace/remove semantics where applicable.
- Add tests for anime asset persistence semantics:
  - manual banner/background remains protected on resync
  - provider-owned banner/background refreshes on explicit resync
  - new provider background entries append without deleting manual entries
  - persisted anime assets win over Jellyfin fallback in runtime reads

### Frontend

- Add edit-route tests for provenance panel rendering.
- Add tests for resync preview states:
  - idle
  - loading
  - diff visible
  - apply success
  - apply error
- Add tests for ownership/provenance badge messaging on manual, linked, and mixed states.
- Add tests for slot-level asset actions and manual override persistence cues.
- Add tests for asset provenance cards:
  - slot marked as manual/protected
  - slot marked as provider-owned/refreshable
  - preview-only slots are clearly labeled when persistence is unavailable
- Add tests for runtime-facing admin copy that explains persisted priority vs Jellyfin fallback

## Manual Validation

Run a focused smoke pass on `/admin/anime/[id]/edit` with at least one linked anime and one manual anime.

Verify:
- linked anime shows readable Jellyfin provenance
- manual anime does not expose misleading provider actions
- preview shows field-level changes before apply
- apply updates only the previewed allowed fields
- manual overrides remain intact after resync
- asset remove/replace actions behave predictably and show German feedback
- public anime route prefers persisted banner/background assets over Jellyfin fallback
- deleting a manual persisted banner/background re-enables Jellyfin fallback for that slot

## Exit Criteria

Phase 04 is only complete when:
- automated backend and frontend gates pass
- runtime smoke on the edit route passes after rebuild
- planning state is updated to reflect verified completion
