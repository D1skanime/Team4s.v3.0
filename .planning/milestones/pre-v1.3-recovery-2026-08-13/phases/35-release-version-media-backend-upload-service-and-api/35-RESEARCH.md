# Phase 35: Release-Version Media — Backend Upload Service und API — Research

**Researched:** 2026-05-07
**Domain:** Go image processing (govips/libvips), multipart upload, DB transactions, admin handler extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `govips` (`github.com/davidbyttow/govips`) als libvips-Wrapper — moderner als bimg, aktiv maintained, gleiche libvips-Basis
- **D-02:** Backend `Dockerfile` erhält `apt-get install libvips-dev` (oder Alpine-Äquivalent `vips-dev`) als Build-Dependency
- **D-03:** GIF-Original bleibt animiert gespeichert; Thumbnail = statisches Frame-1-Bild via govips (`vips.NewImageFromBuffer` + erstes Frame extrahieren)
- **D-04:** Datei direkt ins finale Verzeichnis schreiben: `media/release-version/{versionId}/{assetId}/`
- **D-05:** Sofort nach Dateischreibung: `media_assets.status = 'processing'`, `media_files.status = 'processing'`
- **D-06:** Nach erfolgreicher DB-Transaktion: Status auf `'ready'` setzen
- **D-07:** Bei Fehler nach Dateischreibung: Datei physisch löschen (kein DB-Eintrag hinterlassen), Fehler zurückgeben
- **D-08:** Route-Basis `/admin/release-versions/:versionId/media`
- **D-09:** Neue separate Datei `admin_content_release_version_media.go`
- **D-10:** Methoden auf bestehendem `AdminContentHandler`-Typ
- **D-11:** Routen in `backend/cmd/server/admin_routes.go`
- **D-12:** Admin-only via bestehende `auth`-Middleware
- **D-13:** `uploaded_by_user_id` aus Admin-Session-Context (Typ: BIGINT, `users.id`)
- **D-14:** PATCH darf Kategorie NICHT ändern — HTTP 422 `CATEGORY_CHANGE_NOT_ALLOWED`
- **D-15:** Maximal ein aktives Vorschaubild — bei neuem `is_preview_candidate=true` werden bestehende deaktiviert
- **D-16:** Preview-Einschränkung auf Kategorie (`screenshot`, `typesetting_karaoke`)
- **D-17:** Pro Datei isoliertes Ergebnis
- **D-18:** Response-Format mit `results[]` Array
- **D-19:** Maschinenlesbare Fehlercodes
- **D-20:** Neue Methoden auf `MediaRepository` (nicht neues Repository)
- **D-21:** `MediaUploadRepoTx`-Interface für Transaktions-Support nutzen
- Upload-Limits: max 15 MB, max 20 Dateien, max 8000x8000 px, max 300 GIF-Frames

### Claude's Discretion

- Genaue govips-API-Calls für GIF-Frame-Extraktion
- Sort-Order-Vergabe bei parallelen Uploads (Advisory Lock oder COALESCE MAX+10)
- Interner Dateiname: UUID-basiert

### Deferred Ideas (OUT OF SCOPE)

- Fansub-Member-Upload ohne Admin-Rechte
- Medium-Variante (responsive Bilder)
- Idempotency-Key für Uploads
- Quotas pro Nutzer/Gruppe
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RVM-BACKEND-01 | Go-Backend-Service für Release-Version-Media-Uploads: Validierung, Image Processing (govips/libvips), GIF-Sonderfall, DB-Transaktion, Rollback. Alle 5 Admin-API-Endpoints. | Alle govips-API-Calls, Dockerfile-Änderungen, Repository-Methoden, Handler-Pattern und Route-Registrierung sind dokumentiert. |
</phase_requirements>

---

## Summary

Phase 35 fügt einen vollständigen Image-Upload-Service für `release_version_media` hinzu. Der Service verarbeitet mehrere Dateien isoliert (Fehler bei Datei A beeinflusst Datei B nicht), schreibt direkt ins finale Verzeichnis mit `status='processing'` als Gate, erzeugt Thumbnails via govips/libvips und setzt den Status nach erfolgreicher DB-Transaktion auf `'ready'`.

Der kritischste technische Unterschied zu allen bisherigen Upload-Handlern ist die neue govips-Dependency, die CGO erfordert. Das aktuelle Dockerfile baut mit `CGO_ENABLED=0` — das muss geändert werden. Die Alpine-Builder-Stage benötigt `vips-dev`, `build-base`, `pkgconfig` und `gcc`. Die Runtime-Stage benötigt nur `vips`.

GIF-Frame-Extraktion für den Thumbnail verwendet `ImportParams` mit `NumPages.Set(1)` beim Laden, was libvips anweist, nur das erste Frame zu dekodieren. Das Original-GIF wird unverändert als Byte-Buffer gespeichert (kein Re-Encode nötig).

