---
phase: 164
slug: oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-17
---

# Phase 164 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from
> `164-RESEARCH.md`'s "Validation Architecture" section (measured live, 2026-09-17).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + `testify`, pgx integration tests against isolated fixture DB (`testsupport.OpenPhase117Postgres(t)`). Frontend: Vitest ^3.2.4 + React Testing Library. |
| **Config file** | none (table-driven Go tests); `frontend/vitest.config.ts` |
| **Quick run command** | Backend: `cd backend && go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1`. Frontend: `cd frontend && npx vitest run src/components/fansubs/FansubVersionBrowser*.test.tsx` |
| **Full suite command** | Backend: `cd backend && go test ./...`. Frontend: `cd frontend && npm run test && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~30-60s backend targeted, ~3-5 min full backend suite; ~10-20s frontend targeted, ~2-3 min full frontend suite |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the touched layer (backend or frontend).
- **After every plan wave:** Run both full suites (`go test ./...`, `npm run test && npm run typecheck && npm run lint`).
- **Before `/gsd:verify-work`:** Full suite green + live curl/EXPLAIN re-verification against `team4s_v2`
  (read-only) + fixture-DB scale tests (bounded window, backward restore) green.
- **Max feedback latency:** ~300 seconds (full backend suite is the slowest single command).

---

## Per-Task Verification Map

Backfilled against the 7 real plans (164-01 through 164-07) once written. This table is the minimum
required coverage per topic block from RESEARCH.md's "Phase Requirement → Test Map"; extra rows below the
minimum set are included where a plan added a distinct, separately-verifiable capability (e.g. the §52
item 4 response-size measurement plan 164-03 adds, and the OpenAPI/TS contract-parity plan 164-02 adds).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 164-01 Task 1 | 164-01 | 1 | REQ-164-03, REQ-164-04, REQ-164-08, REQ-164-21, REQ-164-25 | T-164-02, T-164-03 | New scalar fields (filler_type, episode_type, container, video_codec) and aligned COALESCE logo expression are additive-only, no heavy/detail data | integration (Go) | `cd backend && go build ./... && go vet ./internal/repository/... ./internal/models/...` | ✅ extends `episode_version_public_query.go`/`episode_version.go` | ⬜ pending |
| 164-01 Task 2 | 164-01 | 1 | REQ-164-24 | T-164-01 | Batched `has_images`/`has_notes`/`has_karaoke` EXISTS query keyed only on the same request's already-gated `release_version_id`s, never a client-supplied ID list | integration (Go) | `cd backend && go build ./... && go vet ./internal/repository/...` | ✅ new `episode_version_public_flags.go` | ⬜ pending |
| 164-01 Task 3 | 164-01 | 1 | REQ-164-22, REQ-164-23 | — | Query budget asserted exactly 3 (unfiltered) / 4 (group-filtered), not loosely bounded | integration (Go) + budget assertion | `cd backend && go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1` | ✅ extends `episode_version_public_integration_test.go` / `episode_version_public_group_filter_test.go` | ⬜ pending |
| 164-02 Task 1+2 | 164-02 | 1 | REQ-164-21, REQ-164-26 | T-164-04 | OpenAPI + TypeScript contracts describe exactly the same additive fields plan 164-01 implements in Go, no heavy/detail field added | contract validation + typecheck | `python3 -c "import yaml; yaml.safe_load(open('shared/contracts/openapi.yaml'))"` && `cd frontend && npx tsc --noEmit` | ✅ extends `openapi.yaml` / `episodeVersion.ts` | ⬜ pending |
| 164-03 Task 1 (budget/pagination) | 164-03 | 2 | REQ-164-22, REQ-164-23, REQ-164-46, REQ-164-47 | T-164-05 | 52-episode isolated-schema fixture re-proves the exact 3/4-statement budget and atomic, non-overlapping cursor pages at scale — closes D-46 gate 3/4, D-47 | integration (Go) + budget assertion | `cd backend && go test ./internal/repository/... -run TestEpisodeVersionPublicScale -v -count=1` | ✅ new `episode_version_public_scale_fixture_test.go` | ⬜ pending |
| 164-03 Task 1 (response-size measurement) | 164-03 | 2 | REQ-164-22, REQ-164-46, REQ-164-47 | — | Full unfiltered 24-episode page's actual JSON byte length measured via `episodePublicRequest`'s returned `[]byte` and asserted `< 25*1024` bytes — replaces 164-RESEARCH.md's ≈15.9KB extrapolation with a live measurement (closes §52 item 4) | integration (Go), real byte-size assertion | `cd backend && go test ./internal/repository/... -run TestEpisodeVersionPublicScale -v -count=1` | ✅ same file as above | ⬜ pending |
| 164-04 Task 1 | 164-04 | 2 | REQ-164-05, REQ-164-06 | — | Glass card tint class maps 1:1 to filler_type (5 values), unknown gets neutral surface + no label, color is never the sole classification signal (WCAG 1.4.1) | unit (Vitest, pure functions) + component structural assertion | `cd frontend && npx vitest run src/components/fansubs/episodePreviewFormat.test.ts && npx tsc --noEmit` | ✅ new `episodePreviewFormat.ts`/`.test.ts`, `EpisodeGlassCard.tsx` | ⬜ pending |
| 164-04 Task 2 | 164-04 | 2 | REQ-164-08, REQ-164-09 through REQ-164-20 | T-164-06, T-164-07 | Release preview is group-first, text-based, never a chip/badge for technical data, row itself is never clickable, only interactive element is the `Zum Release →` `<a>` built from already-visibility-gated IDs | unit (Vitest) + typecheck | `cd frontend && npx tsc --noEmit` | ✅ new `ReleasePreviewRow.tsx`/`.module.css` | ⬜ pending |
| 164-04 Task 3 | 164-04 | 2 | REQ-164-01 through REQ-164-20, REQ-164-48 | T-164-06, T-164-07 | Full D-48 visual test-case rows 1-19/24-25 covered structurally (class/text/conditional-line assertions), dead pill/badge/play-button CSS removed | component test (Vitest/RTL) | `cd frontend && npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx && npx tsc --noEmit` | ✅ extends `FansubVersionBrowser.tsx`/`.test.tsx` | ⬜ pending |
| 164-05 Task 1 | 164-05 | 3 | REQ-164-27 through REQ-164-39 | T-164-08, T-164-09 | `DOM_WINDOW_SIZE=3`/`CACHE_MAX_PAGES=6` hard-bound mounted glass surfaces and retained JSON; backward restore re-fetch always uses a previously-server-issued cursor, never a client-invented one | unit (Vitest, `renderHook`) | `cd frontend && npx vitest run src/components/fansubs/useWindowedEpisodePages.test.ts && npx tsc --noEmit` | ✅ new `useWindowedEpisodePages.ts`/`.test.ts` | ⬜ pending |
| 164-05 Task 2 | 164-05 | 3 | REQ-164-30, REQ-164-31, REQ-164-33, REQ-164-34, REQ-164-38, REQ-164-39 | — | Bounded window/eviction/restoration, expandedEpisodes survives eviction (stable `episode_id` keys), directional loading/error/end-marker states never blank the existing list | component test (Vitest/RTL) — this is the previously-nonexistent Wave-0-flagged file | `cd frontend && npx vitest run src/components/fansubs/FansubVersionBrowser.windowing.test.tsx src/components/fansubs/FansubVersionBrowser.test.tsx && npx tsc --noEmit` | ✅ new `FansubVersionBrowser.windowing.test.tsx` | ⬜ pending |
| 164-06 Task 1 | 164-06 | 4 | REQ-164-40, REQ-164-41, REQ-164-42, REQ-164-43 | T-164-11 | Rapid A/B/C filter switching commits only the last selection's data; forward/backward-in-flight-then-switch results are discarded; episode expansion remains a strict zero-network-request toggle | component test (Vitest/RTL) with deterministic out-of-order mocked promise resolution | `cd frontend && npx vitest run src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx` | ✅ new `FansubVersionBrowser.filterSwitch.test.tsx` | ⬜ pending |
| 164-06 Task 2 | 164-06 | 4 | REQ-164-08, REQ-164-25, REQ-164-44 | T-164-10 | `resolveCoopLinkGroupId` defensively re-sorts by name/id (never assumes pre-sorted input) before selecting the route's `:groupId` segment; scroll-position hint is a single, bounded, pathname+search-scoped sessionStorage entry, never unbounded persistence | unit (Vitest) + typecheck | `cd frontend && npx vitest run src/components/fansubs/episodePreviewFormat.test.ts && npx tsc --noEmit` | ✅ extends `episodePreviewFormat.ts`/`.test.ts` | ⬜ pending |
| 164-07 Task 1 | 164-07 | 5 | REQ-164-45, REQ-164-46, REQ-164-47, REQ-164-48 | T-164-13 | Full automated suite green (or explicitly documented skip), 9 of 12 §47 performance gates recorded with real test-file/command/result evidence, not restated intent | full suite (Go + Vitest + typecheck + lint + build) | `cd backend && go build ./... && go vet ./... && go test ./... && cd ../frontend && npm run typecheck && npm run lint && npm run test && npm run build` | ✅ new `docs/audits/164-performance-gates.md` | ⬜ pending |
| 164-07 Task 2 | 164-07 | 5 | REQ-164-46, REQ-164-47, REQ-164-48 | — | Live real-Naruto UAT covers functional/visual correctness (D-01..D-20, Coop, filter switching, response shape) that a fixture cannot substitute for | manual (checkpoint:human-verify, live browser) | none (human-check) | N/A — live verification | ⬜ pending |
| 164-07 Task 3 | 164-07 | 5 | REQ-164-45, REQ-164-46 | T-164-12 | Dev-only, non-production, zero-backend-request large-dataset harness used only for a real Chrome DevTools DOM-node-count and mobile GPU/blur measurement, replacing 164-RESEARCH.md's DOM-node estimate with a measured result | manual (checkpoint:human-verify, live Chrome DevTools) | none (human-check) | ✅ new `frontend/src/app/dev/episode-windowing-preview/page.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*All 7 real plans (164-01 through 164-07) are represented above; every REQ-164-01..48 requirement listed in
at least one plan's frontmatter is covered by at least one row. Status remains ⬜ pending until
`/gsd:execute-phase 164` actually runs each plan — this table reflects planned coverage, not executed
results.*

