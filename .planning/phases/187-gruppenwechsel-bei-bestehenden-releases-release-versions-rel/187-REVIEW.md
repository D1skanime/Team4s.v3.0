---
status: clean
files_reviewed: 40
depth: standard
critical: 0
warning: 0
info: 0
total: 0
---

# Phase 187 Code Review

## Findings

No issues found.

## Verification notes

Reviewed all 40 files listed for this phase (backend guard/repository/handler code,
their tests, the two shared-contract files, and the frontend editor-page split +
import-page conflict panel).

Specifically checked and found correct:

- **Dependents-guard core** (`release_version_group_guard.go`): `DependencySummary`
  deliberately never reads `release_crew_snapshots` (D-09 — matches the
  Postgres-fixture test `TestReleaseVersionGroupGuardCountDependents`'s "inherited
  empty snapshot does not count" subtest). `diffRemovedReleaseVersionGroupIDs` is a
  plain current-minus-new set difference, proven via table test
  (`TestDiffRemovedReleaseVersionGroupIDs`) for add/partner-removed/replace/both-empty.
  `ensureRemovedReleaseVersionGroupsHaveNoDependents` is a true no-op (zero queries,
  verified with a query-counting traced pool) when `removed` is empty, which is exactly
  the same-group-update/add-only case.
- **Editor-path vs. import-path asymmetry (D-07/D-12)**: both
  `syncEpisodeVersionSelectedGroups` (editor, `episode_version_repository_group_sync.go`)
  and `upsertReleaseVersionGroup` (import apply,
  `episode_import_repository_release_groups.go`) call the exact same
  `queryCurrentReleaseVersionGroupIDs` → `ensureReleaseVersionGroupsNotReducedToEmpty` →
  `diffRemovedReleaseVersionGroupIDs` → `ensureRemovedReleaseVersionGroupsHaveNoDependents`
  sequence — no per-call-site exception flag exists, so the "import always allows
  same-group/add, blocks only an actual replace" behavior falls out of the identical
  shared guard by construction, exactly as the code comments claim. Confirmed no
  duplicate definitions of `upsertReleaseVersionGroup` /
  `ensureAnimeFansubGroupLinksForMembers` / `buildAnimeFansubLinkGroupIDs` exist after
  the file split (would not compile otherwise).
- **D-11 (guard applies even to platform admins)**: proven end-to-end at the HTTP layer
  in `episode_version_update_test.go` (`TestUpdateEpisodeVersion_GroupGuard`) using a
  real `IsPlatformAdmin: true` identity — 409 with the per-kind German breakdown, 400 on
  zero-group reduction, 200 when the removed group has zero dependents.
  `isReleaseMetadataOnlyPatch` correctly keeps non-admins out of the group-change path
  entirely via a 403 before the guard is ever reached (pre-existing, unaffected by this
  phase).
- **Per-row conflict continuation (D-12, Plan 05)**: the `errors.As`/`errors.Is`
  switch in `applyReleaseNative` only `continue`s past a guard rejection (pre-check,
  no partial writes to unwind), aborts the whole transaction on every other error, and
  is proven both unit-style (`TestApplyEpisodeImportConflict`, replace-rejected +
  zero-group-rejected) and via the kept-group-survives / rejected-group-never-written
  assertions.
- **German pluralization**: backend `germanPluralCount`/`GermanReasonFragment`
  (`release_version_group_guard.go`) and frontend `formatGermanCount`/
  `formatDependentsReason` (`episodeVersionEditorUtils.ts`) use the identical
  "exactly 1 → singular, everything else including 0 → plural" rule for all three
  counted kinds (Credit/Credits, Medium/Medien, Notiz/Notizen); both are table-tested
  across 0/1/2+ for every kind and a mixed case, and the two implementations' output
  strings match each other and the shared contract description.
- **450-line limit**: every non-contract production/test file in this phase's diff is
  at or under 450 lines (largest are `episode_version_public_integration_test.go` at
  440 and `episode_import_repository_release_helpers.go` at 436); confirmed with
  `wc -l` against the full touched-file list.
- **Teststil**: the phase actually *removed* two pre-existing source-grep
  (`os.ReadFile`+`strings.Contains`) tests whose grep targets moved during the file
  split, replacing them with either a real-Postgres behavior test or a code comment
  explaining why the stronger existing coverage already proves the claim — correctly
  not relocating the forbidden pattern into the new files. Two source-grep tests
  remain in `episode_version_repository_write_helpers_test.go`
  (`TestApplyEpisodeVersionVariantMetadataWritesCRC32`,
  `TestResolveImportFansubMemberGroups_RejectsUnknownGroupID`); these predate Phase 187
  untouched (confirmed via `git diff`) and are the already-acknowledged CLAUDE.md
  Altlast, not a new violation. The one remaining `os.ReadFile`-based test this phase
  added (`TestFansubRepositoryMergeCoreHasNoGuardReferences`) is a CLAUDE.md-permitted
  absence check.
- **UI primitives**: `FansubGroupsSection.tsx` (the phase's actual UI-facing change,
  "Partnergruppe hinzufügen" + dependents chip) uses `Button`/`Input` from
  `@/components/ui` throughout, including for the chip buttons (verified `Button`
  defaults `type="button"`, so the chips cannot accidentally submit the surrounding
  form). The other newly-split files (`EpisodeVersionTabNav.tsx`,
  `EpisodeVersionActionBar.tsx`, `DateienTabSection.tsx`,
  `InformationenTabSection.tsx`) do contain native `<button>`/`<input>` elements, but a
  diff against the pre-split monolith confirms this is byte-for-byte relocated legacy
  code, not new UI. The repo's actual enforcement mechanism
  (`frontend/eslint.config.mjs`'s `uiPrimitiveGuard`) only targets
  `select`/`input`/`textarea`, not `button`; consistent with that, only the two files
  with relocated `<input>` elements (`DateienTabSection.tsx`,
  `InformationenTabSection.tsx`) were added to the `LEGACY_NO_RESTRICTED_SYNTAX_FILES`
  ratchet, with `EpisodeVersionEditorPage.tsx` correctly removed from that list since
  splitting left it with no native elements of its own.
- **Umlauts**: all new/changed German user-facing strings (backend 409/400 messages,
  frontend chip tooltip, import-page conflict list, tab/section labels) use correct
  umlauts (ü, ä, ö) with no ASCII substitutes.
- **Contracts**: `shared/contracts/openapi.yaml`/`admin-content.yaml` additions
  (`FansubGroupDependents`, `selected_group_dependents`, `EpisodeImportApplyConflict`,
  `conflict_details`) match the Go model fields and the TypeScript type additions in
  `frontend/src/types/episodeVersion.ts`/`episodeImport.ts` field-for-field.
- **SQL safety**: all guard/apply queries are parameterized (`$1`/`$2` placeholders);
  the one `fmt.Sprintf`-built query (`lookupIDByName`) only ever interpolates
  hard-coded table-name string literals from call sites, never request input, and
  predates this phase.

No Go toolchain was available in this review sandbox to run `go build`/`go test`
directly; correctness was established by tracing call sites, cross-checking against
the Postgres-fixture and httptest-based tests already included in the diff (which
behavior-execute the guard logic per the project's Teststil rule), and diffing against
the pre-phase file versions where relevant.
