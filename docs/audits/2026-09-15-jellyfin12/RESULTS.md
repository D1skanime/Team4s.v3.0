# Jellyfin-12 Compatibility Result

**Technisch abgeschlossen und unabhängig verifiziert: 16/16 Ziele, keine offene Implementierungslücke.** Ausgangscommit `b3b07ff0`, Backend-Gate-Stand `64340e93`, frontendseitiger Reconciliation-Fix `3e410901`, kanonisches Repository `/home/d1sk/team4s`. Plans 161-01 bis 161-09 sind ausgeführt; der GSD-Verifikationsstatus bleibt für nicht ausgeführte menschliche Liveaktionen human_needed. Alle Pflichtfälle liefen tatsächlich; breite Altfehler bleiben ausdrücklich sichtbar. Dieser Bericht ersetzt keine menschliche UAT-Abnahme.

## Auth

Vorher: Derselbe konfigurierte Schlüssel lieferte bei Kontroll- und tatsächlich verwendeter Serienabfrage mit Query-Authentifizierung HTTP 401, mit modernem MediaBrowser-Header HTTP 200. Das belegt den Authfehler allein. [Discovery](discovery-live.json).

Nachher: Die gemeinsame Grenze in `backend/internal/jellyfin/request.go` baut schlüsselfreie URLs, ergänzt den Header nur für die konfigurierte Origin, verhindert unerlaubte Redirects und bereinigt Transportfehler. FFmpeg bekommt Header getrennt von der URL und `-max_redirects 0` vor `-i`; der ausführbare Zwei-Origin-Test rendert direkt erfolgreich und erreicht das Redirectziel kein einziges Mal. Fanart und Emby behalten ihre eigene Authentifizierung.

Die bestehende EpisodeVersion-Projektion entfernt außerdem Zugangsdaten aus gespeicherten Jellyfin-URLs. Get/List/Editor/Create/Update benutzen denselben Mapper; ungültige URLs werden als null ausgegeben. Query-Selector und andere fachliche Parameter bleiben erhalten. Reale isolierte DB-Tests beweisen unveränderte gespeicherte Zeilen. Die authentifizierte Dateienansicht wurde nach dem Fix ohne sichtbare Credential-Queryparameter geprüft. Der echte URL-Wert wird nicht dokumentiert. [Browserbeleg](browser-after.json), [abschließende Trefferklassifikation](api-key-occurrences-after.json).


Der öffentliche EpisodeVersion-GET entfernt die interne MediaSource-ID aus einer Antwortkopie; autorisierte Create-/Update-/Editordaten behalten sie. Der unabhängige Review fand diese bislang nur an ungebundenen Livezeilen unsichtbare Grenze. RED `6d6eaf59`, GREEN `718ebf57`: 4 Top-Level-Tests / 61 Passereignisse, keine Skips, echte gebundene DB-Fixture unverändert. Die passenden kanonischen/fokussierten Vertragsbeschreibungen sind angepasst; kanonische OpenAPI wurde mit bestehendem js-yaml geprüft. [Beleg](public-selector-regression.json).

## Jellyfin callers

**9 direkte Go-HTTP-Ausführungsstellen und 1 indirekter FFmpeg-Verbraucher.** Die vollständigen logischen Queryfamilien stehen in [161-CALLERS.md](../../../.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-CALLERS.md). Dessen Zeilenangaben und Vorher-Queries sind Discoverydaten.

| Ausführungsstelle | Datei/Funktion unter backend/internal | Nachweis |
|---|---|---|
| Admin-Metadaten | handlers/jellyfin_client.go, fetchJellyfinJSON; gemeinsamer Batchtransport | Header-/Fehler-/ID-Tests; reale Serien-, Episoden- und exakte Itemabfragen |
| Öffentliches Artwork JSON | handlers/anime_backdrops_client.go, fetchJellyfinJSON | Transport-/Artworktests; reale Serien- und ThemeVideos-GETs |
| Artworkstatus | dieselbe Datei, fetchJellyfinStatus | Origin-/Status-/Fehlertests; reale Primary-/Logo-GETs |
| Gruppenmedien | handlers/group_assets_jellyfin.go, fetchGroupAssetsJSON | Root-/Pagingtests; realer Gruppenbackendpfad jetzt 200 statt 502 |
| Untertitel | handlers/segment_render_subtitles.go, downloadJellyfinSubtitle | Source-/Index-/Auth-/Dateilebenszyklustests; realer ASS-GET 200 |
| Release-Stream | handlers/episode_version_stream.go, StreamRelease | Guarded DB, Grant, Ownership, Source-Selector, Range und Fehlerstatus |
| Bildproxy | handlers/episode_version_media_image.go, MediaImage | Jellyfin-/Emby-Dispatch; realer Logo-Proxy 200 |
| Videoproxy | handlers/episode_version_media_video.go, MediaVideo | Range-/Authtests; realer Backend-GET 206 |
| Geschützter Assetstream | handlers/asset_stream_handler.go, StreamAsset | Entitlement, kein Upstreamrequest bei Verweigerung, Headerauth |
| FFmpeg | services/segment_render_service.go; handlers/segment_render_worker.go | Installiertes FFmpeg, Redirectsperre, Headerübergabe, Source-/Subtitle-Kohärenz und redigierte Fehler |

Geschützte Release-/Assetstream- und Renderpfade sind durch reale DB-/Handler-/FFmpeg-Fixtures belegt; kein Live-Render oder Live-Grant wird behauptet. Das öffentliche Artworkmanifest war persistiert und beweist allein keinen frischen Providerabruf. Der Logo-Proxy war schon in der Baseline erfolgreich.

## API compatibility

Laufender Server: **Jellyfin 12.0.0**. SHA256 der gelesenen OpenAPI: `cdef16618df86801230b5767ee42628fc5cf6c1c752aaf103ab652e05d25f672`. Alle elf inventarisierten Pfade sind vorhanden und nicht als deprecated markiert: System/Info, Items, Itemdetail, Shows/Episodes, Library/MediaFolders, ThemeVideos, beide Bildpfade, Videostream und beide Untertitelpfade. [Vertragsinventar](openapi-used-endpoints.json), [Live-Abschluss](live-after.json).

`GET /Items/{itemId}` wurde nicht entfernt; der untersuchte Key-only-Aufruf liefert 400. Gruppendetails verwenden nun `/Items?Ids=...` mit exakter Identitätsprüfung. Nicht gültige ItemFields wie ProductionYear, RunTimeTicks, ImageTags und BackdropImageTags wurden aus den betroffenen Requests entfernt; normalerweise gelieferte DTO-Felder bleiben lesbar. Stichproben mit HTTP 200 trotz ignorierter ungültiger Parameter wurden nicht als Vertragsbeweis gewertet.

## GetItems

- Buddy Complex: 13 eindeutige Episoden. Shows/Episodes, ParentId/Recursive-GetItems und exakter ID-Batch stimmen überein; Seiten 5+5+3 ergeben dieselbe Reihenfolge und überall TotalRecordCount 13.
- Gruppen: explizit nichtrekursive Suche liefert 1 Root, rekursive Suche 3 Ergebnisse. Kinder behalten Recursive=true; 201 Kinder werden in der Fixture vollständig über zwei Seiten gelesen. Doppelte/fehlende IDs, veränderte Totals und unerwartet leere Seiten scheitern.
- CollectionFolder-ID und physische Folder-ParentId können abweichen. Die erste falsche Harnessannahme bleibt als fehlgeschlagener Vorlauf erhalten; der korrigierte Verifier prüft vollständige Mengen. [Parent-Semantik](group-parent-followup.json).
- Finaler Read-only-Verifier: **26 begrenzte GETs, keine Fehler**. Keine neuen Discoveryaufrufe pro Source, kein Import, Relink oder Rescan. Live-Beleg bei `a4be0224`; bis Gate-Stand `64340e93` änderten sich nur Tests/Dokumentation.

