---
status: partial
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
source: [181-VERIFICATION.md]
started: 2026-10-13T17:53:03Z
updated: 2026-10-13T17:53:03Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Alle 11 externen Einstiegspunkte live anklicken (6 Admin-Route + 5 Workspace-Route aus 181-CONTEXT.md)
expected: Jeder Einstiegspunkt landet sichtbar auf /releases/[versionId]/edit, kein toter Link, kein Redirect-Flackern, Query-Kontext (tab/return_to) stimmt
result: [pending]

### 2. Tab-Sichtbarkeit je Rolle visuell vergleichen: Plattform-Admin-Account vs. Nicht-Admin-Mitglied-Account auf derselben Release-Version
expected: Admin sieht 6 Tabs (Basisdaten/Dateien/Segmente/Medien/Änderungsverlauf/Notizen), Nicht-Admin nur die 4 capability-gated Tabs, keine ausgegrauten Admin-Tabs sichtbar
result: [pending]

### 3. Vor/Zurück-Navigation aus beiden Einstiegskontexten prüfen: (a) aus einem /me/projects/.../group/...-Link einsteigen, blättern; (b) aus der Episoden-Übersicht/Admin-Fansub-Edit einsteigen, blättern
expected: (a) zeigt ausschließlich Releases desselben Anime+Gruppe-Projekts; (b) blättert über alle Episoden des Anime (zeigt "Folge X / Y"-Center-Label)
result: [pending]

### 4. Mit einem Plattform-Admin-Account OHNE verifizierten member_claim die neue Seite öffnen und durchblättern
expected: Keine 404-Fehlerseite, kein "Member-Profil fehlt"-Banner trotz fehlendem Mitgliederprofil, Notizen-Tab funktioniert, projektbezogene Navigation zeigt leeren (nicht fehlerhaften) Zustand wenn kein Projekt-Kontext auflösbar ist
result: [pending]

### 5. Entwicklerentscheidung zu WR-02 (vorbestehender Breadcrumb-Gap): Nicht-Admin-Fansub-Gruppenleiter betritt die Seite über /admin/fansubs/:id/edit?tab=releases und prüft den Breadcrumb
expected: Der Breadcrumb "Anime" und der Anime-Titel-Link zeigen aktuell auf /admin/anime bzw. /admin/anime/:id/edit, die für diesen Nutzer nicht öffnbar sind (PlatformAdminGate greift). Der funktionale "Zurück"-Button fällt korrekt auf die eigene Fansub-Seite zurück. Entscheidung nötig: jetzt beheben (passt zum "rechtebasiert"-Phasenziel) oder als Folgearbeit akzeptieren (vorbestehend, keine Sicherheitslücke, kein funktionaler Bruch).
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
