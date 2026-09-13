---
phase: 158-public-anime-detail-reparatur
date: 2026-09-13
status: technical_verified
requirements_verified: 9/9
global_production_build_passed: false
independent: true
human_signoff: false
---

# Phase 158 — unabhängige Goal-backward-Verifikation

## Prüfgrenze

Prüfung des autorisierten Reparaturziels aus ROADMAP, P158-01 bis P158-09, CONTEXT D-01 bis D-08, VALIDATION, PLAN-INDEX-COVERAGE und Plänen 01–04. Baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`; Produktstand: `d0ae1f9b`; final geprüfter Harness: `feeeb125fe249ab03cb33882814704b070ceacea`. Der Vergleich `git diff d0ae1f9b HEAD -- frontend/src backend shared/contracts` ist leer.

Der Verifier hat die ursprüngliche Komponenten-Auditdatei geschrieben, aber keine Phase-158-Produktimplementierung. Eigenständig geprüft wurden aktuelle Funktionen, Verdrahtung, relevante Testkörper, HTTP-/Browserharness, SQL-Tracer, tatsächliche Logs und Exitdateien. Summaries und REVIEW sind Orientierung, kein alleiniger Erfolgsbeweis. Kein breiter Testlauf wurde grundlos wiederholt. Die Live-CUA-Sichtprüfung stammt ausdrücklich vom Root-Orchestrator; ich habe keinen zweiten Browserlauf oder menschlichen Sign-off vorgenommen.

Alle hier genannten Evidence-Dateien liegen unter `docs/audits/2026-09-13-public-anime-detail/phase158/`, sofern kein anderer Pfad angegeben ist. Ausschließlich dieser Bericht wurde vom Verifier geschrieben; keine Produkt-, Test-, Migrations-, Runtime- oder Trackingänderung, kein Commit.

## Anforderungsmatrix

| ID / Audit | Aktuelle Implementierung und Verdrahtung | Unabhängig geprüfter Nachweis | Ergebnis |
|---|---|---|---|
| P158-01 / F01 | `frontend/src/components/fansubs/FansubVersionBrowser.module.css:103` setzt dunkles vorhandenes Texttoken auf weiße Karte; Header erbt. `frontend/src/components/anime/AnimeContributionsSection.module.css:11` und :15 verwenden vorhandenes Weißtoken auf dunkler Fläche. | `fixture-results.json`: fünf geometry-colors-focus-slider-Prüfgruppen, je geschlossen/offen: Text rgb(28,28,30), Karte weiß, Contribution weiß, Main rgb(15,15,18). `ROOT-LIVE-NOTES.md` und `root-live-browser.json` bestätigen echte Seite und Sichtprüfung. | VERIFIED |
| P158-02 / F03 | `frontend/src/app/anime/[id]/page.module.css:54`: overflow clip ausschließlich am dekorativen heroBanner. Hero-Controls liegen außerhalb; keine neue Root-/Bodyregel. | Zehn Geometriemessungen für 360/390/767/768/1440: document.scrollWidth ≤ viewport, erzwungener scrollX=0, fokussierter Gruppenlink innerhalb Viewport, sichtbarer Outline und keine schneidenden Vorfahren. Relationsslider bewegt sich bei allen Breiten. Root-Livedaten bestätigen Banner mit realen Medien. | VERIFIED |
| P158-03 / F02 | `frontend/src/lib/api.ts:1149` ergänzt tokenfreie accountIdentity; `frontend/src/lib/useAuthSession.ts:44` synchronisiert vorhandene Ereignisse und konservative Generation; :73 schützt aktuelle Session. `WatchlistAddButton.tsx:24` und `CommentForm.tsx:20` verwenden Access ODER Refresh und keyed Anime/Account-Lifecycle. Zentrale Transport-/Refreshimplementierung unverändert. | Browserfälle none/access/refresh/expired und Login–Accountwechsel–Logout nach Mount bestanden. `frontend/src/lib/api.auth-refresh.test.ts:219` startet echte Watchlist-/Kommentarhelfer parallel, assertiert einen Refresh und aktuelle Bearer. Hooktests :44/:58 prüfen Rotation/Fokus und fehlende/blockierte Metadaten. Komponenten prüfen verspätete Erfolge/Fehler für Anime/Account/Logout/Metadaten, Kommentar zusätzlich same-turn :128. | VERIFIED |
| P158-04 / F12 | `frontend/src/components/watchlist/WatchlistAddButton.tsx:45`: nur GET404 wird absent; Fehler bleiben unknown, :70 blockiert unbekannte Mutationen, :127 zeigt Meldung unabhängig Custom-Klasse. `frontend/src/components/anime/AnimeContributionsSection.tsx:26` trennt Laden/Fehler/erfolgreich leer und ignoriert alte Animeantwort. | Browser: Watchlist401/500/network jeweils writes0 im Unknown, Retry→existing→DELETE mit sichtbarem Customfehler; Contributions401/500/network jeweils sichtbares Laden, Fehler statt Leerzustand, Retry→leer; Kommentare401/500/network ohne Scheinerfolg. Watchlisttests :89 prüfen Add UND Delete Fehler; :123 alte Status-/Mutationsantworten und :154 altes finally. Contribution-Komponententests prüfen Retry zu Gruppen und stale Antworten. | VERIFIED |
| P158-05 / F05 technisch | `frontend/src/app/anime/[id]/animeDetailData.ts:7` React-cache um vorhandenen GET; :9 vollständige Dezimal-ID und safe integer >0; :17 ausschließlich API404→notFound. `page.tsx:41` Metadata und :55 Seite verwenden denselben Loader vor Content-Suspense. Automatische Anime-loading-Dateien in explizit aufgerufene Komponenten umbenannt; Liste besitzt eigene Suspense. | Kalter echter Produktions-HTTPrequest mit normaler Chrome-UA:200, tatsächlicher Titel, /anime/1 Canonical ohne grid_query, genau ein AnimeGET und kein WatchlistSSR. 1abc/1.5/0/-1/unsafe/unknown jeweils echte404/noindex/keinCanonical. API500 und zerstörte Netzverbindung ergeben500 statt404. Unitfälle decken zusätzlich Whitespace/Exponent/Unicode/positive Leading-zero-Normalisierung. Unit-cache-Mock wird ausdrücklich nicht als Requestbeweis gewertet. | VERIFIED |
| P158-06 / F04 Darstellung | `frontend/src/app/anime/[id]/page.tsx:150` rendert Watchlist ohne SSR-Hinweis; Poster/Stats enthalten keine 7.8/Anime-Views; Embyfunktion und Zuordnung unverändert. Echte Episodenzahlen bleiben. | `frontend/src/app/anime/[id]/page.test.tsx:132` prüft entfernte Fakedaten und exakten Anime22-Embytarget; :139 kein leerer Statswrapper; :146 echte Episodecounter bleiben. Baseline-Diff zeigt keine Änderung `frontend/src/lib/emby.ts`. | VERIFIED |
| P158-07 / F06 | `backend/internal/repository/anime_v2.go:145` liest gespeicherten getrimmten Slug im bestehenden SELECT, Scan :226. Go/TS/OpenAPI additiv optional. `page.tsx:259` gibt Slug weiter; `frontend/src/components/fansubs/FansubVersionBrowser.tsx:130` verwendet vorhandenen Projektbuilder und bereits geladene Gruppen, sonst numeric Fallback. | SQL sechs Slugvarianten einschließlich null/leer/ohne Slugspalte, Detailbudget unverändert7. Vertragstest `frontend/src/types/__tests__/anime-detail-contract.test.ts:23`. Browserprimär und sekundär mit bewusst abweichenden Displaytiteln→autoritative Prettyhrefs; sichtbarer Klick funktioniert; numeric200 mit Prettycanonical. Missing-slug-Fallback/Encoding in Browser-Komponententests :25/:30/:35. | VERIFIED |
| P158-08 / F07 | `backend/internal/handlers/anime.go:220` nutzt ExistsVisible statt GetByID; `backend/internal/repository/anime.go:28` ein SELECT EXISTS. Danach vorhandener Relationsread. | `backend/internal/repository/anime_public_read_integration_test.go:28` zählt alle QueryTracer-Statements, einschließlich Schemazugriff; :121 echte Handlerrequests. Log bestätigt visible mit/ohne Relations und licensed200→2, unknown/disabled404→1, invalid400→0, DBfehler500→1/2. Payload und non-null leeres Array assertiert; keine Detail-/Schemaquery verborgen. | VERIFIED |
| P158-09 / Gesamtgate | Wiederholbarer Wrapper und isolierter Produktionsharness, frische Gesamtgates, separate Root-Livenavigation, Review/Security. | Finaler Fixturelauf33/33, Exit0, Hash unten; globale Tests/Lint/Fullbuild ausdrücklich mit bestehenden Fehlern, siehe Gateabschnitt. Endgültige Dokument-/Securitykonsistenz im Abschlussnachtrag. | VERIFIED im erklärten Phasenscope |

## Vollständigkeit der Belege

Die Auth-Race-Matrix ist nicht auf einen erfolgreichen Screenshot reduziert: Watchlist prüft Status und Mutation jeweils Erfolg/Fehler nach fünf Besitzerwechseln; Kommentar prüft beide Ausgänge nach denselben Wechseln sowie unmount und same-turn. Eine bekannte Accountrotation behält Entwurf/Status; unbekannte Identität erhält nur beim bestehenden Authereignis eine neue Generation. Kein Account wird aus dem Anzeigenamen geraten.

Die isolierten Browserfälle benutzen synthetische Sessions in neuen Loopback-Kontexten. `frontend/scripts/anime-detail-phase158-probe.mjs:45` blockiert fremde Origins; sämtliche /api-Aufrufe werden abgefangen, Schreibversuche nur in Fixtures beantwortet. `frontend/scripts/fixtures/anime-detail-fixture-server.mjs:39` verlangt Opt-in/exakten Origin, :44 erlaubt nur GET. Der SQLwrapper verwendet eine gesonderte tmpfs-Datenbank mit explizitem Test-DSN; `anime_public_read_integration_test.go:46` benutzt die bestehende abgesicherte Testfixture, keine Anwendungs-DATABASE_URL.

Das erste gelesene Zwischenergebnis31/32 war tatsächlich FAIL, nicht nachträglich als PASS interpretiert. Die Assertion des Refresh-denied-Falls lief vor Hydration. Final wartet der Harness `anime-detail-phase158-probe.mjs:236` auf die echte Refresh401, danach Cookieentfernung/LoginUI und writes0. Ein erneuter vollständiger Wrapperlauf inklusive Produktionsbuild liefert33/33; zusätzlich enthalten ist unsafe-ID404. Frühere Ergebnisse ersetzen den finalen Lauf nicht.

## Frische Gates und Baselineabgrenzung

| Gate | Tatsächlicher Abschluss | Bewertung |
|---|---|---|
| Isolierte Produktionsfixtures |33 PASS,0 FAIL, Exit0; measuredAt2026-09-13T21:38:08.845Z | Betroffene technische Matrix bestanden. |
| Vollständige Frontendsuite |2459 PASS,2 FAIL,3 TODO;308 Dateien bestanden,1 fehlgeschlagen,1 übersprungen; Exit1 | Kein globales PASS. Beide CSS-Guardfehler bestehen bereits in `implementation-preflight/baseline-tests.log:722`. |
| Typecheck |Exit0 | Bestanden. |
| Lint |13 Fehler,331 Warnungen; Exit1 | Kein globales PASS; gleiche Anzahl und Quellen wie `implementation-preflight/baseline-lint.log:737`. |
| Vollständiger Next-Produktionsbuild |Kompilierung erfolgreich, Typprüfung scheitert an Admin-export formatEditLoadError; Exit1 | Bestehender globaler Blocker, kein Phase158-Erfolg umetikettiert. |
| Selektiver Next-Produktionsbuild |Elf aufgeführte öffentliche Routen inklusive /_not-found, Anime/List/Detail/numeric und Fansub/Pretty; TypeScript, Datensammlung, Optimierung und Traces erfolgreich; Exit0 | Echter Produktionsnachweis der betroffenen Routen; keine globale Buildfreigabe. |
| Backend-Relations-/Slugtests |Exit0; echte isolierte SQLtests ausgeführt |2/1/0 und Fehler1/2, Slugdetail7 bestätigt; andere SKIPs nicht als PASS gezählt. |
| Go build / vet |beide Exit0 | Bestanden. |
| Baseline-diff-check |Exit0 | Bestanden. |

Die beiden fehlschlagenden CSS-Testdateien einschließlich `frontend/src/lib/roleCatalog.accessibility.test.ts:268`, alle Dateien mit aktuellen Linterrors und `frontend/src/app/admin/anime/[id]/edit/page.tsx` wurden bytegleich gegen Baseline geprüft. Zusätzlich wurden vorhandene Baselinelogs gelesen. Die Fehlerklassifikation beruht somit auf Codevergleich und Logs, nicht allein auf dem Wort „baseline“ in einer Summary. Die Gesamtgates laufen absichtlich mit Exit1 aus; der Wrapper verschweigt sie nicht.

Der selektive Build nutzt nur eine app→src/app-Aliasverknüpfung in der disponiblen Kopie und Next --debug-build-paths. `scripts/verify-anime-detail-phase.sh:19` erlaubt diese getrennte Belegstrecke ausschließlich nach dem bekannten invalid-Page-export-Fehler und verifiziert dessen Baselineexistenz. Kein ignoreBuildErrors und kein Eingriff in die laufende /app/.next.

## Snapshot-Fingerabdrücke

| Datei | SHA256 |
|---|---|
| `frontend/scripts/anime-detail-phase158-probe.mjs` | b3168fd9e39f331735db7903a23d967bfb1874e76a418dfd7f4cd1a008ed48df |
| `frontend/scripts/fixtures/anime-detail-fixture-server.mjs` | ba3c942b3d7e9d0ed62027f55bf73c8e0ab57f8ea30fa1e9aaea7c0643930915 |
| `scripts/verify-anime-detail-phase.sh` | 182268521aca52b1546e52d6d15d42872b008161da5d9983f93eab26a9e05523 |
| `fixture-results.json` | 51958ed5631ccca7f0444419ebf7661213513537328f2f38244c0991c9d1f6d0 |

## Bewusste Grenzen

Keine neue belegte Produktregression oder harte fehlende Pflichtfunktion in P158-01 bis P158-08 gefunden. Ein Beweis für beliebige Produktionslast, alle Browser oder unveränderte Authsubsysteme wird daraus nicht abgeleitet.

Gruppenpoll/SSR-Filterstate, Gridnachbarn, Medienbudget/Manifestretention und Segment-/Variantenverträge sind Phase159, keine fehlenden Phase158-Aufgaben. Die Pretty-Projektseite besitzt bereits im Baselinecode kein eigenes Metadataexport; geprüft sind Animecanonical, Prettyhref/Navigation und numeric→Prettycanonical. Kein neuer Scope für einen Pretty-Selfcanonical.

Human-UAT156 GAP-02,157-06 Task4 und158 bleiben offen. Weder Root-CUA-Prüfung noch automatisierter Browserlauf sind ein menschlicher Sign-off. Phase159 erhält durch diesen Bericht keine implizite Benutzerabnahme; der Orchestrator entscheidet anhand des technischen Abschlusses über das ausdrücklich autorisierte Folgescope.

## Finaler Querabgleich und Urteil

Abschlussstand `7059fac8` nach Evidencecommit `ba3e598e`: RESULTS, 158-04-SUMMARY, 158-VERIFICATION und 158-UAT vollständig gelesen. Werte stimmen mit den zuvor unabhängig geprüften Quellen, Logs und Exitdateien überein. Fixturehash bleibt unverändert; Produktdelta seit d0ae1f9b weiterhin leer. Relative Beleglinks aus Summary/Verification/UAT mittels Path.resolve auf Existenz geprüft. Ein zunächst falsch gerichteter Linkhinweis des Verifiers wurde ausdrücklich zurückgenommen; die abschließend gespeicherten Links zeigen korrekt drei Ebenen nach root/docs.

158-SECURITY enthält die finale Deltaabnahme für genau die oben gehashten Harnessdateien: zehn geplante Maßnahmen geschlossen, null offen. Der frühere Snapshotvorbehalt ist aufgehoben. 158-REVIEW bleibt clean für die 37 geprüften vorhandenen Produkt-/Vertrags-/Testdateien. Diese ergänzenden Prüfungen ersetzen die eigene Matrix nicht.

**Urteil: scoped technical_verified, P158-01 bis P158-09 = 9/9 VERIFIED.** Kein harter offener Pflichtfall und keine neu belegte Regression im autorisierten Phase158-Scope. Gesamt-Frontendtests/Lint und vollständiger Produktionsbuild bleiben mit den dokumentierten Altfehlern fehlgeschlagen; der selektive Produktionsnachweis ist ausdrücklich begrenzt. Dies ist keine automatische Risikoakzeptanz oder globale Deploymentfreigabe.

Der bestehende Episodenheader kann mit seinem bereits zuvor vorhandenen Karten-overflow:hidden einen nach außen gezeichneten Fokusrahmen beschneiden. RESULTS dokumentiert dies separat; der Phase158-Nachweis belegt den unverdeckten Gruppen-CTA-Rahmen und den bedienbaren Slider gegenüber dem neu gesetzten dekorativen Hero-Clip. Kein allgemeines Accessibility-PASS wird behauptet. Weitere Fullbuildfehler hinter dem ersten bestehenden Adminblocker bleiben ungeprüft.

Alle menschlichen Abnahmen bleiben unverändert offen. Technische Bereitschaft für den ausdrücklich autorisierten Phase159-Folgescope ist hiermit belegt; dessen Start und Tracking besitzt der Orchestrator. Keine Inhalte aus Phase159 oder offene Human-UAT156/157 werden als mitverifiziert bezeichnet.
