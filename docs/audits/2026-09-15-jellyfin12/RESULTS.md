# Jellyfin-12 Compatibility Result

**Arbeitsstand, noch kein Phasenabschluss:** Plans 161-01 bis 161-05 technisch verifiziert. Editor, Playback, öffentliche Projektion und abschließende Gesamtprüfung folgen. Ausgangscommit `b3b07ff0`; kanonisches Repository `/home/d1sk/team4s`, Branch `main`. Alle Belege in diesem Verzeichnis sind bereinigt; Quellpfade, Header und echte Zugangsdaten gehören nicht in diesen Bericht.

## Auth

Vorher: Derselbe Schlüssel ergab beim Kontrollaufruf und einer tatsächlich verwendeten Serienabfrage mit `api_key` HTTP 401, mit `Authorization: MediaBrowser Token="<key>"` HTTP 200. Auch `X-Emby-Token` wurde vom laufenden Server abgewiesen. Das beweist den Authentifizierungsfehler, allein aber keine vollständige API-Kompatibilität.

Nachher: `backend/internal/jellyfin/request.go` hält URL-Aufbau, Header, Origin-/Redirectprüfung und bereinigte Transportfehler zusammen. Neun direkte HTTP-Ausführungsstellen und der indirekte FFmpeg-Aufruf nutzen diese Grenze. Jellyfin-URLs enthalten keine Schlüssel. FFmpeg erhält seine Header getrennt von der URL; `-max_redirects 0` steht vor `-i`. Der ausführbare Test mit zwei Servern beweist erfolgreiches direktes Rendering und **null Requests am Redirectziel**.

Belege: `discovery-live.json`, `ffmpeg-redirect-baseline.json`, `transport-source-coverage.json`; Plan-01-/03-Summaries und zugehörige Request-/Proxy-/Renderer-Tests. Race-Instrumentierung ist im vorhandenen Backendimage ohne gcc/CGO nicht verfügbar.

## Jellyfin callers

**9 direkte Go-HTTP-Stellen plus 1 indirekter FFmpeg-Verbraucher.** Vollständige logische Aufrufer-/Querymatrix: `.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-CALLERS.md`.

| Ausführungsstelle | Implementierung | Nachweis und Grenze |
|---|---|---|
| Admin-Metadaten | `handlers/jellyfin_client.go`, `fetchJellyfinJSON` | Moderne Header, exakte IDs und Batchtests; tatsächliche Serien-/Episodenantworten geprüft |
| Public-Artwork JSON | `handlers/anime_backdrops_client.go`, `fetchJellyfinJSON` | Gemeinsame Transporttests und Artwork-Handlerregressionen |
| Public-Artwork Status | dieselbe Datei, `fetchJellyfinStatus` | Header-/Fehler-/Originprüfungen; tatsächliche Bilder/ThemeVideos separat geprüft |
| Gruppenmedien | `handlers/group_assets_jellyfin.go`, `fetchGroupAssetsJSON` | Direkte Roots/rekursive Kinder/Paging; öffentlicher Backendpfad vorher 502, Vorprüfung nachher 200 |
| Untertitel | `handlers/segment_render_subtitles.go`, `downloadJellyfinSubtitle` | Auth-/Fehler-/Dateilebenszyklus; tatsächlicher ASS-Download separat geprüft |
| Release-Stream | `handlers/episode_version_stream.go`, `StreamRelease` | Grant-/Varianten-/Fallback-/Range-Regressionsfälle, isolierte DB |
| Bildproxy | `handlers/episode_version_media_image.go`, `MediaImage` | Jellyfin-/Emby-Dispatch und Bildparameter; realer Logo-Proxy 200 |
| Videoproxy | `handlers/episode_version_media_video.go`, `MediaVideo` | Range-/Authgrenze; realer Backend-Rangeaufruf 206 |
| Geschützter Assetstream | `handlers/asset_stream_handler.go`, `StreamAsset` | Entitlement-/Zero-request-Denial-/Auth-Tests |
| FFmpeg | `services/segment_render_service.go` und `handlers/segment_render_worker.go` | Installiertes FFmpeg, Headerübergabe, Redirectsperre, redigierte Workerdiagnostik |

Nicht jeder geschützte Pfad wurde mit einer echten Browseranmeldung ausgeführt. Handler-/DB-/FFmpeg-Fixtures und reale Provideraufrufe werden ausdrücklich getrennt ausgewiesen. Der persistierte Artworkmanifest-Response beweist allein keinen neu ausgeführten Providerabruf. Der Logo-Proxy war bereits in der Baseline erfolgreich.

