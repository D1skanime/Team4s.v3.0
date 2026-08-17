# Phase 135: Einladungs- und Onboarding-Flow - Pattern Map

**Mapped:** 2026-08-17
**Files analyzed:** 10 (7 to modify, 1 optional new lib file, 2 net-new test files + 2 extended test files)
**Analogs found:** 10 / 10

This phase is >90% "wire existing patterns," so almost every target file's closest analog is
its own sibling file (the working half of a duplicated pair) rather than a distant module. Where
that is the case, this map states so explicitly instead of inventing a weaker analog.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/app/invitations/accept/page.tsx` | route (client page) | request-response (OIDC redirect round-trip) | `frontend/src/app/claim-invitations/accept/page.tsx` | exact (sibling flow, same shape, has the bug pre-fixed as part of this phase) |
| `frontend/src/app/claim-invitations/accept/page.tsx` | route (client page) | request-response | itself (bugfix + D-07 markup only) | exact |
| `frontend/src/lib/keycloakAuth.ts` | utility/provider (OIDC client) | request-response + sessionStorage persistence | itself (extend `saveTransientAuthState`/`consumeTransientAuthState`) | exact |
| `frontend/src/app/login/page.tsx` | route (client page) | request-response | itself (extend `readSafeNextPath`) | exact |
| `frontend/src/lib/inviteReturnPath.ts` (NEW, optional) | utility | event-driven (sessionStorage read/write) | `frontend/src/lib/registrationCompletion.ts` (sibling one-shot sessionStorage marker helper) | role-match |
| `backend/internal/handlers/app_auth.go` (`CreateFansubGroupInvitation`) | controller/handler | request-response | itself, extended using `member_claim_invitations_handler.go`'s message-mapping precedent as secondary reference | exact |
| `backend/cmd/server/main.go` (`NewAppAuthHandler` call site) | config/wiring | — | itself (existing 15-arg constructor call) | exact |
| `backend/internal/repository/hist_group_member_roles_repository.go` (`ListFansubGroupRoleDefinitions`) | repository | CRUD (read) | itself (one-line WHERE-clause fix); sibling `ListGroupHistoryRoleDefinitions` in same file shows the already-correct single-predicate style | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` (`HistoricalMemberCard`) | component | request-response (props already drilled, just unrendered) | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` lines 330-372 (working, tested, unmounted reference) | exact |
| `frontend/src/app/invitations/accept/page.test.tsx` (NEW) | test | — | `frontend/src/app/login/page.test.tsx` | exact (same mocking shape: `useAuthSession`/`keycloakAuth`/`api`) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` (NEW) | test | — | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx` | exact |
| `backend/internal/repository/role_definitions_context_test.go` (extend) | test | — | itself (existing whitelist-assertion style for the sibling `group_history` context) | exact |
| `backend/internal/handlers/app_auth_test.go` (extend, D-03 mail-body assertions) | test | — | itself, `TestCreateFansubGroupInvitationSendsMailOnSuccess` (lines 1563-1614) | exact |

## Pattern Assignments

### `frontend/src/app/invitations/accept/page.tsx` (route, request-response)

**Analog:** `frontend/src/app/claim-invitations/accept/page.tsx` (full file already read — 91 lines)

This is the primary D-01/D-04/D-07 target. Port the sibling's overall shape (`Suspense` wrapper,
`useSearchParams` token read, `useAuthSession` gate, friendly error mapper) but **do not copy its
`returnTo` mechanism as-is** — it is the exact bug this phase must not reproduce (Pitfall 1).

**Current state (own file, to be replaced), lines 1-75:**
```tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { acceptFansubInvitation, ApiError } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  // ... raw <button>, raw style={{}}, no register CTA, no returnTo, no friendly error mapping
```
Violates D-04 (`"Keycloak bleibt für Login und Session zuständig..."` is exposed verbatim to the
user) and D-07 (raw `<button>`, inline `style={{}}`) today — both must be fixed, not just the net-new
register/auto-accept logic.

**Sibling's dual-path CTA to port** (`claim-invitations/accept/page.tsx` lines 62-68) — but fix the
param name/mechanism per Pattern below, do not copy `?return_to=` verbatim:
```tsx
{token && isClientInitialized && !hasAccessToken ? (
  <p>
    Bitte melde dich zuerst an oder erstelle einen Account. Danach kommst du automatisch zurück:
    {' '}
    <Link href={`/login?return_to=${encodeURIComponent(loginReturnTo)}`}>Anmelden oder registrieren</Link>
  </p>
) : null}
```

**Friendly error-message mapper to port verbatim in shape** (`claim-invitations/accept/page.tsx` lines 10-26):
```tsx
function claimInvitationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'invitation_expired':
        return 'Dieser Einladungslink ist abgelaufen. Bitte die Gruppenleitung, einen neuen Link zu erstellen.'
      case 'invitation_used':
        return 'Diese Einladung wurde bereits verwendet.'
      case 'invitation_cancelled':
        return 'Diese Einladung wurde zurückgezogen.'
      default:
        return error.message || 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
    }
  }
  return 'Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut.'
}
```
Rename to `fansubInvitationErrorMessage`/similar; the `reason_code` shape comes from
`repository.AsInvitationMutationError` server-side (same mutation-error mechanism as claim invites).

**UI-primitive markup replacement** — replace every raw `<button>`/`style={{}}` with `Button` from
`@/components/ui`, matching `frontend/src/app/login/page.tsx` lines 152-170:
```tsx
import { Button } from '@/components/ui'
// ...
<Button type="button" onClick={() => void handleAccept()} disabled={isSubmitting} loading={isSubmitting}>
  Einladung annehmen
