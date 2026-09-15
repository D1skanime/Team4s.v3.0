---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
verified: 2026-09-15
status: human_needed
score: 16/16 observable truths verified
technical_status: passed
baseline_commit: b3b07ff0
application_commit: 718ebf5757693876ec6093f715328298cb6990a9
backend_gate_commit: 64340e93
frontend_gate_commit: 3e410901
verification_mode: independent_goal_backward
verification_overrides: 0
gaps: []
human_verification:
  - test: Autorisierten echten Import oder Relink mit anschließendem Public-/Playbackvergleich durchführen.
    why_human: Live-Schreibaktionen wurden nicht ausgeführt; bestehende Datensätze erhielten keinen Snapshot-Backfill.
  - test: Rescan-Stabilität sowie kalte Untertitel- und Segmentwiedergabe im gewünschten echten Release prüfen.
    why_human: Fixtures belegen die technischen Grenzen, ersetzen aber keinen tatsächlich ausgeführten Live-Rescan oder visuellen und akustischen Wiedergabevergleich.
---

# Phase 161 — Unabhängige Verifikation

**Technisch verifiziert: 16/16 beobachtbare Ziele belegt, keine offene Implementierungslücke.** Die unabhängige Prüfung fand zwei tatsächliche Fehler; beide wurden mit RED/GREEN-Regressionsnachweisen korrigiert und anschließend unabhängig im Code nachgeprüft. Die vollständigen Gates zeigen ausschließlich dokumentierte globale Baselinefehler. Der GSD-Status bleibt `human_needed`, weil echte Live-Import-/Relink-/Rescan- und Wiedergabeprüfungen nicht durchgeführt wurden; dies ist kein Human-UAT-Sign-off.

## Auftrag, Stand und Methode

Prüfung ausschließlich im kanonischen `/home/d1sk/team4s` über `ssh team4s-linux`. Der Verifier hat keine Phase-161-Anwendungsänderung implementiert. Er besitzt nur dieses Dokument; keine Anwendungscode-, STATE-, Datenbank- oder Commitänderung durch die Verifikation.

Referenzen: `AGENTS.md`, `AI-HANDOFF.md`, GSD-Verifier einschließlich Verification-Overrides/Gates, aktiver Phase-161-Abschnitt von ROADMAP/STATE und REQUIREMENTS, vollständiger USER-REQUEST/CONTEXT/SOURCE-AUDIT/CALLERS sowie Plans und Summaries 01–09. Summary-Aussagen wurden gegen tatsächliche Implementierung, Testkörper, rohe Testlogs und gespeicherte Live-Belege geprüft. Plan-09-Summary, abschließender RESULTS-Bericht und VALIDATION wurden am 15.09.2026 nach den beiden Reviewkorrekturen abgeglichen; ihre technischen Gatezahlen und dokumentierten Grenzen stimmen mit dieser unabhängigen Prüfung überein.

Ausgangscommit: `b3b07ff0`. Implementierungsstand vor der unabhängigen Prüfung: `a4be0224`. Die anschließenden Commits `37a9fed0` und `64340e93` korrigierten tatsächlich neu entstandene Test-/Vertragsassertionsfehler; sie werden ausdrücklich **nicht** als alte Baseline klassifiziert. Die Backend-Abschlussgates liefen auf `64340e93cd30ab19295da74fa32d62fc52af1a45`. Nach der unabhängigen Prüfung schloss `3e410901` die Formularlücke; auf diesem eingefrorenen Stand liefen die vollständigen Frontendgates erneut. `718ebf57` schloss danach die öffentliche DTO-Grenze mit gezielter Backend-/Vertragsabnahme. Das ist eine dokumentierte Abfolge von Gates, kein behaupteter neuer Gesamtlauf auf einem einzigen späteren Working Tree. Das erste fehlerhafte Ergebnis bleibt als `*-attempt1.*` nachvollziehbar erhalten.

Es wurden keine Live-Imports, Relinks, Speichervorgänge, Library-Rescans, Segmentrenders oder Cachebereinigungen ausgelöst. Vorhandene Live-Belege des Koordinators wurden geprüft; kein fremder Human-UAT-Sign-off wird übernommen. Die parallel begonnene Kapitel-/Dateigrößen-Quick-Arbeit gehört nicht zu dieser Phase. Deren Änderungen im gemeinsamen Working Tree wurden nicht als Phase-161-Implementierung bewertet; insbesondere ist `d8556893` ein separater Quick-Testcommit.

## Nachweisbare Ziele

