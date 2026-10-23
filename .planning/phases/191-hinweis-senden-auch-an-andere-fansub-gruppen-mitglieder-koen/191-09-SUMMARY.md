---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 09
subsystem: ui
tags: [react, nextjs, vitest, fansub-group-hints, platform-admin, accessibility]

requires:
  - phase: 191-05
    provides: "GET/POST /api/v1/admin/fansub-group-hints(/:hid/confirm|reject) — Plattform-Admin-Entscheidungsflaeche, serverseitig auf requested_role_code='fansub_lead' gescoped"
  - phase: 191-06
    provides: "frontend/src/types/fansub-group-hints.ts + frontend/src/lib/api/fansub-group-hints.ts (listAdminFansubGroupHints/confirmAdminFansubGroupHint/rejectAdminFansubGroupHint)"
provides:
  - "frontend/src/app/admin/fansub-group-hints/page.tsx + FansubGroupHintsAdminClient.tsx — plattform-weite, PlatformAdminGate-geschuetzte Liste fuer fansub_lead-Mitgliedschaftsanfragen (D-01/D-07)"
  - "Navigationseintrag 'Hinweise (Leitung)' in AdminMainNav.tsx (schliesst 191-RESEARCH.md Open Question 2)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Kopie-und-Umbenennung der ClaimsClient.tsx-Komposition (Filter -> Table/Mobile-Card -> Pagination -> Modal) fuer eine zweite, strukturell andere plattform-weite Datenquelle (fansub_group_hints statt member_claims) — eigene Route statt Filter-Erweiterung, weil kein gemeinsames Datenmodell existiert"
    - "Reine, exportierte Entscheidungsfunktionen (rowActionsForStatus/hintStatusLabel/hintStatusVariant/buildRejectPayload/emptyStateCopy) neben der Komponente, damit Logik-Tests ohne Render-/Klick-Simulation moeglich sind (CLAUDE.md Teststil-Regel) — explizite Abweichung vom Donor-Testfile ClaimsClient.test.tsx, das diese Regel selbst verletzt"

key-files:
  created:
    - frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.ts
    - frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.test.ts
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx
    - frontend/src/app/admin/fansub-group-hints/page.tsx
  modified:
    - frontend/src/components/admin/AdminMainNav.tsx

key-decisions:
  - "Task 1 (Filters hook + page.tsx + Nav) wurde in drei Teilcommits aufgeteilt statt einem einzigen, weil page.tsx auf die in Task 2 gebaute FansubGroupHintsAdminClient-Komponente verweist — ein einziger Task-1-Commit haette damit zwangslaeufig typecheck gebrochen (Modul existiert noch nicht). Reihenfolge: (1) Hook+Hook-Test, (2) Task 2 komplett (RED->GREEN), (3) page.tsx+Nav-Eintrag. Jeder einzelne Commit ist dadurch fuer sich typecheck-gruen (ausser dem erwarteten RED-Zwischenschritt), ohne den fachlichen Task-Inhalt zu veraendern."
  - "Antragsteller- und Zielgruppen-Zellen werden als reiner Text statt als Navigations-Button gerendert (anders als ClaimsClient.tsx's Benutzer-/Gruppen-Buttons) — 191-UI-SPEC.md Component Contract C3 spezifiziert fuer diese Liste keine Navigation, nur die Spalten selbst; eine zusaetzliche Klick-Navigation waere ungeplanter Scope."
  - "Status-Select-Werte sind 'open'/'acknowledged'/'rejected' (der reale FansubGroupHintStatus-Enum aus Plan 191-06), nicht 'pending'/'verified' wie bei Claims — die UI-SPEC-Tabelle benennt den Donor-Status 'pending' nur als Referenzpunkt fuer das Leerzustand-Verhalten, nicht als zu uebernehmenden Wert."

requirements-completed: [D-01, D-03, D-06, D-07, D-08]

duration: ~25min
completed: 2026-10-23
---

# Phase 191 Plan 09: Plattform-Admin-Liste fuer fansub_lead-Hinweise Summary

