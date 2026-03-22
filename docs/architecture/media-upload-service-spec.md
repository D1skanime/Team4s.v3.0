# Generic Media Upload Service Specification

**Status:** Planning (GSD-Reviewed)
**Created:** 2026-03-20
**Epic:** Media Upload Service
**Owner:** Team4s Orchestrator

---

## Overview

Ein einheitlicher Upload-Mechanismus fuer alle Bild- und Video-Typen. Ersetzt spezialisierte Endpoints.

### Ziele

- **Ein zentraler Endpoint:** `POST /api/admin/upload`
- **Generisch:** Keine hardcodierte Logik fuer einzelne Faelle
- **Einfach:** Go-native, kein separater Service

### Nicht-Ziele (Out of Scope)

- Separater Media-Service (YAGNI)
- Redis/Queue (YAGNI - sync reicht)
- Preview-Variante (nur thumb + original)
- MKV Support (nur MP4/WebM)
- HLS/Streaming

---

## API Contract

### Upload Endpoint

```
POST /api/admin/upload
Content-Type: multipart/form-data

Parameters:
- file          (required)  Bild- oder Videodatei
- entity_type   (required)  anime | episode | fansub | release | user | member
- entity_id     (required)  ID der Entitaet
- asset_type    (required)  poster | banner | logo | avatar | gallery | karaoke

Response:
{
  "id": "uuid",
  "status": "completed",
  "files": [
    { "variant": "original", "path": "/media/anime/123/poster/uuid/original.webp", "width": 1920, "height": 1080 },
    { "variant": "thumb", "path": "/media/anime/123/poster/uuid/thumb.webp", "width": 300, "height": 450 }
  ],
  "url": "/media/anime/123/poster/uuid/original.webp"
}
```

### Delete Endpoint

```
DELETE /api/admin/media/{id}

Response:
{
  "success": true
}
```

---

## Validierung

### Erlaubte Dateitypen

| Typ | MIME-Types | Extensions | Max Groesse |
|-----|------------|------------|-------------|
| Bild | image/jpeg, image/png, image/webp, image/gif | .jpg, .jpeg, .png, .webp, .gif | 50 MB |
| Video | video/mp4, video/webm | .mp4, .webm | 300 MB |

### Entity-Types

```
anime | episode | fansub | release | user | member
```

### Asset-Types

```
poster | banner | logo | avatar | gallery | karaoke
```

### Security-Pruefungen

1. Dateiendung gegen Whitelist
2. MIME-Type via Magic Bytes (nicht nur Header)
3. Dateigroesse gegen Limits

---

## Speicherstruktur

```
/media/{entity_type}/{entity_id}/{asset_type}/{uuid}/
    ├── original.webp    (oder .gif/.mp4/.webm)
    └── thumb.webp
```

### Beispiele

```
/media/anime/123/poster/a1b2c3/
    ├── original.webp
    └── thumb.webp

/media/release/789/karaoke/d4e5f6/
    ├── original.mp4
    └── thumb.webp
```

---

## Processing Rules

### Bilder

| Input | Output Original | Output Thumb |
|-------|-----------------|--------------|
| JPEG | WebP | WebP (300px breit) |
| PNG | WebP | WebP (300px breit) |
| WebP | WebP (copy) | WebP (300px breit) |
| GIF (statisch) | WebP | WebP (300px breit) |
| GIF (animiert) | GIF (copy) | WebP (1. Frame, 300px) |

### Videos

| Input | Output Original | Output Thumb |
|-------|-----------------|--------------|
| MP4 | MP4 (copy) | WebP (Frame bei 5s) |
| WebM | WebM (copy) | WebP (Frame bei 5s) |

**Kein Re-Encoding!** Original wird 1:1 gespeichert.

---

## Architektur (GSD)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend   │────>│  Go Backend      │────>│  Filesystem │
│  (Next.js)  │     │  + imaging/bimg  │     │  /media/... │
└─────────────┘     │  + FFmpeg CLI    │     └─────────────┘
                    └────────┬─────────┘
                             │
                             v
                    ┌─────────────┐
                    │  PostgreSQL │
                    └─────────────┘
