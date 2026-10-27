#!/usr/bin/env bash
# scripts/e2e/provision-keycloak-users.sh
#
# Legt die 5 dedizierten Playwright-E2E-Testkonten (@team4s.test) im laufenden
# Keycloak-Container idempotent an und pflegt deren Passwoerter in einer
# lokalen, nicht versionierten Secrets-Datei. Nur `e2e-admin` erhaelt die
# Realm-Rolle `platform_admin`. Niemals ein Passwort in Logs/Ausgaben/Commits
# - der einzige dauerhafte Speicherort ist `~/.config/team4s-e2e.env` (0600,
# ausserhalb des Repos). Erneutes Ausfuehren ist ein No-Op fuer bereits
# vorhandene Konten (gleicher Zielzustand bei jedem Lauf).
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

REALM="team4s"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"

# role:email Paare - bewusst keine Bash-assoziative Arrays, damit das Skript
# auch unter einer minimalen bash lauffaehig bleibt.
ACCOUNTS=(
  "admin:e2e-admin@team4s.test"
  "leader:e2e-leader@team4s.test"
  "deputy:e2e-deputy@team4s.test"
  "member:e2e-member@team4s.test"
  "user:e2e-user@team4s.test"
)

log() { echo "[e2e-provision] $*"; }

# ---- Secrets-Datei sicherstellen + fehlende Passwoerter einmalig erzeugen --
mkdir -p "$HOME/.config"
touch "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"

for entry in "${ACCOUNTS[@]}"; do
  role="${entry%%:*}"
  role_upper=$(printf '%s' "$role" | tr '[:lower:]' '[:upper:]')
  key="E2E_PASSWORD_${role_upper}"
  if ! grep -q "^${key}=" "$SECRETS_FILE"; then
    pw="$(openssl rand -base64 24)"
    printf '%s=%s\n' "$key" "$pw" >> "$SECRETS_FILE"
  fi
done

# In die eigene Umgebung laden, damit $E2E_PASSWORD_ADMIN etc. unten
# verfuegbar sind - niemals den Dateiinhalt selbst ausgeben.
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

# ---- Keycloak-Admin-Session einmalig aufbauen -----------------------------
# KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD kommen aus der eigenen, bereits
# injizierten Umgebung des keycloak-Containers - daher per `sh -c` IM
# Container expandiert, der Host liest dafuer nicht die lokale .env.
docker compose exec -T keycloak sh -c \
  '/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"' \
  >/dev/null

# ---- Pro Konto: idempotent anlegen, Passwort setzen, ggf. Rolle vergeben --
# Hinweis: Das Team4s-Keycloak-Realm hat ein eigenes User-Profile
# (infra/keycloak/team4s-users-profile.json), dessen `username`-Feld ein
# Zeichenmuster ohne `@` erzwingt und ein Pflichtattribut `fansubName`
# verlangt (wie bei den bestehenden *@team4s.de/.local-Konten, siehe
# `csubs-leader`). Der waehrend des Logins verwendete Identifier bleibt die
# volle E-Mail-Adresse (`loginWithEmailAllowed=true` im Realm) - nur das
# Keycloak-interne `username`-Feld selbst ist der blanke lokale Teil davor.
for entry in "${ACCOUNTS[@]}"; do
  role="${entry%%:*}"
  email="${entry#*:}"
  username="${email%%@*}"
  role_upper=$(printf '%s' "$role" | tr '[:lower:]' '[:upper:]')
  pw_var="E2E_PASSWORD_${role_upper}"
  pw="${!pw_var}"
  role_label=$(printf '%s' "$role" | sed 's/^./\U&/')

  existing=$(docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r "$REALM" -q username="$username")
  existing_count=$(printf '%s' "$existing" | jq 'length')
  if [[ "$existing_count" -gt 0 ]]; then
    # Ein Treffer per Username allein ist KEIN Beweis, dass es sich um das
    # eigene E2E-Konto handelt - ein reales, unabhaengig angelegtes Konto
    # koennte zufaellig denselben lokalen Namensteil vor dem "@" haben (z. B.
    # "e2e-admin@team4s.de" statt "e2e-admin@team4s.test"). Vor jeder
    # Mutation (Passwort setzen, Rolle vergeben) wird deshalb die exakt
    # erwartete E-Mail-Adresse geprueft; bei Abweichung bricht das Skript
    # ohne jede Mutation an diesem Konto ab.
    existing_email=$(printf '%s' "$existing" | jq -r '.[0].email // ""')
    if [[ "$existing_email" != "$email" ]]; then
      echo "FEHLER: Keycloak-User mit username '${username}' existiert bereits, aber mit abweichender E-Mail '${existing_email}' (erwartet '${email}'). Kein Nicht-E2E-Konto wird veraendert - Abbruch ohne Mutation an diesem Konto." >&2
      exit 1
    fi
  else
    docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh create users -r "$REALM" \
      -s username="$username" \
      -s email="$email" \
      -s enabled=true \
      -s emailVerified=true \
      -s firstName=E2E \
      -s lastName="$role_label" \
      -s 'attributes.fansubName=["'"$username"'"]' >/dev/null
  fi

  # Passwort immer (idempotent) auf den aktuellen Secrets-Wert setzen.
  # Einzel-quotiert, damit $1/$E2E_PW erst IM Container expandieren - das
  # Passwort reist ausschliesslich ueber die -e Env-Injektion, nie als
  # literales argv (kein ps/Shell-History-Leak).
  docker compose exec -T -e E2E_PW="$pw" keycloak sh -c \
    '/opt/keycloak/bin/kcadm.sh set-password -r '"$REALM"' --username "$1" --new-password "$E2E_PW"' \
    sh "$username" >/dev/null

  if [[ "$role" == "admin" ]]; then
    docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh add-roles -r "$REALM" \
      --uusername "$username" --rolename platform_admin >/dev/null
    log "${email}: ensured (role=platform_admin)"
  else
    log "${email}: ensured"
  fi
done

log "all 5 e2e-* accounts ensured; secrets file: ${SECRETS_FILE}"
