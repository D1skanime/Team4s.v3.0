# Phase 137 — Deferred Items

Out-of-scope issues discovered during execution but not fixed (per the executor's
SCOPE BOUNDARY rule: pre-existing drift unrelated to the current task's own files).

## From Plan 137-06

1. **`backend/internal/handlers` package has a pre-existing, structural
   `permissions.loadedCache` test-ordering gap that predates this plan.**
   `permissions.roleAllows` (and its exported wrapper `permissions.RoleAllowsAction`)
   reads the package-level `loadedCache` var, which starts `nil` for the entire test
   binary and is only ever populated by an explicit `Service.LoadCache` call. Within
   `internal/handlers`, exactly one file (`app_auth_test.go`) ever calls it (via its
   local `loadAppAuthCapabilityTestCache` helper), and only from six of its own tests
   (all declared after line ~1400). Any role-grant-dependent test that runs earlier in
   Go's deterministic file-then-declaration test order — or that never calls the
   helper at all, e.g. `admin_content_anime_project_notes_test.go`,
   `admin_content_anime_theme_segment_assignments_test.go`,
   `admin_content_anime_theme_segment_range_autoassign_test.go`,
   `admin_content_fansub_releases_contributions_handlers_test.go`,
   `admin_content_fansub_releases_test.go`,
   `admin_content_release_version_media_test.go`
   (`TestReleaseVersionMedia_CapabilitiesExposeOwnDelete`, a pure unit test of
   `permissions.RoleAllowsAction` with zero cache setup), and the handful of
   `app_auth_test.go` tests declared *before* line ~1400 — always observes a `nil`
   cache and gets a deterministic `403 insufficient_role`/`false` result regardless of
   what `role_capabilities` data actually exists.

   **Verified pre-existing, not caused by this plan:** every one of these tests fails
   identically when run in isolation via `go test ./internal/handlers -run
   '<TestName>'` (a single-test binary that never reaches `app_auth_test.go`'s
   cache-loading tests at all), independent of this plan's own change (adding
   `permissions.ActionUserGroupCapabilityOverrideManage` to `allKnownActions`). This
   plan's own `git blame`-relevant edit only touched the D-10 "every action needs a
   role" catalog-consistency check (see item 2 below); it does not, and structurally
   cannot, affect whether `loadedCache` is `nil` at the point these tests run.

   **Why not fixed here:** the fix (adding `loadAppAuthCapabilityTestCache`-equivalent
   calls to ~10 unrelated handler test files spanning anime segments, project notes,
   fansub releases, contributions, and release-version media) is a wide, cross-feature
   test-infrastructure change with zero connection to Phase 137's own
   `files_modified`. It most likely became newly *reachable* (rather than newly
   *caused*) when Plan 137-05 routed `canForContext`/`CanForReleaseVersion` through
   `ResolveGroupRights`, which is the same `roleAllows` dependency the pre-137-05 code
   already had — 137-05's own summary explicitly scoped its regression sweep to
   `internal/permissions` and `internal/handlers`' request-shape parity, not a full
   `internal/handlers` green-suite proof. Recommended next step: a small, dedicated
   quick-task or later plan that adds a package-level `TestMain` (mirroring
   `internal/repository/testmain_test.go`'s existing precedent for
   `LoadFansubGroupCatalog`) to `internal/handlers`, loading a single canonical,
   complete role-capability stub once for the whole package.

2. **This plan's own required fix, for traceability:** `permissions.go`'s
   `allKnownActions` was missing `ActionUserGroupCapabilityOverrideManage`
   (D07's new management capability) entirely — without it, `ResolveGroupRights`
   could never evaluate or grant this capability at all, in production or tests
   (`GroupRightsResolution.Can()` defaults unknown actions to `no_grant`). Fixed
   in-scope (Rule 1/2, mirroring 137-05's identical `allKnownActions`-completeness
   precedent): added the constant plus the `allKnownActions` entry in
   `backend/internal/permissions/permissions.go`, and updated the two D-10
   catalog-consistency stub fixtures that enumerate the full action set
   (`backend/internal/permissions/capability_registry_test.go`'s
   `roleMatrixStubData()`, `backend/internal/permissions/permissions_reload_test.go`'s
   `fullValidCacheData()`) plus `backend/internal/handlers/app_auth_test.go`'s
   `appAuthCapabilityCacheLoader.allActions` (the one D-10 fallout that was
   genuinely new — every test reachable *after* that loader successfully runs now
   passes again). See `137-06-SUMMARY.md`'s "Deviations from Plan" for the full
   rationale.
