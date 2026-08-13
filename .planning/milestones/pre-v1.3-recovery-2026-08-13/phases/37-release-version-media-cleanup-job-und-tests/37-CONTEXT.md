# Phase 37: Release-Version Media — Cleanup Job und Tests — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Drei Deliverables:
1. **Cleanup-Job** — Periodischer Go-Service der stale-processing-Assets, orphaned Dateien und soft-delete-physische-Dateien bereinigt. Neuer Service + time.Ticker-Goroutine in main.go.
2. **Backend-Regression-Tests** — Runtime-Verhaltenstests für den Upload-Handler und Repository (baut auf strukturellen Test-Skeletons aus Phase 35 auf).
3. **Frontend-Regression-Tests** — Upload-Flow, per-file-Retry, Preview-Sichtbarkeit, Galerie-Refresh (baut auf Phase-36-Komponenten auf; Plan muss die Abhängigkeit zu Phase 36 explizit modellieren).

Kein neues UI, keine neuen API-Endpunkte, kein Schema-Change.

</domain>

<decisions>
## Implementation Decisions

### Architektur: Kein Release-Version-Media-Upload-Service
- **D-01:** Es gibt KEINEN `backend/internal/services/release_version_media_upload.go`. Phase 35 hat die Upload-Logik ausschließlich in Handler + Repository implementiert:
  - Handler: `backend/internal/handlers/admin_content_release_version_media.go` (701 Zeilen)
  - Repository: `backend/internal/repository/release_version_media_repository.go` (470 Zeilen)
  - Kein Service-Layer für Release-Version-Media. Pläne dürfen NICHT auf den Phantom-Pfad `backend/internal/services/release_version_media_upload.go` verweisen.

### Cleanup-Job-Architektur
- **D-02:** Cleanup-Service als eigene Datei: `backend/internal/services/release_version_media_cleanup.go`
- **D-03:** Trigger: `time.Ticker`-Goroutine in `main.go` — analog zur HTTP-Server-Goroutine. Kein neuer Abstraktionstyp, kein externes Cron-System.
- **D-04:** Cleanup-Intervall: 10 Minuten (hardcoded, keine Env-Variable nötig für V1).
- **D-05:** Stale-Processing-Schwellenwert: 30 Minuten — Assets mit `status='processing'` älter als 30 Minuten werden auf `status='failed'` gesetzt.
- **D-06:** Cleanup-Umfang (3 Stufen):
  1. Stale-processing: DB-Rows mit `status='processing'` älter als 30 Min → `status='failed'` setzen
  2. Orphaned-Dateien: Dateien auf Disk ohne passende DB-Row (UUID-Verzeichnisse ohne Media-Asset-Eintrag) → physisch löschen
  3. Soft-Delete-Cleanup: DB-Rows mit gesetztem `deleted_at` → zugehörige Original- und Thumb-Dateien physisch löschen, dann Row ggf. hard-deleten oder Dateipfade nullen
- **D-07:** Cleanup-Fehler werden per `log.Printf` protokolliert und schlagen den Server NICHT ab — Cleanup ist best-effort.

### Backend-Test-Tiefe
- **D-08:** Test-Pattern: Mock-Repository-Interface (wie `media_upload_test.go` in `backend/internal/handlers/`). Kein echter DB-Zugriff in Phase-37-Tests.
- **D-09:** Bestehende Test-Skelette (Phase 35) sind reine Compile-Zeit-Checks. Phase 37 ERWEITERT diese Dateien um Runtime-Verhaltenstests:
  - `backend/internal/handlers/admin_content_release_version_media_test.go` (aktuell 80 Zeilen) — ergänzen
  - `backend/internal/repository/release_version_media_repository_test.go` (aktuell 92 Zeilen) — ergänzen
  - Neue Datei: `backend/internal/services/release_version_media_cleanup_test.go` — neu anlegen
- **D-10:** Test-Prioritäten für Handler: GIF-Original-bleibt-animiert, JPEG/PNG/WebP-Thumbnail, partial-failure-Isolation, Preview-Regel (D-15/D-16 aus Phase 35), CATEGORY_CHANGE_NOT_ALLOWED (D-14)

### Frontend-Tests
- **D-11:** Frontend-Test-Runner: `npx vitest run` — NICHT `npm test -- --runInBand` (das ist Jest-Syntax).
- **D-12:** Phase-36-Komponenten existieren noch nicht (Phase 36 noch unausgeführt). Phase-37-Frontend-Pläne müssen auf `@.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-CONTEXT.md` verweisen und die Phase-36-Komponenten als vorausgesetzte Dependency deklarieren.
- **D-13:** Klare Abgrenzung Phase 36 vs. Phase 37 Frontend-Tests:
  - Phase 36 (Plan 04): Navigationsmodell — drawer CTA vorhanden, kein Upload-Control im Drawer, Editor-Tab erreichbar, Context-Card, Error-Isolation
  - Phase 37 (Plans 03/04): Upload-Verhalten — Kategorie-Gate, per-file-Status/Retry, Preview-Toggle-Sichtbarkeit, Galerie-Refresh nach Upload, Galerie-Refresh nach Delete

