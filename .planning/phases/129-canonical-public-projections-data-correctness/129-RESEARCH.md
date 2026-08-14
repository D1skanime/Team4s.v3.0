# Phase 129 Research — Canonical Public Projections & Data Correctness

**Produced:** 2026-08-14 · **Consumed by:** gsd-planner / executor
**Method:** two read-only audits on `team4s-linux:/home/d1sk/team4s` (current-state defect audit + seed API-feasibility audit).

This file records the NON-OBVIOUS facts. Decisions are locked in `129-CONTEXT.md`; do not re-litigate them.

---

## 1. Current-state defect map (what actually needs fixing)

The public chain is `GET /api/v1/members/:slug` → `AppPublicProfileHandler.GetPublicMemberProfile` →
`MemberProfileRepository.GetPublicMemberProfileByID` (`member_profile_repository.go:405`) →
`frontend/src/app/members/[slug]/MemberProfileContent.tsx`.

**Architectural fact:** `MemberProfileContent.tsx` consumes ONLY `member_story_html`, `memberships`,
`current_projects`(+`current_projects_count`), `public_badges`(+`badge_progress`+`total_points`),
`latest_contributions`, `previous_contributions`(+`previous_contributions_count`). It does NOT read
`recent_media` or `recent_contributions`; `page.test.tsx:379` asserts `getMemberContributions` is never
called. The backend still computes/serializes those dead fields.

| Req | Verdict | Evidence (file:line) | Fix |
|---|---|---|---|
| PMDA-01 memorial | OK | `member_profile_repository.go:426`; `MemberProfileHero.tsx:110`; `profile.ts:142` | none |
| PMDA-01 year-only dates | **BROKEN** | public query selects only `to_char(active_from_date,...)` (`:415-436`); projection passes `profileActivityDateOrYear(row.activeFromDate, nil)` (`:452-453`) — year hard-nil; `PublicMemberProfileData` has no year fields (`profile.ts:216-248`) | select `active_from_year`/`active_until_year` in public query; add to `PublicMemberProfile` + `PublicMemberProfileData` with an explicit precision flag; render "seit 2019" distinct from a full date |
| PMDA-02 current vs historical | **PARTIAL/BROKEN** | `loadMemberships` (`:923-1005`) emits one merged card/group with year strings only; no `left_date IS NULL`/`is_current`; never queries `hist_group_member_roles` | surface `is_current` (`left_date IS NULL`); source public roles from `hist_group_member_roles` (`visibility='public'`) |
| PMDA-03 confirmed+public | **PARTIAL** | main projections OK (`:1095-1099`, `:1428-1430`, `:1231-1233`); `GetPublicMemberContributionsByID` filters only `is_public_on_member_profile` (`anime_contributions_public_repository.go:347`) — missing `status='confirmed'` | add `status='confirmed'` (endpoint is also frontend-dead → see PMDA-09, prefer removal) |
| PMDA-04 role code+label | **BROKEN** | profile projections emit label-only `ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code))` (`:1062`,`:1414`,`:1228`); roles are `[]string` (model 214/223/262); frontend reverse-maps label→code `ROLE_CODE_BY_LABEL`/`roleColorCode` (`MemberCurrentProjectsSection.tsx:23-32`) | emit `{code,label_de}` pairs server-side from `role_definitions`; delete the client reverse map. Correct analog already exists: `anime_contributions_public_repository.go:102-103,223-224,312-313` returns `role_codes`+`role_labels` |
| PMDA-05 dedupe | **PARTIAL** | projects/contributions OK (`GROUP BY a.id…fg.id` `:1109`,`:1427`; `DISTINCT ON (rvm.id)` `:1302`); `loadMemberships` (`:930-975`) has NO dedupe → LEFT-JOIN fan-out duplicates group cards | `DISTINCT ON (fg.id)` with deterministic ordering (or aggregate join/left dates) |
| PMDA-06 progress from public facts | **PARTIAL** | `total_points` pure select (`:590-604`) OK; but `loadBadgeProgress` "progress" family counts `status='confirmed'` with NO `is_public_on_member_profile` (`member_profile_progress_repository.go:36-38`); archivist count unfiltered ("ohne Freigabe-/Sichtbarkeitsfilter", `member_profile_contribution_badges_repository.go:156-161`) | add `is_public_on_member_profile=true` to progress count; add visibility/review filters to archivist count |
| PMDA-07 release media filters | **PARTIAL** | `loadLatestContributions` OK (`:1327-1385`, public+approved+ready+deleted_at NULL); `loadRecentMedia` (`:1457-1512`) omits `visibilities`(public)+`review_statuses`(approved) joins → leaks private/unapproved media | remove `recent_media` from public DTO (preferred, PMDA-09) or add the two joins |
| PMDA-08 totals match rows | **BROKEN** | `loadCurrentProjects` INNER JOINs `anime_contribution_roles acr` (`~:1090`); `countCurrentProjects` (`:1154-1175`) does NOT → count > listed rows → `hasMore` stuck true (`MemberCurrentProjectsSection.tsx:53`) | align `countCurrentProjects` predicates with `loadCurrentProjects` (add matching `EXISTS`/join, or drop the `acr` requirement from list) |
| PMDA-09 dead legacy | **BROKEN** | `loadRecentMedia`(`:502`)/`loadRecentContributions(...,true)`(`:506`) still called+serialized (model 290-291), unread by public UI (only own-profile `me/profile/page.tsx:728/732` uses them); `/members/:slug/contributions` route (`main.go:557`) + `getMemberContributions`(`api.ts:9397`) + `MemberRoleTimeline`/`MemberContributionFilters` frontend-dead | drop `recent_*` from public DTO + stop loaders in public path; remove the dead `/contributions` route + components + helper |
| PMDA-10 all roles / no internal | **BROKEN** | `MembershipsSection.tsx:19` takes `app_member_roles?.[0]` (and public path leaves it empty → zero roles); `GetPublicMemberContributionsByID` branch 3 emits raw `fgmr.role` internal codes (e.g. `techadmin`) (`anime_contributions_public_repository.go:357`) | membership roles from `hist_group_member_roles` (public), expose ALL approved roles; kill raw `fgmr.role` output (endpoint removed) |
| PMDA-11 one dataset + load-more | **PARTIAL** | current-projects heading/count/load-more share dataset (`getMemberProjects` → same load/count pair) but PMDA-08 mismatch makes load-more return empty pages; the requirement's "filters" refer to the dead `MemberContributionFilters` | fixing PMDA-08 fixes load-more; no live filtered feed remains after dead-code removal |
| PMPR-06 no internal leakage | **PARTIAL** | public path passes `includeAppMembershipDetails=false`/`includeInternalHistorical=false` (`:478`) OK; leaks via `recent_media`, progress/archivist counts, `/contributions` | resolved by the fixes above |

