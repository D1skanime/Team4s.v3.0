---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Asset Lifecycle Hardening
status: milestone_complete
stopped_at: Phase 57 security and validation passed; authenticated browser UAT pending
last_updated: "2026-06-02T07:10:20.323Z"
last_activity: 2026-06-01
progress:
  total_phases: 64
  completed_phases: 43
  total_plans: 225
  completed_plans: 186
  percent: 67
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.
**Current focus:** Milestone complete

## Current Position

Phase: 61
Plan: 01 complete

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md`.

Recent durable decisions:

- [Phase 40-10]: flatMap statt map().filter() für typsichere BulkNoteInput-Array-Filterung — vermeidet TS2322/TS2677 bei Null-Rückgaben.
- [Phase 40-04]: BulkUpsertReleaseVersionNotes liest nach COMMIT via ListReleaseVersionNotes (Pool) zurück — einfacher, konsistenter als In-TX-Lesung.
- [Phase 40-04]: GetMemberRolesForVersion nutzt JOIN release_versions → fansub_releases → release_member_roles → members + contributor_roles (cr.label AS role_label).
- [Phase 40]: TRUNCATE contributor_roles CASCADE statt additivem INSERT ON CONFLICT — bestehende 6 Seeds sind Test-Daten (User-Entscheidung); DOWN ist No-op weil CASCADE nicht reversibel.
- Shared admin anime editing stays on one editor surface across create and edit.
- Jellyfin-assisted intake stays preview-only until explicit save.
- Manual values and manual replacement assets stay authoritative over later resync behavior.
- Relation editing stays limited to the four approved V1 labels.
- The v1.1 milestone is generic upload, asset lifecycle, and folder provisioning rather than more intake expansion.
- The current execution scope is anime-first and V2-first; group and fansub media follows later.
- [Phase 07-generic-upload-and-linking]: Keep one `/api/v1/admin/upload` seam and map `background_video` to stored media type `video` inside the repository layer.
- [Phase 07-generic-upload-and-linking]: Resolve persisted `logo` and `background_video` URLs through the existing anime backdrop manifest before any Jellyfin fallback.
- [Phase 07-generic-upload-and-linking]: Frontend asset uploads now route through an asset-kind config so singular slots and additive backgrounds share one mutation seam without slot-specific helpers.
- [Phase 07-generic-upload-and-linking]: The client mirrors backend slot names directly for `logo` and `background_video`, while `cover` continues to map to the upload seam's `poster` alias.
- [Phase 07]: `ManualCreateWorkspace` stays a shell while `ManualCreateAssetUploadPanel` owns the visible cover and non-cover staging controls.
- [Phase 07]: Create-route staging now uses one asset-kind plan so post-create linking stays typed and background remains additive.
- [Phase 07]: Keep `cover`, `banner`, `logo`, and `background_video` as singular replacement slots while preserving additive background uploads.
- [Phase 07]: Split metadata copy and asset-card helpers out of `AnimeJellyfinMetadataSection.tsx` so the edit shell stays under the line-count guardrail.
- [Phase 10 split]: Create tags and metadata card refactor lands before AniSearch edit enrichment.
- [Phase 11]: Duplicate edit AniSearch IDs return 409 conflict responses with redirect metadata instead of moving provenance.
- [Phase 11]: Edit AniSearch provenance persists through PATCH source/folder_name fields instead of the enrichment endpoint writing it implicitly.
- [Phase 11]: Plan 11-02 should implement against a reserved 501 route plus red regression tests rather than inferring partial runtime behavior.
- [Phase 11-anisearch-edit-enrichment-and-relation-persistence]: Edit AniSearch enrichment reuses shared fetch/relation resolution through LoadAniSearchDraft instead of duplicating crawler logic in handlers.
- [Phase 11-anisearch-edit-enrichment-and-relation-persistence]: AniSearch provenance persists through the schema-aware V2 PATCH writer (source and folder_name) while edit enrichment stays draft-first.
- [Phase 11]: Edit AniSearch provenance now flows through the existing patch state so source and folder_name persist only on explicit save.
- [Phase 11]: AniSearch auto-applied relation feedback refreshes the existing relations section by remounting it from the page shell instead of duplicating relation state.
- [Phase 11]: The shared edit AniSearch helper keeps the success DTO unchanged and attaches duplicate-owner metadata to ApiError only for the edit enrichment seam.
- [Phase 11]: The edit workspace consumes hook-managed conflict state directly so duplicate AniSearch ownership renders inside the existing card instead of falling back to generic error text.
- [Phase 11]: Create success copy is derived from AniSearch follow-through counts and warnings through the existing page helper seam instead of a new UI channel.
- [Phase 11]: The create route delays redirect briefly so AniSearch warning context is visible before navigation.
- [Phase 11]: Removed the unreachable create-side AniSearch placeholder instead of inventing a new intake surface in a gap-closure plan.
- [Phase 11]: Create-route warning-before-redirect verification stays automated until a live create-side AniSearch intake action exists.
- [Phase 12]: Create AniSearch stays on one exact-ID enrichment helper and returns either a draft result or redirect result without a second duplicate policy.
- [Phase 12]: Unsaved AniSearch create feedback is shaped in a dedicated summary helper instead of extending persisted create success messaging.
- [Phase 12]: Create-route AniSearch transitions stay in a small helper module so the controller hook does not absorb more merge logic.
- [Phase 12]: Final create payload linkage now prefers AniSearch provenance over Jellyfin linkage whenever an AniSearch draft result is active.
- [Phase 13 prep]: AniSearch create intake is now verified complete, so the remaining relation follow-through breakage should be isolated as its own repair phase instead of reopening the finished create-intake work.
- [Phase 13]: AniSearch relation follow-through repair is treated as implemented in the active milestone baseline.
- [Phase 14]: Provider-search separation is treated as implemented in the active milestone baseline, and its UI contract was refreshed on 2026-04-16 to define the final create-page UX.
- [Phase 16]: AniSearch title-search duplicate suppression remains in the backend service by resolving candidate batches through existing anisearch:{id} source ownership.
- [Phase 16]: The AniSearch search handler now returns a typed response envelope so callers can distinguish no raw hits from all hits being filtered locally.
- [Phase 16]: Default filtered_existing_count to 0 in the typed AniSearch client so create-route logic can consume a stable envelope.
- [Phase 16]: Filtered-empty AniSearch title searches reuse the existing create-card status surface with explicit hidden-duplicate copy instead of a new UI mode.
- [Phase 16]: Browser UAT confirmed both mixed-result filtering and filtered-empty feedback on `/admin/anime/create`.
- [Phase 17 prep]: Finalized UX logic for `/admin/anime/create` is now documented: no draft-save concept, AniSearch first for metadata, Jellyfin first for folder/path matching, and Jellyfin assets only after explicit adoption into the shared asset area.
- [Phase 17]: CreatePageStepper uses anchor links to named section IDs for zero-JS scroll navigation
- [Phase 17]: statusBar pills removed from create header; status info moves to Section 4 in plan 17-05
- [Phase 17]: AniSearch card copy uses temporal framing throughout: all Entwurf/draft-product language replaced by create-time alternatives without changing internal variable names
- [Phase 17]: Jellyfin asset adoption gated behind explicit handleJellyfinAdopt handler rather than auto-hydrating on preview load
- [Phase 17]: reviewMissingFields computed directly in page.tsx to bypass showValidationSummary filter for always-visible review checklist
- [Phase 17.1]: Worktree branch merged main before applying 17.1 changes since worktree was on an older pre-phase-17 codebase
- [Phase 17.1]: Source badge overlay on asset card preview uses assetCardSourceOverlay base + source-specific modifier class; icon buttons replace text pill action buttons in CreateAssetSection
- [Phase 17 closeout]: Anime Create is complete for the current UX/UI follow-through slice; background videos are additive, AniSearch diagnostics are hidden, and Jellyfin `Ordnerpfad` is visible in Basisdaten.
- [Phase 19-episode-import-operator-workbench]: EpisodeImportMappingRow carries file_name and display_path fields populated from media candidates at preview build time
- [Phase 19-episode-import-operator-workbench]: Apply plan removes exclusive episode-claim check: multiple confirmed rows for same episode are valid parallel versions; duplicate media_item_id still rejected
- [Phase 19-episode-import-operator-workbench]: Episode groups keyed by suggested_episode_numbers[0]; global bulk actions in workbench panel header, per-episode quick-actions inline on group headers
- [Phase 19-episode-import-operator-workbench]: Context strip keeps AniSearch ID, Jellyfin series, folder path always visible; source panel simplified to two inputs only
- [Phase 19-episode-import-operator-workbench]: Test 3 create-flow folder_name bug is pre-existing and out of Phase 19 scope; narrowed to minor follow-up quick task
- [Phase 19-episode-import-operator-workbench]: Phase-18 UAT transitions from blocked to pending-live-retest: Tests 4 and 6 resolved-by-code, Test 7 now practically reachable
- [Phase 20.1-db-schema-v2-physical-cutover]: Use scripts/schema-v2-contract-check.ps1 as the failing DB Schema v2 contract guard; it allows only the explicit streams and episode-version cleanup leftovers.
- [Phase 20.1-db-schema-v2-physical-cutover]: Legacy mutation seams now return explicit Phase 20 deferred errors instead of writing replacement partial structures during the cutover.
- [Phase 20.1-db-schema-v2-physical-cutover]: Fansub/group read surfaces use release-native tables, while release media thumbnail counts stay deferred until release-native media linking lands.
- [Phase 20.1]: Phase 20 is now unblocked on schema foundation but must own release-native import apply writes.
- [Phase 20.1]: The old `streams` table remains an allowed compatibility divergence; new import work must target `release_streams`.
- [Phase 20-release-native-episode-import-schema]: Treat Phase 20.1 as the schema foundation for Phase 20 plan 01 rather than recreating migrations or legacy episode-version tables.
- [Phase 20-release-native-episode-import-schema]: Keep release_streams as the canonical release-bound stream table; the older streams table remains only as an allowed compatibility divergence.
- [Phase 20-release-native-episode-import-schema]: Shared contracts must use release-native field names where runtime DTOs already moved away from episode-version terminology.
- [Phase 20-release-native-episode-import-schema]: Episode import apply locates existing Jellyfin-backed release variants through stream_sources(provider_type='jellyfin', external_id=media_item_id) so repeated apply updates coverage instead of duplicating releases.
- [Phase 20-release-native-episode-import-schema]: Canonical episode display cache follows German, English, Japanese, then generated Episode N, while all parsed language titles are persisted through episode_titles.
- [Phase 20-release-native-episode-import-schema]: Fansub group joins are created from explicit apply overrides when present, otherwise conservatively derived from bracketed file/path evidence.
- [Phase Phase 20-release-native-episode-import-schema]: Display helpers (fillerLabel, resolveEpisodeDisplayTitle) are extracted to episodeImportMapping.ts rather than living as local page functions so they can be unit-tested.
- [Phase Phase 20-release-native-episode-import-schema]: Release metadata overrides (fansub_group_name, release_version) are stored directly on EpisodeImportMappingRow and survive setMappingTargets and markMappingSkipped operations.
- [2026-04-22]: Anime create now keeps an explicitly selected Jellyfin series as authoritative `source=jellyfin:<id>` on save and additionally persists all provider tags in `anime_source_links`, so AniSearch and Jellyfin are both retained durably for later duplicate checks, relation lookups, and import context.
- [Phase 21]: Plan 21-01 prefers explicit fansub_groups lists while keeping singular group fields as rollout compatibility fallbacks.
- [Phase 21]: Plan 21-01 canonicalizes selected member groups in the backend before collaboration lookup so chip order cannot create divergent collaboration identities.
- [Phase 21]: Plan 21-01 mirrors persisted release-version group truth into anime_fansub_groups with idempotent inserts for the effective collaboration and each member group.
- [Phase 21-fansub-group-chip-mapping-and-collaboration-wiring]: Import-row fansub selection now uses searchable member-group chips and excludes collaboration groups from manual choice.
- [Phase 21-fansub-group-chip-mapping-and-collaboration-wiring]: Episode import apply serializes mapping rows through a dedicated payload builder so free-text and existing fansub chips share one normalized write path.
- [Phase 21-fansub-group-chip-mapping-and-collaboration-wiring]: Manual episode-version saves now submit fansub_groups directly and let the backend own collaboration identity.
- [Phase 21-fansub-group-chip-mapping-and-collaboration-wiring]: Manual release-version writes reuse the import-era selected-group resolver so release_version_groups and anime_fansub_groups stay aligned.
- [Phase 23-op-ed-theme-verwaltung]: adminThemeRepository interface declared with segment method stubs in Plan 01 to prevent contract split between plans
- [Phase 23-op-ed-theme-verwaltung]: Segment repository methods implemented in Plan 01 file so Plan 02 only adds handler code
- [Phase 23]: Episode picker uses getAnimeByID flat list; segments loaded lazily per theme row on expand
- [Phase 23-op-ed-theme-verwaltung]: UploadReleaseThemeAsset erfordert bestehenden release-Anker (GetCanonicalFansubAnimeRelease) statt auto-create
- [Phase 24-release-segmente-op-ed-timing]: interval-Spalten per ::text-Cast gescannt sodass Go HH:MM:SS-String erhaelt
- [Phase 24-release-segmente-op-ed-timing]: adminThemeRepository-Interface aktualisiert fuer Compilezeit-Verifikation der neuen Segment-CRUD-Methoden
- [Phase 24-release-segmente-op-ed-timing]: segmentVersion hardcoded to v1 in EpisodeVersionEditorPage; EpisodeVersion type has no version string field
- [Phase 25]: Segment suggestions filter by episode range (NULL-safe); source_jellyfin_item_id retained for backwards compatibility; source_type/source_ref/source_label added as optional Phase-25 fields
- [Phase 25]: 5-Tab-Layout mit default Informationen-Tab; Uebersicht und Changelog als ehrliche Stubs
- [Phase 25]: Source-Type-Selector mit drei expliziten Optionen statt freiem Jellyfin-Picker
- [Phase 26]: Segment-Dateien sollen als Team4s-Assets hinter `release_asset` gespeichert werden; das Segment haelt nur die Referenz und kein eingebettetes Playback.
- [Phase 26]: Upload lebt zunaechst im Admin-Segmentflow, muss aber so verdrahtet werden, dass spaetere Fansub-Selbstpflege denselben Backend-Kontext wiederverwenden kann.
- [Phase 26]: Migration 0051 adds real source_type/source_ref/source_label columns to theme_segments; source_jellyfin_item_id retained for backwards compatibility
- [Phase 26]: SaveSegmentAsset builds deterministic path from AnimeID/GroupID/Version/SegmentType with sanitized filename; only mp4/webm/mkv allowed; 150MB limit
- [Phase 26]: MediaKindSegmentAsset maps to media_type 'video' reusing existing DB row; no new media_types entry needed
- [Phase 26]: SegmentEditPanel extracted as sub-component to keep SegmenteTab.tsx at 450-line CLAUDE.md limit; helpers moved to SegmenteTab.helpers.tsx
- [Phase 26]: Upload triggers immediately on file selection; asset state refreshed from API response after upload; resolveSourceLabel derives filename from source_ref path when source_label absent
- [Phase quick-260428-ddb]: duration_seconds bleibt nullable; bestehende Eintraege erhalten NULL und Timeline faellt korrekt zurueck
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: loadThemeSegmentPlaybackSnapshotTx uses a CTE to resolve the current release variant from fansub_group+version+anime context; NULL duration hardcodes removed
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: syncThemeSegmentPlaybackSourceTx uses explicit precedence: uploaded_asset for explicit release_asset+source_ref, episode_version by default when variant known, jellyfin_theme for legacy explicit selection
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: UpdateAnimeSegment returns 200+hydrated DTO; validateSegmentTimes is the shared validation seam for both create and update; nullable runtime means no upper-bound rejection
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: releaseVariantId passed as query param to segment list/create/update, not in body, to preserve backward compatibility
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: effectiveDuration uses playback_duration_seconds first, then page-level durationSeconds as fallback for runtime clamping
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: UAT Scenario C (explicit upload fallback) deferred — upload path verified at code level in Phase 26; live round-trip not needed to close Phase 28
- [Phase 28-segment-playback-sources-from-jellyfin-runtime]: Container rebuild is a mandatory pre-UAT step whenever backend commits land after the last Docker build
- [Phase 30-fansub-releases-api-endpunkte]: Release read methods in dedicated admin_content_fansub_releases.go to respect 450-line file limit; canonical resolve returns nil-safe response with release=null when no anchor exists
- [Phase 30]: ReleaseThemeAssetsSection uses two separate useEffect hooks — one for canonical release context, one for theme assets — to keep concerns cleanly separated
- [Phase 30]: Upload response no longer overwrites releaseID — canonical release context endpoint is the single source of truth for release identity in ReleaseThemeAssetsSection
- [Phase 30-fansub-releases-api-endpunkte]: fansub_releases is classified as normalized-first for Phase 30 admin reads in the authority map; fansub_group_media remains blocked for release media; media_assets is the active release-adjacent media seam
- [Phase 31]: Fansub-Edit wird zu tab-basiertem Workspace mit MainTab-State; FansubReleasesTab als Sub-Komponente extrahiert; expandedReleaseIds in page.tsx als Prop weitergeleitet
- [Phase 34-release-version-media-schema-foundation]: ON DELETE RESTRICT for release_version_media.media_asset_id prevents deleting referenced media_assets; user FK columns use ON DELETE SET NULL
- [Phase 34-release-version-media-schema-foundation]: Max-one-preview per release_version enforced transactionally in Phase 35 backend, not via DB UNIQUE index (soft-delete incompatibility)
- [Phase 35-release-version-media-backend-upload-service-and-api]: govips (github.com/davidbyttow/govips/v2) chosen over bimg (inactive since 2021); Dockerfile needs libvips-dev
- [Phase 35-release-version-media-backend-upload-service-and-api]: No physical staging — direct write to final path with status='processing'→'ready' as upload gate
- [Phase 35-release-version-media-backend-upload-service-and-api]: Route base /admin/release-versions/:versionId/media; new handler file on existing AdminContentHandler
- [Phase 35]: CGO_ENABLED=1 required for govips in Docker — both go build lines changed; vips.Startup(nil) placed before router init in main.go
- [Phase 35]: ErrOwnershipMismatch sentinel added to repository package for RVM ownership validation; ValidateReleaseVersionMediaOwnership uses two queries to distinguish missing rows from cross-version mismatch
- [Phase 35]: MediaKindImage constant added to models/media.go and handled in mediaTypeNameForKind returning 'image'
- [Phase 35]: pgx import removed from handler file since pgx.Tx resolves transitively through repository method signatures
- [Phase 35]: errors import added to handler file to support errors.Is pattern for ErrNotFound and ErrOwnershipMismatch
- [Phase 35]: buildRVMPublicURL is a method on AdminContentHandler (not package-level) to access h.mediaStorageDir; /reorder registered before /:relationId for correct Gin literal-before-param matching
- [Phase Phase 36]: Drawer media tab re-enabled to surface ReleaseVersionMediaDrawerSummary as compact counts+CTA entry; full management lives in episode-version editor
- [Phase 37]: RVMCleanupStore interface in services package decouples cleanup from *MediaRepository for mock-based testing; IsMediaAssetReferencedByOtherRVM used as runtime guard even though SQL-level NOT EXISTS subquery already enforces no-shared-asset at selection time
- [Phase 37]: Handler tests use pure-function and source-inspection testing since mediaRepo is concrete *repository.MediaRepository — no interface mock injection without architectural refactor
- [Phase 37]: GIF animation invariant in test: synthesize multi-frame GIF in memory, generate thumbnail, assert original byte slice still has all frames and thumbnail decodes as static JPEG
- [Phase 37]: Both tasks written as a single Green phase since the production implementation was complete before the test plan ran; no production code changes required
- [Phase 37]: UUID uniqueness test uses 100 sequential calls to prove the same uuid.New() library used by the upload handler; no goroutine coordination needed for isolation proof
- [Phase 37]: Preview-exclusivity proven via source text index comparison so the test is deterministic without a live DB, consistent with Plan 37-02 source-inspection strategy
- [Phase 38]: Native HTML5 drag-and-drop chosen over adding a new DnD library: plan preferred project-owned seam first and no concrete blocker was found
- [Phase 38]: Sort-order form removed from ReleaseVersionMediaDetailPanel; reorder is gallery-only via drag-and-drop within category
- [Phase 38]: No new dependency for hover card: project-owned React state + CSS position absolute; 200ms debounce matches CONTEXT.md recommendation; GIF detection via .gif extension check on original_url
- [Phase 40]: goldmark GFM + bluemonday UGCPolicy als Markdown/Sanitizing-Stack; RenderMarkdown(string)(string,error) als Service-Methode
- [Phase 40]: WithNoteDeps() statt Konstruktor-Parameter: konsistent mit WithMediaDeps()-Pattern
- [Phase 40]: WithReleaseVersionNoteDeps() als eigene Methode — Trennung von FansubNotes- und ReleaseVersionNotes-Abhängigkeiten; markdownSvc einmalig via WithNoteDeps gesetzt und wiederverwendet
- [Phase 40-07]: getAnimeFansubProjectNote gibt null zurück bei 404 — passend für optionales MVP-Einzeltext-Modell ohne Exception-Overhead
- [Phase 40-08]: NotesTab.helpers.tsx als Split-Datei für CLAUDE.md 450-Zeilen-Limit
- [Phase 40-08]: notes-Tab ist außerhalb des globalen Fansub-Speichern-Formulars wie der releases-Tab
- [Phase 41]: TipTap-Migrations beginnen bei 0067 (0066 durch context_guard belegt); body_json JSONB NULL, body_html/body_markdown bleiben unverändert
- [Phase 41-02]: Eigener rekursiver Walker fuer TipTap JSON → HTML (keine geeignete Go-Bibliothek verfuegbar)
- [Phase 41-02]: bluemonday Custom Policy statt UGCPolicy fuer TipTap-HTML-Sanitizing
- [Phase 41]: TextStyle als named export in TipTap 3.x; setContent() ohne Boolean-Positional-Argument; globals.css unter frontend/src/styles/; typecheck-Script zu package.json hinzugefügt
- [Phase 41]: admin_content_fansub_notes.go in 3 Dateien aufgeteilt; requireFansubGroupNoteWriteAccess bleibt in fansub_group_notes da es nur dort referenziert wird
- [Phase 41]: tiptapSvc als separate WithTipTapDeps()-Methode verdrahtet, nicht in bestehende WithNoteDeps integriert
- [Phase 53]: [Phase 53-01]: /admin/profile uses an internal transition wrapper around /me/profile, not a duplicate admin implementation. — This preserves transition compatibility while keeping /me/profile as the only own-profile implementation.
- [Phase 53]: [Phase 53-01]: Future shell/profile destinations stay disabled until stable route and API contracts exist. — The plan forbids fake links and invented contribution/public-profile routes; disabled states keep the UI honest.
- [Phase 53-02]: Non-admin users do not see the Verwaltung navigation group; protected disabled admin framing is insufficient for the member profile shell.
- [Phase 53-02]: Avatar uploads keep existing member avatar endpoint; cropped display is public original and source_original is retained but not exposed.
- [Phase 53-02]: Month/year activity ranges, third visibility value, TipTap persistence, and contribution details remain deferred until DB/backend/OpenAPI/frontend move together.
- [Phase 54-02]: AppShellClientWrapper uses the token-free useAuthSession seam and passes no auth tokens into AppShell.
- [Phase 54-02]: Shell avatar URLs resolve from profile.avatar.public_url through resolveApiUrl, matching the existing profile page pattern.
- [Phase 54-02]: Shell profile/admin props are derived from the active auth session to avoid stale authenticated UI after logout.

### Pending Todos

- Decide later whether the old manual-vs-Jellyfin entry-choice page should be restored or formally retired.
- Fix logo upload PNG to JPG conversion — beim Upload und Crawlen wird PNG mit transparentem Hintergrund fälschlicherweise in JPG konvertiert; Quellformat beibehalten.
- Redesign `/me/profile` content model after UAT 3: remove internal/admin copy and unclear badges, simplify memberships, and replace abstract credit aggregates with latest media/text activity.

### Roadmap Evolution

- Phase 55 added: Sichere TipTap-Persistenz fuer Profilgeschichte - `/me/profile` darf die Profilgeschichte nicht laenger ad hoc von TipTap nach Plain Text zurueckkonvertieren; Migration, Backend-TipTap-Service, OpenAPI/frontend DTOs, zentraler API-Client, Sanitizing und Bestandsdaten bewegen sich gemeinsam.
- Phase 56 added: Cropper - der fragile eigene Cropper wird als eigener Folge-Slice mit gepflegter React-Cropper-Bibliothek geplant; Profil-Avatar und Fansub-Gruppenlogo sollen dieselbe gemeinsame Cropper-Komponente nutzen, ohne Upload-Endpunkte oder Media-Ownership zu vermischen.
- Phase 56 completed on 2026-05-29: `react-easy-crop` is wrapped behind `Team4sCropper`, avatar and fansub logo crop flows are migrated, the original crop parity todo is done, and security review passed with `threats_open: 0`.
- Phase 57 complete: Profil-Aktivzeitraum als jahrbegrenzte Datumsfelder - `/me/profile` speichert den Fansub-Szene-Aktivzeitraum ueber echte DB-DATE-Spalten, waehrend die UI nur Jahresauswahl fuer "von wann bis wann" anbietet. Authenticated UAT remains pending.
- Phase 49/50 reconcile completed on 2026-05-27: Phase 49 central Auth/API client is complete from `49-VERIFICATION.md` and `AUTH-API-CLIENT-01` is complete; Phase 50 platform-admin/contributor scope governance is registered as complete-carry-forward with technical verification passed and live Keycloak UAT pending.
- Historical reconcile completed on 2026-05-27 for phases 1-46: Phases 41 and 43-46 are retro-closed from runtime evidence; Phase 42 remains planned/deferred; stale v1 requirement Pending rows were reconciled to completed historical baseline; OpenAPI gaps for member management and invitations remain follow-up work.
- Phase 48 retro-verified on 2026-05-27: contributor dashboard foundation is complete from runtime evidence and focused tests; `/me/groups` route direction, shared `Mein Bereich` shell integration, OpenAPI coverage, broader live UAT, centralized labels, and safer non-admin workspace routing carry forward.
- Phase 47 retro-verified on 2026-05-27: own-profile foundation is complete from runtime evidence and focused tests; modern `/me/profile` route, Member Identity Hub UX, avatar crop/variants, richer visibility, month/year activity controls, Rich Text safety, OpenAPI coverage, mobile QA, and accessibility carry forward to Phase 53.
- Profile roadmap reconciliation completed from the 2026-05-27 audit: Phase 51 requirement traceability is complete; Phase 52 is marked complete on automated evidence with live Keycloak UAT pending; Phase 47/48 runtime evidence and closure drift were documented before Phase 47 retro-verification.
- Phase 53 added: Rollenuebergreifendes Mein Profil als Member Identity Hub - `/me/profile` wird die rollenneutrale Profilroute fuer alle eingeloggten User; `/admin/profile` bleibt nur Uebergang, Keycloak-/Team4s-Datenhoheit, Rollenarten, Sichtbarkeit, Avatar, Rich Text, Mitgliedschaften und Beitraege sind als zwei Teilphasen geplant.
- Phase 52 added: Profile Account Return Refresh Flow - Profilseite klaert den externen Keycloak-Accountdaten-Wechsel, aktualisiert Accountkarten beim Zurueckkehren ueber zentrale Auth-/Profil-Seams und schuetzt ungespeicherte Team4s-Profilfelder.
- Phase 51 added: Keycloak Access-Token Resource-Server Boundary — Keycloak/API-Auth wird von `id_token`-als-Team4s-Bearer auf echte API-`access_token`-Verifikation mit Team4s-API-Audience umgestellt.
- Phase 33 added: Release-Theme-Asset size_bytes Persistence Fix — beim Upload die tatsächliche Dateigröße persistieren und in der Asset-Listen-Antwort korrekt zurückgeben statt 0.
- Phase 30 added: Fansub-Releases API-Endpunkte — Handler und API-Routen für die fansub_releases-Tabelle, die bereits Repository-Code besitzt aber noch keine HTTP-Endpunkte hat.
- Phase 32 added: Fansub Release Side Drawer aus Phase 31: Edit-Drawer fuer Release-Theme-Assets mit vorhandenen DB-Tabellen und APIs, ohne neue Datenmodelle; DB/UI-Differenzen vor Umsetzung diskutieren
- Phase 09 added: Controlled AniSearch ID enrichment before create with fill-only Jellysync follow-up.
- Phase 10 narrowed to create tags and metadata card refactor and is now executed.
- Phase 11 added: AniSearch edit enrichment and relation persistence.
- Phase 12 added: Create AniSearch intake reintroduction and draft merge control.
- Phase 13 added and now treated as complete in the active milestone baseline.
- Phase 14 added and now treated as complete in the active milestone baseline.
- Phase 15 added: Asset-specific online search and selection for create-page anime assets.
- Phase 15 executed: dedicated asset search seam, Zerochan-backed discovery, and source-aware create-page asset adoption.
- Phase 16 executed and browser-verified: AniSearch title search now hides already-imported candidates and explains filtered-empty results honestly.
- Phase 17 executed: Anime create UX/UI follow-through based on the refreshed Phase-14 UI contract, including reference-style asset layout, hidden AniSearch diagnostics, visible Jellyfin folder path, and additive background videos.
- Phase 18 planned: Episode Import And Mapping Builder, using AniSearch as canonical episode source, Jellyfin as media/file source, and an explicit manual mapping preview/apply flow.
- Phase 18 Plan 18-01 executed: contract DTOs and expected-red tests now lock canonical episode rows, media candidates, multi-target mappings, preview separation, conflict rejection, and frontend mapping helper behavior.
- Phase 18 Plan 18-02 executed: `episode_version_episodes` now models authoritative coverage, grouped reads prefer coverage rows, and repository apply semantics preserve the compatibility primary episode number.
- Phase 18 Plan 18-03 executed: admin episode-import context, preview, and apply routes are wired; preview is read-only and apply delegates confirmed/skipped mappings to the repository.
- Phase 18 Plan 18-04 executed: `/admin/anime/[id]/episodes/import` provides the frontend mapping builder and is reachable from the episode overview.
- Phase 18 final verification passed: backend targeted tests, frontend mapping tests, frontend build, Docker rebuild, and smoke checks for frontend/backend routes.
- Phase 18 live UAT follow-through then found remaining practical blockers: opaque mapping rows, false conflicts for parallel releases, and too much manual skip friction for large libraries.
- Phase 19 planned: Episode import operator workbench follow-through, focused on readable file evidence, version-friendly mapping, and practical bulk resolution controls.
- Phase 19 UAT passed after fixing frontend conflict detection for parallel releases; import is now practical enough to expose the remaining persistence-schema mismatch.
- Phase 20 planned: Release-native episode import schema, focused on clean local reset, normalized release graph writes, multilingual episode titles, filler metadata, and Naruto-style multi-episode file coverage.
- Phase 20.1 planned before Phase 20 execution: build the full documented `docs/architecture/db-schema-v2.md` target as real DB tables, then delete the legacy `episode_versions` table family because only disposable test episode data exists.
- Phase 20.1 executed and verified: clean migration through 46 migrations passed, legacy episode-version tables are absent, Docker backend/frontend were rebuilt, and Phase 20 is unblocked for release-native import writes.
- Phase 20 live UAT completed on 2026-04-23: disposable `3×3 Eyes` replay proved normalized-table persistence, multilingual episode titles, release-native stream linkage, and dual-provider anime source persistence.
- Phase 23 added: OP/ED Theme Verwaltung — Admins können Opening/Ending-Themes pro Anime mit Episodenbereichen verwalten.
- Phase 24 added: Release-Segmente (OP/ED Timing) — Tab "Segmente" auf Episode-Version-Edit-Seite; theme_segments um fansub_group_id, version, plain-integer episode range, start_time/end_time im Video und Jellyfin-Source erweitert; UI wie Mockup mit Tabelle, Typ-Badges, Timeline-Visualisierung.
- Phase 25 added: Segmente UI Mockup-Alignment — vollständige Angleichung an Mockup: Breadcrumb-Navigation, 5-Tab-Layout, Typ-Dropdown mit farbigem Badge, Zeitbereich mit Dauer, Vorschläge aus anderen Releases, verbesserter Timeline mit Hauptinhalt-Label, Jellyfin-Item-Suche und Video-Vorschau-Player im Formular.
- Phase 26 added: Segment Source Asset Upload And Persistence — Team4s-Asset-Upload, Pfadbildung, Segment-Referenz und Delete-Seam fuer OP/ED/Insert-Dateien ohne Playback-Pflicht.

- Phase 28 added: Segment Playback Sources From Jellyfin Runtime â€” Segmente sollen standardmaessig Episode-Version/Jellyfin-Stream als Playback-Quelle mit realer release_variants.duration_seconds-Grenze nutzen; Upload bleibt optionaler Fallback.
- Phase 58 added: Profil-Hub Content, Membership Cards & Activity Preparation
- Phase 59 added: Öffentliches Fansub-Member-Profil

### Blockers/Concerns

- Cross-AI review remains unavailable until an independent reviewer CLI is installed.
- The old `streams` table remains an allowed compatibility divergence beside target `release_streams`; follow-up work must not treat it as authoritative.
- The post-apply workbench state is still slightly misleading after idempotent success because the action surface remains live instead of clearly finished.

### Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|---|---|---|---|---|
| 11 | 01 | 24min | 2 | 13 |
| Phase 11-anisearch-edit-enrichment-and-relation-persistence P02 | 17min | 2 tasks | 11 files |
| Phase 11-anisearch-edit-enrichment-and-relation-persistence P03 | 9min | 2 tasks | 16 files |
| Phase 11 P04 | 6min | 2 tasks | 7 files |
| Phase 11 P05 | 3min | 2 tasks | 6 files |
| Phase 11 P06 | 7min | 2 tasks | 5 files |
| Phase 12 P01 | 6min | 2 tasks | 8 files |
| Phase 12 P02 | 10min | 2 tasks | 4 files |
| Phase 16 P01 | 4min | 2 tasks | 7 files |
| Phase 16 P02 | 3min | 2 tasks | 8 files |
| Phase 17 P01 | 2min 22sec | 3 tasks | 3 files |
| Phase 17 P02 | 8min | 5 tasks | 7 files |
| Phase 17 P05 | 7min | 4 tasks | 4 files |
| Phase 17.1 P01 | 40min | 2 tasks | 5 files |
| Phase 19-episode-import-operator-workbench P01 | 18min | 2 tasks | 7 files |
| Phase 19-episode-import-operator-workbench P02 | 5min | 2 tasks | 5 files |
| Phase 19-episode-import-operator-workbench P03 | 5min | 1 tasks | 1 files |
| Phase 20.1-db-schema-v2-physical-cutover P02 | 6min | 3 tasks | 7 files |
| Phase 20.1-db-schema-v2-physical-cutover P03 | 14min | 3 tasks | 20 files |
| Phase 20.1 P04 | 19min | 3 tasks | 4 files |
| Phase 20-release-native-episode-import-schema P01 | 4min | 3 tasks | 5 files |
| Phase 20-release-native-episode-import-schema P02 | 8min 38sec | 3 tasks | 8 files |
| Phase 20-release-native-episode-import-schema P03 | 6min 32sec | 3 tasks | 6 files |
| Phase 21 P01 | 32min | 3 tasks | 8 files |
| Phase 21-fansub-group-chip-mapping-and-collaboration-wiring P02 | 29min | 3 tasks | 7 files |
| Phase 21-fansub-group-chip-mapping-and-collaboration-wiring P03 | 28min | 3 tasks | 5 files |
| Phase 23-op-ed-theme-verwaltung P01 | 25 | 2 tasks | 7 files |
| Phase 23 P02 | 25 | 2 tasks | 5 files |
| Phase 23-op-ed-theme-verwaltung P03 | 35 | 2 tasks | 11 files |
| Phase 24-release-segmente-op-ed-timing P01 | 25 | 3 tasks | 7 files |
| Phase 24-release-segmente-op-ed-timing P02 | 25 | 3 tasks | 7 files |
| Phase 25 P01 | 8min | 3 tasks | 5 files |
| Phase 25 P02 | 4min | 2 tasks | 4 files |
| Phase 25 P03 | 15min | 2 tasks | 2 files |
| Phase 26 P01 | 7min | 5 tasks | 10 files |
| Phase 26 P02 | 6min | 3 tasks | 4 files |
| Phase 28-segment-playback-sources-from-jellyfin-runtime P01 | 8min | 3 tasks | 5 files |
| Phase 28-segment-playback-sources-from-jellyfin-runtime P02 | 5min | 3 tasks | 5 files |
| Phase 28-segment-playback-sources-from-jellyfin-runtime P03 | 10min | 3 tasks | 2 files |
| Phase 30-fansub-releases-api-endpunkte P01 | 45min | 2 tasks | 7 files |
| Phase 30 P02 | 12min | 2 tasks | 3 files |
| Phase 30-fansub-releases-api-endpunkte P03 | 3min | 2 tasks | 4 files |
| Phase 31 P01 | 14min | 2 tasks | 7 files |
| Phase 34-release-version-media-schema-foundation P01 | 1min | 2 tasks | 2 files |
| Phase 35 P01 | 2min | 2 tasks | 4 files |
| Phase 35 P02 | 3min | 2 tasks | 2 files |
| Phase 35 P03 | 25min | 3 tasks | 4 files |
| Phase 35 P04 | 15min | 2 tasks | 2 files |
| Phase 36-release-version-media-frontend-upload-ui-und-galerie P01 | 4min | 2 tasks | 7 files |
| Phase 37 P01 | 25min | 2 tasks | 5 files |
| Phase 37 P02 | 20min | 2 tasks | 2 files |
| Phase 37 P03 | 10min | 2 tasks | 2 files |
| Phase 37 P04 | 15min | 2 tasks | 2 files |
| Phase 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder P01 | 25min | 2 tasks | 10 files |
| Phase 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder P02 | 5min | 2 tasks | 3 files |
| Phase 40-text-und-notizsystem-fuer-fansub-plattform P40-03 | 8min | 2 tasks | 3 files |
| Phase 40 P06 | 15min | 3 tasks | 4 files |
| Phase 40-text-und-notizsystem-fuer-fansub-plattform P07 | 8min | 3 tasks | 3 files |
| Phase 40 P08 | 18min | 2 tasks | 3 files |
| Phase 41 P01 | 2min | 2 tasks | 8 files |
| Phase 41-globalen-tiptap-rich-text-editor-einfuehren P02 | 4min | 2 tasks | 4 files |
| Phase 41-globalen-tiptap-rich-text-editor-einfuehren P04 | 9min | 2 tasks | 9 files |
| Phase 41 P03 | 9min | 2 tasks | 9 files |
| Phase 53 P01 | 19 min | 6 tasks | 25 files |
| Phase 53 P02 | ~70min | 8 tasks | 27 files |
| Phase 54 P02 | 26min | 1 tasks | 1 files |

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260405-kce | Sync Phase-07 completion across roadmap and milestone tracking | 2026-04-05 | uncommitted (dirty workspace) | [260405-kce-sync-phase-07-completion-across-roadmap-](./quick/260405-kce-sync-phase-07-completion-across-roadmap-/) |
| 260405-pcz | Add tags schema and persistence analogous to genres for anime metadata | 2026-04-05 | uncommitted (dirty workspace) | [260405-pcz-add-tags-schema-and-persistence-analogou](./quick/260405-pcz-add-tags-schema-and-persistence-analogou/) |
| 260417-qtu | Asset upload UX: leere Slots klickbar, Upload-Hover-Overlay | 2026-04-17 | 136161b | [260417-qtu-asset-upload-ux-leere-slots-klickbar-und](./quick/260417-qtu-asset-upload-ux-leere-slots-klickbar-und/) |
| 260423dxc | Filter bereits importierte Jellyfin-Kandidaten aus Episode-Import Preview heraus | 2026-04-23 | dab72d6 | [260423dxc-filter-already-imported-episode-candidates](./quick/260423dxc-filter-already-imported-episode-candidates/) |
| 260507-de2 | Rename theme types OP → OP Kara, ED → ED Kara, Insert → Insert Kara | 2026-05-07 | f918334e | [260507-de2-rename-theme-types-op-to-op-kara-ed-to-e](./quick/260507-de2-rename-theme-types-op-to-op-kara-ed-to-e/) |
| 260423mnv | Per-Reihe "Ubernehmen"-Button im Episode-Import Workbench | 2026-04-23 | 1b3b57d | [260423mnv-per-row-apply-button](./quick/260423mnv-per-row-apply-button/) |
| 260510-t7j | Upload Security Hardening: Security-Header fuer /media, EXIF-Strip, Dekompression-Bomb-Schutz | 2026-05-10 | 09afc913 | [260510-t7j-upload-security-hardening-security-heade](./quick/260510-t7j-upload-security-hardening-security-heade/) |
| 260510-umt | Beschreibungs-Textarea Fix fuer Release-Version-Media Caption-Feld | 2026-05-10 | 7e637795 | [260510-umt-beschreibungs-textarea-fix-fuer-release-](./quick/260510-umt-beschreibungs-textarea-fix-fuer-release-/) |
| 260423qpn | Optionale Jellyfin-Bibliotheksfilterung via JELLYFIN_ALLOWED_LIBRARY_IDS | 2026-04-24 | 6fad43b | [260423qpn-jellyfin-library-filter](./quick/260423qpn-jellyfin-library-filter/) |
| 260428-ddb | Episoden-Laufzeit crawlen und in Timeline-Vorschau proportional anzeigen | 2026-04-28 | 5126a293 | [260428-ddb-episoden-laufzeit-crawlen-und-in-timelin](./quick/260428-ddb-episoden-laufzeit-crawlen-und-in-timelin/) |
| 260429-fnm | Smart-Parser fuer Segment-Zeitfelder: MM:SS, Xm/XmYs, immer HH:MM:SS Ausgabe | 2026-04-29 | 1230bd2c | [260429-fnm-smart-parser-fuer-segment-zeitfelder-mm-](./quick/260429-fnm-smart-parser-fuer-segment-zeitfelder-mm-/) |
| 260511-bxr | Fansub-Edit Banner top-crop fix + Logo-Position neben Gruppenname | 2026-05-11 | 72b69bf4 | [260511-bxr-fansub-edit-banner-top-crop-fix](./quick/260511-bxr-fansub-edit-banner-top-crop-fix/) |
| 260511-hfd | ReleaseVersionMediaGallery 3 Test-Bugs fixen (draggable + GIF src-swap) | 2026-05-11 | 4eab759c | [260511-hfd-releaseversionmediagallery-3-test-bugs-f](./quick/260511-hfd-releaseversionmediagallery-3-test-bugs-f/) |
| 260511-jjq | Umlaut-Regel in AGENTS.md ergaenzen (Codex-Pendant zu CLAUDE.md) | 2026-05-11 | 58fd4fca | [260511-jjq-umlaut-regel-in-agents-md-ergaenzen](./quick/260511-jjq-umlaut-regel-in-agents-md-ergaenzen/) |
| 260525 | Code-Altlasten-Audit WP-02: Fansub-Drawer nutzt release_version_id fuer Release-Version-Media | 2026-05-25 | working tree | [260525-code-altlasten-und-domain-audit](./quick/260525-code-altlasten-und-domain-audit/) |
| 260526-mhk | next/image Test-Mock fixen und den einzelnen Test laufen lassen. danach checks, commit | 2026-05-26 | ed0254a9 | [260526-mhk-next-image-test-mock-fixen-und-den-einze](./quick/260526-mhk-next-image-test-mock-fixen-und-den-einze/) |
| 260527-i1c | Reconcile profile roadmap statuses from audit | 2026-05-27 | 79b9dd07 | [260527-i1c-reconcile-profile-roadmap-statuses-from-](./quick/260527-i1c-reconcile-profile-roadmap-statuses-from-/) |
| 260527-iay | Retro-verify Phase 47 member profile foundation | 2026-05-27 | 25b88493 | [260527-iay-retro-verify-phase-47-member-profile-fou](./quick/260527-iay-retro-verify-phase-47-member-profile-fou/) |
| 260527-imk | Retro-verify Phase 48 contributor dashboard | 2026-05-27 | 2811ded0 | [260527-imk-retro-verify-phase-48-contributor-dashbo](./quick/260527-imk-retro-verify-phase-48-contributor-dashbo/) |
| 260527-ivi | Historical reconcile phases 1-46 roadmap requirements contracts | 2026-05-27 | e0b9cf91 | [260527-ivi-historical-reconcile-phases-1-46-roadmap](./quick/260527-ivi-historical-reconcile-phases-1-46-roadmap/) |
| 260527-jgk | Retro-verify phases 49-50 auth API client and contributor governance roadmap registration | 2026-05-27 | c4b4a1b6 | [260527-jgk-retro-verify-phases-49-50-auth-api-clien](./quick/260527-jgk-retro-verify-phases-49-50-auth-api-clien/) |
| 260528 | UAT 2 Avatar crop panning and recrop fix | 2026-05-28 | this commit | [260528-uat-2-avatar-crop-recrop-fix](./quick/260528-uat-2-avatar-crop-recrop-fix/) |

## Session Continuity

Last session: 2026-06-02T07:10:20.291Z
Stopped at: Phase 57 security and validation passed; authenticated browser UAT pending
Last activity: 2026-06-01
Resume file: None
