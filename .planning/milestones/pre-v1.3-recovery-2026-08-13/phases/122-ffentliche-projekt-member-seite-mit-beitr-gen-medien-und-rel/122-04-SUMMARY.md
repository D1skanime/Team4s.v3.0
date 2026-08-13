---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 04
subsystem: ui
tags: [nextjs, react, routing, css-modules]

requires:
  - phase: 122-03
    provides: Route-Helper + Projekt-Member-Route
provides:
  - ProjectMemberRows verlinkt interne Member auf die Projekt-Member-Route (nur mit canonicalProjectPath)
  - In-Card-Affordance "Beiträge im Projekt ansehen →" (hover/focus, D-14)
affects: [122-05, 122-10]

tech-stack:
  added: []
  patterns:
    - "canonicalProjectPath aus PublicFansubProjectPageData als einzige Slug-Quelle (kein Param-Threading)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/ProjectMemberRows.tsx
    - frontend/src/components/fansubs/ProjectMemberRows.test.tsx
    - frontend/src/components/fansubs/FansubTeamSection.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx

key-decisions:
  - "canonicalProjectPath (bereits in den Projektdaten) statt separatem groupSlug/animeSlug-Threading; ohne Pfad Fallback auf /members/[slug]"
  - "Affordance nur bei Hover/Fokus sichtbar (opacity), aria-hidden; Chevron bleibt permanent (D-14)"

patterns-established:
  - "Link-Change strikt auf ProjectMemberRows + minimales Prop-Threading (TeamSection, ProjectPage)"

requirements-completed: [D-03]

duration: ~20 min
completed: 2026-08-10
---

# Phase 122 Plan 04: Link-Change ProjectMemberRows Summary

**Interne Memberkarten der Fansub-Projektseite verlinken auf die Projekt-Member-Route (via canonicalProjectPath), externe/slug-lose bleiben nicht klickbar, mit dezenter Hover/Fokus-Affordance — alle anderen Member-Links unveraendert.**

## Performance
- **Duration:** ~20 min
- **Completed:** 2026-08-10
- **Tasks:** 3 (Link-Change, Prop-Threading, Regressionstest)
- **Files:** 5 modified

## Accomplishments
- `ProjectMemberRows`: interne Member (slug + canonicalProjectPath) -> `${canonicalProjectPath}/mitwirkende/[slug]`; ohne Pfad Fallback `/members/[slug]`; externe ohne slug bleiben `<div>` (nicht klickbar). Ganze Karte = Link.
- In-Card-Affordance "Beiträge im Projekt ansehen →" (CSS opacity, nur Hover/Fokus, reduced-motion respektiert, aria-hidden) — kein zweiter Navigationsweg.
- `TeamSection` + `ProjectPage` reichen `canonicalProjectPath` durch (bereits in den Projektdaten vorhanden).
- 3 Regressionstests grün: Rollen-Anzeige, Fallback-/members/-Route ohne Pfad, Projekt-Member-Route mit Pfad + Affordance.

## Task Commits
1. **Task 1-3: Link-Change + Threading + Test** - `feat(122-04)`
**Plan metadata:** `docs(122-04)`

## Files Created/Modified
- `ProjectMemberRows.tsx` - Link-Logik + Affordance
- `ProjectMemberRows.test.tsx` - 3 Tests (inkl. neuem Projekt-Member-Fall)
- `FansubTeamSection.module.css` - .projectAffordance (hover/focus reveal)
- `TeamSection.tsx` / `ProjectPage.tsx` - canonicalProjectPath-Prop durchgereicht

## Decisions Made
- canonicalProjectPath als einzige Slug-Quelle (kein Param-Threading vom Wrapper) — funktioniert fuer beide Routen; ID-basierte Route ohne aufloesbare Slugs faellt sauber auf /members/[slug] zurueck.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Korrektheit] Slug-Quelle: canonicalProjectPath statt groupSlug/animeSlug**
- **Found during:** Task 2
- **Issue:** Plan sah groupSlug+animeSlug-Props vor; der Anime-Slug ist in der ID-basierten Projektdaten NICHT vorhanden, wohl aber `data.canonicalProjectPath` (der fertige Pretty-Projektpfad).
- **Fix:** ProjectMemberRows/TeamSection/ProjectPage nutzen canonicalProjectPath; Link = Pfad + /mitwirkende/[slug].
- **Verification:** tsc sauber; 3 Tests grün.

---

**Total deviations:** 1 auto-fixed (1 Korrektheit). **Impact:** Robustere, threading-arme Loesung; kein Scope-Creep. buildPublicFansubProjectMemberPath (122-03) bleibt fuer Slug-Aufrufer verfuegbar.

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- §2/§30-Link-Verhalten umgesetzt und getestet. Alle anderen Member-Links (Ranking/Archiv/Gruppenseite) unberuehrt (in 122-10 als Regression abgesichert).
- Bereit fuer Wave 3 (Seite + Sektionen 122-05..09).

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*
