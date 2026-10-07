#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/08-loeschen-aufraeumen.md (Fachaufgabe 8: Löschen / Aufräumen).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Hard-Delete-Mechanismen: 5 (Datei|Pattern-Paare) ---
declare -a HARD_DELETE_PAIRS=(
  "backend/internal/repository/admin_content_anime_delete.go|DELETE FROM anime WHERE id = \$1"
  "backend/internal/repository/fansub_repository_groups.go|DELETE FROM fansub_groups WHERE id = \$1"
  "backend/internal/repository/hist_group_members_repository.go|DELETE FROM hist_fansub_group_members WHERE id = \$1 AND fansub_group_id = \$2"
  "backend/internal/repository/fansub_repository_members.go|DELETE FROM fansub_members WHERE id = \$1 AND fansub_group_id = \$2"
  "backend/internal/repository/anime_contributions_member_repository.go|DELETE FROM anime_contributions WHERE id=\$1 AND fansub_group_id=\$2 AND anime_id=\$3 AND release_version_id IS NULL"
)
hard_delete_count=0
for entry in "${HARD_DELETE_PAIRS[@]}"; do
  file="${entry%%|*}"
  pattern="${entry#*|}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    hard_delete_count=$((hard_delete_count + 1))
  else
    echo "WARN: Hard-Delete-Beleg nicht gefunden: $pattern in $file" >&2
  fi
done

# --- Soft-Delete-Mechanismen (deleted_at-Spalte): 2 ---
declare -a SOFT_DELETE_PAIRS=(
  "backend/internal/repository/release_version_media_repository.go|UPDATE release_version_media"
  "backend/internal/repository/media_repository.go|UPDATE fansub_group_media"
)
soft_delete_count=0
for entry in "${SOFT_DELETE_PAIRS[@]}"; do
  file="${entry%%|*}"
  pattern="${entry#*|}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    soft_delete_count=$((soft_delete_count + 1))
  else
    echo "WARN: Soft-Delete-Beleg nicht gefunden: $pattern in $file" >&2
  fi
done

# --- FK-Unassign-Familien: 2 ---
unassign_count=0
if grep -q "func (r \*MediaRepository) ClearFansubMedia" backend/internal/repository/media_repository.go 2>/dev/null; then
  unassign_count=$((unassign_count + 1))
else
  echo "WARN: ClearFansubMedia nicht gefunden" >&2
fi
if grep -q "func (h \*AdminContentHandler) DeleteAnimeCoverAsset" backend/internal/handlers/admin_content_anime_assets.go 2>/dev/null; then
  unassign_count=$((unassign_count + 1))
else
  echo "WARN: DeleteAnimeCoverAsset nicht gefunden" >&2
fi

# --- Status-Übergang statt Soft-Delete: 1 (Release-Review-Tombstone) ---
tombstone_count=0
if grep -q "func tombstoneReleaseReviewLifecycle" backend/internal/repository/release_review_cleanup_repository.go 2>/dev/null \
  && grep -q "review_state = 'tombstoned'" backend/internal/repository/release_review_cleanup_repository.go 2>/dev/null; then
  tombstone_count=1
else
  echo "WARN: tombstoneReleaseReviewLifecycle-Mechanismus nicht vollständig gefunden" >&2
fi

# --- Dedizierte technische Cleanup-Jobs: 2 ---
cleanup_job_count=0
if grep -q "releaseReviewCleanupSvc" backend/cmd/server/main.go 2>/dev/null; then
  cleanup_job_count=$((cleanup_job_count + 1))
else
  echo "WARN: ReleaseReviewCleanupService nicht in main.go verdrahtet gefunden" >&2
fi
theme_cache_deletes=$(grep -c "DELETE FROM theme_segment_render_cache" backend/internal/repository/theme_segment_render_cache.go 2>/dev/null || echo 0)
if [ "$theme_cache_deletes" -ge 1 ]; then
  cleanup_job_count=$((cleanup_job_count + 1))
else
  echo "WARN: keine DELETE FROM theme_segment_render_cache Anweisung gefunden" >&2
fi

# --- Orphan-Fund: DELETE /fansubs/:id/members/:memberId hat keinen Frontend-Aufrufer mehr ---
orphan_found=0
if grep -q "v1.DELETE(\"/fansubs/:id/members/:memberId\"" backend/cmd/server/admin_routes.go 2>/dev/null; then
  caller_files=$(grep -rl "deleteFansubMember(" frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null \
    | grep -v "\.test\." \
    | grep -v "frontend/src/lib/api/fansubs-members.ts") || true
  if [ -z "$caller_files" ]; then
    orphan_found=1
  else
    echo "WARN: deleteFansubMember() hat doch einen Nicht-Test-Aufrufer — Dokument aktualisieren: $caller_files" >&2
  fi
else
  echo "WARN: Legacy-Route /fansubs/:id/members/:memberId nicht mehr registriert — Dokument aktualisieren" >&2
fi

# --- Mehrdeutigkeits-Risiko: 1 (eine Route, zwei Löschsemantiken je :kind-Parameterform) ---
ambiguous_route_found=0
if grep -q "func (h \*FansubHandler) DeleteFansubMedia" backend/internal/handlers/fansub_media_delete.go 2>/dev/null \
  && grep -q "h.deleteFansubGroupMedia(c, identity, actor, fansubID, mediaID)" backend/internal/handlers/fansub_media_delete.go 2>/dev/null \
  && grep -q "parseMediaKind(c.Param(\"kind\"))" backend/internal/handlers/fansub_media_delete.go 2>/dev/null; then
  ambiguous_route_found=1
else
  echo "WARN: Mehrdeutigkeits-Beleg für DeleteFansubMedia nicht gefunden" >&2
fi

echo "Fachdomänen mit Löschen-Mechanismus geprüft (Hard-Delete-Belege): $hard_delete_count von 5"
echo "Soft-Delete-Mechanismen (deleted_at): $soft_delete_count von 2"
echo "FK-Unassign-Familien: $unassign_count von 2"
echo "Status-Übergang-Mechanismen (Review-Lifecycle-Tombstone): $tombstone_count von 1"
echo "Dedizierte technische Cleanup-Jobs: $cleanup_job_count von 2"
echo "Orphan-Endpunkt gefunden (DeleteFansubMember ohne Frontend-Aufrufer): $orphan_found von 1"
echo "Mehrdeutigkeits-Risiko gefunden (eine Route, zwei Löschsemantiken): $ambiguous_route_found von 1"
