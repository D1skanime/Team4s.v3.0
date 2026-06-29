---
status: complete
phase: 90
kind: closeout
completed_at: 2026-06-29
---

# Phase 90 Closeout

## Scope

Phase 90 is closed as three additive quick slices:

- `260628-phase90-notes-contributor-scope-hotfix`
- `260628-phase90-release-media-own-scope-hotfix`
- `260629-phase90-release-media-upload-redesign`

The current working tree also includes the group media permission hardening that
backs the member-media capability UI with `0110_fansub_group_member_media_permissions`.

## Completion evidence

- Temporary runtime artifacts in `tmp/` were removed before commit preparation.
- Migration numbering was checked: `0110` follows tracked `0109`.
- The `0110` migration is reversible: up creates the permission table and partial
  index; down drops the index and table.
- Phase-90 release-version media and notes paths keep the canonical release-version
  ownership model and do not attach media directly to episodes.
- No new upload transport seam was introduced; existing release-version/group media
  upload helpers remain the browser upload owners.

## Fresh checks

Passing:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint` (0 errors, existing warnings remain)
- `cd frontend && npm test -- --run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx"`
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/permissions -run "ReleaseVersionNotes|ContributorGuard|CanForReleaseVersion|ReleaseVersionMedia|FansubMedia" -count=1`
- `git diff --check`

Broad-suite risks observed:

- `cd frontend && npm test -- --run` still fails in pre-existing/non-Phase-90 areas:
  auth-boundary source scans, admin anime create/overview tests, and a public
  fansub source-inspection test.
- `cd backend && go test ./...` still fails in existing source-invariant tests in
  `internal/repository` plus `TestGetMemberIDForContribution_MethodExists` in
  `internal/services`.

These broad-suite failures were not introduced or resolved as part of Phase 90
closeout; the Phase-90 targeted checks pass.

## Result

Phase 90 is ready to commit. Phase 91 may start only after this closeout and the
associated source changes are committed.
