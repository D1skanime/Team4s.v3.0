---
phase: 159-public-anime-detail-konsolidierung
reviewed: 2026-09-14T05:55:13Z
depth: standard
review_scope: phase
reviewed_plans: [159-01, 159-02, 159-03, 159-04, 159-05]
pending_plans: []
open_findings: []
evidence_review_pending: false
code_fixed_runtime_pending: []
resolved_findings: [R15904-01, R15904-02, R15905-DOC01]
pending_runtime_confirmation: []
review_baseline: c3bfcb23781addca1ccd3931592535416f706787
review_head: c1bd215c5a72a2a895b39c14354c3b86998d2ba5
product_source_commit: 6ebfebf72019f337844b01fd7f7d832faaa71a74
final_test_commit: a76d9a8e434d2f70b5f87ea5b6e0588c9fb6f6c1
files_reviewed: 57
files_reviewed_list:
  - "backend/internal/handlers/episode_version_grants.go"
  - "backend/internal/handlers/episode_version_public_test.go"
  - "backend/internal/handlers/episode_version_reads.go"
  - "backend/internal/handlers/episode_version_stream.go"
  - "backend/internal/handlers/episode_version_stream_identity_test.go"
  - "backend/internal/models/episode_version.go"
  - "backend/internal/repository/episode_version_public_integration_test.go"
  - "backend/internal/repository/episode_version_public_query.go"
  - "backend/internal/repository/episode_version_repository.go"
  - "backend/internal/repository/episode_version_repository_read_helpers.go"
  - "backend/internal/repository/episode_version_repository_read_helpers_test.go"
  - "backend/internal/repository/episode_version_stream_identity_test.go"
  - "frontend/package-lock.json"
  - "frontend/package.json"
  - "frontend/public/covers/placeholder.png"
  - "frontend/scripts/anime-detail-phase158-probe.mjs"
  - "frontend/scripts/anime-detail-phase159-probe.mjs"
  - "frontend/scripts/fixtures/anime-detail-fixture-server.mjs"
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeNeighborNavigation.test.ts"
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts"
  - "frontend/src/app/anime/[id]/page.performance.test.ts"
  - "frontend/src/app/anime/[id]/page.test.tsx"
  - "frontend/src/app/anime/[id]/page.tsx"
  - "frontend/src/app/api/releases/[id]/stream/route.test.ts"
  - "frontend/src/app/api/releases/[id]/stream/route.ts"
  - "frontend/src/app/api/v1/[...path]/route.test.ts"
  - "frontend/src/app/api/v1/[...path]/route.ts"
  - "frontend/src/app/covers/[file]/route.ts"
  - "frontend/src/app/covers/display/[file]/route.test.ts"
  - "frontend/src/app/covers/display/[file]/route.ts"
  - "frontend/src/app/media/[...path]/route.ts"
  - "frontend/src/components/anime/AnimeBackdropRotator.tsx"
  - "frontend/src/components/anime/AnimeEdgeNavigation.test.tsx"
  - "frontend/src/components/anime/AnimeEdgeNavigation.tsx"
  - "frontend/src/components/anime/AnimeMediaProvider.test.tsx"
  - "frontend/src/components/anime/AnimeMediaProvider.tsx"
  - "frontend/src/components/fansubs/ActiveFansubStory.tsx"
  - "frontend/src/components/fansubs/FansubVersionBrowser.test.tsx"
  - "frontend/src/components/fansubs/FansubVersionBrowser.tsx"
  - "frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx"
  - "frontend/src/lib/animeBackdrops.test.ts"
  - "frontend/src/lib/animeBackdrops.ts"
  - "frontend/src/lib/animeGridContext.test.ts"
  - "frontend/src/lib/api.anime-list.test.ts"
  - "frontend/src/lib/api.anime-media.test.ts"
  - "frontend/src/lib/api.episode-versions.test.ts"
  - "frontend/src/lib/api.ts"
  - "frontend/src/lib/imageDisplayContract.ts"
  - "frontend/src/lib/server/apiProxy.ts"
  - "frontend/src/lib/server/coverFiles.ts"
  - "frontend/src/lib/server/imageDisplay.test.ts"
  - "frontend/src/lib/server/imageDisplay.ts"
  - "frontend/src/lib/server/streamRelayAuth.test.ts"
  - "frontend/src/types/__tests__/episode-version-contract.test.ts"
  - "frontend/src/types/episodeVersion.ts"
  - "scripts/verify-anime-detail-phase.sh"
  - "shared/contracts/openapi.yaml"
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 159 — abgeschlossener Code-Review in Standardtiefe

**CLEAN — abgeschlossener Phase-159-Review: BLOCKER 0 · WARNING 0 · INFO 0.** Alle hier belegten Findings sind korrigiert und nachgeprüft. Der vollständige isolierte Produktions-Browserlauf besteht mit 91/91 Prüfgruppen; Quellhashes und 96 cold/warm-Medienbeobachtungen sind unabhängig abgeglichen. 57 unterschiedliche geänderte Produkt-, Test- und Harnessdateiidentitäten wurden in Standardtiefe geprüft. Globale Baselinefehler, die bewusst erhaltene No-Selector-Streammehrdeutigkeit und Human-UAT bleiben separat offen. Kein pauschaler globaler PASS oder Human-UAT-Sign-off. Die folgenden Zwischenstände sind historische Belege; maßgeblich ist der finale Abschlussabschnitt.

## Snapshot 159-01 — unveränderlicher Prüfstand

- Kanonisches Repository: `/home/d1sk/team4s`, über `ssh team4s-linux`.
- Phasebaseline: `c3bfcb23781addca1ccd3931592535416f706787`.
- Produktstand: `53f49e76` einschließlich `819dac53`, `35a2da10`, `52eec789` und `53f49e76`.
- Auswahl: 15 Dateien aus `git diff --name-only c3bfcb23781addca1ccd3931592535416f706787..53f49e76 -- frontend/src backend shared/contracts`.
- Alle geprüften Produktquellen und Tests wurden mit `git show 53f49e76:<Pfad>` gelesen. Der währenddessen weiterentwickelte Working Tree, insbesondere Repository/OpenAPI aus 159-02, wurde nicht als Quellstand dieses Reviews verwendet.
- Kontext: Phase-159-CONTEXT, die vor Produktänderungen erstellte 159-01-CONSUMERS-Matrix, abgeschlossene 159-01-SUMMARY/Evidence, AGENTS/AI-HANDOFF und die geltenden GSD-Reviewregeln. Die fünf produktiven `getGroupedEpisodes`-Caller wurden im festen Snapshot erneut abgeglichen.
- Standardtiefe: neue Implementierungen vollständig, Änderungen bestehender Dateien mit ihrer benötigten Aufruf-, SQL-/Scanner- und Vertragsumgebung. Die unveränderten übrigen Bereiche der großen `api.ts` und `openapi.yaml` wurden nicht als Vollreview dieser gesamten Dateien behandelt.

## Geprüfte Eigenschaften

| Prüfpunkt | Quelle am Snapshot | Ergebnis |
|---|---|---|
| Opt-in und unveränderter Defaultaufruf | `episode_version_reads.go:23–60`, `api.ts:2136–2176` | Die öffentliche Projektion wird ausdrücklich ausgewählt. Der Aufruf ohne Optionsargument behält vollständigen Rückgabetyp und bisherigen URL. Kein automatisches Nachladen aller Seiten, kein neuer Transport- oder Refreshpfad. |
| Parametervalidierung | `episode_version_reads.go:27–50`, `episode_version_public_query.go:27–60` | Öffentliche Limits, doppelte Optionen, widersprüchliche Include-Werte sowie ungültiger/fremder Cursor werden vor dem Repositoryzugriff abgefangen. Default 24 und Maximum 100 verwenden die bestehende Cursorgrenze. |
| Cursoridentität und Fortsetzung | `episode_version_public_query.go:19–25, 52–59, 87–90, 152–166` | Version, Anime, positive Episodennummer, stabile Episode-ID und Varianten-ID bilden den Keyset-Cursor. Der Seekvergleich und die Sortierreihenfolge sind identisch. Die Fortsetzung zeigt auf die letzte tatsächlich ausgegebene atomare Zeile; die zusätzliche Zeile wird nur als Fortsetzungsnachweis verwendet. |
| Neutrale und gemischte Inventare | `episode_version_public_query.go:67–85, 157–166` | Der Left-Lateral-Join liefert genau einen neutralen Sentinel für eine Episode ohne Variante, auch wenn anderswo Varianten oder bereits eine Releaseversion ohne Variante existieren. Neutrale `versions` und leere Episodenlisten werden als Arrays serialisiert. |
| Gleichnummerige Episoden | `episode_version_public_query.go:68, 88–90, 159–165`; Go-/TS-/OpenAPI-PublicGroupedEpisode | Cursor und Backendgruppierung verwenden die tatsächliche Episode-ID. Die ID ist für nachfolgende Clientseiten verbindlich im Vertrag vorhanden; gleiche Nummern werden im Backend nicht zusammengeführt. Das spätere Clientmerge ist hier noch nicht abgenommen. |
| Vollständige Zähler und Default | `episode_version_public_query.go:71–72, 86–90` | Window-Count und kleinste Varianten-ID werden vor Cursorfilter und Limit über die vollständige Episode berechnet. Eine über Seiten verteilte Episode behält ihren Gesamtzähler und dieselbe Default-ID. Die neue öffentliche Defaultdefinition ist ausdrücklich dokumentiert. |
| Fanout und tatsächliche Grenze | `episode_version_public_query.go:74–83, 90, 96–101` | Eine atomare Zeile steht für eine Variante oder einen neutralen Sentinel. Der öffentliche Pfad führt keine Stream- oder Segmentjoins aus. Fansub-Gruppen werden erst für die begrenzten Seitenzeilen aggregiert und vervielfachen deren Anzahl nicht. |
| Sichtbarkeit und SQL-Seam | `episode_version_public_query.go:111–125` | Die bestehende Anime-Sichtbarkeitsprüfung wird wiederverwendet; unbekannte/deaktivierte Anime ergeben NotFound. Danach folgt ein einzelner öffentlicher Inventarread. Keine SQL-Abfrage pro Episode, Variante oder Gruppe im Go-Aufrufpfad. |
| Additive Identitäten | `episode_version_repository.go:70–75`; `episode_version_repository_read_helpers.go:103–109, 276–298` | Beide SELECTs liefern die zusätzlichen IDs in derselben Reihenfolge wie der Shared-Scanner. `id` bleibt Variantenalias, `variant_id` benennt ihn ausdrücklich und `release_version_id` liefert den kanonischen Elternschlüssel. Bestehende Mutation-/Playback-Identifier werden dadurch nicht umgedeutet. |
| Assignmentautorität | `episode_version_repository.go:114–121`; `episode_version_repository_read_helpers.go:159–167` | Segmentcount und Assetflag folgen `theme_segment_assignments.release_version_id = rev.id`, unabhängig von Range-/Versionslabel und unabhängig davon, ob Gruppen mitgeladen werden. Die Bedeutung von nichtleerem Release-Asset-`source_ref` bleibt erhalten. |
| Vollständiger Admin-/Detailvertrag | Bestehende List-/GetByID-/Create-/Update-Seams und Shared-Scanner | Provider, Item, Coverage, CRC, Produktions-/Releasedatum, Stream, Dauer und Zeitstempel bleiben projiziert. Counts-only normalisiert bewusst `versions:null` zu `[]`; dessen fehlende Default-ID wird nun passend dokumentiert. Keine pauschale DTO-Kürzung oder Änderung von Datenbesitz. |
| OpenAPI/Runtime/TypeScript | `models/episode_version.go`, `types/episodeVersion.ts`, `openapi.yaml`, Vertragstests | Plurales `fansub_groups`, explizite IDs, optionale Full-Gruppen und verpflichtendes Public-Array stimmen überein. Public enthält Anzeige-/Identitätsfelder und Pagination, keine undokumentierten Provider-/Stream-/Segmentfelder. Der bestehende zentrale Helper transportiert Cursor und AbortSignal. |
| Geänderte Admin-Testfixtures | `episodeNeighborNavigation.test.ts`, `episodeVersionEditorUtils.test.ts` | Die Änderungen ergänzen die nun expliziten Typfelder. Bestehende Assertions oder Produktlogik wurden dafür nicht entfernt oder umgeschrieben. |

