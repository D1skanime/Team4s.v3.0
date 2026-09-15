# Phase 161 — Plan index and source coverage

Baseline: b3b07ff0. Discovery completed against Jellyfin 12.0 before implementation. This index implements the mandatory four-source audit; it does not claim implementation completion.

## Execution order and ownership

| Technical wave | Plan | Deliverable | Depends on |
|---|---|---|---|
| 1 | 161-01 | Shared authenticated transport; JSON/artwork callers; proven GetItems repairs | — |
| 2 | 161-02 | Typed source snapshot, deterministic resolver and bounded batch reads | 01 |
| 2 | 161-03 | Binary proxies, subtitles and authenticated FFmpeg | 01 |
| 3 | 161-04 | Backend/OpenAPI/TypeScript source contract and reviewed import serialization | 02 |
| 4 | 161-05 | Server revalidation, atomic import snapshot and persistence fixtures | 04 |
| 5 | 161-06 | Container-preserving editor writes and explicit file relinks | 05, 03 |
| 6 | 161-07 | Source-coherent video/subtitle/render/cache wiring | 06 |
| 7 | 161-08 | Selected-source public technical projection and final playback integration | 07 |
| 8 | 161-09 | Live caller/inventory checks and complete regression report | 08 |

Execute all plans sequentially in the shared canonical Linux checkout; no worktrees. Waves represent technical dependencies. Plans 02 and 03 have no overlapping modified files, but this does not override the execution constraint. Every plan lists exact owned files; unrelated changes remain untouched.

Shared-file dependencies:
- jellyfin_client.go: 01 → 02.
- group_assets_jellyfin.go: one owner, 01.
- segment_render_subtitles.go and episode_version_stream.go: 03 → 07.
- episode_version.go: 04 defines contracts before repository/editor consumers.
- episode_version_repository_write_helpers.go: 05 shared snapshot seam → 06 editor writer.
- episode_version_repository.go: 06 writer work → 07 selected-source reads.
- All three shared YAML files: one owner, 04.
- release_variant_source_repository.go: 07 establishes the read seam consumed by 08.
- theme_segment_playback_resolution_integration_test.go: final test ownership is Plan 08 Task 3; Plan 07 owns production cache wiring and request-level proofs.
- 09 owns final RESULTS/VERIFICATION/VALIDATION updates; plan summaries belong to their executors.

## Dependency and reachability audit

| Plan | Needs | Creates / reachable path | Human checkpoint |
|---|---|---|---|
| 01 | Existing configured key and inventoried callers | Existing metadata/artwork/group requests → common request policy | No |
| 02 | Authenticated transport | Existing episode collection / exact-ID reads → deterministic source value | No |
| 03 | Authenticated transport | Existing proxy and segment worker requests → header auth | No |
| 04 | Typed source model | Existing preview/mapping/scan/create/patch payloads carry source identity | No |
| 05 | Source model and wire contracts | Existing import Preview/Apply → provider revalidation → transaction | No |
| 06 | Snapshot persistence and contracts | Existing editor file selection/Create/Update → verified source relink | No |
| 07 | Stored binding and authenticated media | Existing release/segment playback → selected source and cache identity | No |
| 08 | Shared selected-variant/source read | Existing public release API → existing technical hero; final guarded playback integration | No |
| 09 | All implementation gates | Reproducible live read-only verifier and truthful technical result | No |

No new public route, source picker, provider credential, media registry, table or migration is required. Test-only database provisioning uses the already available team4s_phase117_test_161 database and guarded unique schemas; application rows are never used for mutation tests.

## Mandatory four-source coverage audit

