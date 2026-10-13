# Phase 181 – CONTEXT (Entwurf)

Status: Entwurf, read-only Inventur abgeschlossen. Noch NICHT geplant (kein `/gsd:plan-phase`
gelaufen). Dient als Diskussionsgrundlage für die offenen Fragen unten.

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

## Vorschlag Zielbild (zur Diskussion, siehe offene Fragen unten)

- **Eine** Seite/Komponente ersetzt beide bisherigen Implementierungen. Tabs und Aktionen werden
  rein aus `ReleaseVersionCapabilities` + `isPlatformAdmin` berechnet (additiv, kein Sonderpfad
  pro Rolle mehr in zwei getrennten Code-Pfaden).
- Admin-exklusive Inhalte (Jellyfin-Scan, Gruppen-Zuweisung, Episoden-Klassifikation, Löschen)
  bleiben hinter `isPlatformAdmin` sichtbar — das Backend erzwingt die entsprechenden Grenzen
  bereits unabhängig vom Frontend (`isReleaseMetadataOnlyPatch`).
- Die alte Workspace-URL (`/me/releases/[versionId]/workspace`) wird zu einer Weiterleitung auf
  die neue Zielroute (Mechanismus: siehe offene Frage 4).
- Alle 11 gefundenen Einstiegspunkte werden auf die neue Zielroute umgestellt.
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

## Offene Fragen an den Nutzer

### Frage 1: Kanonische URL — welcher Pfad bleibt?

- **Option A — Admin-Pfad bleibt kanonisch** (`/admin/episode-versions/[versionId]/edit`,
  ggf. umbenannt). Vorteil: mehr Einstiegspunkte (6) zeigen bereits dorthin, Admin-Editor ist der
  funktional vollständigere der beiden (hat alle Tabs). Nachteil: Pfad klingt nach „nur für
  Admins", obwohl künftig auch Mitglieder ohne Admin-Rechte dort landen sollen — potenziell
  verwirrend im Alltag, wenn ein normales Gruppenmitglied in der URL „/admin/..." sieht.
- **Option B — neutraler Pfad** (z. B. `/releases/[versionId]/edit` oder `/releases/[versionId]`
  ohne „/admin"- oder „/me"-Präfix). Vorteil: URL beschreibt die Fachaufgabe statt der Rolle,
  passt zu „eine rechtebasierte Seite für alle". Nachteil: 11 Einstiegspunkte + alte Workspace-
  Weiterleitung müssen auf einen komplett neuen Pfad umgestellt werden (mehr Änderungsfläche);
  ggf. Kollision mit bestehenden Routing-Konventionen prüfen.
- **Option C — `/me`-Pfad bleibt kanonisch**, Admin-Route leitet um. Vorteil: wenig Änderung aus
  Mitglieder-Sicht. Nachteil: 6 Admin-Einstiegspunkte (Episoden-Übersicht, User-Medien-Tab,
  Review-Queue, Fansub-Edit ×2) müssten auf einen `/me`-Pfad zeigen, der Admins ohne
  Mitgliederprofil historisch ausgesperrt hat — widerspricht dem eigentlichen Phasenziel.

**Empfehlung:** Option B (neutraler Pfad). Er trifft den Kern des Phasenziels „eine
rechtebasierte Seite" am saubersten — die URL soll nicht mehr implizieren, wer sie nutzen darf.
Der Migrationsaufwand (11 Stellen + Redirect) ist ohnehin für jede Option ähnlich groß, weil
mindestens eine der beiden alten Routen in jedem Fall abgelöst wird.

### Frage 2: Mitglieder ohne Admin-Rechte — welche Tabs sehen sie künftig?

