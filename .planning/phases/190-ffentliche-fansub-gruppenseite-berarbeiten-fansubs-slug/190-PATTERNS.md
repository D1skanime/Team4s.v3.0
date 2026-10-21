# Phase 190: Öffentliche Fansub-Gruppenseite überarbeiten — Pattern Map

**Mapped:** 2026-10-21
**Files analyzed:** 19 (16 modified, 2 new migration files, 2-4 new test/helper files)
**Analogs found:** 19 / 19 — this phase is unusually well pre-analyzed: CONTEXT.md and
RESEARCH.md already pinpoint exact Datei:Zeile locations for nearly every change. This document
adds the literal code excerpts the planner can paste/diff against.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/app/fansubs/[slug]/page.module.css` (`.heroCard` etc., D-a/D-b/D-p/D-l) | config (CSS module) | transform | `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` (`.heroCard` block) | exact |
| `frontend/src/components/fansubs/FansubHeroSection.tsx` (D-a status dedup wiring, D-c label, D-o) | component | request-response (SSR render) | `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` | role-match (structure), self (status logic to delete) |
| `frontend/src/lib/fansub-summary.ts` (D-o: becomes sole `statusLabel` source) | utility (pure fn) | transform | itself (`buildFansubFactSummary`) + `frontend/src/lib/fansub-labels.ts` (`getFansubStatusLabel`) | exact |
| `frontend/src/lib/fansub-summary.test.ts` (new) | test | transform | `frontend/src/lib/roleCatalog.test.ts` | role-match (logic-only test style) |
| `frontend/src/lib/fansub-team-labels.ts` (new, D-q member-section label by status) | utility (pure fn) | transform | `frontend/src/lib/fansub-labels.ts` (`getFansubStatusLabel`, `getFansubMediaCategoryLabel`) | exact |
| `frontend/src/lib/fansub-team-labels.test.ts` (new) | test | transform | `frontend/src/lib/roleCatalog.test.ts` | role-match |
| `frontend/src/app/fansubs/[slug]/page.tsx` (D-q: thread `group.status` down) | route/page | request-response | itself — same file already threads `heroStats`/`profile` down to sections | exact |
| `frontend/src/components/fansubs/FansubTeamSection.tsx` (D-q: pass `status` prop through) | component | prop-threading | itself + `HeroSection.tsx` → `ProjectStats` prop-threading pattern | role-match |
| `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx` (D-q label, D-f quote clamp) | component | request-response | `frontend/src/components/fansubs/FansubStoryBlock.tsx` (clamp/expand pattern) | exact (for D-f) |
| `frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx` (D-g badge removal, D-f quote clamp) | component | request-response | `FansubStoryBlock.tsx` (clamp) + itself (badge/heading logic) | exact (for D-f) / self (D-g) |
| `frontend/src/components/fansubs/FansubTeamSection.module.css` (D-f clamp CSS) | config (CSS module) | transform | `frontend/src/components/fansubs/FansubStoryBlock.module.css` (`.storyContentClamped`/`.storyContentExpanded`) | exact |
| `frontend/src/components/ui/FocalCarousel.tsx` (D-r: `singleItemLayout` prop) | component (shared UI primitive) | request-response | itself — `quiet` computation at line 355 | exact |
| `frontend/src/components/ui/FocalCarouselInternals.tsx` (D-r: prop type) | component (shared UI primitive) | request-response | itself — `FocalCarouselProps<T>` / `CollapsedCarouselProps<T>` | exact |
| `frontend/src/components/fansubs/FansubProjectsGrid.tsx` (D-h/D-r: opt into `'grid'`) | component | request-response | itself — only call site that needs the new prop | exact |
| `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` (D-i title fallback, D-j single CTA, D-k grouping) | component | request-response + transform | `frontend/src/components/fansubs/FansubProjectsSection.tsx` (`groupProjects`/bucket pattern — same "group by enum, render per-group heading" shape) | role-match |
| `frontend/src/lib/fansubMediaPresentation.ts` (new, D-i/D-k pure functions) | utility (pure fn) | transform | `frontend/src/lib/fansub-labels.ts` (`getFansubMediaCategoryLabel`) + `FansubProjectsSection.tsx` (`groupProjects`) | exact |
| `frontend/src/lib/fansubMediaPresentation.test.ts` (new) | test | transform | `frontend/src/lib/roleCatalog.test.ts` | role-match |
| `frontend/src/components/fansubs/FansubStorySection.module.css` (D-l `.storyStack` centering) | config (CSS module) | transform | itself — `.storyStack` rule, pure CSS | exact |
| `frontend/src/components/ui/HeroMetrics.module.css` (D-u mobile wrap) | config (CSS module, shared primitive) | transform | itself — existing `@media (max-width: 767px)` block | exact |
| `database/migrations/0186_role_catalog_editor_label_correction.{up,down}.sql` (D-t) | migration | batch (one-time data correction) | `database/migrations/0149_role_catalog_palette_correction.up.sql` (single `UPDATE ... SET label_de`) | exact |

## Pattern Assignments

### 1. `frontend/src/app/fansubs/[slug]/page.module.css` — D-a (frame-card removal), D-b/D-p (banner size), D-l (story centering)

**Analog:** `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`

This is the single most important reuse target in the phase (explicitly flagged in CONTEXT.md
Ist-Zustand 2). Both files already share identical class names (`.heroShell`/`.heroFg`/`.heroCard`/
`.heroBannerWrap`/`.heroBannerImg`) with the same structural shape — only the `.heroCard` content
differs.

**Current group-page CSS to REMOVE** (`frontend/src/app/fansubs/[slug]/page.module.css:73-83`):
```css
/* Banner + Inhalt als EIN durchscheinender Glas-Block (Variante B) */
.heroCard {
  margin-top: 18px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(18px) saturate(1.5);
  backdrop-filter: blur(18px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 12px 38px rgba(20, 15, 30, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

**Target pattern to copy verbatim** (project page, `frontend/src/app/anime/[id]/group/[groupId]/page.module.css:83-89`):
```css
/* Nur Layout-Hülle: Banner und Projektidentität stehen ohne sichtbare Karte im Hero. */
.heroCard {
  position: relative;
  display: grid;
  margin-top: 18px;
  overflow: hidden;
}
```
Copy this exact rule (including the German comment) into the group page's `.heroCard`. Keep
`margin-top: 18px` and `overflow: hidden` (both already present); drop every background/
backdrop-filter/border/box-shadow declaration. The group page's `.heroBody`/`.heroHeader`/
`.heroIdentity` rules below `.heroCard` are untouched by this — they don't reference the
background.

**`.heroBannerImg` (D-b/D-p) — already identical on both pages**, confirmed byte-for-byte equal:
```css
/* group page page.module.css:91-98 and project page page.module.css:97-105 */
.heroBannerImg {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: clamp(140px, 17vw, 200px);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
}
```
**Do not touch this rule until the mandatory live checkpoint (D-p) happens.** The plan must pause
after D-a/D-o land, show the result live, and only then adjust the `clamp(...)` values per the
user's in-session decision — no number to pre-apply here.

**`.storyStack` (D-l) — exact fix location**, `frontend/src/components/fansubs/FansubStorySection.module.css:1-8`:
```css
.storyStack {
  display: grid;
  gap: 24px;
  /* Fliesstext linksbuendig auf lesbarer Measure (~66 Zeichen), Section selbst volle Breite */
  max-width: 68ch;
  font-size: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);
  line-height: 1.65;
}
```
Fix is additive: add `margin: 0 auto;` (centers the block within the full-width `.gridSection`
parent) and optionally widen `max-width` toward 70–80ch per D-l's target range. Do **not** add
`text-align: center` — D-l explicitly wants the text left-aligned *inside* the centered block.
`SectionHeader` stays a sibling outside `.storyStack` (already the case — no structural change
needed, confirmed at `FansubStorySection.tsx:101`).

---

### 2. `frontend/src/lib/fansub-summary.ts` / `FansubHeroSection.tsx` — D-o (status de-dup)

**Analog:** itself is the keep-side; `FansubHeroSection.tsx` has the duplicate to delete.

**Keep this (single source of truth)** — `frontend/src/lib/fansub-summary.ts:15-20`:
```typescript
function statusLabel(status: FansubStoryFacts['status']): string | null {
  if (status === 'active') return 'aktiv'
  if (status === 'inactive') return 'inaktiv'
  if (status === 'dissolved') return 'aufgelöst'
  return null
}
```
This function is currently module-private (not exported) inside `fansub-summary.ts`. Export it
(or export a new wrapper) so `FansubHeroSection.tsx` can import it instead of having its own copy.

**Delete this duplicate** — `frontend/src/components/fansubs/FansubHeroSection.tsx:47-51`:
```typescript
function statusLabel(status: FansubGroup['status']): string {
  if (status === 'active') return 'aktiv'
  if (status === 'inactive') return 'inaktiv'
  return 'aufgelöst'
}
```
And the call site that renders the badge + the meta-line text at the same time —
`FansubHeroSection.tsx:144-150`:
```tsx
<div className={styles.heroTitleRow}>
  <h1 className={styles.title}>{group.name}</h1>
  <Badge variant={statusVariant(group.status)}>{statusLabel(group.status)}</Badge>
</div>
<p className={styles.subtitle}>{factSummary || 'Keine Kurzbeschreibung vorhanden.'}</p>
```
`factSummary` comes from `buildFansubFactSummary(group)` (`FansubHeroSection.tsx:94`), which
internally calls the *other* `statusLabel` in `fansub-summary.ts:35-37` and appends it to the
meta line. For D-o: keep the Badge (visual status indicator) and strip the status segment out of
`buildFansubFactSummary`'s joined parts (or keep the meta line and drop the Badge — CONTEXT.md
does not mandate which one survives, only that status appears exactly once). Recommended: keep
the Badge (already styled, already uses `statusVariant`), remove `statusLabel(group.status)` from
the `parts` array in `buildFansubFactSummary` (`frontend/src/lib/fansub-summary.ts:36`).

**Test pattern to follow** (pure-function logic test, not render) — `frontend/src/lib/roleCatalog.test.ts:1-22`:
```typescript
import { describe, expect, it } from 'vitest'
// ...
describe('roleCatalog', () => {
  it('accepts catalog-injected roles without code branches', () => {
    // call the pure function directly, assert on its return value
  })
})
```
Apply this shape to a new `frontend/src/lib/fansub-summary.test.ts` that calls
`buildFansubFactSummary`/the exported `statusLabel` directly for all three `FansubStatus` values
and asserts the status segment appears exactly once in the overall page composition (or is absent
from the meta string if the Badge is the chosen single source).

---

### 3. D-q — member-section label by status (`frontend/src/lib/fansub-team-labels.ts`, new)

**Analog:** `frontend/src/lib/fansub-labels.ts:56-64` (`getFansubStatusLabel`) — same shape: a
`Record<FansubStatus, string>` plus a one-line accessor function.

```typescript
// frontend/src/lib/fansub-labels.ts:56-64 (pattern to replicate for a new, narrower mapping)
export const FANSUB_STATUS_LABELS: Record<FansubStatus, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  dissolved: 'Aufgelöst',
}

export function getFansubStatusLabel(status: FansubStatus): string {
  return FANSUB_STATUS_LABELS[status] ?? status
}
```
New function should follow the exact same shape, resolving to the D-q rule: `'active'` →
`"Aktive Mitglieder"`, `'inactive'`/`'dissolved'` → `"Mitglieder"` (both non-active statuses
collapse to the same string per D-q — do not special-case `dissolved` further).

**Prop-threading path to follow** (already identified in CONTEXT.md Ist-Zustand 4): `group.status`
is in scope at `frontend/src/app/fansubs/[slug]/page.tsx:111`
(`<FansubTeamSection members=... historical=... />`), needs a new `status={group.status}` prop,
through `frontend/src/components/fansubs/FansubTeamSection.tsx:26,40`
(`<FansubTeamActiveGroup members={activeMembers} />` → add `status={status}`), into
`frontend/src/components/fansubs/FansubTeamActiveGroup.tsx:34,41` where the hardcoded heading
`"Aktive Mitglieder · {members.length}"` (line 41) becomes a call to the new label function.

Use the existing `FansubHeroSection.tsx` → `ProjectStats` prop pattern as the structural precedent
for passing a single extra scalar prop one level down without inventing a context/store:
```tsx
// frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx:152-158
<ProjectStats
  contributorCount={group.stats.project_contributor_count}
  releaseCount={releaseVersionCount}
  coopGroups={coopGroups}
  animeID={animeID}
  animeSlug={anime.slug}
/>
```

---

### 4. D-f — team-card quote clamp/expand (reuse `useClampedOverflow`)

**Analog (exact, reuse the hook — do not reimplement):**
`frontend/src/hooks/useClampedOverflow.ts` (full file, 38 lines) is already a generic,
content-agnostic hook:
```typescript
// frontend/src/hooks/useClampedOverflow.ts:6-16
export function useClampedOverflow(content: string) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const measureOverflow = useCallback(() => {
    const element = contentRef.current
    if (!element) return
    const nextIsOverflowing = element.scrollHeight > element.clientHeight
    setIsOverflowing((current) => (isExpanded ? current || nextIsOverflowing : nextIsOverflowing))
  }, [isExpanded])
  // ...
}
```

**Consumer pattern to copy** — `frontend/src/components/fansubs/FansubStoryBlock.tsx:15-46` (full
file). The relevant shape:
```tsx
const { contentRef, isExpanded, setIsExpanded, isOverflowing } =
  useClampedOverflow(`${bodyHtml}\n${bodyText}`)
// ...
const contentClassName = isExpanded ? styles.storyContentExpanded : styles.storyContentClamped
// ...
<div ref={contentRef} className={contentClassName}>{/* content */}</div>
{isOverflowing ? (
  <Button type="button" variant="subtle" size="sm" className={styles.toggle}
          onClick={() => setIsExpanded((current) => !current)}>
    {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
  </Button>
) : null}
```
Apply this identically inside `MemberRowInner` (`FansubTeamActiveGroup.tsx:13-32`) and
`HistoricalRow` (`FansubTeamHistoricalGroup.tsx:37-64`) around the
`member.member_slogan` render (`FansubTeamActiveGroup.tsx:27`,
`FansubTeamHistoricalGroup.tsx:51`) — use `useClampedOverflow(member.member_slogan ?? '')` per
card. Keep the exact button labels `'Mehr anzeigen'`/`'Weniger anzeigen'` (German text already
correct with umlauts — no new string needed).

**CSS analog** — `frontend/src/components/fansubs/FansubStoryBlock.module.css` (full file, 21
lines):
```css
.storyContentClamped {
  max-height: 8.5rem;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, var(--text-primary) 72%, transparent);
  mask-image: linear-gradient(180deg, var(--text-primary) 72%, transparent);
}

.storyContentExpanded {
  max-height: none;
}
```
Add equivalent `.quoteClamped`/`.quoteExpanded` rules to
`frontend/src/components/fansubs/FansubTeamSection.module.css` (currently 193 lines, plenty of
headroom under 450), sized for 2–3 lines per D-f (e.g. `max-height: 3.6rem` or similar — tune
against actual line-height instead of copying `8.5rem` literally). The existing `.memberSlogan`
rule is at `FansubTeamSection.module.css:146-149`:
```css
.memberSlogan {
  margin: 5px 0 0;
  color: var(--text-primary);
  opacity: 0.82;
```
The clamp wrapper goes around this element's content, not as a replacement for it.

---

### 5. D-g — remove per-card "unbestätigt" badge, move hint to heading

**Self-contained change, no external analog needed** —
`frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx:48`:
```tsx
{unconfirmed ? <Badge variant="muted">unbestätigt</Badge> : null}
```
Remove this line (and the now-unused `unconfirmed` prop plumbing in `HistoricalRow` if nothing
else consumes it). Update the heading at `FansubTeamHistoricalGroup.tsx:112`:
```tsx
<h3 className={styles.subgroupTitle}>Historische Nennungen · {unconfirmed.length}</h3>
```
→ append the hint once, e.g. `Historische Nennungen (unbestätigt) · {unconfirmed.length}`
(exact wording is the planner's/executor's call per CONTEXT.md D-g; umlaut discipline applies).

---

### 6. D-h/D-r — `FocalCarousel` `singleItemLayout` prop (exact mechanics, already derived in RESEARCH.md)

**Analog:** itself — this is a backward-compatible prop addition, not a new pattern. Confirmed by
direct read:

Current `quiet` computation — `frontend/src/components/ui/FocalCarousel.tsx:355`:
```typescript
if (items.length === 0) return null
const quiet = visibleItems.length === 1
```
Threaded into `CollapsedCarousel` at `FocalCarousel.tsx:395` via the `quiet={quiet}` prop, consumed
in `FocalCarouselInternals.tsx` at `CollapsedCarouselProps<T>` (`quiet: boolean` at line 234) and
used at lines 267 (destructure), 282 (`quiet && styles.controlsQuiet`), 283 (conditionally hide
previous `NavArrow`), 297 (`quiet && styles.quietTrack`), 332 (conditionally hide next `NavArrow`),
342/351 (hide counter/show-all button when `quiet`).

**Minimal diff (exactly as RESEARCH.md specifies, now confirmed against the live file):**
1. `FocalCarouselInternals.tsx` — add to `FocalCarouselProps<T>` (after line 52,
   `deferInteractionUntilNearViewport?: boolean`):
   ```typescript
   /** Layout when exactly one item is visible. Default 'quiet' preserves existing behavior. */
   singleItemLayout?: 'quiet' | 'grid'
   ```
2. `FocalCarousel.tsx:34-39` — destructure default alongside the existing defaults:
   ```typescript
   const {
     items,
     carouselItems,
     showLessLabel = 'Weniger anzeigen',
     deferInteractionUntilNearViewport = false,
     singleItemLayout = 'quiet',
   } = props
   ```
3. `FocalCarousel.tsx:355` — change the boolean:
   ```typescript
   const quiet = visibleItems.length === 1 && singleItemLayout !== 'grid'
   ```
4. `frontend/src/components/fansubs/FansubProjectsGrid.tsx:44` — the only caller that opts out,
   add `singleItemLayout="grid"` to the existing `<FocalCarousel ...>` call (currently spans
   lines 44-73, no `singleItemLayout` prop present today).

No other `FocalCarousel` consumer (`MemberBadgeChain`, `RoleAchievementCard`, `ThumbnailStrip`,
`AchievementBadgeShowcase`) needs any change — optional prop, default preserves current behavior.

---

### 7. D-i/D-j/D-k — Media title fallback, single CTA, category grouping

**Current inline fallback to extract** — `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx:98`:
```typescript
const title = item.title?.trim() || item.caption?.trim() || item.media_type
```
D-i requires this NOT to fall through to `item.media_type` (which is almost always the generic
string `"image"` per CONTEXT.md's live DB sample). Extract to a named pure function in the new
`frontend/src/lib/fansubMediaPresentation.ts`, e.g. `resolveFansubMediaTitle(item)`, returning
`title → caption → null` (no `media_type` fallback), and render `null` as "no title line" in the
markup instead of a generic string.

**Category label analog (already exists, reuse directly — no new taxonomy)** —
`frontend/src/lib/fansub-labels.ts:39-41`:
```typescript
export function getFansubMediaCategoryLabel(category: string): string {
  return FANSUB_MEDIA_CATEGORY_LABELS[category as FansubGroupMediaCategory] ?? FANSUB_MEDIA_CATEGORY_FALLBACK
}
```
Already imported and used in `FansubGroupMediaBlock.tsx:9,135`. D-k only needs a new *grouping*
function (not a new label map) — group `media` items by `item.category`, iterate categories in a
stable order, render one `SectionHeader`/subheading per group using
`getFansubMediaCategoryLabel(category)` as the heading text.

**Grouping pattern analog** — `frontend/src/components/fansubs/FansubProjectsSection.tsx:35-51`
(`groupProjects`), same shape (bucket by enum value, preserve a fixed display order, sort within
bucket):
```typescript
function groupProjects(projects: PublicFansubProject[]): Record<ProjectBucketKey, PublicFansubProject[]> {
  const buckets: Record<ProjectBucketKey, PublicFansubProject[]> = {
    ongoing: [], completed: [], archived: [],
  }
  for (const item of projects) {
    buckets[resolveProjectBucket(item.status)].push(item)
  }
  for (const bucket of projectBucketOrder) {
    buckets[bucket].sort((left, right) => left.title.localeCompare(right.title, 'de'))
  }
  return buckets
}
```
Mirror this for media categories in `fansubMediaPresentation.ts` (e.g.
`groupFansubMediaByCategory(media)`), with the 8 CHECK-constraint category values as the fixed
iteration order (`gallery`, `history_screenshot`, `old_website`, `forum`, `irc_chat`,
`event_meeting`, `artwork_fanart`, `other` — matching `FANSUB_MEDIA_CATEGORY_LABELS` declaration
order in `fansub-labels.ts:5-13`), and only render a subheading for categories that have at least
one item (empty categories produce no section, consistent with D-s "no empty states").

**D-j (single show-more element)** — current duplicate affordances,
`frontend/src/components/fansubs/FansubGroupMediaBlock.tsx:148-152` (overflow tile) and
`:154-159` (show-all button), both gated on the same `hasOverflow` boolean (line 78). Keep exactly
one — the `"+N weitere"` overflow tile already calls `revealMore()` which batches by
`MEDIA_BATCH = 10` (line 22, 83-85); the show-all `Button` calls `revealAll()` (line 87-89, sets
`visibleCount` to `media.length`). Recommended: keep the overflow tile (`revealMore`) only if
category grouping (D-k) replaces the flat "show more" semantics with "show more within this
category group"; otherwise keep the single `"Alle N anzeigen"` button. CONTEXT.md D-j does not
mandate which one survives — only that exactly one remains.

---

### 8. D-t — role label migration (append-only, mirrors existing correction precedent)

**Analog:** `database/migrations/0149_role_catalog_palette_correction.up.sql` (sets the faulty
value) and `database/migrations/0148_role_catalog_uat_corrections.up.sql` (correction-migration
precedent with backup table, used here only as a style reference since this is a single scalar
field and does not need a backup table).

Confirmed next available number: **`0186`** (`ls database/migrations/` shows `0185_...` as the
latest pair).

**`0186_role_catalog_editor_label_correction.up.sql`:**
```sql
BEGIN;
UPDATE role_definitions SET label_de = 'Editing' WHERE code = 'editor';
COMMIT;
```

**`0186_role_catalog_editor_label_correction.down.sql`:**
```sql
BEGIN;
UPDATE role_definitions SET label_de = 'Edit' WHERE code = 'editor';
COMMIT;
```
Scope strictly to `label_de` — do not touch `color_key`/`contexts` (unlike `0149`'s multi-column
`UPDATE`, which this migration must NOT imitate structurally, only in spirit of "single
`UPDATE ... SET`"). Per D-t, verify before writing the migration that no frontend code branches on
the string value `'Edit'` itself (only on the `editor` *code*) — a repo-wide grep for the literal
confirms the existing test fixtures (`FansubAppMembersSection.test.tsx:9`, `page.test.tsx:32`,
`ReleaseContributionDrawer.test.tsx:28`, `achievementBadgeGalleryFixtures.ts:30`) and
`memberBadgeLabels.ts:86` already hardcode `'Editing'`, so no frontend file should need a
corresponding change.

## Shared Patterns

### Status label single-source pattern (applies to D-o and, by extension, D-q)
**Source:** `frontend/src/lib/fansub-summary.ts:15-20` (keep), delete
`FansubHeroSection.tsx:47-51` (duplicate).
**Apply to:** `FansubHeroSection.tsx`, and as the structural precedent for the new
`fansub-team-labels.ts` (D-q) — one exported pure function per status-dependent string, never two
parallel `if/else` cascades for the same `FansubStatus` union.

### Clamp-with-expand (D-f)
**Source:** `frontend/src/hooks/useClampedOverflow.ts` (hook) +
`frontend/src/components/fansubs/FansubStoryBlock.tsx` (consumer) +
`frontend/src/components/fansubs/FansubStoryBlock.module.css` (CSS).
**Apply to:** `FansubTeamActiveGroup.tsx`, `FansubTeamHistoricalGroup.tsx` (both quote renders),
new clamp CSS added to `FansubTeamSection.module.css`.

### Enum-bucket grouping with per-bucket heading (D-k)
**Source:** `frontend/src/components/fansubs/FansubProjectsSection.tsx:12-51`
(`ProjectBucketKey`, `groupProjects`).
**Apply to:** new `groupFansubMediaByCategory` in `fansubMediaPresentation.ts`, consumed by
`FansubGroupMediaBlock.tsx`.

### Design tokens / existing CSS variables (no new variable names)
Confirmed in use across both hero CSS files — planner must reuse these, not invent new ones:
`var(--accent-deep)`, `var(--accent-primary)`, `var(--surface-canvas)`, `var(--surface-card)`,
`var(--surface-sunken)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`,
`var(--ui-line)`, `var(--public-page-max-width)`, `var(--public-page-gutter)`,
`var(--radius-md)`, `var(--space-1)`/`var(--space-3)` (seen in `HeroMetrics.module.css:30,36`).

### Shared UI primitive CSS-only fix (D-u)
**Source:** `frontend/src/components/ui/HeroMetrics.module.css:65-77` — existing
`@media (max-width: 767px)` block already exists and already adjusts `gap`/font-sizes; the
orphaned-third-value wrap bug must be fixed inside this same media query block (e.g. via
`flex-basis`/`min-width` tuning on `.heroMetricItem` so 3 items wrap 2+1 evenly or stay on one row
longer), not via a new page-local override. **Six call sites to verify live at 375px after the
fix** (per D-u, non-negotiable): `ProjectStats.tsx` (project page), `FansubHeroSection.tsx` (this
phase), `MemberProfileHero.tsx`, `ProjectMemberHero.tsx` (`projectMember/`),
`DashboardMetrics.tsx` (`me/dashboard/components/`), and the `/dev/ui-system` showcase page
(abnahme-only, not production).

### Logic-test style for all new tests (CLAUDE.md teststil rule)
**Source:** `frontend/src/lib/roleCatalog.test.ts:1-22` — `describe`/`it` blocks that import the
pure function directly and assert on its return value, no `render()`/`fireEvent`/DOM queries.
**Apply to:** `fansub-summary.test.ts`, `fansub-team-labels.test.ts`,
`fansubMediaPresentation.test.ts` (all new in this phase). Existing render-style tests
(`FansubTeamHistoricalGroup`, `FansubGroupMediaBlock`, `FansubProjectsGrid`, etc.) may be
*extended* minimally per RESEARCH.md's Validation Architecture table, but are explicitly flagged
as legacy pattern, not a template for new test files.

## No Analog Found

None — every file in scope has at least a role-match analog in the existing codebase. This phase's
own RESEARCH.md already did the gap analysis (Wave 0 Gaps section) and confirmed no new
dependency, framework, or architectural pattern is required.

## Metadata

**Analog search scope:** `frontend/src/app/anime/[id]/group/[groupId]/`,
`frontend/src/components/fansubs/`, `frontend/src/components/ui/` (`FocalCarousel*`,
`HeroMetrics*`), `frontend/src/lib/` (`fansub-labels.ts`, `fansub-summary.ts`,
`roleCatalog.test.ts`), `frontend/src/hooks/useClampedOverflow.ts`,
`database/migrations/0148_*`/`0149_*`.
**Files scanned:** 19 target files + 10 analog source files read directly (no re-reads).
**Pattern extraction date:** 2026-10-21
