# Phase 177: Einheitlicher Bild-Viewer (F-18) - Pattern Map

**Mapped:** 2026-10-09
**Files analyzed:** 17 (10 modified/replaced, 5 new, 2 deleted outright)
**Analogs found:** 15 / 17 (2 have no analog — new primitive variants, see "No Analog Found")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/fansubs/FansubMediaLightbox.tsx` (extended, becomes the shared viewer shell) | component | request-response (controlled props, client-side state) | itself (current 109-line version, D-01 vorbild) | exact (extend-in-place) |
| `frontend/src/components/fansubs/<new>MediaViewerStage.tsx` (new sibling, image + zoom + progressive-load + prefetch, split out for 450-line budget per D-15/UI-SPEC) | component | event-driven (pointer/touch/keyboard handlers) | `ProjectMemberMediaViewer.tsx` (prefetch block) + `FansubMediaLightbox.tsx` (nav/keyboard block) | role-match (composed from two analogs) |
| `frontend/src/components/fansubs/<new>MediaViewerMetadataPanel.tsx` (new sibling, metadata overlay rendering) | component | transform (props → rendered fields, graceful omission) | `ProjectMemberMediaViewer.tsx` lines 102-112 (`<aside>` sidebar) | exact (content/field-set), layout diverges (D-21: stacked, not side-by-side) |
| `frontend/src/lib/mediaViewerNavigation.ts` (new, pure logic: wrap-around index math, swipe-threshold calc) | utility | transform (pure function) | `FansubMediaLightbox.tsx` lines 46-51 (inline, not yet extracted) | role-match (logic exists today only inline in a component — must be extracted per D-13/Pitfall 1) |
| `frontend/src/lib/mediaViewerNavigation.test.ts` (new, D-13-compliant pure-function test) | test | transform | `frontend/src/lib/fansub-summary.test.ts` | exact (pure-function-call test style, no `render`/`fireEvent`) |
| `frontend/src/components/ui/Modal.tsx` (additive `variant?: 'default' \| 'stage'` prop) | component (global primitive) | request-response | itself (current version) | exact (extend-in-place) |
| `frontend/src/components/ui/Modal.module.css` (additive stage-variant CSS rules) | config/style | — | itself (current version) + `ui.module.css` `.closeButton`/`.overlayClose` rules | exact |
| `frontend/src/components/ui/Button.tsx` (additive `variant?: ... \| 'floating'`) | component (global primitive) | request-response | itself (current version, existing variant switch block lines 51-66) | exact (extend-in-place) |
| `frontend/src/components/ui/Button.module.css` (additive `.buttonFloating` rule, visually = existing `.closeButton` recipe) | config/style | — | `ui.module.css` lines 207-219 (`.closeButton`) | exact (recipe to port, new class name) |
| `frontend/src/styles/globals.css` (additive `--surface-stage: #10141c` token) | config | — | existing `--surface-*` token group in the same file | exact |
| `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` (rewritten: delete own lightbox + fetch, call shared viewer + `getGroupReleaseImages`) | component | CRUD → request-response (data fetch) + event-driven (viewer) | `ReleaseGallery.tsx` (`getGroupReleaseImages` + `toLightboxItem` pattern) | exact (migration target explicitly named in research) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx` (render-call swap only, lines 104-110) | component | event-driven | itself (grid/pagination logic untouched, only the viewer render call changes) | exact (minimal diff) |
| `frontend/src/components/groups/GroupAssetsExperience.tsx` (delete lines 63-64, 73-96, 98-101, 154-165, 211-244; wire `.imageGrid` button into shared viewer) | component | event-driven | itself (video path at lines 103-106, 246-254 stays, is the "keep unchanged" reference) | exact (surgical removal, documented boundary) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` (delete outright, D-06) | component | — | — | n/a (deletion, no replacement) |
| `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx` + `.test.tsx` (delete outright after porting prefetch+sidebar, D-02) | component/test | — | — | n/a (deletion after extraction) |
| `backend/internal/repository/release_detail_public_repository.go` (`ListReleaseVersionImagesCursor`: add `mf_display` JOIN + `display_path` SELECT/scan, D-24) | repository | CRUD (SQL read) | `release_detail_public_repository_helpers.go`'s `imagesQuery()` (already has the correct `mf_display` JOIN for the non-cursor path) | exact (copy the exact JOIN clause from the sibling query) |
| `backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go` (new, D-13/D-24-compliant repository test) | test | CRUD | existing `*_display_url_test.go` files (research confirms these already exist for `FansubRepository`/`ReleaseDetailPublicRepository`) | exact |