| # | Beobachtbare Wahrheit aus ROADMAP, Nutzerauftrag und Plans | Ergebnis | Unabhängiger Nachweis |
|---|---|---|---|
| 1 | Alle bestehenden Jellyfin-Aufrufstellen und verwendeten API-Familien sind inventarisiert. | VERIFIED | CALLERS, tatsächliche HTTP-Aufrufstellen und klassifizierte `api_key`-Funde; neun direkte Stellen plus FFmpeg. |
| 2 | Jellyfin-Zugriffe verwenden moderne Headerauthentifizierung und keine neu erzeugten Credential-URLs. | VERIFIED | `internal/jellyfin/request.go`; alle vier JSON/Status- und fünf Binäraufrufstellen verwenden dieselbe Grenze. Gespeicherte Jellyfin-URLs werden im gemeinsamen DTO-Mapper bereinigt. |
| 3 | Credentials verlassen bei Redirects nicht den konfigurierten Ursprung; Rendererdiagnostik bleibt bereinigt. | VERIFIED | Normalisierter Scheme/Host/Port-Vergleich, kopierter HTTP-Client, Redirectkontrolle, Fehler-/Body-Redaktion; echte FFmpeg-Zwei-Ursprungs-Fixture. |
| 4 | Tatsächlich verwendete GetItems-/Episodenabfragen haben bewiesene Filter-, ID- und Vollständigkeitssemantik. | VERIFIED | Explizites Recursive false/true, validierte IDs/Totals, Pagingabbruch bei Inkonsistenz; Live Buddy 13 IDs mit 5+5+3, gleiche Reihenfolge/Total13. |
| 5 | MediaSource-Auswahl hängt nicht von Arrayreihenfolge oder einem fremden Top-Level-Stream ab. | VERIFIED | `resolveJellyfinMediaSource`: gespeicherte ID, eindeutiger voller Pfad, ansonsten expliziter Konflikt; neue Bindung eigener Pfad/einzige Quelle. Gegensätzliche A/B-Fixtures, Reorder und alle27 realen 11eyes-Items. |
| 6 | Audio/Untertitel stammen aus derselben Quelle, mit echten Indizes/Codecs/Flags; Unbekannt bleibt roh null. | VERIFIED | Typisierter Snapshot; deterministische Audioauswahl; x/text Parse+Raw; ausgelassene gegenüber explizit leeren Streams getrennt. D16 ausschließlich Audioanzeige. |
| 7 | API-, Runtime- und TypeScript-Vertrag transportieren geprüfte Item-/Source-Paare ohne browserseitige technische Autorität und nur im vorgesehenen öffentlichen/privaten Umfang. | VERIFIED | V161-02 durch 718ebf57 geschlossen: öffentliche Kopie ohne Source-ID; OpenAPI schließt das Feld im öffentlichen Response aus. Autorisierte DTOs bleiben erhalten. Models/TS, JSON-unzugängliche Hydration, `hasReviewedMediaSource` und Apply-Serialisierung sind belegt. |
| 8 | Apply prüft alle bestätigten Quellen erneut und lehnt falsche Item-/Anime-/Ordner-/Source-Zuordnung vor der Mutation ab. | VERIFIED | `rehydrateEpisodeImportSources` und gemeinsames `resolveReviewedJellyfinSource`; genaue Batch-IDs; gepostete technische Felder werden ersetzt; Fehlerfixtures mit0 Apply-Aufrufen. |
| 9 | Container, Dateiname, Tracks und bestehender Releasegraph werden atomar und idempotent geschrieben. | VERIFIED | Gemeinsames gesperrtes JSONB-Namespace-Upsert; Create/Repeat-Zweige, Graphzählung und vollständiger Rollback in isoliertem PostgreSQL. Keine Migration/neue Tabelle. |
| 10 | Gewöhnliche Metadatenänderungen löschen Dateiname/Container/Bindung nicht; Quellenwechsel bleiben autorisiert. | VERIFIED | `applyEpisodeVersionVariantMetadata` schreibt diese Felder nicht mehr; Hydration nur bei tatsächlicher Bindungsänderung, Nichtadmins dürfen keine Source-Selektoren senden. Backendfixtures sichern null/empty/incomplete/ownership. |
| 11 | Ein bestätigter Relink bleibt über einen anschließenden normalen Formularsave konsistent. | VERIFIED | V161-01 geschlossen durch 3e410901: bestätigte Antwort als Baseline, unveränderte Felder synchronisiert, spätere Nutzereingaben/Dateiauswahl erhalten. A10→B20/2160p und zweiter Full-/Metadata-Save getestet. |
| 12 | Öffentliche technische Fakten und Wiedergabe verwenden denselben ausgewählten Variant-/Source-Datensatz. | VERIFIED | Gemeinsames `selectedReleaseVariantSourceSQL`; skalare Werte und Snapshot in einer SQL-Anweisung, keine zweite ungesperrte Metadatenabfrage. Public-Tracks kommen ausschließlich aus diesem Snapshot. |
| 13 | Video, Untertitel und Segmentcache verwenden dieselbe Item-/Source-Identität; Source-Drift erreicht FFmpeg nicht. | VERIFIED | `buildReleaseSourceStreamURL`, `prepareSegmentSource`, Quelle vor Cachelookup, SourceFingerprint vor Datei-/FFmpeg-Verarbeitung; konkrete Request-/Worker-/DB-Fixtures. |
| 14 | Die neuen Source-/Track-Lesewege erzeugen kein N+1. | VERIFIED | Batchgröße100 und ein Binding-SELECT; Public/Release/Theme je1 SQL-Anweisung/1 Zeile auch bei201 Tracks; konkrete Tracezähler. Bereits bestehende Graphschreibkosten sind nicht als konstante Gesamtzahl behauptet. |
| 15 | Reale Jellyfin12-Kompatibilität und 11eyes-Bestandsgrenzen sind ehrlich belegt. | VERIFIED | `live-after.json`:26 begrenzte GETs, failures=[];27 Items/38 Source-IDs/11 Nicht-Item-Alternativen. Unterschiedliche64-Byte-MKV-/MP4-Präfixe unter demselben Item. Kein Vollimport-/Rescanversprechen. |
| 16 | Tests wurden wirklich ausgeführt, Baselinefehler bleiben getrennt; keine verdeckte Daten-/Provider-/Scopeänderung. | VERIFIED | Rohlogs277 Top-Level-/554 Passereignisse0Skip; breite Baselinevergleiche; sechs unveränderte Anwendungstabellen,818 passende Backenddateien, keine Migration/Dependency-/anderen Providerdateien im Phasendiff. |