## MediaSource mapping

Vorher: Ein unvollständiges Source-DTO, itemweite Metadaten und implizite erste Source konnten technische Werte verschiedener Dateien vermischen. Die Importauswahl transportierte keinen geprüften Source-Selector.

Nachher: Providerantwort → typisierte Source-DTOs → `resolveJellyfinMediaSource` → geprüfte Item-/Source-ID im Builder → serverseitige Batch-Revalidierung → vorhandene atomare Releasegraph-Transaktion → `stream_sources.metadata.jellyfin_source` und bestehende Variantenspalten → gemeinsame Auswahl für Playback und öffentliche technische Fakten.

Gespeicherte Source-ID hat Vorrang; nur ein eindeutiger vollständiger gespeicherter Pfad darf einen ID-Wechsel auffangen. Ungebunden gilt eigener vollständiger Itempfad, danach einzige Source; sonst Konflikt. Arrayreihenfolge/Basename sind keine Identität. Item-ID und Source-ID bleiben getrennt. Anime → Source → Variante ist die Sperrreihenfolge; fremde Ownership und widersprüchliche gemeinsame Bindungen führen zum Rollback. Keine neue Tabelle oder Migration.

**11eyes:** 27 tatsächliche Items, 38 unterschiedliche verschachtelte Sources, 11 Sources ohne eigenständiges Item. Alle 27 haben einen eindeutigen eigenen Pfadtreffer. Episode 1 ergibt drei tatsächliche Importkandidaten; der Gesamtpreview 27, nach Coverage eines Items 26. Das ist kein automatischer Import aller 38 Dateien. [Vollständigkeit](discovery-11eyes-completeness.json).

Zwei reale Range-GETs auf dasselbe Episode-1-Item beweisen die Wirkung des Selectors: eigene MKV-Source und alternative MP4-Source liefern jeweils 206 und unterschiedliche 64-Byte-Präfixe; Gesamtgrößen 2.423.118.467 bzw. 257.305.877 Bytes. Kein Clip wurde live gerendert. [Source-Streambeleg](11eyes-source-streams.json), Wiederholung in [live-after.json](live-after.json).

## Container

Ursachen: Import leitete Container aus der Dateiendung ab und aktualisierte ihn beim Wiederimport nicht zuverlässig. Der generische Editor leitete technischen Dateinamen/Container zusätzlich aus dem menschlichen Titel ab.

Fix: Source-Container und technischer Dateiname werden separat transportiert und geschrieben. Ein menschlicher Titel ändert beides nicht. Wiederimport und autorisierter vollständiger Relink setzen kohärente Werte atomar. Die DB-Fixture beweist ausdrücklich `matroska` bei einer `.mkv`-Datei; die Dateiendung ersetzt den Providerwert nicht.

## Audio / Subtitles

Audio-Codec und nullable Sprache stammen vom selben ausgewählten Audioindex. Subtitle-Tracks behalten eigenen Index, Codec, Sprache, Titel und Default-/Forced-Flags. Consumerlose Kanal-/Layout-/Audio-DisplayTitle-Daten werden nicht vorsorglich persistiert. Itemweite und fremde Source-Tracks werden nicht ausgeliehen.

Vollständig leere Streams leeren veraltete Felder; fehlende Streams dürfen nur bei derselben vollständigen Bindung alte vollständige Tracks behalten. Die öffentliche Projektion liest Binding und technische Skalare in **einem SQL-Snapshot**. Ein vorhandener Snapshot ist auch bei leeren oder unbekannten Werten maßgeblich; ohne Snapshot bleibt der Rückgriff auf die ausgewählte Variante begrenzt.

