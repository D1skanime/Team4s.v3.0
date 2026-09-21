# Phase 165: Library Discovery und Assisted Anime Creation (Serien) - Research

**Researched:** 2026-09-21
**Aktualisiert:** 2026-09-21 (Nachrecherche für D-14..D-22, nach CONTEXT.md-Erweiterung; §1–§7 unverändert übernommen)
**Domain:** Admin-Anime-Intake (Go/Gin-Backend, Next.js-Admin-Frontend), Jellyfin-12-Discovery, AniSearch-Merge
**Confidence:** HIGH (alle Kernfragen sind an echtem Code mit Datei:Zeile belegt; ein Teil zusätzlich live gegen die reale Jellyfin-12-Instanz verifiziert)

## Summary

Der bestehende Jellyfin-Intake-Code ist bereits sehr weit vorgebaut: Es gibt eine batchfähige
Existenzprüfung (`FindExistingAnimeByJellyfinIntakeRefs`), eine fertige "Jellyfin-Serie auswählen →
Vorschau laden → in Create-Draft übernehmen"-Pipeline (`handleJellyfinCandidateAdopt`), eine fertige
AniSearch-Merge-Logik mit Feldschutz für bereits gesetzte Werte (`mergeCreateDraftPayload` /
`resolveCreateAniSearchDraftMergeInputs`), einen fertigen (aber nicht für Discovery genutzten)
Cursor-Pagination-Baustein (`release_cursor_pagination.go`) und einen fertigen, leichtgewichtigen
Metadaten-Schreibpfad für bestehende Anime (`ApplyAnimeMetadataFromJellyfin` →
`ApplyJellyfinSyncMetadata`). Phase 165 kann und soll auf all diesen Bausteinen aufsetzen, statt sie
neu zu bauen — das deckt sich mit D-12 (kein Provider-Framework, kein Source-Refactor).

Eine Live-Prüfung der echten Jellyfin-12-Instanz (`http://192.168.235.100:8098`, Bibliothek
"Fansubs", `CollectionType=tvshows`) widerlegt eine zentrale Annahme des Auftrags: Es existiert in
dieser Bibliothek **kein einziges Jellyfin-Item vom Typ `Movie`** — auch Filme sind, weil die
Bibliothek als "tvshows" eingerichtet ist, technisch vom Typ `Series` mit einem Ordner-`Path` (nicht
Datei-`Path`). Die Unterscheidung Serie/Film muss daher weiterhin über die bereits vorhandene
Pfad-/Namens-Heuristik (`buildJellyfinIntakeTypeHint`) erfolgen, nicht über Jellyfins `Type`-Feld
oder eine `IncludeItemTypes=Series,Movie`-Abfrage. Das bedeutet auch: die vom Auftraggeber
befürchtete Movie-Pfad-Semantik ("Pfad = Datei statt Ordner", D-03) tritt in der aktuellen Bibliothek
nicht auf — jedes Item, Serie wie "Film", hat einen Ordner-`Path`. Die bestehende
`folder_name`-Existenzprüfung funktioniert damit für beide Fälle strukturell gleich.

Zusätzlich wurde eine reale Fehlkonfiguration gefunden: `JELLYFIN_ALLOWED_LIBRARY_IDS=5` in der
Live-`.env` ist **keine gültige Jellyfin-12-Bibliotheks-GUID** und lässt jede
`ParentId=5`-Anfrage mit HTTP 400 scheitern (live verifiziert). Die reale Bibliotheks-ID lautet
`5f65d0c8bdd71b782fc98205814a0d76`. Dieser Punkt ist keine Aufgabe dieser Phase (§26/D-12: keine
Datenänderung durch den Agenten; `.env` ist Konfiguration, keine Code-Änderung dieser Phase), muss
aber dem Auftraggeber/Planner explizit gemeldet werden, weil Discovery ohne eine korrekte Library-ID
keine Ergebnisse liefern kann.

**Primäre Empfehlung:** Discovery als neue Route/neuen Modus auf der Create-Seite bauen, die (1) das
volle Bibliotheks-Snapshot aus Jellyfin serverseitig cached (ein Request je erlaubter Library, slim
Fields, `Type=Series` — `Movie` liefert nachweislich 0 Treffer), (2) Status ausschließlich über die
bestehende Batch-Query `FindExistingAnimeByJellyfinIntakeRefs` bestimmt, (3) bei Auswahl exakt die
bestehende `handleJellyfinCandidateAdopt`/`PreviewAnimeIntakeFromJellyfin`-Pipeline aufruft, und (4)
nach AniSearch-Auswahl die vorhandene `FindAnimeBySource`-Dublettenprüfung um eine echte
"Verbinden"-Option erweitert, die den bereits vorhandenen `ApplyAnimeMetadataFromJellyfin`-Endpunkt
nutzt (aktuell schreibt dieser Endpunkt nur `anime.source`/`anime.folder_name`, nicht
`anime_source_links` — für die Existenzprüfung reicht das, da diese `anime.source` ohnehin prüft).

**Nachrecherche D-14..D-22 (dieser Durchlauf):** Die neuen Entscheidungen D-14 bis D-22 betreffen
überwiegend Bereiche, die in §1–§7 noch nicht abgedeckt waren: Mehrfach-Ordner-Episodenimport (D-14),
Mehrstaffel-Zuordnung (D-15, **explizit Checkpoint-pflichtig vor jeder Migration**), Ordner-Umzug
(D-16, kein neuer Code nötig), Ignorieren/Nicht-mehr-ignorieren (D-17, neue Tabelle), Ordner-Management
auf der Edit-Seite (D-18), Cache+Refresh (D-19), Save-Time-Dublettencheck (D-20), Audit-Attribution
(D-21) und Server-Kennungs-Vorsorge (D-22). Für D-21 ist die wichtigste neue Erkenntnis: Der
Audit-Mechanismus (`AuditLogRepository`/`audit_logs`) ist in `AdminContentHandler` **bereits
vollständig verdrahtet** (`h.auditLogRepo`, gesetzt über `WithPermissionDeps`) und wird an >50 Stellen
im Repo exakt nach dem Muster verwendet, das D-21 fordert — hier ist buchstäblich kein neuer
Infrastrukturbaustein nötig. Für D-14 wurde zusätzlich eine über die Auftragsbeschreibung
hinausgehende Sicherheitslücke gefunden (siehe §8, Pitfall 6): Der bestehende Preview-Endpunkt nimmt
`jellyfin_series_id` heute **komplett ungeprüft** entgegen (keine Zugehörigkeitsprüfung zum Anime,
auch nicht im aktuellen Ein-Ordner-Normalfall) — D-14 muss das grundsätzlich schließen, nicht nur für
den Mehrfach-Ordner-Fall.

**Korrektur zu einer CONTEXT.md-Zitatstelle:** Die D-14-Zeile "Das Backend nimmt `JellyfinSeriesID`
im Import-Request bereits an (`admin_episode_import.go:73`)" bezieht sich auf den
**Preview**-Endpunkt (`adminEpisodeImportPreviewRequest.JellyfinSeriesID`,
`admin_episode_import_validation.go:12`), **nicht** auf den Apply-Endpunkt
(`adminEpisodeImportApplyRequest` hat **kein** `JellyfinSeriesID`-Feld — Apply arbeitet ausschließlich
mit bereits im Preview-Schritt aufgelösten `MediaItemID`/`MediaSourceID`-Paaren). Die neue
Ordnerauswahl (D-14) muss daher vor/beim **Preview**-Schritt ansetzen, nicht beim Apply. Die
Kernaussage von CONTEXT.md ("Backend nimmt das Feld bereits an") ist zutreffend, aber unvollständig —
sie verschweigt, dass dieses Feld heute serverseitig **nicht validiert** wird.

**Hinweis zu abweichenden USER-REQUEST.md-Formulierungen:** §6/§10 des Auftrags beschreiben einen
dritten Listen-Zustand "Zuordnung prüfen" mit eigenem Filter. CONTEXT.md D-02/D-04 ersetzen das
explizit: Es gibt in der Liste nur noch "bereits vorhanden" und "offen" (plus D-15 "teilweise" und
D-17 "ignoriert"); die "Zuordnung prüfen"-Entscheidung verschiebt sich vollständig auf den Zeitpunkt
**nach** der AniSearch-Auswahl (bestehender Dubletten-Redirect, §7 unten). Ein Planner, der nur
USER-REQUEST.md liest, würde einen eigenen "Zuordnung prüfen"-Filter/-Zustand in der Liste bauen —
das ist laut CONTEXT.md **falsch** und darf nicht umgesetzt werden. Dieser Hinweis war bereits in der
vorherigen Recherchefassung enthalten (§7) und wird hier nochmals hervorgehoben, weil D-04 ihn mit der
neuen Filterliste ("Offen", "Bereits vorhanden", "Ignoriert", "Alle") bestätigt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Jellyfin-Library-Snapshot (Discovery-Datenquelle) | API/Backend (Go-Handler, `jellyfin_client_series.go`-Familie) | — | Jellyfin-HTTP-Zugriff ist bereits ausschließlich backend-seitig gekapselt (API-Key darf nie ins Frontend) |
| Existenzprüfung (offen/bereits vorhanden) | API/Backend (`AdminContentRepository`) | Database (Postgres, Batch-Query) | Bereits als Batch-SQL-Query implementiert; muss Backend-seitig bleiben (kein Fan-out) |
| Discovery-Cache (kurzlebig, TTL) | API/Backend (in-memory oder Redis) | — | Redis ist bereits im Stack vorhanden (`docker-compose.yml`); kein neuer Infrastrukturbaustein nötig |
| Discovery-Liste/-Filter/-Pagination-UI | Browser/Client (Next.js Client-Component) | Frontend-Server (Route/Layout) | Analog zur bestehenden Create-Seite (Client-Controller-Pattern `useAdminAnimeCreateController`) |
| Create-Draft-Übernahme (Jellyfin→Draft) | Browser/Client (bestehender Controller) | API/Backend (`PreviewAnimeIntakeFromJellyfin`) | Bereits vollständig implementiert (`handleJellyfinCandidateAdopt`); Discovery ruft dieselbe Pipeline auf |
| AniSearch-Suche/-Merge | API/Backend (`AnimeCreateEnrichmentService`) | Browser/Client (Anzeige/Bestätigung) | Fachliche Wahrheit bleibt AniSearch; Merge-Logik ist bereits serverseitig mit Feldschutz umgesetzt |
| Dubletten-Entscheidung ("verbinden"/"neu") | Browser/Client (neue UI) | API/Backend (bestehender Redirect + neuer/erweiterter "verbinden"-Call) | Backend liefert heute nur Redirect-Info; die Entscheidungs-UI selbst existiert noch nicht |
| Post-Create-Weiterleitung (Serie→Episoden, Film→Edit) | Browser/Client (Redirect-Logik in Create-Controller) | — | Bestehender Mechanismus (`buildManualCreateRedirectPath`) muss um einen Assisted-Zweig ergänzt werden |
| Discovery-Kontext-Erhalt (Filter/Suche/Cursor) | Browser/Client (URL-Query-Params) | Frontend-Server (Next.js `searchParams`) | Bestehendes Muster: `/admin/anime` liest bereits `searchParams.created` serverseitig (`frontend/src/app/admin/anime/page.tsx:17`) |
| Episode-Import-Ordner-Zugehörigkeitsprüfung (D-14) | API/Backend (`AdminContentHandler`, `admin_episode_import.go`) | — | Reine Server-Validierung gegen bereits geladene `GetAnimeSyncSource`-Daten, kein zusätzlicher Jellyfin-/DB-Call nötig |
| Mehrstaffel-Snapshot + Staffel→Anime-Zuordnung (D-15) | API/Backend (Snapshot-Aufbau) | Database (Zuordnungs-Speicherung, **Schema noch offen**) | Season-Daten sind technische Jellyfin-Fakten; welche Staffel zu welchem Anime gehört, ist eine Team4s-Fachentscheidung, die persistiert werden muss — Speicherform ist Checkpoint-pflichtig (siehe §9) |
| Ignorieren/Nicht-mehr-ignorieren (D-17) | API/Backend (neuer Handler) | Database (neue, kleine Tabelle) | Reversible Admin-Markierung pro Jellyfin-Item, analog zu bestehenden Kleinsttabellen wie `release_playback_entitlement_rules` |
| Ordner-Management auf der Edit-Seite (D-18) | Browser/Client (neue UI, Muster `AnimeContextFansubManager`) | API/Backend (Context-Erweiterung + neuer Remove-Endpunkt) | `anime_source_links` ist bereits die Datenquelle (composite PK `(anime_id, source)`); UI/Endpunkt zur Anzeige aller Zeilen und zum gezielten Löschen fehlen noch |
| Admin-Audit-Attribution (D-21) | API/Backend (`AuditLogRepository`) | Database (`audit_logs`) | Bereits vollständig verdrahtet in `AdminContentHandler` (`h.auditLogRepo`), an >50 Stellen im Repo in identischem Muster verwendet — keine neue Infrastruktur nötig |
| Server-Kennungs-Vorsorge (D-22) | Database (neue Spalte an neuen Tabellen) | — | Rein additive Spalte mit festem Default `'default'`; ändert keine bestehende Lese-/Schreib-Logik in 165 |

## Standard Stack

Diese Phase führt **keine neuen externen Pakete** ein (weder npm noch Go-Module). Alle benötigten
Bausteine (Jellyfin-HTTP-Client, Cursor-Pagination-Helfer, AniSearch-Enrichment-Service,
UI-Primitives, Audit-Log-Repository, Redis-Client) existieren bereits im Repository. Deshalb entfällt
die Package-Legitimacy-Gate-Pflicht für neue Registry-Pakete; siehe Abschnitt "Package Legitimacy
Audit" unten für die explizite Begründung.

### Wiederverwendete interne Bausteine (kein "Standard Stack" im npm/pip-Sinn, aber verbindlich für die Planung)

| Baustein | Datei | Zweck | Warum wiederverwenden |
|----------|-------|-------|------------------------|
| Batch-Existenzprüfung | `backend/internal/repository/admin_content_jellyfin_intake.go` | 1 Query für viele Series-IDs/Pfade | Erfüllt D-07 (≤1 DB-Query) bereits strukturell |
| Jellyfin-Serien-Suche/-Client | `backend/internal/handlers/jellyfin_client_series.go` | HTTP zu `/Items` | Auth/Fehlerklassifizierung bereits vorhanden (`classifyJellyfinUpstreamError`) |
| Cursor-Pagination-Helfer | `backend/internal/repository/release_cursor_pagination.go` | Base64-Seek-Cursor, `limit+1`-Overfetch, „stiller Neustart" bei ungültigem Cursor | Exakt das "bestehende Cursor-Muster" aus CONTEXT.md/§9; encode/decode-Helfer sind generisch (`encodeCursorPair`/`decodeCursorPair`) |
| Bild-Proxy-URL-Aufbau | `backend/internal/handlers/group_assets_jellyfin.go:586` (`buildGroupMediaImageURL`) | Reine String-Konstruktion, kein HTTP-Call | Bereits von `buildAdminJellyfinIntakeSearchItem` für Poster/Banner/Logo/Backdrop genutzt — 0 Requests beim Listenaufbau |
| AniSearch-Dubletten-Check | `backend/internal/services/anime_create_enrichment.go:1201-1212` (`Enrich`, `FindAnimeBySource`) | Prüft `anisearch:<id>` gegen `anime.source`/`anime_source_links` | Ist bereits die Quelle für D-02; muss nur um eine echte "trotzdem neu anlegen"-Option ergänzt werden |
| Jellyfin→Draft-Adoption | `frontend/.../useAdminAnimeCreateController.ts:904-941` (`handleJellyfinCandidateAdopt`) | Lädt Preview, hydriert Draft, setzt Asset-Slots | Ist bereits exakt D-08; Discovery muss nur denselben Preload mit vorausgewählter `candidateID` triggern |
| Leichtgewichtiger Metadaten-Schreiber für bestehenden Anime | `backend/internal/handlers/jellyfin_metadata_resync.go:134-296` (`ApplyAnimeMetadataFromJellyfin`) | Schreibt `source`/`folder_name` (+ optional Assets) ohne Episodenimport | Bester Kandidat für D-05 "Verbinden"; schützt bereits gesetzte Felder (`buildMetadataFieldPreview`, Aktion `protect`) |
| Generisches Admin-Audit-Log | `backend/internal/repository/audit_logs.go` (`AuditLogRepository.Write`), verdrahtet in `AdminContentHandler.auditLogRepo` (`admin_content_handler.go:199`/`:326-330`) | Schreibt `actor_app_user_id`/`actor_legacy_user_id`, `event_type`, `target_type/id`, `action_name`, `outcome`, `payload` (JSONB) | Für D-21 exakt der geforderte "bestehende Audit-Mechanismus"; bereits an >50 Stellen im Repo identisch verwendet (siehe §12) |
| Anime-Domain-Audit (Alternative, NICHT empfohlen für D-21) | `backend/internal/repository/admin_content_anime_audit.go` (`admin_anime_mutation_audit`-Tabelle) | Nur für `anime.create`/`anime.update`/`anime.delete` gedacht, transaktional innerhalb des Anime-CRUD-Pfads | Zu eng geschnitten für die vier neuen D-21-Aktionen (Verbinden/Ordner-lösen/Ignorieren/Entignorieren sind keine `anime`-Metadaten-Patches); `audit_logs` ist der passendere generische Mechanismus |
| Redis-Client (bereits verdrahtet) | `backend/internal/database/redis.go` (`NewRedisClient`, `github.com/redis/go-redis/v9`) | TTL-fähiger Key-Value-Store, `client.Set(ctx, key, val, ttl)`/`client.Get(ctx, key)` | Für D-19 der naheliegende Cache-Baustein, bereits produktiv genutzt (z. B. `episode_playback_grant_store.go`) |
| `anime_source_links`-Tabelle (Composite-PK) | `database/migrations/0047_add_anime_source_links.up.sql` | `PRIMARY KEY (anime_id, source)`, zusätzlich `UNIQUE(source)` global | Für D-18 "Ordner lösen" reicht ein einfaches `DELETE ... WHERE anime_id=$1 AND source=$2` — keine neue Tabelle nötig, nur ein neuer Endpunkt/neue Repo-Funktion |

