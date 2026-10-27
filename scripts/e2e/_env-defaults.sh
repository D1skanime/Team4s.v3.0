# scripts/e2e/_env-defaults.sh
#
# Leitet E2E_API_BASE/E2E_KC_BASE aus den tatsaechlichen BACKEND_PORT/
# KEYCLOAK_PORT der lokalen .env ab (derselben Datei, die docker-compose
# selbst beim Start liest), statt einen festen Port zu raten - ein Host, der
# diese Ports umbelegt (wie dieser, auf 18092/18081), bekommt die E2E-Skripte
# damit automatisch konsistent zum tatsaechlich laufenden Stack, ohne dass
# jeder Aufruf die Overrides manuell setzen muss. Ein explizit vom Aufrufer
# gesetztes E2E_API_BASE/E2E_KC_BASE hat immer Vorrang. Muss nach einem `cd`
# zum Repo-Root gesourced werden.
if [[ -z "${E2E_API_BASE:-}" ]]; then
  _E2E_BACKEND_PORT=$(grep -E '^BACKEND_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2)
  export E2E_API_BASE="http://127.0.0.1:${_E2E_BACKEND_PORT:-8092}"
fi
if [[ -z "${E2E_KC_BASE:-}" ]]; then
  _E2E_KEYCLOAK_PORT=$(grep -E '^KEYCLOAK_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2)
  export E2E_KC_BASE="http://127.0.0.1:${_E2E_KEYCLOAK_PORT:-8081}"
fi
unset _E2E_BACKEND_PORT _E2E_KEYCLOAK_PORT
