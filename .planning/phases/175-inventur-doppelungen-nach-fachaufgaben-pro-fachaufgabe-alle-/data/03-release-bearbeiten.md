# Fachaufgabe 3: Release bearbeiten — vollständige Inventur beider Rahmen-Seiten

**Quelle:** 174-FOLLOWUPS.md F-13 ("Release-Bearbeitung zusammenführen", Nutzer-Priorität hoch), 174-REPORT.md Empfehlung #5.
**Methode:** Beide Rahmen-Seiten (Admin-Editor, `/me`-Workspace) vollständig gelesen (`EpisodeVersionEditorPage.tsx` 966 Z., `useEpisodeVersionEditor.ts` 416 Z., `workspace/page.tsx` 448 Z.), die zugehörigen Frontend-API-Funktionen (`episodes.ts`) und Backend-Handler (`admin_content_episode_version_editor.go`, `admin_content_episode_version_editor_helpers.go`, `admin_content_release_version_media_capabilities.go`, `episode_version_update.go`) gelesen, sowie die Rechte-Resolver-Logik (`permissions.go: CanForReleaseVersion`) nachvollzogen. Alle 5 verlinkenden Einstiegspunkte je Rahmen-Seite per `grep` aufgelöst.

Spalten gemäß D-03: (a) UI-Fläche, (b) Frontend-API-Funktion, (c) Backend-Endpunkt/Handler, (d) Rechte-Aktion Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten. D-04-Klassifikation je Fund.

## Übersicht

| Rahmen-Seite | Route | Zeilen | Seit |
|---|---|---|---|
| Admin-Editor | `/admin/episode-versions/[versionId]/edit` | `EpisodeVersionEditorPage.tsx` 966 + `useEpisodeVersionEditor.ts` 416 = 1382 | Welle 1 (Episoden-Grundfunktion) |
| `/me`-Workspace | `/me/releases/[versionId]/workspace` | `page.tsx` 448 + `workspaceHelpers.ts` | Phase 82 |

**D-04 Gesamturteil:** Die Rahmen-Logik (Laden/Formularzustand/Speichern/Tabs/Navigation/Kopfbereich) ist **Duplikat** — zwei komplett getrennt implementierte React-Komponentenbäume für denselben fachlichen Vorgang ("eine Release-Version bearbeiten"), die bereits dieselben Backend-Endpunkte und dieselben Inhalts-Bausteine (Media/Notizen/Segmente/Metadaten) aufrufen bzw. importieren. **Vorbild für die künftige EINE Seite: der Admin-Editor-Rahmen** (siehe Begründung unten), **Altlast: der `/me`-Workspace-Rahmen** (wird nach Zusammenführung entfernt, alte URL leitet weiter, D-06).

---

### (a) UI-Fläche — beide Rahmen-Seiten + alle Einstiegspunkte

**Admin-Editor-Rahmen:**
- Seite: `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx:1-5` (dünner Wrapper) → `EpisodeVersionEditorPage.tsx:95` (Hauptkomponente).
- Hook: `useEpisodeVersionEditor.ts:32` (`useEpisodeVersionEditor`).
- Einstiegspunkte (grep-verifiziert, 5 Stellen):
  1. `frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx:123` — Episodenübersicht, Klick auf Version-Zeile.
  2. `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:663` — Versionsliste je Episode, mit `?animeId=&episodeId=`-Query für Zurück-Navigation.
  3. `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx:289` — Episoden-Verwaltung im Anime-Edit.
  4. `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:287` — Review-Detailseite, Link zur zugehörigen Release-Version.
  5. `frontend/src/app/admin/users/tabs/UserMediaTab.tsx:116` — Nutzer-Detail, Medien-Tab, Link zur Quell-Version eines Medien-Eintrags.

**`/me`-Workspace-Rahmen:**
- Seite: `frontend/src/app/me/releases/[versionId]/workspace/page.tsx:51` (`MeReleaseWorkspacePage`), Export-Wrapper `:446-448`.
- Helfer: `workspaceHelpers.ts` (Tab-Parsing, Href-Bau, Fehlertext).
- Einstiegspunkte (grep-verifiziert, 5 Stellen):
  1. `frontend/src/components/contributions/ContributionCard.tsx:100` — Mitwirkungs-Karte (Dashboard/Übersicht).
  2. `frontend/src/app/me/dashboard/components/attentionHelpers.ts:38` — Dashboard-Attention-Hinweis, direkt mit `?tab=segments`.
  3. `frontend/src/app/me/dashboard/components/AttentionSection.tsx:172` — Dashboard-Attention-Sektion, mit `?tab=notes`.
  4. `frontend/src/components/contributions/AnimeGroupCard.tsx:280` — Anime-Gruppen-Karte in "Meine Projekte".
  5. `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:351` — Projekt-Detailseite, mit `?return_to=`-Rücksprung.

