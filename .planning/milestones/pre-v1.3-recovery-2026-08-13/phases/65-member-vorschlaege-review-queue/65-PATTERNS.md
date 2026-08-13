# Phase 65: Member-Vorschläge und Review-Queue — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 11 neue/geänderte Dateien
**Analogs found:** 11 / 11

---

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `backend/internal/handlers/contribution_proposals_me_handler.go` | handler | request-response | `contributions_me_handler.go` | exact |
| `backend/internal/handlers/contribution_review_handler.go` | handler | request-response | `fansub_anime_contributions_handler.go` | exact |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | repository | CRUD | `anime_contributions_member_repository.go` | exact |
| `database/migrations/0089_anime_contributions_review_note.up.sql` | migration | — | `0088_anime_contributions_constraints.up.sql` | role-match |
| `database/migrations/0089_anime_contributions_review_note.down.sql` | migration | — | `0088_anime_contributions_constraints.down.sql` | role-match |
| `frontend/src/components/contributions/ProposalForm.tsx` | component | request-response | `ContributionCard.tsx` + `MyContributionsSection.tsx` | role-match |
| `frontend/src/components/contributions/MyProposalsSection.tsx` | component | request-response | `MyContributionsSection.tsx` | exact |
| `frontend/src/components/contributions/ReviewQueue.tsx` | component | request-response | `admin/my-groups/[id]/page.tsx` (Card/SectionHeader-Pattern) | role-match |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | page (ERWEITERN) | request-response | sich selbst (421 Z., ReviewQueue einbinden) | exact |
| `frontend/src/lib/api.ts` | utility (ERWEITERN) | request-response | `confirmAnimeContribution` / `rejectAnimeContribution` (Zeilen 6910–6960) | exact |
| `frontend/src/types/contributions.ts` | model (ERWEITERN) | — | sich selbst (bestehende `MeAnimeContribution`) | exact |

---

## Pattern Assignments

### `backend/internal/handlers/contribution_proposals_me_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/contributions_me_handler.go`

**Imports-Pattern** (Zeilen 1–15):
```go
package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)
```

**Handler-Struct-Pattern** (Zeilen 17–35):
```go
// ContributionsMeHandler verwendet *pgxpool.Pool direkt (Pitfall 4 im RESEARCH).
// Neue Handler für Proposals MÜSSEN stattdessen AnimeContributionsRepository nutzen,
// damit Stub-basierte Tests möglich sind.
type ContributionsMeHandler struct {
	contributionsRepo *repository.AnimeContributionsRepository
	groupRolesRepo    *repository.HistGroupMemberRolesRepository
	db                *pgxpool.Pool
}
```

**Auth/Me-Identity-Pattern** (`requireMeIdentity`, Zeilen 67–74):
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

**resolveVerifiedMemberID-Pattern** (Zeilen 39–54):
```go
func (h *ContributionsMeHandler) resolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := h.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}
```
> **Hinweis:** In `contribution_proposals_me_handler.go` dieses Pattern kopieren, aber `resolveVerifiedMemberID` gegen das Repository implementieren statt roh gegen `*pgxpool.Pool` — sonst sind Stub-Tests nicht möglich (RESEARCH Pitfall 4).

**Ownership-Check-Pattern** (`authorizeAnimeContributionOwner`, Zeilen 132–153):
```go
func (h *ContributionsMeHandler) authorizeAnimeContributionOwner(c *gin.Context, contributionID, memberID int64) bool {
	var ownerMemberID int64
	err := h.db.QueryRow(c.Request.Context(), `
		SELECT hfgm.member_id
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE ac.id = $1
	`, contributionID).Scan(&ownerMemberID)
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(c, "contribution nicht gefunden")
		return false
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return false
	}
	if ownerMemberID != memberID {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
		return false
	}
	return true
}
```

