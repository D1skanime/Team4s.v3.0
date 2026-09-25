# Quick Task Context

## Ziel

Die gelbe Mapping-Zeile soll nur die für die Zuordnung benötigten Informationen zeigen: Dateiname, Gruppe als Chip-/Suchfeld, Episode, Version und Aktionen.

## Entscheidungen

- `display_path` wird in der Mapping-Zeile nicht mehr angezeigt, weil der Ordnerpfad bereits im Import-Kopfbereich sichtbar ist.
- Der reine Status-Text „Vorschlag“ wird entfernt; die gelbe Zeilenmarkierung bleibt als visueller Vorschlagsstatus erhalten.
- Für vorgeschlagene oder konfliktbehaftete Zeilen gibt es neben „Überspringen“ direkt „Bestätigen“.
- Die bestehenden Gruppen-Chips und „Episode“, „Ab hier“ sowie „Ab hier entfernen“ bleiben unverändert.
- Keine API- oder Datenmodelländerung.