**Befund:** Beide Rahmen-Seiten haben je 5 unabhängige Einstiegspunkte aus unterschiedlichen Flächen (Dashboard, Episodenübersicht, Review, Nutzerverwaltung vs. Mitwirkungskarten, Projekt-Detail) — bestätigt D-02 #3's Rahmenbeschreibung ("erreichbar von Dashboard, Meine Projekte und Fansub-Edit", wobei Fansub-Edit indirekt über `EpisodeManager`/`VersionRow` in den Admin-Rahmen führt).

---

### (b) Frontend-API-Funktionen

| Funktion | Datei:Zeile | Genutzt von |
|---|---|---|
| `getEpisodeVersionEditorContext` | `frontend/src/lib/api/episodes.ts:100` | **Beide** Rahmen (`useEpisodeVersionEditor.ts:119`, `workspace/page.tsx:97`) |
| `updateEpisodeVersion` | `frontend/src/lib/api/episodes.ts:180` | **Beide** Rahmen (`useEpisodeVersionEditor.ts:318` via `handleSave`, `workspace/page.tsx:168` via `saveMetadata`) |
| `getReleaseVersionCapabilities` | `frontend/src/lib/api/releaseVersionCapabilities.ts` (Re-Export aus `@/lib/api`) | **Beide** Rahmen (`EpisodeVersionEditorPage.tsx:133`, `workspace/page.tsx:98`) |
| `getCurrentUser` | `frontend/src/lib/api/auth.ts:221` | **Nur Admin-Rahmen** (`EpisodeVersionEditorPage.tsx:132`) |
| `getOwnProfile` | `frontend/src/lib/api/members.ts:19` | **Nur `/me`-Workspace** (`workspace/page.tsx:99`) |
| `getMyProjectDetail` | `frontend/src/lib/api/projects.ts:48` | **Nur `/me`-Workspace** (`workspace/page.tsx:198`, für Vor/Zurück-Navigation) |
| `getFansubList` (Gruppensuche) | `frontend/src/lib/api/admin/...` | **Nur Admin-Rahmen** (`useEpisodeVersionEditor.ts:9,166`) |
| `scanEpisodeVersionFolder` | `frontend/src/lib/api/episodes.ts:124` | **Nur Admin-Rahmen** (`useEpisodeVersionEditor.ts:197`) |
| `deleteEpisodeVersion` | `frontend/src/lib/api/episodes.ts` | **Nur Admin-Rahmen** (`useEpisodeVersionEditor.ts:374`) |
| `getAnimeFansubProjectTimeline` | `frontend/src/lib/api/...` | **Beide** Rahmen (`EpisodeVersionEditorPage.tsx:162`, `workspace/page.tsx:133`) |

**Bestätigt:** Die zwei zentralen Lese-/Schreib-Aufrufe (`getEpisodeVersionEditorContext`, `updateEpisodeVersion`) sind **tatsächlich identisch von beiden Rahmen-Seiten genutzt** — keine eigenen Pfade. Der Admin-Rahmen hat zusätzlich Admin-exklusive Funktionen (Gruppensuche, Ordner-Scan, Löschen) über den `useEpisodeVersionEditor`-Hook; der `/me`-Rahmen hat zusätzlich `getOwnProfile`/`getMyProjectDetail`, die der Admin-Rahmen nicht braucht (er nutzt stattdessen das schlankere `getCurrentUser`, siehe (d)/(f)).

---

### (c) Backend-Endpunkte/Handler

