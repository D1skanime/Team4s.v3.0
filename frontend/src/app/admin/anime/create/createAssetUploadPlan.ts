"use client";

import {
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeBackgroundVideoAsset,
  assignAdminAnimeBannerAsset,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeLogoAsset,
  uploadAdminAnimeMedia,
} from "@/lib/api";
import type { AdminAnimeAssetKind, AdminAnimeUploadAssetType } from "@/types/admin";

export interface CreateAssetUploadDraftValue {
  draftValue: string;
  file: File;
  previewUrl: string;
}

type CreateAssetUploadSelection = File | CreateAssetUploadDraftValue | null;

export interface CreateAssetUploadSelections {
  cover?: CreateAssetUploadSelection;
  banner?: CreateAssetUploadSelection;
  logo?: CreateAssetUploadSelection;
  background?: CreateAssetUploadSelection[];
  background_video?: CreateAssetUploadSelection;
}

interface CreateAssetUploadPlanEntry {
  assetType: AdminAnimeUploadAssetType;
  label: string;
  multiple: boolean;
}

const CREATE_ASSET_UPLOAD_PLAN: Record<AdminAnimeAssetKind, CreateAssetUploadPlanEntry> = {
  cover: {
    assetType: "poster",
    label: "Cover",
    multiple: false,
  },
  banner: {
    assetType: "banner",
    label: "Banner",
    multiple: false,
  },
  logo: {
    assetType: "logo",
    label: "Logo",
    multiple: false,
  },
  background: {
    assetType: "background",
    label: "Background",
    multiple: true,
  },
  background_video: {
    assetType: "background_video",
    label: "Background-Video",
    multiple: false,
  },
};

export function buildCreateAssetUploadPlan() {
  return CREATE_ASSET_UPLOAD_PLAN;
}

export function stageManualCreateAsset(file: File): CreateAssetUploadDraftValue {
  return {
    draftValue: file.name.trim(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function stageManualCreateCover(file: File): {
  draftValue: string;
  previewUrl: string;
} {
  const staged = stageManualCreateAsset(file);
  return {
    draftValue: staged.draftValue,
    previewUrl: staged.previewUrl,
  };
}

async function uploadAndLinkCreatedAnimeAsset(
  animeID: number,
  kind: AdminAnimeAssetKind,
  file: File,
  authToken?: string,
): Promise<string> {
  const config = CREATE_ASSET_UPLOAD_PLAN[kind];
  const upload = await uploadAdminAnimeMedia({
    animeID,
    assetType: config.assetType,
    file,
    authToken,
  });
  if (kind === "cover") {
    await assignAdminAnimeCoverAsset(animeID, upload.id, authToken);
  } else if (kind === "banner") {
    await assignAdminAnimeBannerAsset(animeID, upload.id, authToken);
  } else if (kind === "logo") {
    await assignAdminAnimeLogoAsset(animeID, upload.id, authToken);
  } else if (kind === "background") {
    await addAdminAnimeBackgroundAsset(animeID, upload.id, authToken);
  } else {
    await assignAdminAnimeBackgroundVideoAsset(animeID, upload.id, authToken);
  }
  return upload.id;
}

function resolveUploadFile(selection: CreateAssetUploadSelection): File | null {
  if (!selection) {
    return null;
  }
  if (selection instanceof File) {
    return selection;
  }
  return selection.file;
}

export async function uploadCreatedAnimeCover(
  animeID: number,
  file: File,
  authToken?: string,
): Promise<string> {
  return uploadAndLinkCreatedAnimeAsset(animeID, "cover", file, authToken);
}

export async function uploadCreatedAnimeAssets(
  animeID: number,
  assets: CreateAssetUploadSelections,
  authToken?: string,
): Promise<Record<AdminAnimeAssetKind, string[]>> {
  const uploaded: Record<AdminAnimeAssetKind, string[]> = {
    cover: [],
    banner: [],
    logo: [],
    background: [],
    background_video: [],
  };

  const coverFile = resolveUploadFile(assets.cover || null);
  if (coverFile) {
    uploaded.cover.push(
      await uploadAndLinkCreatedAnimeAsset(
        animeID,
        "cover",
        coverFile,
        authToken,
      ),
    );
  }

  const bannerFile = resolveUploadFile(assets.banner || null);
  if (bannerFile) {
    uploaded.banner.push(
      await uploadAndLinkCreatedAnimeAsset(
        animeID,
        "banner",
        bannerFile,
        authToken,
      ),
    );
  }

  const logoFile = resolveUploadFile(assets.logo || null);
  if (logoFile) {
    uploaded.logo.push(
      await uploadAndLinkCreatedAnimeAsset(
        animeID,
        "logo",
        logoFile,
        authToken,
      ),
    );
  }

  for (const entry of assets.background || []) {
    const backgroundFile = resolveUploadFile(entry);
    if (!backgroundFile) continue;
    uploaded.background.push(
      await uploadAndLinkCreatedAnimeAsset(
        animeID,
        "background",
        backgroundFile,
        authToken,
      ),
    );
  }

  const backgroundVideoFile = resolveUploadFile(
    assets.background_video || null,
  );
  if (backgroundVideoFile) {
    uploaded.background_video.push(
      await uploadAndLinkCreatedAnimeAsset(
        animeID,
        "background_video",
        backgroundVideoFile,
        authToken,
      ),
    );
  }

  return uploaded;
}