D-16 ist umgesetzt: Nur unbekannte Audio-Sprache zeigt im bestehenden Hero **Japanisch**. Bekannte Sprache gewinnt; Rohdaten bleiben null. Untertitel bekommen keinen japanischen Default. Video, Subtitle, editorseitige Laufzeit und FFmpeg folgen derselben Source. Source-Identität entsteht vor dem Cachelookup; der Worker vergleicht vor Dateiausgabe/FFmpeg den gespeicherten Fingerprint und verwirft einen A→B-Drift.

## Fixzuordnung

| Datei/Funktion | Ursache → Änderung | Testbeweis |
|---|---|---|
| jellyfin/request.go: BuildURL, NewRequest, Do | Queryauth/Redirect-/Fehlerleck → gemeinsame originbegrenzte Headergrenze | Request-/Redirect-/Safe-error-Tests |
| handlers/jellyfin_client_series.go; group_assets_jellyfin.go | Falsche Fallback-ID, ungültige Fields, Rekursion/200er-Abbruch → exakte IDs und vollständiges Paging | Jellyfin12 Metadata-, GroupAssets-, Batchtests; Live 13/27 |
| handlers/jellyfin_media_source.go: resolveJellyfinMediaSource | Implizite erste Source → deterministische Bindung und zusammengehörige Tracks | A/B, Reihenfolge, Pfad-Recovery, leer/fehlend, alle 27 Items |
| handlers/jellyfin_source_batch.go: fetchJellyfinSourceBatch | Ungeprüfte/partielle Itemmenge → exakte Batches bis100 | 0/1/100/101/201, fehlende/fremde/doppelte IDs |
| models/episode_import.go; ImportBuilder/Mapping; shared/contracts | Geprüfte Source ging verloren → Selector, private Hydration, passende Verträge | Go-Vertragsprüfung, 43 Mappingtests |
| handlers/admin_episode_import.go; episode_version_source_hydration.go | Gepostete/fremde/stale Source → gemeinsame resolveReviewedJellyfinSource-Prüfung vor Mutation | HTTP-/Guarded-DB-Rejection und unveränderte Graphen |
| repository/jellyfin_source_repository.go: upsertStreamSourceSnapshot | Unklare Bindung und Überschreiben fremder JSON-Schlüssel → gesperrter Namespace-Upsert | SourceRepository-Konflikt/Retention/Parallelität, eine Batchquery |
| repository/episode_import_repository_release_helpers.go: upsertImportReleaseGraph, createReleaseVariant | Container-/Trackverlust beim Import → vollständige technische Create/Update-Projektion | echter Repeat-Import, 11 Tabellen, Rollback/Complete-empty |
| repository/episode_version_repository_write_helpers.go: applyEpisodeVersionVariantMetadata, applyEpisodeVersionSourceTechnicalFields | Titel verändert Dateifakten → Metadatenpatch erhält, geprüfter Relink ersetzt | EpisodeVersionSource-DB-Fälle, Date-/Groupregression |
| Editor useEpisodeVersionEditor; scan | Scan/Saves konnten implizit binden → explizites geprüftes Paar; unveränderte Selector entfallen | 15 Hooktests, 9 Scan-Szenarien, null Providercalls für Metadatensave |
| repository/release_variant_source_repository.go: selectedReleaseVariantSourceSQL | Getrennte Varianten-/Scalarlesungen → ein eigener Variant/Source-Snapshot | PublicReleaseTechnicalSource und Playback-Integration mit201 Tracks |
| handlers/episode_version_stream.go; segment_render_subtitles.go; editor_helpers | Video/Subtitle/Laufzeit konnten A/B mischen → gemeinsames exaktes Item/Source-Ergebnis | ReleaseStreamIdentity, SegmentSubtitle, EpisodeVersionSourceDuration |
| handlers/segment_stream.go; segment_render_refresh.go; segment_render_worker.go | CacheA konnteB bedienen/Job konnte driften → Identität vor Lookup und Fingerprint vor FFmpeg | ActualQueue/CachedIsolation, UnboundBeforeCacheLookup, WorkerRejectsSourceDrift |
| repository/release_detail_public_repository_helpers.go: loadReleaseTechnical; ReleaseDetailHero | Variantenübergreifende Untertitel/fehlende Anzeigeregel → selbe Source, nur Audiofallback | reale DB1 Query/201 Tracks, 17 Herotests |
| jellyfin/request.go: SanitizeURL; scanReleaseVariantAsEpisodeVersion | Gespeicherte Legacy-URL in Editor sichtbar → zentrale Jellyfin-only Ausgabe bereinigt | 11 Top-Level/26 Passereignisse, echte Create/Update/List/Get-DB-Fälle; Browser |
| Editor useEpisodeVersionEditor: handleSave | Alte Formwerte blieben nach serverseitigem Relink stehen → Antwort über buildInitialFormState übernehmen, nur seit Submit unveränderte Felder abgleichen; neue Datei-/Gruppenentwürfe erhalten | RED e4548ae4: 3 Fehler; GREEN 3e410901: 20 Hook- und 41 Authgrenzentests bestanden |
| handlers/episode_version_reads.go: öffentlicher Get-Pfad; vorhandene Vertragsdefinitionen | Internen Source-Selector öffentlich serialisiert → nur öffentliche Antwortkopie ohne MediaSourceID, berechtigte Editordaten unverändert | RED 6d6eaf59 / GREEN 718ebf57; 4 Top-Level-Tests, 61 Passereignisse ohne Skip |
| Fünf Repositorytestdateien; v12-projection-contract.test.ts | Unvollständige Fixtures/Guards gegen alte Inline-SQL und unbeschränkter Vertrags-Split → tatsächliche Schema-/Seamgrenzen | 37a9fed0:7Tests/23Events;64340e93:6 Frontendtests; finale Breitsuite |