---

## Wave 0 Requirements

The four Wave-0 gaps identified during research were not planned as a literal separate "Wave 0" plan;
instead each was folded into the earliest plan/wave that structurally needed it, per Claude's discretion
(164-CONTEXT.md). All four are now present in the actual plan set:

- [x] Seeded fixture anime in an isolated test DB (Phase-163-style) with ≥50 episodes-with-releases, mixed
      `filler_type`/`episode_type` values, releases with/without logos, with/without dates, with/without
      images/notes/karaoke, at least one multi-group Coop release — **covered by plan 164-03** (Wave 2),
      `episode_version_public_scale_fixture_test.go`.
- [x] `FansubVersionBrowser.windowing.test.tsx` (or equivalent new file) — bounded window/eviction/
      restoration/scroll-anchoring assertions — **covered by plan 164-05** Task 2 (Wave 3).
- [x] Extended budget-assertion helper for the new batched flags query (extend `episodePublicTracer`/
      `assertPublicBudget` in `episode_version_public_integration_test.go`) — **covered by plan 164-01**
      Task 3 (Wave 1), further re-proven at 52-episode scale by plan 164-03 (Wave 2).
- [x] Decision on whether live-browser UAT needs a large fixture anime seeded into `team4s_v2` itself, or
      whether Naruto-scale UAT stays functional-only with scale gates covered by automated tests —
      **decided and covered by plan 164-07**: Task 2 scopes live-browser UAT to real-Naruto functional/
      visual correctness only (no team4s_v2 write), Task 3 covers scale-dependent DOM-node/mobile
      measurement via a throwaway, dev-only, zero-backend-request harness instead. This decision is also
      now recorded as **RESOLVED** in 164-RESEARCH.md's Open Question 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Glass tint correctness per classification (visual color perception) | D-05, D-06, D-48 | Automated tests can assert a CSS class/token is applied, not that the rendered color is "subtle" and matches intended hue — this is a human visual judgment call | Load fixture anime episodes with each of the 5 filler_type values live at :3300/:3000, screenshot each card, confirm subtle (not saturated) tint matches D-05's hue mapping |
