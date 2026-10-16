# Phase 185: Testsuite grün machen — alle dauerhaft roten Frontend- und Backend-Tests analysieren und beheben — CONTEXT

## Ziel

"Grün" bedeutet hier: die volle Testsuite (Frontend-Vitest + Backend-Go-Tests) läuft **zweimal
hintereinander ohne roten Test** durch — jeder in der Ist-Stand-Analyse gefundene dauerhaft rote
Test wird durch einen Code-/Testfixture-Fix behoben (siehe Nutzerentscheidungen D-01 bis D-07
unten; Klasse C wird repariert, nicht übersprungen). Kein Test wird gelöscht oder stillschweigend
übersprungen, um die Zahl grün zu färben. Abgeschlossene Migrationen (z. B. 0152) werden dabei
nicht verändert — Fixes für migrationsbedingte Fixture-Konflikte landen in der Fixture, nicht in
der Migration.

## Ist-Zustand

### Vorgehen (kurz)

- Frontend: zwei unabhängige volle `vitest run`-Läufe im Container `team4sv30-frontend`
  (Lauf 1 bereits vom Auftraggeber gestartet, `/tmp/vitest_run1.log`; Lauf 2 selbst ausgeführt,
  `/tmp/vitest_run2.log`).
- Backend: drei `golang:1.25-alpine`-Läufe gegen 23 eigens angelegte Wegwerf-Datenbanken auf dem
  laufenden `team4sv30-db`-Container (siehe unten). Lauf 1 scheiterte an einem falschen Docker-Mount
  (nur `backend/` statt des ganzen Repos — dadurch konnten `database/migrations/` und
  `shared/contracts/` nicht gefunden werden, was fast die gesamte Suite fälschlich rot färbte).
  Lauf 2 (korrigierter Mount) zeigte echte Rotbefunde, aber auch Kontaminationsartefakte aus dem
  fehlgeschlagenen Lauf 1 (dieselben Wegwerf-Datenbanken waren wiederverwendet worden). Lauf 3
  (alle 10 "volles Schema"-Datenbanken neu angelegt, `vips-tools` zusätzlich zu `ffmpeg`
  installiert, `-p 1` für deterministische Reihenfolge) ist der bereinigte, massgebliche Lauf.
  Alle 23 Wegwerf-Datenbanken wurden danach wieder gelöscht (`DROP DATABASE`); `team4s_v2` wurde
  nie berührt.

### Frontend-Testlauf

| Datei + Test | Fehlermeldung (kurz) | Klasse | Seit wann rot | Behebungsvorschlag |
|---|---|---|---|---|
| `frontend/src/types/__tests__/anime-detail-contract.test.ts` > "preserves the complete relation payload including nullable cover and year" | Erwartet `cover_image` in der `required:`-Liste von `AnimeRelation` im OpenAPI-Contract; die Liste enthält `cover_image` seit der Contract-Korrektur nicht mehr (nullable + optional ist jetzt korrekt, nicht mehr widersprüchlich required+nullable) | A | Seit Commit `fa5165fb3`/`a2848ae31` (`refactor(182-03)`), der die „contradictory cover_image required flag" aus `AnimeRelation` bewusst entfernt hat, ohne diesen Test nachzuziehen | Testerwartung an den aktuellen, korrekten Contract anpassen: `cover_image` aus der Pflicht-Teilprüfung der Schleife ausnehmen (es bleibt `nullable: true`, aber nicht mehr `required`) |

In beiden Läufen identisch: **1 Testdatei / 1 Test rot**, 389 Dateien / 3547 Tests grün, 1 Datei
mit 3 `it.todo` (bewusst offen, keine Rotzählung). Keine Diskrepanz zwischen Lauf 1 und Lauf 2 →
kein Kandidat für Klasse D im Frontend.

