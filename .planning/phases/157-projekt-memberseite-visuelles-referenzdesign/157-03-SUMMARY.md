---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 03
subsystem: frontend
tags: [react, nextjs, css-modules, project-member, role-color, ui-restructure]

# Dependency graph
requires: ["157-02"]
provides:
  - "ProjectMemberNoteEntry: new, self-contained compact timeline-row component for the notes section, independent of the shared PublicNoteCard"
  - "Role COLOR unconditional on every note entry via the single existing data-color-key -> --role-accent seam (P157-13); role NAME chip gated on hasMultipleRoles"
  - "Concrete, singular/plural-correct notes pager label ('Weitere N Beiträge anzeigen' / 'Weiteren 1 Beitrag anzeigen')"
  - "Regression test proving a mixed-role list keeps each entry's own role color distinct (P157-13 Nachtrag 2)"
affects: [157-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Whole-row Link component with a nested Button toggle guarded by preventDefault/stopPropagation, to avoid double-navigation semantics"
    - "Solid border-inline-start + dot accent consuming var(--role-accent) directly (no color-mix), matching the already-proven roleCatalog.accessibility.test.ts '/me/projects' 3:1 pattern"

key-files:
  created:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
    - .planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-CONTEXT.md
  deleted:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx

key-decisions:
  - "Task 1 was authored with tdd=\"true\" in the plan frontmatter but lists no dedicated test file in its <files>/<verify> (only a tsc grep) — the actual RED/GREEN proof for ProjectMemberNoteEntry's behavior lives entirely in Task 3's rewritten ProjectMemberNotesSection.test.tsx (including the mandatory mixed-role addendum). Task 1 was executed as a plain feat commit verified by tsc/eslint per its own literal <verify> block, and its behaviors are fully covered by Task 3's suite — no separate RED-then-GREEN commit pair was created for Task 1 alone, since no isolated test artifact was scoped to it."
  - "The multi-role NAME chip is appended into the same meta-line <p> as a nested <span> (not a separate DOM sibling), so it reads visually as part of 'Folge X · v1 · Date · Rolle' while still being its own text node for exact-string test assertions (per the plan's <action> literal wording)."
  - "The per-entry timeline dot/connector line is drawn with each ProjectMemberNoteEntry's own ::before/dot pseudo-elements (position: relative on .entry), since no shared timeline-line container was in this plan's file scope — .notesGrid became a plain flex column and the visual continuity comes from consistent per-entry offsets, not a wrapping <ul> with a single shared line."

requirements-completed: [P157-05, P157-06, P157-07, P157-13]

# Metrics
duration: 45min
completed: 2026-09-12
---

# Phase 157 Plan 03: Notiz-Timeline + Rollenfarb-Nachtrag Summary

**Replaced the large, role-header-per-note cards with a compact timeline of flat rows carrying a mandatory role-color accent on every entry (independent of role count) and a role-name chip only for multi-role members, plus a concrete singular/plural-correct pager label.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-12
- **Tasks:** 3/3 completed
- **Files modified:** 5 modified, 2 created, 1 deleted, 1 docs file committed separately

## Accomplishments

- **`ProjectMemberNoteEntry` (Workstream E, P157-05/P157-06):** brand-new, self-contained component — never imports `PublicNoteCard` — rendering a compact timeline row: meta line (`Folge {episode} · {version} · {date}`, plus a role-name chip appended only when `hasMultipleRoles`), optional bold title, clamp/toggle body (ported clamp/`stripHtml` logic from `PublicNoteCard`, `clampThreshold=180`), trailing `DisclosureIndicator` chevron. The whole row is a single `next/link` `Link` to `${projectPath}/releases/{release_version_id}`, carrying `data-note-entry` for `shot-projectmember.mjs`'s existing selector. No "Notiz zu Folge X" line and no footer-link row remain.
- **Role color always on (P157-13 addendum):** every rendered entry's root `Link` carries `data-color-key={boundedColorKey(note.role_color_key)}` unconditionally — the CSS module's `.entry` (border-inline-start) and `.dot` both consume `var(--role-accent)` directly (solid, no `color-mix`), matching the already-proven `roleCatalog.accessibility.test.ts` "/me/projects" 3:1 pattern. No second color mapping was introduced anywhere.
- **Mehr/Weniger toggle uses the `Button` primitive** (`variant="ghost"`, `size="sm"`) — never a hand-built native `<button>` — with `event.preventDefault()`/`event.stopPropagation()` so the nested toggle never triggers the ancestor Link's navigation. `grep -c "<button" ProjectMemberNoteEntry.tsx` returns `0`.
- **Wiring (Task 2):** `ProjectMemberNotesSection` now imports/renders `ProjectMemberNoteEntry` (single-column list, `.notesGrid`'s `grid-template-columns` 2-column rule removed entirely) and threads a new `hasMultipleRoles: boolean` prop. `ProjectMemberPage.tsx` passes `hasMultipleRoles={counts.roles > 1}` at the existing call site. `ProjectMemberNoteCard.tsx` deleted (its only two importers — the section and its test file — were both updated in this plan).
- **Concrete pager label (Workstream F, P157-07):** the notes "load more" button now reads `Weitere N Beiträge anzeigen` with `N = Math.min(PAGE_LIMIT, count - shown.length)`, or `Weiteren 1 Beitrag anzeigen` when `N=1`, replacing the old generic "Weitere Beiträge laden". `useProjectMemberCollection.ts` was not touched. The `{shown} von {count} angezeigt` / `Alle {count} angezeigt` / `Weniger anzeigen` texts were left exactly as-is.
- **Test suite adapted (Task 3), not deleted:** `describe('ProjectMemberNoteCard', ...)` renamed to `describe('ProjectMemberNoteEntry', ...)`, importing the new component. Single-role case now asserts role NAME text is absent (`queryByText`) while `data-color-key` still equals `boundedColorKey(note.role_color_key)`; a companion multi-role case asserts the NAME text is present with the identical color. `ProjectMemberNotesSection`'s describe block swapped `getAllByRole('article')` for `getAllByRole('link')` (the entry is a `Link`, not an `<article>`) and updated the pager click target to the concrete `'Weitere 9 Beiträge anzeigen'` label (15 shown of 24, `min(10, 24-15)=9`).
- **Mandatory Nachtrag-2 regression test added:** a new test renders two `ProjectMemberNoteEntry`s from the same section — one `typesetter` (`#7b3c4e`), one `translator` (`#27664f`) — and asserts (1) the two rendered links carry **distinct** `data-color-key` values, each equal to `boundedColorKey()` of **its own** note's `role_color_key` (the actual regression catcher: an entry that wrongly inherited color from page/summary context would pass every prior single-fixture check and fail only here); (2) both role-name chips (`Typesetting`/`Übersetzung`) render because `hasMultipleRoles` is true; (3) neither role name is exposed as a heading (`queryByRole('heading', ...)` is null) and no "Notiz zu Folge" text remains — proving no large role header was reintroduced in the mixed-role case either.

## Task Commits

1. **Task 1: `ProjectMemberNoteEntry` component + CSS module** - `dcd5c4c8` (feat)
2. **Task 2: wire into NotesSection, delete old adapter, concrete pager label, thread `hasMultipleRoles`** - `d5bc989e` (feat)
3. **Task 3: adapt `ProjectMemberNotesSection.test.tsx`, add Nachtrag-2 mixed-role regression test** - `e89d50f8` (test)
4. **Concurrent-writer doc addendum committed separately:** `42f1b3a3` (docs) — 157-CONTEXT.md's "Pflicht-Acceptance-Test (Nachtrag 2, 2026-09-12)" subsection, which this plan's Task 3 implements.

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified/Deleted

- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx` — new compact timeline-row component
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css` — new, dedicated CSS module, zero hex literals, `var(--role-accent)` only
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx` — imports/renders `ProjectMemberNoteEntry`, `hasMultipleRoles` prop, concrete pager label
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css` — `.notesGrid` is now a plain single-column flex list, 2-column grid rule removed
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` — renamed/adapted describe block, new Nachtrag-2 mixed-role test, `getAllByRole('link')`, concrete pager label assertion
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx` — passes `hasMultipleRoles={counts.roles > 1}` to `ProjectMemberNotesSection`
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` — **deleted** (adapter replaced by `ProjectMemberNoteEntry`)
- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-CONTEXT.md` — committed the concurrent-writer Nachtrag-2 addendum this plan implements

## Decisions Made

- Task 1's `tdd="true"` frontmatter attribute did not map to a literal RED/GREEN commit pair, since the plan itself scoped no dedicated test file to Task 1 (only a `tsc` grep in `<verify>`) — the full behavioral proof (including the P157-13 addendum-2 regression case) lives in Task 3's test file, which does exercise every `<behavior>` bullet from Task 1 end-to-end against real rendered output.
- The multi-role NAME chip is a nested `<span className={styles.roleChip}>` inside the same meta-line `<p>`, not a separate sibling element — this keeps the visual "Folge X · v1 · Date · Rolle" reading intact while still being its own exact-matchable text node for `getByText`/`queryByText` assertions.
- The timeline dot/connecting-line visual is implemented per-entry (each `.entry` has its own `position: relative` `::before`/`.dot`), not via a shared wrapping `<ul>` with one continuous line — `ProjectMemberNotesSection.module.css`/`.tsx` were kept out of the CSS-module scope for this decorative detail, consistent with the plan's file list (only `.notesGrid`'s grid rule was in scope for that file).

## Deviations from Plan

### Auto-fixed / clarified

**1. [Task-scoping clarification, not a Rule 1-4 fix] Task 1's `tdd="true"` marker without a dedicated test file**
- **Found during:** Task 1
- **Issue:** Task 1's frontmatter carries `tdd="true"` but its own `<files>`/`<verify>` list no test file — only `npx tsc --noEmit | grep ProjectMemberNoteEntry`.
- **Resolution:** Implemented Task 1 as a single `feat` commit satisfying its literal `<verify>` block; Task 3's full test suite (executed afterward) proves every `<behavior>` bullet, including the P157-13 Nachtrag-2 mixed-role case. No functional gap — every acceptance criterion from Task 1 is exercised by real rendered-DOM assertions in the final test suite.
- **Files affected:** none beyond the plan's own file list.
- **Commit:** `dcd5c4c8` (Task 1), proven by `e89d50f8` (Task 3).

No Rule 1-4 auto-fixes were needed — no bugs, missing critical functionality, blocking issues, or architectural changes were encountered.

## TDD Gate Compliance

Not applicable at the plan level: this plan's frontmatter `type` is `execute`, not `tdd`, so the Plan-Level TDD Gate Enforcement section does not apply. Task 1 carried a task-level `tdd="true"` marker; see "Deviations" above for how its behavior was proven.

## Known Stubs

None — `ProjectMemberNoteEntry` renders real note data (`body_html`/`body_text`/`title`/`role_label`/`role_color_key`) with no hardcoded empty values or placeholder text.

## Threat Flags

None beyond the plan's own threat model (T-157-08/T-157-09/T-157-10/T-157-13, all already disposed `mitigate`/`accept` in the plan and implemented as specified: `RichTextRenderer` reused verbatim for `body_html`, JSX auto-escaping for `body_text`, `preventDefault`/`stopPropagation` on the toggle, and the single existing `globals.css` color-derivation seam with only a solid `var(--role-accent)` stripe/dot — no new trust boundary, no new color-mix formula).

## Verification Results

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'ProjectMemberNoteEntry\|ProjectMemberNotesSection\|ProjectMemberNoteCard\|ProjectMemberPage'"` — `OK` (no errors in any file this plan touched)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"` (full project) — clean except the pre-existing, explicitly out-of-scope `page.test.tsx` `episodes`-fixture gap (2 errors, tracked for 157-06; confirmed unrelated to this plan's diff)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx"` — 6/6 pass (5 `ProjectMemberNoteEntry` cases incl. the Nachtrag-2 mixed-role test, 1 `ProjectMemberNotesSection` pagination case)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/lib/roleCatalog.accessibility.test.ts"` — 17/17 pass, file unmodified, guard not weakened
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx'"` — 6/6 pass at runtime (the tsc gap above is a type-fixture-only issue, does not affect Vitest execution)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` — full frontend suite: 301 passed | 1 skipped (302 files), 2324 tests passed, 3 todo (+2 net tests vs. 157-02's 2322, matching this plan's net test-count change) — no regressions anywhere
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint ..."` on every created/modified file in this plan — zero errors/warnings
- `grep -rn "ProjectMemberNoteCard" frontend/src` — zero results, confirming the deleted adapter has no remaining importers
- `grep -n "#[0-9a-fA-F]\{6\}" ProjectMemberNoteEntry.module.css` — zero results (no hex literals)
- `grep -n "color-mix" ProjectMemberNoteEntry.module.css` — zero results (no unproven contrast formula introduced)
- `grep -c "<button" ProjectMemberNoteEntry.tsx` — `0` (only `<Button` primitive usages)
- `wc -l` on every modified/created production file in this plan — all well under the 450-line ceiling (largest: 103 lines)

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
- CONFIRMED DELETED: frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx (no longer exists, no remaining importers)
- FOUND commit dcd5c4c8 in git log
- FOUND commit d5bc989e in git log
- FOUND commit e89d50f8 in git log
- FOUND commit 42f1b3a3 in git log

## Next Steps

- Plan 157-06 (Testmatrix/Live-UAT) can proceed; it will need to close the tracked `page.test.tsx` `episodes`-fixture tsc gap (unchanged by this plan, confirmed via targeted `grep`) and run the full Live-UAT screenshot pass against the now-timeline-shaped notes section.
- No backend follow-up needed; this plan consumed the existing `role_color_key`/`boundedColorKey()`/`globals.css` seam without any new mapping.
