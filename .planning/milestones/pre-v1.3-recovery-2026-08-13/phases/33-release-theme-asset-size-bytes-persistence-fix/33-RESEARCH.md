# Phase 33: Release-Theme-Asset size_bytes Persistence Fix - Research

**Researched:** 2026-05-05
**Domain:** Go backend repository layer — media_files INSERT nach CreateMediaAsset
**Confidence:** HIGH

## Summary

Der Bug ist vollstaendig durch Code-Lesen verifiziert. Die `ListReleaseThemeAssets`- und `ListReleaseThemeAssetsByFansubAnime`-Queries lesen `size_bytes` als Subquery aus `media_files` (mit `COALESCE(..., 0)`). Die beiden Release-Theme-Upload-Handler (`UploadReleaseThemeAsset` und `UploadReleaseThemeAssetForRelease`) fuehren nach `CreateMediaAsset` keinen `media_files`-INSERT durch — im Gegensatz zu den Image/Video-Upload-Handlern, die `MediaUploadRepository.CreateMediaFile` aufrufen. Das Ergebnis ist, dass `size_bytes` nach dem Upload immer `0` zurueckgibt.

Der Fix besteht aus zwei eng begrenzten Aenderungen: (1) eine neue Methode `InsertMediaFile` auf `*repository.MediaRepository` hinzufuegen, die exakt den gleichen INSERT ausfuehrt wie `MediaUploadRepository.createMediaFileV2`, und (2) beide Handler nach `CreateMediaAsset` um diesen Aufruf erweitern, mit Rollback bei Fehler analog zum bestehenden `DeleteMediaAsset`-Cleanup-Pattern.

**Primaere Empfehlung:** Einen Plan — direkte Backend-Aenderung in zwei Dateien, kein DB-Schema-Change, kein Frontend-Touch, kein Backfill.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Option A — nach `CreateMediaAsset` in beiden Release-Theme-Upload-Handlern einen `media_files`-Eintrag (variant='original') anlegen. Kein neues DB-Schema noetig, konsistent mit dem bestehenden Image/Video-Upload-Pattern.
- **D-02:** Die `media_files`-Row bekommt: `media_id = asset.ID`, `variant = 'original'`, `path = saveResult.CreateInput.StoragePath`, `size = len(data)`, `width = 0`, `height = 0`.
- **D-03:** Keine Rueckwirkung auf bestehende Assets. Bestehende Release-Theme-Assets behalten `size_bytes: 0` — nur Testdaten.
- **D-04:** `InsertMediaFile` direkt auf `MediaRepository` hinzufuegen (kein neues Dependency noetig).
- **D-05:** Beide Upload-Handler patchen: `UploadReleaseThemeAsset` und `UploadReleaseThemeAssetForRelease`.

### Claude's Discretion
- Fehlerbehandlung beim `InsertMediaFile`-Fehler: Rollback des Media-Assets (wie beim bestehenden `DeleteMediaAsset`-Cleanup) oder nur loggen — Claude entscheidet basierend auf dem bestehenden Fehlerbehandlungspattern.

### Deferred Ideas (OUT OF SCOPE)
- Backfill bestehender Release-Theme-Assets (size_bytes=0) — nur Testdaten, explizit nicht in Scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/jackc/pgx/v5` | v5 | PostgreSQL query | Projekt-Standard fuer alle DB-Operationen |
| Go stdlib `context` | — | Context-Weitergabe | Standard-Pattern im gesamten Repo |

Kein neues Dependency noetig. Die Aenderung nutzt ausschliesslich bestehende Imports in `media_repository.go`.

**Installation:** Keine neue Abhaengigkeit.

## Architecture Patterns

### Empfohlene Aenderungsstruktur

```
backend/internal/repository/media_repository.go   ← InsertMediaFile hinzufuegen
backend/internal/handlers/admin_content_release_theme_assets.go  ← beide Handler patchen
```

### Pattern 1: InsertMediaFile Signatur auf MediaRepository

**Was:** Neue Methode auf `*MediaRepository`, die einen `media_files`-Eintrag anlegt.

**Signatur (abgeleitet aus createMediaFileV2 und dem Caller-Kontext):**

```go
// InsertMediaFile legt einen media_files-Eintrag fuer ein per CreateMediaAsset
// erstelltes Asset an. mediaID ist die int64-ID des Media-Assets.
// Wird verwendet, wenn kein MediaUploadRepository verfuegbar ist.
func (r *MediaRepository) InsertMediaFile(
    ctx context.Context,
    mediaID int64,
    variant string,
    path string,
    size int64,
) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO media_files (media_id, variant, path, width, height, size)
        VALUES ($1, $2, $3, 0, 0, $4)
    `, mediaID, variant, path, size)
    if err != nil {
        return fmt.Errorf("insert media file for asset %d: %w", mediaID, err)
    }
    return nil
}
```