**Aus Vorphasen genannte Kandidaten, die sich als bereits grün erwiesen haben** (vermutlich durch
Phase 176 behoben, nicht erneut geprüft außer durch die zwei Läufe hier): `badgeArtwork.test.ts`,
`ResponsiveImage.config.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`,
`AnimeProjectNotesSection.test.tsx` (laut `git log` in Commit `2754bd188`,
„test(176-14): deflake AnimeProjectNotesSection..." entflakt), `ReviewDelegationSection.test.tsx`.
Keiner dieser Fälle trat in den zwei aktuellen Läufen rot auf.

### Backend-Testlauf

93 Einzeltests sind in Lauf 3 (bereinigt) rot, über 18 Ursachen-Cluster. Tabelle nach Cluster
gruppiert (Einzeltestnamen vollständig genannt, keine Verkürzung).

| Cluster (Tests) | Fehlermeldung (kurz) | Klasse | Seit wann rot | Behebungsvorschlag |
|---|---|---|---|---|
| `internal/handlers`: `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes`, `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged`, `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` (3) | `httptest`-Mock-Jellyfin-Server liefert `EOF` statt Antwort; Call-Count-Assertion ("exactly once") schlägt dadurch fehl | C | Unklar, reproduzierbar in Lauf 2 UND Lauf 3 identisch | Vermutlich eine Eigenheit des Alpine/musl-Go-Testcontainers mit sehr schnell wiederverwendeten `httptest`-Loopback-Verbindungen. Reparaturvorschlag: denselben Testlauf einmal in einem Debian-basierten `golang:1.25`-Image wiederholen, um Produktcode vs. Umgebung zu trennen, bevor Code geändert wird |
| `internal/handlers/search_bypass_integration_test.go`: `TestSearchBypassTagOnlyFindsGermanTagTranslation`, `TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty`, `TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd`, `TestSearchNeverReturnsNullItemsForUnsearchedEntity` (4) | `db_schema_mismatch` (500): Phase-106-Testfixture (handgerollte Minimal-Tabellen) hat keine Volltextsuch-/Trigram-Spalten, die `SearchRepository` inzwischen voraussetzt | B | Unklar, Phase-106-Fixture ist alt, Suchfundament (Migration 0140) kam später hinzu | Phase-106-Fixture um die unaccent/Trigram-Indizes bzw. generierten `tsvector`-Spalten aus Migration 0140 ergänzen, oder diese 4 Tests auf eine Fixture mit vollem Schema umstellen |
| `internal/migrations`: `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` (1) | Nach erfolgreichem `runner.Up()` fehlt `role_capabilities` — `ResolveMigrationsDir("")` findet beim CWD `backend/internal/migrations` zuerst `backend/database/migrations/` (2 alte Dateien von Juli) statt des echten `database/migrations/` (368 Dateien) | **E** | `backend/database/migrations/` existiert seit 30. Juli (Datei-Zeitstempel), die Landmine ist seither latent, erst durch diesen strengen Test sichtbar | `backend/database/migrations/` (Altlast, nur 2 Dateien + README) entfernen, oder `ResolveMigrationsDir`s Kandidatenliste so ändern, dass der repo-root-Pfad vor dem `backend/`-lokalen Pfad geprüft wird. **Hinweis:** `TestPhase134MigrationFreshUpDownProof` lief in dieser Analyse ohne spezifische Zählung rot/grün durch — mit korrekt gesetzter `TEAM4S_PHASE134_MIGRATION_DSN` (Wartungs-DB `postgres`, nicht die Zieldatenbank) lief er grün; das war ein eigener Fehler in meinem Testaufbau, kein Produktbefund |
| `internal/repository` (Phase-139-Fixture, echte Migrationskette in isoliertem Schema): `TestListUserContributionsGroupsByAnimeAndProject`, `RangeCollapse`, `OverrideDetectionIndependentButIdentical`, `OverrideDetectionIndependentAndDifferent`, `RangeBreaksOnDeviation`, `FiltersServerSide`, `OnlyDeviationsFilter`, `PaginationNeverSplitsAProjectBlock`, `FilterOptionsScopedToUser`, `NoVerifiedClaimReturnsEmptyPage`; `TestGetUserMediaGroupsByReleaseOrEpisode`, `PublicURLAndFileSizeDerivedForReal`, `NoOwnerContextOrPermissionField`, `PaginationNeverSplitsAReleaseBlock`, `CountsFilteredBlocksNotRows`, `FiltersServerSide`, `FilterOptionsScopedToUser`; `TestGetUserRightsSummaryBatchesAcrossGroups`, `EmptyMembershipsSkipsBatchCall`; `TestPhase139ContributionsQueryBudgetIsConstant`, `MediaQueryBudgetIsConstant`, `RightsSummaryQueryBudgetIsConstant`, `ContributionsPaginationDriftAtScale`, `MediaPaginationDriftAtScale` (24) | `apply full migration chain for Phase-139 fixture: execute up migration 152 (f_unaccent_search_path_fix): ERROR: text search dictionary "public.unaccent" does not exist` | B | Struktureller Konflikt zwischen der Phase-139-Fixture (führt die echte Migrationskette in einem isolierten, NICHT-`public`-Schema aus) und Migration 0152, die `public.unaccent` hart kodiert voraussetzt — `CREATE EXTENSION unaccent` (Migration 0140) legt die Objekte beim isolierten `search_path` aber im isolierten Schema an, nicht in `public` | Entweder Migration 0152s Dictionary-Referenz schema-relativ machen (schwierig, ändert eine abgeschlossene Migration), oder die Phase-139-Fixture vor dem Migrationslauf `public` zusätzlich (lesend) ins `search_path` aufnehmen, oder `CREATE EXTENSION unaccent SCHEMA public` explizit erzwingen, bevor der Runner startet |
| `internal/repository/anime_relations_public_postgres_test.go`: `TestGetAnimeRelations_PerspectiveAndPosterCover` (1) | `UPDATE anime SET cover_image = ...` — Spalte existiert nicht mehr | A | Seit Commit `44d84ae04` (Migration 0184, Phase 182-03), die `anime.cover_image` entfernt hat | Testfixture auf den aktuellen Cover-Resolver (`anime_media` + `media_assets`, Poster-Slot) umstellen statt direkt `cover_image` zu schreiben — analog zur Korrektur, die der gleiche Commit an Produktcode schon vorgenommen hat |
| `internal/repository`: `TestEpisodeImportSourceCreateRepeatAndInitialBinding`, `RejectsAndRollsBack`, `CompleteEmptyClearsTechnicalStreams`, `SiblingPersistence`, `AliasesAndCoverage`, `OpposingConcurrentBatches`, `UnresolvedDuplicateFilenameCannotBind`; `TestEpisodeVersionDeletePreservesSiblingSource`, `KeepsReferencedStreamSource` (9) | `column "episode_type_source" of relation "episodes" does not exist` — die handgerollte `openEpisodeImportSourceFixture`-`ALTER TABLE`-Liste wurde nie um diese Spalte ergänzt | B | Seit Migration 0167 (Commit `267fd3764`, „feat(quick-260916-emd)") die Spalte real eingeführt hat | `ALTER TABLE episodes ADD COLUMN episode_type_source ...` zur Fixture-Liste in `episode_import_source_integration_test.go`s `openEpisodeImportSourceFixture` ergänzen |
| `internal/repository/fansub_public_group_display_url_test.go`: `TestGetPublicGroupBase_PrefersDisplayVariant`, `SVGLogoKeepsStoredURL` (2) | `insert or update on table "media_assets" violates foreign key constraint "fk_media_assets_review_status"` — Phase-152-Fixture seedet keinen gültigen `review_status`-Lookup-Wert | B | Unklar — in dieser Analyse nur in Lauf 3 beobachtet (siehe Risiken: evtl. durch Laufreihenfolge/Kontamination in Lauf 2 verdeckt) | Phase-152-Fixture um einen gültigen `review_statuses`-Datensatz ergänzen, auf den `media_assets.review_status_id` zeigen kann |
| `internal/repository/group_release_version_count_test.go`: `TestGetGroupReleaseVersionCount_MatchesLegacyRowCountForMultiVersionEpisode`, `MatchesSingleVersionCase` (2) | `duplicate key value violates unique constraint "fansub_groups_pkey"` beim Aufruf der gemeinsamen „seed Phase-155 fixture"-Hilfsfunktion | B | Unklar, in Lauf 2 UND Lauf 3 reproduziert | Die gemeinsame Phase-155-Seed-Hilfsfunktion (`fansub_project_resolver_query_budget_test.go`) räumt zwischen Aufrufen aus verschiedenen Testdateien offenbar nicht zuverlässig auf — Seed-ID dynamisch vergeben statt hartkodiert, oder expliziten Cleanup vor jedem Aufruf ergänzen |
| `internal/repository/hist_group_member_roles_fansub_group_test.go`: `TestListFansubGroupRoleDefinitionsGroupContextRoles` (1) | `list fansub group role definitions: ERROR: relation "role_capabilities" does not exist` | B | Mindestens seit Commit `6734cf66f` (Phase-135-Fixture-Erstellung), die `role_capabilities` nie in die handgerollte Phase-135-Fixture aufgenommen hat | `role_capabilities`-Tabelle (minimal, mit den vom Test benötigten Spalten) zur Phase-135-Fixture ergänzen |
| `internal/repository/member_claims_repository_test.go`: `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` (1) | `os.ReadFile`+`strings.Index` auf `member_claims_repository.go` findet `SubmitClaim` nicht mehr (Methode existiert in dieser Datei nicht mehr) | A | Unklar genau wann `SubmitClaim` verschoben wurde (liegt heute vermutlich in `member_claims_submit_repository.go`, vgl. CLAUDE.md-Hinweis zum doppelten Memorial-Guard D-21) | Gehört zur in CLAUDE.md dokumentierten Teststil-Altlast (Datei steht bereits in `LegacyAllowedSubstringTestFiles`, s. u.) — im Zuge der Behebung gleich auf echten httptest-Verhaltenstest umstellen statt nur den Suchstring zu korrigieren |
| `internal/repository/membership_baseline_registry_test.go`: `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` (1) | `permission cache: Action "release_version_media.reorder" fehlt in role_capabilities und ist keine standalone-Action — Startup abgebrochen` | A | Seit Commit `98c5f1dfe` (Phase 169-01), die die Action neu eingeführt hat, ohne die hier hart kodierte Patch-Liste (`membershipBaselineFillGapCacheLoader`) nachzuziehen | `release_version_media.reorder` zur lokalen Gap-Filler-Liste in `membership_baseline_registry_test.go` ergänzen |
| `internal/repository/phase134_verification_matrix_access_test.go` + `phase134_verification_matrix_test.go`: `TestPhase134MatrixAnonymousPublicProfile`, `MissingProfile`, `HiddenProfileIsIndistinguishableFromMissing`, `OwnerPreviewOfHiddenProfile`, `RefreshOnlyOwnerAccess`, `SparseProfileMatchesManifest`, `DenseProfileMatchesManifest`, `ErrorMalformedSlugDoesNotPanic`, `PaginationHonestAcrossPages` (9) | `dial tcp 192.168.235.196:18093: connect: connection refused` — Test ruft fest verdrahtet die LAN-IP des Host (`team4s-linux`) auf einem Port an, der im Testcontainer nicht erreichbar ist | C | Unklar, strukturell (der Test braucht einen laufenden, von außen über die Host-IP erreichbaren Backend-Server) | Siehe „Offene Fragen" — entweder den echten `team4sv30-backend`-Container vor dem Testlauf hochfahren und über das Docker-Netzwerk statt der Host-IP ansprechen, oder den Test auf einen `httptest`-Server umstellen |
| `internal/repository` (Phase-167/176/178-Fixture, gleiche Ursache wie Phase-139-Cluster, aber über `createPhase167Prerequisites`): `TestFansubGroupKuerzelUniqueness_SetsFreshKuerzel`, `KuerzelVsKuerzelConflict`, `KuerzelVsAliasConflict`, `AliasVsKuerzelConflict`, `SameGroupOwnAliasIsNotAConflict`; `TestResolveFansubGroupMatches_KuerzelTierPrecedence`, `KuerzelCoexistsWithOtherTiers`, `ExactTiers`, `ConstantQueryBudget`, `UniquenessRespected`; `TestApplyDoesNotAutoCreateFansubGroup`, `ApplyLearnsNewAliasForExplicitGroup`, `ApplyDoesNotReassignConflictingAlias`; `TestFansubGroupCreateKuerzel_SetsFreshKuerzel`, `EmptyKuerzelBecomesNull`, `ConflictsWithExistingKuerzel`, `ConflictsWithExistingAlias`; `TestPhase178FansubGroupAliases_ListGroupsIncludesAliases`, `GetGroupByIDIncludesAliases`, `NoAliasesIsEmptyNotError` (20) | `create Phase-167 prerequisites: ERROR: text search dictionary "public.unaccent" does not exist` | B | Gleiche strukturelle Ursache wie der Phase-139-Cluster oben (isoliertes Schema + Migration 0152) | Gleicher Fix wie beim Phase-139-Cluster — beide Fixtures nutzen denselben Migrationslauf-Mechanismus |
| `internal/services/release_review_query_repository_test.go`: `TestPhase141RevokedDelegationImmediateEffect` (1) | `load permissions cache for release review delegation test: permission cache: Action "release_version_media.reorder" fehlt ...` | A | Seit Commit `98c5f1dfe` (Phase 169-01), s. o. — anderer Stub, gleiche Lücke | `release_version_media.reorder` zur lokalen Permission-Stub-Liste dieser Testdatei ergänzen |
| `internal/repository/release_version_media_repository_test.go`: `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`, `ListAllowsOrdinaryRowsWithoutHighlight`, `SoftDeleteQueryExcludesDeletedRows`, `TestReleaseVersionMediaHighlightsAreIndependentFromPreview` (4) | `list release_version_media for version 41: ERROR: column au.display_name does not exist` | B | Unklar — F-14-ähnliches Muster (vgl. Phase 176/D-06, dort wurde eine ANDERE RVM-Fixture-Datei gefixt, diese hier nicht) | Dieselbe `app_users`-Spaltenergänzung (`display_name`, `preferred_username`), die Phase 176/176-09 für `openRVMExecFixture` vorgenommen hat, auch auf die hier verwendete Fixture übertragen |
| `internal/repository/episode_version_dates_integration_test.go`: `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure` (Subtest `admin=true`) (1) | `get episode classification release_version=503: ERROR: column e.filler_source does not exist` | B | Unklar | Fixture um `episodes.filler_source` ergänzen (gleiche Familie wie der `episode_type_source`-Cluster oben) |
| `internal/repository/release_version_media_cross_package_test.go`: `TestRVMHandler_ProzessmedienDefaults` (1) | Nil-Pointer-Panic in `UploadReleaseVersionMedia` beim Audit-Log-Schreiben (`h.auditLogRepo.Write`) — der Test übergibt bewusst `nil` an `WithPermissionDeps(..., nil)` | B | Unklar wann der Audit-Log-Aufruf im Erfolgspfad hinzukam; `cmd/server/main.go` verdrahtet `auditLogRepo` in der echten Produktion immer real, dieser Pfad ist dort nie erreichbar | Test: einen No-op-Fake für `auditLogRepo` statt `nil` übergeben. Optional zusätzlich als Robustheits-Härtung: Nil-Guard vor `h.auditLogRepo.Write(...)` im Handler selbst |
| `internal/services/effective_rights_service_test.go`: `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`, `Transitions`, `RequiresReasonForRealChange`, `RejectsInactiveOrMissingTarget`, `RetainedDormantWhenMembershipBecomesInactive`, `Authorization`, `CatalogValidation`, `RollsBackOnHistoryFailure` (8) | Erster Test: gleiche `release_version_media.reorder`-Stub-Lücke wie oben (bricht den `sync.Once`-Cache-Load ab); alle folgenden Tests: `ERROR: relation "member_claims" already exists` (die lokale `CREATE TABLE member_claims` kollidiert mit der `CREATE TABLE IF NOT EXISTS member_claims`, die `testsupport.OpenPhase137Postgres` seit Plan 138-05 selbst schon anlegt) | A (1. Schicht) + B (2. Schicht) | 1. Schicht seit `98c5f1dfe` (169-01); 2. Schicht seit Plan 138-05 (phase137-Fixture bekam eine eigene `member_claims`-Tabelle, die lokale Kopie hier wurde nie entfernt) | Zweistufig: (1) Stub-Liste um `release_version_media.reorder` ergänzen, (2) die lokale `CREATE TABLE member_claims` in `openPhase137EffectiveRightsPostgres` entfernen (die Tabelle existiert durch die geteilte Fixture bereits) |

**Im Zuge der Analyse bereits lokal aufgelöst, daher NICHT in der obigen Tabelle gezählt** (beide
Punkte sind reine Artefakte des improvisierten `golang:1.25-alpine`-Testcontainers, nicht des
echten Produkt-Containers, der laut `backend/Dockerfile` bereits `vips vips-tools ffmpeg`
mitbringt):
- `TestMediaUploadHandler_AnimatedWebPUploadDisplayUsesDisplayVariantFileName`,
  `TestGenerateAnimatedDisplayViaVips_PreservesFramesAndCapsEdge`,
  `TestExtractFirstFrameViaVips_ReturnsStaticJPEGFrame0`,
  `TestSaveUpload_AnimatedWebPDisplayStaysAnimated` — scheiterten nur, weil `vips-tools` im
  schlanken Testimage fehlte; nach Installation liefen alle vier grün.
- `TestPhase134MigrationFreshUpDownProof` — scheiterte nur an einer falsch gesetzten
  `TEAM4S_PHASE134_MIGRATION_DSN` (musste auf die `postgres`-Wartungsdatenbank zeigen, nicht auf
  die Zieldatenbank selbst); mit korrigiertem DSN lief er grün.

### Quelltext-Inspektionstests (F-22-Altlast, separat — nicht Teil der „rot"-Zählung)

`backend/internal/testquality/source_substring_guard_test.go` führt bereits eine **eingefrorene,
nur schrumpfende** Ausnahmeliste (`LegacyAllowedSubstringTestFiles`, 34 Dateien) für genau das in
CLAUDE.md verbotene Muster (`os.ReadFile` auf die eigene `.go`-Quelldatei + `strings.Contains`
als Verhaltensnachweis). Ein automatisierter Ratchet-Test (`TestNoNewSourceSubstringTests`) prüft
in allen drei Läufen GRÜN, dass außerhalb dieser 34 Dateien kein neuer Fall entstanden ist. Die 34
Dateien sind:

```
cmd/server/phase108_runtime_wiring_test.go
internal/handlers/admin_content_release_version_notes_test.go
internal/handlers/contributions_me_member_anchor_test.go
internal/handlers/fansub_media_upload_thumbnail_test.go
internal/handlers/group_contributors_handler_test.go
internal/handlers/media_upload_test.go
internal/handlers/member_media_upload_defaults_test.go
internal/handlers/project_member_public_handler_test.go
internal/repository/admin_content_theme_asset_locks_test.go
internal/repository/admin_users_repository_test.go
internal/repository/admin_users_tab_repository_test.go
internal/repository/anime_contributions_display_avatar_test.go
internal/repository/anime_contributions_member_anchor_test.go
internal/repository/anime_contributions_member_project_repository_test.go
internal/repository/anime_coverage_repository_test.go
internal/repository/anime_project_notes_repository_test.go
internal/repository/app_auth_repository_test.go
internal/repository/episode_import_repository_release_helpers_test.go
internal/repository/episode_import_repository_test.go
internal/repository/episode_version_repository_read_helpers_test.go
internal/repository/episode_version_repository_test.go
internal/repository/episode_version_repository_write_helpers_test.go
internal/repository/fansub_notes_repository_test.go
internal/repository/fansub_repository_test.go
internal/repository/group_contributors_repository_test.go
internal/repository/group_repository_test.go
internal/repository/group_themes_repository_test.go
internal/repository/media_repository_path_test.go
internal/repository/member_claims_repository_test.go
internal/repository/member_profile_repository_test.go
internal/repository/release_detail_cursor_test.go
internal/repository/release_version_notes_repository_test.go
internal/repository/review_credit_repository_test.go
internal/services/release_version_media_cleanup_test.go
```

Eine dieser 34 Dateien (`internal/repository/member_claims_repository_test.go`) ist zusätzlich
gerade ROT (s. Tabelle oben) — nicht weil der Ratchet-Guard versagt, sondern weil der
Suchstring-Treffer selbst wegen eines Produktcode-Refactors fehlschlägt. Das ist ein zusätzliches
Argument, genau diese Datei im Zuge der Behebung gleich auf echten Verhaltenstest umzustellen,
statt nur den Suchstring zu reparieren.

### Zusammenfassung nach Klasse

| Klasse | Frontend | Backend | Gesamt |
|---|---|---|---|
| A (veraltete Erwartung) | 1 | 4 rein + 8 im Mischfall (Phase-137-Cluster, 1. Schicht) | 5–13 |
| B (Test-Fixture/Schema-Drift) | 0 | 68 rein + 8 im Mischfall (Phase-137-Cluster, 2. Schicht) | 68–76 |
| C (Umgebungsabhängigkeit) | 0 | 12 (3 Jellyfin-EOF + 9 Phase-134-Matrix) | 12 |
| D (wackelig/Timing) | 0 | 0 (kein belastbarer Fall über die durchgeführten Vergleichsläufe) | 0 |
| E (echter Produktfehler) | 0 | 1 (`ResolveMigrationsDir`-Landmine) | 1 |
| **Gesamt** | **1** | **93** | **94** |

Der Phase-137-Cluster (8 Tests) ist zweistufig (A dann B) und wird in der Summe nur einmal unter
„Backend gesamt" gezählt, aber in beiden Klassenzeilen aufgeführt, da beide Fixes nötig sind.

## Vorschlag je Klasse

**Klasse A (veraltete Erwartung):** Die Testerwartung wird an den heute korrekten, absichtlich
geänderten Zustand angepasst (Commit-Referenz dokumentiert den Grund der Änderung). Kein
Produktcode wird zurückgedreht. Betrifft hier überwiegend Fälle, in denen ein Refactor
(Spalten-Drop, Methodenverschiebung, neue Permission-Action) einen Nachbar-Test oder eine
Hilfsliste nicht mitgezogen hat.

**Klasse B (Test-Fixture/Schema-Drift):** Die jeweilige handgerollte Testfixture (hand-rolled
Minimal-Schema oder lokale Patch-/Stub-Liste) wird um die fehlenden Spalten/Tabellen/Einträge
ergänzt, die der produktive Code inzwischen voraussetzt. Der mit Abstand größte Einzelblock ist
der „public.unaccent"-Konflikt zwischen schema-isolierten Migrations-Fixtures (Phase 139/167) und
Migration 0152 — hier lohnt sich EIN gemeinsamer Fix statt 44 Einzelreparaturen.

**Klasse C (Umgebungsabhängigkeit):** Siehe D-03 unten — wird repariert (Debian-Image-Probe bzw.
Docker-Netzwerk-Adressierung statt Host-IP), nicht übersprungen oder gelöscht.

**Klasse D (wackelig/Timing):** Im Frontend über die zwei Läufe kein Fall gefunden. Im Backend
wurde das Vorgehen (zwei bereinigte Läufe, Lauf 2 vs. 3) genutzt, um Kontaminations-Artefakte von
echten Befunden zu trennen — die verbleibenden Backend-Cluster sind reproduzierbar, keiner wurde
als rein zeitabhängig/wacklig identifiziert. Zwei Einzelfälle (`TestGetPublicGroupBase_*`) wurden
nur in Lauf 3 beobachtet; das ist im Risikoabschnitt vermerkt, aber eher auf
Kontaminations-Maskierung in Lauf 2 als auf echte Flakiness zurückzuführen.

**Klasse E (echter Produktfehler):** Direkt fixen (Entfernen von `backend/database/migrations/`
bzw. Korrektur der Kandidatenreihenfolge in `ResolveMigrationsDir`), da der Fix klein und
risikoarm ist — keine Abspaltung in eine Folge-Phase nötig.

## Risiken

- **Klasse-E-Fixes können weitere Befunde aufdecken:** Der `ResolveMigrationsDir`-Fix betrifft
  auch `cmd/migrate/main.go` (echtes Migrationswerkzeug) — eine Korrektur der Kandidatenreihenfolge
  sollte nach dem Fix einmal gegen eine echte Migrationsausführung geprüft werden, nicht nur gegen
  den einen Test, der sie aufgedeckt hat.
- **Der Phase-139/167-„public.unaccent"-Fix berührt eine abgeschlossene Migration (0152) oder eine
  gemeinsam genutzte Testinfrastruktur-Funktion** — je nachdem, welche Lösung gewählt wird, können
  Seiteneffekte auf andere, aktuell grüne Phase-139/167-Konsumenten entstehen. Nach dem Fix muss
  die betroffene Testdatei komplett (nicht nur die hier roten Einzeltests) erneut laufen.
  Divergierende Schema-Annahmen zwischen den „volles Schema"-Fixtures (Phase 129/131/150/152/155,
  Anime-Source-Links, Episode-Metadata, Fansub, Library-Discovery, Relations) und den
  handgerollten Fixtures (Phase 106/107/117/128/134/135/137/139/145/150/165/167/182) sind
  dokumentiert, aber nicht vollständig vereinheitlicht — das ist bewusst außerhalb des Scopes
  dieser Phase (s. Abgrenzung).
- **Kontaminations-Risiko bei künftigen Testläufen:** Die „volles Schema"-Fixtures (Phase
  129/131/150/152/155 u.a.) nutzen KEINE Schema-Isolation, sondern feste IDs + manuelles
  DELETE-Cleanup in einer gemeinsam genutzten physischen Datenbank. Wird eine dieser Datenbanken
  zwischen Testläufen nicht neu angelegt, können (wie in dieser Analyse bei Lauf 1→2 beobachtet)
  Altdaten echte Befunde verdecken oder vortäuschen. Jeder künftige Referenzlauf sollte die
  Datenbank vorher neu anlegen, nicht wiederverwenden.