## Test- und Beweiskritik

Keine Tests wurden im Review wiederholt und kein Datenbankzugriff ausgeführt. Die vorhandene erfolgreiche Ausführung wurde anhand der abgeschlossenen Evidence und der tatsächlichen Testassertionen beurteilt; der Reviewer behauptet keine eigene erneute Ausführung.

- Die reale isolierte PostgreSQL-Fixture enthält neutrale Episoden innerhalb eines gemischten Inventars, gleiche Episodennummern, mehrere Gruppen/Streams, eine Variante ohne ID-Gleichheit, eine isolierte Fremdkollision sowie 125 Varianten mit nachfolgender neutraler Episode.
- Die Paginationstests durchlaufen das gesamte Inventar bei Limits 1, 24 und 100. Sie prüfen Eindeutigkeit, sichtbare Fortsetzung, terminalen Nullcursor, vollständige Episodenzähler und die neutrale Schlusszeile. Fremde Anime-Cursor werden ohne Datenstatement abgewiesen.
- Der QueryTracer prüft beim öffentlichen Erfolgsweg zwei Statements und höchstens `limit+1` **zurückgegebene Inventarzeilen**. Dies ist kein physisches PostgreSQL-Scanbudget, keine garantierte konstante Laufzeit und keine allgemeine Byteobergrenze für beliebig große Texte oder Gruppenlisten.
- Die Assignment-Fixture unterscheidet nicht zugewiesene Segmente innerhalb einer Range von tatsächlich zugewiesenen Segmenten außerhalb der Range und mit abweichendem Versionslabel. Sie prüft den vollständigen Read mit/ohne Gruppen sowie Detail-, Create- und Patchrückgaben.
- Die beiden bestehenden Adminfixtures ergänzen additive Felder. Die neuen Frontendtests prüfen den bisherigen Default-URL, Opt-in-Parameter, genau einen Seitenrequest, Signalweitergabe, Fehlerform und zentralen Refresh bei fehlendem/abgelaufenem Access mit gültigem Refresh.
- Der OpenAPI-Texttest allein ist keine vollständige Schemainstanzvalidierung. Die geprüfte Feldparität stützt sich zusätzlich auf Go-/TS-Definitionen, die tatsächliche SQL-/Scannerprojektion, JSON-Assertions und das dokumentierte OpenAPI-Parse-Gate.

Dokumentierter Ausführungsstand von 159-01: acht Backend-Top-Level-Tests mit Unterfällen bestanden; 63 Frontendtests in fünf Dateien bestanden; Typecheck und scoped Lint ohne Fehler; Go-vet/Build und OpenAPI-Parse bestanden. Die gemessenen 126 atomaren Fixturezeilen benötigen bei Limit 1/24/100 jeweils 126/6/2 Seiten. Die Evidence hält die gemessenen Bytes getrennt von einer universellen Payloadgarantie fest.

## Snapshotgrenzen und offene Gesamtabnahme

- Im geprüften Commit ruft die Anime-Seite weiterhin die vollständige Defaultprojektion ab. Die Umstellung auf Public, sichtbares Nachladen und Clientmerge über `episode_id` gehören zu 159-03. Deshalb wird F-08/F-14 beziehungsweise P159-06/P159-07 hier nicht als vollständig abgeschlossen erklärt.
- Der unveränderte Default-OR-Resolver kann bei kollidierenden Varianten-/Versions-IDs weiterhin mehrdeutig sein. Die Consumer-Matrix dokumentiert diese Altgrenze ausdrücklich. Der Schnitt 159-01 behauptet weder ihre Reparatur noch eine Prüfung der erst später gebauten expliziten Stream-/Grant-/Relay-Kette aus 159-02. Deren gesonderter Review folgt unten.
- Der vorhandene vollständige Adminpfad behält sein bisheriges Gruppierungs-/Streamfanoutverhalten. Die neue öffentliche Query vermeidet diesen Fanout; der Review leitet daraus keine nachträgliche Sanierung sämtlicher Default-Reads ab.
- Die bestehende neutrale Episodenliste im AnimeDetail-DTO ist nicht Teil des neuen Cursorbudgets. Ein begrenzter Public-Gruppenread begrenzt daher noch nicht automatisch jeden Bestandteil der gesamten Detailseite.
- Gruppenstate, Grid, Cover, Manifestcache, vollständige Browserabnahme und finale Build-/Lint-/Testsuite bleiben für die folgenden Plans zu prüfen. Bekannte globale CSS-Guard-/Lintfehler und der bereits vorhandene Admin-Page-Export-Buildblocker sind keine neuen Findings dieses Schnitts.
- Human-UAT 156 GAP-02, 157-06 Task 4 und die getrennte menschliche Sichtabnahme aus 158 bleiben offen. Kein UAT-Sign-off oder Phase-159-Abschluss durch diesen Bericht.

## Findings und nächste Reviewgrenze

**Snapshot 159-01: BLOCKER 0 · WARNING 0 · INFO 0.** Keine belegte neue Regression und keine Korrektur aus diesem Teilreview erforderlich.

Zum Abschluss des ersten Schnitts waren 159-02 bis 159-04 noch zu prüfen. Die nachfolgende Ergänzung erledigt ausschließlich 159-02; 159-03/04 und die vollständige Phasenverifikation bleiben offen.

Nur dieser Bericht wurde geschrieben. Keine Produkt-/Trackingänderung, kein Commit oder Staging, kein Containerneustart, keine Live-/Testdatenänderung und kein Datenbankzugriff durch den Reviewer.


## Snapshot 159-02 — ergänzter Prüfstand

**Ergebnis des zweiten Schnitts: keine belegte neue Regression.** Geprüft wurde ausschließlich der feste Stand `a9d9bd12`, als Delta zu `53f49e76`. Die Produktcommits sind `597da6a8`, `3ec74789` und `7d5f3877`, die zugehörigen Tests `b44e7527`, `4c1b735a` und `a9d9bd12`. Sämtliche Produktquellen/Testinhalte stammen aus `git show a9d9bd12:<Pfad>`; parallel begonnene 159-03-Arbeiten wurden nicht verwendet.

### Files Examined — 159-02

Neun Dateien dieses Deltas, davon zwei bereits im ersten Schnitt geprüft. Zusammen ergeben beide Schnitte 22 verschiedene Dateien:

- `backend/internal/handlers/episode_version_grants.go`
- `backend/internal/handlers/episode_version_stream.go`
- `backend/internal/handlers/episode_version_stream_identity_test.go`
- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/episode_version_stream_identity_test.go`
- `frontend/src/app/api/releases/[id]/stream/route.test.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/server/streamRelayAuth.test.ts`
- `shared/contracts/openapi.yaml`

Zusätzliche unveränderte Aufrufgrenzen: `frontend/src/lib/server/streamRelayAuth.ts` und `backend/internal/handlers/release_playback_access.go`. Diese wurden für die Selektorweitergabe und die kanonische Berechtigungsprüfung gelesen, aber nicht als zusätzliche geänderte Produktdateien gezählt. Die abgeschlossene 159-02-SUMMARY, `159-02/verification.json` und der vom Orchestrator gespeicherte `root-runtime-sync-15902.json` wurden zur Beweisabgrenzung gelesen.

### Prüfung der expliziten Identitätskette

| Grenze | Quelle am Snapshot a9d9bd12 | Ergebnis |
|---|---|---|
| Exakter Quellenselektor | `episode_version_repository.go:408–443` | Ein expliziter Selektor verwendet ausschließlich `rv.id = $2 AND rv.release_version_id = $1`. Die SQL-Parameter sind gebunden. Fremde Variante oder fehlender Stream führt zu NotFound und fällt nicht auf den alten OR-Pfad zurück. Null/negative/mehrere Selektoren werden im Repository zurückgewiesen. |
| Gemeinsam striktes Parsing | `episode_version_grants.go:98–134`, `episode_version_stream.go:38–42` | Grant und Stream verwenden denselben Parser. Bei explizitem Selektor müssen beide IDs vollständig positive Dezimalwerte sein. Duplikate und Überläufe werden abgewiesen. Die RawQuery-Prüfung erkennt auch korrekt kodierte Selektornamen und verhindert, dass ein ungültiger Selektorwert durch Go-`URL.Query()` verschwindet und dadurch den Legacyresolver aktiviert. |
| Grant und Entitlement | `episode_version_grants.go:28–55, 84–93` | Berechtigungsprüfung und signierter Grant verwenden die kanonische Pfad-Releaseversion. Vor Grantvergabe wird die ausgewählte Quelle auf genau dieses ID-Paar geprüft. Die Verwendung desselben Grants für eine andere Variante derselben Version bleibt erlaubt; eine fremde Version besteht weder Claimvergleich noch explizite Quellenbindung. |
| Streamzugriff | `episode_version_stream.go:38–59` | Grant-/Berechtigungsprüfung erfolgt vor dem gebundenen Quellenread. Abgewiesene oder fehlende Auswahl erzeugt keinen Upstreamzugriff. Der ausgewählte Providerpfad behält den vorhandenen Offset-/Range-/Headertransport. |
| Browserrelay-Eingang | `app/api/releases/[id]/stream/route.ts:38–52` | Der explizite Selektor und der dazugehörige kanonische Pfad werden vor Cookies oder Netzwerk geprüft. Die Relaygrenze verlangt zusätzlich sichere JavaScript-Integer. Der Selektor wird nicht aus einem Titel oder einer anderen ID abgeleitet. |
| Grant-/Streamweitergabe | `route.ts:72–87, 108–118` | Einmal gebildete Stream- und Grantpfade enthalten denselben Selektor; beide werden auch an die Upstream-401-Recovery übergeben. Ein mitgelieferter Grant wird im bestehenden zentralen Helper an die bereits parametrisierte Stream-URL angehängt, ohne den Selektor oder Offset zu entfernen. |
| Zentraler Refresh | Unveränderter `streamRelayAuth.ts:295–359`, neue Route-/Helpertests | Die neue Route implementiert keinen zweiten Refresh. Refresh-only, Grant-401 und Upstream-401 verwenden den bestehenden Helper. Dessen wiederholte Grantausstellung erhält denselben parametrisierten `grantPath`; Cookies werden weiterhin über den vorhandenen Mechanismus gesetzt. |
| Vertragsparität | OpenAPI bei `/api/v1/releases/{id}/grant` und `/stream` | Optionaler `variant_id`, vollständige IDs, kanonisches Entitlement/Claim, 400 bei ungültiger Auswahl und 404 nach Autorisierung bei fremder/fehlender Quelle sind dokumentiert. Die Grenze zwischen Go-int64 und sicheren JavaScript-Integern wird ausdrücklich genannt. |
| Defaultkompatibilität | Repositorypredicate ohne Selektor und Legacy-Regression | Kein Selektor behält den bisherigen OR-Ausdruck, Parser und Streamsortierung. Dies ist eine ausdrücklich erhaltene Altgrenze und keine generell sichere Auflösung kollidierender IDs. |

### Aussagekraft der Kollisions- und Relaytests

- Die authentische isolierte SQL-Fixture ordnet Version 10 die Variante 100 und Version 20 die Variante 10 zu; der fremde Stream hat die kleinere Stream-ID. Sie belegt, dass die explizite Auswahl 10/100 die eigene Quelle liefert und 10/10 abgewiesen wird. Gleiche IDs, andere gültige Varianten und fehlende Quellen werden separat geprüft.
- Der Handlertest erzeugt und verifiziert einen tatsächlich signierten Fixturegrant. Er prüft den kanonischen Release-Claim, den User-Claim, die aufgerufenen Entitlement-IDs sowie 401 bei falschem Claim, 403 bei verweigerter/entzogener Berechtigung und 404 ohne Upstream für fremde/fehlende Quelle. Die Berechtigungsentscheidung selbst ist ein kontrollierter Stub: Der Test beweist deren korrekte Anbindung, keine erneute Gesamtprüfung des unveränderten Regelwerks.
- Die Parserfälle prüfen ungültige Werte, doppelte Selektoren, rohe und kodierte Selektornamen mit ungültigem Escape sowie die bewusste Legacygrenze bei einem fremden fehlerhaften Queryparameter. Die Eingabe kann nicht durch bloßes Verwerfen eines **benannten** fehlerhaften Selektorwerts in den OR-Pfad wechseln.
- Die tatsächliche Next-Route wird zusammen mit dem zentralen Relayhelper geprüft; Cookies und Fetch sind kontrolliert. Die Tests enthalten initiale Grantausstellung, vorhandenen Grant, Refresh-only, Grant-401 und Upstream-401 sowie Offset, Range, Antwortheader und aktualisierte Cookies. Keine selektorlose Ersatz-URL wird für diese Wiederholungen gebildet.
- Die 403/404-Passthrough-Assertions der Next-Route betreffen einen Request mit bereits vorhandenem Grant. Sie sind kein Nachweis, dass sämtliche Fehler einer initialen Grantausstellung unverändert bis zum Browser gelangen; die vorhandene generelle Grantfehler-/Fallbackbehandlung wurde in 159-02 nicht geändert und wird hier nicht als umfassend konsolidiert bezeichnet.

Dokumentierte ausgeführte Gates: sechs Backend-Top-Level-Tests plus Unterfälle erfolgreich; finale kodierte Parser-/Legacyfälle erfolgreich; 33 Frontendtests in zwei Dateien erfolgreich; voller Typecheck und scoped Lint ohne Fehler; Go-vet/Build, OpenAPI-Parse und Produkt-Diffcheck erfolgreich. Der Reviewer hat diese Tests nicht erneut ausgeführt.

Der Orchestrator belegt drei übereinstimmende Runtime-Quellenhashes und ein reguläres Air-Reload ohne Container-/Entrypointneustart. Der GET mit `variant%5Fid=%ZZ` antwortete tatsächlich mit HTTP 400 vor Grant-/Quellenzugriff. Dieser Read-only-Smoke belegt Parser-/Runtimeparität, keine vollständige reale Medienwiedergabe. Im Review wurden weder echte Grants erzeugt noch Medien oder Datenbanken abgefragt.

### Verbleibende Grenze nach 159-02

**Snapshot 159-02: BLOCKER 0 · WARNING 0 · INFO 0.** Kumulativ bestehen keine belegten neuen Findings in den geprüften 159-01/02-Schnitten.

Die öffentliche UI muss in 159-03 das kanonische `release_version_id` und passende `variant_id` tatsächlich gemeinsam verwenden. Ohne Selektor bleibt die bekannte OR-ID-Mehrdeutigkeit bestehen; die Tests zeigen diese Altgrenze ausdrücklich. Aus dem funktionierenden expliziten Pfad wird keine allgemeine Sicherheitsfreigabe sämtlicher Legacy-, Grant- oder Medienpfade abgeleitet.

Pending bleiben 159-03, 159-04 und 159-05. Die vollständige Phase ist nicht freigegeben; offene Human-UAT-Punkte und bekannte globale Baselinefehler bleiben unverändert. Auch diese Reviewergänzung änderte ausschließlich `159-REVIEW.md`, ohne Commit, Tracking-/Produktänderung, Testwiederholung oder Datenbankzugriff.


## Snapshot 159-03 — gemeinsamer Zustand, Public-Paging und Gridnavigation

**Ergebnis des dritten Schnitts: keine belegte neue Regression.** Fester Prüfstand `7d630640`, Delta zu `a9d9bd12`. Geprüfte Produktcommits: `02056ac4` (Gruppenzustand), `eaa37933` (Public-Paging), `78f44412` (Grid). Die Regressionen stammen aus `4a5a3dab`, `1a8743f7`, `24e8836a` und `7d630640`. Sämtliche Produktquellen und Tests wurden mit `git show 7d630640:<Pfad>` gelesen; laufende Medienarbeit aus 159-04 floss nicht ein.

### Files Examined — 159-03

Elf Dateien in diesem Delta, davon `api.ts` bereits in einem früheren Schnitt geprüft. Kumulativ 32 verschiedene geänderte Dateien:

- `frontend/src/app/anime/[id]/page.test.tsx`
- `frontend/src/app/anime/[id]/page.tsx`
- `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx`
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx`
- `frontend/src/components/fansubs/ActiveFansubStory.tsx`
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`
- `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx`
- `frontend/src/lib/animeGridContext.test.ts`
- `frontend/src/lib/api.anime-list.test.ts`
- `frontend/src/lib/api.ts`

Die unveränderten Gridquery-/Linkbuilder in `animeGridContext.ts` wurden als Aufrufgrenze gelesen. Die bereits geprüften Public-Verträge und die Selektorkette wurden nur auf ihre tatsächliche Verwendung durch den neuen Client geprüft, nicht nochmals vollständig auditiert. SUMMARY, gespeicherte 159-03-Gate-Ergebnisse und der vorläufige Root-Livebeleg wurden ebenfalls gelesen.

### Verhaltensprüfung

| Grenze | Quelle am Snapshot 7d630640 | Ergebnis |
|---|---|---|
| Ein Gruppenzustand | `FansubVersionBrowser.tsx:127–183, 239–255`; `ActiveFansubStory.tsx:15–26` | Auswahl, Filter und Variantenliste gehören dem vorhandenen Browser. Story erhält dieselbe aktive ID als Prop und hat keinen eigenen Zustand, Storagezugriff, Effect oder Poll. Der bisherige 200-ms-Abgleich ist entfernt. |
| Deterministischer Erstzustand | `FansubVersionBrowser.tsx:133–158` | Primärgruppe beziehungsweise erste gültige Gruppe wird aus Props bestimmt. Storage wird erst nach Mount gelesen. Cancellable Effectkontext und Revision verhindern, dass StrictMode-Cleanup oder eine frühere explizite Auswahl durch den verspäteten Mountread überschrieben werden. |
| Storage und Multitab | `FansubVersionBrowser.tsx:36–52, 159–183` | Es werden nur positive sichere IDs aus den aktuellen Optionen akzeptiert. Accessor, Lesen, Parsen und Schreiben sind abgesichert. Nur explizite Auswahl persistiert; fremde Keys/Storageflächen werden ignoriert, gültige lokale Events übernommen und Clear/ungültige Werte auf Fallback aufgelöst. Externe Events werden nicht zurückgeschrieben. |
| Anime-/Gruppenkontext | `FansubVersionBrowser.tsx:129, 134–172` | Anime-ID bestimmt die Lebensdauer des inneren Besitzers einschließlich Auswahl, Expansion und Requests. Entfernte Gruppen fallen unmittelbar auf eine gültige Auswahl zurück; alte Selection-Effects werden deaktiviert. |
| Initiale Public-Projektion | `page.tsx:81–101, 248–257` | Die Seite fordert eine explizite öffentliche Seite mit Limit 24 an und reicht deren Episoden/Pagination gemeinsam an den Browser. Die Überschrift zählt die vollständige neutrale Anime-Episodenquelle, nicht die geladene Teilseite. Der vorhandene neutrale Fehlerfallback bleibt erreichbar. |
| Merge und Identitäten | `FansubVersionBrowser.tsx:116–124, 278–301, 315` | Episoden werden ausschließlich anhand `episode_id` zusammengeführt. `variant_id` dedupliziert nur innerhalb der jeweiligen Episode. Gleichnummerige Episoden, ihre Reactkeys und ihr Expansionszustand bleiben getrennt. Der vom Server gelieferte vollständige `version_count` wird nicht durch die aktuelle Arraylänge ersetzt. |
| Explizite Fortsetzung | `FansubVersionBrowser.tsx:185–225, 304–309, 363–367` | Fortsetzung erfolgt durch das vorhandene Button-/API-Pattern, nicht durch Gruppenwechsel oder automatische Schleifen. Ein laufender Cursorrequest wird dedupliziert. Fehler bleiben sichtbar und derselbe Cursor retrybar; eine noch fehlende Gruppenvariante wird bei weiterer Pagination nur als leerer geladener Ausschnitt bezeichnet. |
| Alte Antworten | `FansubVersionBrowser.tsx:190–225` | Animewechsel und neue initiale Daten brechen laufende Requests ab; Controllervergleich verhindert alte Erfolgs-/Fehler-/Finally-Updates. Eine neue initiale `episodes`-Referenz wird sofort statt des zuvor geladenen Inventars gerendert. Dies ist für den aktuellen Parent geprüft; die unten beschriebene hypothetische getrennte Paginationänderung ist keine behauptete Abnahme. |
| Exakte Playidentität | `FansubVersionBrowser.tsx:343–349` | Das href verwendet tatsächlich die kanonische `release_version_id` im Pfad und die zugehörige `variant_id` als Selektor. Der UI-Kollisionsfall 10/100 gegenüber 20/10 bleibt eindeutig und erreicht die in 159-02 geprüfte Relaygrenze. |
| Lazy Gridrequests | `AnimeEdgeNavigation.tsx:40–99, 128–141, 171–184` | Kein Mount-/Effectrequest. Hover, Fokus, Touch und Klick teilen eine laufende beziehungsweise erfolgreich abgeschlossene Promise pro Anime-/Gridkontext. Ein langsamer Hover sperrt den nachfolgenden Klick nicht vorzeitig. |
| Erster Klick und Zielseite | `AnimeEdgeNavigation.tsx:68–89, 103–119` | Die Navigation verwendet direkt das erste awaitete Ergebnis. Ein Ziel enthält Anime und tatsächliche Gridseite; die bestehenden Builder führen diese Seite zusammen mit den Filtern weiter. Kein Routerpush aus einem noch nicht aktualisierten React-Nachbarzustand. |
| Gridabbruch und Retry | `AnimeEdgeNavigation.tsx:41, 57, 69–94, 108–118`; `api.ts:1531–1556` | Query- oder Animewechsel erzeugt einen neuen Besitzer und bricht die alte Anfrage ab. Alte Antworten können keine neue Navigation auslösen. Fehlende IDs/äußere Grenzen erzeugen keinen geratenen Nachbarn; fehlgeschlagene Abfragen bleiben erneut auslösbar. AbortSignal wird additiv über den vorhandenen Listenhelper transportiert. |

### Nachweise und ein verworfener Verdacht

Die gespeicherte finale Suite wurde gelesen: **78/78 Tests in sieben Dateien bestanden**. Der gespeicherte Typecheck, scoped Lint und Diffcheck sind erfolgreich. Die Suite wurde durch den Reviewer nicht identisch wiederholt.

- Der Gruppentest führt tatsächliches `renderToString` plus `hydrateRoot` in StrictMode durch und prüft fehlende Recoverable-/Console-Hydrationfehler, danach die gespeicherte Zweitgruppe. Story, Filter und sichtbare Varianten werden gemeinsam geprüft. Blockierte Storagezugriffe, ungültige/entfernte IDs, Clear, fremde Keys und Animewechsel sind enthalten.
- Die Pagingfixture lädt 125 Varianten ausdrücklich weiter, überlappt Varianten zur Dedupeprüfung und enthält eine gleichnummerige neutrale Episode. Sie prüft komplette Zähler, getrennte Expansion, spätes Auftauchen der Zweitgruppe, Fehler/Retry, doppelte Pendingklicks und alte Erfolge/Fehler nach Animewechsel. Ein zusätzlicher Test verhindert eine globale Varianten-Dedupe über unterschiedliche Episoden hinweg.
- Die Gridfixture führt Navigation über drei Seiten vorwärts/rückwärts aus und prüft jeden Filter. Langsamer erster Klick, Hover/Fokus, überlappender Hover/Klick, Touch, äußerer Rand, fehlende aktuelle ID, Retry, Querywechsel, Unmount und verspätete alte Antworten sind verhaltensbasiert geprüft.
- Der Livebeleg des Orchestrators zeigt `/anime/1`, „Episoden (13)“, die aktive Gruppe und das tatsächliche href `/api/releases/27/stream?variant_id=27`. Kein Playback wurde gestartet. Dies bestätigt die aktuelle Verdrahtung, nicht die vollständige Browser-/Medienmatrix aus 159-05.

Ein möglicher Randfall wurde ausdrücklich gegen Erreichbarkeit geprüft: Der Browser bindet Inventar/Loading an die `episodes`-Referenz, während eine ersetzte `pagination`-Referenz ebenfalls einen Requestabbruch auslöst. Ein künstlicher Parent, der nur Pagination ersetzt, könnte diese Grenzen auseinanderziehen. Der einzige produktive Caller im festen Snapshot ist jedoch `page.tsx`; er übergibt beide Werte gemeinsam aus derselben frischen JSON-Antwort. Ein heute erreichbarer isolierter Paginationaustausch mit alter Episodenreferenz wurde nicht gefunden. Daher **kein Finding und keine ungefragte Produktänderung** aus diesem Verdacht.

Für diesen Verdacht wurde einmal ein eigener synthetischer Probeaufbau in einem temporären Frontendcontainerverzeichnis versucht. Er scheiterte vor Test-Collection am außerhalb des Vite-Roots nicht auflösbaren Setup-Pfad; **null Tests wurden ausgeführt**. Dieser Aufbau ist entfernt und wird weder als reproduzierter Produktfehler noch als zusätzlicher erfolgreicher Nachweis gezählt. Es gab keinen Datenbankzugriff und keine Änderung von Produktdateien.

### Stand nach dem dritten Schnitt

**Snapshot 159-03: BLOCKER 0 · WARNING 0 · INFO 0.** Die zuvor offenen Public-UI-/Selektorverbindungen wurden in diesem festen Schnitt geprüft. Keine allgemeine Garantie für zukünftige geänderte Parentverträge oder unveränderte Legacy-Playbackpfade.

Pending bleiben **159-04 und 159-05**. Medienbudget, Manifestcache, komplette Browser-/Request-/SQLmatrix und finale Produktions-/Globalgates sind nicht vorweggenommen. Human-UAT 156/157/158 bleibt offen. Geschrieben wurde ausschließlich die Reviewergänzung; kein Commit, Tracking-/Produktedit oder Datenbankzugriff durch den Reviewer.


## Snapshot 159-04 — Manifestcache und tatsächliches Medienbudget

**Historischer Status dieses ersten Snapshots: zwei offene BLOCKER, keine Medienabnahme; Korrekturstand siehe abschließende Nachprüfung.** Geprüfter fester Produktstand: `1f5dfa749a7a84c827321a033cec099bf293081b`, Delta zu `7d630640`. Produktquellen und Tests stammen aus Gitobjekten dieses Stands. Laufende Korrekturen am Working Tree sind hier nicht bereits als erledigt gewertet.

### R15904-01 — BLOCKER: vormals direkt ladbare API-Dateibilder scheitern neu an der privaten Optimizer-Origin

- **Ort:** `frontend/src/lib/animeBackdrops.ts:17–27, 64–66`; tatsächlich verdrahtet über `page.tsx:102–135` sowie Logo-/Bannerresolver in `animeBackdrops.ts:107–113`.
- **Trigger:** Cover/Logo/Banner/Backdrop enthält einen legitimen `/api/v1/media/files/<Datei>`-Pfad beziehungsweise die entsprechende URL an der konfigurierten API-Origin; diese Origin ist eine private IP und Next läuft mit der bestehenden Produktionspolicy.
- **Vorher:** `getCoverUrl` löste API-Pfade auf; `shouldUseUnoptimizedImage` ließ sie direkt vom Browser laden. Logo/Banner und CSS-Backdrops verwendeten ebenfalls direkte Medien-URLs. Die vorhandenen Medienservices/repositories erzeugen diese API-Dateipfade tatsächlich; es handelt sich nicht um einen erfundenen fremden Host. Der Executor hat die vorherige direkte Auslieferung und den neuen Ausfall ausdrücklich bestätigt.
- **Jetzt:** `staticImageSource` löst den Pfad auf die konfigurierte API-Origin auf und `generatedCandidates` setzt diese externe URL in `/_next/image?url=...`. `frontend/next.config.mjs:59` lässt private IPs in echter Produktion weiterhin nicht zu. Das ist eine korrekte bestehende Sicherheitsgrenze, an der der **neu gewählte** Abrufpfad scheitert. Der Resolver liefert trotzdem einen scheinbar gültigen Bildsrc statt einer auslieferbaren Displayquelle.
- **Auswirkung:** Zuvor darstellbare eigene Medien können in Produktion fehlen. Ein Development-PASS ist wegen der abweichenden LocalIP-Einstellung kein Gegenbeweis. Die neuen Resolver-Unit-Tests prüfen nur die generierte URL und erreichen diese Produktionsgrenze nicht.
- **Enger Korrekturumfang:** Die legitime Quelle über eine autoritativ belegte, bereits zulässige lokale Medien-/Dateinaht und eine tatsächliche Größenvariante beziehungsweise Transformation ausliefern. Keine Dateipfade aus Namen erraten, keine allgemeine Proxyroute oder Medienregistry eröffnen, keine LocalIP-/Remote-Allowlist abschwächen und keinen unbegrenzten Originalfallback einsetzen. Relative/absolute API-Dateipfade sowie private/Loopback-/öffentliche Konfigurationen auf ihre jeweiligen vorhandenen Auslieferungswege prüfen.
- **Nachweis zur Schließung:** Vorher ladbares Fixturebild über den korrigierten öffentlichen Pfad unter echter Produktionspolicy als erfolgreiche Bildantwort mit gemessenen Dimensionen/Bytes abrufen. URL-Generierung oder die bloße Dokumentation einer offenen Deliverygrenze schließen dieses Finding nicht.

### R15904-02 — BLOCKER: animierte lokale Bilder umgehen das behauptete 512-Pixel-Coverbudget

- **Ort:** `frontend/src/lib/animeBackdrops.ts:32–40, 64–79`.
- **Trigger:** Ein erlaubtes lokales Cover ist animiertes GIF; analog behandelt der verwendete Next-Optimizer animierte PNG/WebP. Der Resolver akzeptiert lokale Originale aus `/media/anime/` und `/covers/` und benennt `.gif` sogar ausdrücklich im Bare-Filename-Pattern.
- **Produktive Erreichbarkeit:** Der vorhandene Anime-Medienupload unterstützt GIF. `backend/internal/handlers/media_upload_image.go:56–61` speichert das GIF-Original unverändert; die Antwort unter `:149–154` liefert dessen öffentliche URL. Deshalb ist dies kein bloß künstlicher Parent-/Propzustand. Es ist ein vorhandener unterstützter Medienpfad.
- **Beweis:** Der installierte `next/dist/server/image-optimizer.js` gibt bei erkannten animierten GIF/PNG/WebP das `upstreamBuffer` unverändert zurück, bevor die Größenoptimierung ausgeführt wird. Der Reviewer hat den echten installierten `imageOptimizer` zusätzlich rein im Speicher mit einer synthetischen Zwei-Frame-GIF-Datei aufgerufen: angefordert `width=512`, Formatpräferenz WebP; Eingabe und Ausgabe jeweils **1024 × 1024 Pixel pro Frame, zwei Frames, 66 Bytes, byteidentisch**, Antworttyp weiterhin `image/gif`. Es gab keinen Netzwerk-, Datei- oder Datenbankzugriff. Die kleinen 66 Bytes sind eine technische Beweisfixture, keine Behauptung einer gemessenen großen Liveübertragung; sie belegen eindeutig den fehlenden Größen-/Transformationsschritt.
- **Reproduzierbare Eingabe:** GIF-Headerhex `47494638396100040004800000000000ffffff`, danach zweimal Framehex `21f904000a0000002c0000000001000100000202440100`, abschließend `3b`. Die tatsächliche Nextfunktion erhält diesen Buffer als `imageUpstream.buffer`, `paramsResult.width=512`, `quality=75` und `mimeType=image/webp`; Sharp-Metadaten vor/nach sowie Buffervergleich liefern die oben genannten Werte.
- **Auswirkung:** Ein `w=512` in der URL ist für diese unterstützten Quellen keine tatsächliche Covergrenze. Größere Originalanimationen werden weiterhin vollständig übertragen. Die F-09-/P159-03-Abnahme „echtes Medienbudget“ ist damit für einen erlaubten Medienpfad offen, auch wenn statische JPEG-/PNG-Fixtures bestehen. Dies ist eine nachgewiesene Lücke der gerade eingeführten Budgetlösung; keine Behauptung, dass erst diese Phase den ursprünglichen GIF-Transfer verursacht hat.
- **Enger Korrekturumfang:** Eine autoritative tatsächlich begrenzte Displayvariante aus der vorhandenen Mediennaht verwenden oder eine echte begrenzte Transformation für solche Quellen liefern. Den animierten Originalpfad nicht allein wegen generierter Next-Parameter als budgetiert deklarieren; keine geratenen `thumb`-/Dateinamen und keine unbegrenzte Originalwiederholung. Fachliches Medienoriginal und Datenbesitz bleiben erhalten.
- **Nachweis zur Schließung:** Tatsächliche Ausgabe einer erlaubten animierten Coverquelle unter dem korrigierten Pfad mit Dimensionen/Bytes prüfen; eine URL-/`srcSet`-Assertion reicht nicht. Statische lokale und Providerbilder sowie fehlende Quellen müssen dabei weiter funktionieren.

### Files Examined — 159-04

Neun Dateien in diesem Delta; insgesamt 39 verschiedene geänderte Dateien in 159-01 bis 159-04:

- `frontend/src/app/anime/[id]/page.performance.test.ts`
- `frontend/src/app/anime/[id]/page.tsx`
- `frontend/src/components/anime/AnimeBackdropRotator.tsx`
- `frontend/src/components/anime/AnimeMediaProvider.test.tsx`
- `frontend/src/components/anime/AnimeMediaProvider.tsx`
- `frontend/src/lib/animeBackdrops.test.ts`
- `frontend/src/lib/animeBackdrops.ts`
- `frontend/src/lib/api.anime-media.test.ts`
- `frontend/src/lib/api.ts`

Zusätzlich gelesen: unveränderte `next.config.mjs`, `publicApiUrl.ts`, benötigte `utils.ts`-Seams, relevante existierende Medienproduzenten sowie die tatsächlich installierte Next-Optimizerimplementierung. Kein Review dieser vollständigen fremden Subsysteme wird behauptet.

### Übrige Prüfung des Snapshotstands

| Bereich | Geprüftes Verhalten |
|---|---|
| Geteilte Manifestnaht | `AnimeMediaProvider` hält weiterhin genau eine Map und die drei Medienblätter lesen denselben Context. Zusätzliche Provider desselben Anime teilen die laufende Anfrage und einen erfüllten Eintrag. Kein zweiter fachlicher Fetchowner. |
| TTL und aktive Revalidierung | 60 Sekunden Freshness, erneute Acquisition sowie Fokus-/Visibilityereignis bei sichtbarem Dokument können revalidieren; Ereignisbursts teilen den Request. Kein neu eingeführtes Manifestintervall. TTL ist damit ein Revalidierungskriterium, keine Behauptung eines zeitgesteuerten Updates ohne Trigger. |
| Subscriber und StrictMode | Jeder Consumer besitzt eine konkrete Entry-Referenz. Die letzte Abmeldung wird per Microtask geprüft, sodass synchrones StrictMode-Reacquire den gemeinsamen Request behält; erst die wirkliche letzte Abmeldung bricht ab. |
| Fehlerersatz | Bei Fehler werden aktive Consumer auf denselben leeren Ersatzentry übertragen und ihre Entry-Referenzen aktualisiert. Spätere Acquisition/Fokus greift auf diesen Ersatz zu; Cleanup verwendet `consumer.entry`, sodass auch ein danach gestarteter Ersatzrequest der letzten Abmeldung gehört. Kein belegter neuer Lifecyclefehler in diesem Pfad gefunden. |
| Alte Rejections | Der Vergleich der Map-Entryidentität verhindert, dass die verspätete Rejection eines entfernten Requests den neuen Eintrag löscht. Die Abmeldung entfernt den Eintrag vor dem Abort. |
| LRU | Eviction zählt nur ungenutzte erfüllte Einträge ohne laufenden Request und hält davon höchstens 20. Aktive oder noch geteilte Pendingeinträge werden nicht zur Erfüllung dieser Grenze willkürlich entfernt. |
| Manifestidentität | Bei gleicher bekannter Manifestdatenform bleiben Objektidentität und damit die Rotatorabhängigkeit erhalten. Ein geändertes Manifest informiert alle Subscriber; unbekannte zusätzliche Vertragsfelder werden hier nicht erfunden. |
| Resolververtrauen | Schemes, Credentials, Protocol-relative URLs und fremde Origins werden abgegrenzt. Bekannte lokale Namespaces und konfigurierte APIseams werden wiederverwendet. Keine geänderte Next-Allowlist und keine eigene beliebige externe Proxyauflösung. Der API-Datei-Auslieferungsfehler bleibt hiervon getrennt als Finding offen. |
| Vier Coverstellen | Poster, Hero-CSS, Reflexion und Rotatorfallback erhalten tatsächlich dieselbe einmal aufgelöste Display-URL. Die vier Consumer erzeugen keine getrennten Originalfallbacks. Dies belegt Verdrahtung/URLgleichheit, nicht für sich allein Netzwerkbyte-Sharing oder tatsächliche Bildtransformation. |
| Statische lokale Bilder | `/media/anime/` und `/covers/` verwenden echte lokale Next-Kandidaten und keine wirkungslosen Queryparameter am statischen Original. Ihre konkrete Größen-/Byteabnahme in der Produktionsfixture bleibt 159-05; Animationen sind als nachgewiesene Ausnahme oben offen. |
| Providerbilder | Der vorhandene `/api/v1/media/image`-Pfad erhält Größen-/Qualitätsparameter; übrige Provideridentität bleibt erhalten. Das ist von API-Dateien zu unterscheiden. Die Unit-Grenze beweist Parametertransport, keine neue Livequalität-/Bytegarantie. |

### Tests und verbleibende Abnahme

Die gespeicherte Evidence meldet 86/86 relevante Tests, zwei zusätzliche zentrale Refreshregressionen sowie erfolgreichen Typecheck, scoped Lint und Diffcheck. Die Cachetests prüfen Sharing, letzten Consumer, StrictMode, TTL, Fokus/Visibility, Fehlerretry, Ersatzentry, alte Rejection, Animewechsel und LRU. Der Reviewer hat diese Suite nicht identisch wiederholt; hinzu kam ausschließlich der oben beschriebene eigene speicherinterne Optimizerbeweis.

Die grünen Resolver-/Page-Tests belegen echte `getImageProps`-Kandidaten und gemeinsame Coververdrahtung, aber sie lösen weder den privaten Produktionsabruf noch die animierte Next-Passthroughausnahme auf. Die beiden Findings bleiben daher trotz dieser erfolgreichen Tests offen.

**Offene Findings nach 159-04: BLOCKER 2 · WARNING 0 · INFO 0.** Vor Schließung sind korrigierte feste Produktcommits und passende reale Ausgabebelege nachzuprüfen. 159-05 bleibt ebenfalls pending. Human-UAT 156/157/158, bekannte globale Baselinefehler und die ausdrücklich erhaltene Legacy-Streamgrenze bleiben unverändert. Der Reviewer änderte nur den Bericht; keine Produkt-/Trackingänderung, kein Commit oder Datenbank-/Medienmutationszugriff.


## Abschließende 159-04-Nachprüfung — `7d9dedb1`

Fester Produktcommit: `7d9dedb14e603ad3395a50ca6981495ddb5a5800`. Die abschließende Bewertung beruht auf `git show` dieses Commits und dem Delta zu `1f5dfa749a7a84c827321a033cec099bf293081b`. Der zeitweise vorab gelesene Working Tree diente ausschließlich früher Rückmeldung; er ersetzt diesen festen Prüfstand nicht. Amendment `02be0c8b` und die dokumentierte Surface-/Consumer-Matrix erklären den notwendigen, vom Auftrag gedeckten Ausbau der vorhandenen Auslieferungswege.

### Korrigierte Befunde und verbleibendes Verifikationsgate

| Punkt | Code-/Unit-Nachprüfung | Status |
|---|---|---|
| R15904-01: private API-Dateiorigin | `animeBackdrops.ts:17–28` bildet autoritative API-Dateiquellen auf den vorhandenen gleichnamigen Frontendrelay ab. Dessen exakter GET-/HEAD-Opt-in-Zweig in `app/api/v1/[...path]/route.ts:14–30` entfernt nur den Displayparameter und verwendet den bestehenden festen internen Proxy. Kein Next-Remote-Optimizer, keine beliebige URLauflösung, keine LocalIP-/Allowliständerung. Echte Rasterbytes im Handler-/Helpertest werden zu WebP mit gemessener Breite 512 transformiert. | Im Code korrigiert; tatsächlicher Produktions-HTTP-Abruf über die private interne Origin in 159-05 noch ausstehend. |
| R15904-02: Animationen umgehen Budget | `server/imageDisplay.ts:145–155` decodiert ausdrücklich Frame 0/eine Seite und erzeugt WebP mit realem Resize, Pixel-/Bytegrenzen und ohne Vergrößerung. Die Tests erzeugen tatsächliche Zwei-Frame-GIF-/WebP-/APNG-Fixtures; sie prüfen 512 Pixel, ein Ausgabe-Frame, Alpha und erste Framefarbe. Kein Originalfallback. | Im Code und an tatsächlichen Transformbytes korrigiert; Produktionsauslieferung und Covermessung in 159-05 noch ausstehend. |
| PublicFolder vor dynamischer Coverroute | Der schmale `/covers/{file}/display`-Adapter nutzt dieselbe sichere Basenameauflösung wie der Originalhandler. Die Unterroute kollidiert nicht mehr mit einer Datei `/covers/{file}`. Die ursprüngliche PNG-/SVG-Auslieferung wird im Handlervergleich unverändert geprüft. | Routingursache im Code beseitigt; echter Next-HTTP-Test mit vorbestehender public-Datei bleibt 159-05. |
| Kalter Seitenaufbau mit mehreren Bildern | `imageDisplay.ts:21–43` hält zwei aktive Jobs und höchstens acht FIFO-Warter. Abort entfernt wartende Einträge vor Source-I/O; ein freier Slot wird unmittelbar übertragen. Tests prüfen vier verschiedene kalte Quellen mit vier 200-Antworten, maximal zwei aktive Sources, Kapazitätsgrenze, Queued-Abort und erneute Aufnahme nach Freigabe. | Der zwischenzeitliche Fehler „dritter Request sofort 429“ ist korrigiert. Keine unbegrenzte Queue oder bloße Erhöhung der aktiven Jobs. |

Die früher definierten Ausgabebelege werden nicht fallengelassen: Sie werden im bestehenden Gesamtprüfpfad 159-05 erhoben. Ein weiterer eigener Mini-Build ist für die Code-Nachprüfung weder erforderlich noch gestartet. Plan 159-05 kann die Produktionsbelege nun erheben; es besteht keine zirkuläre Sperre zwischen 04 und 05.

### Sicherheits- und Vertragsprüfung des festen Korrekturstands

- Gemeinsame Policy mit genau den Slotbreiten 512/760/1280/1920, Qualität 75, maximal 16 MiB Eingabe, 20 Millionen decodierten Pixeln und 4 MiB Ausgabe. Lokales `stat` und begrenztes Lesen mit Sentinel berücksichtigen Dateiwachstum; Upstreambytes werden auch ohne verlässlichen Content-Length fortlaufend begrenzt. Nur Rasterformate gelangen an Sharp, SVG und Video bleiben außerhalb dieses Opt-ins.
- Zweierkapazität und acht Warter sind pro Serverprozess über eine gemeinsame Symbolreferenz verbunden. Die fünf Sekunden laufen auch während des Wartens; abgelaufene Aufnahme startet keine Quelle. Source-Abbruch entfernt den Streamreader. Ein bereits laufender nativer Sharpjob behält seinen Slot bis zum Ende und besitzt zusätzlich ein endliches Sharp-Timeout. Kein Versprechen, dass ein nativer Job exakt im Moment des JavaScript-Aborts bereits beendet ist.
- API-Dateien bleiben an die vorhandene Backend-Dateinamensauflösung gebunden. Der Client kann keinen neuen Host oder Dateisystempfad für den Helper vorgeben. Credentials verwenden ausschließlich den bestehenden Proxytransport; API-Displayantworten sind `private, no-store`. Lokale Transformantworten sind konservativ 60 Sekunden öffentlich cachebar.
- Displayabrufe entfernen Range-/If-Requestheader vor dem Sourceabruf. Nach Transformation entstehen Content-Type und Content-Length aus den neuen Bytes; alte ETags, Content-Encoding, Content-Range, Accept-Ranges und Last-Modified werden nicht übernommen. Der Proxy folgt weiterhin keinen Redirects. 3xx/401/404/5xx bleiben erfolglose Sourceantworten; unerwartetes 206 wird nicht als gültiges Transform-200 behandelt. GET-/HEAD-Metadaten sind geprüft; HEAD liefert auch bei Helperfehlern keinen Body.
- Ohne Opt-in bleibt die vorhandene API-Weiterleitung einschließlich anderer Methoden und anderer Medienpfade aktiv. Die bisherigen lokalen Video-Rangefälle 206/416 bestehen weiterhin. Originaldateien, Tabellen, Backend-Transformationslogik und Runtimekonfiguration sind unverändert.
- `docs/api/api-contracts.md` beschreibt explizit den Frontendvertrag; die OpenAPI-Operation für Backendoriginale bekommt lediglich `x-frontend-display`-Metadaten. Es wird kein unwirksamer Backendgrößenparameter behauptet. Sharp wird direkt in der bereits vorhandenen Version 0.34.5 deklariert; der Lockfilediff enthält keine Frameworkaktualisierung.
- Der Resolver akzeptiert fertige Display-URLs kontrolliert, stellt vorhandene Nextwrapper auf die tatsächliche Displaynaht um und behält effektive Providerparameter getrennt bei. Die vier Coverstellen bleiben an dieselbe URL gebunden. Netzwerk-Coalescing und tatsächliche Transferbytes werden hieraus nicht allein abgeleitet.
- AVIF-Nachfrage: Der Resolver behält `.avif`; der Helper akzeptiert die `ftyp`-Brands `avif`/`avis` und verwendet keine `metadata.format`-Allowlist. Dass Sharp AVIF als HEIF mit `compression=av1` beschreibt, schließt diese Quellen daher nicht versehentlich aus. In den 115 gelesenen Tests existiert keine eigene AVIF-Bytefixture; eine solche Laufzeitabnahme wird nicht behauptet. Es wurde kein zusätzlicher Codec- oder Testauftrag begonnen.

### Files Examined — Korrekturdelta

17 geänderte Produkt-/Test-/Vertragsdateien im Korrekturdelta, darunter 13 erstmals in diesem kumulativen Review; insgesamt jetzt 52. Zusätzlich wurde die geänderte Surface-Dokumentation `docs/api/api-contracts.md` als Vertragskontext gelesen.

- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/src/app/api/v1/[...path]/route.test.ts`
- `frontend/src/app/api/v1/[...path]/route.ts`
- `frontend/src/app/covers/[file]/display/route.test.ts`
- `frontend/src/app/covers/[file]/display/route.ts`
- `frontend/src/app/covers/[file]/route.ts`
- `frontend/src/app/media/[...path]/route.ts`
- `frontend/src/components/anime/AnimeMediaProvider.test.tsx`
- `frontend/src/lib/animeBackdrops.test.ts`
- `frontend/src/lib/animeBackdrops.ts`
- `frontend/src/lib/imageDisplayContract.ts`
- `frontend/src/lib/server/apiProxy.ts`
- `frontend/src/lib/server/coverFiles.ts`
- `frontend/src/lib/server/imageDisplay.test.ts`
- `frontend/src/lib/server/imageDisplay.ts`
- `shared/contracts/openapi.yaml`

