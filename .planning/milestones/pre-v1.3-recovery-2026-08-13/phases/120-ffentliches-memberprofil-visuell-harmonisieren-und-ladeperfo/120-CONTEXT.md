# Phase 120: Öffentliches Memberprofil visuell harmonisieren und Ladeperformance optimieren - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 120 harmonisiert das bestehende öffentliche Memberprofil visuell und optimiert dessen initiales Laden und interaktives Mounting. Die Phase beruhigt den Profilkopf, nutzt Desktop-Flächen mit einem kontrollierten Wechsel aus Vollbreite und Zweispalten, etabliert eine einheitliche H2/H3-Hierarchie mit der globalen Team4s-Weinlinie, verbessert die Erfassbarkeit der bestehenden Badge-Sammlungen und staffelt teure Bild-/Carousel-Arbeit ohne Layoutsprünge.

Die Phase verändert keine Badge-Schwellen, Punktequellen, Freischaltregeln, Profilinhalte oder neuen Profilfunktionen. Die in Phase 118/119 festgelegten Sammlungs- und Carousel-Verträge bleiben verbindlich.

</domain>

<decisions>
## Implementation Decisions

### Profilkopf und Member-Hintergrund
- **D-01:** Der vom Member hochgeladene und zugeschnittene Hero-Hintergrund bleibt vollflächig sichtbar. Die Darstellung darf weder Helligkeit noch eine bestimmte Motivseite voraussetzen und muss den gespeicherten Zuschnitt respektieren.
- **D-02:** Gewählt ist Sketch 004 Hero B: Eine moderate, weich auslaufende Lesbarkeitszone liegt nur hinter den Informationen. Textschatten und kompakte Informationsflächen sichern helle und dunkle Uploads ab, ohne das Bild durch eine starke Vollflächenabdunklung zu entwerten.
- **D-03:** Der Name ist die dominante Information. Verifizierungs-/Aktivstatus stehen ruhig daneben; die Punktzahl erscheint kompakt darunter. Bio und Aktivitätsmetadaten bleiben untergeordnet lesbar.
- **D-04:** Breadcrumb und Aktionen bleiben als schmale, visuell zurückhaltende Werkzeugleiste oberhalb des Hero. `Korrektur melden` darf den Profilkopf nicht visuell dominieren; eine zurückhaltende Overflow-/Sekundäraktion ist zulässig.
- **D-05:** Mobile verwendet einen kompakten einspaltigen Hero mit ungefähr 100 px Avatar, vollständigen Textinformationen, kontrolliert umbrechenden Aktionen und ohne horizontalen Überlauf.

### Desktop-Flächen, Hierarchie und Abschnittsrhythmus
- **D-06:** Desktop wechselt bewusst zwischen Vollbreite und Zweispalten. Fansub-Geschichte plus Gruppenzugehörigkeit sowie aktuelle plus frühere Beiträge bilden Zweispalten-Paare. Aktuelle Projekte und Auszeichnungen bleiben vollbreit.
- **D-07:** Hauptabschnitte verwenden eine einheitliche H2-Hierarchie; Card-Titel verwenden H3. Unter jeder H2 liegt die globale weinrote Team4s-Linie über `--ui-line: #82122c`; keine neue lokale Rotfarbe wird eingeführt.
- **D-08:** Gewählt ist Sketch 004 Rhythmus C: mittlerer vertikaler Rhythmus mit abwechselnd leicht abgesetzten Vollbreitenbändern. Die Weinlinie verbindet Überschrift und Inhalt; Mobile fällt vollständig auf eine Spalte zurück.
- **D-09:** Abgesetzte Bänder bleiben ruhig und subtil. Sie dürfen weder Hero noch Badge-Artwork konkurrieren und müssen auf allen Viewports ohne horizontales Clipping funktionieren.

### Badge-Erfassbarkeit
- **D-10:** Alle bestehenden Badge-Kategorien bleiben untereinander sichtbar. Jede Kategorie erhält einen klaren H2-Abschnitt mit Weinlinie und ihr eigenes Focal-Carousel beziehungsweise bei nur einer Sammlung eine ruhige Einzelkarte.
- **D-11:** Das etablierte Sammlungsmuster bleibt: höchste aktuelle Stufe als großes Artwork, vollständige kompakte Stufenleiste darunter, erreichte Stufen farbig, zukünftige Stufen gedimmt und gesperrt.
- **D-12:** Ohne Interaktion sind Rang, aktueller Wert, nächstes Ziel und Restmenge sichtbar.
- **D-13:** Kategorien mit mehreren Sammlungskarten zeigen einen klaren Kartentitel und einen kompakten Zähler im Format `n von m Sammlungen`. Zusätzliche Positionspunkte, Tabs oder eine zweite Navigationsebene werden nicht eingeführt.
- **D-14:** Phase 118/119 bleiben fachlich und visuell verbindlich: Rollen, Fortschritt, Punkte-Meilensteine, Beiträge, Mitgliedschaft und besondere Auszeichnungen behalten ihre festgelegte Sammlung, Reihenfolge und Earned-/Locked-Semantik.

