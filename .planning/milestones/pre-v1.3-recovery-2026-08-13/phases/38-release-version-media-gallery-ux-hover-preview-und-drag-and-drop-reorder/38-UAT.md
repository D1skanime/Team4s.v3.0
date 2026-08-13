# Phase 38 UAT — Release-Version Media Gallery UX

**Phase:** 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder
**Status:** Ready for live verification
**Updated:** 2026-05-08

---

## Prerequisites

- Docker Compose running with rebuilt frontend container (or `npm run dev`)
- At least one release version with uploaded media items exists
  - Recommended: `/admin/episode-versions/41/edit?tab=media`
  - Ensure at least one category has 2+ items for drag-and-drop testing
  - Bonus: Upload a GIF file to test src-swap animation

---

## Plan 01 — Drag-and-Drop Reorder

### Scenario A: Category-scoped drag-and-drop

1. Open `/admin/episode-versions/41/edit?tab=media`
2. Locate a category section with 2 or more media cards
3. Drag one card onto another card in the **same category**
4. **Expected:** Cards visually reorder. The dragged card gets slight opacity (ghost), the target card highlights with green border.
5. Release the drop.
6. **Expected:** Cards update their position immediately in the gallery.
7. Reload the page.
8. **Expected:** The new order persists (sort_order was saved to backend).

### Scenario B: Cross-category drag blocked

1. Try to drag a card from "Release-Screenshot" onto a card in "Typesetting-/Karaoke-Beispiel"
2. **Expected:** The drop is silently ignored — no reorder happens, no error shown.

### Scenario C: Sort-order form removed

1. Click any gallery card to open the detail panel.
2. **Expected:** No "Sortierung" number input, no "Sortierung speichern" button in the detail panel.
3. Caption, preview toggle, and delete button should still be present.

---

## Plan 02 — Hover Preview Card + GIF Animation

### Scenario D: Floating hover preview card (non-GIF item)

1. Open `/admin/episode-versions/41/edit?tab=media`
2. Hover over any gallery card with a thumbnail image.
3. **Expected:** A floating preview card appears adjacent to the hovered card.
   - The card shows a **larger version** of the thumbnail image.
   - The card shows the **caption text** (or "Asset #ID" fallback).
   - The card has **no edit controls** (no inputs, no save buttons).
4. Move the pointer away from the card.
5. **Expected:** The hover preview card disappears cleanly.

### Scenario E: Click-through works while hover preview is visible

1. Hover over a gallery card until the preview card appears.
2. While the preview is visible, **click** the gallery card.
3. **Expected:** The detail panel opens normally on the right side.
4. The hover preview disappears (replaced by the detail panel or hidden on click-focus).

### Scenario F: GIF animation on hover

1. Upload a GIF file as a media item in any category.
   - Or verify that an existing item has an `original_url` ending in `.gif`.
2. Hover over the GIF card in the gallery.
3. **Expected:** The compact card image **animates** (switches from static JPEG thumbnail to the animated GIF source).
4. Move the pointer away.
5. **Expected:** The card returns to the **static thumbnail** (no more animation).

### Scenario G: Non-GIF items do not flicker

1. Hover over a non-GIF image card (JPEG or PNG original).
2. **Expected:** The thumbnail stays stable — no src swap, no flicker.
3. The floating hover preview card appears as normal.

---

## Pass / Fail Checklist

| # | Scenario | Pass? | Notes |
|---|----------|-------|-------|
| A | Category-scoped drag-and-drop reorders correctly | | |
| B | Cross-category drag is blocked silently | | |
| C | Sort-order form removed from detail panel | | |
| D | Floating hover preview card appears with image + caption | | |
| E | Click-through into detail panel works during hover | | |
| F | GIF animates on hover, reverts on leave | | |
| G | Non-GIF items stay stable (no src flicker) | | |

---

## Known Limitations (Phase 38)

- Hover preview is read-only — caption editing stays in the detail panel only.
- Hover preview positioning: the card appears to the right of the hovered card. On the rightmost column it may overflow the viewport — this is a cosmetic edge case deferred to a future phase.
- Touch/mobile drag: HTML5 native drag-and-drop does not fire touch events. Mobile reorder support is deferred.