### Nachweise und aktueller Teilstatus

Die gespeicherten neuen Logs `159-04/display-green.log`, `display-typecheck.log` und `display-lint.log` wurden gelesen: **115/115 Tests in zehn Dateien**, Typecheck **0**, scoped Lint **0**. Die neuen echten Transform-/Handlerfälle sind Bestandteil dieser Suite; die alte 86er-Suite wird nicht als neue 115er-Abnahme ausgegeben. Die Nachprüfung hat keine Tests, Builds, Requests oder Datenzugriffe wiederholt, die mit 159-05 konkurrieren könnten. Ein eigener Produktedit oder Commit fand nicht statt.

**Aktueller Codereview: BLOCKER 0 · WARNING 0 · INFO 0, weiterhin PARTIAL.** R15904-01 und R15904-02 sind als `code_fixed_runtime_pending` geführt. Produktions-HTTP, Bildgrößen-/Transfermessungen im Browser und die vollständigen 159-05-Gates bleiben offen; damit wird die frühere Pflicht zum realen Auslieferungsnachweis ausdrücklich erhalten. Separate Security-/Verifikationsbefunde anderer Prüfer werden dadurch nicht automatisch geschlossen. Unveränderte Legacy-Streamgrenzen, globale Baselinefehler und Human-UAT 156/157/158 bleiben bestehen.


