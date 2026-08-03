---
phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
plan: "04"
subsystem: ui
tags: [react, focal-carousel, accessibility, public-member-profile]
requires:
  - phase: 119-03
    provides: Badge-Familienkarten und autoritative badge_progress-Projektion
provides:
  - Ruhiger Einzelkartenmodus im globalen FocalCarousel
  - Begrenzte Pointer-, Tastatur- und Reduced-Motion-Interaktion
  - Typisierter badge_progress-Pass-through der öffentlichen Memberroute
affects: [119-05, public-member-profile, fansub-projects]
tech-stack:
  added: []
  patterns: [ein globaler Carousel-Owner, typisierter Route-Pass-through, instanzlokale Inline-Raster]
key-files:
  created: []
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
key-decisions:
  - "Einzelne Sammlungen bleiben im globalen FocalCarousel, blenden aber Pfeile, Zähler und Rastertoggle generisch aus."
  - "Rasterfokus kehrt zum instanzeigenen Toggle zurück; Consumer ohne Toggle fallen auf die Carousel-Region zurück."
patterns-established:
  - "Verschachtelte interaktive Kinder begrenzen Carousel-Tastaturhandling über currentTarget."
  - "Reduced Motion snappt ohne Smooth-Verhalten und verwirft ausstehende Scrollziele."
requirements-completed: [D-15, D-16]
duration: 10min
completed: 2026-08-03
---

# Phase 119 Plan 04: Globale Carousel- und Routenintegration Summary

**Ruhige Einzel-Sammlungskarten und autoritative Badge-Fortschrittsdaten laufen über den einzigen globalen FocalCarousel- und Public-Profile-Pfad.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-03T13:37:00Z
- **Completed:** 2026-08-03T13:47:03Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Einzelne Sammlungen werden zentriert ohne Pfeile, Zähler oder Offenlegungschrome dargestellt.
- Mehrkartenmodus behält physische Zentrierung, Pointer-Nähe, Endpunkt-Pass-through und tastaturbegrenzte Kindinteraktion.
- Inline-Raster bleiben instanzlokal und geben Fokus an ihren eigenen Toggle zurück.
- Die öffentliche Memberroute reicht `profile.badge_progress` direkt an `MemberBadgeChain` weiter, ohne neuen Transport- oder Auth-Pfad.
- `FansubProjectsGrid` bleibt als zweiter produktiver Consumer vollständig grün.

## Task Commits

1. **Task 1: Integrate the public route through the global carousel contract** - `9e4aaae8` (feat)

## Files Created/Modified

- `frontend/src/components/ui/FocalCarousel.tsx` - Quiet Mode, Fokus-/ARIA-Semantik, Tastaturgrenze und Reduced-Motion-Abbruch.
- `frontend/src/components/ui/FocalCarousel.module.css` - zentrierte ruhige Einzelkarten-Geometrie.
- `frontend/src/components/ui/FocalCarousel.test.tsx` - Wave-0-Verträge für Quiet Mode, unabhängige Instanzen, Kindtastatur und Endpunkte.
- `frontend/src/app/members/[slug]/page.tsx` - typisierter `badge_progress`-Pass-through.
- `frontend/src/app/members/[slug]/page.test.tsx` - Routenregression für autoritativen Fortschritt.

## Decisions Made

- Der Single-Item-Zustand bleibt eine echte Carousel-Region, damit Semantik und Consumer-Vertrag gleich bleiben; ausschließlich redundante Chrome entfällt.
- Fokus-Rückgabe bevorzugt den instanzeigenen Offen-Toggle und fällt für renderItem-gesteuerte Consumer wie `FansubProjectsGrid` auf die Region zurück.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fokusziel an das reale Button-Primitiv angepasst**
- **Found during:** Task 1
- **Issue:** Das bestehende Button-Primitiv reicht React-Refs nicht weiter.
- **Fix:** Fokus-Rückgabe nutzt eine stabile `useId`-ID und einen Region-Fallback.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`
- **Verification:** FocalCarousel- und FansubProjectsGrid-Tests bestehen.
- **Committed in:** `9e4aaae8`

**Total deviations:** 1 auto-fixed bug. **Impact on plan:** Keine Scope-Erweiterung; die geforderte Fokussemantik wurde innerhalb des globalen Owners umgesetzt.

## Issues Encountered

Der laufende Next-Dev-Container regeneriert bekannte fehlerhafte `.next/dev/types` für bestehende Fansub-/Member-Routensignaturen. Ein Typecheck nach Isolierung dieses generierten Caches bestand; ein späterer Wiederholungslauf traf erneut dieselben bereits in Phase 118 dokumentierten generierten Fremdfehler. Die fokussierten Quell-Lints bestehen ohne Fehler oder Warnungen.

## Verification

- Fokussierte Vitest-Suiten: **PASS**, 72/72 Tests.
- `FansubProjectsGrid` Second-Consumer-Regression: **PASS**, 4/4 Tests.
- Quell-Typecheck mit isoliertem stale `.next`-Cache: **PASS**.
- Fokussiertes ESLint für alle vier TS/TSX-Dateien: **PASS**, 0 Fehler/0 Warnungen.
- `git diff --check`: **PASS**.
- Keine neue API-, Auth-, Badge-, Carousel- oder Persistenz-Seam eingeführt.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 119-05 kann die automatisierte Abschlussmatrix und Live-In-App-Browser-UAT ausführen. Keine in-scope Blocker.

## Self-Check: PASSED

- Alle fünf geplanten Dateien vorhanden.
- Task-Commit `9e4aaae8` vorhanden.
- D-15 und D-16 durch fokussierte Tests und Diff-Review abgedeckt.

---
*Phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha*
*Completed: 2026-08-03*
