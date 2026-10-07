# Fachaufgabe 1: Medien hochladen — vollständige Inventur

**Quelle:** 174-FOLLOWUPS.md F-15 ("Ein globaler Uploader statt Parallel-Upload-Systemen"), 174-REPORT.md Empfehlung #4.
**Methode:** Grep auf `authorizedUploadXhr`-Aufrufer (`frontend/src/lib/api/client.ts:1023`) + alle in F-15 namentlich genannten Funktionen gelesen; Backend-Gegenstücke über Routen-Registrierung (`backend/cmd/server/admin_routes.go`, `backend/cmd/server/main.go`) aufgelöst.

Spalten gemäß D-03: (a) UI-Fläche, (b) Frontend-API-Funktion, (c) Backend-Endpunkt/Handler, (d) Rechte-Aktion Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten. D-04-Klassifikation je Fund.

## Übersicht (9 von F-15 genannte Wege + Backend-Varianten)

| # | Weg | D-04 |
|---|-----|------|
| 1 | Release-Medien (Galerie-Upload) | Duplikat (Vorbild) |
| 2 | Gruppenmedien (Fansub-Community-Medien) | Duplikat (Altlast) |
| 3 | Fansub-Logo/Banner | legitim getrennt |
| 4 | Anime-Assets (Cover/Banner/Logo/Hintergrund) | legitim getrennt |
| 5 | Segment-Assets (Kara-Video) | legitim getrennt |
| 6 | Release-Theme-Assets (zwei Einstiege) | Duplikat (Implementierung) / Variante (Fachlich) |
| 7 | Profil-Avatar/-Hintergrund/-Story | Variante (untereinander), legitim getrennt (vs. Admin-Flächen) |
| 8 | Medien-Vorschläge (Member-Report) | legitim getrennt |

Zusätzlich geprüft und KEINE weiteren eigenständigen Upload-Einstiege gefunden: alle `authorizedUploadXhr`-Aufrufer (`client.ts:1023`) wurden einzeln aufgelöst (`contributions-me.ts`, `members-media.ts`, `admin/fansub-media.ts`, `admin/anime-assets.ts`, `releases.ts`, `admin/anime-release-assets.ts`) — jede Verwendung ist bereits einem der 8 obigen Wege zugeordnet. `assignAdminAnimeBannerAsset`/`assignAdminAnimeCoverAsset`/`assignAdminAnimeLogoAsset`/`assignAdminAnimeBackgroundVideoAsset` (`frontend/src/lib/api/admin/anime-assets.ts:66-103`) sind keine eigenen Uploads, sondern Slot-Zuweisungen eines bereits hochgeladenen Assets (zweistufiger Fluss, siehe Weg 4 (f)).

---

### 1. Release-Medien (Galerie-Upload im Episode-Version-Editor)

