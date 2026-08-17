---
phase: 114-oeffentliche-fansub-gruppen-uebersicht
reviewed: 2026-07-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - backend/internal/models/fansub.go
  - backend/internal/repository/fansub_repository.go
  - frontend/src/app/fansubs/page.tsx
  - frontend/src/app/fansubs/page.module.css
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/ui/AvatarStack.tsx
  - frontend/src/types/fansub.ts
  - shared/contracts/fansubs.yaml
  - backend/internal/repository/fansub_repository_test.go
  - frontend/src/app/fansubs/page.test.tsx
  - frontend/src/components/layout/AppShell.test.tsx
  - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 114: Code Review Report

**Reviewed:** 2026-07-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 114 adds a `projects_count` backend aggregate, activates the "Fansub-Gruppen" AppShell nav
entry in both the authenticated and anonymous nav arrays, and ships a new public SSR `/fansubs`
directory page. This is a well-executed, tightly-scoped phase: every phase-specific risk called
out in the research doc was traced end-to-end and found correctly handled.

Verified explicitly:
- **SQL correctness:** the new `ProjectsCount` batched query in `attachGroupCounts`
  (`backend/internal/repository/fansub_repository.go:1676-1691`) mirrors
  `listPublicFansubProjects`'s `WHERE ... AND a.status <> 'disabled'` filter exactly, is fully
  parameterized (`$1` bound to the `ids` slice via pgx, no string interpolation of user input),
  and follows the same `populateCountMap` batching shape as the three pre-existing count blocks.
  A dedicated source-invariant test
  (`TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime`,
  `fansub_repository_test.go:158-185`) pins the filter so a future refactor cannot silently drop
  it and reintroduce the exact `anime_relations_count` divergence bug the phase was built to
  avoid.
- **Frontend directory page:** `getFansubList({ per_page: 500 })` is called exactly once (no
  per-row fan-out, confirmed by both the code and a dedicated test), sorting is
  `release_versions_count` DESC / `name.localeCompare(..., 'de')` ASC exactly as specified, the
  table consumes `group.projects_count` (not `anime_relations_count`), and both the round-logo
  image and the group name are rendered as plain React text/attribute values (no
  `dangerouslySetInnerHTML`, no raw HTML interpolation) — XSS-safe by construction.
- **AppShell:** both `AppShellNavGroups.publicItems` (authenticated) and
  `AppShellAnonNavGroups.publicItems` (anonymous) now carry an enabled `Fansub-Gruppen` entry
  linking to `/fansubs`; the unrelated `Dashboard` and `Suche` entries remain correctly
  `disabled: true` with their `badge: 'bald'` — no accidental over-enabling.
- **Global UI-System / primitives:** the directory page uses only `@/components/ui` primitives
  (`Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `PageHeader`,
  `EmptyState`, `ErrorState`, `getErrorStateCopy`, `initials`) — no hand-built `<table>`,
  `<select>`, `<input>`, or `<button>`-as-link markup.
- **German umlauts:** all user-facing strings (`Fehler beim Laden`, `Noch keine
  Fansub-Gruppen`, `Alle Fansub-Gruppen im Überblick — sortiert nach aktivsten Gruppen zuerst.`,
  column labels) use correct umlauts, matching the UI-SPEC's locked copy exactly.
- **Contract consistency:** `projects_count`/`ProjectsCount` is present, correctly typed
  (`int`/`int32`/`number`), and positioned identically (after `anime_relations_count`, before
  `release_versions_count`) across the Go model, the OpenAPI contract, and the TS type.

No Critical or security-relevant findings. Two minor Info-level UI-SPEC/spacing deviations and
one Warning about compounding an already large backend file are noted below.

## Warnings

### WR-01: New `ProjectsCount` query appended to an already-oversized repository file

**File:** `backend/internal/repository/fansub_repository.go:1676-1691` (new code), file total 2318 lines
**Issue:** CLAUDE.md's "Modularität" constraint caps production files at 450 lines
("Production code files should stay at or below 450 lines; larger implementations must be split
before they become monolithic"). `fansub_repository.go` was already roughly 5x over this ceiling
before Phase 114. This phase adds a new ~16-line `populateCountMap` block plus an explanatory
comment directly into `attachGroupCounts` inside this same file rather than extracting any part
of the count-attachment logic into a smaller, colocated file. The change itself is small and
correct, but it compounds an existing violation instead of taking the opportunity to start
splitting it (e.g. moving `attachGroupCounts`/`populateCountMap`/`attachGroupLinks` into a
`fansub_repository_counts.go` file, which would be a low-risk, additive-only extraction).
**Fix:** Not blocking for this phase (pre-existing condition, not introduced by Phase 114's
diff), but flag for a follow-up refactor task: extract the `attachGroupCounts`,
`attachGroupLinks`, `populateCountMap`, and `hydrateFansubGroup` helpers (currently
`fansub_repository.go:1649-1846`) into a separate `fansub_repository_counts.go` file in the same
package, reducing the primary file by roughly 200 lines as a first step toward the 450-line
target.

## Info

### IN-01: `AppShell.tsx` is now 448 lines — 2 lines under the 450-line CLAUDE.md ceiling

**File:** `frontend/src/components/layout/AppShell.tsx` (448 lines total)
**Issue:** The file was already close to the limit before this phase; adding the new
`Fansub-Gruppen` entry to `AppShellNavGroups.publicItems` (line 123) pushed it right to the edge
of CLAUDE.md's modularity ceiling. Not a violation today, but any further nav-item addition (a
near-certainty given the ongoing nav-activation pattern seen across recent phases) will exceed
450 lines without warning.
**Fix:** Consider extracting the `publicItems`/`adminItems`/`fixedMyItems` array-building logic
for both `AppShellNavGroups` and `AppShellAnonNavGroups` into a colocated
`AppShell.navItems.ts` helper module ahead of the next nav change, rather than reactively
splitting once the file trips the 450-line gate.

### IN-02: Logo/name gap uses `--space-2` instead of the UI-SPEC's assigned `--space-1` token

**File:** `frontend/src/app/fansubs/page.module.css:7-11`
**Issue:** `114-UI-SPEC.md` (Spacing Scale table) explicitly assigns `--space-1` (4px) to the
"Logo/name inline gap, tight inline padding" role. The implemented `.logoCell` rule uses
`gap: var(--space-2)` (8px) instead:
```css
.logoCell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
```
This is a cosmetic deviation from the design contract's specific token assignment (visually a
few pixels wider gap between the round logo and the group name), not a functional defect and not
an invented token (both `--space-1` and `--space-2` are existing design tokens).
**Fix:** Change `gap: var(--space-2)` to `gap: var(--space-1)` in
`frontend/src/app/fansubs/page.module.css` to match the UI-SPEC's locked spacing assignment
exactly, or update the UI-SPEC if the wider gap is an intentional, reviewed adjustment.

---

_Reviewed: 2026-07-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
