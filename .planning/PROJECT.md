# Team4s Admin Anime Intake

## What This Is

Team4s is an existing anime platform with a Go backend, Next.js frontend, and an expanding admin area for managing anime content, media, and release data. The current focus is to improve the admin workflow for creating and editing anime so admins can either enter anime manually or bootstrap them from Jellyfin while keeping manual control over the final stored data.

## Core Value

Admins can reliably create and maintain correct anime records without losing control to automatic imports.

## Requirements

### Validated

- [x] Team4s already has a working backend/frontend stack for anime, admin content, media upload, and runtime deployment - existing
- [x] Cover upload infrastructure already exists and is integrated into the current system - existing
- [x] Jellyfin integration seams already exist in backend config and admin handlers - existing

### Active

- [ ] Admin can start anime creation by choosing either a manual flow or a Jellyfin-assisted flow.
- [ ] Both creation flows open an editable form before final save instead of auto-creating records immediately.
- [ ] Jellyfin-assisted creation remains a preview flow until the admin explicitly saves or cancels.
- [ ] V1 saving requires only `title` and `cover`.
- [ ] Anime can exist fully manually without any Jellyfin linkage.
- [ ] Jellyfin search/selection lets the admin choose the correct folder/item using Jellyfin item identity and visible path metadata.
- [ ] Jellyfin-derived data can prefill anime form fields including description, year, AniDB ID, genres/tags, poster, logo, banner, background, and background video.
- [ ] Manual values remain authoritative over Jellyfin values after save.
- [ ] Jellyfin re-sync updates Jellyfin-backed fields only when the stored field is empty; non-empty manual values must not be overwritten.
- [ ] Jellyfin media origins are visible in the UI and removable so admins can replace them with manual uploads later.
- [ ] Admin UI clearly exposes Jellyfin path and Jellyfin ID both during selection and later while editing.
- [ ] Admin can manage anime relations manually, including setting what an anime is and linking it to other existing anime records.
- [ ] Anime relation management in V1 only offers `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, and `Zusammenfassung`, mapped to `full-story`, `side-story`, `sequel`, and `summary`.
- [ ] Admin actions for anime intake, relation changes, and anime maintenance are audit-logged with the acting user ID for later traceability.
- [ ] Validation and Jellyfin fetch or sync failures are shown clearly in the admin UI for fast debugging, but do not need durable error history in V1.

### Out of Scope

- Legacy database migration/backfill - not needed for the current no-data-first rollout
- Fine-grained access rules and broader authz redesign - current phase is focused on admin workflow and data behavior
- AniSearch crawler automation - deferred to a later phase
- Full non-cover upload system parity for logo, banner, background, and background video - existing cover upload is the only completed upload surface today
- Broader relation-type coverage beyond the four approved V1 labels - defer until the first admin relation workflow is stable

## Context

Team4s is a brownfield codebase with active work already in progress across anime detail, admin content, metadata normalization, release decomposition, and media upload. The current stack is documented in `.planning/codebase/STACK.md` and `.planning/codebase/ARCHITECTURE.md`, and local development already runs via Docker Compose with Postgres, Redis, backend, and frontend services.

This project already contains partial admin anime management and Jellyfin sync work, but the current anime intake flow is not yet cleanly defined as a product experience. The immediate need is to define the intended workflow, relation management, error visibility, auditability, and data ownership rules before expanding upload surfaces, live sync behavior, or future AniSearch enrichment.

The initial audience is internal admins only, not a broader moderator or editor surface. Jellyfin integration requires environment-backed API access and should expose enough metadata for admins to confidently select the correct source item. The database already contains anime relation tables, but backend write endpoints and frontend relation management UI are not yet implemented. AniSearch remains the domain reference for anime semantics, especially the rule that anime should be treated as self-contained series rather than season-based records, but AniSearch crawling is not part of this phase.

## Constraints

- **Brownfield**: Existing backend/frontend/admin code must be improved rather than replaced - preserves momentum and working surfaces
- **Compatibility**: Existing Team4s stack, routes, and database evolution model should remain intact - avoids destabilizing adjacent work
- **Data ownership**: Manual edits must remain authoritative over Jellyfin imports - admins need trust and control
- **Workflow**: Jellyfin import must always pass through an editable form before save - prevents opaque automatic record creation
- **Audience**: V1 is admin-only - the workflow can optimize for informed internal operators first
- **Observability**: Admin actions need audit attribution by user ID, while operational errors must be visible immediately in the UI - supports debugging without requiring durable error retention
- **Relations**: V1 relation editing is intentionally limited to four approved labels even though the database can support more - keeps the first admin relation surface understandable
- **Modularity**: Production code files should stay at or below 450 lines; larger implementations must be split before they become monolithic
- **UX quality**: Admin workflow changes should get explicit UX attention, not just backend correctness - the flow must stay understandable for internal operators
- **Scope**: Only cover upload is currently productionized - other anime media upload surfaces need planning and follow-up work
- **Infrastructure**: Jellyfin access depends on `.env` configuration and API connectivity - feature design must account for that operational dependency

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Anime creation starts with a mode choice: manual vs Jellyfin | The admin intent changes the sourcing path but not the final review step | Pending |
| Both creation modes use a review/edit form before save | Prevents blind record creation and keeps admins in control | Pending |
| Jellyfin create stays in preview until explicit save | Admins must be able to inspect, edit, or cancel before any record exists | Pending |
| Only title and cover are required in V1 | Keeps intake usable even when metadata is incomplete | Pending |
| Manual values are authoritative | Imported data should assist, not dominate | Pending |
| Jellyfin re-sync may fill empty fields but not overwrite non-empty manual values | Supports refresh without destroying curated data | Pending |
| Jellyfin media provenance must be visible and removable in the UI | Admins need to understand what came from Jellyfin and replace it when needed | Pending |
| Anime may be created without any Jellyfin linkage | Purely manual editorial workflows must remain possible | Pending |
| Type from Jellyfin folder context is only a suggestion | Derived metadata should guide the user, not silently decide for them | Pending |
| Anime relations are managed explicitly in admin rather than inferred silently | Relation semantics need human control and later editorial correction | Pending |
| V1 relation UI only exposes Hauptgeschichte, Nebengeschichte, Fortsetzung, and Zusammenfassung | The first relation workflow should stay narrow even if the DB supports more types | Pending |
| Code should be split before a production file exceeds 450 lines | Keeps anime intake, asset handling, and relation logic modular and reviewable | Pending |
| Admin workflow work should include explicit UX review, not only technical correctness | The phase is partly about making the flow usable and debuggable for admins | Pending |
| Anime intake and relation actions are audit-logged by acting admin | Later traceability matters for debugging and accountability | Pending |
| Validation and Jellyfin fetch errors are surfaced in the UI but not durably stored in V1 | Errors should be easy to resolve without designing long-term error retention yet | Pending |

---
*Last updated: 2026-03-23 after Brownfield GSD questioning for anime intake/admin workflow planning*
