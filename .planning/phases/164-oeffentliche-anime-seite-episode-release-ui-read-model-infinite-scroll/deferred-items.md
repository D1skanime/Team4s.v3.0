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

## 164-09: Pre-existing full-package failures unrelated to GAP-12 (`internal/repository` broad run)

- **Found during:** Plan 164-09, Task 1 verification -- ran the plan's scoped command
  (`-run TestEpisodeImportRepository`, all green) and then an unscoped
  `go test ./internal/repository/... -count=1` in the same throwaway `golang:1.25-alpine`
  container to double-check for regressions.
- **Location/symptoms:**
  - `TestPhase134Matrix*` (several): `dial tcp 192.168.235.196:18093: connect: connection
    refused` / Keycloak password-grant `invalid_grant` -- these tests reach out to the live
    backend/Keycloak HTTP ports from inside the test process; the throwaway container used
    for this plan's isolated DB run has no route to those host-published ports.
  - `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true`: `column
    e.filler_source does not exist (SQLSTATE 42703)` -- a schema-fixture gap in
    `episode_version_dates_integration_test.go` (a file this plan did not read or touch),
    unrelated to `episodes.episode_type_source`.
- **Confirmed pre-existing and unrelated:** none of the failing tests reference
  `episode_import_repository_apply.go`, `mapAnimeTypeToEpisodeType`, `anime.type`, or
  `episode_type_source`; they fail identically regardless of this plan's diff because the
  causes are (a) network reachability from the ephemeral test container and (b) an
  unrelated pre-existing fixture/column gap in a different integration test file.
- **Not fixed:** out of scope for GAP-12 (`files_modified` for this plan is limited to
  `episode_import_repository_apply.go` and its new test file); a future plan touching
  `phase134_verification_matrix*_test.go` or `episode_version_dates_integration_test.go`
  should investigate the network wiring and the missing `e.filler_source` column
  respectively. The plan's own required verification command
  (`-run TestEpisodeImportRepository`) is unaffected and passes cleanly.

## 164-10 -> 164-12: Pre-existing `tsc --noEmit` fixture gaps for `filler_type_label`/`episode_type_label`

- **Found during:** Plan 164-12, Task 2 verification (`npx tsc --noEmit -p .`)
- **Location:** object literals constructing `PublicGroupedEpisode` without the two new
  required fields (added by 164-10): `frontend/src/app/dev/episode-windowing-preview/page.tsx`,
  `frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx`,
  `frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx` (7 sites),
  `frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx`,
  `frontend/src/components/fansubs/useWindowedEpisodePages.test.ts`.
- **Confirmed pre-existing, tsc-only (no runtime test failures):** none of these files are
  in 164-12's `files_modified` frontmatter, and the full `npx vitest run` sweep of
  `src/components/fansubs` + the admin editor tree (520 tests, 41 files) passes cleanly with
  these gaps still present -- they never exercise `classificationAndTypeLine` at runtime, so
  Task 2's signature change does not break their behavior, only their type-completeness.
  164-10's own SUMMARY.md ("Known follow-up") explicitly assigns this cleanup to 164-13, the
  plan that actually wires `filler_type_label`/`episode_type_label` into
  `FansubVersionBrowser`'s rendering path.
- **Partially fixed as an unavoidable Rule 1 regression fix, not a scope expansion:**
  `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`'s `DEFAULT_CLASSIFICATION`
  fixture and its "D-48 visueller Testfall-Katalog" `it.each` blocks DID need a real code fix
  (not just a type-only patch) in 164-12, because that file's tests actually render
  `classificationAndTypeLine`'s output and asserted the exact removed hardcoded frontend
  labels ("Filler"/"Gemischt"/"Film") that Task 2 deletes -- a direct runtime regression
  caused by this plan's own signature change, not a pre-existing issue. Updated to assert the
  real 164-10 DB-backfilled labels ("Zusatzfolge"/"Teilweise Zusatzfolge"/"Movie") instead,
  with `filler_type_label`/`episode_type_label` passed explicitly per test case.
- **Not fixed (remaining tsc-only gaps):** out of scope for 164-12 (only
  `episodePreviewFormat.ts`/`.test.ts`, `ReleasePreviewRow.tsx`, `EpisodeGlassCard.tsx`,
  `FansubVersionBrowser.test.tsx` (regression-forced), and the admin editor utils/test files
  needed real edits in this plan; the one instance inside 164-12's own
  `episodePreviewFormat.test.ts` fixture, `resolveEpisodeTitle`'s `baseEpisode`, WAS fixed
  since that file is directly owned by this plan). 164-13 must add the two label fields to
  the five files listed above before its own `tsc --noEmit` gate can pass cleanly.
- **RESOLVED in 164-13:** all five files (`episode-windowing-preview/page.tsx`,
  `FansubVersionBrowser.filterSwitch.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx`,
  `FansubVersionBrowser.windowing.test.tsx`, `useWindowedEpisodePages.test.ts`) now include
  `filler_type_label`/`episode_type_label` on every `PublicGroupedEpisode` fixture object
  literal (labels matching the migration-0169 backfill for the codes each fixture already
  used). `npx tsc --noEmit -p .` is fully clean as of this plan; no runtime behavior changed
  in any of the five files. Commit `5be9a293`.
