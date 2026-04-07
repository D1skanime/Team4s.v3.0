---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: asset lifecycle hardening
status: Ready to plan
stopped_at: Phase 07 approved in human UAT; Phase 08 planning next
last_updated: "2026-04-05T12:50:00Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.
**Current focus:** Phase 09 planning - controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up

## Current Position

Phase: 09 (controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up) - READY FOR PLANNING
Plan: Not planned yet

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
- [Phase 07]: Keep cover, banner, logo, and background_video as singular replacement slots while preserving additive background uploads.
- [Phase 07]: Split metadata copy and asset-card helpers out of AnimeJellyfinMetadataSection.tsx so the edit shell stays under the CLAUDE.md 450-line cap.

### Pending Todos

- Plan Phase 09 on top of the verified Phase 06 and Phase 07 lifecycle baseline.
- Decide later whether the old manual-vs-Jellyfin entry-choice page should be restored or formally retired.

### Roadmap Evolution

- Phase 09 added: Controlled AniSearch ID enrichment before create with fill-only Jellysync follow-up

### Blockers/Concerns

- Cross-AI review remains unavailable until an independent reviewer CLI is installed.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260405-kce | Sync Phase-07 completion across roadmap and milestone tracking | 2026-04-05 | uncommitted (dirty workspace) | [260405-kce-sync-phase-07-completion-across-roadmap-](./quick/260405-kce-sync-phase-07-completion-across-roadmap-/) |
| 260405-pcz | Add tags schema and persistence analogous to genres for anime metadata | 2026-04-05 | uncommitted (dirty workspace) | [260405-pcz-add-tags-schema-and-persistence-analogou](./quick/260405-pcz-add-tags-schema-and-persistence-analogou/) |

## Session Continuity

Last session: 2026-04-04T22:18:49.435Z
Stopped at: Phase 09 context gathered
Last activity: 2026-04-05 - Completed quick task 260405-pcz: Add tags schema and persistence analogous to genres for anime metadata
Resume file: None
