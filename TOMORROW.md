# TOMORROW

## Top 3 Priorities
1. Dem Editor den letzten visuellen Schliff geben: weniger Weiß, stärkere Hierarchie, ruhigere Toolbar.
2. Danach den aktuellen Wrapper gegen alle weiteren `RichTextEditor`-Einsätze inventarisieren und den globalen Rollout planen.
3. Anschließend die spätere Bildunterstützung so vorbereiten, dass sie denselben bestehenden Media-/Upload-Flow nutzt wie der Rest des Produkts.

## First 15-Minute Task
- In [RichTextEditor.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/RichTextEditor.tsx:48) und [RichTextEditor.module.css](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/RichTextEditor.module.css:68) alle noch zu weißen Toolbar-/Flächenstellen identifizieren und daneben live auf `http://localhost:3000/admin/fansubs/88/edit` notieren, was zuerst dunkler, wärmer oder kontrastreicher werden soll.

## Dependencies To Unblock Early
- Frontend dev server auf `http://localhost:3000` laufen lassen.
- Work only from `C:\Users\admin\Documents\Team4s`.
- Für die spätere Bildfunktion zuerst vorhandene Upload-/Media-Pfade im Produkt lesen, damit kein paralleler TipTap-Sonderweg entsteht.
