# Fachaufgabe 6: Notizen schreiben

**Quelle:** 174-FOLLOWUPS.md F-17 → 175-CONTEXT.md D-02 #6, aufbauend auf dem in 174-REPORT.md
(Abschlussaudit, Zeile 232/362) bereits als "Trennung wäre nicht künstlich" bewerteten Cluster
`frontend/src/lib/api/history.ts` (F-09). Prüft F-09s Einschätzung aus Fachaufgaben-Sicht (nicht
nur Code-Zeilen-Sicht) nach und erfasst alle Notiz-Typen vollständig nach D-03 (a)-(f).
**Methode:** `history.ts` vollständig gelesen (1.020 Zeilen, 23 Funktions- + 7 Typ-Exporte,
stimmt mit 174-REPORT.md "30 Exporte" überein). Jede der 23 Funktionen einem Backend-Handler und
einer Datenbank-Tabelle zugeordnet, jeder Handler auf seine tatsächlich genutzte
Rechte-Prüfung gelesen (nicht aus `174-HOTSPOTS.md` übernommen). Frontend-Gating (Tab-Sichtbarkeit
vs. Button-Sichtbarkeit) für jeden Notiz-Typ separat nachvollzogen.

Spalten gemäß D-03: (a) UI-Fläche, (b)/(c) Frontend-API/Backend-Handler, (d) Rechte-Aktion
Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten.

---

## Übersicht: 5 fachliche Cluster in `history.ts` (174-REPORT zählte 4 — Korrektur siehe unten)

| Cluster | Funktionen in `history.ts` | UI-Fläche | Live genutzt? |
|---|---|---|---|
| 1. Fansub-/Gruppen-Notizen | `listFansubGroupNotes`, `createFansubGroupNote`, `updateFansubGroupNote`, `deleteFansubGroupNote` (:249-393) | `NotesTab.tsx` | Ja |
| 2. Gruppen-Meilensteine/Historie | `listGroupHistory`, `createGroupHistory`, `updateGroupHistory`, `deleteGroupHistory` (:886-968) | `GroupHistorySection.tsx` | Ja |
| 3. Member-Group-Story ("Geschichte je Mitglied") | `getMemberGroupStoryContext`, `createMemberGroupStory`, `updateMemberGroupStory`, `deleteMemberGroupStory`, `mapMemberGroupStory` (:181-550) | **Keine** — siehe Befund 1 | **Nein** |
| 4. Release-Version-Notizen | `listReleaseVersionNotes`, `bulkUpsertReleaseVersionNotes`, `deleteReleaseVersionNote` (:747-852) + `getGroupReleaseNotes` (:40, öffentlicher Read) | `ReleaseVersionNotesTab.tsx` (Admin) + öffentliche Release-Seite | Ja |
| 5. Anime-Fansub-Projekt-Notizen | `getAnimeFansubProjectNote`, `upsertAnimeFansubProjectNote`, `deleteAnimeFansubProjectNote` (:554-659) + `getGroupProjectNote` (:62, öffentlicher Read) | `AnimeProjectNotesSection.tsx` (Admin) + öffentliche Projekt-Seite | Ja |

**Nicht Teil von "Notizen schreiben" (Fehlplatzierung, kein Notiz-Inhalt):** `searchArchive`
(:997, öffentliche Member-Suche über `/archiv`) sitzt ebenfalls in `history.ts`, hat aber
**keinen fachlichen Bezug zu Notizen/Stories** — es ist reine Mitglieder-Suche. Das bestätigt
F-09 nicht nur, sondern **verschärft** den Befund: ein Teil von `history.ts`s Zeilenlast stammt
aus einer Funktion, die nicht einmal in dieselbe Fachaufgabe fällt wie der Rest der Datei (siehe
Abschnitt "F-09-Einordnung" unten).

