---
phase: quick
plan: 260916-ako
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/0166_jellyfin_source_identity.up.sql
  - database/migrations/0166_jellyfin_source_identity.down.sql
  - backend/internal/models/episode_import.go
  - backend/internal/handlers/admin_episode_import.go
  - backend/internal/handlers/admin_episode_import_validation.go
  - backend/internal/handlers/jellyfin_media_source.go
  - backend/internal/handlers/episode_version_source_hydration.go
  - backend/internal/handlers/admin_content_episode_version_editor_scan.go
  - backend/internal/handlers/admin_content_handler.go
  - backend/internal/repository/jellyfin_source_repository.go
  - backend/internal/repository/episode_import_repository.go
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/episode_import_repository_release_helpers.go
  - backend/internal/repository/episode_version_repository.go
  - backend/internal/repository/episode_version_repository_write_helpers.go
  - frontend/src/types/episodeImport.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
  - shared/contracts/openapi.yaml
  - shared/contracts/admin-content.yaml
  - shared/contracts/episode-versions.yaml
autonomous: true
requirements: [P161-SOURCE, P161-METADATA, P161-REGRESSION]
must_haves:
  truths:
    - "Each independently importable physical source appears once, with separate selection for sibling sources."
    - "Two sources of the same Item persist distinctly; repeat/alias imports cannot duplicate a release graph."
    - "Selected source metadata/playback remains attached to the actual linked source."
  artifacts:
    - path: backend/internal/handlers/admin_episode_import.go
      provides: "Complete enumeration and trusted pair revalidation"
    - path: backend/internal/repository/jellyfin_source_repository.go
      provides: "Physical source uniqueness and locked persistence"
    - path: frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
      provides: "Pair-scoped row actions"
  key_links:
    - from: "preview candidate"
      to: "apply mapping"
      via: "explicit actual Item ID plus MediaSource ID"
    - from: "release_streams.stream_source_id"
      to: "stream_sources.metadata.jellyfin_source"
      via: "actual selected row; no Item-global single snapshot"
---

<objective>
Repair the existing Jellyfin import end to end so all physical sources are independently reviewable, while nested/standalone aliases appear only once. Preserve existing selected-source playback and domain ownership.
</objective>

<read_first>
AGENTS.md
AI-HANDOFF.md
docs/engineering/implementation-contract.md
docs/api/api-contracts.md
docs/frontend/auth-api-client.md
docs/architecture/db-schema-fansub-domain.md
.planning/quick/260916-ako-jellyfin-multiple-media-source-import/260916-ako-ANALYSIS.md
.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-04-SUMMARY.md
.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-05-SUMMARY.md
.planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-06-SUMMARY.md
backend/internal/handlers/jellyfin_source_batch.go
backend/internal/handlers/jellyfin_media_source.go
backend/internal/repository/jellyfin_source_repository.go
backend/internal/repository/episode_import_source_integration_test.go
backend/internal/repository/jellyfin_source_fixture_test.go
database/migrations/0037_add_release_decomposition_tables.up.sql
</read_first>

