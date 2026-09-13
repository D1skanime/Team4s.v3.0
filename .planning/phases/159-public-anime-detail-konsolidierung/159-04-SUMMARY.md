---
phase: 159-public-anime-detail-konsolidierung
plan: "04"
subsystem: frontend-media
tags: [anime, cache, images, sharp, delivery]
requires:
  - phase: 159-03
    provides: Shared public episode state and navigation
provides:
  - Bounded shared manifest lifetime and cancellable transport
  - One display source across all four cover consumers
  - Bounded first-frame local/API-file delivery through existing source owners
affects: [159-05]
tech-stack:
  added: [sharp 0.34.5 as direct dependency, previously installed transitively]
  patterns: [useSyncExternalStore, reference-counted TTL/LRU, bounded image admission]
key-files:
  created:
    - frontend/src/lib/server/imageDisplay.ts
    - frontend/src/lib/server/coverFiles.ts
    - frontend/src/lib/imageDisplayContract.ts
    - frontend/src/app/covers/[file]/display/route.ts
    - .planning/phases/159-public-anime-detail-konsolidierung/159-04-DELIVERY.md
  modified:
    - frontend/src/components/anime/AnimeMediaProvider.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/animeBackdrops.ts
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/components/anime/AnimeBackdropRotator.tsx
    - frontend/src/app/api/v1/[...path]/route.ts
    - frontend/src/app/media/[...path]/route.ts
    - frontend/src/app/covers/[file]/route.ts
    - frontend/src/lib/server/apiProxy.ts
    - frontend/package.json
    - frontend/package-lock.json
    - docs/api/api-contracts.md
    - shared/contracts/openapi.yaml
requirements-addressed: [P159-03, P159-04]
key-decisions:
  - Retain existing manifest Map, API client, ownership and null SSR snapshot.
  - Use frontend-owned explicit display delivery for static local/API files; keep provider width/quality.
  - Preserve first static frame and alpha; no original fallback or Next policy relaxation.
  - Bound active image work to two jobs and admission to eight abortable FIFO waiters.
  - Production HTTP confirmation belongs to the existing 15905 harness.
duration: 62min
completed: 2026-09-14
---

# Phase 159 Plan 04: Bounded manifest and image delivery

The existing manifest cache now has a 60-second TTL, a 20-entry unused LRU bound and real
request cancellation. Poster, reflection, hero and rotator share one bounded display URL.
Local/API-file display requests produce static first-frame WebP through their authoritative
serving paths; provider images retain their real width/quality transform.

Implementation and focused verification are complete for the three original tasks and the
authorized delivery amendment. Production HTTP, final review and the phase-wide gate remain
in 15905. P159-03/P159-04 are addressed here, not globally signed off. Human UAT156/157/158
remains OPEN.

## Tasks and commits

| Task | RED / plan | Implementation |
| --- | --- | --- |
| 1: shared manifest lifetime, refcounts, abort, retry | afc1b9c0 | a4ce9ab3 |
| 2: bounded image resolution | 4102e2d7 | 19c14d9e |
| 3: four consumers share the same source | 11f71823 | 38edb7f8 |
| URL normalization and relative API-source corrections | Behavioral RED logs retained | cf63bccb, 1f5dfa74 |
| 4: authorized delivery amendment | 02be0c8b plan/matrix; 5fdaf424 RED | 7d9dedb1 |

Final product snapshot: 7d9dedb1. No files were deleted by these commits.
Global tracking is owned and updated by the root orchestrator.

## What changed

The provider retains its existing Map and nullable context. In-flight sharing spans multiple
providers and all three leaves. Unmount releases a reference; a microtask rechecks references
before aborting the last consumer, preserving StrictMode remount sharing. Old rejection
cannot evict a replacement request. Expired manifests retry on focus/visible state without
polling; unchanged data keeps object identity and avoids restarting rotation. getAnimeBackdrops
adds only an optional AbortSignal through the central API client.

The page resolves the cover once for poster, hero, reflection and rotator fallback. Provider
images use width512/quality75. Local covers use the routable /covers/{file}/display child;
local anime files and exact API files use display_width on their existing serving routes.
Other image slots remain 760/1280/1920. Optional unsupported sources are omitted; invalid
covers use the existing placeholder through bounded delivery. No raw-original error retry.

