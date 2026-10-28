#!/usr/bin/env bash
# scripts/e2e/reset-fixtures.sh
#
# Setzt die 5 dedizierten E2E-Testkonten (e2e-*@team4s.test) UND die von
# provision-fixtures.mjs angelegte DB-Fixture tatsaechlich zurueck.
#
# Pflicht-Manifest (keine Ermittlung ueber slug/kuerzel als Ersatz):
#
# Ohne ein lokal vorhandenes, vollstaendiges Manifest bricht dieses Skript
# VOR JEDER MUTATION (weder DB noch Keycloak) mit Exit != 0 ab und verweist
# auf 'bash scripts/e2e/provision.sh'. Die Fixture-Gruppe wird NICHT mehr
# ersatzweise ueber ihre festen Konstanten (slug = 'e2e-gruppe-a',
# kuerzel = 'e2e-fixture-261026-wve') gesucht, wenn kein Manifest existiert
# - genau das war der zuvor behobene, aber nachweislich falsche Ansatz:
# ein Reset ohne Manifest (z. B. nur die Secrets-Datei vorhanden) darf
# NICHT auf eigene Faust eine Gruppe "erraten" und loeschen. Eine
# abgebrochene Provisionierung wird AUSSCHLIESSLICH durch das idempotente
# 'provision.sh' aufgeraeumt bzw. fortgesetzt, nie durch diesen Reset.
#
# Existiert ein Manifest, muessen alle acht Pflichtfelder (fansub_group_id,
# historical_member_id, die drei app_user_id-Felder, die drei
# member_id-Felder) vollstaendig und numerisch enthalten sein - fehlt eines
# oder ist es nicht numerisch, bricht das GESAMTE Skript ab (Exit 1, keine
# Mutation). Die Fixture-Gruppe wird danach ANHAND DER MANIFEST-ID
# gesucht; slug = 'e2e-gruppe-a' UND kuerzel = 'e2e-fixture-261026-wve'
# sind dabei nur eine ZUSAETZLICHE, atomar in derselben Abfrage/demselben
# DELETE mitgefuehrte Pruefung neben dieser ID, kein eigenstaendiger
# Ermittlungsweg - findet sich keine Zeile, die gleichzeitig die
# Manifest-ID UND beide Konstanten erfuellt, bricht das Skript ab.
#
# Reihenfolge (erst validieren, dann mutieren, zuletzt Manifest/Secrets
# entfernen): ALLE read-only Pruefungen - sowohl die DB-seitigen
# (Pflichtfelder, Gruppen-ID, Rollen-Referenzen, siehe Teil 1 unten) als
# auch die Keycloak-seitigen (Existenz + exakte E-Mail aller 5 Konten) -
# laufen VOR der ersten Mutation irgendeiner Art. Erst danach folgen die
# eigentlichen Mutationen: zuerst die DB-Transaktion (Teil 1), danach die
# Keycloak-Loeschung (Teil 2) anhand der bereits validierten Konten-IDs
# (keine erneute Pruefung mehr, die mitten in der Loeschung scheitern
# koennte). Manifest UND Secrets-Datei werden ERST entfernt, NACHDEM
# BEIDE Mutationen vollstaendig durchgelaufen sind - vorher (z. B. nach
# dem DB-COMMIT, aber vor der Keycloak-Loeschung) bricht das Skript ab,
# OHNE das Manifest zu entfernen, falls irgendetwas schiefgeht. Das war
# vor dieser Haertung anders: das Manifest wurde direkt nach dem
# DB-COMMIT geloescht, BEVOR die Keycloak-Konten ueberhaupt geprueft
# waren - eine abweichende E-Mail bei auch nur einem der 5 Konten (z. B.
# e2e-user) hatte dann einen Zustand hinterlassen, in dem DB-Fixture und
# Manifest bereits weg waren, Keycloak-Konten aber teilweise noch
# existierten, und ein erneuter Reset wegen des fehlenden Manifests
# sofort abgebrochen waere, ohne diesen Zustand je nachholen zu koennen.
#
# Teil 1 (DB, team4s_v2):
#
# Fuer alle drei Rollen (leader/deputy/member) werden die tatsaechliche
# app_users-ID UND die tatsaechliche member_id IMMER live aus der
# Datenbank aufgeloest - die member_id ausschliesslich ueber einen
# VERIFIZIERTEN member_claims-Datensatz (claim_status='verified'),
# ausgehend von der fuer die Rolle exakt erwarteten E-Mail (dieselbe
# Kette wie serverseitig beim Anlegen:
# ensureAppUserMemberAnchorTx()/upsertVerifiedAppMemberClaimTx() in
# backend/internal/repository/fansub_group_app_members_repository.go).
# Das Manifest muss dessen app_user_id UND member_id pro Rolle exakt
# dieser live aufgeloesten Referenzkette entsprechen - ein manipuliertes
# Manifest mit der ID eines fremden app_users oder einer fremden
# members-Zeile (egal ob numerisch gueltig) bricht damit ab, OHNE dass
# diese ID je in einer Mutation verwendet wird. Stimmt auch nur eine der
# Referenzen nicht exakt, bricht das GESAMTE Skript ab (Exit 1, keine
# Mutation, auch nicht die Keycloak-Loeschung in Teil 2).
#
# Die eigentliche Loeschung (Legacy-Bridge-Zeilen, app_users fuer alle 5
# erlaubten E2E-Adressen, historischer Eintrag, Gruppe, member_claims/
# members fuer die drei live aufgeloesten member_ids) laeuft danach in
# EINER Transaktion. Die Gruppen-Loeschung selbst ist ein PL/pgSQL-DO-Block,
# der die Zeilenzahl der eigenen DELETE-Anweisung per GET DIAGNOSTICS
# prueft und bei != 1 eine Exception auslöst - das bricht die gesamte
# Transaktion SERVERSEITIG ab (kein COMMIT erreicht die Bridge-/app_users-/
# Historie-/Member-Loeschungen, wenn die Gruppen-Loeschung nicht exakt eine
# Zeile traf), nicht nur eine nachtraegliche Client-seitige Pruefung nach
# einem bereits erfolgten COMMIT. psql laeuft mit -v ON_ERROR_STOP=1 und
# liefert in diesem Fall einen Exit-Code != 0, den dieses Skript auswertet,
# bevor es das Manifest entfernt.
#
# Ohne die member_claims/members-Loeschung bliebe nach jedem Reset die bei
# der Provisionierung ueber CreateWithAutoMember angelegte members-Zeile
# samt verified member_claim bestehen (member_claims.app_user_id ist ON
# DELETE SET NULL, nicht CASCADE) - jeder provision->reset->provision-
# Zyklus wuerde so weitere E2E-Fixture-Daten in team4s_v2 anhaeufen, obwohl
# der Reset die Testkonten und ihre Daten vollstaendig zuruecksetzen soll.
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
# Session, unabhaengig von e2e-admins eigenem Passwort). Existenz und
# exakte @team4s.test-E-Mail aller 5 Konten sind zu diesem Zeitpunkt
# bereits VOR der DB-Transaktion geprueft (siehe oben) - hier wird nur
# noch anhand der dabei gesammelten User-IDs geloescht, ohne erneute
# Pruefung.
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

