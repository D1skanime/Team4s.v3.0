---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 08
subsystem: docs
tags: [permissions, rights-consistency, audit, inventory, D-05, D-07]

# Dependency graph
requires:
  - phase: 175-01 bis 175-06
    provides: "12 Welle-1-Fachaufgaben-Fragmente (data/01-*.md bis data/12-*.md) mit je einer D-03-Spalte (d) Anzeige-/Durchsetzungs-Rechte-Dokumentation"
provides:
  - "175-PERMISSION-MATRIX.md — D-07-Artefakt 2: konsolidierte Aktion → Anzeige-Recht vs. Durchsetzungs-Recht-Tabelle (44 Zeilen) über alle 12 Fachaufgaben"
  - "6 markierte, unentschiedene Rechte-Abweichungen mit Schweregrad + 174-BUGS.md-Format-Befund-Absatz, keine behoben (D-01)"
  - "2 informative Befunde (strukturell inkonsistent, aktuell unerreichbar/folgenlos)"
  - "Bestätigung: BUG-174-02/BUG-174-04 am aktuellen Code weiterhin behoben"
affects: [175-09-roadmap-proposal]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Permission-Konsistenz-Matrix als Dokumentations-Artefakt (D-07), getrennt von Behebung (D-01)"]

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-PERMISSION-MATRIX.md
  modified: []

key-decisions:
  - "Fachaufgaben 7 (Suchen & Filtern) und 11 (Status-/Label-Darstellung) liefern keine Anzeige-/Durchsetzungs-Rechte-Paare (beide Fragmente dokumentieren durchgängig (d)=n/a) — bewusst ohne Tabellenzeile, mit Begründungsabschnitt statt fabrizierter Zeilen"
  - "Fachaufgabe 10s 9-Aktionen-Stichprobe wurde auf Doppelzählung geprüft: 7 von 9 Aktionen sind bereits unter Fachaufgaben 1/4/5 erfasst, nur 2 neue (Gruppenverwaltung ActionFansubGroupEdit, ActionReleaseVersionMediaReorder) wurden als eigene Zeilen hinzugefügt"
  - "2 strukturell inkonsistente, aber aktuell unerreichbare Befunde (totes Member-Group-Story-Feature, Orphan-Lösch-Endpunkt) wurden als eigene 'n/a'-Kategorie geführt statt in konsistent/abweichend gezwungen"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-10-07
---

# Phase 175 Plan 08: Permission-Matrix Summary

**Konsolidierte Aktion→Anzeige-/Durchsetzungs-Rechte-Tabelle (44 Zeilen über 12 Fachaufgaben) mit 6 markierten, unentschiedenen Abweichungen — reine Dokumentation, keine Code-Änderung**

## Performance

- **Duration:** ~45min
- **Completed:** 2026-10-07
- **Tasks:** 1/1 completed
- **Files modified:** 1 (neu erstellt)

## Accomplishments

- `175-PERMISSION-MATRIX.md` gebaut: alle in den 12 Welle-1-Fragmenten (`data/01-*.md` bis
  `data/12-*.md`) bereits unter D-03 Spalte (d) dokumentierten Anzeige-/Durchsetzungs-Rechte-
  Paare in EINE durchgängige, nach Fachaufgaben-Nummer sortierte Tabelle überführt (44 Zeilen).
- 6 Abweichungen markiert, jeweils mit Schweregrad und einem 174-BUGS.md-Format-Befund-Absatz
  (Gefunden/Ursache/betroffene Rolle/Schweregrad) versehen, OHNE eine davon zu beheben (D-01):
  Gruppenmedien-Upload (zwei parallele Rechte-Ebenen), Anime-Assets-Upload (Anzeige fehlt
  komplett), Theme-Assets-Upload (semantisch falsche Aktion wiederverwendet), Claim-Invite-Accept
  (fehlender `disabled`-Status-Check gegenüber Schwester-Flow), Fansub-Notizen Tab-Gate und
  Button-Ebene (ODER-Gate erlaubt mehr Rollen als die Single-Action-Durchsetzung zulässt).
- 2 zusätzliche informative Befunde (strukturell inkonsistentes Rechte-Modell, aber aktuell
  unerreichbar/folgenlos) separat als "n/a" dokumentiert: totes `Member-Group-Story`-Feature
  (Platform-Admin-Rechte-Modell ohne UI), Orphan-Lösch-Endpunkt für Fansub-Mitglieder (strengeres
  Recht auf einem toten Pfad).