- `GET /api/v1/admin/episode-versions/:versionId/editor-context` → `AdminContentHandler.GetEpisodeVersionEditorContext` — `backend/internal/handlers/admin_content_episode_version_editor.go:16`. Verzweigt intern (Zeile 27-51):
  - `actor.IsPlatformAdmin == true` → `h.loadEpisodeVersionEditorContext(...)` — `admin_content_episode_version_editor_helpers.go:24` (voller Kontext inkl. Ordnerpfad, Provider-IDs, Stream-URL, Datum-Nachbarn, Episoden-Klassifikation).
  - sonst (Contributor-Pfad, nur bei `canViewVersion`/`canViewMedia`/`canEditNotes` Allowed) → `h.loadEpisodeVersionContributorContext(...)` — `admin_content_episode_version_editor_helpers.go:61` (dieselbe `models.EpisodeVersion`-Struktur, aber Admin-Felder wie Ordnerpfad/Provider-IDs/Stream-URL bewusst leer, Zeilen 58-100).
  - **Bestätigt**: BEIDE Rahmen-Seiten rufen denselben Handler/dieselbe Route auf — der Admin-Editor erreicht praktisch immer den `IsPlatformAdmin`-Zweig (Admin-Nutzer), der `/me`-Workspace erreicht praktisch immer den Contributor-Zweig (Mitwirkende ohne Plattform-Admin-Rolle). Ein Platform-Admin, der den `/me`-Workspace aufruft, bekäme ebenfalls den vollen Admin-Kontext (kein separater Pfad, reine Rollenabfrage).
- `PATCH /api/v1/episode-versions/:versionId` → `FansubHandler.UpdateEpisodeVersion` — `backend/internal/handlers/episode_version_update.go:16`. **Ein einziger Handler für beide Rahmen**, keine Verzweigung nach Aufrufer-Rahmen (nur nach Rechten des Actors).
- `GET /api/v1/release-versions/:versionId/capabilities` → `AdminContentHandler.GetReleaseVersionCapabilities` — `backend/internal/handlers/admin_content_release_version_media_capabilities.go:25`. **Ebenfalls ein einziger Handler für beide Rahmen**, berechnet 10 Einzel-Capabilities (`CanViewMedia`...`CanEditMetadata`, Zeilen 41-91) über `permissionSvc.CanForReleaseVersion`.
- Contributor-exklusiv (nur `/me`-Workspace ruft dies auf): `GET /api/v1/me/projects/:animeId?fansub_group_id=` → `ContributionsMeHandler.GetMyProjectDetail` — `backend/internal/handlers/contributions_me_project_handler.go:13` (siehe 404-Befund unten).
- Admin-exklusiv (nur Admin-Rahmen ruft dies auf): `POST /api/v1/admin/episode-versions/:versionId/folder-scan` → `ScanEpisodeVersionFolder` — `admin_content_episode_version_editor.go:67` (eigener `requireAdmin`-Gate, Zeile 68).

**Zusammenfassung (c):** Genau 3 Backend-Endpunkte werden von BEIDEN Rahmen-Seiten identisch aufgerufen (editor-context, PATCH update, capabilities) — keine Abweichung, kein eigener Pfad für eine der beiden Seiten. Zusätzlich hat jede Seite 1-3 exklusive Endpunkte für rahmenspezifische Zusatzfunktionen (Admin: Ordner-Scan/Löschen/Gruppensuche; `/me`: eigenes Profil/Projekt-Navigation).

---

### (d) Rechte: Anzeige vs. Durchsetzung — inkl. Admin-ohne-Mitgliederprofil-Befund

**Capability-Resolution ist identisch:** `ReleaseVersionCapabilities` wird in BEIDEN Rahmen über denselben Endpunkt (`getReleaseVersionCapabilities`) geladen und in beiden Komponenten strukturell gleich ausgewertet (`canUseContributorMedia = releaseCapabilities?.can_view_media === true` in `EpisodeVersionEditorPage.tsx:195` vs. `canUseMedia = capabilities.can_view_media` in `workspace/page.tsx:270` — identische Capability-Felder, nur andere lokale Variablennamen). **Keine Abweichung in der Rechte-AUSWERTUNG selbst.**

**Backend-Durchsetzung (`CanForReleaseVersion`, `permissions.go:624`):** Platform-Admin wird in Schritt 0 unconditional `Allowed=true` zurückgegeben (Zeilen 635-643), unabhängig von Gruppenmitgliedschaft oder Mitgliederprofil — bestätigt für `GetReleaseVersionCapabilities` UND `GetEpisodeVersionEditorContext`.

