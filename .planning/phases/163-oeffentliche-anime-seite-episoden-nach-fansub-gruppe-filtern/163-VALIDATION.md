---
phase: 163
slug: oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-17
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
- **Before `/gsd:verify-work`:** full suite green (diffed against the pre-fix baseline captured in Wave 0 — do not chase pre-existing unrelated failures such as the already-disabled `TestFansubRepository_PublicProfileSourceInvariants` or unrelated CSS-guard frontend failures noted in STATE.md); live `EXPLAIN (ANALYZE)` after-fix comparison against the 163-RESEARCH.md before-baseline (Naruto, anime_id=4)
- **Max feedback latency:** 60 seconds (targeted commands above)

---

## Per-Task Verification Map

*Task IDs are TBD — planner fills in real plan/task IDs. Rows below map Pflichtfälle A–J (163-USER-REQUEST.md §15) and D-01..D-19 to concrete tests, per 163-RESEARCH.md's "Phase requirements → test map".*

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | §15-A / D-01 | Episode without any release invisible in "Alle" | integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicEmptyAndVisibility` | ✅ existing, needs corrected expectation (fixture counts 4→2, 126→125, 1→0) | ⬜ pending |
| TBD | TBD | TBD | §15-B / D-01,D-03 | Episode with one group: visible/hidden per filter | integration | new `-run TestEpisodeVersionPublicGroupFilter` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-C / D-03 | Two separate versions (AO/PM): correct set per filter | integration | same new test file | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-D / D-01,D-02 | Coop version visible/present at both group filters, no primary group | integration | same new test file | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-E / D-18 | Naruto-style "only PM" episode invisible under AO (real-data regression) | integration | same new test file | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-F / D-06 | Pagination-scope: matches only on page 2+ still found, no client-side truncation | integration | same new test file (fixture: matching group only beyond page 1) | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-G / D-07..D-09 | Filter switch Alle→AO→PM→Alle: no mixed pagination data, old cursor discarded | frontend (Vitest) | `npx vitest run FansubVersionBrowser` (new cases) | ✅ file exists, needs new cases | ⬜ pending |
| TBD | TBD | TBD | §15-H / D-05 | Invalid/foreign group filter: 162 fallback respected, backend fails closed (400) | frontend + backend | both suites, new cases | ❌ Wave 0 (backend) / ✅ extend (frontend) | ⬜ pending |
| TBD | TBD | TBD | §15-I / D-02 | Non-public version (variant without any group) doesn't make episode visible | integration | same new test file (group-less variant fixture) | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | §15-J / performance | No query-per-episode structure; constant query count with `fansub` set | integration (query tracer) | reuse `assertPublicBudget`/`episodePublicTracer`, updated assertion | ✅ infra exists, needs assertion update | ⬜ pending |
| TBD | TBD | TBD | D-12 | "Episoden (N)" hit-count is a same-statement window aggregate, no extra query | integration | extend query-budget test above | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | D-11 | SSR fetch includes `fansub`, no flicker Alle→Gruppe | frontend | `npx vitest run page.test.tsx` (extend) | ✅ extend existing | ⬜ pending |
| TBD | TBD | TBD | D-15,D-16 | `noVersionHint` / client-side group filtering removed; fallback list no longer shows unreleased episodes | frontend | `npx vitest run FansubVersionBrowser` + `page.test.tsx` (extend, remove stale assertion) | ✅ extend existing | ⬜ pending |
| TBD | TBD | TBD | §16 / D-19 | Browser-UAT live over :3300/:3000 with Naruto (AO hides ep. 3/4, PM hides ep. 1/2, coop ep. 5 both, Alle both) | manual | checkpoint:human-verify | N/A | ⬜ pending |
| TBD | TBD | TBD | §17 / D-19 | Live `EXPLAIN (ANALYZE)` after-fix vs. before-baseline (Naruto anime_id=4) | manual + integration | `docker exec team4sv30-db psql ... EXPLAIN (ANALYZE, BUFFERS)` against fixture/dev query, diffed against 163-RESEARCH.md baseline | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New backend test file `episode_version_public_group_filter_test.go` (sibling to `episode_version_public_integration_test.go`, which is at 356 lines — mind CLAUDE.md's 450-line cap) covering Pflichtfälle B, C, D, E, F, I, plus the updated J query-budget assertion
- [ ] Fixture data for Pflichtfall F (pagination-scope leak): anime with ≥25 episodes where the filtered group's only matching episode is on page 2+
- [ ] Fixture data for Pflichtfall I (non-public version): a `release_versions` row with ≥1 `release_variants` row but zero `release_version_groups` rows (does not exist in current fixtures)
- [ ] Backend: capture the pre-fix full `go test ./...` pass/fail baseline as the first executor task, diffed against pre-existing known failures (`TestFansubRepository_PublicProfileSourceInvariants`, unrelated CSS-guard frontend failures per STATE.md) — do not chase those
- [ ] Frontend: new Vitest cases in `FansubVersionBrowser.test.tsx` for D-07..D-10 (group switch discards old cursor, dims old list via `aria-busy`, aborts in-flight requests, retry button) and removal of the `'Keine Version dieser Gruppe verfügbar.'` assertion once D-15 removes that code path
- [ ] Frontend: `page.test.tsx` updates for D-11 (SSR fetch includes `fansub`) and D-16 (fallback list no longer renders unreleased episodes)

*Existing infrastructure (cursor pagination validation, AbortController/loadMore pattern, query-budget tracer) covers the plumbing; only the group-filter-specific fixtures and assertions above are net-new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Browser-UAT with real Naruto data (AO/PM/Alle/coop) | §16, D-19 | Real-data visual/interaction confirmation across live containers, not a unit-testable claim | Via SSH tunnel `http://127.0.0.1:3300` (or direct `http://192.168.235.196:3000`): open Naruto, select AnimeOwnage → episode 23-equivalent (PM-only episode) disappears; select Project Messiah → AO-only episodes disappear; select Alle → both appear; verify the one coop episode (Folge 5) appears and shows the coop version under both group filters |
| Live `EXPLAIN (ANALYZE)` after-fix comparison | §11, §17, D-19 | Performance claim requires a live query plan against real data volume (220 Naruto episodes), not just unit assertions | `docker exec team4sv30-db psql ... EXPLAIN (ANALYZE, BUFFERS)` on the fixed `publicEpisodeQuery` for anime_id=4, both group-filtered and "Alle" cases; diff row/cost numbers against 163-RESEARCH.md's before-baseline (220-row scan, 1.226ms) |
| Dimming/aria-busy screen-reader and keyboard behavior during group switch (D-08) | D-08 | Subjective a11y quality bar ("saubere" keyboard/screen-reader behavior) not fully automatable | Manual keyboard-only + screen-reader pass during group switch: confirm old list is visually dimmed and non-interactive, new chip is immediately focusable/active, no focus trap |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (flip after planner assigns real plan/task IDs and Wave 0 files exist)

**Approval:** pending — draft created during research phase (2026-09-17); planner must fill in real plan/task IDs in the Per-Task Verification Map above before this can flip to `nyquist_compliant: true`.
