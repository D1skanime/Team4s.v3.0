---
phase: 121
slug: rollen-badges-visuell-und-funktional-perfektionieren
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-10
---

# Phase 121 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Testing Library, TypeScript/Next.js checks |
| **Config file** | `frontend/vitest.config.ts`, `frontend/package.json` |
| **Quick run command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the focused tests for the files touched by that task.
- **After every plan wave:** Run the full Phase-121 regression command above.
- **Before `$gsd-verify-work`:** Focused suite, frontend typecheck, lint, feasible build and `git diff --check` must be green.
- **Max feedback latency:** 90 seconds for focused automated feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 121-01-01 | 01 | 1 | D-02/D-03/D-12/D-18/D-23 | T-121-01/T-121-03 | Earned-only Rollenfamilien und kanonische Schwellen bleiben unverändert | unit/component | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` | ✅ | ⬜ pending |
| 121-01-02 | 01 | 1 | D-12/D-20/D-23 | T-121-02 | Track-Zustände sind semantisch und ohne künstliche Interaktion verständlich | component/a11y | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx` | ✅ | ⬜ pending |
| 121-02-01 | 02 | 2 | D-04–D-21 | T-121-04/T-121-05 | Bestehende Seams und laufzeitfreie Track-Mechanik | component/regression | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` | ✅ | ⬜ pending |
| 121-02-02 | 02 | 2 | D-04/D-08–D-10/D-15–D-21 | T-121-06/T-121-07 | Same-DOM und unveränderter Shared-Carousel-Vertrag | component/regression | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | ✅ | ⬜ pending |
| 121-03-01 | 03 | 3 | D-24/D-25/D-26/D-28 | T-121-08/T-121-09/T-121-10/T-121-11 | Nur echte Gate-/Browserergebnisse; Shared- und Live-Regression | regression/live-UAT | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | ✅ | ⬜ pending |
| 121-03-03 | 03 | 3 | D-24/D-25/D-26/D-28 | T-121-08/T-121-09 | Bericht und PNG-Evidence technisch reproduzierbar | artifact/metadata | `docker compose run --rm --no-deps -T -v "$PWD:/workspace:ro" -w /app team4sv30-frontend node /workspace/.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/validate-uat.mjs &amp;&amp; git diff --check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Fixture aller 11 unterstützten Rollenfamilien, Ausschluss fremder Rollen und Unterstrichcodes.
- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` — genau fünf Track-Stationen mit erreicht/aktuell/gesperrt, `aria-current`, sichtbarem Status und ohne zusätzliche Tabstopps.
- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Einstieg/Bronze/Silber/Gold/Platin, echter Count über 510 und Timing-Direktasset im Hero.
- [ ] `frontend/src/components/profile/MemberBadgeChain.test.tsx` und `frontend/src/components/ui/FocalCarousel.test.tsx` — aktive/inaktive/expanded Darstellung ohne Remount-Vertrag sowie bestehende Navigation/Reduced Motion.
- [ ] Live-UAT-Checkliste für 390/768/1024/1440 px und die sechs in D-25 genannten Rollen.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visuelle Dominanz, Proportionen, transparente Asset-Ränder und lesbarer Track | D-08/D-09/D-15–D-19/D-25 | Visuelle Qualität und tatsächliche Asset-Geometrie sind nicht vollständig durch DOM-Verträge messbar | Über die sichtbare Memberprofilroute in der Codex-In-App-Browser-Sitzung Übersetzung, Timing, Encoding, Typesetting, Projektleitung und Administration bei 390/768/1024/1440 px prüfen; Screenshots und Abweichungen dokumentieren. |
| Keyboard, Fokus, Reduced Motion und Expanded Mode im echten Flow | D-04/D-10/D-20/D-24 | Browserintegration und wahrnehmbare Fokus-/Motion-Qualität | Prev/Next, direkte Nachbarwahl, Pfeile, Home/End, „Alle anzeigen“, Fokus-Rückgabe und reduzierte Bewegung live prüfen. |

---

## Validation Sign-Off

- [x] All planned task groups have automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 identifies all currently missing contracts.
- [x] No watch-mode flags.
- [x] Feedback latency target < 90s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-08-10 for planning; execution remains pending.