**Status-Update-Pattern mit Sichtbarkeitsflags** (`updateMyAnimeContributionStatus`, Zeilen 222–259):
```go
func (h *ContributionsMeHandler) updateMyAnimeContributionStatus(c *gin.Context, targetStatus string, publicOnProfile bool) {
	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution-id")
		return
	}
	identity, ok := requireMeIdentity(c)
	if !ok { return }
	memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
		return
	}
	if !h.authorizeAnimeContributionOwner(c, contributionID, memberID) { return }

	_, err = h.db.Exec(c.Request.Context(), `
		UPDATE anime_contributions
		SET status = $1, is_public_on_member_profile = $2, updated_at = NOW()
		WHERE id = $3
	`, targetStatus, publicOnProfile, contributionID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status aktualisiert"})
}
```
> Die Selbstschaltung (SelfPublish, P65-SC3) nutzt exakt dieses Muster, setzt aber `status` NICHT auf `confirmed` — nur die Sichtbarkeitsflags und `confirmed_by` werden gesetzt (D-15).

**Error-Handling-Pattern** (konsistent durch alle Handler):
```go
// Interne Fehler:
internalError(c, "interner serverfehler")
// Not Found:
notFound(c, "contribution nicht gefunden")
// Bad Request:
badRequest(c, "ungültige contribution-id")
// Conflict (ErrConflict vom Repo):
c.JSON(http.StatusConflict, gin.H{"error": gin.H{
    "message": "für diese Kombination aus Gruppe, Anime und Member existiert bereits ein Beitrag",
}})
```

---

### `backend/internal/handlers/contribution_review_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/fansub_anime_contributions_handler.go`

**Imports-Pattern** (Zeilen 1–14):
```go
package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```

**Handler-Struct mit permissionSvc + auditLogRepo** (Zeilen 17–37):
```go
type FansubAnimeContributionsHandler struct {
	contributionsRepo *repository.AnimeContributionsRepository
	rolesRepo         *repository.HistGroupMemberRolesRepository
	permissionSvc     *permissions.Service
	auditLogRepo      *repository.AuditLogRepository
}
```

**Leader/Admin-Autorisierungs-Pattern** (Zeilen 140–149, CreateAnimeContribution):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
	permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil {
	writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
	return
}
if !result.Allowed {
	auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.review.denied",
		&fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
	writePermissionDenied(c, result)
	return
}
```

**Rollen-Validierungs-Pattern** (Zeilen 193–208):
```go
for _, code := range req.RoleCodes {
	valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
	if err != nil {
		log.Printf("role validation error (code=%s): %v", code, err)
		internalError(c, "interner serverfehler")
		return
	}
	if !valid {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code),
		}})
		return
	}
}
```
> Zusätzlich für P65-SC1: `len(req.RoleCodes) == 0` prüfen → 422 mit „Bitte wähle mindestens eine Rolle aus." (D-04).

**Audit-Log-Pattern nach Review-Aktion** (Zeilen 244–255, CreateAnimeContribution):
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
	ActorAppUserID: &identity.AppUserID,
	EventType:      "anime_contribution.confirmed",
	ScopeType:      permissions.ScopeTypeGroup,
	ScopeID:        &fansubID,
	TargetType:     "anime_contribution",
	TargetID:       &item.ID,
	Action:         string(permissions.ActionFansubGroupMembersManage),
	Outcome:        "allowed",
	Payload:        map[string]any{"status": "confirmed"},
})
```

**ErrConflict / ErrNotFound-Mapping** (Zeilen 222–243):
```go
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message": "für diese Kombination aus Gruppe, Anime und Member existiert bereits ein Beitrag",
	}})
	return
}
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{
		"message": "fansubgruppe, anime oder mitglied nicht gefunden",
	}})
	return
}
```

---

### `backend/internal/repository/anime_contributions_proposal_repository.go` (repository, CRUD)

**Analog:** `backend/internal/repository/anime_contributions_member_repository.go` (Auslagerungsvorbild)

**Datei-Header-Pattern** (Zeilen 1–7):
```go
package repository

import (
	"context"
	"fmt"
	"time"
)

// Ausgelagert aus anime_contributions_repository.go für das 450-Zeilen-Limit.
// Methoden auf AnimeContributionsRepository für Proposal-/Review-Operationen.
```

**ListByMemberID-Muster als Vorlage für CreateProposal** (Zeilen 10–38, anime_contributions_member_repository.go):
```go
func (r *AnimeContributionsRepository) ListByMemberID(ctx context.Context, memberID int64) ([]AnimeContributionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+animeContributionSelectCols+`
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE hfgm.member_id = $1
		GROUP BY ac.id
		ORDER BY ac.created_at DESC
		LIMIT 50
	`, memberID)
	// ... rows.Close(), scan-Loop, rows.Err()
}
```

