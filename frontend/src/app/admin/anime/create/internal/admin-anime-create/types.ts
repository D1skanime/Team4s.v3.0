// D-13: shared action-interface contract for useAdminAnimeCreateControllerImpl's
// composed sub-hooks. Each sub-hook extracted from the impl file contributes its
// externally-visible action signatures here, grouped by which sub-hook owns them.
// Placeholder until the first sub-hook extraction (this plan's Task 2) adds entries.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- D-13 scaffold:
// populated incrementally by this plan's Task 2/3 and by 174-11.
export interface UseAdminAnimeCreateControllerActions {
  // Jellyfin-intake actions (useJellyfinIntakeActions) and AniSearch-intake
  // actions (useAniSearchIntakeActions) are added here as each sub-hook is
  // extracted (174-10 Task 2/3). Asset-staging and submit clusters follow in 174-11.
}
