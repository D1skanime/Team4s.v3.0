# Phase 173: Öffentliche Bildqualität – zusätzliche Display-Variante (Backend) - Research

**Researched:** 2026-10-02
**Domain:** Go backend image processing / media variant pipeline + Next.js image optimization contract
**Confidence:** HIGH (all write-path file:line claims verified by reading the live code; FFmpeg animated-WebP decode/encode capability verified by a live test run inside the actual backend container; `media_files.variant` schema verified from the migration SQL)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Variantenmodell):** Jeder öffentliche Bild-Schreibpfad erzeugt zusätzlich zur bestehenden Variante `thumb` eine neue Variante **`display`**: lange Kante max. **1920 px**, **nie hochskalieren**, hohe Qualität (WebP oder JPEG ≥ 88, Planer entscheidet anhand Kompatibilität). `display` wird als `media_files`-Variante bzw. analog im jeweiligen Speichermodell abgelegt.
- **D-02:** Public-Komponenten nutzen `display` als Quelle der Next.js-Bildoptimierung (`ResponsiveImage`/`next/image` ohne `unoptimized`, mit korrekten `sizes`). `qualities` in `next.config.mjs` auf ca. 85 anheben.
- **D-03:** Klick zeigt das Original (Lightbox/Galerie-Detail). Ohne Klick wird das Original öffentlich nie geladen.
- **D-04:** Admin-/Bearbeitungsoberflächen (`/admin/**`, `/me/**`, Editoren, DnD-Listen) bleiben beim `thumb`. Keine Änderung dort außer Typ-/API-Erweiterung.
- **D-05:** Die API liefert zusätzlich ein `display_url` (Fallback-Kette serverseitig: display → original). OpenAPI/DTO/Frontend-Typen synchron halten.
- **D-06 (Original):** Das Original wird immer gespeichert und bleibt die Quelle aller Varianten. EXIF/GPS müssen weiterhin entfernt werden (wie bisher bei Release-Version-Media); wo verlustfreies Entfernen nicht möglich ist, bleibt Neu-Kodieren zulässig. WebP-Uploads dürfen nicht mehr als `.jpg` abgelegt werden.
- **D-07 (Animierte Bilder):** Animierte GIFs bekommen eine animierte `display`-Variante (Empfehlung: animiertes WebP via FFmpeg, lange Kante max. 960 px, Endlosschleife) plus ein statisches `thumb` aus Frame 0. Animierte Varianten laufen NICHT durch die Next.js-Optimierung (`unoptimized` gezielt nur dort).
- **D-08 (Animiertes WebP):** Wird heute abgelehnt (`image_animated_webp.go`, Commit `aec8e587`). Research sollte klären, ob FFmpeg im Container animiertes WebP dekodieren kann; falls ja, Behandlung wie GIF (D-07), sonst bleibt die Ablehnung. **→ Research-Ergebnis siehe "Harte Vorgabe"-Abschnitt und Pitfall 1: Ablehnung bleibt bestehen.**
- **D-09 (Namensraum):** Fansub-Logos/-Banner, Gruppenbanner und Fansub-Gruppenmedien bekommen einen eigenen Media-Namensraum (z. B. `/media/fansub/<group_id>/...`) mit eigener `localPatterns`-Zeile. Kein pauschales `/media/**` (Sicherheitsentscheid Phase 143 bleibt). Bestehende Dateien werden migriert oder über den neuen Pfad ausgeliefert; alte URLs dürfen nicht brechen (Redirect oder Doppel-Auslieferung, Planer entscheidet).
- **D-10:** Ein automatischer Test prüft, dass jede öffentliche Bild-URL-Form, die das Backend erzeugt, von `localPatterns`/`remotePatterns` erfasst ist.
- **D-11 (Backfill):** Idempotentes Kommando erzeugt `display` (und ggf. neue Thumbs) für alle Bestandsbilder aller betroffenen Asset-Typen, inkl. Pfad-Migration aus D-09. Muss wiederholbar und ohne Datenverlust sein; Originale werden nie überschrieben.
- **D-12 (Leitplanken):** Nur `@/components/ui`-Primitives (bevorzugt `ResponsiveImage`), globale Design-Tokens, keine neuen Upload-Endpunkte (globalen Uploader und bestehende Schreibpfade erweitern), 450-Zeilen-Limit, deutsche UI-Texte mit Umlauten.
- **D-13 (Abnahme):** Live auf `:3000` mit echten Daten auf Desktop UND echter Mobile-Emulation (375 px, DPR 3): Galerie scharf, Netzwerk zeigt `_next/image` mit `display` als Quelle, Original erst nach Klick, kein horizontaler Überlauf. Zusätzlich RAM/CPU-Messung des Frontend-Containers bei kaltem Cache einer Galerie.
- **D-14 (Harte Nutzervorgabe):** Kein neuer Uploader, kein neuer Upload-Endpunkt, keine neue Dropzone/Upload-UI. Die Display-Variante entsteht ausschließlich in den bestehenden Schreibpfaden und im Backfill-Kommando. Gemeinsame Bildverarbeitung darf als Hilfsfunktion/Service extrahiert werden, nie als neuer HTTP-Endpunkt. (Phase 172 musste genau das zurückbauen — siehe Abschnitt unten für die genauen Fakten.)

### Claude's Discretion
- Exaktes Format von `display` (WebP vs. JPEG) und Qualitätswert, solange D-01/D-02 erfüllt sind.
- Ob `thumb`-Breiten (300/400 px) vereinheitlicht werden; Admin darf nicht schlechter werden.
- `minimumCacheTTL` und Cache-Verhalten des Next-Optimizers.

### Deferred Ideas (OUT OF SCOPE)
- Änderungen am Review-Workflow.
- Neue Upload-Endpunkte (siehe D-14 — explizit verboten, nicht nur "deferred").
- Bildbearbeitung/Cropping-UI.
</user_constraints>

<phase_requirements>
## Phase Requirements

No formal REQ-173-xx IDs exist yet in `.planning/REQUIREMENTS.md` — STATE.md line 404 confirms Phase 173 is currently "Nur add-phase — noch nicht geplant." The planner should derive REQ-173-01..NN directly from decisions D-01 through D-14 (one requirement per decision is the pattern used for Phase 164/172), since each decision is independently testable. No separate requirement-support table is possible until those IDs exist; this research is organized so each D-NN maps 1:1 to a concrete file/insertion point below.
</phase_requirements>

## Harte Vorgabe — kein neuer Endpunkt (lest dies zuerst)

