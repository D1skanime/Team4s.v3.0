# Deferred Items — Phase 162

## Pre-existing, out-of-scope test failure: `TestFansubRepository_PublicProfileSourceInvariants`

**Found during:** Plan 162-01, Task 3 verification (`go test ./internal/repository -run 'Fansub'`).

**Symptom:** `fansub_repository_test.go:85: expected public profile repository to contain
"FROM anime_media am"` — the test asserts (via forbidden `os.ReadFile` + `strings.Contains`
source-matching, itself a pre-existing Teststil violation predating CLAUDE.md's current rules)
that `fansub_repository.go` contains a literal `"FROM anime_media am"` SQL fragment. That
fragment does not exist anywhere in the file.

**Confirmed pre-existing, unrelated to Plan 162-01:** `git diff b6320e14 HEAD --
backend/internal/repository/fansub_repository.go` shows the 162-01 diff only *adds* the new
`LEFT JOIN LATERAL` story-preview block to `ListAnimeFansubs`; it does not touch
`GetPublicProfileBySlug` or remove any `anime_media` query. The fragment was already absent at
commit `b6320e14` (phase-162 plan-creation commit, before any 162-01 execution). Root cause is
presumably an earlier banner-query refactor (e.g. Phase 152-03 "trim public group load path")
that changed the SQL shape without updating this pinned string-match test.

**Action taken:** none — out of scope per the deviation-rules scope boundary (only auto-fix
issues directly caused by the current task's changes). Not fixed, not touched.

**Recommendation:** a future plan should either update the pinned fragment to match the current
`GetPublicProfileBySlug` SQL, or (preferably, per CLAUDE.md Teststil) replace this string-matching
test with a real behavior-executing test against a fake/real repository, consistent with the
Altlast note in CLAUDE.md ("49 Dateien / 236 Assertions... kein Vorbild zum Weiterkopieren").
