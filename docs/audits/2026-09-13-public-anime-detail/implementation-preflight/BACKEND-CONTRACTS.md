# Backend- und Vertrags-Preflight: öffentliche Anime-Detailseite

Stand: 13.09.2026. Recherchierter HEAD: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`. Vertrauen: HIGH für die unten referenzierten Codepfade; vorgeschlagene Änderungen und Grenzwerte sind ausdrücklich noch keine Messergebnisse. Dieses Dokument enthält ausschließlich Analyse und Planung, keine Implementierung und keinen Human-UAT-Sign-off.

## User Constraints

- Genau zwei kompakte Phasen; Phase 2 erst nach Implementierung und technischer Verifikation von Phase 1.
- Bestehende offene Human-UAT-Punkte 156/157 bleiben unverändert offen.
- Keine Datenbank- oder Testdatenänderungen ohne ausdrückliche Freigabe, keine Migrationen im vorliegenden Vorschlag, keine Änderungen an fachlicher Datenzuordnung.
- Anime und Episoden bleiben neutral. Releaseversionen und ihre Gruppen, Segmente und Medien behalten ihre kanonische Ownership.
- Pretty-Projektpfade verwenden autoritative Slugs. Numerische Compatibility-Routen bleiben bestehen.
- Feldänderungen erst nach Consumer-Prüfung; Runtime, OpenAPI und TypeScript werden gemeinsam angepasst. Keine pauschalen DTO-Löschungen und keine N+1-Abfragen.
- Stream-Kompatibilität bleibt im Default erhalten. Explizite Identitäten werden additiv eingeführt; eine isolierte ID-Kollision muss durch Fixtures sichtbar und abgesichert werden, ohne einen allgemeinen Entitlement-Rewrite.
- Nicht enthalten: F-15 Ownerprofil/Shell, Kommentar-Pagination, Produktentscheidungen zu Rating/Views/Emby, neue Anime-Slugroute, große Audio-/Videoänderungen oder strukturelles Redesign.

Quelle dieser Einschränkungen: aktueller Benutzerauftrag und Abstimmung mit dem orchestrierenden Agenten.

## Project Constraints (from AGENTS.md)

Kanonsicher arbeiten: `/home/d1sk/team4s` über SSH, Docker Compose für Tests und Runtime; Windows ist nur Steuerfläche. Vor Änderungen Git/Compose prüfen; `.env`, Medien, Volumes und laufende Daten nicht überschreiben. Bestehende Seams vor neuen Helpers/DTOs prüfen. API-Vertragsänderungen müssen in `shared/contracts/openapi.yaml`, Go, TypeScript und fokussierten Tests gemeinsam erscheinen. Kein Bearer-/Refresh-Code in normaler UI. Fachliche Medienzuordnung bleibt in bestehenden Tabellen. Kleine scoped Diffs und relevante Checks, vorhandene globale Fehler getrennt erfassen. [VERIFIED: AGENTS.md; docs/engineering/implementation-contract.md; docs/api/api-contracts.md]

## Summary

Phase 1 benötigt zwei kleine Backend-Slices: eine sichtbarkeitsbewusste Existenzprüfung vor Relations und die additive Projektion des bereits vorhandenen Anime-Slugs. Beide lassen sich ohne zusätzliche Lookup-Requests oder Datenänderungen umsetzen. Die Relations-Vertragsbeschreibung fehlt im zentralen OpenAPI und gehört in denselben Slice. [VERIFIED: backend/internal/handlers/anime.go:212; backend/internal/repository/anime.go; backend/internal/repository/anime_v2.go:107; shared/contracts/openapi.yaml]

Phase 2 darf die bestehende vollständige Gruppenprojektion nicht pauschal kürzen: fünf produktive Frontend-Caller verwenden sie, darunter Bulk-Administration und Editor-Nachbarn. Die öffentliche Seite braucht deutlich weniger Felder; eine explizite öffentliche Projektion mit begrenzten atomaren Zeilen und sichtbarer Fortsetzung kann auf dem bestehenden Endpoint entstehen. Segmentdaten bleiben für den Admin sichtbar, müssen dort aber von `theme_segment_assignments` statt Episode-Range/Versionslabel stammen. [VERIFIED: frontend/src/lib/api.ts:2136; backend/internal/repository/episode_version_repository_read_helpers.go:97; frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx:18]

## Architectural Responsibility Map

| Fähigkeit | Primärer Owner | Sekundärer Owner | Geplante Konsequenz |
|---|---|---|---|
| Sichtbarkeit/Existenz | AnimeRepository | Relationshandler | Ein schmaler parametrisierter Check; Statussemantik im Handler erhalten |
| Kanonischer Anime-Slug | Datenbank/Animeprojektion | Pretty-Linkbuilder | Slug additiv aus vorhandener Basequery transportieren |
| Varianten-/Versionsidentität | Repository/DTO/Vertrag | Frontend-Link und Streamseam | Explizite IDs ergänzen, Legacy-Alias dokumentieren |
| Segmentzuweisung | `theme_segment_assignments` | Adminprojektion | Kein Ableiten aus Range/Label |
| Begrenztes öffentliches Inventar | Bestehender Episodes-Endpoint | Gemeinsamer Clientowner | Explizite Projektion/Cursor; Weiterladen unabhängig von Gruppenwechsel |
| Mediengrößen | Bestehende Medien-/Providerseams | Shared ResponsiveImage/URL-Verwendung | Tatsächliche Varianten bzw. Transformationen, keine dekorativen Queryparameter |

Die Owner sind aus den genannten Quellpfaden und der Domain-Dokumentation abgeleitet. [VERIFIED: docs/architecture/db-schema-fansub-domain.md; backend/internal/repository/episode_version_repository_read_helpers.go; frontend/src/lib/fansubProjectRoutes.ts]

## Standard Stack und Umgebung

Vorhandene Abhängigkeiten reichen aus: Go-Modul 1.25.0, Gin 1.10.0, pgx/v5 5.7.1, testify 1.9.0, imaging 1.6.2; Runtime Go 1.25.13 und Air 1.65.3. Dies sind verifizierte Repository-/Runtime-Versionen, keine Behauptung über neueste Registry-Versionen. Keine Installation oder Upgrades empfohlen. [VERIFIED: backend/go.mod; docker compose exec im laufenden Backend]

Der relevante Working Tree hatte ausschließlich die bereits vorhandenen untracked Auditdateien und `frontend/scripts/shot2.mjs`; keine Produktänderungen durch dieses Preflight. Compose-Dienste waren verfügbar. [VERIFIED: git status --short; docker compose ps]

## Phase 1: konkrete Implementierungsseams

### F-07: Relations von Vollreload entkoppeln

Aktuell ruft `GetAnimeRelations` den vollständigen `AnimeRepository.GetByID(..., false)` auf. Der V2-Pfad führt Schemaerkennung, Basisdaten, neutrale Episoden, Quelllinks und drei normalisierte Metadatenabfragen aus, bevor die eigentliche Relationsquery läuft. Dieser Pfad ist für eine Existenz-/Visibility-Prüfung unnötig breit. [VERIFIED: backend/internal/handlers/anime.go:221; backend/internal/repository/anime.go; backend/internal/repository/anime_v2.go:107; docs/audits/2026-09-13-public-anime-detail/REQUESTS-AND-SQL.md]

Empfehlung: `AnimeRepository.ExistsVisible(ctx, id) (bool, error)` ergänzen. Im AnimeRepository existiert keine passende exportierte Methode. Die engste vorhandene Analogie ist `CommentRepository.animeExists`, das bereits Status berücksichtigt; private Exists-Helpers in anderen Repositories prüfen teilweise nur die ID und passen daher nicht unverändert. [VERIFIED: backend/internal/repository/comment.go:105; backend/internal/repository/anime.go; backend/internal/repository/episode_version_repository.go]

```sql
SELECT EXISTS (
  SELECT 1 FROM anime WHERE id = $1 AND status <> 'disabled'
)
```

Im Relationshandler zuerst ID validieren, dann diesen Check, dann die unveränderte Relationsquery. Bestehende Antworten erhalten: ungültige ID 400, unbekannt/deaktiviert 404 mit `anime nicht gefunden`, technischer Existsfehler 500, Relationsfehler 500, sichtbarer Anime ohne Relationen 200 mit leerem Array. Aktive Zielanime bleiben durch das vorhandene Relations-SQL gefiltert. Ziel: erfolgreicher Pfad exakt zwei Datenstatements, unbekannt/deaktiviert eines; mit QueryTracer belegen und keine ungeprüfte Latenzverbesserung behaupten. [VERIFIED: backend/internal/handlers/anime.go:212; backend/internal/repository/anime_relations.go]

OpenAPI-Suche nach Relations-Pfad und `AnimeRelation` ergab keine passende öffentliche Endpoint-/Schema-Beschreibung. Bestehende 200/400/404/500-Verträge dokumentieren, nicht eine neue Route erfinden. [VERIFIED: repositoryweite Suche in shared/contracts nach `/relations:` und `AnimeRelation:`]

### F-06: Pretty-Link ohne Zusatzprofil

`AnimeDetail` enthält derzeit keinen Slug in Go, TypeScript und OpenAPI. Die V2-Basisquery verwendet `anime.slug` bereits als Titel-Fallback. `ListAnimeFansubs` projiziert `fg.slug` bereits. `buildPublicFansubProjectPath` ist der vorhandene Phase-155-Builder für `/fansubs/{fansubSlug}/fansubprojekt/{animeSlug}`; der ergänzende Href-Builder kennt einen numerischen Fallback. [VERIFIED: backend/internal/models/anime.go:42; frontend/src/types/anime.ts:50; shared/contracts/openapi.yaml:10348; backend/internal/repository/anime_v2.go:144; backend/internal/repository/fansub_repository.go:1288; frontend/src/lib/fansubProjectRoutes.ts]

Empfehlung: `slug?: string` bzw. optionaler Go-Pointer mit `omitempty`, selektiert als `NULLIF(BTRIM(anime.slug), '')` in derselben Basequery und im Scanner ergänzt. Im absichtlich vorhandenen Legacy-Schema-Branch bleibt Slug absent; kein Browser-Slugify und keine ID-Heuristik. Frontend nutzt für den sichtbaren Gruppenbereich die autoritativen Anime-/Gruppenslugs und den bestehenden Builder. Numerische Compatibility-Route und deren Canonical-Auflösung erhalten. Keine zusätzliche Gruppe- oder Animeabfrage. [VERIFIED: backend/internal/repository/anime_v2.go:224; backend/internal/repository/anime.go; frontend/src/lib/fansubProjectRoutes.ts]

Phase-1-Dateien: `backend/internal/repository/anime.go`, `anime_v2.go`, `backend/internal/handlers/anime.go`, `backend/internal/models/anime.go`, `frontend/src/types/anime.ts`, `shared/contracts/openapi.yaml`, fokussierte Handler-/Repository-/Vertragstests und die vom Frontend-Plan benannten Link-Consumer. Der TypeScript-Detailtyp und OpenAPI sind gemeinsame Konfliktdateien; Änderungen serialisieren.

## Phase 2: repositoryweite Consumer-Matrix

### Vollständiger Endpoint-/Helper-Einstieg

`getGroupedEpisodes(animeID)` ruft per zentralem `authorizedFetch`, `cache: no-store` den bestehenden `/api/v1/anime/{id}/episodes` auf. Es gibt aktuell keine Helper-Optionen; alle fünf produktiven Caller verwenden die Defaults. Der Handler setzt `includeVersions=true` und `includeFansubs=true`; nur der exakte String `true` gilt als wahr. Bestehende vollständige Defaults dürfen nicht still auf eine begrenzte öffentliche Projektion umgestellt werden. [VERIFIED: frontend/src/lib/api.ts:2136; backend/internal/handlers/episode_version_reads.go]

| Direkter produktiver Helper-Caller | Nachgelagerte Consumer | Bedeutung der Vollständigkeit |
|---|---|---|
| `frontend/src/app/anime/[id]/page.tsx:108` | `FansubVersionBrowser` | Öffentliche Anzeige, darf explizite begrenzte Projektion erhalten |
| `frontend/src/app/admin/anime/[id]/episodes/page.tsx:100` | `EpisodesOverview`, `EpisodeAccordion`, `VersionRow`, Bulk-Gruppenzuordnung | Vollständige Auswahl und Bulk-Basis erhalten |
| `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:143` | Versionsliste, Create/Delete/Editorlinks | Sucht Episode im gesamten Resultat |
| `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx:141` | `EpisodeEditForm`, Bulk-Helper | Neutralepisode-Zuordnung und Bearbeitung |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts:54` | `episodeNeighborNavigation.ts` | Nachbarn nach Episode, Version und Gruppe |

