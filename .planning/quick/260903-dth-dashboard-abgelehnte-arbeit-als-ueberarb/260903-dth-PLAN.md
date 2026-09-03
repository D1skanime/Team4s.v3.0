---
phase: quick-260903-dth
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/anime_contributions_proposal_member_repository.go
  - backend/internal/repository/anime_contributions_proposal_member_repository_has_own_rejected_test.go
  - frontend/src/types/contributions.ts
  - frontend/src/app/me/dashboard/components/attentionHelpers.ts
  - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
autonomous: true
requirements: [QUICK-260903-DTH-01]

must_haves:
  truths:
    - "A release version where the member has BOTH a confirmed note AND a rejected media upload (or vice versa) still appears in the dashboard's 'Achtung' section, instead of vanishing because has_own_release_work is true"
    - "The visible attention item for such a contribution is labeled 'Überarbeitung nötig' (real umlaut), distinct from a plain new-assignment item"
    - "Clicking the 'Überarbeitung nötig' item navigates into the release workspace (resolveWorkspaceHref), where the rejected note/media can be edited"
    - "has_own_rejected_notes/has_own_rejected_media are computed server-side per release-scoped contribution row, mirroring the already-shipped pattern in anime_contributions_member_project_repository.go"
    - "Live-measured after redeploy: app_user 4 / member 5 / release_version 48 has has_own_rejected_media=true and has_own_release_work=true simultaneously (both reported, not just asserted)"
    - "release_version_media id 11 and its review_lifecycle row are read-only throughout this plan -- never UPDATE/DELETE/INSERT"
  artifacts:
    - path: backend/internal/repository/anime_contributions_proposal_member_repository.go
      provides: "has_own_rejected_notes / has_own_rejected_media EXISTS columns on ListByMemberIDWithProposalFields, scoped to ac.release_version_id IS NOT NULL"
    - path: backend/internal/repository/anime_contributions_proposal_member_repository_has_own_rejected_test.go
      provides: "PostgreSQL-backed regression tests proving both new flags are true only for rejected own work, false for confirmed/pending/absent"
    - path: frontend/src/types/contributions.ts
      provides: "has_own_rejected_notes?/has_own_rejected_media? on MeAnimeContribution"
    - path: frontend/src/app/me/dashboard/components/attentionHelpers.ts
      provides: "filterAttentionContributions keeps rejected-own-work contributions; groupAttentionContributions exposes hasOwnRejectedWork per group"
    - path: frontend/src/app/me/dashboard/components/AttentionSection.tsx
      provides: "'Überarbeitung nötig' Badge rendered for groups with hasOwnRejectedWork, using only @/components/ui primitives"
  key_links:
    - from: "backend/internal/repository/anime_contributions_proposal_member_repository.go"
      to: "release_version_note_review_lifecycle / release_version_media_review_lifecycle"
      via: "JOIN ... ON lifecycle.release_version_note_id = n.id / lifecycle.release_version_media_id = m.id AND lifecycle.review_state = 'rejected'"
      pattern: "lifecycle\\.review_state = 'rejected'"
    - from: "frontend/src/app/me/dashboard/components/attentionHelpers.ts"
      to: "frontend/src/app/me/dashboard/components/AttentionSection.tsx"
      via: "AttentionProjectGroup.hasOwnRejectedWork prop consumed to pick the Badge variant/label"
      pattern: "hasOwnRejectedWork"
---

<objective>
Make a rejected own contribution (note or media) on a release version visible in the dashboard's "Achtung" (attention) section as "Überarbeitung nötig", even when OTHER own work on the same release version is confirmed (so `has_own_release_work` stays `true` and the item would otherwise vanish entirely).

Purpose: A previous fix (commit 07a8c88d, quick task 260903-czh) excludes rejected own work from `has_own_release_work`, but only helps when rejected work is the ONLY own work on a release version. Live-evidenced case: type@team4s.de (app_user 4, member 5) on release_version 48 has note 23 (confirmed) AND media 11 (rejected) -- `has_own_release_work` stays `true` (correctly, a confirmed note is completed work), so the episode disappears from "Achtung" with zero signal that something still needs fixing. The dashboard payload currently carries no rejection signal at all for `MeAnimeContribution`.

