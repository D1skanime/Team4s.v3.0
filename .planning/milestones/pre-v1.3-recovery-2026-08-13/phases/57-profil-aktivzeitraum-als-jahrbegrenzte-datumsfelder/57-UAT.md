# Phase 57 UAT

Status: pending authenticated browser session

## Checklist

- [ ] Open `/me/profile` as an authenticated user.
- [ ] Choose `Aktiv seit` and `Aktiv bis`, save, reload, and confirm the same years persist.
- [ ] Enable `Aktuell aktiv`, save, reload, and confirm `Aktiv bis` stays empty and disabled.
- [ ] Confirm the UI only allows year selection and does not expose month/day or free text.
- [ ] Confirm protected profile loading still works when the access token is absent or expired but the refresh session is valid.

## Current Browser Evidence

- Dev server: `http://127.0.0.1:3000`
- `/me/profile` opened successfully in the in-app browser.
- Browser had no authenticated session, so the page showed `Anmeldung erforderlich`.
- Automated test coverage passes for the refresh-session path and date payload behavior.

## Restart Steps

1. Keep or restart the frontend dev server with `cd frontend && npm run dev -- -H 127.0.0.1`.
2. Log in through the normal local auth flow.
3. Open `http://127.0.0.1:3000/me/profile`.
4. Run the checklist above.