## V161-02 — interner Source-Selektor im öffentlichen Einzelversions-GET

**Schwere:** ursprünglicher BLOCKER für die ausdrücklich geplante öffentliche DTO-Grenze (T161-04-3). **Status:** GESCHLOSSEN nach unabhängiger Nachprüfung von `718ebf57`, Vertrag und Guarded-Endpointtest. Die Source-ID ist kein API-Key; der Befund war keine Behauptung einer Credential-Offenlegung.

Ursprünglicher Zustand: `backend/cmd/server/main.go:397` registriert GET `/episode-versions/:versionId` ohne Authmiddleware. `episode_version_reads.go:GetEpisodeVersionByID` serialisiert das Ergebnis von `EpisodeVersionRepository.GetByID` direkt. Seit Phase161 lädt dieser Reader den Source-Snapshot und setzt `EpisodeVersion.MediaSourceID`; das Feld trägt `json:"media_source_id,omitempty"`. Ein gebundener Datensatz gibt deshalb die neu eingeführte interne Source-ID öffentlich aus. Die bisherigen Live-Datensätze haben keinen Snapshot und konnten diesen Fall nicht zeigen.

Plan 04 T161-04-3 verbietet neue Source-IDs in öffentlichen Metadaten; Editor-/Scan-/Relink-Payloads benötigen den Selektor im autorisierten Kontext.

**Schließungsnachweis:** RED `6d6eaf59`, GREEN `718ebf57`. Der öffentliche Handler kopiert das geladene DTO, setzt ausschließlich `MediaSourceID = nil` und serialisiert die Kopie. Gemeinsamer Mapper, Repository, gespeicherte Bindung und autorisierte Editorantwort bleiben erhalten. Der öffentliche OpenAPI-Response schließt `media_source_id` durch `not: {required: [media_source_id]}` aus; der fokussierte Vertrag dokumentiert dasselbe. Keine neue Authinfrastruktur, Route, SQL-Abfrage oder Datenmigration.

`TestEpisodeVersionPublicHidesPrivateSourceSelector` benutzt die echte isolierte Hydration-Fixture: öffentliche Antwort ohne Source-ID/Quellenpfad, reale IDs erhalten, gespeicherter Source-Snapshot und vollständiger Fixturezustand unverändert. Autorisierte Create-/Update-Hydrationtests erhalten die ausgewählte Source-ID. `public-selector-regression.json` belegt vier ausgeführte Top-Leveltests mit 61 Passereignissen, null Fehlern/Skips sowie erfolgreiches Handler-vet. Der fokussierte Test wurde im gemeinsamen Container ausgeführt; dort konnten bereits getrennte Kapitel-Quick-Erweiterungen vorliegen. Die geprüften öffentlichen Handler-/Ownership-/Auth-Testkörper und der bewertete Phase-161-Commit sind ausdrücklich ausgewiesen.

