# Backend: Release-Datumsregeln und Hinweise

Status: implementiert und technisch geprüft; keine Commits durch Backend-Executor. Ausgangsstand des Quickplans: cbfec666. Human-UAT und Abschlussdokumentation liegen beim Orchestrator.

## Verwendete Architektur und Consumer

- `EpisodeVersionRepository.Update` lädt den aktuellen Zustand schon vorher über `loadEpisodeVersionStateForUpdate` mit `FOR UPDATE OF rv, rev, fr`. Die neue eigene Datumsprüfung nutzt genau diesen zusammengeführten Zustand vor jeder Mutation. Kein zusätzlicher DB-Lookup und keine neue Transaktion/Sperrstrategie.
- `models.ValidateEpisodeVersionDates` wird vom bestehenden Requestvalidator und nach dem Repository-Merge gemeinsam verwendet. Die Fehlermeldung ist in beiden Wegen identisch: **Der Bearbeitungsabschluss darf nicht vor dem Bearbeitungsbeginn liegen.**
- Die Prüfung betrifft nur Patches, die `production_started_on` oder `release_date` setzen/leeren. Unabhängige Metadatenkorrekturen werden nicht wegen einer bereits vorhandenen inkonsistenten Datumsreihe blockiert. Fehlende Werte bleiben unbekannt; gleiche UTC-Kalendertage sind erlaubt. Vergleiche ändern keine gespeicherten Zeitstempel.
- `release_date` bleibt das vorhandene Feld mit der bestehenden Editorbezeichnung „Bearbeitung abgeschlossen am“. Effektiver Wert bleibt `COALESCE(rev.release_date, fr.release_date)`; bestehende Release-/Public-Consumer und die bestehende Schreibprojektion auf Version und Release bleiben erhalten. Keine zusätzliche Datumsquelle oder Produktumdeutung.
- `EpisodeVersionEditorContext` ist bereits der gemeinsame Kontext des Admin-/Contributor-Editors und Member-Workspace. Beide Loader bekommen aus derselben Repositorymethode `ListDateNeighbors` die additive, immer als Array ausgegebene Eigenschaft `date_neighbors`. Ein Ankerfehler bricht den Kontext mit dem vorhandenen 500-Fehler ab, statt bestätigte leere Hinweise vorzutäuschen.
- Die Contributor-Whitelist hatte die im Modell/Vertrag bereits vorhandenen Felder `variant_id` und `release_version_id` ausgelassen; Go serialisierte deshalb Null-IDs. Sie reicht jetzt genau die bereits aufgelösten Werte durch. Ursache/Umfang: kanonische Identität für dieselbe Kontextprojektion; keine Änderung der bestehenden numerischen Compatibility-Auflösung oder Provider-/Streamfreigabe.

## Vertrag der Hinweisanker

Pro Eintrag: `fansub_group_id`, `field` (`production_started_on` oder `release_date`), `direction` (`previous` oder `next`), reale `release_version_id`, tatsächliches `episode_number`-Label als String und UTC-`date` in `YYYY-MM-DD`.

Die neue Methode nimmt ausschließlich die **bereits aufgelöste reale Releaseversion-ID**, nie die rohe Route oder Variant-ID. Die SQL-Projektion bestimmt Anime, Versionlabel und Gruppen selbst aus den persistierten Besitzbeziehungen. Versionlabel werden auf beiden Seiten getrimmt; leere Labels vergleichen sich mit leeren Labels. Kein Erraten von `v1`, keine Groß-/Kleinschreibungsheuristik.

Je persistierter Gruppe und Feld: spätestes bekanntes Datum einer früheren Folge und frühestes bekanntes Datum einer späteren Folge. Bei Datengleichheit gewinnt die nächstgelegene Episodennummer, dann die kleinere reale Releaseversion-ID. Leere Daten werden übersprungen. Fremde Anime, Gruppen und Versionslabels, dieselbe reale Version, gleiche Episodennummern und nicht numerisch geordnete Episodenlabels werden ausgeschlossen. Numerische Prüfung erfolgt vor Cast in einem CASE; Labels wie `01` und `06` werden unverändert ausgegeben. OP-/ED-/Segmentdaten haben hier keine Beteiligung.

Das ist ausschließlich eine begrenzte Plausibilitätsprojektion für die UI. Die Backendmutation führt **keine folgenübergreifende Sperre** ein und verändert keine Nachbarfolgen.

## Query- und Requestbudget

| Teil | Vorher | Nachher |
|---|---|---|
| Eigene Datumsvalidierung | Vollpatch im Handler als Zeitstempelvergleich; Partialpatch ungesichert | Gemeinsame UTC-Tagesprüfung plus Validierung unter vorhandener Sperre; **0 zusätzliche Statements** |
| Kontext-Datumsanker | Keine | **1 mengenbasierte SQL-Abfrage** pro vorhandenen Editor-Kontextaufruf |
| Antwortvolumen der Anker | Keine | **höchstens 4 Einträge je persistierter Gruppe**, unabhängig von Episoden-/Variantenanzahl |
| Zusätzliche Browserendpoints | Keine | Keine |

