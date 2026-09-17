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
- **Reconfirmed in 164-04:** still reproduces identically (same failure, same line) after
  the glass-UI restyle — the fetch/pagination logic this test exercises was not touched by
  164-04 (only rendering changed), so this pre-existing failure is unaffected either way.

## 164-04: Pre-existing line-number drift in `cssCustomProperties.guard.test.ts`'s allow-list

- **Found during:** Plan 164-04, full-suite verification (`npx vitest run`, whole
  `frontend/src` tree)
- **Location:** `frontend/src/lib/cssCustomProperties.guard.test.ts`'s
  `KNOWN_NON_CSS_TEXTUAL_MENTIONS` constant hardcodes `line: 282` for a textual (non-CSS)
  `--surface-muted` mention inside a test-description string in
  `frontend/src/lib/roleCatalog.accessibility.test.ts`; that string is now actually at
  line 268 (a 14-line drift), so both the "zero dead references" and the "allow-list stays
  exactly as small as documented" assertions fail.
- **Confirmed pre-existing and unrelated to this plan:** neither `roleCatalog.accessibility.test.ts`
  nor `cssCustomProperties.guard.test.ts` was read or modified by any 164-04 task (Task
  files: `EpisodeGlassCard.tsx/.module.css`, `ReleasePreviewRow.tsx/.module.css`,
  `episodePreviewFormat.ts/.test.ts`, `FansubVersionBrowser.tsx/.module.css/.test.tsx`,
  `LoadingState.tsx`); `git log` shows both files were last touched in phases 149/151/157,
  long before phase 164. The drift is caused by some intervening, unrelated edit to
  `roleCatalog.accessibility.test.ts` that shifted line numbers without updating this
  guard's hardcoded allow-list.
- **Not fixed:** out of scope for this plan (no touched file in 164-04 owns either the
  guard or the drifted test file); a future plan touching `roleCatalog.accessibility.test.ts`
  or `cssCustomProperties.guard.test.ts` should update the allow-list's `line` to 268 (or
  make the allow-list match by content/name only, not by exact line number, to avoid this
  class of drift recurring).