- **Option A — exakt wie heute im Workspace**: nur die 4 capability-gated Tabs (Basisdaten,
  Medien, Segmente, Notizen), keine Admin-Tabs sichtbar, auch nicht ausgegraut. Vorteil: keine
  Verhaltensänderung für bestehende Mitglieder-Workflows. Nachteil: falls künftig weitere
  Capabilities feiner differenzieren sollen (z. B. Lesezugriff auf „Speicherort"), fehlt dafür
  heute ein Tab-Konzept.
- **Option B — alle Tabs sichtbar, Admin-exklusive Felder/Aktionen pro Feld deaktiviert/versteckt**
  statt ganzer Tabs. Vorteil: konsistentere Navigation (Tab-Liste ändert sich nicht je Rolle).
  Nachteil: mehr Felder-genaue Gating-Logik statt Tab-genauer Logik, höheres Risiko für
  versehentlich sichtbare, aber nicht wirklich nutzbare Admin-Funktionen.
- **Option C — Hybrid**: Tabs, die für die Rolle komplett irrelevant sind (Dateien/Jellyfin,
  Changelog), bleiben ausgeblendet; Tabs mit gemischten Rechten (Informationen/Segmente/Media/
  Notizen) bleiben sichtbar, aber einzelne Felder/Buttons darin sind capability-gated — das
  entspricht im Kern dem heutigen Verhalten des Admin-Editors für Contributor-Zugriff.

**Empfehlung:** Option A (Fortsetzung des heutigen Workspace-Verhaltens), weil es das am
wenigsten riskante Verhalten für bestehende Mitglieder ist und der heutige Admin-Editor für
Contributor-Zugriff bereits strukturell ähnlich (reduzierte Tab-Liste) arbeitet — Option C wäre
im Ergebnis fast identisch, nur mit mehr Implementierungsaufwand pro Feld statt pro Tab.

### Frage 3: Was passiert mit reinen `/me`-Funktionen (projektbezogene Vor/Zurück-Navigation)?

Der Workspace navigiert zwischen Release-Versionen **innerhalb eines Anime+Gruppe-Projekts**
(`getMyProjectDetail`), der Admin-Editor navigiert zwischen **Episoden derselben Anime** über
alle Gruppen hinweg (`getGroupedEpisodes`). Das sind zwei unterschiedliche Fachmodelle, kein
zufällig doppelter Code.

- **Option A — nur die episodenübergreifende Navigation bleibt** (heutiges Admin-Verhalten).
  Vorteil: ein Navigationsmodell, weniger Code. Nachteil: Mitglieder verlieren die projektbezogene
  Eingrenzung („nur mein Projekt"), was für sie im Alltag weniger fokussiert sein könnte, wenn ein
  Anime viele Gruppen/Episoden hat.
- **Option B — nur die projektbezogene Navigation bleibt** (heutiges Workspace-Verhalten).
  Vorteil: fokussierter für den Alltag einzelner Mitarbeiter in einem Projekt. Nachteil: Admins
  verlieren die Möglichkeit, zügig durch alle Episoden einer Anime zu blättern (z. B. beim
  Massen-Review mehrerer Episoden).
- **Option C — beide Navigationsmodi bleiben erhalten, aber als bewusste Wahl** (z. B. Umschalter
  oder: Navigation ist kontextabhängig — wer über eine Projekt-URL (`return_to` auf ein Projekt)
  eingestiegen ist, bekommt Projekt-Navigation; wer über eine Episoden-Liste eingestiegen ist,
  bekommt Episoden-Navigation). Vorteil: kein Funktionsverlust für beide Nutzergruppen. Nachteil:
  höhere Komplexität, zwei Navigationspfade bleiben im Code bestehen (Ziel „eine Seite" wird nur
  teilweise erreicht).

**Empfehlung:** Option C, aber als Nebeneffekt des Einstiegskontexts statt als sichtbarer
Umschalter — die Navigation folgt automatisch dem `return_to`/Herkunfts-Kontext (Projekt vs.
Episoden-Übersicht). Das deckt sich mit Frage 5 unten (Vor/Zurück im Kontext bleiben) und
vermeidet echten Funktionsverlust, ohne dass Nutzer manuell umschalten müssen.

### Frage 4: Weiterleitung der alten Workspace-URL — dauerhaft oder temporär?

- **Option A — dauerhafter Redirect**: `/me/releases/[versionId]/workspace` bleibt für immer als
  Weiterleitung bestehen (z. B. Next.js `redirect()` in der Route). Vorteil: alte Lesezeichen/
  Links (auch außerhalb des Codes, z. B. in Chat-Verläufen) funktionieren unbegrenzt weiter.
  Nachteil: dauerhafte Alt-Code-Last, auch wenn minimal.
- **Option B — temporärer Redirect mit geplantem Entfernungstermin** (z. B. nach N Monaten oder
  nach Abschluss einer Folgephase entfernen, dokumentiert in FOLLOWUPS). Vorteil: klarer Aufräum-
  Pfad, kein dauerhafter Alt-Code. Nachteil: Risiko, dass der Termin verpasst wird und alte Links
  irgendwann brechen, ohne dass es jemand bemerkt (V1 ist admin-only, aber Mitglieder sind keine
  Admins im engeren Sinne — hier besonders relevant, weil reale Mitglieder-Lesezeichen betroffen
  wären).
- **Option C — kein Redirect, harter Cutover**: alte URL liefert 404, alle bekannten Links werden
  vorher umgestellt. Widerspricht aber direkt dem Auftrag („alte Workspace-URL leitet weiter")
  und wird daher nicht ernsthaft vorgeschlagen, nur zur Vollständigkeit genannt.

**Empfehlung:** Option A (dauerhafter Redirect). Der Umsetzungsaufwand für einen dauerhaften
Redirect ist marginal (eine Zeile Next.js-Routing), während ein verpasster Entfernungstermin bei
Option B echte, aber unsichtbare Breakage für Mitglieder verursachen kann, die ihre Workspace-URL
als Lesezeichen gespeichert haben.

### Frage 5: Bleibt die Vor/Zurück-Navigation kontextabhängig (Projekt vs. Gruppe/Episode)?

Eng verknüpft mit Frage 3 — hier geht es konkret darum, OB die Navigation den Einstiegskontext
überhaupt erkennen soll, unabhängig davon, welches Modell im Zweifelsfall gewinnt.

- **Option A — ja, kontextabhängig**: die Seite weiß (über `return_to` oder einen expliziten
  Query-Parameter), aus welchem Kontext sie geöffnet wurde, und zeigt die dazu passende
  Navigation (Projekt-Liste vs. Episoden-Liste). Vorteil: kein Funktionsverlust, Navigation bleibt
  für die jeweilige Aufgabe sinnvoll. Nachteil: Navigationslogik muss den Kontext explizit tracken
  statt sich nur aus `versionId` abzuleiten.
- **Option B — nein, immer ein festes Modell** (eines der beiden aus Frage 3 wird globale
  Standardnavigation, unabhängig vom Einstieg). Vorteil: einfachster Code. Nachteil: eine
  Nutzergruppe verliert ihr bisheriges Navigationsverhalten ohne Ausweichmöglichkeit.

**Empfehlung:** Option A — konsistent mit der Empfehlung zu Frage 3. Der Kontext ist über
`return_to` ohnehin schon heute auf beiden Seiten vorhanden (`getSafeReturnPath` /
`getProjectReturnPath`), die Navigation müsste also nur denselben, bereits vorhandenen Kontext
zusätzlich für die Nachbar-Berechnung nutzen statt nur für den Rücksprung-Button.

---

*Diese Datei ist ein Entwurf für die Diskussion mit dem Nutzer (`/gsd:discuss-phase`), noch keine
freigegebene Planungsgrundlage. Kein Code wurde für diese Inventur verändert.*
