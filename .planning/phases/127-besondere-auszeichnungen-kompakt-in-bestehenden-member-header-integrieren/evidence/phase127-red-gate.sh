#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
phase_dir=.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren
log_dir="$phase_dir/evidence/127-01-red-logs"
mkdir -p "$log_dir"
log="$log_dir/${mode}.log"

case "$mode" in
  hero-page)
    expected=6
    files=(src/components/profile/MemberProfileHero.test.tsx 'src/app/members/[slug]/page.test.tsx')
    titles=(
      'Phase 127 RED hero renders no gap then Historical alone with approved decorative artwork'
      'Phase 127 RED hero renders Allrounder alone with Hexagon fallback and no invented image'
      'Phase 127 RED hero renders both once in catalog order as a static nonfocusable list'
      'Phase 127 RED hero rejects Verified Founding role and unknown while Verifiziert stays once'
      'Phase 127 RED hero CSS normalizes slots and wraps without responsive overflow'
      'Phase 127 RED page forwards public badges through one cached request and suppresses legacy Special'
    )
    ;;
  chain-artwork)
    expected=2
    files=(src/components/profile/MemberBadgeChain.test.tsx src/components/profile/badgeArtwork.test.ts)
    titles=(
      'Phase 127 RED chain suppresses legacy Special while preserving five retained groups'
      'Phase 127 RED artwork preserves every current mapping and fallback branch'
    )
    ;;
  *) echo 'usage: phase127-red-gate.sh hero-page|chain-artwork' >&2; exit 64 ;;
esac

set +e
docker compose exec -T team4sv30-frontend npx vitest run "${files[@]}" --reporter=verbose --testNamePattern='Phase 127 RED' >"$log" 2>&1
test_exit=$?
set -e
test "$test_exit" -ne 0 || { echo 'RED gate rejected a passing suite' >&2; exit 1; }
grep -Eq "Tests[[:space:]]+${expected} failed" "$log" || { echo 'RED gate rejected unexpected failure count' >&2; exit 1; }
for title in "${titles[@]}"; do
  grep -Fq "$title" "$log" || { echo "RED gate missing named failure: $title" >&2; exit 1; }
done
if grep -Eq 'Failed Suites|Unhandled Errors|SyntaxError|Transform failed|timed out|No test files found|0 test' "$log"; then
  echo 'RED gate rejected suite/import/transform/syntax/timeout/unhandled failure' >&2
  exit 1
fi
if grep -Eq 'Cannot find module|Failed to resolve import' "$log" && ! grep -Fq './badgeArtwork' "$log"; then
  echo 'RED gate rejected an unexpected missing module' >&2
  exit 1
fi
echo "Phase 127 exact RED accepted: $mode ($expected failures)"
