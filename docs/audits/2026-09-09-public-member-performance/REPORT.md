# Public Member: technische Ursachenanalyse

9. September 2026 · /home/d1sk/team4s · Ausgangsstand a5557720 · team4s-linux, Docker Compose.

**Die Public-Member-Komposition hat nachweisbar hohe Fixkosten, auch ohne Profilinhalt.** Drei Mechanismen sind zu trennen:

1. Der Member-Importgraph liefert in DEV 6,34 MB JavaScript, die Gruppe 3,74 MB. Editor-Barrel und der private Vorschaupfad im Not-found-Bundle vergrößern auch ein gültiges, fast leeres öffentliches Profil.
2. Bereits serverseitig vorhandene Inhalte bleiben hinter Skeletons, bis der gemeinsame Clientgraph geladen, hydratisiert und über Viewport-Hooks aktiviert ist. Unter 1,6 Mbit/s und CPU ×4 dauert das beim leeren Profil ungefähr 34–36 Sekunden.
3. **Ein eigenständiges Speicherproblem ist reproduziert:** Lazy-Images mit `sizes="auto"` und `srcset` halten im getesteten Chromium entfernte DOM-Teilbäume fest. Das passiert bei SPA-Seitenwechseln in DEV und im isolierten Produktionsbuild. Ein Minimalversuch ohne React/Next reproduziert es; Entfernen ausschließlich des Auto-Sizing-Anteils beseitigt im Navigationstest das fortlaufende DOM-Wachstum.

Die 20 SQL-Queries sind ebenfalls bestätigt und teilweise redundant. Im vorhandenen kleinen Datenbestand liegen die HTTP-Mediane aber bei 4–6 ms. **Diese Abfragen erklären weder die gemessenen Sekunden bis zur Darstellung noch einen Scroll-Absturz ohne neue API-Requests.** Die Architektur ist damit nicht als günstig bestätigt: Der Aggregator koppelt alle Bereiche aneinander, während der Clientgraph fast unabhängig vom Datenumfang bezahlt wird.

**Der persönliche Chrome-Tab-Absturz wurde nicht reproduziert.** Reines langsames/schnelles Scrollen, 30 Wiederholungen und Karussellinteraktion blieben kontrolliert stabil. Das Speicherproblem grenzt einen relevanten Langzeitsitzungs-Pfad technisch ein; seine Kausalität für den konkreten Absturz ist offen. Keine Behauptung „Crash behoben“, keine dauerhafte Produktoptimierung.

## Umfang und Messqualität

| Fall | Tatsächlich vorhandene Daten |
| --- | --- |
| timer, Member 11 | Avatar/Hintergrund, Story 912 Zeichen, 5 öffentliche Badges, 7 Progress-Einträge, 30 Punkte, 1 Projekt, 3 aktuelle Beiträge, 1 Mitgliedschaft |
| kara, Member 12 | Kein Avatar/Hintergrund/Story, 0 öffentliche Badges/Punkte/Projekte/Beiträge; dennoch 6 Progress-Familien und 1 Mitgliedschaft |
| type / qc | Weitere reale Member; type zusätzlich im SQL-Tracer, qc mit mehr Rollen-Auszeichnungen im 30-Zyklen-Scrolltest |
| new-subs, Gruppe 1 | Einzige öffentliche Gruppe; 1 Projekt mit 13 Versionen, 1 History-Badge, 3 Medien, 1 Community-Link, 6 aktuelle und 6 historische Teamzeilen |

Es gibt keine Gruppe mit mehreren Projekten und gespeicherter Story im aktuellen Datenbestand. Die gewünschte reichere Kontrolle ist deshalb nur teilweise erreicht. Keine synthetischen Daten angelegt.

- Next 16.1.6, webpack DEV; React-Paket 18.3.1, tatsächlich von Next gebündelte React-Laufzeit. Linux-Chromium 140.0.7339.16, vorhandenes Playwright 1.55; 1440 × 900, DPR 1, anonyme Kontexte.
- 126 Netzwerk-/Trace-Läufe einschließlich kontaminierter/teilweiser Läufe; zusätzliche Bild-, Sichtbarkeits-, Native-Memory-, SPA- und Heap-Experimente.
- Cold = neuer Browserkontext; Warm = Reload desselben Kontexts nach Scrollen. Kein kalter Compiler/DB-/Image-Cache beansprucht.
- Nach Load 1,8 s warten, dann langsames/schnelles Scrollen, Karussell-Buttons, Settling, explizite GC. CDP-Network, CPU-Sampling, Trace, DOM-Counters, Observer-/rAF-/Commit-Instrumentierung.
- A/B-Wiederholung 0 enthält teilweise Fast Refresh/Neukompilierung. Stabile Wiederholung 1 und Warm-Reloads tragen den Vergleich. Ein zerstörter Kontext bei Fast Refresh ist kein Nutzer-Crash.
- CDP-Dauerzähler laufen über Reloads weiter. Die bereinigte Zusammenfassung weist initiale Script/Layout/Style-Dauern nur für Cold aus; Warm hat separate Traces.
- Root-Commits und Änderungen committed Props/State sind keine exakten komponentenweisen React-Profiler-Dauern. Alte initiale Baseline-Komponentenänderungszählung war ungenau; korrigierte Wiederholungen sind maßgeblich.
- GC/Snapshots sind invasiv. DOMCounters umfasst mehr als sichtbare Elemente. Native-Speicherwerte sind keine exakten GPU-Allokationen einzelner Bilder.
- Windows-Live-UAT: Codex-Browser am Linux-LAN war responsiv. Tunnel 127.0.0.1:3300 nicht erreichbar; persönliches Chrome nicht an CUA angeschlossen. Dessen Version, GPU, Extensions, Zoom und angemeldete Sitzung bleiben unvermessen.

