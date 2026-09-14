---
phase: 159
slug: public-anime-detail-konsolidierung
status: verified
threats_open: 0
threats_blocking: 0
threats_pending: 0
asvs_level: 1
created: 2026-09-14
---

# Phase 159 — Security

## Finaler Securityabschluss — SECURED

**2026-09-14:12/12 geplante Maßnahmen CLOSED,0 offene Threats,0 pending,0 unregistered flags.** Dieser finale Status ersetzt alle nachfolgend ausdrücklich historisch erhaltenen PARTIAL-/Pending-Zwischenstände. Das Register und Frontmatter geben den Endstand wieder. Es werden nur die geplanten Mitigations abgenommen: No-selector-OR-Streamambiguität, globaler Baselinebuildblocker und Human-UAT bleiben gesonderte bestehende Grenzen.

**Snapshot:** Produkt `6ebfebf72019f337844b01fd7f7d832faaa71a74`, Harness `c1bd215c5a72a2a895b39c14354c3b86998d2ba5`. Finale Messung2026-09-14T05:46:48.139Z: **91/91 PASS, Exit0**, Ergebnis-SHA256 `22f7fc89df1933c957e31edfd1694fbb3ad429ce7936f5ad200e606023a5d7cf`. final-run.json und Ergebnisdateihash wurden unabhängig gelesen/abgeglichen; kein neuer Volltest.

### E11/E12 — Abschließende Isolation und Cleanup bestätigt

Die zuvor geprüften Guards sind im finalen Harness erhalten: nur158/159, eigene /tmp-Buildkopie ohne .env/.next/node_modules-Kopie, explizites Arbeitsverzeichnis und MEDIA_BASE_PATH, Produkt-SHA vor Buildreuse; GET-only SSRfixture3159, synthetische Browserwrites abgefangen, ungeroutete Medienmessung ausschließlich über GET-only3158/3159-Originproxy3160 mit CONNECT-Abweisung. Tests nutzen feste Phase106/117-TestDSNs zu eigenen tmpfs-Containern, keinen Live-DATABASE_URL-Fallback. Codebelege: `scripts/verify-anime-detail-phase.sh:4`–`:55`, `:79`–`:107`; `frontend/scripts/anime-detail-phase158-probe.mjs:9`–`:15`, `:44` ff., `:311`–`:323`; `frontend/scripts/fixtures/anime-detail-fixture-server.mjs:43`–`:59`, `:155`–`:199`; `frontend/scripts/anime-detail-phase159-probe.mjs:349`.

Die finale `phase159/159-05/resources.json` enthält jetzt tatsächlich ausgeführtes Cleanup2026-09-14T05:49:35.163186+00:00 und Recheck05:50:13.430355+00:00:
- Fünf eigene Pfade entfernt: Backend /app/tmp/phase15905, /app/tmp/phase159-gates, /app/tmp/phase159-baseline; Frontend /tmp/team4s-phase159-production und /tmp/team4s-phase159-evidence. Fixturemedien lagen ausschließlich innerhalb dieser eigenen Produktionskopie.
- Eigene Listener3158/3159/3160 jeweils open:false; finale Probe/Next-PIDs59109/59128 sind im Inventar gebunden, Browser/Proxy/Fixture im finally geschlossen.
- Eigener tmpfs-Postgres `4d3553f4677f3b9db568fa81b196f082df757b6d96b4910a997ba6f553c4d17a` und Gate-Postgres `3deaf09a740a6836dd430ad9017cf67c1de2e501b717ec24d401633a18212de1` entfernt; keine Hostports oder persistenten Fixturevolumes.
- `159-INDEPENDENT-VERIFICATION.md` dokumentiert zusätzlich unabhängig geprüfte Pfad-/ID-Abwesenheit; der Securityauditor hat diese Belege gelesen, nicht selbst Prozesse beendet oder Cleanup ausgeführt.

**Hashbindung des final geprüften Harness:**

| Datei | SHA256 |
|---|---|
| frontend/scripts/anime-detail-phase159-probe.mjs | 3d3914651ccc93acf8ae53e154ea84280aa8a4678e15476f84484f8edca3db3d |
| frontend/scripts/anime-detail-phase158-probe.mjs | b0e1e83af5f700847bac19f923966b56bc6760b063b4eac081d774f7a654547f |
| frontend/scripts/fixtures/anime-detail-fixture-server.mjs | c6e6040185af1f0093c423d3d131aa4c93e82e7651bf8752673a7147069edd66 |
| scripts/verify-anime-detail-phase.sh | 8a823a736440711f5e44bd6545f9c247c54cb87c15d8630e679dbf8467289f42 |

Alle vier Quellhashes aus tatsächlichen Dateibytes stimmen mit final-run.json überein. Der zuvor ausstehende Ressourcen-/Snapshotvorbehalt ist damit aufgelöst.

