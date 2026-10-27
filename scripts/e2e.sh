#!/usr/bin/env bash
# scripts/e2e.sh
#
# Einziger Befehl, den ein autonomer Agent oder eine CI-Pipeline fuer die
# rollenbasierte Team4s-E2E-Abdeckung braucht: provisioniert idempotent die
# 5 dedizierten Keycloak-Testkonten plus die "E2E Gruppe A"-DB-Fixtures
# (scripts/e2e/provision.sh) und fuehrt danach alle 4 Rollen-Projekte unter
# Playwright aus. Sicher beliebig oft wiederholbar - die Provisionierung
# darunter ist idempotent, erzeugt also bei jedem erneuten Lauf keine
# Duplikate.
#
# Exit-Code-Garantie: dieses Skript endet NIE mit 0, wenn irgendetwas
# schiefgeht ODER wenn am Ende schlicht 0 Tests gelaufen sind (z. B. ein
# Tippfehler in einem testMatch-Glob) - letzteres wuerde Playwrights eigener
# Exit-Code allein nicht anzeigen, weil "0 Tests gefunden" fuer Playwright
# selbst kein Fehlerzustand ist.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="frontend/e2e/.reports/last-run.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"

bash "$SCRIPT_DIR/e2e/provision.sh"

# provision.sh laeuft als eigener Subprozess (eigene bash -c Umgebung) - die
# dort gesourcten E2E_PASSWORD_*-Variablen vererben sich NICHT automatisch an
# dieses Skript zurueck. auth.setup.ts braucht sie aber direkt im
# `npx playwright test`-Prozess, deshalb hier erneut aus derselben
# Secrets-Datei laden, die provision.sh soeben sichergestellt hat.
set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

set +e
(cd frontend && npx playwright test)
PW_EXIT=$?
set -e

if [ ! -f "$REPORT_FILE" ]; then
  echo "[e2e] FEHLER: Playwright-JSON-Report fehlt ($REPORT_FILE) - kann Testanzahl nicht pruefen."
  exit 1
fi

EXPECTED=$(jq -r '.stats.expected // 0' "$REPORT_FILE")
UNEXPECTED=$(jq -r '.stats.unexpected // 0' "$REPORT_FILE")
SKIPPED=$(jq -r '.stats.skipped // 0' "$REPORT_FILE")
TOTAL=$((EXPECTED + UNEXPECTED + SKIPPED))

echo "[e2e] passed=$EXPECTED failed=$UNEXPECTED skipped=$SKIPPED total=$TOTAL"

if [ "$PW_EXIT" -ne 0 ] || [ "$TOTAL" -eq 0 ]; then
  exit 1
fi

exit 0
