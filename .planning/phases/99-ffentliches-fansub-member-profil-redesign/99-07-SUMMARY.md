---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "07"
subsystem: api
tags: [go, gin, pgx, postgres, nextjs, typescript, openapi, release-versions]

# Dependency graph
requires:
  - phase: 99-05
    provides: Mitgliederzahl-Bugfix (countVisibleTeamMembers-Parität), unabhängig konsumiert
  - phase: 99-06
    provides: PublicGroupTheme mit start_time/end_time (AO4-04), unabhängige Datenquelle
provides:
  - "Neuer öffentlicher Endpoint GET /anime/:id/group/:groupId/releases/:releaseVersionId, aggregiert über release_versions (Kopf-Kennzahlen, Beteiligte, Bilder, Texte)"
  - "ReleaseDetailPublicRepository.GetPublicReleaseDetail als wiederverwendbare Datenquelle"
  - "getGroupReleaseDetail Frontend-Client + ReleaseDetailResponse-TS-Typen"
affects: [99-11-embedded-release-preview, 99-15-release-detail-page, AO4-11, AO4-15, AO4-16, AO4-17, AO4-18, AO4-19]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Builder-Methode (WithReleaseDetailRepo) statt Konstruktor-Parameter, um bestehende NewGroupPublicHandler-Call-Sites unverändert zu lassen"
    - "Sub-Read-Auslagerung in *_helpers.go bei 450-Zeilen-Nähe (release_detail_public_repository.go 174Z + _helpers.go 213Z)"
    - "Unabhängige COUNT-Queries statt len(loadedList) für *_count-Felder, zukunftssicher gegen später eingeführte Cursor-Pagination (AO4-03)"

key-files:
  created:
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_public_repository_test.go
    - frontend/src/types/releaseDetail.ts
  modified:
    - backend/internal/handlers/group_contributors_handler.go
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts

key-decisions:
  - "Beteiligte-Gate: ac.is_public_on_anime_page=true AND COALESCE(v.name,'public')='public', Join members m ON m.id=ac.member_id (moderner member_id-Anker aus Migration 0105), nicht der ältere hist_fansub_group_members-Join aus domain_projection/anime_contributions_public_repository (der teils null fansub_group_member_id hätte)."
  - "Texte-Gate: visibility='public' AND status='published' (Literale aus Migration 0064 chk_release_version_notes_visibility/_status)."
  - "Bilder-Gate identisch zu group_release_media_repository.go: v.name='public', rs.code='approved', ma.status='ready'."
  - "Keine author/uploader- oder avatar_url-Felder im Payload ergänzt, obwohl AO4-Kontext sie für spätere UI-Plans (AO4-17/18) erwähnt — Task-1-Acceptance-Criteria verlangen nur images_count/notes_count/contributors_count/release_date/contributors/images(category)/notes; TS-Typ in Task 3 spiegelt exakt dieses Payload, keine erfundenen Felder."

# Metrics
duration: ~20min
completed: 2026-07-08
requirements-completed: [AO4-02, AO4-05]
---

# Phase 99 Plan 07: Aggregierender öffentlicher Release-Detail-Endpunkt Summary

**Neuer GET /anime/:id/group/:groupId/releases/:releaseVersionId aggregiert Kopf-Kennzahlen, Beteiligte, Bilder (mit Typ-Kategorie) und Texte über release_versions als Datenquelle für die künftige Release-Detailseite.**

## Performance

- **Duration:** ~20min
- **Completed:** 2026-07-08
- **Tasks:** 3/3
- **Files modified:** 7 (4 created, 3 modified/documented)

## Accomplishments
- `ReleaseDetailPublicRepository.GetPublicReleaseDetail` liefert ein vollständiges, öffentlich gegatetes Aggregat für eine `release_version_id` (Ownership-Check gegen animeID+groupID, Kopf-Daten, Beteiligte, Bilder, Texte, drei unabhängige COUNT-Abfragen).
- Handler + Route sind registriert und live gegen den echten Docker-Backend-Container (`team4sv30-backend`, Port 18092) verifiziert — nicht nur code-level.
- OpenAPI dokumentiert den neuen Pfad und alle DTOs; Frontend hat einen typisierten Client-Aufruf `getGroupReleaseDetail` bereit für AO4-11/AO4-15..20.

## Task Commits

Each task was committed atomically:

