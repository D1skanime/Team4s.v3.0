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
