# 175-ROADMAP-PROPOSAL.md — Zugeschnittene Folgephasen (D-07-Artefakt 3 von 3)

**Zweck:** Synthetisiert aus `175-INVENTORY.md` (12 Fachaufgaben, Duplikat-Klassifikationen) und
`175-PERMISSION-MATRIX.md` (44 geprüfte Rechte-Vergleichspunkte, 6 Abweichungen + 2 informative
Befunde) konkrete, zugeschnittene Folgephasen-Vorschläge. Bindend berücksichtigt:
`175-USER-DECISIONS.md` (Member-Group-Story-Entfernung, OUTRO-Kürzel-Fix, F-05-Ursachenklärung,
Reihenfolge-Wunsch Bug-Phase-zuerst) sowie `174-REPORT.md`s bereits vorhandene
F-13/F-15/F-16/F-18-Empfehlungen, die hier nicht ersetzt, sondern mit den Welle-1-Funden
konkretisiert werden.

**Einordnung:** Diese fünf Phasenvorschläge (1-5) sind NEU durch 175-09 zugeschnitten. Die
"Bugfix-Sammelphase" (Zeile 0) ist dagegen bereits in `174-FOLLOWUPS.md`/`175-CONTEXT.md`s
Deferred-Abschnitt angekündigt (nicht neu durch 175-09 erfunden) und wird hier nur referenziert,
weil D-09/der Nutzer-Reihenfolgewunsch verlangt, dass sie direkt nach Phase 175 läuft — vor den
Zusammenführungsphasen.

---

## Übersichtstabelle

| Phase-Vorschlag | Ziel | Fachaufgaben | Abhängigkeit | Risiko | Aufwandsklasse | zu entfernende Altlast |
|---|---|---|---|---|---|---|
| 0. Bugfix-Sammelphase (bereits angekündigt, referenziert, nicht neu vorgeschlagen) | 174-FOLLOWUPS-Bugs + D-05-Rechte-Befunde + Nutzer-Entscheidungen bereinigt, Produktcode wieder konsistent zum eigenen Anspruch | 174-FOLLOWUPS F-02..F-06,F-14,F-19,F-21-24; Permission-Matrix-Zeilen 5.3/6.1/6.2/6.4/8.4; Nutzer-Entscheidung 1 | Keine — läuft laut Nutzerwunsch direkt nach 175, vor allen Zusammenführungsphasen | gering bis mittel (einzelne Spalten/Routen/Konstanten, kein Strukturumbau) | mittel | `segmenteTabUtils.ts`; `member_group_stories`-Tabelle + 5 Admin-Endpunkte + `admin_content_member_stories.go` + ungenutzte `history.ts`/`fansubs-members.ts`-Funktionen; Legacy-Endpunkt `DELETE /fansubs/:id/members/:memberId` (`fansub_group_members.go`) |
| 1. Release-Bearbeitung zusammenführen | Eine rechtebasierte Release-Version-Bearbeitungsseite statt zwei getrennt gebauter Rahmen | Fachaufgabe 3 (F-13) | Keine harte Abhängigkeit zu anderen Vorschlägen; sollte nach der Bugfix-Sammelphase laufen, da 10 Einstiegspunkte angepasst werden und Dashboard-/Attention-Verlinkungen (Fachaufgabe 12) mit berührt werden | hoch (zentraler, stark genutzter Admin- und Member-Workflow; 10 Einstiegspunkte, URL-Weiterleitung nötig) | groß | `/me/releases/[versionId]/workspace/page.tsx` + `workspaceHelpers.ts` (gesamter `/me`-Workspace-Rahmen) |
| 2. Einheitliches Medien-Upload-System | Ein wiederverwendbarer Upload-Baustein (Collect-statt-Replace, Pro-Datei-Titel, Retry) statt getrennt gebauter Upload-Wege; Rechte-Abweichungen 1.2/1.4/1.6 werden durch die Vereinheitlichung behoben | Fachaufgabe 1 (F-15), Fachaufgabe 8 #5/#6 (Soft-Delete-Duplikat-Rest) | Keine harte Abhängigkeit; kann parallel zu Phase 1 laufen, da unterschiedliche Datei-Cluster betroffen sind | hoch (Review-Workflows mehrerer Fachbereiche, Rechte-Vereinheitlichung berührt Produktionsdaten-Zugriff) | groß | `GroupMediaReviewUploadPanel.tsx`s eigene Replace-statt-Merge-Logik; `fansub_media_upload.go`s zusätzliche Custom-Permission-Fallback-Prüfung (Zeile 54-72); dupliziertes Persistenz-Codeblock in `admin_content_release_theme_assets.go:266-329`; `fansub_media_delete.go`s unabhängig implementiertes Soft-Delete-SQL-Skelett (`media_repository.go:1041-1062`) |
| 3. Einheitlicher Bild-Viewer | Ein gemeinsamer Viewer-Baustein (`FansubMediaLightbox.tsx` als Basis, erweitert um Zoom/Swipe/Progressive-Load/Metadaten-Overlay/Prefetch) statt sechs eigenständiger Implementierungen | Fachaufgabe 2 (F-18) | Keine harte Abhängigkeit zu Phase 1/2/4/5; sollte den gelesenen Sketch `.planning/sketches/010-galerie-detailansicht` als Design-Grundlage nutzen (D-08: nur lesen, nicht Teil dieser Phase selbst) | mittel (öffentlich sichtbar, aber rein lesende Darstellung ohne Datenmutation) | groß | `ScreenshotGallery.tsx`s eigene Lightbox; `ProjectMemberMediaViewer.tsx` (nach Übernahme von Prefetch/Metadaten-Sidebar in die Basis); `GroupAssetsExperience.tsx`s Bild-Lightbox-Anteil (Video-Pfad via `VideoPlayerModal` bleibt unberührt); `ReleaseVersionMediaDetailPanel.tsx` (sofort löschbar, 0 Importeure) |
| 4. Suchen & Filtern vereinheitlichen | Ein gemeinsamer, umlaut-toleranter Filter-Helfer (wiederverwendet die Normalisierung der globalen Suchbibliothek) statt sechs unabhängiger `toLowerCase().includes()`-Implementierungen | Fachaufgabe 7 (F-16) | Keine harte Abhängigkeit; rein lesende Filterlogik, kann unabhängig von Phase 1-3 laufen | niedrig bis mittel (interne Admin-Filterung, keine Datenmutation, aber Scoring-Logik aus Weg 3 muss bewahrt werden) | mittel | Filterlogik in `AdminGroupsClient.tsx`, `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx` (Scoring bleibt erhalten, wandert in den Helfer), `GroupMediaReviewFilterBar.tsx`, die vier strukturell identischen Filterblöcke in `useAnimePatchImpl.ts`/`useAdminAnimeCreateControllerImpl.ts` |
| 5. Status-/Label-Konsolidierung | Eine kanonische Implementierung je byte-identischer Label-Gruppe statt redundanter Parallel-Implementierungen; zwei tote Code-Pfade entfernt | Fachaufgabe 11 Gruppe 4 + Gruppe 5 | Keine Abhängigkeit; niedrigstes Risiko, kann jederzeit eingeschoben werden | niedrig (reine Darstellungslogik ohne Rechte-Beteiligung, Fachaufgabe 11 bestätigt `(d) Rechte: n/a`) | klein | 3 von 4 App-User-Status-Label-Implementierungen (`AdminUsersClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx` — eine bleibt kanonisch); toter `reviewLabel` in `ReleaseVersionMediaGallery.tsx` (0 Importeure) |

