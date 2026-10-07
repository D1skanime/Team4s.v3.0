#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/01-medien-hochladen.md (Fachaufgabe 1: Medien hochladen).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- (a) UI-Flächen: je eine Datei, die einen der 8 Upload-Wege im UI auslöst/rendert ---
UI_SURFACES=(
  "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadQueue.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx"
  "frontend/src/components/admin/MediaUpload.tsx"
  "frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx"
  "frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts"
  "frontend/src/app/admin/anime/create/createAssetUploadPlan.ts"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts"
  "frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/useReleaseMediaDrawer.ts"
  "frontend/src/app/me/profile/page.tsx"
  "frontend/src/components/contributions/ReportFormMedia.tsx"
)
ui_count=0
for f in "${UI_SURFACES[@]}"; do
  if [ -f "$f" ]; then
    ui_count=$((ui_count + 1))
  else
    echo "WARN: UI-Fläche fehlt/verschoben: $f" >&2
  fi
done

# --- (b) Frontend-API-Upload-Funktionen: exakte export-Signaturen ---
FE_API_FUNCS=(
  "frontend/src/lib/api/releases.ts:export async function uploadReleaseVersionMedia"
  "frontend/src/lib/api/releases.ts:export async function replaceReleaseVersionMediaFile"
  "frontend/src/lib/api/admin/fansub-media.ts:export async function uploadFansubGroupMedia"
  "frontend/src/lib/api/admin/fansub-media.ts:export async function uploadFansubMedia"
  "frontend/src/lib/api/admin/anime-assets.ts:export async function uploadAdminAnimeMedia"
  "frontend/src/lib/api/admin/segment-assets.ts:export async function uploadSegmentAsset"
  "frontend/src/lib/api/admin/anime-release-assets.ts:export async function uploadAdminReleaseThemeAsset"
  "frontend/src/lib/api/admin/anime-release-assets.ts:export async function uploadAdminReleaseThemeAssetForRelease"
  "frontend/src/lib/api/members-media.ts:export async function uploadOwnProfileAvatar"
  "frontend/src/lib/api/members-media.ts:export async function uploadOwnProfileBackground"
  "frontend/src/lib/api/members-media.ts:export async function uploadOwnProfileStoryImage"
  "frontend/src/lib/api/contributions-me.ts:export async function uploadMediaSuggestion"
)
fe_count=0
for entry in "${FE_API_FUNCS[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    fe_count=$((fe_count + 1))
  else
    echo "WARN: Frontend-API-Funktion nicht gefunden: $pattern in $file" >&2
  fi
done

# --- (c) Backend-Upload-Handler: exakte Go-Funktionssignaturen ---
BE_HANDLERS=(
  "backend/internal/handlers/admin_content_release_version_media_upload.go:func (h *AdminContentHandler) UploadReleaseVersionMedia"
  "backend/internal/handlers/admin_content_release_version_media_replace.go:func (h *AdminContentHandler) ReplaceReleaseVersionMediaFile"
  "backend/internal/handlers/fansub_media_upload.go:func (h *FansubHandler) UploadFansubMedia"
  "backend/internal/handlers/media_upload.go:func (h *MediaUploadHandler) Upload"
  "backend/internal/handlers/admin_content_anime_theme_segments.go:func (h *AdminContentHandler) UploadSegmentAsset"
  "backend/internal/handlers/admin_content_release_theme_assets.go:func (h *AdminContentHandler) UploadReleaseThemeAsset"
  "backend/internal/handlers/admin_content_release_theme_assets.go:func (h *AdminContentHandler) UploadReleaseThemeAssetForRelease"
  "backend/internal/handlers/app_profile.go:func (h *AppAuthHandler) UploadOwnProfileAvatar"
  "backend/internal/handlers/app_profile.go:func (h *AppAuthHandler) UploadOwnProfileBackground"
  "backend/internal/handlers/app_profile_story_image.go:func (h *AppAuthHandler) UploadOwnProfileStoryImage"
  "backend/internal/handlers/suggestions_me_handler.go:func (h *SuggestionsMeHandler) UploadMediaSuggestion"
)
be_count=0
for entry in "${BE_HANDLERS[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    be_count=$((be_count + 1))
  else
    echo "WARN: Backend-Handler nicht gefunden: $pattern in $file" >&2
  fi
done

echo "UI-Flächen (Medien hochladen): $ui_count"
echo "Frontend-API-Upload-Funktionen (Medien hochladen): $fe_count"
echo "Backend-Upload-Handler (Medien hochladen): $be_count"