<dependency_graph>
After agreeing the existing pair DTO semantics, Task 1 backend/schema and Task 2 frontend/contracts may run in parallel with exclusive file ownership. Both start with RED regressions. Task 3 root integration/docs/live depends on both. Root alone owns STATE, DECISIONS, runtime synchronization and migration application. No ROADMAP changes. All changes stay on Linux; preserve other agents' work.
</dependency_graph>

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Repair enumeration, revalidation and persistence using source identity</name>
  <files>database/migrations/0166_jellyfin_source_identity.up.sql, database/migrations/0166_jellyfin_source_identity.down.sql, backend/internal/models/episode_import.go, backend/internal/handlers/jellyfin_media_source.go, backend/internal/handlers/admin_episode_import.go, backend/internal/handlers/admin_episode_import_validation.go, backend/internal/handlers/episode_version_source_hydration.go, backend/internal/handlers/admin_content_episode_version_editor_scan.go, backend/internal/handlers/admin_content_handler.go, backend/internal/repository/jellyfin_source_repository.go, backend/internal/repository/episode_import_repository.go, backend/internal/repository/episode_import_repository_apply.go, backend/internal/repository/episode_import_repository_release_helpers.go, backend/internal/repository/episode_version_repository.go, backend/internal/repository/episode_version_repository_write_helpers.go, backend/internal/handlers/admin_episode_import_test.go, backend/internal/handlers/jellyfin_media_source_test.go, backend/internal/handlers/episode_version_source_hydration_test.go, backend/internal/repository/episode_import_repository_test.go, backend/internal/repository/episode_import_source_integration_test.go, backend/internal/repository/jellyfin_source_fixture_test.go, backend/internal/repository/episode_version_source_integration_test.go</files>
  <behavior>
    - One Item/one source -> one candidate; one Item/three sources -> three; standalone Items of one episode remain distinct.
    - Mixed representations yield exactly the fixture's 38 distinct sources; ep2/3 have B-SH, FlameHazeSubs and Strawhat, with stable pairs after response reordering.
    - Two same-Item sources import together into distinct source/version/variant rows, with source-correct metadata; repeated import is idempotent.
    - Duplicate pair, duplicate physical-source aliases, foreign/stale/missing/duplicate selectors fail atomically.
    - Cross-request alias import reuses a verified same-anime graph without changing persisted owner, or conflicts if evidence/ownership disagrees.
    - Opposing-order concurrent source batches cannot deadlock or create duplicates.
    - Existing selected imports and safely resolved unresolved rows suppress only their own physical source; ambiguous evidence fails closed without backfill.
    - GetByID, editor create/relink/scan, streams and chapters retain the correct sibling source; incomplete metadata cannot borrow another source's tracks.
    - Migration up/down/refusal and unchanged non-Jellyfin uniqueness run against guarded schemas.
  </behavior>
  <action>First add executable RED cases in existing fixtures and record actual failures. Implement ANALYSIS.md rules through existing selected-source projector and stream_sources snapshot owner. Use pair maps in request validation/apply planning and physical-source alias checks after authoritative membership validation. Enumerate all valid sources without per-source requests; exact hydration batches distinct real Item IDs only. Add source-aware coverage and replace GetByID's Item-global snapshot lookup with linked-source decoding. Introduce the narrow uniqueness migration only after rechecking the chain/preflight. Lock all physical sources in stable order before variant writes; keep anime ownership checks and return the existing graph by stream_source_id. Preserve existing source owner Item and URL on a verified alias; never silently rebind. Update shared editor consumers as necessary so scan/relink cannot choose arbitrary persisted siblings. Do not use source IDs as fake Items, public paths as identity, browser metadata as evidence, or fake complete snapshots to force a selector. Backend owns all Go/schema/test changes; frontend executor owns YAML contracts. Use isolated Docker testing with canonical backend bind mount and guarded DB fixture; do not incrementally copy partial code into live Air.</action>
  <verify><automated>go test ./internal/handlers ./internal/repository -run 'Test.*(EpisodeImport|11eyes|JellyfinSource|EpisodeVersionSource|EpisodeVersionEditorContext|ReleaseStream)' -count=1</automated></verify>
  <done>Required PostgreSQL tests execute without skips, sibling sources persist distinctly, repeat/alias/concurrency checks pass, migration gates pass, and selected-source regressions remain green. All tests run in the isolated Docker backend environment, never on host-installed Go.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Scope every builder action and contract to the reviewed source pair</name>
  <files>frontend/src/types/episodeImport.ts, frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts, frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts, frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts, frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx, frontend/src/app/admin/anime/[id]/episodes/import/page.tsx, frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx, frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx, shared/contracts/openapi.yaml, shared/contracts/admin-content.yaml, shared/contracts/episode-versions.yaml</files>
  <behavior>
    - Editing targets/groups/version, skip, single-row apply and removal affect only the selected pair, leaving same-Item siblings untouched.
    - Multi-source apply serializes both exact pairs; missing/mismatched selector is never repaired during apply.
    - Same episode/different source is valid; identical pair conflicts; filenames/groups distinguish releases.
    - React keys, pending state and editor file choice distinguish sibling sources without path identity.
    - Refresh-only session proceeds through the existing central auth/API client.
  </behavior>
  <action>Add and run RED helper/row/hook cases first. Introduce one collision-safe pair helper at the existing mapping seam, use it throughout callbacks, exact matching, React keys, pending state, removal and request projection. Keep existing card layout, filename and group controls. Update canonical/focused contracts and TypeScript comments for complete enumeration, reviewed pair identity, alias uniqueness and existing 400/409 errors. Optional source selectors apply only to unresolved projections, never confirmed commands. Diagnostic unmapped Item IDs are not row identities or unique-source counts; derive source counts from mappings. Replace editor path-based row identity with the pair and add same-Item/different-source regression. No new auth/fetch wrapper or UI redesign. Contracts belong exclusively to this task; coordinate any backend contract-test changes with Task 1.</action>
  <verify><automated>docker exec -w /app team4sv30-frontend npx vitest run 'src/app/admin/anime/[id]/episodes/import' 'src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx' src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts</automated></verify>
  <done>Independent source actions and single-row removal work, both pairs survive serialization, updated contracts parse and auth regressions pass.</done>