**Neue, reachable `/admin/fansub-group-hints`-Route (PlatformAdminGate) mit URL-synced Filtern, Desktop-Tabelle/Mobile-Card und Reject-Modal fuer ausschliesslich `fansub_lead`-Mitgliedschaftsanfragen — Logik-Tests statt Render-/Klick-Simulation, Nav-Eintrag schliesst die letzte offene Lücke aus D-01/D-07.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed (in 3 Commit-Schritten, siehe Decisions)
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- `useFansubGroupHintsListFilters.ts` synchronisiert Status/Zielgruppe/Von/Bis/Offset über die URL, strukturell 1:1 wie `useClaimsListFilters.ts`, bewusst ohne `app_user_id`- und `claim_type`-Felder (Component Contract C3) — 7 Vitest-Tests beweisen URL-Rundreise, Referenzstabilität und die Feldabwesenheit explizit.
- `FansubGroupHintsAdminClient.tsx` reproduziert `ClaimsClient.tsx`'s Komposition (Filter → Desktop-Tabelle/Mobile-Card → Pagination → Reject-Modal) mit allen Label-/Spalten-Abweichungen aus Component Contract C3: Spalten Status/Antragsteller/Zielgruppe/**Gewünschte Rolle** (statisch `Fansub-Leitung`)/Erstellt/Aktion, Confirm-/Reject-Labels vereinheitlicht mit der Leader-Review-Liste aus Plan 191-08 (`Hinweis bestätigen`/`Hinweis ablehnen`), **kein** Aktivierungsschritt (D-03).
- Fünf reine, exportierte Funktionen (`rowActionsForStatus`, `hintStatusLabel`, `hintStatusVariant`, `buildRejectPayload`, `emptyStateCopy`) tragen die gesamte fachliche Entscheidungslogik und sind unabhängig von React-Rendering testbar (12 Tests insgesamt, davon nur 3 isolierte render-and-assert-Checks für Seitentitel und Table-vs-Mobile-Card-Weiche — keine Interaktions-Simulation, explizite Abweichung vom Donor-Testfile `ClaimsClient.test.tsx`).
- `page.tsx` ist strukturell identisch zu `admin/claims/page.tsx` (`PlatformAdminGate`, `dynamic = 'force-dynamic'`).
- Neuer `AdminMainNav.tsx`-Eintrag `Hinweise (Leitung)` mit fachlichem Kommentar (D-08): begründet konkret, warum `fansub_group_hints` und `member_claims` zwei unabhängige Datenquellen ohne gemeinsames Datenmodell sind, statt nur auf die Phase zu verweisen.
- `npm run typecheck`, alle 5 relevanten Testdateien (38 Tests) und `eslint` sind grün; `grep -rn "<select\|<input\|<textarea"` findet keine Treffer in der neuen Client-Datei.

## Task Commits

Each task was committed atomically:

1. **Task 1a: useFansubGroupHintsListFilters Hook + Test** - `fe936b688` (feat)
2. **Task 2a: FansubGroupHintsAdminClient Tests (RED)** - `4b6e860a6` (test)
3. **Task 2b: FansubGroupHintsAdminClient Implementation (GREEN)** - `fe0471b28` (feat)
4. **Task 1b: page.tsx + Nav-Eintrag** - `bf56ea232` (feat)

## TDD Gate Compliance

RED-Gate-Commit `4b6e860a6` (test, Modul-Auflösungsfehler bestätigt — kein false-positive Pass) existiert vor GREEN-Gate-Commit `fe0471b28` (feat, alle 12 Tests grün), verifiziert per `git log --oneline`. Kein separater REFACTOR-Commit nötig.

## Files Created/Modified

