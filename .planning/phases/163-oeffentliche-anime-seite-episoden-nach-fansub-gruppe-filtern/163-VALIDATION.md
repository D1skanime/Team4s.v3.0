---
phase: 163
slug: oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-17
updated: 2026-09-17
---

# Phase 163 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Go `testing` + `github.com/stretchr/testify` (require); Postgres integration tests via `testsupport.OpenPhase117Postgres` (isolated schema/search_path, never `DATABASE_URL` / `team4s_v2`) |
| **Config file** | none — table-driven fixtures inline in `_test.go` files |
| **Quick run command** | `go test ./internal/repository/... -run TestEpisodeVersionPublic` |
| **Full suite command** | `go test ./...` |
| **Framework (frontend)** | Vitest 3 (`vitest run`), React Testing Library conventions |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Quick run command (frontend)** | `npx vitest run FansubVersionBrowser` / `npx vitest run page.test.tsx` (in `frontend/src/app/anime/[id]/`) |
| **Full suite command (frontend)** | `npm run test` |
| **Estimated runtime** | ~30-60s backend integration suite (targeted), ~15-30s frontend Vitest suite (targeted) |

---

## Sampling Rate

- **After every task commit:** targeted `go test ./internal/repository/... -run TestEpisodeVersionPublic` and/or `npx vitest run FansubVersionBrowser`
- **After every plan wave:** full `go test ./...` and `npm run test`, plus `npm run typecheck` and `npm run lint`
- **Before `/gsd:verify-work`:** full suite green (diffed against the pre-fix baseline captured in Plan 163-01 — do not chase pre-existing unrelated failures such as the already-disabled `TestFansubRepository_PublicProfileSourceInvariants` or the 2 documented CSS-guard frontend failures); live `EXPLAIN (ANALYZE)` after-fix comparison against the 163-RESEARCH.md/163-01-SUMMARY.md before-baseline (Naruto, anime_id=4)
- **Max feedback latency:** 60 seconds (targeted commands above)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 163-01 T2 / 163-02 T1 | 163-01 (RED) / 163-02 (GREEN) | 1 / 2 | §15-A / D-01 | Episode without any release invisible in "Alle" | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicEmptyAndVisibility` (+ Mixed/AtomicPages corrections) | ✅ corrected in 163-01 T2 | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 (RED) / 163-02 (GREEN) | 1 / 2 | §15-B / D-01,D-03 | Episode with one group: visible/hidden per filter | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilterBasics` | ✅ new in 163-01 T3 | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 / 163-02 | 1 / 2 | §15-C / D-03 | Two separate versions (AO/PM): correct set per filter | integration | same (`TestEpisodeVersionPublicGroupFilterBasics`) | ✅ | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 / 163-02 | 1 / 2 | §15-D / D-01,D-02 | Coop version visible/present at both group filters, no primary group | integration | same (`TestEpisodeVersionPublicGroupFilterBasics`) | ✅ | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 / 163-02 | 1 / 2 | §15-E / D-18 | Naruto-style "only PM" episode invisible under AO (fixture-level real-data regression) | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilterNarutoRegression` | ✅ new in 163-01 T3 | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 / 163-02 | 1 / 2 | §15-F / D-06 | Pagination-scope: matches only on page 2+ still found, filter runs before LIMIT | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilterPaginationScope` | ✅ new in 163-01 T3 | ⬜ pending |
| 163-03 T3 / 163-04 T2 | 163-03 (RED) / 163-04 (GREEN) | 3 / 4 | §15-G / D-07..D-09 | Filter switch Alle→AO→PM→Alle: no mixed pagination data, old cursor discarded | frontend (Vitest) | `npx vitest run FansubVersionBrowser.test.tsx FansubVersionBrowser.groupSwitch.test.tsx` | ✅ corrected + new sibling file in 163-03 T3 | ⬜ pending |
| 163-01 T3 + 163-03 T2 / 163-02 T2 + 163-04 T1 | 163-01+163-03 (RED) / 163-02+163-04 (GREEN) | 1,3 / 2,4 | §15-H / D-05 | Invalid/foreign group filter: 162 fallback respected (frontend), backend fails closed 400 | frontend + backend | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilterUnknownSlug` + `npx vitest run page.test.tsx` (D-11/D-05 cases) | ✅ both new/extended | ⬜ pending |
| 163-01 T3 / 163-02 T1-T2 | 163-01 / 163-02 | 1 / 2 | §15-I / D-02 | Non-public version (variant without any group) doesn't make episode visible | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilterNonPublicVersion` | ✅ new in 163-01 T3 | ⬜ pending |
| 163-01 T3 / 163-02 T2 | 163-01 / 163-02 | 1 / 2 | §15-J / performance | No query-per-episode structure; constant query count with `fansub` set (2 or 3 statements) | integration (query tracer) | `assertPublicBudgetWithGroupFilter` inside `TestEpisodeVersionPublicGroupFilterBasics` | ✅ new in 163-01 T3 | ⬜ pending |
| 163-02 T1 / 163-03 T2 / 163-04 T1-T2 | 163-02 / 163-03 (RED) / 163-04 (GREEN) | 2 / 3 / 4 | D-12 | "Episoden (N)" hit-count is a same-statement window aggregate, no extra query, sourced client-side | integration + frontend | `go test ... -run TestEpisodeVersionPublicGroupFilterBasics` (episode_count field) + `npx vitest run page.test.tsx FansubVersionBrowser.test.tsx` (episodeCount prop/heading) | ✅ | ⬜ pending |
| 163-03 T2 / 163-04 T1 | 163-03 (RED) / 163-04 (GREEN) | 3 / 4 | D-11 | SSR fetch includes resolved `fansub`, no flicker Alle→Gruppe, unmatched/single-group slug never forwarded | frontend | `npx vitest run page.test.tsx` (5 new/corrected cases) | ✅ | ⬜ pending |
| 163-03 T2-T3 / 163-04 T1-T2 | 163-03 (RED) / 163-04 (GREEN) | 3 / 4 | D-15,D-16 | `noVersionHint`/client-side group filtering removed; SSR fallback list no longer shows unreleased episodes | frontend | `npx vitest run FansubVersionBrowser.test.tsx page.test.tsx` (extended/corrected) | ✅ | ⬜ pending |
| 163-05 T2 | 163-05 | 5 | §16 / D-19 | Browser-UAT live over :3300/:3000 with Naruto (AO hides PM-only, PM hides AO-only, coop both, Alle both) | manual | `checkpoint:human-verify` | N/A | ⬜ pending |
| 163-01 T1 / 163-02 T3 / 163-05 T1 | 163-01 / 163-02 / 163-05 | 1 / 2 / 5 | §17 / D-19 | Live `EXPLAIN (ANALYZE)` before (163-01)/after (163-02)/post-rebuild (163-05) vs. baseline | manual + integration | `docker exec team4sv30-db psql ... EXPLAIN (ANALYZE, BUFFERS)` against team4s_v2, read-only, diffed across all three captures | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements — CLOSED

