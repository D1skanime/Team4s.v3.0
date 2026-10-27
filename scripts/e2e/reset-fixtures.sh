#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) UND die von
# provision-fixtures.mjs angelegte DB-Fixture tatsaechlich zurueck.
#
# Teil 1 (DB, team4s_v2): Vor JEDER Mutation (auch vor den Keycloak-
# Loeschungen in Teil 2) wird die Zielgruppe exakt verifiziert - ihre ID
# (aus dem Manifest) MUSS zusammen mit slug = 'e2e-gruppe-a' UND
# kuerzel = 'e2e-fixture-261026-wve' auf genau eine reale Zeile in
# fansub_groups passen (dieselben festen Konstanten, mit denen
# provision-fixtures.mjs die Gruppe erzeugt - siehe dortiges GROUP-Objekt).
# Fehlt ein Pflichtfeld im Manifest, ist es nicht rein numerisch, oder
# weicht slug/kuerzel der gefundenen Zeile ab, bricht das GESAMTE Skript
# sofort ab (Exit 1, klare Meldung) - es findet dann ueberhaupt KEINE
# Mutation statt, auch nicht die Keycloak-Loeschung in Teil 2. Die
# anschliessende DELETE-Anweisung trägt dieselben drei Bedingungen zusaetzlich
# selbst im WHERE (atomar, nicht nur vorher geprueft) - eine zwischen Pruefung
# und Loeschung veraenderte Zeile wuerde die DELETE-Anweisung also ebenfalls
# nicht treffen. Alles (Legacy-Bridge-Zeilen, app_users, historischer
# Eintrag, Gruppe) laeuft in einer einzigen Transaktion. NIE ein TRUNCATE,
# NIE ein schemaweiter Reset, im selben Muster wie
# scripts/reset-member-profile-fixture.sh.
#
# app_users werden dabei fuer ALLE 5 erlaubten E2E-Adressen
# (e2e-admin/leader/deputy/member/user@team4s.test) geloescht, nicht nur
# fuer die drei im Manifest verzeichneten Gruppenmitglieder - e2e-admin und
# e2e-user haben nie einen Eintrag im Manifest (admin wird nicht Mitglied
# der Gruppe, user bekommt seinen app_users-Datensatz erst durch den
# Playwright-Lauf selbst), hatten aber ebenso einen echten Login und damit
# einen eigenen app_users-Datensatz. Identifikation ausschliesslich ueber
# exakte E-Mail-Gleichheit (niemals LIKE/Muster) - eine Zeile mit
# abweichender E-Mail wird nie angefasst.
#
# Teil 2 (Keycloak): loescht die 5 Konten (ueber die eigene kcadm-Admin-
# Session, unabhaengig von e2e-admins eigenem Passwort) und entfernt die
# lokale Secrets-Datei, damit scripts/e2e/provision.sh beim naechsten Lauf
# eine komplett frische Fixture samt frischer Passwoerter anlegt. Vor jeder
# Keycloak-Mutation wird ebenfalls die exakt erwartete @team4s.test-E-Mail
# des per Username gefundenen Kontos geprueft - ein Nicht-E2E-Konto mit
# zufaellig demselben Username (z. B. ein reales "e2e-admin@team4s.de")
# wird dadurch NIE veraendert oder geloescht.
#
# Hintergrund zur fruher gewaehlten (und verworfenen) reinen Konten-Reset-
# Variante ohne DB-Loeschung: DeleteFansub lehnt jede Loeschung ueber die
# HTTP-API mit 409 ab, solange die Gruppe Live- oder historische
# Mitgliedschaften hat, und die Admin-API bietet dafuer KEINEN Hard-Delete
# an (verifiziert ueber eine vollstaendige Durchsicht aller registrierten
# Routen in backend/cmd/server/{admin_routes,routes_public}.go). Ein reiner
# Konten-Reset liess die DB-Fixture deshalb vollstaendig unangetastet und
# stellte sie beim naechsten Login per verifiziertem E-Mail-Resubjecting
# (D-07) nur wieder her, statt sie zurueckzusetzen - deshalb die direkte,
# eng ID-beschraenkte SQL-Loeschung unten.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

MANIFEST="scripts/e2e/fixtures.manifest.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"
REALM="team4s"

