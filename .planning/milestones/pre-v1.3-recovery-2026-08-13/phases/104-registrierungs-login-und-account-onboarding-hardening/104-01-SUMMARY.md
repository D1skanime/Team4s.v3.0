---
phase: 104-registrierungs-login-und-account-onboarding-hardening
plan: 01
subsystem: auth
tags: [keycloak, oidc, pkce, realm-config, theme, i18n, jsdom]

requires:
  - phase: 43-keycloak-auth-foundation
    provides: Keycloak realm/client bootstrap, KEYCLOAK_ACCOUNT_URL, /me/profile Account Console link
provides:
  - Reproduced-and-fixed Keycloak 26 Account Console 403 (missing built-in `roles` client scope)
  - Versioned, idempotent fresh-import and existing-volume update path via scripts/verify-keycloak-config.ps1
  - Minimal German Team4s-branded Keycloak login/registration/reset theme (parent=keycloak.v2)
  - Isolated per-field stale registration validation clearing (D-22) with jsdom coverage
affects: [104-02, 104-03, 104-04, 104-05, 104-06]

tech-stack:
  added: []
  patterns:
    - "Keycloak Admin REST API idempotent apply-and-verify PowerShell script (Add-Check/Invoke-JsonRequest pattern matching existing smoke-*.ps1 scripts)"
    - "curl.exe shelled out from PowerShell 5.1 for real browser-equivalent PKCE login flows (Invoke-WebRequest's CookieContainer silently drops Secure cookies over http://127.0.0.1)"
    - "jsdom test executes the real deployed script file via `new Function(source)` instead of reimplementing behavior"

key-files:
  created:
    - scripts/verify-keycloak-config.ps1
    - infra/keycloak/themes/team4s/login/theme.properties
    - infra/keycloak/themes/team4s/login/messages/messages_de.properties
    - infra/keycloak/themes/team4s/login/resources/css/login.css
    - infra/keycloak/themes/team4s/login/resources/js/registration-validation.js
    - frontend/src/lib/keycloakRegistrationValidation.test.ts
    - .planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md
  modified:
    - infra/keycloak/realm-team4s.json
    - docker-compose.yml
    - docs/operations/keycloak-auth-foundation-phase43.md

key-decisions:
  - "Root cause of the Account Console 403: realm-team4s.json's custom clientScopes list makes Keycloak skip creating the built-in `roles` scope, so no token in the realm ever carries realm_access/resource_access claims; the Account REST API needs resource_access.account.roles to authorize."
  - "account/account-console clients are intentionally NOT redeclared in realm-team4s.json: doing so was proven live to suppress Keycloak's own bootstrap of the account client's view-profile/manage-account roles and default-roles-team4s composite."
  - "One idempotent PowerShell script (scripts/verify-keycloak-config.ps1) covers both fresh import and existing-volume update, since Keycloak's own clientScopes-present quirk equally prevents auto-assigning `roles` as a default scope to account/account-console on either path."
  - "theme.properties `styles=` fully replaces (not merges with) the parent theme's own styles value on Keycloak 26 - verified live; the one layout-critical rule this drops is reproduced directly in the Team4s login.css instead of relying on unverifiable placeholder interpolation."
  - "messages_de.properties only overrides `registerTitle` - Keycloak already ships a complete, correct German translation via parent=keycloak.v2; only the one unbranded string (register page shows no realm name, unlike login) is worth overriding."
  - "internationalizationEnabled=true + defaultLocale=de is sufficient to make the external Account Console (stock keycloak.v3 theme) render in German too; no separate accountTheme was needed."

requirements-completed: [P104-REG-2, P104-ACCOUNT-2]

duration: 55min
completed: 2026-07-17
---

# Phase 104 Plan 01: Keycloak Account Console 403 fix and minimal German theme Summary

**Fixed the Keycloak 26 Account Console 403 by adding the missing built-in `roles` client scope (realm-team4s.json + idempotent scripts/verify-keycloak-config.ps1), and shipped a minimal parent=keycloak.v2 German Team4s login theme with an isolated per-field stale-validation fix, both verified live end-to-end on fresh and existing Keycloak volumes.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-07-17T18:23Z (approx, immediately after prior commit)
- **Completed:** 2026-07-17T19:15Z
- **Tasks:** 2 completed
- **Files modified/created:** 12

