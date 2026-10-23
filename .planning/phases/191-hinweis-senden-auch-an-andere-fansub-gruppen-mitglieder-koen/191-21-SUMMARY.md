---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 21
subsystem: ui
tags: [react, nextjs, frontend, go, proposal-form, tdd, docs]

# Dependency graph
requires:
  - phase: 191-20
    provides: "Von/Bis-Jahr-Felder in Step3NoteRange universell sichtbar fuer own UND foreign (Voraussetzung fuer D-20)"
provides:
  - "buildHintSubmitPayload bettet einen eingegebenen Von/Bis-Jahr-Zeitraum als 'Zeitraum: ...'-Klartext-Fragment in die Hinweis-Notiz ein, statt ihn bei Fremdgruppen-Hinweisen zu verwerfen (D-20)"
  - "Vier identifizierte, reine Label-Kommentare (main.go x2, ProposalForm.useSubmit.ts, ProposalForm.tsx) fuehren jetzt mit der tatsaechlichen D-09/D-11-Fachregel statt mit einem blossen D-10/Incident-Label (D-21)"
affects: [191-22, 191-23, 191-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zeitraum-Komposition folgt exakt dem bestehenden Rollen-Klartext-Muster (roleContext) -- ein weiteres, unabhaengiges Notiz-Fragment, nicht eine Variante desselben Strings"
    - "Kommentar-only Commits (main.go, ProposalForm.useSubmit.ts/.tsx Doku-Nachzug) werden isoliert von der behavioralen D-20-Aenderung committet, damit der Diff pro Commit nachvollziehbar bleibt"

key-files:
  created: []
  modified:
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/ProposalForm.useSubmit.test.ts
    - frontend/src/components/contributions/ProposalForm.tsx
    - backend/cmd/server/main.go

key-decisions:
  - "yearContext wird als eigenstaendiges drittes Fragment zwischen roleContext und der freien Notiz eingefuegt (Reihenfolge Rolle - Zeitraum - Notiz), nicht in den bestehenden roleContext-String verschachtelt -- haelt beide Fragmente unabhaengig testbar."
  - "buildCorrectionOwnPayload (Eigengruppen-Pfad, echte started_year/ended_year-Spalten) bleibt unveraendert -- D-20 betrifft ausschliesslich den fansub_group_hints-Pfad, der kein Zeitraum-Feld in der DB hat."
  - "D-21-Kommentare behalten die D-Nummern als sekundaeren Verweis (CLAUDE.md erlaubt das zusaetzlich zur fachlichen Erklaerung), nur die 'D-10 (Live-UAT-Bugfix)'/'live reproduziert'-Rahmung als ALLEINIGE Begruendung wurde entfernt."

patterns-established: []

requirements-completed: [D-20, D-21, D-08, D-15]

# Metrics
duration: 25min
completed: 2026-10-23
---

# Phase 191 Plan 21: Dritte Gap-Closure-Runde (D-20, D-21) Summary

**Ein eingegebener Von/Bis-Jahr-Zeitraum geht bei einem Korrektur-Hinweis an eine fremde Fansub-Gruppe nicht mehr verloren, sondern erscheint als lesbares "Zeitraum: ..."-Fragment in der Notiz; vier zuvor rein auf ein Decision-/Incident-Label gestuetzte Code-Kommentare beschreiben jetzt zuerst die tatsaechliche D-09/D-11-Fachregel.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-23T22:38:00Z
- **Completed:** 2026-10-23T22:46:00Z
- **Tasks:** 2 (Task 1 TDD mit RED+GREEN-Commit, Task 2 Kommentar-only)
- **Files modified:** 4

## Accomplishments

- **D-20:** `buildHintSubmitPayload` erhaelt zwei neue optionale Parameter (`startedYear`,
  `endedYear`) und berechnet daraus ein `yearContext`-Fragment nach exakt dem dokumentierten
  Schema: beide Jahre → `"Zeitraum: {von}–{bis}"`; nur Von → `"Zeitraum: ab {von}"`; nur Bis →
  `"Zeitraum: bis {bis}"`; keines → kein Fragment. Die `combinedNote` ordnet jetzt Rolle →
  Zeitraum → freie Notiz. `submit()`s Fremdgruppen-Zweig forwardet `target.startedYear`/
  `target.endedYear` (die bereits seit Plan 191-20 ueberall im Formular vorhanden sind) in den
  Payload-Builder. Der unveraenderte Eigengruppen-Pfad (`buildCorrectionOwnPayload`, echte
  `started_year`/`ended_year`-DB-Spalten) ist davon nicht betroffen.
- **D-21:** Vier Kommentare auf den tatsaechlichen D-09/D-11-Stand gebracht, reiner Kommentar-Diff
  ohne Verhaltensaenderung:
  - `main.go` (Konstruktion `fansubGroupHintsRepo`): beschreibt jetzt das Fehlen jeglicher
    Rollenvalidierung (D-09) statt der nie (mehr) existierenden `histGroupMemberRolesRepo`-
    Wiederverwendung.
  - `main.go` (Konstruktion `adminFansubGroupHintsHandler`): beschreibt jetzt das D-11-Routing
    "Zielgruppe ohne aktive Leitung" statt des durch D-09 gestrichenen
    `fansub_lead`-Mitgliedschaftsanfrage-Sonderfalls.
  - `ProposalForm.useSubmit.ts` (Doc-Kommentar `ProposalAnimeOption`): die fachliche Regel (zwei
    Datenquellen je `groupScope`) steht jetzt an erster Stelle, D-10 nur noch als Verweis.
  - `ProposalForm.tsx` (`loadGroupAnime`): dieselbe Umstellung -- fachliche Begruendung zuerst,
    D-10 als sekundaerer Verweis, "live reproduziert" entfernt.

## Task Commits

1. **Task 1 — D-20 Zeitraum-Fragment (RED)** - `eefbd50fd` (test)
2. **Task 1 — D-20 Zeitraum-Fragment (GREEN)** - `36a7e203b` (feat)
3. **Task 2 — D-21 Kommentar-Nachzug (comment-only)** - `d99025504` (docs)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - `buildYearContext`-Helper,
  `BuildHintPayloadParams.startedYear/endedYear`, `combinedNote`-Reihenfolge
  Rolle/Zeitraum/Notiz, `submit()` forwardet beide Felder; `ProposalAnimeOption`-Doc-Kommentar
  fachlich umformuliert (D-21)
- `frontend/src/components/contributions/ProposalForm.useSubmit.test.ts` - 6 neue Testfaelle
  (beide Jahre, nur Von, nur Bis, keines, Rolle+Zeitraum+Notiz-Reihenfolge,
  `submit()`-Forwarding-Regression)
- `frontend/src/components/contributions/ProposalForm.tsx` - `loadGroupAnime`-Kommentar fachlich
  umformuliert (D-21), keine Logikaenderung
- `backend/cmd/server/main.go` - zwei Routen-Registrierungs-Kommentare fachlich umformuliert
  (D-21), keine Logikaenderung

## Decisions Made

- `yearContext` ist ein eigenstaendiges Fragment zwischen Rolle und Notiz (nicht in `roleContext`
  verschachtelt) -- haelt beide Kontext-Teile unabhaengig les- und testbar, analog zum
  bestehenden Muster.
- Reine Kommentar-Aenderungen (Task 2) wurden bewusst in einem einzigen `docs(...)`-Commit
  gebuendelt statt pro Datei getrennt, weil keine der vier Stellen eine eigene inhaltliche
  Abhaengigkeit zu den anderen hat und der Commit klar als "kein Verhaltensunterschied"
  erkennbar bleiben soll (per `git diff --stat`/`git diff` vor dem Commit verifiziert).

## Deviations from Plan

None - plan executed exactly as written (inkl. TDD-RED/GREEN-Gate-Sequenz fuer Task 1, reiner
Kommentar-Diff fuer Task 2).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Performed

- `npm --prefix frontend run test -- ProposalForm.useSubmit` → 18/18 bestanden (RED zuerst 5
  Fehlschlaege bestaetigt, dann GREEN).
- `npm --prefix frontend run test -- contributions` → 139/139 bestanden (keine Regression in
  angrenzenden Komponenten).
- `npm --prefix frontend run typecheck` → sauber.
- `npm --prefix frontend run lint` → keine Fehler/Warnungen in den geaenderten Dateien (5
  bestehende, unbezogene Fehler in anderen Dateien sind Altlast, out of scope).
- `grep -rn "live reproduziert\|(Live-UAT-Bugfix)" backend/cmd/server/main.go
  frontend/src/components/contributions/ProposalForm.useSubmit.ts
  frontend/src/components/contributions/ProposalForm.tsx` → 0 Treffer.
- `wc -l frontend/src/components/contributions/ProposalForm.tsx` → 447 Zeilen (≤450).
- `docker compose up -d --build team4sv30-backend` → Image neu gebaut, Container neu gestartet,
  `/health` → 200, Logs zeigen alle Routen inkl. unveraenderter Pfade korrekt registriert.
- `docker restart team4sv30-frontend` → Container neu gestartet, `GET /me/contributions` → 200
  (geloggt im Container), keine Fehler in den Logs.
- `git diff backend/cmd/server/main.go
  frontend/src/components/contributions/ProposalForm.useSubmit.ts
  frontend/src/components/contributions/ProposalForm.tsx` vor dem Task-2-Commit manuell
  gegengeprueft: ausschliesslich Kommentarzeilen veraendert, keine Code-Zeile.
- Echter Login als `jeahn45@team4s.de` (Resource-Owner-Password-Grant gegen Keycloak) bestaetigt
  weiterhin funktionsfaehig (`GET /api/v1/me` → 200, korrekte Identitaet) -- Backend-Neustart hat
  bestehende Sessions/Login-Flow nicht beeintraechtigt.
- Live-Testdaten `fansub_group_hints` ID 1/2/3 per `SELECT` gegen `team4sv30-db` gegengeprueft:
  unveraendert (Status weiterhin `open`, Notizen identisch zum Vorzustand).

## Next Phase Readiness

- D-20/D-21 sind vollstaendig geschlossen; keine bekannten offenen Punkte aus der dritten
  Gap-Closure-Runde fuer diesen Plan.
- Ein direkter End-to-End-Nachweis von D-20 ueber einen NEUEN echten Hinweis wurde bewusst nicht
  durchgefuehrt: Account `jeahn45@team4s.de` hat fuer Zielgruppe 26/Projekt 2 bereits einen
  offenen Hinweis (ID 1, aus Plan 191-19), ein weiterer Versuch wuerde am D-04(1)-Unique-Constraint
  (409) scheitern und keine zusaetzliche Aussagekraft liefern, ohne neue Live-Testdaten zu
  erzeugen. Die Komposition selbst ist durch 6 neue, gezielte Unit-Tests (alle vier
  Zeitraum-Varianten + Reihenfolge + Forwarding) vollstaendig abgedeckt; der Backend-Endpunkt
  selbst ist unveraendert (nimmt weiterhin ein beliebiges `note`-Freitextfeld an).
- `ProposalForm.tsx` bleibt bei 447/450 Zeilen -- naechste Plaene sollten das bei weiteren
  Aenderungen gegenpruefen.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 4 key-files und alle 3 Task-Commit-Hashes wurden gegen das Dateisystem bzw.
`git log --oneline --all` verifiziert und gefunden.
