---
phase: 159-public-anime-detail-konsolidierung
plan: "03"
subsystem: ui
tags: [fansubs, hydration, storage, pagination, streams, navigation]
requires:
  - phase: 159-01
    provides: Bounded public episode cursor and explicit canonical identities
  - phase: 159-02
    provides: Exact stream variant selector through canonical version relay
provides:
  - One SSR-deterministic fansub selection owner with controlled story and guarded persistence
  - Explicit public continuation with canonical episode merges and exact Play identities
  - Awaitable interaction-only grid neighbors carrying their actual target page
affects: [159-04, 159-05]
tech-stack:
  added: []
  patterns: [controlled leaf, route-keyed cancellation, existing public cursor, shared in-flight promise]
key-files:
  created:
    - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
    - frontend/src/lib/api.anime-list.test.ts
    - frontend/src/lib/animeGridContext.test.ts
  modified:
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/components/fansubs/ActiveFansubStory.tsx
    - frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/lib/api.ts
key-decisions:
  - Keep selection and cursor inventory in the existing browser; story is a controlled leaf without polling.
  - Read storage only after deterministic hydration; persist explicit selections only and apply own-key events without writeback.
  - Preserve neutral episode totals and merge public pages by episode_id, variants only within that episode by variant_id.
  - Reset route-local work by React identity and abort pending requests; navigation awaits the shared result carrying the target page.
requirements-completed: []
requirements-addressed: [P159-01, P159-02, P159-05, P159-06, P159-07]
duration: 13min
completed: 2026-09-13
---

# Phase 159 Plan 03: Shared fansub state, public paging and reliable grid navigation

**The public detail page now shares one group selection, continues bounded episode pages explicitly, and navigates with the awaited neighbor's actual grid page.**

## Scope and commits

Three tasks complete. Start: `645afa19765f1312920a40bcdc79475a9978636f`; final product/test HEAD: `7d630640`. Whole-phase baseline remains `c3bfcb23781addca1ccd3931592535416f706787`. Root's intervening `b573fe78` changes only its independent review.

| Task | RED | GREEN |
|---|---|---|
| 1 — group owner and guarded hydration/storage | `4a5a3dab` | `02056ac4` |
| 2 — bounded public pages and canonical Play IDs | `1a8743f7` | `eaa37933` |
| 3 — awaited neighbor result, page and cancellation | `24e8836a` | `78f44412` |

Supplemental regression `7d630640` proves identical variant numbers remain separate across different canonical episodes. Every task has an observed failing behavior test run before implementation; saved logs preserve the RED/GREEN history.

## Behavior and reuse

FansubVersionBrowser owns selection, renders ActiveFansubStory immediately before the existing section, and retains existing filter, route and episode controls. Initial HTML and hydration use the primary or first valid group. A cancellable post-mount read accepts only positive safe current IDs; storage accessor, reads, parsing and writes are guarded. Explicit clicks alone persist. Own-key events use their latest value without writeback; invalid values, removal and clear fall back, foreign keys are ignored. Anime identity cancels old callbacks; changed group props are validated. The story has no state, storage listener or interval.

The SSR page opts into exactly one `projection: 'public', limit: 24` request, passes pagination and existing story summaries, and retains the neutral detail fallback on error. The section total uses `anime.episodes.length`, not the loaded slice. Existing Button and getGroupedEpisodes provide explicit continuation, scoped errors/retry and AbortSignal. Merges, React keys and expansion use episode_id; variants deduplicate only inside that episode by variant_id. Server version_count is preserved and partial group emptiness names the loaded slice. Play uses `/api/releases/{release_version_id}/stream?variant_id={variant_id}`. Pretty and numeric project links remain covered.

Grid loading starts only from actual hover, focus, touch or click. A shared promise serves those interactions and returns targets shaped as {anime, page}; the first slow click uses that result. Pending hover does not disable clicking, and the first delayed hover/focus shows its preview. Existing query builders retain filters with the target page. Route identity plus AbortController prevents old successes, errors or continuations from changing the new context. Missing current IDs yield no guessed target; failed requests remain retryable. The only API helper change is an additive AbortSignal forwarded through the existing public fetch/admin authorizedFetch transport.

No new dependency, endpoint, DTO, auth owner, global registry or media implementation was introduced. The other four grouped-episode consumers remain on the unchanged full contract.

## Verification

The authoritative [verification manifest](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-03/verification.json) records exact commands, exit codes and product hashes. [Evidence notes](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-03/README.md) link the saved logs.

- Final relevant suite: **78/78 tests in 7 files**, exit 0, including existing full/public grouped API contract tests.
- Full frontend typecheck: **0 errors**. Scoped lint across all 11 changed source/test files: **0 errors, 0 warnings**. Diffcheck: exit 0.
- Storage matrix includes StrictMode renderToString/hydrateRoot with no recoverable/console hydration errors, retained second group, synchronized story/filter/variants, blocked access/read/write, malformed/removed/unsafe IDs, clear, foreign keys and changed props/anime.
- Paging fixture completes 125 variants in six explicitly loaded slices, keeps backend counts and equal-number neutral episodes, preserves expansion, and proves deduplication scope. Groups trigger zero inventory requests; failed cursor retry, repeated pending clicks, anime changes and late success/error are covered.
- Navigation uses three grid pages in both directions, all filters, first slow click/hover/focus, hover-click overlap, shared requests, outer boundaries, missing current ID, retry, query-only changes, unmount and late success/error. Mount triggers zero list requests.
- Root also observed the existing shared live flow and a real `/api/releases/27/stream?variant_id=27` href without starting playback. Its [live observation](../../../docs/audits/2026-09-13-public-anime-detail/phase159/root-live-ui-15903.json) is preliminary supporting evidence, not the 159-05 matrix.

The measured request assertions are one initial public page, explicit follow-up requests, and zero group/mount navigation requests. No fresh SQL or total payload measurement was performed in this UI plan; 159-01's SQL proof is not relabeled as new evidence.

## Adjustments and limits

The small page-to-story/browser wiring change moved from Task 2 into Task 1 so the controlled Story contract had no obsolete caller between commits. No scope expansion resulted. TypeScript test mocks were explicitly typed to the public overload, and an asynchronous mount-read test was awaited; the initial Task-1 GREEN log retains its transient test act warning, while the final suite has no warnings.

T-159-06/07/08 are addressed by validated guarded storage, route-scoped cancellation, server counts and explicit identity pairs. No goal-blocking stub, unexpected threat surface, tracked deletion or live data mutation was introduced.

Full frontend tests/global lint, isolated production build, browser matrix and fresh request/SQL comparison belong to 159-05. Existing whole-phase baseline CSS guard failures, global lint findings and the unrelated admin-page production export failure were not repaired or retested here. The neutral AnimeDetail episode source remains unbounded; this plan bounds the public variant projection. Plan 159-04 media work remains untouched.

P159 requirements are addressed at this plan boundary, not globally completed before 159-05. Human UAT 156/157/158 remains OPEN. Root owns global tracking and its live/review evidence; unrelated shot2.mjs was not staged.

## Self-Check: PASSED

All 11 changed source/test paths and seven owned task commits exist. The final manifest reports four exit-0 checks; source hashes identify the tested snapshot. No tracked files were deleted. Summary and owned evidence are committed separately from product work.