## V161-01 — bestätigte technische Werte werden nach Relink im Formular nicht übernommen

**Schwere:** ursprünglicher BLOCKER für das Source-Konsistenzziel. **Status:** GESCHLOSSEN nach unabhängiger Code-Nachprüfung von `3e410901`, gezieltem GREEN-Nachweis und vollständigem Frontendnachlauf.

Betroffener Code: `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`, `applyFile` und Erfolgszweig von `handleSave` (Stand 64340e93). `applyFile` aktualisiert Item/Quelle, Qualität und URL, behält aber `durationSeconds`. Der Backend-Relink ersetzt die Laufzeit korrekt mit der tatsächlich ausgewählten Source. `handleSave` übernimmt anschließend `response.data` nur in `contextData`; die Baseline entsteht aus dem alten Formular. Jede weitere Speicherung sendet `duration_seconds` unabhängig davon, ob der Nutzer dieses Feld bearbeitet hat.

Konkreter Ablauf: A hat 10 Sekunden. B hat 20 Sekunden. Nach Auswahl/Speicherung von B enthält Datenbank/Context 20, das Formular jedoch weiterhin 10. Ein anschließender Titel-Save hat keine Bindungsänderung und sendet 10; der Backend-Metadatenwriter akzeptiert die ausdrücklich übergebene Laufzeit. Derselbe Fehler betrifft eine zwischen Vorschau und Apply serverseitig korrigierte Qualität. Die bestehenden Hooktests verwenden bei der Relinkantwort keine gegensätzliche Laufzeit und erkennen den Fehler deshalb nicht.

Ursprünglich benötigt: gespeicherte Antwortwerte als tatsächliche Baseline behandeln und nur seit Requestbeginn unveränderte Formfelder synchronisieren. Während des Requests erfolgte Nutzereingaben und eine neuere Dateiauswahl dürfen nicht verloren gehen. Kein zusätzlicher Providerrequest, kein neues State-System. Nachweis durch gezielte Hookregression für zweites Vollformular-/Metadatenspeichern und erneute relevante Frontendgates.

**Schließungsnachweis:** `e4548ae4` ergänzt die fehlenden Fälle; tatsächliches RED: 3 Fehler / 17 bestanden. `3e410901` nutzt den bestehenden `buildInitialFormState` auf der gespeicherten Antwort, setzt die Baseline aus diesem Zustand und führt nur unveränderte Felder zurück. Spätere Eingaben, neuere Dateirevision und Metadaten-only-Bindungs-/Gruppenentwurf bleiben erhalten. Unabhängige Code-Nachprüfung bestätigt den beschriebenen Datenfluss. GREEN: 61 Tests: 20 Hook + 32 Refresh + 9 Tokenboundary, 0 Fehler/Skips. Scoped lint 0/0, Typecheck nur bekannte 2 Fehler. Beleg: `editor-reconciliation-checks.json`. Der vollständige Frontendnachlauf auf `3e410901` ist abgeschlossen: 2748 bestanden, exakt zwei bekannte CSS-Fehler und drei TODO; keine neuen Lint-/Typecheck-/Buildfehler.

## Substantielle Artefakte, Verkabelung und Datenfluss

