# Deferred Items (176-02)

Pre-existing, out-of-scope test failures observed while running the full frontend
`npx vitest run` suite during 176-02 execution. None of these touch files modified by
this plan (`frontend/src/types/admin.ts`, `SegmenteTab.helpers.tsx`,
`SegmentsListSection.tsx`, `SegmenteTab.test.tsx`, and 3 sibling `*.test.tsx`/`*.test.ts`
files adding `theme_type_kuerzel` to their local `AdminThemeSegment` test fixtures).
Logged per the Scope Boundary rule rather than fixed.

1. `src/lib/cssCustomProperties.guard.test.ts` -- 2 failing assertions: a dead
   `--surface-muted` CSS custom-property reference detected in
   `lib/roleCatalog.accessibility.test.ts:275` (no fallback), and the
   known-non-CSS-textual-mentions allow-list size check that depends on it.
2. `src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx` -- "dokumentiert
   die produktive Release-Listenkarte mit Kara- und Leer-Timeline": cannot find an
   accessible link named "Release öffnen" in the showcase fixture.
3. `src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` -- 2
   failing cases under "EpisodeGroup (GAP-13)" about header/row filename duplication.
4. `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`
   -- "renders roles, notes and media without a second release history": expects text
   "Vollständiges Memberprofil" but the rendered aria-label now reads "Vollständiges
   Fansubberprofil".

None of these relate to `theme_types.kuerzel`, segment badge derivation, or the deleted
`segmenteTabUtils.ts`. Not fixed as part of 176-02.

## 176-05

Pre-existing, out-of-scope failures observed while running `go test ./internal/handlers/...`
during 176-05 execution. None touch files modified by this plan
(`member_claim_invitations_handler.go`/`_test.go`, `fansub_group_members.go`,
`admin_routes.go`, `memorial_guard.go`, `member_claims_submit_repository.go`,
`member_claim_invitations_repository.go`). Logged per the Scope Boundary rule rather
than fixed.

1. `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`,
   `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
   `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` -- all fail with
   `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no such
   file or directory` / `11eyes-episode1.json`. Missing fixture files in a docs/audits
   directory, unrelated to member-claim-invitation or fansub-member code.
2. `TestPhase136ContractParity/group_capability_response`,
   `TestPublicMemberProfileMatchesOpenAPIAllowList`,
   `TestPublicBadgeNextTierEnumParity` -- all fail with
   `yaml: unmarshal errors: line 2205: mapping key "description" already defined at line
   2167` while parsing `shared/contracts/openapi.yaml`. A pre-existing duplicate-key bug
   in the shared OpenAPI contract file, unrelated to this plan's backend-only scope.

Also observed in `internal/repository`: `TestClaimSubmitBlockedForMemorialProfile` was
already failing before this plan touched any file -- it reads
`member_claims_repository.go` for memorial-guard fragments, but the guarded code has
lived in `member_claims_submit_repository.go` since an earlier phase split that file out.
The stale filename reference is a pre-existing bug unrelated to the D-21 extraction done
in 176-05 Task 3 (see `176-05-SUMMARY.md` for how the sibling invitations-path fragment
tests were replaced with real behavior tests on the new shared `checkMemorialNotClaimable`
helper instead of being left broken by the extraction).

Same stale-filename root cause also makes `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
(`member_claims_repository_test.go`) fail with `Should not be: -1` -- it looks for
`func (r *MemberClaimsRepository) SubmitClaim` inside `member_claims_repository.go`,
which has lived in `member_claims_submit_repository.go` since commit `8bd28db6`
("refactor(143-02): split member_claims_repository.go by responsibility"), long before
176-05. Confirmed pre-existing and unrelated to the memorial-guard extraction (the
`member_already_assigned` / `claim_status = 'verified'` logic this test targets was not
touched by Task 3). Not fixed, per Scope Boundary.

## 176-12

Pre-existing, out-of-scope failure observed while running `go test ./internal/services/...`
during 176-12 execution. Does not touch any file modified by this plan
(`release_version_media_cleanup_test.go`, `segment_validation_test.go`,
`admin_content_theme_asset_locks_test.go`, `segment_playback_resolution_test.go`).

1. `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes`
   (`effective_rights_concurrency_test.go`) fails even run in isolation with
   `permission cache: Action "release_version_media.reorder" fehlt in role_capabilities
   und ist keine standalone-Action — Startup abgebrochen`. A pre-existing permission
   capability-registry gap (the `release_version_media.reorder` action is missing from
   `role_capabilities`), unrelated to this plan's D-09 test-style remediation. Confirmed
   unrelated via `git log` on the test file (last touched in unrelated commits `824e29b4`/
   `96185b9b`, long before 176). Not fixed, per Scope Boundary.

## 176-13

Pre-existing, out-of-scope failures observed while running
`go test ./internal/handlers/... ./internal/services/...` during 176-13 execution. None
touch `admin_content_release_version_media_replace*.go`, `media_service_display_variant.go`,
`contributions_me_handler.go`, or the new migration 0180.

