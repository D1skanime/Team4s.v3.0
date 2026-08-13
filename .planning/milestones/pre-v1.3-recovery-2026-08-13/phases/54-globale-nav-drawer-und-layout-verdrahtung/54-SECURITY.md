---
phase: 54
slug: globale-nav-drawer-und-layout-verdrahtung
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-29
updated: 2026-05-29
---

# Phase 54 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser auth session to AppShell wrapper | `AppShellClientWrapper` reads token-free session state through `useAuthSession()` and decides anonymous vs authenticated shell mode. | Session booleans only: `hasAccessToken`, `hasRefreshToken`, `isClientInitialized`. |
| Profile API to shell props | The wrapper calls the existing `getOwnProfile()` helper after an active session is present. | Display name, email, public avatar URL, and account roles from `/api/v1/me/profile`. |
| Backend capability data to navigation | Admin navigation visibility is derived from backend-owned profile roles and passed as `canAccessAdmin`. | Boolean UI affordance only; `/admin` remains backend/server protected. |
| Root layout to all routes | `frontend/src/app/layout.tsx` wraps pages in the client shell wrapper while remaining a Server Component. | React children plus shell UI state; no token values cross this boundary. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-54-01 | Elevation of Privilege | AppShell admin navigation | mitigate | `AppShellClientWrapper` derives `canAdmin` from `account_global_roles.includes('platform_admin') || account_global_roles.includes('admin')`; `AppShell` only renders `/admin` when `canAccessAdmin` is true; focused tests cover visible and hidden states. | closed |
| T-54-02 | Information Disclosure | AppShell and wrapper props | mitigate | The shell prop surface contains only `mode`, `currentPath`, `user`, and `canAccessAdmin`; no `authToken`, bearer header, cookie read, or storage token read is introduced in shell files. Avatar data is resolved from the existing public profile avatar URL. | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required), accept (documented risk), transfer (third-party)*

---

## Security Evidence

| Check | Evidence | Result |
|-------|----------|--------|
| Admin nav gating | `frontend/src/components/layout/AppShellClientWrapper.tsx` maps `account_global_roles` to `canAdmin`; `frontend/src/components/layout/AppShell.tsx` creates `adminItems` only when `canAccessAdmin` is true. | closed |
| Token-free shell props | `rg` over `frontend/src/components/layout/AppShell.tsx`, `AppShellClientWrapper.tsx`, and `frontend/src/app/layout.tsx` found no `authToken`, `Authorization`, `Bearer`, `getRuntimeAuthToken`, `document.cookie`, `localStorage`, or `sessionStorage` usage. | closed |
| Stale profile/admin state after logout | `AppShellClientWrapper.test.tsx` verifies profile/admin props are cleared when the auth session disappears. | closed |
| Existing route protection retained | Phase 54 changes navigation visibility only; it adds no `/admin` endpoint or mutation path. | closed |

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-29 | 2 | 2 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-29
