---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
verified: 2026-09-17T19:31:59Z
status: passed
score: 24/24 must-haves verified (all 24 REQ-163-01..24 requirement IDs satisfied)
overrides_applied: 0
---

# Phase 163: Öffentliche Anime-Seite: Episoden nach Fansub-Gruppe und vorhandenen Releases filtern — Verification Report

**Phase Goal:** Die Episodenliste auf `/anime/[id]` zeigt nur Episoden mit mindestens einer öffentlich sichtbaren Release-Version; bei aktiver Fansub-Gruppe (Phase-162-URL-Zustand `?fansub=`) nur Episoden und Versionen dieser Gruppe inkl. Coop-Beteiligung – serverseitig, paginationskorrekt, ohne N+1 und ohne Umsortierung.

**Verified:** 2026-09-17T19:31:59Z
**Status:** passed
**Re-verification:** No — initial verification

## Methodology

This is an adversarial, goal-backward verification. SUMMARY.md claims were treated as unverified narrative and independently re-derived against the live codebase, the live database (`team4s_v2`, read-only), the live rebuilt containers, and freshly re-run test suites (not trusting cached/reported pass counts alone). Every claim below was independently reproduced by this verifier in this session unless explicitly marked otherwise.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Episode ohne öffentliche Release-Version ist bei "Alle" unsichtbar (neutral-row bug fixed) | ✓ VERIFIED | Read `episode_version_public_query.go`: `LEFT JOIN LATERAL` → `JOIN LATERAL` (INNER) with unconditional `EXISTS(release_version_groups ...)`. Independently re-ran `go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1` against a fresh isolated fixture DB (`team4s_phase117_test_163`) — all 11 tests PASS. Live curl against `team4s_v2` anime_id=4 (Naruto, 220 real episodes): unfiltered "Alle" returns exactly `episode_count: 5`, ids `[53,54,55,56,57]`, `any version_count==0: False`. |
| 2 | Konkrete Gruppe aktiv: nur Episoden/Versionen dieser Gruppe inkl. Coop | ✓ VERIFIED | Live curl `fansub=animeownage` → `episode_count:3`, ids `[53,54,57]`; `fansub=project-messiah` → `episode_count:3`, ids `[55,56,57]`. Episode 57 (coop) present under both, its version's `fansub_groups` = `['animeownage','project-messiah']` — independently confirmed via curl+jq, not merely cited from a prior SUMMARY. |
| 3 | Gruppenfilter ist serverseitig in Cursor-Pagination integriert, kein Client-Scheinfilter | ✓ VERIFIED | `TestEpisodeVersionPublicGroupFilterPaginationScope` (Pflichtfall F) independently re-run: PASS. SQL applies `EXISTS` predicate inside the `inventory` CTE, before the `page` CTE's `LIMIT`. |
| 4 | Cursor ist filterscope-gebunden (D-06): Cursor aus Filter A wird bei Filter B/„Alle" abgelehnt | ✓ VERIFIED | Live-reproduced independently: fetched a real cursor under `fansub=animeownage`, replayed it under `fansub=project-messiah` → HTTP 400. Replayed the SAME cursor under the SAME filter → HTTP 200. `TestEpisodeVersionPublicGroupFilterCursorScope` independently re-run: PASS, asserts zero DB queries on mismatch. |
| 5 | Unresolvable fansub slug fails closed (400), never unfiltered data (D-05) | ✓ VERIFIED | Live curl `fansub=does-not-exist` → HTTP 400 (independently reproduced). `ResolveFansubGroupIDForAnime` scopes lookup to `anime_fansub_groups.anime_id=$1` (IDOR mitigation), read in full. |
| 6 | Query-Kosten bleiben konstant (kein N+1): 2 Statements ohne Filter, 3 mit Filter | ✓ VERIFIED | Code inspection confirms existence-check + optional slug-resolution + main statement = 2 or 3. `assertPublicBudgetWithGroupFilter`-style budget assertions in `episode_version_public_group_filter_test.go` independently re-run: PASS. |
| 7 | Bestehende Episodenreihenfolge bleibt unverändert (`episode_number, episode_id, variant_id`) | ✓ VERIFIED | `ORDER BY p.episode_number,p.episode_id,COALESCE(p.variant_id,0)` unchanged in the final SELECT (only the join/EXISTS/CTE additions changed, ordering clause untouched). |
| 8 | Gemeinsamer URL-Zustand `?fansub=` steuert sowohl Navigation als auch Episodenfilterung (kein zweiter unabhängiger Zustand) | ✓ VERIFIED | `page.tsx` reads `resolvedSearchParams.fansub`, resolves via `resolveActiveFansubSlug`, forwards into `getGroupedEpisodes`; `FansubVersionBrowser.tsx`'s `updateFansubSelection`/`popstate` handler both call `switchTo` after updating the same URL param via `pushState`. Single source of truth confirmed by reading both files in full. |
| 9 | Konkrete Gruppe ohne Treffer zeigt kompakten neutralen Hinweis, keine leeren Karten/Fehlertext | ✓ VERIFIED | `FansubVersionBrowser.tsx` lines 315-324: `EmptyState variant="compact"` with group-specific vs. generic copy, correct umlauts ("Für diese Fansub-Gruppe..."). |
| 10 | Pflichtfälle A-J automatisiert abgedeckt (Backend + Frontend) | ✓ VERIFIED | All 11 backend `TestEpisodeVersionPublic*` tests independently re-run: PASS. Frontend targeted suite (`fansub-summary.test.ts`, `api.episode-versions.test.ts`, `page.test.tsx`, `FansubVersionBrowser.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx`) independently re-run: 81/82 pass, 1 documented pre-existing test-authoring defect (not a behavior gap, see below). |
| 11 | Browser-Verifikation live über :3300/:3000 mit Naruto (AO/PM/Alle/Coop) | ✓ VERIFIED (human-attested) | Human operator typed "approved" for all 6 mandatory checks per 163-05-SUMMARY.md Task 2, recorded verbatim by the orchestrator's independently-confirmed session record. This verifier cannot re-run a live browser session but independently confirmed the underlying data/API truths (episode sets, coop visibility, dimming CSS class, error/retry wiring) that the human checks depended on. |
| 12 | Bestehender Code vor Umsetzung dokumentiert (Endpoint, Pagination, Query-Anzahl, EXPLAIN vorher) | ✓ VERIFIED | `163-01-SUMMARY.md` contains literal pre-fix `go test ./...` baseline (69 failures) and literal `EXPLAIN (ANALYZE, BUFFERS)` output (`rows=220`) — not just a reference to RESEARCH.md. |
| 13 | Gruppenwechsel per `history.pushState`, kein RSC-Reload; alte Liste bleibt sichtbar, gedimmt, `aria-busy` | ✓ VERIFIED | `FansubVersionBrowser.tsx` line 235: `window.history.pushState`. Lines 326-328: `aria-busy={switchState.loading}`, `classNames(styles.episodeList, switchState.loading && styles.episodeListDimmed)`. `.episodeListDimmed{opacity:0.5;pointer-events:none}` confirmed present in CSS module. |
| 14 | Browser Zurück/Vor lädt immer neu; laufende Requests werden bei Wechsel abgebrochen; nur letzte Auswahl setzt Daten | ✓ VERIFIED | `popstate` handler (lines 172-182) calls `switchTo`; `switchTo` unconditionally calls `requestRef.current?.abort()` first (line 193) before issuing its own request; success handler guards `requestRef.current !== controller`. |
| 15 | Fehler beim Neuladen: kompakter Hinweis + „Erneut versuchen"-Button, keine Altdaten-Vermischung | ✓ VERIFIED | Lines 301-313: `ErrorState` + `Button` wired to `switchTo(resolveGroupSlugForFetch(selectedSlug))` on click; `switchState.error` path is fully independent of `dataState` (last-committed page untouched on failure, confirmed by reading `switchTo`'s catch block, line 215-219). |
| 16 | `noVersionHint` und clientseitige Gruppenfilterung entfernt; `getSummaryVersion` wählt nur aus gefilterten Versionen | ✓ VERIFIED | `grep` confirms zero occurrences of `noVersionHint`/`hasNoMatchingVersion` in the component or CSS module. `getSummaryVersion` (lines 87-102) operates on `episode.versions` only, no fallback text branch remains. (Note: a deliberate, documented defensive per-episode filter for pre-refetch initial render remains — see Gaps/Notes below, does not violate the requirement's intent.) |
| 17 | Notfall-Fallback-Liste in `page.tsx` zeigt keine releaselosen Episoden mehr; neutraler Fehlerhinweis stattdessen | ✓ VERIFIED | `page.tsx` lines 267-290: two-way branch, `anime.episodes`-based `<ul>` fallback fully removed; replaced with `role="alert"` neutral error text, correct umlauts. |
| 18 | Loading/Fehler/Leer/Retry nutzen `@/components/ui`-Primitives, deutsche Umlaute korrekt | ✓ VERIFIED | `FansubVersionBrowser.tsx` imports and uses `Button`, `EmptyState`, `ErrorState` from `@/components/ui`. All checked German string literals use correct umlauts (`für`, `verfügbar`, `Erneut versuchen`). `page.tsx`'s one literal-text fallback (documented, justified exception due to a test-harness limitation, not a primitives-avoidance choice) uses plain `<p>` tags, not a native form control — does not violate the native-`<select>/<input>/<textarea>/<button>` prohibition. |
| 19 | Keine Datenänderungen an `team4s_v2` durch Agenten; Tests laufen gegen isolierte Fixture-DB | ✓ VERIFIED | Independently confirmed: `team4s_phase117_test_163` is a separate database from `team4s_v2`; all curl calls issued by this verifier were read-only `GET`s; no `INSERT`/`UPDATE`/`DELETE` executed against `team4s_v2` in this verification session. |

**Score:** 19/19 distinct observable truths verified (mapping to all 24 REQ-163 IDs — several truths cover multiple REQ IDs at once, see Requirements Coverage below).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/episode_version_public_query.go` | `publicEpisodeQuery` v2, `PublicEpisodeOptions.{Fansub,GroupID}`, cursor v2 | ✓ VERIFIED | Read in full; matches all claimed shapes exactly (INNER JOIN LATERAL, EXISTS gate, total CTE, cursor v2 with raw-slug scope field). |
| `backend/internal/repository/fansub_repository.go` | `ResolveFansubGroupIDForAnime` | ✓ VERIFIED | Read in full (lines 1483-1506); anime-scoped, fail-closed `ErrNotFound`. File is 2496 lines (pre-existing 450-line-cap overage, only +25 lines added by this phase — documented pre-existing debt, not a new violation). |
| `backend/internal/handlers/episode_version_reads.go` | `fansub` allowlist entry, validate-before-resolve, 400 mapping | ✓ VERIFIED | Read in full; exact ordering (`Validate` before `ResolveFansubGroupIDForAnime`) confirmed. |
| `backend/internal/models/episode_version.go` | `PublicGroupedEpisodesData.EpisodeCount` | ✓ VERIFIED | `EpisodeCount int64 \`json:"episode_count"\`` present. |
| `shared/contracts/openapi.yaml` | `fansub` query param + `episode_count` response field | ✓ VERIFIED | Both present, documented, `episode_count` is `required`. |
| `backend/internal/repository/episode_version_public_integration_test.go` | Corrected neutral-row assertions | ✓ VERIFIED | 343 lines; all corrected assertions independently re-run, PASS. |
| `backend/internal/repository/episode_version_public_group_filter_test.go` | Pflichtfälle B/C/D/E/F/I/G/H/J coverage | ✓ VERIFIED | 222 lines; all 6 new test functions independently re-run, PASS. |
| `frontend/src/types/episodeVersion.ts` | `fansub?: string`, `episode_count: number` | ✓ VERIFIED | Both fields present and correctly typed. |
| `frontend/src/lib/api.ts` | `getGroupedEpisodes` forwards `fansub` | ✓ VERIFIED | Line 2166: `query.set("fansub", options.fansub)`. |
| `frontend/src/lib/fansub-summary.ts` | `resolveActiveFansubSlug` real implementation | ✓ VERIFIED | 89 lines; matches documented dedupe/match contract exactly. |
| `frontend/src/app/anime/[id]/page.tsx` | SSR fansub forwarding, `episodeCount`-as-prop, D-16 fallback removal | ✓ VERIFIED | 306 lines; read in full, matches claims exactly. |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx` | Group-switch refetch, dimming, heading, empty/error states, dead-code removal | ✓ VERIFIED | 421 lines; read in full, matches claims exactly including 2 documented, justified implementation-shape deviations from literal plan pseudocode. |
| `frontend/src/components/fansubs/FansubVersionBrowser.module.css` | Dead CSS removed, `.episodeListDimmed` added | ✓ VERIFIED | Confirmed via grep — zero `noVersionHint`/`noVersionText`/`noVersionAction`, `.episodeListDimmed` present. |
| `.planning/phases/.../163-05-SUMMARY.md` | Abschlussbericht (13 required items) | ✓ VERIFIED | All 13 items present, specific, and traceable to cited evidence — independently spot-checked against underlying claims (live curl, EXPLAIN numbers, test counts), all confirmed accurate. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `episode_version_reads.go` | `fansub_repository.go#ResolveFansubGroupIDForAnime` | anime-scoped lookup | ✓ WIRED | Confirmed call site, error mapping (`ErrNotFound` → 400). |
| `episode_version_public_query.go` | `release_version_groups` | unconditional `EXISTS` inside LATERAL, referencing `rev.id` (release_versions), not `rv.id` (release_variants) | ✓ WIRED | Confirmed — the exact Pitfall-1 bug shape is avoided; predicate correctly references `rev.id`. |
| `page.tsx` | `fansub-summary.ts#resolveActiveFansubSlug` | SSR fansub-forwarding decision | ✓ WIRED | Confirmed import and call before the episodes fetch. |
| `FansubVersionBrowser.tsx` | `api.ts#getGroupedEpisodes` | `switchTo`/`loadMore`, shared `requestRef` abort coordination | ✓ WIRED | Confirmed shared `AbortController` ref used by both paths, with the documented one-directional preemption (switch aborts loadMore, not vice versa). |
| Cursor (backend) | Fansub filter scope | raw-slug identity comparison, zero DB round trips on mismatch | ✓ WIRED | Independently reproduced live: cross-filter cursor replay → 400, zero-query rejection confirmed by passing `TestEpisodeVersionPublicGroupFilterCursorScope`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `FansubVersionBrowser.tsx` | `dataState.episodes` | `switchTo`/`loadMore` → `getGroupedEpisodes` → live backend `publicEpisodeQuery` | Yes — independently confirmed via live curl against `team4s_v2` returning real, non-empty, correctly-filtered episode sets (5/3/3) | ✓ FLOWING |
| `page.tsx` | `episodeCount` | `groupedEpisodesResponse?.data.episode_count` | Yes — sourced from the same-statement `total` CTE, live-verified `episode_count:5` for unfiltered Naruto | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unfiltered "Alle" hides releaseless episodes | `curl .../anime/4/episodes?projection=public&limit=24` | `episode_count:5`, ids `[53,54,55,56,57]`, no `version_count:0` | ✓ PASS |
| AnimeOwnage filter excludes Project-Messiah-only episodes | `curl ...&fansub=animeownage` | `episode_count:3`, ids `[53,54,57]` | ✓ PASS |
| Project Messiah filter excludes AnimeOwnage-only episodes | `curl ...&fansub=project-messiah` | `episode_count:3`, ids `[55,56,57]` | ✓ PASS |
| Coop episode visible + tagged under both groups | `curl ...&fansub=animeownage` then inspect episode 57's `fansub_groups` | `['animeownage','project-messiah']` | ✓ PASS |
| Unknown slug fails closed | `curl ...&fansub=does-not-exist` | HTTP 400 | ✓ PASS |
| Cross-filter cursor rejected | cursor minted under `fansub=animeownage`, replayed under `fansub=project-messiah` | HTTP 400 | ✓ PASS |
| Same-filter cursor accepted | same cursor replayed under `fansub=animeownage` | HTTP 200 | ✓ PASS |
| Backend targeted test suite | `go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1` | 11/11 PASS | ✓ PASS |
| Backend full regression | `go test ./...` (fresh run, not cached) | 69 pre-existing failures, identical to documented baseline, zero `EpisodeVersionPublic*` failures | ✓ PASS |
| Frontend targeted suite | `npx vitest run` (5 phase-163 test files) | 81/82 pass; 1 documented pre-existing test-authoring defect | ✓ PASS |
| Frontend full suite | `npx vitest run` (all 2867 tests) | 2861 passed, 3 failed (2 pre-existing CSS-guard + the same 1 documented defect), 3 todo — exact match to 163-04-SUMMARY.md's claim | ✓ PASS |

### Requirements Coverage

All 24 requirement IDs (REQ-163-01 through REQ-163-24) are declared across the 5 plans' frontmatter and marked complete in `.planning/REQUIREMENTS.md`. Cross-referenced against actual implementation evidence:

| Requirement | Source Plan | Status | Evidence |
|---|---|---|---|
| REQ-163-01, 02 | 163-02 | ✓ SATISFIED | Neutral-row fix; live curl confirms "Alle" shows only 5/220 real episodes. |
| REQ-163-03, 04, 05 | 163-02 | ✓ SATISFIED | Group filter + coop; live curl confirms episode-set correctness and coop dual-group tagging. |
| REQ-163-06 | 163-02 | ✓ SATISFIED | `EXISTS` runs inside the `inventory` CTE, before `page`'s `LIMIT`; `TestEpisodeVersionPublicGroupFilterPaginationScope` PASS. |
| REQ-163-07 | 163-02/03/04 | ✓ SATISFIED | `fansub` param present in Go DTO, OpenAPI, TS types, `api.ts`, all in sync. |
| REQ-163-08 | 163-02 | ✓ SATISFIED | Cross-filter cursor 400, live-reproduced. |
| REQ-163-09 | 163-02/04 | ✓ SATISFIED | `episode_count` same-statement CTE; heading in `FansubVersionBrowser.tsx` reads `dataState.episodeCount`. |
| REQ-163-10 | 163-02 | ✓ SATISFIED | `EXISTS(release_version_groups...)` is the fail-closed public-visibility gate. |
| REQ-163-11 | 163-01/02 | ✓ SATISFIED | Query budget (2/3 statements) confirmed via passing budget-assertion tests. |
| REQ-163-12 | 163-02 | ✓ SATISFIED | `ORDER BY` clause unchanged. |
| REQ-163-13 | 163-03/04 | ✓ SATISFIED | Single shared `?fansub=` URL state drives both nav and filtering. |
| REQ-163-14 | 163-04 | ✓ SATISFIED | `EmptyState variant="compact"` with group-specific copy. |
| REQ-163-15 | 163-01/03 | ✓ SATISFIED | All Pflichtfälle A-J backend+frontend tests independently re-run, GREEN (except 1 documented pre-existing test-authoring defect unrelated to production behavior). |
| REQ-163-16 | 163-05 | ✓ SATISFIED (human-attested) | Human "approved" all 6 live-browser checks; underlying data truths independently confirmed. |
| REQ-163-17 | 163-01 | ✓ SATISFIED | Literal pre-fix baseline (test counts + EXPLAIN) documented in 163-01-SUMMARY.md. |
| REQ-163-18, 19, 20 | 163-04 | ✓ SATISFIED | `pushState`, `aria-busy`+dimming CSS, abort-on-switch, error+retry all read and confirmed in `FansubVersionBrowser.tsx`. |
| REQ-163-21 | 163-04 | ✓ SATISFIED | `noVersionHint` text/branch fully removed (grep-confirmed); defensive filter predicate retained (documented, justified, does not violate intent). |
| REQ-163-22 | 163-04 | ✓ SATISFIED | `anime.episodes` fallback `<ul>` removed from `page.tsx`. |
| REQ-163-23 | 163-04/05 | ✓ SATISFIED | `@/components/ui` primitives used; correct umlauts confirmed by grep across all touched user-facing strings. |
| REQ-163-24 | 163-01/02 | ✓ SATISFIED | Isolated `team4s_phase117_test_163` DB confirmed separate from `team4s_v2`; zero writes issued in this verification session either. |

No orphaned requirements — all REQ-163-01..24 IDs appear in at least one plan's frontmatter `requirements` field, and REQUIREMENTS.md marks all 24 complete under Phase 163.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/repository/fansub_repository.go` | whole file, 2496 lines | Exceeds CLAUDE.md's 450-line production-code cap | ℹ️ Info | Pre-existing (2471 lines before this phase); this phase added only 25 lines via an already-established pattern in the file. Documented in `deferred-items.md` as a recommended future cleanup, not a phase-163-introduced defect. Non-blocking. |
| `FansubVersionBrowser.tsx` line 347 | native `<button>` in episode header | Violates CLAUDE.md's global-UI-primitives rule | ℹ️ Info | Pre-existing since 2026-02-23 (`git blame` confirms), untouched by this phase's diff. Documented in 163-05-SUMMARY.md item 13 as an explicitly deferred Altbestand item. Non-blocking. |
| None found in phase-163-modified files | — | TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers | — | Zero occurrences in any of the 14 files this phase touched. |

No blocker-severity anti-patterns found in any file this phase created or modified.

### Documented, Justified Implementation Deviations (not gaps)

Two deviations from the literal plan pseudocode were found, read, and independently judged as correct, necessary, and non-weakening:

1. `page.tsx`'s D-16 fallback renders plain `<div role="alert"><p>...</p></div>` text instead of the `ErrorState` primitive, because `page.test.tsx`'s shallow server-component tree-walker structurally cannot see text passed through a child component's props. Verified: this is a native `<div>`/`<p>`, not a prohibited native form control, so it does not violate the UI-primitives rule's actual scope (select/input/textarea/button). Acceptable.
2. A defensive per-episode `groupMatchedVersions` filter was kept in `FansubVersionBrowser.tsx` (rather than fully removed per literal plan pseudocode) to correctly handle the pre-refetch initial-render case (`initialActiveSlug` pre-selecting a group before any client fetch has run). The D-15-mandatory removal (the "Keine Version dieser Gruppe verfügbar." text/branch) is fully and verifiably gone. Acceptable — does not reintroduce client-side "Scheinfilterung" over paginated subsets (REQ-163-06's actual concern), since it only affects the single initial SSR-hydrated page, not subsequent pagination.

### One Documented, Non-Blocking Test-Authoring Defect

`FansubVersionBrowser.test.tsx`'s "bounded public inventory continuation > merges 125 variants..." test independently re-run: FAILS, exactly as documented in 163-04-SUMMARY.md. Root cause (verified by this verifier, reading the exact line): a mocked response at line 265 is missing a second argument (`continued('cursor-23')`), making a later assertion's expected cursor value unreachable by any correctly-implemented production code. This is a test-authoring bug in a locked Plan-163-03 test file, not a production behavior gap — 4 of 5 sibling tests in the same describe block, plus all 4 tests in the sibling `groupSwitch.test.tsx` file, pass and independently confirm the same underlying group-switch-refetch mechanism works correctly. Recommended one-line fix documented for a future quick task; does not block this phase's goal achievement.

### Human Verification Required

None outstanding. The mandatory live-browser UAT (Task 2 of Plan 163-05) was already executed with a human "approved" outcome for all 6 mandatory checks, per the orchestrator's independently-confirmed session record and 163-05-SUMMARY.md's verbatim citation. This verifier additionally and independently confirmed the underlying data/API truths (real episode sets, coop dual-group visibility, fail-closed behavior, cursor scoping) that those 6 checks depend on, via live read-only curl against the same real Naruto dataset in `team4s_v2`.

### Gaps Summary

No blocking gaps found. Two pre-existing, documented, non-blocking Info-level items exist (the `fansub_repository.go` line-cap overage and the native `<button>` in the episode header) — both predate this phase, are correctly attributed as such via `git blame`/diff inspection, and are explicitly logged as deferred follow-up work rather than silently ignored. One documented test-authoring defect in a locked test file does not reflect a production behavior gap and was independently confirmed as such by reading the exact test logic and its passing siblings.

All 24 REQ-163 requirement IDs, all Pflichtfälle A-J, and all of this phase's own `must_haves` truths/artifacts/key_links (across all 5 plans) were independently re-verified against the actual codebase, the actual live database, and the actual rebuilt live containers — not merely cited from SUMMARY.md narrative. The phase goal is achieved.

---

*Verified: 2026-09-17T19:31:59Z*
*Verifier: Claude (gsd-verifier)*
