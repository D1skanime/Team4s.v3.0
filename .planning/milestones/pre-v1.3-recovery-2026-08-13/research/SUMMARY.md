# Project Research Summary

**Project:** Team4s Admin Anime Intake
**Domain:** Internal admin workflow for anime intake, Jellyfin-assisted enrichment, provenance-aware assets, and relation management
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is not a greenfield CMS. It is a brownfield admin workflow extension for Team4s, where the core product requirement is safe, operator-controlled anime creation and maintenance inside the existing Go, Next.js, Postgres, and Redis stack. The research is consistent: experts solve this kind of workflow with preview-before-save, explicit source identity, durable provenance, and narrow write-side services rather than background automation or opaque import pipelines.

The recommended approach is to keep the current stack and add a stricter intake boundary. Jellyfin should remain an assistive source, not an authority. Preview must stay non-persistent until explicit commit, manual edits must remain authoritative after save, asset origins must be visible and replaceable, and relation CRUD should stay constrained to the approved V1 labels. The main build-order implication is that schema and ownership rules come first, then manual intake, then Jellyfin-assisted create, then asset provenance and safe resync, with relation CRUD layered on once canonical graph rules are enforced.

The main risks are hidden persistence during preview, weak source identity, simplistic "non-empty wins" overwrite protection, shallow asset provenance, and graph corruption in relation CRUD. Mitigation is straightforward but non-optional: separate preview and commit endpoints, persist Jellyfin identity and path snapshots, store field and asset provenance explicitly, treat imported asset removal as suppression rather than deletion, and centralize relation validation and direction rules in service-layer code with transactional writes and audit events.

## Key Findings

### Recommended Stack

Keep the current Team4s stack. There is no research support for adding a queue, CMS, or event-sourcing layer. The work is best served by explicit admin endpoints, transactional Postgres writes, and OpenAPI-first contract changes that fit the existing repo shape.

The important technical addition is not a new platform but a new data ownership model: dedicated source-link, field-state, asset-provenance, and audit storage so the public read model stays simple while the admin workflow becomes traceable and safe.

**Core technologies:**
- Go `1.25.x`: backend orchestration and validation logic, already proven in production and a good fit for transactional import rules.
- Gin: admin-only HTTP handlers, matching the current routing and handler patterns.
- pgx/v5 + Postgres 16: authoritative storage for anime state, provenance, relations, and audit trails.
- Next.js App Router + React: admin workflow UI for intake, preview, edit, provenance badges, and relation CRUD.
- Redis 7: optional short-lived preview or diagnostic state only, not durable provenance storage.
- OpenAPI YAML in `shared/contracts/`: contract-first API evolution to keep frontend and backend aligned.

### Expected Features

V1 is an internal operator workflow, so the table stakes are trust and reversibility rather than scale. The research consistently prioritizes editable preview flows, explicit manual-vs-Jellyfin ownership, operator-visible provenance, narrow relation management, and actionable error handling over automation.

**Must have (table stakes):**
- Manual vs Jellyfin-assisted mode choice with a shared review/edit form before any record is created.
- Preview-before-save and cancel-without-side-effects for Jellyfin-assisted intake.
- Minimum viable create path with only `title` and `cover` required.
- Jellyfin search/select using stable item ID plus visible path metadata.
- Field-prefill from Jellyfin into an editable draft, not auto-create.
- Visible field and asset source badges plus safe resync rules that preserve manual authority.
- Asset removal/replacement for Jellyfin-derived media without deleting the anime.
- Relation CRUD for the four approved V1 labels only.
- Inline validation, operator-safe Jellyfin errors, and audit attribution by acting user ID.

**Should have (competitive):**
- Resync preview/apply flow that clearly shows what is fillable, blocked, unchanged, or missing upstream.
- Slot-based asset panels with replacement history and provenance visibility inside the edit UI.
- Drift indicators for overridden Jellyfin-backed fields so operators can see upstream changes without auto-overwrite.

**Defer (v2+):**
- Bulk create or bulk resync workflows.
- Deep field history and durable integration error history.
- Richer relation taxonomy, bidirectional helpers, or graph visualization.
- General-purpose DAM/media-library redesign beyond this anime workflow.

### Architecture Approach

