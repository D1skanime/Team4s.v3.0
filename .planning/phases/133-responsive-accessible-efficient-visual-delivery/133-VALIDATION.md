---
phase: 133
slug: responsive-accessible-efficient-visual-delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
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

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | PMA11Y-04 | — | N/A | unit (axe) | `npm install --save-dev axe-core jest-axe` + shared setup | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PMUI-04/05/07 | — | N/A | unit (existing RTL) | `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | 1 | PMA11Y-01 | — | N/A | unit + axe | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` | ✅ exists, extend | ⬜ pending |
| TBD | TBD | 1 | PMA11Y-02/03 | T-133-01 (SSRF, unrelated but same ASVS pass) | N/A | unit (RTL userEvent) + axe | `npx vitest run src/components/ui/FocalCarousel.test.tsx` | ✅ exists, extend | ⬜ pending |
| TBD | TBD | 1 | PMPF-06/08 | T-133-02 (dangerouslyAllowLocalIP SSRF) | `images.localPatterns` restricted, `dangerouslyAllowLocalIP` env-gated | script-driven (Playwright) | `node frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir <dir>` | ✅ script exists, extend | ⬜ pending |
| TBD | TBD | 1 | PMUI-01/06 | — | N/A | manual + existing capture | `node frontend/scripts/collect-member-profile-evidence.mjs` (`pageOverflow`/`bodyOverflow`) | ✅ capture exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Note: Task IDs/Plan/Wave columns are TBD — the planner fills these in once PLAN.md files are generated with concrete task numbering.*

---

## Wave 0 Requirements

- [ ] `npm install --save-dev axe-core jest-axe` (frontend) + a shared test-setup helper (e.g. `frontend/src/test/axeSetup.ts`) registering `expect.extend(toHaveNoViolations)` — no such setup file exists yet; `vitest.config.ts` has no `setupFiles` entry today.
- [ ] Decide and record the canonical `.roleLabel`/`.roleBadgeRow`/`.roleHeroArtwork`/`.roleProgressTrack` resolved values in `MemberBadgeChain.module.css` before extraction — this is a content decision (which of the duplicate/conflicting definitions wins), not purely mechanical, and must be locked before the CSS split.
- [ ] Decide the `MemberProfileMemorialHero` duplicate-heading fix (renders member name as both `<h1>` via `PageHeader` and `<h2>`) before writing its heading-hierarchy test.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Per-section visual spot-check (narrow / intermediate / wide / 400% zoom) | PMUI-01, PMUI-02, PMUI-03, PMUI-06 (D-06) | CSS regressions are hard to catch automatically; this phase adds spot-checks in addition to unit tests, ahead of the authoritative Phase-134 bundled UAT | Resize browser to narrow/intermediate/wide breakpoints and to 400% zoom for each touched section; confirm no overflow/clipping and readable German text with correct umlauts |
| Keyboard-only, 400% zoom, and screen-reader spot-check | PMA11Y-01..04 (D-12) | Automated axe checks catch static violations but not full interaction/AT behavior; combined evidence is required | Tab through carousel/paging/preview/disclosure controls with keyboard only; verify visible focus, correct announced names/state; spot-check with a screen reader at default and 400% zoom |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
