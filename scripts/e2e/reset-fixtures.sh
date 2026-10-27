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
# Mitgliedschaften hat (backend/internal/repository/release_version_group_guard.go
# FansubGroupDependencySummary.HasAny() zaehlt Memberships UND
# HistoricalMembers, backend/internal/repository/fansub_repository_groups_delete.go
# D-12 prueft das VOR jeder Loeschung). Fuer Live-Mitgliedschaften
# (fansub_group_members) bietet die Admin-API bewusst keinen Hard-Delete-
# Endpunkt an (nur Status-Updates zwischen 'active'/'disabled', die Zeile
# bleibt in der Zaehlung bestehen) - "E2E Gruppe A" kann nach dem ersten
# provision.sh-Lauf strukturell NIE wieder ueber diesen Endpunkt vollstaendig
# geloescht werden, solange die Live-App-Mitgliedschaften bestehen. Das ist
# eine beabsichtigte Schutzmassnahme des Backends, keine Luecke dieses
# Skripts - ABER: dieser 409 bedeutet, dass KEIN Reset stattgefunden hat.
# Das Skript behandelt ihn deshalb als Fehlschlag (Exit 1) und behaelt das
# Manifest, statt einen nicht erfolgten Reset als Erfolg zu melden und die
# einzige Quelle zu verlieren, die die verbleibenden Daten als eigene
# Fixture ausweist (siehe provision-fixtures.mjs ensureGroup()).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env-defaults.sh"
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
# set +e um die Zuweisung, weil "set -e" + "pipefail" sonst bei einem
# fehlschlagenden curl (falsches/veraltetes Admin-Passwort nach
# Secrets-Rotation, Keycloak nicht erreichbar) das Skript sofort beendet,
# BEVOR die folgende, aussagekraeftige Fehlermeldung je erreicht wird -
# ohne jede Diagnose fuer einen autonomen Agenten/CI-Lauf.
set +e
TOKEN_RESPONSE=$(printf 'grant_type=password&client_id=%s&username=e2e-admin@team4s.test&password=%s' \
    "$KC_CLIENT" "$ENCODED_PW" \
  | curl -sf --data-binary @- -H "Content-Type: application/x-www-form-urlencoded" \
    "${E2E_KC_BASE}/realms/${REALM}/protocol/openid-connect/token")
CURL_STATUS=$?
set -e
if [[ "$CURL_STATUS" -ne 0 ]]; then
  echo "Konnte kein Admin-Token fuer den Reset beziehen (curl exit=${CURL_STATUS}, Keycloak unter ${E2E_KC_BASE} erreichbar? Passwort in ${SECRETS_FILE} noch gueltig?)." >&2
  exit 1
fi
TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Konnte kein Admin-Token fuer den Reset beziehen (Antwort ohne access_token)." >&2
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
      echo "FEHLSCHLAG: Fansub-Gruppe ${GROUP_ID} hat weiterhin eigene Live-/historische Mitgliedschaften und wird vom Backend-Sicherheitsmechanismus (D-12) nicht geloescht. Die Admin-API bietet keinen Hard-Delete fuer Live-Mitgliedschaften an - ein vollstaendiger Reset ist strukturell nicht moeglich, solange diese bestehen. Die Fixture-Daten bleiben unveraendert, das Manifest wird NICHT entfernt (es ist weiterhin der einzige Nachweis, dass Gruppe ${GROUP_ID} diese E2E-Fixture ist)." >&2
      exit 1
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
