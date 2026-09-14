# Bounded backend review — Quick 260914-fc1

Date: 2026-09-14
Reviewer: segment_slot_review
Status: two findings corrected; no remaining finding in the re-reviewed sections.

## Reviewed scope

Initial read-only review covered the new assignment-slot seam, direct/range assignment writers, atomic segment create/update, theme-type mutation, reverse import and mutation handlers. Follow-up review was limited to the two corrections below and their focused tests. No implementation files, runtime data or tests were modified by the reviewer.

## Findings and closure

| Finding | Correction and evidence | Status |
| --- | --- | --- |
| P1: Cross-anime reimport could lock input anime A, then a variant of B, then anime B, reversing the normal import lock order. | `episode_import_repository_apply.go` passes the authoritative input anime into `episodeImportReleaseIDs`. `episode_import_repository_release_helpers.go:33-58` reads existing anime ownership without a row lock and returns `ErrConflict` on mismatch before locking the variant. `TestSegmentSlotImportRejectsOtherAnimeBeforeVariantLock` holds the foreign variant lock in a separate PostgreSQL transaction and requires `ErrConflict`, rather than context timeout, from the attempted import. | Closed |
| P2: Create/update returned hydration from before render fan-out for newly added assignments. | `admin_content_anime_theme_segments.go:335-347` reloads create after Added fan-out; `:530-543` performs the final update reload after Added fan-out. The create handler test distinguishes the initial nil render status from the reloaded `queued` status and asserts the final response. `loadSegmentByID` now also uses the existing batch assignment hydration seam, so sparse assignment membership is available on mutation readbacks. `TestSegmentSlotAtomicCreateAndUpdate` asserts the actual sparse assignment IDs on a range-create response. | Closed |

The create path retains its established non-fatal handling of post-commit render/reload failures; this review does not claim those failures roll back an already committed create.

## Evidence and limits

The reviewer inspected `backend-focused-final.json`: exit code 0, 75 passed, 0 failed, 0 skipped. This is the executor's recorded run; the reviewer did not rerun heavy checks. The focused command includes assignment-slot cases, assignment/override reconciliation, reverse import, create/update handlers, playback resolution, hydration, origin and public query-budget tests.

Within the original bounded review, same-anime writer serialization, atomic conflict rollback, independent canonical OP/ED slots, own-assignment idempotence and retained-assignment type-change checks were consistent with the intended behavior. Existing overrides remain protected by the existing reconciliation seam. No full-repository audit or human UAT sign-off is asserted.

## Final integration evidence

After the bounded review, the editor-release ownership guard gained one additional focused test. The final integrated runner now records 76 passing events, 0 failed and 0 skipped; this update does not expand the reviewer's stated scope. See the final summary and backend notes.
