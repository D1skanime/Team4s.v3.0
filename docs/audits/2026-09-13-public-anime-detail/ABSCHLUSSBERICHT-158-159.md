# Öffentliche Anime-Detailseite – Abschlussbericht für GSD 158 und 159

Stand: 14.09.2026. Kanonisches Repository: `/home/d1sk/team4s` auf `team4s-linux`. Route: `/anime/[id]`; gemeinsamer Live-Einstieg: http://127.0.0.1:3300/anime/1.

**Beide autorisierten Phasen sind implementiert und unabhängig technisch verifiziert: Phase 158 mit 9/9 Anforderungen, Phase 159 mit 8/8. Globale Baselineausnahmen und sämtliche Human-UAT bleiben getrennt offen.**

Unabhängige Abnahme: Phase 158 mit sauberem Code-Review und 10/10 vorgesehenen Sicherheitsmaßnahmen; Phase 159 mit sauberem Review über 57 geänderte Dateiidentitäten und 12/12 Sicherheitsmaßnahmen. Das ist keine pauschale Sicherheitszertifizierung der gesamten Plattform.

## Ausgangslage und Phasengrenzen

Der aktuelle Git-/GSD-Stand wurde vor der Umsetzung gegen den vollständigen Audit und die neueren Architekturentscheidungen geprüft. Der Produktstand entsprach bei der Bestandsaufnahme dem Auditcommit. Die historische GSD-Parseranzeige und ältere Milestone-/PROJECT-Angaben wurden im Delta-Bericht eingeordnet, ohne einen Milestone zurückzusetzen. Die nächsten beiden freien Phasen waren 158 und 159. Es wurden genau diese zwei Phasen angelegt; Phase 159 begann erst nach der technischen Verifikation von Phase 158.

| Phase | Ausgangscommit | Technischer Abschlusscommit | Plans |
|---|---|---|---|
| 158 – sichtbare Fehler, Session und Navigation | `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85` | `c3bfcb23781addca1ccd3931592535416f706787` | 158-01 bis 158-04, 4/4 |
| 159 – Zustand, Navigation, Medien und Verträge | `c3bfcb23781addca1ccd3931592535416f706787` | `af449d20c8085787036817ee5f796ef4a145d34a` | 159-01 bis 159-05, 5/5 |

Der letzte Produktfix von Phase 159 ist `6ebfebf72019f337844b01fd7f7d832faaa71a74`; danach korrigierten `d22da611` und `a76d9a8e` ausschließlich Testfixtures. Der finale Harness ist `c1bd215c5a72a2a895b39c14354c3b86998d2ba5`. Spätere Abschluss-/Berichtscommits ändern die dokumentierte Produktumsetzung nicht.

## Phase 158 – Ergebnis

158-01 ergänzt den autoritativen Anime-Slug, erhält die numerische Compatibility-Route und ersetzt den Relations-Vollreload durch eine schmale Visibilityprüfung. 158-02 korrigiert Session- und Fehlerzustände. 158-03 integriert strikte IDs, echte HTTP-Fehler, Lesbarkeit, lokale Hero-Begrenzung und Pretty-Projektlinks. 158-04 liefert die technische Gesamtverifikation als Voraussetzung für Phase 159.

- Episodentitel verwenden die vorhandene dunkle Textfarbe auf weißen Karten; die Contributionüberschrift ist auf dem dunklen Hintergrund lesbar. Der Hero begrenzt seine Dekoration lokal. Es wurde keine neue globale Overflow-Sperre oder Farbregistry eingeführt.
- Kommentare und Watchlist erkennen Access- oder Refresh-Sessions über die zentrale Infrastruktur und reagieren auf Sessionänderungen nach dem Mount. Unbekannter Watchliststatus sperrt Mutationen; Request- und Aktionsfehler bleiben sichtbar. Contributions unterscheiden Laden, leer und Fehler einschließlich Retry.
- Nur vollständig positive sichere Ganzzahlen sind gültige Anime-IDs. Ungültige und unbekannte IDs liefern echte Next-404 mit noindex und ohne falsche Anime-Metadaten. Page und Metadaten teilen denselben Animeabruf.
- Die erfundene Bewertung 7.8 und konstanten Anime-Views entfallen. Das vorhandene Anime-22-/Emby-Mapping bleibt erhalten. Der sichtbare Gruppenbereich führt über gespeicherte Slugs zum Pretty-Projektpfad; die numerische Route funktioniert weiterhin.

**Findings:** F-01, F-02, F-03, F-06, F-07 und F-12 im beauftragten Scope behoben. F-04: unwahre Kennzahlen entfernt, weitere Produktfragen bewusst offen. F-05: strikte numerische Route, Status und Metadaten behoben; keine Anime-Slugroute eingeführt.

## Phase 159 – Ergebnis

