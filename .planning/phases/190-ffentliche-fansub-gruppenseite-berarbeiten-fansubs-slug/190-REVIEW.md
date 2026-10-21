---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
reviewed: 2026-10-21T00:00:00Z
depth: deep
files_reviewed: 26
files_reviewed_list:
  - database/migrations/0186_role_catalog_editor_label_correction.down.sql
  - database/migrations/0186_role_catalog_editor_label_correction.up.sql
  - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx
  - frontend/src/app/fansubs/[slug]/page.module.css
  - frontend/src/app/fansubs/[slug]/page.test.tsx
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
  - frontend/src/components/fansubs/FansubHeroSection.tsx
  - frontend/src/components/fansubs/FansubHistorySection.tsx
  - frontend/src/components/fansubs/FansubHistoryTimeline.module.css
  - frontend/src/components/fansubs/FansubProjectsGrid.tsx
  - frontend/src/components/fansubs/FansubPublicSections.module.css
  - frontend/src/components/fansubs/FansubStorySection.module.css
  - frontend/src/components/fansubs/FansubTeamActiveGroup.tsx
  - frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx
  - frontend/src/components/fansubs/FansubTeamSection.module.css
  - frontend/src/components/fansubs/FansubTeamSection.tsx
  - frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx
  - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
  - frontend/src/components/fansubs/__tests__/FansubTeamActiveGroup.test.tsx
  - frontend/src/components/fansubs/__tests__/FansubTeamHistoricalGroup.test.tsx
  - frontend/src/components/fansubs/__tests__/FansubTeamSection.test.tsx
  - frontend/src/components/ui/HeroMetrics.module.css
  - frontend/src/lib/fansubMediaPresentation.test.ts
  - frontend/src/lib/fansubMediaPresentation.ts
  - frontend/src/lib/fansub-team-labels.test.ts
  - frontend/src/lib/fansub-team-labels.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 190: Code Review Report

**Reviewed:** 2026-10-21T00:00:00Z
**Depth:** deep
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Reviewed the complete phase-190 delta (9 plans + 3 live-UAT correction rounds) for the public
fansub group page rebuild. Confirmed via `git diff 7cb2ceb86^..HEAD` that `FocalCarousel.tsx` /
`FocalCarouselInternals.tsx` genuinely net to a zero diff (a reverted prop, no residue) as
claimed in the task brief.

No Critical/BLOCKER findings. The migration (0186) is structurally safe: single-row,
primary-key-scoped `UPDATE`, wrapped in `BEGIN/COMMIT`, with a symmetric down-migration — no
destructive `DELETE`. The three live-UAT-bolted corrections (single-project layout in
`FansubProjectsGrid.tsx`, per-category pagination in `FansubGroupMediaBlock.tsx` +
`fansubMediaPresentation.ts`, and the grid/heading CSS in `FansubPublicSections.module.css`) are
functionally correct and covered by targeted tests, but the back-and-forth left real debris:
a confirmed-dead CSS class (`.mediaOverflowTile`, the old global-overflow affordance that was
replaced by per-category "Mehr anzeigen") plus several longer-standing unused classes in the
same stylesheet. Two findings are React list-key / comparator correctness bugs that risk
incorrect rendering under specific data shapes (duplicate display names; two history entries
without a `year`) — neither is covered by the current test suite, which is why they shipped
without failing CI. One file already over the project's 450-line limit was touched (trivially)
without being split, a direct violation of the project's own stated process for touched files.

## Warnings

### WR-01: React list key uses `member_display_name` instead of the unique `id`, risking collisions and cross-row state leakage

**File:** `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx:71,78`
**File:** `frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx:112,133`
**Issue:** Both components key their member rows with `member.member_display_name`:
```tsx
{members.map((member) =>
  member.member_slug !== null ? (
    <Link key={member.member_display_name} ...>
```
`DomainProjectionMemberRow`/`DomainProjectionHistoricalRow` both carry a numeric `id` (and
`member_id`) that is guaranteed unique per row, while `member_display_name` is free-text and can
collide — e.g. two historical rows for the same display name (a member who left and later
rejoined under a separate membership record), or simply two different people sharing a handle.
When two rows share a key, React treats them as the "same" element across re-renders: it will
reuse DOM nodes and component state (including the `useClampedOverflow` expand/collapse state
and `contentRef` used for the slogan "Mehr/Weniger anzeigen" toggle) between unrelated members,
which can show the wrong slogan expanded/collapsed state, the wrong avatar momentarily, or trigger
a duplicate-key React warning in the console. This is unlikely to be caught by the current test
suite because every test fixture uses distinct display names.
**Fix:** Key by the unique row id instead:
```tsx
<Link key={member.id} ...>
```
(apply the same change to the other three key sites — `FansubTeamActiveGroup.tsx:78` and
`FansubTeamHistoricalGroup.tsx:112,133`).

