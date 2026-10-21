# Phase 190: Öffentliche Fansub-Gruppenseite überarbeiten - Research

**Researched:** 2026-10-21
**Domain:** Next.js/React frontend UI refinement + one append-only SQL migration (role label fix)
**Confidence:** HIGH

## Summary

This is a well-scoped, already-analyzed UI phase. `190-CONTEXT.md` contains a complete
Ist-Analyse with exact Datei:Zeile references for all 21 locked decisions (D-a through D-u) and
is the authoritative source for *what* to change and *where*. This document does not repeat that
analysis. It adds the three things CONTEXT.md does not already fully resolve: (1) a Validation
Architecture mapping each D-decision to a concrete verification method, since this is
test-light UI work where most "verification" is visual/live rather than automated; (2) the exact
mechanical pattern for the `FocalCarousel` prop (D-r), derived from reading the current `quiet`
computation; and (3) the precedent migration (`0149_role_catalog_palette_correction.up.sql`) that
originally set `editor -> 'Edit'`, which the D-t migration corrects.

**Primary recommendation:** Treat this phase as CSS/markup refactor + two small pure-function
extractions (status label, media title fallback, media category grouping) + one prop addition to
a shared primitive + one one-line append-only migration. No new dependencies, no new test
framework. Follow the CLAUDE.md teststil rule: new/changed tests must exercise real logic
(extracted pure functions or httptest-style assertions), not render-snapshot or source-grep
"tests."

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hero/header layout (D-a, D-b, D-p) | Frontend (CSS Modules) | — | Pure presentational CSS change on an existing SSR'd page component; no data shape change |
| Status label de-duplication (D-o) | Frontend (pure TS function) | — | Two independent `statusLabel` implementations today (`FansubHeroSection.tsx:47-51` and `fansub-summary.ts:15-20`); consolidating is a logic change, not a data/API change |
| Member-section label by status (D-q) | Frontend (component props) | — | `group.status` already exists on the fetched `FansubGroup`/`FansubGroupSummary` object; this is prop-threading through existing React tree, no backend change |
| Team-card quote clamp (D-f) | Frontend (existing hook) | — | `useClampedOverflow` already implemented and proven in `FansubStoryBlock.tsx`; reuse, don't reinvent |
| FocalCarousel single-item layout (D-r) | Frontend (shared UI primitive) | — | `@/components/ui/FocalCarousel` is consumed by both fansub and profile features; change must be backward-compatible across all 4+ call sites |
| Media title/grouping (D-i, D-j, D-k) | Frontend (pure TS function + markup) | Backend (read-only, no change) | `category` and fallback fields already exist in the DB/API response (`fansub_group_media`, migration `0109`); grouping/title-fallback logic is purely client-side over already-shipped data |
| Role label correction (D-t) | Database (migration) | Frontend (no code change expected) | `role_definitions.label_de` is a catalog value read generically by `roleCatalog.ts`; fix belongs in data, not in a frontend string override |
| HeroMetrics mobile wrap (D-u) | Frontend (shared UI primitive CSS) | — | `HeroMetrics.tsx` is consumed site-wide (6 call sites); fix must be CSS-only inside the primitive, not per-page overrides |

## Project Constraints (from CLAUDE.md)

- Files ≤ 450 lines; any production file touched that exceeds this must be split in the same
  task (pure refactor commit first, behavioral commit second). **Watch list for this phase:**
  `frontend/src/app/fansubs/[slug]/page.module.css` (328 lines) and
  `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` (596 lines, **already over
  limit**) — if D-a/D-b touch the latter (e.g., to extract a shared hero CSS module), it must be
  split in the same task even though this phase did not create the overage.
- German UI text must use real umlauts (ä/ö/ü/ß) — relevant for D-c ("Releases" is already ASCII-safe),
  D-q new labels, D-t ("Editing" — ASCII-safe), D-g heading text.
- All user-facing UI must use `@/components/ui` primitives — CONTEXT.md confirms the page already
  complies; no new native `<select>/<input>/<button>` should be introduced by this phase.
