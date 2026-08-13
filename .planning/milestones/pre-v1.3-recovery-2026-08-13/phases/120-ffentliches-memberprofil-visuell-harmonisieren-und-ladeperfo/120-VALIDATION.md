---
phase: 120
slug: ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-04
revised: 2026-08-04
---

# Phase 120 — Validation Strategy

> Execution-ready validation contract. `wave_0_complete` stays false until the named expected-red tests have been created and their intended failures recorded; this document does not claim they already ran.

## Test Infrastructure

| Property | Value |
|---|---|
| **Framework** | Vitest 3.2.4 + Testing Library 16.3.0; deterministic Node image probe; pinned Playwright 1.55.0 + bundled Chromium collector in the frontend image; live in-app-browser UAT |
| **Config file** | `frontend/vitest.config.ts` |
| **Focused command** | `docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberProfileHero.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| **Full suite** | `docker compose exec -T team4sv30-frontend npm test -- --run` |
| **Image gate** | `docker compose -f docker-compose.yml run --rm --no-deps -T -e NODE_ENV=production -e PHASE120_IMAGE_PROBE=1 -e API_INTERNAL_URL=http://127.0.0.1:3101 -v "$PWD/frontend/test/fixtures/phase120-image-probe/avatar.png:/media/profile/phase120/avatar.png:ro" -v "$PWD/frontend/test/fixtures/phase120-image-probe/hero.png:/media/profile/phase120/hero.png:ro" team4sv30-frontend node scripts/run-profile-image-probe.mjs --next-port 3100 --fixture-port 3101 --verifier scripts/verify-profile-image-delivery.mjs --require-url-classes static-badge,profile-avatar,profile-hero,api-project,api-group --require-widths 128,160,512,640 --require-alpha --require-cache-hit --require-original-fallback` |
| **Trace collector** | `PHASE120_GIT_HEAD=$(git rev-parse HEAD); docker compose exec -T -e PHASE120_GIT_HEAD="$PHASE120_GIT_HEAD" -e PHASE120_BACKGROUND_SLUG="$PHASE120_BACKGROUND_SLUG" -e PHASE120_NO_BACKGROUND_SLUG="$PHASE120_NO_BACKGROUND_SLUG" team4sv30-frontend node scripts/collect-member-profile-evidence.mjs --base-url http://127.0.0.1:3000 --background-slug "$PHASE120_BACKGROUND_SLUG" --no-background-slug "$PHASE120_NO_BACKGROUND_SLUG" --viewports 390x844,768x1024,1440x900 --network slow-4g --cpu-throttle 4 --output /tmp/phase120-trace.json` |
| **Trace validator** | `docker compose exec -T -e PHASE120_GIT_HEAD="$PHASE120_GIT_HEAD" team4sv30-frontend node scripts/validate-member-profile-evidence.mjs --input /tmp/phase120-trace.json --collector scripts/collect-member-profile-evidence.mjs --git-head "$PHASE120_GIT_HEAD" --viewports 390x844,768x1024,1440x900 --require-states background-present,background-absent --require-js-off --require-zero-cls --require-source-original-absent` |

## Sampling Rate

- Before any overlap: Plan 01 captures HEAD/status/binary diff and requires focused Phase-119 suites green plus explicit user/owner acceptance or exact-snapshot authorization.
- Plan 02 corrects or proves stale every exact 119-05 failure, then requires full frontend/backend tests plus clean isolated Compose typecheck/build green before Wave 3.
- Before adding each Wave-0 test: run that file's pre-existing cases green using the `^(?!Phase 120 RED:)` name filter.
- Before every Phase-119 overlap edit: `begin` recomputes actual bytes against the exact predecessor manifest; after scoped tests `finish` emits a unique immutable evidence manifest. The final audit checks all initial paths with explicit latest overrides.
- After each task commit: run the task's focused suite and `git diff --check`.
- After each wave: run all suites touched by that wave, typecheck, lint where feasible and `git diff --check`.
- Final Plan 13 independently runs focused/full frontend and backend tests, isolated typecheck/build, lint, deterministic image probe and Git-identity-bound trace validation; every status is recorded even when another fails.

## Exact Wave-0 Expected-Red Contract

An arbitrary non-zero test exit is never evidence. Each Wave-0 task first proves the inherited suite green, then captures a non-zero run that contains every exact new test name and the expected assertion fragment.

