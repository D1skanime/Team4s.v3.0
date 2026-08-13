---
phase: 33-release-theme-asset-size-bytes-persistence-fix
verified: 2026-05-05T00:00:00Z
status: passed
score: 3/3 must-haves verified
re_verification: false
---

# Phase 33: Release-Theme-Asset size_bytes Persistence Fix — Verification Report

**Phase Goal:** Nach einem Release-Theme-Asset-Upload persistiert der Handler die tatsaechliche Dateigroesse in `media_files`, sodass `ListReleaseThemeAssets` in `size_bytes` den echten Wert zurueckgibt statt immer 0.
**Verified:** 2026-05-05
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Nach einem Release-Theme-Asset-Upload gibt die List-API einen size_bytes-Wert ungleich 0 zurueck | VERIFIED | `InsertMediaFile` wird in beiden Handlern direkt nach `CreateMediaAsset` aufgerufen und schreibt `int64(len(data))` in `media_files`; die List-Query liest `size_bytes` via `COALESCE((SELECT mf.size FROM media_files ...), 0)` — ohne den Eintrag wuerde 0 herauskommen, mit Eintrag der echte Wert |
| 2 | Beide Upload-Handler (fansub-Route und release-Route) fuehren nach CreateMediaAsset einen InsertMediaFile-Aufruf durch | VERIFIED | `UploadReleaseThemeAsset` Lines 210-221 und `UploadReleaseThemeAssetForRelease` Lines 325-336 in `admin_content_release_theme_assets.go`; `strings.Count(handlerSrc, "h.mediaRepo.InsertMediaFile(") == 2` — TestReleaseThemeAsset_InsertMediaFileCalled PASS |
| 3 | Bei einem InsertMediaFile-Fehler wird das Media-Asset per DeleteMediaAsset rueckgaengig gemacht und die Datei entfernt | VERIFIED | Beide Handler enthalten im err-Block: `_ = h.mediaRepo.DeleteMediaAsset(...)` + `_ = removeFileQuietly(...)`; TestReleaseThemeAsset_InsertMediaFileRollback PASS |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `backend/internal/repository/media_repository.go` | InsertMediaFile-Methode auf MediaRepository | Yes | Yes — func (r *MediaRepository) InsertMediaFile with INSERT INTO media_files (media_id, variant, path, width, height, size) VALUES ($1, $2, $3, 0, 0, $4) Lines 151-166 | Yes — called from handler via h.mediaRepo.InsertMediaFile | VERIFIED |
| `backend/internal/handlers/admin_content_release_theme_assets.go` | Beide Upload-Handler mit InsertMediaFile-Aufruf nach CreateMediaAsset | Yes | Yes — two InsertMediaFile call blocks at Lines 210-221 and 325-336, each with rollback | Yes — calls h.mediaRepo.InsertMediaFile which resolves to the repo method above | VERIFIED |
| `backend/internal/handlers/admin_content_release_theme_assets_test.go` | Source-Text-Tests fuer FIX-01, FIX-02, FIX-03 | Yes | Yes — TestReleaseThemeAsset_InsertMediaFileCalled covers FIX-01+FIX-02; TestReleaseThemeAsset_InsertMediaFileRollback covers FIX-03 | Yes — `go test ./internal/handlers/... -run TestReleaseThemeAsset` PASS (both tests) | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `admin_content_release_theme_assets.go` | `media_repository.go` | `h.mediaRepo.InsertMediaFile(ctx, mediaAsset.ID, "original", mediaAsset.StoragePath, int64(len(data)))` | WIRED | Pattern confirmed at Lines 210-215 (Handler 1) and Lines 325-330 (Handler 2); exact call signature matches InsertMediaFile parameters (mediaID int64, variant string, path string, size int64) |
| `admin_content_anime_themes.go` | `media_files` table | `COALESCE((SELECT mf.size FROM media_files mf WHERE mf.media_id = ma.id ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id LIMIT 1), 0) AS size_bytes` | WIRED | Confirmed at Lines 1884-1890 (ListReleaseThemeAssets) and Lines 1953-1959 (ListReleaseThemeAssetsByFansubAnime); InsertMediaFile writes variant='original' which is preferred by the ORDER BY clause |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `admin_content_release_theme_assets.go` (UploadReleaseThemeAsset) | `data []byte` from `io.ReadAll(file)` | multipart form file upload | Yes — real file bytes; `int64(len(data))` is the actual file size | FLOWING |
| `admin_content_anime_themes.go` (ListReleaseThemeAssets) | `size_bytes` | COALESCE subquery on `media_files.size` column | Yes — after InsertMediaFile writes the row, `mf.size` returns real data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| FIX-01: InsertMediaFile method exists on MediaRepository | `go test ./internal/handlers/... -run TestReleaseThemeAsset_InsertMediaFileCalled -v` | PASS | PASS |
| FIX-02: Both handlers call InsertMediaFile (count >= 2) | same test (combined assertion) | PASS | PASS |
| FIX-03: DeleteMediaAsset rollback follows InsertMediaFile in handler source | `go test ./internal/handlers/... -run TestReleaseThemeAsset_InsertMediaFileRollback -v` | PASS | PASS |
| Full backend compiles without errors | `go build ./...` | No output (success) | PASS |
| Full internal test suite passes | `go test ./internal/...` | all ok — auth, config, handlers, middleware, migrations, models, observability, repository, services | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FIX-01 | 33-01-PLAN.md | InsertMediaFile-Methode existiert auf *MediaRepository | SATISFIED | `func (r *MediaRepository) InsertMediaFile` at Line 151 of media_repository.go; confirmed by TestReleaseThemeAsset_InsertMediaFileCalled PASS |
| FIX-02 | 33-01-PLAN.md | Beide Upload-Handler rufen InsertMediaFile nach CreateMediaAsset auf | SATISFIED | `h.mediaRepo.InsertMediaFile(` appears 2 times in admin_content_release_theme_assets.go (Lines 210, 325); confirmed by test assertion `count < 2` not triggered |
| FIX-03 | 33-01-PLAN.md | Bei InsertMediaFile-Fehler wird DeleteMediaAsset als Rollback aufgerufen | SATISFIED | Both err-blocks after InsertMediaFile contain `h.mediaRepo.DeleteMediaAsset(` + `removeFileQuietly(`; confirmed by TestReleaseThemeAsset_InsertMediaFileRollback PASS |

