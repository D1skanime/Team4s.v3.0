---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 09
subsystem: planning
tags: [roadmap, phase-planning, duplikat-inventur, permission-matrix, checkpoint]

# Dependency graph
requires:
  - phase: 175-07
    provides: 175-INVENTORY.md (12 Fachaufgaben, Duplikat-Klassifikationen)
  - phase: 175-08
    provides: 175-PERMISSION-MATRIX.md (44 geprüfte Rechte-Vergleichspunkte, 8 markierte Abweichungen/Befunde)
provides:
  - 175-ROADMAP-PROPOSAL.md mit 8 konkret nummerierten, nutzerbestätigten Folgephasen-Vorschlägen (176-183)
  - Vollständige Zuordnung aller 8 Permission-Matrix-Abweichungen zu Folgephasen
  - Dokumentierter, wörtlich protokollierter Nutzer-Checkpoint-Ausgang (approved with changes)
affects: ["176-bugfix-sammelphase", "177-bild-viewer", "178-suchen-filtern", "179-media-backend-rechte", "180-upload-frontend-workflow", "181-release-bearbeitung", "182-bildspeicher", "183-status-label-konsolidierung"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Phasenvorschlag-Dokument mit Übersichtstabelle + Detailabschnitt je Phase (Ziel/Umfang/Abhängigkeit/Risiko/Aufwandsklasse/Altlast)", "Interne Arbeitspaket-Gliederung mit gegenseitiger Blockierung innerhalb einer Sammelphase"]

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-09-SUMMARY.md
  modified:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md

key-decisions:
  - "Nutzer hat den Phasenzuschnitt mit 'approved with changes' bestätigt, nicht 'approve-as-is' — 6 verbindliche Änderungen wurden in 175-ROADMAP-PROPOSAL.md eingearbeitet (siehe Abschnitt Nutzer-Bestätigung)."
  - "Phase 0 (Bugfix-Sammelphase) erhält die konkrete Nummer 176, Risiko explizit auf 'mittel' gesetzt, intern in 5 gegenseitig geblockte Arbeitspakete gegliedert (Story-Entfernung / Theme-Kürzel OUT / F-05 anime_contributions / Rechte-/Sicherheitsfixes 5.3+6.1+6.2+8.4 / restliche 174-Bugs)."
  - "F-15 (Medien-Upload) wird in zwei sequenzielle Phasen aufgeteilt: 179 Media-Backend/Rechte und 180 Upload-Frontend/-Workflow (180 abhängig von 179)."
  - "Release-Bearbeitung (181) und Medien-Upload (179/180) laufen sequenziell, nicht parallel, da sie denselben Release-Versions-Datenpfad berühren."
  - "Phase 182 (Bildspeicher, F-01) neu ergänzt — Fund stammt aus 174-FOLLOWUPS.md, nicht aus 175-INVENTORY.md, da F-01 kein Fachaufgaben-Duplikat-Cluster ist, sondern bereits in Phase 174 als Legacy-Altlast identifiziert wurde."
  - "Phase 175 legt selbst keine ROADMAP.md-Phasen-Einträge an (D-09) — die bestätigte Nummerierung 176-183 ist ein Vorschlagsergebnis dieses Checkpoints, keine durch diese Phase vorgenommene ROADMAP.md-Änderung; die tatsächliche Anlage erfolgt in einem separaten, nachgelagerten Schritt."

patterns-established:
  - "Checkpoint-Antwort 'approved with changes' wird wörtlich in der SUMMARY dokumentiert und die Änderungen 1:1 in das betroffene Artefakt eingearbeitet, bevor die Phase als abgeschlossen gilt."

requirements-completed: []

# Metrics
duration: ~35min (Checkpoint-Wartezeit ausgenommen)
completed: 2026-10-07
---

# Phase 175 Plan 09: Roadmap-Proposal-Synthese mit Nutzer-Checkpoint Summary

**175-ROADMAP-PROPOSAL.md synthetisiert aus Inventur + Permission-Matrix, vom Nutzer mit sechs verbindlichen Änderungen bestätigt (176-183-Nummerierung, F-15-Aufteilung, neue Phase 182 Bildspeicher) — Phase 175 legt dabei keine ROADMAP.md-Einträge selbst an (D-09).**

## Performance

- **Duration:** ~35 min aktive Bearbeitung (Task 1 + Checkpoint-Antwort-Verarbeitung; reine Nutzer-Wartezeit am Checkpoint nicht mitgezählt)
- **Started:** 2026-10-07T09:27:37Z (Task 1, laut vorherigem Session-Log)
- **Completed:** 2026-10-07T10:11:22Z
- **Tasks:** 2 (Task 1 auto, Task 2 checkpoint:decision — beide abgeschlossen)
- **Files modified:** 1 (175-ROADMAP-PROPOSAL.md, in zwei Schritten: Ersterstellung durch Task 1, Überarbeitung nach Checkpoint-Antwort)

## Accomplishments
- `175-ROADMAP-PROPOSAL.md` deckt jeden Duplikat-Cluster aus `175-INVENTORY.md` (F-13, F-15, F-16, F-18 sowie Status-/Label-Konsolidierung) sowie alle 8 markierten Permission-Matrix-Zeilen mit einer konkreten, nummerierten Folgephase (176-183) ab.
- Der Nutzer-Checkpoint (Task 2) wurde durchlaufen; die Antwort **"approved with changes"** mit sechs verbindlichen Änderungspunkten ist vollständig in das Dokument eingearbeitet.
- F-15 (vormals ein einziger Phasenvorschlag "Medien-Upload") ist jetzt sauber in Backend/Rechte (Phase 179) und Frontend/Workflow (Phase 180) getrennt, mit expliziter Abhängigkeit 180→179.
- Phase 182 (Bildspeicher, F-01) wurde neu ergänzt, obwohl sie in keinem der beiden Quelldokumente (`175-INVENTORY.md`, `175-PERMISSION-MATRIX.md`) als Fachaufgaben-Cluster geführt war — der Fund stammt aus `174-FOLLOWUPS.md` und wird im Dokument mit explizitem Quellenhinweis versehen, um keine falsche Provenienz vorzutäuschen.
- Keine `.planning/ROADMAP.md`-Zeile wurde durch diese Phase verändert (D-09 eingehalten) — nur das Proposal-Dokument.

## Task Commits

Each task was committed atomically:

1. **Task 1: 175-ROADMAP-PROPOSAL.md aus Inventur + Rechte-Matrix synthetisieren** - `d1953c0f` (docs)
2. **Task 2: Nutzer-Checkpoint — Phasenzuschnitt bestätigen (D-09)** - Checkpoint erreicht, Ausführung pausiert; Nutzer-Antwort "approved with changes" (siehe Checkpoint-Resolution unten) verarbeitet in Folge-Commit `ad1b1904` (docs: Überarbeitung des Proposals gemäß Nutzer-Antwort)

**Plan metadata:** (dieser Commit, nach SUMMARY-Erstellung — siehe unten)

_Note: Task 2 ist ein `checkpoint:decision`-Task ohne eigenen Code-Commit; die Umsetzung der Nutzer-Entscheidung erfolgte als separater docs-Commit nach Checkpoint-Auflösung._

## Files Created/Modified
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md` - Vollständig überarbeitet: Phasen 176-183 konkret nummeriert und in Nutzer-bestätigter Reihenfolge dokumentiert, Phase 176 interne Arbeitspaket-Gliederung + Risiko "mittel", F-15 in 179/180 gesplittet, Phase 181/179/180-Sequenzialität dokumentiert, neue Phase 182 (Bildspeicher/F-01) ergänzt, neuer Abschnitt "Nutzer-Bestätigung" mit wörtlicher Wiedergabe der sechs Änderungspunkte und der finalen Reihenfolge.
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-09-SUMMARY.md` - Diese Datei.

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: Der Nutzer hat den Zuschnitt nicht 1:1 übernommen, sondern mit sechs konkreten Änderungen bestätigt (Risiko-Einstufung Phase 176, interne Arbeitspaket-Blockierung, F-05-Checkpoint-Differenzierung, F-15-Aufteilung in zwei Phasen, Sequenzialität Release-Bearbeitung/Medien-Upload, finale Nummerierung/Reihenfolge inkl. neuer Phase 182).

## Checkpoint Resolution (Task 2) — Nutzer-Antwort wörtlich protokolliert

**Checkpoint:** Task 2 — "Nutzer-Checkpoint — Phasenzuschnitt bestätigen (D-09)" (`checkpoint:decision`, gate="blocking")

**Nutzer-Antwort (verbatim):**

> approved with changes — Nutzer hat den Phasenzuschnitt bestätigt, mit folgenden verbindlichen Änderungen. Bitte so in 175-ROADMAP-PROPOSAL.md (Abschnitt "Nutzer-Bestätigung") dokumentieren, Plan 175-09 abschließen (SUMMARY) und die Phase regulär beenden. Phasen NICHT selbst in ROADMAP.md anlegen — das erfolgt anschließend separat.
>
> 1. Phase 0 (Bugfix-Sammelphase) läuft zuerst → wird Phase 176. Risiko "mittel" (nicht gering bis mittel). Intern in klar getrennte, voneinander geblockte Pakete planen (Story-Entfernung / Theme-Kürzel OUT / F-05 anime_contributions / Rechte- und Sicherheitsfixes 5.3, 6.1, 6.2, 8.4 / restliche 174-Bugs).
> 2. In Phase 176: F-05 Ursache im Code beheben; Bestandsdaten-Bereinigung nur nach blockierendem Nutzer-Checkpoint (Freigabe). Story-Entfernung ohne Checkpoint (0 Zeilen).
> 3. Vorschlag 2 (Medien-Upload, F-15) wird aufgeteilt in zwei Phasen: zuerst Media-Backend/Rechte (1.2, 1.4, 1.6, Soft-Delete-Helfer, Theme-Asset-Persistenz), danach Upload-Frontend/-Workflow (gemeinsamer Upload-Baustein).
> 4. Release-Bearbeitung (F-13) und Medien-Upload werden NICHT parallelisiert, sondern laufen sequenziell.
> 5. Reihenfolge nach Nutzerwunsch: 176 Bugfix-Sammelphase, 177 Einheitlicher Bild-Viewer (F-18), 178 Suchen & Filtern (F-16), 179 Media-Backend/Rechte (F-15 Teil 1), 180 Upload-Frontend/-Workflow (F-15 Teil 2), 181 Release-Bearbeitung zusammenführen (F-13), 182 Bildspeicher (F-01, fehlte im Vorschlag — als eigene Phase ergänzt), 183 Status-/Label-Konsolidierung.
> 6. Alle übrigen Inhalte des Vorschlags werden unverändert übernommen.

**Umsetzung:** Alle sechs Punkte wurden 1:1 in `175-ROADMAP-PROPOSAL.md` eingearbeitet (Übersichtstabelle, jeder betroffene Detailabschnitt, Permission-Matrix-Zuordnungstabelle, neuer Abschnitt "Nutzer-Bestätigung" mit wörtlicher Wiedergabe der Antwort und der finalen Reihenfolge 176-183). Commit: `ad1b1904`.

## Deviations from Plan

None - plan executed exactly as written (inklusive des durch den Plan selbst vorgesehenen Checkpoints und dessen Auflösung gemäß Nutzer-Antwort). Keine Rule-1/2/3/4-Abweichungen waren nötig; die Dokument-Überarbeitung war eine direkte, vollständige Umsetzung der expliziten Nutzer-Anweisung.

## Issues Encountered

None. Die bereits vorhandenen, nicht mit 175-09 zusammenhängenden Arbeitsstände im Repo
(`.planning/sketches/MANIFEST.md` als modifiziert, `.planning/sketches/010-galerie-detailansicht/`
als untracked, sowie ein durch einen anderen Prozess vor Beginn dieser Fortsetzung aktualisierter
`last_updated`-Zeitstempel in `.planning/STATE.md`) wurden NICHT angefasst oder committet — sie
liegen außerhalb des Scopes von 175-09 und werden nicht dieser Phase zugeschrieben.

## Wichtiger Hinweis: Keine ROADMAP.md-Änderung durch diese Phase (D-09)

`.planning/ROADMAP.md` wurde durch Plan 175-09 **nicht verändert** und enthält **keine** neuen
Abschnitte für die Phasen 176-183. Die in `175-ROADMAP-PROPOSAL.md` dokumentierte, vom Nutzer
bestätigte Reihenfolge (176 Bugfix-Sammelphase, 177 Bild-Viewer, 178 Suchen & Filtern, 179
Media-Backend/Rechte, 180 Upload-Frontend/-Workflow, 181 Release-Bearbeitung, 182 Bildspeicher,
183 Status-/Label-Konsolidierung) ist ein **Vorschlagsergebnis** dieses Checkpoints. Die
tatsächliche Anlage dieser Phasen in `ROADMAP.md` erfolgt in einem **separaten, nachgelagerten
Schritt außerhalb dieser Phase** — exakt wie von D-09 und der Nutzer-Antwort gefordert. Diese
Phase (175-09) selbst schließt lediglich mit einem aktualisierten Plan-Fortschritt für 175-09 in
`ROADMAP.md`/`STATE.md` ab (Tracking-Update, keine neue Phasen-Sektion).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `175-ROADMAP-PROPOSAL.md` liegt vollständig, nutzerbestätigt und mit konkreter Phasennummerierung (176-183) vor und kann als direkte Grundlage für die separate Anlage dieser Phasen in `ROADMAP.md` dienen.
- Phase 175 (Inventur-Phase) ist mit diesem Plan (175-09, letzter Plan der Phase) inhaltlich abgeschlossen.
- Blocker für die eigentliche Anlage von Phase 176: keine — die Nutzer-Bestätigung liegt vor; die Anlage selbst ist laut D-09 bewusst ein separater, nachgelagerter Schritt außerhalb von Phase 175.
- Ein geparkter Entwurf für Phase 176 (`.planning/notes/176-bugphase-CONTEXT-draft.md`, Commit `be137725`) existiert bereits als Vorarbeit für den nachgelagerten Anlage-Schritt, ist aber kein Bestandteil dieser Phase und wurde hier nicht verändert.

---
*Phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-*
*Completed: 2026-10-07*

## Self-Check: PASSED

- `175-ROADMAP-PROPOSAL.md` exists and contains all 8 phase detail sections (176-183).
- `175-09-SUMMARY.md` exists (this file).
- Commit `d1953c0f` (Task 1) found in git log.
- Commit `ad1b1904` (checkpoint-revision) found in git log.
- `.planning/ROADMAP.md` contains zero matches for "Phase 176".."Phase 183" — confirmed untouched by this plan (D-09 compliance).
