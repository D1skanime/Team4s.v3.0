# Deferred Items — Phase 112

Logged during Plan 112-03 execution (2026-07-28). These are pre-existing full-suite
failures observed via `cd frontend && npm run test`, unrelated to any file touched by
Plan 112-03 (`MemberBadgeChain.tsx`, `MemberBadgeChain.module.css`,
`memberBadgeLabels.ts`, `members/[slug]/page.tsx`). Out of scope per executor scope
boundary — not fixed, not investigated further.

- `src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` — AniSearch merge
  regressions: `payloadCoverImage` expected an absolute `http://localhost:8092/...` URL,
  received a relative `/api/...` path (env-driven `resolveApiUrl` base URL mismatch).
- `src/app/admin/anime/page.test.tsx` — 3 failing cases (overview list, create CTA,
  success confirmation).
- `src/app/fansubs/__tests__/publicPageWidthContract.test.ts` — desktop width contract
  case fails above mobile breakpoint.
- `src/app/me/profile/page.test.tsx` — background-crop retained-source case times out on
  `waitFor(fetchMock ...)`.
- `src/components/contributions/ReportModal.test.tsx` — 5 failing target-context cases.
- `src/components/profile/MemberContributionFilters.test.tsx` — empty-state case (GAP-1/GAP-2).

Full targeted suite for this plan (`MemberBadgeChain`, `memberBadgeLabels`,
`members/[slug]/page.tsx`) is green: 29/29 tests pass, `npm run typecheck` clean.