**T09-Produktionsgate ergänzend:** Echter selektiver Next-Produktionsbuild enthält /api/v1, /media und /covers/display. Finale91Checks umfassen Staticcover/APIfile/Animation und gebundene Medienquellen;96 Medienbeobachtungen stimmen laut unabhängiger Verifikation zwischen CDP und Proxy überein. Die zuvor offen dokumentierte produktive Servingbestätigung ist für diesen isolierten finalen Snapshot erbracht. Das hebt weder den belegten globalen Adminexport-Baselinefehler auf noch behauptet es globale Legacy-Stream-Sicherheit.

**Approval:** verified2026-09-14 für das vollständige geplante Phase159-Threatregister. F01 ist durch157f318f geschlossen; T11/T12 sind durch die finale Isolation/Cleanupbeweiskette geschlossen. Keine akzeptierten neuen Risiken, kein Commit durch diesen Auditor. Technischer GSD-Gesamtabgleich und Human-UAT156/157/158/159 bleiben beim Orchestrator beziehungsweise Nutzer.

## Historie und detaillierte Einzelbelege

> Historischer Teilstand: unabhängige Prüfung der fertigen Plans01–03. Zehn Maßnahmen geschlossen nach F01-Recheck; zwei Maßnahmen aus Plan05 noch nicht abgenommen. Plan04 ist im Nachtrag geprüft. Kein gesamter Security-PASS.

Baseline `c3bfcb23781addca1ccd3931592535416f706787`; geprüfte Produktstände01=`53f49e76`,02=`a9d9bd12`,03=`7d630640`. Gelesen: Plans01–03, 159-01-CONSUMERS, Summaries01–03, zugehörige Implementierung, Tests und gespeicherte verification.json/Ergebnisbelege. Die Register09–10 sind inzwischen im Plan04-Nachtrag geprüft;11–12 bleiben bis zur Plan05-Fertigmeldung ungeprüft. ASVS1 ist der Template-Prüfrahmen, keine Zertifizierung.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|---|---|---|
| Browser/Query → API/DB | Nicht vertrauenswürdige Cursor, Limits und IDs | Öffentliche Inventarselektion |
| Grant/Entitlement → Streamsource | Kanonische Releaseversion und explizite Variante müssen zusammengehören | Signierter Claim, User-/Versionsscope, Streamsource |
| Storage → UI | Persistierte Auswahl ist keine Domainautorität | Nur aktuelle positive Gruppen-ID |
| Asynchrone Antwort → Route | Alte Antworten dürfen keine neue Route verändern | Cursorinventar, Gridnachbar, Fehler und Navigation |
| Medien/Cache → Browser | Noch laufender Plan04 | Größen-/Sourcegrenzen und Cachelebenszyklus, pending |
| Prüfstand → Runtime | Abschließender Plan05 steht aus | Isolierte DB-/Browserfixtures und eigener Build, pending |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|---|---|---|---|---|---|
| T-159-01 | T/I | Cursor → Repository | mitigate | Striktes Format/Version/Anime-Scope und parametrisierter Seek; Decoder und HTTP-Parsegrenze geprüft, F01-Recheck157f318f | closed |
| T-159-02 | D | Publicinventar | mitigate | Max100 atomare Zeilen, limit+1, aggregierte Gruppen, keine Entityqueryschleife; E02 | closed |
| T-159-03 | T | Varianten-/Segmentdaten | mitigate | Explizite IDs, Assignmentautorität, erhaltene Consumerverträge; E03 | closed |
| T-159-04 | E/I | Variantenselector → Streamsource | mitigate | Beide IDs gebunden, canonical Grant-/Entitlementscope; E04 | closed — expliziter Selectorpfad |
| T-159-05 | S/T | Relay → Grant | mitigate | Zentrale Auth-/Grantprüfung, strikter Selector und Recoverytransport; E05 | closed — expliziter Selectorpfad |
| T-159-06 | T/D | Storage → UI | mitigate | Ein Owner, aktuelle sichere IDs, guarded Storage, kein Polling; E06 | closed |
| T-159-07 | I/T | Asyncdaten → aktuelle Route | mitigate | Routeidentität, Abort-/Requestprüfung, scoped Cursor, alte Antworten verwerfen; E07 | closed |
| T-159-08 | T | Public Play/Counts | mitigate | Kanonisches IDpaar und serverseitige Gesamtcounts; E08 | closed |
| T-159-09 | I/D | MedienURL → Optimizer/Provider | mitigate | Allowlist, echte Größe, kein Originalfallback | closed — E09/E10 im Nachtrag |
| T-159-10 | D/T | SPA-Cache | mitigate | TTL60s,20 inaktive LRUeinträge, Consumerrefs, Abort/Retry | closed — E09/E10 im Nachtrag |
| T-159-11 | T | Testharness → Runtime | mitigate | Isolierte Fixtures/DSN, kein Livewrite/Startup-Migrationsrestart | closed — final E11/E12 |
| T-159-12 | D | Build/Browserprobe | mitigate | Eigener Container/tmp-Build und Probeport, keine Dev.next-/Envänderung | closed — final E11/E12 |

Pending bedeutet noch nicht geprüft, nicht zusätzliche gefundene Implementierungsfehler. Aktuell zwei pending Registereinträge bleiben im Frontmatter mitgezählt; der konkrete F01-BLOCKER ist durch den abschließenden Recheck geschlossen.