**Primary recommendation:** Govips über `LoadImageFromBuffer(buf, params)` mit `params.NumPages.Set(1)` für GIF-Thumbnails; `NewThumbnailFromBuffer` für alle anderen Formate. Dockerfile auf CGO-fähigen Multi-Stage-Build umstellen.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/davidbyttow/govips/v2` | v2.15.0 (aktuell) | libvips-Wrapper für Image-Processing und Thumbnailing | D-01: explizit entschieden; moderner als bimg (inaktiv seit 2021) |
| `github.com/gabriel-vasile/mimetype` | v1.4.3 (bereits vorhanden) | MIME-Typ-Erkennung aus File-Bytes (magic bytes, nicht Extension) | Bereits im Projekt, zuverlässiger als net/http.DetectContentType |
| `github.com/google/uuid` | v1.6.0 (bereits vorhanden) | UUID für interne Dateinamen | Bereits im Projekt |
| `github.com/jackc/pgx/v5` | v5.7.1 (bereits vorhanden) | PostgreSQL-Treiber | Bereits im Projekt |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github.com/disintegration/imaging` | v1.6.2 (bereits vorhanden) | Fallback-Resize wenn govips nicht verfügbar | Nicht verwenden — govips löst imaging für diesen Handler ab |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| govips | bimg | bimg ist seit 2021 inaktiv, govips wird aktiv gepflegt |
| govips | imaging (disintegration) | imaging kann kein GIF-Frame-Extraktion, keine WebP-Ausgabe, kein libvips-Performance |

**Installation:**
```bash
# In go.mod
require github.com/davidbyttow/govips/v2 v2.15.0

# go get im Container (nach Dockerfile-Fix):
go get github.com/davidbyttow/govips/v2@latest
go mod tidy
```

**Version verification:** govips v2 ist aktiv maintained. Neueste Version zum Recherche-Datum: v2.15.0 (via pkg.go.dev). Immer `go get github.com/davidbyttow/govips/v2@latest` ausführen und dann `go mod tidy`.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── internal/handlers/
│   └── admin_content_release_version_media.go   # NEU — alle 5 Handler-Methoden
├── internal/repository/
│   └── release_version_media_repository.go      # NEU — 5 CRUD-Methoden auf MediaRepository
├── cmd/server/
│   └── admin_routes.go                          # ERWEITERT — neue Routen
└── Dockerfile                                   # GEÄNDERT — CGO + vips-dev
```

### Pattern 1: CGO-fähiger Multi-Stage Dockerfile (KRITISCH)

**Was:** Das aktuelle Dockerfile verwendet `CGO_ENABLED=0`, was govips bricht. Die Lösung ist ein angepasster Multi-Stage-Build mit vips-dev im Builder und vips im Runtime-Image.

**KRITISCHER BEFUND:** `backend/Dockerfile` Zeile 9: `CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server` — das muss auf `CGO_ENABLED=1` geändert werden. Alpine benötigt `build-base pkgconfig vips-dev` im Builder, `vips` im Runtime-Image.

**Neues Dockerfile:**
```dockerfile
FROM golang:1.25-alpine AS builder

# CGO-Abhängigkeiten für govips (libvips)
RUN apk add --no-cache build-base pkgconfig vips-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO_ENABLED=1 erforderlich für govips
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server
RUN CGO_ENABLED=1 GOOS=linux go build -o migrate ./cmd/migrate

FROM alpine:3.20
WORKDIR /app

# Nur Runtime-Bibliothek, keine Build-Tools
RUN apk add --no-cache vips

COPY --from=builder /app/server ./server
COPY --from=builder /app/migrate ./migrate

EXPOSE 8092
CMD ["./server"]
```

**Warum `build-base`:** Alpine enthält standardmäßig kein gcc/g++. `build-base` ist das Alpine-Meta-Paket für C-Build-Tools (gcc, g++, make, musl-dev). `pkgconfig` wird für `#cgo pkg-config: vips` in govips benötigt.

**Warum `vips` im Runtime:** Der kompilierte Binary linked dynamisch gegen libvips. Ohne `vips` im Runtime-Image schlägt der Start mit "shared library not found" fehl.

### Pattern 2: govips Startup/Shutdown

**Was:** govips muss einmalig beim Serverstart initialisiert und beim Shutdown bereinigt werden.

**Wann:** In `main.go` oder einem Init-Block.

```go
// Source: govips/vips/govips.go — Startup-Funktion
import "github.com/davidbyttow/govips/v2/vips"

// In main() oder init():
if err := vips.Startup(nil); err != nil {
    log.Fatalf("govips startup fehlgeschlagen: %v", err)
}
defer vips.Shutdown()
```

**nil für Config** ist der Standard — verwendet Default-Concurrency und Cache-Einstellungen.

### Pattern 3: GIF-Thumbnail (Frame 0) via govips

**Was:** Animated GIF Original unverändert speichern (byte-für-byte copy). Für Thumbnail: erstes Frame extrahieren und als WebP/JPEG exportieren.