# Dieselben festen Konstanten wie in provision-fixtures.mjs' GROUP-Objekt -
# die Zielgruppe muss auf GENAU diese Werte passen, nicht nur auf das, was
# im Manifest selbst steht (ein manipuliertes Manifest koennte sonst seinen
# eigenen group_slug faelschen).
EXPECTED_SLUG="e2e-gruppe-a"
EXPECTED_KUERZEL="e2e-fixture-261026-wve"

# Alle 5 erlaubten E2E-Adressen - fest, nicht vom Manifest abgeleitet, damit
# auch e2e-admin/e2e-user (nie im Manifest) zuverlaessig erfasst werden.
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
if [[ "$HAVE_MANIFEST" == true ]]; then
  GROUP_ID=$(jq -r '.fansub_group_id // ""' "$MANIFEST")
  HIST_MEMBER_ID=$(jq -r '.members.member.historical_member_id // ""' "$MANIFEST")
  LEADER_APP_USER_ID=$(jq -r '.members.leader.app_user_id // ""' "$MANIFEST")
  DEPUTY_APP_USER_ID=$(jq -r '.members.deputy.app_user_id // ""' "$MANIFEST")
  MEMBER_APP_USER_ID=$(jq -r '.members.member.app_user_id // ""' "$MANIFEST")

  # Alle fuenf Felder sind Pflicht (ein vollstaendiges, von provision-
  # fixtures.mjs geschriebenes Manifest hat sie immer zusammen) und muessen
  # rein numerisch sein, bevor ueberhaupt eine DB- oder Keycloak-Verbindung
  # aufgemacht wird - ein fehlendes oder verfaelschtes Feld bricht das
  # GESAMTE Skript ab, OHNE jede Mutation (auch Teil 2 unten wird dann nie
  # erreicht).
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

  # Datenbank-Identitaet pruefen, bevor irgendeine Abfrage/Mutation erfolgt -
  # dieselbe billige Absicherung wie in scripts/reset-member-profile-fixture.sh.
  IDENTITY=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -c "SELECT current_database();" < /dev/null)
  if [[ "$IDENTITY" != "team4s_v2" ]]; then
    echo "FEHLER: unerwartete Datenbank-Identitaet '${IDENTITY}'. Abbruch ohne jede Mutation." >&2
    exit 1
  fi

  # Vor JEDER Mutation (auch vor den Keycloak-Loeschungen in Teil 2) wird
  # die Zielgruppe exakt verifiziert: id + slug + kuerzel muessen zusammen
  # auf genau eine reale Zeile passen. psqls :var-Substitution greift nur
  # im Skriptmodus (Heredoc/Stdin), NICHT bei -c - deshalb hier wie bei den
  # DELETEs unten ein Heredoc.
  GROUP_CHECK=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
    -At -F'|' -v group_id="$GROUP_ID" <<'SQL'
SELECT slug, kuerzel FROM fansub_groups WHERE id = :group_id;
SQL
)
  if [[ -z "$GROUP_CHECK" ]]; then
    echo "FEHLER: Gruppe ${GROUP_ID} (aus dem Manifest) existiert nicht (mehr). Abbruch ohne jede Mutation." >&2
    exit 1
  fi
  ACTUAL_SLUG="${GROUP_CHECK%%|*}"
  ACTUAL_KUERZEL="${GROUP_CHECK#*|}"
  if [[ "$ACTUAL_SLUG" != "$EXPECTED_SLUG" || "$ACTUAL_KUERZEL" != "$EXPECTED_KUERZEL" ]]; then
    echo "FEHLER: Gruppe ${GROUP_ID} hat slug='${ACTUAL_SLUG}' kuerzel='${ACTUAL_KUERZEL}', erwartet slug='${EXPECTED_SLUG}' kuerzel='${EXPECTED_KUERZEL}'. Das ist vermutlich nicht die eigene E2E-Fixture. Abbruch ohne jede Mutation." >&2
    exit 1
  fi

  # Eine einzige Transaktion fuer alles: Legacy-Bridge-Zeilen + app_users
  # (alle 5 e2e-*@team4s.test-Adressen, exakte E-Mail-Gleichheit, niemals
  # LIKE/Muster), historischer Eintrag (scoped auf fansub_group_id) und die
  # Gruppe selbst - deren DELETE dieselben drei verifizierten Bedingungen
  # (id + slug + kuerzel) nochmal selbst im WHERE traegt, atomar statt nur
  # vorher geprueft. app_users.legacy_user_id verweist auf die Alt-Tabelle
  # users (eigenes uq_users_username, siehe createLegacyUserBridge in
  # backend/internal/repository/app_auth_repository.go); app_users -> users
  # ist ON DELETE SET NULL, ein alleiniges DELETE FROM app_users wuerde die
  # Bridge-Zeile NIE mitentfernen und sie bliebe als Datenmuell liegen
  # (reproduziert in einer frueheren Runde: "duplicate key value violates
  # unique constraint uq_users_username" bei Wiederverwendung desselben
  # Keycloak-Subjects). hist_fansub_group_members.fansub_group_id ist
  # ON DELETE RESTRICT und muss daher vor fansub_groups geloescht werden;
  # fansub_groups -> fansub_group_members -> fansub_group_member_roles sowie
  # app_users -> fansub_group_members sind ON DELETE CASCADE verkettet
  # (Migration 0073) und raeumen Live-Mitgliedschaften/-Rollen automatisch ab.
  DELETE_RESULT=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
    -v group_id="$GROUP_ID" -v hist_id="$HIST_MEMBER_ID" \
    -v expected_slug="$EXPECTED_SLUG" -v expected_kuerzel="$EXPECTED_KUERZEL" <<SQL
