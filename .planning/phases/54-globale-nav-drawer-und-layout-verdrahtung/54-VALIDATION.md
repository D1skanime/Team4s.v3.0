---
phase: 54
slug: globale-nav-drawer-und-layout-verdrahtung
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-28
updated: 2026-05-29
---

# Phase 54 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 + @testing-library/react + jsdom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx src/components/layout/AppShellClientWrapper.test.tsx` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~3 seconds for the Phase 54 slice |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx src/components/layout/AppShellClientWrapper.test.tsx`
- **After every plan wave:** Run the same focused Phase 54 slice, then broaden to `npm run typecheck` and build when feasible.
- **Before `$gsd-verify-work`:** Phase 54 slice, typecheck/build, and browser smoke should be green or documented.
- **Max feedback latency:** 60 seconds for focused slice.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 0/1 | D-01, D-03, D-07, D-08, D-15, D-16, D-18 | T-54-01 | Drawer behavior and admin nav are controlled by props, not route guesses. | unit | `npx vitest run src/components/layout/AppShell.test.tsx` | yes | green |
| 54-01-02 | 01 | 1 | D-02, D-04, D-05, D-19 | -- | Edge-strip, focus, aria, and visual glass behavior remain scoped to AppShell UI. | unit + manual visual | `npx vitest run src/components/layout/AppShell.test.tsx` plus browser smoke | yes | green |
| 54-02-01 | 02 | 1 | D-13, D-15, D-16, D-17 | T-54-01, T-54-02 | Wrapper maps profile roles/avatar through existing token-free seams and clears stale props after logout. | unit | `npx vitest run src/components/layout/AppShellClientWrapper.test.tsx` | yes | green |
| 54-03-01 | 03 | 2 | D-10, D-11, D-12, D-13 | T-54-02 | Root layout remains a Server Component and profile page no longer nests its own shell. | smoke + static | Browser smoke on `/me/profile`; static source check | yes | green |
| 54-04-01 | 04 | 2 | D-08, D-16 | -- | UI-system demo uses dummy data and `canAccessAdmin={false}`. | smoke + static | Browser smoke on `/dev/ui-system` | yes | green |

*Status: pending / green / red / flaky*

---

## Generated Or Updated Tests

| File | Coverage Added |
|------|----------------|
| `frontend/src/components/layout/AppShellClientWrapper.test.tsx` | Authenticated vs anonymous shell mode, profile-to-shell mapping, public avatar URL resolution, admin capability mapping, and stale profile/admin clearing after logout. |
| `frontend/src/components/layout/AppShell.test.tsx` | Existing Phase 54 drawer behavior, Escape/backdrop close, anonymous/authenticated footer, avatar fallback, and admin nav gating coverage. |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Root-layout integration without nested shell on `/me/profile` | D-12 | jsdom does not render the full Next root layout with live routing. | Browser smoke: open `/me/profile` and confirm one shell, one drawer, one menu button. | pass |
| Desktop edge-strip hover opens drawer | D-02 | Hover affordance and exact visual strip presence require live viewport inspection. | Desktop viewport >860px, hover/focus the left edge strip and confirm drawer opens. | pass |
| Glassmorphism drawer appearance | D-05 | Blur/transparency quality is visual and not meaningfully asserted by jsdom. | Open `/dev/ui-system`, inspect the drawer demo screenshots/live page. | pass |

---

## Validation Audit 2026-05-29

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated/manual-only | 3 |

Resolved gap: `AppShellClientWrapper` now has focused unit coverage for auth-state routing, profile mapping, admin gating, avatar URL mapping, and stale-session cleanup.

---

## Validation Sign-Off

- [x] All tasks have automated verify coverage or documented manual-only coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 references are covered by existing or newly added tests
- [x] No watch-mode flags
- [x] Feedback latency < 60s for focused Phase 54 slice
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-29
