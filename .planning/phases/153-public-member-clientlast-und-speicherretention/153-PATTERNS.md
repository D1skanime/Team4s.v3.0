# Phase 153: Public-Member-Profil — Speicherretention, Importgraph, SSR-Sichtbarkeit - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 19 (16 modified, 1 new-pattern edit, 1 discretionary new test file, 1 new doc artifact)
**Analogs found:** 15 exact/in-repo / 19 total (4 are "fix-in-place, analog is a sibling doing it right" or "no in-repo precedent")

This phase is a corrective refactor, not new-surface construction. Nearly every touched file
already exists; the "pattern to copy" for most of them is either (a) an already-correct sibling
in the same directory doing the identical thing right, or (b) a framework-native mechanism with
zero prior in-repo call sites (flagged explicitly below, per RESEARCH.md's own flag).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/profile/AchievementArtwork.tsx` | component (image geometry) | transform (props → `sizes` string) | itself — `HERO_SIZES`/`STAGE_SIZES` constants already exist in the same file | exact (in-place simplification, no external analog needed) |
| `frontend/src/components/profile/AchievementArtwork.test.tsx` | test | request-response (assert rendered attribute) | itself — existing assertions, values updated only | exact |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` | test | request-response | itself — existing assertions, values updated only | exact |
| `frontend/src/components/editor/index.ts` | barrel/config | re-export | itself — decision is additive/subtractive on existing 4 lines | exact |
| `frontend/src/components/profile/MemberStorySection.tsx` | component (renderer-only consumer) | request-response (props → HTML) | `frontend/src/components/public/PublicNoteCard.tsx` (sibling renderer-only consumer, same fix applied in the same task) | exact (role-match, same fix pattern) |
| `frontend/src/components/profile/MemberGroupsHistorySection.tsx` | component (renderer-only consumer) | request-response | same as above | exact |
| `frontend/src/components/public/PublicNoteCard.tsx` | component (renderer-only consumer) | request-response | `frontend/src/components/profile/MemberStorySection.tsx` | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` | component (renderer-only consumer, admin) | request-response | `frontend/src/components/profile/MemberStorySection.tsx` (renderer-only import fix identical, different feature area) | role-match |
| `frontend/src/app/members/[slug]/not-found.tsx` | route (Next.js not-found segment) | request-response / code-split boundary | **no in-repo analog** — first `next/dynamic` use in this codebase (confirmed via repo-wide grep, zero hits) | no analog — use RESEARCH.md's illustrative Pattern 3 shape |
| `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | test | request-response | itself — existing suite, extended for the dynamic-import wrapping | exact (extend, don't replace) |
| `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` | component (interactive island, pagination) | CRUD (paginated fetch) + event-driven (IntersectionObserver gate) | `frontend/src/components/profile/LatestContributionsSection.tsx` (hooks-first-then-early-return template, confirmed at line 148-160) | exact — RESEARCH.md explicitly names this the template |
| `frontend/src/components/profile/MemberCurrentProjectsSection.module.css` | config (CSS Module) | — | `frontend/src/components/profile/LatestContributionsSection.module.css` (sibling `data-visible` overlay pattern) | exact |
| `frontend/src/components/profile/LatestContributionsSection.tsx` | component (interactive island) | event-driven (IntersectionObserver gate) | itself — already has the correct early-return shape; only the overlay-CSS-gate narrowing changes | exact |
| `frontend/src/components/profile/LatestContributionsSection.module.css` | config (CSS Module) | — | itself / `MemberCurrentProjectsSection.module.css` (identical overlay shape) | exact |
| `frontend/src/components/profile/PreviousContributionsSection.tsx` | component (interactive island) | event-driven | `frontend/src/components/profile/LatestContributionsSection.tsx` (sibling consistency, per UI-SPEC §6) | exact |
| `frontend/src/components/profile/PreviousContributionsSection.module.css` | config (CSS Module) | — | `LatestContributionsSection.module.css` | exact |
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component (interactive island, carousel) | event-driven (`:has()` CSS keyed to child attribute) | `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` (same visibility-timing defect, different CSS mechanism — `:has()` vs `data-visible`) | role-match (mechanism differs, defect and fix shape identical) |
| `frontend/src/components/profile/MemberBadgeChain.module.css` | config (CSS Module) | — | itself — `.carouselShell:has(...)` selector narrowed, not replaced | exact |
| `frontend/src/app/members/[slug]/MemberProfileContent.tsx` | component (Server Component composition) | request-response (server-side section gating) | itself — `hasContributions` gate at lines 56/150 is the existing, explicitly-named template to extend to `MemberCurrentProjectsSection` | exact — RESEARCH.md/UI-SPEC explicitly name this as the template |
| `frontend/src/components/editor/__tests__/publicImportGraph.test.ts` (discretionary, D2 Open Question 3) | test (static guard) | batch (static string assertion) | **no in-repo analog for a static import-graph guard test** — would be new-pattern test infrastructure | no analog — see Shared Patterns → Regression Guard below |
| `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` (exact name is a planner decision, D1) | doc / config | batch (report artifact) | `docs/audits/2026-09-09-public-member-performance/REPORT.md` (structure/section-header convention to mirror; do not overwrite) | exact (structural sibling, new file) |

## Pattern Assignments

### `frontend/src/components/profile/AchievementArtwork.tsx` (component, transform)

**Analog:** itself — no external file needed; the constants already exist in the same file.

**Current defect** (lines 20-21, 35-38, verified this session):
```tsx
const HERO_SIZES = '(min-width: 658px) 240px, (min-width: 562px) 216px, 192px'
const STAGE_SIZES = '(min-width: 562px) 80px, 64px'
// ...
const fallbackSizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
// Native lazy-image auto sizes use the actual container layout without per-card observers.
const sizes = priority ? fallbackSizes : `auto, ${fallbackSizes}`
const loading = priority ? undefined : 'lazy'
```

**Target shape** (per RESEARCH.md Pattern 1, verified `HERO_SIZES`/`STAGE_SIZES` already
byte-match `AchievementArtwork.module.css`'s `.hero`/`.stage` base sizes 192px/64px and the two
`@container achievement-card` breakpoints at 562px→216px/80px and 658px→240px — no CSS
realignment needed, A3 is a verify-only check):
```tsx
const sizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
const loading = priority ? undefined : 'lazy'
```
`loading`/`priority` branching is unaffected — only the `sizes` line's `auto,` prefix and its
now-dead `priority` conditional are removed. `ResponsiveImage.tsx` forwards `sizes` verbatim to
`next/image`; no change needed there.

**Two stale test assertions to update in the same task** (must not be left failing, per Pitfall 3):
- `frontend/src/components/profile/AchievementArtwork.test.tsx:41` — asserts
  `'auto, (min-width: 658px) 240px, (min-width: 562px) 216px, 192px'`
- `frontend/src/components/profile/AchievementArtwork.test.tsx:89` — asserts
  `'auto, (min-width: 562px) 80px, 64px'`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx:1110` — asserts
  `'auto, (min-width: 562px) 80px, 64px'`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx:1335` — asserts
  `'auto, (min-width: 562px) 80px, 64px'`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx:1338` — asserts an array containing
  both `auto,`-prefixed hero/stage strings

Update all five assertions to the corrected non-`auto` strings in the same commit as the source
change — do not delete them, they remain the regression guard against a future `auto,` regression.

**Confirmed:** repo-wide grep (`grep -rln 'sizes="auto"\|`auto,' frontend/src`) returns exactly one
file — `AchievementArtwork.tsx` itself. No other call site exists (A4 is a verify-only check, no
second location to fix).

---

### `frontend/src/components/profile/MemberStorySection.tsx`, `MemberGroupsHistorySection.tsx`, `frontend/src/components/public/PublicNoteCard.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` (renderer-only consumers, request-response)

**Analog:** each other — identical one-line fix applied at four sites; `MemberStorySection.tsx` is
the canonical example named in the user-request.

**Current import** (identical shape at all four, verified this session):
```tsx
// frontend/src/components/profile/MemberStorySection.tsx:5
import { RichTextRenderer } from '@/components/editor'

// frontend/src/components/profile/MemberGroupsHistorySection.tsx:10
import { RichTextRenderer } from '@/components/editor'

// frontend/src/components/public/PublicNoteCard.tsx:7
import { RichTextRenderer } from '@/components/editor'

// frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx:6
import { RichTextRenderer } from '@/components/editor'
```

**Target shape** (identical at all four):
```tsx
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
```

**Verified safe:** `RichTextRenderer.tsx` (full file, verified this session) has zero Tiptap/
ProseMirror imports — only its own CSS module:
```tsx
// Source: frontend/src/components/editor/RichTextRenderer.tsx (full file)
import styles from './RichTextRenderer.module.css'

type RichTextRendererProps = {
  bodyHtml?: string | null
  bodyJson?: unknown | null
  editorType?: string | null
  contentSchemaVersion?: number | null
}

// SICHERHEITSINVARIANTE: dangerouslySetInnerHTML NUR mit body_html (serverseitig sanitisiert).
// Niemals body_json direkt rendern ohne serverseitiges Sanitizing.
export function RichTextRenderer({ bodyHtml }: RichTextRendererProps) {
  if (!bodyHtml?.trim()) return null
  return (
    <div className={styles.richTextOutput} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  )
}
```
The B1 fix touches only the import line in each of the four consumers — `RichTextRenderer.tsx`
itself is never edited (its sanitization invariant is out of scope and must stay byte-identical).

**Do NOT touch** (barrel stays in use for these six real `RichTextEditor` consumers, confirmed by
repo-wide grep this session): `ProfileStoryCard.tsx`, `ReleaseVersionNotesTab.tsx`,
`AnimeProjectNoteForm.tsx`, `NotesTab.helpers.tsx`, `AnimeProjectNoteWorkspace.tsx`,
`dev/ui-system/showcase/ProjectNoteShowcase.tsx`.

**Barrel itself** (`frontend/src/components/editor/index.ts`, full file, unchanged shape unless
the B3 decision picks a split):
```ts
export { RichTextEditor } from './RichTextEditor'
export { RichTextRenderer } from './RichTextRenderer'
export { ColorTokenExtension, COLOR_TOKENS } from './ColorTokenExtension'
export type { ColorToken } from './ColorTokenExtension'
```

**Pitfall 4 check before editing each consumer's test file:** grep each of the four consumers'
`.test.tsx` for `vi.mock('@/components/editor'` — if present, either add a matching
`vi.mock('@/components/editor/RichTextRenderer', ...)` or confirm the test already exercises the
real (safe, Tiptap-free) implementation.

---

### `frontend/src/app/members/[slug]/not-found.tsx` (route, code-split boundary) — NO IN-REPO ANALOG

**Analog:** none in this codebase — `next/dynamic` has zero existing call sites (confirmed via
repo-wide grep `grep -rn "next/dynamic" frontend/src` returning nothing). This is new-pattern work
per RESEARCH.md; flag it as such rather than searching further for a non-existent analog.

**Current full file** (5 lines, verified this session):
```tsx
// frontend/src/app/members/[slug]/not-found.tsx
import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'

export default function MemberProfileNotFound() {
  return <OwnHiddenProfilePreview />
}
```

**Target shape** (illustrative, from RESEARCH.md Pattern 3 — verify current Next 16 `next/dynamic`
API before committing to this exact shape):
```tsx
import dynamic from 'next/dynamic'
import { LoadingState } from '@/components/ui'

const OwnHiddenProfilePreview = dynamic(
  () => import('./OwnHiddenProfilePreview').then((m) => m.OwnHiddenProfilePreview),
  { ssr: false, loading: () => <LoadingState title="Profil wird geprüft." /> },
)

export default function MemberProfileNotFound() {
  return <OwnHiddenProfilePreview />
}
```
`LoadingState` is the existing sanctioned generic-loading primitive (see Shared Patterns below);
its fallback copy must stay generic/non-slug-specific per the Security Domain note in RESEARCH.md
(no owner-only information may leak into the dynamic-import loading fallback).

**Owner/privacy logic to leave byte-identical** (`OwnHiddenProfilePreview.tsx`, verified this
session, the gates that must not move or change):
```tsx
// frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx:71,101
if (!slug || !hasAuthSession) {
  return <UnavailableProfile />
}
// ...
if (!response || !response.viewer.is_owner) {
  return <UnavailableProfile />
}
```

**Regression test to extend, not replace:**
`frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` already exists and mocks
`next/navigation`, `@/lib/api`, `@/lib/useAuthSession`, and every child section component. Note
its existing style (verified this session, lines 1-60): it uses `readFileSync` +
`existsSync`/string-presence checks on source files (`apiSource`, `ownProfilePageSource`,
`previewSourcePath`, `notFoundSourcePath` constants at the top) in addition to real
`render`/`fireEvent`/`screen` assertions. **Per CLAUDE.md's Teststil rule, the `readFileSync` +
`strings.Contains`-equivalent substring-presence pattern is explicitly forbidden for new
assertions** ("Verboten: Das Lesen der eigenen Quelldatei ... und die Prüfung eines Substrings
... ohne den Code je aufzurufen und eine echte Response zu prüfen") — this file's existing use of
that pattern is legacy (`Altlast`) per the same CLAUDE.md section, not a template to extend. Any
**new** assertion this task adds (e.g. for the dynamic-import wrapping) must use
`render`/`screen`/`fireEvent` against actually-executed component output, not a source-string grep.
Reuse only the file's `render`-based assertions as the pattern to copy.

---

### `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` (component, CRUD + event-driven)

**Analog:** `frontend/src/components/profile/LatestContributionsSection.tsx` — RESEARCH.md
explicitly names this the hooks-first-then-early-return template (Pattern 4).

**Template to copy** (verified this session, `LatestContributionsSection.tsx:149-160`):
```tsx
export function LatestContributionsSection({
  items,
  headingLevel = 2,
  referenceNow,
}: LatestContributionsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  const allUsableItems = usableItems(items)
  const visibleItems = expanded ? allUsableItems : allUsableItems.slice(0, INITIAL_ITEM_COUNT)
  const initialVisibleItems = allUsableItems.slice(0, INITIAL_ITEM_COUNT)
  if (allUsableItems.length === 0) return null   // ← all hooks already called above this line

  return ( /* real markup, no early hook skip */ )
}
```

**Current `MemberCurrentProjectsSection.tsx` shape to adapt** (verified this session, full hook
block lines 52-117 + the empty-state branch at line 143):
```tsx
export function MemberCurrentProjectsSection({ memberSlug, projects, totalCount }: MemberCurrentProjectsSectionProps) {
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')
  const [sourceProjects, setSourceProjects] = useState(projects)
  const [visibleProjects, setVisibleProjects] = useState(projects)
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  const [attempt, setAttempt] = useState(0)
  const [appliedSuccessKey, setAppliedSuccessKey] = useState('')
  // ... "adjust state while rendering" blocks, fetcher, useCancellableSlugState ...

  return (
    <section ref={targetRef} className={styles.section}>
      <SectionHeader title="Fansub-Projekte" />
      {visibleProjects.length > 0 ? ( /* skeleton <ul data-visible=...> */ ) : null}
      {visibleProjects.length === 0 ? (
        <EmptyState title="Keine aktuellen Projekte sichtbar." />   // line 144, already exists
      ) : ( /* real <ul> */ )}
      {/* footer, pagination button, ErrorState */}
    </section>
  )
}
```
Per RESEARCH.md Pattern 4's precise nuance: hooks must stay **called** (Rules of Hooks — cannot
conditionally skip `useState`/`useCancellableSlugState`/`useNearViewportActivation`), but the
**visible DOM** for the skeleton `<ul>`/pagination scaffolding must be skipped when
`totalCount === 0`, following the `EmptyState` branch that already exists at line 143-144 — the
work is to make that branch also skip mounting the skeleton overlay `<ul>` (lines 123-142) and the
footer/pagination markup (lines 247-275), not to invent a new empty state.

**Existing legitimate loading/error state to preserve as the ONLY genuine-loading trigger** (lines
252-275, per UI-SPEC — do not remove):
```tsx
<Button
  variant="secondary"
  size="sm"
  loading={isLoading}
  disabled={!interactionEnabled}
  onClick={loadMoreProjects}
>
  Weitere Projekte laden
</Button>
{/* ... */}
{hasError ? (
  <ErrorState
    title="Weitere Projekte konnten nicht geladen werden"
    description="Bitte versuche es erneut."
    action={<Button variant="secondary" onClick={loadMoreProjects}>Erneut versuchen</Button>}
  />
) : null}
```

---

### `frontend/src/components/profile/LatestContributionsSection.tsx` / `PreviousContributionsSection.tsx` / `MemberCurrentProjectsSection.tsx` — the shared skeleton-overlay CSS-gate defect (all three)

**Analog:** each other — the identical `data-visible` overlay defect, verified in all three this
session.

**Confirmed defect** (`MemberCurrentProjectsSection.tsx:123-128`):
```tsx
<ul
  className={`${styles.projectList} ${styles.projectSkeleton}`}
  aria-hidden="true"
  data-visible={interactionEnabled ? 'false' : 'true'}
>
```
```css
/* MemberCurrentProjectsSection.module.css:21-30 */
.projectSkeleton {
  z-index: 2;
  pointer-events: none;
  opacity: 1;
  visibility: visible;
}
.projectSkeleton[data-visible='false'] {
  opacity: 0;
  visibility: hidden;
}
```

**Identical shape at `LatestContributionsSection.tsx:167-171`:**
```tsx
<div
  className={styles.skeletonLayer}
  aria-hidden="true"
  data-visible={interactionEnabled ? 'false' : 'true'}
>
```

**Identical shape at `PreviousContributionsSection.tsx:63-67`** (confirmed this session — matches
UI-SPEC §6's claim exactly, not previously named in the user-request's file list but locked-in
scope per UI-SPEC "sibling consistency"):
```tsx
<div
  className={styles.skeletonLayer}
  aria-hidden="true"
  data-visible={interactionEnabled ? 'false' : 'true'}
>
```

**Fix direction (all three, same shape):** the real `<ul>`/content stays unconditionally visible
in SSR markup (no `data-visible` gate on it at all); the `data-visible`/skeleton overlay markup
is either removed entirely (if the section has no genuine async sub-state) or re-scoped to gate
ONLY on a real loading signal (e.g. `MemberCurrentProjectsSection`'s existing `isLoading` variable
already computed at line 94: `attempt > 0 && state.key === requestKey && state.status === 'loading'`).
`interactionEnabled` stays legitimate only for `disabled={!interactionEnabled}` on the pagination/
expand buttons (already present at `MemberCurrentProjectsSection.tsx:257`,
`LatestContributionsSection.tsx:252`, `PreviousContributionsSection.tsx:84`) — those `disabled`
usages are unaffected and must not be removed.

---

### `frontend/src/components/profile/MemberBadgeChain.tsx` / `.module.css` (component, event-driven, `:has()` variant)

**Analog:** `MemberCurrentProjectsSection.tsx`/`.module.css` — same defect class, different CSS
mechanism (native `:has()` selector keyed to a **child**-set attribute rather than the component's
own sibling `data-visible` attribute).

**Confirmed defect, TSX side** (`MemberBadgeChain.tsx:210-219`, verified this session):
```tsx
<div className={chainStyles.carouselShell}>
  <div
    className={chainStyles.carouselSkeleton}
    aria-hidden="true"
    data-badge-skeleton
  >
    <span className={chainStyles.skeletonControl} />
    <span className={chainStyles.skeletonCard} />
    <span className={chainStyles.skeletonControl} />
  </div>
  <FocalCarousel
    /* ... */
    deferInteractionUntilNearViewport
    /* ... */
  />
</div>
```

**Confirmed defect, CSS side** (`MemberBadgeChain.module.css:57-70`, per RESEARCH.md, and the
attribute source, `FocalCarouselInternals.tsx:296`):
```css
.carouselShell:has([data-interaction-enabled="true"]) > .carouselSkeleton,
.carouselShell:has(.badgeGrid) > .carouselSkeleton {
  visibility: hidden;
}
```
```tsx
// frontend/src/components/ui/FocalCarouselInternals.tsx:296
<div data-interaction-enabled={interactionEnabled ? 'true' : 'false'} /* ... */>
```

**Fix direction, per RESEARCH.md Pattern 5:** keep the `:has()` mechanism itself (it is a correct,
native CSS approach, not the defect) — narrow **when** it masks real content. The badge/tier
`<span>` markup underneath (lines 271-350, the earned/locked badge grid) must be visible on first
paint regardless of `data-interaction-enabled`; only the skeleton overlay's own visibility timing
changes. **Binding constraint (do not violate):** the rendered badge/family/tier SET (lines 93-118,
`buildMemberBadgeGroups`, and the full locked-ladder rendering at 271-350) stays 100% unchanged —
this file's *content* is out of scope, only its *skeleton CSS timing* is in scope.

---

### `frontend/src/app/members/[slug]/MemberProfileContent.tsx` (Server Component, request-response)

**Analog:** itself — the `hasContributions` gate is the existing, already-correct template to
extend, not a file to import a pattern from elsewhere.

**Existing template** (verified this session, lines 53-56 and 150-172):
```tsx
const previousContributionsCount = (
  profile.previous_contributions_count ?? previousContributions.length
)
const hasContributions = latestContributions.length > 0 || previousContributionsCount > 0

// ...

{hasContributions ? (
  <section
    className={`${styles.section} ${styles.rhythmBand} ${styles.contributionsBand}`}
    aria-label="Beiträge"
  >
    <SectionHeader title="Beiträge" underline />
    <div className={/* ... */}>
      <LatestContributionsSection items={latestContributions} headingLevel={3} referenceNow={referenceNow} />
      <PreviousContributionsSection
        items={previousContributions}
        totalCount={previousContributionsCount}
        headingLevel={3}
        showEmptyState
      />
    </div>
  </section>
) : null}
```
Note the projects section (lines 129-138) currently has **no** equivalent server-side gate — it
unconditionally renders `<MemberCurrentProjectsSection>` regardless of `totalCount`. Per C2, this
is exactly where `MemberCurrentProjectsSection`'s own internal `totalCount === 0` branch (see
above) does the work instead of `MemberProfileContent` gating it externally — both are valid
places to decide "empty," but the internal-component approach (matching the existing
`LatestContributionsSection`/`PreviousContributionsSection` internal-`return null`/`showEmptyState`
convention) keeps the decision co-located with the component that owns the pagination hooks,
consistent with how `PreviousContributionsSection` already receives a `showEmptyState` prop rather
than being externally gated.

---

## Shared Patterns

### `useNearViewportActivation` hook — DO NOT MODIFY (C4, binding)

**Source:** `frontend/src/hooks/useNearViewportActivation.ts` (full file, 37 lines, verified this
session)
```ts
const ACTIVATION_ROOT_MARGIN = '600px 0px'

export function useNearViewportActivation<T extends HTMLElement>(deferActivation = true) {
  const targetElementRef = useRef<T | null>(null)
  const activatedRef = useRef(!deferActivation)
  const [interactionEnabled, setInteractionEnabled] = useState(!deferActivation)
  const targetRef = useCallback((target: T | null) => {
    targetElementRef.current = target
    if (!target || activatedRef.current || (deferActivation && typeof IntersectionObserver !== 'undefined')) return
    activatedRef.current = true
    setInteractionEnabled(true)
  }, [deferActivation])

  useEffect(() => {
    if (activatedRef.current || !deferActivation || typeof IntersectionObserver === 'undefined') return
    const target = targetElementRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (activatedRef.current || !entries.some((entry) => entry.isIntersecting)) return
      activatedRef.current = true
      observer.disconnect()
      setInteractionEnabled(true)
    }, { rootMargin: ACTIVATION_ROOT_MARGIN })
    observer.observe(target)
    return () => observer.disconnect()
  }, [deferActivation])

  return { targetRef, interactionEnabled }
}
```
**Apply to:** all four Workstream-C components. This hook's return value (`interactionEnabled`)
stays a legitimate input to `disabled={}` props on interactive elements only. Do not touch
`ACTIVATION_ROOT_MARGIN`, the `IntersectionObserver` options, or add/remove any effect here.

### `LoadingState` / `ErrorState` / `EmptyState` — the only sanctioned loading/error/empty primitives

**Source:** `frontend/src/components/ui/LoadingState.tsx` (full file):
```tsx
export function LoadingState({
  title = 'Inhalt wird vorbereitet',
  description = 'Die Datenstruktur und die zugehörigen Oberflächen werden geladen.',
}: LoadingStateProps) {
  return (
    <div className={`${styles.stateCard} ${styles.stateInfo}`}>
      <div className={styles.stateIcon} aria-hidden="true"><span className={styles.stateSpinner} /></div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
    </div>
  )
}
```
**Source:** `frontend/src/components/ui/ErrorState.tsx` (relevant excerpt):
```tsx
export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className={`${styles.stateCard} ${styles.stateDanger}`}>
      <div className={styles.stateIcon} aria-hidden="true"><TriangleAlert size={20} strokeWidth={2} /></div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {action}
    </div>
  )
}
```
Both are exported from the `@/components/ui` barrel (`frontend/src/components/ui/index.ts`
confirmed to `export * from './LoadingState'` / `'./ErrorState'` / `'./EmptyState'`). **Apply to:**
`not-found.tsx`'s `next/dynamic` loading fallback (`LoadingState`), any new per-section error
boundary introduced for C3 isolation (`ErrorState`, already used at
`MemberCurrentProjectsSection.tsx:266-274`). Do not design a new skeleton/spinner/error shape —
UI-SPEC is explicit that no new visual component is needed.

### Import-path convention for direct (non-barrel) editor imports

**Apply to:** all four Workstream-B1 consumers. Confirmed working alias form:
`@/components/editor/RichTextRenderer` (not a relative path) — matches this project's existing `@`
path-alias convention (`frontend/vitest.config.ts`, `tsconfig.json`).

### Regression-guard convention (D2, discretionary)

If the planner adopts the lightweight static-guard approach (RESEARCH.md Open Question 3), no
in-repo analog exists for this specific kind of test (import-graph/string-presence guard). Note
per CLAUDE.md's Teststil rule: a guard that asserts an import specifier is used at a call site by
rendering the component and inspecting its actual resolved behavior (e.g. mocking
`@/components/editor/RichTextRenderer` and `@/components/editor/RichTextEditor` separately, then
asserting which mock was invoked) is compliant; a guard that `readFileSync`s the consumer's own
source and `includes()`-checks the import string is the explicitly forbidden pattern (the
"Ausnahme (1) Abwesenheits-Prüfungen" carve-out — *an identifier must appear NOWHERE in the file*
— is the one legitimate use of source-text scanning; asserting *what a component actually renders*
is not covered by that carve-out and must go through `render`/`screen`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/app/members/[slug]/not-found.tsx` (target: `next/dynamic` wrapper) | route | code-split boundary | Zero existing `next/dynamic`/`React.lazy`/content-level `<Suspense>` call sites anywhere in this codebase (confirmed via repo-wide grep this session) — first use of this pattern; follow RESEARCH.md's illustrative Pattern 3 shape and the official Next.js `next/dynamic` API, not an in-repo precedent |
| `frontend/src/components/editor/__tests__/publicImportGraph.test.ts` (discretionary new file, D2) | test | batch/static | No in-repo static import-graph guard test exists; if the planner adopts this discretionary D2 approach, this is genuinely new test-infrastructure work, not a copy of an existing test's shape |
| `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` (name TBD by planner, D1) | doc | batch | New sibling doc; structurally mirror `REPORT.md`'s own section-header conventions (not re-extracted here — read `REPORT.md` directly at execution time), but this is a documentation artifact, not source code, so no code-pattern excerpt applies |

## Metadata

**Analog search scope:** `frontend/src/components/profile/`, `frontend/src/components/public/`,
`frontend/src/components/editor/`, `frontend/src/components/ui/`, `frontend/src/app/members/[slug]/`,
`frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/hooks/`.
**Files scanned:** 19 target files read in full this session (all confirmed at HEAD `9f9a45f3`,
same commit RESEARCH.md verified against); plus 2 repo-wide greps (`next/dynamic` usage — zero
hits; `sizes="auto"`/`` `auto, `` usage — one hit, `AchievementArtwork.tsx` itself) and 1 targeted
grep for stale `auto,`-prefixed test assertions (5 hits across 2 test files, all now cited above
with exact line numbers).
**Pattern extraction date:** 2026-09-09
