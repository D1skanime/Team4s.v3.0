# Phase 66: Claiming und Verifizierung — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 14 neue/geänderte Dateien
**Analogs found:** 13 / 14

---

## File Classification

| Neue/geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Match-Qualität |
|----------------------|-------|------------|-----------------|----------------|
| `database/migrations/0092_member_claim_invitations.up.sql` | migration | CRUD | `database/migrations/0076_fansub_group_invitations.up.sql` | exact |
| `database/migrations/0092_member_claim_invitations.down.sql` | migration | — | `database/migrations/0076_fansub_group_invitations.up.sql` | exact |
| `backend/internal/repository/member_claims_repository.go` | repository | CRUD | `backend/internal/repository/fansub_group_invitations_repository.go` | role-match |
| `backend/internal/repository/member_claim_invitations_repository.go` | repository | CRUD + token | `backend/internal/repository/fansub_group_invitations_repository.go` | exact |
| `backend/internal/handlers/member_claims_handler.go` | handler | request-response | `backend/internal/handlers/contributions_me_handler.go` | role-match |
| `backend/internal/handlers/member_claim_invitations_handler.go` | handler | request-response | `backend/internal/handlers/app_auth.go` | role-match |
| `frontend/src/app/claim-invitations/accept/page.tsx` | page (Client Component) | request-response | `frontend/src/app/invitations/accept/page.tsx` | exact |
| `frontend/src/app/me/profile/components/ClaimStatusCard.tsx` | component | request-response | `frontend/src/app/me/profile/components/VisibilityCard.tsx` | exact |
| `frontend/src/components/profile/VerifiedBadge.tsx` | component | — | `frontend/src/components/profile/MemberProfileHero.tsx` | role-match |
| `frontend/src/components/profile/MemberProfileHero.tsx` | component (erweitert) | — | `frontend/src/components/profile/MemberProfileHero.tsx` | self |
| `frontend/src/components/profile/MemberRoleTimeline.tsx` | component (erweitert) | — | `frontend/src/components/profile/MemberRoleTimeline.tsx` | self |
| `frontend/src/app/members/[slug]/page.tsx` | page (Server Component, erweitert) | request-response | `frontend/src/app/members/[slug]/page.tsx` | self |
| `frontend/src/app/me/profile/page.tsx` | page (Client Component, erweitert) | request-response | `frontend/src/app/me/profile/page.tsx` | self |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | page (Client Component, erweitert) | request-response | `frontend/src/app/admin/my-groups/[id]/page.tsx` | self |

---

## Pattern Assignments

### `database/migrations/0092_member_claim_invitations.up.sql` (migration, CRUD)

**Analog:** `database/migrations/0076_fansub_group_invitations.up.sql`

**Vollständige Tabellenstruktur** (Zeilen 1–34 des Analogs):
```sql
CREATE TABLE IF NOT EXISTS fansub_group_invitations (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL,
    invited_role_codes TEXT[] NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    cancelled_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_group_invitations_status
        CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    CONSTRAINT chk_fansub_group_invitations_token_hash_length
        CHECK (char_length(token_hash) = 64)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_invitations_pending_email
    ON fansub_group_invitations (fansub_group_id, normalized_email) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_invitations_token_hash
    ON fansub_group_invitations (token_hash);
CREATE INDEX IF NOT EXISTS idx_fansub_group_invitations_group_status
    ON fansub_group_invitations (fansub_group_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fansub_group_invitations_expires_at
    ON fansub_group_invitations (expires_at);
```

**Anpassungen für 0092:** Kein `email`/`normalized_email`/`invited_role_codes`-Feld. Stattdessen `member_id BIGINT NOT NULL REFERENCES members(id)` und `fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id)` (Leader-Kontext). Unique-Pending-Index auf `(member_id)` statt `(fansub_group_id, normalized_email)`. CHECK-Constraint beibehalten (gleiche Status-Werte). Token-Hash-Längen-Constraint identisch.

