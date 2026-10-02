---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 16
subsystem: media
tags: [nextjs, image-optimization, go, display-variant, close-out, backfill, live-uat]

# Dependency graph
requires:
  - phase: 173-07
    provides: "backend/cmd/migrate-display-backfill, the one new CLI package this phase is permitted to add (D-14) -- run against the live database in this plan's Task 3"
  - phase: 173-13
    provides: "ReleaseGallery/PublicReleaseBlock/HeroSection display-preferring component wiring"
  - phase: 173-14
    provides: "fansub public media/banner component wiring"
  - phase: 173-15
    provides: "public member avatar/background display-preferring wiring"
provides:
  - "Task 0a: ResponsiveImage.tsx mirrors next/image's own src validation and falls back to unoptimized rendering for any src outside images.localPatterns/remotePatterns, fixing a live HTTP 500/E426 crash on GET /fansubs/new-subs"
  - "Task 0: ReleaseGallery.tsx's sizes attribute corrected to match its actual 1/2/3-column CSS breakpoints"
  - "Task 1: full automated-suite gate run, every pre-existing/environment-only failure confirmed unrelated to this phase via git log, D-16/D-04/route-count structural checks all passing"
  - "Task 2: structural checkpoint (no new route/endpoint/dropzone, admin/me untouched) approved by the human user"
  - "Task 3: pre-backfill backup (media + DB), DRY_RUN + real backfill run against the live database (with a same-day fix for a path-resolution bug found on the real run), and the full live D-13 UAT on :3300 — all passed. Phase 173 is complete."
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared, framework-neutral data module (publicImagePatterns.mjs + .d.ts companion) as the single source of truth for images.localPatterns/remotePatterns, imported identically by next.config.mjs (Node, no bundler) and ResponsiveImage.tsx (browser bundle)"
    - "Backfill path resolution must normalize both on-disk-relative and '/media/...' URL-form stored paths to the same disk location before touching the filesystem (see Deviations)"

key-files:
  created:
    - frontend/src/lib/images/publicImagePatterns.mjs
    - frontend/src/lib/images/publicImagePatterns.d.ts
    - .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/173-16-TASK3-CHECKLIST.md
    - backend/cmd/migrate-display-backfill/backfill_path_test.go
  modified:
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/src/components/ui/ResponsiveImage.test.tsx
    - frontend/next.config.mjs
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx"
    - frontend/src/components/profile/MembershipsSection.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx
    - backend/cmd/migrate-display-backfill/backfill_generic.go
    - .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Task 0a's isConfiguredForImageOptimization mirrors next/image's exact internal branching (src.startsWith('/') -> hasLocalMatch only; else parse as URL -> hasRemoteMatch) rather than a simplified heuristic, so it accurately predicts whether next/image would throw E426/E231 before it does"
  - "Extracted next.config.mjs's localPatterns/remotePatterns-building data into a plain-JS .mjs module (no Node builtins) instead of importing next.config.mjs directly into the client-bundled ResponsiveImage.tsx"
  - "ReleaseGallery's featured/highlight card sizes is '(max-width: 600px) 100vw, 66vw' because the underlying CSS's last applicable @media(min-width:601px) .featuredCard rule sets grid-column: 1/-1 at every viewport >=601px"
  - "The generic backfill now resolves media_files.path through a single resolveStoredMediaDiskPath helper that accepts both disk-relative paths and '/media/...' URL-form paths (anime/profile assets were stored in URL form; release/fansub assets in disk-relative form) and writes the new display path back in the SAME form as the original, so API responses keep their existing shape"
  - "The generic backfill now skips non-image media_files rows (e.g. background videos) by checking the stored mime type, rather than attempting (and failing) to decode them as images"
  - "Task 3 (backup, backfill, live UAT) was executed jointly by the human user and the orchestrator outside full subagent autonomy, per explicit instruction — the executor prepared the checklist, the user ran it and reported verified results back"

requirements-completed: [REQ-173-01, REQ-173-02, REQ-173-03, REQ-173-04, REQ-173-05, REQ-173-06, REQ-173-07, REQ-173-08, REQ-173-09, REQ-173-10, REQ-173-11, REQ-173-12, REQ-173-13, REQ-173-14, REQ-173-15, REQ-173-16, REQ-173-17, REQ-173-18, REQ-173-19, REQ-173-20, REQ-173-21, REQ-173-22, REQ-173-23, REQ-173-24, REQ-173-25, REQ-173-26, REQ-173-27, REQ-173-28, REQ-173-29, REQ-173-30, REQ-173-31]

# Metrics
duration: "~3h (Tasks 0a/0/1/2) + joint Task 3 session on 2026-10-02/03 (backup, backfill incl. one same-day bugfix, full live D-13 UAT)"
completed: "2026-10-03"
---

# Phase 173 Plan 16: Close-out gate — Summary