## Teilnachprüfung 159-05 — strikte Named-Query-Validierung `157f318f`

Geprüfter fester Produktcommit `157f318fa006694ed338dd916e50b0ed2fbc86bc`, einschließlich RED-Tests aus `8eaca4bf`. Dieser Abschnitt prüft nur den schmalen Parserfix; die gesamte Ausführung/Abnahme 159-05 sowie der angekündigte Platzhalterfix sind damit nicht vorweggenommen.

Der separate Security-Audit fand eine reale Lücke des ersten 159-01-Schnitts: Go `URL.Query()` verwirft syntaktisch fehlerhaft URL-codierte Werte. Dadurch konnten `cursor=%ZZ` oder `limit=%ZZ` als fehlend gelten und eine erfolgreiche erste/default Seite erzeugen. Die damalige positive Bewertung der Parametervalidierung umfasste diese Escape-Fälle nicht; sie wird hier ausdrücklich durch den belegten Befund und die Korrektur ergänzt.

- `episode_version_grants.go:126–150` extrahiert die bereits vorhandene Selektor-Paarschleife einmal als `parseStrictNamedQuery`. Decodierbare Namen werden mit den ausdrücklich angefragten Vertragsnamen verglichen. Ein Parsefehler im zugehörigen Wertepaar wird zurückgegeben statt der Wert stillschweigend entfernt. Duplikate bleiben als Wertefolge erhalten; ihre fachliche Ablehnung bleibt beim Caller. Unbekannte oder selbst nicht decodierbare Namen werden nicht als bekannte Optionen geraten.
- `episode_version_reads.go:23–60` verwendet diese gemeinsame Naht für projection/limit/cursor und im Publiczweig zusätzlich die Include-Flags. Malformed relevante Werte, codierte bekannte Namen, doppelte Optionen und widersprüchliche Include-Werte enden vor Repositoryzugriff mit 400. Der Fullzweig `:62–69` behält die bestehenden Include-Defaults und deren alte Parsingsemantik; unbekannte fehlerhafte Querypaare beeinflussen weder Default noch gültige Publicfortsetzung.
- `parseReleaseStreamSelection` verwendet denselben Helper weiterhin ausschließlich für `variant_id`. Positive IDvalidierung, kanonische Versionsidentität, explizite Variante und bewusst erhaltenes Verhalten ohne Selektor werden nicht umdefiniert. Die beiden Datenidentitäten oder Entitlementgrenzen werden durch die Extraktion nicht verändert.
- Die OpenAPI-400-Beschreibung nennt die tatsächlichen strikten Felder und grenzt die kompatibel ignorierten fremden Parameter ausdrücklich ab. Kein neuer Requesttransport, Endpoint, SQLpfad, Authmechanismus oder DTO.