`174-REPORT.md` (Zeile 232) nennt nur 4 Cluster ("Fansub-Notizen/Historie" als EIN Posten,
15 Funktionen). Diese Inventur trennt Cluster 1 (Notizen) und Cluster 3 (Story) fachlich, weil
sie — wie Befund 2 zeigt — **unterschiedliche Rechte-Modelle** verwenden, obwohl beide in
`174-REPORT.md` als ein Posten geführt wurden.

---

## (a)-(c) Je Notiz-Typ: UI → Frontend-API → Backend-Handler → Tabelle

| Notiz-Typ | UI (a) | Backend-Handler (c) | Tabelle (e) |
|---|---|---|---|
| Fansub-/Gruppen-Notizen | `NotesTab.tsx:65-227` | `AdminContentHandler.{List,Create,Update,Delete}FansubGroupNote` (`admin_content_fansub_group_notes.go:62-229`) | `fansub_group_notes` (Migration `0061`, tiptap `0067`) |
| Gruppen-Meilensteine | `GroupHistorySection.tsx` | `FansubGroupHistoryHandler.{List,Create,Update,Delete}GroupHistory` (`fansub_group_history_handler.go:251+`) | `fansub_group_history` (Migration `0084`) |
| Member-Group-Story | **keine** (siehe Befund 1) | `AdminContentHandler.{Get...Context,List,Create,Update,Delete}MemberGroupStory` (`admin_content_member_stories.go:34-228`) | `member_group_stories` (Migration `0062`, tiptap `0068`) |
| Release-Version-Notizen | `ReleaseVersionNotesTab.tsx` (Admin) / öffentliche Release-Seite (`getGroupReleaseNotes`) | `AdminContentHandler.{List,BulkUpsert,Delete}ReleaseVersionNote` (`admin_content_release_version_notes.go`) / `GroupPublicHandler.GetGroupReleaseNotes` | `release_version_notes` (Migration `0064`, tiptap `0070`) |
| Anime-Fansub-Projekt-Notizen | `AnimeProjectNotesSection.tsx` (Admin) / öffentliche Projekt-Seite (`getGroupProjectNote`) | `AdminContentHandler.{Get,Upsert,Delete}AnimeFansubProjectNote` (`admin_content_anime_project_notes.go`) / `GroupPublicHandler.GetGroupProjectNote` | `anime_fansub_project_notes` (Migration `0063`, Context-Guard `0066`, tiptap `0069`) |

---

## Befund 1 — Member-Group-Story: vollständig implementiert, aber KEIN UI-Konsument (Dead Feature)

Backend (Tabelle, Repository, Handler, 5 Routen unter `/admin/fansubs/:id/member-stories*`) ist
vollständig vorhanden. Grep über `frontend/src/**/*.tsx` (ohne Tests) nach `createMemberGroupStory`,
`updateMemberGroupStory`, `deleteMemberGroupStory`, `getMemberGroupStoryContext` und
`listMemberGroupStories` liefert **null Treffer** — keine Komponente ruft diese Funktionen auf.
Die scheinbar ähnlich benannten UI-Komponenten `FansubStorySection.tsx`/`FansubStoryBlock.tsx`
lesen einen anderen Typ (`PublicFansubStory`, vermutlich ein einzelnes Freitextfeld auf
`fansub_groups`), nicht `MemberGroupStory`. **D-04: Keine Duplikat-Klassifikation anwendbar —
dies ist ein orphaned Feature** (Backend ohne Frontend-Konsument), kein Parallel-Build. Relevant
für die Zusammenführungsphase: entweder eine `MemberStoriesSection.tsx` nachbauen oder das
Feature (Tabelle + 5 Endpunkte + 5 Frontend-Funktionen) als totes Gewicht entfernen (D-06-Prinzip
— "keine Nebeneinander-Implementierungen", hier sogar eine komplett ungenutzte).

---

## (d) Rechte: Anzeige vs. Durchsetzung — fünf verschiedene Rechte-Modelle für fünf Cluster

