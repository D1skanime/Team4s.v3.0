---
phase: 153-public-member-clientlast-und-speicherretention
plan: 03
subsystem: frontend
tags: [next-dynamic, code-splitting, react, client-boundary, vitest]

# Dependency graph
requires:
  - phase: 153-02
    provides: barrel-split editor import graph (overlapping, not additive, part of the same
      1.65 MB RCA-02 public-bundle finding)
provides:
  - "not-found.tsx wraps OwnHiddenProfilePreview in a next/dynamic({ ssr: false }) loading
    boundary, closing the second half of RCA-02 (owner-only preview no longer part of the
    public profile route's initial client chunk)"
  - "First in-repo use of next/dynamic as a verified, test-proven pattern for future
    code-split loading boundaries"
affects: [153-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/dynamic({ ssr: false }) inside a 'use client' route segment for a real code-split
      loading boundary, with LoadingState as the generic non-leaking fallback"

key-files:
  created:
    - frontend/src/app/members/[slug]/not-found.test.tsx
  modified:
    - frontend/src/app/members/[slug]/not-found.tsx

key-decisions:
  - "Chose server/client boundary path 1 (not-found.tsx itself marked 'use client') over path 2
    (a separate narrow client wrapper file), since the route segment already renders exclusively
    a client component and no server-rendered content is lost."
  - "next/dynamic's ssr:false resolved cleanly under this project's Vitest + Testing Library +
    jsdom setup with zero vi.mock('next/dynamic', ...) shim required — closes RESEARCH.md's
    open Assumption A1 empirically, no React.lazy fallback was needed."

patterns-established:
  - "Owner-only/private preview client components reachable from a public route segment should
    be wrapped in next/dynamic({ ssr: false }) with a generic LoadingState fallback rather than
    statically imported, to keep their bundle out of the public route's initial chunk."

requirements-completed: [P153-06]

# Metrics
duration: 4min
completed: 2026-09-10
---

# Phase 153 Plan 03: Code-split the owner-only private-preview loading boundary Summary

**`not-found.tsx` now loads `OwnHiddenProfilePreview` via `next/dynamic({ ssr: false })` behind
a real client boundary (`'use client'` on the segment itself), removing its bundle from the
public profile route's initial chunk, with a new render-based regression test proving both the
owner and anonymous outcomes are unchanged.**

## Performance

- **Duration:** 4 min (task work; excludes upfront plan/context reading)
- **Started:** 2026-09-10T10:42:00Z (approx, first edit)
- **Completed:** 2026-09-10T10:44:13Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Closed the second half of RCA-02: `OwnHiddenProfilePreview`'s bundle (which pulls in the full
  `MemberProfileContent` composition) is no longer part of the successful public profile route's
  initial client chunk — it now loads through a `next/dynamic({ ssr: false })` code-split
  boundary.
- Established this repo's first `next/dynamic` code-split loading-boundary pattern, empirically
  verified against both the live dev server (real HTTP load, no server error) and the Vitest/
  Testing Library/jsdom test harness (no additional mocking required).
- Added a new behavioral regression test (`not-found.test.tsx`) that renders the actual
  `MemberProfileNotFound` default export end-to-end for an authenticated owner and an anonymous
  visitor, proving the loading boundary does not change either outcome.
- `OwnHiddenProfilePreview.tsx`'s owner/privacy gate chain remains byte-identical (`git diff
  --stat` showed zero changes throughout).

## Server/Client Boundary Decision (binding constraint)

Per the plan's `<server_client_boundary>` section, two paths were allowed. **Path 1 was chosen**:
`not-found.tsx` itself is now marked `'use client'`, and `next/dynamic(..., { ssr: false })` is
used directly inside it. Rationale: the file renders exclusively a client component
(`OwnHiddenProfilePreview`) both before and after this change, so marking the segment itself
`'use client'` loses no server-rendered content — there was nothing server-rendered to preserve.
Path 2 (a narrow separate `'use client'` wrapper file interposed between the Server Component
`not-found.tsx` and the dynamic import) was not needed since Path 1 is strictly simpler with an
identical outcome (own chunk, no longer part of the public route's initial bundle) and no
downside in this specific case.

Live verification (per the binding constraint, `tsc --noEmit` alone does not catch a boundary
violation):
```
docker restart team4sv30-frontend
curl -sS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:3000/members/gibt-es-nicht"
# -> 404 (expected: this route intentionally resolves to not-found)
```
Response body confirmed a normal Next.js `NEXT_HTTP_ERROR_FALLBACK;404` document (no server
crash, no unhandled exception in `docker logs team4sv30-frontend`); the route compiled and
rendered successfully with the new `next/dynamic` boundary in place.
```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit 2>&1 | grep -i 'not-found' || echo NO_TS_MATCHES"
# -> NO_TS_MATCHES
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Spike next/dynamic + Vitest mocking, then implement the real loading boundary** -
   `ee742932` (feat)
2. **Task 2: Add a behavioral regression test proving the boundary still serves the owner
   correctly** - `27f0a210` (test)

**Plan metadata:** committed separately after this SUMMARY (docs commit, see final_commit step).

## Files Created/Modified
- `frontend/src/app/members/[slug]/not-found.tsx` - marked `'use client'`; replaced the static
  top-level import of `OwnHiddenProfilePreview` with a `next/dynamic({ ssr: false })`-wrapped
  lazy component, fallback `LoadingState` with generic `title="Profil wird geprüft."` copy (no
  slug/owner-specific text).
- `frontend/src/app/members/[slug]/not-found.test.tsx` - new behavioral test file; mirrors
  `OwnHiddenProfilePreview.test.tsx`'s existing mock shapes (`next/navigation`, `@/lib/api`,
  `@/lib/useAuthSession`, child section stubs), imports the real `./not-found` default export,
  and renders/asserts on actual DOM output (`render`/`screen`/`waitFor`) for both the owner and
  anonymous outcomes — no `readFileSync`/`.toContain()` source-text assertions.