- **(a) UI:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:228` (`openUploadSheet`, Trigger-Button `:444`), Datei-Queue mit Titel/Caption pro Datei: `ReleaseVersionMediaUploadQueue.tsx:34` (Felder `:60`, Retry-Button `onRetry`-Prop).
- **(b) Frontend-API:** `uploadReleaseVersionMedia` — `frontend/src/lib/api/releases.ts:197`. Ergänzend `replaceReleaseVersionMediaFile` (Einzeldatei-Ersatz einer bestehenden Position) — `releases.ts:268`.
- **(c) Backend:** `POST /api/v1/admin/release-versions/:versionId/media` → `AdminContentHandler.UploadReleaseVersionMedia` — `backend/internal/handlers/admin_content_release_version_media_upload.go:124`. Route-Registrierung: `backend/cmd/server/admin_routes.go:186`. Replace-Pfad: `PUT .../media/:relationId/file` → `ReplaceReleaseVersionMediaFile` — `admin_content_release_version_media_replace.go:61` (Route `admin_routes.go:197`).
- **(d) Rechte:** Anzeige (Upload-Button sichtbar/aktiv): Capability-Flag `can_upload_media` — `ReleaseVersionMediaSection.tsx:141` (`canUploadMedia`), Button-Disable `:445`. Durchsetzung: `permissions.ActionReleaseVersionMediaUpload` — `admin_content_release_version_media_upload.go:140`. **Konsistent** (gleiche Aktion auf Anzeige- und Durchsetzungsseite, keine Abweichung gefunden).
- **(e) Daten:** `media_assets`/`media_files` (V2-Schema, Variante `original`/`display`) + Relationstabelle `release_version_media` (siehe `backend/internal/repository/release_version_media_repository.go`, Testbeleg `anime_contributions_member_project_repository_has_own_media_test.go:29`). Zusätzlich `release_version_media_review_lifecycle` für Review-Historie.
- **(f) Verhalten:** Mehrfachauswahl wird in die bestehende Queue **gemergt** (kein Ersetzen) — `ReleaseVersionMediaSection.tsx:242-253` (`merged.push`, Duplikate per `fileKey` übersprungen). Titel/Caption pro Datei editierbar vor dem Absenden. Retry ist nur manuell pro Datei möglich (`retryEligibility: "never"` im XHR-Layer, `releases.ts:208`). Kein Review-Gate — Status direkt aktiv; Highlight-Reihenfolge separat verwaltbar.

**D-04:** **Duplikat** (Partner: Gruppenmedien, #2). **Vorbild** für den künftigen gemeinsamen Upload-Baustein — begründet durch: Queue sammelt statt ersetzt, Titel/Caption pro Datei, expliziter Retry-Mechanismus pro Datei, konsistente Rechte-Aktion zwischen Anzeige und Durchsetzung.

---

### 2. Gruppenmedien (Fansub-Community-Medien, Review-Tab)

- **(a) UI:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx:256` (`shouldShowUploadPanel`), Panel-Komponente `GroupMediaReviewUploadPanel.tsx:35` (Dropzone `:74`, Kategorie-Select `:62`).
- **(b) Frontend-API:** `uploadFansubGroupMedia` — `frontend/src/lib/api/admin/fansub-media.ts:60`.
- **(c) Backend:** `POST /api/v1/admin/fansubs/:id/media` (Feld `kind=image`) → `FansubHandler.UploadFansubMedia` — `backend/internal/handlers/fansub_media_upload.go:42`, verzweigt intern bei `kind==image` an `uploadFansubGroupMedia` — `fansub_media_upload.go:333` (Aufruf `:90`). Route: `backend/cmd/server/admin_routes.go:111` (**gleiche Route wie Weg 3**, Dispatch über `kind`-Feld).
- **(d) Rechte:** Anzeige: `can_upload_group_media`/`can_edit_group` — `GroupMediaReviewSection.tsx:173-174` (`canUpload`). Durchsetzung: `permissions.ActionFansubGroupMediaUpload` bei `kind=image` — `fansub_media_upload.go:54-58`, **zusätzlich** ein individueller Custom-Permission-Fallback (`GetFansubGroupMediaPermissionsForAppUser(...).CanUpload`) — `fansub_media_upload.go:64-72`, den Weg 1 (Release-Medien) nicht kennt. **Abweichung gegenüber Weg 1**: zwei parallele Rechte-Ebenen (Capability-Action + Custom-Permission-Tabelle) statt einer einzigen Aktion — Befund für die Rechte-Matrix (175-08).
- **(e) Daten:** `media_assets` (V2) + Relationstabelle `fansub_group_media` (`backend/internal/repository/media_repository.go:1000`, `media_upload.go:277`).
- **(f) Verhalten:** Neue Dateiauswahl **ERSETZT** die bisherige Selektion — `GroupMediaReviewSection.tsx:342` (`setSelectedFiles(files.filter(...))`, kein Merge mit `current`). **Eine** gemeinsame Kategorie für den gesamten Batch, kein Titel/Beschreibung-Feld beim Upload selbst (nur nachträglich per `patchFansubMediaReview`). Löst `review_status=in_pruefung` aus (Review-Workflow), Release-Medien (#1) hat kein äquivalentes Gate.

**D-04:** **Duplikat** (Partner: Release-Medien, #1). **Altlast** — wird nach Zusammenführung auf den gemeinsamen Baustein entfernt (Ersetzen-statt-Sammeln-Verhalten und fehlendes Titel/Beschreibung-Feld sind bereits in 174-FOLLOWUPS F-15 als Defizit benannt, 1:1 übernommen aus 174-13).

---

### 3. Fansub-Logo/Banner (Branding-Slots der Gruppe)

- **(a) UI:** `frontend/src/components/admin/MediaUpload.tsx:235` (verwendet in Fansub-Anlegen/-Bearbeiten für Logo- und Banner-Slot).
- **(b) Frontend-API:** `uploadFansubMedia` — `frontend/src/lib/api/admin/fansub-media.ts:35`.
- **(c) Backend:** `POST /api/v1/admin/fansubs/:id/media` (Feld `kind=logo|banner`) → `FansubHandler.UploadFansubMedia` — `fansub_media_upload.go:42` (**derselbe Go-Funktions-Einstieg wie Weg 2**, Verzweigung über `kind` ab Zeile 53-56/84-92; Logo/Banner läuft NICHT in `uploadFansubGroupMedia`, sondern weiter im Hauptpfad `:116-150`).
- **(d) Rechte:** Durchsetzung: `permissions.ActionFansubGroupEdit` (kind != image) — `fansub_media_upload.go:54`. Anzeige-seitig gated über die übergeordnete Fansub-Edit-Seite (Edit-Recht der Gruppe insgesamt), kein eigenes granulares Capability-Flag für Logo/Banner separat vom allgemeinen Gruppen-Bearbeitungsrecht — **legitim**, da Branding-Slots Teil der Gruppenbearbeitung sind, nicht eines eigenen Freigabe-Workflows.
- **(e) Daten:** `media_assets` (V2) + Zuweisung über `AssignFansubMedia(fansubID, kind, mediaID, publicURL)` — `fansub_media_upload.go:285`, die vorherige Slot-Belegung wird aufgelöst und bereinigt (`tryCleanupUnusedMedia` `:302`).
- **(f) Verhalten:** **Single-Slot-Replace** (ein Logo-/Banner-Bild pro Gruppe, neues Bild ersetzt das alte inkl. Cleanup des alten Assets) — strukturell verschieden von der Galerie-Semantik der Wege 1/2. `visibility_code`/`review_status_code` defaulten auf `public`/`approved` (Branding-Default, `fansub_media_upload.go:108-114`) — kein Review-Gate.

**D-04:** **legitim getrennt** — fachlich eine andere Aufgabe (ein Branding-Slot pro Gruppe, kein Galerie-Upload); teilt sich nur die HTTP-Route mit Weg 2, hat aber eigene Persistenz-Semantik (Slot-Replace statt Anhängen an eine Liste).

---

### 4. Anime-Assets (Cover/Banner/Logo/Hintergrund/Segment-Vorschau)

- **(a) UI:** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx:82` und `:133` (Edit-Seite); `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts:73` (Patch-Flow der Edit-Seite); `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts:251` (Create-Flow); `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts:93` (Kara-Segment-Vorschaubild im Episode-Version-Editor).
- **(b) Frontend-API:** `uploadAdminAnimeMedia` — `frontend/src/lib/api/admin/anime-assets.ts:39`. Zweistufiger Fluss für Slot-Zuweisung: `assignAdminAnimeBannerAsset`/`assignAdminAnimeCoverAsset`/`assignAdminAnimeLogoAsset`/`assignAdminAnimeBackgroundVideoAsset` — `anime-assets.ts:66-103` (separater PATCH-Call NACH dem Upload, kein Teil des Upload-Calls selbst).
- **(c) Backend:** `POST /api/v1/admin/upload` → `MediaUploadHandler.Upload` — `backend/internal/handlers/media_upload.go:123`. Route: `backend/cmd/server/admin_routes.go:141`.
- **(d) Rechte:** Durchsetzung: **Plattform-Admin-Guard** (`requirePlatformAdminIdentity`) für alle `asset_type` außer `segment_preview` — `backend/internal/handlers/media_upload_segment_preview.go:38-41` (`authorizeUpload`). Ausnahme `asset_type=segment_preview`: delegiert an `SegmentPreviewUploadAuthorizer`, der die Segment-Verwaltungsberechtigung prüft statt Plattform-Admin — `media_upload_segment_preview.go:25-65`. Anzeige-seitig: kein granulares Capability-Flag im UI gefunden (`AnimeJellyfinAssetUploadControls.tsx` prüft keine Capability, verlässt sich auf Routen-Ebene/Seiten-Zugriff) — **Befund für Rechte-Matrix**: Anzeige ist grober (Seiten-Zugriff) als die Durchsetzung (expliziter Plattform-Admin-Check), siehe D-05.
- **(e) Daten:** `media_assets`/`media_files` (V2) + Relationstabelle `anime_media` (`backend/internal/repository/admin_content_anime_update_v2.go:255`, `admin_content_anime_create_v2.go:421`, `anime_assets_provider.go:171`).
- **(f) Verhalten:** Zweistufig — Datei wird zuerst anonym als Asset hochgeladen (`POST /admin/upload`), danach per separatem PATCH einem Slot zugewiesen (`assignAdminAnime*Asset`). Unterscheidet sich strukturell von Wegen 1-3, die Upload+Zuweisung in einem Call erledigen. `segment_preview` ist ein Sonderfall desselben Endpunkts mit eigener Rechteprüfung (automatisch erzeugte Kara-Vorschaubilder, siehe `StoreGeneratedAnimeImage` `media_upload_segment_preview.go:72`).

**D-04:** **legitim getrennt** — Plattform-weiter genereller Anime-Asset-Uploader mit eigenem (gröberem) Rechtemodell; die Zweistufigkeit (Upload → Zuweisung) ist eine bewusste strukturelle Variante, kein Zufallsduplikat. Der `segment_preview`-Sonderfall sollte bei einer Zusammenführung NICHT verloren gehen (eigene Rechteprüfung).

---

### 5. Segment-Assets (Kara-Video-Upload im Episode-Version-Editor)

- **(a) UI:** `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx:295`; Handler-Hook `useSegmentAssetHandlers.ts:98`.
- **(b) Frontend-API:** `uploadSegmentAsset` — `frontend/src/lib/api/admin/segment-assets.ts:192`.
- **(c) Backend:** `POST /api/v1/admin/anime/:id/segments/:segmentId/asset` → `AdminContentHandler.UploadSegmentAsset` — `backend/internal/handlers/admin_content_anime_theme_segments.go:747`. Route: `backend/cmd/server/admin_routes.go:155`.
- **(d) Rechte:** Durchsetzung: `permissions.ActionReleaseVersionSegmentsManage` — `admin_content_anime_theme_segments.go:175` (Prüfung vor dem Upload-Handler im selben Request-Pfad). Anzeige: Segment-Tab wird im Rahmen der Release-Version-Editor-Rechte gerendert — konsistent mit derselben Segment-Management-Aktion, keine Abweichung gefunden.
- **(e) Daten:** `media_assets`/`media_files` + direkte Source-Feld-Aktualisierung am Segment-Datensatz (kein separates `*_media`-Relationsobjekt wie bei Anime/Release — das Segment selbst trägt den Medienverweis).
- **(f) Verhalten:** Video-Upload (nicht Bild), ersetzt die Source-Felder des Ziel-Segments direkt (kein Galerie-Charakter, 1:1-Zuordnung Segment↔Datei). Optionaler `release_variant_id`-Query-Parameter für varianten-spezifische Zuordnung.

**D-04:** **legitim getrennt** — andere Medienart (Video statt Bild), andere Datenhaltung (Segment-Feld statt Relationstabelle), eigene Rechte-Aktion konsistent durchgesetzt.

---

### 6. Release-Theme-Assets (zwei Einstiege: nach Anime und nach Release)

- **(a) UI:** `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx:112` (Einstieg über Fansub-Anime-Ebene); `frontend/src/app/admin/fansubs/[id]/edit/useReleaseMediaDrawer.ts:286` (Einstieg über eine konkrete Release-Version im Medien-Drawer).
- **(b) Frontend-API:** `uploadAdminReleaseThemeAsset` (fansubID+animeID) — `frontend/src/lib/api/admin/anime-release-assets.ts:132`. `uploadAdminReleaseThemeAssetForRelease` (releaseID direkt) — `anime-release-assets.ts:156`.
- **(c) Backend:** `POST /api/v1/admin/fansubs/:id/anime/:animeId/theme-assets` → `AdminContentHandler.UploadReleaseThemeAsset` — `backend/internal/handlers/admin_content_release_theme_assets.go:148`. `POST /api/v1/admin/releases/:releaseId/theme-assets` → `UploadReleaseThemeAssetForRelease` — `admin_content_release_theme_assets.go:333`. Routen: `backend/cmd/server/admin_routes.go:179` und `:182`.
- **(d) Rechte:** Beide Handler nutzen **dieselbe** Aktion `permissions.ActionReleaseVersionMediaUpload` (`admin_content_release_theme_assets.go:196` bzw. `:376`) — konsistent zwischen beiden Einstiegen, aber dieselbe Aktion wie Weg 1 (Release-Medien), obwohl Theme-Assets eine andere Ressource sind (**Befund**: Wiederverwendung einer release-version-media-spezifischen Aktion für eine andere Ressource — zu prüfen in der Rechte-Matrix 175-08, ob eine eigene Theme-Asset-Aktion sinnvoller wäre).
- **(e) Daten:** `media_assets`/`media_files` + Relationstabelle für Theme-Zuordnung über `themeRepo.CreateReleaseThemeAsset` (Tabelle `release_theme_assets`, Fremdschlüssel `release_id`/`theme_id`/`media_id`).
- **(f) Verhalten:** `UploadReleaseThemeAsset` (nach Anime) löst zusätzlich die kanonische Release-ID über `GetCanonicalFansubAnimeRelease(fansubID, animeID)` auf und prüft Segment-Sperren (`HasGlobalThemeSegmentCoverageForRelease`, `HasReleaseAssetSegmentUploadBlockedForRelease`, `admin_content_release_theme_assets.go:240-264`) — diese Zusatzlogik fehlt in `UploadReleaseThemeAssetForRelease` nicht grundsätzlich (releaseID liegt dort direkt vor), die anschließende Persistenz-Logik (CreateMediaAsset → InsertMediaFile → CreateReleaseThemeAsset, Zeilen `admin_content_release_theme_assets.go:266-329`) ist zwischen beiden Handlern **nahezu wortgleich kopiert**.

**D-04:** **Variante** auf UI/Fachebene (zwei legitime Navigationskontexte: "ich bin auf der Anime-Ebene" vs. "ich bin auf einer konkreten Release-Version"), aber **Duplikat auf Implementierungsebene** (Persistenzblock ist kopiert statt in eine gemeinsame Funktion extrahiert). Empfehlung für Folgephase: einen gemeinsamen internen Persistenz-Helfer extrahieren, beide Routen als dünne Wrapper behalten (kein API-Bruch nötig, nur Backend-internes Refactoring).

---

### 7. Profil-Avatar/-Hintergrund/-Story (Eigenes Profil, Self-Service)

- **(a) UI:** `frontend/src/app/me/profile/page.tsx:387` (Story-Bild), `:474` (Avatar), `:497` (Hintergrund).
- **(b) Frontend-API:** `uploadOwnProfileAvatar` — `frontend/src/lib/api/members-media.ts:25`. `uploadOwnProfileBackground` — `members-media.ts:74`. `uploadOwnProfileStoryImage` — `members-media.ts:140`. Zusätzlich `uploadPendingStoryImages` (Batch-Wrapper für mehrere Story-Bilder vor dem Speichern) — `frontend/src/lib/storyImageUpload.ts:39`.
- **(c) Backend:** `POST /api/v1/me/profile/avatar` → `AppAuthHandler.UploadOwnProfileAvatar` — `backend/internal/handlers/app_profile.go:377`. `POST /api/v1/me/profile/background` → `UploadOwnProfileBackground` — `app_profile.go:567`. `POST /api/v1/me/profile/story-images` → `UploadOwnProfileStoryImage` — `backend/internal/handlers/app_profile_story_image.go:42`. Routen: `backend/cmd/server/main.go:378-380`.
- **(d) Rechte:** Alle drei Routen sind nur mit `authMiddleware` registriert (`main.go:378-380`) — **keine ressourcenbezogene Capability-Prüfung**, da Zielressource immer das eigene Profil des Aufrufers ist (Identität aus dem Auth-Token, kein fremder Owner erreichbar). Anzeige-seitig entsprechend ungegatet außer durch "bin ich eingeloggt". **Legitim** — es gibt keine zu prüfende Fremdberechtigung.
- **(e) Daten:** `media_assets` (V2) + Spalten `members.avatar_media_id`/`members.background_media_id` (Beleg u. a. `backend/internal/repository/anime_contributions_repository.go:141`, `domain_projection_repository.go:132`). Story-Bilder über ein separates Zuordnungsschema im Profil-Story-Inhalt (Editor-Erweiterung `StoryImageExtension.ts`).
- **(f) Verhalten:** Avatar/Hintergrund nutzen `authorizedFetch` (einfacher POST, **kein** Fortschritts-Callback) — `members-media.ts:38-47`/`:87-96`. Story-Bild nutzt `authorizedUploadXhr` (**mit** Fortschritts-Callback) — `members-media.ts:152-171`. Avatar/Hintergrund unterstützen optional einen Crop-Fluss (`source_file`+`cropped_file`), Story-Bild nicht. Alle drei sind Single-User-Self-Service ohne Review-Gate (Avatar/Hintergrund: `visibility_code=public`/`review_status_code=approved` vom Aufrufer gesetzt; Story: `private`/`in_review` beim Entwurf).

**D-04:** **Variante** untereinander (gleiche Fachaufgabe "eigenes Profilbild hochladen", unterschiedliche Slots mit leicht unterschiedlichem Cropping-Bedarf — gemeinsame Basis sinnvoll, aber kein 1:1-Duplikat da Crop-Flow/Fortschrittsanzeige bewusst unterschiedlich). **Legitim getrennt** von allen Admin-Flächen (Wege 1-6), da Self-Service ohne Fremdrechteprüfung eine andere Fachaufgabe ist als administrative Medienverwaltung.

---

### 8. Medien-Vorschläge (Member-Report-Flow)

- **(a) UI:** `frontend/src/components/contributions/ReportFormMedia.tsx:95`.
- **(b) Frontend-API:** `uploadMediaSuggestion` — `frontend/src/lib/api/contributions-me.ts:234`.
- **(c) Backend:** `POST /api/v1/me/suggestions/media` → `SuggestionsMeHandler.UploadMediaSuggestion` — `backend/internal/handlers/suggestions_me_handler.go:137`. Route: `backend/cmd/server/main.go:641`.
- **(d) Rechte:** `requireMeIdentity` (`suggestions_me_handler.go:138`) — jeder eingeloggte Member darf einen Medienvorschlag einreichen, keine granulare Capability nötig (Ziel ist ein Review-Eintrag, keine direkte Veröffentlichung). Konsistent mit Anzeige (Formular für jeden eingeloggten Member sichtbar).
- **(e) Daten:** Eintrag in der generischen `suggestions`-Tabelle mit `suggestion_type='media'`, `target_type`/`target_id`, `content_text=category` (`suggestions_me_handler.go:180-188`) — **kein** Eintrag in `media_assets` zu diesem Zeitpunkt des Lesens erkennbar als direkter Asset-Datensatz, sondern über den generischen Vorschlagsmechanismus (Datei wird im weiteren Verlauf des Handlers verarbeitet, siehe Fortsetzung nach Zeile 197).
- **(f) Verhalten:** Fließt in den allgemeinen Vorschlags-/Review-Workflow (`in_review` auf DB-Ebene per Decision 8) statt in eine Medien-Galerie — strukturell komplett anders als Wege 1-6 (kein direktes Asset, sondern ein Vorschlag, der erst bei Annahme zu einem Asset wird).

**D-04:** **legitim getrennt** — andere Fachaufgabe (Community-Vorschlag mit Review vor Übernahme, nicht direkter Medien-Upload in eine bestehende Galerie).

---

## Zusammenfassung Rechte-Konsistenz (D-05, Vorarbeit für 175-08)

| Weg | Anzeige-Aktion | Durchsetzungs-Aktion | Konsistent? |
|-----|---------------|----------------------|-------------|
| 1 Release-Medien | `can_upload_media` → `ActionReleaseVersionMediaUpload` | `ActionReleaseVersionMediaUpload` | Ja |
| 2 Gruppenmedien | `can_upload_group_media`/`can_edit_group` | `ActionFansubGroupMediaUpload` **+** Custom-Permission-Fallback | **Teilweise** (zwei Ebenen) |
| 3 Logo/Banner | Gruppen-Edit-Zugriff (grob) | `ActionFansubGroupEdit` | Ja (grob = grob) |
| 4 Anime-Assets | kein UI-Capability-Check | Plattform-Admin-Guard (außer `segment_preview`: Segment-Recht) | **Abweichend** (Anzeige gröber als Durchsetzung) |
| 5 Segment-Assets | Segment-Tab-Zugriff | `ActionReleaseVersionSegmentsManage` | Ja |
| 6 Theme-Assets | (kein separates Capability-Flag identifiziert, verlässt sich auf Seitenzugriff) | `ActionReleaseVersionMediaUpload` (fremde Aktion wiederverwendet) | **Abweichend** (falsche Aktion semantisch) |
| 7 Profil | keine (Self-Service) | `authMiddleware` only | Ja (legitim ohne Capability) |
| 8 Vorschläge | keine (jeder Member) | `requireMeIdentity` | Ja |

## Summenzeilen (reproduzierbar per `scripts/count-01-medien-hochladen.sh`)

- **UI-Flächen: 15**
- **Frontend-API-Upload-Funktionen: 12**
- **Backend-Upload-Handler: 11**
