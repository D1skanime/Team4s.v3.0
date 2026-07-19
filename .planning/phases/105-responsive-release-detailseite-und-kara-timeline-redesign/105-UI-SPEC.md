---
phase: 105
slug: responsive-release-detailseite-und-kara-timeline-redesign
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-19
---

# Phase 105 — UI Design Contract

> Verbindlicher visueller und interaktiver Vertrag für die responsive öffentliche Release-Detailseite. Generiert durch `gsd-ui-researcher` und durch `gsd-ui-checker` verifiziert.

---

## Design System

| Eigenschaft | Wert |
|-------------|------|
| Tool | Internes Team4s-UI-System; kein shadcn |
| Preset | Nicht anwendbar |
| Komponentenbibliothek | Projektinterne React-Primitives mit CSS Modules; keine externe Primitive-Library |
| Icon-Bibliothek | `lucide-react` |
| Schrift | `Inter`, Fallback `Segoe UI`, `system-ui`, `sans-serif` |

`components.json` ist nicht vorhanden, aber ein etabliertes Designsystem ist vorhanden. Phase 105 initialisiert deshalb kein zweites System. Sichtbare Standard-UI verwendet oder erweitert ausschließlich `@/components/ui`: `Button`, `Card`, `Badge`, `SectionHeader`, `Accordion`, `Modal` und `AdjacentNavigation`. Domain-spezifische Timeline-Geometrie und responsive Release-Komposition bleiben lokal in den vorhandenen Release-/Fansub-Komponenten.

**Quellen:** `docs/frontend/ui-system.md`, `frontend/src/styles/globals.css`, `frontend/src/components/ui/*`, 105-CONTEXT D-25 und D-27.

---

## Spacing Scale

Alle neuen Layoutabstände verwenden Vielfache von 4 px.

| Token | Wert | Verwendung |
|-------|------|------------|
| `xs` / `--space-1` | 4px | Inline-Abstand, Timeline-Ticks, enges Label-Stacking |
| `sm` / `--space-2` | 8px | Badge-/Icon-Abstand, kompakte Metadaten |
| `md` / `--space-4` | 16px | Standardabstand in Karten und Grids |
| `lg` / `--space-5` | 24px | Abschnitts-Innenabstand, Karten-Gap |
| `xl` / `--space-6` | 32px | Abstand zwischen großen Inhaltsgruppen |
| `2xl` / `--space-7` | 48px | Große Abschnittstrennung, Desktop-Seitengutter |
| `3xl` / `--space-8` | 64px | Seitenabschluss und breites Desktop-Gutter |

**Ausnahmen:** Das bestehende `--space-3: 12px` darf innerhalb bereits vorhandener globaler Primitives und für kompakte Metazeilen erhalten bleiben, wird aber nicht als neuer Seiten-/Rasterabstand eingeführt. Interaktive Kara- und Navigationsziele sind auf Mobile mindestens 48 px hoch; dies ist eine Zielgröße, kein zusätzlicher Spacing-Token.

---

## Typography

Es gelten genau vier Größen und zwei Gewichte. Tabellarische Zeiten verwenden zusätzlich `font-variant-numeric: tabular-nums`, aber keine eigene Schriftgröße.

| Rolle | Größe | Gewicht | Zeilenhöhe |
|-------|-------|---------|------------|
| Label / Meta | 12px | 700 | 1.25 |
| Body | 16px | 400 | 1.5 |
| Abschnittsüberschrift | 20px | 700 | 1.2 |
| Hero-/Displaytitel | 32px | 700 | 1.2 |

- Segmentname, Personenname und Karten-CTA verwenden 16px; Typ, Zeit, Dauer, Rollen und Badges 12px.
- Teamtexte bleiben bei 16px/1.5 und erhalten je Textkarte eine maximale lesbare Zeilenlänge von 68 Zeichen (`68ch`).
- Keine Gewichte 500, 600, 650, 800 oder 900 neu in dieser Phase einführen; vorhandene Release-Seitenwerte werden auf 400/700 vereinheitlicht.

**Quellen:** globale Schriftbasis in `globals.css`; Größen und Gewichtslimit als UI-Vertragsdefault; D-28 für Lesbarkeit.

---

## Color

