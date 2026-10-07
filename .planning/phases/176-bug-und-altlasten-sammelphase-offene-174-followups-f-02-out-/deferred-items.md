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
