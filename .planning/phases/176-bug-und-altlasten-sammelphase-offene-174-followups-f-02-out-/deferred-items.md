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