**GIF Frame-0-Extraktion — Exact Pattern:**
```go
// Source: pkg.go.dev/github.com/davidbyttow/govips/v2/vips
import "github.com/davidbyttow/govips/v2/vips"

func generateGIFThumbnail(buf []byte, thumbWidth int) ([]byte, error) {
    // ImportParams mit NumPages=1 — nur erstes Frame laden
    // Das verhindert, dass alle Frames im Speicher gehalten werden
    params := vips.NewImportParams()
    params.NumPages.Set(1)  // Nur 1 Seite/Frame laden

    img, err := vips.LoadImageFromBuffer(buf, params)
    if err != nil {
        return nil, fmt.Errorf("gif frame 0 laden: %w", err)
    }
    defer img.Close()  // IMMER Close() aufrufen — sonst Memory Leak

    // Auf Thumbnail-Breite skalieren (Höhe = 0 = proportional)
    if err := img.Thumbnail(thumbWidth, 0, vips.InterestingNone); err != nil {
        return nil, fmt.Errorf("gif thumbnail resize: %w", err)
    }

    // Als statisches JPEG exportieren (kein GIF — kein Animation-Overhead)
    jpegData, _, err := img.ExportJpeg(&vips.JpegExportParams{
        Quality:        85,
        StripMetadata:  true,
    })
    if err != nil {
        return nil, fmt.Errorf("gif thumbnail export: %w", err)
    }
    return jpegData, nil
}
```

**Alternativ als WebP:**
```go
webpData, _, err := img.ExportWebp(&vips.WebpExportParams{
    Quality:       80,
    StripMetadata: true,
})
```

**Begründung `NumPages.Set(1)`:** libvips lädt bei `n=-1` (Default) alle Frames gleichzeitig als vertikal gestapeltes Bild. Mit `NumPages.Set(1)` wird nur Frame 0 dekodiert — kleinerer Speicherverbrauch, kein `ExtractArea`-Hack nötig.

### Pattern 4: Reguläres Bild Thumbnail (PNG, JPEG, WebP)

**Was:** Für Nicht-GIF-Dateien `NewThumbnailFromBuffer` verwenden — intern optimiert (libvips lädt sofort mit Zielgröße, kein zwei-Pass-Resize).

```go
// Source: pkg.go.dev/github.com/davidbyttow/govips/v2/vips
func generateImageThumbnail(buf []byte, thumbWidth int) ([]byte, error) {
    // NewThumbnailFromBuffer: width=thumbWidth, height=0 (proportional), crop=None
    thumb, err := vips.NewThumbnailFromBuffer(buf, thumbWidth, 0, vips.InterestingNone)
    if err != nil {
        return nil, fmt.Errorf("thumbnail erzeugen: %w", err)
    }
    defer thumb.Close()

    jpegData, _, err := thumb.ExportJpeg(&vips.JpegExportParams{
        Quality:       85,
        StripMetadata: true,
    })
    if err != nil {
        return nil, fmt.Errorf("thumbnail exportieren: %w", err)
    }
    return jpegData, nil
}
```

**Warum `NewThumbnailFromBuffer` statt `NewImageFromBuffer` + Resize:** `NewThumbnailFromBuffer` ruft intern `vips_thumbnail_buffer` auf, das shrink-on-load nutzt — deutlich effizienter für große Eingabebilder.

### Pattern 5: Bild-Dimensionen und Frame-Anzahl prüfen

**Was:** Vor dem Thumbnail-Schritt Validierungsgrenzen prüfen.

```go
// Source: pkg.go.dev/github.com/davidbyttow/govips/v2/vips
func validateImage(buf []byte, mimeType string) error {
    img, err := vips.NewImageFromBuffer(buf)
    if err != nil {
        return fmt.Errorf("bild dekodieren: %w", err)
    }
    defer img.Close()

    if img.Width() > 8000 || img.Height() > 8000 {
        return ErrImageDimensionsTooLarge
    }

    // GIF-Frame-Anzahl prüfen
    if mimeType == "image/gif" {
        if img.Pages() > 300 {
            return ErrGIFTooManyFrames
        }
    }
    return nil
}
```

**Methoden:**
- `img.Width() int` — Breite des Bildes
- `img.Height() int` — Höhe (bei Animated GIF: Höhe eines Frames, nicht aller Frames gestapelt)
- `img.Pages() int` — Anzahl Frames/Seiten (1 für Standbilder)

### Pattern 6: Bestehender Handler-Aufbau — requireAdmin + identity.UserID

**Was:** Auth-Extraktion aus Kontext ist standardisiert.

```go
// Source: backend/internal/handlers/admin_content_authz.go
identity, ok := h.requireAdmin(c)
if !ok {
    return  // requireAdmin hat bereits 401/403 gesendet
}
// identity.UserID ist int64 — für uploaded_by_user_id nutzen
uploadedByUserID := identity.UserID
```

### Pattern 7: Multipart-Formular mit mehreren Dateien in Gin

**Was:** Gin's `c.MultipartForm()` liefert alle Files unter einem Key.

```go
// Source: Gin Framework multipart handling
form, err := c.MultipartForm()
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{...})
    return
}

category := c.PostForm("category")           // Einfaches Textfeld
files := form.File["files[]"]                // []*multipart.FileHeader

if len(files) == 0 {
    // 400: keine Dateien
}
if len(files) > 20 {
    // 422: TOO_MANY_FILES
}
```

