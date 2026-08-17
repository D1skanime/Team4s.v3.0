# Phase 135: Einladungs- und Onboarding-Flow für eingeladene Fansub-Mitglieder - Research

**Researched:** 2026-08-17
**Domain:** Brownfield Go (Gin) + Next.js (App Router) + Keycloak (OIDC/JIT), invite/auth UX hardening
**Confidence:** HIGH (all findings sourced from direct code inspection; the two lower-confidence items are called out explicitly)

## Summary

This phase does not need new infrastructure. Every backend surface required by D-01 through D-06
already exists and works — the defects are narrow, identified, and mostly UI-layer or single-line
SQL/handler fixes. The codebase already contains a **near-complete reference implementation** of
the dual register/login-with-return pattern (`/claim-invitations/accept`) that Finding #10 asks
for on `/invitations/accept` — but that reference implementation itself has an unfixed bug (wrong
query-param name, and the param is dropped across the Keycloak redirect round-trip because it's
never persisted in `sessionStorage` the way PKCE state already is). Fixing that bug plus porting
the pattern to `/invitations/accept` covers D-01/D-02/D-04 almost entirely.

D-05 (claim button) is the smallest task in the phase: `useGroupMembersClaimActions.ts` is already
wired all the way from the API through `GroupMembersTab.tsx` into `GroupMembersHistTable.tsx`'s
props — `HistoricalMemberCard` just never destructures or renders them. A byte-for-byte working
reference UI for this exact feature already exists and is fully tested, but is dead code (rendered
only in its own test file, never mounted in the app): `ClaimManagementPanel.tsx`.

