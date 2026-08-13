---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "08"
subsystem: api
tags: [go, gin, pgx, postgres, nextjs, typescript, openapi, cursor-pagination]

# Dependency graph
requires:
  - phase: 99-05
    provides: Mitgliederzahl-Bugfix, unabhängig konsumiert
  - phase: 99-07
    provides: Aggregierender Public-Release-Detail-Endpoint (ReleaseDetailPublicRepository), Basis für die Bild-/Text-Cursor-Methoden
provides:
  - "GetGroupReleasesCursor (GroupRepository) — additive Seek-Cursor-Pagination der vollständigen Release-Liste, Sortierschlüssel identisch zur Offset-Variante (episode_number, rev.id)"
  - "ListReleaseVersionImagesCursor/ListReleaseVersionNotesCursor (ReleaseDetailPublicRepository) — additive Seek-Cursor-Pagination für Bildergalerie/Textliste"
  - "Drei neue öffentliche Routen: GET .../release-list, GET .../releases/:id/images, GET .../releases/:id/notes"
  - "getGroupReleaseListCursor/getGroupReleaseImages/getGroupReleaseNotes Frontend-Client + CursorPage<T>-TS-Typ"
affects: [99-11-embedded-release-preview, 99-12-releases-list-infinite-scroll, 99-15-release-detail-page, 99-18-image-gallery-infinite-scroll, 99-19-notes-infinite-scroll, AO4-03, AO4-11, AO4-12, AO4-18, AO4-19, AO4-21, AO4-24, AO4-25]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Base64(part1|part2)-Cursor-Kodierung, getrennte Encode/Decode-Paare pro Schlüsseltyp (int32/int64 für episode_number/sort_order, time.Time/int64 für created_at) in release_cursor_pagination.go"
    - "trimCursorPage[T] als generische, DB-unabhängige Funktion für die limit+1-Overfetch-Regel (has_more/next_cursor) — von allen drei Cursor-Repo-Methoden geteilt und ohne Live-DB testbar"
    - "Additive Result-Structs (GroupReleasesCursorPage, ReleaseImagesCursorPage, ReleaseNotesCursorPage) mit einheitlichem JSON-Contract items/next_cursor/has_more, gespiegelt im generischen Frontend-Typ CursorPage<T>"
    - "Cursor-Endpunkte für Bilder/Texte nehmen bewusst keinen animeID/groupID-Ownership-Check vor — die initiale volle Detailseite (99-07) validiert das bereits vor dem ersten Nachladen"
    - "GetGroupReleasesCursor in eigene Datei group_repository_cursor.go ausgelagert, um group_repository.go unter dem 450-Zeilen-Limit zu halten (Netto-Diff auf group_repository.go: 0)"

key-files:
  created:
    - backend/internal/repository/release_cursor_pagination.go
    - backend/internal/repository/group_repository_cursor.go
    - backend/internal/repository/release_detail_cursor_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/handlers/group_contributors_handler.go
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts
    - frontend/src/types/releaseDetail.ts

key-decisions:
  - "Backend-JSON-Feldname für alle drei Cursor-DTOs vereinheitlicht auf `items` (statt `episodes`/`images`/`notes`), damit der generische Frontend-Typ CursorPage<T> (laut Task-2-Vorgabe mit `items`-Feld) ohne Pro-Endpoint-Remapping funktioniert. Go-Feldnamen bleiben deskriptiv (Items, aber Struct-Name z.B. GroupReleasesCursorPage.Items)."
  - "Textliste (ListReleaseVersionNotesCursor) nutzt Seek-Schlüssel (created_at, id) statt (sort_order, id) — sort_order ist für Texte nicht zuverlässig gepflegt; AO4-Kontext erlaubt explizit beide Paare (Claude's Discretion)."
  - "Bild-/Text-Cursor-Endpunkte (ListReleaseVersionImagesCursor/ListReleaseVersionNotesCursor) prüfen KEINE animeID/groupID-Ownership — Signatur exakt wie im Plan vorgegeben (ctx, releaseVersionID, cursor, limit). Die Route bleibt trotzdem unter /anime/:id/group/:groupId/... genestet (URL-Konsistenz), Handler validiert die IDs nur auf Format, nicht auf Zugehörigkeit. Die initiale volle Detailseite (99-07, GetGroupReleaseDetail) validiert Ownership bereits vor dem ersten Nachladen."
  - "Ungültiger oder leerer Cursor führt zu stillem Neustart bei Seite 1 (kein 400) — decodeCursorPair/decodeInt32Int64Cursor/decodeTimeInt64Cursor liefern ok=false statt Fehler."
  - "GetGroupReleasesCursor nach group_repository_cursor.go ausgelagert: die ursprünglich in group_repository.go eingefügte Methode hätte die Datei auf 453 Zeilen gebracht (>450-Limit); nach Auslagerung ist group_repository.go unverändert bei 353 Zeilen."

# Metrics
duration: ~40min
completed: 2026-07-08
requirements-completed: [AO4-03, AO4-24]
---