### Alternativen Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leichter Metadaten-Apply für "Verbinden" (D-05) | Voller `SyncAnimeFromJellyfin`-Endpunkt (`jellyfin_sync.go`) | Voller Sync erzwingt zusätzlich einen kompletten Episodenimport (schlägt fehl, wenn 0 Episoden akzeptiert werden, `jellyfin_sync.go:116-121`) — für ein reines "Referenz setzen" unnötig schwergewichtig |
| Neue Discovery-Cursor-Codierung | Bestehendes `encodeCursorPair`/`decodeCursorPair` aus `release_cursor_pagination.go` wiederverwenden, aber mit eigenem Schlüssel (z. B. `(name, jellyfin_item_id)`) | Discovery sortiert eine im Speicher aufgebaute/gecachte Liste, keine SQL-`ORDER BY`-Sequenz — die Kodierungs-/Overfetch-Mechanik ist reif, der Seek-Schlüssel selbst muss neu definiert werden |
| `IncludeItemTypes=Series,Movie` (laut §4/§17 des Auftrags) | `IncludeItemTypes=Series` (unverändert) + bestehende Pfad/Namens-Heuristik für die Typanzeige | Live verifiziert: `Movie` liefert 0 Treffer in der gesamten Instanz (siehe unten); `Series,Movie` liefert exakt dieselben 2111 Treffer wie `Series` allein |
| Neue Kleinsttabelle für "Ignoriert" (D-17) mit eigenem Audit-Feld | Bestehende `audit_logs`-Tabelle für die Attribution nutzen, Ignore-Tabelle selbst nur mit `ignored_by_app_user_id` als reinem Zustands-Feld (kein Audit-Ersatz) | Vermeidet doppelte Attribution-Pfade; die Ignore-Tabelle bildet nur den aktuellen Zustand ab, `audit_logs` die Historie (konsistent mit dem Rest des Repos, z. B. `fansub_group_invitations`) |
| `admin_anime_mutation_audit` für D-21 wiederverwenden | `audit_logs` (generisch) verwenden | `admin_anime_mutation_audit` erwartet feste `mutation_kind`-Werte (`anime.create/update/delete`) und läuft nur innerhalb der Anime-CRUD-Transaktion; die vier neuen Aktionen passen nicht in dieses Schema |

## Package Legitimacy Audit

Diese Phase installiert keine neuen externen Pakete (weder `npm install` noch `go get`). Alle in
"Standard Stack" gelisteten Bausteine — einschließlich `github.com/redis/go-redis/v9` für D-19 — sind
bereits im Repository vorhanden und in Produktion. Die Package-Legitimacy-Gate-Pflicht (slopcheck
etc.) entfällt daher; sollte der Planner im Rahmen dieser Phase doch eine neue Abhängigkeit für nötig
halten, muss die Gate-Prüfung zu diesem Zeitpunkt nachgeholt werden.

**Packages removed due to slopcheck [SLOP] verdict:** keine (keine neuen Pakete)
**Packages flagged as suspicious [SUS]:** keine (keine neuen Pakete)

## §1 — source / source_links / folder_name / Jellyfin Path: vollständige Lese-/Schreib-/Vergleichs-Map

### `anime.source` (Spalte, Freitext, kein UNIQUE-Constraint — nur Index `idx_anime_anisearch_id` auf `anisearch_id`, nicht auf `source`)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE (Create) | `createAnimeV2` (INSERT `anime.source`) | Beim manuellen/assisted Create, wenn `input.Source` gesetzt ist | `backend/internal/repository/admin_content_anime_create_v2.go:182-185` |
| WRITE (Create, Legacy-Schema) | `createAnimeLegacy` | Schema ohne `slug`-Spalte (Altbestand) | `backend/internal/repository/admin_content_anime_create_v2.go:33-38` |
| WRITE (Resync/Edit, bedingt) | `ApplyJellyfinSyncMetadata` (UPDATE) | Nur wenn (a) `forceSourceUpdate=true` **und** neuer Wert nicht leer, **oder** (b) aktueller Wert leer/NULL **und** neuer Wert nicht leer — sonst bleibt der Wert unverändert (kein Overwrite) | `backend/internal/repository/admin_content_sync.go:212-219` |
| WRITE-Trigger 1 (voller Episodensync) | `SyncAnimeFromJellyfin` | `forceSourceUpdate := (JellyfinSeriesID explizit übergeben)`; schreibt erst NACH erfolgreichem Episodenimport | `backend/internal/handlers/jellyfin_sync.go:136-139` |
| WRITE-Trigger 2 (reiner Metadaten-Apply, kein Episodenimport nötig) | `ApplyAnimeMetadataFromJellyfin` | `forceSourceUpdate := (explicitSeriesID != "")`; schreibt sofort, ohne Episoden zu importieren | `backend/internal/handlers/jellyfin_metadata_resync.go:195-204` |
| READ (Existenzprüfung, Legacy) | `findExistingAnimeByJellyfinIntakeRefsLegacy` | `anime.source = ANY($1::text[])` mit `$1` = `["jellyfin:<id>", ...]` | `backend/internal/repository/admin_content_jellyfin_intake.go:42-53` |
| READ (Existenzprüfung, V2-Schema) | `findExistingAnimeByJellyfinIntakeRefsV2` | Gleiche Semantik, plus Fallback über `anime_media`/`media_external`, falls `anime.source`-Spalte im Schema fehlt (`schema.HasSource == false`) | `backend/internal/repository/admin_content_jellyfin_intake.go:85-103` |
| READ (AniSearch-Dublette) | `FindAnimeBySource(ctx, "anisearch:<id>")` | Exakter String-Vergleich gegen `anime.source`/`anime_source_links.source` | `backend/internal/services/anime_create_enrichment.go:1201-1212`; Repo-Implementierung liegt außerhalb dieser Datei (Interface `AnimeCreateEnrichmentRepository`, `anime_create_enrichment.go:25`) |
| READ (Jellyfin-Kontext-Anzeige) | `jellyfinSeriesIDFromAnimeSource` | Extrahiert `jellyfin:`-Präfix aus `source` **oder** `source_links` fürs Edit-Panel | `backend/internal/handlers/jellyfin_metadata_resync.go:305` (Aufruf), Implementierung in `jellyfin_helpers.go`-Familie |
| COMPARE-Semantik | Exakter String-Vergleich `"jellyfin:" + trim(ItemID)` (case-sensitiv, kein Trimming von Sonderzeichen) | — | `buildJellyfinSourceTags`, `admin_content_jellyfin_intake.go:142-152` |

**Tatsächliche Semantik heute:** `anime.source` ist ein einzelnes "primäres Provenienz-Tag"
(`jellyfin:<id>` ODER `anisearch:<id>`, nie beides gleichzeitig in dieser Spalte — die AniSearch-ID
überschreibt beim Create das Jellyfin-Source-Tag in derselben Spalte, siehe
`buildAniSearchDraftPayload`: `Source: "anisearch:" + anime.AniSearchID`,
`anime_create_enrichment.go:1357`). Die Jellyfin-Referenz eines Anime, der über AniSearch angelegt
wurde, landet dann **nicht** in `anime.source`, sondern (falls beim Create als `SourceLinks`
übergeben) in `anime_source_links`. Das ist konsistent mit dem Bestand (`165-CONTEXT.md`: "4 Anime,
alle mit `source = jellyfin:<id>`, ... je ein `anisearch:<id>`-Link in `anime_source_links`" — hier
ist es umgekehrt gelagert, aber das Prinzip "eine Provenienz in `source`, weitere in
`anime_source_links`" ist dasselbe).

### `anime_source_links` (Tabelle, `UNIQUE(anime_id, source)` via `ON CONFLICT DO NOTHING`)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE | `syncAnimeSourceLinks` | Nur beim Create (`createAnimeV2`), fügt `input.Source` (primär) + `input.SourceLinks` (Liste) ein, dedupliziert case-insensitiv über `normalizeDistinctStrings` | `backend/internal/repository/anime_source_links.go:15-46` |
| READ | `loadAnimeSourceLinks` | Sortiert nach `source ASC`, für Edit-/Kontext-Anzeige | `backend/internal/repository/anime_source_links.go:48-68` |
| READ (Existenzprüfung) | s.o. (`admin_content_jellyfin_intake.go:44`, `:96-102`) | `EXISTS (... asl.source = ANY($1))` | s.o. |
| **Kein WRITE bei Resync/Connect** | `ApplyJellyfinSyncMetadata`/`ApplyAnimeMetadataFromJellyfin` schreiben NUR `anime.source`/`anime.folder_name`, NICHT `anime_source_links` | — | `admin_content_sync.go:212-230` (kein `INSERT INTO anime_source_links` in diesem Pfad) |
| **Kein DELETE-Pfad bisher** | Keine bestehende Handler-/Repo-Funktion löscht Zeilen aus `anime_source_links` | — | Grep über `backend/internal/` bestätigt: nur `syncAnimeSourceLinks` (INSERT) und `loadAnimeSourceLinks` (SELECT) existieren — für D-18 "Ordner lösen" muss ein neuer `DELETE`-Pfad ergänzt werden (siehe §11) |

**Konsequenz für D-05:** Wenn Discovery einen bestehenden Anime über
`ApplyAnimeMetadataFromJellyfin` "verbindet", landet die Jellyfin-Referenz in `anime.source` (sofern
dort noch leer) — nicht zusätzlich in `anime_source_links`. Für die künftige
Existenzprüfung reicht das (sie prüft beide Orte), aber falls der Anime bereits eine
`anisearch:`-Referenz in `anime.source` trägt (aus dem AniSearch-Create), wird `anime.source` durch
`ApplyJellyfinSyncMetadata` **nicht** überschrieben, außer `forceSourceUpdate=true` — genau das
tritt ein, wenn die Discovery-UI die Jellyfin-Serien-ID explizit mitgibt (`explicitSeriesID != ""`,
`jellyfin_metadata_resync.go:203`). Das würde die vorhandene `anisearch:`-Referenz in `anime.source`
mit `jellyfin:<id>` überschreiben. **Das ist ein Constraint, das der Planner explizit beachten
muss**: entweder die Anwendung schreibt die Jellyfin-Referenz stattdessen in `anime_source_links`
(neuer, aber minimaler Codepfad), oder D-05 wird bewusst so verstanden, dass `anime.source` bei
AniSearch-Anime unverändert bleiben soll und die Jellyfin-Referenz ausschließlich über
`anime_source_links` läuft. **[ASSUMED]** Dies ist keine im Code vorgefundene Tatsache, sondern eine
Lücke, die die Planung schließen muss (siehe Assumptions Log A1).

### `anime.folder_name` (Spalte)

| Aktion | Ort | Bedingung | Beleg |
|--------|-----|-----------|-------|
| WRITE (Create) | `createAnimeV2`/`createAnimeLegacy` | `input.FolderName` aus dem Draft (z. B. `appendJellyfinLinkageToCreatePayload` setzt `folder_name = preview.jellyfin_series_path`) | `admin_content_anime_create_v2.go:196-197`; Frontend: `frontend/.../create/createPageHelpers.ts:82-98` |
| WRITE (Resync/Connect, bedingt) | `ApplyJellyfinSyncMetadata` | Gleiche CASE-Logik wie `source`: nur wenn leer ODER `forceSourceUpdate=true` | `admin_content_sync.go:220-224` |
| WRITE (Edit-Merge, AniSearch) | `mergeAniSearchEditDraft` | `applyString("folder_name", &next.FolderName, incoming.FolderName)` — AniSearch liefert i. d. R. keinen `folder_name`, daher meist No-Op | `backend/internal/handlers/admin_content_anime_enrichment_edit.go:144` |
| READ (Existenzprüfung) | `anime.folder_name = ANY($2::text[])` | Exakter, case-sensitiver String-Vergleich, **keine** Normalisierung (kein Trailing-Slash-Trim, kein Path-Separator-Fold) | `admin_content_jellyfin_intake.go:51`, `:117` |
| READ (Anzeige/Fallback) | Episode-Version-Ordnerauflösung (`resolveEpisodeVersionFolderPath`, laut STATE.md-Eintrag 260915-dws) | Fallback, wenn Jellyfin nicht erreichbar ist | `.planning/STATE.md:1475` (Kontext, nicht Code) |

**Tatsächliche Semantik heute:** `folder_name` speichert exakt den Jellyfin-`Path`-String der Serie
zum Zeitpunkt des Create/Sync (kein eigenständiges, normalisiertes Konzept). Der Name ist irreführend
— es ist keine reine "Ordner-Bezeichnung" (z. B. `"Naruto"`), sondern ein **voller Pfad**
(z. B. `/media/Anime/Serie/Anime.TV.Sub/Naruto`, siehe Bestandshinweis in `165-CONTEXT.md:73`).

### Jellyfin `Path` (aus der Jellyfin-API, kein DB-Feld)

Live-Befund (siehe §2 unten): In der aktuell konfigurierten Bibliothek (`CollectionType=tvshows`)
ist `Path` für **jedes** Item — Serie oder "Film" — ein **Ordnerpfad**, niemals ein Dateipfad. Das
gilt auch für Items unter dem Movie-Unterordner (`/media/Anime/Movie/Anime.Film.Sub/...`). Die
Datei selbst liegt eine Ebene tiefer und ist nur über `/Shows/{id}/Episodes` → `MediaSources[].Path`
sichtbar, niemals über `Items[].Path` der Serie/des "Films" selbst.

## §2 — Movie-Pfade vs. `folder_name`-Existenzcheck (live verifiziert)

**Live-Prüfung durchgeführt** gegen `http://192.168.235.100:8098` (Jellyfin, aus `.env` via
`docker compose ps` bestätigt erreichbar, HTTP 200 auf `/System/Info` in 90 ms).

1. `Library/VirtualFolders` liefert genau **eine** relevante Bibliothek:
   `Name="Fansubs"`, `ItemId=5f65d0c8bdd71b782fc98205814a0d76`, `CollectionType=tvshows`, mit 8
   Ordner-Locations, darunter `/media/Anime/Movie/Anime.Film.Sub`.
2. `GET /Items?IncludeItemTypes=Movie&Recursive=true` (serverweit, ohne `ParentId`) liefert
   `TotalRecordCount: 0` — **es existiert kein einziges Jellyfin-Item vom Typ `Movie`** in dieser
   Instanz.
3. `GET /Items?IncludeItemTypes=Series,Movie&Recursive=true&ParentId=5f65d0c8bdd71b782fc98205814a0d76`
   liefert `TotalRecordCount: 2111`, alle mit `"Type": "Series"` — identisch zur reinen
   `IncludeItemTypes=Series`-Abfrage.
4. Von diesen 2111 Items liegen 78 unter `/media/Anime/Movie/Anime.Film.Sub/...` (z. B.
   `"009 Re:Cyborg"`, Id `bcdb7937656625bcc3b59a6e3e45403b`, `Path:
   "/media/Anime/Movie/Anime.Film.Sub/009 ReCyborg (2012)"`, `IsFolder: true`, `Type: "Series"`).
5. Detailabfrage der Episoden dieses "Films" (`GET /Shows/{id}/Episodes`) liefert genau **eine**
   Episode mit `MediaSources[0].Path =
   ".../009 ReCyborg (2012)/009 ReCyborg (2012)-NanaOne.mkv"`, `IndexNumber: 9`,
   `ParentIndexNumber: 0`. Jellyfins eigener Metadaten-Abgleich hat den Dateinamen ("009 ReCyborg")
   fälschlich als Episodennummer 9 einer Season-0-Folge interpretiert und einen Titel
   ("Cyborg 009 x Nittele \"ZIP!\"") aus einer Fremd-Metadatenquelle zugeordnet — ein konkretes,
   live beobachtetes Beispiel für die in §21–§24 des Auftrags beschriebene Fehlerklasse (relevant
   für Phase 166, hier nur dokumentiert, nicht behandelt).

**Schlussfolgerung für D-03:** Die befürchtete Situation ("Movie-`Path` = Datei statt Ordner")
**tritt in der aktuellen Konfiguration nicht auf**, weil die gesamte Bibliothek als `tvshows`
eingerichtet ist und Jellyfin deshalb jeden Titel — Serie wie Film — als `Series`-Item mit
Ordner-`Path` behandelt. Der bestehende `anime.folder_name = ANY($2::text[])`-Vergleich
(`admin_content_jellyfin_intake.go:51`) funktioniert für "Film"-Einträge strukturell **genauso** wie
für Serien: exakter String-Vergleich zweier Ordnerpfade. Das entkräftet D-03s Sonderregel ("bis
dahin zählt für Movies nur die Jellyfin-ID als sichere Referenz") **für diese konkrete Instanz** —
sie bleibt aber als Absicherung sinnvoll, falls jemals eine zweite, als `movies` typisierte
Jellyfin-Bibliothek hinzukommt (dort wäre `Type=Movie` real und `Path` typischerweise ein
Dateipfad). **[VERIFIED: reale Jellyfin-12-Instanz, Live-Abfrage 2026-09-21]**

**Praktische Konsequenz für D-06/§4/§17:** Eine Abfrage mit `IncludeItemTypes=Series,Movie` bringt in
dieser Instanz keinen Mehrwert gegenüber der bestehenden `IncludeItemTypes=Series`-Abfrage — sie
liefert nachweislich dieselben Treffer. Der Plan sollte trotzdem `Series,Movie` anfragen (kostet
nichts, ist zukunftssicher, falls je eine echte Movie-Bibliothek hinzukommt), darf sich aber **nicht**
darauf verlassen, dass Jellyfins `Type`-Feld zwischen Serie und Film unterscheidet. Die
Typ-Anzeige/-Filterung in der Discovery-Liste muss die bestehende Heuristik
`buildJellyfinIntakeTypeHint` (`jellyfin_intake_helpers.go:202-239`, Pfad-/Namens-Token wie
"movie"/"film"/"ova"/"special") wiederverwenden.

## §3 — Create-Seite: Post-Save-Navigation heute

**Aktuelles Verhalten (gilt für JEDEN erfolgreichen Create — manuell, Jellyfin-Direktflow,
AniSearch-Direktflow — es gibt heute keine Verzweigung):**

```
handleCreateSubmit() [useAdminAnimeCreateController.ts:671-784]
  → createManualAnimeAndRedirect(payload, { createAdminAnime, setLocationHref: () => undefined })
  → POST /api/v1/admin/anime  (oder .../anime/jellyfin-draft-Variante)
  → uploadCreatedAnimeAssets(response.data.id, ...)
  → setSuccessMessage(...)
  → window.setTimeout(() => {
        window.location.href = buildManualCreateRedirectPath(response.data.id)
     }, CREATE_REDIRECT_DELAY_MS)   // 1600 ms Verzögerung
```

`buildManualCreateRedirectPath(id)` liefert **immer** `/admin/anime?created=${id}#anime-${id}` —
die Admin-Anime-**Übersichtsliste**, mit dem neuen Eintrag hervorgehoben (Beleg:
`frontend/src/app/admin/anime/create/createPageHelpers.ts:21-29`, Aufruf in
`useAdminAnimeCreateController.ts:774-776`). Das entspricht exakt der im Auftrag (§15) beschriebenen
Ist-Situation ("Anime speichern → Liste → Anime erneut suchen → Edit → Episoden").

**Es gibt heute keinen Verzweigungspunkt** nach Anime-Typ oder nach Herkunft (Discovery vs. manuell).
Die Zielrouten für D-10 existieren als eigenständige Seiten:
- `/admin/anime/{id}/edit` (Editor, inkl. Jellyfin-Resync-Panel `AnimeJellyfinMetadataSection.tsx`)
- `/admin/anime/{id}/episodes` (Episoden-Übersicht, mit Link auf `/admin/anime/{id}/episodes/import`
  für den eigentlichen Jellyfin-Episodenimport — Beleg:
  `frontend/src/app/admin/anime/[id]/episodes/page.tsx:249-260`)

**Für D-10 nötig:** Der Create-Controller muss (a) wissen, dass der aktuelle Create-Vorgang aus
Discovery stammt (z. B. über einen Query-Param wie `?from=discovery` beim Aufruf der Create-Seite,
konsistent mit D-11), und (b) je nach `anime.type` nach dem Create entweder zu
`/admin/anime/{id}/episodes` (Serie) oder `/admin/anime/{id}/edit` (Film, bis Phase 166) statt zu
`/admin/anime?created=...` weiterleiten. Der bestehende Redirect für den manuellen/direkten Flow darf
dabei **nicht verändert** werden (D-10 explizit: "Nur der Assisted-/Discovery-Flow ... Manuelle/
direkte Create-Wege behalten ihr heutiges Verhalten").

**Offene Detailfrage für den Planer:** Soll das Ziel für Serien `/admin/anime/{id}/episodes`
(Übersicht, wörtlich "Episoden-Tab") oder direkt `/admin/anime/{id}/episodes/import` (der Jellyfin-
Importbildschirm, der die Serien-ID aus der Discovery direkt weiterverwenden könnte) sein? Beide
Routen existieren bereits; siehe Open Questions.

## §4 — Jellyfin-Draft-Aufbau und AniSearch-Merge (bestehende Pipeline, wiederzuverwenden)

**Schritt 1 — Jellyfin-Auswahl → Draft (bereits vollständig implementiert):**

`handleJellyfinCandidateAdopt(candidateID)` (`useAdminAnimeCreateController.ts:904-941`):
1. `jellyfinIntake.loadPreview(candidateID)` → `POST /admin/jellyfin/intake/preview`
   (`PreviewAnimeIntakeFromJellyfin`, Route: `admin_routes.go:90`) → liefert
   `AdminJellyfinIntakePreviewResult` mit `JellyfinSeriesID`, `JellyfinSeriesName`,
   `JellyfinSeriesPath`, `FolderNameTitleSeed`, `Year`, `Genre`, `Tags`, `AniDBID`, `TypeHint`,
   `AssetSlots` (Cover/Logo/Banner/Backgrounds/BackgroundVideo als Proxy-URLs) — Beleg:
   `jellyfin_intake_helpers.go:119-150`.
2. `hydrateManualDraftFromJellyfinPreview(manualDraftValues, preview, ...)` übernimmt diese Felder
   in den bestehenden manuellen Draft-State (derselbe State wie beim manuellen Anlegen).
3. `setJellyfinAssetSlots(hydrated.assetSlots)` — Assets werden separat gehalten (Cover/Banner/…).
4. `setHasAdoptedJellyfinPreview(true)`.

**Genau dieser Ablauf ist D-08.** Discovery muss keine neue Datenstruktur erfinden — sie muss
lediglich (a) dieselbe `candidateID` (Jellyfin Item-ID) an dieselbe Adopt-Funktion übergeben, entweder
direkt beim Laden der Create-Seite (Query-Param `?jellyfin_id=<id>`) oder über einen In-Page-Zustand,
wenn Discovery als Modus derselben Seite implementiert wird.

**Schritt 2 — AniSearch-Suche (D-09, aktuell NICHT vorbelegt):**

Recherchebefund: Der AniSearch-Suchbegriff-State `createAniSearchSearchQuery`
(`useAdminAnimeCreateController.ts:223`) wird **nicht automatisch** aus dem Jellyfin-Namen befüllt.
`buildAssetSearchSeedQuery()` (Zeilen 604-612) nutzt zwar `jellyfinPreview?.jellyfin_series_name` als
Fallback-Quelle, aber **nur für die Asset-Bildsuche**, nicht für das AniSearch-Suchfeld selbst. D-09
("AniSearch-Suche vorbelegt mit dem Jellyfin-Namen") ist damit ein **neues** Verhalten, das ergänzt
werden muss (z. B.: nach `handleJellyfinCandidateAdopt`, wenn `createAniSearchSearchQuery` noch leer
ist, `setCreateAniSearchSearchQuery(preview.jellyfin_series_name)` aufrufen — reine Vorbelegung,
keine automatische Suche/Auswahl).

**Schritt 3 — AniSearch-Auswahl → Merge (bereits vollständig implementiert, D-14/§14):**

`AnimeCreateEnrichmentService.Enrich()` (`anime_create_enrichment.go:1192-1268`):
1. Dublettencheck `FindAnimeBySource("anisearch:<id>")` (§7 unten).
2. `buildAniSearchDraftPayload(aniSearchAnime)` baut den AniSearch-Feld-Datensatz
   (`anime_create_enrichment.go:1345-1363`): Titel, Typ (`mapAniSearchFormatToAnimeType`, u. a.
   `"movie"/"film" → "film"`), Jahr, MaxEpisodes, Genre, Beschreibung, Source
   (`"anisearch:<id>"`), AltTitles, Tags.
3. `mergeCreateDraftPayload(&draft, aniSearchDraft, ...)` (`anime_create_enrichment.go:1405+`):
   AniSearch füllt **nur leere** Zielfelder; bereits gesetzte (Jellyfin- oder manuelle) Werte bleiben
   erhalten und werden in `manualFieldsKept` protokolliert (sichtbar in der UI-Zusammenfassung).
4. Frontend-seitig existiert eine zweite, gleichwertige Schutzschicht:
   `resolveCreateAniSearchDraftMergeInputs` (`createPageHelpers.ts:273-300`) markiert jedes Feld, das
   vom Jellyfin-Ausgangszustand (`jellyfinSnapshot`) abweicht, als `protectedFields` — diese werden in
   `hydrateManualDraftFromAniSearchDraft` (`useManualAnimeDraft.ts:132-139`) beim AniSearch-Merge
   **nicht** überschrieben.

**Ergebnis:** Jellyfin bleibt technische Quelle für `Path`/Assets, AniSearch überschreibt nur leere
oder AniSearch-eigene Felder — exakt der in §14 des Auftrags geforderte Zustand ist bereits
Code-Realität und darf **nicht verändert** werden (D-09: "bestehendes Merge-Verhalten bleibt").

## §5 — Jellyfin-`/Items`-Abfrage für Discovery: reale Messung (read-only, live)

**Umgebung:** `.env` → `JELLYFIN_BASE_URL=http://192.168.235.100:8098`,
`JELLYFIN_ALLOWED_LIBRARY_IDS=5` (fehlerhaft, siehe unten). Reale Instanz über
`docker compose ps` bestätigt erreichbar; Backend-Container läuft im selben Netzwerksegment.

**a) Anzahl konfigurierter/erlaubter Library-IDs:** `.env` enthält genau eine ID (`"5"`), aber diese
ist **keine gültige Jellyfin-GUID**. Live-Test:

```
GET /Items?IncludeItemTypes=Series&Recursive=true&ParentId=5&Limit=3
→ HTTP 400 {"errors":{"parentId":["The value '5' is not valid."]}}
```

Die reale Bibliotheks-ID (aus `GET /Library/VirtualFolders`) lautet
`5f65d0c8bdd71b782fc98205814a0d76` (Name "Fansubs", `CollectionType=tvshows`). **Mit dieser
korrekten GUID funktioniert der bestehende Code (`jellyfin_client_series.go:78-103`,
Filtered-Branch) einwandfrei** — das Problem liegt ausschließlich in der Konfigurationswert
`JELLYFIN_ALLOWED_LIBRARY_IDS=5`, nicht im Anwendungscode. **[VERIFIED: reale Jellyfin-12-Instanz,
Live-Abfrage 2026-09-21]** — dies ist keine Aufgabe dieser Phase, muss aber im Abschlussbericht als
Blocker für den produktiven Einsatz von Discovery vermerkt werden (siehe Open Questions).

**b) Anzahl HTTP-Requests für einen vollständigen Discovery-Cache-Aufbau:** Mit korrekter GUID
genügt **ein** Request für die gesamte Bibliothek (kein Requests-pro-Item, kein Requests-pro-Seite):

```
GET /Items?IncludeItemTypes=Series,Movie&Recursive=true&ParentId=5f65d0c8bdd71b782fc98205814a0d76
    &Fields=Path&EnableTotalRecordCount=true
→ HTTP 200, TotalRecordCount=2111, Items.length=2111
```

Bei mehreren erlaubten Libraries ergibt sich (analog zum bestehenden Muster in
`jellyfin_client_series.go:78-103`) **ein Request je Library** — unabhängig von der späteren
Seitenzahl der Discovery-Liste. Das erfüllt D-07 wörtlich ("Jellyfin-Requests unabhängig von der
Seitenzahl, nur beim Cache-Aufbau, je Library").

**c) Payload-Größe:** 1.456.865 Bytes (≈ 1,46 MB) für 2111 Items mit `Fields=Path` (zusätzlich
Standardfelder wie `ImageTags`, `BackdropImageTags`, `PremiereDate` etc., die Jellyfin immer
mitliefert). Für ein noch schlankeres Payload sollten nur wirklich benötigte `Fields` angefragt
werden (`Id,Name,Path,ProductionYear` reichen für D-06 — `Fields=Path` ist das Minimum, das zusätzlich
zu Default-Feldern nötig ist).

**d) Latenz:** 2,39 s für den vollständigen Bibliotheks-Fetch (2111 Items), 0,58 s für eine
`Limit=1`-Abfrage mit `EnableTotalRecordCount=true` (Netzwerk-Overhead + Jellyfin-interne
Aufbereitung). Für ein TTL-basiertes Caching (D-06 "Kurzlebiger serverseitiger Cache ist erlaubt")
ist das unkritisch, sollte aber asynchron/außerhalb des Request-Zyklus einer einzelnen
Discovery-Seite passieren (Cache-Warmup, nicht Cache-on-demand pro Seitenaufruf).

