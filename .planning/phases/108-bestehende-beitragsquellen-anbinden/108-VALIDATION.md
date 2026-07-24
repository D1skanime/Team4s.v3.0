# Phase 108: Bestehende Beitragsquellen anbinden - Validation

**Prepared:** 2026-07-24  
**Validation mode:** Nyquist enabled  
**Scope:** Phase 108 only  
**Primary gate:** Every source mutation, snapshot transition, award, reversal, and restoration is proven at the owning backend transaction boundary before UI UAT.

## Validation Objective

Phase 108 is valid only when the existing release-crew and anime/fansub-project-note flows produce correct member-owned credits without creating a parallel contribution, identity, review, text, media, or upload domain. Automated tests own all persistence, transaction, idempotency, source-key, and points assertions. Manual UAT is limited to discoverability, complete-set editing, visible state, and protected-session behavior that cannot be established adequately from repository tests.

## Test Infrastructure

| Layer | Framework / seam | Fast command | Full command |
|-------|------------------|--------------|--------------|
| Migration | Go tests with project PostgreSQL test support | `cd backend; go test ./internal/migrations -run Phase108 -count=1` | `cd backend; go test ./internal/migrations -count=1` |
| Repository/service | Go `testing`, testify, pgx test database | `cd backend; go test ./internal/repository ./internal/services -run 'ReleaseCrew|ProjectNoteCredit|Phase108' -count=1` | `cd backend; go test ./internal/repository ./internal/services -count=1` |
| Handler/contract | Go handler tests | `cd backend; go test ./internal/handlers -run 'ReleaseCrew|EffectiveContributions|ProjectNote' -count=1` | `cd backend; go test ./internal/handlers -count=1` |
| Frontend helper/UI | Vitest + Testing Library | `cd frontend; npm test -- ReleaseContributionDrawer api.auth-refresh` | `cd frontend; npm test` |
| Static contract | OpenAPI/YAML inspection plus compile checks | `git diff --check -- shared/contracts/openapi.yaml shared/contracts/admin-content.yaml` | `cd frontend; npm run typecheck` |
| Phase gate | All affected surfaces | See phase gate below | `cd backend; go test ./...; cd ../frontend; npm test; npm run typecheck; npm run lint; npm run build` |

## Planned Test Artifacts

These files are the implementation-ready owners. If implementation chooses materially different filenames, the plan must preserve the same layer and coverage and update this artifact.

| File | Responsibility |
|------|----------------|
| `backend/internal/migrations/phase108_contribution_sources_test.go` | Migration up/down, rule values/categories, snapshot/lifecycle constraints, no data-copy/backfill SQL |
| `backend/internal/repository/release_crew_snapshot_repository_test.go` | Complete stored sets, inherited/independent status, context scoping, source lookup |
| `backend/internal/services/release_crew_service_test.go` | Seeding, sync, manual independence, semantic diff, award/reversal/restoration, retry and rollback |
| `backend/internal/services/project_note_credit_service_test.go` | First-author award, missing member, edit, delete reversal, recreation |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` | Complete-set replace API, validation, response metadata, auth/context failures |
| `backend/internal/handlers/admin_content_anime_project_notes_test.go` | Note mutation remains contract-compatible and delegates transactional credit lifecycle |
| `backend/internal/repository/episode_import_repository_release_helpers_test.go` | New release snapshot is seeded after canonical group linkage |
| `frontend/src/lib/api.phase108.test.ts` | Typed replace request/response and error handling through central client |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` | One complete-set save, status display, no multiple row mutations |
| `frontend/src/lib/api.auth-refresh.test.ts` | Missing/expired access token plus valid refresh session still performs protected save |

## Decision Coverage Matrix