| Artefakt/Naht | Existenz/Substanz/Wiring | Datenquelle und Grenze |
|---|---|---|
| `backend/internal/jellyfin/request.go` | Voll implementiert und von allen vorgesehenen Jellyfin-HTTP-Stellen verwendet. | Serverkonfiguration → ursprungsgebundener MediaBrowser-Header; URL-Bereinigung, keine parallele Browserauthentifizierung. |
| `handlers/jellyfin_client.go`, `jellyfin_source_batch.go`, `jellyfin_media_source.go` | Decoder/Status bleiben gemeinsam; exaktes Batching und reiner Resolver real verwendet. | Jellyfin Item→ausgewählte nested MediaSource→Source-eigene technische Werte. Keine Top-Level- oder First-Item-Ausweichwahl. |
| `models/jellyfin_source.go`, `repository/jellyfin_source_repository.go` | Typisierter Snapshot und gesperrtes Namespace-Upsert, keine Stubwerte. | `stream_sources(provider_type,external_id)` bleibt reale Item-Identität; `metadata.jellyfin_source` trägt private Bindung/Tracks. Unverwandte JSON-Felder bleiben erhalten. |
| `handlers/admin_episode_import.go`, `repository/episode_import_repository_release_helpers.go` | Preview→geprüftes Paar→Serverrehydration→bestehende Apply-Transaktion. | Autoritative Anime-Serie/Ordner; normalisierte Episode/Release/Version/Variant/Stream/Group-Graphen. Nochmals geprüfte Quellen vor Mutation. |
| `episode_version_source_hydration.go` und Create/Update-Handler | Nach bestehender Auth-/Rechteprüfung verdrahtet. | Exakter Item-/Source-/Anime-Kontext; Metadaten-only0 Providerrequests; explizite Quellenauswahl nur Admin. |
| `release_variant_source_repository.go` | Gemeinsame SQL-Auswahl in Release-, Theme- und Public-Lesepfaden. | Kanonische release_version_id; explizite Variant-ID muss zu dieser Version gehören; Standardvariant zuerst, dann bevorzugter Stream. |
| `episode_version_stream.go`, `segment_render_subtitles.go`, `segment_render_worker.go` | Tatsächliche URL/Untertitel/FFmpeg-Argumente aus einer vorbereiteten Quelle. | Video MediaSourceId und Untertitel Source-ID/Index stimmen überein. Cacheidentität enthält tatsächliches Item+Source; Worker vergleicht gespeicherten Fingerprint. |
| `release_detail_public_repository_helpers.go` und ReleaseDetailHero | DB-Fakten gelangen in vorhandene öffentliche technische Anzeige. | Ein DB-Snapshot; Rohsprache nullable, echte Untertitelcodecs/Flags. Unbekanntes Audio zeigt nur gemäß D16 Japanisch; keine Änderung von API/DB/Untertiteln. |
| Importbuilder und Editorhook | Prüfung/Serialisierung/zentraler Authclient vorhanden; Editor-Folgespeichern durch 3e410901 korrigiert. | Identität weiterhin realer Item-Key plus geprüfter Source-Selektor. Die öffentliche Einzelversionsprojektion ist durch `718ebf57` getrennt abgesichert. |

Leere Arrays bei vollständiger Streamantwort bedeuten fachlich keine Tracks. Ausgelassene Streams sind unvollständig und dürfen nur am bereits bestätigten gleichen Source-Paar vorhandene vollständige Tracks behalten. Fehlender alter Snapshot bleibt lesbar; es gibt keine Hintergrundbefüllung. Diese Fälle sind keine Produktionsstubs. Vorbestehende TODOs zur optionalen Render-Release-ID und zur Worker-Zeitfensterdrift wurden nicht als erledigt behandelt.

## Aufrufstellen und Sicherheitsbelege

| Tatsächlicher Aufrufer | Technischer Nachweis | Live-Nachweis/Grenze |
|---|---|---|
| AdminContent JSON | Gemeinsamer NewRequest/Do, vorhandener Encodingdecoder; Header-/Fehler-/ID-Fixtures. | SystemInfo, Serie,13/27-Episodeninventar, exakter Itembatch; kein echter Import. |
| Anime JSON | Derselbe Requestboundary; Statusmapping/Manifestlogik beibehalten. | Manifest/Public-Metadaten und Provider-ThemeVideos. |
| Anime Status | Derselbe Boundary, Status-/Body-Lifecycle erhalten. | Providerbild/Logo und entsprechende Team4s-Logoantwort; synthetische Statuspfade separat. |
| GroupAssets JSON | Headerauth, Librarylookup, Rootfalse/Childtrue, vollständiges Paging, exaktes Detail-Item. | Library4, direkte Wurzel1, Nachfahren3. CollectionFolder-ID und physischer ParentId sind dokumentiert nicht gleichzusetzen. |
| MediaImage | Providerdispatch Jellyfin→Boundary; Embyzweig unverändert. | Provider Primary/Logo200; Team4s-Logo200. Resizeparameter-/Status-/Redirecttests. |
| MediaVideo | Header, Range/User-Agent, Responseweitergabe. | Team4s-/Provider-Range206,64Byte und identischer Hash. |
| StreamRelease | Bestehende Grants/Ownership vor Request; kanonische ausgewählte Source. | Geschützter tatsächlicher Wiedergabestart nicht ausgeführt; reale GET-Semantik plus Grant-/Source-Requestfixtures. |
| StreamAsset | Bestehende Entitlementprüfung unverändert, Shared-Headerboundary. | Live geschützter Assetstart nicht ausgeführt; Entitlement/Range/Status-Requestfixtures. |
| Subtitle Download | Exaktes Item/Source/Index, kontrollierte temporäre Datei, Header/Abbruch/Fehlerredaktion. | Subtitle200 im Nachlauf; erster kalter Timeout bleibt als Grenzfall dokumentiert. |
| FFmpeg | Getrennte serverseitige Header, `-max_redirects 0` vor `-i`; echte installierte FFmpeg-Fixture. | Kein echter Live-Segmentrender. Testinput rendert direkt; Redirect-Ziel erhält0 Requests/0 Credentials. |

