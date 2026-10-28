---
phase: quick-261026-wve
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/e2e/provision-keycloak-users.sh
  - scripts/e2e/provision-fixtures.mjs
  - scripts/e2e/provision.sh
  - scripts/e2e/reset-fixtures.sh
  - frontend/package.json
  - frontend/package-lock.json
  - frontend/playwright.config.ts
  - frontend/e2e/auth.setup.ts
  - frontend/e2e/admin-user-list.spec.ts
  - frontend/e2e/fansub-leader-tabs.spec.ts
  - frontend/e2e/member-protected-edit.spec.ts
  - frontend/e2e/user-blocked-admin.spec.ts
  - .gitignore
  - scripts/e2e.sh
  - frontend/e2e/README.md
  - DECISIONS.md
autonomous: true
requirements: [261026-wve-scope]

must_haves:
  truths:
    - "Running `bash scripts/e2e.sh` from the repo root twice in a row both times exits 0 and both times reports at least 4 passed Playwright tests (idempotent provisioning + idempotent test run)."
    - "No Keycloak/DB-password value is ever printed to stdout/stderr, written into a git-tracked file, or committed — the only persistent copy is `~/.config/team4s-e2e.env` (0600, outside the repo)."
    - "The pre-existing `*@team4s.de` / password-123 accounts and the rest of `team4s_v2` are completely unaffected — no TRUNCATE, no DB reset, only the one `e2e-gruppe-a` fansub group (and its memberships) is created/removed."
    - "e2e-admin can see the admin user list (`/admin/users`), e2e-leader can see both 'Eingehende Hinweise' and 'Offene Vorschläge' in the Fansub-Members tab of E2E Gruppe A, e2e-member sees neither the confirm button nor gets anything but 403 on a direct confirm API call, and e2e-user is blocked from `/admin/users` by the Sperrseite."
    - "A second, independent run of `scripts/e2e/provision.sh` alone (without resetting first) makes zero duplicate Keycloak users, zero duplicate fansub groups, and zero duplicate app-member rows."
  artifacts:
    - path: scripts/e2e/provision-keycloak-users.sh
      provides: "Idempotent kcadm.sh-based creation/password-sync of the 5 e2e-* Keycloak accounts, platform_admin role grant for e2e-admin, and secrets-file (~/.config/team4s-e2e.env) generation"
    - path: scripts/e2e/provision-fixtures.mjs
      provides: "API-driven (Keycloak direct-grant token) idempotent creation of E2E Gruppe A plus live app-membership (fansub_lead for leader+deputy, historical-linked zero-role membership for member), writes scripts/e2e/fixtures.manifest.json"
    - path: scripts/e2e/provision.sh
      provides: "Single idempotent entry point chaining provision-keycloak-users.sh then provision-fixtures.mjs with the secrets file sourced in between"
    - path: scripts/e2e/reset-fixtures.sh
      provides: "Deletes only the fansub group referenced in fixtures.manifest.json via DELETE /fansubs/:id, then removes the manifest file; never touches Keycloak users or any other table"
    - path: frontend/playwright.config.ts
      provides: "setup project + 4 role-scoped projects (admin/leader/member/user), each depending on setup and using its own storageState file"
    - path: frontend/e2e/auth.setup.ts
      provides: "Real Keycloak-hosted-login-form flow per role, persists storageState per role; always re-runs at the start of every `playwright test` invocation, which is the renewal mechanism for expired sessions"
    - path: scripts/e2e.sh
      provides: "Single entry point: provision (idempotent) -> playwright test (all 4 role projects) -> exits non-zero on any failure or on 0 executed tests"
  key_links:
    - from: scripts/e2e/provision-fixtures.mjs
      to: "POST /api/v1/admin/fansubs/:id/app-members"
      via: "CreateFansubGroupAppMember with roles:['fansub_lead'] for leader/deputy, roles:[] + historical_member_id for member"
      pattern: "fansub_lead"
    - from: frontend/e2e/fansub-leader-tabs.spec.ts
      to: "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx + ContributionsReviewSection.tsx"
      via: "page.goto(`/admin/fansubs/${groupId}/edit?tab=collaboration`) then assert both section titles are visible"
      pattern: "Eingehende Hinweise|Offene Vorschläge"
    - from: frontend/e2e/member-protected-edit.spec.ts
      to: "POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm"
      via: "page.request.post with Authorization: Bearer <team4s_access_token cookie value>, expecting 403 (permission check precedes the not-found lookup)"
      pattern: "403"
    - from: scripts/e2e.sh
      to: "frontend (npx playwright test --reporter=json)"
      via: "host-side jq parse of the JSON reporter's stats.expected/.unexpected/.skipped to detect the 0-tests-ran case the exit code alone would miss"
      pattern: "stats.expected"
---

<objective>
Stand up a fully automated, idempotent Playwright E2E login setup for Team4s using 5 dedicated
Keycloak test accounts (`e2e-admin`, `e2e-leader`, `e2e-deputy`, `e2e-member`, `e2e-user`,
`@team4s.test`), a scoped DB fixture ("E2E Gruppe A" with a live fansub-lead leader+deputy and a
plain member), and 4 first role-based specs — so future autonomous (ki-run) agents can run
rollenbasierte E2E tests against the real login form without ever touching a password by hand.

Purpose: Today no repeatable role-based browser E2E path exists at all (`RESEARCH.md` section 6)
— every future UI regression check would otherwise require either a human to log in manually or
an agent to invent ad-hoc, non-reusable test credentials each time. This closes that gap once,
permanently, in a way that never collides with the real `*@team4s.de` accounts.
Output: `scripts/e2e.sh` (single entry point), `scripts/e2e/provision*.sh/.mjs` +
`reset-fixtures.sh`, `frontend/playwright.config.ts` + `frontend/e2e/*.spec.ts` +
`auth.setup.ts`, docs, and a `DECISIONS.md` entry.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
@CLAUDE.md
@.planning/STATE.md
@.planning/quick/261026-wve-playwright-e2e-testanmeldung-mit-dedizie/261026-wve-CONTEXT.md
@.planning/quick/261026-wve-playwright-e2e-testanmeldung-mit-dedizie/261026-wve-RESEARCH.md
@infra/keycloak/apply-team4s-user-profile.sh
@scripts/seed-member-profile-fixtures.mjs
@scripts/reset-member-profile-fixture.sh
@scripts/member-profile-fixture.manifest.json
@scripts/README-manifest.md
@frontend/src/app/login/page.tsx
@frontend/src/lib/keycloakAuth.ts
@frontend/src/lib/api/client.ts
@frontend/src/app/admin/users/page.tsx
@frontend/src/app/admin/users/AdminUsersClient.tsx
@frontend/src/components/auth/PlatformAdminGate.tsx
@frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts
@frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx
@frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx
@backend/internal/handlers/contribution_review_handler.go
@backend/internal/handlers/app_auth_group_members.go
@backend/internal/handlers/fansub_requests.go
@backend/internal/handlers/fansub_hist_group_members_handler.go
@backend/internal/repository/fansub_group_app_members_repository.go
@backend/internal/models/app_auth.go
@backend/cmd/server/routes_public.go
@docker-compose.yml
@.gitignore
</read_first>

