---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "05"
subsystem: frontend
tags: [react-cache, next-image, webp, request-dedupe, deterministic-probe]
requires:
  - phase: 120-02
    provides: Deterministic green frontend/backend baseline and reproducible Compose verification
  - phase: 120-03
    provides: Expected-red auth-keyed SSR dedupe and responsive-image fallback contracts
provides:
  - Request-scoped member-profile dedupe keyed by normalized slug and viewer token
  - Geometry-stable one-shot display-original fallback primitive
  - Deterministic five-class production Next WebP suitability gate with cache and alpha proof
affects: [120-07, 120-08, 120-09, 120-10, 120-12, 120-13]
tech-stack:
  added: [Debian webp CLI tools in frontend runner]
  patterns: [React request cache with primitive auth key, exact image URL allowlisting, byte-level optimizer verification]
key-files:
  created:
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/scripts/run-profile-image-probe.mjs
    - frontend/scripts/verify-profile-image-delivery.mjs
    - frontend/public/__phase120-image-probe/alpha-badge.png
    - frontend/test/fixtures/phase120-image-probe/avatar.png
    - frontend/test/fixtures/phase120-image-probe/hero.png
    - frontend/test/fixtures/phase120-image-probe/project-cover.png
    - frontend/test/fixtures/phase120-image-probe/group-logo.png
  modified:
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/Dockerfile
    - frontend/next.config.mjs
key-decisions:
  - "Member profile request memoization uses only primitive slug plus normalized viewer token; backend visibility and cache:no-store remain authoritative."
  - "The suitability gate uses five exact repository-owned URLs and production Next; no image consumer or backend media pipeline was migrated in this plan."
  - "The runner carries the fallback component test alongside the two required scripts so --require-original-fallback proves the checked-in primitive inside the built image."
requirements-completed: [D-15, D-18, D-19, D-20, D-21, D-22]
duration: 31m
completed: 2026-08-04
---

# Phase 120 Plan 05: Auth-Keyed Dedupe and Responsive Image Suitability Summary

**Viewer-isolated request memoization plus a fail-closed five-class Next WebP gate proving dimensions, alpha, cache reuse, and one-shot display-original fallback.**

## Performance

- **Duration:** 31m
- **Started:** 2026-08-04T12:59:19Z
- **Completed:** 2026-08-04T13:30:22Z
- **Tasks:** 2
- **Files modified:** 12 implementation, test, config, script, and fixture files

## Accomplishments

- Metadata and page rendering now share one request-scoped `getMemberProfile` read for the same normalized slug/token pair while anonymous and owner-preview reads remain isolated.
- `ResponsiveImage` tries optimized delivery first and switches exactly once to the identical public display URL without changing width, height, `sizes`, or falling back to `source_original_url`.
- The production runner contains both checked-in probe scripts, deterministic fixtures, and `webpinfo`/`dwebp`.
- The isolated probe proved all five required URL classes and widths `64,96,128,160,192,256,512,640,1080,1480,1920`, including required core widths `128,160,512,640`.
- No backend, OpenAPI, DTO, upload, image-consumer, or media-ownership change was introduced.

## Task Commits

1. **Task 1: Implement request-scoped auth-keyed dedupe** — `254b180a`
2. **Task 2: Pass the blocking Next WebP suitability gate** — `340152d1`

## Files Created/Modified

- `frontend/src/app/members/[slug]/page.tsx` — shared cookie normalization and primitive slug/token React cache loader.
- `frontend/src/app/members/[slug]/page.test.tsx` — React 18 test-runtime cache adapter and DTO-faithful public/owner isolation fixture.
- `frontend/src/components/ui/ResponsiveImage.tsx` — stable one-shot optimizer fallback.
- `frontend/next.config.mjs` — WebP format, bounded candidate widths, and exact five-probe URL allowlist.
- `frontend/Dockerfile` — reproducible WebP CLI tools plus built-runner probe/fallback inputs.
- `frontend/scripts/run-profile-image-probe.mjs` — guarded fixture-origin and Next lifecycle on ports 3101/3100.
- `frontend/scripts/verify-profile-image-delivery.mjs` — MIME/signature/dimension/alpha/cache/fallback verifier with scoped temp cleanup.
- Five PNG fixtures — transparent badge, avatar, 5:1 hero, 2:3 project cover, and square group logo.

## Decisions Made

- Kept `getMemberProfile` and its `cache: 'no-store'` transport unchanged; React invalidates memoized results per server request.
- Used exact loopback probe paths rather than a wildcard image proxy. `dangerouslyAllowLocalIP` is limited by two full remote URL patterns and three full local paths.
- Kept both Hero background and avatar consumer behavior untouched; downstream consumer migration remains blocked unless this complete suitability gate is green.

## Verification

