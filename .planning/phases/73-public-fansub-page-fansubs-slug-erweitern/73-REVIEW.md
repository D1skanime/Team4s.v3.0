---
phase: 73-public-fansub-page-fansubs-slug-erweitern
reviewed: 2026-06-07T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - frontend/src/app/fansubs/[slug]/page.module.css
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/components/fansubs/FansubContributorsSection.tsx
  - frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
  - frontend/src/components/fansubs/FansubHeroSection.tsx
  - frontend/src/components/fansubs/FansubHighlightsSection.tsx
  - frontend/src/components/fansubs/FansubSectionNav.tsx
  - frontend/src/components/fansubs/FansubStorySection.tsx
  - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 73: Code Review Report

**Reviewed:** 2026-06-07
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the phase-73 gap-closure changes (plans 73-06..73-10) to the public fansub
page and its section components. The changes are mostly small, well-scoped, and the
German Umlaut and design-system constraints from CLAUDE.md are respected (Button/Card/
Badge/EmptyState/SectionHeader primitives are used; no native form elements; all
user-facing strings carry correct Umlauts). Badge and Card both spread `...props`
extending `HTMLAttributes`, so the inline `style` props passed to them are type-safe.

No security vulnerabilities or crash-level defects were found. The remaining issues are
correctness/robustness concerns (React key collisions, falsy-fallback logic) and
consistency/maintainability items (pervasive inline styles where the project convention
is colocated CSS modules, and a now-stale test surface).

## Warnings

### WR-01: React key collision risk in contributor list

**File:** `frontend/src/components/fansubs/FansubContributorsSection.tsx:40`
**Issue:** The list key is `key={contributor.member_display_name}`. Display names are not
unique — `DomainProjectionContributorRow` carries distinct `id` (and `member_id`) fields,
and two different external contributors can legitimately share the same display name. A
duplicate key causes React to drop/merge rows and can produce incorrect rendering and
reconciliation bugs. The same row type is also used to compute `isAlsoMember`, so a
collision silently hides a contributor.
**Fix:**
```tsx
<Card key={contributor.id} variant="flat">
```

### WR-02: Falsy-OR fallback hides legitimate zero / mismatched member counts

**File:** `frontend/src/components/fansubs/FansubHighlightsSection.tsx:27`
**Issue:** `value: group.members_count || contributions?.member_count || null` uses `||`,
so a real `members_count` of `0` falls through to `contributions?.member_count`. Combined
with the `.filter(... value !== 0)` at line 29, a group with exactly zero members can
still surface a non-zero `member_count` from a different source, producing an inconsistent
"Mitglieder" highlight that contradicts the Team section. The sibling line for
"Anime-Projekte" was correctly migrated to `?? null` in this phase; `members_count` was
left on the older `||` pattern, so the two count sources can disagree.
**Fix:** Pick a single authoritative source and use nullish coalescing, e.g.
```tsx
{ label: 'Mitglieder', value: contributions?.member_count ?? group.members_count ?? null },
```
(Confirm which source is authoritative per the phase decision before choosing the order.)

### WR-03: Project pagination loop silently truncates at 1000 projects

**File:** `frontend/src/app/fansubs/[slug]/page.tsx:37-49`
**Issue:** `loadFansubProjects` caps at `maxPages = 10` × `perPage = 100`. A group with
more than 1000 anime projects is silently truncated with no indication to the user or log.
The loop also pushes `response.data` before checking `total_pages`, so a malformed
response with `total_pages = 0` would still append page-1 data and then break — benign
here, but the cap is the real risk: the page would render an incomplete project list as if
complete.
**Fix:** Either document/justify the 1000 cap as intentional, or detect truncation and
surface it (e.g. an explicit "Weitere Projekte vorhanden" hint). At minimum guard the
loop so it does not append when `response.data` is empty:
```ts
if (response.data.length === 0) break
projects.push(...response.data)
if (page >= response.meta.total_pages) break
```

### WR-04: Collaboration short-circuit drops section nav and back-link affordance

**File:** `frontend/src/app/fansubs/[slug]/page.tsx:96-104`
**Issue:** The new collaboration branch returns only `FansubHeroSection` inside
`readingColumn`, with no `FansubSectionNav` (acceptable, since the sub-sections do not
exist) but also no back-link / navigation affordance that the error states provide
(`<Link href="/anime">Zur Anime-Liste</Link>`). A user landing on a collaboration page
has no in-page way back, unlike every other terminal state on this route. This is a UX
regression for a documented constraint ("Admin workflow changes should get explicit UX
attention").
**Fix:** Add the same back-link wrapper used by the error/empty branches, or render
`FansubSectionNav` is not appropriate here — instead include the breadcrumb/back link:
```tsx
<p className={styles.backLink}>
  <Link href="/anime">Zur Anime-Liste</Link>
</p>
```

## Info

### IN-01: Pervasive inline `style` objects conflict with project CSS-module convention

**File:** `frontend/src/components/fansubs/FansubHeroSection.tsx:104-122`,
`frontend/src/components/fansubs/FansubContributorsSection.tsx:36,43,45`,
`frontend/src/components/fansubs/FansubHighlightsSection.tsx:42,45,46`,
`frontend/src/components/fansubs/FansubGroupMediaBlock.tsx:12,16`
**Issue:** Layout and color are set via inline `style={{ ... }}` objects with hardcoded
magic numbers (`marginTop: 16`, `fontSize: 14`, `gap: 8`, `minmax(180px, 1fr)`), while the
project convention (CLAUDE.md "Route-specific styling often uses colocated CSS modules")
and the rest of this route (`page.module.css`, `GroupLeaderTimeline.module.css`,
`FansubSectionNav.module.css`) use CSS modules. The collaboration block also hardcodes a
fallback color `var(--surface-secondary, #f5f5f5)` that does not match the token palette
used elsewhere (`--surface-subtle`).
**Fix:** Move these into the colocated CSS modules and reference design tokens consistently,
matching the pattern already established for the hero/timeline/nav styles.

### IN-02: Stale test surface after FansubGroupMediaBlock image fallback removal

**File:** `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx:26-32`
**Issue:** Plan 73 removed the `logo_url`/`banner_url` image-fallback branch from
`FansubGroupMediaBlock` and narrowed its prop to `Pick<FansubGroup, 'id'>`. The test still
constructs a full group object with `logo_url`/`banner_url` (cast via `as FansubGroup`) and
no longer exercises the removed branch. The cast keeps it compiling, but the test now
carries dead fixture fields and no longer documents the component's actual contract.
**Fix:** Trim the fixture to `{ id: 10 }` (the only field the narrowed prop needs) and
drop the unused `logo_url`/`banner_url`/`name`/`slug` fields so the test reflects the
current contract.

### IN-03: Duplicated fact-summary computation between Hero and Story sections

**File:** `frontend/src/components/fansubs/FansubStorySection.tsx:10`,
`frontend/src/components/fansubs/FansubHeroSection.tsx:49`
**Issue:** Both components independently call `buildFansubFactSummary(group)` for the same
`group`, and the Story section now only renders an `EmptyState` whose description is that
summary. The "Geschichte" section therefore always shows the empty-state styling even when
a fact summary exists, which reads as "no content" while still displaying content — a mild
content/affordance mismatch worth confirming against the UI spec.
**Fix:** Confirm with the UI spec whether a populated fact summary should render as real
content (not an EmptyState). If the EmptyState is intentional, no code change; otherwise
render the summary as body copy when present.

---

_Reviewed: 2026-06-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