# Phase 99 Plan 08: Cursor-Pagination für Release-Liste, Bildergalerie und Textliste Summary

**Additive Seek-Cursor-Pagination (Base64-kodierte Schlüssel, next_cursor/has_more) für genau die drei nachladenden Listen aus AO4-03/AO4-24 — bestehende Offset-Endpunkte (GetGroupReleases, GetPublicReleaseDetail) bleiben unverändert und live weiterhin funktionsfähig.**

## Performance

- **Duration:** ~40min
- **Completed:** 2026-07-08
- **Tasks:** 3/3
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments
- `GetGroupReleasesCursor` liefert eine Seek-paginierte Seite der vollständigen Release-Liste mit exakt dem gleichen Sortierschlüssel `(episode_number, rev.id)` wie die Offset-Variante — beide Modi bleiben konsistent sortiert und koexistieren konfliktfrei.
- `ListReleaseVersionImagesCursor`/`ListReleaseVersionNotesCursor` liefern Seek-paginierte Seiten der Bildergalerie/Textliste einer Release-Version mit identischen Sichtbarkeits-Gates wie die bestehenden vollständig ladenden Reads.
- Drei neue Routen sind registriert und live gegen den echten Docker-Backend-Container (Port 18092) verifiziert — inklusive tatsächlicher Cursor-Fortschreitung (Episode 1 → Episode 2) und Bestätigung, dass die alte Offset-Route unverändert weiterläuft.
- OpenAPI dokumentiert alle drei neuen Pfade + Response-Schemas; Frontend hat einen generischen `CursorPage<T>`-Typ und drei typisierte Client-Funktionen bereit für die künftigen Infinite-Scroll-UIs (AO4-11/12/18/19/21/25).
- Die has_more/next_cursor-Semantik (`limit+1`-Overfetch) ist als reine, DB-unabhängige Funktion (`trimCursorPage`) extrahiert und ohne Live-DB-Rig unit-getestet — inklusive Round-Trip von Encode/Decode und Leerlisten-Fall.

## Task Commits

Each task was committed atomically:

1. **Task 1a: Cursor-Repository-Methoden + Test** - `e8b5f38a` (feat)
2. **Task 1b: Cursor-Handler, Routen und OpenAPI-Contract** - `5b570ada` (feat)
3. **Task 2: api.ts-Cursor-Funktionen und Meta-Typen** - `d0c1ff8e` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `backend/internal/repository/release_cursor_pagination.go` (neu, 126 Zeilen) — Base64-Encode/Decode-Helfer je Schlüsseltyp (int32/int64, time.Time/int64), `trimCursorPage[T]` (generische limit+1-Overfetch-Regel), `clampCursorLimit`/`DefaultCursorPageLimit`/`MaxCursorPageLimit`
- `backend/internal/repository/group_repository_cursor.go` (neu, 115 Zeilen) — `GroupReleasesCursorPage` + `GetGroupReleasesCursor`, ausgelagert aus group_repository.go wegen des 450-Zeilen-Limits (siehe Deviations)
- `backend/internal/repository/release_detail_cursor_test.go` (neu, 132 Zeilen) — Tests für trimCursorPage (overfetch/exact-limit/empty), Encode/Decode-Round-Trips (int32/int64, time/int64), ungültiger/leerer Cursor → ok=false
- `backend/internal/repository/release_detail_public_repository.go` — `ReleaseImagesCursorPage`/`ReleaseNotesCursorPage` + `ListReleaseVersionImagesCursor`/`ListReleaseVersionNotesCursor` ergänzt (174→360 Zeilen)
- `backend/internal/handlers/group_contributors_handler.go` — `groupReleasesRepo`-Feld + `WithGroupReleasesRepo`-Builder, `parseCursorLimitQuery`-Helfer, drei neue Handler `GetGroupReleaseListCursor`/`GetGroupReleaseImages`/`GetGroupReleaseNotes` (178→318 Zeilen)
- `backend/cmd/server/main.go` — `WithGroupReleasesRepo(groupRepo)` an groupPublicHandler angehängt; drei neue Routen registriert (release-list vor releases/:id, images/notes als Kinder von releases/:releaseVersionId)
- `shared/contracts/openapi.yaml` — drei neue Pfade (`/release-list`, `/releases/{releaseVersionId}/images`, `/releases/{releaseVersionId}/notes`) mit `cursor`/`limit`-Query-Parametern + drei neue Response-Schemas (`GroupReleaseListCursorResponse`, `ReleaseImagesCursorResponse`, `ReleaseNotesCursorResponse`)
- `frontend/src/types/releaseDetail.ts` — generischer `CursorPage<T>`-Typ (`items`/`next_cursor`/`has_more`) ergänzt
- `frontend/src/lib/api.ts` — `getGroupReleaseListCursor` (plain fetch, wie das Offset-Pendant `getGroupReleases`), `getGroupReleaseImages`/`getGroupReleaseNotes` (authorizedFetch, wie `getGroupReleaseDetail`)