**Begruendung fuer flache Parameter statt Struct:**
- Nur 4 Parameter (mediaID, variant, path, size) — kein eigener Input-Typ noetig
- Width/Height sind laut D-02 immer 0 fuer Video-Assets — werden intern gehartet
- `UploadMediaFile`-Struct aus `models/media_upload.go` hat `MediaID string` (Legacy-Typ), passt nicht zum int64-nativen Kontext von `MediaRepository`

**Warum kein RETURNING/Scan:** Der Handler braucht die generierte ID nicht. `Exec` reicht.

### Pattern 2: Handler-Erweiterung (beide Handler identisch)

**Bestehendes Pattern (nach CreateMediaAsset, vor CreateReleaseThemeAsset):**

```go
// Bestehend — CreateMediaAsset
mediaAsset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
if err != nil {
    _ = removeFileQuietly(saveResult.CreateInput.StoragePath)
    // ... Fehlerbehandlung
    return
}

// NEU einzufuegen:
if err := h.mediaRepo.InsertMediaFile(
    c.Request.Context(),
    mediaAsset.ID,
    "original",
    saveResult.CreateInput.StoragePath,
    int64(len(data)),
); err != nil {
    _ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
    _ = removeFileQuietly(mediaAsset.StoragePath)
    writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigroesse konnte nicht gespeichert werden.")
    return
}

// Bestehend — CreateReleaseThemeAsset
created, err := h.themeRepo.CreateReleaseThemeAsset(...)
```

### Pattern 3: Fehlerbehandlung bei InsertMediaFile-Fehler (Claude's Discretion)

**Entscheidung: Rollback (DeleteMediaAsset + removeFileQuietly), kein bloss-loggen.**

**Begruendung:** Das bestehende Pattern in beiden Handlern bei `CreateReleaseThemeAsset`-Fehler fuehrt immer einen Rollback durch:
```go
_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
_ = removeFileQuietly(mediaAsset.StoragePath)
```
Ein `InsertMediaFile`-Fehler wuerde einen `media_assets`-Eintrag ohne `media_files`-Eintrag hinterlassen — exakt der Zustand, den dieser Fix behebt. Konsistenz gebietet Rollback. Nur loggen wuerde das gleiche kaputte Datenbankzustand erzeugen, das der Fix vermeiden soll.

### Anti-Patterns to Avoid

- **Kein Struct-Wrapper als neuer Input-Typ:** Ueberkomplex fuer 4 Parameter, von denen 2 konstant sind (variant='original', width=0/height=0).
- **Keine DB-Transaktion ueber CreateMediaAsset + InsertMediaFile:** Die bestehenden Handler verwenden keine Transaktionen fuer diesen Schritt. Der Rollback-Mechanismus via `DeleteMediaAsset` ist das etablierte Failure-Pattern im Projekt. Eine Transaktion wuerde die Handler-Struktur signifikant veraendern.
- **Kein Rueckgriff auf `UploadMediaFile`-Struct:** Das Struct hat `MediaID string` (Legacy), waehrend `MediaRepository` mit `int64`-IDs arbeitet. Keine Vermischung.
- **Kein neuer mediaUploadRepo-Dependency auf dem Handler:** `h.mediaRepo` hat DB-Zugriff, kein zweites Repo noetig.

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen | Warum |
|---------|-------------|-------------|-------|
| DB-INSERT fuer media_files | Eigenes Query-Format erfinden | Exakt wie `createMediaFileV2` in `media_upload.go` | Gleiche Tabelle, gleiches Schema |
| Rollback-Mechanismus | Eigene Transaktion | `DeleteMediaAsset` + `removeFileQuietly` | Bestehendes Handler-Pattern |

## Key Type Facts

### `mediaAsset.ID` ist `int64`

Bestaetigt in `backend/internal/models/media.go`:
```go
type MediaAsset struct {
    ID int64 `json:"id"`
    ...
}
```

`CreateMediaAsset` auf `MediaRepository` gibt `*models.MediaAsset` zurueck, also `mediaAsset.ID` ist `int64`. Kein Parsing noetig. `InsertMediaFile` nimmt direkt `mediaID int64`.

### `saveResult.CreateInput.StoragePath` ist `string`

Bestaetigt in `backend/internal/models/media.go`:
```go
type MediaAssetCreateInput struct {
    StoragePath string
    ...
}
```

Wird als `path`-Parameter an `InsertMediaFile` uebergeben.

