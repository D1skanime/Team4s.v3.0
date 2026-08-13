# Deferred Items — Phase 74

## 74-08 (GAP-9 slug link)

- **Pre-existing repo-wide ESLint baseline failures** — `npm run lint` (full project) exits 1 due to 18 error-level results and ~326 warnings in files unrelated to 74-08 (admin episode/anime pages: `no-restricted-syntax` native inputs, `react/no-unescaped-entities`, `@typescript-eslint/no-require-imports`, react-hooks setState-in-effect). The 74-08 changed file `frontend/src/app/me/profile/components/MemberProfileHero.tsx` lints clean (`npx eslint <file>` exit 0). Out of scope per executor SCOPE BOUNDARY — not introduced by this plan.
- **Shared git stash entries present** (`stash@{0..2}`) at execution time — left untouched per worktree/stash safety convention.