<interfaces>
Confirmed from the codebase (no further exploration needed — use exactly these):

Infra (`docker compose ps`, verified running): compose service names `keycloak`
(`container_name: team4sv30-keycloak`, host port `18081`), `team4sv30-backend` (host port
`18092`), `team4sv30-frontend` (host port `3000`). `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD`
(both `admin` in local `.env`) are already set as env vars *inside* the running `keycloak`
container itself — `kcadm.sh config credentials` can read them via `$KEYCLOAK_ADMIN`/
`$KEYCLOAK_ADMIN_PASSWORD` without the host ever touching `.env`. Realm `team4s`, client
`team4s-frontend` (public, `directAccessGrantsEnabled: true` — Keycloak password/direct-grant
works without a client secret). Realm role `platform_admin` already exists.

Keycloak CLI pattern (`infra/keycloak/apply-team4s-user-profile.sh`): run via
`docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh ...`. For a user-existence check,
`kcadm.sh get users -r team4s -q username=<email>` prints a JSON array to stdout on the host
side (captured by `docker compose exec`), parseable with the host's `jq` (confirmed installed:
`/usr/bin/jq`) via `jq -e 'length > 0'`. User creation:
`kcadm.sh create users -r team4s -s username=<email> -s email=<email> -s enabled=true -s emailVerified=true`.
Password set (idempotent, same target state every run):
`kcadm.sh set-password -r team4s --username <email> --new-password <pw>` — pass the password via
`docker compose exec -T -e E2E_PW="$PW" keycloak sh -c 'kcadm.sh set-password -r team4s --username "$1" --new-password "$E2E_PW"' sh <email>`
(or equivalent), never as a literal argv string that would show up in `ps`/shell history. Realm
role grant (idempotent, re-adding an existing mapping is a no-op):
`kcadm.sh add-roles -r team4s --uusername <email> --rolename platform_admin`.

API-driven fixture pattern (`scripts/seed-member-profile-fixtures.mjs`, proven working against
this exact stack): Keycloak direct-grant token via
`POST {KC_BASE}/realms/team4s/protocol/openid-connect/token` with
`grant_type=password&client_id=team4s-frontend&username=<email>&password=<pw>` (form-encoded),
response `.access_token`. All backend API calls go through `fetch` with
`Authorization: Bearer <token>`, base path `/api/v1/...` against `{API_BASE}` (host default
`http://127.0.0.1:18092`). `POST /api/v1/fansubs` body `{slug, name, status}` ->
`201 {data:{id}}`, or `409` if slug exists (then `GET /api/v1/fansubs?q=<slug>` to resolve the
existing id). `GET /api/v1/me` -> `200 {data:{app_user_id, is_platform_admin, email, ...}}` —
calling this once per test account with that account's own token is what makes
`EnsureAppUserForIdentity` JIT-create its `app_users` row (required before that account's
`app_user_id` is resolvable via the candidates search below).

Live fansub membership (`backend/internal/handlers/app_auth_group_members.go`,
`backend/internal/repository/fansub_group_app_members_repository.go`,
`backend/internal/models/app_auth.go`):
- `GET /api/v1/admin/fansubs/:id/app-member-candidates?q=<email>` (admin token) ->
  `200 {data:[{app_user_id, member_id, fansub_name}]}` — matches on `au.email ILIKE`, excludes
  app_users already a member of that group (so re-run idempotency for this step must check
  `GET /api/v1/admin/fansubs/:id/app-members` FIRST, not the candidates endpoint).
- `GET /api/v1/admin/fansubs/:id/app-members` (admin token) ->
  `200 {data:[{id, fansub_group_id, app_user_id, status, roles, ...}]}` — use this to check
  "is app_user_id X already a member" before calling candidates/create.
- `POST /api/v1/admin/fansubs/:id/app-members` (admin token) body
  `{app_user_id, roles: ["fansub_lead"]}` for leader/deputy. For member:
  `{app_user_id, roles: [], historical_member_id: <id>}` (the handler 400s on
  `roles:[]` with no `historical_member_id` — `len(roles)==0 && !hasHistoricalLink`).
  The only known live role string is `models.FansubGroupMemberRoleLead = "fansub_lead"` — there
  is no separate deputy role (per CONTEXT.md decision; deputy = second `fansub_lead`).

Historical member link for the plain member
(`backend/internal/handlers/fansub_hist_group_members_handler.go`,
`backend/internal/handlers/fansub_requests.go`):
- `GET /api/v1/admin/fansubs/:id/group-members` (admin token) ->
  `200 {data:[{id, display_name, member_id, ...}]}` — idempotency check: look for
  `display_name === "E2E Mitglied"`, reuse `.id` as `historical_member_id`.
- `POST /api/v1/admin/fansubs/:id/group-members` (admin token) body
  `{display_name: "E2E Mitglied"}` -> `201 {data:{id, ...}}` (status/visibility default to
  `"historical"`/`"public"` when omitted — confirmed in
  `backend/internal/handlers/fansub_contributions_validation.go`).