## Pattern Assignments

### `frontend/src/components/fansubs/FansubMediaLightbox.tsx` (component, request-response) — the Vorbild to extend in place

**Analog:** itself (D-01 — this file IS the basis; "pattern" here means "what to keep vs. what to change")

**Full current imports (lines 1-9):**
```typescript
'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useEffect } from 'react'

import { Button, Modal } from '@/components/ui'
import { resolveApiUrl } from '@/lib/api'
import styles from './FansubMediaLightbox.module.css'
```
Copy this import shape verbatim for the new shell file; add `ZoomIn`, `ZoomOut` to the `lucide-react` import (UI-SPEC: "neu für diese Phase").

**Current controlled-props contract (lines 11-25) — widen additively, do not break:**
```typescript
export interface PublicImageLightboxItem {
  id: number
  title?: string | null
  caption?: string | null
  description?: string | null
  media_type: string
  original_url?: string | null
}

interface FansubMediaLightboxProps {
  media: PublicImageLightboxItem[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}
```
Research-confirmed additive fields to add (all optional, so `ReleaseGallery.tsx`/`FansubGroupMediaBlock.tsx` keep compiling unmodified per D-07): `display_url?: string | null`, `thumbnail_url?: string | null`, `category?: string | null`, `episode_label?: string | null`, `release_version_label?: string | null`, `release_version_id?: number | null` (for the "Release öffnen →" CTA, `ProjectMemberMediaViewer`-consumer only).

**Current wrap-around keyboard nav (lines 40-57) — the pattern to extract into a pure function per D-13:**
```typescript
useEffect(() => {
  if (!isOpen || index === null) return

  function handleKeyDown(event: KeyboardEvent) {
    if (index === null) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onNavigate((index + 1) % total)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onNavigate((index - 1 + total) % total)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isOpen, index, total, onNavigate])
```
Extract `(index + 1) % total` / `(index - 1 + total) % total` into `wrapIndex(current, total, delta)` in the new `mediaViewerNavigation.ts` file — this is the exact function Pitfall 1 in RESEARCH.md says must exist as a directly-testable unit, not buried in this `useEffect`. Add `Home`→`onNavigate(0)` and `End`→`onNavigate(total - 1)` cases here per D-23 (ported from `ScreenshotGallery.tsx`, see below).

**Current `Modal` wrapping (line 79) — must change to the new `variant="stage"`:**
```typescript
<Modal open={isOpen} onClose={onClose} title={title} size="lg">
```
becomes (illustrative, exact prop name per the `Modal` extension below):
```typescript
<Modal open={isOpen} onClose={onClose} title={title} size="lg" variant="stage">
```

**What must NOT change (D-07 compatibility guarantee):** `ReleaseGallery.tsx:202-207` and `FansubGroupMediaBlock.tsx:161-166` call sites (both shown below) must keep compiling and rendering without their own code changes — verify this explicitly once the prop interface is widened.

---

### `frontend/src/components/fansubs/<new>MediaViewerStage.tsx` (new, component, event-driven) — zoom/swipe/progressive-load/prefetch

**Analog 1 (prefetch, port verbatim per D-02):** `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx` lines 12-17, 59-63:
```typescript
function prefetch(url: string | undefined) {
  if (!url) return
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') return
  const img = new window.Image()
  img.src = url
}
// ...
useEffect(() => {
  if (total <= 1) return
  prefetch(items[(index + 1) % total]?.preview_url)
  prefetch(items[(index - 1 + total) % total]?.preview_url)
}, [index, total, items])
```
Port as-is; parameterize the field to `original_url` instead of `preview_url` per UI-SPEC's progressive-load contract (step 5: "parametrisiert auf `original_url` statt `preview_url`"). Reuse `wrapIndex` from `mediaViewerNavigation.ts` instead of re-inlining the modulo math a second time.

