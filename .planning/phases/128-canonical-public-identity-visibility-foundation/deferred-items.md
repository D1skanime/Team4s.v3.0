# Deferred Items

## Plan 128-10

- **Out-of-scope repository integration fixture drift:** The full `go test ./internal/repository -count=1` suite fails in pre-existing contribution-badge/dashboard fixtures because they insert `members.nickname = NULL`, which violates the current NOT NULL schema.
- **Out-of-scope lifecycle fixture drift:** Existing role-volume repository tests insert lifecycle rows that violate `chk_release_role_credit_lifecycle_shape`.
- **Impact on 128-10:** None. The focused contribution/project-member suites, repository compile-only check, and `go vet ./internal/repository` pass.
- **Follow-up:** Update the affected fixture builders to match the current schema in their owning phase.

## Plan 128-11

- **Cross-plan handler compile gap:** Completed Plan 128-10 removed the slug-shaped `GetPublicMemberContributions` and `ResolveMemberRelation` repository methods before dependent Plan 128-12 rewires their handlers to the resolved-ID methods.
- **Observed failures:** Package-wide handler tests, whole-backend compile, and handler/server vet fail only at `contributions_public_handler.go:67` and `project_member_public_handler.go:66` with those two missing symbols.
- **Impact on 128-11:** The three Plan-128-11 files compile, vet, and pass their focused access/profile/projects suites when tested as a file list; no removed compatibility method was restored.
- **Follow-up:** Plan 128-12 owns the contribution/project-member handler and composition-root rewire that closes this transient gap.
- **Resolved by Plan 128-12:** Both stale calls were removed in favor of `GetPublicMemberContributionsByID` and `HasMemberRelation`; the exact handler suite, whole-backend compile, and whole-backend vet now pass.

## Plan 128-13

- **Out-of-scope no-token documentation assertion:** All eight production security-boundary assertions pass, but the suite's ninth inventory assertion still expects two Phase-49 planning files at their former .planning/phases/49-* paths after the planning recovery archive moved them.
- **Impact on 128-13:** None. Token, cookie, bearer, direct-fetch, XHR, Keycloak, and UI parameter boundaries pass; no allowlist or historical planning path was changed.
- **Follow-up:** Update the Phase-49 documentation allowlist in the planning-recovery owner rather than coupling this API-contract plan to archived artifact locations.

- **Downstream TypeScript integration errors:** The full frontend typecheck sees expected Phase-128 follow-on work in VisibilityCard, the public-member page/preview, profile labels, and their fixtures after the canonical private, required slug, and token-free helper contract landed. It also sees pre-existing Next generated route-prop errors and user-owned dirty MemberBadgeChain.test.tsx failures.
- **Impact on 128-13:** The plan-owned DTO parity suite, all 25 auth-refresh tests, scoped ESLint, OpenAPI validator, and diff checks pass.
- **Follow-up:** Plans 128-15/16 own the public page/owner-preview and visibility UI migrations; preserve the unrelated badge work for its owner.
