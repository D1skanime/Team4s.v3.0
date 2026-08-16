---
phase: 133
slug: responsive-accessible-efficient-visual-delivery
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-15
---

# Phase 133 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (jsdom environment), configured in `frontend/vitest.config.ts` |
| **Config file** | `frontend/vitest.config.ts` (existing; no axe-specific config file needed — matcher registered via a setup import) |
| **Quick run command** | `cd frontend && npx vitest run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| **Full suite command** | `cd frontend && npm test` (runs `vitest run`) |
| **Estimated runtime** | ~60 seconds (existing suite; grows modestly with new axe assertions) |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest file(s) for the component/CSS module touched
- **After every plan wave:** Run `cd frontend && npm test` (full Vitest suite) + `npm run lint` + `npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite green, plus `node frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check` passing on both seed profiles; D-06's per-section visual spot-checks and D-12's manual keyboard/zoom/screen-reader pass are additional non-automated gates specific to this phase.
- **Max feedback latency:** ~60 seconds (targeted test run per task commit)
- **Accepted latency exception:** `node frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check` (used as the `<automated>` verify in Plan 133-10 Task 2 and Plan 133-11 Task 1/Task 2) drives a headless Playwright browser through a full image waterfall against both live seed profiles and routinely exceeds the 60s target. This is intentional and scoped to phase-gate frequency only (wave 5/6/end-of-phase, not per-task-commit) — it is not run as a per-task feedback loop, so it does not violate the sampling-continuity rule below.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 133-01 T1 | 133-01 | 1 | PMA11Y-04 | T-133-SC | Blocking checkpoint confirms `axe-core`/`jest-axe` publisher/repo/downloads before install | checkpoint:human-verify | manual npmjs.org confirmation | n/a | ⬜ pending |
| 133-01 T2 | 133-01 | 1 | PMA11Y-04 | T-133-SC | `axe-core`/`jest-axe` installed dev-only; `toHaveNoViolations()` globally registered | unit + config | `npx vitest run src/components/profile/MemberStatusPill.test.tsx && npm run typecheck` | ✅ | ⬜ pending |
| 133-02 T1 | 133-02 | 1 | PMPF-06, PMPF-08 | T-133-01 | `dangerouslyAllowLocalIP` false in production; `images.qualities` explicit | config probe | `node -e "process.env.NODE_ENV='production'; import('./next.config.mjs')..."` | ✅ | ⬜ pending |
| 133-02 T2 | 133-02 | 1 | PMPF-06, PMPF-08 | T-133-01, T-133-02 | Env-gate + retained `localPatterns` regression-locked | unit (tdd) | `npx vitest run src/components/ui/ResponsiveImage.config.test.ts` | ✅ exists, extend | ⬜ pending |
| 133-03 T1 | 133-03 | 1 | PMUI-01, PMUI-02, PMUI-03, PMUI-06 | — | Hero panel responds to container width, not viewport | grep gate | `grep -c '@container member-profile-hero' src/components/profile/profile.module.css` | ✅ | ⬜ pending |
| 133-03 T2 | 133-03 | 1 | PMUI-01, PMUI-02, PMUI-03, PMUI-06 | — | Hero CSS-locking regression test matches new `@container` rules | unit (existing RTL) | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-04 T1 | 133-04 | 1 | PMUI-04, PMUI-05 | — | `LockedStageArtwork`/`LayeredBadgeArtwork` modules extracted, ≤450 lines | grep gate | `grep -c '\bstyles\.' src/components/profile/MemberBadgeChain.tsx` | ✅ | ⬜ pending |
| 133-04 T2 | 133-04 | 1 | PMUI-04, PMUI-05 | — | Badge-chain test suite green against post-split module layout | unit (existing RTL) | `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-05 T1 | 133-05 | 2 | PMA11Y-02, PMA11Y-03, PMA11Y-04 | — | Inactive carousel slides `inert`; focus moves into grid on expand | unit (tdd, RTL userEvent) | `npx vitest run src/components/ui/FocalCarousel.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-05 T2 | 133-05 | 2 | PMA11Y-02, PMA11Y-03, PMA11Y-04 | — | Zero axe violations across collapsed/expanded/quiet states | unit + axe | `npx vitest run src/components/ui/FocalCarousel.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-06 T1 | 133-06 | 2 | PMA11Y-01, PMA11Y-04 | — | Memorial hero renders exactly one `<h1>` | unit (tdd, RTL) | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-06 T2 | 133-06 | 2 | PMA11Y-01, PMA11Y-04 | — | Zero axe violations on memorial + public hero variants | unit + axe | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-07 T1 | 133-07 | 2 | PMUI-01..07 | — | `AnimeProjectStage`/`PointsAchievementStage` extracted with local containers | grep gate | `grep -c 'max-width: 700px\|max-width: 900px\|max-width: 520px' src/components/profile/AnimeProjectStage.module.css src/components/profile/PointsAchievementStage.module.css` | ✅ | ⬜ pending |
| 133-07 T2 | 133-07 | 2 | PMUI-01..07 | — | `MembershipStage`/`ContributionAchievementStage` extracted; tests updated | unit (existing RTL) | `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-08 T1 | 133-08 | 3 | PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMUI-07 | — | `BadgeFamilyCard.module.css` extracted; 820px magic number is a single JS constant | grep gate | `grep -c "'(max-width: 820px)'" src/components/profile/MemberBadgeChain.tsx` | ✅ | ⬜ pending |
| 133-08 T2 | 133-08 | 3 | PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMUI-07 | — | `BadgeChip.module.css` extracted; tests updated | unit (existing RTL) | `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-09 T1 | 133-09 | 4 | PMUI-01..06, PMPF-06 | — | Duplicate role-card selectors resolved to exactly one canonical rule each | grep gate | `grep -c '\.roleLabel {' src/components/profile/RoleBadgeCard.module.css` | ✅ | ⬜ pending |
| 133-09 T2 | 133-09 | 4 | PMUI-01..06, PMPF-06 | — | Shell ≤450 lines; zero unjustified `!important`; `sizes`/geometry reviewed | wc/grep gate + unit | `wc -l <all 10 split modules> && grep -rn '!important' <9 extracted modules>; npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ exists, extend | ⬜ pending |
| 133-10 T1 | 133-10 | 5 | PMPF-06, PMPF-08 | — | Fresh image-byte baseline captured for both seed profiles | script-driven (Playwright) | `test -f /tmp/phase133-image-baseline/post-change-sheppert.json && test -f .../post-change-csubs-leader.json` | ✅ script exists, extend | ⬜ pending |
| 133-10 T2 | 133-10 | 5 | PMPF-06, PMPF-08 | T-133-01 (unrelated, same ASVS pass) | Locked `imageWaterfall` budget passes on the current frontend state | script-driven (Playwright) [latency exception, see Sampling Rate] | `node scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir /tmp/phase133-image-lock-verify` | ✅ script exists, extend | ⬜ pending |
| 133-11 T1 | 133-11 | 6 | PMUI-01, PMUI-06 | — | `pageOverflow`/`bodyOverflow` is a hard budget-check gate, not just recorded | script-driven (Playwright) [latency exception, see Sampling Rate] | `node scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir /tmp/phase133-final-gate` | ✅ capture exists, extend | ⬜ pending |
| 133-11 T2 | 133-11 | 6 | PMUI-01..07, PMA11Y-01..04, PMPF-06, PMPF-08 | — | Full cross-plan regression gate (typecheck/lint/test/budget-check) green | unit + script-driven | `npm run typecheck && npm run lint && npm test` (+ budget-check re-run) | ✅ | ⬜ pending |
| 133-12 T1 | 133-12 | 7 | PMUI-01, PMUI-02, PMUI-03, PMUI-06 | — | Human-confirmed no visual regression at narrow/intermediate/wide/400% zoom | manual (D-06) | n/a — human-check | n/a | ⬜ pending |
| 133-12 T2 | 133-12 | 7 | PMA11Y-01..04 | — | Human-confirmed keyboard-only/zoom/screen-reader operability | manual (D-12) | n/a — human-check | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Synced to the final PLAN.md set (2026-08-16, revision iteration 1). Task/Plan/Wave columns reflect
the actual generated plans; statuses remain pending until `/gsd:execute-phase 133` runs each task.*

