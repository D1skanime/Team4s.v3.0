# Cover Migration Tool

Dieses Tool migriert bestehende Cover-Bilder aus `frontend/public/covers/` in das neue Media Upload System.

## Funktionsweise

1. Scannt `frontend/public/covers/` nach Bilddateien
2. Liest aus der Datenbank alle Anime mit gesetztem `cover_image` Feld
3. Fuer jedes Cover:
   - Liest das Bild
   - Konvertiert zu WebP (Original)
   - Generiert Thumbnail (300px breit)
   - Speichert nach `/media/anime/{id}/poster/{uuid}/`
   - Erstellt `media_assets`, `media_files`, `anime_media` Eintraege

## Voraussetzungen

- Go 1.21+
- Zugriff auf Team4s Datenbank
- Lesezugriff auf `frontend/public/covers/`
- Schreibzugriff auf Zielverzeichnis (z.B. `media/`)

## Installation

```bash
cd backend/cmd/migrate-covers
go build -o migrate-covers
```

## Verwendung

### Dry-Run (empfohlen zuerst)

Zeigt was migriert wuerde, ohne Aenderungen vorzunehmen:

```bash
DRY_RUN=true ./migrate-covers
```

### Echte Migration

```bash
./migrate-covers
```

### Mit Custom-Konfiguration

```bash
DATABASE_URL="postgres://user:pass@host:5432/team4s" \
COVER_SOURCE_DIR="frontend/public/covers" \
MEDIA_TARGET_DIR="media" \
SKIP_EXISTING=true \
./migrate-covers
```

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable` | PostgreSQL Connection String |
| `COVER_SOURCE_DIR` | `frontend/public/covers` | Quellverzeichnis der Cover |
| `MEDIA_TARGET_DIR` | `media` | Zielverzeichnis fuer neue Media-Struktur |
| `DRY_RUN` | `false` | Wenn `true`, keine Aenderungen vornehmen |
| `SKIP_EXISTING` | `true` | Anime mit existierenden Media-Eintraegen ueberspringen |

## Ausgabe-Beispiel

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
```

## Idempotenz

Das Script ist idempotent:
- Mit `SKIP_EXISTING=true` (default) werden Anime mit existierenden Media-Eintraegen uebersprungen
- Kann mehrfach ausgefuehrt werden ohne Duplikate zu erstellen

## Rollback

Falls Migration fehlschlaegt oder rueckgaengig gemacht werden muss:

### SQL Rollback
```sql
-- Nur fuer Anime-Cover aus Migration
DELETE FROM anime_media WHERE media_id IN (
  SELECT id FROM media_assets WHERE entity_type = 'anime' AND asset_type = 'poster'
);

DELETE FROM media_files WHERE media_id IN (
  SELECT id FROM media_assets WHERE entity_type = 'anime' AND asset_type = 'poster'
);

DELETE FROM media_assets WHERE entity_type = 'anime' AND asset_type = 'poster';
```

### Filesystem-Cleanup
```bash
rm -rf media/anime/*/poster/*
```

### Schema Rollback
Falls die Migration-Tabellen selbst zurueckgerollt werden muessen:
```bash
cd backend/database/migrations
# Down-Migration ausfuehren
psql $DATABASE_URL -f 001_create_media_tables.down.sql
```

Die Down-Migration entfernt alle Media-Tabellen in der richtigen Reihenfolge (Join-Tables zuerst, dann media_files, dann media_assets).

## Schema-Hinweise

Die aktuelle Migration (`001_create_media_tables.up.sql`) implementiert eine pragmatische Zwischenloesung fuer das Media-System.

Im Vergleich zum Ziel-Schema aus `docs/architecture/db-schema-v2.md` (Phase D: Media normalization) fehlen folgende Felder bewusst:
- `media_type_id` - aktuell als VARCHAR `asset_type` implementiert
- `file_path` - durch `media_files.path` ersetzt
- `caption` - nicht benoetigt fuer aktuelle Use-Cases
- `modified_at` / `modified_by` - Audit-Felder fuer spaetere Phase vorgesehen

Diese Abweichung ist beabsichtigt und wird in Phase D (Media normalization) angegangen, falls die zusaetzlichen Felder tatsaechlich benoetigt werden.

## Fehlerbehandlung

- Fehlende Quelldateien werden geloggt und uebersprungen
- Fehler bei einzelnen Covern brechen die Migration nicht ab
- Am Ende wird eine Zusammenfassung mit Erfolg/Fehler-Statistik ausgegeben

## Naechste Schritte nach Migration

1. Frontend `resolveCoverUrl()` anpassen um neue Pfade zu verwenden
2. Validierung: Anime-Detail-Seiten pruefen
3. Alte Cover aus `frontend/public/covers/` loeschen (Backup behalten!)
4. Admin-Upload-UI auf neuen Endpoint umstellen

## Troubleshooting

### "source file not found"

Einige Cover in der Datenbank existieren nicht im Dateisystem.
Das ist normal und wird uebersprungen.

### "insert media_assets: duplicate key"

Anime hat bereits Media-Eintraege. Mit `SKIP_EXISTING=true` wird automatisch uebersprungen.

### Permission denied

Stelle sicher dass:
- Lesezugriff auf `frontend/public/covers/` besteht
- Schreibzugriff auf Zielverzeichnis besteht
- Datenbank-User INSERT-Rechte hat

## Struktur nach Migration

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
    └── 123/
        └── poster/
            └── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
                ├── original.webp  (225x318, 15KB)
                └── thumb.webp     (300x424, 8KB)
```
