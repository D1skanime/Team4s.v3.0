#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) UND die von
# provision-fixtures.mjs angelegte DB-Fixture tatsaechlich zurueck.
#
# Teil 1 (DB, team4s_v2):
#
# Die Fixture-Gruppe wird IMMER ueber ihre feste, verifizierte Identitaet
# gesucht - slug = 'e2e-gruppe-a' UND kuerzel = 'e2e-fixture-261026-wve'
# (dieselben Konstanten, mit denen provision-fixtures.mjs die Gruppe
# erzeugt) - UNABHAENGIG davon, ob ueberhaupt ein lokales Manifest
# existiert. Damit setzt ein Reset ohne Manifest (z. B. weil eine
# vorherige Provisionierung abgebrochen ist, bevor sie das Manifest je
# schrieb, die Secrets-Datei aber schon da ist) trotzdem die DB-Fixture
# zurueck, statt nur die Keycloak-Konten zu loeschen und die DB-Zeilen
# liegen zu lassen.
#
# Existiert zusaetzlich ein Manifest, muss es alle fuenf Pflichtfelder
# (fansub_group_id, historical_member_id, die drei app_user_id-Felder)
# vollstaendig und numerisch enthalten, SEINE fansub_group_id muss exakt
# auf die oben gefundene, verifizierte Gruppe passen, UND fuer jedes der
# drei app_user_id-Felder wird VOR jeder Mutation per SELECT geprueft, dass
# der jeweilige app_users-Datensatz tatsaechlich die fuer diese Rolle
# erwartete E-Mail trägt - ein manipuliertes Manifest mit der ID eines
# fremden app_users (egal ob numerisch gueltig) bricht damit ab, OHNE dass
# diese ID je in einer Mutation verwendet wird. Fehlt ein Pflichtfeld, ist
# es nicht numerisch, passt die Gruppen-ID nicht, oder stimmt auch nur eine
# der drei E-Mails nicht exakt, bricht das GESAMTE Skript ab (Exit 1, keine
# Mutation, auch nicht die Keycloak-Loeschung in Teil 2).
#
# Die eigentliche Loeschung (Legacy-Bridge-Zeilen, app_users fuer alle 5
# erlaubten E2E-Adressen, historischer Eintrag, Gruppe) laeuft danach in
# EINER Transaktion. Die Gruppen-Loeschung selbst ist ein PL/pgSQL-DO-Block,
# der die Zeilenzahl der eigenen DELETE-Anweisung per GET DIAGNOSTICS
# prueft und bei != 1 eine Exception auslöst - das bricht die gesamte
# Transaktion SERVERSEITIG ab (kein COMMIT erreicht die Bridge-/app_users-/
# Historie-Loeschungen, wenn die Gruppen-Loeschung nicht exakt eine Zeile
# traf), nicht nur eine nachtraegliche Client-seitige Pruefung nach einem
# bereits erfolgten COMMIT. psql laeuft mit -v ON_ERROR_STOP=1 und liefert
# in diesem Fall einen Exit-Code != 0, den dieses Skript auswertet, bevor
# es das Manifest entfernt.
#
# app_users werden fuer ALLE 5 erlaubten E2E-Adressen
# (e2e-admin/leader/deputy/member/user@team4s.test) geloescht, nicht nur
# fuer die drei Gruppenmitglieder - e2e-admin und e2e-user haben nie einen
# Eintrag im Manifest (admin wird nicht Mitglied der Gruppe, user bekommt
# seinen app_users-Datensatz erst durch den Playwright-Lauf selbst).
# Identifikation ausschliesslich ueber exakte E-Mail-Gleichheit (niemals
# LIKE/Muster).
#
# Teil 2 (Keycloak): loescht die 5 Konten (ueber die eigene kcadm-Admin-
# Session, unabhaengig von e2e-admins eigenem Passwort) und entfernt die
# lokale Secrets-Datei. Wird nur erreicht, wenn Teil 1 vollstaendig und
# ohne Abbruch durchgelaufen ist. Vor jeder Keycloak-Mutation wird ebenso
# die exakt erwartete @team4s.test-E-Mail des per Username gefundenen
# Kontos geprueft.
#
# Hintergrund zur fruher gewaehlten (und verworfenen) reinen Konten-Reset-
# Variante ohne DB-Loeschung: DeleteFansub lehnt jede Loeschung ueber die
# HTTP-API mit 409 ab, solange die Gruppe Live- oder historische
# Mitgliedschaften hat, und die Admin-API bietet dafuer KEINEN Hard-Delete
# an (verifiziert ueber eine vollstaendige Durchsicht aller registrierten
# Routen in backend/cmd/server/{admin_routes,routes_public}.go) - deshalb
# die direkte, eng auf die eigene Fixture-Identitaet beschraenkte
# SQL-Loeschung unten, im selben Muster wie
# scripts/reset-member-profile-fixture.sh. NIE ein TRUNCATE, NIE ein
# schemaweiter Reset.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
REALM="team4s"

