# Phase 52 UAT: Profile Account Return Refresh Flow

## Scope

Phase 52 fixes the Team4s-side Keycloak account handoff on `/admin/profile`:
- Keycloak account data opens in a new tab.
- Team4s shows a clear post-click return hint.
- On focus/visibility return, Team4s refreshes the active auth session through `refreshActiveAuthSession()` and reloads the profile through `getOwnProfile()`.
- Read-only account cards update only from the profile API response.
- `Accountdaten aktualisiert.` appears only when account-card data really changed.
- Unsaved Team4s profile form edits are preserved.

## Automated Evidence

| Check | Result | Notes |
|---|---:|---|
| `cd frontend && npm run test -- --run "src/app/admin/profile/page.test.tsx"` | PASS | 8 tests cover CTA label, new-tab target, return hint, changed-data toast, unchanged quiet path, dirty form preservation, and duplicate focus guard. |
| `cd frontend && npm test -- --run src/lib/api.no-token-boundary.test.ts src/lib/api.auth-refresh.test.ts` | PASS | Auth boundary remains centralized; Phase 52 narrowly allows the profile page to call the central `refreshActiveAuthSession()` seam. |
| `cd frontend && npm run typecheck` | PASS | TypeScript check passed. |
| `cd frontend && npx eslint "src/app/admin/profile/page.tsx" "src/app/admin/profile/page.test.tsx" "src/lib/api.no-token-boundary.test.ts"` | PASS | Focused lint on modified frontend files passed. |
| `cd frontend && npm run build` | PASS | Next production build completed successfully. |
| `git diff --check` | PASS | Only LF/CRLF working-copy warnings were reported. |
| `cd frontend && npm run lint` | FAIL, unrelated existing issues | Existing lint errors remain in release-version media tests, dev UI system, PlatformAdminGate, and temporary live-flow scripts. No new Phase 52 lint error was reported. |

## Manual / Live UAT

Status: Pending live Keycloak run.

Manual path when the local auth stack is running:
1. Open `/admin/profile`.
2. Click `Accountdaten bei Keycloak ändern`.
3. Confirm Keycloak opens in a new tab and Team4s shows the return hint.
4. Change a harmless account field in Keycloak, such as first or last name, and save.
5. Return to Team4s.
6. Confirm the account cards show the updated Account-Name/E-Mail and the page shows `Accountdaten aktualisiert.`.
7. Repeat with no Keycloak change and confirm no dramatic state or success toast appears.
8. Edit `Anzeigename` in Team4s before returning from Keycloak and confirm the unsaved field is not overwritten.

## Deferred

Keycloak-side Account Console theming for a dedicated `Zurück zu Team4s` button remains deferred. Phase 52 deliberately solves the Team4s-side return flow without changing Keycloak themes.
