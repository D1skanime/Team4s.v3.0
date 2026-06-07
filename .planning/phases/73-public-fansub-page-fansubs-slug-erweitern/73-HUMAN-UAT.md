---
status: partial
phase: 73-public-fansub-page-fansubs-slug-erweitern
source: [73-VERIFICATION.md]
started: 2026-06-07T12:50:52Z
updated: 2026-06-07T12:50:52Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Mobile-Overflow 375px (UAT-13 / 73-06)
expected: Auf `/fansubs/animeownage` bei 375px Viewport (DevTools → iPhone SE) kein horizontaler Overflow — `scrollWidth === clientWidth`; Hero-Banner-Oberkante nicht abgeschnitten (object-position: center top).
result: [pending]

### 2. Nav "Gruppenleitung" scrollt korrekt (UAT-7/UAT-9 / 73-07)
expected: Nav-Button heißt "Gruppenleitung" (nicht "Timeline"); Klick scrollt zur Sektion mit id `gruppenleitung`; IntersectionObserver-Highlighting funktioniert; Empty-State-Text lautet "Noch keine Gruppenleitung eingetragen."
result: [pending]

### 3. Höhepunkte vs. Projekte konsistent (UAT-12 / 73-08)
expected: Kein Widerspruch mehr zwischen Höhepunkte-Zähler und Projekte-Sektion (kein "1 Anime-Projekte" während "Noch keine öffentlichen Projekte" angezeigt wird); Zähler nutzt sichtbarkeitsgefilterte anime_count.
result: [pending]

### 4. Geschichte-EmptyState (UAT-8 / 73-09)
expected: Geschichte-Sektion zeigt keinen irreführenden CollapsibleStory-Hauptinhalt mehr; stattdessen EmptyState mit Fakten-Subtitle (z. B. "1999 bis 2022 • Deutschland • aktiv").
result: [pending]

### 5. Gruppenmedien kein Duplikat (UAT-6 / 73-09)
expected: Gruppenmedien-Block wiederholt nicht Logo/Banner aus dem Hero; bei fehlenden freigegebenen Medien wird direkt der EmptyState gezeigt.
result: [pending]

### 6. Kollaboration-Seite (UAT-16 / 73-10)
expected: Bei group_type = collaboration zeigt die Seite ein vereinfachtes Layout mit Hinweis-Block "Dies ist eine Kollaboration zwischen:" und klickbaren Gruppen-Links; kein normales Profil-Layout; keine überflüssigen API-Aufrufe (Projekte/Contributions/Domain/Media feuern nicht).
result: [pending]

### 7. Badge "auch Mitglied" für Angeldust (UAT-5 / 73-10)
expected: Bei Überschneidung zwischen Contributor und Teammitglied (z. B. Angeldust) erscheint neben dem Contributor-Namen ein Badge "auch Mitglied"; keine doppelte/widersprüchliche Darstellung.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