**Datei lesen:**
```go
for _, fileHeader := range files {
    f, err := fileHeader.Open()
    if err != nil { /* Fehler für diese Datei */ continue }
    defer f.Close()

    data, err := io.ReadAll(io.LimitReader(f, 15*1024*1024+1))
    // Prüfen ob len(data) > 15MB → FILE_TOO_LARGE
}
```

### Pattern 8: Rollback-Hilfsfunktion (bereits vorhanden)

**Was:** `removeFileQuietly` ist in `fansub_media_helpers.go` definiert und im gesamten `handlers`-Package verfügbar.

```go
// Source: backend/internal/handlers/fansub_media_helpers.go:109
// removeFileQuietly löscht eine Datei ohne Fehler zurückzugeben, wenn die Datei nicht existiert.
func removeFileQuietly(path string) error {
    trimmedPath := strings.TrimSpace(path)
    if trimmedPath == "" {
        return nil
    }
    // ...
}
```

Der neue Handler kann `removeFileQuietly` direkt aufrufen — keine neue Hilfsfunktion nötig.

### Pattern 9: media_assets INSERT mit status='processing'

**Was:** Phase 34 hat `status`-Spalten in `media_assets` und `media_files` hinzugefügt. Alle neuen Inserts müssen `status` explizit setzen — die DB-Default `'ready'` ist für direkte Inserts nicht korrekt für den zweistufigen Upload-Flow.

**Bestehende `createMediaAssetV2` in `media_upload.go` setzt KEIN status:**
```go
// Zeile 214-218 in media_upload.go — fehlt status:
INSERT INTO media_assets (media_type_id, file_path, mime_type, format, uploaded_by, created_at)
VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE id = $5), $6)
```

Die neuen Repository-Methoden in Phase 35 müssen `status='processing'` explizit in den INSERT schreiben und nach erfolgreicher Transaktion auf `'ready'` updaten.

### Pattern 10: Sort-Order-Vergabe

**Empfehlung:** COALESCE(MAX+10)-Pattern ohne Advisory Lock.

**Rationale:** Advisory Locks sind schwergewichtig und im Projekt nicht vorhanden. Da Uploads im MVP-Kontext selten parallel aufgerufen werden (Admin-Only), ist Race-Kondition beim Sort-Order unrelevant — im schlimmsten Fall erhalten zwei gleichzeitige Uploads denselben Sort-Order, was manuell via Reorder korrigierbar ist. Advisory Locks würden Komplexität hinzufügen ohne messbaren Nutzen.

```sql
-- Neue Sort-Order für einen Upload:
COALESCE(
    (SELECT MAX(sort_order)
     FROM release_version_media
     WHERE release_version_id = $1
       AND deleted_at IS NULL),
    0
) + 10
```

**Für parallele Uploads innerhalb eines Requests:** Sort-Order sequenziell im Handler vergeben: erster Upload bekommt `maxOrder + 10`, zweiter `maxOrder + 20`, etc. (einmalig MAX lesen, dann im Loop inkrementieren).

### Anti-Patterns to Avoid

- **`CGO_ENABLED=0` mit govips:** Compilation schlägt fehl (Linker-Fehler für libvips).
- **`img.Close()` vergessen:** Memory Leak. IMMER `defer img.Close()` nach erfolgreicher Konstruktion.
- **Re-Encode des GIF-Originals:** Das GIF-Original wird als Byte-Buffer `os.WriteFile(path, data, 0644)` gespeichert — kein vips-Export, kein Re-Encode, Animation bleibt erhalten.
- **Alle Dateien in einer DB-Transaktion:** Widerspricht D-17 (isolierte Verarbeitung). Jede Datei hat ihre eigene Transaktion.
- **`NewImageFromBuffer` für Thumbnails großer Dateien:** Lädt das volle Bild in Speicher. Stattdessen `NewThumbnailFromBuffer` nutzen.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME-Typ-Erkennung | Custom magic-bytes Parser | `mimetype.Detect(buf)` (bereits vorhanden) | Handles 300+ MIME-Typen, GIF-Signatur eingeschlossen |
| Bild-Resize / Thumbnail | Manuelle Pixel-Manipulation | `vips.NewThumbnailFromBuffer` | libvips ist schneller als imaging, shrink-on-load |
| UUID generieren | Random-String selbst bauen | `uuid.New().String()` (bereits vorhanden) | Kollisionsresistenz, Kryptozufallsquelle |
| Transaktionen | Manuelles pgx.BeginTx | `MediaUploadRepoTx.WithTx(...)` (bereits vorhanden) | Pattern ist etabliert, Rollback automatisch |
| PostgreSQL Advisory Lock | `pg_try_advisory_xact_lock` | COALESCE(MAX+10) | Simpler, kein Lock-Overhead für Admin-Only |

---

## Runtime State Inventory