---

## Phase 0 (referenziert): Bugfix-Sammelphase

**Ziel:** Die in Phase 174 gefundenen, noch offenen Bugs (`174-FOLLOWUPS.md` F-02..F-06, F-14,
F-19, F-21-24) sowie die in dieser Phase 175 neu gefundenen Rechte-Abweichungen und die
verbindlichen Nutzer-Entscheidungen werden behoben, bevor die größeren Zusammenführungsphasen
beginnen — Reihenfolge-Wunsch des Nutzers (`175-USER-DECISIONS.md` Punkt 4).

**Umfang (durch 175 ergänzt):**
- Nutzer-Entscheidung 1: `member_group_stories` (Migration 0062/0068, 0 Datensätze) + 5
  Admin-Endpunkte `/admin/fansubs/:id/member-stories*` + `admin_content_member_stories.go` +
  ungenutzte `history.ts`/`fansubs-members.ts`-Funktionen werden vollständig entfernt
  (Fachaufgabe 6, Cluster 3 — bestätigt 0 Frontend-Konsumenten).
- Nutzer-Entscheidung 2 (F-02): Kürzel `OUT` für den Theme-Typ "Outro" wird fest in der DB
  hinterlegt statt namens-geraten; `segmenteTabUtils.ts` (toter Code, nur Test-Import, Fachaufgabe
  11 Gruppe 1) wird entfernt.
- Nutzer-Entscheidung 3 (F-05): Ursache der 9 doppelten `anime_contributions`-Zeilen für Mitglied
  `timer` wird gefunden und behoben; Bestandsdaten nur mit Nutzerfreigabe bereinigt.