**Create-Transaktion-Pattern** als Vorlage für `CreateProposal` (Zeilen 286–356, anime_contributions_repository.go):
```go
func (r *AnimeContributionsRepository) Create(ctx context.Context, fansubGroupID int64, animeID int64, input AnimeContributionInput) (*AnimeContributionRow, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, fmt.Errorf("create anime contribution: begin tx: %w", err) }
	defer tx.Rollback(ctx)

	var newID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO anime_contributions (
			fansub_group_id, anime_id, fansub_group_member_id, status,
			note, started_year, ended_year,
			is_public_on_anime_page, is_public_on_member_profile,
			created_by, updated_by, created_at, updated_at
		) VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9, $9, NOW(), NOW())
		RETURNING id
	`, ...).Scan(&newID)
	if err != nil {
		if isForeignKeyViolation(err) { return nil, ErrNotFound }
		if isUniqueViolation(err) { return nil, ErrConflict }  // uq_anime_contribution_member
		return nil, fmt.Errorf("create anime contribution: insert: %w", err)
	}
	// INSERT anime_contribution_roles in der gleichen TX ...
	if err := tx.Commit(ctx); err != nil { return nil, fmt.Errorf("...commit: %w", err) }
	return r.GetByID(ctx, newID)
}
```
> Für `CreateProposal`: `status='proposed'`, `created_by=appUserID`, `is_public_on_anime_page=false`, `is_public_on_member_profile=false`.

**addArg-Builder-Pattern für Update** als Vorlage für `Confirm`/`Reject`/`SelfPublish` (Zeilen 359–415, anime_contributions_repository.go):
```go
func (r *AnimeContributionsRepository) Update(ctx context.Context, id int64, input AnimeContributionPatchInput) (*AnimeContributionRow, error) {
	setClauses := make([]string, 0)
	args := make([]any, 0)
	argIdx := 1

	addArg := func(val any) int {
		args = append(args, val)
		idx := argIdx
		argIdx++
		return idx
	}

	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", addArg(*input.Status)))
	}
	// ... weitere Felder analog ...
	setClauses = append(setClauses, "updated_at = NOW()")

	query := fmt.Sprintf("UPDATE anime_contributions SET %s WHERE id = $%d",
		strings.Join(setClauses, ", "), addArg(id))
	tag, err := tx.Exec(ctx, query, args...)
	if tag.RowsAffected() == 0 { return nil, ErrNotFound }
}
```

**can_self_publish-Feld (On-Read-Berechnung, D-12)** — neu in `ListProposedByMember`:
```sql
-- Neu im Proposal-Repository, analog ListByMemberID:
SELECT ...,
  (ac.status = 'proposed' AND ac.created_at + INTERVAL '90 days' < NOW()) AS can_self_publish
FROM anime_contributions ac
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
WHERE hfgm.member_id = $1
```

---

### `database/migrations/0089_anime_contributions_review_note.up.sql` (migration)

**Analog:** `database/migrations/0088_anime_contributions_constraints.up.sql` (append-only ALTER TABLE)

**Migration-Pattern:**
```sql
-- 0089_anime_contributions_review_note.up.sql
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS review_note TEXT NULL;
```

**Down-Migration-Pattern:**
```sql
-- 0089_anime_contributions_review_note.down.sql
ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS review_note;
```

---

### `frontend/src/components/contributions/ProposalForm.tsx` (component, request-response)

**Analog:** `frontend/src/components/contributions/MyContributionsSection.tsx` + UI-Kit-Nutzung aus `admin/my-groups/[id]/page.tsx`

**Imports-Pattern** (aus `MyContributionsSection.tsx`, Zeilen 1–8):
```typescript
'use client'

import { useState } from 'react'