| Decision | Automated proof | Exact assertion | Manual boundary |
|----------|-----------------|-----------------|-----------------|
| D-01 | `release_crew_service_test.go::TestReleaseCrewAwardsWorkNotAssignmentAction` | One award exists for each persisted work unit; no award exists for the administrative action or actor-only source. | None. Ledger truth is automated. |
| D-02 | `TestReleaseCrewAwardsOnePointPerMemberReleaseRole` | Every distinct `(member_id, release_version_id, role_code)` produces exactly one `fansub_work` award of `1`; different roles for one member produce separate units. | Drawer visibly shows multiple roles, but point values are not manually inferred. |
| D-03 | `TestReleaseCrewSupportsSharedRole` | Two members with the same role on one release each receive one independent award. | Confirm both people can remain selected for the same role. |
| D-04 | migration boundary test plus `TestPhase108DoesNotWireReleaseNotesMediaOrMetadata` | Phase-108 rule/source types are absent from release-note/media services and metadata/media handlers; no new award appears after those existing mutations. | Smoke existing release-note/media UI only for unintended regression; do not re-review Phase 107.1 lifecycle. |
| D-05 | `project_note_credit_service_test.go::TestFirstNonEmptyProjectTextAwardsFivePoints` | First trimmed non-empty `body_text` transition creates exactly one `platform_contribution` award of `5`, without review rows. | Save a first project text and verify normal success UI; ledger value is automated. |
| D-06 | `TestReleaseCrewCreditsWorkerNotActor` | Award `member_id` equals the selected worker; `actor_app_user_id` equals the leader/admin and receives no beneficiary award. | None. |
| D-07 | `TestReleaseCrewCreditsAccountlessHistoricalMember` | A `members`/historical group member with no `app_user` can be assigned and receives normal role awards. | Create/select a historical person through the canonical product flow and confirm the person is selectable without login. |
| D-08 | `TestProjectTextCreditsFirstAuthorMemberOnly`, `TestProjectTextWithoutLinkedMemberSkipsCredit` | First writer’s linked member gets the award; later editor gets none; writer without member link saves text but creates no ledger row. | Verify text remains saved for a leader without member link and no misleading “points awarded” UI appears. |
| D-09 | `TestCrewMutationsCreateNoAdminOrReviewCredits` | Create, confirm, replace, remove, and correct create only work-unit awards/reversals; no review/admin rule code is used. | None. |
| D-10 | `release_crew_snapshot_repository_test.go::TestEveryReleaseReadsCompleteStoredSnapshot` | Reader never falls back based on “any release row”; returned rows are the complete stored snapshot, including an explicitly empty independent set. | Open several releases and verify each drawer reflects its own complete saved set. |
| D-11 | `TestReleaseCreationSeedsFullCurrentProjectCrew` and import helper test | After release/version/group creation, all current project members and every role are persisted before commit; editor API reads exactly that set. | Create/import one release through the user-visible canonical flow and open its drawer. |
| D-12 | `TestProjectCrewChangeSyncsInheritedSnapshotsOnly` | Project-team add/change/remove updates all and only `inherited` snapshots; newly created releases use the latest project set. | Change project team and inspect one inherited release plus one newly created release. |
| D-13 | `TestFirstManualReplaceMakesSnapshotPermanentlyIndependent` | First release-level replace atomically sets `independent`; later project changes do not alter it; empty independent remains independent; no reset-to-project operation exists in API/DTO/UI. | Edit one release, then change project team and confirm the edited release stays unchanged and no “Projektbesetzung neu übernehmen” action is visible. |
| D-14 | `TestRelease176GonMiaAntonRoleDiff` | Start Gon/translation, Mia/QC, Anton/edit. Replace Release 176 with Gon/translation+QC and Anton/edit. Exactly Mia/QC is reversed, Gon/QC is awarded, Gon/translation and Anton/edit ledger/source state is untouched. | Reproduce in drawer and verify Anton remains visible; ledger details remain automated. |
| D-15 | `TestReleaseCrewMutationAndLedgerRollbackTogether`, `TestProjectNoteAndLedgerRollbackTogether` | Inject failure after domain write and after first ledger mutation; transaction leaves snapshot/note and ledger exactly at pre-command state. Successful path commits all. | None. |
| D-16 | `TestReleaseCrewRetryIsIdempotent`, handler retry test | Identical sequential and concurrent requests yield the same stored set and one effective award per unit; stable source contains member, real release version, and role. | Double-click/save retry must not show duplicate rows; points are automated. |
| D-17 | `TestRemovedRoleCreatesOneAppendOnlyReversal` | Original award remains unchanged; exactly one negative reversal references it; retry creates no second reversal. | None. |
| D-18 | `TestCrewCorrectionCreditsAndReversesInOneAction` | Removed set is fully reversed and added set fully awarded in the same transaction; unchanged set produces no ledger writes. | Confirm UI success only after full replace response. |
| D-19 | `TestProjectTextDeleteReversesAndRecreateAwardsNewAuthor` | Delete keeps original award, creates one reversal, and soft-deletes text; later non-empty recreation creates one new lifecycle award for the then-first author; retries do not duplicate either lifecycle. | Save, delete, recreate through existing text editor; verify normal content lifecycle and authorship UX only. |
| D-19a | `TestRestoredIdenticalRoleGetsOneRestorationCredit` | Award role, remove/reverse it, re-add identical tuple: exactly one new append-only restoration award makes net effective points `1`; repeated re-add/save creates no more rows or points. Source generation/restoration identity is stable under concurrent retry. | Re-add the removed role once in drawer; no special restoration control is required. |
| D-20 | `phase108_contribution_sources_test.go::TestPhase108MigrationContainsNoBackfillOrCompatibilityCopy` | Migration creates only new canonical schema/rules/constraints; no `INSERT ... SELECT`, existing-row update, reconciliation, compatibility view, or historical award scan. | Reset/reseed disposable environment; no migration-preservation UAT. |
| D-21 | `TestFreshHistoricalMemberFlowAwardsImmediately` | Fresh accountless member entered through canonical flow and assigned to a release is credited at assignment; no import/backfill job is invoked. | Perform fresh historical-member creation and assignment, not legacy-data import. |
| D-22 | migration up/down test | Clean-schema up creates required structures/rules; down reverses schema safely under documented conditions; no old migration is edited. | None. |