Exakte Tabellen: [TABLES.md](TABLES.md). Bildinventar: [ASSETS.md](ASSETS.md). Einzelwerte, URLs, SQL und EXPLAIN-Pläne in den JSON-Dateien und Rohartefakten.

## Direkter Vergleich und Architektur

Stabile DEV-Wiederholung 1 nach Wiederherstellung des Originals; MB dezimal:

| Faktor | Group new-subs | Member timer | Member kara |
| --- | ---: | ---: | ---: |
| Document TTFB | 133 ms | 288 ms | 146 ms |
| Load cold / warm | 824 / 696 ms | 1.020 / 1.000 ms | 867 / 881 ms |
| JavaScript transferiert | 3,743 MB | 6,343 MB | 6,343 MB |
| JavaScript dekomprimiert | 17,020 MB | 28,274 MB | 28,274 MB |
| Bilder transferiert | 1,172 MB | 0,608 MB | 0,037 MB |
| Requests Cold-Lauf gesamt | 17 | 27 | 13 |
| Script bis sichtbar, cold | 264 ms | 307 ms | 280 ms |
| Layout bis sichtbar, cold | 40 ms | 150 ms | 79 ms |
| Längster Long Task | 191 ms | 230 ms | 232 ms |
| Dokumentelemente sichtbar | 347 | 821 | 606 |
| Heap nach Scroll + GC | 19,02 MB | 25,12 MB | 24,11 MB |
| Root-Commits initial / zusätzlich Scroll | 12 / 0 | 13 / 3 | 12 / 2 |
| Profile-SQL inklusive Zugriff | 8 + 2 Teamprojektion | 21 | 20 |
| Separater Profil-HTTP-Median | 3,25 + 3,15 ms¹ | 5,87 ms | 4,04 ms |

¹ Zwei separat gemessene Gruppen-Endpunkte; die Summe ist keine Document-TTFB. RootLayout lädt zusätzlich drei Rollenkataloge parallel auf beiden Seiten.

Auf schnellem LAN ist die Ladezeitdifferenz kleiner als die Byte-Differenz. Nicht jeder lokale Besuch hängt minutenlang. Unter Drosselung wird der strukturelle Unterschied sichtbar: DEV Load timer 36,25 s, kara 33,66 s, Gruppe 25,96 s; längste initiale Tasks 951/980/768 ms. Auch die Gruppe ist künstlich gedrosselt absolut langsam. Sie transportiert weniger JS und verbirgt wesentliche Inhalte nicht hinter denselben Aktivierungs-Skeletons.

| Isolierter Produktionsbuild, Cold-Wiederholung 1 | Group | timer | kara |
| --- | ---: | ---: | ---: |
| JS transferiert / dekomprimiert | 187 / 632 kB | 353 / 1.155 kB | 353 / 1.155 kB |
| Load | 141 ms | 216 ms | 160 ms |
| Heap nach GC | 4,13 MB | 5,59 MB | 5,18 MB |
| Längster Task | unter 50 ms | unter 50 ms | unter 50 ms |

Produktions-Drosselung: Load 7,66 s Gruppe, 5,31 s timer, 2,59 s kara. Hier dominiert beim Load-Ereignis der größere Bildtransfer der Gruppe; ihr Client benötigt trotzdem weniger Script-Arbeit (248 ms gegenüber 1.078/506 ms). Load allein ist deshalb kein ausreichender Interaktionsindikator. Produktions-RSC-Prefetch: 36 kleine Requests Gruppe, 14 timer, 12 kara im stabilen Cold-Lauf; keine endlose API-Folge.

### Kritischer Pfad

Page und Metadaten verwenden den request-lokalen Profil-Lader; keine zwei unabhängigen identischen Server-Fetches nachgewiesen. Der Profil-Body wartet auf Basisdaten, Mitgliedschaften, Badges, Counts, Projekte/Versionen, Known-for und Beiträge. Getrennte initiale Daten-/Darstellungsgrenzen fehlen.

MemberProfileContent ist im normalen Einstieg nicht selbst `use client`, importiert aber zahlreiche Client-Bereiche. OwnHiddenProfilePreview zieht zusätzlich die ganze Komposition unter eine Client-Grenze in das Not-found-Segment. Ein Server Component außen garantiert somit kein kleines öffentliches Clientbundle.

Header-only G lässt den vollständigen realen Aggregator bestehen: kara 606 → 116 Dokumentelemente, 6,34 → 3,77 MB JS, 24,16 → 17,89 MB Heap nach Warm-Scroll/GC; Warm-Load 799,5 → 596,5 ms. Damit ist SQL allein als Gesamterklärung widerlegt.

