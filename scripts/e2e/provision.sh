#!/usr/bin/env bash
# scripts/e2e/provision.sh
#
# Einziger Einstiegspunkt fuer die komplette E2E-Fixture-Provisionierung:
# ruft zuerst die Keycloak-Benutzeranlage (Task 1) auf, laedt danach die so
# sichergestellte Secrets-Datei und uebergibt die Passwoerter als Umgebung
# an die API-getriebene DB-Fixture-Provisionierung (Task 2). Sowohl
# scripts/e2e.sh als auch ein Mensch/Agent, der nur die Fixtures erneuern
# will, rufen ausschliesslich DIESES Skript auf.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

SECRETS_FILE="$HOME/.config/team4s-e2e.env"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env-defaults.sh"

bash "$SCRIPT_DIR/provision-keycloak-users.sh"

set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

export E2E_PASSWORD_ADMIN E2E_PASSWORD_LEADER E2E_PASSWORD_DEPUTY E2E_PASSWORD_MEMBER E2E_PASSWORD_USER

node "$SCRIPT_DIR/provision-fixtures.mjs"
