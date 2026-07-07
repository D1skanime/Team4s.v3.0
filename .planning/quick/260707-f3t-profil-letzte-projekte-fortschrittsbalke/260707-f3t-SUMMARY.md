---
phase: quick-260707-f3t
plan: 01
subsystem: profile
tags: [go, postgres, pgx, next.js, react, vitest, member-profile]

# Dependency graph
requires:
  - phase: quick-260707-ehc
    provides: loadRecentContributions project aggregation across release_member_roles and anime_contributions
provides:
  - "worked_release_version_count/total_release_version_count on MemberProfileRecentContribution (backend + frontend types)"
  - "Absolute worked/total progress bar in the profile 'Letzte Projekte' section"
affects: [member-profile, fansub-contributions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Correlated subqueries against a CTE alias (project_rows) for per-row aggregate metrics that must span all release versions of a scope, not just credited ones"
    - "member_claims-based app_user_id resolution when appUserID is not already a handler parameter (memberID-scoped repository methods)"

key-files:
  created: []
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_test.go
    - frontend/src/types/profile.ts
    - frontend/src/components/profile/RecentContributionsSection.tsx
    - frontend/src/components/profile/RecentContributionsSection.test.tsx

key-decisions:
  - "worked_release_version_count/total_release_version_count are computed via two correlated subqueries against project_rows (not inside the project_rows CTE) because the CTE only groups over credited rows (deduped), while the metric must cover ALL release versions of the anime+fansub_group scope"
  - "Frontend merge (toRecentProjects) does not sum worked/total across multiple role rows of the same project — backend already returns these pre-aggregated per anime_id+fansub_group_id, so summing would double-count"

patterns-established:
  - "Absolute worked/total progress metric pattern for profile gamification bars (avoids relative-to-max-visible-item metrics that misleadingly hit 100%)"

requirements-completed: [Q-01]

# Metrics
duration: ~25min
completed: 2026-07-07
---

# Phase quick-260707-f3t: Profil Letzte Projekte Fortschrittsbalke Summary

**Fortschrittsbalken in Profil-Sektion "Letzte Projekte" zeigt jetzt worked/total Release-Versionen (z.B. 1/12 = 8%) statt einer relativen Zahl, die bei einem sichtbaren Projekt immer 100% ergab.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-07T08:35:00Z
- **Completed:** 2026-07-07T09:01:51Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments
- Backend liefert pro Projekt-Zeile `worked_release_version_count` (distinct Release-Versionen mit eigener Notiz ODER eigenem Medien-Upload) und `total_release_version_count` (alle distinct Release-Versionen des Projekts bei der Gruppe)
- Reine Rollen-/Projekt-Besetzung ohne eigene Notiz/Medien zählt nicht mehr als "bearbeitet"
- Frontend rendert den Balken als absolute Prozentzahl `worked/total*100` mit deutschem aria-label und sicherem 0%-Fallback bei `total=0`

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs):

1. **Task 1: Backend — worked/total Release-Version-Counts** - `85672e60` (test, RED) → `20afa677` (feat, GREEN)
2. **Task 2: Frontend — absoluter Fortschrittsbalken** - `4b001c2d` (test, RED) → `c57ca4dd` (feat, GREEN)

_Note: docs/STATE.md metadata commit is handled by the orchestrator, not this executor._

## Files Created/Modified
- `backend/internal/models/member_profile.go` - `MemberProfileRecentContribution` erhält `WorkedReleaseVersionCount`/`TotalReleaseVersionCount` (int32)
- `backend/internal/repository/member_profile_repository.go` - `loadRecentContributions` SELECT erweitert um zwei korrelierte Subqueries (total/worked) gegen `project_rows`; Scan-Reihenfolge um beide Felder ergänzt (total zuerst, dann worked)
- `backend/internal/repository/member_profile_repository_test.go` - `TestMemberProfileRepositorySourceInvariants` um Source-Text-Assertions für die neuen Spalten, has-own-notes/has-own-media-Bedingungen, member_claims-Auflösung und Scan-Reihenfolge erweitert
- `frontend/src/types/profile.ts` - `MemberProfileRecentContribution` Typ um `worked_release_version_count?`/`total_release_version_count?` ergänzt
- `frontend/src/components/profile/RecentContributionsSection.tsx` - `projectWorkUnits`/`maxWorkUnits` entfernt; neue `progressPercent`/`progressLabel` Hilfsfunktionen; Balkenbreite und aria-label nutzen jetzt worked/total; Merge summiert die neuen Felder NICHT über mehrere Rollen-Zeilen
- `frontend/src/components/profile/RecentContributionsSection.test.tsx` - Fixture-Default um worked/total ergänzt; 3 neue Tests (8%-Balken bei 1/12, kein Aufsummieren beim Merge, 0%-Fallback bei total=0 ohne Crash)

## Decisions Made
- Die worked/total-Subqueries laufen als korrelierte Subqueries gegen `project_rows` statt in der `project_rows`-CTE selbst, weil die CTE nur über `deduped` (Credit-Zeilen) gruppiert und die Metrik quellenunabhängig ALLE Release-Versionen der Gruppe/des Anime zählen muss.
- `$1` (memberID) wird für beide neuen Subqueries wiederverwendet; keine neuen Bind-Parameter nötig, Funktionssignatur von `loadRecentContributions` bleibt unverändert.
- Frontend-Merge summiert worked/total nicht über mehrere Rollen-Zeilen desselben Projekts (im Unterschied zu release_version_count/episode_count), da das Backend diese Werte bereits pro Projekt aggregiert liefert.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend und Frontend sind lokal build-/test-grün; Docker-Rebuild/-Restart und Live-UAT unter `:3000/me/profile` (member_id 2) sind laut Plan vom Orchestrator durchzuführen (siehe Verification-Schritt 3 im Plan).
- Keine offenen Blocker.

---
*Phase: quick-260707-f3t*
*Completed: 2026-07-07*

## Self-Check: PASSED

All 6 modified files verified present on disk; all 4 task commits (85672e60, 20afa677, 4b001c2d, c57ca4dd) verified in git log.