Output: Two new backend-computed boolean columns (`has_own_rejected_notes`, `has_own_rejected_media`) threaded through the Go struct, TS type, and (if a matching schema exists) the OpenAPI contract; a frontend filter that keeps rejected-own-work contributions visible instead of hiding them; an "Überarbeitung nötig" badge in `AttentionSection.tsx` linking into the editable release workspace; and a live-measured proof against the redeployed backend for app_user 4 / member 5 / release_version 48.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
<!-- CURRENT STATE -- backend/internal/repository/anime_contributions_proposal_member_repository.go, lines 61-79 -->
<!-- (has_own_release_work; already excludes rejected rows per quick task 260903-czh, commit 07a8c88d) -->
```sql
CASE WHEN ac.release_version_id IS NULL THEN false ELSE (
    EXISTS (
        SELECT 1 FROM release_version_notes n
        LEFT JOIN release_version_note_review_lifecycle lifecycle
          ON lifecycle.release_version_note_id = n.id
        WHERE n.release_version_id = ac.release_version_id
          AND n.member_id = $1
          AND n.deleted_at IS NULL
          AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
    ) OR EXISTS (
        SELECT 1 FROM release_version_media m
        LEFT JOIN release_version_media_review_lifecycle lifecycle
          ON lifecycle.release_version_media_id = m.id
        WHERE m.release_version_id = ac.release_version_id
          AND m.uploaded_by_user_id = $2
          AND m.deleted_at IS NULL
          AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
    )
) END AS has_own_release_work,
```

<!-- ADD immediately after the has_own_release_work CASE above -- copy-source pattern is the -->
<!-- ALREADY-SHIPPED has_own_rejected_notes/has_own_rejected_media in the sibling query -->
<!-- backend/internal/repository/anime_contributions_member_project_repository.go, lines 161-180 -->
<!-- (listMemberProjectReleaseVersions). Copy that EXISTS pattern verbatim, adapted to this query's -->
<!-- ac.release_version_id scoping (this query has one row per contribution, not one row per release -->
<!-- version, so each new column needs its own `CASE WHEN ac.release_version_id IS NULL THEN false ELSE (...) END` -->
<!-- wrapper exactly like has_own_release_work above -- the sibling query doesn't need this wrapper -->
<!-- because it is already scoped to one release_version row via its outer FROM release_versions rv). -->
```sql
-- reference EXISTS pattern from anime_contributions_member_project_repository.go:161-180:
EXISTS (
    SELECT 1
    FROM release_version_notes rvn
    JOIN release_version_note_review_lifecycle lifecycle
      ON lifecycle.release_version_note_id = rvn.id
    WHERE rvn.release_version_id = rv.id
      AND rvn.member_id = $1
      AND rvn.deleted_at IS NULL
      AND lifecycle.review_state = 'rejected'
) AS has_own_rejected_notes,
EXISTS (
    SELECT 1
    FROM release_version_media rvm
    JOIN release_version_media_review_lifecycle lifecycle
      ON lifecycle.release_version_media_id = rvm.id
    WHERE rvm.release_version_id = rv.id
      AND rvm.uploaded_by_user_id = $2
      AND rvm.deleted_at IS NULL
      AND lifecycle.review_state = 'rejected'
) AS has_own_rejected_media,
```

<!-- Go struct (add HasOwnRejectedNotes/HasOwnRejectedMedia right after HasOwnReleaseWork, -->
<!-- both in the struct field list AND in the rows.Scan(...) call, in the same relative position -->
<!-- as the SQL SELECT column order): -->
```go
type MemberContributionWithProposalRow struct {
	AnimeContributionRow
	AnimeTitle                string  `json:"anime_title"`
	CanSelfPublish            bool    `json:"can_self_publish"`
	ReviewNote                *string `json:"review_note"`
	FansubGroupName           string  `json:"fansub_group_name"`
	IsOwnProposal             bool    `json:"is_own_proposal"`
	EpisodeNumber             *string `json:"episode_number"`
	EpisodeSortIndex          *int    `json:"episode_sort_index"`
	TotalReleaseVersionCount  int32   `json:"total_release_version_count"`
	WorkedReleaseVersionCount int32   `json:"worked_release_version_count"`
	HasOwnReleaseWork         bool    `json:"has_own_release_work"`
	// ADD:
	// HasOwnRejectedNotes bool `json:"has_own_rejected_notes"`
	// HasOwnRejectedMedia bool `json:"has_own_rejected_media"`
}
```

