# Quick Task 260713-history-timeline-pair-alignment: Public milestone timeline pair alignment

## Ziel

Die öffentliche Fansub-Historie richtet große Meilenstein-PNGs und Infokarten sauber als zusammengehöriges Paar aus, ohne JS-Messung und ohne neue Timeline-Logik.

## Plan

1. `FansubHistorySection.tsx`: Badge und Karte in eine gemeinsame `historyTimelinePair`-Struktur legen.
2. `FansubPublicSections.module.css`: Desktop-Layout über den Pair-Slot stabilisieren, große PNGs beibehalten, Kartenglow sichtbarer machen.
3. Mobile Layout weiter stapeln: PNG oben, Karte darunter, Timeline zentriert.
4. Test anpassen und relevante Frontend-Checks laufen lassen.

## Akzeptanz

- Badge und Karte werden pro Eintrag aus derselben Pair-Struktur positioniert.
- Desktop-Karten sitzen vertikal sauber neben dem Badge.
- Mobile bleibt lesbar und skaliert die PNGs kleiner.
- Existing Expand/Collapse Verhalten bleibt unverändert.