- [x] New backend test file assigned: `episode_version_public_group_filter_test.go` (Plan 163-01 Task 3), sibling to `episode_version_public_integration_test.go` (which stays at ~355 lines via in-place corrections only, per CLAUDE.md's 450-line cap)
- [x] Fixture data for Pflichtfall F (pagination-scope leak) assigned: new synthetic anime id 7 in Plan 163-01 Task 3, 24 padding episodes + 1 matching episode beyond page 1
- [x] Fixture data for Pflichtfall I (non-public version) assigned: new episode/version/variant with zero `release_version_groups` rows, Plan 163-01 Task 3
- [x] Backend pre-fix baseline capture assigned: Plan 163-01 Task 1 (full `go test ./...` + live read-only EXPLAIN)
- [x] Frontend new Vitest cases for D-07..D-10 assigned: Plan 163-03 Task 3 (corrections to `FansubVersionBrowser.test.tsx` + new sibling `FansubVersionBrowser.groupSwitch.test.tsx`)
- [x] Frontend `page.test.tsx` updates for D-11/D-16 assigned: Plan 163-03 Task 2

*All Wave 0 gaps are now assigned to concrete plan/task IDs above — none remain unassigned.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Assigned To |
|----------|-------------|------------|--------------------|-------------|
| Browser-UAT with real Naruto data (AO/PM/Alle/coop) | §16, D-19 | Real-data visual/interaction confirmation across live containers, not a unit-testable claim | Via SSH tunnel `http://127.0.0.1:3300` (or direct `http://192.168.235.196:3000`): open Naruto, select AnimeOwnage → PM-only episodes disappear; select Project Messiah → AO-only episodes disappear; select Alle → both appear; verify the one coop episode appears and shows the coop version under both group filters | 163-05 Task 2 |
| Live `EXPLAIN (ANALYZE)` before/after/post-rebuild comparison | §11, §17, D-19 | Performance claim requires a live query plan against real data volume, not just unit assertions | `docker exec team4sv30-db psql ... EXPLAIN (ANALYZE, BUFFERS)` on `publicEpisodeQuery` for anime_id=4, before (163-01), after-fix-pre-rebuild (163-02), after-rebuild (163-05) | 163-01 T1, 163-02 T3, 163-05 T1 |
| Dimming/aria-busy screen-reader and keyboard behavior during group switch (D-08) | D-08 | Subjective a11y quality bar not fully automatable beyond the `aria-busy` attribute assertion already covered by Vitest | Manual keyboard-only pass during group switch, folded into 163-05 Task 2's optional step 7 if time permits; the automated `aria-busy` presence/absence assertion in `FansubVersionBrowser.groupSwitch.test.tsx` covers the mechanical half | 163-03/163-04 (automated) + 163-05 T2 (optional manual) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Wave 0 fully closed above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task across all 5 plans has an `<automated>` or explicit manual-checkpoint verify)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (all commands use `vitest run`/`go test`, never `--watch`)
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter — real plan/task IDs assigned above, Wave 0 files assigned to concrete tasks

**Approval:** plans 163-01 through 163-05 created 2026-09-17; Per-Task Verification Map now carries real plan/task IDs; Wave 0 gaps are all assigned. Ready for `/gsd:execute-phase 163`.
