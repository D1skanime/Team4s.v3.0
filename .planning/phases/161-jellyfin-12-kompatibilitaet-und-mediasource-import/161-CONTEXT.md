# Phase 161: Jellyfin 12 compatibility and MediaSource import

Gathered: 2026-09-15
Status: Discovery and independent plan review complete; implementation starting
Source: 161-USER-REQUEST.md (complete authoritative user assignment; supersedes truncated first attachment)
Baseline: b3b07ff0; Linux /home/d1sk/team4s; initial worktree clean.

<domain>
Adapt actual Team4s Jellyfin calls to Jellyfin 12 and prove correct source-coherent imported metadata. Three distinct work areas: authentication, actual API compatibility, MediaSource/variant/container/audio/subtitle data flow. No broad rewrite.
</domain>

<decisions>
- D-01: Inventory every direct/indirect backend Jellyfin HTTP caller, endpoint, method, auth and query; classify all api_key occurrences by provider/relevance. No global replace.
- D-02: Actual server-side Jellyfin calls use Authorization: MediaBrowser Token with the existing key; no API key in URLs, logs, errors or snapshots. Reuse focused shared transport/auth seams where ownership fits.
- D-03: Prove harmless real old-auth 401 versus modern-header 200 and one actual metadata request; this proves auth only.
- D-04: Audit only endpoints actually used against Jellyfin 12 OpenAPI, including removed/obsolete paths, parameters/defaults/response changes.
- D-05: GetItems needs semantic inventory/filter/pagination/TotalRecordCount proof, not merely HTTP 200.
- D-06: Trace response -> DTO -> mapping -> repository -> DB -> public API and every source-selection decision.
- D-07: Select MediaSource deterministically; do not mix source A container with source B streams or trust array order. Evaluate source ID/item ID/path/name/version/container/size and scan stability.
- D-08: Establish and correct proven container information loss through all writers; release title must not become a technical filename.
- D-09: Evaluate audio/subtitle index, codec, language, title, defaults/forced and relevant audio channels/external flags; persist only consumer-justified fields from the chosen source. Unknown language is not inferred.
- D-10: Inspect existing schemas/DTOs before minimal schema extension; document missing concept, table, migration and compatibility implications. User requires existing imports/releases remain unaffected; no reset/reseed/backfill or live row mutations are authorized by this phase.
- D-11: Keep Fanart/other providers, public projects/releases, group media/backdrops and existing mappings working; preserve canonical release/variant/stream ownership.
- D-12: Add focused auth, source A/B, reordered sources, container, language, realistic GetItems and regression tests, including repeat import without duplication/corruption.
- D-13: No per-item source or per-stream request fan-out when batch responses suffice; document request counts before/after.
- D-14: Finish Discovery and prioritize proven findings P0-P3 before implementation. Fix only demonstrated problems; no UI redesign, different media system, broad DB normalization or unrelated optimization.
- D-15: Deliver per-fix file/function/cause/change/test evidence, live auth/API/GetItems proof, mapping/container/tracks/request/test results and remaining limitations. Do not mark complete without DoD proof.
- D-16 (user clarification 2026-09-15): Display Japanese as the default ONLY for an unknown audio language. A known language takes precedence. Subtitle language is never defaulted to Japanese. Preserve unknown provider language in the source snapshot; the Japanese default is a presentation policy, not a claim that Jellyfin supplied Japanese. This supersedes D-09 only for the audio display fallback.
</decisions>

<canonical_refs>
- AGENTS.md
- AI-HANDOFF.md
- docs/engineering/implementation-contract.md
- docs/api/api-contracts.md
- docs/architecture/db-schema-fansub-domain.md
- docs/frontend/auth-api-client.md
- shared/contracts/openapi.yaml
- shared/contracts/admin-content.yaml
- backend/internal/handlers/jellyfin_client.go
- backend/internal/handlers/admin_episode_import.go
- backend/internal/models/episode_import.go
- backend/internal/repository/episode_import_repository_release_helpers.go
- backend/internal/repository/release_stream_repository_helpers.go
- backend/internal/repository/episode_version_repository_write_helpers.go
- backend/internal/repository/release_detail_public_repository_helpers.go
</canonical_refs>

<continuity>
Phase 160 was added separately and explicitly waits for this Jellyfin repair; do not execute/rewrite its UI scope. 156/157 have fresh user UAT sign-off records as of 2026-09-15; stale STATE paragraphs remain historical. 158/159 are technically complete with human anime UAT open. Do not rewrite those statuses. GSD generic phase counters/current_phase=129 are stale; actual highest directory and roadmap phase before this assignment was 160.
Existing known gates include global frontend lint errors and CSS guard/build issues; measure current baseline and separate pre-existing failures. The recent Jellyfin-outage editor quick fix (260915-dws) must remain intact.
</continuity>