<!-- Existing test-infra precedent (same package `repository`, no import needed) -- REUSE VERBATIM: -->
<!-- backend/internal/repository/anime_contributions_proposal_member_repository_has_own_release_work_test.go -->
<!-- - openHasOwnReleaseWorkFixture(t) *pgxpool.Pool -- widens openMemberProjectHasOwnNotesFixture(t) with -->
<!--   the extra animeContributionSelectCols columns this query needs. -->
<!-- - seedPhase143ReleaseScopedContribution(t, pool, id, animeID, groupID, memberID, releaseVersionID) -- -->
<!--   seeds a confirmed, release-scoped anime_contributions row + one role. -->
<!-- - Seed helpers from the sibling has_own_notes/has_own_media test files, same package: -->
<!--   seedPhase143Member, seedPhase143AppUser, seedPhase143Anime, seedPhase143FansubGroup, -->
<!--   seedPhase143Episode, seedPhase143ReleaseVersion, seedPhase143ContributorRole, -->
<!--   seedPhase143ReleaseVersionNote, seedPhase143NoteReviewLifecycle, seedPhase143ReleaseVersionMedia, -->
<!--   seedPhase143MediaReviewLifecycle. -->
<!-- - testsupport.OpenPhase107Postgres's DSN env var is TEAM4S_PHASE107_TEST_DSN -->
<!--   (backend/internal/testsupport/phase107_postgres.go) -- SKIP-not-FAIL if unset; MUST be exported -->
<!--   inside the container running `go test`. Never set DATABASE_URL/TEST_DATABASE_URL. -->

<!-- Frontend types -- frontend/src/types/contributions.ts, MeAnimeContribution interface (line ~109): -->
```typescript
/** True after this user created a non-deleted text or image in this release version. */
has_own_release_work?: boolean;
// ADD immediately after:
// has_own_rejected_notes?: boolean;
// has_own_rejected_media?: boolean;
```

<!-- Frontend filter -- frontend/src/app/me/dashboard/components/attentionHelpers.ts, filterAttentionContributions -->
<!-- (lines 54-82). CURRENT: any contribution with has_own_release_work=true is unconditionally dropped. -->
<!-- CHANGE: only drop it if it has NO rejected own work; keep it if has_own_rejected_notes OR -->
<!-- has_own_rejected_media is true. Do not touch the release_version_id===null branch or the -->
<!-- projectRoleSignatures inherited-role exclusion -- those stay exactly as-is. -->
```typescript
return contributions.filter((contribution) => {
    if (contribution.release_version_id === null) {
      return true;
    }

    if (contribution.has_own_release_work) {
      // ADD: keep it anyway if there is rejected own work needing revision
      // if (contribution.has_own_rejected_notes || contribution.has_own_rejected_media) {
      //   return true;
      // }
      return false;
    }

    return (
      projectRoleSignatures.get(contributionScopeKey(contribution)) !==
      roleSignature(contribution)
    );
  });
```

<!-- AttentionProjectGroup (attentionHelpers.ts lines 114-160) -- ADD a hasOwnRejectedWork field next to -->
<!-- hasRecentAssignment, computed the same way (ordered.some(...)), so AttentionSection.tsx can pick the -->
<!-- badge/label without re-deriving rejection logic itself: -->
```typescript
export interface AttentionProjectGroup {
  key: string;
  animeTitle: string;
  fansubGroupName: string | null;
  contributions: MeAnimeContribution[];
  href: string;
  hasRecentAssignment: boolean;
  // ADD: hasOwnRejectedWork: boolean;
}
// in groupAttentionContributions's .map(...):
// hasOwnRejectedWork: ordered.some((item) => item.has_own_rejected_notes || item.has_own_rejected_media),
```

<!-- AttentionSection.tsx contributionProjects.map render block (lines 192-214) -- badge precedence: -->
<!-- rejected work is more urgent than "new", so it takes priority over the existing Badge variant="info" -->
<!-- "Neu" when both would apply. Reuse the exact Badge/Card/Link primitives already used elsewhere in this -->
<!-- file (e.g. the existing `<Badge variant="danger">Abgelehnt</Badge>` for pendingOwnNoteRevisions, line 154) -->
<!-- -- do not hand-roll new markup. -->
```typescript
{project.hasOwnRejectedWork ? (
  <Badge variant="danger">Überarbeitung nötig</Badge>
) : project.hasRecentAssignment ? (
  <Badge variant="info">Neu</Badge>
) : null}
```

