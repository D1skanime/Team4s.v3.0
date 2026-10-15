---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 02
subsystem: ui
tags: [frontend, typescript, pagination, formatDate, dedupe, vitest]

requires:
  - phase: 184-01
    provides: DisplayVariantFileName-Helfer-Umstellung (unabhängig, nur depends_on für Reihenfolge)
provides:
  - "computePageWindow(currentPage, totalPages) als einziger Helfer für die Pagination-Fensterberechnung"
  - "formatDateDeOrIso und formatDateDeOrEmpty als die zwei zentralen formatDate-Helfer (je ein Verhaltens-Cluster)"
  - "9 umgestellte Konsumenten: 2 Pagination-Komponenten + 7 formatDate-Kopien ohne lokale Re-Implementierung"
affects: [184-03, 184-04]

tech-stack:
  added: []
  patterns:
    - "Reine Helfer-Extraktion aus byte-identischen Kopien, abgesichert durch Logik-Tests statt Annahme (Vorbild: cssCustomProperties.guard.test.ts)"
    - "Bewusst getrennte Fallback-Helfer je Verhaltens-Gruppe statt einer Vereinheitlichung, wenn Konsumenten unterschiedliche Fehler-Philosophien haben (D-02)"

key-files:
  created:
    - frontend/src/lib/pagination.ts
    - frontend/src/lib/pagination.test.ts
    - frontend/src/lib/formatDate.ts
    - frontend/src/lib/formatDate.test.ts
  modified:
    - frontend/src/components/ui/Pagination.tsx
    - frontend/src/components/anime/Pagination.tsx
    - frontend/src/app/admin/users/tabs/UserClaimsTab.tsx
    - frontend/src/app/admin/claims/ClaimsClient.tsx
    - frontend/src/components/contributions/ReviewQueue.tsx
    - "frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.ts"

key-decisions:
  - "D-02 (CONTEXT.md): formatDate bleibt bewusst zwei getrennte Helfer statt einem — Cluster A (ISO-Fallback) und Cluster B (Leerstring-Fallback) behalten ihre unterschiedliche Fehler-Philosophie unverändert"
  - "Plan-Behavior-Spec für computePageWindow(5, 3) war fehlerhaft ([1,2,3] angegeben) — Test korrigiert auf das tatsächliche Verhalten der Bestandslogik ([3]), da der Plan selbst 'exakt die Grenzfall-Semantik der bestehenden Implementierung reproduzieren, nicht neu erfinden' verlangt"

requirements-completed: [D-02]

duration: 22min
completed: 2026-10-15
---

# Phase 184 Plan 02: Pagination- und formatDate-Dedupe (F-07/D-02) Summary

**computePageWindow als einziger Pagination-Fenster-Helfer und zwei zentrale formatDate-Helfer (formatDateDeOrIso, formatDateDeOrEmpty) lösen 9 byte-identische Kopien ab, ohne Verhalten zu ändern.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-10-15T15:17:00Z
- **Completed:** 2026-10-15T15:39:00Z
- **Tasks:** 3
- **Files modified:** 13 (4 neu, 9 geändert)

## Accomplishments
- `frontend/src/lib/pagination.ts` kapselt die zuvor byte-identische Fensterberechnung aus `components/ui/Pagination.tsx` und `components/anime/Pagination.tsx`; beide Komponenten rufen nur noch den Helfer auf.
- `frontend/src/lib/formatDate.ts` stellt `formatDateDeOrIso` (Cluster A, try/catch-ISO-Fallback) und `formatDateDeOrEmpty` (Cluster B, Leerstring-Fallback) bereit; alle 7 vormals getrennten Kopien (4× Cluster A, 3× Cluster B) rufen jetzt den passenden Helfer.
- Beide Helfer sind durch Logik-Tests abgesichert (5 Pagination-Grenzfälle, 7 formatDate-Fälle inkl. Exception-Pfad via `vi.spyOn`), nach TDD-RED/GREEN-Zyklus.
- Keine lokale `formatDate`- oder Fensterberechnungs-Definition bleibt in den 9 Konsumenten übrig (grep-verifiziert).

## Task Commits

Jede Aufgabe wurde atomar committet (TDD-Zyklus RED→GREEN für Task 1 und 2):

