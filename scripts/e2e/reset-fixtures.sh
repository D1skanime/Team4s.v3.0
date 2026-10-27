#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Entfernt ausschliesslich die eine Fansub-Gruppe, die
# scripts/e2e/fixtures.manifest.json als von provision-fixtures.mjs
# erzeugt ausweist, ueber den bestehenden Endpunkt DELETE /fansubs/:id.
# Loescht nie Keycloak-Benutzer, nie eine andere Tabelle als die dieser
# eine DELETE-Aufruf selbst erreicht, und niemals per roher SQL-Anweisung
# (siehe CONTEXT.md: "Kein TRUNCATE, kein DB-Reset"). Ein fehlendes
# Manifest ist kein Fehler, sondern "nichts zu tun".
#
# DeleteFansub weist jede Loeschung mit 409 "fansub_group_has_dependents"
# zurueck, solange die Gruppe noch echte Live- oder historische
# Mitgliedschaften hat (backend/internal/repository/fansub_repository_groups_delete.go,
# Datenintegritaets-Sicherung D-12) - und fuer Live-Mitgliedschaften
# (fansub_group_members) bietet die Admin-API bewusst keinen Hard-Delete-
# Endpunkt an (nur Status/Rollen-Updates), sodass "E2E Gruppe A" nach dem
# ersten provision.sh-Lauf nie wieder ueber diesen Endpunkt vollstaendig
# loeschbar ist. Das ist eine beabsichtigte Schutzmassnahme des Backends,
# keine Luecke dieses Skripts - also wird dieser 409 hier als regulaeres
# Zielergebnis behandelt (Gruppe bleibt bestehen, naechster
# provision.sh-Lauf erkennt sie wie gewohnt wieder), statt als Fehler.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
E2E_KC_BASE="${E2E_KC_BASE:-http://127.0.0.1:18081}"
E2E_API_BASE="${E2E_API_BASE:-http://127.0.0.1:18092}"
REALM="team4s"
KC_CLIENT="team4s-frontend"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Kein Fixture-Manifest gefunden - nichts zurueckzusetzen."
  exit 0
fi

GROUP_ID=$(jq -r '.fansub_group_id' "$MANIFEST")
if [[ -z "$GROUP_ID" || "$GROUP_ID" == "null" ]]; then
  echo "Manifest enthaelt keine gueltige fansub_group_id - nichts zurueckzusetzen." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

# Passwort reist per stdin in curl (niemals als literales -d/--data argv),
# damit es nicht in ps/Prozesslisten auftaucht - dasselbe Prinzip wie die
# -e Env-Injektion in provision-keycloak-users.sh. Vor dem Einsetzen in den
# form-urlencoded Body muss das Passwort selbst percent-encodiert werden:
# openssl rand -base64 erzeugt teils "+"/"/"/"=" - unkodiert wuerde der
# Keycloak-Token-Endpunkt ein "+" als Leerzeichen lesen und das Login mit
# "invalid_grant" ablehnen. jq liest das Passwort hierfuer per stdin (nicht
# argv), damit der Wert auch beim Kodieren nie in einer Prozessliste auftaucht.
ENCODED_PW=$(printf '%s' "$E2E_PASSWORD_ADMIN" | jq -sRr '@uri')
TOKEN_RESPONSE=$(printf 'grant_type=password&client_id=%s&username=e2e-admin@team4s.test&password=%s' \
    "$KC_CLIENT" "$ENCODED_PW" \
  | curl -sf --data-binary @- -H "Content-Type: application/x-www-form-urlencoded" \
    "${E2E_KC_BASE}/realms/${REALM}/protocol/openid-connect/token")
TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Konnte kein Admin-Token fuer den Reset beziehen." >&2
  exit 1
fi

RESPONSE_FILE=$(mktemp)
trap 'rm -f "$RESPONSE_FILE"' EXIT
STATUS=$(curl -s -o "$RESPONSE_FILE" -w '%{http_code}' -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "${E2E_API_BASE}/api/v1/fansubs/${GROUP_ID}")

case "$STATUS" in
  2??|404)
    echo "Fansub-Gruppe ${GROUP_ID} entfernt (oder bereits nicht mehr vorhanden, status=${STATUS})."
    ;;
  409)
    REASON_CODE=$(jq -r '.error.code // ""' "$RESPONSE_FILE" 2>/dev/null || true)
    if [[ "$REASON_CODE" == "fansub_group_has_dependents" ]]; then
      echo "Fansub-Gruppe ${GROUP_ID} hat weiterhin eigene Live-/historische Mitgliedschaften und wird vom Backend-Sicherheitsmechanismus (D-12) nicht geloescht - das ist beabsichtigt, die Gruppe bleibt bestehen."
    else
      echo "DELETE /api/v1/fansubs/${GROUP_ID} lieferte unerwarteten 409 (code=${REASON_CODE})." >&2
      exit 1
    fi
    ;;
  *)
    echo "DELETE /api/v1/fansubs/${GROUP_ID} lieferte unerwarteten status ${STATUS}." >&2
    exit 1
    ;;
esac

rm -f "$MANIFEST"
echo "Manifest entfernt: ${MANIFEST}"
