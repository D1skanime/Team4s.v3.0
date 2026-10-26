---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 37
subsystem: contributions
tags: [postgres, migration, nextjs, vitest, go, release-scope]

requires:
  - phase: 191-32
    provides: "Migration 0189 (release-scoped unique index), serverseitige Release-Validierung, dynamische 409-Meldung, Release-Spalten in den drei Lesepfaden"
  - phase: 191-33
    provides: "useProposalFormReleaseOptions-Hook (öffentliche Release-Liste, ein Datenpfad für eigene UND fremde Gruppe)"
  - phase: 191-34
    provides: "ProposalReleaseSelect im Formular, release-/projektbezogene 409-Texte im Frontend"
  - phase: 191-35
    provides: "Korrekter Projekttitel + Release-Vorauswahl auf der öffentlichen Release-Seite (D-30-Bugfix)"
  - phase: 191-36
    provides: "Release-Anzeige in Absender-, Leader- und Plattform-Admin-Liste"
provides:
  - "D-36-Vorabprüfung: sechs echte API-Aufrufe beweisen Release-Koexistenz, release-/projektgenaue 409-Konflikterkennung und serverseitige Release-Validierung gegen echte Live-Daten"
  - "D-35: Testdatensatz ID 6 real per SQL gelöscht, IDs 2/3/5 nachweislich unverändert"
  - "DECISIONS.md-Eintrag für D-29 bis D-36"
  - "Vom Nutzer live bestätigter, freigegebener Checkpoint — Phase 191 ist damit funktional abgeschlossen"
affects: [191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen]

tech-stack:
  added: []
  patterns:
    - "D-36/D-28/D-22-Linie: Vorabprüfung eines Agenten über echte API-Aufrufe mit vollständiger (nicht stichprobenhafter) Abdeckung aller betroffenen Entitäten, bevor ein Live-Checkpoint dem Nutzer vorgelegt wird"

key-files:
  created:
    - .planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/191-37-HUMAN-UAT.md
  modified:
    - DECISIONS.md
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx

key-decisions:
  - "Checkpoint-Ergebnis: Nutzer hat die Checkliste aus Plan 191-37 Task 3 (Punkte 1-5) am 26.10. live bestätigt — alle bestanden."
  - "Während der Live-Abnahme zusätzlich gefunden und vom Nutzer selbst direkt behoben (Commit a7893aeaf, nicht Teil dieses Plans, aber für den Phasenabschluss übernommen): ContributionsReviewSection (Beitragsvorschläge an die EIGENE Gruppe) war nirgends produktiv eingebunden -- ein vorbestehender Zustand aus der Zeit vor Phase 191 (seit der Konsolidierung des „vorschlaege"-Tabs in „pruefungen" verwaist), der durch den neuen, direkt benachbarten FansubGroupHintsReviewSection-Mount in dieser Phase erst sichtbar/bemerkbar wurde. Jetzt gemountet im Collaboration-Tab direkt neben FansubGroupHintsReviewSection, gleiches can_manage_members-Gate."

requirements-completed: [D-35, D-36]

duration: ~2h (Task 1+2) + Live-Checkpoint-Wartezeit
completed: 2026-10-26
---

# Phase 191 Plan 37: D-36-Vorabprüfung, D-35-Löschung, DECISIONS.md, finaler Live-Checkpoint — Summary

**Sechs echte API-Aufrufe beweisen den release-genauen Doppel-Hinweis-Schutz (D-29/D-31/D-32/D-33) gegen die echte Live-Datenbank; der finale Live-Checkpoint der fünften Nachbesserungsrunde ist vom Nutzer am 26.10.2026 freigegeben — Phase 191 ist damit abgeschlossen.**

## Performance

- **Tasks:** 3/3 (Task 1+2 per Executor-Agent, Task 3 Checkpoint vom Nutzer approved)
- **Files modified:** 3 (DECISIONS.md, 191-37-HUMAN-UAT.md neu, plus eine Nutzer-eigene Nachbesserung außerhalb dieses Plans)

## Accomplishments

- D-36: Sechs reale `POST /api/v1/me/fansub-group-hints`-Aufrufe (Konten `jeahn45@team4s.de` und
  `timer@team4s.de`, echte Keycloak-Tokens) bestätigen lückenlos: zwei offene Hinweise zu
  unterschiedlichen Releases desselben Projekts koexistieren (D-32); derselbe Release-Hinweis ein
  zweites Mal ergibt 409 mit der release-spezifischen Meldung (D-33); „ganzes Projekt" zweimal
  ergibt 409 mit der projektspezifischen Meldung; ein Release eines falschen Anime UND ein Release
  einer nicht beteiligten Zielgruppe ergeben beide 404 (D-31). Vollständiges Transkript in
  `191-37-HUMAN-UAT.md`.