Alle Tabellenzeilen durch Helper-Referenzsuche und Lesen der Caller verifiziert. Zusätzlich nutzt `scripts/smoke-fansubs.ps1:349,397` den Endpoint direkt. Weitere produktive direkte Caller wurden bei repositoryweiter Suche nicht gefunden. [VERIFIED: Referenzsuche nach getGroupedEpisodes und direktem /episodes-Pfad in frontend, backend und scripts]

### Felder: heutige Semantik, tatsächliche Consumer, erlaubte Änderung

Abkürzungen: P = öffentlicher `FansubVersionBrowser`; G = vollständiger Grouped-Endpoint; D = Detail-/Editorresponse derselben `EpisodeVersion`-Struktur. Die Source-Registry unterhalb der Tabelle benennt die dazu gelesenen Dateien.

| Feld | Tatsächliche Semantik und Consumer | Folgerung |
|---|---|---|
| `id` | `release_variants.id`; P Keys/Play; G Admin Edit/Delete/Bulk/Default/Nachbarn; D Editor | Alias erhalten und ausdrücklich dokumentieren; kein stiller Wechsel auf Version-ID |
| `anime_id` | DTO-Kontext; D Editor/Arbeitsbereich | Vollvertrag erhalten; Public-Kontext eindeutig |
| `episode_number`, `episode_title` | Neutrale Gruppierung/Überschrift; P, sämtliche Adminlisten, Nachbarn | Erhalten; neutralen Fallback auch bei gemischten Inventaren sichern |
| `title` | Variantentitel aus Versions-/Episodefallback; P, Listen, Editor | Erhalten |
| `release_version` | Versionslabel; Nachbarn matchen Label und Gruppe; D Editor/Workspace | Keine Verwechslung mit numerischer `release_version_id`; erhalten |
| `fansub_groups` | Array kanonischer Gruppen; P Filter/Logo/Links; Adminliste/Bulk; Editor/Nachbarn | Plural im Vertrag angleichen; IDs und Slugs autoritativ |
| `default_version_id` | Aktuell erster Varianten-ID-Wert der Gruppe; Accordion markiert Default | Alias dokumentieren; counts-only lässt Feld fehlen |
| `version_count` | Grouped-Anzeige/Accordion; derzeit aus ausgegebenen Rows bzw. separatem Countpfad | Bei Pagination fachlichen Gesamtcount nicht aus geladenem Teilarray ableiten |
| `versions` | P und alle Admin-Grouped-Consumer | Vollpfad erhalten; Public typisiert enger und explizit unvollständig mit Pagination |
| `media_provider`, `media_item_id` | Admin-Per-Episode-Liste, EpisodeEditForm; Detaileditor/Preview | Aus öffentlicher Projektion entfernbar; keinesfalls global löschen |
| `video_quality`, `subtitle_type` | P Metadaten, Adminlisten, Editor | Public und Vollpfad erhalten |
| `production_started_on` | Detaileditor; kein Grouped-Anzeigeconsumer gefunden | Voll-DTo erhalten; in Public nicht projizieren |
| `release_date` | P, Adminlisten/Editor | Erhalten |
| `crc32` | Detaileditor und Erstellungs-/Patchform | Voll-DTo erhalten; Public braucht es nicht |
| `stream_url` | Admin VersionRow Copy-Link, EpisodeEditForm Stream-Link, Detaileditor | Vollvertrag/Streamcompat erhalten; Public liest dieses Feld nicht |
| `segment_count`, `has_segment_asset` | Admin `VersionRow`: Segment-/Dateibadge; kein P-Consumer | Public braucht keinen Segmentjoin; Admin auf Assignment-Wahrheit umstellen |
| `duration_seconds` | Detaileditor/Workspace, Medienpreview; kein Grouped-Anzeigeconsumer gefunden | Voll-DTo erhalten; Public weglassen |
| `covered_episode_numbers` | Go-Query/Go-DTo vorhanden; kein TypeScript- oder UI-Consumer gefunden | Nicht pauschal löschen: Vollvertrag zunächst dokumentieren und TypeScript angleichen; Public braucht es nicht |
| `created_at`, `updated_at` | Go-DTo/TypeScript/OpenAPI vorhanden; kein EpisodeVersion-Anzeigeconsumer gefunden | Vollvertrag erhalten; Public darf ohne diese Felder typisiert werden |

