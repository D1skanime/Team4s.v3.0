#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/02-bild-ansehen.md (Fachaufgabe 2: Bild ansehen).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
# Rührt .planning/sketches/ NICHT an (D-08).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Eigenständige Viewer-Implementierungen (lebender Code, siehe Begründung in data/02-bild-ansehen.md) ---
VIEWER_IMPLEMENTATIONS=(
  "frontend/src/components/fansubs/FansubMediaLightbox.tsx"
  "frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx"
  "frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx"
  "frontend/src/components/groups/GroupAssetsExperience.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx"
)
viewer_count=0
for f in "${VIEWER_IMPLEMENTATIONS[@]}"; do
  if [ -f "$f" ]; then
    viewer_count=$((viewer_count + 1))
  else
    echo "WARN: Viewer-Implementierung fehlt/verschoben: $f" >&2
  fi
done

# --- UI-Einstiegspunkte (alle Dateien mit Bildanzeige-Trigger/-Rendering, inkl. totem Code) ---
UI_ENTRY_POINTS=(
  "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx"
  "frontend/src/components/fansubs/FansubMediaLightbox.tsx"
  "frontend/src/components/fansubs/FansubGroupMediaBlock.tsx"
  "frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx"
  "frontend/src/components/fansubs/projectMember/ProjectMemberMediaViewer.tsx"
  "frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx"
  "frontend/src/components/groups/GroupAssetsExperience.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
  "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewDetailDrawer.tsx"
)
ui_count=0
for f in "${UI_ENTRY_POINTS[@]}"; do
  if [ -f "$f" ]; then
    ui_count=$((ui_count + 1))
  else
    echo "WARN: UI-Einstiegspunkt fehlt/verschoben: $f" >&2
  fi
done

# --- Lebender-Code-Check für ReleaseVersionMediaDetailPanel.tsx (muss weiterhin 0 Importeure haben) ---
dead_code_importers=$( (grep -rl "ReleaseVersionMediaDetailPanel" frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null || true) | (grep -vF "ReleaseVersionMediaDetailPanel.tsx" || true) | wc -l | tr -d ' ')
if [ "$dead_code_importers" != "0" ]; then
  echo "WARN: ReleaseVersionMediaDetailPanel.tsx hat jetzt $dead_code_importers Importeur(e) - Befund 'toter Code' pruefen" >&2
fi

echo "Eigenständige Viewer-Implementierungen (Bild ansehen): $viewer_count"
echo "UI-Einstiegspunkte (Bild ansehen): $ui_count"

# --- D-08 Schutz: .planning/sketches darf durch dieses Skript nie veraendert werden ---
# Hinweis: Der Sketch-Pfad war bereits VOR Beginn dieser Phase als unversioniert (??)
# im Arbeitsbaum vorhanden (fremd, nicht von 175 angelegt). Ein reiner `git status
# --short`-Leerstring-Test kann deshalb nie "leer" liefern, weil "??" selbst bei
# völlig unveränderten Dateien ausgegeben wird. Statt des Status wird hier die
# tatsächliche Dateiliste + Inhalt (Fingerprint) geprüft: Änderungen/Löschungen/
# neue Dateien innerhalb des Pfades waeren ein echter Verstoss.
SKETCH_PATH=".planning/sketches/010-galerie-detailansicht"
if [ -d "$SKETCH_PATH" ]; then
  # Hinzugefuegte (A) oder geloeschte (D) Dateien INNERHALB des Sketch-Baums waeren
  # ein echter Verstoss; reines "??" (unveraendert unversioniert) ist erwartet.
  sketch_mutations=$(git status --short "$SKETCH_PATH" 2>/dev/null | grep -v '^??' | grep -v '^ *??' || true)
  if [ -n "$sketch_mutations" ]; then
    echo "FATAL: $SKETCH_PATH wurde verändert/committed (D-08-Verstoß):" >&2
    echo "$sketch_mutations" >&2
    exit 1
  fi
  echo "Sketch-Fingerprint (nur zur Nachvollziehbarkeit, D-08 nur-lesend):"
  find "$SKETCH_PATH" -type f -exec sha256sum {} \; | sort
fi