### Lade- und Rendering-Verhalten
- **D-15:** Werkzeugleiste, Hero sowie das erste Inhaltspaar aus Geschichte und Gruppenzugehörigkeit sind beim ersten sichtbaren Render vollständig vorhanden. Projekte, Badge-Bereiche und Beiträge werden erst kurz vor dem Sichtbereich interaktiv aktiviert.
- **D-16:** Noch nicht aktivierte tiefe Bereiche reservieren ihre endgültige Fläche und zeigen ruhige, strukturgleiche Skeletons. Überschrift und Weinlinie bleiben sichtbar; Skeleton und Endinhalt müssen dieselben relevanten Abmessungen beziehungsweise Seitenverhältnisse besitzen.
- **D-17:** Es darf auf Mobile, Tablet oder Desktop keine wahrnehmbare Layoutverschiebung und kein Ruckeln geben. Bilder reservieren ihre Maße vor dem Laden; Skeleton-Wechsel, Schriftlayout, Badge-Artwork und Carousel-Mounting dürfen nachfolgende Inhalte nicht verschieben. Keine Größenanimation beim Austausch.
- **D-18:** Badge-/Profilinhalte bleiben serverseitig vorhanden und lesbar. Nur teure Carousel-Interaktion wie Messung, Drag, Momentum und Snap wird kurz vor Sichtbarkeit aktiviert.
- **D-19:** Avatar und Hero-Hintergrund erhalten Ladepriorität. Projektbilder und Badge-Artworks laden gestaffelt/lazy mit vorab reservierten Abmessungen und korrekten responsiven Bildgrößen.
- **D-20:** Rasterbilder werden für die Auslieferung als gecachte responsive WebP-Derivate bereitgestellt; die Originaldateien bleiben unveränderte Arbeits-/Quellassets und werden im Normalfall nicht an die Profilseite ausgeliefert. Der Browser wählt über dokumentierte `srcset`-/`sizes`-Semantik die zur tatsächlichen Darstellungsgröße passende Variante. Derivate werden nicht bei jedem Seitenaufruf neu erzeugt.
- **D-21:** Badge-Artwork erhält mindestens zwei auf den realen Einsatz abgestimmte WebP-Größenklassen: ungefähr 128–160 px für kleine Stufen und 512–640 px für die große aktive Medaille. Konvertierung erfolgt verlustfrei oder visuell verlustarm; Alpha-Transparenz, Farben und saubere Kanten müssen erhalten bleiben. Fehlende Derivate benötigen einen sicheren Original-Fallback.
- **D-22:** Hero, Avatar und Projektbilder folgen demselben responsiven Derivatprinzip mit domänengerechten Größenstufen. Research bestimmt die konkreten Breiten aus den realen CSS-/Viewport-Größen und verhindert unnötig große Downloads auf Mobile, Tablet und Desktop.

### the agent's Discretion
- Technische Beseitigung der doppelten Profilabfrage zwischen `generateMetadata()` und Seitenrender, solange Auth-/Sichtbarkeitsverhalten korrekt bleibt.
- Konkrete Cache-/Memoization-Seam, exakte Hero-/Avatar-/Projektbreiten, `sizes`-Werte, IntersectionObserver-Schwellen, Skeleton-Komponenten und Mounting-Grenzen, solange D-15 bis D-22 messbar erfüllt sind.
- Exakte Bandtönung, Abstände und Breakpoints innerhalb des gewählten Sketch-004-Zielbilds und des globalen UI-Systems.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Abgenommenes Phase-120-Zielbild
- `.planning/sketches/004-memberprofil-hero/index.html` — interaktiver Gewinnervergleich mit Hero B, Rhythmus C, realistischen Profilinhalten, echten Badge-Assets und responsiven Vorschauen.
- `.planning/sketches/004-memberprofil-hero/README.md` — Gewinnerbegründungen und verbindliche Designfragen.

