# 2026-05-26 - day-summary

## What Changed Today
- Completed Phase 51: Keycloak/API auth now uses a real access-token resource-server boundary.
- Added `team4s-api` as the Keycloak API audience and wired backend config through `KEYCLOAK_API_AUDIENCE`.
- Changed frontend auth mapping so Team4s API calls persist/send Keycloak `access_token`, not `id_token`.
- Hardened backend token verification so ID tokens and wrong-audience/wrong-authorized-party tokens are rejected for API use.
- Closed the code-altlasten/domain audit loop under `.planning/quick/260525-code-altlasten-und-domain-audit`.
- Documented and reinforced that `release_version_media.release_version_id` is canonical for versioned Admin/Fansub process media.
- Updated API contracts and domain docs around release-version media.
- Removed confirmed legacy frontend routes and updated active links.
- Completed small safe UI cleanup slices using existing shared table/state components.
- Hardened fansub release drawer async behavior against stale request and stale mutation completions.
- Cleaned targeted ESLint warnings in the fansub release drawer page.
- Updated root handoff files for a restartable workspace.
- Merged and pushed Phase 51, Page/Audit cleanup, and domain guardrail tests to `main`.
- Completed quick task `260526-mhk`: cleaned the fansub edit test's `next/image` mock so `unoptimized` is not forwarded to a native `img`.
- Created commits `ed0254a9` and `65dfec11` for the mock cleanup and GSD quick-task record, then prepared closeout notes for push.

## Why It Changed
- The previous Keycloak flow mixed login identity tokens with API bearer tokens, causing a brittle auth boundary and short-lived page sessions.
- The desired 24h login behavior belongs to refresh/SSO lifetime while API access tokens remain short-lived and renewable.
- The audit found real confusion risk around old media paths, old routes, duplicated UI patterns, and drawer race conditions.
- The user confirmed which routes were dead and that `release_version_media` with `release_version_id` is the correct domain model.
- Future agents need durable guardrails so they do not rebuild duplicate upload flows or fall back to old `release_id`/`release_media` assumptions.
- The noisy test warning was removed so the fansub edit regression suite stays easier to read during future drawer/media work.

## Verified
- Phase 51 live token smoke passed: access token returns `/api/v1/me` `200`, ID token returns `401`.
- `go test ./...` passed after backend verifier changes.
- Focused frontend auth tests, frontend typecheck, focused ESLint, Docker rebuild, and `git diff --check` passed for Phase 51.
- `gsd-sdk query init.verify-work 51` reports `has_verification: true`.
- Targeted frontend tests passed for the fansub release drawer, fansub list, segment table, my-groups route updates, and episode-version editor slices.
- `npm run typecheck` passed during the relevant frontend slices.
- Targeted ESLint passed for `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`.
- `git diff --check` passed with only CRLF warnings.
- DB check confirmed `release_version_groups.fansubgroup_id` is gone locally and migration 0057 is applied.
- `shared/contracts/openapi.yaml` parsed strictly after contract updates.
- `go test ./internal/repository ./internal/migrations` passed for the domain guardrail tests.
- Final `git status --short --branch` showed `main...origin/main` with a clean worktree.
- Quick task verification passed:
  - `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/page.test.tsx"`: 7/7 tests passed.
  - `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/page.test.tsx"` passed.
  - `cd frontend && npm run typecheck` passed.
  - `git diff --check` passed with only LF/CRLF warnings.

## Follow-Up
- Start the next planned slice: `$gsd-plan-phase 52` or one more narrow `$gsd-quick`.
- Review older unrelated stashes before deleting them.
- Decide whether the next planned slice is `$gsd-plan-phase 52` or one more small `$gsd-quick`.

## Restart Notes
- Phase 51 lives in `.planning/phases/51-keycloak-access-token-resource-server-boundary`.
- Use `51-UAT.md`, `51-VERIFICATION.md`, `51-SECURITY.md`, and `51-VALIDATION.md` as the closure evidence.
- Start from `.planning/quick/260525-code-altlasten-und-domain-audit/STATUS.md` and `ROADMAP.md`.
- Treat WP-01 through WP-06a as complete.
- Do not reopen Race-Condition-Hardening unless new evidence appears; it is documented as done.
- Use explicit-path staging only for future work.
- The closeout handoff notes were committed and pushed after user confirmation on the next start.
