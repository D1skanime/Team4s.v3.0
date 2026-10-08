# Phase 177: Einheitlicher Bild-Viewer (F-18) — Context

**Stand:** 2026-10-08, Entwurf.
**Quelle:** `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
(Abschnitt „Phase 177: Einheitlicher Bild-Viewer (F-18)" + Übersichtstabelle + Abschnitt
„Nutzer-Bestätigung"); `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
Fachaufgabe 2 „Bild ansehen"; Sketch `.planning/sketches/010-galerie-detailansicht` (nur gelesen).

<domain>
## Phase Boundary

Ein gemeinsamer Viewer-Baustein auf Basis von `FansubMediaLightbox.tsx` (bereits mehrfach
wiederverwendet, Modal-basiert, Wrap-around-Tastaturnavigation) ersetzt die sechs eigenständigen
Viewer-Implementierungen aus Fachaufgabe 2. Der Baustein wird um die laut Inventur bei KEINER der
sechs vorhandenen Merkmale erweitert — Zoom, Touch-Swipe, Display→Original-Progressive-Load —
sowie um Metadaten-Overlay und Prefetch aus den reichhaltigsten bestehenden Implementierungen.

**Umfang (Fachaufgabe 2, `175-INVENTORY.md`):**
- `ScreenshotGallery.tsx` (#3) — eigenständige, selbstgebaute Lightbox; UI-System-Verstoß durch
  rohes `<img>`/`<button>`; zusätzlich ein CLAUDE.md-Konventionsverstoß: direkter `fetch()` statt
  `lib/api.ts`. **Wird abgelöst.**
- `ProjectMemberMediaViewer.tsx` (#4) — reichhaltigste Metadaten-Sidebar + Bild-Prefetch im
  gesamten Cluster. Diese zwei Fähigkeiten werden **vor** der Entfernung in den gemeinsamen
  Baustein übernommen, dann wird die Komponente vollständig entfernt.
- `GroupAssetsExperience.tsx` (#5) — nur der Bild-Lightbox-Anteil wird abgelöst; der Video-Pfad
  über `VideoPlayerModal` bleibt unberührt und legitim getrennt (kein Bild, andere Fachaufgabe).
- `ReleaseVersionMediaDetailPanel.tsx` (#7) — toter Code, 0 Importeure außer eigener Datei, sofort
  und unabhängig vom Rest der Phase löschbar.

**Bereits konsolidiert, keine Änderung nötig:**
- `ReleaseGallery.tsx` (#1) und `FansubGroupMediaBlock.tsx` delegieren bereits an
  `FansubMediaLightbox.tsx` — Grid bleibt eigenständig, nur die Bildbühne nutzt den Baustein.

**Bleiben als legitime Varianten bestehen (kein Viewer, kein Navigations-Flow):**
- `ReleaseVersionMediaSection`-Drawer „Medium bearbeiten" (#6) — Bearbeitungsformular mit
  statischer Bildvorschau, kein Navigations-Viewer.
- `GroupMediaReviewDetailDrawer.tsx` (#8) — Admin-Review-Formular, qualitativ bestes der drei
  Admin-Formular-Varianten, ebenfalls kein Navigations-Viewer.

**Risiko: Mittel** — die betroffenen Flächen sind öffentlich sichtbar (hohe Sichtbarkeit bei
Regressionen), aber rein lesende Darstellung ohne Datenmutation; kein Rechte-Risiko, da alle sechs
Implementierungen laut Permission-Matrix-Zeilen 2.1–2.6 bereits konsistent öffentlich/
sichtbarkeitsgefiltert sind.

**Aufwandsklasse: Groß** — sechs eigenständige Implementierungen, Neubau eines erweiterten
gemeinsamen Bausteins, Einbindung an mindestens fünf Konsumentenstellen.

**Vorbild/Altlast:** `FansubMediaLightbox.tsx` ist das Vorbild. Zu entfernen:
`ScreenshotGallery.tsx`s eigene Lightbox, `ProjectMemberMediaViewer.tsx` komplett (nach Übernahme
von Prefetch/Metadaten-Sidebar), `GroupAssetsExperience.tsx`s Bild-Lightbox-Anteil,
`ReleaseVersionMediaDetailPanel.tsx` (unabhängig sofort entfernbar).
</domain>

<design_basis>
## Design-Grundlage: Sketch 010 (nur gelesen)

`.planning/sketches/010-galerie-detailansicht` wurde als Design-Referenz gelesen, **nicht
verändert und nicht committet** — das Verzeichnis ist teils uncommittet und gehört dem Nutzer.

**Wichtige Einschränkung:** Der Sketch deckt ausschließlich die **öffentliche Release-Galerie**
ab (Karte = Vorschau mit Display-Bild + gekürztem Text; Detail = dunkle Bühne mit
Display-sofort+Original-nachgeladen, vollem Text, Kategorie+Uploader, Pfeile/Tastatur/Wischen, nur
X schließt, Klick aufs Bild = 100-%-Zoom). Die volle Vereinheitlichung über alle sechs
Implementierungen hinweg (Episodenseite, Gruppen-Assets, Mitgliederprofil-Medien) ist
**zusätzlicher Umfang gegenüber dem Sketch** — der Sketch liefert die visuelle Zielrichtung für
die neuen Merkmale (Zoom, Progressive-Load, Metadaten-Darstellung), ersetzt aber keine
Entscheidung darüber, wie sich diese Merkmale in den übrigen fünf Kontexten (Episodenseite,
Gruppen-Assets, Mitgliederprofil) verhalten sollen.
</design_basis>

<decisions>
## Implementation Decisions

- **D-01:** Vorbild/Basis — `FansubMediaLightbox.tsx` ist die Basis des gemeinsamen Viewer-Bausteins
  (Modal-basiert, bereits mehrfach wiederverwendet, Wrap-around-Tastaturnavigation). Der Baustein
  wird erweitert, nicht neu geschrieben.
- **D-02:** Zu übernehmende Merkmale vor Entfernung — `ProjectMemberMediaViewer.tsx`s
  Bild-Prefetch und reichhaltigste Metadaten-Sidebar werden in den gemeinsamen Baustein überführt,
  bevor die Komponente entfernt wird. Kein Merkmalsverlust gegenüber dem heutigen Bestzustand.
- **D-03:** Neue Merkmale laut Sketch 010 — Zoom, Touch-Swipe und Display→Original-Progressive-Load
  werden ergänzt, obwohl keine der sechs bestehenden Implementierungen sie heute hat. Zusätzlich
  Metadaten-Overlay und Prefetch (aus D-02).
- **D-04:** `ScreenshotGallery.tsx` wird vollständig auf den gemeinsamen Baustein umgestellt; dabei
  wird der bestehende CLAUDE.md-Konventionsverstoß (direkter `fetch()` statt `lib/api.ts`) mit
  beseitigt, da die Komponente ohnehin umgebaut wird.
- **D-05:** `GroupAssetsExperience.tsx` — nur der Bild-Lightbox-Anteil wird auf den gemeinsamen
  Baustein umgestellt. Der Video-Pfad über `VideoPlayerModal` bleibt unverändert und getrennt
  (kein Bild-Viewer-Umfang).
- **D-06:** `ReleaseVersionMediaDetailPanel.tsx` wird als toter Code (0 Importeure) sofort und
  unabhängig vom restlichen Phasenumfang gelöscht — keine Migration nötig.
- **D-07:** `ReleaseGallery.tsx` und `FansubGroupMediaBlock.tsx` bleiben unverändert, da sie bereits
  an `FansubMediaLightbox.tsx` delegieren — sie profitieren automatisch von den neuen Merkmalen,
  sobald der Baustein erweitert ist, ohne eigene Anpassung.
- **D-08:** Admin-Formular-Varianten #6 (`ReleaseVersionMediaSection`-Drawer „Medium bearbeiten")
  und #8 (`GroupMediaReviewDetailDrawer.tsx`) sind laut Inventur keine Navigations-Viewer, sondern
  Bearbeitungsformulare — sie werden in dieser Phase **nicht** angefasst (siehe aber „Offene
  Fragen an den Nutzer" zur endgültigen Trennungs-Bestätigung).
- **D-09:** Sketch-Nutzung (D-08 aus `175-INVENTORY.md`) — `.planning/sketches/010-galerie-detailansicht`
  dient ausschließlich als gelesene Design-Referenz für die öffentliche Release-Galerie und wird
  von dieser Phase nicht verändert oder committet.
- **D-10:** Keine doppelten Oberflächen — abgelöste Viewer (`ScreenshotGallery`-Lightbox,
  `ProjectMemberMediaViewer`, `GroupAssetsExperience`-Bildanteil, `ReleaseVersionMediaDetailPanel`)
  werden vollständig entfernt, sobald der gemeinsame Baustein an ihrer Stelle läuft. Kein
  Nebeneinander von alt und neu über das Ende der Phase hinaus.
- **D-11 (Projektregel):** Globale UI-Primitives aus `@/components/ui` sind Pflicht. Eigene
  Viewer-Bedienelemente (z. B. Zoom-Steuerung, Swipe-Indikator) werden nur gebaut, wo noch kein
  passendes Primitive existiert — und dann als neues Primitive unter `components/ui` angelegt,
  nicht als lokale Einzellösung im Viewer-Baustein selbst.
- **D-12 (Projektregel):** Echte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß) in jedem user-facing String des
  Viewers (Metadaten-Overlay-Labels, Fehlermeldungen, aria-labels) — keine ASCII-Ersetzungen.
- **D-13 (Projektregel):** Tests prüfen die Logik hinter dem Button — echte Verhaltenstests gegen
  Fake-Repository/Handler bzw. Komponentenlogik, keine Render-/Klick-Simulationstests und keine
  Quelltext-Grep-Tests (vgl. Teststil-Regel in `CLAUDE.md`, bereits in Phase 176 D-09 durchgesetzt).
- **D-14 (Projektregel):** UI-Abnahme erfolgt per Live-UAT (echter Browser-Durchlauf über die
  konfigurierte Tunnel-Adresse), nicht nur über Typcheck/Testsuite.
- **D-15 (Projektregel):** 450-Zeilen-Limit pro Produktionscode-Datei gilt auch für den neuen
  gemeinsamen Viewer-Baustein — bei Bedarf in mehrere Dateien aufteilen (z. B. Bühne/Overlay/Zoom-
  Logik getrennt).
- **D-16 (Projektregel):** Ein Commit je Änderung auf `main` (kein Sammel-Commit über mehrere
  fachlich getrennte Schritte); kein `git stash` bei offenen Änderungen.
</decisions>

<open_questions>
## Offene Fragen an den Nutzer

Diese Fragen werden hier nur dokumentiert, nicht entschieden — eine Entscheidung erfordert
Nutzer-Input vor oder während der Planung:

1. **Admin-Formular-Drawer #6/#8:** Bleiben `ReleaseVersionMediaSection`-Drawer „Medium bearbeiten"
   und `GroupMediaReviewDetailDrawer.tsx` wirklich dauerhaft als getrennte Bearbeitungsformulare
   bestehen (so die Inventur-Einschätzung), oder soll geprüft werden, ob zumindest ihre
   Bild-Anzeige-/Navigationslogik (nicht das Formular selbst) den neuen gemeinsamen Baustein
   mitnutzen kann?
2. **Verhalten bei Video-Medien:** `GroupAssetsExperience.tsx` trennt Bild (Lightbox, wird abgelöst)
   und Video (`VideoPlayerModal`, bleibt unberührt) bereits sauber. Soll der neue gemeinsame
   Bild-Viewer-Baustein so gebaut werden, dass er künftig auch Video-Einträge in derselben
   Navigationsreihenfolge überspringen/anzeigen kann, oder bleibt die Trennung Bild/Video
   strukturell endgültig getrennt (kein gemeinsamer Medien-Viewer über diese Phase hinaus)?
3. **Metadaten-Overlay-Sichtbarkeit:** Welche Metadaten aus der reichhaltigsten Sidebar
   (`ProjectMemberMediaViewer.tsx`) dürfen im neuen Overlay auf öffentlich zugänglichen Flächen
   (z. B. Release-Galerie) sichtbar sein, und welche bleiben auf interne/Admin-Kontexte beschränkt
   (z. B. Uploader-Identität, interne Review-Metadaten)?
</open_questions>

<references>
## Referenzen

- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-ROADMAP-PROPOSAL.md`
  — Abschnitt „Phase 177: Einheitlicher Bild-Viewer (F-18)" und Übersichtstabelle.
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
  — Fachaufgabe 2 „Bild ansehen" (Zeilen 35–57).
- `.planning/sketches/010-galerie-detailansicht/README.md` — Designfragen und Winner-Status (nur
  gelesen, gehört dem Nutzer).
- Phase 176 (Depends on) — läuft vor dieser Phase; `176-CONTEXT.md` als Formatvorbild für D-NN.
</references>
