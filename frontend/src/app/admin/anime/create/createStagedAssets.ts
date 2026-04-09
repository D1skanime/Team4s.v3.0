// createStagedAssets.ts: staged-asset type definitions and helpers for the
// create page. Extracted here so the main page component stays under the
// 700-line guardrail while keeping asset-management logic testable.

import type { AdminAnimeAssetKind } from "@/types/admin";
import { stageManualCreateAsset } from "./createAssetUploadPlan";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";

export type CreateSingleAssetKind = Exclude<
  AdminAnimeAssetKind,
  "cover" | "background"
>;

export interface CreateManualStagedAssets {
  banner: CreateAssetUploadDraftValue | null;
  logo: CreateAssetUploadDraftValue | null;
  background: CreateAssetUploadDraftValue[];
  background_video: CreateAssetUploadDraftValue | null;
}

export function createEmptyManualStagedAssets(): CreateManualStagedAssets {
  return {
    banner: null,
    logo: null,
    background: [],
    background_video: null,
  };
}

export function revokeStagedAssetPreview(
  asset: CreateAssetUploadDraftValue | null,
) {
  if (asset?.previewUrl) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

export function revokeStagedAssetPreviews(assets: CreateManualStagedAssets) {
  revokeStagedAssetPreview(assets.banner);
  revokeStagedAssetPreview(assets.logo);
  revokeStagedAssetPreview(assets.background_video);
  for (const entry of assets.background) {
    revokeStagedAssetPreview(entry);
  }
}

// Stages a new single-slot asset file and returns the updated staged assets map.
export function buildReplacedSingleAsset(
  current: CreateManualStagedAssets,
  kind: CreateSingleAssetKind,
  file: File,
): { next: CreateManualStagedAssets; staged: CreateAssetUploadDraftValue } {
  const staged = stageManualCreateAsset(file);
  const previous = current[kind];
  revokeStagedAssetPreview(previous);
  return {
    next: { ...current, [kind]: staged },
    staged,
  };
}
