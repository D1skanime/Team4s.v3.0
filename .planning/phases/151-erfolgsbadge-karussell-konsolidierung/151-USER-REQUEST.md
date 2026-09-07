Phase 151 – Erfolgsbadge-/Karussell-Konsolidierung

Arbeitsumgebung

Diese Phase wird vollständig auf der bestehenden Team4s-Linux-VM ausgeführt.

Verbindlich:

- Repository, GSD, Tests, Build, Docker und alle Agentenläufe laufen auf team4s-linux.
- Nicht auf der Windows-VM entwickeln, planen, testen oder ausführen.
- Windows dient ausschließlich als Kommunikations-/Steuerungsoberfläche wie bisher.
- Bestehende Claude-/Codex-/OpenCode-Strukturen nicht verändern, aktualisieren oder ersetzen.
- Keine Runtime-Konfigurationen umbauen, sofern dies nicht zwingend für Phase 151 erforderlich ist.
- Auf dem bestehenden "main"-Stand weiterarbeiten.
- Referenzstand ist der aktuelle Stand nach Phase 150.
- Vor Änderungen zuerst aktuellen Branch, Git-Status und HEAD dokumentieren.

Astra soll mit hohem Reasoning-Level arbeiten.

---

Ausgangslage

Phase 150 ist abgeschlossen.

Der aktuelle Referenzstand enthält bereits zentrale fachliche Badge-Logik. Insbesondere wurden Badge-Schwellenwerte zentralisiert und Doppelberechnungen entfernt.

Diese bestehende Architektur ist verbindlich zu respektieren.

Keine neue parallele Badge-Business-Registry einführen, wenn die vorhandene Phase-150-Struktur bereits die Single Source of Truth für fachliche Badge-Regeln darstellt.

Diese Phase betrifft primär:

- Achievement-/Erfolgsbadge-Darstellung
- Badge-Artwork
- Badge-Karussell
- Responsive UI
- Erweiterbarkeit um neue Rollen
- visuelle Konsistenz
- Performance/Regressionen

---

Problem

Die aktuelle Erfolgsbadge-Darstellung ist visuell inkonsistent.

Insbesondere existieren derzeit unterschiedliche und teilweise mehrfach überschriebene Grössenregeln für Achievement-Bilder.

Bekannte aktuelle Grössen bzw. Overrides umfassen unter anderem:

- 320 × 320 px Basis
- 280 × 280 px
- 248 × 248 px
- Mobile-Regeln im Bereich ca. 204–248 px
- 360 × 360 px
- 410 × 410 px
- bis zu 450 × 450 px auf grossen Displays

Es existieren mehrere sich überlagernde Media-Query-Regeln, teilweise für denselben Mobile-Bereich.

Dadurch entstehen:

- uneinheitliche Badge-Grössen
- optisch überdimensionierte Erfolgsbilder
- unterschiedliche Wirkung je Breakpoint
- schwer nachvollziehbare CSS-Kaskaden
- inkonsistente Darstellung verschiedener Badge-Arten
- unnötig schwierige Wartbarkeit

Die Badge-Motive dürfen unterschiedlich sein.

Die sichtbare Badge-Darstellung muss jedoch einheitlich wirken.

---

Wichtig: Asset-Auflösung nicht reduzieren

Viele vorhandene Badge-Assets besitzen bereits eine hohe Quellauflösung, beispielsweise ca. 1254 × 1254 Pixel.

Diese hohe Quellauflösung soll erhalten bleiben.

Nicht:

- PNG-Dateien künstlich auf kleine Pixelabmessungen reduzieren
- Bilder neu komprimieren, wenn dies Qualität kostet
- unscharfe Low-Resolution-Varianten erzeugen

Stattdessen:

- hochauflösende Assets beibehalten
- im UI deutlich kleiner rendern
- saubere responsive CSS-Grössen verwenden
- "object-fit: contain" bzw. äquivalente verlustfreie Darstellungslogik verwenden
- Retina-/HiDPI-Schärfe erhalten

Ziel:

«kleinere visuelle Badge-Darstellung bei weiterhin scharfem Artwork.»

---

Kernziel

Das komplette Achievement-/Erfolgsbadge-System soll UI-seitig so konsolidiert werden, dass:

1. alle Badge-Arten visuell konsistent wirken,
2. Badge-Bilder deutlich kleiner und ruhiger dargestellt werden,
3. hochauflösende Assets scharf bleiben,
4. Mobile First umgesetzt wird,
5. Tablet, Desktop und Widescreen sauber skalieren,
6. das Karussell ruhig und präzise funktioniert,
7. neue Rollen/Badges ohne Sonderfall-Chaos ergänzt werden können,
8. keine Business-Logik dupliziert wird,
9. keine N+1-/Query-Explosion eingeführt wird,
10. jeder einzelne Badge-Typ visuell geprüft wird.

---

1. Vor jeder Änderung: Codeanalyse

Vor dem Planen und Implementieren zuerst den aktuellen Code vollständig untersuchen.

Mindestens analysieren:

- bestehende Badge-/Achievement-Komponenten
- Achievement-Karussell
- Badge-Artwork-Auflösung
- CSS/SCSS/CSS-Modules
- sämtliche Media Queries für Achievement-Bilder
- vorhandene Badge-Code-Auflösung
- Role Catalog
- Achievement-Artwork-Mapping
- Backend-Badge-Generierung
- Phase-150-Threshold-Logik
- Datenbankzugriffe der Achievement-/Badge-Flows
- bestehende Tests
- mögliche Deduplizierungslogik

Vor Implementierung dokumentieren:

- welche Komponenten beteiligt sind
- welche CSS-Regeln sich aktuell überschneiden
- welche Badge-Familien existieren
- welche Badge-Familien eigene Sonderlogik besitzen
- welche Datenquellen zentral sind
- welche Stellen aktuell noch hart verdrahtet sind

Keine Architekturannahmen treffen, bevor der aktuelle Code überprüft wurde.

---

2. Bestehende Phase-150-Architektur erhalten

Phase 150 hat bereits zentrale fachliche Badge-Regeln geschaffen.

Beispielsweise existiert zentrale Threshold-Logik im Backend.

Diese Logik:

- nicht duplizieren
- nicht ins Frontend kopieren
- nicht durch neue Parallelstrukturen ersetzen

Das Frontend soll keine eigene fachliche Berechnung derselben Badge-Stufen erhalten.

Business-Regeln bleiben in ihrer bestehenden zentralen Quelle.

Phase 151 soll primär die Presentation-/Artwork-Schicht konsolidieren.

---

3. Einheitliche Badge-Darstellung

Eine zentrale Darstellungslogik für Achievement-Badges schaffen.

Ziel ist eine gemeinsame visuelle Bühne bzw. ein gemeinsamer Badge-Slot.

Alle Badge-Arten sollen innerhalb derselben visuellen Fläche dargestellt werden.

Beispielsweise konzeptionell:

- gemeinsamer Container
- definierte maximale Bildfläche
- konsistentes Padding
- zentrierte Darstellung
- erhaltenes Seitenverhältnis
- keine Verzerrung
- keine Badge-spezifischen willkürlichen Grössenwerte

Unterschiedliche Motive sind erlaubt.

Die sichtbare Grösse und Gewichtung innerhalb der Karte soll dennoch vergleichbar wirken.

Besonders prüfen:

- quadratische Rollenbadges
- historische/spezielle Badges
- hochformatige Assets
- Rank-/Tier-Badges
- Rollen-Einstiegsbadges
- Volume-/Milestone-Badges

Ein hochformatiges Badge darf nicht aufgrund seines Seitenverhältnisses visuell riesig erscheinen.

---

4. Responsive Design – Mobile First

Die neue Grössenlogik muss Mobile First aufgebaut werden.

Nicht zuerst grosse Desktop-Werte definieren und danach mit vielen Overrides zurückbauen.

Erwartete Strategie:

1. Mobile Basis
2. Tablet-Erweiterung
3. Desktop
4. Wide Desktop

So wenig Breakpoints wie sinnvoll.

Keine mehrfachen konkurrierenden Media Queries für denselben Bereich, sofern nicht technisch zwingend.

Mindestens prüfen:

Mobile

ca. 320–520 px

Tablet

ca. 600–1024 px

Desktop

ca. 1280–1600 px

Wide Desktop

ca. 1920–2560 px

Die Badge-Darstellung soll auf Widescreen nicht wieder auf 400–450 px anwachsen, nur weil Platz vorhanden ist.

Mehr Bildschirmbreite bedeutet nicht automatisch grössere Badge-Motive.

---

5. Karussell

Das bestehende Achievement-/Badge-Karussell überprüfen und konsolidieren.

Bekannte frühere Probleme:

- träge Bewegung
- Badge bewegt sich „Badge um Badge“
- aktiver Zustand während Bewegung nicht eindeutig
- Nachbarbadge wirkt teilweise grösser als zentrales Badge
- Scroll-Snap und JS-Scroll können gegeneinander arbeiten
- Settling-Verzögerungen
- Reduced-Motion-Verhalten
- verschachtelte Tracks
- unnötige Re-Renders

Diese Punkte anhand des aktuellen Codes erneut verifizieren.

Nicht blind alte Annahmen übernehmen.

Ziel:

- flüssige Bewegung
- eindeutiges aktives Badge
- keine Grössensprünge
- Nachbarn wirken nicht grösser als das aktive Badge
- kein optisches Pumpen
- keine langen Settle-Zeiten
- sauberes Touch-Verhalten
- sauberes Maus-/Trackpad-Verhalten
- Keyboard-Navigation erhalten oder verbessern
- Reduced Motion korrekt unterstützen

---

6. Karaoke FX

"karaoke_fx" ist bereits eine gültige Rolle im fachlichen Modell.

Backendseitig existieren bereits Achievement-Codes nach dem bestehenden Muster, beispielsweise:

- "role_entry_karaoke_fx"
- "role_volume_karaoke_fx_bronze"
- "role_volume_karaoke_fx_silver"
- "role_volume_karaoke_fx_gold"
- "role_volume_karaoke_fx_platinum"

Aktuell fehlt jedoch Achievement-Artwork für Karaoke FX.

Karaoke FX muss vollständig integriert werden.

Erwartet:

- Entry-Badge
- Bronze
- Silber
- Gold
- Platin
- gleiche visuelle Sprache wie bestehende Rollenbadges
- gleiche technische Integration
- keine Sonderbehandlung im Rendering

Das vorhandene Artwork-System analysieren und Karaoke FX nach dessen fachlich korrektem Schema ergänzen.

---

7. Erweiterbarkeit neuer Rollen

Karaoke FX zeigt aktuell eine Architekturlücke:

Eine Rolle kann fachlich existieren und Badge-Codes erzeugen, während die UI kein Artwork besitzt.

Dieses Problem soll strukturell entschärft werden.

Ziel:

Eine neue Rolle soll zukünftig mit möglichst wenigen, klar definierten Schritten integrierbar sein.

Ideal:

1. Rolle im bestehenden Role Catalog vorhanden
2. Artwork hinzufügen
3. ggf. erforderliche Presentation-Metadaten ergänzen
4. Tests ergänzen

Danach soll die Rolle automatisch korrekt in Achievement-Darstellungen funktionieren.

Keine neue Rolle darf künftig wieder stillschweigend ohne Artwork durchlaufen.

Geeignete Validierung hinzufügen, beispielsweise:

- Test über alle Achievement-fähigen Rollen
- Sicherstellung, dass jede unterstützte Rolle erwartetes Artwork besitzt
- bewusste Ausnahmen explizit deklarieren

Keine grosse neue Business-Registry bauen, wenn dies nur eine zweite Wahrheit erzeugen würde.

---

8. Artwork-Mapping untersuchen und konsolidieren

Aktuell existieren teilweise feste Artwork-Zuordnungen für Rollen.

Diese Strukturen prüfen.

Insbesondere untersuchen:

- "USER_ICON_ROLE_ARTWORK"
- layered role artwork
- Motif-Dateien
- Rank-Frame-Dateien
- Namenskonventionen

Prüfen, ob sich die bestehende Namenskonvention stärker nutzen lässt, sodass unnötige manuelle Mapping-Doppelungen reduziert werden.

Aber:

Keine dynamische „Datei existiert vielleicht“-Magie einführen, wenn dies Build-/Bundling-Probleme erzeugt.

Die Lösung muss:

- typsicher bzw. testbar
- explizit
- wartbar
- bundler-kompatibel
- zuverlässig

sein.

---

9. Keine Doppelungen

Besonders prüfen auf:

- doppelte Badge-Codes
- doppelte Achievement-Einträge
- doppelte Rollenlisten
- doppelte Artwork-Definitionen
- doppelte Thresholds
- doppelte Breakpoint-Regeln
- doppelte UI-Komponenten
- parallele Badge-Berechnungen

Bestehende Phase-150-Deduplizierungslogik darf nicht regressieren.

Vorhandene Regressionstests erhalten.

Neue Tests ergänzen, wo sinnvoll.

---

10. Performance / SQL

Die aktuelle Badge-Datenbeschaffung ist bereits teilweise aggregiert.

Beispielsweise werden Rollenfortschritte gruppiert geladen und nicht Badge für Badge einzeln abgefragt.