Sinnvolle Richtung: kleinere initiale öffentliche Komposition, request-lokal wiederverwendete Fakten und sofort sichtbarer SSR-Inhalt. Konstante Queryanzahl oder ein neuer API-Request je Widget beheben die strukturelle Kopplung nicht.

## Priorisierte Befunde

### RCA-01 · P1 · DOM-Retention über native Auto-Sizes-Images

**Symptom/Reproduktion:** Gruppe öffnen, abwechselnd timer/kara über echte Links besuchen, zur Gruppe zurückkehren, zwölf Zyklen, GC je Zyklus. Ohne eigenen React-Hook.

| Versuch | DOM-Knoten initial → nach 12 | Listener initial → nach 12 | Dokumentelemente nach 12 |
| --- | ---: | ---: | ---: |
| DEV Member-Zyklen | 1.185 → 15.858 | 621 → 1.551 | 361 |
| DEV Gruppenliste-/Detail-Kontrolle | 1.185 → 5.191 | 621 → 1.194 | 349 |
| Produktion Member-Zyklen | 466 → 15.107 | 347 → 1.100 | 339 |
| Produktion Gruppen-Kontrolle | 465 → 4.479 | 347 → 766 | 338 |
| Produktion, Bilder temporär eager | 466 → 1.194 | 347 → 367 | 339 |
| Produktion, nur Auto-Sizes entfernt | 464 → 1.192 | 347 → 367 | 337 |

Nach erster Aktivierung alternieren die beiden Interventionen zwischen ungefähr 1.190 und 1.530 Knoten; kein ganzer zusätzlicher Baum je Zyklus. Fünf Sekunden Idle, GC und Löschen von Console/Performance-Marks beseitigen die Baseline-Retention nicht. JS-Heap wächst in den Varianten noch begrenzt weiter; damit ist nicht jede Speicherquelle als behoben bewiesen.

**Haltepfad:** Als detached markierte HTML-/SVG-/Text-Knoten; starke Pfade Window → HTMLDocument → native InternalNodes → lazy img → entfernte Artwork-/Section-Vorfahren. Kein dominanter kürzester Pfad über Carousel-State oder den eigenen React-Hook. Interne C++-Typen sind nicht aufgelöst.

**Unabhängiger Kausaltest:** Leere Seite ohne React/Next/App-Hooks erzeugt und entfernt eine Section mit Bild und 100 Text-Spans. Bild erfolgreich geladen. Mit lazy + auto sizes + 256w-srcset bleiben je Zyklus 207 Knoten: 211 → 2.488. Mit festen sizes oder eager bleiben 4. Ohne srcset trat das Problem im vorausgehenden Kontrollversuch ebenfalls nicht auf.

**Datei/Codepfad:** AchievementArtwork.tsx:37 erzeugt explizit auto; ResponsiveImage.tsx:15 → Next Image. Gruppe benutzt ebenfalls AchievementArtwork, aber einen kleineren betroffenen DOM-Baum.

**Root Cause/Sicherheit:** Native Auto-Sizing-Bildbeobachtung beim Entfernen der Bäume ist in Chromium 140 kausal eingegrenzt. Reproduzierbarer Retentionsfehler dieser Laufzeit, kein belegter React-Observer-Leak. Keine pauschale Aussage über alle Chrome-Versionen oder Nutzer-Chrome.

**Impact/Korrektur:** Hohe Priorität für längere SPA-Sitzungen. Deterministische responsive sizes für Artwork untersuchen; Lazy Loading, Geometrie und Optimizer erhalten. Nicht global eager als voreilige Lösung.

**Verifikation:** Zwölf und 50 SPA-Zyklen in DEV, freigegebenem Production-Build und Nutzer-Chrome; stabile DOM-/Listener-Kurve, Retainer, Transfer/Bildschärfe/UAT. Belege: retention-*.json, retainers.json, native-auto-sizes.json, Heap-Snapshots.


### RCA-02 · P1 · Öffentlicher Importgraph einschließlich Editor und Not-found-Vorschau

**Symptom:** Volleres und fast leeres Profil laden identische 6.342.591 JS-Bytes in DEV.

**Dateien/Codepfad:** MemberStorySection.tsx → components/editor/index.ts → RichTextEditor/ColorTokenExtension/Tiptap/ProseMirror. Zusätzlich members/[slug]/not-found.tsx → OwnHiddenProfilePreview → MemberProfileContent und sämtliche Profilbereiche. Not-found-Chunk auch beim erfolgreichen öffentlichen HTTP-200-Profil.

**Bundle-Nachweis:** Member page.js 6,845 MB roh / 1,556 MB gzip; not-found.js 7,045 / 1,600 MB. Jeweils 38 Tiptap-Module (1,187 MB roh), 11 ProseMirror-Module (1,790 MB), 10 Editor-Module (0,172 MB). Gruppe nur zwei Renderer-Module (9,7 kB), page.js 2,635 / 0,558 MB. DEV-Größen enthalten Inline-Sourcemaps; Kategorien und Standalone-Gzipwerte nicht einfach zur Netzwerksumme addieren.

Weitere Member-Anteile pro page.js: Profilmodule 0,842 MB, Lucide 0,216 MB/49 Module, Carousel 0,140 MB, ein Edit/Admin-Modul 13,4 kB. API-Monolith 0,923 MB in layout/page/not-found; auch Gruppe lädt ihn. Kein Nachweis des Ladens der gesamten Admin-App. Doppelte Übertragung/Modulregistrierung bedeutet wegen Webpack-Cache nicht doppelte Modulausführung.

