# Segment assignment slot fix: backend implementation notes

## Ownership and consumers

The uniqueness scope is `(real release_version_id, CanonicalSegmentType(theme_types.name))` for OP and ED, independently. Existing `CanonicalSegmentType` is reused; no numeric theme IDs, naming heuristics, SQL type mapping, tables, migrations, or parallel registry were added. INSERT/KARA/other segment kinds keep their existing cardinality.

Writers audited: `AssignThemeSegmentToReleaseVersion` (direct API), `CreateAnimeSegment` (editor initial assignment plus range), `UpdateAnimeSegment` (range reconciliation and ThemeID changes), `UpdateAdminAnimeTheme` (ThemeTypeID changes), `AssignThemeSegmentToEpisodeRange` (existing repository seam), `autoAssignThemeSegmentsForNewReleaseVersion` through `upsertReleaseVersionGroup` / `applyReleaseNative` (reverse import). All now participate in the same anime-row `FOR NO KEY UPDATE` transaction lock. Import obtains the lock before existing variant locks and rejects an existing media variant owned by another anime before locking it.

Create returns `(segment, rangeSync, error)` and Update returns `(rangeSync, error)` internally. External successful envelopes remain `{data,range_sync}`. Assignment reconciliation is part of the metadata transaction; an all-occupied target set aborts before any metadata/assignment commit, including segment creation. A range without any existing release targets remains valid for the established segment-first workflow. Direct assignment repeats of an existing valid pair remain idempotent. Same-anime direct assignment can still explicitly cross group/version domains; automatic ranges and import remain group/version scoped. Different-anime new direct writes are rejected. The prior Phase156 cross-domain cleanup fixture deliberately seeds its historical invalid row through SQL instead, preserving the test that reconciliation never erases it.

Range results add `skipped_conflicts` with real version ID, actual episode number and existing segment ID. All-occupied create/update/direct/type mutation return 409 with `segment_assignment_conflict`; user-facing German message directs the user to a free range or the existing segment. Own unchanged slots remain editable; existing collision rows are not rewritten or deleted. Override-protected assignments remain protected, and type changes validate every retained assignment including assignments outside the reconciled domain.

Reverse import collects candidates across all newly attached groups together, with explicit anime ownership. One unique OP/ED candidate attaches only if that actual version slot is free. Multiple candidates leave the slot empty and emit bounded count/type/version logging; no arbitrary ordering selects a winner. An independent unambiguous other slot still attaches. Existing assignments remain untouched.

Single-segment readbacks previously omitted assignment hydration even though list reads used it. `loadSegmentByID` now uses that same `hydrateSegmentAssignmentMetadataList` seam, so sparse assigned IDs/episodes are present after Create/Update as well. Render preparation remains after commit and successful write responses reload after it, preserving queued status visibility.

## Verification scope and limits

Dedicated PostgreSQL fixture tests use the existing Phase117 schema tooling in a new temporary Postgres16 container with tmpfs, no published port, no live database access. The resource-bounded runner is `run_backend_focused.py` in this quick directory. It caps Go memory/parallelism and removes only containers it created after verifying exact container IDs. No migrations or live row changes have been applied.

The new assignment occupancy selection and INSERT are set based. A queryCounter fixture measures 1 versus 100 targets. Existing playback source hydration and render preparation use per-assignment loops; no whole-save constant-query or latency improvement is claimed. These inherited source/render mechanisms are not rewritten by this fix.

Human UAT for Phase156 remains open; these are technical regressions and do not constitute a human sign-off.

## Final technical gate

Final coherent isolated gate: **76 passing test events (30 top-level tests plus46subtests), 0 failed, 0 skipped**, exit0,19.31s including compilation. Includes direct/Create/Update/theme-type HTTP409, sparse success envelope, actual OP/ED slots, idempotence, all-occupied rollback and no orphan segment, range gaps, future no-target range, protected overrides, canonical alias/type mutation, same-theme multiple-segment type mutation, parallel direct/create/range/typechange writers, reverse ambiguity and anime/version isolation, cross-anime variant lock rejection, existing hydration/playback, origin, and public segment-origin query-budget regressions.

New standalone assignment query measurement: **10 statements for1target and10statements for100targets**. Both include transaction and locking round-trips. The former implementation issued one INSERT per new target; static baseline count on its simple add path was N+5statements, not a measured whole-request latency comparison. Existing render/hydration loops remain outside this bounded assignment result.

Evidence: `backend-focused-final.json`, `backend-focused-final.jsonl`, reproducible `run_backend_focused.py`. Full frontend lint/typecheck/build/browser checks are integrated by the parent agent. Backend files pass gofmt and `git diff --check`. No commit was created by this backend worker; integration owns atomic commits. No live database, migration, persisted media, origin assignment, contributor selection, or unrelated worktree changes were made.

### Final ownership guard

A positive editor release version is validated against the segment anime before any range reconciliation, including complete ranges that do not need the initial direct-assignment branch. This reuses `validateSegmentAssignmentTargetTx` inside the same transaction. A dedicated complete-range foreign-editor fixture asserts rejection and rollback of both new segment and assignments; no separate auth mechanism was introduced. Ownership mismatch uses the existing generic409 `invalid_theme_or_group` envelope; the new `segment_assignment_conflict` code remains reserved for occupied slots.
