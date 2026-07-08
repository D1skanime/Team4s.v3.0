# Phase 98 UAT-Abschlussbericht

Datum: 2026-07-05
Scope: Serverseitig vorbereiteter Segmentstream für Release-/Jellyfin-basierte Theme-Segmente, getestet in echter Docker-Runtime mit eingeloggtem `platform-admin`.

## Runtime

- Docker-Stack lief lokal mit Port-Override:
  - Frontend: `http://127.0.0.1:3000`
  - Backend: `http://127.0.0.1:18092`
  - Keycloak: `http://127.0.0.1:18081`
- Login im in-app Browser: `platform-admin`, sichtbar als `Platform Admin / platform-admin@team4s.local`.
- Getestete Route: `http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=segmente`.

## Live-UAT Ergebnis

Bestanden.

Durchgeführter Browser-Flow:

1. Segment-Tab der Episode-Version geöffnet.
2. Segment `Viper's Creed OP` war nach Cache-Reset sichtbar als `Nicht vorbereitet`.
3. Button `Segment vorbereiten` im UI geklickt.
4. UI wechselte auf `Wird vorbereitet`, Button wurde disabled.
5. Backend-Worker renderte den Clip fertig.
6. Nach Reload zeigte die Liste `Bereit`.
7. Im Bearbeiten-Drawer erschien ein `<video controls>` mit `src=http://127.0.0.1:3000/api/segments/1/stream`.
8. Video lud erfolgreich mit `readyState=4`, `duration=80.038372`, ohne Media-Fehler.

DB-Verifikation nach Browser-Klick:

- `theme_segment_render_cache.status = ready`
- `duration_seconds = 80`
- `attempts = 1`
- `output_path = theme-segment-2ea50aac9bcdc79487276d83fde0fb769088c10bb60e2e0afff7a09286491207.mp4`

## Gefixte Gaps während UAT

- Der Render-POST lieferte in der echten Runtime zunächst `500` mit leerem Body.
- Ursache: `GetThemeSegmentRenderSource` referenzierte `theme_segment_playback_sources.source_ref`, diese Spalte existiert in der echten Migration/DB nicht.
- Fix: Render-Source-Query nutzt jetzt die reale Playback-Source-Struktur: `media_assets.file_path` plus Legacy-Fallback `theme_segments.source_ref`.
- Zusätzlich bestätigt: der Segment-Render-Worker läuft dauerhaft und verarbeitet Queue-Jobs bis `ready`.

## Verbleibende Gaps / Folgearbeiten

- Die Listenansicht zeigt keinen Inline-Player; die Preview sitzt im Bearbeiten-Drawer. Das ist funktional korrekt, aber UX-seitig sollte entschieden werden, ob `Bereit` in der Liste direkt eine Vorschau-Aktion anbieten soll.
- Render-Dauer im Live-Test lag bei ca. 40 Sekunden für 80 Sekunden Clip. Für längere Segmente sollte die UI weiterhin robust pollen und einen klaren Fehler anzeigen, falls der Worker `failed` setzt.
- Der lokale Dev-Stack nutzt `npm run dev` mit persistentem `.next`-Volume. Stale Dev-Cache hatte vorher UI-Änderungen maskiert; für UAT sollte das Reset-Verfahren dokumentiert bleiben.
- Die Browser-Preview konnte wegen Browser-Adapter-Einschränkungen nicht per `fetch` geprüft werden; sie wurde über das tatsächliche `<video>`-Element verifiziert.

## Ausgeführte Checks

- `go test ./internal/handlers ./internal/repository ./internal/services`
- Docker Backend-Build: `docker compose ... build team4sv30-backend`
- Docker Backend-Restart: `docker compose ... up -d --no-deps team4sv30-backend`
- Authentifizierter Backend-Smoke vor Browser-UAT: `POST /api/v1/segments/1/render` -> `202`
- Live Browser UAT mit eingeloggtem `platform-admin`
- DB-Statusprüfung in `theme_segment_render_cache`

## Verdict

Phase 98 ist für den getesteten Release-/Jellyfin-Segmentpfad live nutzbar: UI-Button queued den Render, Worker erzeugt den serverseitigen Clip, Status wird `Bereit`, und die Drawer-Preview streamt über den neuen Segmentstream ohne alte freie Start-/End-Queryparameter.