## Ursprünglicher Befund — durch Recheck unten geschlossen

### F01 / T-159-01 — Malformed URL-Werte verschwinden vor Cursorvalidierung

**Beleg und Trigger:** `backend/internal/handlers/episode_version_reads.go:24` ruft `c.Request.URL.Query()` auf. Go verwirft dabei fehlerhaft URL-codierte Parameterwerte. Der Handler konstruiert anschließend PublicEpisodeOptions aus `query.Get("cursor")` und interpretiert ein nicht mehr vorhandenes Limit als Default. Damit erreicht der ursprüngliche fehlerhafte Wert die strikte Repositoryvalidierung nicht.

Zwei gezielte anonyme öffentliche GETs am laufenden Linux-Backend, ohne Cookies/Token/Grant und ohne Medienzugriff, bestätigten am2026-09-14:
- `GET /api/v1/anime/1/episodes?projection=public&cursor=%ZZ` → **HTTP200**, geplant400.
- `GET /api/v1/anime/1/episodes?projection=public&limit=%ZZ` → **HTTP200**, geplant400.

Diese GETs waren reine öffentliche Reads; keine authentifizierten GETs mit JIT-Schreibwirkung, keine DB-/Mediawrites und kein weiterführender Fuzzloop. Der Befund ist hohe Sicherheit: Codeursache und tatsächliche HTTPantwort stimmen überein.

**Wirkung:** Ungültiger Cursor startet still die erste Seite, ungültiges Limit verwendet24. Strikte Fehler-/Fortsetzungssemantik ist verletzt. Keine SQL-Injection, fremde Animeausgabe, Autorisierungsumgehung oder Überschreitung des Maximums wurde beobachtet oder behauptet. `backend/internal/repository/episode_version_public_query.go:34`–`:65` validiert tatsächlich vorhandene Cursor streng; die Lücke liegt davor.

**Fehlender Test:** `backend/internal/handlers/episode_version_public_test.go:13` prüft viele ungültige/doppelte/konfligierende Optionen und Cursorinhalt, aber nicht den URL-Decodierungsverlust des relevanten Parameters.

**Enger Fixvorschlag, nicht ausgeführt:** Vorhandene Analogie `backend/internal/handlers/episode_version_grants.go:102` (`parseReleaseStreamSelection`) prüft relevante RawQuery-Paare mit QueryUnescape/ParseQuery, damit fehlerhafte Werte nicht in Legacyfallback verschwinden. Dieselbe Parsingregel für die relevanten Episodenoptionen anwenden bzw. eine passend abgegrenzte vorhandene Naht erweitern; keine zweite Auth-/Repositoryimplementierung. Regressionen: malformed relevante cursor/limit/projection-Parameter einschließlich codierter Parameternamen; valide plus malformed Duplikate; doppelte Parameter; includeVersions/includeFansubs-Konflikte; gültiger Publiccursor und unveränderter Voll-Default. Verhalten für einen **unrelated** malformed Parameter bewusst definieren und mit dem bisherigen Default vergleichen, statt unbeabsichtigt alle Queryparameterregeln zu verändern. HTTP400 vor Repositoryzugriff belegen. Root übernimmt die Produktkorrektur seriell nach Plan04; Auditor ändert keine Produktdatei.

## Geschlossene Maßnahmen und Beweisketten

**E02 — Budget/Visibility.** `backend/internal/repository/episode_version_public_query.go:34` begrenzt24/100; `:70`–`:110` berechnet Counts vor Seek/LIMIT, normalisiert Varianten oder neutrale Sentinels und aggregiert Gruppen erst nach der begrenzten Seite. `:120` ff. ruft zuerst ExistsVisible auf, anschließend genau eine parametrisierte Query mit limit+1; Go-Schleifen verarbeiten Ergebnisse und führen keine Entityqueries aus. `backend/internal/repository/anime.go:29` schützt den öffentlichen Anime weiterhin mit status <> disabled. Tests `episode_version_public_integration_test.go:198` und `:256` prüfen126 eindeutige atomare Zeilen, Limits1/24/100, leere/unknown/disabled Serien, keine Duplikate oder Lücken. Manifest159-01: erfolgreicher Pfad2 Statements, maximal101 Inventarzeilen plus1 Existenzzeile. Das ist eine gemessene Rückgabegrenze, kein Maximalwert interner DBscans oder beliebiger Textbytes. F01 ändert diese Budgetmitigation nicht.

**E03 — Identität/Assignmentvertrag.** `episode_version_public_query.go:142` ff. setzt id und variant_id aus derselben Variantenspalte und release_version_id getrennt. `backend/internal/repository/episode_version_repository_read_helpers.go:162` nutzt theme_segment_assignments mit tsa.release_version_id=rev.id statt Range-/Labelinferenz; Scanner `:279`/ `:280` übernimmt beide IDs auch im Vollvertrag. `episode_version_public_integration_test.go:164` / `:277` prüfen Kollisionen, Mixedinventar, gleiche Episodennummern, erhaltene Detail-/Create-/Patchfelder und divergente Range-/Assignments. Create/Patchtests schreiben ausschließlich in isolierten Testschemas. 159-01-CONSUMERS dokumentiert fünf direkte Vollverbraucher und ihre indirekten Edit-/Bulk-/Nachbarconsumer; der Default bleibt vollständig. Keine neue produktive Migration oder Datenüberführung.

