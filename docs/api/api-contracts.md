# Team4s API Contracts

## Purpose

This document defines how API contracts are maintained for Team4s. It is the workflow guide for agents before changing backend handlers, frontend API helpers, DTO types, shared OpenAPI files, or UI behavior that depends on API response shapes.

The goal is to prevent contract drift: backend, frontend helpers, UI state handling, and shared contract files must describe the same behavior.

## Contract Sources

Use these sources in this order:

1. `shared/contracts/openapi.yaml` - canonical cross-surface OpenAPI contract.
2. `shared/contracts/admin-content.yaml` - focused admin-content contract where present.
3. Backend handler, service, repository, and validation code - runtime truth when contracts are stale.
4. `frontend/src/types/*` - frontend DTOs and response/request shapes.
5. `frontend/src/lib/api.ts` and feature-local API helper files - browser and server API call seams.
6. Domain architecture docs, especially `docs/architecture/db-schema-fansub-domain.md` and `docs/architecture/db-runtime-authority-map.md`.

If these sources disagree, stop long enough to identify the runtime owner and either update the contract or document the drift. Do not silently choose a new shape in page code.

## Required Agent Workflow

Before changing API behavior:

1. Identify the endpoint, method, request body, response body, auth requirement, and owner files.
2. Read the relevant shared contract YAML and existing frontend DTO/helper.
3. Check backend validation, handler status codes, and error payloads.
4. Decide whether the change is additive, breaking, or a bug fix.
5. Update the shared contract, backend code, frontend DTOs, and API helper together when the behavior changes.
6. Add or update focused tests that prove the contract from both sides where feasible.
7. Run the narrowest relevant checks plus `git diff --check`.

## Endpoint Contract Checklist

Every new or changed endpoint must have:

- Method and path.
- Auth requirement and backend permission owner.
- Path/query/body parameters with required/optional status.
- Success status and response body.
- Error statuses and response body shape.
- Frontend helper ownership.
- Frontend DTO ownership.
- Tests or an explicit reason tests are not feasible.

## Frontend Rules

- Normal browser callers must use central API helpers instead of ad hoc authenticated `fetch`.
- UI components must not parse undocumented response variants.
- DTO additions must be explicit in `frontend/src/types/*` or the local typed API seam.
- Status handling such as `409` redirect/conflict behavior must be documented and tested in the helper that owns the call.
- Do not add token parameters, bearer construction, or direct auth-cookie reads outside the documented auth boundary.

## Backend Rules

- Backend handlers remain authoritative for validation, permission checks, and mutation scope.
- Response payloads must not attach release, fansub, media, or member data to the wrong domain entity.
- Error payloads must use the documented project shape and preserve German user-facing messages where they reach the UI.
- New endpoints must reuse existing service/repository seams unless a documented decision explains a new seam.

## Contract Tests

Prefer focused tests near the owner:

- Backend handler/service tests for status codes, validation, permission behavior, and response payload.
- Frontend API helper tests for request payload construction, response parsing, and non-200 branches.
- UI tests only when the screen has meaningful state or copy tied to response variants.

For YAML-only contract changes, `git diff --check` is the minimum verification. For runtime changes, run the relevant frontend/backend tests.

## Drift Handling

If implementation and contract disagree:

1. Identify which source is runtime-authoritative today.
2. Fix the stale side when the intended behavior is clear.
3. If the intended behavior is not clear, stop and document the mismatch as a risk or decision.
4. Do not create a second helper, route, or DTO family to work around the mismatch.