Frontend auth storage (`frontend/src/lib/api/client.ts:137-138`): the access token is stored as
a plain **cookie** named `team4s_access_token` (not localStorage, not a session id — the literal
JWT), refresh token as `team4s_refresh_token`. Playwright's `storageState` captures cookies
natively, so the real browser login flow is sufficient — no manual token injection needed for
UI assertions. For the one place a test needs to call the backend API directly
(member-protected-edit 403 check), read this cookie's value via `page.context().cookies()` and
set it as `Authorization: Bearer <value>` manually, because the backend lives on a different
origin/port than the frontend and does not receive the frontend's cookies automatically.

Login flow (`frontend/src/app/login/page.tsx`, `frontend/src/lib/keycloakAuth.ts`): `/login` page
renders a button labeled exactly `"Anmelden"` (fresh/unauthenticated state) that calls
`beginKeycloakLogin()`, a full-page redirect (PKCE) to the Keycloak-hosted login page. No custom
`login.ftl` exists under the mounted `team4s` theme (only `register.ftl` is customized) ->
standard Keycloak base-theme field IDs apply: `#username`, `#password`, `#kc-login`. After
submit, Keycloak redirects back to `/login?code=...&state=...`; the page's own `useEffect`
auto-completes the token exchange and `router.replace`s to `/me/profile` (default) — wait for
the URL to stop matching `/login` as the completion signal.

UI anchors for specs:
- `frontend/src/app/admin/users/AdminUsersClient.tsx` renders `<h1>Benutzerverwaltung</h1>`
  unconditionally once past `PlatformAdminGate` — use this as the admin-list positive assertion.
- `frontend/src/components/auth/PlatformAdminGate.tsx` renders the paragraph text
  `"Diese Ansicht ist dem Team4s-Admin vorbehalten."` for any non-platform-admin — use this as
  the user-blocked assertion.
- Tab navigation: `frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts` — the
  "Fansub Members" tab's query key is `collaboration`; navigate directly to
  `/admin/fansubs/<id>/edit?tab=collaboration`.
- `FansubGroupHintsReviewSection.tsx` renders `Eingehende Hinweise (${openCount})` and
  `ContributionsReviewSection.tsx` renders `Offene Vorschläge (${openCount})`, BOTH gated by
  `if (!capabilities?.can_manage_members) return null` — for the member account neither title
  renders at all (that alone proves "no button for the protected edit" for the member case).
  `ContributionsReviewSection.tsx`'s confirm button text is exactly `"Vorschlag bestätigen"`.
- Confirm endpoint (`backend/cmd/server/routes_public.go:271`):
  `POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm`. Permission check
  (`ActionFansubGroupMembersManage`) runs strictly BEFORE the contribution-id lookup
  (`contribution_review_handler.go` `ConfirmProposal`), so an arbitrary/non-existent `:cid`
  (e.g. `999999`) still yields `403` for a non-lead account, never `404` — safe to use without
  needing a real pending proposal to exist.
</interfaces>

