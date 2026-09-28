---
status: complete
---

# Quick Summary 260928-6qt

Die Ursache war die weiterhin einspaltige CSS-Definition von `fansubEditReleaseThemeList`. Die Liste nutzt nun auf Desktop zwei gleich breite Spalten; ab 760px und kleiner wird sie wieder einspaltig.

Checks:

- fokussierte Release-Editor-Suite: 39/39 Tests bestanden
- `git diff --check`: bestanden
- Desktop-/Mobile-Layout-Regel geprüft; keine Änderung an API, Datenmodell oder Berechtigungslogik