159-01 erstellt zuerst die Consumer-Matrix und isolierte Vertrags-/Datenfixtures, danach die begrenzte öffentliche Projektion. 159-02 bindet Varianten- und Releaseversion-ID ausdrücklich durch die vorhandene Source-/Grant-/Streamkette. 159-03 konsolidiert Gruppenzustand, Cursorfortsetzung und Gridnachbarn. 159-04 begrenzt Manifestcache und tatsächliche Bildausgabe. 159-05 ergänzt die Produktions-, Browser- und SQLbelege und korrigiert dabei belegte Parsing-/Displaydefekte.

- Genau ein Clientbesitzer hält die aktive Fansub-Gruppe für Story, Filter und Varianten. Der SSR-Erstzustand ist deterministisch. Storagefehler, ungültige/entfernte IDs, Reload, Multitab und Animewechsel sind behandelt. Der 200-ms-Poll ist entfernt; Gruppenwechsel erzeugen keine fachlichen Datenrequests.
- Gridnavigation führt Zielanime und Gridseite gemeinsam weiter. Der erste langsame Klick funktioniert; Hover, Fokus und Touch teilen laufende Ergebnisse. Alte Antworten werden abgebrochen oder ignoriert. Ohne Gridinteraktion entsteht kein initialer Listenrequest.
- Die öffentliche Episodenprojektion liefert standardmäßig 24, höchstens 100 atomare Varianten- oder neutrale Episodenzeilen mit Cursorfortsetzung. Counts und Gruppen werden ohne Query pro Entität projiziert. Admin-/Full-Consumer und neutrale Fallbacks bleiben erhalten.
- `variant_id` und `release_version_id` sind getrennt. Die Anime-Seite übergibt beide. Benötigte Segmentinformationen stammen aus `theme_segment_assignments`; die öffentliche Animeprojektion leitet keine zweite Segmentwahrheit aus Range oder Versionslabel ab. OpenAPI, Go-Runtime und TypeScript für `fansub_groups` und IDs wurden angeglichen.
- Der gemeinsame Manifestcache hat 60 Sekunden Freshness, höchstens 20 ungenutzte erfüllte Einträge, kontrollierten Consumerabbruch und Fehlerretry. Ein normaler Seitenaufruf teilt weiterhin einen Manifestrequest.
- Coverquellen werden tatsächlich auf höchstens 512 Pixel Breite ausgeliefert. Provider erhalten wirksame Größenparameter. Lokale Dateien und API-Files verwenden einen gemeinsamen begrenzten Sharp-Helper innerhalb bestehender Medienpfade. Originale bleiben unverändert. Die finale Coverroute lautet `/covers/display/[file]`; ein zunächst ungeeigneter Unterpfad unter einer existierenden Datei wurde wegen nachgewiesenem ENOTDIR korrigiert.
- Derselbe Testlauf fand eine bereits im Auditstand defekte JPG-Platzhalterdatei. Nur der Anime-Displayfallback nutzt jetzt eine gültige kleine PNG-Quelle. Andere historische JPG-Consumer wurden nicht pauschal verändert.

**Findings:** F-09, F-10, F-11 und F-13 im Scope behoben. F-08/F-14: Publicprojektion, Consumerprüfung, Assignmentautorität, Vertragsparität und explizite IDs sind umgesetzt; die volle Adminprojektion und der alte No-selector-Stream bleiben bewusst bestehen. Die alte Streammehrdeutigkeit ist damit keine global behobene Sicherheitslücke.

## Tests, Builds und Browserbelege

| Prüfung | Phase 158 | Phase 159 |
|---|---|---|
| Gezielte Frontendtests | 168 bestanden | Planweise dokumentierte Prüfungen; abschließend vollständige Suite |
| Vollständige Frontendsuite | 2459 bestanden, 2 bestehende Fehler, 3 todo | 2616 bestanden, dieselben 2 Fehler, 3 todo |
| Typecheck | Exit 0 | Exit 0 |
| Scoped Lint | Exit 0 | Exit 0 einschließlich finalem Harness |
| Globales Lint | 13 bestehende Fehler / 331 Warnungen | Exakt dieselben Diagnosen und Anzahlen |
| Relevante Go-/Contract-/SQLtests, Build und Vet | Bestanden; echte isolierte PostgreSQL-Fixtures | Bestanden; frische isolierte PostgreSQL-Fixtures |
| Vollständiger Produktionsbuild | Bekannter Admin-Exportblocker | Derselbe unveränderte Blocker |
| Selektiver tatsächlicher Produktionsbuild | Betroffene öffentliche Routen bestanden | Zusätzlich Display-/Media-/Proxy-/Streamrouten bestanden |
| Zusammenhängende Browsermatrix | 33/33 bestanden | 91/91 bestanden, einschließlich aller 33 Regressionen |
| Diffprüfung gegen Auditbasis | Exit 0 | Exit 0 |