- BUG-174-02 (Dashboard/Gruppenmedien-Review) und BUG-174-04 (Fremd-Edit an Release-Bildern) am
  aktuellen Code als weiterhin behoben bestätigt (2 Zeilen in der Matrix, mit expliziter
  Muster-Referenz).
- Fachaufgaben 7 und 11 explizit als "ohne Rechte-Aktionspaare" dokumentiert (beide Fragmente
  belegen `(d)=n/a` durchgängig) — kein Auslassungsfehler, sondern ein bestätigter Negativbefund.
- Zusammenfassungstabelle am Dokumentende: 44 geprüfte Aktionen gesamt, 36 konsistent, 6
  abweichend (4 mittel, 2 niedrig Schweregrad), 2 n/a.

## Task Commits

Die Aufgabe wurde atomar committet:

1. **Task 1: Konsolidierte Aktion → Anzeige-Recht vs. Durchsetzungs-Recht-Tabelle bauen** -
   `a16cc7c7` (docs)

## Files Created/Modified

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-PERMISSION-MATRIX.md` -
  Konsolidierte 44-Zeilen-Rechte-Konsistenz-Tabelle über alle 12 Fachaufgaben, 6 Befund-Absätze
  zu markierten Abweichungen, 2 informative Zusatzbefunde, Begründungsabschnitt für die zwei
  Fachaufgaben ohne Rechte-Aktionspaare, Gesamtzahlen-Zusammenfassung.

## Decisions Made

- Fachaufgaben 7 und 11 wurden bewusst OHNE Tabellenzeile geführt (beide Fragmente dokumentieren
  durchgängig `(d)=n/a`) statt künstliche Zeilen zu erzeugen, um die acceptance criteria
  ("Datei:Zeile für beide Rechte-Seiten") nicht zu verletzen — stattdessen expliziter
  Begründungsabschnitt am Dokumentende.
- Fachaufgabe 10s Stichprobe (9 Aktionen) wurde auf Überlappung mit anderen Fachaufgaben
  geprüft: 7 von 9 waren bereits anderswo (Fachaufgaben 1/4/5) mit Datei:Zeile belegt — nur die 2
  nicht anderswo dokumentierten Aktionen (Basis-Gruppenverwaltung `ActionFansubGroupEdit`,
  `ActionReleaseVersionMediaReorder`) wurden als eigene Zeilen 10.1/10.2 aufgenommen, um
  Doppelzählung in den Gesamtzahlen zu vermeiden.
- Zwei Befunde (totes Member-Group-Story-Feature, Orphan-Lösch-Endpunkt) sind strukturell
  inkonsistente Rechte-Modelle, aber beide aktuell technisch unerreichbar (kein UI-Konsument
  bzw. kein Frontend-Aufrufer mehr) — diese wurden als eigene "n/a"-Kategorie geführt statt
  erzwungen in "konsistent" oder "abweichend" einsortiert zu werden, um die Unterscheidung
  zwischen "aktiv falsch" und "latent riskant" sichtbar zu halten.

## Deviations from Plan

None - plan executed exactly as written. Die Aufgabe war rein dokumentarisch (Datenextraktion
und -konsolidierung aus bereits vorhandenen Fragmenten), keine Code-Pfade betroffen, keine
Blocker, keine fehlende Funktionalität zu ergänzen.

## Issues Encountered

Beim ersten Entwurf wich die im Dokument genannte Gesamtzahl ("38 geprüfte Aktionen") von der
tatsächlichen Zeilenzahl der Tabelle (44) ab — durch Nachzählen via `grep` (`grep -E '^\|
[0-9]+\.[0-9]+ \|'` kombiniert mit `grep -c '\*\*konsistent\*\*'`/`'\*\*abweichend\*\*'`/
`'\*\*n/a\*\*'`) korrigiert auf die belegten Werte (44 gesamt, 36 konsistent, 6 abweichend, 2
n/a) vor dem Commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`175-PERMISSION-MATRIX.md` liegt vollständig vor und ist bereit als Eingangsmaterial für
`175-ROADMAP-PROPOSAL.md` (Plan 09) — die 6 markierten Abweichungen plus 2 informative Befunde
sind die konkreten Kandidaten, die 175-09 einer Folgephase mit Priorität/Aufwandsklasse zuordnen
muss (D-09: Nutzer bestätigt den Phasenzuschnitt, bevor Folgephasen angelegt werden). Keine
Blocker für die weitere Phasen-Ausführung.

---
*Phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-*
*Completed: 2026-10-07*
