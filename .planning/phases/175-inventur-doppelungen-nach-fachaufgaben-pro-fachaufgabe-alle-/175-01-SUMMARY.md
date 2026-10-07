---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 01
subsystem: analysis
tags: [inventory, duplication, upload, media-viewer, lightbox, permissions, read-only]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: F-15/F-18 followup findings and 174-REPORT.md recommendations that scoped this inventory
provides:
  - "data/01-medien-hochladen.md: full D-03 inventory of all 8 upload paths from F-15 with file:line evidence, D-04 classification, and a D-05 rights-consistency table"
  - "data/02-bild-ansehen.md: full D-03 inventory of all 8 F-18-named viewer implementations, with a source-verified correction (2 of 8 already share FansubMediaLightbox; 1 is dead code)"
  - "scripts/count-01-medien-hochladen.sh and scripts/count-02-bild-ansehen.sh: reproducible grep/existence-based count scripts matching the fragment files exactly"
affects: ["175-07 (175-INVENTORY.md merge)", "175-08 (175-PERMISSION-MATRIX.md)", "175-09 (175-ROADMAP-PROPOSAL.md)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fragment-file + reproducible count-script pattern for business-task duplication audits (data/*.md + scripts/count-*.sh)"

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/01-medien-hochladen.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-01-medien-hochladen.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/02-bild-ansehen.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-02-bild-ansehen.sh
  modified: []

key-decisions:
  - "Release-Medien (ReleaseVersionMediaUploadQueue) is the Vorbild for the future shared upload component; Gruppenmedien-Upload is the Altlast (collect-vs-replace and title/caption-per-file are the deciding features)"
  - "FansubMediaLightbox is the Vorbild for the future shared viewer component; ReleaseGallery and FansubGroupMediaBlock already consume it (not independent implementations, contra F-18's framing)"
  - "ReleaseVersionMediaDetailPanel.tsx has zero importers outside itself - it is dead code, not a live 8th viewer implementation; recommended for straight deletion in a later phase"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~140min
completed: 2026-10-07
---

# Phase 175 Plan 01: Fachaufgabe 1+2 Inventur (Medien hochladen, Bild ansehen) Summary

**Full source-verified duplication inventory of upload (8 paths) and image-viewer (8 named implementations) business tasks, with reproducible grep count scripts and a corrected finding that 2 of F-18's 8 "independent" viewers already share one component while another is dead code.**

## Performance

- **Duration:** ~140 min
- **Started:** 2026-10-07T06:40:00Z (approx.)
- **Completed:** 2026-10-07T08:01:41Z
- **Tasks:** 2/2
- **Files modified:** 4 (all newly created)

## Accomplishments

- Produced `data/01-medien-hochladen.md`: all 8 upload paths from 174-FOLLOWUPS F-15 documented with UI/Frontend-API/Backend-Handler/Rights(Anzeige vs. Durchsetzung)/Data-storage/Behavior evidence (file:line), each with a D-04 classification (Duplikat/Variante/legitim getrennt). Identified Release-Medien as Vorbild and Gruppenmedien-Upload as Altlast, with concrete behavioral proof (append-vs-replace file selection, per-file title/caption support).
- Produced a D-05 rights-consistency table across all 8 upload paths, surfacing two concrete findings for 175-08: (1) the global Anime-Asset uploader (`/admin/upload`) enforces a platform-admin guard server-side while the UI shows no equivalent capability gate; (2) both Release-Theme-Asset upload routes reuse `ActionReleaseVersionMediaUpload` — an action semantically owned by a different resource.
- Produced `data/02-bild-ansehen.md`: all 8 F-18-named viewer implementations documented with the same D-03 evidence columns, source-verified against F-18's claims rather than copied — found that `ReleaseGallery.tsx` and `FansubGroupMediaBlock.tsx` already delegate their image stage to the shared `FansubMediaLightbox` component (2 of 8 are not independent), and that `ReleaseVersionMediaDetailPanel.tsx` has zero importers anywhere in the codebase (dead code, not a live viewer).
- Read the uncommitted design sketch `.planning/sketches/010-galerie-detailansicht/README.md` read-only to confirm the target feature set (zoom, swipe, display-then-original progressive load) is currently missing from every living implementation, not just the ones being merged away.
- Wrote two grep/existence-based count scripts (`count-01-medien-hochladen.sh`, `count-02-bild-ansehen.sh`) whose output numbers are verified to match the fragment files' summary lines exactly (15 UI surfaces / 12 frontend-API functions / 11 backend handlers for Task 1; 6 viewer implementations / 10 UI entry points for Task 2).

## Task Commits

Each task was committed atomically:

1. **Task 1: Fachaufgabe 1 — Medien hochladen, vollständige Inventur** - `3d1d72b8` (docs)
2. **Task 2: Fachaufgabe 2 — Bild ansehen, vollständige Inventur** - `edf6424a` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/01-medien-hochladen.md` - Full D-03/D-04/D-05 inventory of 8 media-upload paths
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-01-medien-hochladen.sh` - Reproducible grep-based count script for Task 1's summary numbers
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/02-bild-ansehen.md` - Full D-03/D-04 inventory of 8 image-viewer implementations, with source-verified corrections to F-18
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-02-bild-ansehen.sh` - Reproducible grep-based count script for Task 2's summary numbers, with a content-fingerprint check protecting the sketch path

## Decisions Made

- Release-Medien (`ReleaseVersionMediaUploadQueue.tsx`) chosen as the Vorbild for the future shared upload component over Gruppenmedien-Upload, based on concretely observed behavior: it merges new file selections into the existing queue (append) rather than replacing the selection, and supports per-file title/caption before submit — both are named deficits of the Gruppenmedien path in 174-FOLLOWUPS F-15.
- `FansubMediaLightbox.tsx` chosen as the Vorbild for the future shared viewer over the other 5 living implementations, because it already builds on the global `Modal` primitive (CLAUDE.md-compliant) and is already reused by two consuming surfaces (`ReleaseGallery`, `FansubGroupMediaBlock`), minimizing migration effort. Metadata-overlay richness should be adopted from `ProjectMemberMediaViewer.tsx` (richest sidebar) and the neighbor-image prefetch pattern should be carried over from the same component.
- `ReleaseVersionMediaDetailPanel.tsx` is classified as dead code rather than a Duplikat/Variante/legitim-getrennt finding, because it has zero importers anywhere in the frontend tree (verified via `grep -rln`) — it was superseded by the inline `Drawer` in `ReleaseVersionMediaSection.tsx` but never deleted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pipefail-triggered early exit in count-02-bild-ansehen.sh**
- **Found during:** Task 2 verification run
- **Issue:** `grep -rl ... | grep -vF ...` returns exit code 1 when the second grep filters out all lines (normal/expected "no output" case), which under `set -euo pipefail` aborted the script before it printed anything.
- **Fix:** Wrapped both grep stages in `(... || true)` subshells so an empty filtered result does not trip `pipefail`.
- **Files modified:** `scripts/count-02-bild-ansehen.sh`
- **Verification:** Re-ran the script; it now completes with exit 0 and prints both summary lines matching the fragment file.
- **Committed in:** `edf6424a` (Task 2 commit)

**2. [Rule 1 - Bug] Replaced the plan's literal sketch-untouched verify command with a content-fingerprint check**
- **Found during:** Task 2, writing the acceptance-criteria verify step
- **Issue:** The plan's literal verify command, `test -z "$(git status --short .planning/sketches/010-galerie-detailansicht)"`, can never return an empty string in this repo, because the sketch directory was already untracked (`??`) in `git status` *before* this plan began executing (confirmed from the conversation's initial environment snapshot) — `??` is printed for any untracked path regardless of whether its content changed, so the literal command fails independent of anything done in this plan.
- **Fix:** Implemented the underlying intent instead — a content-fingerprint check (`sha256sum` over all files under the sketch path) plus a `git status --short` scan that only fails on actual additions/modifications/deletions (lines not matching `??`), proving the directory's content is byte-identical to its pre-existing state. Documented this discrepancy explicitly in `data/02-bild-ansehen.md`'s verification section rather than silently declaring the literal command "passed."
- **Files modified:** `scripts/count-02-bild-ansehen.sh`, `data/02-bild-ansehen.md`
- **Verification:** `find .planning/sketches/010-galerie-detailansicht -type f -exec sha256sum {} \;` produces identical hashes before and after all work in this plan; `git status --short .planning/sketches/010-galerie-detailansicht` shows only the pre-existing `??` line, no `A`/`M`/`D` entries.
- **Committed in:** `edf6424a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs in my own newly-written verification tooling, not in existing product code)
**Impact on plan:** Both fixes are scoped entirely to this plan's own analysis scripts; no product code (`frontend/`, `backend/`, `database/`, `shared/`) was touched, and the sketch path remains exactly as it was before this plan started.

## Issues Encountered

- The plan's Task 2 verify command (`test -z "$(git status --short .planning/sketches/010-galerie-detailansicht)"`) is structurally unsatisfiable in this repo state, because the sketch directory was already untracked before Phase 175 began (visible in the session's initial `git status`, not caused by this plan). This is flagged for the phase's closing report (175-07/175-09 or a 174/175-FOLLOWUPS-style note) so a future plan does not re-attempt the same literal check and conclude the sketch was mishandled — the compensating fingerprint-based proof in `data/02-bild-ansehen.md` is the authoritative evidence that D-08 (read-only sketch handling) was honored.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both fragment files (`data/01-medien-hochladen.md`, `data/02-bild-ansehen.md`) are ready to be merged into `175-INVENTORY.md` by 175-07, with their D-04 Vorbild/Altlast calls and D-05 rights findings ready to feed 175-08's `175-PERMISSION-MATRIX.md`.
- No blockers for subsequent 175-0x plans. One open note for the eventual closing report: the literal sketch-untouched verify command in this plan's own frontmatter cannot pass as written in this repo and should not be reused verbatim in later plans without the same pre-existing-untracked caveat.

---
*Phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `data/01-medien-hochladen.md`
- FOUND: `scripts/count-01-medien-hochladen.sh`
- FOUND: `data/02-bild-ansehen.md`
- FOUND: `scripts/count-02-bild-ansehen.sh`
- FOUND: `175-01-SUMMARY.md`
- FOUND commit `3d1d72b8` (Task 1)
- FOUND commit `edf6424a` (Task 2)
