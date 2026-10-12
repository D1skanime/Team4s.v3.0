import type { AdminAnimeAssetKind } from "@/types/admin";

// Shared pure adapter between the Anime-Asset upload UI (CreateAssetCard, used by both the
// create and edit workspaces) and the per-kind staging handlers. Decides what should happen for
// a given asset slot once the user picks/drops files via UploadDropzone — kept as a pure
// function (no DOM, no React) so slot routing/truncation is directly unit-testable instead of
// only reachable through render/click simulation (Live-UAT follow-up 2026-10-12, D-16/D-17: the
// anime asset board was still on native <input type="file">, no drag&drop).

export type AnimeAssetSingleSlotKind = "cover" | "banner" | "logo";
export type AnimeAssetListSlotKind = "background" | "background_video";

export type AnimeAssetUploadPlan =
  | { action: "replace"; kind: AnimeAssetSingleSlotKind; file: File }
  | { action: "add"; kind: AnimeAssetListSlotKind; files: File[] }
  | { action: "noop" };

const LIST_SLOT_KINDS: ReadonlySet<AdminAnimeAssetKind> = new Set(["background", "background_video"]);

function isListSlotKind(kind: AdminAnimeAssetKind): kind is AnimeAssetListSlotKind {
  return LIST_SLOT_KINDS.has(kind);
}

/**
 * Routes a file selection (from UploadDropzone's `onFilesSelected`) to the right staging action
 * for the given asset kind. Single-slot kinds (cover/banner/logo) always replace with exactly
 * one file — `UploadDropzone` itself already truncates a multi-file drop to the first file (plus
 * the D-16 warning) when `multiple` is false, this is a defensive second truncation so the plan
 * is correct even if called with more than one file. List kinds (background/background_video)
 * add every file as its own new staged entry, preserving the existing "repeat the upload action
 * to add another" workflow while letting one multi-file drop/pick do the same in one step.
 */
export function planAnimeAssetFileSelection(
  kind: AdminAnimeAssetKind,
  files: File[],
): AnimeAssetUploadPlan {
  if (files.length === 0) return { action: "noop" };

  if (isListSlotKind(kind)) {
    return { action: "add", kind, files };
  }

  return { action: "replace", kind, file: files[0] };
}