# Kein No-op-Zweig fuer "weder Manifest noch Secrets-Datei vorhanden": die
# bindende Vorgabe verlangt bei JEDEM fehlenden oder ungueltigen Manifest
# einen Abbruch mit Exit != 0 und einen Verweis auf provision.sh - ohne
# Ausnahme fuer den Fall, dass zusaetzlich auch nichts anderes existiert.
if [[ "$HAVE_MANIFEST" == false ]]; then
  echo "FEHLER: Kein Fixture-Manifest (${MANIFEST}) gefunden - Reset bricht ab, OHNE jede DB- oder Keycloak-Mutation. Die Fixture-Gruppe wird nicht mehr ersatzweise ueber feste slug/kuerzel-Werte ermittelt. Eine abgebrochene oder unvollstaendige Provisionierung wird ausschliesslich durch 'bash scripts/e2e/provision.sh' aufgeraeumt bzw. fortgesetzt (idempotent)." >&2
  exit 1
fi

# ---- Teil 1: DB-Fixture gezielt loeschen (NIE TRUNCATE) -------------------

# Datenbank-Identitaet pruefen, bevor irgendeine Abfrage/Mutation erfolgt -
# dieselbe billige Absicherung wie in scripts/reset-member-profile-fixture.sh.
IDENTITY=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At -c "SELECT current_database();" < /dev/null)
if [[ "$IDENTITY" != "team4s_v2" ]]; then
  echo "FEHLER: unerwartete Datenbank-Identitaet '${IDENTITY}'. Abbruch ohne jede Mutation." >&2
  exit 1
fi

