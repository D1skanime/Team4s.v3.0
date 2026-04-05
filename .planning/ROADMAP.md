# Roadmap: Team4s Admin Anime Intake

## Milestones

- [x] **v1.0 Admin Anime Intake** - Phases 1, 2, 3, 4.1, 4, and 5 shipped on 2026-04-01. Details: [v1.0-ROADMAP.md](/C:/Users/admin/Documents/Team4s/.planning/milestones/v1.0-ROADMAP.md)
- [ ] **v1.1 Asset Lifecycle Hardening** - Phases 6 and 7 are verified, with Phase 07 approved in human UAT on 2026-04-05; Phase 8 remains the next lifecycle planning target.

## Current Direction

v1.1 focuses on the anime manual-create/upload path first: V2-first media lifecycle behavior, consistent provisioning, and operator-safe asset handling without Jellyfin dependence.

## Phases

- [x] **Phase 6: Provisioning And Lifecycle Foundations** - Establish the anime-first V2 provisioning contract, validation, auditability, and storage-safe lifecycle rules.
- [x] **Phase 7: Generic Upload And Linking** - Build the reusable anime upload and V2 linking path for multiple asset types in manual create/edit flows.
- [ ] **Phase 8: Replace/Delete Cleanup And Operator UX** - Finish anime asset replace/delete cleanup semantics and the operator-facing lifecycle controls.

## Phase Details

### Phase 6: Provisioning And Lifecycle Foundations
**Goal**: Admins can provision canonical anime media folders safely and rely on one validated V2 lifecycle contract before broader upload work begins.
**Depends on**: v1.0 shipped state
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, LIFE-02, LIFE-03, LIFE-04
**Success Criteria** (what must be TRUE):
  1. Manual anime create/upload can provision canonical anime asset folders through the V2-first lifecycle seam without Jellyfin input.
  2. Re-running provisioning is idempotent and reports whether folders already existed or were created.
  3. Unsafe anime references and unsafe paths are rejected before any filesystem mutation occurs.
  4. Lifecycle and provisioning failures return operator-usable validation and storage details and remain attributable to the acting admin.

### Phase 7: Generic Upload And Linking
**Goal**: Admins can upload and link multiple anime asset types through one reusable V2 contract instead of slot-specific special cases.
**Depends on**: Phase 6
**Requirements**: UPLD-01, UPLD-02, UPLD-03
**Status**: Verified and human-approved on 2026-04-05
**Plans**: 4 plans
Plans:
- [x] `07-01-PLAN.md` - Generalize the backend upload/link contract for all supported anime asset kinds.
- [x] `07-02-PLAN.md` - Generalize the frontend typed helpers and asset-kind mutation seam.
- [x] `07-03-PLAN.md` - Close edit-route UI reachability for `logo` and `background_video` using the existing generic seam.
- [x] `07-04-PLAN.md` - Close create-route UI reachability for staged non-cover manual uploads and linking.
**Success Criteria** (what must be TRUE):
  1. Admin can upload supported anime asset types through one generic admin upload seam.
  2. The upload seam supports at least cover, banner, logo, background, and background video.
  3. Uploaded assets are linked to the correct anime and slot through one reusable V2 persistence path.

### Phase 8: Replace/Delete Cleanup And Operator UX
**Goal**: Admins can replace or remove persisted anime assets confidently, with defined cleanup behavior and clear UI feedback.
**Depends on**: Phase 7
**Requirements**: UPLD-04, UPLD-05, LIFE-01
**Success Criteria** (what must be TRUE):
  1. Admin can replace an existing asset and immediately see the new asset as the active persisted slot value.
  2. Admin can remove an existing asset from an anime slot without damaging the owning record or leaving broken active state.
  3. Replacing or deleting an asset follows a defined cleanup rule so old files do not remain as silent orphans.

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Admin Anime Intake | 6 | 23 | Complete | 2026-04-01 |
| v1.1 Asset Lifecycle Hardening | 3 | 6 | 2 of 3 phases verified | - |
