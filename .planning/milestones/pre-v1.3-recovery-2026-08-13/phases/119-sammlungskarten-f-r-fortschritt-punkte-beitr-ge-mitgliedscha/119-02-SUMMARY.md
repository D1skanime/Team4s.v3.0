---
phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
plan: "02"
subsystem: api
tags: [go, postgres, openapi, typescript, public-profile, badge-progress]
requires:
  - phase: 119-01
    provides: Erwartungsrote badge_progress-, Sichtbarkeits- und Cross-Language-Verträge
provides:
  - Sechs autoritative Badge-Familienmetriken im bestehenden öffentlichen Memberprofil
  - Sichtbarkeitsminimierter additiver Go/OpenAPI/TypeScript-Vertrag
affects: [119-03, 119-04, public-member-profile, badge-collections]
tech-stack:
  added: []
  patterns: [gated additive projection, exact aggregate metrics, synchronized DTO contract]
key-files:
  created:
    - backend/internal/repository/member_profile_progress_repository.go
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_repository.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
key-decisions:
  - "badge_progress bleibt eine nicht persistierte, additive Projektion im bestehenden öffentlichen Memberprofil."
  - "Mitgliedschaftsfortschritt verwendet die längste einzelne historische Mitgliedschaft und bietet Gründungsmitglied nicht als erreichbares Ziel an."
patterns-established:
  - "Exakte Familienmetriken werden serverseitig hinter der bestehenden Public-/Owner-Antwortminimierung geladen."
requirements-completed: [D-01, D-02, D-03, D-04, D-06, D-07, D-08]
duration: 15min
completed: 2026-08-03
---

# Phase 119 Plan 02: Autoritative Badge-Fortschrittsprojektion Summary

**Sechs exakte Fortschrittsfamilien aus bestehenden Repository-Seams mit nicht-summierter Mitgliedschaft und synchronem Go/OpenAPI/TypeScript-Vertrag**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-03T13:07:00Z
- **Completed:** 2026-08-03T13:22:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `badge_progress` liefert `progress`, `points`, drei Beitragsfamilien und `membership` auch bei null als nicht-null Array.
- Projekt-, Punkte- und Beitragswerte verwenden bestehende autoritative Zählseams; Mitgliedschaft nimmt ausschließlich die größte Dauer einer einzelnen Zeile.
- Hidden-Responses enthalten keine Metriken, während öffentliche und Owner-sichtbare Profile den additiven Vertrag erhalten.
- Go-Runtime, OpenAPI und TypeScript verwenden identische Pflichtfelder und Nullability.

## Task Commits

1. **Task 1: Project exact family metrics inside the existing gated profile read** — `2f6a6bb5`
2. **Task 2: Synchronize contracts and prove visibility minimization** — `2fae1900`

## Files Created/Modified

- `backend/internal/repository/member_profile_progress_repository.go` — exakte Rohwerte, Schwellen und terminale Zustände.
- `backend/internal/models/member_profile.go` — `PublicMemberBadgeProgress` und nicht-null `badge_progress`.
- `backend/internal/repository/member_profile_repository.go` — Verdrahtung im bestehenden Profilassembler.
- `shared/contracts/openapi.yaml` — kanonischer additiver Schema-Vertrag.
- `frontend/src/types/profile.ts` — spiegelnder Browser-DTO.
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` — typvollständiger Owner-Fallback ohne Auth-Seam-Änderung.
- `frontend/src/app/members/[slug]/page.test.tsx` und `frontend/src/components/profile/MemberProfileHero.test.tsx` — vollständige Vertragsfixtures.

## Decisions Made

- `founding_member` bleibt ausschließlich earned-only in `public_badges`; der nächste erreichbare Mitgliedschaftsschritt beginnt bei fünf Jahren.
- Der bestehende Profilendpoint, Handler und SSR-Authpfad bleiben unverändert; es gibt keinen neuen Endpoint, Helper, Tokenpfad oder Migration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Terminalzustand des bestehenden Beitrags-Helpers explizit serialisiert**
- **Found during:** Task 1
- **Issue:** Der Wave-1-Vertrag prüft `complete` auch auf dem bestehenden Beitrags-Fortschrittshelper.
- **Fix:** Eine kompatible JSON-Projektion im neuen Repository-Extrakt leitet `complete` aus der vorhandenen nächsten Schwelle ab.
- **Files modified:** `backend/internal/repository/member_profile_progress_repository.go`
- **Verification:** fokussierte Repository-Tests grün.
- **Committed in:** `2f6a6bb5`

**2. [Rule 3 - Blocking] Bestehende TypeScript-Profilfixtures um Pflichtfeld ergänzt**
- **Found during:** Task 2
- **Issue:** Der neue erforderliche DTO-Schlüssel machte vorhandene Profilfixtures unvollständig.
- **Fix:** `badge_progress: []` in Owner-Fallback und betroffenen Fixtures ergänzt; keine Authlogik geändert.
- **Files modified:** `OwnHiddenProfilePreview.tsx`, `page.test.tsx`, `MemberProfileHero.test.tsx`
- **Verification:** Vertrags- und Seiten-Tests grün.
- **Committed in:** `2fae1900`

**Total deviations:** 2 auto-fixed (2 Rule 3). **Impact:** Vertragsvollständigkeit ohne neue Domänen-, Transport- oder Auth-Seam.

## Issues Encountered

- Der projektweite Frontend-Typecheck bleibt an vorbestehenden Next-Routentypen in Fansub-/Member-Seiten sowie drei `toHaveAttribute`-Matcher-Typen aus Wave 1 hängen. Die durch `badge_progress` verursachten DTO-Fehler wurden vollständig behoben; die verbleibenden Fehler liegen außerhalb dieses Plan-Diffs.

## Verification Results

- Repository: PASS — fokussierte Badge/Progress/Membership/Contribution/PublicProfile-Tests.
- Handler: PASS — `TestGetPublicMemberProfile` einschließlich Hidden-/Owner-Minimierung.
- Frontend: PASS — 10 Vertrags- und Memberseiten-Tests.
- Typecheck: BLOCKED durch dokumentierte vorbestehende Fehler außerhalb des Plan-Diffs; keine neuen `badge_progress`-Fehler.
- `git diff --check`: PASS.
- Diff-Sicherheitsprüfung: keine Route, kein API-Helper, keine Auth-Seam und keine Migration hinzugefügt.

## Known Stubs

None.

## Threat Flags

None — die neue Aggregatprojektion bleibt im bestehenden öffentlichen Profilvertrauensrand und gibt keine Gruppen-, Datums- oder Zeilendetails aus.

## User Setup Required

None.

## Next Phase Readiness

Die UI-Pläne 119-03/119-04 können die sechs stabilen Familienmetriken ohne Browserrekonstruktion konsumieren.

## Self-Check: PASSED

- Alle Key-Files existieren.
- Beide Task-Commits sind im Git-Verlauf vorhanden.
- Fokusprüfungen und `git diff --check` sind grün.

---
*Phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha*
*Completed: 2026-08-03*