### WR-02: `.mediaOverflowTile` and seven other CSS classes in `FansubPublicSections.module.css` are dead code left over from the three UAT-correction rounds

**File:** `frontend/src/components/fansubs/FansubPublicSections.module.css:192-205` (and
`cardGrid:30`, `historyList:58`, `historyYear:66`, `historyNote:72`, `projectLink:53`,
`sectionTitle:6`, `storyArticle:1`)
**Issue:** `.mediaOverflowTile` was introduced in the 190-09 second UAT round as the global
"+N weitere" overflow tile for the whole media section, then abandoned in the third round in
favor of the current per-category `.mediaShowAll` + plain `Button` pattern seen in
`FansubGroupMediaBlock.tsx`. Verified via `grep -rn "mediaOverflowTile"` against the whole
frontend tree: the class is defined but has zero remaining references anywhere in the codebase.
The other seven classes (`cardGrid`, `historyList`, `historyYear`, `historyNote`, `projectLink`,
`sectionTitle`, `storyArticle`) are also unreferenced by any of the five components that import
this stylesheet (`FansubStoryBlock`, `FansubDeepDiveSection`, `FansubHighlightsSection`,
`FansubContributorsSection`, `FansubGroupMediaBlock`) — confirmed by cross-checking every
`styles.` usage in those files against the module's class list.
**Fix:** Delete the eight unused rule blocks from `FansubPublicSections.module.css`. If any are
intended for near-term reuse, note that explicitly in a comment instead of leaving silent dead
weight — future maintainers will otherwise assume `.mediaOverflowTile` is still the live overflow
affordance and modify the wrong class when styling the actual one (`.mediaShowAll`).

### WR-03: `sortHistory`'s comparator is not a valid total order when two entries both lack a `year`

**File:** `frontend/src/components/fansubs/FansubHistorySection.tsx:45-52`
**Issue:**
```ts
function sortHistory(history: PublicFansubHistory[]): PublicFansubHistory[] {
  return [...history].sort((a, b) => {
    if (a.year === null || a.year === undefined) return 1
    if (b.year === null || b.year === undefined) return -1
    if (a.year !== b.year) return a.year - b.year
    return a.id - b.id
  })
}
```
The intent (confirmed by the final line) is: sort by year ascending, items without a year last,
tie-break by `id` ascending. That tie-break is unreachable whenever either side lacks a `year` —
including the case where *both* `a.year` and `b.year` are null/undefined, where the function
always returns `1` ("a sorts after b") regardless of which element is actually passed as `a`.
A comparator that returns a non-zero, non-antisymmetric result for two elements that should be
considered tied is not a valid ordering function; `Array.prototype.sort` does not guarantee any
particular (let alone id-ascending) order for such inputs — the actual outcome depends on the
engine's sort implementation and input order, not on `id`. In practice this means two or more
history entries without a year (e.g. unconfirmed/undated milestones) can render in an unstable,
non-deterministic order instead of the intended ascending-by-id order. This is pre-existing logic
(unchanged by phase 190's CSS-only touch to this file, confirmed via
`git diff 7cb2ceb86^..HEAD -- FansubHistorySection.tsx`) but is squarely inside this review's file
set and has no test coverage for the multi-null-year case.
**Fix:** Make the null/undefined-year branches mutually exclusive with the equal-year case:
```ts
function sortHistory(history: PublicFansubHistory[]): PublicFansubHistory[] {
  return [...history].sort((a, b) => {
    const aHasYear = a.year !== null && a.year !== undefined
    const bHasYear = b.year !== null && b.year !== undefined
    if (aHasYear && bHasYear && a.year !== b.year) return a.year! - b.year!
    if (aHasYear !== bHasYear) return aHasYear ? -1 : 1
    return a.id - b.id
  })
}
```

### WR-04: Team-section load failure is swallowed with zero logging, unlike the project's established pattern for best-effort page sections

**File:** `frontend/src/app/fansubs/[slug]/page.tsx:65-71`
**Issue:**
```ts
let domainProjection: DomainProjectionResponse = { members: [], historical: [], contributors: [] }
try {
  domainProjection = await getFansubGroupDomainProjection(group.id)
} catch {
  // Domain projection is best-effort; the page still renders Hero/Story/Projects/History/Media
  // without a Team section if this fails (unchanged fallback behavior, now explicit).
}
```
The comment documents the degrade-gracefully *intent*, which is reasonable, but the `catch`
block does nothing observable at all — not even a `console.error`. A real backend outage on the
domain-projection endpoint (auth service, DB, etc.) will silently and permanently hide the entire
Team section for every visitor with no trace in server logs or browser console, and no signal
reaches any monitoring. This is inconsistent with the sibling best-effort pattern already used
elsewhere in this app for the same kind of degrade-and-continue page load, e.g.
`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx:55`,
which logs structured context (`console.error('[release-detail] load failed', { ... })`) before
falling back.
**Fix:** Log before swallowing, mirroring the existing convention:
```ts
} catch (error) {
  console.error('[fansub-profile] domain projection load failed', {
    groupID: group.id,
    message: error instanceof Error ? error.message : String(error),
  })
}
```

