---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 10
subsystem: testing
tags: [vitest, regression, live-uat, api-smoke]

requires:
  - phase: 122-09
    provides: vollständige UI (Page + Sektionen + Viewer)
provides:
  - Routing-Regressionssuite + Live-UAT (API-Smoke + Browser) der gesamten Phase 122
affects: []

tech-stack:
  added: []
  patterns:
    - "Routing-Regression per Quelltext-Assertion (Rangliste/Archiv bleiben /members/)"

key-files:
  created:
    - frontend/src/components/fansubs/projectMember/ProjectMemberRoutingRegression.test.tsx
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx

key-decisions:
  - "setLoading(true)/setError(false) aus dem Initial-Effekt entfernt (react-hooks/set-state-in-effect); loading initialisiert bereits true"

patterns-established:
  - "Live-UAT: öffentliche Endpunkte per curl (200/404 + Count==sichtbar) + Browser über SSH-Tunnel 127.0.0.1:3300"

requirements-completed: [D-03, D-09, D-10]

duration: ~40 min
completed: 2026-08-10
---

# Phase 122 Plan 10: Regression + Live-UAT Summary

**Routing-Regressionssuite und vollständiges Live-UAT (API-Smoke + Browser) für Phase 122: valide Kombination rendert, 404 bei unbekanntem Member, Counts == sichtbare Zeilen, alle Sektionen live bestätigt.**

## Performance
- **Duration:** ~40 min
- **Completed:** 2026-08-10
- **Tasks:** 3 (Routing-Regression, Visibility/Pagination-Regression, Suite + Live-UAT)
- **Files:** 1 created, 3 modified (Lint-Fix)

## Accomplishments
- **Routing-Regression** (`ProjectMemberRoutingRegression.test.tsx`): Rangliste + Archiv behalten `/members/[slug]`, nur ProjectMemberRows baut `/mitwirkende/`. Zusätzlich Rangliste-`page.test.tsx` (6 Tests) als Regression bestätigt.
- **Lint-Fix**: `react-hooks/set-state-in-effect` in den drei Sektionen behoben (0 Fehler).
- **Volle Verifikation:**
  - Frontend: typecheck sauber, eslint 0 Fehler, **29 Tests grün** (8 Dateien: Rows, NoteCard/NotesSection, MediaCard/Gallery, Viewer, Releases, Routing-Regression, Route-Helper, Ranking, Page).
  - Backend: `go build ./...` RC 0, ProjectMember Repo- + Handler-Tests grün.
  - **API-Smoke (live, :18092)** auf `anime 1 / group 1 / csubs-leader`: Summary/Notes/Media/Releases HTTP 200, bogus Member HTTP 404. Counts {roles:11, notes:2, media:1, releases:0} == tatsächlich gelieferte Zeilen (Brief 23).
  - **Browser-Live-UAT** über SSH-Tunnel `127.0.0.1:3300` auf `/fansubs/c-subs/fansubprojekt/vipers-creed/mitwirkende/csubs-leader`: Breadcrumb (C-Subs › Viper's Creed › CSubs Leader), Hero (Verifiziert-Badge, 11 Rollen-Chips mit korrekten Umlauten, beide Absprung-Buttons), Summary 11/0/2/1, Sticky-Nav, Texte (Mehr anzeigen + Release-Links), Bilder (Outtake), leere Releases (Count 0 == leere release_member_roles). Bogus Member → 404 (kein Redirect auf /members/, §25).

## Task Commits
1. **Task 1-3: Routing-Regression + Lint-Fix + Live-UAT** - `feat(122-10)`
**Plan metadata:** `docs(122-10)`

## Files Created/Modified
- ProjectMemberRoutingRegression.test.tsx (neu) + 3 Sektionen (Lint-Fix)

## Decisions Made
- Initial-Effekt ohne synchrones setState (loading initial true).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Korrektheit] set-state-in-effect Lint-Fehler**
- **Found during:** Task 3 (eslint)
- **Issue:** synchrones setLoading(true)/setError(false) im Initial-Effekt (3 Sektionen) verstiess gegen react-hooks/set-state-in-effect.
- **Fix:** Zeilen entfernt; loading initialisiert bereits true.
- **Verification:** eslint 0 Fehler; alle Sektions-Tests weiter grün.

---

**Total deviations:** 1 auto-fixed. **Impact:** Lint-Konformität; kein Verhaltensunterschied.

## Issues Encountered
- Datenlage: `release_member_roles` ist im Dev-Datensatz leer → Releases-Sektion legitim leer (Count 0). Roles/Notes/Media über anime_contributions/release_version_notes/release_version_media live bestätigt.
- `release_member_roles`-basierte Release-Historie konnte daher nur strukturell (Empty-State + API 200) verifiziert werden, nicht mit befüllten Karten.

## User Setup Required
None.

## Next Phase Readiness
- **Phase 122 vollständig.** Backend-Read-Modell, Visibility, Routing, UI, Responsive, Pagination, Galerie, Media Viewer, Release-Historie, Empty States, 404, A11y, Tests, Performance umgesetzt und verifiziert; keine bestehende allgemeine Membernavigation verändert (Regression grün).

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*
