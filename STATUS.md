# STATUS

## 2026-05-21 Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Current phase outcome:** Phase 49 central Auth/API client and token lifecycle hardening is verified `PASS_WITH_NOTES`.
- **Current branch:** `main`
- **Committed baseline:** `b9b078c6` (`docs(49): add auth api planning artifacts`)
- **Current focus:** resume from the verified central-client baseline, then pick a narrow follow-up: planning metadata reconciliation or unrelated lint cleanup.

## What Works Now
- The central Auth/API client owns normal API token reads, persistence, refresh coordination, request auth headers, auth-related 401 retry, upload/XHR auth, and auth-state resync.
- Normal pages/components are statically gated from direct raw token reads, direct bearer construction, token props/params, duplicate XHR auth, and browser auth storage.
- `useAuthSession`/session snapshots expose token-free state for normal UI gating.
- Upload/XHR paths use central preflight refresh/header behavior and avoid unsafe automatic replay after upload 401.
- SSR pages and Jellyfin/streaming routes are documented as separate server-side boundaries for Phase 49.

## What Is Not Done Yet
- Full `npm run lint` still fails on unrelated existing files/scripts: `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and `tmp-live-full-flow*.js`.
- `api.ts` still carries central-client compatibility `authToken?: string` parameters; this is allowed only inside the central client and is guarded from normal page/component use.
- `.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/REQUIREMENTS.md` may still need metadata reconciliation against the completed Phase 49 artifact set.
- Workspace remains broadly dirty with unrelated code, planning, scratch, and `.codex` tooling changes.

## Valid Commands
- `cd frontend && npm run test -- api.auth-refresh.test.ts api.session-switch.test.ts api.admin-anime.test.ts api.no-token-boundary.test.ts components/auth/AuthSessionSwitchGuard.test.tsx app/auth/page.test.tsx lib/server/streamRelayAuth.test.ts`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd frontend && npx eslint src/lib/api.ts src/lib/api.auth-refresh.test.ts src/lib/api.session-switch.test.ts src/lib/api.admin-anime.test.ts src/lib/api.no-token-boundary.test.ts src/components/auth/AuthSessionSwitchGuard.test.tsx`
- `cd frontend && npm run lint`
- `git diff --check`

## Verification Evidence
- 2026-05-20: `49-VERIFICATION.md` recorded `PASS_WITH_NOTES`, 12/12 must-haves verified, no blocking gaps.
- 2026-05-20: Focused auth/static/upload/session suite passed: 7 files / 49 tests.
- 2026-05-20: Typecheck, build, targeted Phase 49 lint, static gates, and scoped diff check passed.
- 2026-05-20: Full lint failed only on unrelated existing files/scripts listed above.

## Top 3 Next
1. Re-read `49-VERIFICATION.md` and `docs/frontend/auth-api-client.md` so the next slice starts from the actual verified boundary.
2. Reconcile Phase 49 planning metadata drift in `.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/REQUIREMENTS.md` if that remains the chosen next slice.
3. Alternatively, isolate and clean the unrelated full-lint failures without changing the Phase 49 auth boundary.

## Risks / Blockers
- Full lint is not green globally because of unrelated existing errors; do not report Phase 49 as failing because of those without separating scope.
- SSR and streaming are explicit server-side boundaries; accidentally treating them as normal browser API calls would blur the Phase 49 decision.
- The very dirty worktree raises commit-boundary risk, especially around unrelated `.codex` tooling and older product changes.