| Rolle | Wert | Verwendung |
|-------|------|------------|
| Dominant (60 %) | `--surface-canvas` / `#F6F4EF` | Seitenhintergrund und ruhige Freiflächen |
| Secondary (30 %) | `--surface-card` / `#FFFFFF`, ruhige Innenfläche `--surface-card-muted` / `#FBFAF8` | Hero, Inhaltssektionen, Segment-/Textkarten |
| Accent (10 %) | `--color-primary` / `#5F84DD` | Abspiel-CTA, ausgewählte Kara-Karte/-Marke, relevante Inline-Links |
| Destructive | `--color-error` / `#DC3545` | Ausschließlich Fehlermeldungen; Phase 105 besitzt keine destruktive Aktion |

**Accent reserviert für:** aktive Abspielaktion `Kara abspielen`, Auswahlrahmen und Auswahlindikator genau eines Kara-Segments, `Zurück zum Fansub-Projekt` sowie fokussierte/aktive Release-Navigation. Der Akzent färbt nicht jede Karte, jedes Badge oder jede Metazeile.

SectionHeader-Unterlinien behalten `--ui-line: #82122C`; der Fokuszustand behält `--focus-outline`. Diese semantischen Systemfarben werden nicht als Kara-Typfarbe zweckentfremdet.

### Kara-Typfarben

Typfarbe ist Mediensemantik und kein Erfolgs-/Fehlerstatus. Jeder Typ erhält neben Farbe immer ein sichtbares Textlabel.

| Typ | Vordergrund / Linie | Ruhige Karten-/Spurfläche |
|-----|----------------------|---------------------------|
| OP | `#15955A` | 14 % Typfarbe auf Weiß |
| ED | `#1685BF` | 14 % Typfarbe auf Weiß |
| IN | `#8442C7` | 14 % Typfarbe auf Weiß |
| Middle | `#C98A12` | 14 % Typfarbe auf Weiß |
| Kara / sonstiger Kara-Typ | `#993556` | 14 % Typfarbe auf Weiß |
| Other / unbekannt | `#536688` | 14 % Typfarbe auf Weiß |

Borders verwenden 32 % der jeweiligen Typfarbe, damit die Flächen ruhig bleiben und Textkontrast auf hellem Untergrund erhalten bleibt. Die OP-/ED-/IN-/Other-Werte stammen aus `PublicReleaseBlock`; Middle und Kara verwenden bereits vorhandene Team4s-Farben. Statusrot wird nie für einen Segmenttyp verwendet.

---

## Copywriting Contract

Alle sichtbaren deutschen Strings verwenden korrekte Umlaute.

| Element | Verbindliche Copy |
|---------|-------------------|
| Primäre CTA | `Kara abspielen` |
| Gast-CTA für bereites Kara | Schloss-Icon und `Anmelden zum Abspielen` als Link nach `/login` |
| Kara-Abschnitt | `Karas` |
| Nicht bereit | `Noch nicht abspielbar` |
| Hero-Disclosure | `Details` / `Details schließen` als zugänglicher Zustandstext |
| Bilder | `Bilder aus dem Release` |
| Teamtexte | `Stimmen aus dem Team` |
| Beteiligte | `An diesem Release beteiligt` |
| Vollfolge | `Vollständige Episode` und Aktion `Episode abspielen` |
| Text aufklappen | `Weiterlesen` / `Weniger anzeigen` |
| Bilder nachladen | `Weitere {n} Bilder anzeigen` |
| Texte nachladen | `Weitere {n} Texte anzeigen` |
| Leerer Abschnitt | Kein Heading und kein Body: Karas, Bilder, Texte und Beteiligte werden bei fehlenden Daten vollständig ausgelassen |
| Seitenfehler | `Release konnte nicht geladen werden. Bitte versuche es erneut oder kehre zum Fansub-Projekt zurück.` |
| Kara-Playback-Fehler | `Dieses Kara-Segment konnte nicht abgespielt werden. Bitte versuche es erneut.` |
| Nachladefehler Bilder | `Weitere Bilder konnten nicht geladen werden. Bitte versuche es erneut.` |
| Nachladefehler Texte | `Weitere Texte konnten nicht geladen werden. Bitte versuche es erneut.` |
| Destruktive Bestätigung | Nicht vorhanden; Phase 105 enthält keine destruktiven Aktionen |