- Teststil: behavioral assertions must execute real code (httptest/logic calls), never
  `os.ReadFile` + `strings.Contains` against the file being tested. For this phase, apply the
  analogous frontend rule: prefer calling the extracted pure function over rendering+snapshotting.
- GSD workflow enforcement: phase execution must go through `/gsd:execute-phase`, not ad-hoc edits.
- No worktrees (`workflow.use_worktrees: false`) — plan executes sequentially on `main`.

## Standard Stack

No new libraries needed. This phase works entirely within the existing stack already in use on
these files: Next.js 16 App Router, React 18.3.1, CSS Modules, Vitest 3 + `@testing-library/react`
(existing, but de-emphasized per teststil rule for *new* tests), PostgreSQL append-only migrations
via the existing `database/migrations/*.up.sql` / `*.down.sql` pair convention.

**Installation:** none required.

## Package Legitimacy Audit

Not applicable — this phase installs no new packages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clamp-with-expand for long quotes (D-f) | A second clamp/expand implementation for team-card quotes | `frontend/src/hooks/useClampedOverflow.ts`, already used by `FansubStoryBlock.tsx:19-20,34-44` | Proven pattern, same button labels ("Mehr anzeigen"/"Weniger anzeigen"), avoids divergence |
| Status-dependent label switching (D-q) | A new `if/else` cascade duplicated across both hero and team components | Thread `group.status` as a prop through `FansubTeamSection` -> `FansubTeamActiveGroup`, resolve label with a single small pure function (e.g. co-locate near `fansub-summary.ts` or a new tiny helper) | Context already flags this must pass through two component levels (`page.tsx:111` -> `FansubTeamSection.tsx:40`) — a single source-of-truth function avoids the same two-implementation drift that caused D-o/D-d in the first place |
| Single-item carousel suppression (D-h/D-r) | A parallel non-carousel grid component for the single-project case | New optional prop on `FocalCarousel` (see Code Examples below) | Avoids a second component to maintain; CONTEXT.md D-r already locks this approach — this research only adds the exact line-level mechanics |
| Media category labels (D-k) | A new label map for the 8 category values | `getFansubMediaCategoryLabel` in `frontend/src/lib/fansub-labels.ts:39-41` (already exists and covers all 8 CHECK-constraint values) | Mapping already complete; D-k is pure grouping logic over an existing label function |

**Key insight:** Every "don't hand-roll" item in this phase is a *reuse of an existing in-repo
primitive*, not a third-party library decision. The risk in this phase is not "wrong library" but
"duplicate implementation of logic that already exists once" — exactly the pattern that caused the
D-o/D-d status-duplication bug in the first place.

## Code Examples

### D-r: FocalCarousel single-item layout prop — exact mechanics

Current state (`frontend/src/components/ui/FocalCarousel.tsx:355`):
```typescript
if (items.length === 0) return null
const quiet = visibleItems.length === 1
```
`quiet` is then passed straight through to the internal collapsed-track renderer
(`frontend/src/components/ui/FocalCarousel.tsx:395`: `quiet={quiet}`), which is defined in
`FocalCarouselInternals.tsx` (`CollapsedCarouselProps<T>` at line 227 extends `FocalCarouselProps<T>`
with `quiet: boolean` at line 234, consumed at lines 267, 282-283, 297, 332, 342, 351 to suppress
navigation/counter/"show all" chrome and apply `.quietTrack` CSS).

Minimal backward-compatible change (matches D-r exactly):
1. Add to `FocalCarouselProps<T>` (`FocalCarouselInternals.tsx:29`):
   ```typescript
   /** Layout when exactly one item is visible. Default 'quiet' preserves existing behavior. */
   singleItemLayout?: 'quiet' | 'grid'
   ```
2. Destructure it in `FocalCarousel.tsx` alongside the other defaulted props
   (next to `deferInteractionUntilNearViewport = false`):
   ```typescript
   singleItemLayout = 'quiet',
   ```
