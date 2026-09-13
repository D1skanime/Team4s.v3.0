# 159-04 verification evidence

Canonical Linux execution in /home/d1sk/team4s through the existing frontend container.
Final product commit: 7d9dedb1. No live data, env, media files, Docker volumes, backend
processes, new persistent service or shared production build was changed.

## Observed TDD gates

| Scope | RED evidence | GREEN evidence |
| --- | --- | --- |
| Task 1 lifecycle and transport | task1-red.log: 11 failed / 3 passed | task1-green.log: 15 passed |
| Existing subscriber retry edge | task1-retry-red.log: 1 failed / 11 passed | Included in Task 1 GREEN |
| Task 2 original bounded resolver | task2-red.log: 22 failed / 1 passed | task2-green.log: 52 passed |
| Task 3 four cover consumers | task3-red.log: 3 failed / 2 passed | task3-green.log: 41 passed |
| Normalized URL origin and credentials | url-boundary-red.log: 2 failed / 23 passed | url-boundary-green.log: 43 passed |
| Relative API-file URL generation | api-file-red.log: 1 failed / 25 passed | complete-tests.log: 86 passed, historical snapshot |
| Authorized delivery amendment | display-red.log: local original 206 and API original PNG fail | display-green.log: 115 passed in 10 suites |

The final display-green/typecheck/lint logs supersede the earlier final-* and complete-*
snapshots. Historical logs are retained with their original scope, not relabelled as final
production results. ANSI/trailing whitespace is removed without changing test outcomes.
verification.json contains command argv, exit codes and source SHA-256 hashes.
auth-regression.log additionally proves two existing absent/expired access-token cases
with a valid refresh session; the other 25 cases were intentionally filtered.

## Final implementation and actual byte checks

The cache uses the existing Map and central getAnimeBackdrops transport: shared in-flight
requests, 60-second TTL, at most 20 unused fulfilled LRU entries, refcounts, deferred
last-consumer abort, identity-guarded old rejection, focus/visibility retry and stable
manifest object identity. No polling or new global data owner was introduced.

The initial Next-generated URL approach was insufficient: private API-file origins are
blocked in production, animated inputs can pass through, and public cover files shadow
the dynamic original route. The authorized amendment replaces static source wrappers with
a frontend-owned display request on /covers/{file}/display, /media/anime/** and exact
/api/v1/media/files/{filename}. Provider width/quality behavior remains unchanged.

One shared Sharp 0.34.5 helper reads each authoritative source and produces static first-frame
WebP. Unit/handler tests decode real output: PNG, transparent GIF/APNG/WebP animation,
width/height/pixel/input/output byte limits, source cancellation, timeout, two active slots
plus at most eight abortable waiters, four parallel cold-start images, original Range/SVG,
HEAD, private caching, representation headers and preserved upstream failure statuses.
A 236-byte solid animated WebP becomes a bounded 706-byte static WebP; encoding overhead
may increase tiny images, so this fixture asserts actual dimensions and hard output limits,
not universal compression improvement.

The original delivery contract without explicit display opt-in remains. API file requests
use the existing fixed internal API proxy, never a guessed storage path or relaxed Next
allowlist. display_width is removed before the backend request and documented as a
frontend-only contract, not an invented backend resize parameter.

## Exact production handoff

Production HTTP is intentionally OPEN until 15905 extends the existing
scripts/verify-anime-detail-phase.sh and anime-detail-phase158-probe.mjs. Do not create a
second mini-Next harness or build in shared /app/.next.

The remaining gate must exercise a pre-existing public/covers file through its routable
/display child, private API files through the actual fixed proxy, and real animations through
productive Next. Browser/DPR/transfer-byte/cache measurements and final review remain there.
Current unit success is not production or human UAT approval.

Reuse frontend/src/lib/server/imageDisplay.test.ts: animatedPng() constructs valid two-frame
APNG with acTL/fcTL/fdAT and CRC32; GIF/WebP use Sharp raw pageHeight=800 with two differently
colored frames. Assertions decode output to confirm first red frame, one page, alpha and
bounded dimensions. All fixture files are generated only in disposable OS temp directories,
cleaned by afterAll. Root-owned live media measurements remain separate evidence.