**E04 — Expliziter Streamscope.** `backend/internal/repository/episode_version_repository.go:408` / `:417` verwendet beim Selector `rv.id=$2 AND rv.release_version_id=$1`, beide Werte gebunden. `backend/internal/handlers/episode_version_grants.go:28`–`:40` verwendet dieselbe canonical Version für Entitlement und Source; `:54` signiert die Version. `:80` ff. prüft Grant und claims.ReleaseID == versionID, danach erneut Entitlement. `episode_version_stream.go:37`–`:49` nutzt denselben Parser und gebundenen Resolver nach Autorisierung. Reale isolierte SQLfixture `episode_version_stream_identity_test.go:12` beweist Version10/Variante100 gegen fremdeVersion20/Variante10; fremdes Paar liefert ErrNotFound. Handlerfixture `backend/internal/handlers/episode_version_stream_identity_test.go:84` prüft echte signierte Grants, Aufzeichnung der canonical EntitlementIDs,401/403/404 und keinen Upstream bei Ablehnung; Transportbytes sind synthetisch. Die unveränderte fachliche Entitlementengine wird damit nicht umfassend neu zertifiziert.

**E05 — Strict selector/Authrefresh.** `episode_version_grants.go:102` prüft beide kompletten dezimalen IDs und einzelne relevante RawQuery-Werte, einschließlich codierter Namen/malformed Werten; ungültige Anfrage fällt nicht in den Legacyresolver. `frontend/src/app/api/releases/[id]/stream/route.ts:40`–`:53` validiert Selector und sicheren canonical Pfad vor Cookies/Netzwerk. `:79` und `:86` verwenden einen grantPath/streamPath; beide werden bei Upstream401 unverändert wieder an `resolveStreamRelayTarget` gegeben (`:119`). Authowner und Cookieübernahme bleiben die vorhandene server/streamRelayAuth-Naht, GETs no-store; Range/UA/Offset bleiben erhalten. Route-tests `:24`, `:48`, `:57`, `:68`, `:82` ff. prüfen initial/provided Grant, refresh-only, grant401 und upstream401 sowie fremde/ungültige Selector. Manifest159-02:33 Frontendtests und6 isolierte Backend-Top-Leveltests erfolgreich. Keine echten Refresh-/Grant-/Medienrequests im Securityaudit.

**E06 — SSR/Storage.** `frontend/src/components/fansubs/FansubVersionBrowser.tsx:45` akzeptiert nur positive sichere IDs der aktuellen Gruppen; `:136` startet aus deterministischem primärem/erstem Propsfallback. `:147` ff. liest erst nach Mount, schützt Zugriff/JSON/Schreiben und versieht Mount-/Storagecallbacks mit aktivem Kontext/Revision; nur explizite Auswahl persistiert. Own-key Events verändern denselben State, fremde Keys nicht; Entfernung/Clear fallen zurück, kein Writeback. `ActiveFansubStory.tsx:15` ist kontrolliertes Blatt ohne eigenen Storage-/Pollingstate. Tests `FansubVersionBrowser.test.tsx:95`, `:107`, `:128`, `:141`, `:149`, `:167` prüfen gekoppelte Darstellung, StrictMode-SSR/Hydration, blockierten Storage und ungültige/entfernte Werte.

**E07 — Stale/Cursor/Grid.** `FansubVersionBrowser.tsx:129` keyt nach Anime; `:193`–`:226` abortiert Cursorarbeit und prüft Controlleridentität vor Erfolg/catch/finally. `AnimeEdgeNavigation.tsx:39` keyt nach Anime und Gridquery, `:56` abortiert beim Unmount; `:58` teilt eine Promise über echte Interaktionen, kontrolliert Abort nach jedem await und erfindet bei fehlendem aktuellem Anime kein Ziel. `:101` verwendet das erste awaitete Ergebnis und dessen tatsächliche page mit den bestehenden Query-/Hrefbuildern. Keine Mountlistabfrage. api.ts leitet die zusätzlichen Abortsignals weiter (`:1549`, `:1623`, `:2167`) ohne neuen Authclient. Tests `FansubVersionBrowser.test.tsx:237` / `:251` sowie `AnimeEdgeNavigation.test.tsx:31`, `:38`, `:47`, `:72`, `:107`, `:123` prüfen Retry, Requestsharing, Pagegrenzen, Querywechsel, Unmount sowie späten Erfolg/Fehler. Backend-Animescope bei gültigen Cursoren geprüft; F01 bleibt separat offen.

