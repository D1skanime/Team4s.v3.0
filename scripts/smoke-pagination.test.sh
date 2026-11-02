#!/usr/bin/env bash
# Prüft den Pagination-Smoke-Test gegen einen echten HTTP-200-Fehlerkörper.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
test_tmp=$(mktemp -d)
trap 'rm -rf "$test_tmp"' EXIT

mkdir -p "$test_tmp/bin"

cat >"$test_tmp/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

output_file=""
while (($#)); do
  case "$1" in
    -o)
      output_file="$2"
      shift 2
      ;;
    -w)
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

printf '%s' "${FAKE_RESPONSE_BODY:-}" >"$output_file"
printf '200'
EOF
chmod +x "$test_tmp/bin/curl"

cat >"$test_tmp/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [ "${FAKE_DOCKER_STATUS:-0}" != "0" ]; then
  exit "$FAKE_DOCKER_STATUS"
fi

printf '%s' "${FAKE_LOG_BODY:-}"
EOF
chmod +x "$test_tmp/bin/docker"

if FAKE_RESPONSE_BODY='Functions cannot be passed directly to Client Components' \
  PATH="$test_tmp/bin:$PATH" "$repo_root/scripts/smoke-pagination.sh" http://pagination-test.invalid; then
  echo 'FAIL: Der Smoke-Test akzeptiert einen HTTP-200-RSC-Serialisierungsfehler.' >&2
  exit 1
fi

if FAKE_LOG_BODY='Functions cannot be passed directly to Client Components' \
  PATH="$test_tmp/bin:$PATH" "$repo_root/scripts/smoke-pagination.sh" http://pagination-test.invalid; then
  echo 'FAIL: Der Smoke-Test akzeptiert einen RSC-Serialisierungsfehler im Containerlog.' >&2
  exit 1
fi

if FAKE_DOCKER_STATUS=1 \
  PATH="$test_tmp/bin:$PATH" "$repo_root/scripts/smoke-pagination.sh" http://pagination-test.invalid; then
  echo 'FAIL: Der Smoke-Test akzeptiert ein nicht lesbares Frontend-Containerlog.' >&2
  exit 1
fi

echo 'PASS: Der Smoke-Test verwirft RSC-Serialisierungsfehler aus Response und Containerlog.'