3. Change the single line at `FocalCarousel.tsx:355`:
   ```typescript
   const quiet = visibleItems.length === 1 && singleItemLayout !== 'grid'
   ```
4. In `FansubProjectsGrid.tsx` (the only caller that should opt out), pass `singleItemLayout="grid"`.

No other call site (`MemberBadgeChain`, `RoleAchievementCard`, `ThumbnailStrip`,
`AchievementBadgeShowcase`) needs changes — the prop is optional and defaults preserve current
behavior exactly. This is a 3-line functional change plus one new call-site prop; CONTEXT.md
already names the approach (D-r) but did not cite the exact line/prop-threading point, which is
the detail the planner needs to size this task correctly (small — not a component rewrite).

### D-t: Migration precedent — where `editor: 'Edit'` currently comes from

The current faulty value was set by `database/migrations/0149_role_catalog_palette_correction.up.sql:11`:
```sql
('translator', 'Übersetzung', '#27664F'), ('editor', 'Edit', '#6D3F83'),
```
This confirms CONTEXT.md's framing (D-t) that "Edit" is an intentional-at-the-time catalog value,
not a typo introduced by this phase's code — and that the correction must be a **new** migration
(append-only; do not edit 0149), consistent with the project's existing correction pattern seen in
`0148_role_catalog_uat_corrections.up.sql` (which itself corrects an earlier migration's catalog
state via `UPDATE role_definitions ... WHERE code IN (...)`, with a companion `.down.sql` that
restores the prior value via a backup table or a literal `UPDATE ... SET label_de = 'Edit'`).

**Next available migration number: `0186`** (latest on disk is `0185_anime_project_timeline_fansub_lead`).
Suggested naming consistent with the existing `role_catalog_*_correction` convention:
`0186_role_catalog_editor_label_correction.up.sql` / `.down.sql`.