**Was in Phase 172 tatsächlich passiert ist (verifiziert per `git log`/`git show` und `172-UAT.md`):**
Plan 172-05 und 172-08 bauten einen **komplett neuen, dedizierten Upload-Endpunkt**
(`POST /api/v1/admin/anime/:id/segments/:segmentId/preview-image` + `GET .../candidates` +
`POST .../attach` + `POST .../reset`, dazu eine eigene Dropzone-Komponente im Frontend). Das
wurde nach einem abgebrochenen Agentenlauf **komplett zurückgebaut** (Commits `472bbf2d`,
`afdb289a`, `c5238851`, `06c4aeae`, dokumentiert in `172-UAT.md` Zeile 40: *"172-08/09 wurden
nach Abbruch des Agentenlaufs manuell umgesetzt (globaler Uploader)"*). Die finale, abgenommene
Lösung ist: **kein eigener Endpunkt** — Upload läuft über den **globalen Uploader**
`POST /api/v1/admin/upload` mit einem neuen `asset_type=segment_preview`-Wert, und Zuordnung
läuft über `PUT /api/v1/admin/anime/:id/segments/:segmentId/preview-image` (ein reiner
Zuordnungs-Endpunkt, der nur eine bereits hochgeladene `media_id` verknüpft — kein Upload selbst).

**Was das für Phase 173 bedeutet:** Dieselbe Falle ist hier genauso wahrscheinlich, weil
"Display-Variante erzeugen" sich wie "einen neuen verarbeitenden Endpunkt bauen" anfühlt. Es
gibt **keinen** solchen Endpunkt zu bauen. Jeder der folgenden 6 Schreibpfade bekommt die
`display`-Erzeugung **inline**, an einer Stelle, an der heute schon `thumb` erzeugt wird (oder,
wo noch kein `thumb` existiert, direkt neben der `original`-Speicherung):

| # | Schreibpfad | Datei | Exakte Einfügestelle (heute) |
|---|---|---|---|
| 1 | Globaler Uploader (`POST /api/v1/admin/upload`, alle `asset_type`-Werte inkl. `segment_preview`) | `backend/internal/handlers/media_upload_image.go` | Funktion `processImage` (Zeilen 31–156): `thumb` wird bei Zeile 75–89 erzeugt (`imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)` → `imaging.Save`). `display` gehört direkt danach, vor der `files` Transaktion (Zeile 106). **Dies ist zugleich der Insertion-Point für Pfad 5 (Segment-Auto-Preview) und den Backfill-Fall**, weil `StoreGeneratedAnimeImage` (`media_upload_segment_preview.go:119`) und `cmd/migrate-preview-backfill/backfill.go:130` beide `processImage` über denselben Aufrufpfad durchlaufen. Eine Änderung hier deckt 3 von 6 Fällen gleichzeitig ab. |
| 2 | Release-Version-Media Upload | `backend/internal/handlers/admin_content_release_version_media.go` | Thumb wird über die geteilte Helper-Funktion `generateRVMThumbnail` (Zeilen 114–144, `rvmThumbnailWidth = 400` bei Zeile 39) erzeugt und bei Zeile 397 aufgerufen; gespeichert bei Zeile 438, DB-Insert bei Zeile 483 (`InsertMediaFileWithStatus(..., "thumb", ...)`). `display` gehört direkt neben `thumbData`-Erzeugung (Zeile 397ff.) und braucht einen eigenen `InsertMediaFileWithStatus(..., "display", ...)`-Call direkt nach Zeile 483, inkl. Cleanup in allen `removeFileQuietly`-Fehlerpfaden (Zeilen 399–530). |
| 3 | Release-Version-Media **Replace** | `backend/internal/handlers/admin_content_release_version_media_replace.go` | Identisches Muster: `generateRVMThumbnail` bei Zeile 249, Thumb-Save bei Zeile 289, DB-Insert bei Zeile 364. Die `cleanupNewFiles()`-Closure (Zeile 296–299) muss den neuen `displayPath` ebenfalls aufräumen. |
| 4a | Fansub-**Gruppenmedien**-Upload (Bilder, `kind=image`) | `backend/internal/handlers/fansub_media_upload.go` | Funktion `processOneFansubGroupMediaFile` (Zeilen 417–533): nutzt **dieselbe** geteilte `generateRVMThumbnail`-Funktion wie Pfad 2/3 (Zeile 449), Thumb-Save bei 455–460, DB-Insert bei 491. `display` direkt daneben, analog Pfad 2/3. |
| 4b | Fansub-**Logo/Banner**-Upload (`kind=logo\|banner`, kein Thumb heute!) | `backend/internal/services/media_service.go` | `SaveUpload` (Zeilen 93–151) speichert **nur** `original` — es gibt heute **gar kein** Thumb für Logo/Banner. `display` muss hier **neu eingeführt** werden (kein bestehendes Analog zum Kopieren), direkt nach dem `os.WriteFile(absolutePath, ...)` bei Zeile 127. SVG-Uploads (`allowedLogo["image/svg+xml"]`, Zeile 292) müssen von der Rasterung ausgenommen werden (ein SVG hat keine Pixelauflösung zum Herunterskalieren). |
| 5 | Segment-Auto-Preview (Render-Frame, Video-Upload-Frame) | `backend/internal/services/media_service_segment.go` (Frame-Extraktion) + `backend/internal/handlers/media_upload_segment_preview.go` (`StoreGeneratedAnimeImage`, Zeile 72–129) | Extrahiert einen JPEG-Frame (`ExtractImageFrame`/`ExtractSegmentUploadAutoPreview`, Zeilen 183–220 in `media_service_segment.go`) und reicht ihn an `StoreGeneratedAnimeImage` weiter, das intern `h.processImage(...)` (Zeile 119) aufruft — **identisch mit Pfad 1**. Kein separater Insertion-Point nötig, sobald Pfad 1 (`processImage`) die `display`-Erzeugung bekommt. |
| 6 | Profil-Uploads: Avatar / Hintergrund / Story-Bild | `backend/internal/handlers/app_profile.go` (Avatar: Zeilen 375–538, Hintergrund: 540–707) + `backend/internal/handlers/app_profile_story_image.go` (Story: Zeilen 38–208) | Drei **unterschiedliche** Muster, kein geteilter Helper: Avatar speichert einen bereits client-zugeschnittenen `original` (Zeile 457–475) + `source_original` (unbearbeitet, Zeile 476); Hintergrund füllt auf eine Banner-Fixgröße (`imaging.Fill`, Zeile 630) + `source_original`; Story-Bild resized bereits selbst auf max. 1600 px (Zeile 149, **keine echte 1:1-Originalspeicherung — siehe Pitfall 4**). Jede der drei Stellen braucht eine eigene, kleine `display`-Erzeugung direkt nach ihrem jeweiligen `imaging.Save`/`copyMultipartFileToPath`-Aufruf. |

**Shared-Helper-Empfehlung (erlaubt per D-14):** Da Pfade 2, 3 und 4a bereits `generateRVMThumbnail`
teilen, ist der risikoärmste Weg eine parallele `generateRVMDisplay(data []byte, mimeType string,
origWidth, origHeight int) (data []byte, w, h int, err error)`-Funktion direkt neben
`generateRVMThumbnail` in `admin_content_release_version_media.go` (oder ausgelagert in eine neue
Datei, falls das 450-Zeilen-Limit sonst gerissen wird — die Datei hat aktuell bereits 1296 Zeilen
und ist damit schon über dem Limit; **jede Änderung an ihr sollte die Datei gleichzeitig aufteilen**,
analog zum Phase-172-Präzedenzfall `theme_segment_preview.go` → `theme_segment_preview_writes.go`).
Für `processImage` (Pfad 1/5/Backfill) ist ein zweiter, eigenständiger Helper nötig, weil die
Funktion kein Byte-Slice sondern ein bereits dekodiertes `image.Image` vorliegen hat. **Es entsteht
an keiner Stelle ein neuer HTTP-Endpunkt — nur neue private/interne Go-Funktionen, die von
bestehenden Handlern aufgerufen werden.**

## Summary

Phase 173 fügt den Varianten-Typ `display` (lange Kante max. 1920 px, nie hochskalieren) an sechs
bestehenden Bild-Schreibpfaden hinzu, damit öffentliche Seiten über `next/image`/`ResponsiveImage`
ein echtes, serverseitig vorgerechnetes Zwischenformat ausliefern können, statt entweder ein
300–400 px breites Admin-Thumbnail (verpixelt) oder das volle Original (teuer) zu laden. Die
Datenbank braucht dafür **keine Migration** — `media_files.variant` ist bereits ein freies
`VARCHAR(50)`-Feld (Migration 0026), "display" ist einfach ein neuer Wert darin, exakt wie "thumb"
und "original" heute. Drei der sechs Schreibpfade (Release-Version-Media-Upload, -Replace,
Fansub-Gruppenmedien) teilen schon heute eine Helper-Funktion (`generateRVMThumbnail`) und können
daher einen parallelen `generateRVMDisplay`-Helper teilen. Ein vierter Pfad (globaler Uploader
`processImage`) deckt durch interne Wiederverwendung automatisch auch den Segment-Auto-Preview-Pfad
und (indirekt über `StoreGeneratedAnimeImage`) den Backfill-Fall ab. Die verbleibenden zwei Pfade
(Fansub-Logo/Banner, Profil-Avatar/-Hintergrund/-Story) haben kein Analog und brauchen eigene,
kleine Implementierungen.

FFmpeg 8.1.2 ist im Backend-Container bereits installiert (`--enable-libwebp`) und wurde in dieser
Research-Session **live getestet**: Es kann eine animierte GIF-Quelle zu einem korrekten,
animierten WebP (`VP8X`+`ANIM`-Chunks, `libwebp_anim`-Encoder) skalieren und encodieren — das
deckt D-07 vollständig ab. Es kann jedoch **keine** animierte WebP-Datei zurück dekodieren (der
native `webp`-Decoder in FFmpeg scheitert mit "image data not found", selbst an einer von FFmpeg
selbst erzeugten gültigen Animation) — das bestätigt, dass die bestehende Ablehnung in
`image_animated_webp.go` (D-08) **bestehen bleiben muss**.

Eine wichtige, von der CONTEXT.md nicht erwähnte Altlast: Das Frontend hat bereits eine **eigene,
andersartige** On-the-fly-Bildverkleinerungs-Pipeline (`frontend/src/lib/server/imageDisplay.ts` +
`imageDisplayContract.ts`, gebaut in Phase 159-04), die per `?display_width=512|760|1280|1920`
Query-Parameter mit `sharp` live WebP erzeugt (nicht persistiert), aktuell verdrahtet für
Anime-Backdrop/Banner/Logo/Cover-Bilder und die generische Jellyfin-/`/api/v1/media/files/`-Route.
Diese Pipeline überschneidet sich konzeptionell mit D-01/D-02, deckt aber eine **andere** Menge an
Quellen ab (keine `media_files`-Varianten-Assets) und ist bereits mit `unoptimized` auf
`next/image` verdrahtet. Der Planer muss explizit entscheiden, ob beide Systeme parallel bestehen
bleiben oder ob die neue Backend-`display`-Variante Teile davon ablöst — siehe Open Questions.

**Primary recommendation:** `display` als neuer `media_files.variant`-Wert ohne Schema-Migration;
JPEG-Qualität ≥88 über das bereits vorhandene `jpeg.Encode`/`imaging`-Werkzeug für statische Bilder
(kein neuer WebP-Encoder-Dependency nötig, da `disintegration/imaging` WebP nicht encodieren kann
und `govips` trotz installierter `vips`-Runtime-Lib noch nicht ins `go.mod` eingebunden ist);
FFmpeg `libwebp_anim` ausschließlich für den animierten-GIF-Sonderfall (D-07); alle sechs
Schreibpfade bekommen die `display`-Erzeugung inline, kein neuer Endpunkt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `display`-Variante erzeugen (Resize, Re-Encode, EXIF-Strip) | API/Backend (Go) | — | Bild-Verarbeitung ist zustandsbehaftete Dateisystem-/Pixel-Arbeit; muss serverseitig passieren, wo die Originaldatei bereits liegt |
| Animierte GIF→WebP-Konvertierung | API/Backend (Go, FFmpeg-Subprozess) | — | FFmpeg ist nur serverseitig verfügbar; Browser können das nicht vorverarbeiten |
| `display_url`-Fallback-Kette (display → original) | API/Backend (DTO-Projektion) | Frontend (defensiver Fallback, falls Feld fehlt) | Backend kennt die tatsächlich vorhandenen `media_files`-Zeilen; Frontend sollte den Fallback nicht neu erfinden müssen |
| Next.js-Optimierung (`next/image`/`ResponsiveImage`, deviceSizes, `qualities`) | Frontend Server (SSR/Next-Image-Pipeline) | CDN/Static (`/_next/image`-Cache) | `display` ist die Eingabe, Next erzeugt daraus die geräteabhängigen Ausgaben |
| `localPatterns`/`remotePatterns`-Allowlist | Frontend Server (Next-Config) | — | Sicherheits-Allowlist für den Next-Image-Optimizer; muss bei jedem neuen Namensraum (D-09) mitwachsen |
| Statisches Ausliefern von `/media/**` | Frontend Server (`frontend/src/app/media/[...path]/route.ts`, liest vom gemeinsamen Docker-Volume) | — | **Wichtig:** `/media/**` wird NICHT vom Go-Backend ausgeliefert, sondern von einer Next.js-Route, die direkt vom Dateisystem liest (`MEDIA_BASE_PATH`). Ein neuer Namensraum (D-09, z. B. `/media/fansub/**`) braucht ggf. keine Backend-Routing-Änderung, nur eine neue `localPatterns`-Zeile — die Datei liegt ja schon im geteilten Volume. |
| Fansub-Gruppenmedien-Auslieferung (aktuell) | API/Backend (`GET /api/v1/media/files/:filename`, `backend/cmd/server/main.go:451`) | — | Heute eine **andere** Route als `/media/**` — flach, ohne Namensraum, über das Backend, nicht über die Next.js-Datei-Route. D-09 verlangt die Migration auf das `/media/fansub/<group_id>/...`-Schema, analog zu `/media/anime/**`. |
| Backfill (Bestandsbilder) | API/Backend (eigenständiges CLI-Kommando, kein HTTP) | — | Muss offline/idempotent laufen können, ohne Live-Traffic zu beeinflussen; exakt wie `cmd/migrate-preview-backfill` aus Phase 172 |

## Standard Stack

### Core (bereits vorhanden — keine neuen externen Abhängigkeiten nötig)
| Library | Version (verifiziert) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/disintegration/imaging` | bereits in `go.mod` (unverändert seit vorherigen Phasen) | Resize/Fit/Save (JPEG/PNG/GIF) | Wird schon in allen 6 Schreibpfaden für `thumb`/`original` genutzt; kein Grund für ein zweites Resize-Werkzeug |
| `image/jpeg` (stdlib) `jpeg.Encode(..., &jpeg.Options{Quality: N})` | stdlib | JPEG-Encoding mit explizitem Qualitätswert | Schon in `generateRVMThumbnail` (Qualität 85) verwendet; D-01 verlangt nur `>=88`, reine Konstantenänderung für den neuen Helper |
| FFmpeg | **8.1.2** (live verifiziert: `docker compose exec team4sv30-backend ffmpeg -version`) mit `--enable-libwebp` | Animiertes GIF → animiertes WebP (D-07), Frame-Extraktion (bereits genutzt) | Bereits im `backend/Dockerfile` installiert (`apk add ffmpeg`), bereits für Segment-Render und Video-Thumbs im Einsatz; **kein neues Paket** |
| `sharp` (Node, Frontend) | bereits in `frontend/package.json` (für `frontend/src/lib/server/imageDisplay.ts`) | On-the-fly-Resize für die bestehende, separate `imageDisplay`-Pipeline (Phase 159-04) | Nicht Teil dieser Phase's Backend-Scope, aber relevant für die Architektur-Entscheidung (siehe Open Questions) |

### Explizit NICHT hinzuzufügen
| Kandidat | Warum nicht |
|---|---|
| `govips` / `bimg` (cgo-Bindings für `libvips`) | Die Alpine-`vips`-Runtime-Bibliothek ist im `Dockerfile` installiert, aber **nicht** im `go.mod` eingebunden (verifiziert: `grep -rln "govips\|vips\." backend/internal` liefert keine Treffer). Ein Grund für die Installation ist im Dockerfile-Kommentar nicht dokumentiert (evtl. Vorbereitung für eine spätere Phase). Für D-01 reicht JPEG≥88 oder FFmpeg-basiertes WebP — ein neues cgo-Build-Dependency nur für diese Phase einzuführen wäre unverhältnismäßig. |
| `github.com/chai2010/webp` oder ähnliche reine Go-WebP-Encoder | Würde eine neue externe Abhängigkeit einführen, nur um WebP statt JPEG zu erzeugen — D-01 erlaubt explizit JPEG≥88 als gleichwertige Option ("Planer entscheidet anhand Kompatibilität"). |

### Alternativen Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JPEG≥88 für statische `display` | FFmpeg `-vcodec libwebp` (CLI-Shellout, kein neuer Go-Import) | Kleinere Dateien (WebP ca. 25–30 % kleiner bei gleicher visueller Qualität), aber ein Subprozess-Aufruf pro Bild statt reinem In-Process-Go-Code — höhere Fehlerfläche (Timeout, Exit-Code-Handling), zusätzliche Tests nötig. Empfehlung: JPEG≥88 zuerst, WebP nur falls Dateigröße nach Live-Messung (D-13) ein Problem bleibt. |

**Installation:** Keine — alle benötigten Werkzeuge sind bereits installiert und im Einsatz.

**Version verification:**
```
$ docker compose exec team4sv30-backend ffmpeg -version
ffmpeg version 8.1.2 ... --enable-libwebp ...
libavutil 60.26.102 / libavcodec 62.28.102
```
Live gegen den tatsächlich laufenden `team4sv30-backend`-Container ausgeführt (nicht angenommen).

## Package Legitimacy Audit

Diese Phase installiert **keine neuen externen Packages** (Go-Module oder npm-Dependencies). Alle
verwendeten Werkzeuge (`disintegration/imaging`, stdlib `image/jpeg`, FFmpeg-Binary, `sharp` im
Frontend) sind bereits im Projekt vorhanden und in Produktion im Einsatz. Der Package-Legitimacy-Gate
entfällt daher für diese Phase — es gibt nichts zu prüfen.

**Packages removed due to slopcheck [SLOP] verdict:** keine (kein Lauf nötig, keine neuen Packages)
**Packages flagged as suspicious [SUS]:** keine

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────────┐
                     │         6 bestehende Schreibpfade            │
                     │  (POST /admin/upload, RVM upload/replace,    │
                     │   Fansub-Media, Profil-Uploads, Segment-     │
                     │   Auto-Preview, Backfill-CLI)                │
                     └───────────────┬───────────────────────────────┘
                                     │  original bytes (bereits vorhanden)
                                     ▼
                     ┌─────────────────────────────────────────────┐
                     │   NEU: display-Erzeugung (inline, kein      │
                     │   Endpunkt)                                  │
                     │   - statisch: Resize longEdge<=1920,         │
                     │     nie hochskalieren, JPEG>=88 (oder WebP)   │
                     │   - animiertes GIF: FFmpeg -> animiertes      │
                     │     WebP, longEdge<=960, loop=0               │
                     │   - SVG: keine Rasterung, display=original   │
                     └───────────────┬───────────────────────────────┘
                                     │  display bytes
                                     ▼
              ┌──────────────────────────────────────────────────┐
              │  media_files INSERT (variant='display')           │
              │  -- gleiche Tabelle, gleiches Muster wie 'thumb'   │
              │  -- analog in RVM/Fansub-Spezialtabellen            │
              └───────────────────────┬────────────────────────────┘
                                      │
                                      ▼
              ┌──────────────────────────────────────────────────┐
              │  API-Response: + display_url (Fallback: display    │
              │  -> original), thumbnail_url/original_url bleiben   │
              └───────────────────────┬────────────────────────────┘
                                      │
                                      ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Next.js Frontend (Public-Komponenten)                            │
   │  ResponsiveImage/next-Image mit src=display_url, OHNE unoptimized  │
   │  (außer animierte Varianten -> gezielt unoptimized)                │
   └───────────────────────┬──────────────────────────────────────────┘
                           │  GET /_next/image?url=<display_url>&w=..&q=85
                           ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Next Image Optimizer (muss die URL via localPatterns/            │
   │  remotePatterns erlauben -- D-09/D-10 Test)                        │
   └───────────────────────┬──────────────────────────────────────────┘
                           │  same-origin fetch
                           ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  frontend/src/app/media/[...path]/route.ts (liest vom geteilten    │
   │  Docker-Volume, NICHT vom Go-Backend!) ODER                        │
   │  GET /api/v1/media/files/:filename (Go-Backend, Fansub-Legacy-Pfad) │
   └──────────────────────────────────────────────────────────────────┘

   Separates, bereits bestehendes System (NICHT Teil dieser Phase, aber
   überlappend -- siehe Open Questions):
   ┌──────────────────────────────────────────────────────────────────┐
   │  frontend/src/lib/server/imageDisplay.ts (?display_width=...)      │
   │  -- sharp-basiertes On-the-fly-Resize, NICHT persistiert,           │
   │     aktuell nur für Anime-Backdrop/Banner/Logo + Jellyfin-Bilder    │
   └──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Backend, keine neuen Dateien zwingend nötig)
```
backend/internal/handlers/
├── admin_content_release_version_media.go       # +generateRVMDisplay-Aufruf (Helper evtl. ausgelagert)
├── admin_content_release_version_media_display.go # NEU, falls 1296-Zeilen-Datei dadurch weiter wächst (450-Zeilen-Regel)
├── admin_content_release_version_media_replace.go # +display-Insert, cleanupNewFiles erweitert
├── fansub_media_upload.go                        # +display für Gruppenmedien (teilt generateRVMDisplay)
├── media_upload_image.go                         # +display in processImage (deckt Pfad 1+5+Backfill ab)
├── app_profile.go                                # +display für Avatar + Hintergrund
├── app_profile_story_image.go                    # +display, ggf. echte Original-Speicherung ergänzen (Pitfall 4)
└── image_animated_webp.go                        # unverändert -- Ablehnung bleibt (D-08 Ergebnis)

backend/internal/services/
├── media_service.go                              # +display für Logo/Banner (SaveUpload), SVG-Ausnahme
└── media_service_segment.go                      # unverändert (Pfad 5 läuft über processImage)

backend/cmd/migrate-display-backfill/             # NEU -- analog cmd/migrate-preview-backfill (Phase 172)
├── main.go
├── backfill.go
└── backfill_test.go
```

### Pattern 1: Geteilter Thumbnail-Helper als Vorlage für den Display-Helper
**Was:** `generateRVMThumbnail(data []byte, mimeType string) (thumbData []byte, w, h int, err error)` wird
heute identisch von drei Handlern aufgerufen (RVM-Upload, RVM-Replace, Fansub-Gruppenmedien).
**Wann verwenden:** Für den neuen `display`-Fall exakt dasselbe Muster duplizieren (eigene Funktion,
eigener Parametername, aber gleiche Aufrufsignatur), damit alle drei Call-Sites nur eine Zeile
Mehraufwand haben.
**Beispiel (Quelle: `backend/internal/handlers/admin_content_release_version_media.go:114-144`, echter Code):**
```go
// generateRVMThumbnail creates a static JPEG thumbnail from image data.
func generateRVMThumbnail(data []byte, mimeType string) ([]byte, int, int, error) {
	var src image.Image
	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		// ... frame 0 ...
		src = decoded.Image[0]
	} else {
		decoded, _, err := image.Decode(bytes.NewReader(data))
		src = decoded
	}
	thumb := imaging.Resize(src, rvmThumbnailWidth, 0, imaging.Lanczos)
	buf := new(bytes.Buffer)
	jpeg.Encode(buf, thumb, &jpeg.Options{Quality: 85})
	bounds := thumb.Bounds()
	return buf.Bytes(), bounds.Dx(), bounds.Dy(), nil
}
```
Der neue `generateRVMDisplay` braucht zusätzlich eine "nie hochskalieren"-Prüfung
(`if src.Bounds().Dx() <= 1920 && src.Bounds().Dy() <= 1920 { /* Original-Bytes direkt übernehmen, kein Resize */ }`)
und sollte `imaging.Resize` nur mit der **langen Kante** aufrufen (bei Hochformat-Bildern die
Höhe begrenzen, nicht die Breite — `imaging.Resize` mit `width=0` skaliert nach Höhe).

### Pattern 2: Animiertes GIF → animiertes WebP (live verifiziert, D-07)
**Was:** FFmpeg kann eine animierte GIF-Quelle direkt zu einem korrekt animierten WebP
(`VP8X`+`ANIM`+`ANMF`-Chunks) skalieren und re-encodieren, inklusive Endlosschleife.
**Wann verwenden:** Ausschließlich für `mimeType == "image/gif"` UND tatsächlich animiert (mehr als
1 Frame, bereits per `gif.DecodeAll` prüfbar wie in `generateRVMThumbnail`).
**Live-verifizierter Befehl (ausgeführt in `team4sv30-backend`, Ergebnis: gültige Animation, bestätigt per Hex-Dump):**
```bash
ffmpeg -i original.gif -loop 0 -vf "scale='min(960,iw)':'min(960,ih)':force_original_aspect_ratio=decrease:flags=lanczos" \
  -vcodec libwebp_anim display.webp