Verbleibende `api_key`-Erzeugung in `fansub_admin.go` gehört zum weiterhin bestehenden Embyzweig. Fanart und andere Provider sind nicht pauschal umgestellt. Synthetic-Testkeys und Sanitizererkennung sind keine aktiven Jellyfin-Credential-URLs. Der vor der Prüfung gefundene gespeicherte URL-Ausgabefehler wurde bereits durch `a4be0224` behoben; `browser-after.json` dokumentiert die erneute Sichtprüfung, ohne den Wert zu speichern.

## Tests, Build und Baselinevergleich

Belege unter `docs/audits/2026-09-15-jellyfin12/`. Der Verifier hat die vorhandenen Rohlogs selbst geparst; er zählt keinen Skip als ausgeführten Datenbanknachweis.

| Gate auf 64340e93 vor den beiden Reviewkorrekturen | Ergebnis | Einordnung |
|---|---|---|
| Gezieltes Go,6 Pakete, explizite Testnamenauswahl |277 Top-Leveltests ausgeführt,554 Test-/Subtest-Passereignisse,0 Fehler,0 Skips | Reale Source-/Import-/Editor-/Playback-/Public-DB-Fixtures eingeschlossen; guarded DSN an alle Pakete weitergereicht. |
| Breites Go handlers/repository/services |2015 Passereignisse,277 vorbestehende Skipereignisse,50 fehlgeschlagene Top-Leveltests | Unabhängiger Mengenvergleich gegen `backend-tests-baseline.log`: exakt50 identische Namen, keine hinzugekommen/entfallen.60 Failereignisse inklusive Subtests sind nicht60 unterschiedliche Top-Levelfehler. |
| Go build/vet `./...` |PASS | JeExit0 im finalen Log. |
| Gesamte Frontendtests |2743 bestanden,2 fehlgeschlagen,3 TODO | Exakt die beiden vorhandenen CSS-Scannerfehler; neue Phase-Tests bestehen. V161-01 war jedoch noch nicht getestet. |
| Geänderte4 Frontendtestdateien + zentrale2 Authdateien |122 Tests bestanden |43 Mapping +15 Hook +17 Hero +6 Projektion +32 Refresh +9 Tokenboundary; kein erzwungener Refresh-only-Livebrowserzustand behauptet. |
| Typecheck |2 bekannte Next-Typfehler | Gleiche Pfade/Ursachen: ungültiger `formatEditLoadError`-Pageexport und AdminAnimePageProps. Reihenfolge im generierten Uniontyp kann sich unterscheiden; keine neue Ursache. |
| Volles ESLint |13 Fehler,328 Warnungen | Unabhängiger Vergleich aller341 normalisierten Datei/Schwere/Meldung/Regel-Diagnosen identisch zur Baseline. |
| Scoped ESLint |0 Fehler,2 bestehende Warnungen | Nur vorhandene ungenutzte Typ-Testkonstanten. |
| Isolierter Produktionsbuild |Kompiliert erfolgreich, danach gleicher Pageexportfehler | `NODE_ENV=production`, getrennte Ausgabe; kein global grüner Build behauptet. |
| Runtime/Dateiabgleich |818 Backenddateien passen zum aktiven `/app` | Hashnachweis64340e93. Frühere Go-Dateikopien konnten Air neu bauen lassen; kein unveränderter Runtimezustand aufgrund fehlenden manuellen Restarts behauptet. |
| Anwendungstabellen |6 Tabellen, je13 Zeilen, alle Fingerprints unverändert | episodes, fansub_releases, release_versions, release_variants, release_streams, stream_sources; keine Behauptung einer Vollprüfung sämtlicher Tabellen/Dateisysteminhalte. |

### Finale Nachläufe nach der unabhängigen Prüfung