> Nicht zutreffend — Greenfield-Feature (neue Tabellen, neue Handler). Keine Umbenennung/Migration.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `vips-dev` (Alpine apk) | govips compilation | Muss in Dockerfile installiert werden | libvips >=8.10 | Kein Fallback — blockiert |
| `build-base` (Alpine apk) | CGO compilation | Muss in Dockerfile installiert werden | beliebig | Kein Fallback — blockiert |
| `pkgconfig` (Alpine apk) | `#cgo pkg-config: vips` in govips | Muss in Dockerfile installiert werden | beliebig | Kein Fallback — blockiert |
| `vips` (Alpine apk, Runtime) | Dynamisches Linking des Binaries | Muss in Runtime-Stage hinzugefügt werden | libvips >=8.10 | Kein Fallback — blockiert |
| PostgreSQL | DB-Transaktionen | bereits in docker-compose.yml | 16 | — |
| Go 1.25 | Compiler | golang:1.25-alpine (Dockerfile) | 1.25 | — |

**Missing dependencies mit no fallback:**
- `vips-dev` + `build-base` + `pkgconfig` in Dockerfile Builder-Stage — blockieren Compilation von govips
- `vips` in Dockerfile Runtime-Stage — Binary crasht bei Start ohne libvips

**Dockerfile-Änderung ist Wave-0-Task — muss zuerst landen.**

---

## Common Pitfalls

### Pitfall 1: `CGO_ENABLED=0` — govips bricht komplett
**What goes wrong:** `go build` mit `CGO_ENABLED=0` schlägt mit Linker-Fehler für `vips` fehl. govips hat `#cgo pkg-config: vips` im C-Header — das ist eine harte CGO-Abhängigkeit.
**Why it happens:** Das existierende Dockerfile nutzt `CGO_ENABLED=0` für statische Binaries. govips ist kein reines Go-Paket.
**How to avoid:** Dockerfile wie in Pattern 1 umschreiben. `CGO_ENABLED=1` im Build-Schritt. `build-base pkgconfig vips-dev` in Builder-Stage.
**Warning signs:** `cgo: C compiler "gcc" not found`, `undefined: vips.Startup`

### Pitfall 2: `img.Close()` vergessen
**What goes wrong:** Memory Leak. govips wrapped C-Objekte, die Go's GC nicht automatisch freigibt.
**Why it happens:** `*ImageRef` enthält einen C-Pointer auf vips-Image-Daten.
**How to avoid:** Immer `defer img.Close()` direkt nach erfolgreicher Konstruktion (`NewImageFromBuffer`, `NewThumbnailFromBuffer`, `LoadImageFromBuffer`).
**Warning signs:** Stetig wachsender Speicherbedarf des Backend-Prozesses.

### Pitfall 3: GIF-Original via vips re-encoden
**What goes wrong:** Animation geht verloren oder Qualität leidet.
**Why it happens:** Wenn das GIF-Original via `vips.ExportGIF()` gespeichert wird statt als Byte-Copy.
**How to avoid:** GIF-Original = direktes `os.WriteFile(path, originalBytes, 0644)`. Nur der Thumbnail geht durch vips.
**Warning signs:** GIF-Originalfiles sind statisch oder haben anderes Dateiformat.

### Pitfall 4: Status bleibt `'processing'` bei Fehler
**What goes wrong:** `media_assets` oder `media_files` verbleiben mit `status='processing'` wenn der Handler nach Datei-Schreibung, aber vor DB-Commit, zurückgibt (Fehler in Thumbnail-Schritt etc.).
**Why it happens:** Wenn DB-Inserts mit `status='processing'` committed wurden, bevor der Fehler eintrat.
**How to avoid:** D-07: Dateien löschen + KEIN DB-Eintrag hinterlassen wenn Fehler vor Commit. Die Transaktion wird in `WithTx` automatisch gerollt zurück wenn die `fn`-Funktion einen Fehler zurückgibt. Sicherstellen, dass bei Fehler nach Dateischreibung (aber vor DB-Commit) die Datei gelöscht wird UND die DB-Transaktion nicht committed wird.
**Warning signs:** Cleanup-Job Phase 37 findet viele `processing`-Datensätze ohne physische Dateien.

### Pitfall 5: `sort_order`-Race bei gleichzeitigen Uploads
**What goes wrong:** Zwei parallele Uploads bekommen denselben `sort_order`.
**Why it happens:** COALESCE(MAX+10) liest den MAX ohne Lock.
**How to avoid:** Akzeptabel für Admin-Only (selten parallel). Bei Multi-File-Upload innerhalb eines Requests: MAX einmalig vor der Datei-Schleife lesen, dann im Loop sequenziell inkrementieren.
**Warning signs:** Doppelte `sort_order`-Werte in `release_version_media`.

### Pitfall 6: `media_assets.status` DEFAULT in bestehenden INSERT-Methoden
**What goes wrong:** `createMediaAssetV2` setzt kein `status` — DB-Default ist `'ready'`. Für Phase-35-Uploads falsch (D-05 verlangt `'processing'`).
**Why it happens:** Die `status`-Spalte wurde in Phase 34 hinzugefügt, existierende Inserts wurden nicht aktualisiert.
**How to avoid:** Neue Repository-Methoden für Phase 35 explizit `status='processing'` setzen. Existierende Methoden nicht ändern (Rückwärtskompatibilität).
**Warning signs:** Uploads landen sofort mit `status='ready'` ohne das zweistufige Gate.