**e) Detailrequests:** Bestätigt 0 Detailrequests vor Auswahl — `buildAdminJellyfinIntakeSearchItem`
nutzt für Poster/Banner/Logo/Backdrop ausschließlich `buildGroupMediaImageURL` (reine
String-Konstruktion, `group_assets_jellyfin.go:586-595`), keinen zusätzlichen Jellyfin-HTTP-Call.
Der einzige "Detail"-Call (`getJellyfinSeriesIntakeDetail`, mit `ProviderIds,Genres,Tags`) passiert
ausschließlich beim `PreviewAnimeIntakeFromJellyfin`-Endpunkt, also erst nach Nutzerauswahl.

**f) Existenzprüfung pro Discovery-Seite:** `FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)`
ist bereits eine einzelne Batch-Query für beliebig viele IDs/Pfade
(`admin_content_jellyfin_intake.go:42-53`/`105-119`) — ≤ 1 DB-Query pro Seite ist strukturell
gegeben, solange Discovery sie einmal pro angeforderter Seite (mit den IDs/Pfaden dieser Seite)
aufruft.

**g) Nachmessung für D-15 (Season-Batch, read-only, dieser Recherche-Durchlauf, 2026-09-21):**

```
GET /Items?IncludeItemTypes=Season&Recursive=true&ParentId=5f65d0c8bdd71b782fc98205814a0d76
    &Fields=Path&EnableTotalRecordCount=true
→ HTTP 200, TotalRecordCount=2231, Items.length=2231, Größe ≈ 2,61 MB, Latenz ≈ 28,2 s
```

Ein einzelner `IncludeItemTypes=Season`-Request pro erlaubter Library liefert **alle** Season-Items
der Bibliothek batched (kein Request pro Serie) — erfüllt D-15s Vorgabe "Staffeldaten nur gebündelt
abrufen". Jedes Season-Item trägt `SeriesId` und `IndexNumber` (die Staffelnummer, `0` = Specials).
Auswertung der 2231 Items: **2111 Serien haben Season-Daten** (1:1 zur Serienzahl — jede Serie hat
mindestens eine "Season"), davon **27 Serien (≈1,3 %) mit mehr als einer echten Staffel**
(`IndexNumber >= 1`, Season 0/Specials ausgeklammert), z. B. eine Serie mit 16 durchnummerierten
Staffeln (`IndexNumber` 1–16). Das bestätigt live, dass D-15s Szenario real vorkommt, aber ein
Nischenfall ist (nicht der Regelfall). **Latenz-Warnung:** 28,2 s für diesen einen Request ist
deutlich langsamer als der vergleichbare Series-Fetch (2,39 s für ähnliche Datenmenge/-größe,
siehe (d)) — vermutlich weil Jellyfin Season-Entitäten pro Serie serverseitig aus dem
Serien-Metadatenbaum ableiten muss, statt sie wie Serien direkt zu indizieren. **Für D-15 heißt das:
Der Season-Snapshot gehört in denselben TTL-Cache-Warmup-Zyklus wie der Series-Snapshot (D-06/D-19),
niemals in den Request-Pfad einer einzelnen Discovery-Seite.** **[VERIFIED: reale
Jellyfin-12-Instanz, Live-Abfrage 2026-09-21, read-only, `IncludeItemTypes=Season`]**

## §6 — Bestehendes Cursor-/Pagination-Muster

**Fundort:** `backend/internal/repository/release_cursor_pagination.go` (vollständig gelesen).
Kernkomponenten:
- `DefaultCursorPageLimit = 24`, `MaxCursorPageLimit = 100` (Konstanten, Discovery kann eigene
  Werte definieren, Richtwert laut CONTEXT.md 50).
- `clampCursorLimit(limit)` — erzwingt gültigen Limit-Bereich.
- `trimCursorPage[T any](items, limit, cursorFn)` — generische "Limit+1-Overfetch"-Regel: Repository
  fragt `LIMIT limit+1` an; wenn mehr als `limit` Elemente zurückkommen, wird `has_more=true`
  gesetzt, das Element `limit+1` abgeschnitten und `next_cursor` aus dem letzten verbleibenden
  Element gebildet.
- `encodeCursorPair`/`decodeCursorPair` — Base64(`part1|part2`), generisch für zwei String-Teile.
- Spezialisierungen `encodeInt32Int64Cursor`, `encodeTimeInt64Cursor`,
  `encodeMixedReleaseCursor` (versioniert, z. B. `"release-v2|..."`) als Vorbild für einen eigenen,
  versionierten Discovery-Cursor.
- **Verhalten bei ungültigem/leerem Cursor:** "stiller Neustart" bei Seite 1, kein 400-Fehler
  (Kommentarblock `release_cursor_pagination.go:1-9`).

**Wichtige Einschränkung für Discovery:** Alle bisherigen Cursor-Verwender paginieren über eine
SQL-`ORDER BY`-Sequenz direkt in Postgres. Discovery hingegen baut die Grundmenge aus einem
gecachten Jellyfin-Snapshot (Application-Memory oder Redis) und reichert sie mit einer DB-Batch-Query
an — die Cursor-Position muss also gegen die **sortierte In-Memory-/Cache-Liste** aufgelöst werden
(z. B. Schlüssel `(Name, JellyfinItemID)` oder `(SortIndex)`), nicht gegen eine SQL-`WHERE`-Klausel.
Die Kodierungs-Bausteine (`encodeCursorPair` & Co.) sind trotzdem 1:1 wiederverwendbar; nur der
Seek-Vergleich muss neu geschrieben werden.

**Frontend-Pendant:** Kein fertiger "Cursor-Consumer-Hook" gefunden; `useNearViewportActivation`
(`frontend/src/hooks/useNearViewportActivation.ts:5`) ist ein reiner Intersection-Observer-Hook für
verzögertes Nachladen bei Sichtbarkeit — nutzbar für "Mehr laden"/Infinite-Scroll-UI, aber kein
State-Management für Cursor/Filter selbst. Letzteres existiert in der Codebasis nicht generisch und
müsste für Discovery neu (aber einfach) gebaut werden.

## §7 — AniSearch-Dedup/"Verbinden"-Flow (bestehend vs. für D-02 fehlend)

**Was heute existiert (Backend):**
- `Enrich()` prüft `FindAnimeBySource("anisearch:<id>")` **vor** dem eigentlichen AniSearch-Fetch.
  Bei Treffer wird **kein Draft** aufgebaut, sondern ein `AdminAnimeAniSearchEnrichmentRedirectResult`
  mit `Mode: "redirect"`, `ExistingAnimeID`, `ExistingTitle`, `RedirectPath` zurückgegeben
  (`anime_create_enrichment.go:1201-1212`, `RedirectPath` via `buildAdminAnimeEditPath(id)` =
  `/admin/anime/{id}/edit`, `anime_create_enrichment.go:1692` / gleichnamige Funktion auch in
  `admin_content_anime_enrichment_edit.go:210-212`).
- Der Edit-Flow (`LoadAnimeAniSearchEnrichment`, für einen bereits existierenden Anime, der eine
  AniSearch-ID nachträglich zugewiesen bekommt) macht denselben Check, gibt bei Konflikt aber HTTP
  409 mit `Mode: "conflict"` zurück (`admin_content_anime_enrichment_edit.go:39-58`).

**Was heute existiert (Frontend):**
- `CreateAniSearchIntakeCard.tsx:150-164` rendert bei `conflict` **ausschließlich** einen Link "Zum
  vorhandenen Anime wechseln" (`<Link href={conflict.redirectPath}>`). **Es gibt keine
  "Als neuen Anime anlegen"-Option in der bestehenden UI.** D-02s "Dort bekommt der Benutzer die
  Wahl 'Mit bestehendem Anime verbinden' / 'Als neuen Anime anlegen'" ist damit **kein reiner
  UI-Wrapper um Bestehendes**, sondern erfordert eine **neue** UI-Entscheidung plus (mindestens für
  "trotzdem neu anlegen") einen Weg, den bestehenden Backend-Block zu umgehen.
- DB-seitig gibt es **keinen UNIQUE-Constraint** auf `anime.source`/`anisearch_id` (nur ein
  Non-Unique-Index, `database/migrations/0008_expand_anime_episode_columns.up.sql:13`,
  `0045_reconcile_db_schema_v2_columns.up.sql:21`) — ein "trotzdem neu anlegen" ist auf DB-Ebene
  unkritisch möglich, es ist eine reine Backend-/Frontend-Entscheidung, ob/wie sie zugelassen wird.

