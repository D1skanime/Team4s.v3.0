# Phase 152 — USER REQUEST (verbindlicher Originalauftrag)

Phase 152 – Public Fansub Group Profile: technische Konsolidierung und Modernisierung

## Arbeitsumgebung

Diese Phase wird vollständig auf der bestehenden Team4s-Linux-VM geplant und ausgeführt.

Verbindlich:

- Repository, GSD, Tests, Build und Agentenläufe auf Linux
- Windows nur als Kommunikations-/Steuerungsoberfläche
- aktuellen `main`-Stand verwenden
- vor Änderungen Branch, HEAD und `git status` dokumentieren
- keine History-Rewrites
- keine Force-Pushes
- keine fremden Änderungen überschreiben
- bestehende funktionierende Architektur respektieren
- insbesondere Phase 150/151 nicht durch parallele neue Lösungen umgehen

## Ziel

Die öffentliche Fansub-Gruppenseite `/fansubs/[slug]` ist grundsätzlich solide aufgebaut, besitzt aber
mehrere gewachsene technische Schulden und einige echte Defekte.

Phase 152 soll **keinen Rewrite** durchführen.

Ziel ist eine gezielte Konsolidierung der tatsächlich belegten Probleme in vier Workstreams:

1. History / Achievements / Image Performance
2. Public Data Flow / SQL / unnötige Daten
3. UI-/CSS-Codequalität und kleine strukturelle Doppelungen
4. Tests / Accessibility / moderne Nutzung vorhandener Team4s-/Next.js-Infrastruktur

## Ausgangslage

Der abgeschlossene Audit hat unter anderem folgende Punkte belegt:

- Public-Seite insgesamt gut komponentisiert
- kein N+1
- konstantes Query-Budget
- gute Repository-Queries
- gutes Rich-Text-Read-Rendering
- vorhandene UI-Primitives werden sinnvoll genutzt

Gleichzeitig wurden folgende Probleme gefunden:

- paralleles altes Badge-Präsentationssystem auf Public Fansub
- große eager PNG-Auslieferung in History
- Next Image Optimizer für History-Assets nicht freigeschaltet
- achievement-spezifische Größen-/Breakpoint-Sonderlogik
- `publicDomainTerms`-String-Rewrite verfälscht Freitext
- Tiptap-Link-Contract-Drift
- fünf unnötige Public-Queries bzw. doppelte Datenladung
- ungenutzte Contributors-Projektion
- tote CSS-Blöcke
- doppelte Initialenlogik
- schwache Page-Kompositionstests
- fehlendes Query-Budget-Gate
- fehlende axe-Abdeckung
- weitere kleinere Typisierungs-/Modernisierungsmöglichkeiten

## Grundprinzipien

### Keine neue Parallelarchitektur

Wenn Team4s bereits eine gemeinsame Lösung besitzt, diese wiederverwenden.

Insbesondere:

- Phase-151-`AchievementArtwork`
- `ResponsiveImage`
- `FocalCarousel`
- `Modal`
- `RichTextRenderer`
- vorhandene UI-Primitives
- vorhandene Query-Counter-Infrastruktur
- vorhandene axe-/jest-axe-Infrastruktur

### Keine künstliche Modernisierung

Nicht einführen:

- neue UI-Library
- neues State Management
- neues Data-Fetching-Framework
- neue Carousel-Library
- neue Modal-/Dialog-Library
- neue Rich-Text-Library
- neues CSS-Framework

Modernisierung heißt hier: **vorhandene Team4s-/React-/Next.js-Funktionen konsequenter und sauberer verwenden.**

## Workstream A – History / Achievements / Image Performance

### A1. Next Image Optimization freischalten

History-Assets unter `/history-event-badges-transparent/**` für die bestehende Next-Image-Pipeline freigeben.

Verifizieren:

- `/_next/image` liefert 200 statt 400
- WebP wird ausgeliefert
- srcset vorhanden
- Lazy Loading funktioniert
- Master-PNGs bleiben unverändert

Keine pauschale Asset-Konvertierung.

### A2. Public-History auf gemeinsamen Artwork-Slot migrieren

