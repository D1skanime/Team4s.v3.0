---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 12
subsystem: ui
tags: [eslint, design-system, react, css-modules, forms]

# Dependency graph
requires:
  - phase: 143-11
    provides: has_own_notes rejected-note fix (Criterion 5), unblocking Wave 6
provides:
  - ReleaseVersionMetadataFields.tsx retrofitted onto FormField/Input/Select (zero native <input>/<select>)
  - AnimeProjectTimelineSection.tsx retrofitted onto a CSS module + FormField (zero inline style={{}})
  - workspace.module.css .metadataError/.metadataSuccess on design tokens (zero raw hex)
  - no-restricted-syntax base severity 'error' with a frozen, shrink-only legacy exemption list
  - Backlog item tracking full migration of the 67 remaining legacy files (264 violations)
affects: [ui, eslint-config, admin-anime, admin-fansubs, member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESLint flat-config ratchet: base rule severity 'error' + a files-scoped override array of literal (glob-escaped) paths pinned to 'warn', shrink-only by convention/comment, never grown"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.module.css
    - .planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
    - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
    - frontend/eslint.config.mjs
    - .planning/ROADMAP.md
    - .planning/phases/143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz/143-VALIDATION.md

key-decisions:
  - "Checkpoint deviation (Rule 4, architectural): naive repo-wide flip of no-restricted-syntax to 'error' would have broken 264 pre-existing violations across 67 files never touched by this plan; escalated to user rather than silently reverting or silently proceeding."
  - "User chose Option A (scoped enforcement as a ratchet): base severity 'error' + a frozen, explicit, shrink-only file list pinned to 'warn', not a directory glob, so new/renamed files are never silently exempted."
  - "The plan's own literal acceptance command (npx eslint . --rule '{\"no-restricted-syntax\":\"error\"}' --quiet) cannot validate the final scoped state, since ESLint's --rule CLI flag overrides all files-scoped config overrides globally; npx eslint . (no --rule) is the correct verification command going forward."

requirements-completed: ["Criterion-6"]

# Metrics
duration: 19min (Task 3 only; Tasks 1-2 executed in a prior session)
completed: 2026-09-01
---

# Phase 143 Plan 12: Design-system retrofit + no-restricted-syntax ratchet Summary

**Retrofitted two admin form components onto `@/components/ui` primitives and CSS-module tokens, then closed a checkpoint by implementing `no-restricted-syntax: 'error'` as a frozen, shrink-only ratchet over the 264 real pre-existing violations the plan's own baseline had undercounted.**

## Performance

- **Duration:** Task 3 (this session): ~19 min (22:25 continuation start -> 22:44 final commit). Tasks 1-2 executed and committed in a prior session (see their own timestamps).
- **Started:** 2026-09-01T22:25:00Z (Task 1 commit, prior session)
- **Completed:** 2026-09-01T22:44:28Z
- **Tasks:** 3/3 (Tasks 1-2 pre-completed before this continuation; Task 3 executed this session)
- **Files modified:** 8 (2 code files from Tasks 1-2, 1 new CSS module, 1 CSS-module edit, 1 ESLint config, 2 planning docs, 1 new backlog item)

## Accomplishments
- `ReleaseVersionMetadataFields.tsx` uses `Input`/`Select`/`FormField` for all five migrated fields; zero native `<input>`/`<select>` remain (Task 1, prior session)
- `AnimeProjectTimelineSection.tsx` uses a new `AnimeProjectTimelineSection.module.css` instead of inline `style={{}}`, plus `FormField` replacing the duplicate native `<label>`; `workspace.module.css`'s `.metadataError`/`.metadataSuccess` now use `color-mix()` design tokens instead of raw hex (Task 2, prior session)
- `no-restricted-syntax` is now `'error'` repo-wide by default, with a real, measured, frozen exemption list (`LEGACY_NO_RESTRICTED_SYNTAX_FILES`) covering exactly the 67 files (60 production + 7 test) that still use native elements — confirmed via a full repo eslint run that the two Task 1-2 files are NOT in that list and pass at `'error'` with zero findings
- Backlog item filed with the real measured numbers (264 call sites, 67 files, measured 2026-09-01) so a future migration effort does not need to re-measure
- `ROADMAP.md` Criterion 6 and `143-VALIDATION.md`'s Criterion 6 section corrected to describe the actual scoped-ratchet implementation instead of an unqualified "no-restricted-syntax steht auf error" claim

## Task Commits

Tasks 1-2 (prior session, already committed before this continuation):

1. **Task 1: Retrofit ReleaseVersionMetadataFields.tsx onto FormField/Input/Select** - `3f45ac25` (feat)
2. **Task 2: Retrofit AnimeProjectTimelineSection.tsx onto a CSS module + FormField, fix workspace.module.css colors** - `d4ae135f` (feat)

Task 3 (this continuation, after the decision checkpoint):

3. **Task 3a: Flip no-restricted-syntax to error with frozen shrink-only legacy list** - `4966bbcf` (fix)
4. **Task 3b: File backlog item for no-restricted-syntax legacy migration** - `274df2bb` (docs)
5. **Task 3c: Correct Criterion 6 wording in ROADMAP.md and 143-VALIDATION.md** - `8b5c26cf` (docs)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx` - Field-by-field retrofit onto Input/Select/FormField (Task 1, prior session)
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx` - CSS-module + FormField retrofit (Task 2, prior session)
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.module.css` - New CSS module (`.timelineGrid`, `.errorText`, `.saveRow`) (Task 2, prior session)
- `frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css` - `.metadataError`/`.metadataSuccess` moved to `color-mix()` design tokens (Task 2, prior session)
- `frontend/eslint.config.mjs` - Base `no-restricted-syntax` severity to `'error'`; new `LEGACY_NO_RESTRICTED_SYNTAX_FILES` frozen-list override pinned to `'warn'` (Task 3)
- `.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md` - New backlog item with real measured numbers and full file list (Task 3)
- `.planning/ROADMAP.md` - Criterion 6 wording corrected (Task 3)
- `.planning/phases/143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz/143-VALIDATION.md` - Criterion 6 measurement strategy corrected, including a note that the plan's own literal `--rule` acceptance command cannot validate scoped overrides (Task 3)

## Decisions Made

- **Checkpoint escalated per Rule 4 (architectural change):** Task 3 as originally written ("flip severity from warn to error, sequenced after Tasks 1-2 land clean") rested on a stale code comment claiming "~17 Altfaelle ausserhalb components/ui." A real measurement (`npx eslint . --rule '{"no-restricted-syntax":"error"}' --quiet` against the full repo) found 267 violations across 70 files; excluding the pre-existing `src/components/ui/**` carve-out (which the `--rule` flag incorrectly forces to also error, since it bypasses all `files`-scoped overrides) leaves 264 violations across 67 real files (60 production, 7 test). Naively flipping the rule repo-wide would have broken the lint gate on 67 files this plan never touches — a structural change to the enforcement scope, not a bug fix. The prior executor correctly reverted the naive edit and escalated via a decision checkpoint rather than silently picking either "revert to warn" or "force error everywhere."
- **User chose Option A — scoped enforcement as a ratchet:** base rule stays `'error'`; a new override block (mirroring the existing `src/components/ui/**` override's shape) pins a frozen, explicit file list to `'warn'`. The list uses literal paths (with `\[`/`\]`-escaped Next.js dynamic-route brackets, since minimatch treats `[...]` as a character class) rather than directory globs, specifically so files created after 2026-09-01 in the same directories are never silently exempted — a new file trips `'error'` immediately, and the list can only shrink (delete an entry when its file is migrated), never grow.
- **The plan's own literal acceptance command does not validate the final state:** ESLint's `--rule` CLI flag forces the given severity for a rule across the entire lint run, ignoring any `files`-scoped override in the config (this is standard ESLint CLI behavior, not a bug in this implementation). Running it against the ratcheted config still reports all 264 legacy violations plus the 3 `src/components/ui/**` primitive files (extending its own carve-out too), because `--rule` bypasses both overrides identically. The correct verification command for the scoped state is `npx eslint .` with no `--rule` override, which respects the config file's own severity per file and confirmed zero `no-restricted-syntax` errors repo-wide. This is documented in the corrected `143-VALIDATION.md`.

## Deviations from Plan

### Auto-fixed / Checkpoint-resolved Issues

**1. [Rule 4 - Architectural, resolved via checkpoint] Task 3's literal instruction ("flip to error, sequence after Tasks 1-2") was based on a false premise about violation count**
- **Found during:** Task 3 (prior session attempt)
- **Issue:** Plan and `143-VALIDATION.md` both assumed ~17 pre-existing native-element violations outside `components/ui`; the real number is 264 violations across 67 files. A naive flip would have broken the lint gate for 67 untouched files.
- **Resolution:** Escalated to user via decision checkpoint (prior session); user selected Option A (scoped ratchet). Implemented this session per the user's explicit specifics: frozen explicit file list (not globs), shrink-only comment, backlog item with real numbers, corrected ROADMAP.md/143-VALIDATION.md wording.
- **Files modified:** `frontend/eslint.config.mjs`, `.planning/ROADMAP.md`, `.planning/phases/143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz/143-VALIDATION.md`, `.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md`
- **Verification:** `npx eslint .` reports zero `no-restricted-syntax` errors and 11 pre-existing errors from other rules (matching the documented baseline); the two Task 1-2 files individually pass `npx eslint <file>` with zero findings and are confirmed absent from `LEGACY_NO_RESTRICTED_SYNTAX_FILES`; the raw `--rule`-forced count (267, or 264 excluding `components/ui/**`) matches the frozen list's file/violation count, confirming the list is real and not accidentally too broad or too narrow.
- **Committed in:** `4966bbcf`, `274df2bb`, `8b5c26cf`

---

**Total deviations:** 1 checkpoint-resolved architectural deviation (Rule 4), user-directed.
**Impact on plan:** Criterion 6's stated outcome ("no-restricted-syntax steht auf error") is now true and honestly qualified in both ROADMAP.md and 143-VALIDATION.md — it was not left describing unqualified full enforcement while the code actually carries an exemption list. No scope creep beyond what the user explicitly directed.

## Issues Encountered

Next.js dynamic-route directory segments (`[id]`, `[episodeId]`, `[versionId]`, `[groupId]`) contain literal square brackets, which minimatch (ESLint flat config's `files` matcher) interprets as glob character classes. Escaped them (`\[id\]`) in `LEGACY_NO_RESTRICTED_SYNTAX_FILES` so the override matches the literal paths rather than a character-class pattern; verified working via a full `npx eslint .` run showing exactly those files downgraded to `'warn'`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 6 (Criterion 6) is complete. Wave 7 (143-13, Criterion 7 backend aggregation) can proceed — it depends on Criterion 3's repository aggregation (already complete, Plan 143-09) and Criterion 6 is not itself a dependency for Wave 7, but Wave sequencing in ROADMAP.md marks 143-13 as blocked on 143-12 completion, which this plan now satisfies. No blockers for 143-13/143-14.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*
