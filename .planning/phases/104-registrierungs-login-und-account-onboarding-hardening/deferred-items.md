# Phase 104 — Deferred Items

## From Plan 104-01

### Pre-existing/out-of-scope test failures (not fixed, per scope boundary)

`cd frontend && npx vitest run` shows 7 failed test files / 14 failed tests as of
this plan's execution (commit `0986ba6b`), all unrelated to Keycloak/registration
work touched in 104-01:

- `src/app/admin/anime/create/useAdminAnimeCreateController.test.ts`
- `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx`
  (fails with `No "parseReleaseDetailSearchParams" export is defined on the
  "@/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData"
  mock` — a stale `vi.mock` shape mismatch)
- and 5 further files in the same `anime/[id]/group/[groupId]` /
  `fansubprojekt` area.

These files were last touched by a concurrent session's commit
`0986ba6b fix(projects): consolidate coop partner summary` (frontend project-page
hero/stats/AvatarStack work), landed on `main` mid-session per this repo's
documented concurrent-GSD-writer posture. Plan 104-01 only touches
`infra/keycloak/**`, `scripts/verify-keycloak-config.ps1`,
`docs/operations/keycloak-auth-foundation-phase43.md`, and the new
`frontend/src/lib/keycloakRegistrationValidation.test.ts` — none of which are in
this failure area. Per the executor scope boundary ("only auto-fix issues
directly caused by the current task's changes"), these are logged here and left
unfixed for the owning phase/session to address.

## From Plan 104-02

### Pre-existing `api.no-token-boundary.test.ts` violations (not fixed, out of scope)

Running `cd frontend && npm test -- src/lib/api.no-token-boundary.test.ts` shows 2
pre-existing failures unrelated to the login/registration work in 104-02:

- `keeps normal browser app and component surfaces free of token props, params, and
  locals` fails because `src/components/groups/GroupHistorySection.tsx` accepts and
  threads an `authToken?: string` prop (lines 121, 290, 322, 329, 468, 476, 488, 500,
  509).
- `keeps direct fetch outside the central client limited to auth entrypoint,
  Keycloak, server routes, and public no-auth fetches` fails because
  `src/app/me/profile/components/ProfileBackgroundCard.tsx:67` calls `fetch(...)`
  directly outside the central client/allowlist.

Neither file is in 104-02's `files_modified` list, and `git diff --stat` for both
files is empty (they were not touched by this session). Both were last modified by
Phase 101 commits (`b7b35d99`, `ea20c750`, `30193ce5`), well before Phase 104. Left
unfixed per the executor scope boundary; the owning phase/session (likely a Phase 49
follow-up cleanup) should migrate `GroupHistorySection.tsx` off the `authToken` prop
and route `ProfileBackgroundCard.tsx`'s fetch through the central client or the
public no-auth-fetch allowlist.

## From Plan 104-03

### Pre-existing CLAUDE.md 450-line violation on `frontend/src/app/me/profile/page.tsx`

`page.tsx` was already 712 lines before Plan 104-03 (pre-existing, not introduced by
this plan). Task 2's required additions (registration-completion one-shot banner,
D-19 retry/logout error branch, restructured account-only layout) necessarily grew it
further; `RegistrationCompletionBanner` was extracted to its own component file to
partially offset the growth, landing the file at 751 lines. A full decomposition of
`page.tsx` (e.g. splitting the account-only view, the full-member workspace, and the
top-level load/error state machine into separate files) was judged out of scope for
this behavior-focused plan given the regression risk against ~36 existing/updated
tests in `page.test.tsx`. Matches the existing project convention of tracking
oversized files as deferred follow-up (see STATE.md: `AnimeJellyfinAssetUploadControls.tsx`
662 lines, "Split als Follow-up-Quick-Task deferred"). A dedicated quick task should
split `page.tsx` into `page.tsx` (state/data) + separate view components for the
account-only and full-member branches.

## From Plan 104-04

### Pre-existing CLAUDE.md 450-line violations touched by this plan (not split, out of scope)

Two backend files this plan had to edit were already over the 450-line limit before
this plan's changes:

- `backend/internal/handlers/contributions_me_handler.go` — 605 lines before this
  plan (now 620; added a shared `respondMemberProfileRequired` helper + const to
  replace six duplicated inline 404 responses, a net line-count reduction relative
  to leaving the duplication in place).
- `backend/internal/repository/member_profile_repository.go` — 1794 lines before
  this plan (now 1823; added the `hasProjectAssignments` EXISTS-query method
  required by D-06/D-09).

Both are large, pre-existing, feature-dense files (matches STATE.md's documented
observed tradeoff: "the backend handler package is large and highly feature-dense").
Splitting either was judged out of scope for this narrow, behavior-focused plan —
consistent with the existing project convention of tracking oversized files as
deferred follow-up (see the `page.tsx` / `AnimeJellyfinAssetUploadControls.tsx`
entries above) rather than restructuring mid-feature-plan.

## From Plan 104-05

### Pre-existing baseline re-confirmed, not fixed (out of scope)

Re-verified rather than newly discovered: `frontend/src/lib/api.no-token-boundary.test.ts`
still shows the same 2 pre-existing failures already logged under Plan 104-02
(`GroupHistorySection.tsx`'s `authToken` prop, `ProfileBackgroundCard.tsx`'s direct
`fetch`) — neither file is touched by this plan. The wider `~7 failed test files / 14
failed tests` baseline in the `anime/[id]/group/[groupId]` / `fansubprojekt` area
(concurrent session's project-page/hero/AvatarStack work, commit `0986ba6b`, already
logged under Plan 104-01) is also unrelated to this plan's `AppShell.tsx`/
`AppShell.test.tsx` scope. This plan's own touched tests
(`AppShell.test.tsx`, `AppShellClientWrapper.test.tsx`) are 44/44 green.

No new CLAUDE.md 450-line violation: `AppShell.tsx` grew from 409 to 444 lines
across both tasks (Task 1's nav-consolidation seam + Task 2's logout ref-guard),
kept under the 450-line limit by trimming comment verbosity rather than deferring
a split.