**E08 — Publicplay und Counts.** `FansubVersionBrowser.tsx:344` erzeugt exakt /api/releases/{release_version_id}/stream?variant_id={variant_id}; kein id-Aliasraten. Merge `:116` nutzt episode_id und dedupliziert variant_id nur innerhalb derselben Episode; Badge `:301` nutzt backend version_count. Page `frontend/src/app/anime/[id]/page.tsx:84` lädt genau erste Publicpage24, `:97` verwendet neutrale Gesamtquelle. Tests `FansubVersionBrowser.test.tsx:191`, `:225`, `:276` prüfen125 Varianten, neutrale gleichnummerige Episoden, tatsächliches kollidierendes IDpaar und unabhängige Dedupescopes. Manifest159-03:78/78 Tests in7 Dateien, keine neue Typ-/Lintabweichung. Die neutrale Detailfallbackliste wird dadurch nicht global begrenzt.

## Accepted Risks Log

No accepted risks.

**Bewusst erhaltene offene Compatibilitygrenze:** Der No-selector-Resolver bleibt `rev.id=$1 OR rv.id=$1` (`episode_version_repository.go:411`). `episode_version_stream_identity_test.go:12` und `handlers/episode_version_stream_identity_test.go:152` beweisen ausdrücklich, dass dort bei Kollision die fremde Quelle nach alter ORDER-Reihenfolge geliefert werden kann. Diese bestehende Ambiguität ist **nicht gelöst**, nicht als globale Stream-Sicherheit abgenommen und nicht durch diesen Auditor neu akzeptiert. CLOSED bei T04/05 umfasst ausschließlich den geplanten expliziten Selectorpfad, den die neue Public-UI verwendet. Keine pauschale Freigabe anderer Default-/Legacyconsumer.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|---|---:|---:|---:|---|
| 2026-09-14 initial | 12 | 7 | 5 (1 Blocker,4 pending) | Unabhängiger Auditor /root/anime_backend_flow |
| 2026-09-14 Plan04 | 12 | 9 | 3 (1 Blocker,2 pending) | Unabhängiger Auditor /root/anime_backend_flow |
| 2026-09-14 final c1bd215c | 12 | 12 | 0 | Unabhängiger Auditor /root/anime_backend_flow |

Keine neue unregistrierte Fläche in den geprüften Plans01–03: Query/DTO, Selectorrelay und Storage-/Asyncänderungen sind T01–08 zugeordnet. F01 ist eine Lücke einer geplanten Mitigation, kein zusätzlich erfundener Threat. Keine Tests/Builds neu ausgeführt; zwei eng begrenzte öffentliche HTTPreads belegen F01, sonst Quellen und gespeicherte isolierte Testnachweise. Nur dieser Bericht geändert, kein Commit. Produktkorrektur und Medienarbeit sind Eigentum der jeweiligen Executors.

## Sign-Off

- [x] Alle zwölf Threats besitzen eine Disposition.
- [x] Risikoakzeptanz nicht stillschweigend erteilt.
- [x] threats_open:0 — final12/12 geschlossen, siehe Abschluss.
- [x] status:verified — finale Abschlussprüfung erfolgt.
- [ ] Human-UAT —156/157/158 bleiben unverändert OPEN.

**Historischer Approvalstand:** pending. Nach Signal für fertige04/05 und F01-Korrektur folgt ausschließlich die erforderliche Delta-/Restprüfung. Keine Freigabe des gesamten Phase159-Gates.

## Nachtrag Plan159-04 — unabhängige Securityprüfung

**Stand:** Produktcommit `7d9dedb14e603ad3395a50ca6981495ddb5a5800`, Summary/Evidence `9ddc9009`, Tracking `194649cb`; geprüft am2026-09-14. DELIVERY-Amendment, erweiterter Plan, Summary, finale Evidence-README, Implementierungen und relevante Assertions gelesen. **T-159-09 und T-159-10 geschlossen auf Implementierungs-/fokussierter Testebene.** Produktions-HTTP bleibt explizites159-05-Gate; keine solche Messung wird aus URLerzeugung oder Unitresultaten abgeleitet.

### E09 — Sourceautorität und begrenzte Bildauslieferung

`frontend/src/lib/animeBackdrops.ts:17` und `:33` akzeptieren nur dokumentierte lokale Namespaces bzw. die konfigurierte APIorigin, verbieten Protokoll-relative/credential-bearing URLs und normalisieren zulässige Quellen zu fertigen Display-URLs. Beliebige externe Bildhosts werden nicht zum neuen Proxyziel. Providerbilder behalten bestehende width/quality; unsupported optionale Bilder entfallen, Coverplaceholder wird ebenfalls begrenzt ausgeliefert. Kein Originalretry bei Fehler. Der Next-config-Diff gegen die Phasebaseline enthält keine LocalIP-/Allowlistlockerung.

