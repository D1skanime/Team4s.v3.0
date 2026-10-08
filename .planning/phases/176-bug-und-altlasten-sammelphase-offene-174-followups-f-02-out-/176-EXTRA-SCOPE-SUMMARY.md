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

## Scope Addition 3: Gruppentyp entfernen + Land/Status eindeutschen

**User report (2026-10-08, verbatim decision):** The "Typ"/Gruppentyp field on
both the Fansub-Anlegeseite and the Bearbeitungsseite is dead legacy from the
Phase-81-retired collaboration groups — `fansub_groups.group_type` was dropped
by migration 0102, the dropdown only ever offers "Gruppe", and the backend
only accepts `'group'` and persists nothing. Decision: remove the field
everywhere groups are created or edited (admin AND fansub-leader view, via the
capability-gated single edit surface), relabel "Country" → "Land", show
German status labels ("Aktiv"/"Inaktiv"/"Aufgelöst") instead of raw
active/inactive/dissolved values, keep backward compatibility (an old client
still sending `group_type` must not get a 400), add logic-only tests, and
sweep the same forms for other obviously-English labels.

### What was found

- **Scope confirmation via grep + live DB check:** `database/migrations/0102_drop_collaboration_schema.up.sql`
  does `ALTER TABLE fansub_groups DROP COLUMN IF EXISTS group_type` (Phase 81,
  D-02) and `\d fansub_groups` against the live `team4s_v2` database confirmed
  no `group_type`/`type` column exists today. The backend had nonetheless kept
  carrying a literal `'group' AS group_type` SQL alias through 7 SELECT
  statements across `fansub_repository_groups.go` (6x) and
  `fansub_repository_public_profile.go` (1x), scanning it into
  `models.FansubGroup.GroupType` and re-serializing it in every single
  `FansubGroup` JSON response (`group_type: "group"`, always, for every
  group) — a derived constant carrying zero information, matching the user's
  "totes Erbe" framing exactly.