## Roadmap Success-Criteria Matrix

| Criterion | Automated evidence | Required result |
|-----------|--------------------|-----------------|
| SC-1: Confirmed release/anime work becomes points; project text and metadata remain separate; Phase 107.1 sources are not rewired | D-01–D-05, D-09, boundary test | Only release role units and the one project-text lifecycle are newly wired. Metadata/admin media are point-free and release notes/media retain their existing adapters. |
| SC-2: Every source defines beneficiary, context, status, dedupe, effective time, reversal, reviewer origin | Source-contract table below plus migration/service tests | No caller-supplied point value/key; every persisted ledger row matches the documented source contract. |
| SC-3: Submitter, worker/author, reviewer stay separate | D-06–D-09 tests | Worker/first-author member is beneficiary; actor is audit only; no reviewer credit is created by Phase 108. |
| SC-4: No text-length/copy/hash prerequisite; dedupe is semantic | `TestProjectTextCreditDoesNotDependOnLengthCopyOrHash`, retry tests | Any server-valid non-empty project text earns once; semantic source identity prevents duplicates. |
| SC-5: Anime media remains admin-only; existing media/text flows reused | phase boundary/source grep test and affected regression suite | No Phase-108 upload/media table/helper/endpoint; canonical note repository remains content owner. |
| SC-6: Focused contract/repository tests; no unintended public/admin projection changes | handler/helper tests plus existing public contribution/project-note tests | Existing response fields remain stable except documented additive snapshot metadata/replace contract; public projections stay green. |

## Source Contract Assertions

The implementation may choose exact names under agent discretion, but tests must freeze these semantic properties.

| Source | Beneficiary | Context | Eligibility/status | Dedupe identity | Effective time | Removal | Reviewer origin |
|--------|-------------|---------|--------------------|-----------------|----------------|---------|-----------------|
| Release role work | Stored `member_id`, never actor | `fansub_group_id`, real `release_version_id`, anime resolved through release | Unit is present in the complete canonical release snapshot | Member + real release version + role + restoration generation where applicable | Transaction time or documented domain effective time, server-owned | One append-only reversal; D-19a restoration is one new append-only award | None; no review credit |
| Anime/fansub project text | First non-empty writer’s linked member; no award without link | `anime_id` + `fansub_group_id` + note lifecycle identity | Trimmed server plaintext is non-empty | Note/context lifecycle generation + beneficiary | First non-empty save time, server-owned | Delete creates one reversal; recreation creates a new lifecycle award | None; no foreign review |

Required tests must assert:

1. The browser cannot submit beneficiary member, point value, rule version, idempotency key, award status, or reviewer.
2. Group/anime/release IDs are joined and validated server-side in the transaction.
3. Unknown member, role, mismatched group, mismatched anime, and unrelated release-version IDs fail without domain or ledger writes.
4. Awards use only `PointService.CreditInTx`; removals use only `PointService.ReverseInTx` or the approved Phase-106 restoration extension.

