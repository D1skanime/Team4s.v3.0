# Phase 33: Release-Theme-Asset size_bytes Persistence Fix - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Beim Upload eines Release-Theme-Assets wird die Dateigröße korrekt in die `media_files`-Tabelle geschrieben, sodass die List-API `size_bytes` mit dem echten Wert zurückgibt statt immer 0.

Kein DB-Schema-Change. Kein Backfill bestehender Datensätze (nur Testdaten betroffen).

</domain>

<decisions>
## Implementation Decisions

### Fix-Strategie
- **D-01:** Option A — nach `CreateMediaAsset` in beiden Release-Theme-Upload-Handlern einen `media_files`-Eintrag (variant='original') anlegen. Kein neues DB-Schema nötig, konsistent mit dem bestehenden Image/Video-Upload-Pattern.
- **D-02:** Die `media_files`-Row bekommt: `media_id = asset.ID`, `variant = 'original'`, `path = saveResult.CreateInput.StoragePath`, `size = len(data)`, `width = 0`, `height = 0`.

### Backfill
- **D-03:** Keine Rückwirkung auf bestehende Assets. Bestehende Release-Theme-Assets behalten `size_bytes: 0` — sie sind nur Testdaten und werden nicht nachgepflegt.

### Repository-Zugang
- **D-04:** `CreateMediaFile` liegt auf `MediaUploadRepository`, aber der Release-Theme-Handler hat nur `h.mediaRepo` (`*repository.MediaRepository`). Lösung: eine neue Methode `InsertMediaFile` direkt auf `MediaRepository` hinzufügen (kein neues Dependency nötig), die den INSERT in `media_files` ausführt.

### Betroffene Handler
- **D-05:** Beide Upload-Handler müssen gepatcht werden:
  - `UploadReleaseThemeAsset` (POST `/admin/fansubs/:id/anime/:animeId/theme-assets`)
  - `UploadReleaseThemeAssetForRelease` (POST `/admin/releases/:releaseId/theme-assets`)

### Claude's Discretion
- Fehlerbehandlung beim `InsertMediaFile`-Fehler: Rollback des Media-Assets (wie beim bestehenden `DeleteMediaAsset`-Cleanup) oder nur loggen — Claude entscheidet basierend auf dem bestehenden Fehlerbehandlungspattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Upload-Handler (zu patchen)
- `backend/internal/handlers/admin_content_release_theme_assets.go` — beide Upload-Handler, Lines ~113–340

### Repository
- `backend/internal/repository/media_upload.go` — `CreateMediaFile` Implementierung als Referenz-Pattern
- `backend/internal/repository/media_repository.go` — `CreateMediaAsset`, wo `InsertMediaFile` hinzukommt

### Model
- `backend/internal/models/media_upload.go` — `UploadMediaFile` struct (MediaID string, Variant, Path, Width, Height, Size)

### List-Query (warum size_bytes 0 ist)
- `backend/internal/repository/admin_content_anime_themes.go` — Lines ~1880–1928 (`ListReleaseThemeAssets`), Subquery auf `media_files.size`

### Test
- `backend/internal/handlers/admin_content_fansub_releases_test.go` — bestehende Tests als Orientierung

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MediaUploadRepository.CreateMediaFile` — exakt dasselbe INSERT-Pattern, das `InsertMediaFile` auf `MediaRepository` replizieren soll
- `h.mediaRepo.DeleteMediaAsset` — zeigt das Rollback-Pattern nach fehlgeschlagenem Folgeschritt

### Established Patterns
- Upload-Handler: `SaveX` (Service) → `CreateMediaAsset` (Repo) → Cleanup bei Fehler → `CreateReleaseThemeAsset` (ThemeRepo)
- Neuer Schritt: `SaveX` → `CreateMediaAsset` → **`InsertMediaFile`** → Cleanup bei Fehler → `CreateReleaseThemeAsset`

### Integration Points
- `h.mediaRepo` hat bereits DB-Zugriff; `InsertMediaFile` kann dieselbe Connection nutzen

</code_context>

<specifics>
## Specific Ideas

- Keine speziellen Anforderungen — Standard-INSERT in `media_files` mit `variant='original'`

</specifics>

<deferred>
## Deferred Ideas

- Backfill bestehender Release-Theme-Assets (size_bytes=0) — nur Testdaten, explizit nicht in Scope

</deferred>

---

*Phase: 33-release-theme-asset-size-bytes-persistence-fix*
*Context gathered: 2026-05-06*