- Permission-Matrix-Zeile 5.3: `AcceptClaimInvitation` (`member_claim_invitations_handler.go:144`)
  erhält denselben `disabled`-Status-Check wie `AcceptFansubInvitation` (Zeile 5.2) — Sicherheitsbefund
  aus 175, vom Nutzer namentlich als Bug-Phase-Fall benannt (Reihenfolge-Wunsch Punkt 4).
- Permission-Matrix-Zeilen 6.1/6.2: Das Notizen-Tab-Gate (`fansubEditAccess.ts:46`) und die
  Button-Ebene (`NotesTab.tsx:66-94`) erhalten entweder ein `foundingOnly`-Pendant (analog
  `GroupHistorySection`) oder die Durchsetzung wird um `ActionFansubGroupPageFoundingHistoryEdit`
  erweitert — Entscheidung über den Fix-Ansatz obliegt dieser Phase.
- Permission-Matrix-Zeile 6.4 (informativ): Wird durch die Entfernung von Member-Group-Story
  (Nutzer-Entscheidung 1) gegenstandslos — keine eigene Fix-Arbeit nötig, nur Löschung.
- Permission-Matrix-Zeile 8.4 (informativ): Orphan-Endpunkt `DELETE /fansubs/:id/members/:memberId`
  (`fansub_group_members.go`, 0 Frontend-Aufrufer außerhalb von Tests) wird entfernt.
- `174-REPORT.md`s weitere F-02..F-06/F-14/F-19/F-21-24-Punkte (OUTRO-Bug bereits oben, `anime_contributions`
  bereits oben, `openapi.yaml`-Duplicate-Key-Bug F-06, ASCII-Umlaut/natives-`<input>` F-03/F-04 auf der
  Fansub-Anlegen-Seite, mobiler Sticky-Save-Button-Overlap F-19, RVM-Schema-Mismatch-Tests F-14).

**Abhängigkeit:** Keine zu den Zusammenführungsphasen — läuft direkt nach Phase 175, vor Phase
1-5 (D-09, Nutzer-Reihenfolgewunsch).

**Risiko:** Gering bis mittel — Einzelspalten-/Routen-/Konstanten-Fixes, kein Strukturumbau einer
ganzen UI-Fläche.

**Aufwandsklasse:** Mittel (viele kleine, fachlich unabhängige Einzelpunkte über mehrere Dateien
verteilt, aber keiner davon berührt mehr als 1-2 Dateien).

**Vorbild/Altlast:** `AcceptFansubInvitation` ist das Vorbild für den `disabled`-Check in
Zeile 5.3; `GroupHistorySection`s `foundingOnly`-Flag ist das Vorbild für Zeile 6.1/6.2.
Zu entfernende Altlasten: `segmenteTabUtils.ts`, die komplette Member-Group-Story-Backend-Schicht,
der Legacy-Mitglied-Lösch-Endpunkt.

---

## Phase 1: Release-Bearbeitung zusammenführen (F-13)

**Ziel:** Eine einzige, rechtebasierte Release-Version-Bearbeitungsseite ersetzt die zwei komplett
getrennt implementierten Rahmen-Seiten für denselben Vorgang ("eine Release-Version bearbeiten"),
erreichbar von allen bisher 10 Einstiegspunkten.

**Umfang:** Fachaufgabe 3 aus `175-INVENTORY.md` — Admin-Editor (`/admin/episode-versions/[versionId]/edit`,
`EpisodeVersionEditorPage.tsx` 966 Z. + `useEpisodeVersionEditor.ts` 416 Z.) und `/me`-Workspace
(`/me/releases/[versionId]/workspace`, `workspace/page.tsx` 448 Z. + `workspaceHelpers.ts`), inkl.
aller 10 Einstiegspunkte (`VersionRow.tsx`, `versions/page.tsx`, `EpisodeEditForm.tsx`,
`fansubs/[id]/reviews/[reviewId]/page.tsx`, `UserMediaTab.tsx`, `ContributionCard.tsx`,
`attentionHelpers.ts`, `AttentionSection.tsx`, `AnimeGroupCard.tsx`,
`projects/[animeId]/group/[fansubGroupId]/page.tsx`). Die 4 gemeinsam genutzten Inhalts-Bausteine
(`ReleaseVersionMediaSection`, `ReleaseVersionNotesTab`, `SegmenteTab`,
`ReleaseVersionMetadataFields`) und die 3 bereits gemeinsamen Backend-Endpunkte bleiben
unverändert bestehen.