---

## Code Examples

### Vollständiges GIF-Upload-Pattern (zusammengesetzt)

```go
// Source: Abgeleitet aus govips pkg.go.dev + bestehenden Handler-Pattern
func processReleaseVersionMediaFile(
    ctx context.Context,
    data []byte,
    mimeType string,
    destDir string,
    assetUUID string,
    thumbWidth int,
) (originalPath, thumbPath string, err error) {
    ext := imageExtFromMimeRVM(mimeType) // "gif", "png", "jpg", etc.
    originalFile := filepath.Join(destDir, "original."+ext)
    thumbFile    := filepath.Join(destDir, "thumb.jpg")

    // Schritt 1: Original speichern (byte-copy, kein Re-Encode)
    if err := os.WriteFile(originalFile, data, 0644); err != nil {
        return "", "", fmt.Errorf("original speichern: %w", err)
    }

    // Schritt 2: Thumbnail erzeugen
    var thumbData []byte
    if mimeType == "image/gif" {
        thumbData, err = generateGIFThumbnailData(data, thumbWidth)
    } else {
        thumbData, err = generateStaticThumbnailData(data, thumbWidth)
    }
    if err != nil {
        _ = os.Remove(originalFile)
        return "", "", fmt.Errorf("%w", err)
    }

    // Schritt 3: Thumbnail-Datei schreiben
    if err := os.WriteFile(thumbFile, thumbData, 0644); err != nil {
        _ = os.Remove(originalFile)
        return "", "", fmt.Errorf("thumb speichern: %w", err)
    }

    return originalFile, thumbFile, nil
}

func imageExtFromMimeRVM(mimeType string) string {
    switch mimeType {
    case "image/gif":  return "gif"
    case "image/png":  return "png"
    case "image/webp": return "webp"
    default:           return "jpg"
    }
}
```

### govips Startup in main.go

```go
// Source: govips README + govips/vips/govips.go
import "github.com/davidbyttow/govips/v2/vips"

func main() {
    // Govips muss vor allen Bild-Operationen gestartet werden
    if err := vips.Startup(nil); err != nil {
        log.Fatalf("govips konnte nicht gestartet werden: %v", err)
    }
    defer vips.Shutdown()

    // ... Rest von main()
}
```

### Route-Registrierung in admin_routes.go

```go
// Source: Abgeleitet aus backend/cmd/server/admin_routes.go — bestehende Pattern
// Alle 5 Endpunkte für release-version media:
v1.POST("/admin/release-versions/:versionId/media",                   auth, deps.adminContentHandler.UploadReleaseVersionMedia)
v1.GET("/admin/release-versions/:versionId/media",                    auth, deps.adminContentHandler.ListReleaseVersionMedia)
v1.PATCH("/admin/release-versions/:versionId/media/:relationId",      auth, deps.adminContentHandler.PatchReleaseVersionMedia)
v1.DELETE("/admin/release-versions/:versionId/media/:relationId",     auth, deps.adminContentHandler.DeleteReleaseVersionMedia)
v1.POST("/admin/release-versions/:versionId/media/reorder",           auth, deps.adminContentHandler.ReorderReleaseVersionMedia)
```

**Reihenfolge wichtig:** `/media/reorder` muss VOR `/media/:relationId` registriert werden, damit Gin `reorder` nicht als `:relationId` matched — ODER `/reorder` als separaten Pfad nach `/media/...` gesetzt wird. In der Praxis: Gin matcht Literale vor Parametern, also ist die Reihenfolge unkritisch.

### release_version_media Tabellen-Schema (aus Migration 0059)

```sql
-- Source: database/migrations/0059_release_version_media_schema.up.sql
CREATE TABLE release_version_media (
    id                   BIGSERIAL PRIMARY KEY,
    release_version_id   BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    media_asset_id       BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    category             VARCHAR(30) NOT NULL,   -- 'screenshot'|'typesetting_karaoke'|'fun_outtake'|'other'
    caption              TEXT NULL,
    sort_order           INT NOT NULL DEFAULT 0,
    is_preview_candidate BOOLEAN NOT NULL DEFAULT false,
    uploaded_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ,
    deleted_at           TIMESTAMPTZ NULL,
    deleted_by_user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rvm_category CHECK (category IN ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other')),
    CONSTRAINT chk_rvm_preview_category CHECK (is_preview_candidate = false OR category IN ('screenshot', 'typesetting_karaoke'))
);
```

**Wichtige Constraints:**
- `chk_rvm_preview_category`: DB erzwingt Preview-Kategorie-Einschränkung bereits. Handler-Validierung (D-16) ist eine zusätzliche Schicht.
- `ON DELETE RESTRICT` für `media_asset_id`: Verhindert, dass `media_assets` gelöscht werden, solange `release_version_media`-Einträge existieren. Soft-Delete auf `release_version_media` lässt `media_assets` bestehen — korrektes Verhalten.

