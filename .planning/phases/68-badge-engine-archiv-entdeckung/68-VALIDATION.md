---
phase: 68
slug: badge-engine-archiv-entdeckung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test (Backend), vitest 3.x (Frontend) |
| **Config file** | none for Go; `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && go test ./internal/services/... ./internal/handlers/...` |
| **Full suite command** | `cd backend && go test ./... ; cd frontend && npm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | P68-SC1 | — | {expected secure behavior or "N/A"} | unit | `{command}` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(Filled in by the planner per task — derived from RESEARCH.md "Validation Architecture".)*

---

## Wave 0 Requirements

- [ ] Badge-Engine: Tabellen-getriebene Tests für jede neue Badge-Regel (Schwellen 10/25/50, Allrounder 3, Erster Beitrag, Verifiziert) — gewährt/entzogen.
- [ ] Recompute-Trigger: Test, dass Contribution create/update/delete den Badge-Service auslöst.
- [ ] Archiv-Suche: Repository-Test für UND-verknüpfte Filter (Rolle/Zeitraum/Gruppe) + Nur-öffentlich-Sichtbarkeit + Pagination.
- [ ] Gruppen-Meilensteine: Handler-Test für Leader-CRUD (create/update/delete) inkl. Auth/Leader-Check.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/archiv`-Seite Darstellung der Profil-Karten + Pagination | P68-SC3 | Visuelle/Layout-Prüfung | Seite öffnen, Filter setzen, Karten + Load-More prüfen |
| Inline-Meilenstein-Timeline in `manage/groups/[id]` | P68-SC2 | UI-Interaktion (Inline-CRUD) | Eintrag anlegen/bearbeiten/löschen, Timeline-Sortierung prüfen |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
