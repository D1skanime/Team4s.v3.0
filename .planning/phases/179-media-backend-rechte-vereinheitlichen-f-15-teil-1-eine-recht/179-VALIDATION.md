---
phase: 179
slug: media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 179-xx-xx | TBD | TBD | D-10 | V4 | Upload custom-permission fallback removed; non-nil fake `mediaRepo` with `CanUpload=true` must now 403 | unit (httptest, fake repo) | `go test ./internal/handlers/... -run TestFansubGroupMediaUpload -v` | ❌ W0 — existing `fansub_media_permission_test.go` does not exercise the non-nil-mediaRepo fallback branch |
| 179-xx-xx | TBD | TBD | D-10 | V4 | Delete fallback (`can_delete_own`/`can_delete_all`) unchanged | regression | `go test ./internal/handlers/... -run TestFansubGroupMediaDelete -v` | ✅ existing |
| 179-xx-xx | TBD | TBD | D-11 | — | Every active group role still grants upload via baseline capability | regression | `go test ./internal/handlers/... -v` | ✅ existing |
| 179-xx-xx | TBD | TBD | D-12 | V4 | New `ActionReleaseThemeAssetUpload` grants the same 11 roles; old `ActionReleaseVersionMediaUpload` no longer gates these handlers | unit (httptest, fake resolver/repo) | `go test ./internal/handlers/... -run TestAdminContentReleaseThemeAsset -v` | ❌ W0 — needs new/updated cases in `admin_content_release_theme_assets_test.go` |
| 179-xx-xx | TBD | TBD | D-12 | — | Migration 0182 applies/rolls back cleanly, seeds exactly the 11 verified roles | integration (real Postgres via migration runner) | `cd backend && go run ./cmd/migrate up` + DB assertion query | ❌ W0 |
| 179-xx-xx | TBD | TBD | D-13 | V4 | Non-admin -> upload controls hidden/flag false; admin -> flag true | unit (React component test, Vitest) | `cd frontend && npm test -- AnimeJellyfinAssetUploadControls` | ❌ W0 — no test file exists for this component today |
| 179-xx-xx | TBD | TBD | D-14 | V2 (Tampering) | Shared soft-delete helper: both tables exclude soft-deleted rows after delete; `updated_at`-set-vs-not difference preserved per table | integration (real Postgres) | `go test ./internal/repository/... -run SoftDelete -v` | ✅ partial — `release_version_media_repository_test.go:205` exists for release side; fansub-group-media side + shared-helper assertions are W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs/Plan/Wave columns are placeholders — the planner fills these in against the actual PLAN.md task breakdown.*

---

## Wave 0 Requirements

- [ ] New httptest case in `fansub_media_permission_test.go` (or new file) asserting the upload fallback no longer grants access with a non-nil fake `mediaRepo` returning `CanUpload: true` — this is D-10's actual regression proof; the existing nil-repo test does not cover it.
- [ ] New/updated cases in `admin_content_release_theme_assets_test.go` reusing `releaseThemeAssetDeniedResolverStub`/`releaseThemeAssetRepoStub` asserting both theme-asset handlers check `ActionReleaseThemeAssetUpload`, not `ActionReleaseVersionMediaUpload`.
- [ ] New repository test (new `media_soft_delete_test.go` or appended to `release_version_media_repository_test.go`) exercising the shared helper against BOTH `fansub_group_media` and `release_version_media`, including the `updated_at`-set-vs-not difference.
- [ ] New `AnimeJellyfinAssetUploadControls.test.tsx` — no test file for this component exists today.
- [ ] Migration 0182 up/down fresh-apply verification (reversible migration, fresh up/down proof).

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 items above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner/checker once plans close these gaps)

**Approval:** pending
