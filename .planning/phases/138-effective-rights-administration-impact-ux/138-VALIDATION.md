---
phase: 138
slug: effective-rights-administration-impact-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-23
---

# Phase 138 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Go `testing` + `testify` (`github.com/stretchr/testify`) |
| **Framework (frontend)** | Vitest 3 |
| **Config file** | `frontend/vitest.config.ts` (existing, path alias `@` configured there) |
| **Quick run command (backend)** | `docker compose exec team4sv30-backend go test ./internal/handlers/... ./internal/services/... ./internal/permissions/... -run 'EffectiveRights\|Capability\|Claim' -count=1` |
| **Quick run command (frontend)** | `docker compose exec team4sv30-frontend npm test -- --run "src/app/admin/users/tabs/UserGroupRightsTab.test.tsx" "src/app/admin/role-capabilities/*.test.tsx"` |
| **Full suite command (backend)** | `docker compose exec team4sv30-backend go test ./... -count=1` |
| **Full suite command (frontend)** | `docker compose exec team4sv30-frontend npm test -- --run` |
| **Estimated runtime** | ~60-120s combined (quick), full suite longer |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick-run command above (backend or frontend, whichever the task touched)
- **After every plan wave:** Run both quick-run commands together
- **Before `/gsd:verify-work`:** Full backend + frontend suites must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|---------------------|--------------|--------|
| CAP-08 | Guided revoke shows all granting sources before recommending a scoped deny | unit (frontend component) | `npm test -- --run "UserGroupRightsTab"` (extend existing) | ✅ existing file, ❌ new assertions needed | ⬜ pending |
| CAP-08 | Backend enumerates granting_roles/specialized_grants correctly for a multi-source capability | unit (backend, already covered) | `go test ./internal/permissions/... -run TestEvaluateGroupRights` | ✅ `effective_rights_test.go` already covers this shape | ⬜ pending |
| CAP-09 | New impact-preview endpoint returns correct before/after per affected user, batched, no N+1 | integration (backend, new) | `go test ./internal/handlers/... -run TestAdminCapabilityImpactPreview` | ❌ Wave 0 — new handler + new test file | ⬜ pending |
| CAP-09 | Impact preview modal renders counts + expandable table | unit (frontend, new) | `npm test -- --run "RoleCapabilityImpactPreview"` | ❌ Wave 0 — new component + test | ⬜ pending |
| CAP-10 | Grant/RevokeCapability response distinguishes cache-reload success/failure | unit (backend, extend existing) | `go test ./internal/handlers/... -run TestAdminCapabilityHandler` | ✅ `admin_capability_handler_test.go` exists, ❌ new assertions for the extended response field | ⬜ pending |
| UADM-01 | `UserGroupRightsTab` consumes `GetEffectiveRights`, not the old heuristic endpoint | unit (frontend, rewrite existing) | `npm test -- --run "UserGroupRightsTab"` | ✅ `UserGroupRightsTab.test.tsx` exists, needs substantial rewrite (data source changes) | ⬜ pending |
| — (role holders) | New role-holder query returns correct (app_user, group) pairs, group-scoped correctly, no cross-group leakage | unit (backend, new) | `go test ./internal/repository/... -run TestListRoleHolders` | ❌ Wave 0 — new repository method + test | ⬜ pending |
| D-29 | Contribution tab shows correct episode + real version label, not `release_versions.id` | unit (frontend, extend existing) + unit (backend, extend existing) | `npm test -- --run "UserContributionsTab"`; `go test ./internal/repository/... -run TestListUserContributions` | ✅ both existing files, ❌ new assertions for the new fields | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/admin_capability_impact_handler_test.go` — covers CAP-09
- [ ] `backend/internal/repository/*_role_holders_test.go` (new file, name TBD at plan time) — covers the role-holder query
- [ ] `frontend/src/app/admin/role-capabilities/*ImpactPreview*.test.tsx` (new component + test) — covers CAP-09 UI
- [ ] Framework install: none — Vitest 3 and Go testing/testify are already installed and configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live cache-activation timing (persisted → cache-active window) | CAP-10 | No genuine async activation window exists in the current synchronous cache-reload path; confirming the UI never falsely claims "activating" requires manual UAT against the real reload behavior | Trigger a role→capability mutation in the admin UI, observe the UI status sequence, confirm it matches actual backend reload completion (not a simulated delay) |
| PlatformAdminGate remount data loss regression | UADM-01 (adjacent) | Known live UX finding (`.planning/notes/live-uat-ux-findings.md`); not easily unit-testable, requires browser reproduction | Navigate into the new effective-rights admin surfaces, trigger a PlatformAdminGate remount, confirm no in-progress form/edit state is lost |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