`FansubHistorySection` soll künftig `AchievementArtwork` bzw. die Phase-151-Artwork-Infrastruktur nutzen.

Wichtig:

- Timeline bleibt Timeline
- Gruppen-History-Registry bleibt eigene Domäne
- eigene History-Assets bleiben
- Member-spezifischer Badge-Code-Resolver wird nicht übernommen
- geteilt wird nur die Presentation-/Artwork-Schicht

### A3. Alte Badge-Geometrie entfernen

Entfernen:

- `--history-badge-size`
- sämtliche zugehörige Badge-Größen-Breakpoints
- `releases_10000`-Sondergröße
- achievement-spezifische Größenlogik
- unnötige Pixel-Shifts

Pixel-Shifts nicht einfach in eine Registry verschieben.
Nur wenn ein konkretes Asset nach visueller Prüfung objektiv falsch zentriert ist, Root Cause sauber lösen.

### A4. Achievement-Metadaten datengetrieben machen

`achievementEventStyle(...)` bzw. harte `eventType`-If-Ketten beseitigen.

Bestehende `GROUP_HISTORY_EVENT_OPTIONS` erweitern, z. B. mit `emphasis` und `publicLabel`.

Keine zweite Registry anlegen.

### A5. `publicDomainTerms` entfernen

Admin-Freitexte dürfen nicht verändert werden.
Statische Public-Labels gehören direkt in die Registry.
Tests ergänzen, die zeigen, dass Freitext wie z. B. "Projektor gekauft" unverändert bleibt.

### A6. Bildperformance messen

Vorher/Nachher dokumentieren: Größe eines typischen History-PNG, initiale Gesamtlast,
optimierte Größe, Gesamtlast nach Migration, prozentuale Reduktion.

## Workstream B – Public Data Flow / SQL

### B1. Public-spezifische Gruppenhydration prüfen

`GetPublicProfileBySlug` erbt aktuell mehrere Daten, die Public nicht benötigt.
Prüfen und gezielt reduzieren: `anime_relations_count`, `projects_count`, `members_count`,
`aliases_count`, doppelte `group.links`.

Ziel: Public-Profil nur mit den Feldern hydratisieren, die Public tatsächlich braucht.
Keine Monster-Query bauen.

### B2. Doppelte Link-Ladung beseitigen

Aktuell werden Links über `attachGroupLinks` und zusätzlich `ListGroupLinks` geladen.
Nur eine Quelle für den Public-Pfad verwenden. Bestehende andere Konsumenten nicht beschädigen.

### B3. Ungenutzte Contributors-Projektion

Die Public-Seite nutzt `domainProjection.contributors` nicht.
Prüfen, ob ein Public-spezifischer Projektionspfad oder eine optionale Projektion sinnvoll ist.

Wichtig: keine unnötige Endpoint-Verschmelzung; `public-profile` und `domain-projection` dürfen
fachlich getrennt bleiben; nur Public-spezifische unnötige Daten vermeiden.

### B4. Query-Budget absichern

Query-Counter-Test ergänzen. Sicherstellen: konstante Query-Anzahl, kein Wachstum mit Projekten,
Mitgliedern, History, Media.

Wenn durch B1/B2/B3 Query-Anzahl sinkt, neuen Sollwert dokumentieren.
Keine Optimierung nur um einer kleinen Zahl willen.

## Workstream C – UI-/CSS-Codequalität

### C1. Totes History-CSS entfernen

Die im Audit identifizierten ungenutzten Klassen erneut verifizieren und entfernen:
`ach`, `achGrid`, `achImage`, `achBody`, `achNote`, `achType`, `achYear`, `historyEntry`,
`medal`, `milestoneEntry`, `projectYear`.

Nur wirklich tote Klassen löschen.

### C2. Breakpoint-/CSS-Konsolidierung

Nicht die ganze Seite neu schreiben. Aber im tatsächlich angefassten Bereich:
doppelte Breakpoint-Blöcke zusammenführen, History-spezifische Geometrie-Breakpoints entfernen,
vorhandene Design-Tokens nutzen, harte Achievement-Hex-Farben soweit sinnvoll auf Tokens /
`color-mix` umstellen.

