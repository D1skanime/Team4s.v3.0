---
phase: quick-260903-czh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/anime_contributions_proposal_member_repository.go
  - backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go
autonomous: true
requirements: [QUICK-260903-CZH-01]

must_haves:
  truths:
    - "has_own_release_work is false when the only own release-scoped work (note or media) is rejected"
    - "has_own_release_work is true when own release-scoped work is pending or confirmed"
    - "app_user 4 / release_version 48, whose only own media (id 11) is rejected, now measures has_own_release_work = false against the live redeployed backend"
    - "release_version_media id 11 and its lifecycle row are never written to, only read, at any point during this plan"
  artifacts:
    - path: backend/internal/repository/anime_contributions_proposal_member_repository.go
      provides: "has_own_release_work CASE expression with LEFT JOIN lifecycle + rejected-state exclusion on both EXISTS subqueries"
    - path: backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go
      provides: "PostgreSQL-backed regression test proving rejected-only note/media do not count as has_own_release_work, pending/confirmed do"
  key_links:
    - from: "backend/internal/repository/anime_contributions_proposal_member_repository.go"
      to: "release_version_note_review_lifecycle / release_version_media_review_lifecycle"
      via: "LEFT JOIN ... ON lifecycle.release_version_note_id = n.id / lifecycle.release_version_media_id = m.id"
      pattern: "lifecycle\\.review_state IS NULL OR lifecycle\\.review_state <> 'rejected'"
---

<objective>
Fix `has_own_release_work` in `ListByMemberIDWithProposalFields` (backend/internal/repository/anime_contributions_proposal_member_repository.go) so a REJECTED note or REJECTED media row no longer counts as "own work done" — mirroring the already-correct `has_own_notes`/`has_own_media` lifecycle filter that exists in the sibling query `listMemberProjectReleaseVersions` (backend/internal/repository/anime_contributions_member_project_repository.go, lines ~141-160).

Purpose: The dashboard's "Achtung" (attention) section (`filterAttentionContributions` in frontend/src/app/me/dashboard/components/attentionHelpers.ts) filters out any contribution where `has_own_release_work` is true. Because the current query only checks row EXISTENCE with no lifecycle filter, a rejected note/media incorrectly counts as completed work and hides the episode from the admin exactly when they most need to see it (rejected -> needs revision). Live-reproduced: app_user 4 (type@team4s.de), release_version_id 48 (episode 12), `release_version_media` id 11 is `review_state='rejected'` -- episode currently does not appear in the dashboard.

Output: Corrected SQL in the repository, a passing regression test that fails without the fix, a confirmation that frontend dashboard tests need no change, and a measured live-DB proof for app_user 4 / release_version 48 after redeploy.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- The buggy query (current state) -- backend/internal/repository/anime_contributions_proposal_member_repository.go, lines ~61-73 -->
```sql
CASE WHEN ac.release_version_id IS NULL THEN false ELSE (
    EXISTS (
        SELECT 1 FROM release_version_notes n
        WHERE n.release_version_id = ac.release_version_id
          AND n.member_id = $1
          AND n.deleted_at IS NULL
    ) OR EXISTS (
        SELECT 1 FROM release_version_media m
        WHERE m.release_version_id = ac.release_version_id
          AND m.uploaded_by_user_id = $2
          AND m.deleted_at IS NULL
    )
) END AS has_own_release_work,
```

<!-- The ALREADY-CORRECT reference pattern -- backend/internal/repository/anime_contributions_member_project_repository.go, lines ~141-160 -->
```sql
EXISTS (
    SELECT 1
    FROM release_version_notes rvn
    LEFT JOIN release_version_note_review_lifecycle lifecycle
      ON lifecycle.release_version_note_id = rvn.id
    WHERE rvn.release_version_id = rv.id
      AND rvn.member_id = $1
      AND rvn.deleted_at IS NULL
      AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
) AS has_own_notes,
EXISTS (
    SELECT 1
    FROM release_version_media rvm
    LEFT JOIN release_version_media_review_lifecycle lifecycle
      ON lifecycle.release_version_media_id = rvm.id
    WHERE rvm.release_version_id = rv.id
      AND rvm.uploaded_by_user_id = $2
      AND rvm.deleted_at IS NULL
      AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
) AS has_own_media,
```

