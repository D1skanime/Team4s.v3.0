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

## Scope Addition 2: Kürzel-Feld + Aliase-Umbenennung (Anlegeseite)

**User report (2026-10-08, verbatim decision):** The Fansub-Anlegeseite
(`/admin/fansubs/create`) lacked a Kürzel field entirely, while the matching
Bearbeitungsseite already supported it with full server-side uniqueness
enforcement (GAP-05). Decision: reuse the existing `FansubGroupKuerzelField`
component verbatim (move it to a shared location if needed, build no new UI),
give the Create endpoint the exact same Kürzel validation/conflict behavior as
Patch (validated only at save time, not live-as-you-type), surface the 409
through the create page's existing save-error path, and rename the "Tags"
section on the create page to "Aliase" to match the edit page's terminology
for the same alias table.

### What was found

- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx` was a
  small, already-complete, `@/components/ui`-based presentational component
  (`FormField` + `Input`, value/disabled/onChange props only) used by
  `FansubBasicInfoTab.tsx` on the edit page. No React import-path barrier
  actually prevented reusing it cross-route (Next.js App Router only treats
  `page.tsx`/`layout.tsx`/etc. specially; arbitrary named `.tsx` files are
  plain modules) — the create page's `AdminFansubCreateAliasesSection.tsx`
  already imported a CSS module from the sibling `[id]/edit/` directory the
  same way. Moved it anyway per the user's explicit "ggf. an einen
  gemeinsamen Ort verschieben" instruction, to a shared admin location
  (`frontend/src/components/admin/`, alongside `MediaUpload.tsx`) rather than
  `frontend/src/components/fansubs/` (that directory is exclusively public
  fansub-profile display components — `FansubHeroSection`, `FansubTeamSection`,
  etc. — a different domain from admin forms).
- Backend: `FansubRepository.UpdateGroup`'s Kürzel branch (around
  `fansub_repository_groups.go:300`) was the only place that called
  `normalizeAliasKey` + `findFansubKuerzelOrAliasOwner` + set
  `kuerzel`/`normalized_kuerzel`. `CreateGroup` never accepted or inserted a
  Kürzel at all — both columns always received their table defaults (`NULL`)
  on insert, and `fansubGroupCreateRequest`/`FansubGroupCreateInput` had no
  `Kuerzel` field to carry one in.
- The exact conflict message format (`"Kürzel gehört bereits zu %s."`,
  returned as a 409 via `*repository.ConflictOwnerError`) lives in
  `UpdateFansub`'s handler branch in `fansub_groups.go`; `CreateFansub` had no
  equivalent branch, so the same repository error would have fallen through
  to `errors.Is(err, repository.ErrConflict)` → the generic
  "fansubgruppe bereits vorhanden" message, or further down to the generic
  500 branch (since `*ConflictOwnerError` does not satisfy `errors.Is(err,
  repository.ErrConflict)` — it is a distinct wrapped type), had the create
  path started producing it without a matching `errors.As` branch.
- The create page's `formToPatchPayload` (used for every *second* save once
  a group already exists) never included `kuerzel` either, even though its
  sibling `FansubGroupPatchRequest`/backend Patch path already fully supports
  it. Left as-is, a user who filled in the new Kürzel field on first create
  and then edited it again from the same create-page UI (post-creation, pre
  navigating to the dedicated edit page) would have silently lost that edit
  on the next save — the Patch request simply wouldn't carry the field.
  Fixed as part of this scope addition (Rule 1/2 — direct, necessary
  consequence of adding `kuerzel` to the shared `FormState` both save paths
  read from).

### What was changed

**Backend:**
- `backend/internal/models/fansub.go`: added `Kuerzel *string` to
  `FansubGroupCreateInput`.
- `backend/internal/handlers/fansub_requests.go`: added
  `Kuerzel *string \`json:"kuerzel"\`` to `fansubGroupCreateRequest`.
- `backend/internal/handlers/fansub_group_create_validation.go`:
  `validateFansubGroupCreateRequest` now normalizes Kürzel via the same
  `normalizeNullableString` helper the Patch validator uses (empty/
  whitespace-only → `nil`) and rejects anything over 32 runes with the same
  `"ungültiger kuerzel parameter"` message the Patch path already used.
- `backend/internal/repository/fansub_repository_groups.go`: `CreateGroup`
  now runs the identical Kürzel-conflict check `UpdateGroup` already ran
  (`normalizeAliasKey` → `findFansubKuerzelOrAliasOwner(ctx, normalized, 0)`
  — `0` as the exclude-id since the new group has no id yet and
  `fansub_groups.id` is a `BIGSERIAL` starting at 1, so `<> 0` never
  excludes a real row) before the `INSERT`, returning
  `*repository.ConflictOwnerError` on conflict exactly like the Patch path.
  The `INSERT` statement now writes both `kuerzel` and `normalized_kuerzel`
  columns instead of leaving them at their table defaults.
