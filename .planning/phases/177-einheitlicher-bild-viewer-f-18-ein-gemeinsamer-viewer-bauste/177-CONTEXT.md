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
  Metadaten-Overlay und Prefetch (aus D-02). **Zoom-Mechanismus überschrieben durch D-37** (Live-UAT
  Runde 2, 2026-10-09): der hier beschriebene binäre 100%-Toggle wird durch einen echten
  Mehrstufen-Zoom mit Pan ersetzt. Touch-Swipe/Progressive-Load/Prefetch bleiben unverändert.
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
  Bearbeitungsformulare — sie werden in dieser Phase **nicht** angefasst (endgültig bestätigt,
  siehe D-17).
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
- **D-17:** Admin-Formular-Drawer #6/#8 (Nutzer 2026-10-08, Antwort 1a) — `ReleaseVersionMediaSection`-
  Drawer „Medium bearbeiten" (#6) und `GroupMediaReviewDetailDrawer.tsx` (#8) bleiben dauerhaft
  getrennt und sind **nicht** Teil dieser Phase, auch nicht in ihrer Bild-Anzeige-/
  Navigationslogik — sie sind Bearbeitungsformulare, keine Navigations-Viewer. Keine
  Teilübernahme in den gemeinsamen Baustein.
- **D-18:** Video-Medien (Nutzer 2026-10-08, Antwort 2a) — Bild und Video bleiben strukturell
  getrennt. Der neue gemeinsame Viewer-Baustein navigiert ausschließlich durch Bilder; Videos
  öffnen weiterhin über das bestehende `VideoPlayerModal`. Eine Video-Integration in den
  gemeinsamen Baustein (z. B. gemischte Navigationsreihenfolge) ist ausdrücklich **nicht** Teil
  dieser Phase.
- **D-19:** Metadaten-Overlay-Inhalt und Sichtbarkeitsfilter (Nutzer 2026-10-08, Antwort 3a) — Das
  Overlay zeigt Titel, Kategorie, Folge (`episode_label`), Release-Version (`release_version_label`)
  und Bildunterschrift (`caption`) — auch auf öffentlich zugänglichen Flächen. Harte Regel: Medien
  mit interner/nicht-öffentlicher Sichtbarkeit dürfen **niemals** im öffentlichen Viewer erscheinen;
  der Sichtbarkeitsfilter muss serverseitig/datenseitig greifen (nicht nur clientseitig/UI-seitig
  verborgen werden) und ist mit einem Logik-Test zu belegen (vgl. D-13 Teststil-Regel).
- **D-20:** Sichtbarkeits-Scope für `GroupAssetsExperience` (Nutzer 2026-10-09, Antwort 2a) — der
  harte Sichtbarkeitsfilter aus D-19 gilt nur für die vier datenbankgestützten Flächen
  (`ReleaseGallery`/`FansubMediaLightbox`, `FansubGroupMediaBlock`, `ScreenshotGallery`,
  `ProjectMemberMediaViewer`). `GroupAssetsExperience` (Jellyfin-Ordner-Scan, kein
  `media_assets`-Bezug, kein `visibility`/`review_status`-Konzept im Datenmodell) bleibt
  zugriffsseitig unverändert — keine neue Zugriffskontrolle wird in dieser Phase eingeführt.
- **D-21:** Metadaten-Panel-Layout (Nutzer 2026-10-09, Antwort 1B) — das Panel liegt auf allen fünf
  Konsumentenflächen und auf beiden Formfaktoren (Desktop UND Mobile) **unterhalb** des Bildes,
  nicht rechts daneben. Die Bild-Bühne nutzt die volle verfügbare Breite; das Metadaten-Panel folgt
  als eigener, volle-Breite-Block darunter (gestapeltes Layout, kein zweispaltiges Grid). Das
  bestehende Side-by-Side-Layout aus `ProjectMemberMediaViewer` wird **nicht** in die gemeinsame
  Baseline übernommen, abweichend von der ursprünglichen UI-SPEC-Empfehlung „A (rechts)".
  **Teilweise überschrieben durch D-30** (Live-UAT Runde 1, 2026-10-09): „unterhalb des Bildes"
  gilt nur noch für die Bildunterschrift; Titel/Kategorie/Folge/Release-Version wandern an den
  oberen Bühnenrand. Kein zweispaltiges Grid bleibt weiterhin ausgeschlossen.
