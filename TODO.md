# TODO

## Current Active Work
- [x] Run live browser/UAT for the Phase-32 release side drawer against a real fansub context (`/admin/fansubs/88/edit`).
- [x] Verify release-theme-asset upload, reload, and delete persistence against a real canonical release context.
- [x] Make the fansub timeline consume persisted release duration from the episode/release-version editor path.
- [x] Make missing `release_asset` segments show as upload-required instead of `Global/Admin`.
- [x] Align the fansub timeline rail visually with the grey episode-version editor timeline.
- [x] Keep Docker/local verification commands current in `STATUS.md`.
- [x] Smoke-test delete/re-upload of Release 41 release-theme asset — confirmed `size_bytes: 10906996` (Phase 33).
- [x] Fix release-theme asset list `size_bytes: 0` — InsertMediaFile in media_files (Phase 33).
- [x] Push 28 commits to origin/main — pushed 2026-05-07.
- [x] Rename theme types OP→OP Kara, ED→ED Kara, Insert→Insert Kara (Quick 260507-de2).
- [ ] Decide whether `fansub_groups.closed_year` and `fansub_groups.history_description` can be hard-dropped in a later cleanup phase.
- [ ] Formal retirement or removal of old manual-vs-Jellyfin entry-choice UX.

## Parking Lot
- [ ] Broader v2 rollout for non-anime entities and admin surfaces.
- [ ] Formal retirement of old manual-vs-Jellyfin entry-choice UX if still unnecessary.
- [ ] Future generic upload expansion beyond anime now that the current create/edit baseline is stable.
- [ ] Later hard cleanup for remaining fansub legacy fields once no read surface depends on them.