<!-- Existing test-infra precedent for the fixture this plan reuses (same package, no import needed): -->
<!-- backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go -->
<!-- - openMemberProjectHasOwnNotesFixture(t) *pgxpool.Pool -- opens testsupport.OpenPhase107Postgres(t) then applies -->
<!--   a hand-assembled minimal schema (anime, episodes, fansub_releases, release_version_groups, -->
<!--   hist_fansub_group_members, anime_contributions, anime_contribution_roles, contributor_roles, -->
<!--   release_version_notes, media_types/media_assets/media_files/anime_media, release_version_media) -->
<!--   plus the real migration 0135_release_review_lifecycle.up.sql (creates both review_lifecycle tables). -->
<!--   member_claims already exists via testsupport.OpenPhase107Postgres's own prerequisites (needed for -->
<!--   ListByMemberIDWithProposalFields's worked_release_version_count subquery). -->
<!-- - Seed helpers already defined in that file / the sibling has_own_media test file, same package, reusable -->
<!--   as-is: seedPhase143Member, seedPhase143AppUser, seedPhase143Anime, seedPhase143FansubGroup, -->
<!--   seedPhase143Episode, seedPhase143ReleaseVersion, seedPhase143ContributorRole, -->
<!--   seedPhase143ReleaseVersionNote, seedPhase143NoteReviewLifecycle, seedPhase143ReleaseVersionMedia, -->
<!--   seedPhase143MediaReviewLifecycle. -->
<!-- - seedPhase143ConfirmedProjectContribution seeds a PROJECT-WIDE contribution (release_version_id NULL) -- -->
<!--   NOT usable as-is for this plan's query, which needs a RELEASE-SCOPED anime_contributions row -->
<!--   (release_version_id NOT NULL). Write a new local seed helper for that shape (see Task 1). -->
<!-- - testsupport.OpenPhase107Postgres's DSN env var is TEAM4S_PHASE107_TEST_DSN (backend/internal/testsupport/phase107_postgres.go) -- SKIP-not-FAIL convention: -->
<!--   the test skips cleanly if that env var is unset, so this MUST be exported inside the container that runs `go test`. -->

<!-- Frontend consumer (read-only reference, DO NOT modify) -- frontend/src/app/me/dashboard/components/attentionHelpers.ts -->
```typescript
export function filterAttentionContributions(
  contributions: MeAnimeContribution[],
): MeAnimeContribution[] {
  // ...
  return contributions.filter((contribution) => {
    if (contribution.release_version_id === null) return true;
    if (contribution.has_own_release_work) return false;
    // ...
  });
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write a failing PostgreSQL regression test, then fix the has_own_release_work SQL</name>
  <files>backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go, backend/internal/repository/anime_contributions_proposal_member_repository.go</files>
  <behavior>
    Using the reused `openMemberProjectHasOwnNotesFixture` fixture (same package `repository`, no import
    needed -- see interfaces block) plus one new local seed helper for a release-scoped
    `anime_contributions` row (`release_version_id` NOT NULL, `status='confirmed'`, one role code):
    - Test 1: only own release-version note exists and its lifecycle `review_state='rejected'`
      -> `HasOwnReleaseWork` must be `false`.
    - Test 2: only own release-version note exists, `review_state='pending'` (or no lifecycle row at all)
      -> `HasOwnReleaseWork` must be `true`.
    - Test 3: only own release-version media exists (via `seedPhase143ReleaseVersionMedia` +
      `seedPhase143MediaReviewLifecycle`) and its lifecycle `review_state='rejected'`
      -> `HasOwnReleaseWork` must be `false`.
    - Test 4: only own release-version media exists, `review_state='confirmed'`
      -> `HasOwnReleaseWork` must be `true`.
    Call `repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)` and assert on the returned
    row's `HasOwnReleaseWork` field for the seeded contribution ID.
  </behavior>
  <action>
    RED: Write the test file first with all four cases above. Run it against the current (buggy)
    query and confirm Test 1 and Test 3 (the rejected-only cases) FAIL -- this proves the bug is real
    and the test actually exercises it, not just source-inspection.

    GREEN: In `anime_contributions_proposal_member_repository.go`, apply the exact fix mirrored from
    `anime_contributions_member_project_repository.go` lines ~141-160 (see interfaces block): add
    `LEFT JOIN release_version_note_review_lifecycle lifecycle ON lifecycle.release_version_note_id = n.id`
    to the note EXISTS subquery and `LEFT JOIN release_version_media_review_lifecycle lifecycle ON
    lifecycle.release_version_media_id = m.id` to the media EXISTS subquery, each gaining
    `AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')`. Do not change any
    other clause, alias, or the surrounding CASE/query shape. This is a consistency fix only --
    identical semantics to the already-correct sibling query, not new business logic.

    Run the full test suite for this file (existing source-inspection tests plus the 4 new cases) and
    confirm all pass.

    Test execution: run inside a `golang:1.25-alpine` container with the repo root mounted at `/src`
    and working dir `/src/backend`, attached to the `team4s_default` Docker network, with
    `TEAM4S_PHASE107_TEST_DSN` exported pointing at the running `team4sv30-db` Postgres service. Do not
    set `DATABASE_URL` or `TEST_DATABASE_URL`; those are not consulted by this fixture.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s:/src -w /src/backend --network team4s_default -e TEAM4S_PHASE107_TEST_DSN golang:1.25-alpine go test ./internal/repository/... -run 'HasOwnReleaseWork' -v</automated>
  </verify>
  <done>New test file exists with 4 real-Postgres cases (rejected note, pending/no-lifecycle note, rejected media, confirmed media); all 4 plus the file's pre-existing source-inspection tests pass; the fix in anime_contributions_proposal_member_repository.go is the minimal LEFT JOIN + review_state filter mirrored from the sibling query, with no other query changes.</done>
