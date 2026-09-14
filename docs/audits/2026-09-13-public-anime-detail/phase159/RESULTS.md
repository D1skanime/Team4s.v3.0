# Phase 159 — Technical results

**Final isolated production run: 91/91 PASS, exit0**, including all33 Phase158 regressions and48 media configurations with96 cold/warm observations. Human UAT remains open. [Complete data](fixture-results.json), [exit](fixture-run.exit), [source hashes](159-05/final-run.json), [file inventory](file-inventory.json), [cleanup](159-05/resources.json).

Phase159 baseline c3bfcb23781addca1ccd3931592535416f706787; original audit7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85. Plan05 started194649cba38115fa493de39262f55cb3ce77c209. Final product6ebfebf7, test corrections d22da611/a76d9a8e, harness c1bd215c. The evidence commit containing this report closes Task2; the summary records it.

## Gates

| Check | Actual result |
|---|---|
| Full frontend | 2616 PASS, exactly2 existing CSS-guard FAIL,3todo;321files:319PASS/1FAIL/1SKIP |
| Typecheck / scoped frontend lint | 0 / 0 |
| Global lint | 13errors/331warnings; exact baseline diagnostic multiset, no added/removed |
| Harness Node/shell syntax / scoped ESLint | 0 / 0 |
| Go build/vet/relevant repository-handler-model regression | PASS with actual isolated PostgreSQL |
| Full Next production build | FAIL: unchanged admin formatEditLoadError invalid Page export |
| Selective production build / full browser run | PASS /91 of91 |
| Whole original audit baseline diff check | PASS after documented log whitespace normalization |

[Root gate manifest](root-gates-15905/manifest.json), [test comparison](root-gates-15905/test-baseline-comparison.json), [lint comparison](root-gates-15905/lint-baseline-comparison.json). The two existing tests concern --surface-muted textmention and CSS allowlist count in cssCustomProperties.guard.test.ts. Phase158 ended2459PASS+the same2failures; the original audit had2334PASS+the same2. No global cleanup.

The full build ran once in a container-owned /tmp copy, excluding .env*, live .next and dependencies, then linking existing dependencies. The installed Next16.1.6 selective-build option and temporary app→src/app symlink verified Anime/fansub pages and stream/APIv1/media/covers routes. [Exact routes](production-selected-routes.txt), [full failure](production-build.log), [selective success](production-selective-build.log). No ignoreBuildErrors, product Next patch or LocalIP relaxation. Unselected routes and later possible full-build blockers remain unverified.

## Browser, requests and SQL

All five widths360/390/767/768/1440, closed/open episodes, scrollWidth<=viewport, root scroll0, computed colors/focus/slider, strict invalid/unknown IDs and real404/noindex/no canonical, technical500/network and valid metadata pass. The33 Phase158 cases also cover absent/access/refresh-only/expired-access/denied-refresh sessions, account changes, existing watchlist and401/500/network/action/comment errors through the central auth seam. Writes are absorbed in isolated contexts. Visible Pretty and numeric compatibility pass; existing Pretty self-canonical absence is outside the requested SEO scope.

Cold SSR:8API calls (3existing shell role catalogs plus detail/comments/fansubs/public episodes/relations); Page+Metadata share1AnimeGET. Client adds contributions+manifest, total10API calls as at the original audit. Anonymous auth/watchlistGETs0; episode expansion0requests; native two-tab group selection0additionalAPI calls. Invalid/removed/blocked storage, reload, clear and synchronized story/filter/variants pass. Full-suite SSR/StrictMode/anime-change tests supplement browser evidence.

125variants plus a neutral same-number episode keep distinct episode_id keys, global version_count125 and exact Play /api/releases/10/stream?variant_id=100. Six successful pages plus one failed continuation exercise retry. Grid traverses1→2→3→2→3, preserves query fields, shares slow hover/focus/click lookup, performs no initial list request, and ignores old contexts; the entire scenario records11list calls. Manifest initial sharing1request, TTLfocus burst+1, failure+retry→4 in the same SPA.25IDs/48SPA navigations with frozen TTL prove retention eviction; units cover multiple providers, StrictMode, last-consumer abort, identical snapshots and stale rejection.

[Fresh SQL/handler log](backend-anime-tests.log), [same-data baseline full](159-05/sql-full-baseline.log), [current full](159-05/sql-full-current.log), [initial public pages](159-05/sql-public-initial.log):

| Read | SQL | Rows / JSON bytes |
|---|---:|---|
| Baseline full125variants | 4 | 125variants/57,773B |
| Current full125variants | 4 | 125variants/63,023B; explicit IDs added |
| Initial public limit24 | 2 | 24atomic rows/7,522B; has_more |
| Initial public limit100 | 2 | 100rows/30,475B; has_more |
| Complete125variants+neutral, limit1 | 2/page |126pages/126unique rows/72,082B |
| Same, limit24 | 2/page |6pages/126rows/39,456B |
| Same, limit100 | 2/page |2pages/126rows/38,362B |