---

### `backend/internal/repository/member_claim_invitations_repository.go` (repository, CRUD + token)

**Analog:** `backend/internal/repository/fansub_group_invitations_repository.go`

**Imports-Muster** (Zeilen 1–20):
```go
package repository

import (
    "context"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "errors"
    "fmt"
    "strings"
    "time"

    "team4s.v3/backend/internal/models"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Fehler-Typ-Muster** (Zeilen 22–41 des Analogs — direkt kopieren, Code-Werte anpassen):
```go
type ClaimMutationError struct {
    Code       string
    Message    string
    HTTPStatus int
}

func (e *ClaimMutationError) Error() string {
    if e == nil {
        return ""
    }
    return e.Message
}

func AsClaimMutationError(err error) (*ClaimMutationError, bool) {
    var target *ClaimMutationError
    if errors.As(err, &target) {
        return target, true
    }
    return nil, false
}
```

**Token-Erzeugung und Hashing** (Zeilen 482–494 des Analogs — direkt kopieren):
```go
func generateClaimInvitationToken() (string, string, error) {
    buffer := make([]byte, 32)
    if _, err := rand.Read(buffer); err != nil {
        return "", "", err
    }
    rawToken := base64.RawURLEncoding.EncodeToString(buffer)
    return rawToken, hashClaimInvitationToken(rawToken), nil
}

func hashClaimInvitationToken(raw string) string {
    sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
    return hex.EncodeToString(sum[:])
}
```

**Lazy-Expire-Muster** (Zeilen 361–374 des Analogs — Struktur kopieren):
```go
func (r *MemberClaimInvitationRepository) expirePendingInvitations(ctx context.Context, memberID int64) error {
    _, err := r.db.Exec(ctx, `
        UPDATE member_claim_invitations
        SET status = 'expired', updated_at = NOW()
        WHERE member_id = $1 AND status = 'pending' AND expires_at <= NOW()
    `, memberID)
    if err != nil {
        return fmt.Errorf("expire pending member claim invitations: %w", err)
    }
    return nil
}
```

**Accept-Transaktion mit FOR UPDATE + State-Map** (Zeilen 239–358 des Analogs — Kernstruktur):
```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil { ... }
defer tx.Rollback(ctx)

// Token nachschlagen, FOR UPDATE sperren
row := tx.QueryRow(ctx, `
    SELECT id, member_id, fansub_group_id, status, expires_at, ...
    FROM member_claim_invitations WHERE token_hash = $1 FOR UPDATE
`, tokenHash)
// Status prüfen (pending/expired/cancelled/accepted) via mapTerminalInvitationState
// expires_at prüfen → UPDATE zu 'expired' + ErrExpired zurückgeben
// Invariante: Prüfe ob bereits verified-Claim für member_id EXISTS
// Dann: INSERT member_claims (claim_status='verified', verification_method='invite_link')
//       UPDATE members SET noindex = false WHERE id = memberID
//       UPDATE member_claim_invitations SET status='accepted' WHERE id = invitation.ID
if err := tx.Commit(ctx); err != nil { ... }
```

**Terminal-State-Mapping** (Zeilen 496–507 des Analogs — identisch übernehmen, Message-Strings anpassen):
```go
func mapTerminalClaimInvitationState(status string) error {
    switch strings.TrimSpace(status) {
    case "cancelled":
        return &ClaimMutationError{Code: "invitation_cancelled", Message: "Diese Einladung wurde bereits zurückgezogen.", HTTPStatus: 410}
    case "accepted":
        return &ClaimMutationError{Code: "invitation_used", Message: "Diese Einladung wurde bereits verwendet.", HTTPStatus: 409}
    case "expired":
        return &ClaimMutationError{Code: "invitation_expired", Message: "Dieser Einladungslink ist abgelaufen.", HTTPStatus: 410}
    default:
        return &ClaimMutationError{Code: "invalid_invitation_state", Message: "Diese Einladung kann nicht mehr verwendet werden.", HTTPStatus: 409}
    }
}
```

---

### `backend/internal/repository/member_claims_repository.go` (repository, CRUD)

**Analog:** `backend/internal/repository/fansub_group_invitations_repository.go` (Struktur), `backend/internal/handlers/contributions_me_handler.go` (Query-Muster)

**Konstruktor-Muster** (Zeilen 43–50 des Analog-Repos):
```go
type MemberClaimsRepository struct {
    db *pgxpool.Pool
}