The architecture recommendation is to preserve the current layered Team4s structure and add focused write-side services instead of extending `CreateAnime` or `AdminContentRepository` into monoliths. Preview and commit should be separate use cases, both manual and Jellyfin-assisted creation should emit a shared draft contract, asset handling should be slot-based, and resync should be implemented as diff-preview plus explicit apply after provenance exists.

**Major components:**
1. `AnimeIntakeService` - builds manual or Jellyfin-backed drafts, validates them, and commits final create transactions.
2. `AnimeAssetService` - owns slot-based assets, provenance, replacement, removal, and compatibility projection to legacy cover fields.
3. `AnimeResyncService` - computes Jellyfin diffs and applies only allowed updates under fill-only/manual-authority rules.
4. `AnimeRelationService` - enforces allowed V1 relation types, canonical direction, dedupe, and self-link prevention.
5. `AdminAuditService` - records durable admin mutations with actor, target, source context, and concise before/after summaries.

### Critical Pitfalls

1. **Preview that persists too early** - keep preview as a DTO only; no anime rows, provenance rows, or durable side effects before explicit commit.
2. **Weak Jellyfin source identity** - persist Jellyfin item ID plus visible path/library snapshot; never fall back to title matching for resync.
3. **"Non-empty wins" as override logic** - store explicit field-level provenance and last-imported values so manual edits, manual clears, and re-adoption of upstream values behave predictably.
4. **Imported asset removal without provenance state** - model asset origin and suppression explicitly so removed Jellyfin assets do not reappear on later syncs.
5. **Raw relation CRUD that corrupts the graph** - enforce no self-links, uniqueness, allowed V1 enums, and canonical direction in the service layer.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Ownership Schema And Contracts
**Rationale:** Provenance, audit, and compatibility projections are prerequisites for every later workflow.
**Delivers:** `admin_audit_log`, external-source linkage, field-state/provenance, slot-based asset tables, and shared intake/resync/relation DTOs in OpenAPI.
**Addresses:** source visibility, auditability, safe data ownership, operator-safe errors.
**Avoids:** hidden preview persistence, weak source identity, and validation drift.

### Phase 2: Manual Intake Baseline
**Rationale:** This is the lowest-risk path and proves the create transaction, validation, asset-slot projection, and UX without provider complexity.
**Delivers:** mode choice, manual preview/edit flow, final commit path, minimum required fields, and redirect into existing edit surfaces.
**Addresses:** manual creation, review-before-save, low-friction V1 creation.
**Avoids:** season-based modeling mistakes and preview/save mismatch.

### Phase 3: Jellyfin-Assisted Create
**Rationale:** Jellyfin preview should reuse the intake contract after the manual path is stable, not define its own persistence path.
**Delivers:** Jellyfin search/select, preview hydration, explicit commit, persisted source identity/path snapshot, and accepted-asset selection.
**Uses:** existing Go/Gin handlers, Jellyfin client seams, Postgres transactions, OpenAPI contracts, Next.js shared draft editor.
**Implements:** `AnimeIntakeService` with a read-only preview step and transactional commit.

### Phase 4: Asset Provenance And Safe Resync
**Rationale:** Resync is only safe once source linkage, field ownership, and asset provenance are already durable.
**Delivers:** source badges, slot-based asset panel, remove/replace behavior, resync preview/apply, fill-only updates, and suppression of removed imported assets.
**Addresses:** manual-authoritative editing, removable Jellyfin media, ongoing maintenance of linked anime.
**Avoids:** "non-empty wins" bugs, asset resurrection, and silent overwrite of curated data.

### Phase 5: Relation CRUD And Admin Reliability
**Rationale:** Relation writes and operator support tooling should land once the intake model and ownership semantics are stable.
**Delivers:** relation list/create/update/delete for the four approved labels, canonical direction enforcement, duplicate/self-link protection, structured admin error envelopes, and richer audit summaries.
**Addresses:** explicit franchise linking, debugging, traceability, and admin-safe failure handling.
**Avoids:** graph corruption, opaque errors, and audit logs too thin to explain outcomes.

### Phase Ordering Rationale

