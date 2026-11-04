---
phase: 192
slug: ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-04
---

# Phase 192 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (already configured, `frontend/vitest.config.ts`) |
| **Config file** | `frontend/vitest.config.ts` (existing — no changes needed) |
| **Quick run command** | `cd frontend && npx vitest run "src/app/anime/[id]" src/components/anime/AnimeEdgeNavigation.test.tsx src/components/fansubs/ReleasePreviewRow.test.tsx src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/SplitLayout.test.tsx` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~90 seconds (quick), ~6 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (scoped to touched directories)
- **After every plan wave:** Run the full suite command + `npx tsc --noEmit` + `npx eslint .`
- **Before `/gsd:verify-work`:** Full suite must be green, plus the mandated Playwright screenshot-pair proof (`/anime/6`, `/anime/13`, `/anime/2` at 1440×900/390×844, main vs. branch; `AnimeDetailHero.stories.tsx` vs. live page for every pilot composite)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | Befund-23 | — | N/A | unit | `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/SplitLayout.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | Befund-23 | — | N/A | unit | `npx vitest run src/components/ui/foreignVariableOverrides.regression.test.ts src/components/ui/catalogTaxonomy.test.ts` | ✅ existing, auto-covers new files | ⬜ pending |
| TBD | TBD | 2 | Befund-22/21 | — | N/A | unit | `npx vitest run "src/app/anime/[id]/detailStyleSystem.guard.test.ts" "src/app/anime/[id]/page.test.tsx"` | ✅ existing, needs edits | ⬜ pending |
| TBD | TBD | 3 | Befund-19 | — | Public SSR stays free of viewer cookies/watchlist reads (uses unauthenticated `fetch()` branch of `getAnimeList`, not `authorizedFetch`) | unit (tree-walk) | `npx vitest run "src/app/anime/[id]/page.test.tsx" src/components/anime/AnimeEdgeNavigation.test.tsx` | ✅ existing, needs new cases | ⬜ pending |
| TBD | TBD | 4 | Befund-20 | — | N/A | unit | `npx vitest run src/components/fansubs/ReleasePreviewRow.test.tsx` | ❌ W0 — new file | ⬜ pending |

*Exact Task IDs/Plan IDs/Waves filled in by the planner when PLAN.md files are written; rows above are the requirement→test skeleton the planner must map tasks onto (see 192-RESEARCH.md "Phase Requirements → Test Map" for full detail).*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/ui/Stack.test.tsx` — new primitive, no existing test
- [ ] `frontend/src/components/ui/Cluster.test.tsx` — new primitive, no existing test
- [ ] `frontend/src/components/ui/SplitLayout.test.tsx` — new primitive, no existing test
- [ ] `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx` — confirm absent, create for Befund-20 alignment + zero-avatar-gap assertions
- [ ] `frontend/src/app/anime/[id]/page.performance.test.ts` — add `getAnimeList: vi.fn()` to the existing partial `vi.mock('@/lib/api', ...)` override defensively (Pitfall 2 in RESEARCH.md)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual parity Storybook vs. live page (Anime-Kopf and every other pilot composite) | Befund-21/22 | Pixel-level visual comparison across two render surfaces; no automated visual-diff tool configured in this repo | Playwright screenshot script per 192-CONTEXT.md "specifics": screenshot `AnimeDetailHero.stories.tsx` (desktop 1440 + mobile 390) and the equivalent live-page section on `/anime/6`, compare side-by-side in the phase report, then delete the temporary script/container |
| Visual parity main vs. branch | Befunds 19-23 (no regression) | Full-page pixel comparison against a historical git ref, not expressible as a unit assertion | `git worktree add --detach` snapshot of `main`, build a disposable Docker image, Playwright screenshot `/anime/6`, `/anime/13`, `/anime/2` at 1440×900 and 390×844 on both main-snapshot and branch, compare, then `docker rm`/`docker rmi`/`git worktree remove --force` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
