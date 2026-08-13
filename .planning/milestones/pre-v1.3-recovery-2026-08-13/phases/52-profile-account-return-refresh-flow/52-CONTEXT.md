# Phase 52: Profile Account Return Refresh Flow - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** User report with screenshots from `/admin/profile` and Keycloak Account Console

<domain>
## Phase Boundary

Phase 52 fixes the user flow around `Accountdaten ändern` on the Team4s profile page.

The current page already opens the Keycloak Account Console in a new tab, but Team4s does not remember that the user left for an account-data change and does not refresh the read-only account cards when the user returns. After saving in Keycloak, the user has no clear Team4s-side feedback about what to do next or whether Team4s picked up the changed account name/email.

This phase is a narrow frontend/auth UX follow-up:

- Keep Keycloak responsible for account name, email, password, MFA, and account security.
- Keep Team4s responsible for historical profile fields such as `Anzeigename`, `Fansub-Name`, avatar, bio, and member story.
- Open Keycloak account management in a new tab.
- Show a Team4s-side return hint after the handoff.
- Refresh the active Team4s auth session and own profile when the user returns to the Team4s tab.
- Update only the account cards unless the saved Team4s profile response explicitly changes Team4s profile fields.
</domain>

<decisions>
## Implementation Decisions

### D-01 Keycloak Stays External
- Do not implement a custom Keycloak Account Console theme in this phase.
- The first good flow is: Team4s tab remains open, Keycloak opens in a new tab, Team4s explains how to return.
- A Keycloak-side `Zurück zu Team4s` theme/link can be a later enhancement, not a blocker for this phase.

### D-02 Use Existing Auth Refresh Seam
- The profile page must use `refreshActiveAuthSession()` from `frontend/src/lib/api.ts` before reloading profile data after return.
- The page must not read tokens, refresh tokens, cookies, localStorage auth state, or call Keycloak helpers directly.
- The refresh path should reuse `/api/v1/me`, which already upserts fresh Keycloak email/display name into `app_users`.

### D-03 Profile Read Owns Account Cards
- After auth refresh, the profile page should call `getOwnProfile()` and update the displayed `account_display_name`, `email`, `account_status`, and `account_global_roles`.
- These fields come from `app_users` through `MemberProfileRepository.GetOwnProfile`.
- No new backend endpoint is required unless implementation proves the existing `/api/v1/me/profile` response cannot carry the needed data.

### D-04 Dirty Team4s Form Must Survive Return Refresh
- The Keycloak return refresh must not blindly call `setForm(toFormState(response.data))` if the user has unsaved Team4s profile edits.
- Track a form-dirty state or perform profile-only updates on return refresh so fields like `Anzeigename`, `Fansub-Name`, `Kurzprofil`, and `Mitgliedsgeschichte` are not reset.

### D-05 Feedback Only When Useful
- Show `Accountdaten aktualisiert.` only when account-card fields actually changed after the return refresh.
- If nothing changed, keep the page calm: no success toast, no warning, no error.
- If refresh fails, keep the existing profile visible where possible and show a scoped, understandable message rather than a global crash.

### D-06 German UI Text Uses Umlaute
- User-facing German strings introduced in this phase must use correct Umlaute, e.g. `ändern`, `geöffnet`, `zurückkehren`, `aktualisiert`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Profile Page
- `frontend/src/app/admin/profile/page.tsx` - Current profile page, Keycloak account link, profile load/save/avatar flows.
- `frontend/src/app/admin/profile/page.test.tsx` - Existing profile page regression tests.
- `frontend/src/app/admin/profile/page.module.css` - Local profile layout styles for account-card and hint additions.
- `frontend/src/app/admin/admin.module.css` - Shared admin page panel/button/state styling used by the profile page.
- `frontend/src/types/profile.ts` - Profile DTO fields and capability types.

### Auth/API Boundary
- `docs/frontend/auth-api-client.md` - Token-free UI boundary and central auth/API ownership.
- `frontend/src/lib/api.ts` - `refreshActiveAuthSession()`, `getOwnProfile()`, `updateOwnProfile()`, `uploadOwnProfileAvatar()`, and central auth refresh.
- `frontend/src/lib/useAuthSession.ts` - Token-free UI session state.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Static guardrails against direct token/auth helper drift.
- `frontend/src/lib/api.auth-refresh.test.ts` - Refresh behavior coverage.

### Backend Profile/Auth Data Flow
- `backend/internal/repository/app_auth_repository.go` - `EnsureAppUserForIdentity()` updates `app_users.email` and `app_users.display_name` from Keycloak identity on `/api/v1/me`.
- `backend/internal/repository/member_profile_repository.go` - `GetOwnProfile()` reads account card fields from `app_users`.
- `backend/internal/handlers/app_profile.go` - Own profile read/update/avatar handlers and Keycloak account URL capability.

### UI/Engineering Rules
- `docs/engineering/implementation-contract.md` - Reuse and duplication gates.
- `docs/frontend/ui-system.md` - Global UI component/style expectations.
- `docs/agent-guidelines-ui.md` - UI implementation guidance.
- `AGENTS.md` - Team4s project rules, especially German UI text and auth/domain ownership.
</canonical_refs>

<specifics>
## Specific Ideas

- Rename the button to `Accountdaten bei Keycloak ändern` or equivalent clear wording.
- After click, show a compact profile-local hint such as:
  `Keycloak wurde in einem neuen Tab geöffnet. Speichere dort deine Accountdaten und kehre danach hierher zurück. Team4s aktualisiert die Accountkarten automatisch.`
- Attach a focus/visibility listener only after the Keycloak account link was opened from this page.
- Debounce or guard the return refresh so repeated focus events do not spam API calls.
- Compare a compact account snapshot before/after refresh rather than treating every profile reload as changed.
- If the form is pristine, it is acceptable to sync form state from a normal profile load. If dirty, preserve local form state and update only `profile`.
</specifics>

<deferred>
## Deferred Ideas

- Custom Keycloak Account Console theme with a `Zurück zu Team4s` button.
- Backend webhook or event-driven Keycloak profile update sync.
- Full profile-page visual redesign.
- New account-management endpoint in Team4s.
</deferred>

<risks>
## Risk Summary

- Calling Keycloak helpers directly from the profile page would violate the Phase 49/51 auth boundary.
- Calling `getOwnProfile()` without first refreshing `/api/v1/me` may show stale account cards because the backend app-user row may not yet have fresh Keycloak claims.
- Naively resetting the form on return refresh can destroy unsaved Team4s profile edits.
- Focus events can fire repeatedly and create noisy network calls unless guarded.
- Keycloak-side return UI is not controlled by Team4s unless a Keycloak theme is changed; that is intentionally out of this narrow phase.
</risks>
