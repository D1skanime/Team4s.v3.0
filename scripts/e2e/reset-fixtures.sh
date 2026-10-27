#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) tatsaechlich
# zurueck: loescht sie aus Keycloak (ueber die eigene kcadm-Admin-Session,
# UNABHAENGIG von e2e-admins eigenem Passwort) und entfernt die lokale
# Secrets-Datei, damit scripts/e2e/provision.sh beim naechsten Lauf fuenf
# frische Konten mit neu erzeugten Passwoertern anlegt. Niemals ein
# Passwort in Logs/Ausgaben/Commits, niemals eine rohe SQL-Anweisung
# (siehe CONTEXT.md: "Kein TRUNCATE, kein DB-Reset").
#
# DB-Fixture-Teil (bestes Bemuehen, kein Fehler bei Fehlschlag): DeleteFansub
# weist jede Loeschung mit 409 "fansub_group_has_dependents" zurueck, solange
# die Gruppe noch echte Live- oder historische Mitgliedschaften hat
# (backend/internal/repository/release_version_group_guard.go
# FansubGroupDependencySummary.HasAny() zaehlt beide unconditional,
# backend/internal/repository/fansub_repository_groups_delete.go D-12 prueft
# das VOR jeder Loeschung). Fuer Live-Mitgliedschaften (fansub_group_members)
# bietet die Admin-API KEINEN Hard-Delete-Endpunkt an (nur Status-Updates
# zwischen 'active'/'disabled', die Zeile bleibt in der Zaehlung bestehen) -
# verifiziert durch eine vollstaendige Durchsicht aller registrierten Routen
# in backend/cmd/server/{admin_routes,routes_public}.go: keine DELETE-Route
# fuer app-members, keine fuer app_users, kein Self-Service-"Leave-Group"-
# Endpunkt. "E2E Gruppe A" kann also strukturell NIE wieder vollstaendig
# geloescht werden, sobald sie Live-Mitgliedschaften hat (ab dem ersten
# erfolgreichen provision.sh-Lauf immer der Fall) - das ist eine
# beabsichtigte Schutzmassnahme des Backends, keine Luecke dieses Skripts.
# Deshalb liegt der tatsaechliche, garantiert funktionierende Reset auf den
# Keycloak-KONTEN: backend/internal/repository/app_auth_repository.go
# EnsureAppUserForIdentity "resubjected" einen bestehenden app_users-
# Datensatz per verifizierter E-Mail-Uebereinstimmung auf einen neuen
# keycloak_subject (D-07) - ein frisch angelegtes Keycloak-Konto mit
# derselben E-Mail haengt sich beim naechsten echten Login automatisch
# wieder an genau denselben App-User samt all seinen Gruppenrollen. Die
# DB-Fixture-Daten (Gruppe, Mitgliedschaften, historischer Eintrag) bleiben
# deshalb bewusst unangetastet, wenn der Hard-Delete nicht moeglich ist -
# das Manifest bleibt in diesem Fall ebenfalls erhalten, weil es weiterhin
# der einzige Nachweis ist, dass die verbleibende Gruppe diese E2E-Fixture
# ist (siehe provision-fixtures.mjs ensureGroup()).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
REALM="team4s"
KC_CLIENT="team4s-frontend"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_env-defaults.sh"

HAVE_MANIFEST=false
[[ -f "$MANIFEST" ]] && HAVE_MANIFEST=true
HAVE_SECRETS=false
[[ -f "$SECRETS_FILE" ]] && HAVE_SECRETS=true

if [[ "$HAVE_MANIFEST" == false && "$HAVE_SECRETS" == false ]]; then
  echo "Kein Fixture-Manifest und keine Secrets-Datei gefunden - nichts zurueckzusetzen."
  exit 0
fi