<!-- Backend handler that serializes this row directly (NO change needed -- json tags flow through as-is): -->
<!-- backend/internal/handlers/contributions_me_handler.go:116-122, ListMyAnimeContributions -->
<!-- c.JSON(http.StatusOK, gin.H{"data": items}) where items = []MemberContributionWithProposalRow -->

<!-- shared/contracts/openapi.yaml: CONFIRMED (via grep) there is currently NO schema for -->
<!-- MeAnimeContribution / MemberContributionWithProposalRow and NO documented path for -->
<!-- GET /api/v1/me/anime-contributions at all -- has_own_release_work, worked_release_version_count, -->
<!-- is_own_proposal etc. (all pre-existing fields on this exact struct) are likewise undocumented there. -->
<!-- Quick task 260903-czh, which touched the same struct, made zero openapi.yaml changes for this reason. -->
<!-- Task 1 below re-confirms this at execution time; if still absent, skip the edit and state so explicitly -->
<!-- in the summary -- do not invent a new schema section for an undocumented endpoint (out of scope). -->
<!-- The sibling MeProjectReleaseVersion schema (shared/contracts/openapi.yaml:12189-12224) DOES already -->
<!-- document has_own_rejected_notes/has_own_rejected_media for the OTHER (member-project) endpoint -- -->
<!-- that is unrelated and must not be touched by this plan. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add has_own_rejected_notes/has_own_rejected_media to ListByMemberIDWithProposalFields</name>
  <files>backend/internal/repository/anime_contributions_proposal_member_repository.go, backend/internal/repository/anime_contributions_proposal_member_repository_has_own_rejected_test.go, frontend/src/types/contributions.ts</files>
  <behavior>
    Using the reused `openHasOwnReleaseWorkFixture` fixture and `seedPhase143ReleaseScopedContribution`
    helper (same package `repository`, no import needed -- see interfaces block):
    - Test 1: only own release-version note exists, lifecycle `review_state='rejected'`
      -> `HasOwnRejectedNotes` must be `true`, `HasOwnRejectedMedia` must be `false`.
    - Test 2: only own release-version note exists, lifecycle `review_state='confirmed'`
      -> `HasOwnRejectedNotes` must be `false`.
    - Test 3: only own release-version note exists, no lifecycle row at all (pending)
      -> `HasOwnRejectedNotes` must be `false`.
    - Test 4: only own release-version media exists, lifecycle `review_state='rejected'`
      -> `HasOwnRejectedMedia` must be `true`, `HasOwnRejectedNotes` must be `false`.
    - Test 5: only own release-version media exists, lifecycle `review_state='confirmed'`
      -> `HasOwnRejectedMedia` must be `false`.
    - Test 6 (the live-evidenced scenario): own note CONFIRMED and own media REJECTED on the SAME
      release-scoped contribution -> `HasOwnReleaseWork=true` AND `HasOwnRejectedMedia=true`
      simultaneously (proves the exact "vanishes despite needing revision" bug this plan closes).
    Call `repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)` and assert on the returned
    row's new fields for the seeded contribution ID.
  </behavior>
  <action>
    RED: Write the test file first with all six cases above. Run it against the current query (which has
    no has_own_rejected_notes/has_own_rejected_media columns at all) and confirm it fails to compile
    (fields don't exist yet) -- this is the expected RED state before the struct/SQL exist.

    GREEN: In `anime_contributions_proposal_member_repository.go`, add the two new SELECT columns
    immediately after the `has_own_release_work` CASE expression, copying the EXISTS pattern verbatim
    from `anime_contributions_member_project_repository.go` lines 161-180 (see interfaces block), each
    wrapped in the same `CASE WHEN ac.release_version_id IS NULL THEN false ELSE (...) END` guard that
    `has_own_release_work` already uses (this query has one row per contribution, unlike the sibling
    query which is already scoped to one release_version row). Add `HasOwnRejectedNotes`/
    `HasOwnRejectedMedia bool` fields with `json:"has_own_rejected_notes"`/`json:"has_own_rejected_media"`
    tags to `MemberContributionWithProposalRow`, positioned immediately after `HasOwnReleaseWork`, and add
    the corresponding `&row.HasOwnRejectedNotes`/`&row.HasOwnRejectedMedia` to `rows.Scan(...)` in the same
    relative position as the SQL SELECT column order. Do not change any other clause, alias, or the
    surrounding query shape.

    Add `has_own_rejected_notes?: boolean;` and `has_own_rejected_media?: boolean;` to the
    `MeAnimeContribution` interface in `frontend/src/types/contributions.ts`, immediately after the
    existing `has_own_release_work?: boolean;` field.

    Re-check `shared/contracts/openapi.yaml` for a schema covering `MeAnimeContribution` or
    `GET /api/v1/me/anime-contributions`. Per this plan's research it does not exist (see interfaces
    block) and no other field on this exact struct is documented there either. If your own grep confirms
    the same, skip the edit and say so explicitly in the summary; do NOT create a new schema section for
    an endpoint the contract has never documented -- that would be new scope beyond this fix. If you find
    it DOES exist (contract may have changed since this plan was written), add both fields there
    matching the existing style.

    Run the full test suite for this file (all 6 new cases) and confirm all pass.

    Test execution: run inside a `golang:1.25-alpine` container with the repo root mounted at `/src` and
    working dir `/src/backend`, attached to the `team4s_default` Docker network, with
    `TEAM4S_PHASE107_TEST_DSN` exported pointing at the running `team4sv30-db` Postgres service. Do not
    set `DATABASE_URL` or `TEST_DATABASE_URL`; those are not consulted by this fixture.
  </action>
  <verify>
    <automated>docker run --rm -v /home/d1sk/team4s:/src -w /src/backend --network team4s_default -e TEAM4S_PHASE107_TEST_DSN golang:1.25-alpine go test ./internal/repository/... -run 'HasOwnRejected' -v</automated>
  </verify>
  <done>New test file exists with 6 real-Postgres cases (rejected note, confirmed note, pending note, rejected media, confirmed media, and the combined confirmed-note+rejected-media scenario); all 6 pass; MemberContributionWithProposalRow gained HasOwnRejectedNotes/HasOwnRejectedMedia with matching JSON tags; MeAnimeContribution TS type gained the two matching optional fields; shared/contracts/openapi.yaml either updated (if a matching schema was found) or explicitly confirmed absent and left untouched, stated in the summary either way.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Stop hiding rejected-own-work contributions and label them "Überarbeitung nötig"</name>
  <files>frontend/src/app/me/dashboard/components/attentionHelpers.ts, frontend/src/app/me/dashboard/components/attentionHelpers.test.ts, frontend/src/app/me/dashboard/components/AttentionSection.tsx, frontend/src/app/me/dashboard/components/AttentionSection.test.tsx</files>
  <behavior>
    - `filterAttentionContributions` test: a contribution with `release_version_id` set,
      `has_own_release_work: true`, and `has_own_rejected_media: true` (or `has_own_rejected_notes: true`)
      is KEPT in the filtered result (not dropped), while a contribution with `has_own_release_work: true`
      and BOTH rejected flags false/undefined is still DROPPED (existing behavior, regression-locked).
    - `groupAttentionContributions` test: a group containing a rejected-own-work contribution reports
      `hasOwnRejectedWork: true`.
    - `AttentionSection` test: given a contribution with `has_own_release_work: true` and
      `has_own_rejected_media: true`, the rendered item shows the text "Überarbeitung nötig" (exact string,
      real ö) via a `Badge` (not a raw span/div), the item is NOT hidden, and its link href still resolves
      via `resolveWorkspaceHref` (release workspace, `?tab=segments`... i.e. unchanged existing link logic).
      Also add/extend a case proving badge precedence: when both `hasOwnRejectedWork` and
      `hasRecentAssignment` would apply, "Überarbeitung nötig" renders and "Neu" does not.
  </behavior>
  <action>
    RED: Extend `attentionHelpers.test.ts` and `AttentionSection.test.tsx` with the cases above first;
    run them against the current code and confirm they fail (contribution still filtered out / label
    absent).

    GREEN: In `attentionHelpers.ts`'s `filterAttentionContributions`, change the
    `if (contribution.has_own_release_work) { return false; }` branch so it returns `true` instead when
    `contribution.has_own_rejected_notes || contribution.has_own_rejected_media` is true (see interfaces
    block for exact placement) -- otherwise unchanged. Add `hasOwnRejectedWork: boolean` to the
    `AttentionProjectGroup` interface and compute it in `groupAttentionContributions`'s `.map(...)` as
    `ordered.some((item) => item.has_own_rejected_notes || item.has_own_rejected_media)`, mirroring the
    existing `hasRecentAssignment` computation.

    In `AttentionSection.tsx`'s `contributionProjects.map(...)` render block, change the badge selection so
    `project.hasOwnRejectedWork` renders `<Badge variant="danger">Überarbeitung nötig</Badge>` (write the
    real umlaut ö -- never "Ueberarbeitung noetig" or any ASCII substitution) with priority over the
    existing `project.hasRecentAssignment ? <Badge variant="info">Neu</Badge> : null` fallback. Use ONLY
    the existing `Badge`/`Card`/`Link` primitives already imported in this file from `@/components/ui` --
    do not hand-build markup or introduce a new CSS class for this label. Do not touch any other rendering
    branch (pendingGroupMediaReviews, pendingReleaseReviews, pendingClaims, pendingOwnNoteRevisions stay
    byte-for-byte unchanged).

    Run both test files and confirm all cases (new and pre-existing) pass, including the pre-existing
    "blendet eine releasebezogene Zuweisung nach eigener Arbeit aus" case in AttentionSection.test.tsx
    (line ~231), which must still pass unchanged since it sets `has_own_release_work: true` with no
    rejected flags.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/me/dashboard/components/attentionHelpers.test.ts src/app/me/dashboard/components/AttentionSection.test.tsx'</automated>
  </verify>
  <done>filterAttentionContributions keeps rejected-own-work contributions and still drops completed-only ones; groupAttentionContributions exposes hasOwnRejectedWork; AttentionSection renders "Überarbeitung nötig" (real umlaut) via Badge for such groups, with priority over the "Neu" badge, using only @/components/ui primitives; all new and pre-existing tests in both files pass.</done>
