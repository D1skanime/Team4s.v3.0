# Roadmap: Team4s Admin Anime Intake

## Overview

This roadmap hardens the existing Team4s admin anime workflow in dependency order: first a reusable ownership-aware editing foundation, then manual intake, then Jellyfin-assisted draft creation, then provenance-aware asset maintenance and safe resync, and finally relation CRUD with operator-safe validation. The sequence follows the research recommendation where schema and ownership rules lead, preview stays non-persistent until explicit save, manual authority is preserved, and the V1 surface remains admin-only, modular, and explicit about provenance.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Ownership Foundations** - Establish the shared ownership-aware edit surface, audit attribution, and modular contract base.
- [ ] **Phase 2: Manual Intake Baseline** - Deliver the manual preview-before-save workflow with minimum-field creation and existing cover upload.
- [ ] **Phase 3: Jellyfin-Assisted Intake** - Add Jellyfin source selection and draft prefill without hidden persistence.
- [ ] **Phase 4: Provenance, Assets, And Safe Resync** - Expose source provenance, per-slot asset handling, and fill-only resync behavior.
- [ ] **Phase 5: Relations And Reliability** - Complete relation CRUD and validation-centered admin reliability on top of the stabilized ownership model.

## Phase Details

### Phase 1: Ownership Foundations
**Goal**: Admins can use one ownership-aware anime editing foundation that is auditable, reusable, and ready for both manual and Jellyfin intake.
**Depends on**: Nothing (first phase)
**Requirements**: INTK-06, RLY-03, RLY-04
**Success Criteria** (what must be TRUE):
  1. Admin can open and maintain an existing anime through the same ownership-aware admin surface pattern that later intake flows will reuse.
  2. Admin-triggered anime mutations are durably attributable to the acting admin user ID for later traceability.
  3. The create/edit workflow behaves as one consistent admin surface instead of diverging into incompatible screens as new intake features are added.
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md - Align authoritative anime metadata writes and reads before Phase 1 ownership UI.
- [x] 01-02-PLAN.md - Restore trusted admin actor attribution and durable audit persistence for Phase 1 mutations.
- [x] 01-03-PLAN.md - Extract the shared editor shell and add lightweight ownership visibility without expanding scope.
- [x] 01-04-PLAN.md - Close the remaining repository modularity gaps without changing verified authority or audit behavior.
- [x] 01-05-PLAN.md - Split remaining oversized handler and route wiring files to finish the Phase 1 modularity pass.
**UI hint**: yes

### Phase 2: Manual Intake Baseline
**Goal**: Admins can create and save anime manually through a clear preview-before-save workflow that preserves direct editorial control.
**Depends on**: Phase 1
**Requirements**: INTK-01, INTK-02, INTK-04, INTK-05, ASST-04
**Success Criteria** (what must be TRUE):
  1. Admin can start anime creation by explicitly choosing the manual flow from the intake entry point.
  2. Admin can review and edit a draft form before any new anime record is created.
  3. Admin can save a manual anime when only `title` and `cover` are present, using the existing cover upload flow inside intake and edit.
  4. Admin can create and continue maintaining an anime with no Jellyfin linkage at all.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Jellyfin-Assisted Intake
**Goal**: Admins can use Jellyfin as a preview-only assistive source for anime creation while keeping final control over what gets saved.
**Depends on**: Phase 2
**Requirements**: INTK-03, JFIN-01, JFIN-02, JFIN-04, JFIN-05, JFIN-06
**Success Criteria** (what must be TRUE):
  1. Admin can search or browse Jellyfin candidates and identify the correct source using Jellyfin item identity plus visible path metadata.
  2. Admin can open an editable Jellyfin-backed draft that prefills available metadata and asset slots before any record is saved.
  3. Admin can review Jellyfin-provided description, year, genres or tags, AniDB ID, and media candidates, then accept or override any suggested anime type before save.
  4. Admin can cancel a Jellyfin-assisted draft without creating a Team4s anime record.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Provenance, Assets, And Safe Resync
**Goal**: Admins can safely maintain Jellyfin-linked anime with visible provenance, removable imported assets, and fill-only resync behavior that preserves manual authority.
**Depends on**: Phase 3
**Requirements**: JFIN-03, OWNR-01, OWNR-02, OWNR-03, OWNR-04, OWNR-05, ASST-01, ASST-02, ASST-03, ASST-05, RLY-02
**Success Criteria** (what must be TRUE):
  1. Admin can see linked Jellyfin item identity, path, field provenance, and asset provenance while editing a Jellyfin-linked anime.
  2. Admin can preview which Jellyfin-backed values would change before a resync is applied, then run that resync without creating a new anime record.
  3. Admin can keep non-empty manual field values and manual replacement assets from being overwritten, while intentionally cleared fields remain refillable on a later resync.
  4. Admin can remove or replace a Jellyfin-derived asset in an individual slot and understand Jellyfin fetch or sync failures quickly from the UI.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Relations And Reliability
**Goal**: Admins can manage anime relations safely through a validated backend-backed UI that enforces the narrow V1 taxonomy.
**Depends on**: Phase 4
**Requirements**: RELA-01, RELA-02, RELA-03, RELA-04, RELA-05, RELA-06, RELA-07, RLY-01
**Success Criteria** (what must be TRUE):
  1. Admin can create, update, and delete relations between existing anime through the admin UI instead of direct database work.
  2. Admin can choose only the approved V1 relation labels `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, and `Zusammenfassung`.
  3. Admin cannot create self-links or duplicate relations, and invalid relation changes are shown clearly in the admin UI.
  4. Relation changes are stored through the existing normalized relation tables rather than a second relation store.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Ownership Foundations | 5/5 | Complete | 2026-03-24 |
| 2. Manual Intake Baseline | 0/TBD | Not started | - |
| 3. Jellyfin-Assisted Intake | 0/TBD | Not started | - |
| 4. Provenance, Assets, And Safe Resync | 0/TBD | Not started | - |
| 5. Relations And Reliability | 0/TBD | Not started | - |