GROUP_ID=$(jq -r '.fansub_group_id // ""' "$MANIFEST")
HIST_MEMBER_ID=$(jq -r '.members.member.historical_member_id // ""' "$MANIFEST")
LEADER_APP_USER_ID=$(jq -r '.members.leader.app_user_id // ""' "$MANIFEST")
DEPUTY_APP_USER_ID=$(jq -r '.members.deputy.app_user_id // ""' "$MANIFEST")
MEMBER_APP_USER_ID=$(jq -r '.members.member.app_user_id // ""' "$MANIFEST")
LEADER_MEMBER_ID=$(jq -r '.members.leader.member_id // ""' "$MANIFEST")
DEPUTY_MEMBER_ID=$(jq -r '.members.deputy.member_id // ""' "$MANIFEST")
MEMBER_MEMBER_ID=$(jq -r '.members.member.member_id // ""' "$MANIFEST")

# Alle acht Felder sind Pflicht (ein vollstaendiges, von provision-
# fixtures.mjs geschriebenes Manifest hat sie immer zusammen) und muessen
# rein numerisch sein, bevor ueberhaupt eine weitere Pruefung erfolgt.
for id_check in "fansub_group_id:$GROUP_ID" "historical_member_id:$HIST_MEMBER_ID" \
                "members.leader.app_user_id:$LEADER_APP_USER_ID" \
                "members.deputy.app_user_id:$DEPUTY_APP_USER_ID" \
                "members.member.app_user_id:$MEMBER_APP_USER_ID" \
                "members.leader.member_id:$LEADER_MEMBER_ID" \
                "members.deputy.member_id:$DEPUTY_MEMBER_ID" \
                "members.member.member_id:$MEMBER_MEMBER_ID"; do
  id_label="${id_check%%:*}"
  id_value="${id_check#*:}"
  if [[ -z "$id_value" || "$id_value" == "null" || ! "$id_value" =~ ^[0-9]+$ ]]; then
    echo "FEHLER: Pflichtfeld '${id_label}' im Manifest fehlt oder ist nicht rein numerisch (wert='${id_value}'). Abbruch ohne jede Mutation." >&2
    exit 1
  fi
done

# Die Fixture-Gruppe wird ANHAND DER MANIFEST-ID gesucht - slug/kuerzel
# sind dabei nur eine ZUSAETZLICHE, in derselben Abfrage mitgefuehrte
# Pruefung, kein eigenstaendiger Ermittlungsweg (siehe Header-Kommentar).
# Findet sich keine Zeile, die gleichzeitig id=GROUP_ID UND beide
# Konstanten erfuellt, ist das Manifest nicht (mehr) vertrauenswuerdig.
REAL_GROUP_ID=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 -At \
  -v group_id="$GROUP_ID" -v expected_slug="$EXPECTED_SLUG" -v expected_kuerzel="$EXPECTED_KUERZEL" <<'SQL'
SELECT id FROM fansub_groups WHERE id = :'group_id' AND slug = :'expected_slug' AND kuerzel = :'expected_kuerzel';
SQL
)
if [[ -z "$REAL_GROUP_ID" ]]; then
  echo "FEHLER: Manifest verweist auf fansub_group_id=${GROUP_ID}, es existiert aber keine Zeile mit genau dieser ID UND slug='${EXPECTED_SLUG}' UND kuerzel='${EXPECTED_KUERZEL}'. Abbruch ohne jede Mutation." >&2
  exit 1
fi

