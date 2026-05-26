---
name: team4s-implementation-contract
description: "Use for Team4s implementation planning or coding, especially to prevent repeated code, UI reinterpretation, API contract drift, duplicated helpers/hooks/services, or domain ownership mistakes."
---

# Team4s Implementation Contract

Use this skill before planning or coding Team4s implementation work.

## Required Reading

Read only what is relevant to the task:

- `AGENTS.md` - hard project rules.
- `docs/engineering/implementation-contract.md` - reuse, search-first, and duplication gates.
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md` - UI work.
- `docs/api/api-contracts.md` - API, DTO, helper, and response/status behavior.
- `docs/frontend/auth-api-client.md` - browser auth/API helper boundary.
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release/media ownership.

## Workflow

1. Search for existing equivalents before adding a component, hook, helper, service, repository method, endpoint, DTO, or utility.
2. Prefer extending an existing seam when ownership and abstraction still fit.
3. If code would be duplicated in two or more places, extract a focused helper/component unless that would cross a domain boundary.
4. For UI, map persisted/API-backed fields to semantic controls before coding.
5. For API, keep shared contract YAML, backend runtime behavior, frontend DTOs, and API helpers aligned.
6. For media/release/fansub/anime work, follow the domain ownership rules in `AGENTS.md` exactly.

## GSD Planning Rules

Plans must include relevant docs and existing analog files in `read_first`. Actions must name exact files, functions, components, DTOs, endpoint paths, and controls. Do not write vague tasks like "make it consistent" without naming the target pattern.

Acceptance criteria should prove reuse or contract alignment when relevant:

- Existing helper/component is reused or extended.
- No duplicate protected `fetch` or bearer handling is introduced.
- Shared contract YAML and frontend DTOs match changed API behavior.
- Persisted UI fields use semantic controls.

## Execution Rules

Executors should treat these as blocking or deviation-worthy:

- A new parallel seam is added where an existing seam appears usable.
- API behavior changes without contract/DTO/helper review.
- UI for real persisted data uses placeholder controls.
- Code repeats request parsing, response mapping, upload transport, auth handling, media ownership, or release/fansub lookup logic.

Small shared helpers are welcome when they reduce real duplication and preserve domain ownership.