**Für D-05 der bessere Schreibpfad (statt eines neuen Endpunkts):**
`POST /admin/anime/:id/jellyfin/metadata/apply` (`ApplyAnimeMetadataFromJellyfin`,
`jellyfin_metadata_resync.go:134-296`, Route `admin_routes.go:83`) — schreibt `source`/`folder_name`
(force, wenn `jellyfin_series_id` explizit mitgegeben wird) **ohne** einen Episodenimport zu
verlangen, und schützt bereits abweichende Werte (`buildMetadataFieldPreview`, Aktion `"protect"`,
`jellyfin_metadata_resync.go:433-446`). Die zugehörige UI existiert bereits im Editor
(`AnimeJellyfinMetadataSection.tsx`) und kann als Vorlage für einen Discovery-seitigen "Verbinden"-
Dialog dienen, der Backend-seitig denselben Endpunkt mit vorausgefüllter `jellyfin_series_id` aufruft.

**D-20-Einfügepunkt (in diesem Recherche-Durchlauf zusätzlich verifiziert):** Der eigentliche
Create-Write findet in `CreateAnime` (`backend/internal/handlers/admin_content_anime.go:21-50`) statt:
`item, err := h.repo.CreateAnime(c.Request.Context(), input, identity.UserID)` (Zeile 41). Für D-20
("unmittelbar vor dem Anlegen erneut auf `anisearch:<id>` prüfen") ist das die richtige Stelle: direkt
vor diesem Aufruf `h.repo.FindAnimeBySource(ctx, "anisearch:"+id)` erneut aufrufen (dieselbe
Repository-Methode wie in `Enrich()`, `admin_content_anisearch.go:14-53`) und bei Treffer denselben
Redirect-/Konflikt-Payload wie in §7 zurückgeben, statt stillschweigend `CreateAnime` auszuführen.
Das ist ein reiner Zusatzcheck (1 zusätzliche `SELECT`-Query mit `LIMIT 1`), keine Änderung an
`CreateAnime` selbst nötig — nur ein Guard davor.

## §8 — D-14: Episoden-Import-Ordnerauswahl bei mehreren verbundenen Jellyfin-Ordnern

**Ist-Zustand (verifiziert):**
- Der **Preview**-Endpunkt (`PreviewEpisodeImport`, `admin_episode_import.go:40-104`) akzeptiert
  bereits ein optionales `jellyfin_series_id`-Feld im Request
  (`adminEpisodeImportPreviewRequest.JellyfinSeriesID`, `admin_episode_import_validation.go:12`).
  Zeile 73: `jellyfinSeriesID := firstNonEmptyString(req.JellyfinSeriesID,
  derefString(contextResult.JellyfinSeriesID))` — wenn der Client eine ID mitgibt, hat sie Vorrang
  vor der aus `anime.source`/`anime_source_links` automatisch aufgelösten ID
  (`contextResult.JellyfinSeriesID`, gebaut in `loadEpisodeImportContext`,
  `admin_episode_import.go:159-190`).
- Der **Apply**-Endpunkt (`ApplyEpisodeImport`, `admin_episode_import.go:108-155`) hat **kein**
  `JellyfinSeriesID`-Feld (`adminEpisodeImportApplyRequest`, `admin_episode_import_validation.go:16-20`
  enthält nur `CanonicalEpisodes`, `MediaCandidates`, `Mappings`) — er arbeitet ausschließlich mit den
  bereits im Preview-Schritt aufgelösten `MediaItemID`/`MediaSourceID`-Paaren. **Die Ordnerauswahl muss
  daher am Preview-Schritt ansetzen, nicht am Apply-Schritt.**
- `loadEpisodeImportMediaCandidates(c, jellyfinSeriesID, folderPath)`
  (`admin_episode_import.go:356-380`) ruft mit dieser ID direkt `h.listJellyfinEpisodes(ctx,
  jellyfinSeriesID)` auf — **ohne jede Prüfung, ob diese ID überhaupt zu diesem Anime gehört.**

**Fail-closed-Prüfung (D-14, neu zu bauen):** `loadEpisodeImportContext` lädt bereits
`source.SourceLinks []string` über `GetAnimeSyncSource` (Struct `models.AdminAnimeSyncSource`,
`backend/internal/models/admin_content.go:412-419`). Daraus lässt sich ohne zusätzlichen DB-/
Jellyfin-Call eine Allow-Liste bauen: alle `jellyfin:<id>`-Präfixe aus `source.Source` **und**
`source.SourceLinks` (dieselbe Extraktionslogik wie `extractJellyfinSeriesIDFromSourceLinks`,
`admin_episode_import.go:204-211`, bereits vorhanden). Bevor `req.JellyfinSeriesID` (falls vom Client
gesetzt) an `loadEpisodeImportMediaCandidates` weitergereicht wird, muss geprüft werden, dass die ID
in dieser Allow-Liste enthalten ist; sonst HTTP 400/403 statt eines Jellyfin-Requests mit einer
fremden Serien-ID.

**UI-seitig (D-14):** Der Import-/Preview-Bildschirm (`frontend/src/app/admin/anime/[id]/episodes/`)
muss, wenn `anime_source_links` mehr als einen `jellyfin:`-Eintrag für den Anime enthält, einen
Ordner-Selector anbieten (Haupt-Ordner aus `anime.source`/`folder_name` vorausgewählt) und die
gewählte ID als `jellyfin_series_id` an `PreviewEpisodeImport` übergeben. Ohne zusätzliche Ordner
(Regelfall heute: 4/4 Bestandsanime mit genau einem Jellyfin-Ordner) bleibt der Import unverändert
(D-14 explizit).

## §9 — D-15: Mehrstaffel-Ordner — Datenlage und Speicher-Optionen (CHECKPOINT-PFLICHTIG)

> **Diese Sektion ist eine Grundlage für einen SEPARATEN Plan mit menschlichem Checkpoint VOR jeder
> Migration/Implementierung, exakt wie in CONTEXT.md D-15 gefordert. Es wird hier bewusst KEIN
> finales Schema festgelegt — nur Optionen mit Tradeoffs.**

**(a) Kennt/speichert der Episoden-Import die Jellyfin-Staffel pro Episode bereits?**

Teilweise ja, aber **nicht persistent**. `models.EpisodeImportMediaCandidate.JellyfinSeasonNumber
*int32` (`backend/internal/models/episode_import.go:49`) wird beim Aufbau der Kandidatenliste aus
Jellyfins `ParentIndexNumber` gesetzt (`admin_episode_import.go:745`:
`season, episode := jellyfinSeasonNumber(item.ParentIndexNumber),
jellyfinEpisodeNumber(item.IndexNumber)`). Es wird ausschließlich als **Beweis-/Hinweisfeld für
Vorschlags-Heuristiken** verwendet (Season-Offset-Akkumulation für die Episodennummerierung,
`buildEpisodeImportSeasonBaseOffsets`, `admin_episode_import.go:564-596`) — es fließt **nirgends** in
eine `INSERT`/`UPDATE`-Anweisung von `EpisodeImportRepository.Apply()`
(`episode_import_repository_apply.go`) ein. Verifiziert per Grep über `episode_import_repository*.go`:
keine `season`-Spalte in `episodes`, `episode_titles`, `release_variants` oder verwandten Tabellen.
**Schlussfolgerung: Eine Staffel→Anime-Zuordnung ist aus dem heutigen Bestand NICHT ableitbar — die
Information existiert nur transient während eines einzelnen Import-Preview-Requests und wird danach
verworfen.** Team4s speichert heute (wie CONTEXT.md bereits vermutet) keine Staffel→Anime-Zuordnung.

**(b) Live-Messung der Datenmenge (siehe §5g):** Ein batched `IncludeItemTypes=Season`-Request pro
Library liefert alle Season-Items in einem Request (2231 Items für 2111 Serien, 27 Serien mit
echter Mehrstaffeligkeit). Das erfüllt D-15s Vorgabe zur gebündelten Abfrage. Die Latenz (28,2 s für
diesen einen Request) ist unkritisch für einen periodischen Cache-Warmup, aber ungeeignet für einen
Live-Call pro Seitenaufruf.

**(c) Speicher-Optionen (ohne Festlegung, zur Entscheidung durch den Auftraggeber):**

| Option | Beschreibung | Vorteil | Nachteil |
|--------|--------------|---------|----------|
| **Option A — neue Tabelle** `jellyfin_season_anime_mappings` (Name als Platzhalter) mit Spalten etwa `jellyfin_series_item_id`, `season_index`, `anime_id`, `server_key` (D-22), `created_by_app_user_id`, `created_at` | Eigene, saubere Tabelle analog zu `anime_source_links`, aber mit zusätzlicher `season_index`-Dimension | Klar strukturiert, einfache Queries (`WHERE jellyfin_series_item_id=$1`), erweiterbar für D-22 (Mehrserver) | Neue Tabelle + neue Migration + neuer Repo-/Handler-Code; eine Staffel kann zu genau einem Anime gehören (UNIQUE nötig) oder auch nicht (Klärungsbedarf) |
| **Option B — neue Semantik in `anime_source_links.source`** z. B. `jellyfin-season:<seriesId>:<seasonIndex>` als zusätzlicher `source`-Wert neben `jellyfin:<seriesId>` | Keine neue Tabelle, nutzt bestehende Infrastruktur (Composite-PK, bestehende Lese-Pfade `loadAnimeSourceLinks`/Existenzprüfung) | Minimal-invasiv, Existenzprüfung (`FindExistingAnimeByJellyfinIntakeRefs`) müsste nur um dieses Präfix-Pattern erweitert werden | `anime_source_links.source` hat ein **globales `UNIQUE(source)`-Constraint** (nicht nur `UNIQUE(anime_id, source)`) — das passt zur 1-Staffel-zu-1-Anime-Annahme, verhindert aber jede zukünftige Mehrdeutigkeit; vermischt zwei fachlich unterschiedliche Konzepte (Ordner-Verknüpfung vs. Staffel-Verknüpfung) in einer Spalte mit reiner String-Konvention statt Typisierung |
| **Option C — Kein Persistenz, nur UI-Ableitung pro Request** (Staffel-Zuordnung wird bei jedem Discovery-Aufruf aus den bereits verbundenen Animes des Ordners live neu berechnet, z. B. "welche Episodennummern sind schon importiert") | Kein Schema-Änderungsrisiko | Widerspricht D-15 direkt ("Team4s speichert heute keine Staffel→Anime-Zuordnung" wird als Lücke benannt, die geschlossen werden soll) und liefert keinen stabilen "teilweise"-Status zwischen Sessions | Nicht empfohlen, nur der Vollständigkeit halber dokumentiert |

**Empfehlung (unverbindlich, zur Diskussion im separaten D-15-Plan):** Option A wirkt am saubersten
und am besten vereinbar mit D-22 (server_key-Spalte von Anfang an), erfordert aber am meisten neuen
Code. Option B ist die sparsamste Erweiterung, kollidiert aber konzeptionell mit dem bereits
dokumentierten globalen `UNIQUE(source)`-Constraint auf `anime_source_links` (Pitfall siehe §13)
und vermischt Ordner- und Staffel-Semantik in einer Spalte. **Diese Empfehlung ersetzt NICHT die
laut D-15 geforderte Vorlage beim Auftraggeber vor jeder Migration/Implementierung.**

**Status-Berechnung "teilweise" (sobald Speicherform feststeht):** Ein Jellyfin-Series-Item gilt als
"teilweise", wenn (a) seine Season-Snapshot-Daten mehr als eine echte Staffel zeigen (`IndexNumber >=
1`, Season 0 ausgeklammert — siehe §5g) UND (b) noch nicht für JEDE dieser Staffeln eine
Staffel→Anime-Zuordnung existiert. Diese Berechnung gehört (analog zur bestehenden Existenzprüfung)
in denselben Batch-Auswertungsschritt wie D-03/D-17 — kein Request/Query pro Listeneintrag.

## §10 — D-16: Umbenannte/verschobene Ordner (neue Jellyfin-ID)

Kein neuer Code nötig. D-16 beschreibt ausdrücklich denselben Weg wie D-05: AniSearch-Auswahl →
Dubletten-Treffer über `anisearch:<id>` → "zusätzlich verbinden" (additiver Write in
`anime_source_links`, siehe §1/§7). Ein Ordner mit neuer Jellyfin-ID nach Umbenennen erscheint in der
Discovery-Liste schlicht als "offen" (die alte ID in `anime.source`/`anime_source_links` zeigt ins
Leere, wird aber nicht aktiv geprüft — Jellyfin liefert die neue ID unter neuem Item, die
Existenzprüfung findet keinen Treffer für die neue ID). Der Benutzer verbindet über den normalen
D-05-Pfad erneut. Das Aufräumen der verwaisten alten Verknüpfung ist laut D-16 explizit **deferred**
(nicht Teil von 165) — keine Lösch-/Migrationslogik für verwaiste `jellyfin:`-Referenzen einplanen.

## §11 — D-17: Ignorieren / Nicht-mehr-ignorieren

**Migrationsmuster (Vorbild `0129_release_playback_entitlements.up.sql`, kleine Zustandstabelle mit
Aktor-Referenz):**

```sql
-- Muster, KEIN finales Schema — Planner entscheidet exakte Spaltennamen/Constraints
CREATE TABLE library_discovery_ignored_items (
    id BIGSERIAL PRIMARY KEY,
    server_key TEXT NOT NULL DEFAULT 'default',       -- D-22-Vorsorge
    jellyfin_item_id TEXT NOT NULL,
    ignored_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    ignored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_library_discovery_ignored_item
    ON library_discovery_ignored_items (server_key, jellyfin_item_id);
```

Dieses Muster ist direkt an `release_playback_entitlement_rules`
(`database/migrations/0129_release_playback_entitlements.up.sql:5-17`, `BIGSERIAL PRIMARY KEY`,
`created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL`,
`created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`) angelehnt. Nächste freie Migrationsnummer nach
Bestand (`0169_episode_classification_labels`) ist **0170**.

**"Nicht mehr ignorieren"** ist ein einfaches `DELETE FROM library_discovery_ignored_items WHERE
server_key=$1 AND jellyfin_item_id=$2` (oder ein Soft-Delete-Flag, falls eine Historie gewünscht
ist — CONTEXT.md verlangt nur Reversibilität, kein Verlaufsprotokoll in dieser Tabelle selbst; die
Historie kommt aus `audit_logs`, siehe §12).

**Status-Prioritäts-Logik (D-17: "bereits vorhanden > ignoriert > teilweise > offen"):** Diese Logik
gehört in denselben neuen Discovery-Status-Resolver, der ohnehin für D-03/D-15 gebaut werden muss
(vorgeschlagener Ort: eine neue Datei `backend/internal/handlers/jellyfin_discovery_status.go` mit
einer reinen Funktion `resolveDiscoveryItemStatus(existing bool, ignored bool, partial bool)
string`), nicht verteilt über mehrere Stellen. Die Ignore-Prüfung selbst muss — wie die
Existenzprüfung — eine einzelne Batch-Query pro Discovery-Seite sein (`WHERE server_key=$1 AND
jellyfin_item_id = ANY($2)`), kein Query pro Item.

**Audit:** Ignorieren/Entignorieren sind laut D-21 Admin-Aktionen mit Attribution — siehe §12. Die
Ignore-Tabelle selbst braucht dafür keine redundante Payload-Spalte; `ignored_by_app_user_id` reicht
für den aktuellen Zustand, `audit_logs` liefert die Historie inkl. eines etwaigen zweiten
"entignoriert von"-Eintrags.

## §12 — D-18: Ordner-Management auf der Anime-Bearbeitungsseite

**Ist-Zustand (verifiziert):** `GetAnimeJellyfinContext`
(`backend/internal/handlers/jellyfin_metadata_resync.go:44-45`) →
`buildAnimeJellyfinContext(ctx, animeSource, explicitSeriesID)` (Zeilen 298-349) liefert heute nur
**eine** `JellyfinSeriesID` (`jellyfinSeriesIDFromAnimeSource(animeSource.Source,
animeSource.SourceLinks)` — die erste gefundene `jellyfin:`-Referenz, egal ob aus `anime.source`
oder aus `anime_source_links`). Der zugehörige Frontend-Typ `AdminAnimeJellyfinContext`
(`frontend/src/types/admin.ts:673-685`) hat entsprechend nur ein einzelnes
`jellyfin_series_id`/`jellyfin_series_name`/`jellyfin_series_path`-Feld, **keine Liste**. D-18
("alle verbundenen Jellyfin-Ordner anzeigen") ist damit **kein reines UI-Feature**, sondern erfordert
eine Backend-Erweiterung: `buildAnimeJellyfinContext` muss zusätzlich `loadAnimeSourceLinks`
(`anime_source_links.go:48-68`, bereits vorhanden) aufrufen und **alle** `jellyfin:`-präfigierten
Einträge zurückgeben, nicht nur den ersten.

**Haupt- vs. Zusatz-Ordner unterscheiden:** Der Haupt-Ordner ist der Wert aus `anime.source` (bzw.
`anime.folder_name`); da `syncAnimeSourceLinks` beim Create denselben Wert **auch** in
`anime_source_links` einträgt (§1), taucht der Haupt-Ordner in der `anime_source_links`-Liste
**doppelt** auf (einmal als `anime.source`-Wert, einmal als eigene Zeile). Die UI/das Backend muss
beim Aufbau der Liste die Zeile, deren `source`-Wert exakt `animeSource.Source` entspricht, als
"Haupt-Ordner" markieren (kein "entfernen"-Button) und alle anderen `jellyfin:`-Zeilen als "Zusatz-
Ordner" (mit "entfernen"-Button) anzeigen — genau wie D-18 es fordert.