```
Hex-Dump der erzeugten Datei zeigt `RIFF....WEBPVP8X....ANIM....ANMF...` — eine valide, von
`isAnimatedWebP()` (dem bestehenden Erkennungs-Code in `image_animated_webp.go:14-19`) auch korrekt
als "animiert" klassifizierte Datei. **Scale-Filter-Hinweis:** `min(960,iw)` verhindert Hochskalieren
(erfüllt D-01's "nie hochskalieren" auch für den animierten Fall).

### Pattern 3: "Nie hochskalieren" ist NICHT der Default von `imaging.Resize`
**Was:** `imaging.Resize(img, targetWidth, 0, imaging.Lanczos)` skaliert IMMER auf `targetWidth`,
auch wenn das Original kleiner ist (reines Hochskalieren möglich). Das bestehende Thumb-Erzeugungs-
Muster (300/400 px) verlässt sich bisher nie auf diese Eigenschaft, weil Admin-Originale praktisch
immer größer als 400 px sind — für die `display`-Variante mit 1920 px als Ziel ist das keine
sichere Annahme mehr (viele Fansub-Logos/-Banner, Avatare und ältere Release-Bilder sind kleiner).
**Wann beachten:** Jede neue `display`-Erzeugung muss vor dem Resize-Aufruf die Originaldimensionen
prüfen und bei `max(width,height) <= 1920` die Originalbytes 1:1 (oder nur neu-encodiert fürs
Format, aber nicht skaliert) übernehmen.

### Anti-Patterns to Avoid
- **Einen neuen HTTP-Endpunkt für "Display-Variante generieren" bauen** (egal ob synchron oder als
  Hintergrund-Job mit Trigger-Endpunkt) — das ist exakt das, was in Phase 172 zurückgebaut wurde.
  Die Erzeugung muss ausschließlich als Seiteneffekt bestehender Schreibpfade + des Backfill-CLI
  passieren.
- **`imaging.Save` für WebP-Output verwenden** — die Bibliothek kann WebP nur dekodieren, nicht
  encodieren (Kommentar in `media_upload_image.go:26`: *"WebP is decode-only in this upload path for
  now; imaging.Save cannot encode it."*). Ein `imaging.Save(img, "display.webp")`-Aufruf würde
  entweder einen Laufzeitfehler werfen oder (je nach Dateinamenserkennung) eine falsch benannte JPEG-
  Datei erzeugen. WebP-Output nur über FFmpeg-Shellout oder JPEG≥88 stattdessen.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Lange Kante begrenzen, nie hochskalieren" | Eigene Aspect-Ratio-Mathematik mit Breite/Höhe-Vergleich pro Call-Site | Eine einzige geteilte Helper-Funktion (`generateRVMDisplay`-Analog), die diese Logik einmal korrekt implementiert und von allen 3 RVM/Fansub-Call-Sites wiederverwendet wird | Das Original-Pattern (`generateRVMThumbnail`) existiert exakt deshalb schon — Duplizieren der Logik an 3+ Stellen ist der häufigste Weg, wie Edge Cases (Hochformat, quadratisch, bereits kleiner als Ziel) in einer der Stellen vergessen werden |
| Animierte WebP-Erkennung | Einen neuen Decoder/Header-Parser schreiben | Die bestehende `isAnimatedWebP()`-Funktion (`image_animated_webp.go:14`, prüft `VP8X`+Animations-Flag-Bit) ist bereits korrekt und wird bereits an 2 Stellen (`media_upload.go:327`, RVM-Dateivalidierung) genutzt | Header-Parsing für Container-Formate ist eine klassische Off-by-one-/Byte-Order-Fehlerquelle; die bestehende Funktion ist schon production-verifiziert |
| Idempotenter Backfill-Lauf (keine Doppelverarbeitung) | Eine neue Ad-hoc-"already processed"-Markierung erfinden | Das SQL-Exclusion+zweiter-Race-Guard-Muster aus `cmd/migrate-preview-backfill/backfill.go` (Zeilen 81–90: `SELECT DISTINCT ON` mit Ausschluss bereits verarbeiteter Zeilen, plus eine zweite, race-sichere `UPDATE`-Bedingung) 1:1 kopieren | Exakt dasselbe Problem (Backfill für neue `media_files`-Variante über Bestandsdaten) wurde 1 Tag vorher in Phase 172 gelöst und live gegen `team4s_v2` verifiziert |

**Key insight:** In diesem Codebase gibt es für fast jedes Teilproblem dieser Phase bereits ein
funktionierendes, getestetes Analog aus einer vorherigen Phase (meist 143, 159 oder 172). Die
größte Fehlerquelle ist nicht fehlendes Wissen, sondern das Ignorieren des nächstliegenden Analogs
und das Neuerfinden einer eigenen, leicht abweichenden Lösung.

## Common Pitfalls

### Pitfall 1: Animiertes WebP als Input weiterhin unmöglich zu verarbeiten (D-08)
**What goes wrong:** Ein Agent könnte versuchen, D-08 "aufzulösen", indem er FFmpeg direkt auf eine
hochgeladene animierte WebP-Datei ansetzt, um sie zu akzeptieren.
**Why it happens:** FFmpeg kann animiertes WebP **encodieren** (`libwebp_anim`), was den Eindruck
erwecken kann, es könne auch **dekodieren**.
**How to avoid:** Live-Test in dieser Research-Session (synthetische animierte WebP-Datei, von
FFmpeg selbst mit `libwebp_anim` erzeugt, dann mit `ffmpeg -i` zurückgelesen) zeigt: Dekodierung
schlägt fehl (`[webp @ ...] image data not found`, `ffprobe` meldet `nb_frames=N/A`,
`width=0, height=0`). Die bestehende Ablehnung in `image_animated_webp.go` bleibt korrekt — D-08
sollte als "Ablehnung bestätigt, keine Änderung" umgesetzt werden, nicht als neue Decode-Fähigkeit.
**Warning signs:** Jeder PR, der `golang.org/x/image/webp` oder FFmpeg für animiertes-WebP-Decode
nutzt, sollte einen Review-Fail auslösen — es gibt keine stabile Decode-Bibliothek dafür im
aktuellen Stack.

### Pitfall 2: `imaging.Save` kann kein WebP schreiben
**What goes wrong:** Ein naiver `display.webp`-Dateiname + `imaging.Save(img, path)`-Aufruf
produziert entweder einen Fehler oder (abhängig von imaging's internem Format-Switch über die
Dateiendung) eine fehlerhafte Datei.
**Why it happens:** `disintegration/imaging` unterstützt laut eigenem Code-Kommentar in
`media_upload_image.go:26` WebP nur beim Dekodieren, nicht beim Encodieren.
**How to avoid:** Für statische `display`-Varianten JPEG≥88 über `jpeg.Encode` nutzen (wie
`generateRVMThumbnail` es bereits für Thumbs tut), oder bei WebP-Wunsch explizit FFmpeg
shellouten (`ffmpeg -i in.jpg -vcodec libwebp -quality 88 out.webp` — als `libwebp`-Encoder in
dieser Session ebenfalls bestätigt verfügbar).
**Warning signs:** Jeder Code, der `imaging.Save(..., "*.webp")` aufruft, ohne vorher explizit
WebP-Encoder-Unterstützung zu verifizieren.

### Pitfall 3: "Nie hochskalieren" für kleine Fansub-Logos/-Banner und Avatare
**What goes wrong:** Ein 150×150px-Fansub-Logo oder ein kleines, vor Jahren hochgeladenes Avatar-Bild
wird durch ein naives `imaging.Resize(img, 1920, 0, ...)` künstlich auf 1920 px hochskaliert —
Ergebnis: ein unscharfes, größeres `display`-Bild, das schlechter aussieht als das Original.
**Why it happens:** Siehe Pattern 3 — `imaging.Resize` prüft die Ausgangsgröße nicht selbst.
**How to avoid:** Explizite Prüfung `if max(w,h) <= 1920 { display = original (re-encodiert fürs
Zielformat, aber NICHT skaliert) }` in jedem der 6 Helper.
**Warning signs:** Live-UAT (D-13) mit einem bewusst kleinen Testbild (z. B. 200×200 Logo)
durchführen und prüfen, dass `display`-Breite == Original-Breite bleibt.

### Pitfall 4: Profil-Story-Bild hat heute KEIN echtes 1:1-Original (Widerspruch zu D-06)
**What goes wrong:** `UploadOwnProfileStoryImage` (`app_profile_story_image.go:148-150`) resized das
Bild bereits beim Upload auf max. 1600 px und speichert **nur diese eine Datei** als `"original.<ext>"`
— es gibt keine zweite, unveränderte Datei. D-06 verlangt aber "Das Original wird immer gespeichert
… Ziel ist eine 1:1-Ablage der hochgeladenen Datei".
**Why it happens:** Diese Logik existierte schon vor Phase 173 (eigene D-19-Entscheidung aus einer
früheren Phase) und wurde nie als "Original" im Sinne von Phase 173 hinterfragt.
**How to avoid:** Der Planer muss das explizit adressieren: entweder (a) den heute gespeicherten
1600px-Scan zur neuen `display`-Variante umbenennen und zusätzlich eine echte, unveränderte
Originaldatei einführen (Breaking Change am Speichermodell dieses einen Pfads), oder (b) diesen
Pfad bewusst als Ausnahme von D-06 dokumentieren (mit Nutzer-Rückfrage, da D-06 "immer" sagt).
**Warning signs:** Ein Plan, der Story-Bilder einfach "wie die anderen 5 Pfade" behandelt, ohne
diesen Unterschied zu erwähnen, hat diesen Fall übersehen.

### Pitfall 5: Die bestehende `imageDisplay.ts`-Pipeline überschneidet sich mit D-01/D-02, deckt aber andere Quellen ab
**What goes wrong:** Ein Agent könnte annehmen, "Anime-Cover/-Banner/-Logo sind schon optimiert"
(weil `AnimeMediaProvider.tsx` bereits `resolveInfoLogoURL`/`resolveInfoBannerURL` aus
`animeBackdrops.ts` nutzt, die über die sharp-basierte `imageDisplay.ts`-Pipeline laufen) und diese
Pfade fälschlich aus dem Phase-173-Scope streichen.
**Why it happens:** Es gibt bereits zwei unterschiedliche "Display"-Konzepte im Code: (1) die neue,
von Phase 173 verlangte, backend-persistierte `media_files`-Variante `display`, und (2) die
bestehende, nicht persistierte, sharp-basierte On-the-fly-Verkleinerung für Jellyfin-Backdrops und
einige Anime-Felder (`?display_width=`). Diese sind NICHT dasselbe System.
**How to avoid:** Explizit in Open Questions klären, ob (2) bestehen bleibt, abgelöst wird, oder
nur für Jellyfin-Quellen (die keine `media_files`-Zeile haben) zuständig bleibt, während (1) für
alle 6 upload-basierten Schreibpfade zuständig ist.
**Warning signs:** Code-Review, der `grep -rn "resolveAnimeImageURL\|IMAGE_DISPLAY_QUERY"` nach
Phase-173-Änderungen erneut laufen lässt, um zu prüfen, ob unbeabsichtigt zwei parallele
Resize-Pipelines für dieselbe Quelle existieren.

### Pitfall 6: `admin_content_release_version_media.go` ist bereits über dem 450-Zeilen-Limit (1296 Zeilen)
**What goes wrong:** Jede neue Funktion/Logik, die naiv in diese Datei eingefügt wird, verstößt noch
deutlicher gegen CLAUDE.md's 450-Zeilen-Produktionsdatei-Limit.
**Why it happens:** Die Datei ist historisch gewachsen und war schon vor Phase 173 zu groß.
**How to avoid:** Analog zum Phase-172-Präzedenzfall (`theme_segment_preview.go` 397 Zeilen →
Split in `theme_segment_preview_writes.go`): Den neuen `generateRVMDisplay`-Helper (und ggf. die
neuen `InsertMediaFileWithStatus(..., "display", ...)`-Aufrufe, falls als eigene Funktion
extrahierbar) in eine neue Datei `admin_content_release_version_media_display.go` auslagern, statt
die bestehende 1296-Zeilen-Datei weiter wachsen zu lassen.
**Warning signs:** `wc -l` nach jeder Task gegen 450 prüfen (wie im CLAUDE.md gefordert).

## Code Examples

### Verified: FFmpeg animiertes GIF -> animiertes WebP (live gegen `team4sv30-backend` getestet)
```bash
# Schritt 1: Synthetisches animiertes GIF erzeugen (nur zum Testen)
ffmpeg -f lavfi -i "testsrc=size=64x64:rate=5:duration=1" -loop 0 test.gif

