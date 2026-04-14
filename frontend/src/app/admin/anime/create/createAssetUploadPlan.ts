"use client";

import {
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeBackgroundVideoAsset,
  assignAdminAnimeBannerAsset,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeLogoAsset,
  uploadAdminAnimeMedia,
} from "@/lib/api";
import type {
  AdminAnimeAssetKind,
  AdminAnimeAssetSearchCandidate,
  AdminAnimeUploadAssetType,
} from "@/types/admin";

/**
 * Repraesentiert ein lokal vorbereitetes (gestaged) Asset, das noch nicht
 * hochgeladen wurde. Enthaelt den Entwurfsdateinamen, die Datei selbst und
 * die lokale Vorschau-URL.
 */
export interface CreateAssetUploadDraftValue {
  draftValue: string;
  file: File;
  previewUrl: string;
}

/**
 * Eine einzelne Asset-Auswahl fuer den Upload: entweder eine rohe Datei,
 * ein vorbereiteter Entwurfswert oder null (kein Asset ausgewaehlt).
 */
type CreateAssetUploadSelection = File | CreateAssetUploadDraftValue | null;

/**
 * Sammelt alle ausgewaehlten Assets fuer die Erstellen-Seite nach Asset-Slot.
 * Hintergrundbilder koennen mehrere Eintraege enthalten.
 */
export interface CreateAssetUploadSelections {
  cover?: CreateAssetUploadSelection;
  banner?: CreateAssetUploadSelection;
  logo?: CreateAssetUploadSelection;
  background?: CreateAssetUploadSelection[];
  background_video?: CreateAssetUploadSelection;
}

/**
 * Konfigurationseintrag fuer einen Asset-Upload-Slot: beschreibt den Backend-
 * Asset-Typ, das lesbare Label und ob mehrere Dateien erlaubt sind.
 */
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

/**
 * Gibt die vollstaendige Upload-Plan-Konfiguration fuer alle Asset-Arten
 * zurueck. Wird vom Controller verwendet, um Asset-Slots zuzuordnen.
 */
export function buildCreateAssetUploadPlan() {
  return CREATE_ASSET_UPLOAD_PLAN;
}

/**
 * Bereitet eine lokal gewaelte Datei als gestaged-Asset vor. Erstellt eine
 * temporaere Vorschau-URL via URL.createObjectURL.
 */
export function stageManualCreateAsset(file: File): CreateAssetUploadDraftValue {
  return {
    draftValue: file.name.trim(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

/**
 * Leitet aus dem Content-Type-Header die passende Dateiendung ab. Faellt auf
 * "jpg" zurueck, wenn kein bekannter Bildtyp erkannt wird.
 */
function resolveRemoteAssetExtension(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("avif")) return "avif";
  if (normalized.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Normalisiert einen Dateinamens-Abschnitt (z. B. Quelle oder ID) fuer die
 * Verwendung in einem sicheren Dateinamen. Ersetzt Sonderzeichen durch Bindestriche.
 */
function sanitizeRemoteAssetSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// convertAvifToJpeg uses an off-screen canvas to convert an AVIF blob to JPEG.
// Browsers render AVIF natively so the canvas round-trip gives a clean JPEG.
async function convertAvifToJpeg(avifBlob: Blob): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(avifBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (converted) => {
          if (!converted) {
            reject(new Error("canvas toBlob returned null"));
            return;
          }
          resolve(converted);
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("AVIF bild konnte nicht geladen werden"));
    };
    img.src = objectUrl;
  });
}

/**
 * Laedt einen Remote-Asset-Kandidaten ueber den lokalen Proxy herunter und
 * bereitet ihn als gestaged-Asset vor. Konvertiert AVIF automatisch zu JPEG,
 * da das Backend kein reines AVIF-Decoding unterstuetzt.
 */
export async function stageRemoteCreateAssetCandidate(
  candidate: AdminAnimeAssetSearchCandidate,
  deps: {
    fetchImpl?: typeof fetch;
    createObjectURL?: (object: Blob) => string;
  } = {},
): Promise<CreateAssetUploadDraftValue> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const createObjectURL = deps.createObjectURL ?? URL.createObjectURL;
  const proxyURL = `/api/admin/asset-proxy?url=${encodeURIComponent(candidate.image_url)}`;
  const response = await fetchImpl(proxyURL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Remote asset download failed: ${response.status}`);
  }

  let blob = await response.blob();

  // AVIF has no pure-Go decoder on the backend — convert to JPEG in the
  // browser before upload. The browser renders AVIF natively so the canvas
  // round-trip is lossless in practice and produces a standard JPEG.
  if (blob.type === "image/avif" || blob.type === "image/avif-sequence") {
    blob = await convertAvifToJpeg(blob);
  }

  const extension = resolveRemoteAssetExtension(blob.type);
  const baseName = [
    candidate.asset_kind,
    candidate.source,
    candidate.id,
  ]
    .map(sanitizeRemoteAssetSegment)
    .filter(Boolean)
    .join("-");
  const fileName = `${baseName || "asset"}.${extension}`;
  const file = new File([blob], fileName, {
    type: blob.type || "image/jpeg",
  });

  return {
    draftValue: file.name,
    file,
    previewUrl: createObjectURL(file),
  };
}

/**
 * Bereitet eine lokal ausgewaehlte Cover-Datei vor und gibt den Entwurfswert
 * und die Vorschau-URL zurueck (ohne File-Referenz, nur fuer Cover-Slot).
 */
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

/**
 * Laedt eine einzelne Asset-Datei fuer einen neu erstellten Anime hoch und
 * verknuepft sie im Backend mit dem passenden Slot. Gibt die Upload-ID zurueck.
 */
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

/**
 * Loeest eine Asset-Auswahl zu einer rohen File-Instanz auf. Gibt null zurueck,
 * wenn keine Datei ausgewaehlt wurde.
 */
function resolveUploadFile(selection: CreateAssetUploadSelection): File | null {
  if (!selection) {
    return null;
  }
  if (selection instanceof File) {
    return selection;
  }
  return selection.file;
}

/**
 * Laedt das Cover-Bild fuer einen neu erstellten Anime hoch und verknuepft es.
 * Kurzform von uploadAndLinkCreatedAnimeAsset fuer den Cover-Slot.
 */
export async function uploadCreatedAnimeCover(
  animeID: number,
  file: File,
  authToken?: string,
): Promise<string> {
  return uploadAndLinkCreatedAnimeAsset(animeID, "cover", file, authToken);
}

/**
 * Laedt alle gestaged-Assets eines neu erstellten Anime sequenziell hoch und
 * verknuepft sie mit dem passenden Slot. Gibt ein Ergebnis-Objekt mit den
 * hochgeladenen Asset-IDs je Slot zurueck.
 */
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
