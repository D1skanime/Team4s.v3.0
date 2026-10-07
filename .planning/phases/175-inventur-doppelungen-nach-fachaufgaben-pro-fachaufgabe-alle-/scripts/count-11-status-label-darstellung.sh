#!/usr/bin/env bash
# Reproduziert die Summenzeilen aus data/11-status-label-darstellung.md
# (Fachaufgabe 11: Status-/Label-Darstellung).
# Grep-/Existenz-basiert, rein lesend, keine Live-Stack-Zugriffe (D-01).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

group_count=0
deviation_count=0

# --- Gruppe 1: Segment-Typ-Badge (F-02 OUTRO-Bug) ---
if grep -qF "if (upper.includes('OUTRO')) return 'OUT'" "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx" && \
   grep -qF "if (upper.includes('OUTRO') || upper.includes('PV')) return 'PV'" "frontend/src/app/admin/episode-versions/[versionId]/edit/segmenteTabUtils.ts"; then
  group_count=$((group_count + 1))
  deviation_count=$((deviation_count + 1))
else
  echo "WARN: Gruppe 1 (Segment-Typ-Badge OUTRO) nicht wie erwartet gefunden" >&2
fi

# --- Gruppe 2: Fansub-Gruppenmedien-Kategorie-Label ---
if grep -qF "old_website: 'Alte Website'" "frontend/src/lib/fansub-labels.ts" && \
   grep -qF "{ value: 'old_website', label: 'Alte Webseite' }" "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx"; then
  group_count=$((group_count + 1))
  deviation_count=$((deviation_count + 1))
else
  echo "WARN: Gruppe 2 (Fansub-Medien-Kategorie-Label) nicht wie erwartet gefunden" >&2
fi

# --- Gruppe 3: Claim-Status-Label ('verified') ---
if grep -qF "return 'Verifiziert'" "frontend/src/app/admin/users/tabs/UserClaimsTab.tsx" && \
   grep -qF "return 'Genehmigt'" "frontend/src/app/admin/claims/ClaimsClient.tsx"; then
  group_count=$((group_count + 1))
  deviation_count=$((deviation_count + 1))
else
  echo "WARN: Gruppe 3 (Claim-Status-Label 'verified') nicht wie erwartet gefunden" >&2
fi

# --- Gruppe 4: App-User-Konten-Status-Label (4 byte-identische Implementierungen) ---
ACCOUNT_STATUS_FILES=(
  "frontend/src/app/admin/users/AdminUsersClient.tsx"
  "frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx"
  "frontend/src/app/admin/users/tabs/UserOverviewTab.tsx"
  "frontend/src/app/admin/roles/RoleHoldersTable.tsx"
)
account_status_impls=0
for f in "${ACCOUNT_STATUS_FILES[@]}"; do
  if grep -qF "disabled" "$f" 2>/dev/null && grep -qF "'Deaktiviert'" "$f" 2>/dev/null; then
    account_status_impls=$((account_status_impls + 1))
  else
    echo "WARN: App-User-Status-Mapping nicht gefunden in $f" >&2
  fi
done
if [ "$account_status_impls" -ge 2 ]; then
  group_count=$((group_count + 1))
fi

# --- Gruppe 5: Release-Version-Medien-Review-State-Label (2 byte-identische Implementierungen) ---
if grep -qF "'Bestätigt'" "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx" && \
   grep -qF "'Bestätigt'" "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx"; then
  group_count=$((group_count + 1))
else
  echo "WARN: Gruppe 5 (Release-Version-Medien-Review-State) nicht wie erwartet gefunden" >&2
fi

# --- Gruppe 6: Rollenlabel (zentral + korrekte Wiederverwendung) ---
if grep -qF "export function labelForRole" "frontend/src/lib/roleCatalog.ts" && \
   grep -qF "labelForRole" "frontend/src/components/contributions/contributionRoles.ts"; then
  group_count=$((group_count + 1))
else
  echo "WARN: Gruppe 6 (Rollenlabel-Zentralisierung) nicht wie erwartet gefunden" >&2
fi

# --- Totes Produktionscode-Duplikat: nur per eigener Testdatei importiert ---
dead_duplicate_count=0
if [ "$(grep -rln "segmenteTabUtils" frontend/src/ 2>/dev/null | grep -vc "segmenteTabUtils.ts$\|SegmenteTab.test.tsx$")" -eq 0 ]; then
  dead_duplicate_count=$((dead_duplicate_count + 1))
else
  echo "WARN: segmenteTabUtils.ts wird jetzt doch von Produktionscode importiert — Dokument prüfen" >&2
fi
if [ "$(grep -rln "ReleaseVersionMediaGallery" frontend/src/ 2>/dev/null | grep -vc "ReleaseVersionMediaGallery.tsx$\|ReleaseVersionMediaGallery.test.tsx$")" -eq 0 ]; then
  dead_duplicate_count=$((dead_duplicate_count + 1))
else
  echo "WARN: ReleaseVersionMediaGallery.tsx wird jetzt doch von Produktionscode importiert — Dokument prüfen" >&2
fi

echo "Untersuchte Label-Funktionsgruppen: $group_count von 6"
echo "Gefundene Verhaltensabweichungen: $deviation_count von 3"
echo "App-User-Status-Implementierungen gefunden: $account_status_impls von 4"
echo "Tote Produktionscode-Duplikate (nur Testdatei-Import): $dead_duplicate_count von 2"
