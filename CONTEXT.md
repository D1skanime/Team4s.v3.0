# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Fansub- und Release-Media-Admin auf den neuen Workspace-Look heben, Release-Version-Media live absichern, und die nächste Auth-/Rollen-Phase vorbereiten`

## Current State

### What Finished In This Pass
- Der Fansub-Admin auf `/admin/fansubs/88/edit` wurde breit modernisiert: `Grunddaten`, `Notizen`, `Anime & Veröffentlichungen`, `Anime-Projekte`, Drawer und mehrere Unterflächen nutzen jetzt einen klareren, kontrastreicheren Workspace-Look.
- `Tags / Aliase` und `Community-Links` wurden aus eigenen Reitern in `Grunddaten` integriert, damit der Basic-Bereich dichter und sinnvoller arbeitet.
- Alte `Description / History`-Felder wurden end-to-end entfernt: UI, Backend, API-Contract und neue Drop-Migration `0071`.
- Der Release-Version-Media-Bereich auf `/admin/episode-versions/62/edit?tab=media` wurde modernisiert und funktional erweitert:
  - klickbare Dropzone
  - lokale Vorschau-Bilder vor dem Upload
  - Multi-Upload ersetzt bestehende Auswahl nicht mehr
- Live-UAT mit Playwright gegen den echten Frontend-/Backend-Flow auf `3000` bestätigt, dass zwei nacheinander hinzugefügte Bilder gleichzeitig sichtbar bleiben.
- Ein echter Test-Upload gegen `POST /api/v1/admin/release-versions/62/media` wurde erfolgreich persistiert und anschließend in DB + Dateisystem bestätigt.

### What Works
- Fansub-Edit-Workspace wirkt deutlich moderner und weniger wie eine alte weiße Formularseite.
- Der gemeinsame Editor-Look ist an mehreren Call-Sites vereinheitlicht; Notiz-/Preview-Karten und Meta-Spalten wurden global ruhiger gezogen.
- Release-Version-Media-Upload verarbeitet Bilder live korrekt:
  - Asset in `media_assets`
  - Varianten in `media_files`
  - Relation in `release_version_media`
  - Dateien unter `media/release-version/<versionId>/<uuid>/`
- Playwright-Live-UAT auf `http://localhost:3000/admin/episode-versions/62/edit?tab=media` ist grün für den Multi-Upload-Fix.
- Ein lokaler Backend-Bypass-Stand auf `:8092` wurde zum Verifizieren hochgezogen und beantwortet Health + Admin-Media-Routen.

### What Is Open
- Nicht jede Unterfläche im Fansub-Admin ist bis in den letzten inneren Detailzustand visuell gleich stark; der grobe neue Stil steht, aber letzte Micro-Politur ist noch möglich.
- `3002` war im Verlauf mehrfach instabil oder veraltet; für echte Debug-/UAT-Arbeit war `3000` plus lokales Backend verlässlicher.
- Der Test-Upload auf Release-Version 62 ist echt gespeichert und sollte gelöscht werden, wenn die Testdaten sauber bleiben sollen.
- TipTap-Bildintegration ist bewusst noch **nicht** begonnen und soll als eigene Phase über den bestehenden Media-Uploader laufen.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Praktisch aktiver Themenblock: Abschluss/Follow-through von Phase 41 plus Release-Version-Media-Härtung und UI-Vereinheitlichung
- Phase 42 (`tiptap collaboration mvp`) wurde bewusst zurückgestellt, bis Phase 43 bis 48 die echte User-/Rollen-Basis liefern.
- Die nächste größere Produktbewegung soll in Richtung Phase 43 gehen, nicht in einen vorschnellen Collaboration- oder Editor-Image-Slice.

## Key Decisions In Force
- `docs/architecture/db-schema-fansub-domain.md` bleibt der erste Referenzpunkt für Persistenzfragen.
- `release_version_groups.fansub_group_id` bleibt die kanonische Runtime-Spalte.
- Release-Media bleibt auf der bestehenden `media_assets` / `media_files` / `release_version_media`-Seam.
- Editor-Bilder sollen später **erst lokal/temporär** im TipTap erscheinen und **erst bei Speichern** über den bestehenden Media-Uploader persistiert werden.
- Phase 42 bleibt zurückgestellt, bis echte Auth-/Rollen-/Mehrbenutzer-Basis aus Phase 43 bis 48 steht.
