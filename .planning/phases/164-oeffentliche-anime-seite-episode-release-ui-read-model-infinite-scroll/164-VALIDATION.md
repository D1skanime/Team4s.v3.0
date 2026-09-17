---
phase: 164
slug: oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
status: draft
nyquist_compliant: false
wave_0_complete: false
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

Populated by the planner per plan/task (REQ IDs assigned during planning from 164-USER-REQUEST.md §1–§53).
Minimum required rows per topic block (from RESEARCH.md's Phase Requirement → Test Map):

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | Extended `publicEpisodeQuery` fields (filler_type, episode_type, container, video_codec) | — | N/A | integration (Go) | `go test ./internal/repository/... -run TestEpisodeVersionPublic -v` | ✅ extend existing file | ⬜ pending |
| TBD | TBD | TBD | Batched has_images/has_notes/has_karaoke, no per-row query | T-164-01 | flags query scoped only to same-request page IDs, never client-supplied | integration (Go) + budget assertion | reuse `assertPublicBudget`/`episodePublicTracer` pattern | ✅ pattern exists, new assertions needed | ⬜ pending |
| TBD | TBD | TBD | Bounded window eviction/restoration, scroll stability | — | N/A | component test (Vitest/RTL) | new file `FansubVersionBrowser.windowing.test.tsx` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | Glass card tint per filler_type classification | — | N/A | visual/manual UAT (Playwright screenshots at defined breakpoints, per 162-05 precedent) | none automatable for color-perception | ❌ Wave 0 (UI-SPEC-driven) | ⬜ pending |
| TBD | TBD | TBD | "Zum Release →" navigation incl. Coop group selection | T-164-02 | link never exposes IDs outside the already-visibility-gated release set | component test + live curl smoke check | new assertions in extended component test file | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | Filter-change abort/reset (D-40..D-42, builds on Phase 163 AbortController pattern) | — | N/A | component test (Vitest/RTL) | extend existing group-switch test file | ✅ pattern exists (Phase 163) | ⬜ pending |
| TBD | TBD | TBD | Query budget stays 3-4 statements per page request (D-23/D-24) | — | N/A | integration (Go) + EXPLAIN re-run | `go test` budget assertion + manual `EXPLAIN (ANALYZE, BUFFERS)` re-run against `team4s_v2` | ✅ pattern exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner MUST replace `TBD` rows with concrete Task/Plan/Wave/REQ IDs once plans are written, and MAY add
additional rows per plan — this table is the minimum required coverage, not the full set.*

---

## Wave 0 Requirements

- [ ] Seeded fixture anime in an isolated test DB (Phase-163-style, e.g. `team4s_phase117_test_164`) with
      ≥50 episodes-with-releases, mixed `filler_type` values (canon/filler/mixed/recap/unknown) and
      `episode_type` values (episode/special/ova/movie at minimum — none of `special`/`ova`/`movie` currently
      exist with public releases in `team4s_v2`), releases with/without logos, with/without dates, with/
      without images/notes/karaoke, at least one multi-group Coop release. Required to exercise D-46's scale
      gates and D-48's visual test matrix at all — `team4s_v2` alone cannot (max real anime today: 13
      episodes-with-releases, Naruto's public episode_count is 5, not 220).
- [ ] `FansubVersionBrowser.windowing.test.tsx` (or equivalent new file) — bounded window/eviction/
      restoration/scroll-anchoring assertions. No such file exists today.
- [ ] Extended budget-assertion helper for the new batched flags query (extend `episodePublicTracer`/
      `assertPublicBudget` in `episode_version_public_integration_test.go`).
- [ ] Decision (planner, not this document): whether live-browser UAT also needs a large fixture anime
      seeded into `team4s_v2` itself (via existing admin write paths, not raw SQL), or whether UAT stays
      scoped to Naruto (functional/visual correctness) with scale gates covered purely by the isolated
      fixture-DB automated tests. Either choice is acceptable per 164-RESEARCH.md Open Question 1; the plan
      must state which was chosen and why.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Glass tint correctness per classification (visual color perception) | D-05, D-06, D-48 | Automated tests can assert a CSS class/token is applied, not that the rendered color is "subtle" and matches intended hue — this is a human visual judgment call | Load fixture anime episodes with each of the 5 filler_type values live at :3300/:3000, screenshot each card, confirm subtle (not saturated) tint matches D-05's hue mapping |
| Scroll stability / no visible jump on page evict-and-restore | D-34, D-46 gate 7/8 | Requires observing actual browser scroll behavior during rapid up/down scrolling — not reliably assertable via jsdom | Live browser session: scroll down through fixture anime's episode list past 3+ page boundaries, scroll back up, visually confirm no jump/flicker at page boundaries |
| Mobile GPU/blur cost with multiple glass cards + expanded episodes | D-45, D-46 gate 11 | Requires Chrome DevTools Performance/Layers profiling on a real or emulated mobile viewport, not a unit-testable metric | Live session: open Chrome DevTools Performance tab, mobile viewport emulation, expand 5+ episodes simultaneously while scrolling, capture profile, confirm no dropped-frame/paint-storm pattern |
| Race conditions on rapid scroll + filter switch | D-46 gate 12 | Timing-dependent browser behavior across real network latency; component tests can assert abort logic exists but not that a human-speed rapid interaction never produces a visible glitch | Live session: rapidly scroll while switching fansub filter (AnimeOwnage → Project Messiah → Alle) repeatedly, confirm no stale/mixed data ever renders |
| Back/Forward + release-page-return restoration | D-44 | Depends on actual Next.js router/browser history behavior across a real navigation round-trip | Live session: scroll partway down episode list, open a release, click "Zum Release →", use browser Back, confirm filter/approximate scroll position restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (to be confirmed once plans exist)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (fixture anime, windowing test file, budget-assertion extension)
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter (set once plans satisfy the map above)

**Approval:** pending