Drei Sourceadapter verwenden **denselben** `frontend/src/lib/server/imageDisplay.ts:114`:
- `frontend/src/app/covers/[file]/display/route.ts:6` löst ausschließlich über `server/coverFiles.ts:3` validierte Basenames unter public/covers auf. Der Childadapter umgeht belegte Staticfile-Priorität; kein freier Dateiparameter.
- `frontend/src/app/media/[...path]/route.ts:78`–`:103` erhält Traversalprüfung und separatorbewusste Pfadbegrenzung auf MEDIA_BASE_PATH, wählt den Transformer nur für anime + expliziten display_width-Opt-in.
- `frontend/src/app/api/v1/[...path]/route.ts:15` begrenzt den Opt-in auf GET/HEAD und exakten media/files/{filename}-Pfad. `:22` entfernt display_width sowie Range/If-* vor dem Originalread. `server/apiProxy.ts:37` baut das Ziel aus fest konfigurierter interner Origin und encodierten Pfadsegmenten, `:81` verwendet redirect:manual. Keine Request-URL als frei wählbare Upstreamorigin; Authheader werden weiterhin nur durch die bestehende Proxynaht weitergeleitet.

`imageDisplayContract.ts:5` verlangt genau eine der Breiten512/760/1280/1920. `imageDisplay.ts:6`–`:9` fixiert16MiB Input,20MP Decode,4MiB Output und5s Requestdeadline. Lokaler Read prüft stat und laufenden Zuwachs mit Sentinelbyte (`:55`); upstream Read begrenzt auch ohne Content-Length, cancelled den Reader und räumt auf (`:76`). Magicbyteprüfung `:106` hält SVG/video vom Rasterdecoder fern. Sharp `:147` liest genau erstes Frame mit Pixelgrenze, erzeugt WebP75 ohne Enlargement, Breite ≤ angefragt und Höhe ≤ min(3*Breite,4096), eigener5s Native-Timeout; `:155` prüft echte Outputmaße/-bytes. Fehlerpfade liefern niemals das Original.

**Ressourcen-/Headerboundary:** Derselbe prozessweite Admissionstate `imageDisplay.ts:11`–`:42` erlaubt2 aktive Source-/Decodejobs plus8 abortable FIFO-Waiter. Waiterabbruch entfernt den Queueeintrag; absolute Deadline wird nach Admission nochmals geprüft (`:129`). Nativearbeit behält den Slot bis Settlement und kann ihn nicht durch frühen Abort freigeben. HTTPantwort `:158` baut Content-Type/Length neu, API-Display bleibt private,no-store, lokale Displays public,max-age60, nosniff; fremde ETag/Encoding/Rangeheader werden nicht als transformierte Wahrheit kopiert. HEAD liefert dieselben transformierten Header ohne Body (`:178`). Nicht200-Upstream wird abgebrochen und bleibt Fehler/Redirectstatus;206 wird502, Redirect wird nicht verfolgt. Originalpfade ohne Opt-in bleiben erhalten.

**Assertions und echte Testbytes:** `server/imageDisplay.test.ts:29`, `:41`, `:114`, `:142`, `:151` prüfen lokale/proxied tatsächliche WebPausgabe, GIF/APNG/WebP-firstframe, Alpha, Maße, HEAD und Header. `:162`–`:184` prüfen ungültige Breiten, SVG/kaputte Bilder, Input-/Pixel-/streamed-byte-Grenzen. `:198` zeigt4 kalte Quellen200 bei Peak2; `:213` zeigt10 maximal zugelassene Jobs,11.429, queued Abort ohne zusätzlichen Source-IO; `:227`/ `:259` prüfen Cancellation/Deadline und wieder freigegebene Capacity. `:240` testet301/304/401/404/500/206 ohne falsches200. Routenregressionen in api/v1/[...path]/route.test.ts, covers/[file]/display/route.test.ts und bestehenden Media-/Covertests bewahren Original-SVG/Rangeverhalten. Finale gespeicherte display-green.log: **115/115 in10 Dateien**, typecheck/lint Exit0; kein Testneulauf oder Livefuzz durch den Auditor. Kleine Bilder müssen nicht universell weniger Bytes ergeben; harte Limits und reale Maße sind das geprüfte Versprechen.

### E10 — Manifestcache-Lebenszyklus

`frontend/src/components/anime/AnimeMediaProvider.tsx:10`–`:11` setzt TTL60s und maximal20 **inaktive erfüllte** Einträge. `:30`–`:37` evictet nach unusedAt ausschließlich unreferenzierte erfüllte Entries; aktive/pending Einträge sind bewusst ausgenommen. Kein pauschales20-Gesamtlimit behauptet. `:59` verhindert konkurrierenden Fetch und frischen Reload; `:67`/ `:78` prüft Mapentryidentität bei Erfolg/Fehler, sodass alte Rejection keine Replacementinstanz löschen kann. Fehler migriert aktive Subscriber gemeinsam auf leeres Replacement; späterer Acquire/Focus kann retryen, ohne Requestpolling.

`:94`–`:112` nimmt die Consumerreferenz zurück und prüft im Microtask nochmals Identität/Refs, bevor letzter echter Release abortiert; StrictMode-Reacquire bleibt geteilt. `:115` ff. abonniert Focus/Visibility nur bis Cleanup, Revalidation nur sichtbar; `:134` liefert null als deterministischen SSRsnapshot und `:139` verwendet useSyncExternalStore. Vergleich `:39` bewahrt Objektidentität unveränderter Manifestdaten. GetAnimeBackdrops verwendet den zentralen Client mit AbortSignal; kein eigener Refresh-/Tokenowner.