</task>

<task type="auto">
  <name>Task 3: Verify integrated behavior and commit the scoped quick</name>
  <files>.planning/quick/260916-ako-jellyfin-multiple-media-source-import/260916-ako-SUMMARY.md, .planning/quick/260916-ako-jellyfin-multiple-media-source-import/260916-ako-VERIFICATION.md, .planning/STATE.md, DECISIONS.md</files>
  <action>Root integrates both owners, reruns migration preflight, and synchronizes the passing backend coherently. Use the project runner for only the required schema migration; never reset data or spoof migration history. Prove at least two sibling sources persisted and are read distinctly in guarded real PostgreSQL fixtures; clearly distinguish this from any intentionally performed live application import. In the shared browser, follow the existing admin import route and verify episode 2/3 each show the three named files, independent actions and usable narrow layout. Full fixture count is 38; with three existing episode-1 imports, live expected count is 35 including two unmapped OVA sources (33 normal new sources), subject to unchanged data. Recheck actual source set rather than trusting counts. Run source contracts, relevant Go/frontend tests, Go build/vet, fresh typecheck/lint and feasible production build; compare with baseline and report unrelated failures. Root baseline: typecheck PASS; lint 3 errors/319 warnings. Preserve unrelated UAT entries; no automatic human approval. Record cause, changed identities/schema, exact fixture set, request/query budget, affected files, commits and provider edge cases. Commit only this task's files; no push unless separately requested.</action>
  <verify><automated>docker exec -w /app team4sv30-backend go test ./internal/models -run TestJellyfinSourceContract -count=1; docker exec -w /app team4sv30-backend go build ./...; docker exec -w /app team4sv30-frontend npm run typecheck; git diff --check</automated></verify>
  <done>Persisted integration proof and live preview evidence exist, scoped commits and diagnostics are documented, provider/NAS remain unchanged, and UAT boundaries remain accurate.</done>
</task>
</tasks>

<threat_model>
| Boundary | Threat | Disposition | Mitigation |
|---|---|---|---|
| Browser -> provider source | Forged selector/path attaches wrong file | mitigate | Exact Item lookup, source membership, anime/series/folder validation, discard posted technical data |
| Physical source -> DB graph | Alias/race duplicates or overwrites | mitigate | Source unique index, sorted locks, command duplicate checks, same-anime ownership and alias evidence |
| Linked source -> editor/playback | Sibling metadata/chapters leak | mitigate | Actual stream_source_id read, source-scoped retention, chapter ownership tests |
| Protected UI -> API | Refresh-only appears logged out | mitigate | Central API client and auth-refresh/no-token-boundary regressions |
| Migration -> schema | Guard removal or destructive rollback | mitigate | Atomic preflight/replacement guards, guarded up/down/refusal, no row merge/delete |
</threat_model>

<verification>
Required DB cases must run, not skip. Verify exact 11eyes source IDs/aliases, not count alone. Measure distinct-Item batching, one binding batch and absence of per-source requests. Preserve stream/subtitle/segment tests. Run scoped and fresh global checks and git diff --check. Browser evidence does not replace persisted tests or human acceptance.
</verification>

<output>
Write 260916-ako-SUMMARY.md and 260916-ako-VERIFICATION.md in this quick directory. Update Quick STATE and durable identity decision only. No ROADMAP or unrelated phase-status changes.
</output>