- **Zwei Einzeltests (`TestGetPublicGroupBase_PrefersDisplayVariant`, `SVGLogoKeepsStoredURL`)
  wurden nur in einem von zwei Backend-Läufen beobachtet** (möglicherweise durch das oben genannte
  Kontaminationsrisiko in die andere Richtung — Lauf 2 hatte zufällig einen gültigen
  `review_status`-Altdatensatz). Vor der eigentlichen Behebung lohnt sich ein weiterer, bereinigter
  Kontroll-Lauf, um "dauerhaft rot" sicher zu bestätigen.
- **Die Jellyfin-EOF-Cluster (3 Tests) könnten umgebungsspezifisch (Alpine/musl) statt
  produktrelevant sein** — ein Fix "ins Leere" (Codeänderung ohne echten Bug) ist möglich, falls
  sich das Problem bei einem Debian-basierten Testlauf nicht reproduzieren lässt.

## Abgrenzung

- Keine generelle Vereinheitlichung der Backend-Test-DSN-Strategie (volles Schema vs. handgerollt
  vs. echte Migrationskette) über das für die konkreten Fixes nötige Maß hinaus.
- Keine Überarbeitung der Testinfrastruktur (`testsupport`-Pakete) als Selbstzweck — nur die
  Fixture-Lücken, die hier konkret benannte Tests rot färben, werden geschlossen.
