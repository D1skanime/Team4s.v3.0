---
status: complete
quick_id: 260703-bc9
slug: fix-sticky-admin-auth-logout-state-block
date: 2026-07-03
---

# Quick Task 260703-bc9: Fix sticky admin auth/logout state blocking leader/member E2E

## Outcome

Fixed the sticky admin auth/logout blocker that stopped the fresh UI-first E2E retest before the leader/member flow.

The browser logout seam now clears the local Team4s runtime session before attempting remote revocation. Remote Keycloak/backend logout failures no longer keep the previous local user visible in the UI. Keycloak logout now uses the existing same-origin proxy endpoint `/api/auth/keycloak/logout`, matching the token refresh proxy pattern and avoiding browser CORS/redirect coupling.

## Files Changed

- `frontend/src/lib/api.ts`
- `frontend/src/lib/keycloakAuth.ts`
- `frontend/src/lib/api.auth-refresh.test.ts`
- `frontend/src/lib/keycloakAuth.test.ts`
- `.planning/quick/260703-bc9-fix-sticky-admin-auth-logout-state-block/260703-bc9-PLAN.md`
- `.planning/quick/260703-bc9-fix-sticky-admin-auth-logout-state-block/260703-bc9-SUMMARY.md`
- `.planning/STATE.md`

## Verification

- `npm test -- --run src/lib/api.auth-refresh.test.ts src/lib/keycloakAuth.test.ts` passed: 16 tests.
- `npm run typecheck` passed.
- `npx eslint src/lib/api.ts src/lib/keycloakAuth.ts src/lib/api.auth-refresh.test.ts src/lib/keycloakAuth.test.ts` passed.
- `git diff --check` passed with CRLF warnings only.
- In-app browser sanity check:
  - `/admin` rendered as anonymous and blocked admin access.
  - `/login` rendered `Mit Keycloak anmelden` instead of the stale `Erneut anmelden` state.

## Notes

The broad `npm run lint -- ...` command still runs `eslint .` because of the package script and failed on an existing unrelated `frontend/src/components/ui/DatePicker.tsx` `react-hooks/set-state-in-effect` error, plus existing warnings across many untouched files. The targeted ESLint check on this Quick's changed files passed.

## Next Step

Repeat the full fresh UI-first Viper's Creed E2E retest from reset, including accepting the C-Subs leader invitation and verifying leader/member routes without manual cookie or storage manipulation.
