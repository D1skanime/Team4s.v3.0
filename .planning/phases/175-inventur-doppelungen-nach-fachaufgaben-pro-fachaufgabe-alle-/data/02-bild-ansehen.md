# Fachaufgabe 2: Bild ansehen — vollständige Inventur

**Quelle:** 174-FOLLOWUPS.md F-18 ("Eine einheitliche Bildanzeige überall"), 174-REPORT.md Empfehlung #2.
**Design-Referenz (nur lesend, D-08):** `.planning/sketches/010-galerie-detailansicht` — behandelt nur die öffentliche Release-Galerie; nicht verändert, nicht committed (siehe Verifikation unten).

**Wichtiger Korrekturbefund gegenüber F-18:** F-18 listet 8 "unabhängige" Implementierungen. Die tatsächliche Quelltextprüfung zeigt, dass **zwei davon bereits dieselbe Lightbox-Komponente teilen** (`FansubMediaLightbox`) und **eine der genannten Dateien kein lebender Code-Pfad mehr ist** (0 Importeure außerhalb der eigenen Datei). F-18s Grundeinschätzung "zusammenführen" bleibt für die verbleibenden Implementierungen richtig, aber der Umfang ist kleiner als die Auflistung suggeriert — siehe Abschnitt "Korrektur" unten.

Spalten gemäß D-03: (a) UI-Fläche, (b) Frontend-API-Funktion, (c) Backend-Endpunkt, (d) Rechte Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten.

---

### 1. `ReleaseGallery.tsx` (öffentliche Release-Galerie)

