#!/usr/bin/env bash
set -u

ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
PHASE_DIR=.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren
EVIDENCE="$PHASE_DIR/evidence"
LOG_DIR="$EVIDENCE/127-03-validation-logs"
LEDGER="$EVIDENCE/127-03-validation-ledger.tsv"
JSON="$EVIDENCE/127-03-validation-ledger.json"
mkdir -p "$LOG_DIR"
printf 'id\targv\tstarted_at\tended_at\texit_status\tlog_sha256\tclassification\n' > "$LEDGER"

classify() {
  local id=$1 status=$2 log=$3
  if [ "$status" -eq 0 ]; then printf PASS; return; fi
  case "$id" in
    focused)
      if grep -Eq 'renders independent family cards with authoritative progressbar values|keeps SSR carousel content while expensive listeners remain dormant|keeps retained collection families rendering after Special suppression|renders all contribution families with progress' "$log"; then printf INHERITED_BASELINE; else printf PHASE127_REGRESSION; fi ;;
    typecheck|build)
      if grep -Eq '\.next/dev/types|MemberBadgeChain\.test\.tsx.*badgeProgress|Type.*is not assignable to type.*PageProps' "$log"; then printf INHERITED_BASELINE; else printf PHASE127_REGRESSION; fi ;;
    full_tests)
      if grep -Eq 'ResponsiveImage\.config\.test|ReleaseVersionNotesTab\.test|ReleaseGallery\.test|renders independent family cards with authoritative progressbar values|keeps SSR carousel content while expensive listeners remain dormant|MemberBadgeChain' "$log"; then printf INHERITED_BASELINE; else printf PHASE127_REGRESSION; fi ;;
    *) printf PHASE127_REGRESSION ;;
  esac
}

run_gate() {
  local id=$1; shift
  local log="$LOG_DIR/$id.log" start end status hash classification argv
  start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  argv=$(printf '%q ' "$@")
  set +e
  "$@" >"$log" 2>&1
  status=$?
  set +e
  end=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  hash=$(sha256sum "$log" | awk '{print $1}')
  classification=$(classify "$id" "$status" "$log")
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$id" "$argv" "$start" "$end" "$status" "$hash" "$classification" >> "$LEDGER"
}

set +e
run_gate focused docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberProfileHero.test.tsx 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts src/components/profile/badgeArtwork.test.ts src/components/ui/FocalCarousel.test.tsx
run_gate typecheck docker compose exec -T team4sv30-frontend npm run typecheck
run_gate lint docker compose exec -T team4sv30-frontend npm run lint
run_gate full_tests docker compose exec -T team4sv30-frontend npm test
run_gate build docker compose exec -T team4sv30-frontend npm run build
run_gate worktree_diff_check git diff --check
run_gate cached_diff_check git diff --cached --check
run_gate protected_hashes sha256sum -c "$EVIDENCE/127-02-protected-outgoing-sha256.txt"
run_gate phase127_path_set bash -c 'test "$(git show --pretty=format: --name-only 93cef0b3 | sed "/^$/d" | sort)" = "$(printf "%s\n" "frontend/src/app/members/[slug]/page.tsx" frontend/src/components/profile/MemberBadgeChain.tsx frontend/src/components/profile/MemberProfileHero.tsx frontend/src/components/profile/badgeArtwork.ts frontend/src/components/profile/profile.module.css | sort)"'
run_gate cached_baseline_delta bash -c 'test "$(git write-tree)" = "$(git rev-parse HEAD^{tree})" && git merge-base --is-ancestor 93cef0b3 HEAD'
set +e

python3 - "$LEDGER" "$JSON" <<'PY'
import csv,json,sys
with open(sys.argv[1], newline='') as f: rows=list(csv.DictReader(f, delimiter='\t'))
with open(sys.argv[2],'w') as f: json.dump(rows,f,indent=2)
PY

required='focused typecheck lint full_tests build worktree_diff_check cached_diff_check protected_hashes phase127_path_set cached_baseline_delta'
for id in $required; do grep -q "^$id\t" "$LEDGER" || exit 1; test -f "$LOG_DIR/$id.log" || exit 1; done
if grep -q $'\tPHASE127_REGRESSION$' "$LEDGER"; then exit 1; fi
exit 0