func NewMemberClaimsRepository(db *pgxpool.Pool) *MemberClaimsRepository {
    return &MemberClaimsRepository{db: db}
}
```

**resolveVerifiedMemberID-Query** (Zeilen 39–54 von `contributions_me_handler.go` — direkt wiederverwenden):
```go
SELECT member_id FROM member_claims
WHERE app_user_id = $1 AND claim_status = 'verified'
ORDER BY verified_at DESC
LIMIT 1
```

**Verified-Invariante (SELECT FOR UPDATE)** (nach RESEARCH.md):
```go
// Innerhalb einer Transaktion, bevor claim_status auf 'verified' gesetzt wird:
var alreadyVerified bool
_ = tx.QueryRow(ctx, `
    SELECT EXISTS(
        SELECT 1 FROM member_claims
        WHERE member_id = $1 AND claim_status = 'verified'
    )
`, claimMemberID).Scan(&alreadyVerified)
if alreadyVerified {
    return nil, &ClaimMutationError{
        Code:       "already_verified",
        Message:    "Dieser Member-Eintrag ist bereits verifiziert.",
        HTTPStatus: 409,
    }
}
```

**Nick-Suche-Query** (nach RESEARCH.md, Muster nach `fansub_group_app_members_repository.go SearchCandidates`):
```go
rows, err := r.db.Query(ctx, `
    SELECT m.id, m.nickname, m.display_name
    FROM members m
    WHERE m.nickname ILIKE $1
      AND NOT EXISTS (
          SELECT 1 FROM member_claims mc
          WHERE mc.member_id = m.id AND mc.claim_status = 'verified'
      )
    ORDER BY m.nickname
    LIMIT 10
`, "%"+strings.TrimSpace(query)+"%")
```

---

### `backend/internal/handlers/member_claims_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/contributions_me_handler.go`

**Handler-Struct und Konstruktor** (Zeilen 17–35 des Analogs):
```go
// ContributionsMeHandler verwaltet HTTP-Endpunkte für eigene Contributions des eingeloggten Members.
type ContributionsMeHandler struct {
    contributionsRepo *repository.AnimeContributionsRepository
    groupRolesRepo    *repository.HistGroupMemberRolesRepository
    db                *pgxpool.Pool
}

