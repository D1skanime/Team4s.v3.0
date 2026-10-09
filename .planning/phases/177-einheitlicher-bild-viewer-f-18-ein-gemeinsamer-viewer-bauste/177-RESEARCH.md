# Phase 177: Einheitlicher Bild-Viewer (F-18) - Research

**Researched:** 2026-10-08
**Domain:** Next.js/React frontend consolidation — image lightbox/viewer unification across 6 call sites, Go/Postgres visibility enforcement
**Confidence:** HIGH (all claims below are sourced from direct code reads of the actual files in this repo, not from training-data assumptions about typical lightbox implementations)

## Summary

This phase replaces four independently-built image viewers with an extended version of the
existing `FansubMediaLightbox.tsx`. The investigation confirms the 175-INVENTORY.md classification
is accurate and surfaces four findings that materially change how this phase should be planned:

1. **The existing `Modal` primitive cannot satisfy Sketch 010's "dark stage, only X closes, no
   white margins" requirement without a new variant.** `Modal.tsx` always renders a light-gradient
   header (title+description) and a footer row with a default "Schließen" button — two close
   affordances, light chrome, and a CSS Grid that reserves header/footer rows. This is a hard
   architectural fork: either extend `Modal` with a new chrome-suppressing variant (consistent with
   D-11: build new primitives under `components/ui`, don't hand-roll locally) or confirm with the
   user that the new viewer intentionally diverges from `Modal`'s default chrome.
2. **`ScreenshotGallery.tsx`'s backend endpoint is not just a duplicate — it is permanently broken.**
   `EpisodeVersionImageRepository.GetByEpisodeVersionID` is a Phase-20 stub that unconditionally
   returns an error (`phase20ReleaseImportDeferred`). Every call to `/releases/:id/images` fails.
   `ScreenshotGallery.tsx`'s own `fetch()` call (the CLAUDE.md violation named in D-04) therefore
   never resolves successfully in current production. This substantially simplifies the migration:
   there is no working behavior to preserve on the data side, only the UI/UX shell — and the
   episode page already has the `animeId`/`groupId`/`releaseId` needed to call the one endpoint that
   *does* work (`getGroupReleaseImages`, the same one `ReleaseGallery.tsx` uses).
3. **Display→Original progressive-load infrastructure exists for 2 of 6 consumers but is
   inconsistently wired, including one real server-side gap in the Vorbild itself.** The `display`
   media-file variant (Phase 173) is correctly joined and returned for the SSR-initial `ReleaseGallery`
   load and for `FansubGroupMediaBlock`'s data, but the cursor-paginated "load more" path used by
   `ReleaseGallery.revealAll()` does *not* join the `display` variant — a pre-existing, independently
   discoverable gap, not something to silently fix as part of this phase's scope unless the user asks.
   `ProjectMemberMediaViewer` and `GroupAssetsExperience` do not use the display variant at all (see
   Research Focus 3 below for exact details per consumer).
4. **D-19's "server-side visibility filter" requirement does not map cleanly onto all 5 live
   consumers.** Two consumers (`ReleaseGallery`/`FansubMediaLightbox`, `ProjectMemberMediaViewer`) read
   from review-gated `release_version_media`/`media_assets` and are correctly filtered server-side
   today (`v.name='public' AND rs.code='approved' AND ma.status='ready' AND deleted_at IS NULL`).
   `FansubGroupMediaBlock` reads the equivalent `fansub_group_media` predicate, also correct.
   `GroupAssetsExperience`, however, sources its images entirely from a live Jellyfin folder scan —
   there is no `media_assets`/`visibility`/`review_status` row involved at all, so there is nothing
   to "filter" in the sense D-19 describes. This is a genuine open question for the user/planner, not
   a research gap: see Open Questions.

**Primary recommendation:** Extend `FansubMediaLightbox.tsx` + `FansubMediaLightbox.module.css` with
(a) a new `Modal` chrome variant (or a confirmed, deliberate departure from `Modal`), (b) a shared
`PublicImageLightboxItem`-superset type carrying the D-19 metadata fields, (c) click-to-toggle zoom
and touch-swipe as vanilla pointer/touch-event handlers (no new dependency), and (d) extracted,
render-free pure logic (navigation index math, zoom toggle state, prefetch trigger) so the D-13
test-style rule can be honored — because every existing test in this cluster (including the
Vorbild's own) uses `render()`+`fireEvent`, which D-13 now forbids for this phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Viewer UI shell (modal, nav arrows, zoom toggle, swipe, metadata overlay) | Browser/Client | Frontend Server (SSR passes initial props) | All interaction is client-side; `'use client'` component tree, no server round-trip per interaction |
| Image URL resolution (display vs. original, thumbnail fallback) | API/Backend | Browser/Client (progressive `<img>`/`next/image` swap) | URLs are server-computed (`publicMediaURLForPath`) with the display→original fallback baked into SQL; client only decides *when* to swap `src` |
| Visibility/review-state enforcement (D-19 hard rule) | Database/Storage (SQL predicate) | API/Backend (repository WHERE clause) | Must never be UI-only; the existing pattern is a `WHERE ... v.name='public' AND rs.code='approved'` predicate baked into every repository query — this is the correct enforcement point and must be reproduced, not re-invented, for any new/changed query path |
| Prefetch (next/prev image warm-up) | Browser/Client | — | Pure client-side `new Image().src = url` side effect, no backend involvement (see `ProjectMemberMediaViewer.tsx:12-17`) |
| Metadata overlay content (title/category/episode/release/caption) | API/Backend (DTO shape) | Browser/Client (render) | Each of the 4+ data sources already carries different subsets of these fields; the viewer's prop contract must normalize them, but the *source of truth* for each field is server-side |
| GroupAssetsExperience image listing | API/Backend (Jellyfin proxy, no DB) | — | Structurally outside the `media_assets` review/visibility model entirely — see Open Questions |

## Project Constraints (from CLAUDE.md)

- **450-line limit** per production file (D-15 reaffirms this explicitly for the new viewer — plan to
  split stage/overlay/zoom/swipe logic into sibling files from the start, not after the fact).
- **`@/components/ui` primitives mandatory**; native `<select>/<input>/<textarea>/<button>` forbidden
  for anything a primitive already covers. New viewer-specific controls (zoom toggle button, swipe
  indicator) must become new primitives under `components/ui` if no existing primitive fits (D-11).
- **Real German umlauts** (ä/ö/ü/ß) in all user-facing strings — applies to every overlay label,
  aria-label, and error message the viewer introduces (D-12).
- **Teststil-Regel, extended by D-13 for this phase specifically**: no render/click-simulation tests
  and no source-grep tests. This is a *stricter* bar than the Go-handler-focused wording in CLAUDE.md
  itself — D-13 explicitly extends it to the viewer's frontend logic ("Komponentenlogik" must be
  tested directly, not via simulated DOM events). See Common Pitfalls below: this directly
  contradicts the existing test pattern of all 3 viewers inspected in this research.
- **Live-UAT required** before UI acceptance (D-14) — plan a checkpoint, not just green CI.
- **One commit per change on `main`**, no `git stash` with open changes (D-16).
- **Jellyfin `.env` dependency** — `GroupAssetsExperience`'s data source depends on
  `JellyfinBaseURL`/`JellyfinAPIKey` being configured; if absent, `resolveGroupAssets` returns an
  empty payload silently (no error), so the migrated viewer must handle "zero images, no error"
  gracefully for this consumer specifically.
- **Brownfield/compatibility constraint**: `ReleaseGallery.tsx` and `FansubGroupMediaBlock.tsx` must
  keep working unmodified in their prop contracts wherever possible (D-07) — any `FansubMediaLightbox`
  API extension must be additive/optional, never a breaking change to the two existing call sites.

<phase_requirements>
## Phase Requirements

No `REQUIREMENTS.md` mapping exists for this phase (confirmed: phase description says "Phase
requirement IDs: None"). Decision coverage is tracked via D-01..D-19 in `177-CONTEXT.md` instead.
The table below maps each locked decision to the research that supports its execution.

| Decision | Description | Research Support |
|----------|-------------|-------------------|
| D-01 | `FansubMediaLightbox.tsx` is the basis | Full current source read below (Research Focus 1) |
| D-02 | Port Prefetch + metadata sidebar from `ProjectMemberMediaViewer` before deletion | Exact prefetch/sidebar code identified (Research Focus 2) |
| D-03 | Add zoom, swipe, progressive-load, overlay, prefetch | Zoom/swipe approach recommended (Research Focus 4); progressive-load infra mapped (Research Focus 3) |
| D-04 | `ScreenshotGallery.tsx` fully migrated, `fetch()` violation fixed | Confirmed backend endpoint is permanently broken — migration target is `getGroupReleaseImages`, not a fix to the old endpoint |
| D-05 | Only `GroupAssetsExperience`'s image lightbox migrates; `VideoPlayerModal` untouched | Exact split point identified (Research Focus 2) |
| D-06 | `ReleaseVersionMediaDetailPanel.tsx` deleted immediately, 0 importers | Confirmed via grep — zero importers outside its own file |
| D-07 | `ReleaseGallery`/`FansubGroupMediaBlock` stay unchanged, benefit automatically | Both consumers' exact prop shapes documented (Research Focus 1) |
| D-19 | Metadata overlay fields + hard server-side visibility rule | Visibility predicates documented per consumer (Research Focus 5); one consumer (`GroupAssetsExperience`) has no such predicate at all — flagged as Open Question |

</phase_requirements>

## Research Focus 1 — `FansubMediaLightbox.tsx`: current API and consumers

**File:** `frontend/src/components/fansubs/FansubMediaLightbox.tsx` (109 lines) +
`FansubMediaLightbox.module.css` + `FansubMediaLightbox.test.tsx`.

### Current props/interface

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

The component is **fully controlled** — it owns no index state itself. `index`/`onNavigate` are
lifted to the parent; `isOpen = index !== null && index >= 0 && index < total`.

### Internal state and behavior

- No internal React state at all (purely derived from props). One `useEffect` registers a
  `window`-level `keydown` listener only while `isOpen`.
- **Wrap-around navigation**: `(index + 1) % total` / `(index - 1 + total) % total` — both via
  keyboard (`ArrowLeft`/`ArrowRight`, `event.preventDefault()`) and via the two `Button` nav
  controls at the bottom of the panel.
- Renders exactly one image: `resolveApiUrl(currentItem.original_url)` through `next/image` with
  `fill` + `unoptimized` inside a `.imageFrame` that is **hard-pinned to `aspect-ratio: 16/9`** with
  `object-fit: contain` — this means any non-16:9 image is letterboxed against the
  `var(--bg-hover)` background, which directly conflicts with Sketch 010's "Bild maximal ohne weiße
  Ränder" requirement. This aspect-ratio constraint must be removed/reworked, not just extended.
- Title falls back `title → caption → media_type`; only `description` (not `caption`) is shown as
  body text beneath the image.
- Wrapped in `@/components/ui`'s `Modal` with `size="lg"` — inherits Modal's light-gradient header
  (showing `title` + nothing else, since no `description` prop is passed to `Modal` itself — the
  lightbox's own `description` field is rendered separately inside `modalBody`) and Modal's default
  footer with its own "Schließen" button, **in addition to** Modal's header close-X. This is the
  structural conflict flagged in the Summary — two close affordances, light chrome, non-full-bleed.

### Consumer 1 — `ReleaseGallery.tsx` (exact call shape)

```typescript
// ReleaseGallery.tsx:202-207
<FansubMediaLightbox
  media={lightboxItems}          // PublicImageLightboxItem[], built via toLightboxItem()
  index={activeIndex !== null && activeIndex >= 0 ? activeIndex : null}
  onClose={() => setActiveImageID(null)}
  onNavigate={(index) => setActiveImageID(lightboxItems[index]?.id ?? null)}
/>
```

`toLightboxItem` (lines 41-52) maps `PublicReleaseImage` → `PublicImageLightboxItem`:
`title = image.title?.trim() || categoryLabel`, `description` is only populated when there is a
"real" caption independent from the category label fallback, `media_type = categoryLabel`,
`original_url = image.original_url ?? image.thumbnail_url`. **Note**: `toLightboxItem` never passes
`display_url` even though `PublicReleaseImage` carries it — the lightbox's current
`original_url`-only prop contract has no slot for it. This is the exact seam the D-19/progressive-load
extension must widen without breaking this call site (D-07's "no change needed" constraint only
holds if the extension is additive).

Index management uses **stable IDs, not raw array indices** (`activeImageID`, resolved to an index
via `findIndex`) — a defensive pattern against list reordering that the new viewer's `onNavigate`
contract should preserve or explicitly document as changed.

### Consumer 2 — `FansubGroupMediaBlock.tsx` (exact call shape)

```typescript
// FansubGroupMediaBlock.tsx:161-166
<FansubMediaLightbox
  media={media}                  // PublicFansubMediaItem[] passed directly, untransformed
  index={activeIndex}
  onClose={() => setActiveIndex(null)}
  onNavigate={setActiveIndex}
/>
```

No mapping function — `PublicFansubMediaItem` is passed as-is and relies on TypeScript structural
typing being a superset of `PublicImageLightboxItem` (it has `id`, `title`, `caption`,
`description`, `media_type`, `original_url`, **plus** `thumbnail_url` and `display_url` that the
lightbox currently ignores). Index here is a **raw array index into the full `media` prop**, not an
ID-based lookup like Consumer 1 — the two consumers use different index semantics today, which the
unified viewer must reconcile explicitly (recommend: keep ID-based resolution as the shared pattern,
since it is more robust against array mutation during pagination).

### What must change to support the new features without breaking these two consumers

1. Widen `PublicImageLightboxItem` additively: add optional `display_url`, `thumbnail_url`,
   `category`/`episode_label`/`release_version_label` (all optional, D-19 metadata fields) — existing
   callers that don't pass them keep compiling and rendering identically.
2. Replace the hard `aspect-ratio: 16/9` frame with a flexible "stage" layout (max-height constrained,
   natural aspect ratio, dark background) — this is a CSS-only change, no prop-contract break.
3. Introduce progressive load: component picks `display_url ?? original_url` as the initial `src`,
   then swaps to `original_url` once it has loaded (new internal `useState`/`useEffect`, no new
   required props — `original_url` already exists, `display_url` is additive-optional).
4. Add zoom-toggle and swipe as new internal state + pointer/touch handlers — zero prop changes.
5. Add prefetch of neighbor images — zero prop changes (pure side effect keyed on `index`/`media`).
6. Resolve the `Modal` chrome conflict (see Summary finding 1) — this is the one change that is *not*
   purely additive and needs an explicit decision in planning.

## Research Focus 2 — The four viewers being replaced

### `ScreenshotGallery.tsx` (#3)

**File:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` (236
lines), consumed by `frontend/src/app/episodes/[id]/page.tsx:205`
(`<ScreenshotGallery releaseId={activeReleaseID} />`, only rendered when `activeReleaseID !== null`).

- **Data fetch**: direct `fetch(resolvePublicApiUrl('/api/v1/releases/${releaseId}/images?...'))` —
  confirmed CLAUDE.md violation (bypasses `lib/api.ts`). **Backend-confirmed-broken**: the handler
  (`ListReleaseImages` → `EpisodeVersionImageRepository.GetByEpisodeVersionID`) is a Phase-20 stub
  that always returns `fmt.Errorf("... is deferred until Phase 20 release-native import writes are
  implemented")`. Every request to this endpoint fails with a 500. There is no live data path to
  preserve here — this component's gallery grid has effectively never worked against real data in
  this architecture generation.
- **Replacement data source**: `frontend/src/app/episodes/[id]/page.tsx` already resolves
  `sourceAnimeID`/`sourceGroupID`/`activeReleaseID` from `searchParams` (`animeId`, `groupId`,
  `releaseId` query params) and has a `hasGroupReleaseContext` boolean gate. The correct migration
  target is the *working* endpoint `getGroupReleaseImages(animeID, groupID, releaseVersionID)` (same
  one `ReleaseGallery.tsx` already uses) — not a fix to the broken `GetByEpisodeVersionID` stub.
  When `hasGroupReleaseContext` is false (no `animeId`/`groupId` in the URL), there is no valid
  replacement call — the planner must decide the graceful-degradation behavior (likely: don't render
  the gallery section at all, same as today's empty-state branch at line 148-150).
- **Own self-built lightbox** (lines 186-232): raw `<img>`/`<button>` (UI-system violation, D-04
  names this explicitly), own `role="dialog"` backdrop, own `ChevronLeft/ChevronRight/X` icon buttons
  wired to local `activeIndex` state, **no wrap-around** (`navigatePrevious`/`navigateNext` clamp at
  0/length-1 via `disabled` on the nav buttons, unlike the Vorbild's modulo wrap-around), and extra
  `Home`/`End` keyboard handlers (jump to first/last) that neither the Vorbild nor any other consumer
  has — D-02/D-03 do not call for porting `Home`/`End` into the shared baseline; flag as a feature
  loss unless the planner decides to add it to the shared baseline too (cheap to add, consistent with
  "no regression" spirit even though not explicitly in-scope per D-02).
- **Removal boundary**: delete the entire self-built lightbox block (lines 186-232) plus the
  `lightboxOpen`/`activeIndex` state and the `Home`/`End`/`Escape`/arrow `handleKeyDown`
  (lines 99-129); replace with the shared viewer. The infinite-scroll grid (`IntersectionObserver`,
  cursor pagination) above it is a separate concern (data loading, not viewing) and is out of this
  phase's `D-04` scope except insofar as the data source itself must change to the working endpoint.

### `ProjectMemberMediaViewer.tsx` (#4) — richest in the cluster, must be preserved per D-02

**Files:** `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx` (129 lines),
consumed by `ProjectMemberMediaGallery.tsx:104-110`. Data type: `ProjectMemberMediaItem`
(`frontend/src/types/projectMember.ts:35-47`): `id, media_asset_id, category, title?, caption,
episode_label, release_version_label, release_version_id, created_at, thumbnail_url, preview_url`.

**Exactly what to port (D-02):**

1. **Prefetch** (lines 12-17, 59-63):
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
   This is a trivial, dependency-free browser-cache-warm pattern — no library involved, directly
   portable as-is (parameterize the URL field once the unified prop type is settled).

2. **Metadata sidebar** (lines 102-112): `<aside>` showing, in order: optional `title` as `<h3>`,
   category label (`CATEGORY_LABELS[item.category]`, falling back to the raw value), `Folge
   {episode_label} · {release_version_label}`, optional `caption`, and a "Release öffnen →" link to
   `${projectPath}/releases/${item.release_version_id}`. **This is precisely the field set D-19 later
   mandates for the overlay** (title, category, episode_label, release_version_label, caption) — this
   component is the structural template for D-19's requirement, not just a feature to port
   incidentally.

**Other behavior notable but not called out by D-02 (evaluate during planning):**
- Desktop: image + sidebar side-by-side (`.viewerMain`); no CSS confirmed for mobile stacking beyond
  the module class names implying a responsive layout — actual breakpoint behavior lives in
  `ProjectMemberMediaGallery.module.css` (not read in depth here; low risk, verify visually in UAT).
  No `Modal` primitive used — fully hand-rolled `role="dialog"` backdrop + own close button, own
  focus-on-open (`dialogRef.current?.focus()`), no documented focus-trap/Tab-cycling (unlike
  `Modal.tsx`, which implements a real focus trap) — this is a **capability `Modal` already has that
  this component lacks**; migrating onto the shared viewer (built on `Modal` or its extended variant)
  is a net accessibility improvement, not a regression risk.
- Image source for the main stage is `preview_url`, **not** `display_url`/`original_url` — see
  Research Focus 3 for what `preview_url` actually resolves to server-side (it is the `original`
  media-file variant, not the `display` variant, despite its name).

**Removal boundary:** delete `ProjectMemberMediaViewer.tsx` entirely, delete
`ProjectMemberMediaViewer.test.tsx`, update `ProjectMemberMediaGallery.tsx:104-110`'s render call to
the shared viewer, keep `ProjectMemberMediaGallery.tsx`'s own grid/pagination/`openViewer`/
`closeViewer`/focus-return logic (lines 51-67, 103) unchanged — that logic is gallery-grid concern,
not viewer concern, and already correctly scoped outside the component being replaced.

### `GroupAssetsExperience.tsx` (#5) — isolate image lightbox from video path

**File:** `frontend/src/components/groups/GroupAssetsExperience.tsx` (257 lines). Two entirely
separate concerns coexist in one component:

1. **Image lightbox (in scope, D-05)**: state `lightboxImages: GroupAssetImage[]`,
   `activeImageIndex`; `openGallery(images, index)` triggered from per-episode `.imageGrid` thumbnail
   buttons (lines 154-165); render block at lines 211-244 — raw `<img>`/`<button>`, own `role="dialog"`
   backdrop, keyboard handler with **clamping, not wrap-around** (`Math.max(0, current - 1)` /
   `Math.min(length - 1, current + 1)`, lines 84-90 — a third, different navigation-boundary behavior
   compared to both the Vorbild's wrap-around and `ScreenshotGallery`'s clamp-via-disabled-button).
   Data type `GroupAssetImage` (`frontend/src/types/groupAsset.ts:11-19`): `id: string, title: string,
   image_url: string, thumbnail_url: string, width?, height?, order` — **no `caption`, no `category`,
   no `episode_label`/`release_version_label`** at all. This is the thinnest data shape of all 6
   consumers; D-19's full metadata overlay (category/episode/release/caption) cannot be populated
   for this consumer without either (a) enriching the Jellyfin-asset data model, which is out of
   scope, or (b) rendering a partial overlay (title only) for this specific consumer. Flag as an
   Open Question for planning.
2. **Video path (`VideoPlayerModal`, out of scope per D-05/D-18)**: `playingAsset`/`isPlayerOpen`
   state, `openVideo(asset)`, `toPlayableAsset()` converter, and the `<VideoPlayerModal>` render at
   the bottom (lines 246-254) — structurally and visually fully separate from the image lightbox
   (different state variables, different trigger buttons in `.mediaGrid` vs `.imageGrid`, different
   modal component). **Confirmed clean isolation**: nothing in the video path reads or writes
   `lightboxImages`/`activeImageIndex`, and nothing in the image path touches `playingAsset`. The
   split is a pure deletion of lines 63-64 (image state), 73-96 (image keyboard handler), 98-101
   (`openGallery`), 154-165 (thumbnail buttons → replace with shared-viewer trigger), and 211-244
   (lightbox render) — everything else in the file (video state, `openVideo`, `VideoPlayerModal`
   render, episode/asset grid scaffolding) is untouched.

**Removal boundary:** remove exactly the 5 code regions listed above; replace the `.imageGrid` button
`onClick` with a call into the shared viewer (passing `episode.images` + index); the file will shrink
well under its current 257 lines, comfortably inside the 450-line cap even after any shared-viewer
wiring overhead.

### `ReleaseVersionMediaDetailPanel.tsx` (#7) — confirmed dead code

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`
(172 lines). `grep -rn "ReleaseVersionMediaDetailPanel" frontend/src` returns **zero** matches outside
its own file — confirmed 0 importers. This is an editing form (caption textarea, preview-toggle
checkbox, delete button), not a navigation viewer at all — it does not even belong in this phase's
*functional* scope beyond deletion. **Safe to delete independently and immediately**, with no
dependency on the rest of the phase's sequencing (D-06 is correct as written).

## Research Focus 3 — Display/Original progressive-load infrastructure (Phase 173)

The `media_files` table has a `variant` column with (at minimum) three confirmed values used
consistently across the codebase: `'thumb'`, `'original'`, `'display'`. Each repository that serves
public images independently LEFT JOINs all three and computes a fallback chain. The naming
convention is stable: a Go struct field `DisplayURL *string json:"display_url,omitempty"` paired
with `OriginalURL`/`ThumbnailURL`, and a SQL `COALESCE(mf_display.path, mf_orig.path, ...)` pattern.

| Consumer | Data source | Display variant joined? | Fallback chain used |
|---|---|---|---|
| `ReleaseGallery` initial SSR load | `ReleaseDetailPublicRepository.loadImages` (`release_detail_public_repository_helpers.go:340-373`, query at `:399-424`) | **Yes** — `mf_display` LEFT JOIN, `COALESCE(mf_display.path, mf_orig.path, ma.file_path, '')` | `display_url` populated correctly |
| `ReleaseGallery.revealAll()` "load more" | `ReleaseDetailPublicRepository.ListReleaseVersionImagesCursor` (`release_detail_public_repository.go:408-519`) | **No** — query at lines 440-467 only selects `thumbnail_path`/`original_path`, no `mf_display` join at all; `PublicReleaseImage.DisplayURL` is left `nil` for every page-2+ item | Falls back silently to `thumbnail_url`/`original_url` in the frontend's `display_url ?? thumbnail_url ?? original_url` chain — **pre-existing gap, confirmed via direct SQL read, not something to silently patch without flagging it** |
| `FansubGroupMediaBlock` | `FansubRepository.listPublicFansubMedia` (`fansub_repository_public_profile.go:313-342`) | **Yes** — `mf_display` LEFT JOIN, `COALESCE(mf_display.path, mf_orig.path, mf_thumb.path, ma.file_path)` | `display_url` always populated |
| `ProjectMemberMediaViewer` | `ProjectMemberPublicRepository.ListMedia` (`project_member_public_repository.go:315-367`) | **No** — only `mf_thumb`/`mf_orig` are joined (line 338-339); the JSON field is named `preview_url` but is populated from `OriginalFilePath`, i.e. it is the **original**, not a display-sized variant, despite the misleading name | No display variant exists for this consumer at all today |
| `GroupAssetsExperience` | Jellyfin folder scan (`group_assets_jellyfin.go`), not `media_assets` | **N/A** — images are raw Jellyfin item image URLs, no `media_files`/variant concept applies | No display/original distinction possible without a data-model change |

**Implication for planning:** "reuse the existing Display→Original infrastructure" is accurate for 2
of 5 live image consumers (`ReleaseGallery`'s initial load, `FansubGroupMediaBlock`). For
`ProjectMemberMediaViewer`, reusing it means **adding** a `mf_display` JOIN to
`ProjectMemberPublicRepository.ListMedia` (a small, scoped backend change, not just a frontend prop
wire-up) if the new viewer is to progressive-load for this consumer too. For `GroupAssetsExperience`
there is no backend concept to plug into at all — progressive load for this consumer would need
either a frontend-only trick (e.g., load a reduced-size Jellyfin `Primary` image tag first, if one
exists, then the full image) or simply skip progressive-load for this one consumer. For
`ReleaseGallery`'s own `revealAll()` gap, recommend surfacing it as an explicit, separately-labeled
fix candidate during planning (one-line SQL join addition) rather than leaving the inconsistency
unaddressed or fixing it silently without the user knowing it existed.

## Research Focus 4 — Zoom/swipe without a new dependency

**Survey of `frontend/package.json` dependencies relevant to gestures/zoom:** no `use-gesture`,
`react-zoom-pan-pinch`, `hammerjs`, `react-spring`, or `framer-motion`. The one gesture-adjacent
dependency present is **`react-easy-crop`** (used only in
`frontend/src/components/media/crop/Team4sCropper.tsx` for avatar/cover cropping) — it implements
its own internal pointer-drag + pinch-to-crop logic but is designed around producing a fixed-aspect
crop output, not a free pan/zoom *viewing* experience, and pulling it into the viewer for a
fundamentally different interaction would be a misuse of a crop-specific library, not a good fit.

**Critical simplification from reading Sketch 010's actual wording**: the design is **"Klick aufs
Bild = 100-%-Zoom"** — a binary click-to-toggle between fit-to-stage and 100%-native-size, not
continuous pinch-zoom-and-pan. Swipe is described as navigation ("Pfeile/Tastatur/Wischen" — arrows/
keyboard/swipe are three equivalent ways to do the *same* thing: move to next/previous image), not
image-panning. This means:

- **Zoom**: a CSS `transform: scale(...)` toggle (or swap between `object-fit: contain` sized-to-stage
  and natural `width`/`height` with `overflow: auto` to allow scrolling around the now-larger image)
  driven by a simple boolean/`useState` toggled `onClick` on the image. Zero new dependency.
- **Swipe**: native `onTouchStart`/`onTouchMove`/`onTouchEnd` handlers computing horizontal delta
  against a threshold (a common ~40-50px pattern), calling the existing `onNavigate` with the same
  wrap-around index math already in the Vorbild. Zero new dependency, ~20-30 lines of code.

**Recommendation:** implement both with vanilla Pointer/Touch events + CSS, consistent with the "no
unnecessary dependencies" posture implied by the existing stack (the only gesture library present,
`react-easy-crop`, solves a different problem and should not be repurposed). This keeps the new
primitive(s) small enough to stay well within the 450-line budget per file (D-15) and avoids a new
`package.json` entry that would need its own legitimacy audit (see below — moot, since no new
package is being recommended).

## Package Legitimacy Audit

No new external packages are recommended for this phase. Zoom and swipe are implemented with native
browser APIs (Pointer/Touch events, CSS transforms) as justified in Research Focus 4. The
slopcheck/registry-verification protocol is therefore not applicable — there is nothing to audit.

**Packages removed due to slopcheck `[SLOP]` verdict:** none (no packages proposed).
**Packages flagged as suspicious `[SUS]`:** none (no packages proposed).

## Research Focus 5 — Server-side visibility filter for internal media (D-19)

**Confirmed visibility model:** `media_assets` carries `visibility_id` (FK → `visibilities.name`,
values include `'public'`) and `review_status_id` (FK → `review_statuses.code`, values include
`'approved'`) plus a `status` column (`'ready'` gates upload-pipeline completion, not editorial
visibility) and a `deleted_at` soft-delete column on the *relation* tables
(`release_version_media.deleted_at`, `fansub_group_media.deleted_at` — the relation row, not the
asset row, carries the soft-delete).

| Consumer | Predicate location | Exact predicate | Enforcement point |
|---|---|---|---|
| `ReleaseGallery` (initial load) | `release_detail_public_repository_helpers.go:422-424` (via `imagesQuery()`, shared with `countImages`) | `rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'` | **Correct, server-side (SQL WHERE), repository layer** |
| `ReleaseGallery` ("load more" cursor) | `release_detail_public_repository.go:461-466` | same predicate shape, independently repeated (not shared helper) | **Correct, server-side** — but duplicated, not centralized (a DRY opportunity, not a correctness bug) |
| `FansubGroupMediaBlock` | `fansub_repository_public_profile.go:334-338` | `fgm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'` | **Correct, server-side** |
| `ProjectMemberMediaViewer` | `project_member_visibility.go:19` (`projectMemberPublicMediaPredicate` constant, reused by `countMedia`, `countEpisodes`, `ListMedia`) | `rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'` | **Correct, server-side, and centralized as a named Go constant** — this is the best pattern of the three and worth citing as the Vorbild for how the unified viewer's any *new* queries should express the predicate (a shared constant, not copy-pasted SQL) |
| `GroupAssetsExperience` | **none** — `group_assets_jellyfin.go`'s `resolveGroupAssets`/`buildGroupEpisodeAssets` never touches `media_assets`, `visibilities`, or `review_statuses` at all | N/A | **No predicate exists because there is no reviewable row to gate** — see Open Questions |

**No pre-existing leak found.** All four database-backed consumers checked
(`ReleaseGallery` ×2 query paths, `FansubGroupMediaBlock`, `ProjectMemberMediaViewer`) enforce the
visibility/review-state gate server-side, consistently, with the same three-part predicate
(`v.name='public' AND rs.code='approved' AND <relation>.deleted_at IS NULL`, plus `ma.status='ready'`
for the upload-pipeline-completion dimension). This matches 175-INVENTORY.md's statement that
Permission-Matrix rows 2.1-2.6 are already consistent — confirmed independently here by reading the
actual SQL, not just trusting the prior audit's summary.

**D-19 compliance for the new/extended viewer**: any new query the unified viewer's data layer
introduces (e.g., if `ProjectMemberPublicRepository.ListMedia` gains a `display` variant join per
Research Focus 3) must keep using the existing `projectMemberPublicMediaPredicate` constant
unchanged — do not relax or bypass it. If a *new* shared/consolidated repository method is created
to serve multiple consumers from one query (tempting, given how similar the five predicates are),
that new method must still apply the correct per-table predicate for whichever table it reads, and
this consolidation is **not required by D-19** — D-19 only requires the enforcement point to be
server-side, which it already is in all four cases. A logic test per D-19/D-13 should assert that a
non-`'public'`/non-`'approved'`/soft-deleted row is excluded from each consumer's query result — this
can be written as a repository-level test using a fake/real test DB fixture (not a render/click test),
consistent with D-13.

## Research Focus 6 — Sketch 010 design intent (read-only input)

`.planning/sketches/010-galerie-detailansicht/README.md` (not modified, not committed, belongs to the
user per D-09): the sketch's `question` field asks "Wie unterscheidet sich die Galerie-Detailansicht
klar von der Karte und zeigt Bild + Text besser?" (`winner: null` — no variant has been chosen yet by
the user). The documented design intent:

- **Card (preview)**: display-variant image + truncated text (3 lines normal / 5 lines for
  highlighted items) + "Mehr lesen" ("read more") affordance.
- **Detail (stage)**: dark background, image sized to fill without white margins (contradicts the
  Vorbild's current hard `16:9` letterboxed frame — confirmed above), **display image shown
  immediately, original loaded in the background and swapped in once ready** (the literal
  progressive-load behavior D-03 asks for), full (non-truncated) text with line breaks preserved,
  category + uploader shown, navigation via arrows/keyboard/swipe, **only the X button closes** (no
  secondary close button — directly conflicts with `Modal`'s default footer-close-button behavior,
  confirming the Research Focus 1 finding independently from the sketch side), and **clicking the
  image toggles 100% zoom**.
- Two layout variants exist in the sketch (A: info panel to the right, B: info panel below) with a
  desktop/mobile toggle in the sketch tool itself — **no winner has been picked**, so this is a live
  open design decision, not a settled one, despite being visually prototyped.

**Scope boundary (explicit in 177-CONTEXT.md, reconfirmed by reading the sketch directly)**: this
sketch covers **only the public release gallery** (`ReleaseGallery`/`FansubMediaLightbox`'s existing
domain). It says nothing about how the metadata overlay, zoom, or progressive-load should look/behave
for the episode-screenshot context, the group-assets context, or the project-member-profile context —
those four remaining consumers need their own UX judgment calls during planning, informed by this
sketch's visual direction but not dictated by it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap / Tab-cycling / Escape-to-close | A new hand-rolled `role="dialog"` backdrop (as `ProjectMemberMediaViewer`, `ScreenshotGallery`, and `GroupAssetsExperience` each independently did) | `@/components/ui`'s `Modal`, extended with a new chrome variant | `Modal.tsx` already implements correct `getFocusableElements`/Tab-cycling/focus-return/Escape — re-implementing this a fourth time would be the exact duplication this phase exists to remove |
| Pinch-zoom-and-pan image viewer | A custom gesture-recognition library integration | A binary click-to-toggle `scale()` CSS transform, per the sketch's actual (non-continuous) zoom requirement | Sketch 010 asks for toggle-to-100%, not continuous pinch/pan — building the latter would be solving a harder problem than requested |
| Swipe-to-navigate | A touch gesture library | Native `touchstart`/`touchmove`/`touchend` delta-threshold handler, mirroring the existing keyboard handler's index math | ~20-30 lines, zero new dependency, consistent with "no unnecessary dependencies" |
| Visibility/review-state filtering | A new client-side `media.filter(item => item.visibility === 'public')` safety net | The existing server-side SQL predicate pattern (`v.name='public' AND rs.code='approved' AND ... deleted_at IS NULL`), reused verbatim per table | D-19 explicitly forbids client-side-only filtering; the server-side pattern already exists and is correct in 4/5 consumers — don't invent a second, weaker enforcement layer |

**Key insight:** every one of the four viewers being replaced independently re-solved "modal focus
trap" and "keyboard navigation with boundary handling" slightly differently (wrap-around vs. clamp vs.
disabled-button-clamp) — this phase's entire purpose is collapsing that duplication, so the planner
should resist the temptation to let the *new* shared component re-introduce a fifth bespoke variant
of any of these solved problems.

## Common Pitfalls

### Pitfall 1: D-13's test-style rule contradicts 100% of existing precedent in this exact domain
**What goes wrong:** Every test file inspected for this cluster
(`FansubMediaLightbox.test.tsx`, `ProjectMemberMediaViewer.test.tsx`) uses
`render()` + `fireEvent.keyDown`/`fireEvent.click` — exactly the pattern D-13 now forbids
("keine Render-/Klick-Simulationstests") for this phase's new/changed tests.
**Why it happens:** D-13 is a phase-local tightening of the Teststil-Regel (explicitly extending a
rule that CLAUDE.md itself frames around Go handlers) to frontend component logic, and the Vorbild's
own existing test was written before this tightening.
**How to avoid:** Extract all logic that the old tests exercised via simulated events into plain,
directly-callable functions/hooks with no rendering involved: e.g. `wrapIndex(current, total, delta)`,
a `zoomToggleReducer`, a `computeSwipeNavigation(deltaX, threshold)` pure function, and a
`isPublicVisible(item)` predicate (mirroring the SQL predicate, for any client-side display logic
that needs to reason about it). Test these directly with plain function calls and `expect(...)`
assertions — no `render`, no `fireEvent`. The existing `FansubMediaLightbox.test.tsx` and
`ProjectMemberMediaViewer.test.tsx` will likely need to be rewritten from scratch as part of this
phase, not merely extended.
**Warning signs:** Any new test file for the viewer that imports `render`/`fireEvent`/`screen` from
`@testing-library/react` for the viewer's *own* interactive logic (as opposed to a different,
explicitly-permitted use) should be treated as a red flag against D-13 during review.

### Pitfall 2: Treating "ScreenshotGallery's data layer" as something to preserve
**What goes wrong:** Assuming the migration must carefully preserve `ScreenshotGallery`'s existing
fetch/pagination behavior because "it's existing functionality."
**Why it happens:** On the surface it looks like a working infinite-scroll image grid.
**How to avoid:** The backend endpoint it calls (`GetByEpisodeVersionID`) unconditionally errors —
confirmed by reading the stub implementation directly. There is no live behavior to preserve on the
data side. Point the migrated component at `getGroupReleaseImages` instead (requires
`animeId`/`groupId` to be present in the page's query params — already the case in the main flow via
`hasGroupReleaseContext`).
**Warning signs:** If a plan task says "preserve ScreenshotGallery's existing cursor-pagination
behavior," verify first whether that's about the (broken) data-fetch or the (reusable) UI
infinite-scroll pattern — conflating the two risks wasting effort preserving something that never
worked.

### Pitfall 3: Assuming `Modal` can host the new viewer without changes
**What goes wrong:** Planning the new viewer as "`FansubMediaLightbox` but with more features,
still wrapped in the existing `Modal`" without budgeting for a `Modal` extension.
**Why it happens:** `Modal` is the correct, mandated primitive (D-11) and the Vorbild already uses it
— it's natural to assume it "just works" for the extended feature set.
**How to avoid:** Budget an explicit `Modal` variant/prop (e.g., a chrome-suppressing mode) as part of
this phase's scope, since Sketch 010's "dark stage, only X closes" requirement is structurally
incompatible with `Modal`'s current default light header + footer-close-button layout.
**Warning signs:** If the plan has no task touching `Modal.tsx`/`Modal.module.css`, re-check whether
the dark-stage requirement from Sketch 010 was dropped or whether `Modal` truly got extended.

### Pitfall 4: Applying D-19's visibility rule uniformly to `GroupAssetsExperience` without flagging the data-model mismatch
**What goes wrong:** Writing a plan task that says "add the server-side visibility filter to
`GroupAssetsExperience`'s image query" as if it were a one-line SQL predicate addition like the other
four consumers.
**Why it happens:** D-19's wording ("Medien mit interner/nicht-öffentlicher Sichtbarkeit dürfen
niemals im öffentlichen Viewer erscheinen") reads as a uniform requirement across all consumers.
**How to avoid:** Recognize that `GroupAssetsExperience`'s images come from a live Jellyfin folder
scan with no `media_assets`/`visibility`/`review_status` row at all — there is nothing in today's
data model to filter on. This must go back to the user/planner as an explicit question (see Open
Questions), not be silently implemented as a no-op or silently skipped.

## Code Examples

### Existing wrap-around navigation (Vorbild pattern to reuse, not reinvent)
```typescript
// Source: frontend/src/components/fansubs/FansubMediaLightbox.tsx:46-51
if (event.key === 'ArrowRight') {
  event.preventDefault()
  onNavigate((index + 1) % total)
} else if (event.key === 'ArrowLeft') {
  event.preventDefault()
  onNavigate((index - 1 + total) % total)
}
```

### Existing prefetch pattern (port verbatim per D-02)
```typescript
// Source: frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx:12-17,59-63
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

### Existing server-side visibility predicate (reuse pattern for any new query)
```go
// Source: backend/internal/repository/project_member_visibility.go:19 (best-practice: named constant)
projectMemberPublicMediaPredicate = `rvm.deleted_at IS NULL AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'`
```

### Existing display→original fallback SQL (reuse pattern if adding display-variant support to a consumer that lacks it)
```sql
-- Source: backend/internal/repository/release_detail_public_repository_helpers.go:406-418
LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
LEFT JOIN media_files mf_display ON mf_display.media_id = ma.id AND mf_display.variant = 'display' AND mf_display.status = 'ready'
-- SELECT: COALESCE(mf_display.path, mf_orig.path, ma.file_path, '') AS display_path
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| 4 independent hand-rolled lightbox implementations with inconsistent boundary behavior (wrap-around vs. clamp) | One shared viewer built on an extended `FansubMediaLightbox`/`Modal` | This phase | Consistent UX, one place to fix bugs/add features |
| `ScreenshotGallery.tsx` fetching via a permanently-broken Phase-20-deferred endpoint | Fetching via the working `getGroupReleaseImages` endpoint already used by `ReleaseGallery` | This phase (D-04) | Screenshots section becomes functional for the first time in this architecture generation, not just "migrated" |
| `original_url`-only image display | `display_url ?? original_url` progressive load, already correctly wired for `ReleaseGallery`'s initial load and `FansubGroupMediaBlock` | Phase 173 (prior to this phase) | This phase extends the *pattern already proven* to 2 more consumers (`ProjectMemberMediaViewer` needs a backend join added; `GroupAssetsExperience` has no equivalent concept) |

**Deprecated/outdated:** `ReleaseVersionMediaDetailPanel.tsx` is dead code with 0 importers — not
deprecated in the sense of "replaced by something," simply never wired up as a route and safe to
delete outright (D-06).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Home`/`End` keyboard jump-to-first/last (currently only in `ScreenshotGallery`) is *not* required in the shared baseline, since D-02/D-03 don't name it | Research Focus 2, `ScreenshotGallery` | Low — if wrong, simply add it to the shared keyboard handler; cheap, no architectural impact |
| A2 | The desktop/mobile responsive split in `ProjectMemberMediaViewer`'s sidebar layout does not need to be preserved pixel-for-pixel, only the field content it shows | Research Focus 2, `ProjectMemberMediaViewer` | Low-medium — affects visual QA expectations during Live-UAT (D-14), not data correctness |
| A3 | Adding a `mf_display` JOIN to `ProjectMemberPublicRepository.ListMedia` is a safe, additive backend change with no behavior change for existing callers (since `DisplayURL` would be a new, optional field) | Research Focus 3 | Medium — any backend repository change should get its own test per D-13; not verified against the full repository test suite in this research pass |

**None of the above are tagged `[ASSUMED]` in the sense of "unverified training-data claims"** — all
code-shape, SQL, and behavior claims elsewhere in this document were read directly from the files
cited (`[VERIFIED: codebase grep/read]`-equivalent confidence). The three items above are planning
*judgment calls* about scope, not unverified facts, and are listed here because the planner/user may
want to confirm them explicitly before locking task scope.

## Open Questions (RESOLVED)

1. **Does D-19's "server-side visibility filter" apply to `GroupAssetsExperience`, which has no
   `media_assets`/`visibility`/`review_status` row at all?**
   - What we know: `GroupAssetsExperience`'s images come entirely from a live Jellyfin folder scan
     (`group_assets_jellyfin.go`), with no database-backed visibility/review-state concept whatsoever.
     The other 4 database-backed consumers are confirmed correctly filtered server-side already.
   - What's unclear: whether the user intends D-19's hard rule to also require *introducing* some
     new access-control concept for Jellyfin-sourced images (e.g., gating by episode status
     `public`/`private`/`disabled`), or whether D-19 was written with only the 4 database-backed
     consumers in mind and this consumer is simply out of D-19's intended scope.
   - Recommendation: surface this explicitly to the user during planning/discuss-phase before writing
     a task for it — do not silently add new filtering logic, and do not silently skip D-19 for this
     consumer without the user's explicit sign-off either way.
   - **RESOLVED:** see D-20 in `177-CONTEXT.md` (hard visibility filter scoped to the 4 database-backed consumers; `GroupAssetsExperience` stays access-unchanged, no new filtering logic introduced).

2. **How should the metadata overlay degrade for consumers with thinner data shapes?**
   - What we know: D-19 specifies title, category, episode_label, release_version_label, caption as
     overlay fields. `ProjectMemberMediaViewer`'s data (`ProjectMemberMediaItem`) has all five.
     `GroupAssetsExperience`'s data (`GroupAssetImage`) has only `id`/`title`/`image_url`/
     `thumbnail_url`/`width`/`height`/`order` — no caption, no category, no episode/release labels.
     `ScreenshotGallery`'s target data (`PublicReleaseImage`, once repointed to
     `getGroupReleaseImages`) has category/title/caption/author but no explicit `episode_label`
     (episode context is implicit from the page it's embedded in, not carried per-image).
   - What's unclear: whether the shared viewer's overlay should render a partial set of fields
     per-consumer (graceful omission of missing fields) or whether this signals that
     `GroupAssetsExperience`'s underlying data model should eventually be enriched (out of this
     phase's scope per the Jellyfin-sourced nature of the data).
   - Recommendation: plan for graceful per-field omission (render only the fields present on a given
     item) rather than forcing every consumer to supply the full field set — this keeps the shared
     component's prop contract honest about what's actually available per consumer.
   - **RESOLVED:** see D-22 in `177-CONTEXT.md` (graceful per-field omission -- missing fields render nothing, no placeholder dashes).

3. **Should the pre-existing `display_url` gap in `ReleaseGallery.revealAll()`'s cursor-paginated
   query be fixed as part of this phase, or only flagged?**
   - What we know: the gap is real, narrow in scope (one SQL query missing one LEFT JOIN), and
     directly adjacent to work this phase is already doing (progressive-load for this exact
     consumer).
   - What's unclear: whether fixing it is in-scope for "extend the viewer" or constitutes unrelated
     scope creep into a pre-173 bug that belongs in a bugfix-style task of its own.
   - Recommendation: raise it explicitly during planning as a small, separately-labeled task (easy to
     accept or defer), rather than bundling it silently into the viewer-extension work or ignoring it.
   - **RESOLVED:** see D-24 in `177-CONTEXT.md` (fix accepted as its own scoped task in this phase, with its own D-13-compliant logic test).

4. **What should happen to `GroupAssetsExperience`'s current clamp-at-boundary keyboard navigation
   (no wrap-around) once it moves onto the shared wrap-around viewer?**
   - What we know: `GroupAssetsExperience` currently stops at the first/last image (no wrap);
     `ScreenshotGallery` also stops (via disabled buttons); only the Vorbild (`FansubMediaLightbox`)
     and `ProjectMemberMediaViewer` wrap around.
   - What's unclear: whether unifying all five consumers onto wrap-around navigation is a desired
     behavior change for the two consumers that currently don't have it, or whether this is simply an
     accepted side effect of consolidation that should be mentioned to the user as a UX change (not
     a bug) during Live-UAT (D-14).
   - Recommendation: treat this as an intentional, expected consequence of consolidation (per D-01,
     the shared baseline *is* the Vorbild's wrap-around behavior) and call it out explicitly in the
     Live-UAT checkpoint notes so it isn't mistaken for a regression.
   - **RESOLVED:** see D-21 in `177-CONTEXT.md` (consolidation onto the shared wrap-around baseline from D-01 is treated as intentional; called out explicitly during Live-UAT per D-14).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Jellyfin API (`.env` `JELLYFIN_BASE_URL`/`JELLYFIN_API_KEY`) | `GroupAssetsExperience`'s image data (one of the 5 consumers) | Not verified in this research pass (depends on live `.env` on `team4s-linux`) | — | `resolveGroupAssets` already degrades gracefully to an empty `Episodes: []` payload when unset — no code change needed to handle this; the migrated viewer must simply handle "zero images, no error" for this consumer |
| Postgres `media_files.variant = 'display'` rows | Progressive-load feature (D-03) for `ReleaseGallery`/`FansubGroupMediaBlock` | Confirmed schema/query support exists (Phase 173); actual row presence depends on whether assets have been through the display-generation pipeline — not verified per-asset in this research pass | — | SQL `COALESCE` chain already falls back to `original`/`file_path` when no `display` row exists yet, so progressive-load degrades to "both stages show the same image" rather than erroring |

**Missing dependencies with no fallback:** none identified.

**Missing dependencies with fallback:** Jellyfin API absence (existing graceful empty-payload
fallback, no change needed); missing `display`-variant media files (existing SQL fallback to
`original`, no change needed).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (frontend, `frontend/vitest.config.ts`), Go `testing` + `testify` (backend) |
| Config file | `frontend/vitest.config.ts` (frontend); no central Go test config, standard `go test` |
| Quick run command | `cd frontend && npx vitest run src/components/fansubs/FansubMediaLightbox.test.tsx` (frontend, scoped); `cd backend && go test ./internal/repository/... -run TestProjectMember` (backend, scoped) |
| Full suite command | `cd frontend && npm test` (= `vitest run`); `cd backend && go test ./...` |

### Phase Requirements → Test Map

Since this phase has no `REQUIREMENTS.md` IDs, the table below maps each locked decision (D-NN) that
has independently testable behavior to a concrete test target.

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-01/D-03 | Wrap-around navigation index math (shared across all consumers) | unit (pure function, no render) | `npx vitest run src/components/fansubs/<new-nav-logic-file>.test.ts` | ❌ Wave 0 — must extract pure function first, per Pitfall 1 |
| D-02 | Prefetch triggers for neighbor indices | unit (pure function + mocked `window.Image`) | `npx vitest run src/components/fansubs/<new-prefetch-logic-file>.test.ts` | ❌ Wave 0 |
| D-03 | Zoom toggle state transition | unit (pure reducer/state function) | `npx vitest run src/components/fansubs/<new-zoom-logic-file>.test.ts` | ❌ Wave 0 |
| D-03 | Display→original swap-on-load behavior | unit (pure function: "which URL to show given load state") | `npx vitest run src/components/fansubs/<new-progressive-load-logic-file>.test.ts` | ❌ Wave 0 |
| D-19 | Non-public/non-approved/soft-deleted media excluded from each consumer's query | integration (Go repository test against fake/real test DB) | `go test ./internal/repository/... -run TestListMedia` (or equivalent, per touched repository) | Partially — existing visibility tests exist for `FansubRepository`/`ReleaseDetailPublicRepository` (confirmed via `*_display_url_test.go` files found during research) but would need extension if `ProjectMemberPublicRepository.ListMedia` gains a new join |
| D-04 | `ScreenshotGallery` repointed to working endpoint, renders real data | integration-ish (component logic test against mocked `getGroupReleaseImages`, not a render/click simulation — assert on returned view-model/derived state) | TBD — design during planning, must honor D-13 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** scoped `vitest run <changed-file>.test.ts` / `go test ./internal/repository/... -run <TestName>`
- **Per wave merge:** full `npm test` (frontend) + `go test ./...` (backend)
- **Phase gate:** full suite green before `/gsd:verify-work`, plus the mandatory Live-UAT (D-14)

### Wave 0 Gaps
- [ ] Decide and create the pure-logic extraction files (navigation index math, zoom toggle state,
      prefetch trigger, progressive-load URL selection) *before* writing their tests — these files
      do not exist yet; D-13 requires them to exist as directly-testable units, not buried inside the
      rendered component.
- [ ] `FansubMediaLightbox.test.tsx` and `ProjectMemberMediaViewer.test.tsx` will very likely need to
      be rewritten (not merely extended) once their logic moves into the extracted pure functions,
      since their current `render`+`fireEvent` pattern conflicts with D-13.
- [ ] Decide the test strategy for `ScreenshotGallery`'s data-source repointing (D-04) — this is the
      one behavior in this phase that is fundamentally about "does the right API get called with the
      right arguments and does the right thing render," which is harder to test without some form of
      render under D-13's constraints; needs an explicit design decision during planning (e.g., test
      the data-fetching/transform logic as a standalone hook/function, leave minimal rendering
      unverified by automated tests and rely on Live-UAT for the visual confirmation).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | All 5 consumers are public/unauthenticated read surfaces; no auth state involved in the viewer itself |
| V3 Session Management | No | N/A for a read-only public viewer |
| V4 Access Control | **Yes** | This *is* D-19's core concern — access control is enforced via the `visibility`/`review_status` SQL predicate at the repository layer, not at the handler or UI layer. The standard control already in use (`v.name='public' AND rs.code='approved' AND <relation>.deleted_at IS NULL`, `ma.status='ready'`) must be preserved/reused, not re-implemented differently, for any new or touched query |
| V5 Input Validation | Minor | `category`/`cursor`/`limit` query params on the existing pagination endpoints are already validated (`isPublicReleaseImageCategory`, `clampCursorLimit`) — no new user input surfaces are introduced by this phase (the viewer itself takes no user text input) |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Information disclosure via client-side-only visibility filtering (showing non-public media in the viewer because the UI "just didn't render" it while the API already returned it) | Information Disclosure | Never rely on the frontend to hide fields the backend already sent; the correct mitigation (already in place for 4/5 consumers) is excluding non-public rows from the SQL result set itself, confirmed via direct repository-layer reads in this research |
| IDOR-style access via guessable `media_asset_id`/relation IDs in viewer navigation (`onNavigate(index)` resolving to arbitrary IDs) | Tampering/Information Disclosure | Not applicable here in a new way — navigation only ever indexes into the already-server-filtered `media` array passed as props; there is no direct "fetch media by arbitrary ID" endpoint exposed to the viewer component itself in any of the 5 consumers inspected |

## Sources

### Primary (HIGH confidence — direct codebase reads in this session)
- `frontend/src/components/fansubs/FansubMediaLightbox.tsx`, `.module.css`, `.test.tsx` — full read
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` — full read
- `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` — full read
- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` — full read
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx`, `.test.tsx`,
  `ProjectMemberMediaGallery.tsx` — full read
- `frontend/src/components/groups/GroupAssetsExperience.tsx` — full read
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` — full
  read; confirmed 0 importers via `grep -rn "ReleaseVersionMediaDetailPanel" frontend/src`
- `frontend/src/components/ui/Modal.tsx`, `Modal.module.css` — full read
- `frontend/src/app/episodes/[id]/components/VideoPlayerModal/VideoPlayerModal.tsx` — full read
- `backend/internal/repository/episode_version_image_repository.go`,
  `episode_version_repository_write_helpers.go` — confirmed the Phase-20-deferred stub
- `backend/internal/handlers/episode_version_images_handler.go`,
  `backend/internal/handlers/group_contributors_handler.go` — endpoint routing confirmed
- `backend/internal/repository/release_detail_public_repository.go`,
  `release_detail_public_repository_helpers.go` — full read of visibility predicate + display-variant
  JOIN logic for both query paths
- `backend/internal/repository/project_member_public_repository.go`,
  `project_member_visibility.go` — full read of `ListMedia` + the `projectMemberPublicMediaPredicate`
  constant
- `backend/internal/repository/fansub_repository_public_profile.go` — full read of
  `listPublicFansubMedia`
- `backend/internal/handlers/group_assets_handler.go`, `group_assets_jellyfin.go` — confirmed no
  `media_assets`/visibility involvement
- `frontend/src/types/projectMember.ts`, `releaseDetail.ts`, `fansub.ts`, `groupAsset.ts`,
  `releaseVersionMedia.ts` — type shapes for all 5 live consumers
- `frontend/package.json` — dependency survey confirming no gesture/zoom library present
- `.planning/sketches/010-galerie-detailansicht/README.md` — read-only, design intent
- `.planning/phases/177-.../177-CONTEXT.md`, `.planning/STATE.md` (relevant excerpt),
  `175-INVENTORY.md`, `175-ROADMAP-PROPOSAL.md` — upstream phase context

### Secondary (MEDIUM confidence)
- None — no WebSearch/Context7 lookups were needed for this phase; it is a pure internal-codebase
  consolidation with no new external library or framework API surface.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency is recommended; recommendation (vanilla pointer/touch +
  CSS) is derived directly from reading the actual sketch requirement and the actual existing
  dependency list, not from generic "typical lightbox" training knowledge.
- Architecture: HIGH — every claim about component structure, prop shapes, and data flow is sourced
  from direct file reads in this session, including line-number citations.
- Pitfalls: HIGH — the D-13/existing-test-pattern conflict and the broken-backend-endpoint finding
  were both independently discovered by reading source code, not inferred.

**Research date:** 2026-10-08
**Valid until:** 30 days (stable internal codebase; re-verify if Phase 176 or any phase between 173
and 177 touches `media_files`/visibility schema, `Modal.tsx`, or any of the 6 inventoried files before
this phase's planning is executed).