# Schritt 2: GIF -> animiertes WebP, lange Kante <= 960px, Endlosschleife (D-07)
ffmpeg -y -i test.gif -loop 0 -vf "scale=960:-1:flags=lanczos" -vcodec libwebp_anim out_display.webp
# Ergebnis: 64650 Bytes, Hex-Dump bestätigt RIFF/WEBP/VP8X/ANIM/ANMF-Chunks (gültige Animation)
```

### Verified: Animiertes WebP kann NICHT zurückgelesen werden (bestätigt D-08's bestehende Ablehnung)
```bash
$ ffprobe -show_entries stream=nb_frames,codec_name,width,height anim_test.webp
[webp @ ...] image data not found
codec_name=webp
width=0
height=0
nb_frames=N/A
```

### Pattern: Bestehender Thumb-Helper, Vorlage für den neuen Display-Helper
```go
// Quelle: backend/internal/handlers/admin_content_release_version_media.go:136-140 (echter Code)
thumb := imaging.Resize(src, rvmThumbnailWidth, 0, imaging.Lanczos)
buf := new(bytes.Buffer)
jpeg.Encode(buf, thumb, &jpeg.Options{Quality: 85})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public-Komponenten nutzen `thumbnail_url` (300-400px) oder `original_url` (volle Größe) mit `unoptimized` | Public-Komponenten nutzen neue `display_url` (max. 1920px) ohne `unoptimized` | Phase 173 (diese Phase) | Next.js kann responsive `srcset`s aus einem schon vorbegrenzten Bild erzeugen, statt entweder zu klein (verpixelt) oder zu groß (teuer) zu laden |
| Fansub-Logo/-Banner: nur `original`, kein Thumb, flach in `media/` gespeichert | (geplant, D-09) eigener Namensraum `/media/fansub/<group_id>/...`, zusätzlich `display`-Variante | Phase 173 (geplant) | Konsistent mit dem bereits für Anime/Profil/Release-Version etablierten Namensraum-Muster (Phase 143) |

