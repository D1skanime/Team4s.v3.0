# Team4s Implementation Contract

## Purpose

This document prevents three recurring drift problems:

- UI is reinterpreted per page instead of following the global UI system.
- API request/response behavior drifts between backend, frontend helpers, DTOs, and shared contracts.
- Similar code is rebuilt in multiple places instead of using or extending an existing seam.

Use this document before planning or coding implementation work.

## Disposable Test Data Contract

Team4s currently operates with disposable test data. Existing database rows have no preservation requirement.

- Do not add plans or implementation work for data migration, backfill, reconciliation, compatibility, or carry-forward unless the user explicitly requests that work for the current task.
- New schema migrations remain the standard mechanism for schema changes; this rule does not prohibit migrations that create or alter the schema.
- Prefer resetting and reseeding the test database over preserving old row data or adding transitional compatibility code.
- Historical people, memberships, releases, and contributions are entered through the current canonical product flow. Their real-world history does not make pre-existing test rows durable.
- Roadmap language such as "historical import", "backfill", or "existing data" does not override this contract. Confirm with the user before treating persisted data as production-like or durable.

## Mandatory Search-First Gate

Before adding new implementation code, search for existing equivalents:

- UI components: `frontend/src/components/ui`, nearby page components, domain components.
- API helpers and DTOs: `frontend/src/lib/api.ts`, `frontend/src/lib/api/*`, `frontend/src/types/*`.
- Backend handlers/services/repositories: `backend/internal/handlers`, `backend/internal/services`, `backend/internal/repository`.
- Contracts: `shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`.
- Domain docs: `docs/architecture/db-schema-fansub-domain.md`, `docs/architecture/db-runtime-authority-map.md`.

If an existing seam fits, use or extend it. If it does not fit, record why before creating a parallel seam.

## Reuse Decision Rules

Prefer reuse when:

- The existing code owns the same domain entity.
- The existing code already handles auth, validation, transport, media ownership, or error behavior.
- The new behavior is a variant of an existing pattern.
- A shared primitive would remove repeated control/progress/error/formatting logic.

Do not reuse when:

- Reuse would attach data to the wrong domain entity.
- Reuse would merge release-level, release-version-level, group-level, or anime-level media ownership.
- The existing code is a compatibility seam and the task is explicitly building a newer canonical seam.
- The abstraction would hide important domain decisions.

## Duplication Gate

New code should not introduce a second copy of:

- API request construction or response parsing.
- Auth token or bearer handling.
- Upload transport, progress, retry, or media ownership logic.
- DTO mapping between backend and frontend shapes.
- Release/fansub/anime ownership lookup logic.
- UI controls for the same persisted data type.
- Loading/error/empty-state patterns for the same UI surface type.

If the same logic would appear in two or more places, extract a focused helper or component unless doing so would cross a domain boundary.

## UI Contract Pointer

For UI work, follow:

- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`

Persisted or API-backed fields must be mapped to semantic controls before coding. Do not use placeholder text inputs for years, enums, booleans, relations, media, or constrained numeric values.

## API Contract Pointer

For API work, follow:

- `docs/api/api-contracts.md`
- `shared/contracts/openapi.yaml`
- `shared/contracts/admin-content.yaml`
- `docs/frontend/auth-api-client.md`

Endpoint behavior, DTOs, frontend helpers, status branches, and shared contracts must move together.

## GSD Planning Requirements

Plans must include in `read_first`:

- The files being edited.
- Existing analog files found by the search-first gate.
- Relevant docs from this file, UI contract docs, API contract docs, or domain docs.

Plan actions must name exact files, helpers, components, endpoint paths, DTO names, and controls. Avoid vague instructions such as "make this consistent" without specifying the target pattern.

Acceptance criteria should include at least one reuse/contract check when relevant, for example:

- No new ad hoc `fetch` is introduced for a protected API call.
- Existing upload wrapper remains the only bearer-owning upload transport.
- The field `year` is rendered through a constrained year control, not a free text input.
- The shared contract YAML and frontend DTO both contain the new response field.

## Execution Requirements

Executors must stop or document a deviation if implementation requires:

- A new duplicate seam where an existing seam appeared usable.
- A new API contract not covered by the plan.
- A new UI control for a persisted field where the global UI system already has a matching primitive.
- A domain ownership decision that is unclear.

Small shared helpers are encouraged when they reduce real duplication and keep ownership clear.
