#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/12-benachrichtigung-hinweise.md
# (Fachaufgabe 12: Benachrichtigung/Hinweise).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- Untersuchte Attention-Funktionen: 4 ---
ATTENTION_FUNCS=(
  "attachPendingClaimAttention"
  "attachPendingGroupMediaReviewAttention"
  "attachPendingReleaseReviewAttention"
  "attachPendingOwnNoteRevisionAttention"
)
attention_count=0
for fn in "${ATTENTION_FUNCS[@]}"; do
  if grep -q "^func (h \*DashboardMeHandler) ${fn}(" backend/internal/handlers/dashboard_me_handler.go 2>/dev/null; then
    attention_count=$((attention_count + 1))
  else
    echo "WARN: Attention-Funktion nicht gefunden: $fn" >&2
  fi
done

# --- Anzeige/Durchsetzung-Abweichungen (Dashboard): 0 erwartet ---
mismatch_count=0
declare -a CONSISTENCY_CHECKS=(
  "claim|backend/internal/handlers/dashboard_me_handler.go|permissions.ActionFansubGroupHistoricalMembersLink, candidate.FansubGroupID|backend/internal/handlers/member_claims_handler.go|permissions.ActionFansubGroupHistoricalMembersLink, \"member_claim.verify.denied\""
  "group_media|backend/internal/handlers/dashboard_me_handler.go|permissions.ActionFansubGroupEdit, item.FansubGroupID|backend/internal/handlers/fansub_media_review_handler.go|authorizationAction = permissions.ActionFansubGroupEdit"
  "release_review|backend/internal/handlers/dashboard_me_handler.go|ResolveReviewGroupAuthorization(c.Request.Context(), actor, item.FansubGroupID)|backend/internal/handlers/release_review_handler_authz.go|ActionReviewImageDecide, string(repository.ReviewKindImage)"
)
for entry in "${CONSISTENCY_CHECKS[@]}"; do
  IFS='|' read -r _label display_file display_pattern enforce_file enforce_pattern <<< "$entry"
  display_ok=0
  enforce_ok=0
  grep -qF "$display_pattern" "$display_file" 2>/dev/null && display_ok=1
  grep -qF "$enforce_pattern" "$enforce_file" 2>/dev/null && enforce_ok=1
  if [ "$display_ok" -ne 1 ] || [ "$enforce_ok" -ne 1 ]; then
    echo "WARN: Konsistenz-Beleg unvollständig für $_label (display=$display_ok enforce=$enforce_ok)" >&2
    mismatch_count=$((mismatch_count + 1))
  fi
done

# --- Fehlende Attention-Lane fuer Beitraege: 1 (Vollstaendigkeits-Luecke) ---
missing_lane_count=0
if ! grep -q "attachPendingContribution\|attachPendingProposal" backend/internal/handlers/dashboard_me_handler.go 2>/dev/null; then
  missing_lane_count=1
fi

# --- Zentrale Toast-Infrastruktur: 0 erwartet ---
toast_infra_hits=$(grep -rl "useToast\|ToastProvider\|pushToast\|addToast" frontend/src/ 2>/dev/null | grep -vc "\.test\." || true)

# --- Datei-lokale errorBox/successBox-Implementierungen: 48 erwartet ---
errorbox_files=$(grep -rl "styles\.errorBox\|styles\.successBox" frontend/src/ 2>/dev/null | grep -vc "\.test\." || true)

# --- Tote MessageToast.tsx: nur eigene Datei referenziert sich selbst ---
messagetoast_importers=$(grep -rln "MessageToast" frontend/src/ 2>/dev/null | grep -vc "MessageToast.tsx$" || true)

# --- Auto-Dismiss-Varianten: 2 unterschiedliche Timer-Werte ---
dismiss_variants=0
grep -qF "SUCCESS_MESSAGE_TIMEOUT_MS = 4000" "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts" 2>/dev/null && dismiss_variants=$((dismiss_variants + 1))
grep -qF "window.setTimeout(() => setSuccessMessage(null), 1800)" "frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx" 2>/dev/null && dismiss_variants=$((dismiss_variants + 1))

# --- Mail-Typen im Backend: 1 erwartet ---
mail_types=$(grep -rn "MailMessage{" backend/internal/ 2>/dev/null | grep -vc "_test.go" || true)

echo "Untersuchte Attention-Funktionen: $attention_count von 4"
echo "Gefundene Anzeige/Durchsetzung-Abweichungen (Dashboard): $mismatch_count von 0 erwartet"
echo "Fehlende Attention-Lane (Beiträge, Vollständigkeits-Lücke): $missing_lane_count"
echo "Zentrale Toast-Infrastruktur (useToast/ToastProvider/pushToast/addToast) gefunden: $toast_infra_hits"
echo "Datei-lokale errorBox/successBox-Implementierungen: $errorbox_files"
echo "Produktionscode-Importeure von MessageToast.tsx (außer sich selbst): $messagetoast_importers"
echo "Beobachtete Auto-Dismiss-Varianten: $dismiss_variants von 2"
echo "Mail-Typen im Backend (MailMessage{} Konstruktionsstellen): $mail_types von 1 erwartet"
