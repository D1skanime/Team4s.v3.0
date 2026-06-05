---
phase: 74-public-member-profile-members-slug-memorial
plan: 05
subsystem: ui
tags: [react, nextjs, typescript, client-filter, usememo, profile, badges]

requires:
  - phase: 74-04
    provides: page.tsx mit #badges/#beitraege-Platzhaltern, MemberRoleTimeline, MemberProfileHero
  - phase: 74-01
    provides: public_badges im PublicMemberProfileData-DTO (Badges-13)

provides:
  - MemberContributionFilters: clientseitige useMemo-Filterung nach Anime/Status ohne API-Call (D-06)
  - MemberBadgeHighlights: Top-N + "alle anzeigen"-Toggle auf public_badges; Memorial-Unterdrückung (D-10/D-11)
  - MemberRoleTimeline erweitert: Inline-Expand (D-07), gedämpfte unbestätigte Einträge mit Badge (D-08)
  - MemberBadgeChips: native <button> auf @/components/ui Button migriert (CLAUDE.md)
  - page.tsx: #badges + #beitraege gefüllt (146 Zeilen, Server Component)
  - vitest.config.ts: globals: true für @testing-library/react auto-cleanup

affects:
  - 74-06 (weitere Profilseiten-Pläne)
  - Alle Tests die @testing-library/react nutzen (globals: true)

tech-stack:
  added: []
  patterns:
    - useMemo-Filter ohne API-Call (D-06): ContributionFilterEntry prop → filtered via useMemo → render
    - Top-N-Slicing: sortBadges → slice(0, TOP_N) + showAll-Toggle, kein State-Recompute
    - Inline-Expand pro Timeline-Eintrag via useState ohne neue Hauptrolle (D-07)
    - Gedämpfte unbestätigte Darstellung via CSS opacity + Badge-Kennzeichnung (D-08)

key-files:
  created:
    - frontend/src/components/profile/MemberContributionFilters.tsx
    - frontend/src/components/profile/MemberContributionFilters.module.css
    - frontend/src/components/profile/MemberBadgeHighlights.tsx
    - frontend/src/components/profile/MemberBadgeHighlights.module.css
    - frontend/src/components/profile/MemberRoleTimeline.module.css
  modified:
    - frontend/src/components/profile/MemberRoleTimeline.tsx
    - frontend/src/components/profile/MemberBadgeChips.tsx
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/vitest.config.ts

key-decisions:
  - "ContributionFilterEntry als flexible Union-Typ-Brücke zwischen Test-Mock-Daten und PublicMemberRoleEntry — ermöglicht Wave-0-Tests ohne API-Anpassung"
  - "vitest globals: true als Rule-3-Fix — @testing-library/react auto-cleanup benötigt afterEach im globalen Scope für saubere DOM-Trennung zwischen Tests"
  - "Top-N=4 Badges prominent, Rest per Toggle — ausgewogenes Verhältnis zwischen Übersicht und Vollständigkeit"

patterns-established:
  - "useMemo-Filter: Prop-Array + Filter-State → useMemo → gefilterte Liste rendern (kein fetch, kein Contract-Change)"
  - "Top-N-Slicing: sortBadges(list).slice(0, N) + showAll-Boolean für Rest — kein Recompute auf Server-Daten"

requirements-completed: [C, "Badges-13", D-06, D-07, D-08, D-10, D-11]

duration: 11min
completed: 2026-06-05
---

# Phase 74 Plan 05: Badge-Highlights + Contribution-Filter + Timeline-Inline-Expand Summary

