---
phase: 68
slug: badge-engine-archiv-entdeckung
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 68-01-01 | 01 | 1 | P68-SC1 | T-68-01-01 | RevokeMemberBadge-SQL enthält `AND status = 'active'`; kein visibility-UPDATE | unit | `cd C:/Users/admin/Documents/Team4s/backend && go build ./internal/services/... ./internal/repository/... && go test ./internal/services/... -run "TestComputeFirstContribution\|TestComputeProductiveTiers\|TestComputeAllRounder\|TestComputeVerified\|TestRecomputeKeepsHiddenVisibility\|TestRevokeBadge" -v -count=1` | ❌ W0 | ⬜ pending |
| 68-01-02 | 01 | 1 | P68-SC1 | T-68-01-02 | Badge-Trigger nach Create/Update/Delete; member_id VOR Delete gelesen | build | `cd C:/Users/admin/Documents/Team4s/backend && go build ./... 2>&1 \| head -30` | ❌ W0 | ⬜ pending |
| 68-02-01 | 02 | 1 | P68-SC2 | T-68-02-01 T-68-02-03 | DeleteGroupHistory prüft fansub_group_id-Zugehörigkeit (WHERE id=$1 AND fansub_group_id=$2 oder GetByID-Check); Nicht-Leader → 403 | unit | `cd C:/Users/admin/Documents/Team4s/backend && go build ./... 2>&1 \| head -20 && go test ./internal/handlers/... -run "TestDeleteGroupHistory\|TestCreateGroupHistory" -v -count=1 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 68-02-02 | 02 | 1 | P68-SC2 | T-68-02-02 | Frontend-Build fehlerfrei; GroupHistorySection rendert | build | `cd C:/Users/admin/Documents/Team4s/frontend && npm run build 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 68-03-01 | 03 | 2 | P68-SC3 | T-68-03-01 T-68-03-03 | SearchMembers enthält alle 3 Sichtbarkeits-WHERE-Bedingungen; alle Filter über pgx-Parameters | unit | `cd C:/Users/admin/Documents/Team4s/backend && go build ./... 2>&1 \| head -20 && go test ./internal/repository/... -run "TestArchive" -v -count=1 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 68-03-02 | 03 | 2 | P68-SC3 P68-SC1 | T-68-03-02 T-68-03-04 | page<1 → normiert auf 1; /archiv ohne Auth erreichbar (kein authMiddleware); MemberBadgeChips BADGE_LABELS enthält 6 neue Codes | build | `cd C:/Users/admin/Documents/Team4s/frontend && npm run build 2>&1 \| tail -30` | ❌ W0 | ⬜ pending |
| 68-04-01 | 04 | 3 | P68-SC1 P68-SC2 P68-SC3 | T-68-04-01 | go build + alle Tests grün; npm run build exit 0 | build+unit | `cd C:/Users/admin/Documents/Team4s/backend && go build ./... && go test ./internal/services/... ./internal/handlers/... ./internal/repository/... -v -count=1 2>&1 \| tail -40` | ✅ auto | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Badge-Engine: Tabellen-getriebene Tests für jede neue Badge-Regel (Schwellen 10/25/50, Allrounder 3, Erster Beitrag, Verifiziert) — gewährt/entzogen. Abgedeckt durch Task 68-01-01 (`go test ./internal/services/... -run TestComputeFirstContribution|TestComputeProductiveTiers|TestComputeAllRounder|TestComputeVerified|TestRecomputeKeepsHiddenVisibility|TestRevokeBadge`).
- [x] Recompute-Trigger: Test, dass Contribution create/update/delete den Badge-Service auslöst. Abgedeckt durch Task 68-01-02 (Build-Test + Compilation prüft Verdrahtung; Integration via 68-04-01 Full-Suite).
- [x] Archiv-Suche: Repository-Test für UND-verknüpfte Filter (Rolle/Zeitraum/Gruppe) + Nur-öffentlich-Sichtbarkeit + Pagination. Abgedeckt durch Task 68-03-01 (`go test ./internal/repository/... -run TestArchive`).
- [x] Gruppen-Meilensteine: Handler-Test für Leader-CRUD (create/update/delete) inkl. Auth/Leader-Check. Abgedeckt durch Task 68-02-01 (`go test ./internal/handlers/... -run TestDeleteGroupHistory|TestCreateGroupHistory`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/archiv`-Seite Darstellung der Profil-Karten + Pagination | P68-SC3 | Visuelle/Layout-Prüfung | Seite öffnen, Filter setzen, Karten + Load-More prüfen |
| Inline-Meilenstein-Timeline in `manage/groups/[id]` | P68-SC2 | UI-Interaktion (Inline-CRUD) | Eintrag anlegen/bearbeiten/löschen, Timeline-Sortierung prüfen |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
