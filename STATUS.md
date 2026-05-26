# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Branch:** `main`
- **Status:** Phase 52 `Profile Account Return Refresh Flow` is planned and ready to execute.
- **Current focus:** Execute the narrow profile/Keycloak return-refresh flow without expanding into a Keycloak theme project.

## What Works Now
- Keycloak issues access tokens with `aud` containing `team4s-api`.
- Frontend persists/sends Keycloak `access_token` as the Team4s API bearer.
- Backend verifies API access tokens with the API audience and rejects ID tokens for API calls.
- Local smoke confirmed `/api/v1/me` returns `200` for access token and `401` for ID token.
- GSD Phase 51 has UAT, verification, security, and validation artifacts.
- Audit artifacts under `.planning/quick/260525-code-altlasten-und-domain-audit` record findings, roadmap, status, UI duplicates, and decisions.
- `release_version_media` is the documented canonical path for versioned process media.
- Fansub release drawer media summary uses real `release_version_id`.
- Legacy routes confirmed by the user were removed or relinked.
- Small UI duplication slices were completed without broad redesign:
  - `/admin/fansubs` shared table adoption;
  - `/admin/fansubs` shared page-level state components;
  - `SegmenteTab.tsx` shared table adoption.
- Fansub release drawer requests and theme upload/delete finalizers are guarded against stale async completions.
- Domain guardrail tests protect `release_version_id`, `fansub_group_id`, and migration-0057 safety expectations.
- Targeted lint warning cleanup for `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` is done.
- The fansub edit test's `next/image` mock no longer forwards `unoptimized` to a native `img`.
- Closeout notes record the pushed quick-task baseline and next restart point.
- Phase 52 has 3 plans for profile return refresh, handoff copy, focused checks, and UAT.

## What Is Not Done Yet
- Larger Drawer/Upload/Card UI convergence is intentionally deferred.
- Older unrelated stashes still exist and should be reviewed before deleting.
- Keycloak-side `Zurück zu Team4s` Account Console theming is deferred; Phase 52 handles the Team4s-side new-tab and return-refresh flow.

## Valid Commands
- `cd backend && go test ./...`
- `cd frontend && npm test -- --run src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts`
- `cd frontend && npx tsc --noEmit --incremental false`
- `cd frontend && npx eslint src/lib/api.ts src/lib/keycloakAuth.ts src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts`
- `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/page.test.tsx"`
- `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/fansubs/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/my-groups/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/episode-versions/[versionId]/edit/page.test.tsx"`
- `cd backend && go test ./internal/repository ./internal/migrations`
- `cd frontend && npm run typecheck`
- `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/page.tsx"`
- `git diff --check`
- `git status --short --branch`

## Verification Evidence
- Phase 51 live smoke passed: access token accepted, ID token rejected.
- `gsd-sdk query init.verify-work 51` reports `has_verification: true`.
- `gsd-sdk query audit-open --json` shows no open items for Phase 51.
- `go test ./...` passed after the backend auth verifier change.
- Focused frontend auth tests, typecheck, ESLint, and Docker rebuild passed after the frontend access-token mapping change.
- Fansub drawer release-version-id regression test passed.
- Fansub drawer stale `getAdminRelease` response regression test passed.
- Fansub admin list shared table/state tests passed.
- Segment table shared-table tests passed.
- Typecheck passed during the relevant frontend slices.
- Targeted ESLint for `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` passed after WP-06a.
- `git diff --check` passed with only CRLF warnings.
- DB check confirmed local `release_version_groups.fansubgroup_id` is absent and migration 0057 is applied.
- `shared/contracts/openapi.yaml` parsed strictly after contract updates.
- `go test ./internal/repository ./internal/migrations` passed for the domain guardrail tests.
- `main` was pushed to GitHub through commit `20eaeeda`.
- Quick task `260526-mhk` passed the targeted fansub edit test, focused ESLint, frontend typecheck, and `git diff --check` with only LF/CRLF warnings.
- Quick task commits: `ed0254a9 test: clean fansub next image mock` and `65dfec11 docs(quick-260526-mhk): record next image mock cleanup`.

## Top 3 Next
1. Run `$gsd-execute-phase 52` to implement the profile/Keycloak return-refresh flow.
2. Review older unrelated stashes before deleting them.
3. Keep future UI convergence as small tested slices.

## Risks / Blockers
- Broad dirty worktree remains the main operational risk for future multi-agent sessions; never use `git add .`.
- Do not let future agents reopen completed WP-06 race hardening from stale roadmap wording; ROADMAP now marks it implemented.
- Do not collapse versioned release media back onto `release_media`.
- Do not create a new upload flow unless the reuse guardrail has been checked and a decision is documented.
