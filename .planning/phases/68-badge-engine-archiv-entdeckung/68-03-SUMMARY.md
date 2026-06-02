---
phase: 68-badge-engine-archiv-entdeckung
plan: "03"
subsystem: archiv-suche
tags:
  - backend
  - frontend
  - repository
  - public-route
  - search
  - pagination
  - badge-labels
dependency_graph:
  requires:
    - "68-01"
    - "68-02"
  provides:
    - member-archive-search-backend
    - archiv-frontend-page
    - badge-chip-labels-extended
  affects:
    - frontend/src/components/profile/MemberBadgeChips.tsx
    - backend/cmd/server/main.go
tech_stack:
  added: []
  patterns:
    - offset-pagination (page/limit mit pgx-Parameters)
    - source-inspection-tests (keine echte DB)
    - server-component-with-searchparams (Next.js App Router)
    - public-route-no-auth (Gin)
key_files:
  created:
    - database/migrations/0095_archive_search_indexes.up.sql
    - database/migrations/0095_archive_search_indexes.down.sql
    - backend/internal/repository/member_archive_repository.go
    - backend/internal/repository/member_archive_repository_test.go
    - backend/internal/handlers/member_archive_handler.go
    - frontend/src/app/archiv/page.tsx
    - frontend/src/app/archiv/page.module.css
    - frontend/src/components/archive/MemberSearchCard.tsx
    - frontend/src/components/archive/archive.module.css
  modified:
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - frontend/src/components/profile/MemberBadgeChips.tsx
decisions:
  - "Migration 0095 statt 0092 — 0092 ist durch member_claim_invitations belegt (Pitfall 4); Migrations-Nummer angepasst, Inhalt unverändert"
  - "Batch-Queries für TopRoles und Groups — separater Query-Pass nach Haupt-Query mit ANY($1) statt CTE; einfacherer Code, pgx native Array-Binding"
  - "getFansubs() als Alias für getFansubList() — wiederverwendet existierende Funktion ohne Duplizierung"
metrics:
  duration: 35min
  completed_date: "2026-06-02"
  tasks_completed: 2
  files_changed: 12
---

# Phase 68 Plan 03: Archiv-Suche vollständig Summary

**One-liner:** Öffentliche Member-Archiv-Suche mit drei parametrisierten AND-Filtern, Offset-Pagination, MemberSearchCard-Raster und 6 neuen Badge-Chip-Labels.

## Was gebaut wurde

### Task 1 — Backend: Migration, Repository, Handler, Route

**Migration 0095** (statt 0092 — Deviation):
- `idx_members_profile_visibility` auf `members(profile_visibility)`
- `idx_member_claims_member_claim_status` auf `member_claims(member_id, claim_status)`

**MemberArchiveRepository.SearchMembers** (`member_archive_repository.go`, 290 Zeilen):
- Drei obligatorische Sichtbarkeits-WHERE-Bedingungen (T-68-03-01):
  `m.profile_visibility = 'public' AND ac.is_public_on_member_profile = true AND hfgm.visibility = 'public'`
- Alle vier Filter (RoleCode, FansubGroupID, YearFrom, YearUntil) via pgx `$N`-Parameter
- Rolle-Filter als EXISTS-Subquery (sicherer als JOIN für DISTINCT-Semantik)
- Pagination-Bounds: page < 1 → 1, page > 1000 → 1000 (T-68-03-02)
- Batch-Queries für TopRoles und Groups (ANY($1) Array-Binding)

**MemberArchiveHandler.SearchArchive** (kein Auth-Gate, Pitfall 6):
- Öffentliche Route GET /api/v1/archiv
- Alle Query-Params über strconv.ParseInt/Atoi — keine String-Interpolation (T-68-03-03)

**Route in main.go:**
```go
v1.GET("/archiv", archiveHandler.SearchArchive)  // public — kein authMiddleware
```

**Source-Inspection-Tests** (3 Tests, alle grün):
- `TestArchiveVisibilityFilter` — prüft alle drei Sichtbarkeits-Bedingungen
- `TestArchivePaginationBounds` — prüft Offset-Berechnung und Bounds-Normierung
- `TestArchiveRoleFilter` — prüft EXISTS-Subquery mit parameterized role_code

### Task 2 — Frontend: /archiv-Seite, MemberSearchCard, Badge-Labels