import { Button, FormField, Input, Textarea, Select, Modal, Badge, ErrorState } from '@/components/ui'
import { createContributionProposal } from '@/lib/api'
import type { ProposalFormData } from '@/types/contributions'
```

**State-Management-Pattern für Formular** (analog Zeilen 19–22):
```typescript
export function ProposalForm({ onSuccess, onClose }: ProposalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  // ...
}
```

**Error-Banner-Pattern** (Zeilen 60–73, MyContributionsSection.tsx):
```typescript
{error && (
  <div
    role="alert"
    style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 6, padding: '10px 16px' }}
  >
    {error}
  </div>
)}
```
> Für ProposalForm: `role="alert"` beibehalten (RESEARCH Accessibility-Anforderung). Duplikat-Fehler (409) und Validierungsfehler (0 Rollen) als separate `error`-States modellieren.

**Submit-Handler-Pattern mit try/catch** (Zeilen 26–38, MyContributionsSection.tsx):
```typescript
async function handleConfirm(id: number) {
  setActionError(null)
  try {
    await confirmAnimeContribution(id)
    // Optimistisches State-Update ...
  } catch (err) {
    setActionError(readErrorMessage(err, 'Bestätigen fehlgeschlagen. Bitte versuche es erneut.'))
  }
}
```

**readErrorMessage-Hilfsfunktion** (Zeilen 14–17, MyContributionsSection.tsx):
```typescript
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}
```

---

### `frontend/src/components/contributions/MyProposalsSection.tsx` (component, request-response)

**Analog:** `frontend/src/components/contributions/MyContributionsSection.tsx` — direkte Erweiterung

**Struktur-Pattern** (Status-Gruppierung, Zeilen 58–128):
```typescript
// MyContributionsSection nutzt two sections (confirmed, pending).
// MyProposalsSection nutzt THREE sections: proposed ("In Prüfung"), confirmed ("Bestätigt"), disputed ("Abgelehnt").
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
    {/* Section: In Prüfung */}
    <section>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
        In Prüfung ({proposed.length})
      </h2>
      {proposed.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Keine ausstehenden Vorschläge.</p>
      ) : (
        proposed.map((c) => <ContributionCard key={c.id} contribution={c} mode="proposal" />)
      )}
    </section>
    {/* Section: Bestätigt, Abgelehnt analog */}
  </div>
)
```
> `ContributionCard` erhält neuen `mode="proposal"` (UI-SPEC). Status-Filter:
> - `proposed.filter((c) => c.status === 'proposed')`
> - `confirmed.filter((c) => c.status === 'confirmed')`
> - `disputed.filter((c) => c.status === 'disputed')`

**„+ Beitrag vorschlagen"-Button** als primärer CTA mit `buttonPrimary`-Variante (aus UI-SPEC):
```typescript
<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
  + Beitrag vorschlagen
</Button>
```

**Self-Publish-Trigger** (only wenn `c.can_self_publish === true`, inline two-step ohne Modal):
```typescript
{c.can_self_publish && !selfPublishConfirming && (
  <Button variant="secondary" size="sm" onClick={() => setSelfPublishConfirming(c.id)}>
    Historisch öffentlich schalten
  </Button>
)}
{selfPublishConfirming === c.id && (
  <>
    <p>Dieser Eintrag wird als unverifizierten historischen Beitrag öffentlich sichtbar.</p>
    <Button variant="secondary" size="sm" onClick={() => handleSelfPublish(c.id)}>
      Jetzt öffentlich schalten
    </Button>
    <button onClick={() => setSelfPublishConfirming(null)}>Abbrechen</button>
  </>
)}
```

---

### `frontend/src/components/contributions/ReviewQueue.tsx` (component, request-response)

**Analog:** `frontend/src/app/admin/my-groups/[id]/page.tsx` — Card/SectionHeader/EmptyState-Nutzung

**Imports-Pattern** (aus `admin/my-groups/[id]/page.tsx`, Zeilen 1–31):
```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader,
} from "@/components/ui";
import { ApiError, listGroupProposals, confirmProposal, rejectProposal } from "@/lib/api";
import type { GroupProposalRow } from "@/types/contributions";
```

**Daten-Lade-Pattern mit useCallback + useEffect** (Zeilen 75–113):
```typescript
const loadDetail = useCallback(async () => {
  if (!isClientInitialized) return;
  if (!hasAccessToken) {
    setError("Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.");
    setIsLoading(false);
    return;
  }
  try {
    setIsLoading(true);
    setError(null);
    const response = await getMyFansubGroupDetail(groupId);
    setDetail(response.data);
  } catch (loadError) {
    setError(readErrorMessage(loadError, "Gruppendetail konnte nicht geladen werden."));
  } finally {
    setIsLoading(false);
  }
}, [groupId, hasAccessToken, isClientInitialized]);

useEffect(() => { void loadDetail(); }, [loadDetail]);
```

**EmptyState-Pattern** (Zeilen 234–239):
```typescript
<EmptyState
  title="Keine historischen Credits für diese Gruppe"
  description="..."
/>
```
> Für ReviewQueue: `title="Keine offenen Vorschläge"` / `description="Für diese Gruppe wurden noch keine Vorschläge eingereicht."`

**Card/SectionHeader-Pattern** (Zeilen 229–268):
```typescript
<Card variant="section">
  <SectionHeader
    eyebrow="Offene Vorschläge"
    title={`Offene Vorschläge (${proposals.length})`}
  />
  {proposals.length === 0 ? (
    <EmptyState ... />
  ) : (
    proposals.map((p) => (
      <Card key={p.id} variant="nested">
        {/* Member, Anime, Rollen-Chips, Notiz, Datum */}
        {/* Footer: Bestätigen + Ablehnen-Buttons */}
      </Card>
    ))
  )}
</Card>
```

**Optimistisches Entfernen nach Confirm/Reject** (analog Zeilen 41–50, MyContributionsSection.tsx):
```typescript
async function handleConfirm(proposalId: number) {
  try {
    await confirmProposal(fansubId, proposalId)
    setProposals((prev) => prev.filter((p) => p.id !== proposalId))
  } catch (err) {
    setActionError(readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte versuche es erneut.'))
  }
}
```

---

### `frontend/src/app/admin/my-groups/[id]/page.tsx` (ERWEITERN, 421 Zeilen)

**Analog:** sich selbst — `ReviewQueue` als neue Komponente einbinden, Datei NICHT über 450 Zeilen wachsen lassen.

**Einbindungs-Pattern** (analog zur `Card variant="section"`-Struktur, Zeilen 229–269):
```typescript
// Unterhalb der bestehenden "Historische Credits"-Card einfügen:
<Card variant="section">
  <ReviewQueue fansubId={groupId} />
</Card>
```

> Die `ReviewQueue`-Komponente kapselt den eigenen State (laden, Proposals, Fehler). Die Host-Seite übergibt nur `fansubId`.

---

### `frontend/src/lib/api.ts` (ERWEITERN)

**Analog:** `confirmAnimeContribution` / `rejectAnimeContribution` (Zeilen 6910–6960)

**POST-ohne-Body-Pattern** (Zeilen 6910–6934):
```typescript
export async function confirmAnimeContribution(contributionId: number): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/confirm`,
    { method: "POST" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
}
```

**POST-mit-Body-Pattern** (Zeilen 6791–6823, `upsertAnimeContribution`):
```typescript
export async function upsertAnimeContribution(
  fansubId: number, animeId: number, body: UpsertAnimeContributionRequest, authToken?: string
): Promise<AnimeContributionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions`,
    { method: "POST", authToken, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AnimeContributionResponse>;
}
```

**Neue Calls zu ergänzen** (alle analog zu den Vorlagen oben):
- `createContributionProposal(body: ProposalFormData): Promise<void>` — POST `/api/v1/me/contribution-proposals`
- `selfPublishContribution(contributionId: number): Promise<void>` — POST `/api/v1/me/anime-contributions/:cid/self-publish`
- `listGroupProposals(fansubId: number): Promise<GroupProposalsResponse>` — GET `/api/v1/admin/fansubs/:id/contribution-proposals`
- `confirmProposal(fansubId: number, cid: number): Promise<void>` — POST `.../confirm`
- `rejectProposal(fansubId: number, cid: number, note?: string): Promise<void>` — POST `.../reject`

---

### `frontend/src/types/contributions.ts` (ERWEITERN)

**Analog:** bestehende `MeAnimeContribution` (Zeilen 50–62)

**Bestehende Basis-Type** (Zeilen 50–62):
```typescript
export interface MeAnimeContribution {
  id: number
  anime_id: number
  fansub_group_id: number
  fansub_group_member_id: number
  status: 'confirmed' | 'proposed' | 'draft' | 'disputed' | 'hidden'
  role_codes: string[]
  started_year: number | null
  ended_year: number | null
  is_public_on_anime_page: boolean
  is_public_on_member_profile: boolean
  note: string | null
}
```

**Neue Felder auf `MeAnimeContribution`:**
```typescript
// Ergänzungen für Phase 65:
review_note?: string | null        // D-08: Ablehngrund, sichtbar bei status='disputed'
can_self_publish?: boolean         // D-12: On-Read 90-Tage-Berechnung vom Backend
```

**Neue Types:**
```typescript
export interface ProposalFormData {
  fansub_group_id: number
  anime_id: number
  role_codes: string[]          // min. 1, D-04
  note?: string | null          // prominent optionales Notizfeld, D-02
  started_year?: number | null
  ended_year?: number | null
}

export interface GroupProposalRow {
  id: number
  fansub_group_member_id: number
  member_display_name: string
  anime_id: number
  anime_title: string
  role_codes: string[]
  note: string | null
  created_at: string
}

export interface GroupProposalsResponse {
  data: GroupProposalRow[]
}
```

---

## Shared Patterns

### Authentifizierung / Me-Identity
**Quelle:** `backend/internal/handlers/contributions_me_handler.go`, Zeilen 67–74
**Anwenden auf:** `contribution_proposals_me_handler.go` (alle Endpunkte)
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

### Leader/Admin-Autorisierung
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go`, Zeilen 140–149
**Anwenden auf:** `contribution_review_handler.go` (list, confirm, reject)
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
	permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed { auditPermissionDenied(...); writePermissionDenied(c, result); return }
```

### Audit-Logging
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go`, Zeilen 244–255
**Anwenden auf:** `contribution_review_handler.go` (confirm, reject), `contribution_proposals_me_handler.go` (create, self-publish)
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
	ActorAppUserID: &identity.AppUserID,
	EventType:      "anime_contribution.<action>",
	ScopeType:      permissions.ScopeTypeGroup,
	ScopeID:        &fansubID,
	TargetType:     "anime_contribution",
	TargetID:       &contributionID,
	Action:         string(permissions.ActionFansubGroupMembersManage),
	Outcome:        "allowed",
	Payload:        map[string]any{"status": targetStatus},
})
```

### ErrConflict → 409 (Duplikat-Block)
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go`, Zeilen 222–230
**Anwenden auf:** `contribution_proposals_me_handler.go` (POST create-proposal)
```go
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message": "für diese Kombination aus Gruppe, Anime und deiner Identität existiert bereits ein Beitrag",
	}})
	return
}
```

### Deutsche Fehlermeldungen mit korrekten Umlauten
**Quelle:** alle Handler, CLAUDE.md Konvention
**Anwenden auf:** alle neuen Handler und Repositories (Go-Response-Strings) + alle neuen Komponenten (JSX-Text, aria-labels, Platzhalter)
```go
// Go: Fehlermeldungen in allen JSON-Responses auf Deutsch, korrekte Umlaute
c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
// NICHT: "keine Berechtigung" = korrekt; "keine Berechtigung" mit ae = FALSCH
```
```typescript
// TypeScript: Fehlertexte, Button-Labels, Platzhalter mit korrekten Umlauten
placeholder="Gruppe auswählen"   // korrekt (ä)
// NICHT: "Gruppe auswaehlen"     // verboten
```

### Handler-Test-Pattern (httptest + Stubs)
**Quelle:** `backend/internal/handlers/admin_content_anime_relations_test.go`, Zeilen 1–52
**Anwenden auf:** `contribution_proposals_me_test.go`, `contribution_review_test.go`
```go
func TestCreateContributionProposal_RequiresRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ContributionProposalsMeHandler{
		proposalRepo: &proposalRepoStub{},
		// Stubs statt echter DB — erfordert Interface-Design des neuen Handlers
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/contribution-proposals",
		strings.NewReader(`{"fansub_group_id":1,"anime_id":2,"role_codes":[]}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 42, DisplayName: "Testuser"})

	handler.CreateProposal(c)

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", recorder.Code)
	}
}
```

### Routen-Registrierung in main.go
**Quelle:** `backend/cmd/server/main.go`, Zeilen 345–386
**Anwenden auf:** Neue Endpunkte nach dem bestehenden `contributionsMeHandler`-Block registrieren
```go
// Bestehend (Zeilen 380–385):
v1.GET("/me/anime-contributions", authMiddleware, contributionsMeHandler.ListMyAnimeContributions)
// ... weitere Me-Routen ...

// Neu (nach Zeile 385 einfügen):
proposalsMeHandler := handlers.NewContributionProposalsMeHandler(animeContributionsRepo, dbPool)
v1.POST("/me/contribution-proposals", authMiddleware, proposalsMeHandler.CreateProposal)
v1.POST("/me/anime-contributions/:contributionId/self-publish", authMiddleware, proposalsMeHandler.SelfPublish)

reviewHandler := handlers.NewContributionReviewHandler(animeContributionsRepo, permissionSvc, auditLogRepo)
// Diese Routen in registerAdminRoutes() eintragen (analog zu animeContributionsHandler):
// GET  /admin/fansubs/:id/contribution-proposals
// POST /admin/fansubs/:id/contribution-proposals/:cid/confirm
// POST /admin/fansubs/:id/contribution-proposals/:cid/reject
```

### Frontend-API-Call-Konvention
**Quelle:** `frontend/src/lib/api.ts`, Zeilen 6855–6960
**Anwenden auf:** alle 5 neuen API-Calls in `api.ts`
```typescript
// Muster: authorizedFetch + parseApiErrorPayload + ApiError
const API_BASE_URL = getApiBaseUrl();
const response = await authorizedFetch(`${API_BASE_URL}/api/v1/...`, { method: "POST", ... });
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
}
```

---

## Keine Analoge gefunden

Alle Dateien dieser Phase haben ausreichende Analoge im bestehenden Codebase. Es sind keine Dateien ohne Pendant vorhanden.

---

## Kritische Hinweise für den Planer

1. **450-Zeilen-Limit:** `anime_contributions_repository.go` hat 447 Zeilen und `fansub_anime_contributions_handler.go` 424 Zeilen. Neuer Code DARF NICHT in diese Dateien. Neue Proposal-/Review-Methoden in `anime_contributions_proposal_repository.go` und `contribution_proposals_me_handler.go` / `contribution_review_handler.go`.

2. **Testbarkeits-Voraussetzung (Pitfall 4):** Der bestehende `ContributionsMeHandler.resolveVerifiedMemberID` nutzt `*pgxpool.Pool` direkt. Neue Handler MÜSSEN stattdessen gegen Repository-Interfaces arbeiten, damit Stub-Tests (analog `admin_content_anime_relations_test.go`) möglich sind.

3. **D-15 — Selbstschaltung bleibt `proposed`:** Status bei SelfPublish NIEMALS auf `confirmed` setzen. `is_verified` wird in der Public-Query als `(status = 'confirmed')` berechnet — ein `confirmed`-Status würde den Eintrag fälschlich als verifiziert anzeigen.

4. **D-06 — Review-Queue-Ort:** `manage/groups/[id]` existiert NICHT als eigene Datei, nur als Re-Export. Die Review-Queue muss in `admin/my-groups/[id]/page.tsx` eingebunden werden.

5. **D-19 — Umlaute:** Alle deutschen Strings (JSX-Text, aria-labels, Platzhalter, Go-Response-Strings) mit korrekten Umlauten (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen (ae, oe, ue) sind verboten.

---

## Metadaten

**Suchbereich:** `backend/internal/handlers/`, `backend/internal/repository/`, `backend/cmd/server/`, `frontend/src/components/contributions/`, `frontend/src/app/admin/my-groups/`, `frontend/src/lib/api.ts`, `frontend/src/types/contributions.ts`
**Gelesene Dateien:** 12 (contributions_me_handler.go, fansub_anime_contributions_handler.go, anime_contributions_repository.go, anime_contributions_member_repository.go, admin_content_anime_relations_test.go, MyContributionsSection.tsx, ContributionCard.tsx, admin/my-groups/[id]/page.tsx, api.ts [2 Bereiche], types/contributions.ts, main.go [Zeilen 329–397])
**Pattern-Extraction-Datum:** 2026-06-02