### Badge- und Carousel-Verträge
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-CONTEXT.md` — Rollen-Sammlung, globales Focal-Carousel, Interaktion, Reduced Motion und responsive Regeln.
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-UI-SPEC.md` — visuelle und responsive Sammlungskarten-Referenz.
- `.planning/phases/119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha/119-CONTEXT.md` — Kategorien, Sammlungskarten, Stufenleiste, Inline-Raster und Reihenfolge.

### Team4s UI- und Implementierungsvertrag
- `frontend/src/styles/globals.css` — globaler Token `--ui-line: #82122c` und weitere UI-Tokens.
- `frontend/src/components/ui/ui.module.css` — bestehende Verwendung der Weinlinie und globale UI-Muster.
- `frontend/src/components/fansubs/FansubTeamSection.module.css` — öffentliche Fansub-Seam mit `--ui-line` als vom Nutzer genannte visuelle Referenz.
- `docs/frontend/ui-system.md` — globaler UI-Komponenten- und Tokenvertrag.
- `docs/agent-guidelines-ui.md` — responsive, semantische und visuelle Ausführung.
- `docs/engineering/implementation-contract.md` — Search-first, bestehende Seams erweitern, keine parallelen Helfer.
- `AGENTS.md` — deutsche Umlaute, Live-Browser-UAT, kleine Diffs und Projektregeln.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/members/[slug]/page.tsx` und `page.module.css` — öffentliche SSR-Profilroute, bestehende Abschnittsreihenfolge und aktuell doppelte Profilabfrage über Metadata plus Render.
- `frontend/src/components/profile/MemberProfileHero.tsx` und `profile.module.css` — bestehender Hero, Avatar, Hintergrund, Status und Punktzahl.
- `frontend/src/components/profile/MemberBadgeChain.tsx` und `MemberBadgeChain.module.css` — aktuelle Badge-Kategorien, Sammlungskarten und Inline-Raster.
- `frontend/src/components/ui/FocalCarousel.tsx` — einzige globale Carousel-Seam; Interaktion soll hier beziehungsweise über ihre bestehende Integrationsgrenze verzögert aktiviert werden.
- `frontend/src/components/profile/LatestContributionsSection.tsx` und bestehende Profilsektionen — Integrationspunkte für Zweispalten-Paare und gestaffeltes Rendering.

### Established Patterns
- Öffentliche Profilbreite verwendet `--public-page-max-width` und `--public-page-gutter`.
- Badge-Inhalte sind serverseitig geliefert; Earned-/Locked-Logik und Stufenfamilien stammen aus Phase 118/119.
- Die globale Weinlinie ist ein bestehender Design-Token und wird nicht lokal neu definiert.
- `FocalCarousel` besitzt bereits zentrale Drag-/Snap-/Messlogik; keine consumer-lokale Carousel-Implementierung.

### Integration Points
- Die SSR-Route muss Profilfetch, Metadata, Auth-/Hidden-Profile-Verhalten und Bildprioritäten gemeinsam betrachten.
- Responsive Layoutänderungen betreffen die Page-Sektionsebene, nicht die fachliche Badge-Projektion.
- Lazy-Aktivierung benötigt stabile reservierte Maße an Projekten, Badge-Sammlungen, Beitragssektionen und Carousel-Containern.

</code_context>

<specifics>
## Specific Ideas

- Der Nutzer legte besonderen Wert darauf, dass ein Member jedes beliebig helle oder dunkle Hero-Bild selbst hochlädt und zuschneidet. Der Upload darf durch die Kontrastbehandlung nicht unsichtbar werden.
- Die zunächst fehlerhafte Mobile-Sketchdarstellung wurde korrigiert; kein Text, keine Cards und keine Aktionen dürfen aus dem schmalen Container laufen.
- Die weinrote Linie soll bewusst als durchgehendes Team4s-Muster aus der bestehenden Fansub-/UI-Seam übernommen werden.
- Der Nutzer formulierte ausdrücklich: kein Ruckeln auf Mobile, Tablet oder Desktop.
- Empfohlene Badge-Pipeline des Nutzers: Original-PNG als Arbeitsdatei behalten, WebP ungefähr 128–160 px für kleine Stufen und 512–640 px für große aktive Medaillen ausliefern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 120-öffentliches-memberprofil-visuell-harmonisieren-und-ladeperformance-optimieren*
*Context gathered: 2026-08-04*