func NewContributionsMeHandler(
    contributionsRepo *repository.AnimeContributionsRepository,
    groupRolesRepo    *repository.HistGroupMemberRolesRepository,
    db *pgxpool.Pool,
) *ContributionsMeHandler {
    return &ContributionsMeHandler{...}
}
```
Für `MemberClaimsHandler`: `claimsRepo *repository.MemberClaimsRepository`, `permissionSvc *permissions.Service`, `auditLogRepo auditLogWriter`.

**requireMeIdentity-Hilfsfunktion** (Zeilen 66–74 des Analogs — direkt kopieren):
```go
func requireMeIdentity(c *gin.Context) (middleware.AuthIdentity, bool) {
    identity, ok := middleware.CommentAuthIdentityFromContext(c)
    if !ok {
        c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
        return middleware.AuthIdentity{}, false
    }
    return identity, true
}
```

**Auth-Prüfung + Fehlerbehandlung-Muster** (Zeilen 76–100 des Analogs):
```go
func (h *MemberClaimsHandler) SubmitSelfServiceClaim(c *gin.Context) {
    identity, ok := requireMeIdentity(c)
    if !ok {
        return
    }
    // ... body binden, Repo-Aufruf, Fehlertyp-Switch
    if mutErr, ok := repository.AsClaimMutationError(err); ok {
        c.JSON(mutErr.HTTPStatus, gin.H{"error": gin.H{"message": mutErr.Message, "reason_code": mutErr.Code}})
        return
    }
    c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
}
```

---

### `backend/internal/handlers/member_claim_invitations_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/app_auth.go` (Invitation-Endpunkte: CreateFansubGroupInvitation, AcceptFansubGroupInvitation)

**Invite-Link-Generierung Response-Muster** (Zeilen 436–446 von `app_auth.go`):
```go
c.JSON(http.StatusCreated, gin.H{
    "data": gin.H{
        "id":         created.Invitation.ID,
        "status":     created.Invitation.Status,
        "expires_at": created.Invitation.ExpiresAt,
        "invite_link": created.InviteLink,
    },
})
```

**Permission-Check-Muster für Leader** (aus `app_auth.go`, Pattern `permissionSvc.CanForFansubGroup`):
```go
result, err := h.permissionSvc.CanForFansubGroup(
    c.Request.Context(), actor,
    permissions.ActionFansubGroupInvitationsCreate, fansubID,
)
if err != nil || !result.Allowed {
    c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "zugriff verweigert"}})
    return
}
```

**Audit-Log-Muster** (Zeilen 420–434 von `app_auth.go`):
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "member_claim_invitation.created",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubGroupID,
    TargetType:     "member_claim_invitation",
    TargetID:       &created.Invitation.ID,
    Action:         "create",
    Outcome:        "allowed",
    Payload:        map[string]any{"member_id": memberID},
    // Kein rawToken im Audit-Log
})
```

---

### `frontend/src/app/claim-invitations/accept/page.tsx` (page, Client Component)

**Analog:** `frontend/src/app/invitations/accept/page.tsx` (Zeilen 1–75 — vollständig)

**Vollständige Seitenstruktur** (identisch übernehmen, Texte und API-Call ersetzen):
```tsx
'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { useAuthSession } from '@/lib/useAuthSession'
// import { acceptClaimInvitation, ApiError } from '@/lib/api'  ← neuer API-Call

function AcceptClaimInvitationContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleAccept() {
    if (!token || !hasAccessToken) return
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      await acceptClaimInvitation({ token })
      setSuccessMessage('Dein Account ist jetzt als [Nick] verifiziert.')
      router.replace('/me/profile')  // Token aus URL entfernen (Fallstrick 3)
    } catch (error) {
      // ApiError-Switch: invitation_expired → spezifische Message
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <h1>Member-Claim-Einladung annehmen</h1>
      {/* kein Token → errorBox */}
      {/* nicht eingeloggt → Login-Link mit ?return_to= */}
      {/* eingeloggt → Button "Einladung annehmen" */}
      {/* successMessage → successBox + Profil-Link */}
      {/* errorMessage → errorBox */}
    </main>
  )
}

export default function AcceptClaimInvitationPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>Einladung wird geladen...</main>}>
      <AcceptClaimInvitationContent />
    </Suspense>
  )
}
```

**Unterschied zum Analog:** `router.replace('/me/profile')` nach Erfolg (kein Token in Browser-History). Login-Link mit `?return_to=/claim-invitations/accept?token=...` statt statischem `/login`.

---

### `frontend/src/app/me/profile/components/ClaimStatusCard.tsx` (component, request-response)

**Analog:** `frontend/src/app/me/profile/components/VisibilityCard.tsx`