1. **Task 1: Aggregierendes Public-Release-Repository** - `fd94cafa` (feat)
2. **Task 2: Handler-Methode, Route und OpenAPI** - `25eb7b06` (feat)
3. **Task 3: api.ts-Funktion und TS-Typen** - `b5cf854b` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `backend/internal/repository/release_detail_public_repository.go` - DTOs (PublicReleaseDetail, PublicReleaseContributor, PublicReleaseImage, PublicReleaseNote) + `GetPublicReleaseDetail` (Ownership-Check + Header) — 174 Zeilen
- `backend/internal/repository/release_detail_public_repository_helpers.go` - Sub-Reads: `loadContributors`/`countContributors`, `loadImages`/`countImages`, `loadNotes`/`countNotes` — 213 Zeilen
- `backend/internal/repository/release_detail_public_repository_test.go` - Source-Assertion-Tests (kein Live-DB-Test-Rig im Paket): ErrNoRows-Guard vor jedem Feldzugriff, alle drei Sichtbarkeits-Gates, DTO-Feldvollständigkeit
- `backend/internal/handlers/group_contributors_handler.go` - `WithReleaseDetailRepo`-Builder + `GetGroupReleaseDetail`-Handler (404 mit generischer deutscher Meldung bei ErrNotFound, AO4-14-Geist)
- `backend/cmd/server/main.go` - Repo-Konstruktion + Route-Registrierung `GET /anime/:id/group/:groupId/releases/:releaseVersionId` nach der bestehenden `/releases`-Route
- `shared/contracts/openapi.yaml` - Neuer Pfad + Schemas `ReleaseDetailResponse`, `PublicReleaseContributor`, `PublicReleaseImage`, `PublicReleaseNote`
- `frontend/src/types/releaseDetail.ts` - TS-Interfaces spiegeln das Backend-Payload 1:1 (snake_case), nutzt `ReleaseVersionMediaCategory` für `images[].category`
- `frontend/src/lib/api.ts` - `getGroupReleaseDetail(animeID, groupID, releaseVersionID)` nach dem `getGroupReleaseMedia`-Muster

## Decisions Made
- Beteiligte-Query joint `anime_contributions.member_id` direkt auf `members` (Migration-0105-Anker), statt des älteren `hist_fansub_group_members`-Umwegs aus `domain_projection_repository.go`/`anime_contributions_public_repository.go` — konsistenter mit dem release-version-scoped Muster aus `release_version_notes_repository.go` (`GetMemberRolesForVersion`).
- Rollen-Label für Texte kommt direkt aus `contributor_roles.label` (bereits deutsch, z. B. "Projektleitung"), nicht über `role_definitions`.
- Zähler (`images_count`/`notes_count`/`contributors_count`) sind eigenständige COUNT-Queries statt Länge der geladenen Liste — Vorgabe aus dem Plan, zukunftssicher gegen die später kommende Cursor-Pagination (AO4-03), die dieselben Listen ggf. nur teilweise lädt.
- Kein `author`/`uploader`- oder `avatar_url`-Feld im Payload ergänzt: Task-1-Acceptance-Criteria fordern es nicht, und das TS-Payload soll laut Task 3 "exakt spiegeln" — keine erfundenen Felder ohne Backend-Gegenstück.

## Deviations from Plan

None - plan executed exactly as written. Die in der Plan-Beschreibung selbst vorgesehene Datei-Aufteilung (`release_detail_public_repository_helpers.go` bei Bedarf) wurde genutzt, ist aber ausdrücklich im Task-1-Text vorgesehen, keine Abweichung.

## Issues Encountered

None. Live-Verifikation gegen den Docker-Backend-Container war in dieser Session (anders als in den kritischen Hinweisen befürchtet) möglich — `docker ps`/`docker compose up -d --build`/`curl` gegen Port 18092 funktionierten direkt aus der Sandbox.

## Live Verification (statt nur Code-Level)

Backend wurde neu gebaut (`docker compose up -d --build team4sv30-backend`) und live getestet:

- `GET /api/v1/anime/1/group/1/releases/2` → `200`, echte Kopf-Daten (`title: "Vipers Creed. S01E02-CSubs.mkv"`), 1 öffentlicher Text ("Projektleitung"-Rolle, echter TipTap-HTML-Body).
- `GET /api/v1/anime/1/group/1/releases/1` → `200`, 1 öffentliches Bild mit `category: "fun_outtake"`, `thumbnail_url`/`original_url` aufgelöst, `images_count: 1`.
- `GET /api/v1/anime/1/group/1/releases/999999` → `404 {"error":{"message":"release nicht gefunden"}}` (nicht existierende Version).
- `GET /api/v1/anime/1/group/99/releases/2` → `404` (Cross-Group-Ownership korrekt verweigert — Release 2 gehört zu Gruppe 1/2, nicht 99).

Alle vier Fälle bestätigen: Ownership-Scope, Sichtbarkeits-Gates und der generische 404-Text (kein technischer Leak, AO4-14) funktionieren wie spezifiziert.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Datenquelle für AO4-11 (eingebettete Release-Vorschau auf der Projektseite) und die neue Release-Detailseite (AO4-15..20) ist vollständig verfügbar und live verifiziert.
- Frontend-Seite selbst (Route `releases/[releaseVersionId]/page.tsx`) ist noch nicht gebaut — das ist explizit Scope der Folgepläne (AO4-15..20), nicht dieses Plans.
- Cursor-Pagination (AO4-03) für Bilder/Texte auf der künftigen Detailseite ist noch offen; die aktuellen `*_count`-Felder sind bereits zukunftssicher entkoppelt von den (aktuell vollständig geladenen) Listen.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`fd94cafa`, `25eb7b06`, `b5cf854b`) verified present in git log.
