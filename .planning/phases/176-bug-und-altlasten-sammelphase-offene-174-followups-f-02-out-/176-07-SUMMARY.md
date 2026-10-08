---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 07
subsystem: ui
tags: [react, nextjs, design-system, sprachqualitaet, fansub-admin]

# Dependency graph
requires:
  - phase: 176-05
    provides: Permission-Matrix / design-system closure patterns for other fansub-admin files
  - phase: 176-06
    provides: Capability-gating pattern precedent for the same fansub-admin directory
provides:
  - "Fansub create page (/admin/fansubs/create) fully migrated to @/components/ui primitives (D-04), zero native <input>/<select> remaining"
  - "Repo-wide ASCII-umlaut sweep closing 8 genuine user-facing violations beyond the single named D-03 violation"
  - "New AdminFansubCreateBasicInfoSection.tsx presentational section, completing the aliases/links/media/basic-info 4-way split of this page"
affects: [fansub-admin-create, design-system-migration-followups]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Basic Information block extracted into its own presentational section component (AdminFansubCreateBasicInfoSection), following the same props-driven split already used for AdminFansubCreateAliasesSection/AdminFansubCreateLinksSection/AdminFansubCreateMediaSection -- state stays owned by the page, year-range props (yearMin/yearMax) threaded through rather than redefined, to keep the error-message computation and the YearPicker bounds using the exact same values"

key-files:
  created:
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx
  modified:
    - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts
    - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/admin/fansubs/create/page.test.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
    - backend/internal/middleware/comment_auth.go
    - backend/internal/handlers/app_auth.go
    - backend/internal/handlers/admin_content_anime.go
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - backend/internal/handlers/segment_render_worker.go

key-decisions:
  - "Extracted Basic Information into a new section component rather than swapping elements in place, because page.tsx was already 610 lines (pre-existing, not caused by this task) before any change -- CLAUDE.md's 450-line cap and this plan's own acceptance criteria required bringing it back under the limit, and splitting out the one remaining inline section (matching the page's existing 3-way section split) was the lowest-risk way to do that without an architectural change."
  - "Repo-wide ASCII-umlaut sweep limited to genuinely user-facing Go response strings/details fields and frontend toast/JSX text -- excluded log.Printf-only strings (segment_render_subtitles.go Diagnostic field, segment_preview_auto.go) and a few technical enum/needle-matching strings (fansub_media_review_handler.go's in_pruefung identifier, client.ts's intentional dual-spelling needle list) that are out of the Sprachqualitaet scope per CLAUDE.md (code identifiers, internal logs)."
  - "Did not add an `invalid` prop to the Links section's url Input (unlike the alias Input, which the plan explicitly asked to mirror FansubBasicInfoTab.tsx's invalid+onKeyDown pattern) -- the original native url input never carried an aria-invalid/invalid treatment of its own (only the wrapping div did), so adding it would have changed visible behavior beyond a pure component swap."

patterns-established:
  - "When a primitive-migration task also needs to fix D-22 (450-line cap) fallout, prefer extracting a new props-driven presentational section over inlining in place, following whatever 1-level sibling-section pattern already exists on that page"

requirements-completed: []

# Metrics
duration: ~40min (Tasks 1-2)
completed: 2026-10-08
---

# Phase 176 Plan 07: Fansub create page -- Umlaute + UI primitives (D-03/D-04) Summary

**The fansub create page's last 9 native form fields (name/slug/status/groupType/country, 3 link-row fields, 1 alias field) are now @/components/ui primitives matching the already-migrated edit-page sibling exactly, and 9 genuine ASCII-umlaut violations (1 named + 8 found by a repo-wide sweep, spanning both this page and 5 unrelated backend handler files) are corrected to real umlauts.**

## Status

**2 of 3 tasks complete. Plan paused at the mandatory `checkpoint:human-verify` (Task 3, live-UAT).** Tasks 1 and 2 are implemented, tested, and committed. Task 3 requires a human to visit `/admin/fansubs/create` through the SSH tunnel and confirm visual/functional parity plus the corrected toast text -- this cannot be automated and has not yet been performed.

## Performance

- **Duration:** ~40 min (Tasks 1-2)
- **Tasks:** 2 of 3 completed (checkpoint awaiting human verification)
- **Files modified:** 11 (1 created)

## Accomplishments

- Fixed the named D-03 violation (`"Tag hinzugefuegt."` -> `"Tag hinzugefügt."`) plus a sibling violation in the same save-success toast (`"...ueber den DB-Asset-Flow..."` -> `"...über den DB-Asset-Flow..."`) in `useAdminFansubCreateActions.ts`.
- Repo-wide sweep (filtered grep over `frontend/src` + `backend/internal` for German ae/oe/ue-substitution patterns, manually triaged) found and fixed 7 further genuine user-facing violations, all confirmed to actually reach a JSON response `message`/`details` field or a rendered string (not log-only or identifier text):
  - `comment_auth.go`: `commentAuthInvalidTokenMessage`, `commentAuthStateErrorMessage`
  - `app_auth.go`: logout-status error message (2 call sites)
  - `admin_content_anime.go`: `"vollstaendig"` -> `"vollständig"`
  - `admin_content_release_theme_assets.go`: `"Dateigroesse"` -> `"Dateigröße"` (2 call sites)
  - `segment_render_worker.go`: `"gueltige"`/`"ungueltig"` -> `"gültige"`/`"ungültig"` (both persisted in the JSON-exposed `error_message` field consumed by the admin render-status UI)
- Found and fixed one more violation (`"Pruefe Slug..."` -> `"Prüfe Slug..."`) while migrating `page.tsx`'s Basic Information block in Task 2 -- missed by Task 1's grep patterns.
- All 9 confirmed native `<input>`/`<select>` elements across `page.tsx`, `AdminFansubCreateLinksSection.tsx`, and `AdminFansubCreateAliasesSection.tsx` are now `Input`/`Select` from `@/components/ui`, with identical `value`/`onChange`/`disabled`/`required`/validation wiring.
- Extracted a new `AdminFansubCreateBasicInfoSection.tsx` to keep `page.tsx` under the 450-line cap after the swap (file was already 610 lines before this task; see Deviations).

## Task Commits

1. **Task 1: Fix ASCII-umlaut user strings (D-03)** - `17e8957b` (fix)
2. **Task 2: Replace the 9 native form fields with @/components/ui primitives (D-04)** - `798805e1` (feat)

Task 3 (`checkpoint:human-verify`) has not run yet -- plan is paused pending human live-UAT.

## Files Created/Modified

- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts` - 2 ASCII-umlaut fixes in toast strings
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts` - updated 2 assertions to match the corrected umlaut text
- `frontend/src/app/admin/fansubs/create/page.tsx` - 5 native fields (name/slug/status/groupType/country) migrated to `Input`/`Select`; Basic Information block extracted into `AdminFansubCreateBasicInfoSection`; unused `FansubGroupType`/`FansubStatus`/`YearPicker`/`STATUS_OPTIONS` imports removed; `"Pruefe Slug..."` -> `"Prüfe Slug..."` fix carried into the new section component
- `frontend/src/app/admin/fansubs/create/page.test.tsx` - updated 1 assertion + its explanatory comment to match the corrected toast text (previously documented as an intentionally-uncorrected deviation; now actually fixed)
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx` - **new file**: name/slug/status/groupType/country fields + founded/dissolved YearPicker, extracted from `page.tsx`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx` - link_type `Select`, name/url `Input`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx` - alias `Input` with `invalid` prop wired to `aliasError`
- `backend/internal/middleware/comment_auth.go` - 2 ASCII-umlaut fixes in response-message constants
- `backend/internal/handlers/app_auth.go` - 1 ASCII-umlaut fix, 2 call sites
- `backend/internal/handlers/admin_content_anime.go` - 1 ASCII-umlaut fix
- `backend/internal/handlers/admin_content_release_theme_assets.go` - 1 ASCII-umlaut fix, 2 call sites
- `backend/internal/handlers/segment_render_worker.go` - 2 ASCII-umlaut fixes

## Decisions Made

- Extracted `AdminFansubCreateBasicInfoSection.tsx` rather than inlining the primitive swap, to resolve the pre-existing 450-line cap breach (see Deviations below).
- Limited the repo-wide umlaut sweep to confirmed user-facing surfaces (Go JSON `message`/`details` fields, frontend toast/JSX text); excluded log-only strings and technical enum/needle-matching identifiers, consistent with CLAUDE.md's explicit scope (comments and code identifiers are exempt).
- Did not add an `invalid` prop to the Links section's url `Input` (kept scoped to the plan's explicit instruction to mirror the invalid+onKeyDown pattern only for the alias field).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality / CLAUDE.md modularity constraint] `page.tsx` already exceeded the 450-line cap before this task started**
- **Found during:** Task 2
- **Issue:** `page.tsx` was 610 lines on `main` before any change in this plan -- a pre-existing violation of CLAUDE.md's "Production code files should stay at or below 450 lines" constraint, unrelated to this task's own changes but directly implicated by this task's own acceptance criteria ("Files touched stay under 450 lines each (D-22); if page.tsx would exceed 450 lines because of this change, split a section out rather than letting it grow past the limit").
- **Fix:** Extracted the inline "Basic Information" `<details>` block (the exact 5 fields this task was migrating) into a new `AdminFansubCreateBasicInfoSection.tsx`, matching the page's existing 3-way section split (`AdminFansubCreateAliasesSection`/`AdminFansubCreateLinksSection`/`AdminFansubCreateMediaSection`). `page.tsx` is now 426 lines; the new file is 232 lines.
- **Files modified:** `frontend/src/app/admin/fansubs/create/page.tsx`, `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx` (new)
- **Verification:** `wc -l` on all touched files confirms all are under 450 lines; `npx vitest run`, `npx eslint`, and `npx tsc --noEmit` show no new failures/warnings for this directory.
- **Committed in:** `798805e1` (part of Task 2's commit)

**2. [Rule 1 - Bug, same category as D-03] `"Pruefe Slug..."` ASCII-umlaut violation missed by Task 1's sweep**
- **Found during:** Task 2 (while reading/migrating the exact block containing this string)
- **Issue:** `frontend/src/app/admin/fansubs/create/page.tsx` had `"Pruefe Slug..."` where the sibling edit-page file (`FansubBasicInfoTab.tsx:171`) correctly uses `"Prüfe Slug..."`. Task 1's grep patterns (built around common whole-word German verbs) did not match this particular word.
- **Fix:** Corrected to `"Prüfe Slug..."` in the new `AdminFansubCreateBasicInfoSection.tsx`.
- **Files modified:** `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`
- **Verification:** Visual grep confirms no remaining `Pruefe` in the directory; vitest green.
- **Committed in:** `798805e1` (part of Task 2's commit)

**3. [Rule 2 - Missing correctness, D-03 broader mandate] 7 additional genuine ASCII-umlaut violations found outside this plan's `files_modified` list**
- **Found during:** Task 1's repo-wide sweep
- **Issue:** `comment_auth.go`, `app_auth.go`, `admin_content_anime.go`, `admin_content_release_theme_assets.go`, and `segment_render_worker.go` all contained ASCII-umlaut substitutions in strings that are genuinely sent to the end user (gin.H JSON `message`/`details` fields, or persisted into the JSON-exposed `error_message` column consumed by an admin render-status UI). Confirmed via usage-site inspection (not just the string's own file) that each is a real Go-response string, not an internal log.
- **Fix:** See "Files Created/Modified" above for the exact corrections.
- **Files modified:** `backend/internal/middleware/comment_auth.go`, `backend/internal/handlers/app_auth.go`, `backend/internal/handlers/admin_content_anime.go`, `backend/internal/handlers/admin_content_release_theme_assets.go`, `backend/internal/handlers/segment_render_worker.go`
- **Verification:** `docker compose exec team4sv30-backend go build ./...` and `go vet ./internal/handlers/... ./internal/middleware/...` both clean; grepped all `_test.go` files for the old strings, none asserted on them.
- **Committed in:** `17e8957b` (part of Task 1's commit)

## Checkpoint Pending (Task 3)

Task 3 is the plan's mandatory `checkpoint:human-verify` (gate `blocking`) and has **not** been performed. It requires a human to:
1. Open `http://127.0.0.1:3300/admin/fansubs/create` via the SSH tunnel.
2. Confirm every migrated field looks/behaves consistent with `/admin/fansubs/{id}/edit`.
3. Submit the form end to end and confirm the "Tag hinzugefügt." toast now shows the correct umlaut.

This plan is **not closed** until that checkpoint is approved or issues are reported back.

## Issues Encountered

None blocking. Local `node_modules` is not installed on the host; all `vitest`/`eslint`/`tsc`/`go build`/`go vet` commands were run inside the running `team4sv30-backend`/`team4sv30-frontend` Docker containers per the project's Docker-Compose-centric dev workflow. Pre-existing, unrelated `tsc --noEmit` errors (`ReleaseDetailHero.test.tsx`, a Next.js generated route-types file) were observed but are out of this plan's scope (Scope Boundary rule) and were not touched.

## User Setup Required

None yet for Tasks 1-2. Task 3 requires the human to perform the live-UAT steps described above.

## Next Phase Readiness

Not ready -- plan is paused at the Task 3 checkpoint. Once a human approves (or reports issues), a continuation agent should resume from Task 3, finalize this SUMMARY, and advance the phase's plan counter.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Status as of this summary: Paused at checkpoint -- 2/3 tasks done, Task 3 (live-UAT) awaiting human verification*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx
- FOUND: frontend/src/app/admin/fansubs/create/page.tsx
- FOUND: frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
- FOUND: frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
- FOUND: frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts
- FOUND: backend/internal/middleware/comment_auth.go
- FOUND: backend/internal/handlers/app_auth.go
- FOUND: backend/internal/handlers/admin_content_anime.go
- FOUND: backend/internal/handlers/admin_content_release_theme_assets.go
- FOUND: backend/internal/handlers/segment_render_worker.go
- FOUND commit 17e8957b (fix, Task 1)
- FOUND commit 798805e1 (feat, Task 2)