[VERIFIED: backend/internal/models/episode_version.go; backend/internal/repository/episode_version_repository_read_helpers.go; frontend/src/types/episodeVersion.ts; frontend/src/components/fansubs/FansubVersionBrowser.tsx; frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx; frontend/src/components/episodes/EpisodesOverview/EpisodeAccordion.tsx; frontend/src/components/episodes/EpisodesOverview/EpisodesOverview.tsx; frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx; frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx; frontend/src/app/admin/episode-versions/[versionId]/edit/episodeNeighborNavigation.ts; frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts; frontend/src/app/me/releases/[versionId]/workspace/page.tsx]

Weitere Typ-/Vertragscoupling-Consumer: `ReleaseVersionMetadataFields`, `useEpisodeVersionEditor`, `EpisodeVersionEditorPage`, `EpisodeVersionEditorContext` und API Create/Patch/Get-Responses. `scanEpisodeVersion` wird sowohl im Grouped-Read als auch im Detail-Get benutzt. Create/Update liefern anschließend diesen Detail-Read zurück. Additive SELECT-/Scan-Änderungen müssen beide Abfragepfade in derselben Welle aktualisieren. [VERIFIED: backend/internal/repository/episode_version_repository_read_helpers.go:283; backend/internal/repository/episode_version_repository.go:68; frontend/src/types/episodeVersion.ts; repositoryweite EpisodeVersion-Importsuche]