**UAT-Supersession 2026-07-20:** Die frühere Vorgabe „kein Login-Hinweis“ ist aufgehoben. Gäste erhalten bei bereiten Karas den klaren Link `Anmelden zum Abspielen` mit Schloss-Icon. Er startet keinen Stream und enthält weder Autoplay noch Browser-Bounds. Technische Render-, Grant- oder Streamdiagnosen erscheinen weiterhin nicht auf der öffentlichen Seite.

---

## Seitenkomposition

Die DOM- und visuelle Reihenfolge ist identisch:

1. Breadcrumbs und `Zurück zum Fansub-Projekt`
2. Release-Hero
3. `Karas`, falls Segmente vorhanden sind
4. `Bilder aus dem Release`, falls Bilder vorhanden sind
5. `Stimmen aus dem Team`, falls Texte vorhanden sind
6. `An diesem Release beteiligt`, falls release-version-spezifische Personen vorhanden sind
7. `Vollständige Episode`, ausschließlich bei positiv aufgelöstem Recht und bereitem Stream
8. Inline-`AdjacentNavigation` für vorherigen/nächsten Release, falls vorhanden

Die bisherige separate Sprungnavigation `Bilder · Texte · Fansubber` entfällt vollständig. Dies erfüllt D-02 und folgt der bereits etablierten fließenden Public-Seite aus Phase 102. Leere Abschnitte hinterlassen weder Platzhalter noch zusätzliche Trennlinie oder Abschnittsabstand.

Alle Sektionen nutzen dieselbe öffentliche Breite: `--public-page-max-width: 1360px`, ab 1600 px `1480px`, mit `--public-page-gutter: 48px` beziehungsweise `64px`. Kein innerer Wrapper verengt Timeline, Gallery, Teamtexte oder Beteiligte auf eine Halbspalte. Hauptsektionen dürfen die vorhandene helle Glass-/Card-Fläche verwenden; darin liegende Karten verwenden `flat` oder `nestedFlat`, damit keine schwere Card-in-Card-Hierarchie entsteht.

---

## Responsive Layout Contract

| Viewport | Seitenlayout | Karas | Weitere Inhalte |
|----------|--------------|-------|-----------------|
| Mobile `≤ 639px` | 16px Seitengutter; eine Hauptspalte | Keine horizontale Spur; vertikale Kara-Karten, eine Spalte | Bilder exakt 2 Spalten; Teamtexte und Beteiligte 1 Spalte; Navigation gestapelt und vollbreit |
| Tablet Portrait `640–900px` | Öffentliches Gutter, eine fließende Inhaltsbreite | Horizontale Timeline mit Start-/Endanker; Segmentkarten 1 Spalte | Bilder 2 Spalten; Teamtexte 1 Spalte; Beteiligte 2 Spalten |
| Tablet/Laptop `901–1199px` | Volle öffentliche Breite | Horizontale Timeline mit Start-/Endanker; Segmentkarten 2 Spalten | Bilder 3 Spalten; Teamtexte 2 Rollen-Spalten, falls beide mindestens 320px breit bleiben; Beteiligte mindestens 2 Spalten |
| Desktop `≥ 1200px` | Volle öffentliche Breite bis zum globalen Maximum | Horizontale Timeline mit Start-/Endanker; Segmentkarten 2 Spalten | Bilder 3 Spalten; Teamtexte 2 Rollen-Spalten; Beteiligte `auto-fit` ab 220px |

Verbindliche UAT-Viewports sind 390, 768, 1024 und 1440 px. Bei keinem davon gibt es horizontales Scrollen, abgeschnittene Fokusrahmen oder überlagernde Navigation. Layoutentscheidungen folgen CSS-Breakpoints beziehungsweise Containerbreite, nicht JavaScript-Viewport-Abfragen.

---

## Hero Contract