Andere stabile Komponenten-CSS nicht grundlos anfassen.

### C3. Initialenlogik konsolidieren

`FansubHeroSection.buildInitials` gegen `fansubTeamInitials.getMemberInitials` prüfen.
Wenn fachlich identisch: gemeinsame Utility verwenden, doppelte Implementierung entfernen.
Wenn fachlich unterschiedlich: Unterschied dokumentieren und belassen.

### C4. Kleine Typisierungsschuld

`CATEGORY_TAG_CLASS` prüfen. Falls aktuell `Record<string, ...>`: auf bestehende oder neu sauber
definierte Union heben; neue Kategorien sollen compilezeit-sichtbar werden.
Nur wenn ohne großen Scope möglich.

### C5. `Promise.allSettled([single])`

Wenn weiterhin vorhanden: auf klaren `try/catch`-Pfad vereinfachen.
Nur als kleine Lesbarkeitsbereinigung. Keine Architekturänderung daraus machen.

## Workstream D – Tiptap / Accessibility / Tests

### D1. Tiptap-Link-Contract schließen

Frontend und Backend müssen denselben Contract besitzen.
Bevorzugt `link: false` im StarterKit, sofern Gruppen-Geschichten keine Links unterstützen sollen.
Wenn Links fachlich gewünscht sind: Backend-Allowlist, Rendering, Sanitizer, URL-Policy und Tests
vollständig implementieren. Keine halbe Lösung.

### D2. Tiptap-Sanitizer-Härtung prüfen

Audit-Findings: beliebige `class`-Attribute auf `span`, `td`, `th`; `h1` im Rich-Text erlaubt.
Prüfen und, wenn ohne Seiteneffekt möglich: `class` auf erlaubtes Farbtoken-Muster einschränken,
`h1` aus Rich-Text-Policy entfernen. Tests ergänzen.

### D3. Accessibility-Fixes

Mindestens: Timeline-Achsenjahr `aria-hidden`; kein doppeltes Jahr im Accessibility Tree;
Media-Thumbnail nicht doppelt beschriften; sinnvolle Button-/Image-Labels.

### D4. axe-Abdeckung

Vorhandene Infrastruktur nutzen. Mindestens: `FansubHistorySection`, `FansubGroupMediaBlock`,
ggf. eigentliche Public-Page-Komposition.

### D5. Page-Kompositionstests

Die Route selbst hat bislang nur sehr geringe Abdeckung. Tests ergänzen für:
Sektionen erscheinen nur bei passenden Daten; leere Zustände; fehlende Story; fehlende History;
fehlende Media; Fallback bei fehlgeschlagener Domain Projection; 404 / Fehlerzustand;
Hero-Zahlen aus tatsächlich sichtbaren Daten.

Nicht nur Implementation Details testen.

### D6. History-Tests modernisieren

CSS-Klassennamen-Assertions ersetzen durch Verhaltensprüfungen.
Testen: Reihenfolge, Titel, Public-Label, Freitext unverändert, Expand/Collapse, Artwork,
Emphasis, Accessibility.

## Workstream E – Image Pipeline außerhalb History

Nur umsetzen, wenn sauber und risikoarm.

### E1. Hero-Logo

Aktuell offenbar `unoptimized`. Prüfen: kann `ResponsiveImage` oder normales optimiertes `Image`
verwendet werden? Passt `remotePatterns` / lokaler Pfad? Wie groß ist der reale Payload-Gewinn?
Wenn sauber lösbar: umstellen.

### E2. Hero-Banner

Dasselbe prüfen. Wichtig: Banner-Crop / Focal-Verhalten darf nicht kaputtgehen, keine
Layoutverschlechterung, keine Optimierung erzwingen, wenn Backend-/Media-Origin technisch dagegensteht.

### E3. Projekt-Banner

Nur analysieren. Wenn vorhandene Lösung bereits lazy + korrektes `sizes` nutzt und
Image-Optimierung schwierig wäre, belassen.

## Nicht in Phase 152

