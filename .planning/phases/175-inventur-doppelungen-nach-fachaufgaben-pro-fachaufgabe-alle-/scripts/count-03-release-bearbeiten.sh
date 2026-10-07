#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/03-release-bearbeiten.md (Fachaufgabe 3: Release bearbeiten).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Rahmen-Seiten: 2 ---
FRAME_PAGES=(
  "frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts"
  "frontend/src/app/me/releases/[versionId]/workspace/page.tsx"
)
frame_count=0
for f in "${FRAME_PAGES[@]}"; do
  if [ -f "$f" ]; then
    frame_count=$((frame_count + 1))
  else
    echo "WARN: Rahmen-Seiten-Datei fehlt/verschoben: $f" >&2
  fi
done
# Zwei distinkte Rahmen (Admin-Editor zählt als 1 trotz 2 Dateien, Workspace als 1).
if [ "$frame_count" -ge 3 ]; then
  rahmen_seiten=2
else
  rahmen_seiten=0
fi

# --- Gemeinsam genutzte Backend-Endpunkte: 3 ---
SHARED_BACKEND=(
  "backend/internal/handlers/admin_content_episode_version_editor.go:func (h *AdminContentHandler) GetEpisodeVersionEditorContext"
  "backend/internal/handlers/episode_version_update.go:func (h *FansubHandler) UpdateEpisodeVersion"
  "backend/internal/handlers/admin_content_release_version_media_capabilities.go:func (h *AdminContentHandler) GetReleaseVersionCapabilities"
)
shared_backend_count=0
for entry in "${SHARED_BACKEND[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    shared_backend_count=$((shared_backend_count + 1))
  else
    echo "WARN: Backend-Endpunkt nicht gefunden: $pattern in $file" >&2
  fi
done

# --- Gemeinsam genutzte Inhalts-Bausteine: 4 (vom /me-Workspace aus dem Admin-Verzeichnis importiert) ---
SHARED_CONTENT_BLOCKS=(
  "ReleaseVersionMediaSection"
  "ReleaseVersionNotesTab"
  "SegmenteTab"
  "ReleaseVersionMetadataFields"
)
WORKSPACE_PAGE="frontend/src/app/me/releases/[versionId]/workspace/page.tsx"
shared_blocks_count=0
for block in "${SHARED_CONTENT_BLOCKS[@]}"; do
  if grep -qF "import { ${block} } from '@/app/admin/episode-versions/[versionId]/edit/${block}'" "$WORKSPACE_PAGE" 2>/dev/null; then
    shared_blocks_count=$((shared_blocks_count + 1))
  else
    echo "WARN: gemeinsamer Inhalts-Baustein nicht als Import gefunden: $block in $WORKSPACE_PAGE" >&2
  fi
done

# --- Einstiegspunkte je Rahmen: 5 + 5 ---
ADMIN_ENTRY_POINTS=(
  "frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx"
  "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx"
  "frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx"
  "frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx"
  "frontend/src/app/admin/users/tabs/UserMediaTab.tsx"
)
admin_entry_count=0
for f in "${ADMIN_ENTRY_POINTS[@]}"; do
  if grep -q "admin/episode-versions/" "$f" 2>/dev/null; then
    admin_entry_count=$((admin_entry_count + 1))
  else
    echo "WARN: Admin-Einstiegspunkt verweist nicht mehr auf admin/episode-versions: $f" >&2
  fi
done

WORKSPACE_ENTRY_POINTS=(
  "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
  "frontend/src/app/me/dashboard/components/AttentionSection.tsx"
  "frontend/src/app/me/dashboard/components/attentionHelpers.ts"
  "frontend/src/components/contributions/ContributionCard.tsx"
  "frontend/src/components/contributions/AnimeGroupCard.tsx"
)
workspace_entry_count=0
for f in "${WORKSPACE_ENTRY_POINTS[@]}"; do
  if grep -q "me/releases/" "$f" 2>/dev/null; then
    workspace_entry_count=$((workspace_entry_count + 1))
  else
    echo "WARN: Workspace-Einstiegspunkt verweist nicht mehr auf me/releases: $f" >&2
  fi
done

echo "Rahmen-Seiten (Release bearbeiten): $rahmen_seiten"
echo "Gemeinsam genutzte Backend-Endpunkte: $shared_backend_count"
echo "Gemeinsam genutzte Inhalts-Bausteine: $shared_blocks_count"
echo "Einstiegspunkte Admin-Rahmen: $admin_entry_count"
echo "Einstiegspunkte Workspace-Rahmen: $workspace_entry_count"
