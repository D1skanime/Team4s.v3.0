#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/05-mitglieder-einladen-claims.md
# (Fachaufgabe 5: Mitglieder einladen / Claims / Mitgliedsanfragen).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- UI-Flächen: 6 ---
UI_SURFACES=(
  "frontend/src/app/invitations/accept/page.tsx"
  "frontend/src/app/claim-invitations/accept/page.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx"
  "frontend/src/app/me/profile/components/MemberClaimSection.tsx"
  "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx"
)
ui_count=0
for f in "${UI_SURFACES[@]}"; do
  if [ -f "$f" ]; then
    ui_count=$((ui_count + 1))
  else
    echo "WARN: UI-Flaeche fehlt/verschoben: $f" >&2
  fi
done

# --- Beide Accept-Seiten teilen InviteAcceptFlow (Phase-135-Konsolidierung) ---
shared_flow=0
if grep -qF "InviteAcceptFlow" frontend/src/app/invitations/accept/page.tsx 2>/dev/null \
  && grep -qF "InviteAcceptFlow" frontend/src/app/claim-invitations/accept/page.tsx 2>/dev/null \
  && [ -f "frontend/src/components/auth/InviteAcceptFlow.tsx" ]; then
  shared_flow=1
fi

# --- Geprüfte Rechte-Vergleichspunkte: 7 (Datei:Pattern-Paare) ---
declare -a RIGHTS_PAIRS=(
  "backend/internal/handlers/app_auth_capabilities.go|canCreateInvitation, err := h.permissionSvc.CanForFansubGroup"
  "backend/internal/handlers/app_auth_invitations.go|permissions.ActionFansubGroupInvitationsCreate, fansubID"
  "frontend/src/components/auth/InviteAcceptFlow.tsx|hasAccessToken, isClientInitialized"
  "backend/internal/permissions/permissions.go|func (s *Service) CanAcceptInvitation(actor Actor) Result"
  "backend/internal/handlers/contributions_me_handler.go|func requireMeIdentity(c *gin.Context)"
  "backend/internal/repository/member_claims_submit_repository.go|Code:       \"memorial_not_claimable\""
  "backend/internal/repository/member_claim_invitations_repository.go|Code:       \"memorial_not_claimable\""
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

# --- Claim-Verwaltung durchgehend konsistent: ActionFansubGroupHistoricalMembersLink ---
declare -a CLAIM_ACTION_SITES=(
  "backend/internal/handlers/member_claims_handler.go"
  "backend/internal/handlers/member_claim_invitations_handler.go"
  "backend/internal/handlers/app_auth_capabilities.go"
)
claim_action_hits=0
for f in "${CLAIM_ACTION_SITES[@]}"; do
  hits=$(grep -c "ActionFansubGroupHistoricalMembersLink" "$f" 2>/dev/null || echo 0)
  if [ "$hits" -gt 0 ]; then
    claim_action_hits=$((claim_action_hits + 1))
  else
    echo "WARN: ActionFansubGroupHistoricalMembersLink nicht gefunden in $f" >&2
  fi
done

# --- Mitgliedsanfrage nutzt eigenes, globales Rechte-Modell (requirePlatformAdmin) ---
member_request_platform_admin=0
if grep -q "func (h \*MemberRequestsHandler) requirePlatformAdmin" backend/internal/handlers/member_requests_handler.go 2>/dev/null; then
  member_request_platform_admin=1
fi

# --- Datenhaltung: 3 Tabellen ---
STORAGE_LOCATIONS=(
  "database/migrations/0076_fansub_group_invitations.up.sql:CREATE TABLE IF NOT EXISTS fansub_group_invitations"
  "database/migrations/0092_member_claim_invitations.up.sql:CREATE TABLE IF NOT EXISTS member_claim_invitations"
  "database/migrations/0081_historical_members_identity.up.sql:CREATE TABLE IF NOT EXISTS member_claims"
)
storage_count=0
for entry in "${STORAGE_LOCATIONS[@]}"; do
  file="${entry%%:*}"
  pattern="${entry#*:}"
  if grep -qF "$pattern" "$file" 2>/dev/null; then
    storage_count=$((storage_count + 1))
  else
    echo "WARN: Tabelle nicht gefunden: $pattern in $file" >&2
  fi
done

# --- member_claims wird fuer 2 Zwecke wiederverwendet (member_id IS NULL = Antrag) ---
shared_table_reuse=0
if grep -q "member_id IS NULL" backend/internal/repository/member_requests_repository.go 2>/dev/null; then
  shared_table_reuse=1
fi

echo "UI-Flaechen (Mitglieder einladen/Claims/Anfragen): $ui_count"
echo "Beide Accept-Seiten teilen InviteAcceptFlow (Phase-135-Konsolidierung bestaetigt): $([ "$shared_flow" -eq 1 ] && echo ja || echo NEIN)"
echo "Geprüfte Rechte-Vergleichspunkte: $rights_points"
echo "Claim-Verwaltung konsistent auf ActionFansubGroupHistoricalMembersLink: $claim_action_hits von 3 Stellen"
echo "Mitgliedsanfrage nutzt eigenes globales Rechte-Modell (requirePlatformAdmin): $([ "$member_request_platform_admin" -eq 1 ] && echo ja || echo NEIN)"
echo "Datenhaltung: $storage_count Tabellen"
echo "member_claims fuer 2 Zwecke wiederverwendet (Claim + Neuanlage-Antrag): $([ "$shared_table_reuse" -eq 1 ] && echo ja || echo NEIN)"