| Plan/Task | Files | Exact new test names | Expected failure evidence |
|---|---|---|---|
| 120-03 T1 | `frontend/src/app/members/[slug]/page.test.tsx` | `Phase 120 RED: deduplicates metadata and page reads for the same slug and viewer token`; `Phase 120 RED: isolates anonymous and owner-preview cache keys` | named output plus `getMemberProfile` expected 1 call/currently 2 or `AssertionError` |
| 120-03 T2 | `MemberProfileHero.test.tsx`, new `ResponsiveImage.test.tsx` | `Phase 120 RED: prioritizes both hero background and avatar with differentiated discovery`; `Phase 120 RED: falls back exactly once to display original without geometry change` | named output plus `fetchpriority`, `loading`, `unoptimized` or corresponding assertion |
| 120-04 T1 | `FocalCarousel.test.tsx`, `MemberBadgeChain.test.tsx` | `Phase 120 RED: keeps SSR carousel content while expensive listeners remain dormant`; `Phase 120 RED: activates once at 600px and immediately without IntersectionObserver` | named output plus `600px 0px`, listener or observer assertion |
| 120-04 T2 | project/latest/previous section tests | `Phase 120 RED: reserves project geometry while SSR cards remain readable`; `Phase 120 RED: keeps latest contributions accessible beneath an aria-hidden shell`; `Phase 120 RED: keeps previous contributions accessible beneath an aria-hidden shell` | all three names plus `aria-hidden`, `aspect-ratio`, `sizes` or corresponding assertion |

## Per-Task Verification Map

| Task ID | Plan | Wave | Decisions | Files / evidence | Automated gate | Status |
|---|---:|---:|---|---|---|---|
| 120-PREFLIGHT | 01 | 1 | D-14 | baseline/auth JSON, chain helper/tests, initial per-file manifest | HEAD/status/diff/baseline SHA-256, explicit owner checkpoint and fail-closed chain tests | ⬜ pending |
| 120-BASELINE | 02 | 2 | D-14 | exact frontend/backend test corrections and summary | 119-05 disposition matrix; full suites; isolated typecheck/build; lint | ⬜ pending |
| 120-W0-SSR | 03 T1 | 3 | D-15,D-18 | route test | baseline-green then exact named expected-red run | ⬜ pending |
| 120-W0-HERO | 03 T2 | 3 | D-01–D-05,D-19–D-22 | Hero/ResponsiveImage tests | baseline-green then exact named expected-red run | ⬜ pending |
| 120-W0-CAROUSEL | 04 T1 | 3 | D-10–D-18 | FocalCarousel/BadgeChain tests plus immutable overlap manifest | predecessor-byte begin, named expected-red, finish manifest | ⬜ pending |
| 120-W0-SECTIONS | 04 T2 | 3 | D-06–D-09,D-15–D-19 | project/contribution tests plus immutable overlap manifest | predecessor-byte begin, named expected-red, finish manifest | ⬜ pending |
| 120-IMG-GATE | 05 T2 | 4 | D-19–D-22 | fixture files, runner, verifier | isolated ports 3100/3101; five classes; RIFF/WEBP; dimensions; alpha; cache; fallback; cleanup | ⬜ pending |
| 120-CAROUSEL | 06 | 4 | D-15–D-18 | hook/carousel tests plus chain manifest | hook + FocalCarousel + FansubProjectsGrid + latest predecessor evidence | ⬜ pending |
| 120-HERO | 07 | 5 | D-01–D-05,D-17,D-19,D-22 | Hero tests | Hero suite + isolated typecheck | ⬜ pending |
| 120-HEADINGS | 08 | 6 | D-06–D-09 | SectionHeader/story/membership tests | focused suites + isolated typecheck | ⬜ pending |
| 120-PROJECTS | 09 | 5 | D-06–D-09,D-15–D-17,D-19,D-22 | project test | focused suite + isolated typecheck + seam scan | ⬜ pending |
| 120-CONTRIB | 10 | 5 | D-06–D-09,D-15–D-19,D-22 | latest/previous tests plus chain manifest | both suites + latest predecessor evidence + isolated typecheck | ⬜ pending |
| 120-LAYOUT | 11 | 7 | D-04,D-06–D-10,D-15–D-18 | route/CSS tests | route suite + isolated typecheck + overflow grep | ⬜ pending |
| 120-BADGES | 12 | 5 | D-07,D-10–D-21 | BadgeChain/carousel/image tests plus two chain manifests | badge + carousel + image runner + latest predecessor evidence | ⬜ pending |
| 120-FINAL-AUTO | 13 T1 | 8 | D-01–D-22 | trace JSON/summary | all latest overlap hashes + focused/full + isolated typecheck/build + lint + image + HEAD-bound trace | ⬜ pending |
| 120-FINAL-UAT | 13 T2 | 8 | D-01–D-22 | shared in-app-browser approval | final chain audit + focused smoke before blocking checkpoint | ⬜ pending |