- **D-22:** Overlay-Feld-Degradation (Nutzer 2026-10-09, Antwort 3a) — Graceful Omission: fehlende
  Felder (z. B. Kategorie/Folge/Release-Version/Bildunterschrift bei `GroupAssetsExperience` oder
  `episode_label` bei `ScreenshotGallery`) werden nicht gerendert, keine Platzhalter (kein
  „Kategorie: –" o. ä.).
- **D-23:** Home/End-Tastaturkürzel (Nutzer 2026-10-09, Antwort 5a) — der Sprung zu erstem/letztem
  Bild per `Home`/`End`-Taste (bisher nur in `ScreenshotGallery` vorhanden) wird in die gemeinsame
  Tastatur-Baseline aller fünf Flächen übernommen, zusätzlich zu Pfeiltasten/Wrap-around.
- **D-24:** `ReleaseGallery.revealAll()`-Lücke mitfixen (Nutzer 2026-10-09, Antwort 4a) — die
  Cursor-Pagination-Query für nachgeladene Bilder bekommt den fehlenden `display_url`-JOIN
  (`177-RESEARCH.md` Open Question 3) als klar abgegrenzten Zusatz-Task in dieser Phase, mit
  eigenem Logik-Test (D-13-konform), damit nachgeladene Bilder genauso progressiv laden wie die
  Erstseite.

### Live-UAT Runde 1 (Nutzer 2026-10-09) — Gap-Fix-Entscheidungen D-25 bis D-32

Die erste Live-UAT-Vorlage (Plan 177-08, Task 2) wurde **nicht** freigegeben. Befund: Viewer wirkt
nicht wie eine Vollbild-Bühne, sondern wie ein kleines Fenster; Pfeile „hüpfen" bei Hover
(Layout-Shift); Pfeile ragen ins Bild. Die folgenden Entscheidungen setzen die daraufhin vom
Nutzer vorgegebene Überarbeitung als Gap-Fix innerhalb von Phase 177 um (keine neue Phase).

- **D-25:** Vollbild-Bühne ohne Fensterrahmen (Nutzer Live-UAT-Feedback 2026-10-09) — `Modal`
  `variant="stage"` wird erweitert: die gesamte `modalPanel`-Fläche (nicht nur der innere
  Bildbereich) nutzt `--surface-stage` und füllt den gesamten Viewport (Breite und Höhe), ohne
  sichtbaren hellen Rahmen/Fenster-Look und ohne großen Innenabstand. Dies überschreibt die in
  `177-UI-SPEC.md` ursprünglich festgelegte Regel „`modalPanel`-Hintergrund bleibt hell" — diese
  gilt nur noch für `variant="default"`, nicht mehr für `variant="stage"`.
- **D-26:** Navigationspfeile — gemeinsames Primitive statt neuer Button-Variante
  (Nutzer-Präzisierung 2026-10-09, verbindlich) — die Vor-/Zurück-Pfeile verwenden **nicht**
  `Button variant="floating"` (abweichend von der ursprünglichen Zuordnung in `177-UI-SPEC.md`
  Abschnitt „Button — Verwendung im Viewer"), sondern den bestehenden weinroten Chevron-Pfeil aus
  `FocalCarouselInternals.tsx` (`CarouselArrow`, Token `--ui-arrow` `#7c3c4f`). Dieser wird als
  eigenständiges globales Primitive `components/ui/NavArrow.tsx` herausgelöst (Export über
  `@/components/ui`) mit einer Größen-Option: `size="default"` (heutiges Carousel-Aussehen,
  pixelgleich, keine Änderung) und `size="large"` (neu, für den Vollbild-Viewer — größere
  Klickfläche/Icon, runde helle Fläche analog zum bestehenden `closeButton`-Rezept, damit der
  weinrote Pfeil auf der dunklen Bühne gut sichtbar bleibt). `FocalCarousel` wird auf dasselbe
  Primitive umgestellt (`size="default"`); sein Aussehen bleibt unverändert (Regressionsschutz:
  bestehende `FocalCarousel.test.tsx` muss weiterhin grün bleiben). Hover verändert bei **beiden**
  Größen ausschließlich Farbe/Opazität, niemals `transform`/Layout — behebt den vom Nutzer
  gemeldeten Hüpf-Effekt (Ursache: die globale `.button:hover { transform: translateY(-1px) }`
  -Regel, die für `NavArrow` gezielt überschrieben wird). Die neue `size="large"`-Variante wird in
  `/dev/ui-system` gezeigt. Die Zoom-Toggle-Schaltfläche bleibt unverändert bei
  `Button variant="floating"` — nur die Navigationspfeile wechseln auf `NavArrow`.
- **D-27:** Pfeil-Position außerhalb der Bildfläche (Nutzer Live-UAT-Feedback 2026-10-09) — die
  `NavArrow size="large"`-Buttons liegen links/rechts am Bildschirmrand, vertikal zentriert zur
  Bühne, außerhalb des durch `object-fit: contain` berechneten Bildbereichs (die Bühne reserviert
  seitlichen Raum für die Pfeile, sie ragen nicht ins Bild). Auf schmalen Viewports, wo kein Platz
  für seitlichen Freiraum bleibt, dürfen sie über dem Bildrand liegen, dann aber halbtransparent.
- **D-28:** Thumbnail-Leiste (neues globales Primitive, Nutzer Live-UAT-Feedback 2026-10-09) —
  unterhalb der Bild-Bühne/Textbereich, volle Breite, zeigt alle Bilder der aktuellen
  Navigationsliste als Thumbnail-Variante (kleine Vorschaubilder), aktives Bild hervorgehoben mit
  `--accent-primary`-Rahmen, Klick springt direkt zum Bild (Index setzen), aktives Thumbnail wird
  automatisch in den sichtbaren Bereich gescrollt (horizontal, wiederverwendet die bestehende
  `centeredScrollLeft`/`nearestOwnedItemIndex`-Logik aus `FocalCarouselInternals.tsx`, kein
  Neubau), Leiste selbst horizontal scrollbar (Mausrad über der Leiste scrollt horizontal statt
  vertikal zu blättern), darunter Positionszähler „n / N". Neues Primitive unter
  `components/ui/` (D-11-konform), nicht lokal im Viewer-Feature-Ordner.
- **D-29:** Mausrad-Navigation auf der Bild-Bühne (Nutzer Live-UAT-Feedback 2026-10-09) —
  Wheel-Events über der Bild-Bühne (nicht über der Thumbnail-Leiste, dort scrollt das Rad
  horizontal gemäß D-28) wechseln zum vorherigen/nächsten Bild, gedrosselt (kein Durchrasen bei
  schnellem/kontinuierlichem Scrollen), deaktiviert solange gezoomt (D-03-Zoom bleibt unverändert).
  Tastatur (Pfeiltasten, Pos1/Ende, Esc) und Touch-Swipe bleiben unverändert aktiv (D-23/D-03).
- **D-30:** Metadaten-Anordnung — Kopfbereich oben, Bildunterschrift unten (Nutzer-Präzisierung
  2026-10-09, verbindlich; **überschreibt D-21 teilweise**) — Titel (nur falls vorhanden) sowie
  Kategorie/Folge/Release-Version als kleine Zusatzzeile liegen am **oberen** Bühnenrand, links
  neben dem Schließen-X. Die Bildunterschrift (`caption`) liegt **unten**, zwischen Bild-Bühne und
  Thumbnail-Leiste (D-28). Graceful Omission (D-22) bleibt für beide Bereiche unverändert —
  fehlende Felder werden nicht gerendert, keine Platzhalter; ist in einem Bereich kein Feld
  vorhanden, entfällt der jeweilige Bereich komplett (z. B. kein Kopfbereich, wenn kein Titel und
  keine Kategorie/Folge/Release-Version vorhanden sind).
- **D-31:** Bildunterschrift-Darstellung bei langem Text — Variante 1 (Nutzerentscheidung
  2026-10-09, verbindlich, beantwortet die bei Erstformulierung offene Frage zu D-30): unten
  zwischen Bild und Thumbnail-Leiste wird die Bildunterschrift bis ca. 3–4 Zeilen vollständig
  angezeigt. Ist sie länger: die letzte sichtbare Zeile läuft weich aus (Fade-Gradient), darunter
  ein `Button`-Primitive „Weiterlesen". Klick auf „Weiterlesen" öffnet ein Textpanel, das von unten
  über den unteren Teil der Bühne fährt (das Bild bleibt oben sichtbar), mit vollständigem,
  scrollbarem Text; schließen per X-Button, `Esc` oder Klick auf „Weniger anzeigen". `Esc`-Reihenfolge:
  ein erstes `Esc` schließt nur das Textpanel, erst ein zweites `Esc` schließt den Viewer. Das Panel
  schließt automatisch bei jedem Bildwechsel (Navigation setzt den Panel-Zustand zurück).
  Funktioniert auch auf Mobile (Panel nimmt dort mehr Höhe ein). Wischen/Mausrad **innerhalb** des
  offenen Panels scrollt den Text und löst **nicht** die Bild-Navigation (D-29/Touch-Swipe) aus.
  Die „zu lang"-Erkennung (Zeilen-/Höhenschwelle), die Esc-Reihenfolge, der Panel-Reset beim
  Bildwechsel und die Wheel/Swipe-Weiche bei offenem Panel sind als reine, direkt testbare
  Funktionen zu implementieren (D-13-Teststil, keine Render-/Klicktests).
- **D-32:** Ein-Bild-Fall (Nutzer Live-UAT-Feedback 2026-10-09) — bei genau einem Bild in der
  Navigationsliste werden Pfeile (D-26/D-27) und Thumbnail-Leiste (D-28) nicht gerendert.

### Live-UAT Runde 2 (Nutzer 2026-10-09) — Gap-Fix-Entscheidungen D-33 bis D-39

Die zweite Live-UAT-Vorlage (nach Umsetzung von D-25 bis D-32 plus drei vom Nutzer selbst
gefundenen Zwischenbugs) wurde **nicht** freigegeben. Befund: Funktion passt, die Optik soll
überarbeitet werden. Die folgenden Entscheidungen setzen die vom Nutzer vorgegebene Überarbeitung
als weiteren Gap-Fix innerhalb von Phase 177 um (keine neue Phase).

- **D-33:** Veil-Hintergrund statt deckender `--surface-stage`-Fläche (Nutzer Live-UAT-Feedback
  2026-10-09, verbindlich) — die bisherige kühle, voll deckende `--surface-stage`-Flächenfarbe wird
  durch einen dunklen Schleier mit `backdrop-filter: blur(...)` ersetzt: die Team4s-Seite bleibt
  hinter dem Viewer erkennbar, aber stark abgedunkelt und weichgezeichnet. Zwei neue globale Token
  in `frontend/src/styles/globals.css`: `--surface-stage-veil` (halbtransparenter, warmer
  Dunkelton — aus der bestehenden Team4s-Palette abgeleitet, z. B. via `color-mix` auf Basis des
  bereits vorhandenen warmen `--text-strong` `#171513`, nicht ein neu erfundener roher Hex-Wert)
  und `--surface-stage-veil-blur` (Blur-Radius, z. B. `20px` als Ausgangswert). Fallback für
  Browser ohne `backdrop-filter`-Unterstützung (`@supports not (backdrop-filter: blur(1px))`):
  nahezu deckender warmer Dunkelton (hohe Opazität desselben Farbtons, kein Blur nötig, da ohnehin
  kaum noch etwas durchscheint). Die Bildfläche selbst (das `<img>`-Element) wird vom Schleier
  nicht beeinflusst — `backdrop-filter` wirkt nur auf das, was *hinter* dem Element liegt, nicht
  auf eigene Kind-Inhalte; das Bild bleibt also automatisch kontrastreich und unverfälscht. Der
  neue Token ersetzt `--surface-stage` einheitlich dort, wo heute die deckende Flächenfarbe für die
  Viewer-Chrome verwendet wird (`Modal`s `modalPanelStage`, `MediaViewerStage`s `.stage`,
  `MediaViewerCaption`s `.caption`/`.panel`, `ThumbnailStrip`s `.strip`) — `--surface-stage` selbst
  bleibt als Token bestehen (ggf. noch für andere, nicht-transparente Zwecke), wird aber für die
  Viewer-Chrome-Hintergründe durch `--surface-stage-veil` abgelöst.
- **D-34:** Einheitliche Mittelachse (Nutzer Live-UAT-Feedback 2026-10-09, verbindlich) — Kopfbereich
  (Titel+Meta, D-30), Bildunterschrift-Bereich (D-30/D-31), Thumbnail-Leiste und Positionszähler
  (D-28) werden auf die Bildachse zentriert statt unabhängig linksbündig/volle-Breite positioniert.
  Die Bildunterschrift bekommt eine begrenzte Zeilenlänge von ca. `70ch`, als horizontal zentrierter
  Block; der Fließtext innerhalb dieses Blocks bleibt **linksbündig** (nicht zentriert) — zentrierter
  mehrzeiliger Fließtext ist schwerer lesbar als linksbündiger Text in einem zentrierten Block
  (Standard-Typografie-Praxis), diese Begründung wird in der UI-SPEC festgehalten. Die
  Thumbnail-Leiste zentriert sich, wenn ihr Inhalt nicht die volle verfügbare Breite ausfüllt; bei
  Überlauf bleibt sie horizontal scrollbar wie bisher (D-28 unverändert).
- **D-35:** Titel-Typografie vergrößert (Nutzer Live-UAT-Feedback 2026-10-09, verbindlich) — der
  Titel im Kopfbereich (D-30) wechselt von der bisherigen „Heading"-Typografie-Rolle (20px/700) auf
  die bereits in der UI-SPEC-Typografie-Tabelle dokumentierte, bisher ungenutzte „Display"-Rolle
  (32px/700, entspricht der sitewide `PageHeader`-Skala) — kein neuer Typografie-Wert, nur die
  Aktivierung einer bereits bestehenden, bisher nur für Template-Vollständigkeit dokumentierten
  Skalenstufe. Kategorie bleibt ein dezentes `Badge variant="info"` daneben (unverändert);
  Folge/Release-Version bleiben eine ruhige Zusatzzeile (Label-Typografie, unverändert).
- **D-36:** NavArrow-Bühnen-Darstellung abgedunkelt (Nutzer Live-UAT-Feedback 2026-10-09,
  verbindlich) — die `size="large"`-Variante von `NavArrow` (D-26) bekommt für die
  Bühnen-Verwendung einen dunklen, halbtransparenten Kreis statt der bisherigen hellen Kreisfläche
  (passend zum neuen Veil-Hintergrund, D-33 — abgeleitet aus derselben Token-Familie, kein neuer
  roher Farbwert). Das Chevron-Icon bleibt in `--ui-arrow` (weinrot), sofern der Kontrast gegen den
  neuen dunklen Kreis-Hintergrund mindestens 3:1 erreicht (zu prüfen); andernfalls weicht die
  Icon-Farbe auf einen hellen Text-Token aus. Hover macht die Pfeile deutlicher (Opazität/Farbe
  intensiver als im Default-Zustand) — weiterhin explizit **kein** `transform`/Layout-Shift (D-26
  bleibt uneingeschränkt in Kraft). Die Carousel-`size="default"`-Darstellung bleibt unverändert
  (pixelgleich, D-26-Regressionsschutz/`FocalCarousel.test.tsx` gilt unverändert weiter).
- **D-37:** Echter Mehrstufen-Zoom mit Pan ersetzt den binären 100%-Toggle (Nutzer
  Live-UAT-Feedback 2026-10-09, verbindlich; **überschreibt den Zoom-Mechanismus aus D-03**) — der
  bisherige binäre „eingepasst ↔ 100% nativ"-Toggle wird durch einen Zyklus aus mindestens drei
  Stufen ersetzt: **eingepasst → 2× → 4× → zurück zu eingepasst**, jede Stufe relativ zur aktuell
  *angezeigten* (eingepassten) Größe berechnet, nicht relativ zur nativen Bildauflösung (ein
  kleines, bereits hochskaliertes Bild bei „eingepasst" wird bei „2×" doppelt so groß wie diese
  bereits hochskalierte Darstellung, nicht etwa auf native Pixelgröße zurückgesetzt). Auslöser:
  Klick auf den Lupe-Button (D-39, jetzt in der oberen Leiste) oder Doppelklick auf das Bild — jede
  Aktivierung rückt genau eine Stufe im Zyklus weiter.
  - **Pan (gezoomter Zustand):** Ziehen mit gedrückter Maus verschiebt den sichtbaren Ausschnitt;
    die Verschiebung ist so begrenzt (geclampt), dass niemals ein leerer Rand neben dem Bild in den
    sichtbaren Bereich gezogen werden kann — der Ausschnitt deckt bei jeder Zoomstufe immer die
    gesamte Bühne ab.
  - **Touch:** Ein-Finger-Ziehen pannt im gezoomten Zustand (wie die Maus); Pinch-Geste zoomt
    kontinuierlich innerhalb der durch den Zyklus definierten Grenzen (Minimum = eingepasst,
    Maximum = die oberste Zyklusstufe), unabhängig von den festen Klick-Stufen.
  - **Mausrad:** im eingepassten Zustand weiterhin Bild-Navigation (D-29, unverändert); im
    gezoomten Zustand zoomt das Rad stattdessen um den aktuellen Mauszeiger-Punkt herum (der Punkt
    unter dem Cursor bleibt beim Zoomen an derselben Bildschirmposition fixiert).
  - **Touch-Swipe:** navigiert ausschließlich im eingepassten Zustand (D-03 unverändert für diesen
    Teil); im gezoomten Zustand bewegt der Finger stattdessen den sichtbaren Ausschnitt (Pan, siehe
    oben) statt eine Navigation auszulösen.
  - **Bildwechsel** (Navigation zu einem anderen Bild) setzt Zoomstufe und Pan-Position
    bedingungslos auf „eingepasst"/Null zurück — wie bereits für das Caption-Panel etabliert
    (D-31-Muster).
  - **Escape-Reihenfolge erweitert auf drei Stufen:** ein erstes `Escape` setzt, falls gezoomt,
    zuerst nur den Zoom auf „eingepasst" zurück; ist nicht gezoomt, aber das Caption-"Weiterlesen"-
    Panel (D-31) offen, schließt das nächste `Escape` das Panel; ist beides nicht der Fall, schließt
    `Escape` den Viewer. Dies erweitert die bestehende zweistufige Sequenz aus D-31 um eine
    zusätzliche, vorrangige Zoom-Stufe (Zoom → Panel → Viewer).
  - Jede hier beschriebene Entscheidungslogik (Zoomstufen-Zyklus, Pan-Clamp-Berechnung,
    Zoom-um-Cursorpunkt-Mathematik, Wheel-Weiche blättern/zoomen, Swipe-Weiche navigieren/pannen,
    dreistufige Escape-Zielermittlung, Reset-Wert beim Bildwechsel) muss als reine, direkt
    aufrufbare Funktion implementiert werden (D-13-Teststil, keine Render-/Klicktests) — konsistent
    mit dem bereits etablierten Muster in `mediaViewerNavigation.ts`/`mediaViewerCaptionPanel.ts`.
- **D-38:** Lupe-Button-Position (Nutzer Live-UAT-Feedback 2026-10-09, verbindlich) — der
  Zoom-Auslöser-Button steht nicht mehr in der Bildecke über der Bühne (bisherige
  `Button variant="floating"`-Position unten rechts auf der Bühne), sondern in der oberen Leiste
  neben dem Schließen-X (weiterhin `Button`-Primitive, nicht `NavArrow`). aria-label wechselt
  zwischen `Bild vergrößern` (im eingepassten Zustand) und `Zoom zurücksetzen` (in jeder gezoomten
  Stufe) — echte Umlaute, exakt diese beiden Strings.
- **D-39:** Gilt einheitlich für alle 5 Konsumentenflächen (Nutzer Live-UAT-Feedback 2026-10-09) —
  D-33 bis D-38 gelten für alle 5 Viewer-Flächen gleich, keine Fläche bekommt eine abweichende
  Optik/Zoom-Bedienung. Ausschließlich globale Primitives/Tokens (`@/components/ui`,
  `--surface-*`/`--space-*`/`--text-*`/`--accent-*`/`--ui-arrow`) — keine neuen lokalen
  Einzelfarben oder hart codierten Werte in Feature-Dateien.
</decisions>

<open_questions>
## Offene Fragen an den Nutzer — beantwortet

Alle drei ursprünglich offenen Fragen wurden am 2026-10-08 vom Nutzer entschieden; die
Entscheidungen sind oben als D-17, D-18 und D-19 festgehalten. Keine offenen Fragen mehr
ausstehend.

1. ~~**Admin-Formular-Drawer #6/#8**~~ → beantwortet, siehe D-17.
2. ~~**Verhalten bei Video-Medien**~~ → beantwortet, siehe D-18.
3. ~~**Metadaten-Overlay-Sichtbarkeit**~~ → beantwortet, siehe D-19.
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
