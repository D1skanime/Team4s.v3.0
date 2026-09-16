# Quick 260916-ako: source identity analysis

Date: 2026-09-16. Canonical repository: /home/d1sk/team4s. Baseline: 44268512.
Scope: user's attached multi-MediaSource request; no new phase or ROADMAP change.

## Proven cause

Phase 161 deliberately selected one source per Item; import then treated Item as physical file at every layer. This quick changes enumeration/import identity while preserving deterministic playback for a selected binding.

Fresh read-only 11eyes evidence: 27 actual Episode Items, 52 nested representations, 38 distinct nonempty MediaSource IDs, 14 alias representations, no inconsistent normalized paths for equal source IDs. Two sources are season-0 OVAs. Episode 1 has nested plus standalone aliases; episodes 2/3 each have one Item with B-SH, FlameHazeSubs and Strawhat sources. Nested source IDs absent as Items must never be fetched as fake Items. Current 27-candidate test conserves the bug. Full fixture expectation 38 is dataset-specific. Preliminary collection-only expectation was 35 unimported sources. Live verification established that both OVA sources are outside the configured anime folder, so the existing ownership filter correctly leaves 36 in-folder sources minus three existing episode-1 imports = 33. After the authorized two-source live import, 31 remain. See VERIFICATION and LIVE-EVIDENCE.

## Consumer matrix / owner

Backend paths below are under backend/internal; import UI paths are under frontend/src/app/admin/anime/[id]/episodes/import.

| Seam | Existing assumption | Required behavior | Owner |
|---|---|---|---|
| handlers/jellyfin_client.go, jellyfin_source_batch.go | Actual Item collection/exact Item batches | Keep real Item IDs; fetch each distinct Item once | backend |
| handlers/jellyfin_media_source.go | Own/stored/only source selection with shared technical projection | Reuse projector for explicit membership-valid selection; keep default playback | backend |
| handlers/admin_episode_import.go | One candidate per Item; filter all Item; item-global rehydration | All source candidates once, canonical aliases, source-aware coverage and explicit pairs | backend |
| handlers/admin_episode_import_validation.go | Candidate/confirmed maps by Item | Pair maps and confirmed physical-source alias rejection | backend |
| models/episode_import.go | Source ID exists, comment says Item identity | Explicit pair semantics; server-only hydration remains private | backend |
| repository/episode_import_repository.go, episode_import_repository_apply.go | mediaByID, seenMediaIDs, coverage Item-only | Pair maps, source-aware existing coverage, neutral episode grouping | backend |
| repository/episode_import_repository_release_helpers.go | Existing variant lookup by external_id | Lookup graph by locked stream_source_id | backend |
| repository/jellyfin_source_repository.go | Item-global snapshot map; universal provider/item uniqueness | Source-aware batch, physical unique persistence, ordered locks, stable stored owner | backend |
| repository/episode_version_repository.go | GetByID loads snapshot by Item; streaming already joins selected row | GetByID decodes actual linked source, no sibling overwrite | backend |
| repository/episode_version_repository_write_helpers.go | Shared upsert/foreign-anime check | Same source-aware seam; preserve metadata-only writes | backend |
| handlers/episode_version_source_hydration.go | Explicit selector must match default source | Explicit source membership validation and source-scoped retention | backend |
| handlers/admin_content_episode_version_editor_scan.go | Single source per Item and shared binding map | Consume same enumeration/dedup without arbitrary sibling selection | backend |
| episodeImportMapping.ts | Setters/review matching Item-only | Collision-safe pair key and exact reviewed match | frontend |
| useEpisodeImportBuilder.ts | Pending/apply/remove/project by Item | Apply/remove only selected pair; siblings survive | frontend |
| EpisodeImportMappingRow.tsx, page.tsx | React keys/actions Item-only | Pair identity; existing filename/group labels distinguish files | frontend |
| editor EpisodeVersionEditorPage.tsx, useEpisodeVersionEditor.ts | Row key includes path; some matching already source-aware | Pair key and same-Item/different-source regression | frontend |
| types/episodeImport.ts; shared/contracts/openapi.yaml, admin-content.yaml, episode-versions.yaml | Selector already exists, unresolved optional semantics | Document pairs, aliases, confirmed selector, 400/409 behavior | frontend/contracts |
| selectedReleaseVariantSourceSQL, stream/render/subtitle readers | Source-row joins and private selected ID | Preserve selected row; sibling leakage regression | backend tests |

## Identity/schema decision

