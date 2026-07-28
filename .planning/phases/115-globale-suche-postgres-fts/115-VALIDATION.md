---
phase: 115
slug: globale-suche-postgres-fts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 115 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `115-RESEARCH.md` → `## Validation Architecture`. Per-task rows are filled by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: `go test` · Frontend: `vitest` |
| **Config file** | Frontend: `frontend/vitest.config.ts` · Backend: standard `go test` (per-package) |
| **Quick run command** | `cd backend && go test ./internal/...` · `cd frontend && npx vitest run` |
| **Full suite command** | `cd backend && go test ./...` · `cd frontend && npm run test` |
| **Estimated runtime** | ~TBD by planner |

> **NOTE (from RESEARCH Validation Architecture):** Go tests are predominantly pure-function / source-inspection — there is **no live-DB test harness**. The three data-model capabilities (D-12 title persistence, D-04/D-05 matching & ranking, D-11 visibility) are **not unit-testable** and require a live-DB integration test **or** a smoke script with a Keycloak token. The planner MUST resolve this (Wave 0) before those behaviours can be marked automated — otherwise they belong in *Manual-Only Verifications* below.

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched layer
- **After every plan wave:** Run the full suite for the touched layer
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** TBD by planner

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(filled by planner)_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Decide live-DB integration harness **or** Keycloak-token smoke script for the DB-behaviour validations (D-12 / D-04 / D-05 / D-11) — see RESEARCH open question 1
- [ ] Provide the fixture/seed path proving "Koe no Katachi" → "A Silent Voice" after the D-12 fix

*If none after planner resolution: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EXPLAIN ANALYZE uses new trigram/GIN index (not seq scan) | D-01 / D-09 | Query-plan inspection needs a live DB with representative data | Run the search query with `EXPLAIN ANALYZE`; assert `Bitmap Index Scan` on the new trigram index, extend `docs/performance/anime-search-query-plan-tracking.md` |
| Search "Koe no Katachi" / "Eiga Koe no Katachi" returns "A Silent Voice" | D-12 | Requires the title-storage fix applied + a re-enriched record in a live DB | After migration + fix + re-import, hit `/api/v1/search?q=Koe no Katachi`; assert the target anime appears |
| Exact match never displaced by popularity/recency | D-05 | Ranking correctness needs real multi-row data | Query a term with an exact main-title hit plus popular partial matches; assert the exact hit ranks first |
| disabled anime excluded, dissolved fansub groups included | D-11 | Visibility rule needs live rows in both states | Seed a `disabled` anime + `dissolved` group; assert the anime is absent and the group present in results |

*Planner may promote any of these to automated if a live-DB harness is chosen in Wave 0.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency documented
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
