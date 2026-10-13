# Phase 181 – CONTEXT (freigegeben)

Status: **Freigegeben** — Nutzerentscheidungen D-01 bis D-05 liegen vor (2026-10-13), alle
Empfehlungen aus dem Entwurf wurden angenommen. Grundlage für `/gsd:ui-phase 181` und
`/gsd:plan-phase 181`. Kein Code wurde für diese Inventur verändert.

## Ziel

Aktuell gibt es zwei getrennte Seiten für dieselbe Fachaufgabe „Release-Version bearbeiten":

- **Admin-Editor**: `/admin/episode-versions/[versionId]/edit`
  (`EpisodeVersionEditorPage.tsx`, 966 Zeilen, + `useEpisodeVersionEditor`-Hook, 416 Zeilen)
- **Mitglieder-Workspace**: `/me/releases/[versionId]/workspace`
  (`page.tsx`, 448 Zeilen, seit Phase 82)

Ziel von F-13: **eine** rechtebasierte Release-Bearbeitungsseite statt dieser zwei Parallel-
Implementierungen. Sichtbarkeit von Tabs/Aktionen wird ausschließlich über
`ReleaseVersionCapabilities` (+ Plattform-Admin-Flag) gesteuert, nicht über die URL. Die alte
Workspace-URL leitet auf die neue Seite weiter. Alle bekannten Einstiegspunkte zeigen auf die
eine Seite. Ein Plattform-Admin ohne Mitgliederprofil bekommt dabei kein 404 mehr.

## Ist-Zustand (Inventur, Stand 2026-10-13, read-only)

### Gemeinsamer Kern (bereits geteilt)

| Baustein | Fundort | Genutzt von |
|---|---|---|
| Lade-Endpunkt | `getEpisodeVersionEditorContext(versionId)` → `GET /api/v1/admin/episode-versions/:versionId/editor-context` (`admin_content_episode_version_editor.go:16-64`) | beide Seiten |
| Speicher-Endpunkt | `updateEpisodeVersion(versionId, patch)` → `PATCH /api/v1/episode-versions/:versionId` (`episode_version_update.go:16-91`) | beide Seiten |
| Rechte-Endpunkt | `getReleaseVersionCapabilities(versionId)` → `GET /api/v1/admin/release-versions/:versionId/capabilities` (`admin_content_release_version_media_capabilities.go:25-110`) | beide Seiten |
| Rechte-Typ | `ReleaseVersionCapabilities` (`frontend/src/types/releaseVersionMedia.ts:156-167`): `can_view_media`, `can_upload_media`, `can_update_media`, `can_delete_media`, `can_delete_own_media?`, `can_edit_notes`, `can_manage_segments`, `can_reorder_media`, `can_manage_highlights`, `can_edit_metadata?` | beide Seiten |
| Inhalts-Komponenten | `ReleaseVersionMetadataFields`, `SegmenteTab`, `ReleaseVersionMediaSection`, `ReleaseVersionNotesTab` — identische Komponenten (Workspace importiert sie aus der Admin-Editor-Mappe) | beide Seiten |
| Backend-Rechtekern | `permissions.CanForReleaseVersion` (`permissions.go:626-707`) — Plattform-Admin-Shortcut (sofort `Allowed=true`), sonst Gruppenrollen-Check + Contribution-Rollen-Fallback | beide Endpunkte |
| Metadaten-only-Gate | `isReleaseMetadataOnlyPatch` (`episode_version_update.go:92-99`) blockt `FansubGroups`/`MediaProvider`/`MediaItemID`/`StreamURL` im Patch für Nicht-Admins (403) | PATCH-Endpunkt |

### Divergenzen (doppelt implementiert, NICHT geteilt)