Diese Eigenschaft muss erhalten bleiben.

Verbindlich:

- kein N+1
- keine SQL-Abfrage pro Badge
- keine SQL-Abfrage pro Rollenkarte
- keine Query-Explosion bei 100+ oder 200+ Badges
- keine unnötigen wiederholten Backend-Aufrufe
- keine Frontend-Nachladeabfrage für jede einzelne Badge-Karte

Bei der Analyse Query-Pfade nachvollziehen.

Wenn Änderungen am Backend nötig werden:

- Query-Anzahl vor/nachher dokumentieren
- aggregierte Datenbeschaffung bevorzugen
- Tests oder geeignete Regression-Sicherung ergänzen

Wenn keine Backend-Änderungen erforderlich sind, ausdrücklich dokumentieren, dass bestehende Query-Strategie erhalten wurde.

---

11. Visuelle Qualitätssicherung

Dies ist für Phase 151 besonders wichtig.

Nicht nur Unit Tests durchführen.

Die Umsetzung muss tatsächlich visuell geprüft werden.

Badge-für-Badge-Prüfung

Jedes verfügbare Achievement-Artwork einzeln prüfen.

Nicht nur Stichproben.

Für jedes Badge prüfen:

- sichtbare Grösse
- Schärfe
- Zentrierung
- Padding
- Beschnitt
- Seitenverhältnis
- Verhältnis zu anderen Badges
- Titel/Text
- Card-Höhe
- aktiver/inaktiver Zustand
- Carousel-Darstellung

Besonders Rollenbadges miteinander vergleichen:

- Admin
- Designer
- Editor
- Encoder
- Project Lead
- Quality Checker
- Raw Provider
- Timer
- Translator
- Typesetter
- Other
- Karaoke FX

Zusätzlich Sonder-/Milestone-/Historical-Badges prüfen.

Responsive Prüfung

Mindestens folgende Viewports testen:

- kleines Mobile
- grosses Mobile
- Tablet Portrait
- Tablet Landscape
- Desktop
- Wide Desktop

Screenshots bzw. visuell verwertbare Testartefakte erzeugen, sofern die bestehende Testumgebung dies unterstützt.

Nicht behaupten „UI sieht gut aus“, ohne diese Prüfung tatsächlich durchgeführt zu haben.

---

12. Automatisierte visuelle Regression

Prüfen, welche vorhandene Test-Infrastruktur für Screenshot-/Visual-Regression verfügbar ist.

Falls Playwright oder vergleichbare Browser-Tests vorhanden sind, soll für die Badge-Darstellung eine robuste Regression-Prüfung ergänzt werden.

Ziel:

- bekannte Badge-Galerie/Testseite oder bestehende Achievement-Ansicht
- reproduzierbare Viewports
- alle relevanten Badges sichtbar
- Screenshot-Vergleich

Keine fragilen Pixeltests erzwingen, wenn das Projekt dafür aktuell keine Infrastruktur besitzt.

In diesem Fall mindestens:

- Browser-basierte Screenshot-Erzeugung
- dokumentierte manuelle Bild-für-Bild-Abnahme
- strukturelle UI-Tests

umsetzen.

---

13. Tests

Mindestens relevante bestehende Tests ausführen.

Zusätzlich Tests für:

- Karaoke FX Artwork-Auflösung
- jede Achievement-fähige Rolle besitzt gültiges Artwork oder explizite Ausnahme
- keine doppelten Badge-Codes
- Phase-150-Threshold-Verhalten bleibt unverändert
- responsive UI-Komponenten
- Artwork Resolver
- Karussell-Logik
- Reduced Motion, soweit testbar
- aktive Karte
- keine Regression bestehender Achievement-Seiten

Backend- und Frontend-Tests getrennt dokumentieren.

---

14. Kein unnötiger Scope Creep

Nicht Bestandteil dieser Phase:

- komplette Badge-Business-Logik neu bauen
- Rollenmodell grundlegend umbauen
- Phase-150-Threshold-System ersetzen
- allgemeines Design-System der gesamten Plattform neu schreiben
- unrelated Admin-/Release-/Anime-Seiten refactoren
- Datenbankmodell ohne zwingenden Grund ändern
- neue Features ausserhalb Badge/Achievement/Karussell einführen

Nur Änderungen durchführen, die für das Ziel dieser Phase erforderlich sind.

---

15. Research → Plan → Execute

GSD vollständig verwenden.

Reihenfolge:

1. aktuellen Code analysieren
2. Research für Phase 151
3. daraus konkrete Pläne erstellen
4. Pläne in sinnvolle Waves aufteilen
5. Execute
6. Tests
7. visuelle Badge-für-Badge-Prüfung
8. Gaps dokumentieren und beheben
9. Abschlussprüfung
10. Git Commit/Push

Nicht direkt loscodieren, bevor Research und Plan abgeschlossen sind.

---

16. Agenten

Alle benötigten Agenten auf der Linux-VM ausführen.

Agenten dürfen parallel arbeiten, wenn ihre Aufgaben unabhängig sind.

Geeignete Aufteilung beispielsweise:

- Architektur-/Codeanalyse
- CSS/Responsive
- Karussell
- Artwork/Role Integration
- Backend/Performance
- Tests/Visual QA

Keine parallelen Agenten auf denselben Dateien arbeiten lassen, wenn dadurch Konflikte wahrscheinlich sind.

Astra bleibt koordinierender Hauptagent.

---

17. Git

Vor Start:

- aktuellen Branch prüfen
- "git status"
- aktuellen HEAD dokumentieren
- sicherstellen, dass kein unerwarteter Dirty State vorliegt

Während Umsetzung:

- bestehende Historie respektieren
- keine fremden Änderungen überschreiben
- keine force pushes
- keine History-Rewrites

Nach Abschluss:

- alle Phase-151-Änderungen committen
- auf den vorgesehenen "origin/main" pushen, sofern dies dem bestehenden Team4s-Workflow entspricht
- finalen Commit-Hash melden

---

Definition of Done

Phase 151 gilt nur als abgeschlossen, wenn alle folgenden Punkte erfüllt sind:

- [ ] aktueller Phase-150-Code wurde vor Änderungen analysiert
- [ ] keine parallele Business-Badge-Registry eingeführt
- [ ] Achievement-Badge-Grössen sind konsolidiert
- [ ] übergrosse Desktop-/Widescreen-Badges beseitigt
- [ ] Mobile-First Responsive-System vorhanden
- [ ] redundante/konkurrierende Media Queries reduziert
- [ ] hochauflösende Assets bleiben erhalten
- [ ] Badges bleiben scharf
- [ ] Badge-Slot wirkt über verschiedene Motive visuell einheitlich
- [ ] Karaoke FX vollständig integriert
- [ ] Entry + Bronze + Silber + Gold + Platin für Karaoke FX unterstützt
- [ ] neue Rollen lassen sich strukturiert integrieren
- [ ] fehlendes Artwork einer unterstützten Rolle wird durch Tests erkannt
- [ ] Karussell reagiert flüssig und konsistent
- [ ] aktives Badge ist eindeutig
- [ ] Nachbarbadges wirken nicht grösser als das aktive Badge
- [ ] kein N+1 eingeführt
- [ ] keine Query-Explosion eingeführt
- [ ] bestehende Badge-Deduplizierung bleibt intakt
- [ ] Backend-Tests PASS
- [ ] Frontend-Tests PASS
- [ ] relevante Browser-/UI-Tests PASS
- [ ] Badge-für-Badge-Sichtprüfung durchgeführt
- [ ] Mobile geprüft
- [ ] Tablet geprüft
- [ ] Desktop geprüft
- [ ] Widescreen geprüft
- [ ] offene Gaps dokumentiert oder behoben
- [ ] finaler Commit gepusht

---

Abschlussbericht

Am Ende kompakt berichten:

Umsetzung

Was wurde geändert?

Architektur

Welche bestehende Phase-150-Struktur wurde wiederverwendet?

UI

Welche Badge-Grössen/Breakpoints gelten jetzt?

Artwork

Welche Assets wurden ergänzt oder angepasst?

Karaoke FX

Wie wurde Karaoke FX integriert?

Erweiterbarkeit

Wie wird künftig eine neue Rolle samt Badge ergänzt?

Performance

Welche Query-Pfade wurden geprüft?
Gab es Änderungen an der Query-Anzahl?

Tests

Welche Tests wurden ausgeführt und mit welchem Ergebnis?

Visual QA

Welche Viewports wurden geprüft?
Wurde wirklich jedes Badge-Artwork kontrolliert?

Gaps

Was ist noch offen?

Git

Finaler Commit-Hash und Push-Status.

Wichtig:

Nicht nur melden, dass die Tests erfolgreich sind. Die visuelle Badge-für-Badge-Prüfung ist ein verbindlicher Teil der Phase.