## Blocking Image Suitability Evidence

Plan 05 is a prerequisite for every actual image migration (Plans 07, 08, 09, 10 and 12, directly or transitively). Its deterministic fixture/server setup uses built Next on port 3100 and a fixture origin on port 3101, with no live database/backend/media dependency:

- local static badge;
- relative `/media/profile/**` avatar and hero;
- normalized same-origin `/api/v1/media/**` project cover and group logo.

The gate proves actual response body signatures (`RIFF` at bytes 0–3 and `WEBP` at bytes 8–11), `image/webp`, parsed dimensions at 128/160/512/640, transparent PNG alpha/edges, representative additional domain widths, byte-identical repeated requests with a cache-hit/age signal, and exactly one geometry-stable display-original fallback. Any missing assertion stops execution for replanning; it does not authorize a backend encoder.

## Final Trace / Artifact Contract

`frontend/scripts/collect-member-profile-evidence.mjs` is invoked by the exact command above against actual `/members/{slug}` states and writes `120-13-TRACE.json`. Host `git rev-parse HEAD` is required and passed to both container commands; `/app/.git` is never assumed. The artifact binds that HEAD into its evidence digest and includes schema version, UUID run ID, UTC timestamps, exact argv, collector SHA-256, Playwright/Chromium versions, 390×844/768×1024/1440×900 background-present and background-absent profiles, recorded Slow-4G/4×CPU settings, raw CDP/PerformanceObserver event counts, image waterfall/LCP, layout-shift entries/sources, activation boundary/count, cache evidence, forced fallback and JavaScript-disabled SSR serialization. The validator rejects absent/different expected HEAD before all other completeness checks.

- any Phase-120 layout shift;
- lazy avatar or background, or a missing D-19 priority record for either image;
- missing 128/160/512/640 WebP evidence or required URL class;
- missing repeated-request cache evidence;
- fallback count other than one, a fallback to `source_original_url`, or changed geometry;
- absent JS-off rank/current/next/rest content;
- `source_original_url` anywhere in rendered HTML, DOM, request URL or response body.

## Manual-Only Verifications

| Behavior | Decisions | Why manual | Instructions |
|---|---|---|---|
| Bright/dark and left/right-salient member crops remain visible/readable | D-01–D-05 | visual contrast/crop quality | Shared in-app browser at 390/768/1440 plus 320px/200% zoom. |
| No perceptible jank while deep sections activate | D-16–D-19 | perceived motion complements trace | Slow network/CPU, scroll every section, reduced motion and no-observer fallback. |
| Hero B/Rhythm C and Phase-119 collection semantics match locked artifacts | D-06–D-14 | visual/product fidelity | Compare with Sketch 004 and inherited Phase-118/119 contracts; no self-approval. |

## Validation Sign-Off

- [x] Every implementation task has an executable `<automated>` gate.
- [x] Wave-0 verifies inherited suites green before exact named expected-red assertions.
- [x] Plan 02 makes every known 119-05 gate green before feature work.
- [x] Plans 01/04/06/10/12 implement immutable per-file overlap chaining and Plan 13 audits all latest hashes.
- [x] Plan 05 is a blocking, isolated deterministic image-suitability gate.
- [x] Plan 13 explicitly runs focused/full tests, isolated typecheck/build, lint, image probe, leak scan and HEAD-bound trace validator.
- [x] No watch-mode test command is used.
- [ ] Plan 01 owner/accepted-snapshot checkpoint passed.
- [ ] Wave-0 expected-red evidence captured (`wave_0_complete: true` only then).
- [ ] All final automated gates green.
- [ ] Shared in-app-browser UAT explicitly approved.

**Approval:** pending execution
