---
phase: 113
slug: wiederholbare-leistungs-badges-bronze-silber-gold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 113 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: `go test`; Frontend: vitest 3.x |
| **Config file** | `frontend/vitest.config.ts` (frontend); Go module `backend/go.mod` |
| **Quick run command** | `{quick command — set during planning}` |
| **Full suite command** | `{full command — set during planning}` |
| **Estimated runtime** | ~{N} seconds |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | GAM-04 | — | {expected behavior} | unit | `{command}` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend: repository tests for the three derived-badge counters (coverage / chronist / bildarchivar) — net-of-storno + soft-delete invariants
- [ ] Frontend: catalog + rendering test for the new „Beiträge" group (earned-only, highest-tier-only, no toggle)

*Filled concretely during planning.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| {behavior} | GAM-04 | {reason} | {steps} |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
