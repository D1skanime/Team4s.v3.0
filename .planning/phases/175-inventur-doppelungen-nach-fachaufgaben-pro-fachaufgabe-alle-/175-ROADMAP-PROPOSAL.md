# 175-ROADMAP-PROPOSAL.md — Zugeschnittene Folgephasen (D-07-Artefakt 3 von 3)

**Zweck:** Synthetisiert aus `175-INVENTORY.md` (12 Fachaufgaben, Duplikat-Klassifikationen) und
`175-PERMISSION-MATRIX.md` (44 geprüfte Rechte-Vergleichspunkte, 6 Abweichungen + 2 informative
Befunde) konkrete, zugeschnittene Folgephasen-Vorschläge. Bindend berücksichtigt:
`175-USER-DECISIONS.md` (Member-Group-Story-Entfernung, OUTRO-Kürzel-Fix, F-05-Ursachenklärung,
Reihenfolge-Wunsch Bug-Phase-zuerst) sowie `174-REPORT.md`s bereits vorhandene
F-13/F-15/F-16/F-18-Empfehlungen, die hier nicht ersetzt, sondern mit den Welle-1-Funden
konkretisiert werden.

**Einordnung:** Die sechs durch 175-09 neu zugeschnittenen Zusammenführungsphasen (vormals
Vorschläge 1-5, wobei Vorschlag 2 „Medien-Upload" nutzerseitig in zwei Phasen aufgeteilt wurde)
sowie eine neu ergänzte Phase (Bildspeicher, F-01, aus `174-FOLLOWUPS.md`) tragen nach der
Nutzer-Bestätigung vom 2026-10-07 (siehe Abschnitt „Nutzer-Bestätigung" am Ende dieses Dokuments)
die konkreten Nummern 177-183. Die „Bugfix-Sammelphase" (Phase 176) ist dagegen bereits in
`174-FOLLOWUPS.md`/`175-CONTEXT.md`s Deferred-Abschnitt angekündigt (nicht neu durch 175-09
erfunden) und wird hier nur referenziert sowie um die 175-Rechte-Befunde ergänzt, weil
D-09/der Nutzer-Reihenfolgewunsch verlangt, dass sie direkt nach Phase 175 läuft — vor den
Zusammenführungsphasen. Die konkrete Nummerierung 176-183 selbst ist Teil der Nutzer-Bestätigung
dieses Checkpoints, nicht eine durch 175-09 eigenmächtig vorgenommene ROADMAP.md-Phasenanlage
(D-09 bleibt gewahrt — siehe Abschnitt „Abschluss").

---

## Übersichtstabelle

| Phase | Ziel | Fachaufgaben | Abhängigkeit | Risiko | Aufwandsklasse | zu entfernende Altlast |
|---|---|---|---|---|---|---|
| 176. Bugfix-Sammelphase (bereits angekündigt, referenziert, nicht neu vorgeschlagen) | 174-FOLLOWUPS-Bugs + D-05-Rechte-Befunde + Nutzer-Entscheidungen bereinigt, Produktcode wieder konsistent zum eigenen Anspruch | 174-FOLLOWUPS F-02..F-06,F-14,F-19,F-21-24; Permission-Matrix-Zeilen 5.3/6.1/6.2/6.4/8.4; Nutzer-Entscheidung 1 | Keine — läuft laut Nutzerwunsch direkt nach 175, vor allen Zusammenführungsphasen (177-183). Intern in 5 klar getrennte, voneinander geblockte Arbeitspakete aufgeteilt (siehe Detailabschnitt) | mittel | mittel | `segmenteTabUtils.ts`; `member_group_stories`-Tabelle + 5 Admin-Endpunkte + `admin_content_member_stories.go` + ungenutzte `history.ts`/`fansubs-members.ts`-Funktionen; Legacy-Endpunkt `DELETE /fansubs/:id/members/:memberId` (`fansub_group_members.go`) |
| 177. Einheitlicher Bild-Viewer (F-18) | Ein gemeinsamer Viewer-Baustein (`FansubMediaLightbox.tsx` als Basis, erweitert um Zoom/Swipe/Progressive-Load/Metadaten-Overlay/Prefetch) statt sechs eigenständiger Implementierungen | Fachaufgabe 2 (F-18) | Nach Phase 176; keine harte Abhängigkeit zu 178-183 | mittel | groß | `ScreenshotGallery.tsx`s eigene Lightbox; `ProjectMemberMediaViewer.tsx` (nach Übernahme von Prefetch/Metadaten-Sidebar in die Basis); `GroupAssetsExperience.tsx`s Bild-Lightbox-Anteil (Video-Pfad via `VideoPlayerModal` bleibt unberührt); `ReleaseVersionMediaDetailPanel.tsx` (sofort löschbar, 0 Importeure) |
| 178. Suchen & Filtern vereinheitlichen (F-16) | Ein gemeinsamer, umlaut-toleranter Filter-Helfer (wiederverwendet die Normalisierung der globalen Suchbibliothek) statt sechs unabhängiger `toLowerCase().includes()`-Implementierungen | Fachaufgabe 7 (F-16) | Nach Phase 176; keine harte Abhängigkeit zu 177/179-183 | niedrig bis mittel | mittel | Filterlogik in `AdminGroupsClient.tsx`, `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx` (Scoring bleibt erhalten, wandert in den Helfer), `GroupMediaReviewFilterBar.tsx`, die vier strukturell identischen Filterblöcke in `useAnimePatchImpl.ts`/`useAdminAnimeCreateControllerImpl.ts` |
| 179. Media-Backend/Rechte — F-15 Teil 1 | Eine einzige, konsolidierte Rechte-/Backend-Schicht für die Medien-Domäne (eine Capability-Ebene statt zwei paralleler Prüfungen, Soft-Delete-Helfer, bereinigte Theme-Asset-Persistenz) als Fundament für den gemeinsamen Upload-Baustein | Fachaufgabe 1 (F-15, Backend-/Rechte-Anteil), Fachaufgabe 8 #5/#6 (Soft-Delete-Duplikat-Rest) | Nach Phase 176; Voraussetzung für Phase 180 (180 baut auf der hier konsolidierten Basis auf); läuft sequenziell zu Phase 181 (Release-Bearbeitung), NICHT parallel (Nutzerwunsch) | hoch | groß | `fansub_media_upload.go`s zusätzliche Custom-Permission-Fallback-Prüfung (Zeile 54-72); dupliziertes Persistenz-Codeblock in `admin_content_release_theme_assets.go:266-329`; `fansub_media_delete.go`s unabhängig implementiertes Soft-Delete-SQL-Skelett (`media_repository.go:1041-1062`) |
| 180. Upload-Frontend/-Workflow — F-15 Teil 2 | Ein wiederverwendbarer Upload-Baustein (Collect-statt-Replace, Pro-Datei-Titel, Retry) statt getrennt gebauter Upload-Wege, aufgesetzt auf der in Phase 179 konsolidierten Rechte-/Backend-Basis | Fachaufgabe 1 (F-15, Frontend-/Workflow-Anteil) | Abhängig von Phase 179 (braucht die konsolidierte Basis zuerst); läuft sequenziell zu Phase 181 (Release-Bearbeitung), NICHT parallel (Nutzerwunsch) | hoch | groß | `GroupMediaReviewUploadPanel.tsx`s eigene Replace-statt-Merge-Logik |
| 181. Release-Bearbeitung zusammenführen (F-13) | Eine rechtebasierte Release-Version-Bearbeitungsseite statt zwei getrennt gebauter Rahmen | Fachaufgabe 3 (F-13) | Nach Phase 176; läuft sequenziell zu Phase 179/180 (Medien-Upload), NICHT parallel (Nutzerwunsch), da beide denselben Release-Versions-Datenpfad berühren | hoch | groß | `/me/releases/[versionId]/workspace/page.tsx` + `workspaceHelpers.ts` (gesamter `/me`-Workspace-Rahmen) |
| 182. Bildspeicher entfernen (F-01) | Nur noch ein Bildspeicher-System: der veraltete Legacy-Pfad (`anime.cover_image`-Spalte + Lese-/Schreibzweige) wird zugunsten des bereits produktiv genutzten V2-Bildspeichers (`anime_media`+`media_assets`) vollständig entfernt | F-01 (aus `174-FOLLOWUPS.md`, auf Nutzerwunsch hier ergänzt — kein `175-INVENTORY.md`-Fachaufgaben-Cluster, siehe Hinweis im Detailabschnitt) | Nach Phase 176; keine harte Abhängigkeit zu 177-181/183 | mittel | mittel | Legacy-Zweige in `backend/internal/repository/anime_assets*.go`; `hasV2AssetSchema`-Extra-Query-Check; Spalte `anime.cover_image`; `syncLegacyAnimeCoverImageV2` |
| 183. Status-/Label-Konsolidierung | Eine kanonische Implementierung je byte-identischer Label-Gruppe statt redundanter Parallel-Implementierungen; zwei tote Code-Pfade entfernt | Fachaufgabe 11 Gruppe 4 + Gruppe 5 | Keine Abhängigkeit; niedrigstes Risiko, kann jederzeit eingeschoben werden | niedrig | klein | 3 von 4 App-User-Status-Label-Implementierungen (`AdminUsersClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx` — eine bleibt kanonisch); toter `reviewLabel` in `ReleaseVersionMediaGallery.tsx` (0 Importeure) |

---

## Phase 176: Bugfix-Sammelphase

**Ziel:** Die in Phase 174 gefundenen, noch offenen Bugs (`174-FOLLOWUPS.md` F-02..F-06, F-14,
F-19, F-21-24) sowie die in dieser Phase 175 neu gefundenen Rechte-Abweichungen und die
verbindlichen Nutzer-Entscheidungen werden behoben, bevor die größeren Zusammenführungsphasen
beginnen — Reihenfolge-Wunsch des Nutzers (`175-USER-DECISIONS.md` Punkt 4).

**Interne Struktur — 5 klar getrennte, voneinander geblockte Arbeitspakete:** Die Phase wird NICHT
als ein durchmischter Fix-Strom bearbeitet, sondern in fünf eigenständige Pakete gegliedert, die
jeweils einzeln abgeschlossen (eigene Commits, eigene Tests) werden, bevor das nächste Paket
begonnen wird — keine Überlappung/Verzahnung zwischen den Paketen:

- **Paket A — Story-Entfernung:** Nutzer-Entscheidung 1: `member_group_stories` (Migration
  0062/0068, 0 Datensätze) + 5 Admin-Endpunkte `/admin/fansubs/:id/member-stories*` +
  `admin_content_member_stories.go` + ungenutzte `history.ts`/`fansubs-members.ts`-Funktionen
  werden vollständig entfernt (Fachaufgabe 6, Cluster 3 — bestätigt 0 Frontend-Konsumenten).
  **Kein Nutzer-Checkpoint nötig** — 0 Datensätze betroffen, Entfernung ist bestätigt sicher.
  Permission-Matrix-Zeile 6.4 (informativ, Member-Group-Story inkonsistentes Rechte-Modell) wird
  durch dieses Paket gegenstandslos — keine eigene Fix-Arbeit nötig, nur Löschung.
- **Paket B — Theme-Kürzel OUT:** Nutzer-Entscheidung 2 (F-02): Kürzel `OUT` für den Theme-Typ
  "Outro" wird fest in der DB hinterlegt statt namens-geraten; `segmenteTabUtils.ts` (toter Code,
  nur Test-Import, Fachaufgabe 11 Gruppe 1) wird entfernt.
- **Paket C — F-05 `anime_contributions`:** Nutzer-Entscheidung 3: Ursache der 9 doppelten
  `anime_contributions`-Zeilen für Mitglied `timer` wird gefunden und im Code/Schema behoben
  (Root-Cause-Fix, z. B. Eindeutigkeit + idempotentes Anlegen) — **dieser Code-Fix läuft ohne
  Checkpoint.** Die Bereinigung der dadurch bereits entstandenen fehlerhaften Bestandsdaten
  (bestehende doppelte Zeilen) erfordert dagegen einen **expliziten blockierenden
  Nutzer-Checkpoint** vor der Ausführung (Freigabe nach Backup) — Code-Fix und Datenbereinigung
  sind getrennte Schritte mit unterschiedlichem Freigabe-Bedarf.
- **Paket D — Rechte- und Sicherheitsfixes:**
  - Permission-Matrix-Zeile 5.3: `AcceptClaimInvitation`
    (`member_claim_invitations_handler.go:144`) erhält denselben `disabled`-Status-Check wie
    `AcceptFansubInvitation` (Zeile 5.2) — Sicherheitsbefund aus 175.
  - Permission-Matrix-Zeilen 6.1/6.2: Das Notizen-Tab-Gate (`fansubEditAccess.ts:46`) und die
    Button-Ebene (`NotesTab.tsx:66-94`) erhalten entweder ein `foundingOnly`-Pendant (analog
    `GroupHistorySection`) oder die Durchsetzung wird um
    `ActionFansubGroupPageFoundingHistoryEdit` erweitert — Entscheidung über den Fix-Ansatz
    obliegt dieser Phase.
  - Permission-Matrix-Zeile 8.4 (informativ): Orphan-Endpunkt
    `DELETE /fansubs/:id/members/:memberId` (`fansub_group_members.go`, 0 Frontend-Aufrufer
    außerhalb von Tests) wird entfernt.
- **Paket E — restliche 174-Bugs:** `174-REPORT.md`s weitere F-02..F-06/F-14/F-19/F-21-24-Punkte
  (OUTRO-Bug bereits in Paket B, `anime_contributions` bereits in Paket C,
  `openapi.yaml`-Duplicate-Key-Bug F-06, ASCII-Umlaut/natives-`<input>` F-03/F-04 auf der
  Fansub-Anlegen-Seite, mobiler Sticky-Save-Button-Overlap F-19, RVM-Schema-Mismatch-Tests F-14).

**Abhängigkeit:** Keine zu den Zusammenführungsphasen — läuft direkt nach Phase 175, vor Phase
177-183 (D-09, Nutzer-Reihenfolgewunsch).

**Risiko:** Mittel — auch wenn die meisten Einzelpunkte Spalten-/Routen-/Konstanten-Fixes ohne
Strukturumbau sind, enthält Paket D echte Sicherheits-/Rechte-Lücken (5.3) und Paket C potenziell
eine Bestandsdaten-Bereinigung an Produktionsdaten (daher der blockierende Checkpoint); in Summe
rechtfertigt das die Einstufung "mittel" statt "gering".

**Aufwandsklasse:** Mittel (viele kleine, fachlich unabhängige Einzelpunkte über mehrere Dateien
verteilt, aber keiner davon berührt mehr als 1-2 Dateien).

**Vorbild/Altlast:** `AcceptFansubInvitation` ist das Vorbild für den `disabled`-Check in
Zeile 5.3; `GroupHistorySection`s `foundingOnly`-Flag ist das Vorbild für Zeile 6.1/6.2.
Zu entfernende Altlasten: `segmenteTabUtils.ts`, die komplette Member-Group-Story-Backend-Schicht,
der Legacy-Mitglied-Lösch-Endpunkt.

---

## Phase 177: Einheitlicher Bild-Viewer (F-18)

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

**Abhängigkeit:** Nach Phase 176. Keine harte Abhängigkeit zu Phase 178-183. Nutzt als
Design-Grundlage den bereits gelesenen (nicht verändert, D-08) Sketch
`.planning/sketches/010-galerie-detailansicht` (deckt nur die öffentliche Release-Galerie ab — die
volle Vereinheitlichung ist zusätzlicher Umfang gegenüber dem Sketch).

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

## Phase 178: Suchen & Filtern vereinheitlichen (F-16)

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

**Abhängigkeit:** Nach Phase 176. Keine harte Abhängigkeit zu Phase 177, 179-183 — rein lesende
Filterlogik ohne Rechte-Beteiligung.

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

## Phase 179: Media-Backend/Rechte (F-15 Teil 1)

**Ziel:** Eine einzige, konsolidierte Rechte-/Backend-Schicht für die Medien-Domäne (eine
Capability-Ebene statt zweier paralleler Rechte-Prüfungen, ein gemeinsamer Soft-Delete-Helfer,
eine bereinigte Theme-Asset-Persistenz) wird geschaffen — das fachliche und technische Fundament,
auf dem der in Phase 180 gebaute gemeinsame Upload-Baustein aufsetzt. Diese Phase ist der
**erste Teil** der ursprünglich einheitlichen F-15-Vorschlagsphase ("Medien-Upload"); auf
Nutzerwunsch wurde F-15 in Backend/Rechte (diese Phase) und Frontend/Workflow (Phase 180)
aufgeteilt.

**Umfang:**
- Permission-Matrix-Zeile 1.2 (Gruppenmedien-Upload, zwei parallele Rechte-Ebenen): Die
  Custom-Permission-Fallback-Prüfung in `fansub_media_upload.go` (Zeile 54-72) wird nach Migration
  der betroffenen individuellen Permission-Datensätze in eine vereinheitlichte Capability-Prüfung
  überführt.
- Permission-Matrix-Zeile 1.4 (Anime-Assets-Upload, fehlende Anzeige-Capability): Ein neues
  granulares Anzeige-Capability-Flag wird ergänzt.
- Permission-Matrix-Zeile 1.6 (Release-Theme-Assets-Upload, semantisch falsche
  Aktion): Der nahezu wortgleiche Persistenz-Codeblock
  (`admin_content_release_theme_assets.go:266-329`) wird in einen gemeinsamen Helfer extrahiert;
  eine eigene `ActionReleaseThemeAssetUpload`-Aktion ersetzt die fremd wiederverwendete
  `ActionReleaseVersionMediaUpload`.
- Fachaufgabe 8, #5/#6 (Soft-Delete-Duplikat-Rest): Das nahezu identische Soft-Delete-SQL-Skelett
  in `fansub_media_delete.go` (`media_repository.go:1041-1062`) und
  `release_version_media_repository.go:374-392` wird zu einem gemeinsamen Soft-Delete-Helfer
  zusammengeführt (fachlich Teil derselben Medien-Domäne wie der Upload).
- Weg 4 (Anime-Assets) erhält zusätzlich das granulare Anzeige-Capability-Flag (löst zusammen mit
  obigem Punkt Permission-Matrix-Zeile 1.4).

**Abhängigkeit:** Nach Phase 176. Voraussetzung für Phase 180 (180 kann erst beginnen, wenn die
hier konsolidierte Rechte-/Backend-Basis steht). Läuft sequenziell zu Phase 181
(Release-Bearbeitung) — NICHT parallel (Nutzerwunsch, da beide Phasen die Release-Versions-nahen
Backend-Pfade berühren).

**Risiko:** Hoch — die Rechte-Vereinheitlichung wirkt sich auf echten Produktionsdaten-Zugriff aus
(wer darf was hochladen); sorgfältige Migration der Custom-Permission-Fallback-Datensätze nötig,
bevor die alte Prüfung entfernt werden darf.

**Aufwandsklasse:** Groß (11 Backend-Handler laut Fachaufgabe-1-Summenzeile sind vom
Rechte-Umbau betroffen, plus der Soft-Delete-Helfer aus Fachaufgabe 8 und die
Theme-Asset-Persistenz-Extraktion).

**Vorbild/Altlast (D-06):** Weg 1 (Release-Medien-Upload) ist das Rechte-Vorbild (kein
Review-Gate-Konflikt, einfache Capability-Prüfung). Zu entfernen:
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

## Phase 180: Upload-Frontend/-Workflow (F-15 Teil 2)

**Ziel:** Ein wiederverwendbarer Upload-Baustein (Mehrfachauswahl wird gemergt statt ersetzt,
Pro-Datei-Titel/Caption, Retry) ersetzt die unabhängig gebauten Upload-Wege für dieselbe fachliche
Aufgabe "Medien hochladen", aufgesetzt auf der in Phase 179 bereits konsolidierten
Rechte-/Backend-Basis. Dies ist der **zweite Teil** der ursprünglich einheitlichen
F-15-Vorschlagsphase.

**Umfang:**
- Fachaufgabe 1, Weg 1 (Release-Medien, Vorbild) und Weg 2 (Gruppenmedien, Altlast) werden auf den
  gemeinsamen Upload-Baustein umgestellt.
- Fachaufgabe 1, Weg 6 (Release-Theme-Assets, 2 Einstiege) wird auf den gemeinsamen Baustein und
  die in Phase 179 neu geschaffene `ActionReleaseThemeAssetUpload`-Aktion umgestellt.
- Weg 3 (Fansub-Logo/Banner), Weg 4 (Anime-Assets), Weg 5 (Segment-Assets), Weg 7
  (Profil-Avatar/-Hintergrund/-Story), Weg 8 (Medien-Vorschläge) bleiben laut Inventur **legitim
  getrennt** (strukturell andere Flows: Single-Slot-Replace, zweistufiger Upload+PATCH, Self-Service
  ohne Capability) — werden NICHT in den gemeinsamen Baustein gezwungen, nur auf Konvertierbarkeit
  geprüft (174-REPORT.md Empfehlung 4).

**Abhängigkeit:** Abhängig von Phase 179 (braucht die dort konsolidierte Rechte-/Backend-Basis,
insbesondere die neue `ActionReleaseThemeAssetUpload`-Aktion und den gemeinsamen
Soft-Delete-Helfer, bevor der Frontend-Baustein gebaut werden kann). Läuft sequenziell zu Phase
181 (Release-Bearbeitung) — NICHT parallel (Nutzerwunsch).

**Risiko:** Hoch — berührt Review-Workflows mehrerer Fachbereiche (Release-Medien unterliegt
keinem Review-Gate, Gruppenmedien löst `review_status=in_pruefung` aus).

**Aufwandsklasse:** Groß (15 UI-Flächen, 12 Frontend-API-Funktionen laut Fachaufgabe-1-Summenzeile
sind vom Upload-Baustein-Umbau betroffen).

**Vorbild/Altlast (D-06):** Weg 1 (Release-Medien-Upload, `ReleaseVersionMediaSection.tsx` +
`uploadReleaseVersionMedia`) ist das Vorbild (Mehrfachauswahl-Merge, kein Review-Gate-Konflikt).
Zu entfernen: `GroupMediaReviewUploadPanel.tsx`s eigene Replace-statt-Merge-Logik.

**Rechte-Zuordnung:** Keine eigenen Permission-Matrix-Abweichungen — diese werden bereits in
Phase 179 gelöst; Phase 180 übernimmt die dort konsolidierte Rechte-Schicht unverändert in der
neuen Upload-UI.

---

## Phase 181: Release-Bearbeitung zusammenführen (F-13)

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

**Abhängigkeit:** Nach Phase 176 (mehrere berührte Dateien, z. B. `attentionHelpers.ts`,
`AttentionSection.tsx`, referenzieren auch Fachaufgabe-12-Dashboard-Hinweise, ein sauberer
Ausgangszustand hilft). Läuft sequenziell zu Phase 179/180 (Medien-Upload) — NICHT parallel
(Nutzerwunsch), da beide Phasen denselben Release-Versions-Datenpfad berühren (die 4 gemeinsamen
Inhalts-Bausteine dieser Phase umfassen u. a. `ReleaseVersionMediaSection`, die auch der
Upload-Baustein aus Phase 180 verwendet).

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

## Phase 182: Bildspeicher entfernen (F-01)

**Ziel:** Nur noch ein Bildspeicher-System existiert: Der veraltete Legacy-Pfad
(`anime.cover_image`-Spalte + zugehörige Lese-/Schreibzweige) wird vollständig entfernt zugunsten
des bereits produktiv genutzten V2-Bildspeichers (`anime_media` + `media_assets`, Live-Betrieb
bestätigt 2026-10-05).

**Quellenhinweis:** Dieser Phasenvorschlag stammt NICHT aus `175-INVENTORY.md` (F-01 ist kein
durch 175 neu gefundener Fachaufgaben-Duplikat-Cluster), sondern aus `174-FOLLOWUPS.md` F-01
("Alten Bildspeicher (legacy) entfernen" — Nutzer-Zitat: „total veraltet, muss weg") und wurde
dort bereits als erste empfohlene Folgephase genannt. Der ursprüngliche 175-09-Vorschlag hatte
diesen Fund versehentlich nicht als eigene Phase geführt; auf ausdrücklichen Nutzerwunsch beim
Bestätigungs-Checkpoint wird er hier als Phase 182 ergänzt.

**Umfang (3 Schritte laut `174-FOLLOWUPS.md`):**
- Schritt 1 (klein): Tote Legacy-Zweige in `backend/internal/repository/anime_assets*.go`
  entfernen sowie den `hasV2AssetSchema`-Extra-Query-Check (1 zusätzliche Abfrage pro
  Bild-Aufruf) streichen.
- Schritt 2 (mittel): Alle 29 Backend-Leser der Spalte `anime.cover_image` auf `anime_media`
  umstellen (u. a. `anime.go`, `anime_v2.go`, Watchlist, Fansub-Projekt-Resolver,
  AniSearch-Import, Anime anlegen/löschen); `syncLegacyAnimeCoverImageV2` wird danach überflüssig
  und entfällt.
- Schritt 3 (größer, riskantester Teil): Spalte `anime.cover_image` per Migration entfernen; das
  `cover_image`-Feld im Contract (`shared/contracts/`) prüfen und an den 55 Frontend-Aufrufstellen
  auflösen bzw. auf das V2-Äquivalent umstellen.

**Abhängigkeit:** Nach Phase 176 (sauberer Ausgangszustand). Keine harte Abhängigkeit zu Phase
177-181/183 — rein serverseitiger Lesepfad-Umbau plus Vertragsbereinigung, unabhängig von den
UI-Zusammenführungsphasen.

**Risiko:** Mittel — 29 Backend-Dateien lesen die Legacy-Spalte, aber das sichtbare Verhalten
bleibt unverändert, solange die V2-Migration für jeden einzelnen Anime bereits vollständig ist
(laut 174-Prüfung der Fall); Schritt 3 (Spalten-Löschung) ist der riskanteste Teil und sollte erst
nach vollständiger Verifikation aller 29 Leser in Schritt 2 erfolgen, nicht vorzeitig.

**Aufwandsklasse:** Mittel (3 klar voneinander getrennte, sequenziell abarbeitbare Schritte;
überschaubarer Dateikreis im Vergleich zu den großen Zusammenführungsphasen, auch wenn Schritt 2
viele Einzeldateien berührt).

**Vorbild/Altlast:** Der V2-Bildspeicher (`anime_media` + `media_assets`) ist bereits der
produktiv genutzte Zielzustand und damit das Vorbild. Zu entfernen: Legacy-Zweige in
`anime_assets*.go`, der `hasV2AssetSchema`-Check, die Spalte `anime.cover_image`, sowie
`syncLegacyAnimeCoverImageV2`.

**Rechte-Zuordnung:** Keine Permission-Matrix-Abweichung betrifft diesen Fund — reiner
Bildspeicher-Datenpfad ohne eigene Rechteprüfung.

---

## Phase 183: Status-/Label-Konsolidierung (Fachaufgabe 11, Gruppe 4 + 5)

**Ziel:** Eine kanonische Implementierung je byte-identischer Label-Gruppe ersetzt redundante
Parallel-Implementierungen; zwei tote Code-Pfade werden entfernt. Die drei Label-Gruppen mit
echter Verhaltensabweichung (Gruppe 1 Segment-Typ-Badge → bereits F-02/Phase 176; Gruppe 2
Gruppenmedien-Kategorie-Label; Gruppe 3 Claim-Status-Label) werden hier bewusst **nicht** blind
gemergt (D-04/D-07: unterschiedliche Werte brauchen eine Produktentscheidung, kein stiller Merge) —
sie bleiben als offene Befunde für eine spätere, eigene Entscheidung dokumentiert.

**Umfang:** Gruppe 4 (App-User-Konten-Status-Label, 4 byte-identische Implementierungen in
`AdminUsersClient.tsx`, `UserDetailPageClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`
— die Duplikation ist bereits im Code-Kommentar selbst dokumentiert) und Gruppe 5
(Release-Version-Medien-Review-State-Label: produktiver `statusBadge` in
`ReleaseVersionMediaSection.tsx` vs. toter `reviewLabel` in `ReleaseVersionMediaGallery.tsx`, 0
Importeure außer eigener Testdatei, byte-identisch für alle 4 Werte + Fallback).

**Abhängigkeit:** Keine — niedrigstes Risiko aller Vorschläge, kann unabhängig von Phase 176-182
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
| 1.2 | Gruppenmedien-Upload (zwei parallele Rechte-Ebenen) | Phase 179 (Media-Backend/Rechte) | Die Konsolidierung der Rechte-Ebenen ist der Backend-/Rechte-Teil der F-15-Zusammenführung — wird direkt in Phase 179 gelöst, bevor der Frontend-Baustein (Phase 180) darauf aufsetzt. |
| 1.4 | Anime-Assets-Upload (Anzeige fehlt) | Phase 179 (Media-Backend/Rechte) | Das fehlende granulare Anzeige-Capability-Flag wird beim Backend-/Rechte-Umbau ergänzt — gleicher Arbeitsschritt wie 1.2. |
| 1.6 | Release-Theme-Assets-Upload (fremde Aktion) | Phase 179 (Media-Backend/Rechte) | Die neue eigene `ActionReleaseThemeAssetUpload`-Aktion ist Teil desselben Backend-Konsolidierungsschritts, der auch den duplizierten Persistenz-Codeblock auflöst; Phase 180 übernimmt sie nur noch in der UI. |
| 5.3 | Claim-Invite-Accept ohne `disabled`-Check | Phase 176 (Bugfix-Sammelphase, Paket D) | Nutzer-Reihenfolgewunsch (`175-USER-DECISIONS.md` Punkt 4) benennt diesen Sicherheitsbefund explizit als Bug-Phase-Fall; kein UI-Zusammenführungsschritt involviert, reiner Server-seitiger Ein-Zeilen-Fix analog `AcceptFansubInvitation`. |
| 6.1 | Notizen-Tab-Gate (ODER-Verknüpfung weiter als Durchsetzung) | Phase 176 (Bugfix-Sammelphase, Paket D) | Notizen schreiben (Fachaufgabe 6) ist keiner der Zusammenführungsphasen zugeordnet (kein Duplikat-Cluster auf UI-Ebene) — reiner Rechte-Konsistenz-Fix, gehört laut `175-CONTEXT.md`s Deferred-Abschnitt in die Bugfix-Sammelphase (D-05-Befunde fließen dort ein). |
| 6.2 | Notizen-Button-Ebene (fehlendes `foundingOnly`-Pendant) | Phase 176 (Bugfix-Sammelphase, Paket D) | Gleicher Cluster wie 6.1, gleicher Fix-Zeitpunkt (beide Ebenen des Notizen-Tabs sollten zusammen behoben werden). |
| 6.4 | Member-Group-Story (inkonsistentes Rechte-Modell, totes Feature) | Phase 176 (Bugfix-Sammelphase, Paket A) | Wird durch die in Paket A ohnehin vorgesehene vollständige Entfernung von Member-Group-Story (Nutzer-Entscheidung 1) gegenstandslos — kein separater Rechte-Fix nötig, nur Löschung. |
| 8.4 | Fansub-Mitglied-Löschen Legacy (Orphan-Endpunkt, abweichende Strenge) | Phase 176 (Bugfix-Sammelphase, Paket D) | Reine Dead-Code-Entfernung (0 Frontend-Aufrufer außerhalb von Tests) ohne UI-Zusammenführungsbezug — passt zu den übrigen Aufräumarbeiten in Phase 176 (analog F-19/F-21-24 in Paket E). |

---

## Weitere, kleinere Funde ohne eigene Phase (zur Kenntnis, Einordnung dokumentiert)

- **Fachaufgabe 4, Nebenbefund:** `anime_contributions.review_status_id` (seit Migration 0097)
  ist faktisch tot (wird nur kopiert, nie für Review-Entscheidungen gelesen/geschrieben) — Kandidat
  für eine kleine Aufräum-Aufgabe innerhalb der Phase 176 (Paket E), kein eigener Phasenvorschlag
  nötig.
- **Fachaufgabe 5, Befund 4 (Memorial-Guard doppelt implementiert):** Wortgleicher Fehlercode
  `memorial_not_claimable` in zwei unabhängigen Repositories
  (`member_claims_submit_repository.go:48-69` vs. `member_claim_invitations_repository.go:187-215`)
  — kleiner Merge-Kandidat, passt thematisch zur Phase 176 (gleicher Bereich wie Zeile
  5.3, Paket D), kein eigener Phasenvorschlag nötig.
- **Fachaufgabe 5, #6 `ClaimManagementPanel.tsx`:** Laut Code-Kommentar absichtlich nicht
  gemountete Parallel-Implementierung zu #3 (`135-RESEARCH.md` Open Question 2) — Entscheidung über
  endgültige Entfernung oder Aktivierung bleibt offen, kein eigener Phasenvorschlag in dieser
  Roadmap (zu klein für eine eigene Phase, zu unklar für einen automatischen Bugfix).
- **Fachaufgabe 11, Gruppe 2 + 3 (Verhaltensabweichungen):** Gruppenmedien-Kategorie-Label
  (`old_website`/`irc_chat`-Textabweichungen) und Claim-Status-Label (`'verified'` →
  "Verifiziert" vs. "Genehmigt") sind laut Inventur bewusst **nicht** blind zu mergen — sie
  benötigen eine Produktentscheidung, welcher Text korrekt ist, bevor ein Merge stattfinden kann.
  Empfehlung: Diese Entscheidung sollte vor Phase 183 (Status-/Label-Konsolidierung) getroffen
  werden, damit Phase 183 bei Gelegenheit gleich mit erledigt werden kann — ist aber kein
  Blocker für Phase 183 selbst, da Phase 183 nur die bereits byte-identischen Gruppen 4/5 abdeckt.
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
Nutzerbestätigung (siehe Task 2 und Abschnitt „Nutzer-Bestätigung" unten) in ROADMAP.md
übernommen. Auch die konkrete Nummerierung 176-183 ist Teil des Nutzer-Checkpoint-Ergebnisses,
nicht eine eigenmächtige ROADMAP.md-Phasenanlage durch 175-09 selbst.

---

## Nutzer-Bestätigung

Der Nutzer hat den Phasenzuschnitt am 2026-10-07 am Checkpoint (Task 2 dieses Plans) mit dem
Ergebnis **„approved with changes"** bestätigt — der Zuschnitt wird übernommen, jedoch mit
folgenden sechs verbindlichen Änderungen gegenüber dem ursprünglichen Vorschlag:

1. Phase 0 (Bugfix-Sammelphase) läuft zuerst → wird Phase 176. Risiko wird auf "mittel" gesetzt
   (nicht "gering bis mittel"). Sie wird intern in klar getrennte, voneinander geblockte Pakete
   geplant: Story-Entfernung / Theme-Kürzel OUT / F-05 `anime_contributions` / Rechte- und
   Sicherheitsfixes (5.3, 6.1, 6.2, 8.4) / restliche 174-Bugs.
2. In Phase 176: F-05-Ursache wird im Code behoben; eine Bestandsdaten-Bereinigung erfolgt nur
   nach einem blockierenden Nutzer-Checkpoint (Freigabe). Die Story-Entfernung läuft dagegen ohne
   Checkpoint (0 Datenzeilen betroffen).
3. Der ehemalige Vorschlag 2 (Medien-Upload, F-15) wird in zwei Phasen aufgeteilt: zuerst
   Media-Backend/Rechte (Permission-Matrix 1.2/1.4/1.6, Soft-Delete-Helfer,
   Theme-Asset-Persistenz — Phase 179), danach Upload-Frontend/-Workflow (gemeinsamer
   Upload-Baustein — Phase 180).
4. Release-Bearbeitung (F-13, Phase 181) und Medien-Upload (Phase 179/180) werden NICHT
   parallelisiert, sondern laufen sequenziell.
5. Finale Reihenfolge nach Nutzerwunsch: 176 Bugfix-Sammelphase, 177 Einheitlicher Bild-Viewer
   (F-18), 178 Suchen & Filtern (F-16), 179 Media-Backend/Rechte (F-15 Teil 1), 180
   Upload-Frontend/-Workflow (F-15 Teil 2), 181 Release-Bearbeitung zusammenführen (F-13), 182
   Bildspeicher (F-01, fehlte im ursprünglichen Vorschlag — als eigene Phase ergänzt), 183
   Status-/Label-Konsolidierung.
6. Alle übrigen Inhalte des ursprünglichen Vorschlags werden unverändert übernommen.

**Finale bestätigte Phasenreihenfolge (176-183):**

1. Phase 176 — Bugfix-Sammelphase
2. Phase 177 — Einheitlicher Bild-Viewer (F-18)
3. Phase 178 — Suchen & Filtern vereinheitlichen (F-16)
4. Phase 179 — Media-Backend/Rechte (F-15 Teil 1)
5. Phase 180 — Upload-Frontend/-Workflow (F-15 Teil 2)
6. Phase 181 — Release-Bearbeitung zusammenführen (F-13)
7. Phase 182 — Bildspeicher entfernen (F-01)
8. Phase 183 — Status-/Label-Konsolidierung

Diese Nummerierung und Reihenfolge ist das Ergebnis des Nutzer-Checkpoints dieser Phase (175-09).
Die tatsächliche Anlage der Phasen 176-183 in `.planning/ROADMAP.md` erfolgt NICHT durch diese
Phase (D-09) — sie erfolgt anschließend separat, außerhalb von Phase 175.