**ResponsiveImage now falls back to unoptimized rendering for any src outside the configured image-optimizer allow-list (fixing a live E426/HTTP-500 crash), ReleaseGallery's `sizes` attribute matches its real CSS breakpoints, the full automated-suite gate found zero regressions attributable to this phase, the structural checkpoint was approved, and the backup → backfill (DRY_RUN then real, with one same-day path-resolution fix) → full live D-13 UAT sequence has now been run and passed in its entirety. Phase 173 is complete.**

## Performance

- **Duration:** ~3h for Tasks 0a/0/1/2, plus a joint orchestrator+user session on 2026-10-02/03 for Task 3
- **Completed:** 2026-10-03
- **Tasks:** 6 of 6 (0a, 0, 1, 2, 3, close-out)

## Accomplishments

- **Task 0a (live-UAT finding, E426 crash fix):** `ResponsiveImage.tsx` now checks a `src` against
  `images.localPatterns`/`remotePatterns` (via the shared `frontend/src/lib/images/
  publicImagePatterns` data module, also consumed by `next.config.mjs`) using the same
  `hasLocalMatch`/`hasRemoteMatch` logic `next/image` itself uses, and renders `unoptimized={true}`
  instead of letting `next/image` throw E426/E231.
- **Task 0:** `ReleaseGallery.tsx`'s grid/Kara-preview `sizes` corrected from a stale
  `45vw/40vw/28vw` ladder to one derived from the actual CSS breakpoints.
- **Task 1 (full-suite gate):** `go build ./...`/`go vet ./...` clean; every `go test ./...`/
  `npx vitest run` failure confirmed pre-existing and unrelated via `git log`. D-16, D-04, and the
  route count (98→98) all verified.
- **Task 2:** the structural checkpoint was presented and **approved by the human user**.
- **Task 3 (run jointly by the human user and the orchestrator, 2026-10-02/23:01 through 2026-10-03):**

  **Backups** (before any write operation): `/home/d1sk/backups/pre-173-backfill-20261002-2301/`
  — `team4s_v2.sql` (plain-format `pg_dump`) and `media.tar.gz`.

  **Backfill:**
  - `DRY_RUN=true`: **120/120** candidates processed cleanly (0 failures) — confirmed the backfill's
    read-side logic was sound before touching any file.
  - First real run: **93/137** succeeded, **44 failed**. Root cause: `media_files.path` for
    anime/profile assets is stored in `/media/...` URL form rather than a disk-relative path, and
    the generic backfill read it literally instead of resolving it to the actual file location; a
    background-video asset was also incorrectly treated as an image candidate.
  - **Same-day fix, commit `847ed0e5`** (`fix(173-07): resolve /media URL-form paths in the display
    backfill`): added `resolveStoredMediaDiskPath` to map both URL-form and disk-relative stored
    paths to their real on-disk location (writing the new `display` path back in the same form as
    the original), and restricted the generic backfill to `image/*` mime types only. Added
    `backend/cmd/migrate-display-backfill/backfill_path_test.go` as regression coverage.
  - Second real run (just the 44 previously-failed candidates): **43/43** succeeded. The one
    remaining non-success was a media_files row pointing at an already-deleted asset (expected,
    not a bug — nothing to backfill for a file that no longer exists).
  - Remaining assets without a `display` variant after the backfill: **36 Jellyfin-proxy entries**
    (by design — D-16, these are the non-persisted on-the-fly `imageDisplay.ts` pipeline, out of
    this phase's scope) **+ 1 deleted asset** (expected, see above).

  **Live backend-contract verification (D-13, backend half):** all checked public pages return
  HTTP 200 with zero E426 occurrences (`/fansubs/new-subs`, a fansub project page, `/anime/1`, its
  project page, Release 27's gallery, `/members/timer`); a legacy flat fansub-logo URL correctly
  redirects `301` → `/media/fansub/1/...` (D-17).

  **Live visual UAT (D-13, full) — all passed, confirmed by the human user:**
  1. Release gallery renders sharp; clicking an image shows the original (D-02/D-03).
  2. Mobile viewport renders sharp and single-column, consistent with Task 0's `sizes` fix.
  3. A transparent fansub logo renders correctly cut out (no black/white box) — D-18.
  4. An animated GIF and an animated WebP, used as both an avatar and a release image, render
     publicly animated; an animated, cropped banner also stays animated — D-19 through D-22.
  5. The Kara segment-preview upload path still rejects animated WebP — D-20's one narrow
     exception continues to hold.
  6. The project page, anime detail page, and member profile all render sharp.

  **Performance (D-13):** measured on the `next-server` process with an empty image-optimizer
  cache (`.next/dev/cache/images` cleared), loading the Release 27 gallery on a mobile emulation
  (375px, DPR 3): RSS went from **1221 MB to a peak of 1249 MB (+28 MB)** for the optimization
  work. The container's peak (including a concurrent Playwright/Chromium process used for the
  check) briefly reached **~1.8 GiB / 273% CPU**; the host VM had **~5.9 GB available** afterward.
  **No bottleneck observed.**

## Task Commits

1. **Task 0a (RED):** `cdb17709` (test) — failing tests for the E426-safety fallback
2. **Task 0a (GREEN):** `cccb8036` (feat) — ResponsiveImage falls back to unoptimized
3. **Task 0 (RED):** `9e636674` (test) — failing sizes assertions
4. **Task 0 (GREEN):** `15dcb220` (feat) — ReleaseGallery sizes fix
5. **Task 1:** `148b9612` (fix) — two stale test fixtures corrected
6. **Task 1:** `5b1465f8` (docs) — full-suite-gate findings recorded in deferred-items.md
7. **Task 2:** `96e87789` (docs) — human approval + Task 3 deferral recorded in STATE.md
8. **Task 3 bugfix (found + fixed live during the real backfill run):** `847ed0e5` (fix) —
   `resolveStoredMediaDiskPath` + image-mime-type guard in the generic backfill, with
   `backfill_path_test.go` regression coverage.
9. **Close-out:** this SUMMARY + ROADMAP.md/STATE.md/REQUIREMENTS.md completion updates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two test fixtures corrected to match Task 0a's intended new behavior**
- Found during Task 1's full-suite gate; fixed in `148b9612` (see prior interim SUMMARY content,
  preserved in `deferred-items.md`'s Task 1 section).

**2. [Rule 1 - Bug] Generic backfill misresolved URL-form stored paths and included non-image assets**
- **Found during:** Task 3's first real backfill run against the live database (44/137 failures).
- **Issue:** `media_files.path` for anime/profile assets is stored as a `/media/...` URL rather
  than a disk-relative path; the backfill's path handling assumed disk-relative form everywhere.
  A background-video `media_files` row was also picked up as an image candidate.
- **Fix:** `resolveStoredMediaDiskPath` normalizes both forms to a real filesystem path before any
  read/write, and preserves the original path's form when writing the new `display` entry; the
  candidate selection query/filter now requires an `image/*` mime type.
- **Verification:** re-run against the live database — all 44 previously-failing candidates
  succeeded (43 real successes + 1 correctly-still-skipped already-deleted asset); a DRY_RUN
  re-run afterward reported 0 remaining candidates (idempotency confirmed).
- **Committed in:** `847ed0e5`

**Total deviations:** 2 auto-fixed (Rule 1 bug fixes), no scope creep.

## Issues Encountered

- See the interim summary's notes on full-suite-gate resource sensitivity (`deferred-items.md`,
  "173-16 Task 1" section) — unrelated to this phase, left as-is.
