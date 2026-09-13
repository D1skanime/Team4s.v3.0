---
phase: 158
slug: public-anime-detail-reparatur
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-13
---

# Phase 158 — Security

> Begrenzte unabhängige Verifikation der zehn geplanten Mitigations; keine ASVS-Zertifizierung und kein technischer Gesamtabschluss oder Human-UAT-Sign-off.

Geprüft gegen Auditbaseline `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`, Produktstand `d0ae1f9b` und Reviewstand `fb243cc69891959e5cfedbb853a4c33b8cc8d845`. Plan 158-01 bis 04, Summaries 01–03, CONTEXT, VALIDATION, REVIEW, AGENTS, AI-HANDOFF und die betroffenen Implementierungen bilden die Prüfgrundlage. Das finale Harnessdelta aus Commit feeeb125fe249ab03cb33882814704b070ceacea ist unabhängig nachgeprüft; seine geprüften Hashes stehen unten. Fehlender Configwert security_enforcement wird entsprechend Auftrag als true behandelt; ASVS-Level1 ist der Template-Standard, kein nachgewiesenes vollständiges ASVS-Prüfprogramm.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser/Route → öffentliche API | Routeparameter und persistierte Slugs werden nicht aus sichtbaren Titeln erraten | Untrusted ID, öffentliches Anime-/Gruppenprofil |
| UI → zentrale Auth/API → Server | UI kennt Sessionpräsenz und tokenfreie Accountidentität; Server entscheidet Autorisierung | Private Tokens ausschließlich im bestehenden zentralen Client; geschützte Kommentare/Watchlist |
| Asynchrone Antwort → aktueller UI-Besitzer | Anime, Account und Generation müssen bei Verarbeitung noch übereinstimmen | Status, Mutationsantwort, Fehler und Callback |
| Prüfstand → Runtime/DB | Loopbackfixtures, transportabgefangene Mutationen und eigenes PostgreSQL-Testziel | Synthetische Sessions/Fixtures, keine echten Cookies oder Produktdaten |
| Build → laufender Devserver | Build in eigener Containerkopie, eigener .next-Ausgabe | Sourcekopie und bestehende verlinkte Dependencies |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-158-01 | I/E | Relationsvisibility | mitigate | Parametrisierte Sichtbarkeitsprüfung und unveränderte Zielvisibility; E01 | closed |
| T-158-02 | T | Pretty-Slugprojektion | mitigate | Gespeicherter Slug aus Basequery, keine Titelslugheuristik; E02 | closed |
| T-158-03 | I/E | UI → zentrale Auth/API | mitigate | Access ODER Refresh, private Tokenboundary, zentrale Refreshbehandlung und Serverautorisierung; E03 | closed |
| T-158-04 | T/I | Watchlist-/Kommentarzustand | mitigate | Besitzer-/Requestgeneration, synchroner Sessionguard, unknown sperrt Mutationen,401 bleibt Fehler; E04 | closed |
| T-158-05 | D | Sessionereignisse | mitigate | Stabile bekannte Accountidentität und bestehendes Singleflight; E05 | closed |
| T-158-06 | I/T | Route → Read/Metadata | mitigate | Vollständiger positiver sicherer Integer; notFound vor Suspense; technische Fehler propagieren; E06 | closed |
| T-158-07 | I | SSR/Viewerzustand | mitigate | Kein SSR-Watchlistread; geschützter no-store-Clientread; E07 | closed |
| T-158-08 | T | Projektnavigation | mitigate | Autoritative Slugs, vorhandener Encoder/Builder, numeric Compatibility; E08 | closed |
| T-158-09 | T | Harness → Runtime/DB | mitigate | GET-only SSR, abgefangene Browserwrites, isoliertes explizites DSN, kein Startup-/Migrationskommando; E09 | closed |
| T-158-10 | D | Build → Devserver | mitigate | /tmp-Sourcekopie mit eigener .next, keine Live-Env-/Volumenänderung; E10 | closed |

Alle zehn Dispositionen sind mitigate. Keine Bedrohung wurde durch stillschweigende Risikoakzeptanz geschlossen.