</Button>
```

**Auto-accept-after-login extension point** — add a `useEffect` that calls `handleAccept()` once
`hasAccessToken` flips true and `token` is present, instead of requiring the current manual button
click for the returning-from-login case (D-01: "nach erfolgreichem Login/Registrierung folgt
Auto-Accept").

---

### `frontend/src/app/claim-invitations/accept/page.tsx` (route, request-response)

**Analog:** itself — no external analog needed; the fix is internal (Pitfall 1/5) plus D-07 markup
parity with the newly-rewritten `/invitations/accept`.

**Bug to fix** (own file, lines 36 and 66): `loginReturnTo` is built but passed as `?return_to=`,
which `login/page.tsx`'s `readSafeNextPath()` never reads (only reads `next`), and even a
corrected param name is dropped across the full-page Keycloak redirect (`authRedirectUri()` in
`keycloakAuth.ts` hardcodes `${origin}/login` with no query string). Do not just rename the param —
route the return path through the new `sessionStorage`-based mechanism (see `keycloakAuth.ts`
pattern below) shared with `/invitations/accept`.

Research explicitly scopes D-01/D-04's copy/markup rewrite to `/invitations/accept` only; this file
only needs the shared root-cause fix (`keycloakAuth.ts` persistence) applied, per Open Question 1's
recommendation — full D-07 markup parity here is Claude's discretion, not a hard requirement.

---

### `frontend/src/lib/keycloakAuth.ts` (utility/provider, sessionStorage persistence)

**Analog:** itself — this file already contains the exact pattern to generalize (PKCE
verifier/state/intent transient storage). No external file needed.

**Existing transient-storage pattern to extend** (lines 12-14, 58-73):
```typescript
const PKCE_VERIFIER_STORAGE_KEY = 'team4s.keycloak.pkce_verifier'
const PKCE_STATE_STORAGE_KEY = 'team4s.keycloak.pkce_state'
const PKCE_INTENT_STORAGE_KEY = 'team4s.keycloak.pkce_intent'

function saveTransientAuthState(verifier: string, state: string, intent: KeycloakLoginIntent): void {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state)
  sessionStorage.setItem(PKCE_INTENT_STORAGE_KEY, intent)
}