**Konkreter 404-Befund (F-13 "Admin ohne Mitgliederprofil trifft mit 404 statt korrektem Zugriff"), Quelle präzise lokalisiert:**
- `GetOwnProfile` (`backend/internal/handlers/app_profile.go:75`, Repository `member_profile_own_repository.go:14`) liefert **keinen** 404 für einen Admin ohne Mitgliederprofil — `ensureProfileBaseTx` nutzt einen `LEFT JOIN` auf `members`, ein fehlendes Mitgliederprofil führt nur zu `HasMemberProfile=false`, nicht zu `ErrNotFound` (dieser Pfad wird nur ausgelöst, wenn die `app_users`-Zeile selbst fehlt — bei einem authentifizierten Admin nie der Fall). **Korrektur gegenüber der naheliegenden Annahme**: `getOwnProfile()` selbst ist NICHT die 404-Quelle.
- Die tatsächliche 404-Quelle ist `getMyProjectDetail` — `frontend/src/lib/api/projects.ts:48`, aufgerufen in `workspace/page.tsx:198` (Vor/Zurück-Navigations-Effekt). Backend: `ContributionsMeHandler.GetMyProjectDetail` — `contributions_me_project_handler.go:13` ruft `resolveVerifiedMemberID(ctx, identity.AppUserID)` auf (Zeile 31); schlägt dies mit `repository.ErrNotFound` fehl (kein **verifizierter** `member_claims`-Eintrag für den App-User), antwortet der Handler mit **`404 "kein verifizierter Member-Account verknüpft"`** (Zeilen 32-35).
- **Reale Auswirkung im `/me`-Workspace:** Dieser 404 wird in `workspace/page.tsx:222-224` abgefangen (`.catch(() => setNavigationState({ key, status: 'error', adjacent: null }))`) — er reißt die Seite NICHT komplett ab, sondern degradiert nur die Vor/Zurück-Release-Navigation zu `"Release-Navigation konnte nicht geladen werden."` (`workspace/page.tsx:408`). Für einen Plattform-Admin OHNE verifiziertes Mitgliederprofil, der versucht, über den `/me`-Workspace eine Release-Version zu bearbeiten (z. B. über einen künftigen direkten Link, da der Admin-Rahmen diese Route normalerweise nicht benutzt), tritt also ein echter Backend-404 auf einem Teil-Call auf — real, aber heute UI-seitig abgefedert statt als vollständiger Seitenfehler sichtbar. **Der Admin-Editor-Rahmen hat dieses Problem strukturell NICHT**, weil er statt `getOwnProfile`/`getMyProjectDetail` nur `getCurrentUser` (`app_auth.go:114`, liefert IMMER 200 für einen authentifizierten Nutzer, keine Mitgliederprofil-Abfrage) und eine eigene `useEpisodeNeighborNavigation`-Query nutzt (`EpisodeVersionEditorPage.tsx:28,181`, über Episode-Nachbarschaft statt Mitgliedsprojekt).
- **D-04-Einordnung dieses Befunds:** Dies ist der konkrete Beleg dafür, WARUM der Admin-Editor-Rahmen als Vorbild gewählt wird (siehe unten) — er braucht kein Mitgliederprofil, um korrekt zu funktionieren, der `/me`-Workspace-Rahmen schon (zumindest für die Navigationsfunktion).

**Zusammenfassung (d):** Rechte-AUSWERTUNG ist konsistent zwischen beiden Rahmen (gleicher Endpunkt, gleiche Felder). Der eigentliche Unterschied liegt in rahmenspezifischen ZUSATZ-Calls: der `/me`-Workspace lädt zusätzlich eigene, mitgliederprofil-abhängige Daten (`getOwnProfile`, `getMyProjectDetail`), die bei fehlendem verifiziertem Mitgliederprofil fehlschlagen (einer davon mit echtem 404), während der Admin-Rahmen ohne diese Abhängigkeit auskommt.

---

### (e) Datenhaltung

- **Release-Version-Kerndaten:** `release_versions`-Tabelle (über `episodeVersionRepo`, z. B. `GetByID`, `ListDateNeighbors` — `admin_content_episode_version_editor_helpers.go:36,65`) — **identisch für beide Rahmen**, da derselbe Handler/derselbe Endpunkt.
- **Anime-Quelle:** `h.repo.GetAnimeSyncSource(ctx, version.AnimeID)` — in beiden Kontext-Lade-Pfaden aufgerufen (`loadEpisodeVersionEditorContext` Zeile 28 via `resolveEpisodeVersionEditor`, `loadEpisodeVersionContributorContext` Zeile 70) — **identisch**.
- **Episoden-Klassifikation:** `GetEpisodeClassificationByReleaseVersion` — nur im Admin-Pfad direkt geladen (`loadEpisodeVersionEditorContext:41`); im Contributor-Pfad nicht separat abgefragt (reduzierter Kontext).
- **Fansub-Gruppen-Zuordnung:** `selected_groups` wird in beiden Rahmen aus demselben `EpisodeVersionEditorContext.SelectedGroups`-Feld gelesen.
- **Mitgliederprofil (`/me`-exklusiv):** `members`-Tabelle über `GetOwnProfile`/`ensureProfileBaseTx` — nur vom `/me`-Workspace gelesen, der Admin-Rahmen braucht diese Tabelle für seinen eigenen Kontext nicht.
- **Fazit (e):** Wie erwartet identische Datenhaltung für die Kerndaten der Release-Version (gleiche Tabellen, gleicher Lesepfad über denselben Handler); die rahmenspezifischen Zusatzdaten (Mitgliederprofil, Projekt-Navigation) sind eine Teilmenge, die nur der `/me`-Workspace zusätzlich benötigt.

