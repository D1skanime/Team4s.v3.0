---
phase: 158-public-anime-detail-reparatur
reviewed: 2026-09-13T21:27:14Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - "backend/internal/handlers/anime.go"
  - "backend/internal/handlers/anime_relations_test.go"
  - "backend/internal/models/anime.go"
  - "backend/internal/repository/anime.go"
  - "backend/internal/repository/anime_public_read_integration_test.go"
  - "backend/internal/repository/anime_v2.go"
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"
  - "frontend/src/app/anime/AnimeListLoading.tsx"
  - "frontend/src/app/anime/[id]/AnimeDetailLoading.tsx"
  - "frontend/src/app/anime/[id]/animeDetailData.test.ts"
  - "frontend/src/app/anime/[id]/animeDetailData.ts"
  - "frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/page.tsx"
  - "frontend/src/app/anime/[id]/page.module.css"
  - "frontend/src/app/anime/[id]/page.performance.test.ts"
  - "frontend/src/app/anime/[id]/page.test.tsx"
  - "frontend/src/app/anime/[id]/page.tsx"
  - "frontend/src/app/anime/page.tsx"
  - "frontend/src/components/anime/AnimeContributionsSection.module.css"
  - "frontend/src/components/anime/AnimeContributionsSection.test.tsx"
  - "frontend/src/components/anime/AnimeContributionsSection.tsx"
  - "frontend/src/components/comments/CommentForm.test.tsx"
  - "frontend/src/components/comments/CommentForm.tsx"
  - "frontend/src/components/fansubs/FansubVersionBrowser.module.css"
  - "frontend/src/components/fansubs/FansubVersionBrowser.test.tsx"
  - "frontend/src/components/fansubs/FansubVersionBrowser.tsx"
  - "frontend/src/components/profile/CorrectionReportModal.test.tsx"
  - "frontend/src/components/watchlist/WatchlistAddButton.module.css"
  - "frontend/src/components/watchlist/WatchlistAddButton.test.tsx"
  - "frontend/src/components/watchlist/WatchlistAddButton.tsx"
  - "frontend/src/lib/api.auth-refresh.test.ts"
  - "frontend/src/lib/api.ts"
  - "frontend/src/lib/useAuthSession.test.tsx"
  - "frontend/src/lib/useAuthSession.ts"
  - "frontend/src/types/__tests__/anime-detail-contract.test.ts"
  - "frontend/src/types/anime.ts"
  - "shared/contracts/openapi.yaml"
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 158 — unabhängiger Code-Review

**Ergebnis: clean.** In den 37 geänderten, existierenden Quell-, Vertrags- und Testdateien wurde bei Standardtiefe kein belegter neuer BLOCKER und keine belegte neue WARNING gefunden. Dies ist ein Code-Review der Implementierungspläne 158-01 bis 158-03; es ersetzt weder die technische Gesamtverifikation aus 158-04 noch einen Human-UAT-Sign-off.

## Prüfstand und Umfang

- Kanonisches Repository: `/home/d1sk/team4s` auf `team4s-linux`.
- Ausgangscommit: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
- Review-HEAD: `388a6e6215d17502cc2c80d2e237a7256f26d462`.
- Ende der geprüften Produktimplementierung: `d0ae1f9b`.
- Auswahl: `git diff --name-only 7c7e1c7d..388a6e62 -- frontend/src backend shared/contracts`, beschränkt auf die 37 existierenden Dateien. Die bewusst umbenannten Loading-Komponenten sind enthalten; die entfernten automatischen `loading.tsx`-Konventionen wurden über den Diff und ihre neuen Aufrufstellen mitgeprüft.
- Grundlage: AGENTS, AI-HANDOFF, Phase-158-CONTEXT/VALIDATION, 158-01 bis 158-03-SUMMARY, die betroffenen Produkt- und Teständerungen sowie die benötigten zentralen Auth-, Routing- und Repository-Seams.
- Methodik: Änderungen gegen den Ausgangscommit, aktuelle Implementierung und Aufrufstellen, negative Pfade, Session- und Requestgrenzen sowie Aussagekraft der neuen Tests. Bei großen bestehenden Dateien wie `api.ts` und `openapi.yaml` wurden die betroffenen Abschnitte und erforderlichen Querverweise geprüft; eine Vollprüfung ihrer unveränderten übrigen Subsysteme wird nicht behauptet.
- Laufzeitgrenze: Der Spawn eines neuen Reviewers scheiterte am Agent-Thread-Limit. Ein bestehender, an der Produktimplementierung unbeteiligter Planungsagent wurde mit den Code-Reviewer-Instruktionen wiederverwendet.
- Unabhängigkeit: Der Reviewer hat die Phase geplant, jedoch keine der geprüften Produktänderungen implementiert. Der Orchestrator führte keinen parallelen eigenen Code-Review durch.

## Geprüfte Funktionsgrenzen