# Vor BEGIN, fuer alle drei Rollen: die tatsaechliche app_users-E-Mail UND
# die tatsaechliche member_id werden ausschliesslich live aus der
# Datenbank aufgeloest - nicht unbesehen aus dem Manifest uebernommen. Die
# member_id wird dabei AUSSCHLIESSLICH ueber eine VERIFIZIERTE
# member_claims-Verknuepfung (claim_status='verified') aufgeloest,
# ausgehend von der exakten Rollen-E-Mail - dieselbe Kette, die
# serverseitig beim Anlegen entsteht
# (ensureAppUserMemberAnchorTx()/upsertVerifiedAppMemberClaimTx() in
# backend/internal/repository/fansub_group_app_members_repository.go):
# E-Mail -> app_users.id -> verified member_claims -> members.id. Das ist
# die geforderte Referenz-Sicherheitspruefung: eine manipulierte oder stale
# ID im Manifest, die zu einem fremden/falschen app_users- oder
# members-Datensatz gehoert, bricht hier ab, OHNE dass diese ID je in
# einer Mutation verwendet wird.
declare -A ROLE_EMAIL=(
  [leader]="e2e-leader@team4s.test"
  [deputy]="e2e-deputy@team4s.test"
  [member]="e2e-member@team4s.test"
)
declare -A REAL_APP_USER_ID
declare -A REAL_MEMBER_ID
for role_key in leader deputy member; do
  email="${ROLE_EMAIL[$role_key]}"
  resolved=$(docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -v ON_ERROR_STOP=1 \
    -At -F'|' -v email="$email" <<'SQL'
SELECT au.id, mc.member_id
FROM app_users au
LEFT JOIN member_claims mc ON mc.app_user_id = au.id AND mc.claim_status = 'verified'
WHERE au.email = :'email'
ORDER BY mc.verified_at DESC NULLS LAST, mc.id DESC
LIMIT 1;
SQL
)
  REAL_APP_USER_ID[$role_key]="${resolved%%|*}"
  REAL_MEMBER_ID[$role_key]="${resolved#*|}"

  manifest_app_user_id_var="${role_key^^}_APP_USER_ID"
  manifest_member_id_var="${role_key^^}_MEMBER_ID"
  manifest_app_user_id="${!manifest_app_user_id_var}"
  manifest_member_id="${!manifest_member_id_var}"
  if [[ -z "${REAL_APP_USER_ID[$role_key]}" || "$manifest_app_user_id" != "${REAL_APP_USER_ID[$role_key]}" ]]; then
    echo "FEHLER: Manifest verweist fuer ${role_key} auf app_users ${manifest_app_user_id}, die mit '${email}' verknuepfte echte app_users-ID ist aber '${REAL_APP_USER_ID[$role_key]:-"(keine gefunden)"}'. Abbruch ohne jede Mutation." >&2
    exit 1
  fi
  if [[ -z "${REAL_MEMBER_ID[$role_key]}" || "$manifest_member_id" != "${REAL_MEMBER_ID[$role_key]}" ]]; then
    echo "FEHLER: Manifest verweist fuer ${role_key} auf member_id ${manifest_member_id}, ueber einen verifizierten member_claim zu '${email}' aufloesbar ist aber '${REAL_MEMBER_ID[$role_key]:-"(keine gefunden)"}'. Abbruch ohne jede Mutation." >&2
    exit 1
  fi
done

# ---- Keycloak-Konten vollstaendig read-only vorab validieren --------------
# Alle 5 Konten werden JETZT geprueft (Existenz + exakte E-Mail), BEVOR
# ueberhaupt eine Mutation (DB oder Keycloak) stattfindet. Ohne diese
# Vorab-Pruefung konnte die DB-Transaktion unten bereits committen und das
# Manifest bereits entfernt werden, bevor die Keycloak-Loeschung je begann
# - scheiterte die Keycloak-Pruefung dann mitten in der spaeteren
# Loeschschleife (z. B. e2e-user mit abweichender E-Mail), blieben
# Keycloak-Konten teilweise bestehen, waehrend DB-Fixture und Manifest
# bereits weg waren; ein erneuter Reset brach danach wegen fehlendem
# Manifest ab und konnte den unvollstaendigen Zustand nie nachholen. Die
# hier gefundenen User-IDs werden fuer die tatsaechliche Loeschung in
# Teil 2 zwischengespeichert, damit dort keine erneute Pruefung (und damit
# kein erneutes Abbruchrisiko mitten in der Loeschung) mehr stattfindet.
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

declare -A KEYCLOAK_USER_ID
for entry in "${ACCOUNTS[@]}"; do
  email="${entry#*:}"
  username="${email%%@*}"
  existing=$(docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r "$REALM" -q username="$username")
  existing_count=$(printf '%s' "$existing" | jq 'length')
  if [[ "$existing_count" -gt 0 ]]; then
    existing_email=$(printf '%s' "$existing" | jq -r '.[0].email // ""')
    if [[ "$existing_email" != "$email" ]]; then
      echo "FEHLER: Keycloak-User mit username '${username}' existiert, aber mit abweichender E-Mail '${existing_email}' (erwartet '${email}'). Kein Nicht-E2E-Konto wird geloescht - Abbruch ohne jede Mutation (weder DB noch Keycloak)." >&2
      exit 1
    fi
    KEYCLOAK_USER_ID[$entry]=$(printf '%s' "$existing" | jq -r '.[0].id')
  fi
done

# Eine einzige Transaktion fuer alles: Legacy-Bridge-Zeilen + app_users
# (alle 5 e2e-*@team4s.test-Adressen, exakte E-Mail-Gleichheit, niemals
# LIKE/Muster), historischer Eintrag (scoped auf die oben verifizierte
# fansub_group_id) und die Gruppe selbst.
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

