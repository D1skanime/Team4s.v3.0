---
status: partial
phase: 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder
source: [38-VERIFICATION.md]
started: 2026-05-08T22:42:00Z
updated: 2026-05-08T22:42:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drag-and-Drop Persistenz
expected: Karte in gleicher Kategorie ziehen und loslassen → Gallery sortiert sofort um → nach Reload bleibt neue Reihenfolge erhalten (sort_order im Backend gespeichert).
result: [pending]

### 2. Cross-Category-Drag blockiert
expected: Drag von Kategorie A nach Kategorie B wird still ignoriert — kein Fehler, kein Kategoriewechsel.
result: [pending]

### 3. Sort-Order-Formular entfernt
expected: Detail-Panel nach Klick auf Karte zeigt kein Zahlenfeld und keinen "Sortierung speichern"-Button mehr.
result: [pending]

### 4. Floating Hover Preview Card
expected: Hover über Galerie-Karte zeigt floating Card daneben mit grossem Bild und Caption — keine Edit-Controls.
result: [pending]

### 5. GIF-Animation beim Hover
expected: GIF-Karte zeigt animiertes Original beim Hover und kehrt nach mouseleave zum statischen Thumbnail zurück.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
