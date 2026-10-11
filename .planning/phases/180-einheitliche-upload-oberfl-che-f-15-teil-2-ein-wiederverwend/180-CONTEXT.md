# Phase 180: Einheitliche Upload-Oberfläche (F-15 Teil 2) — Context

**Stand:** 2026-10-11, alle 5 offenen Fragen beantwortet (D-09 bis D-13) plus 3 Recherche-Weichen
aus `180-RESEARCH.md` beantwortet (D-14 bis D-16). Antwort 5 ist eine bewusste Scope-Erweiterung
gegenüber der ursprünglichen Empfehlung: zusätzlich zur funktionalen Umstellung von Weg 1/2
(D-01–D-03) bekommen alle acht Upload-Wege eine gemeinsame Präsentations-Primitives-Schicht für
ihr Erscheinungsbild (D-13), ohne ihre getrennten Abläufe zusammenzuführen. D-14 ist eine kleine,
additive Backend-Erweiterung (kein neuer Endpunkt, keine Rechteänderung) — die einzige
Abweichung von der ursprünglichen „kein Backend-Touch"-Phasengrenze. D-16 weicht bewusst von der
Recherche-Empfehlung ab: Weg 4 (Anime-Assets) bekommt Drag&Drop als echten Verhaltenszugewinn,
nicht nur Optik.

