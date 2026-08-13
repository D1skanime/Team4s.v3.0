---
phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
plan: "03"
subsystem: ui
tags: [react, accessibility, badges, focal-carousel, css-modules]
requires:
  - phase: 119-02
    provides: Autoritative badge_progress-Metriken im öffentlichen Memberprofil
provides:
  - Kanonische, numerisch sortierte Familienauflösung mit Exactly-once-Codebesitz
  - Responsive Sammlungskarten für Fortschritt, Punkte, Beiträge, Mitgliedschaft und Ehrungen
  - Lokale Hero-Auswahl mit getrennten Zuständen Aktuell, Ausgewählt und Gesperrt
affects: [119-04, public-member-profile, badge-collections]
tech-stack:
  added: []
  patterns: [typed family registry, authoritative progress presentation, domain-local stage selection]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "Familienfortschritt konsumiert ausschließlich badge_progress; Gründungsmitglied wird bei Nicht-Gründern nie aus Jahreswerten abgeleitet."
  - "Temporäre Stufenauswahl bleibt domainlokal und remountet bei Familien-/Metrikwechsel, während der echte Rang Aktuell behält."
patterns-established:
  - "Eine Familienkarte kapselt Hero, exakten Fortschritt und intern scrollbare Stufen; FocalCarousel erhält ganze Familienobjekte."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14]
duration: 10min
completed: 2026-08-03
---

# Phase 119 Plan 03: Badge-Familien-Sammlungskarten Summary

**Kanonische Badge-Familien mit autoritativen Fortschrittswerten, zugänglicher Stufenauswahl und earned-only Ehrungskarten im bestehenden MemberBadgeChain/FocalCarousel-Fluss**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-03T13:26:00Z
- **Completed:** 2026-08-03T13:36:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Fortschritt, Punkte, drei Beitragsfamilien und Mitgliedschaft werden deterministisch aus einem typisierten Katalog aufgelöst und numerisch sortiert.
- Erreichte Stufen bleiben farbig und auswählbar; der echte Rang bleibt unabhängig davon `Aktuell`, zukünftige Stufen sind nicht interaktive Locks.
- Nicht-Gründer sehen Gründungsmitglied gesperrt und als nächstes erreichbares Ziel fünf Jahre; besondere Ehrungen erscheinen earned-only ohne künstlichen Fortschritt.
- Responsive Hero-, 8-px-Fortschritts- und intern scrollbare Stage-Strip-Komposition nutzt weiterhin Card, Badge, SectionHeader und FocalCarousel.

## Task Commits

1. **Task 1: Generalize the canonical badge catalog into family presentations** — `5e9d2746`
2. **Task 2: Render accessible responsive family collection cards** — `50b1d96a`

## Files Created/Modified

- `frontend/src/components/profile/memberBadgeLabels.ts` — stabile Familienidentität, Schwellen, Reihenfolge, Exactly-once-Zuordnung und Unknown-Special-Fallback.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — Familienkarten, Hero-Auswahl, Fortschritt, Locks und earned-only Ehrungen.
- `frontend/src/components/profile/MemberBadgeChain.module.css` — responsive Hero-/Stage-/Progress-Geometrie, Fokus und Reduced Motion.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Wave-0-Verträge plus Reihenfolge, Nicht-Gründer- und Ehrungsregressionen.

## Decisions Made

- `badge_progress` ist die einzige Quelle für sichtbare Rohwerte und Balken; das Frontend aggregiert keine Beiträge, Punkte, Projekte oder Mitgliedschaftsdauern.
- Gründungsmitglied wird ausschließlich durch ein öffentlich verdientes Badge erreicht; Jahresfortschritt kann diese Stufe nicht freischalten.
- Die bestehende Rollen-Darstellung bleibt kompatibel; ohne `badgeProgress` bleibt die historische Einzelbadge-Darstellung für bestehende Consumer/Fixtures erhalten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test contract] Chai-DOM-unabhängige Attributprüfung verwendet**
- **Found during:** Task 2
- **Issue:** Drei Wave-0-Assertions verwendeten den nicht installierten Matcher `toHaveAttribute` und blockierten TypeScript/Vitest unabhängig von der Implementierung.
- **Fix:** Die Assertions prüfen dieselben ARIA-Attribute über `getAttribute`.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** 89 fokussierte Tests und zielgerichtetes ESLint bestehen.
- **Committed in:** `50b1d96a`

**Total deviations:** 1 auto-fixed (1 Rule 1). **Impact:** Nur die vorhandene Testaussage wurde an die installierte Assertion-Umgebung angepasst; kein Produktvertrag wurde gelockert.

## Issues Encountered

- Der projektweite Typecheck bleibt an vier vorbestehenden generierten `.next/dev/types`-Fehlern der Fansub-/Member-Routensignaturen hängen. In den vier Plan-Dateien verbleibt kein TypeScript- oder ESLint-Fehler.
- Zwei erwartungsrote `FocalCarousel`-Tests aus Wave 0 bleiben für Plan 119-04: ruhiger Einzelelementmodus und Nested-Keyboard-Grenze. Die globale Komponente liegt ausdrücklich außerhalb des Fünf-Dateien-Scope von 119-03.

## Verification Results

- Resolver-/MemberBadgeChain-Vitest: PASS — 89/89.
- Zielgerichtetes ESLint für alle vier TS/TSX-Dateien: PASS — 0 Fehler.
- `git diff --check`: PASS.
- Typecheck: BLOCKED ausschließlich durch vier dokumentierte `.next/dev/types`-Routensignaturfehler außerhalb des Plan-Diffs.
- Zweitconsumer: `FansubProjectsGrid` 4/4 PASS; globale Carousel-Suite 10/12 PASS mit zwei erwartungsroten 119-04-Verträgen.
- Seam-Scan: kein Fetch, Auth-/Tokenpfad, API-Call, lokaler Carousel-Listener oder zweiter Artwork-Resolver hinzugefügt.

## Known Stubs

None.

## Threat Flags

None — keine neue Netzwerk-, Auth-, Persistenz-, Datei- oder Schemaoberfläche.

## User Setup Required

None.

## Next Phase Readiness

Plan 119-04 kann `badge_progress` an der öffentlichen Route durchreichen und die zwei globalen FocalCarousel-Wave-0-Verträge schließen.

## Self-Check: PASSED

- Alle vier geänderten Plan-Dateien existieren.
- Task-Commits `5e9d2746` und `50b1d96a` existieren im kanonischen Verlauf.
- Keine unerwarteten Löschungen, neuen API-/Auth-Seams oder fremden ungetrackten Dateien wurden aufgenommen.

---
*Phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha*
*Completed: 2026-08-03*
