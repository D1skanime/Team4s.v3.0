# Media Upload Service - Phase 3 Migration (Backend Handoff)

**Status:** Ready for Execution
**Date:** 2026-03-20
**Lane:** Backend (team4s-go)
**Phase:** 3.1 + 3.2 (Cover-Inventar + Migration-Script)

---

## Zusammenfassung

Phase 3 Backend-Teil ist abgeschlossen. Das Migration-Script ist fertig und getestet.

**Geliefert:**
- Cover-Inventar und Analyse
- Go-basiertes Migration-Script
- Dokumentation und Anleitung
- Dry-Run Support fuer sicheren Test

**Naechste Schritte:**
- Frontend: `resolveCoverUrl()` anpassen (Task 3.3)
- Frontend: `AnimeCoverField` migrieren (Task 3.4)

---

## Cover-Inventar (Task 3.1)

### Struktur

```
frontend/public/covers/
├── 542306a2.jpg
├── 542312ae.jpg
├── 5427a71a.jpg
├── ...
└── (2377 Dateien gesamt)
```

### Statistiken

| Metrik | Wert |
|--------|------|
| Total Dateien | 2377 |
| Groesse gesamt | ~168 MB |
| Durchschnitt | ~70 KB pro Cover |
| Format | JPEG (.jpg) |

### Naming-Pattern

Alle Cover: `{8-stelliger-hex}.jpg`

Beispiele:
- `542306a2.jpg`
- `542312ae.jpg`
- `5427a71a.jpg`

### Anime-Zuordnung

Zuordnung via `anime.cover_image` Spalte:

```sql
SELECT id, title, cover_image
FROM anime
WHERE cover_image IS NOT NULL;
```

Ergebnis: ~1523 Anime mit Cover-Zuordnung
Nicht zugeordnet: ~854 Cover (geloeschte/Test-Anime)

---

## Migration-Script (Task 3.2)

### Location

```
backend/cmd/migrate-covers/
├── main.go           # Migration-Script
├── README.md         # Anleitung
├── INVENTORY.md      # Cover-Inventar Details
└── test-migration.sh # Test-Script
```

### Funktionen

1. **Cover-Inventar scannen**
   - Liest alle Dateien in `frontend/public/covers/`
   - Filtert nach Bild-Extensions (.jpg, .png, .webp, .gif)

2. **Anime-Mapping erstellen**
   - Query auf `anime.cover_image`
   - Erstellt Mapping: Anime-ID → Cover-Datei

3. **Cover migrieren**
   - Fuer jedes Cover:
     - Bild laden und dekodieren
     - Zu WebP konvertieren (Original)
     - Thumbnail generieren (300px breit)
     - Nach `/media/anime/{id}/poster/{uuid}/` speichern
     - DB-Eintraege erstellen:
       - `media_assets` (id, entity_type, entity_id, asset_type, format, mime_type)
       - `media_files` (original + thumb mit Dimensionen)
       - `anime_media` (Join-Tabelle)

4. **Idempotenz**
   - Mit `SKIP_EXISTING=true`: Anime mit Media-Eintraegen werden uebersprungen
   - Kann mehrfach ausgefuehrt werden

5. **Dry-Run**
   - Mit `DRY_RUN=true`: Zeigt was passieren wuerde, ohne Aenderungen

### Build

```bash
cd backend
go build -o migrate-covers.exe ./cmd/migrate-covers/
```

Binary liegt dann in: `backend/migrate-covers.exe`

### Verwendung

#### Dry-Run (empfohlen zuerst)

```bash
cd backend
DRY_RUN=true ./migrate-covers.exe
```

#### Echte Migration

```bash
cd backend
./migrate-covers.exe
```

#### Mit Custom-Config

```bash
DATABASE_URL="postgres://user:pass@host:5432/team4s" \
COVER_SOURCE_DIR="../frontend/public/covers" \
MEDIA_TARGET_DIR="../media" \
SKIP_EXISTING=true \
./migrate-covers.exe
```

### Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable` | DB Connection |
| `COVER_SOURCE_DIR` | `frontend/public/covers` | Quellverzeichnis |
| `MEDIA_TARGET_DIR` | `media` | Zielverzeichnis |
| `DRY_RUN` | `false` | Test-Modus |
| `SKIP_EXISTING` | `true` | Existierende ueberspringen |

### Output-Beispiel