**Top-N-Badge-Kuration mit Memorial-Unterdrückung und clientseitige Contribution-Filterung via useMemo ohne API-Call, inklusive Inline-Expand und gedämpfter unbestätigter Einträge**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-05T16:18:55Z
- **Completed:** 2026-06-05T16:29:48Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- MemberContributionFilters (neu): clientseitige Filterung nach Anime und Status via useMemo — kein API-Call, kein Contract-Change (D-06); Wave-0-Test grün
- MemberBadgeHighlights (neu): Top-4 prominente Badges + "alle anzeigen"-Toggle auf DTO-public_badges; Gamification-Badges bei memorial unterdrückt (D-10/D-11)
- MemberRoleTimeline (erweitert): Inline-Expand für Detail-Subtypes pro Eintrag (D-07); unbestätigte Einträge optisch gedämpft mit Badge "unbestätigt" (D-08)
- MemberBadgeChips: natives `<button>` auf `@/components/ui` Button migriert — CLAUDE.md-Pflicht erfüllt, ESLint no-restricted-syntax sauber
- page.tsx: beide Platzhalter (#badges, #beitraege) aus Plan 04 durch echte Komponenten ersetzt; 146 Zeilen (≤150), Server Component

## Task Commits

1. **Task 1: Contribution-Filter + Timeline-Inline-Expand + gedämpfte Unbestätigte** - `61e0887d` (feat)
2. **Task 2: Badge-Highlights + Chips-Migration + page-Verdrahtung** - `bffac575` (feat)

## Files Created/Modified

- `frontend/src/components/profile/MemberContributionFilters.tsx` — NEU: clientseitige useMemo-Filterung (D-06), @/components/ui Select
- `frontend/src/components/profile/MemberContributionFilters.module.css` — NEU: Filter-Bar + Eintrags-Liste Stile
- `frontend/src/components/profile/MemberBadgeHighlights.tsx` — NEU: Top-N + "alle anzeigen", Memorial-Unterdrückung (D-10/D-11)
- `frontend/src/components/profile/MemberBadgeHighlights.module.css` — NEU: Badge-Grid Stile
- `frontend/src/components/profile/MemberRoleTimeline.tsx` — ERWEITERT: Inline-Expand (D-07), gedämpfte Einträge + Badge "unbestätigt" (D-08), 'use client'
- `frontend/src/components/profile/MemberRoleTimeline.module.css` — NEU: Stile für Inline-Expand und gedämpfte Einträge
- `frontend/src/components/profile/MemberBadgeChips.tsx` — natives `<button>` → `@/components/ui` Button migriert
- `frontend/src/app/members/[slug]/page.tsx` — Platzhalter durch MemberBadgeHighlights + MemberContributionFilters ersetzt
- `frontend/vitest.config.ts` — globals: true für @testing-library/react auto-cleanup

## Decisions Made

- `ContributionFilterEntry` als flexible Typ-Brücke: akzeptiert sowohl Test-Mock-Daten (`role`, `year`) als auch `PublicMemberRoleEntry` (`role_label`, `started_year`) — Wave-0-Test kompatibel ohne API-Anpassung
- `vitest globals: true` (Rule-3-Fix): @testing-library/react auto-cleanup registriert `afterEach` aus dem globalen Scope; ohne `globals: true` akkumulieren DOM-Renders über Tests hinweg und `getByRole` findet mehrfache Elemente
- Top-N = 4 gewählt: passt zur Breite einer typischen Badge-Chip-Reihe, genug für prominente Darstellung

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest globals: true für @testing-library/react auto-cleanup**
- **Found during:** Task 1 (MemberContributionFilters-Tests)
- **Issue:** @testing-library/react registriert seinen `afterEach`-cleanup-Hook nur wenn `afterEach` als globale Funktion verfügbar ist. Ohne `globals: true` in vitest.config.ts akkumulierten DOM-Renders über Tests hinweg, sodass `getByRole('combobox', { name: /status/i })` mehrere Elemente fand
- **Fix:** `globals: true` in `frontend/vitest.config.ts` ergänzt
- **Files modified:** `frontend/vitest.config.ts`
- **Verification:** Alle 3 MemberContributionFilters-Tests grün, keine anderen Tests gebrochen
- **Committed in:** 61e0887d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Notwendig für korrekte Test-Isolation. Keine Scope-Änderung.

## Issues Encountered

- aria-label-Duplikat: `<Select id="filter-status" aria-label="Status">` innerhalb `<label for="filter-status">Status</label>` erzeugte doppelten accessible name. Gelöst durch Entfernen der redundanten `aria-label`-Attribute — label-via-`for`-Assoziation reicht für korrekte Accessibility.

## User Setup Required

None — keine externen Services, keine Env-Variablen.

## Next Phase Readiness

- Beide Plan-04-Platzhalter (#badges, #beitraege) sind durch voll funktionsfähige Komponenten ersetzt
- Ebene 1 (Badges) und Ebene 3 (Contributions) des öffentlichen Profils sind vollständig
- Wave-0-Tests für MemberContributionFilters sind grün; keine Wave-0-Stubs mehr offen in Phase 74-05
- Plan 06 kann auf die vollständige Profilseite aufbauen

## Known Stubs

Keine. Alle Plan-04-Platzhalter durch echte Komponenten ersetzt.

## Threat Flags

Keine neuen Threat-Surfaces. Alle Filteroperationen sind rein clientseitig auf bereits geladenen Daten (T-74-05-TAMP: mitigated durch Slicing ohne Recompute).

## Self-Check

Zu prüfende Dateien:
- [x] `frontend/src/components/profile/MemberContributionFilters.tsx` — vorhanden
- [x] `frontend/src/components/profile/MemberBadgeHighlights.tsx` — vorhanden
- [x] `frontend/src/components/profile/MemberRoleTimeline.tsx` — vorhanden (erweitert)
- [x] `frontend/src/components/profile/MemberBadgeChips.tsx` — vorhanden (migriert)
- [x] `frontend/src/app/members/[slug]/page.tsx` — vorhanden (146 Zeilen)
- [x] Kein natives `<button>` in MemberBadgeChips.tsx
- [x] vitest run MemberContributionFilters: 3/3 grün
- [x] vitest run MemberProfileHero: 5/5 grün
- [x] tsc --noEmit: sauber
- [x] npm run lint: keine no-restricted-syntax-Verstöße in neuen/geänderten Dateien

## Self-Check: PASSED

---
*Phase: 74-public-member-profile-members-slug-memorial*
*Completed: 2026-06-05*
