---
phase: quick-260910-s1b
plan: 01
subsystem: frontend-media-route
tags: [http-range, rfc7233, media-serving, security-hardening, wr-01]
dependency-graph:
  requires: []
  provides:
    - "RFC 7233 single-range support in the media-serving Next.js route (206/416/200)"
    - "isAnimatedWebpSource 206-gated body read (WR-01 closed)"
  affects:
    - "frontend/src/app/media/[...path]/route.ts (all callers of /media/... including video seeking)"
    - "frontend/src/components/profile/MemberProfileHero.tsx (animated-WebP avatar detection)"
tech-stack:
  added: []
  patterns:
    - "fs.createReadStream + Readable.toWeb for streamed partial file reads (never readFile-then-slice)"
    - "pure parseByteRange(header, size) helper returning null | 'unsatisfiable' | {start,end}"
key-files:
  created:
    - frontend/src/app/media/[...path]/route.test.ts
  modified:
    - frontend/src/app/media/[...path]/route.ts
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx
decisions:
  - "Multi-range Range headers (comma-separated) fall back to a full 200 body rather than multipart/byteranges — explicit scope decision, tested as a safe no-op."
  - "resolvedBase path-boundary check hardened to separator-aware comparison as defense-in-depth, even though the pre-existing '..'/'~' string filter already blocks the only realistic path to a sibling directory."
metrics:
  duration: "~35 minutes"
  completed: 2026-09-10
---

# Quick Task 260910-s1b: HTTP Range Support for the Media Route Summary

RFC 7233-compliant `Range` request handling (206 Partial Content / 416 Range Not Satisfiable) added to the media-serving Next.js route, with the `isAnimatedWebpSource` probe hardened (WR-01) to trust only genuine 206 responses before reading a body — closing T-154-F-01 and WR-01 and unblocking real video seeking for `.mp4`/`.webm`.

## What Was Built

**Task 1 — RFC 7233 Range support in `route.ts`:**
- New pure helper `parseByteRange(header, size)` implementing single-range semantics only (closed `bytes=N-M`, open-ended `bytes=N-`, suffix `bytes=-N`). Returns `null` (fall back to whole-file 200 — covers no-header, wrong unit, multi-range, and any unparseable shape), `'unsatisfiable'` (start beyond file size, or end < start), or `{ start, end }` (valid single range, inclusive, clamped to file size).
- `GET` now branches on this result: `'unsatisfiable'` returns 416 with `Content-Range: bytes */<size>` and no body, without reading any file bytes; `{start,end}` returns 206 with the exact byte slice streamed via `fs.createReadStream(filePath, { start, end })` piped through `Readable.toWeb(...)` as the `NextResponse` body — never a full `readFile` for a slice; `null` falls through to the pre-existing whole-file `readFile` + 200 path, now also carrying `Accept-Ranges: bytes`.
- `resolvedBase` path-boundary check hardened from `resolvedPath.startsWith(resolvedBase)` to `resolvedPath === resolvedBase || resolvedPath.startsWith(resolvedBase + path.sep)`, with an in-code comment documenting both the defense-in-depth rationale and why it isn't currently exploitable (the earlier `..`/`~` string filter already blocks the only realistic route to a sibling directory).
- `MIME_TYPES`, `Cache-Control`, and the `..`/`~` string filter are byte-for-byte unchanged.
- New `route.test.ts` (9 tests) creates a real 1000-byte fixture file in a temp directory, sets `MEDIA_BASE_PATH` before dynamically importing `./route` (the module reads the env var once at load time), and calls the real exported `GET` handler directly — asserting on actual status codes, headers, and byte-for-byte body slices, never on source text.

**Task 2 — `isAnimatedWebpSource` hardening (WR-01):**
- Guard changed from `if (!response.ok) return false` to `if (!response.ok || response.status !== 206) return false`, placed before `response.arrayBuffer()`. No other line of the function changed (signature check, try/catch, Range header sent all identical).
- The two pre-existing probe tests updated to mock `status: 206` (now required for detection to proceed, since the route genuinely returns 206 after Task 1).
- New regression test: mocks `fetch` to resolve `{ ok: true, status: 200, arrayBuffer: <spy> }` (an ANIM-bearing buffer would be returned if called) and proves the `arrayBuffer` spy is **never invoked** when status is 200, with the avatar staying on the normal (non-unoptimized) branch throughout.

**Task 3 — Restart, live curl proof, full regression sweep, production build:**
- Frontend container restarted (`docker restart team4sv30-frontend`), confirmed healthy (HTTP 200 on first poll).
- Live curl proof captured verbatim below.
- Full frontend vitest suite run inside the container with 0 failures.
- Production build gate run to completion (not skipped).

