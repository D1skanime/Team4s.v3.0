# WORKING_NOTES

## Current Workflow Phase
- Phase 52 `Profile Account Return Refresh Flow` is implemented on `main`; live Keycloak UAT remains pending.
- The pushed GitHub baseline included Phase 51 and audit guardrails through `20eaeeda`; quick-task commits `ed0254a9` and `65dfec11` add the `next/image` mock cleanup.
- Audit artifacts live in `.planning/quick/260525-code-altlasten-und-domain-audit`.
- Treat the audit as complete enough to close; create follow-up slices instead of redoing the audit.

## Useful Facts To Keep
- Phase 51 auth truth: `id_token` is only a login/identity artifact; Team4s API bearer must be Keycloak `access_token`.
- API audience is `team4s-api`; frontend client/authorized party is `team4s-frontend`.
- 24h login means refresh/SSO lifetime, not a 24h API access token.
- `release_version_media` is canonical for versioned Admin/Fansub process media.
- Release-version media must be addressed with `release_version_id`, not `release_id`.
- `release_media` remains separate release-level/public/legacy structure and is not a replacement for versioned process media.
- `release_version_groups.fansub_group_id` is canonical; `fansubgroup_id` is gone locally via migration 0057.
- Removed legacy frontend routes:
  - `/admin/anime/[id]/versions`
  - `/admin/anime/[id]/themes`
  - `/admin/fansubs/[id]/members`
  - `/manage/groups/[id]`
- Valid group detail route is `/admin/my-groups/[id]`; `/manage/groups` remains the valid list route.
- Upload guardrail is documented in `AGENTS.md`, `DECISIONS.md`, domain docs, and audit status: reuse existing flows before adding a new upload path.
- Domain guardrail tests now assert fansub releases expose canonical `release_version_id`, avoid legacy `fansubgroup_id`, and keep migration 0057's mismatch safety check.
- The fansub edit test's `next/image` mock now consumes `unoptimized` before rendering an `img`, matching the existing `MediaUpload.test.tsx` pattern.
- Phase 52 intentionally avoids Keycloak Account Console theming. It fixes the Team4s-side flow: new tab, return hint, `refreshActiveAuthSession()`, `getOwnProfile()`, changed-account success message, unchanged quiet path, duplicate focus guard, and dirty-form protection.

## Verification Memory
- Phase 51 live smoke: `/api/v1/me` with access token returned `200`; `/api/v1/me` with ID token returned `401`.
- Phase 51 checks passed: `go test ./...`, focused frontend auth tests, typecheck, focused ESLint, Docker rebuild, `git diff --check`.
- `gsd-sdk query init.verify-work 51` now returns `has_verification: true`.
- `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/page.test.tsx"` passed.
- `cd frontend && npm run test -- --run "src/app/admin/profile/page.test.tsx"` passed for Phase 52.
- `cd frontend && npm test -- --run src/lib/api.no-token-boundary.test.ts src/lib/api.auth-refresh.test.ts` passed after the narrow Phase 52 boundary allowance.
- `cd frontend && npm run typecheck` passed for Phase 52.
- `cd frontend && npx eslint "src/app/admin/profile/page.tsx" "src/app/admin/profile/page.test.tsx" "src/lib/api.no-token-boundary.test.ts"` passed for Phase 52.
- `cd frontend && npm run build` passed for Phase 52.
- `git diff --check` passed with only LF/CRLF working-copy warnings.
- `cd frontend && npm run lint` still fails on unrelated existing issues outside Phase 52; see `52-UAT.md`.
- `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/page.test.tsx"` passed for the mock cleanup.
- `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/page.tsx"` passed after WP-06a.
- `cd frontend && npm run typecheck` passed during the latest slices.
- Segment table, fansub list, my-groups, and episode-version editor targeted tests passed during their slices.
- `go test ./internal/repository ./internal/migrations` passed for guardrail coverage.
- `git diff --check` passed with only CRLF warnings.
- `main` includes `20eaeeda`, `ed0254a9`, and `65dfec11`; closeout notes were prepared for push after user confirmation.

## Commit Hygiene Notes
- The code quick task was committed in two commits, followed by an explicit closeout handoff commit when requested.
- Future GSD chains should still use explicit-path staging and commit each completed slice.
- Completed slices were separated into auth, route cleanup, fansub list shared UI, segment shared table, drawer race hardening, docs/contracts guardrails, and domain guardrail tests.
- `frontend/tsconfig.tsbuildinfo` was touched by typecheck during the quick task and restored; continue not staging it casually.

## Mental Unload
- The user asked why multiple agents keep leaving a dirty worktree. Root cause is shared workspace/branch plus broad page edits and generated files. Fix is branch/worktree isolation per agent plus explicit staging and a no-`git add .` rule.
- The user considers the audit done; future work should not reopen completed route cleanup or drawer race hardening without new evidence.
- The next operational slice is committing Phase 52, then live-testing the Keycloak return flow when the local auth stack is available.