## Decisions Made
- Backend-JSON-Feld für alle drei Cursor-DTOs vereinheitlicht auf `items` statt divergierender Namen (episodes/images/notes) — direkte Kompatibilität mit dem generischen Frontend-Typ `CursorPage<T>` ohne Pro-Endpoint-Mapping-Code.
- Notizen-Cursor nutzt `(created_at, id)` statt `(sort_order, id)` als Seek-Schlüssel (sort_order für Texte nicht zuverlässig gepflegt) — vom AO4-Kontext explizit als Alternative erlaubt.
- Bild-/Text-Cursor-Methoden nehmen keinen animeID/groupID-Ownership-Check vor (Signatur exakt wie im Plan spezifiziert: nur releaseVersionID); die Route bleibt trotzdem unter `/anime/:id/group/:groupId/...` genestet, Handler validiert die Pfad-IDs nur formal. Ownership wird bereits von der initialen vollen Detailseite (99-07) durchgesetzt, bevor ein Client überhaupt nachlädt.
- Ungültiger/leerer Cursor → stiller Neustart bei Seite 1 (kein HTTP 400), da alle Decode-Funktionen defensiv `ok=false` statt eines Fehlers zurückgeben.

## Deviations from Plan

**1. [Rule 2 / 450-Zeilen-Limit] GetGroupReleasesCursor in eigene Datei ausgelagert statt in group_repository.go**
- **Found during:** Task 1a, nach dem ersten `go build`
- **Issue:** Die geplante Methode direkt in `group_repository.go` eingefügt hätte die Datei auf 453 Zeilen gebracht — über dem CLAUDE.md-450-Zeilen-Limit.
- **Fix:** `GroupReleasesCursorPage` + `GetGroupReleasesCursor` in eine neue Datei `backend/internal/repository/group_repository_cursor.go` verschoben. `group_repository.go` selbst ist dadurch am Ende dieses Plans unverändert (Netto-Diff: 0 Zeilen, weiterhin 353 Zeilen) — die im Plan-Frontmatter gelistete Datei `group_repository.go` wurde also letztlich nicht direkt modifiziert, ist aber weiterhin die Basis (`buildReleasesWhere`), von der die neue Cursor-Datei liest.
- **Files modified:** `backend/internal/repository/group_repository_cursor.go` (neu)
- **Commit:** `e8b5f38a`

Ansonsten wurde der Plan wie geschrieben umgesetzt; die im Plantext ausdrücklich erlaubte Auslagerung "Cursor-Helfer ggf. in eigene Datei" wurde zusätzlich für `release_cursor_pagination.go` genutzt (kein Zeilenlimit-Zwang dort, aber sinnvolle Trennung geteilter Helfer von den drei domänenspezifischen Repositories).

## Issues Encountered

None. Live-Verifikation gegen den Docker-Backend-Container war wie in 99-07 direkt aus der Sandbox möglich.

## Live Verification (statt nur Code-Level)

Backend wurde neu gebaut (`docker compose up -d --build team4sv30-backend`) und live getestet:

- `GET /api/v1/anime/1/group/1/release-list?limit=1` → `200`, `items: [Episode 1]`, `next_cursor: "MXwx"` (Base64 von `1|1`), `has_more: true`.
- `GET /api/v1/anime/1/group/1/release-list?limit=1&cursor=MXwx` → `200`, `items: [Episode 2]`, `next_cursor: "Mnwy"`, `has_more: true` — bestätigt echte Seek-Fortschreitung (nicht nur Wiederholung derselben Seite).
- `GET /api/v1/anime/1/group/1/releases/1/images?limit=1` → `200`, `items: [1 Bild, category: fun_outtake]`, `next_cursor: null`, `has_more: false`.
- `GET /api/v1/anime/1/group/1/releases/2/notes?limit=1` → `200`, `items: [1 Text, Rolle "Projektleitung"]`, `next_cursor: null`, `has_more: false`.
- `GET /api/v1/anime/1/group/1/releases?page=1&per_page=5` (bestehende Offset-Route) → weiterhin `200` mit 5 Episoden — Regression bestätigt: additiv, nicht brechend.

Alle Fälle bestätigen: Seek-Pagination funktioniert inklusive echter Cursor-Fortschreitung, has_more/next_cursor-Semantik ist korrekt, und die bestehende Offset-Route ist unangetastet.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend-Datenquelle und Frontend-Client für alle drei Nachlade-Listen (Release-Liste, Bildergalerie, Textliste) sind vollständig verfügbar und live verifiziert.
- Die eigentlichen Infinite-Scroll/"Mehr laden"-UI-Komponenten (IntersectionObserver, Skeleton, Button-Fallback) sind noch nicht gebaut — das ist Scope der Folgepläne (AO4-11/12/18/19/21/25), nicht dieses Plans.
- `CursorPage<T>` ist bewusst generisch gehalten, sodass künftige UI-Hooks (z. B. ein gemeinsamer `useCursorPagination`-Hook) alle drei Listen mit derselben Client-Logik bedienen können.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`e8b5f38a`, `5b570ada`, `d0c1ff8e`) verified present in git log.