- D-35: `DELETE FROM fansub_group_hints WHERE id = 6` real ausgeführt, Vorher-/Nachher-Snapshot
  bestätigt IDs 2/3/5 feldweise unverändert; die drei im eigenen D-36-Check erzeugten Zeilen
  (8, 9, 13) wurden bewusst nicht gelöscht.
- DECISIONS.md: neuer, datierter Eintrag für D-29 bis D-36 ganz oben, über allen bisherigen
  Phase-191-Einträgen.
- Volle Backend-/Frontend-Regression grün, visuelle Live-Prüfung (Playwright, echte Logins) aller
  vier betroffenen Oberflächen ohne Abweichung.
- **Live-Checkpoint freigegeben:** Der Nutzer hat am 26.10.2026 alle fünf Checklistenpunkte aus
  Plan 191-37 Task 3 live im Browser bestätigt ("Checkliste 1-5 alle bestanden").
- **Zusätzlich während der Abnahme gefunden und behoben (Commit `a7893aeaf`, vom Nutzer selbst,
  außerhalb dieses Plans, aber für den Phasenabschluss zu berücksichtigen):** Beitragsvorschläge
  an die EIGENE Gruppe (`anime_contributions`, `ContributionsReviewSection`) waren für den
  Gruppenleiter nirgends sichtbar — die Komponente war seit der Konsolidierung des „vorschlaege"-
  Haupttabs in „pruefungen" (vor Phase 191) verwaist, ohne Mountpunkt in Produktionscode. Durch den
  neuen, direkt benachbarten `FansubGroupHintsReviewSection`-Mount in `FansubDetailsTab.tsx` (Plan
  191-08) ist dieser vorbestehende Zustand erst aufgefallen. Jetzt behoben: beide Review-Listen
  (Hinweise an fremde Gruppen UND Beitragsvorschläge an die eigene Gruppe) laufen im Collaboration-
  Tab unter demselben `can_manage_members`-Gate zusammen. Verifiziert: `tsc --noEmit` clean, volle
  `admin/fansubs`-Testsuite (51 Dateien, 409 Tests) grün nach dem Fix.

## Task Commits

1. **Task 1: D-36-Vorabprüfung + D-35-Löschung** - `51c355b78` (docs)
2. **Task 2: DECISIONS.md + Regression + visuelle Prüfung** - `eadf6c264` (docs)
3. **Task 3: Live-Checkpoint** - vom Nutzer approved (2026-10-26, keine eigene Code-Änderung dieses
   Plans); zusätzlich während der Abnahme vom Nutzer selbst behoben: `a7893aeaf` (fix, außerhalb
   dieses Plans, aber phasenrelevant)

## Files Created/Modified

- `.planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/191-37-HUMAN-UAT.md` - vollständiges D-36/D-35-Transkript
- `DECISIONS.md` - neuer Eintrag D-29 bis D-36
- `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` - ContributionsReviewSection jetzt mitgemountet (Nutzer-Fix, siehe oben)

## Decisions Made

Siehe `key-decisions` im Frontmatter — insbesondere die Übernahme des während der Live-Abnahme
gefundenen und vom Nutzer selbst behobenen, vorbestehenden Sichtbarkeits-Lücke
(`ContributionsReviewSection`) in den Phasenabschluss.

## Deviations from Plan

None, die diesen Plan selbst betreffen — Task 1 und Task 2 liefen exakt wie geplant. Die einzige
Abweichung vom engen Plan-Scope ist die bewusste, vom Nutzer angeordnete Übernahme von Commit
`a7893aeaf` in den Phasenabschluss (kein Rollback, keine Wiederholung — bereits live verifiziert).

## Issues Encountered

Tageslimit (`FansubGroupHintDailyLimitMiddleware`, D-04) wurde im D-36-Check durch die Vorab-
Prüfungen aus früheren Runden am selben Kalendertag für `jeahn45@team4s.de` erreicht — gelöst durch
Wechsel auf ein zweites, ebenfalls echtes Testkonto (`timer@team4s.de`) für Schritt 6. Kein Bug,
korrektes D-04-Verhalten (siehe `191-37-HUMAN-UAT.md` Schritt 6).

## User Setup Required

None.

## Next Phase Readiness

Phase 191 ("Hinweis senden" auch an andere Fansub-Gruppen) ist mit diesem Plan vollständig
abgeschlossen — alle 37 Pläne über sechs Live-UAT-Runden ausgeführt und final freigegeben. Drei
vom Nutzer für eine SPÄTERE Phase vorgemerkte, bewusst NICHT in dieser Phase umgesetzte Punkte
(Konzept Hinweis-vs-Fehlermeldung, Release-/Folgen-Rollen im Mitgliederprofil,
Crew-Zuweisung-nach-Hinweisbestätigung) sind in einer neuen Todo-Datei festgehalten (siehe
`.planning/todos/pending/`).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-26*