Pfade in der Tabelle sind unter `backend/internal`, `frontend/src` beziehungsweise `shared/contracts` zu lesen. Exakte Dateien pro Commit: [88 Discovery-/Implementierungs-/Test-/Dokumentationscommits bis zum Gate-Stand](execution-commits.json). Planbezogene RED/GREEN-Belege und alle Einzelcommits stehen zusätzlich in den Summaries 01–08. Der abschließende Dokumentationscommit enthält die Nachweise, den Planabschluss und den unabhängig verfassten Verifikationsbericht.

## Requests und SQL

| Vorgang | Vorher | Nachher / gemessener Rahmen |
|---|---|---|
| Episodenpreview | 1 Collection-Request | weiterhin 1;27 echte 11eyes-Items |
| Buddy-Quelldaten | 50.298 Bytes | 93.470 Bytes in der vergleichbaren Discoveryprojektion; finaler zusätzlicher Fields-/Totals-Request94.068 Bytes |
| Import-Apply | 0 Provider-Revalidierung | ceil(N/100):0/1/100/101/201 Items →0/1/1/2/3Requests |
| Bindinglookup Apply | keine neue Quellenprüfung | 0 bei leerer Auswahl, sonst 1 SQL;201 Rows gezählt |
| Normales/gleich gebundenes Editorsave | vorhandener Schreibpfad | 0 Providerrequests; expliziter Relink1 exakter Itemrequest |
| Editor GetByID / Scan | vorhandene Reads | GetByID1 feste Jellyfin-Bindingquery; Scan1Batch, im Fixture1 Kontext+1 Collectionrequest |
| Releasevideo | 1 Video-GET | gebunden 1 Video/0 Metadata; ungebunden 1 Metadata+1 Video |
| Queue-/Grantvorbereitung | vorhandener Cachepfad | gebunden 0 Metadata; ungebunden 1 Metadata vor Cachelookup |
| Worker | getrennte Source-/Subtitle-Annahmen | 1 Metadata und höchstens1 Subtitle-GET; identischer Source-Selector für FFmpeg |
| Release-/Theme-/Public-Sourceprojektion | teilweise getrennte Auswahl | je1 SQL/1Row bei0,1 und 201 Subtitletracks;0 Providerrequests |
| URL-Ausgabebereinigung | keine Bereinigung | 0 zusätzliche HTTP-/SQL-Operationen |

