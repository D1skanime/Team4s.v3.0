---
phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback
plan: 03
subsystem: api
tags: [go, gin, next-relay, grant, hmac, stream, capability, openapi]

requires:
  - phase: 98-01
    provides: Render-Cache-Schema und Config
  - phase: 98-02
    provides: Render-Service-Helfer (Cache-Key, ffmpeg-Args, Log-Sanitizer)
provides:
  - Segment-Grant/Render/Stream-Backend-Endpunkte (/api/v1/segments/:id/grant|render|stream)
  - Capability-basierte Autorisierung (release_version.segments.manage), kein Rollen-Hardcode
  - Next-Relay /api/segments/:id/stream mit streamRelayAuth (Refresh, Range, Cookie-Update)
  - Aktualisierte OpenAPI/episode-versions-Contracts und api.ts-Client
affects: [98-04, 98-05]

tech-stack:
  added: []
  patterns:
    - "Signierter, segmentgebundener Kurzzeit-Grant (auth/signed_grant.go) analog zu Release-/Asset-Grants"
    - "Query-Tampering-Rejection und path-traversal-guarded File-Serving"

key-files:
  created:
    - backend/internal/handlers/segment_stream.go
    - backend/internal/auth/segment_grant.go
    - backend/internal/auth/signed_grant.go
    - frontend/src/app/api/segments/[id]/stream/route.ts
  modified:
    - backend/cmd/server/main.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/repository/theme_segment_render_cache.go
    - shared/contracts/openapi.yaml
    - shared/contracts/episode-versions.yaml
    - frontend/src/lib/api.ts

key-decisions:
  - "Grant traegt optional cache_key; Stream lehnt Grant mit veraltetem cache_key nach Re-Render ab"
  - "release_grant.go auf gemeinsames signed_grant.go refaktoriert (DRY mit Segment-Grant)"
  - "uploaded_asset-Fallback wird ueber bestehende Media-Seams ausgeliefert, keine neue Media-Tabelle"
  - "Freie Parameter start/end/duration/startTimeTicks werden am Stream und im Relay abgelehnt"

patterns-established:
  - "Segmentstream authorisiert nur ueber Grant-Token, nie ueber freie Zeitparameter"

requirements-completed:
  - "Client adressiert Segment-ID; Grant kurzlebig und exakt segmentgebunden"
  - "Kein start/end/duration/startTimeTicks am Segmentstream"
  - "Auth/Refresh nutzt bestehende Server-Relay-Patterns"
  - "Segmentverwaltung prueft App-User-Capabilities, keine hart codierten Rollen"
  - "API-Vertrag aktualisiert"

duration: reconciled
completed: 2026-07-05
---

# Phase 98 / Plan 03: Segment-Grant, Stream-API und Next-Relay — Summary

**Eine sichere Segmentstream-Schicht liefert ausschliesslich vorbereitete Clips oder Upload-Fallbacks per kurzlebigem, segmentgebundenem Grant aus, lehnt freie Stream-Parameter ab und autorisiert ueber die App-User-Capability `release_version.segments.manage`.**

> **Reconciliation-Hinweis:** Grant-Kern in `3a41e17b`, Handler/Routes/Relay/Contracts als uncommittete Vorarbeit — beim Recovery-Reconciliation am 2026-07-05 als `feat(phase-98): add segment stream/render API and Next relay` (`624cce4a`) committet und gegen `go build`/`go test`/`tsc` (alle gruen) verifiziert.

## Accomplishments
- `CreateSegmentStreamGrant`, `RenderSegment`, `StreamSegment` in `segment_stream.go` mit Capability-Check, Grant-Signatur, Query-Tampering-Rejection und path-traversal-guarded File-Serving
- Routen `/segments/:id/grant|render|stream` in `main.go`; Handler-Deps via `WithSegmentStreamDeps`
- Next-Relay `frontend/src/app/api/segments/[id]/stream/route.ts` mit `resolveStreamRelayTarget`/`applyRefreshedAuthCookies`, 401→Refresh-Recovery und Range-Weiterleitung
- OpenAPI/episode-versions-Contract + `api.ts`-Client fuer Grant/Render/Stream

## Task Commits
- Grant + signed-grant Refactor + Tests — `3a41e17b`
- Handler, Routen, Relay, Contracts, Client — `624cce4a`

## Deviations from Plan
- `RenderSegment` rendert **synchron inline** statt ueber einen Hintergrund-Worker (Plan 02 Task 5). Fuer MVP-Adminpreview kurzer Clips akzeptiert; Worker-/Queue-Skalierung als Risiko festgehalten (siehe 98-02 SUMMARY / RISKS).

## Verification
- `go build ./...`, `go test ./internal/auth/... ./internal/handlers/...` → PASS
- `tsc --noEmit` → PASS
- `git diff --check` → sauber

## Next Phase Readiness
Stream-/Grant-Schicht steht; Admin-UI (98-04) konsumiert `/api/segments/:id/stream` und den Renderstatus.

---
*Phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback*
*Completed: 2026-07-05 (reconciled)*
