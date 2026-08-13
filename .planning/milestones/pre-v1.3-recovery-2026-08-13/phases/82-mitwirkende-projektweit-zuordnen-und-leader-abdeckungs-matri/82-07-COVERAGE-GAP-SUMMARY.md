---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "07"
subsystem: backend+frontend
tags:
  - gap-closure
  - coverage-matrix
  - cockpit-badges
  - aggregat-endpoint
  - d12
dependency_graph:
  requires:
    - 82-05
  provides:
    - GET /admin/fansubs/:id/anime-coverage (Coverage-Aggregat ohne N+1)
    - AnimeCoverageRepository.CoverageByFansub
    - getAnimeCoverage() in api.ts
    - Echte contributionCount-Werte in ProjectCockpitBadges
    - Echte coveredRoleCodes in CoverageMatrix
  affects:
    - backend/internal/repository/anime_coverage_repository.go (neu)
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
tech_stack:
  added: []
  patterns:
    - Aggregat-Query mit DISTINCT member_id + role_codes (kein N+1)
    - Promise.all(getAdminFansubAnime, getAnimeCoverage) beim Releases-Tab-Load
    - null = "noch nicht geladen" Pattern (D-12: kein falsches danger-Badge)
    - WithCoverageRepo fluent wiring
key_files:
  created:
    - backend/internal/repository/anime_coverage_repository.go
  modified:
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
decisions:
  - null-Semantik für contributionCount (number | null): null = noch nicht geladen → kein Badge; 0 = geladen und leer → danger. Verhindert D-12-Verstoß (falsches "Mitwirkende fehlen")
  - getAnimeCoverage-Fehler wird mit .catch(() => null) abgefangen — animeCoverageMap bleibt null, Badges bleiben neutral statt falsch danger zu zeigen
  - Eine Aggregat-Query für alle Anime der Gruppe (kein N+1): JOIN anime_contributions + anime_contribution_roles, WHERE status != 'rejected'
metrics:
  duration: "~15min"
  completed: "2026-06-11"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 8
---

# Phase 82 Gap-07: Coverage-Aggregat — echte Daten für Badges + CoverageMatrix

Schließt den in 82-05 dokumentierten Known Stub: `ProjectCockpitBadges.contributionCount=0` und `CoverageMatrix.coveredRoleCodes=[]` werden durch echte API-Daten ersetzt. D-12-konform: `null` = noch nicht geladen (neutral), `0` = geladen und leer (danger).

## Was wurde gemacht

### Backend

**AnimeCoverageRepository** (`anime_coverage_repository.go`, neu):
- `CoverageByFansub(ctx, fansubGroupID)` — eine einzige Query für alle Anime der Gruppe
- JOIN `anime_contributions` + `anime_contribution_roles`
- `COUNT(DISTINCT member_id)` + `ARRAY_AGG(DISTINCT role_code)` pro `anime_id`
- Filter: `status <> 'rejected'`

**FansubAnimeContributionsHandler** erweitert:
- Neues Feld `coverageRepo *AnimeCoverageRepository`
- `WithCoverageRepo(repo)` fluent setter
- `GetAnimeCoverage(c *gin.Context)` — MembersView-Guard (bestehender Guard-Stack), gibt `{ data: AnimeCoverageRow[] }` zurück

**Route** (admin_routes.go):
```
GET /admin/fansubs/:id/anime-coverage
```

**main.go**: `animeCoverageRepo := repository.NewAnimeCoverageRepository(dbPool)` + `.WithCoverageRepo(animeCoverageRepo)` in der Handler-Kette.

### Frontend

**api.ts**:
- Interface `AnimeCoverage { anime_id, member_count, covered_role_codes }`
- Interface `AnimeCoverageListResponse { data: AnimeCoverage[] }`
- `getAnimeCoverage(fansubId, authToken?)` — authorizedFetch gegen `/admin/fansubs/:id/anime-coverage`

**page.tsx**:
- State `animeCoverageMap: Map<number, AnimeCoverage> | null` (null = noch nicht geladen)
- `Promise.all([getAdminFansubAnime(fansubID), getAnimeCoverage(fansubID).catch(() => null)])` beim Releases-Tab-Load — Coverage-Fehler blockiert nicht die Anime-Liste
- `ProjectCockpitBadges contributionCount`: `animeCoverageMap === null ? null : (map.get(id)?.member_count ?? 0)`
- `CoverageMatrix coveredRoleCodes`: `animeCoverageMap?.get(id)?.covered_role_codes ?? []`

**ProjectCockpitBadges.tsx**:
- Prop `contributionCount: number | null` (war `number`)
- `null` → kein Badge (neutral/leer bis geladen)
- `0` → danger "Mitwirkende fehlen"
- `> 0` → neutral "Mitwirkende (N)"

## Deviations from Plan

Keine — Plan exakt ausgeführt.

## Stubs beseitigt

- `ProjectCockpitBadges.contributionCount=0` (war Placeholder) → echte member_count aus Aggregat
- `CoverageMatrix.coveredRoleCodes=[]` (war Placeholder) → echte covered_role_codes aus Aggregat

## Threat Flags

Keine neuen Sicherheitsflächen über den bekannten Threat-Stack hinaus.
- Neuer GET-Endpoint nutzt denselben MembersView-Guard wie bestehende Contribution-Endpoints

## Self-Check: PASSED

- [x] `go build ./...` — grün (BUILD OK)
- [x] `npm run typecheck` — grün (0 Fehler)
- [x] `npx vitest run src/app/admin/fansubs` — 91 Tests grün (14 Dateien)
- [x] Commit fffacf8f — alle 9 Dateien enthalten
- [x] `backend/internal/repository/anime_coverage_repository.go` — 67 Zeilen (≤ 450)
- [x] `backend/internal/handlers/fansub_anime_contributions_handler.go` — Struct + 3 Methoden ergänzt, Datei ≤ 450 Zeilen
- [x] `getAnimeCoverage` in api.ts exportiert
- [x] `animeCoverageMap === null` → `contributionCount={null}` → kein Badge (D-12)
