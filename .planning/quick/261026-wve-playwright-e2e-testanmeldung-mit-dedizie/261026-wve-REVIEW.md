---
phase: 261026-wve-playwright-e2e-testanmeldung-mit-dedizie
reviewed: 2026-10-27T09:46:46Z
depth: quick
files_reviewed: 19
files_reviewed_list:
  - .env.example
  - .gitignore
  - DECISIONS.md
  - docker-compose.yml
  - frontend/e2e/README.md
  - frontend/e2e/admin-user-list.spec.ts
  - frontend/e2e/auth.setup.ts
  - frontend/e2e/fansub-leader-tabs.spec.ts
  - frontend/e2e/member-protected-edit.spec.ts
  - frontend/e2e/user-blocked-admin.spec.ts
  - frontend/package-lock.json
  - frontend/package.json
  - frontend/playwright.config.ts
  - frontend/tsconfig.e2e.json
  - frontend/tsconfig.json
  - scripts/e2e.sh
  - scripts/e2e/provision-fixtures.mjs
  - scripts/e2e/provision-keycloak-users.sh
  - scripts/e2e/provision.sh
  - scripts/e2e/reset-fixtures.sh
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 261026-wve: Code Review Report

**Reviewed:** 2026-10-27T09:46:46Z
**Depth:** quick (expanded per explicit reviewer instructions on secret handling, idempotency, bash quoting/exit codes, and spec assertion quality)
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the new Playwright E2E test-login system (Keycloak test-account provisioning via `kcadm.sh`, API-driven DB fixture provisioning for "E2E Gruppe A", 4 role-based specs, and the single `scripts/e2e.sh` entry point).

On the specific risk areas called out:

- **Secret handling:** Good. Passwords are generated with `openssl rand -base64 24`, persisted only in `~/.config/team4s-e2e.env` (`chmod 600`, outside the repo, gitignored indirectly via being outside the tree), and the `kcadm.sh set-password`/`reset-fixtures.sh` token calls deliberately route the password through `docker compose exec -e` env injection or `curl --data-binary @-`/stdin instead of literal argv, so it never appears in `ps`, shell history, or logs. No hardcoded secrets were introduced by this change; the pre-existing dev-only placeholders in `.env.example` (`KEYCLOAK_ADMIN_PASSWORD=admin`, etc.) predate this feature and are explicitly documented as local defaults.
- **Idempotency:** Verified empirically by re-running `bash scripts/e2e/provision.sh` against the live dev stack twice — it correctly reported "ensured"/"bereits Live-Mitglied"/"existiert bereits" for every account and fixture on the second run, exit code 0, manifest unchanged (group id 155 stable). The design is sound for the current fixture scale. However, two of the list-based idempotency checks in `provision-fixtures.mjs` silently rely on backend default pagination limits rather than requesting an explicit page size the way `ensureGroup()` already does defensively — see WR-02.
- **Bash quoting/exit-code propagation:** Mostly correct and clearly reasoned about (the `sh -c '...' sh "$username"` positional-parameter trick in `provision-keycloak-users.sh` is correct and avoids password-in-argv). One real `set -e` + `pipefail` + command-substitution gotcha makes a custom diagnostic message unreachable in `reset-fixtures.sh` — see WR-01.
- **Spec assertion quality:** Not tautological. Cross-checked `member-protected-edit.spec.ts`'s core claim ("permission check fires before proposal lookup, so a nonexistent ID still yields 403") against `backend/internal/handlers/contribution_review_handler.go:139-148`, which indeed calls `CanForFansubGroup` before `ConfirmContribution`/lookup — the test's expectation is verified against real backend ordering, not assumed. The other three specs assert both a positive condition and its negative counterpart (e.g. admin sees the heading AND does not see the block message; the blocked user sees the block message AND does not see the heading), which is meaningfully discriminating rather than a tautology.

No Critical/Blocker-level issues were found (no injection, no secret leak, no auth bypass). The Warnings below are robustness/maintainability gaps that should be fixed before this becomes long-lived CI infrastructure, since several of them only manifest once the fixture scope grows or the host's local `.env` port customization is absent.

## Warnings

### WR-01: Unreachable custom error message on Keycloak token fetch failure

**File:** `scripts/e2e/reset-fixtures.sh:58-66`
**Issue:** `TOKEN_RESPONSE=$(printf '...' | curl -sf --data-binary @- ...)` is a plain assignment under `set -euo pipefail`. If `curl -f` fails (wrong/stale admin password after secrets rotation, Keycloak unreachable, etc.), `pipefail` makes the whole pipeline's exit status the assignment's exit status, and `set -e` terminates the script immediately — *before* reaching the following `if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then echo "Konnte kein Admin-Token fuer den Reset beziehen." >&2; exit 1; fi` block. Because `curl -s` also suppresses its own error output, the net effect on the most common failure mode is a silent non-zero exit with **no diagnostic at all**, defeating the explicit intent of that error branch (and making this harder to debug for an autonomous agent/CI run, which is the stated audience for this tooling).
**Fix:**
```bash
set +e
TOKEN_RESPONSE=$(printf 'grant_type=password&client_id=%s&username=e2e-admin@team4s.test&password=%s' \
    "$KC_CLIENT" "$ENCODED_PW" \
  | curl -sf --data-binary @- -H "Content-Type: application/x-www-form-urlencoded" \
    "${E2E_KC_BASE}/realms/${REALM}/protocol/openid-connect/token")
CURL_STATUS=$?
set -e
if [[ "$CURL_STATUS" -ne 0 ]]; then
  echo "Konnte kein Admin-Token fuer den Reset beziehen (curl exit=${CURL_STATUS})." >&2
  exit 1
fi
```

