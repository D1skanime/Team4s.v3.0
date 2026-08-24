---
status: complete
phase: 139-scalable-user-admin-projections
source: [139-10-PLAN.md Task 2, 139-VALIDATION.md Manual-Only Verifications]
started: 2026-08-24T00:00:00Z
updated: 2026-08-24T00:00:00Z
tester: live click-through as platform admin (D1sk) via 127.0.0.1:3300
---

## Current Test

[live UAT abgeschlossen — alle sechs Pruefungen bestanden, siehe Befund und Randbemerkung unten]

## Tests

### 1. Uebersicht-Tab — gebuendelter Aufruf, D-05-Inhalt unveraendert
expected: Die Uebersicht (Standard-Tab) laedt jede Gruppenzusammenfassung mit hoechstens einer
rechte-bezogenen Netzwerkanfrage; GroupSummaryCard zeigt Rolle + bis zu 3 Capabilities +
Abweichungszeile unveraendert im Vergleich zur in Phase 138 ausgelieferten D-05-Form.
result: [passed] Uebersicht laedt mit gebuendeltem Aufruf, D-05-Inhalt unveraendert.

### 2. Beitraege-Tab — Projektstandard sichtbar, Abweichung mit Inline-Delta, "Nur Abweichungen" funktioniert
expected: Anime/Projekt-Bloecke zeigen den Projektstandard immer sichtbar; mindestens ein Projekt
zeigt ein "Abweichung vom Projektstandard"-Badge MIT Inline-Delta-Text ohne Klick, auf der von
139-06 seed-geschriebenen Zeile; "Nur Abweichungen" grenzt korrekt ein statt ein leeres Ergebnis
zu liefern.
result: [passed] Beitraege zeigen Buddy Complex -> New-Subs, Projektstandard sichtbar ohne Klick,
Abweichung vom Projektstandard mit Inline-Delta "zusaetzliche Rolle(n): translator."; "Nur
Abweichungen" geht serverseitig durch (`?only_deviations=1` in der Request-URL).

### 3. Medien-Tab — Release/Episode-Gruppierung, genau ein Oeffnen-Button, keine Detail-Leaks
expected: Elemente gruppiert unter Release/Episode-Bloecken, Thumbnails laden lazy, genau ein
"Release-Medien oeffnen"-Button je Block zur korrekten `/me/releases/{id}/workspace`-Route; kein
"Berechtigung aktiv/fehlt"-Badge, kein roher `release_version:<id>`-Text, keine
Speicherpfad-/Format-Analyse-Texte irgendwo (D18).
result: [passed] Medien gruppiert als "Episode 1 - Version 1", genau eine Aktion "Release-Medien
oeffnen" je Block, kein "Berechtigung aktiv/fehlt", kein `release_version:<id>`, keine
Speicherpfade.

### 4. Rechte-Tab — Lazy-Fetch, kein Fan-out beim Laden
expected: Kein Gruppenrecht ist sichtbar, bevor eine Gruppe explizit ausgewaehlt wurde; Auswahl
einer Gruppe holt ausschliesslich diese Gruppe (kein Burst paralleler
effective-rights-Anfragen beim Tab-Laden).
result: [passed] null effective-rights-Requests beim Laden, nach Auswahl nur Gruppe 1.

**Dokumentierte Randbemerkung zu Test 4 (kein Fehler, kein uebersprungener Check):** Das fuer die
Live-Pruefung genutzte Test-Admin-Konto (D1sk) hat nur EINE Gruppenmitgliedschaft. Bei nur einer
Gruppe ist "lazy fetch nach Auswahl" von "eager fetch der einen vorhandenen Gruppe" durch reine
Beobachtung im Browser nicht unterscheidbar — beide Verhaltensweisen erzeugen dasselbe sichtbare
Bild (null Requests vor Auswahl, ein Request nach Auswahl von Gruppe 1, da es nur diese eine
Gruppe gibt). Der eigentliche Beweis, dass Check 4 auch fuer Benutzer mit MEHREREN
Gruppenmitgliedschaften haelt, liefern nicht die Live-Klicks, sondern die zwei gruenen
automatisierten Regressionstests aus 139-07 (`UserGroupRightsTab.test.tsx` und
`UserOverviewTab.test.tsx`, siehe 139-VALIDATION.md Per-Task Verification Map, Requirement
UADM-06), die exakt-einmal-pro-Gruppe-Fetch-Verhalten ueber mehrere Gruppen hinweg pinnen. Der
Mensch hat Check 4 dennoch explizit als BESTANDEN markiert — diese Anmerkung ist ein
dokumentierter Rest-Nachweis-Hinweis (scope note), keine Ausnahme und kein Fehlschlag.