**Quelle:** `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
(Abschnitt „Phase 180: Upload-Frontend/-Workflow (F-15 Teil 2)" + Übersichtstabelle);
`175-INVENTORY.md` Fachaufgabe 1 „Medien hochladen" (Wege 1–8, 15 UI-Flächen, 12
Frontend-API-Funktionen); Ergebnisse aus Phase 179 (`179-VERIFICATION.md`, `179-CONTEXT.md` D-12/
D-13, neue Aktion `ActionReleaseThemeAssetUpload`); Live-Code-Faktencheck in
`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`,
`ReleaseVersionMediaUploadQueue.tsx`, `useReleaseVersionMedia.ts`, `frontend/src/app/admin/fansubs/
[id]/edit/GroupMediaReviewSection.tsx`, `GroupMediaReviewUploadPanel.tsx`,
`useGroupMediaReviewActions.ts`; `180-RESEARCH.md` (Architektur-Patterns, Pitfalls 1–5, Offene
Fragen 1–3, von D-14 bis D-16 beantwortet).

<domain>
## Phase Boundary

Diese Phase ist der **Frontend-/Workflow-Anteil** der ursprünglich einheitlichen F-15-Vorschlagsphase
„Medien-Upload". Phase 179 hat bereits die Rechte-/Backend-Basis konsolidiert (eine
Capability-Prüfung je Upload-Aktion, gemeinsamer Soft-Delete-Helfer, neue
`ActionReleaseThemeAssetUpload`-Aktion, `isPlatformAdmin`-Anzeigeflag für Anime-Assets). Diese
Phase baut **keinen neuen Rechte-Mechanismus** — sie übernimmt die Phase-179-Basis unverändert.
Eine einzige, enge Ausnahme: D-14 erweitert einen bestehenden Phase-179-Endpunkt additiv um ein
Response-Feld (keine Rechteänderung, kein neuer Endpunkt) — siehe Decisions.

**Umfang laut Zusatzauftrag (2026-10-11, verbindlich für diese Phase — abweichend von
175-ROADMAP-PROPOSAL.md, siehe D-01):**

- Ein wiederverwendbarer Upload-Baustein wird gebaut: Mehrfachauswahl wird **ergänzt** statt
  ersetzt (Merge-Semantik), Titel/Bildunterschrift pro Datei, Retry bei Fehlern — nach Vorbild des
  bestehenden Release-Medien-Uploads.
- **Weg 1 (Release-Medien, `ReleaseVersionMediaSection.tsx` + `uploadReleaseVersionMedia`)** und
  **Weg 2 (Gruppenmedien, `GroupMediaReviewUploadPanel.tsx` + `uploadFansubGroupMedia`)** laufen
  funktional (Auswahl-Merge, Pro-Datei-Felder, Retry, Rechte, Review-Verhalten) über denselben
  Baustein.
- **Scope-Erweiterung (D-13, Nutzerentscheidung 2026-10-11):** Zusätzlich zur funktionalen
  Umstellung von Weg 1/2 bekommen **alle übrigen Upload-Wege (3, 4, 5, 6, 7, 8)** eine gemeinsame
  **Darstellung** aus einer Schicht von Präsentations-Primitives unter
  `frontend/src/components/ui` (Ablagefläche/Dropzone, Datei-Auswahl-Button,
  Pro-Datei-Fortschrittsanzeige, Fehler-/Retry-Zeile). Ihre fachlichen Abläufe (Single-Slot-Replace,
  zweistufiger Upload+PATCH, Self-Service, Rechte aus Phase 179) bleiben dabei unverändert
  getrennt — nur das Erscheinungsbild wird angeglichen, keine Abläufe werden zusammengezwungen.
  Dies ersetzt die ursprünglich vorgesehene reine Konvertierbarkeits-Prüfung ohne Code-Änderung für
  diese sechs Wege.

**Abweichung von 175-ROADMAP-PROPOSAL.md:** Die ursprüngliche Roadmap-Vorlage (Zeilen 244–281)
hatte Weg 6 (Release-Theme-Assets, 2 Einstiege: `ReleaseThemeAssetsSection.tsx` auf Anime-Ebene,
`useReleaseMediaDrawer.ts` auf Release-Ebene) ausdrücklich in den Umbau-Umfang dieser Phase
aufgenommen, aufsetzend auf der in Phase 179 neu geschaffenen `ActionReleaseThemeAssetUpload`.
Der Zusatzauftrag vom 2026-10-11 grenzt den **funktionalen** Umfang enger: nur Weg 1 und Weg 2
werden funktional tatsächlich umgestellt, Weg 6 fällt funktional — wie 3/4/5/7/8 — weiterhin
außerhalb (D-01 bleibt dafür gültig). Die spätere Nutzerentscheidung zu Offener Frage 5 (D-13)
ergänzt davon unabhängig eine **präsentationale** Schicht für alle acht Wege (siehe oben) — das
ändert nichts an der funktionalen Abgrenzung aus D-01, nur das Erscheinungsbild wird über die
gemeinsame Primitives-Schicht angeglichen.

**Explizit außerhalb des Umfangs:** Phase 181 (Release-Bearbeitung zusammenführen, `/me`-Workspace
entfällt) ist **nicht** Teil dieser Phase — läuft laut Roadmap-Vorlage sequenziell nach 180, nicht
parallel. Der hier gebaute Baustein muss aber so gebaut sein, dass Phase 181 ihn unverändert
einsetzen kann (keine Prop-/API-Neugestaltung dort erwartet).

**Risiko:** Hoch — berührt Review-Workflows mehrerer Fachbereiche (Release-Medien unterliegt
keinem Review-Gate, Gruppenmedien löst `review_status=in_pruefung` aus; die Merge-Semantik darf
dieses Verhalten nicht vermischen). Durch D-13 zusätzlich erhöht: die Präsentations-Primitives
werden in alle 15 UI-Flächen der Fachaufgabe-1-Inventur eingezogen, nicht nur in die zu Weg 1/2
gehörenden — jede optische Umstellung an Wegen 3/4/5/6/7/8 muss deren getrennte Abläufe und
Rechte (aus Phase 179) unverändert lassen.

**Aufwandsklasse:** Groß, durch D-13 vergrößert — laut Fachaufgabe-1-Summenzeile sind 15
UI-Flächen und 12 Frontend-API-Funktionen von der Inventur erfasst; diese Phase ändert Weg 1/2
funktional UND alle 15 Flächen präsentational (Primitives-Einsatz statt Eigen-Markup).
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
Weg 1/2), bleibt aber laut D-01 ebenfalls außerhalb des tatsächlichen **funktionalen**
Umbau-Umfangs dieser Phase. Laut D-13 (Nutzerentscheidung 2026-10-11) bekommen diese sechs Wege
zusätzlich die **Darstellung** der neuen Präsentations-Primitives — ihre hier beschriebene
fachliche Trennung (Abläufe, Rechte) bleibt davon unberührt.

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
- **D-09:** Drag&Drop wird in den gemeinsamen Baustein übernommen (Nutzer 2026-10-11, beantwortet
  Offene Frage 1, Option A) — der Baustein unterstützt sowohl Ablegen (Drag&Drop) als auch
  Klick-Auswahl; eine Implementierung statt der bisher zwei getrennten Dropzone-Implementierungen
  in Weg 1 und Weg 2.
- **D-10:** Upload startet erst per Klick auf „Upload starten" (Nutzer 2026-10-11, beantwortet
  Offene Frage 2, Option A) — kein Sofort-Upload bei Dateiauswahl; die Verzögerung erlaubt es,
  vorher Titel/Bildunterschrift pro Datei einzutragen. Entspricht dem Status quo beider migrierten
  Wege, kein Verhaltensbruch.
- **D-11:** Keine Pflichtfelder pro Datei (Nutzer 2026-10-11, beantwortet Offene Frage 3, Option A)
  — Titel/Bildunterschrift bleiben freiwillig, genau wie heute bei Weg 1; Weg 2 bekommt durch die
  Migration neue, aber ebenfalls freiwillige Pro-Datei-Felder.
- **D-12:** Einzel-Retry pro Datei bei Teil-Fehlschlag für beide migrierten Wege (Nutzer
  2026-10-11, beantwortet Offene Frage 4, Option A) — jede Datei bekommt einen eigenen Status;
  erfolgreiche Dateien bleiben erfolgreich, fehlgeschlagene zeigen eine Fehlermeldung plus
  „Erneut versuchen"-Button. Gilt ausdrücklich auch für Gruppenmedien (Weg 2) und ersetzt dort die
  bisherige zusammengefasste Sammel-Fehlermeldung ohne Einzel-Retry
  (`useGroupMediaReviewActions.ts:171-173`).
- **D-13 (Scope-Erweiterung, abweichend von der ursprünglichen Empfehlung):** Optische
  Vereinheitlichung ALLER acht Upload-Wege über eine gemeinsame Präsentations-Primitives-Schicht
  (Nutzer 2026-10-11, beantwortet Offene Frage 5) — zwei Schichten:
  (a) Gemeinsame Präsentations-Primitives unter `frontend/src/components/ui` (Namen nach
  bestehender Konvention, in `/dev/ui-system` gezeigt): Ablagefläche/Dropzone inkl.
  Klick-Auswahl, Datei-Auswahl-Button, Pro-Datei-Fortschrittsanzeige, Fehler-/
  Erneut-versuchen-Zeile.
  (b) Alle acht Upload-Wege — inklusive der laut Inventur legitim getrennten Wege 3
  (Fansub-Logo/Banner), 4 (Anime-Assets), 5 (Segment-Assets), 6 (Theme-Assets), 7
  (Profil-Avatar/-Hintergrund), 8 (Medien-Vorschläge) — nutzen diese Primitives für ihr
  Erscheinungsbild. Ihre fachlichen Abläufe (Single-Slot-Replace, zweistufiger Upload+PATCH,
  Self-Service, Rechte aus Phase 179) bleiben unverändert getrennt — nur die Darstellung wird
  angeglichen, keine Abläufe werden zusammengezwungen. Begründung des Nutzers: Es gibt keine
  spätere Phase, die dies nachholen würde; unterschiedliche Upload-Oberflächen nebeneinander
  widersprechen der Pflicht-Regel „globales UI-System" (CLAUDE.md). D-01 bleibt für die
  **funktionale** Abgrenzung (nur Weg 1/2) unverändert gültig — D-13 gilt zusätzlich und nur für
  die **präsentationale** Schicht (alle acht Wege). Dateien über 450 Zeilen, die beim
  Primitives-Einsatz angefasst werden, werden aufgeteilt (D-06 gilt unverändert). **Ausnahme:**
  D-16 erlaubt für Weg 4 explizit einen echten Verhaltenszugewinn (Drag&Drop), siehe unten — dort
  ist „nur Darstellung" bewusst durchbrochen.
- **D-14 (Recherche-Weiche 1, additive Backend-Erweiterung):** Der bestehende
  Gruppenmedien-Upload-Endpunkt (`fansub_media_upload.go`, Phase 179) gibt je hochgeladener Datei
  zusätzlich die Beziehungs-ID `fansub_group_media_id` zurück (Nutzer 2026-10-11, beantwortet
  Recherche-Offene-Frage 1 aus `180-RESEARCH.md`, Option A) — analog zur bestehenden
  `release_version_media_id`-Konvention bei Weg 1 (`admin_content_release_version_media_upload.go:33`).
  Kein neuer Endpunkt, keine Rechteänderung — nur ein zusätzliches Response-Feld am bereits in
  Phase 179 behandelten Endpunkt. Ermöglicht den Weg-1-Patch-Nachlauf-Mechanismus
  (Pro-Datei-Titel/Caption nachreichen, Einzel-Retry per Item laut D-12) 1:1 auf Weg 2 zu
  übertragen, statt eines fragilen `sort_order`-basierten Zuordnungs-Workarounds (explizit
  abgelehnt). Frontend-Contract/-Typen (`fansubGroupMediaFileResult`-Äquivalent in
  `frontend/src/lib/api`) werden entsprechend nachgezogen; ein Verhaltenstest
  (`httptest` gegen Fake-Repository, Teststil-Regel D-05) bestätigt das neue Feld im
  Response-Body.
- **D-15 (Recherche-Weiche 2, tote Datei):** `ReleaseVersionMediaGallery.tsx` (383 Zeilen,
  nirgendwo importiert, siehe `180-RESEARCH.md` Pitfall 3) wird im Zuge des 450-Zeilen-Splits
  geprüft und explizit entschieden (Nutzer 2026-10-11, beantwortet Recherche-Offene-Frage 2,
  Option A) — der Planer/Executor liest die Datei inhaltlich gegen das aktuelle
  Story-Item-/Kara-Segment-Datenmodell, entscheidet dann zwischen Reaktivierung (falls kompatibel)
  oder Löschung (falls veraltet/inkompatibel), und begründet die Entscheidung im Plan bzw. in der
  Umsetzung. Keine tote Datei bleibt nach dieser Phase ungeklärt stehen.
- **D-16 (Recherche-Weiche 3, abweichend von der Recherche-Empfehlung):** Weg 4 (Anime-Assets:
  Cover/Banner/Logo/Hintergrund; Segment-Vorschau analog) bekommt Drag&Drop über dieselbe
  gemeinsame Ablagefläche wie alle anderen Wege (Nutzer 2026-10-11, beantwortet
  Recherche-Offene-Frage 3, Option B — abweichend von der Recherche-Empfehlung „Klick-only,
  `allowDrop: false`") — Begründung des Nutzers: Jede Ablagefläche soll sich überall gleich
  verhalten. Der fachliche Ablauf bleibt unverändert Single-Slot-Replace, die Sichtbarkeit bleibt
  exakt an Plattform-Admin gebunden (Phase 179 D-13, `isPlatformAdmin`-Flag unverändert). Werden
  beim Ablegen mehrere Dateien auf einen Single-Slot fallen gelassen, wird nur die erste
  übernommen, mit einem erkennbaren Hinweis an den Nutzer (echte Umlaute, z. B. „Nur die erste
  Datei wurde übernommen — dieser Platz erlaubt nur ein Bild."). Dies ist die einzige bewusste
  Durchbrechung von D-13s „nur Darstellung, keine Abläufe"-Grundsatz.
</decisions>

<open_questions>
## Offene Fragen an den Nutzer — beantwortet

Alle fünf offenen Fragen wurden am 2026-10-11 vom Nutzer entschieden; die Entscheidungen sind oben
als D-09 bis D-13 festgehalten. Keine offenen Fragen mehr ausstehend.

1. ~~**Drag&Drop im gemeinsamen Baustein — übernehmen oder weglassen?**~~ → beantwortet mit
   Option A, siehe D-09. Fakt war: Beide bestehenden Wege (1 und 2) haben heute je eine eigene
   Dropzone-Implementierung (`onDrop`-Handler mit eigenem Hover-State); ein Wegfall wäre für beide
   Wege ein Feature-Verlust gewesen.

2. ~~**Upload sofort nach Auswahl oder erst nach explizitem „Hochladen"-Klick?**~~ → beantwortet
   mit Option A, siehe D-10. Fakt war: Beide bestehenden Wege lösen den eigentlichen
   Netzwerk-Request heute erst nach einem expliziten Button-Klick aus (Weg 1: „Upload starten" im
   Drawer-Footer, Weg 2: „Bilder hochladen"-Button) — kein automatischer Upload direkt bei
   Dateiauswahl.

3. ~~**Pflichtfelder pro Datei — Titel/Caption optional oder Pflicht?**~~ → beantwortet mit
   Option A, siehe D-11. Fakt war: Weg 1 hat Titel/Caption heute als optionale Felder (Platzhalter
   „Optionaler Bildtitel"); Weg 2 hat aktuell gar keine Pro-Datei-Felder (nur eine Kategorie für den
   ganzen Batch).

4. ~~**Verhalten bei teilweisem Fehlschlag (n von m Dateien schlagen fehl)?**~~ → beantwortet mit
   Option A, siehe D-12. Fakt war: Weg 1 unterstützt bereits Einzel-Retry pro Datei
   (`retryUpload(fileIndex)`); Weg 2 sendet einen Batch-Request mit zusammengefasster
   Fehlermeldung ohne Unterscheidung erfolgreich/fehlgeschlagen und ohne Einzel-Retry.

5. ~~**Sollen die bewusst getrennt bleibenden Wege (3, 4, 5, 6, 7, 8) optisch denselben
   Auswahl-/Fortschritts-Look bekommen wie der neue gemeinsame Baustein?**~~ → beantwortet
   **abweichend von der ursprünglichen Empfehlung** mit einer erweiterten Option B, siehe D-13:
   alle acht Upload-Wege nutzen künftig eine gemeinsame Präsentations-Primitives-Schicht für ihr
   Erscheinungsbild, ihre fachlichen Abläufe bleiben getrennt. Begründung des Nutzers: Es gibt
   keine spätere Phase, die dies nachholen würde; unterschiedliche Upload-Oberflächen nebeneinander
   widersprechen der Pflicht-Regel „globales UI-System" (CLAUDE.md).
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
- `.planning/phases/180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend/180-RESEARCH.md`
  — Architektur-Patterns (Hook/Primitive-Trennung), Pitfalls 1–5, Code-Beispiele, Offene Fragen
  1–3 (beantwortet als D-14 bis D-16).
</references>
