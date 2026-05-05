---
phase: quick-260423dxc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/handlers/admin_episode_import.go
  - backend/internal/handlers/admin_episode_import_test.go
autonomous: true
requirements: []
must_haves:
  truths:
    - "PreviewEpisodeImport only returns Jellyfin candidates not already persisted for this anime"
    - "If the DB coverage query fails, all candidates are shown (graceful degradation)"
    - "filterAlreadyMappedCandidates correctly excludes any candidate whose MediaItemID matches a persisted row"
    - "filterAlreadyMappedCandidates passes through all candidates when no existing mappings exist"
  artifacts:
    - path: "backend/internal/handlers/admin_episode_import.go"
      provides: "Filter call in PreviewEpisodeImport after loadEpisodeImportMediaCandidates"
      contains: "filterAlreadyMappedCandidates"
    - path: "backend/internal/handlers/admin_episode_import_test.go"
      provides: "Two regression tests for filterAlreadyMappedCandidates"
      exports:
        - "TestFilterAlreadyMappedCandidates_ExcludesPersistedJellyfinItems"
        - "TestFilterAlreadyMappedCandidates_PassesThroughWhenNoExistingMappings"
  key_links:
    - from: "backend/internal/handlers/admin_episode_import.go (PreviewEpisodeImport)"
      to: "backend/internal/repository/episode_import_repository.go (PreviewExistingCoverage)"
      via: "h.episodeImportRepo.PreviewExistingCoverage on lines 79-85"
      pattern: "PreviewExistingCoverage"
---

<objective>
Filter already-imported Jellyfin candidates out of the episode-import preview response so
a second preview only surfaces genuinely new files rather than repeating every prior import.

Purpose: Admins re-opening the import workbench for an anime that already has some episodes
imported were shown all Jellyfin files again, creating confusion about what still needs work.

Output:
- PreviewEpisodeImport calls PreviewExistingCoverage after fetching media candidates and passes
  the result through filterAlreadyMappedCandidates before building the preview response.
- Graceful degradation: if the coverage query errors, the full candidate list is used and the
  error is logged but not surfaced to the caller.
- Two regression tests covering the core filter logic.

Status: IMPLEMENTATION ALREADY COMPLETE. Both tasks below are verification and commit tasks.
The changes are present in working-tree modified files and need to be confirmed green and
committed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@backend/internal/handlers/admin_episode_import.go
@backend/internal/repository/episode_import_repository.go
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify filter wiring and regression tests pass</name>
  <files>
    backend/internal/handlers/admin_episode_import.go
    backend/internal/handlers/admin_episode_import_test.go
  </files>
  <action>
    Confirm the implementation already present in the working tree is correct and complete.

    Key things to check (read, do not rewrite unless a bug is found):

    1. `PreviewEpisodeImport` in admin_episode_import.go (around line 78-85) must:
       - Guard on `h.episodeImportRepo != nil` before calling PreviewExistingCoverage
       - Call `h.episodeImportRepo.PreviewExistingCoverage(c.Request.Context(), animeID)`
       - On success: call `filterAlreadyMappedCandidates(mediaCandidates, existing)` and
         replace `mediaCandidates` with the returned slice
       - On error: log the error and continue with the full unfiltered candidate list
         (graceful degradation — do NOT return an error response)

    2. `filterAlreadyMappedCandidates` (around line 582-606) must:
       - Return candidates unchanged when `len(existing.Mappings) == 0`
       - Build a set of already-mapped IDs from `existing.Mappings[*].MediaItemID`,
         trimming whitespace and skipping blank IDs
       - Return only candidates whose trimmed MediaItemID is NOT in the set

    3. The test file must contain exactly these two test functions:
       - `TestFilterAlreadyMappedCandidates_ExcludesPersistedJellyfinItems`: feeds 4 candidates
         with 2 already-mapped IDs (plus one blank-ID row that must be ignored) and asserts
         exactly 2 candidates remain, neither being jf-ep01 or jf-ep02.
       - `TestFilterAlreadyMappedCandidates_PassesThroughWhenNoExistingMappings`: feeds 2
         candidates against an empty EpisodeImportExistingCoverage and asserts both pass through.

    If any of the above is missing or wrong, fix it. If everything is correct, proceed directly
    to the verify step.

    Run the handler tests to confirm all pass:
      cd backend && go test ./internal/handlers/... -count=1
  </action>
  <verify>
    <automated>cd backend &amp;&amp; go test ./internal/handlers/... -count=1 -v -run "TestFilterAlreadyMapped"</automated>
  </verify>
  <done>
    Both TestFilterAlreadyMappedCandidates_* tests PASS. No compilation errors. The filter
    call is present in PreviewEpisodeImport with graceful-degradation error handling.
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit the filter implementation</name>
  <files>
    backend/internal/handlers/admin_episode_import.go
    backend/internal/handlers/admin_episode_import_test.go
  </files>
  <action>
    Stage only the two backend handler files (not VERIFICATION.md or frontend files, which
    belong to separate concerns) and commit with a descriptive message.

    Commands:
      git add backend/internal/handlers/admin_episode_import.go
      git add backend/internal/handlers/admin_episode_import_test.go
      git commit -m "fix(episode-import): filter already-imported Jellyfin candidates from preview

    PreviewEpisodeImport now calls PreviewExistingCoverage after fetching Jellyfin media
    candidates and passes the result through filterAlreadyMappedCandidates so that a second
    preview only surfaces genuinely new files. If the DB query fails the full candidate list
    is used (graceful degradation). Two regression tests cover the filter logic."

    If there are no staged changes (files were already committed), skip silently and report
    the existing commit hash.
  </action>
  <verify>
    <automated>git log --oneline -3</automated>
  </verify>
  <done>
    The commit exists in git log with a message referencing episode-import candidate filtering.
    git status shows the two handler files as clean (not modified).
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
- `cd backend && go test ./internal/handlers/... -count=1` passes with no failures
- `git log --oneline -3` shows the filter commit
- `git status` shows admin_episode_import.go and admin_episode_import_test.go as unmodified
</verification>

<success_criteria>
- PreviewEpisodeImport silently excludes any Jellyfin candidate whose MediaItemID is already
  persisted as a stream_source for the anime — confirmed by both regression tests passing
- DB failure degrades gracefully: all candidates shown, error logged, no HTTP error returned
- Changes committed to git
</success_criteria>

<output>
No summary file required for quick tasks. Report outcome inline.
</output>
