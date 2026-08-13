# Phase 104: Registrierungs-, Login- und Account-Onboarding-Hardening — Research

**Researched:** 2026-07-17  
**Status:** Planning-ready after discuss-phase  
**Authority:** `104-CONTEXT.md` (D-01–D-24) overrides older research and the currently stale Phase-104 roadmap wording.

## Kurzfazit

Phase 104 repairs the visible registration, login, logout, account onboarding, Keycloak Account Console, auth hydration, and immediately related navigation on the existing OIDC/PKCE and central API-client foundation. It is not an auth redesign and it must not turn an ordinary `app_user` into a fansub member or project owner.

The planning axis is:

1. make registration directly discoverable, German, Team4s-branded, and correct stale field validation;
2. preserve automatic login and land a newly registered account on `/me/profile` with a trusted one-shot success confirmation;
3. converge login callback, refresh-only session, shell navigation, and profile loading into one neutral initialization state;
4. expose project navigation only for a verified member with at least one real project/contribution assignment;
5. fix the external Keycloak Account Console 403 in versioned Keycloak/client/realm configuration;
6. make mobile navigation and logout deterministic on the first tap;
7. verify the complete flow through visible UI from `http://127.0.0.1:3000/`.

Phase 104 deliberately keeps the current local test posture: password `123` remains valid, brute-force/lockout remains disabled, Direct Access Grants remain enabled for current local scripts, and email verification is not required. Production hardening belongs in a later phase.

## Locked product and security contract

Every plan must satisfy all of D-01–D-24 from `104-CONTEXT.md`. The following are especially important because prior research or the roadmap currently conflicts with them:

- Registration automatically logs in and resolves to `/me/profile` (`Mein Account`); no second login.
- Show exactly: “Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.” It is one-shot, remains until dismissed or page leave, and cannot be forged by a query parameter alone.
- Registration creates only `app_user`: no Team4s DB role `user`, member, group membership, contribution, or project.
- Not every account is a fansub member. The account-only state is normal and useful.
- `Meine Projekte` is absent unless a verified linked member has at least one real project/contribution assignment. `has_member_profile` alone is insufficient.
- An authenticated user without that project entitlement who directly opens `/me/contributions` is redirected to `/me/profile`; no error, login CTA, or claim-page substitute.
- Member search/claim remains an optional, unobtrusive “Warst du als Fansubber aktiv?” section below account data.
- The external Keycloak Account Console stays in a new tab; fix its 403 in Keycloak configuration, not through a Team4s UI workaround.
- Keep only `Mein Account` in navigation; remove the duplicate `Account & Sicherheit` entry.
- During callback/session initialization/refresh/profile load show one neutral loading state. A valid session plus profile failure shows German `Erneut versuchen` and `Abmelden`, never `Anmelden`.
- Missing/expired access token plus valid refresh token is an active session and must go exclusively through `useAuthSession`/the central API refresh seam.
- Keycloak login, registration, reset, and Account Console are German and Team4s-branded. Correct per-field stale validation without hiding unrelated errors.
- Visible Team4s login/register CTAs use `@/components/ui/Button`.
- Drawer navigation and logout close/react on the first tap and expose an appropriate pending state.

## Existing seams and findings

### Login, registration, and callback

- `frontend/src/lib/keycloakAuth.ts` already owns Authorization Code + PKCE state/verifier and is the required seam for both login and registration. Extend it; do not create a second callback or move tokens into page components.
- `frontend/src/app/login/page.tsx` and its existing test are the visible Team4s entry. Add separate German `Anmelden` and `Registrieren` CTAs using the global Button primitive and preserve safe local `next` handling.
- A registration completion marker must be trusted and one-use. The implementation may choose a short-lived session/storage marker bound to the successful locally initiated registration callback, but a bare `?registered=1` is forbidden. Consume it on `/me/profile`; dismissal or navigation clears it.
- Registration still completes through Keycloak and automatic authentication. The callback must wait for the Team4s account/profile to load before presenting the settled account surface.

### Central session and hydration