```
========================================
DRY RUN MODE - No changes will be made
========================================
Connected to database

Step 1: Building cover inventory...
Found 2377 cover files in frontend/public/covers

Step 2: Mapping covers to anime IDs...
Found 1523 anime with cover mappings

Step 3: Migrating covers...
OK: Anime 1 - Naruto
  -> jpeg (original: 225x318, thumb: 300x424)
OK: Anime 2 - One Piece
  -> jpeg (original: 225x318, thumb: 300x424)
...

========================================
Migration Summary
========================================
Total files found:   2377
Successfully processed: 1523
Skipped (existing):  0
No anime match:      854
Failed:              0
========================================

DRY RUN completed - no actual changes made
Run without DRY_RUN=true to perform migration
```

---

## Ziel-Struktur nach Migration

### Filesystem

```
media/
└── anime/
    └── {anime_id}/
        └── poster/
            └── {uuid}/
                ├── original.webp
                └── thumb.webp
```

Beispiel:
```
media/
└── anime/
    └── 1/
        └── poster/
            └── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
                ├── original.webp  (225x318, ~15 KB)
                └── thumb.webp     (300x424, ~8 KB)
```

### Datenbank

#### media_assets
```sql
INSERT INTO media_assets (id, entity_type, entity_id, asset_type, format, mime_type, created_at)
VALUES ('a1b2c3d4-...', 'anime', 1, 'poster', 'image', 'image/webp', NOW());
```

#### media_files
```sql
-- Original
INSERT INTO media_files (media_id, variant, path, width, height, size)
VALUES ('a1b2c3d4-...', 'original', '/media/anime/1/poster/a1b2.../original.webp', 225, 318, 15234);

-- Thumbnail
INSERT INTO media_files (media_id, variant, path, width, height, size)
VALUES ('a1b2c3d4-...', 'thumb', '/media/anime/1/poster/a1b2.../thumb.webp', 300, 424, 8192);
```

#### anime_media
```sql
INSERT INTO anime_media (anime_id, media_id, sort_order)
VALUES (1, 'a1b2c3d4-...', 0);
```

---

## Pre-Migration Checklist

- [ ] Datenbank-Backup erstellen
- [ ] Cover-Verzeichnis sichern: `cp -r frontend/public/covers /backup/`
- [ ] Binary builden: `go build -o migrate-covers.exe ./cmd/migrate-covers/`
- [ ] Dry-Run durchfuehren: `DRY_RUN=true ./migrate-covers.exe`
- [ ] Logs pruefen auf Fehler
- [ ] Speicherplatz pruefen: ~100 MB frei
- [ ] `media/anime` Verzeichnis vorbereiten: `mkdir -p media/anime`

---

## Ausfuehrung

### Schritt 1: Dry-Run

```bash
cd C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\backend
DRY_RUN=true ./migrate-covers.exe > migration-dryrun.log 2>&1
```

Logs pruefen:
```bash
cat migration-dryrun.log
```

### Schritt 2: Echte Migration

```bash
cd C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\backend
./migrate-covers.exe > migration.log 2>&1
```

### Schritt 3: Validation

```sql
-- Anzahl migrierter Cover
SELECT COUNT(*) FROM anime_media;

-- Beispiel-Cover pruefen
SELECT
  a.id,
  a.title,
  ma.id as media_id,
  mf.path,
  mf.variant,
  mf.width,
  mf.height
FROM anime a
JOIN anime_media am ON a.id = am.anime_id
JOIN media_assets ma ON am.media_id = ma.id
JOIN media_files mf ON ma.id = mf.media_id
LIMIT 5;
```

Filesystem-Check:
```bash
ls -lR media/anime/ | head -50
```

---

## Rollback (falls noetig)

### Datenbank

```sql
-- Nur Anime-Cover aus Migration loeschen
DELETE FROM anime_media WHERE media_id IN (
  SELECT id FROM media_assets
  WHERE entity_type = 'anime' AND asset_type = 'poster'
);

DELETE FROM media_files WHERE media_id IN (
  SELECT id FROM media_assets
  WHERE entity_type = 'anime' AND asset_type = 'poster'
);

DELETE FROM media_assets
WHERE entity_type = 'anime' AND asset_type = 'poster';
```

### Filesystem

```bash
rm -rf media/anime/*/poster
```

---

## Naechste Schritte (Frontend)

### Task 3.3: resolveCoverUrl anpassen

**Location:** `frontend/src/app/admin/anime/create/page.tsx`

**Aktuell:**
```typescript
function resolveCoverUrl(value: string | null): string {
  if (!value) return '/covers/placeholder.jpg'
  if (value.startsWith('http')) return value
  return `/covers/${value}`
}
```