- Die 34-Datei-Altlast-Liste (`LegacyAllowedSubstringTestFiles`) wird NICHT pauschal in dieser
  Phase auf echte Verhaltenstests umgestellt (D-06) — nur die eine Datei, die ohnehin wegen eines
  echten Rotbefunds angefasst werden muss (`member_claims_repository_test.go`, D-02), bekommt
  dabei den vollständigeren Fix.
- Keine Migration der Produktionslogik hinter den Klasse-E-Befunden über die reine
  Verzeichnis-/Reihenfolge-Korrektur hinaus (D-04).
- Keine generelle Vereinheitlichung aller Backend-Testfixture-Strategien über das für D-02/D-07
  konkret nötige Maß hinaus (z. B. keine Zusammenführung der "volles Schema"- und der
  handgerollten Fixture-Familien).

## Nutzerentscheidungen (final, verbindlich)

- **D-01 (Frontend, Klasse A):** `anime-detail-contract.test.ts` wird an den aktuellen, korrekten
  Contract angepasst — `cover_image` bleibt `nullable: true`, wird aber aus der
  Pflicht-Teilprüfung (`required`) der Schleife ausgenommen. Kein Produktcode/Contract wird
  zurückgedreht.

- **D-02 (Backend, Klasse A/B inkl. 44er-`unaccent`-Cluster Phase-139/167):** Alle Klasse-A- und
  Klasse-B-Fälle werden wie im Abschnitt „Vorschlag je Klasse" und in der Cluster-Tabelle oben
  vorgeschlagen durch Fixture-/Testcode-Reparatur behoben (fehlende Spalten/Tabellen/Stub-Einträge
  ergänzen, Methodenverschiebungen nachziehen). Abgeschlossene Migrationen (insbesondere 0152)
  werden dabei NICHT verändert — der `public.unaccent`-Konflikt wird in der Fixture gelöst
  (`search_path` vor dem Migrationslauf um `public` ergänzen bzw. `CREATE EXTENSION unaccent
  SCHEMA public` erzwingen), nicht in der Migration selbst. Der rote Quelltext-Inspektionstest in
  `member_claims_repository_test.go` wird dabei zusätzlich auf einen echten `httptest`-basierten
  Verhaltenstest umgestellt (nicht nur den Suchstring korrigiert) und aus
  `LegacyAllowedSubstringTestFiles` entfernt.