**api.ts** — zwei neue Exports:
- `searchArchive(params)` — öffentlicher Fetch gegen GET /api/v1/archiv, KEIN `revalidate`-Hint
- `getFansubs()` — Alias für `getFansubList()` ohne Parameter für Gruppen-Dropdown
- Typen `ArchiveMemberRow` + `ArchiveSearchResponse` inline definiert

**MemberSearchCard.tsx** (neue Komponente):
- Props: id, nickname, displayName, slug, avatarPath, isVerified, topRoles, groups
- Avatar 48×48px, border-radius 50%, Fallback `/placeholder-avatar.png`
- Rollen: max 3 via ROLE_LABELS-Map (Deutsch mit Umlauten), danach "+N weitere"
- Gruppen: max 2, danach "+ N weitere"
- VerifiedBadge: conditional `<VerifiedBadge />` wenn isVerified=true
- Profil-Link: nur wenn slug vorhanden

**archive.module.css** (4-Punkt-konform gemäß 68-UI-SPEC.md):
- padding: 16px, gap: 8px, cardHeader gap: 8px, roleChip padding: 4px 8px

**/archiv/page.tsx** (Server Component, force-dynamic):
- searchParams: rolle, gruppe, von, bis, page
- Await searchArchive() + getFansubs() — kein revalidate
- Filter-Form (role="search", action="/archiv" method="GET") — kein JS nötig
- Gruppen-Select befüllt aus getFansubs() (D-14)
- EmptyState-Unterscheidung mit/ohne Filter (D-14)
- Offset-Pagination mit buildArchivUrl() — URL-State

**MemberBadgeChips.tsx** — BADGE_LABELS erweitert:
- `first_contribution`, `productive_bronze`, `productive_silver`, `productive_gold`, `all_rounder`, `verified`
- 9 Einträge gesamt (3 bestehend + 6 neu)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migrationsnummer 0092 → 0095**
- **Found during:** Task 1 — Dateiprüfung
- **Issue:** Migration 0092 ist bereits durch `0092_member_claim_invitations.up.sql` belegt (Pitfall 4 aus RESEARCH.md war auf 0091 verifiziert, aber zwischenzeitlich wurden 0092–0094 durch andere Pläne erzeugt)
- **Fix:** Migration als `0095_archive_search_indexes.up.sql` + `.down.sql` angelegt
- **Files modified:** database/migrations/0095_archive_search_indexes.up.sql, .down.sql
- **Commit:** 1841c0d7

## Threat Surface Scan

Keine neuen nicht in plan beschriebenen Security-Surfaces. Alle drei Sichtbarkeits-WHERE-Bedingungen sind implementiert (T-68-03-01). Alle Filter parameterized (T-68-03-03). Route ohne authMiddleware in public section (T-68-03-04). Keine neuen npm-Pakete (T-68-03-SC).

## Known Stubs

Keine. Alle Daten fließen vom echten Backend-Endpunkt. Gruppen-Dropdown zeigt leeres Select bei Ladefehler (kein fatal-Stub, intentional graceful degradation).

## Self-Check

### Commits

- `1841c0d7` — feat(68-03): backend Archiv-Suche — Migration 0095, Repository, Handler, Route
- `83bf250c` — feat(68-03): frontend Archiv-Seite, MemberSearchCard, Badge-Labels

### Files created/modified

- [x] database/migrations/0095_archive_search_indexes.up.sql — vorhanden
- [x] database/migrations/0095_archive_search_indexes.down.sql — vorhanden
- [x] backend/internal/repository/member_archive_repository.go — vorhanden
- [x] backend/internal/repository/member_archive_repository_test.go — vorhanden
- [x] backend/internal/handlers/member_archive_handler.go — vorhanden
- [x] backend/cmd/server/main.go — Route und Instanziierung eingetragen
- [x] frontend/src/app/archiv/page.tsx — vorhanden (force-dynamic)
- [x] frontend/src/app/archiv/page.module.css — vorhanden
- [x] frontend/src/components/archive/MemberSearchCard.tsx — vorhanden
- [x] frontend/src/components/archive/archive.module.css — vorhanden
- [x] frontend/src/components/profile/MemberBadgeChips.tsx — 9 Badge-Labels
- [x] frontend/src/lib/api.ts — searchArchive + getFansubs exportiert

### Build verification

- `go build ./...` — fehlerfrei (Task 1)
- `go test ./internal/repository/... -run "TestArchive"` — 3/3 PASS
- `npm run build` — fehlerfrei; /archiv als ƒ (Dynamic) gelistet

## Self-Check: PASSED