**"Entfernen"-Aktion (neu zu bauen):** Kein bestehender Endpunkt löscht Zeilen aus
`anime_source_links` (verifiziert per Grep, §1). Neue Repo-Funktion analog zu `syncAnimeSourceLinks`,
z. B. `func removeAnimeSourceLink(ctx, tx, animeID int64, source string) error` mit `DELETE FROM
anime_source_links WHERE anime_id=$1 AND source=$2` — dank Composite-PK `(anime_id, source)` eine
triviale, indexierte Löschoperation. Server-seitiger Guard: Ablehnen, wenn `source ==
animeSource.Source` (Schutz des Haupt-Ordners, exakt wie D-18 fordert: "Der Haupt-Ordner wird hier
nicht gelöst"). Nach erfolgreichem Löschen erscheint der Ordner in der Discovery-Liste wieder als
"offen" — das folgt automatisch aus der bestehenden Existenzprüfung, sobald die Zeile weg ist, keine
zusätzliche Logik nötig.

**UI-Vorbild:** `AnimeContextFansubManager.tsx`
(`frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx`) ist das
nächstliegende bestehende Muster für "Liste verbundener Entitäten mit Entfernen-Button pro Zeile":
`mutatingGroupID`-State für Pro-Zeile-Ladezustand, Bestätigungsdialog
(`window.confirm(...\`"${group.name}" vom Anime entfernen?...\`)`,
`AnimeContextFansubManager.tsx:134`), Button-Label "Vom Anime entfernen"
(`AnimeContextFansubManager.tsx:229`). Für D-18 dieselbe Interaktionslogik auf Jellyfin-Ordner-Zeilen
übertragen, aber mit dem harten Server-Guard für den Haupt-Ordner (kein "entfernen"-Button überhaupt
für diese eine Zeile, nicht nur serverseitig geblockt).

## §13 — D-19: Cache + Refresh

**Redis ist bereits produktiv im Stack** (`docker compose ps`: `team4sv30-redis` up, Redis 7) und
bereits über `backend/internal/database/redis.go` (`NewRedisClient`, `github.com/redis/go-redis/v9`)
im Backend verdrahtet; TTL-Writes folgen dem Muster `client.Set(ctx, key, val, ttl)` (siehe z. B.
`episode_playback_grant_store.go:36`). Für den Discovery-Snapshot ist das der naheliegende Baustein
(kein neuer Infrastrukturbaustein, konsistent mit der bereits in der vorherigen Fassung dokumentierten
"Environment Availability"-Zeile "Redis … Optionaler Discovery-Cache").

**TTL-Empfehlung: 5 Minuten. [ASSUMED]** — dies ist eine Recherche-Empfehlung mit Begründung, **kein**
im Code vorgefundener Konventionswert (im Repo existiert kein Präzedenzfall für einen reinen
Content-Cache mit TTL; die vorhandenen `*_TTL_SECONDS`-Config-Werte sind Auth-/Grant-TTLs mit anderem
Zweck, siehe `config.go:32-43`). Begründung: Ein voller Library-Fetch dauert 2,39 s (§5d) bei 2111
Items; ein TTL von wenigen Minuten amortisiert diese Kosten über die typische Admin-Session-Dauer
(mehrere Filterwechsel/Seiten innerhalb weniger Minuten), bleibt aber kurz genug, dass neu in Jellyfin
importierte Serien ohne manuelles Eingreifen innerhalb kurzer Zeit sichtbar werden. Der explizite
"Aktualisieren"-Button (D-19) deckt den Fall ab, in dem ein Admin sofort nach einem Jellyfin-Import
die Discovery-Liste aktualisiert sehen will, ohne auf den TTL-Ablauf zu warten.

**Trennung Cache vs. DB-Existenzprüfung (D-19, wichtig):** Der TTL-Cache darf **ausschließlich** den
Jellyfin-Snapshot (Id/Name/Type/Path/Jahr/Bild-Tag/Season-Daten) cachen — niemals den
"bereits vorhanden"/"ignoriert"/"teilweise"-Status. Dieser Status kommt bei **jedem** Seitenaufruf
frisch aus der DB-Batch-Query (`FindExistingAnimeByJellyfinIntakeRefs` + neuer Ignore-Batch-Query,
§11). Das ist bereits in der bestehenden Architektur so vorgesehen (Pattern 1/2, siehe unten) und wird
hier nur explizit für D-19 bestätigt: Nach Verbinden/Ordner-lösen/Ignorieren/Entignorieren ist der
Status sofort korrekt, weil er nie im TTL-Cache lag.

## §14 — D-20: Save-Time-Dublettencheck

Siehe Einfügepunkt-Beleg am Ende von §7. Zusammengefasst: `h.repo.FindAnimeBySource(ctx,
"anisearch:"+id)` unmittelbar vor `h.repo.CreateAnime(...)` in `CreateAnime`
(`admin_content_anime.go:41`) erneut aufrufen. Bei Treffer denselben Redirect-/Konflikt-Payload
zurückgeben wie der bestehende `Enrich()`-Dublettencheck (§7) — dieselbe "Verbinden"/"Trotzdem neu
anlegen"-UX, kein zweites UI-Pattern nötig. Reduziert Race-Window zwischen AniSearch-Auswahl (früher
Check in `Enrich()`) und tatsächlichem Speichern-Klick auf praktisch null zusätzliche Kosten (eine
`SELECT ... LIMIT 1`-Query).

## §15 — D-21: Audit-Attribution (Verbinden, Ordner lösen, Ignorieren, Entignorieren)

**Zentraler Befund: Kein neuer Infrastrukturbaustein nötig.** `AdminContentHandler` hat bereits ein
Feld `auditLogRepo *repository.AuditLogRepository` (`admin_content_handler.go:199`), gesetzt über
`WithPermissionDeps(permissionSvc, auditLogRepo)` (`admin_content_handler.go:326-330`) — dieselbe
Handler-Struct, die auch alle Jellyfin-/Discovery-Endpunkte dieser Phase tragen wird. Der Aufrufpfad
`h.auditLogRepo.Write(ctx, repository.AuditLogEntry{...})` wird bereits an **>50 Stellen** im Repo
verwendet (siehe Sources), u. a. mehrfach direkt in anderen `AdminContentHandler`-Dateien wie
`admin_content_release_version_media_replace.go:445-453`:

```go
// Source: backend/internal/handlers/admin_content_release_version_media_replace.go:445-453
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID:    &identity.AppUserID,
    ActorLegacyUserID: &identity.UserID,
    EventType:         "release_version_media.file_replaced",
    TargetType:        "release_version_media",
    TargetID:          &relationID,
    Action:            string(permissions.ActionReleaseVersionMediaUpdate),
    Outcome:           "allowed",
    Payload:           map[string]any{"version_id": versionID, "previous_media_asset_id": previousMediaAssetID},
})
```

Ein einfacheres, ebenfalls verbreitetes Muster ohne `permissions.Action*`-Konstante (nur ein
Klartext-Verb im `Action`-Feld) findet sich in `admin_users_mutations_handler.go:41-48` — für die
vier neuen D-21-Aktionen genügt dieses einfachere Muster, da es (anders als
`ActionReleaseVersionMediaUpdate`) keine vorhandene `permissions.Action*`-Konstante für
Jellyfin-Discovery-Aktionen gibt und keine neue Capability-Gate-Logik gefordert ist.