### WR-02: Idempotency checks omit explicit pagination, unlike the group lookup

**File:** `scripts/e2e/provision-fixtures.mjs:130-135` (`loadAppMemberIds`), `:152-153` (`group-members` list in `ensureHistoricalMemberId`), `:174-177` (`member-roles` list)
**Issue:** `ensureGroup()` explicitly passes `per_page: '500'` when searching for an already-existing group (lines 120-121), showing clear awareness that list endpoints paginate. The three other "already exists?" checks used for idempotency (`app-members`, `group-members`, `member-roles`) call their endpoints with no `per_page`/`limit` at all. The `app-members` list defaults server-side to `limit = 12` (`backend/internal/repository/fansub_group_app_members_repository.go:66-67`). For the current 3-member fixture group this is safely under the limit, but it is a latent idempotency trap: if this shared, permanent fixture group ever accumulates more entries (new specs adding more fixture members, or future admin-API default limits shrinking), a re-run would silently fail to find an already-provisioned member and attempt to re-create it — hitting `historical_member_already_linked`/duplicate-creation conflicts that are **not** in `must()`'s accepted `okStatuses` and would crash the "idempotent" provisioning script.
**Fix:** Pass an explicit high page size on every list call used for an idempotency check, matching the existing `ensureGroup` pattern, e.g. `{ token: adminToken, query: { per_page: '500' } }`.

### WR-03: `tsconfig.e2e.json` typecheck is not wired into any script or CI gate

**File:** `frontend/package.json:5-12`, `frontend/tsconfig.e2e.json`
**Issue:** `tsconfig.e2e.json` was added specifically so `frontend/e2e/**` and `playwright.config.ts` (excluded from the main `tsconfig.json`, see `frontend/tsconfig.json:39-43`) get their own typecheck. `npm run typecheck` (`package.json:11`, `tsc --noEmit`) only runs the main config and therefore never touches `e2e/`. Per `261026-wve-SUMMARY.md` this separate config was only verified manually once during this task; there is no `package.json` script or CI step that runs it going forward, so future edits to the E2E specs/config can silently break typechecking with no automated signal.
**Fix:** Add a script and wire it wherever `typecheck` currently runs in CI/pre-commit:
```json
"typecheck:e2e": "tsc -p tsconfig.e2e.json"
```

### WR-04: E2E scripts' default URLs only work because of this host's non-default `.env` port overrides

**File:** `scripts/e2e/provision-fixtures.mjs:25-26`, `scripts/e2e/reset-fixtures.sh:29-30`, `frontend/e2e/README.md:24-26`
**Issue:** All three default to `http://127.0.0.1:18092` (backend) / `http://127.0.0.1:18081` (Keycloak). These only match the running stack because the local, gitignored `.env` on this host sets `BACKEND_PORT=18092` and `KEYCLOAK_PORT=18081`. `docker-compose.yml`'s own defaults are `8092`/`8081` (`docker-compose.yml:69`, `:164`), and `.env.example` — the checked-in template every other developer/CI box would start from — does not set `BACKEND_PORT`/`KEYCLOAK_PORT` at all. A fresh environment following `.env.example` verbatim would run the stack on `8092`/`8081` while every E2E script still defaults to `18092`/`18081`, causing connection failures (or, worse, silently talking to whatever unrelated service happens to be listening on those ports) unless `E2E_API_BASE`/`E2E_KC_BASE` are manually overridden.
**Fix:** Either add `BACKEND_PORT=18092`/`KEYCLOAK_PORT=18081` to `.env.example` so the template matches the scripts' assumptions, or change the scripts' fallback defaults to the plain compose defaults (`8092`/`8081`) and call out the host-specific override explicitly as a prerequisite in `frontend/e2e/README.md`.

## Info

### IN-01: Hard dependencies on `jq`/`openssl` are not documented as prerequisites

**File:** `frontend/e2e/README.md`, `scripts/e2e.sh`, `scripts/e2e/provision-keycloak-users.sh`, `scripts/e2e/reset-fixtures.sh`
**Issue:** `jq` is used for JSON parsing/encoding in three scripts and `openssl` for password generation, but `frontend/e2e/README.md` only documents `bash scripts/e2e.sh` as the entry point with no "Voraussetzungen" section. On a box missing either binary, the failure is a generic shell "command not found" rather than an actionable message — a real concern given the stated audience is autonomous agents/CI that may run in minimal containers.
**Fix:** Add a short prerequisites line to the README, or a `command -v jq openssl >/dev/null || { echo "jq/openssl required"; exit 1; }` guard near the top of `scripts/e2e.sh`.

### IN-02: `scripts/e2e.sh` `SCRIPT_DIR` resolution only works for the documented invocation style

**File:** `scripts/e2e.sh:19-21`
**Issue:** Line 19 `cd`s into the repo root using a path derived from `${BASH_SOURCE[0]}` relative to the *original* working directory. Line 21 then re-derives `SCRIPT_DIR` from the same `${BASH_SOURCE[0]}` string, but now relative to the *new* (post-`cd`) working directory. This only resolves correctly because the documented invocation is always `bash scripts/e2e.sh` from the repo root. Invoking it differently (e.g. `cd scripts && bash e2e.sh`) silently resolves `SCRIPT_DIR` to the repo root instead of `scripts/`, and the subsequent `bash "$SCRIPT_DIR/e2e/provision.sh"` fails with a generic "No such file or directory" rather than a message explaining the required invocation style.
**Fix:** Compute `SCRIPT_DIR` once, before changing directory:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
```

---

_Reviewed: 2026-10-27T09:46:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