---

## Wave 0 Requirements

Wave 0 work was folded into Plan 133-01 (Wave 1, no dependencies) rather than kept as a separate
wave, since it has no in-phase predecessor and every later a11y-touching plan depends on it.

- [x] `npm install --save-dev axe-core jest-axe` (frontend) + a shared test-setup helper (`frontend/src/test/axeSetup.ts`) registering `expect.extend(toHaveNoViolations)` — delivered by Plan 133-01 Task 2, gated by Plan 133-01 Task 1's Package Legitimacy checkpoint.
- [x] Decide and record the canonical `.roleLabel`/`.roleBadgeRow`/`.roleHeroArtwork`/`.roleProgressTrack` resolved values — locked in `133-UI-SPEC.md`'s "Duplicate-selector resolution" table and executed by Plan 133-09 Task 1.
- [x] Decide the `MemberProfileMemorialHero` duplicate-heading fix — locked in `133-UI-SPEC.md`'s "Heading hierarchy decision" and executed by Plan 133-06 Task 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Per-section visual spot-check (narrow / intermediate / wide / 400% zoom) | PMUI-01, PMUI-02, PMUI-03, PMUI-06 (D-06) | CSS regressions are hard to catch automatically; this phase adds spot-checks in addition to unit tests, ahead of the authoritative Phase-134 bundled UAT | Resize browser to narrow/intermediate/wide breakpoints and to 400% zoom for each touched section; confirm no overflow/clipping and readable German text with correct umlauts — executed as Plan 133-12 Task 1 |
| Keyboard-only, 400% zoom, and screen-reader spot-check | PMA11Y-01..04 (D-12) | Automated axe checks catch static violations but not full interaction/AT behavior; combined evidence is required | Tab through carousel/paging/preview/disclosure controls with keyboard only; verify visible focus, correct announced names/state; spot-check with a screen reader at default and 400% zoom — executed as Plan 133-12 Task 2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Plan 133-12's two tasks are manual `checkpoint:human-verify` by design, per D-06/D-12)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the two manual checkpoints in Plan 133-12 are the phase's final wave, preceded by 22 consecutive automated-verify tasks)
- [x] Wave 0 covers all MISSING references (folded into Plan 133-01, see Wave 0 Requirements above)
- [x] No watch-mode flags
- [x] Feedback latency < 60s for all per-task-commit automated verifies; the two `--mode budget-check` invocations that exceed 60s are explicitly scoped to phase-gate frequency only (see Sampling Rate's Accepted latency exception)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (synced to final PLAN.md set, revision iteration 1, 2026-08-16)
