# Team4s Admin Anime Intake

## What This Is

Team4s is an existing anime platform with a Go backend, Next.js frontend, and an expanding admin area for managing anime content, media, and release data. After v1.0, the admin anime workflow now supports manual intake, Jellyfin-assisted draft creation, provenance-aware maintenance, fill-only resync, and relation CRUD on a shared editor surface.

## Core Value

Admins can reliably create and maintain correct anime records without losing control to automatic imports.

## Requirements

### Validated

- [x] Admin can start anime creation through the shipped v1 intake flow and work from a shared draft surface before persistence - v1.0
- [x] Manual create remains explicit-save-only and can succeed with `title + cover` - v1.0
- [x] Jellyfin-assisted create remains preview-only until explicit save or discard - v1.0
- [x] Jellyfin candidates expose enough evidence to pick the correct source and hydrate an editable draft - v1.0
- [x] Existing anime can be edited through the same ownership-aware surface used by intake - v1.0
- [x] Linked Jellyfin provenance, fill-only resync, and per-slot asset maintenance are available on the edit route - v1.0
- [x] Manual values and manual replacement assets remain authoritative over Jellyfin refresh behavior - v1.0
- [x] Relation CRUD is available in the admin edit route with the four approved V1 labels - v1.0
- [x] Admin actions remain attributable to the acting user and operator-facing failures are surfaced clearly - v1.0
- [x] Production workflow code touched by the milestone remains modularized rather than collapsing into oversized files - v1.0

### Active

- [ ] Define the generic upload and asset lifecycle contract for admin-managed media beyond cover-only flows.
- [ ] Add one-click anime/group asset folder provisioning with idempotency and operator-safe validation.
- [ ] Clarify how generic upload, replace, and delete cleanup should work across cover, banner, logo, background, video, and future asset types.
- [ ] Build one reusable persistence and linking path for asset lifecycle actions across anime and groups.
- [ ] Close the remaining milestone-closeout debt without letting it overtake the core asset lifecycle scope.

### Out Of Scope

- Fine-grained access control redesign - still separate from the admin anime workflow core
- Durable historical error/audit browsing UI - current milestone only needed immediate operator-facing errors
- Bulk Jellyfin intake and bulk resync - higher operational risk than the single-record workflow
- AniSearch crawler automation - still deferred until generic upload and asset lifecycle semantics are stable
- Broader relation taxonomy than the four V1 labels - keep the relation surface narrow until there is a clearer editorial need

## Context

## Current State

v1.0 shipped on 2026-04-01 with 6 completed phases and 23 completed plans. The shipped surface now covers:

- shared create/edit editor shell for anime admin flows
- manual create with explicit draft readiness and existing cover upload
- Jellyfin-assisted preview-only intake with candidate review, title seeding, and explicit save-only linkage
- persisted Jellyfin provenance, fill-only resync, and ownership-aware asset handling on edit
- anime v2 runtime stabilization for create/edit/read behavior
- relation CRUD with the narrow V1 taxonomy and operator-safe validation

The next product thread is no longer intake correctness itself; it is the generic upload/provisioning and asset lifecycle layer that future media types will depend on.

## Current Milestone: v1.1 Asset Lifecycle Hardening

**Goal:** Make admin-managed media lifecycle behavior generic, idempotent, and operator-safe instead of relying on cover-specific seams.

**Target features:**
- one-click folder provisioning for anime and groups
- generic upload contract for multiple asset types
- reusable asset linking across entities and slots
- replace/delete cleanup rules with clear operator feedback
- hardening around validation, auditability, and storage safety

## Constraints

- **Brownfield:** Existing backend/frontend/admin code should be extended, not replaced
- **Data ownership:** Manual edits stay authoritative over imported values
- **Workflow:** Imported data remains reviewable before persistence
- **Audience:** The surface is still optimized for internal admins first
- **Modularity:** Production code files should stay at or below the 450-line project limit
- **Ops safety:** Filesystem and storage changes need controlled, project-owned automation and clear validation
- **Scope:** Generic upload parity beyond cover is not yet fully productized

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep one shared editor surface across create and edit | Avoid diverging admin workflows as intake features grow | ✓ Good |
| Keep Jellyfin intake preview-only until explicit save | Preserve operator control and avoid hidden persistence | ✓ Good |
| Require only `title + cover` for initial manual create | Keep intake usable even when metadata is incomplete | ✓ Good |
| Treat Jellyfin-derived type as advisory only | Suggestions should guide, not silently decide | ✓ Good |
| Keep manual values and manual replacement assets authoritative over resync | Protect curated data from later provider refreshes | ✓ Good |
| Limit relation editing to the four approved V1 labels | Keep the first relation surface understandable and auditable | ✓ Good |
| Split workflow code before it exceeds the file-size ceiling | Preserve maintainability while the admin surface grows | ✓ Good |
| Keep the next milestone focused on generic upload/provisioning rather than reopening settled intake behavior | The broadest remaining risk is media lifecycle semantics, not core intake correctness | Pending |
| Make asset lifecycle behavior generic before adding more upload surfaces | Prevents banner/logo/background/video work from becoming a pile of slot-specific exceptions | Pending |

---
*Last updated: 2026-04-02 after v1.1 milestone definition*