1. Candidate/command identity is (actual Item ID, MediaSource ID), using a comparable Go pair and collision-safe TS serialization. Never a path or fake Item ID.
2. Physical equivalence is provider MediaSource ID in the existing single configured Jellyfin server, corroborated by authoritative normalized source path and compatible episode context. Conflicting evidence for same ID fails. Identical filename/path alone does not merge different IDs.
3. Canonical alias prefers a validated actual standalone Item whose ID equals source ID; otherwise stable lexicographic genuine owner Item. Response ordering must not change output. Rehydration checks the exact posted pair's actual membership.
4. Keep stream_sources.external_id as genuine Item ID. Existing private metadata.jellyfin_source.media_source_id remains source truth. Migration 0166_jellyfin_source_identity (recheck free number) replaces universal provider/item uniqueness with two partial unique indexes: provider/item for non-Jellyfin and unresolved Jellyfin, preserving NULLS NOT DISTINCT; selected Jellyfin source ID as JSONB expression for physical uniqueness. No new registry or duplicate identity column.
5. Migration rejects duplicate selected IDs and malformed nonnull snapshots/blank selected IDs. Absent/null snapshots stay explicitly unresolved. Create guards transactionally before dropping old constraint. Down refuses provider/item collisions instead of deleting or merging rows. No bulk backfill/reset.
6. Selected upsert locks by physical source, validates stored evidence and retains original external_id/URL on a verified alias. Graph lookup uses returned stream_source_id. Same-anime repeat is idempotent; foreign-anime or contradictory evidence conflicts. Duplicate aliases within one apply command are rejected, even if pairs differ.
7. Retain anime -> all source identities in sorted order -> variant lock ordering. Handle absent-row races through unique constraint. Test opposing multi-source order from concurrent requests; no unsorted per-mapping lock loop.
8. Existing unresolved rows matter: current DB has 16 source rows, only four with selected snapshot, zero duplicate selected IDs. Resolve unresolved imported Item only using authoritative Item/source evidence plus linked stored filename/available path evidence; do not assume own-source when filename contradicts. Unique matching evidence allows read-only source-level coverage; ambiguity conflicts rather than hiding all alternatives or duplicating. An explicitly imported same source may re-use its locked unresolved row only after matching evidence is validated. No generic compatibility migration or bulk rewrite.
9. GetByID reads actual linked source snapshot. Batch reader must return all bindings without map[Item] single-value overwrite; use pair/source indexing. Existing coverage carries source ID and recognizes aliases.
10. Explicit selection validates membership first and reuses existing projection. Do not pass an untrusted selector as a fabricated complete stored snapshot. Missing/duplicate source IDs fail closed; no invented fallback. Existing selected-source path rebind may remain only where safe under known stored owner; no browser path accepted. Chapter hints remain source-owned, with Item hints limited to the own-path source.
11. unmapped_media_item_ids remains diagnostic, not row identity. Count unmapped source rows from mappings, without adding public pseudo-identities just for counts.

## Coverage audit

Quick has no new ROADMAP requirement. Related existing IDs: P161-SOURCE, P161-METADATA, P161-REGRESSION. Latest user request explicitly supersedes Phase 161 one-source-per-Item import scope.

| Source | Required item | Covered by |
|---|---|---|
| GOAL/user | Every physical source once; ep2/3 three releases | Tasks 1, 2, 3 |
| REQ P161-SOURCE | Pair authority, source coherence, aliases | Task 1 |
| REQ P161-METADATA | Technical values/size/chapters source-specific | Tasks 1, 3 |
| REQ P161-REGRESSION | Single source, aliases, real persistence, auth, budgets | All tasks |
| RESEARCH/code | Item maps, DB uniqueness, GetByID, locks | Task 1 |
| CONTEXT/user | Analyze then RED; no NAS/Jellyfin writes/rescan/path identity/hardcoding | All tasks |
| CONTEXT/user | Independent UI selection; foreign selector rejection; existing source recognition | Tasks 1, 2 |
| CONTEXT/user | Two same-Item sources actually persisted; exact fixture set explained | Tasks 1, 3 |
| CONTEXT/user | Scoped commits/report and remaining provider edge cases | Task 3 |

Deferred: provider rescans, NAS changes, public redesign, unrelated lint fixes, DB reset/backfill, generic multi-server registry, unrelated Human-UAT sign-offs.

## Execution boundaries

Backend/schema executor owns all Go and migration files/tests; frontend executor owns frontend and all YAML contracts. Root owns integrated runtime/test coordination, coherent live activation, migration application and docs/STATE/DECISIONS. Avoid incremental docker cp into live Air: isolated Docker runner mounts canonical backend and uses existing Go image/cache plus guarded fixture database. Final live synchronization happens only after focused tests pass.

Baseline reported by root: typecheck PASS; global ESLint three errors/319 warnings (capture-responsive.cjs two require errors; CapabilityDetailRow.tsx unescaped quote). Recheck final delta, do not repeat stale Phase-161 baseline claims. All real DB test cases must execute rather than skip; no database credentials logged.