### Nachgewiesener Vertragsdrift

- Go und TypeScript liefern `fansub_groups[]`; OpenAPI beschreibt im EpisodeVersion-Schema stattdessen `fansub_group` singular.
- OpenAPI fehlen vorhandene `release_version`, `covered_episode_numbers`, `production_started_on`, `segment_count`, `has_segment_asset`, `duration_seconds`.
- TypeScript fehlt `covered_episode_numbers`; Segmentfelder sind dort optional, im bisherigen Go-Full-DTO ohne `omitempty`.
- Counts-only liefert `versions: null` aus einem nil-Slice und lässt `default_version_id` weg; OpenAPI fordert den Default und beschreibt `versions` als Array. Eine kleine Normalisierung auf `[]` wäre sinnvoll, aber muss mit Test/Vertragsänderung bewusst beschlossen werden, nicht still im Refactoring entstehen.
- Im fokussierten `admin-content.yaml` gibt es kein entsprechendes EpisodeVersion-/Grouped-Schema. Der einschlägige zentrale Vertrag ist `openapi.yaml`.

[VERIFIED: shared/contracts/openapi.yaml:13666; shared/contracts/openapi.yaml:13722; backend/internal/models/episode_version.go; backend/internal/repository/episode_version_repository_read_helpers.go:30; frontend/src/types/episodeVersion.ts]

### Vorhandene Datenabfragen und Fallen

Der Vollpfad führt Existenzcheck, Episodentitel-Liste, Varianten-Counts und bei `includeVersions=true` die Variantenprojektion aus. Es gibt keine Abfrage je Episode. Die breite Query enthält Coverage, Streams, Gruppen und den Range-basierten Segment-LATERAL; sie hat kein LIMIT. Mehrere Streamzeilen können mehr als eine Ausgabezeile je Variante erzeugen. Ein Cursor muss daher auf vorher normalisierte atomare Zeilen angewendet werden. [VERIFIED: backend/internal/repository/episode_version_repository.go:28; backend/internal/repository/episode_version_repository_read_helpers.go:97]

`listEpisodeTitles` berücksichtigt positive ganzzahlige Episode-Nummern. Der neutrale Fallback wird aktuell nur genutzt, wenn überhaupt keine Varianten ausgegeben werden; bei gemischten Inventaren fehlen neutrale Episoden ohne Variante im Variantenresultat. Die neue öffentliche Projektion muss diese Episoden explizit übernehmen, nicht den alten Fallback blind kopieren. Der vollständige Adminpfad darf bei dieser Arbeit nicht unbemerkt andere Gruppierungssemantik bekommen. [VERIFIED: backend/internal/repository/episode_version_repository.go:28; backend/internal/repository/episode_version_repository_read_helpers.go]

## Phase 2: konkrete Empfehlungen

### Öffentliche Begrenzung auf bestehendem Endpoint

Empfohlene Planentscheidung: `GET /api/v1/anime/{id}/episodes?projection=public&limit=24&cursor=...`. Ohne `projection=public` bleibt der vollständige heutige Pfad inklusive `includeVersions`/`includeFansubs` bestehen. Öffentliche Projektion verlangt Versionen und Gruppen; widersprüchliche Optionskombinationen mit 400 ablehnen und dokumentieren. Keine neue parallele Endpoint- oder Fetchimplementierung.

Die Seitengrenzen 24 Default/100 Maximum existieren bereits als `DefaultCursorPageLimit` und `MaxCursorPageLimit`; `trimCursorPage` implementiert das limit+1-Verfahren. Diese Primitive wiederverwenden. Ein neuer Anime-Cursor benötigt seinen eigenen versionierten Sortierschlüssel und Anime-Scope; die vorhandene Review-Cursorvalidierung ist eine Analogie für strikte Eingabe-/Scopeprüfung, nicht ein wiederverwendbarer Review-Datentyp. [VERIFIED: backend/internal/repository/release_cursor_pagination.go; backend/internal/repository/release_review_query_cursor.go]