# Dieselben festen Konstanten wie in provision-fixtures.mjs' GROUP-Objekt.
# Reine Literale ohne Anführungszeichen/Sonderzeichen - werden unten direkt
# in SQL-Text eingesetzt (siehe Begruendung beim DO-Block weiter unten).
EXPECTED_SLUG="e2e-gruppe-a"
EXPECTED_KUERZEL="e2e-fixture-261026-wve"

# Alle 5 erlaubten E2E-Adressen - fest, nicht vom Manifest abgeleitet.
E2E_EMAILS_SQL_ARRAY="ARRAY['e2e-admin@team4s.test','e2e-leader@team4s.test','e2e-deputy@team4s.test','e2e-member@team4s.test','e2e-user@team4s.test']"

HAVE_MANIFEST=false
[[ -f "$MANIFEST" ]] && HAVE_MANIFEST=true
HAVE_SECRETS=false
[[ -f "$SECRETS_FILE" ]] && HAVE_SECRETS=true

if [[ "$HAVE_MANIFEST" == false && "$HAVE_SECRETS" == false ]]; then
  echo "Kein Fixture-Manifest und keine Secrets-Datei gefunden - nichts zurueckzusetzen."
  exit 0
fi

# ---- Teil 1: DB-Fixture gezielt loeschen (NIE TRUNCATE) -------------------

# Datenbank-Identitaet pruefen, bevor irgendeine Abfrage/Mutation erfolgt -
# dieselbe billige Absicherung wie in scripts/reset-member-profile-fixture.sh.
IDENTITY=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -c "SELECT current_database();" < /dev/null)
if [[ "$IDENTITY" != "team4s_v2" ]]; then
  echo "FEHLER: unerwartete Datenbank-Identitaet '${IDENTITY}'. Abbruch ohne jede Mutation." >&2
  exit 1
fi

# Die Fixture-Gruppe wird IMMER ueber ihre feste Identitaet gesucht, egal
# ob ein Manifest existiert - das ist die alleinige Quelle der Wahrheit
# fuer "welche Gruppe ist das", nicht eine vom Manifest behauptete ID.
REAL_GROUP_ID=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At \
  -v expected_slug="$EXPECTED_SLUG" -v expected_kuerzel="$EXPECTED_KUERZEL" <<'SQL'
SELECT id FROM fansub_groups WHERE slug = :'expected_slug' AND kuerzel = :'expected_kuerzel';
SQL
)

