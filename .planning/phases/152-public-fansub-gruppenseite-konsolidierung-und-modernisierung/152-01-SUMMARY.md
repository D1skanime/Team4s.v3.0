---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 01
subsystem: frontend
tags: [nextjs, image-optimizer, next-config, history-badges]

# Dependency graph
requires:
  - phase: 151-badge-artwork-slot-konsolidierung
    provides: AchievementArtwork/ResponsiveImage direct-descriptor image rendering via next/image
provides:
  - "images.localPatterns entry allowing /_next/image to optimize /history-event-badges-transparent/** assets"
affects: [152-07]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: [frontend/next.config.mjs]

key-decisions:
  - "Single additive localPatterns array entry only — no other images config keys touched (D02/D04)"

patterns-established: []

requirements-completed: [P152-01]

# Metrics
duration: ~10min
completed: 2026-09-08
---

# Phase 152 Plan 01: Unblock Next.js image optimizer for History-badge assets Summary

**Added `/history-event-badges-transparent/**` to `images.localPatterns` in `frontend/next.config.mjs`, live-verified `/_next/image` now returns HTTP 200 with `image/webp` for History-badge assets instead of the prior E426/400 crash.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-08T17:24Z (approx, container-restart-observed)
- **Completed:** 2026-09-08T17:26Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `images.localPatterns` in `frontend/next.config.mjs` now includes `{ pathname: '/history-event-badges-transparent/**', search: '' }`, placed directly after the `/member-achievement-badges/**` entry per the plan's precedent instruction.
- Frontend container restarted (`docker restart team4sv30-frontend`) to pick up the `next.config.mjs` change (dev mode does not hot-reload config), confirmed healthy via `✓ Ready in 1285ms` in container logs.
- Live curl verification against the running dev server proves the fix works end-to-end, not just at the config-file level (see Verification below).
- Confirmed the master PNG asset was not mutated by this change (sha256 identical before and after edit+restart).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the history-event-badges-transparent localPatterns entry and verify live** - `0228f473` (feat)

**Plan metadata:** (pending — this SUMMARY commit)

## Files Created/Modified
- `frontend/next.config.mjs` - Added one additive `images.localPatterns` array entry (`/history-event-badges-transparent/**`) unblocking the Next.js Image optimizer for the History-badge asset directory; no other `images` config keys were touched.

## Decisions Made
- Followed plan exactly: single additive array entry, no restructuring of `deviceSizes`, `imageSizes`, `formats`, `remotePatterns`, `dangerouslyAllowLocalIP`, or `qualities`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial verification attempt used `curl -sI` (HEAD request), which returned `HTTP/1.1 400 Bad Request` — this was a HEAD-method artifact of Next.js's `/_next/image` route (it does not support HEAD the same way as GET), not a reproduction of the original E426 localPatterns-mismatch bug. Switched to a real GET request (`curl -s -D - -o <file>`), which correctly returned `HTTP/1.1 200 OK`. This resolved the discrepancy without any code or config change — pure curl-invocation correction, not a deviation from the plan's fix.
- A GET request without an `Accept: image/webp` header returned `Content-Type: image/png` (the optimizer's format-negotiation `Vary: Accept` behavior — curl's default `Accept: */*` doesn't signal WebP support). Added `-H 'Accept: image/webp,*/*'` to the verification curl calls to exercise the `formats: ['image/webp']` config path and observe the WebP conversion, matching how a real browser's `Accept` header would behave. This is a verification-methodology detail, not a functional gap — the plan's "done" criteria (200 + `image/webp` content-type + differing byte sizes across `w=`) are fully met once the correct `Accept` header is sent.

## Live Verification (REQUIRED per plan-specific precondition for 152-07)

All commands run against the live dev server at `http://192.168.235.196:3000` after `docker restart team4sv30-frontend` reported `✓ Ready in 1285ms`.

**1. GET with `Accept: image/webp`, `w=256`:**
```
$ curl -s -D - -o /tmp/img256.webp -H 'Accept: image/webp,*/*' \
  'http://192.168.235.196:3000/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75'

HTTP/1.1 200 OK
Content-Type: image/webp
Content-Disposition: attachment; filename="founding.webp"
X-Nextjs-Cache: MISS
Content-Length: 21836

$ file /tmp/img256.webp
/tmp/img256.webp: RIFF (little-endian) data, Web/P image
```

**2. GET with `Accept: image/webp`, `w=640` (srcset-capability check, distinct size):**
```
$ curl -s -D - -o /tmp/img640.webp -H 'Accept: image/webp,*/*' \
  'http://192.168.235.196:3000/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=640&q=75'

HTTP/1.1 200 OK
Content-Type: image/webp
Content-Disposition: attachment; filename="founding.webp"
X-Nextjs-Cache: MISS
Content-Length: 71820

$ file /tmp/img640.webp
/tmp/img640.webp: RIFF (little-endian) data, Web/P image
```

**Result:** `w=256` -> 21,836 bytes WebP; `w=640` -> 71,820 bytes WebP. Both HTTP 200, both `image/webp`, distinctly sized — proves the optimizer generates real responsive variants (srcset capability) rather than passing the file through unmodified. Both are massive reductions from the master PNG's 840,090 bytes.

**3. Automated status-code check (plan's `<verify><automated>` line, executed literally):**
```
$ curl -s -o /dev/null -w "%{http_code}" \
  'http://192.168.235.196:3000/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75'
200
```

**4. Master PNG byte-identity proof (zero asset mutation):**
```
Before edit+restart:
34213b5affa35b691592ca54593c480280b0bb1206c04e6a728c316c447ef17e  frontend/public/history-event-badges-transparent/founding.png

After edit+restart:
34213b5affa35b691592ca54593c480280b0bb1206c04e6a728c316c447ef17e  frontend/public/history-event-badges-transparent/founding.png
```
Identical hash — confirms this is purely a Next.js config routing change with zero writes to the master asset directory (T-152-01-02 threat register disposition confirmed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 152-07's hard precondition (D09/critical_sequencing_constraint #1) is now satisfied: `next/image` can render `/history-event-badges-transparent/**` assets through `AchievementArtwork`/`ResponsiveImage` without the E426 crash. Plan 152-07 may proceed once its own wave dependencies are met.

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-01-SUMMARY.md`
- FOUND: `frontend/next.config.mjs`
- FOUND: commit `0228f473`
- FOUND: `history-event-badges-transparent` localPatterns entry present in `frontend/next.config.mjs`