Fanart bleibt bei seiner eigenen Query-Authentifizierung. Emby behält seine vorhandenen Aufrufe; kein globales Ersetzen von `api_key`. Verbleibende produktive Treffer sind im Klassifikationsbeleg einzeln zugeordnet.

## API compatibility und GetItems

Laufender Server: **Jellyfin 12.0.0**. OpenAPI-SHA256: `cdef16618df86801230b5767ee42628fc5cf6c1c752aaf103ab652e05d25f672`. Alle elf tatsächlich verwendeten Pfade existieren im gelesenen Vertrag und sind dort nicht als veraltet markiert.

- `GET /Items/{itemId}` ist **nicht entfernt**. Der untersuchte Key-only-Aufruf liefert jedoch 400. Die Gruppenabfrage verwendet jetzt den vorhandenen exakten `/Items?Ids=...`-Abruf mit ID-Prüfung.
- Gruppen-Rootsuche benötigt explizit `Recursive=false`: im Live-Beispiel 1 direkter Root gegenüber 3 rekursiven Ergebnissen. Kinder bleiben rekursiv und werden vollständig paginiert; mehr als 200 Kinder sind durch eine kontrollierte Fixture geprüft.
- Ungültige `ItemFields` wie `ProductionYear`, `RunTimeTicks`, `ImageTags` und `BackdropImageTags` wurden entfernt. Dass Jellyfin sie bei der Stichprobe mit 200 ignoriert, wurde nicht mit gültiger Vertragsnutzung verwechselt.
- Buddy Complex: 13 eindeutige Episoden; `/Shows/.../Episodes` und passende `GetItems`-Abfrage liefern dieselben IDs. Seiten 5+5+3 entsprechen derselben vollständigen Reihenfolge und Gesamtzahl 13.
- Gruppen-CollectionFolder und physischer Ordner können verschiedene Parent-IDs zeigen. Die ursprüngliche Vorprüfung enthält deshalb eine bewusst erhaltene fehlgeschlagene Harnessannahme. Direkte Nachprüfung beider Ordner liefert dieselbe Itemmenge; der Verifier prüft Mengen/Paging statt einer unzutreffenden Parent-ID-Gleichheit. Belege: `group-parent-semantics.json`, `group-parent-followup.json`.

Die abschließende integrierte Live-Wiederholung steht noch aus; `live-preflight.json` ist keine finale Freigabe.

## MediaSource mapping

Vorher: Source-DTO enthielt nur die ID; Importwerte kamen von der Itemebene. Untertitel kombinierten Item-Streams mit der ersten Source. Eine Quelle war im gespeicherten Importvertrag nicht explizit repräsentiert.

Implementierte Auswahl: gespeicherte Source-ID → eindeutiger vollständiger gespeicherter Pfad → Konflikt. Ohne Bindung: eindeutiger eigener Itempfad → einzige Source → Konflikt. Arrayreihenfolge und Basename sind keine Identität. Item-ID bleibt Item-ID; Source-ID wird separat geführt.

Die bestehende JSONB-Spalte `stream_sources.metadata` enthält einen typisierten privaten `jellyfin_source`-Abschnitt. Bestehende Variantenspalten halten Dateiname, Container, Laufzeit und Codecs. Keine neue Tabelle/Migration. Die Transaktion sperrt die Quellenzeile, prüft Ownership und erhält fremde JSON-Schlüssel. Vollständig leere Streams löschen alte streamabhängige Werte; fehlende Streams dürfen nur bei derselben bereits vollständigen Bindung erhalten bleiben. Ein Quellenwechsel darf keine Werte der alten Datei übernehmen.

**11eyes:** 27 tatsächliche Items, 38 unterschiedliche verschachtelte Sources; 11 davon sind über `Items?Ids` keine eigenständigen Items. Alle 27 haben genau einen eigenen vollständigen Pfadtreffer. Episode 1 liefert drei echte Datei-Items; deren alternierende/nestende Quellen erzeugen keine fünf Importkandidaten. Der vollständige bereinigte 27-Item-Test beweist 27 Kandidaten, nach vorhandener Coverage eines Items 26. Diese Phase importiert nicht automatisch alle 38 Dateien.

Kein realer Bibliotheksrescan wurde ausgelöst. ID-Wechsel mit eindeutig unverändertem Pfad ist simuliert geprüft; beliebige Verschiebung, Austausch gleicher Pfade oder gleichzeitiger Verlust von ID und Pfad sind damit nicht allgemein gelöst.