BEGIN;
DELETE FROM users WHERE id IN (
  SELECT legacy_user_id FROM app_users
  WHERE email = ANY(${E2E_EMAILS_SQL_ARRAY}) AND legacy_user_id IS NOT NULL
);
DELETE FROM app_users WHERE email = ANY(${E2E_EMAILS_SQL_ARRAY});
DELETE FROM hist_fansub_group_members WHERE id = :hist_id AND fansub_group_id = :group_id;
DELETE FROM fansub_groups WHERE id = :group_id AND slug = :'expected_slug' AND kuerzel = :'expected_kuerzel';
COMMIT;
SQL
)
  echo "${DELETE_RESULT}"

  # Letzte "DELETE n"-Zeile gehoert zur fansub_groups-Anweisung (4. und
  # letztes DELETE im Skript oben) - faellt sie auf 0, hat die atomare
  # WHERE-Bedingung (id + slug + kuerzel) entgegen der soeben erfolgten
  # Vorab-Pruefung nicht gegriffen (z. B. durch eine echte, extrem seltene
  # Aenderung zwischen Pruefung und Loeschung). Die Transaktion ist dann
  # bereits committed (die anderen drei DELETEs liefen durch) - das Manifest
  # bleibt in diesem Fall trotzdem erhalten UND das Skript bricht mit
  # Fehler ab, statt einen nicht erfolgten Gruppen-Reset zu verschweigen.
  LAST_DELETE_COUNT=$(printf '%s\n' "$DELETE_RESULT" | grep -oE '^DELETE [0-9]+$' | tail -1 | awk '{print $2}')
  if [[ "$LAST_DELETE_COUNT" != "1" ]]; then
    echo "FEHLER: DELETE FROM fansub_groups traf ${LAST_DELETE_COUNT:-0} Zeilen statt der erwarteten 1 - die atomare id+slug+kuerzel-Bedingung griff nicht trotz erfolgreicher Vorab-Pruefung. Manifest bleibt erhalten." >&2
    exit 1
  fi

  rm -f "$MANIFEST"
  echo "DB-Fixture entfernt: Fansub-Gruppe ${GROUP_ID} (slug=${EXPECTED_SLUG}, kuerzel=${EXPECTED_KUERZEL}, inkl. Live-Mitgliedschaften/-Rollen per CASCADE), historischer Eintrag ${HIST_MEMBER_ID} und app_users/Legacy-Bridge-Zeilen fuer alle 5 e2e-*@team4s.test-Adressen geloescht. Manifest entfernt: ${MANIFEST}"
fi

# ---- Teil 2: Keycloak-Konten tatsaechlich zuruecksetzen --------------------
# Nutzt dieselbe kcadm-Admin-Session wie provision-keycloak-users.sh
# (KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD aus der Container-Umgebung) -
# funktioniert unabhaengig davon, ob e2e-admins eigenes Passwort noch
# bekannt/gueltig ist, weil es NICHT ueber ein per Login erzeugtes Token
# laeuft, sondern ueber die Keycloak-Admin-CLI selbst. Wird nur erreicht,
# wenn Teil 1 (falls ein Manifest vorlag) vollstaendig und ohne Abbruch
# durchgelaufen ist.
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
