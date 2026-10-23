---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 08
subsystem: ui
tags: [react, nextjs, vitest, fansub-group-hints, leader-review, accessibility]

requires:
  - phase: 191-06
    provides: "frontend/src/types/fansub-group-hints.ts (getypter Contract-Spiegel) + frontend/src/lib/api/fansub-group-hints.ts (listGroupHints/confirmGroupHint/rejectGroupHint)"
  - phase: 191-07
    provides: "Dateneigenschaft: requested_role_code/-label existiert in fansub_group_hints NUR bei hint_type='membership_request' (DB-Constraint chk_fansub_group_hints_role_scope, Migration 0187) — Korrektur-Hinweise fuehren die Rolle als Freitext in note"
provides:
  - "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx — Leader-facing Review-Liste fuer eingehende Hinweise an die Zielgruppe (confirm/reject, kein Mitgliedschafts-Side-Effect)"
  - "Mount dieser Sektion im Collaboration-Tab von FansubDetailsTab.tsx, direkt nach FansubAppMembersSection, gleiche can_manage_members-Gate"
affects: [191-09]

tech-stack:
  added: []
  patterns:
    - "Kopie-und-Umbenennung einer bestehenden Review-Listen-Komposition (ContributionsReviewSection.tsx) fuer eine zweite, strukturell andere Datenquelle (fansub_group_hints statt anime_contributions) — eigene Karte statt Zusammenfuehrung, weil beide Listen unterschiedliche Backend-Endpunkte und Lebenszyklen haben"
    - "Reine Entscheidungsfunktionen (isOpenHint/hintTypeBadgeLabel/roleLineForHint) als benannte Exports neben der Komponente, damit Logik-Tests ohne Render-/Klick-Simulation moeglich sind (CLAUDE.md Teststil-Regel)"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx

key-decisions:
  - "capabilities-Prop ist FansubGroupCapabilities | null (nicht die non-null Donor-Signatur von ContributionsReviewSection.tsx) — Gate per capabilities?.can_manage_members Optional Chaining, weil FansubDetailsTab.tsx diese Prop bereits nullable fuehrt und ein non-null-Cast dort zur Laufzeit crashen wuerde."
  - "Mount-Punkt ist der collaboration-Tab (direkt nach FansubAppMembersSection), nicht 'neben ContributionsReviewSection', weil dieser Donor seit der Konsolidierung des vorschlaege-Haupttabs in pruefungen in Produktionscode verwaist/nicht gemountet ist — der Plan weist diese Abweichung explizit als bewusst aus, keine Reparatur des Altfalls."
  - "aria-label='Ablehnung abbrechen' sitzt am X-Icon des Hinweis-ablehnen-Toggle-Buttons (der sowohl oeffnet als auch die Expansion wieder einklappt), nicht an einem separaten Abbrechen-Button-Icon — der Donor's reiner Text-Abbrechen-Button bleibt unveraendert, da er im Original kein Icon traegt."
  - "roleLineForHint(hint) liefert fuer hint_type='correction' bewusst null (kein Rollenfeld-Rendering), weil das strukturierte Rollenfeld laut DB-Constraint nur bei membership_request existiert — die Korrektur-Notiz wird stattdessen unveraendert als Freitext gezeigt (Dateneigenschaft aus Plan 191-07)."

requirements-completed: [D-01, D-03, D-06, D-08]

duration: ~35min
completed: 2026-10-23
---

# Phase 191 Plan 08: Leader-Review fuer eingehende Hinweise Summary

**Gruppen-gescopte Leader-Review-Liste (`FansubGroupHintsReviewSection.tsx`) im Collaboration-Tab — confirm/reject ohne jede Mitgliedschafts-Nebenwirkung, mit Logik-Tests statt Render-/Klick-Simulation und einem expliziten aria-label fuer das Ablehnung-abbrechen-Icon.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `FansubGroupHintsReviewSection.tsx` reproduziert die Card→Toolbar→EmptyState/ErrorState/LoadingState→Card-Stack-Komposition von `ContributionsReviewSection.tsx` 1:1, mit allen Copy-/Label-Abweichungen aus `191-UI-SPEC.md` Component Contract B2 (Titel „Eingehende Hinweise ({openCount})“, Beschreibung macht D-03 explizit, Confirm-Label „Hinweis bestätigen“, Reject-Label „Hinweis ablehnen“, eigene Empty-/Error-Texte).
- Drei reine, exportierte Entscheidungsfunktionen (`isOpenHint`, `hintTypeBadgeLabel`, `roleLineForHint`) tragen die gesamte fachliche Logik und sind unabhängig von React-Rendering testbar — `roleLineForHint` kapselt die aus Plan 191-07 übernommene Dateneigenschaft (Rollenfeld nur bei `hint_type='membership_request'`, Korrektur-Hinweise liefern `null` und fallen auf die Notiz als Freitext zurück).
- `capabilities`-Prop ist `FansubGroupCapabilities | null`, Gate per `capabilities?.can_manage_members` — passt exakt zur bereits nullable Prop-Signatur von `FansubDetailsTab.tsx`, kein Cast nötig, `npm run typecheck` bleibt grün.
- Mount als Sibling direkt nach `FansubAppMembersSection` im `collaboration`-Tab, mit einem fachlichen Kommentar an der Einbaustelle, der begründet, warum nicht neben dem (seit der `vorschlaege→pruefungen`-Konsolidierung verwaisten) `ContributionsReviewSection` gemountet wird.
- 15 Vitest-Tests für die neue Sektion (Logik-Funktionen + zwei isolierte render-and-assert-null-Checks für das Capability-Gate + Lade-/Fehler-/Confirm-/Reject-Verhalten + aria-label-Check) plus ein neuer `FansubDetailsTab`-Test, der die DOM-Reihenfolge Mitglieder-Sektion→Hinweise-Review im `collaboration`-Tab belegt.