if [[ "$HAVE_MANIFEST" == true ]]; then
  GROUP_ID=$(jq -r '.fansub_group_id // ""' "$MANIFEST")
  HIST_MEMBER_ID=$(jq -r '.members.member.historical_member_id // ""' "$MANIFEST")
  LEADER_APP_USER_ID=$(jq -r '.members.leader.app_user_id // ""' "$MANIFEST")
  DEPUTY_APP_USER_ID=$(jq -r '.members.deputy.app_user_id // ""' "$MANIFEST")
  MEMBER_APP_USER_ID=$(jq -r '.members.member.app_user_id // ""' "$MANIFEST")

  # Alle fuenf Felder sind Pflicht (ein vollstaendiges, von provision-
  # fixtures.mjs geschriebenes Manifest hat sie immer zusammen) und muessen
  # rein numerisch sein, bevor ueberhaupt eine weitere Pruefung erfolgt.
  for id_check in "fansub_group_id:$GROUP_ID" "historical_member_id:$HIST_MEMBER_ID" \
                  "members.leader.app_user_id:$LEADER_APP_USER_ID" \
                  "members.deputy.app_user_id:$DEPUTY_APP_USER_ID" \
                  "members.member.app_user_id:$MEMBER_APP_USER_ID"; do
    id_label="${id_check%%:*}"
    id_value="${id_check#*:}"
    if [[ -z "$id_value" || "$id_value" == "null" || ! "$id_value" =~ ^[0-9]+$ ]]; then
      echo "FEHLER: Pflichtfeld '${id_label}' im Manifest fehlt oder ist nicht rein numerisch (wert='${id_value}'). Abbruch ohne jede Mutation." >&2
      exit 1
    fi
  done

  # Die vom Manifest behauptete Gruppen-ID muss exakt der ueber die feste
  # Identitaet gefundenen echten Gruppe entsprechen - ein Manifest, das auf
  # eine andere (oder keine) Gruppe zeigt, ist nicht vertrauenswuerdig.
  if [[ -z "$REAL_GROUP_ID" || "$GROUP_ID" != "$REAL_GROUP_ID" ]]; then
    echo "FEHLER: Manifest verweist auf fansub_group_id=${GROUP_ID}, die verifizierte E2E-Fixture-Gruppe (slug='${EXPECTED_SLUG}' kuerzel='${EXPECTED_KUERZEL}') hat aber id='${REAL_GROUP_ID:-"(keine gefunden)"}'. Abbruch ohne jede Mutation." >&2
    exit 1
  fi

  # Vor BEGIN: jedes der drei manifestierten app_user_id-Felder wird gegen
  # die fuer diese Rolle exakt erwartete E-Mail geprueft - eine manipulierte
  # oder stale ID, die zu einem fremden/falschen app_users-Datensatz
  # gehoert, bricht hier ab, OHNE dass diese ID je in einer Mutation
  # verwendet wird (die eigentliche Loeschung unten identifiziert app_users
  # ohnehin ausschliesslich per E-Mail, nicht per ID - diese Pruefung ist
  # eine reine Vertrauenswuerdigkeits-Pruefung des Manifests selbst).
  declare -A EXPECTED_ROLE_EMAIL=(
    [leader]="$LEADER_APP_USER_ID:e2e-leader@team4s.test"
    [deputy]="$DEPUTY_APP_USER_ID:e2e-deputy@team4s.test"
    [member]="$MEMBER_APP_USER_ID:e2e-member@team4s.test"
  )
  for role_key in leader deputy member; do
    entry="${EXPECTED_ROLE_EMAIL[$role_key]}"
    app_user_id="${entry%%:*}"
    expected_email="${entry#*:}"
    actual_email=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
      -At -v id="$app_user_id" <<'SQL'
SELECT email FROM app_users WHERE id = :id;
SQL
)
    if [[ -z "$actual_email" ]]; then
      echo "FEHLER: Manifest verweist fuer ${role_key} auf app_users ${app_user_id}, die Zeile existiert aber nicht (mehr). Abbruch ohne jede Mutation." >&2
      exit 1
    fi
    if [[ "$actual_email" != "$expected_email" ]]; then
      echo "FEHLER: Manifest verweist fuer ${role_key} auf app_users ${app_user_id} mit E-Mail '${actual_email}', erwartet '${expected_email}'. Abbruch ohne jede Mutation." >&2
      exit 1
    fi
  done
else
  echo "Kein Fixture-Manifest gefunden - Fixture-Gruppe wird ausschliesslich ueber ihre feste Identitaet (slug/kuerzel) ermittelt."
fi

if [[ -z "$REAL_GROUP_ID" ]]; then
  echo "Keine Fixture-Gruppe (slug='${EXPECTED_SLUG}' kuerzel='${EXPECTED_KUERZEL}') gefunden - DB-Gruppen-/Historie-Teil wird uebersprungen."
fi

