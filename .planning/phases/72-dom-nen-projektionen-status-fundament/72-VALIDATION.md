---
phase: 72
slug: dom-nen-projektionen-status-fundament
status: approved
nyquist_compliant: true
wave_0_complete: true
validated: 2026-06-05
---

# Phase 72 - Validation Status

Nyquist-Audit nach Ausfuehrung: alle Phase-72-Anforderungen sind automatisiert abgedeckt. Die alte Pre-Execution-Map mit `pending`/W0-Markern wurde durch die tatsaechlich ausgefuehrte Coverage ersetzt.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Backend framework | Go `testing`, no-DB Source-Fragment-Tests unter `backend/internal/repository/*_test.go` |
| Frontend framework | Vitest 3 (`frontend/vitest.config.ts`) |
| Backend focused command | `cd backend && go test ./internal/repository/... -run "Test(V12StatusFoundation|Projection|MediaProjection)" -count=1` |
| Frontend contract command | `cd frontend && npx vitest run v12-projection-contract` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Diff hygiene | `git diff --check` |

## Nyquist Gap Audit

| Gap | Finding | Action | Status |
|-----|---------|--------|--------|
| GET-only runtime routes | Verification documented this, but existing Go tests did not fail on accidental POST/PATCH/PUT/DELETE route registration for the new projection paths. | Added `TestProjectionRouteIsGetOnly` and `TestMediaProjectionRouteIsGetOnly`, both reading `backend/cmd/server/main.go`. | FILLED |
| Frontend API seam | Existing Vitest parity covered schemas/enums/no-envelope OpenAPI, but not the new `api.ts` helpers using `apiClientFetch`, exact runtime paths, direct JSON parsing, and no token/storage/cookie bypass. | Extended `v12-projection-contract.test.ts` to inspect the helper bodies and OpenAPI path methods. | FILLED |

No implementation bug was found. No implementation files were modified.

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File | Status |
|---------|-------------|-----------|-------------------|------|--------|
| 72-01-01 | Migration 0096 up/down SQL exists and is load-bearing without DB; profile/dispute/visibility/review fragments are present. | unit, no-DB source-fragment | `cd backend && go test ./internal/repository/... -run "TestV12StatusFoundation" -count=1` | `backend/internal/repository/v12_status_foundation_migration_test.go` | green |
| 72-01-02 | Migration is additive/reversible, does not alter content/technical status columns, and keeps `dispute_state` out of UNIQUE constraints. | unit + migrate verification from execution | `cd backend && go test ./internal/repository/... -run "TestV12StatusFoundation" -count=1` | `backend/internal/repository/v12_status_foundation_migration_test.go` | green |
| 72-02-01 | Domain projection separates members, historical members, and contributors; no UNION flattening. | unit, no-DB source-fragment | `cd backend && go test ./internal/repository/... -run "TestProjection" -count=1` | `backend/internal/repository/domain_projection_repository_test.go` | green |
| 72-02-02 | Domain projection keeps `dispute_state` separate from content status, derives `claimed` from `member_claims`, joins visibility/review lookups, returns no envelope, and is GET-only. | unit, no-DB source-fragment | `cd backend && go test ./internal/repository/... -run "TestProjection" -count=1` | `backend/internal/repository/domain_projection_repository_test.go` | green |
| 72-03-01 | Media ownership projection exposes owner type/id, category, visibility, review status, and does not use technical `media_assets.status` as review. | unit, no-DB source-fragment | `cd backend && go test ./internal/repository/... -run "TestMediaProjection" -count=1` | `backend/internal/repository/media_ownership_projection_repository_test.go` | green |
| 72-03-02 | Media member-owner comes from `owner_member_id`, owner scope is parameterized, handler is no-envelope, and route is GET-only. | unit, no-DB source-fragment | `cd backend && go test ./internal/repository/... -run "TestMediaProjection" -count=1` | `backend/internal/repository/media_ownership_projection_repository_test.go` | green |
| 72-04-01 | OpenAPI documents the pinned direct DTO/list reads, fields, enums, and no write methods for the new paths. | contract, Vitest source/contract parity | `cd frontend && npx vitest run v12-projection-contract` | `frontend/src/types/__tests__/v12-projection-contract.test.ts` | green |
| 72-04-02 | TypeScript DTOs mirror all backend JSON fields; API helpers use the central `api.ts` seam with exact runtime paths and direct JSON responses. | contract + typecheck | `cd frontend && npx vitest run v12-projection-contract && npm run typecheck` | `frontend/src/types/__tests__/v12-projection-contract.test.ts` | green |

## Requirement Coverage

| Requirement | Covered By | Status |
|-------------|------------|--------|
| A - keine Parallelmodelle; getrennte Projektionen/Contracts | Domain projection tests, contract parity test | green |
| G - Medien-Ownership-Matrix und FK-basierte Visibility/Review-Achsen | Migration test, media projection tests | green |
| H - Claims/Requests/Contributions getrennt | Domain projection claimed-derived test | green |
| I - scoped Medien-Uebersichtsdaten vorbereiten | Media owner scope and owner axes tests | green |
| J - memorial-faehiger Profilstatus ohne Setter | Migration test, domain DTO/contract parity | green |
| K - Contract/API-Disziplin | OpenAPI/TS/API helper parity test, typecheck | green |
| D-01 | `dispute_state` separate from content status | green |
| D-03 | visibility and review as separate FK lookup axes | green |
| D-05 | read-only GET surfaces, no write endpoints | green |
| D-06 | memorial status value readable only; no Phase-72 setter | green |

## Manual-Only

None. The previous manual-only down.sql mirror item is now treated as automated coverage through `TestV12StatusFoundationDownMirrors`, the negative migration invariants, and the executed migrate roundtrip recorded in `72-01-SUMMARY.md` and `72-VERIFICATION.md`.

## Audit Trail

| Date | Gaps Found | Resolved | Escalated | Notes |
|------|------------|----------|-----------|-------|
| 2026-06-05 | 2 | 2 | 0 | Added route GET-only guards and `api.ts` helper seam assertions; focused commands passed. |

## Validation Sign-Off

- [x] All Phase-72 tasks have automated validation.
- [x] Tests can fail on real behavioral/contract drift.
- [x] No `t.Skip` escape hatch exists in Phase-72 source-fragment tests.
- [x] No implementation files were modified during this audit.
- [x] Focused backend, frontend contract, frontend typecheck, and diff hygiene checks passed.
