# Phase 161 Research

Baseline: `b3b07ff0`, canonical Linux repository. The complete assignment is in `161-USER-REQUEST.md`. Detailed evidence and reuse guidance: `161-CALLERS.md`, `161-MEDIASOURCE-RESEARCH.md`, `161-PATTERNS.md`, and `docs/audits/2026-09-15-jellyfin12/`.

## Prioritized findings

| Priority | Finding | Evidence and bounded correction |
|---|---|---|
| P0 | Legacy Jellyfin authentication fails | Nine Jellyfin-capable Go HTTP execution sites and indirect FFmpeg requests use query-auth builders. With the same key, control and actual series requests return 401 for query auth and 200 for the Authorization header. Adapt actual Jellyfin requests; preserve Fanart and Emby. |
| P1 | MediaSource selection can mix files | Import reads item metadata while the subtitle resolver combines item streams with the first source ID. Select one explicit source and carry its identity and metadata through all consumers. |
| P1 | Version editing destroys technical identity | The generic metadata writer assigns the release title to filename and derives container from that title. Repeat import also omits container updates. Preserve source-owned filename/container during ordinary metadata edits. |
| P1 | Public projection mixes variants | Scalar technical fields come from one variant, while subtitle languages are read across variants. Project all fields from the same selected variant/source. |
| P2 | Audio and subtitle metadata is lost | Import DTOs omit language and full tracks; normalized stream language IDs remain empty. Existing stream_sources.metadata JSONB supports a typed source snapshot without a new schema. Persist only consumer-backed fields. |
| P2 | GetItems root semantics changed | A group-root query returns three records with implicit recursion but one direct root with Recursive=false. Set intent explicitly. Cover the existing unpaginated 200-child limit with a multi-page fixture. |
| P2 | Group detail fails with API-key context | GET /Items/{id} is documented, but the live request returns 400; /Items?Ids=... works. Reuse the existing batch endpoint with exact ID checks. Do not claim the route was removed. |
| P3 | Invalid ItemFields are silently accepted | ProductionYear, RunTimeTicks, ImageTags and BackdropImageTags are not valid ItemFields enum values. The server currently ignores them with 200. Request valid fields while retaining always-returned base properties. |

## Real API and inventory evidence

The running server reports Jellyfin 12.0.0. Its OpenAPI digest and the used paths are stored in openapi-used-endpoints.json. The actual used routes are documented and nonobsolete. Official references: https://jellyfin.org/posts/jellyfin-release-12.0/ and https://github.com/jellyfin/jellyfin/pull/15559 .

Buddy Complex: one series match; Shows/Episodes and recursive Episode GetItems return the same 13 IDs. Pagination 5 + 5 + 3 preserves order, uniqueness and TotalRecordCount. A batch including nested MediaSources returns the needed metadata in one request: measured payload 50,298 bytes before versus 93,470 bytes with both item and source streams. This proves batch viability, not a performance improvement.

11eyes: the user specifically requested this live multi-source case. Both matching series return 27 episode items containing 38 unique source IDs. Every returned item has exactly one source with its own path. Eleven nested source IDs are absent as standalone items and a batched Items ID lookup returns zero matches. Source IDs therefore cannot be substituted for item IDs. Preserve the current one-selected-source-per-item model; importing all 38 alternative files independently is outside this assignment. Do not claim 27 candidates cover all files.

The sanitized Episode 1 fixture contains three real item shapes: B-SH (MKV, Japanese FLAC, German ASS), FlameHazeSubs (MP4, AAC with unknown language, no subtitle track), and Strawhat (MKV, Japanese Vorbis, German ASS). Alternate sources also appear nested on the B-SH item. Tests must preserve the three own-source candidates under reordering without expanding them into duplicates.

Read-only media probes: primary image and logo returned 200; ThemeVideos returned 200 with an empty list; video Range bytes 0-63 returned 206 and 64 bytes. The first subtitle read timed out at 15 seconds; a subsequent bounded read returned 200 and 42,335 bytes of ASS. Record this cold-read limitation rather than promising latency.

## Implementation boundaries

Reuse a focused Jellyfin auth/request seam without changing unrelated response, timeout or context behavior. Protect same-origin credentials, redirects and sanitized errors. FFmpeg needs authenticated input separately from a key-free URL and redacted diagnostics. Keep Fanart and Emby behavior intact.

Use a typed selected-source snapshot in existing stream_sources.metadata. Resolve an existing binding by stored source ID, then a unique stored path, otherwise report a conflict. Never fall through to another file when a binding disappears. For an unbound item use a unique own-path match, otherwise its sole source, otherwise report ambiguity. Names, container and array order are not identity. Keep item and source IDs separate in playback, subtitle and render-cache identity.

Public metadata remains DB-only. No live import, backfill, reset, reseed, cache deletion or provider scan is authorized. Existing missing metadata may remain missing until a separately authorized normal import/relink occurs. Isolated database fixtures provide persistence proof.

## Validation Architecture

1. Go httptest coverage: auth headers, key-free URLs, unchanged providers, 401/5xx/transport errors, redirects and Range forwarding.
2. Source fixtures: contrasting A/B files, reordered arrays, stored binding, ID churn with stable path, missing binding, ambiguity, unknown language, and the real 11eyes shape.
3. Guarded isolated PostgreSQL tests: atomic snapshot and scalar writes, repeat import, title-edit retention, one-variant public projection, unchanged ownership and graph counts.
4. Runtime/OpenAPI/TypeScript contract checks and existing protected-editor refresh-session regression tests; no UI redesign.
5. Relevant backend tests/build/vet; frontend typecheck, lint, tests and isolated production build; diff checks. Record pre-existing failures separately.
6. Real read-only API/media verification and request counts after implementation; browser review through existing public routes.

## Phase continuity

Phase 161 starts from implemented Phase 159/current baseline. Phase 160 explicitly waits for this repair. Preserve fresh 156/157 UAT sign-offs, open 158/159 human UAT and the recent graceful Jellyfin-outage editor behavior. Do not claim that simulated ID churn proves stability across every real rescan or file move.

## User clarification: audio display default

On 2026-09-15 the user requested Japanese for unknown language and explicitly limited this to audio. Preserve the resolver/import evidence (unknown or und remains null in the source snapshot), then apply Japanisch as the existing audio field's display fallback. Known audio values take precedence. Unknown subtitle language remains unknown, and no audio or subtitle track is fabricated. Plan 08 owns the minimal existing-component change and regression tests. This is a user-authorized product default, not a new provider fact.