| Bereich | Prüfung und Ergebnis |
|---|---|
| Aktive Session | `getAuthSessionSnapshot` liefert eine tokenfreie Account-ID aus der bestehenden Sessionmetadatenquelle. `useAuthSession` verwendet weiterhin die zentrale Infrastruktur und reagiert auf Auth-, Storage-, Fokus- und Sichtbarkeitsereignisse. Access **oder** Refresh reicht für die aktive UI-Session. Keine neue lokale Token-, Bearer- oder Refreshimplementierung. |
| Accountwechsel und verspätete Antworten | Bekannte Account-ID und konservative Generation bei unbekannter Identität binden die Aktionen an ihren Besitzer. `isCurrentSession()` aktualisiert seine Vergleichsgrundlage synchron bei Sessionereignissen; damit werden auch alte Antworten vor dem nächsten React-Commit verworfen. Account-/Anime-Schlüssel und Requestgenerationen schützen Ergebnis-, Fehler- und Finally-Pfade. Die Tests enthalten fehlende/blockierte Metadaten und gleichbleibende Token-Präsenz beim Accountwechsel. |
| Watchlist | Initial unbekannt, Laden, vorhanden, nicht vorhanden und Requestfehler bleiben unterscheidbar. Nur der dokumentierte GET-404 ergibt bekannte Abwesenheit. Andere Status- oder Netzwerkfehler führen weder zu einem angenommenen `false` noch zu einer freigegebenen Add/Delete-Aktion. Alte Antworten dürfen einen neuen Status oder eine neue laufende Aktion nicht verändern. Fehler und Retry bleiben außerhalb des individuell gestylten Hauptbuttons sichtbar. |
| Kommentare | Formular und Submit folgen der aktiven Access-/Refresh-Session. Anime-/Accountwechsel isolieren den Entwurf; alte Ergebnisse dürfen weder den neuen Entwurf löschen noch Callback oder Router-Refresh auslösen. Die Transport- und Refreshverantwortung verbleibt beim vorhandenen API-Client. |
| Contributions | Laden, erfolgreicher fachlicher Leerstand und Requestfehler sind getrennt. Retry nutzt das vorhandene Button-Pattern. Ein Animewechsel entfernt vorherige Beiträge und isoliert spätere Antworten sowie den Expansionszustand. |
| Strikte IDs und Next-Fehler | Die gemeinsame Ressource akzeptiert ausschließlich vollständig numerische, positive sichere Ganzzahlen. Ungültige Werte erreichen den Anime-GET nicht. Ein API-404 wird über `notFound()` abgebildet; andere API-Fehler werden nicht als fachlich fehlender Anime verschluckt. Seite und Metadaten verwenden denselben Loader. Canonical verwendet die aufgelöste numerische Anime-ID. |
| Streaming-/Loading-Grenze | Die Detailressource wird vor der eigenen Suspense-Grenze aufgelöst. Der Listenfallback ist in den Listeneinstieg verschoben, sodass kein übergeordnetes automatisches Anime-Loading die Detailprüfung vorzeitig in einen bereits begonnenen Erfolgsstream einschließt. Liste und Detail behalten ihre vorhandenen Fallback-Komponenten. |
| Kennzahlen | Fest codierte Bewertung und konstant gemappte Views werden nicht mehr als reale Kennzahlen gerendert. Es wurde keine Ersatzbewertung, Zählmechanik oder neue Emby-ID-Heuristik eingeführt. |
| Pretty-Projektlink | Die Detailprojektion liefert den autoritativen Anime-Slug additiv und normalisiert leere Werte. Der sichtbare Gruppenlink verwendet den bestehenden Projekt-Linkbuilder und vorhandene Gruppenslugs; der Browser konstruiert keine Slugs aus Titeln und lädt kein vollständiges Gruppenprofil zur Linkbildung. Der numerische Compatibility-Pfad bleibt erreichbar. |
| Compatibility-Route | Der Promise-only-Parametervertrag korrigiert die Next-16-Typgrenze der vorhandenen numerischen Route. Die Runtimeauflösung und ihr Pretty-Canonical bleiben erhalten; die ergänzten Tests prüfen unbekannte Ressource und kanonischen Zielpfad. |
| Relations | Der Handler verwendet die schmale Sichtbarkeitsprüfung anstelle des vollständigen Detailreads. Aktive, unbekannte und deaktivierte Ausgangsanime sowie Fehlerpfade bleiben getrennt. Der Erfolgsweg besteht aus Sichtbarkeitsprüfung plus Relationsread; es wurde keine Abfrage pro Relation eingeführt. Modell, Handler und dokumentierte öffentliche Antwortform passen zusammen. |
| Farben und Overflow | Episodentitel erhalten das etablierte dunkle Texttoken auf weißen Karten; Contributionüberschrift und Status verwenden das vorhandene helle Token auf dem dunklen Animebereich. Der Overflow wird am dekorativen Hero-Banner begrenzt. Keine globale Root-/Body-Regel und keine neue Farbregistry. |
| Verträge und Teständerungen | Slug ist in Go, OpenAPI und TypeScript additiv dokumentiert. Relationsantwort und Fehlerstatus sind dokumentiert. Die Änderungen an bestehenden Segmente-/CorrectionReport-Testmocks ergänzen die neue Hookform; es wurden dafür keine bestehenden Verhaltensassertionen entfernt. |

## Bewertung der Nachweise

