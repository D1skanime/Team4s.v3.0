#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) UND die von
# provision-fixtures.mjs angelegte DB-Fixture tatsaechlich zurueck:
#
# 1. Loescht genau die beiden manifestierten DB-Zeilen (den historischen
#    Eintrag und die Fansub-Gruppe selbst) per gezielter, auf exakte IDs aus
#    scripts/e2e/fixtures.manifest.json beschraenkter SQL-Loeschung in
#    FK-sicherer Kind-vor-Eltern-Reihenfolge - NIE ein TRUNCATE, NIE ein
#    schemaweiter Reset, genau wie scripts/reset-member-profile-fixture.sh es
#    fuer seine eigene Fixture vormacht. Die Admin-HTTP-API bietet dafuer
#    bewusst keinen Hard-Delete (siehe Kommentar weiter unten) - deshalb der
#    direkte, aber eng auf die eigenen Zeilen-IDs begrenzte SQL-Zugriff,
#    exakt im selben Muster wie das bestehende Fixture-Reset-Skript.
# 2. Loescht die 5 Keycloak-Konten (ueber die eigene kcadm-Admin-Session,
#    unabhaengig von e2e-admins eigenem Passwort) und entfernt die lokale
#    Secrets-Datei, damit scripts/e2e/provision.sh beim naechsten Lauf eine
#    komplett frische Fixture samt frischer Passwoerter anlegt.
#
# Vor jeder Keycloak-Mutation (Passwort/Rolle/Loeschung) wird die exakt
# erwartete @team4s.test-E-Mail des gefundenen Datensatzes geprueft - ein
# Nicht-E2E-Konto mit zufaellig demselben Username (z. B. ein reales
# "e2e-admin@team4s.de") wird dadurch NIE veraendert oder geloescht, das
# Skript bricht statt dessen ohne jede Mutation ab.
#
# Hintergrund zur fruher gewaehlten (und hier verworfenen) reinen Konten-
# Reset-Variante: DeleteFansub lehnt jede Loeschung ueber die HTTP-API mit
# 409 ab, solange die Gruppe Live- oder historische Mitgliedschaften hat
# (backend/internal/repository/release_version_group_guard.go
# FansubGroupDependencySummary.HasAny() zaehlt beide unconditional), und die
# Admin-API bietet fuer Live-Mitgliedschaften (fansub_group_members) KEINEN
# Hard-Delete an (nur Status-Updates, verifiziert ueber eine vollstaendige
# Durchsicht aller registrierten Routen in backend/cmd/server/
# {admin_routes,routes_public}.go: keine DELETE-Route fuer app-members/
# app_users, kein Self-Service-Leave-Endpunkt). Ein reiner Konten-Reset liess
# die DB-Fixture deshalb vollstaendig unangetastet und stellte sie beim
# naechsten Login per verifiziertem E-Mail-Resubjecting (D-07) nur wieder
# her, statt sie zurueckzusetzen - das wurde als unzureichend zurueckgewiesen.
# Die direkte, eng ID-beschraenkte SQL-Loeschung unten ist der tatsaechlich
# wirksame Reset, im selben sanktionierten Muster wie
# scripts/reset-member-profile-fixture.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
REALM="team4s"

HAVE_MANIFEST=false
[[ -f "$MANIFEST" ]] && HAVE_MANIFEST=true
HAVE_SECRETS=false
[[ -f "$SECRETS_FILE" ]] && HAVE_SECRETS=true

if [[ "$HAVE_MANIFEST" == false && "$HAVE_SECRETS" == false ]]; then
  echo "Kein Fixture-Manifest und keine Secrets-Datei gefunden - nichts zurueckzusetzen."
  exit 0
fi

