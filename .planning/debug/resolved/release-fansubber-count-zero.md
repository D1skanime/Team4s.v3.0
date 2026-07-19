---
status: resolved
trigger: "Er hat noch null Fansubber, obwohl es drei oder vier Fansubber haben sollte. Kannst du das prüfen? Da fehlt wohl eine API."
created: 2026-07-18T21:20:00Z
updated: 2026-07-19T10:07:20+02:00
scope: find_and_fix
---

# Debug Session: Release Fansubber Count Zero

## Symptoms

- expected_behavior: Auf Release 1 des öffentlichen Viper’s-Creed-Fansubprojekts werden die drei bis vier tatsächlich diesem Release zugeordneten Fansubber gezählt und angezeigt.
- actual_behavior: Der Featured-Release-Bereich und die Releaseliste zeigen `0 Fansubber`.
- error_messages: Keine sichtbare Fehlermeldung; die Seite und die übrigen Release-Daten laden erfolgreich.
- timeline: Aktuell reproduzierbar nach dem responsiven UI-Umbau; ob der Zähler davor jemals korrekt war, ist nicht belegt.
- reproduction: `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed` öffnen und bei Folge 1 den Wert neben Bilder und Texte prüfen.

## Current Focus

- hypothesis: CONFIRMED — the public list/detail repositories count only exact release overrides, but the canonical effective-member model falls back per release group to anime/project defaults when no overrides exist.
- test: Focused and package-level Go tests, backend build, diff check, rebuilt runtime API calls, and browser UAT all pass.
- expecting: CONFIRMED — release list and detail expose the same three public effective contributors for release version 1.
- next_action: none
- reasoning_checkpoint:
    hypothesis: Exact-only public contributor predicates cause a false zero because release version 1 has no overrides while its three attached-group contributors are public project defaults.
    confirming_evidence:
      - Both live public endpoints return zero and an empty contributor list.
      - Read-only SQL returns zero exact rows but three effective public defaults across the two attached groups.
      - The existing admin resolver explicitly implements per-group override-or-anime-default semantics.
    falsification_test: A shared resolver fed the persisted Release-1-shaped candidate set would still return zero, or one group's override would suppress another attached group's defaults.
    fix_rationale: Load both exact and default candidates for each attached group, resolve override precedence per group, then apply the existing public gates and deduplicate once for both list and detail.
    blind_spots: Standard repository DB tests are skipped without a fixture; live runtime verification requires rebuilding/restarting the backend image after code changes.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-07-18T23:38:00+02:00
  checked: `.planning/debug/knowledge-base.md` against symptom tokens (`Fansubber`, `release`, `member`, `count`, `Viper`).
  found: The only existing entry concerns PNG-to-JPEG logo transparency; there is no two-token match for this symptom.
  implication: No known-pattern hypothesis applies; proceed with an independent end-to-end data-shape trace.
- timestamp: 2026-07-18T23:41:00+02:00
  checked: Repository-wide search for `Fansubber`, `contributors_count`, public project/release routes, and release-member projections.
  found: `PublicReleaseBlock.tsx` renders `release.contributorCount`; `projectPageData.ts` supplies it as `detail?.contributors_count ?? release.contributors_count ?? 0`; the list projection is in `group_repository_cursor.go`, while detailed counting is in `release_detail_public_repository.go`.
  implication: The UI does not independently count members. The first possible zero boundary is either the detail/list API data or their distinct backend queries; a missing field would explicitly fall back to zero.
- timestamp: 2026-07-18T23:46:00+02:00
  checked: Complete frontend loader/API type path and both backend public count implementations.
  found: The page calls `GET /api/v1/anime/{animeID}/group/{groupID}/release-list?limit=1&sort=release_date`, then `GET /api/v1/anime/{animeID}/group/{groupID}/releases/{releaseVersionID}`. Both endpoints explicitly emit `contributors_count`; both count rows in `anime_contributions` constrained by the exact `release_version_id`, `is_public_on_anime_page=true`, and public visibility. The detail endpoint also returns the matching contributor objects. `buildPublicReleasePreview` prefers the detail count over the list count and otherwise preserves zero.
  implication: There is no missing frontend field or DTO mismatch. A live zero from both endpoints would originate in the shared persisted-data selection/gating, not rendering.
- timestamp: 2026-07-18T23:52:00+02:00
  checked: Live public profile and release APIs on `http://127.0.0.1:18092`.
  found: C-Subs resolves to fansub group `1`; Viper's Creed resolves to anime `1`. `GET /api/v1/anime/1/group/1/release-list?limit=10&sort=release_date` returns release version `1` for Folge 1 with `images_count: 8`, `notes_count: 2`, and `contributors_count: 0`. `GET /api/v1/anime/1/group/1/releases/1` independently returns `contributors_count: 0` and `contributors: []` with the same nonzero media/text counts.
  implication: The frontend mapping/rendering and a single-endpoint omission are eliminated. Zero first appears no later than the backend's shared `anime_contributions` selection.
- timestamp: 2026-07-18T23:58:00+02:00
  checked: Read-only SQL for release version `1` and the canonical admin effective-contribution resolver.
  found: Release version `1` is attached through `release_version_groups` to C-Subs (`1`) and Honto (`2`). There are zero `anime_contributions` rows with `release_version_id=1`. The same anime/group contexts contain three public project-default rows (`release_version_id IS NULL`, `is_public_on_anime_page=true`, null visibility treated as public): CSubs Leader and Sheppert for C-Subs, plus honto aki for Honto. The canonical `ListEffectiveContributionsForVersion` algorithm resolves per group by exact override first and otherwise falls back to these anime defaults, yielding exactly three effective contributors.
  implication: The first point where three real effective members become zero is the public backend repository predicate `ac.release_version_id = rev.id/$1`; it bypasses the canonical per-group fallback semantics. Visibility is not the cause, and no persisted-data repair is required for this symptom.
