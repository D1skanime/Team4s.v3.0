---
phase: 159-public-anime-detail-konsolidierung
plan: "02"
subsystem: api
tags: [streams, grants, identity, security, contracts, relay]
requires:
  - phase: 159-01
    provides: Explicit variant/release-version identities and pre-change consumer matrix
provides:
  - Exact optional variant selection on the existing source/grant/stream chain
  - Canonical entitlement and signed grant ownership across colliding IDs
  - Consistent selector forwarding through the existing Next relay and auth recovery
  - Isolated SQL and synthetic HTTP regression evidence
affects: [159-03, 159-05]
tech-stack:
  added: []
  patterns: [explicit variant plus canonical version filter, shared strict selector parsing, existing relay auth owner]
key-files:
  created:
    - backend/internal/repository/episode_version_stream_identity_test.go
    - backend/internal/handlers/episode_version_stream_identity_test.go
    - frontend/src/app/api/releases/[id]/stream/route.test.ts
  modified:
    - backend/internal/repository/episode_version_repository.go
    - backend/internal/handlers/episode_version_grants.go
    - backend/internal/handlers/episode_version_stream.go
    - frontend/src/app/api/releases/[id]/stream/route.ts
    - frontend/src/lib/server/streamRelayAuth.test.ts
    - shared/contracts/openapi.yaml
key-decisions:
  - An explicit variant must satisfy rv.id=variantID AND rv.release_version_id=versionID; no-selector lookup/order stays unchanged.
  - Entitlement and signed grant remain canonical version-scoped; one grant can select another variant only within that version.
  - Preserve resolveStreamRelayTarget as sole relay auth owner and reuse one grantPath for initial and recovery requests.
requirements-completed: []
requirements-addressed: [P159-05, P159-06]
duration: 16min
completed: 2026-09-13
---

# Phase 159 Plan 02: Canonical version and explicit stream variant binding

**An optional variant selector now binds source lookup to the canonical release version through grant, stream, Next relay and 401 recovery.**

## Scope and commits

Two tasks complete. Starting HEAD `3c94b2e8`, verified 159-01 through `43584282`; Phase-158 baseline remains `c3bfcb23781addca1ccd3931592535416f706787`. Pre-change cause and consumer scope are recorded in the [159-01 matrix](159-01-CONSUMERS.md) and [159-02 evidence notes](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-02/README.md). The evidence fixture window starts `2026-09-13T22:24:17Z`, preceded by read-only preflight.

| Task | Commits |
|---|---|
| 1 — SQL/handler collision RED | `b44e7527` |
| 1 — exact source filter and shared parser GREEN | `597da6a8` |
| 2 — relay and contract RED | `4c1b735a` |
| Targeted malformed selector fix | `3ec74789` |
| 2 — relay and OpenAPI GREEN | `7d5f3877` |
| Encoded-name and legacy unknown-query verification | `a9d9bd12` |

## Implementation and compatibility

The reproduced defect was concrete: version 10 owns variant 100, while version 20 owns variant 10 with the smallest stream ID. A valid version-10 grant previously reached the foreign stream because source resolution accepted `rev.id=$1 OR rv.id=$1`. `GetReleaseStreamSource` now accepts an optional explicit variant and uses `rv.id=$2 AND rv.release_version_id=$1`. Calls without it retain the exact prior OR predicate and stream ordering; no admin write identifier was changed.

Grant and Stream share strict selector parsing, reject empty/negative/fractional/prefix/duplicate/overflow values, and validate the full canonical path when a selector exists. Go validates positive int64 IDs; the browser relay additionally requires safe JavaScript integers. Entitlements and signed claims retain the canonical path version, verified through actual signed grant parsing and recorded permission calls. Valid second variants of that version work; foreign variants or missing streams return 404 after authorization; wrong claims return 401 and denied/revoked permissions return 403.

The Next route sends the selector to both grant and stream paths, including provided grants, refresh-only sessions, grant-401 retries and upstream-401 recovery. It reuses the existing `resolveStreamRelayTarget` and cookie application; no token refresh or auth owner was added. Start offset, Range, User-Agent, stream headers and cookies are preserved. OpenAPI documents the optional selector and status/ownership rules on the existing two endpoints. Public Play UI adoption remains with 159-03.

## Verification

[Manifest and saved logs](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-02/verification.json):

- Authentic isolated SQL/handler RED showed the foreign stream delivered for explicit variant 100; GREEN passes six top-level tests plus grant subcases. Cases cover colliding/equal IDs, multiple variants, no source, exact canonical version, real grants, recorded entitlement IDs, 401/403/404, Range/offset and deliberate unchanged legacy ambiguity.
- A separate RED found malformed URL escape values disappearing under `URL.Query()`. Final parser/legacy tests pass with raw and encoded selector names, conflicting/duplicate values and an unrelated malformed parameter.
- Frontend RED: 22 failures/11 passes. GREEN: 33 tests across actual Next route and shared auth helper, including both recovery paths and contract assertions. All external fetches are mocked; backend bytes use a fake transport.
- Full frontend typecheck: 0 errors. Scoped lint: 0 errors/0 warnings. Go vet/build and canonical OpenAPI parse passed. Final product diffcheck passed.
- The unchanged entitlement rule engine was not rewritten or claimed reverified from a stub: tests prove that the handler passes the same canonical version to it as the grant/source. Existing grant/entitlement handler tests also pass.

Root's controlled runtime sync used one tarstream for three files with matching source hashes. Air replaced child 4408 with sole current child 6008 (`/app/tmp/air/server`, not deleted); PID 1 and container were unchanged. Benign GET `/api/v1/releases/27/stream?variant%5Fid=%ZZ` returned actual 400 before grant/source access. No real media or grant creation occurred. Evidence: `docs/audits/2026-09-13-public-anime-detail/phase159/root-runtime-sync-15902.json` (root-owned).

## Deviations and cleanup

**[Rule 2 — Strict parsing correctness]** Go's `URL.Query()` silently discards malformed values. A named malformed selector could otherwise fall back to the legacy OR path. The shared parser now decodes selector names and validates their query pairs without changing unrelated parameters; added actual RED/GREEN cases. Fixed in `3ec74789`, encoded-name/default-boundary cases added in `a9d9bd12`.

The fixture identity initially lacked the existing middleware's required display name; corrected before the authoritative RED collision run. No production workaround resulted. No other product deviation, new auth/crypto/media seam, schema migration, tracked file deletion or goal-blocking stub was introduced. T-159-04/05 are covered by exact SQL ownership, canonical grant checks and complete relay transport tests.

Owned disposable PostgreSQL `f28e5e24e49a534567181ea6ec6102126d96944dc054fb6ad40bc4d58d8c0acc` (`postgres:16`, tmpfs, no host ports, guarded `team4s_phase117_test_p15902` DSN) was stopped/auto-removed. Owned `/app/tmp/phase15902` was removed after exact resolved-path validation; absence of both was checked. Live database, `.env`, media and volumes were untouched. Root's tracking/review/evidence files and `frontend/scripts/shot2.mjs` were not staged.

P159-05/P159-06 are addressed at this plan's boundary; cross-plan completion is reserved for 159-05. Default ambiguity is explicitly retained, not presented as generally fixed. Human UAT 156/157/158 remains OPEN. Ready for 159-03 UI adoption; no global production/browser gates were pulled forward.

## Self-Check: PASSED

All new files, evidence paths and six task commits exist. The isolated resources are absent; no tracked file was deleted. Live source/process/status parity was confirmed by the orchestrator.
