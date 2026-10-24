---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 33
subsystem: frontend
tags: [react-hook, tdd, d-29, d-31, d-34, contributions]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "related_release_version_id/related_release_label-Backend-Contract (Plan 191-32), getGroupReleaseListCursor (öffentlich, mitgliedschaftsfrei)"
provides:
  - "FansubGroupHint/CreateFansubGroupHintRequest im Frontend mirroren den Backend-Contract exakt (related_release_version_id/related_release_label)"
  - "useProposalFormReleaseOptions-Hook: einziger, geteilter Lade-/Auswahl-Mechanismus für die Release-Liste eines (anime, group)-Paars, bereit für Plan 191-34/191-35"
  - "buildReleaseOptionLabel: lesbares Label-Format (nie nackte IDs), getestet für alle drei Title/Version-Kombinationen"
affects: [191-34, 191-35, 191-36]

tech-stack:
  added: []
  patterns:
    - "useProposalFormReleaseOptions folgt dem Cancel-Guard-Stil von ProposalForm.tsx's loadGroupAnime-Effekt (cancelled-Flag in der Cleanup-Funktion) statt einer neuen Abbruch-Mechanik"
    - "Hook nutzt ausschliesslich getGroupReleaseListCursor für BEIDE Gruppen-Szenarien (eigene/fremde Gruppe) -- kein zweiter Admin-Pfad, weil der Endpunkt bereits vollständig öffentlich ist (anders als D-10s Projektliste)"

key-files:
  created:
    - frontend/src/components/contributions/ProposalForm.useReleaseOptions.ts
    - frontend/src/components/contributions/ProposalForm.useReleaseOptions.test.ts
  modified:
    - frontend/src/types/fansub-group-hints.ts
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "CursorPage<T> liefert das Feld items (nicht data, wie im Plan-Interfaces-Abschnitt als mögliche Ungenauigkeit markiert) -- vor der Implementierung gegen frontend/src/types/releaseDetail.ts verifiziert statt geraten."

requirements-completed: [D-29, D-31, D-34]

# Metrics
duration: ~25min
completed: 2026-10-24
---

# Phase 191 Plan 33: Release-Auswahl-Interface (Frontend-Typ-Spiegel + geteilter Hook) Summary

**Frontend-Typen mirroren den Backend-Release-Contract 1:1, und ein einziger, getesteter `useProposalFormReleaseOptions`-Hook lädt/verwaltet die Release-Auswahl für beide künftigen UI-Konsumenten (Wizard-Schritt 1 und Kontext-Einstieg) über die öffentliche `getGroupReleaseListCursor`-API**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 6 (2 neu, 4 geändert)

## Accomplishments

- `FansubGroupHint`/`CreateFansubGroupHintRequest` (`frontend/src/types/fansub-group-hints.ts`) tragen jetzt `related_release_version_id`/`related_release_label` exakt wie das Backend (Plan 191-32) sie sendet/akzeptiert — Request optional, Response immer vorhanden (`null` statt `undefined` bei fehlendem Release).
- Neuer, einziger Lade-Hook `useProposalFormReleaseOptions` (`ProposalForm.useReleaseOptions.ts`) kapselt den kompletten `getGroupReleaseListCursor(animeId, groupId, { limit: 100, sort: 'release_date' })`-Aufruf inklusive Cancel-Guard, Lade-/Fehlerzustand und `selectedReleaseVersionId`/`setSelectedReleaseVersionId`/`reset` — Default-Auswahl ist `null` ("Ganzes Projekt").
- `buildReleaseOptionLabel` liefert ausschließlich lesbare Labels (`"Episode {label} — {title} · {version}"`, Titel-/Versions-Teil entfällt korrekt bei `null`), nie eine nackte ID.
- 10 Verhaltenstests (TDD RED→GREEN) decken exakt den `<behavior>`-Block des Plans ab: Null-Guard ohne API-Aufruf, genau ein Aufruf pro Paar, Re-Fetch bei Paarwechsel, Clear ohne Netzwerkaufruf bei Rückkehr zu `null`, Fehlerformatierung ohne Exception, Default/Override von `selectedReleaseVersionId`, `reset()`.
- `npx tsc --noEmit` ist über das gesamte Frontend clean; alle 21 bestehenden Test-Dateien unter `contributions`/verwandten Pfaden (156 Tests) laufen weiterhin grün — keine Regression durch die Typ-Erweiterung.

## Task Commits

1. **Task 1: Mirror backend contract in fansub-group-hints.ts** - `1a5d79fe6` (feat)
2. **Task 2a: RED — failing test for useProposalFormReleaseOptions** - `1fcdac33c` (test)
3. **Task 2b: GREEN — Hook-Implementierung + docs** - `dec5d9d4a` (feat)