- `backend/internal/handlers/fansub_groups.go`: `CreateFansub` gained the
  same `var ownerErr *repository.ConflictOwnerError; if errors.As(err,
  &ownerErr)` branch `UpdateFansub` already had, responding `409` with
  `fmt.Sprintf("Kürzel gehört bereits zu %s.", ownerErr.OwnerGroupName)` —
  byte-identical message format to the Patch path.

**Contracts:**
- `shared/contracts/fansubs.yaml` and `shared/contracts/openapi.yaml`:
  added the optional `kuerzel` field to `FansubGroupCreateRequest`
  (`string | null`, max 32, documenting the save-time-only uniqueness check
  and the 409 message format). `FansubGroupPatchRequest`'s OpenAPI schema
  was found to already be missing `kuerzel` from an earlier phase — a
  pre-existing, unrelated contract-documentation gap, logged below rather
  than fixed (out of this scope addition's boundary: Create only).

**Frontend:**
- Moved `FansubGroupKuerzelField.tsx` from
  `frontend/src/app/admin/fansubs/[id]/edit/` to
  `frontend/src/components/admin/FansubGroupKuerzelField.tsx` (byte-identical
  contents); updated the one existing import in
  `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`.
- `frontend/src/types/fansub.ts`: added `kuerzel?: string | null;` to
  `FansubGroupCreateRequest`.
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts`: added
  `kuerzel: string` to `FormState`; `emptyForm()`/`mapGroupToForm()` default
  it to `""` (mirroring every other optional text field); `toOptional(form.
  kuerzel)` wired into both `formToCreatePayload` (new field) and
  `formToPatchPayload` (the Rule 1/2 fix described above).
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`:
  renders `<FansubGroupKuerzelField value={form.kuerzel} disabled={false}
  onChange={...} />` directly below the Name field in the same
  `responsiveFieldGrid`, matching the edit page's placement. No permission
  gating applies on the create page (unlike the edit page's
  `disabled={!canEditGeneral}`) since the whole route is already behind
  `PlatformAdminGate` with no per-field capability scoping.
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx`:
  section heading `"Tags"` → `"Aliase"`; added the edit page's
  `placeholder="Alias hinzufügen"` to the alias input (previously had no
  placeholder at all).
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts`:
  `"Tag existiert bereits."` → `"Alias existiert bereits."`,
  `"Tag hinzugefügt."` → `"Alias hinzugefügt."`,
  `"Tag entfernt."` → `"Alias entfernt."`.
- The 409 conflict message (from either Create or a later Patch) surfaces
  through the create page's existing generic save-error path — the
  `catch` block in `useAdminFansubCreateActions.save` already calls
  `setError(errMessage(nextError))`, and `page.tsx` already renders
  `{error ? <div className={styles.errorBox}>{error}</div> : null}` right
  above the form fields. No new error-display wiring was needed.

### Tests added (logic only, no render/click tests, per explicit instruction)

- `backend/internal/repository/phase176_fansub_create_kuerzel_test.go` (new,
  real-Postgres, reusing the Phase-167 fixture
  `testsupport.OpenPhase167Postgres`):
  `TestFansubGroupCreateKuerzel_SetsFreshKuerzel` (fresh Kürzel persists and
  round-trips through `GetGroupByID`), `TestFansubGroupCreateKuerzel_
  EmptyKuerzelBecomesNull` (nil input → `NULL` in both the returned struct
  and on reload), `TestFansubGroupCreateKuerzel_ConflictsWithExistingKuerzel`
  (a different-casing Kürzel match against another group's Kürzel rejects
  with `*ConflictOwnerError` naming that group, **and** proves no partial
  row was inserted via a follow-up `GetGroupBySlug` → `ErrNotFound`),
  `TestFansubGroupCreateKuerzel_ConflictsWithExistingAlias` (a Kürzel
  matching another group's existing alias text rejects the same way).
- `backend/internal/handlers/fansub_group_create_validation_test.go` (new,
  pure function tests calling the real `validateFansubGroupCreateRequest`):
  omitted Kürzel stays `nil`, whitespace-only Kürzel normalizes to `nil`,
  a populated Kürzel is trimmed and kept, a 33-rune Kürzel is rejected with
  the length-validation message.
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts`:
  extended `mapGroupToForm`/`emptyForm`/`formToCreatePayload`/
  `formToPatchPayload` assertions with `kuerzel`; added two new cases
  proving `formToCreatePayload`/`formToPatchPayload` trim a populated
  Kürzel through, and one proving `mapGroupToForm` maps a present Kürzel
  through while defaulting a null/absent one to `""`.
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts`
  and `.../page.test.tsx`: updated existing payload-equality assertions to
  include `kuerzel: null` (no new test cases needed here — the existing
  save-flow tests already exercise the payload shape end-to-end).

### Verification performed

- `docker exec team4sv30-backend go build ./...` and `go vet ./internal/...`
  — clean.
- Confirmed pre-existing-and-unrelated backend test failures via revert/
  re-run isolation (see `deferred-items.md` → "Scope Addition 2" for the
  full list and method): none touch any file this scope addition modified.
- `docker exec team4sv30-backend go test ./internal/handlers/... -run
  TestValidateFansubGroupCreateRequest` — all 7 PASS (4 new + 3 pre-existing
  sibling cases in the same describe-block file).
- Created a disposable `team4s_phase167_test_scope2` Postgres database
  (`CREATE EXTENSION unaccent`, same fixture shape the existing Phase-167
  Kürzel-conflict suite already uses) and ran `go test ./internal/
  repository/... -run 'TestFansubGroupCreateKuerzel|
  TestFansubGroupKuerzelUniqueness'` with `TEAM4S_PHASE167_TEST_DSN` set —
  all 9 PASS (4 new + 5 pre-existing sibling cases, confirming no
  regression on the existing Patch-path conflict suite). Database dropped
  immediately after.
- `docker exec team4sv30-backend go test ./internal/repository/...`
  (full package, no DSN overrides) — the 4 new tests correctly `SKIP` (DSN
  not set in that run); all other failures present were independently
  confirmed pre-existing/environment-dependent (live Keycloak creds,
  external-host connectivity, a known `release_version_media.reorder`
  capability-registry gap already logged under 176-12/176-13) — none
  mention `fansub`/`kuerzel` beyond one unrelated `fansub_group_app_members_
  repository_test.go` failure, confirmed unrelated by file/feature.
- `docker exec team4sv30-frontend npx tsc --noEmit` — clean.
- `docker exec team4sv30-frontend npx eslint` on every touched/created
  frontend file — clean.
- `docker exec team4sv30-frontend npx vitest run` (full suite) — **364
  test files passed, 1 pre-existing skip, 3256 tests passed, 3 pre-existing
  todos** — including all touched files
  (`adminFansubCreateHelpers.test.ts`, `useAdminFansubCreateActions.test.ts`,
  `page.test.tsx`, `FansubBasicInfoTab.test.tsx`).
- Backend rebuilt: `docker compose up -d --build team4sv30-backend` →
  `/health` returns `{"status":"ok"}`.
- Frontend restarted: `docker restart team4sv30-frontend` →
  `http://192.168.235.196:3000/admin/fansubs/create` returns 200.

### Files changed

- `backend/internal/models/fansub.go`
- `backend/internal/handlers/fansub_requests.go`
- `backend/internal/handlers/fansub_group_create_validation.go`
- `backend/internal/handlers/fansub_group_create_validation_test.go` (new)
- `backend/internal/handlers/fansub_groups.go`
- `backend/internal/repository/fansub_repository_groups.go`
- `backend/internal/repository/phase176_fansub_create_kuerzel_test.go` (new)
- `shared/contracts/fansubs.yaml`
- `shared/contracts/openapi.yaml`
- `frontend/src/components/admin/FansubGroupKuerzelField.tsx` (new, moved
  from `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupKuerzelField.tsx`,
  which was deleted)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`
- `frontend/src/types/fansub.ts`
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx`
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts`
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts`
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts`
- `frontend/src/app/admin/fansubs/create/page.test.tsx`

`.planning/sketches/` was not touched.

### Known gaps (not fixed, out of this scope's boundary)

- `shared/contracts/openapi.yaml`'s `FansubGroupPatchRequest` schema is
  missing the `kuerzel` property entirely, even though the Patch handler/
  repository have fully supported it since GAP-05 (an earlier phase). Only
  `FansubGroupCreateRequest` (this scope addition's actual target) was
  updated. Pre-existing, unrelated to Create — flagged for a future pass.

### Recommended live-UAT additions for the phase's final checkpoint (176-15)

Add to the 176 closing UAT:
1. Open `/admin/fansubs/create`, confirm a "Kürzel" field is visible directly
   below "Name" (same hint text as the edit page: "Muss systemweit eindeutig
   sein..."), type a value, and confirm there is **no** live/as-you-type
   validation feedback (no network call, no inline error) — only save-time
   validation.
2. Fill in Name + a brand-new, unused Kürzel and click "Anlegen" — confirm
   the group is created successfully and the Kürzel persists (e.g. visible
   after navigating to the group's Edit-Seite).
3. Create a second group reusing an already-assigned Kürzel (or an alias
   text already used by another group) — confirm a 409 appears in the same
   error box used for other save failures on this page, reading exactly
   "Kürzel gehört bereits zu <Gruppe>." with the correct owning group name.
4. Confirm the alias section heading now reads "Aliase" (not "Tags"), the
   input placeholder reads "Alias hinzufügen", and adding/removing an alias
   shows "Alias hinzugefügt."/"Alias entfernt." toasts (not "Tag...").