## Accomplishments

- Reproduced the real 403 via a full PKCE login against `account-console` and a bearer-authenticated `GET /realms/team4s/account`, and traced it to a missing built-in `roles` client scope caused by `realm-team4s.json`'s custom `clientScopes` list.
- Fixed it with the minimal evidence-backed change (add the `roles` scope; leave `account`/`account-console` clients undeclared so Keycloak's own bootstrap still wires their standard roles/composites), verified on three independent live Keycloak 26 instances (the existing populated volume, and two from-scratch ephemeral imports).
- Built one idempotent `scripts/verify-keycloak-config.ps1` that asserts the D-11/D-12/D-13/D-14 local test posture, applies the remaining Admin-REST-API-only fix step, and proves no 403 via a genuine PKCE login + Account REST API call — identical for fresh import and existing-volume update.
- Added a minimal German Team4s login theme (`parent=keycloak.v2`) with branding, and enabled realm-level `internationalizationEnabled`/`defaultLocale=de`, which also makes the external Account Console render German without a separate account theme.
- Fixed D-22 (stale per-field registration validation) via a small theme-mounted `registration-validation.js`, covering all six registration fields; only the edited field's own error/aria-invalid is cleared, server validation stays authoritative.

## Task Commits

1. **Task 1: Diagnose and fix the Account Console at its Keycloak owner** - `6e0f6bfe` (fix)
2. **Task 2: Add the minimal German theme and isolated stale-validation repair** - `a01b5f91` (feat)

## Files Created/Modified

- `infra/keycloak/realm-team4s.json` - added the built-in `roles` client scope + branding/locale/theme fields (`displayName`, `loginTheme`, `internationalizationEnabled`, `supportedLocales`, `defaultLocale`)
- `scripts/verify-keycloak-config.ps1` - idempotent assert-and-apply script covering the 403 fix and the branding/locale settings, plus a live PKCE-login-based no-403 proof
- `docker-compose.yml` - mounts `./infra/keycloak/themes/team4s` into `/opt/keycloak/themes/team4s:ro`
- `infra/keycloak/themes/team4s/login/theme.properties` - thin `parent=keycloak.v2` child theme wiring `styles`/`scripts`/`locales`
- `infra/keycloak/themes/team4s/login/messages/messages_de.properties` - one branding override (`registerTitle`)
- `infra/keycloak/themes/team4s/login/resources/css/login.css` - Team4s accent color + one reproduced layout rule
- `infra/keycloak/themes/team4s/login/resources/js/registration-validation.js` - isolated per-field stale-error clearing, exposes an extractable `window.Team4sRegistrationValidation` seam
- `frontend/src/lib/keycloakRegistrationValidation.test.ts` - jsdom coverage executing the real theme script against fixture markup mirroring the live-verified Keycloak 26 DOM
- `docs/operations/keycloak-auth-foundation-phase43.md` - documents the 403 root cause/fix and the theme/locale setup for both fresh-import and existing-volume paths
- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md` - records pre-existing, out-of-scope frontend test failures found during full-suite verification

## Decisions Made

See `key-decisions` in frontmatter above for the full list. Most consequential: the account/account-console clients stay undeclared in `realm-team4s.json` (redeclaring them breaks Keycloak's own role bootstrap), and the one remaining "assign `roles` as a default scope" step lives in the idempotent PowerShell script rather than in static JSON, because that assignment cannot be expressed declaratively without breaking the bootstrap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] realm-team4s.json branding/locale fields not in Task 2's `<files>` list but required by its own action**
- **Found during:** Task 2
- **Issue:** Task 2's action explicitly requires "set Team4s display branding plus German login, registration, password-reset and Account Console locale/copy," which is only possible via realm-level `displayName`/`loginTheme`/`internationalizationEnabled`/`supportedLocales`/`defaultLocale` fields, but `infra/keycloak/realm-team4s.json` was listed only under Task 1's `<files>`, not Task 2's.
- **Fix:** Added those fields to `realm-team4s.json` (already in the plan's top-level `files_modified` frontmatter) and extended `scripts/verify-keycloak-config.ps1` to assert/apply them for the existing-volume path.
- **Files modified:** `infra/keycloak/realm-team4s.json`, `scripts/verify-keycloak-config.ps1`
- **Verification:** Live on a fresh ephemeral import and on the existing running `team4sv30-keycloak` volume; `<html lang="de">` confirmed on the Account Console, German copy confirmed on login/registration/reset.
- **Committed in:** `a01b5f91` (Task 2 commit)

**2. [Rule 1 - Bug] `${parent.styles}`/`${styles}` self-reference in theme.properties does not merge parent and child `styles=` on Keycloak 26**
- **Found during:** Task 2, live verification
- **Issue:** The first theme.properties draft assumed `styles=` values merge across the parent theme chain via a placeholder; live testing showed Keycloak 26 fully replaces the value instead, dropping `keycloak.v2`'s own `.pf-v5-c-login__container` grid layout rule and rendering a broken literal `${parent.styles}` / `${styles}` URL segment.
- **Fix:** Set `styles=css/login.css` (plain value, no placeholder) and reproduced the one layout-critical rule directly inside `login.css`, with a comment explaining why. Keycloak's own background/logo image assets were intentionally not copied.
- **Files modified:** `infra/keycloak/themes/team4s/login/theme.properties`, `infra/keycloak/themes/team4s/login/resources/css/login.css`
- **Verification:** Re-fetched the live registration page after the fix; confirmed a valid, resolving `<link>` to the theme's `login.css` and correct card layout.
- **Committed in:** `a01b5f91` (Task 2 commit)

**3. [Rule 3 - Blocking] Windows PowerShell 5.1's `Invoke-WebRequest`/`CookieContainer` cannot complete the live PKCE login proof**
- **Found during:** Task 1, building `scripts/verify-keycloak-config.ps1`'s live no-403 check
- **Issue:** Keycloak issues its session cookies with the `Secure` attribute even on plain `http://127.0.0.1:18081`; .NET Framework's `CookieContainer` (used by `Invoke-WebRequest -WebSession`) silently drops `Secure` cookies on non-HTTPS requests, so the scripted login POST always failed with an empty session.
- **Fix:** Shelled out to `curl.exe` (present via Git for Windows / Windows 10+) for the multi-step login/token-exchange flow, matching the exact manual reproduction flow used to diagnose the original 403.
- **Files modified:** `scripts/verify-keycloak-config.ps1`
- **Verification:** Script runs end-to-end (30-40 checks depending on flags) against both the existing volume and fresh ephemeral imports, ending in a genuine 200 from the Account REST API.
- **Committed in:** `6e0f6bfe` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** All three were necessary to deliver working, live-verified Keycloak configuration and tooling exactly as the plan's own action/verify steps require. No scope creep beyond D-01–D-24.

## Issues Encountered

- A full `cd frontend && npx vitest run` shows 7 failed test files / 14 failed tests, all in the `anime/[id]/group/[groupId]` / `fansubprojekt` area, introduced by a concurrent session's commit `0986ba6b` (landed on `main` mid-session, per this repo's documented concurrent-GSD-writer posture). None of these files are touched by this plan. Logged in `deferred-items.md` and left unfixed per the executor scope boundary.
- The originally-running `team4sv30-keycloak` container/volume had accumulated a non-standard client-scope set (missing `roles`, `web-origins`, `microprofile-jwt`) from an earlier bootstrap; this is exactly the state the fix + idempotent script now correctly repair, live-verified without a destructive volume reset.

## User Setup Required

None - no external service configuration required. `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` used by the script already default to the existing local dev credentials (`admin`/`admin`) documented in `docs/operations/keycloak-auth-foundation-phase43.md`.

## Next Phase Readiness

- The Account Console link on `/me/profile` (`AccountSecurityCard.tsx`) now opens without a 403 for any authenticated Team4s user, on both the current local volume and any future fresh import.
- Registration, login, and password-reset are German and Team4s-branded, ready for Plan 104-02 to wire visible `Anmelden`/`Registrieren` CTAs through the existing PKCE seam.
- `scripts/verify-keycloak-config.ps1` is a reusable regression guard for later 104-* plans that touch Keycloak realm/client/theme config.

---
*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 10 created/modified files verified present on disk; both task commit hashes (`6e0f6bfe`, `a01b5f91`) verified present in `git log --oneline --all`.