| Gate / eingefrorener Stand | Ergebnis | Gegen Baseline / Grenze |
|---|---|---|
| Vollständige Frontendtests, `3e410901` | 2748 bestanden, zwei fehlgeschlagen, drei TODO; 322 Testdateien | Beide Fehlernamen entsprechen exakt dem ursprünglichen CSS-Scannerfehler und dessen Allowlistprüfung. Gegenüber dem vorherigen Lauf fünf zusätzliche erfolgreiche Hookfälle. |
| Betroffene vier Frontendtestdateien und zentrale Authgrenzen, `3e410901` | 127 bestanden: 43 Mapping, 20 Hook, 17 Hero, sechs Vertrag, 32 Refresh, neun Tokenboundary | Der gesonderte Reconciliation-Lauf umfasst davon 61 Hook-/Authfälle, null Fehler/Skips. Überlappende Zähler werden nicht addiert. |
| Typecheck / vollständiges ESLint, `3e410901` | Dieselben zwei Next-Typfehler; 13 Fehler / 328 Warnungen | Vollständige normalisierte Lint-Diagnosen stimmen mit der Baseline überein; keine neue Fehlerursache. |
| Scoped ESLint, `3e410901` | Null Fehler, zwei bestehende Warnungen | Die isolierte Hookkorrektur selbst hat null Fehler/Warnungen. |
| Isolierter Produktionsbuild, `3e410901` | Kompiliert erfolgreich in 21,9 s; danach bekannter ungültiger `formatEditLoadError`-Pageexport | Kein vollständig grüner Produktionsbuild behauptet. |
| Öffentliche DTO-Grenze, `718ebf57` | Vier Top-Leveltests, 61 Passereignisse, null Fehler/Skips; Handler-vet erfolgreich | Echte isolierte DB-Fixture plus autorisierte Create-/Updatewege; kein erneuter vollständiger Backendlauf nach diesem schmalen Projektionsfix behauptet. |

Nachweise: `frontend-final-checks.json`, `editor-reconciliation-checks.json`, `public-selector-regression.json`. Frühere Frontendgates bleiben als `frontend-final-checks-at-64340e93.json` erhalten. Go-Race-Instrumentierung ist ohne gcc/CGO im vorhandenen Image nicht möglich; die normalen Parallelitäts-/Locktests sind ausgeführt. Die kanonische OpenAPI und relevante fokussierte Fragmente werden geparst; bestehende Syntaxprobleme der vollständigen fokussierten Dokument-DSLs verhindern deren unveränderten Gesamt-YAML-Parse. Der Verifier prüfte die finalen Test-/Buildlogs selbst und verglich die CSS-Fehlernamen sowie normalisierten Lint-Diagnosen erneut; keine Summaries als alleiniger Beweis verwendet.

## Request- und SQLbudgets

| Pfad | Vorher → jetzt / bewiesene Grenze |
|---|---|
| Metadaten-/Status-/Bildproxy |1→1 Upstream-Request für den jeweiligen erfolgreichen Einzelaufruf. |
| Groupchildren201 Einträge |Vorher nach200 abgeschnitten; jetzt2 Seiten mit200+1. Keine Vollständigkeitsbehauptung bei kaputtem Total/IDs. |
| Importpreview11eyes |1 Collectionrequest;27 tatsächliche Items. Reichere Source-/Track-Payload: Live290538Byte; kein Extra-Request pro alternative Source. |
| ImportApplyN bestätigte Items |0 Revalidierungsrequests→ceil(N/100),0 bei leerer Auswahl. Dazu1 Binding-SELECT für jede nichtleere Auswahl. Das Mehr an Requests ist notwendige Serverprüfung, kein Performancegewinn. |
| Bindingbatch201 Items |1 SQL-Anweisung,201 Ergebniszeilen; keine pro-Track-/Source-SQL-Abfrage. |
| Gewöhnlicher Release-Metadaten-Save |0 Jellyfinrequests; bestehende Repositoryreads/-writes plus notwendige Sperren. Keine konstante Gesamttransaktionszahl erfunden. |
| Public-/Release-/Theme-Sourceauswahl |Je1 SQL-Anweisung/1 Zeile auch bei0,1,201 Tracks; Publictechnical zuvor2 separate Reads→1 gemeinsame Projektion.0 Jellyfinrequests. |
| Gebundener Release-Videostream |0 Metadatenrequests+1 Video-GET; ungebunden1 exakter Metadata-GET+1 Video-GET. |
| Segmentjob |Gebundene Vorbereitung ohne Metadata-GET; Worker1 frischer Metadata-GET+höchstens1 Untertiteldownload. Ungebundene Vorbereitung benötigt zusätzlich1 Metadata-GET vor Cachelookup; späterer Worker ist eine separate Grenze. |
| URL-Bereinigung / Ausschluss des privaten Source-Selektors |0 neue SQL-/HTTP-Aufrufe; die vorhandene GetByID-Abfrage bleibt bestehen. |

## Requirements und Entscheidungen