## Atomicity and Concurrency Fault Matrix

| Fault injection point | Expected snapshot/note | Expected ledger |
|-----------------------|------------------------|-----------------|
| Before domain mutation | Previous state | No new rows |
| After snapshot rows replaced, before first award | Previous state after rollback | No new rows |
| After one of several awards/reversals | Previous state after rollback | No partial rows |
| After note upsert, before project-text award | Previous note state after rollback | No award |
| After note soft-delete, before reversal | Active note after rollback | Award remains effective |
| Commit/lost-response retry | New state exactly once | One semantic result, no duplicate |
| Two identical concurrent replaces | One complete new set | One award/reversal/restoration per semantic unit |
| Concurrent project sync vs first manual edit | Serialized outcome: manual edit wins permanent independence or sync completes before edit; never partial/merged | Ledger matches final serialized snapshot |

Run concurrency-sensitive cases with:

```bash
cd backend
go test ./internal/services -run 'ReleaseCrew.*(Concurrent|Retry|Rollback|Restor)|ProjectNote.*(Concurrent|Retry|Rollback)' -count=20
```

## Regression and Boundary Suite

The phase gate must retain these existing tests because Phase 108 touches their seams:

```bash
cd backend
go test ./internal/services -run 'PointService|ReleaseReview' -count=1
go test ./internal/repository -run 'AnimeContribution|EffectiveContributor|AnimeProjectNote|PointLedger|PointRule' -count=1
go test ./internal/handlers -run 'EffectiveContributions|AnimeProjectNote|Contribution' -count=1
go test ./internal/migrations -run 'Phase106|Phase107|ReleaseReview|Phase108' -count=1

cd ../frontend
npm test -- ReleaseContributionDrawer api.auth-refresh
npm run typecheck
```

Additional static boundary checks:

```bash
git diff --check
git diff --name-only --diff-filter=ACMRT
rg -n "CreditInTx|ReverseInTx|point_ledger_entries" backend/internal
rg -n "release_version_notes|release_version_media|media_assets|media_files|release_media" backend frontend shared
rg -n "backfill|reconcile|compatib|INSERT INTO point_ledger_entries.*SELECT" database/migrations
```

The reviewer must inspect matches, not treat grep exit status alone as proof. New direct ledger writes outside migrations/tests are a blocker. New Phase-108 changes to release-note/media upload ownership are a blocker. Any Phase-108 migration data-copy/backfill is a blocker.

## Frontend Contract and UAT Matrix

| Scenario | Automated UI/helper check | Manual UAT |
|----------|---------------------------|------------|
| Drawer loads stored inherited snapshot | Response maps complete rows and `snapshot_mode`; loading/error scoped to drawer | Open inherited release from `/admin/fansubs/[id]/edit`; all project members/roles visible |
| One manual edit | Exactly one typed replace request; no `Promise.all` row upserts/deletes | Change one role and save; drawer closes only after success |
| Permanent independence | Reload response displays independent state | Change project team afterward; edited release stays unchanged |
| Empty independent snapshot | API accepts complete empty set if product UI permits removal of all rows; mode remains independent | Remove all people, save, reload; no fallback to project team |
| Gon/Mia/Anton 176 | Component preserves Anton while changing Gon/Mia rows | Execute exact scenario and visually confirm complete crew |
| Protected refresh session | Extend `api.auth-refresh.test.ts`: absent/expired access token + valid refresh token retries replace/note call | With an active refresh session and expired access token, open/save protected drawer without logged-out UI |
| Project text | Existing editor/helper remains the mutation surface | First save, delete, and recreate behave normally; no new review/upload UI |
| Accountless member | Unified member options include historical member without app account | Create/select historical person in canonical group flow |
| No reset action | Component test asserts no “Projektbesetzung neu übernehmen” control | Visually verify absent |
| German UI | Tests use exact labels where stable | Confirm correct umlauts in changed copy |

### Manual UAT Boundaries

Manual UAT does **not** certify:

- point values, source keys, ledger cardinality, reversal linkage, or idempotency;
- transaction rollback or concurrency;
- account/member ownership in the database;
- absence of backfill or double wiring.