| Scroll stability / no visible jump on page evict-and-restore | D-34, D-46 gate 7/8 | Requires observing actual browser scroll behavior during rapid up/down scrolling — not reliably assertable via jsdom | Live browser session: scroll down through fixture anime's episode list past 3+ page boundaries, scroll back up, visually confirm no jump/flicker at page boundaries |
| Mobile GPU/blur cost with multiple glass cards + expanded episodes | D-45, D-46 gate 11 | Requires Chrome DevTools Performance/Layers profiling on a real or emulated mobile viewport, not a unit-testable metric | Live session: open Chrome DevTools Performance tab, mobile viewport emulation, expand 5+ episodes simultaneously while scrolling, capture profile, confirm no dropped-frame/paint-storm pattern |
| Race conditions on rapid scroll + filter switch | D-46 gate 12 | Timing-dependent browser behavior across real network latency; component tests can assert abort logic exists but not that a human-speed rapid interaction never produces a visible glitch | Live session: rapidly scroll while switching fansub filter (AnimeOwnage → Project Messiah → Alle) repeatedly, confirm no stale/mixed data ever renders |
| Back/Forward + release-page-return restoration | D-44 | Depends on actual Next.js router/browser history behavior across a real navigation round-trip | Live session: scroll partway down episode list, open a release, click "Zum Release →", use browser Back, confirm filter/approximate scroll position restored |

