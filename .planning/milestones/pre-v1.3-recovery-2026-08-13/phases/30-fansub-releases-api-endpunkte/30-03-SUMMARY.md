---
phase: 30-fansub-releases-api-endpunkte
plan: 03
subsystem: docs
tags: [architecture-docs, release-authority, verification, uat, fansub-releases]

requires:
  - phase: 30-01
    provides: explicit fansub release admin read endpoints
  - phase: 30-02
    provides: frontend release context adoption, rewired ReleaseThemeAssetsSection

provides:
  - Explicit authority classification of fansub_releases, anime_fansub_groups, media_assets, and fansub_group_media in db-runtime-authority-map.md
  - Phase 30 authority note in db-schema-v2.md FansubRelease section and FansubGroupMedia entry
  - Three-case verification guide (existing release, missing anchor, theme-asset continuity) in 30-VERIFICATION.md
  - Detailed operator UAT scenarios with pass criteria and write-boundary documentation in 30-UAT.md

affects:
  - Future phases touching fansub release APIs (must not use fansub_group_media as release media seam)
  - Future contributors reading db-runtime-authority-map.md for release authority guidance

tech-stack:
  added: []
  patterns:
    - Architecture doc update with table-based authority classification
    - Verification artifact with automated command map, evidence checklist, and boundary constraints

key-files:
  created:
    - .planning/phases/30-fansub-releases-api-endpunkte/30-VERIFICATION.md (expanded)
    - .planning/phases/30-fansub-releases-api-endpunkte/30-UAT.md (expanded)
  modified:
    - docs/architecture/db-runtime-authority-map.md
    - docs/architecture/db-schema-v2.md

key-decisions:
  - "fansub_releases is classified as normalized-first for Phase 30 admin reads in the authority map, ending its blocked status for this specific use case"
  - "fansub_group_media remains blocked — not the authoritative runtime seam for release or fansub-admin media; media_assets is the active path"
  - "Write-boundary constraints are documented explicitly so future phases cannot silently drift into free release CRUD or wrong media seams"

requirements-completed:
  - P30-SC5

duration: 3min
completed: 2026-04-30
---

# Phase 30 Plan 03: Fansub-Releases Authority Map and Verification Closeout

**Release API boundary documented and locked: fansub_releases is explicit normalized-first admin authority; media_assets is the active release media seam; fansub_group_media is blocked from new release work.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-30T08:24:03Z
- **Completed:** 2026-04-30T08:26:14Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

### Task 1: Document the release authority and seam boundaries

Updated `docs/architecture/db-runtime-authority-map.md` with a new "Fansub Release Admin API (Phase 30)" section that:

- Classifies `fansub_releases` as **normalized-first** for Phase 30 admin reads (list, canonical, by-id).
- Classifies `anime_fansub_groups` as **normalized-first** for fansub-anime scope axis.
- Classifies `media_assets` as **normalized-first** (active release-adjacent media seam).
- Classifies `fansub_group_media` as **blocked** — table exists in schema but is not an authoritative product path for release or fansub-admin media.

Updated "Overall Recovery Verdict" to include the Phase 30 classification alongside the pre-existing legacy/adapter entries.

Updated `docs/architecture/db-schema-v2.md` with:

- A Phase 30 authority note block before the `FansubRelease` schema section summarizing the four seam decisions.
- A runtime authority note after the `FansubGroupMedia` entry to prevent future misuse.

### Task 2: Close verification and UAT around explicit release context

Expanded `30-VERIFICATION.md` from a sparse stub to a full verification guide:

- Automated verification commands for backend tests, frontend TypeScript check, and frontend build.
- `fansub_group_media` boundary guard (grep check to confirm no Phase 30 handler/repo touches it).
- Evidence checklist for five concrete API response captures.
- Three explicit test cases: existing release, missing anchor (nil-safe response), theme-asset continuity.
- Write-boundary constraint table for future phases (no free release create/delete, no `fansub_group_media` writes).

Expanded `30-UAT.md` with three full operator scenarios:

- **Scenario 1:** Existing canonical release is discoverable — release context loads through the canonical endpoint before any theme-asset mutation.
- **Scenario 2:** Missing canonical release returns an honest state — `{"release": null}` on 200 OK, not a silent empty list.
- **Scenario 3:** Theme-asset flow still works on explicit release context — upload/reload/delete round-trip with stable release identity throughout.

Added explicit sign-off checklists and residual write-boundary awareness table.

## Verification

- `go test ./internal/handlers ./internal/repository -count=1` — all pass (green)
- Acceptance criteria confirmed:
  - `Select-String` for `fansub_releases|anime_fansub_groups|media_assets|fansub_group_media` — 11 matches in db-runtime-authority-map.md
  - `Select-String` for `fansub_releases|media_assets|fansub_group_media` — 6 matches in db-schema-v2.md
  - `30-VERIFICATION.md` contains explicit automated and manual evidence steps (7 section headings)
  - `30-UAT.md` contains operator scenarios for all three release discovery cases (18 matches for key terms)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all verification and UAT artifacts reference real API endpoints, real repository methods, and real schema tables established in Plans 01 and 02. No placeholder text or "coming soon" sections.

## Self-Check: PASSED

- docs/architecture/db-runtime-authority-map.md — FOUND, updated with Phase 30 section
- docs/architecture/db-schema-v2.md — FOUND, updated with authority notes
- .planning/phases/30-fansub-releases-api-endpunkte/30-VERIFICATION.md — FOUND, expanded
- .planning/phases/30-fansub-releases-api-endpunkte/30-UAT.md — FOUND, expanded
- Commits ff15ad14, 20af9671 — both FOUND in git log
- go test ./internal/handlers ./internal/repository — PASS
