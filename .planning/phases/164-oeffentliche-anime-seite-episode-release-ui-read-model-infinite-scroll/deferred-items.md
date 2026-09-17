# Deferred Items — Phase 164

Pre-existing issues encountered during plan execution that are out of scope for the
current task (SCOPE BOUNDARY rule: only auto-fix issues directly caused by the current
task's changes). Logged here, not fixed.

## 164-02: Pre-existing `AnimePageProps` typecheck error (unrelated to this plan)

- **Found during:** Plan 164-02, Task 2 verification (`npx tsc --noEmit`)
- **Location:** `.next/dev/types/app/anime/page.ts` / `frontend/src/app/anime/page.tsx`
  (`AnimePageProps` does not satisfy Next.js 16's generated `PageProps` constraint for
  `searchParams`)
- **Confirmed pre-existing:** Reproduces identically against the original file content at
  HEAD (before this plan's `frontend/src/types/episodeVersion.ts` edits), verified by
  temporarily restoring `git show HEAD:...` content and rerunning `tsc --noEmit`.
- **Not fixed:** unrelated to `PublicEpisodeVersion`/`PublicGroupedEpisode` additive
  changes; belongs to whichever future plan owns `frontend/src/app/anime/page.tsx`'s
  Next.js 16 route-prop typing.

## 164-02: Pre-existing flaky/failing test — "merges 125 variants over explicit pages..."

- **Found during:** Plan 164-02, Task 2 verification (`npx vitest run
  FansubVersionBrowser.test.tsx`)
- **Location:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`,
  `bounded public inventory continuation > merges 125 variants over explicit pages by
  episode_id/variant_id, retaining counts and neutral equal-number episodes`
- **Symptom:** `Unable to find an accessible element with the role "button" and name
  "Weitere Episoden und Versionen laden"` after several `for`-loop iterations of
  fireEvent.click + waitFor.
- **Confirmed pre-existing:** Reproduces identically against the original file content at
  HEAD (before this plan's `DEFAULT_CLASSIFICATION` fixture additions), verified the same
  way as above (temporary restore + isolated `-t 'merges 125 variants'` run, same failure
  at the same line).
- **Not fixed:** out of scope for this plan (contract/type-only plan); a future plan
  touching `FansubVersionBrowser.tsx`/its pagination-loading logic should investigate.