- `frontend/src/lib/api.ts` is the central browser token/refresh transport; `frontend/src/lib/useAuthSession.ts` and `AppShellClientWrapper.tsx` project that state into UI.
- Current code already derives the active session from access or refresh material. Plans must retain `hasAccessToken || hasRefreshToken`, central refresh/401 retry, and no direct Keycloak refresh calls in ordinary UI.
- `AppShellClientWrapper.tsx` currently loads own profile separately from page content, which permits the reproduced contradiction: authenticated navigation while content still asks to log in. Plan a single explicit initializing/authenticated-profile-error/ready projection shared by shell and protected account pages.
- In `frontend/src/lib/api.ts`, browser auth cookies are written with `SameSite=Lax` but no `Secure`. Preserve local HTTP functionality; add `Secure` only when the runtime is actually HTTPS (or via the established environment-aware seam). Test both HTTPS behavior and local HTTP compatibility. Do not attempt an httpOnly/BFF redesign.

### Account-only, member, and projects

- `frontend/src/components/layout/AppShell.tsx` currently always includes `Meine Projekte` and duplicates `/me/profile` as `Account & Sicherheit`. These are direct defects.
- `hasMemberProfile` is currently the shell’s strongest signal, but D-09 requires a stronger entitlement: verified member plus at least one actual project/contribution. Planning must identify an existing aggregate/capability/assignment count before adding contract fields. If no stable existing signal exists, add one through backend model/handler, focused/shared OpenAPI contracts, frontend type/API mapping, and tests in the same task.
- Do not infer project entitlement from global role, realm role, group membership alone, localized error text, or merely `member_id > 0`.
- `frontend/src/app/me/contributions/page.tsx` currently renders missing-member/loading failures as a project error with a login action. For an authenticated non-entitled account it must redirect to `/me/profile`. Anonymous access can retain the standard safe-login flow; real network/5xx failures remain retryable errors.
- `frontend/src/app/me/profile/page.tsx`, `MemberClaimSection.tsx`, and `ClaimStatusCard.tsx` already contain claim/search behavior. Recompose those into the optional account section; do not invent a parallel member API.
- `backend/internal/repository/app_auth_repository.go` already provisions `app_users` without implicit global app roles. Preserve this with a regression test.

### Navigation and logout

- `AppShell.tsx` owns desktop/mobile navigation and drawer state. Route selection must close the drawer immediately and navigate once. Logout must expose a pending state, close the drawer, and invoke the existing logout seam once.
- Retain the user-visible route semantics. Headless tests support but do not replace in-app browser UAT.

### Keycloak realm, Account Console, language, and theme

- `infra/keycloak/realm-team4s.json` is the versioned local realm. It currently advertises `Team4s Local`, allows registration/reset, and keeps `team4s-frontend.directAccessGrantsEnabled: true`.
- `docker-compose.yml` uses Keycloak 26.0 and mounts `./infra/keycloak` only into `/opt/keycloak/data/import:ro`. There is no versioned theme tree yet, so planning must add an explicit theme mount and documented fresh/imported-realm update path.
- Diagnose Account Console 403 against the effective Keycloak 26 builtin `account`/`account-console` clients, redirect/origin settings, realm login theme/account theme, and container logs before changing configuration. Success is the existing `/realms/team4s/account` opening in a new tab without 403 and permitting name/email/password management.
- Realm imports do not safely imply updates to an already populated Keycloak DB. The plan must include both reproducible fresh import and a controlled `kcadm.sh`/documented update for existing local volumes.
- Set German locale/default locale and Team4s display/branding without claiming email verification or password requirements that are not enabled.
- Prefer a parent-based minimal Keycloak 26 theme and client-side registration validation cleanup first. If a script cannot reliably clear only the corrected field’s stale server error, the exact permitted minimal fallback template is `infra/keycloak/themes/team4s/login/register.ftl`. Do not broaden into copies of the full Keycloak theme.
- Candidate theme script: `infra/keycloak/themes/team4s/login/resources/js/registration-validation.js`. Its automated Vitest coverage must be placed under the configured include path, for example `frontend/src/lib/keycloakRegistrationValidation.test.ts`, importing/test-driving an extractable DOM behavior seam. `infra/**.test.ts` is not discovered by `frontend/vitest.config.ts` (`src/**/*.test.ts(x)`). If direct import across the package boundary proves unsuitable, the plan must name an exact separate runner and command; it may not merely say “add a test in infra”.