- **D-03 (Backend, Klasse C — reparieren, nicht überspringen):**
  - (a) Jellyfin-Preview-EOF-Cluster (3 Tests): zuerst denselben Lauf mit einem
    Debian-basierten `golang:1.25`-Image wiederholen. Bestätigt sich Alpine-Spezifität, wird der
    dokumentierte Backend-Testlauf (siehe D-07) dauerhaft auf das Debian-Image umgestellt. Zeigt
    sich stattdessen ein echter Fehler, werden Test bzw. Produktcode korrigiert.
  - (b) Phase-134-Matrix-Cluster (9 Tests): keine fest verdrahtete Host-IP mehr. Die Tests sprechen
    den Backend-Server über das Docker-Netzwerk (Service-Name) bzw. eine über ENV konfigurierbare
    URL an, statt `192.168.235.196:18093` hart zu kodieren.

- **D-04 (Backend, Klasse E — jetzt beheben):** `backend/database/migrations/` wird nach einer
  Nutzungsprüfung (grep über Code, Dockerfiles, Skripte, `docker-compose.yml`) entfernt, sofern
  keine anderen Konsumenten diesen Pfad erwarten. Zusätzlich wird `ResolveMigrationsDir` so
  korrigiert, dass das Repo-Root-Verzeichnis `database/migrations/` Vorrang vor einem
  `backend/`-lokalen Treffer hat. `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible`
  belegt den Fix.

