# Requirements: Team4s Asset Lifecycle Hardening

**Defined:** 2026-04-02
**Core Value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.

## v1 Requirements

### Provisioning

- [ ] **PROV-01**: Admin can provision the canonical asset folder structure for an anime with one explicit action.
- [ ] **PROV-02**: Manual anime create without Jellyfin data auto-provisions the canonical anime asset folders on first upload.
- [ ] **PROV-03**: Running provisioning repeatedly is idempotent and reports whether folders were created or already present.
- [ ] **PROV-04**: Provisioning blocks invalid entity IDs, invalid entity types, and unsafe paths before any filesystem change is attempted.

### Upload Lifecycle

- [x] **UPLD-01**: Admin can upload manual assets through one generic admin upload contract instead of slot-specific special cases.
- [x] **UPLD-02**: The generic upload contract supports at least `cover`, `banner`, `logo`, `background`, and `background_video`.
- [x] **UPLD-03**: Uploaded anime assets are linked to the correct anime and asset slot through one reusable V2 persistence path.
- [ ] **UPLD-04**: Admin can replace an existing asset in a slot and immediately see that the new asset is the active persisted asset.
- [ ] **UPLD-05**: Admin can remove an existing asset from an anime slot without deleting the owning anime record.

### Lifecycle Safety

- [ ] **LIFE-01**: Replacing or deleting an asset follows a defined cleanup rule so old files do not remain as silent orphans.
- [ ] **LIFE-02**: Upload, replace, delete, and provisioning failures return operator-usable validation and storage error details.
- [ ] **LIFE-03**: Asset lifecycle actions are durably attributable to the acting admin user ID.
- [ ] **LIFE-04**: Asset lifecycle rules are reusable across anime asset slots in the V2 schema instead of being hardcoded around anime covers only.

### Create-Time Enrichment

- [ ] **ENR-01**: Admin can load AniSearch create-time enrichment only by entering an explicit AniSearch ID before local anime creation.
- [ ] **ENR-02**: AniSearch access is centrally limited to one request at a time with at least two seconds between requests, with no free search or crawl endpoints.
- [ ] **ENR-03**: If an AniSearch ID already maps to an existing local anime, the flow redirects to that anime instead of creating a duplicate record.
- [ ] **ENR-04**: Create-time merge priority is strict `manual > AniSearch > Jellysync`, including fill-only handling for metadata and media.
- [ ] **ENR-05**: AniSearch relation import writes only locally resolvable approved relations, skips unresolved relations, and leaves the draft usable when enrichment fails.

### Edit-Time AniSearch Enrichment

- [x] **ENR-06**: Admin can load AniSearch enrichment from `/admin/anime/[id]/edit` by entering an explicit AniSearch ID, receive the next draft state first, and still save through the existing edit PATCH flow.
- [x] **ENR-07**: Edit-route AniSearch enrichment runs in override mode with explicit protected fields; protected fields stay untouched, and provisional lookup text used only for candidate search is replaceable until the operator explicitly locks it.
- [x] **ENR-08**: If an AniSearch ID already belongs to a different local anime during edit enrichment, the endpoint returns a conflict with redirect metadata instead of silently reassigning provenance.
- [x] **ENR-09**: AniSearch enrichment on edit auto-applies only approved, locally resolvable relations to `anime_relations`, using `anisearch:{id}` lookup first and title fallback second, without duplicating existing rows.
- [x] **ENR-10**: Create and edit flows persist AniSearch provenance as `source='anisearch:{id}'`, and create persists resolved AniSearch relations best-effort after anime creation with operator-visible warning metadata when relation follow-through fails.

#### Phase 11 Wave 0 Contract Rules

- Duplicate AniSearch ownership on edit is a `409` conflict that returns `existing_anime_id`, `existing_title`, and `redirect_path`; the edit endpoint must not silently move `source='anisearch:{id}'` from one anime to another.
- Edit-route AniSearch enrichment returns the next draft first. Persisted AniSearch provenance remains part of the regular edit PATCH contract through `source='anisearch:{id}'` instead of being hidden as an enrichment side effect.
- Explicit AniSearch field protection is session-scoped. Provisional lookup text used only to find a source candidate stays replaceable until the operator explicitly protects that field, matching D-05.
- Create-time AniSearch relation persistence is best-effort follow-through after anime creation. Warning metadata belongs in the create response envelope so operators can see partial relation persistence outcomes without losing a successful create.

### Create Tags And Metadata Refactor

- [ ] **TAG-01**: Normalized `tags` and `anime_tags` tables exist and anime tag links are created, updated, and deleted through the same authoritative persistence path as genres.
- [ ] **TAG-02**: Admin can edit tags on `/admin/anime/create` through a dedicated visible metadata card that supports manual free-text entry and suggestion-based filling from a live token list.
- [ ] **TAG-03**: Provider-supplied tags (Jellyfin or AniSearch) hydrate into the same shared token state used for manual tags on the create page so imported and manual additions converge in one UI.
- [ ] **TAG-04**: The create-page metadata implementation is refactored so no single page-level file exceeds 700 lines after the tags work is added.
- [ ] **TAG-05**: New or substantially touched create metadata sections and helper functions include short purpose comments explaining what a block does and when a helper should be used.

## v2 Requirements

### Asset Operations

- **ASTX-01**: Admin can run batch provisioning for multiple anime or groups safely.
- **ASTX-02**: Admin can inspect historical asset changes and cleanup outcomes.
- **ASTX-03**: Admin can configure storage policies such as retention, archive, or soft-delete behavior per asset type.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk migration or backfill of legacy media hosts | This milestone is about establishing the safe lifecycle contract first |
| Public-site redesign of media presentation | The focus is admin lifecycle behavior, not public UI changes |
| Automatic transcoding or media derivative generation | Separate concern from generic upload/provisioning semantics |
| Reopening the full Jellyfin intake product flow | Intake is shipped; only narrow linkage/lifecycle follow-through belongs here |
| Broader auth redesign | Existing admin-only model remains sufficient for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | Phase 6 | Pending |
| PROV-02 | Phase 6 | Pending |
| PROV-03 | Phase 6 | Pending |
| PROV-04 | Phase 6 | Pending |
| UPLD-01 | Phase 7 | Complete |
| UPLD-02 | Phase 7 | Complete |
| UPLD-03 | Phase 7 | Complete |
| UPLD-04 | Phase 8 | Pending |
| UPLD-05 | Phase 8 | Pending |
| LIFE-01 | Phase 8 | Pending |
| LIFE-02 | Phase 6 | Pending |
| LIFE-03 | Phase 6 | Pending |
| LIFE-04 | Phase 6 | Pending |
| ENR-01 | Phase 9 | Pending |
| ENR-02 | Phase 9 | Pending |
| ENR-03 | Phase 9 | Pending |
| ENR-04 | Phase 9 | Pending |
| ENR-05 | Phase 9 | Pending |
| ENR-06 | Phase 11 | Complete |
| ENR-07 | Phase 11 | Complete |
| ENR-08 | Phase 11 | Complete |
| ENR-09 | Phase 11 | Complete |
| ENR-10 | Phase 11 | Complete |
| TAG-01 | Phase 10 | Pending |
| TAG-02 | Phase 10 | Pending |
| TAG-03 | Phase 10 | Pending |
| TAG-04 | Phase 10 | Pending |
| TAG-05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-09 after Phase 11 AniSearch gap closure completion*