- `frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.ts` - URL-synced Filter-Hook (NEU)
- `frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.test.ts` - 7 Logik-Tests (NEU)
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` - Plattform-Admin-Liste, 421 Zeilen (NEU)
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx` - 12 Tests (5 reine Funktionstests + 3 isolierte Render-Checks pro Verhaltensgruppe) (NEU)
- `frontend/src/app/admin/fansub-group-hints/page.tsx` - Route-Entry, `PlatformAdminGate`-gewrappt (NEU)
- `frontend/src/components/admin/AdminMainNav.tsx` - neuer Nav-Eintrag + fachlicher D-08-Kommentar (2 Zeilen Code + 6 Zeilen Kommentar)

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task-1-Commit-Reihenfolge an die tatsächliche Dateiabhängigkeit angepasst**
- **Found during:** Vorbereitung von Task 1
- **Issue:** Der Plan ordnet Task 1 (Filters-Hook + `page.tsx` + Nav-Eintrag) vor Task 2 (`FansubGroupHintsAdminClient.tsx`) an. `page.tsx` importiert jedoch `FansubGroupHintsAdminClient` aus Task 2 — ein einzelner Task-1-Commit mit allen drei Dateien hätte zwangsläufig `npm run typecheck` gebrochen, weil das importierte Modul zu diesem Zeitpunkt noch nicht existiert (Task 1s eigenes Akzeptanzkriterium verlangt aber einen grünen Typecheck).
- **Fix:** Kein fachlicher Scope-Wechsel — nur Commit-Reihenfolge angepasst: zuerst der Hook (unabhängig, sofort grün), dann Task 2 komplett (RED→GREEN, da dies nun die Voraussetzung für `page.tsx` ist), zuletzt `page.tsx`+Nav-Eintrag (jetzt löst der Import korrekt auf). Jeder Commit ist dadurch für sich typecheck-grün, mit Ausnahme des plankonform erwarteten RED-Zwischenschritts.
- **Files modified:** keine zusätzlichen — betrifft nur die Reihenfolge der bereits geplanten Dateien.
- **Verification:** `npm --prefix frontend run typecheck` nach jedem der vier Commits grün (RED-Commit ausgenommen, dort erwartungsgemäß kein Typecheck-Lauf vor der Implementierung).
- **Committed in:** `fe936b688`, `4b6e860a6`, `fe0471b28`, `bf56ea232`

---

**Total deviations:** 1 auto-fixed (1 blocking/Reihenfolge)
**Impact on plan:** Kein fachlicher Unterschied zum Plan — gleiche Dateien, gleicher Inhalt, nur eine andere Commit-Reihenfolge, um die inter-Task-Dateiabhängigkeit aufzulösen, ohne einen zwischenzeitlich kaputten Typecheck-Zustand zu committen.

## Issues Encountered

Keine über die oben dokumentierte Commit-Reihenfolgen-Anpassung hinaus.

## User Setup Required

None — keine externe Service-Konfiguration nötig.

## Verification

- `npm --prefix frontend run typecheck` — grün.
- `npm --prefix frontend run test -- fansub-group-hints AdminMainNav ClaimsClient` — 38/38 grün (keine Regression an Nachbartests).
- `npx eslint src/app/admin/fansub-group-hints src/components/admin/AdminMainNav.tsx` — keine Findings.
- `grep -rn "<select\|<input\|<textarea" frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` — keine Treffer.
- `grep -c "Hinweise (Leitung)" frontend/src/components/admin/AdminMainNav.tsx` → 1; `grep -c "requested_role_code" ...` → 1.
- `docker restart team4sv30-frontend` ausgeführt; `curl http://192.168.235.196:3000/admin/fansub-group-hints` → 200, `curl http://192.168.235.196:3000/` → 200, kein Crash-Loop in `docker logs`.

## Next Phase Readiness

- Beide D-01-Entscheidungspfade (Leader der Zielgruppe aus Plan 191-08, Plattform-Admin für `fansub_lead` aus diesem Plan) haben jetzt eine echte, erreichbare Oberfläche.
- Die Phase 191-Kernfunktionalität (Formular, zwei Review-Oberflächen) ist mit diesem Plan vollständig; verbleibende offene Punkte aus `191-UI-SPEC.md` Component Contract A6 (Trigger-Button-Gating) betreffen einen anderen Plan/Datei (`MyProposalsSection.tsx`), nicht diesen.

## Known Stubs

Keine — die Liste ist vollständig an die echten Backend-Endpunkte aus Plan 191-05/191-06 angebunden, keine hartcodierten Platzhalterdaten.

## Self-Check: PASSED

- `[ -f "frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.ts" ]` → FOUND
- `[ -f "frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx" ]` → FOUND
- `[ -f "frontend/src/app/admin/fansub-group-hints/page.tsx" ]` → FOUND
- `git log --oneline --all | grep fe936b688` → FOUND
- `git log --oneline --all | grep 4b6e860a6` → FOUND
- `git log --oneline --all | grep fe0471b28` → FOUND
- `git log --oneline --all | grep bf56ea232` → FOUND

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