| Aspekt | Admin-Editor | Mitglieder-Workspace |
|---|---|---|
| Tabs | 7 Tabs für Admin (Übersicht, Dateien, Informationen, Segmente, Media, Changelog, Notizen) + externer Link „Öffentliche Release-Seite"; reduzierte Variante für Contributor-Zugriff im selben Editor | max. 4 Tabs, strikt capability-gated: Basisdaten, Bilder & Medien, Segmente, Notizen |
| Tab-Mechanik | eigener `activeTab`-State + Handmarkup | generische `<Tabs>`-Komponente |
| Admin-exklusive Inhalte | Jellyfin-Ordner-Scan, Datei-Auswahl, Advanced-Mode Media-Provider-Override, Episoden-Klassifikation, Speicherort-Anzeige, Fansub-Gruppen-Zuweisung, Löschen-Button | keine — Workspace kann diese Felder laut Backend-Gate (`isReleaseMetadataOnlyPatch`) ohnehin nicht patchen |
| Haupt-Hook | `useEpisodeVersionEditor` (kapselt Laden/Formular/Speichern/Scan/Gruppensuche) | kein eigener Hook — Logik direkt in `page.tsx` (`useEffect` + schlankes `saveMetadata`) |
| Rechtemodell Frontend | Zwei-Ebenen: `isPlatformAdmin` (aus `getCurrentUser().is_platform_admin`) ODER Capabilities | Ein-Ebenen: nur Capabilities, zusätzliches `memberId`-Gate für Notizen (`can_edit_notes && memberId != null`) |
| Vor/Zurück-Navigation | **episodenübergreifend**: `useEpisodeNeighborNavigation` + `getGroupedEpisodes(animeId)` — sucht Nachbar-Episode (nach `episode_number`), darin passende Gruppe/Version. Navigiert über ALLE Episoden der Anime. | **projektbezogen**: nutzt `getMyProjectDetail(animeId, groupId).release_versions`-Liste, Nachbar = `[currentIndex±1]` in dieser Liste. Navigiert NUR innerhalb Release-Versionen desselben Anime+Gruppe-Projekts. |
| Zurück-Navigation (`return_to`) | akzeptiert zwei Muster: `/admin/fansubs/\d+/edit` ODER `/me/projects/\d+/group/\d+` (`getSafeReturnPath`) | akzeptiert nur exakt `/me/projects/{animeId}/group/{fansubGroupId}` (`getProjectReturnPath`) |
| Header | Breadcrumb Anime→Episode→Gruppe·Version, Eyebrow „Admin/Contributor Editor", „Ungespeicherte Änderungen"-Badge | Breadcrumb „Meine Projekte"→Anime→Episode, Eyebrow „Release-Projektbereich", Badges für `can_upload_media`/`can_edit_notes` |

### `/me`-Handler mit Pflicht-`member_claim` (404 bei fehlendem Profil)

Gemeinsamer Resolver: `resolveVerifiedMemberIDForAppUser` (`me_identity_helpers.go:14-38`),
liest `member_claims WHERE app_user_id=$1 AND claim_status='verified'`. **10 Handler-Funktionen**
in 3 Dateien verlangen diesen Claim zwingend und antworten bei Fehlen mit
`404 "kein verifizierter Member-Account verknüpft"`:

1. `ContributionsMeHandler.GetMyProjectDetail` — `contributions_me_project_handler.go:13-35`
   (`GET /me/projects/:animeId`) ← **relevant für F-13**: liefert `release_versions`-Liste für
   die projektbezogene Vor/Zurück-Navigation des Workspace
2. `ContributionsMeHandler.ListMyAnimeContributions` — `contributions_me_handler.go:100-106`
3. `ContributionsMeHandler.ListMyGroupContributions` — `contributions_me_handler.go:126-132`
4. `ContributionsMeHandler.UpdateMyAnimeContributionVisibility` — `contributions_me_handler.go:179-201`
5. `ContributionsMeHandler.ConfirmMyAnimeContribution` — `contributions_me_handler.go:427-437`
6. `ContributionsMeHandler.RejectMyAnimeContributionWithReason` — `contributions_me_handler.go:484-502`
7. `ContributionsMeHandler.UpdateMyGroupContributionVisibility` — `contributions_me_handler.go:592-619`
8. `ContributionProposalsMeHandler.ListMemberships` — `contribution_proposals_me_handler.go:335-343`
9. `ContributionProposalsMeHandler.CreateProposal` — `contribution_proposals_me_handler.go:140-163`
10. `ContributionProposalsMeHandler.SelfPublish` — `contribution_proposals_me_handler.go:265-279`

**Dokumentierte Ausnahme (Vorbild für den Fix):** `DashboardMeHandler.GetOwnDashboard`
(`dashboard_me_handler.go:90-120`) ruft denselben Resolver auf, antwortet bei fehlendem Claim
aber NICHT mit 404, sondern graceful mit `200` + leeren Dashboard-Daten — im Code bereits als
„D-09-Kontrast" dokumentiert, weil das Dashboard für jeden eingeloggten User erreichbar bleiben
muss. Dasselbe Muster ist der naheliegende Fix für Punkt 1 (`GetMyProjectDetail`), damit ein
Plattform-Admin ohne Mitgliederprofil auf der zusammengeführten Seite kein 404 mehr bekommt.