---

### (f) Beobachtbares Verhalten — Abweichungen einzeln mit Datei:Zeile

| Aspekt | Admin-Editor-Rahmen | `/me`-Workspace-Rahmen |
|---|---|---|
| **Laden** | `useEpisodeVersionEditor.ts:86-150` (ein `useEffect`, lädt nur `getEpisodeVersionEditorContext`; `getCurrentUser`+`getReleaseVersionCapabilities` separat in `EpisodeVersionEditorPage.tsx:125-151`) | `workspace/page.tsx:82-122` (ein `useEffect`, lädt `getEpisodeVersionEditorContext`+`getReleaseVersionCapabilities`+`getOwnProfile` gebündelt per `Promise.all`) |
| **Formularzustand** | Eigener `FormState`-Typ in `episodeVersionEditorUtils.ts`, verwaltet im Hook (`useEpisodeVersionEditor.ts:41-52`), inkl. Baseline-Snapshot-Vergleich für `hasUnsavedChanges` (Zeilen 72,83-84) | Eigener, **separat gehaltener** `metadataForm`-State direkt in der Seitenkomponente (`workspace/page.tsx:71`), KEIN `hasUnsavedChanges`-Tracking, KEIN Baseline-Snapshot |
| **Speichern** | `handleSave` im Hook, behandelt Medien-Binding (Jellyfin-Datei-Auswahl), Fansub-Gruppen-Patch UND Metadaten in einem Aufruf (`useEpisodeVersionEditor.ts:257-353`) | `saveMetadata` direkt in der Seite, behandelt **nur** Metadaten (`workspace/page.tsx:146-187`) — kein Medien-Binding, keine Gruppenzuordnung (Mitwirkende dürfen das nicht ändern) |
| **Tabs** | 7 mögliche Tabs je nach Rolle (`uebersicht/dateien/informationen/segmente/media/changelog/notizen`), Admin sieht alle 7, Contributor sieht gefilterte Teilmenge über `allowedTabs` (`EpisodeVersionEditorPage.tsx:212-240`) — **eine** Tab-Leiste mit Verzweigung `shouldRenderAdminTabs`/`shouldRenderContributorTabs` (Zeilen 402-544) | 4 mögliche Tabs (`metadata/media/segments/notes`), dynamisch per `tabItems`-Array aufgebaut (`workspace/page.tsx:280-359`) — **separate, deutlich schlankere Tab-Logik**, die die Admin-Tabs (Übersicht/Dateien/Changelog) gar nicht kennt |
| **Vor/Zurück-Navigation** | `useEpisodeNeighborNavigation` — navigiert zwischen **Episode-Nachbarn** derselben Anime/Gruppe (`EpisodeVersionEditorPage.tsx:181-186`, `useEpisodeNeighborNavigation.ts`) | `getMyProjectDetail`-basierte Navigation — navigiert zwischen **Release-Versionen desselben Mitgliedsprojekts** (`workspace/page.tsx:189-229`), inkl. dem 404-Risiko aus (d) |
| **Kopfbereich** | Breadcrumb Anime→Episode→Version + Tab-Leiste + Ungespeichert-Badge + eigene `EpisodeNavigationControls`-Komponente (`EpisodeVersionEditorPage.tsx:296-371`) | `PageHeader`-UI-Primitive mit Breadcrumb "Meine Projekte"→Anime→Episode + `AdjacentNavigation`-UI-Primitive + Capability-Badges (`workspace/page.tsx:361-441`) — **nutzt globale UI-Primitives**, der Admin-Rahmen baut den Kopfbereich noch handgestrickt mit lokalem CSS (`EpisodeVersionEditor.module.css`) |
| **Löschen** | Vorhanden, nur für Platform-Admin (`EpisodeVersionEditorPage.tsx:947-956`, `handleDelete` im Hook) | **Nicht vorhanden** — Mitwirkende dürfen Versionen nicht löschen (fachlich korrekt, kein Duplikat-Defizit) |

