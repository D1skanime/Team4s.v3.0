# Phase 108 Verification

**Automated gate:** 2026-07-24  
**Human UAT:** Browser-only rerun completed 2026-07-26 with open findings — see `108-UAT.md`
**Scope:** Existing release-crew and project-text contribution sources only

## Automated Gate

| Gate | Result | Evidence |
|---|---|---|
| Migration / rollback | PASS | `go test ./internal/migrations -run 'Phase106|Phase107|ReleaseReview|Phase108' -count=1` — package passed. `TestPhase108MigrationUpDown`, rule values, snapshot/lifecycle constraints, and no-backfill test are present. |
| High-repeat transaction behavior | PASS | `go test ./internal/services -run 'ReleaseCrew.*(Concurrent|Retry|Rollback|Restor)|ProjectNote.*(Concurrent|Retry|Rollback)|ContributionConfirm' -count=20` — passed. |
| Focused services | PASS | `go test ./internal/services -run 'PointService|ReleaseReview|ReleaseCrew|ProjectNoteCredit|ContributionConfirm' -count=1` — passed. |
| Focused repositories | PASS | `go test ./internal/repository -run 'AnimeContribution|EffectiveContributor|AnimeProjectNote|PointLedger|PointRule|ReleaseCrew|ConfirmedOnly|ProposalCoexist' -count=1` — passed. |
| Handler / production wiring | PASS | `go test ./internal/handlers ./cmd/server -run 'EffectiveContributions|AnimeProjectNote|Contribution|ReleaseCrew|ConfirmProposal|ConfirmMyAnimeContribution|Phase108RuntimeWiring' -count=1` — both packages passed. |
| Full backend | PASS | `go test ./...` — all backend packages passed. |
| Phase-108 frontend | PASS | `npm test -- ReleaseContributionDrawer api.phase108 api.auth-refresh` — 3 files, 31 tests passed. |
| Full frontend | FAIL (out of Phase-108 scope) | `npm test` — 198 files passed, 1 skipped; 1310 tests passed; 13 failed before the scoped correction. One stale Phase-108 assertion was fixed and its 11-test file passes. The remaining 12 failures are unrelated: ReportModal server-render portals (5), MemberContributionFilters empty copy (1), admin-anime permission-loading render (3), public-page width CSS contract (1), retained profile-background crop fetch (1), Jellyfin cover absolute-URL expectation (1). |
| TypeScript | PASS | `npm run typecheck` — zero errors. |
| Lint | PASS with existing warnings | `npm run lint` — exit 0, 0 errors, 323 existing warnings. |
| Production build | PASS | `npm run build` — compiled, typechecked, generated 23/23 static pages, and emitted the route manifest. |
| Diff | PASS | `git diff --check` — no whitespace errors (line-ending warning only). |

## Roadmap Success Criteria

| Criterion | Result | Evidence |
|---|---|---|
| SC-1 Existing sources use the member beneficiary | PASS | Release-crew service tests cover worker rather than actor, accountless historical members, shared roles, and one unit per `(member, release, role)`. Project-note tests cover first linked author and the missing-member skip. |
| SC-2 Append-only, atomic, retry-safe lifecycle | PASS | High-repeat concurrency/retry/rollback gate passed; source identity includes restoration generation; project-note delete/recreate and D-19a role restoration are covered. |
| SC-3 Server-owned immutable rules | PASS | Migration rule tests and PointService suites passed; browser contracts do not accept points, rule version, source identity, actor, beneficiary, or ledger fields. |
| SC-4 Fansub work and platform contribution remain distinct | PASS | Release crew uses fansub-work rules; first project text uses platform-contribution; review decisions, metadata, notes/media ownership, and admin actions add no Phase-108 points. |
| SC-5 Additive production integration | PASS | `TestPhase108RuntimeWiringUsesOneSharedServiceGraph` and `TestPhase108RuntimeWiringRegistersEveryMutationOwner` passed; one shared service owns generic project writes, complete-set replacement, confirmations, and both release creators. |
| SC-6 Canonical visible workflow | LIVE PARTIAL / LEGACY FIX AUTOMATED | Normal navigation, complete release-crew roundtrip, explicit empty snapshots, project-note lifecycle, member submission, leader decision, queue removal, and history passed through visible browser clicks. The legacy missing-snapshot 500 was fixed with an explicit validated `uninitialized` state and focused tests; its final browser retest and the fresh-version inheritance case were blocked by the local browser/dev environment. Forced refresh-only state was not fabricated; see `108-UAT.md`. |

## Locked Decision Evidence (D-01–D-22 and D-19a)