### `len(data)` ergibt `int`, muss auf `int64` gecastet werden

`data` ist `[]byte` aus `io.ReadAll`. `int64(len(data))` fuer den `size`-Parameter.

## Common Pitfalls

### Pitfall 1: Rollback-Reihenfolge falsch
**Was schief geht:** Nach `InsertMediaFile`-Fehler nur `removeFileQuietly` aufrufen ohne `DeleteMediaAsset`.
**Warum:** Wuerde einen verwaisten `media_assets`-Eintrag hinterlassen.
**Vermeidung:** Exakt das Pattern beim `CreateReleaseThemeAsset`-Fehler kopieren — zuerst `DeleteMediaAsset`, dann `removeFileQuietly`.

### Pitfall 2: `mediaAsset.StoragePath` vs `saveResult.CreateInput.StoragePath`
**Was schief geht:** Unterschiedliche Verwendung beim Rollback vs InsertMediaFile-Argument.
**Warum:** Beide Felder enthalten den gleichen Wert (direkt aus dem CreateMediaAsset-Insert), aber der Handler-Code-Stil nutzt `mediaAsset.StoragePath` beim Cleanup (nach erfolgreichem CreateMediaAsset) und `saveResult.CreateInput.StoragePath` beim Fehler davor.
**Vermeidung:** Beim InsertMediaFile-Fehler gilt bereits `mediaAsset != nil`, daher kann `mediaAsset.StoragePath` fuer den Rollback verwendet werden — oder `saveResult.CreateInput.StoragePath` (gleicher Wert). Konsistenz mit dem Pattern nach `CreateReleaseThemeAsset`-Fehler bevorzugen: `mediaAsset.StoragePath`.

### Pitfall 3: `mediaRepo` ist kein Interface — kein Stub-Test moeglich
**Was schief geht:** Versuchen, einen Unit-Test zu schreiben, der `InsertMediaFile` via Stub testet.
**Warum:** `h.mediaRepo` ist `*repository.MediaRepository` (concrete struct, kein Interface). Die bestehenden Handler-Tests nutzen Source-Text-Checks (strings.Contains) fuer Upload-Handler, keine funktionalen Durchlauf-Tests.
**Vermeidung:** Test-Strategie folgt dem bestehenden Pattern in `admin_content_fansub_releases_test.go`: Source-Text-Pruefung ob `InsertMediaFile` im Handler-Code erscheint. Fuer den Repository-Teil: Unit-Test direkt gegen `InsertMediaFile` mit echter DB (wie andere Repo-Tests) oder Integrations-Test.

### Pitfall 4: Beide Handler muessen identisch gepacht werden
**Was schief geht:** Nur einen der beiden Handler patchen.
**Warum:** `UploadReleaseThemeAsset` (fansub-Route) und `UploadReleaseThemeAssetForRelease` (release-Route) haben identische Upload-Logik aber unterschiedliche Route-Parameter. D-05 schreibt beide vor.
**Erkennung:** Eine Test-Assertion die prueft, ob `InsertMediaFile` zweimal im Handler-File erscheint (oder eine Assertion pro Handler-Funktion).

## Code Examples

### Vollstaendiger InsertMediaFile-Aufruf im Handler (Referenzimplementierung)

```go
// Source: Abgeleitet aus createMediaFileV2 in media_upload.go und
//         DeleteMediaAsset-Cleanup-Pattern in admin_content_release_theme_assets.go

// Nach erfolgreichem CreateMediaAsset:
if err := h.mediaRepo.InsertMediaFile(
    c.Request.Context(),
    mediaAsset.ID,
    "original",
    mediaAsset.StoragePath,
    int64(len(data)),
); err != nil {
    _ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
    _ = removeFileQuietly(mediaAsset.StoragePath)
    writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigroesse konnte nicht gespeichert werden.")
    return
}
```

### SQL des INSERT (aus createMediaFileV2 abgeleitet, vereinfacht fuer width/height=0)

```sql
INSERT INTO media_files (media_id, variant, path, width, height, size)
VALUES ($1, $2, $3, 0, 0, $4)
```

### Bestehende List-Query zeigt warum der Fix wirkt