One shared Sharp helper enforces 16 MiB input, 20 MP decode, 4 MiB output, requested width
and height <= min(3 * width, 4096), quality75 and first static frame with alpha. Two active
operations and eight FIFO waiters are finite; source/queue deadline is five seconds and
native Sharp processing has its own five-second bound. Queued abort starts no IO; a native
job retains its slot until settled. Four distinct cold-start images complete with 200.
No image cache map was added.

Local files are checked before and during reads. API sources use the existing fixed proxy,
with display query and original Range/If-* removed. Auth forwarding remains central.
Original ETag/encoding/range/length are not reused as transformed truth. HEAD has transformed
headers and no body; source failures remain failures. API display is private/no-store.
Original routes without display opt-in, including SVG and media206/416, retain their behavior.

The API guide and OpenAPI vendor metadata explicitly distinguish this frontend display
contract from the unchanged backend original-file contract. No backend parameter, storage
alias, registry, data migration, media job, new auth flow or Next allowlist was invented.

## Verification

[Evidence and exact command metadata](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-04/README.md).

- Final focused run: 115/115 tests in 10 files.
- Final TypeScript check: exit0; scoped ESLint: exit0, no warnings.
- git diff --check: exit0.
- Earlier unaffected theme-video/ResponsiveImage/config coverage passed in the 86-test
  snapshot; it was not unnecessarily rerun after serving-only changes.
- Central auth regression: two missing/expired access-token cases with valid refresh pass;
  25 unrelated cases intentionally filtered.
- Actual decoded bytes cover PNG, animated GIF/APNG/WebP, first frame, alpha, dimensions,
  input/pixel/output bounds, streaming cancel, deadlines, queue saturation/abort, HEAD,
  headers and upstream errors. Original Range and SVG behavior passes.
- No production build was run in this plan. Root explicitly assigns actual Next HTTP
  static-cover precedence, private API-files and animation confirmation to the existing
  15905 harness, together with browser/DPR/transfer/cache checks.

## Deviations from Plan

1. [Rule 1 - Bug; authorized amendment] Generated Next URLs did not establish real delivery:
   private API-file origins were blocked, animation could pass through unchanged, and
   existing public cover files shadowed the dynamic cover route. Before new product changes,
   02be0c8b documented the causes, consumer/delivery matrix, read-first files and threats.
   7d9dedb1 extends the existing serving paths using one shared bounded helper and a cover
   child route. Production confirmation stays open in 15905.
2. [Rule 1 - Bug] Normalized relative origins and credential-bearing URLs required explicit
   validation; cf63bccb and its RED/GREEN evidence cover these cases.
3. [Rule 1 - Bug] Immediate rejection of the third image could break an ordinary cold start.
   Review correction adds eight finite abortable waiters. A deadline test also exposed
   same-timestamp timer ordering; an absolute deadline check now prevents expired waiters
   from starting source IO. Four-source and abort/deadline tests pass.
4. Tiny solid animated WebP may grow during re-encoding (236 B to706 B). Tests assert real
   dimension and hard-byte budgets, not an invalid universal compression claim.
5. A direct declaration of the already-installed Sharp0.34.5 was required for the new direct
   import. npm updated only package metadata; no library upgrade or Ubuntu installation.

## Remaining gate and cleanup

15905 must use the existing production harness to request a real pre-existing public cover
through /display, private API-files through the fixed proxy, and animations, then measure
browser dimensions/bytes/cache. Reuse animatedPng() and the Sharp pageHeight fixtures in
imageDisplay.test.ts. These tests do not substitute for that production result.

All test-created files were confined to disposable OS temp directories and cleaned by
afterAll. No new persistent processes, containers, database fixtures or backend sync were
needed. Live media, .env, volumes, backend runtime and shared /app/.next were untouched.
Root-owned REVIEW/SECURITY/tracking/JSON evidence and foreign shot2.mjs remain untouched.

## Known Stubs

None. The null SSR manifest snapshot and empty retry state are intentional lifecycle states;
they do not replace persisted/API data with mock content.

## Self-Check: PASSED

All named product artifacts, focused logs and task commits were checked on canonical Linux.
The production gate and human UAT are explicitly unclaimed.