Constraints: `~/.config/team4s-e2e.env` lives OUTSIDE the repo (never write into any repo path,
never gitignore a repo-internal copy of it — there must not be one). No password value may ever
appear in a `docker compose exec` argv string, a log line, a commit, or
`scripts/e2e/fixtures.manifest.json` (which holds only numeric IDs). Do not touch
`frontend/src/lib/api/client.ts` (already >450 lines). Keep every new file comfortably under 450
lines; split proactively if a script would exceed that (most won't — these are small, focused
scripts). All German test titles/descriptions (`test()`/`test.describe()` strings, doc prose)
use correct umlauts. No `checkpoint:*` tasks anywhere in this plan — this is an autonomous
`ki-run` job (branch `ki/team4s-261026-7848`); live human UAT happens once, afterwards, via
`ki-run uat`, not mid-plan.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Idempotent Keycloak test-account provisioning + secrets file</name>
  <files>scripts/e2e/provision-keycloak-users.sh</files>
  <action>
    Create `scripts/e2e/provision-keycloak-users.sh` (bash, `set -euo pipefail`, self-locating
    via `cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"` so it works regardless of the
    caller's CWD). Define the 5 accounts as a bash associative-array-free list of
    `role:email` pairs: `admin:e2e-admin@team4s.test`, `leader:e2e-leader@team4s.test`,
    `deputy:e2e-deputy@team4s.test`, `member:e2e-member@team4s.test`,
    `user:e2e-user@team4s.test`. The secrets file is `"$HOME/.config/team4s-e2e.env"`: create
    `~/.config` if missing, create the file with `touch` + `chmod 600` if missing. For each role
    whose uppercase env var `E2E_PASSWORD_<ROLE>` is not already present in that file (grep -q
    on the exact `KEY=` prefix), append a new line `E2E_PASSWORD_<ROLE>=<openssl rand -base64 24>`
    — never regenerate an existing entry (idempotence: same target state every run). After this
    step, `source` the file (`set -a; source "$SECRETS_FILE"; set +a`) into the script's own
    environment so the per-account password is available as `$E2E_PASSWORD_ADMIN` etc. for the
    subsequent kcadm calls, but log only account labels, never values (per CONTEXT.md:
    "Passwörter niemals in Ausgaben, Logs, Commits").

    For each of the 5 accounts, idempotently ensure the Keycloak user exists: run
    `docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"`
    once up front (reads `$KEYCLOAK_ADMIN`/`$KEYCLOAK_ADMIN_PASSWORD` from the keycloak
    container's OWN already-injected environment — do not read `.env` on the host for this).
    Then per account: `docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r team4s -q username="$EMAIL"`
    captured on the host, parsed with `jq -e 'length > 0' >/dev/null` to decide
    exists-vs-create; if absent, `kcadm.sh create users -r team4s -s username="$EMAIL" -s email="$EMAIL" -s enabled=true -s emailVerified=true -s firstName=E2E -s lastName="<Role>"`.
    Always (idempotent) set the password via
    `docker compose exec -T -e E2E_PW="$PW" keycloak sh -c '/opt/keycloak/bin/kcadm.sh set-password -r team4s --username "$1" --new-password "$E2E_PW"' sh "$EMAIL"`
    — single-quoted so `$1`/`$E2E_PW` expand inside the container shell, never on the host
    (where `$E2E_PW` does not exist and would trip `set -euo pipefail`'s unbound-variable check);
    the password travels only through the `-e` env-injection of `docker compose exec`, never as
    a literal CLI argument, so it never appears in `ps`/shell history/logs. For the `admin`
    role only, additionally run (idempotent, safe to repeat)
    `kcadm.sh add-roles -r team4s --uusername "$EMAIL" --rolename platform_admin`. Print one log
    line per account (e.g. `"[e2e-provision] e2e-admin@team4s.test: ensured (role=platform_admin)"`)
    with no secret value in it.
  </action>
  <verify>
    <automated>bash scripts/e2e/provision-keycloak-users.sh &amp;&amp; bash scripts/e2e/provision-keycloak-users.sh &amp;&amp; test -f "$HOME/.config/team4s-e2e.env" &amp;&amp; test "$(stat -c %a "$HOME/.config/team4s-e2e.env")" = "600" &amp;&amp; grep -c '^E2E_PASSWORD_' "$HOME/.config/team4s-e2e.env" | grep -q '^5$' &amp;&amp; ! grep -riq "team4s-e2e.env" .gitignore 2>/dev/null &amp;&amp; docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh get users -r team4s -q username=e2e-admin@team4s.test | jq -e 'length == 1'</automated>
  </verify>
  <done>Running the script twice in a row is a no-op the second time for user creation (no duplicate-user error), all 5 `e2e-*@team4s.test` Keycloak users exist with correct passwords set, `e2e-admin` carries the `platform_admin` realm role, the secrets file exists at `~/.config/team4s-e2e.env` with mode 600 and exactly 5 `E2E_PASSWORD_*` entries, and no password value appears anywhere in the script's own stdout/log output.</done>
</task>

<task type="auto">
  <name>Task 2: API-driven live fixture provisioning (E2E Gruppe A + memberships) + manifest</name>
  <files>scripts/e2e/provision-fixtures.mjs</files>
  <action>
    Create `scripts/e2e/provision-fixtures.mjs` (Node 18+, no npm deps, pattern copied from
    `scripts/seed-member-profile-fixtures.mjs`'s `kcToken`/`api`/`must` helpers). Env inputs
    (all with the same `127.0.0.1` host defaults as `scripts/README-seed.md`, overridable):
    `E2E_API_BASE` (default `http://127.0.0.1:18092`), `E2E_KC_BASE` (default
    `http://127.0.0.1:18081`), and the 5 passwords read from `process.env.E2E_PASSWORD_ADMIN`
    `/_LEADER/_DEPUTY/_MEMBER/_USER` (populated by the caller — see Task 3 — never read from the
    secrets file directly inside this script, matching the existing Node-script convention of
    "config only via `process.env.*`, no dotenv package"). Fail loudly (throw, non-zero exit) if
    any of the 5 password env vars is empty — a silently-skipped account would be a false-green
    fixture.

    Step order (idempotent at every step — re-running with everything already in place must be
    a clean no-op producing the identical manifest):
    1. Get a Keycloak token for `e2e-admin@team4s.test`; call `GET /api/v1/me` with it; throw if
       `data.is_platform_admin !== true` (loud failure instead of silently creating the group as
       a non-admin, which would 403 anyway but with a confusing error).
    2. `ensureGroup(adminToken, {slug: 'e2e-gruppe-a', name: 'E2E Gruppe A', status: 'active'})`
       — `POST /api/v1/fansubs`, `201->id` or `409->GET /api/v1/fansubs?q=e2e-gruppe-a` to resolve
       the existing id. This is the ONLY fansub group this script ever creates (no "E2E Gruppe
       B" — none of the 4 Phase-1 specs need it, per CONTEXT.md).
    3. For leader/deputy/member (not admin, not user): get each account's own Keycloak token and
       call `GET /api/v1/me` with it once, to JIT-create that account's `app_users` row; record
       `app_user_id` from the response (needed below — do not resolve it via the candidates
       search, which excludes existing members and would silently return nothing on a second
       run).
    4. `GET /api/v1/admin/fansubs/{groupId}/app-members` with the admin token once; build a
       `Set`/`Map` of already-present `app_user_id`s. For leader and deputy: if their
       `app_user_id` is already in that set, skip; otherwise
       `POST /api/v1/admin/fansubs/{groupId}/app-members` with
       `{app_user_id, roles: ["fansub_lead"]}`.
    5. For member: `GET /api/v1/admin/fansubs/{groupId}/group-members` with the admin token;
       look for an existing row with `display_name === "E2E Mitglied"`; if absent,
       `POST /api/v1/admin/fansubs/{groupId}/group-members` with `{display_name: "E2E Mitglied"}`
       to get a `historical_member_id`. Then, only if member's `app_user_id` is not already in
       the app-members set from step 4, `POST /api/v1/admin/fansubs/{groupId}/app-members` with
       `{app_user_id: memberAppUserId, roles: [], historical_member_id: historicalMemberId}`.
    6. Do NOT fetch or store a token for `e2e-user` here — that account intentionally gets no DB
       fixture at all (per CONTEXT.md, it only needs to exist in Keycloak, already done in
       Task 1); its own JIT `app_users` row is created naturally the first time
       `auth.setup.ts` logs it into the real app.
    7. Write `scripts/e2e/fixtures.manifest.json` (pretty-printed JSON, 2-space indent) with
       exactly: `{"manifest_version":1,"fansub_group_id":<id>,"group_slug":"e2e-gruppe-a","members":{"leader":{"app_user_id":<id>},"deputy":{"app_user_id":<id>},"member":{"app_user_id":<id>,"historical_member_id":<id>}}}`
       — IDs only, never an email/password. Overwrite on every run (it is derived state, not
       hand-authored like `member-profile-fixture.manifest.json`).
  </action>
  <verify>
    <automated>export E2E_PASSWORD_ADMIN=x E2E_PASSWORD_LEADER=x E2E_PASSWORD_DEPUTY=x E2E_PASSWORD_MEMBER=x E2E_PASSWORD_USER=x; node --check scripts/e2e/provision-fixtures.mjs</automated>
  </verify>
  <done>`node --check` passes (syntax-valid); once run against the live stack with real exported passwords (exercised end-to-end in Task 3's verify), `scripts/e2e/fixtures.manifest.json` exists with `fansub_group_id` and all 3 member `app_user_id`s plus `historical_member_id` populated, and a second run produces byte-identical IDs (no duplicate group/members created).</done>
</task>

<task type="auto">
  <name>Task 3: provision.sh orchestrator + reset-fixtures.sh</name>
  <files>scripts/e2e/provision.sh, scripts/e2e/reset-fixtures.sh</files>
  <action>
    Create `scripts/e2e/provision.sh` (bash, `set -euo pipefail`, same self-locating `cd`
    pattern as Task 1). It does exactly three things in order: (1) run
    `bash "$(dirname "${BASH_SOURCE[0]}")/provision-keycloak-users.sh"` (Task 1 — guarantees the
    secrets file exists and is fully populated afterward); (2) `set -a; source "$HOME/.config/team4s-e2e.env"; set +a`
    then re-export each `E2E_PASSWORD_<ROLE>` explicitly as the exact env var name
    `provision-fixtures.mjs` expects (same names, so this is just making them visible to the
    child process); (3)
    `node "$(dirname "${BASH_SOURCE[0]}")/provision-fixtures.mjs"` (Task 2). Exit non-zero
    immediately if either sub-step fails (`set -e` handles this as long as no `||true` is added
    anywhere). This is the ONE script that both `scripts/e2e.sh` (Task 6) and a human/agent
    re-running provisioning standalone ever need to call.

    Create `scripts/e2e/reset-fixtures.sh` (bash, `set -euo pipefail`, same self-locating `cd`).
    Steps: (1) if `scripts/e2e/fixtures.manifest.json` does not exist, print
    `"Kein Fixture-Manifest gefunden - nichts zurueckzusetzen."` and exit 0 (nothing to do is not
    an error); (2) read `fansub_group_id` from it via `jq -r '.fansub_group_id'`; (3) source the
    secrets file (`set -a; source "$HOME/.config/team4s-e2e.env"; set +a`) to get
    `$E2E_PASSWORD_ADMIN`; (4) obtain an admin Keycloak token via one `curl -sf` POST to
    `"${E2E_KC_BASE:-http://127.0.0.1:18081}/realms/team4s/protocol/openid-connect/token"`,
    piping the form body through stdin instead of a literal `-d`/`--data` argument (which would
    expose `$E2E_PASSWORD_ADMIN` in `ps`) — build the body with
    `printf 'grant_type=password&client_id=team4s-frontend&username=e2e-admin@team4s.test&password=%s' "$E2E_PASSWORD_ADMIN"`
    piped into `curl -sf --data-binary @- -H "Content-Type: application/x-www-form-urlencoded" "$TOKEN_URL"`,
    the same "secret never becomes a literal argv string" pattern as the `-e E2E_PW`
    env-injection in Task 1; parse `.access_token` with `jq -r`; (5)
    `curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "Authorization: Bearer $TOKEN" "${E2E_API_BASE:-http://127.0.0.1:18092}/api/v1/fansubs/$GROUP_ID"`
    (no `-f` flag — capture the status code and branch on it manually; accept it already being
    gone by treating a `404` response the same as success, since the goal state "group no
    longer exists" is already met; only a status outside `200-299,404` is a real failure); (6) on
    success, `rm -f scripts/e2e/fixtures.manifest.json`. Never issue a raw SQL statement, never
    touch Keycloak users, never touch any table other than what the fansub `DELETE` endpoint's
    own FK cascade reaches (per CONTEXT.md: "Kein TRUNCATE, kein DB-Reset").
  </action>
  <verify>
    <automated>bash scripts/e2e/provision.sh &amp;&amp; jq -e '.fansub_group_id and (.members.leader.app_user_id) and (.members.deputy.app_user_id) and (.members.member.app_user_id) and (.members.member.historical_member_id)' scripts/e2e/fixtures.manifest.json &amp;&amp; bash scripts/e2e/provision.sh &amp;&amp; jq -e '.fansub_group_id' scripts/e2e/fixtures.manifest.json &amp;&amp; bash scripts/e2e/reset-fixtures.sh &amp;&amp; test ! -f scripts/e2e/fixtures.manifest.json &amp;&amp; bash scripts/e2e/provision.sh &amp;&amp; jq -e '.fansub_group_id and (.members.leader.app_user_id) and (.members.deputy.app_user_id) and (.members.member.app_user_id) and (.members.member.historical_member_id)' scripts/e2e/fixtures.manifest.json</automated>
  </verify>
  <done>`bash scripts/e2e/provision.sh` succeeds twice in a row against the live stack, `scripts/e2e/fixtures.manifest.json` has all required IDs populated and identical across both runs (no duplicates), and `bash scripts/e2e/reset-fixtures.sh` followed by a re-run of `provision.sh` reproduces a working (possibly new-ID) fixture state without erroring.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Playwright scaffolding — config + real-login auth.setup</name>
  <files>frontend/package.json, frontend/package-lock.json, frontend/playwright.config.ts, frontend/e2e/auth.setup.ts, .gitignore</files>
  <behavior>
    - `frontend/playwright.config.ts` defines exactly 5 projects: `setup` (testMatch
      `auth.setup.ts`, no storageState), and `admin`/`leader`/`member`/`user` (each
      `dependencies: ['setup']`, each `use.storageState` pointing at its own file under
      `frontend/e2e/.auth/<role>.json`, each `testMatch` scoped to that role's one spec file).
    - `baseURL` is `process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'`.
    - `auth.setup.ts` contains one `test()` per role (4 roles that need app access: admin,
      leader, member, user — NOT deputy, which has no dedicated spec in this plan) that: goes to
      `/login`, clicks the button named exactly `"Anmelden"`, waits for the Keycloak-hosted login
      page, fills `#username`/`#password` from `process.env.E2E_PASSWORD_<ROLE>` and the fixed
      `e2e-<role>@team4s.test` address, clicks `#kc-login`, waits for the URL to no longer
      contain `/login`, then calls `page.context().storageState({ path: ... })` for that role's
      file. Every one of these 4 `test()`s runs on every single `playwright test` invocation
      (the `setup` project has no `dependencies` itself, so it is never skipped) — this is the
      "automatically renews expired sessions" mechanism: there is no caching/skip logic to get
      wrong, every run starts from a fresh real login.
  </behavior>
  <action>
    Run `cd frontend && npm install --save-dev @playwright/test@1.55.0` (pins to the exact same
    version as the already-present `playwright` dev dependency so the already-cached
    `~/.cache/ms-playwright` Chromium binaries are reused with zero extra `playwright install`
    download). This updates `frontend/package.json` and `frontend/package-lock.json` only.

    Create `frontend/playwright.config.ts` per the behavior spec above, importing
    `defineConfig`/`devices` from `@playwright/test`. Use `testDir: './e2e'`,
    `fullyParallel: false` (sequential — this stack is a single shared dev DB/Keycloak instance,
    not worth the flake risk of parallel role logins), `reporter: [['line'], ['json', { outputFile: 'e2e/.reports/last-run.json' }]]`,
    `use: { baseURL, trace: 'retain-on-failure' }`.

    Create `frontend/e2e/auth.setup.ts` per the behavior spec, reading
    `process.env.E2E_PASSWORD_ADMIN` etc. (same names Task 2/3 already standardized on).
    Read-only comment at the top of the file explains in German, factually (not as a phase
    reference), what this file does and why re-running login every time is intentional (session
    renewal, not an oversight).

    Add a new `# E2E (Playwright-Testkonten)` section to the root `.gitignore`:
    `frontend/e2e/.auth/`, `frontend/e2e/.reports/`, `frontend/playwright-report/`,
    `frontend/test-results/`, and `scripts/e2e/fixtures.manifest.json` (generated, environment-
    specific IDs — never hand-authored, unlike `member-profile-fixture.manifest.json`).
  </action>
  <verify>
    <automated>cd frontend &amp;&amp; npx tsc --noEmit -p tsconfig.json &gt; /tmp/e2e-tsc.txt 2&gt;&amp;1; if grep -qE "playwright\.config\.ts|e2e/auth\.setup\.ts" /tmp/e2e-tsc.txt; then echo "FAIL: type errors in playwright.config.ts or auth.setup.ts"; cat /tmp/e2e-tsc.txt; exit 1; fi; echo "OK: no type errors in playwright.config.ts or auth.setup.ts"</automated>
  </verify>
  <done>`@playwright/test@1.55.0` is a frontend devDependency; `frontend/playwright.config.ts` defines the 5 projects described above with correct dependency/storageState wiring; `frontend/e2e/auth.setup.ts` logs each of the 4 roles in through the real Keycloak-hosted form and persists a per-role storageState file; `.gitignore` excludes all generated E2E artifacts including the runtime fixtures manifest.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: The 4 role specs</name>
  <files>frontend/e2e/admin-user-list.spec.ts, frontend/e2e/fansub-leader-tabs.spec.ts, frontend/e2e/member-protected-edit.spec.ts, frontend/e2e/user-blocked-admin.spec.ts</files>
  <behavior>
    - `admin-user-list.spec.ts` (project `admin`): one test
      `"Plattform-Admin sieht die Admin-Benutzerliste"` — `page.goto('/admin/users')`, assert
      `page.getByRole('heading', { name: 'Benutzerverwaltung' })` is visible, and assert the
      Sperrseite text is NOT present.
    - `fansub-leader-tabs.spec.ts` (project `leader`): reads `scripts/e2e/fixtures.manifest.json`
      (relative path resolved from the test file via `path.join(__dirname, '../../scripts/e2e/fixtures.manifest.json')`)
      for `fansub_group_id`; one test
      `"Gruppenleitung sieht Eingehende Hinweise und Offene Vorschlaege im Tab Fansub Members"` —
      `page.goto(`/admin/fansubs/${groupId}/edit?tab=collaboration`)`, assert text matching
      `/Eingehende Hinweise/` AND text matching `/Offene Vorschläge/` are both visible.
    - `member-protected-edit.spec.ts` (project `member`): reads the same manifest for
      `fansub_group_id`; one test
      `"Einfaches Mitglied hat keinen Zugriff auf die geschuetzte Bearbeitung"` with two
      assertions in sequence: (a) after `page.goto` to the same collaboration-tab URL, a button
      named `"Vorschlag bestätigen"` is NOT present anywhere on the page
      (`expect(page.getByRole('button', { name: 'Vorschlag bestätigen' })).toHaveCount(0)`); (b)
      extract the `team4s_access_token` cookie value via `page.context().cookies()`, then
      `page.request.post` directly against
      `${process.env.E2E_API_BASE || 'http://127.0.0.1:18092'}/api/v1/admin/fansubs/${groupId}/contribution-proposals/999999/confirm`
      with header `Authorization: Bearer <that cookie value>`, assert `response.status() === 403`.
    - `user-blocked-admin.spec.ts` (project `user`): one test
      `"Normaler Benutzer erreicht die Admin-Seite nicht"` — `page.goto('/admin/users')`, assert
      text `"Diese Ansicht ist dem Team4s-Admin vorbehalten."` is visible, and assert the
      `"Benutzerverwaltung"` heading is NOT present.
  </behavior>
  <action>
    Implement exactly the 4 spec files described in `<behavior>` above, each importing `test`,
    `expect` from `@playwright/test`. Keep each file self-contained and under ~60 lines; no
    shared spec-level helper file is needed for this small a surface (a shared manifest-read
    one-liner duplicated twice is cheaper than adding a new shared module). Use
    `test.describe` with a correctly-umlauted German title matching the acceptance criterion's
    phrasing from the original requirement (Plattform-Admin / Gruppenleitung / einfaches
    Mitglied / normaler Benutzer) so a failing run's output is self-explanatory.
  </action>
  <verify>
    <automated>cd frontend &amp;&amp; npx tsc --noEmit -p tsconfig.json &gt; /tmp/e2e-spec-tsc.txt 2&gt;&amp;1; if grep -qE "e2e/.*\.spec\.ts" /tmp/e2e-spec-tsc.txt; then echo "FAIL: type errors in e2e spec files"; cat /tmp/e2e-spec-tsc.txt; exit 1; fi; echo "OK: no type errors in e2e spec files"</automated>
  </verify>
  <done>All 4 spec files type-check cleanly, each contains exactly 1 focused test matching its role's acceptance criterion from the original requirement, and each reads `fansub_group_id` from the manifest rather than hardcoding an ID (robust across re-provisioning).</done>
</task>

<task type="auto">
  <name>Task 6: scripts/e2e.sh single entry point with hard exit-code + 0-tests guarantee</name>
  <files>scripts/e2e.sh</files>
  <action>
    Create `scripts/e2e.sh` (bash, `set -euo pipefail`, self-locating `cd` to repo root like the
    other new scripts). Steps: (1) `bash scripts/e2e/provision.sh` (Task 3) — if this fails,
    the script already exits non-zero via `set -e`, nothing further to do; (2) run
    `(cd frontend && npx playwright test)`, capturing its exit code explicitly with
    `set +e; (cd frontend && npx playwright test); PW_EXIT=$?; set -e` instead of letting `set -e`
    kill the script immediately, because step (3) must run regardless of pass/fail to produce a
    clear final diagnosis; (3) parse `frontend/e2e/.reports/last-run.json` with `jq` to read
    `.stats.expected`, `.stats.unexpected`, `.stats.skipped`; compute
    `TOTAL=expected+unexpected+skipped`; (4) print a one-line summary
    (`"[e2e] passed=$EXPECTED failed=$UNEXPECTED skipped=$SKIPPED total=$TOTAL"`); (5) exit 1 if
    `PW_EXIT -ne 0`, OR `TOTAL -eq 0` (the "0 tests ran" case the exit code alone can miss, e.g.
    a `testMatch` typo), OR the report file is missing entirely; otherwise exit 0. Add a header
    comment (German, factual, no phase reference) explaining that this is the ONE command an
    autonomous agent or CI needs for role-based Team4s E2E coverage, and that it is safe to run
    repeatedly (idempotent provisioning underneath).
  </action>
  <verify>
    <automated>bash scripts/e2e.sh; R1=$?; bash scripts/e2e.sh; R2=$?; echo "RUN1_EXIT=$R1 RUN2_EXIT=$R2"; test "$R1" = 0 &amp;&amp; test "$R2" = 0</automated>
  </verify>
  <done>`bash scripts/e2e.sh` run twice in a row from the repo root both times exits 0 and both times prints a summary line showing `passed>=4` and `failed=0`; deliberately breaking a `testMatch` glob (manual smoke check during implementation, not left in the final file) proves the 0-tests path exits 1.</done>
</task>

<task type="auto">
  <name>Task 7: Docs + DECISIONS.md entry</name>
  <files>frontend/e2e/README.md, DECISIONS.md</files>
  <action>
    Create `frontend/e2e/README.md` (German, correct umlauts) covering: (1) the one-command
    entry point (`bash scripts/e2e.sh` from the repo root) and what it does end to end; (2) the 5
    roles and their fixed `@team4s.test` addresses and what each one can/cannot do, matching the
    4 specs; (3) where the secret passwords live (`~/.config/team4s-e2e.env`, 0600, outside the
    repo, auto-generated on first run, never logged); (4) how to reset just the DB fixture
    (`bash scripts/e2e/reset-fixtures.sh`) versus re-provisioning
    (`bash scripts/e2e/provision.sh`) versus a full fresh run (`bash scripts/e2e.sh`); (5) an
    explicit note that this never touches the real `*@team4s.de` accounts or any data outside
    the one `e2e-gruppe-a` fansub group.

    Append one new dated entry to `DECISIONS.md` (follow the existing format/heading convention
    already used by other entries in that file — read a couple of existing entries first to
    match structure) documenting: the architecture choice (Keycloak `kcadm.sh` for user
    provisioning + the existing live-app-membership API for DB fixtures, reusing
    `scripts/seed-member-profile-fixtures.mjs`'s proven direct-grant-token pattern rather than
    inventing a new one), the "deputy = second fansub_lead" modeling decision and why (no
    separate deputy role exists in the live permission model — CONTEXT.md), and the choice to
    run Playwright from the host against the container's published port rather than
    containerizing Playwright itself (keeps Docker build/compose untouched).
  </action>
  <verify>
    <automated>test -s frontend/e2e/README.md &amp;&amp; grep -q "team4s-e2e.env" frontend/e2e/README.md &amp;&amp; grep -q "e2e-gruppe-a\|E2E Gruppe A" frontend/e2e/README.md &amp;&amp; tail -40 DECISIONS.md | grep -qi "playwright\|e2e"</automated>
  </verify>
  <done>`frontend/e2e/README.md` exists and documents the full workflow (entry point, roles, secrets location, reset path); `DECISIONS.md` has a new entry explaining the Keycloak-provisioning + live-membership-API + host-side-Playwright architecture choice and the deputy-role modeling decision.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Host shell -> Keycloak admin API (`kcadm.sh`) | Provisioning scripts run with full Keycloak-admin power inside the local dev container only; never exposed beyond `docker compose exec`. |
| Secrets file (`~/.config/team4s-e2e.env`) -> provisioning scripts | A locally-generated, non-repo, 0600 file is the sole persistent location for 5 dedicated test-account passwords. |
| Playwright browser context -> real backend API (`page.request`) | The member-protected-edit spec deliberately crafts a direct, authenticated-but-insufficiently-privileged API call to prove the 403 guard, mirroring a real attacker-with-valid-but-low-privilege-token scenario. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261026-01 | Information Disclosure | `scripts/e2e/provision-keycloak-users.sh` password handling | mitigate | Passwords only ever exist in `~/.config/team4s-e2e.env` (0600, outside repo), as an in-memory shell var, or as a `docker compose exec -e` env var injected into the container process — never as a literal CLI argument, never echoed/logged, never written into `fixtures.manifest.json`. |
| T-261026-02 | Elevation of Privilege | `e2e-admin`'s `platform_admin` realm-role grant | accept | This is the explicit, intended purpose of the `e2e-admin` test account (dedicated to a local/dev-only realm, `@team4s.test` domain, isolated from the real `@team4s.de` accounts); scoped to local dev stacks only, never provisioned against a production Keycloak realm. |
| T-261026-03 | Tampering | `reset-fixtures.sh` deleting a fansub group | mitigate | Deletion is scoped exclusively to the single `fansub_group_id` read from the script's own generated manifest (never a slug pattern, never "all groups named E2E*"); a missing manifest is treated as "nothing to do" (exit 0), not an error that could tempt a broader fallback delete. |
| T-261026-04 | Repudiation | Confirm-endpoint 403 probe using a fabricated `cid=999999` | accept | Read-only probe of an authorization boundary with no real contribution record involved; the backend's own audit log already records the `anime_contribution.confirm.denied` event for this call, same as any other real denied attempt. |
| T-261026-05 | Information Disclosure | `reset-fixtures.sh`'s admin-token request body (`$E2E_PASSWORD_ADMIN`) | mitigate | Password is piped into `curl --data-binary @-` via stdin (built with `printf`), never passed as a literal `-d`/`--data` argv string — so it never appears in `ps`/process listings, matching the same stdin/env-injection discipline already used for `kcadm.sh set-password` in Task 1. |
| T-261026-SC | Tampering (supply chain) | npm install of `@playwright/test` | mitigate | Pinned to the exact same version (`1.55.0`) as the already-present, already-used `playwright` package in `frontend/package.json` — same publisher, same release, no new/unvetted package introduced; `@playwright/test` is the official Microsoft-published companion package to `playwright` itself, not a third-party wrapper. No separate legitimacy checkpoint needed (well-known first-party package, identical version already trusted in this repo). |
</threat_model>

<verification>
- `bash scripts/e2e.sh` run twice in a row from the repo root exits 0 both times and reports
  `passed>=4`, `failed=0` both times (the plan's own acceptance criterion).
- `bash scripts/e2e/provision.sh` run a third time with the fixture already fully in place
  creates zero duplicate Keycloak users, zero duplicate fansub groups, zero duplicate
  app-member rows (verified by diffing `scripts/e2e/fixtures.manifest.json` IDs across runs).
- `cd frontend && npx tsc --noEmit` passes with the new `e2e/*.ts` files included.
- `*@team4s.de` accounts and the rest of `team4s_v2` are unaffected (spot-checked: no
  `TRUNCATE`/`DROP` statement anywhere in any new script; `reset-fixtures.sh` only ever issues
  one scoped `DELETE /fansubs/:id` call).
- No password value appears in `git log -p` for any commit this plan produces, nor in any file
  under the repo tree (grep for the literal strings would require knowing a generated value —
  structurally guaranteed instead by the design: passwords are generated host-side into
  `~/.config/team4s-e2e.env` and never written to a repo path).
</verification>

<success_criteria>
- `bash scripts/e2e.sh` is the single command that provisions (idempotently) and runs all 4 role
  specs, exiting non-zero on any failure or on 0 executed tests, exactly as specified in the
  original requirement's acceptance criterion.
- 5 dedicated `@team4s.test` Keycloak accounts exist, provisioned idempotently, with
  `e2e-admin` alone holding `platform_admin`.
- "E2E Gruppe A" exists with a live `fansub_lead` leader and deputy and a historically-linked
  plain member, created exclusively through the existing admin API (no raw SQL), resettable via
  `scripts/e2e/reset-fixtures.sh` without ever touching unrelated data.
- The 4 first role specs pass against the real login form and the real app UI/API, proving:
  admin sees the user list, leader sees both review sections, member sees neither the button nor
  gets anything but 403 on direct confirm, user is blocked from `/admin/users`.
- Documentation (`frontend/e2e/README.md`) and an architecture-decision entry in `DECISIONS.md`
  exist, matching the "Dokumentation wächst mit dem Code" project rule.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
ORIGINAL-REQ | Punkt 1 | 5 Keycloak-Testkonten @team4s.test, idempotentes Skript, Secrets in ~/.config/team4s-e2e.env, platform_admin für e2e-admin, *@team4s.de unberührt | 1 | COVERED | provision-keycloak-users.sh.
ORIGINAL-REQ | Punkt 2 | DB-Fixtures E2E Gruppe A (Leitung/Stellvertretung/Mitglied) via bestehende API, Manifest-basiertes Reset, kein TRUNCATE | 2, 3 | COVERED | provision-fixtures.mjs + reset-fixtures.sh; Gruppe B bewusst nicht angelegt (kein Bedarf in Phase-1-Specs, siehe CONTEXT.md).
ORIGINAL-REQ | Punkt 3 | auth.setup.ts meldet jede Rolle über das echte Login-Formular an, storageState pro Rolle außerhalb von Git, automatische Erneuerung abgelaufener Sitzungen | 4 | COVERED | Jeder playwright-test-Lauf führt das setup-Projekt immer neu aus - das IST die Erneuerung.
ORIGINAL-REQ | Punkt 4 | 4 Rollen-Specs exakt wie spezifiziert | 5 | COVERED | admin-user-list, fansub-leader-tabs, member-protected-edit (Button + 403), user-blocked-admin.
ORIGINAL-REQ | Punkt 5 | Ein Einstieg scripts/e2e.sh, Exit-Code != 0 bei Fehler oder 0 Tests, läuft auf Linux-Dev-Stack | 6 | COVERED | jq-Parse der Playwright-JSON-Stats deckt den "0 Tests"-Fall ab, den der reine Exit-Code verfehlen könnte.
ORIGINAL-REQ | Punkt 6 | Doku (Ablauf/Rollen/Secrets/Reset) + DECISIONS.md-Eintrag | 7 | COVERED | frontend/e2e/README.md + DECISIONS.md.
ORIGINAL-REQ | Abnahmekriterium | `bash scripts/e2e.sh` zweimal grün, >=4 bestandene Tests | 6 | COVERED | Explizit im Verify von Task 6 geprüft.
CONTEXT | e2e-deputy Rollenmodell-Entscheidung | Zweite fansub_lead-Mitgliedschaft statt erfundener Stellvertretungsrolle | 2 | COVERED | deputy wird provisioniert (Punkt 1 verlangt das Konto) und bekommt dieselbe Live-Rolle wie leader; keine eigene Spec nötig (laut CONTEXT.md explizit kein Muss für Phase 1).
CONTEXT | Umfang der Rollenspecs | Exakt 4 Tests, kein Mehr, kein Weniger | 5 | COVERED | Keine 5. Spec für deputy hinzugefügt.
RESEARCH | Dateigrößen-Constraint (client.ts 1095 Zeilen) | Nicht anfassen | 4, 5 | COVERED | Alle neuen Dateien sind eigenständig, keine Erweiterung von client.ts.
</source_audit>

<output>
Create `.planning/quick/261026-wve-playwright-e2e-testanmeldung-mit-dedizie/261026-wve-SUMMARY.md` when done.
</output>
</output>