**A/B:** Story vollständig entfernt: 4,675 MB JS. A2 importiert nur den existierenden Renderer direkt, erhält die Darstellung: 4,689 MB, also **1,653 MB / 26,1 % weniger Gesamt-JS-Transfer**, 6,901 MB weniger dekomprimierte JS-Bodies. Heap kara 24,16 → 20,96 MB. Die Wirkung gehört zum gesamten Editor-Abhängigkeitszweig mit doppelten Chunkkopien, nicht „26 % exklusive Tiptap-CPU“. Neutraler Not-found-Ersatz bei unveränderter sichtbarer Seite spart separat 1,602 MB. Wirkungen überlappen.

**Gruppe/Reproduzierbarkeit/Impact:** Reproduzierbar, hoher Download-/Parse-Fixkostenanteil auch ohne Story. LAN-Ladezeit streut stärker als Bytewerte. Produktion lädt noch 353 kB Member gegenüber 187 kB Gruppe; DEV-Packageanteile nicht ungeprüft auf minifizierte Production-Module übertragen.

**Korrektur/Verifikation:** Direkten Renderer nutzen; Editor-Barrel aus öffentlichem Graph entfernen; private Not-found-Vollvorschau tatsächlich separat laden. Privatsphäre/Owner-Upgrade erhalten. Network-Chunks/Modullisten, langsame Verbindung und private Vorschau erneut prüfen.

### RCA-03 · P1 · Client-Fixkosten und Hydrations-Skeletons trotz SSR-Daten

**Symptom:** Inhalte sind im HTML vorhanden, wirken aber leer/verspätet. kara mountet trotz 0 Inhalt Story-/Projekt-Leerzustand, sechs Badge-Familien mit gesperrten Stufen, Bilder und Viewer-Auflösung.

**Dateien:** MemberProfileContent, MemberBadgeChain, MemberCurrentProjectsSection, LatestContributionsSection, jeweilige CSS-Dateien, hooks/useNearViewportActivation.ts:3.

**Root Cause:** Viewport-Logik verschiebt Interaktionsfreigabe, nicht Download/Mount/Hydration. rootMargin 600px aktiviert bereits gemountete Bereiche. Projekt-/Contribution-Skeletons überlagern Inhalte bis data-visible=false; Rollen-Skeletons warten auf data-interaction-enabled=true. Großer Clientgraph verzögert die Sichtbarkeit.

**Messung:** Separate Sichtbarkeitsprobe mit Drosselung: timer Load 36,91 s; Projekt-/Rollen-Skeletons verschwinden 37,66 s, weiterer Carousel-Bereich 38,80 s, Beiträge 39,19 s. kara Load 34,27 s, Carousel-Aktivierung 36,03 s. Gruppe Load 26,63 s ohne diese Sichtbarkeitswechsel. Ohne JS kommt SSR früher, Skeletons aktivieren jedoch nie: kein funktionierender Lösungsersatz.

**A/B/Gruppe:** Badge-Bereich entfernt: kara 606 → 172 Elemente, Heap 24,16 → 22,07 MB, Cold-Script 265 → 212 ms. Header-only reduziert stärker bei unverändertem Aggregator. Gruppe 347 Elemente, kleinerer Graph trotz mehr Bildbytes.

**Reproduzierbarkeit/Impact/Richtung:** Hoher Impact auf schwache Netze/Geräte und wahrgenommene Nutzbarkeit. Öffentliche statische Inhalte SSR-sichtbar lassen, kleinere interaktive Inseln, sinnvolle serverseitige Entscheidung leerer Bereiche, echte spätere Ladegrenzen. Kein kosmetisches Drehen an Skeleton-Timern.

**Verifikation:** Inhalt vor vollständigem Client-JS sichtbar, weniger initiale Module/Elemente, unveränderte Daten/SEO/Accessibility, isolierte Bereichsfehler; gleiche Drosselungs-/Scrolltests.

### RCA-04 · P1 offen · Gemeldeter Scroll-Freeze/Tab-Crash

**Reproduktion versucht:** timer/kara/qc; langsam/schnell, mehrfach hoch/runter, mit/ohne Carousel; qc/kara/Gruppe jeweils 30 reine Scrollzyklen; Live-Codex-Browser; Bilder blockiert und Optimizer gezielt fehlerhaft.

**Ergebnis:** Kein Tab-Crash, keine JS-Exception, kein React-/Next-Error, kein Hydration-Mismatch, kein Prozess-OOM. Frontend/Backend OOMKilled=false, keine Neustarts. Stabile DEV-Scrollläufe nach vollständiger Darstellung ohne Tasks über 50 ms; keine endlose API-/Image-Retry-/JS-Observer-Folge.

**Eingrenzung:** Lange initiale Tasks unter Drosselung reproduzierbar. Reiner Scrollspeicher stabilisiert sich; SPA-Navigation wächst über RCA-01. Das beweist noch nicht den Nutzer-Crash.

