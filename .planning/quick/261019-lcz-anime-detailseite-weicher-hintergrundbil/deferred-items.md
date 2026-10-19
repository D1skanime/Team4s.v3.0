# Deferred Items - Quick 261019-lcz

## Pre-existing tsc error unrelated to this plan

`npx tsc --noEmit` reports one error from a Next.js-generated type-check artifact,
not from any file touched by this plan:

```
.next/dev/types/app/anime/page.ts(36,29): error TS2344: Type 'AnimePageProps' does not satisfy the constraint 'PageProps'.
```

This is generated from `frontend/src/app/anime/page.tsx`, which this plan does not
touch. The same `AnimePageProps`/`PageProps` constraint issue has recurred across
multiple prior phases (see `.planning/phases/174-.../deferred-items.md`,
`.planning/phases/148-.../deferred-items.md`, `.planning/phases/164-.../deferred-items.md`,
`.planning/phases/178-.../deferred-items.md`). Out of scope per CLAUDE.md scope
boundary rule -- not fixed here.

## Pre-existing lint errors unrelated to this plan

`npm run lint` reports 4 pre-existing errors, none in files touched by this plan:

- `capture-responsive.cjs` (2x `@typescript-eslint/no-require-imports`)
- a React Compiler "Compilation Skipped: Existing memoization could not be
  preserved" note (unrelated file in the build output)
- `src/app/admin/users/tabs/CapabilityDetailRow.tsx:77` (`react/no-unescaped-entities`)

Last touched by commit `10e6d216c` (feat(140): add review delegation management),
unrelated to this quick task. Out of scope per CLAUDE.md scope boundary rule --
not fixed here.