### Konkrete Verifikationsbelege

**E01 — Visibility/SQL.** `backend/internal/repository/anime.go:29` führt tatsächlich `SELECT EXISTS(SELECT 1 FROM anime WHERE id=$1 AND status <> 'disabled')` mit gebundenem IDargument aus. `backend/internal/handlers/anime.go:212` validiert zuerst und trennt ungültig400, fehlend/deaktiviert404, technischen Fehler500 sowie erfolgreichen Relationsread. `backend/internal/repository/anime_relations.go:46` bindet dieselbe ID und filtert auch deaktivierte Zielanime. Tests `backend/internal/repository/anime_public_read_integration_test.go:121` und `:186` prüfen aktive/leere/licensed/unknown/disabled/ungültige Fälle und beide Fehlerstufen mit echtem QueryTracer; Handleroverflow zusätzlich in `backend/internal/handlers/anime_relations_test.go`. Ausführungsbeleg: 158-01-SUMMARY und `docs/audits/2026-09-13-public-anime-detail/phase158/backend-anime-tests.log`; Erfolg2, missing/disabled1, ungültig0 Statements. Kein eigener Testneulauf dieses Auditors.

**E02 — Slugautorität.** `backend/internal/repository/anime_v2.go:145` projiziert `NULLIF(BTRIM(anime.slug), '')` aus dem gespeicherten Feld in denselben Detailread. Modell-/TS-/OpenAPI-Vertrag ist additiv; Legacy ohne Slug bleibt ohne erfundenen Wert. `backend/internal/repository/anime_public_read_integration_test.go:225` prüft abweichenden Titel/Slug, Trim, empty/whitespace/NULL und Legacy ohne Spalte sowie konstant7 Detailstatements. `frontend/src/types/__tests__/anime-detail-contract.test.ts` prüft Vertragsparität. Keine neue Datenmutation im Produktdiff.

**E03 — Authboundary.** `frontend/src/components/watchlist/WatchlistAddButton.tsx:27` und `frontend/src/components/comments/CommentForm.tsx:20` verwenden den bestehenden Hook und Access-ODER-Refresh. `frontend/src/lib/useAuthSession.ts:26` liefert authToken bewusst leer; `frontend/src/lib/api.ts:1144` exponiert nur Präsenz, Anzeigename und accountIdentity. Token/Bearer/Refresh verbleiben in api.ts:1330/:1418; Fehler beim Refresh löschen dort die Session und propagieren den Fehler. Kommentarhelper `api.ts:2951` und Watchlisthelper `:3042` verwenden authorizedFetch. Unveränderte Servergates: `backend/cmd/server/main.go:398`–`:420`, geschützt durch authMiddleware; Watchlisthandler verwendet middleware identity.UserID (`backend/internal/handlers/watchlist.go:94`, `:141`, `:178`) statt eine Browser-Account-ID als Berechtigung. Tests: `api.auth-refresh.test.ts:218` (parametrisiert, echte zentrale Watchlist-/Kommentarhelper konkurrierend mit fehlendem/abgelaufenem Access), `:281`, `:318`, `:609` (Refreshfehler löscht Session), `api.no-token-boundary.test.ts` und Hook-/Komponententests. Belegte gezielte Suite:194/194; keine Liveauthmutation im Audit.

**E04 — Alte Antworten/unknown.** `WatchlistAddButton.tsx:29` keyt den Aktionsbesitzer nach Anime/Account/Generation/Session; `:45` führt Requestgenerationen. `:57`–`:65` behandelt ausschließlich404 als absent;401/500/Netzfehler bleiben error. `:74` blockiert Toggle bei unbekanntem Status oder veralteter Session. Erfolg, catch und finally prüfen Generation und isCurrentSession. `CommentForm.tsx:22`, `:37`, `:73`–`:98` schützt Response/Callback/router.refresh einschließlich Unmount. `useAuthSession.ts:52` aktualisiert die Referenz synchron vor Reactcommit, `:73` vergleicht den gebundenen Besitzer. Tests: `WatchlistAddButton.test.tsx:50`, `:123`, `:154`; `CommentForm.test.tsx:85`, `:128`, `:142`. Die Assertions verwerfen Erfolg und Fehler nach Anime-/Account-/Logout-/unbekannten-Metadatenwechseln sowie same-turn Callbackrace. Kein Beweis einer serverseitigen Rücknahme bereits abgesendeter Mutationen wird daraus abgeleitet.

