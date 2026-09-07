# Phase 151 Integration Review

## MEDIUM — Inactive-card click activation is attached inside the native `inert` subtree

- **Verified file/line:** `frontend/src/components/ui/FocalCarouselInternals.tsx:69-91`
- **Reproduction / evidence:** High-confidence browser-behavior inference. Every inactive item receives `inert` on lines 81-87, while the handler intended to activate that item is attached to the same inert wrapper on lines 88-91. Native `inert` suppresses targeting/activation within that subtree, so clicking a partially visible inactive neighbor does not reliably reach `onSelect(index)`. `FocalCarousel.test.tsx:428-447` uses `fireEvent.click`, which dispatches directly and does not reproduce browser inert hit testing. The same conflict existed in the Phase 150 baseline, but remains actionable because the locked Phase 151 carousel contract includes manual activation.
- **Small direct fix:** Keep inactive descendants inert, but resolve a click-without-drag at the non-inert track level (for example, use the pointer-up coordinates to select the owned direct item whose rectangle contains the point). Add one real-browser regression that clicks an inactive neighbor and verifies that it becomes active without exposing its nested controls to keyboard focus.

## MEDIUM — Expand/collapse does not cancel motion or restore the active item’s physical scroll position

- **Verified file/line:** `frontend/src/components/ui/FocalCarousel.tsx:76-79`, `82-89`, `336-348`
- **Reproduction / evidence:** Source-proven lifecycle defect. `showAll` switches branches without calling `cancelPendingInteraction`, so an in-flight 210 ms RAF keeps mutating the detached collapsed track. On collapse, a new track element mounts at its default `scrollLeft = 0`; the restoration effect only focuses the toggle and never centers `safeIndex`. Reproduce by navigating to any index greater than zero, expanding, then collapsing: logical active/inert state remains on that index while the viewport returns to the beginning. The mismatch is especially visible in `FansubProjectsGrid`, where index 20 can be the “more projects” sentinel. Existing tests assert focus and `aria-current`, but not restored scroll geometry. This behavior is retained from the baseline and sits directly in the Phase 151 interaction-hardening surface.
- **Small direct fix:** Cancel timers/measurement/programmatic RAFs before expansion, then after the collapsed track remounts call the existing centering seam for `activeIndexRef.current` with animation disabled before restoring focus. Add a focused test with a nonzero active index that asserts both logical selection and the remounted track’s `scrollLeft` after collapse.

## LOW — Shrinking `carouselItems` clamps rendering but leaves the navigation ref stale for one command

- **Verified file/line:** `frontend/src/components/ui/FocalCarousel.tsx:73-75`, `213-216`
- **Reproduction / evidence:** Source-proven state divergence. `safeIndex` clamps the rendered active item when the visible list shrinks, but `activeIndexRef.current` is not synchronized. If index 4 is active and the list rerenders with two items, the UI shows index 1 active; the first Previous command computes from stale ref 4, clamps back to index 1, and appears to do nothing. The second Previous command finally moves to index 0. No focused test covers a length reduction while a high index is active.
- **Small direct fix:** When the visible item set/length changes, synchronously clamp both `activeIndexRef.current` and state to `lastIndex`, then center that item without animation. Add a rerender regression for a 5-to-2 item shrink followed by one Previous command.