### Files Examined und Nachweise

Fünf bereits früher gelesene Dateien wurden für dieses neue Delta erneut an festen Gitobjekten geprüft; deshalb bleibt die kumulative Anzahl bei 52:

- `backend/internal/handlers/episode_version_grants.go`
- `backend/internal/handlers/episode_version_reads.go`
- `backend/internal/handlers/episode_version_public_test.go`
- `backend/internal/repository/episode_version_public_integration_test.go`
- `shared/contracts/openapi.yaml`

`f01-red.log` belegt den vorherigen Repositorydurchgriff im Nil-Repository-Harness durch 500 statt 400. Die neue Invalid-Options-Suite stoppt alle entsprechenden Fälle mit 400, einschließlich codierter Namen und eines fehlerhaften zweiten Duplikatwerts. `f01-green-handler.log` ist die reine Handlerausführung und enthält erwartete PG-Skips; diese wird nicht als Datenbankbeweis gewertet. Der separate gelesene `f01-green-sql.log` führt die isolierten PostgreSQL-Fixtures tatsächlich aus: Default/Full/unrelated-malformed, echte Cursorfortsetzung mit Statementbudget, bestehende neutrale/atomare/Assignmentfixtures sowie explizite Selektorquelle, kanonischer Grant und Legacy-Kollision bestehen dort ohne diese Skips.

