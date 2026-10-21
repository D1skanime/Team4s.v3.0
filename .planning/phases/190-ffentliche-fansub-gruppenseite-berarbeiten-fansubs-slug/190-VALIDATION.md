---
phase: 190
slug: ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-21
---

# Phase 190 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from
> `190-RESEARCH.md` "Validation Architecture" section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (frontend); `database/migrations/*.sql` convention (no test framework for migrations — the migration itself is the tested artifact, per CLAUDE.md's stated exception) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run <path-to-changed-test-file>` |
| **Full suite command** | `cd frontend && npm test` (= `vitest run`) |
| **Estimated runtime** | ~60-90 seconds (full frontend suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed test path>` (quick)
- **After every plan wave:** Run `cd frontend && npm test` (full suite) — must stay green
- **Before `/gsd:verify-work`:** Full suite green + mandatory live checkpoint (D-p, after D-a/D-o)
  + final live UAT on `new-subs`, `strawhat-subs`, `dragon-subs` (desktop 1440px + mobile 375px)
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| D-ID | Behavior | Test Type | Automated Command / Check | File Exists? | Status |
|------|----------|-----------|---------------------------|---------------|--------|
| D-a | Hero rendered without framed-card styling | visual | manual — compare against project page hero, 1440px | n/a | ⬜ pending |
| D-b/D-p | Banner size, post-checkpoint value | visual | manual, mandatory pause in plan after D-a/D-o | n/a | ⬜ pending |
| D-c | Metric label "Releases" not "Release-Versionen" | unit/visual | `page.tsx` heroStats literal; visual spot-check | existing file, edit | ⬜ pending |
| D-o | Status rendered exactly once across all 3 statuses | unit | `vitest run frontend/src/lib/fansub-summary.test.ts` (new) | **new** | ⬜ pending |
| D-q | Correct member-section label per status | unit | new test, e.g. `frontend/src/lib/fansub-team-labels.test.ts` | **new** | ⬜ pending |
| D-f | Quotes clamp to 2-3 lines with expand/collapse | visual + existing hook coverage | manual visual (`new-subs` long-quote fixture) + check `useClampedOverflow` test | check existing | ⬜ pending |
| D-g | "unbestätigt" badge removed per-card, present once in heading | visual + render assertion | extend existing `FansubTeamHistoricalGroup` test | existing, extend | ⬜ pending |
| D-h/D-r | Single-project grid uses normal card, not carousel "quiet" mode; other consumers unaffected | unit | new/extended test on `singleItemLayout` prop resolution | existing/new | ⬜ pending |
| D-i | Generic "image" fallback titles suppressed | unit | new test, e.g. `fansubMediaTitleFallback.test.ts` | **new** | ⬜ pending |
| D-j | Exactly one "show more" affordance when overflow | unit/visual | extend existing `FansubGroupMediaBlock` render test | existing, extend | ⬜ pending |
| D-k | Media grouped by `category` with subheadings | unit | new test, e.g. `fansubMediaGrouping.test.ts` | **new** | ⬜ pending |
| D-l | Story block centered, text left-aligned | visual | manual (pure CSS change) | n/a | ⬜ pending |
| D-t | `role_definitions.label_de` for `editor` = "Editing" | SQL assertion + regression | `psql`: `SELECT label_de FROM role_definitions WHERE code='editor'` expect `Editing`; re-run existing frontend fixtures that already assert `'Editing'` | existing fixtures, run only | ⬜ pending |
| D-u | `HeroMetrics` wraps cleanly at 375px on all 6 call sites | visual | manual, 6-site checklist (see CONTEXT.md D-u) | n/a — CSS-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/lib/fansub-summary.test.ts` — covers D-o (consolidated status-label/dedup
      decision across `active`/`inactive`/`dissolved`)
- [ ] New pure label-resolver function + test for D-q (member-section heading by status) — natural
      home alongside `fansub-summary.ts` or new `frontend/src/lib/fansub-team-labels.ts`
- [ ] New pure title-fallback function + test for D-i — extract from
      `FansubGroupMediaBlock.tsx:98` inline expression into a named, testable function
- [ ] New pure category-grouping function + test for D-k
- [ ] Confirm whether `useClampedOverflow.ts` already has a dedicated unit test (pre-existing gap
      check, not newly introduced by D-f)
- [ ] No test framework install needed — Vitest already configured and running

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|--------------------|
| Hero layout without framed card | D-a | Pure visual/CSS structural change | Compare `/fansubs/new-subs` hero against `/fansubs/new-subs/fansubprojekt/<anime>` hero at 1440px |
| Banner size | D-b/D-p | Explicit live-checkpoint decision (D-p), no value set in advance | Pause execution after D-a/D-o land, show live, get user decision before continuing |
| Story block centering | D-l | Pure CSS, no logic | View `/fansubs/<slug-with-story>` at 1440px, confirm centered block + left-aligned text |
| HeroMetrics mobile wrap | D-u | CSS-only, 6 distinct call sites, no shared logic to unit test | Screenshot all 6 call sites at 375px (see CONTEXT.md D-u list) |
| Final live UAT | all | Project convention — real data, no test fixtures | `new-subs`, `strawhat-subs`, `dragon-subs` at 1440px + 375px |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
