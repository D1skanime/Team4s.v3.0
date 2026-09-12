# Phase 157 — Deferred Items

## 2026-09-12 — Pre-existing `tsc --noEmit` failures unrelated to Plan 04's scope

While running the full frontend `tsc --noEmit` as part of Plan 157-04 verification, three
pre-existing type errors were observed, all caused by Plan 157-01 (which added the additive
`episodes: number` field to `ProjectMemberCounts`) without updating every test fixture that
constructs a literal `ProjectMemberCounts` object:

- ~~`frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx:43`~~ —
  **closed by Plan 157-06** (added `episodes: 6` to the default `counts` fixture).
- ~~`frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx:84`~~ —
  **closed by Plan 157-06** (added `episodes: 0` to the empty-state `counts` fixture).
- ~~`frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx:60`~~ —
  **closed by Plan 157-05** (added `episodes: 0` to the `ProjectMemberHero` fixture in that file;
  `tsc --noEmit` is now clean for `ProjectMemberReleasesSection.test.tsx`).

None of these files were in Plan 157-04's `files_modified` list (`ProjectMemberMediaGallery.tsx`,
`ProjectMemberMediaGallery.module.css`, `ProjectMemberMediaGallery.test.tsx`), and the errors were
not caused by Plan 04's changes — `tsc` reported zero errors for any file Plan 04 touched. Per the
executor's scope-boundary rule, they were logged here rather than fixed inline at the time.

**Status as of Plan 157-06 (2026-09-12): all three items closed.** `npx tsc --noEmit -p
tsconfig.json` is now fully clean project-wide (zero errors, confirmed via a full, unfiltered run
inside the frontend container).

## 2026-09-12 — Pre-existing backend test-suite baseline (unrelated to Phase 157)

Plan 157-06 ran the complete backend suite (`go build ./...`, `go vet ./...`, `go test ./...`) in
a `golang:1.25-alpine` container on the `team4s_default` network, with the full repository (not
just `backend/`) mounted so `runtime.Caller`-based migration-path resolution in
`internal/testsupport/*.go` works correctly (a bind-mount of `backend/` alone makes those helpers
resolve `/database/migrations` at the container root and fail every phaseNNN-Postgres-backed test
with a misleading "no such file or directory", independent of any real regression).

With the full repo mounted, `go build ./...` and `go vet ./...` are clean. `go test ./...` reports
the following pre-existing, environment-caused failures, unrelated to any Phase 157 change:

- `internal/migrations`: 6 failures — `TEAM4S_PHASE134_MIGRATION_DSN`/`TEAM4S_PHASE128_TEST_DSN`
  not set in this execution environment.
- `internal/repository`: 49 failures — the same count and cause repeatedly documented across
  Phase 156 (156-05/06/07/09/10/15 in `STATE.md`): missing `TEAM4S_PHASE128_TEST_DSN`, a live
  Keycloak dependency for the Phase-134 verification matrix (`sheppert@team4s.local` password
  grant fails / `192.168.235.196:18093` connection refused from inside the container network),
  and a small number of pre-existing, already-failing-before-this-phase feature-gap tests
  (`TestEvaluateMemberMutationConflictBlocksLastActiveManager`,
  `TestClaimSubmitBlockedForMemorialProfile`/`TestClaimBlockWritesDeniedAudit`/
  `TestClaimBlockDeniedAuditOutcomeColocated` — literally asserting an unimplemented memorial-
  profile guard — and `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`), none of which
  touch `project_member_*`/`public_note_role_code`/`theme_segment_*` files this phase's plans
  modified.
- Every Phase-157-relevant package is fully green: `internal/handlers` (all `TestProjectMember*`
  subtests, including `TestProjectMemberGetSummary_ReturnsEpisodesCount`), and, targeted directly,
  `TestProjectMemberEpisodesCountUnionDedup` (`internal/repository`, run with
  `TEAM4S_PHASE117_TEST_DSN` pointed at the pre-existing `team4s_phase117_test_156` database,
  password derived from the live backend container's own `DATABASE_URL`) — confirmed
  `countEpisodes == 3` for its 4-episode fixture.

Not fixed (all out of scope for Phase 157, pre-existing, environment/feature-gap causes, not
regressions introduced by any 157-0x plan).

## 2026-09-12 — Plan 157-06 Task 4 live-UAT: independent second-review deviations A-F (checkpoint OPEN)

Task 4 of Plan 157-06 (`checkpoint:human-verify gate="blocking"`) is the phase's designed
acceptance gate and requires actual human sign-off — it has NOT been given. A second, independent
reviewer ran their own Playwright pass over `127.0.0.1:3300` (both viewports, fresh frontend
restart) to verify the executor's Task 3 claims rather than accept them at face value, confirmed
essentially all of them, and additionally found six reference deviations (A-F). Full detail and
before/after table: `157-06-SUMMARY.md`. Short form:

- **A (real gap, verified in source):** section header icons are inconsistent — Media has one
  (`ImageIcon`, `ProjectMemberMediaGallery.tsx`), Notes and Releases headers have none (Releases'
  `Package` icon only appears inside its empty state, not its `count > 0` header). Reference shows
  an icon on all three headers. Not fixed — candidate change identified in `157-06-SUMMARY.md`.
- **B (forced by "no new tokens", documented not silently accepted):** summary band uses
  `var(--surface-sunken)` (beige) vs. the reference's light-blue tint; no existing global token is
  a closer match, and adding one is barred by the phase's "no new design tokens" constraint.
- **C (structural, not fixed):** section headers sit on the page background instead of inside one
  white card per section, unlike the reference's single-card-per-section framing.
- **D (already known, still open):** mobile hero (≤640px) stacks the avatar above the name, not
  avatar-left/name-right; only button-stacking was authorized by the order.
- **E (allowed, informational):** Statistik 2×2 wrap and two-line tab-row wrap on mobile are
  explicitly permitted deviations, not defects.
- **F (investigated and resolved, not a Phase-157 issue):** the "blue vertical stripe" at
  x≈0-8px near the first notes on the desktop screenshot is the pre-existing global
  `AppShell.module.css` `.brandMark`/`.userAvatar` block (`background: var(--color-primary,
  #2f5fe3)`) — persistent app-shell chrome outside Phase 157's scope, not a screenshot artifact
  and not introduced by any 157-0x plan.

None of A-F were auto-fixed or auto-closed as cosmetic. Phase 157 is NOT fully accepted; `STATE.md`
continues to show 157-06/Task 4 outstanding.