- Der Hero bleibt eine eigenständige, leicht erhöhte öffentliche Fläche mit 20px Radius, Akzentlinie oben und vorhandener Backdrop-Atmosphäre. Er ist kein Fullscreen-Player-Hero.
- Desktop/Tablet zeigen Preview beziehungsweise Anime-Logo-Fallback links und Inhalt rechts. Mobile stapelt Bild vor Text. Ohne Preview und ohne Logo bleibt ein absichtlich komponierter Text-Hero; keine leere Medienbox rendern.
- Sofort sichtbar: Episode, Episodentitel, kuratierter Release-Titel sofern abweichend, `Fansubgruppe: {Name}` beziehungsweise `Fansub-Coop: {Name} × {Name}`, Version, Release-Datum, Dauer und Auflösung.
- Unter `Details`: Container, Video-Codec, Audio-Codec, Audio-Sprache, Untertiteltyp und Untertitelspuren. Null-/Leerwerte aus der bestehenden API werden als `Nicht hinterlegt` dargestellt. Das Disclosure ist ein echtes `Accordion`, hat `aria-expanded`, einen sichtbaren Fokuszustand und behält seinen Zustand lokal.
- Nach dem Details-Accordion steht, falls vorhanden, die nächste Release-Kante über dieselbe `ReleaseNavigation`/`AdjacentNavigation inline`-Seam. Sie liegt im normalen Hero-Footer-Fluss und ergänzt die vollständige Navigation am Seitenende.
- Hero-Statistiken zeigen ausschließlich vorhandene Zählwerte für Bilder, Texte und Fansubber; sie sind Metadaten, keine Navigations-Pills.
- Die vollständige Beteiligtenliste gehört nicht mehr in das Hero-Disclosure, sondern in die eigene Sektion nach den Teamtexten.

---

## Kara-Timeline und Segmentvertrag

### Desktop und Tablet

- Die Timeline nimmt 100 % der verfügbaren Abschnittsbreite ein und bildet `00:00` bis zur aufgelösten Episodendauer ab. Fallback ist weiterhin das größte Segmentende; dies ändert keine API- oder Ownership-Seam.
- **UAT-Supersession 2026-07-20:** Desktop und Tablet zeigen keine generierten Viertel-/Mittel-Ticks mehr. Die Spur hat nur die bedeutungsvollen Anker `Start 00:00` und `Ende {Episodendauer}`. Jedes Segmentlabel zeigt Typ sowie die echte Start–Ende-Zeit.
- Die ruhige Grundspur ist 12px hoch. Segmente liegen proportional auf derselben Achse; `left = start / duration`, `width = (end - start) / duration`. Eine visuelle Mindestbreite darf diese Fachproportion nicht verfälschen.
- Der interaktive Hit-Bereich eines spielbaren Segments ist mindestens 44×44px und kann die schmale sichtbare Linie transparent erweitern. Kleine oder eng benachbarte Segmente erhalten ihr Typ-/Namenslabel außerhalb der Spur; das Label darf die Segmentbreite nicht künstlich vergrößern.
- Außenlabels werden am linken beziehungsweise rechten Rand ausgerichtet, wenn eine zentrierte Position überlaufen würde. Bei Kollisionen werden zusätzliche stabile Label-Lanes angelegt; auch vier nahe Segmente überlappen nicht, werden nicht abgeschnitten und verbreitern die Seite nicht horizontal.
- Unter der Spur stehen Segmentkarten: ab 901px zwei Spalten mit `minmax(0, 1fr)`, darunter eine Spalte. Karten zeigen Typ-Badge/-linie, Name, Start–Ende, Dauer, Beteiligte mit konkreten Rollen und Zustands-/Abspielaktion.
- Segmentkarten verwenden `Card variant="flat"`; die Abspielaktion verwendet den globalen `Button` mit Lucide-`Play`, nicht einen nativen lokal gestylten Button.

### Mobile

- Die horizontale Skala ist nicht nur verborgen, sondern durch eine eigenständige vertikale Liste ersetzt. Es gibt keinen horizontalen Scroll-Container.
- Jede Karte besitzt links eine 4px breite Typ-Linie, 16px Innenabstand, mindestens 12px Abstand zwischen Karten und eine sichtbare Struktur: Typ → Name → Start–Ende und Dauer → Beteiligte → Aktion/Status.
- Kleine Segment-Vorschaubilder werden nicht gerendert. Ein Bild darf nur in der großen Playerfläche im 16:9-Format erscheinen.
- Für aktive Sessions und bereite Segmente ist der gesamte nicht-interaktive Karteninhalt eine zusammenhängende Auswahlfläche; die sichtbare globale CTA `Kara abspielen` liegt separat darunter, ist vollbreit und mindestens 48px hoch. Es entstehen keine verschachtelten Buttons.
- Gäste erhalten statische Informationskarten. Bereite Segmente erhalten darunter einen globalen sekundären Linkbutton mit Schloss und `Anmelden zum Abspielen` nach `/login`. Nicht bereite Segmente erhalten unabhängig vom Loginzustand eine statische Karte mit `Noch nicht abspielbar`; nicht ausführbare Karten werden nicht als disabled Button oder falsches Fokusziel gerendert.