Die Apply-Revalidierung erhöht den Aufwand bewusst um begrenzte Batches. Keine HTTP-/SQL-Abfrage je Source/Track. Die Gesamtzahl aller Statements einer Importtransaktion wird nicht als vollständig gemessen ausgegeben. Queue und späterer Worker sind getrennte Ausführungen und haben bei ungebundener Quelle jeweils ihren eigenen einzelnen Metadatenread.

## Tests

Die breiten Backendgates liefen am unveränderten `64340e93`, die abschließenden Frontendgates nach dem Hookfix an `3e410901`. Die öffentliche Ausgabegrenze wurde separat in `718ebf57` geprüft. Diese Revisionen werden nicht zu einem vorgetäuschten späteren Gesamtlauf vermischt. PostgreSQL-Zugangsdaten wurden nur im Speicher gelesen und als URL-escaped DSN für `team4s_phase117_test_161` über die Host-Subprozessumgebung an Docker gereicht. Erforderliche DB-Fälle nutzten echte eindeutige, geschützte Schemas.

| Gate | Ergebnis |
|---|---|
| Backend fokussiert: alle Top-Level-Tests aus berührten Go-Testdateien,6 Pakete | **277 ausgeführt,554 Passereignisse,0 Fehler/Skips/nicht ausgeführte Tests** |
| Backend breit: handlers/repository/services | 2.015 Passereignisse; exakt 50 ursprüngliche Fehlerüberschriften,0 neu / 0 entfallen;277 bestehende Skips |
| Backend build ./... / vet ./... | bestanden |
| Frontend betroffene Testdateien + zentrale Authgrenzen | **127 bestanden**,0 Fehler;43 Mapping + 20 Hook + 17 Hero + 6 Vertrag + 32 Refresh + 9 Tokengrenze |
| Frontend gesamte Suite | 2.748 bestanden; dieselben 2CSS-Guardfehler;3 bestehendeTODOs |
| Frontend Typecheck | dieselben 2TS2344-Fehler in generierten Next-Adminpagetypen |
| ESLint fokussiert / vollständig | 0 Fehler/2 bestehendeWarnungen; vollständig unverändert13 Fehler/328Warnungen, identische normalisierte Diagnostik |
| Isolierter Produktionsbuild | kompiliert; derselbe bestehende ungültige Pageexport formatEditLoadError blockiert TypeScript |
| Öffentliche Selectorgrenze, separate Handler-/DB-Prüfung | 4 Top-Level-Tests / 61 Passereignisse, keine Fehler/Skips; Handler-Vet bestanden |
| Python-Verifiergrenzen | 4/4 bestanden: Requestbudget, Header/Redirect/Fehler, Outputpfad, Secretserialisierung |
| git diff --check | bestanden |

[Finale Backendgates](backend-final-checks.json), [Frontendgates](frontend-final-checks.json), [exakter Baselinevergleich](regression-comparison.json). Zähler überlappender Plan-Gates werden nicht addiert. Die 277 breiten Skips betreffen andere Fixturekonfigurationen; sie ersetzen keine Pflichtprüfung.

Erster Abschlussversuch bleibt in [backend-final-checks-attempt1.json](backend-final-checks-attempt1.json) und [frontend-final-checks-attempt1.json](frontend-final-checks-attempt1.json) erhalten. Sieben neue Backend-Testfehler wurden in `37a9fed0` geschlossen; der frontendseitige Vertragsgrenzentest in `64340e93`. Der Buildharness setzt jetzt ausdrücklich NODE_ENV=production. Die bereinigten Rohlogs bleiben lokal und gitignored wie die Baseline; JSON hält Befehle, Diagnostik, Testnamen und Resultate dauerhaft fest.