**Vollständige Komponentenstruktur des Analogs** (Zeilen 1–41):
```tsx
import type { ProfileVisibility } from '@/types/profile'
import { formatProfileVisibilityLabel } from '@/lib/profileLabels'
import type { MemberProfileFormState } from './profileFormTypes'
import styles from '../page.module.css'

type VisibilityCardProps = {
  value: ProfileVisibility
  disabled: boolean
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
}

export function VisibilityCard({ value, disabled, onChange }: VisibilityCardProps) {
  return (
    <fieldset className={styles.radioGroup}>
      <legend>Profil-Sichtbarkeit</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.radioCard}>
          <input type="radio" name="profileVisibility" ... />
          <span><strong>...</strong><small>...</small></span>
        </label>
      ))}
      <p className={styles.mutedText}>...</p>
    </fieldset>
  )
}
```

**Checkbox-Muster** aus `page.module.css` (Zeilen 103–118 — CSS-Klasse `.checkboxControl`):
```css
.checkboxControl {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid rgba(100, 116, 139, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 650;
}
.checkboxControl input { width: 18px; height: 18px; }
```

**Optimistisches-Update-Muster** (aus `me/profile/page.tsx` handleSubmit — Zeilen 249–280): `setIsSubmitting(true)` → API-Call → `catch` → lokalen Zustand zurücksetzen + `errorBox` zeigen.

**noindex-Toggle-Props:**
```tsx
type ClaimStatusCardProps = {
  noindex: boolean
  claimStatus: 'none' | 'pending' | 'verified' | 'rejected'
  claimNick?: string | null
  disabled: boolean
  onNoindexChange: (noindex: boolean) => Promise<void>
}
```

---

### `frontend/src/components/profile/VerifiedBadge.tsx` (component, —)

**Analog:** `frontend/src/components/profile/MemberProfileHero.tsx` (Icon-Import-Muster)

**Icon-Import-Muster** (Zeilen 1–4 des Analogs):
```tsx
import { CalendarDays, Eye, Save } from 'lucide-react'
```
Für VerifiedBadge: `import { CheckCircle } from 'lucide-react'`

**Inline-Icon-Muster** (Zeilen 87–92 des Analogs — `heroMetaLine`):
```tsx
<span className={styles.heroMetaLine}>
  <CalendarDays size={15} aria-hidden="true" />
  {publicActivityLabel}
</span>
```

**VerifiedBadge-Struktur** (nach UI-SPEC.md Zeilen 183–191):
```tsx
import { CheckCircle } from 'lucide-react'
import styles from './VerifiedBadge.module.css'

type VerifiedBadgeProps = { label?: string }

export function VerifiedBadge({ label = 'Verifiziert' }: VerifiedBadgeProps) {
  return (
    <span className={styles.verifiedBadge} aria-label="Verifiziertes Mitglied">
      <CheckCircle size={18} color="var(--color-success)" aria-hidden="true" />
      <span className={styles.verifiedLabel}>{label}</span>
    </span>
  )
}
```
CSS: `display: inline-flex; gap: 4px; font-size: 14px; font-weight: 700; color: var(--color-success);`

---

### `frontend/src/components/profile/MemberProfileHero.tsx` (erweitert)

**Bestehende Datei:** `frontend/src/components/profile/MemberProfileHero.tsx`

**Erweiterungspunkt** (Zeilen 84–86 — `.heroCopy`-Block):
```tsx
<div className={styles.heroCopy}>
  <h2>{displayName}</h2>           {/* ← VerifiedBadge direkt danach einfügen */}
  <p>{profile.bio || 'Noch keine Kurzbeschreibung hinterlegt.'}</p>
```
Wird zu:
```tsx
<div className={styles.heroCopy}>
  <h2>
    {displayName}
    {isVerified && <VerifiedBadge />}
  </h2>
  <p>...</p>
```
Prop `isVerified: boolean` neu hinzufügen. Quelle: `profile.is_verified` (neues Feld in `PublicMemberProfileData`).

---

### `frontend/src/components/profile/MemberRoleTimeline.tsx` (erweitert)

**Erweiterungspunkt** (Zeilen 47–59 — `(historisch)`-Label):
```tsx
const isHistorical = entry.status === 'historical'

// Zeile 58: Bedingung jetzt auch von is_verified abhängig
{isHistorical && (
  <span className={styles.roleTimelineHistorical}> (historisch)</span>
)}
```
Wird zu: `{isHistorical && !isEntryVerified && <span ...>(historisch)</span>}` — neues `isVerified`-Prop aus dem Entry-Typ oder aus übergeordnetem Prop.