## Live Curl Proof (mandatory before/after evidence)

**BEFORE (re-confirmed live, from this plan's `<interfaces>` block, reproduced again at task start):**
```
$ curl -sS -D- -o /dev/null -H 'Range: bytes=0-63' 'http://127.0.0.1:3000/media/profile/11/avatar/25383ba2-6477-4aed-9bb0-58d75dd6ec4f/original.webp'
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
cache-control: public, max-age=31536000, immutable
content-length: 411828
content-type: image/webp
Date: Thu, 10 Sep 2026 20:18:51 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

**AFTER (post-restart, post-fix, same file, same Range header):**
```
$ curl -sS -D- -o /dev/null -H 'Range: bytes=0-63' 'http://127.0.0.1:3000/media/profile/11/avatar/25383ba2-6477-4aed-9bb0-58d75dd6ec4f/original.webp'
HTTP/1.1 206 Partial Content
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
accept-ranges: bytes
cache-control: public, max-age=31536000, immutable
content-length: 64
content-range: bytes 0-63/411828
content-type: image/webp
Date: Thu, 10 Sep 2026 20:21:47 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

**Second live data point — unsatisfiable range on the same real file (proves 416 live, not just in vitest):**
```
$ curl -sS -D- -o /dev/null -H 'Range: bytes=99999999-100000000' 'http://127.0.0.1:3000/media/profile/11/avatar/25383ba2-6477-4aed-9bb0-58d75dd6ec4f/original.webp'
HTTP/1.1 416 Range Not Satisfiable
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
accept-ranges: bytes
content-range: bytes */411828
Date: Thu, 10 Sep 2026 20:21:47 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked
```

The documented 200/411828-byte baseline (deferred-items.md's T-154-F-01 finding) turns into 206/64 bytes with a correct `Content-Range` header, exactly as required.

## Test Results

- `route.test.ts` (new): 9/9 passed — mid-range 206, suffix-range 206, open-range 206, unsatisfiable 416, no-Range 200+Accept-Ranges, malformed-unit 200, multi-range 200, path-traversal 403 (`..` and `~`).
- `MemberProfileHero.test.tsx`: 35/35 passed — includes the two updated probe tests (status: 206 required) and the new WR-01 regression test.
- Full frontend vitest suite (no path filter, run inside the container): **296 test files passed, 1 skipped (297 total); 2285 tests passed, 3 todo (2288 total). 0 failures.**
- Production build gate: **run, not skipped.** `docker compose build team4sv30-frontend` completed with exit code 0 — TypeScript compiled cleanly, static page generation succeeded (including `/media/[...path]` listed as a dynamic route), no errors or warnings surfaced in the build output.

RED-phase confirmation (Task 1): before the fix, 6 of 9 new test cases failed against the current `route.ts` — the 4 Range-dependent cases (mid-range, suffix, open-ended, unsatisfiable) failed because the old code always returned 200 with the whole file regardless of `Range`, and 2 more (no-Range, malformed-unit) failed solely because they also assert the new `Accept-Ranges: bytes` header, which did not exist yet. Multi-range and both path-traversal cases already passed unchanged. This is a minor wording nuance versus the plan's `<behavior>` text (which described only 4 failing cases) — accounted for because the no-Range/malformed-unit cases assert a genuinely new header, not just unchanged status-code behavior.

RED-phase confirmation (Task 2): before the fix, the new WR-01 regression test failed (arrayBuffer spy called once) while the two updated probe tests already passed with `status: 206` mocks added.

## Deviations from Plan

None — plan executed exactly as written, including the separator-aware `resolvedBase` hardening and its in-code rationale comment.

The RED-phase test-count discrepancy noted above (6 failing vs. the plan's stated 4) is not a deviation in implementation — it's a documentation-accuracy note about the plan's own `<behavior>` description, since the added `Accept-Ranges` header assertion on the no-Range/malformed-unit cases makes those cases fail pre-fix too, which is expected and intentional (the header genuinely is new).

## Self-Check: PASSED

Files confirmed present:
- FOUND: frontend/src/app/media/[...path]/route.ts
- FOUND: frontend/src/app/media/[...path]/route.test.ts
- FOUND: frontend/src/components/profile/MemberProfileHero.tsx
- FOUND: frontend/src/components/profile/MemberProfileHero.test.tsx

Commits confirmed present in `git log --oneline --all`:
- FOUND: ffbf9e8c — feat(quick-260910-s1b): add RFC 7233 Range support to media route
- FOUND: 7ec8981f — fix(quick-260910-s1b): require genuine 206 before reading isAnimatedWebpSource body (WR-01)