```sql
-- In ListReleaseThemeAssets (admin_content_anime_themes.go ~L1884)
COALESCE((
    SELECT mf.size
    FROM media_files mf
    WHERE mf.media_id = ma.id
    ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id
    LIMIT 1
), 0) AS size_bytes
-- Ohne media_files-Eintrag: COALESCE ergibt 0
-- Mit InsertMediaFile('original', path, len(data)): korrekter Wert
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Go testing (stdlib) + testify |
| Config file | keins — `go test ./...` |
| Quick run command | `go test ./backend/internal/handlers/... -run TestReleaseThemeAsset -v` |
| Full suite command | `go test ./backend/internal/...` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | `InsertMediaFile` existiert auf MediaRepository | source-text | `go test ./backend/internal/handlers/... -run TestReleaseThemeAsset_InsertMediaFileCalled -v` | ❌ Wave 0 |
| FIX-02 | Beide Handler enthalten InsertMediaFile-Aufruf | source-text | innerhalb FIX-01 Test | ❌ Wave 0 |
| FIX-03 | Bei InsertMediaFile-Fehler wird DeleteMediaAsset aufgerufen (Rollback) | source-text | `go test ./backend/internal/handlers/... -run TestReleaseThemeAsset_InsertMediaFileRollback -v` | ❌ Wave 0 |

**Hinweis zum Test-Pattern:** Da `h.mediaRepo` kein Interface ist, folgen Handler-Tests dem bestehenden Source-Text-Pruefungs-Pattern (wie in `admin_content_fansub_releases_test.go`). Sie pruefen ob die Methodennamen und Argumente im Handler-Source-Code erscheinen, anstatt echte HTTP-Requests durchzufuehren.

Optional: Direkter Repo-Unit-Test fuer `InsertMediaFile` mit real DB (wie andere Repository-Tests mit `setupTestDB`).

### Sampling Rate
- **Per task commit:** `go test ./backend/internal/handlers/... -run TestReleaseThemeAsset`
- **Per wave merge:** `go test ./backend/internal/...`
- **Phase gate:** Full suite green vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/handlers/admin_content_release_theme_assets_test.go` — neu, deckt FIX-01, FIX-02, FIX-03 ab (source-text pattern)

## Environment Availability

Step 2.6: SKIPPED (nur Backend-Code-Aenderung, keine externen Abhaengigkeiten ausser laufendem Docker Compose fuer manuelle Verifikation)

## Runtime State Inventory

Step 2.5: SKIPPED (kein Rename/Refactor — reiner Bugfix mit INSERT in bestehende Tabelle)

## Open Questions

1. **`mediaAsset.StoragePath` vs `saveResult.CreateInput.StoragePath` fuer path-Argument**
   - Was wir wissen: Beide enthalten den gleichen Wert (StoragePath wird in CreateMediaAsset direkt aus CreateInput uebernommen — bestaetigt in `media_repository.go` L62-63)
   - Unklar: Welches zu bevorzugen ist.
   - Empfehlung: `mediaAsset.StoragePath` verwenden, da im Fehlerfall nach InsertMediaFile `mediaAsset` bereits verfuegbar ist und das gleiche Feld auch beim Cleanup-Rollback nach `CreateReleaseThemeAsset`-Fehler verwendet wird. Konsistenz.

## Sources

### Primary (HIGH confidence)
- Direkt gelesen: `backend/internal/handlers/admin_content_release_theme_assets.go` — beide Upload-Handler vollstaendig gelesen
- Direkt gelesen: `backend/internal/repository/media_upload.go` — `CreateMediaFile`/`createMediaFileV2` als Referenz-Pattern
- Direkt gelesen: `backend/internal/repository/media_repository.go` — `CreateMediaAsset` Rueckgabe-Typ, `DeleteMediaAsset` Signatur
- Direkt gelesen: `backend/internal/models/media.go` — `MediaAsset.ID` ist `int64`, `MediaAssetCreateInput.StoragePath` ist `string`
- Direkt gelesen: `backend/internal/models/media_upload.go` — `UploadMediaFile.MediaID` ist `string` (Legacy, nicht verwenden)
- Direkt gelesen: `backend/internal/repository/admin_content_anime_themes.go` L1875-1928 — List-Query mit COALESCE bestaetigt Root Cause
- Direkt gelesen: `backend/internal/handlers/admin_content_fansub_releases_test.go` — Source-Text-Pruefungs-Pattern bestaetigt

### Secondary (MEDIUM confidence)
- Inference: Keine DB-Transaktion noetig (beide Repos arbeiten unabhaengig, Rollback via DeleteMediaAsset ist das Projekt-Pattern)

## Metadata

**Confidence breakdown:**
- Root cause: HIGH — durch List-Query und fehlendem INSERT im Handler direkt verifiziert
- Fix-Signatur (InsertMediaFile): HIGH — exakt aus createMediaFileV2 abgeleitet
- Fehlerbehandlungs-Empfehlung (Rollback): HIGH — bestehende Handler zeigen das Pattern explizit
- Test-Strategie: HIGH — source-text pattern bestaetigt durch bestehende Testdatei

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stabiles Go-Backend, kein Schema-Change)