- timestamp: 2026-07-19T00:44:00+02:00
  checked: Narrow implementation across the shared contributor projection, public detail, and cursor list.
  found: Added one batch candidate loader and production-used pure resolver. It resolves override precedence independently per attached group, applies the existing public flag/visibility gates after precedence, deduplicates by `(fansub_group_id, member_id)`, merges roles, and deterministically sorts results. Detail contributor objects and counts now share that result; cursor-list counts batch-load the same result.
  implication: The fix addresses the exact divergence point without a new endpoint, DTO, contract shape, migration, or persisted-data mutation.
- timestamp: 2026-07-19T00:52:00+02:00
  checked: Formatting and verification commands.
  found: `gofmt` completed before the runner degraded. The focused Go test command timed out after 124.9 seconds with no output; a resolver-only run timed out after 105.9 seconds with no output; compile isolation timed out after 32.4 seconds with no output. Subsequent `go version`, Docker inspection, process listing, and `git diff --check` commands also timed out without output.
  implication: No test assertion or compiler error was observed, but test success, container rebuild, live post-fix API behavior, and diff-check remain unverified because the local child-process runner is unresponsive.
- timestamp: 2026-07-19T01:02:00+02:00
  checked: Final bounded static self-review of the scoped patch.
  found: The final direct-read command for the six scoped repository files also timed out after 17.3 seconds and was terminated. Review of the applied patches confirms one shared loader/resolver is used by both surfaces; group-local precedence is keyed by release version plus fansub group; public visibility is evaluated after precedence; output is deduplicated by fansub group plus member; role labels and ordering are deterministic; no API shape, migration, media ownership, auth, or persisted data changed. Existing release-detail source guards were updated to inspect the shared helper.
  implication: The code path is narrowly scoped and internally consistent, but the environment prevented an independent final file read and executable verification.
- timestamp: 2026-07-19T09:56:00+02:00
  checked: Focused resolver/detail tests, complete repository tests, handler tests, backend build, and `git diff --check` after the local runner recovered.
  found: All commands completed successfully. The focused resolver/detail run passed 7 tests; complete `internal/repository` and `internal/handlers` package runs passed; `go build ./...` and the scoped diff check exited successfully.
  implication: The shared resolver compiles and its fallback, group-local override, visibility precedence, deduplication, role merge, and public detail guards are covered.
- timestamp: 2026-07-19T09:58:00+02:00
  checked: First rebuilt-backend live API run.
  found: Both public endpoints returned HTTP 500 because PostgreSQL evaluates `NULL = release_version_id` as NULL for project defaults and pgx could not scan that into the resolver's boolean `is_override` field.
  implication: The live test found a runtime-only nullability issue not exercised by the pure resolver tests; the SQL projection must coalesce default rows to `false`.
- timestamp: 2026-07-19T10:04:00+02:00
  checked: Regression fix, repeated tests/build/diff check, rebuilt backend, direct public APIs, and in-app browser UAT.
  found: `COALESCE(ac.release_version_id = rc.release_version_id, false)` removes the scan failure. Release list returns `contributors_count: 3`; release detail returns `contributors_count: 3` and CSubs Leader, Sheppert, and honto aki. The project page visibly renders `3 Fansubber`; the expanded release-detail Fansubber section visibly contains all three names and their roles.
  implication: The reported bug is fixed end to end without an API/DTO/schema change or persisted-data mutation.

## Eliminated

- hypothesis: The frontend loses or renames a nonzero API count.
  evidence: Both live endpoints return literal zero; the typed mapping preserves `detail.contributors_count` before list fallback.
  timestamp: 2026-07-18T23:52:00+02:00
- hypothesis: Public visibility gates hide existing release-version rows.
  evidence: There are no `anime_contributions.release_version_id=1` rows at all; all three effective project defaults are explicitly public by flag and null-visibility fallback.
  timestamp: 2026-07-18T23:58:00+02:00

## Resolution

- root_cause: `group_repository_cursor.go` and `release_detail_public_repository_helpers.go` project contributors only from exact `anime_contributions.release_version_id = releaseVersionID` rows. Release version `1` has no overrides; its canonical effective crew is inherited from anime/project defaults for both attached groups. The admin resolver implements that override-or-fallback rule, but the public repositories do not, so three effective members are projected as zero.
- fix: Added a shared public effective-contributor candidate loader/resolver; rewired release detail objects/count and cursor-list counts to the same resolved map; added behavior-focused fallback, group-local override, visibility-precedence, deduplication, and role-merge tests; updated source-level release-detail guards for the effective scope.
- verification: Passed focused resolver/detail tests (7/7), complete repository and handler package tests, `go build ./...`, scoped `git diff --check`, backend image rebuild, direct list/detail API checks (`3`/`3`), and in-app browser UAT on project and release-detail pages with all three contributors visible.
- files_changed: [backend/internal/repository/public_effective_contributors.go, backend/internal/repository/public_effective_contributors_test.go, backend/internal/repository/group_repository_cursor.go, backend/internal/repository/release_detail_public_repository.go, backend/internal/repository/release_detail_public_repository_helpers.go, backend/internal/repository/release_detail_public_repository_test.go]
- remaining_risk: No known remaining risk in the scoped behavior. The public resolver intentionally keeps the established public flag/visibility gates and group-local override precedence.