Tests `AnimeMediaProvider.test.tsx:139`, `:158`, `:174`, `:194`, `:222`, `:243`, `:260`, `:273`, `:284`, `:300` belegen Refcounts/StrictMode, TTL/Focusbursts/hidden State, Retry bestehender Subscriber, alte Rejection, Animewechsel und echte LRUeviction bei geschützten aktiven/pending Providern. `:337` prüft kein Originalretry. Zwei gespeicherte zentrale missing-/expired-Access-mit-Refresh-Regressionsfälle sind PASS; die25 übrigen gefilterten Fälle werden nicht als neu ausgeführt gezählt.

### Neue, registrierte Vertrauensgrenze und Reststatus

Direkte native Bilddecodierung sowie processweiter begrenzter Admissionstate sind gegenüber dem ursprünglichen URL-only-Ansatz neue konkrete Ausführungsflächen. Sie sind im **autorisierten DELIVERY-Amendment** vor Implementierung beschrieben und in T-159-09 (I/D Source-/Ressourcenbegrenzung) erfasst; kein unregistered_flag. Shared Sharphelper/Widthcontract und kleiner Coveradapter erhalten Sourceownership. Sharp0.34.5 ist nun direkt deklariert, keine neue Version oder separate Medienregistry. Keine pauschale Freigabe fremder Bild-/Videoseams.

**Zwischenstand nach Plan04:9 closed,1 belegter BLOCKER (T01),2 pending (T11/12).** T01 bleibt unverändert offen bis festem Fixcommit/Recheck. Produktion durch tatsächlichen Nextserver mit Staticcover, APIfile und Animation sowie Browser-/Byte-/Cachematrix steht noch in159-05 aus. Dieses Teilgate schließt keine Human-UAT156/157/158, führt keinen Build aus und ändert ausschließlich SECURITY.md.


## F01-Recheck — T-159-01 geschlossen

**Prüfstand:** RED `8eaca4bf`, GREEN `157f318fa006694ed338dd916e50b0ed2fbc86bc`, unabhängiger Quellen-/Belegrecheck am2026-09-14. Dies ersetzt den ursprünglichen offenen F01-Status und die zeitlich davor liegenden Zwischenstände; Historie und ursprüngliche zwei200-Belege bleiben nachvollziehbar.

`backend/internal/handlers/episode_version_grants.go:129` extrahiert die vorhandene Selector-Paarschleife zu `parseStrictNamedQuery`. Relevante RawQuerynamen werden decodiert, ihre Paare über ParseQuery geprüft und Fehler zurückgegeben; unbekannte Parameter behalten ihre bestehende Semantik. `episode_version_reads.go:23` verwendet diese Prüfung für projection/limit/cursor **vor** Default-/Publicauswahl, `:31` zusätzlich für Publicflags. Bestehende Duplikat-/Wert-/Repositorycursorvalidierung bleibt erhalten. Der Streamselector ruft denselben Helper auf (`episode_version_grants.go:104`), ohne Grant-/Versionsownership oder Legacyfallback umzudefinieren.

Neue Assertions `backend/internal/handlers/episode_version_public_test.go:17`–`:31`: malformed cursor/limit/projection, codierte relevante Namen, valide+malformed Duplikate, Semikolonwert und Publicflags ergeben400 mit nil Repository, also vor DBzugriff. `backend/internal/repository/episode_version_public_integration_test.go:340` prüft Voll-/Defaultreads mit unrelated malformed Parametern sowie erste/zweite valide Publiccursorseite mit erhaltenem Querybudget. Bestehende `episode_version_stream_identity_test.go:129` / `:152` schützen malformed Selector, codierte Namen und unveränderten No-selectorpfad.

Gespeicherte Belege `docs/audits/2026-09-13-public-anime-detail/phase159/159-05/f01-red.log`, `f01-green-handler.log`, `f01-green-sql.log` dokumentieren RED und erfolgreiche gezielte Handler-/reale isolierte PG117-Public-/RawQuery-/Streamtests. Build/Vet laut Executor bestanden; keine eigene Wiederholung.

Root-Laufzeitbeleg `phase159/root-runtime-sync-15905-query.json` unabhängig gelesen:2026-09-14T00:02:52.162711+00:00, beide ursprünglichen Requests cursor=%ZZ und limit=%ZZ jetzt400; valider Publicread und Voll-counts-only jeweils200. Beide Produktdateihashes stimmen mit den Quellen im laufenden Container überein. Ein Tarstream und normaler Airchildwechsel6476→6813 bei unveränderter ContainerID; kein PID1-/Containerneustart, Startup-Migrationskommando oder DB-/Mediawrite. Der Auditor hat dafür keine zusätzlichen Liveanfragen ausgeführt.