Instrumentierte PostgreSQL-Fixtures bestätigen eine Abfrage und acht Antwortzeilen bei zwei Gruppen, sowohl für das kleine Inventar als auch nach zusätzlichen 100 Releases. Die Query sortiert passende Kandidaten serverseitig; es gibt keinen konstanten Laufzeitanspruch oder erfundene Millisekundenverbesserung. Kein SQL pro Folge, Variante oder Gruppe. Bestehende Auth-/Kontextqueries bleiben bestehen.

## Tests und Sicherheit

`python3 .planning/quick/260914-gif-release-dates-and-media-gallery/run_backend_dates.py`

- **84 bestandene Prüffälle** (19 Top-Level-Tests einschließlich vorhandener Public-/Stream-Regressionen und Unterfällen), 0 Fehler, 0 übersprungene Tests; finaler Go-Lauf 5,82 Sekunden.
- Start-only-/Abschluss-only-Patches gegen gespeicherten Gegenwert; volle ungültige Kombination; komplette Metadatenrücknahme vor Schreibbeginn; null löschen; gleiche Kalendertage trotz unterschiedlicher Uhrzeiten; Zeitzonenoffsets nach UTC.
- Zwei konkurrierende, einzeln gegen den Ausgangsstand gültige Partialpatches können gemeinsam keine ungültige Kombination speichern: genau einer erfolgreich, einer mit Datumsfehler, Endzustand gültig.
- Tatsächliche PATCH-Handlerantworten: beide Validierungspfade liefern vorhandenes 400-Envelope mit gleicher deutscher Meldung; gültiger gleicher Tag liefert 200; fehlende Identität bleibt 401.
- Gaps, nur einseitige Anker, leere Serienwerte, beide Felder getrennt, echte Episode-Labels, Gruppen-/Versions-/Animeausschluss, case-sensitive Labels und getrimmte Labels, Release-Level-Datumsfallback.
- Isolierte ID-Kollision: eigene reale Version503/Variante10503, fremde Variante503. Anker kommen von Version503. Beide realen Admin-/Contributor-Handler liefern die expliziten IDs unverfälscht.
- Gezielt abgebrochene Ankerabfrage: beide Kontext-Handler liefern 500, keine leere Erfolgsliste. Unbekannte Version bleibt 404. Jeder Loader führt genau eine Ankerabfrage aus.
- Vorhandene Public-/Stream-Identitäts-/Budgettests bestehen unverändert.
- `gofmt` auf acht eigenen Go-Dateien; `git diff --check` bestanden.

Die Tests verwenden ausschließlich die bestehende bewachte `TEAM4S_PHASE117_TEST_DSN`-Fixture mit eindeutigem Schema und eine eigens angelegte PostgreSQL16-Instanz ohne Hostport, tmpfs256MiB/384MiB-Limit. Go läuft in separatem Container1400MiB, GOMEMLIMIT800MiB, GOMAXPROCS2/-p1. Repository und Migrationen sind read-only eingebunden. Alle erzeugten Container wurden nach ID-Prüfung entfernt. Keine Live-Datenbank, Volumen-, Schema-, Seed- oder Mediendatenmutation.

Zwei erste Läufe fanden Fehler **in neuen HTTP-Testfixtures**: fehlender verpflichtender DisplayName und fehlende globale Rolle-Capability-Initialisierung. Fixtures korrigiert: vollständige Testidentität und lokale explizite bestehende Rechte über den zentralen Resolver, ohne globalen Cache zu verändern. Runtimecode benötigte dafür keine Nachkorrektur. Protokolle `backend-focused-attempt1/2.jsonl`, final `backend-focused-final.jsonl` und `.json` bleiben nachvollziehbar.

## Geänderte Backenddateien

- `backend/internal/models/episode_version.go`: Anker-Datenmodell, Kontextarray, gemeinsamer Tagesvalidator/Fehler.
- `backend/internal/models/episode_version_dates_test.go`: reine Tages-/UTC-/null-Fälle.
- `backend/internal/repository/episode_version_repository.go`: gesperrte Partialpatchprüfung vor Mutation.
- `backend/internal/repository/episode_version_date_neighbors.go`: begrenzte persistierte Ankerprojektion.
- `backend/internal/repository/episode_version_dates_integration_test.go`: PostgreSQL-, Konkurrenz-, HTTP-, Identitäts- und Querybudgetbelege.
- `backend/internal/handlers/episode_version_validation.go`: vorhandener Vollpatchvalidator verwendet gemeinsame Regel.
- `backend/internal/handlers/episode_version_update.go`: Repository-Datumsfehler auf vorhandene 400-Antwort abbilden.
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go`: beide Kontexte um Anker erweitern und explizite Contributor-Identitäten durchreichen.

## Grenzen und bewusste Nichtänderungen

Anker sind ein Snapshot beim bestehenden Kontextaufruf, keine Live-Synchronisierung fremder Bearbeitungen. Nicht numerische Specials sind nicht automatisch chronologisch einzuordnen und liefern keine Folgehinweise. Die alte Route-/Aliasauflösung wurde nicht umgebaut; nach deren Auflösung wird die reale Identität ausdrücklich weitergegeben. Der bestehende `release_date`-Alias und die Veröffentlichung-/Abschlusssemantik werden nicht neu modelliert. Keine Migration, kein Backfill, keine automatisch ausgefüllten Daten und keine unangeforderte fachliche Chronologiesperre. Frontend-/Vertrags-/Browserabnahme und Human-UAT führt der Orchestrator zusammen.
