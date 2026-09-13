# Phase 158 — Technical Results

**technical_passed: true — Phase-158 scope, with explicit pre-existing global gate exceptions.** This is not a whole-application production-build PASS and not Human-UAT approval. The orchestrator owns the independent review and Phase-159 release decision.

- Audit/phase baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
- Product plans: 158-01, 158-02, 158-03; final product commit `d0ae1f9b`. Plan 04 began at `388a6e62`; harness commit `feeeb125`. The Task-2 documentation/evidence commit is identified in 158-04-SUMMARY.
- Final fixture run: 2026-09-13, **33/33 PASS, exit 0**, repeated after correcting the test's initial SSR/hydration race. Final JSON SHA256: `51958ed5631ccca7f0444419ebf7661213513537328f2f38244c0991c9d1f6d0`.
- Canonical Linux working tree and existing Docker containers only. No live database write, seed, migration, backend restart, dependency installation, environment-file change or push.

## Evidence and gates

| Gate | Fresh result | Evidence |
|---|---|---|
| Focused frontend | 11 files, 168 tests PASS | [focused-tests.log](focused-tests.log) |
| Complete frontend | 2459 PASS, 2 baseline failures, 3 todo; 308 files PASS, 1 failed, 1 skipped | [frontend-tests.log](frontend-tests.log) |
| Full typecheck | PASS / exit 0; former two numeric-route TS2344 errors fixed in 158-01 | [typecheck.log](typecheck.log) |
| Full lint | 13 existing errors / 331 existing warnings; no additional finding | [lint.log](lint.log), [exact baseline comparison](baseline-comparison.json) |
| Harness scoped lint and shell syntax | PASS / exit 0, no warnings | `npx eslint scripts/anime-detail-phase158-probe.mjs scripts/fixtures/anime-detail-fixture-server.mjs`; `bash -n scripts/verify-anime-detail-phase.sh` |
| Backend public-anime/ID/contract regression | PASS / exit 0, real isolated PostgreSQL cases executed | [backend-anime-tests.log](backend-anime-tests.log) |
| Backend build and scoped vet | PASS / exit 0 | [backend-build.log](backend-build.log), [backend-vet.log](backend-vet.log) |
| Complete isolated Next production build | **FAIL: unchanged baseline blocker** `formatEditLoadError` is not an allowed Page export in admin/anime/[id]/edit/page.tsx | [production-build.log](production-build.log) |
| Selective actual production routes | PASS, webpack + generated route types + production server | [production-selective-build.log](production-selective-build.log) |
| Production HTTP/browser/fixtures | 33/33 PASS / exit 0 | [fixture-results.json](fixture-results.json), [fixture-run.log](fixture-run.log), [server log](fixture-next.log), [valid HTTP body](valid.html) |
| Whole-phase diff check | PASS / exit 0 | [diff-check.log](diff-check.log) |
| Shared browser | Actual /anime/1 navigation and geometry PASS, anonymous read-only flow | [root live notes](ROOT-LIVE-NOTES.md), [root browser facts](root-live-browser.json) |

The two full-suite failures are the identical `cssCustomProperties.guard.test.ts` dead-property textual mention and allowlist-count assertions. [baseline-comparison.json](baseline-comparison.json) compares the exact failed test names and all 13 lint error file/message pairs with the phase-start logs, not merely the previous plan. Five unrelated backend tests skip because their distinct fixture prerequisites are absent; none belongs to the new public-read SQL matrix and none is counted as SQL proof.

`bash scripts/verify-anime-detail-phase.sh 158 --gates` deliberately exits **1** while the acknowledged global test/lint failures remain. The phase decision classifies these explicitly; the shell does not turn them into a green exit.

## Production build boundary

Full source is copied inside the frontend container to `/tmp/team4s-phase158-production`, excluding `.env*`, `.next` and `node_modules`; the existing dependency directory is linked. The live `/app/.next` is preserved.

The unchanged invalid admin export is present at baseline line 26. The full build compiled webpack and stopped during Next's Page-export validation. Further unrelated full-build blockers beyond that first error remain unknown.

The installed Next 16.1.6 CLI supports `--debug-build-paths`; its path categorizer only accepts `app/`, not `src/app/`. A disposable `app -> src/app` alias permits a selective build without changing route source, imports, root layout or Suspense composition. Exact patterns: `app/anime/**/page.tsx,app/fansubs/**/page.tsx`. The log lists /anime, /anime/[id], numeric group/project release routes, /fansubs, /fansubs/[slug] and all three Pretty project routes, plus /_not-found. Earlier probes that generated only /404 were rejected, not credited.

