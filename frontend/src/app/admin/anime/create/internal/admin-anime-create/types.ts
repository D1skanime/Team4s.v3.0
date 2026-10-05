import type { AdminAnimeAniSearchSearchCandidate } from "@/types/admin";

// D-13: shared action-interface contract for useAdminAnimeCreateControllerImpl's
// composed sub-hooks. Each sub-hook extracted from the impl file contributes its
// externally-visible action signatures here, grouped by which sub-hook owns them.
// The asset-staging/submit clusters (174-11) are added incrementally.
export interface UseAdminAnimeCreateControllerActions {
  // useJellyfinIntakeActions (174-10 Task 2)
  handleJellyfinSearch: () => Promise<void>;
  handleJellyfinCandidateReview: (candidateID: string) => Promise<void>;
  handleJellyfinCandidateAdopt: (candidateID: string) => Promise<void>;

  // useAniSearchIntakeActions (174-10 Task 3)
  loadAniSearchDraftByID: (anisearchID: string) => Promise<void>;
  handleAniSearchDraftLoad: () => Promise<void>;
  handleAniSearchCandidateSearch: () => Promise<void>;
  handleAniSearchCandidateSelect: (
    candidate: AdminAnimeAniSearchSearchCandidate,
  ) => Promise<void>;
}