**Empfohlene `EventType`/`Action`-Werte (Vorschlag, Claude's Discretion):**

| Aktion | `EventType` | `TargetType` | `TargetID` |
|--------|-------------|--------------|------------|
| Verbinden (D-05) | `jellyfin_discovery.connected` | `anime` | Anime-ID |
| Ordner lösen (D-18) | `jellyfin_discovery.folder_removed` | `anime` | Anime-ID |
| Ignorieren (D-17) | `jellyfin_discovery.ignored` | `jellyfin_item` | — (`jellyfin_item_id` ist ein String, kein `BIGINT`; ggf. `Payload` statt `TargetID` nutzen oder `TargetID` leer lassen und die Item-ID nur im `Payload` führen) |
| Entignorieren (D-17) | `jellyfin_discovery.unignored` | `jellyfin_item` | — (wie oben) |

**Actor-Werte:** Wie im zitierten Beispiel sowohl `ActorAppUserID: &identity.AppUserID` als auch
`ActorLegacyUserID: &identity.UserID` setzen (beide Felder existieren parallel im Schema,
`0075_audit_logs.up.sql:3-4`, und werden im bestehenden Code konsistent gemeinsam befüllt).

**Warum NICHT `admin_anime_mutation_audit` (die andere, anime-spezifische Audit-Tabelle):** Diese
Tabelle (`backend/internal/repository/admin_content_anime_audit.go`) ist fest auf die drei
`mutation_kind`-Werte `anime.create`/`anime.update`/`anime.delete` zugeschnitten und läuft
transaktional innerhalb des Anime-CRUD-Schreibpfads (`admin_content_anime_metadata.go:274-316`,
`admin_content_anime_delete.go:55-59`). "Ordner lösen"/"Ignorieren"/"Entignorieren" sind keine
Anime-Metadaten-Patches und passen konzeptionell nicht in dieses Schema — `audit_logs` mit seinem
generischen `event_type`/`target_type`/`target_id`-Modell ist der richtige Ort.

## §16 — D-22: Server-Kennungs-Vorsorge

Kein bestehendes Namensmuster `server_key`/`provider_key`/`instance_key` im Repo gefunden (Grep über
`database/migrations/` und `backend/internal/` liefert keine Treffer außer False-Positives wie
`asset_key`). Es handelt sich um eine echte Neueinführung; CONTEXT.md gibt Name (`server_key`) und
Default (`'default'`) bereits vor. Empfehlung: `server_key TEXT NOT NULL DEFAULT 'default'` auf
**jeder** in dieser Phase neu angelegten Tabelle (Ignore-Tabelle aus §11, ggf. Staffel-Mapping-Tabelle
aus §9, falls Option A gewählt wird) — konsistent mit dem übrigen Migrationsstil (`TEXT NOT NULL
DEFAULT ...`-Spalten sind im Repo verbreitet, z. B. `mutation_kind VARCHAR(64) NOT NULL` in
`0038_add_admin_anime_mutation_audit.up.sql`, wenn auch ohne Default dort). **Das bestehende
Referenzformat `jellyfin:<id>` in `anime.source`/`anime_source_links` bleibt unverändert** — D-22
verlangt explizit, hier nichts umzubauen; `server_key` ist ausschließlich eine Spalte auf den NEUEN
Tabellen, keine Änderung an `anime`/`anime_source_links`.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────┐        ┌──────────────────────────────────────────────┐
│  Admin-Browser           │        │  Go-Backend (Gin)                             │
│  /admin/anime/create      │        │                                                │
│                          │        │  ┌──────────────────────────────────────────┐  │
│  [Neu] "Aus meiner        │  GET   │  │ GET /admin/jellyfin/discovery (NEU)      │  │
│   Bibliothek" Tab/Route  │───────▶│  │  1. Cache-Hit? → Snapshot aus Cache/Redis │  │
│                          │        │  │  2. Cache-Miss? → je erlaubter Library    │  │
│                          │        │  │     1x GET /Items (Series, slim Fields)   │  │
│                          │        │  │     + 1x GET /Items (Season, für D-15)    │  │
│                          │        │  │     zu Jellyfin (§5: 1 Request/Library je │  │
│                          │        │  │     Typ, TTL-Warmup, nicht pro Seitenaufruf│ │
│                          │        │  │  3. Filter/Suche/Cursor IM BACKEND         │  │
│                          │        │  │     auf dem (gecachten) Snapshot          │  │
│                          │        │  │  4. FindExistingAnimeByJellyfinIntakeRefs  │  │
│                          │        │  │     (1 Batch-Query je Seite, §5f)          │  │
│                          │        │  │  5. Ignore-Batch-Query (NEU, D-17, §11)    │  │
│                          │        │  │     (1 Batch-Query je Seite)               │  │
│                          │        │  │  6. resolveDiscoveryItemStatus (NEU, §11)  │  │
│                          │        │  │     bereits vorhanden > ignoriert >        │  │
│                          │        │  │     teilweise (D-15) > offen               │  │
│                          │        │  │  7. Poster-URLs via buildGroupMediaImageURL│  │
│                          │        │  │     (0 Requests, reine URL-Konstruktion)   │  │
│                          │        │  └──────────────────────────────────────────┘  │
│  Liste: Poster/Name/Typ/  │◀───────│                                                │
│  Jahr/Path/Status         │  JSON  │                                                │
│                          │        └──────────────────────────────────────────────┘
│  [Anime anlegen] klicken │
│         │                │        ┌──────────────────────────────────────────────┐
│         ▼                │  POST  │ POST /admin/jellyfin/intake/preview (BESTEHEND)│
│  handleJellyfinCandidate  │───────▶│  getJellyfinSeriesIntakeDetail (1 Detailcall)  │
│  Adopt(candidateID)       │◀───────│  → AdminJellyfinIntakePreviewResult            │
│  (bestehende Pipeline,   │  JSON  └──────────────────────────────────────────────┘
│   §4 Schritt 1)          │
│         │                │
│         ▼                │
│  Draft hydriert; AniSearch-Suchfeld mit Jellyfin-Name vorbelegt (NEU, D-09)         │
│         │                │
│         ▼  Benutzer sucht + wählt AniSearch-Treffer aktiv aus (nie automatisch)     │
│         │                │        ┌──────────────────────────────────────────────┐
│         ▼                │  POST  │ POST /admin/anime/enrichment/anisearch          │
│  Enrich(aniSearchID,      │───────▶│  FindAnimeBySource("anisearch:<id>") (BESTEHEND)│
│  draft)                   │        │  Treffer? → redirect (BESTEHEND, nur "wechseln")│
│                          │◀───────│  kein Treffer? → mergeCreateDraftPayload        │
│                          │  JSON  │  (Jellyfin-Felder geschützt, BESTEHEND, §4.3)   │
│                          │        └──────────────────────────────────────────────┘
│  NEU: Bei Treffer zusätzlich "Trotzdem neu anlegen" ODER "Verbinden"                │
│  "Verbinden" → POST /admin/anime/:id/jellyfin/metadata/apply (BESTEHEND, §7)        │
│         │                │        ┌──────────────────────────────────────────────┐
│         ▼  Create-Submit  │  POST  │ CreateAnime: NEU — FindAnimeBySource erneut    │
│                          │───────▶│  unmittelbar vor h.repo.CreateAnime (D-20, §14)│
│                          │◀───────│  Treffer? → dieselbe Verbinden/Neu-UX           │
│                          │        └──────────────────────────────────────────────┘
│  NEU: Redirect-Zweig nach Herkunft "discovery" + anime.type                          │
│    Serie → /admin/anime/{id}/episodes                                               │
│    Film  → /admin/anime/{id}/edit   (bis Phase 166)                                 │
│    (manueller/direkter Flow: bestehender Redirect zu /admin/anime?created=… bleibt) │
│         │                │
│         ▼                │
│  "Zurück zur Bibliothek" mit erhaltenem Filter/Suche/Cursor (URL-Query, NEU, D-11)  │
└─────────────────────────┘
```

### Ergänzender Ablauf: Neue Admin-Aktionen (D-14/D-17/D-18/D-21)

```
Discovery-Liste                     Anime-Edit-Seite (/admin/anime/{id}/edit)
────────────────                    ──────────────────────────────────────────
[Ignorieren]  ──POST /admin/jellyfin/discovery/ignore (NEU)──▶ INSERT library_discovery_ignored_items
              ◀─ h.auditLogRepo.Write("jellyfin_discovery.ignored") (D-21, §15) ─┘
[Nicht mehr   ──DELETE .../ignore (NEU)──▶ DELETE FROM library_discovery_ignored_items
 ignorieren]  ◀─ h.auditLogRepo.Write("jellyfin_discovery.unignored") ─┘

                                     AnimeJellyfinMetadataSection (erweitert, D-18):
                                     GET /admin/anime/:id/jellyfin/context (erweitert)
                                       → jetzt ALLE anime_source_links-Zeilen, nicht nur 1 (§12)
                                     [Zusatz-Ordner entfernen] ──DELETE (NEU)──▶
                                       DELETE FROM anime_source_links WHERE anime_id=$1 AND source=$2
                                       (Haupt-Ordner serverseitig geschützt)
                                       ◀─ h.auditLogRepo.Write("jellyfin_discovery.folder_removed") ─┘

                                     Episoden-Import (erweitert, D-14):
                                     [Ordner wählen, falls >1 verbunden] → jellyfin_series_id im
                                       PreviewEpisodeImport-Request → NEU: fail-closed-Prüfung gegen
                                       anime_source_links, bevor Jellyfin angefragt wird (§8)
```

### Recommended Project Structure

```
backend/internal/handlers/
├── jellyfin_discovery.go             # NEU: GET /admin/jellyfin/discovery Handler
├── jellyfin_discovery_cache.go        # NEU: Cache-Aufbau/TTL (Series+Season), wrapt bestehenden searchJellyfinSeries-Client
├── jellyfin_discovery_status.go       # NEU: resolveDiscoveryItemStatus (D-03/D-15/D-17 Prioritätslogik, §11)
├── jellyfin_discovery_ignore.go       # NEU: Ignorieren/Nicht-mehr-ignorieren-Endpunkte (D-17) inkl. Audit-Write (D-21)
├── admin_episode_import.go            # BESTEHEND: fail-closed-Prüfung für jellyfin_series_id ergänzen (D-14, §8)
├── admin_content_anime.go             # BESTEHEND: FindAnimeBySource-Recheck vor CreateAnime ergänzen (D-20, §14)
├── jellyfin_metadata_resync.go        # BESTEHEND: buildAnimeJellyfinContext um alle anime_source_links-Zeilen erweitern (D-18, §12)
├── jellyfin_client_series.go          # BESTEHEND: um Series+Movie IncludeItemTypes erweitern (additiv)
backend/internal/repository/
├── admin_content_jellyfin_intake.go   # BESTEHEND: FindExistingAnimeByJellyfinIntakeRefs wiederverwenden
├── jellyfin_discovery_cursor.go       # NEU: Discovery-eigener Cursor-Seek (nutzt encodeCursorPair-Muster)
├── library_discovery_ignored_items.go # NEU: Repo für die D-17-Ignore-Tabelle (Insert/Delete/BatchLookup)
├── anime_source_links.go              # BESTEHEND: neue Funktion removeAnimeSourceLink(ctx, tx, animeID, source) ergänzen (D-18, §12)
database/migrations/
├── 0170_library_discovery_ignored_items.up/down.sql  # NEU (D-17, D-22-server_key-Spalte inklusive, §11/§16)
frontend/src/app/admin/anime/create/
├── DiscoveryLibraryPanel.tsx          # NEU: Liste/Filter/Pagination
├── discoveryPageHelpers.ts            # NEU: URL-Query-Param-Handling (Filter/Suche/Cursor), D-11
├── useAdminAnimeCreateController.ts   # BESTEHEND: handleJellyfinCandidateAdopt wiederverwenden/parametrisieren
├── createPageHelpers.ts               # BESTEHEND: buildManualCreateRedirectPath um Assisted-Zweig ergänzen
frontend/src/app/admin/anime/components/AnimeEditPage/
├── AnimeJellyfinMetadataSection.tsx   # BESTEHEND: Ordner-Liste + Entfernen-Aktion ergänzen (D-18, Vorbild AnimeContextFansubManager.tsx)
frontend/src/app/admin/anime/[id]/episodes/
├── (Import-Bildschirm)                # BESTEHEND: Ordner-Selector ergänzen, wenn >1 verbundener Ordner (D-14, §8)
```

### Pattern 1: Cache-first Discovery-Snapshot

**Was:** Ein serverseitiger, TTL-begrenzter Snapshot aller Series-Items (+ Season-Items für D-15) je
erlaubter Library, gegen den Filter/Suche/Cursor rein im Speicher/Cache ausgewertet werden — Jellyfin
wird nur beim (seltenen) Cache-Miss/Ablauf erneut angefragt.
**When to use:** Immer für die Discovery-Liste, nie pro Seite/Request neu gegen Jellyfin.
**Beispiel (Muster aus bestehendem Code ableiten):**
```go
// Anlehnung an jellyfin_client_series.go:78-103 (Multi-Library-Fan-out),
// aber Snapshot statt Direktanfrage:
func (h *AdminContentHandler) buildJellyfinDiscoverySnapshot(ctx context.Context) ([]jellyfinSeriesItem, error) {
    // ein Request je h.jellyfinAllowedLibraryIDs, IncludeItemTypes=Series,Movie,
    // Fields=Path (slim), dedupliziert nach Item-ID — wie searchJellyfinSeries,
    // aber ohne SearchTerm und mit vollständigem Recursive-Fetch statt Limit.
}
```

### Pattern 2: Batch-Existenzprüfung pro Seite, nicht pro Item

**Was:** `FindExistingAnimeByJellyfinIntakeRefs(seriesIDs, paths)` einmal pro ausgelieferter
Discovery-Seite aufrufen (mit den IDs/Pfaden genau dieser Seite), nie pro Item einzeln. Für D-17
gilt dasselbe Prinzip für die neue Ignore-Batch-Query.
**Beispiel:** siehe `jellyfin_search.go:77-92` (exakt dieses Muster, dort für die Direktsuche).

### Pattern 3: Admin-Aktion mit Audit-Write (D-21)

**Was:** Jede neue mutierende Discovery-Aktion (Verbinden, Ordner lösen, Ignorieren, Entignorieren)
schreibt nach erfolgreicher DB-Änderung einen `audit_logs`-Eintrag über das bereits verdrahtete
`h.auditLogRepo`, mit `_ = h.auditLogRepo.Write(...)` (Fehler wird bewusst ignoriert — bestehende
Konvention im gesamten Repo, Audit-Fehler blockieren keine erfolgreiche Aktion).
**When to use:** Bei allen vier D-21-Aktionen, direkt nach dem erfolgreichen Schreib-Call.
**Beispiel:** siehe §15 (Codebeispiel aus `admin_content_release_version_media_replace.go:445-453`).

### Anti-Patterns to Avoid

- **Jellyfin-Detailrequest pro Listeneintrag:** `getJellyfinSeriesIntakeDetail` liefert
  `ProviderIds,Genres,Tags,Overview` — das braucht die Liste nicht, nur die Vorschau nach Auswahl.
- **`Type`-Feld von Jellyfin als Serie/Film-Unterscheidung verwenden:** liefert in dieser Instanz
  immer `"Series"` (§2) — führt zu falschen/inexistenten "Film"-Badges, wenn man sich darauf verlässt.
- **`anime.source` bei "Verbinden" blind force-überschreiben:** kann eine bestehende
  `anisearch:<id>`-Referenz zerstören (§1); vor dem Force-Write prüfen, ob `anime.source` bereits ein
  `anisearch:`-Tag trägt, und ggf. stattdessen `anime_source_links` nutzen (siehe Assumptions Log A1).
- **`jellyfin_series_id` im Episoden-Import-Request ungeprüft weiterreichen (D-14):** Der heutige
  Code tut das bereits (§8) — das ist eine bestehende Lücke, keine neu einzuführende. D-14 muss sie
  schließen, nicht nur für den Mehrfach-Ordner-Fall.
- **Ordner-"Entfernen" (D-18) ohne Haupt-Ordner-Schutz implementieren:** Da der Haupt-Ordner-Wert
  sowohl in `anime.source` als auch als eigene Zeile in `anime_source_links` existiert (§1/§12), würde
  ein ungeschützter `DELETE` die Zeile löschen können, während `anime.source` weiter auf die (nun in
  `anime_source_links` fehlende) Referenz zeigt — inkonsistenter Zustand.
- **TTL-Cache und DB-Existenzstatus im selben Cache-Eintrag mischen (D-19):** Der Status muss bei
  jedem Request frisch aus der DB kommen, sonst zeigt die Liste nach "Verbinden"/"Ignorieren" bis zu
  5 Minuten lang den alten Status.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serie/Film-Erkennung aus Jellyfin-Daten | Neue Klassifikationslogik basierend auf `Type` | `buildJellyfinIntakeTypeHint` (`jellyfin_intake_helpers.go:202-239`) | Bereits vorhanden, korrekt für diese Instanz (§2), gepflegte Pfad-/Namens-Heuristik |
| Jellyfin→Draft-Übernahme | Neue Handoff-Datenstruktur/neuer Draft-Endpunkt | `handleJellyfinCandidateAdopt` + `PreviewAnimeIntakeFromJellyfin` (§4) | D-08 ist bereits vollständig gebaut |
| AniSearch-Merge mit Feldschutz | Neue Merge-Logik | `mergeCreateDraftPayload`/`resolveCreateAniSearchDraftMergeInputs` (§4) | Exakt die im Auftrag (§14) geforderte Schutzlogik existiert schon |
| Existenzprüfung (Batch) | Neue N+1-taugliche Prüfung pro Item | `FindExistingAnimeByJellyfinIntakeRefs` (§7, §5f) | Bereits Batch-fähig, erfüllt D-07 direkt |
| Cursor-Kodierung | Eigenes Base64/JSON-Format | `encodeCursorPair`/`decodeCursorPair`-Muster (§6) | Konsistent mit bestehendem Konventions-Stil im Repo |
| Bestehenden-Anime-Metadaten-Schreiber für "Verbinden" | Neuer Endpunkt, der nur `source`/`folder_name` setzt | `ApplyAnimeMetadataFromJellyfin` (§7) | Bereits vorhanden, inkl. Feldschutzlogik |
| Admin-Audit-Logging (D-21) | Neue Audit-Tabelle/neuer Logging-Mechanismus | `AuditLogRepository`/`audit_logs`, `h.auditLogRepo` (§15) | Bereits vollständig verdrahtet in `AdminContentHandler`, an >50 Stellen identisch verwendet |
| Zeile aus `anime_source_links` löschen (D-18) | Neue Tabelle für "aktive Ordner" | `DELETE ... WHERE anime_id=$1 AND source=$2` auf der bestehenden Tabelle (Composite-PK, §12) | Tabelle ist bereits exakt für diesen Zweck strukturiert, nur der DELETE-Pfad fehlt |
| Kurzlebiger Server-Cache (D-19) | Eigener In-Memory-Cache-Mechanismus mit eigener Expiry-Logik | `github.com/redis/go-redis/v9` über `database.NewRedisClient` (§13) | Bereits produktiv im Stack, TTL-Writes sind ein Einzeiler (`client.Set(ctx, key, val, ttl)`) |

**Key insight:** Der größte Risikofaktor dieser Phase ist nicht fehlender Code, sondern das
Zusammenführen mehrerer bereits bestehender, aber bisher unabhängiger Pfade (Direktsuche-Adoption,
AniSearch-Redirect, Metadaten-Resync, Audit-Log-Schreiber) zu einem neuen, Discovery-gesteuerten
Ablauf, ohne die bestehenden Pfade selbst zu verändern (D-12/§28). Bei D-14/D-18 kommt hinzu, dass
zwei bestehende Endpunkte heute **lückenhaft** sind (keine Zugehörigkeitsprüfung bzw. keine
Mehrfach-Ordner-Sichtbarkeit) — hier reicht Wiederverwendung allein nicht, es sind gezielte,
minimal-invasive Erweiterungen an bestehendem Code nötig.

## Common Pitfalls

### Pitfall 1: `JELLYFIN_ALLOWED_LIBRARY_IDS` ist aktuell fehlkonfiguriert
**What goes wrong:** Jede library-gefilterte Jellyfin-Anfrage (Discovery **und** die bestehende
Direktsuche, sobald `jellyfinAllowedLibraryIDs` nicht leer ist) schlägt mit HTTP 400 fehl, weil `"5"`
keine gültige Jellyfin-12-GUID ist.
**Why it happens:** Vermutlich Altwert aus einer früheren Jellyfin-Version oder ein Platzhalter, der
nie gegen die reale Bibliotheks-GUID (`5f65d0c8bdd71b782fc98205814a0d76`) aktualisiert wurde.
**How to avoid:** Der Planer sollte dies dem Auftraggeber explizit als Blocker melden (Env-Wert
korrigieren ist eine Konfigurationsänderung, keine Code-Änderung dieser Phase — D-12 verbietet
Datenänderungen durch den Agenten, nicht die Meldung eines Konfigurationsfehlers). Tests/Fixtures für
Discovery sollten unabhängig von diesem Live-Wert mit einer korrekten Test-GUID arbeiten.
**Warning signs:** Jede Live-Jellyfin-Anfrage mit `ParentId` liefert HTTP 400 "The value ... is not
valid."

### Pitfall 2: Jellyfins `Type=Movie` existiert nicht in dieser Bibliothekskonfiguration
**What goes wrong:** Code, der sich auf `item.Type == "Movie"` verlässt, um Filme zu erkennen, zeigt
in der Discovery-Liste **nie** einen Film an — obwohl 78 "Film"-Ordner vorhanden sind.
**Why it happens:** Die Bibliothek ist als `CollectionType=tvshows` eingerichtet; Jellyfin typisiert
in einer solchen Bibliothek konsequent alles als `Series`.
**How to avoid:** Ausschließlich die bestehende Pfad-/Namens-Heuristik nutzen (§2/§4).
**Warning signs:** `IncludeItemTypes=Movie` liefert 0 Treffer trotz sichtbarer Filme im
Dateisystem/Jellyfin-Web-UI.

### Pitfall 3: `forceSourceUpdate=true` beim "Verbinden" kann eine `anisearch:`-Referenz überschreiben
**What goes wrong:** Ein bestehender Anime mit `anime.source = "anisearch:12345"` verliert diese
Referenz, wenn "Verbinden" naiv `ApplyAnimeMetadataFromJellyfin` mit expliziter Jellyfin-Serien-ID
aufruft (force-Pfad, §1).
**Why it happens:** `ApplyJellyfinSyncMetadata`s CASE-Logik unterscheidet nicht nach Provider-Präfix,
nur nach "leer vs. force".
**How to avoid:** Vor dem Force-Write prüfen, ob `anime.source` bereits ein `anisearch:`-Präfix
trägt; falls ja, Jellyfin-Referenz stattdessen in `anime_source_links` schreiben (kleine Erweiterung
nötig) statt `anime.source` zu überschreiben.
**Warning signs:** Nach "Verbinden" verschwindet die AniSearch-Zuordnung eines Anime aus
`anime.source` (sichtbar z. B. im Jellyfin-Kontext-Panel des Editors).

### Pitfall 4: Discovery-Cursor gegen einen gecachten Snapshot, nicht gegen SQL
**What goes wrong:** Naive Wiederverwendung von `encodeInt32Int64Cursor`/`decodeInt32Int64Cursor` als
SQL-Seek-Schlüssel funktioniert nicht, weil die Grundmenge nicht aus einer SQL-`ORDER BY`-Sequenz
stammt, sondern aus einem im Speicher/Cache sortierten Jellyfin-Snapshot.
**How to avoid:** Kodierungs-Helfer wiederverwenden, aber den Seek-Vergleich gegen die
Snapshot-Sortierreihenfolge (z. B. `(Name, JellyfinItemID)`) neu implementieren.

### Pitfall 5: `PreviewEpisodeImport` akzeptiert `jellyfin_series_id` heute völlig ungeprüft (D-14)
**What goes wrong:** Ein Client (oder ein manipulierter Request) kann heute eine beliebige
Jellyfin-Serien-ID an `PreviewEpisodeImport` übergeben — die Kandidatenliste wird gegen **irgendeine**
Jellyfin-Serie aufgebaut, nicht notwendigerweise die des aktuellen Anime.
**Why it happens:** `loadEpisodeImportMediaCandidates` (`admin_episode_import.go:356-380`) ruft
`h.listJellyfinEpisodes(ctx, jellyfinSeriesID)` direkt mit dem Client-Wert auf, ohne Abgleich gegen
`anime.source`/`anime_source_links` des Ziel-Anime.
**How to avoid:** Fail-closed-Allow-Liste aus `source.Source` + `source.SourceLinks` bauen (Daten
bereits geladen, siehe §8) und `req.JellyfinSeriesID` dagegen validieren, BEVOR
`loadEpisodeImportMediaCandidates` aufgerufen wird.
**Warning signs:** Episoden-Import-Preview zeigt Kandidaten aus einem völlig anderen
Jellyfin-Ordner als dem des bearbeiteten Anime.

### Pitfall 6: `anime_source_links.source` hat ein globales `UNIQUE(source)`, nicht nur `UNIQUE(anime_id, source)`
**What goes wrong:** Ein Plan, der versucht, dieselbe Jellyfin-Referenz an zwei verschiedene Anime zu
hängen (z. B. versehentlich beim "trotzdem neu anlegen"-Pfad, D-02/D-20), schlägt mit einem
DB-Constraint-Fehler fehl — und zwar am globalen `source`-Unique-Index, nicht am erwarteten
`(anime_id, source)`-Primärschlüssel.
**Why it happens:** `0047_add_anime_source_links.up.sql:6`:
`CONSTRAINT uq_anime_source_links_source UNIQUE (source)`.
**How to avoid:** Bei jedem neuen additiven Write-Pfad (D-05, D-16) explizit mit `ON CONFLICT
DO NOTHING` (wie `syncAnimeSourceLinks` es bereits tut) oder einem vorab-Check arbeiten, nicht mit
einem nackten `INSERT`.
**Warning signs:** `duplicate key value violates unique constraint "uq_anime_source_links_source"`
bei einem Insert, der laut PK eigentlich erlaubt sein sollte.

### Pitfall 7: Season-Snapshot enthält Season 0 (Specials) — naive Zählung überschätzt "Mehrstaffeligkeit" (D-15)
**What goes wrong:** Fast jede Serie hat eine `Season 0`("Specials")-Season; wer einfach
"`COUNT(DISTINCT season) > 1`" ohne Filterung auf `IndexNumber >= 1` rechnet, markiert einen Großteil
der Bibliothek fälschlich als "teilweise" (D-15).
**Why it happens:** Jellyfins Season-Enumeration liefert Season 0 gleichberechtigt neben echten
Staffeln zurück.
**How to avoid:** Nur `IndexNumber >= 1` als "echte" Staffel zählen (live verifiziert: 27/2111 Serien
betroffen bei korrekter Filterung, siehe §5g).
**Warning signs:** Die "teilweise"-Quote in der Discovery-Liste liegt bei mehreren Prozent statt im
niedrigen einstelligen Prozentbereich.

### Pitfall 8: Season-Batch-Request ist deutlich langsamer als der Series-Batch-Request (D-15/D-19)
**What goes wrong:** Ein Season-Fetch, der versehentlich synchron im Request-Pfad einer einzelnen
Discovery-Seite ausgeführt wird, verzögert diese Seite um ~28 s (live gemessen, §5g) statt der ~2,4 s
für den vergleichbaren Series-Fetch.
**Why it happens:** Unklar (vermutlich serverseitige Ableitung der Season-Entitäten aus dem
Serien-Metadatenbaum, nicht direkt indiziert wie Serien selbst) — nur beobachtet, nicht in
Jellyfin-Quellcode verifizierbar.
**How to avoid:** Season-Snapshot ausschließlich im periodischen TTL-Cache-Warmup laden (D-19), nie
im Request-Pfad einer Nutzerinteraktion.
**Warning signs:** Erster Seitenaufruf nach Cache-Ablauf dauert >10 s.

### Pitfall 9: `admin_anime_mutation_audit` für D-21 verwenden, statt `audit_logs`
**What goes wrong:** Ein Versuch, die neuen D-21-Aktionen über `insertAdminAnimeAuditEntry`/
`admin_anime_mutation_audit` zu protokollieren, scheitert entweder an der festen
`mutation_kind`-Enumeration (`anime.create/update/delete`) oder erzwingt eine künstliche Umdeutung
("Ordner lösen" als `anime.update` getarnt), die die Audit-Historie irreführend macht.
**Why it happens:** Zwei Audit-Mechanismen existieren parallel im Repo mit unterschiedlichem Zweck
(§15) — leicht zu verwechseln, weil beide "Anime" im Namen/Kontext haben.
**How to avoid:** `audit_logs`/`h.auditLogRepo` verwenden (bereits verdrahtet, generisches Schema).
**Warning signs:** Neue `mutation_kind`-Konstanten müssen erfunden werden, die nicht zu
"anime.create/update/delete" passen.

## Code Examples

### Batch-Existenzprüfung aufrufen (bestehendes Muster für Discovery-Seiten)
```go
// Source: backend/internal/handlers/jellyfin_search.go:77-92
seriesIDs := make([]string, 0, len(items))
paths := make([]string, 0, len(items))
for _, item := range items {
    if trimmed := strings.TrimSpace(item.ID); trimmed != "" {
        seriesIDs = append(seriesIDs, trimmed)
    }
    if path := strings.TrimSpace(item.Path); path != "" {
        paths = append(paths, path)
    }
}
existingMatches, err := h.repo.FindExistingAnimeByJellyfinIntakeRefs(c.Request.Context(), seriesIDs, paths)
```

### Cursor-Overfetch-Regel (wiederverwendbares Muster)
```go
// Source: backend/internal/repository/release_cursor_pagination.go:50-61
func trimCursorPage[T any](items []T, limit int, cursorFn func(item T) string) (page []T, nextCursor *string, hasMore bool) {
    page = items
    if len(page) > limit {
        hasMore = true
        page = page[:limit]
    }
    if hasMore && len(page) > 0 {
        c := cursorFn(page[len(page)-1])
        nextCursor = &c
    }
    return page, nextCursor, hasMore
}
```

### Poster-URL ohne Jellyfin-Request (reine String-Konstruktion)
```go
// Source: backend/internal/handlers/group_assets_jellyfin.go:586-595
func buildGroupMediaImageURL(itemID string, kind string, index *int) string {
    values := url.Values{}
    values.Set("provider", "jellyfin")
    values.Set("item_id", itemID)
    values.Set("kind", kind)
    if index != nil {
        values.Set("index", strconv.Itoa(*index))
    }
    return "/api/v1/media/image?" + values.Encode()
}
```

### Fail-closed Jellyfin-Series-ID-Prüfung für den Episoden-Import (D-14, NEU zu bauen)
```go
// Muster, kombiniert bestehende Bausteine — kein direktes Zitat, da der Code noch nicht existiert.
// Baut auf bereits geladenen Daten aus loadEpisodeImportContext (admin_episode_import.go:159-190) auf.
allowedSeriesIDs := map[string]struct{}{}
if id := extractJellyfinSourceID(source.Source); id != "" {
    allowedSeriesIDs[id] = struct{}{}
}
for _, link := range source.SourceLinks {
    if id := extractJellyfinSourceID(&link); id != "" {
        allowedSeriesIDs[id] = struct{}{}
    }
}
if _, ok := allowedSeriesIDs[jellyfinSeriesID]; !ok {
    badRequest(c, "jellyfin_series_id ist nicht mit diesem Anime verbunden")
    return
}
```

### Admin-Audit-Write für eine neue Discovery-Aktion (D-21, Muster aus bestehendem Code)
```go
// Source (Muster): backend/internal/handlers/admin_content_release_version_media_replace.go:445-453
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID:    &identity.AppUserID,
    ActorLegacyUserID: &identity.UserID,
    EventType:         "jellyfin_discovery.ignored",
    TargetType:        "jellyfin_item",
    Action:            "ignore",
    Outcome:           "allowed",
    Payload:           map[string]any{"jellyfin_item_id": itemID, "server_key": "default"},
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `IncludeItemTypes=Series` (nur Serien) | Für Discovery: `IncludeItemTypes=Series,Movie` anfragen, aber Ergebnis-Typisierung via Pfad-Heuristik statt `Type`-Feld | Diese Phase (geplant) | Erweiterung ist additiv, ändert nichts am bestehenden Direktsuche-Verhalten (§2) |
| Kein Discovery-Einstieg auf `/admin/anime/create` | Neuer "Aus meiner Bibliothek"-Einstieg | Diese Phase (geplant) | Bestehende Einstiege (AniSearch direkt, Jellyfin direkt, manuell) bleiben unverändert (D-12/§28) |
| Ein Anime kann heute effektiv genau einen sichtbaren Jellyfin-Ordner haben (UI zeigt nur den ersten) | Mehrere Jellyfin-Ordner pro Anime sichtbar, hinzufügbar und (außer Haupt-Ordner) entfernbar (D-05/D-18) | Diese Phase (geplant) | Erfordert Erweiterung von `buildAnimeJellyfinContext` (§12) sowie neuen additiven Write-Pfad (§1, A1) |
| Keine Möglichkeit, Bibliothekseinträge dauerhaft zu überspringen | "Ignorieren"/"Nicht mehr ignorieren" pro Jellyfin-Item, reversibel (D-17) | Diese Phase (geplant) | Neue Tabelle (§11), aber isoliert vom bestehenden Datenmodell |
| Episoden-Import prüft die übergebene `jellyfin_series_id` nicht gegen den Ziel-Anime | Fail-closed-Prüfung gegen `anime_source_links` (D-14) | Diese Phase (geplant) | Schließt eine bestehende, bisher unbemerkte Lücke (§8, Pitfall 5) |

**Deprecated/outdated:** Keine — es handelt sich um eine additive Erweiterung, keine Migration
bestehender Konzepte.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Für D-05 ("Verbinden") sollte die Jellyfin-Referenz bei Anime mit bestehender `anisearch:`-Quelle in `anime_source_links` geschrieben werden statt `anime.source` force-zu-überschreiben — dies ist eine Empfehlung, keine im Code vorgefundene Regel. | §1, §7, Pitfall 3 | Falls falsch/unerwünscht: Planer könnte stattdessen bewusst entscheiden, `anime.source` zu überschreiben (wenn AniSearch-Zuordnung ohnehin nur über `anisearch_id`-Spalte, nicht `source`, verfolgt wird — das wäre separat zu verifizieren) |
| A2 | Ziel-Route für D-10 bei Serien ist `/admin/anime/{id}/episodes` (Episodenübersicht), nicht direkt `/admin/anime/{id}/episodes/import`. | §3 | Falls Auftraggeber "Episoden-Tab" wörtlich als Importbildschirm meint, ist das Sprungziel eine andere (existierende) Route — geringes Risiko, beide Routen existieren bereits |
| A3 | `JELLYFIN_ALLOWED_LIBRARY_IDS=5` ist ein Konfigurationsfehler (Alt-ID) und keine absichtliche, in dieser Phase zu respektierende Einstellung. | §5 | Falls absichtlich (z. B. Test-Stub, der nie produktiv genutzt wird): kein Handlungsbedarf, aber dann liefert Discovery in Produktion aktuell 0 Ergebnisse — muss in jedem Fall gemeldet werden |
| A4 | Für D-15 wird KEINE der drei Speicher-Optionen (A/B/C) als Empfehlung final festgelegt — Option A wird als "am saubersten" benannt, aber das ist eine unverbindliche Recherche-Einschätzung, kein Beschluss. | §9 | Der Planner darf D-15 NICHT direkt implementieren, sondern muss laut CONTEXT.md D-15 zwingend einen separaten Plan mit Checkpoint vor jeder Migration vorlegen |
| A5 | TTL-Empfehlung von 5 Minuten für den Discovery-Cache (D-19) ist eine aus Messwerten abgeleitete Empfehlung, kein im Code vorgefundener Konventionswert. | §13 | Falls zu kurz: häufigere 2,4s-Jellyfin-Fetches; falls zu lang: neu importierte Serien erscheinen erst nach TTL-Ablauf oder manuellem "Aktualisieren" — beides niedriges Risiko, per Config leicht anpassbar |
| A6 | `audit_logs`/`AuditLogRepository` (statt `admin_anime_mutation_audit`) ist der richtige Audit-Mechanismus für die vier neuen D-21-Aktionen — eine Einschätzung basierend auf Schema-Fit, nicht explizit in CONTEXT.md vorgegeben. | §15, Pitfall 9 | Falls der Auftraggeber stattdessen eine Erweiterung von `admin_anime_mutation_audit` wünscht: zusätzlicher `mutation_kind`-Wertebereich nötig, aber technisch möglich |
| A7 | Empfohlene `EventType`-Namenskonvention (`jellyfin_discovery.connected`/`.folder_removed`/`.ignored`/`.unignored`) ist ein Vorschlag (Claude's Discretion laut CONTEXT.md), keine vorgegebene Benennung. | §15 | Geringes Risiko — reine Namenskonvention, jederzeit vor Implementierung änderbar |
| A8 | Migrationsnummer `0170` für die D-17-Ignore-Tabelle ist der Stand zum Recherchezeitpunkt (höchste bestehende: `0169`) — kann sich verschieben, falls zwischenzeitlich andere Migrationen hinzukommen. | §11 | Niedrig — Planner muss die tatsächlich nächste freie Nummer zum Ausführungszeitpunkt neu prüfen |
| A9 | `server_key TEXT NOT NULL DEFAULT 'default'` auf den neuen Tabellen ist eine wörtliche Umsetzung von D-22, keine eigene Erfindung — aber der exakte Spaltentyp/-name folgt keinem bestehenden Repo-Präzedenzfall (keiner gefunden). | §16 | Niedrig — Name/Default sind bereits in CONTEXT.md vorgegeben, nur die SQL-Typisierung ist eine Recherche-Annahme |

**Wenn diese Tabelle leer wäre, gäbe es keinen Klärungsbedarf** — hier bestehen neun Punkte, die der
Planer/Auftraggeber vor der endgültigen Aufgabenzuschnitt bestätigen sollte, wobei A4 (D-15) der
einzige ist, der laut CONTEXT.md zwingend einen eigenen Checkpoint-Plan statt einer einfachen
Bestätigung erfordert.

## Open Questions

1. **Sprungziel für Serien nach Assisted-Create: `/episodes` oder `/episodes/import`?**
   - What we know: Beide Routen existieren; `/episodes` ist die Übersicht mit Link auf `/episodes/import`.
   - What's unclear: Ob D-10 "Episoden-Tab" die Übersicht oder direkt den Importbildschirm meint.
   - Recommendation: `/admin/anime/{id}/episodes` ansteuern (wörtlichste Auslegung von "Episoden-Tab");
     dort einen bereits sichtbaren, prominenten Link/CTA zu `/episodes/import` mit vorausgefüllter
     Jellyfin-Serien-ID anbieten (spart einen Klick, ohne die Zielroute zu verändern).

2. **Wie soll "Verbinden" (D-05) mit einer bestehenden `anisearch:`-Quelle umgehen?**
   - What we know: `ApplyAnimeMetadataFromJellyfin` überschreibt `anime.source` bei explizitem
     `jellyfin_series_id` unabhängig vom aktuellen Provider-Präfix.
   - What's unclear: Ob das im konkreten Anwendungsfall (Discovery→"Verbinden") jemals einen bereits
     AniSearch-verknüpften Anime betrifft (laut D-02 wird "Verbinden" ja gerade für den Fall B genutzt,
     bei dem der Anime *noch keine* Jellyfin-Referenz hat — er kann aber sehr wohl schon eine
     `anisearch:`-Quelle haben).
   - Recommendation: Vor dem Planen dieses Tasks kurz mit dem Auftraggeber klären oder als expliziten
     Task "Provider-Präfix-Schutz beim Verbinden" einplanen (siehe A1).

3. **`JELLYFIN_ALLOWED_LIBRARY_IDS`-Korrektur — wer führt sie aus?**
   - What we know: Der aktuelle Wert (`"5"`) verhindert jede library-gefilterte Jellyfin-Anfrage.
   - What's unclear: Ob die Korrektur der `.env` Teil dieser Phase ist (Konfiguration, keine
     Code-/Datenänderung) oder separat vom Auftraggeber vorgenommen wird.
   - Recommendation: Im Abschlussbericht explizit als Blocker/Voraussetzung für den produktiven
     Discovery-Einsatz nennen; Tests dürfen nicht von diesem Live-Wert abhängen.

4. **D-15: Welche Speicher-Option (A/B/C aus §9) wählt der Auftraggeber, und kann eine Staffel zu
   mehr als einem Anime gehören?**
   - What we know: Season-Nummer pro Episode ist heute nur transient während des Import-Preview
     verfügbar, nicht persistiert; ein Season-Batch-Request pro Library ist technisch machbar (§5g).
   - What's unclear: Exaktes Zielschema, Kardinalität (1 Staffel : 1 Anime vs. n:m), ob
     `server_key` schon in dieser Phase oder erst mit der eigentlichen Mehrserver-Phase eingeführt
     wird.
   - Recommendation: Separater Plan mit menschlichem Checkpoint VOR jeder Migration, wie in CONTEXT.md
     D-15 explizit gefordert. Dieser Recherche-Abschnitt (§9) ist die Grundlage für diesen Plan, keine
     Vorwegnahme der Entscheidung.

5. **D-17/D-18: Soll "Ignorieren" auf Ordner-Ebene (Jellyfin-Item-ID) oder zusätzlich auf
   Staffel-Ebene möglich sein, sobald D-15 umgesetzt ist?**
   - What we know: CONTEXT.md D-17 spricht von "pro Bibliothekseintrag" — im Ist-Zustand (vor D-15)
     ist ein Bibliothekseintrag = ein Jellyfin-Series-Item.
   - What's unclear: Ob nach D-15 auch einzelne Staffeln eines "teilweise"-Eintrags separat ignorierbar
     sein sollen, oder ob "ignorieren" immer den ganzen Jellyfin-Ordner betrifft.
   - Recommendation: Für 165 auf Ordner-Ebene beschränken (deckt sich mit dem heutigen
     Datenmodell); Staffel-Ebene-Ignorieren erst im D-15-Folge-Plan klären, falls überhaupt gewünscht.

6. **D-21: Sollen `EventType`/`Action`-Namen mit dem Planner/Auftraggeber vorab abgestimmt werden,
   oder reicht die in §15 vorgeschlagene Konvention?**
   - What we know: CONTEXT.md verlangt nur "Audit-Attribution per user_id über den bestehenden
     Audit-Mechanismus", keine konkrete Namenskonvention.
   - What's unclear: Ob es eine projektweite Namenskonvention für `event_type`-Werte gibt, die über
     das beobachtete `<domain>.<verb>`-Muster hinausgeht.
   - Recommendation: Vorschlag aus §15 übernehmen (konsistent mit beobachteten Beispielen wie
     `app_user_global_role.assigned`, `release_version_media.file_replaced`), bei Bedarf im Plan-Review
     anpassen.

7. **D-19: Soll der Discovery-Cache prozessweit (In-Memory) oder über Redis geteilt werden, falls das
   Backend künftig mit mehreren Replikas läuft?**
   - What we know: Aktuell läuft genau ein Backend-Container (`docker compose ps`); Redis ist
     verfügbar und bereits verdrahtet.
   - What's unclear: Ob eine zukünftige Mehr-Replika-Topologie für den Planungshorizont dieser Phase
     relevant ist.
   - Recommendation: Redis verwenden (kein Mehraufwand gegenüber In-Memory, aber zukunftssicherer),
     letzte Entscheidung liegt laut CONTEXT.md bei "Claude's Discretion" (Cache-Mechanik).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Jellyfin-12-Server | Discovery-Datenquelle, gesamte Phase | ✓ (live erreichbar, `System/Info` HTTP 200) | Jellyfin 12.x (Plugin-Liste zeigt aktive Installation, exakte Serverversion nicht separat abgefragt) | — |
| Jellyfin `JELLYFIN_ALLOWED_LIBRARY_IDS` korrekt konfiguriert | Library-gefilterte Discovery-Abfrage | ✗ (Wert `"5"` ist ungültig, s. §5/Pitfall 1) | — | Ohne Filter (leere Liste) funktioniert der unfiltered-Fallback-Pfad (`jellyfin_client_series.go:62-76`), liefert aber ggf. auch Non-Anime-Bibliotheken (Musikvideos, Groups) |
| PostgreSQL | Existenzprüfung, Anime-CRUD, neue Ignore-Tabelle (D-17) | ✓ (`docker compose ps`: `team4sv30-db` healthy) | Postgres 16 | — |
| Redis | Optionaler Discovery-Cache (D-19) | ✓ (`docker compose ps`: `team4sv30-redis` up), bereits verdrahtet über `database.NewRedisClient` | Redis 7 | In-Memory-Cache im Backend-Prozess, falls Redis nicht genutzt werden soll |
| Go-Backend/Next.js-Frontend | Gesamte Umsetzung | ✓ (beide Container laufen) | Go 1.25 / Next.js 16 | — |
| Jellyfin `IncludeItemTypes=Season`-Endpunkt (D-15) | Mehrstaffel-Snapshot | ✓ (live verifiziert, §5g, 28,2 s Latenz bei 2231 Items) | — | Nur TTL-Cache-Warmup, nie synchron im Request-Pfad (Pitfall 8) |

**Missing dependencies with no fallback:**
- Korrekt konfigurierte `JELLYFIN_ALLOWED_LIBRARY_IDS` — ohne Korrektur liefert die
  library-gefilterte Discovery-Abfrage in Produktion HTTP 400 (s. o.). Dies blockiert die
  *gefilterte* Abfrage, nicht die App insgesamt (Fallback: ungefilterte Abfrage möglich, aber fachlich
  unerwünscht, da sie auch Nicht-Anime-Bibliotheken einschließt).

**Missing dependencies with fallback:**
- Redis für den Discovery-Cache (In-Memory-Cache im Backend-Prozess ist eine valide Alternative für
  eine Single-Instance-Deployment wie hier).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend-Framework | Go `testing` + `github.com/stretchr/testify` (siehe `backend/internal/repository/admin_content_test.go`, `backend/internal/handlers/jellyfin_*_test.go`) |
| Frontend-Framework | Vitest 3 (`frontend/package.json:10`, `"test": "vitest run"`) |
| Config-Dateien | `frontend/vitest.config.ts`; Go-Tests laufen ohne separate Config über `go test ./...` |
| Quick run command (Backend, gezielt) | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run Jellyfin` |
| Quick run command (Frontend, gezielt) | `cd frontend && npx vitest run src/app/admin/anime/create` |
| Full suite command (Backend) | `cd backend && go test ./...` |
| Full suite command (Frontend) | `cd frontend && npm test` |

### Phase Requirements → Test Map

> Requirement-IDs sind noch nicht final vergeben (ROADMAP.md: "Requirements TBD, in plan-phase aus
> 165-USER-REQUEST.md und 165-CONTEXT.md D-01..D-22 abzuleiten"). Die folgende Tabelle mappt daher auf
> die im Auftrag bereits benannten Pflicht-Tests (§29–§32) sowie auf die neuen D-14..D-22-Verhalten,
> die der Planer 1:1 in Requirement-IDs überführen sollte.

| Auftrags-Test/Decision | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| A (unbekannte Series → offen) | Discovery zeigt "offen" für Item ohne DB-Treffer | unit/integration (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestJellyfinDiscovery` | ❌ Wave 0 |
| B (bekannte Series → bereits vorhanden) | `FindExistingAnimeByJellyfinIntakeRefs`-Treffer über `source` | unit | bereits abgedeckt für Direktsuche, neu für Discovery-Handler | ❌ Wave 0 (Discovery-spezifisch) |
| C (kein Fuzzy-Match) | Naruto ≠ Naruto Shippuden bleibt "offen" | unit | Testdaten mit ähnlichen, aber nicht identischen Titeln/IDs | ❌ Wave 0 |
| D (Zuordnung-prüfen-Fall, jetzt via D-02 erst nach AniSearch) | Kein automatischer Create bei Namensähnlichkeit ohne technische Referenz | unit (AniSearch-Enrich-Service) | bereits als `Enrich()`-Redirect-Test-Muster vorhanden (`anime_create_enrichment_test.go`, falls existent — zu verifizieren) | ⚠️ prüfen |
| E (Movie-Discovery sichtbar) | "Film"-Items (Pfad-Heuristik) erscheinen in der Liste | unit | Testdaten mit `/Movie/`-Pfad-Fixture | ❌ Wave 0 |
| F (Pagination korrekt, kein Fan-out) | Cursor liefert keine Duplikate, 1 DB-Query/Seite, kein Requests-pro-Item | integration + Query-Zähler-Test (Muster: bestehende N+1-Guard-Tests im Repo, z. B. `jellyfin_source_batch_test.go`) | `go test ./internal/repository/... -run TestJellyfinDiscoveryCursor` | ❌ Wave 0 |
| G (Discovery→Draft vollständig) | Übernahme von ID/Name/Path/Typ-Hint/Jahr/Assets | Frontend-Unit (Vitest, Muster `CreateAniSearchIntakeCard.test.tsx`) | `npx vitest run src/app/admin/anime/create/DiscoveryLibraryPanel.test.tsx` | ❌ Wave 0 |
| H (keine Auto-Auswahl bei 1 Treffer) | AniSearch-Suche wählt nie automatisch aus | Frontend-Unit | Muster bereits vorhanden für den Direktflow, zu erweitern | ⚠️ prüfen ob bereits getestet |
| I (AniSearch bleibt maßgeblich beim Merge) | `mergeCreateDraftPayload`/`resolveCreateAniSearchDraftMergeInputs` unverändert | bereits bestehende Tests, Regressionscheck | `go test ./internal/services/... -run TestMergeCreateDraft`, `npx vitest run createPageHelpers.test.ts` | ✓ bereits vorhanden (Regressionsschutz) |
| J/K (alte Flows unverändert) | Direkter AniSearch-/Jellyfin-Flow bleibt funktional | Regression, bestehende Testsuiten grün halten | `go test ./... && npm test` | ✓ bereits vorhanden |
| L (Assisted Series → direkt Episoden) | Redirect-Zweig nach Create | Frontend-Unit (Redirect-Pfad-Test, Muster `createPageHelpers.test.ts` für `buildManualCreateRedirectPath`) | `npx vitest run createPageHelpers.test.ts` | ❌ Wave 0 (neuer Zweig) |
| M (Discovery-Kontext erhalten) | Filter/Suche/Cursor via URL erhalten | Frontend-Unit + evtl. E2E | neue Testdatei | ❌ Wave 0 |
| D-14 (Ordnerauswahl + fail-closed) | Episoden-Import akzeptiert nur mit dem Anime verbundene `jellyfin_series_id`; UI zeigt Selector nur bei >1 verbundenem Ordner | unit (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestPreviewEpisodeImport_RejectsUnlinkedSeriesID` (neu) | ❌ Wave 0 |
| D-15 (teilweise-Status, Checkpoint-abhängig) | Serie mit >1 echter Staffel (`IndexNumber>=1`) und unvollständiger Zuordnung → Status "teilweise" | unit (sobald Schema aus dem separaten Checkpoint-Plan steht) | — | ⛔ blockiert durch D-15-Checkpoint (siehe §9) — NICHT in dieser Phase planen, bevor der Checkpoint erfolgt ist |
| D-16 (Ordner-Umzug über D-05-Pfad) | Kein neuer Test nötig, deckt sich mit D-05-Tests | — | — | ✓ kein neuer Code |
| D-17 (Ignorieren/Entignorieren, Status-Priorität) | Ignorierter Eintrag verschwindet aus "Offen", erscheint unter "Ignoriert"; Priorität bereits vorhanden > ignoriert > teilweise > offen | unit + integration | `go test ./internal/handlers/... -run TestJellyfinDiscoveryIgnore` (neu) | ❌ Wave 0 |
| D-18 (Ordner-Management Edit-Seite) | Alle `anime_source_links`-Zeilen sichtbar, Haupt-Ordner ohne Entfernen-Option, Zusatz-Ordner entfernbar → Discovery-Status danach "offen" | unit (Backend) + Frontend-Unit | `go test ./internal/handlers/... -run TestAnimeJellyfinContext_ListsAllFolders` (neu), `npx vitest run AnimeJellyfinMetadataSection.test.tsx` (neu) | ❌ Wave 0 |
| D-19 (Cache/Refresh, Status-Trennung) | "Aktualisieren"-Button bypasst Cache; Status nach Verbinden/Ignorieren sofort korrekt trotz TTL-Cache | integration | `go test ./internal/handlers/... -run TestJellyfinDiscoveryCache_StatusBypassesCache` (neu) | ❌ Wave 0 |
| D-20 (Save-Time-Recheck) | `CreateAnime` lehnt/redirected bei `anisearch:<id>`-Kollision unmittelbar vor dem Insert | unit (Handler + Fake-Repo) | `go test ./internal/handlers/... -run TestCreateAnime_RechecksAniSearchDuplicateBeforeInsert` (neu) | ❌ Wave 0 |
| D-21 (Audit-Attribution) | Verbinden/Ordner-lösen/Ignorieren/Entignorieren schreiben je einen `audit_logs`-Eintrag mit korrektem `actor_app_user_id` | unit (Fake `AuditLogRepository`) | `go test ./internal/handlers/... -run TestJellyfinDiscoveryActions_WriteAudit` (neu) | ❌ Wave 0 |
| D-22 (server_key-Default) | Neue Tabellen(zeilen) tragen `server_key='default'` ohne explizite Angabe | unit (Migration/Repo) | `go test ./internal/repository/... -run TestLibraryDiscoveryIgnoredItems_DefaultsServerKey` (neu) | ❌ Wave 0 |

*Tests N–R (Film-Content-Flow, §32) sind explizit Phase 166 — hier nicht verplant.*

### Sampling Rate
- **Per task commit:** gezielte `go test`/`vitest run` auf den betroffenen Paketen/Dateien
- **Per wave merge:** `go test ./...` (Backend) + `npm test` (Frontend)
- **Phase gate:** Beide vollständigen Suiten grün, plus `go vet ./...`, `tsc --noEmit`, ESLint, bevor
  `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Backend-Testdatei für den neuen Discovery-Handler (`jellyfin_discovery_test.go`) — Fake-Jellyfin-
      HTTP-Server nach Muster `jellyfin_source_batch_test.go:31-40` (httptest-Server, keine echten
      Jellyfin-Calls in Unit-Tests)
- [ ] Backend-Testdatei für den Discovery-Cursor (`jellyfin_discovery_cursor_test.go`) — Muster
      `release_cursor_pagination.go` samt zugehöriger `_test.go` (falls vorhanden, prüfen)
- [ ] Frontend-Testdatei für `DiscoveryLibraryPanel.tsx` — Muster `CreateAniSearchIntakeCard.test.tsx`
- [ ] Query-Zähler-/N+1-Guard-Test für Discovery-Seiten (Anzahl `FindExistingAnimeByJellyfinIntakeRefs`-
      Aufrufe pro Seite = 1)
- [ ] Regressionstest, der beweist, dass `handleJellyfinCandidateAdopt` (Direktflow) nach der
      Discovery-Integration weiterhin identisch funktioniert (keine Signaturänderung ohne Test)
- [ ] Backend-Testdatei `admin_episode_import_ownership_test.go` (D-14) — beweist, dass eine
      `jellyfin_series_id`, die nicht in `source`/`source_links` des Ziel-Anime vorkommt, mit HTTP 400
      abgelehnt wird, BEVOR ein Jellyfin-Call erfolgt (Mock-Jellyfin-Server mit Zero-Call-Assertion)
- [ ] Migrationstest/Fixture für `0170_library_discovery_ignored_items` (D-17/D-22) — beweist additive
      Migration ohne Datenverlust, `server_key`-Default greift
- [ ] Backend-Testdatei für die D-18-Erweiterung von `buildAnimeJellyfinContext` — beweist, dass bei
      mehreren `anime_source_links`-Zeilen alle zurückgegeben werden und der Haupt-Ordner korrekt
      markiert ist
- [ ] Backend-Testdatei für den D-20-Recheck in `CreateAnime` — Fake-Repo mit vorhandenem
      `anisearch:<id>`-Treffer, beweist Ablehnung/Redirect statt stillem Insert
- [ ] Backend-Testdatei mit Fake-`AuditLogRepository` (D-21) — beweist, dass jede der vier neuen
      Aktionen genau einen Audit-Eintrag mit korrektem `event_type`/`actor_app_user_id` erzeugt
- [ ] **D-15 explizit NICHT in Wave 0 dieser Phase** — jede Test-/Migrationsarbeit zu D-15 wartet auf
      den separaten Checkpoint-Plan (§9)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | ja (indirekt) | Bestehende Admin-Auth bleibt unverändert; jeder neue Endpunkt nutzt `h.requireAdmin(c)` wie alle bestehenden Admin-Content-Handler (z. B. `jellyfin_search.go:36-39`) |
| V3 Session Management | nein (keine neue Session-Logik) | — |
| V4 Access Control | ja | Discovery-Endpunkt muss identisch zu bestehenden Jellyfin-Admin-Endpunkten hinter `auth`-Middleware liegen (`admin_routes.go:78-91`, gleiche Route-Gruppe); D-14s fail-closed-Prüfung ist ebenfalls ein Access-Control-Kontrollpunkt (verhindert Cross-Anime-Zugriff auf Jellyfin-Serien-Daten über den Episoden-Import) |
| V5 Input Validation | ja | Filter-/Suchparameter/Cursor müssen wie bestehende Endpunkte serverseitig validiert werden (Muster: `badRequest(c, "...")` in `jellyfin_search.go:47-64`); ungültiger Cursor → "stiller Neustart" statt 400 (Konvention aus `release_cursor_pagination.go`); `jellyfin_series_id` im Episoden-Import-Preview muss gegen die Anime-Zugehörigkeit validiert werden (D-14, neu) |
| V6 Cryptography | nein | Kein neuer kryptografischer Code; Cursor ist Base64-kodiert (kein Secret, keine Verschlüsselung nötig — bestehende Konvention) |

### Known Threat Patterns for {Go/Gin + Next.js Admin}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Jellyfin-API-Key-Leak (URL/Log/Response) | Information Disclosure | Bereits durch Phase 161 abgesichert (`Authorization: MediaBrowser Token`, kein `api_key` in URL — D-08 aus 161-CONTEXT.md); neuer Discovery-Code muss denselben `fetchJellyfinJSON`-Wrapper nutzen, keinen eigenen HTTP-Client |
| IDOR über `anime_id`/`jellyfin_series_id` beim "Verbinden" | Tampering/Elevation of Privilege | Bestehende `requireAdmin`-Prüfung + serverseitige Existenzprüfung (`GetAnimeSyncSource` wirft `ErrNotFound`) wie in `ApplyAnimeMetadataFromJellyfin` bereits umgesetzt |
| IDOR über `jellyfin_series_id` im Episoden-Import-Preview (D-14, **heute unbehandelt**) | Tampering | **Neu zu schließende Lücke** (§8, Pitfall 5): `PreviewEpisodeImport` nimmt jede Jellyfin-Serien-ID unabhängig vom Ziel-Anime entgegen — Fail-closed-Allow-Liste aus `anime.source`/`anime_source_links` verpflichtend vor Jellyfin-Call |
| Fremde/beliebige `source`-Werte beim "Ordner lösen" (D-18) | Tampering | Server-seitiger Ownership-Check (`DELETE ... WHERE anime_id=$1 AND source=$2`, nur Zeilen des eigenen Anime; zusätzlich Haupt-Ordner-Schutz) |
| Massenhaftes Ignorieren/Entignorieren als Störfunktion (D-17) | Denial of Service (funktional, nicht Infrastruktur) | Reversibel per Design (D-17), zusätzlich per `audit_logs` nachvollziehbar (D-21) — kein technischer Rate-Limit-Bedarf über die bestehende Admin-Auth hinaus, da nur Admin-Rolle zugreift |
| Cursor-Manipulation (Client baut beliebigen Cursor) | Tampering | Unkritisch, da Cursor nur Sortier-/Seek-Position kodiert, keine Zugriffsrechte; ungültiger Cursor führt zu "stillem Neustart", nicht zu Datenlecks (bestehende Konvention) |
| Massenhafte Discovery-Anfragen als DoS-Vektor gegen Jellyfin | Denial of Service | TTL-Cache (D-06/D-19) verhindert, dass jede Seiten-/Filteränderung einen neuen Jellyfin-Request auslöst; gilt jetzt auch für den zusätzlichen Season-Snapshot (D-15, §5g — 28s-Latenz macht das besonders wichtig) |
| Fehlende Audit-Spur bei Admin-Mutation (D-21) | Repudiation | `audit_logs`-Write nach jeder der vier neuen Aktionen (§15) — Fehlen wäre ein Verstoß gegen den Projekt-Constraint "Observability" aus CLAUDE.md |

## Sources

### Primary (HIGH confidence — Code gelesen, Datei:Zeile zitiert)
- `backend/internal/repository/admin_content_jellyfin_intake.go` — Batch-Existenzprüfung
- `backend/internal/handlers/jellyfin_intake_helpers.go` — TypeHint, Match-Resolution, Asset-Slots
- `backend/internal/handlers/jellyfin_search.go`, `jellyfin_client_series.go` — Direktsuche, Multi-Library-Fan-out
- `backend/internal/handlers/jellyfin_sync.go`, `jellyfin_sync_flow_helpers.go`, `jellyfin_metadata_resync.go` — Sync-/Metadaten-Schreibpfade, `buildAnimeJellyfinContext` (D-18)
- `backend/internal/repository/admin_content_sync.go` — `ApplyJellyfinSyncMetadata` SQL
- `backend/internal/repository/admin_content_anime_create_v2.go`, `anime_source_links.go` — Create-Schreibpfad, Composite-PK/Unique-Constraint (D-18/Pitfall 6)
- `backend/internal/services/anime_create_enrichment.go` — AniSearch-Enrichment, Merge, Dedup
- `backend/internal/handlers/admin_content_anime_enrichment_edit.go` — Edit-Flow-Konflikt (409)
- `backend/internal/handlers/admin_content_anime.go` — `CreateAnime`-Handler, Einfügepunkt für D-20
- `backend/internal/repository/admin_content_anisearch.go` — `FindAnimeBySource`-Implementierung
- `backend/internal/repository/release_cursor_pagination.go` — Cursor-Pattern
- `backend/internal/handlers/admin_episode_import.go`, `admin_episode_import_validation.go` — Episoden-Import Preview/Apply, `JellyfinSeriesID`-Handling (D-14)
- `backend/internal/models/episode_import.go`, `admin_content.go` — `JellyfinSeasonNumber`, `AdminAnimeSyncSource.SourceLinks` (D-14/D-15)
- `backend/internal/repository/episode_import_repository_apply.go`, `episode_import_repository.go` — `mapAnimeTypeToEpisodeType`, `Apply()`, keine Season-Persistenz (D-15)
- `backend/internal/repository/admin_content_anime_audit.go`, `audit_logs.go`, `audit_logs_query.go` — beide Audit-Mechanismen im Vergleich (D-21)
- `backend/internal/handlers/admin_content_handler.go` — `AdminContentHandler`-Struct, `auditLogRepo`-Feld, `WithPermissionDeps` (D-21)
- `backend/internal/handlers/admin_users_mutations_handler.go`, `admin_content_release_version_media_replace.go` — Audit-Write-Aufrufmuster (D-21)
- `backend/internal/middleware/comment_auth.go` — `AuthIdentity`-Struct (`UserID`/`AppUserID`)
- `backend/internal/database/redis.go` — `NewRedisClient`, go-redis-Muster (D-19)
- `backend/internal/config/config.go` — Jellyfin-Env-Konfiguration, bestehende TTL-Konventionen
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`, `createPageHelpers.ts`, `createAniSearchControllerHelpers.ts`, `CreateAniSearchIntakeCard.tsx` — Create-Controller, Redirect, Konflikt-UI
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx` — Episoden-Route/Import-Link
- `frontend/src/app/admin/anime/page.tsx` — bestehendes `searchParams`-Muster
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx` — Ziel-Erweiterungspunkt D-18
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` — UI-Vorbild D-18
- `frontend/src/types/admin.ts` — `AdminAnimeJellyfinContext`-Typ (bestätigt: kein Mehrfach-Ordner-Feld heute)
- `database/migrations/0008_expand_anime_episode_columns.up.sql`, `0045_reconcile_db_schema_v2_columns.up.sql` — kein UNIQUE auf `source`/`anisearch_id`
- `database/migrations/0047_add_anime_source_links.up.sql` — Composite-PK + globales `UNIQUE(source)` (D-18/Pitfall 6)
- `database/migrations/0038_add_admin_anime_mutation_audit.up.sql`, `0075_audit_logs.up.sql` — beide Audit-Tabellen-Schemata (D-21)
- `database/migrations/0129_release_playback_entitlements.up.sql` — Migrationsmuster für D-17

### Secondary (MEDIUM confidence — live gegen reale Instanz verifiziert, 2026-09-21)
- Reale Jellyfin-12-Instanz (`http://192.168.235.100:8098`): `/System/Info`, `/Library/VirtualFolders`,
  `/Items` (mehrere Parametrisierungen inkl. `IncludeItemTypes=Season` für D-15), `/Shows/{id}/Episodes`
  — alle Requests read-only, keine Schreiboperation gegen Jellyfin oder `team4s_v2` ausgeführt.

### Tertiary (LOW confidence)
- Keine — alle Kernaussagen sind entweder code-belegt oder live verifiziert. Die einzige echte
  Unsicherheit (D-15-Speicherschema) ist bewusst als offene Entscheidung markiert (A4, §9), nicht als
  unsichere Tatsachenbehauptung.

## Metadata

**Confidence breakdown:**
- Standard Stack (interne Wiederverwendung): HIGH — jede Komponente wurde im Quellcode gelesen und zitiert
- Architektur/Merge-/Dedup-Flows: HIGH — vollständige Ablauf-Nachverfolgung von UI-Handler bis SQL
- Jellyfin-Datenmodell (Series/Movie, Pfad-Semantik, Requestzahlen, Season-Batch): HIGH — live gegen reale Instanz verifiziert (inkl. neuer Season-Messung dieses Durchlaufs)
- Pitfalls (Env-Fehlkonfiguration, Provider-Präfix-Kollision, D-14-Sicherheitslücke, Unique-Constraint): HIGH (alle live/code-reproduziert)
- D-15-Speicherschema: MEDIUM/bewusst offen — Datenlage (keine Persistenz heute, Batch-Machbarkeit) ist HIGH belegt, das Zielschema selbst ist ausdrücklich NICHT entschieden (Checkpoint-pflichtig)
- D-21-Audit-Empfehlung: HIGH — Mechanismus, Verdrahtung und >50 Verwendungsstellen sind Code-belegt; die konkrete Namenskonvention (A7) ist eine Empfehlung, kein Fund

**Research date:** 2026-09-21 (Erstfassung §1–§7); Nachrecherche §8–§16 ebenfalls 2026-09-21
**Valid until:** 30 Tage (Code-Struktur stabil, Jellyfin-Instanz-Zustand kann sich durch neue Importe/Bibliothekstyp-Änderungen ändern — vor Umsetzung erneut `/Library/VirtualFolders` und ggf. `/Items?IncludeItemTypes=Season` prüfen, falls sich seither Zeit vergangen ist)
