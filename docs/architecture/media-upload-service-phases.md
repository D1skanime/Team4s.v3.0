# Media Upload Service - Phasenplan (GSD)

**Status:** Active
**Created:** 2026-03-20
**Spec:** [media-upload-service-spec.md](./media-upload-service-spec.md)
**Epic:** Media Upload Service

---

## Phasenuebersicht

```
Phase 1: Bild-Upload    [x] Go Backend + Image Processing  (2026-03-20)
Phase 2: Video-Upload   [x] FFmpeg Integration             (2026-03-20)
Phase 3: Migration      [x] Code ready, Script bereit      (2026-03-20)
```

**Geschaetzte Dauer:** 3-5 Tage total

---

## Phase 1: Bild-Upload

**Ziel:** Bilder hochladen, konvertieren, speichern, DB-Eintrag

**Lane:** `team4s-go`

### Tasks

- [x] **1.1** Go Dependencies hinzufuegen
  - `github.com/disintegration/imaging`
  - `github.com/google/uuid`

- [x] **1.2** Upload-Handler Grundgeruest
  - `POST /api/v1/admin/upload` Route in Gin
  - Multipart-Parsing
  - Parameter: file, entity_type, entity_id, asset_type

- [x] **1.3** Validierung implementieren
  - MIME-Type via Magic Bytes pruefen
  - Dateiendung Whitelist
  - Dateigroesse pruefen (max 50MB)
  - entity_type gegen Whitelist

- [x] **1.4** Image Processing
  - JPEG/PNG/WebP zu WebP konvertieren
  - Thumbnail generieren (300px breit, Aspect Ratio beibehalten)
  - GIF: Thumbnail als WebP

- [x] **1.5** Speicherung
  - UUID generieren
  - Ordner erstellen: `/media/{entity}/{id}/{asset}/{uuid}/`
  - `original.webp` + `thumb.webp` speichern

- [x] **1.6** Datenbank
  - MediaAsset Eintrag erstellen (UploadMediaAsset)
  - MediaFile Eintraege (original + thumb)
  - Join-Tabellen (anime_media, episode_media, fansub_group_media, release_media)

- [x] **1.7** Delete-Handler
  - `DELETE /api/v1/admin/media/{id}`
  - DB-Eintraege loeschen
  - Ordner loeschen

### Validation Gates

```bash
# Test: Bild hochladen
curl -X POST http://localhost:8080/api/admin/upload \
  -F "file=@test.jpg" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=poster"

# Erwartung:
# - Response mit id, files[], url
# - Datei existiert unter /media/anime/123/poster/{uuid}/original.webp
# - Thumbnail existiert unter /media/anime/123/poster/{uuid}/thumb.webp
# - DB: MediaAsset + MediaFile + AnimeMedia Eintraege
```

- [x] JPEG wird zu WebP konvertiert
- [x] PNG wird zu WebP konvertiert
- [x] GIF Thumb ist WebP
- [x] Thumbnail ist 300px breit
- [x] Ungueltige Dateien werden rejected (400)
- [x] DB-Eintraege sind korrekt
- [x] Delete loescht Dateien + DB
- [x] `go build` erfolgreich
- [x] Unit Tests bestanden

### Lane Handoff

```
Orchestrator -> team4s-go: Alle Tasks
Nach Completion -> team4s-critical-review: Phase 1 Review
```

---

## Phase 2: Video-Upload

**Ziel:** Videos (Karaoke) hochladen, Thumbnail extrahieren

**Lane:** `team4s-go`

**Voraussetzung:** Phase 1 abgeschlossen

### Tasks

- [x] **2.1** FFmpeg Verfuegbarkeit pruefen
  - Config: `FFMPEG_PATH` Environment Variable
  - Startup-Check: FFmpeg erreichbar? (Warning Log wenn nicht)

- [x] **2.2** Video-Validierung
  - MIME-Type: video/mp4, video/webm
  - Dateigroesse: max 300 MB
  - Extension: .mp4, .webm

- [x] **2.3** Video-Speicherung
  - Original 1:1 kopieren (kein Re-Encoding)
  - Ordner: `/media/{entity}/{id}/{asset}/{uuid}/`

- [x] **2.4** Thumbnail-Extraktion
  - Frame bei 5 Sekunden (oder 0 wenn kuerzer)
  - Zu WebP konvertieren (480px breit)
  - Fallback: Schwarzes Placeholder-Bild bei Fehler

- [x] **2.5** DB-Integration
  - MediaAsset mit format='video'
  - MediaFile fuer original + thumb
  - Join-Tabelle

### Validation Gates

```bash
# Test: Video hochladen
curl -X POST http://localhost:8080/api/v1/admin/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@karaoke.mp4" \
  -F "entity_type=release" \
  -F "entity_id=789" \
  -F "asset_type=karaoke"
```

