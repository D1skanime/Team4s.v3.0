---
quick_id: 260510-umt
status: complete
date: 2026-05-10
---

# Summary: Beschreibungs-Textarea Fix

## Was wurde geaendert

### ReleaseVersionMediaDetailPanel.tsx
- `<input className={styles.input} .../>` → `<textarea className={styles.input} .../>`
- `value` und `onChange` Props unveraendert
- Kein `type`-Attribut (textarea braucht keines)

### ReleaseVersionMediaSection.module.css
- Neuer Rule `textarea.input { min-height: 80px; resize: vertical; }`
- Ueberschreibt `min-height: 42px` fuer textarea-Elemente
- Bestehender `.input` Stil bleibt fuer alle anderen Inputs unveraendert

## Ergebnis

Das Beschreibungsfeld im Detail-Panel zeigt jetzt mindestens 2 Zeilen Hoehe
und ist vertikal per Drag-Handle erweiterbar. Lange Captions brechen
automatisch um statt auf einer Zeile zu bleiben.
