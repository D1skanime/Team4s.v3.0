# Phase 180: Einheitliche Upload-Oberfläche (F-15 Teil 2) — Context

**Stand:** 2026-10-11, Entwurf — 5 offene Fragen an den Nutzer, noch nicht beantwortet.
**Quelle:** `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
(Abschnitt „Phase 180: Upload-Frontend/-Workflow (F-15 Teil 2)" + Übersichtstabelle);
`175-INVENTORY.md` Fachaufgabe 1 „Medien hochladen" (Wege 1–8, 15 UI-Flächen, 12
Frontend-API-Funktionen); Ergebnisse aus Phase 179 (`179-VERIFICATION.md`, `179-CONTEXT.md` D-12/
D-13, neue Aktion `ActionReleaseThemeAssetUpload`); Live-Code-Faktencheck in
`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`,
`ReleaseVersionMediaUploadQueue.tsx`, `useReleaseVersionMedia.ts`, `frontend/src/app/admin/fansubs/
[id]/edit/GroupMediaReviewSection.tsx`, `GroupMediaReviewUploadPanel.tsx`,
`useGroupMediaReviewActions.ts`.

<domain>
## Phase Boundary

Diese Phase ist der **Frontend-/Workflow-Anteil** der ursprünglich einheitlichen F-15-Vorschlagsphase
„Medien-Upload". Phase 179 hat bereits die Rechte-/Backend-Basis konsolidiert (eine
Capability-Prüfung je Upload-Aktion, gemeinsamer Soft-Delete-Helfer, neue
`ActionReleaseThemeAssetUpload`-Aktion, `isPlatformAdmin`-Anzeigeflag für Anime-Assets). Diese
Phase baut **keinen neuen Rechte-Mechanismus** — sie übernimmt die Phase-179-Basis unverändert.

**Umfang laut Zusatzauftrag (2026-10-11, verbindlich für diese Phase — abweichend von
175-ROADMAP-PROPOSAL.md, siehe D-01):**

- Ein wiederverwendbarer Upload-Baustein wird gebaut: Mehrfachauswahl wird **ergänzt** statt
  ersetzt (Merge-Semantik), Titel/Bildunterschrift pro Datei, Retry bei Fehlern — nach Vorbild des
  bestehenden Release-Medien-Uploads.
- **Weg 1 (Release-Medien, `ReleaseVersionMediaSection.tsx` + `uploadReleaseVersionMedia`)** und
  **Weg 2 (Gruppenmedien, `GroupMediaReviewUploadPanel.tsx` + `uploadFansubGroupMedia`)** laufen
  über denselben Baustein.
- **Alle übrigen Upload-Wege (3, 4, 5, 6, 7, 8) werden in dieser Phase NICHT umgebaut** — nur auf
  Konvertierbarkeit auf den gemeinsamen Baustein geprüft (Dokumentation, keine Code-Änderung).

**Abweichung von 175-ROADMAP-PROPOSAL.md:** Die ursprüngliche Roadmap-Vorlage (Zeilen 244–281)
hatte Weg 6 (Release-Theme-Assets, 2 Einstiege: `ReleaseThemeAssetsSection.tsx` auf Anime-Ebene,
`useReleaseMediaDrawer.ts` auf Release-Ebene) ausdrücklich in den Umbau-Umfang dieser Phase
aufgenommen, aufsetzend auf der in Phase 179 neu geschaffenen `ActionReleaseThemeAssetUpload`.
Der Zusatzauftrag vom 2026-10-11 grenzt den Umfang enger: nur Weg 1 und Weg 2 werden tatsächlich
umgestellt, Weg 6 fällt — wie 3/4/5/7/8 — unter „nur Konvertierbarkeit prüfen". Diese Lücke ist
hier als **D-01** festgehalten, nicht als offene Frage, weil der Zusatzauftrag den engeren Umfang
bereits explizit vorgibt.

**Explizit außerhalb des Umfangs:** Phase 181 (Release-Bearbeitung zusammenführen, `/me`-Workspace
entfällt) ist **nicht** Teil dieser Phase — läuft laut Roadmap-Vorlage sequenziell nach 180, nicht
parallel. Der hier gebaute Baustein muss aber so gebaut sein, dass Phase 181 ihn unverändert
einsetzen kann (keine Prop-/API-Neugestaltung dort erwartet).

**Risiko:** Hoch — berührt Review-Workflows mehrerer Fachbereiche (Release-Medien unterliegt
keinem Review-Gate, Gruppenmedien löst `review_status=in_pruefung` aus; die Merge-Semantik darf
dieses Verhalten nicht vermischen).

**Aufwandsklasse:** Groß (laut Fachaufgabe-1-Summenzeile sind 15 UI-Flächen und 12
Frontend-API-Funktionen von der Inventur erfasst; diese Phase ändert davon nur die zu Weg 1/2
gehörenden Flächen, prüft aber den Rest auf Konvertierbarkeit).
</domain>

<facts>
## Ist-Aufnahme: Upload-Flächen heute (Fachaufgabe 1, 175-INVENTORY.md + Live-Code-Faktencheck)

| # | Weg | Datei + Route | Mehrfachauswahl | Merge vs. Replace | Pro-Datei-Titel/Caption | Upload-Trigger | Retry bei Fehler | Drag&Drop | Dateityp-/Größenprüfung | Review-Status-Anzeige |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Release-Medien (**Vorbild**) | `ReleaseVersionMediaSection.tsx` + `ReleaseVersionMediaUploadQueue.tsx`, `/admin/episode-versions/[versionId]/edit` | Ja | **Merge** — neue Auswahl wird in die Queue gemergt (`:243-251`, dedupliziert über `fileKey`) | Ja — `Input`/`Textarea` pro Datei in der Queue, optional (Platzhalter „Optionaler Bildtitel") | Explizites „Upload starten"-Button im Drawer-Footer (`handleUploadClick`, `:320-331`) | Ja — pro Datei über `UploadQueueItem.status==='failed'` + „Erneut versuchen"-Button, ruft `retryUpload(fileIndex)` einzeln auf | Ja — eigene Dropzone (`onDrop`, `:283-306`) | Nur `accept="image/*"` (Browser-Filter), keine explizite Größenprüfung im Code gefunden | Kein Review-Gate — keine Anzeige nötig |
| 2 | Gruppenmedien (**Altlast**) | `GroupMediaReviewSection.tsx` + `GroupMediaReviewUploadPanel.tsx`, `/admin/fansubs/[id]/edit` | Ja | **Replace** — `handleSelectedFiles` ruft `setSelectedFiles(files.filter(...))` und ersetzt die gesamte Auswahl (`GroupMediaReviewSection.tsx:340-342`) | Nein — eine Kategorie (`Select`) für den gesamten Batch, keine Pro-Datei-Felder | Explizites „Bilder hochladen"-Button (`handleUpload`, `useGroupMediaReviewActions.ts:158-186`) | **Nein** — ein Batch-Request (`uploadFansubGroupMedia`), fehlgeschlagene Dateien werden als zusammengefasste Fehlermeldung angezeigt (`:171-173`); kein Einzel-Retry, `resetUploadForm()` wird bei Teil-Fehlschlag **nicht** aufgerufen (Auswahl bleibt unverändert stehen, keine Unterscheidung erfolgreich/fehlgeschlagen in der UI) | Ja — eigene Dropzone (`onDragEnter`/`onDrop`, `GroupMediaReviewUploadPanel.tsx:87-95`) | `accept="image/png,image/jpeg,image/webp,image/gif"` + JS-Filter `file.type.startsWith('image/')`, keine explizite Größenprüfung gefunden | Ja — hochgeladene Medien laufen mit `review_status=in_pruefung` in die Haupt-Review-Liste derselben Seite ein |
| 3 | Fansub-Logo/Banner | `MediaUpload.tsx`, Teil der Gruppenbearbeitung | — | Single-Slot-Replace mit Cleanup des alten Assets | n/a (ein Slot) | n/a | n/a | — (nicht geprüft, außerhalb Scope) | — | Kein Review-Gate |
| 4 | Anime-Assets (Cover/Banner/Logo/Hintergrund) | `AnimeJellyfinAssetUploadControls.tsx` u. a., `/admin/anime/[id]/edit` | Teilweise (mehrere Slots, je Slot ein Upload) | Zweistufig: Upload → separate PATCH-Zuweisung | n/a | n/a | n/a | — (nicht geprüft) | — | Kein Review-Gate |
| 5 | Segment-Assets (Kara-Video) | `SegmenteTab.tsx` + `useSegmentAssetHandlers.ts` | Nein (1 Video pro Segment) | Replace (ersetzt Source-Feld direkt) | n/a | n/a | n/a | — (nicht geprüft) | — | Kein Review-Gate |
| 6 | Release-Theme-Assets (2 Einstiege) | `ReleaseThemeAssetsSection.tsx` (Anime-Ebene), `useReleaseMediaDrawer.ts` (Release-Ebene) | Ja | — (nicht im Detail geprüft, außerhalb Scope dieser Phase) | — | — | — | — | — | Kein Review-Gate |
| 7 | Profil-Avatar/-Hintergrund/-Story | `me/profile/page.tsx` | Nein (Single-Slot je Feld) | Replace | n/a | n/a | Avatar/Hintergrund ohne Progress, Story mit Progress — keine Retry-Logik bekannt | — (nicht geprüft) | — | Kein Review-Gate |
| 8 | Medien-Vorschläge (Member-Report) | `ReportFormMedia.tsx` | — (nicht im Detail geprüft) | — | — | — | — | — | — | Fließt in eigenen Vorschlags-Workflow |

**Bewusst getrennt laut Inventur (D-04-Klassifikation „legitim getrennt"), nicht Teil des
Umbaus, nur Konvertierbarkeits-Prüfung:** Weg 3 (Single-Slot-Replace mit Asset-Cleanup — anderes
Interaktionsmuster als eine Mehrfachauswahl-Galerie), Weg 4 (zweistufiger Upload+PATCH-Flow,
granulare Slot-Zuweisung nach dem Upload), Weg 5 (Video statt Bild, ersetzt ein Source-Feld ohne
Galerie-Charakter), Weg 7 (Self-Service ohne Capability-Prüfung, drei unterschiedliche Felder ohne
einheitlichen Flow), Weg 8 (fließt in einen Vorschlags-/Review-Workflow, kein direktes
Asset-Objekt). Weg 6 ist laut Roadmap-Vorlage fachlich am nächsten am Umbau (Galerie-Charakter wie
Weg 1/2), bleibt aber laut D-01 ebenfalls außerhalb des tatsächlichen Umbau-Umfangs dieser Phase.

**Vorbestehende 450-Zeilen-Überschreitungen (Fakt, nicht Teil dieser Phase als Fehler, aber
relevant für die Umsetzung):** `ReleaseVersionMediaSection.tsx` (826 Zeilen),
`GroupMediaReviewSection.tsx` (632 Zeilen), `useReleaseVersionMedia.ts` (553 Zeilen) überschreiten
das CLAUDE.md-Limit bereits heute. Die Merge-/Retry-/Validierungslogik liegt aktuell **inline**
in diesen großen Dateien, nicht als eigenständige, pur testbare Funktionen — der gemeinsame
Baustein muss diese Logik beim Extrahieren so weit entkoppeln, dass D-05 (Teststil) erfüllbar ist,
ohne die bestehenden Dateien weiter aufzublähen.

## Phase-179-Ergebnisse, auf denen diese Phase aufsetzt

- `ActionReleaseThemeAssetUpload` existiert bereits als eigene Capability-Aktion (ersetzt die
  vormals fremd genutzte `ActionReleaseVersionMediaUpload` bei Weg 6) — verifiziert in
  `179-VERIFICATION.md` Punkt 2/3. Relevant, falls eine spätere Phase Weg 6 doch noch auf den
  Baustein umstellt; für diese Phase nicht weiter genutzt (D-01-Scope).
- `isPlatformAdmin`-Anzeigeflag für `AnimeJellyfinAssetUploadControls.tsx` (D-13 aus
  `179-CONTEXT.md`) ist bereits umgesetzt und verifiziert (`179-VERIFICATION.md` Punkt 10) — Weg 4
  bleibt dennoch laut D-01/D-03 dieser Phase strukturell unangetastet, nur zur Kenntnis.
- Gemeinsamer Soft-Delete-Helfer (`media_soft_delete.go`, `execSoftDelete`) ist bereits
  umgesetzt — betrifft nur Backend-Löschpfade, keine direkte Abhängigkeit für den
  Frontend-Upload-Baustein dieser Phase.
</facts>

<decisions>
## Implementation Decisions

- **D-01:** Umfang enger als 175-ROADMAP-PROPOSAL.md (Nutzer-Zusatzauftrag 2026-10-11) — nur Weg 1
  (Release-Medien) und Weg 2 (Gruppenmedien) werden auf den gemeinsamen Upload-Baustein
  umgestellt. Weg 6 (Release-Theme-Assets), obwohl in der Roadmap-Vorlage ursprünglich für diese
  Phase vorgesehen und obwohl Phase 179 dafür bereits die passende `ActionReleaseThemeAssetUpload`
  geschaffen hat, bleibt wie 3/4/5/7/8 außerhalb des Umbau-Umfangs — nur Konvertierbarkeits-Prüfung
  (Dokumentation), keine Code-Änderung an Weg 6 in dieser Phase.
- **D-02 (Nutzerregel, verbindlich):** „Globalen Uploader wiederverwenden" — kein neuer Uploader
  und kein neuer Upload-Endpunkt wird gebaut. Vorbild ist der bestehende
  Release-Medien-Upload (`ReleaseVersionMediaSection.tsx` + `ReleaseVersionMediaUploadQueue.tsx` +
  `uploadReleaseVersionMedia`). Der gemeinsame Baustein entsteht als Primitive unter
  `frontend/src/components/ui` (bzw. dort, wo der bestehende Uploader liegt) und nutzt die
  globalen Primitives/Tokens (`Button`, `Input`, `Textarea`, `FormField` u. a.) statt
  Eigen-Markup.
- **D-03 (Nutzerregel, verbindlich):** Keine doppelten Oberflächen — die durch den gemeinsamen
  Baustein abgelöste Upload-Logik wird vollständig entfernt, insbesondere
  `GroupMediaReviewUploadPanel.tsx`s Replace-statt-Merge-Logik
  (`GroupMediaReviewSection.tsx:340-342`, `setSelectedFiles(files.filter(...))` ersetzt statt
  ergänzt die Auswahl) und die batch-weite Fehlerbehandlung ohne Einzel-Retry
  (`useGroupMediaReviewActions.ts:158-186`). Kein Nebeneinander von altem und neuem Code nach
  Migration.
- **D-04 (Projektregel):** Deutscher UI-Text verwendet durchgängig echte Umlaute (ä, ö, ü, Ä, Ö,
  Ü, ß) — keine ASCII-Ersetzungen in user-facing Strings (Button-Labels, Platzhalter,
  Fehlermeldungen, aria-labels).
- **D-05 (Teststil-Regel, aus CLAUDE.md):** Tests prüfen die Logik hinter dem Button — Auswahl-
  Merge, Retry-Zustände und Validierung werden als reine, testbare Funktionen extrahiert und
  direkt getestet (keine Quelltext-Grep-Tests). UI-Verhalten (Drag&Drop, Drawer-Öffnen,
  visuelles Feedback) wird per Live-UAT geprüft, nicht durch Simulation in Unit-Tests
  nachgestellt.
- **D-06 (Projektregel):** 450-Zeilen-Limit pro Produktionscode-Datei gilt für den neuen
  Upload-Baustein und alle dabei neu entstehenden Dateien. Bereits bestehende Überschreitungen
  (`ReleaseVersionMediaSection.tsx`, `GroupMediaReviewSection.tsx`, `useReleaseVersionMedia.ts`,
  siehe Ist-Aufnahme) werden durch diese Phase nicht automatisch behoben, aber jede Datei, die im
  Zuge der Migration bearbeitet wird, darf nicht über das Limit hinaus weiter wachsen — bei Bedarf
  wird aufgeteilt.
- **D-07 (Projektregel):** Ein Commit je fachlich abgeschlossener Änderung auf `main`; kein
  `git stash` bei offenen Änderungen; nicht pushen — Arbeit bleibt lokal auf `main`, bis der Nutzer
  explizit das Pushen anfragt.
- **D-08 (Phasengrenze):** Phase 181 (Release-Bearbeitung zusammenführen, `/me`-Workspace entfällt)
  ist nicht Teil dieser Phase. Der gemeinsame Upload-Baustein muss aber so entworfen sein
  (Props/API), dass Phase 181 ihn unverändert in die zusammengeführte Release-Bearbeitungsseite
  einsetzen kann, ohne eine erneute Schnittstellen-Überarbeitung zu erfordern.
</decisions>

<open_questions>
## Offene Fragen an den Nutzer

1. **Drag&Drop im gemeinsamen Baustein — übernehmen oder weglassen?**
   Fakt: Beide bestehenden Wege (1 und 2) haben heute je eine eigene Dropzone-Implementierung
   (`onDrop`-Handler mit eigenem Hover-State). Ein Wegfall wäre für beide Wege ein
   Feature-Verlust.
   - **Option A:** Drag&Drop wird in den gemeinsamen Baustein übernommen (eine Implementierung
     statt zwei).
   - **Option B:** Drag&Drop entfällt im ersten Schritt, nur Datei-Dialog bleibt — geringerer
     Umsetzungsaufwand, aber Rückschritt für beide migrierten Wege.
   - **Empfehlung:** Option A — beide Vorbilder haben es bereits, Vereinheitlichung heißt hier
     „einmal richtig bauen", nicht „Feature entfernen".

2. **Upload sofort nach Auswahl oder erst nach explizitem „Hochladen"-Klick?**
   Fakt: Beide bestehenden Wege lösen den eigentlichen Netzwerk-Request heute erst nach einem
   expliziten Button-Klick aus (Weg 1: „Upload starten" im Drawer-Footer, Weg 2: „Bilder
   hochladen"-Button) — kein automatischer Upload direkt bei Dateiauswahl.
   - **Option A:** Explizites Klick-Modell übernehmen (Status quo beider Wege, kein Verhaltensbruch).
   - **Option B:** Auf Sofort-Upload bei Auswahl umstellen (modernerer Pattern, aber Verhaltensänderung
     für beide bestehenden Wege und mehr State-Management für Teil-Rückgängig/Abbrechen).
   - **Empfehlung:** Option A — beide Vorbilder stimmen bereits überein, kein Grund für einen
     Verhaltensbruch in dieser Phase.

3. **Pflichtfelder pro Datei — Titel/Caption optional oder Pflicht?**
   Fakt: Weg 1 hat Titel/Caption heute als optionale Felder (Platzhalter „Optionaler Bildtitel").
   Weg 2 hat aktuell gar keine Pro-Datei-Felder (nur eine Kategorie für den ganzen Batch) — die
   Migration führt also für Weg 2 neue Felder ein, die vorher nicht existierten.
   - **Option A:** Optional bleibt optional (Status quo Weg 1, keine neue Zwangs-Eingabe für die
     Weg-2-Migration).
   - **Option B:** Titel wird Pflicht (z. B. für bessere Durchsuchbarkeit/Barrierefreiheit), was für
     Weg 1 ein neuer Zwang und für Weg 2 eine zusätzliche Hürde beim ersten Einsatz wäre.
   - **Empfehlung:** Option A — Verhaltenserhalt für Weg 1, keine neue Eingabehürde für Weg 2 beim
     ersten Einsatz des gemeinsamen Bausteins.

4. **Verhalten bei teilweisem Fehlschlag (n von m Dateien schlagen fehl)?**
   Fakt: Weg 1 unterstützt bereits Einzel-Retry pro Datei (`retryUpload(fileIndex)`, Button
   „Erneut versuchen" nur bei der fehlgeschlagenen Datei). Weg 2 sendet einen Batch-Request,
   zeigt bei Teil-Fehlschlag nur eine zusammengefasste Fehlermeldung ohne Unterscheidung
   erfolgreich/fehlgeschlagen und ohne Einzel-Retry — die Auswahl bleibt unverändert stehen,
   ein erneuter Klick auf „Hochladen" würde alle Dateien (auch die bereits erfolgreichen) erneut
   senden.
   - **Option A:** Weg-1-Verhalten übernehmen — jede Datei bekommt einen eigenen Status
     (hochgeladen/fehlgeschlagen/wartend) und einen eigenen Retry-Button; nur fehlgeschlagene
     Dateien werden bei Retry erneut gesendet.
   - **Option B:** Vereinfachtes Verhalten für beide Wege — bei jedem Fehlschlag wird der komplette
     Batch erneut gesendet (Status quo Weg 2, weniger Implementierungsaufwand, aber doppelte
     Uploads bei Teil-Erfolg).
   - **Empfehlung:** Option A — das ist der fachliche Kern der Aufgabe („Retry bei Fehlern" laut
     Auftrag) und bereits in Weg 1 bewährt; Option B würde eine bekannte Schwäche von Weg 2 in den
     gemeinsamen Baustein übernehmen statt sie zu beheben.

5. **Sollen die bewusst getrennt bleibenden Wege (3, 4, 5, 6, 7, 8) optisch denselben
   Auswahl-/Fortschritts-Look bekommen wie der neue gemeinsame Baustein?**
   Fakt: Diese Phase prüft laut Auftrag nur die Konvertierbarkeit dieser Wege, baut sie aber nicht
   um. Eine rein visuelle Angleichung (ohne Struktur-/Rechte-Änderung) wäre separat möglich.
   - **Option A:** Keine visuelle Angleichung in dieser Phase — reine Konvertierbarkeits-Prüfung
     als Dokumentation, keine Code-Änderung an diesen sechs Wegen.
   - **Option B:** Die Wege, die strukturell am nächsten am gemeinsamen Baustein liegen (v. a.
     Weg 6, laut Inventur „fachlich am nächsten"), bekommen in dieser Phase schon den visuellen
     Look des Bausteins, auch ohne volle funktionale Migration.
   - **Empfehlung:** Option A — der Auftrag grenzt den Umbau-Umfang explizit auf Weg 1/2 ein
     (siehe D-01); eine Teil-Angleichung von Weg 6 würde diese Grenze wieder aufweichen und sollte,
     falls gewünscht, eine bewusste eigene Entscheidung sein statt ein Nebeneffekt dieser Phase.
</open_questions>

<references>
## Referenzen

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
  — Abschnitt „Phase 180: Upload-Frontend/-Workflow (F-15 Teil 2)" (Zeilen 244–281).
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
  — Fachaufgabe 1 „Medien hochladen" (Zeilen 12–33), Wege 1–8, Summenzeile (15 UI-Flächen, 12
  Frontend-API-Funktionen, 11 Backend-Upload-Handler).
- `.planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/179-VERIFICATION.md`
  — Punkte 2/3 (`ActionReleaseThemeAssetUpload`), Punkt 10 (`isPlatformAdmin`-Flag), Punkt 9
  (Soft-Delete-Helfer).
- `.planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/179-CONTEXT.md`
  — D-12 (Theme-Asset-Rollenliste), D-13 (Anime-Asset-Anzeigeflag).
- Live-Code: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`,
  `ReleaseVersionMediaUploadQueue.tsx`, `useReleaseVersionMedia.ts`;
  `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`,
  `GroupMediaReviewUploadPanel.tsx`, `useGroupMediaReviewActions.ts`.
</references>