**Abhängigkeit:** Keine harte technische Abhängigkeit zu anderen Vorschlägen. Empfohlen: nach der
Bugfix-Sammelphase, da mehrere berührte Dateien (`attentionHelpers.ts`, `AttentionSection.tsx`)
auch Fachaufgabe-12-Dashboard-Hinweise referenzieren und ein sauberer Ausgangszustand hilft.

**Risiko:** Hoch — zentraler, stark genutzter Workflow für Admins UND Mitglieder; alle 10
Einstiegspunkte müssen umgestellt werden; alte URL muss nach Zusammenführung weiterleiten, um
Lesezeichen/Verlinkungen nicht zu brechen.

**Aufwandsklasse:** Groß (2 große Rahmen-Dateien, 10 Einstiegspunkte, 4 gemeinsame Bausteine, 3
Backend-Endpunkte, Routing-Änderung).

**Vorbild/Altlast (D-06):** Admin-Editor-Rahmen ist das Vorbild (kein Mitgliederprofil nötig,
volle Tab-Matrix mit `allowedTabs`, Löschen/Ordner-Scan/Gruppenverwaltung bereits integriert). Vor
der Entfernung des `/me`-Workspace-Rahmens werden zwei seiner Vorzüge übernommen: die
UI-Primitive-Nutzung (`PageHeader`/`AdjacentNavigation`/`Tabs`/`Card`/`ErrorState`/`LoadingState`,
CLAUDE.md-konform) und der `?return_to=`-Whitelist-Mechanismus (beide Whitelists werden
zusammengeführt). Danach wird `/me/releases/[versionId]/workspace/page.tsx` + `workspaceHelpers.ts`
vollständig entfernt (kein Nebeneinander, D-06).

**Rechte-Zuordnung:** Keine Permission-Matrix-Abweichung betrifft diese Fachaufgabe (Zeile 3.1 ist
bereits konsistent) — die Zusammenführung übernimmt unverändert `ReleaseVersionCapabilities`/
`CanForReleaseVersion`.

---

## Phase 2: Einheitliches Medien-Upload-System (F-15)

**Ziel:** Ein wiederverwendbarer Upload-Baustein (Mehrfachauswahl wird gemergt statt ersetzt,
Pro-Datei-Titel/Caption, Retry) ersetzt die unabhängig gebauten Upload-Wege für dieselbe fachliche
Aufgabe "Medien hochladen"; die dabei aufgedeckten Rechte-Abweichungen werden durch die
Vereinheitlichung auf EINE Rechte-Prüfung je Aktion aufgelöst (D-05/D-06 gemeinsam).

**Umfang:**
- Fachaufgabe 1, Weg 1 (Release-Medien, Vorbild) und Weg 2 (Gruppenmedien, Altlast) werden auf den
  gemeinsamen Baustein umgestellt.
- Fachaufgabe 1, Weg 6 (Release-Theme-Assets, 2 Einstiege) — der nahezu wortgleiche
  Persistenz-Codeblock (`admin_content_release_theme_assets.go:266-329`) wird in einen gemeinsamen
  Helfer extrahiert; eine eigene `ActionReleaseThemeAssetUpload`-Aktion ersetzt die fremd
  wiederverwendete `ActionReleaseVersionMediaUpload` (löst Permission-Matrix-Zeile 1.6).
- Fachaufgabe 8, #5/#6 (Soft-Delete-Duplikat-Rest): Das nahezu identische Soft-Delete-SQL-Skelett
  in `fansub_media_delete.go` (`media_repository.go:1041-1062`) und
  `release_version_media_repository.go:374-392` wird zu einem gemeinsamen Soft-Delete-Helfer
  zusammengeführt (fachlich Teil derselben Medien-Domäne wie der Upload).
- Weg 3 (Fansub-Logo/Banner), Weg 4 (Anime-Assets), Weg 5 (Segment-Assets), Weg 7
  (Profil-Avatar/-Hintergrund/-Story), Weg 8 (Medien-Vorschläge) bleiben laut Inventur **legitim
  getrennt** (strukturell andere Flows: Single-Slot-Replace, zweistufiger Upload+PATCH, Self-Service
  ohne Capability) — werden NICHT in den gemeinsamen Baustein gezwungen, nur auf Konvertierbarkeit
  geprüft (174-REPORT.md Empfehlung 4), außer Weg 4 erhält zusätzlich ein granulares
  Anzeige-Capability-Flag (löst Permission-Matrix-Zeile 1.4).

**Abhängigkeit:** Keine harte Abhängigkeit zu Phase 1, 3, 4 oder 5 — unterschiedliche Datei-Cluster.
Kann parallel zu Phase 1 laufen.