- Gon/Mia/Anton Release 176 is asserted by the drawer test: `Gon/Übersetzung, Mia/QC, Anton/Edit` becomes `Gon/Übersetzung+QC, Anton/Edit` through one complete-set PUT; Anton remains.
- Complete stored sets, inherited synchronization, permanent independence, and valid empty independent snapshots are covered by snapshot repository, service, handler, and drawer tests.
- Awards are normalized semantic units. Sequential/concurrent retries are idempotent, all injected transaction fault points roll back, reversals are append-only, and restoration uses a new generation while retaining the same semantic work identity.
- Accountless historical members are valid beneficiaries. A missing author-member link saves the text without a ledger award. The unlinked first non-empty author permanently consumes generation 1 (`skipped_no_member`); later linkage cannot retroactively award it, while deletion/recreation evaluates generation 2.
- Leader and eligible member confirmations are group-scoped, permission-first, status-bounded, confirmed-only, and atomic. Wrong-group and invalid-status attempts cannot mutate snapshots or points.
- Confirmed rows alone form effective truth; proposals coexist without replacement. Project mutations synchronize inherited release snapshots only when confirmed truth exists before or after the command.
- Generic POST/PATCH/DELETE reject release-specific rows and review-status promotion. Complete-set Replace is the sole release-crew writer.
- Import and manual release creation invoke the shared seeder only after canonical `release_version_groups` ownership exists and inside the caller transaction.
- Refresh-only protected crew replacement, note save, leader confirmation, and member confirmation all pass through `apiClientFetch`; the focused auth suite proves absent access token plus valid refresh token without logged-out UI state.
- No points are awarded for the actor/admin action, review metadata, release notes, release-version media, media assets/files, or release media.

## Guard and Ownership Scans

### Ledger boundary

`rg -n "CreditInTx|ReverseInTx|point_ledger_entries" backend/internal` was inspected manually.

- Runtime Phase-108 calls occur in `release_crew_service.go` and `project_note_credit_service.go`, both through the injected PointService interface.
- Direct `INSERT INTO point_ledger_entries` exists only in the canonical `point_ledger_repository.go` and migration/test fixtures.
- Handler boundary tests explicitly forbid handler-owned `CreditInTx`, `ReverseInTx`, and ledger SQL.
- Existing Phase-107.1 review services remain separate; Phase 108 does not double-wire review awards.

### Media/domain ownership

`rg -n "release_version_notes|release_version_media|media_assets|media_files|release_media" backend frontend shared` was inspected manually. Matches are existing media/note contracts, handlers, repositories, tests, and UI. Phase-108 implementation and this verification change do not alter release-note, release-version-media, media-asset/file, or release-level-media ownership.

### Disposable-data / no-backfill boundary

`rg -n "backfill|reconcile|compatib|INSERT INTO point_ledger_entries.*SELECT" database/migrations/0137_phase108_contribution_sources.{up,down}.sql` returned no matches. `TestPhase108MigrationContainsNoBackfillOrCompatibilityCopy` passed. The migration changes schema/rules only and carries forward no content rows.

### Legacy column and browser auth

- The Phase-108 migration contains no `fansubgroup_id`; canonical runtime code uses `fansub_group_id`. Historical migration/test references only document removal.
- The drawer contains no bearer/token/cookie/storage handling. Protected Phase-108 helpers use the existing central client; auth-refresh tests own the refresh behavior.

## Scoped Deviation

The full frontend run found a Phase-108-adjacent regression assertion in `ContributionsReviewSection.test.tsx`: it still expected `confirmProposal(88, 1, undefined)` after Plan 108-05 removed page-owned token parameters. The expectation was corrected to `confirmProposal(88, 1)` and `npm test -- ContributionsReviewSection` now passes 11/11.

The other 12 full-suite failures are outside Phase 108 and were not modified.

## Human Verification — Completed

Manual UAT must record only route/action observations. It must not claim to prove ledger values, beneficiary identity, cardinality, rollback, or concurrency.

Use the normal app navigation to open `/admin/fansubs/[id]/edit`, then verify:

1. An inherited release drawer shows the complete current project crew and inherited state.
2. Release 176 saves the Gon/Mia/Anton correction above once and closes only after success.
3. A later project-team change leaves Release 176 independent, updates an unedited release, and does not make an explicitly emptied independent release fall back.
4. There is no “Projektbesetzung neu übernehmen” action; changed German copy uses correct umlauts.
5. First project text save, delete, and recreation work. A leader without a member link can save text without misleading points-awarded copy.
6. With an absent/expired access token and valid refresh session, protected drawer/note save completes without logged-out UI.
7. Under the same refresh-only condition, one leader confirmation and one eligible member self-confirmation complete without logged-out UI.

**Human result:** PARTIAL WITH RETEST BLOCKED — the core contribution and review workflow passed in a complete browser-only rerun after two UI defects were fixed. The legacy release without a Phase-108 snapshot now has a contract-backed `uninitialized` fix with focused automated coverage, but its final browser retest and the fresh-version inheritance case were blocked by the local browser/dev environment. Refresh-only state was not fabricated.