Minimal `.up.sql` pattern (mirrors 0149's single-row `UPDATE`, no backup table needed since this
is a single scalar field, trivially revertible by restating the old value in `.down.sql`):
```sql
BEGIN;
UPDATE role_definitions SET label_de = 'Editing' WHERE code = 'editor';
COMMIT;
```
```sql
-- down.sql
BEGIN;
UPDATE role_definitions SET label_de = 'Edit' WHERE code = 'editor';
COMMIT;
```
CONTEXT.md's own search already confirms frontend test fixtures and `memberBadgeLabels.ts:86`
already hardcode `'Editing'` — so this migration is the only change needed; no frontend code
should need to change for D-t (verify with a repo-wide grep for `label_de.*Edit[^i]` style string
literals before closing the task, per CONTEXT.md's own instruction to check "ob am Code-Wert
`editor` selbst ... noch etwas anderes hängt").

### D-o/D-q: Existing pure functions to extract/consolidate (test targets)

`frontend/src/lib/fansub-summary.ts:15-20` already has a pure, testable `statusLabel` function used
for the meta-line. `FansubHeroSection.tsx:47-51` has a second, separate local implementation used
for the badge. Both take the same `FansubStatus` union (`"active" | "inactive" | "dissolved"`,
`frontend/src/types/fansub.ts:10`) and should be consolidated into one exported function (e.g. keep
`fansub-summary.ts`'s version, import it from the hero component, delete the duplicate) — this one
function becomes both the D-o fix (single source for the badge, meta-line removed/altered per D-o)
and the natural unit-test target.

## Common Pitfalls

### Pitfall 1: Changing `.heroCard` CSS without checking the collaboration panel
**What goes wrong:** D-a's CSS alignment to the project-page pattern could accidentally remove or
break the `isCollaboration` panel that exists only on the group hero (`FansubHeroSection.tsx:167-184`)
and has no equivalent on the project page.
**Why it happens:** Copying CSS wholesale from the project page's `page.module.css` without
checking which group-page-only markup depends on the classes being replaced.
**How to avoid:** Diff the two `.heroCard`/`.heroShell`/`.heroFg`/`.heroBannerWrap` rule blocks
(CONTEXT.md cites exact line ranges in both files) and change only the background/border/shadow
properties that differ; leave structural classes intact.
**Warning signs:** Collaboration badge/panel disappears or shifts layout after the CSS change.

### Pitfall 2: Treating D-u as a Fansub-page-only fix
**What goes wrong:** Fixing `HeroMetrics.tsx` CSS and only visually checking the fansub group page
on mobile, missing a regression on one of the other 5 call sites.
**Why it happens:** The phase's primary driver is the fansub page; it's easy to scope the
verification to just that page.
**How to avoid:** CONTEXT.md already mandates checking all 6 call sites live at 375px — treat this
as a non-negotiable checklist item in the plan's verification step, not an optional nice-to-have.
**Warning signs:** `ProjectStats.tsx`, `MemberProfileHero.tsx`, `ProjectMemberHero.tsx`, or
`DashboardMetrics.tsx` showing the same orphaned-third-value wrap bug after the fix is declared
done.

### Pitfall 3: Forgetting the mandatory mid-phase live checkpoint
**What goes wrong:** Implementing D-a, D-b, and D-o/D-p sequentially without pausing, then
discovering the banner-size decision needed live user input only after the whole phase is "done."
**Why it happens:** Live-checkpoint steps are easy to skip when working through a long task list
mechanically.
**How to avoid:** The plan MUST encode an explicit pause/checkpoint task after D-a/D-o completion
and before any D-b/banner-height work, per CONTEXT.md's "Verbindliche Vorgaben" section.
**Warning signs:** Banner height changed without a documented live decision from the user.

### Pitfall 4: Migration 0186 touching more than `label_de`
**What goes wrong:** Accidentally also changing `color_key` or other catalog columns for `editor`
while fixing the label, introducing an unrelated visual change (badge color) not requested by D-t.
**Why it happens:** Copy-pasting the multi-column `UPDATE` pattern from `0149` instead of a
single-column, single-row `UPDATE`.
**How to avoid:** Keep the `0186` migration to exactly `label_de` — see the minimal pattern above.

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required and is this
> phase's primary RESEARCH.md contribution beyond CONTEXT.md.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (frontend), existing `database/migrations/*.sql` convention (no test framework — migrations are the tested artifact per CLAUDE.md's stated exception) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run <path-to-changed-test-file>` |
| Full suite command | `cd frontend && npm test` (= `vitest run`) |

### Phase Decisions -> Verification Map

| D-ID | Behavior | Verification Type | Automated Command / Check | File Exists? |
|------|----------|-------------------|---------------------------|-------------|
| D-a | Hero rendered without framed-card styling | Visual (live screenshot, desktop 1440px) | manual — compare against project page hero | n/a |
| D-b/D-p | Banner size, post-checkpoint value | Visual (live checkpoint with user) | manual, mandatory pause in plan | n/a |
| D-c | Metric label "Releases" not "Release-Versionen" | Logic/unit (string literal) | grep/assert in a `HeroMetrics` items-builder test, or visual | `FansubHeroSection.tsx` test — **new, currently none** |
| D-o | Status rendered exactly once (badge OR meta-line, not both) across all 3 statuses | Unit test on consolidated `statusLabel`/rendering-decision function + visual spot-check per status | `vitest run frontend/src/lib/fansub-summary.test.ts` (new) covering `active`/`inactive`/`dissolved` | `fansub-summary.ts` has no existing test — **new file needed** |
| D-q | Correct member-section label per status (`active`→"Aktive Mitglieder", `inactive`/`dissolved`→"Mitglieder") | Unit test on extracted label-resolver function | new test file, e.g. `frontend/src/components/fansubs/fansubMemberSectionLabel.test.ts` | **new** |
| D-f | Quotes clamp to 2-3 lines with expand/collapse | Logic test of `useClampedOverflow` consumption is already covered generically; new team-card usage should get a smoke-level render check only if truly needed (prefer: verify visually with a live long-quote fixture, e.g. `new-subs`) | manual visual + existing hook unit coverage (check `useClampedOverflow.test.ts` if it exists) | check existing hook test file before adding new one |
| D-g | "unbestätigt" badge removed from individual cards, present once in heading | Visual + simple render assertion that badge markup is absent per-card | existing `FansubTeamHistoricalGroup` test (render-style, pre-existing pattern) can be extended minimally | existing test file, extend |
| D-h/D-r | Single-project grid uses normal card size, not carousel "quiet" mode; other `FocalCarousel` consumers unaffected | Unit test on the prop default + explicit-override logic | new/extended test asserting `quiet` resolution logic (extract the one-line boolean into a tiny testable helper if feasible, or test via existing `FocalCarouselInternals`/`FansubProjectsGrid` test) | `FocalCarouselInternals` likely untested at this granularity — consider extracting `resolveQuiet(visibleCount, singleItemLayout)` as a pure function for direct unit test |
| D-i | Generic "image" fallback titles suppressed/replaced | Unit test on title-fallback priority function (`title → caption → ??? ` — define the new fallback explicitly, do not fall through to `media_type`) | new test, e.g. `fansubMediaTitleFallback.test.ts` | **new** — currently inline at `FansubGroupMediaBlock.tsx:98`, should be extracted |
| D-j | Exactly one "show more" affordance when `media.length > PREVIEW_LIMIT` | Unit/logic test or visual | extend existing `FansubGroupMediaBlock` render test (pre-existing pattern) to assert only one of the two elements renders | existing test file, extend |
| D-k | Media grouped by `category` with per-group subheadings | Unit test on grouping function | new test, e.g. `fansubMediaGrouping.test.ts` — pure function taking `media[]`, returning grouped-by-category structure, independently of rendering | **new** |
| D-l | Story block centered, text left-aligned within | Visual only (pure CSS change, no logic to unit test) | manual | n/a |
| D-t | `role_definitions.label_de` for `editor` = "Editing" in DB | SQL assertion / migration smoke check | `psql` query post-migration: `SELECT label_de FROM role_definitions WHERE code='editor';` expect `Editing`; also re-run existing frontend tests that already assert `'Editing'` as regression guard | existing fixtures already assert this — **run existing suite, do not write new** |
| D-u | `HeroMetrics` wraps cleanly at 375px on all 6 call sites | Visual (live mobile checkpoint, mandatory per CONTEXT.md) | manual, 6-site checklist | n/a — CSS-only, no logic to unit test |

### Sampling Rate

- **Per task commit:** run the quick command for just-changed test files
  (`npx vitest run <changed test path>`).
- **Per wave merge:** `cd frontend && npm test` (full suite) — must stay green; existing
  render-style tests for `FansubTeamHistoricalGroup`, `FansubGroupMediaBlock`,
  `FansubProjectsGrid`, `FansubTeamSection`, `FansubTeamActiveGroup`, `FansubHistorySection`,
  `FansubMediaSection`, `FansubStorySection`, `FansubStoryBlock`, `pageHelpers`, `page.tsx` must
  not regress since this phase touches their underlying components.
- **Phase gate:** full suite green + the mandatory live checkpoint (D-p, after D-a/D-o) + final
  live UAT on `new-subs`, `strawhat-subs`, `dragon-subs` (desktop 1440px + mobile 375px) before
  `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `frontend/src/lib/fansub-summary.test.ts` — covers D-o (consolidated status-label/dedup
      decision across `active`/`inactive`/`dissolved`)
- [ ] A new, small, pure label-resolver function + test for D-q (member-section heading by status) —
      file does not exist yet; natural home is alongside `fansub-summary.ts` or a new
      `frontend/src/lib/fansub-team-labels.ts`
- [ ] A pure title-fallback function + test for D-i — extract from
      `FansubGroupMediaBlock.tsx:98` inline expression into a named, testable function
- [ ] A pure category-grouping function + test for D-k — new, currently media render inline
      without grouping
- [ ] Confirm whether `useClampedOverflow.ts` already has a dedicated unit test; if not, this is a
      pre-existing gap (not newly introduced by D-f) but D-f is the first team-card consumer, so a
      minimal logic test here is good hygiene, not strictly required by D-f alone
- [ ] No test framework install needed — Vitest already configured and running
      (`frontend/vitest.config.ts`)

*(FocalCarousel's `quiet` boolean is currently a single inline expression, not an extracted
function — extracting it to a one-line named helper, e.g. `resolveSingleItemQuiet(visibleCount,
singleItemLayout)`, is optional but makes D-r directly unit-testable without rendering the full
carousel; recommended but not mandatory given the change is a single boolean expression.)*

## Security Domain

Not applicable — `security_enforcement` is not referenced in `.planning/config.json` for this
phase and this is a public, read-only, already-public-data page with no new input surfaces, no
new auth/session logic, and no new data mutation paths other than the admin-only append-only
migration (D-t), which does not accept user input. No ASVS categories apply beyond what is already
enforced site-wide for public GET routes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next available migration number is `0186` | Code Examples (D-t) | If another phase lands a migration first, the planner must re-check `ls database/migrations/` immediately before writing the migration file, not rely on this number verbatim |
| A2 | A single-column `UPDATE ... WHERE code = 'editor'` is sufficient for D-t with no `color_key`/`contexts` side effects | Code Examples (D-t) | Low — D-t explicitly scopes to the label only; verified by reading `role_definitions` schema usage in `0149`, but not formally schema-checked for other constraints in this research pass |
| A3 | No `useClampedOverflow.ts` dedicated unit test exists today | Wave 0 Gaps | If one does exist, the "optional" test task for D-f becomes unnecessary — low risk, just wasted effort if assumption is wrong |

**If this table is empty:** N/A — see entries above; all are low-risk/easily-rechecked-at-plan-time
assumptions, none touch security, compliance, or irreversible decisions.

## Open Questions (RESOLVED)

None outstanding — CONTEXT.md confirms all 7 original open questions (OF-01 through OF-07) are
answered (D-o through D-u). This research found no new open questions requiring user input beyond
the already-mandated D-p live checkpoint and D-u 6-site mobile checklist.

## Sources

### Primary (HIGH confidence — direct repo inspection)
- `database/migrations/0149_role_catalog_palette_correction.up.sql` — confirms origin of `editor: 'Edit'`
- `database/migrations/0148_role_catalog_uat_corrections.up.sql` / `.down.sql` — correction-migration precedent pattern
- `frontend/src/components/ui/FocalCarousel.tsx` (lines ~30-60, ~330-400) and
  `FocalCarouselInternals.tsx` (lines 1-40, 206-360) — exact `quiet` computation and prop threading
- `frontend/src/lib/fansub-summary.ts` — existing pure `statusLabel` implementation
- `frontend/src/lib/roleCatalog.test.ts` — existing logic-test style to follow (per CLAUDE.md teststil rule)
- `frontend/vitest.config.ts`, `frontend/package.json` — test framework/commands
- `.planning/config.json` — confirms `nyquist_validation: true`, `use_worktrees: false`

### Secondary
- `.planning/phases/190-.../190-CONTEXT.md` — authoritative Ist-Analyse and all 21 locked decisions (D-a through D-u); this research builds on it, not against it.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new technology, all findings from direct file reads of the existing codebase
- Architecture: HIGH — CONTEXT.md already did exhaustive file-level analysis; this document only adds mechanics it omitted
- Pitfalls: HIGH — derived directly from reading the actual code paths (hero CSS diff, FocalCarousel prop chain, migration precedent)
- Validation Architecture: MEDIUM — test framework/commands are HIGH confidence (verified directly); the specific new test files proposed are a reasonable decomposition but the planner should confirm final function names/locations during planning

**Research date:** 2026-10-21
**Valid until:** 14 days (UI-only phase on a fast-moving frontend; re-verify migration number if phase start is delayed)