Empfohlenes Payload: bestehende Hülle `data.anime_id`, `data.episodes` plus `data.pagination: {has_more, next_cursor, row_limit}`. Öffentlicher Variantentyp enthält `id` als Compatibility-Alias, `variant_id`, `release_version_id`, `anime_id`, `episode_number`, `title`, `release_version`, `fansub_groups`, `video_quality`, `subtitle_type`, `release_date`. Er hat keine erfundenen leeren Providerfelder. In TypeScript einen benannten schmalen Typ aus gemeinsamen tatsächlichen Feldern ableiten und `getGroupedEpisodes` mit typisierten Options-Overloads erweitern; bestehende Aufrufe behalten ihren vollständigen Rückgabetyp.

SQL-Grenze: eine atomare Zeile pro Variante, zusätzlich eine Sentinelzeile pro neutraler Episode ohne Variante. Vor dem LIMIT Coverage-/Gruppen-/Stream-Fanout auf diese Identität normalisieren. Innerhalb derselben Episode müssen viele Varianten über einen stabilen Seek-Schlüssel weiterladbar sein; eine bloße Episode-LIMIT-Grenze ist kein Variantenbudget. Empfohlen: sortierte Episode-Nummer, stabile Episode-ID und Varianten-ID (Sentinel 0); Cursor enthält außerdem Anime-ID und Formatversion. Tests mit gleichen Episode-Nummern sichern stabile Ordnung. `version_count` aus dem vollständigen Episodenkontext vor Cursor/LIMIT ermitteln. Gruppenmetadaten aggregieren, keinen Lookup je Gruppe ausführen.

Client führt dieselbe Episode über Cursorseiten anhand `variant_id` zusammen. Ein explizites Weiterladen nach dem bestehenden Public-Listenpattern bleibt unabhängig von Gruppenauswahl. Solange `has_more` wahr ist, darf eine gefilterte leere Teilmenge nicht als vollständiges fachliches Fehlen dargestellt werden. Initial nicht automatisch alle Seiten serverseitig durchlaufen, sonst ist das Budget wirkungslos. Bei Animewechsel laufende Ergebnisse abbrechen/ignorieren. Zielgrenze ist hier **Row-Limit**, keine ungeprüfte feste KB-Garantie für beliebig lange Texte. Fixture belegt maximal 24 bzw. 100 ausgegebene Atomzeilen, eine Serverquery lädt höchstens Limit+1.

Die exakte Cursor-/Projektionseinführung ist ein dokumentierter kleiner Vertragsfix innerhalb F-08/F-14. Defaults der Administration, vorhandene Streams und beliebige andere API-Consumer werden nicht heimlich gekürzt. Ein bloßer Übergrößenfehler wäre ehrlich, würde aber die vollständige Großinventar-Abnahme nicht erfüllen.

### Explizite Identitäten und Stream-Kompatibilität

Beide SELECT-/Scannerpfade additiv um `variant_id = rv.id` und `release_version_id = rev.id` erweitern. Das bestehende `id` bleibt Varianten-ID; `release_version` bleibt menschliches Versionslabel. `default_version_id` bedeutet weiterhin Default-Varianten-ID und wird entsprechend dokumentiert. Write-Helpers sind außerhalb dieses Slices weiterhin kompatibel. [VERIFIED: backend/internal/repository/episode_version_repository_read_helpers.go:97; backend/internal/repository/episode_version_repository.go:68; backend/internal/repository/episode_version_repository_write_helpers.go:33]

Der vorhandene Detail-/Streamresolver akzeptiert `rv.id=$1 OR rev.id=$1`. Stream-Entitlement und Grant-Claim arbeiten mit kanonischem Releaseversion-Kontext; das öffentliche Play verwendet bislang den Varianten-Alias. Ein einfacher Austausch des Links auf `release_version_id` reicht bei kollidierender fremder Varianten-ID nicht aus. Ein Query-ORDER ist keine Identitätsgarantie. [VERIFIED: backend/internal/repository/episode_version_repository.go:417; backend/internal/handlers/episode_version_grants.go; backend/internal/handlers/episode_version_stream.go; backend/internal/handlers/release_playback_access.go; frontend/src/components/fansubs/FansubVersionBrowser.tsx:258]

Sicherer enger Zusatzpfad, sofern der Plan das Playback dieses Consumers korrigiert: vorhandener URL-Pfad bleibt kanonische Releaseversion-ID und erhält einen optionalen expliziten `variant_id`-Selector. Nur dieser Opt-in-Pfad muss SQL-seitig **beide** Identitäten verknüpfen (`rv.id = variantID AND rv.release_version_id = releaseVersionID`); Grant-/Relay-/Proxy-Transport propagiert den Selector konsistent. Entitlement bleibt an derselben kanonischen Version. Eine fremde Variante wird vor Playback abgewiesen. Fehlt der Selector, bleiben bisherige Compatibility-Aufrufe erhalten. Keine allgemeine Änderung aller Admin-Write-Identifier oder der Berechtigungslogik. Falls diese enge Transportkette nicht komplett abgesichert wird, die bestehende Mehrdeutigkeit ausdrücklich offen dokumentieren und F-14 nicht als vollständig gelöst behaupten.

Isolierte Fixture: Releaseversion 10 hat Variante 100; fremde Releaseversion 20 hat Variante 10. Fremder Stream hat die niedrigere Stream-ID. Prüfen: additive DTO-Identitäten; expliziter Selector 100+Version10 spielt nur Version10; Selector10+Version10 wird verworfen; Default-Compatibility bleibt nach bestehendem Vertrag erreichbar. Zusätzlich Fall `rv.id == rev.id`, zwei Varianten einer Version, fehlender Stream, 401/403 und invalides Selectorformat. Die Auditdaten hatten keine globale ID-Kollision; deshalb keinen bereits live bewiesenen Fehlstream behaupten. [VERIFIED: docs/audits/2026-09-13-public-anime-detail/REQUESTS-AND-SQL.md; genannte Stream-/Grantquellen]

### Segmentwahrheit: nur tatsächliche Consumer bedienen