## Explicitly deferred production hardening

These are not Phase-104 work and must not appear as implementation or acceptance requirements:

- password policy or password-rule UI; local password `123` must continue to work;
- brute-force protection or lockout configuration;
- disabling `directAccessGrantsEnabled`; it remains enabled for current local scripts and must be documented as local-only posture;
- required email verification, pending-account enforcement, or `app_users.email` uniqueness/migration;
- token persistence redesign to httpOnly/BFF;
- general realm-role redesign. The unused realm role `user` may remain or be removed as an implementation detail, but it cannot map to Team4s app roles or UI membership/project entitlement;
- general public copy cleanup (`P0 MVP`, `Episodes`, `Views`) and C-Subs demo/history content.

## Contract impact

Prefer no new endpoint. Inspect, in order:

1. `shared/contracts/openapi.yaml` own-profile aggregate and capabilities;
2. `shared/contracts/contributions.yaml` member/project assignment semantics;
3. backend own-profile handler/repository projection;
4. `frontend/src/types/profile.ts` and `frontend/src/lib/api.ts` mapping.

If existing data cannot distinguish “verified member with >=1 real project/contribution” from “verified member without projects”, introduce one additive, documented capability/count through every contract layer and focused tests. Do not parse translated messages or treat a 403 as product state. Registration provisioning must remain role/domain-neutral.

## Recommended plan cut and dependencies

### Wave 1 — Keycloak reproducibility and visible auth surface

1. Diagnose and repair Account Console 403; version realm/client/theme mounts and fresh/existing realm update instructions.
2. Add minimal German Team4s login/registration/reset/account theming and field-local stale-validation behavior, with executable test placement under `frontend/src/**` (or an exact named runner).
3. Add visible Team4s login/register CTAs through the existing PKCE seam and trusted post-registration marker.

Do not add password policy, lockout, email verification, or Direct Grants changes.

### Wave 2 — Session convergence and account landing

4. Unify callback/session/refresh/profile hydration states; implement the neutral loader and authenticated profile-error actions.
5. Land successful registration at `/me/profile` and show/consume the neutral one-shot confirmation.

Tasks touching `frontend/src/app/me/profile/page.tsx` or shared auth projection must be serialized to avoid overlapping edits.

### Wave 3 — Domain-correct navigation

6. Establish the stable project-entitlement signal through existing contracts or an additive capability.
7. Gate `Meine Projekte`, redirect non-entitled direct `/me/contributions` visits, retain optional member claim, and remove duplicate account navigation.
8. Harden drawer navigation/logout and environment-aware secure-cookie behavior.

### Wave 4 — Integrated verification

9. Run focused/full automated checks and UI-only live UAT from the public homepage, including logout/relogin, refresh-only state, Account Console new tab, and mobile first-tap behavior.

## Test strategy

### Frontend automated

- `frontend/src/app/login/page.test.tsx`: German Button-based login/register CTAs, safe `next`, PKCE registration start, trusted completion marker behavior.
- `frontend/src/lib/keycloakAuth.test.ts`: shared PKCE/state/verifier invariants for login and registration.
- `frontend/src/components/layout/AppShellClientWrapper.test.tsx`: refresh-only is active; neutral initialization; valid-session profile failure offers retry/logout and never login.
- `frontend/src/components/layout/AppShell.test.tsx`: account-only and member-without-project omit projects; entitled member sees projects; duplicate account item absent; first-tap drawer navigation/logout.
- `frontend/src/app/me/profile/page.test.tsx`: neutral account-only surface, optional fansubber section, one-shot registration confirmation, account-console external link/return refresh.
- Add focused `/me/contributions` coverage for redirect versus entitled content and genuine transport errors.
- Theme validation: exact candidate `frontend/src/lib/keycloakRegistrationValidation.test.ts`; command `cd frontend && npx vitest run src/lib/keycloakRegistrationValidation.test.ts`.
- `frontend/src/lib/api.test.ts` or a narrower existing auth-cookie test: HTTPS adds `Secure`; `http://127.0.0.1` remains functional without it.

### Backend and contracts