- **(a) UI:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx:54` (Grid-Rendering `:196`, Lightbox-Einbindung `:202-207`).
- **(b) Frontend-API:** `getGroupReleaseImages` (Cursor-Nachladen pro Kategorie) — `frontend/src/lib/api/releases.ts:135`.
- **(c) Backend:** `GET /api/v1/anime/:id/group/:groupId/releases/:releaseVersionId/images` → `groupPublicHandler.GetGroupReleaseImages` — Route `backend/cmd/server/main.go:407`. Initialdaten werden serverseitig (SSR) vorgeladen, `getGroupReleaseImages` lädt nur fehlende Kategorien nach (`revealAll` `ReleaseGallery.tsx:89-117`).
- **(d) Rechte:** Rein öffentlich, keine Capability-Prüfung — Sichtbarkeit wird serverseitig bereits beim Query gefiltert (kein Unterschied Anzeige/Durchsetzung, da keine private Ressource).
- **(e) Daten:** liest aus derselben `release_version_media`-Relation wie der Admin-Upload (Fachaufgabe 1, Weg 1), nur öffentlich sichtbare/freigegebene Einträge.
- **(f) Verhalten:** **Bildbühne ist NICHT selbst implementiert** — `ReleaseGallery` baut aus seinen Items `PublicImageLightboxItem[]` (`toLightboxItem` `:41-52`) und übergibt sie an `<FansubMediaLightbox>` (`:202`). Eigenständig ist nur das Grid (Highlight/Featured-Karten, responsive Spaltenzahl, "Weitere N Bilder"-Button) und die Kara-Segment-Karten mit Video-Wiedergabe im `Modal` (separater Pfad, kein Bild).

**D-04:** **Teil-Duplikat behoben** — die Bildbühne selbst ist bereits auf `FansubMediaLightbox` konsolidiert (kein eigenständiger Viewer mehr). Nur die Grid-Logik bleibt releasegalerie-spezifisch (legitim, da Highlight/Kategorie/Kara-Layout fachlich eigen ist).

---

### 2. `FansubMediaLightbox.tsx` (+ `FansubGroupMediaBlock.tsx`)

- **(a) UI:** Lightbox-Komponente selbst: `frontend/src/components/fansubs/FansubMediaLightbox.tsx:36`. Konsument 1: `ReleaseGallery.tsx` (siehe oben). Konsument 2: `FansubGroupMediaBlock.tsx:59` (öffentliche Fansub-Profilseite, Medien-Grid `:93-147`, Lightbox-Einbindung `:161-166`).
- **(b) Frontend-API:** keine eigene (reiner Präsentations-Baustein, bekommt `media: PublicImageLightboxItem[]` als Prop).
- **(c) Backend:** kein eigener Endpunkt. `FansubGroupMediaBlock` wird von der öffentlichen Fansub-Profilseite mit bereits geladenen `PublicFansubMediaItem[]` gefüttert (Datenquelle: öffentliches Fansub-Profil-Projektions-Endpoint, außerhalb des Scopes dieser Bildanzeige-Inventur).
- **(d) Rechte:** öffentlich, keine Capability-Prüfung (Daten bereits serverseitig sichtbarkeitsgefiltert vom jeweiligen Aufrufer).
- **(e) Daten:** unabhängig vom Aufrufer (Release-Medien vs. Fansub-Gruppen-Medien) — die Lightbox selbst hält keinen eigenen State zur Datenquelle.
- **(f) Verhalten:** `Modal`-basiert (`@/components/ui`), Tastatur-Navigation (ArrowLeft/ArrowRight mit **Wrap-around**, `:46-57`), Positions-Zähler "n / N", zeigt **nur das Originalbild** (`original_url`, kein Display-Bild-Vorschritt, kein progressive Display→Original-Nachladen), **kein Zoom, kein Touch-Swipe**. Nutzt `next/image` mit `unoptimized` (`:83-91`).

**D-04:** Bereits der **gemeinsame Baustein** für 2 von 8 genannten Flächen. **Kandidat als technische Teilbasis** für den künftigen Viewer — hat Tastatur-Navigation und Wrap-around, aber es fehlen laut F-18-Zielbild: Zoom, Swipe, Display→Original-Progressive-Load, erweiterte Metadaten (Kategorie/Uploader werden NICHT angezeigt, nur Titel+Beschreibung).

---

### 3. `ScreenshotGallery.tsx` (Episoden-Screenshots)

- **(a) UI:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:15` (Lightbox-Markup `:186-232`).
- **(b) Frontend-API:** **keine** — direkter `fetch()`-Aufruf auf `resolvePublicApiUrl(...)` (`ScreenshotGallery.tsx:40`), **nicht** über die zentrale `lib/api.ts`-Fassade geroutet. Abweichung vom in CLAUDE.md dokumentierten Konventions-Muster ("Shared API calls are funneled through `frontend/src/lib/api.ts`").
- **(c) Backend:** `GET /api/v1/releases/:id/images` → `episodeVersionImagesHandler.ListReleaseImages` — Route `backend/cmd/server/main.go:502`. **Anderer Endpunkt** als `ReleaseGallery` (#1), obwohl beide konzeptionell "Bilder einer Release-Version" liefern — Backend-seitiger Doppel-Fund, zusätzlich zur Frontend-Viewer-Doppelung.
- **(d) Rechte:** öffentlich, keine Capability-Prüfung.
- **(e) Daten:** vermutlich dieselbe zugrunde liegende Medien-Relation wie Weg 1, aber über einen eigenen episodenzentrierten Projektions-Endpunkt statt des gruppen-/release-zentrierten Endpunkts von `ReleaseGallery`.
- **(f) Verhalten:** **Komplett eigenständige, selbstgebaute** Lightbox (kein `Modal`, kein `FansubMediaLightbox`): rohes `<img>` (kein `next/image`/`ResponsiveImage`), rohe `<button>`-Elemente (kein `Button`-Primitive) — Abweichung vom globalen UI-Design-System (CLAUDE.md). Tastatur: ArrowLeft/ArrowRight **ohne Wrap-around** (Buttons werden an den Rändern `disabled`, `:205`/`:215`), zusätzlich `Home`/`End`-Tasten (Sprung zum ersten/letzten Bild) — ein Feature, das sonst keine andere Implementierung hat. Infinite-Scroll per `IntersectionObserver` fürs Grid selbst (nicht für die Lightbox). Kein Zoom, kein Swipe, kein Display→Original-Nachladen (zeigt direkt `image.url`).

**D-04:** **Duplikat** (Teil des Hauptclusters). **Altlast** — älteste/am wenigsten konform mit dem UI-System (native Elemente statt Primitives, eigener `fetch` statt `api.ts`).

---

### 4. `ProjectMemberMediaViewer.tsx` (+ `ProjectMemberMediaGallery.tsx`)

- **(a) UI:** Viewer: `frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx:31`. Gallery-Wrapper: `ProjectMemberMediaGallery.tsx:29` (Öffnen `:54-59`, Einbindung `:103-111`).
- **(b) Frontend-API:** `getProjectMemberMedia` — `frontend/src/lib/api/projects.ts:129`.
- **(c) Backend:** `GET /api/v1/anime/:id/group/:groupId/members/:memberSlug/media` → `projectMemberPublicHandler.GetMedia` — Route `backend/cmd/server/main.go:415` (mit `authOptionalMiddleware` — funktioniert für eingeloggte wie anonyme Besucher, liefert aber nur öffentlich sichtbare Daten).
- **(d) Rechte:** öffentlich, serverseitig sichtbarkeitsgefiltert, keine zusätzliche Capability nötig.
- **(e) Daten:** mitglieds-/projektbezogene Medien-Projektion (member-scoped Ausschnitt derselben zugrundeliegenden Medien-Tabellen).
- **(f) Verhalten:** **Eigenständig implementiert**, NICHT auf `Modal`/`FansubMediaLightbox` aufgebaut — eigener `role="dialog" aria-modal="true"`-Backdrop (`:71-77`), eigener Fokus-Handling (`dialogRef.current?.focus()`), eigenes Schließen-Kreuz als rohes `<button>` (`:84-86`, Abweichung vom UI-System). Tastatur: ArrowLeft/ArrowRight mit **Wrap-around** (`:42-43`), Escape schließt. **Einziges Feature, das sonst niemand hat:** Bild-Prefetch der Nachbarbilder (`prefetch()` `:12-17`, `:59-63`) für flüssigeres Navigieren. Zeigt eine **Metadaten-Sidebar** (Titel, Kategorie, Folge·Version, Beschreibung, Link zur Release-Seite `:102-112`) — die reichhaltigsten Metadaten aller 8 Implementierungen. Kein Zoom, kein Swipe, kein Display→Original-Nachladen (zeigt direkt `preview_url`).

**D-04:** **Duplikat** (Teil des Hauptclusters), aber mit dem **reichhaltigsten Metadaten-Layout** (Sidebar mit Kontext-Infos + Release-Link) und dem einzigen Prefetch-Mechanismus — wichtige Features, die beim Vorbild NICHT verloren gehen dürfen.

---

### 5. `GroupAssetsExperience.tsx`

- **(a) UI:** `frontend/src/components/groups/GroupAssetsExperience.tsx:55` (Lightbox-Markup `:211-245`), aufgerufen über `GroupAssetShowcase.tsx:19` (Wrapper, selbst ohne eigene Datenladung).
- **(b) Frontend-API:** keine eigene — `episodes`-Prop wird serverseitig (SSR) in die Seite geladen, bevor `GroupAssetShowcase` gerendert wird.
- **(c) Backend:** kein in dieser Komponente sichtbarer eigener Aufruf (Daten kommen vorverarbeitet über Props).
- **(d) Rechte:** öffentlich, keine Capability-Prüfung in der Komponente selbst.
- **(e) Daten:** Episoden-Asset-Struktur (`GroupEpisodeAssets[]`), getrennt für Bilder (`GroupAssetImage`) und abspielbare Medien (`GroupAssetMedia`, Opening/Ending/Karaoke/Insert).
- **(f) Verhalten:** **Weitere eigenständige, selbstgebaute** Lightbox (kein `Modal`, kein `FansubMediaLightbox`) — rohes `<img>`, rohes `<button>` (`:214-215`, Abweichung UI-System). Tastatur: ArrowLeft/ArrowRight **ohne Wrap-around** (Buttons an Rändern `disabled`, `:230-231`). Definiert sich **eine eigene lokale `resolveApiUrl`-Hilfsfunktion** (`:39-41`) statt die zentrale aus `lib/api.ts` zu nutzen — kleine zusätzliche Duplikation. Kein Zoom, kein Swipe, kein Display→Original. Für Videos (Opening/Ending/Karaoke) wird korrekt ein separates `VideoPlayerModal` verwendet (`:7`, `:246`) statt derselben Bild-Lightbox — **legitime Trennung** zwischen Bild- und Video-Anzeige.

**D-04:** **Duplikat** (Teil des Hauptclusters) für den Bildanteil. Der Video-Pfad (`VideoPlayerModal`) ist **legitim getrennt** (andere Medienart) und nicht Teil dieser Zusammenführung.

---

### 6. `ReleaseVersionMediaSection`-Modal „Medium bearbeiten" (Admin, Release-Version-Editor)

- **(a) UI:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:717-822` (`Drawer`, Titel wechselt zwischen „Medium bearbeiten"/„Medium ansehen" je nach Recht, `:720`).
- **(b) Frontend-API:** `patchReleaseVersionMediaItem` (`releases.ts:222`), `replaceReleaseVersionMediaFile` (`releases.ts:268`, bei abgelehnten Medien), `deleteReleaseVersionMediaItem`.
- **(c) Backend:** `PATCH /api/v1/admin/release-versions/:versionId/media/:relationId` → `PatchReleaseVersionMedia` (`admin_content_release_version_media_patch.go:58`); `DELETE .../media/:relationId` → `DeleteReleaseVersionMedia` (`admin_content_release_version_media_delete.go:15`).
- **(d) Rechte:** Anzeige: pro Item vorberechnete Flags `selectedItem.can_update`/`can_delete`, Fallback auf Section-weite `canUpdateMedia`/`canDeleteMedia`/`canDeleteOwnMedia` (`ReleaseVersionMediaSection.tsx:153-157`). Durchsetzung: `ActionReleaseVersionMediaUpdate`/`ActionReleaseVersionMediaDelete` (`admin_content_release_version_media_patch.go:79`, `_delete.go` Zeile ~42-62, inkl. Owner-Fallback). **Konsistent.**
- **(e) Daten:** `release_version_media` (dieselbe Relation wie Weg 1/Fachaufgabe-1-Weg-1).
- **(f) Verhalten:** **Kein Navigations-Viewer** (kein Vor/Zurück zu anderen Medien) — ist primär ein **Bearbeitungsformular mit statischer Bildvorschau** (Titel, Beschreibung, "Als Vorschau markieren"-Checkbox, Datei-Ersatz bei abgelehnten Medien inkl. Dropzone). Vorschaubild ist ein rohes `<img>` (`:749-751`, kein Zoom/Pan). Zeigt Ablehnungsgrund/-kategorie bei `review_state=rejected` (`:757-764`) — Feature, das kein öffentlicher Viewer braucht.

**D-04:** **Variante** gegenüber den öffentlichen Viewern (1-5) — fachlich eine andere Aufgabe (Bearbeitungsformular mit Bildkontext, nicht Galerie-Navigation), sollte aber dieselbe **Bildbühnen-Komponente** (Anzeige-Teil) wie der künftige gemeinsame Viewer nutzen, um die aktuell rohe `<img>`-Vorschau zu ersetzen.

---

### 7. `ReleaseVersionMediaDetailPanel.tsx` — **TOTER CODE, kein aktiver Viewer**

- **(a) UI:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx:34`.
- **Befund (verifiziert, nicht aus F-18 übernommen):** `grep -rln "ReleaseVersionMediaDetailPanel" frontend/src` liefert **ausschließlich die eigene Datei** — keine Importe, keine Tests, keine Verwendung irgendwo im Baum. Diese Komponente wurde offenbar durch die inline `Drawer`-Lösung in `ReleaseVersionMediaSection.tsx` (#6) ersetzt, aber nie gelöscht.
- **(b)-(f):** nicht anwendbar (kein lebender Datenpfad). Die Komponente selbst verwendet zudem ausschließlich rohe native Elemente (`<button>`, `<input type="checkbox">`, `<img>`) — wäre auch bei Weiterverwendung ein UI-System-Verstoß gewesen.

**D-04:** **kein Inventur-Fund im eigentlichen Sinn** — **toter Code zur Entfernung** (eigene Kategorie, kein Duplikat/Variante/legitim-getrennt, da kein aktiver Nutzungspfad existiert). Empfehlung: Datei in einer der Folgephasen ersatzlos löschen (keine Importe zu bereinigen).

---

### 8. `GroupMediaReviewDetailDrawer.tsx` (Admin, Fansub-Gruppenmedien-Review)

- **(a) UI:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx:125`, eingebunden über `GroupMediaReviewSection.tsx`.
- **(b) Frontend-API:** `patchFansubMediaReview` (`admin/fansub-media.ts:273`), Löschen über `deleteFansubGroupMedia` (`admin/fansub-media.ts:115`, aufgerufen aus dem Eltern-Handler `handleDelete`-Prop).
- **(c) Backend:** `PATCH /api/v1/admin/fansubs/:fansubId/media/:mediaId` → `FansubMediaReviewHandler.PatchFansubMediaReview` (`fansub_media_review_handler.go:308`); `DELETE .../media/:mediaId` → `deleteFansubGroupMedia`-Route.
- **(d) Rechte:** Anzeige: `canUpdate`/`canUpdateOwn`/`canReview`-Props (aus Section-Capabilities, siehe Fachaufgabe-1-Weg-2). Durchsetzung: `ActionFansubGroupMediaUpdate`/`ActionFansubGroupEdit`/`ActionFansubGroupMediaUpdateOwn` mit demselben Verzweigungsmuster wie im Patch-Handler beschrieben (`fansub_media_review_handler.go:394-415`) — **konsistent** mit den übergebenen Props.
- **(e) Daten:** `fansub_group_media`-Relation.
- **(f) Verhalten:** Nutzt korrekt `Drawer`/`Button`/`FormField`/`Input`/`Select`/`Textarea`/`Modal` aus `@/components/ui` (**einziger der drei Admin-Dialoge ohne native-Element-Verstoß**). Vorschaubild über `next/image` mit Fehler-Fallback (`onError` setzt `failedDetailIds`, `:191-203`) — robuster als die anderen beiden Admin-Dialoge. Felder: Titel, Alternativtext, Beschreibung, Kategorie, Sichtbarkeit, Prüfstatus — **umfangreichstes Formular** der drei Admin-Dialoge (einzige mit Alt-Text und explizitem Sichtbarkeits-Select). Kein Navigations-Viewer (kein Vor/Zurück), wie #6.

**D-04:** **Variante** gegenüber den öffentlichen Viewern (gleiche Begründung wie #6) — UND der **qualitativ beste der drei Admin-Dialoge** (vollständige UI-System-Konformität, bestes Fehler-Handling, umfangreichstes Metadaten-Formular). Kandidat als **Vorbild für das Formular-Layout** der künftigen gemeinsamen Admin-Bearbeitungsfläche, auch wenn die Bild-Bühne selbst noch kein Zoom/Navigation hat.

---

## Korrektur gegenüber F-18 und Vorbild-Entscheidung

| F-18-Eintrag | Tatsächlicher Befund |
|---|---|
| "7+ unabhängige Implementierungen" | Es sind **6 tatsächlich eigenständige Bildbühnen-Implementierungen** (`FansubMediaLightbox`, `ScreenshotGallery`, `ProjectMemberMediaViewer`, `GroupAssetsExperience`, sowie die zwei Admin-Formulare #6/#8 mit statischer Vorschau) + **1 toter Code-Pfad** (#7) + **2 Konsumenten, die bereits auf `FansubMediaLightbox` konsolidiert sind** (`ReleaseGallery`, `FansubGroupMediaBlock`). |
| Sketch behandelt nur die öffentliche Galerie | Bestätigt — Sketch bezieht sich auf `ReleaseGallery` (#1), die bereits intern `FansubMediaLightbox` nutzt; der Sketch ist somit ein Entwurf für die Weiterentwicklung von `FansubMediaLightbox`, nicht für eine neue sechste Implementierung. |

**Vorbild für den künftigen gemeinsamen Viewer-Baustein: `FansubMediaLightbox.tsx`** (`frontend/src/components/fansubs/FansubMediaLightbox.tsx:36`).
Begründung: einzige Implementierung, die bereits (a) auf dem globalen `Modal`-Primitive aufbaut (CLAUDE.md-konform), (b) von mehreren Flächen wiederverwendet wird (geringster Umstellungsaufwand), (c) funktionierende Tastaturnavigation mit Wrap-around hat. Fehlende Merkmale, die beim Ausbau aus den Altlasten übernommen werden müssen: Zoom (keine Implementierung hat das), Touch-Swipe (keine Implementierung hat das), Display→Original-Progressive-Load (keine Implementierung hat das — gemäß F-18-Zielbild komplett neu zu bauen), Metadaten-Overlay (Kategorie/Uploader fehlen aktuell in `FansubMediaLightbox`, sind aber in `ProjectMemberMediaViewer` (#4) und `GroupMediaReviewDetailDrawer` (#8) vorhanden — von dort übernehmen), Bild-Prefetch der Nachbarbilder (aus `ProjectMemberMediaViewer`, #4, übernehmen).

**Altlasten (nach Fertigstellung des gemeinsamen Bausteins vollständig zu entfernen):** `ScreenshotGallery.tsx`-Lightbox-Markup (#3, Zeilen 186-232), `ProjectMemberMediaViewer.tsx` (#4, komplett — Metadaten-Sidebar-Konzept wandert in den gemeinsamen Baustein), `GroupAssetsExperience.tsx`-Lightbox-Markup (#5, Zeilen 211-245), `ReleaseVersionMediaDetailPanel.tsx` (#7, sofort löschbar, kein Migrationsaufwand).

## Sketch-Inhalt (nur gelesen, D-08)

`.planning/sketches/010-galerie-detailansicht/README.md` (Frontmatter `winner: null`) beschreibt die Zielbühne so: *"Bild maximal ohne weiße Ränder auf dunklem Grund, Display sofort + Original nachgeladen, voller Text mit Umbrüchen, Kategorie + Uploader, Pfeile/Tastatur/Wischen, nur X schließt, Klick aufs Bild = 100 %-Zoom."* Das bestätigt exakt die oben festgestellte Lücke: **keine** der 6 lebenden Implementierungen hat heute Zoom, Wischen (Touch-Swipe) oder das Display→Original-Nachlademuster; alle müssten dafür neu gebaut werden, unabhängig davon, welche Implementierung als Vorbild dient.

## Summenzeilen (reproduzierbar per `scripts/count-02-bild-ansehen.sh`)

- **Eigenständige Viewer-Implementierungen (lebender Code): 6** — `FansubMediaLightbox.tsx`, `ScreenshotGallery.tsx` (Lightbox-Teil), `ProjectMemberMediaViewer.tsx`, `GroupAssetsExperience.tsx` (Lightbox-Teil), `ReleaseVersionMediaSection.tsx` (Drawer „Medium bearbeiten"), `GroupMediaReviewDetailDrawer.tsx`. (`ReleaseGallery.tsx`/`FansubGroupMediaBlock.tsx` sind Konsumenten von `FansubMediaLightbox`, keine eigenen Implementierungen; `ReleaseVersionMediaDetailPanel.tsx` ist toter Code, siehe #7.)
- **UI-Einstiegspunkte (Dateien mit Bildanzeige-Trigger/-Rendering, inkl. totem Code): 10**

## Verifikation Sketch-Unberührtheit

`.planning/sketches/010-galerie-detailansicht` wurde ausschließlich mit `Read` gelesen (README.md; `index.html` nur per `wc -l` ausgezählt, nicht geöffnet/verändert) — nicht editiert, nicht formatiert, nicht committed. Siehe Verify-Schritt in der Summary.