</task>

<task type="auto">
  <name>Task 2: Confirm frontend dashboard tests need no change</name>
  <files>frontend/src/app/me/dashboard/components/AttentionSection.test.tsx, frontend/src/app/me/dashboard/components/attentionHelpers.test.ts</files>
  <action>
    Do NOT modify frontend/src/app/me/dashboard/components/attentionHelpers.ts -- its filter logic is
    already correct once the backend flag is correct (`if (contribution.has_own_release_work) return
    false;`). Review the two dashboard test files for assumptions that assume the OLD (existence-only)
    backend semantics for `has_own_release_work`. Both files mock `has_own_release_work` directly as a
    boolean prop on `MeAnimeContribution` fixtures (e.g. `AttentionSection.test.tsx`'s "blendet eine
    releasebezogene Zuweisung nach eigener Arbeit aus" case sets `has_own_release_work: true` directly)
    -- they test the frontend filter's reaction to the flag's value, not how the backend computes it, so
    they are expected to remain valid unchanged. Run both test files to confirm. If (and only if) you
    find a test that encodes the old existence-only assumption (e.g. asserting a contribution is
    filtered out purely because a rejected-media row exists, without going through the
    `has_own_release_work` boolean), update that specific test's expectation -- do not touch
    attentionHelpers.ts itself.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend && npx vitest run src/app/me/dashboard/components/AttentionSection.test.tsx src/app/me/dashboard/components/attentionHelpers.test.ts</automated>
  </verify>
  <done>Both dashboard test files pass; report explicitly whether any test needed updating and why (expected answer: no, since both files mock the boolean flag directly and are decoupled from backend query semantics).</done>
</task>

<task type="auto">
  <name>Task 3: Redeploy backend and measure the live fix for app_user 4 / release_version 48</name>
  <files>backend/internal/repository/anime_contributions_proposal_member_repository.go</files>
  <action>
    CRITICAL CONSTRAINT: `release_version_media` id 11 and its `release_version_media_review_lifecycle`
    row (revision 4, `review_state='rejected'`) are being actively reviewed live in the browser by the
    user right now. Every database interaction in this task MUST be a read-only `SELECT`. Never run
    `UPDATE`/`DELETE`/`INSERT` against `release_version_media` id 11, its lifecycle row, or any row tied
    to release_version_id 48 for app_user 4. Read-only SELECT queries only, ever.

    Rebuild and restart only the backend service: `docker compose up -d --build team4sv30-backend`.
    Wait for the container to report healthy/ready.

    Measure the actual result with a direct read-only SQL query against `team4sv30-db` (e.g. via
    `docker exec team4sv30-db psql -U <user> -d <db> -c "SELECT ..."`, reproducing exactly the
    corrected `has_own_release_work` CASE expression's logic for app_user_id=4 / release_version_id=48
    inline as a plain SELECT, or by calling the real backend endpoint that surfaces
    `ListByMemberIDWithProposalFields` for member 4 and reading the `has_own_release_work` field for the
    contribution tied to release_version_id 48). First confirm via a plain read-only SELECT that
    `release_version_media` id 11 still exists and is untouched (`review_state='rejected'`,
    `source_revision=4`). Then confirm the corrected `has_own_release_work` result for app_user 4 /
    release_version 48 evaluates to `false` despite that row's existence, and paste the actual measured
    query output (not a restatement of "should be fixed") into the final report.
  </action>
  <verify>
    <automated>docker exec team4sv30-db psql -U "$(grep -m1 '^POSTGRES_USER=' /home/d1sk/team4s/.env | cut -d= -f2)" -d "$(grep -m1 '^POSTGRES_DB=' /home/d1sk/team4s/.env | cut -d= -f2)" -c "SELECT id, review_state, source_revision FROM release_version_media_review_lifecycle WHERE release_version_media_id = 11;"</automated>
  </verify>
  <done>Backend container rebuilt and running; a measured, pasted read-only SQL/API result proves has_own_release_work=false for app_user 4 / release_version 48 while release_version_media id 11's lifecycle row is confirmed unchanged (review_state='rejected', source_revision=4); no write ever issued against id 11 or its lifecycle row.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| DB read during live verification | Task 3 reads production-shaped dev data while a real user is mid-review of the exact row being queried; any write would corrupt live UAT state |
| Backend query -> member dashboard | `has_own_release_work` is a trust signal consumed client-side to hide/show admin attention items; an incorrect false negative here (row counted as done when rejected) suppresses required admin action |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICK260903-01 | Repudiation | `has_own_release_work` CASE expression | mitigate | Lifecycle-state-aware EXISTS subqueries (this plan's fix) ensure the flag honestly reflects current review outcome instead of stale row-existence, matching the already-audited sibling query |
| T-QUICK260903-02 | Tampering | Task 3 live-DB verification queries | mitigate | Task explicitly scoped to read-only `SELECT` only; `UPDATE`/`DELETE`/`INSERT` against `release_version_media` id 11 or its lifecycle row is forbidden in the task action and reinforced in `<done>` |
| T-QUICK260903-03 | Information Disclosure | Direct `docker exec psql` access to `team4sv30-db` | accept | Localhost/SSH-tunnel-only dev environment per CLAUDE.md; no new exposure introduced |

No package-manager installs are part of this plan; the Package Legitimacy Gate does not apply.
</threat_model>

<verification>
1. `docker run --rm -v /home/d1sk/team4s:/src -w /src/backend --network team4s_default -e TEAM4S_PHASE107_TEST_DSN golang:1.25-alpine go test ./internal/repository/... -run 'HasOwnReleaseWork' -v` -- all new and existing tests in this file pass.
2. `cd /home/d1sk/team4s/frontend && npx vitest run src/app/me/dashboard/components/AttentionSection.test.tsx src/app/me/dashboard/components/attentionHelpers.test.ts` -- both pass unchanged (or with the specific stale-assumption fix documented).
3. Live measured proof (Task 3): `has_own_release_work=false` for app_user 4 / release_version 48 against the rebuilt `team4sv30-backend`, with `release_version_media` id 11 confirmed unmodified.
</verification>

<success_criteria>
- [ ] `has_own_release_work`'s note and media EXISTS subqueries both exclude `review_state='rejected'` rows, mirroring `anime_contributions_member_project_repository.go`'s `has_own_notes`/`has_own_media` pattern exactly
- [ ] A real-Postgres regression test proves both the note and media rejected-only cases (previously false negatives for "needs attention") and the pending/confirmed cases
- [ ] Frontend dashboard tests reviewed; either confirmed unaffected or updated with a documented reason
- [ ] Live measured proof recorded for app_user 4 / release_version 48 against the redeployed backend
- [ ] `release_version_media` id 11 and its lifecycle row remain completely untouched (verified via a read-only SELECT before and after)
</success_criteria>

<output>
Create `.planning/quick/260903-czh-has-own-release-work-abgelehnte-arbeit-d/260903-czh-SUMMARY.md` when done
</output>
