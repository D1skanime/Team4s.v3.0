---
phase: 121-rollen-badges-visuell-und-funktional-perfektionieren
plan: 02
subsystem: ui
tags: [react, accessibility, responsive-css, focal-carousel]
requires:
  - phase: 121-01
    provides: failing role-card contracts and stable artwork baseline
provides:
  - canonical five-stage role progress projection
  - semantic noninteractive rank track with active/inactive/expanded card states
affects: [member-profile, role-badges, accessibility]
tech-stack:
  added: []
  patterns: [single threshold projection, consumer-owned carousel state styling]
key-files:
  created: []
  modified: [frontend/src/components/profile/memberBadgeLabels.ts, frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css]
key-decisions:
  - "Der Rollen-Track ist bildfrei und rein informativ; Hero-Artwork bleibt die einzige Medaillenabbildung."
  - "Timing-Ränge verwenden weiterhin direkte Assets, alle übrigen Ränge das bestehende Motiv-/Frame-Layering."
patterns-established:
  - "active/inactive/expanded variieren denselben DOM-Baum ausschließlich über State-Attribute und CSS."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-27, D-28]
duration: 14min
completed: 2026-08-10
---

# Phase 121 Plan 02: Rollenkarte als FocalCarousel-Consumer Summary

**Responsiver Rollen-Hero mit kanonischem Fünf-Stufen-Track, echter Count-/Restanzeige und zustandsstabilem Carousel-DOM.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-10T11:29:34Z
- **Completed:** 2026-08-10T11:43:34Z
- **Tasks:** 2
- **Files modified:** 4 einschließlich Vertragsupdates

## Accomplishments

- Eine Stage-Projektion aus den bestehenden Schwellen liefert Einstieg, Bronze, Silber, Gold und Platin mit `reached`, `current` oder `locked`.
- Die Rollenkarte zeigt Hero, Rang, echten Count, Ziel/Rest und einen nichtinteraktiven `ol/li`-Track mit `aria-current="step"`.
- Active, inactive und expanded verwenden denselben Rollenbaum; responsive Geometrie und Detaildichte werden nur per CSS gesteuert.
- Direkte Timing-Dateien und das bestehende Layering/`ResponsiveImage` bleiben erhalten; Shared-FocalCarousel wurde nicht geändert.

## Task Commits

1. **Task 1: Kanonische Track-Präsentation und Rollenkarte** - `d35644e8`
2. **Task 2: Responsive Zustandskomposition** - `691f24a7`

## Files Created/Modified

- `frontend/src/components/profile/memberBadgeLabels.ts` - kanonische Stage-Projektion.
- `frontend/src/components/profile/MemberBadgeChain.tsx` - Hero-, Count-, Copy- und Rank-Track-Komposition.
- `frontend/src/components/profile/MemberBadgeChain.module.css` - fünfspaltiger Track und responsive Zustände.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Wave-1-RED-Verträge auf grüne Verträge umgestellt.

## Decisions Made

- Der redundante Rollen-Progressbar entfällt; Count und Ziel-/Restcopy bleiben sichtbar.
- Der Rank-Track enthält keine Thumbnail-Bilder und keine interaktiven Elemente.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test contract] Veraltete Phase-118-Erwartungen an Track-Bilder und Progressbar korrigiert**
- **Found during:** Task 1
- **Issue:** Ältere Tests erwarteten genau die UI-Elemente, deren Entfernung Plan 121-02 ausdrücklich verlangt.
- **Fix:** Verträge auf bildfreien Track und fehlende redundante Progressbar umgestellt.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** 116 fokussierte Tests grün.
- **Committed in:** `d35644e8`

**2. [Rule 1 - Artwork resolver] Timing aus dem generischen Layering ausgeschlossen**
- **Found during:** Task 1
- **Issue:** Der Layer-Resolver überlagerte die direkte Timing-Asset-Seam.
- **Fix:** Timing bleibt ausschließlich in `resolveBadgeArtwork` direkt aufgelöst.
- **Committed in:** `d35644e8`

**Total deviations:** 2 auto-fixed bugs. Keine Scope-Erweiterung.

## Verification

- `memberBadgeLabels.test.ts` + `MemberBadgeChain.test.tsx`: 116/116 grün.
- `MemberBadgeChain.test.tsx` + `FocalCarousel.test.tsx`: 85/85 grün.
- Gezieltes ESLint für Resolver/Consumer: grün.
- `git diff --check`: grün.
- Globaler Typecheck: blockiert ausschließlich durch bereits bestehende generierte `.next/dev/types`-Fehler an sechs Route-Props; keine Plan-Datei ist betroffen.
- Shared-Tests geben bestehende React-`act(...)`-Warnungen aus, bleiben aber vollständig grün.

## Known Stubs

Keine.

## Self-Check: PASSED

- Alle drei Implementierungsdateien vorhanden.
- Commits `d35644e8` und `691f24a7` im Git-Verlauf vorhanden.
- Keine Shared-, Asset-, Backend-, API-, DB- oder Paketänderung durch diesen Plan.

---
*Phase: 121-rollen-badges-visuell-und-funktional-perfektionieren*
*Completed: 2026-08-10*