| Source | ID | Required outcome / constraint | Plans | Status |
|---|---|---|---|---|
| GOAL | ROADMAP 161 | Actual Jellyfin-12 calls work and selected source/container/audio/subtitles remain coherent; no secret URLs, N+1 or other-provider change | 01–09 | COVERED |
| REQ | P161-AUTH | All direct/indirect Jellyfin requests use header authentication with secret-safe behavior | 01,03,09 | COVERED |
| REQ | P161-API | Used endpoints/parameters/defaults match the running Jellyfin-12 contract | 01,02,04,09 | COVERED |
| REQ | P161-ITEMS | Correct expected item set, explicit recursion, paging and totals | 01,02,05,09 | COVERED |
| REQ | P161-SOURCE | Deterministic item/source identity persists through all consumers | 02,04–07,09 | COVERED |
| REQ | P161-METADATA | Container and consumer-required audio/subtitle facts survive writes and public projection | 02,04–09 | COVERED |
| REQ | P161-REGRESSION | Focused tests, live evidence, no N+1, unchanged providers/ownership and truthful report | 03–09 | COVERED |
| RESEARCH | AUTH | Nine direct HTTP sites plus indirect FFmpeg; provider-aware origin/redirect/error policy | 01,03,09 | COVERED |
| RESEARCH | API | Group roots need Recursive=false; child paging; documented /Items/{id} key-only400 replaced with exact ItemsIds; valid ItemFields | 01,02,09 | COVERED |
| RESEARCH | SOURCE | Stored ID → unique stored path → conflict; unbound own-path → sole-source → conflict; no item-stream borrowing | 02,05–07 | COVERED |
| RESEARCH | IDENTITY | 11eyes:27 actual items,38 nested sources,11 non-item alternatives; do not invent Item IDs or duplicate alternatives | 02,05,09 | COVERED |
| RESEARCH | STORAGE | Existing metadata.jellyfin_source namespace; provider/item uniqueness; preserve unrelated keys and complete snapshots | 02,05,06 | COVERED |
| RESEARCH | APPLY | Server batch revalidation, stale/tampered zero-write handling, ownership and concurrency locks | 05,06 | COVERED |
| RESEARCH | CONTAINER | Generic title writer destroys filename/container; repeat import omits container | 05,06 | COVERED |
| RESEARCH | TRACKS | Representative audio codec/language from one track; unknown stays null; real subtitle codec/flags/labels; no unused fields | 02,04,05,08 | COVERED |
| RESEARCH | PLAYBACK | Same source in video/subtitle/FFmpeg and pre-lookup cache identity; reject execution drift | 07,08 | COVERED |
| RESEARCH | PUBLIC | Single selected variant/source; no cross-variant subtitles; DB-only no-snapshot read | 07,08 | COVERED |
| RESEARCH | FIXTURES | Guarded DB persistence, real sanitized 11eyes fixtures, deterministic A/B edge cases, request counters | 02,05–09 | COVERED |
| RESEARCH | LIMITS | No live rescan stability claim, no automatic all38-file import, cold subtitle timeout retained | 09 | COVERED |
| CONTEXT | D-01 | Full caller/api_key classification before changes | Discovery artifacts,01,09 | COVERED |
| CONTEXT | D-02 | Header auth, no secret URL/log/error/snapshot and no parallel auth implementation | 01,03,09 | COVERED |
| CONTEXT | D-03 | Real legacy401/header200 control and actual metadata request | Discovery artifacts,09 | COVERED |
| CONTEXT | D-04 | Only used API endpoints audited against12 | 01,02,04,09 | COVERED |
| CONTEXT | D-05 | Semantic GetItems proof beyond200 | 01,02,05,09 | COVERED |
| CONTEXT | D-06 | Full response→DTO→mapping→repo→DB→public trace | 02,04–09 | COVERED |
| CONTEXT | D-07 | Deterministic source and bounded rescan-ID recovery | 02,04–07,09 | COVERED |
| CONTEXT | D-08 | Correct every demonstrated container writer loss | 05,06,08 | COVERED |
| CONTEXT | D-09 | Consumer-justified same-source track fields and unknown language | 02,04–08 | COVERED |
| CONTEXT | D-10 | Existing schema first; no live reset/reseed/backfill/migration | 02,05–09 | COVERED |
| CONTEXT | D-11 | Other providers and canonical ownership remain intact | 01,03–09 | COVERED |
| CONTEXT | D-12 | Auth, A/B, reorder, persistence, realistic queries and repeated-import tests | 01–09 | COVERED |
| CONTEXT | D-13 | No per-item/source/stream request fan-out; measured counts | 01,02,05,07–09 | COVERED |
| CONTEXT | D-14 | Discovery/prioritization first; fix proved problems only | Discovery artifacts,01–09 | COVERED |
| CONTEXT | D-15 | File/function/cause/fix/test report and actual DoD evidence | 09 | COVERED |

Excluded intentionally by supplied scope: full integration rewrite, UI redesign, new media system, Fanart changes, broad normalization and unrelated optimization. Independently importing the 11 non-item alternatives is not a requirement of this selected-source phase; the final report must make that limitation visible.

## Execution assumptions and guardrails

- No new dependency or credential is required. x/text/language is already installed; the resolver uses explicit Tag.Raw language, never locale inference.
- FFmpeg's installed -max_redirects0 behavior was proved with two origins: zero requests reach the foreign origin. Preserve this as an executable test; no new stream proxy is planned.
- Same-path source-ID recovery cannot prove file-content identity after arbitrary moves/replacements; when ID and path both disappear, fail rather than guess.
- One selected source per real provider/item binding remains the existing model. A relink must not mutate a shared item snapshot to a different nested file and affect unrelated variants.
- Existing no-snapshot rows remain readable. No public read or provider probe writes them; explicit future operator import/relink is the mutation boundary.
- Latest baseline: existing frontend typecheck Page-export failures, global lint13errors/328warnings, two CSS-guard test failures, and broad Go preexisting failures are recorded separately. New failures remain forbidden.
- Human UAT status of phases156–160 is not changed by these plans.

## Pre-mortem checks

1. Source metadata is correct but playback still uses another source: Plan07 traces exact source ID through video/subtitle/cache and rejects worker identity drift.
2. Provider auth succeeds but keys leak through FFmpeg or redirects: Plan01 enforces Go origin policy; Plan03 includes executable FFmpeg redirect and stderr tests.
3. Repeat import or editor saves silently overwrite metadata: Plans05/06 use executable guarded transaction tests, complete/omitted snapshot semantics and source-row conflict checks.

No unplanned required source items remain.