# member_claims/members fuer die drei oben live (nicht aus dem Manifest!)
# aufgeloesten, verifizierten member_ids - das ist das serverseitige
# Gegenstueck zu ensureAppUserMemberAnchorTx()/upsertVerifiedAppMemberClaimTx():
# ohne diese Loeschung bleiben members-Zeile und verified member_claim nach
# jedem Reset bestehen (member_claims.app_user_id ist ON DELETE SET NULL,
# nicht CASCADE), und jeder provision->reset->provision-Zyklus haeuft
# weitere members-Zeilen an. Reihenfolge: NACH dem Loeschen von
# hist_fansub_group_members oben (dessen member_id ist ON DELETE RESTRICT)
# und NACH dem bereits erfolgten DELETE FROM app_users (das
# fansub_group_members.member_id, ebenfalls RESTRICT, per CASCADE von
# app_users/fansub_groups mit-entfernt, Migration 0073) - an dieser Stelle
# der Transaktion referenziert keine verbleibende Zeile die zu loeschenden
# member_ids mehr per RESTRICT. member_claims wird trotz ON DELETE CASCADE
# von members explizit zuerst geloescht, nicht dem Cascade ueberlassen.
MEMBER_IDS=()
for role_key in leader deputy member; do
  if [[ -n "${REAL_MEMBER_ID[$role_key]}" ]]; then
    MEMBER_IDS+=("${REAL_MEMBER_ID[$role_key]}")
  fi
done

MEMBER_SQL=""
if [[ ${#MEMBER_IDS[@]} -gt 0 ]]; then
  MEMBER_IDS_SQL_ARRAY="ARRAY[$(IFS=,; echo "${MEMBER_IDS[*]}")]"
  MEMBER_SQL="
DELETE FROM member_claims WHERE member_id = ANY(${MEMBER_IDS_SQL_ARRAY});
DELETE FROM members WHERE id = ANY(${MEMBER_IDS_SQL_ARRAY});
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
${MEMBER_SQL}
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

echo "DB-Fixture entfernt: Fansub-Gruppe ${REAL_GROUP_ID} (slug=${EXPECTED_SLUG}, kuerzel=${EXPECTED_KUERZEL}, inkl. historischem Eintrag und Live-Mitgliedschaften/-Rollen per CASCADE), ${#MEMBER_IDS[@]} members-Identitaet(en) samt verified member_claims (member_id(s): ${MEMBER_IDS[*]:-"keine"}) und app_users/Legacy-Bridge-Zeilen fuer alle 5 e2e-*@team4s.test-Adressen geloescht."

# ---- Teil 2: Keycloak-Konten tatsaechlich zuruecksetzen --------------------
# Loescht ausschliesslich die oben BEREITS vollstaendig validierten
# Konten (KEYCLOAK_USER_ID) - keine erneute Existenz-/E-Mail-Pruefung
# hier, da diese Pruefung schon vor der DB-Mutation lief; ein Abbruch
# mitten in dieser Schleife (z. B. durch eine Netzwerkstoerung) kann
# dadurch nicht mehr an einer E-Mail-Abweichung scheitern, sondern
# hoechstens an echten Infrastruktur-Fehlern - der verbleibende Rest
# wird in diesem Fall ueber den naechsten 'provision.sh'-Lauf bereinigt
# (idempotent: ein noch existierendes Konto mit korrekter E-Mail wird
# dort einfach weiterverwendet, nicht abgelehnt).
DELETED_COUNT=0
for entry in "${ACCOUNTS[@]}"; do
  email="${entry#*:}"
  if [[ -n "${KEYCLOAK_USER_ID[$entry]:-}" ]]; then
    docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh delete "users/${KEYCLOAK_USER_ID[$entry]}" -r "$REALM" >/dev/null
    echo "Keycloak-Konto ${email} geloescht."
    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done

if [[ "$DELETED_COUNT" -eq 0 ]]; then
  echo "Keine der 5 e2e-*@team4s.test-Konten existierten in Keycloak - nichts zu loeschen."
fi

# Manifest UND Secrets-Datei werden ERST jetzt entfernt, NACHDEM sowohl die
# DB- (oben, COMMIT bereits erfolgt) als auch die Keycloak-Bereinigung
# (direkt darueber) vollstaendig durchgelaufen sind - nicht schon nach dem
# DB-COMMIT. Scheitert irgendetwas vor dieser Zeile, bleiben Manifest und
# Secrets-Datei erhalten.
rm -f "$MANIFEST"
rm -f "$SECRETS_FILE"
echo "Secrets-Datei entfernt: ${SECRETS_FILE} (naechster provision.sh-Lauf erzeugt 5 frische Passwoerter)."
echo "Manifest entfernt: ${MANIFEST}."
echo "Reset abgeschlossen: ${DELETED_COUNT}/5 Keycloak-Konten geloescht, DB-Fixture entfernt (siehe oben)."
