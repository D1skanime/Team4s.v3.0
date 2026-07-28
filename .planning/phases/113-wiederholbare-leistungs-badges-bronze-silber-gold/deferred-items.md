# Deferred Items — Phase 113

Items discovered during execution that are out of scope for the current plan/task
(pre-existing, unrelated to the files this plan touches). Logged per Scope Boundary
rule, not fixed.

## 113-03 Task 1 (verification-only, no code changes permitted)

- **File:** `frontend/src/components/profile/LatestContributionsSection.test.tsx`
- **Symptom:** `npx vitest run src/components/profile/` reports 1 failed test file / 2 failed
  tests (`getMultipleElementsFoundError` — duplicate `getByText('Mein Timing-Rückblick')` /
  `'Karaoke Memoirs'` / `'Episode 01 - v2'` matches in the rendered DOM).
- **Root cause hint:** Component/test last touched in Phase 99 commits
  (`41234340`, `414dcabf`, `77e4e94b`, `a765f82a`) — predates Phase 113 entirely.
  Neither 113-01 nor 113-02 touched `LatestContributionsSection.tsx` or its test.
- **Scope decision:** Out of scope for 113-03 (verification-only plan, no code changes
  allowed). Not fixed. Full suite otherwise green: 107 passed, 3 todo, 1 skipped
  (contribution-badge-relevant files `memberBadgeLabels.test.ts` and
  `MemberBadgeChain.test.tsx` are unaffected and pass).
- **Follow-up:** Needs its own quick task / bugfix plan outside Phase 113.
