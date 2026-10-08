# Phase 176: Extra Scope Additions (user-authorized, pre-176-15 gate)

This file documents scope additions approved by the user on 2026-10-08, implemented
BEFORE the phase's final 176-15 Prüfkette gate. Each addition gets its own numbered
section below, appended by separate agent runs.

## Scope Addition 1: Rollen-Picker assignable-Filter (Administration/Sonstiges)

**User report (2026-10-08, verbatim decision):** In the "Mitwirkende: <Anime>"
dialog (Projekt-/Release-Crew, "Rollen ändern"), the role picker offered "Administration"
(`admin`) and "Sonstiges" (`other`) even though both have been `assignable=false` in
`role_definitions` since migration `0148_role_catalog_uat_corrections`. Decision: both
roles must disappear from every Mitwirkende/Crew role selection, server-side assignment
of a non-assignable role must be rejected, and `role_definitions` rows must not be deleted
(display of any already-stored assignment must keep resolving labels).

### What was found

- **Backend already serialized `assignable`** correctly in the public role catalog
  response (`backend/internal/repository/role_catalog_repository.go` →
  `PublicRoleDefinition.Assignable` with `json:"assignable"`, exposed via
  `GET /api/v1/role-definitions?context=...`). Live-checked against the real DB
  (`team4s_v2`): `admin` → `contexts={anime_contribution,group_history}`, `other` →
  `contexts={anime_contribution}`, both `assignable=false`. Confirmed live via
  `curl http://127.0.0.1:18092/api/v1/role-definitions?context=anime_contribution`
  after rebuild — both rows correctly report `"assignable": false`. The gap was
  entirely that nothing downstream (frontend picker, backend write validation)
  actually filtered/enforced on that field.