## Container, Audio und Subtitles

Bewiesene Ursachen: Import decodierte/transportierte Container und Sprach-/Spurwerte nicht vollständig, leitete Container aus Dateiendungen ab und aktualisierte ihn beim Wiederimport nicht. Zusätzlich schrieb der generische Editor den technischen Dateinamen und Container aus dem menschlichen Titel. Öffentliche Untertitel konnten aus mehreren Varianten stammen.

Bereits umgesetzt: Import nutzt den ausgewählten Source-Container; echte DB-Fixtures beweisen auch `matroska` statt bloß der Dateiendung `.mkv`. Audio-Codec und Sprache stammen von demselben deterministisch ausgewählten Audioindex; Untertitel behalten Codec, Index, Sprache, Titel sowie Default-/Forced-Flags. Eine vorhandene Spur mit unbekannter Sprache bleibt erhalten und nullable. Unbenutzte Channels-/Layout-/Audio-DisplayTitle-Felder werden nicht vorsorglich persistiert.

Die bestätigte Produktentscheidung D-16 lautet: **Japanisch als Anzeigestandard nur für unbekanntes Audio**. Rohdaten/API bleiben nullable; bekannte Audiosprache hat Vorrang, Untertitel erhalten keinen japanischen Default. Die Umsetzung und Prüfung in der bestehenden öffentlichen Komponente folgt in Plan 08.

## Requests und SQL

| Vorgang | Vorher | Nach implementiertem Teil | Beweis |
|---|---|---|---|
| Episoden-Preview | 1 Collection-Request | weiterhin 1 | 27-Item-11eyes-Handlerfixture |
| Buddy-Quelldaten | 50.298 Bytes | 93.470 Bytes mit vollständigen verschachtelten Quellen | gemessene Vergleichspayload, kein allgemeines Bandbreitenversprechen |
| Import-Apply | keine Provider-Revalidierung | `ceil(N/100)` für bestätigte IDs | 0/1/100/101/201 Items → 0/1/1/2/3 Requests |
| Binding-Lesen bei Apply | keine neue Quellenprüfung | 0 bei leerer Auswahl, sonst 1 SQL-Abfrage | 201 Bindings in einer tatsächlich gezählten SQL-Abfrage |
| Ein Importgraph nach Wiederholung | bisherige Graphlogik | weiterhin je 1 kanonische Graphzeile | echte Transaktion/11 Tabellencounts/7 Rollbackfälle |
| Binäre Proxy-/Subtitleoperation | ein Upstreamaufruf | weiterhin ein erfolgreicher Upstreamaufruf | Request-Capture/Range-/Grant-Tests |

Revalidierung erhöht die Apply-Kosten bewusst um begrenzte Batches. Keine HTTP-Abfrage pro Source oder Spur. Die Zahl aller SQL-Statements der vollständigen Importtransaktion wird nicht als gemessen ausgegeben. Editor-/Playback-/Publicbudgets folgen nach deren Implementierung.

## Tests und verbleibende Schritte

Plans 01–05 sind in ihren Summaries belegt. Plan 03: 279 Test-/Untertest-Pässe ohne Skip; Plan 04: 85 Frontendprüfungen. Plan 05: echte isolierte PostgreSQL-Transaktionen und HTTP-Prüfungen, Build/Vet/Diffprüfung bestanden. Diese Teilmengen dürfen nicht zu einer angeblichen Gesamtzahl addiert werden, da sie sich überschneiden.

Die abschließenden fokussierten und breiten Gates, Produktionsbuild, Browserprüfung, Datenfingerprintvergleich und unabhängige Verifikation stehen noch aus. Bekannte Baseline: Frontend-Typecheck 2 Fehler; Lint 13 Fehler/328 Warnungen; Frontendtests 2714 bestanden/2 bestehende CSS-Guard-Fehler/3 todo; Build kompiliert, blockiert an bestehendem Admin-Pageexport; 50 bestehende breite Go-Fehler. Quelle: `BASELINE.md` und zugehörige Logs.

Keine Live-Imports, Backfills, Relinks, Library-Scans, DB-Resets oder Migrationen durchgeführt. Vorhandene fehlende Metadaten werden durch reine Leseaufrufe nicht repariert. Docker Air kann beim Synchronisieren geänderter Go-Dateien den laufenden Backendprozess neu bauen/starten; ein unveränderter Runtimezustand wird nicht behauptet. Menschliche UAT bleibt eine separate Abnahme.