### Cluster 1 — Fansub-/Gruppen-Notizen: `ActionFansubGroupNotesWrite` (gruppen-skopiert)

- **Durchsetzung:** alle vier Handler nutzen `requireFansubGroupNoteWriteAccess` →
  `CanForFansubGroup(..., permissions.ActionFansubGroupNotesWrite, fansubID)`
  (`admin_content_fansub_group_notes.go:19-43`).
- **Anzeige (Tab-Ebene):** `fansubEditAccess.ts:46` — Tab "notes" sichtbar bei
  `can_edit_notes || can_edit_founding_history` (ODER-Verknüpfung zweier verschiedener Actions!).
- **Anzeige (Button-Ebene, innerhalb `NotesTab.tsx`):** **keine** — `NotesTab.tsx:66-94` gated
  nur auf `hasActiveSession` (ein beliebiger eingeloggter Token), keine Capability-Prüfung für
  die Buttons "Neue Gruppennotiz hinzufügen"/"Bearbeiten"/"Löschen".

### NEUER Befund 2 — Anzeige-Lücke: Tab-Gate erlaubt mehr als die Buttons tatsächlich dürfen

Ein Nutzer mit **nur** `can_edit_founding_history=true` (aber `can_edit_notes=false`) sieht den
"Notizen"-Tab (ODER-Gate in `fansubEditAccess.ts:46`) und darin **voll funktionsfähige**
Gruppennotiz-Buttons (`NotesTab.tsx` prüft nichts weiter) — klickt er auf Speichern, lehnt der
Server mit 403 ab, weil `ActionFansubGroupNotesWrite` fehlt. Die Schwester-Komponente
`GroupHistorySection` bekommt dagegen explizit ein `foundingOnly`-Flag
(`FansubEditSecondaryTabs.tsx:133`: `!isPlatformAdmin && !capabilities?.can_edit_group &&
Boolean(capabilities?.can_edit_founding_history)`), das genau diesen Fall abfängt und die
Meilenstein-Sektion auf Founding-Events beschränkt — **aber `NotesTab` bekommt dieses Flag
nicht** (`FansubEditSecondaryTabs.tsx:130`: `<NotesTab fansubId={fansubID} />`, keine weiteren
Props). **D-05-Befund, neues Muster analog BUG-174-02/04:** Anzeige (Tab-Gate) ist eine
ODER-Verknüpfung aus zwei Actions, Durchsetzung prüft nur eine davon — aber anders als bei den
bereits gefixten Fällen fehlt hier sogar die zweitstufige UI-Einschränkung, die für die
Schwester-Komponente bereits existiert. Schweregrad: mittel (betrifft nur die Rand-Rolle
"Founding-History-Editor ohne Notizen-Recht", aber diese Rand-Rolle ist durch die
Capability-Matrix explizit vorgesehen, sonst gäbe es kein eigenes `can_edit_founding_history`-Feld).

### Cluster 2 — Gruppen-Meilensteine: Action abhängig vom `event_type` (dynamisch)

`requiredGroupHistoryAction` (`fansub_group_history_handler.go:477-483`) wählt
**`ActionFansubGroupMembersManage`** für mitgliederbezogene Event-Typen oder
**`ActionFansubGroupPageFoundingHistoryEdit`** für Founding-Events — zwei unterschiedliche
Actions je nach Dateninhalt derselben Tabelle. Die oben beschriebene `foundingOnly`-Einschränkung
im Frontend (`FansubEditSecondaryTabs.tsx:133`) bildet genau diese zweite Action korrekt ab.
**D-04: legitim getrennt** (zwei fachlich verschiedene Event-Kategorien in einer Tabelle), korrekt
im UI nachgebildet — im Gegensatz zu Cluster 1 (Befund 2).

### Cluster 3 — Member-Group-Story: `requireAdmin` (Platform-Admin, NICHT gruppen-skopiert)