- **D-05 (Backend, Klasse B — `TestGetPublicGroupBase_*`):** Direkt fixen (fehlenden
  `review_statuses`-Seed-Datensatz in der Phase-152-Fixture ergänzen), ohne weiteren
  Kontroll-Lauf vorab.

- **D-06 (Backend, Quelltext-Inspektionstests):** Die übrigen 34 Dateien in
  `LegacyAllowedSubstringTestFiles` (minus der einen Datei aus D-02) bleiben unverändert — keine
  pauschale Umstellung in dieser Phase, nur beim nächsten inhaltlichen Anfassen dieser Dateien.

- **D-07 (Reproduzierbarkeit):** Der vollständige Backend-Testlauf (Image-Wahl gemäß D-03a,
  Mounts, benötigte ENV-Variablen/DSNs für alle `*_TEST_DSN`-Fälle, Anlage und Abbau der
  Wegwerf-Datenbanken) wird als Skript unter `scripts/` abgelegt (z. B. `scripts/test-backend.sh`)
  und in `docs/ENTWICKLUNG.md` auf Deutsch beschrieben, damit künftige Agenten nicht erneut an
  Mounts/DSNs scheitern. Abschluss-Kriterium der Phase: volle Frontend- (`vitest run`) und
  Backend-Suite (`scripts/test-backend.sh`) laufen je zweimal hintereinander mit 0 roten Tests.

Übergreifend gilt die CLAUDE.md-Regel „Übergroße Dateien beim Anfassen aufteilen" für
Produktionsdateien (Testdateien nur, wenn im Einzelfall sinnvoll), und es wird zu keinem Zeitpunkt
`team4s_v2` für Testläufe verwendet — ausschließlich selbst angelegte und wieder entfernte
Wegwerf-Datenbanken.