**Ergebnis: T-159-01 CLOSED; T-159-04/05 bleiben durch Parserreuse unverändert geschlossen. Gesamt10/12 CLOSED,0 konkrete BLOCKER,2 pending (T11/12).** Keine neue unregistrierte Trust Boundary, keine Risikoakzeptanz, keine Produktänderung/Commit durch den Auditor. Der No-selector-OR-Konflikt bleibt ausdrücklich bestehend und ungelöst. Endgültiger Phase159-Sicherheitsstatus wartet auf159-05-Harnessbelege; Human-UAT156/157/158 bleibt offen.


## Vorbereitung finaler159-05-Harnessprüfung — noch kein Cleanup-PASS

Aktueller Quellenstand zum Teilrecheck: Root-Gates `d36b5b53`, letzter Produktfix `6ebfebf7`, Testkorrekturen `d22da611`/`a76d9a8e`; Harnessänderungen noch uncommitted. Keine erneute Komplettprüfung der zehn geschlossenen Maßnahmen.

**Produktdelta T09:** `frontend/src/app/covers/display/[file]/route.ts:6` verwendet unverändert resolveCoverFilePath und serveImageDisplay. Die Pfadverlegung zu /covers/display/{file} (`animeBackdrops.ts:20`, `:28`) vermeidet die bei echtem Staticfile beobachtete Pfadkollision. `26faac70` ergänzt einen tatsächlich decodierbaren298-Byte-PNGplaceholder; derselbe begrenzte Displayweg bleibt Pflicht. Keine neue Sourceorigin, freie Dateiauflösung oder Originalfallback. T09 bleibt geschlossen; die vorher im Bericht genannte Childpfadform beschreibt den früheren Prüfstand und ist durch diesen aktuellen Pfad ersetzt.

**T11/T12 Codevorprüfung:** `scripts/verify-anime-detail-phase.sh` beschränkt Phase auf158/159, kopiert Source ohne .env/.next/node_modules in /tmp/team4s-phase{phase}-production, Build mit explizitem -w und eigenem MEDIA_BASE_PATH. Wiederverwendung vergleicht .phase-source-sha mit produktrelevanten Quelldateihashes; nur Harnessscripts werden nachkopiert. Vollbuildfehler wird anhand belegter Baseline-Exportursache getrennt geführt; selektiver Build enthält die tatsächlichen neuen Servingrouten. Kein ignoreBuildErrors und kein Schreiben nach /app/.next.

Backendgates verwenden eigenen /app/tmp/phase159-gates-Scratch außerhalb Airwatch und explizite Phase106/117-TestDSNs zu einem neuen tmpfs-Postgres ohne Hostport. Vorhandene Containernamen werden nicht übernommen; EXITtrap stoppt genau den zurückgegebenen eigenen Container. Zusätzliche SQLbudgetprobes nutzen vorhandene isolierte Testfixturehelpers; ihr Quelltext schreibt keine Livekonfiguration und verwendet kein DATABASE_URL.

`frontend/scripts/anime-detail-phase158-probe.mjs` prüft CWD/Opt-in/APIorigin vor eigenem Fetchcachereset und startet Next ausschließlich127.0.0.1:3158. Session-/Mutationsfixtures bleiben in frischen Browsercontexts mit bestehender Routeinterception. `fixtures/anime-detail-fixture-server.mjs:43`–`:59` bleibt GET-only mit Hostbindung127.0.0.1:3159; `:155` verlangt vor Fixturefileerstellung exakt /tmp/team4s-phase159-production. Dateien entstehen in dessen public/covers und fixture-media, nicht in Livemedien.

Die neue Cache-/Transfermessung in `anime-detail-phase159-probe.mjs:235` verwendet bewusst keinen Playwright-Routemock, sondern einen eigenen Browser über den ausschließlich lesenden Loopbackproxy3160. `anime-detail-fixture-server.mjs:181`–`:199` akzeptiert nur GET zu exakt NEXT_ORIGIN oder FIXTURE_ORIGIN, lehnt Credentials und CONNECT ab, folgt selbst keinen Redirects und beendet Upstream bei Clientclose. Das ist eine neue **Prüfstandboundary**, vollständig T11/T12 zugeordnet, kein unregistrierter Produktproxy. Browser/proxy/context finally-Blöcke sowie der eigene Nextchild-Cleanup sind vorhanden.

**Noch notwendiger Abschlussbeleg:** resources.json vom2026-09-14T05:28:02.234508+00:00 enthält Ressourceninventar, geplante Verzeichnisse/Listener, ursprünglichen Probeabbruch und Gate-Postgres-EXITtrap, aber zum Zeitpunkt dieser Teilprüfung noch keinen vollständigen finalen Abwesenheits-/Cleanupbeleg. probe-resources.json identifiziert den späteren Probe-PID56869/Next56888. Daraus wird keine erledigte Bereinigung behauptet. Finale Quellenhashes, Ergebnisdatei, Abwesenheit eigener Listener/Childprozesse/Testcontainer und dokumentierte Beseitigung eigener Scratch-/Fixture-/Buildkopien bleiben zu prüfen. **T11/12 weiterhin pending; Bericht weiterhin PARTIAL.** Kein eigener Build, Livefuzz, DB-/Mediawrite oder Prozesseingriff.