- Schema and shared contracts must come first because Jellyfin create, resync, and asset replacement all depend on explicit ownership state.
- Manual intake should precede Jellyfin-assisted create because it validates the core draft and commit model without external integration noise.
- Resync must come after persisted source linkage and provenance; otherwise overwrite rules cannot be enforced safely.
- Relation CRUD belongs after the editorial model is stable and service-layer graph rules are written down centrally.
- Reliability work is partially cross-cutting, but its sharpest value appears once write paths exist and can be audited, retried, and debugged consistently.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Jellyfin-assisted create needs endpoint-level validation against the current Jellyfin item/image metadata actually returned in Team4s environments.
- **Phase 4:** Resync and non-cover asset handling need focused implementation research because the repo only productionizes cover upload today.
- **Phase 5:** Relation CRUD may need a short follow-up on canonical direction semantics if editorial wording and public-display expectations diverge.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Schema, DTO, and audit scaffolding follow well-understood brownfield patterns already documented by the research.
- **Phase 2:** Manual intake is straightforward form-preview-commit work with clear local requirements and no major external unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strong local-codebase fit and reinforced by official Jellyfin capability checks; no new platform is warranted. |
| Features | MEDIUM | Product direction is clear from `PROJECT.md`, but some expectations around asset-management polish and audit depth are inferred from comparable admin tools. |
| Architecture | MEDIUM-HIGH | The service split and build order are well-supported by the brownfield code seams, though the exact table and service boundaries remain design choices. |
| Pitfalls | HIGH | The top risks are concrete, consistent across sources, and backed by both local constraints and official Jellyfin/logging behavior. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Non-cover asset upload/materialization is still immature in the current repo, so roadmap planning should treat logo/banner/background/background-video as provenance-first before full upload parity.
- Exact field-provenance schema shape is still a design decision; planning should choose between row-based and narrow JSONB-backed state before implementation starts.
- The summary assumes one active Jellyfin source per anime in V1; if multi-source intake is desired later, preserve schema flexibility now.
- Resync UX depth remains open: V1 can ship with fill-only apply and concise diff status, but richer before/after previews should stay explicitly deferred.

## Sources

### Primary (HIGH confidence)
- [`.planning/PROJECT.md`](/C:/Users/admin/Documents/Team4s/.planning/PROJECT.md) - project requirements, constraints, workflow boundaries, and current decisions.
- [`.planning/research/STACK.md`](/C:/Users/admin/Documents/Team4s/.planning/research/STACK.md) - recommended stack, data model, provenance, API shape, and brownfield sequencing.
- [`.planning/research/ARCHITECTURE.md`](/C:/Users/admin/Documents/Team4s/.planning/research/ARCHITECTURE.md) - service boundaries, endpoint surface, data flow, and build order.
- [`.planning/research/PITFALLS.md`](/C:/Users/admin/Documents/Team4s/.planning/research/PITFALLS.md) - critical failure modes and phase-specific warnings.
- Jellyfin metadata docs: `https://jellyfin.org/docs/general/server/metadata/` - current metadata and provider behavior relevant to import/resync design.
- OWASP Logging Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html` - audit/logging expectations for operator-visible systems.

### Secondary (MEDIUM confidence)
- [`.planning/research/FEATURES.md`](/C:/Users/admin/Documents/Team4s/.planning/research/FEATURES.md) - table stakes, differentiators, and anti-scope for the admin workflow.
- Jellyfin TypeScript SDK item models and refresh APIs: `https://typescript-sdk.jellyfin.org/interfaces/generated-client.BaseItemDto.html`, `https://typescript-sdk.jellyfin.org/functions/generated-client.ItemRefreshApiAxiosParamCreator.html` - source identity, metadata surface, and why Team4s should restrict sync behavior.
- AniDB relation guidance: `https://wiki.anidb.net/Content%3ARelations` - editorial direction for relation semantics, treated as directional rather than definitive.
- Strapi Media Library docs: `https://docs.strapi.io/cms/features/media-library` - comparative admin expectations for asset replacement and deletion behavior.
- Directus accountability docs: `https://directus.io/docs/guides/auth/accountability` - comparative audit expectations for internal admin systems.

### Tertiary (LOW confidence)
- No additional low-confidence sources were required beyond the documented medium-confidence comparative references above.

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