**Risiko:** Hoch — berührt Review-Workflows mehrerer Fachbereiche (Release-Medien unterliegt
keinem Review-Gate, Gruppenmedien löst `review_status=in_pruefung` aus) und die
Rechte-Vereinheitlichung wirkt sich auf echten Produktionsdaten-Zugriff aus (wer darf was
hochladen) — sorgfältige Migration der Custom-Permission-Fallback-Datensätze nötig.

**Aufwandsklasse:** Groß (15 UI-Flächen, 12 Frontend-API-Funktionen, 11 Backend-Handler laut
Fachaufgabe-1-Summenzeile, plus der Soft-Delete-Helfer aus Fachaufgabe 8).

**Vorbild/Altlast (D-06):** Weg 1 (Release-Medien-Upload, `ReleaseVersionMediaSection.tsx` +
`uploadReleaseVersionMedia`) ist das Vorbild (Mehrfachauswahl-Merge, kein Review-Gate-Konflikt).
Zu entfernen: `GroupMediaReviewUploadPanel.tsx`s eigene Replace-statt-Merge-Logik,
`fansub_media_upload.go`s zusätzliche Custom-Permission-Fallback-Prüfung (Zeile 54-72, nach
Migration der betroffenen individuellen Permission-Datensätze in die vereinheitlichte Capability),
der duplizierte Persistenz-Codeblock in `admin_content_release_theme_assets.go:266-329`, und
`fansub_media_delete.go`s unabhängig implementiertes Soft-Delete-SQL-Skelett.

**Rechte-Zuordnung:** Löst Permission-Matrix-Zeilen 1.2 (zwei parallele Rechte-Ebenen beim
Gruppenmedien-Upload — wird auf eine Capability-Ebene reduziert, Custom-Permission-Datensätze
werden vorher migriert), 1.4 (fehlende Anzeige-Capability bei Anime-Assets-Upload — neues
granulares Flag wird ergänzt), 1.6 (semantisch falsche Aktion bei Theme-Assets — neue eigene
Aktion `ActionReleaseThemeAssetUpload`).

---

## Phase 3: Einheitlicher Bild-Viewer (F-18)

**Ziel:** Ein gemeinsamer Viewer-Baustein auf Basis von `FansubMediaLightbox.tsx` (bereits
mehrfach wiederverwendet, Modal-basiert, Wrap-around) ersetzt die sechs eigenständigen
Viewer-Implementierungen, erweitert um die im Sketch dokumentierten fehlenden Merkmale (Zoom,
Touch-Swipe, Display→Original-Progressive-Load — bei KEINER der 6 heute vorhanden) sowie
Metadaten-Overlay und Prefetch aus den reichhaltigsten bestehenden Implementierungen.

