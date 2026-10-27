#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) UND die von
# provision-fixtures.mjs angelegte DB-Fixture tatsaechlich zurueck:
#
# 1. Loescht genau die manifestierten DB-Zeilen - die drei app_users-Konten
#    (Leitung/Stellvertretung/Mitglied, per GET /me waehrend der
#    Provisionierung entstanden und mit ihrer app_user_id ins Manifest
#    geschrieben), den historischen Eintrag und die Fansub-Gruppe selbst -
#    per gezielter, auf exakte IDs aus scripts/e2e/fixtures.manifest.json
#    beschraenkter SQL-Loeschung in FK-sicherer Kind-vor-Eltern-Reihenfolge -
#    NIE ein TRUNCATE, NIE ein schemaweiter Reset, genau wie
#    scripts/reset-member-profile-fixture.sh es fuer seine eigene Fixture
#    vormacht. Vor der Loeschung wird fuer jede app_user_id die tatsaechlich
#    gespeicherte E-Mail gegen die exakt erwartete @team4s.test-Adresse
#    geprueft - stimmt auch nur eine nicht, bricht der GESAMTE DB-Fixture-
#    Teil ohne jede Mutation ab, statt eine fremde Identitaet zu loeschen.
#    Die Admin-HTTP-API bietet fuer die Gruppen-/Mitgliedschafts-Loeschung
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
  LEADER_APP_USER_ID=$(jq -r '.members.leader.app_user_id // ""' "$MANIFEST")
  DEPUTY_APP_USER_ID=$(jq -r '.members.deputy.app_user_id // ""' "$MANIFEST")
  MEMBER_APP_USER_ID=$(jq -r '.members.member.app_user_id // ""' "$MANIFEST")

  # Alle IDs muessen rein numerisch sein, bevor sie an psql uebergeben
  # werden - verteidigt gegen ein manuell verfaelschtes/korruptes Manifest,
  # das sonst beliebigen Text in die SQL-Variablensubstitution einschleusen
  # koennte.
  for id_check in "fansub_group_id:$GROUP_ID" "historical_member_id:$HIST_MEMBER_ID" \
                  "leader.app_user_id:$LEADER_APP_USER_ID" "deputy.app_user_id:$DEPUTY_APP_USER_ID" \
                  "member.app_user_id:$MEMBER_APP_USER_ID"; do
    id_label="${id_check%%:*}"
    id_value="${id_check#*:}"
    if [[ -n "$id_value" && "$id_value" != "null" && ! "$id_value" =~ ^[0-9]+$ ]]; then
      echo "FEHLER: ${id_label} '${id_value}' im Manifest ist nicht rein numerisch - DB-Fixture-Teil wird NICHT ausgefuehrt." >&2
      exit 1
    fi
  done

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

    # Vor jeder app_users-Loeschung wird die exakt erwartete E-Mail der
    # jeweiligen ID geprueft - dieselbe Absicherung wie bei den Keycloak-
    # Konten unten. Ein manuell verfaelschtes Manifest (oder eine ID, die
    # inzwischen einem unabhaengigen echten Account zugewiesen wurde) darf
    # NIE zur Loeschung eines Nicht-E2E-app_users fuehren - bei Abweichung
    # bricht der GESAMTE DB-Fixture-Teil ohne jede Mutation ab.
    declare -A EXPECTED_APP_USER_EMAIL=(
      [leader]="$LEADER_APP_USER_ID:e2e-leader@team4s.test"
      [deputy]="$DEPUTY_APP_USER_ID:e2e-deputy@team4s.test"
      [member]="$MEMBER_APP_USER_ID:e2e-member@team4s.test"
    )
    APP_USER_IDS_TO_DELETE=()
    for role_key in leader deputy member; do
      entry="${EXPECTED_APP_USER_EMAIL[$role_key]}"
      app_user_id="${entry%%:*}"
      expected_email="${entry#*:}"
      [[ -z "$app_user_id" || "$app_user_id" == "null" ]] && continue

      # psqls :var-Substitution greift nur im Skriptmodus (Heredoc/Stdin),
      # NICHT bei -c - deshalb hier wie bei den DELETE-Anweisungen unten ein
      # Heredoc statt -c.
      actual_email=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
        -At -v id="$app_user_id" <<'SQL'
