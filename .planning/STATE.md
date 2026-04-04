---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 07-04-PLAN.md
last_updated: "2026-04-04T22:15:19.465Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 6
  completed_plans: 5
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.
**Current focus:** Phase 07 — generic-upload-and-linking

## Current Position

Phase: 07 (generic-upload-and-linking) — EXECUTING
Plan: 2 of 4

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md`.

Recent durable decisions:

- Shared admin anime editing stays on one editor surface across create and edit.
- Jellyfin-assisted intake stays preview-only until explicit save.
- Manual values and manual replacement assets stay authoritative over later resync behavior.
- Relation editing stays limited to the four approved V1 labels.
- The v1.1 milestone is generic upload, asset lifecycle, and folder provisioning rather than more intake expansion.
- The current execution scope is anime-first and V2-first; group/fansub media follows later.
- [Phase 07-generic-upload-and-linking]: Keep one /api/v1/admin/upload seam and map background_video to stored media type video inside the repository layer.
- [Phase 07-generic-upload-and-linking]: Resolve persisted logo and background_video URLs through the existing anime backdrop manifest before any Jellyfin fallback.
- [Phase 07-generic-upload-and-linking]: Frontend asset uploads now route through an asset-kind config so singular slots and additive backgrounds share one mutation seam without slot-specific helpers.
- [Phase 07-generic-upload-and-linking]: The client mirrors backend slot names directly for logo and background_video, while cover continues to map to the upload seam's poster alias.
- [Phase 07]: ManualCreateWorkspace stays a shell while ManualCreateAssetUploadPanel owns the visible cover and non-cover staging controls.
- [Phase 07]: Create-route staging now uses one asset-kind plan so post-create linking stays typed and background remains additive.

### Pending Todos

- Start Phase 07 on top of the verified anime-first V2 upload seam.
- Decide later whether the old manual-vs-Jellyfin entry-choice page should be restored or formally retired.

### Blockers/Concerns

- Cross-AI review remains unavailable until an independent reviewer CLI is installed.

## Session Continuity

Last session: 2026-04-04T22:15:19.456Z
Stopped at: Completed 07-04-PLAN.md
Resume file: None