No `ignoreBuildErrors`, patched Next package or product-route removal was used. The selective build is a scope-specific production proof, never a replacement claim that the complete production build passes.

## Mandatory behavior matrix

| Requirement / case | Proof and result |
|---|---|
| P158-01/02: 360, 390, 767, 768, 1440, episode closed/open | 10 geometry records and 20 screenshots/crops. document.scrollWidth equals viewport in every fixture; scrollX remains 0 after explicit horizontal scroll. |
| Colors | Episode header rgb(28,28,30), white card rgb(255,255,255); contribution heading white, main rgb(15,15,18). Real computed styles, not source-token assertions alone. |
| Focus and slider | Groups CTA has an active 2px solid outline, offset 2px, complete bounds/ring inside clipping ancestors at all widths/states. Related slider moves after its actual right button is clicked at each width. |
| P158-03: Access / refresh-only / expired Access + valid refresh / neither | Real central browser transport and useAuthSession exercised in isolated contexts. Refresh-only and expired Access each issue exactly one token refresh; mocked Keycloak token bundle and /api/v1/me allow the real central persistence path. Neither token produces two disabled login controls and zero watchlist calls. |
| Rejected refresh | Actual mocked refresh HTTP401 awaited; refresh cookie disappears, login UI is shown, no mutation occurs. |
| Login, account switch, logout after mount | UI changes from no session to absent watchlist, to the next account's existing entry, then logout. No write occurs. Token-free identity/generation races, missing/blocked metadata, same-turn account changes and same-account rotation are additionally covered by the 158-02 regressions in the full suite. |
| P158-04: Watchlist unknown / retry / existing / custom errors | GET401/500/network each disables mutation; retry restores a known existing entry; DELETE error remains visible under the page's custom button styling. Add/Delete and stale async branches are covered by the focused component suite. |
| Contributions loading / empty / errors | 401/500/network: loading is observed, failure is never empty, retry reaches an actual successful empty result. Loaded-group and old-anime success/failure cases pass in component tests. |
| Comment errors | Real central calls with401/500/network show scoped errors and no success. Concurrent Watchlist GET + Comment POST singleflight and stale callbacks have dedicated central/component integration tests. |
| P158-05: Strict HTTP / metadata | Normal Chrome UA: /anime/1 ->200 with real fixture title and numeric canonical without grid query. 1abc,1.5,0,-1,9007199254740992,999999999 -> actual404, noindex, no anime canonical/title. API500 and socket-close network failure -> actual500, noindex, no anime metadata. |
| Page + metadata request sharing | Cold production request observes exactly one Anime GET; own disposable fetch cache reset before the runner starts. SSR watchlist calls = 0. |
| P158-06: Honest metrics | Page/runtime/unit evidence confirms removal of fabricated7.8 and constant anime Views. Real episode data and the existing Anime22/Emby mapping remain. No replacement metrics feature. |
| P158-07: Pretty and numeric | Synthetic stored anime slug deliberately differs from its display title. Primary and secondary visible links use stored group slugs; actual link click renders the project. Numeric route returns200 and its canonical is the Pretty path. Shared live browser independently follows the actual Buddy Complex link. |
| Pretty page metadata boundary | The existing Pretty page has no own generateMetadata/self-canonical; this predates158. Numeric compatibility canonical and Anime canonical are verified. No unrelated Pretty SEO behavior was introduced. |
| P158-08: Relations | Actual pgx QueryTracer/httptest success, empty, licensed, unknown, disabled, invalid and both SQL failures; detailed counts below. |
| Empty series | Real production page with a successful empty grouped-episode payload displays the intentional empty state, no episode controls. |
| P158-09 | All mandatory technical cases have executed browser or focused integration evidence. No new regression against the complete phase baseline. Review/technical approval remains distinct from Human-UAT. |

Representative viewed screenshots: [390 open](viewport-390-open.png), [1440 closed](viewport-1440-closed.png). All widths have `viewport-{width}-{closed|open}.png` and `focus-{width}-{closed|open}.png`. Fixture media is intentionally absent; these screenshots do not claim Phase159 image-budget coverage.

The existing episode-card `overflow:hidden` can clip the header's outward default focus outline; body `overflow-x:clip` also predates the phase. Both were verified at the baseline and remain unchanged. The F03 proof specifically establishes that the new decorative hero clipping does not clip the Groups CTA focus ring, related slider or controls. The older header-outline issue is recorded rather than silently claiming all historical focus treatment is perfect.

