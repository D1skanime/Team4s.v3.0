# Deferred Items — Phase 138

## Plan 03 (D-29 Beiträge-Tab display bug)

- **Pre-existing, out-of-scope test failures in `UserContributionsTab.test.tsx`:**
  `zeigt Karaoke FX und Typesetting getrennt mit Katalogdarstellung` and
  `hält unbekannte gespeicherte Codes neutral lesbar` both fail with
  `expected undefined to be 'image'/'user'` (missing `data-role-icon`
  attribute). Confirmed present in the file at `HEAD` (i.e. before any
  Plan 03 change) by temporarily restoring the original file and re-running
  the suite — same two failures, same assertions. Not caused by, and not
  fixed by, Plan 03's `release_version_label`/`episode_number` display fix.
  Out of scope per the executor's scope-boundary rule (only auto-fix issues
  directly caused by the current task's changes). Left untouched.

## Plan 16 (D-06 group view — Rollen/Änderungen tabs, member table extension, Claims link-out)

- **Pre-existing `useRoleCatalog must be used within RoleCatalogProvider` crashes**,
  confirmed present before any Plan 16 change (verified via `git stash`, identical
  failure count before/after): `FansubAppMembersSection.test.tsx` (8/8 tests error,
  `FansubAppMembersOverview.tsx`'s pre-existing `useRoleCatalog('fansub_group')` call
  has no provider in that test file's render tree) and `page.test.tsx` (12/60 tests
  error via `AnimeReleasesCockpit.tsx`'s own unrelated `useRoleCatalog` call — same
  root cause, different component). Neither call site nor test file was touched by
  Plan 16. Out of scope per the executor's scope-boundary rule; left untouched.

## Plan 07 (`go test ./internal/handlers/...` full-package run)

- **Pre-existing nil-cache `internal/handlers` failures** (already documented
  project-wide in `.planning/STATE.md`'s "Blockers/Concerns" section): running
  the FULL `internal/handlers` package (not the plan's own
  `-run TestAdminCapabilityImpactHandler` scope, which is 5/5 green) shows
  ~20 pre-existing failures across ~10 unrelated files
  (`admin_content_anime_project_notes_test.go`,
  `admin_content_anime_theme_segment_assignments_test.go`,
  `admin_content_fansub_releases_test.go`, `app_auth_test.go`, and siblings) —
  all 403 `insufficient_role`, root-caused by `testmain_test.go`'s
  `handlerTestCatalogLoader` not implementing `permissions.CacheLoader`, so
  `permissions.loadedCache` stays nil for the whole package run and
  `roleAllows`/group-role checks always deny. `TestPhase128PublicMemberAccessMatrix`
  and `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete` also fail,
  unrelated to both this nil-cache issue and Plan 07's own files. None of
  Plan 07's touched files (`effective_rights_capability_impact_preview.go`,
  `admin_capability_impact_handler.go`, `admin_routes.go`, `main.go`) are
  implicated. Out of scope per the executor's scope-boundary rule; left
  untouched.
