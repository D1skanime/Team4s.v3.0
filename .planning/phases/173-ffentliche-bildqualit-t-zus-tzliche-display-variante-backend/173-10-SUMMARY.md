---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 10
subsystem: api
tags: [go, pgx, postgres, media, fansub, member-profile, display-variant]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "the 'display' media_files variant written at upload time (173-01/02/04/05/06/07), consumed here on the two remaining public read sites 173-08/09 could not safely cover"
provides:
  - "getPublicGroupBase's logo_url/banner_url prefer the group's own 'display' media_files row (D-02), under the SAME field names -- /fansubs/[slug]'s logo/banner now serve the display-capped asset"
  - "MemberProfileAvatar/PublicMemberProfileBackgroundImage gain a new, purely additive DisplayURL field with a server-side fallback to the unchanged PublicURL (true original) -- /members/[slug]'s avatar/background can now render a display variant without disturbing the animated-avatar detection that inspects public_url's extension"
affects: [173-14, 173-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stored-column (not media_files-joined) display preference: LEFT JOIN LATERAL ... ORDER BY id ASC LIMIT 1 keyed on the row's own FK column, scanned into a separate *string, then Go-side publicMediaURLForPath/publicURLForPath conversion only when the lateral path is non-nil -- used for getPublicGroupBase's logo_id/banner_id and GetPublicMemberProfileByID's avatar_media_id/background_media_id"
    - "New-field (not in-place swap) display_url pattern for sites where the original URL must stay reachable for other consumers (animated-avatar detection, D-07): add DisplayURL alongside the untouched PublicURL, fallback DisplayURL = PublicURL when no display row exists"

key-files:
  created:
    - backend/internal/repository/fansub_public_group_display_url_test.go
    - backend/internal/repository/member_profile_public_display_url_test.go
  modified:
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/member_profile_public_repository.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/models/member_profile.go

key-decisions:
  - "Used the free function publicMediaURLForPath(path, mediaStorageDir) (already used by listPublicFansubMedia in this same file) for the fansub-group site, rather than inventing a new r.publicURLForPath method -- the plan's interface excerpt named a method that does not actually exist on FansubRepository; the real existing helper does the identical job"
  - "Patched the disposable team4s_phase152_test fixture DB in-place (ALTER TABLE release_version_media ADD COLUMN IF NOT EXISTS title) to unblock GetPublicMemberProfileByID's loadLatestContributions call, which failed for ANY member profile load (not just this plan's) against the stale fixture -- matches CLAUDE.md's 'test data is disposable, reset/reseed' convention; did not add the CHECK constraint back since no test asserts it"
  - "Did not fix the pre-existing fansub_groups.kuerzel fixture gap or the non-idempotent hardcoded-ID test seeds discovered during verification -- both reproduce identically with or without this plan's diff and touch files this plan does not modify; logged to deferred-items.md instead (scope-boundary rule)"

requirements-completed: [REQ-173-24, REQ-173-25]

# Metrics
duration: 55min
completed: 2026-10-02
---

# Phase 173 Plan 10: Public fansub logo/banner + member avatar/background display_url Summary

**`getPublicGroupBase` (fansub group public profile) now prefers the `display` media_files variant for `logo_url`/`banner_url` under the same field names; `GetPublicMemberProfileByID` gains a new, additive `display_url` on avatar/background with a correct original-fallback, leaving `public_url` (the true original) untouched for the animated-avatar detection in 173-15.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-02T21:05:00Z (approx.)
- **Completed:** 2026-10-02T22:00:00Z
- **Tasks:** 2/2
- **Files modified:** 4 (2 production repository files, 1 model file, 1 pre-existing repository file touched only for a struct-field alignment) + 2 new test files

## Accomplishments

- `getPublicGroupBase` resolves a group's own `logo_id`/`banner_id` against a `LEFT JOIN LATERAL` on `media_files` (`variant='display'`, `status='ready'`, `ORDER BY id ASC LIMIT 1`), preferring the display path over the stored `logo_url`/`banner_url` column when one exists -- proven against real Postgres for the with-display, no-display-yet, and SVG-no-display-ever cases.
- `MemberProfileAvatar`/`PublicMemberProfileBackgroundImage` gain a new `DisplayURL string` field (`json:"display_url,omitempty"`). `PublicURL` is NEVER swapped -- the animated-avatar extension-based detection in `MemberProfileHero.tsx` (D-07, consumed by the dependent plan 173-15) keeps inspecting the true original unmodified.
- `GetPublicMemberProfileByID` adds two more `LEFT JOIN LATERAL`s (keyed on `m.avatar_media_id`/`m.background_media_id`) and assigns `DisplayURL` with a correct fallback: display path when present, else the unchanged `PublicURL` -- `display_url` is never nil/empty once an avatar/background exists.
- No new HTTP route registered: `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` stayed at 98 (unchanged from 173-08's recorded count); `git diff --stat` on `main.go` is empty.
- `go build ./...` and `go vet ./...` both clean across the whole backend module.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fansub group logo/banner prefer display at the public profile read site** - `6a437e53` (feat)
2. **Task 2: Public member profile avatar/background gain display_url with original-safe fallback** - `c9d60d29` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `backend/internal/repository/fansub_repository.go` - `getPublicGroupBase` gains two `LEFT JOIN LATERAL` display-variant lookups keyed on `logo_id`/`banner_id`; scans `logoDisplayPath`/`bannerDisplayPath` as separate `*string`s, then overwrites `item.LogoURL`/`item.BannerURL` via `publicMediaURLForPath` only when the lateral path resolved.
- `backend/internal/repository/member_profile_public_repository.go` - `GetPublicMemberProfileByID`'s query gains `avatar_display`/`background_display` `LEFT JOIN LATERAL`s and two new SELECT columns/scan targets; after the existing `Avatar`/`BackgroundImage` construction, assigns `DisplayURL` (display path, or fallback to the just-assigned `PublicURL`).
- `backend/internal/repository/member_profile_repository.go` - `publicMemberProfileBaseRow` gains `avatarDisplayPath`/`backgroundDisplayPath *string` fields (gofmt-aligned).
- `backend/internal/models/member_profile.go` - `MemberProfileAvatar`/`PublicMemberProfileBackgroundImage` gain `DisplayURL string \`json:"display_url,omitempty"\`` with a doc comment explaining the animated-avatar-safe additive design.
- `backend/internal/repository/fansub_public_group_display_url_test.go` (new) - `TestGetPublicGroupBase_PrefersDisplayVariant` (with-display logo + no-display-yet banner, both asserted in one group) and `TestGetPublicGroupBase_SVGLogoKeepsStoredURL` (SVG logo, no display row ever generated, stays on its stored URL). Real Postgres via the Phase-152 full-real-schema fixture, defensive self-cleanup.
- `backend/internal/repository/member_profile_public_display_url_test.go` (new) - `TestGetPublicMemberProfile_AvatarBackgroundDisplayURLFallback`: one member with display rows for both avatar and background (asserts `public_url` unchanged, `display_url` points at the display path) and one member with neither (asserts `display_url == public_url` fallback for both fields). Real Postgres, same fixture, defensive self-cleanup.

## Decisions Made

See `key-decisions` in the frontmatter for the `publicMediaURLForPath`-reuse, in-place fixture-patch, and out-of-scope-deferral rationale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale `team4s_phase152_test` fixture missing `release_version_media.title`**
- **Found during:** Task 2 verification (first real-Postgres run of the new member-profile test)
- **Issue:** The disposable `team4s_phase152_test` fixture DB (a `pg_dump --schema-only` snapshot taken before migration `0163`) was missing `release_version_media.title`. `GetPublicMemberProfileByID`'s `loadLatestContributions` call selects `rvm.title`, so EVERY call to this function against this fixture failed with `column rvm.title does not exist` -- not something specific to this plan's new avatar/background code, but it blocked proving this plan's own behavior.
- **Fix:** `ALTER TABLE release_version_media ADD COLUMN IF NOT EXISTS title TEXT NULL;` run directly against the disposable fixture database (not a migration file -- this is throwaway test data, matching CLAUDE.md's "test data is disposable, reset/reseed" convention). The length-200 CHECK constraint was intentionally not re-added since no test in this repository asserts it against this fixture.
- **Files modified:** none (database-only change to a disposable test fixture, no source files touched)
- **Verification:** `TestGetPublicMemberProfile_AvatarBackgroundDisplayURLFallback` passes end-to-end against the patched fixture.
- **Committed in:** n/a (database-only; no git-tracked file changed)

---

**Total deviations:** 1 auto-fixed (blocking, disposable-fixture schema patch).
**Impact on plan:** No production code or scope change; unblocked this plan's own Postgres-backed verification of Task 2.

## Issues Encountered

- **No `go` toolchain on `team4s-linux`, and `team4sv30-backend` does not bind-mount `./backend`** (same gap 173-08 documented): used a throwaway `docker run --rm -d golang:1.25-alpine` container on the `team4s_default` network, bind-mounting `./backend` at `/app` and `./database` at `/database` (the latter needed because `testsupport.ApplySQLFile`-style helpers resolve migration paths relative to the repo root), with `apk add build-base pkgconfig vips-dev` for CGO. Container removed after use.
- **Pre-existing, out-of-scope issues discovered during broader verification** (not caused by, and not fixed in, this plan): stale `fansub_groups.kuerzel` column gap in the same fixture (blocks the unrelated admin-path `GetGroupBySlug` test), and several pre-existing `fansub_public_profile_*_test.go` tests that seed fixed hardcoded IDs with no self-cleanup, which collide on repeated runs against the same persistent fixture DB. Both reproduce identically with or without this plan's diff. Logged in detail to `.planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md` (section "173-10"); any leftover rows this session's verification runs produced in the affected ID ranges were cleaned up so the fixture DB was left in the same state it was found in (this plan's own two new test files self-clean via a `DELETE`-before-`INSERT` preamble, so they are safely re-runnable).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `logo_url`/`banner_url` (fansub group) and `display_url` (member avatar/background) are live and correctly fallback-chained; 173-14 (`FansubBannerDisplay.tsx`/`FansubProfileTabs.tsx`) and 173-15 (`MemberProfileContent.tsx`/`MemberProfileHero.tsx`) now have real backend data to consume.
- `public_url` on the member avatar/background DTOs is provably unchanged byte-for-byte (same path, same value) in both the with-display and without-display test cases -- 173-15's animated-avatar extension-based detection has nothing new to break.
- No regressions: `go build ./...` and `go vet ./...` clean; the plan's exact `<verification>` grep (route count) unchanged at 98.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: backend/internal/repository/fansub_repository.go
- FOUND: backend/internal/repository/member_profile_public_repository.go
- FOUND: backend/internal/repository/member_profile_repository.go
- FOUND: backend/internal/models/member_profile.go
- FOUND: backend/internal/repository/fansub_public_group_display_url_test.go
- FOUND: backend/internal/repository/member_profile_public_display_url_test.go
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
- FOUND commit: 6a437e53
- FOUND commit: c9d60d29
- FOUND commit: b48806f5
