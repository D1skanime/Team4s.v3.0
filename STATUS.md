# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Branch:** `codex/phase-51-keycloak-auth-boundary`
- **Status:** Phase 51 Keycloak access-token resource-server boundary is complete and verified; commit/push hygiene remains open.
- **Current focus:** Commit Phase 51 plus closeout files explicitly, then keep unrelated dirty work out of that pushed slice.

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
- Targeted lint warning cleanup for `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` is done.

## What Is Not Done Yet
- Phase 51 has not yet been committed/pushed from the new branch.
- The dirty worktree contains unrelated or pre-existing audit/UI/domain/generated changes that should be stashed or committed separately.
- The audit result has not been fully commit-sliced.
- Domain guardrail tests are still a recommended follow-up, not part of today's completed audit.
- Existing test warning remains: `next/image` mock forwards `unoptimized` to a plain `img`.
- Larger Drawer/Upload/Card UI convergence is intentionally deferred.

## Valid Commands
- `cd backend && go test ./...`
- `cd frontend && npm test -- --run src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts`
- `cd frontend && npx tsc --noEmit --incremental false`
- `cd frontend && npx eslint src/lib/api.ts src/lib/keycloakAuth.ts src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts`
- `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/fansubs/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/my-groups/page.test.tsx"`
- `cd frontend && npm run test -- --run "src/app/admin/episode-versions/[versionId]/edit/page.test.tsx"`
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

## Top 3 Next
1. Commit Phase 51 plus closeout files on `codex/phase-51-keycloak-auth-boundary` by explicit path.
2. Stash or separately commit unrelated audit/UI/domain/generated dirty work before pushing.
3. Add a small `domain-guardrail-tests` follow-up for release-version media and fansub group column rules.

## Risks / Blockers
- Broad dirty worktree remains the main operational risk; never use `git add .`.
- Do not mix Phase 51 auth changes with unrelated audit/UI route cleanup in one commit.
- Do not let future agents reopen completed WP-06 race hardening from stale roadmap wording; ROADMAP now marks it implemented.
- Do not collapse versioned release media back onto `release_media`.
- Do not create a new upload flow unless the reuse guardrail has been checked and a decision is documented.