Im öffentlichen DTO werden Segmentfelder nicht benötigt und der Segmentjoin entfällt dort. Der vollständige Admin-/Detailpfad behält die Felder, verwendet aber `theme_segment_assignments.release_version_id = rev.id`. Das bisherige Range-/Versionslabel-Matching darf nicht als zweite fachliche Wahrheit weiterleben. [VERIFIED: frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx:18; backend/internal/repository/episode_version_repository_read_helpers.go; backend/internal/repository/release_detail_public_repository_helpers.go:103]

Minimaler äquivalenter Aggregationsvorschlag:

```sql
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS segment_count,
         COALESCE(BOOL_OR(ts.source_type = 'release_asset'
           AND NULLIF(BTRIM(ts.source_ref), '') IS NOT NULL), FALSE)
           AS has_segment_asset
  FROM theme_segment_assignments tsa
  JOIN theme_segments ts ON ts.id = tsa.theme_segment_id
  WHERE tsa.release_version_id = rev.id
) segment_info ON TRUE
```

`has_segment_asset` bleibt damit die vorhandene Source-Ref-Aussage, keine neue Behauptung über abspielbare/rendeready Dateien. Das Timeline-Pattern verwendet zusätzlich First-occurrence-Regeln für seine eigene Oberfläche; diese dürfen nicht in einen generischen Versionscount übertragen werden. [VERIFIED: backend/internal/repository/group_repository_cursor_timeline.go; backend/internal/repository/release_detail_public_repository_helpers.go]

### Medien: vorhandene Seams für den Frontend-Plan

Providerbilder unterstützen bereits `width` zur Weitergabe als Jellyfin-`maxWidth`. Der generische Imageupload erzeugt mit imaging eine echte `original`- und `thumb`-Datei, bestehende Thumbbreite 300. `MediaRepository.GetMediaFileVariantURL` löst gespeicherte Varianten auf. Im Anime-Poster-Path-Fallback existieren allerdings Dateien ohne `media_files`-Rows. Deshalb weder Originalpfade blind in Thumbpfade umschreiben noch bei lokalen Staticfiles Queryparameter als Transformation deklarieren. [VERIFIED: backend/internal/handlers/fansub_admin.go:239; backend/internal/handlers/media_upload_image.go:77; backend/internal/handlers/media_upload_image.go:91; backend/internal/handlers/media_upload.go:32; backend/internal/repository/media_repository.go:312]

Die bestehende Next-ResponsiveImage-/Optimierungsseam wird vom Frontend-Preflight geprüft. Alle Wiederverwendungen des Covers (Poster, Spiegelung, Hero, Rotatorfallback) müssen denselben budgetierten URL-Vertrag verwenden, sonst bleibt die unkontrollierte Originalübertragung trotz optimiertem Poster bestehen. Vorhandene Medien nicht migrieren und keine Transformationsjobs ohne Datenfreigabe starten. [VERIFIED: frontend/src/app/anime/[id]/page.tsx; abgestimmtes Frontend-Preflight]

## Validation Architecture und Fixtures

### Phase 1

| Fixture/Test | Erwartung | Geeignete Ebene |
|---|---|---|
| Sichtbarer Anime mit/ohne Relationen | 200, passende Daten bzw. `[]`; zwei Datenstatements | Handler + isoliertes PostgreSQL + pgx QueryTracer |
| Unbekannter/deaktivierter Anime | 404, eine Existenzquery, kein Relationsread | Handler/Repository |
| Deaktivierter Relationstarget | Target bleibt ausgeschlossen | Repository |
| Exists-/Relationsqueryfehler | Unterschiedliche vorhandene 500-Antworten bleiben erhalten | Handler |
| Slug mit whitespace/fehlendem Wert | Autoritativer normalisierter Slug oder dokumentierte Abwesenheit | Scanner/JSON-/Frontend-Vertrag |
| Pretty-Pfad und Compatibility | Builder nutzt übergebene Slugs; numerische Route bleibt funktionsfähig | Frontend-Test und Browser/HTTP |

Strikte SSR-ID, tatsächlicher 404-Status und Metadaten gehören in den Frontend-Plan; keine neue Anime-Slugroute aus dem additiven Datenfeld ableiten.

### Phase 2

| Fixture/Test | Konkrete Absicherung |
|---|---|
| Leere Serie | Kein Fehler; leeres Episodenarray, `has_more=false` |
| Nur neutrale Episode | Episode ohne erfundene Variante; keine Segment-/Gruppendaten nötig |
| Gemischtes Inventar | Neutrale Episode bleibt neben Variantenepisode sichtbar |
| Zwei Gruppen, mehrere Varianten, mehrere Streams | Ein öffentlicher Datensatz je Variante; keine Join-Fanout-Duplikate |
| IDs gleich / IDs verschieden / isolierte Kollision | Varianten-ID, kanonische Version-ID, Kompatibilitätsalias und expliziter Streamselector konsistent |
| Range-Assignment-Divergenz | Segment ohne Assignment trotz passender Range fehlt; Assignment außerhalb Range zählt; Labeländerung ändert Assignment nicht |
| `includeVersions=false`, `includeFansubs=false` | Historischer Optionsvertrag bewusst erhalten bzw. explizit normalisiert; keine implizite neue Null-/Arraydrift |
| 125 Varianten derselben Episode plus neutrale Episode | Default24/Max100 gelten für atomare Zeilen; vollständige Fortsetzung ohne Doppelte/Lücken |
| Gleiche Episode-Nummer / Animewechsel / ungültiger Cursor | Stabile eindeutige Reihenfolge; Cursor kann nicht fremden Scope einschleusen |
| Kleine und große Inventare | Gleiche begrenzte Queryanzahl je Request, keine Abfrage pro Episode/Variante/Gruppe/Contributor |
| Öffentliche und vollständige Responses | OpenAPI, Go-JSON und TS-Typechecks prüfen Pluralgruppen, explizite IDs, Pagination und tatsächliche Optionalität |
| Teilinventar und Gruppenauswahl | Kein Request beim Gruppenwechsel; keine falsche Aussage vollständiger Leere bei `has_more=true` |

