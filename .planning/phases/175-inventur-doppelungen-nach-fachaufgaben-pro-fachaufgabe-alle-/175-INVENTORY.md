# 175-INVENTORY.md — Vollständige Fachaufgaben-Inventur (D-07-Artefakt 1 von 3)

**Phase:** 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
**Zweck:** Zusammenführung der 12 Welle-1-Fragmente (`data/01-*.md` bis `data/12-*.md`) zu einer einzigen, pro Fachaufgabe gegliederten Gesamt-Inventur. Dies ist das vom Nutzer verbindlich geforderte D-07-Artefakt 1 ("pro Fachaufgabe Tabelle + Klassifikation + Belege"). `175-09` leitet aus diesem Dokument den Phasenzuschnitt für die Zusammenführungs-Folgephasen ab (`175-ROADMAP-PROPOSAL.md`).

**Methode dieser Zusammenführung:** Jede der 12 Fachaufgaben-Abschnitte unten übernimmt unverändert die in Welle 1 erhobenen Datei:Zeile-Belege, D-03-(a)-(f)-Spalten und D-04-Klassifikationen aus dem jeweiligen Fragment. Es werden in diesem Schritt **keine neuen Zahlen erzeugt** — jede Zählung ist über das in der jeweiligen Fragment-Datei genannte `scripts/count-NN-*.sh`-Skript reproduzierbar. Diese Zusammenführung fügt keine neuen Befunde hinzu, außer dem gesonderten Abschnitt "Zusätzliche Fachaufgaben" am Ende.

**Klassifikationswerte (D-04), ausschließlich diese drei:** **Duplikat** (gleiche Aufgabe, getrennt gebaut → zusammenführen; Vorbild/Altlast benannt), **Variante** (legitimer Kontextunterschied, gemeinsame Basis sinnvoll), **legitim getrennt** (fachlich verschieden, begründet).

---

## Fachaufgabe 1: Medien hochladen

**Quelle:** 174-FOLLOWUPS.md F-15, 174-REPORT.md Empfehlung #4. Details und reproduzierbare Zählung: `data/01-medien-hochladen.md`, `scripts/count-01-medien-hochladen.sh`.

**Kernbefund:** 8 eigenständige Upload-Wege (nicht 9 wie F-15 suggeriert — alle weiteren `authorizedUploadXhr`-Aufrufer sind bereits einem der 8 Wege zugeordnet, keine zusätzlichen Einstiege gefunden).

