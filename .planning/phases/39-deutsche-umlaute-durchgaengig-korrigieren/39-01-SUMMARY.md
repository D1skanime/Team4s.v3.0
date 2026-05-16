---
plan: 39-01
phase: 39-deutsche-umlaute-durchgaengig-korrigieren
status: complete
commit: bf97142b
---

# 39-01 Summary — Frontend Umlaut-Korrekturen + CLAUDE.md

## Was wurde gemacht

### Task 1: CLAUDE.md Umlaut-Konvention
- Neue Untersektion `### Sprachqualität` unter `## Conventions` in CLAUDE.md ergänzt
- Regel verbietet ae/oe/ue/ss in user-facing Strings explizit
- Commit: `4852a44c`

### Task 2: Frontend-Strings korrigiert
42 Dateien in `frontend/src/app/admin/` korrigiert:
- anime/components/** — alle JSX-Textknoten, Button-Labels, Placeholder, aria-labels
- episode-versions/** — Editor-Strings
- fansubs/** — Drawer-Strings

Typische Korrekturen:
- `fuer` → `für`, `uebernehmen` → `übernehmen`, `oeffnen` → `öffnen`
- `waehlen` → `wählen`, `auswaehlen` → `auswählen`
- `verknuepft` → `verknüpft`, `schuetzen` → `schützen`
- `Loeschen` → `Löschen`, `Uebersicht` → `Übersicht`
- `ausgewaehlt` → `ausgewählt`, `ungueltig` → `ungültig`

### Task 3: Test-Strings mitkorrigiert
8 Test-Erwartungen in 4 Test-Dateien aktualisiert:
- `JellyfinCandidateCard.test.tsx`
- `AnimeRelationsSection.test.tsx`
- `AniSearchEnrichmentSection.test.tsx`
- `anime/page.test.tsx`

## Ergebnis

- 404/404 Frontend-Tests grün
- TypeScript-Kompilierung sauber
- Kein Dateiname, Variablenname oder CSS-Klassenname geändert

## Commit

`bf97142b` — fix(39-01): Deutsche Umlaute in Frontend-Strings korrigieren
