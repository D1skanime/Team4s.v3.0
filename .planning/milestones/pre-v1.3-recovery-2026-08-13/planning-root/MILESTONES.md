# Milestones

## v1.0 Admin Anime Intake (Shipped: 2026-04-01)

**Phases completed:** 6 phases, 23 plans, 22 tasks

**Key accomplishments:**

- Transactional authority syncing for anime titles and genres across `anime`, `anime_titles`, and `anime_genres` with repository regressions guarding reload behavior
- Transactional admin anime audit rows plus fail-closed auth on anime and upload mutation routes
- Reusable anime editor shell with one save bar, modular create/edit sections, and a lightweight ownership badge for linked records
- Repository modularity restored for admin content and anime metadata read paths without changing the verified authority or audit contracts
- Media upload processing and server admin wiring split into focused helper files while preserving fail-closed auth and actor-attributed uploads
- Manual-first anime intake entry with a reserved Jellyfin branch and a reusable empty/incomplete/ready draft-state seam
- Backend manual anime create now enforces normalized `title + cover_image` while preserving the existing uploaded cover filename contract and avoiding Jellyfin coupling.
- Draft-only Jellyfin intake contracts with ranked candidate evidence, proxy-backed preview assets, and advisory type-hint metadata
- Compact-first Jellyfin candidate review UI with a dedicated intake client, typed hook seam, and evidence-dense preview cards
- The shared manual create route now hydrates directly from Jellyfin preview data, keeps the save bar as the only persistence point, and lets admins remove imported media from the unsaved draft.
- Jellyfin-assisted create now carries source linkage only when the admin actually saves, while the preview and candidate flow stay completely transient.
- Jellyfin draft hydration now seeds the editable title from the folder name, which matches the clarified Phase 03 decision.
- After selecting a Jellyfin match, the shared create draft now becomes the active surface until the admin explicitly reopens candidate review.
- The Jellyfin intake flow now has the missing rich-review surface between compact search and draft hydration.

---

## v1.1 Asset Lifecycle Hardening (In Progress: 2026-04-05)

**Phases completed:** 2 of 3 phases verified

**Plans completed:** 6 planned slices closed across Phases 06 and 07

**Current milestone state:**

- Phase 06 provisioning and lifecycle foundations passed browser UAT on 2026-04-03.
- Phase 07 generic upload and linking passed verification and was approved in human UAT on 2026-04-05.
- The verified anime-first V2 seam now covers `cover`, `banner`, `logo`, `background`, and `background_video` across manual create and edit.
- Delete cleanup has been rechecked after real manual uploads and still removes anime-owned DB/media state from canonical storage.
- Phase 08 remains the next planning target for replace/delete cleanup semantics and operator UX follow-through.

---
