# Quick Task 260925-5np: Media-Tab-Kontext und Status-Chips bereinigen

## Ausgangslage

Im Media-/Assets-Tab wurden Fansub-Gruppe und Release-Version zusätzlich zum bereits sichtbaren Editor-Kopf in einer Kontextkarte und nochmals in der Media-Komponente angezeigt. Status-/Kategorie-Badges eines Mediums standen untereinander.

## Entscheidung

Die doppelte Kontextkarte sowie die zweite Kontextzeile werden entfernt. Kategorie, Prüfstatus und Sichtbarkeit eines Mediums werden in einer gemeinsamen flexiblen Chip-Zeile dargestellt.

## Abgrenzung

- Der Editor-Kopf bleibt die einzige Kontextanzeige für Anime, Episode, Fansub und Version.
- Media-Upload, Review-Status, Vorschau und Löschlogik bleiben unverändert.
- Legacy-Kontext-Props bleiben für externe Aufrufer typkompatibel, werden in diesem Bereich aber nicht gerendert.