function consumeTransientAuthState(): { verifier: string; state: string; intent: KeycloakLoginIntent } {
  const verifier = (sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) || '').trim()
  const state = (sessionStorage.getItem(PKCE_STATE_STORAGE_KEY) || '').trim()
  const rawIntent = (sessionStorage.getItem(PKCE_INTENT_STORAGE_KEY) || '').trim()
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(PKCE_STATE_STORAGE_KEY)
  sessionStorage.removeItem(PKCE_INTENT_STORAGE_KEY)
  const intent: KeycloakLoginIntent = rawIntent === 'register' ? 'register' : 'login'
  return { verifier, state, intent }
}
```
Add a fourth key (e.g. `team4s.keycloak.return_path`), written in `saveTransientAuthState`/read in
`consumeTransientAuthState`, following the exact same set/remove-on-consume shape. Apply the same
open-redirect guard already used by `readSafeNextPath()` (same-origin, starts with `/`, not `//`,
not `/login`-prefixed) before ever calling `router.replace()` with it — do not weaken validation
just because the value now comes from `sessionStorage` instead of a URL query param.

**`BeginKeycloakLoginOptions` extension point** (lines 112-142) — add `loginHint` and `returnPath`:
```typescript
export type BeginKeycloakLoginOptions = {
  prompt?: KeycloakLoginPrompt
  intent?: KeycloakLoginIntent
  loginHint?: string      // NEW — D-01: pre-fill invite email on Keycloak registration form
  returnPath?: string     // NEW — persisted via saveTransientAuthState, read back by /login
}
// inside beginKeycloakLogin, alongside the existing:
if (options.prompt) authURL.searchParams.set('prompt', options.prompt)
// NEW: if (options.loginHint) authURL.searchParams.set('login_hint', options.loginHint)
```

---

### `frontend/src/app/login/page.tsx` (route, request-response)

**Analog:** itself — extend `readSafeNextPath()`, do not replace it.

**Current implementation to extend** (lines 28-37):
```tsx
function readSafeNextPath(): string {
  if (typeof window === 'undefined') return '/me/profile'

  const params = new URLSearchParams(window.location.search)
  const next = (params.get('next') || '').trim()
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) {
    return '/me/profile'
  }
  return next
}
```
Extend to also consult the new `sessionStorage`-persisted `returnPath` (consumed via
`consumeTransientAuthState()` in `keycloakAuth.ts`, already invoked inside `exchangeKeycloakCode`)
as the primary source after a callback completes, falling back to the URL `next` param for the
direct (non-invite) login case. The `completeCallback()` effect (lines 53-98) already computes
`destination` from `nextPath` right before `router.replace(destination)` (line 81) — that is the
exact call site to wire the new returnPath source into.

**Existing dual login/register `Button` CTA to reuse as the pattern reference for D-01** (lines 152-170):
```tsx
<Button type="button" onClick={() => void handleLogin()} disabled={isBusy || !keycloakEnabled} loading={isBusy}>
  {isAlreadySignedIn ? 'Erneut anmelden' : 'Anmelden'}
</Button>
{!isAlreadySignedIn ? (
  <Button type="button" variant="secondary" onClick={() => void handleRegister()} disabled={isBusy || !keycloakEnabled}>
    Registrieren
  </Button>
) : null}
```

---

### `backend/internal/handlers/app_auth.go` — `CreateFansubGroupInvitation` (controller, request-response)

**Analog:** itself, extended; struct/constructor pattern is internally consistent (see
`fansub_repository.go` for the reusable lookup, `main.go` for the wiring call site).

