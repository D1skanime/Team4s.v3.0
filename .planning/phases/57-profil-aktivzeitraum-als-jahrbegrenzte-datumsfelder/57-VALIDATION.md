# Phase 57 Validation

## Nyquist Sampling Plan

| Invariant | Lowest-cost check | Broader check |
|---|---|---|
| DB stores profile activity period as `DATE` | migration diff and migration runner test/up-down where available | backend repository test with seeded rows |
| Date values are year-normalized | handler/repository validation test rejects non-January-1 dates | UI test proves only years are selectable |
| API contract stays aligned | OpenAPI schema diff plus frontend DTO compile | profile API helper/page tests |
| Protected profile UI remains refresh-session aware | existing `page.test.tsx` refresh-session test remains green | focused browser UAT after implementation |
| Dirty-state is preserved | existing Keycloak-return dirty tests updated to date fields | manual UAT edit without save then focus refresh |

## Required Checks

- `git status --short database/migrations`
- `cd backend && go test ./internal/handlers ./internal/repository`
- `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx`
- `cd frontend && npm run typecheck`
- `git diff --check`

## Human UAT

1. Open `/me/profile` as an authenticated user.
2. Set `Aktiv seit` to a year and `Aktiv bis` to a later year; save; reload; confirm the same years show.
3. Enable `Aktuell aktiv`; confirm `Aktiv bis` clears/disables; save; reload; confirm no until year shows.
4. Confirm the controls expose only year choices, not arbitrary free text.
