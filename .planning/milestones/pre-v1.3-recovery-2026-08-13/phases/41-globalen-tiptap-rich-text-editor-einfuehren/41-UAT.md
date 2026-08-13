---
status: passed
phase: 41-globalen-tiptap-rich-text-editor-einfuehren
source:
  - 41-05-SUMMARY.md
  - 41-06-SUMMARY.md
started: 2026-05-12T22:31:00+02:00
updated: 2026-05-13T09:05:00+02:00
---

## Current Test

number: 6
name: Release-Version-Notizen lassen sich für echte Rollen bearbeiten
expected: |
  Für eine Version mit zugeordneten Mitgliedern und Rollen lässt sich der Shortnote-Editor öffnen und speichern.
awaiting: none

## Tests

### 1. Fansub-Notizen öffnen einen editierbaren Rich-Text-Editor
expected: Nach Klick auf `Notizen` und `Neue Gruppennotiz hinzufügen` öffnet sich ein benutzbarer TipTap-Editor ohne Client-Fehler.
result: pass

### 2. Anime-Projekttexte lassen sich pro Anime aufklappen
expected: Nach Klick auf `Anime-Projekte` und `11eyes ausklappen` öffnet sich der Projekttext-Editor für den gewählten Anime ohne Client-Fehler.
result: pass

### 3. Release-Version-Notizen zeigen den Phase-41-Tab ohne Frontend-Crash
expected: Die Seite `/admin/episode-versions/62/edit` öffnet den Tab `Notizen / Beiträge` ohne Client-Crash und zeigt den aktuellen Rollenstatus der Version.
result: pass

### 4. Gruppennotizen lassen sich per Browser speichern
expected: Eine neue Gruppennotiz lässt sich im Browser anlegen und speichern.
result: pass
reported: "Retest nach API-Mapping- und UTF-8-Decode-Fix bestanden."
severity: resolved

### 5. Anime-Projekttexte lassen sich per Browser speichern
expected: Ein Anime-Projekttext lässt sich im Browser speichern.
result: pass
reported: "Retest nach API-Mapping- und UTF-8-Decode-Fix bestanden."
severity: resolved

### 6. Release-Version-Notizen lassen sich für echte Rollen bearbeiten
expected: Für eine Version mit zugeordneten Mitgliedern und Rollen lässt sich der Shortnote-Editor öffnen und speichern.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Learnings

- Mehrere TipTap-Notizpfade hatten dieselbe Fehlerklasse:
  Backend-Antworten kamen in PascalCase und lieferten `BodyJSON` teils als Base64-kodierte Bytefolge zurück.
- Der kritische UTF-8-Fehler saß im Browser-Decode von `atob(...)`, nicht im Speichern selbst.
- Release-Version-Notizen brauchten zusätzlich klare Rollenlabels und getrennte Editorzustände bei Mehrfachrollen.
- Mitgliedergeschichten funktionieren jetzt operativ, sollten langfristig aber ins Mitgliederprofil statt in den Fansub-Tab verlagert werden.

## Follow-ups

- Mitgliedergeschichten sollten langfristig im Mitgliederprofil gepflegt werden statt primär im Fansub-Admin-Tab. Die aktuelle Dropdown-Lösung ist nur ein Zwischenstand, bis ein echtes Mitgliederprofil-Editing existiert.
