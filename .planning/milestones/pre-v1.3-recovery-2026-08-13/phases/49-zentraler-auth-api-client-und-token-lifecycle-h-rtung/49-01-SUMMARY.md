---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "01"
subsystem: frontend-auth-api-client
tags:
  - auth
  - api-client
  - token-lifecycle
  - inventory
dependency_graph:
  requires:
    - AUTH-API-CLIENT-01
    - Phase 48 contributor dashboard baseline
  provides:
    - 49-auth-api-client-inventory.md
    - 49-auth-api-client-boundaries.md
  affects:
    - frontend/src/lib/api.ts
    - frontend/src/lib/useAuthSession.ts
    - frontend/src/app/auth/page.tsx
    - frontend/src/app/api
tech_stack:
  added: []
  patterns:
    - central auth/API client inventory
    - SSR/auth-entrypoint/streaming boundary allowlists
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-inventory.md
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-boundaries.md
  modified: []
key_decisions:
  - Phase 48 is practically ready for Phase 49 despite stale ROADMAP/STATE counters, based on 48-SUMMARY.md and 48-UAT.md.
  - SSR pages /watchlist and /anime/[id] stay a separate server-side auth boundary for Phase 49.
  - Jellyfin/streaming routes stay a documented server-streaming boundary, not a normal browser API migration.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 9 min
  completed: 2026-05-20
---

# Phase 49 Plan 01: Auth/API Client Inventory Summary

Auth/API lifecycle inventory and boundary baseline for Phase 49 implementation.

## Outcome

Status: COMPLETE

Created the required inventory and boundary docs. No application code was edited.

The inventory records Phase 48 as **ready with tracking drift**: ROADMAP/STATE counters are stale, but `48-SUMMARY.md` and `48-UAT.md` prove the contributor auth/navigation baseline that Phase 49 depends on.

## Tasks Completed

| Task | Result | Files |
|---|---|---|
| Task 1: Prove Phase 48 readiness and capture dirty workspace state | PASS | `49-auth-api-client-inventory.md` |
| Task 2: Inventory token, request, upload, SSR, and streaming seams | PASS | `49-auth-api-client-inventory.md` |
| Task 3: Document boundary decisions and migration queue | PASS | `49-auth-api-client-boundaries.md` |

## Key Findings

- Runtime token access outside the central client is limited to SSR pages and server stream helper surfaces.
- Browser storage token access outside the central client and Keycloak helper was not found.
- `authToken` props/parameters remain broad: 380 static hits across 43 app/component files.
- API helper token threading remains broad: 293 static hits across 36 lib/app files.
- XHR upload auth duplication is concentrated in `frontend/src/lib/api.ts`.
- Direct fetch outside the central helper has two classified surfaces: public release image fetch and remote media source fetch.

## Boundary Decisions

- Normal browser API calls must centralize token reads, refresh, bearer attachment, and auth-related retry in `frontend/src/lib/api.ts`.
- Pages/components consume token-free session state, current-user data, and capabilities only.
- `/auth` remains an auth-entrypoint allowance.
- `/watchlist` and `/anime/[id]` are SSR server-side auth boundaries unless later converted to browser API calls.
- `frontend/src/app/api/episodes/[id]/play/route.ts`, `frontend/src/app/api/releases/[id]/stream/route.ts`, and `frontend/src/lib/server/streamRelayAuth.ts` remain the streaming/Jellyfin boundary.
- Upload/XHR auth must move behind one central wrapper before broad caller migration.

## Deviations from Plan

None - plan executed exactly as written.

Process note: an initial commit attempt picked up unrelated pre-staged migrations. It was immediately corrected by undoing only that just-created commit at the index level and recommitting the Phase 49 docs only. Final task commit `f5418299` contains only the two planned documentation files.

## Known Stubs

None found in created files.

## Threat Flags

None. This plan created documentation only and introduced no new endpoint, auth path, file access path, schema change, or runtime trust boundary.

## Verification

Automated checks run:

- `git diff --check -- .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-inventory.md`
- `git diff --check -- .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-boundaries.md`
- `git diff --check HEAD~1 HEAD -- .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-inventory.md .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-auth-api-client-boundaries.md`
- Static inventory searches from `49-PATTERNS.md` for runtime token access, browser storage token access, bearer construction, `authToken` props/parameters, API helper token threading, direct fetch, and XHR upload duplication.
- `Select-String` stub scan on the created inventory and boundary docs.

All scoped checks passed after removing Markdown trailing spaces before the final task commit.

## Commits

- `f5418299` - `docs(49-01): document auth api client inventory`

## Residual Risks

- Phase 48 readiness is proven by untracked Phase 48 artifacts while ROADMAP/STATE remain stale.
- The workspace remains heavily dirty with unrelated user/agent changes; this plan did not modify or restage them.
- The next implementation plans should rerun the static searches if auth files change before execution.

## Self-Check: PASSED

- Found `49-auth-api-client-inventory.md`.
- Found `49-auth-api-client-boundaries.md`.
- Found `49-01-SUMMARY.md`.
- Found task commit `f5418299`.
- Scoped `git diff --check` passed for the summary.
