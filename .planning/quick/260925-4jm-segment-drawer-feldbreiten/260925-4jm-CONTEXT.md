# Quick Task 260925-4jm: Segment-Drawer-Feldbreiten ausbalancieren

## Ausgangslage

Nach der Vergrößerung des Segment-Drawers blieben erklärende SectionHeader-Texte auf der globalen `58ch`-Begrenzung, während Typ- und Provenance-Dropdowns unnötig die gesamte Breite ausfüllten.

## Entscheidung

Im Segment-Drawer nutzen erklärende Texte die komplette verfügbare Breite. Direkte Select-Felder erhalten eine kompakte Maximalbreite von 360px; auf Mobilgeräten bleiben sie viewportbreit.

## Abgrenzung

- Keine globale Änderung an `SectionHeader`.
- Episoden- und Zeitfelder bleiben in ihrer bestehenden responsiven Anordnung.
- Keine Änderung an Daten, API oder Segmentlogik.