## Files Created/Modified

- `frontend/src/types/fansub-group-hints.ts` - `related_release_version_id`/`related_release_label` in beiden Interfaces, erweiterte fachliche Doku-Kopfzeile
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - `makeHint`-Fixture um die neuen Pflichtfelder ergänzt (Blocker durch Typänderung, Rule 3)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx` - dieselbe Fixture-Ergänzung
- `frontend/src/components/contributions/ProposalForm.useReleaseOptions.ts` - neuer Hook `useProposalFormReleaseOptions` + `buildReleaseOptionLabel` + Typ `ProposalReleaseOption`
- `frontend/src/components/contributions/ProposalForm.useReleaseOptions.test.ts` - 10 Logik-Tests (kein Render/Klick, reine Hook-/Funktions-Assertions via `renderHook`)
- `docs/FRONTEND_ARCHITEKTUR.md` - neuer Baustein im Abschnitt "Hilfsfunktionen und Hooks" dokumentiert (D-08)

## Decisions Made

Siehe `key-decisions` im Frontmatter — insbesondere die Verifikation des tatsächlichen `CursorPage<T>`-Feldnamens (`items`, nicht `data`) direkt gegen `frontend/src/types/releaseDetail.ts`, statt der im Plan als möglicherweise ungenau markierten Beschreibung zu folgen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test-Fixtures nach Contract-Erweiterung angepasst**
- **Found during:** Task 1 (Typ-Spiegel)
- **Issue:** Nach Hinzufügen der zwei neuen Pflichtfelder in `FansubGroupHint` schlug `npx tsc --noEmit` in zwei bereits bestehenden Test-Dateien fehl (`MyProposalsSection.test.tsx`, `FansubGroupHintsReviewSection.test.tsx`) — deren `makeHint`-Fixture-Objekte hatten die neuen Felder nicht gesetzt.
- **Fix:** Beide Fixtures um `related_release_version_id: null, related_release_label: null` ergänzt.
- **Files modified:** `frontend/src/components/contributions/MyProposalsSection.test.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx`
- **Verification:** `npx tsc --noEmit` clean, beide Testdateien weiterhin grün (22 Tests).
- **Committed in:** `1a5d79fe6` (Task 1 commit)

**2. [Rule 3 - Blocking] TypeScript-Inferenz bei `renderHook`-`rerender` mit nullable Props**
- **Found during:** Task 2 (Hook-Test)
- **Issue:** `renderHook`s `initialProps: { animeId: 2, groupId: 24 }` inferiert `{ animeId: number, groupId: number }` statt der im Callback annotierten `number | null`-Union — `rerender({ animeId: null, groupId: null })` schlug daher in `tsc` fehl.
- **Fix:** `initialProps` explizit als `{ animeId: number | null; groupId: number | null }` typisiert.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.useReleaseOptions.test.ts`
- **Verification:** `npx tsc --noEmit` clean, Tests weiterhin grün.
- **Committed in:** `dec5d9d4a` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 3 — Blocker durch die Contract-Typänderung selbst, keine Scope-Erweiterung).
**Impact on plan:** Beide Fixes waren notwendig, um die geplante Typänderung ohne Regression einzuführen. Kein Scope-Creep.

## Issues Encountered

Keiner — RED-Phase schlug erwartungsgemäß mit "Modul nicht gefunden" fehl (Hook existierte noch nicht), GREEN-Implementierung lief beim ersten Versuch gegen alle 10 Verhaltensfälle grün.

## Known Stubs

None — der Hook ist vollständig funktionsfähig und wird in dieser Phase noch von keiner UI konsumiert (bewusst, Plan 191-34/191-35 sind die Konsumenten). Das ist kein Stub, sondern das geplante Interface-first-Vorgehen dieses Plans.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Plan 191-34/191-35 können `useProposalFormReleaseOptions` direkt importieren, ohne den `getGroupReleaseListCursor`-Aufruf erneut zu implementieren — Lade-/Fehlerzustand, Re-Fetch-Verhalten und Auswahl-State sind bereits getestet.
- Plan 191-36 (Anzeige-Spalten) kann `FansubGroupHint.related_release_label` direkt aus dem Frontend-Typ lesen, ohne eine eigene Formatierung zu bauen.
- Kein Blocker für 191-34.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 33*
*Completed: 2026-10-24*

## Self-Check: PASSED

All 7 files created/modified by this plan confirmed present on disk; all three task commit
hashes (`1a5d79fe6`, `1fcdac33c`, `dec5d9d4a`) confirmed present in git history.
