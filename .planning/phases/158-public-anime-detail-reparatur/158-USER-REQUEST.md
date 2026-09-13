<!-- Bindende vollständige Transkription des Nutzerauftrags13.09.2026; nur Markdown-Gliederung normalisiert. Gemeinsame Quelle für genau158/159. -->

# GSD-AUFTRAG – Öffentliche Anime-Detailseite reparieren und konsolidieren

Arbeite auf der Linux-VM im kanonischen Repository:

"/home/d1sk/team4s"

Geprüfter Ausgangscommit des Audits:

"7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85"

Primäre Route:

"/anime/[id]"

Live-Beispiel:

"http://127.0.0.1:3300/anime/1"

## Auftrag

Lies zuerst vollständig:

- "AGENTS.md"
- "AI-HANDOFF.md"
- aktuellen "ROADMAP"
- aktuellen "STATE"
- "PROJECT"
- die relevanten Artefakte der Phasen 149, 152–157
- den vollständigen Deep-Audit der öffentlichen Anime-Detailseite vom 13.09.2026
- den aktuellen Quellcode aller betroffenen Komponenten, Handler, Repositories, Verträge und Tests

Prüfe danach zuerst den tatsächlichen aktuellen Git- und GSD-Stand. Übernimm keine Phasennummer blind, falls zwischenzeitlich weitergearbeitet wurde.

Der Audit enthält viele Findings, rechtfertigt aber weder einen Rewrite noch eine eigene Phase pro Finding. Plane die Arbeiten in genau zwei kompakte GSD-Phasen. Innerhalb einer Phase dürfen mehrere Plans und Ausführungswellen angelegt werden.

Die noch offenen Human-UAT-Punkte der Phasen 156 und 157 dürfen dadurch weder stillschweigend geschlossen noch überschrieben werden.

## Phase 1 – Sichtbare Fehler, Sessionverhalten und Navigation

Diese Phase soll die klar belegten, überschaubaren Fehler der Anime-Seite gemeinsam korrigieren.

### 1. Lesbarkeit

Behebe F-01:

- Episodentitel müssen auf den weißen Episodenkarten lesbar sein.
- Die Überschrift des Contribution-Bereichs muss auf dem dunklen Seitenhintergrund lesbar sein.
- Nutze bestehende globale Tokens und etablierte Styles.
- Keine neue parallele Farbregistry.
- Kein strukturelles Redesign der Seite.

### 2. Horizontaler Overflow

Behebe F-03:

- Der Hero darf keinen horizontalen Dokumentüberlauf mehr verursachen.
- Begrenze den Overflow am fachlich richtigen Container.
- Verwende keine globale pauschale "overflow-x: hidden"-Lösung, die Slider, Fokusrahmen oder andere Controls abschneidet.
- Bestehende visuelle Wirkung soweit möglich erhalten.

### 3. Refresh-only-Session und Authwechsel

Behebe F-02:

- Kommentarformular und Watchlist müssen eine aktive Session über Access- oder Refresh-Session erkennen.
- Nutze die vorhandene zentrale Auth-/Session-Infrastruktur.
- Keine lokale Token-, Cookie-, Bearer- oder Refreshimplementierung.
- Komponenten müssen auf relevante Sessionänderungen nach dem Mount reagieren.
- Keine mehrfach konkurrierenden Refreshmechanismen einführen.

### 4. Fehlerzustände

Behebe F-12:

- Bei Contributions zwischen Laden, fachlich leer und Requestfehler unterscheiden.
- Watchliststatus darf bei einem Requestfehler nicht einfach als "false" interpretiert werden.
- Aus unbekanntem Zustand darf kein unbeabsichtigtes Add/Delete entstehen.
- Watchlist-Aktionsfehler müssen auch bei übergebenem Custom-Styling sichtbar sein.
- Bestehendes Seitendesign verwenden.

### 5. Strikte Anime-ID und korrekte Fehlerantworten

Behebe den technisch eindeutigen Teil von F-05:

- Nur vollständig positive ganzzahlige IDs akzeptieren.
- "/anime/1abc", "/anime/1.5", "/anime/0" und negative Werte dürfen niemals Anime 1 anzeigen.
- Nicht vorhandene Anime müssen korrekt über den vorhandenen Next-Mechanismus als "404" behandelt werden.
- Seitentitel, Canonical und Robots-/Fehlermetadaten konsistent behandeln.
- Keine neue Anime-Slugroute erfinden.

### 6. Unwahre Kennzahlen entfernen

Behebe den eindeutig falschen Darstellungsteil von F-04:

- Fest codierte Bewertung "7.8" nicht mehr als reale Bewertung anzeigen.
- Konstant gemappte "0 Views" nicht als echte Viewzahl darstellen.
- Keine neue Bewertungsdatenbank, Zählmechanik oder Ersatzwahrheit einführen.
- Falls keine autoritative Quelle existiert, Kennzahl sauber weglassen.
- Emby-Produktentscheidung und größere Medienmodellierung nicht nebenbei lösen.
- Bestehendes Anime-22-Mapping nicht durch eine neue ID-Heuristik ersetzen.

### 7. Pretty-Projektnavigation

Behebe F-06:

- Der sichtbare Link „Gruppenbereich“ soll den vorhandenen kanonischen Pretty-Projektpfad verwenden.
- Nutze vorhandene Phase-155-Resolver, Linkbuilder und autoritative Slugs.
- Slugs niemals im Browser aus Titeln erraten.
- Falls das bestehende Read-Model einen notwendigen Slug nicht liefert, erweitere gezielt DTO, OpenAPI, TypeScript und Backendprojektion.
- Lade kein vollständiges Gruppenprofil nur zur Linkbildung.
- Die numerische Compatibility-Route bleibt bestehen und funktionsfähig.

### 8. Relations-Vollreload

Behebe F-07:

- Der Relationshandler darf für eine reine Existenz-/Visibility-Prüfung nicht den vollständigen Anime über sieben Statements laden.
- Nutze oder ergänze eine schmale vorhandene Repositoryprüfung.
- Verhalten für aktive, unbekannte und deaktivierte Anime bewahren.
- Keine unbewiesenen Performanceversprechen dokumentieren.

## Phase 1 – verpflichtende Abnahme

Prüfe mindestens:

- Breiten 360, 390, 767, 768 und 1440 Pixel
- geschlossene und geöffnete Episode
- "document.scrollWidth <= viewport width"
- kein horizontaler Rootscroll
- berechnete Vorder- und Hintergrundfarben
- Access vorhanden
- nur Refresh vorhanden
- Access abgelaufen, Refresh gültig
- beide Tokens fehlen
- Sessionänderung nach Mount
- 401, 5xx und Netzwerkfehler
- bestehender Watchlisteintrag
- gültige Anime-ID
- "1abc", "1.5", "0", negative und unbekannte ID
- tatsächlicher HTTP-Status und Metadaten
- Pretty-Projektlink und Canonical
- numerische Compatibility-Route weiterhin funktionsfähig
- Relations mit, ohne, unbekanntem und deaktiviertem Anime
- erfolgreicher Relationspfad mit höchstens zwei Datenstatements, sofern die aktuelle Architektur dies ohne neue Parallelstruktur ermöglicht

Ergänze gezielte Unit-/Integrationstests und Browserbelege. Bestehende globale Lint- oder Typecheckfehler getrennt dokumentieren; neue Fehler sind nicht zulässig.

## Phase 2 – Gemeinsamer Zustand, Navigation, Medien und Verträge

Diese Phase beginnt erst nach Implementierung und technischer Verifikation von Phase 1. Sie bündelt die strukturell zusammengehörenden Punkte, ohne daraus einen Rewrite zu machen.

### 1. Eine Wahrheit für die aktive Fansub-Gruppe

Behebe F-11:

- Genau ein gemeinsamer Clientbesitzer der aktiven Gruppenauswahl.
- Story, Filter und Versionsliste beziehen denselben Zustand.
- Vorhandenen Callback verwenden oder minimal passend erweitern.
- SSR-deterministischen Erstzustand sicherstellen.
- Persistierung kontrolliert behandeln.
- Storagezugriffe absichern.
- Ungültige oder entfernte gespeicherte IDs behandeln.
- Multitab-Verhalten bewusst definieren.
- Den 200-ms-Poll vollständig entfernen.
- Gruppenwechsel darf keine neuen fachlichen Datenrequests erzeugen.

### 2. Grid-Nachbarnavigation

Behebe F-13:

- Zielanime und zugehörige Gridseite gemeinsam weiterführen.
- Das erste asynchrone Ergebnis direkt und zuverlässig verwenden.
- Alte/späte Antworten abbrechen oder sicher ignorieren.
- Keinen initialen Listenrequest ohne tatsächliche Gridinteraktion einführen.
- Kontrollierte Mehrseitenfixtures für Vorwärts- und Rückwärtsnavigation erstellen.

### 3. Echtes Medienbudget

Behebe F-09:

- Das mobil etwa 160 Pixel breite Cover darf nicht mehr unkontrolliert das 1000×1426-Original mit rund 740 KB übertragen.
- Nutze vorhandene ResponsiveImage-/Medienmechanismen, sofern sie fachlich passen.
- Providerbilder mit tatsächlichen Größenparametern ausliefern.
- Bei lokalen Dateien nicht so tun, als würden Queryparameter eine Transformation bewirken.
- Falls lokale Varianten erforderlich sind, den bestehenden Medienpfad sauber erweitern.
- Mehrfach verwendete identische Bild-URLs nicht unnötig mehrfach übertragen.

### 4. Manifestcache

Behebe F-10 unter Erhalt des funktionierenden Sharings:

- Logo, Banner und Rotator teilen weiterhin einen Manifestrequest.
- Begrenzte Cachelebensdauer oder belastbare Invalidierung vorsehen.
- Größenbegrenzung beziehungsweise kontrollierte Eviction einführen.
- Laufende Requests bei nicht mehr benötigtem Consumer kontrolliert behandeln.
- Fehler dürfen den Cache nicht dauerhaft vergiften.
- Keine neue parallele Medienregistry.

### 5. Variantenprojektion, Segmentwahrheit und Vertrag

Bearbeite F-08 und F-14 erst nach repositoryweiter Consumerprüfung:

- Dokumentiere für jedes betroffene Feld die tatsächlichen Consumer.
- Entferne Daten nicht pauschal.
- Neutrale Episodefallbacks erhalten oder gleichwertig ersetzen.
- Segmentinformationen dürfen nicht über Range und Versionslabel als zweite fachliche Wahrheit abgeleitet werden.
- Verwende bei tatsächlichem Bedarf die autoritative "theme_segment_assignments"-Projektion.
- Prüfe, ob Segmentfelder auf der Anime-Seite überhaupt benötigt werden.
- OpenAPI, Runtime und TypeScript für "fansub_groups" angleichen.
- Varianten-ID und Releaseversion-ID eindeutig benennen und dokumentieren.
- Streamcompatibility nicht unkontrolliert entfernen.
- Keine SQL-Abfrage pro Episode, Variante, Gruppe oder Contributor einführen.
- Für große Inventare eine belegte Payload-/Row-Grenze oder einen fachlich geeigneten Abrufmechanismus definieren.

## Phase 2 – verpflichtende Abnahme

Prüfe mindestens:

- Primär- und Zweitgruppe
- ungültige beziehungsweise entfernte gespeicherte Gruppen-ID
- blockierten Storage
- Reload und Hydration
- Multitab-Verhalten
- Animewechsel
- Synchronität von Story, Filter und Versionsliste
- keine neuen Requests beim Gruppenwechsel
- mehrere Gridseiten
- Vorwärts-/Rückwärtsnavigation über Seitenränder
- erster Klick bei langsamer Antwort
- Hover, Focus und Touch
- Navigation während laufendem Request
- Mobile- und Desktop-Coverbudget
- lokale und externe Medien
- fehlende Medien und Fehlerantworten
- Manifeständerung innerhalb derselben SPA-Sitzung
- begrenztes Cacheverhalten bei vielen Animewechseln
- weiterhin genau ein geteilter Manifestrequest
- leere Serie
- neutrale Episode ohne Variante
- mehrere Gruppen und Varianten
- unterschiedliche Varianten-/Versions-IDs
- isolierte ID-Kollision
- Range-/Assignmentdivergenz
- OpenAPI-/Runtime-/TypeScript-Vertrag
- keine N+1-Regression

## Nicht Bestandteil dieser beiden Phasen

Diese Punkte dokumentieren, aber nicht ungefragt mitimplementieren:

- schlanker globaler Ownerprofil-/Shell-DTO aus F-15
- Kommentar-Pagination und Produktentscheidung „Vorschau oder vollständige Historie“
- umfassende Video-/Audio-Verhaltensänderung
- neue Anime-Slugroute
- neue Ratingdatenbank
- neues Viewzählungssystem
- neue Emby-ID-Heuristik
- automatische Zusammenlegung von Anime-, Projekt-, historischen oder Ownercredits
- pauschale Löschung von DTO-Feldern, Tabellen, Segmentdaten, Release-Daten oder Compatibility-Routen
- strukturelles Redesign der Anime-Seite
- globale Bereinigung aller bestehenden Lint-/Typecheckfehler

Falls ein kleiner zwingender Vertragsfix einen dieser Bereiche berührt, zuerst Ursache, Umfang und Consumer dokumentieren. Keine schleichende Scope-Ausweitung.

## Arbeitsweise

1. Aktuellen Stand und nächste freie Phasennummer feststellen.
2. Auditbefunde gegen den aktuellen Code erneut verifizieren.
3. Genau zwei Phasen mit klaren Plans und Wellen anlegen.
4. Abhängigkeiten und konfliktträchtige Dateien vor der Ausführung benennen.
5. Phase 1 vollständig planen, implementieren, testen und verifizieren.
6. Phase 2 erst danach ausführen.
7. Für riskante Vertrags- oder Datenänderungen zuerst Consumer-Matrix und Fixtures erstellen.
8. Keine Produktentscheidung erfinden. Ungeklärte optionale Funktionen sauber ausblenden oder als offene Entscheidung dokumentieren.
9. Keine produktiven Daten oder Testdaten ohne ausdrückliche Freigabe verändern.
10. Vorhandene unzusammenhängende Working-Tree-Änderungen nicht überschreiben.
11. Nach jeder Phase:

- relevante Tests
- Typecheck
- Lint
- Produktionsbuild, sofern ohne Konflikt mit laufendem Devserver möglich
- "git diff --check"
- Browserprüfung
- Query-/Requestvergleich
- aktualisierte GSD-Artefakte

12. Bestehende Fehler klar von neuen Regressionen trennen.
13. Keine automatische Behauptung eines Human-UAT-Sign-offs.

## Erwartete Abschlussausgabe

Liefere nach jeder Phase:

- Ausgangscommit und Abschlusscommit
- umgesetzte Plans
- Findings: behoben, teilweise behoben oder bewusst offen
- geänderte Dateien nach Backend, Frontend, Vertrag und Tests
- Test-, Build-, Lint- und Typecheckergebnisse
- Browserbelege mit Viewport und geprüftem Verhalten
- Request-/SQLvergleich vorher und nachher
- neue oder verbleibende Risiken
- nicht reproduzierbare Fälle
- weiterhin notwendige Human-UAT-Punkte
- Bestätigung, dass keine unautorisierten Produkt-, Datenbank- oder Scopeänderungen vorgenommen wurden

Beginne jetzt mit der Bestandsaufnahme und Planung. Falls der aktuelle Repositoryzustand wesentlich vom Auditcommit abweicht, stoppe nicht sofort, sondern erstelle zunächst einen präzisen Delta-Bericht und passe die Planung nachvollziehbar an.