**Deprecated/outdated:**
- Flache Speicherung von Fansub-Logo/-Banner/Gruppenmedien direkt unter `media/<filename>` (kein
  Namensraum) — wird durch D-09 durch das `/media/fansub/<group_id>/...`-Schema abgelöst, analog zu
  `/media/anime/<id>/...` und `/media/profile/<id>/...`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JPEG≥88 ist für die meisten `display`-Fälle "gut genug" im Vergleich zu WebP — basiert auf allgemeinem Branchenwissen zu JPEG-vs-WebP-Kompressionsraten, nicht auf einer in dieser Session durchgeführten Messung gegen echte Team4s-Bilder. | Standard Stack / Alternativen Considered | Falls die Live-UAT (D-13) zeigt, dass JPEG-Dateien deutlich größer als nötig sind, muss der Planer zusätzliche Zeit für FFmpeg-WebP-Encoding statt JPEG einplanen. |
| A2 | Der Grund für die installierte, aber ungenutzte `vips`-Runtime-Bibliothek im Dockerfile ist nicht dokumentiert — angenommen, dass sie für eine zukünftige, noch nicht gestartete Phase vorgesehen ist, nicht für Phase 173. | Standard Stack / "Explizit NICHT hinzuzufügen" | Falls `govips` tatsächlich für eine andere, parallel laufende Initiative vorgesehen ist, könnte eine Kollision entstehen, wenn zwei Phasen gleichzeitig versuchen, es einzubinden. |
| A3 | Die geschätzten Dateigrößenreduktionen beim Wechsel von Original auf `display` (max. 1920px) wurden nicht gegen echte, repräsentative Team4s-Produktionsbilder gemessen — nur die FFmpeg-Fähigkeiten selbst wurden live verifiziert. | Summary / Standard Stack | D-13 fordert eine RAM/CPU-Messung bei kaltem Cache; falls die tatsächliche Dateigrößenreduktion kleiner ausfällt als erwartet, könnte der Performance-Gewinn geringer sein als angenommen. |