SELECT email FROM app_users WHERE id = :id;
SQL
)
      if [[ -z "$actual_email" ]]; then
        echo "app_users ${app_user_id} (${role_key}) existiert nicht mehr - nichts zu loeschen, kein Fehler."
        continue
      fi
      if [[ "$actual_email" != "$expected_email" ]]; then
        echo "FEHLER: app_users ${app_user_id} (${role_key}) hat E-Mail '${actual_email}', erwartet '${expected_email}'. DB-Fixture-Teil wird NICHT ausgefuehrt - kein Nicht-E2E-Konto wird geloescht." >&2
        exit 1
      fi
      APP_USER_IDS_TO_DELETE+=("$app_user_id")
    done

    # hist_fansub_group_members.fansub_group_id ist ON DELETE RESTRICT -
    # muss vor fansub_groups geloescht werden (hist_group_member_roles
    # haengt daran per ON DELETE CASCADE und verschwindet automatisch mit).
    # fansub_groups -> fansub_group_members -> fansub_group_member_roles
    # sind alle ON DELETE CASCADE verkettet (Migration 0073), das einzelne
    # DELETE FROM fansub_groups raeumt beide automatisch mit ab; app_users ->
    # fansub_group_members ist ebenfalls ON DELETE CASCADE verkettet
    # (dieselbe Migration), eine explizite app_users-Loeschung entfernt die
    # zugehoerige Live-Mitgliedschaft also zusaetzlich auf diesem Weg. Alle
    # Bedingungen binden sich zusaetzlich an die jeweilige ID, damit niemals
    # eine Zeile geloescht wird, die (durch einen manuell verfaelschten
    # Manifest-Inhalt) zu etwas anderem gehoert.
    if [[ "${#APP_USER_IDS_TO_DELETE[@]}" -gt 0 ]]; then
      APP_USER_ID_LIST=$(printf '%s,' "${APP_USER_IDS_TO_DELETE[@]}")
      APP_USER_ID_LIST="${APP_USER_ID_LIST%,}"
      # app_users.legacy_user_id verweist auf eine Bridge-Zeile in der
      # Alt-Tabelle users (eigenes uq_users_username, siehe
      # createLegacyUserBridge in backend/internal/repository/
      # app_auth_repository.go). app_users -> users ist ON DELETE SET NULL,
      # d. h. ein alleiniges DELETE FROM app_users wuerde diese Bridge-Zeile
      # NIE mitentfernen - sie bliebe fuer immer als Datenmuell liegen (genau
      # das geschah in einem frueheren Testlauf dieses Fixes und blockierte
      # mit "duplicate key value violates unique constraint
      # uq_users_username" eine spaetere Neuanlage, sobald derselbe Keycloak-
      # Subject je wieder vorkaeme). Die legacy_user_id wird deshalb VOR dem
      # Loeschen von app_users ausgelesen und in derselben Transaktion
      # ebenfalls geloescht (alle anderen FKs auf users sind SET NULL, die
      # Reihenfolge der beiden DELETEs ist deshalb unkritisch).
      docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
        -v app_user_ids="$APP_USER_ID_LIST" <<'SQL'
BEGIN;
DELETE FROM users WHERE id IN (
  SELECT legacy_user_id FROM app_users
  WHERE id = ANY(string_to_array(:'app_user_ids', ',')::bigint[]) AND legacy_user_id IS NOT NULL
);
DELETE FROM app_users WHERE id = ANY(string_to_array(:'app_user_ids', ',')::bigint[]);
COMMIT;
SQL
      echo "app_users (inkl. Legacy-Bridge-Zeilen) geloescht (ids: ${APP_USER_ID_LIST})."
    fi

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
    echo "DB-Fixture entfernt: Fansub-Gruppe ${GROUP_ID} (inkl. Live-Mitgliedschaften/-Rollen per CASCADE), historischer Eintrag ${HIST_MEMBER_ID:-"-"} und app_users ${APP_USER_IDS_TO_DELETE[*]:-"(keine)"} geloescht. Manifest entfernt: ${MANIFEST}"
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
