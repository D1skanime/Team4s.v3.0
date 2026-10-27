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

# SCRIPT_DIR muss VOR dem cd aus dem urspruenglichen Arbeitsverzeichnis
# aufgeloest werden - sonst wuerde eine zweite Ableitung aus derselben
# ${BASH_SOURCE[0]} nach dem cd relativ zum NEUEN Verzeichnis interpretiert
# und bei jedem Aufruf ausser "bash scripts/e2e.sh" aus dem Repo-Root
# (z. B. "cd scripts && bash e2e.sh") stillschweigend auf den Repo-Root
# statt auf scripts/ zeigen.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

REPORT_FILE="frontend/e2e/.reports/last-run.json"
SECRETS_FILE="$HOME/.config/team4s-e2e.env"

command -v jq >/dev/null || { echo "[e2e] FEHLER: 'jq' wird benoetigt (JSON-Parsing in Provisionierung und Testauswertung)." >&2; exit 1; }
command -v openssl >/dev/null || { echo "[e2e] FEHLER: 'openssl' wird benoetigt (Passwortgenerierung)." >&2; exit 1; }
command -v curl >/dev/null || { echo "[e2e] FEHLER: 'curl' wird benoetigt (Keycloak-/Backend-API-Aufrufe)." >&2; exit 1; }

bash "$SCRIPT_DIR/e2e/provision.sh"

# Typecheck der E2E-Dateien VOR dem eigentlichen Testlauf: playwright.config.ts
# und e2e/** sind bewusst aus dem normalen frontend/tsconfig.json ausgeschlossen
# (siehe tsconfig.e2e.json) und werden deshalb von keinem anderen automatisierten
# Schritt erfasst - ein kaputter Typ hier wuerde sonst erst als verwirrender
# Playwright-Laufzeitfehler auffallen statt als klare TS-Fehlermeldung.
(cd frontend && npm run typecheck:e2e)

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