Each page returns1existence row plus<=limit+1inventory rows including sentinel. These are returned rows, not physical scan counts or universal text-byte caps. Full/admin and AnimeDetail neutral fallback remain outside this public bound. Mixed/neutral/empty, assignment/range divergence, explicit-ID collisions and canonical grant/entitlement/source/relay contracts pass. Unrelated Phase107 tests SKIP without their DSN; these are not mandatorySQL proof.

Fresh relations: valid/empty/mixed-visible2dataSQL; unknown/disabled1; invalid0; technical failures500 after1/2statements. Detail remains7total (1schema+6data). Original whole-page38SQL was a static audit estimate; no fabricated replacement whole-page count or latency claim.

## Media

[HTTP originals/display measurements](media-http.json) and all96CDP observations in fixture-results.json use a GET-only proxy restricted to the owned two loopback origins, with **no Playwright routing during cache measurement**. Every observation records all four DOM/CSS URLs and all source responses, MIME/status, body/encoded transfer bytes, memory/disk/service-worker flags and Sharp-decoded dimensions.

Successful cold sources have exactly1image-body transfer. Public sources warm-load from cache with0; private API-files intentionally warm-transfer1 under private/no-store.404/500 produce1–2small non-cacheable error responses per observation (maximum2), each25/32/33B: **zero image bodies and no original fallback**. No error-response cache was introduced.

| Source | Original body→display body | Decoded display |
|---|---|---|
| Existing tracked public cover |50,844→20,988B WebP|400×578 |
| Local/private API PNG |4,287,084→156,718B WebP|512×730 |
| Provider fixture |136,932B JPEG display;137,258B encoded transfer cold|512×730 |
| GIF/APNG/WebP |8,098/11,327/236→708/506/706B WebP|512×341, static first frame |
| AVIF |1,696,597→156,034B WebP|512×730 |
| Valid neutral PNG fallback |298→74B WebP|64×96 |

Tiny synthetic animated WebP grows after re-encoding:512px is a dimension bound, not a universal KB-reduction guarantee. Root's separate [live provider sample](root-live-media-baseline.json) measured739,798→95,674HTTPbody bytes. Original no-query, HEAD, Range/conditional stripping, real private API-files and existing public cover route pass. App-shell RSC prefetches for unselected build routes can remain pending; the harness waits for actual completed image consumers instead of generic networkidle.

## Findings and deviations

| Finding | Status |
|---|---|
| F01–03,F05–07,F12 | Phase158 fixes preserved by fresh regression |
| F04 | Fabricated metrics removed in158; larger media/product decisions outside scope |
| F08 | Public paging/assignment authority complete; broader finding partial because intentional full/admin/neutral-detail lists remain |
| F09 | Real provider/local bounded delivery, sharing and fallback complete |
| F10,F11,F13 | Manifest lifecycle, single group owner and reliable grid context complete |
| F14 | Runtime/OpenAPI/TS and explicit identity aligned; legacy no-selector stream ambiguity deliberately compatible/partial |
| F15–17 | OwnerDTO, comment history/product decisions and broad cleanup outside both phases |

Independent security F01 was closed RED8eaca4bf→GREEN157f318f: one extracted existing RawQuery helper rejects malformed projection/cursor/limit before repository use while preserving valid full/default/unrelated-malformed compatibility. [Consumer delta](159-05/F01-CONSUMER-DELTA.md), [root live400/valid200 proof](root-runtime-sync-15905-query.json).

The old tracked352BplaceholderJPG is corrupt baseline data and unchanged. RED7459db5f→GREEN26faac70 adds a valid anime-only neutralPNG. Next rejected the initial child path below a real public file with ENOTDIR500; RED80d74474→GREEN6ebfebf7 moves the adapter to **/covers/display/[file]**. [Live failure](root-live-cover-route-finding.json), [fixed live output](root-live-cover-route-fixed.json). Other original routes remain.

Intermediate harness failures are preserved under159-05/fixture-interim-*: final removed Load-more button, retry setup with cached neighbors, overly broad error-text body limit; the first wait also hit unselected RSC prefetches. No product workaround: final91/91 is one coherent run. [Text-only normalization hashes](159-05/log-normalization.json).

Exact owned PostgreSQL containers, scratch/production/media/evidence tmp paths were removed and3158/3159/3160 closed. No live DB/media/env/volume mutation, migration, backend restart, Dev.next build, real playback/auth write or push. Root's [shared visible flow](root-live-final-ui.json) supplements isolated screenshots. Independent reports/global tracking belong to Root.

**Human UAT156-GAP02(14),157-06Task4,158 and159 remain OPEN.** Technical checks do not provide human sign-off.