### Auswahl und Player

- Genau ein Segment kann ausgewählt sein. Spursegment und korrespondierende Karte teilen denselben Zustand und zeigen ihn mit 2px Primärfarbrahmen, ruhiger Primärfarbfläche und `aria-pressed="true"`; Farbe ist nicht der einzige Indikator.
- Klick/Tap sowie Enter/Leertaste auf spielbaren Segmenten wählen und starten das Segment. Der vorherige Stream wird vor dem Wechsel pausiert, seine `src` entfernt und das Mediaelement neu geladen.
- Der große Player erscheint direkt unter Timeline und Karten innerhalb derselben Kara-Sektion. Er ist 100 % breit, 16:9, maximal 70vh hoch, schwarz hinterlegt und mit 12px Radius versehen. Sein zugänglicher Name lautet `Kara: {Segmentname}`.
- Der Playerzustand ist lokal: Laden, Wiedergabefehler und Segmentwechsel dürfen Gallery, Texte oder Vollfolgenplayer nicht blockieren. Beim Unmount wird der Stream ebenfalls beendet.
- Auswahlübergänge dauern 120–160ms und verändern nur Border, Hintergrund und Opazität; kein Layoutsprung und kein Zoom. Unter `prefers-reduced-motion: reduce` entfallen Übergänge und Smooth-Scroll.
- Ein Kara-Deep-Link darf öffentliche Segmentinformationen hervorheben. Autoplay findet nur bei aktiver Session und technisch bereitem Segment statt; für Gäste erzeugt derselbe Link keinen Streamversuch. Der statische Login-Link bleibt derselbe wie ohne Deep-Link.

---

## Content Section Contracts

### Bilder

- Alle Bilder stehen in einem gemeinsamen Raster; keine Kategorie- oder Herkunftsgruppen-Kapitel. Kategorie und Uploader/Autor stehen als Badge beziehungsweise Metazeile in jeder Karte.
- Die ganze 16:9-Bildfläche ist ein `Button variant="ghost"` und öffnet die vorhandene Originalansicht/Lightbox. Alt-Text verwendet Caption, sonst das Kategorienlabel; der Maximize-Icon ist dekorativ.
- Bildbeschreibung ist auf 2 Zeilen gekürzt. Metadaten umbrechen innerhalb der Karte und dürfen die Rasterspalte nicht verbreitern.
- Spalten: 2 bei ≤900px und 3 ab 901px, einschließlich Large Desktop. Mobile bleibt trotz kleiner Breite bei genau 2 erkennbaren Bildern pro Zeile.
- Nachladen bleibt In-Page, erhält einen lokalen Loadingzustand und einen lokalen Fehler. Bereits sichtbare Bilder bleiben bei Fehler erhalten.

### Teamtexte

- Gruppierung erfolgt nach konkreter Release-Rolle, nicht als Ersatz nach gesamter Fansubgruppe. Herkunftsgruppe, Membername, Avatar/Fallback, Rolle und Datum bleiben Metadaten der jeweiligen Textkarte.
- Desktop nutzt zwei Rollen-Spalten, sofern jede mindestens 320px breit ist. Tablet/Mobile nutzt eine Spalte. Textkörper bleiben auf maximal 68ch begrenzt; freie Restbreite darf ergänzende Metadaten tragen, aber keine leere rechte Halbseite erzeugen.
- Lange Texte sind initial auf 6 Zeilen gekürzt. `Weiterlesen` öffnet genau diese Karte am selben Ort, `Weniger anzeigen` schließt sie wieder. Das Element ist ein globaler `Button variant="ghost"`; keine Text-Unterseite und kein Modal.
- Zusätzliche Texte werden innerhalb derselben Sektion geladen. Bei acht vorhandenen Einträgen erscheinen initial höchstens drei vollständige Karten; der vorhandene Reveal-/Cursor-Seam legt die übrigen frei. Loading/Error bleibt lokal, bereits geöffnete Karten behalten ihren Zustand anhand stabiler Note-ID.

### Release-Beteiligte