**Umfang:** Fachaufgabe 2 aus `175-INVENTORY.md` — `ScreenshotGallery.tsx` (#3, eigenständige,
selbstgebaute Lightbox, UI-System-Verstoß durch rohes `<img>`/`<button>`), `ProjectMemberMediaViewer.tsx`
(#4, reichhaltigste Metadaten-Sidebar + Prefetch, vor Entfernung zu übernehmen),
`GroupAssetsExperience.tsx` (#5, Bildanteil; Video-Pfad via `VideoPlayerModal` bleibt
unberührt/legitim getrennt), `ReleaseVersionMediaDetailPanel.tsx` (#7, toter Code, 0 Importeure,
sofort löschbar). `ReleaseGallery.tsx` (#1) und `FansubGroupMediaBlock.tsx` delegieren bereits an
`FansubMediaLightbox.tsx` — keine Änderung nötig. Die beiden Admin-Formular-Varianten (#6
Medien-Bearbeiten-Drawer, #8 Gruppenmedien-Review-Detail-Drawer) bleiben laut Inventur legitime
Varianten (Bearbeitungsformular, kein Navigations-Viewer).

**Abhängigkeit:** Keine harte Abhängigkeit zu Phase 1, 2, 4, 5. Nutzt als Design-Grundlage den
bereits gelesenen (nicht verändert, D-08) Sketch `.planning/sketches/010-galerie-detailansicht`
(deckt nur die öffentliche Release-Galerie ab — die volle Vereinheitlichung ist zusätzlicher
Umfang gegenüber dem Sketch).

**Risiko:** Mittel — die betroffenen Flächen sind öffentlich sichtbar (hohe Sichtbarkeit bei
Regressionen), aber rein lesende Darstellung ohne Datenmutation; kein Rechte-Risiko (alle 6
Implementierungen sind bereits konsistent öffentlich/sichtbarkeitsgefiltert laut
Permission-Matrix-Zeilen 2.1-2.6).

**Aufwandsklasse:** Groß (6 eigenständige Implementierungen, Neubau eines erweiterten
gemeinsamen Bausteins, Einbindung an mind. 5 Konsumentenstellen).

**Vorbild/Altlast (D-06):** `FansubMediaLightbox.tsx` ist das Vorbild. Vor Entfernung von
`ProjectMemberMediaViewer.tsx` werden dessen Prefetch- und Metadaten-Sidebar-Fähigkeiten in die
Basis übernommen. Zu entfernen: `ScreenshotGallery.tsx`s eigene Lightbox, `ProjectMemberMediaViewer.tsx`
komplett, `GroupAssetsExperience.tsx`s Bild-Lightbox-Anteil, `ReleaseVersionMediaDetailPanel.tsx`
(kann unabhängig vom Rest sofort entfernt werden).

**Rechte-Zuordnung:** Keine Permission-Matrix-Abweichung betrifft diese Fachaufgabe (Zeilen
2.1-2.6 sind bereits konsistent).

---

## Phase 4: Suchen & Filtern vereinheitlichen (F-16)

**Ziel:** Ein gemeinsamer, umlaut-toleranter Filter-Helfer (wiederverwendet die
`f_unaccent()`/`pg_trgm`-Normalisierung der bestehenden globalen Suchbibliothek) ersetzt die sechs
unabhängig gebauten `toLowerCase().includes()`-Filter, die laut Inventur 0/6 umlaut-tolerant und
nur 2/6 über die `Input`-Primitive laufen.

**Umfang:** Fachaufgabe 7 aus `175-INVENTORY.md`, Einzel-Filter #1-#6 (`AdminGroupsClient.tsx`,
`admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx`, `GroupMediaReviewFilterBar.tsx`,
`useAnimePatchImpl.ts`-Genre/Tag-Autocomplete, `useAdminAnimeCreateControllerImpl.ts`-Genre/Tag-Autocomplete
— strukturell identische Kopie von #5). Die globale Suchbibliothek (`/suche`, #0) bleibt
unverändert bestehen (eigene Infrastruktur, legitim getrennt). Empfehlung aus `174-REPORT.md`
Priorität 3 wird hier konkretisiert: (a) gemeinsamer Filter-Helfer für alle 6 Stellen, (b)
Migration der größten Listen (Fansub-Liste, Merge, Gruppen) direkt auf die Backend-Suchbibliothek,
sofern das Pseudo-Vollabruf-Muster (`per_page:500`) dadurch entfällt.

**Abhängigkeit:** Keine harte Abhängigkeit zu Phase 1, 2, 3 oder 5 — rein lesende Filterlogik ohne
Rechte-Beteiligung.

**Risiko:** Niedrig bis mittel — interne Admin-Filterung ohne Datenmutation; einziges
Sorgfalts-Erfordernis ist die Bewahrung der eigenen Scoring-Logik aus Weg 3
(`admin/fansubs/merge/page.tsx`) beim Zusammenführen.

**Aufwandsklasse:** Mittel (6 Implementierungen, aber strukturell einfache Filterlogik; #5/#6 sind
bereits eine 1:1-Kopie und damit der einfachste Merge-Fall).

**Vorbild/Altlast (D-06):** `GroupMediaReviewFilterBar.tsx` (reichhaltigste Mehrfeld-Suche, nutzt
bereits die `Input`-Primitive) und `AdminGroupsClient.tsx` (nutzt bereits die `Input`-Primitive)
sind die Vorbild-Kandidaten für die UI-Schicht; die Normalisierungslogik der globalen
Suchbibliothek (`search_anime.go`) ist das Vorbild für die Filterlogik. Zu entfernen: die
Filterlogik in allen 6 genannten Dateien, ersetzt durch Aufrufe des gemeinsamen Helfers; die
strukturell identische Kopie in `useAdminAnimeCreateControllerImpl.ts` entfällt vollständig
zugunsten von `useAnimePatchImpl.ts`s (oder umgekehrt, je nach gewähltem Vorbild) gemeinsamem
Autocomplete-Baustein.

**Rechte-Zuordnung:** Keine Permission-Matrix-Abweichung — Fachaufgabe 7 dokumentiert durchgängig
`(d) Rechte: n/a` (bestätigter Negativbefund, siehe `175-PERMISSION-MATRIX.md` Abschnitt
"Fachaufgaben ohne Rechte-Aktionspaare").

---

## Phase 5: Status-/Label-Konsolidierung (Fachaufgabe 11, Gruppe 4 + 5)

**Ziel:** Eine kanonische Implementierung je byte-identischer Label-Gruppe ersetzt redundante
Parallel-Implementierungen; zwei tote Code-Pfade werden entfernt. Die drei Label-Gruppen mit
echter Verhaltensabweichung (Gruppe 1 Segment-Typ-Badge → bereits F-02/Bugfix-Sammelphase; Gruppe 2
Gruppenmedien-Kategorie-Label; Gruppe 3 Claim-Status-Label) werden hier bewusst **nicht** blind
gemergt (D-04/D-07: unterschiedliche Werte brauchen eine Produktentscheidung, kein stiller Merge) —
sie bleiben als offene Befunde für eine spätere, eigene Entscheidung dokumentiert.

**Umfang:** Gruppe 4 (App-User-Konten-Status-Label, 4 byte-identische Implementierungen in
`AdminUsersClient.tsx`, `UserDetailPageClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`
— die Duplikation ist bereits im Code-Kommentar selbst dokumentiert) und Gruppe 5
(Release-Version-Medien-Review-State-Label: produktiver `statusBadge` in
`ReleaseVersionMediaSection.tsx` vs. toter `reviewLabel` in `ReleaseVersionMediaGallery.tsx`, 0
Importeure außer eigener Testdatei, byte-identisch für alle 4 Werte + Fallback).

**Abhängigkeit:** Keine — niedrigstes Risiko aller Vorschläge, kann unabhängig von Phase 1-4
jederzeit eingeschoben werden.

**Risiko:** Niedrig — reine Darstellungslogik ohne Rechte-Beteiligung (Fachaufgabe 11 bestätigt
`(d) Rechte: n/a` für alle 6 untersuchten Gruppen und per Grep 0 fälschlich rechtesuggerierende
Labels).

**Aufwandsklasse:** Klein (2 Label-Gruppen, risikofrei mergbar laut Inventur, plus 2
Dead-Code-Entfernungen).

**Vorbild/Altlast (D-06):** Für Gruppe 4 wird eine der vier byte-identischen Implementierungen
(empfohlen: `UserDetailPageClient.tsx`, da zentralste Konsumentenstelle) als kanonischer
`appUserStatusLabels.ts`-Helfer extrahiert; die anderen drei (`AdminUsersClient.tsx`,
`UserOverviewTab.tsx`, `RoleHoldersTable.tsx`) werden auf den Helfer umgestellt und ihre lokale
Kopie entfernt. Für Gruppe 5 ist `statusBadge` (`ReleaseVersionMediaSection.tsx`) das Vorbild; der
tote `reviewLabel` in `ReleaseVersionMediaGallery.tsx` wird vollständig entfernt.

**Rechte-Zuordnung:** Keine Permission-Matrix-Abweichung — Fachaufgabe 11 dokumentiert
durchgängig `(d) Rechte-Bezug: n/a` (bestätigter Negativbefund).

---

## Zuordnung der Permission-Matrix-Abweichungen (vollständig, alle 8 markierten Zeilen)

| Zeile | Aktion | Zuordnung | Begründung |
|---|---|---|---|
| 1.2 | Gruppenmedien-Upload (zwei parallele Rechte-Ebenen) | Phase 2 (Medien-Upload) | Die Zusammenführung der Upload-Wege auf einen gemeinsamen Baustein erfordert ohnehin eine einzige Rechte-Prüfung — wird direkt durch den Merge gelöst, kein separater Fix nötig. |
| 1.4 | Anime-Assets-Upload (Anzeige fehlt) | Phase 2 (Medien-Upload) | Das fehlende granulare Anzeige-Capability-Flag wird beim Vereinheitlichen der Upload-UI ergänzt — gleicher Arbeitsschritt wie 1.2. |
| 1.6 | Release-Theme-Assets-Upload (fremde Aktion) | Phase 2 (Medien-Upload) | Die neue eigene `ActionReleaseThemeAssetUpload`-Aktion ist Teil desselben Zusammenführungsschritts, der auch den duplizierten Persistenz-Codeblock auflöst. |
| 5.3 | Claim-Invite-Accept ohne `disabled`-Check | Bugfix-Sammelphase (Phase 0) | Nutzer-Reihenfolgewunsch (`175-USER-DECISIONS.md` Punkt 4) benennt diesen Sicherheitsbefund explizit als Bug-Phase-Fall; kein UI-Zusammenführungsschritt involviert, reiner Server-seitiger Ein-Zeilen-Fix analog `AcceptFansubInvitation`. |
| 6.1 | Notizen-Tab-Gate (ODER-Verknüpfung weiter als Durchsetzung) | Bugfix-Sammelphase (Phase 0) | Notizen schreiben (Fachaufgabe 6) ist keiner der 5 Zusammenführungsphasen zugeordnet (kein Duplikat-Cluster auf UI-Ebene) — reiner Rechte-Konsistenz-Fix, gehört laut `175-CONTEXT.md`s Deferred-Abschnitt in die Bugfix-Sammelphase (D-05-Befunde fließen dort ein). |
| 6.2 | Notizen-Button-Ebene (fehlendes `foundingOnly`-Pendant) | Bugfix-Sammelphase (Phase 0) | Gleicher Cluster wie 6.1, gleicher Fix-Zeitpunkt (beide Ebenen des Notizen-Tabs sollten zusammen behoben werden). |
| 6.4 | Member-Group-Story (inkonsistentes Rechte-Modell, totes Feature) | Bugfix-Sammelphase (Phase 0) | Wird durch die in Phase 0 ohnehin vorgesehene vollständige Entfernung von Member-Group-Story (Nutzer-Entscheidung 1) gegenstandslos — kein separater Rechte-Fix nötig, nur Löschung. |
| 8.4 | Fansub-Mitglied-Löschen Legacy (Orphan-Endpunkt, abweichende Strenge) | Bugfix-Sammelphase (Phase 0) | Reine Dead-Code-Entfernung (0 Frontend-Aufrufer außerhalb von Tests) ohne UI-Zusammenführungsbezug — passt zu den übrigen Aufräumarbeiten in Phase 0 (analog F-19/F-21-24). |

---

## Weitere, kleinere Funde ohne eigene Phase (zur Kenntnis, Einordnung dokumentiert)

- **Fachaufgabe 4, Nebenbefund:** `anime_contributions.review_status_id` (seit Migration 0097)
  ist faktisch tot (wird nur kopiert, nie für Review-Entscheidungen gelesen/geschrieben) — Kandidat
  für eine kleine Aufräum-Aufgabe innerhalb der Bugfix-Sammelphase, kein eigener Phasenvorschlag
  nötig.
- **Fachaufgabe 5, Befund 4 (Memorial-Guard doppelt implementiert):** Wortgleicher Fehlercode
  `memorial_not_claimable` in zwei unabhängigen Repositories
  (`member_claims_submit_repository.go:48-69` vs. `member_claim_invitations_repository.go:187-215`)
  — kleiner Merge-Kandidat, passt thematisch zur Bugfix-Sammelphase (gleicher Bereich wie Zeile
  5.3), kein eigener Phasenvorschlag nötig.
- **Fachaufgabe 5, #6 `ClaimManagementPanel.tsx`:** Laut Code-Kommentar absichtlich nicht
  gemountete Parallel-Implementierung zu #3 (`135-RESEARCH.md` Open Question 2) — Entscheidung über
  endgültige Entfernung oder Aktivierung bleibt offen, kein eigener Phasenvorschlag in dieser
  Roadmap (zu klein für eine eigene Phase, zu unklar für einen automatischen Bugfix).
- **Fachaufgabe 11, Gruppe 2 + 3 (Verhaltensabweichungen):** Gruppenmedien-Kategorie-Label
  (`old_website`/`irc_chat`-Textabweichungen) und Claim-Status-Label (`'verified'` →
  "Verifiziert" vs. "Genehmigt") sind laut Inventur bewusst **nicht** blind zu mergen — sie
  benötigen eine Produktentscheidung, welcher Text korrekt ist, bevor ein Merge stattfinden kann.
  Empfehlung: Diese Entscheidung sollte vor Phase 5 (Status-/Label-Konsolidierung) getroffen
  werden, damit Phase 5 bei Gelegenheit gleich mit erledigt werden kann — ist aber kein
  Blocker für Phase 5 selbst, da Phase 5 nur die bereits byte-identischen Gruppen 4/5 abdeckt.
- **Fachaufgabe 12, Teil 2 (Toast-Benachrichtigungen):** 48 Ad-hoc-`errorBox`/`successBox`-Implementierungen
  plus eine tote `MessageToast.tsx`-Komponente sind laut Inventur eine "Variante mit hohem
  Konsolidierungspotenzial" — keine D-04-"Duplikat"-Klassifikation im engeren Sinne (keine zwei
  identischen Implementierungen derselben Aufgabe, sondern viele unabhängige Ad-hoc-Lösungen ohne
  gemeinsame Basis) und daher kein verpflichtender Phasenvorschlag nach den must_haves dieses
  Plans. Für eine künftige Betrachtung vorgemerkt, falls eine Folgephase UI-Konsistenz im
  Feedback-Bereich priorisiert.

---

## Abschluss (D-09)

Phase 175 legt selbst keine ROADMAP.md-Phasen an — diese Vorschläge werden erst nach
Nutzerbestätigung (siehe Task 2) in ROADMAP.md übernommen.