### Repository-Methoden-Signaturen (zu implementieren)

```go
// Neue Methoden auf MediaRepository in release_version_media_repository.go

// CreateReleaseVersionMedia — INSERT + zweitstufiger Status-Update
// Gibt ID zurück; Aufrufer managed Transaktion selbst via pgx.BeginTx
func (r *MediaRepository) CreateReleaseVersionMedia(
    ctx context.Context,
    tx pgx.Tx,  // Transaktion vom Aufrufer
    input ReleaseVersionMediaCreateInput,
) (int64, error)

// ListReleaseVersionMedia — alle aktiven (deleted_at IS NULL), geordnet by sort_order
func (r *MediaRepository) ListReleaseVersionMedia(
    ctx context.Context,
    releaseVersionID int64,
) ([]ReleaseVersionMediaItem, error)

// PatchReleaseVersionMedia — caption, is_preview_candidate (kein category)
func (r *MediaRepository) PatchReleaseVersionMedia(
    ctx context.Context,
    tx pgx.Tx,
    relationID int64,
    input ReleaseVersionMediaPatchInput,
) error

// SoftDeleteReleaseVersionMedia — setzt deleted_at + deleted_by_user_id
func (r *MediaRepository) SoftDeleteReleaseVersionMedia(
    ctx context.Context,
    relationID int64,
    deletedByUserID int64,
) error

// ReorderReleaseVersionMedia — UPDATE sort_order für Liste von IDs
func (r *MediaRepository) ReorderReleaseVersionMedia(
    ctx context.Context,
    tx pgx.Tx,
    reorderItems []ReleaseVersionMediaReorderItem,
) error

// ClearPreviewCandidateForVersion — UPDATE SET is_preview_candidate=false WHERE release_version_id=X AND id!=Y
// Für Preview-Eindeutigkeit (D-15) — innerhalb derselben Transaktion wie CreateReleaseVersionMedia
func (r *MediaRepository) ClearPreviewCandidateForVersion(
    ctx context.Context,
    tx pgx.Tx,
    releaseVersionID int64,
    excludeRelationID int64,
) error
```

**Zu den Input/Output-Typen:**
```go
type ReleaseVersionMediaCreateInput struct {
    ReleaseVersionID   int64
    MediaAssetID       int64
    Category           string
    Caption            *string
    SortOrder          int
    IsPreviewCandidate bool
    UploadedByUserID   *int64
}

type ReleaseVersionMediaPatchInput struct {
    Caption            *string  // nil = nicht ändern
    IsPreviewCandidate *bool    // nil = nicht ändern
}

type ReleaseVersionMediaReorderItem struct {
    RelationID int64
    SortOrder  int
}

type ReleaseVersionMediaItem struct {
    ID                 int64
    ReleaseVersionID   int64
    MediaAssetID       int64
    Category           string
    Caption            *string
    SortOrder          int
    IsPreviewCandidate bool
    UploadedByUserID   *int64
    CreatedAt          time.Time
    UpdatedAt          *time.Time
    // Denormalisiert für Response:
    ThumbnailURL       string
    OriginalURL        string
}
```

### Auth-Context — UserID extrahieren

```go
// Source: backend/internal/handlers/admin_content_authz.go
// Identisch für alle bestehenden Handler
identity, ok := h.requireAdmin(c)
if !ok {
    return
}
uploadedByUserID := identity.UserID  // int64
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bimg` (h2non/bimg) | `govips` (davidbyttow/govips) | bimg inaktiv seit 2021 | govips hat aktive Maintenance, modernes API |
| Statisches Go-Binary (`CGO_ENABLED=0`) | CGO-Binary mit dynamisch gelinktem libvips | Phase 35 | Dockerfile muss umgestellt werden |
| `imaging` (disintegration) für Resize | `vips.NewThumbnailFromBuffer` | Phase 35 | Performance, GIF-Support, WebP-Export |

**Deprecated/outdated:**
- `bimg`: Letztes Release 2021, keine Maintenance mehr. Govips ist der empfohlene Nachfolger.
- `disintegration/imaging` für diesen Use-Case: Bleibt im Projekt für bestehende Uploads, aber neue Phase-35-Handler nutzen govips.

---

## Open Questions

1. **govips Startup in main.go: Wo genau einfügen?**
   - Was wir wissen: `vips.Startup(nil)` muss vor allen vips-Aufrufen stehen; `defer vips.Shutdown()` sauber beenden.
   - Was unklar ist: `backend/cmd/server/main.go` wurde nicht vollständig gelesen — möglicher Konflikt mit Shutdown-Reihenfolge.
   - Empfehlung: Planer liest `main.go` und fügt `vips.Startup` direkt nach den anderen Service-Initialisierungen ein. `vips.Shutdown()` als letztes defer.