D-06 (role picker filter) traces to one exact SQL defect: `ListFansubGroupRoleDefinitions` ORs
`assignable = true` with two context checks that reintroduce every non-assignable contribution
role (including `admin`/"Administration" — the literal Finding #7 example). The fix is a one-line
WHERE-clause simplification, high confidence, verified against migration history.

D-02 (Keycloak self-registration) is **already active** in the tracked realm config
(`registrationAllowed: true`, `resetPasswordAllowed: true`) — this decision only needs a live
verification pass, not an infra change, unless the *deployed* realm has drifted from the file.

D-03 (mail context) needs one new dependency threaded into `AppAuthHandler`: a way to resolve the
fansub group's display name and the inviter's display name at send-time, since neither is
currently looked up in `CreateFansubGroupInvitation`. `FansubRepository.GetGroupByID` already
exists and can be reused without inventing new backend surface — the handler just needs to take
that repository as a new constructor argument. Recipient identity is already the pure trigger for
Mailpit at `:8025`; no mail-infra changes are needed or in scope.

**Primary recommendation:** Treat `/claim-invitations/accept/page.tsx` as the ground truth pattern
for `/invitations/accept/page.tsx` (D-01/D-04), but fix its `return_to`/`next` param mismatch and
its round-trip-loses-the-param bug in the shared login flow *before* copying the pattern, so both
invite flows end up correct instead of both ending up subtly broken.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dual register/login CTA + returnTo persistence | Browser/Client (Next.js `/login`, `/invitations/accept`) | API/Backend (accept endpoint) | The redirect round-trip and sessionStorage persistence are pure client concerns; the backend only validates token+email at accept time. |
| Keycloak self-registration flow | API/Backend (Keycloak realm config) | Browser/Client (PKCE + `intent=register`) | `registrationAllowed` is a realm-level authority; the SPA only chooses which KC endpoint to hit. |
| Invitation email context (D-03) | API/Backend (`app_auth.go` handler + `mailer.go`) | — | Group name / inviter name resolution and template composition are server-side; SMTP delivery already centralized in `services.Mailer`. |
| Claim-invite button wiring (D-05) | Browser/Client (`HistoricalMemberCard`) | — | Backend and hook are complete; this is pure JSX wiring, zero new API surface. |
| Role picker `assignable` filter (D-06) | API/Backend (`hist_group_member_roles_repository.go` SQL) | Browser/Client (fallback static list) | The authoritative filter must live in the query; the frontend fallback list is a secondary, lower-priority concern. |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01 Cold-Invite-Registrierungspfad (Finding #10, BLOCKER):** Die Accept-Seite
  (`frontend/src/app/invitations/accept/page.tsx`) bietet für nicht eingeloggte Nutzer BEIDE Wege:
  Anmelden UND Registrieren. Die Einladung wird durchgereicht (`returnTo=/invitations/accept?token=...`,
  E-Mail aus dem Invite vorbefüllt für den `email_match`); nach erfolgreichem Login/Registrierung
  folgt Auto-Accept + Bestätigungs-UI. Kein Nutzer landet mehr in einer Sackgasse.
- **D-02 Keycloak Self-Registration verifizieren/aktivieren (Finding #10):** Sicherstellen, dass
  der Registrieren-Pfad technisch trägt: KC `registrationAllowed` in
  `infra/keycloak/realm-team4s.json` bzw. ein invite-scoped Register-Flow. Entscheidung
  dokumentieren, ob Self-Registration global aktiviert wird oder ein dedizierter
  Register-auf-Einladung-Pfad nötig ist.
- **D-03 Kontext-reiche Einladungs-Mail (Finding #10):** Das Einladungs-Mail-Template
  (`backend services/mailer.go` + `app_auth.go`) trägt Kontext: wer lädt ein, welche
  Gruppe/Rolle, ein Satz "Team4s ist...", was Annehmen bewirkt, klarer CTA. Deutsche Umlaute
  korrekt (CLAUDE.md-Regel). Ersetzt die spam-artige Blindmail.
- **D-04 Accept-Seite: returnTo + endnutzerfreundlicher Text (Findings #8, #9):** `returnTo` wird
  an `/login` mitgegeben -> Auto-Redirect zurück zur Einladungs-URL + Auto-Accept nach Login. Der
  Accept-Text ist endnutzerfreundlich ("Bitte melde dich an, um die Einladung anzunehmen.") — keine
  Keycloak-/Architektur-Interna im UI.
- **D-05 Claim-Button für historische Mitglieder verdrahten (Finding #6):**
  `HistoricalMemberCard` in
  `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` rendert den
  Claim-Generieren-Button + Invite-Link-Anzeige (gated auf `canCreateClaimInvitation`), verdrahtet
  an den vorhandenen Hook `useGroupMembersClaimActions.ts`. Kein Backend-Neubau.
- **D-06 Rollen-Picker auf `assignable=true` filtern (Finding #7):** Der Rollen-Picker im
  Einladungs-/Mitglied-hinzufügen-Dialog zeigt nur `assignable=true` Gruppenrollen.
  Nicht-zuweisbare Credit-/Contribution-Rollen (z.B. Administration) und `platform_admin` (KC-JIT)
  werden ausgeblendet. Quelle: `role_definitions.assignable`.
- **D-07 Globale UI-Primitives Pflicht:** Alle UI-Änderungen (Accept-Seite, Dialoge, Buttons,
  Rollen-Picker) nutzen die globalen Primitives aus `@/components/ui` (Button, FormField, Input,
  Select ...); kein handgebautes Markup für vorhandene Primitiv-Typen. Team4s Design-Tokens
  verwenden.

### Claude's Discretion

Not explicitly separated in CONTEXT.md beyond the decisions above. Within each locked decision,
implementation detail (exact copy text, exact component structure, whether to delete or leave
`ClaimManagementPanel.tsx`, whether to also correct the fallback `FANSUB_GROUP_ROLE_OPTIONS`
static list) is Claude's discretion, informed by this research's findings below.

### Deferred Ideas (OUT OF SCOPE)

- Neues Auth-System.
- KC-Realm-Umbau über `registrationAllowed` hinaus.
- Das Rollen-/Rechte-Rework (eigene geplante Phase).
- Mail-Infra-Umbau (Mailpit bleibt).
- Findings #1-#5 in `.planning/notes/live-uat-ux-findings.md` (date picker text input, import
  mapping group inheritance, apply-all UX, "Ubernehmen" typo, `PlatformAdminGate` unmount bug) —
  unrelated backlog items, not part of Phase 135.

</user_constraints>

<phase_requirements>
## Phase Requirements

No `REQUIREMENTS.md` entry exists for Phase 135 — it is an additive phase appended to the v1.3
roadmap (see `.planning/STATE.md`: *"Requirements TBD (kein REQUIREMENTS.md-Mapping — Decision-
Coverage-Gate beim Planen beachten)"*). The phase's acceptance surface is the seven `D-01`..`D-07`
decisions in `135-CONTEXT.md`, sourced from Findings #6-#10 in
`.planning/notes/live-uat-ux-findings.md`. The planner should map plan tasks to these `D-xx`
IDs (not to a `REQ-xx` ID scheme) for traceability, and the phase's `VERIFICATION.md` should assert
against `D-01`..`D-07` directly.

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Accept-Seite bietet Registrieren UND Anmelden, reicht Einladung durch, Auto-Accept | `/claim-invitations/accept` is a near-complete reference pattern; login page's `next`-param handling and its persistence gap are documented below |
| D-02 | KC Self-Registration verifizieren/aktivieren | `registrationAllowed: true` confirmed in tracked realm JSON — verification-only task |
| D-03 | Kontext-reiche Einladungs-Mail | `CreateFansubGroupInvitation` handler + `mailer.go` template location identified; `FansubRepository.GetGroupByID` identified as the reusable group-name lookup |
| D-04 | returnTo + endnutzerfreundlicher Text | Login page's `readSafeNextPath`/`next` param and the sessionStorage PKCE-state pattern documented as the mechanism to extend |
| D-05 | Claim-Button verdrahten | Exact prop-drilling gap in `HistoricalMemberCard` identified; `ClaimManagementPanel.tsx` identified as a working, tested, but unmounted reference implementation |
| D-06 | Rollen-Picker auf `assignable=true` filtern | Exact SQL defect in `ListFansubGroupRoleDefinitions` identified and traced to migration history |
| D-07 | Globale UI-Primitives Pflicht | All touched files already inventoried; confirms `@/components/ui` (`Select`, `Button`, `Card`, `Input`, `Badge`, `Toolbar`) usage patterns to replicate |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Umlaute:** All new/changed user-facing German strings (mail body, accept-page copy, button
  labels, aria-labels) must use correct ä/ö/ü/Ä/Ö/Ü/ß — no ASCII substitutes. This directly gates
  D-03 and D-04's copy.
- **Global UI primitives:** No hand-built native `<select>/<input>/<textarea>/<button>` — must use
  `@/components/ui`. The current `/invitations/accept/page.tsx` and `/claim-invitations/accept/page.tsx`
  both currently use raw `<button>` and inline `style={{...}}` — both must be migrated to
  `Button`/layout primitives as part of this phase (D-07), not just the net-new code.
- **Modularity:** Production files ≤450 lines. All touched files are currently well under this
  (`accept/page.tsx` ~75 lines, `GroupMembersHistTable.tsx` 220 lines, `app_auth.go` ~1150 lines —
  note `app_auth.go` is already large; D-03's addition should stay minimal, e.g. a small
  mail-context builder function, not sprawl the file further).
- **GSD workflow enforcement:** No direct edits outside `/gsd:execute-phase`.
- **Canonical dev environment:** All work happens in `/home/d1sk/team4s` on `team4s-linux`; browser
  UAT via `http://127.0.0.1:3300` tunnel; Mailpit at `:8025` for D-03 verification.
- **Phase execution on `main`:** No worktrees/branches — plans execute directly on `main`.

## Standard Stack

No new libraries needed. Confirmed existing stack in the touched files:

### Core (already in use, unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (`frontend/package.json`) | `/invitations/accept`, `/login`, `/claim-invitations/accept` routes | Existing routing convention |
| React | 18.3.1 | Client components (`'use client'`) | Existing convention |
| Gin | `github.com/gin-gonic/gin` | `AppAuthHandler`, `MemberClaimInvitationsHandler` | Existing backend convention |
| pgx/v5 | `github.com/jackc/pgx/v5` | `FansubGroupInvitationRepository`, `HistGroupMemberRolesRepository` | Existing DB access convention |
| Keycloak | `quay.io/keycloak/keycloak:26.0` (docker-compose.yml:45) | OIDC login + registration endpoints | Existing IdP |
| net/smtp (stdlib) | Go stdlib | `SMTPMailer` (`services/mailer.go`) | Existing mailer, no framework |

### Package Legitimacy Audit

Not applicable — this phase adds **zero** new external packages/dependencies in either
`frontend/package.json` or `backend/go.mod`. All work is composition of existing, already-vetted
project code (`@/components/ui`, existing repositories, existing Keycloak client flow). No
`npm install`/`go get` step is expected; if a plan task discovers it needs a new package, that is
a deviation from this research and should be flagged for a fresh legitimacy check at plan-check
time, not silently added.

**Packages removed due to slopcheck verdict:** none (nothing new to check).
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram — Cold-Invite Accept Flow (D-01/D-04, target state)

```
[Fansub-Admin]                                                         [Group Repo]
     |  createFansubGroupInvitation(email, roles)                          |
     v                                                                      |
[AppAuthHandler.CreateFansubGroupInvitation] --GetGroupByID(fansubID)------>|
     |  build context-rich mail (group name, inviter name, role labels)    |
     v                                                                      |
[services.Mailer.Send] --SMTP--> [Mailpit :8025 / real SMTP]
     |
     v
[Invitee clicks mail link] --> https://.../invitations/accept?token=...
     |
     v
[/invitations/accept page.tsx]
     |  not logged in (isClientInitialized && !hasAccessToken)
     v
  persist {token, returnPath} to sessionStorage (NEW — mirrors PKCE_*_STORAGE_KEY pattern)
     |
     +--> [Button: Anmelden]     --> beginKeycloakLogin()               --> Keycloak /auth
     +--> [Button: Registrieren] --> beginKeycloakLogin({intent:'register', loginHint: email}) --> Keycloak /registrations
                                                                              |
                                                                              v
                                                          [Keycloak redirects back to /login (code, state)]
                                                                              |
                                                                              v
                                                     [/login page.tsx: exchangeKeycloakCode]
                                                                              |
                                                          read persisted returnPath from sessionStorage
                                                          (NOT from URL — the `next`/`return_to` query
                                                          param on the ORIGINAL /login URL is lost across
                                                          the KC redirect; see Pitfall 1 below)
                                                                              |
                                                                              v
                                                     router.replace(returnPath)  // back to /invitations/accept?token=...
                                                                              |
                                                                              v
                                             [/invitations/accept page.tsx: hasAccessToken now true]
                                                          auto-call acceptFansubInvitation({token})
                                                          (NEW — currently requires manual button click)
                                                                              |
                                                                              v
                                                          [AppAuthHandler.AcceptFansubInvitation]
                                                          (unchanged — email_match already server-side)
                                                                              |
                                                                              v
                                                          endnutzerfreundliche Bestätigungs-UI
```

### Recommended Project Structure (no new files required beyond a small shared helper)

```
frontend/src/
├── lib/
│   ├── keycloakAuth.ts              # extend BeginKeycloakLoginOptions with loginHint
│   ├── inviteReturnPath.ts          # NEW (optional): shared sessionStorage returnPath helper,
│   │                                 #   reusable by both /invitations/accept and /claim-invitations/accept
│   └── useAuthSession.ts            # unchanged
├── app/
│   ├── login/page.tsx               # extend readSafeNextPath to also consult the persisted returnPath
│   ├── invitations/accept/page.tsx  # D-01/D-04/D-07 rewrite
│   └── claim-invitations/accept/page.tsx  # fix return_to/next mismatch + persistence gap (same bug class)
backend/
├── internal/handlers/app_auth.go    # D-03: inject fansubRepo, build mail context
├── internal/services/mailer.go      # unchanged (template composition stays in the handler)
└── internal/repository/hist_group_member_roles_repository.go  # D-06: SQL fix
```

### Pattern 1: sessionStorage-persisted returnPath survives IdP redirect

**What:** URL query parameters do not survive a full-page navigation to an external IdP and back,
because `authRedirectUri()` in `keycloakAuth.ts` hardcodes the redirect target to `${origin}/login`
with **no query string**. The existing PKCE verifier/state/intent are persisted in
`sessionStorage` for exactly this reason (`saveTransientAuthState`/`consumeTransientAuthState`).
**When to use:** Any time a value must survive a full-page redirect away from and back to the app.
**Example:**
```typescript
// Source: frontend/src/lib/keycloakAuth.ts (existing pattern to mirror)
function saveTransientAuthState(verifier: string, state: string, intent: KeycloakLoginIntent): void {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state)
  sessionStorage.setItem(PKCE_INTENT_STORAGE_KEY, intent)
}
```
D-01/D-04 must add a fourth, analogous key (e.g. `team4s.keycloak.return_path`) written when the
user clicks Anmelden/Registrieren on `/invitations/accept`, and read by `/login` in place of (or in
addition to) the URL-based `next`/`return_to` param, since the URL-based param is silently dropped
today (see Pitfall 1).

### Pattern 2: Existing dual login/register CTA on the login page

**What:** `/login/page.tsx` already renders both an "Anmelden" and a "Registrieren" `Button`,
routed through `beginKeycloakLogin()` / `beginKeycloakLogin({ intent: 'register' })`.
**When to use:** D-01 does not need to duplicate this UI on the accept page itself — the accept
page can link to `/login` (which already offers both paths) as `/claim-invitations/accept`
partially does, or render its own two buttons that call the same `keycloakAuth.ts` functions
directly. Either satisfies "bietet BEIDE Wege"; the codebase already leans toward "link to /login"
for `claim-invitations/accept`, which is the lower-risk, less-duplicative choice.
**Example:**
```typescript
// Source: frontend/src/app/login/page.tsx:152-170 (existing, working)
<Button onClick={() => void handleLogin()}>{isAlreadySignedIn ? 'Erneut anmelden' : 'Anmelden'}</Button>
<Button variant="secondary" onClick={() => void handleRegister()}>Registrieren</Button>
```

### Pattern 3: Server-side email_match is already case-insensitive and exact

**What:** `FansubGroupInvitationRepository.Accept` normalizes both the invitation's stored email
and compares against `strings.ToLower(strings.TrimSpace(input.ActorAppUser.Email))`
(`fansub_group_invitations_repository.go:260`, and `normalized_email` column). No frontend
email-matching logic is needed; the frontend's only job is to pre-fill the email field in the
Keycloak registration form (via `login_hint`, see Open Question 1) so a real, matching account
gets created.
**When to use:** Do not re-implement email comparison in the frontend — it already fails closed
server-side with `email_match`-style mutation errors mapped to friendly messages via
`memberClaimInvitationMessage`/`AsInvitationMutationError` (D-04's "endnutzerfreundlich" requirement
already has a message-mapping precedent to follow, see Pattern 4).

### Pattern 4: Friendly error-message mapping precedent

**What:** `member_claim_invitations_handler.go`'s `memberClaimInvitationMessage()` and
`claim-invitations/accept/page.tsx`'s `claimInvitationErrorMessage()` already translate
`reason_code`s (`invitation_expired`, `invitation_used`, `invitation_cancelled`,
`already_verified`) into friendly German copy. `/invitations/accept/page.tsx` currently does
**not** do this — it shows the raw `ApiError.message` from the backend. D-04's "endnutzerfreundlich"
requirement should port this exact mapping pattern (the `fansub_group_invitations` mutation errors
use the same `reason_code` shape via `repository.AsInvitationMutationError`).
```typescript
// Source: frontend/src/app/claim-invitations/accept/page.tsx:10-26 (port this pattern)
function claimInvitationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'invitation_expired': return 'Dieser Einladungslink ist abgelaufen...'
      // ...
    }
  }
  return 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
}
```

### Pattern 5: Claim-generate UI already fully built (port, don't invent)

**What:** `ClaimManagementPanel.tsx` (lines 330-372) is a complete, tested, `@/components/ui`-based
implementation of "generate invite link + show it + copy button + cancel active invitation" for
exactly one historical member row. It is never mounted in the app (`grep` for `<ClaimManagementPanel`
matches only its own test file) but is fully functional and directly portable into
`HistoricalMemberCard`.
**When to use:** D-05.
**Example:**
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx:330-353 (port into HistoricalMemberCard)
<Toolbar
  leading={<strong>{member.display_name}</strong>}
  trailing={(
    <Button variant="secondary" size="sm" leftIcon={<Link2 size={16} />}
      onClick={() => void handleGenerateInvitation(member.id, member.member_id)}>
      Einladungslink generieren
    </Button>
  )}
/>
{invite ? (
  <div className={styles.inviteLinkRow}>
    <Input id={`claim-invite-link-${member.id}`} readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} />
    <Button onClick={() => void handleCopyLink(member.id, inviteLink)}>{copyStates[member.id] === 'copied' ? 'Kopiert!' : 'Link kopieren'}</Button>
  </div>
) : null}
```
`HistoricalMemberCard` already receives `generatedInvites`, `memberInvitations`, `copyStates`,
`canCreateClaimInvitation`, `onGenerateInvitation`, `onCancelInvitation`, `onCopyLink`,
`normalizeInviteLink` as props (`GroupMembersHistTable.tsx:80-99`) — it just needs to destructure
and render them, gated on `canCreateClaimInvitation`, only for members without an existing
`app_username` link (the natural "unclaimed" condition already visible via
`historicalMemberMeta`/`member.app_username`).

### Anti-Patterns to Avoid

- **Re-deriving the `assignable` role list on the frontend:** Do not filter `roleOptions` client-side
  by a hardcoded code list. The static `FANSUB_GROUP_ROLE_OPTIONS` fallback array in
  `frontend/src/types/fansub.ts` intentionally mixes contribution-only roles (translator, timer,
  typesetter, editor, encoder, raw_provider, quality_checker, designer) with true group roles
  (fansub_lead, project_lead, techadmin, gfxler) and is also used for **label lookups** of
  already-assigned historical roles elsewhere (`FansubAppMembersOverview.tsx` `ROLE_LABELS`).
  Filtering it down would silently break label rendering for existing role assignments that use
  non-assignable codes. The authoritative filter belongs in the SQL (`assignable = true`), not in
  a second, parallel frontend allow-list.
- **Skipping the `sessionStorage` persistence and relying on the URL `next`/`return_to` param
  alone:** confirmed broken across the Keycloak redirect (Pitfall 1). A plan task that only "adds
  `?returnTo=...` to the link" without also touching `keycloakAuth.ts`'s transient-state storage
  will silently reproduce the exact bug already present in `claim-invitations/accept`.
- **Adding a second copy of the login/register buttons instead of reusing `/login`'s existing
  ones:** would duplicate `beginKeycloakLogin` call sites and risk drifting the two flows apart
  (PKCE, intent, prompt handling already centralized in `keycloakAuth.ts`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PKCE / OIDC code exchange | New auth client | `frontend/src/lib/keycloakAuth.ts` (`beginKeycloakLogin`, `exchangeKeycloakCode`) | Already implements PKCE S256, state validation, registration-vs-login endpoint selection |
| Email/token invitation matching | Frontend email comparison | `FansubGroupInvitationRepository.Accept` (case-insensitive, server-side, already normalized) | Security-critical comparison must stay server-side and is already correct |
| Claim-invite link generation | New handler/hook | `member_claim_invitations_handler.go` + `useGroupMembersClaimActions.ts` | Complete, tested, audit-logged; only the render call site is missing |
| Role list source for pickers | New role enum/config | `role_definitions` table + `listFansubGroupRoleDefinitions` API | Single source of truth already exists; just needs its SQL predicate fixed |
| SMTP delivery / MIME formatting | New mail library | `services/mailer.go` (`SMTPMailer`, `buildRawMessage`) | Already RFC-2047-encodes Umlaute, guards CRLF injection, supports STARTTLS/implicit TLS |
| Friendly reason-code → message mapping | New error-string switch per page | `memberClaimInvitationMessage()` / `claimInvitationErrorMessage()` pattern | Two existing, directly portable precedents for exactly this need |

**Key insight:** This phase is >90% "wire up what already exists" rather than "build new." The
biggest risk is not missing functionality but *reproducing a bug that already exists once* (the
returnTo/param-name mismatch) *a second time* while porting the pattern.

## Common Pitfalls

### Pitfall 1: `return_to`/`next` query param is silently dropped across the Keycloak redirect
**What goes wrong:** `claim-invitations/accept/page.tsx` links to
`/login?return_to=${encodeURIComponent(loginReturnTo)}`, but `login/page.tsx`'s
`readSafeNextPath()` only reads `searchParams.get('next')` — never `return_to`. Even if the param
name were fixed, `beginKeycloakLogin()` navigates to a fixed `authRedirectUri()` of
`${origin}/login` with no query string, and Keycloak's callback redirect goes back to that same
fixed URL — so **any** query param present on the original `/login?...` URL (right or wrong name)
is lost by the time the callback page reads `window.location.search` again. The user always lands
on the default `/me/profile` after a login/registration that started from an invite link.
**Why it happens:** The PKCE verifier/state/intent already need cross-redirect persistence and use
`sessionStorage` for it (`saveTransientAuthState`); the returnTo path was never added to that same
mechanism.
**How to avoid:** Persist the return path via `sessionStorage` at the moment the user clicks
Anmelden/Registrieren on the accept page (or generalize `keycloakAuth.ts`'s existing transient
state to carry an optional `returnPath` string alongside `intent`), and have `/login` read it from
there — not from `window.location.search` — after a successful callback.
**Warning signs:** Manually testing "invite → register → land back on the invite" without checking
`sessionStorage`/`Network` tab will look correct only if you stayed logged in already
(`isAlreadySignedIn` skip path) — the bug only manifests for a truly cold, logged-out user, which
is exactly Finding #10's scenario. Live UAT with a fresh browser profile is required, matching the
phase's own stated constraint.

### Pitfall 2: `admin`/"Administration" and most contribution roles leak into the group role picker today
**What goes wrong:** `HistGroupMemberRolesRepository.ListFansubGroupRoleDefinitions`
(`backend/internal/repository/hist_group_member_roles_repository.go:330-356`) runs:
```sql
SELECT code, label_de, sort_order FROM role_definitions
WHERE assignable = true
   OR 'fansub_group' = ANY(contexts)
   OR 'anime_contribution' = ANY(contexts)
```
Because `assignable` defaults to `false` and almost every contribution role (`translator`,
`editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `designer`, `admin`,
`other`) carries `'anime_contribution'` in its `contexts` array (migration `0085`), the second `OR`
clause reintroduces all of them regardless of `assignable`. Only `fansub_lead`, `co_leader`,
`founder`, `project_lead`, `techadmin`, `gfxler` have `assignable = true`
(migration `0112_role_model_cleanup.up.sql:26-33`).
**Why it happens:** The query predates the `assignable` column (added in migration 0112) and was
never simplified after `assignable` became the intended single source of truth — it still carries
the pre-0112 context-based heuristic as a redundant OR-branch.
**How to avoid:** Simplify the WHERE clause to `WHERE assignable = true` only. Verified this does
not regress `techadmin`/`gfxler` (both have `assignable = true` directly per migration 0112) or
the four legacy group roles (also set `assignable = true` in the same migration).
**Warning signs:** Any role picker (invite dialog, add-member dialog) showing "Administration",
"Übersetzung", "Timing", etc. as selectable group roles is this exact bug manifesting.

### Pitfall 3: `HistoricalMemberCard` already receives every prop D-05 needs — the bug is invisible in a props/type diff
**What goes wrong:** Because `GroupMembersHistTableProps` (the type) already declares
`generatedInvites`, `onGenerateInvitation`, `canCreateClaimInvitation`, etc., and
`HistoricalMemberCardProps` extends that same type via `GroupMembersHistTableProps & {...}`,
TypeScript will not flag anything as missing — the destructuring at the top of
`HistoricalMemberCard` (`GroupMembersHistTable.tsx:143-150`) simply omits most of those fields.
**Why it happens:** Silent by design of JS/TS destructuring — omitting a prop is not a type error
when the prop's parent type is a superset via spread (`{...props}` at the call site,
`GroupMembersHistTable.tsx:128`).
**How to avoid:** When wiring D-05, explicitly list every claim-related field in the destructure
and confirm the button/invite-link block actually appears in the rendered card, not just that the
type-checker is quiet.

### Pitfall 4: `app_auth.go` mail-sending block has no group name / inviter name available today
**What goes wrong:** `CreateFansubGroupInvitation`'s mail body
(`app_auth.go:410-415`) is `"Du wurdest zu einer Fansub-Gruppe eingeladen."` — it has neither the
group's name nor the inviting admin's display name in scope, because `AppAuthHandler` is never
constructed with a `FansubRepository` (or equivalent) reference (`main.go:191-207` — 12
constructor args, none of them a fansub-name lookup).
**Why it happens:** The handler was built invitation-plumbing-first; the "nice mail" requirement
is new in this phase.
**How to avoid:** Thread `fansubRepo *repository.FansubRepository` (or a narrow interface exposing
just `GetGroupByID`) into `NewAppAuthHandler`, call it once per invitation-create request using the
already-available `fansubID`, and use `identity.DisplayName` (already available in the handler
via `permissionActorFromContext`) for "who invites."
**Warning signs:** If the plan tries to add group-name lookup via a *new* repository/query instead
of `FansubRepository.GetGroupByID`, that's unnecessary duplication — the method already exists at
`fansub_repository.go:157`.

### Pitfall 5: The `/invitations/accept` and `/claim-invitations/accept` pages are near-duplicates that will drift further if only one is fixed
**What goes wrong:** Both pages implement the same "token in URL, check auth, accept, show
result" shape independently (separate `useState`, separate error-mapping — or lack thereof — 
separate raw-`<button>`/inline-`style` markup). D-04's "endnutzerfreundlich" and D-07's
"UI-Primitives Pflicht" apply to *both* pages' existing text/markup, not only new code, since both
currently violate D-07 (raw `<button>`, `style={{}}`) and `/invitations/accept` violates D-04
(exposes "Keycloak bleibt für Login und Session zuständig..." verbatim).
**Why it happens:** Two invitation systems (app-membership invites vs. member-claim invites) were
built at different times with parallel, not shared, accept-page implementations.
**How to avoid:** Decide explicitly (plan-time) whether to (a) fix both pages independently using
the same patterns, or (b) extract a small shared `useInviteAcceptFlow`-style hook/component now
that the pattern is proven twice. CONTEXT.md's scope is `/invitations/accept/page.tsx` specifically
for D-01/D-04; `/claim-invitations/accept/page.tsx` sharing the *same underlying returnTo bug* means
leaving it untouched will leave one of the two flows still broken for cold-invited users after this
phase ships — worth flagging as a phase-boundary risk even if the plan chooses not to touch the
claim-invitations page's copy/markup for D-04/D-07 compliance.

## Code Examples

### Existing `beginKeycloakLogin` intent switch (extend, don't replace)
```typescript
// Source: frontend/src/lib/keycloakAuth.ts:117-143
export async function beginKeycloakLogin(options: BeginKeycloakLoginOptions = {}): Promise<void> {
  const intent: KeycloakLoginIntent = options.intent === 'register' ? 'register' : 'login'
  clearRegistrationCompletion()
  const verifier = randomString(64)
  const state = randomString(32)
  const challenge = await sha256Base64Url(verifier)
  saveTransientAuthState(verifier, state, intent)
  const endpointPath = intent === 'register' ? KEYCLOAK_REGISTRATION_ENDPOINT_PATH : KEYCLOAK_AUTH_ENDPOINT_PATH
  const authURL = new URL(`${currentRealmBase()}/${endpointPath}`)
  authURL.searchParams.set('client_id', KEYCLOAK_CLIENT_ID)
  // ... scope, redirect_uri, PKCE challenge, state
  if (options.prompt) authURL.searchParams.set('prompt', options.prompt)
  // D-01 extension point: add `if (options.loginHint) authURL.searchParams.set('login_hint', options.loginHint)`
  window.location.assign(authURL.toString())
}
```

### Existing role-definitions endpoint dispatch (context-based)
```go
// Source: backend/internal/handlers/fansub_hist_group_member_roles_handler.go:108-141
// GET /admin/fansubs/:id/role-definitions[?context=group_history|fansub_group]
func (h *FansubHistGroupMemberRolesHandler) ListGroupHistoryRoleDefinitions(c *gin.Context) {
	// ...
	if c.Query("context") == "fansub_group" {
		items, err = h.rolesRepo.ListFansubGroupRoleDefinitions(c.Request.Context()) // D-06 fix target
	} else {
		items, err = h.rolesRepo.ListGroupHistoryRoleDefinitions(c.Request.Context())
	}
	// ...
}
```

### Existing invitation-mail send block (D-03 extension point)
```go
// Source: backend/internal/handlers/app_auth.go:401-441
if h.mailer != nil {
    inviteURL := strings.TrimRight(h.appPublicURL, "/") + created.InviteLink
    mailCtx, mailCancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
    defer mailCancel()
    mailErr := h.mailer.Send(mailCtx, services.MailMessage{
        To:       created.Invitation.Email,
        Subject:  "Einladung zur Fansub-Gruppe", // D-03: needs group name
        BodyText: fmt.Sprintf("Du wurdest zu einer Fansub-Gruppe eingeladen.\n\nLink zum Annehmen: %s...", inviteURL), // D-03: needs context
        BodyHTML: fmt.Sprintf(`<p>Du wurdest zu einer Fansub-Gruppe eingeladen.</p>...`, inviteURL),
    })
    // D-12 (existing, keep): on mailErr, cancel invitation immediately — no silent pending record.
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `platform_admin` via env-var allowlist | `platform_admin` via Keycloak realm role + JIT sync | Recent (per `135-CONTEXT.md` Bestandsfakten and STATE.md phase history) | Confirms D-06's note that `platform_admin` "gehört ebenfalls nicht in den Gruppen-Rollen-Picker" — it is not even a `role_definitions` row, so it cannot leak via this SQL; no extra filtering code needed for it specifically, it's already structurally absent from `role_definitions`. |
| Static `FANSUB_GROUP_ROLE_OPTIONS` as sole role source | API-driven `listFansubGroupRoleDefinitions(fansubId)` with static-list fallback | Documented in-code as "Gap G1/D-12" (pre-existing, prior phase) | D-06's fix lands on the already-preferred API path; the static list remains only a network-failure fallback, lower priority to also filter. |

**Deprecated/outdated:** None found — no library or pattern in the touched surface is flagged
deprecated upstream (Keycloak 26.0 is a recent LTS-track release; Next.js 16/React 18.3.1/Gin/pgx
are all current for this codebase's baseline).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Keycloak's `/protocol/openid-connect/registrations` endpoint (used via `intent:'register'`) honors a `login_hint` query param to pre-fill the email field on the registration form, the same way `login_hint` pre-fills the login form's username field. | Pattern 1 / Architecture Diagram / D-01 email pre-fill | If wrong, the "E-Mail vorbelegung fuer den email_match" part of D-01 needs a different mechanism (e.g. a post-registration profile-email-set step, or accepting that the user must retype the email and rely on server-side `email_match` rejection with a friendly retry message instead of prevention). Keycloak version-specific behavior and a documented GitHub issue (`login_hint` known gaps with certain features) mean this must be verified live against the deployed KC 26.0 realm/theme during execution, not assumed from search results alone. |
| A2 | The deployed Keycloak realm (not just the tracked `infra/keycloak/realm-team4s.json` file) actually has `registrationAllowed: true` applied — i.e., the file has not drifted from what's imported into the running Keycloak instance. | D-02 | If the running realm differs from the tracked file, D-02's "verifizieren" task must include a live check (Keycloak admin console or `kcadm.sh get realms/team4s`) and, if drifted, a realm re-import step — not just a code/file read. |

**If this table is empty:** N/A — both assumptions above should be confirmed via live UAT per the
phase's own stated constraint ("Verifikation live auf :3000 ... Code-Level reicht nicht").

## Open Questions

1. **Should `/claim-invitations/accept/page.tsx` be fixed in the same phase, given it shares the
   exact same returnTo/persistence bug (Pitfall 1/5)?**
   - What we know: CONTEXT.md's D-01/D-04 scope names `/invitations/accept/page.tsx` specifically;
     Bestandsfakten frames the claim-invite flow as "existiert" (implying it's considered done).
   - What's unclear: Whether "existiert" was verified live post-reset, or just verified as
     code-present (which it is, but with the bug documented in Pitfall 1).
   - Recommendation: At minimum, fix the shared root cause (extend `keycloakAuth.ts`'s transient
     state to carry `returnPath`) in a way both pages can consume, even if only
     `/invitations/accept`'s copy/markup gets the full D-04/D-07 treatment this phase. Flag the
     claim-invitations page's remaining copy/markup gap as a fast-follow if descoped.

2. **Should `ClaimManagementPanel.tsx` be deleted once its pattern is ported into
   `HistoricalMemberCard`, or left as unused/dead code?**
   - What we know: It is fully tested but never rendered in production; keeping it risks two
     divergent implementations of the same feature over time.
   - What's unclear: Whether it was intended as a future alternate admin view (e.g., a dedicated
     "Claims" tab) rather than truly dead code.
   - Recommendation: Planner should make an explicit, documented choice (delete-with-tests, or
     keep-and-note-as-intentionally-unmounted) rather than leaving it silently orphaned.

3. **Should the static `FANSUB_GROUP_ROLE_OPTIONS` fallback array (used when the API call fails)
   also be trimmed to assignable-only roles for consistency with D-06?**
   - What we know: It is only a network-failure fallback for the picker (primary source is now the
     fixed API), but it is *also* used for label rendering of already-assigned roles elsewhere.
   - What's unclear: Whether CONTEXT.md's D-06 intends the fallback path to match too, or only the
     primary (successful) API-driven path.
   - Recommendation: Leave the fallback list unchanged (label-lookup usage makes trimming risky)
     unless the plan explicitly separates "picker options" from "label lookup" into two distinct
     constants — a larger refactor than D-06's stated scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Keycloak | D-01, D-02, D-04 (OIDC login/register) | ✓ (docker-compose service `keycloak`) | 26.0 | — |
| Mailpit (SMTP dev) | D-03 verification | ✓ (per CONTEXT.md Bestandsfakten: "Dev-Mail läuft auf Mailpit :8025") | — | — |
| PostgreSQL | D-06 (role_definitions), D-05 (claim invitations) | ✓ (docker-compose `team4sv30-*` services per repo convention) | 16 (per CLAUDE.md tech stack doc) | — |
| Go 1.25 backend | D-03, D-05, D-06 backend changes | ✓ | 1.25 (`backend/go.mod`) | — |
| Node/Next.js frontend | D-01, D-04, D-05, D-06 frontend changes | ✓ | Next.js 16 | — |

No missing dependencies identified — all runtime services this phase touches are already part of
the standard Docker Compose stack per CLAUDE.md.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 3 (`frontend/package.json`: `"test": "vitest run"`) |
| Framework (backend) | Go stdlib `testing` + `testify` |
| Config file | `frontend/vitest.config.ts`; Go tests run via `go test ./...` |
| Quick run command (frontend, targeted) | `npm --prefix frontend run test -- src/app/invitations/accept src/app/login src/app/admin/fansubs` |
| Quick run command (backend, targeted) | `go test ./internal/handlers/... ./internal/repository/... -run Invitation` (from `backend/`) |
| Full suite command | `npm --prefix frontend run test` and `go test ./...` (from `backend/`) |

### Phase Requirements → Test Map
| D-ID | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| D-01/D-04 | Accept page offers register+login, persists returnTo, auto-accepts after login | unit/component | `vitest run src/app/invitations/accept/page.test.tsx` | ❌ Wave 0 (no test file exists today for `/invitations/accept`; `/login/page.test.tsx` exists as a pattern to mirror) |
| D-02 | `registrationAllowed` is true in tracked realm config | source-inspection / live-check | manual `grep` (already done in this research) + live KC admin check | ✓ (config already present; live check is manual, not automatable from this repo alone) |
| D-03 | Invite mail contains group name, inviter, explanatory sentence, CTA, correct Umlaute | integration (backend) + manual Mailpit check | `go test ./internal/handlers/... -run TestCreateFansubGroupInvitation` (extend or add) + live Mailpit `:8025` capture | ❌ Wave 0 — existing invitation-create tests likely assert plumbing, not new mail-body content; needs a new/extended assertion |
| D-05 | `HistoricalMemberCard` renders generate/copy/cancel claim-invite UI when `canCreateClaimInvitation` | component (frontend) | `vitest run src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` | ❌ Wave 0 (no existing test file for `GroupMembersHistTable.tsx`; `ClaimManagementPanel.test.tsx` exists and is directly adaptable) |
| D-06 | `ListFansubGroupRoleDefinitions` returns only `assignable = true` rows | repository/integration (backend) | `go test ./internal/repository/... -run TestListFansubGroupRoleDefinitions` (extend `role_definitions_context_test.go` or add new) | ⚠️ Partial — `role_definitions_context_test.go` exists and tests the *sibling* `group_history` whitelist; an equivalent assertion for `fansub_group` context does not appear to exist yet |
| D-07 | Touched pages use `@/components/ui` primitives only | lint / component | `npm --prefix frontend run lint` (ESLint `no-restricted-syntax` rule already configured per CLAUDE.md) | ✓ (rule exists, currently `warn`; verify it fires on the raw `<button>`/inline-`style` in the two accept pages before/after fix) |

### Sampling Rate
- **Per task commit:** targeted Vitest/`go test` run scoped to the touched package.
- **Per wave merge:** `npm --prefix frontend run test` (full) + `go test ./...` (from `backend/`) + `npm --prefix frontend run lint`.
- **Phase gate:** Full suite green, plus a live UAT pass (Mailpit `:8025` mail content check, fresh
  private-browser cold-invite round trip through Keycloak) before `/gsd:verify-work`, per the
  phase's own CONTEXT.md constraint that code-level checks alone are insufficient for this phase.

### Wave 0 Gaps
- [ ] `frontend/src/app/invitations/accept/page.test.tsx` — new file, covers D-01/D-04 (mirror
  `frontend/src/app/login/page.test.tsx`'s Vitest setup/mocking pattern for `useAuthSession`,
  `keycloakAuth`, `api.ts`).
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` — new file, covers
  D-05 (adapt assertions from the existing, working `ClaimManagementPanel.test.tsx`).
- [ ] Backend test coverage for `ListFansubGroupRoleDefinitions` returning exactly the
  `assignable = true` set — extend `backend/internal/repository/role_definitions_context_test.go`
  or add a sibling test, covers D-06.
- [ ] Backend test/assertion for invitation-mail body content (group name, inviter, Umlaute) —
  covers D-03; check whether `app_auth.go` already has a `_test.go` sibling with a fake `Mailer` to
  extend before assuming a new file is needed.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Keycloak OIDC/PKCE (`keycloakAuth.ts`) — unchanged by this phase, only extended with `login_hint` and a `returnPath` storage key; no new auth logic introduced. |
| V3 Session Management | yes (marginal) | `sessionStorage`-based transient state (existing pattern, D-01/D-04 extends it) — must remain session-scoped, one-shot, and never settable from an arbitrary external query value (mirrors the existing `markRegistrationCompleted` "only from a validated callback" guarantee). |
| V4 Access Control | yes | `CanAcceptInvitation` (any non-disabled authenticated app user) and `ActionFansubGroupHistoricalMembersLink` (claim-invite generation) — both already enforced server-side and unchanged by this phase. |
| V5 Input Validation | yes | Invitation email validated via `mail.ParseAddress` + CRLF-injection guard already in `mailer.go`; role codes validated via `permissions.IsKnownFansubGroupRole`/`IsGroupHistoryWhitelistRole` already in place. D-06's SQL fix does not weaken this — it only removes a *widening* leak, not a validation path. |
| V6 Cryptography | yes | Claim-invitation and app-invitation tokens are already hashed (`hashInvitationToken`) before storage; PKCE already uses SHA-256 code-challenge. No new crypto surface introduced. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open-redirect via unvalidated `returnTo`/`next` param | Tampering / Spoofing | `readSafeNextPath()` already restricts to same-origin relative paths starting with `/` and rejects `//`-prefixed and `/login`-prefixed values — the new `sessionStorage`-based returnPath must apply the same or stricter validation before `router.replace()`. |
| CSRF/state-injection on the OIDC callback | Tampering | Already mitigated by PKCE `state` matching in `exchangeKeycloakCode` (`clearRegistrationCompletion()` + throw on mismatch) — no change needed, just confirm the new returnPath key does not bypass this check by being read *before* state validation succeeds. |
| Email-enumeration via invitation accept error messages | Information Disclosure | Already handled: `Accept()` returns generic `ErrNotFound`/mutation-error codes, not "email doesn't match" specifics that would confirm an account's existence — D-04's friendlier copy must preserve this (do not add a message that reveals *why* a match failed in a way that leaks account existence). |
| Role-picker privilege confusion (a non-assignable "Administration" credit role mistaken for an actual permission grant) | Elevation of Privilege (perceived, not actual — `admin` role_definitions row does not itself grant permissions per `authz_permissions.go`'s separate capability model) | D-06's fix directly closes this UX-level confusion vector; verify via the security lens that `admin`/contribution role codes genuinely carry no capability grants today (confirmed structurally: `role_definitions` and the capability/permission system are separate tables per `admin_capability_handler.go`). |

## Sources

### Primary (HIGH confidence — direct code inspection)
- `frontend/src/app/invitations/accept/page.tsx` — current accept-page implementation
- `frontend/src/app/claim-invitations/accept/page.tsx` — sibling flow, reference pattern + bug
- `frontend/src/app/login/page.tsx`, `frontend/src/lib/useAuthSession.ts`,
  `frontend/src/lib/keycloakAuth.ts`, `frontend/src/lib/registrationCompletion.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx`,
  `useGroupMembersClaimActions.ts`, `ClaimManagementPanel.tsx`, `FansubAppMembersSection.tsx`,
  `FansubAppMemberAddModal.tsx`
- `backend/internal/handlers/app_auth.go`, `member_claim_invitations_handler.go`,
  `fansub_hist_group_member_roles_handler.go`
- `backend/internal/repository/hist_group_member_roles_repository.go`,
  `fansub_group_invitations_repository.go`, `fansub_repository.go`
- `backend/internal/services/mailer.go`
- `backend/internal/permissions/permissions.go` (`CanAcceptInvitation`)
- `database/migrations/0085_role_definitions_seed.up.sql`, `0100_role_definitions_fansub_lead.up.sql`,
  `0103_fansub_roles_group_history_context.up.sql`, `0112_role_model_cleanup.up.sql`,
  `0121_neutral_role_labels.up.sql`
- `infra/keycloak/realm-team4s.json` (`registrationAllowed: true`, `resetPasswordAllowed: true`)
- `docker-compose.yml` (Keycloak `26.0`, service topology)
- `backend/cmd/server/main.go` (`NewAppAuthHandler` constructor args)
- `.planning/phases/135-.../135-CONTEXT.md`, `.planning/notes/live-uat-ux-findings.md`,
  `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/config.json`, `./CLAUDE.md`

### Secondary (MEDIUM confidence)
- Keycloak `login_hint` behavior on the login form: cross-referenced across multiple GitHub issues
  and forum threads (see Open Question / Assumption A1) — consistent that `login_hint` works for
  the login form's username field with some documented edge-case gaps, but not specifically
  confirmed for the `/protocol/openid-connect/registrations` endpoint's email field in Keycloak 26.

### Tertiary (LOW confidence)
- None — no unverified single-source claims were included as factual statements; the one
  uncertain claim (A1) is explicitly flagged in the Assumptions Log rather than stated as fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing library usage directly observed in code.
- Architecture: HIGH — every pattern and pitfall traced to exact file:line locations in the current codebase.
- Pitfalls: HIGH for Pitfalls 1-5 (all directly reproduced via code reading, not inferred); the one
  MEDIUM/LOW-confidence item (Keycloak `login_hint` on the registration endpoint) is isolated to
  Assumption A1 and does not affect the SQL, prop-wiring, or mail-context findings.

**Research date:** 2026-08-17
**Valid until:** 30 days (stable brownfield surface; re-verify if `infra/keycloak/realm-team4s.json`,
`role_definitions` migrations, or the Keycloak container image version change before planning executes).