### WR-05: `PublicFansubSurfacesShowcase.tsx` is already over the project's 450-line limit and was touched without being split

**File:** `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx` (458 lines)
**Issue:** CLAUDE.md's file-size convention states: "Muss ein Agent eine Produktionsdatei mit mehr
als 450 Zeilen inhaltlich ändern, teilt er sie im selben Auftrag auf." This file was at 458 lines
before phase 190 and is still 458 lines after — phase 190 touched it (adding the `status="active"`
prop required by `FansubTeamSection`'s new `status` parameter, confirmed via
`git diff 7cb2ceb86^..HEAD`) without splitting it. The change itself is a trivial one-line prop
fix, so the risk here is low, but it is a direct, confirmable violation of the project's own
documented process for touching an oversized production file, and the 80-file backlog note in
CLAUDE.md explicitly calls out that touching such a file requires splitting it "im selben
Auftrag" rather than deferring it again.
**Fix:** Either split this showcase file along its existing mock-data/presentation boundaries
(e.g. extract the `showcase*` fixture constants into a separate `PublicFansubSurfacesShowcase.fixtures.ts`
module) in the same commit that touches it, or — if the team deliberately wants to defer
dev-showcase files from this rule — say so explicitly in CLAUDE.md's exceptions list rather than
leaving it as a silent gap between stated policy and practice.

## Info

### IN-01: `FansubTeamSection` duplicates `countVisibleTeamMembers`'s filtering logic instead of reusing it

**File:** `frontend/src/components/fansubs/FansubTeamSection.tsx:16-26,29-37`
**Issue:** `countVisibleTeamMembers` and the `FansubTeamSection` component body both independently
run the same four `.filter()` passes over `members`/`historical` (active/memorial/historical-
non-memorial/memorial-historical). The component then also calls
`countVisibleTeamMembers(members, historical)` again just to check for the `=== 0` early return,
so the four filters effectively run twice per render. Not a correctness bug, but the duplication
means any future change to the active/memorial split logic has to be mirrored in two places by
hand — the exact kind of thing that caused drift in this phase's media/project back-and-forth.
**Fix:** Have `countVisibleTeamMembers` return the four partitioned arrays (or expose a shared
`partitionTeamMembers()` helper) and have both the count and the component consume it once.

### IN-02: `role_definitions.label_de` for `editor` is restored to an English word, not a German one

**File:** `database/migrations/0186_role_catalog_editor_label_correction.up.sql:3`
**Issue:** The migration "corrects" `label_de` from `'Edit'` to `'Editing'` — both English words in
a column named `label_de` (German label). This mirrors the value originally seeded in migration
`0065`/`0085`, so migration 0186 is internally consistent with prior history rather than a new
defect, and it is plausible "Editing" is being used as a short badge/chip label by product
decision rather than a full German phrase. Still, it sits oddly next to this project's explicit,
repeatedly-enforced German-text convention (CLAUDE.md "Sprachqualität") and next to sibling roles
in the same table that do carry real German labels (`Übersetzung`, `Encoding`→`Technische
Administration`, etc. in migration `0121`). Worth a product sign-off check rather than assuming
"Editing" is the deliberately intended final value.
**Fix:** Confirm with product/design whether `label_de` for `editor` should instead read a German
word (e.g. `'Bearbeitung'`), consistent with the neutral-role-label pass done for other roles in
migration `0121`.

### IN-03: Dev-showcase fixture overflow-count comment stays in sync only by convention

**File:** `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx:146-163`
**Issue:** `showcaseOverflowProjects` manually appends `18` generated archive projects to the 6
base `showcaseProjects` (24 total), relying on nothing enforcing that this number stays above
`FansubProjectsGrid`'s `PREVIEW_COUNT = 20` threshold so the showcase keeps exercising the
"+N weitere" overflow path. If `PREVIEW_COUNT` is ever raised without a matching update here, the
showcase silently stops demonstrating the overflow card with no test failure (this file has no
test coverage at all, consistent with it being a dev-only showcase).
**Fix:** Low priority given this is dev tooling, not production UI; if touched again, consider
deriving the overflow count from the imported `PREVIEW_COUNT`-equivalent constant (or asserting
`showcaseOverflowProjects.length > 20` with a comment) so a future threshold change fails loudly
in the showcase itself rather than silently.

---

_Reviewed: 2026-10-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