# ---- Teil 1: DB-Fixture-Gruppe, bestes Bemuehen (kein Fehler bei 409) -----
if [[ "$HAVE_MANIFEST" == true ]]; then
  GROUP_ID=$(jq -r '.fansub_group_id' "$MANIFEST")
  if [[ -z "$GROUP_ID" || "$GROUP_ID" == "null" ]]; then
    echo "Manifest enthaelt keine gueltige fansub_group_id - DB-Fixture-Teil wird uebersprungen." >&2
  elif [[ "$HAVE_SECRETS" == false ]]; then
    echo "Keine Secrets-Datei vorhanden - kann kein e2e-admin-Token fuer den DB-Loeschversuch beziehen, Gruppe ${GROUP_ID} bleibt unangetastet."
  else
    set -a
    # shellcheck disable=SC1090
    source "$SECRETS_FILE"
    set +a

    # Passwort reist per stdin in curl (niemals als literales -d/--data argv),
    # damit es nicht in ps/Prozesslisten auftaucht - dasselbe Prinzip wie die
    # -e Env-Injektion unten. Vor dem Einsetzen in den form-urlencoded Body
    # muss das Passwort selbst percent-encodiert werden: openssl rand -base64
    # erzeugt teils "+"/"/"/"=" - unkodiert wuerde der Keycloak-Token-Endpunkt
    # ein "+" als Leerzeichen lesen und das Login mit "invalid_grant" ablehnen.
    ENCODED_PW=$(printf '%s' "${E2E_PASSWORD_ADMIN:-}" | jq -sRr '@uri')
    set +e
    TOKEN_RESPONSE=$(printf 'grant_type=password&client_id=%s&username=e2e-admin@team4s.test&password=%s' \
        "$KC_CLIENT" "$ENCODED_PW" \
      | curl -sf --data-binary @- -H "Content-Type: application/x-www-form-urlencoded" \
        "${E2E_KC_BASE}/realms/${REALM}/protocol/openid-connect/token")
    CURL_STATUS=$?
    set -e
    TOKEN=""
    if [[ "$CURL_STATUS" -eq 0 ]]; then
      TOKEN=$(printf '%s' "$TOKEN_RESPONSE" | jq -r '.access_token')
    fi

    if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
      echo "Konnte kein Admin-Token fuer den DB-Loeschversuch beziehen (curl exit=${CURL_STATUS}) - Gruppe ${GROUP_ID} bleibt unangetastet, kein Fehler."
    else
      RESPONSE_FILE=$(mktemp)
      trap 'rm -f "$RESPONSE_FILE"' EXIT
      STATUS=$(curl -s -o "$RESPONSE_FILE" -w '%{http_code}' -X DELETE \
        -H "Authorization: Bearer $TOKEN" \
        "${E2E_API_BASE}/api/v1/fansubs/${GROUP_ID}")

      case "$STATUS" in
        2??|404)
          echo "Fansub-Gruppe ${GROUP_ID} entfernt (oder bereits nicht mehr vorhanden, status=${STATUS})."
          rm -f "$MANIFEST"
          echo "Manifest entfernt: ${MANIFEST}"
          ;;
        409)
          REASON_CODE=$(jq -r '.error.code // ""' "$RESPONSE_FILE" 2>/dev/null || true)
          if [[ "$REASON_CODE" == "fansub_group_has_dependents" ]]; then
            echo "Fansub-Gruppe ${GROUP_ID} hat weiterhin Live-/historische Mitgliedschaften - strukturell kein Hard-Delete moeglich (siehe Kopf-Kommentar). Gruppe und Manifest bleiben unveraendert, das ist erwartet."
          else
            echo "DELETE /api/v1/fansubs/${GROUP_ID} lieferte unerwarteten 409 (code=${REASON_CODE}) - Gruppe bleibt unangetastet, kein Fehler."
          fi
          ;;
        *)
          echo "DELETE /api/v1/fansubs/${GROUP_ID} lieferte unerwarteten status ${STATUS} - Gruppe bleibt unangetastet, kein Fehler."
          ;;
      esac
    fi
  fi
fi

# ---- Teil 2: Keycloak-Konten tatsaechlich zuruecksetzen --------------------
# Nutzt dieselbe kcadm-Admin-Session wie provision-keycloak-users.sh
# (KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD aus der Container-Umgebung) -
# funktioniert unabhaengig davon, ob e2e-admins eigenes Passwort noch
# bekannt/gueltig ist, weil es NICHT ueber ein per Login erzeugtes Token
# laeuft, sondern ueber die Keycloak-Admin-CLI selbst.
ACCOUNTS=(
  "admin:e2e-admin@team4s.test"
  "leader:e2e-leader@team4s.test"
  "deputy:e2e-deputy@team4s.test"
  "member:e2e-member@team4s.test"
  "user:e2e-user@team4s.test"
)

docker compose exec -T keycloak sh -c \
  '/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"' \
  >/dev/null

DELETED_COUNT=0
for entry in "${ACCOUNTS[@]}"; do
  email="${entry#*:}"
  username="${email%%@*}"
  existing=$(docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r "$REALM" -q username="$username")
  user_id=$(printf '%s' "$existing" | jq -r '.[0].id // ""')
  if [[ -n "$user_id" ]]; then
    docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh delete "users/${user_id}" -r "$REALM" >/dev/null
    echo "Keycloak-Konto ${email} geloescht."
    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done

if [[ "$DELETED_COUNT" -eq 0 ]]; then
  echo "Keine der 5 e2e-*@team4s.test-Konten existierten in Keycloak - nichts zu loeschen."
fi

rm -f "$SECRETS_FILE"
echo "Secrets-Datei entfernt: ${SECRETS_FILE} (naechster provision.sh-Lauf erzeugt 5 frische Passwoerter)."
echo "Reset abgeschlossen: ${DELETED_COUNT}/5 Keycloak-Konten geloescht. DB-Fixture-Daten bleiben bestehen, sofern Live-Mitgliedschaften existieren (siehe oben) - sie haengen sich beim naechsten echten Login ueber die verifizierte E-Mail automatisch wieder an dieselben App-User-Datensaetze."