Those are automated or code-review gates. Manual UAT certifies only route reachability, complete-set presentation, editing affordance, scoped errors/loading, status comprehension, refresh-session continuity, and absence of unintended controls.

## Wave-Aware Verification

### Wave 0 — Test scaffolding and schema contract

- Create Phase-108 migration tests before schema implementation.
- Create service test fixtures for group, anime, episode, release, release version, project crew, members, point rules, and ledger.
- Add the exact Gon/Mia/Anton Release 176 fixture.
- Add fault-injection transaction harnesses and deterministic time.
- Gate: tests compile and fail for missing Phase-108 behavior; existing Phase 106/107/107.1 suites remain green.

### Wave 1 — Snapshot persistence and release seeding

- Prove D-10–D-12 and D-20–D-22.
- Run migration up/down, repository snapshot tests, release import/creation seeding test.
- Gate: every new release has a full stored `inherited` snapshot; no read fallback remains.

### Wave 2 — Replace, independence, and role ledger

- Prove D-01–D-03, D-06–D-18, and D-19a.
- Run service tests with rollback and `-count=20` retry/concurrency sampling.
- Gate: Gon/Mia/Anton passes; restoration returns net effective point to one; independent releases never sync.

### Wave 3 — Project-text lifecycle

- Prove D-04–D-05, D-08–D-09, D-15–D-16, and D-19.
- Run note service/handler tests plus existing public/admin project-note regressions.
- Gate: first save/delete/recreate ledger lifecycle is exact, while missing member still permits content persistence.

### Wave 4 — Contracts and frontend

- Prove typed complete-set replace, additive snapshot metadata, central auth seam, no row-by-row orchestration.
- Run focused frontend tests, typecheck, lint, and auth-refresh regression.
- Gate: protected drawer/text actions work with refresh-only session; no reset-to-project action.

### Wave 5 — Cross-boundary regression and live UAT

- Run all commands in the regression suite and full phase gate.
- Inspect shared contract/backend/frontend DTO alignment.
- Perform only the manual UAT scenarios above from user-visible routes.
- Gate: all six roadmap success criteria have linked evidence and no Phase-107.1/media/admin-credit boundary violation exists.

## Phase Gate Checklist

- [ ] Migration up/down passes and contains no data migration, backfill, reconciliation, compatibility layer, or historical award scan.
- [ ] Full release snapshot is seeded for every canonical new release/group context.
- [ ] Only inherited snapshots sync with project-team changes.
- [ ] First release-level edit makes the snapshot permanently independent, including an empty set.
- [ ] Gon/Mia/Anton Release 176 regression passes exactly.
- [ ] Domain mutation and all awards/reversals/restorations roll back together on injected failure.
- [ ] Sequential and concurrent retries create no duplicate effective credits.
- [ ] D-19a restoration creates exactly one new append-only effective credit.
- [ ] First non-empty project text awards 5 to the first author member; delete reverses; recreate awards the new lifecycle once.
- [ ] A leader without member link can save text but receives no credit.
- [ ] An accountless historical member can receive release-role credits.
- [ ] No assignment/admin/review/metadata/anime-media credit is introduced.
- [ ] Release-version notes and media retain Phase-107.1 ownership and are not double wired.
- [ ] Shared OpenAPI, backend DTOs, frontend types, and central API helper agree.
- [ ] Protected save works with absent/expired access token and valid refresh session.
- [ ] Existing public and admin contribution/note projections remain green.
- [ ] `git diff --check`, backend full tests, frontend tests/typecheck/lint, and build pass or any environment-only failure is documented.

## Evidence Record Template

Executors/verifiers should append results to the phase verification artifact, not this design contract:

| Gate | Command / UAT route | Result | Evidence |
|------|---------------------|--------|----------|
| Migration | `cd backend; go test ./internal/migrations -run Phase108 -count=1` | PASS/FAIL | test names/output |
| Snapshot/service | focused commands above | PASS/FAIL | test names/output |
| Frontend | focused Vitest + typecheck | PASS/FAIL | output |
| Full regression | full phase gate | PASS/FAIL | output |
| Live UAT | `/admin/fansubs/[id]/edit` → release drawer/project text | PASS/FAIL | tested IDs and observations |

