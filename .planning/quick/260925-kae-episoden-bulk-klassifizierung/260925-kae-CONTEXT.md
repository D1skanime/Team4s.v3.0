# Quick Task 260925-kae: Bulk-Klassifizierung für Episoden

## Ausgangslage

In der Episodenübersicht können mehrere Episoden bereits gemeinsam ausgewählt und einer Fansub-Gruppe zugeordnet werden. Canon/Filler und Episodentyp mussten dagegen bisher pro Episode gesetzt werden.

## Entscheidung

Die bestehende Mehrfachauswahl wird um zwei optionale Felder erweitert: Canon/Filler und Episodentyp. Beide Felder dürfen unabhängig voneinander unverändert bleiben. Das Anwenden erfolgt gesammelt, mit Bestätigungsdialog und Fortschrittsanzeige.

## Abgrenzung

- Keine neue API: Der vorhandene Admin-Episode-Update-Endpunkt wird je ausgewählter Episode verwendet.
- Keine Änderung an Importlogik oder Datenmodell.
- Fansub-Gruppen-Sammelaktion bleibt unverändert.
- Die vorhandene Optionsquelle für Klassifizierungen wird wiederverwendet.