- **Single shared edit surface confirmed for admin + fansub-leader:**
  `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx` is the one
  component both roles render through (`page.tsx` → `FansubDetailsTab.tsx` →
  `FansubBasicInfoTab.tsx`, gated by `isPlatformAdmin`/`capabilities` props,
  not by a separate route) — there is no separate `/me/...` fansub-group
  master-data edit surface; `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`
  is project-scoped (anime project notes/timeline) and has zero overlap with
  name/slug/status/type/country fields. The Fansub-Anlegeseite
  (`/admin/fansubs/create`) is platform-admin-only (behind `PlatformAdminGate`,
  confirmed in Scope Addition 2's notes) — leaders cannot create groups, only
  edit their own, so the edit page is the only surface needing the
  dual-role check.
- **Backend special case found exactly as flagged:**
  `FansubRepository.UpdateGroup` had `if len(assignments) == 1 { if
  input.GroupType.Set { return r.GetGroupByID(ctx, id) } ... }` — a short-circuit
  that, when a patch body contained *only* `group_type` (now meaningless), skipped
  the `UPDATE` entirely and just re-read the row. Removed along with the field.
- **Narrow-role permission test coupling discovered during removal:**
  `requiredFansubGroupPatchActions` mapped `input.GroupType.Set` to the same
  `ActionFansubGroupEdit` permission as `status`, and a dedicated Phase-136
  test (`TestPhase136ForbiddenStatusAndGroupTypeReturn403`) asserted a
  co_leader got `403` for a `{"group_type":"group"}`-only PATCH body. Removing
  the field changes this specific case's outcome: since `group_type` is no
  longer a bindable struct field, that body unmarshals to an *empty* patch and
  is now correctly rejected with `400` ("mindestens ein feld ist erforderlich")
  by `hasAnyFansubGroupPatchField`'s guard *before* the permission loop even
  runs — not `403`. The obsolete sub-case was removed from the test (renamed
  `TestPhase136ForbiddenStatusReturn403`, "status" case kept) rather than
  patched to assert the new 400, since testing "does a now-nonexistent field
  reach the permission layer" no longer has anything to prove; the
  ignore-silently behavior itself is covered by two new tests in
  `fansub_test.go` instead.
- **No existing central status-label helper, found one planned location
  already in use:** `frontend/src/lib/fansub-labels.ts` already centralizes
  `getFansubMediaCategoryLabel`/`getFansubLinkTypeLabel` for this exact
  domain (Fansub-Gruppen) — the natural home for a new
  `getFansubStatusLabel`, rather than inventing a new file. A *local*
  `labelForFansubStatus` already existed in the edit page's
  `fansubEditFormatters.ts` (lowercase "aktiv"/"inaktiv"/"aufgelöst", used by
  both the Status `<Select>` options in `FansubBasicInfoTab.tsx` and the
  status badge in `FansubEditHeaderCard.tsx`) — the create page's Status
  `<Select>` had no label mapping at all and rendered the raw enum value
  (`active`/`inactive`/`dissolved`) as option text.
- **Sweep of the same two forms surfaced two more same-pattern raw-value
  leaks, not named by the user but directly adjacent:** both the create
  page's `AdminFansubCreateLinksSection.tsx` and the edit page's
  `FansubCommunityLinksList.tsx` render their community-link-type `<Select>`
  options as the raw `FansubGroupLinkType` value (`website`/`discord`/
  `twitter`/`github`/`irc`) even though `getFansubLinkTypeLabel` (German:
  Webseite/Discord/Twitter-X/GitHub/IRC) already existed in the same
  `fansub-labels.ts` file and was already used elsewhere for *display* of
  stored links — just never wired into these two option lists. Fixed as part
  of this sweep (Rule 1 — same bug class as the Status dropdown, ready-made
  fix, zero new code). The create page's "Media" section heading was also
  plain English; renamed to "Logo und Banner" to match the edit page's
  established heading for the identical logo/banner upload section.
- **Found and deliberately left alone (documented in `deferred-items.md`):**
  the Fansub-Verwaltung **list** page (`frontend/src/app/admin/fansubs/page.tsx`,
  a different component from the two Stammdaten-Formulare named by the user)
  has its own English-only `statusLabel()`/`statusFilterOptions`/
  `bulkStatusOptions` plus literal "Edit"/"Delete" button text in its mobile
  card menu. Same bug class, same ready-made fix available, but a different
  file with no other connection to this scope addition and its own separate
  native-`<select>`-vs-`@/components/ui` migration gap — fixing it would
  blur this scope addition's boundary. Logged as a recommended follow-up
  instead of fixed.
- **False-positive check confirmed:** `backend/internal/repository/episode_import_repository_fansub_helpers.go`
  uses `models.FansubGroupType`/`models.FansubGroupTypeGroup` as a purely
  internal, never-externally-settable marker (`upsertImportFansubGroup`'s
  last parameter is intentionally always `FansubGroupTypeGroup` and is
  `_`-ignored in the function body) documenting "imported groups are always
  type group, never collaboration" — this has no `json` tag, is never bound
  from a request, and was correctly left untouched per the user's own
  "falls danach ungenutzt entfernen" conditional (it is still used, so it
  stays). The backend Go type itself was kept; only its three
  request/response/DB-facing field usages were removed.

### What was changed

**Backend — group_type removed from request, validation, response, and DB
query layers; backward-compatible (no 400 for a legacy group_type):**
- `backend/internal/models/fansub.go`: removed `GroupType` from
  `FansubGroup` (response), `FansubGroupCreateInput`, and
  `FansubGroupPatchInput`. Kept the `FansubGroupType` type/`FansubGroupTypeGroup`
  constant (still used internally, see above) with an updated comment
  clarifying it is no longer request/response/DB-facing.
- `backend/internal/handlers/fansub_requests.go`: removed
  `GroupType *string \`json:"group_type"\`` from `fansubGroupCreateRequest`.
- `backend/internal/handlers/fansub_group_create_validation.go` and
  `fansub_group_patch_validation.go`: removed all group_type parsing/
  validation branches, replaced with a comment explaining the
  encoding/json-silently-ignores-unknown-fields backward-compat mechanism.
- `backend/internal/handlers/fansub_groups.go`:
  `requiredFansubGroupPatchActions` no longer checks `input.GroupType.Set`
  (status alone still maps to `ActionFansubGroupEdit`).
- `backend/internal/repository/fansub_repository_groups.go`: removed the
  `'group' AS group_type` SQL alias and `&item.GroupType` scan target from
  all 6 occurrences (`ListGroups`, `CreateGroup`, `GetGroupByID`,
  `GetGroupBySlug`, `UpdateGroup`, `scanFansubGroup`); removed the
  `if input.GroupType.Set { return r.GetGroupByID(ctx, id) }` short-circuit
  in `UpdateGroup`'s zero-fields guard.
- `backend/internal/repository/fansub_repository_public_profile.go`: same
  removal in `getPublicGroupBase`'s SELECT/Scan (the 7th occurrence).

**Contracts:**
- `shared/contracts/fansubs.yaml`: removed the `FansubGroupType` type and the
  `group_type` field from `FansubGroupCreateRequest`, `FansubGroupPatchRequest`,
  and `FansubGroup`.
- `shared/contracts/openapi.yaml`: removed the `FansubGroupType` schema
  (whose enum `[group, collaboration]` was itself already stale/drifted from
  `fansubs.yaml`'s `[group]`-only definition — further evidence of dead
  documentation), the `group_type` property + `required` entry from the
  `FansubGroup` schema, and the `group_type` property from
  `FansubGroupCreateRequest`/`FansubGroupPatchRequest`.

**Frontend — field removed from both forms, Land/Status/link-type labels
eindeutscht:**
- `frontend/src/types/fansub.ts`: removed the `FansubGroupType` type and the
  `group_type` field from `FansubGroupCreateRequest`/`FansubGroupPatchRequest`.
- `frontend/src/lib/fansub-labels.ts`: added `FANSUB_STATUS_LABELS` +
  `getFansubStatusLabel(status: FansubStatus): string` — the single new
  central status-label helper, alongside the existing media-category/
  link-type label helpers in the same file.
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormatters.ts`:
  `labelForFansubStatus` now delegates to `getFansubStatusLabel` instead of
  its own local lowercase `STATUS_LABELS` map — output changes from
  lowercase ("aktiv") to capitalized ("Aktiv") everywhere it's already used
  (`FansubBasicInfoTab.tsx`'s Status `<Select>` options and
  `FansubEditHeaderCard.tsx`'s status badge), matching the user's requested
  casing. No call-site changes needed since the function signature/name is
  unchanged.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`: removed
  the entire "Gruppentyp" field block (label + `<Select>` with its single
  "Fansubgruppe" option). The Status `<Select>` already called
  `labelForFansubStatus(s)` for option text (now capitalized via the shared
  helper) — no change needed there beyond the field removal.
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts`: removed
  `groupType: FansubGroupType` from `FormState` and the now-unused
  `FansubGroupType` import.
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts`:
  removed `groupType: "group"` from `mapGroupToForm`/`emptyForm` and
  `payload.group_type = form.groupType` from `formToPayload`.
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`:
  removed the "Typ" field block entirely; "Country" label → "Land"; Status
  `<Select>` options now render `getFansubStatusLabel(option)` instead of
  the raw value; section heading "Basic Information" → "Grunddaten" (matching
  the edit page's existing tab-navigation term for the same section, found
  via `ReadinessTab.tsx`'s `'In Grunddaten ergänzen'` hint).
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts`:
  removed `groupType: FansubGroupType` from `FormState`, the now-unused
  `FansubGroupType` import, `groupType: "group"` from `mapGroupToForm`/
  `emptyForm`, and `group_type: form.groupType` from both
  `formToCreatePayload` and `formToPatchPayload`.
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx`
  and `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx`:
  community-link-type `<Select>` options now render
  `getFansubLinkTypeLabel(option)` instead of the raw `website`/`discord`/
  `twitter`/`github`/`irc` value (sweep finding, same bug class as Status).
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx`:
  section heading "Media" → "Logo und Banner" (sweep finding, matches the
  edit page's heading for the identical section).
- `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx`: updated a
  comment referencing the now-removed `FansubGroupType` (no behavior change,
  the component never used the type itself — only its own narrow
  `ReadinessGroupProps` interface, which never had a type field).

### Tests added (logic only, no render/click tests, per explicit instruction)

- `backend/internal/handlers/fansub_test.go`: replaced
  `TestValidateFansubGroupCreateRequest_InvalidGroupType` and the two
  `TestValidateFansubGroupPatchRequest_*GroupType*` tests (which tested
  validation rules for a field that no longer exists) with
  `TestValidateFansubGroupCreateRequest_IgnoresLegacyGroupType` (raw JSON with
  `group_type` unmarshals and validates cleanly, no 400) and two patch-side
  equivalents: `TestValidateFansubGroupPatchRequest_IgnoresLegacyGroupType`
  (group_type-only body → the normal "mindestens ein feld" message, not a
  group_type-specific error) and
  `..._IgnoresLegacyGroupTypeAlongsideRealField` (group_type sent together
  with a real field like `name` doesn't block that field's own validation).
  `TestValidateFansubGroupCreateRequest` itself was kept but stripped of its
  now-impossible `GroupType: &groupType` struct-literal field.
- `backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go`:
  removed the `groupType := requiredFansubGroupPatchActions(...)` assertion
  from `TestPhase136NarrowRoleDefaultsLifecyclePatchActions` (field no longer
  exists) and renamed/narrowed `TestPhase136ForbiddenStatusAndGroupTypeReturn403`
  to `TestPhase136ForbiddenStatusReturn403` (status-only case kept; see "What
  was found" above for why the group_type case's expected outcome changed
  from 403 to 400 and is now covered elsewhere instead of patched in place).
- `frontend/src/lib/__tests__/fansub-labels.test.ts`: added a
  `getFansubStatusLabel` describe block asserting all three German labels
  ("Aktiv"/"Inaktiv"/"Aufgelöst") for all three `FansubStatus` values.
- Existing render tests referencing the removed field/labels were updated
  (not added) to match the new UI, per the plan's own "update, don't
  re-test" boundary: `FansubBasicInfoTab.test.tsx` (3 `getByLabelText('Gruppentyp')`
  assertions removed from 3 existing test cases — the field no longer
  renders), `create/page.test.tsx` (`getLabeledInput(container, "Country")` →
  `"Land"`, and `group_type: "group"` removed from one payload-equality
  assertion).

### Verification performed

- `docker exec team4sv30-backend go build ./...` and `go vet ./...` — clean.
- `docker exec team4sv30-backend go test ./internal/handlers/... -run
  'TestValidateFansubGroupCreateRequest|TestValidateFansubGroupPatchRequest|TestPhase136'`
  — all PASS, including both new "IgnoresLegacyGroupType" tests and the
  renamed `TestPhase136ForbiddenStatusReturn403`.
- `docker exec team4sv30-backend go test ./internal/handlers/...` (full
  package) — only the 3 pre-existing jellyfin-fixture failures already
  logged under 176-05/Scope-Addition-1 (confirmed via grep: zero mentions of
  `fansub`/`group_type`/`Gruppentyp` in the failure output).
- `docker exec team4sv30-backend go test ./internal/repository/...` (full
  package) — only pre-existing live-Keycloak/external-host/capability-registry
  failures already logged under 176-12/176-13/Scope-Addition-1 (confirmed via
  grep: zero mentions of `fansub`/`group_type`/`kuerzel`).
- `docker exec team4sv30-backend go test ./internal/migrations/... -run
  TestPhase81` — both PASS (migration-file-content tests unaffected, migration
  0102 itself was not touched).
- `docker exec team4sv30-frontend npx tsc --noEmit` — clean.
- `docker exec team4sv30-frontend npx eslint` on every touched/created
  frontend file — clean.
- `docker exec team4sv30-frontend npx vitest run` (full suite, run twice —
  once after the core field-removal pass, once after the link-type-label
  sweep fixes): first run — 364 test files passed, 1 pre-existing skip, 3257
  tests passed. Second run — 1 unrelated flaky failure
  (`src/app/members/[slug]/not-found.test.tsx`, a `waitFor` timeout on an
  unrelated member-profile page); re-ran that single file immediately after
  in isolation and both its tests passed cleanly. A full follow-up run
  scoped to every fansub-related test file (`src/app/admin/fansubs/**`,
  `src/lib/fansub-labels*`, `src/lib/api.auth-refresh.test.ts`,
  `src/components/fansubs/**`) confirmed 75 files / 607 tests all green.
- Live DB check: `\d fansub_groups` against the real `team4s_v2` database —
  no `group_type`/`type` column exists (confirms the "DB-Spalte bereits
  entfernt" premise before touching any backend code).
- Backend rebuilt: `docker compose up -d --build team4sv30-backend` →
  `/health` returns `{"status":"ok"}`.
- Frontend restarted: `docker restart team4sv30-frontend` →
  `http://192.168.235.196:3000/admin/fansubs/create`,
  `/admin/fansubs/1/edit`, and `/admin/fansubs` all return 200; backend/
  frontend container logs show clean `200`-only request traffic for these
  routes against the real group id 1, no errors.

### Files changed

- `backend/internal/models/fansub.go`
- `backend/internal/handlers/fansub_requests.go`
- `backend/internal/handlers/fansub_group_create_validation.go`
- `backend/internal/handlers/fansub_group_patch_validation.go`
- `backend/internal/handlers/fansub_groups.go`
- `backend/internal/handlers/fansub_test.go`
- `backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go`
- `backend/internal/repository/fansub_repository_groups.go`
- `backend/internal/repository/fansub_repository_public_profile.go`
- `shared/contracts/fansubs.yaml`
- `shared/contracts/openapi.yaml`
- `frontend/src/types/fansub.ts`
- `frontend/src/lib/fansub-labels.ts`
- `frontend/src/lib/__tests__/fansub-labels.test.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditTypes.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormatters.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` (test-fixture
  cleanup only, `group_type: 'group'` removed from a mock `FansubGroup`-shaped
  object — the field was never part of the `FansubGroup` type)
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` (test-fixture
  cleanup, same as above, across 3 mock responses)
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx`
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx`
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts`
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts`
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts`
  (test-fixture cleanup only)
- `frontend/src/app/admin/fansubs/create/page.test.tsx`
- `frontend/src/app/admin/fansubs/page.test.tsx` (test-fixture cleanup only)
- `frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx`
  (test-fixture cleanup only)
- `frontend/src/lib/api.auth-refresh.test.ts` (test call-site/fixture cleanup
  — `createFansubGroup(...)` calls could no longer pass `group_type` once the
  TS request type dropped the field)

`.planning/sketches/` was not touched.

### Deferred (not fixed, logged in `deferred-items.md` under "Scope Addition 3")

- The Fansub-Verwaltung list page (`frontend/src/app/admin/fansubs/page.tsx`)
  has the same raw-English-status-value bug (plus literal "Edit"/"Delete"
  button text) but is a different component from the two forms named in this
  scope addition's instructions — logged as a recommended small follow-up
  rather than fixed, to keep this scope addition's diff bounded to the named
  surfaces.

### Recommended live-UAT additions for the phase's final checkpoint (176-15)

Add to the 176 closing UAT:
1. **As platform admin**, open `/admin/fansubs/create`: confirm there is no
   "Typ"/Gruppentyp field anywhere on the page, the country field is labeled
   "Land" (not "Country"), the Status dropdown shows "Aktiv"/"Inaktiv"/
   "Aufgelöst" (not raw `active`/`inactive`/`dissolved`), and the community-
   link-type dropdown shows German labels ("Webseite"/"Discord"/"Twitter/X"/
   "GitHub"/"IRC") instead of the raw English values. Create a group and
   confirm the save succeeds (no 400).
2. **As platform admin**, open an existing group's `/admin/fansubs/{id}/edit`
   (Grunddaten tab): confirm the same three things (no Gruppentyp field,
   "Land" label, German status labels) plus the German community-link-type
   labels in that page's link rows. Edit the name and save; confirm the save
   succeeds.
3. **As a fansub leader** (a user with `can_edit_group`/`can_edit_group_general`
   capabilities but not platform-admin), open the same group's edit page:
   confirm the Gruppentyp field is absent there too (it was gated the same
   way as other fields, not hidden only from admins), "Land" label is shown,
   and the Status dropdown (if visible to this role) shows German labels.
   Leaders cannot reach the Create page at all (platform-admin-only) — no
   check needed there for this role.
4. No backend call/curl is needed for any of the above — all four are pure
   UI confirmations layered on top of this scope addition's own automated
   backend tests proving the backward-compatibility (`group_type` silently
   ignored, no 400) and label-helper behavior.

## Scope Addition 4: Doppelte Alias-Fläche entfernen

**User report (2026-10-08, verbatim decision):** On `/admin/fansubs/[id]/edit?tab=basic`
the aliases appeared twice: (1) an "ALIASE" field with its own "Hinzufügen" button and
chip row inside the Grunddaten form (`FansubBasicInfoTab.tsx`), and (2) the
"Aliase dieser Gruppe" section below it (`FansubAliasSection.tsx`, a full table with
Alias/Erstellt am/Aktionen and "Umhängen…"/"Alias hinzufügen"). Decision: keep only
the lower `FansubAliasSection`; remove the Grunddaten alias field together with any
form-state/handlers/payload keys that exist solely for it, for all role views
(platform-admin and fansub-leader). The Anlegeseite (`/admin/fansubs/create`) keeps its
own alias field untouched (no group/table exists yet there; its "Tags"→"Aliase"
relabeling was already handled in Scope Addition 2 — not touched again here).

### What was found

- **Confirmed fully independent, non-overlapping alias surfaces.** The duplicate
  field's state/handlers (`aliases`, `aliasInput`, `setAliasInput`, `aliasError`,
  `setAliasError`, `aliasBusy`, `addAlias`, `removeAlias`, plus the loader callback
  `setAliasesFromLoad`) all lived in `useFansubDetailsForm.ts` and were consumed
  **only** by `FansubBasicInfoTab.tsx` and the group-load hook that fed it. A repo-wide
  grep (`frontend/src --include=*.tsx --include=*.ts`) confirmed zero other consumers.
  `FansubAliasSection.tsx` — the surviving section — has its own completely separate
  state (`aliases`, `newAliasText`, `reassignTargetByAliasID`, …) and its own direct API
  calls (`getFansubAliases`, `createFansubAlias`, `deleteFansubAlias`,
  `reassignFansubAlias`), so none of the hook plumbing feeding the duplicate field was
  needed by the surviving UI. Safe to delete entirely rather than just hiding the render.
- **Found an extra, previously invisible redundant network call as part of tracing the
  dead state's producer side.** `hooks/useFansubEditGroupLoad.ts` ran
  `Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID)])` on every page
  load purely to populate the now-removed chip UI via `setAliasesFromLoad` — a second,
  independent `getFansubAliases` call that `FansubAliasSection` was already making on
  its own in its own `useEffect`. This was a genuine duplicate backend round-trip on
  every edit-page load, not just duplicate UI; removing the dead state let this second
  call be dropped too (Rule 1/3 — direct, necessary consequence of deleting the dead
  consumer, not a speculative optimization).
- **Verified the Grunddaten save payload never carried aliases at all** — read
  `formToPayload` in `fansubEditFormMapping.ts` and the `FansubGroupPatchRequest` type
  in `types/fansub.ts` end to end: neither has ever had an `aliases` key. The main
  group PATCH endpoint has never been an alias-persistence path; `FansubAliasSection`'s
  own direct `createFansubAlias`/`deleteFansubAlias`/`reassignFansubAlias` calls are and
  always were the only persistence path for aliases. **No dead payload key existed to
  remove** — the user's "verify, don't assume" instruction on this point resolved to "no
  change needed here," confirmed by reading both paths rather than inferring from naming.
- **Confirmed no role-specific gating gap.** `FansubDetailsTab.tsx` renders
  `FansubAliasSection` unconditionally whenever `activeMainTab === "basic"` (same
  condition as `FansubBasicInfoTab` itself), for both platform-admin and fansub-leader
  capability views — there is no separate per-role surface to also clean up.
- **Found and fixed a stale test exercising the exact UI being removed.**
  `page.test.tsx`'s `'renders aliases as global badge text with a separate remove
  action'` test asserted on `aria-label="Alias AO entfernen"` — the remove button from
  the duplicate chip row being deleted. Updated (not deleted) to assert against
  `FansubAliasSection`'s own equivalent affordance (`aria-label="Alias AO löschen"`),
  to confirm the duplicate field's label (`getByLabelText('Aliase')`) no longer renders,
  and to wait on the table's async load (`findAllByText` instead of `getAllByText`,
  since removing the second `getFansubAliases` call means "AO" now only appears once
  `FansubAliasSection`'s own async load resolves, not synchronously from `applyGroup`).

### What was changed

**Frontend only — no backend/contract changes were needed or made:**
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`: removed the entire
  "Aliase" `FormField` + `Input`/"Hinzufügen"-`Button` + chip row block (the
  `FansubEditBasicFieldWide` div directly after the Gründungsjahr/Auflösungsjahr fields,
  right before the `Card`'s closing tag). Removed the now-unused `aliases`, `aliasInput`,
  `setAliasInput`, `aliasError`, `setAliasError`, `aliasBusy`, `addAlias`, `removeAlias`
  destructuring from `details`. Removed the now-unused `Badge`/`FormField` imports from
  `@/components/ui` and the now-unused `X` import from `lucide-react` (`Plus` is still
  used by the surviving "Link hinzufügen" button, kept).
- `frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts`: removed the
  `aliases`/`aliasInput`/`aliasError`/`aliasBusy` state, the `setAliasesFromLoad`,
  `addAlias`, and `removeAlias` callbacks, their entries in the hook's return object, and
  the now-unused `createFansubAlias`/`deleteFansubAlias` imports from `@/lib/api` and the
  `FansubAlias` type import.
- `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditGroupLoad.ts`: removed the
  `setAliasesFromLoad` parameter and the parallel `getFansubAliases(fansubID)` call —
  the hook now only fetches `getFansubByID(fansubID)` (the redundant-network-call fix
  described above).
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx`: stopped destructuring
  `setAliasesFromLoad` from `details` and stopped passing it into
  `useFansubEditGroupLoad`.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`: removed the four now-
  dead CSS classes that existed solely for the removed chip UI
  (`.fansubEditAliasBadgeRow`, `.fansubEditAliasBadgeBox`, `.fansubEditAliasBadgeItem`,
  `.fansubEditAliasControls` including its `@media (max-width: 640px)` override) —
  confirmed via grep that none of these classes were referenced anywhere else in the
  directory before removal.
- `frontend/src/app/admin/fansubs/create/` and `FansubAliasSection.tsx`/
  `FansubAliasSection.test.tsx`: untouched, per instruction.

### Tests updated (no new render/click tests added, per explicit instruction)

- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx`: removed the
  now-nonexistent `aliases`/`aliasInput`/`aliasError`/`aliasBusy`/`addAlias`/
  `removeAlias` fields from the shared `details` test fixture object (no assertions
  referenced them, so no test cases were removed — only fixture cleanup).
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.test.tsx`: removed the now-
  nonexistent `setAliasesFromLoad: vi.fn()` entry from the mocked
  `useFansubDetailsForm` return value (fixture cleanup only).
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`: updated (not added) the one
  test exercising the duplicate field's remove button, per "What was found" above —
  renamed to `'renders aliases only via the sole FansubAliasSection table (no duplicate
  Grunddaten alias field)'`, now asserting the surviving table's own delete-button label,
  the absence of the old field's label and remove-button label, and correctly awaiting
  the table's async alias load.

### Verification performed

- `docker exec team4sv30-frontend npx tsc --noEmit` — clean.
- `docker exec team4sv30-frontend npx eslint` on every touched file (`FansubBasicInfoTab.tsx`,
  `FansubBasicInfoTab.test.tsx`, `useFansubDetailsForm.ts`, `hooks/useFansubEditGroupLoad.ts`,
  `FansubEditClient.tsx`, `FansubEditClient.test.tsx`, `page.test.tsx`) — clean.
- `docker exec team4sv30-frontend npx vitest run src/app/admin/fansubs` — 44 test files
  passed, 353 tests passed (first run surfaced the `getAllByText`/`findAllByText` timing
  issue described above from dropping the redundant `getFansubAliases` call; fixed, then
  this run was clean).
- `docker exec team4sv30-frontend npx vitest run` (full suite) — **364 test files
  passed, 1 pre-existing skip, 3257 tests passed, 3 pre-existing todos** — no regressions
  outside the fansub-edit area touched by this scope addition.
- No backend code was touched, so no backend rebuild was required. Frontend restarted:
  `docker restart team4sv30-frontend` → `http://192.168.235.196:3000/admin/fansubs/1/edit`
  and `http://192.168.235.196:3000/admin/fansubs/create` both return 200.
- Confirmed via grep that no remaining references to the removed hook fields
  (`aliasBusy`, `aliasInput`, `aliasError`, `setAliasesFromLoad`) or the removed CSS
  classes exist anywhere under `frontend/src/app/admin/fansubs/`.

### Files changed

- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditGroupLoad.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.test.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`

`.planning/sketches/` was not touched.

### Recommended live-UAT additions for the phase's final checkpoint (176-15)

Add to the 176 closing UAT:
1. **As platform admin**, open `/admin/fansubs/{id}/edit` (Grunddaten tab): confirm the
   "ALIASE" field with its own "Hinzufügen" button/chips is gone from the Grunddaten
   card, and that exactly one alias surface remains — the "Aliase dieser Gruppe" table
   below it (Alias/Erstellt am/Aktionen, "Umhängen…"/"Alias hinzufügen"). Add a new
   alias via that table's "Alias hinzufügen" button and confirm it appears in the table.
2. **As a fansub leader** (capability-gated, non-platform-admin), open the same group's
   edit page: confirm the same thing — only the lower alias table is present, no
   duplicate field anywhere in Grunddaten.
3. Confirm saving the Grunddaten form (e.g. editing the name and clicking "Speichern")
   still succeeds with no errors, confirming the save payload change (none needed, none
   made) didn't break anything.
4. Confirm `/admin/fansubs/create` is unaffected — its own "Aliase" field (from Scope
   Addition 2) still works exactly as before, since this scope addition did not touch
   the create page.
5. No backend call/curl is needed for any of the above — this scope addition's changes
   are frontend-only and are already covered by the full passing vitest suite.

## Scope Addition 5: Release-Karten-CSS-Konflikt beheben

**User report (2026-10-08, verbatim decision):** On `/admin/fansubs/[id]/edit?tab=releases`
(desktop and narrow), the "Notizen & Bilder öffnen" button in every release card header lay
on top of the text and covered "New-Subs · Versionen: 1" / "N Personen". Live measurement:
`.fansubEditReleaseHeaderActions` had width 0 and its `nowrap` button overflowed. User's
hypothesis: two conflicting `.fansubEditReleaseCardHeader` rules in `FansubEdit.module.css`
— a newer one (`grid-template-columns: minmax(0,1fr) auto`) and an older one further below
that overrides it (`display:grid; grid-template-columns: auto minmax(0,1fr) auto auto;` plus
button-like background/cursor/padding). Decision: clean up/merge so the header becomes
content + a trailing action column, preserve the narrow-viewport (<=760px) stacking, verify
whether the old rule is still needed before deleting it, and sweep the same file for other
duplicate selectors.

### What was found

- **Re-grepped the file fresh** (4 prior agents in this session had already edited it,
  so none of the prompt's line numbers were trusted). Confirmed exactly 4 physical
  occurrences of `.fansubEditReleaseCardHeader`: a correct base rule (then at line 984:
  `grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; align-items: center;`), its
  own `@media (max-width: 760px)` override directly below it (then line 1017: stacks to
  `1fr`), an old orphaned base rule further down (then line 1638: `display:grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto; ... min-height:56px; border:0;
  background: color-mix(...); cursor:pointer; padding:0.75rem; text-align:left;`), and that
  old rule's own `@media (max-width: 760px)` override (then line 1865: `grid-template-
  columns: auto minmax(0,1fr) auto; grid-template-areas: "badge title disclosure" "chips
  chips chips";`).
- **Cross-referenced against the real JSX** (`ReleaseRowDetails.tsx:140-209`): the actual
  DOM for a release card header is `<div class="fansubEditReleaseCardHeader">` with exactly
  two direct children — `<button class="fansubEditReleaseCardToggle">` (containing the
  episode badge, title, meta, and disclosure chevron as its own nested spans) and
  `<div class="fansubEditReleaseHeaderActions">` (the "Notizen & Medien öffnen"/version-tools
  button). This matches the **new** rule's 2-column content+action-column model exactly.
  The **old** rule's 4-column model plus baked-in `cursor:pointer`/`background`/`padding`
  only makes sense if the header `<div>` itself were the clickable element with badge/title/
  disclosure as its own direct children — a structure that predates
  `.fansubEditReleaseCardToggle` being split out as its own nested button. Confirmed the
  old rule is the dead one: because it is later in the file, its conflicting
  `grid-template-columns` (and the old `@media` block's `grid-template-areas`) won the
  cascade over the correct rule for the one property that actually caused the bug —
  collapsing `.fansubEditReleaseHeaderActions` into an unused 4th auto-sized grid track,
  reproducing the user's exact "width 0, button overflows" measurement at both desktop and
  narrow width (the narrow bug exists because the old rule has its *own* `@media
  (max-width: 760px)` override that also comes later than the correct one's, so it wins at
  narrow width too).
- **Checked whether the old rule was needed by anything else before deleting it:** grepped
  all `.tsx` files under `frontend/src/app/admin/fansubs/[id]/edit/` for
  `fansubEditReleaseCardHeader` — only one consumer exists (`ReleaseRowDetails.tsx`'s single
  release-card header div), and it already matches the new rule's shape. No other card
  variant or toggle depends on the old rule's 4-column/button-styled-header structure.
  Safe to delete entirely, not rename+keep.
- **Full duplicate-selector sweep of the whole file** (3341 lines): counted every top-level
  selector occurrence and manually inspected every selector appearing 3+ times, plus spot-
  checked the 2x ones that weren't an obvious base+single-media-query pair. Findings:
  - `.fansubEditReleaseCardHeader` (4x) — the conflict above; fixed.
  - `.fansubEditReleaseEpisodeBadge`, `.fansubEditReleaseCardTitle`,
    `.fansubEditReleaseCardDisclosure` (3x each) — one real, non-conflicting base style
    definition each (colors/sizing for the badge/title/disclosure spans, still rendered by
    the current JSX inside `.fansubEditReleaseCardToggle`), plus one correct `grid-area`
    assignment in the *kept* narrow media block and one now-removed duplicate `grid-area`
    assignment that lived inside the *deleted* old media block (identical value, purely
    redundant — removed along with the rest of the dead block, no behavior change).
  - `.fansubEditReleaseCardChips` (3x: one base style rule + two `grid-area: chips`
    assignments) — confirmed via repo-wide grep that this class is **never referenced in
    any `.tsx` file**, anywhere in `frontend/src`. It is fully dead/unused CSS, but it is a
    single non-conflicting definition (not a cascade conflict causing a visible bug), so
    deleting it is a separate, lower-value cleanup rather than part of this fix. Left in
    place and logged below as a deferred finding rather than removed, to keep this fix's
    diff scoped to the reported overlap bug and its directly-entangled dead duplicates.
  - `.fansubEditReleaseRow` (4x: two non-overlapping base-property blocks — layout props
    then interaction props — plus two legitimate breakpoint overrides at
    `min-width:900px` and `max-width:720px`) — no conflicting properties between the two
    base blocks; stylistically unusual (same selector declared twice at the same cascade
    level with no media wrapper) but not a bug. Logged as a minor/cosmetic deferred finding.
  - `.fansubEditThemeUploadActions`, `.fansubEditSectionSummary`, `.fansubEditMainTabRow`,
    `.fansubEditReleaseCardList` (3x each) — all are one base rule plus legitimate,
    non-overlapping breakpoint overrides at different/complementary media queries (e.g.
    `.fansubEditSectionSummary` has disjoint `max-width` vs `min-width:901px` blocks;
    `.fansubEditReleaseCardList` has disjoint `max-width:760px` vs
    `min-width:761px/max-width:1180px` blocks). No conflicts, no action needed.
  - All remaining 2x selectors checked were a single base rule plus a single media-query
    override — the normal, expected pattern, not a conflict.

### What was changed

**Frontend only — pure CSS, no logic/behavior change:**
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`: deleted the orphaned
  old `.fansubEditReleaseCardHeader` base rule (4-column grid with baked-in button styling)
  and, from within its `@media (max-width: 760px)` block, deleted the old rule's
  `grid-template-areas` override plus its four now-pointless duplicate `grid-area`
  single-line assignments for `.fansubEditReleaseEpisodeBadge`/`.fansubEditReleaseCardTitle`/
  `.fansubEditReleaseCardChips`/`.fansubEditReleaseCardDisclosure` (identical values to the
  ones already correctly declared in the kept, earlier media block — removing them changes
  nothing visually, just removes dead duplication). Deliberately preserved the three
  unrelated sibling rules that shared the same `@media (max-width: 760px)` block
  (`.fansubEditReleaseCardList`, `.fansubEditReleaseCardActions`,
  `.fansubEditReleaseThemeList`) — all three are still used by the current JSX and were
  not part of the conflict.
- Net result: `.fansubEditReleaseCardHeader` now has exactly one base rule
  (`grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; align-items: center;`) and one
  narrow-viewport override (`grid-template-columns: 1fr; align-items: stretch;`) — header =
  content (toggle button, `minmax(0,1fr)`) + action column (`auto`) at desktop/tablet width,
  full-width stacking at <=760px, exactly matching the two real DOM children.
- 35 lines removed, 0 lines added. No other files touched.

### Verification performed

- Re-grepped `.fansubEditReleaseCardHeader` post-edit: exactly 2 occurrences remain (base +
  its own narrow-viewport override), both belonging to the correct/kept rule.
- Verified brace balance across the whole 3341-line file with a small Node script (open/close
  count matches, zero premature closes) — confirmed no stray `{`/`}` introduced by the edit.
- Confirmed the three sibling rules sharing the deleted-from media block
  (`.fansubEditReleaseCardList`, `.fansubEditReleaseCardActions`,
  `.fansubEditReleaseThemeList`) survived intact and unchanged.
- `docker exec team4sv30-frontend npx vitest run src/app/admin/fansubs` — 44 test files
  passed, 353 tests passed (expected: pure CSS change, no test file touched).
- `docker exec team4sv30-frontend npx tsc --noEmit` — clean.
- Backend untouched, no rebuild needed. Frontend restarted: `docker restart
  team4sv30-frontend` → compiled cleanly, `curl http://192.168.235.196:3000/admin/fansubs/1/edit?tab=releases`
  returns 200, container logs show a clean 200 render with no errors.
- **Live-verified the actual served CSS, not just the source file:** fetched the compiled
  `/_next/static/css/app/admin/fansubs/%5Bid%5D/edit/page.css` bundle from the running dev
  server and extracted every rule for the hashed class
  `FansubEdit_fansubEditReleaseCardHeader__E_kLG` — confirmed only two rules exist in the
  bytes actually sent to the browser: `{ grid-template-columns: minmax(0, 1fr) auto; gap:
  0.75rem; align-items: center; }` (base) and `{ grid-template-columns: 1fr; align-items:
  stretch; }` (narrow-viewport). The old 4-column/button-styled rule is completely absent
  from the live bundle.

### Files changed

- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`

`.planning/sketches/` was not touched.

### Deferred (not fixed, logged for a future pass — low-risk, out of this fix's scope)

- `.fansubEditReleaseCardChips` (base rule + 2 `grid-area` assignments) is fully dead/unused
  CSS — confirmed via repo-wide grep that no `.tsx` file anywhere references this class.
  Not a cascade conflict (single consistent definition, no bug), so left in place to keep
  this fix's diff scoped to the reported overlap bug.
- `.fansubEditReleaseRow` is declared as two separate non-conflicting base-level blocks
  (layout properties, then interaction properties) with no media-query wrapper between them
  — stylistically redundant but not a bug (no overlapping properties, no visual effect).
  Could be merged into one block in a future cleanup pass.

### Recommended live-UAT additions for the phase's final checkpoint (176-15)

Add to the 176 closing UAT:
1. Open `/admin/fansubs/{id}/edit?tab=releases` at desktop width: confirm the "Notizen &
   Medien öffnen" (or version-tools) button sits to the right of each release card's text,
   not overlapping "New-Subs · Versionen: N" / "N Personen" / theme-status text.
2. Resize the browser to <=760px (or use device emulation): confirm each release card's
   header stacks to full width (episode badge/title/chevron on top, the action button
   below, full-width) with no overlap at any point during the resize.
3. Confirm the episode-expand toggle (clicking the badge/title area) still expands/collapses
   the release card's segment/theme details exactly as before — this fix only touched
   layout CSS on the header container, not the toggle button's own click handler.
4. No backend call is needed for any of the above — this is a pure CSS fix, verified via
   the live compiled CSS bundle and a full passing frontend test run (no render tests
   needed new changes).

**This is the 5th and final scope addition for Phase 176's pre-176-15 batch.** All five
user-authorized scope additions (Rollen-Picker assignable-Filter, Kürzel-Feld +
Aliase-Umbenennung, Gruppentyp entfernen + Land/Status eindeutschen, Doppelte
Alias-Fläche entfernen, Release-Karten-CSS-Konflikt) are now complete and committed.
176-15's Prüfkette gate can proceed, incorporating all five "Recommended live-UAT
additions" sections above into its closing UAT pass.
