# Quick Task Context

## Ziel

Die Mapping-Zeile braucht eine echte Überschriftenzeile für die fünf sichtbaren Bereiche: Dateiname, Gruppe, Episode, Version und Aktionen.

## Entscheidungen

- Die Überschriften werden einmal oberhalb der jeweiligen Mapping-Zeilen gerendert.
- Die Datenzeilen verwenden dieselbe fünfspaltige Grid-Geometrie wie die Überschriften.
- Die bestehenden Feldlabels bleiben in den Controls erhalten, damit die kompakte/mobile Ansicht und Accessibility nicht von der Desktop-Überschrift abhängen.
- Unterhalb der responsiven Schwelle wird die Desktop-Überschrift ausgeblendet, weil die einzelnen Controls dort ihre eigenen Labels zeigen.