Der gelesene Rootbeleg `root-runtime-sync-15905-query.json` enthält passende Source-/Containerhashes beider Produktdateien und den Air-Kindprozesswechsel ohne Containerneustart. Tatsächliches HTTP: fehlerhafter Publiccursor **400**, fehlerhaftes Publiclimit **400**, gültige Publicseite **200**, alter Fullaufruf mit Include-Flags **200**. Der Reviewer führte keine erneuten Tests oder Livezugriffe aus. Build/vet **0** wurden vom Executor/Root gemeldet; dieser enge Review behauptet dafür keinen eigenen zusätzlichen Lauf.

**Parserdelta: BLOCKER 0 · WARNING 0 · INFO 0.** Die fachliche Fehlerspur ist nachvollziehbar korrigiert; die formale T-159-01-Abnahme bleibt beim separaten Security-Reviewer. Gesamtreview weiterhin PARTIAL, 159-05 offen. Nur `159-REVIEW.md` geändert, kein Commit, kein Produkt-/Datenbankzugriff.


## Teilnachprüfung 159-05 — gültiger Animeplatzhalter und tatsächlicher Cover-Routingpfad

Feste Produktdeltas: `26faac702d79435cbb61e16810dc9ef5b1f59817` und `6ebfebf72019f337844b01fd7f7d832faaa71a74`; zugehöriger Routing-RED-Commit `80d74474`. Produktquellen, Tests und neue PNG-Datei wurden aus Gitobjekten gelesen. Keine erneuten Builds, Tests oder Livezugriffe durch den Reviewer.

### Produktprüfung

- **Enger Platzhalterfix:** `resolveAnimeCoverURL` ändert ausschließlich seinen Anime-Displayfallback auf `/covers/placeholder.png`. Der neue PNG-Blob ist 298 Bytes groß, IHDR 64 × 96, SHA-256 `69f71474a9e5a1e2614b75480f0c3bf93396f49e4b059c1b296dddb2f0c0a584`. Der vorhandene globale `getCoverUrl` und normale Dateinamensauflösung bleiben unverändert. Die alte 352-Byte-JPG-Datei ist nach geprüftem Blobhash `14acbcadc59f51663a8e3a1b4d61547623522b97d9ddb44377f8f4d1adbbf453` identisch zur dokumentierten Auditbaseline.
- **Reale Routingkorrektur:** Die vorher neu angelegte Unterroute `/covers/{file}/display` verursachte im tatsächlichen Next-Devrouter `ENOTDIR`, weil dessen Public-Dateiprüfung unter einer bestehenden Datei weiterlief. Meine frühere Aussage, die Unterroute löse den PublicFolderkonflikt im Code bereits vollständig, war daher zu weitgehend. Der gelesene Root-Livebeleg dokumentiert den Fehler als 500; dies ist ein Routingfehler der neuen Zwischenlösung und vom alten defekten JPG getrennt.
- **Jetzt:** Der unverändert abgesicherte Adapter liegt unter `/covers/display/{file}`. Die URL befindet sich nicht mehr unterhalb der eigentlichen öffentlichen Bilddatei. Resolver-RegExp und URLbildung erzeugen den neuen Präfix genau einmal; bereits fertige Display-URLs bleiben kontrolliert auflösbar. Handler, gemeinsame Basenameprüfung, Rastergrenzen, GET/HEAD und Originalroute behalten ihre bisher geprüfte Semantik. Die Tests rufen/importieren den neuen Adapterpfad und vergleichen weiterhin Originalbytes.
- Der neue Default wird durch `imageDisplay.test.ts` aus der tatsächlich getrackten PNG-Datei über den Resolver und den echten Handler decodiert; ein bloßer URLtest genügt hier ausdrücklich nicht. Ein nicht vorhandenes eigenes Cover wird weiterhin als fehlende Quelle behandelt und nicht über einen unkontrollierten Originalfallback wiederholt.

### Nachweise

Die gelesenen Logs melden zunächst **56/56** für den Platzhalterfix und danach **58/58 in drei Dateien** für den korrigierten Routingstand. Der Rootbeleg `root-live-cover-route-fixed.json` bindet die tatsächlichen Live-Development-Antworten an `6ebfebf7`:

| Abruf | Tatsächliche Antwort |
|---|---|
| `/covers/display/placeholder.png?display_width=512` | 200, WebP, 74 Bytes, 64 × 96, ein Frame; Cache-Control public/max-age=60 |
| `/covers/display/placeholder.jpg?display_width=512` | 415; das bekannte defekte Original wird nicht als erfolgreiches Bild ausgegeben |
| `/covers/display/nonexistent.png?display_width=512` | 404 |

`root-live-cover-route-finding.json` belegt den vorherigen ENOTDIR-500; `root-live-placeholder-baseline.json` trennt den bestehenden korrupten JPG-Header davon. Diese Beweiskette korrigiert die frühere reine Routingannahme. **Produktions-HTTP, Browsertransferbudget und die übrigen 159-05-Gates bleiben ausstehend.**

Geprüfte Delta-Dateien: `frontend/public/covers/placeholder.png`, `frontend/src/lib/animeBackdrops.ts`, dessen Test, `frontend/src/lib/server/imageDisplay.test.ts` sowie der umbenannte Adapter und Test unter `frontend/src/app/covers/display/[file]/`. Die neue PNG erhöht die kumulative Anzahl auf 53; Umbenennungen werden als dieselbe geprüfte Dateiidentität behandelt. Die Delivery-Matrix wurde als Kontext gelesen.

### R15905-DOC01 — WARNING: APIguide verweist noch auf den nicht mehr funktionierenden Adapterpfad

- **Ort am festen Stand `6ebfebf7`:** `docs/api/api-contracts.md:92` dokumentiert weiterhin `/covers/{filename}/display?display_width=512`; `:126` nennt weiterhin `covers/[file]/display/route.test.ts`.
- **Beleg/Auswirkung:** Der Produktadapter wurde gerade wegen eines tatsächlichen 500 an diesem Dateinachfahrenpfad verschoben. Ein Consumer oder Prüfer, der dem bezeichneten Surfacevertrag folgt, verwendet deshalb den falschen Pfad. Die separate Delivery-Matrix ist schon richtig; der als Surface-Source-of-Truth verlinkte APIguide noch nicht.
- **Korrekturumfang:** Genau diese beiden Pfadverweise auf `/covers/display/{filename}?display_width=512` und `covers/display/[file]/route.test.ts` aktualisieren. Kein Produktumbau. Der Hinweis ist an Root übergeben; der Reviewer ändert nur diesen Bericht.

**Stand dieser Nachprüfung: Produkt-BLOCKER 0, Dokumentations-WARNING 1, INFO 0.** Der Gesamtreview bleibt PARTIAL bis 159-05. Vorhandene Runtime-/Security-/Human-UAT-Gates werden nicht durch diese enge Korrekturprüfung geschlossen.


## Laufende Abschlussprüfung — Testkorrekturen und Harness

Die festen Deltas `d22da611` und `a76d9a8e` ändern keine Produktlogik: Der optionale Logo-Fehlertest prüft jetzt die vollständige tatsächlich neue Display-URL; der reale Platzhaltertest übergibt einen explizit fehlenden Sourcewert entsprechend der vorhandenen TypeScript-Signatur. Beide Änderungen behalten ihre Verhaltensassertions und sind im abschließenden Root-Vollgate enthalten.

Der gelesene Root-Anhang in `DECISIONS.md` beschreibt die tatsächlich gewählten Verantwortungsgrenzen einschließlich nicht begrenzter neutraler AnimeDetail-Liste, getrennter Varianten-/Versionsidentitäten, bewusst erhaltener No-Selector-Mehrdeutigkeit, Provider-/lokaler Displaywege und offener Human-UAT. Daraus entsteht keine unautorisierte neue Produktregel. `docs/api/api-contracts.md` korrigiert beide in R15905-DOC01 bezeichneten Pfade; **dieser Dokumentationshinweis ist damit geschlossen**, vorbehaltlich Aufnahme des bereits gelesenen Dokuments in den Abschlusscommit.

Die aktuellen Deltas des bestehenden `verify-anime-detail-phase.sh`, Phase158-Probes und Fixture-Servers sowie der neue Phase159-Probe wurden read-only geprüft. Der Harness verwendet eine markierte isolierte Produktionskopie, getrennte API-/SQL-Fixtures und die vorhandenen Originalrouten. Quellenhash-Prüfung schützt Build-Wiederverwendung. Die Media-Browsermessung aktiviert kein Playwright-Routing und hält einen GET-only-Proxy auf zwei expliziten Loopbackorigins vor. Der simulierte Cursor des Browserfixtures wird nicht als Backend-Parserbeweis ausgegeben; dafür stehen separate echte PG-/Handlergates bereit.