# ---- Teil 1: DB-Fixture-Zeilen gezielt loeschen (NIE TRUNCATE) ------------
if [[ "$HAVE_MANIFEST" == true ]]; then
  GROUP_ID=$(jq -r '.fansub_group_id' "$MANIFEST")
  HIST_MEMBER_ID=$(jq -r '.members.member.historical_member_id // ""' "$MANIFEST")

  # Beide IDs muessen rein numerisch sein, bevor sie an psql uebergeben
  # werden - verteidigt gegen ein manuell verfaelschtes/korruptes Manifest,
  # das sonst beliebigen Text in die SQL-Variablensubstitution einschleusen
  # koennte.
  if [[ -n "$GROUP_ID" && "$GROUP_ID" != "null" && ! "$GROUP_ID" =~ ^[0-9]+$ ]]; then
    echo "FEHLER: fansub_group_id '${GROUP_ID}' im Manifest ist nicht rein numerisch - DB-Fixture-Teil wird NICHT ausgefuehrt." >&2
    exit 1
  fi
  if [[ -n "$HIST_MEMBER_ID" && "$HIST_MEMBER_ID" != "null" && ! "$HIST_MEMBER_ID" =~ ^[0-9]+$ ]]; then
    echo "FEHLER: historical_member_id '${HIST_MEMBER_ID}' im Manifest ist nicht rein numerisch - DB-Fixture-Teil wird NICHT ausgefuehrt." >&2
    exit 1
  fi

  if [[ -z "$GROUP_ID" || "$GROUP_ID" == "null" ]]; then
    echo "Manifest enthaelt keine gueltige fansub_group_id - DB-Fixture-Teil wird uebersprungen." >&2
  else
    # Datenbank-Identitaet pruefen, bevor irgendein DELETE abgesetzt wird -
    # dieselbe billige Absicherung wie in scripts/reset-member-profile-fixture.sh.
    IDENTITY=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -c "SELECT current_database();" < /dev/null)
    if [[ "$IDENTITY" != "team4s_v2" ]]; then
      echo "FEHLER: unerwartete Datenbank-Identitaet '${IDENTITY}' - DB-Fixture-Teil wird NICHT ausgefuehrt." >&2
      exit 1
    fi

    # hist_fansub_group_members.fansub_group_id ist ON DELETE RESTRICT -
    # muss vor fansub_groups geloescht werden (hist_group_member_roles
    # haengt daran per ON DELETE CASCADE und verschwindet automatisch mit).
    # fansub_groups -> fansub_group_members -> fansub_group_member_roles
    # sind alle ON DELETE CASCADE verkettet (Migration 0073), das einzelne
    # DELETE FROM fansub_groups raeumt beide automatisch mit ab. Beide
    # Bedingungen binden sich zusaetzlich an fansub_group_id, damit niemals
    # eine ID geloescht wird, die (durch einen manuell verfaelschten
    # Manifest-Inhalt) zu einer anderen Gruppe gehoert.
    if [[ -n "$HIST_MEMBER_ID" && "$HIST_MEMBER_ID" != "null" ]]; then
      docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
        -v hist_id="$HIST_MEMBER_ID" -v group_id="$GROUP_ID" <<'SQL'
BEGIN;
DELETE FROM hist_fansub_group_members WHERE id = :hist_id AND fansub_group_id = :group_id;
COMMIT;
SQL
    fi

    docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
      -v group_id="$GROUP_ID" <<'SQL'
BEGIN;
DELETE FROM fansub_groups WHERE id = :group_id;
COMMIT;
SQL

    rm -f "$MANIFEST"
    echo "DB-Fixture entfernt: Fansub-Gruppe ${GROUP_ID} (inkl. Live-Mitgliedschaften/-Rollen per CASCADE) und historischer Eintrag ${HIST_MEMBER_ID:-"-"} geloescht. Manifest entfernt: ${MANIFEST}"
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
  existing_count=$(printf '%s' "$existing" | jq 'length')
  if [[ "$existing_count" -gt 0 ]]; then
    existing_email=$(printf '%s' "$existing" | jq -r '.[0].email // ""')
    if [[ "$existing_email" != "$email" ]]; then
      echo "FEHLER: Keycloak-User mit username '${username}' existiert, aber mit abweichender E-Mail '${existing_email}' (erwartet '${email}'). Kein Nicht-E2E-Konto wird geloescht - Abbruch ohne Mutation an diesem Konto." >&2
      exit 1
    fi
    user_id=$(printf '%s' "$existing" | jq -r '.[0].id')
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
echo "Reset abgeschlossen: ${DELETED_COUNT}/5 Keycloak-Konten geloescht, DB-Fixture-Zeilen entfernt (siehe oben)."
