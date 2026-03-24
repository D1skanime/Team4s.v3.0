# Requirements: Team4s Admin Anime Intake

**Defined:** 2026-03-24
**Core Value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.

## v1 Requirements

### Intake Workflow

- [x] **INTK-01**: Admin can start anime creation by choosing either a manual flow or a Jellyfin-assisted flow.
- [ ] **INTK-02**: Admin can review and edit all proposed anime values in a draft form before any anime record is created.
- [ ] **INTK-03**: Admin can cancel a Jellyfin-assisted draft without creating a Team4s anime record.
- [x] **INTK-04**: Admin can save a new anime when only `title` and `cover` are present.
- [x] **INTK-05**: Admin can create and maintain an anime without any Jellyfin linkage.
- [x] **INTK-06**: Admin can edit an existing anime through the same ownership-aware admin surface used by intake.

### Jellyfin Source Selection

- [ ] **JFIN-01**: Admin can search or browse Jellyfin candidates before creating an anime from Jellyfin.
- [ ] **JFIN-02**: Admin can see Jellyfin item identity and path during source selection.
- [ ] **JFIN-03**: Admin can still see the linked Jellyfin item identity and path later while editing a Jellyfin-linked anime.
- [ ] **JFIN-04**: Admin can import a Jellyfin candidate into an editable draft that prefills available metadata before save.
- [ ] **JFIN-05**: Admin can review Jellyfin-provided description, year, genres or tags, AniDB ID, cover, logo, banner, background, and background video in the draft before deciding to save.
- [ ] **JFIN-06**: Admin can accept or override a suggested anime type derived from Jellyfin folder structure or naming context.

### Data Ownership And Provenance

- [ ] **OWNR-01**: Admin can see which editable metadata fields currently come from Jellyfin and which are manually maintained.
- [ ] **OWNR-02**: Admin can save manual field values without later Jellyfin re-sync overwriting non-empty manually maintained values.
- [ ] **OWNR-03**: Admin can intentionally clear a field and have a later Jellyfin re-sync refill that now-empty field.
- [ ] **OWNR-04**: Admin can re-sync a Jellyfin-linked anime without creating a new anime record.
- [ ] **OWNR-05**: Admin can see which Jellyfin-linked values would change before a re-sync is applied.

### Asset Management

- [ ] **ASST-01**: Admin can see which asset slots came from Jellyfin, including cover, logo, banner, background, and background video.
- [ ] **ASST-02**: Admin can remove a Jellyfin-derived asset from an individual asset slot without deleting the anime.
- [ ] **ASST-03**: Admin can replace a Jellyfin-derived asset with a manual asset for the same slot.
- [x] **ASST-04**: Admin can continue using the existing cover upload flow inside the new anime intake and edit workflow.
- [ ] **ASST-05**: Admin can keep manual replacement assets from being silently replaced by later Jellyfin re-sync.

### Relation Management

- [ ] **RELA-01**: Admin can assign and maintain anime relation entries through backend-backed admin UI rather than direct database work.
- [ ] **RELA-02**: Admin can create a relation from one anime to another existing anime.
- [ ] **RELA-03**: Admin can update an existing relation.
- [ ] **RELA-04**: Admin can delete an existing relation.
- [ ] **RELA-05**: Admin can choose relation labels `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, and `Zusammenfassung`.
- [ ] **RELA-06**: Admin relation actions use the existing normalized relation tables instead of introducing a second relation store.
- [ ] **RELA-07**: Admin cannot create invalid relation entries such as self-links or duplicate relations.

### Admin Reliability

- [ ] **RLY-01**: Admin can see validation failures clearly in the UI while creating, editing, syncing, or changing relations.
- [ ] **RLY-02**: Admin can see Jellyfin fetch or sync failures clearly in the UI with enough context for quick debugging.
- [x] **RLY-03**: Admin-triggered create, update, resync, asset removal, upload, and relation-change actions are durably attributable to the acting admin user ID.
- [x] **RLY-04**: Admin-facing workflow changes keep implementation modular so production code files do not grow beyond the 450-line project limit.

## v2 Requirements

### Intake Extensions

- **INTX-01**: Admin can upload logo, banner, background, and background video through fully productionized manual upload flows.
- **INTX-02**: Admin can enrich anime automatically through a later AniSearch crawler workflow.
- **INTX-03**: Admin can run bulk or batch Jellyfin intake and re-sync workflows safely.

### Governance And History

- **GOV-01**: Admin workflows support finer-grained access rules beyond the current admin-only model.
- **GOV-02**: Admin can inspect durable historical integration or validation error history beyond immediate UI feedback.
- **GOV-03**: Admin can manage a broader relation taxonomy than the four approved V1 labels.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Legacy database migration or backfill | Current rollout is defining and stabilizing the workflow, not migrating old production data |
| Fine-grained access control redesign | Separate concern from the admin anime workflow itself |
| AniSearch crawler automation | Deferred until manual and Jellyfin intake behavior is stable |
| Full non-cover manual upload parity | Cover upload exists today; the other slots need later dedicated upload work |
| Broad relation taxonomy beyond the approved V1 labels | First relation workflow should stay narrow and understandable |
| Bulk intake or bulk re-sync | Higher operational risk than single-record admin workflows in this phase |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTK-01 | Phase 2 | Complete |
| INTK-02 | Phase 2 | Pending |
| INTK-03 | Phase 3 | Pending |
| INTK-04 | Phase 2 | Complete |
| INTK-05 | Phase 2 | Complete |
| INTK-06 | Phase 1 | Complete |
| JFIN-01 | Phase 3 | Pending |
| JFIN-02 | Phase 3 | Pending |
| JFIN-03 | Phase 4 | Pending |
| JFIN-04 | Phase 3 | Pending |
| JFIN-05 | Phase 3 | Pending |
| JFIN-06 | Phase 3 | Pending |
| OWNR-01 | Phase 4 | Pending |
| OWNR-02 | Phase 4 | Pending |
| OWNR-03 | Phase 4 | Pending |
| OWNR-04 | Phase 4 | Pending |
| OWNR-05 | Phase 4 | Pending |
| ASST-01 | Phase 4 | Pending |
| ASST-02 | Phase 4 | Pending |
| ASST-03 | Phase 4 | Pending |
| ASST-04 | Phase 2 | Complete |
| ASST-05 | Phase 4 | Pending |
| RELA-01 | Phase 5 | Pending |
| RELA-02 | Phase 5 | Pending |
| RELA-03 | Phase 5 | Pending |
| RELA-04 | Phase 5 | Pending |
| RELA-05 | Phase 5 | Pending |
| RELA-06 | Phase 5 | Pending |
| RELA-07 | Phase 5 | Pending |
| RLY-01 | Phase 5 | Pending |
| RLY-02 | Phase 4 | Pending |
| RLY-03 | Phase 1 | Complete |
| RLY-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after research-informed rewrite*
