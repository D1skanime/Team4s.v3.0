#!/usr/bin/env bash
# scripts/reset-member-profile-fixture.sh
#
# Phase 134-05 (Wave 4) — triple-guarded, narrowly-scoped reset for the
# Phase 129/134 member-profile fixture data on the shared team4s_v2 database.
# Implements CONTEXT.md D-05: this is the ONLY point in Phase 134 the live
# shared database is actually reset, and it runs after Plan 134-04's green
# gate has already proven the fixture/migration/matrix all work.
#
# Deletes ONLY rows carrying this fixture's own identifying prefixes
# (seed129- group slugs, "Seed129 Anime %" titles, and the two reference
# members' own story-image media created by Plan 134-01 Step 11), in
# FK-safe child-to-parent order, then re-runs the Plan-134-01 seed script to
# recreate a clean sheppert/csubs-leader state -- proving PMQA-01's
# "idempotent, reproducible from a clean state" claim is genuinely real.
#
# NEVER issues a schema-wide wipe statement. NEVER deletes a row from
# members. Mirrors the triple guard in
# scripts/reset-local-schema-cutover-data.ps1 (confirm flag, database
# identity check, RUNTIME_PROFILE check), plus a SECOND explicit typed
# confirmation phrase beyond the flag, since this script runs against the
# live shared database (unlike the local-only PS1 analog).
#
# Usage:
#   bash scripts/reset-member-profile-fixture.sh --confirm-local
#   (then type the confirmation phrase exactly when prompted)

set -euo pipefail

CONFIRM_PHRASE_EXPECTED="RESET SEED129-134 FIXTURES"

# ---- Guard 1: explicit destructive-intent flag -----------------------------
if [[ "${1:-}" != "--confirm-local" ]]; then
  echo "Refusing to reset data without --confirm-local. This script is destructive and local-dev only." >&2
  exit 1
fi

# ---- Guard 2: database identity --------------------------------------------
IDENTITY=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -F"$(printf '\t')" -c "SELECT current_database(), current_user;" < /dev/null)
EXPECTED_IDENTITY="$(printf 'team4s_v2\tteam4s')"
if [[ "$IDENTITY" != "$EXPECTED_IDENTITY" ]]; then
  echo "Refusing to reset unexpected database identity: $IDENTITY" >&2
  exit 1
fi

# ---- Guard 3: backend RUNTIME_PROFILE --------------------------------------
RUNTIME_PROFILE=$(docker compose exec -T team4sv30-backend printenv RUNTIME_PROFILE < /dev/null 2>/dev/null || true)
RUNTIME_PROFILE=$(printf '%s' "$RUNTIME_PROFILE" | tr -d '[:space:]')
case "$RUNTIME_PROFILE" in
  local|development|dev|"") ;;
  *)
    echo "Refusing to reset while backend RUNTIME_PROFILE is '$RUNTIME_PROFILE'" >&2
    exit 1
    ;;
esac

echo "=== Identity verified: team4s_v2/team4s, RUNTIME_PROFILE='${RUNTIME_PROFILE}' ==="

# ---- Guard 4: SECOND explicit typed confirmation ---------------------------
cat <<'PLAN'
This will DELETE only rows carrying this fixture's own identifying prefixes,
in this exact child-to-parent order (never a schema-wide wipe, never members
rows):
  1. release_version_media   WHERE media_asset_id references a seed129 story-image asset (defensive; expected 0 rows)
  2. members.member_story_json/html/text CLEARED (UPDATE, not DELETE) for sheppert/csubs-leader only
  3. media_files              for that same story-image media_assets subset
  4. media_assets             for that same story-image subset (owner_member_id = sheppert/csubs-leader, file_path LIKE '/media/profile/%/story/%')
  5. anime_contribution_roles WHERE anime_contribution_id references a seed129- group contribution
  6. anime_contributions      WHERE fansub_group_id references a seed129- group
  7. hist_group_member_roles / fansub_group_member_roles WHERE ... references a seed129- group's memberships
  8. hist_fansub_group_members / fansub_group_members    WHERE fansub_group_id references a seed129- group
  9. release_role_credit_lifecycles WHERE release_version_id references the seed129- anime chain (awarded-credit rows; point_ledger_entries itself is left alone, SET NULL on release_version/fansub_group deletion)
 10. release_versions / fansub_releases / episodes        WHERE anime title LIKE 'Seed129 Anime%'
 11. anime                     WHERE title LIKE 'Seed129 Anime%'
 12. fansub_groups              WHERE slug LIKE 'seed129-%'

The members table itself is never deleted from -- only the two reference
members' own story-image columns are cleared, since those columns hold a
dangling application-level (not FK-enforced) reference to the media_assets
rows this same cycle deletes in step 4.
PLAN
read -r -p "Type the confirmation phrase exactly to proceed: " CONFIRM_PHRASE
if [[ "$CONFIRM_PHRASE" != "$CONFIRM_PHRASE_EXPECTED" ]]; then
  echo "Confirmation phrase did not match. Aborting without executing the delete." >&2
  exit 1
fi

# ---- Execute the scoped delete in one transaction --------------------------
echo "=== Executing scoped delete ==="
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DELETE FROM release_version_media
WHERE media_asset_id IN (
  SELECT ma.id FROM media_assets ma
  JOIN members m ON m.id = ma.owner_member_id
  WHERE ma.file_path LIKE '/media/profile/%/story/%'
    AND m.public_slug IN ('sheppert', 'csubs-leader')
);