Bestehende brauchbare Fixtures/Analoge:

- `backend/internal/testsupport/phase117_postgres.go` baut eine isolierte Phase-117-Schemafixture auf. Sie enthält die Kernstruktur, aber nicht sämtliche aktuell benötigten Anime-/Gruppen-/Varianten-Spalten; neue Tests ergänzen ausschließlich in ihrem validierten isolierten Schema Status/Slug, Gruppenlogo/Slug, Varianten-Metadaten und Coverage. Keine Tabellen in public ändern.
- `backend/internal/testsupport/phase106_postgres.go` erzwingt explizite Test-DSN, einen validierten Testdatenbanknamen, eindeutiges Schema, `search_path` ohne public und streng begrenztes Cleanup. Dieses Sicherheitsmuster wiederverwenden; niemals `DATABASE_URL` still als Test-DSN verwenden.
- `backend/internal/repository/group_repository_cursor_timeline_test.go` enthält bereits Range-/Assignment-Divergenz: ein Segment ohne Assignment darf nicht über die Range in die Ausgabe geraten.
- `backend/internal/repository/theme_segment_assignments_integration_test.go` ist die direkte Assignment-Fixture-Analogie.
- `backend/internal/repository/public_member_performance_audit_test.go` zeigt pgx QueryTracer für Statements/Rows/Dauer. Das vorhandene Live-Audit ist opt-in und setzt read-only; für neue Tests den Tracer im isolierten Fixturekontext benutzen, nicht das Live-Audit implizit aktivieren.
- `backend/internal/repository/episode_version_repository_read_helpers_test.go` enthält `TestListReleaseVariants_SegmentAggregationDoesNotSplitByGroupRow`, der noch den alten `rvg_segment`-SQL-Text fordert. Diesen veralteten Guard bewusst auf Assignment-Wahrheit ändern und mit tatsächlichen SQL-Fixtures ergänzen. Ein Textassert allein beweist weder korrekte IDs noch Queryanzahl.

[VERIFIED: sämtliche oben genannten Test-/Testsupportdateien]

### Testbefehle und sichere Runtime-Aktualisierung

Fokussierter vorhandener nicht schreibender Go-Testlauf (Vorschlag; in diesem Preflight nicht ausgeführt):

```sh
cd /home/d1sk/team4s
docker compose exec -T team4sv30-backend go test ./internal/repository -run '^(TestBuildAnimeListWhere.*|TestScanEpisodeVersion.*|TestEpisodeVersionCreateCrewHookOrdering|TestReleaseCreationRepositoriesExposeSameCrewHook)$' -count=1
```

Neue Fixturetests laufen nur mit explizit verifizierter isolierter Test-DSN nach vorhandenem Testsupport-Sicherheitsmodell. Fehlende DSN muss als fehlende Integrationsabnahme dokumentiert werden; nicht auf Live-DB ausweichen. Bestehende Phase-128-Tests besitzen teils verpflichtende DSN-Anforderungen; ein breiter Testlauf kann dadurch unabhängig von den neuen Änderungen scheitern. Nicht als neue Regression oder als vollständige grüne Abnahme umdeuten. [VERIFIED: backend/internal/testsupport/phase106_postgres.go; backend/internal/testsupport/phase117_postgres.go; bestehende Phase-128-Testkonfiguration]

Die Backendquelle ist derzeit nicht bindgemountet. Compose Watch synchronisiert Backendquellen nach `/app`; Air kompiliert mit `CGO_ENABLED=0 go build -buildvcs=false -o ./tmp/air/server ./cmd/server`. Testdateien triggern Air nicht. Bei Ausführung zuerst bestehenden Watch-Sync prüfen; nötigenfalls gezielte geänderte Quelldateien mit `docker compose cp` übertragen, anschließend Hash, Airlog und Health prüfen. Vor einem Go-Test sicherstellen, dass dessen Testdateien ebenfalls im Container aktuell sind. [VERIFIED: docker-compose.override.yml; backend/.air.toml; Docker-Mount-/Runtime-Prüfung]

**Kein blinder Backend-Neustart:** Der Compose-Startbefehl führt vor Air `go run ./cmd/migrate up -dir /app/database/migrations` aus. Ein Restart wäre daher kein rein technischer Reload im Auftrag ohne Datenänderungen. Hier Compose Watch/Air verwenden; keine Migration starten. [VERIFIED: docker-compose.override.yml]

Phasengates zusätzlich durch den Orchestrator: Typecheck, Lint, Produktionsbuild in konfliktfreier Umgebung, `git diff --check`, Browserbelege, Request-/SQLvergleich, aktualisierte GSD-Artefakte. Dieses Preflight hat keine Produktchecks als erfolgreich ausgegeben und keine Browser-/Human-Abnahme durchgeführt.

## Verantwortlichkeiten und Ausführungsreihenfolge

