---
phase: 107
slug: vereinheitlichte-upload-pipeline-mediafileservice
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 107 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `testify v1.9.0`; Frontend Vitest `^3.2.4` |
| **Config file** | `backend/go.mod`; `frontend/package.json` |
| **Quick run command** | `cd backend && go test ./internal/services ./internal/repository ./internal/handlers -run "MediaFile|UploadReleaseVersionMedia|Fansub.*Media|ReleaseThemeAsset|MediaUpload|Profile.*(Avatar|Background|Story)"` |
| **Full suite command** | `cd backend && go test ./...` sowie `cd frontend && npm test && npm run typecheck && npm run lint` |
| **Estimated runtime** | Quick-Suite soll unter 30 Sekunden bleiben; volle Laufzeit wird beim ersten Wave-0-Lauf gemessen. |

---

## Sampling Rate

- **After every task commit:** Run the narrow package/file-specific command from the verification map; use the quick run command when more than one upload path changed.
- **After every plan wave:** Run `cd backend && go test ./...`; additionally run frontend tests/typecheck/lint when contracts or upload wrappers changed, plus migration up/down after schema work.
- **Before `$gsd-verify-work`:** Full backend and relevant frontend suites, disposable-DB migration up/down, container codec fixtures, auth-refresh regression and `git diff --check` must be green.
- **Max feedback latency:** 30 seconds for per-task sampling; longer DB/container gates run at wave boundaries.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 107-W0-01 | TBD | 0 | P107-ARCH-01 / D-05–D-09 | T-107-04, T-107-06 | Concurrent equal stored bytes create one global medium, preserve first owner and permit distinct usages without duplicate identical usage. | PostgreSQL integration/concurrency | `cd backend && go test ./internal/repository -run 'MediaCore.*(Dedup|Concurrent|Owner|Usage)'` | ❌ W0 | ⬜ pending |
| 107-W0-02 | TBD | 0 | P107-ARCH-01 / D-10–D-13 | T-107-07, T-107-08 | Injected stage, encode, DB, attach, promote and commit failures leave no attempt-owned rows or files; retry is idempotent. | service integration/failure injection | `cd backend && go test ./internal/services -run 'MediaFile.*(Rollback|Retry|Batch|Staging)'` | ❌ W0 | ⬜ pending |
| 107-W0-03 | TBD | 0 | P107-ARCH-01 / D-14–D-18 | T-107-01, T-107-02, T-107-03, T-107-10 | MIME mismatch, unsafe dimensions/pixels/frames, malformed files and parser timeouts fail uniformly; sanitized original and meaningful variants retain required animation/alpha. | fixture unit + container codec integration | `cd backend && go test ./internal/services -run 'MediaFile.*(Image|Video|Audio|MIME|Variant|Deterministic)'` | ❌ W0 | ⬜ pending |
| 107-W0-04 | TBD | 0 | P107-ARCH-01 / D-01–D-04 | T-107-05 | All six handlers delegate technical work to the one core; compatibility writes are explicitly allowlisted and removable in Phase 108. | source contract + handler | `cd backend && go test ./internal/handlers ./internal/services -run 'MediaFile|UploadDelegation|CompatibilityGate'` | ❌ W0 | ⬜ pending |
| 107-W0-05 | TBD | 0 | P107-ARCH-01 / release ownership | T-107-05 | Release-Version-Media uses a real `release_version_id`, retains source-group permission and never attaches process media to episodes or substitutes `release_media`. | handler/repository regression | `cd backend && go test ./internal/handlers ./internal/repository -run 'ReleaseVersionMedia'` | ✅ extend existing | ⬜ pending |
| 107-W0-06 | TBD | 0 | P107-ARCH-01 / D-12, D-18 | T-107-09 | All six routes serialize the documented per-file success/reused/error shape and machine-readable error codes. | contract/serialization | `cd backend && go test ./internal/handlers -run 'UploadResultContract'` | ❌ W0 | ⬜ pending |
| 107-W0-07 | TBD | 0 | P107-ARCH-01 / auth boundary | T-107-09 | Missing/expired access token plus valid refresh token uploads through `frontend/src/lib/api.ts`; no UI bearer construction and no duplicate replay. | frontend unit/security | `cd frontend && npx vitest run src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts` | ✅ extend existing | ⬜ pending |
| 107-W0-08 | TBD | 0 | P107-ARCH-01 / D-11 | T-107-03 | Requests for staging and traversal forms return 404 while ready hash paths remain available. | router security integration | `cd backend && go test ./cmd/server -run 'MediaStatic.*Staging'` | ❌ W0 | ⬜ pending |
| 107-W0-09 | TBD | 0 | P107-ARCH-01 / D-05, D-07, D-17 | T-107-04 | Append-only migration applies and reverses Phase-107-only constraints/adapter state; concurrent uniqueness is enforced by PostgreSQL. | migration content + up/down | `cd backend && go test ./internal/migrations -run 'MediaFilePipeline'` | ❌ W0 | ⬜ pending |

Threat references are defined in the required plan `<threat_model>` blocks; planners must map at least the following: T-107-01 MIME spoofing, T-107-02 decompression/codec DoS, T-107-03 path or staging disclosure, T-107-04 concurrent dedup race, T-107-05 cross-context ownership/IDOR, T-107-06 metadata overwrite, T-107-07 partial DB/filesystem failure, T-107-08 cleanup of shared files, T-107-09 auth/retry contract drift, T-107-10 sensitive metadata leakage.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/services/media_file_service_test.go` — validation profiles, stored-byte hash, metadata sanitization, deterministic output and variant rules.
- [ ] `backend/internal/services/media_file_service_failure_test.go` — injected stage/encode/DB/attach/promote/commit failures and exact compensation.
- [ ] `backend/internal/repository/media_core_repository_test.go` — unique conflict handling, first-owner preservation, concurrent deduplication and usage idempotency.
- [ ] `backend/internal/migrations/media_file_pipeline_schema_test.go` — post-Phase-106 readiness, append-only migration content and up/down behavior.
- [ ] `backend/internal/handlers/media_upload_result_contract_test.go` — shared response/error serialization across all six adapters.
- [ ] `backend/internal/handlers/media_upload_delegation_test.go` — no duplicate MIME/hash/thumbnail/storage mechanics outside the core; compatibility allowlist only.
- [ ] `backend/cmd/server/media_static_security_test.go` — staging is never exposed by static serving.
- [ ] Extend `frontend/src/lib/api.auth-refresh.test.ts` and `frontend/src/lib/api.no-token-boundary.test.ts` with upload-specific refresh-session and no-token-boundary cases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production-equivalent codec capability | P107-ARCH-01 / D-14–D-17 | Host lacks FFmpeg; actual codecs are supplied by the backend container image. | Rebuild the backend container, run the real GIF/WebP/video fixtures inside it, verify required encoders/demuxers are detected and unsupported profiles fail closed. |
| Existing upload surfaces remain usable | P107-ARCH-01 / D-01–D-04 | Phase 107 keeps current UI but migrates six backend entry points with different domain contexts. | Through the existing visible admin/member flows, upload one valid file per entry point and one invalid file; confirm progress, correct context relation, uniform error and no duplicate after retry. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency under 30 seconds for narrow checks
- [ ] Full DB/container/auth gates pass at wave boundaries
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