**Struct + constructor to extend** (lines 66-118) — add a `fansubRepo` field mirroring the existing
field style exactly:
```go
type AppAuthHandler struct {
	appAuthRepo        *repository.AppAuthRepository
	authzRepo          *repository.AuthzRepository
	stateRepo          *repository.AuthRepository
	memberRepo         fansubGroupAppMemberStore
	invitationRepo     fansubGroupInvitationStore
	profileRepo        memberProfileStore
	keycloakVerifier   *backendauth.KeycloakVerifier
	permissionSvc      *permissions.Service
	auditLogRepo       auditLogWriter
	tiptapSvc          *services.TipTapService
	mailer             services.Mailer
	mediaStorageDir    string
	mediaBaseURL       string
	keycloakAccountURL string
	appPublicURL       string
	// NEW: fansubRepo *repository.FansubRepository — for group-name lookup in invite mail (D-03)
}

func NewAppAuthHandler(
	appAuthRepo *repository.AppAuthRepository,
	// ... 14 existing params in order ...
	appPublicURL string,
	// NEW: fansubRepo *repository.FansubRepository,
) *AppAuthHandler {
	return &AppAuthHandler{
		// ... existing field assignments unchanged ...
	}
}
```

**Mail-send block to extend** (lines 401-441) — the exact insertion point for group-name/inviter
context, current (bare) version:
```go
if h.mailer != nil {
    inviteURL := strings.TrimRight(h.appPublicURL, "/") + created.InviteLink
    mailCtx, mailCancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
    defer mailCancel()

    mailErr := h.mailer.Send(mailCtx, services.MailMessage{
        To:       created.Invitation.Email,
        Subject:  "Einladung zur Fansub-Gruppe",
        BodyText: fmt.Sprintf("Du wurdest zu einer Fansub-Gruppe eingeladen.\n\nLink zum Annehmen: %s\n\nDieser Link ist 7 Tage gültig.", inviteURL),
        BodyHTML: fmt.Sprintf(`<p>Du wurdest zu einer Fansub-Gruppe eingeladen.</p><p><a href="%s">Einladung annehmen</a></p><p>Dieser Link ist 7 Tage gültig.</p>`, inviteURL),
    })
    // D-12 (existing, keep): on mailErr, cancel invitation immediately.
}
```
Insert a `h.fansubRepo.GetGroupByID(c.Request.Context(), fansubID)` call before this block (fansubID
already resolved at line 360) and use `identity.DisplayName` (already in scope from
`permissionActorFromContext(c)` at line 351) for the inviter's name. Compose `Subject`/`BodyText`/
`BodyHTML` with group name + inviter name + a short "Team4s ist..." sentence + explicit CTA, keeping
correct Umlaute (note: file currently shows `gültig`/`geprüft` mojibake artifacts from a prior
encoding issue at lines 368/413/436 — verify UTF-8 output, don't propagate the mojibake into new
strings).

**Reusable group-name lookup** (`backend/internal/repository/fansub_repository.go` lines 157-182):
```go
func (r *FansubRepository) GetGroupByID(ctx context.Context, id int64) (*models.FansubGroup, error) {
	query := `
		SELECT id, slug, name, logo_id, banner_id, logo_url, banner_url,
			founded_year, dissolved_year, closed_year, status, 'group' AS group_type,
			website_url, discord_url, irc_url, country, created_at, updated_at
		FROM fansub_groups WHERE id = $1
	`
	var item models.FansubGroup
	if err := r.db.QueryRow(ctx, query, id).Scan(&item.ID, &item.Slug, &item.Name, /* ... */); err != nil {
		// ...
	}
	// use item.Name for the mail subject/body
}
```

**Wiring call site to update** (`backend/cmd/server/main.go` lines 85, 191-207):
```go
fansubRepo := repository.NewFansubRepository(dbPool, cfg.MediaStorageDir)  // already constructed at line 85, reuse it
// ...
appAuthHandler := handlers.NewAppAuthHandler(
    appAuthRepo, authzRepo, authRepo, groupAppMemberRepo, groupInvitationRepo,
    memberProfileRepo, keycloakVerifier, permissionSvc, auditLogRepo, tiptapSvc,
    mailerSvc, cfg.MediaStorageDir, cfg.MediaPublicBaseURL, cfg.KeycloakAccountURL, cfg.AppPublicURL,
    // NEW: fansubRepo,
)
```
`fansubRepo` is already constructed earlier in `main.go` (line 85) for other handlers — pass the
same instance, do not construct a second one.