Die Reviewprüfung hat die neuen Assertions und Fixtures auf ihren tatsächlichen Nachweisumfang geprüft. Sie hat keine Tests zusätzlich ausgeführt; der Reviewauftrag verlangt Wiederholungen nur bei einem konkreten Verdachtsfall. Die aufgeführten Ausführungsergebnisse stammen aus den Plan-Summaries, dem aktuellen Gate-Stand des Orchestrators und dessen Live-Nachtrag, nicht aus einer zweiten unabhängigen Testausführung durch diesen Reviewer.

- Die Komponenten- und Hooktests prüfen Sessionänderungen, alte Erfolgs-/Fehlerantworten, Same-turn-Accountwechsel, blockierte/fehlende Metadaten und Fehlerzustände über Verhalten. Die Auth-Regression verwendet die bestehenden Watchlist-/Kommentarhelfer zusammen mit dem zentralen Refreshpfad.
- Der Unit-Test mit durchgereichtem React-`cache`-Mock beweist **keine** RSC-Memoisierung. Die tatsächliche Requestzahl ist deshalb ein eigenständiges Laufzeitgate in 158-04 und wird hier nicht aus dem Unit-Test abgeleitet.
- SQL-Nachweise verwenden die isolierte Repositoryfixture. Der vom Orchestrator gemeldete frische Lauf zählt beim Relations-Erfolg zwei Datenstatements, bei unbekanntem/deaktiviertem Anime eines, bei syntaktisch ungültiger ID keines und bei Fehlerpfaden eines beziehungsweise zwei. Die sechs Detail-Slugfälle verbleiben bei sieben Statements. Diese Zahlen sind konkrete Prüfstandswerte, kein allgemeines Latenzversprechen.
- Der Live-Nachtrag des Orchestrators dokumentiert 360, 390, 767, 768 und 1440 Pixel, jeweils geschlossene/geöffnete Episode, keinen horizontalen Rootscroll sowie berechnete Vorder-/Hintergrundfarben. Sichtbarer Pretty-Link, Zielnavigation und Canonical der numerischen Compatibility-Route wurden dort geprüft. Der Reviewer hat diese Browserprüfung nicht selbst wiederholt.
- Tatsächliche HTTP-404/Robots-/Canonical-Nachweise und der isolierte öffentliche Produktionsbuild bleiben Aufgabe der technischen Abschlussverifikation. Der dokumentierte Development-Smoke allein wird nicht als Produktionsnachweis gewertet.

## Bestehende Befunde und bewusste Grenzen

Diese Punkte sind keine neuen Findings dieses Reviews:

- Frische vollständige Frontendsuite laut Orchestrator: 2459 Tests bestanden; die beiden bereits vorhandenen CSS-Custom-Property-Guardfehler verbleiben. Die bestehenden 13 Lintfehler und 331 Warnungen werden separat geführt. Aktueller Typecheck ist erfolgreich.
- Der vollständige Next-Produktionsbuild wird durch den bereits im Ausgangscode bestehenden Admin-Page-Export `formatEditLoadError` blockiert. Dies ist keine Phase-158-Regression; 158-04 prüft den öffentlichen Build isoliert.
- Gruppenstate und 200-ms-Polling, Gridnachbarnavigation, Coverbudget, Manifestcache sowie Varianten-/Segmentprojektion gehören ausdrücklich zu Phase 159. Deren bekannte Altstruktur wird nicht als neu eingeführter Phase-158-Fehler gezählt.
- Globaler Owner-/Shell-DTO, Kommentarpagination, umfassendes Video-/Audioverhalten, Anime-Slugroute, Rating-/Viewsystem, Emby-Produktentscheidung und pauschale Legacybereinigung sind nicht Teil dieses Reviews oder einer impliziten Freigabe.
- Die Pretty-Projektseite besitzt laut Live-Nachtrag bereits im Ausgangscode kein eigenes `generateMetadata`. Der hier geprüfte Link und das Canonical der numerischen Compatibility-Route ändern diese fremde Seitengrenze nicht.
- Die neuen UI-Besitzprüfungen wurden für Ergebnisverarbeitung und Sessionreaktivität geprüft. Daraus wird keine vollständige Sicherheitszertifizierung sämtlicher unveränderter zentraler Auth-/Transportpfade abgeleitet.

## Findings und Übergabe

**BLOCKER: 0 · WARNING: 0 · INFO: 0.** Keine Korrekturdateien oder zusätzlichen Implementierungsaufgaben aus diesem Review.

158-04 kann die technische Gesamtverifikation abschließen. Ein Code-Review mit Status `clean` schließt keine offenen menschlichen Abnahmen: Phase 156 GAP-02 und Phase 157 Plan 06 Task 4 bleiben offen, ebenso die getrennt dokumentierten menschlichen Sichtprüfungen dieses Auftrags.

Der Reviewer hat ausschließlich diesen Bericht erstellt. Keine Produktdateien, Datenbankdaten, Migrationen, Runtimekonfigurationen oder Trackingartefakte wurden geändert; kein Commit, Staging, Containerneustart oder Human-UAT-Sign-off wurde vorgenommen.