[Runtimeabgleich am Stand 64340e93](runtime-source-after.json): **818/818** Backend-Go-/Moduldateien stimmten mit dem damals aktiven Container überein. Der spätere Kapitel-Quick verändert den aktuellen Laufzeitstand separat. [Datenvergleich](application-rows-after.json): sechs geprüfte Import-/Quelltabellen haben jeweils dieselben 13 Zeilen und identische Inhaltsfingerprints wie vorher. Das ist ein begrenzter Tabellenbeweis, kein Hash der gesamten Datenbank.

## Offene Punkte


- Bestehende Appzeilen wurden nicht nachimportiert, relinkt oder rückwirkend ergänzt. Aktuelle Releases40/48 zeigen Container mkv, nullable Audiosprache und keine gespeicherten Untertitel. Japanisch im Browser ist der Anzeigestandard. Die damals fehlende Containeranzeige an Release48 ist aktuell nicht reproduzierbar; der Writerfehler wurde unabhängig in DB-Fixtures nachgewiesen.
- Der alte Screenshot und aktuelle IDs sind nicht gleichzusetzen: aktuelles Release48 ist Episode12; Nice Coupling liegt jetzt bei Editorvariante28/Episode2. Der Provider liefert dort einen deutschen ASS-Track, für Release48 einen ASS-Track ohne Sprache; beide gespeicherten Snapshots fehlen. [Aktuelle Fakten](current-release-metadata.json).
- Dateigröße im Editor bleibt n/a, obwohl die gewählte Source Size liefert. Dateigröße und gewünschte Kapitel-/Segment-UX sind ein **separater Folgeauftrag**, kein verdeckt mitgelieferter Phase161-Fix. [Recherche](../../../.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-CHAPTER-FOLLOWUP-RESEARCH.md).
- Kein echter Rescan, Medienumzug oder Liveimport wurde ausgelöst. Eindeutige Pfad-Recovery beweist keine allgemeine Inhaltsidentität bei Dateiaustausch am selben Pfad.
- Der erste kalte Subtitleabruf lief in einen Timeout; Wiederholung und finaler ASS-GET bestanden. Der erste Fehlschlag bleibt in [discovery-media-requests.json](discovery-media-requests.json). Keine allgemeine Latenzgarantie.
- Der Worker prüft Source-Drift. Den bereits vorher fehlenden Vergleich von queued Cachekey/Zeitfenster/Profil mit später veränderten Offsets löst diese Phase nicht.
- Race-Instrumentierung ist im Backendimage ohne gcc/CGO nicht verfügbar; normale Parallelitäts-/Locktests bestehen. Fokussierte Vertragsfragmente und kanonische OpenAPI werden geparst; die alten fokussierten Dokument-DSLs enthalten unveränderte Gesamt-YAML-Parserprobleme.
- Air kann beim Kopieren von Produktions-Go-Dateien neu bauen/starten; kein Compose-Recreate. Kein Push, keine Migration, kein Reset/Backfill, keine Änderung von Medienoriginalen oder Providerbibliotheken.
- Authentifizierter Browserpfad und öffentliche Details wurden lesend geprüft. Erzwungener Refresh-only-Browserzustand wurde nicht hergestellt; die zentralen automatisierten Sessiontests decken ihn ab. Die bereits erfolgten menschlichen Abnahmen von 156/157 bleiben gültig; die offenen Anime-Abnahmen 158/159 bleiben unverändert. Phase 160 wurde nicht ausgeführt. [Unabhängige Verifikation: 16/16, technical_status passed, gaps leer](../../../.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-VERIFICATION.md); die dortigen menschlichen Liveprüfungen bleiben offen.
