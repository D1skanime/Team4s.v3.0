# Auftrag: Kara-Vorschaubild (Segment-Seite + automatische Erzeugung)

**Erstellt:** 2026-10-01 · **Grundlage:** Analyse auf `team4s-linux`, `main` @ `cb430d7d`
**Empfohlener Zuschnitt:** eigene Phase 172 (nicht Gap-Closure von 171, da neues Datenmodell und neue Funktion)

## Ausgangslage (Ist)
- Ein Kara-Vorschaubild entsteht heute **nur**, wenn auf der Segment-Seite eine eigene Videodatei hochgeladen wird (`POST /api/v1/admin/anime/:id/segments/:segmentId/asset` → `MediaService.SaveSegmentAsset` → `saveSegmentVideoPreview`, ffmpeg-Frame bei **`-ss 0`**, oft schwarz).
- Alle Live-Segmente (3–9) laufen über den Episoden-Render (`source_type = none`). Der Render-Worker (`segment_render_service.go` / `segment_render_worker.go`) erzeugt **kein** Vorschaubild. Deshalb hat **kein** Kara ein Bild.
- Die Public-Seite liest das Bild über `theme_segment_playback_sources.media_asset_id` **pro Release-Version** (`release_detail_public_repository_helpers.go` → `loadReleaseSegments`). Geteilte Segmente (z. B. Segment 8 in Release 27/28/29) hätten das Bild daher nur dort, wo die Quelle hängt.
- Die Ersatzbilder sind uneinheitlich: Public = `/covers/placeholder.jpg` (`ReleaseGallery.tsx`), Admin = erstes Release-Bild (`createKaraStoryItem` in `ReleaseVersionMediaSection.helpers.tsx`).
- Es gibt **keine UI**, um ein Kara-Vorschaubild zu setzen oder zu ändern.

## Entscheidungen (vom Nutzer bestätigt 2026-10-01)
- **D-01:** Das Vorschaubild gehört **zum Kara-Segment** (einmal pro Segment, gilt auf allen zugewiesenen Folgen), nicht zur Release-Version.
- **D-02:** Es wird auf der **Segment-Seite** (Segmente-Tab im Release-Editor, `SegmentEditPanel`) gepflegt. Die Release-Media-Seite bleibt bei Kara-Karten ohne Aktionen (Phase 171 D-08). Erlaubt ist dort höchstens ein Link „Vorschaubild ändern“ zum Segment.
- **D-03:** **Keine Review-Prüfung.** Ein gesetztes Segment-Vorschaubild ist sofort öffentlich (`visibility = public`, `review_status = approved`, wie heutige Segment-Dateien). Berechtigung über die bestehende Segment-Verwaltungsprüfung (`requireSegmentManage`).
- **D-04:** **Automatische Erzeugung ja.** Nach erfolgreichem Render wird ein Frame als Vorschaubild gespeichert.
- **D-05:** Rangfolge: **manuell gesetzt > automatisch > Ersatzbild**. Eine manuelle Wahl wird von neuen Renders **nie** überschrieben.
- **D-06:** Admin-Liste und Public-Seite zeigen **dasselbe** aufgelöste Bild aus einer Backend-Quelle. Frontend-eigene Ersatzlogik entfällt.

## Umfang

### Backend / DB
1. **Migration 0177:** Spalten am Segment, z. B.
   - `theme_segments.preview_media_asset_id` (manuell, nullable, FK `media_assets`)
   - `theme_segments.auto_preview_media_asset_id` (automatisch, nullable)
   - Oder eine Spalte plus `preview_source` (`manual`/`auto`). Die Entscheidung trifft der Planer, Kriterium ist D-05.
2. **Automatisch:** Nach `ready` im Render-Worker einen Frame aus dem gerenderten MP4 ziehen, bei **35 % der Segmentdauer** (nicht 0 s), als `thumb`-Variante speichern und `auto_preview_…` setzen. Ein alter Auto-Frame wird beim erneuten Render ersetzt und aufgeräumt. Die manuelle Wahl bleibt unberührt.
3. **Video-Upload-Pfad:** `saveSegmentVideoPreview` ebenfalls auf ca. 35 % statt `-ss 0`. Das Ergebnis zählt als **automatisch**.
4. **Neue Endpunkte** (OpenAPI + DTO + `api.ts` synchron):
   - `PUT /api/v1/admin/anime/:id/segments/:segmentId/preview`: Bild-Upload (multipart, nur Bilder, Größenlimit wie Release-Medien, Thumb-Variante erzeugen)
   - `PUT …/preview/from-media`: `{ release_version_media_id }` übernimmt ein vorhandenes, öffentliches Release-Bild einer Release-Version, der das Segment zugewiesen ist (Ownership prüfen), ohne die Datei zu kopieren
   - `DELETE …/preview`: entfernt die manuelle Wahl, danach gilt wieder das automatische Bild
   - Alle Endpunkte mit `requireSegmentManage`, Audit-Log und deutschen Fehlermeldungen