1. Phase 1: Relations-Repository/Handler/Tests und Slug-DTO/Query/Vertrag parallel planbar; Konfliktdatei OpenAPI serialisieren. Frontend übernimmt sichtbaren Link und übrige F-01 bis F-12-Slices. Technische Verifikation abschließen.
2. Phase 2 zuerst Consumer-/Identitäts-/Assignment-Fixtures und öffentliche Options-/DTO-Definition. Gemeinsame Scanner und ihre beiden SELECTs atomar ändern. Neue öffentliche Query bleibt im vorhandenen EpisodeVersionRepository; bei Größe kleine angrenzende Quelldatei statt zweites Repository.
3. Backend/Vertrag fertigstellen, dann Frontend auf typisierte öffentliche Projektion/Fortsetzung umstellen. Gemeinsamer Gruppenstate löst keine fachlichen Abfragen aus.
4. Enger expliziter Streamselector, sofern implementiert, als zusammenhängende Frontend-Relay/Grant/Proxy/Repository-Kette mit isolierter Kollision verifizieren; nicht halb umstellen.
5. Vollständige Adminconsumer, Counts-only-Optionen und Streamdefaults regressionsprüfen. Grenzen/Statementcounts als Messergebnisse dokumentieren. Human-UAT separat offen führen.

Konfliktdateien Phase 2: `episode_version_repository_read_helpers.go`, `episode_version_repository.go`, `models/episode_version.go`, `handlers/episode_version_reads.go`, TypeScript `episodeVersion.ts`, zentraler API-Helper und `openapi.yaml`. Streamoptionen ergänzen zusätzlich `episode_version_grants.go`, `episode_version_stream.go`, ggf. `release_playback_access.go` und die bereits vorhandenen Relay-/Grant-Transportconsumer. Keine parallelen unkoordinierten Scanneränderungen.

## Don't Hand-Roll / Common Pitfalls

- Keinen Gruppenprofilrequest zur Slugbildung ergänzen; der Gruppenslug ist bereits vorhanden.
- Keine lokale Auth-/Bearer-Logik für Pagination oder Streams bauen; bestehender zentraler Transport bleibt zuständig.
- Nicht `EpisodeVersion.id` global umdeuten: Adminmutation, Nachbarn und Streamcompat verwenden den Alias.
- Nicht Segmentspalten global entfernen: Admin VersionRow rendert sie.
- Nicht Range/Versionslabel als Segmentzuordnung behandeln und keine Query pro Variante ergänzen.
- Nicht vollständige Adminresponses still limitieren oder eine Episode-Limitierung als Variantenlimit verkaufen.
- Nicht `count = loadedVersions.length` bei einer angebrochenen Episodenseite verwenden.
- Keine erfundene KB-Garantie aus einem Row-Limit ableiten; tatsächliche Responses im Großfixture messen.
- Kein falsches Success-Signal aus fehlenden Integrations-DSNs oder rein statischen SQL-Assertions.

## Runtime State Inventory und Security

| Kategorie | Befund / Handlung |
|---|---|
| Persistierte Daten | Bestehende Anime/Slugs, neutrale Episoden, Releaseversionen/Varianten und Assignments bleiben unangetastet. Kein Backfill/Reset/Migration empfohlen. |
| Live Service Config | Compose-/Air-Sync ist verifiziert; keine Runtimekonfiguration oder Dienstidentität umbenennen. |
| OS-registrierter Zustand | Kein OS-Name/Service wird in diesem Scope umbenannt. Kein OS-Migrationsbedarf aus den Codeänderungen. |
| Secrets/Env | Keine Secret-/Env-Keys ändern oder ausgeben; Test-DSNs explizit und isoliert. `.env` wurde nicht gelesen. |
| Buildartefakte | Go-Binary muss nach Sync aktuell sein; kein Neustart über migrationsausführenden Entrypoint. |

Sicherheitsrelevante Grenzen dieses Slices: parametrisiertes SQL, positive IDs, begrenzte und scopegeprüfte Cursor, dieselbe Sichtbarkeitsfilterung für Relations, zentraler Sessionclient, kanonische Entitlement-Identität unabhängig vom Variantenalias. Keine eigene Kryptografie und keine neue Berechtigungsart. Diese Kontrollen sind aus den bestehenden Handler-/Repository-/Authgrenzen abgeleitet; dieses Preflight ist kein allgemeiner ASVS-Sign-off. [VERIFIED: AGENTS.md; docs/frontend/auth-api-client.md; oben referenzierte Handler und Queryhelpers]

## Offene Punkte und Abschlussstatus

- Default24/Max100 und die explizite Fortsetzung sind eine umsetzbare, auf bestehenden Cursorprimitiven basierende Planempfehlung; reale Row-/Payload- und Queryzahlen müssen die Implementierungsfixtures liefern.
- Unveränderte Stream-Default-Kompatibilität kann grundsätzlich mehrdeutig bleiben; Erfolg darf nur für den vollständig abgesicherten expliziten Variantenpfad behauptet werden.
- Die ältere `db-runtime-authority-map.md` enthält historische Legacy-Aussagen; aktuelle Phase-155/156-Entscheidungen und verifizierte Runtimequeries sind für diesen Slice maßgeblich. Keine historische Migrationsbeschreibung als neuen Migrationsauftrag lesen.
- `BACKEND-CONTRACTS.md` ist das einzige durch diesen Subagenten geschriebene Artefakt. Keine Produktdateien, Daten, Migrationen oder Tests wurden verändert; keine Commits angelegt.

## Sources und Confidence

HIGH: kanonischer Repositorycode, zentrale Verträge, AGENTS/AI-HANDOFF, Domain-/Implementation-Dokumente, Audit `AUDIT.md`, `REQUESTS-AND-SQL.md`, `RUNTIME-VERIFICATION.md`, `FOLLOW-UP-PLAN.md`, Komponentenbericht und relevante Phase-155/156-Artefakte. Einzelbehauptungen tragen oben ihre direkten Quellpfade.

Nicht empirisch bestätigt: zukünftige Query-/Payloadverbesserung, Großinventar-UX und Kollisionsbehebung nach Umsetzung. Hier stehen konkrete Tests statt Erfolgsbehauptungen. Kein Trainingwissen und keine neue externe Bibliothek war zur Planung dieser internen Seams nötig.