## Open Questions

1. **Soll die bestehende `imageDisplay.ts`/`?display_width=`-Pipeline (Phase 159-04) bestehen bleiben, oder überlappt sie mit dem neuen Backend-`display`-Feature?**
   - What we know: Diese Pipeline ist eine andersartige, nicht persistierte, sharp-basierte On-the-fly-Verkleinerung, aktuell verdrahtet für Anime-Backdrop/Banner/Logo (`animeBackdrops.ts`) und generische Jellyfin-/`/api/v1/media/files/`-Quellen. Sie deckt KEINE der 6 Schreibpfade aus dieser Phase ab (keine `media_files`-Varianten-Assets).
   - What's unclear: Ob der Nutzer/Planer beide Systeme parallel betreiben will (verschiedene Zwecke: Jellyfin-Quellen ohne DB-Varianten vs. upload-basierte Assets mit DB-Varianten) oder ob langfristig eine Vereinheitlichung gewünscht ist.
   - Recommendation: Für Phase 173 beide Systeme unverändert parallel lassen (kein Scope-Creep) und diese Überlappung explizit im Plan dokumentieren, damit ein künftiger Agent sie nicht versehentlich verschmilzt oder dupliziert.

2. **Wie genau soll D-09's Namensraum-Migration für Fansub-Logo/-Banner/Gruppenmedien technisch ablaufen — Umzug der physischen Dateien oder nur neue Uploads im neuen Pfad?**
   - What we know: Aktuell liegen diese Dateien flach in `media/<filename>` (über `MediaService.SaveUpload`, kein `fansubID`-Parameter in der Signatur) und werden über `GET /api/v1/media/files/:filename` (Go-Backend) ausgeliefert, NICHT über die Next.js-`/media/[...path]/route.ts`-Datei-Route.
   - What's unclear: Ob ein harter Cutover (bestehende Dateien werden beim Backfill physisch nach `/media/fansub/<group_id>/...` verschoben, `GET /api/v1/media/files/` bleibt nur als Compat-Redirect) oder Doppel-Auslieferung (beide Pfade funktionieren dauerhaft) gewünscht ist. CONTEXT.md überlässt das explizit dem Planer ("Redirect oder Doppel-Auslieferung, Planer entscheidet").
   - Recommendation: Physischen Umzug bevorzugen (Backfill verschiebt Dateien + aktualisiert `storage_path`/`public_url` in der DB), mit einem dünnen Compat-Redirect in `GET /api/v1/media/files/:filename` für extern gecachte/verlinkte alte URLs (z. B. Browser-Caches, externe Links).