**E05 — Keine Refresh-/Statusschleife durch Rotation.** `useAuthSession.ts:48` erhöht die konservative Generation nur beim Authchanged-Event mit unbekannter Identität; bekannte Accountrotation/Focus/Visibility bleibt stabil. Komponentenowner und Callbackdependencies verwenden diese tokenfreie Identität. `api.ts:1328`–`:1372` teilt eine laufende Refreshpromise und räumt sie im finally auf. Tests `useAuthSession.test.tsx:44`, `WatchlistAddButton.test.tsx:112`, `api.auth-refresh.test.ts:483` und der echte konkurrierende Watchlist-/Kommentarhelferfall prüfen unveränderte Generation, einen Statusread und einen Refresh. Unlesbare Metadaten werden bewusst konservativ invalidiert; keine Accountstabilität wird dabei erfunden.

**E06 — Strikte Entität/HTTP.** `frontend/src/app/anime/[id]/animeDetailData.ts:9` prüft vollständige Dezimalzeichen, Number.isSafeInteger und >0 vor dem APIread. `:17` wandelt nur ApiError404 in notFound um; technische Fehler werden weitergeworfen. `page.tsx:41` und `:55` verwenden denselben cache-Lader; die Existenzprüfung liegt vor Suspense. Die alten automatischen Loading-Konventionsdateien sind entfernt/umbenannt. `animeDetailData.test.ts:37` / `:48` sowie `page.test.tsx:74` prüfen Grenzen, Fehler und Reihenfolge. Zusätzlich bereits vorhandene echte isolierte Produktionsresultate im fixture-run.log: ungültige/unbekannte IDs404/noindex, technische500 und Netzwerkfall500, erfolgreicher Page+Metadata-Read genau1 AnimeGET. React-cache-Unitmock allein wäre hierfür kein HTTP-/Memoisierungsbeweis.

**E07 — Öffentliche SSR-Daten.** `page.tsx:83`–`:90` lädt nur Fansubs, Episodes, Comments und Relations nach dem öffentlichen Anime. Kein Cookie-/Token-/Watchlisthelper im Pagescope; Watchlistcomponent erhält keinen SSRstatus. `page.test.tsx:115` assertiert weder Cookie- noch Watchlistaufruf. Produktionsfixture zählt0 SSRwatchlistGETs. Geschützter Browserread nutzt `api.ts:3042` no-store und die ownergebundene Komponente. Keine neue gemeinsame Viewerantwort.

**E08 — Routeautorität/Compatibility.** `frontend/src/components/fansubs/FansubVersionBrowser.tsx:132` verwendet vorhandenen animeSlug und activeGroup.slug; fehlen sie, bleibt numeric fallback. `frontend/src/lib/fansubProjectRoutes.ts:3` encodiert beide Segmente; keine Titelheuristik und kein Gruppenprofilread zur Linkbildung. `frontend/src/app/anime/[id]/group/[groupId]/page.tsx:17` löst weiter den Prettycanonical auf und `:32` lädt die numerische Compatibility. Tests in FansubVersionBrowser.test.tsx, fansubProjectRoutes.test.ts und beiden Route-page.test.tsx prüfen gespeicherte Slugs, Sonderzeichen und Fallbacks. ROOT-LIVE-NOTES.md belegt sichtbaren Prettyclick und numeric200 mit demselben Projekt/canonical; isolierte Fixture meldet diesen Fall ebenfalls PASS.

