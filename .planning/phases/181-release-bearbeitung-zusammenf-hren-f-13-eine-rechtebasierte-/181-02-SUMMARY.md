---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 02
subsystem: ui
tags: [nextjs, routing, redirects, vitest, cleanup]

# Dependency graph
requires:
  - phase: 181-01
    provides: all 5 former /me/releases/[id]/workspace entry points already
      retargeted to /admin/episode-versions/[versionId]/edit, so nothing
      outside the workspace route's own directory still references it
provides:
  - "buildReleaseEditorRedirects() in releaseEditorRedirects.mjs — the
     Next.js redirects() descriptor retiring /me/releases/:versionId/workspace
     as a permanent (308) redirect to /admin/episode-versions/:versionId/edit"
  - "frontend/src/app/me/releases directory tree fully removed (page.tsx,
     workspace.module.css, page.test.tsx, workspaceHelpers.ts)"
affects: [181-03 (pending human-verify checkpoint, not yet executed)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Framework-neutral .mjs config-data module (no Node builtins, no next
       import) imported directly by next.config.mjs AND unit-tested via a
       plain vitest .test.ts, mirroring publicImagePatterns.mjs/.d.ts"
    - "A .mjs module consumed by a .ts/.tsx importer under
       moduleResolution: bundler needs a .d.mts sibling (not .d.ts) for tsc
       to actually resolve its types — confirmed empirically in this plan"

key-files:
  created:
    - frontend/src/lib/releaseEditorRedirects.mjs
    - frontend/src/lib/releaseEditorRedirects.d.ts
    - frontend/src/lib/releaseEditorRedirects.d.mts
    - frontend/src/lib/releaseEditorRedirects.test.ts
    - .planning/phases/181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-/deferred-items.md
  modified:
    - frontend/next.config.mjs
  deleted:
    - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
    - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
    - frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx
    - frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts

key-decisions:
  - "Added releaseEditorRedirects.d.mts alongside the plan-specified
     releaseEditorRedirects.d.ts: under this project's
     moduleResolution:'bundler' tsconfig, tsc only resolves type
     declarations for a .mjs import from a .ts file via a .d.mts sibling,
     not a .d.ts sibling — verified empirically by toggling the file and
     re-running tsc. Kept both files so the plan's literal file list is
     still satisfied."
  - "npm run build's pre-existing /_global-error Turbopack prerender
     failure (TypeError: Cannot read properties of null (reading
     'useContext'), digest 53468840) was NOT treated as caused by this
     plan. Proved it predates 181-02 by checking out the exact pre-181-02
     commit (50c0961b1) into a throwaway git worktree and running the
     identical build in a one-off container against the shared
     frontend_node_modules volume — same error, same digest, same first-
     affected page. Logged to deferred-items.md instead of attempting a
     Rule 4-scale fix to an unrelated Turbopack defect."
  - "4 npm run lint errors found during Task 2's gate run are all in files
     this plan never touched (capture-responsive.cjs, CapabilityDetailRow.tsx,
     useReleaseVersionMedia.ts) and were last modified by unrelated prior
     commits — confirmed via git log, logged to deferred-items.md rather
     than fixed, per the scope-boundary rule."

requirements-completed: [D-03]

# Metrics
duration: ~13min
completed: 2026-10-14
---

# Phase 181 Plan 02: Retire the workspace route — redirect + deletion (Task 3 checkpoint pending) Summary

**`/me/releases/[id]/workspace` now permanently (308) redirects to `/admin/episode-versions/[versionId]/edit` with query params preserved, and the entire dead `frontend/src/app/me/releases` route tree is deleted — Task 1 and Task 2 are complete and committed; Task 3 (the closing live-UAT checkpoint) is a mandatory human-in-the-loop gate and has NOT been executed, approved, or checked off.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-10-14T10:20:30Z (approx.)
- **Completed:** 2026-10-14T10:33:39Z
- **Tasks:** 2 of 3 completed (Task 3 is a blocking human checkpoint, intentionally not executed)
- **Files modified:** 10 (4 created, 1 modified, 4 deleted, 1 deferred-items doc)

## Accomplishments
- `buildReleaseEditorRedirects()` in `frontend/src/lib/releaseEditorRedirects.mjs` returns the exact `{ source: '/me/releases/:versionId/workspace', destination: '/admin/episode-versions/:versionId/edit', permanent: true }` descriptor, wired into `next.config.mjs`'s `async redirects()` alongside the pre-existing `images`/`turbopack` config (unchanged)
- Live verification: `curl -sI "http://192.168.235.196:3000/me/releases/27/workspace?tab=notizen"` returns `HTTP/1.1 308 Permanent Redirect` with `location: /admin/episode-versions/27/edit?tab=notizen` — query param preserved automatically by Next.js
- `frontend/src/app/me/releases` directory tree (the workspace route's only content) fully deleted — zero remaining references anywhere in `frontend/src` (confirmed by both the plan's documented grep and the fixed-string `${` variant from 181-01's noted `ugrep` caveat)
- Full automated gate run after deletion: `tsc --noEmit` clean, full vitest suite green (384 test files / 3506 tests passed, 1 skipped, 3 todo, 0 failures)
- `npm run build`'s pre-existing Turbopack `/_global-error` prerender failure independently reproduced on the pre-181-02 commit via a throwaway worktree + one-off container — proven unrelated to this plan's changes, not fixed (out of scope), documented in `deferred-items.md`
- Frontend container restarted twice (after Task 1's config wiring, and after the Task 2 gate's `npm run build` attempt touched the dev `.next` volume); confirmed healthy both times via live curl (`200` on `/`, `200` on the editor route, `308` on the retired workspace URL)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the redirect + wire it into next.config.mjs + verify live** - `22b2e81ca` (feat)
2. **Task 2: Delete the now-unreferenced workspace route + run the full gate** - `7d3b4041e` (chore)

**Task 3 (checkpoint:human-verify, gate: blocking) is NOT executed.** No commit, no approval, no checkoff. See "Pending Checkpoint" below.

**Plan metadata:** (final docs commit for SUMMARY.md/STATE.md/ROADMAP.md follows this summary)

## Files Created/Modified
- `frontend/src/lib/releaseEditorRedirects.mjs` - pure, framework-free `buildReleaseEditorRedirects()` returning the redirects() descriptor array
- `frontend/src/lib/releaseEditorRedirects.d.ts` - plan-specified ambient type declaration (mirrors the `publicImagePatterns.d.ts` sibling-pattern convention)
- `frontend/src/lib/releaseEditorRedirects.d.mts` - the declaration file actually resolved by `tsc` for the `.mjs` import in `releaseEditorRedirects.test.ts` under `moduleResolution: "bundler"` (see Decisions)
- `frontend/src/lib/releaseEditorRedirects.test.ts` - asserts the exact one-entry array by calling the real function
- `frontend/next.config.mjs` - imports `buildReleaseEditorRedirects` and adds `async redirects() { return buildReleaseEditorRedirects() }` to `nextConfig`; `images`/`turbopack` keys untouched
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` - deleted
- `frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css` - deleted
- `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx` - deleted
- `frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts` - deleted
- `.planning/phases/181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-/deferred-items.md` - new file documenting the 4 pre-existing lint errors and the pre-existing build defect, all confirmed unrelated to this plan

## Decisions Made
- See `key-decisions` in frontmatter for the `.d.mts`-vs-`.d.ts` resolution finding and the pre-existing-build-defect proof methodology.
- Used a throwaway `git worktree` (not `git stash`, per project/user rule) plus a one-off `docker run` against the shared `team4s_frontend_node_modules` named volume to isolate and compare build behavior across commits without touching the live dev container's mounted source or `.next` volume during the comparison itself.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `releaseEditorRedirects.d.mts` alongside the plan-specified `.d.ts`**
- **Found during:** Task 1 (acceptance criterion: `tsc --noEmit` reports no new errors)
- **Issue:** `releaseEditorRedirects.test.ts` imports `buildReleaseEditorRedirects` from the `.mjs` module. Under this project's `moduleResolution: "bundler"` tsconfig, `tsc` does not resolve a `.d.ts` sibling for a `.mjs` import from a `.ts` file — it reported `TS7016: Could not find a declaration file for module './releaseEditorRedirects.mjs'`. The sibling `publicImagePatterns.d.ts` pattern this plan told me to mirror is never actually exercised by `tsc` in the existing codebase (nothing imports `publicImagePatterns.mjs` from a `.ts` file), so this gap was latent, not previously hit.
- **Fix:** Added `releaseEditorRedirects.d.mts` with the identical ambient declaration. Verified by toggling: with only `.d.ts` present, `tsc` errors; with `.d.mts` present (with or without `.d.ts`), `tsc` is clean. Kept both files so the plan's literal `files_modified` list (`.d.ts`) is still satisfied.
- **Files modified:** `frontend/src/lib/releaseEditorRedirects.d.mts` (new, not in original plan's file list)
- **Verification:** `docker compose exec team4sv30-frontend npx tsc --noEmit -p tsconfig.json` clean
- **Committed in:** `22b2e81ca` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, Rule 3)
**Impact on plan:** Necessary for the plan's own stated acceptance criterion ("tsc --noEmit reports no new errors") to actually pass. No scope creep — the plan-specified `.d.ts` file was kept as-is, nothing removed.

## Issues Encountered

- **`npm run build` fails on a pre-existing, unrelated Turbopack prerender defect.** Task 2's acceptance criteria require `npm run build` to succeed. It does not: `Error occurred prerendering page "/_global-error" ... TypeError: Cannot read properties of null (reading 'useContext') { digest: '53468840' }`. Per the scope-boundary rule, before accepting this as "not my problem" I verified it directly rather than assuming: checked out commit `50c0961b1` (the state immediately before any of this plan's changes — before Task 1's `next.config.mjs` edit and before Task 2's deletion) into a throwaway `git worktree` at `/tmp/t4s-build-check`, then ran `npm run build` in a one-off `docker run --rm` container against the same image and the shared `team4s_frontend_node_modules` volume (without touching the live container). The identical error, with the identical digest `53468840`, on the identical first-affected page `/_global-error`, reproduced on that pre-181-02 commit. This conclusively proves the defect predates and is unrelated to Task 1 or Task 2's changes. This also matches a previously documented finding in `.planning/STATE.md` (Phase 164 section): "derselbe Defekt existiert unabhängig von der gelöschten Route, nur eine andere zuerst betroffene Seite" (the same defect exists independent of which route is deleted, just a different first-affected page). Not fixed — logged to `deferred-items.md`. The throwaway worktree and its build artifacts were removed afterward (`git worktree remove --force` plus a root-owned cleanup via a `busybox` container, since the one-off build container had created some root-owned files under `/tmp`).
- **4 pre-existing `npm run lint` errors**, all in files this plan never touched (`frontend/capture-responsive.cjs`, `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx`, `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`). Confirmed via `git log -- <file>` that none were modified by this plan's commits. Logged to `deferred-items.md`, not fixed (scope boundary — the `useReleaseVersionMedia.ts` one in particular lives inside the one surviving editor surface that D-01/D-05 explicitly forbid touching in this plan).
- **The live container's `npm run build` attempt wrote into the dev `.next` named volume** (the first, direct `docker compose exec team4sv30-frontend npm run build` run, before the isolation check above). Per the orchestrator's explicit instruction, restarted `docker restart team4sv30-frontend` afterward and confirmed via curl that the dev server serves normally again (`200` on `/`, `200` on the editor, `308` on the retired workspace URL) before handing off.

## User Setup Required

None - no external service configuration required.

## Pending Checkpoint — Task 3 (NOT executed, NOT approved)

Task 3 is a `type="checkpoint:human-verify" gate="blocking"` live-UAT step. It has intentionally **not** been run, approved, or checked off by this executor. The plan and the phase are **not complete** until a human performs these 4 checks and responds with "approved" (or reports a failure):

1. Open `http://127.0.0.1:3300/admin/episode-versions/27/edit?tab=notizen` (through the SSH tunnel, as an account with access to this release version) and confirm the "Notizen / Beiträge" tab shows the existing note correctly attributed to the `timer` role — NOT a "Keine Rollen zugeordnet" message. This is the exact D-05 regression from the first attempt; it must not reappear.
2. As a contributor account with only an `anime_contribution` role (no fansub-group role, no platform-admin), open `/me/dashboard` and click a new-assignment or rejected-note-revision card if one is present; confirm it opens the editor (not a 404 or the old workspace) and that "Zurück" returns to `/me/dashboard`.
3. Open a project page under `/me/projects/{animeId}/group/{fansubGroupId}` as a contributor on that project, click "Notizen & Medien" on any release row, confirm it opens the editor and "Zurück" returns to that same project page.
4. Visit `http://127.0.0.1:3300/me/releases/27/workspace` directly and confirm the browser ends up on `/admin/episode-versions/27/edit` (redirected, not a 404 or the old page).

Resume signal: type "approved" once all 4 checks pass, or describe which one failed.

## Next Phase Readiness
- Task 1 and Task 2's automated work is done and committed; the redirect is live and verified via curl, the dead route is gone, and the full automated gate (minus the two pre-existing, independently-confirmed-unrelated issues above) is green.
- Phase 181 as a whole is **not** complete — Task 3's live human checkpoint is the sole remaining gate.
- No blockers for a human to perform Task 3's verification now; the dev server is confirmed healthy and both the redirect and the editor route are live.

## Self-Check: PASSED

All 9 created/modified/deleted files confirmed present (or absent, for deletions) on disk. Both commit hashes (`22b2e81ca`, `7d3b4041e`) confirmed present in `git log`.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-14 (Tasks 1-2 only — Task 3 checkpoint pending)*