3. **Avatar-Upload: Braucht der bereits client-zugeschnittene "original" wirklich noch eine separate `display`-Variante?**
   - What we know: Avatare werden heute bereits client-seitig zugeschnitten und typischerweise klein hochgeladen (`UploadOwnProfileAvatar`, kein separates großes Original im öffentlichen Rendering-Pfad außer dem unveränderten `source_original`).
   - What's unclear: Ob die CONTEXT.md-Phase-Boundary ("Member-Avatare" explizit genannt) eine `display`-Variante für Avatare zwingend fordert, auch wenn der bestehende "original" schon klein ist, oder ob das Claude's Discretion ist.
   - Recommendation: `display` trotzdem erzeugen (Konsistenz über alle 6 Pfade, geringer Zusatzaufwand, da die Datei ohnehin klein ist und kein Resize nötig sein wird dank Pitfall-3-Check), aber in der Live-UAT (D-13) explizit gegen ein großes, nicht vorab zugeschnittenes Avatar-Bild testen (falls der Upload-Flow das zulässt).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| FFmpeg (mit `libwebp`/`libwebp_anim`) | D-07 (animierte Display-Variante) | ✓ (live verifiziert im `team4sv30-backend`-Container) | 8.1.2 | — |
| `disintegration/imaging` (Go) | Statische Display-Variante (Resize/JPEG-Encode) | ✓ (bereits in `go.mod`) | unverändert | — |
| `govips`/`libvips`-Go-Bindings | Nicht benötigt für diese Phase | ✗ (Runtime-Lib installiert, aber nicht in `go.mod` eingebunden) | — | JPEG≥88 oder FFmpeg-WebP statt govips (siehe Standard Stack) |
| Docker Compose (`team4sv30-*`) | Lokales Testen/Live-UAT | ✓ | laufend (3 Tage uptime) | — |

**Missing dependencies with no fallback:** keine.
**Missing dependencies with fallback:** `govips` (nicht benötigt, siehe Standard Stack für Begründung).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Go stdlib `testing` + `testify` (`github.com/stretchr/testify`), echte Postgres-Integrationstests (Muster: `admin_content_release_version_media_test.go`, `fansub_media_upload_thumbnail_test.go`, `app_profile_story_image_test.go` existieren bereits für die 6 Schreibpfade) |
| Framework (Frontend) | Vitest 3 (`frontend/package.json` Skript `"test": "vitest run"`), inkl. `ResponsiveImage.config.test.ts` für `localPatterns`/`remotePatterns`-Verträge |
| Config file | `backend/go.mod` (kein separates Test-Config), `frontend/vitest.config.ts` |
| Quick run command | `cd backend && go test ./internal/handlers/... -run TestUploadReleaseVersionMedia` (Beispiel für einen der 6 Pfade) |
| Full suite command | `cd backend && go test ./...` und `cd frontend && npm test` |

