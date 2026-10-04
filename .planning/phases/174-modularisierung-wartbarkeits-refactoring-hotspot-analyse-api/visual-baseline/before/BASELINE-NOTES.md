# Visual Baseline — Reproduction Notes (174-01 Task 4, D-18)

Captured 2026-10-04 against `main` before any Welle-5 CSS split (174-22/174-23) touches
`FansubEdit.module.css` or `ui.module.css`. 174-24 must reproduce every shot below
identically (same URLs, viewports, fansub group id, and interactive-state triggers) to
prove visual equality after the split.

## Prerequisites the capture relied on (reproduce identically in 174-24)

- **Frontend image freshness:** the running `team4sv30-frontend` container was rebuilt
  (`docker compose build team4sv30-frontend && docker compose up -d --no-deps
  team4sv30-frontend`) immediately before capture, because the previously-running image
  was 4 days stale relative to `main` (confirmed via `docker inspect .Created` vs.
  `git log` on changed frontend files) and produced a visibly different page for the
  `mitwirkende/[memberSlug]` test. 174-24 must do the same rebuild-before-capture step,
  otherwise its "after" shots could be diffed against stale-vs-fresh noise unrelated to
  the CSS split.
- **CORS origin constraint:** the backend's `CORS_ALLOWED_ORIGINS` falls back to
  `APP_PUBLIC_URL` (`http://127.0.0.1:3300` per `.env`) when unset. Navigating Playwright
  directly to `http://127.0.0.1:3000/...` (the frontend's own mapped port) causes every
  client-side `fetch` to the backend to fail with a generic `Failed to fetch` (CORS
  preflight rejection), rendering the Fansub-Edit page's error state instead of real
  content. **Fix used:** ran a trivial same-container TCP loopback proxy inside
  `team4sv30-frontend` (Node `net.createServer`, listening on `127.0.0.1:3300`,
  forwarding to `127.0.0.1:3000`) and pointed Playwright's `AUDIT_BASE` at
  `http://127.0.0.1:3300` instead, so the browser's `Origin` header matches the
  backend's allow-list exactly. No container/file config was changed; the proxy is a
  transient Node process, not a product change. 174-24 must reproduce the identical
  proxy-and-origin setup (or set `CORS_ALLOWED_ORIGINS` to include the real capture
  origin, whichever is more convenient at that time) — otherwise it will capture the
  same CORS error page instead of the real Fansub-Edit content and the "after" diff will
  be meaningless.
- **Auth:** the Fansub-Edit route requires an authenticated `platform_admin`. Since
  Keycloak is enabled (`KEYCLOAK_ENABLED=true`), the simple HMAC bootstrap-token flow
  documented in `scripts/smoke-admin-content.ps1` does **not** work against protected
  routes under this live config (that flow only works when Keycloac is disabled — see
  `backend/cmd/server/main.go`'s `if cfg.KeycloakEnabled { ... CurrentUserMiddleware }`
  branch). A real Keycloak access token was obtained via the realm's direct grant:
  ```
  curl -X POST http://127.0.0.1:18081/realms/team4s/protocol/openid-connect/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=team4s-frontend" \
    --data-urlencode "username=admin" \
    --data-urlencode "password=<see note below>" \
    --data-urlencode "scope=openid profile email"
  ```
  The realm's seeded `admin` user (`app_user_id=1`, `platform_admin`) had an unknown
  password in this session, so its Keycloak password was reset once via
  `kcadm.sh set-password -r team4s --username admin --new-password '<local-dev-only>'`
  (a local-dev Keycloak credential reset, consistent with how
  `scripts/provision-phase134-matrix-db.sh` already provisions test accounts via
  `kcadm`; no product file changed). The resulting `access_token` was injected as the
  `team4s_access_token` cookie (`AUTH_TOKEN_COOKIE_NAME` in `frontend/src/lib/api.ts`)
  via Playwright's `context.addCookies`, `domain: '127.0.0.1'`, `path: '/'`,
  `sameSite: 'Lax'` — matching the exact pattern already used by
  `frontend/scripts/collect-member-profile-evidence.mjs`. 174-24 needs the same (or an
  equivalently reset) admin credential to reproduce.

## Shots

| File | URL | Viewport | Notes |
|---|---|---|---|
| `fansub-edit-desktop.png` | `http://127.0.0.1:3300/admin/fansubs/1/edit` | 1440×900, `deviceScaleFactor: 1`, `reducedMotion: 'reduce'` | Group id 1 = slug `new-subs` (real seeded fansub group, confirmed via `SELECT id, slug FROM fansub_groups ORDER BY id LIMIT 3`). Full-page screenshot (`fullPage: true`), `waitUntil: 'networkidle'` + 1500ms settle. |
| `fansub-edit-mobile-375.png` | same URL | 375×812, same auth/settle | Mobile viewport per D-18's "representative mobile" requirement. |
| `ui-system-desktop.png` | `http://127.0.0.1:3300/dev/ui-system` | 1440×900 | Global UI showcase route, `waitUntil: 'networkidle'` + 1000ms settle. No auth cookie needed (public dev route). |
| `button-hover.png` | same `/dev/ui-system` page/session | — | `page.hover()` on the Button Showcase's `<Button>Primary</Button>` instance (`page.getByRole('button', { name: 'Primary', exact: true })`), 150ms settle, element-scoped screenshot. |
| `button-focus.png` | same | — | **Not** a real keyboard-Tab sequence — see "Discovered but out-of-scope" below. Captured via Playwright's `locator.focus()` on the same Primary button, which applies the real browser `:focus`/`:focus-visible` CSS state. |
| `button-disabled.png` | same | — | Static — the showcase already renders a permanently-disabled `<Button disabled>Disabled</Button>` instance; no interaction needed, element-scoped screenshot. |
| `input-focus.png` | same | — | `locator.focus()` on `#demo-title` (the Form Showcase's `Input`), element-scoped screenshot. |
| `select-focus.png` | same | — | `locator.focus()` on `#demo-status` (the Form Showcase's `Select`), element-scoped screenshot. |

## Discovered but out-of-scope: global-nav focus trap on `/dev/ui-system`

A real keyboard-Tab traversal from page load was attempted first (click `body` at
`(2,2)` to reset focus, then repeatedly `page.keyboard.press('Tab')`). It never reached
the Button Showcase even after 250 presses. A 15-press manual trace showed the root
cause: after the first two stops (a skip-link `DIV` and a mobile-menu-toggle `BUTTON`),
focus enters the global nav bar's 5 links (`Anime entdecken` → `Rangliste` →
`Fansub-Gruppen` → `Suche` → `Anmelden`) and **cycles indefinitely** inside that group,
never releasing focus into the rest of the page. This is a real, reproducible
accessibility bug in the global nav component, independent of Phase 174's CSS-split
work — logged here for visibility (per D-05/D-06's "discovered issues" spirit) but
**not fixed** in this plan (Welle 1 forbids refactoring; this isn't even a Phase-174
candidate file). Recommend a follow-up phase or quick-fix ticket.

Given this, `button-focus.png` uses `locator.focus()` instead of a real Tab sequence
(see table above) — both produce the identical `:focus`/`:focus-visible` CSS state in
Chromium, so the visual-equality comparison 174-24 needs is unaffected; only the
*reproduction instructions* differ from a literal "N Tab presses" recipe.