Explizit ausgeschlossen:

- repo-weites `useMediaQuery`
- `marked`-Entfernung, sofern dafür Backend-Markdownpfade untersucht werden müssten
- kompletter CSS-Breakpoint-Reset der ganzen Public-Seite
- komplette Media-Pipeline aller Team4s-Seiten
- neue große Performance-Fixture-Infrastruktur
- UI-Neudesign
- Public/Edit-Vergleich
- Public/Edit-Angleichung

## Planung

Plan muss:

- in sinnvolle Waves aufgeteilt sein
- Abhängigkeiten korrekt berücksichtigen
- Query-/Backend-Änderungen von UI-Änderungen sauber trennen
- Tiptap separat absichern
- Visual QA als eigener Abschlussblock enthalten
- keine zwei Agenten parallel auf denselben Dateien arbeiten lassen

Beispielrichtung:

- Wave 1: Contracts / Tests / Image-Config / Query-Budget-Grundlage
- Wave 2: History Artwork + Registry + CSS
- Wave 3: Public Data Flow / Hydration
- Wave 4: Tiptap + Accessibility + Testmodernisierung
- Wave 5: Hero-Image-Optimierung, falls nach Prüfung sinnvoll
- Wave 6: Browser-/Performance-/Abschlussverifikation

Waves dürfen nach Codeanalyse angepasst werden.

## Visuelle QA

Nach Umsetzung die gesamte Public-Gruppenseite prüfen, nicht nur History.

Viewports: 320, 390, 520, 768, 1024, 1440, 1920, 2560

Prüfen: Hero, Story, Projekte, Team, History, Media

Besonderer Fokus: Badge-Geometrie, Bildschärfe, keine riesigen Badges, Timeline intakt,
keine Layoutsprünge, keine horizontalen Overflows, Bildoptimierung erzeugt keine Crop-/Focal-Fehler,
Touch / Keyboard, Reduced Motion, Focus, Modal / Lightbox.

## Performance-Verifikation

**API / SQL:** Query-Budget vorher, Query-Budget nachher, welche Queries entfernt wurden,
Nachweis kein N+1.

**Images:** History vorher/nachher, Hero vorher/nachher (falls geändert), Initial-Payload-Differenz.

**Browser:** zusätzliche Requests beim Interagieren, keine Request-Explosion,
keine unnötigen Client-Fetches.

## Definition of Done

Phase 152 gilt nur als abgeschlossen, wenn:

- [ ] History-Badges nutzen Phase-151-Artwork-Slot
- [ ] parallele Badge-Geometrie entfernt
- [ ] History-Image-Optimizer funktioniert
- [ ] kein `releases_10000`-Größensonderfall
- [ ] keine achievement-spezifischen Pixel-Shifts ohne Begründung
- [ ] Public-History datengetriebener
- [ ] `publicDomainTerms` entfernt
- [ ] Admin-Freitext unverändert
- [ ] Tiptap-Contract konsistent
- [ ] Tiptap-Regressionstest vorhanden
- [ ] unnötige Public-Queries geprüft und sinnvolle entfernt
- [ ] doppelte Link-Ladung entfernt
- [ ] ungenutzte Projektion geprüft
- [ ] Query-Budget-Test vorhanden
- [ ] kein N+1
- [ ] totes History-CSS entfernt
- [ ] Initialen-Duplikat geprüft
- [ ] relevante Typisierung verbessert
- [ ] Accessibility-Findings behoben
- [ ] axe-Abdeckung ergänzt
- [ ] Page-Komposition besser getestet
- [ ] History-Tests verhaltensbasiert
- [ ] Hero-Image-Optimierung geprüft und bei klarer Verbesserung umgesetzt
- [ ] mobile bis widescreen visuell geprüft
- [ ] Performance vorher/nachher dokumentiert
- [ ] Frontend-Build PASS
- [ ] relevante Backend-Tests PASS
- [ ] relevante Frontend-Tests PASS
- [ ] unabhängige Abschlussverifikation PASS
- [ ] GSD-Dokumentation abgeschlossen
- [ ] finaler Commit gepusht
