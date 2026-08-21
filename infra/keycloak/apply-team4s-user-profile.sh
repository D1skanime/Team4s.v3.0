#!/bin/sh
set -eu

server_url="${KEYCLOAK_INTERNAL_URL:-http://keycloak:8080}"
realm="${KEYCLOAK_REALM:-team4s}"
admin_user="${KEYCLOAK_ADMIN:-admin}"
admin_password="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
profile_file="/opt/keycloak/data/import/team4s-users-profile.json"
kcadm="/opt/keycloak/bin/kcadm.sh"

test -s "$profile_file"

"$kcadm" config credentials \
  --server "$server_url" \
  --realm master \
  --user "$admin_user" \
  --password "$admin_password" >/dev/null

# Realm imports are skipped once the persistent realm already exists. Apply the
# versioned Team4s user-profile contract separately and idempotently so a
# restarted local stack cannot fall back to Keycloak's first/last-name form.
"$kcadm" update users/profile -r "$realm" -f "$profile_file"

live_profile="$($kcadm get users/profile -r "$realm")"
printf '%s\n' "$live_profile" | grep -q '"name" : "fansubName"'
printf '%s\n' "$live_profile" | grep -q '"name" : "email"'

echo "Team4s Keycloak user-profile contract applied."