Die zwei unveränderten Testfehler liegen in `cssCustomProperties.guard.test.ts`. Der vollständige Build scheitert am unzulässigen Export `formatEditLoadError` in `frontend/src/app/admin/anime/[id]/edit/page.tsx`. Der selektive Build verwendet die offizielle Next-Option und eine isolierte Quellkopie; keine Typprüfung wurde deaktiviert. Ein globaler Build-/Lint-/Testsuite-PASS wird ausdrücklich nicht behauptet. In Phase 158 übersprungene fünf nicht einschlägige Backendtests und weitere ausdrücklich ausgewiesene Tests ohne eigene Fixturevoraussetzungen sind keine SQLbeweise.

Geprüfte Breiten: **360, 390, 767, 768 und 1440 Pixel**, jeweils Episode geschlossen und geöffnet. In den Produktionsfixtures gilt überall `document.scrollWidth <= viewport`, horizontaler Rootscroll bleibt 0. Berechnete Farben: Episodentitel `rgb(28,28,30)` auf `rgb(255,255,255)`; Contributionüberschrift weiß auf `rgb(15,15,18)`. Fokus am Gruppenbereich und Relationsslider wurden mitgeprüft. Der reale gemeinsame Browser bestätigt zusätzlich 390/1440 Pixel, Episodenexpansion und die sichtbare Pretty-Projektnavigation.

Session-/HTTP-Fixtures decken Access, Refresh-only, abgelaufenes Access mit gültigem Refresh, fehlende Tokens, Authwechsel nach Mount, bestehenden Watchlisteintrag sowie 401/5xx/Netzwerkfehler ab. Die Route wurde mit gültiger, präfixbehafteter, dezimaler, null, negativer, unsicher großer und unbekannter ID über tatsächlichen HTTP-Status und Metadaten geprüft. Authentifizierte Mutationen wurden ausschließlich isoliert simuliert.

Phase 159 ergänzt Gruppen-/Storage-/Multitab-/Hydration-/Gridfälle, 125 Varianten mit Cursorfortsetzung, neutrale/leere Serien, ID-Kollisionen, Assignmentdivergenz und Manifeständerungen innerhalb einer SPA-Sitzung. 48 Medienfälle bei 390/1440 Pixeln und DPR 1/2 ergeben 96 getrennte kalte/warme Beobachtungen ohne Browser-Requestinterception: erfolgreiche Bildquellen kalt genau ein Bildbody, öffentlich warm Cache ohne erneuten Body, private/no-store-Quellen warm ein neuer Body. 404/500 liefern ein bis zwei kleine Fehlertexte und keinen Bild- oder Originalbody. Lokale, Provider-, private API-, statische Cover-, GIF-, APNG-, WebP- und AVIF-Quellen sind erfasst.

Finale Phase-159-Datei `fixture-results.json`: SHA256 `22f7fc89df1933c957e31edfd1694fbb3ad429ce7936f5ad200e606023a5d7cf`, Exit 0. Frühere Harnessfehlläufe sind getrennt erhalten und wurden nicht als erfolgreich umgedeutet.

## Gemessener Request-, SQL- und Medienvergleich

| Fall | Vorher | Nachher | Grenze der Aussage |
|---|---|---|---|
| Relations, erfolgreich/leer | 8 Statements gesamt, davon 1 Schema-/7 Datenstatements | 2 Datenstatements | Echter QueryTracer mit isolierter Fixture |
| Relations unbekannt/deaktiviert | 2 Statements | 1 Statement | Echte 404; ungültige IDs weiterhin 0 SQL |
| AnimeDetail | 1 GET / 7 SQL | 1 GET / 7 SQL | Kein behaupteter Wegfall der neutralen Detailprojektion |
| Anonymer Initialaufruf | 10 API-Requests | 10: 8 SSR + 2 Client | Einschließlich drei Role-Catalog-Aufrufen; Medien separat |
| Gruppenauswahl/Episodenexpansion | Kein erforderlicher neuer fachlicher Request | 0 zusätzliche fachliche Requests | Grid und explizites Weiterladen separat |
| 125 Varianten, volle Projektion gegen erste Publicseite | 4 SQL, 125 Varianten, 57.773 Bytes | 2 SQL, 24 Varianten, 7.522 Bytes | Erste Seite ist absichtlich nicht das volle Inventar |
| Beibehaltene volle Adminprojektion derselben Fixture | 4 SQL / 57.773 Bytes | 4 SQL / 63.023 Bytes | Additive explizite IDs vergrößern diesen unverändert vollständigen Vertrag |
| Vollständige Publicfortsetzung mit 125 Varianten + neutraler Zeile | – | Limit 24: 6 Seiten / 39.456 Bytes; Limit 100: 2 Seiten / 38.362 Bytes | 2 SQL pro Seite; keine universelle Bytegarantie |
| Tatsächliches Buddy-Complex-Providercover | 1000×1426, 739.798 Bytes | 512×730, 95.674 Bytes | Reale HTTP-/Dekodiermessung, keine allgemeine KB-Zusage |

