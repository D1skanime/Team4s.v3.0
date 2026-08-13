---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 05
subsystem: ui
tags: [nextjs, react, app-router, css-modules, responsive]

requires:
  - phase: 122-03
    provides: ProjectMemberSummary-Typ + getProjectMemberSummary
provides:
  - Route /fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug] (slug→ID, 404/Empty-State)
  - ProjectMemberPage (Breadcrumb, Hero, Summary, Sticky-Nav) + Sektions-Anker (Platzhalter fuer 122-06/07/08)
affects: [122-06, 122-07, 122-08, 122-10]

tech-stack:
  added: []
  patterns:
    - "Lesesektionen max-width ~1500px zentriert (D-17 Breitbild); Summary 4→2×2 responsiv"
    - "Empty-State (D-13): ohne Details nur Hero+Rollen+Text, keine Sektionen/Sticky-Nav"

key-files:
  created:
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx"
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
  modified: []

key-decisions:
  - "Slug→ID-Aufloesung wie bestehende fansubprojekt/page.tsx; 404 via notFound(), nie Redirect auf /members/[slug]"
  - "Rollen nur als Hero-Chips (D-12); Hero-Buttons Vollständiges Memberprofil (/members/[slug]) + Zurück zum Projekt (D-16)"
  - "Detail-Sektionen (Texte/Bilder/Releases) vorerst Platzhalter mit Ankern; 122-06/07/08 haengen die realen Client-Sektionen ein"

patterns-established:
  - "Eigenständiges Seiten-CSS (kein Skalieren einer Desktop-only-Variante), responsive Breakpoints"

requirements-completed: [D-02, D-04, D-10]

duration: ~30 min
completed: 2026-08-10
---

# Phase 122 Plan 05: Route-Gerüst + Hero/Summary/Sticky-Nav Summary

**Neue öffentliche Route mit Slug→ID-Auflösung und 404/Empty-State-Weiche plus kompaktem Hero, 4-Karten-Summary und Sticky-Schnellnavigation; die drei Detail-Sektionen sind als Anker vorbereitet.**

## Performance
- **Duration:** ~30 min
- **Completed:** 2026-08-10
- **Tasks:** 4 (Route, Komposition+Breadcrumb+Empty-State, Hero/Summary/StickyNav, Test)
- **Files:** 7 created

## Accomplishments
- Server-Route `mitwirkende/[memberSlug]/page.tsx`: getPublicFansubProfileBySlug → project/group → getProjectMemberSummary; notFound() bei fehlender Gruppe/Anime/Member/Projektbeziehung (D-10).
- `ProjectMemberPage`: Breadcrumb (Gruppe→/fansubs/[slug], Anime→Projektpfad, Member), Hero, Summary, Sticky-Nav; Empty-State (D-13) blendet Sektionen+Sticky-Nav aus.
- `ProjectMemberHero` (kompakt, Chips D-12, Absprünge D-16), `ProjectMemberSummaryBar` (4 Karten, responsive), `ProjectMemberStickyNav` (sticky/scrollbar, reduced-motion).
- Responsives, eigenständiges CSS (max-width 1500px, Summary 4→2×2, Hero-Umbruch, Mobile-Buttons full-width).
- 2 Tests grün (valide Kombination rendert; Empty-State ohne Sektionen/Sticky-Nav).

## Task Commits
1. **Task 1-4: Route + Komposition + Hero/Summary/Nav + Test** - `feat(122-05)`
**Plan metadata:** `docs(122-05)`

## Files Created/Modified
- Route `page.tsx` + `page.test.tsx`
- `projectMember/ProjectMemberPage.tsx` + Hero/Summary/StickyNav + `.module.css`

## Decisions Made
- Detail-Sektionen als Platzhalter-Anker; 122-06/07/08 haengen reale Client-Sektionen ein (animeID/groupID/memberSlug als Props bereits durchgereicht).

## Deviations from Plan
None - plan executed exactly as written (Platzhalter-Sektionen sind geplante 122-06/07/08-Einhaengepunkte).

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Seiten-Gerüst steht, typecheck+Tests grün. Bereit fuer 122-06 (Notes), 122-07 (Galerie), 122-08 (Releases), die die Platzhalter ersetzen.

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*