```

### Komponenten

| Komponente | Technologie | Verantwortung |
|------------|-------------|---------------|
| Go Backend | Gin + imaging/bimg | Upload, Validierung, Image Processing, DB |
| FFmpeg | CLI (exec) | Video Thumbnail Extraktion |
| Nginx | Static Files | /media/ serving |

### Go Libraries

```go
// Option A: Pure Go (einfacher)
import "github.com/disintegration/imaging"

// Option B: libvips bindings (schneller)
import "github.com/h2non/bimg"

// WebP encoding
import "github.com/chai2010/webp"
```

---

## Datenbank-Schema

### Bestehende Tabellen (db-schema-v2.md)

```sql
MediaAsset
- id
- media_type_id      -- FK zu MediaType
- file_path          -- Basis-Pfad
- mime_type
- format             -- 'image' oder 'video'
- uploaded_by
- created_at

MediaFile
- id
- media_id           -- FK zu MediaAsset
- variant            -- 'original', 'thumb'
- path
- width
- height
- size

-- Join-Tabellen
AnimeMedia (anime_id, media_id, sort_order)
EpisodeMedia (episode_id, media_id, sort_order)
FansubGroupMedia (group_id, media_id)
ReleaseMedia (release_id, media_id, sort_order)
```

---

## Upload-Workflow

### Bild-Upload

```
1. POST /api/admin/upload
2. Go Backend:
   a. Validierung (MIME, Groesse, Extension)
   b. entity_type/entity_id pruefen
   c. UUID generieren
   d. imaging/bimg: Original zu WebP
   e. imaging/bimg: Thumbnail generieren
   f. Speichern nach /media/{...}/{uuid}/
   g. DB: MediaAsset + MediaFile + Join-Tabelle
   h. Response
```

### Video-Upload

```
1. POST /api/admin/upload
2. Go Backend:
   a. Validierung
   b. UUID generieren
   c. Original 1:1 kopieren nach /media/{...}/{uuid}/
   d. FFmpeg: Thumbnail extrahieren (Frame bei 5s)
   e. DB: MediaAsset + MediaFile + Join-Tabelle
   f. Response
```

**Alles synchron. Kein Queue.**

---

## Loeschen-Workflow

```
1. DELETE /api/admin/media/{id}
2. Go Backend:
   a. Join-Tabellen-Eintrag loeschen
   b. MediaFile-Eintraege loeschen
   c. MediaAsset loeschen
   d. UUID-Ordner loeschen (rm -rf)
```

---

## Fehlerbehandlung

| Fehler | HTTP Code | Response |
|--------|-----------|----------|
| Ungueltige Datei | 400 | `{"error": "invalid file type"}` |
| Datei zu gross | 413 | `{"error": "file too large", "max": "50MB"}` |
| Entity nicht gefunden | 404 | `{"error": "entity not found"}` |
| Processing-Fehler | 500 | `{"error": "processing failed"}` |

---

## Konfiguration

### Umgebungsvariablen

```env
MEDIA_BASE_PATH=/media
UPLOAD_MAX_IMAGE_SIZE=52428800    # 50 MB
UPLOAD_MAX_VIDEO_SIZE=314572800   # 300 MB
FFMPEG_PATH=/usr/bin/ffmpeg
```

### Nginx Config

```nginx
location /media/ {
    alias /var/www/team4s/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Migration bestehender Cover

### Aktueller Zustand

- Cover in `frontend/public/covers/`
- Hardcodierte Pfade

### Migration

1. Script: Dateien kopieren + DB-Eintraege erstellen
2. Frontend: `resolveCoverUrl()` auf `/media/` umstellen
3. Cleanup: Alte Dateien loeschen

---

## Referenzen

- [db-schema-v2.md](./db-schema-v2.md) - Datenbank-Schema
- [disintegration/imaging](https://github.com/disintegration/imaging) - Go Image Processing
- [h2non/bimg](https://github.com/h2non/bimg) - libvips Go bindings
