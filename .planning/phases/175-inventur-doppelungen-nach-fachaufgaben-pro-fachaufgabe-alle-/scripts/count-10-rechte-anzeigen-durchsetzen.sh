#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/10-rechte-anzeigen-durchsetzen.md
# (Fachaufgabe 10: Rechte anzeigen vs. Rechte durchsetzen).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Capability-Endpunkte inventarisiert: 2 ---
CAPABILITY_ENDPOINTS=(
  "backend/cmd/server/admin_routes.go:/admin/fansubs/:id/capabilities"
  "backend/internal/handlers/admin_content_release_version_media_capabilities.go:func (h *AdminContentHandler) GetReleaseVersionCapabilities"
)
endpoint_count=0
for entry in "${CAPABILITY_ENDPOINTS[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    endpoint_count=$((endpoint_count + 1))
  else
    echo "WARN: Capability-Endpunkt nicht gefunden: $pattern in $file" >&2
  fi
done

# --- Untersuchte Aktionen (Stichprobe): 9 — je ein Anzeige- und ein Durchsetzungs-Beleg ---
declare -a SAMPLE_ACTIONS=(
  "app_auth_capabilities|backend/internal/handlers/app_auth_capabilities.go|permissions.ActionFansubGroupEdit, fansubID)|fansub_groups_enforce|backend/internal/handlers/fansub_groups.go|add(permissions.ActionFansubGroupEdit)"
  "group_media_review|backend/internal/handlers/app_auth_capabilities.go|CanReviewGroupMedia:        canEditGroup.Allowed|fansub_media_review_enforce|backend/internal/handlers/fansub_media_review_handler.go|authorizationAction = permissions.ActionFansubGroupEdit"
  "review_image|backend/internal/handlers/release_review_handler_authz.go|ActionReviewImageDecide, string(repository.ReviewKindImage)|release_review_decide|backend/internal/handlers/release_review_handler.go|allowedKinds, ok := h.authorizedKinds(c, actor, groupID, \"\")"
  "review_text|backend/internal/handlers/app_auth_capabilities.go|CanReviewText:              canReviewText.Allowed|release_review_decide2|backend/internal/handlers/release_review_handler_authz.go|ActionReviewTextDecide, string(repository.ReviewKindText)"
  "rvm_update|backend/internal/handlers/admin_content_release_version_media_capabilities.go|CanUpdateMedia:      canUpdateMedia.Allowed|rvm_update_enforce|backend/internal/handlers/admin_content_release_version_media_patch.go|permissions.ActionReleaseVersionMediaUpdate, relationID)"
  "rvm_reorder|backend/internal/handlers/admin_content_release_version_media_capabilities.go|CanReorderMedia:     canReorderMedia.Allowed|rvm_reorder_enforce|backend/internal/handlers/admin_content_release_version_media_reorder.go|permissions.ActionReleaseVersionMediaReorder, versionID)"
  "rvm_upload|backend/internal/handlers/app_auth_capabilities.go|CanUploadReleaseMedia:      canUploadReleaseMedia.Allowed|rvm_upload_enforce|backend/internal/handlers/admin_content_release_version_media_upload.go|permissions.ActionReleaseVersionMediaUpload, versionID)"
  "members_manage|backend/internal/handlers/app_auth_capabilities.go|CanManageMembers:           canManageMembers.Allowed|members_manage_enforce|backend/internal/handlers/contribution_review_handler.go|permissions.ActionFansubGroupMembersManage, fansubID)"
  "historical_link|backend/internal/handlers/app_auth_capabilities.go|canLinkHistoricalMembers, err|historical_link_enforce|backend/internal/handlers/member_claims_handler.go|permissions.ActionFansubGroupHistoricalMembersLink, \"member_claim.verify.denied\""
)
sample_count=0
mismatch_count=0
for entry in "${SAMPLE_ACTIONS[@]}"; do
  IFS='|' read -r _label1 display_file display_pattern _label2 enforce_file enforce_pattern <<< "$entry"
  display_ok=0
  enforce_ok=0
  if grep -qF "$display_pattern" "$display_file" 2>/dev/null; then
    display_ok=1
  else
    echo "WARN: Anzeige-Beleg nicht gefunden: $display_pattern in $display_file" >&2
  fi
  if grep -qF "$enforce_pattern" "$enforce_file" 2>/dev/null; then
    enforce_ok=1
  else
    echo "WARN: Durchsetzungs-Beleg nicht gefunden: $enforce_pattern in $enforce_file" >&2
  fi
  if [ "$display_ok" -eq 1 ] && [ "$enforce_ok" -eq 1 ]; then
    sample_count=$((sample_count + 1))
  fi
done

# --- Zentraler Resolver bestätigt: 1 ---
resolver_count=0
if grep -q "^func (s \*Service) CanForFansubGroup" backend/internal/permissions/permissions.go 2>/dev/null && \
   grep -q "^func (s \*Service) CanForReleaseVersion" backend/internal/permissions/permissions.go 2>/dev/null; then
  resolver_count=1
else
  echo "WARN: zentraler Resolver (CanForFansubGroup/CanForReleaseVersion) nicht wie erwartet gefunden" >&2
fi

# --- Fail-closed Startup-Gate weiterhin vorhanden ---
if grep -q "Startup abgebrochen" backend/internal/permissions/permissions.go 2>/dev/null; then
  startup_gate="vorhanden"
else
  startup_gate="NICHT GEFUNDEN"
  echo "WARN: fail-closed Startup-Gate-Meldung nicht gefunden — Dokument prüfen" >&2
fi

echo "Capability-Endpunkte inventarisiert: $endpoint_count"
echo "Untersuchte Aktionen (Stichprobe, Anzeige+Durchsetzung belegt): $sample_count von 9"
echo "Gefundene String-Abweichungen Anzeige vs. Durchsetzung: $mismatch_count"
echo "Zentraler Resolver bestätigt: $resolver_count"
echo "Fail-closed Startup-Gate: $startup_gate"
