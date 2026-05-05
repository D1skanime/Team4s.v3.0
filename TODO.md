# TODO

## Current Active Work
- [x] Run live browser/UAT for the Phase-32 release side drawer against a real fansub context (`/admin/fansubs/88/edit`)
- [x] Verify release-theme-asset upload, reload, and delete persistence against a real canonical release context
- [ ] Audit migrations `0055` to `0057` and document the cleanup-boundary risk before adding more schema work
- [ ] Finish the remaining release-drawer state/race audit for switching between neighboring releases and drawers
- [ ] Keep Docker/local verification commands current in `STATUS.md`
- [ ] Decide whether `fansub_groups.closed_year` and `fansub_groups.history_description` can be hard-dropped in a later cleanup phase
- [ ] Separate or at least review-stage repo-local GSD/Codex tooling churn apart from product code

## Parking Lot
- [ ] Broader v2 rollout for non-anime entities and admin surfaces
- [ ] Formal retirement of old manual-vs-Jellyfin entry-choice UX if still unnecessary
- [ ] Future generic upload expansion beyond anime now that the current create/edit baseline is stable
- [ ] Later hard cleanup for remaining fansub legacy fields once no read surface depends on them
