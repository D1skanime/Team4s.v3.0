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

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-05 after Phase 09 create-time enrichment planning*
