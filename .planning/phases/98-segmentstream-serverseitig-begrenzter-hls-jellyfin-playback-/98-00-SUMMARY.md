---
phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback
plan: 00
subsystem: testing
tags: [go, testify, vitest, openapi, tdd, segment-stream]

requires: []
provides:
  - Fokussierte Backend-Tests fuer Segment-Playback-Aufloesung, Grant/Stream-Sicherheit, Render-Cache und Config
  - Contract-Pruefpunkte fuer Segment-Renderstatus in OpenAPI/Admin-Content
affects: [98-01, 98-02, 98-03, 98-04, 98-05]

tech-stack:
  added: []
  patterns:
    - "Sicherheits-/domainkritische Erwartungen zuerst als fokussierte Tests, die die folgenden Wellen fuehren"

key-files:
  created:
    - backend/internal/auth/segment_grant_test.go
    - backend/internal/handlers/segment_validation_test.go
    - backend/internal/services/segment_render_service_test.go
    - backend/internal/repository/theme_segment_render_cache_test.go
  modified:
    - backend/internal/config/config_test.go
    - shared/contracts/openapi.yaml
    - shared/contracts/episode-versions.yaml

key-decisions:
  - "Grant ist auf theme_segment_id gebunden; freie Stream-Parameter (start/end/duration/startTimeTicks) werden abgelehnt"
  - "Keine neue Media-Tabelle und kein release_media-Shortcut fuer Segmentclips"

patterns-established:
  - "Query-Tampering-Rejection als testbare Handler-Invariante"

requirements-completed:
  - "Segment-ID statt freier Stream-Parameter"
  - "Automatisch abgeleitete Clips maximal 4 Minuten"
  - "Rechte ueber release_version.segments.manage Capability statt Rollen-Hardcode"

duration: reconciled
completed: 2026-07-05
---

# Phase 98 / Plan 00: Tests und Contract-Flaeche zuerst — Summary

**Sicherheits- und domainkritische Segment-Erwartungen sind als fokussierte, gruene Backend-Tests und Contract-Pruefpunkte verankert und fuehren die Implementierungswellen 01-04.**

> **Reconciliation-Hinweis:** Dieser Plan wurde in einem frueheren, unterbrochenen Lauf umgesetzt, aber ohne SUMMARY/Tracking abgeschlossen. Diese SUMMARY wurde beim Recovery-Reconciliation-Lauf am 2026-07-05 nachgezogen und gegen `go test` (gruen) und `git diff --check` (sauber) verifiziert.

## Accomplishments
- Backend-Tests fuer Segment-Grant-Sicherheit (`segment_grant_test.go`) und Handler-Validierung / Query-Tampering-Rejection (`segment_validation_test.go`)
- Render-Service- und Render-Cache-Tests (`segment_render_service_test.go`, `theme_segment_render_cache_test.go`) fuer Cache-Key-Invarianten und Statuswechsel
- Config-Tests fuer die neuen `SEGMENT_RENDER_*`-Variablen
- Contract-Pruefpunkte fuer Segment-Renderstatus in `openapi.yaml` / `episode-versions.yaml`

## Files Created/Modified
- `backend/internal/auth/segment_grant_test.go` — Grant-Bindung an Segment-ID, TTL, Signaturpruefung
- `backend/internal/handlers/segment_validation_test.go` — Ablehnung freier Stream-Parameter
- `backend/internal/services/segment_render_service_test.go` — Cache-Key/Duration-Limit/Log-Sanitizing
- `backend/internal/repository/theme_segment_render_cache_test.go` — Upsert/Statuswechsel
- `shared/contracts/openapi.yaml`, `shared/contracts/episode-versions.yaml` — Renderstatus im Vertrag

## Deviations from Plan
None — Erwartungen wie geplant verankert.

## Verification
- `go test ./internal/auth/... ./internal/services/... ./internal/config/... ./internal/handlers/...` → PASS
- `git diff --check` → sauber

## Next Phase Readiness
Erwartungen stehen; Plaene 01-04 implementieren gegen diese Tests.

---
*Phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback*
*Completed: 2026-07-05 (reconciled)*
