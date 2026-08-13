# Phase 98 Nachtest: Zeitkorrektur invalidiert alten Encode

Datum: 2026-07-06

Scope: Wenn ein vorbereitetes Segment im Bearbeiten-Drawer eine neue Zeit bekommt und gespeichert wird, darf der alte vorbereitete Segmentstream nicht weiterverwendet werden. Der alte Render muss physisch und in der DB geloescht werden, danach muss ein neuer Encode fuer die neue Zeit vorbereitet werden.

## Implementierter Fix

- `PATCH /api/v1/admin/anime/:id/segments/:segmentId` erkennt Aenderungen an renderrelevanten Inputs: Startzeit, Endzeit, effektive Playback-Quelle, Release-Variant, Jellyfin-/Media-Asset-Bezug und Playback-Offsets.
- Bei einer solchen Aenderung werden alle bestehenden `theme_segment_render_cache`-Zeilen fuer das Segment geladen.
- Vor dem DB-Loeschen werden vorhandene `output_path`-Dateien ueber den kontrollierten `SEGMENT_RENDER_DIR` aufgeloest und physisch geloescht.
- Danach werden die DB-Cache-Zeilen fuer das Segment geloescht.
- Wenn der Segmentstream weiterhin serverseitig renderbar ist, wird direkt ein neuer `queued`-Cache fuer das neue Zeitfenster angelegt und der Worker geweckt.
- Wenn ein alter Worker parallel noch fertig wird, entfernt er seine frisch geschriebene Datei wieder, falls `MarkThemeSegmentRenderCacheReady` wegen der geloeschten Cache-Zeile scheitert.
- Das Frontend startet nach einem Update automatisch das bestehende Render-Status-Polling, wenn die Update-Response `queued` oder `rendering` liefert.

## Live-UAT

Runtime:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:18092`
- Keycloak: `http://127.0.0.1:18081`
- Route: `http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=segmente`
- Browser-Login war aktiv als `Platform Admin / platform-admin@team4s.local`.
- Token-Smoke fuer Rueckstellung: `platform-admin` / `123`.

Backend wurde nach dem Fix neu gebaut und gestartet:

- `docker compose -f docker-compose.yml -f docker-compose.override.yml -f tmp/phase98-compose-ports.yml build team4sv30-backend`
- `docker compose -f docker-compose.yml -f docker-compose.override.yml -f tmp/phase98-compose-ports.yml up -d --no-deps team4sv30-backend`

Durchgefuehrter Test:

1. Segment `test` in Episode 1 war vorbereitet:
   - Zeit: `00:23:00 - 00:23:45`
   - DB-Cache-Key: `theme-segment-f425d9f1e06775c719f7f26c2b47a46adca85255f03e667d468213d1a53b651f`
   - Datei: `theme-segment-f425d9f1e06775c719f7f26c2b47a46adca85255f03e667d468213d1a53b651f.mp4`
2. Im eingeloggten Admin-UI wurde der Drawer fuer `ED / test` geoeffnet.
3. Endzeit wurde von `00:23:45` auf `00:23:44` geaendert und gespeichert.
4. UI zeigte danach fuer die Zeile:
   - `00:23:00 - 00:23:44`
   - `Wird vorbereitet`
5. DB nach Save:
   - alte Cache-Zeile `f425...651f` war weg
   - neue Cache-Zeile `c130...e90f` war vorhanden
   - `end_time = 00:23:44`
   - `end_offset_seconds = 1424`
   - Status wechselte von `rendering` auf `ready`
6. Datei nach Save:
   - alte Datei `f425...651f.mp4`: `False` bei `Test-Path`
   - neue Datei `c130...e90f.mp4`: vorhanden
7. Der Datensatz wurde danach wieder auf `00:23:45` zurueckgestellt.
8. Rueckstellung verifizierte denselben Pfad erneut:
   - Zwischen-Testdatei `c130...e90f.mp4`: `False`
   - finaler Cache-Key `f425...651f`
   - finaler Status `ready`
   - finale Datei `f425...651f.mp4`: vorhanden

Backend-Log-Belege:

- `segment render refresh: alter cache geloescht, neuer render eingereiht (segment_id=2, cache_key=theme-segment-c130f493f7f774344cb4f61c5e9d37ffc9580524285237942c06d7370124e90f)`
- `segment render worker: render abgeschlossen (segment_id=2, cache_key=theme-segment-c130f493f7f774344cb4f61c5e9d37ffc9580524285237942c06d7370124e90f)`
- `segment render refresh: alter cache geloescht, neuer render eingereiht (segment_id=2, cache_key=theme-segment-f425d9f1e06775c719f7f26c2b47a46adca85255f03e667d468213d1a53b651f)`
- `segment render worker: render abgeschlossen (segment_id=2, cache_key=theme-segment-f425d9f1e06775c719f7f26c2b47a46adca85255f03e667d468213d1a53b651f)`

## Checks

- `go test ./internal/handlers ./internal/repository ./internal/services` - passed
- `npm run typecheck` - passed
- `npm run test -- SegmenteTab.test.tsx streamRelayAuth.test.ts` - passed, 56 tests
- `npm run lint` - passed with existing warnings, 0 errors / 323 warnings
- `git diff --check` - passed, only CRLF warnings
- Docker backend build/restart - passed
- Live Browser UAT with logged-in Platform Admin - passed for save/invalidation flow
- DB/file-system verification - passed

## Gaps / Folgearbeiten

- Der Render-Vorbereitungsblock ist jetzt zwischen `RenderSegment` und dem neuen Refresh-Helper teilweise doppelt abgebildet. Funktional ist das getestet, aber als Cleanup sollte die Queue-Vorbereitung in eine gemeinsame Helper-Funktion zusammengezogen werden.
- Wenn das Segment-Update selbst in der DB bereits committed ist und danach das physische Loeschen der alten Datei fehlschlaegt, antwortet die API mit `500`, aber die Zeitkorrektur ist bereits persistiert. Das ist absichtlich konservativ, sollte aber als Produktentscheidung dokumentiert werden: entweder kompensierender Retry/Repair-Job oder transaktionalere Reihenfolge mit klarer Admin-Meldung.
- Die reine Browser-Textabfrage fuer den finalen UI-Ready-Zustand lief im Browser-Adapter zweimal in einen Timeout. Der eigentliche UI-Save wurde live im eingeloggten Browser ausgefuehrt; finaler `ready`-Status wurde ueber DB, Worker-Log und Datei geprueft.
- `npm run lint` hat weiterhin viele bestehende Projektwarnungen, vor allem native Form Controls gegen das lokale UI-System und einzelne unused/img-Warnungen. Keine neuen Lint-Errors aus diesem Fix.
