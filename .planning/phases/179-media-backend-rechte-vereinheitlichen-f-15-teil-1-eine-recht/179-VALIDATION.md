---
phase: 179
slug: media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-10
---

# Phase 179 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | Go's built-in `testing` + `testify` (`require`/`assert`) + `httptest` |
| **Backend config file** | none (standard `go test`, no special config) |
| **Backend quick run command** | `cd backend && go test ./internal/handlers/... ./internal/repository/... ./internal/permissions/...` |
| **Backend full suite command** | `cd backend && go test ./...` |
| **Frontend framework** | Vitest 3 (`frontend/vitest.config.ts`) |
| **Frontend quick run command** | `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` |
| **Frontend full suite command** | `cd frontend && npm test` |
| **Estimated runtime** | ~30-60s backend targeted, ~3-5min full backend suite; ~10-20s frontend targeted |

---

## Sampling Rate

- **After every task commit:** Run the targeted `go test ./internal/handlers/... -run <TestName>` or `./internal/repository/... -run <TestName>` for the touched package; `npm test -- <file>` for the one touched frontend component.
- **After every plan wave:** `cd backend && go test ./...` and `cd frontend && npm test` (full suites).
- **Before `/gsd:verify-work`:** Full backend + frontend suites green, plus `go build ./...` and `git diff --check` (matches Phase 178's documented closing-gate pattern).
- **Max feedback latency:** ~60 seconds (targeted test run).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|--------------------|-------------|--------|
| 179-01-T1 | 179-01 | 1 | D-12 | — | Migration 0182 seeds `release_version_theme_asset.upload` for exactly the 11 verified roles, applies/rolls back cleanly | integration (real Postgres, full-chain fresh-apply proof) | `cd backend && go test ./internal/migrations/... -run TestPhase134MigrationFreshUpDownProof -v` | ✅ W0 closed in-plan |
| 179-01-T2 | 179-01 | 1 | D-12 | V4 | `ActionReleaseThemeAssetUpload` registered in `allKnownActions`, fail-closed startup check still passes | unit + startup check | `cd backend && go build ./... && go test ./internal/permissions/... -v` | ✅ W0 closed in-plan |
| 179-01-T3 | 179-01 | 1 | D-12 | — | 9 hardcoded "complete capability catalog" test fixtures repaired so `go test ./...` doesn't break on the new action | regression | `cd backend && go test ./...` | ✅ W0 closed in-plan (fixture repair discovered during planning, not in original research) |
| 179-02-T1 | 179-02 | 2 | D-12, D-06 | Tampering (response-write) | Shared `persistReleaseThemeAsset` extracted; success response written exactly once (by caller, not the shared method) | unit (httptest) | `cd backend && go build ./... && go test ./internal/handlers/... -run TestReleaseThemeAsset -v` | ✅ W0 closed in-plan (incl. double-write guard added during plan-checker revision) |
| 179-02-T2 | 179-02 | 2 | D-12 | V4 | Both theme-asset handlers check `ActionReleaseThemeAssetUpload`, not `ActionReleaseVersionMediaUpload`; negative test with `RoleProjectLead`-without-new-action proves the swap has teeth | unit (httptest, fake resolver/repo) | `go test ./internal/handlers/... -run TestAdminContentReleaseThemeAsset -v` | ✅ W0 closed in-plan |
| 179-03-T1 | 179-03 | 1 | D-10 | V4 (Elevation of Privilege) | Upload-only custom-permission fallback removed from `fansub_media_upload.go`; delete-path fallback in `fansub_media_delete.go` untouched | source + build | `cd backend && go build ./...` | ✅ W0 closed in-plan |
| 179-03-T2 | 179-03 | 1 | D-10, D-11 | V4 | Real-Postgres regression: seeded `can_upload=true` custom-permission row no longer grants access; every active group role still grants upload via baseline capability | integration (real Postgres) | `cd backend && go test ./internal/handlers/... -run TestFansubGroupMediaUpload -v` | ✅ W0 closed in-plan |
| 179-04-T1 | 179-04 | 1 | D-14, D-06 | Tampering (SQL table-name interpolation) | Shared soft-delete helper unifies both tables via Go string literals only (no request-derived table names); `updated_at`-set-vs-not difference preserved | source + build | `cd backend && go build ./...` | ✅ W0 closed in-plan |
| 179-04-T2 | 179-04 | 1 | D-14 | V2 (Tampering) | Both `fansub_group_media` and `release_version_media` soft-delete paths proven via the shared helper, including the `updated_at` divergence | integration (real Postgres) | `cd backend && go test ./internal/repository/... -run SoftDelete -v` | ✅ W0 closed in-plan |
| 179-05-T1 | 179-05 | 1 | D-13 | V4 | Non-admin → upload controls hidden/flag false; admin → flag true | unit (React component test, Vitest, TDD) | `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` | ✅ W0 closed in-plan (first test file for this component) |
| 179-06-T1 | 179-06 | 3 | D-01–D-14 | — | Full backend + frontend suites green, `go build ./...`, `git diff --check`, migration fresh/down proof across the whole phase | gate | `cd backend && go test ./... && go build ./...`; `cd frontend && npm test`; `git diff --check` | ✅ phase-closing gate |

*Status: ✅ closed-in-plan means the Wave 0 gap identified before planning is now a concrete task inside a Wave 1/2 plan, not a separate deferred Wave 0 plan — satisfies Nyquist Check 8a/8d by construction (confirmed by gsd-plan-checker, 0 blockers).*

---

## Wave 0 Requirements

All 5 gaps identified before planning are closed — each is now an explicit task (with its own
`<acceptance_criteria>` and `<verify><automated>`) inside the corresponding Wave 1/2 plan, rather
than deferred to a separate Wave 0 plan:

- [x] Upload-fallback regression test → `179-03` Task 2 (real-Postgres, seeded `can_upload=true` row proven non-granting).
- [x] Theme-asset action-swap test cases → `179-02` Task 2 (negative test via `RoleProjectLead` without the new action).
- [x] Shared soft-delete helper test (both tables) → `179-04` Task 2.
- [x] `AnimeJellyfinAssetUploadControls.test.tsx` → `179-05` Task 1 (TDD task).
- [x] Migration 0182 up/down fresh-apply proof → `179-01` Task 1 (`TestPhase134MigrationFreshUpDownProof`).

Additionally, `179-01` Task 3 covers a gap discovered during planning (not listed in the original
research): 9 hardcoded "complete capability catalog" test fixtures across
`handlers`/`services`/`repository`/`permissions` that would otherwise break `go test ./...` the
moment the new action is registered.

---

## Manual-Only Verifications

*None — all phase behaviors (D-10 through D-14) have automated verification per the map above.*

---

## Security Domain (from Research)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V4 Access Control | Yes | `permissions.Service` capability-registry checks (`CanForFansubGroup`/`CanForRelease`); core subject matter of this phase |
| V5 Input Validation | Partial | Existing `validVisibilityCodes`/`validReviewStatusCodes` whitelist checks (unchanged); new migration SQL uses only static, non-user-controlled identifiers |
| V2 Authentication | No (unchanged) | Existing `middleware.AuthIdentity` / Keycloak session handling, not touched |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Privilege escalation via stale/duplicate rights-check path | Elevation of Privilege | D-10 fixes exactly this (two parallel rights layers for upload) — mitigation is collapsing to one authoritative check |
| SQL injection via table-name interpolation in the new shared soft-delete helper | Tampering | Table name and key-predicate strings passed to the shared helper MUST remain Go string literals supplied by the two call sites, never derived from request/user input |
| Server starts with a half-applied migration/registry mismatch, masking an access-control gap | DoS / fail-open risk | Existing `validateCapabilityCatalog` fail-closed startup check catches a Go-constant-without-DB-row mismatch |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 items above, all closed in-plan)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-10 (gsd-plan-checker: 0 blockers, 3 warnings — 2 resolved via targeted plan edits (179-02 Task 1 response-write clarification + acceptance criterion, 179-01 umlaut fix in `description_de`), 1 (179-01's 12-file count) explicitly flagged by the checker as awareness-only, no split required)
