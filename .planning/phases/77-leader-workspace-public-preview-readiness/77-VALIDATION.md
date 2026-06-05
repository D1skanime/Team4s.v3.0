---
phase: 77
slug: leader-workspace-public-preview-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-05
---

# Phase 77 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Abgeleitet aus `77-RESEARCH.md` › Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (jsdom) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/app/admin/fansubs` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30–60 Sekunden (Schnell-Subset deutlich kürzer) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/app/admin/fansubs`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Befüllt der Planner/Executor mit konkreten Task-IDs. Die Req→Verhalten→Test-Zuordnung
> stammt aus `77-RESEARCH.md` › Validation Architecture › Phase-Anforderungen → Test-Map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Task 2 (page.test.tsx Capability-Gating) | 77-01 | 0 | F | T-77-EoP | Tab sichtbar nur bei `can_edit_group`/`can_edit_notes`; reine Mitgliedschaft → unsichtbar | unit | `npx vitest run src/app/admin/fansubs/\[id\]/edit/page.test.tsx` | ✅ vorhanden; neue Cases | ⬜ pending |
| Task 2 (canUseMainTab readiness=false) | 77-01 | 0 | F | T-77-EoP | `canUseMainTab("readiness")` → false wenn nur `can_view_members` | unit | wie oben | ✅ vorhanden; neue Cases | ⬜ pending |
| Task 1 (ReadinessTab.test.tsx read-only) | 77-01 | 0 | I | — | Preview-Komponente rendert read-only, keine Schreib-Interaktion | unit | `npx vitest run src/app/admin/fansubs/\[id\]/edit/ReadinessTab.test.tsx` | ❌ W0 | ⬜ pending |
| Task 1 (ReadinessTab.test.tsx Lock K) | 77-01 | 0 | K | — | Readiness-Tab ruft keinen neuen Endpunkt auf (nur bestehende API-Funktionen) | unit (Mock-Check) | wie oben | ❌ W0 | ⬜ pending |
| Task 1 (ReadinessTab.test.tsx D-04) | 77-01 | 0 | D-04 | T-77-EoP | Klick auf Sprungmarke → `router.replace` mit korrektem `?tab=` | unit | wie oben | ❌ W0 | ⬜ pending |
| Task 1 (ReadinessTab.test.tsx D-06) | 77-01 | 0 | D-06 | — | Claims-/Contributions-Zähler als informativ gerendert (kein „nicht bereit") | unit | wie oben | ❌ W0 | ⬜ pending |
| Task 1 (ReadinessTab.tsx implementieren) | 77-02 | 1 | F, I, K | T-77-02-EoP | ReadinessTab grün macht Wave-0-Tests grün; story-Item variant=info (kein warning) | unit | `npx vitest run src/app/admin/fansubs/\[id\]/edit/ReadinessTab.test.tsx` | ❌ neu | ⬜ pending |
| Task 2 (PublicPreviewPanel + CSS) | 77-02 | 1 | I, K | T-77-03-ID | PublicPreviewPanel read-only, TODO(Phase 73), CSS-Klassen vorhanden | unit + tsc | `npx vitest run src/app/admin/fansubs/\[id\]/edit/` | ❌ neu | ⬜ pending |
| Task 1 (page.tsx Eingriffe) | 77-03 | 2 | F, K | T-77-05-EoP | Tab verdrahtet, Gating korrekt, Formular-Ausschluss | unit | `npx vitest run src/app/admin/fansubs/\[id\]/edit/` | ✅ vorhanden | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` — deckt Req F, I, K, D-04, D-06 ab
- [ ] Mocks: `listPendingMemberClaims`, `listGroupMembers`, `getAdminFansubAnime`, `listAnimeContributions` als Vitest-Mocks analog zum `page.test.tsx`-Pattern

*Bestehende Infrastruktur (`page.test.tsx`) deckt Req F bereits teilweise ab — neue Cases ergänzen.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline-Preview entspricht visuell der anonymen Besucher-Sicht (D-01/D-02) | I | Visuelle Übereinstimmung mit `/fansubs/[slug]` ist nicht zuverlässig per Unit-Test prüfbar (Phase 73 noch nicht ausgeführt → Fallback-Rendering) | Live gegen Dev-Server :3000: Workspace-Readiness-Tab öffnen, Preview mit öffentlicher Seite vergleichen; nur öffentlich+freigegebene Inhalte sichtbar |
| Sprungmarken landen visuell auf dem korrekten Ziel-Tab/Abschnitt (D-04) | F | End-to-End Tab-Wechsel + Scroll-Ziel ist im Browser eindeutiger zu verifizieren | Live :3000: jede Readiness-Checklisten-Sprungmarke klicken, korrekten Ziel-Tab bestätigen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
