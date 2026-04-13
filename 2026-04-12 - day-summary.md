# 2026-04-12 Day Summary

## What Changed Today
- Executed and closed the substantive Phase-13 AniSearch relation follow-through work.
- Verified that AniSearch relations now survive the create flow, are submitted on save, and persist into the database.
- Fixed the final AniSearch relation parser bug where mixed `data-graph` node container types caused valid relation graphs to decode as empty.
- Pushed the corrected baseline to GitHub `main`.

## Why It Changed
- The user reported that relation persistence still failed in real create flows even though earlier intake and save fixes were already in place.
- Investigation showed two separate issues:
  - the create payload seam needed to preserve AniSearch relation rows through final save
  - AniSearch relation pages such as `10250` (`Ace of the Diamond: Staffel 2`) were being parsed too strictly, so valid relations were silently discarded before matching

## What Was Verified
- Frontend regression coverage for create payload carry-through and create-page success/warning semantics.
- Backend handler/repository/service tests for AniSearch relation follow-through.
- Live local API verification against the running backend:
  - create with AniSearch-style `source` plus relation payload persisted a relation into the DB
  - idempotent duplicate relation rows produced `applied=1`, `skipped_existing=1`, and only one stored relation row
- Direct parser probe after the fix confirmed `10250` now yields:
  - `Hauptgeschichte -> Ace of the Diamond (8674)`
  - `Fortsetzung -> Ace of the Diamond: Act II (13997)`
- User then re-tested locally and confirmed the relations are now in the DB.

## Still Open / Follow-Up
- No active blocker remains on Phase 13 itself.
- The next slice is now chosen as edit-route relation UX; its exact scope still needs to be written down before implementation starts.
- Several root handoff files and older Phase-11 artifacts were already dirty in the worktree and remain as context, not part of today's code fix.

## Recommended Next Move
- Start the next discussion/planning slice from the now-verified Phase-13 baseline and scope the edit-route relation UX work explicitly.
- Keep broader relation-label normalization and extra AniSearch polish out of that slice unless a fresh regression forces them back in.