**D-04 je Verhaltensaspekt:**
- Laden/Formularzustand/Speichern/Navigation/Kopfbereich: **Duplikat** — dieselbe fachliche Aufgabe ("Release-Version-Daten laden, Formular pflegen, speichern, zwischen benachbarten Einträgen wechseln, Kontext anzeigen"), komplett getrennt implementiert mit unterschiedlicher Code-Qualität (der `/me`-Rahmen nutzt bereits globale UI-Primitives wie `PageHeader`/`AdjacentNavigation`/`Tabs`, der Admin-Rahmen nicht — CLAUDE.md-Design-System-Pflicht).
- Tabs: **Variante** — der Admin-Rahmen braucht legitim mehr Tabs (Dateien/Übersicht/Changelog sind Admin-only-Stubs), der Mitwirkenden-Rahmen braucht nur die 4 fachlich relevanten.
- Löschen: **legitim getrennt** — reine Rechtefrage, kein Duplikat.

---

## Vorbild/Altlast-Entscheidung für D-06 (EINE rechtebasierte Seite)

**Vorbild: Admin-Editor-Rahmen**, aus folgenden Gründen, alle konkret belegt:
1. Braucht **kein** Mitgliederprofil, um zu funktionieren (nutzt `getCurrentUser` statt `getOwnProfile`/`getMyProjectDetail`) — löst damit das 404-Symptom aus (d) strukturell, statt es nur UI-seitig abzufangen.
2. Hat bereits die vollständige Tab-Matrix (7 Tabs) und die `allowedTabs`-Rechte-Filterung (`EpisodeVersionEditorPage.tsx:212-240`) — diese Logik deckt die 4 Tabs des `/me`-Workspace als Teilmenge bereits ab, der umgekehrte Weg (Workspace-Tabs um Admin-Tabs erweitern) wäre aufwändiger.
3. Hat Löschen/Ordner-Scan/Gruppenverwaltung bereits integriert — Funktionen, die in EINER zusammengeführten Seite ebenfalls nur für Admins sichtbar sein müssen.

**Altlast: `/me`-Workspace-Rahmen**, zu übernehmende Teile vor dem Entfernen:
1. Die **UI-Primitive-Nutzung** (`PageHeader`, `AdjacentNavigation`, `Tabs`, `Card`, `ErrorState`, `LoadingState`) — der Admin-Rahmen sollte bei der Zusammenführung auf diese globalen Primitives migriert werden (CLAUDE.md-Pflicht, aktuell im Admin-Rahmen verletzt durch handgestrickte `<button className={styles.tab}>`-Tableisten statt der `Tabs`-Primitive).
2. Der `?return_to=`-Sicherheits-Mechanismus für Rücksprung-URLs (`getSafeReturnPath`, `EpisodeVersionEditorPage.tsx:71-93` — existiert eigentlich schon im Admin-Rahmen, aber mit anderer Whitelist als `workspaceHelpers.ts`'s `getProjectReturnPath`; beide Whitelists sollten zusammengeführt werden).
3. Nach Übernahme: alte `/me/releases/[versionId]/workspace`-URL leitet (D-06) auf die eine Seite um, ALLE 5 Einstiegspunkte aus (a) werden auf die neue URL umgestellt.

## Zusammenfassung (reproduzierbar per `scripts/count-03-release-bearbeiten.sh`)

- **Rahmen-Seiten: 2** (Admin-Editor, `/me`-Workspace)
- **Gemeinsam genutzte Backend-Endpunkte: 3** (editor-context, PATCH update, capabilities)
- **Gemeinsam genutzte Inhalts-Bausteine: 4** (`ReleaseVersionMediaSection`, `ReleaseVersionNotesTab`, `SegmenteTab`, `ReleaseVersionMetadataFields` — vom `/me`-Workspace direkt aus dem Admin-Verzeichnis importiert, keine Kopien)
- **Duplizierte Rahmen-Aspekte: 6** (Laden, Formularzustand, Speichern, Tabs-Infrastruktur, Navigation, Kopfbereich)
- **Einstiegspunkte je Rahmen: 5 + 5 = 10**