Ein enger zusätzlicher Nachweispunkt wurde an Executor/Root gemeldet: Gleiche URLs in allen vier Coverstellen und eine `.find()`-Auswahl des ersten CDP-Datensatzes beweisen allein keine einzige tatsächliche Übertragung. Für den finalen Mediennachweis müssen alle Response-/Transferdatensätze derselben Source pro cold/warm-Navigation gezählt und Cacheantworten getrennt dargestellt werden. Dies ist derzeit eine Evidenceaufgabe, kein behaupteter Produktfehler. Die Finalfassung des Harness und ihr erfolgreich abgeschlossener Lauf werden vor Abschluss erneut gebunden.

Das gelesene finale Root-Gate unter `root-gates-15905` ist an `a76d9a8e` gebunden: **2616 PASS, zwei exakt unveränderte CSS-Guard-Baselinefehler, drei Todo; Typecheck 0, Scoped Lint 0, globaler Lint unverändert 13 Fehler / 331 Warnungen; Diffcheck 0.** Die ersten fehlgeschlagenen Zwischenchecks und die reine Whitespace-Normalisierung alter Evidence sind mit ursprünglichen Hashes weiterhin dokumentiert. Dies wird ausdrücklich nicht als vollständig grüner globaler Test-/Lintlauf bezeichnet.

**Weiterhin PARTIAL:** Der zuletzt gelesene Browserlauf enthielt noch einen Harness-Wartefehler beim nach erfolgreichem Laden entfernten Load-more-Button. Die bereits erfolgreichen Produktions-Medienfälle sind dadurch nicht als Gesamt-PASS ausgegeben. Finaler Browserlauf, Transferanzahl und abschließende Evidence-/Quellbindung stehen aus; kein neuer Vollcheck durch den Reviewer.


## Finaler Abschluss — 14.09.2026

**CLEAN, Standardtiefe, 57 Dateiidentitäten, keine offenen Findings.** Die historischen PARTIAL-Stände werden durch diese abgeschlossene Code-/Evidenceprüfung abgelöst. R15904-01, R15904-02 und R15905-DOC01 sind geschlossen. Die letzte Produktlogik ist `6ebfebf72019f337844b01fd7f7d832faaa71a74`; danach folgen ausschließlich die geprüften Testkorrekturen `d22da611`/`a76d9a8e434d2f70b5f87ea5b6e0588c9fb6f6c1`. Der final geprüfte Harness ist `c1bd215c5a72a2a895b39c14354c3b86998d2ba5`. Spätere globale GSD-/Berichtsredaktion prüft Root separat.

### Quellenbindung

- Isolierter Produktionsquellbaum SHA-256 `b1270c75da9dd25fc4ae0cd8565445d5f0697af3c1239d7970e57a28af56ff34`, Build-ID `qPT6ey0H2wEKJcPZBDcMg`. Der Reviewer berechnete den vom Harness definierten getrackten Produkt-/Test-/Konfigurationshash unabhängig neu: identisch.
- Zusammenhängender Browserlauf gestartet `2026-09-14T05:46:48Z`: **91/91 PASS**, `fixture-run.exit=0`; `fixture-results.json` SHA-256 `22f7fc89df1933c957e31edfd1694fbb3ad429ce7936f5ad200e606023a5d7cf`, unabhängig geprüft.
- Alle vier Script-Hashes in `159-05/final-run.json` stimmen mit den gelesenen Dateien und den Gitblobs aus `c1bd215c` überein: Phase159-Probe `3d3914651ccc93acf8ae53e154ea84280aa8a4678e15476f84484f8edca3db3d`; Phase158-Probe `b0e1e83af5f700847bac19f923966b56bc6760b063b4eac081d774f7a654547f`; Fixture-Server `c6e6040185af1f0093c423d3d131aa4c93e82e7651bf8752673a7147069edd66`; Shellwrapper `8a823a736440711f5e44bd6545f9c247c54cb87c15d8630e679dbf8467289f42`.
- Gelesener Root-Dokumentationsstand: `DECISIONS.md` SHA-256 `53119f6ac7ac156e3f9a2e936edccc4f4ce1e84c069b710e533074fe49bdbe1c`; korrigierter APIguide `11e78e9fe1dfda72cd28a941c06f0374cb2c83315ee8fc2ef9cab6540853c598`. Damit sind die zwei falschen Surfacepfade tatsächlich korrigiert, ohne einen noch unbekannten Endcommit vorzutäuschen.

### Geprüfte finale Evidence

Die 33 übernommenen Phase158-Prüfgruppen bestehen erneut, einschließlich fünf Breiten mit geschlossener/geöffneter Episode, tatsächlicher HTTP-/Metadatenantworten, Session-/Fehlerfällen und Pretty-/Compatibilitynavigation. Gruppenwechsel verursachen null fachliche Zusatzrequests; native zweite Tabs, Reload, Clear, ungültiger/entfernter und blockierter Storage bestehen ohne Hydrationfehler. 125 Varianten plus getrennte gleichnummerige neutrale Episode, Retry, komplette Counts und das exakte Playhref `/api/releases/10/stream?variant_id=100` bestehen. Der vorherige Load-more-Harnessfehler wurde durch eine Wartebedingung korrigiert, die den fachlich entfernten Button zulässt; keine Produktassertion wurde dafür gestrichen.

Gridnavigation über drei Seiten, erster langsamer Klick, Hover/Fokus/Touch und veraltete Antworten bestehen. Der Manifesttest belegt einen gemeinsamen Initialrequest, einen Request beim Fokusburst, Fehlerretry und SPA-Änderungen. 25 Anime/48 SPA-Navigationen prüfen Eviction mit eingefrorener Uhr, sodass TTL nicht als alternative Erklärung dient.

**Medienfindings auch in Produktion geschlossen:** Der reale selektive Next-Produktionsserver liefert getrackte Cover, lokale Dateien und API-Dateien von der privaten Fixtureorigin über den korrigierten Displaypfad aus, ohne LocalIP-/Allowlistlockerung. Tatsächliche GIF-/APNG-/WebP- und AVIF-Ausgaben sind decodiert, begrenzt und ein Frame. Beispiele: PNG 4.287.084 → 156.718 Bytes bei 512×730; GIF 8.098 → 708 Bytes bei 512×341; AVIF 1.696.597 → 156.034 Bytes bei 512×730. Das getrackte kleine JPEG bleibt ohne Vergrößerung 400×578 und wird von 50.844 auf 20.988 Bytes transformiert. Die winzige animierte WebP-Fixture wächst von 236 auf 706 Bytes; daraus wird ausdrücklich keine universelle Byteeinsparung abgeleitet. Der neue Platzhalter liefert 74-Byte-WebP bei 64 × 96; das alte korrupte JPG bleibt unverändert und liefert 415 im Displaypfad.

**Transferanzahl vollständig abgeglichen:** 48 Medienfälle × cold/warm ergeben 96 Beobachtungen. Alle Source-Responses haben abgeschlossene Transferdaten. Der unabhängige Abgleich sämtlicher tatsächlicher Nichtcache-Transfers mit den vollständigen GET-Proxylogs ergibt weder Proxy-minus-CDP noch CDP-minus-Proxy-Differenzen. Erfolgreiche Bilder übertragen kalt genau einen Bildbody; öffentliche warme Quellen null, private/no-store warme Quellen genau einen. Alle vier Coverstellen verwenden dieselbe Quelle. Damit ist der frühere reine `.find()`-/URLgleichheitsnachweis ersetzt.

**Reale verbleibende Fehlergrenze:** Fehlerquellen erzeugen je Beobachtung ein bis zwei kleine 404-/500-Text-/JSONantworten, maximal zwei, aber null Bildbodys und keinen Originalfallback. Dies wird nicht als vollständig deduplizierter Erfolgsfall bezeichnet. Kein Browserzugriff außerhalb der erlaubten Fixtureorigins wurde aufgezeichnet.

### Gates, Grenzen und Abschlussbesitz

- Root-Vollsuite am finalen Teststand: **2616 PASS, zwei exakt unveränderte CSS-Guard-Baselinefehler, drei Todo; Exit 1**. Typecheck 0, Scoped Lint 0, globaler Lint unverändert 13 Fehler / 331 Warnungen mit identischem Diagnosticmultiset, Diffcheck 0. Kein vollständig grüner globaler Test-/Lintlauf behauptet.
- Backend-Build/Vet und frische isolierte PG-Gates 0. Tatsächliche Relations-/Visibility-/Slug-, neutrale/atomare/Assignment-, Full-Create/Patch-, malformed-Query- sowie Grant-/Selektorkollisionsprüfungen bestehen. Publicprojektion weiterhin zwei Statements und maximal limit+1 Ergebniszeilen der begrenzten Datenabfrage; kein physisches Scanlimit oder globales Bytebudget der unveränderten neutralen AnimeDetail-Liste behauptet. Der Browserfixture-Cursor ist simuliert; echte Parser-/SQLbeweise sind separat ausgewiesen.
- Vollständiger Produktionsbuild weiterhin durch den belegten vorhandenen Adminexport `formatEditLoadError` blockiert. Separater selektiver Produktionsbuild 0 enthält die tatsächlichen Anime-/Fansub-/Pretty-/Compatibility-, APIrelay- und Medienrouten. Kein Full-Build-PASS oder flächendeckender Review unveränderter Adminbereiche.
- Harnesssyntax/Scoped ESLint 0. Die vier Harnessdateien erhöhen die geprüften Dateiidentitäten von 53 auf 57; die beiden temporären SQL-Probes wurden ergänzend als Evidencequelle gelesen, nicht als Produktdateien gezählt.
- `159-05/resources.json` belegt die Entfernung der exakt eigenen PostgreSQLcontainer, fünf nach Pfadauflösung geprüfte Scratchverzeichnisse und geschlossene Ports 3158/3159/3160. Kein Live-Datenbank-/Originalmedien-/Environmentwrite durch diesen Review. Es gab nur Lese-/Hashabgleiche und Änderungen an `159-REVIEW.md`; kein neuer Test-/Buildlauf oder Commit durch den Reviewer.

**Finaler Reviewstatus: CLEAN.** Die Code- und Evidenceprüfung dieser Phase ist abgeschlossen. Die bewusst erhaltene No-Selector-Streammehrdeutigkeit, globale Baselinefehler und ausdrücklich ausgeschlossene Produktentscheidungen bleiben dokumentiert. Human-UAT 156 GAP02, 157-06 Task4 und die gesonderten neuen menschlichen Prüfungen bleiben offen; keine automatische Freigabe. Root verantwortet abschließende GSD-Redaktion und Commitzusammenstellung.
