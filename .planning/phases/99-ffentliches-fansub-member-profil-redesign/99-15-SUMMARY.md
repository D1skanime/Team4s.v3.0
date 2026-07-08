---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "15"
subsystem: api
tags: [go, gin, pgx, openapi, typescript, fansub]

# Dependency graph
requires:
  - phase: 99 (Add-on 4)
    provides: bestehende ListGroupLinks/fansub_group_media Spalten und öffentliche Fansub-Profil-Query
provides:
  - PublicFansubProfileResponse.CommunityLinks additiv aus ListGroupLinks befüllt
  - PublicFansubMediaItem trägt title/description/category
  - Soft-Delete-Bugfix im Public-Media-Query (fgm.deleted_at IS NULL)
  - OpenAPI/TS-Contract-Konsistenz für beide Erweiterungen
affects: [99-16, 99-17, 99-18]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/internal/models/fansub.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/fansub.ts
    - frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx

key-decisions:
  - "CommunityLinks wird nach dem Media-Block in GetPublicProfileBySlug befüllt, initial als leerer Slice (nie nil)"
  - "category ist required (non-nullable string) im Contract, weil die DB-Spalte NOT NULL DEFAULT 'other' ist"

patterns-established: []

requirements-completed: ["AO5-01", "AO5-02"]

# Metrics
duration: 25min
completed: 2026-07-08
---

# Phase 99 Plan 15: Public-DTO Community-Links + Medien-Felder + Soft-Delete-Bugfix Summary

**Öffentliches Fansub-Profil-DTO erweitert um community_links (aus fansub_group_links via ListGroupLinks) und Medien-Titel/Beschreibung/Kategorie, plus Bugfix: soft-gelöschte Medien werden nicht mehr im Public-Query zurückgegeben.**

## Performance

- **Duration:** ca. 25 min
- **Started:** 2026-07-08T19:50:00Z
- **Completed:** 2026-07-08T20:15:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 7 (5 geplant + 2 Rule-3-Testfixtures)

## Accomplishments
- `GetPublicProfileBySlug` befüllt jetzt `resp.CommunityLinks` über die bestehende `ListGroupLinks`-Query (keine neue Query nötig).
- `listPublicFansubMedia` selektiert zusätzlich `fgm.title`, `fgm.description`, `fgm.category` und filtert soft-gelöschte Medien (`AND fgm.deleted_at IS NULL`) aus dem Public-Profil aus — vorher konnten gelöschte, ehemals public/approved Medien noch angezeigt werden.
- OpenAPI-Contract und TS-Typen (`frontend/src/types/fansub.ts`) spiegeln beide additiven Erweiterungen 1:1, inklusive eines neuen `FansubGroupLink`-Schemas im Contract.
- Live gegen den neu gebauten Docker-Backend-Container verifiziert: `/api/v1/fansub-slugs/c-subs/public-profile` liefert `community_links` (3 Einträge: discord/irc/website) und Media-Items mit `title`/`description`/`category` (z. B. `"category": "old_website"`, `"category": "history_screenshot"`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Go-Models + Public-Media-Query + Community-Links + Soft-Delete-Bugfix** - `b2ac91e2` (feat)
2. **Task 2: OpenAPI-Contract + TS-Typen konsistent nachziehen** - `562d20b4` (feat)

**Plan metadata:** (folgt in separatem Metadaten-Commit)

## Files Created/Modified
- `backend/internal/models/fansub.go` - `PublicFansubProfileResponse.CommunityLinks` + `PublicFansubMediaItem.Title/Description/Category` ergänzt
- `backend/internal/repository/fansub_repository.go` - `GetPublicProfileBySlug` befüllt CommunityLinks via ListGroupLinks; `listPublicFansubMedia` SELECT/WHERE/Scan um Titel/Beschreibung/Kategorie + `deleted_at IS NULL`-Filter erweitert
- `backend/internal/repository/fansub_repository_test.go` - `TestFansubRepository_PublicProfileSourceInvariants`-Fragmentliste um die neuen Code-/SQL-Fragmente erweitert
- `shared/contracts/openapi.yaml` - `PublicFansubMediaItem` um title/description/category, neues `FansubGroupLink`-Schema, `PublicFansubProfile.community_links` ergänzt
- `frontend/src/types/fansub.ts` - `PublicFansubMediaItem`/`PublicFansubProfile` TS-Typen entsprechend erweitert
- `frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx` - bestehende Test-Fixtures um `community_links: []` und `category` ergänzt (sonst TS2741 durch neue Pflichtfelder)
- `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx` - Test-Fixture `mediaRow()` um `category: 'other'` ergänzt

## Decisions Made
- `CommunityLinks` wird nach dem bestehenden Media-Sub-Loader befüllt und wie die anderen Sub-Loader per Error-Propagation behandelt (Gruppe existiert bereits über `GetGroupBySlug`, daher kein `ErrNotFound`-Fall zu erwarten).
- `category` ist im Contract `required` (nicht nullable), weil die DB-Spalte `NOT NULL DEFAULT 'other'` ist und der Query-Pfad daher immer einen Wert liefert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bestehende Test-Fixtures an neue Pflichtfelder angepasst**
- **Found during:** Task 2 (`npm run typecheck` nach TS-Typ-Erweiterung)
- **Issue:** Zwei bereits vorhandene, nicht im Plan gelistete Test-Dateien (`pageHelpers.test.tsx`, `FansubMediaSection.test.tsx`) konstruierten `PublicFansubProfile`/`PublicFansubMediaItem`-Fixtures ohne die neu hinzugekommenen Pflichtfelder `community_links`/`category` — `tsc --noEmit` schlug fehl (TS2741/TS2322).
- **Fix:** Fixtures um `community_links: []` bzw. `category: 'other'` ergänzt, keine Verhaltensänderung der Tests.
- **Files modified:** `frontend/src/app/fansubs/__tests__/pageHelpers.test.tsx`, `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx`
- **Verification:** `npm run typecheck` grün; `npx vitest run` beider Dateien: 10/10 Tests grün
- **Committed in:** `562d20b4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking typecheck fix)
**Impact on plan:** Notwendige Folge der additiven Contract-Erweiterung; keine Scope-Erweiterung über den Plan hinaus.

## Issues Encountered
None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Contract-Ebene (Go-DTO, OpenAPI, TS) für AO5-01/AO5-02 ist vollständig und live gegen den Docker-Backend verifiziert (`/api/v1/fansub-slugs/c-subs/public-profile` liefert `community_links` + Media-Felder korrekt).
- Bereit für Plan 99-16/99-17 (Frontend-Sektionen `/fansubs/[slug]`: Reihenfolge, Story-Clamp, Community-Links-Sektion, Medien-Sektion, visuelle Politur, deutsche Enum-Labels).
- Kein Blocker bekannt.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED
