---
phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback
plan: 01
subsystem: database
tags: [postgres, migration, ffmpeg, config, derived-cache, go]

requires:
  - phase: 98-00
    provides: Render-Cache- und Config-Erwartungen als Tests
provides:
  - Tabelle theme_segment_render_cache als technischer Derived-Media-Cache (Migration 0122)
  - SEGMENT_RENDER_* Konfiguration und ffmpeg/ffprobe in der Backend-Runtime
  - Repository-Methoden fuer Cache-Lesen, Upsert, Statuswechsel und Stale-Markierung
affects: [98-02, 98-03]

tech-stack:
  added:
    - "ffmpeg/ffprobe in backend/Dockerfile"
  patterns:
    - "Prepared Segment-Clips sind technische Cache-Dateien, keine fachliche Media-Ownership-Struktur"

key-files:
  created:
    - database/migrations/0122_theme_segment_render_cache.up.sql
    - database/migrations/0122_theme_segment_render_cache.down.sql
    - backend/internal/models/theme_segment_render_cache.go
    - backend/internal/repository/theme_segment_render_cache.go
  modified:
    - backend/internal/config/config.go
    - backend/Dockerfile
    - docker-compose.yml

key-decisions:
  - "Migrationsnummer 0122 (naechste freie nach 0121)"
  - "cache_key ist eindeutig; FKs auf Segment und Playback-Source"
  - "Statuswerte queued/rendering/ready/failed/stale; ready braucht Datei+MIME+Duration"
  - "Derived-Renderpfad unter kontrolliertem Media-Volume (/app/media/derived/segments), keine Jellyfin-Secrets im Image"

patterns-established:
  - "Statusmodell mit invalidated_at/stale fuer reproduzierbaren, invalidierbaren Cache"

requirements-completed:
  - "Prepared Clips sind technische Cache-Dateien"
  - "Keine neue fachliche Media-Ownership-Struktur"
  - "Cache ist invalidierbar und reproduzierbar"
  - "FFmpeg/FFprobe sind in der Runtime verfuegbar"

duration: reconciled
completed: 2026-07-05
---

# Phase 98 / Plan 01: Schema, Runtime und Derived-Cache — Summary

**Eine technische Derived-Media-Basis (Tabelle `theme_segment_render_cache`, Migration 0122) mit Statusmodell, SEGMENT_RENDER-Konfiguration und ffmpeg/ffprobe-Runtime steht bereit, ohne fachliche Upload-Media-Tabellen zu missbrauchen.**

> **Reconciliation-Hinweis:** In einem frueheren Lauf als `feat(phase-98)`-Commits (`c95423a4`, `bcf59933`) umgesetzt, aber ohne SUMMARY. Am 2026-07-05 im Recovery-Reconciliation nachgetrackt und gegen `go build`/`go test` (gruen) verifiziert.

## Accomplishments
- Migration `0122_theme_segment_render_cache` (up/down) mit allen geforderten Feldern, eindeutigem `cache_key` und Foreign Keys
- Model + Repository (`theme_segment_render_cache.go`) mit Cache-Lookup, Upsert-Queued, Statuswechseln (rendering/ready/failed) und Stale-Markierung
- Config-Erweiterung: `SEGMENT_RENDER_ENABLED`, `SEGMENT_RENDER_DIR`, `SEGMENT_RENDER_MAX_SECONDS` (240), `SEGMENT_RENDER_FFMPEG_PATH`, `SEGMENT_RENDER_FFPROBE_PATH`
- `backend/Dockerfile` + `docker-compose.yml`: ffmpeg/ffprobe in der Runtime, Derived-Pfad unter Media-Volume

## Task Commits
- Cache-Foundation (Migration/Config/Model/Repo/Dockerfile/compose) — `c95423a4`
- Model-/Repo-Ergaenzungen fuer Source-Aufloesung — `bcf59933`

## Deviations from Plan
None — Tabellen-/Statusmodell wie spezifiziert.

## Verification
- `go build ./...` → PASS
- `go test ./internal/config/... ./internal/repository/...` (Config-Pfad gruen; DB-gebundene Repo-Tests siehe 98-05)
- Migration up/down + `docker compose build backend` / `ffmpeg -version` → als Runtime-Smoke in Plan 98-05

## Next Phase Readiness
Cache-Schema und Config stehen; Render-Service (98-02) kann Cache befuellen.

---
*Phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback*
*Completed: 2026-07-05 (reconciled)*