- Regression: `EnsureAppUserForIdentity` creates only `app_user`, no global role/member/group/contribution/project.
- Own-profile entitlement signal accurately distinguishes account-only, verified member without assignments, and verified member with at least one real project/contribution.
- If a field/capability changes, update and test backend DTO/handler, `shared/contracts/openapi.yaml`, focused contract, frontend types, and API mapping together.

### Keycloak/config

- Parse/assert realm locale, display name, theme selection, registration/reset, frontend redirects/origins, and `directAccessGrantsEnabled: true`.
- Assert absence of newly imposed password policy, email-verification requirement, and brute-force/lockout enablement.
- Validate Compose theme mount and documented existing-realm update path.
- Reproduce Account Console 403 before the fix and verify `/realms/team4s/account` afterward through UI.

### Required UI-only UAT

Start at `http://127.0.0.1:3000/`; use only visible UI except entering `/me/contributions` in the address bar for the explicit protected-route test.

1. Discover German `Registrieren` through normal navigation.
2. Submit invalid/empty registration; correct fields individually and confirm only current field errors remain. Register using local password `123`.
3. Confirm automatic login, `/me/profile`, exact neutral one-shot message, and normal account-only surface with no project link.
4. Confirm optional fansubber section does not imply membership.
5. Leave/revisit profile; confirmation is gone. A query parameter alone cannot recreate it.
6. Logout and login again; no contradictory login/account states.
7. With access token absent/expired but refresh valid, protected account UI proceeds through central refresh.
8. Directly open `/me/contributions` as account-only and verified-member-without-project; both resolve to `/me/profile` without error/login CTA.
9. With a verified member having a real assignment, `Meine Projekte` appears and works.
10. Open Account Console in a new tab; no 403; return refresh remains correct.
11. On mobile, first-tap navigation and logout close the drawer and complete exactly once.

## Validation commands

- `cd frontend && npx vitest run src/app/login/page.test.tsx src/lib/keycloakAuth.test.ts src/components/layout/AppShellClientWrapper.test.tsx src/components/layout/AppShell.test.tsx src/app/me/profile/page.test.tsx`
- `cd frontend && npx vitest run src/lib/keycloakRegistrationValidation.test.ts`
- `cd frontend && npm test`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd backend && go test ./...`
- repository-specific contract checks after inspecting package scripts
- `git diff --check`
- UI-only in-app browser UAT as above

## Planning risks

- The current Phase-104 roadmap text still demands a 12-character password policy and lockout work, contradicting D-11/D-12. Planner must use `104-CONTEXT.md` and this research; roadmap acceptance wording should be corrected as part of planning metadata before execution.
- A populated Keycloak DB will not reliably reapply import JSON. Without an explicit update path, the code can be correct while live UAT still reproduces 403/English branding.
- A broad copied Keycloak theme is upgrade-fragile. Keep parent inheritance and the exact minimal `register.ftl` fallback only if the script cannot solve stale errors.
- `hasMemberProfile` does not satisfy D-09. Plans must locate or add an actual assignment entitlement without crossing account/member/project ownership.
- UI gating is not authorization. Existing backend member/project gates remain required.
- Shell and pages must not retain separate auth truth or the original race will survive behind a cosmetic loader.
- `Secure` cookies cannot be unconditional on local HTTP or the agreed local login flow will break.

## Read first for plans

- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/104-CONTEXT.md`
- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/auth-api-client.md`
- `docs/api/api-contracts.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `docs/operations/keycloak-auth-foundation-phase43.md`
- `infra/keycloak/realm-team4s.json`
- `docker-compose.yml`
- `frontend/vitest.config.ts`
- `frontend/src/lib/keycloakAuth.ts`
- `frontend/src/lib/useAuthSession.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/components/layout/AppShellClientWrapper.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/app/me/profile/page.tsx`
- `frontend/src/app/me/profile/components/AccountSecurityCard.tsx`
- `frontend/src/app/me/profile/components/MemberClaimSection.tsx`
- `frontend/src/app/me/contributions/page.tsx`
- `backend/internal/repository/app_auth_repository.go`
- `backend/internal/handlers/app_profile.go`
- `shared/contracts/auth.yaml`
- `shared/contracts/contributions.yaml`
- `shared/contracts/openapi.yaml`

## RESEARCH COMPLETE
