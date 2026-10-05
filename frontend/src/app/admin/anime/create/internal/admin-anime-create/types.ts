import type { FormEvent } from "react";

import type { AdminAnimeAniSearchSearchCandidate } from "@/types/admin";

// D-13: shared action-interface contract for useAdminAnimeCreateControllerImpl's
// composed sub-hooks. Each sub-hook extracted from the impl file contributes its
// externally-visible action signatures here, grouped by which sub-hook owns them.
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

  // useAssetStagingActions (174-11 Task 1)
  handleCoverUpload: (file: File) => Promise<void>;
  handleAssetCandidateSearch: () => Promise<void>;
  handleLoadMoreAssets: () => Promise<void>;
  handleAssetCandidateAdoption: () => Promise<void>;

  // useCreateSubmitAction (174-11 Task 2)
  submitCreate: () => Promise<void>;
  handleCreateSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}