| # | (a) UI | (b) Frontend-API | (c) Backend | (d) Rechte Anzeige/Durchsetzung | (e) Daten | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|---|
| 1 Release-Medien (Galerie) | `ReleaseVersionMediaSection.tsx:228,444`, Queue `ReleaseVersionMediaUploadQueue.tsx:34,60` | `uploadReleaseVersionMedia` (`releases.ts:197`), `replaceReleaseVersionMediaFile` (`:268`) | `POST .../release-versions/:versionId/media` → `admin_content_release_version_media_upload.go:124` | Anzeige `can_upload_media` (`ReleaseVersionMediaSection.tsx:141,445`) = Durchsetzung `ActionReleaseVersionMediaUpload` (`:140`) — konsistent | `media_assets`/`media_files` + `release_version_media` | Mehrfachauswahl wird in Queue **gemergt** (`:242-253`), Titel/Caption pro Datei, kein Review-Gate | **Duplikat (Vorbild)** |
| 2 Gruppenmedien (Fansub-Review) | `GroupMediaReviewSection.tsx:256`, `GroupMediaReviewUploadPanel.tsx:35,62,74` | `uploadFansubGroupMedia` (`admin/fansub-media.ts:60`) | `POST /admin/fansubs/:id/media` (kind=image) → `fansub_media_upload.go:42,333` | Anzeige `can_upload_group_media`/`can_edit_group` (`:173-174`); Durchsetzung `ActionFansubGroupMediaUpload` **+** Custom-Permission-Fallback (`fansub_media_upload.go:54-72`) — zusätzliche Rechte-Ebene, die Weg 1 nicht hat | `media_assets` + `fansub_group_media` | Neue Auswahl **ersetzt** Vorauswahl (`:342`), eine Kategorie für ganzen Batch, löst `review_status=in_pruefung` aus | **Duplikat (Altlast)** |
| 3 Fansub-Logo/Banner | `MediaUpload.tsx:235` | `uploadFansubMedia` (`admin/fansub-media.ts:35`) | `POST /admin/fansubs/:id/media` (kind=logo/banner) → `fansub_media_upload.go:42,116-150` (dieselbe Route wie #2, andere Verzweigung) | Durchsetzung `ActionFansubGroupEdit` (`:54`); Anzeige über Gruppen-Edit-Zugriff (grob) — legitim, da Teil der Gruppenbearbeitung | `media_assets` + Slot-Zuweisung über `AssignFansubMedia` (`:285`) | **Single-Slot-Replace** mit Cleanup des alten Assets (`:302`), kein Review-Gate | **legitim getrennt** |
| 4 Anime-Assets (Cover/Banner/Logo/Hintergrund) | `AnimeJellyfinAssetUploadControls.tsx:82,133`, `useAnimePatchMutations.ts:73`, `createAssetUploadPlan.ts:251`, `useSegmentPreviewImageHandlers.ts:93` | `uploadAdminAnimeMedia` (`admin/anime-assets.ts:39`); Slot-Zuweisung zweistufig über `assignAdminAnime*Asset` (`:66-103`) | `POST /admin/upload` → `media_upload.go:123` | Durchsetzung: Plattform-Admin-Guard (`media_upload_segment_preview.go:38-41`), Ausnahme `segment_preview` (eigene Segment-Autorisierung, `:25-65`); Anzeige kein granulares Capability-Flag — **Befund: Anzeige gröber als Durchsetzung** | `media_assets`/`media_files` + `anime_media` | Zweistufig: anonymer Upload → separate PATCH-Zuweisung, strukturell anders als #1-#3 | **legitim getrennt** |
| 5 Segment-Assets (Kara-Video) | `SegmenteTab.tsx:295`, `useSegmentAssetHandlers.ts:98` | `uploadSegmentAsset` (`admin/segment-assets.ts:192`) | `POST .../segments/:segmentId/asset` → `admin_content_anime_theme_segments.go:747` | `ActionReleaseVersionSegmentsManage` (`:175`) konsistent Anzeige/Durchsetzung | `media_assets`/`media_files` + Segment-Feld (kein Relationsobjekt) | Video-Upload, ersetzt Source-Felder direkt, kein Galerie-Charakter | **legitim getrennt** |
| 6 Release-Theme-Assets (2 Einstiege) | `ReleaseThemeAssetsSection.tsx:112` (Anime-Ebene), `useReleaseMediaDrawer.ts:286` (Release-Ebene) | `uploadAdminReleaseThemeAsset`/`...ForRelease` (`admin/anime-release-assets.ts:132,156`) | `admin_content_release_theme_assets.go:148,333` | Beide `ActionReleaseVersionMediaUpload` (`:196,376`) — **fremde Aktion wiederverwendet (Befund für 175-08)** | `media_assets`/`media_files` + `release_theme_assets` | Persistenz-Block zwischen beiden Handlern **nahezu wortgleich kopiert** (`:266-329`) | **Variante (fachlich) / Duplikat (Implementierung)** |
| 7 Profil-Avatar/-Hintergrund/-Story | `me/profile/page.tsx:387,474,497` | `uploadOwnProfileAvatar`/`...Background`/`...StoryImage` (`members-media.ts:25,74,140`) | `app_profile.go:377,567`, `app_profile_story_image.go:42` | Nur `authMiddleware`, keine Capability nötig (immer eigenes Profil) — legitim | `media_assets` + `members.avatar_media_id`/`background_media_id` | Avatar/Hintergrund ohne Progress-Callback+Crop-Flow; Story mit Progress-Callback, ohne Crop | **Variante (untereinander), legitim getrennt (vs. Admin)** |
| 8 Medien-Vorschläge (Member-Report) | `ReportFormMedia.tsx:95` | `uploadMediaSuggestion` (`contributions-me.ts:234`) | `POST /me/suggestions/media` → `suggestions_me_handler.go:137` | `requireMeIdentity` (`:138`) — jeder eingeloggte Member | generische `suggestions`-Tabelle | Fließt in Vorschlags-/Review-Workflow, kein direktes Asset | **legitim getrennt** |

**Rechte-Konsistenz-Zusammenfassung (D-05, Vorarbeit 175-08):** 6 von 8 Wegen konsistent; Weg 2 hat zwei parallele Rechte-Ebenen; Weg 4 hat Anzeige gröber als Durchsetzung; Weg 6 nutzt eine fremde Aktion.

**Summenzeilen:** 15 UI-Flächen, 12 Frontend-API-Upload-Funktionen, 11 Backend-Upload-Handler (reproduzierbar: `scripts/count-01-medien-hochladen.sh`).

---

## Fachaufgabe 2: Bild ansehen

**Quelle:** 174-FOLLOWUPS.md F-18, 174-REPORT.md Empfehlung #2. Details: `data/02-bild-ansehen.md`, `scripts/count-02-bild-ansehen.sh`.

**Korrekturbefund gegenüber F-18:** F-18 nennt "7+ unabhängige Implementierungen". Tatsächlich: **6 lebende Viewer-Implementierungen** + **1 toter Code-Pfad** + **2 Konsumenten, die bereits auf `FansubMediaLightbox` konsolidiert sind**.

| # | (a) UI | (b) Frontend-API | (c) Backend | (d) Rechte | (e) Daten | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|---|
| 1 `ReleaseGallery.tsx` | `anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx:54,196,202-207` | `getGroupReleaseImages` (`releases.ts:135`) | `GET .../images` → Route `main.go:407` | öffentlich, keine Capability | `release_version_media` (freigegeben) | Grid eigenständig, Bildbühne selbst delegiert an `FansubMediaLightbox` (`:202`) | **(Teil-Duplikat behoben, Konsument)** |
| 2 `FansubMediaLightbox.tsx` | `components/fansubs/FansubMediaLightbox.tsx:36`; Konsumenten #1 + `FansubGroupMediaBlock.tsx:59,93-147,161-166` | keine eigene (Props) | kein eigener Endpunkt | öffentlich | aufrufer-unabhängig | `Modal`-basiert, Tastatur-Navigation mit Wrap-around (`:46-57`), nur Original-Bild, kein Zoom/Swipe/Progressive-Load | **Vorbild-Kandidat (gemeinsamer Baustein, 2 Konsumenten)** |
| 3 `ScreenshotGallery.tsx` | `episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:15,186-232` | **kein** `lib/api.ts`-Aufruf — direkter `fetch()` (`:40`), CLAUDE.md-Konventionsabweichung | `GET /releases/:id/images` → `main.go:502` (**anderer** Endpunkt als #1) | öffentlich | eigener episodenzentrierter Projektions-Endpunkt | **Eigenständige, selbstgebaute** Lightbox, rohes `<img>`/`<button>` (UI-System-Verstoß), kein Wrap-around, zusätzlich `Home`/`End`-Tasten | **Duplikat (Altlast)** |
| 4 `ProjectMemberMediaViewer.tsx` | `fansubs/projectMember/ProjectMemberMediaViewer.tsx:31,42-43,71-77,84-86`, `ProjectMemberMediaGallery.tsx:29,54-59,103-111` | `getProjectMemberMedia` (`projects.ts:129`) | `GET .../members/:memberSlug/media` → `main.go:415` | öffentlich, sichtbarkeitsgefiltert | member-scoped Medien-Projektion | Eigenständig (kein `Modal`), Wrap-around, Bild-Prefetch (`:12-17,59-63`), reichhaltigste Metadaten-Sidebar | **Duplikat (reichhaltigste Features, bei Merge zu bewahren)** |
| 5 `GroupAssetsExperience.tsx` | `components/groups/GroupAssetsExperience.tsx:55,211-245`, Wrapper `GroupAssetShowcase.tsx:19` | keine eigene (SSR-Props) | kein eigener Aufruf in Komponente | öffentlich | `GroupEpisodeAssets[]` | Eigenständig, rohes `<img>`/`<button>`, kein Wrap-around, eigene lokale `resolveApiUrl` (`:39-41`); Video-Pfad korrekt separiert via `VideoPlayerModal` | **Duplikat (Bildanteil); Video-Pfad legitim getrennt** |
| 6 `ReleaseVersionMediaSection`-Drawer „Medium bearbeiten" | `episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:717-822,749-751,757-764` | `patchReleaseVersionMediaItem`/`replaceReleaseVersionMediaFile`/`deleteReleaseVersionMediaItem` (`releases.ts:222,268`) | `admin_content_release_version_media_patch.go:58,79`, `_delete.go` | `can_update`/`can_delete` ↔ `ActionReleaseVersionMediaUpdate`/`Delete` — konsistent | `release_version_media` | Kein Navigations-Viewer, Bearbeitungsformular mit statischer `<img>`-Vorschau | **Variante (Admin-Formular, keine Galerie)** |
| 7 `ReleaseVersionMediaDetailPanel.tsx` | `ReleaseVersionMediaDetailPanel.tsx:34` | n/a | n/a | n/a | n/a | **0 Importeure außer eigener Datei** — toter Code | **kein Fund — toter Code zur Entfernung** |
| 8 `GroupMediaReviewDetailDrawer.tsx` | `admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx:125,191-203` | `patchFansubMediaReview` (`admin/fansub-media.ts:273`), `deleteFansubGroupMedia` (`:115`) | `fansub_media_review_handler.go:308,394-415` | konsistent mit Section-Capabilities | `fansub_group_media` | Nutzt korrekt `Drawer`/`Button`/`FormField`/`Input`/`Select`/`Textarea`/`Modal`, `next/image`-Fallback, umfangreichstes Formular | **Variante (Admin-Formular, qualitativ bestes der drei)** |

**Vorbild für künftigen gemeinsamen Viewer:** `FansubMediaLightbox.tsx` (Modal-basiert, mehrfach wiederverwendet, Wrap-around). Fehlende Merkmale laut Sketch (`.planning/sketches/010-galerie-detailansicht`, nur gelesen D-08): Zoom, Touch-Swipe, Display→Original-Progressive-Load (bei KEINER der 6 vorhanden), Metadaten-Overlay (aus #4/#8 übernehmen), Prefetch (aus #4 übernehmen).

**Altlasten:** `ScreenshotGallery.tsx`-Lightbox (#3), `ProjectMemberMediaViewer.tsx` (#4), `GroupAssetsExperience.tsx`-Lightbox (#5), `ReleaseVersionMediaDetailPanel.tsx` (#7, sofort löschbar).

**Summenzeilen:** 6 eigenständige Viewer-Implementierungen (lebender Code), 10 UI-Einstiegspunkte inkl. totem Code (reproduzierbar: `scripts/count-02-bild-ansehen.sh`). Sketch-Verzeichnis `.planning/sketches/010-galerie-detailansicht` wurde ausschließlich gelesen, nicht verändert/committed (D-08).

---

## Fachaufgabe 3: Release bearbeiten

**Quelle:** 174-FOLLOWUPS.md F-13, 174-REPORT.md Empfehlung #5. Details: `data/03-release-bearbeiten.md`, `scripts/count-03-release-bearbeiten.sh`.

**Gesamturteil:** Zwei komplett getrennt implementierte Rahmen-Seiten für denselben Vorgang ("eine Release-Version bearbeiten"), die bereits dieselben 3 Backend-Endpunkte und dieselben 4 Inhalts-Bausteine aufrufen.

| Rahmen | (a) UI | (b) Frontend-API | (c) Backend | (d) Rechte | (e) Daten | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|---|
| Admin-Editor (`/admin/episode-versions/[versionId]/edit`) | `EpisodeVersionEditorPage.tsx:95` (966 Z.) + `useEpisodeVersionEditor.ts:32` (416 Z.); 5 Einstiegspunkte: `VersionRow.tsx:123`, `versions/page.tsx:663`, `EpisodeEditForm.tsx:289`, `fansubs/[id]/reviews/[reviewId]/page.tsx:287`, `UserMediaTab.tsx:116` | `getEpisodeVersionEditorContext`(`episodes.ts:100`), `updateEpisodeVersion`(`:180`), `getReleaseVersionCapabilities`, `getCurrentUser`(`auth.ts:221`), `getFansubList`, `scanEpisodeVersionFolder`(`:124`), `deleteEpisodeVersion`, `getAnimeFansubProjectTimeline` | `GET .../editor-context` → `admin_content_episode_version_editor.go:16,27-51` (Admin-Zweig `loadEpisodeVersionEditorContext` Helpers `:24`); `PATCH /episode-versions/:versionId` → `episode_version_update.go:16`; `GET .../capabilities` → `admin_content_release_version_media_capabilities.go:25` | Platform-Admin `Allowed=true` ab Schritt 0 (`permissions.go:624,635-643`); braucht **kein** Mitgliederprofil (`getCurrentUser` statt `getOwnProfile`) | `release_versions`, `GetAnimeSyncSource`, `GetEpisodeClassificationByReleaseVersion` (nur Admin-Pfad), `selected_groups` | Laden: 1 Effect (Context) + separat User/Capabilities; Formular mit Baseline-Snapshot (`hasUnsavedChanges`); `handleSave` bündelt Medien+Gruppen+Metadaten; 7 Tabs mit `allowedTabs`-Filter; `useEpisodeNeighborNavigation` (Episode-Nachbarn); Löschen nur Admin | **Duplikat (Vorbild)** |
| `/me`-Workspace (`/me/releases/[versionId]/workspace`) | `workspace/page.tsx:51,446-448` (448 Z.) + `workspaceHelpers.ts`; 5 Einstiegspunkte: `ContributionCard.tsx:100`, `attentionHelpers.ts:38`, `AttentionSection.tsx:172`, `AnimeGroupCard.tsx:280`, `projects/[animeId]/group/[fansubGroupId]/page.tsx:351` | **dieselben** `getEpisodeVersionEditorContext`, `updateEpisodeVersion`, `getReleaseVersionCapabilities`, `getAnimeFansubProjectTimeline`; zusätzlich `getOwnProfile`(`members.ts:19`), `getMyProjectDetail`(`projects.ts:48`) | **dieselben** 3 Endpunkte wie Admin-Rahmen (Contributor-Zweig `loadEpisodeVersionContributorContext`, Helpers `:61`); zusätzlich `GET /me/projects/:animeId` → `contributions_me_project_handler.go:13` | Capability-AUSWERTUNG identisch; braucht Mitgliederprofil für Navigation — `getMyProjectDetail` liefert echten **404** bei fehlendem verifiziertem Member-Claim (`contributions_me_project_handler.go:31-35`), UI-seitig abgefangen zu Degradation (`workspace/page.tsx:222-224,408`) | dieselbe `release_versions`-Kerndaten; zusätzlich `members`-Tabelle (`GetOwnProfile`) | Laden: 1 Effect mit `Promise.all`; separater `metadataForm`-State ohne Baseline/`hasUnsavedChanges`; `saveMetadata` nur Metadaten; 4 Tabs; `getMyProjectDetail`-Navigation (404-Risiko); `PageHeader`/`AdjacentNavigation`/`Tabs`-UI-Primitives (CLAUDE.md-konform); kein Löschen | **Duplikat (Altlast)** |

**Vorbild/Altlast-Begründung (D-06):** Admin-Editor-Rahmen = Vorbild (braucht kein Mitgliederprofil, hat bereits volle Tab-Matrix+`allowedTabs`, hat Löschen/Ordner-Scan/Gruppenverwaltung integriert). `/me`-Workspace = Altlast, aber vor Entfernen zu übernehmen: UI-Primitive-Nutzung (`PageHeader`/`AdjacentNavigation`/`Tabs`/`Card`/`ErrorState`/`LoadingState`) und der `?return_to=`-Whitelist-Mechanismus (beide Whitelists zusammenführen). Alte URL leitet nach Zusammenführung weiter (D-06), alle 10 Einstiegspunkte werden umgestellt.

**Summenzeilen:** 2 Rahmen-Seiten, 3 gemeinsam genutzte Backend-Endpunkte, 4 gemeinsam genutzte Inhalts-Bausteine (`ReleaseVersionMediaSection`, `ReleaseVersionNotesTab`, `SegmenteTab`, `ReleaseVersionMetadataFields`), 6 duplizierte Rahmen-Aspekte, 10 Einstiegspunkte (5+5) (reproduzierbar: `scripts/count-03-release-bearbeiten.sh`).

---

## Fachaufgabe 4: Prüfen & Freigeben

**Quelle:** 174-FOLLOWUPS.md F-17 → D-02 #4, Fortsetzung BUG-174-02/BUG-174-04. Details: `data/04-pruefen-freigeben.md`, `scripts/count-04-pruefen-freigeben.sh`.

| Review-Fläche | (a) UI | (b)/(c) Entscheidungs-Endpunkt | (d) Anzeige-Aktion | (d) Durchsetzungs-Aktion | Konsistent? | (e) Daten | (f) Bulk/Grund/Konflikt-Schutz | D-04 |
|---|---|---|---|---|---|---|---|---|
| Gruppenmedien | `GroupMediaReviewSection.tsx:172` | `PATCH .../media/:mediaId/review` → `fansub_media_review_handler.go:382,397` | `ActionFansubGroupEdit` (`app_auth_capabilities.go:56`), Dashboard `dashboard_me_handler.go:226-227` | `ActionFansubGroupEdit` | **Ja (BUG-174-02-Fix bestätigt)** | `media_assets.review_status_id` | Bulk: Ja (`GroupMediaReviewBulkActionBar.tsx`); kein strukturierter Ablehnungsgrund; kein Revisions-Check | Variante mit Duplikat-Rest (gemeinsame Grundform mit Beiträge-Review) |
| Release-Bilder | `admin/fansubs/[id]/reviews/[reviewId]/page.tsx`+`ReleaseReviewsSection.tsx` | `POST .../decide` → `release_review_handler.go:185`, `authorizedKinds` (`release_review_handler_authz.go:15-26`) | `items[i].CanUpdate` via `ActionReleaseVersionMediaUpdate` (`admin_content_release_version_media_permissions.go:147-150,228-231`); Entscheidungs-Anzeige = `Detail`-Laden mit `authorizedKinds` | `ActionReleaseVersionMediaUpdate` (Patch, `_patch.go:79`); `ActionReviewImageDecide` (Decide, dieselbe Funktion wie Anzeige) | **Ja (BUG-174-04 strukturell ausgeschlossen, da dieselbe Helper-Funktion)** | `release_version_media_review_lifecycle.review_state` | Kein Bulk; strukturierter Ablehnungsgrund (Kategorie+10-1000 Zeichen, `release_review_handler.go:390-421`); `expected_revision`+409-Konflikt (`:209-215`) | bereits auf gemeinsamen Resolver konsolidiert |
| Release-Notizen | dieselbe Prüfseite, Typ `text` | derselbe `Decide`-Endpunkt, `ReviewKindText` | `ActionReviewTextDecide`, Dashboard (`dashboard_me_handler.go:275-276`); zusätzlich `can_edit_release` = `ActionReleaseVersionNotesWrite` (legitim getrennte zweite Frage) | `ActionReviewTextDecide` | **Ja** | `release_version_note_review_lifecycle.review_state` | wie Release-Bilder | bereits konsolidiert |
| Beiträge/Vorschläge | `ContributionsReviewSection.tsx:49` | `POST .../confirm`\|`/reject` → `contribution_review_handler.go:139,199,91` | `can_manage_members` = `ActionFansubGroupMembersManage` (`app_auth_capabilities.go:86,249`) | `ActionFansubGroupMembersManage` (Confirm/Reject/List) | **Ja** | `anime_contributions.status` (+ toter `review_status_id`-FK-Nebenbefund) | Kein Bulk; Freitext-optional `review_note`; kein Revisions-Check; **kein Dashboard-Hinweis (Vollständigkeits-Lücke)** | eigenständiger Legacy-Handler |

**Zusammenfassung (d):** 11 geprüfte Rechte-Vergleichspunkte, **0 Abweichungen** — BUG-174-02/BUG-174-04 bestätigt vollständig behoben, kein neues Vorkommen bei den bisher ungeprüften Flächen (Release-Notizen, Beiträge).

**Nebenbefund (Datenredundanz):** `anime_contributions.review_status_id` (seit Migration 0097) ist faktisch tot — wird nur kopiert, nie für Review-Entscheidungen gelesen/geschrieben; vorgemerkt für `175-ROADMAP-PROPOSAL.md`.

**Summenzeilen:** 4 Review-Flächen, 11 Rechte-Vergleichspunkte (0 Abweichungen), 4 review_status-Speicherorte, 3/4 Flächen mit Dashboard-Hinweis, 1/4 mit Bulk-Aktion (reproduzierbar: `scripts/count-04-pruefen-freigeben.sh`).

---

## Fachaufgabe 5: Mitglieder einladen/Claims/Mitgliedsanfragen

**Quelle:** 174-FOLLOWUPS.md F-17 → D-02 #5, Prüfung der Phase-135-Konsolidierung (D-09). Details: `data/05-mitglieder-einladen-claims.md`, `scripts/count-05-mitglieder-einladen-claims.sh`.

| # | (a) UI | (b) Frontend-API | (c) Backend | (d) Rechte | (e) Daten | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|---|
| 1 App-Member-Invite-Accept | `invitations/accept/page.tsx:33-63` | `acceptFansubInvitation` (`fansub-members.ts:281`) | `POST /invitations/accept` → `app_auth_invitations.go:310` | `CanAcceptInvitation` prüft `disabled`-Status (`permissions.go:271,603-614,606-608`) | `fansub_group_invitations` (Migration 0076) | Sofort aktive Mitgliedschaft, kein Review | legitim getrennt (teilt `InviteAcceptFlow` mit #2) |
| 2 Claim-Invite-Accept | `claim-invitations/accept/page.tsx:28-53` | `acceptClaimInvitation` (`fansub-members.ts:315`) | `POST /claim-invitations/accept` → `member_claim_invitations_handler.go:144` | Nur `requireMeIdentity` — **prüft KEINEN `disabled`-Status** (Asymmetrie zu #1, `contributions_me_handler.go:90`) | `member_claim_invitations` (Migration 0092) | `claim_status='verified'` sofort, kein Review; setzt `profile_visibility='public'` (`:240-248`) | **Duplikat-Risiko (Befund 3): fehlende gemeinsame Vorbedingungsprüfung** |
| 3 Claim-Generieren/Verify/Reject/Activate | `GroupMembersHistTable.tsx:135-345,251,259,285,302,335` | `generateClaimInvitation`/`cancelClaimInvitation`/`verifyMemberClaim`/`rejectMemberClaim`/`activateClaimedMember` (`fansub-members.ts:345,413,474,503`) | `member_claim_invitations_handler.go:92,173`, `member_claims_handler.go:136,161,186` | Durchgehend `ActionFansubGroupHistoricalMembersLink` (`:209-236`); Anzeige `can_link_historical_members` (`app_auth_capabilities.go:101`) — **konsistent** | `member_claims` (Migration 0081) | Admin-Verwaltung der Claim-Einladungen | legitim getrennt, konsistent |
| 4 App-Member-Einladung erstellen/stornieren | `FansubAppMembersSection.tsx:331,348`, `FansubAppMemberAddModal.tsx:321` | `createFansubGroupInvitation`/`cancelFansubGroupInvitation` (`fansub-members.ts:217,250`) | `app_auth_invitations.go:65,251` | `ActionFansubGroupInvitationsCreate`/`...Cancel` konsistent Anzeige/Durchsetzung (`app_auth_capabilities.go:126,131`; `app_auth_invitations.go:81,272`) | `fansub_group_invitations` | E-Mail-Versand mit 7-Tage-Ablauf | legitim getrennt |
| 5 Mitgliedsanfrage/Claim-Self-Service | `MemberClaimSection.tsx:22-167,142,158` | `submitMemberClaim`, `submitMemberRequest` | `POST /me/member-claims` → `member_claims_handler.go:62`; `POST /me/member-requests` → `member_requests_handler.go:40` | Self-Service ohne granulare Capability (`requireMeIdentity`) | `member_claims` (geteilt mit #3, Befund 7) | Admin-Review erforderlich (`pending`) | Variante mit Duplikat-Risiko |
| 6 `ClaimManagementPanel.tsx` | `admin/fansubs/[id]/edit/ClaimManagementPanel.tsx:81-89,320-436` | — | — | — | — | Laut Code-Kommentar absichtlich **nicht gemountet** (135-RESEARCH.md Open Question 2) | parallele, unmounted Implementierung von #3 |

**Mitgliedsanfragen (Neuanlage) — eigenes Rechte-Modell:** `ApproveRequest`/`RejectRequest` nutzen `requirePlatformAdmin` (`member_requests_handler.go:143-153`), **nicht** `CanForFansubGroup` wie alle anderen Flächen — fachlich begründet (global, nicht gruppengebunden), aber Rechte-Modell-Bruch innerhalb derselben UI (`ClaimManagementPanel.tsx` zeigt beide Tabellen ohne Differenzierung).

**Neue Befunde (D-05):** (3) Accept-Disabled-Check-Asymmetrie zwischen #1 und #2. (4) Memorial-Guard zweimal unabhängig implementiert, wortgleicher Fehlercode `memorial_not_claimable` (`member_claims_submit_repository.go:48-69` vs. `member_claim_invitations_repository.go:187-215`). (7) `member_claims`-Tabelle für zwei fachlich verschiedene Zwecke (Claim vs. Neuanlage-Antrag) über zwei unabhängige Repository/Handler-Paare.

**Phase-135-Konsolidierung bestätigt vollständig:** 0 neue Parallel-Accept-Implementierungen gefunden.

**Summenzeilen:** 6 UI-Flächen, 7 geprüfte Rechte-Vergleichspunkte, 2 neue Befunde, 3 Tabellen (1 davon doppelt genutzt) (reproduzierbar: `scripts/count-05-mitglieder-einladen-claims.sh`).

---

## Fachaufgabe 6: Notizen schreiben

**Quelle:** 174-FOLLOWUPS.md F-09 → D-02 #6, 174-REPORT.md Zeile 232/362. Details: `data/06-notizen-schreiben.md`, `scripts/count-06-notizen-schreiben.sh`.

**Korrektur gegenüber 174-REPORT.md:** 174-REPORT zählte 4 Cluster in `history.ts`; diese Inventur zählt **5**, weil Cluster 1 (Notizen) und 3 (Story) unterschiedliche Rechte-Modelle verwenden.

| Cluster | (a) UI | (b)/(c) Handler | (d) Rechte Anzeige/Durchsetzung | (e) Daten | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|
| 1 Fansub-/Gruppen-Notizen | `NotesTab.tsx:65-227` | `admin_content_fansub_group_notes.go:62-229`, `requireFansubGroupNoteWriteAccess` | Durchsetzung `ActionFansubGroupNotesWrite`; Tab-Anzeige ODER-Gate `can_edit_notes \|\| can_edit_founding_history` (`fansubEditAccess.ts:46`); Button-Ebene **keine** Capability-Prüfung (`NotesTab.tsx:66-94`) — **Befund 2: Anzeige-Lücke, fehlendes `foundingOnly`-Pendant** | `fansub_group_notes` (Migration 0061/0067) | kein Review-Lifecycle, keine Pro-Rolle-Zuordnung | **D-05-Befund (Anzeige-Lücke)** |
| 2 Gruppen-Meilensteine/Historie | `GroupHistorySection.tsx` | `fansub_group_history_handler.go:251+`, `requiredGroupHistoryAction:477-483` | dynamisch je `event_type`: `ActionFansubGroupMembersManage` oder `ActionFansubGroupPageFoundingHistoryEdit`; korrekt im Frontend über `foundingOnly`-Flag nachgebildet (`FansubEditSecondaryTabs.tsx:133`) | `fansub_group_history` (Migration 0084) | — | legitim getrennt (korrekt abgebildet) |
| 3 Member-Group-Story | **keine UI** (Befund 1: Dead Feature) | `admin_content_member_stories.go:34-228`, `requireAdmin`/`requirePlatformAdminIdentity` | Platform-Admin-only — komplett andere Rechte-Klasse als Nachbar-Cluster; kein `can_write_member_stories`-Feld | `member_group_stories` (Migration 0062/0068) | 0 Frontend-Konsumenten (`grep` über alle relevanten Funktionsnamen) | **kein Fund — orphaned Feature (Backend ohne Frontend)** |
| 4 Release-Version-Notizen | `ReleaseVersionNotesTab.tsx` (Admin) + öffentliche Release-Seite | `admin_content_release_version_notes.go`, `requireReleaseVersionNoteAccess:61-116` | `ActionReleaseVersionNotesWrite`+`...ViewAll`, pro Rolle `canEditReleaseVersionMemberRole`; Frontend bildet `canEdit` pro Rollen-Notiz-Feld exakt nach (`:146-147,579`) | `release_version_notes` (Migration 0064/0070) | Review-Lifecycle (`pending`/`confirmed`/`rejected`/`tombstoned`), Pro-Rolle, Mehrfachinstanzen | legitim getrennt — **bestes Anzeige/Durchsetzungs-Match** |
| 5 Anime-Fansub-Projekt-Notizen | `AnimeProjectNotesSection.tsx` (Admin) + öffentliche Projekt-Seite | `admin_content_anime_project_notes.go:53,103` | Schreiben: `ActionFansubGroupNotesWrite` (konsistent mit Cluster 1); Lesen: breitere `ActionReleaseView` (`requireAnimeProjectNoteReadAccess`) — UI nur über `hasAccessToken` gated, keine feinere Differenzierung | `anime_fansub_project_notes` (Migration 0063/0066/0069) | 1 Notiz pro Anime+Gruppe (Upsert, max. 1) | Variante (Lesen≠Schreiben-Actions, legitim) |

**Fehlplatziert (kein Notiz-Fund):** `searchArchive` (`history.ts:997`) ist reine Mitglieder-Suche, gehört fachlich zu Fachaufgabe 7, nicht zu Notizen.

**Summenzeilen:** 5 Notiz-Cluster (174-REPORT zählte 4), 5 verschiedene Rechte-Modelle, 1 Dead Feature, 1 fehlplatzierte Funktion, 1 neuer D-05-Befund (reproduzierbar: `scripts/count-06-notizen-schreiben.sh`).

---

## Fachaufgabe 7: Suchen & Filtern

**Quelle:** 174-FOLLOWUPS.md F-16, 174-REPORT.md Empfehlung #3. Details: `data/07-suchen-filtern.md`, `scripts/count-07-suchen-filtern.sh`.

**Korrekturbefund gegenüber F-16:** F-16 behauptet 7 Einzel-Filter + Bibliothek (8 gesamt). `projectPageData.ts` enthält **keinen** Nutzer-Sucheingabefeld-Code (einziger `includes()`-Treffer ist eine Bildauswahl-Heuristik, `:304`) — **tatsächlich 6 Einzel-Filter + 1 Bibliothek = 7 gesamt**, nicht 8.

| # | (a) UI | (b) Filterlogik | (c) Backend | (d) Rechte | (e) Daten | (f) Umlaut-tolerant? | Input-Primitive? | D-04 |
|---|---|---|---|---|---|---|---|---|
| 0 Globale Suchbibliothek (`/suche`) | `suche/page.tsx`, `SearchField.tsx:35`, `SearchResults.tsx`, `SearchFilters.tsx` | `getSearch`/`getSearchSuggestions` (`search.ts:40,71`) | `GET /search` → `search.go:64,192` | öffentlich, `authOptionalMiddleware` | `search_anime.go`/`search_fansub.go`/`search_suggestions.go`, paginiert | **Ja** — `f_unaccent()`+`pg_trgm` (`search_anime.go:17,45,123-166`) | n/a (eigene Komponente) | **legitim getrennt (eigene Infrastruktur)** |
| 1 `AdminGroupsClient.tsx` | `:343,352-356` `toLowerCase().includes()` auf Name/Slug | `getFansubList({per_page:500})` Pseudo-Vollabruf (`:362,370`) | n/a | Nein | Pseudo-voll geladen (500) | **Ja** (`:425`) | **Duplikat (Vorbild-Kandidat im Cluster)** |
| 2 `admin/fansubs/page.tsx` | `:90,142,159-165` Name/Slug/Alias | `getFansubList({per_page:500})` (`:118`) | n/a | Nein | Pseudo-voll (500), zusätzlich Alias-Suche | **Nein** — nativer `<input>` (`:431`) | **Duplikat** |
| 3 `admin/fansubs/merge/page.tsx` | `:46,81-113` Name/Slug + eigenes Scoring (`:90-91,98-99`) | `getFansubList({per_page:500})` (`:69`) | n/a | Nein | Pseudo-voll (500) + Score-Sortierung | **Nein** — nativer `<input>` (`:401`) | **Duplikat (Scoring bewahrenswert)** |
| 4 `GroupMediaReviewSection.tsx` | `GroupMediaReviewFilterBar.tsx:167-168`, `:196-211,207-208` 4-Felder-Suche | einmaliger Voll-Abruf Gruppen-Medienliste | n/a | Nein | nicht paginiert (natürlich begrenzt) | **Ja** (`:167`) | **Duplikat (Vorbild-Kandidat, reichhaltigste Mehrfeld-Suche)** |
| 5 `useAnimePatchImpl.ts` (Genre/Tag-Autocomplete, Edit) | `:153,158,165,170,175,180,187,192` 4 Filterblöcke | vollständig vorab geladene Kataloge | n/a | Nein (keine schützenswerten Daten) | Token-Katalog, clientseitig gefiltert | **Nein** — nativer `<input>` (`AnimeEditGenreSection.tsx:93`) | **Duplikat (enger Autocomplete-Teilcluster mit #6)** |
| 6 `useAdminAnimeCreateControllerImpl.ts` (Genre/Tag, Create) | `:403,408,415,420,425,430,437,442` strukturell identische Kopie von #5 | wie #5 | n/a | Nein | wie #5 | **Nein** — dieselbe Komponente wie #5 | **Duplikat (engster 1:1-Kopie-Fall)** |

**Summenzeilen:** 7 Suchimplementierungen insgesamt (1 Bibliothek + 6 lebende Einzel-Filter, NICHT 8), 0/6 Einzel-Filter umlaut-tolerant, 2/6 nutzen die `Input`-Primitive (reproduzierbar: `scripts/count-07-suchen-filtern.sh`).

---

## Fachaufgabe 8: Löschen/Aufräumen

**Quelle:** D-02 #8, keine fertige F-Nummer — eigenständige Recherche. Details: `data/08-loeschen-aufraeumen.md`, `scripts/count-08-loeschen-aufraeumen.sh`.

| # | Domäne | (a)/(b)/(c) Endpunkt/Handler | Mechanismus | (e) Tabelle/Spalte | (d) Rechte | D-04 |
|---|---|---|---|---|---|---|
| 1 | Anime | `DELETE /admin/anime/:id` → `admin_content_anime.go:223-249`, `requireAdmin`; Repository `admin_content_anime_delete.go:15-81,63,253-263` | **Hard-Delete** + Kaskaden-Cleanup (Relationen, Dateisystem `media/anime/<id>/`) | `anime` | Plattform-Admin-only, konsistent Anzeige/Durchsetzung | legitim getrennt |
| 2 | Fansub-Gruppe | `DELETE /fansubs/:id` → `fansub_groups.go:379-409`, `requireAdmin`; `fansub_repository_groups.go:378-404,387-394` | **Hard-Delete** + expliziter Vorab-Cleanup (RESTRICT-FKs) | `fansub_groups` | Plattform-Admin-only (Edit-Seite dagegen auch für Leads erreichbar — struktureller Unterschied, keine Inkonsistenz) | legitim getrennt |
| 3 | Fansub-Mitglied (aktiv) | `DELETE /admin/fansubs/:id/group-members/:memberId` → `fansub_hist_group_members_handler.go:363-401`; `hist_group_members_repository.go:423-432` | **Hard-Delete**, gruppenscoped | `hist_fansub_group_members` | `ActionFansubGroupHistoricalMembersManage` | legitim getrennt |
| 4 | Fansub-Mitglied (Legacy) | `DELETE /fansubs/:id/members/:memberId` → `fansub_group_members.go:165-199`, `requireAdmin`; `fansub_repository_members.go:171-186` | **Hard-Delete** auf alter `fansub_members`-Tabelle | `fansub_members` | Plattform-Admin-only (strenger als aktiver Pfad) | **Altlast — Orphan-Endpunkt (0 Frontend-Aufrufer, `deleteFansubMember` nirgends außerhalb Tests genutzt)** |
| 5 | Release-Version-Medien-Relation | Episode-Version-Editor-Galerie → `admin_content_release_version_media_delete.go:15`; `release_version_media_repository.go:374-392` | **Soft-Delete** (`deleted_at`+`deleted_by_user_id`) | `release_version_media.deleted_at` | konsistent | Duplikat-Rest (mit #6) |
| 6 | Gruppenmedien-Galerie-Bild | `DELETE /admin/fansubs/:id/media/:mediaId` (numerisch) → `fansub_media_delete.go:71-128,28-31`; `media_repository.go:1041-1062` | **Soft-Delete**, nahezu identisches SQL-Skelett wie #5, unabhängig implementiert | `fansub_group_media.deleted_at` | konsistent | **Duplikat-Rest mit #5 — Kandidat für gemeinsamen Soft-Delete-Helper** |
| 7 | Gruppen-Logo/-Banner-Slot | `DELETE /admin/fansubs/:id/media/:kind` (String, **dieselbe Route wie #6**) → `fansub_media_delete.go:17-69`; `media_repository.go:408-428` | **FK-Unassign** (`logo_id`/`banner_id`→NULL), kein Soft-Delete des Assets | `fansub_groups.logo_id`/`banner_id` | — | **Variante mit Mehrdeutigkeitsrisiko: eine Route liefert je Parametertyp (`:kind` Zahl vs. String) zwei verschiedene Löschsemantiken** |
| 8 | Anime-Asset-Slots | 4 eigene Routen `/admin/anime/:id/assets/{cover,banner,logo,background_video}` → `admin_content_anime_assets.go:95-120` | **FK-Unassign**, gleiche Grundidee wie #7, aber über 4 getrennte Routen (Slot im URL-Pfad, kein Mehrdeutigkeitsrisiko) | `anime.<slot>_asset_id` | — | Variante (konsistentes Muster, andere Domäne) |
| 9 | Beitrag/Projektbesetzung | `DELETE /admin/fansubs/:id/anime/:animeId/contributions/:contributionId` → `fansub_anime_contributions_delete_handler.go:21-89,45,65-68`; `anime_contributions_member_repository.go:11-37` | **Hard-Delete** mit fachlicher Sperre (422 bei release-gebundenen Zeilen) | `anime_contributions` | `ActionFansubGroupMembersManage` | legitim getrennt |
| 10 | Release-Review-Cleanup-Job | `ReleaseReviewCleanupService.RunOnce` (`release_review_cleanup.go:90-120`, Ticker `main.go:348`) | **Content-Scrub + Status-Übergang** `review_state='tombstoned'`, zweiphasiger Cleanup (logisch sofort, physisch verzögert, `:103-163`) | `release_version_notes`/`*_review_lifecycle` | Datenschutz/Retention, kein Nutzer-Löschen | legitim getrennt |
| 11 | Theme-Segment-Render-Cache | `theme_segment_render_cache.go:37,105,217,426` | **technischer Cache-Cleanup**, `invalidated_at`-Markierung + echtes `DELETE` | `theme_segment_render_cache` | — | legitim getrennt (reine Technik) |

**Stale-State-Gegenprobe (BUG-174-03):** Gruppenmedien-Galerie (`useGroupMediaReviewActions.ts:356-374`) lädt nach jeder Mutation **immer `loadMedia()` neu** — strukturell kein BUG-174-03-Risiko, aber auch kein Beleg bewusster Vermeidung (unabhängig gewachsene Architektur vs. der lokale-Patch-Ansatz der Release-Version-Medien-Galerie).

**Summenzeilen:** 9 Fachdomänen + 2 technische Cleanup-Jobs; 5 Hard-Delete, 2 Soft-Delete (Duplikat), 2 FK-Unassign-Familien, 1 Status-Übergang; 1 Orphan-Endpunkt, 1 Mehrdeutigkeitsrisiko (reproduzierbar: `scripts/count-08-loeschen-aufraeumen.sh`).

---

## Fachaufgabe 9: Anime anlegen/importieren

**Quelle:** D-02 #9, 174-REPORT.md (Welle 3, D-24-Exception). Details: `data/09-anime-anlegen-importieren.md`, `scripts/count-09-anime-anlegen-importieren.sh`.

**Zentraler Befund:** Manuell/Jellyfin/AniSearch sind **kein Nebeneinander**, sondern EIN Formular mit EINEM Submit-Pfad, der je nach Draft entscheidet, welche von zwei strukturell identischen Funktionen er aufruft — beide senden an denselben Endpunkt.

| Weg | (a) UI | (b) Frontend-API | (c) Backend | (e) Tabellen | (f) Verhalten | D-04 |
|---|---|---|---|---|---|---|
| Manuell | `page.tsx:234-376` (Basisdaten/Metadaten), `:166-232` (Assets) | `createAdminAnime` (`admin/anime-core.ts:123-142`) | `POST /admin/anime` → `admin_content_anime.go:21,34` | `anime` | Pflichtfelder Titel+Cover (`useCreateSubmitAction.ts:146-149`) | **legitim komponiert (kein Duplikat)** |
| Jellyfin-Import | `CreateJellyfinCard` (`page.tsx:140-161`) | Suche `searchAdminJellyfinIntakeCandidates`, Vorschau `previewAdminAnimeFromJellyfinIntake`, Speichern `createAdminAnimeFromJellyfinDraft` (`admin-anime-intake.ts:33-107`) | `GET /jellyfin/series`, `POST /jellyfin/intake/preview` (keine Persistenz), **derselbe** `POST /admin/anime` | `anime` | Vorbefüllung Titel/Typ/Assets, Fehler isoliert im Jellyfin-Abschnitt | **legitim komponiert (gleicher Speicherpfad)** |
| AniSearch-Import | `CreateAniSearchIntakeCard` (`page.tsx:116-138`) | `loadAdminAnimeCreateAniSearchDraft`, `searchAdminAnimeCreateAniSearchCandidates` (`admin-anime-intake.ts:109-159`) | `POST /anime/enrichment/anisearch`, `GET .../search` — legt **nie** selbst einen Anime an, nur Draft-Befüllung | `anime` (über Submit-Pfad) | Save-time-Duplikat-Schutz nur mit AniSearch-Quelle im Payload (`admin_content_anime.go:47-61`) | **legitim komponiert** |
| Episoden-Import | kein eigener Abschnitt auf `create/page.tsx`, eigene Episoden-Verwaltungsseite | 3 Endpunkte `episode-import/{context,preview,apply}` (`admin_episode_import.go:24,42,120`) + separater `POST /admin/episodes` (`CreateEpisode`, 4. feinerer Weg) | `admin_routes.go:87-89,99` | **release-native Tabellenkette** `episodes`/`release_variants`/`release_streams`/`stream_sources` (komplett andere Tabellen) | 502 bei AniSearch- UND Jellyfin-Fehler (nicht fachlich differenziert) | **legitim getrennt (eigene Fachaufgabe, eigene Infrastruktur)** |

**(d) Rechte:** Anzeige: gesamte Seite in `<PlatformAdminGate>` (`page.tsx:470-476`). Durchsetzung: alle Endpunkte (inkl. aller Episoden-Endpunkte) über `requireAdmin`→`requirePlatformAdminIdentity` (`platform_admin_authz.go:15-45`). **0 Abweichungen über 2 geprüfte Vergleichspunkte.**

**Summenzeilen:** 3 Anlege-Wege (1 gemeinsamer Speicher-Endpunkt), 4 Sub-Hooks, 4 Episoden-bezogene Endpunkte insgesamt (3 Import + 1 einfaches Anlegen), 2 Rechte-Vergleichspunkte (0 Abweichungen) (reproduzierbar: `scripts/count-09-anime-anlegen-importieren.sh`).

---

## Fachaufgabe 10: Rechte anzeigen vs. Rechte durchsetzen

**Quelle:** D-02 #10, Nachprüfung von 174-HOTSPOTS.md D-07 "False Positive". Details: `data/10-rechte-anzeigen-durchsetzen.md`, `scripts/count-10-rechte-anzeigen-durchsetzen.sh`.

| (a) UI-Fläche | (b)/(c) Endpunkt | Zentraler Resolver | (e) Daten |
|---|---|---|---|
| `FansubEditAccessGate.tsx:49` | `GET /admin/fansubs/:id/capabilities` → `app_auth_capabilities.go:44` (Route `admin_routes.go:222`) | `permissions.Service.CanForFansubGroup` | `role_capabilities` (In-Memory-Cache, `LoadCache` `:383-397`) |
| `EpisodeVersionEditorPage.tsx`+`workspace/page.tsx` | `GET /admin/release-versions/:versionId/capabilities` → `admin_content_release_version_media_capabilities.go:25` | `permissions.Service.CanForReleaseVersion` | dieselbe Cache-Quelle |
| `RoleCatalogProvider.tsx:44-60` | `GET /role-catalog/...` | — (reine Anzeige-Metadaten, **kein** Rechte-Gate) | `role_definitions` (getrennte Tabelle, legitim getrennt) |

**(d) Stichprobe 9 Aktionen über 4 Fachaufgaben — Anzeige- vs. Durchsetzungs-Konstante:**

| # | Aktion | Fachaufgabe | Anzeige | Durchsetzung | Gleich? |
|---|---|---|---|---|---|
| 1 | `ActionFansubGroupEdit` | Gruppenverwaltung | `app_auth_capabilities.go:56,242` | `fansub_groups.go:270-280,353,365` | **Ja** |
| 2 | `ActionFansubGroupEdit` (Gruppenmedien-Review) | Fachaufgabe 4 | `app_auth_capabilities.go:259` | `fansub_media_review_handler.go:382,397` | **Ja** (BUG-174-02-Fix) |
| 3 | `ActionReviewImageDecide` | Fachaufgabe 4 | `release_review_handler_authz.go:15-26` | `release_review_handler.go:185` | **Ja** (eine Funktion für beide Seiten) |
| 4 | `ActionReviewTextDecide` | Fachaufgabe 4 | `app_auth_capabilities.go:171,260` | `release_review_handler.go:185` | **Ja** |
| 5 | `ActionReleaseVersionMediaUpdate` | Fachaufgabe 3 | `admin_content_release_version_media_capabilities.go:56,101`, `_permissions.go:228-231` | `admin_content_release_version_media_patch.go:79` | **Ja** (BUG-174-04-Fix) |
| 6 | `ActionReleaseVersionMediaReorder` | Fachaufgabe 3 | `admin_content_release_version_media_capabilities.go:66,104` | `admin_content_release_version_media_reorder.go:47` | **Ja** |
| 7 | `ActionReleaseVersionMediaUpload` | Fachaufgabe 1 | `app_auth_capabilities.go:146,262` (via `CanForFansubGroup`) | `admin_content_release_version_media_upload.go:140` (via `CanForReleaseVersion`) | **Ja**, bewusst unterschiedlicher Resolver-Eintrittspunkt bei gleichem Cache-Eintrag — kein Risiko |
| 8 | `ActionFansubGroupMembersManage` | Fachaufgabe 4 | `app_auth_capabilities.go:86,249` | `contribution_review_handler.go:91,139,199` | **Ja** |
| 9 | `ActionFansubGroupHistoricalMembersLink` | Fachaufgabe 5 | `app_auth_capabilities.go:101`, `dashboard_me_handler.go:180-181` | `member_claims_handler.go:118,142,167,192` | **Ja** |

**Ergebnis: 9/9 identisch.** Bestätigt 174-HOTSPOTS D-07 "False Positive" — ein zentraler Resolver, keine String-Divergenz.

**(f) Verhalten bei Cache-Veralterung:** Fail-closed-Startup-Abbruch bei fehlender Action-Zuordnung (`validateCapabilityCatalog`, `permissions.go:402-416`) und bei fehlender Baseline-Registry (`:435-446`). Laufzeit-Cache wird nur bei Start/explizitem `ReloadCache` neu geladen — ob der Rollen-Matrix-Editor (`/admin/roles`) nach jeder Mutation `ReloadCache` aufruft, wurde in dieser Phase **nicht nachvollzogen** (Hinweis für Folgephase).

**Summenzeilen:** 2 Capability-Endpunkte, 9 untersuchte Aktionen über 4 Fachaufgaben, 0 String-Abweichungen, 1 bestätigter zentraler Resolver (reproduzierbar: `scripts/count-10-rechte-anzeigen-durchsetzen.sh`).

---

## Fachaufgabe 11: Status-/Label-Darstellung

**Quelle:** D-02 #11, aufbauend auf 174-HOTSPOTS.md D-07 "Status Mapping" (F-02). Details: `data/11-status-label-darstellung.md`, `scripts/count-11-status-label-darstellung.sh`.

| # | Gruppe | (a)/(b) Implementierungen | (c) Backend-Herkunft | (f) Verhaltensvergleich | D-04 |
|---|---|---|---|---|---|
| 1 | Segment-Typ-Badge (OP/ED/IN/OUT/PV) | `getTypeBadgeLabel` produktiv: `SegmenteTab.helpers.tsx:16-23` → `'Outro'`→`'OUT'`; tot: `segmenteTabUtils.ts:3-9` → `'Outro'`→`'PV'` (0 Importeure außer eigener Testdatei) | `theme_type_name` (Freitext, `jellyfin_themes`) | **Bestätigter F-02-Bug: gleicher Wert, unterschiedliches Ergebnis** | **NICHT blind mergen (F-02/D-07) + totes Duplikat (`segmenteTabUtils.ts`) entfernbar** |
| 2 | Fansub-Gruppenmedien-Kategorie-Label | `getCategoryLabel` (`GroupMediaReviewGrid.tsx:28-36,63-65`) vs. `getFansubMediaCategoryLabel` (`fansub-labels.ts:4-13,27-29`, "AO5-08: zentrale Labels") | `media_assets.category` (8-Wert-Enum) | 2/8 Werte weichen ab: `old_website` ("Alte Website" vs. "Alte Webseite"), `irc_chat` ("IRC-Chat" vs. "IRC / Chat") | **NICHT blind mergen — neuer Fund, Entscheidung an Nutzer/Folgephase** |
| 3 | Mitgliedsanfrage-(Claim)-Status-Label | `UserClaimsTab.tsx:41-56` vs. `ClaimsClient.tsx:57-67,70-80` | `claim.claim_status` (identisches Feld) | `'verified'` → "Verifiziert" vs. "Genehmigt"; zusätzlich unterschiedliche Fallwert-Abdeckung (`active`/`open`/`denied`-Aliase nur in `UserClaimsTab.tsx`) | **NICHT blind mergen — neuer Fund** |
| 4 | App-User-Konten-Status-Label | 4 Implementierungen: `AdminUsersClient.tsx:40-52`, `UserDetailPageClient.tsx:57-81`, `UserOverviewTab.tsx:39-52`, `RoleHoldersTable.tsx:45-58` (Duplikation im Code-Kommentar selbst dokumentiert, `:39-43`) | `app_users.status` | **Byte-identisch für alle 4 Eingabewerte** | **Duplikat (risikofrei mergbar)** |
| 5 | Release-Version-Medien-Review-State-Label | produktiv: `statusBadge` (`ReleaseVersionMediaSection.tsx:36-62`); tot: `reviewLabel` (`ReleaseVersionMediaGallery.tsx:32-48`, 0 Importeure außer eigener Testdatei) | `release_version_media_review_lifecycle.review_state` + Fallback `review_status`/`visibility` | **Byte-identisch** für alle 4 Werte + Fallback | **Duplikat (risikofrei mergbar) + totes Duplikat entfernbar** |
| 6 | Rollenlabel (Role-Catalog) | `labelForRole` (`roleCatalog.ts:41-43`) ← aufgerufen von `roleLabels` (`contributionRoles.ts:38-42`) | `role_definitions.label_de` | Strukturell keine Abweichung möglich (direkter Aufruf, keine eigene Logik) | **legitim zentral (false positive)** |

**Summenzeilen:** 6 untersuchte Label-Gruppen, 3 mit Verhaltensabweichung (Gruppe 1/2/3), 2 byte-identische Duplikate ohne Verhaltensabweichung (Gruppe 4/5), 1 korrekt zentralisiert (Gruppe 6), 2 zusätzliche tote Produktionscode-Duplikate (`segmenteTabUtils.ts`, `ReleaseVersionMediaGallery.tsx`), 0 fälschlich rechtesuggerierende Labels gefunden (reproduzierbar: `scripts/count-11-status-label-darstellung.sh`).

---

## Fachaufgabe 12: Benachrichtigung/Hinweise

**Quelle:** D-02 #12, Fortsetzung BUG-174-02. Details: `data/12-benachrichtigung-hinweise.md`, `scripts/count-12-benachrichtigung-hinweise.sh`.

### Teil 1 — Dashboard-Attention (4 Funktionen)

| # | Funktion | (c) Fundstelle | (d) Rechte-geprüft | (d) Analoge Durchsetzung | Konsistent? |
|---|---|---|---|---|---|
| 1 | `attachPendingClaimAttention` | `dashboard_me_handler.go:156-201,180-187` | `ActionFansubGroupHistoricalMembersLink` | `member_claims_handler.go:118,142,167,192` | **Ja** |
| 2 | `attachPendingGroupMediaReviewAttention` | `dashboard_me_handler.go:212-241,226-227` | `ActionFansubGroupEdit` | `fansub_media_review_handler.go:382,397` | **Ja (BUG-174-02-Fix bestätigt)** |
| 3 | `attachPendingReleaseReviewAttention` | `dashboard_me_handler.go:249-283,265` | `ResolveReviewGroupAuthorization` (`ActionReviewImageDecide`/`ActionReviewTextDecide`) | `release_review_handler.go:185`, `authorizedKinds` (`release_review_handler_authz.go:15-26`) | **Ja** |
| 4 | `attachPendingOwnNoteRevisionAttention` | `dashboard_me_handler.go:293-313,285-292` | Absichtlich kein Rechte-Check (Eigendaten) | n/a | **Ja (strukturell)** |

**(a) UI:** `AttentionSection.tsx:36-...,60,86,116,139` einzige Konsumentenfläche für alle 4 Lanes, eingebunden von `me/dashboard/page.tsx:144-157`. **(b)/(c):** `getOwnDashboard()` (`projects.ts:22`) → `GET /me/dashboard` → `dashboard_me_handler.go:94-153` (EIN Endpunkt liefert alle 4 Arrays). **(e):** keine eigene Attention-Tabelle, liest aus den bereits in Fachaufgabe 4/10 dokumentierten Tabellen. **(f):** alle 4 Lanes bei jedem Aufruf frisch berechnet, kein Caching, kein Dismiss-Zustand.

**Ergebnis: 0/4 Abweichungen.** Vollständigkeits-Lücke bestätigt (kein Dashboard-Hinweis für Beiträge/Vorschläge, bereits aus Fachaufgabe 4 bekannt).

### Teil 2 — Toast-Benachrichtigungen

**(a)/(b):** 0 zentrales System (`grep` für `useToast`/`ToastProvider`/`pushToast`/`addToast` → 0 Treffer außerhalb Tests). Eine Komponente `MessageToast.tsx:20-39` existiert, ist aber **totes Produktionscode** (0 Importeure). Tatsächliches Muster: **48 Dateien** mit lokaler `errorBox`/`successBox`-CSS-Klasse (u. a. `AdminAnimeOverviewClient.tsx:185-195`, `AdminAnimeEditPageClient.tsx:114-115`). **(c)/(d):** n/a (reines Frontend-Konzept). **(f):** Dismiss-Verhalten divergiert — kein Timer (`AdminAnimeOverviewClient.tsx`), 4000ms benannte Konstante (`useSegmentPreviewImageHandlers.ts:16,77`), 1800ms hartkodiert ohne geteilte Konstante (`FansubAppMembersSection.tsx:230`).

**D-04:** Variante mit hohem Konsolidierungspotenzial (48 Fundstellen, kein Rechte-Risiko).

### Teil 3 — Mail-Benachrichtigungen

**(a)/(b)/(c):** Genau **1 Mail-Typ** im gesamten Backend (`grep "MailMessage{"` → 1 Treffer) — Fansub-Gruppen-Einladungsmail, `app_auth_invitations.go:140-212,190-195`, `services/mailer.go:27-55`. **(d):** Erzeugung bereits rechte-geprüft (`ActionFansubGroupInvitationsCreate`), Audit bei Erfolg/Fehlschlag (`:213-227`). **(e):** `fansub_group_invitations`, Mailinhalt nicht persistiert. **(f):** HTML-Escaping (`:172-179`), CRLF-Schutz (`mailer.go:63-70`), Fail-closed bei Versandfehler (`:191-206`), kein Token im Audit-Log. **Negativbefund:** kein zweiter, ungehärteter Mail-Typ existiert.

**Summenzeilen:** 4 Attention-Funktionen (0 Abweichungen), 1 fehlende Attention-Lane (Beiträge), 0 zentrale Toast-Infrastruktur, 48 Ad-hoc-Implementierungen, 1 tote Toast-Komponente, 2 unterschiedliche Auto-Dismiss-Timer, 1 Mail-Typ (bereits gehärtet), 0 ältere ungehärtete Mail-Typen (reproduzierbar: `scripts/count-12-benachrichtigung-hinweise.sh`).

---

## Zusätzliche Fachaufgaben

Quer über alle 12 Fragmente sowie `174-FOLLOWUPS.md`/`174-REPORT.md` wurde geprüft, ob eine wiederkehrende, eigenständige Geschäftsaufgabe auffällt, die D-02s 12-Punkte-Liste nicht abdeckt. Geprüfte Kandidaten und Ausschlussbegründung:

- **Fansub-Gruppe anlegen/bearbeiten (Stammdaten-CRUD):** Taucht in den Fragmenten 4, 8 und 10 als Beleg-Nebenschauplatz auf (`ActionFansubGroupEdit`, `DeleteFansub`), aber es existiert genau EIN Formular/EIN Endpunkt-Paar pro Vorgang (Anlegen über `admin/fansubs/page.tsx`, Bearbeiten über die Edit-Seite) — kein Parallel-Build, kein Duplikat-Kandidat. Kein eigenständiger Fund, keine neue Fachaufgabe nötig.
- **Episoden anlegen (ohne Jellyfin-Bindung):** In Fragment 9 als "vierter, feinerer Anlege-Weg" innerhalb der Episoden-Fachaufgabe dokumentiert (`POST /admin/episodes`). Dies ist bereits Teil von Fachaufgabe 9 ("Anime anlegen/importieren", die den Episoden-Import ausdrücklich mit abdeckt) — keine eigenständige 13. Fachaufgabe.
- **Rollenverwaltung/Rollenmatrix (`/admin/roles`):** In Fragment 10/11 als Konsument des Rechte-Caches bzw. Quelle für Rollenlabels erwähnt. Die Rollenmatrix-UI selbst wurde in Phase 138 bereits als EINE kanonische Oberfläche gebaut (kein Parallel-Build in den Fragmenten gefunden) — deckt sich mit Fachaufgabe 10 (Rechte anzeigen/durchsetzen), kein eigenständiger neuer Fund.
- **Mail-/Toast-Benachrichtigungsinfrastruktur:** Vollständig in Fachaufgabe 12 ("Benachrichtigung/Hinweise") erfasst — kein separater Kandidat.
- **Suche über Mitglieder/Archiv (`searchArchive`):** In Fragment 6 als fehlplatzierter Fund innerhalb von `history.ts` dokumentiert, gehört aber fachlich zu Fachaufgabe 7 ("Suchen & Filtern") — keine eigene Fachaufgabe, sondern ein Datei-Platzierungsbefund innerhalb einer bestehenden Fachaufgabe.

**Ergebnis: Keine zusätzliche Fachaufgabe identifiziert** — alle während der Welle-1-Analyse gefundenen Geschäftsvorgänge sind in den 12 D-02-Fachaufgaben abgedeckt. Die oben genannten Kandidaten sind entweder bereits Teil einer bestehenden Fachaufgabe oder zeigen keinen Parallel-Build-Charakter, der eine eigene Nummerierung rechtfertigen würde.

---

## Verifikation der Zusammenführung

- Alle Zahlen in diesem Dokument stammen unverändert aus den jeweiligen `data/NN-*.md`-Fragmenten; keine neue, unbelegte Zahl wurde in diesem Merge-Schritt erzeugt.
- Jeder Fachaufgaben-Abschnitt zitiert die zugrundeliegende Fragment-Datei und ihr Reproduktions-Skript.
- `.planning/sketches/010-galerie-detailansicht` wurde in dieser Zusammenführung nicht angefasst (nur in Fachaufgabe 2 referenziert, dort bereits als "nur gelesen" dokumentiert).