---

### `frontend/src/app/members/[slug]/page.tsx` (erweitert — generateMetadata)

**Bestehende Datei:** `frontend/src/app/members/[slug]/page.tsx`

**Interface-Muster** (Zeilen 29–37 des Analogs — bereits vorhanden):
```tsx
interface MemberProfilePageProps {
  params: { slug: string } | Promise<{ slug: string }>
}
```

**generateMetadata-Muster hinzufügen** (nach RESEARCH.md Zeilen 295–308):
```tsx
export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()
  if (!slug) return {}
  try {
    const response = await getMemberProfile(slug)
    if ('data' in response && response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
  } catch {
    // Fallback: keine robots-Direktive
  }
  return {}
}
```
Voraussetzung: `PublicMemberProfileData.noindex: boolean` und `GetPublicMemberProfile()` muss `m.noindex` zurückgeben.

---

### `frontend/src/app/me/profile/page.tsx` (erweitert)

**Bestehende Datei:** `frontend/src/app/me/profile/page.tsx`

**Side-Column-Muster** (Zeilen 380–411 — `<aside className={styles.sideColumn}>`):
```tsx
<aside className={styles.sideColumn}>
  {/* ... bestehende Cards ... */}
  <Card variant="section">
    <VisibilityCard ... />
  </Card>
  {/* NEU: ClaimStatusCard danach einfügen */}
  <Card variant="section">
    <ClaimStatusCard
      noindex={profile.noindex}
      claimStatus={...}  // aus profile.claim_status (neues Feld)
      claimNick={...}
      disabled={!profile.capabilities.can_edit_own_profile || isSaving}
      onNoindexChange={handleNoindexChange}
    />
  </Card>
</aside>
```

---

### `frontend/src/app/admin/my-groups/[id]/page.tsx` (erweitert)

**Bestehende Datei:** `frontend/src/app/admin/my-groups/[id]/page.tsx`

**Import-Muster** (Zeilen 1–32 des Analogs — UI-Komponenten):
```tsx
import {
  Badge, Button, Card, EmptyState, ErrorState, LoadingState,
  PageHeader, SectionHeader, Table, TableBody, TableCell,
  TableHead, TableHeaderCell, TableRow, Toolbar,
} from "@/components/ui";
```
Neu hinzufügen: `Copy`, `Link2`, `UserCheck`, `UserX` aus `lucide-react`.

**readErrorMessage-Hilfsfunktion** (Zeilen 39–43 des Analogs — direkt kopieren):
```tsx
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
```

**Erweiterungspunkt:** Nach dem letzten bestehenden `SectionHeader` neue Sektionen anfügen: "Member-Claim-Einladungen" (Einladungslink pro hist. Member) + "Offene Claims (N)" (Tabelle mit Bestätigen/Ablehnen) + "Neuanlage-Anträge (N)".

---

## Geteilte Muster (Shared Patterns)

### Auth-Identität extrahieren (Backend)
**Quelle:** `backend/internal/handlers/contributions_me_handler.go`, Zeilen 66–74
**Anwenden auf:** Alle neuen Handler-Dateien
```go
func requireMeIdentity(c *gin.Context) (middleware.AuthIdentity, bool) {
    identity, ok := middleware.CommentAuthIdentityFromContext(c)
    if !ok {
        c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
        return middleware.AuthIdentity{}, false
    }
    return identity, true
}
```

### Fehlerformat (Backend JSON)
**Quelle:** `backend/internal/handlers/app_auth.go`, Zeile 116
**Anwenden auf:** Alle neuen Handler-Dateien
```go
c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
c.JSON(http.StatusForbidden,   gin.H{"error": gin.H{"message": "zugriff verweigert"}})
c.JSON(http.StatusConflict,    gin.H{"error": gin.H{"message": mutErr.Message, "reason_code": mutErr.Code}})
```