---

### `backend/internal/repository/hist_group_member_roles_repository.go` — `ListFansubGroupRoleDefinitions` (repository, CRUD read)

**Analog:** itself — the fix is a one-line WHERE-clause simplification; no external analog needed
because the target's own sibling method in the same file already models the correct single-predicate
style.

**Current (buggy) query** (lines 330-338):
```go
func (r *HistGroupMemberRolesRepository) ListFansubGroupRoleDefinitions(ctx context.Context) ([]RoleDefinitionOption, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code, label_de, sort_order
		FROM role_definitions
		WHERE assignable = true
		   OR 'fansub_group' = ANY(contexts)
		   OR 'anime_contribution' = ANY(contexts)
		ORDER BY sort_order, code
	`)
```
**Fix:** drop both `OR` branches — `WHERE assignable = true` only (D-06). Verified in research not
to regress `techadmin`/`gfxler`/the four legacy group roles, all of which are `assignable = true`
directly per migration `0112_role_model_cleanup.up.sql:26-33`.

---

### `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` — `HistoricalMemberCard` (component, request-response)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` lines 330-372 (fully
tested, unmounted reference implementation of the exact same claim-generate UI, one member at a time).

**Current destructure to extend** (own file, lines 143-150) — the props are already declared on
`GroupMembersHistTableProps` (lines 76-100: `generatedInvites`, `memberInvitations`, `copyStates`,
`canCreateClaimInvitation`, `onGenerateInvitation`, `onCancelInvitation`, `onCopyLink`,
`normalizeInviteLink`) and already spread into this component via `{...props}` at the call site
(line 128) — but `HistoricalMemberCard`'s destructure only takes 5 fields:
```tsx
function HistoricalMemberCard({
  member,
  memberRoles,
  canManageHistoricalMembers,
  roleLabelForCode,
  onEditMember,
  onDeleteMember,
}: HistoricalMemberCardProps) {
```
Add the claim-related fields to this destructure explicitly (Pitfall 3: TypeScript will not flag the
omission because the parent type is a superset).

**UI block to port** (`ClaimManagementPanel.tsx` lines 336-363), adapted to `@/components/ui`
imports already present in `GroupMembersHistTable.tsx` (`Badge`, `Button` — add `Toolbar`, `Input`):
```tsx
<Toolbar
  leading={<strong>{member.display_name}</strong>}
  trailing={(
    <Button variant="secondary" size="sm" leftIcon={<Link2 size={16} />}
      onClick={() => void onGenerateInvitation(member.id, member.member_id)}>
      Einladungslink generieren
    </Button>
  )}
/>
{invite ? (
  <div className={styles.inviteLinkRow}>
    <Input id={`hist-claim-invite-link-${member.id}`} readOnly value={inviteLink}
      onFocus={(e) => e.currentTarget.select()} />
    <Button variant="secondary" size="sm" leftIcon={<Copy size={16} />}
      onClick={() => void onCopyLink(member.id, inviteLink)}>
      {copyStates[member.id] === 'copied' ? 'Kopiert!' : 'Link kopieren'}
    </Button>
  </div>
) : null}
```
Gate this whole block on `canCreateClaimInvitation && !member.app_username` (the "unclaimed"
condition, per `historicalMemberMeta()` already in this file at lines 53-56). Note the id prefix
must be `hist-claim-invite-link-${member.id}` to match `useGroupMembersClaimActions.ts`'s
`markVisibleInviteLink()` DOM lookup (line 91 of that hook) — copying `ClaimManagementPanel.tsx`'s
`claim-invite-link-` prefix verbatim would silently break the copy-fallback focus/select behavior.

**Hook already fully wired, nothing to change there** (`useGroupMembersClaimActions.ts`, full file):
exposes `generatedInvites`, `memberInvitations`, `copyStates`, `handleGenerateInvitation`,
`handleCancelInvitation`, `handleCopyLink` — all already threaded through `GroupMembersTab.tsx` into
`GroupMembersHistTable` props per the existing prop spread.