### 5. Schmale Breite (394px) — kein Seitenueberlauf
expected: Bei 394px Viewportbreite kein Seitenueberlauf auf Beitraege- und Medien-Tab; Filterleiste
staffelt auf eine Spalte, Kartenkoepfe brechen um statt zu ueberlaufen.
result: [passed] Bei 394px scrollWidth gleich clientWidth, null ueberstehende Elemente.

### 6. Tastaturbedienung mit sichtbarem Fokus
expected: Jedes Filter-/Pagination-Steuerelement auf beiden neuen Tabs ist per Tastatur erreichbar
und bedienbar (Enter/Space aktiviert Buttons, Pfeil/Enter funktioniert fuer Select) mit sichtbarem
Fokusring.
result: [passed] 40 `:focus-visible`-Regeln ueber die globalen Primitives vorhanden.

## Regressionsabgleich gegen 139-BASELINE.md

Keine einzige neu rote Datei. 43 Fehler in 15 Dateien gegen zuvor 45 in 16 — drei Dateien sind
gruen geworden. Seed hat 2 `independent`-Zeilen angelegt (release_version_id 1
identisch/set-gleich zum Projektstandard, release_version_id 2 echt abweichend, siehe
139-06-SUMMARY.md).

## Verbatim-Bericht des Testers (D1sk, live nachgemessen)

> approved — alle sechs Pruefungen bestanden, unabhaengig live nachgemessen: (1) Uebersicht laedt
> mit gebuendeltem Aufruf, D-05-Inhalt unveraendert. (2) Beitraege zeigen Buddy Complex -> New-Subs,
> Projektstandard sichtbar ohne Klick, Abweichung vom Projektstandard mit Inline-Delta
> "zusaetzliche Rolle(n): translator."; Nur-Abweichungen geht serverseitig durch
> (?only_deviations=1 in der Request-URL). (3) Medien gruppiert als Episode 1 - Version 1, genau
> eine Aktion Release-Medien oeffnen, kein Berechtigung-aktiv/fehlt, kein release_version:<id>,
> keine Speicherpfade. (4) Rechte-Tab: null effective-rights-Requests beim Laden, nach Auswahl nur
> Gruppe 1. (5) Bei 394px scrollWidth gleich clientWidth, null ueberstehende Elemente. (6) 40
> :focus-visible-Regeln ueber die globalen Primitives vorhanden. Regressionsabgleich gegen
> 139-BASELINE.md: keine einzige neu rote Datei; 43 Fehler in 15 Dateien gegen zuvor 45 in 16, drei
> Dateien sind gruen geworden. Seed hat 2 independent-Zeilen angelegt. Einschraenkung fuer den
> Bericht: D1sk hat nur eine Gruppenmitgliedschaft, daher kann die Live-Pruefung lazy nicht von
> Fan-out-ueber-eine-Gruppe unterscheiden — der Beweis liegt in den beiden gruenen
> Regressionstests.

## Findings

Keine. Alle sechs Pruefungen bestanden ohne Abweichung vom erwarteten Verhalten.

## Summary

total: 6
passed: 6
issues: 0
pending: 0
blocked: 0
skipped: 0

## Resolution

139-10-PLAN.md Task 2 (`type="checkpoint:human-verify" gate="blocking"`) ist damit geschlossen.
Phase 139 ist vollstaendig: alle 10 Plaene abgeschlossen, UADM-02 bis UADM-08 und QUAL-06 tragen
je mindestens einen realen automatisierten Test (139-VALIDATION.md Per-Task Verification Map) und
die beiden manuell-only Verifikationen (Container-Query-Ueberlauf, live F-03-Daten) sind
menschlich bestaetigt.
