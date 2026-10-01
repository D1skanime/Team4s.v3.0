# Phase 172: Kara-Vorschaubild pro Segment (manuell + automatisch) - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning
**Quelle:** Analyse `.planning/notes/kara-preview-image.md` + Nutzerentscheidungen im Chat (2026-10-01)

<domain>
## Phase Boundary

Jedes Kara-/Theme-Segment bekommt genau ein Vorschaubild, das auf allen Release-Versionen gilt, denen das Segment zugewiesen ist. Das Bild entsteht automatisch aus dem fertigen Segment-Render und kann auf der Segment-Seite (Segmente-Tab im Release-Editor) manuell ersetzt werden, per Upload oder durch Übernahme eines vorhandenen öffentlichen Release-Bildes. Admin-Media-Liste (Phase 171) und Public-Release-Story verwenden dieselbe serverseitig aufgelöste Vorschau-URL.

Nicht Teil der Phase: Drag-and-drop-Neubau der Story-Reihenfolge (eigener Auftrag, `.planning/notes/171-dnd-analysis.md`), Public-Story-Bugs aus der 171-Review, neue Medien-Review-Workflows.
</domain>

<decisions>
## Implementation Decisions

### Ownership und Ort
- **D-01:** Das Vorschaubild gehört zum **Kara-Segment** (`theme_segments`), nicht zur Release-Version und nicht zu `theme_segment_playback_sources`. Es wird einmal pro Segment gespeichert und erscheint auf **allen** zugewiesenen Folgen.
- **D-02:** Gepflegt wird es auf der **Segment-Seite** (`SegmentEditPanel` im Segmente-Tab von `/admin/episode-versions/[versionId]/edit`). Die Release-Media-Seite bleibt bei Kara-Karten aktionsfrei (Phase 171 D-08). Erlaubt ist dort höchstens ein Link „Vorschaubild ändern“, der zum Segment-Tab führt.

### Prüfung und Rechte
- **D-03:** **Keine Review-Prüfung.** Ein manuell gesetztes Segment-Vorschaubild ist sofort öffentlich (`visibility = public`, `review_status = approved`, wie die bestehenden Segment-Dateien in `UploadSegmentAsset`). Die Berechtigung folgt der bestehenden Segment-Verwaltung (`requireSegmentManage`). UI-Sichtbarkeit ersetzt keine Backend-Prüfung.

### Automatische Erzeugung
- **D-04:** **Automatisch ja.** Nach erfolgreichem Segment-Render (`executeSegmentRender` → `MarkThemeSegmentRenderCacheReady`) zieht das Backend einen Frame aus dem gerenderten MP4 (eingebrannte Karaoke-Untertitel sind erwünscht) bei **ca. 35 % der Segmentdauer** und speichert ihn als automatisches Vorschaubild des Segments. Ein späterer Render ersetzt das alte automatische Bild und räumt die alte Datei bzw. das alte Asset auf.
- **D-05:** Auch der bestehende Video-Upload-Pfad (`MediaService.saveSegmentVideoPreview`) zieht den Frame nicht mehr bei `-ss 0`, sondern ebenfalls bei ca. 35 %. Das Ergebnis zählt als **automatisch**.
- **D-06:** Ein Fehlschlag der Frame-Extraktion darf den Render **nicht** fehlschlagen lassen. Er wird geloggt, das Segment fällt auf das Ersatzbild zurück.
- **D-07:** Bei mehreren Renders desselben Segments (unterschiedliche Release-Versionen/Quellen) gilt der **zuletzt erfolgreich fertiggestellte** Render als Quelle des automatischen Bildes.

### Rangfolge und Auflösung
- **D-08:** Rangfolge **manuell > automatisch > Ersatzbild**. Ein neuer Render überschreibt **nie** eine manuelle Wahl.
- **D-09:** Das Backend liefert pro Segment ein aufgelöstes `preview_url` plus `preview_source` (`manual` | `auto` | `fallback`). Admin-Segmentliste (`getAnimeSegments`), Admin-Media-Story (Phase 171) und Public-Release-Detail (`loadReleaseSegments`) nutzen **dieselbe** Auflösung. Die Public-Abfrage hängt nicht mehr an `theme_segment_playback_sources.media_asset_id`.
- **D-10:** Das Ersatzbild wird **serverseitig einheitlich** festgelegt (Vorschlag: Vorschaubild der Release-Version, sonst ein Platzhalter). Die Frontend-Ersatzlogik entfällt: `createKaraStoryItem` (erstes Release-Bild) in `ReleaseVersionMediaSection.helpers.tsx` und `'/covers/placeholder.jpg'` in `ReleaseGallery.tsx`.

### Manuelle Pflege (UI)
- **D-11:** Neuer Abschnitt „Vorschaubild“ im Segment-Panel mit:
  - aktuellem Bild + Herkunfts-Badge „Manuell“ / „Automatisch“ / „Standardbild“
  - **Bild hochladen** (Dropzone + Dateiauswahl, nur Bilder)
  - **Aus Release-Bildern wählen**: Picker mit öffentlichen, freigegebenen Bildern der Release-Versionen, denen das Segment zugewiesen ist. Übernahme ohne Dateikopie, Ownership serverseitig prüfen.
  - **Automatisches Bild verwenden** (nur sichtbar, wenn eine manuelle Wahl existiert)
- **D-12:** Fehler sind sofort in der UI sichtbar, Erfolg per Toast. Nur `@/components/ui`-Primitives (`Button`, `Modal`/`Drawer`, `FormField`, `Badge` …) und globale Design-Tokens. Deutsche UI-Texte mit korrekten Umlauten.