### Einstiegspunkte (Ist-Zustand, vollständige Zählung)

**Zur Admin-Route `/admin/episode-versions/[versionId]/edit` — 6 bestätigte externe
Einstiegspunkte** (übergabe-schätzung war „ca. 10", real 6 + 1 fragwürdig):

| # | Datei:Zeile | Kontext |
|---|---|---|
| 1 | `components/episodes/EpisodesOverview/VersionRow.tsx:123` | „Bearbeiten"-Button je Version in Anime-Episoden-Übersicht (`admin/anime/[id]/episodes`) |
| 2 | `app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:663` | „Bearbeiten"-Link je Version in Episoden-Versionen-Liste |
| 3 | `app/admin/users/tabs/UserMediaTab.tsx:116` | „Release-Medien öffnen" im Admin-User-Detail (Medien-Tab) |
| 4 | `app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:287` | „Release bearbeiten" in der Admin-Prüfliste (nur bei `can_edit_release`) |
| 5 | `app/admin/fansubs/[id]/edit/fansubEditAccess.ts:185` (`releaseVersionToolsTarget`) → `ReleaseRowDetails.tsx:115-122` | „Werkzeuge"-Link je Release-Zeile in Fansub-Gruppen-Edit (Releases-Tab) |
| 6 | `app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx:92` | „Media verwalten" im Medien-Vorschau-Drawer derselben Seite |
| (fragwürdig) | `app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx:289` | „Version bearbeiten" — Komponente scheint aktuell in keiner erreichbaren Seite verdrahtet (vermutlich toter Code); vor Umbau verifizieren |

**Zur Workspace-Route `/me/releases/[versionId]/workspace` — 5 bestätigte externe
Einstiegspunkte**:

| # | Datei:Zeile | Kontext |
|---|---|---|
| 1 | `app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:351` | „Notizen & Medien" je Release-Zeile im Mitglieder-Projekt-Detail |
| 2 | `app/me/dashboard/components/AttentionSection.tsx:172` | Link je abgelehnter Notiz-Revision im Dashboard „Braucht deine Aufmerksamkeit" |
| 3 | `app/me/dashboard/components/attentionHelpers.ts:38` (`resolveWorkspaceHref`) → `AttentionSection.tsx:195` | „Projekt öffnen" für neue Zuweisungen im Dashboard |
| 4 | `components/contributions/ContributionCard.tsx:100` | „Arbeitsfläche öffnen" je bestätigtem Beitrag (`me/contributions`) |
| 5 | `components/contributions/AnimeGroupCard.tsx:280` | „Arbeitsfläche öffnen" je Rolle/Zeitraum (`me/contributions`) |

Insgesamt **11 externe Einstiegspunkte** (6 Admin + 5 Workspace), die bei einer Zusammenführung
auf die eine Zielseite umgestellt werden müssen, zzgl. der zwei internen Selbst-Navigationspfade
(Vor/Zurück innerhalb der jeweiligen Seite).

## Zielbild (freigegeben, Details siehe Entscheidungen D-01..D-05 unten)

- **Eine** Seite/Komponente unter dem neutralen Pfad `/releases/[versionId]/edit` ersetzt beide
  bisherigen Implementierungen. Tabs und Aktionen werden rein aus `ReleaseVersionCapabilities` +
  `isPlatformAdmin` berechnet (additiv, kein Sonderpfad pro Rolle mehr in zwei getrennten
  Code-Pfaden).
- Admin-exklusive Inhalte (Jellyfin-Scan, Gruppen-Zuweisung, Episoden-Klassifikation, Löschen,
  Dateien-Tab, Änderungsverlauf-Tab) bleiben hinter `isPlatformAdmin` sichtbar — das Backend
  erzwingt die entsprechenden Grenzen bereits unabhängig vom Frontend
  (`isReleaseMetadataOnlyPatch`).
- Beide alten Adressen (`/admin/episode-versions/[versionId]/edit` und
  `/me/releases/[versionId]/workspace`) leiten dauerhaft auf die neue Zielroute weiter,
  Query-Parameter (`return_to` usw.) bleiben beim Redirect erhalten.
- Alle 11 gefundenen externen Einstiegspunkte zeigen direkt auf die neue Zielroute (kein
  Umweg über eine der beiden alten Adressen mehr).
- `GetMyProjectDetail` bekommt das `GetOwnDashboard`-Muster (graceful statt 404 bei fehlendem
  Member-Claim), damit die projektbezogene Vor/Zurück-Navigation für einen Plattform-Admin ohne
  Mitgliederprofil nicht hart fehlschlägt.

## Abgrenzung (nicht Teil dieser Phase)

- **F-01** (alter Bildspeicher entfernen) — unabhängiges Thema, nicht Teil von F-13.
- **F-18** (einheitlicher Bild-Viewer/Lightbox) — eigene Phase, auch wenn beide Editor-Seiten
  eigene Medien-Detaildialoge mit eigener Bildbühne haben; hier nur insofern relevant, als die
  Medien-Tab-Komponente (`ReleaseVersionMediaSection`) bereits geteilt ist und unverändert bleibt.
- **Status-/Label-Konsolidierung** (z. B. F-02 `getTypeBadgeLabel`-Divergenz) — nicht Teil dieser
  Phase, wird separat behandelt.
- **F-15** (globaler Upload-Baustein) — Release-Medien-Upload bleibt funktional wie heute,
  nur die umgebende Seite wird vereinheitlicht.

## Entscheidungen (D-01 bis D-05, Nutzer 2026-10-13, verbindlich)

### D-01 Kanonische Adresse: neutraler Pfad `/releases/[versionId]/edit`

Geprüft: Es existiert **keine** öffentliche Top-Level-`/releases`-Route unter
`frontend/src/app/` — nur `app/me/releases/` (der abzulösende Workspace) und die interne
API-Route `app/api/releases/`. Es gibt auch keine andere Top-Level-Kollision (vorhandene
Top-Level-Ordner: `admin`, `anime`, `api`, `archiv`, `claim-invitations`, `covers`, `dev`,
`episodes`, `fansubs`, `invitations`, `login`, `me`, `media`, `members`, `suche`, `watchlist`).
Die öffentliche Release-Galerie liegt verschachtelt unter
`anime/[id]/group/[groupId]/releases/[releaseVersionId]/` und kollidiert damit ebenfalls nicht
mit einem neuen Top-Level-Pfad `/releases/[versionId]/edit`. **`/releases/[versionId]/edit` ist
damit kollisionsfrei und wird die kanonische Adresse.**

- Beide alten Adressen leiten dorthin weiter:
  - `/admin/episode-versions/[versionId]/edit` → `/releases/[versionId]/edit`
  - `/me/releases/[versionId]/workspace` → `/releases/[versionId]/edit` (dauerhaft, siehe D-04)
- Query-Parameter (`return_to`, `tab`, `animeId`, `episodeId` usw.) bleiben beim Redirect
  erhalten (Pass-through, kein Parameter-Verlust).
- Alle 11 gefundenen externen Einstiegspunkte (6 Admin, siehe Tabelle „Zur Admin-Route" oben;
  5 Workspace, siehe Tabelle „Zur Workspace-Route" oben) werden direkt auf
  `/releases/[versionId]/edit` umgestellt statt über eine alte Adresse umzuleiten.
- Der fragwürdige/vermutlich tote Pfad in `EpisodeEditForm.tsx:289` wird vor dem Umbau verifiziert
  (erreichbar ja/nein) und entsprechend behandelt (umstellen oder als toten Code entfernen).
- Tab-Query-Parameter-Konvention wird vereinheitlicht: Admin nutzt heute
  `uebersicht/dateien/informationen/segmente/media/changelog/notizen`, Workspace nutzt
  `metadata/media/segments/notes` — die neue Seite braucht ein einheitliches Set (Ableitung aus
  D-02: nur die 4 gemeinsamen Tabs plus ggf. admin-exklusive Zusatz-Tabs).

### D-02 Tabs für Mitglieder ohne Admin-Rechte: wie heute im Workspace

Mitglieder ohne Plattform-Admin-Rechte sehen weiterhin **nur die 4 rechtegesteuerten Tabs**
(Basisdaten, Medien, Segmente, Notizen), gesteuert durch `ReleaseVersionCapabilities`. Die
Admin-exklusiven Tabs (Dateien/Jellyfin, Änderungsverlauf/Changelog) sind für sie **nicht
sichtbar** — keine ausgegrauten Tabs, kein Hinweis auf deren Existenz. Die admin-internen
Inhalte aus „Informationen" (Episoden-Klassifikation, Speicherort, Fansub-Gruppen-Zuweisung)
bleiben ebenfalls nur für `isPlatformAdmin` sichtbar, analog zum heutigen Admin-Editor-Verhalten
für Contributor-Zugriff.

### D-03 Vor/Zurück-Blättern: kontextabhängig nach Einstieg, kein Umschalter

Die Navigation leitet sich automatisch aus dem Einstiegskontext ab (heute schon über
`return_to` transportiert, kein neuer Parameter nötig):
- Einstieg aus einem Projekt-Kontext (z. B. `return_to=/me/projects/{animeId}/group/{groupId}`
  oder direkt aus `/me/projects/.../page.tsx`) → Blättern **innerhalb des Anime+Gruppe-Projekts**
  (heutiges Workspace-Verhalten, Datenquelle `getMyProjectDetail(...).release_versions`).
- Einstieg aus der Episoden-Übersicht (z. B. `return_to=/admin/fansubs/{id}/edit` oder aus den
  Episoden-/Versionen-Listen-Einstiegspunkten) → Blättern **durch alle Episoden der Anime**
  (heutiges Admin-Verhalten, Datenquelle `getGroupedEpisodes(animeId)`).
- Beide Navigationsmodi bleiben als Code bestehen; die neue Seite wählt zur Laufzeit anhand des
  Kontexts, welcher aktiv ist — kein sichtbarer Umschalter für den Nutzer.

### D-04 Weiterleitung der alten Workspace-Adresse: dauerhaft

`/me/releases/[versionId]/workspace` leitet **dauerhaft** auf `/releases/[versionId]/edit` weiter
(kein Entfernungstermin, kein Cutover). Grund: marginaler Code-Aufwand für den Redirect
gegenüber echtem, aber leicht unbemerktem Risiko kaputter Lesezeichen bei Mitgliedern.

### D-05 Plattform-Admin ohne Mitgliederprofil: kein 404 mehr

Analog zum bereits im Code dokumentierten `GetOwnDashboard`-Muster
(`dashboard_me_handler.go:90-120`, „D-09-Kontrast") antwortet `ContributionsMeHandler.
GetMyProjectDetail` (`contributions_me_project_handler.go:13-35`) künftig graceful statt mit
404, wenn für den `app_user` kein verifizierter `member_claim` existiert — sowohl auf der
zusammengeführten Release-Seite selbst als auch bei der projektbezogenen Vor/Zurück-Navigation
(D-03). Die übrigen 9 `/me`-Handler mit Pflicht-`member_claim` (siehe Liste oben, Punkte 2–10)
sind nicht Teil dieser Änderung — sie betreffen andere Fachaufgaben (Beitragslisten,
Mitgliedschaften, Vorschläge) außerhalb des Release-Editor-Scopes von F-13.

## Pflicht-Constraints (gelten für Planung und Umsetzung dieser Phase)

- **Globale UI-Primitives**: jede neue/angepasste Oberfläche nutzt ausschließlich
  `@/components/ui` (Button, Select, FormField, Modal, Input, Textarea, Tabs, Drawer, Card,
  Table …) — keine handgebauten nativen `<select>/<input>/<textarea>/<button>`.
- **Globale Design-Tokens** statt neuer Ad-hoc-Werte.
- **Korrekte Umlaute** in jedem user-facing deutschen String (JSX-Text, Labels,
  Fehlermeldungen, Platzhalter, aria-labels, Toasts, Go-Response-Strings) — keine
  ASCII-Ersetzungen (ae/oe/ue/ss).
- **Modularität**: Produktionsdateien ≤ 450 Zeilen. `EpisodeVersionEditorPage.tsx` (966 Zeilen)
  wird im Rahmen der Zusammenführung aufgeteilt, nicht 1:1 in die neue Seite kopiert.
- **Teststil**: Tests führen den geprüften Code tatsächlich aus (Logik hinter den Knöpfen,
  z. B. Capability-Berechnung, Redirect-Ziel-Auflösung, kontextabhängige Navigationswahl) —
  keine Render-/Klick-Simulationstests und keine Quelltext-Inspektionstests
  (`os.ReadFile` + `strings.Contains` auf Produktionsdateien).
- **Live-UAT**: die eigentlichen Klickabläufe (Redirects, Tab-Sichtbarkeit je Rolle,
  Vor/Zurück-Navigation je Kontext) werden in der Live-UAT abgenommen, nicht nur durch
  automatisierte Tests.

---

*Dieser Stand ist freigegeben (D-01 bis D-05) und Grundlage für `/gsd:ui-phase 181` und
`/gsd:plan-phase 181`. Kein Code wurde für diese Inventur verändert.*
