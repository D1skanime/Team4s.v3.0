# Deferred Items

## Plan 128-10

- **Out-of-scope repository integration fixture drift:** The full `go test ./internal/repository -count=1` suite fails in pre-existing contribution-badge/dashboard fixtures because they insert `members.nickname = NULL`, which violates the current NOT NULL schema.
- **Out-of-scope lifecycle fixture drift:** Existing role-volume repository tests insert lifecycle rows that violate `chk_release_role_credit_lifecycle_shape`.
- **Impact on 128-10:** None. The focused contribution/project-member suites, repository compile-only check, and `go vet ./internal/repository` pass.
- **Follow-up:** Update the affected fixture builders to match the current schema in their owning phase.
