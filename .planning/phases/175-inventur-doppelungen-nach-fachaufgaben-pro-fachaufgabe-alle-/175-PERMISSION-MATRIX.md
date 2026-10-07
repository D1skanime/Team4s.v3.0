# Phase 175 Plan 08: Rechte-Matrix — Aktion → Anzeige-Recht vs. Durchsetzungs-Recht

**Zweck:** D-07-Artefakt 2. Konsolidiert alle in den 12 Welle-1-Fragmenten (`data/01-*.md` bis
`data/12-*.md`) bereits unter Spalte (d) dokumentierten Anzeige-/Durchsetzungs-Rechte-Paare in
EINE durchgängige Tabelle und markiert jede Abweichung explizit. **Keine Abweichung wird hier
behoben (D-01) — reine Dokumentation**, als Beleggrundlage für D-05 ("Rechte-Konsistenz zuerst
prüfen") und direkter Nachfolger der in Phase 174 gefundenen Muster BUG-174-02/BUG-174-04.

**Methode:** Jedes der 12 Fragmente wurde auf seine (d)-Spalte(n) durchsucht; jede dort belegte
Aktion wurde 1:1 mit Datei:Zeile für beide Seiten (Anzeige/Durchsetzung) in die Tabelle unten
übernommen, keine Werte neu erhoben. Zeilen sind nach Fachaufgaben-Nummer sortiert. Fachaufgaben
7 (Suchen & Filtern) und 11 (Status-/Label-Darstellung) dokumentieren in ihren Fragmenten
durchgängig `(d) Rechte: n/a` (reine Darstellungs-/Filterlogik ohne Capability-Beteiligung) —
sie liefern daher keine Anzeige-/Durchsetzungs-Rechte-PAARE und tauchen nicht als Tabellenzeile
auf; das ist ein bestätigter Negativbefund, kein Auslassungsfehler (siehe Abschnitt
"Fachaufgaben ohne Rechte-Aktionspaare" unten).

---

## Konsolidierte Tabelle: Aktion → Anzeige-Recht vs. Durchsetzungs-Recht

| # | Aktion | Fachaufgabe (Nr. + Name) | Anzeige-Recht (Konstante + Datei:Zeile) | Durchsetzungs-Recht (Konstante + Datei:Zeile) | Übereinstimmung | Schweregrad bei Abweichung | Muster-Referenz |
|---|---|---|---|---|---|---|---|
| 1.1 | Release-Medien-Upload | 1 Medien hochladen | `can_upload_media` → `ActionReleaseVersionMediaUpload` — `ReleaseVersionMediaSection.tsx:141` | `ActionReleaseVersionMediaUpload` — `admin_content_release_version_media_upload.go:140` | **konsistent** | – | – |
| 1.2 | Gruppenmedien-Upload | 1 Medien hochladen | `can_upload_group_media`/`can_edit_group` — `GroupMediaReviewSection.tsx:173-174` | `ActionFansubGroupMediaUpload` **+** Custom-Permission-Fallback (`GetFansubGroupMediaPermissionsForAppUser`) — `fansub_media_upload.go:54-72` | **abweichend** | mittel | neues Muster (zwei parallele Rechte-Ebenen statt einer Aktion) |
| 1.3 | Fansub-Logo/Banner-Upload | 1 Medien hochladen | Gruppen-Edit-Zugriff, grob (Fansub-Edit-Seite insgesamt) | `ActionFansubGroupEdit` — `fansub_media_upload.go:54` | **konsistent** (grob = grob, legitim) | – | – |
| 1.4 | Anime-Assets-Upload | 1 Medien hochladen | kein UI-Capability-Check — `AnimeJellyfinAssetUploadControls.tsx` (verlässt sich auf Seitenzugriff) | Plattform-Admin-Guard (`requirePlatformAdminIdentity`), bei `segment_preview` stattdessen Segment-Recht — `media_upload_segment_preview.go:38-41` | **abweichend** | mittel | neues Muster (Anzeige fehlt vollständig, ist gröber als Durchsetzung) |
| 1.5 | Segment-Assets-Upload (Kara-Video) | 1 Medien hochladen | Segment-Tab-Zugriff (Editor-Rechte) | `ActionReleaseVersionSegmentsManage` — `admin_content_anime_theme_segments.go:175` | **konsistent** | – | – |
| 1.6 | Release-Theme-Assets-Upload (beide Einstiege) | 1 Medien hochladen | kein separates Capability-Flag identifiziert (verlässt sich auf Seitenzugriff) | `ActionReleaseVersionMediaUpload` (fremde, release-version-media-spezifische Aktion wiederverwendet) — `admin_content_release_theme_assets.go:196,376` | **abweichend** | niedrig | neues Muster (semantisch falsche/fremde Aktion wiederverwendet) |
| 1.7 | Profil-Avatar/-Hintergrund/-Story-Upload | 1 Medien hochladen | keine (Self-Service, Zielressource immer das eigene Profil) | `authMiddleware` only — `main.go:378-380` | **konsistent** (legitim ohne Capability) | – | – |
| 1.8 | Medien-Vorschläge-Upload | 1 Medien hochladen | keine (jeder eingeloggte Member) | `requireMeIdentity` — `suggestions_me_handler.go:138` | **konsistent** | – | – |
| 2.1 | Bild ansehen — `ReleaseGallery.tsx` | 2 Bild ansehen | öffentlich, keine Capability-Prüfung | öffentlich, serverseitig sichtbarkeitsgefiltert | **konsistent** (keine private Ressource) | – | – |
| 2.2 | Bild ansehen — `FansubMediaLightbox`/`FansubGroupMediaBlock` | 2 Bild ansehen | öffentlich | öffentlich, sichtbarkeitsgefiltert | **konsistent** | – | – |
| 2.3 | Bild ansehen — `ScreenshotGallery.tsx` | 2 Bild ansehen | öffentlich | öffentlich | **konsistent** | – | – |
| 2.4 | Bild ansehen — `ProjectMemberMediaViewer.tsx` | 2 Bild ansehen | öffentlich, `authOptionalMiddleware` | öffentlich, sichtbarkeitsgefiltert | **konsistent** | – | – |
| 2.5 | Bild ansehen — `GroupAssetsExperience.tsx` | 2 Bild ansehen | öffentlich | öffentlich | **konsistent** | – | – |
| 2.6 | Medium bearbeiten (Admin-Drawer, Release-Version-Editor) | 2 Bild ansehen | `selectedItem.can_update`/`can_delete` ← `ActionReleaseVersionMediaUpdate`/`Delete` — `ReleaseVersionMediaSection.tsx:153-157` | `ActionReleaseVersionMediaUpdate`/`ActionReleaseVersionMediaDelete` — `admin_content_release_version_media_patch.go:79`, `_delete.go` | **konsistent** | – | – |
| 2.8 | Gruppenmedien-Review-Detail-Drawer | 2 Bild ansehen | `canUpdate`/`canUpdateOwn`/`canReview`-Props (Section-Capabilities) | `ActionFansubGroupMediaUpdate`/`ActionFansubGroupEdit`/`ActionFansubGroupMediaUpdateOwn` — `fansub_media_review_handler.go:394-415` | **konsistent** | – | – |
| 3.1 | Release-Version-Editor-Zugriff (Admin-Rahmen + `/me`-Workspace-Rahmen) | 3 Release bearbeiten | `ReleaseVersionCapabilities`, identisch über denselben Endpunkt geladen in beiden Rahmen — `EpisodeVersionEditorPage.tsx:195` / `workspace/page.tsx:270` | `CanForReleaseVersion`, Plattform-Admin-Override in Schritt 0 — `permissions.go:624,635-643` | **konsistent** | – | – |
| 4.1 | Gruppenmedien-Review-Entscheidung | 4 Prüfen & Freigeben | `can_review_group_media` ← `ActionFansubGroupEdit` (`GroupMediaReviewSection.tsx:172`, `app_auth_capabilities.go:56,259`) + Dashboard-Hinweis `ActionFansubGroupEdit` (`dashboard_me_handler.go:226-227`) | `ActionFansubGroupEdit` — `fansub_media_review_handler.go:382,397` | **konsistent** (BUG-174-02-Gegenprobe am aktuellen Code bestanden) | – | BUG-174-02 (behoben, bestätigt) |
| 4.2 | Release-Bilder bearbeiten/ersetzen | 4 Prüfen & Freigeben | `items[i].CanUpdate` ← `ActionReleaseVersionMediaUpdate` — `admin_content_release_version_media_permissions.go:228-231`/`:147-150` | `ActionReleaseVersionMediaUpdate` — `admin_content_release_version_media_patch.go:79` | **konsistent** (BUG-174-04-Gegenprobe am aktuellen Code bestanden) | – | BUG-174-04 (behoben, bestätigt) |
| 4.3 | Release-Bilder-Review-Entscheidung | 4 Prüfen & Freigeben | `ActionReviewImageDecide`, `authorizedKinds` beim Laden — `release_review_handler_authz.go:15-26` | `ActionReviewImageDecide`, dieselbe `authorizedKinds`-Funktion — `release_review_handler.go:185` | **konsistent** (strukturell identisch, eine Funktion bedient beide Seiten) | – | – |
| 4.4 | Release-Notizen-Review-Entscheidung | 4 Prüfen & Freigeben | `ActionReviewTextDecide`, `authorizedKinds` + `CanReviewText` — `app_auth_capabilities.go:171,260` | `ActionReviewTextDecide`, dieselbe `authorizedKinds`-Funktion — `release_review_handler.go:185` | **konsistent** | – | – |
| 4.5 | Beiträge/Vorschläge-Review-Entscheidung | 4 Prüfen & Freigeben | `can_manage_members` ← `ActionFansubGroupMembersManage` — `ContributionsReviewSection.tsx:49`, `app_auth_capabilities.go:86,249` | `ActionFansubGroupMembersManage` — `contribution_review_handler.go:91,139,199` | **konsistent** | – | – |
| 5.1 | App-Member-Invite erstellen/stornieren | 5 Mitglieder einladen/Claims | `can_create_invitation`/`can_cancel_invitation` ← `ActionFansubGroupInvitationsCreate`/`...Cancel` — `app_auth_capabilities.go:126,131` | gleiche Actions — `app_auth_invitations.go:81,272` | **konsistent** | – | – |
| 5.2 | App-Member-Invite annehmen | 5 Mitglieder einladen/Claims | kein Capability-Gate, nur `hasAccessToken` — `InviteAcceptFlow.tsx:119` | `CanAcceptInvitation`, standalone Status-Check (`actor.Status != disabled`) — `permissions.go:271,603-614` | **konsistent** (legitim getrennt, token-basierte Entscheidung) | – | – |
| 5.3 | Claim-Invite annehmen | 5 Mitglieder einladen/Claims | kein Capability-Gate, nur `hasAccessToken` — `InviteAcceptFlow.tsx` (gleiche UI-Komponente wie 5.2) | `requireMeIdentity` NUR — **kein** `disabled`-Status-Check — `member_claim_invitations_handler.go:144` | **abweichend** | niedrig | neues Muster (Parallelimplementierung derselben Vorbedingung divergiert von Schwester-Flow 5.2) |
| 5.4 | Claim-Verwaltung (Verify/Reject/Activate/Invite-CRUD) | 5 Mitglieder einladen/Claims | `can_link_historical_members` ← `ActionFansubGroupHistoricalMembersLink` — `app_auth_capabilities.go:101` | `ActionFansubGroupHistoricalMembersLink` — `member_claims_handler.go:209-236` | **konsistent** | – | – |
| 5.5 | Mitgliedsanfragen (Neuanlage) Verwaltung | 5 Mitglieder einladen/Claims | keine eigene Rechte-Differenzierung in `ClaimManagementPanel.tsx` (zeigt beide Tabellen nebeneinander) | `requirePlatformAdmin` — `member_requests_handler.go:143-153` | **konsistent** (legitim getrennter globaler Scope; UX-Verwechslungsrisiko dokumentiert, kein Rechte-Fehler) | – | – |
| 6.1 | Fansub-/Gruppen-Notizen — Tab-Sichtbarkeit | 6 Notizen schreiben | Tab-Gate: `can_edit_notes` **ODER** `can_edit_founding_history` — `fansubEditAccess.ts:46` | `ActionFansubGroupNotesWrite`, einzige Aktion — `admin_content_fansub_group_notes.go:19-43` | **abweichend** | mittel | BUG-174-02-artig (ODER-Gate erlaubt mehr Rollen als die Durchsetzung zulässt) |
| 6.2 | Fansub-/Gruppen-Notizen — Button-Ebene | 6 Notizen schreiben | keine Prüfung, nur `hasActiveSession` — `NotesTab.tsx:66-94` | `ActionFansubGroupNotesWrite` — `admin_content_fansub_group_notes.go:19-43` | **abweichend** | mittel | BUG-174-02-artig (fehlendes `foundingOnly`-Pendant, das die Schwester-Komponente `GroupHistorySection` bereits hat) |
| 6.3 | Gruppen-Meilensteine | 6 Notizen schreiben | dynamisch je `event_type`, korrekt im UI nachgebildet via `foundingOnly` — `FansubEditSecondaryTabs.tsx:133` | `ActionFansubGroupMembersManage`/`ActionFansubGroupPageFoundingHistoryEdit`, dynamisch gewählt — `fansub_group_history_handler.go:477-483` | **konsistent** | – | – |
| 6.4 | Member-Group-Story (Dead Feature) | 6 Notizen schreiben | keine UI (0 Frontend-Konsumenten, unerreichbar) | `requireAdmin` — `admin_content_member_stories.go:35,61,84,140,201` | **n/a** (strukturell inkonsistentes Rechte-Modell gegenüber den übrigen Clustern, aktuell folgenlos da unerreichbar) | niedrig (latent) | neues Muster (Stolperstein, falls künftig naiv eine UI ergänzt wird) |
| 6.5 | Release-Version-Notizen | 6 Notizen schreiben | `can_edit_release_notes` ← `ActionReleaseVersionNotesWrite`, pro Rolle — `ReleaseVersionNotesTab.tsx:146-147,579` | `ActionReleaseVersionNotesWrite` + `ActionReleaseVersionNotesViewAll` — `admin_content_release_version_notes.go:61-118` | **konsistent** (bestes Anzeige/Durchsetzungs-Match der 5 Cluster) | – | – |
| 6.6 | Anime-Fansub-Projekt-Notizen (Schreiben) | 6 Notizen schreiben | `hasAccessToken`, grob — `AnimeProjectNotesSection.tsx` | `ActionFansubGroupNotesWrite` — `admin_content_anime_project_notes.go:103` | **konsistent** (grobe Anzeige ohne bekannte feinere Alternative) | – | – |
| 6.7 | Anime-Fansub-Projekt-Notizen (Lesen, Admin) | 6 Notizen schreiben | `hasAccessToken`, grob — `AnimeProjectNotesSection.tsx` | `ActionReleaseView`, breiter als die Schreib-Aktion — `admin_content_anime_project_notes.go:53` | **konsistent** (legitime Variante: Lesen darf mehr Rollen als Schreiben) | – | – |
| 8.1 | Anime löschen | 8 Löschen/Aufräumen | `PlatformAdminGate` (Button nur im Admin-Bereich sichtbar) | `requireAdmin` — `admin_content_anime.go:224` | **konsistent** | – | – |
| 8.2 | Fansub-Gruppe löschen | 8 Löschen/Aufräumen | `PlatformAdminGate` — `fansubs/page.tsx:812-814` | `requireAdmin` — `fansub_groups.go:380` | **konsistent** | – | – |
| 8.3 | Fansub-Mitglied löschen (aktiv genutzt) | 8 Löschen/Aufräumen | Zugriff auf Mitglieder-Tab (Gruppen-Edit-Zugriff) | `ActionFansubGroupHistoricalMembersManage`, gruppenscoped — `fansub_hist_group_members_handler.go:375` | **konsistent** (grob = grob, legitim) | – | – |
| 8.4 | Fansub-Mitglied löschen (Legacy, Orphan-Endpunkt) | 8 Löschen/Aufräumen | kein UI-Pfad mehr (`deleteFansubMember` hat 0 Aufrufer außerhalb von Tests) | `requireAdmin`, strenger als der aktiv genutzte Pfad — `fansub_group_members.go:166` | **n/a** (toter Code, kein Frontend-Einstieg; abweichende Strenge gegenüber 8.3 ist folgenlos solange unerreichbar) | niedrig (totes Risiko) | neues Muster (Orphan-Endpunkt mit abweichender Rechte-Strenge zum aktiven Pfad) |
| 9.1 | Anime anlegen (3 Wege) + Episoden-Import (4 Endpunkte) | 9 Anime anlegen/importieren | `is_platform_admin` — `PlatformAdminGate.tsx:76`, Seiten-Wrapper `page.tsx:470-476` | `AppGlobalRolePlatformAdmin` via `requireAdmin` — `platform_admin_authz.go:15-45` | **konsistent** (9 Lese-/Schreib-Endpunkte geprüft, 0 Abweichungen) | – | – |
| 10.1 | Gruppenverwaltung (Fansub-Edit-Stammdaten) | 10 Rechte anzeigen vs. durchsetzen | `can_edit_group` ← `ActionFansubGroupEdit` — `app_auth_capabilities.go:56,242` | `ActionFansubGroupEdit`, via `requiredFansubGroupPatchActions` — `fansub_groups.go:270-280,353,365` | **konsistent** | – | – |
| 10.2 | Release-Version-Medien-Reorder | 10 Rechte anzeigen vs. durchsetzen | `CanReorderMedia` ← `ActionReleaseVersionMediaReorder` — `admin_content_release_version_media_capabilities.go:66,104` | `ActionReleaseVersionMediaReorder` — `admin_content_release_version_media_reorder.go:47` | **konsistent** | – | – |
| 12.1 | Dashboard-Hinweis: offene Claims | 12 Benachrichtigung/Hinweise | `ActionFansubGroupHistoricalMembersLink`, pro Fansub-Gruppe gecacht — `dashboard_me_handler.go:180-187` | `ActionFansubGroupHistoricalMembersLink` — `member_claims_handler.go:118,142,167,192` | **konsistent** | – | – |
| 12.2 | Dashboard-Hinweis: offene Gruppenmedien-Prüfung | 12 Benachrichtigung/Hinweise | `ActionFansubGroupEdit` — `dashboard_me_handler.go:226-227` | `ActionFansubGroupEdit` — `fansub_media_review_handler.go:382,397` | **konsistent** (BUG-174-02-Fix am aktuellen Code bestätigt) | – | BUG-174-02 (behoben, bestätigt) |
| 12.3 | Dashboard-Hinweis: offene Release-Review | 12 Benachrichtigung/Hinweise | `ActionReviewImageDecide`/`ActionReviewTextDecide`, getrennt nach Bild/Text — `dashboard_me_handler.go:265-276` | dieselbe `authorizedKinds`-Kette wie 4.3/4.4 — `release_review_handler.go:185` | **konsistent** | – | – |
| 12.4 | Dashboard-Hinweis: eigene abgelehnte Notizen | 12 Benachrichtigung/Hinweise | kein Rechte-Check, reine Eigendaten — `dashboard_me_handler.go:285-292` | n/a (kein Fremddaten-Zugriff möglich, verifizierte `memberID` genügt als Gate) | **konsistent** (strukturell, kein Rechte-Pfad nötig) | – | – |

**Hinweis zu Fachaufgabe 10 (data/10-rechte-anzeigen-durchsetzen.md):** Das Fragment führt eine
Stichprobe von 9 Aktionen über 4 Fachaufgaben als unabhängige Gegenprobe der zentralen
Resolver-Infrastruktur durch. 7 dieser 9 Aktionen (`ActionFansubGroupEdit`-Zweitnutzung,
`ActionReviewImageDecide`, `ActionReviewTextDecide`, `ActionReleaseVersionMediaUpdate`,
`ActionReleaseVersionMediaUpload`, `ActionFansubGroupMembersManage`,
`ActionFansubGroupHistoricalMembersLink`) sind bereits oben unter den Fachaufgaben 1/4/5 als
eigene Zeilen erfasst (data/10 bestätigt sie dort unabhängig als konsistent, keine
Doppelzählung in den Summen unten). Nur die zwei Aktionen, die in keinem anderen Fragment
explizit mit Datei:Zeile belegt sind (`ActionFansubGroupEdit` für die Basis-Gruppenverwaltung,
`ActionReleaseVersionMediaReorder`), erscheinen oben als eigenständige Zeilen 10.1/10.2.

---

## Befund-Absätze zu den markierten Abweichungen (174-BUGS.md-Format, nicht behoben — D-01)

### Befund zu Zeile 1.2 — Gruppenmedien-Upload: zwei parallele Rechte-Ebenen

- **Gefunden:** Inventur `data/01-medien-hochladen.md`, Weg 2 (Gruppenmedien-Upload). Anzeige
  prüft `can_upload_group_media`/`can_edit_group` (eine einzige Capability-Quelle), die
  Durchsetzung in `UploadFansubMedia` (`fansub_media_upload.go:42`) prüft bei `kind=image`
  zusätzlich zu `permissions.ActionFansubGroupMediaUpload` einen **individuellen
  Custom-Permission-Fallback** (`GetFansubGroupMediaPermissionsForAppUser(...).CanUpload`,
  Zeilen 64-72), den der analoge Release-Medien-Upload-Weg (Zeile 1.1) nicht kennt.
- **Ursache:** Zwei unabhängig gewachsene Rechte-Schichten für dieselbe fachliche Aktion
  (rollenbasierte Capability-Action + individuelle Permission-Tabelle), die serverseitig additiv
  (ODER) kombiniert werden, aber clientseitig nur die erste Schicht in die Anzeige-Entscheidung
  einfließt.
- **Betroffene Rolle/Rechte-Kombination:** Nutzer mit individuellem Custom-Upload-Recht aber
  ohne `can_upload_group_media`/`can_edit_group` könnten serverseitig uploaden dürfen, ohne dass
  die Anzeige den Button zeigt (Unterschätzung) — oder umgekehrt, je nachdem wie die
  Custom-Permission-Tabelle in der Praxis befüllt ist (nicht vollständig in dieser Phase
  nachvollzogen, da individuelle Permission-Datensätze nicht Teil der statischen Code-Analyse).
- **Schweregrad:** mittel.

### Befund zu Zeile 1.4 — Anime-Assets-Upload: Anzeige fehlt vollständig

- **Gefunden:** Inventur `data/01-medien-hochladen.md`, Weg 4 (Anime-Assets-Upload).
  `AnimeJellyfinAssetUploadControls.tsx` prüft keine Capability vor dem Rendern der
  Upload-Controls — es verlässt sich vollständig auf Routen-/Seitenzugriff. Die Durchsetzung
  (`media_upload_segment_preview.go:38-41`) verlangt dagegen explizit einen
  Plattform-Admin-Guard (außer beim Sonderfall `segment_preview`).
- **Ursache:** Kein granulares Capability-Flag für Anime-Asset-Uploads wurde je in
  `app_auth_capabilities.go` eingeführt — die UI zeigt die Controls jedem Nutzer, der die
  Anime-Edit-Seite erreicht, unabhängig von dessen tatsächlicher Plattform-Admin-Rolle.
- **Betroffene Rolle/Rechte-Kombination:** Ein Nutzer mit Zugriff auf die Anime-Edit-Seite, aber
  ohne Plattform-Admin-Rolle, sieht die Upload-Controls, erhält aber beim tatsächlichen Upload
  einen serverseitigen 403 — ein UX-Fehlversprechen, kein Sicherheitsloch (Durchsetzung ist
  strenger als Anzeige, nicht umgekehrt), aber dennoch eine dokumentationswürdige Inkonsistenz
  im Sinne von D-05.
- **Schweregrad:** mittel.

### Befund zu Zeile 1.6 — Release-Theme-Assets-Upload: semantisch falsche Aktion wiederverwendet

- **Gefunden:** Inventur `data/01-medien-hochladen.md`, Weg 6 (Release-Theme-Assets-Upload,
  beide Einstiege). Beide Handler (`UploadReleaseThemeAsset`/`UploadReleaseThemeAssetForRelease`)
  nutzen konsistent untereinander `permissions.ActionReleaseVersionMediaUpload`
  (`admin_content_release_theme_assets.go:196,376`) — dieselbe Aktion wie der Release-Medien-
  Upload (Zeile 1.1), obwohl Theme-Assets eine andere Ressource (`release_theme_assets`-Tabelle
  statt `release_version_media`) sind. Es existiert kein separates UI-Capability-Flag.
- **Ursache:** Beim Bau der Theme-Asset-Handler wurde eine bereits vorhandene, thematisch
  naheliegende Aktion wiederverwendet, statt eine eigene `ActionReleaseThemeAssetUpload`-Aktion
  einzuführen.
- **Betroffene Rolle/Rechte-Kombination:** Keine konkrete Fehlfunktion heute (wer Release-Medien
  hochladen darf, darf faktisch auch Theme-Assets hochladen) — das Risiko ist zukunftsgerichtet:
  würde `ActionReleaseVersionMediaUpload` je enger gefasst (z. B. nur für Galerie-Bilder), würde
  das versehentlich auch Theme-Assets einschränken, ohne dass dies aus dem Aktionsnamen
  erkennbar wäre.
- **Schweregrad:** niedrig.

### Befund zu Zeile 5.3 — Claim-Invite-Accept ohne `disabled`-Status-Prüfung

- **Gefunden:** Inventur `data/05-mitglieder-einladen-claims.md`, Befund 3.
  `AcceptClaimInvitation` (`member_claim_invitations_handler.go:144`) nutzt ausschließlich
  `requireMeIdentity`, die nur das Vorhandensein eines Auth-Tokens prüft — nicht
  `actor.Status == "disabled"`. Die strukturell parallele `AcceptFansubInvitation` (Zeile 5.2,
  App-Member-Invite) nutzt dagegen `CanAcceptInvitation(actor)`, die genau diesen Status-Check
  durchführt.
- **Ursache:** Zwei unabhängig implementierte Accept-Handler für zwei fachlich verschiedene
  Invite-Typen, die dieselbe UI-Komponente (`InviteAcceptFlow`) teilen und für den Nutzer
  identisch wirken, aber serverseitig unterschiedliche Vorbedingungsprüfungen durchlaufen.
- **Betroffene Rolle/Rechte-Kombination:** Ein deaktivierter (`disabled`) App-User kann eine
  Claim-Invite annehmen und sich damit einen historischen Member-Eintrag verknüpfen plus
  `members.profile_visibility='public'` setzen — kann aber keine Fansub-Gruppen-Invite annehmen.
- **Schweregrad:** niedrig (deaktivierte Accounts sind eine Rand-Situation).

### Befund zu Zeile 6.1 — Fansub-/Gruppen-Notizen Tab-Gate: ODER-Verknüpfung erlaubt mehr als Durchsetzung

- **Gefunden:** Inventur `data/06-notizen-schreiben.md`, Befund 2. Der "Notizen"-Tab ist sichtbar
  bei `can_edit_notes **ODER** can_edit_founding_history` (`fansubEditAccess.ts:46`) — die
  Durchsetzung in allen vier CRUD-Handlern prüft ausschließlich `ActionFansubGroupNotesWrite`
  (`admin_content_fansub_group_notes.go:19-43`), was nur der ersten der beiden ODER-Bedingungen
  entspricht.
- **Ursache:** Das Tab-Gate wurde offenbar bewusst weit gefasst, um auch
  Founding-History-Editoren Zugang zum Tab zu geben — aber ohne die serverseitige Durchsetzung
  entsprechend zu erweitern oder die UI innerhalb des Tabs einzuschränken.
- **Betroffene Rolle/Rechte-Kombination:** Ein Nutzer mit **nur** `can_edit_founding_history=true`
  (aber `can_edit_notes=false`) sieht den Notizen-Tab und darin voll funktionsfähige Buttons;
  beim Speichern lehnt der Server mit 403 ab.
- **Schweregrad:** mittel (betrifft eine durch die Capability-Matrix explizit vorgesehene
  Rand-Rolle).

### Befund zu Zeile 6.2 — Fansub-/Gruppen-Notizen Button-Ebene: fehlendes `foundingOnly`-Pendant

- **Gefunden:** Inventur `data/06-notizen-schreiben.md`, Befund 2 (Fortsetzung). `NotesTab.tsx`
  (Zeile 66-94) prüft innerhalb des Tabs **keine** Capability für die Buttons "Neue
  Gruppennotiz hinzufügen"/"Bearbeiten"/"Löschen" — nur `hasActiveSession`. Die
  Schwester-Komponente `GroupHistorySection` bekommt dagegen explizit ein `foundingOnly`-Flag
  (`FansubEditSecondaryTabs.tsx:133`), das genau den in Zeile 6.1 beschriebenen Fall abfängt und
  die Meilenstein-Sektion auf Founding-Events beschränkt — `NotesTab` erhält dieses Flag nicht
  (`FansubEditSecondaryTabs.tsx:130`).
- **Ursache:** Die zweistufige UI-Einschränkung (Tab-Gate grob, Komponente fein) wurde für
  `GroupHistorySection` umgesetzt, aber nicht auf die strukturell parallele `NotesTab`
  übertragen.
- **Betroffene Rolle/Rechte-Kombination:** Dieselbe Rand-Rolle wie Zeile 6.1
  (`can_edit_founding_history` ohne `can_edit_notes`) — hier zusätzlich ohne die Abfederung, die
  bei den Gruppen-Meilensteinen bereits existiert.
- **Schweregrad:** mittel.

---

## Weitere Befunde (informativ, nicht als Abweichung gezählt — strukturell inkonsistent, aber aktuell folgenlos)

### Befund zu Zeile 6.4 — Member-Group-Story: inkonsistentes Rechte-Modell bei totem Feature

- **Gefunden:** Inventur `data/06-notizen-schreiben.md`, Befund 1. Alle fünf
  `Member-Group-Story`-Handler nutzen `requireAdmin` (Plattform-Admin, NICHT gruppen-skopiert),
  während alle anderen Fansub-Edit-Inhalte in dieser Fachaufgabe die gruppen-skopierte
  `CanForFansubGroup`-Familie nutzen.
- **Ursache:** Das Backend-Feature wurde vollständig gebaut, aber nie an eine UI angeschlossen
  (0 Frontend-Konsumenten) — das Rechte-Modell wurde daher nie an das sonst übliche
  Gruppen-Scoping angepasst.
- **Betroffene Rolle/Rechte-Kombination:** Aktuell keine (unerreichbar). Würde eine UI ergänzt,
  die naiv das Muster der Nachbar-Cluster erwartet, entstünde eine echte Diskrepanz.
- **Schweregrad:** niedrig (latent).

### Befund zu Zeile 8.4 — Fansub-Mitglied-Löschen Legacy: Orphan-Endpunkt mit abweichender Strenge

- **Gefunden:** Inventur `data/08-loeschen-aufraeumen.md`, Abschnitt 3./4. Der aktiv genutzte
  Lösch-Pfad (`DELETE /admin/fansubs/:id/group-members/:memberId`) prüft gruppenscoped
  `ActionFansubGroupHistoricalMembersManage`; ein zweiter, älterer Endpunkt
  (`DELETE /fansubs/:id/members/:memberId`) prüft stattdessen `requireAdmin`
  (plattform-admin-only) auf der alten `fansub_members`-Tabelle.
- **Ursache:** Migrationsrückstand — die Frontend-API-Funktion `deleteFansubMember` hat laut
  Grep 0 Aufrufer außerhalb von Tests; die UI ruft ausschließlich den neueren
  `deleteGroupMember`-Pfad auf.
- **Betroffene Rolle/Rechte-Kombination:** Keine (kein Frontend-Einstieg mehr erreichbar). Risiko
  ist rein zukunftsgerichtet (totes Code-Pfad-Risiko).
- **Schweregrad:** niedrig (totes Risiko).

---

## Fachaufgaben ohne Rechte-Aktionspaare

- **Fachaufgabe 7 (Suchen & Filtern):** Alle 7 untersuchten Implementierungen (globale
  Suchbibliothek + 6 Einzel-Filter) dokumentieren `(d) Rechte: n/a` — die globale Suche ist
  öffentlich ohne Capability-Prüfung, die Einzel-Filter filtern bereits serverseitig
  rechte-gefiltert geladene Listen rein clientseitig. Kein Anzeige-/Durchsetzungs-Paar
  vorhanden.
- **Fachaufgabe 11 (Status-/Label-Darstellung):** Alle 6 untersuchten Label-Funktionsgruppen
  dokumentieren `(d) Rechte-Bezug: n/a` — reine Darstellungslogik ohne Capability-Beteiligung.
  Das Fragment bestätigt explizit per Grep (`"Prüfbar\|bearbeitbar"`, 0 Treffer), dass kein Label
  fälschlich eine Handlungsberechtigung suggeriert.

Beide Negativbefunde sind bewusste Bestätigungen, keine Lücken dieser Matrix.

---

## Zusammenfassung — Gesamtzahlen

| Kategorie | Anzahl |
|---|---|
| **Geprüfte Aktionen gesamt (Tabellenzeilen)** | **44** |
| davon **konsistent** | 36 |
| davon **abweichend** | 6 |
| davon **n/a** (strukturell inkonsistent, aber aktuell folgenlos/unerreichbar) | 2 |

### Abweichende Aktionen nach Schweregrad

| Schweregrad | Anzahl | Zeilen |
|---|---|---|
| mittel | 4 | 1.2, 1.4, 6.1, 6.2 |
| niedrig | 2 | 1.6, 5.3 |

### Informative Befunde (n/a) nach Schweregrad

| Schweregrad | Anzahl | Zeilen |
|---|---|---|
| niedrig (latent/totes Risiko) | 2 | 6.4, 8.4 |

### Bereits in Phase 174 behobene Muster, am aktuellen Code erneut bestätigt

| Muster | Zeilen | Status |
|---|---|---|
| BUG-174-02 (Dashboard/Review-Anzeige nutzte andere Aktion als Durchsetzung) | 4.1, 12.2 | behoben, bestätigt konsistent |
| BUG-174-04 (Fremd-Edit an Release-Bildern durch Wiedereinreichungszwang blockiert) | 4.2 | behoben, bestätigt konsistent |

**Einordnung für `175-ROADMAP-PROPOSAL.md` (175-09):** Die 6 abweichenden Zeilen (1.2, 1.4, 1.6,
5.3, 6.1, 6.2) sowie die 2 informativen Befunde (6.4, 8.4) sind Kandidaten für eine künftige
Rechte-Konsolidierungsphase. Keine dieser Abweichungen wird in Phase 175 behoben (D-01) — die
Entscheidung über Priorität und Fix-Ansatz obliegt der in D-09 vorgesehenen Nutzer-Bestätigung
des Phasenzuschnitts.
