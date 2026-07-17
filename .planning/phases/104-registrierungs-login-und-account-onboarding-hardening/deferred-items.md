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