</task>

<task type="auto">
  <name>Task 3: Redeploy and measure the live fix for app_user 4 / member 5 / release_version 48</name>
  <files>backend/internal/repository/anime_contributions_proposal_member_repository.go</files>
  <action>
    CRITICAL CONSTRAINT: `release_version_media` id 11 and its `release_version_media_review_lifecycle`
    row (revision 4, `review_state='rejected'`) are being actively reviewed live in the browser by the
    user right now. Every database interaction in this task MUST be a read-only `SELECT`. Never run
    `UPDATE`/`DELETE`/`INSERT` against `release_version_media` id 11, its lifecycle row, or any row tied
    to `release_version_id=48` for app_user 4 / member 5. Read-only SELECT queries only, ever.

    Rebuild and restart the backend: `docker compose up -d --build team4sv30-backend`. Restart the
    frontend so it picks up the new TS type (no rebuild needed for a type-only change, but restart to be
    safe): `docker restart team4sv30-frontend`. Wait for both containers to report healthy/ready.

    First confirm via a plain read-only SELECT that `release_version_media` id 11 still exists and is
    untouched (`review_state='rejected'`, `source_revision=4`).

    Then measure the actual `has_own_release_work` AND `has_own_rejected_media` results for
    `app_user_id=4` / `member_id=5` / `release_version_id=48` -- either by calling the real backend
    endpoint (`GET /api/v1/me/anime-contributions` as app_user 4, reading both fields for the contribution
    tied to `release_version_id=48`) or by reproducing both corrected CASE expressions inline as read-only
    `SELECT`s against `team4sv30-db`. Paste the actual measured values (not a restatement of "should be
    fixed") into the final report: expect `has_own_release_work=true` (note 23 is confirmed) AND
    `has_own_rejected_media=true` (media 11 is rejected) simultaneously -- this is the exact combination
    that previously hid the item entirely and now must surface it as "Überarbeitung nötig".
  </action>
  <verify>
    <automated>docker exec team4sv30-db psql -U "$(grep -m1 '^POSTGRES_USER=' /home/d1sk/team4s/.env | cut -d= -f2)" -d "$(grep -m1 '^POSTGRES_DB=' /home/d1sk/team4s/.env | cut -d= -f2)" -c "SELECT id, review_state, source_revision FROM release_version_media_review_lifecycle WHERE release_version_media_id = 11;"</automated>
  </verify>
  <done>Backend rebuilt and running (frontend restarted); a measured, pasted read-only SQL/API result reports BOTH has_own_release_work=true and has_own_rejected_media=true for app_user 4 / member 5 / release_version 48 simultaneously; release_version_media id 11's lifecycle row is confirmed unchanged before and after (review_state='rejected', source_revision=4); no write ever issued against id 11, its lifecycle row, or any release_version_id=48 row.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| DB read during live verification | Task 3 reads production-shaped dev data while a real user is mid-review of the exact row being queried; any write would corrupt live UAT state |
| Backend query -> member dashboard | `has_own_rejected_notes`/`has_own_rejected_media` are new trust signals consumed client-side to reveal a "needs revision" state; an incorrect false negative here re-hides work that genuinely needs the admin's attention |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICKDTH-01 | Repudiation | `has_own_rejected_notes`/`has_own_rejected_media` CASE expressions | mitigate | Lifecycle-state-aware EXISTS subqueries scoped to `review_state = 'rejected'`, copied verbatim from the already-audited sibling query (`anime_contributions_member_project_repository.go`), proven by 6 real-Postgres regression tests |
| T-QUICKDTH-02 | Tampering | Task 3 live-DB verification queries | mitigate | Task explicitly scoped to read-only `SELECT` only; `UPDATE`/`DELETE`/`INSERT` against `release_version_media` id 11, its lifecycle row, or any `release_version_id=48` row is forbidden in the task action and reinforced in `<done>` |
| T-QUICKDTH-03 | Information Disclosure | Direct `docker exec psql` access to `team4sv30-db` | accept | Localhost/SSH-tunnel-only dev environment per CLAUDE.md; no new exposure introduced |
| T-QUICKDTH-04 | Tampering (UI) | `AttentionSection.tsx` badge rendering | accept | Presentation-only change (label + Badge variant); no new write path, no new authorization surface |

No package-manager installs are part of this plan; the Package Legitimacy Gate does not apply.
</threat_model>

<verification>
1. `docker run --rm -v /home/d1sk/team4s:/src -w /src/backend --network team4s_default -e TEAM4S_PHASE107_TEST_DSN golang:1.25-alpine go test ./internal/repository/... -run 'HasOwnRejected' -v` -- all 6 new cases pass.
2. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/me/dashboard/components/attentionHelpers.test.ts src/app/me/dashboard/components/AttentionSection.test.tsx'` -- all new and pre-existing cases pass.
3. Live measured proof (Task 3): `has_own_release_work=true` AND `has_own_rejected_media=true` simultaneously for app_user 4 / member 5 / release_version 48 against the rebuilt `team4sv30-backend`, with `release_version_media` id 11 confirmed unmodified before and after.
</verification>

<success_criteria>
- [ ] `has_own_rejected_notes`/`has_own_rejected_media` exist on `ListByMemberIDWithProposalFields`, scoped to `ac.release_version_id IS NOT NULL`, mirroring the sibling query's already-shipped EXISTS pattern exactly
- [ ] A real-Postgres regression test proves both flags independently (note/media) across rejected, confirmed, and pending/absent states, plus the combined confirmed-note+rejected-media scenario
- [ ] `filterAttentionContributions` keeps a contribution with rejected own work visible despite `has_own_release_work=true`, while still dropping completed-only contributions (regression-locked)
- [ ] `AttentionSection.tsx` renders "Überarbeitung nötig" (real umlaut, never an ASCII substitution) via a `Badge` from `@/components/ui` for such contributions, taking priority over the "Neu" badge, with an unchanged, correct `resolveWorkspaceHref` link target
- [ ] `shared/contracts/openapi.yaml` re-checked at execution time; updated if a matching schema exists, otherwise its absence is explicitly documented in the summary (no new schema invented)
- [ ] Live measured proof recorded for app_user 4 / member 5 / release_version 48 against the redeployed backend: both `has_own_release_work` and `has_own_rejected_media` reported as measured values
- [ ] `release_version_media` id 11 and its lifecycle row remain completely untouched (verified via a read-only SELECT before and after)
- [ ] `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` (project-list `isDone`/"Erledigt" view) is untouched -- explicitly out of scope
</success_criteria>

<output>
Create `.planning/quick/260903-dth-dashboard-abgelehnte-arbeit-als-ueberarb/260903-dth-SUMMARY.md` when done
</output>