**E09 — Harnessisolation.** `frontend/scripts/fixtures/anime-detail-fixture-server.mjs:37` verlangt Opt-in und exakte API_INTERNAL_URL; Bind ausschließlich127.0.0.1:3159, Hostprüfung und req.method GET, sonst405. Kein Proxyfallback. `frontend/scripts/anime-detail-phase158-probe.mjs:9`–`:13` erzwingt /tmp-Arbeitskopie/Opt-in/Fixtureorigin. `:39` erzeugt neue Browsercontexts mit blockierten Serviceworkern; `:43` fängt alle Requests ab. Fremde Origins werden abgebrochen, APIwrites/Refreshantworten lokal fulfilled, restliche Nicht-GETs abgebrochen; keine echten Benutzercookies. `backend/internal/repository/anime_public_read_integration_test.go:46` verwendet ausschließlich `testsupport.OpenPhase106Postgres`; `backend/internal/testsupport/phase106_postgres.go:49`–`:77` verlangt explizites DSN, Whitelist-DBnamen und verifiziert current_database; danach zufälliges Schema, eingeschränkter search_path und scopespezifisches Cleanup. Kein DATABASE_URL-Fallback. Separater tmpfs-Postgreslauf/Entfernung ist in158-01-SUMMARY dokumentiert. Probe enthält ausgeführten POST→405-Negativtest. ROOT-LIVE-NOTES dokumentiert den gezielten alten Airchild-Wechsel ohne Container/PID1-Neustart, Startup-/Migrationskommando; das wird nicht fälschlich als unveränderte Prozesslandschaft beschrieben.

**E10 — Buildisolation.** `scripts/verify-anime-detail-phase.sh:10` kopiert Source ausschließlich nach /tmp/team4s-phase158-production im Frontendcontainer, schließt .env*, .next und node_modules aus und verlinkt bestehende Dependencies. Beide Buildbefehle haben explizites -w auf diese Kopie; keine /app/.next-Produktionserstellung. Envwerte werden nur pro exec gesetzt, keine Envdatei/Volumes verändert. Selektiver öffentlicher Build ist gesondert beschriftet und setzt keinen vollständigen Build-PASS voraus; er wird nur beim gegen Baseline belegten formatEditLoadError-Exportblocker versucht. Keine ignoreBuildErrors-Umgehung. Vorhandene Buildlogs belegen den getrennten Vollbuildblocker und öffentlichen selektiven Build; kein zusätzlicher Build durch den Auditor.

## Accepted Risks Log

No accepted risks.

Keine neuen Risiken automatisch akzeptiert. Die bestehenden allgemeinen CSS-/Lint-/Adminbuildfehler sind getrennte Baseline-/Gesamtgatebefunde, keine Umdeklaration eines der zehn Threats zu accept.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-13 | 10 | 10 | 0 | Unabhängiger Security-Auditor, /root/anime_backend_flow |

Prüfmethode: Implementierung und Assertions unabhängig gelesen, Callchains geprüft, vorhandene Ausführungsbelege abgeglichen. Keine eigene Wiederholung umfangreicher Tests ohne konkreten Verdacht; kein authentifizierter Live-GET, keine echten Cookies/Token, kein Datenbank-/Produkt-/Trackingwrite, kein Commit. Nur dieser Bericht geschrieben.

**Unregistered Flags:** Keine. Summaries01–03 ordnen die veränderten Flächen T-158-01…08 zu; Harnessisolation ist T-158-09/10. Die same-turn Guardergänzung gehört zu T-158-04. Aus den begrenzten Codebelegen ergab sich kein zusätzlicher unzugeordneter Angriffsweg.

### Finaler Harnessdelta-Review und Ausführungsbelege

Deltaabnahme für Commit `feeeb125fe249ab03cb33882814704b070ceacea`. Die drei Quelldateien wurden erneut gelesen und ihre SHA256 gegen den finalen Lauf abgeglichen. Die SSRfixture ist bytegleich zum ersten Auditsnapshot; Produktdateien sind nicht Gegenstand dieses Deltas.

| Datei | Finale SHA256 |
|---|---|
| frontend/scripts/anime-detail-phase158-probe.mjs | b3168fd9e39f331735db7903a23d967bfb1874e76a418dfd7f4cd1a008ed48df |
| frontend/scripts/fixtures/anime-detail-fixture-server.mjs | ba3c942b3d7e9d0ed62027f55bf73c8e0ab57f8ea30fa1e9aaea7c0643930915 |
| scripts/verify-anime-detail-phase.sh | 182268521aca52b1546e52d6d15d42872b008161da5d9983f93eab26a9e05523 |

