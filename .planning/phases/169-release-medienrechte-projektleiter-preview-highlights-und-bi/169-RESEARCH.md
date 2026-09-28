# Phase 169 Research

## Findings to verify in canonical code

- Existing release-version media seams already cover admin media upload, preview candidate, ordering, public projection, and lightbox/story grouping. Extend those seams instead of creating parallel media logic.
- The current reorder handler and permission action are the starting point for server-side authorization.
- Existing fansub effective-rights and project-membership handlers should supply the project-scoped delegation pattern; the project leader must be resolved server-side from the concrete fansub project.
- Shared OpenAPI/admin-content contracts and frontend DTOs must be updated together with any endpoint or response change.
- A separate persisted highlight state is required because preview is independent and multiple highlights per category are allowed.
- A new reversible migration is expected if the current schema has no highlight state. Existing rows must not be backfilled under the disposable-data rule.
- Tests must cover platform admin, project leader, delegated member, non-delegated member, project boundary, direct API denial, preview/highlight separation, multiple highlights, ordering, and refresh-session behavior.
- The fansub admin releases route must expose the context-preserving „Notizen & Bilder“ entry for authorized users.

## Planning recommendation

Split implementation into: (1) schema, contracts, permissions, project-leader authorization and API; (2) admin curation controls plus fansub-admin navigation; (3) public preview/highlight projection and focused security/UI tests. Require a security/contract gate before execution.
