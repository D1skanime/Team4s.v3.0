---
status: partial
phase: 35-release-version-media-backend-upload-service-and-api
source: [35-VERIFICATION.md]
started: 2026-05-08T10:30:00.000Z
updated: 2026-05-08T10:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Docker CGO-Build + Health
expected: `docker compose build backend` schlägt NICHT fehl; `curl http://localhost:8092/health` gibt 200 zurück — kein Linker-Fehler durch govips/libvips
result: [pending]

### 2. GIF-Upload-Verhalten
expected: Animiertes GIF hochladen → gespeicherte Original-Datei bleibt animiert (mehrere Frames); Thumbnail ist Single-Frame-JPEG oder WebP (govips frame-0-Extraktion via NumPages.Set(1))
result: [pending]

### 3. DB-Rollback + Datei-Cleanup bei Fehler
expected: Fehler nach Datei-Write simulieren → keine verwaisten Dateien auf Disk, kein media_assets-Row mit status=processing oder status=ready
result: [pending]

### 4. Transaktionelles Preview-Candidate
expected: Zwei Medien für dieselbe release_version_id anlegen; zweites auf is_preview_candidate=true setzen via PATCH → erstes wird atomar auf is_preview_candidate=false gesetzt (ClearPreviewCandidateForVersion in gleicher Transaktion)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
