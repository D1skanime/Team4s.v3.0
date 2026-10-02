# Phase 173: Öffentliche Bildqualität – Display-Variante + Next.js-Bildoptimierung - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning
**Quelle:** Live-Befund nach Phase-172-UAT (Public-Release-Bilder verpixelt) + Bestandsaufnahme aller Bildpfade + Nutzerentscheidungen im Chat (2026-10-02)

<domain>
## Phase Boundary

Alle **öffentlichen** Bilder sollen scharf und trotzdem leicht laden: Release-Galerie/Story, Kara-Vorschauen, Projektseite (hervorgehobenes Release-Bild, Hero), Fansub-Gruppenmedien, Fansub-Logo/-Banner, Gruppenbanner, Anime-Cover/-Banner/-Hintergrund/-Logo, Member-Avatare und Profil-Hintergründe/Story-Bilder. Erst beim Anklicken (Lightbox/Detail) wird das Original geladen.

Admin- und Bearbeitungsoberflächen (`/admin/**`, `/me/**`, Editoren, Sortier-/Verschiebe-Listen) bleiben beim bestehenden Thumbnail.

Nicht Teil der Phase: Änderungen am Review-Workflow, neue Upload-Endpunkte, Bildbearbeitung/Cropping-UI.
</domain>

<findings>
## Ausgangsbefund (verifiziert 2026-10-02)

- Ursache der Verpixelung ist die **Thumb-Breite**, nicht die Qualität: globaler Uploader `thumbWidth = 300` (`backend/internal/handlers/media_upload.go:32`, `media_upload_image.go:77`), Release-Version-Media und Fansub-Gruppenmedien `400 px` (`admin_content_release_version_media.go:39` `rvmThumbnailWidth`, `fansub_media_upload.go:440-449`). Öffentlich werden diese in Slots von ca. 370–650 CSS-px gezeigt (×2–3 auf HiDPI). `webpQuality = 85` betrifft nur Video-Thumbs.
- Next.js-Bildoptimierung ist konfiguriert (`frontend/next.config.mjs`: `formats ['image/webp']`, `qualities [75]`, `deviceSizes [640,1080,1480,1920]`), wird aber in fast allen Public-Komponenten per `unoptimized` umgangen. Nur `ResponsiveImage` (`frontend/src/components/ui/ResponsiveImage*`) nutzt sie (Memberprofil).
- Betroffene Public-Stellen mit Thumb: `ReleaseGallery.tsx:125,130` (Galerie + Featured-Card), Kara-Fallback `theme_segment_preview.go:97-101,371-375`, `PublicReleaseBlock.tsx:195-201` (heroImage = Thumb), `FansubGroupMediaBlock.tsx:95,119`. Public-Stellen mit unnötig großen Originalen: Fansub-Banner/-Logo (`FansubBannerDisplay.tsx:22`, `FansubProfileTabs.tsx:220`, `FansubProjectBannerCard.tsx:52`), Anime-Poster/-Logo/-Banner (`app/anime/[id]/page.tsx:151`, `AnimeMediaProvider.tsx:157,177`), `HeroSection.tsx:92-114`. Gutes Vorbild: `LatestReleaseSection` (srcset thumb 320w / original 960w).
- Schreibpfade mit Varianten: globaler Uploader (`media_upload_image.go`), Release-Version-Media (`admin_content_release_version_media.go` + `_replace.go`), Fansub-Gruppenmedien (`fansub_media_upload.go`), Fansub-Logo/-Banner (`fansub_media_upload.go:202,225`, kein Thumb), Avatar (`app_profile.go:440-470`), Profil-Hintergrund (`app_profile.go:630-634`), Profil-Story-Bild (`app_profile_story_image.go:149-153`), Segment-Auto-Preview (`media_service_segment.go`), Migrationstool Cover (`cmd/migrate-covers`).
- Originale werden teils neu kodiert (`imaging.Save`, JPEG q95; WebP landet als `.jpg`), teils byte-identisch gespeichert. Release-Version-Media kodiert neu, um EXIF zu entfernen.
- Fansub-Logos/-Banner und Gruppenmedien liegen flach in `media/` und werden über `/api/v1/media/files/...` ausgeliefert; `localPatterns` erlaubt bewusst nur `/media/anime/**`, `/media/profile/**`, `/media/release-version/**` (Phase 143, T-143-07-01).
</findings>

