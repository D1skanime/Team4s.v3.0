---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 20
subsystem: ui
tags: [react, nextjs, frontend, proposal-form, tdd]

# Dependency graph
requires:
  - phase: 191-17
    provides: "ReportHintEntryPoint (zweiter Einstiegspunkt in ProposalForm), useFansubGroupSearch-Hook, contributionsEligibility"
  - phase: 191-18
    provides: "ProposalForm.tsx/.steps.tsx Live-UAT-Nachbesserungsrunde zwei (D-10/D-13/D-14)"
provides:
  - "Beide 'Hinweis senden'-Einstiegspunkte (MyProposalsSection, ReportHintEntryPoint) lassen die Erfolgsansicht bis zum aktiven 'Fertig'-Klick stehen (D-17)"
  - "Step3NoteRange steuert den Infopanel-Satz ueber groupScope statt eines booleschen Hinweisart-Flags; Von/Bis-Jahr sind jetzt fuer jeden Scope universell sichtbar (D-19, Vorbereitung fuer D-20/Plan 191-21)"
  - "docs/FRONTEND_ARCHITEKTUR.md dokumentiert die geteilte Erfolgsansicht-Regel beider Einstiegspunkte (D-08)"
affects: [191-21, 191-22, 191-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Caller-seitiges onSuccess bleibt No-op, wenn eine Kindkomponente ihre eigene Erfolgsansicht ueber internen State rendert -- Reload/Unmount gehoert an den aktiven onClose, nie an den Submit-Erfolg selbst"
    - "Logik-Tests fangen die an eine gemockte Kindkomponente uebergebenen Callback-Props ab und rufen sie direkt (in act()) auf, statt den vollen Submit-Flow zu simulieren"

key-files:
  created: []
  modified:
    - frontend/src/components/contributions/ReportHintEntryPoint.tsx
    - frontend/src/components/contributions/ReportHintEntryPoint.test.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.steps.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "onSuccess bleibt in beiden ProposalForm-Aufrufern ein No-op; onClose ist der einzige Trigger fuer Unmount/Reload (D-17)"
  - "Step3NoteRange erhaelt groupScope statt showYearAndInfoPanel; Von/Bis-Jahr sind fuer own UND foreign immer sichtbar, nur der Infopanel-Satz wechselt (D-19)"

patterns-established:
  - "Props-capturing Mock (proposalFormMock) statt Shallow-Stub, wenn ein Test die an eine Kindkomponente uebergebenen Callback-Props pruefen muss"

requirements-completed: [D-17, D-19, D-08, D-15]

# Metrics
duration: 35min
completed: 2026-10-23
---

# Phase 191 Plan 20: Dritte Gap-Closure-Runde (D-17, D-19) Summary

**Beide "Hinweis senden"-Einstiegspunkte lassen die Erfolgsansicht jetzt bis zum aktiven "Fertig"-Klick stehen statt sie beim Submit-Erfolg sofort wegzureissen; der Schritt-3-Infotext unterscheidet jetzt faktisch korrekt zwischen eigener und fremder Gruppe, ohne die fuer D-20 benoetigten Von/Bis-Jahr-Felder zu verlieren.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-23T22:24:00Z
- **Completed:** 2026-10-23T22:32:00Z
- **Tasks:** 2 (beide TDD, je RED+GREEN-Commit)
- **Files modified:** 8

## Accomplishments
- D-17: `ReportHintEntryPoint` und `MyProposalsSection` uebergeben `onSuccess` jetzt als No-op; `ProposalForm`s interne Erfolgsansicht ("Hinweis gesendet") bleibt dadurch tatsaechlich sichtbar, bis der Nutzer aktiv auf "Fertig" klickt (`onClose`). `MyProposalsSection`s `onReload()` ist jetzt an `onClose` gekoppelt statt an den Submit-Erfolg.
- D-19: `Step3NoteRange` zeigt Von/Bis-Jahr jetzt fuer beide `groupScope`-Werte unconditioned (Regressionsschutz fuer D-20/Plan 191-21); nur der Infopanel-Satz wechselt zwischen dem 90-Tage-Text (own) und dem neuen Routing-Satz "Der Hinweis geht an die Leitung der Zielgruppe — oder, falls diese aktuell keine Leitung hat, an den Plattform-Admin. Es passiert nichts automatisch." (foreign).
- Doku-Pflicht (D-08): `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 12 beschreibt jetzt die geteilte Erfolgsansicht-Regel beider Einstiegspunkte.

## Task Commits

Beide Tasks liefen als TDD (`tdd="true"`), je ein RED-Test-Commit gefolgt von einem GREEN-Implementierungs-Commit:

1. **Task 1: D-17 — success view survives onSuccess (RED)** - `4681ee05f` (test)
2. **Task 1: D-17 — success view survives onSuccess (GREEN + Doku)** - `80529b265` (feat)
3. **Task 2: D-19 — groupScope-abhaengiger Infopanel-Satz (RED)** - `42719c521` (test)
4. **Task 2: D-19 — groupScope-abhaengiger Infopanel-Satz (GREEN)** - `e1c95ead8` (feat)

**Plan metadata:** siehe Self-Check unten.

## Files Created/Modified
- `frontend/src/components/contributions/ReportHintEntryPoint.tsx` - `onSuccess` ist No-op, Kommentar erklaert warum
- `frontend/src/components/contributions/ReportHintEntryPoint.test.tsx` - neuer Logik-Test fuer onSuccess/onClose-Verhalten
- `frontend/src/components/contributions/MyProposalsSection.tsx` - `handleFormSuccess` entfernt, `handleFormClose` kombiniert `setShowForm(false)` + `onReload()`
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - props-capturing `ProposalForm`-Mock ersetzt Shallow-Stub, zwei neue Logik-Tests
- `frontend/src/components/contributions/ProposalForm.tsx` - uebergibt `groupScope` statt hartcodiertem `showYearAndInfoPanel={true}`
- `frontend/src/components/contributions/ProposalForm.steps.tsx` - `Step3Props.groupScope` ersetzt `showYearAndInfoPanel`; Von/Bis-Jahr jetzt unconditioned, Infopanel-Satz wechselt per `groupScope`
- `frontend/src/components/contributions/ProposalForm.steps.test.tsx` - `Step3NoteRange`-Testsuite auf `groupScope`-Faelle umgestellt (own/foreign)
- `docs/FRONTEND_ARCHITEKTUR.md` - Abschnitt 12 um die geteilte Erfolgsansicht-Regel ergaenzt

## Decisions Made
- `onSuccess` bleibt bewusst ein No-op statt entfernt zu werden -- die Prop-Schnittstelle von `ProposalForm` bleibt stabil fuer beide Aufrufer, nur das Verhalten am Call-Site aendert sich.
- `showYearAndInfoPanel` wurde vollstaendig durch `groupScope: GroupScope` ersetzt (nicht parallel gehalten), weil die alte Prop nach D-19/D-20 keine korrekte Semantik mehr hatte (sie koppelte zwei unabhaengige Sichtbarkeiten, die jetzt getrennt sind: Jahr-Felder immer sichtbar, Infotext scope-abhaengig).

## Deviations from Plan

None - plan executed exactly as written (inkl. TDD-RED/GREEN-Gate-Sequenz pro Task).

## Issues Encountered
- Die ersten Versionen der neuen Logik-Tests riefen `onSuccess()`/`onClose()` ausserhalb von `act()` auf; dadurch bestand `ReportHintEntryPoint.test.tsx`s neuer Test faelschlich schon VOR der eigentlichen Implementierungsaenderung (React hatte das State-Update beim Pruefen noch nicht geflushed). Mit `act()` um die Callback-Aufrufe gewrappt, zeigte RED korrekt 3 echte Fehlschlaege, bevor die Implementierung angepasst wurde.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-20 (Zeitraum bei fremden Gruppen, `yearContext` in `buildHintSubmitPayload`) kann jetzt auf den jetzt immer sichtbaren Von/Bis-Jahr-Feldern aus Schritt 3 aufbauen, ohne weitere UI-Aenderung an `Step3NoteRange`.
- `ProposalForm.tsx` bleibt bei 448/450 Zeilen -- Plan 191-21 sollte das bei weiteren Aenderungen gegenpruefen.
- Frontend-Container (`team4sv30-frontend`) neu gestartet und per HTTP-Check (`/me/contributions` → 200) sowie Docker-Logs ohne Fehler verifiziert.
- Live-Testdaten `fansub_group_hints` ID 1/2/3 unveraendert (per echter DB-Abfrage bestaetigt, keine Migration/Seed in diesem Plan beruehrt).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 5 key-files und alle 4 Task-Commit-Hashes wurden gegen das Dateisystem bzw. `git log --oneline --all` verifiziert und gefunden.