**Datei/Root Cause:** Kein einzelner Crash-Auslöser zugeordnet. RCA-01/02/03 sind gemessene Kandidatenpfade, keine zusammengelegte Crash-Erklärung. **P0: kein bestätigter Crash/Endlosloop/OOM in der Messumgebung.** Nicht als erledigten Bug schließen.

**Impact/Verifikation:** Nutzer-Chrome mit Version/Zoom/GPU und anonymem bzw. angemeldetem Zustand; frischer Tab versus längere SPA-Sitzung; Trace/Memory unmittelbar bis zum Hänger. Mit dem vorhandenen Zugang nicht abschließend möglich.

### RCA-05 · P2 · Sequenzieller Aggregator, vier redundante Faktenabfragen

**Dateien:** backend/internal/repository/member_profile_public_repository.go:42 und Progress-, Role-Volume-, Contribution-Badge-, Projects-/Contributions-Repositories.

**Queryzahl:** timer/type 21 inklusive Zugriff, davon 20 GetPublicMemberProfileByID. kara 20 inklusive Zugriff, 19 im Loader: ohne Projekt entfällt Versionsbatch. „Immer exakt 20“ ist für jeden leeren Aufruf zu pauschal; das N+1-freie Budget bei vorhandenen Projekten stimmt.