5. **Eine Auflösung** im Backend: `preview_url` + `preview_source` (`manual` | `auto` | `fallback`) am Segment, genutzt von
   - Admin-Segmentliste (`getAnimeSegments`)
   - Public-Release-Detail (`loadReleaseSegments`; die Abhängigkeit von `theme_segment_playback_sources.media_asset_id` entfällt)
   - Ersatzbild serverseitig festlegen (ein einheitlicher Wert, z. B. Release-Vorschaubild, sonst Platzhalter)
6. **Optionaler Backfill:** Für bestehende Segmente mit fertigem Render einen Auto-Frame erzeugen (Skript oder einmaliger Worker-Lauf), damit Release 27 sofort Bilder hat.

### Frontend
1. **Segment-Seite** (`SegmentEditPanel.tsx` + neuer Abschnitt, z. B. `SegmentPreviewImageSection.tsx`, ≤ 450 Zeilen):
   - Aktuelles Bild mit Herkunfts-Badge „Manuell“ / „Automatisch“ / „Standardbild“
   - **Bild hochladen** (Drag-and-drop oder Dateiauswahl)
   - **Aus Release-Bildern wählen** (Picker mit Bildern der zugewiesenen Release-Versionen, Modal/Drawer aus `@/components/ui`)
   - **Automatisches Bild verwenden** (nur sichtbar, wenn ein manuelles gesetzt ist)
   - Fehler sofort sichtbar, Toast bei Erfolg, nur `@/components/ui`-Primitives und globale Design-Tokens, deutsche Texte mit Umlauten
2. **Release-Media-Seite:** Die Kara-Karte nutzt `preview_url` vom Backend. `createKaraStoryItem` verliert die Ersatzlogik. Optional ein Link „Vorschaubild ändern“ zum Segment-Tab.
3. **Public-Seite:** `ReleaseGallery.tsx` nutzt `preview_url` direkt. Den hartcodierten `'/covers/placeholder.jpg'` und den toten `previewUrl ? … : …`-Zweig entfernen.

## Akzeptanzkriterien
- [ ] Nach einem Render hat das Segment automatisch ein nicht-schwarzes Vorschaubild (Frame bei ca. 35 %). Backend-Test mit ffmpeg-Fixture oder gemocktem Extraktor.
- [ ] Ein manuell hochgeladenes Bild ist sofort öffentlich, ohne Review, auf **allen** Folgen, denen das Segment zugewiesen ist (Test: Segment mit 3 Zuweisungen).
- [ ] Ein erneuter Render überschreibt das manuelle Bild **nicht**, ersetzt aber das automatische.
- [ ] „Aus Release-Bildern wählen“ akzeptiert nur öffentliche Bilder zugewiesener Release-Versionen, fremde IDs → 404/403.
- [ ] „Automatisches Bild verwenden“ entfernt die manuelle Wahl, danach zeigt die Seite das Auto-Bild.
- [ ] Ohne Segment-Recht → 403, keine Upload-UI.
- [ ] Admin-Media-Liste und Public-Seite zeigen für dasselbe Segment **dieselbe** URL.
- [ ] OpenAPI, DTOs, `frontend/src/types`, `api.ts` synchron; Vitest + Go-Tests grün; alle Dateien ≤ 450 Zeilen.
- [ ] Live-UAT auf Release 27: Auto-Bild sichtbar, manuelles Bild setzen/zurücksetzen, Public-Seite prüfen (Desktop + Mobile).

## Auftrag zum Kopieren
> Neue Phase auf team4s-linux: Kara-Vorschaubild. Grundlage: `.planning/notes/kara-preview-image.md`. Das Vorschaubild gehört zum Kara-Segment (einmal pro Segment, gilt für alle zugewiesenen Folgen) und wird auf der Segment-Seite (`SegmentEditPanel`) gepflegt: Bild hochladen, aus Release-Bildern wählen, zurück zum automatischen Bild. Keine Review-Prüfung, sofort öffentlich, Recht über `requireSegmentManage`. Der Render-Worker erzeugt nach erfolgreichem Render automatisch einen Frame bei ca. 35 % der Segmentdauer, auch der Video-Upload-Pfad verwendet nicht mehr `-ss 0`. Rangfolge: manuell > automatisch > einheitliches Ersatzbild. Neue Renders überschreiben nie eine manuelle Wahl. Das Backend liefert ein aufgelöstes `preview_url` + `preview_source`, das Admin-Media-Liste und Public-Release-Seite gleichermaßen nutzen. Die Frontend-Ersatzlogik (`createKaraStoryItem`, `'/covers/placeholder.jpg'`) entfällt. Akzeptanzkriterien aus der Notiz sind Pflicht, inklusive Backfill für bestehende Segmente und Live-UAT auf Release 27.