**Open Question 2 (Claude's discretion, document the choice in the plan):** either delete
`ClaimManagementPanel.tsx` + its test after porting, or keep it with an explicit "intentionally
unmounted" comment — do not leave it silently orphaned.

---

## Shared Patterns

### Friendly reason-code -> message mapping (D-04)
**Source:** `frontend/src/app/claim-invitations/accept/page.tsx` lines 10-26 (`claimInvitationErrorMessage`)
**Apply to:** `frontend/src/app/invitations/accept/page.tsx` (new `fansubInvitationErrorMessage`,
same switch-on-`error.code` shape, different `reason_code` set from
`repository.AsInvitationMutationError` for `fansub_group_invitations`).

### sessionStorage-persisted transient state across an IdP redirect (D-01/D-04)
**Source:** `frontend/src/lib/keycloakAuth.ts` lines 58-73 (`saveTransientAuthState`/`consumeTransientAuthState`)
**Apply to:** `frontend/src/lib/keycloakAuth.ts` itself (add `returnPath` key), consumed by both
`frontend/src/app/login/page.tsx` and indirectly by `frontend/src/app/invitations/accept/page.tsx` /
`frontend/src/app/claim-invitations/accept/page.tsx` (the pages that set `returnPath` before calling
`beginKeycloakLogin`).

### Global UI primitives only, no raw `<button>`/`style={{}}` (D-07)
**Source:** `frontend/src/app/login/page.tsx` lines 152-170 (`Button` from `@/components/ui`)
**Apply to:** every touched frontend file in this phase — `invitations/accept/page.tsx` (full
rewrite from raw markup), `claim-invitations/accept/page.tsx` (bugfix pass, markup parity
recommended), `GroupMembersHistTable.tsx` (already compliant, extend with `Toolbar`/`Input` per the
`ClaimManagementPanel.tsx` reference above).

### Repository role-filter single source of truth (D-06)
**Source:** `database/migrations/0112_role_model_cleanup.up.sql` (introduces `assignable` column)
**Apply to:** `backend/internal/repository/hist_group_member_roles_repository.go` only — do **not**
also filter the frontend `FANSUB_GROUP_ROLE_OPTIONS` fallback in `frontend/src/types/fansub.ts`
(used for label lookups of already-assigned roles across `FansubAppMembersOverview.tsx`,
`MemberBadgeChain.tsx`, `profileLabels.ts`, `roleColors.ts`, `CategoryProgressTable.tsx` — trimming
it would break those unrelated label-rendering call sites per the Anti-Pattern in RESEARCH.md).

### Mail context via existing repository, no new backend surface (D-03)
**Source:** `backend/internal/repository/fansub_repository.go` lines 157-182 (`GetGroupByID`)
**Apply to:** `backend/internal/handlers/app_auth.go`'s `CreateFansubGroupInvitation`, wired through
a new `fansubRepo` constructor argument (see `main.go` wiring above) — do not add a second
group-name query.

## No Analog Found

None — every file in this phase's scope has a working, in-repo analog (frequently its own sibling
file or an earlier, unfinished version of itself). This is expected for a phase research explicitly
frames as "wire up what already exists."

## Metadata

**Analog search scope:** `frontend/src/app/invitations/`, `frontend/src/app/claim-invitations/`,
`frontend/src/app/login/`, `frontend/src/lib/`, `frontend/src/app/admin/fansubs/[id]/edit/`,
`backend/internal/handlers/`, `backend/internal/repository/`, `backend/internal/services/`,
`backend/cmd/server/`.
**Files scanned:** 14 read in full or by targeted range (all ≤ 2,318 lines; no file required
Grep-then-offset chunking beyond `app_auth.go`, `app_auth_test.go`, `fansub_repository.go`, and
`GroupMembersHistTable.tsx`'s claim-panel counterpart, all read with non-overlapping ranges).
**Pattern extraction date:** 2026-08-17
