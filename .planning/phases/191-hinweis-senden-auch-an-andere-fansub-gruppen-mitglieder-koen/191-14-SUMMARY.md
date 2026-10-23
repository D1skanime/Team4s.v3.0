---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 14
subsystem: frontend
tags: [react, nextjs, vitest, wizard, contributions, d-09]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Frontend-Typ-/API-Client-Spiegel ohne hint_type/requested_role_code (Plan 191-13)"
provides:
  - "ProposalForm.tsx als fester 3-Schritte-Wizard (Gruppe & Projekt -> Rolle -> Hinweis & Zeitraum), keine Hinweisart-Wahl mehr"
  - "ProposalForm.useSubmit.ts routet Submit ausschliesslich nach groupScope (own -> createContributionProposal byte-identisch, foreign -> createFansubGroupHint)"
  - "WIZARD_STEPS-Konstante ersetzt stepsForHintType; WizardStep auf 1|2|3 verengt; SubmittedSummary ohne hintType"
  - "MyProposalsSection.tsx ohne fansub_group-Rollenkatalog-Abfrage/fansubGroupRoles-Prop"
affects: ["191-15 (D-10/D-13/D-14 auf demselben 3-Schritte-Wizard)", "191-16 (FansubGroupHintsReviewSection.tsx, separater verbleibender hint_type-Fussabdruck)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Submit-Routing nach einer einzigen Dimension (groupScope) statt (hintType, groupScope) -- vereinfacht die Fallunterscheidung in useProposalFormSubmit auf zwei statt vier Kombinationen, seit D-09 die zweite Hinweisart gestrichen hat"

key-files:
  modified:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.toggles.tsx
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/ProposalForm.useSubmit.test.ts
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ProposalForm.steps.test.tsx
    - frontend/src/components/contributions/ProposalForm.toggles.test.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
  deleted:
    - frontend/src/components/contributions/ProposalForm.extraSteps.tsx
    - frontend/src/components/contributions/ProposalForm.extraSteps.test.tsx

key-decisions:
  - "WIZARD_STEPS als Modul-Konstante statt einer Null-Argument-Funktion gewaehlt (191-UI-SPEC.md A2 liess beides zu) -- es gibt nur noch eine feste Schrittfolge, eine Funktion ohne Argumente haette keinen Mehrwert gegenueber einer direkt exportierten Konstante gehabt."
  - "submitProposal()'s Validierungsreihenfolge (Gruppe -> Anime -> Rolle -> Jahresbereich) bleibt unveraendert in der Fehler-Prioritaet, nur die hintType-Verzweigung entfaellt -- jeder verbleibende Hinweis braucht ab jetzt unbedingt Anime UND Rolle, keine bedingte Pruefung mehr noetig."

requirements-completed: [D-09, D-15]

# Metrics
duration: ~35min
completed: 2026-10-23
---

# Phase 191 Plan 14: Gap-Closure Live-UAT-Nachbesserung (Hinweisart-Dimension entfernen) Summary

**Der "Hinweis senden"-Assistent ist auf einen festen Drei-Schritte-Ablauf (Gruppe & Projekt -> Rolle -> Hinweis & Zeitraum) reduziert -- jede Code-Spur der gestrichenen Mitgliedschaftsanfrage (hint_type, HintTypeToggle, Step0HintType, StepRoleOptional, requestedRoleCode) ist aus ProposalForm/.steps/.toggles/.useSubmit/MyProposalsSection entfernt, waehrend der byte-identische Korrektur-an-eigene-Gruppe-Pfad unveraendert bleibt.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-23T20:10:00Z (approx.)
- **Completed:** 2026-10-23T20:30:00Z (approx.)
- **Tasks:** 2 completed
- **Files modified:** 10 modified, 2 deleted

## Accomplishments

- `ProposalForm.useSubmit.ts` routet `submit` jetzt ausschliesslich nach `groupScope`: `'own'` bleibt exakt auf `createContributionProposal` (byte-identisches Payload, Regressionstest beweist es), `'foreign'` geht immer auf `createFansubGroupHint` -- keine `(hintType, groupScope)`-Fallunterscheidung mehr. Die 409-Fehlerprioritaet (Eigene-Gruppe-Konflikttext vor dem generischen D-04(1)-Text) ist exakt erhalten, nur ohne die jetzt ueberfluessige `hintType==='correction'`-Bedingung.
- `WIZARD_STEPS` ersetzt `stepsForHintType` mit den drei festen Titeln `Gruppe & Projekt`/`Rolle`/`Hinweis & Zeitraum`; `WizardStep` ist auf `1|2|3` verengt, `SubmittedSummary` hat kein `hintType`-Feld mehr und `animeTitle` ist jetzt Pflicht (jeder verbleibende Hinweis hat ein Projekt).
- `ProposalForm.toggles.tsx` hat nur noch `GroupScopeToggle` -- `HintType`, `HINT_TYPE_OPTIONS`, `HintTypeToggle` sind entfernt, `RadioToggle` bleibt als geteilte Basis unveraendert.
- `ProposalForm.extraSteps.tsx` (`Step0HintType`/`StepRoleOptional`) und die zugehoerige Testdatei sind komplett geloescht (`git rm`) -- beide Exporte waren ausschliesslich fuer die gestrichene Mitgliedschaftsanfrage da.
- `ProposalForm.tsx`: `step` ist jetzt `1|2|3`, startet bei `1` ("Gruppe & Projekt"); `hintType`/`hintTypeError`/`requestedRoleCode`/`isCorrection` sind vollstaendig entfernt. Der Anime/Projekt-Picker und das Von/Bis-Jahr+90-Tage-Panel rendern unbedingt statt an `isCorrection` gebunden zu sein. `goNext()` hat keine Schritt-1-Validierung mehr (die eigentliche Pruefung bleibt in `submitProposal()`, wie vom Plan-Task explizit vorgegeben).
- `ProposalForm.steps.tsx`: `Step1GroupProject` verliert die `hintType`-Prop; der Anime/Projekt-`ChoiceSelect` und das Breadcrumb-Anime-Fragment rendern jetzt unbedingt.
- `MyProposalsSection.tsx`: die `useRoleCatalog('fansub_group')`/`fansubGroupRoles`-Abfrage ist entfernt, `ProposalForm` bekommt keine `fansubGroupRoles`-Prop mehr. Der stale "A6-Fix (191-UI-SPEC.md) ... D-06b"-Kommentar ist fachlich umformuliert: er beschreibt jetzt, WAS die Trigger-Button-Gating-Regel ist (Knopf darf nicht an `ownGroups.length>0` haengen, weil ein Hinweis sich auf eine fremde Gruppe ohne eigene Mitgliedschaft beziehen kann) und WARUM (die Seite rendert ohnehin erst nach dem bestandenen `isEligibleForContributions`-Gate) -- ohne Phasen-/D-Verweis als alleinige Begruendung (D-15).
- Alle betroffenen Testdateien (`ProposalForm.test.tsx`, `.steps.test.tsx`, `.toggles.test.tsx`, `.useSubmit.test.ts`, `MyProposalsSection.test.tsx`) sind auf den neuen Drei-Schritte-Ablauf umgeschrieben -- weiterhin Logik-/Hook-Tests statt vollstaendiger Render-/Klick-Simulationen fuer die Payload-/Routing-Logik (CLAUDE.md-Teststil).
- Frontend-Container neu gestartet; `/me/contributions` und `/` antworten mit HTTP 200, keine Compile-/Runtime-Fehler im aktuellen Container-Log (die beim Neustart kurz aufgetretenen "Module not found"-Meldungen stammten vom VOR dem Neustart laufenden alten Prozess und sind nach dem frischen Compile verschwunden).

## Task Commits

Each task was committed atomically:

1. **Task 1: Collapse useSubmit.ts, delete extraSteps.tsx, trim toggles.tsx** - `4aef63dc5` (feat)
2. **Task 2: Collapse ProposalForm.tsx/.steps.tsx to 3-step wizard, fix MyProposalsSection** - `26655e987` (feat)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - Submit routet nur noch nach `groupScope`; `WIZARD_STEPS` ersetzt `stepsForHintType`; `WizardStep`/`SubmittedSummary`/`SubmitTarget`/`buildHintSubmitPayload` ohne `hintType`/`requestedRoleCode`
- `frontend/src/components/contributions/ProposalForm.useSubmit.test.ts` - Fixtures/Tests auf die neue `SubmitTarget`-Form ohne `hintType` umgeschrieben, Mitgliedschaftsanfrage-Tests entfernt, ein neuer Test fuer die 409-Prioritaet ergaenzt
- `frontend/src/components/contributions/ProposalForm.toggles.tsx` - `HintType`/`HINT_TYPE_OPTIONS`/`HintTypeToggle` entfernt
- `frontend/src/components/contributions/ProposalForm.toggles.test.tsx` - `HintTypeToggle`-Tests entfernt
- `frontend/src/components/contributions/ProposalForm.extraSteps.tsx` - geloescht (`Step0HintType`/`StepRoleOptional`)
- `frontend/src/components/contributions/ProposalForm.extraSteps.test.tsx` - geloescht
- `frontend/src/components/contributions/ProposalForm.tsx` - 3-Schritte-Wizard, kein `hintType`/`isCorrection`/`fansubGroupRoles` mehr
- `frontend/src/components/contributions/ProposalForm.steps.tsx` - `Step1GroupProject` ohne `hintType`-Prop, Anime/Projekt-Bereich unbedingt sichtbar
- `frontend/src/components/contributions/ProposalForm.test.tsx` - Tests auf den 3-Schritte-Ablauf angepasst (keine Hinweisart-Wahl mehr)
- `frontend/src/components/contributions/ProposalForm.steps.test.tsx` - Tests ohne `hintType`-Prop
- `frontend/src/components/contributions/MyProposalsSection.tsx` - kein `fansub_group`-Rollenkatalog/`fansubGroupRoles` mehr, Kommentar fachlich umformuliert (D-15)
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - Rollenkatalog-Mock vereinfacht

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npm --prefix frontend run typecheck` (Gesamtprojekt) bleibt nach diesem Plan ROT -- erwartungsgemaess, nicht im Scope dieses Plans: `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx`/`.test.tsx` verwenden weiterhin `FansubGroupHintType`/`hint_type`/`requested_role_label`, die bereits in Plan 191-13 aus dem geteilten Typ-/API-Client-Spiegel entfernt wurden. Diese Datei ist explizit Scope von Plan 191-16 (`191-16-PLAN.md` listet `FansubGroupHintsReviewSection.tsx` in seinen `files_modified`), nicht dieses Plans -- die `<verification>`-Zeile des 191-14-Plan-Texts ("`npm --prefix frontend run typecheck` ... passes") bezieht sich wie bereits in 191-13-SUMMARY.md dokumentiert auf den Gesamtzustand NACH 191-16, nicht auf den Zwischenstand dieses Einzelplans. Der scope-genaue Verify-Befehl aus dem Plan-Task (`npm --prefix frontend run test -- ProposalForm ProposalForm.toggles` bzw. `ProposalForm MyProposalsSection`) ist vollstaendig gruen. `grep -rn "HintTypeToggle|Step0HintType|StepRoleOptional|stepsForHintType|fansubGroupRoles" frontend/src` bestaetigt: ausserhalb von `FansubGroupHintsReviewSection.tsx` (191-16-Scope) existiert keine verbleibende Referenz mehr.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness

- Plan 191-15 (D-10/D-13/D-14) kann direkt auf dem jetzt festen 3-Schritte-Wizard aufsetzen (`ProposalForm.tsx`/`.steps.tsx`/`.useSubmit.ts` sind in `files_modified` von 191-15 erneut gelistet, fuer die Umstellung der Fremd-Gruppen-Projektliste auf die oeffentliche Quelle und die CSS-/Text-Korrekturen).
- Plan 191-16 (`FansubGroupHintsReviewSection.tsx`) kann unabhaengig fortfahren -- der dort verbleibende `hint_type`-Fussabdruck ist der letzte im gesamten Frontend (bestaetigt per grep).
- `npm --prefix frontend run test -- src/components/contributions` (gesamte Komponentenfamilie inkl. unveraenderter Nachbardateien) ist vollstaendig gruen: 11 Testdateien, 53 Tests.
- Frontend-Container (`team4sv30-frontend`) neu gestartet, `/me/contributions` und `/` antworten mit HTTP 200.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 6 genannten Dateien existieren auf der Festplatte, `ProposalForm.extraSteps.tsx` ist bestätigt gelöscht, und beide Task-Commit-Hashes (`4aef63dc5`, `26655e987`) sind per `git log --oneline --all | grep` im Git-Verlauf auffindbar.