### Modularity-Warnung (Vorhandene Schulden)
- **D-14:** Handler-Datei (701 Zeilen) und Repository (470 Zeilen) überschreiten das 450-Zeilen-CLAUDE.md-Limit. Phase 37 verschlechtert das NICHT (es werden nur Test-Dateien ergänzt). Die Aufteilung der Handler-Datei ist als Gap-Closure-Aufgabe nach Phase 37 zu vermerken.

### Claude's Discretion
- Konkrete Test-Dateinamen für Cleanup-Tests
- Ob Repository-Methoden für Cleanup separat in einem Interface definiert werden oder direkt auf `*MediaRepository` aufgerufen werden
- Genaue Goroutine-Shutdown-Semantik (graceful via Context oder fire-and-forget beim Server-Shutdown)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-35-Outputs (Cleanup und Tests bauen hierauf auf)
- `backend/internal/handlers/admin_content_release_version_media.go` — Upload-Handler mit govips-Thumbnail-Logik, 701 Zeilen
- `backend/internal/repository/release_version_media_repository.go` — 17 Repository-Methoden, 470 Zeilen
- `backend/internal/handlers/admin_content_release_version_media_test.go` — 80 Zeilen, strukturelle Tests (Phase 37 erweitert diese Datei)
- `backend/internal/repository/release_version_media_repository_test.go` — 92 Zeilen, strukturelle Tests (Phase 37 erweitert diese Datei)
- `.planning/phases/35-release-version-media-backend-upload-service-and-api/35-CONTEXT.md` — Entscheidungen D-01 bis D-18 (Preview-Regeln, Kategorie-Änderungsverbot, Multi-File-Response-Format)

### Phase-36-Kontext (Frontend-Tests hängen davon ab)
- `.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-CONTEXT.md` — D-01 bis D-11 (Drawer-Boundary, Upload-Card, Galerie-Struktur, kein optimistisches Insert)

### Test-Pattern-Referenz (Mock-Repository)
- `backend/internal/handlers/media_upload_test.go` — MockMediaUploadRepository-Pattern, Multipart-Test-Router-Setup; Phase-37-Backend-Tests verwenden dasselbe Muster
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` — Vitest+RTL-Test-Style-Referenz für Frontend-Tests

### Roadmap und Anforderungen
- `.planning/ROADMAP.md` — Phase-37-Goal: RVM-CLEANUP-01
- `.planning/REQUIREMENTS.md` — UPLD-01 bis UPLD-03, LIFE-01 bis LIFE-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/services/asset_lifecycle_service.go` — bestehender Lifecycle-Service als Referenz für Service-Struktur und Fehlerbehandlung
- `backend/internal/handlers/media_upload_test.go` — MockMediaUploadRepository zeigt Interface-Mock-Muster für Handler-Tests
- `backend/cmd/server/main.go` — Server-Goroutine-Pattern; Cleanup-Goroutine analog einbinden

### Established Patterns
- Go-Backend: Interface-Mocks für Handler-Tests (kein DB-Zugriff in Unit-Tests)
- Frontend: Vitest + React Testing Library (`npx vitest run <filter>`)
- Kein periodischer Runner in main.go vorhanden — Phase 37 fügt das erste `time.Ticker`-Pattern ein

### Integration Points
- Cleanup-Service: `backend/cmd/server/main.go` → neuer Goroutine-Block nach Server-Start
- Backend-Tests: ergänzen bestehende Test-Dateien aus Phase 35
- Frontend-Tests: neue Test-Dateien in `frontend/src/app/admin/episode-versions/[versionId]/edit/`

</code_context>

<specifics>
## Specific Ideas

- Cleanup-Job soll best-effort sein — keine Panics, keine Server-Abschaltungen bei Cleanup-Fehlern
- Mock-basierte Tests bevorzugt (konsistent mit bestehendem `media_upload_test.go`)
- Phase-37-Frontend-Pläne sollen EXPLIZIT auf Phase-36-Completion als Vorbedingung verweisen, damit klar ist, dass diese Tests auf bereits implementierten Komponenten aufbauen

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Fix logo upload PNG to JPG conversion preserve transparency** — betrifft `media_service.go` für allgemeinen Logo-Upload und Crawler, nicht Release-Version-Media. Gehört in eine separate Bugfix-Phase/Quick-Task, nicht in Phase 37.

### Handler-Datei-Split (450-Zeilen-Grenze)
- `admin_content_release_version_media.go` (701 Zeilen) überschreitet CLAUDE.md-Limit — Aufspaltung in Handler + Helper als Gap-Closure nach Phase 37.

</deferred>

---

*Phase: 37-release-version-media-cleanup-job-und-tests*
*Context gathered: 2026-05-08*