### API-Funktion-Muster (Frontend)
**Quelle:** `frontend/src/lib/api.ts`, Zeilen 3110–3142 (`acceptFansubInvitation`)
**Anwenden auf:** Alle neuen Frontend-API-Aufrufe (acceptClaimInvitation, submitMemberClaim, generateClaimInvitation, etc.)
```ts
export async function acceptClaimInvitation(
  payload: AcceptClaimInvitationRequest,
  authToken?: string,
): Promise<AcceptClaimInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/claim-invitations/accept`, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AcceptClaimInvitationResponse>;
}
```

### errorBox / successBox (Frontend CSS)
**Quelle:** `frontend/src/app/me/profile/page.module.css` (`.errorBox`, `.successBox`)
**Anwenden auf:** `ClaimStatusCard.tsx`, `accept/page.tsx`, Erweiterung der Gruppendetail-Seite
```tsx
{errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
{successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
```

### Repository-Verdrahtung (main.go)
**Quelle:** `backend/cmd/server/main.go`, Zeilen 145–180
**Anwenden auf:** Neue Repos und Handler analog verdrahten:
```go
memberClaimsRepo := repository.NewMemberClaimsRepository(dbPool)
memberClaimInvitationsRepo := repository.NewMemberClaimInvitationRepository(dbPool)
memberClaimsHandler := handlers.NewMemberClaimsHandler(memberClaimsRepo, permissionSvc, auditLogRepo)
memberClaimInvitationsHandler := handlers.NewMemberClaimInvitationsHandler(
    memberClaimInvitationsRepo, memberClaimsRepo, permissionSvc, auditLogRepo, cfg.AppPublicURL,
)
```

### Token-Hash-Sicherheitsprinzip
**Quelle:** `backend/internal/repository/fansub_group_invitations_repository.go`, Zeilen 482–494
**Anwenden auf:** `member_claim_invitations_repository.go`
- Nur `token_hash` (SHA-256) wird in DB gespeichert — nie der Klartext-Token
- `rawToken` nur im API-Response zurückgeben (`invite_link`)
- Nie im Audit-Log loggen

---

## Kein Analog gefunden

| Datei | Rolle | Datenfluss | Grund |
|-------|-------|------------|-------|
| (keine) | — | — | Alle Dateien haben ausreichende Analoga |

**Hinweis D-03 (Neuanlage-Antrag):** Falls `member_claims` mit `member_id = NULL` als Neuanlage-Antrag modelliert wird (RESEARCH.md Annahme A2), braucht es keine eigene Migrationsdatei — das Repo und der Handler können diese Fälle inline behandeln. Der Planner sollte dies mit dem User klären.

---

## Typ-Erweiterungen (Frontend)

Folgende bestehende Typen in `frontend/src/types/profile.ts` müssen erweitert werden:

**`PublicMemberProfileData`** (Zeilen 119–138) — fehlende Felder hinzufügen:
```ts
export interface PublicMemberProfileData {
  // ... bestehende Felder ...
  is_verified: boolean          // NEU: verifizierter Claim vorhanden
  noindex: boolean              // NEU: aus members.noindex
}
```

**`MemberProfileData`** (Zeilen 52–99) — ebenfalls erweitern:
```ts
export interface MemberProfileData {
  // ... bestehende Felder ...
  is_verified: boolean          // NEU
  noindex: boolean              // NEU
  claim_status?: 'pending' | 'verified' | 'rejected' | null  // NEU
  claim_member_nick?: string | null  // NEU (Nick des beanspruchten Members)
}
```

---

## Metadaten

**Analog-Suchbereich:** `backend/internal/`, `frontend/src/app/`, `frontend/src/components/`, `database/migrations/`
**Dateien gelesen:** 16
**Pattern-Extraktion:** 2026-06-02