**Analog 2 (zoom — no existing code, build from UI-SPEC's exact state machine):** UI-SPEC lines 213-226 — binary click-toggle, not continuous pinch/pan:
```
nicht gezoomt (Default) → Bild passt in Bühne (object-fit: contain), zentriert
gezoomt (100%) → Bild in nativer Auflösung; overflow: auto falls größer als Viewport
Auslöser: Klick/Tap auf das Bild (beide Richtungen), zusätzlich Button variant="floating" (Icon ZoomIn/ZoomOut)
```
Extract the toggle as a pure function (e.g. `toggleZoom(current: boolean): boolean` or a tiny reducer) in `mediaViewerNavigation.ts` or a sibling pure-logic file, per D-13/Pitfall 1 — do not leave it as inline `useState` toggled only by a JSX `onClick` with no directly-testable unit.

**Analog 3 (swipe — no existing code, build from UI-SPEC's exact threshold):** UI-SPEC lines 228-236, `--space-6` (32px) threshold:
```
touchstart/touchmove/touchend, horizontaler Delta ≥ 32px (--space-6) UND |deltaX| > |deltaY|
→ onNavigate mit derselben Wrap-around-Logik; sonst wird das Touch-Event nicht abgefangen
```
Extract `computeSwipeNavigation(deltaX: number, deltaY: number, threshold: number): 'prev' | 'next' | null` as a pure function per RESEARCH.md's explicit Pitfall-1 recommendation — test with plain `expect()` calls, no `fireEvent.touchStart`.

**Analog 4 (progressive load — no existing frontend code; backend infra already exists for 2/5 consumers, see Research Focus 3):** UI-SPEC lines 239-251:
```
1. Initiales src = display_url ?? original_url ?? thumbnail_url
2. new Image() preloads original_url in background
3. On load: swap src to original_url, no layout jump (object-fit: contain)
4. While loading: Pill "Originalbild wird geladen …", fades on completion or silent error fallback
5. Neighbor prefetch (index-1, index+1) via the same new Image().src technique (see Analog 1)
```
Extract the URL-selection logic as a pure function, e.g. `selectDisplaySrc(item, originalLoaded: boolean): string | null`, per D-13 (RESEARCH.md's Phase Requirements table explicitly names this as a Wave-0 test target: "pure function: 'which URL to show given load state'").

**Removal boundary note for `ScreenshotGallery.tsx`'s Home/End (D-23, now promoted to shared baseline):**
```typescript
// Source: frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:116-123
case 'Home':
  e.preventDefault()
  setActiveIndex(0)
  break
case 'End':
  e.preventDefault()
  setActiveIndex(images.length - 1)
  break
```
Port this `Home`/`End` behavior into the shared keyboard handler (see Analog in `FansubMediaLightbox.tsx` section above) as `onNavigate(0)` / `onNavigate(total - 1)` — this is the one feature ScreenshotGallery had that the Vorbild didn't, now unified per D-23.

---

### `frontend/src/components/fansubs/<new>MediaViewerMetadataPanel.tsx` (new, component, transform)

**Analog:** `ProjectMemberMediaViewer.tsx` lines 102-112 (the field set D-19 is modeled on):
```typescript
<aside className={styles.viewerInfo}>
  {title ? <h3 className={styles.viewerCategory}>{title}</h3> : null}
  <p className={title ? styles.viewerMeta : styles.viewerCategory}>{label}</p>
  <p className={styles.viewerMeta}>
    Folge {item.episode_label} · {item.release_version_label}
  </p>
  {item.caption ? <p className={styles.viewerCaption}>{item.caption}</p> : null}
  <Link href={releaseHref} className={styles.viewerReleaseLink}>
    Release öffnen →
  </Link>
</aside>
```
**Must change per D-21 (layout) and D-22 (omission):**
1. Layout: this is currently side-by-side (`.viewerMain` flex) — UI-SPEC mandates stacked-below-image for ALL 5 consumers on ALL form factors (D-21). Do not reuse the side-by-side CSS; build a new full-width block that follows the stage, not a sibling flex child.
2. Graceful omission (D-22): each field (`title`, `category` badge via `Badge variant="info"` + `CATEGORY_LABELS`, `episode_label`, `release_version_label`, `caption`) renders only if present — no placeholder dashes. The existing code above already does this correctly for `title`/`caption` via `?` ternaries; extend the same per-field `? : null` pattern to `episode_label`/`release_version_label` (currently unconditionally interpolated at line 105-107 — this must become conditional once thinner data shapes like `GroupAssetImage`/`PublicReleaseImage` feed the same component).
3. CTA gating: `"Release öffnen →"` only renders for the `ProjectMemberMediaViewer`-consumer position (has `release_version_id`), per Copywriting Contract — guard on `release_version_id != null`, not on consumer identity, so the same component works for all 5 call sites.

Category badge replacement — use the existing `Badge` primitive instead of the current raw `<p>`:
```typescript
// Source: UI-SPEC "Metadaten-Panel" field 2 — "Kategorie (Badge variant="info", Text aus bestehender CATEGORY_LABELS-Zuordnung)"
```
Find the `Badge` import pattern already used in `ReleaseGallery.tsx` (`import { Badge, Button, Modal, SectionHeader } from '@/components/ui'`) — reuse that import path.

---

### `frontend/src/lib/mediaViewerNavigation.ts` (new, utility, transform) + its test

**Analog for extraction source:** `FansubMediaLightbox.tsx` lines 46-51 (inline math to extract) — see "What must NOT change" note above for the exact modulo expressions.

**Analog for D-13-compliant test style:** `frontend/src/lib/fansub-summary.test.ts` lines 1-34 (pure function import + `describe`/`it`/`expect`, zero `render`/`fireEvent`):
```typescript
import { describe, expect, it } from 'vitest'

import type { AnimeFansubRelation } from '@/types/fansub'

import { buildFansubStoryGroups, buildFansubStoryPreview, resolveActiveFansubSlug } from './fansub-summary'

function makeRelation(overrides: Partial<AnimeFansubRelation> = {}): AnimeFansubRelation {
  return { /* ...fixture defaults... */, ...overrides }
}

describe('buildFansubStoryGroups', () => {
  it('dedupliziert nach fansub_group.id, wenn zwei Relationen dieselbe Gruppe referenzieren', () => {
    const relations = [ /* ... */ ]
    const groups = buildFansubStoryGroups(relations)
    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.id)).toEqual([1, 2])
  })
})
```
Apply this exact shape to `wrapIndex`, `computeSwipeNavigation`, `selectDisplaySrc`, and the zoom-toggle function: plain fixture builder + `describe`/`it`/`expect` on the function's return value, no component rendering. This is the canonical D-13-compliant test file in the codebase (confirmed via grep: files under `frontend/src/lib/*.test.ts` that do not import `render`).

**Do NOT use as analog:** `FansubMediaLightbox.test.tsx` and `ProjectMemberMediaViewer.test.tsx` — both use `render()` + `fireEvent.keyDown`/`fireEvent.click`, which is exactly what D-13 forbids for this phase's new/changed tests (confirmed via RESEARCH.md Pitfall 1). These two files will likely need to be rewritten, not extended.

---

### `frontend/src/components/ui/Modal.tsx` (global primitive, additive `variant` prop)

**Analog:** itself — full current source already read above (109 lines total shown in context). Key excerpts to anchor the diff:

**Current prop interface (lines 16-32) — add `variant?: 'default' | 'stage'` here, default `'default'`:**
```typescript
export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
  panelClassName?: string
}
```

**Current render (lines 109-135) — the four conditional blocks that must become variant-gated:**
```typescript
const modal = (
  <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby={titleID} onKeyDown={handleKeyDown}>
    <div className={styles.overlay} aria-hidden="true" />
    <button type="button" className={styles.overlayClose} aria-label="Modal schließen" onClick={onClose} />
    <div className={[styles.modalPanel, size === 'lg' ? styles.modalPanelLg : null, panelClassName].filter(Boolean).join(' ')} ref={panelRef} tabIndex={-1}>
      <div className={styles.dialogHeader}>
        <div>
          <h3 className={styles.dialogTitle} id={titleID}>{title}</h3>
          {description ? <p className={styles.dialogDescription}>{description}</p> : null}
        </div>
        <button type="button" ref={closeButtonRef} className={styles.closeButton} aria-label="Schließen" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className={styles.modalBody}>{children}</div>
      <div className={styles.dialogFooter}>
        {footer ?? <Button variant="secondary" onClick={onClose}>Schließen</Button>}
      </div>
    </div>
  </div>
)
```
Per UI-SPEC's "Primitive-Erweiterungen" table (exact prop-by-prop spec):
- `variant="stage"` → do not render `.dialogHeader` block (title stays only as a `.visually-hidden` span with `id={titleID}` for `aria-labelledby`).
- `variant="stage"` → do not render `.dialogFooter` block at all (ignore `footer` prop entirely in this mode).
- `variant="stage"` → do not render `.overlayClose` button (backdrop click must not close).
- `variant="stage"` → reposition the close button: `position: absolute; top: var(--space-5); right: var(--space-5)` instead of inline in the header — same visual recipe (`.closeButton`), just repositioned via a new CSS class, not a new visual style.
- `variant="stage"` → `.modalBody` padding/gap becomes `padding: 0; gap: 0` (viewer controls its own inner layout).
- `modalPanel` background stays unchanged in both variants (`--surface-card`, light) — only the inner stage area (new `--surface-stage` token) is dark.

This is purely additive — every existing caller (`ReleaseGallery`, `FansubGroupMediaBlock`, any other `Modal` consumer project-wide) omits the new prop and keeps today's `'default'` behavior unchanged, per D-07/D-11 compatibility requirement.

---

### `frontend/src/components/ui/Modal.module.css` + `ui.module.css` (style additions for the stage variant)

**Analog for the close-button visual recipe to reposition, not redesign:** `frontend/src/components/ui/ui.module.css` lines 207-219:
```css
.closeButton {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-card) 96%, transparent);
  color: var(--text-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
```
Add a new class (e.g. `.closeButtonFloating`) in `Modal.module.css` that copies every property above verbatim and adds only `position: absolute; top: var(--space-5); right: var(--space-5);` — per UI-SPEC: "visuell identisch zum bestehenden `.closeButton`-Rezept ... kein neuer visueller Stil nötig, nur Repositionierung".

**Analog for `modalPanel`/`modalBody` structure to gate by variant:** `Modal.module.css` lines 14-31, 63-70 (current grid/padding rules) — add a `.modalBodyStage { padding: 0; gap: 0; }` override class applied conditionally alongside the existing `.modalBody` class, following the same additive-class-composition pattern already used for `size="lg"` (`modalPanelLg` appended via the `.filter(Boolean).join(' ')` array in `Modal.tsx` line 114).

---

### `frontend/src/components/ui/Button.tsx` + `.module.css` (global primitive, additive `'floating'` variant)

**Analog:** itself — current variant-switch block (lines 51-66):
```typescript
const classes = classNames(
  styles.button,
  variant === 'primary' && styles.buttonPrimary,
  variant === 'secondary' && styles.buttonSecondary,
  variant === 'ghost' && styles.buttonGhost,
  variant === 'subtle' && styles.buttonSubtle,
  variant === 'danger' && styles.buttonDanger,
  variant === 'success' && styles.buttonSuccess,
  variant === 'text' && styles.buttonText,
  size === 'sm' && styles.buttonSmall,
  size === 'lg' && styles.buttonLarge,
  fullWidth && styles.buttonBlock,
  iconOnly && styles.buttonIcon,
  disabled || loading ? styles.buttonDisabled : '',
  className,
)
```
Add `variant === 'floating' && styles.buttonFloating` to this list, and widen the `ButtonVariant` union (line 8) from `'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text'` to include `'floating'`. The new `.buttonFloating` CSS class reuses the exact `.closeButton` visual recipe shown above (per UI-SPEC: "kein neuer Farbwert, nur ein neuer Variant-Name für ein bereits existierendes Aussehen"), sized to `iconOnly` + minimum 44×44px (`--control-height-md`).

Usage sites in the new viewer (prev/next arrows, zoom toggle) follow the existing `Button` call shape already used in `FansubMediaLightbox.tsx` lines 96-104:
```typescript
<Button type="button" variant="ghost" aria-label="Vorheriges Bild" onClick={goToPrevious}>
  <ChevronLeft size={20} />
</Button>
```
→ change `variant="ghost"` to `variant="floating"` for the dark-stage context only (ghost remains correct for light backgrounds elsewhere in the app — this is an additive variant, not a replacement).

---

### `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` (rewrite target)

**Analog for the replacement data-fetch pattern:** `ReleaseGallery.tsx` — uses `getGroupReleaseImages` from `@/lib/api`, not a direct `fetch()`:
```typescript
// Source: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx:1-14
import { Badge, Button, Modal, SectionHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import { FansubMediaLightbox, type PublicImageLightboxItem } from '@/components/fansubs/FansubMediaLightbox'
import { getGroupReleaseImages } from '@/lib/api'
```
and the `toLightboxItem` mapping function (lines 41-52):
```typescript
function toLightboxItem(image: PublicReleaseImage): PublicImageLightboxItem {
  const categoryLabel = CATEGORY_LABELS[image.category]
  const title = image.title?.trim() || categoryLabel
  const description = image.caption?.trim()
  return {
    id: image.id,
    title,
    description: description && (image.title?.trim() || description !== categoryLabel) ? description : null,
    media_type: categoryLabel,
    original_url: image.original_url ?? image.thumbnail_url,
  }
}
```
This is the CLAUDE.md-compliant replacement for `ScreenshotGallery.tsx`'s own direct `fetch(resolvePublicApiUrl(...))` call (D-04 violation to remove) — confirmed by RESEARCH.md as "the migration target is `getGroupReleaseImages`, not a fix to the old endpoint."

**What to delete from `ScreenshotGallery.tsx` (exact line ranges per RESEARCH.md Research Focus 2):** own self-built lightbox block (lines 186-232: raw `<img>`/`<button>`, own `role="dialog"` backdrop), `lightboxOpen`/`activeIndex` state used only by that block, and the `handleKeyDown` (lines 99-129, excluding the `Home`/`End` cases which get ported to the shared viewer per D-23 — see the `MediaViewerStage` section above). Keep the `IntersectionObserver`/cursor-pagination grid loading logic (lines 24-89) unchanged except for repointing `fetchImages` to call `getGroupReleaseImages(animeID, groupID, releaseVersionID)` instead of the broken endpoint.

---

### `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx` (render-call swap)

**Analog:** itself — only lines 104-110 (the render call into `ProjectMemberMediaViewer`) change; the gallery grid/pagination/`openViewer`/`closeViewer`/focus-return logic (lines 51-67, 103, per RESEARCH.md) stays untouched. Swap the component import/render to the new shared viewer shell, mapping `ProjectMemberMediaItem` fields (`category`, `episode_label`, `release_version_label`, `caption`, `release_version_id`, `preview_url`) onto the widened `PublicImageLightboxItem` additive fields named above.

---

### `frontend/src/components/groups/GroupAssetsExperience.tsx` (surgical removal, keep video path)

**Analog:** itself — the video path (untouched reference for "what correct isolation already looks like" in this exact file):
```typescript
// KEEP UNCHANGED — video path, lines 103-106, 246-254
function openVideo(asset: GroupAssetMedia) {
  setPlayingAsset(toPlayableAsset(asset))
  setIsPlayerOpen(true)
}
// ...
<VideoPlayerModal
  key={playingAsset?.id ?? 'closed'}
  isOpen={isPlayerOpen}
  asset={playingAsset}
  onClose={() => { setIsPlayerOpen(false); setPlayingAsset(null) }}
/>
```
**Delete exactly:** `lightboxImages`/`activeImageIndex` state (lines 63-64), the image keyboard handler with clamp-not-wrap semantics (lines 73-96 — note the clamp pattern `Math.max(0, current - 1)` / `Math.min(length - 1, current + 1)` is the opposite of the Vorbild's wrap-around and must NOT be ported, it is being replaced by wrap-around per D-23/consolidation), `openGallery` (lines 98-101), the lightbox render block (lines 211-244, raw `<img>`/`<button>`/`role="dialog"`). Replace the `.imageGrid` button `onClick` (currently `onClick={() => openGallery(episode.images, index)}`, line 159) with a call into the shared viewer's open-trigger, passing `episode.images` + `index`.

**Note for the new metadata panel's graceful-omission test case:** `GroupAssetImage` (from `frontend/src/types/groupAsset.ts:11-18`) has only `id`, `title`, `image_url`, `thumbnail_url`, `width`, `height`, `order` — no `caption`/`category`/`episode_label`/`release_version_label`. This is the thinnest data shape among the 5 consumers and the primary test case for D-22's graceful-omission behavior.

---

### `backend/internal/repository/release_detail_public_repository.go` — `ListReleaseVersionImagesCursor` (D-24 fix)

**Analog (the already-correct sibling query in the same package):** `release_detail_public_repository_helpers.go`'s `imagesQuery()`, lines 406-421:
```sql
-- Source: backend/internal/repository/release_detail_public_repository_helpers.go:406-421 (CORRECT, has mf_display)
COALESCE(mf_thumb.path, '') AS thumbnail_path,
COALESCE(mf_orig.path, ma.file_path, '') AS original_path,
COALESCE(mf_display.path, mf_orig.path, ma.file_path, '') AS display_path,
uploader_author.name AS author_name
...
LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display' AND mf_display.status = 'ready'
```
and the corresponding Go scan side in `loadImages` (same file, lines 348-367):
```go
var (
  item          PublicReleaseImage
  thumbnailPath *string
  originalPath  *string
  displayPath   *string
)
if err := rows.Scan(&item.ID, &item.FansubGroupID, &item.Category, &item.Title, &item.Caption, &thumbnailPath, &originalPath, &displayPath, &item.AuthorName, &item.IsPreviewCandidate, &item.IsHighlight, &item.HighlightOrder); err != nil {
  return nil, fmt.Errorf("release detail: scan image row: %w", err)
}
// ...
if displayPath != nil {
  item.DisplayURL = publicMediaURLForPath(*displayPath, r.mediaStorageDir)
}
```

**Target to fix (the broken query), `release_detail_public_repository.go` lines 440-470 — currently missing the `mf_display` JOIN:**
```go
// CURRENT (buggy — no mf_display join, no display_path select)
query := fmt.Sprintf(`
	SELECT
		rvm.id, rvm.fansub_group_id, rvm.category, rvm.title, rvm.caption,
		COALESCE(mf_thumb.path, '') AS thumbnail_path,
		COALESCE(mf_orig.path, ma.file_path, '') AS original_path,
		rvm.sort_order, uploader_author.name AS author_name
		,rvm.is_preview_candidate
		,highlight.release_version_media_id IS NOT NULL AS is_highlight
		,highlight.highlight_order
	FROM release_version_media rvm
	LEFT JOIN release_version_media_highlights highlight ON highlight.release_version_media_id = rvm.id
	JOIN media_assets ma ON ma.id = rvm.media_asset_id
	LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
	LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
	JOIN visibilities v ON v.id = ma.visibility_id
	JOIN review_statuses rs ON rs.id = ma.review_status_id
	...
```
**Fix:** add `LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display' AND mf_display.status = 'ready'` after the `mf_orig` JOIN line, change `COALESCE(mf_orig.path, ma.file_path, '') AS original_path` row's neighbor SELECT to add `, COALESCE(mf_display.path, mf_orig.path, ma.file_path, '') AS display_path`, and update the Go `imageCursorRow` scan (lines 478-498) to add a `displayPath *string` scan target plus `row.image.DisplayURL = publicMediaURLForPath(*displayPath, r.mediaStorageDir)` conditional, mirroring `loadImages` verbatim.

---

### Visibility predicate pattern (D-19 shared cross-cutting concern) — any new/touched query

**Analog (best-practice, named-constant form):** `backend/internal/repository/project_member_visibility.go` lines 15-18:
```go
// projectMemberPublicMediaPredicate filtert release_version_media (rvm) + media_assets (ma) +
// visibilities (v) + review_statuses (rs) auf oeffentlich.
projectMemberPublicMediaPredicate = `rvm.deleted_at IS NULL AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'`
```
RESEARCH.md explicitly calls this out as "the best pattern of the three and worth citing as the Vorbild for how the unified viewer's any *new* queries should express the predicate (a shared constant, not copy-pasted SQL)." The `ListReleaseVersionImagesCursor` fix above should NOT touch its existing inline predicate (`v.name='public' AND rs.code='approved' AND ...`, already correct per Research Focus 5) — only add the display-variant JOIN. If any future consolidation introduces a new shared repository method across consumers, use this named-constant pattern, not inline string duplication.

## Shared Patterns

### Wrap-around navigation (keyboard + button, now also swipe + Home/End)
**Source:** `frontend/src/components/fansubs/FansubMediaLightbox.tsx:46-51`
**Apply to:** the new `mediaViewerNavigation.ts` pure-function module, consumed by the new shared viewer shell across all 5 consumer call sites.
```typescript
if (event.key === 'ArrowRight') {
  event.preventDefault()
  onNavigate((index + 1) % total)
} else if (event.key === 'ArrowLeft') {
  event.preventDefault()
  onNavigate((index - 1 + total) % total)
}
```

### Prefetch neighbor images
**Source:** `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx:12-17,59-63`
**Apply to:** the new `MediaViewerStage` component, parameterized on `original_url` instead of `preview_url`.

### Server-side visibility/review-state predicate (D-19 hard rule — never client-side-only)
**Source:** `backend/internal/repository/project_member_visibility.go:19` (named constant) / `release_detail_public_repository_helpers.go:422-424` (inline, equivalent predicate)
**Apply to:** any backend repository query the phase touches (only `ListReleaseVersionImagesCursor`'s D-24 fix touches backend SQL in this phase — it must preserve its existing predicate unchanged while adding only the display-variant JOIN). Does NOT apply to `GroupAssetsExperience`'s Jellyfin-sourced data path (D-20 explicit carve-out — no predicate exists or is required there).
```go
`rvm.deleted_at IS NULL AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'`
```

### Modal focus trap / Tab-cycling / Escape-to-close (already correct, do not reimplement)
**Source:** `frontend/src/components/ui/Modal.tsx:34-103` (`getFocusableElements` + `handleKeyDown`)
**Apply to:** all 4 consumers being migrated off their own hand-rolled `role="dialog"` backdrops (`ScreenshotGallery`, `ProjectMemberMediaViewer`, `GroupAssetsExperience`) — this is a net accessibility improvement per RESEARCH.md's "Don't Hand-Roll" table; the new viewer must ride on `Modal`'s existing trap/cycle/Escape/focus-return logic via the new `variant="stage"`, not reimplement it a fifth time.

### Pure-function test style (D-13, mandatory for all new viewer logic)
**Source:** `frontend/src/lib/fansub-summary.test.ts` (full file pattern: fixture builder + `describe`/`it`/`expect` on function return values, zero `render`/`fireEvent`)
**Apply to:** `mediaViewerNavigation.ts` and every other extracted pure-logic file (zoom toggle, swipe threshold, progressive-load URL selection) — see RESEARCH.md Pitfall 1 for the explicit list of functions that must exist as directly-callable units before they can be tested this way.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `Modal` `variant="stage"` dark-chrome-suppression behavior (CSS/structure, not the prop mechanism itself) | component (global primitive, new visual mode) | — | No existing `Modal` consumer in the codebase uses a chrome-suppressed/dark variant — Sketch 010 is the only design reference (read-only, not code); UI-SPEC's "Primitive-Erweiterungen" section is the closest thing to an analog and is already fully excerpted above. Build from the UI-SPEC's explicit prop-by-prop table, not from a codebase precedent. |
| Zoom click-toggle / swipe-threshold pure functions | utility | transform | No gesture/zoom code exists anywhere in the frontend (`react-easy-crop` is a crop-specific library, explicitly ruled out as a fit per RESEARCH.md Research Focus 4) — these are genuinely new logic, specified directly by UI-SPEC's interaction contract tables rather than adapted from an existing analog. |

## Metadata

**Analog search scope:** `frontend/src/components/fansubs/`, `frontend/src/components/ui/`, `frontend/src/components/groups/`, `frontend/src/app/episodes/[id]/components/ScreenshotGallery/`, `frontend/src/app/admin/episode-versions/`, `frontend/src/lib/` (test-style search), `backend/internal/repository/` (release_detail_public, project_member, fansub public profile).
**Files scanned:** `FansubMediaLightbox.tsx`+`.module.css`, `ProjectMemberMediaViewer.tsx`, `Modal.tsx`+`.module.css`, `Button.tsx`, `ui.module.css`, `ScreenshotGallery.tsx`, `GroupAssetsExperience.tsx`, `ReleaseGallery.tsx` (excerpt), `FansubGroupMediaBlock.tsx` (excerpt), `release_detail_public_repository.go`+`_helpers.go`, `project_member_visibility.go`, `fansub-summary.test.ts`, `projectMember.ts`, `groupAsset.ts`, `releaseDetail.ts` (types).
**Pattern extraction date:** 2026-10-09