# Eine einzige Transaktion fuer alles: Legacy-Bridge-Zeilen + app_users
# (alle 5 e2e-*@team4s.test-Adressen, exakte E-Mail-Gleichheit, niemals
# LIKE/Muster), historischer Eintrag (scoped auf die verifizierte
# fansub_group_id, falls eine Gruppe gefunden wurde) und die Gruppe selbst.
# Die Gruppen-Loeschung steckt in einem PL/pgSQL-DO-Block, der die
# Zeilenzahl der eigenen DELETE-Anweisung per GET DIAGNOSTICS prueft und
# bei != 1 eine Exception auslöst - das bricht die GESAMTE Transaktion
# serverseitig ab (kein COMMIT erreicht irgendeine der vorherigen
# Loeschungen), falls die atomare id+slug+kuerzel-Bedingung entgegen der
# soeben erfolgten Vorab-Pruefung nicht genau eine Zeile trifft. psqls
# :var-Substitution greift NICHT innerhalb von $-quotierten PL/pgSQL-
# Bloecken (empirisch verifiziert) - REAL_GROUP_ID/EXPECTED_SLUG/
# EXPECTED_KUERZEL werden deshalb direkt als Bash-Text eingesetzt; alle
# drei sind an dieser Stelle bereits als rein numerisch (REAL_GROUP_ID
# kommt aus einer eigenen SQL-Abfrage, keine Freitext-Benutzereingabe) bzw.
# feste, von diesem Skript selbst definierte Konstanten verifiziert -
# keine Interpolation von Fremdeingaben. app_users.legacy_user_id verweist
# auf die Alt-Tabelle users (eigenes uq_users_username, siehe
# createLegacyUserBridge in backend/internal/repository/
# app_auth_repository.go); app_users -> users ist ON DELETE SET NULL, ein
# alleiniges DELETE FROM app_users wuerde die Bridge-Zeile NIE mitentfernen
# (reproduziert in einer frueheren Runde: "duplicate key value violates
# unique constraint uq_users_username" bei Wiederverwendung desselben
# Keycloak-Subjects). hist_fansub_group_members.fansub_group_id ist
# ON DELETE RESTRICT und muss daher vor fansub_groups geloescht werden;
# fansub_groups -> fansub_group_members -> fansub_group_member_roles sowie
# app_users -> fansub_group_members sind ON DELETE CASCADE verkettet
# (Migration 0073) und raeumen Live-Mitgliedschaften/-Rollen automatisch ab.
GROUP_SQL=""
if [[ -n "$REAL_GROUP_ID" ]]; then
  GROUP_SQL="
DELETE FROM hist_fansub_group_members WHERE fansub_group_id = ${REAL_GROUP_ID};
DO \$guard\$
DECLARE
  affected integer;
BEGIN
  DELETE FROM fansub_groups WHERE id = ${REAL_GROUP_ID} AND slug = '${EXPECTED_SLUG}' AND kuerzel = '${EXPECTED_KUERZEL}';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'fansub_groups delete affected % rows, expected exactly 1 (id=${REAL_GROUP_ID} slug=${EXPECTED_SLUG} kuerzel=${EXPECTED_KUERZEL})', affected;
  END IF;
END
\$guard\$;
"
fi

set +e
DELETE_OUTPUT=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 <<SQL
BEGIN;
DELETE FROM users WHERE id IN (
  SELECT legacy_user_id FROM app_users
  WHERE email = ANY(${E2E_EMAILS_SQL_ARRAY}) AND legacy_user_id IS NOT NULL
);
DELETE FROM app_users WHERE email = ANY(${E2E_EMAILS_SQL_ARRAY});
${GROUP_SQL}
COMMIT;
SQL
)
DELETE_STATUS=$?
set -e
echo "${DELETE_OUTPUT}"

if [[ "$DELETE_STATUS" -ne 0 ]]; then
  echo "FEHLER: DB-Loeschung ist fehlgeschlagen/wurde abgebrochen (psql exit=${DELETE_STATUS}) - die Transaktion wurde serverseitig zurueckgerollt, keine Mutation hat stattgefunden. Manifest bleibt erhalten." >&2
  exit 1
fi

[[ "$HAVE_MANIFEST" == true ]] && rm -f "$MANIFEST"
echo "DB-Fixture entfernt: Fansub-Gruppe ${REAL_GROUP_ID:-"(keine)"} (slug=${EXPECTED_SLUG}, kuerzel=${EXPECTED_KUERZEL}, inkl. historischem Eintrag und Live-Mitgliedschaften/-Rollen per CASCADE) und app_users/Legacy-Bridge-Zeilen fuer alle 5 e2e-*@team4s.test-Adressen geloescht. Manifest entfernt (falls vorhanden)."

# ---- Teil 2: Keycloak-Konten tatsaechlich zuruecksetzen --------------------
# Nutzt dieselbe kcadm-Admin-Session wie provision-keycloak-users.sh
# (KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD aus der Container-Umgebung) -
# funktioniert unabhaengig davon, ob e2e-admins eigenes Passwort noch
# bekannt/gueltig ist, weil es NICHT ueber ein per Login erzeugtes Token
# laeuft, sondern ueber die Keycloak-Admin-CLI selbst. Wird nur erreicht,
# wenn Teil 1 vollstaendig und ohne Abbruch durchgelaufen ist.
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
echo "Reset abgeschlossen: ${DELETED_COUNT}/5 Keycloak-Konten geloescht, DB-Fixture entfernt (siehe oben)."
