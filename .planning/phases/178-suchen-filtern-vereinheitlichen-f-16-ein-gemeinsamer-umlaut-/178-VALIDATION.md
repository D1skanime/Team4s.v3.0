---
phase: 178
slug: suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-10
---

# Phase 178 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (frontend); Go `testing` + `testify` (backend, only for the D-18 contract change) |
| **Config file** | `frontend/vitest.config.ts` (`include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`, `globals: true`) |
| **Quick run command** | `cd frontend && npx vitest run src/lib/textFilter.test.ts` |
| **Full suite command** | `cd frontend && npm test` (= `vitest run`); backend: `cd backend && go test ./internal/repository/... ./internal/handlers/...` |
| **Estimated runtime** | ~30s (frontend full suite), ~15s (backend package tests) |

---

## Sampling Rate

- **After every task commit:** Run the quick vitest command for the changed file's test
- **After every plan wave:** Run `npm test` (frontend full suite) + relevant backend package tests if the wave touches `fansub_repository_groups.go`/`fansub_groups.go`
- **Before `/gsd:verify-work`:** Full suite must be green, plus D-11's mandatory live-UAT browser pass over the tunnel address for the 6 filter UIs (automated tests cannot substitute for this per the project's explicit D-11 rule)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 178-01-01 | 178-01 | 1 | D-15 | T-178-02 | `normalizeSearchText`/`matchesSearch` replicate `f_unaccent` behavior (ä→a, ö→o, ü→u, ß unchanged, no digraph expansion) | unit | `cd frontend && npx vitest run src/lib/textFilter.test.ts` | plan defined (file created at execution) | ⬜ pending |
| 178-02-01 | 178-02 | 1 | D-18 | T-178-04 (V4 Access Control) | `FansubGroup` contract gains `aliases: string[]` via bulk `attachGroupAliases`, without exposing a new data class (same strings already fetchable per-group today) | unit (backend, live Postgres) | `cd backend && go test ./internal/repository/... -run TestPhase178FansubGroupAliases -v` | plan defined (file created at execution) | ⬜ pending |
| 178-03-01 | 178-03 | 2 | D-18 | T-178-06 | Kürzel/Alias matches surface in #1 (`AdminGroupsClient.tsx`) via `filterAdminGroups` | unit | `cd frontend && npx vitest run src/app/admin/groups/adminGroupsFilter.test.ts` | plan defined (file created at execution) | ⬜ pending |
| 178-04-01 | 178-04 | 2 | D-18 | T-178-08 | Kürzel/Alias matches surface in #2 (`admin/fansubs/page.tsx`) via `filterFansubPageItems`, lazy per-page alias fetch removed | unit | `cd frontend && npx vitest run src/app/admin/fansubs/fansubPageFilter.test.ts` | plan defined (file created at execution) | ⬜ pending |
| 178-05-01 | 178-05 | 2 | D-18 / D-04 | T-178-10 | Kürzel/Alias matches surface in #3 (`merge/page.tsx`) via `filterMergeCandidates`; existing exact/prefix/substring name-slug relevance tiers numerically unchanged in `scoreMergeRelevance` | unit | `cd frontend && npx vitest run src/app/admin/fansubs/merge/fansubMergeScoring.test.ts` | plan defined (file created at execution) | ⬜ pending |
| 178-06-01 | 178-06 | 2 | D-19 | T-178-12 | Shared Genre/Tag autocomplete hook (`useGenreTagAutocomplete`) produces identical suggestions/totals for both Edit and Create flows | unit | `cd frontend && npx vitest run src/app/admin/anime/hooks/useGenreTagAutocomplete.test.ts` | plan defined (file created at execution) | ⬜ pending |
| 178-04-02 / 178-05-02 / 178-06-03 | 178-04 / 178-05 / 178-06 | 2 | D-07/D-02 | — | Native `<input>` sites (#2, #3, #5/#6 genre+tag inputs) replaced with `Input` primitive | manual/UAT (D-11), proxied by typecheck | `cd frontend && npx tsc --noEmit -p tsconfig.json` (automated proxy); live-UAT confirmation in 178-07 Task 2 | plan defined (component edits at execution) | ⬜ pending |

*Task IDs reflect the real `{phase}-{plan}-{task}` identifiers from the 7 PLAN.md files now that
planning is complete. "Status" tracks execution, not planning — all rows remain pending until
`/gsd:execute-phase 178` runs the corresponding tasks.*

---

## Wave 0 Requirements

- [x] `frontend/src/lib/textFilter.ts` + `textFilter.test.ts` — new shared normalization/match helper (D-15) and its direct-function tests (D-10) — satisfied by 178-01 Task 1
- [x] Extract `merge/page.tsx`'s inline `relevanceScore` closure (currently inside a `useMemo`) to a named, exported, independently-testable function (D-04/D-10) — satisfied by 178-05 Task 1 (`scoreMergeRelevance`)
- [x] Extract each of #1/#2/#3's inline `.filter()` closures to named, exported, independently-testable predicate functions (same D-10 reasoning) — satisfied by 178-03 Task 1 (`filterAdminGroups`), 178-04 Task 1 (`filterFansubPageItems`), 178-05 Task 1 (`filterMergeCandidates`)
- [x] Shared Genre/Tag autocomplete hook + its test file (D-19) — satisfied by 178-06 Task 1 (`useGenreTagAutocomplete`)
- [x] Backend test(s) for the `FansubGroup.aliases` contract addition (D-18) — satisfied by 178-02 Task 1 (live-Postgres `TestPhase178FansubGroupAliases_*` tests against the real repository, not a source-grep)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `Input` primitive swap renders/behaves identically to the native inputs it replaces across all 6 sites | D-07/D-02 | Visual/DOM primitive swap — rendering correctness is not meaningfully assertable beyond "renders", true regression surface is visual | D-11 live-UAT: open each of the 6 admin filter UIs over the tunnel address, type a search term with umlauts and with Kürzel/Alias text, confirm results and absence of layout regressions |
| "Abrufgrenze erreicht" hint banner (D-16) appears when `per_page:500` limit is hit on filter #3 (merge page) | D-16 | Requires a dataset large enough to trigger truncation or a mocked response shape — visual banner correctness best confirmed by eye | D-11 live-UAT: verify banner text uses real umlauts and appears/disappears correctly; simulate via dev tools response override if live data doesn't reach 500 records |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-10-10