---

## 2. Repository split (S-02: 1810 → ≤450/file, behavior-preserving)

Siblings already exist (`_progress_`, `_role_volume_`, `_contribution_badges_`). Split the rest:

- `member_profile_repository.go` (keep) — struct, constructor, `publicMemberProfileBaseRow`, shared helpers (`publicURLForPath`, `normalize*`, `rawJSON*`, `normalizeProfileActivityDate`, `isValidProfileActivityRange`, `profileActivityDateOrYear`, `valueOr*`, `isCheckViolation`). ~200 ln.
- `member_profile_own_repository.go` — `GetOwnProfile`, `hasProjectAssignments`, `UpdateOwnProfile`, `AttachUploadedAvatar/Background`, `ensureProfileBase`. 
- `member_profile_ensure_repository.go` — `ensureProfileBaseTx` (~:624-922).
- `member_profile_public_repository.go` — `GetPublicMemberProfile(ByID)`, `loadPublicBadges`, `loadTotalPoints` (~:391-605).
- `member_profile_memberships_repository.go` — `loadMemberships`, `loadHistoricalCredits` (~:923-1048).
- `member_profile_projects_repository.go` — `loadCurrentProjects`, `countCurrentProjects`, `GetPublicMemberProjects(ByID)`, `loadCurrentProjectReleaseVersions` (~:1049-1272).
- `member_profile_contributions_repository.go` — `loadLatestContributions`, `loadPreviousContributions` (~:1273-1456).
- `member_profile_recent_repository.go` — `loadRecentMedia`, `loadRecentContributions` (or delete public consumers per PMDA-09; keep only what `GetOwnProfile` needs).

Split is refactor-only; test outcomes must be identical before/after.

---

## 3. Seed script (Wave 1) — verified build sequence

**Ports (from `docker ps`, NOT `.env`):** backend `http://192.168.235.196:18092`, Keycloak `http://192.168.235.196:18081`, frontend `:3000`, Postgres `:5433` db `team4s_v2`.

**Auth = Keycloak direct grant** (realm `team4s`, client `team4s-frontend` is public + `directAccessGrantsEnabled`):
`POST http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token`
`grant_type=password&client_id=team4s-frontend&username=…&password=…` → `Authorization: Bearer <access_token>`.
Backend verifies JWKS in `middleware/current_user_auth.go`; issuer must be the `:18081` realm URL.

**Identity map (verified):**
- **Token A = `csubs-leader@team4s.local`** (app_user 2, **platform_admin**, linked member **1**), password `123` → all admin routes + memorial + `PUT /me/profile` for member 1.
- **Token B = `sheppert@team4s.local`** (app_user 3, no admin, linked member **2**) → only `PUT /me/profile` for member 2. **Password `123`** (confirmed by user).