| Requirement | Abdeckung | Status |
|---|---|---|
| P161-AUTH |Truths1–3, Aufrufermatrix, Header-/Redirect-/FFmpeg-/URL-Fixtures |Technisch belegt. |
| P161-API |Truths1,4,7,15; LiveOpenAPI12.0.0 inkl. nicht deprecated verwendeter Pfade |Technisch belegt; V161-02 geschlossen. HTTP 200 allein wurde nicht als Vertragsbeweis verwendet. |
| P161-ITEMS |Truths4,5,8,14,15; Buddy-Paging und11eyes-Vollmenge |Technisch belegt für27 echte Items;11 Alternativen bleiben Nicht-Items. |
| P161-SOURCE |Truths5,8–13 |Technisch belegt einschließlich korrigiertem Editor-Folgesave V161-01. |
| P161-METADATA |Truths6,7,9–12 |Technisch belegt; V161-01 und V161-02 geschlossen. |
| P161-REGRESSION |Truths3,10,13–16, zentrale Authprüfung und Baselinevergleich |Technisch belegt; beide Reviewfehler mit gezielten Regressionen geschlossen. Finale Gates nach eingefrorenen Ständen getrennt dokumentiert, keine neuen Baselinefailures. |

D01–D05: vollständige Caller-/API-/GetItemsprüfung und Sourceauswahl. D06–D10: bestehendeJSONB-Struktur, kanonische Ownership, atomare technische Werte und ehrliche Sprach-/Streampräsenz. D11–D13: gemeinsamer ausgewählter Playback/Publickontext, echte Tests und gemessene Kosten. D14–D15: keine Produktions-/Daten-/Scopeausweitung, dokumentierter Folgeplan und ehrliche Abschlussgrenzen. D16: Japanisch ausschließlich als genehmigter Audio-Anzeigefallback; Untertitel unverändert. Kein Decision-Override.

## Noch menschlich bzw. live zu bestätigen

**Koordinator-Nachtrag 15.09.2026:** Der Nutzer hat den besprochenen Release-27-Metadaten-/Anzeige-Fall mit „uat abgenommen“ bestätigt. Maßgeblich für diese spätere Teilabnahme ist [161-HUMAN-UAT.md](161-HUMAN-UAT.md). Die nachstehende ursprüngliche Verifikationsliste bleibt als Prüfgrenze erhalten; ein tatsächlicher Import/Relink, Library-Rescan oder kalter Playbacktest wird dadurch nicht als beobachtet ausgegeben.

1. Nach technischem Abschluss: Einen ausdrücklich autorisierten echten Import oder Relink über den vorhandenen sichtbaren Adminflow durchführen und anschließend Publicdetails sowie Wiedergabe derselben Datei beurteilen. Isolierte DBtests ersetzen keine Behauptung eines bereits erfolgten Liveimports; derzeitige Altzeilen haben bewusst keinen neuen Snapshot erhalten.
2. Reale Rescan-Stabilität wurde nicht durch einen Library-Rescan getestet. Automatisiert sind Reorder, gespeicherteID, eindeutigePfad-Recovery und Verlust/Mehrdeutigkeit abgedeckt. Wenn ID und Pfad zugleich verloren sind, wird explizit abgebrochen.
3. Erster kalter Subtitle-Request hatte einen Timeout; der warme Nachlauf200 ist kein Beweis gegen jedes Kaltstartproblem. Untertitel und Segmentwiedergabe visuell/akustisch am gewünschten echten Release prüfen, wenn entsprechende Aktionen autorisiert werden.
4. Der vorhandene Signed-in-Browserflow funktioniert: Profil→Admin→Anime→Edit/Episoden→Releaseeditor; Publicrelease40 und48 mit Details. Keine automatische Human-UAT-Freigabe, kein Einloggen mit fremden Credentials, keine Annahme über Refresh-only aufgrund einer normalen Session.

Vorhandene UAT-Stände anderer Phasen bleiben beim Koordinator. Laut aktuellem autoritativem CONTEXT haben 156/157 bereits einen eigenen frischen Nutzer-Sign-off vom 15.09.; dieser Report schließt oder öffnet sie nicht erneut. Die offenen Anime-UAT-Punkte 158/159 bleiben unberührt. Dateigröße `n/a`, Kapitelanzeige und die vorbestehende Worker-Zeitfenster-/Profiländerung während einer Queue sind getrennte Folgearbeit; diese Phase löst Source-Fingerprintdrift.

## Nachprüfung / Abschluss

V161-01 und V161-02 wurden dem Koordinator am 15.09.2026 gemeldet und nach der jeweiligen Korrektur unabhängig im Code nachgeprüft. Beide sind geschlossen; keine technische Lücke und kein Decision-Override verbleiben. Die Phase ist technisch bestanden innerhalb der dokumentierten Baseline- und Live-Grenzen; der Status `human_needed` hält die nicht ausgeführten menschlichen/livegestützten Abnahmen offen. Keine Anwendungsdatei, kein Datenbestand und kein GSD-Status wurde vom Verifier verändert. Dieses Dokument wird vom Koordinator eingecheckt.