- The generic backfill's path-handling gap (above) was only discoverable against real production
  data shapes, which is exactly why Task 3 runs the backfill against the live database rather than
  relying solely on the fixture-backed tests from 173-07 — those tests used disk-relative paths
  only and did not exercise the URL-form case.

## User Setup Required

None further — Task 3 is complete. The pre-backfill backup at
`/home/d1sk/backups/pre-173-backfill-20261002-2301/` should be retained per normal backup rotation
policy but is no longer needed for an imminent rollback.

## Next Phase Readiness

- All 16 plans complete. Phase 173 is closed.
- All 31 phase requirements (REQ-173-01 through REQ-173-31) are complete, verified against real
  code and a real, backfilled production dataset, with a full live visual UAT pass.
- No outstanding gaps for this phase. The two documented `imageDisplay.ts`/Jellyfin-proxy
  exceptions (D-16) are intentional and permanent, not deferred work.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-03*

## Self-Check: PASSED

- FOUND: frontend/src/lib/images/publicImagePatterns.mjs
- FOUND: frontend/src/lib/images/publicImagePatterns.d.ts
- FOUND: frontend/src/components/ui/ResponsiveImage.tsx
- FOUND: frontend/src/components/ui/ResponsiveImage.test.tsx
- FOUND: frontend/next.config.mjs
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
- FOUND: frontend/src/components/profile/MembershipsSection.test.tsx
- FOUND: frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx
- FOUND: backend/cmd/migrate-display-backfill/backfill_generic.go
- FOUND: backend/cmd/migrate-display-backfill/backfill_path_test.go
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/173-16-TASK3-CHECKLIST.md
- FOUND: .planning/STATE.md
- FOUND commit: cdb17709
- FOUND commit: cccb8036
- FOUND commit: 9e636674
- FOUND commit: 15dcb220
- FOUND commit: 148b9612
- FOUND commit: 5b1465f8
- FOUND commit: 96e87789
- FOUND commit: 847ed0e5
- Backup directory confirmed: /home/d1sk/backups/pre-173-backfill-20261002-2301/ (team4s_v2.sql, media.tar.gz)