- **T-158-03/05:** Probe `:55`–`:58` liefert synthetisches id_token und korrekte /api/v1/me-Antwort einschließlich session_id. Private Ablaufmetadaten bleiben ausschließlich synthetische Browserfixture. `:233`–`:241` wartet beim verweigerten Refresh ausdrücklich auf die Antwort401, dann Cookieentfernung und Login-UI; zusätzlich exakt1 Refresh und0 Writes. Ein früher SSR-Logouttext genügt nicht mehr als Beweis.
- **T-158-09:** Die origin-/methodgebundene Browserinterception bleibt erhalten (`:44`–`:80`), alle APIwrites/Refreshes werden lokal beantwortet oder abgebrochen. SSRserver unverändert GET-only. Der Wrapper `scripts/verify-anime-detail-phase.sh:50`–`:66` verweigert die Übernahme eines vorhandenen Testcontainers, startet einen eigenen PostgreSQLcontainer mit tmpfs ohne Hostport und übergibt ausschließlich das feste Phase106-Test-DSN. Cleanup stoppt genau die von docker run zurückgegebene ContainerID. Bestehende DB-/Schema-/search_path-Guards bleiben unverändert; kein Live-DATABASE_URL oder Startup-/Migrationskommando.
- **T-158-10:** Wrapper `:10` kann ausschließlich den festen eigenen /tmp/team4s-phase158-production-Pfad erneut erstellen, prüft vorher Nicht-Symlink und den eigenen Marker phase158. Sourcekopie schließt .next weiterhin aus; eigene Buildartefakte entstehen im /tmp-Arbeitsverzeichnis. Probe `:9`–`:13` prüft exaktes CWD, Opt-in und APIorigin **vor** dem relativen Entfernen von .next/cache/fetch-cache. Im geprüften Wrapperpfad ist dies /tmp/team4s-phase158-production/.next/cache/fetch-cache. Es gibt keinen Lösch-/Schreibbefehl gegen /app/.next; der einzige /app-Link betrifft die bestehenden node_modules.
- **Beweistreue:** Probe `:23` kennzeichnet durch optionalen Filter ausgelassene Checks NOT_RUN; `:309` setzt passed nur bei ausschließlich PASS. Mausposition außerhalb der Desktopnavigation und Fokusgeometrie ändern keine Origin-/Auth-/DBgrenze. Zusätzlicher Unsafe-Integer-HTTP404-Fall erweitert die vorhandene Routingassertion.

Finale maschinenlesbare Ergebnisse unabhängig gelesen: `docs/audits/2026-09-13-public-anime-detail/phase158/fixture-results.json`, Snapshot **2026-09-13T21:38:08.845Z**, SHA256 **51958ed5631ccca7f0444419ebf7661213513537328f2f38244c0991c9d1f6d0**. **33/33 PASS**, keine FAIL/NOT_RUN, `fixture-run.exit` ist0. Darunter Access, Refresh-only, expired Access, verweigerter Refresh und Sessionwechsel. Die früheren Zwischenstand-Timeouts werden dadurch für diesen finalen Harnesslauf ersetzt; sie wurden nie als PASS ausgegeben.

**Deltaabnahme: SECURED, weiterhin10/10 closed,0 open,0 neue unregistered flags.** Der ausstehende Harness-Snapshotvorbehalt ist für die oben gehashten Quellen und Ergebnisse aufgelöst. Keine Tests erneut ausgeführt; die Prüfung war auf Quellen-/Belegdelta beschränkt. Der Bericht erteilt weiterhin keinen Human-UAT-Sign-off und setzt kein globales technical_passed:156-GAP02 und157-06 Task4 bleiben separat offen; der technische Gesamtabschluss gehört in RESULTS/VERIFICATION.

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed für den oben geprüften Snapshot
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-13 — ausschließlich die zehn geplanten Sicherheitsmaßnahmen im geprüften Snapshot; finales Harnessdelta eingeschlossen; technischer Gesamtabschluss und offene Human-UAT bleiben separat.