- Overlap-chain authorization: `{"ok":true}` before both tasks using the immutable initial manifest and exact latest overrides.
- Route suite: 7/7 passed, including same-key dedupe and anonymous/owner isolation.
- ResponsiveImage suite: 1/1 passed, including stable geometry and no second-error rerender.
- Production frontend image build: passed; Next compiled and generated 23/23 static pages.
- Built-runner script checks: both `scripts/run-profile-image-probe.mjs` and `scripts/verify-profile-image-delivery.mjs` exist.
- Final isolated probe: `{"ok":true,"classes":["static-badge","profile-avatar","profile-hero","api-project","api-group"],"widths":[64,96,128,160,192,256,512,640,1080,1480,1920]}`.
- Every optimized response had `image/webp`, RIFF bytes 0–3, WEBP bytes 8–11, parsed requested width, byte-identical repeat output, and cache-hit/age evidence.
- `webpinfo` reported alpha and `dwebp` PAM samples proved transparent outer pixels plus opaque clean center pixels.
- Isolated production typecheck passed.
- Targeted ESLint passed with zero warnings/errors after the final component edit.
- Scoped `git diff --check`, wildcard-allowlist scan, and backend/OpenAPI/DTO diff scan passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supplied the committed overlap-chain root and latest overrides**
- **Found during:** Both task preconditions
- **Issue:** The literal plan command omits the validator's required `--initial` or `--expect` input.
- **Fix:** Used committed `120-01-initial-overlap.json` with exact Plan 120-04 latest manifests; no authorization refresh or recapture occurred.
- **Files modified:** None.
- **Verification:** Both corrected checks returned `{"ok":true}`.

**2. [Rule 3 - Blocking] Adapted the route test runtime to React 18**
- **Found during:** Task 1 GREEN
- **Issue:** Production Next provides the server `cache` export through its compiled React runtime, but the direct Vitest React 18.3.1 module exposes no runtime `cache` function.
- **Fix:** Added a test-only primitive-argument cache adapter, reset before every test; production continues to import `cache` from `react` and the Next production build passes.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`.
- **Verification:** Route suite passed 7/7 and production build/typecheck passed.
- **Committed in:** `254b180a`.

**3. [Rule 1 - Bug] Corrected the RED owner fixture to the public DTO**
- **Found during:** Task 1 typecheck preparation
- **Issue:** The inherited RED fixture injected `media_id` and `source_original_url` into the public avatar shape, which exposes only `public_url`.
- **Fix:** Kept the avatar display URL and moved the retained source-leak sentinel to the existing background test shape.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`.
- **Verification:** Isolation assertions remained green and isolated typecheck passed.
- **Committed in:** `254b180a`.

**4. [Rule 3 - Blocking] Isolated the built-runner fallback test environment**
- **Found during:** Task 2 first full probe
- **Issue:** Inheriting `NODE_ENV=production` into Vitest made Vite externalize `node:fs` in the existing jsdom test before fallback behavior ran.
- **Fix:** The verifier invokes only the fallback unit process with `NODE_ENV=test`; the Next server and image probe remain production-mode.
- **Files modified:** `frontend/scripts/verify-profile-image-delivery.mjs`.
- **Verification:** The final built-image probe passed all mandatory assertions.
- **Committed in:** `340152d1`.

**5. [Rule 2 - Missing Critical] Carried fallback proof inputs in the runner**
- **Found during:** Task 2 runner design
- **Issue:** Copying only scripts could not make `--require-original-fallback` prove the checked-in component/test from the built image.
- **Fix:** Copied the component, its test, Vitest config, TypeScript config, and deterministic non-mounted API fixtures into the runner in addition to the exact required script-copy line.
- **Files modified:** `frontend/Dockerfile`.
- **Verification:** Built-runner fallback test and full five-class probe passed.
- **Committed in:** `340152d1`.

---

**Total deviations:** 5 auto-fixed (1 bug, 1 missing critical verification input, 3 blocking environment/contract issues).
**Impact on plan:** No architecture or scope expansion; all fixes preserve the fail-closed gate and viewer/media security boundaries.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Review

- T-120-01: slug and normalized token are both primitive cache keys; anonymous and owner responses are isolated.
- T-120-03: `ResponsiveImage` accepts only the display URL passed as `src`; no source-original field or fallback exists.
- T-120-04: the probe origin is loopback-only with two exact full remote paths and no wildcard hostname/root pathname.
- No unplanned endpoint, auth path, file-access owner, schema, or backend media surface was added.

## Unrelated Existing State

Dirty Phase-119 components/assets, untracked Phase-119 artifacts, `STATE.md`, and `ROADMAP.md` remained untouched and unstaged.

## Next Phase Readiness

The complete frontend-only suitability gate is green, so downstream plans may begin the explicitly planned image-consumer migrations while preserving D-19 dual priority and the exact fallback boundary.

## Self-Check: PASSED

- All 13 plan-declared source/test/config/script/fixture paths exist (including the pre-existing RED fallback test).
- Task commits `254b180a` and `340152d1` exist.
- Final built-image probe, focused suites, production build, isolated typecheck, lint, allowlist scan, and scoped diff check passed.
