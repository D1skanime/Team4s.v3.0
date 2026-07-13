---
status: complete
---

# Quick Task 260713-history-timeline-pair-alignment: Summary

## Ergebnis

Die öffentliche Fansub-Historie rendert Bild und Infokarte jetzt pro Eintrag in einer stabilen `historyTimelinePair`-Struktur. Desktop fixiert Badge und Karte in derselben Grid-Zeile, Mobile stapelt sie weiterhin sauber untereinander.

## Geändert

- `FansubHistorySection.tsx`: Badge und Karte in gemeinsames Pair gewrappt.
- `FansubPublicSections.module.css`: Pair-Grid, größere Desktop-Badges, stärkerer Kartenglow und Mobile-Stack korrigiert.
- `FansubHistorySection.test.tsx`: Test deckt die neue Pair-Struktur ab.

## Checks

- `npm --prefix frontend test -- FansubHistorySection.test.tsx`
- `npm --prefix frontend run typecheck`
- `git diff --check`
- Smoke: `http://127.0.0.1:3000/fansubs/c-subs` liefert 200.