- Diese Sektion erhält ausschließlich `detail.contributors` der aktuellen `release_version_id`; keine Projekt- oder Gruppenmitglieder als Fallback.
- Jede Person zeigt Avatar/Fallback, Name und alle konkreten Rollen dieser Release-Version. Doppelte Person-/Rollen-Paare werden visuell nicht dupliziert.
- Desktop nutzt ein `auto-fit`-Raster ab 220px Kartenbreite, Tablet zwei Spalten, Mobile eine Spalte. Karten verwenden eine flache, nicht horizontal scrollende Darstellung.

### Vollständige Episode

- Die Sektion liegt nach Beteiligten und vor Release-Navigation und bleibt visuell sekundär. Sie erscheint nur bei `can_play && stream_ready` aus dem bestehenden zentralen Resolver.
- Aktion ist `Button variant="secondary"`; der bestehende fokussierte `Modal size="lg"` und die Stream-/Cleanup-Logik bleiben unverändert. Nutzer ohne Recht, Gäste und technisch nicht bereite Episoden sehen weder Abschnitt noch Hinweis.

### Release-Navigation

- Verwendet `AdjacentNavigation variant="inline"` als letzten Seitenblock im normalen Dokumentfluss. Eine zusätzliche Next-only-Instanz steht im Hero-Footer nach den Details. Beide nutzen dieselbe Route-Seam; niemals `floating`, `position: absolute` oder Überlagerung von Medien/Karten.
- Desktop/Tablet zeigt vorherigen Release links und nächsten rechts. Mobile stapelt beide als mindestens 48px hohe, vollbreite Ziele; vorheriger Release zuerst, nächster danach.
- Fehlende Richtung wird vollständig ausgelassen. Labels bleiben `Episode {n} · Version {v}` und die auf Phase 103 festgelegte gruppentreue Zielauflösung bleibt unangetastet.

---

## Authentication and State Matrix

| Zustand | Segmentinfo | Kara-Aktion | Segmentstatus | Vollfolge |
|---------|-------------|-------------|---------------|-----------|
| Gast + Segment bereit | Vollständig sichtbar | Schloss + `Anmelden zum Abspielen` → `/login`; kein Stream/Autoplay | Keine technische Diagnose | Nicht gerendert |
| Gast + Segment nicht bereit | Vollständig sichtbar | Nicht gerendert | `Noch nicht abspielbar` | Nicht gerendert |
| Aktive Session + Segment bereit | Vollständig sichtbar | `Kara abspielen` | Auswahl/Player lokal | Nur bei positivem Vollfolgenrecht und bereitem Stream |
| Aktive Session + Segment nicht bereit | Vollständig sichtbar | Nicht gerendert | `Noch nicht abspielbar` | Unabhängig zentral auflösen |
| Refresh-Session ohne Access-Token | Wie aktive Session; zentraler API-Client erneuert | Keine falsche Gast-/Login-Darstellung während Refresh | Lokal zur Karte | Zentraler Resolver nach Refresh |
| Kara-Streamfehler | Inhalte bleiben sichtbar | Retry durch erneute Aktion möglich | Öffentliche Fehlermeldung ohne Diagnose | Nicht betroffen |

`hasAccessToken || hasRefreshToken` definiert für die Darstellung eine aktive Session. Keine Komponente liest Token/Cookies direkt, baut Bearer-Header oder ruft Keycloak-Refresh-Helfer auf. Die UI bildet Segment- oder Vollfolgenrechte nicht lokal nach.

---

## Accessibility and Interaction Quality

- DOM-Reihenfolge entspricht der sichtbaren Reihenfolge und bleibt bei allen Breakpoints gleich.
- Alle spielbaren Segmentmarken/-flächen sind native Buttons oder globale `Button`-Primitives. Enter und Leertaste funktionieren; der Gast-Login-Link ist ein sinnvolles Fokusziel, nicht bereite Segmente erzeugen keine bedeutungslosen Tabstopps.
- Timeline-Controls erhalten einen zugänglichen Namen mit Typ, Segmentname, Start–Ende und Dauer. Auswahl wird zusätzlich mit `aria-pressed` und sichtbarem Rahmen kommuniziert.
- Typen sind immer als Text sichtbar; Information hängt nie allein von Grün/Blau/Violett/Gold/Pink ab.
- Fokus nutzt den globalen 2px-Outline plus Offset und wird in Cards, Timeline und Navigation nicht abgeschnitten. Kontrastziel ist WCAG AA: 4.5:1 für normalen Text und 3:1 für große Texte/Bediengrenzen.
- Touchziele: Kara-CTA und mobile Navigation mindestens 48px, sonstige interaktive Ziele mindestens 44px. Zwischen benachbarten Timeline-Hit-Zonen bleibt eine eindeutige Auswahl möglich.
- Playerwechsel verschiebt Fokus nicht automatisch. Ein `aria-live="polite"`-Text kündigt `Kara {Name} ausgewählt` an; Video-Steuerelemente bleiben direkt danach in der Tab-Reihenfolge.
- Originalbild-Lightbox und Vollfolgen-Modal behalten Fokusfalle, Escape-Schließen und Fokusrückgabe der bestehenden globalen Overlays.
- Section Loading/Error ist lokal; keine globale Ladefläche ersetzt bereits geladene Inhalte.

