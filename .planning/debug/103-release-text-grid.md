---
status: root_cause_found
phase: 103
uat_test: 3
created: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 3 — Release text grid diagnosis

## Reported behavior

Release texts and exact contributors are semantically correct, but desktop shows a narrow text card in the left half and unused whitespace on the right. The desired layout is two role blocks per desktop row, with the cards inside each role block using that block's full width. Tablet and mobile should use one role block per row.

## Root cause

The two-column grid is applied to the wrong DOM level.

`ReleaseNotesList.tsx:22-25` renders this hierarchy:

```text
section.section
  section.roleGroup        (one per role)
    h3                     (role heading)
    div.list
      Card                 (one or more texts for that role)
```

However, `ReleaseNotesList.module.css:1` declares the two desktop columns on `.list`:

```css
.list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
```

Each `.roleGroup` itself remains a full-width, single-column grid because it receives only `display: grid; gap: 16px` and no column placement. Therefore:

1. role groups are stacked vertically across the full section width;
2. the cards *inside each individual role* are split into two columns;
3. when a role has one text—the live UAT case—the card occupies only the first 50% track and the second track is empty;
4. this produces the observed whitespace to the right of each narrow role card.

The existing mobile media query also targets `.list`, not the role-group collection:

```css
@media (max-width: 700px) { .list { grid-template-columns: 1fr; } }
```

That collapses cards within a role on small screens, but it cannot implement the intended desktop/tablet behavior of arranging whole role blocks responsively.

## Evidence

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx:22` maps roles directly as sibling `section.roleGroup` elements under `.section` and nests each role's cards in `.list`.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css:1` applies `repeat(2, minmax(0, 1fr))` only to `.list`.
- The same CSS line gives `.section` grid display but no `grid-template-columns`, so the sibling `.roleGroup` elements cannot form the requested two-column desktop grid.
- No surrounding rule in `page.module.css` constrains the notes section to half width; the whitespace originates inside the notes component's `.list` grid.
- The UAT report says contents, role grouping, and exact contributors are correct, isolating the failure to layout rather than DTO grouping or release-version ownership.

## Suggested fix direction

Move responsive column ownership from the per-role `.list` to a dedicated wrapper around the sibling role groups:

- add a role-grid wrapper around `roles.map(...)`;
- make that wrapper two columns only at the chosen desktop breakpoint;
- keep each `.roleGroup` and its `.list` one column so every text card fills the role block width;
- collapse the role-grid wrapper to one column for tablet and mobile;
- keep error and load-more rows outside the role grid, or explicitly span all columns.

This is a targeted hierarchy/CSS correction. No API, data ownership, grouping, contributor, or card-content change is indicated.

## Files involved

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css`

No production files were modified during diagnosis.
