---
phase: 54
slug: globale-nav-drawer-und-layout-verdrahtung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 + @testing-library/react + jsdom |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~10 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 0 | D-01, D-02, D-07 | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-01 | — | 1 | D-01 | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ✅ erweitern | ⬜ pending |
| 54-0x-02 | — | 1 | D-02, D-04 | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-03 | — | 1 | D-07 ESC | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-04 | — | 1 | D-07 Backdrop | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-05 | — | 1 | D-08 anonym | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-06 | — | 1 | D-08 eingeloggt | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-07 | — | 1 | D-15 | T-54-01 | `canAccessAdmin`-Prop aus Backend-Capabilities; kein Token als Prop | unit | `npx vitest run AppShell.test.tsx` | ✅ erweitern | ⬜ pending |
| 54-0x-08 | — | 1 | D-16 Avatar | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-09 | — | 1 | D-16 Initialen-Fallback | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-10 | — | 1 | D-18 Focus-Trap | — | N/A | unit | `npx vitest run AppShell.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 54-0x-11 | — | 2 | D-12 Root-Layout | — | N/A | smoke | manuell: /me/profile prüfen | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/layout/AppShell.test.tsx` — neue Testfälle für Slide-over (D-01), Edge-Strip (D-02, D-04), ESC (D-07), Backdrop-Klick (D-07), Dual-State anonym/eingeloggt (D-08), Avatar + Initialen-Fallback (D-16), Focus-Trap (D-18)
- [ ] `frontend/src/components/layout/AppShellClientWrapper.test.tsx` — Wrapper-Tests für auth-state-Routing (Server/Client-Grenze, D-13)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Root-Layout-Integration — kein doppelter Shell-Render auf `/me/profile` | D-12 | jsdom kann kein echtes Root-Layout rendern | Browser öffnen, `/me/profile` aufrufen (eingeloggt), prüfen ob nur eine Shell sichtbar ist |
| Desktop Edge-Strip am linken Rand sichtbar und Hover öffnet Drawer | D-02 | Hover-Events über jsdom nicht zuverlässig für visuelle Prüfung | Desktop-Breakpoint (>860px), Maus über linken Rand bewegen |
| Glassmorphism-Look (Drawer halbtransparent, blur) | D-05 | Visuell nicht automatisierbar | `/dev/ui-system` Drawer-Demo öffnen, visuell prüfen |

---

## Threat Map

| Threat ID | Pattern | STRIDE | Mitigation | Plan | Wave |
|-----------|---------|--------|------------|------|------|
| T-54-01 | Admin-Nav ohne Capability-Check | Elevation of Privilege | `canAccessAdmin`-Prop aus Backend-Capabilities (D-15); Route bleibt server-seitig geschützt | AppShell | 1 |
| T-54-02 | Token in UI-Props übergeben | Information Disclosure | Token-free UI Boundary per `auth-api-client.md`; kein `authToken` als Prop an Shell übergeben | AppShellClientWrapper | 1 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
