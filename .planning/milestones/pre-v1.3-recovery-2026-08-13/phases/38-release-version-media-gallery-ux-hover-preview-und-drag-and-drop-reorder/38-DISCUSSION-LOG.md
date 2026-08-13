# Phase 38 — Discussion Log

**Date:** 2026-05-08
**Phase:** 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder

---

## Gray Areas Identified

1. **Sortierung: sort_order-Zahlenfeld UX** — Wie soll Sortierung funktionieren? Das Zahlenfeld ist für Nutzer unverständlich.
2. **Hover-Preview: Implementierungsansatz** — Floating Card vs. Tooltip vs. Sidebar-Expansion
3. **Live-Re-Sort-Bug** — Galerie sortiert sich nach Patch nicht neu
4. **GIF-Animation im Hover** — Wann und wie soll das animierte GIF abgespielt werden?

---

## Discussion

### Sortierung

**User:** Was bedeutet die Zahl 70 beim sort_order? Was passiert wenn ich sie auf 96 ändere?
**Analysis:** sort_order ist ein Integer, der die Reihenfolge innerhalb einer Kategorie bestimmt. 70 bedeutet Position 7 bei 10er-Schritten. Ändern auf 96 verschiebt das Bild hinter alle mit sort_order < 96.

**User:** Was passiert wenn ich ein Bild mit 40 auf 41 ändere?
**Analysis:** Das Bild rückt knapp hinter das mit sort_order=40, aber da die Live-Galerie sich nicht neu sortiert (Bug), sieht man das Ergebnis erst nach Reload.

**User:** Niemand versteht das mit den Zahlen. Zudem wird es in der Live-Ansicht nicht angepasst wenn ich von 40 auf 55 wechsle.
**Decision:** sort_order-Zahlenfeld entfernen → Drag-and-Drop als Ersatz. Live-Re-Sort-Bug fix.

### Hover-Preview

**User:** Macht Vorschläge für professionelle Sortierung. Bilder sollen sich beim Hover gross anzeigen mit Beschreibung. Noch kein Edit. GIF animated soll beim Hover abspielen.

**Options presented:**
- **A (Floating Preview Card):** Radix HoverCard oder floating-ui — grosses Bild + Caption als floating Element neben der Karte, kein Klick nötig
- **B (Sidebar Expand):** Klick auf Karte expandiert Sidebar-Bereich — ähnlich wie Detail Panel aber inline
- **C (Inline Zoom):** CSS transform: scale() Hover-Animation — kein separate Card, nur Zoom

**User:** A

**Decision D-01:** Floating Preview Card (Option A).

### GIF-Animation

**Analysis:** Galerie-Karten zeigen thumbnail_url (statisches JPEG Frame-0). Bei Hover → src wechselt zu original_url (animated GIF). Bei mouseleave → zurück zu thumbnail_url.

**User:** Bilder werden in bestimmter Grösse gespeichert? z.B. 40x40 → wird ein Bild mit 30x60 zu 40x40?
**Analysis:** Nein — Thumbnails sind 400px breit (proportional, Höhe auto via `imaging.Resize(src, 400, 0, Lanczos)`). Das Originalbild bleibt unverändert. Ein 30×60-Bild würde zu 400×800 (proportional skaliert), nicht zu 40×40 (kein Crop).

**Decision D-02:** GIF src-swap bei Hover. Thumbnails 400px breit proportional — direkt nutzbar in Preview Card.

---

## Confirmed Decisions

| ID | Decision |
|----|----------|
| D-01 | Floating Preview Card (Radix HoverCard / floating-ui) — read-only |
| D-02 | GIF src-swap: thumbnail_url ↔ original_url bei mouseenter/mouseleave |
| D-03 | sort_order-Zahlenfeld entfernt → Drag-and-Drop Reorder (category-scoped) |
| D-04 | Live-Re-Sort-Bug: `setItems` nach patchItem neu sortieren |
| D-05 | Hover Preview ist read-only in Phase 38 |
| D-06 | Thumbnails 400px breit proportional — kein zusätzliches Resizing nötig |

---

## Deferred

- Edit-Controls im Hover-Preview (Caption direkt in Card editierbar)
- Cross-Category Drag mit Kategorie-Wechsel
- Keyboard-Navigation (Pfeiltasten)
- Zoom/Lightbox beim Klick

---

**Status:** Discussion complete — "damit ist phase 38 fertig diskutiert" (User, 2026-05-08)
