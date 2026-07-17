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
