# Phase 35 Discussion Log

**Phase:** 35-release-version-media-backend-upload-service-and-api
**Date:** 2026-05-07
**Status:** Complete

## Gray Areas Discussed

### 1. Image Processing Library

**Question:** govips vs bimg — welche Bibliothek für libvips-Integration in Go?

**Discussion:**
- `bimg` ist seit 2021 praktisch inaktiv; letzter nennenswerter Commit über 3 Jahre alt
- `govips` (`github.com/davidbyttow/govips/v2`) ist aktiv maintained, hat eine moderne Go-API und nutzt dieselbe libvips-Basis
- User wollte wissen: "Ist das eine moderne und sehr gute Bibliothek und für unser Vorhaben ideal?"
- Bestätigt: govips ist die bessere Wahl

**Decision:** `github.com/davidbyttow/govips/v2`; Dockerfile erhält `apt-get install -y libvips-dev`

---

### 2. Storage-Strategie: Staging vs. direktes Schreiben

**Question:** Physisches Staging-Verzeichnis (upload → staging → final) oder direkt ins finale Verzeichnis?

**Discussion:**
- Bestehendes Pattern (`media_upload_image.go`, `admin_content_release_theme_assets.go`) schreibt direkt ins finale Verzeichnis
- Status-Felder (`status='processing'` → `status='ready'`) übernehmen die Funktion des Staging-Gates
- Phase 37 (Cleanup-Job) findet verwaiste Dateien über Zeitstempel-Check
- Staging würde extra Komplexität und doppelten I/O bedeuten ohne klaren Mehrwert

**Decision:** Kein physisches Staging. Direkt ins finale Verzeichnis schreiben. Status-Feld als Gate.

---

### 3. Route-Struktur

**Question:** Basis-Route für die 5 Admin-Endpunkte?

**Discussion:**
- `/admin/release-versions/:versionId/media` ist RESTful und konsistent mit bestehenden Admin-Routen
- `versionId` ist der primäre Anker für alle Operationen

**Decision:** `/admin/release-versions/:versionId/media` als Basis-Route (5 Endpunkte: POST, GET, PATCH/:relationId, DELETE/:relationId, POST/reorder)

---

### 4. Handler-Organisation

**Question:** Neue Handler-Datei oder in bestehende? Neuer Handler-Typ oder auf `AdminContentHandler`?

**Discussion:**
- Bestehendes Muster: `admin_content_release_theme_assets.go` — eigene Datei, Methoden auf `AdminContentHandler`
- Neuer Handler-Typ würde Dependency-Injection-Overhead bedeuten ohne Mehrwert
- Separate Datei hält 450-Zeilen-Limit aus CLAUDE.md ein

**Decision:** Neue Datei `admin_content_release_version_media.go`, Methoden auf bestehendem `AdminContentHandler`. Routen in `admin_routes.go` registrieren.

---

## Decisions Summary

Alle Entscheidungen sind in `35-CONTEXT.md` festgehalten.

Key Choices:
- `govips` für Image Processing (libvips-Wrapper, aktiv maintained)
- Kein Staging, direkt schreiben + Status-Feld als Gate
- Route: `/admin/release-versions/:versionId/media`
- Handler: neue Datei auf bestehendem `AdminContentHandler`
- BIGINT für alle user FK-Spalten (konsistent mit Migration 0044)
- Sort-Order: `COALESCE(MAX, 0) + 10` Strategie
