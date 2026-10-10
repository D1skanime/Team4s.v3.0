---
phase: 178
slug: suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `cd frontend && npx vitest run src/lib/textFilter.test.ts` (adjust path to actual new file name) |
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
| 178-WW-TT | TBD | 0 | D-15 | — | `normalizeSearchText`/`matchesSearch` replicate `f_unaccent` behavior (ä→a, ö→o, ü→u, ß unchanged, no digraph expansion) | unit | `vitest run src/lib/textFilter.test.ts` | ❌ W0 — new file | ⬜ pending |
| 178-WW-TT | TBD | 1+ | D-04 | — | Merge-page scoring unaffected by filter-helper swap for name/slug matches; scoring function extracted to a named, testable export | unit | `vitest run src/app/admin/fansubs/merge/*.test.ts` | ❌ W0 — scoring currently inline, untested | ⬜ pending |
| 178-WW-TT | TBD | 1+ | D-18 | — | Kürzel/Alias matches surface in #1 (`AdminGroupsClient.tsx`)/#2 (`admin/fansubs/page.tsx`)/#3 (`merge/page.tsx`) filtered results | unit | `vitest run` on the file hosting each site's extracted filter-predicate function | ❌ W0 — filter logic currently inline per site | ⬜ pending |
| 178-WW-TT | TBD | 1+ | D-18 | V4 Access Control | `FansubGroup` contract gains `aliases: string[]` without exposing a new data class (same strings already fetchable per-group today) | unit (backend) | `go test ./internal/repository/... -run TestListGroups` (or equivalent) | ❌ W0 — new field, no round-trip test yet | ⬜ pending |
| 178-WW-TT | TBD | 1+ | D-19 | — | Shared Genre/Tag autocomplete hook produces identical suggestions/totals for both Edit and Create flows | unit | `vitest run` on the new shared hook's test file | ❌ W0 — new file | ⬜ pending |
| 178-WW-TT | TBD | 1+ | D-07/D-02 | — | Native `<input>` sites (#2, #3, #5/#6 genre+tag inputs) replaced with `Input` primitive | manual/UAT (D-11) | N/A — visual/DOM primitive swap, not independently unit-testable beyond "renders" | N/A | ⬜ pending |

*Task IDs are placeholders — the planner assigns real `{phase}-{plan}-{task}` IDs; update this table (or let `/gsd:plan-phase`'s downstream tooling reconcile it) once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] `frontend/src/lib/textFilter.ts` + `textFilter.test.ts` — new shared normalization/match helper (D-15) and its direct-function tests (D-10)
- [ ] Extract `merge/page.tsx`'s inline `relevanceScore` closure (currently inside a `useMemo`) to a named, exported, independently-testable function (D-04/D-10 — required before it can be unit-tested)
- [ ] Extract each of #1/#2/#3's inline `.filter()` closures to named, exported, independently-testable predicate functions (same D-10 reasoning: "Tests prüfen die Logik hinter dem Button" requires a callable function, not an inline closure)
- [ ] Shared Genre/Tag autocomplete hook + its test file (D-19)
- [ ] Backend test(s) for the `FansubGroup.aliases` contract addition (D-18) — extend existing `ListGroups`/`GetGroupByID` repository tests to assert the new field round-trips, using the project's mandated behavior-test style (real repo call against a test DB/fake repository, not a source-grep)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `Input` primitive swap renders/behaves identically to the native inputs it replaces across all 6 sites | D-07/D-02 | Visual/DOM primitive swap — rendering correctness is not meaningfully assertable beyond "renders", true regression surface is visual | D-11 live-UAT: open each of the 6 admin filter UIs over the tunnel address, type a search term with umlauts and with Kürzel/Alias text, confirm results and absence of layout regressions |
| "Abrufgrenze erreicht" hint banner (D-16) appears when `per_page:500` limit is hit on filter #3 (merge page) | D-16 | Requires a dataset large enough to trigger truncation or a mocked response shape — visual banner correctness best confirmed by eye | D-11 live-UAT: verify banner text uses real umlauts and appears/disappears correctly; simulate via dev tools response override if live data doesn't reach 500 records |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