Note: FIX-01, FIX-02, FIX-03 are phase-local requirements defined in 33-RESEARCH.md (Phase Requirements -> Test Map). They do not appear in the global REQUIREMENTS.md, which is expected — this is a targeted bugfix phase with self-contained requirements. No orphaned requirements found.

### Anti-Patterns Found

No anti-patterns found in modified files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No issues |

### Human Verification Required

One item requires a live environment to fully confirm the end-to-end fix:

**1. Live Upload -> List-API size_bytes Round-Trip**

**Test:** Upload a Release-Theme-Asset via POST `/api/v1/admin/releases/:releaseId/theme-assets` with a real video file, then call GET `/api/v1/admin/releases/:releaseId/theme-assets` and inspect `size_bytes` in the response.
**Expected:** `size_bytes` equals the byte size of the uploaded file (not 0).
**Why human:** Source-text tests confirm the code path is wired; actual DB write and COALESCE read require a running Postgres instance with the Docker Compose stack.

### Gaps Summary

No gaps. All three truths are verified. The fix is structurally complete:

- `InsertMediaFile` exists on `*MediaRepository` with the correct SQL (`VALUES ($1, $2, $3, 0, 0, $4)`)
- Both upload handlers call it immediately after a successful `CreateMediaAsset`, before `CreateReleaseThemeAsset`
- Both call `DeleteMediaAsset` + `removeFileQuietly` in the error branch of `InsertMediaFile`
- The consumer list-query (COALESCE subquery on `media_files.size`) was already in place and will now return real values
- All source-text tests pass; the full backend compiles and all internal tests are green
- No DB schema change, no frontend touch, no backfill (per D-03) — all in scope

---

_Verified: 2026-05-05_
_Verifier: Claude (gsd-verifier)_