### Phase Requirements → Test Map
> Keine REQ-173-xx-IDs existieren noch (siehe `<phase_requirements>`). Die folgende Tabelle ordnet
> stattdessen Decisions zu, da der Planer daraus die REQ-IDs ableiten wird.

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-01 (display-Erzeugung, nie hochskalieren) | Kleines Testbild (<1920px) bleibt unskaliert; großes Testbild wird auf max. 1920px lange Kante begrenzt | unit/integration | `go test ./internal/handlers/... -run TestDisplayVariant` (neu) | ❌ Wave 0 |
| D-07 (animierte GIF-Display) | Animiertes GIF erzeugt ein animiertes WebP-`display` mit korrektem `VP8X`/`ANIM`-Header | integration | `go test ./internal/services/... -run TestAnimatedDisplayVariant` (neu) | ❌ Wave 0 |
| D-08 (animiertes WebP bleibt abgelehnt) | Upload einer animierten WebP-Datei liefert weiterhin den bestehenden Fehlercode | unit (bereits vorhanden) | `go test ./internal/handlers/... -run TestAnimatedWebP` | ✅ (bestehender Test für `isAnimatedWebP`/Ablehnung) |
| D-05 (display_url-Fallback) | API-Response enthält `display_url`, fällt auf `original_url` zurück, wenn kein `display`-Media-File existiert | unit | `go test ./internal/handlers/... -run TestDisplayURLFallback` (neu) | ❌ Wave 0 |
| D-09/D-10 (localPatterns-Abdeckung) | Jede vom Backend erzeugte öffentliche Bild-URL-Form matched `localPatterns`/`remotePatterns` | unit (Vitest) | `cd frontend && npx vitest run src/components/ui/ResponsiveImage.config.test.ts` | ✅ (Datei existiert, Testfälle müssen erweitert werden) |
| D-14 (kein neuer Endpunkt) | `grep`-basierter Negativtest: keine neue Route in `cmd/server/admin_routes.go`/`main.go`, die ausschließlich "display"/"preview"-Verarbeitung ohne Zuordnung zu einem bestehenden Schreibpfad triggert | manual-only (Code-Review-Checkliste, kein automatisierter Test sinnvoll) | — | n/a |

### Sampling Rate
- **Per task commit:** Den jeweils betroffenen Handler-/Service-Test gezielt laufen lassen (z. B. `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia`).
- **Per wave merge:** `cd backend && go test ./...` und `cd frontend && npm test` (volle Suite).
- **Phase gate:** Volle Suite grün + Live-UAT (D-13) auf `:3300`/`:3000` vor `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Neue Tests für `display`-Erzeugung in jedem der 6 Schreibpfade (statische Begrenzung, "nie hochskalieren", EXIF-Strip-Erhalt)
- [ ] Neuer Test für animierte GIF→WebP-`display`-Erzeugung (D-07), inkl. Assertion auf `VP8X`/`ANIM`-Header wie in dieser Research-Session live verifiziert
- [ ] Erweiterte Testfälle in `ResponsiveImage.config.test.ts` für den neuen `/media/fansub/**`-Namensraum (D-09/D-10)
- [ ] Neues `backend/cmd/migrate-display-backfill`-Paket mit eigenen Tests, analog `cmd/migrate-preview-backfill/backfill_test.go`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Bestehende MIME-Allowlists (`allowedImageMimeTypes`, `rvmAllowedMIMETypes`, `storyImageAllowedMimeTypes`) bleiben unverändert maßgeblich; die neue `display`-Erzeugung liest nur bereits validierte `data []byte`, führt keine neue Eingabevalidierung ein |
| V12 File/Resource Handling (verwandt zu V5) | yes | Pixel-Bomb-Schutz (40 MP-Limit) ist bereits an allen 6 Pfaden vorhanden und muss vor der `display`-Erzeugung greifen (gleiche Reihenfolge wie heute für `thumb`) |
| V4 Access Control | no (keine Änderung) | Bestehende Berechtigungsprüfungen pro Schreibpfad (`permissionSvc.CanForReleaseVersion`, `segmentPreviewAuthorizer`, Platform-Admin-Guard) bleiben unverändert — die `display`-Erzeugung fügt keinen neuen Autorisierungs-Entscheidungspunkt hinzu, weil kein neuer Endpunkt entsteht (D-14) |

### Known Threat Patterns for diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| FFmpeg-Subprozess-Aufruf mit nutzerkontrolliertem Dateinamen/Pfad (Command Injection via Dateiname) | Tampering | `exec.Command` mit festen Argumentpositionen (kein Shell-Interpolation), wie bereits in `media_service_segment.go` Zeile 151/193 — dasselbe Muster für den neuen GIF→WebP-Aufruf übernehmen, niemals `sh -c` mit String-Konkatenation |
| Dekompressionsbombe (sehr große Pixelzahl trotz kleiner Dateigröße) | Denial of Service | Bereits vorhandenes 40-MP-Limit (`meta.Width*meta.Height > 40_000_000`) greift vor jeder `display`-Erzeugung, da es vor der bestehenden `thumb`-Erzeugung läuft — keine neue Prüfung nötig, nur sicherstellen, dass `display` NACH diesem Gate eingefügt wird |
| Pfad-Traversal bei neuem Fansub-Namensraum (`/media/fansub/<group_id>/...`) | Tampering | Dieselbe `isUploadPathWithinBase`-Prüfung (`media_upload.go:248-257`) für den neuen Namensraum wiederverwenden, `group_id` als reine Ganzzahl validieren (kein Freitext-Pfad-Segment) |

## Sources

### Primary (HIGH confidence — live verifiziert in dieser Session)
- `docker compose exec team4sv30-backend ffmpeg -version` / `-encoders` / `-decoders` / `-muxers` — FFmpeg 8.1.2, `libwebp`/`libwebp_anim` vorhanden, nativer `webp`-Decoder vorhanden
- Live-Test: animiertes GIF → animiertes WebP via `libwebp_anim` erfolgreich (Hex-Dump-verifiziert), animiertes WebP → Dekodierversuch schlägt fehl (`ffprobe`/`ffmpeg` Fehlerausgabe)
- `git log`/`git show` auf `aec8e587`, `472bbf2d`, `afdb289a`, `c5238851`, `06c4aeae` — exakter Beleg für den Phase-172-Endpunkt-Rückbau
- Direktes Lesen von: `media_upload.go`, `media_upload_image.go`, `image_animated_webp.go`, `admin_content_release_version_media.go`, `admin_content_release_version_media_replace.go`, `fansub_media_upload.go`, `media_service.go`, `media_service_segment.go`, `media_upload_segment_preview.go`, `app_profile.go`, `app_profile_story_image.go`, `database/migrations/0026_add_media_tables.up.sql`, `frontend/next.config.mjs`, `frontend/src/components/ui/ResponsiveImage.config.test.ts`, `frontend/src/app/media/[...path]/route.ts`, `frontend/src/lib/server/imageDisplay.ts`, `frontend/src/lib/imageDisplayContract.ts`, `frontend/src/lib/animeBackdrops.ts`, `frontend/src/components/anime/AnimeMediaProvider.tsx`, `backend/cmd/migrate-preview-backfill/backfill.go`, `backend/Dockerfile`

### Secondary (MEDIUM confidence)
- `172-UAT.md`, `172-CONTEXT.md`, `172-PATTERNS.md` — Beschreibung des Rückbaus aus Sicht der vorherigen Phase-Dokumentation (durch den Git-Log-Befund bestätigt, nicht nur angenommen)

### Tertiary (LOW confidence)
- Keine — alle zentralen Claims dieser Research wurden entweder live getestet oder direkt im Code gelesen.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — FFmpeg-Fähigkeiten live im echten Container getestet, keine neuen Dependencies nötig, alle Claims gegen den tatsächlichen Code verifiziert
- Architecture (6 Schreibpfade + Insertion Points): HIGH — jede Zeilennummer wurde durch direktes Lesen der Dateien bestätigt, nicht aus Training-Wissen übernommen
- Pitfalls: HIGH für Pitfalls 1-2 (live verifiziert) und 4 (Code gelesen), MEDIUM für Pitfall 5 (Interpretation der Phase-159-Absicht aus Code + Commit-Message, Nutzerabsicht nicht direkt bestätigt)

**Research date:** 2026-10-02
**Valid until:** 30 Tage (stabiler Stack, keine sich schnell ändernden externen Abhängigkeiten; FFmpeg-Containerversion sollte vor Implementierungsbeginn erneut mit einem Blick auf `docker compose ps`/`docker compose build` geprüft werden, falls das Docker-Image zwischenzeitlich neu gebaut wurde)