Vier identische SQL-Paare: Rollen-Volumen (#4/#14), Contribution-Projekte (#5/#10), Chronik (#6/#11), Archivist (#7/#12). Erworbene Badges und Progress laden dieselben Fakten getrennt. N+1-Vermeidung verhindert projektabhängiges Wachstum, nicht diese Duplikate.

**Dominante Abfragen:** timer, Median sieben Läufe mit neuer Tracer-Verbindung: LatestContributions 3,480 ms, CurrentProjects 2,988, Versionsbatch 1,539, PreviousContributions 1,185, Memberships 0,809, KnownFor 0,733. Nach Plan-Warmup größte Einzeldauern 0,842/0,779/0,688/0,538 ms (Projekte/Versionen/Memberships/Latest). Tracer-Median 15,771 ms nicht mit separat gemessenem warmem HTTP-Median 5,87 ms verwechseln.

**EXPLAIN:** Kleine reale Mengen, keine Disk-Reads in der Serie. Größte innere Planmenge 85 Zeilen; ein CurrentProjects-Unterplan 378 Loops, insgesamt hier trotzdem unter 1 ms Ausführungszeit. Latest Planning/Execution 2,967/0,604 ms; CurrentProjects 1,991/0,904. Kleine Seq Scans belegen keinen fehlenden Index. Unterabfragen/JSON-Aggregation vorhanden, kein riesiges Resultset. Mit größerem Datensatz erneut prüfen, keine spekulative Indexmigration.

**HTTP/Serialisierung:** timer 10.235 Bytes/5,87 ms Median, kara 2.672/4,04, type 9.210/5,96. DTO-json.Marshal-Mediane 0,165/0,042/0,098 ms. Tracer umfasst SQL, Transport und Rows-Verbrauch, nicht nur DB-CPU. Handler-Mapping/Envelope nicht separat mikroprofiliert.

**Gruppe:** Profil 8 SQL + Teamprojektion 2. Gemeinsames RootLayout lädt drei Rollenkataloge, laut Quellpfad je ein SQL. Rechnerischer anonymer Dokumentpfad etwa 24/23 gegenüber 13, nicht als durchgehender HTTP→DB-Trace gemessen. Middleware/angemeldete Zusatzarbeit nicht enthalten.

**Impact/Richtung:** Aktuell sekundär für UX, strukturell wichtig für Last/Roundtrips. Fakten request-lokal einmal laden und mehrfach ableiten; Initial- und Folgebedarf entkoppeln. Nicht blind 20 Queries parallel starten oder alles in einen kartesisch wachsenden Join pressen.

**Verifikation:** Identische DTOs/Sichtbarkeit, vier Duplikate entfernt, Query-/Latenzbudget bei mehr Daten; kanonische Projekt-/Release-Domains erhalten. Konstanter Test-Querycount ist Regressionsschutz, kein allgemeiner Performance-Nachweis.

### RCA-06 · P2 · Locked-Projekt-Artwork und schwerer Original-Fallback

**Datei/Codepfad:** AnimeProjectAchievementStage wählt selectedStage ?? family.heroStage und löst Artwork ohne earned/current-Gate auf. kara bei 0 Projekten bekommt die erste noch nicht erreichte Contribution-Stufe als Hero.

**Network:** progress-first_contribution-motif.png und -frame.png über /_next/image; normale WebP-Responses zusammen 34.736 Bytes. Quellen 1.519.106 + 1.403.540 = 2.922.646 Bytes, jeweils 1254² Pixel. Quellen sind ausdrücklich nicht Normaltransfer.

Andere aktuelle Locked-Kategorien (Rollen/Points/Contribution/Membership) nutzen LockedStageArtwork bzw. earned/current-Gates. Kein weiterer solcher Transfer in kara-Baseline. Alle vorhandenen Kategorien geprüft, keine Aussage über zukünftige Stufen.

**Fallback:** ResponsiveImage schaltet nach Optimizer-Fehler einmal auf denselben Originalpfad, ohne unbegrenzten Retry. Nur Badge-Optimizer-URLs blockiert: timer 9,49 MB Bilder, kara 2,93 MB statt 0,608/0,037 MB normal. Kein Crash. Baseline-Member laden keine großen Badge-Original-PNGs, WebP nachgewiesen; AVIF nicht konfiguriert. Gruppe lädt unter anderem direktes PNG-Banner mit ungefähr 500 kB.

**Avatar:** timer-Avatar animiertes WebP, 540 × 260, 26 Frames, 411.828 Originalbytes. Optimizer liefert trotz w=160 unverkleinert, 412.249 Bytes Transfer. Dasselbe Avatarbild in Gruppe; erklärt nicht kara oder allein die Member-Differenz.

**Impact/Richtung:** Locked-Gating beseitigt unnötige Requests und verkleinert Retentionsfläche. Original-Fallback begrenzen/vorbereitete begrenzte Derivate über bestehende Medienstrukturen nutzen. Animationen separat budgetieren. Keine pauschale PNG-Crash-Zuschreibung.

**Verifikation:** Erfolg/Fehler des Optimizers, Locked-Transitions, konkrete Bildvarianten/Schärfe, begrenzte Fehlerbytes ohne Retry-Loop oder Geometriesprung.

### RCA-07 · P2 · Initiale React-Root-Wiederholungen bei langsamen Produktionsressourcen

**Messung:** Vor erstem vollständigem Clientbaum 1.664 leere Root-Commits timer und 257 kara (Fiberanzahl 1, keine benannten Komponenten), danach nur 11/9 Commits mit Komponenten; Gruppe 5 normale. Endet vor Scrollphase, keine endlose Carousel-/Komponentenfolge.

Kontrolllauf ohne eigenen React-Hook hat fast gleiche Loads (5,323/2,627 s statt 5,314/2,594) und Script-Dauern (1.041/498 ms statt 1.078/506). Hook erklärt die Mehrarbeit nicht; Commitzählung nur instrumentiert verfügbar.

**Root Cause/Dateien:** Exakter Next-/React-Scheduling-Auslöser nicht bis auf einzelne Frameworkfunktion bewiesen. Betroffen: öffentlicher Client-Einstieg und erzeugte Runtime-Chunks bei verzögerter Ressourcenauslieferung. Keine Zuschreibung an MemberBadgeChain aus leeren Root-Commits.

**Impact/Richtung/Verifikation:** Begrenzte initiale Mehrarbeit, kein bewiesener Scroll-Crash. Nach Graphverkleinerung erneut messen; einzelne CSS-/JS-Ressourcen kontrolliert verzögern und mit passender Profiling-Runtime zuordnen. Rohbelege production-slow4g-cpu4 und production-slow-no-hook.

### RCA-08 · P3 · Viewer-Auflösung und Cancellation

**Dateien:** OwnProfileEditLink, OwnHiddenProfilePreview, lib/useMemberViewer.ts:62, useCancellableSlugState.

**Quellbefund:** Angemeldeter Edit-Link lädt nach Session-Initialisierung nochmals volles Profil für Viewer-/Owner-Information. Wiederverwendung für private Vollvorschau nachvollziehbar, für kleinen Edit-Link zu breit. Anonyme Browsermessungen enthalten diesen Zusatzrequest nicht.

Memoized Fetcher ignoriert das vom Cancellation-Hook angebotene AbortSignal. requestKey verhindert veraltete Ergebnisanwendung, transportseitig wird hier nicht abgebrochen. Kein endloser Refetch bei stabilem Slug. Projekt-/Contribution-Paginierung ist begrenzt und nicht automatisch unendlich scrollgetrieben.

**Impact/Korrektur:** Angemeldete API-Zusatzarbeit/Schuld; keine bewiesene große anonyme Scrollwirkung. Viewer-/Vollprofilbedarf passend trennen oder vorhandene Information weiterreichen, vorhandenes API-Abbruchsignal durchreichen.

**Verifikation:** Angemeldet, Access Token fehlend/abgelaufen bei gültigem Refresh Token, zentrale Refresh-Grenze, keine private Datenfreigabe/Login-Fehlanzeige oder verspätete Antworten auf neue Slugs.


## React-, Carousel- und Memory-Prüfung

| Bereich | Clientbedarf / Verhalten | Ergebnis |
| --- | --- | --- |
| MemberBadgeChain | Katalog/Stages, vollständige Familien auch leer | Hohe DOM-Grundlast, kein eigener Scroll-State |
| FocalCarousel | Index, Expand, Pointer/Drag, Keyboard, Wheel am aktivierten Track, Scroll-Settling, 210-ms-rAF-Navigation | timer 2, kara 1, Gruppe 1 im gesamten DOM; keine ständig laufende rAF-Schleife |
| AchievementArtwork/ResponsiveImage | Fallback-State, native Bildlogik | Wenig eigener Code; Retentionspfad und schwerer Fehlertransfer |
| Story | Expansion/Overflow, ResizeObserver; leer weiter gemountet | Editor-Import auch ohne Story; kein dauernder Resize-Loop |
| Projekte/Latest Contributions | Viewport-Skeleton, Pagination/Request-State | Bereits initial gemountet; begrenzte Aktivierung, keine Scroll-API-Serie |
| Membership/Points/Project/Contribution-Stages | Unterschiedliche Stufenwahl, Locked-Ladder auch ohne Erfolge | Hohe Fixmenge; nicht automatisch sechs Carousels |
| RoleCatalogProvider | Memoized Context aus SSR-Katalogen | Kein breiter scrollgetriebener Provider-Update nachgewiesen |

Stabile DEV-Originalmessung: timer ResizeObserver 2 Callbacks, IntersectionObserver 6; kara 1/3. Nach erstem Scrollen bleiben Zähler konstant. timer Root-Commits 13 initial → 16 nach Aktivierung → 18 nach Carousel; kara 12 → 14 → 16. Die letzten zwei reinen Scrollzyklen ohne weitere Commits. Navigation ungefähr 14 rAF-Schritte, dann Ende. Cleanup für Timer/Frames, Wheel-/MediaQuery-Listener vorhanden.

Carousel-Isolation C erhält kollabierte Geometrie und entfernt Interaktion/Hooks/Listener. Nur 50.882 Bytes JS weniger; kara Warm-Load 849 statt 800 ms, timer 877 statt 843 ms in zugehörigen Wiederholungen. **Kein großer Gewinn; Carousel-Interaktivität unter getesteten Bedingungen nicht als dominante Lade-/Scrollursache bestätigt.** Badge-DOM und native Bildpfade bleiben bestehen.

Beim Parent-Render entstehen teils neue Familien/Maps, Render-Callbacks und sortierte Role-Arrays. Das begrenzt Memoisierung, beweist ohne wiederholten Parent-Trigger aber keine dauernden Re-Renders. Keine gleichzeitig doppelt sichtbare Member-Komposition nachgewiesen; doppelte Bundlepfade sind keine doppelten Mounts.

Erste GC-bereinigte Vorher-/Nachher-Scroll-Heaps: timer 23,52 → 25,11 MB, kara 22,70 → 24,10 MB, Gruppe 18,25 → 18,99 MB. Aktivierung, React-Alternates und Playwright-Abfragehilfen bewirken begrenzten Einmalanstieg. 30 weitere Scrollzyklen ohne kontinuierliche Kurve. Daraus darf der separate Navigations-Leak nicht ausgeschlossen werden.

Native-Memory-Traces: Renderer-discardable-Allokationen timer 16,79 → 20,99 MB, kara 4,20 → 4,20, Gruppe 8,40 → 8,40. GPU-Shared-Image-Summen timer 16,58 → 18,42 MB, kara 16,58 konstant, Gruppe 34,67 konstant. Prozess-/Cache-Indikatoren, keine exakte Aufteilung pro Badge. Parent-/Child-Allocatorwerte und Prozessspiegel nicht addieren. Tracedump-IDs sind remappt; Zuordnung nach zeitlicher Reihenfolge. Methode: [CDP requestMemoryDump](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/#method-requestMemoryDump).

## Fünf nächste Änderungen mit Erfolgskriterien

1. **Artwork-Auto-Sizes ersetzen.** Deterministische responsive sizes über bestehende Artwork-Größen; Lazy Loading erhalten. Erfolg: keine lineare DOM-/Listener-Retention in zwölf und 50 SPA-Zyklen, korrekte Geometrie/Schärfe/Transfer. Zuerst auch Nutzer-Chrome prüfen.
2. **Öffentlichen Importgraph trennen.** Direkter RichTextRenderer, echte Ladegrenze für private Not-found-Vollvorschau. Erfolg: kein Tiptap/ProseMirror/Editor im öffentlichen DEV-Graph; A2-Bytegewinn als Vergleich, Production neu messen; private Vorschau regressionsprüfen.
3. **Initialkomposition verkleinern und SSR sichtbar halten.** Kleine interaktive Inseln, echte spätere Ladegrenzen, fachlich sinnvolle Serverentscheidung leerer Bereiche. Erfolg: Inhalt vor voller Hydration, weniger Initial-DOM/Clientkosten, kürzere Skeleton-Dauer. Produktumfang/Locked-Stufen bewusst entscheiden.
4. **Aggregator-Fakten einmal laden; Initial-/Viewerbedarf trennen.** Vier Duplikatpaare beseitigen; kein Request pro Widget. Erfolg: identische Public-/Owner-Daten, besseres Budget mit größerem Datensatz, kein unnötiger Vollprofilabruf nur für Edit-Link; Auth-Refresh/Cancellation erhalten.
5. **Locked-Artwork und Fehlertransfer begrenzen.** Kein Projekt-Hero bei 0 Projekten; begrenzte Derivate/Fallbacks über vorhandene Medienstrukturen; Animationen separat. Erfolg: kara ohne beide Requests, defekter Optimizer ohne Multi-MB-Originallawine/Retry-Loop/Layoutsprung.

Folgeplan, keine bereits implementierte Optimierung. Priorität: reproduzierbarer Speicherfehler, deterministische Client-Fixkosten und Sichtbarkeit vor sekundärer SQL-Mikrooptimierung.

## Abschlussfragen

1. **Warum ist ein leeres Profil langsam?** Fast gleicher Clientgraph wie timer, inklusive Editor/Not-found-Vorschau, weiterhin Progress-Familien und Client-Leerzustände. Skeletons warten auf gemeinsame Hydration.
2. **Warum ist Group flüssiger?** 2,60 MB weniger JS-Transfer, 11,25 MB weniger dekomprimiertes JS, kleinerer DOM/Heap und weniger verdeckte SSR-Bereiche. Mehr Bilder allein machen nicht interaktionsschwerer. Unter extremer Drosselung wird auch Group langsam.
3. **Was verursacht Freeze/Crash?** Konkreter persönlicher Crash offen. Initiale Blockierung messbar; reproduzierte Auto-Sizes-Retention nach SPA-Wechseln ist technisch eingegrenzter Kandidat. Reines Scrollen im frischen kontrollierten Tab crashte nicht.
4. **Tiptap-Anteil?** Gesamter Editor-Barrel-Zweig spart beim direkten Renderer 1,653 MB DEV-Netzwerk-JS/26,1 % und 6,901 MB roh. Exklusive Tiptap-CPU-Prozent nicht gemessen; Module im erzeugten Bundle belegt.
5. **Carousel-Anteil?** Statische Interaktion spart etwa 51 kB und verbessert lokale Load-Zeiten nicht deutlich. Wenige begrenzte Updates. Badge-DOM insgesamt teurer als Interaktion allein.
6. **Große Original-PNGs?** Nicht als normale Member-Badges dieser Baselines. Bei gezieltem Optimizer-Fehler ja; Gruppe zusätzlich direktes PNG-Banner. Normal WebP, kein AVIF beobachtet.
7. **Locked-Artwork?** Projekt-/Progress-Hero first_contribution bei kara/0 Projekte, Motiv und Rahmen. Andere aktuelle Locked-Kategorien zeigten diesen Pfad nicht.
8. **SQL-Zahl?** Loader 20 mit Projekt, 19 ohne; jeweils 1 Zugriff = 21/20. Drei zusätzliche Katalog-Queries im gemeinsamen Server-Layout. Angemeldete Folgeresolution/Middleware separat.
9. **Dominante SQL?** CurrentProjects, Versionsbatch, LatestContributions, Memberships; frische Planung zusätzlich Latest/Previous/KnownFor. Kein großer Resultset-/Disk-I/O-Bottleneck im vorhandenen Datenbestand.
10. **Dominante Client Components?** Story-Barrel und Not-found-Vorschau beim Importumfang; BadgeChain/Stages und gesamte Komposition bei DOM/Mountkosten. Exakte komponentenweise Hydrationsdauern nicht mit diesem Hook ermittelt.
11. **Memory Leak/Loop?** Ja, native DOM-Retention durch Auto-Sizes-Images auf SPA-Navigation. Kein fortlaufender App-Render-/JS-Observer-Loop beim Scrollen. Begrenzte initiale leere Root-Wiederholungen unter Produktionsdrosselung separat dokumentiert.
12. **Drei bis fünf Änderungen?** Auto-Sizes, Importgrenzen, sichtbare kleine Initialkomposition, Fakten-/Vieweraggregation, Locked-/Fallback-Bildbudget – jeweils mit obigen Messkriterien.

## Validierung und Grenzen

- 341 relevante Frontend-Tests bestanden, 3 bestehende Todos; 20 Testdateien bestanden, eine übersprungen. Profil, Carousel, ResponsiveImage, NearViewport, Viewer und RoleCatalog.
- Opt-in-Backend-Audit nach gofmt erneut bestanden; PostgreSQL default_transaction_read_only=on. Keine Seeds/Resets/Migrations-/Row-Writes.
- Eigene Audit-Skripte: Node-Syntax und fokussiertes ESLint erfolgreich.
- Gesamt-Typecheck scheitert an bestehender Next-PageProps-Inkompatibilität von anime/page.tsx: synchrones searchParams-Objekt neben Promise, sichtbar in .next/dev/types.
- Gesamtlint 13 bestehende Errors außerhalb der neuen Auditdateien, 332 Warnings inklusive einer anschließend behobenen eigenen unused-variable-Warnung. Fokussierter Lint danach sauber; Gesamtlint nicht unnötig wiederholt. Fundstellen lint.log.
- Regulärer isolierter HEAD-Produktionsbuild scheitert nach JS-Kompilierung an unzulässigem Page-Export formatEditLoadError in admin/anime/[id]/edit/page.tsx. Nur separate Buildkopie danach mit typescript.ignoreBuildErrors=true; **Diagnosebuild ist keine Release-Freigabe**. Bestehendes PHASE120_IMAGE_PROBE-Gate für lokale Testmedien.
- Produktquellen nach A/B wiederhergestellt. Nur neue Auditdokumente, Messskripte und opt-in-Test; keine API-/Auth-/Schema-/Daten-/Medien-/Produktänderung.
- git diff --check und finaler Umfang: [VALIDATION.md](VALIDATION.md).

Langsame Darstellung, Member-Mehrbedarf und Navigations-Speicherfehler sind reproduzierbar erklärt. Die Definition of Done ist für den **konkreten persönlichen Chrome-Crash nur teilweise erfüllt**: technisch eingegrenzt, kein aufgezeichneter Crash. Reichere Gruppen-Kontrolle und angemeldete Sitzung fehlen ebenfalls. Diese Grenzen werden nicht durch eine pauschale DEV-Erklärung ersetzt.

Ausführung und Artefaktzugriff: [REPRODUCE.md](REPRODUCE.md).