## Task Commits

Each task was committed atomically:

1. **Task 1a: Failing tests (RED)** - `855751429` (test)
2. **Task 1b: FansubGroupHintsReviewSection (GREEN)** - `b99ea8222` (feat)
3. **Task 2: Mount im Collaboration-Tab** - `4a945e98f` (feat)

## TDD Gate Compliance

RED-Gate-Commit `855751429` (test, Modul-Import schlägt fehl) existiert vor GREEN-Gate-Commit `b99ea8222` (feat, alle 15 Tests grün) — Reihenfolge verifiziert per `git log --oneline`. Kein separater REFACTOR-Commit nötig.

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx` - Leader-Review-Liste (NEU)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx` - 15 Logik-/Gate-Tests (NEU)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` - Mount im Collaboration-Tab (2 Zeilen Import + 9 Zeilen JSX)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx` - neuer Reihenfolge-Test + Mock fuer die neue Sektion

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] aria-label-Platzierung im Testfall kollidierte mit dem Accessible-Name des Buttons**
- **Found during:** Task 1 (eigene Tests, nicht Produktionslogik)
- **Issue:** Die erste Testfassung suchte den Reject-Button per exaktem `getByRole('button', { name: 'Hinweis ablehnen' })`, nachdem das X-Icon im selben Button ein `aria-label="Ablehnung abbrechen"` erhielt — der berechnete Accessible Name des Buttons kombiniert Icon-Label und sichtbaren Text, wodurch der exakte String-Match fehlschlug. Ebenso nutzte der erste Ladefehler-Test eine echte `Error`-Instanz, die (wie beim Donor) ihre eigene `.message` statt des Fallback-Texts zurückgibt, und zwei Gate-Tests riefen den im Projekt nicht global registrierten Jest-DOM-Matcher `toBeEmptyDOMElement` auf.
- **Fix:** Button-Suche auf Regex (`/Hinweis ablehnen/`) umgestellt, Ladefehler-Test auf eine Nicht-`Error`-Ablehnung (String) umgestellt, `toBeEmptyDOMElement` durch `container.firstChild === null` ersetzt (identisch zum bestehenden Muster in `ContributionsReviewSection.test.tsx`). Produktionscode war von diesem Fund nicht betroffen.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx`
- **Verification:** `npm --prefix frontend run test -- FansubGroupHintsReviewSection` — alle 15 Tests grün, keine `act()`-Warnungen mehr nach Umstellung der Klicks auf `fireEvent.click`.
- **Committed in:** `b99ea8222` (Teil des GREEN-Commits, da der Test erst in dieser Iteration final wurde)

**2. [Rule 2 - fehlende Abdeckung] Task 2's explizites Akzeptanzkriterium (Reihenfolge-Test) war im bestehenden `FansubDetailsTab.test.tsx` nicht abgedeckt**
- **Found during:** Task 2
- **Issue:** Der Plan verlangt einen Nachweis, dass `FansubAppMembersSection` und `FansubGroupHintsReviewSection` im `collaboration`-Tab in dieser Reihenfolge rendern; die bestehende Testdatei deckte nur den `media`-Tab ab.
- **Fix:** Mock für `FansubGroupHintsReviewSection` ergänzt, neuer Test für `activeMainTab="collaboration"` mit `compareDocumentPosition`-Prüfung der DOM-Reihenfolge hinzugefügt.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx`
- **Verification:** `npm --prefix frontend run test -- FansubDetailsTab` — 3/3 Tests grün.
- **Committed in:** `4a945e98f`

## Issues Encountered

None über die oben dokumentierten Auto-Fixes hinaus.

## User Setup Required

None — keine externe Service-Konfiguration nötig.

## Verification

- `npm --prefix frontend run test -- FansubGroupHintsReviewSection` — 15/15 grün.
- `npm --prefix frontend run test -- FansubDetailsTab FansubAppMembersSection ContributionsReviewSection` — 38/38 grün (keine Regression an bestehenden Nachbartests).
- `npm --prefix frontend run typecheck` — grün.
- `grep -c "FansubGroupHintsReviewSection" frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` → 2 (Import + Nutzung).
- `docker restart team4sv30-frontend` ausgeführt; Container läuft stabil (`curl http://192.168.235.196:3000/` → 200), kein Crash-Loop in `docker logs`.

## Next Phase Readiness

- Plan 191-09 (plattform-weite Admin-Liste fuer `fansub_lead`-Mitgliedschaftsanfragen) kann unabhaengig von dieser Leader-Review-Liste gebaut werden — beide konsumieren denselben Typ-/API-Layer aus Plan 191-06, aber unterschiedliche Endpunkte (`listGroupHints` vs. `listAdminFansubGroupHints`).
- D-01's "alle anderen Rollen → Leader der Zielgruppe entscheidet"-Pfad hat jetzt eine echte, erreichbare Oberfläche; nur der `fansub_lead`-Sonderfall (D-01/D-07) fehlt noch (Plan 191-09).

## Known Stubs

Keine — die Sektion ist vollstaendig an echte Backend-Endpunkte (Plan 191-04/191-06) angebunden, keine hartcodierten Platzhalterdaten.

## Self-Check: PASSED

- `[ -f "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx" ]` → FOUND
- `[ -f "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx" ]` → FOUND
- `git log --oneline --all | grep 855751429` → FOUND
- `git log --oneline --all | grep b99ea8222` → FOUND
- `git log --oneline --all | grep 4a945e98f` → FOUND

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