Alle fünf Handler-Funktionen (`admin_content_member_stories.go:35,61,84,140,201`) nutzen
`h.requireAdmin(c)` → `requirePlatformAdminIdentity` (`admin_content_authz.go:10-12`) — eine
**komplett andere Rechte-Klasse** als die sonst für Fansub-Edit-Inhalte verwendete
`CanForFansubGroup`-Familie. Ein Fansub-Lead, der Fansub-Gruppen-Notizen schreiben darf
(`ActionFansubGroupNotesWrite`), dürfte eine Member-Story **nicht** schreiben, selbst wenn das
Feature eine UI hätte. Es gibt **kein** `can_write_member_stories`-Feld in
`app_auth_capabilities.go` — die Anzeige-Seite wurde nie an dieses Rechte-Modell angepasst,
vermutlich weil nie eine UI gebaut wurde (Befund 1). **D-05-Befund:** strukturell inkonsistentes
Rechte-Modell innerhalb derselben Fachaufgabe — aktuell folgenlos, da unerreichbar (Befund 1),
aber ein Stolperstein für die künftige Zusammenführungsphase, falls jemand naiv eine UI ergänzt
und dabei das gruppen-skopierte Muster der Nachbar-Cluster erwartet.

### Cluster 4 — Release-Version-Notizen: eigenes, feinkörnigstes Modell (Rolle × Mitglied)

`requireReleaseVersionNoteAccess` (`admin_content_release_version_notes.go:61-116`) prüft
`ActionReleaseVersionNotesWrite` UND `ActionReleaseVersionNotesViewAll`, filtert bei fehlendem
"ViewAll" auf die eigene `memberID` und prüft pro Rolle zusätzlich `canEditReleaseVersionMemberRole`
(Zeile 118+). Das Frontend bildet das exakt nach: `ReleaseVersionNotesTab.tsx` berechnet `canEdit`
pro Rollen-Notiz-Feld aus einem vom Server gelieferten `MemberRoleForVersion.canEdit`-Flag
(`ReleaseVersionNotesTab.tsx:146-147,579`), **keine** grobe Tab-Capability wie bei Cluster 1.
**Konsistent — bestes Anzeige/Durchsetzungs-Match der fünf Cluster.** Dieselbe Action
(`ActionReleaseVersionNotesWrite`) treibt zusätzlich `can_edit_release_notes`
(`app_auth_capabilities.go:151`) — identisch mit dem bereits in Fachaufgabe 4 geprüften
`can_edit_release`-Feld der Review-Detailseite (`release_review_handler.go:126-137`). **Konsistent
über zwei Fachaufgaben hinweg.**

### Cluster 5 — Anime-Fansub-Projekt-Notizen: Lesen und Schreiben bewusst unterschiedliche Actions

- **Schreiben:** `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote` nutzen dieselbe
  `requireFansubGroupNoteWriteAccess` wie Cluster 1 (`ActionFansubGroupNotesWrite`,
  `admin_content_anime_project_notes.go:103`). **Konsistent mit Cluster 1 — dieselbe Action für
  zwei verschiedene Notiz-Tabellen, fachlich plausibel (beide sind "offizielle Gruppentexte").**
- **Lesen (Admin):** `GetAnimeFansubProjectNote` nutzt `requireAnimeProjectNoteReadAccess` →
  `ActionReleaseView` (`admin_content_anime_project_notes.go:53`) — eine andere, breitere Action.
  **D-04: legitime Variante** (Lesen darf mehr Rollen als Schreiben), aber bedeutet: ein Nutzer mit
  reinem Release-Anschauen-Recht sieht die Admin-Projektnotiz-GET-Antwort, ohne
  Notizen-Schreibrecht zu haben — im UI (`AnimeProjectNotesSection.tsx`) nur über `hasAccessToken`
  gated (Zeile 92,211,286), keine feinere Anzeige-Differenzierung zwischen Lese- und Schreibrecht
  — dieselbe grobe Anzeige-Lücke wie Cluster 1 (Befund 2), hier aber ohne bekannte
  Capability-Alternative, die es zu nutzen gäbe.