These five rows map onto plan 164-07's two `checkpoint:human-verify` tasks (Task 2: real-Naruto UAT; Task 3:
dev-only large-dataset DOM/mobile profiling), the only manual-only steps in the entire phase's plan set.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every `type="auto"` task across all 7
      plans carries an `<automated>` command (see Per-Task Verification Map above); the only tasks without
      one are plan 164-07's two `checkpoint:human-verify` tasks, which use `<human-check>` by design (live
      browser/DevTools measurement, not automatable) — a recognized exception, not a gap.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — the longest run of
      non-automated tasks in the phase's task sequence is 164-07 Task 2 + Task 3 (2 consecutive checkpoints,
      both at the very end of the phase, both by-design manual measurements).
- [x] Wave 0 covers all MISSING references (fixture anime, windowing test file, budget-assertion extension)
      — confirmed above; folded into Waves 1-3 rather than a separate Wave 0 plan, per Claude's discretion.
- [x] No watch-mode flags — no `<automated>` command across any of the 7 plans passes `--watch` or an
      equivalent watch flag.
- [x] Feedback latency < 300s — unchanged from the original estimate; full backend suite (`go test ./...`)
      remains the slowest single command, ~3-5 minutes worst case, individual task-level commands are all
      well under 300s.
- [x] `nyquist_compliant: true` set in frontmatter — set above; the map's coverage (16 rows across all 7
      plans, every REQ-164-01..48 represented) is now complete.

**Approval:** approved 2026-09-17