<decisions>
## Implementation Decisions

### Variantenmodell (Mischlösung A+B)
- **D-01:** Jeder öffentliche Bild-Schreibpfad erzeugt zusätzlich zur bestehenden Variante `thumb` eine neue Variante **`display`**: lange Kante max. **1920 px**, **nie hochskalieren** (kleinere Originale werden nur neu kodiert bzw. 1:1 übernommen), hohe Qualität (WebP oder JPEG ≥ 88, Planer entscheidet anhand Kompatibilität). `display` wird als `media_files`-Variante bzw. analog im jeweiligen Speichermodell abgelegt.
- **D-02:** Public-Komponenten nutzen `display` als **Quelle der Next.js-Bildoptimierung** (`ResponsiveImage` / `next/image` ohne `unoptimized`, mit korrekten `sizes`). Next erzeugt daraus geräteabhängige Größen; die Rechenlast bleibt klein, weil nie das Riesen-Original optimiert wird. `qualities` in `next.config.mjs` auf ca. 85 anheben.
- **D-03:** **Klick zeigt das Original** (Lightbox/Galerie-Detail/Bild öffnen). Ohne Klick wird das Original öffentlich nie geladen.
- **D-04:** Admin-/Bearbeitungsoberflächen (`/admin/**`, `/me/**`, Editoren, DnD-Listen) bleiben beim `thumb`. Keine Änderung dort außer Typ-/API-Erweiterung.
- **D-05:** Die API liefert neben `thumbnail_url`/`original_url` ein `display_url` (Fallback-Kette serverseitig: display → original). OpenAPI/DTO/Frontend-Typen synchron halten.

### Original
- **D-06:** **Das Original wird immer gespeichert** und bleibt die Quelle aller Varianten. Ziel ist eine 1:1-Ablage der hochgeladenen Datei; datenschutzrelevante Metadaten (EXIF/GPS) müssen weiterhin entfernt werden (wie bisher bei Release-Version-Media) – wo verlustfreies Entfernen nicht möglich ist, bleibt das Neu-Kodieren für das Original zulässig. WebP-Uploads dürfen nicht mehr als `.jpg` abgelegt werden.

### Animierte Bilder
- **D-07:** **Animierte GIFs bekommen eine animierte `display`-Variante** (Empfehlung: animiertes WebP via FFmpeg, lange Kante max. 960 px, Endlosschleife), dazu ein statisches `thumb` aus dem ersten Frame. Animierte Bilder laufen **nicht** durch die Next.js-Optimierung (sonst nur erster Frame) – `unoptimized` gezielt nur für animierte Varianten.
- **D-08:** Animierte WebP-Uploads werden heute abgelehnt (`image_animated_webp.go`, Commit aec8e587). Research klärt, ob das FFmpeg im Backend-Container animierte WebP dekodieren kann; falls ja, werden sie wie animierte GIFs behandelt (D-07), sonst bleibt die klare Ablehnung.

### Namensraum und Muster (Haken 2)
- **D-09:** Fansub-Logos/-Banner, Gruppenbanner und Fansub-Gruppenmedien bekommen einen **eigenen Media-Namensraum** (z. B. `/media/fansub/<group_id>/...`) mit **eigener `localPatterns`-Zeile**. Kein pauschales `/media/**` (Sicherheitsentscheid Phase 143 bleibt). Bestehende Dateien werden migriert oder über den neuen Pfad ausgeliefert; alte URLs dürfen nicht brechen (Redirect oder Doppel-Auslieferung, Planer entscheidet).
- **D-10:** Ein **automatischer Test** prüft, dass jede öffentliche Bild-URL-Form, die das Backend erzeugt, von `localPatterns`/`remotePatterns` erfasst ist (fehlendes Muster = E426-Seitenabsturz, siehe Memory „next/image localPatterns-Falle“).

### Bestand
- **D-11:** **Backfill:** Idempotentes Kommando erzeugt `display` (und ggf. neue Thumbs) für alle Bestandsbilder aller betroffenen Asset-Typen, inkl. Pfad-Migration aus D-09. Muss wiederholbar und ohne Datenverlust sein; Originale werden nie überschrieben.