- [x] MP4 wird akzeptiert
- [x] WebM wird akzeptiert
- [x] Original ist unveraendert gespeichert
- [x] Thumbnail wurde extrahiert
- [x] DB-Eintraege sind korrekt
- [x] Videos > 300MB werden rejected
- [x] `go build` erfolgreich
- [x] Unit Tests bestanden

### Lane Handoff

```
Orchestrator -> team4s-go: Alle Tasks
Nach Completion -> team4s-critical-review: Phase 2 Review
```

---

## Phase 3: Migration + Frontend

**Ziel:** Bestehende Cover migrieren, Frontend anpassen

**Lane:** `team4s-go` + `team4s-frontend`

**Voraussetzung:** Phase 2 abgeschlossen

### Tasks

- [x] **3.1** Cover-Inventar erstellen
  - Alle Dateien in `frontend/public/covers/` auflisten
  - Zuordnung zu Anime-IDs (aus Dateiname oder DB)
  - Ergebnis: 2377 Cover, 1523 mit Anime-Zuordnung

- [x] **3.2** Migration-Script (Go)
  - Script erstellt: `backend/cmd/migrate-covers/main.go`
  - Features: Dry-Run, Idempotenz, Rollback-Dokumentation
  - Build: `go build -o migrate-covers.exe ./cmd/migrate-covers/`
  - Ausfuehrung: `DRY_RUN=true ./migrate-covers.exe`

- [x] **3.3** Frontend: resolveCoverUrl anpassen
  - `resolveCoverUrl()` + `getCoverUrl()` updated
  - Backward compatible: `/covers/` und `/media/` beide unterstuetzt
  - Neue Pfade werden direkt durchgereicht

- [x] **3.4** Frontend: AnimeCoverField migrieren
  - Upload auf `POST /api/v1/admin/upload` umgestellt
  - Parameter: entity_type=anime, entity_id, asset_type=poster
  - Response-Handling fuer neues Format
  - `npm run build` passed

- [ ] **3.5** Validierung
  - Alle Anime-Detail-Seiten pruefen
  - Keine 404 auf Cover-Bilder

- [ ] **3.6** Cleanup
  - `frontend/public/covers/` leeren
  - Git Commit ohne alte Cover

### Validation Gates

- [ ] Alle existierenden Cover unter neuen URLs erreichbar
- [ ] Anime-Detail-Seiten zeigen Cover korrekt
- [ ] Admin-Upload funktioniert mit neuem Endpoint
- [ ] Keine Dateien mehr in `frontend/public/covers/`

### Lane Handoff

```
Orchestrator -> team4s-go: Tasks 3.1, 3.2
Orchestrator -> team4s-frontend: Tasks 3.3, 3.4
Nach Completion -> team4s-critical-review: Finale Review
```

---

## Tracking

### Phase Status

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1. Bild-Upload | Completed | 2026-03-20 | 2026-03-20 | All tasks done, tests pass |
| 2. Video-Upload | Completed | 2026-03-20 | 2026-03-20 | FFmpeg integration done |
| 3. Migration | Completed | 2026-03-20 | 2026-03-20 | Code ready, Migration-Script bereit |

### Blockers

| Blocker | Phase | Status | Resolution |
|---------|-------|--------|------------|
| - | - | - | - |

### Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Go-native statt Node.js Service | GSD - weniger Komplexitaet |
| 2026-03-20 | Sync statt Queue | 300MB Videos sind schnell genug |
| 2026-03-20 | Kein Re-Encoding | Original-Qualitaet beibehalten |
| 2026-03-20 | Nur 1 Thumbnail-Groesse | YAGNI |

---

## Quick Reference

### Dateipfade

```
/media/{entity_type}/{entity_id}/{asset_type}/{uuid}/
    ├── original.webp (oder .gif/.mp4/.webm)
    └── thumb.webp
```

### API

```
POST   /api/admin/upload          # Upload
DELETE /api/admin/media/{id}      # Delete
```

### Erlaubte Werte

```
entity_type: anime | episode | fansub | release | user | member
asset_type:  poster | banner | logo | avatar | gallery | karaoke
```

### Limits

```
Bilder: max 50 MB
Videos: max 300 MB
```

---

## Agent Instructions

### Fuer team4s-go

1. Lies `media-upload-service-spec.md` fuer Details
2. Arbeite Phase fuer Phase (nicht vorgreifen)
3. Teste jeden Task mit curl vor Abhaken
4. Aktualisiere Checkboxen nach Completion

### Fuer team4s-frontend

1. Warte auf Phase 3
2. Bestehende `AnimeCoverField.tsx` als Referenz
3. Neuer Endpoint: `POST /api/admin/upload`

### Fuer day-start

1. Phase-Status pruefen
2. Naechste offene Tasks in TOMORROW.md

---

## Referenzen

- [media-upload-service-spec.md](./media-upload-service-spec.md)
- [db-schema-v2.md](./db-schema-v2.md)
