---
phase: 159-public-anime-detail-konsolidierung
reviewed: 2026-09-13T22:40:39Z
depth: standard
review_scope: partial
reviewed_plans: [159-01, 159-02]
pending_plans: [159-03, 159-04, 159-05]
review_baseline: c3bfcb23781addca1ccd3931592535416f706787
review_head: a9d9bd12dcd7ac8d54702445df96a01b22119648
files_reviewed: 22
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
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeNeighborNavigation.test.ts"
  - "frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts"
  - "frontend/src/app/api/releases/[id]/stream/route.test.ts"
  - "frontend/src/app/api/releases/[id]/stream/route.ts"
  - "frontend/src/lib/api.episode-versions.test.ts"
  - "frontend/src/lib/api.ts"
  - "frontend/src/lib/server/streamRelayAuth.test.ts"
  - "frontend/src/types/__tests__/episode-version-contract.test.ts"
  - "frontend/src/types/episodeVersion.ts"
  - "shared/contracts/openapi.yaml"
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 159 — PARTIAL Code-Review: Snapshots 159-01 und 159-02

**PARTIAL: In den geprüften Schnitten 159-01 und 159-02 wurden keine belegten neuen BLOCKER oder WARNINGS gefunden. Keine Freigabe der gesamten Phase 159.** Der Frontmatterstatus `clean` gilt ausschließlich für diese beiden festen Snapshots und insgesamt 22 verschiedene Dateien. UI-, Grid- und Medienänderungen aus 159-03/04 sowie das abschließende Gate aus 159-05 bleiben ungeprüft. Der ursprüngliche 159-01-Review folgt zuerst; die Ergänzung für 159-02 mit eigener Commit-/Dateigrenze steht anschließend.

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