### Leitplanken
- **D-12:** Nur `@/components/ui`-Primitives (bevorzugt `ResponsiveImage`), globale Design-Tokens, keine neuen Upload-Endpunkte (globalen Uploader und bestehende Schreibpfade erweitern), 450-Zeilen-Limit, deutsche UI-Texte mit Umlauten.
- **D-13:** Abnahme live auf `:3000` mit echten Daten auf Desktop **und** echter Mobile-Emulation (375 px, DPR 3): Galerie scharf, Netzwerk zeigt `_next/image` mit `display` als Quelle, Original erst nach Klick, kein horizontaler Überlauf. Zusätzlich RAM/CPU-Messung des Frontend-Containers bei kaltem Cache einer Galerie (VM teilt RAM mit anderen Diensten).

### Claude's Discretion
- Exaktes Format von `display` (WebP vs. JPEG) und Qualitätswert, solange D-01/D-02 erfüllt sind.
- Ob `thumb`-Breiten (300/400 px) vereinheitlicht werden; Admin darf nicht schlechter werden.
- `minimumCacheTTL` und Cache-Verhalten des Next-Optimizers.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `AGENTS.md`, `CLAUDE.md`: Regeln (globale UI-Primitives, 450 Zeilen, Umlaute, Arbeit auf der VM/main).
- `docs/engineering/implementation-contract.md`, `docs/api/api-contracts.md`: OpenAPI/DTO/Frontend-Synchronität.
- `frontend/next.config.mjs` (`images`-Block, `localPatterns` mit Begründung T-143-07-01).
- `frontend/src/components/ui/ResponsiveImage*` (bestehendes Primitive + Config-Test).
- `backend/internal/handlers/media_upload.go`, `media_upload_image.go`, `admin_content_release_version_media.go`, `admin_content_release_version_media_replace.go`, `fansub_media_upload.go`, `app_profile.go`, `app_profile_story_image.go`, `image_animated_webp.go`, `services/media_service.go`, `services/media_service_segment.go`.
- `.planning/phases/143-*` (localPatterns-Härtung), `.planning/phases/172-*` (segment_preview über globalen Uploader).
</canonical_refs>

### Harte Nutzervorgabe (2026-10-02)
- **D-14:** **Kein neuer Uploader**, kein neuer Upload-Endpunkt, keine neue Dropzone/Upload-UI. Die Display-Variante entsteht ausschließlich in den bestehenden Schreibpfaden (globaler Uploader `POST /api/v1/admin/upload`, Release-Version-Media, Fansub-Media-Upload, Profil-Uploads, Segment-Preview) und im Backfill-Kommando. Gemeinsame Bildverarbeitung darf als Hilfsfunktion/Service extrahiert werden, nie als neuer HTTP-Endpunkt. (Phase 172 musste genau das zurückbauen.)

### Entscheidungen nach Research (2026-10-02)
- **D-15 (Story-Bilder angleichen, löst D-06-Widerspruch):** Profil-Story-Bilder (`app_profile_story_image.go`) speichern künftig ebenfalls das echte 1:1-Original (EXIF/GPS entfernt, wie bei D-06) plus eine `display`-Variante. Die bisherige Verkleinerung auf 1600 px als `"original"` entfällt für neue Uploads. Bestehende Story-Bilder bleiben bei ihren vorhandenen 1600-px-Dateien (ein echtes Original existiert für sie nicht mehr); der Backfill erzeugt für sie nur die `display`-Variante aus dem vorhandenen Bild, überschreibt aber nichts.
- **D-16 (`imageDisplay.ts` bleibt getrennt):** Der bestehende On-the-fly-Resizer `frontend/src/lib/server/imageDisplay.ts` (Phase 159-04, sharp-basiert, nur Jellyfin/Anime-Backdrop, nicht persistiert) bleibt unverändert und unangetastet. Die neue persistierte `display`-Variante aus dieser Phase gilt ausschließlich für selbst gespeicherte Bilder (die in `media_files` o. ä. verwalteten Schreibpfade), nicht für Jellyfin-Quellen.
- **D-17 (Fansub-Namensraum, harter Umzug mit Redirect):** Bestehende Fansub-Logo-/Banner-/Gruppenmedien-Dateien werden per Backfill/Migration nach `/media/fansub/...` verschoben (siehe D-09). Alte URLs (`/api/v1/media/files/...` bzw. flache `/media/...`-Pfade) leiten dauerhaft (HTTP 301) auf die neuen Pfade um. Kein Dual-Serving auf Dauer — nur ein Speicherort, alte Links bleiben über den Redirect gültig.