-- Clear the dangling story-image references BEFORE deleting the underlying
-- media_assets rows, so the reseed's ensureStoryImage() idempotency check
-- (which inspects member_story_json for an existing media_asset_id) sees "no
-- image present" instead of a stale/deleted asset id -- otherwise the
-- reseed's next PUT /me/profile trips the backend's IDOR check
-- (applyStoryImageLifecycle in app_profile_story_image.go) and fails. This
-- UPDATE touches only the fixture's own 3 story columns on the 2 reference
-- members identified by public_slug; it never deletes a members row and
-- never touches identity/slug/visibility columns.
UPDATE members
SET member_story_json = NULL, member_story_html = NULL, member_story_text = ''
WHERE public_slug IN ('sheppert', 'csubs-leader');

DELETE FROM media_files
WHERE media_id IN (
  SELECT ma.id FROM media_assets ma
  JOIN members m ON m.id = ma.owner_member_id
  WHERE ma.file_path LIKE '/media/profile/%/story/%'
    AND m.public_slug IN ('sheppert', 'csubs-leader')
);

DELETE FROM media_assets
WHERE id IN (
  SELECT ma.id FROM media_assets ma
  JOIN members m ON m.id = ma.owner_member_id
  WHERE ma.file_path LIKE '/media/profile/%/story/%'
    AND m.public_slug IN ('sheppert', 'csubs-leader')
);

DELETE FROM anime_contribution_roles
WHERE anime_contribution_id IN (
  SELECT id FROM anime_contributions
  WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%')
);

DELETE FROM anime_contributions
WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%');

DELETE FROM hist_group_member_roles
WHERE hist_fansub_group_member_id IN (
  SELECT id FROM hist_fansub_group_members
  WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%')
);

DELETE FROM fansub_group_member_roles
WHERE fansub_group_member_id IN (
  SELECT id FROM fansub_group_members
  WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%')
);

DELETE FROM hist_fansub_group_members
WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%');

DELETE FROM fansub_group_members
WHERE fansub_group_id IN (SELECT id FROM fansub_groups WHERE slug LIKE 'seed129-%');

-- Discovered live (Task 3 first run): release_role_credit_lifecycles has a
-- composite RESTRICT FK to release_version_groups(release_version_id,
-- fansub_group_id), which blocked the release_versions delete below via its
-- CASCADE-deleted release_version_groups child. Deleting the awarded-credit
-- lifecycle rows first (scoped to this fixture's own seed129- anime chain)
-- clears that block without touching point_ledger_entries (which SET NULLs
-- its release_version_id/fansub_group_id on release_versions/fansub_groups
-- deletion and is intentionally left alone, matching the plan's own
-- enumerated delete list).
DELETE FROM release_role_credit_lifecycles
WHERE release_version_id IN (
  SELECT rv.id FROM release_versions rv
  JOIN fansub_releases fr ON fr.id = rv.release_id
  JOIN episodes e ON e.id = fr.episode_id
  JOIN anime a ON a.id = e.anime_id
  WHERE a.title LIKE 'Seed129 Anime%'
);

DELETE FROM release_versions
WHERE release_id IN (
  SELECT fr.id FROM fansub_releases fr
  JOIN episodes e ON e.id = fr.episode_id
  JOIN anime a ON a.id = e.anime_id
  WHERE a.title LIKE 'Seed129 Anime%'
);

DELETE FROM fansub_releases
WHERE episode_id IN (
  SELECT e.id FROM episodes e
  JOIN anime a ON a.id = e.anime_id
  WHERE a.title LIKE 'Seed129 Anime%'
);

DELETE FROM episodes
WHERE anime_id IN (SELECT id FROM anime WHERE title LIKE 'Seed129 Anime%');

DELETE FROM anime WHERE title LIKE 'Seed129 Anime%';

DELETE FROM fansub_groups WHERE slug LIKE 'seed129-%';

COMMIT;
SQL

echo "=== Post-delete row counts (all expected 0) ==="
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -c "
SELECT 'fansub_groups(seed129-%)' AS label, count(*) AS remaining FROM fansub_groups WHERE slug LIKE 'seed129-%'
UNION ALL
SELECT 'anime(Seed129 Anime%)', count(*) FROM anime WHERE title LIKE 'Seed129 Anime%'
UNION ALL
SELECT 'media_assets(story subset)', count(*) FROM media_assets ma JOIN members m ON m.id = ma.owner_member_id WHERE ma.file_path LIKE '/media/profile/%/story/%' AND m.public_slug IN ('sheppert','csubs-leader');
" < /dev/null

echo "=== Re-running Plan-134-01 seed against the live shared stack ==="
docker exec team4sv30-frontend mkdir -p /tmp/fixtures < /dev/null
docker cp scripts/member-profile-fixture.manifest.json team4sv30-frontend:/tmp/member-profile-fixture.manifest.json
docker cp scripts/fixtures/seed134-story.jpg team4sv30-frontend:/tmp/fixtures/seed134-story.jpg
docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed134-reset.mjs
docker exec team4sv30-frontend node /tmp/seed134-reset.mjs < /dev/null

echo "=== Reset + reseed cycle complete ==="