---

## Component Inventory and Reuse Contract

| Oberfläche | Verbindlicher Seam | Vertrag |
|------------|--------------------|---------|
| Seitenreihenfolge | `releaseDetailPageData.tsx` | Bestehende Datenkomposition umordnen; keine neue Route/DTO/API |
| Hero | `ReleaseDetailHero.tsx`, `Accordion`, `Card nestedFlat` | Primärfakten sichtbar, Sekundärdetails progressiv, Beteiligtenliste aus Hero lösen |
| Karas | `ThemeTimeline.tsx`, Vergleich `PublicReleaseBlock.tsx` | Vorhandene Auswahl-, Deep-Link-, Streamwechsel- und Cleanup-Logik erhalten; Darstellung gezielt neu komponieren |
| Abspielaktion | `Button` + Lucide `Play` | Keine nativen lokal gestylten Play-Buttons |
| Segmentflächen | `Card flat`, `Badge` plus lokale Typmodifikatoren | Keine neue globale domain-spezifische Kara-Komponente erforderlich |
| Gallery | `ReleaseGallery.tsx`, vorhandene Lightbox | Ein gemeinsames Raster und bestehendes Nachladen/Originalbild-Seam |
| Texte | `ReleaseNotesList.tsx`, `RichTextRenderer` | Rollenraster und kartenspezifisches Aufklappen; kein zweiter Renderer |
| Beteiligte | `ContributorsRow.tsx` | Nur Release-Version-Projektion; responsive Grid statt Scroller |
| Vollfolge | `ReleaseEpisodePlayer.tsx`, `Button`, `Modal` | Rechte-/Auth-/Streamseam nicht neu entwerfen |
| Releasewechsel | `ReleaseNavigation.tsx`, `AdjacentNavigation inline` | Gruppentreue Phase-103-Navigation im Seitenfluss |

Es entstehen keine neue Medienzuordnung, kein paralleler Player, keine Rechteverwaltung, keine Unterseiten und keine neue globale State-Schicht.

---

## Verification Contract

- Visuelle Live-UAT auf 390, 768, 1024 und 1440 px, jeweils ohne horizontalen Überlauf.
- Zustände: Gast, normal eingeloggter Nutzer/Fansubber, Nutzer mit Vollfolgenrecht sowie aktive Refresh-Session ohne Access-Token.
- Datenvarianten: ohne Preview/Logo, ohne Karas, nicht bereites Segment, ohne Bilder, ohne Texte, nur Textinhalt, viele Bilder, langer Teamtext, eine/mehrere Fansubgruppen und fehlender vorheriger/nächster Release.
- Interaktionen: Timeline-/Karten-Auswahl, schneller Segmentwechsel mit Stop des alten Streams, Deep-Link ohne Gast-Autoplay, Playerfehler, Gallery-Lightbox, `Weiterlesen`/`Weniger anzeigen`, Nachladefehler und Inline-Release-Navigation.
- Tastaturprüfung: vollständige Tab-Reihenfolge, Enter/Leertaste, Escape in Overlays, sichtbarer Fokus und keine Tabstopps auf statischen Segmenten.
- Zielbildvergleich: Kara beginnt unmittelbar nach Hero; Desktop-Kara nutzt volle Breite; Mobile zeigt keine Episodenleiste; Navigation überlagert keinen Inhalt.

---

## Registry Safety

| Registry | Verwendete Blocks | Safety Gate |
|----------|--------------------|-------------|
| shadcn official | Keine | Nicht anwendbar — shadcn nicht initialisiert |
| Drittanbieter | Keine | Nicht anwendbar — keine Registry-Abhängigkeit |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-19