- **Frontend central filter point**: `contributionRoleDefinitions()` in
  `frontend/src/components/contributions/contributionRoles.ts` is the single function
  that derives anime_contribution picker options from the raw catalog
  (`orderForContext(catalog, 'anime_contribution')`). It feeds exactly two real
  consumers: `RoleToggleGroup.tsx` (used by both `AnimeContributionModal.tsx`'s and
  `ReleaseContributionDrawer.tsx`'s "Rollen ändern" dialog) and `MyProposalsSection.tsx`
  (member self-service contribution proposal form). `DefaultCrewManager.tsx`'s
  "Standard-Team" role `<Select>` built its own ad hoc filtered list directly from
  `useRoleCatalog('anime_contribution').roles` (excluding only `fansub_lead`), bypassing
  `contributionRoleDefinitions` entirely — this was the second picker surface the user's
  "ggf. weitere Crew-/Default-Crew-Picker" note anticipated.
- **Backend write-side validation gap**: `HistGroupMemberRolesRepository
  .RoleCodeExistsForContext` (existence + context check only, no assignable check) was
  the sole server-side role validation at three call sites: `CreateAnimeContribution` and
  `UpdateAnimeContribution` in `fansub_anime_contributions_handler.go`, and `CreateProposal`
  in `contribution_proposals_me_handler.go`. A fourth write path,
  `FansubDefaultCrewHandler.PutDefaultCrew` (`fansub_group_default_crew` table), had **no**
  role validation at all beyond a non-empty check — it relied solely on the table's FK to
  `role_definitions(code)`, which doesn't filter by context or assignable. Confirmed via
  live DB query that `anime_contribution_roles`/`fansub_group_default_crew` currently have
  0 rows referencing `admin`/`other` (matches user's own pre-check).

### What was changed

**Backend — new central assignable-check, reused at all four write paths:**
- Added `HistGroupMemberRolesRepository.RoleCodeIsAssignableForContext(ctx, code, context)
  (bool, error)` in `backend/internal/repository/hist_group_member_roles_repository.go` —
  returns `true` only if the role exists in the given context AND
  `role_definitions.assignable = true`; resolves neutrally to `false` (never an error) for
  blank/unknown codes, matching the existing `RoleCodeExistsForContext` contract.
  `RoleCodeExistsForContext` itself was left untouched (still used by
  `IsHistoricalMemberRoleCode`/group_history paths, out of this scope).
- `backend/internal/handlers/fansub_anime_contributions_handler.go`:
  `CreateAnimeContribution` and `UpdateAnimeContribution` now call
  `RoleCodeIsAssignableForContext` instead of `RoleCodeExistsForContext`; on rejection,
  respond `400 Bad Request` (was `422`) with `badRequest(c, "Diese Rolle kann nicht
  zugewiesen werden: <code>")`, per the user's explicit 400 + German-message requirement.
- `backend/internal/handlers/contribution_proposals_me_handler.go`: `RolesRepository`
  interface's single method renamed from `RoleCodeExistsForContext` to
  `RoleCodeIsAssignableForContext`; `CreateProposal` now rejects with the same 400 message.
- `backend/internal/handlers/fansub_default_crew_handler.go`: added a `rolesRepo
  *repository.HistGroupMemberRolesRepository` field (new constructor parameter) and a new
  validation block in `PutDefaultCrew` that rejects non-assignable or out-of-context roles
  with the same 400 message, before the member runs through
  `MemberBelongsToFansub`/`UpsertDefaultCrewEntry`. This closes a pre-existing gap (Rule 2 —
  auto-add missing critical functionality): the endpoint previously had zero context/role
  validation at all, relying only on the FK existing.
- `backend/cmd/server/main.go`: `NewFansubDefaultCrewHandler(...)` now also receives the
  already-constructed `histGroupMemberRolesRepo`.
- `backend/internal/handlers/contribution_proposals_me_test.go`: the `rolesRepoStub` method
  was renamed to match the interface; added `TestCreateProposal_RejectsNonAssignableRole`
  (httptest-based, executes the real handler, asserts HTTP 400 and the rejection message
  substring — no source-string-matching, per CLAUDE.md Teststil).
- New file `backend/internal/repository/hist_group_member_roles_assignable_test.go`: a
  real-Postgres integration test (`testsupport.OpenPhase145Postgres`, same pattern as the
  existing `role_definitions_context_test.go`/`hist_group_member_roles_whitelist_test.go`)
  proving `RoleCodeIsAssignableForContext` rejects `assignable=false` rows even though they
  exist in the requested context, accepts `assignable=true` rows, resolves `false` for a
  role outside its seeded context, and resolves neutrally for blank/unknown codes.

**Frontend — one central filter, reused at both picker surfaces:**
- `frontend/src/components/contributions/contributionRoles.ts`: `contributionRoleDefinitions()`
  now filters `role.assignable !== false` after the existing `orderForContext` call. This is
  the single change point; it automatically fixes `RoleToggleGroup.tsx` (hence
  `AnimeContributionModal.tsx` and `ReleaseContributionDrawer.tsx`'s "Rollen ändern" dialogs)
  and `MyProposalsSection.tsx`'s self-service proposal form. Deliberately did **not** touch
  `orderForContext` itself (shared with many pure-display consumers like
  `MemberBadgeChain.tsx`, `ContributionCard.tsx`, `AnimeGroupCard.tsx`, `UserContributionsTab.tsx`
  that resolve labels for already-stored role codes) — filtering there would have broken
  label resolution for display per the "Anzeige-Labels müssen weiter auflösbar sein"
  constraint. `labelForRole`/`roleLabels` continue to receive the full, unfiltered catalog.
- `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx`: the "Standard-Team"
  add-role `<Select>` (`crewRoleOptions`) now derives from `contributionRoleDefinitions(...)`
  (the same central function) instead of its own ad hoc `.filter()` over the raw catalog,
  with the pre-existing `fansub_lead` exclusion preserved on top.
- `frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.test.ts`: added `admin`/`other`
  rows (assignable=false) to the shared test catalog, plus three new pure-logic assertions:
  the picker never offers them, `roleLabels` still resolves their display labels from the
  full catalog, and assignable roles remain selectable. No render/click tests were added
  (per explicit instruction) — `DefaultCrewManager.test.tsx` was left byte-for-byte
  unchanged since the shared central function is already proven by the logic test above.

**Contracts:** Added a short clarifying note to `UpsertAnimeContributionRequest`/
`UpdateAnimeContributionRequest.role_codes` in `shared/contracts/admin-content.yaml` and
`shared/contracts/openapi.yaml` documenting the assignable=true requirement and 400 on
violation.

### Verification performed

- `docker exec team4sv30-backend go build ./... && go vet ./...` — clean.
- `docker exec team4sv30-backend go test ./internal/repository/... -run
  'TestRoleCodeIsAssignableForContext|TestHistGroupMemberRoles|TestRoleDefinitionsContext'`
  — all PASS, against a real disposable `team4s_phase145_test_scope1` Postgres database
  (created and dropped for this run).
- `docker exec team4sv30-backend go test ./internal/handlers/... -run
  'TestCreateProposal|TestSelfPublish'` — all PASS (15 tests), including the new
  `TestCreateProposal_RejectsNonAssignableRole`.
- Full `go test ./...` run with the Phase-145 DSN set: the only failures are pre-existing,
  unrelated to any file this scope addition touched (missing Jellyfin fixture files under
  `docs/audits/2026-09-15-jellyfin12/`, other phases' missing `TEAM4S_PHASE128_TEST_DSN`/
  keycloak-live/external-host dependencies — confirmed by grepping the full failure log for
  `role_catalog|contribution_proposals_me|fansub_anime_contributions|fansub_default_crew|
  hist_group_member_roles|RoleCodeIsAssignable`: zero matches).
- `docker exec team4sv30-frontend npx tsc --noEmit` — clean.
- `docker exec team4sv30-frontend npx eslint <touched files>` — clean.
- `docker exec team4sv30-frontend npx vitest run` (full suite) — **364 passed, 1 pre-existing
  skip, 3253 tests passed**, including the updated `contributionRoles.test.ts` (6 tests) and
  the untouched `DefaultCrewManager.test.tsx`/`AnimeContributionModal.test.tsx`/
  `ReleaseContributionDrawer.test.tsx` (all still green).
- Backend rebuilt: `docker compose up -d --build team4sv30-backend` → `/health` returns 200.
- Frontend restarted: `docker restart team4sv30-frontend` → `http://192.168.235.196:3000/`
  returns 200.
- Live API check against the real `team4s_v2` database post-rebuild:
  `curl http://127.0.0.1:18092/api/v1/role-definitions?context=anime_contribution` shows
  `admin` and `other` both with `"assignable": false` (confirming the backend always
  exposed this correctly — only the picker/write-validation consumers were missing the
  filter).

### Files changed

- `backend/internal/repository/hist_group_member_roles_repository.go` (new method)
- `backend/internal/repository/hist_group_member_roles_assignable_test.go` (new file)
- `backend/internal/handlers/fansub_anime_contributions_handler.go`
- `backend/internal/handlers/contribution_proposals_me_handler.go`
- `backend/internal/handlers/contribution_proposals_me_test.go`
- `backend/internal/handlers/fansub_default_crew_handler.go`
- `backend/cmd/server/main.go`
- `frontend/src/components/contributions/contributionRoles.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/contributionRoles.test.ts`
- `shared/contracts/admin-content.yaml`
- `shared/contracts/openapi.yaml`

`.planning/sketches/` was not touched.

### Recommended live-UAT addition for the phase's final checkpoint

Add to the 176 closing UAT: open "Mitwirkende: <Anime>" (AnimeContributionModal) →
"Rollen ändern" and confirm the picker no longer offers "Administration" or "Sonstiges" (only
genuinely assignable roles like Übersetzung/Encoding/etc. appear); repeat the same check in
the Release-Besetzung drawer ("Rollen ändern") and in the Fansub-Gruppe "Standard-Team"
tab's role dropdown. No backend call is needed for this — it is a pure UI confirmation.