## Fresh request and SQL comparison

| Path / conditions | Before | After | Measurement boundary |
|---|---:|---:|---|
| Initial anonymous data requests, including three root role catalogs | 10 API calls | 10 = 8 SSR + 2 client | Original audit versus freshly observed isolated production fixture; same page entry, no interaction |
| Anime detail | 1 request / 7 SQL | 1 request / 7 SQL | Fresh request counter; detail SQL tracer covers six stored/absent/legacy slug cases |
| Relations success / empty / licensed | 8 SQL total (1 schema + 7 data) | 2 data statements | Measured before in158-01 RED fixture and freshly after with identical fixture structure |
| Relations unknown / disabled | 2 SQL total | 1 data statement | Actual404; no hidden schema query excluded |
| Invalid relations IDs | 0 SQL | 0 SQL | Actual400, including handler overflow case |
| Existence / relation SQL errors | Semantic500 preserved | 1 / 2 attempted statements | Actual isolated SQL failure cases |
| Initial complete request-path SQL total | 38 (static audit, includes root catalogs) | 32 (static recomputation, includes root catalogs) | 7+2+4+3+2+8+3+3. Only the relations reduction and detail budget are instrumented here; this is **not** an end-to-end live SQL measurement. |
| Episode expansion + selected group change | 0 API requests | 0 additional client data requests | Fresh browser counter; no grid interaction |
| Auth | SSR Access-cookie status previously +1 | SSR watchlist0; client known session owns status | Isolated server/browser counters; auth refresh separately counted |
| Media / recurring | Separate from JSON data budget | Separate; no image-byte or latency claim | No invented millisecond gain; manifest TTL/media budgets belong to159 |

The SQL container uses postgres:16, tmpfs PGDATA, no published port and database `team4s_phase106_test_p158`; only `TEAM4S_PHASE106_TEST_DSN` is passed. The existing guarded Phase106 helper checks database identity and owns a unique fixture schema. The wrapper stops its own container by captured ID on exit. It never reads application DATABASE_URL or runs application migrations.

## Findings and scope

| Finding | Final Phase158 status |
|---|---|
| F01, F02, F03, F06, F07, F12 | Fixed for the explicitly requested repairs; evidence above. |
| F04 | Requested fabricated metrics removed. Larger Emby/product/media decisions deliberately remain outside158. |
| F05 | Strict numeric resources, real statuses and consistent Anime metadata fixed. No new Anime slug route. |
| F08–F11, F13–F14 | Phase159 scope remains pending its execution; no consolidation claim here. |
| F15 | Global owner/shell DTO work remains deliberately outside both phases. |

## Files, commits, reproducibility and remaining risks

[file-inventory.json](file-inventory.json) lists every changed product/test/harness path against the audit baseline, including both intentional loading-component renames: 4 backend behavior files, 16 frontend behavior/style files, 2 contract files and18 test/harness files. Detailed per-task commits are in 158-01/02/03-SUMMARY and158-04-SUMMARY. Documentation/evidence is separate.

Reproduce from /home/d1sk/team4s:

```sh
bash scripts/verify-anime-detail-phase.sh 158 --fixtures
bash scripts/verify-anime-detail-phase.sh 158 --gates
```

Fixtures return0 only when all selected checks pass; the optional diagnostic filter marks omitted cases NOT_RUN and cannot produce a complete PASS. The first reproduction command retains distinct failed full-build and successful selective-build logs. The second intentionally returns1 for baseline failures. Scoped lint and focused-test commands are recorded above and in the summary.

During harness development, networkidle was unsuitable for the shell; readiness now uses actual page/controls. The desktop cursor starts away from the hover-open navigation rail. The rejected-refresh test formerly matched initial SSR login UI before the refresh occurred; waiting for the real401 and cleared cookie fixes that timing error. Final full33-case run and the preceding33-case rerun both passed; earlier intermediate failures were not technical approval.

No mandatory Phase158 case remains unreproduced. Live authenticated account mutations were deliberately simulated, not executed against real users. Production deployment of the whole application remains blocked at the unrelated Page export. The old focus-outline issue and five skipped unrelated SQL prerequisites remain documented limits. Human-UAT **156 GAP-02 (14 origin/contributor checks)** and **157-06 Task4** stay **OPEN**. Phase158's human review is also pending; no automated result closes these approvals.

Captured text logs have trailing whitespace and extra blank EOF lines normalized only; messages, counts and exit results are preserved.