**Valid role codes:** `group_history` = co_leader, designer, editor, encoder, fansub_lead, founder, project_lead, quality_checker, raw_provider, timer, translator, typesetter. `anime_contribution` = admin, designer, editor, encoder, other, project_lead, quality_checker, raw_provider, timer, translator, typesetter.

**Ordered steps (all API-reachable unless noted):**
1. `POST /api/v1/fansubs` (Token A) — ≥2 groups (A=current, B=historical). Body `{slug,name,status,founded_year,...}`; `group_type` only `group`. `fansub_groups.go:82`.
2. `POST /api/v1/admin/anime` (Token A) — **≥10 distinct anime** (productive_bronze + >1 project page). `admin_content_anime.go:21`.
3. `POST /api/v1/anime/:id/fansubs/:fansubId` (Token A) — attach anime↔group. `fansub_group_anime.go:47`.
4. `POST /api/v1/anime/:id/episodes/:episodeNumber/versions` (Token A) — release versions; populates `release_version_groups` (prereq for awarded credits). Two versions on one anime for scenario #6. Body req `{media_provider,media_item_id, fansub_group_id, version,...}`. `episode_version_create.go:14`.
5. `POST /api/v1/admin/fansubs/:id/group-members` (Token A) — hist memberships: member in Group A with NO `left_date` (=current), member in Group B with `left_date` (=historical). Body `{member_id,status,visibility,joined_date?,left_date?}`, `visibility∈internal/public`. NB `hist_fansub_group_members` has no `is_currently_active` column — "current" == null `left_date`.
6. `POST /api/v1/admin/fansubs/:id/member-roles` (Token A) — call TWICE with same `hist_fansub_group_member_id`, two role_codes (multi-role). Include `fansub_lead`/`founder` → `historical_leader` badge. Body `{hist_fansub_group_member_id,role_code,status,visibility,...}`.
7. `POST /api/v1/admin/fansubs/:id/anime/:animeId/contributions` (Token A) — both states: confirmed+public (`status:"confirmed"`) and draft/not-public (`status:"draft"` or flags false). ≥10 confirmed distinct-anime → productive_bronze. **Rejects `release_version_id` (422)** — version credits go through step 8. Body `{member_id,role_codes[],status,started_year?,ended_year?,is_public_on_member_profile?}`.
8. `PUT /api/v1/admin/release-versions/:versionId/contributions/effective?fansub_group_id=N` (Token A) — INSERTs `release_role_credit_lifecycles` (`lifecycle_status='awarded'`) + point ledger (`release_role_work` rule already seeded). Same member+role on TWO versions of one anime = scenario #6 dedupe. Body `{rows:[{member_id,role_codes[]}]}` (strict JSON). `admin_content_fansub_releases_contributions_handlers.go:65`.
9. `PUT /api/v1/me/profile` (Token A for member 1, Token B for member 2) — `{active_from_year,active_until_year}` (accepted; converted to `YYYY-01-01` and year derived) and `{is_currently_active:true}`. Year-only *period* + currently-active flag are API-reachable.
10. `POST /api/v1/admin/members/:id/memorial` (Token A, platform_admin only, **no body**) — apply to ONE member. `member_memorial_handler.go`.

**Idempotency:** unique `(fansub_group_id,member_id)` on hist members; `(release_version_id,fansub_group_id,member_id,role_code,generation)` on credits (`applyDiff` skips already-awarded); `point_ledger_entries.idempotency_key` unique; `(release_id,version)` unique. Re-run should no-op, not duplicate. A clean-reset (Phase 134) truncates append-only point tables via the documented `session_replication_role=replica` path (reject_truncate + mutation-guard triggers).

**NEEDS SQL SUPPLEMENT (only one, optional):** the *degenerate* row "years set WHILE dates NULL" is unreachable via API (every write sets the date and derives the year) and is not even read by the public query. Only add if a plan literally needs the divergence:
```sql
UPDATE members SET active_from_year=2015, active_until_year=2019,
  active_from_date=NULL, active_until_date=NULL WHERE id=2;  -- passes chk_members_active_* 
```
Recommendation: treat the year-only *period* as API-reachable (step 9); PMDA-01 fix (§1) makes the year observable regardless.

---

## 4. Open items for planning
- Confirm Token B (`sheppert`) password before the seed's `PUT /me/profile` on member 2 (fallback: run that one edit with Token A is NOT possible — sheppert is not admin; alternative is a one-line SQL or a temporary claim). Plan should surface this, not guess.
- `/members/:slug/contributions` removal vs fix: CONTEXT D-11 + frontend-dead + leak ⇒ **remove** (route + `MemberRoleTimeline` + `MemberContributionFilters` + `getMemberContributions`). If any non-test consumer is found at execute time, fall back to fixing filters and coordinate with Phase 130.
