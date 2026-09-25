# Quick Task 260925-drawer: Segment-Bearbeitungsdrawer vergrößern

## Ausgangslage

Der Segment-Drawer im Episodenversionseditor enthält inzwischen Basisfelder, Episoden-/Zeitbereiche, Origin, Mitwirkende, Playback-Vorschau, Provenance und Assets. Die bisherige Breite von 380px machte die Bearbeitung unnötig eng.

## Entscheidung

Der Drawer erhält auf Desktop eine Arbeitsbreite von 760px. Auf kleinen Viewports bleibt er auf die verfügbare Breite begrenzt. Kopfbereich sowie Aktionen werden sticky, damit Schließen und Speichern beim langen Formular erreichbar bleiben.

## Abgrenzung

- Keine Änderungen an Segmentdaten, APIs oder Speicherlogik.
- Keine Änderung der Tab-Navigation oder der bestehenden mobilen Tabellenansicht.