### Bestand
- **D-13:** **Backfill:** Für bestehende Segmente mit fertigem Render wird einmalig ein automatisches Vorschaubild erzeugt (idempotentes Skript/Kommando oder Worker-Lauf), damit z. B. Release 27 (Segmente 7, 8, 9) sofort Bilder hat.

### Claude's Discretion
- Datenmodell: zwei Spalten (`preview_media_asset_id` manuell, `auto_preview_media_asset_id` automatisch) **oder** eine Spalte plus `preview_source`. Kriterium ist D-08: Eine manuelle Wahl darf beim Render nie verloren gehen, und „Automatisches Bild verwenden“ muss ohne neuen Render funktionieren. Zwei Spalten werden bevorzugt.
- Bildgrößen-/Format-Limits und Thumb-Varianten analog zum bestehenden Release-Media-Bild-Upload.
- Speicherort der Auto-Frames (Media-Storage mit `media_assets`/`media_files`, nicht im Render-Cache-Verzeichnis, damit `/media`-Auslieferung und Aufräumen einheitlich bleiben).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Regeln
- `AGENTS.md`, `CLAUDE.md`: Domain-, API-, UI-Regeln, 450-Zeilen-Limit, globale UI-Primitives, Umlaute.
- `docs/engineering/implementation-contract.md`, `docs/api/api-contracts.md`: OpenAPI/DTO/Frontend-Synchronität.
- `.planning/notes/kara-preview-image.md`: Ist-Analyse dieser Phase.

### Backend-Seams
- `backend/internal/handlers/segment_render_worker.go` (`executeSegmentRender`): Hook-Punkt für die automatische Frame-Extraktion.
- `backend/internal/services/segment_render_service.go`: ffmpeg-Aufbau des Renders.
- `backend/internal/services/media_service.go` (`SaveSegmentAsset`, `saveSegmentVideoPreview`): bestehende Frame-Extraktion (`-ss 0`) und Segment-Asset-Speicherung.
- `backend/internal/handlers/admin_content_anime_theme_segments.go` (`UploadSegmentAsset`, `DeleteSegmentAsset`, `requireSegmentManage`): Vorbild für Upload-/Rechte-/Cleanup-Muster. Die Datei hat bereits 955 Zeilen, neue Handler daher in eigene Datei.
- `backend/internal/repository/admin_content_anime_themes.go`: Segment-Lesepfad für die Admin-Liste.
- `backend/internal/repository/release_detail_public_repository_helpers.go` (`loadReleaseSegments`): Public-Vorschau heute über `theme_segment_playback_sources`.
- `backend/internal/repository/theme_segment_render_cache.go`: Render-Cache-Status/Outputs.
- `backend/cmd/server/admin_routes.go`: Segment-Routen (`/admin/anime/:id/segments/:segmentId/...`).
- `database/migrations/`: nächste Nummer 0177.

### Frontend-Seams
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (402 Zeilen, nahe am Limit → neuer Abschnitt als eigene Komponente)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx`, `useSegmentAssetHandlers.ts`: bestehende Upload-Muster
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` (`createKaraStoryItem`)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` (`renderKara`)
- `frontend/src/lib/api.ts`, `frontend/src/types/admin.ts`, `frontend/src/types/releaseDetail.ts`
- `shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`
</canonical_refs>

<code_context>
## Existing Code Insights

- Live-Bestand (2026-10-01): Alle Segmente 3–9 haben `source_type = none` (Render aus Episode), keine Playback-Source mit `media_asset_id`, daher **kein** Segment hat heute ein Vorschaubild. Fertige Renders existieren für 7, 8 (mehrfach), 9.
- Segment 8 ist den Release-Versionen 27, 28, 29 zugewiesen. Daran wird D-01 getestet.
- Segment-Dateien werden heute direkt `public`/`approved` angelegt (`UploadSegmentAsset`). D-03 folgt diesem Muster.
- Phase 171 arbeitete parallel an `ReleaseGallery.tsx` und `ReleaseVersionMediaSection.*`. Vor dem Ausführen den aktuellen Stand auf `main` lesen.
</code_context>

<specifics>
## Acceptance (must be covered by tests before UAT)
- Nach einem Render hat das Segment automatisch ein Vorschaubild aus dem Frame bei ca. 35 % (Go-Test mit gemocktem/Fixture-Extraktor). Ein Extraktionsfehler bricht den Render nicht.
- Ein manuelles Bild ist ohne Review sofort öffentlich, auf allen zugewiesenen Folgen (Test mit 3 Zuweisungen).
- Ein neuer Render ersetzt nur das automatische, nie das manuelle Bild.
- „Aus Release-Bildern wählen“ akzeptiert nur öffentliche/freigegebene Bilder zugewiesener Release-Versionen. Fremde → 404/403.
- „Automatisches Bild verwenden“ entfernt die manuelle Wahl.
- Ohne Segment-Recht → 403, keine Upload-UI.
- Admin-Media-Liste und Public-Seite liefern für dasselbe Segment dieselbe URL.
- OpenAPI/DTO/Typen/`api.ts` synchron; Vitest + Go-Tests grün; neue/geänderte Produktionsdateien ≤ 450 Zeilen.
- Backfill erzeugt Bilder für bestehende fertige Renders (idempotent).
- Live-UAT auf Release 27 (Desktop + Mobile) über `http://127.0.0.1:3300`.
</specifics>

<deferred>
## Deferred Ideas
- Frame-Auswahl per Zeitregler („Bild bei mm:ss“) statt fester 35 %.
- Mehrere Vorschaubilder/Galerie pro Kara.
</deferred>

---

*Phase: 172-Kara-Vorschaubild pro Segment*
*Context gathered: 2026-10-01*