Die ältere Gesamtschätzung 38 → 32 SQL ist eine statische Addition der Phase-158-Pfade, keine End-to-End-Messung. Für Phase 159 wird daraus kein neuer gemessener Gesamtspeedup abgeleitet. Rowgrenzen bezeichnen ausgegebene atomare Zeilen, nicht physisch gescannte Datenbankzeilen. Die neutrale AnimeDetail-Liste und beliebig lange Texte haben durch diese Änderung keine globale Bytegrenze.

## Geänderte Dateien und Nachvollziehbarkeit

- Backend: Anime-/Relations-Handler und Repository, Anime-Slugprojektion; EpisodeVersion-Reads/-Grants/-Stream, Modelle, Publicquery und Repositoryprojektion.
- Frontend: Animepage/CSS, Kommentar-/Watchlist-/Contributionzustände, zentrale Sessionnutzung, FansubVersionBrowser/ActiveFansubStory, Gridnavigation, AnimeMediaProvider/Backdropresolver, bestehende Media-/Cover-/API-/Streamrouten und gemeinsame Displayhelper. Paketdeklaration verwendet dieselbe bereits vorhandene Sharp-Version; keine Frameworkmigration.
- Verträge: kanonische OpenAPI, gezielte TypeScript-/APIhelper-Parität, dokumentierter frontendseitiger Displayvertrag. Keine neue DB-Tabelle oder Migration.
- Tests/Harness: gezielte Go-/Vitest-/Contracttests, isolierter PostgreSQL-QueryTracer, vorhandener Phase-Harness samt Phase-159-Probe und Fixtures, Screenshots/HTTP-/CDP-/Hashnachweise.

Die Inventare umfassen für Phase 158 vier Backend-, 16 Frontend-, zwei Vertrags- und 18 Test-/Harnesspfade. Phase 159 umfasst sieben Backend-, 21 Frontend-, zwei Vertrags-, 24 Test- und vier Harnesspfade; der APIguide zählt dabei als Vertragsdokument.

Vollständige Dateilisten und Einzelcommits: [Phase 158](phase158/RESULTS.md), [Phase 159](phase159/RESULTS.md), jeweils `file-inventory.json` und GSD-Plan-Summaries. Diese Gruppenbeschreibung ersetzt die dortigen exakten Pfadlisten nicht.

## Grenzen, offene Entscheidungen und Human-UAT

Keine verpflichtende technische Fallgruppe bleibt ohne Nachweis. Echte Accountmutationen und Echtplayback gegen Live-Daten waren ausgeschlossen und wurden durch isolierte Fixtures ersetzt. Der vollständige Produktionsbuild ist weiterhin am genannten Altfehler blockiert; nachgelagerte unbekannte globale Buildfehler sind damit nicht ausgeschlossen.

Bewusst offen bleiben F-15 (globaler Owner-/Shell-DTO), Kommentar-Pagination/Produktentscheidung, umfassender Video-/Audio-Umbau, neue Anime-Slug-/Rating-/View-/Embyregeln, automatisches Credit-Merging und globale Lintbereinigung. Die alte Streamkette ohne Variantenselector bleibt mehrdeutig. Ein bestehender Fokusclip an Episodenheadern, das fehlende eigene Self-Canonical der Pretty-Projektseite und die defekte JPG-Platzhalterquelle anderer Consumer wurden nicht nebenbei umgestaltet. Kleine wiederholte Fehlerantworten sind transparent dokumentiert.

**Human-UAT bleibt OPEN:** Phase 156 GAP-02 mit 14 Origin-/Contributorprüfungen; Phase 157-06 Task 4; die menschliche Abnahme der Anime-Änderungen in 158/159. Automatisierte Tests, Screenshots und unabhängige Agentenprüfungen ersetzen diese Abnahmen nicht.

Es gab keine unautorisierte Produkt-, Datenbank- oder Scopeänderung: keine Migration, kein Seed/Reset, keine Live- oder vorhandene Testdatenmutation, keine pauschale Daten-/Tabellen-/Compatibility-Löschung, kein strukturelles Redesign und kein Push. Backendupdates erfolgten über den vorhandenen Air-Hot-Reload, ohne Containerneustart mit Migrationsentrypoint. Die laufende Dev-Buildablage, `.env`, Medienoriginale und Docker-Volumes wurden nicht überschrieben. Isolierte Fixtures verwendeten eigene temporäre Ressourcen; diese sind samt Ports und erfassten Container-IDs bereinigt. Die fremde Datei `frontend/scripts/shot2.mjs` bleibt unangetastet.