1. `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`,
   `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
   `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` all fail with
   `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-*.json: no such file or
   directory` — missing fixture files on disk, unrelated to D-10/D-20.
2. `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes` fails with the
   same pre-existing `release_version_media.reorder` capability-registry gap already logged
   under 176-12 above. Not fixed, per Scope Boundary.

## Scope Addition 3 (Gruppentyp entfernen + Land/Status eindeutschen)

**Out-of-scope English-label finding (not fixed, logged per Scope Boundary):**

1. `frontend/src/app/admin/fansubs/page.tsx` (the Fansub-Verwaltung **list** page, not a
   create/edit "Stammdaten-Formular") has its own `statusLabel()` helper and two literal
   option arrays (`statusFilterOptions`, `bulkStatusOptions`) that render **raw English**
   text for the exact same `FansubStatus` values this scope addition just eindeutscht on the
   create/edit forms: the status filter shows "active"/"inactive"/"archived", the bulk
   status-reassignment dropdown shows the same, and the two status badges per row
   (desktop table + mobile card) call the local `statusLabel()` which returns `"archived"`
   for `dissolved` and the raw value otherwise. The mobile card's row-menu also has literal
   English "Edit"/"Delete" button labels. This is the same bug class as the Status-Select
   issue fixed in this scope addition, with the exact fix already available
   (`getFansubStatusLabel` in `frontend/src/lib/fansub-labels.ts`) — but the list page is a
   different component from the two "Stammdaten-Formulare" (create + edit/
   `FansubBasicInfoTab`) the user's instruction named, and it also uses native `<select>`/
   `<input>` elements throughout (a separate, larger, pre-existing `@/components/ui`
   migration gap, same pattern already tracked for other admin surfaces under D-04). Fixing
   it would require touching a file with no other connection to this scope addition and
   would blur the Typ/Land/Status fix into an unrelated page. Recommended as a small,
   separate follow-up: swap `statusLabel()` for `getFansubStatusLabel`, translate the two
   option-label arrays, and translate "Edit"/"Delete" to "Bearbeiten"/"Löschen".

**Pre-existing, out-of-scope test observations during this scope addition's verification
runs (none touch any file this scope addition modified):**

1. `go test ./internal/handlers/...` (full package): `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`,
   `Test11eyesSourceSelection_AllActualItemsAndPermutations`,
   `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` fail with missing
   `docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-*.json` fixture files — same
   pre-existing gap already logged under 176-05/176-13/Scope Addition 1.
2. `go test ./internal/repository/...` (full package): several `TestPhase134Matrix*` tests
   fail with live Keycloak/external-host connectivity errors
   (`192.168.235.196:18093 connection refused`, `invalid_grant`), and
   `TestPhase141RevokedDelegationImmediateEffect` fails with the pre-existing
   `release_version_media.reorder` capability-registry gap already logged under
   176-12/176-13/Scope Addition 1. None reference `fansub`, `group_type`, or `kuerzel`.
3. `npx vitest run` (full suite, both runs of this scope addition): one run showed
   `src/app/members/[slug]/not-found.test.tsx` failing on a `waitFor` timeout looking for a
   "Cached..." heading; re-ran that single file in isolation immediately after and both its
   tests passed cleanly (294ms/11ms). Flaky/timing-dependent, unrelated to any fansub file —
   confirmed by a full subsequent run that included every `src/app/admin/fansubs/**`,
   `src/lib/fansub-labels*`, `src/lib/api.auth-refresh.test.ts`, and
   `src/components/fansubs/**` test file (75 files, 607 tests, all green).

## Scope Addition 2 (Kürzel-Feld + Aliase-Umbenennung, Anlegeseite)

Pre-existing, out-of-scope failures observed while running
`go test ./internal/handlers/... -run TestCreateFansub` during this scope addition. None
touch any file modified by this scope addition (`fansub_group_create_validation.go`,
`fansub_groups.go`, `fansub_requests.go`, `models/fansub.go`,
`fansub_repository_groups.go`).

1. `TestCreateFansubGroupAppMemberMapsDuplicateMembershipConflict`,
   `TestCreateFansubGroupAppMemberPassesHistoricalMemberLink`,
   `TestCreateFansubGroupAppMemberAllowsHistoricalLinkWithoutExplicitRoles`,
   `TestCreateFansubGroupInvitationReturnsOneTimeInviteLink`,
   `TestCreateFansubGroupInvitationSendsMailOnSuccess`,
   `TestCreateFansubGroupInvitationMailContainsGroupContextAndEmailHint`,
   `TestCreateFansubGroupInvitationMailFallsBackWithoutFansubRepo`,
   `TestCreateFansubGroupInvitationCancelsOnMailFailure`,
   `TestCreateFansubGroupInvitationAuditLogContainsNoRawToken` (all in `app_auth_test.go`,
   testing `AppAuthHandler.CreateFansubGroupAppMember`/invitation flows, unrelated to
   `FansubHandler.CreateFansub`) — all fail with `403 insufficient_role` instead of their
   expected success/conflict codes. Verified pre-existing and unrelated by reverting this
   scope addition's 5 backend files via `git checkout --` and re-running
   `TestCreateFansubGroupAppMemberMapsDuplicateMembershipConflict` in isolation: it fails
   identically on the unmodified tree. Root cause is a `permissionResolverStub`/
   `permissions.Service` role-matrix gap in `app_auth_test.go` itself, unrelated to the
   Kürzel create-path work. Not fixed, per Scope Boundary.
