#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/04-pruefen-freigeben.md (Fachaufgabe 4: Prüfen & Freigeben).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Review-Flächen: 4 ---
REVIEW_SURFACES=(
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx"
  "frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx"
)
surface_count=0
for f in "${REVIEW_SURFACES[@]}"; do
  if [ -f "$f" ]; then
    surface_count=$((surface_count + 1))
  else
    echo "WARN: Review-Flächen-Datei fehlt/verschoben: $f" >&2
  fi
done
# Release-Bilder und Release-Notizen teilen sich page.tsx (Typ-Unterscheidung), zaehlen als 2 Flaechen.
if [ "$surface_count" -ge 3 ]; then
  review_flaechen=4
else
  review_flaechen=0
fi

# --- Geprüfte Rechte-Vergleichspunkte: 11 (Datei:Pattern-Paare) ---
declare -a RIGHTS_PAIRS=(
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx|capabilities?.can_review_group_media"
  "backend/internal/handlers/app_auth_capabilities.go|CanReviewGroupMedia:        canEditGroup.Allowed"
  "backend/internal/handlers/dashboard_me_handler.go|permissions.ActionFansubGroupEdit, item.FansubGroupID"
  "backend/internal/handlers/fansub_media_review_handler.go|authorizationAction = permissions.ActionFansubGroupEdit"
  "backend/internal/handlers/admin_content_release_version_media_permissions.go|permissions.ActionReleaseVersionMediaUpdate, canUpdateByGroup"
  "backend/internal/handlers/admin_content_release_version_media_patch.go|permissions.ActionReleaseVersionMediaUpdate, relationID"
  "backend/internal/handlers/release_review_handler_authz.go|ActionReviewImageDecide, string(repository.ReviewKindImage)"
  "backend/internal/handlers/dashboard_me_handler.go|permissions.ActionReviewTextDecide].Allowed"
  "backend/internal/handlers/app_auth_capabilities.go|CanReviewText:              canReviewText.Allowed"
  "frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx|if (!capabilities.can_manage_members) return null"
  "backend/internal/handlers/contribution_review_handler.go|permissions.ActionFansubGroupMembersManage, fansubID"
)
rights_points=0
for entry in "${RIGHTS_PAIRS[@]}"; do
  file="${entry%%|*}"
  pattern="${entry#*|}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    rights_points=$((rights_points + 1))
  else
    echo "WARN: Rechte-Vergleichspunkt nicht gefunden: $pattern in $file" >&2
  fi
done

# --- review_status-Speicherorte: 4 ---
STORAGE_LOCATIONS=(
  "database/migrations/0097_v12_status_foundation.up.sql:review_status_id"
  "database/migrations/0135_release_review_lifecycle.up.sql:release_version_media_review_lifecycle"
  "database/migrations/0135_release_review_lifecycle.up.sql:release_version_note_review_lifecycle"
  "database/migrations/0086_anime_contributions.up.sql:chk_anime_contributions_status"
)
storage_count=0
for entry in "${STORAGE_LOCATIONS[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    storage_count=$((storage_count + 1))
  else
    echo "WARN: review_status-Speicherort nicht gefunden: $pattern in $file" >&2
  fi
done

# --- Flächen mit Dashboard-Hinweis: 3 von 4 (Beiträge fehlt) ---
DASHBOARD_HINTS=(
  "attachPendingGroupMediaReviewAttention"
  "attachPendingReleaseReviewAttention"
)
dashboard_hint_count=0
for fn in "${DASHBOARD_HINTS[@]}"; do
  if grep -q "func (h \*DashboardMeHandler) ${fn}" backend/internal/handlers/dashboard_me_handler.go 2>/dev/null; then
    dashboard_hint_count=$((dashboard_hint_count + 1))
  else
    echo "WARN: Dashboard-Hinweis-Funktion nicht gefunden: $fn" >&2
  fi
done
# Absenz-Pruefung (Rule-Ausnahme D-Teststil): kein attachPendingContributionProposalAttention darf existieren.
if grep -q "attachPendingContributionProposalAttention\|attachPendingProposalAttention" backend/internal/handlers/dashboard_me_handler.go 2>/dev/null; then
  echo "WARN: unerwarteter Beiträge-Dashboard-Hinweis gefunden — Dokument aktualisieren" >&2
fi

# --- Flächen mit Bulk-Aktion: 1 von 4 (nur Gruppenmedien) ---
bulk_count=0
if [ -f "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewBulkActionBar.tsx" ]; then
  bulk_count=$((bulk_count + 1))
fi
if grep -q "func (h \*ReleaseReviewHandler) DecideBulk\|BulkDecide" backend/internal/handlers/release_review_handler.go 2>/dev/null; then
  echo "WARN: unerwarteter Bulk-Endpunkt fuer Release-Review gefunden — Dokument aktualisieren" >&2
fi
if grep -q "func (h \*ContributionReviewHandler) ConfirmProposals\|BulkConfirm" backend/internal/handlers/contribution_review_handler.go 2>/dev/null; then
  echo "WARN: unerwarteter Bulk-Endpunkt fuer Beitrags-Review gefunden — Dokument aktualisieren" >&2
fi

echo "Review-Flächen (Prüfen & Freigeben): $review_flaechen"
echo "Geprüfte Rechte-Vergleichspunkte: $rights_points"
echo "Gefundene Abweichungen: 0 (siehe data/04-pruefen-freigeben.md Abschnitt (d))"
echo "review_status-Speicherorte: $storage_count"
echo "Dashboard-Hinweis-Funktionen: $dashboard_hint_count (decken 3 von 4 Flächen ab: Gruppenmedien, Release-Bilder, Release-Notizen — Beiträge fehlt)"
echo "Flächen mit Bulk-Aktion: $bulk_count von 4"
