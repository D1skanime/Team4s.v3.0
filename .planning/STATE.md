---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed Phase 28 Plan 01 — backend playback resolution contract
last_updated: "2026-04-28T20:54:54.559Z"
last_activity: 2026-04-28
progress:
  total_phases: 24
  completed_phases: 17
  total_plans: 82
  completed_plans: 72
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.
**Current focus:** Phase 28 — segment-playback-sources-from-jellyfin-runtime

## Current Position

Phase: 28 (segment-playback-sources-from-jellyfin-runtime) — EXECUTING
Plan: 2 of 3

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md`.

Recent durable decisions:

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

### Pending Todos

- Decide later whether the old manual-vs-Jellyfin entry-choice page should be restored or formally retired.

### Roadmap Evolution

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260405-kce | Sync Phase-07 completion across roadmap and milestone tracking | 2026-04-05 | uncommitted (dirty workspace) | [260405-kce-sync-phase-07-completion-across-roadmap-](./quick/260405-kce-sync-phase-07-completion-across-roadmap-/) |
| 260405-pcz | Add tags schema and persistence analogous to genres for anime metadata | 2026-04-05 | uncommitted (dirty workspace) | [260405-pcz-add-tags-schema-and-persistence-analogou](./quick/260405-pcz-add-tags-schema-and-persistence-analogou/) |
| 260417-qtu | Asset upload UX: leere Slots klickbar, Upload-Hover-Overlay | 2026-04-17 | 136161b | [260417-qtu-asset-upload-ux-leere-slots-klickbar-und](./quick/260417-qtu-asset-upload-ux-leere-slots-klickbar-und/) |
| 260423dxc | Filter bereits importierte Jellyfin-Kandidaten aus Episode-Import Preview heraus | 2026-04-23 | dab72d6 | [260423dxc-filter-already-imported-episode-candidates](./quick/260423dxc-filter-already-imported-episode-candidates/) |
| 260423mnv | Per-Reihe "Ubernehmen"-Button im Episode-Import Workbench | 2026-04-23 | 1b3b57d | [260423mnv-per-row-apply-button](./quick/260423mnv-per-row-apply-button/) |
| 260423qpn | Optionale Jellyfin-Bibliotheksfilterung via JELLYFIN_ALLOWED_LIBRARY_IDS | 2026-04-24 | 6fad43b | [260423qpn-jellyfin-library-filter](./quick/260423qpn-jellyfin-library-filter/) |
| 260428-ddb | Episoden-Laufzeit crawlen und in Timeline-Vorschau proportional anzeigen | 2026-04-28 | 5126a293 | [260428-ddb-episoden-laufzeit-crawlen-und-in-timelin](./quick/260428-ddb-episoden-laufzeit-crawlen-und-in-timelin/) |

## Session Continuity

Last session: 2026-04-28T20:54:54.550Z
Stopped at: Completed Phase 28 Plan 01 — backend playback resolution contract
Last activity: 2026-04-28
Resume file: None