---

## F-09-Einordnung: bestätigt UND verfeinert

**Bestätigt:** Release-Version-Notizen und öffentliche Projekt-Notizen haben eigene Nutzer,
eigene Tabellen und (Cluster 4) ein eigenständiges, korrekt verdrahtetes Rechte-Modell — eine
Trennung in separate Dateien wäre für diese beiden Cluster tatsächlich nicht künstlich, weil sie
fachlich bereits vollständig unabhängig sind (bestätigt F-09 aus Fachaufgaben-Sicht, nicht nur
aus Code-Zeilen-Sicht).

**Verfeinert:** 174-REPORT.md bündelte "Fansub-Notizen/Historie" als EINEN Posten (15 Funktionen).
Aus Fachaufgaben-Sicht sind das **drei** Teile mit **drei verschiedenen Rechte-Modellen**
(Cluster 1: `ActionFansubGroupNotesWrite`; Cluster 2: dynamisch je Event-Typ; Cluster 3:
`requireAdmin`) — eine künftige Datei-Aufteilung sollte diese Fachaufgaben-Grenze abbilden, NICHT
die reine Zeilenzahl. Zusätzlich gehört `searchArchive` fachlich gar nicht in diese Datei (siehe
oben) — eine Verschiebung nach `search.ts` (existiert bereits seit 174-02) wäre KEINE künstliche
Trennung, sondern eine Korrektur einer Fehlplatzierung, die mit den vier/fünf Notiz-Clustern
nichts zu tun hat.

---

## (f) Beobachtbares Verhalten — Unterschiede zwischen den Notiz-Typen

| Aspekt | Fansub-/Gruppen-Notizen | Release-Version-Notizen | Projekt-Notizen | Member-Story |
|---|---|---|---|---|
| **Review-Lifecycle** | Keiner (direkter Write) | Ja — `review_state` (`pending`/`confirmed`/`rejected`/`tombstoned`, Migration 0135, siehe Fachaufgabe 4) | Keiner | Keiner (unerreichbar) |
| **Öffentliche Sichtbarkeit** | `visibility: public/internal`-Flag, aber kein eigener öffentlicher Lese-Endpunkt in `history.ts` gefunden | Ja — `getGroupReleaseNotes` (öffentlich, paginiert) | Ja — `getGroupProjectNote` (öffentlich) | Keine |
| **Pro-Rolle-Zuordnung** | Nein | Ja — `role_code` pro Notiz, mehrere Notizen pro Release-Version | Nein (1 Notiz pro Anime+Gruppe) | Ja — `role_id` optional pro Story |
| **Mehrfachinstanzen** | Ja (Liste) | Ja (Liste, bulk-upsert) | Nein (Upsert, max. 1) | Ja (Liste) |

---

## Zusammenfassung (reproduzierbar per `scripts/count-06-notizen-schreiben.sh`)

- **Notiz-Cluster in `history.ts`: 5** (174-REPORT zählte 4 — Cluster 1 und 3 wurden dort zu
  Unrecht als ein Posten gebündelt, siehe F-09-Einordnung)
- **Rechte-Modelle: 5 verschiedene** über die 5 Cluster (gruppen-skopiert, dynamisch-je-Typ,
  platform-admin-only, rolle×mitglied-skopiert, lesen≠schreiben-Actions)
- **Dead Feature: 1** (Member-Group-Story — vollständiges Backend, 0 Frontend-Konsumenten)
- **Fehlplatzierte Funktion: 1** (`searchArchive`, keine Notiz, gehört fachlich zu `search.ts`)
- **Neue D-05-Befunde: 1** (Anzeige-Lücke Cluster 1: Tab-ODER-Gate vs. Single-Action-Durchsetzung,
  ohne das bei der Schwester-Komponente vorhandene `foundingOnly`-Pendant)