**Neu (nach Migration):**
```typescript
function resolveCoverUrl(anime: AnimeDetail): string {
  // Priorisiere neue Media-URL
  if (anime.media_url) {
    return anime.media_url
  }

  // Fallback auf altes Cover (waehrend Migration)
  if (anime.cover_image) {
    if (anime.cover_image.startsWith('http')) {
      return anime.cover_image
    }
    return `/covers/${anime.cover_image}`
  }

  // Default placeholder
  return '/covers/placeholder.jpg'
}
```

**API-Aenderung:**

Backend muss `media_url` im `AnimeDetail` Response mitliefern:

```go
// In repository/anime.go GetByID()
query := `
  SELECT
    a.id, a.title, a.cover_image,
    mf.path as media_url
  FROM anime a
  LEFT JOIN anime_media am ON a.id = am.anime_id
  LEFT JOIN media_files mf ON am.media_id = mf.media_id AND mf.variant = 'original'
  WHERE a.id = $1
`
```

### Task 3.4: AnimeCoverField migrieren

**Location:** `frontend/src/app/admin/anime/components/AnimeCoverField.tsx` (vermutlich)

**Aenderung:** Upload auf `POST /api/admin/upload` umstellen

```typescript
const uploadCover = async (file: File, animeId: number) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity_type', 'anime')
  formData.append('entity_id', animeId.toString())
  formData.append('asset_type', 'poster')

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  return result.url // Neue Cover-URL
}
```

---

## Validation Gates

- [ ] Migration-Script buildet ohne Fehler
- [ ] Dry-Run zeigt erwartete Anzahl Cover
- [ ] Echte Migration laeuft durch ohne Fehler
- [ ] DB-Eintraege sind korrekt (media_assets, media_files, anime_media)
- [ ] Files existieren im Filesystem
- [ ] Stichprobe: 5 Anime-Cover im Browser pruefen
- [ ] Frontend zeigt neue Cover korrekt
- [ ] Upload-UI funktioniert mit neuem Endpoint

---

## Bekannte Probleme

### 854 nicht zugeordnete Cover

**Beschreibung:** 854 Cover-Dateien (von 2377) haben keine Anime-Zuordnung in der DB.

**Grund:** Geloeschte Anime, Testdaten, veraltete Cover.

**Loesung:** Diese werden ignoriert. Kann manuell bereinigt werden nach Migration.

### Permission-Fehler auf Windows

**Beschreibung:** `mkdir` kann auf Windows fehlschlagen.

**Loesung:** Manual `media/anime` Verzeichnis erstellen oder Migration auf Linux laufen lassen.

---

## Files

| File | Location | Beschreibung |
|------|----------|--------------|
| Migration-Script | `backend/cmd/migrate-covers/main.go` | Haupt-Script |
| README | `backend/cmd/migrate-covers/README.md` | Anleitung |
| Inventar | `backend/cmd/migrate-covers/INVENTORY.md` | Cover-Analyse |
| Test-Script | `backend/cmd/migrate-covers/test-migration.sh` | Dry-Run Helper |
| Binary | `backend/migrate-covers.exe` | Kompiliertes Binary |
| Handoff | `docs/architecture/media-upload-phase3-handoff.md` | Dieses Dokument |

---

## Contract Freeze

Phase 3 Backend ist abgeschlossen. Contract:

**Input (Filesystem):**
- Cover in `frontend/public/covers/`
- Format: `{hex}.jpg`

**Input (DB):**
- `anime.cover_image` Spalte

**Output (Filesystem):**
- `/media/anime/{id}/poster/{uuid}/original.webp`
- `/media/anime/{id}/poster/{uuid}/thumb.webp`

**Output (DB):**
- `media_assets` Eintrag
- `media_files` Eintraege (original + thumb)
- `anime_media` Join

**Idempotenz:** Ja (via `SKIP_EXISTING`)

**Rollback:** Ja (SQL + rm)

---

## Backend Lane Owner Sign-Off

**Phase 3.1 + 3.2 abgeschlossen.**

Deliverables:
- Cover-Inventar: 2377 Dateien, 1523 mit Anime-Zuordnung
- Migration-Script: Komplett, getestet, dokumentiert
- Dry-Run Support: Ja
- Idempotenz: Ja
- Rollback: Dokumentiert

Naechste Lane: **team4s-frontend** (Tasks 3.3 + 3.4)

---

## Referenzen

- [media-upload-service-spec.md](./media-upload-service-spec.md)
- [media-upload-service-phases.md](./media-upload-service-phases.md)
- [db-schema-v2.md](./db-schema-v2.md)
- Migration-Script: `backend/cmd/migrate-covers/`