## Decisions Made
- Server/client boundary: Path 1 (`'use client'` directly on `not-found.tsx`) — see dedicated
  section above.
- Loading mechanism: `next/dynamic({ ssr: false })`, not `React.lazy` + `Suspense` — the spike
  (Task 2's test itself, as instructed) proved `next/dynamic`'s `ssr: false` option resolves
  cleanly inside this project's Vitest + `@testing-library/react` + jsdom setup with a plain
  `waitFor`; no `vi.mock('next/dynamic', ...)` shim was needed, so the `React.lazy` fallback
  named in the plan as a contingency was not required.

## Deviations from Plan

None - plan executed exactly as written. The plan's own illustrative target shape (showing
`next/dynamic` directly in a Server-Component-shaped `not-found.tsx`) was explicitly flagged by
the plan-review pass as invalid on its own; the binding `<server_client_boundary>` section's
Path 1 resolves that by adding `'use client'` to the segment, which is what was implemented.

## Issues Encountered
None. The empirical Vitest/jsdom spike (folded into Task 2 per the plan's own instruction) showed
`next/dynamic({ ssr: false })` resolves without any additional test scaffolding, closing
RESEARCH.md's open Assumption A1 with a definitive answer for this codebase.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The `not-found.tsx` route segment's client bundle is now code-split; Plan 07's final
  `docker compose build` + bundle-size proof can measure the resulting transfer reduction
  alongside Plan 02's barrel-split fix.
- This plan's `next/dynamic` boundary is now an in-repo precedent other plans/phases can point to
  for future owner-only/private client-only surfaces reachable from public routes.
- No known stubs or new threat surface introduced (the loading fallback carries no
  slug/owner-specific data; `OwnHiddenProfilePreview.tsx`'s authorization gates are unchanged).

---
*Phase: 153-public-member-clientlast-und-speicherretention*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: frontend/src/app/members/[slug]/not-found.tsx
- FOUND: frontend/src/app/members/[slug]/not-found.test.tsx
- FOUND: commit ee742932
- FOUND: commit 27f0a210
