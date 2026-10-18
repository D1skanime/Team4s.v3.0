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

## v1.1 Asset Lifecycle Hardening (Superseded: 2026-08-13)

**Phases completed:** 2 of 3 phases verified

**Plans completed:** 6 planned slices closed across Phases 06 and 07

**State when superseded:**

- Phase 06 provisioning and lifecycle foundations passed browser UAT on 2026-04-03.
- Phase 07 generic upload and linking passed verification and was approved in human UAT on 2026-04-05.
- The verified anime-first V2 seam now covers `cover`, `banner`, `logo`, `background`, and `background_video` across manual create and edit.
- Delete cleanup has been rechecked after real manual uploads and still removes anime-owned DB/media state from canonical storage.
- Phase 08 remained open when later product work superseded this milestone thread.

---

## v1.2 Public Experience, Historie & Scoped Rights (Historical Cycle)

**Scope reconstructed:** Phases 72-80 from the canonical v1.2 discussion and Git history

**Key accomplishments:**

- Domain/status and media-ownership projections established for public and scoped surfaces.
- Public fansub, member, anime/group, contribution, leader, media-ownership, and admin-user work was organized across Phases 72-80.
- Public member identity, contributions, memberships, memorial handling, and scoped permissions became explicit product domains.
- API/contract discipline and canonical media ownership were locked as cross-cutting constraints.

**Historical note:**

- This cycle was implemented through phase work but was not cleanly closed in the milestone metadata.
- It is recorded here to preserve the already-used v1.2 version without falsely claiming a new retroactive milestone audit.
- The later mixed phase tree was preserved in `.planning/milestones/pre-v1.3-recovery-2026-08-13/` before starting v1.3.

---

## v1.3 Public Member Profile Hardening (In Progress: 2026-08-13)

**Goal:** Make the public member profile data-correct, privacy-safe, performant, maintainable, and consistently usable from mobile through widescreen.

**Initial scope:**

- visibility-safe identity and public data contracts
- database/query/API/OpenAPI/frontend alignment
- simpler reusable profile code and mobile-first CSS

---

## v1.4 Capability-, Review- und Benutzerverwaltung — "Coverage" (Shipped: 2026-10-17)

**Goal:** Make effective group rights explainable and safely editable, turn review delegation into a usable product seam, reduce user-admin projections to meaningful grouped data, and show reviewers only work they can actually decide — then keep extending the same milestone additively instead of opening a new one.

**Phases completed:** 49 phases (136-185; original audited scope was Phases 136-144, 41/41 requirements, see `.planning/v1.4-MILESTONE-AUDIT.md`, passed 2026-09-01). The milestone kept growing additively well beyond that original scope under the same `v1.4`/"Coverage" label through Phase 185; no full re-audit across all 49 phases was performed at close — each phase carries its own phase-level verification record in `ROADMAP.md`/`STATE.md`.

**Key accomplishments:**

- Core scope (136-142): DB-driven capability policy/catalog/schema contract, a central effective-rights resolver with overrides, effective-rights administration UX, scalable user-admin projections, review delegation management, an actor-decidable review queue, and an integrated security/fixture/live-release gate.
- Registry and design-system consolidation (143-151): dashboard lane for rejected notes, capability-registry self-protection and substring-test sanitation, resolving the last parallel role catalogs, reconnecting role colors to the catalog, dead-CSS-token cleanup, one authoritative badge-threshold source, and achievement-badge carousel consolidation.
- Public-surface consolidation (152-164): public fansub group, member, and anime detail/project pages rebuilt onto shared read models, query budgets, and viewer/image-budget resolution instead of parallel ad-hoc implementations.
- Jellyfin-assisted intake and release-media work (165-169, 171-173): library-discovery-assisted anime creation, film content flow, fansub-group detection on episode import, release-media rights/project-lead previews, karaoke-segment integration, and an additional public image display variant.
- Modularization, legacy cleanup, and hardening sweep (174-184): a dedicated hotspot/duplication inventory followed by phases closing each found item — unified image viewer, unified search/filter, unified media-backend rights and upload UI, merged release editing, legacy image-storage removal, and status-label consolidation.
- Full-suite stabilization (185): closed the remaining durably-red frontend and backend tests to a clean, twice-green baseline.

**Closed non-destructively:** `REQUIREMENTS.md` and `ROADMAP.md` remain live and uncollapsed; a copied snapshot lives under `.planning/archive/v1.4/`. No new milestone was started — by explicit decision, work continues in additive phases (`/gsd-phase add`) until something large enough to justify a new milestone comes up. See `.planning/v1.4-MILESTONE-AUDIT.md` for the (partial-scope) closing scorecard.