1. **Task 1a (RED): computePageWindow-Tests** - `eb71a7eda` (test)
2. **Task 1b (GREEN): computePageWindow-Helfer + beide Komponenten umgestellt** - `6f43068b2` (feat)
3. **Task 2a (RED): formatDate-Helfer-Tests** - `2b5d32afd` (test)
4. **Task 2b (GREEN): formatDateDeOrIso/formatDateDeOrEmpty implementiert** - `9f054f147` (feat)
5. **Task 3: alle 7 Konsumenten umgestellt, lokale Kopien entfernt** - `e0c9e1f80` (feat)
6. **Deferred-Items dokumentiert** - `c8ddc672d` (docs)

**Plan metadata:** (dieser Commit folgt separat nach SUMMARY/STATE-Update)

## Files Created/Modified
- `frontend/src/lib/pagination.ts` - `computePageWindow(currentPage, totalPages): number[]`, einzige Implementierung der Fensterberechnung
- `frontend/src/lib/pagination.test.ts` - 5 Logik-Tests (Standardfall, from-Kappung, to-Kappung, Einzelseite, currentPage>totalPages-Grenzfall)
- `frontend/src/lib/formatDate.ts` - `formatDateDeOrIso` (Cluster A) und `formatDateDeOrEmpty` (Cluster B)
- `frontend/src/lib/formatDate.test.ts` - 7 Logik-Tests (gültiges Datum je Helfer, Exception-Fallback, falsy/null/undefined/NaN-Fallback)
- `frontend/src/components/ui/Pagination.tsx` - ruft `computePageWindow` in `useMemo` statt lokaler Schleife
- `frontend/src/components/anime/Pagination.tsx` - ruft `computePageWindow` statt lokaler Schleife
- `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` - ruft `formatDateDeOrIso` statt lokaler Kopie
- `frontend/src/app/admin/claims/ClaimsClient.tsx` - ruft `formatDateDeOrIso` statt lokaler Kopie (2 Aufrufstellen)
- `frontend/src/components/contributions/ReviewQueue.tsx` - ruft `formatDateDeOrIso` statt lokaler Kopie
- `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` - ruft `formatDateDeOrIso` statt lokaler Kopie
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx` - ruft `formatDateDeOrEmpty` statt lokaler Kopie (2 Aufrufstellen)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx` - ruft `formatDateDeOrEmpty` statt lokaler Kopie (2 Aufrufstellen)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewFilters.ts` - ruft `formatDateDeOrEmpty` statt lokaler Kopie

## Decisions Made
- D-02 aus CONTEXT.md befolgt: zwei getrennte formatDate-Helfer statt einem, Fallback-Philosophien von Cluster A (ISO-String bei Exception) und Cluster B (Leerstring bei falsy/NaN) bleiben unverändert und unvereinheitlicht.
- Datei-Längen-Check (D-05/CLAUDE.md) vor Task 3 durchgeführt: alle 7 Zieldateien liegen unter 450 Zeilen (größte 380 Zeilen) — kein Split nötig.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Dokumentationsfehler im Plan] Falscher Erwartungswert im Behavior-Block korrigiert**
- **Found during:** Task 1 (RED-Phase, vor Implementierung)
- **Issue:** Der Plan verlangt für `computePageWindow(5, 3)` den Rückgabewert `[1,2,3]`, zugleich aber explizit "exakt die Grenzfall-Semantik der bestehenden Implementierung reproduzieren, nicht neu erfinden". Eine Verifikation der realen Bestandslogik (`from = Math.max(1, currentPage-2)`, `to = Math.min(totalPages, currentPage+2)`, Schleife) ergibt für `(5, 3)`: `from=3`, `to=3` → Ergebnis `[3]`, nicht `[1,2,3]`. Der im Plan angegebene Beispielwert war schlicht falsch.
- **Fix:** Testfall auf den tatsächlich korrekten, verifizierten Bestandswert `[3]` korrigiert; die übergeordnete Anweisung des Plans ("bestehende Semantik reproduzieren") wurde damit eingehalten, nicht die fehlerhafte Beispielzahl.
- **Files modified:** `frontend/src/lib/pagination.test.ts`
- **Verification:** `node -e` Direktauswertung der byte-identischen Bestandslogik vor Testerstellung; Test grün nach Implementierung.
- **Committed in:** `eb71a7eda` (Task 1 RED-Commit)

**2. [Rule 1 - Zu breites Grep-Muster in Acceptance Criteria] Abweichung bei einem Acceptance-Criteria-Grep dokumentiert, kein Codefix nötig**
- **Found during:** Task 1 (Verifikation nach GREEN)
- **Issue:** Der Plan verlangt `grep -n "Math.max(1, currentPage" ... liefert 0 Treffer`. Nach der Umstellung bleiben in beiden Pagination-Komponenten weiterhin `Math.max(1, currentPage - 1)`-Aufrufe — diese gehören aber zur unveränderten "Zurück"-Button-/Link-Clamp-Logik (Seitenzahl für den Zurück-Link), nicht zur Fensterberechnung, und der Plan selbst untersagt in `<action>` explizit das Ändern von "Rendering, Links, Buttons".
- **Fix:** Kein Codefix — stattdessen gezielt auf Abwesenheit der tatsächlichen Re-Implementierung geprüft (`for (let page = from`, `const from = Math.max(1, currentPage`): beides 0 Treffer. Das zu breite Grep-Muster im Plan erfasst unabsichtlich eine unverwandte, bewusst unveränderte Stelle.
- **Files modified:** keine (nur Verifikationsmethode angepasst)
- **Verification:** `grep -n "for (let page = from"` und `grep -n "const from = Math.max(1, currentPage"` beide 0 Treffer in beiden Dateien.
- **Committed in:** n/a (Verifikationsschritt, kein Codeänderung)

**3. [Rule außerhalb Scope — Scope Boundary] Vorbestehende, planunabhängige Testfehler dokumentiert statt gefixt**
- **Found during:** Task 3 (volle Testsuite-Verifikation)
- **Issue:** `frontend/src/types/__tests__/anime-detail-contract.test.ts` schlägt reproduzierbar (auch isoliert, auch ohne jede Änderung dieses Plans) fehl — betrifft `shared/contracts/openapi.yaml` (anime-detail relation payload), komplett außerhalb des F-07-Scopes. Zusätzlich wurde in einem ersten (durch parallele Hintergrundprozess-Fehlversuche belasteten) vollständigen Testlauf eine einmalige Flakiness in `ReviewDelegationSection.test.tsx` beobachtet, die in Isolation und im finalen sauberen Lauf nicht reproduzierbar war.
- **Fix:** Nicht gefixt (außerhalb des Scopes dieses Plans, Scope Boundary Rule). In `.planning/phases/184-.../deferred-items.md` dokumentiert.
- **Files modified:** `.planning/phases/184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-/deferred-items.md` (neu)
- **Verification:** Isolierter Lauf von `anime-detail-contract.test.ts` schlägt identisch fehl; `git status --short` zeigt, dass dieser Plan weder die Testdatei noch `openapi.yaml` berührt.
- **Committed in:** `c8ddc672d`

---

**Total deviations:** 3 (2 Plan-Dokumentationsungenauigkeiten korrigiert/dokumentiert, 1 Scope-Boundary-Dokumentation)
**Impact on plan:** Kein Scope-Creep, keine Verhaltensänderung an den 9 Konsumenten. Beide Dokumentationskorrekturen betreffen nur die Testerwartung/Verifikationsmethode des Plans selbst, nicht die ausgelieferte Logik.

## Issues Encountered
- Mehrere `docker compose exec ... npx vitest run`-Hintergrundläufe über den `run_in_background: true`-Parameter wurden vom Orchestrierungs-Tooling mit Exit-Code 144 abgebrochen (Ursache nicht im Projektcode, sondern im Ausführungsumfeld). Der Lauf ohne expliziten `run_in_background`-Parameter (natürliches Auto-Backgrounding nach 120s-Timeout) lief zuverlässig durch. Kein Einfluss auf das Endergebnis — die finale vollständige Suite (`vitest run`, 387 von 389 Dateien grün) wurde erfolgreich ausgewertet.

## User Setup Required
None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- F-07 (Pagination + formatDate) ist für diesen Plan vollständig abgeschlossen: ein Helfer für die Fensterberechnung, zwei Helfer für formatDate, 9 Konsumenten umgestellt, keine lokale Re-Implementierung übrig.
- Bereit für 184-03 (F-12, Spread-Merge-Helfer) und 184-04 (F-20, tote CSS-Klassen) gemäß Plan-Reihenfolge in CONTEXT.md.
- `docker restart team4sv30-frontend` wurde nach allen Frontend-Edits dieses Plans einmalig ausgeführt; Container läuft fehlerfrei neu hoch (verifiziert per `docker compose logs`).

---
*Phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-*
*Completed: 2026-10-15*
