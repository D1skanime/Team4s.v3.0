---
phase: 103
plan: "02"
status: complete
completed: 2026-07-16
commits:
  - 2423b2d8
  - af0593c5
---

# Plan 103-02 Summary

Implemented a reversible, release-version-native entitlement hierarchy for rare full-episode playback and one central resolver for effective decisions.

## Delivered

- Added migration `0129_release_playback_entitlements` with normalized direct-user or canonical-role subjects, allow/deny effects, and exactly one global, group, project, or release scope.
- Added database constraints that reject mixed scopes and prevent any neutral `episode_id` entitlement.
- Added lookup and uniqueness indexes without seeding broad production access.
- Extended the existing release-version authorization context with its canonical anime id while retaining all participating fansub groups.
- Added `ReleasePlaybackEntitlementRepository`, which composes the existing permissions resolver for release context, group roles, and release contribution roles.
- Implemented deterministic precedence: release > project > group > global; direct-user beats role at equal scope; deny wins conflicting role rules at equal scope.
- Kept cooperation rules isolated to the group in which a role is actually held.
- Kept platform-admin access explicit but routed through the same central entitlement entry point.
- Added table-driven resolver and migration structure tests.

## Verification

- `go test ./internal/repository ./internal/permissions ./internal/migrations` — passed after the parallel Phase-103 repository helpers landed.
- Migration up/down — passed against an isolated PostgreSQL database cloned from the current schema.
- Invalid mixed-scope insert — rejected by `chk_release_playback_entitlement_scope` as expected.
- Down migration — removed the rule table successfully (`to_regclass(...) IS NULL`).
- `git diff --check` — passed for all Plan 103-02 files.

## Files changed

- `database/migrations/0129_release_playback_entitlements.up.sql`
- `database/migrations/0129_release_playback_entitlements.down.sql`
- `backend/internal/migrations/phase103_release_playback_entitlements_test.go`
- `backend/internal/permissions/permissions.go`
- `backend/internal/repository/authz_permissions.go`
- `backend/internal/repository/release_playback_entitlement_repository.go`
- `backend/internal/repository/release_playback_entitlement_repository_test.go`

## Notes and remaining scope

- The planned read-first files `backend/internal/permissions/capability_registry.go` and `backend/internal/repository/fansub_group_member_media_permissions.go` do not exist at the documented paths; the active capability implementation is in `permissions.go`/`authz_permissions.go`. No group-media permission seam was reused.
- Rights-management UI, bulk assignment, and inheritance visualization remain intentionally deferred.
- Grant and stream handlers must consume this resolver in the later playback integration plan; they must not recreate its hierarchy.