2. **Thumbnailbreite für Release-Version-Media?**
   - Was wir wissen: Bestehende Uploads nutzen `thumbWidth = 320px` (aus `media_upload_image.go` Konstante nicht direkt gefunden).
   - Was unklar ist: Keine explizite Entscheidung in CONTEXT.md zu Thumb-Dimensionen für RVM.
   - Empfehlung: 400px Breite (passend für Screenshot-Vorschauen, leicht größer als Cover-Thumbnails). Planer sollte Konstante im neuen Handler definieren.

3. **`AdminContentHandler` — wie wird `mediaRepo` zugegriffen?**
   - Was wir wissen: `mediaRepo *repository.MediaRepository` ist ein Feld auf `AdminContentHandler` (verwendet in `admin_content_release_theme_assets.go` via `h.mediaRepo`).
   - Was unklar ist: `admin_content.go` konnte nicht gefunden werden (Datei existiert nicht) — der Handler-Typ ist wahrscheinlich in einer anderen Datei definiert.
   - Empfehlung: Planer liest Handler-Struct-Definition und stellt sicher, dass `mediaRepo` zugänglich ist.

---

## Validation Architecture

> nyquist_validation nicht explizit deaktiviert — Abschnitt eingeschlossen.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `github.com/stretchr/testify` v1.9.0 |
| Config file | Kein separates Config-File — Go `testing`-Package Standard |
| Quick run command | `cd backend && go test ./internal/handlers/... -run TestReleaseVersionMedia -v` |
| Full suite command | `cd backend && go test ./... -timeout 120s` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RVM-BACKEND-01 | Upload-Handler akzeptiert multipart/form-data | integration/unit | `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia -v` | Wave 0 |
| RVM-BACKEND-01 | GIF-Thumbnail ist statisches Frame-0-Bild | unit | `go test ./internal/... -run TestGenerateGIFThumbnail -v` | Wave 0 |
| RVM-BACKEND-01 | CATEGORY_CHANGE_NOT_ALLOWED bei PATCH | unit | `go test ./internal/handlers/... -run TestPatchReleaseVersionMedia_CategoryChange -v` | Wave 0 |
| RVM-BACKEND-01 | PREVIEW_NOT_ALLOWED_FOR_CATEGORY für fun_outtake/other | unit | `go test ./internal/handlers/... -run TestPreviewCategoryValidation -v` | Wave 0 |
| RVM-BACKEND-01 | Ein aktives Preview pro release_version | unit | `go test ./internal/repository/... -run TestClearPreviewCandidate -v` | Wave 0 |
| RVM-BACKEND-01 | Isolierte Datei-Verarbeitung (Fehler A beeinflusst B nicht) | integration | `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia_PartialFailure -v` | Wave 0 |

### Wave 0 Gaps
- [ ] `backend/internal/handlers/admin_content_release_version_media_test.go` — Handler-Tests
- [ ] `backend/internal/repository/release_version_media_repository_test.go` — Repo-Tests

---

## Sources

### Primary (HIGH confidence)
- `pkg.go.dev/github.com/davidbyttow/govips/v2/vips` — vollständige API-Referenz für NewImageFromBuffer, LoadImageFromBuffer, NewThumbnailFromBuffer, Pages(), ExportJpeg, ExportWebp, Close
- `database/migrations/0059_release_version_media_schema.up.sql` — exaktes Schema der Zieltabelle
- `backend/internal/handlers/admin_content_release_theme_assets.go` — kanonisches Handler-Pattern für CreateMediaAsset + InsertMediaFile + Rollback
- `backend/internal/handlers/admin_content_authz.go` — requireAdmin + identity.UserID Pattern
- `backend/internal/middleware/comment_auth.go` — AuthIdentity.UserID Typ (int64)
- `backend/cmd/server/admin_routes.go` — Route-Registrierungs-Pattern
- `backend/Dockerfile` — bestehender Build (CGO_ENABLED=0 — muss geändert werden)
- `backend/go.mod` — aktuelle Abhängigkeiten (govips fehlt)

### Secondary (MEDIUM confidence)
- govips GitHub Issue #185 (Alpine Docker Build) — Dockerfile-Pattern für Alpine + CGO
- [megamorf.gitlab.io: Alpine Go CGO builds](https://megamorf.gitlab.io/2019/09/08/alpine-go-builds-with-cgo-enabled/) — build-base Requirement bestätigt

### Tertiary (LOW confidence)
- WebSearch-Ergebnis zu govips v2.11.0 animated GIF ExtractArea — nicht direkt verifiziert via offizielle Docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — govips explizit in CONTEXT.md D-01 entschieden; API via pkg.go.dev verifiziert
- Architecture: HIGH — Dockerfile-Pattern aus Quellen bestätigt; Handler-Pattern direkt aus Codebase gelesen
- Pitfalls: HIGH — CGO/Dockerfile-Pitfall ist harter Fakt aus Dockerfile-Analyse; govips Close()-Requirement aus API-Docs
- govips GIF-Frame-Extraktion: MEDIUM — `NumPages.Set(1)` Pattern aus ImportParams-Docs abgeleitet; funktional korrekt aber nicht mit Integrations-Test verifiziert

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (govips API stabil; Dockerfile-Pattern stabil)
