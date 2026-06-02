# Phase 68: Badge-Engine und Archiv-Entdeckung — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 14 (new/modified)
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/services/badge_service.go` | service | event-driven | self (extend) | exact |
| `backend/internal/repository/badge_repository.go` | repository | CRUD | self (extend) | exact |
| `backend/internal/services/badge_backfill_service.go` | service | batch | `backend/internal/services/anime_metadata_backfill.go` | exact |
| `backend/cmd/migrate/main.go` | CLI | batch | self (extend) | exact |
| `backend/internal/handlers/fansub_anime_contributions_handler.go` | handler | request-response | self (extend, add badge trigger) | exact |
| `backend/internal/handlers/fansub_group_history_handler.go` | handler | request-response | self (extend, add DeleteGroupHistory) | exact |
| `backend/internal/handlers/member_archive_handler.go` | handler | request-response | `backend/internal/handlers/member_badges_handler.go` | role-match |
| `backend/internal/repository/member_archive_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_public_repository.go` | exact |
| `backend/cmd/server/main.go` | config/wiring | request-response | self (extend) | exact |
| `database/migrations/0092_archive_search_indexes.up.sql` | migration | — | `database/migrations/0086_anime_contributions.up.sql` | role-match |
| `frontend/src/app/archiv/page.tsx` | page (Server Component) | request-response | `frontend/src/app/anime/page.tsx` | exact |
| `frontend/src/components/archive/MemberSearchCard.tsx` | component | request-response | `frontend/src/components/profile/VerifiedBadge.tsx` + members page inline | role-match |
| `frontend/src/components/groups/GroupHistorySection.tsx` | component | CRUD | `frontend/src/app/admin/my-groups/[id]/page.tsx` | role-match |
| `frontend/src/components/profile/MemberBadgeChips.tsx` | component | event-driven | self (extend BADGE_LABELS) | exact |
| `frontend/src/lib/api.ts` | utility | request-response | self (extend) | exact |

---

## Pattern Assignments

### `backend/internal/services/badge_service.go` (service, event-driven — EXTEND)

**Analog:** self — read fully above (131 lines, all shown)

**Imports pattern** (lines 1–12):
```go
package services

import (
    "context"
    "errors"
    "log"

    "team4s.v3/backend/internal/repository"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Struct + constructor** (lines 15–26):
```go
type BadgeService struct {
    db   *pgxpool.Pool
    repo *repository.BadgeRepository
}

func NewBadgeService(db *pgxpool.Pool, repo *repository.BadgeRepository) *BadgeService {
    return &BadgeService{db: db, repo: repo}
}
```

**Core compute pattern** (lines 58–78) — copy exactly for new badges:
```go
func (s *BadgeService) computeFoundingMember(ctx context.Context, memberID int64) {
    var rowID int64
    err := s.db.QueryRow(ctx, `
        SELECT fgm.id
        FROM hist_fansub_group_members fgm
        ...
        WHERE fgm.member_id = $1
        LIMIT 1
    `, memberID).Scan(&rowID)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return   // badge condition not met → call RevokeMemberBadge here for new badges
        }
        log.Printf("badge_service: founding_member query error (member_id=%d): %v", memberID, err)
        return
    }
    if err := s.repo.UpsertMemberBadge(ctx, memberID, "founding_member",
        "historical_achievement", "hist_fansub_group_member", rowID); err != nil {
        log.Printf("badge_service: upsert founding_member error (member_id=%d): %v", memberID, err)
    }
}
```

**Entry point** (lines 31–55):
```go
func (s *BadgeService) ComputeAndStoreBadges(ctx context.Context, memberID int64) error {
    s.computeFoundingMember(ctx, memberID)
    s.computeHistoricalLeader(ctx, memberID)
    s.computeLongTermMember(ctx, memberID)
    // Phase 68: + s.computeFirstContribution, computeProductiveTiers, computeVerified, computeAllRounder
    return nil
}

func (s *BadgeService) ComputeAndStoreBadgesByMembership(ctx context.Context, histMembershipID int64) error {
    var memberID int64
    err := s.db.QueryRow(ctx, `
        SELECT member_id FROM hist_fansub_group_members WHERE id = $1
    `, histMembershipID).Scan(&memberID)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) { return nil }
        log.Printf("badge_service: resolve member_id by membership error (membership_id=%d): %v", histMembershipID, err)
        return nil
    }
    return s.ComputeAndStoreBadges(ctx, memberID)
}
```

**Key addition for Phase 68:** New badges call `s.repo.RevokeMemberBadge(ctx, memberID, badgeCode)` in the `ErrNoRows` branch (not just `return`). Existing badges do not revoke — backwards compatibility preserved.

---

### `backend/internal/repository/badge_repository.go` (repository, CRUD — EXTEND)

**Analog:** self — read fully above (135 lines)

**UpsertMemberBadge pattern** (lines 53–74):
```go
func (r *BadgeRepository) UpsertMemberBadge(
    ctx context.Context,
    memberID int64,
    badgeCode string,
    badgeCategory string,
    derivedFromType string,
    derivedFromID int64,
) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO member_badges
            (member_id, badge_code, badge_category, derived_from_type, derived_from_id, status, visibility, awarded_at)
        VALUES ($1, $2, $3, $4, $5, 'active', 'public', NOW())
        ON CONFLICT (member_id, badge_code)
        DO UPDATE SET
            status            = 'active',
            awarded_at        = NOW(),
            derived_from_type = EXCLUDED.derived_from_type,
            derived_from_id   = EXCLUDED.derived_from_id
    `, memberID, badgeCode, badgeCategory, derivedFromType, derivedFromID)
    return err
}
```

**New method to add — `RevokeMemberBadge`** (pattern from RESEARCH.md):
```go
func (r *BadgeRepository) RevokeMemberBadge(ctx context.Context, memberID int64, badgeCode string) error {
    _, err := r.db.Exec(ctx, `
        UPDATE member_badges
        SET status = 'revoked'
        WHERE member_id = $1
          AND badge_code = $2
          AND status = 'active'
    `, memberID, badgeCode)
    return err
}
```

Critical: `visibility` is never touched in either Upsert (ON CONFLICT) or Revoke — D-07 compliance is already baked into the existing Upsert; Revoke must not add a `visibility` SET clause.

---

### `backend/internal/services/badge_backfill_service.go` (service, batch — NEW)

**Analog:** `backend/internal/services/anime_metadata_backfill.go` (lines 1–60 read above)

**Imports pattern:**
```go
package services

import (
    "context"
    "log"

    "team4s.v3/backend/internal/repository"

    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Struct + Report pattern** (copy from `AnimeMetadataBackfillService`):
```go
type BadgeBackfillReport struct {
    MembersProcessed int
    Errors           []string
}

type BadgeBackfillService struct {
    db           *pgxpool.Pool
    badgeService *BadgeService
}

func NewBadgeBackfillService(db *pgxpool.Pool, badgeService *BadgeService) *BadgeBackfillService {
    return &BadgeBackfillService{db: db, badgeService: badgeService}
}
```

**Backfill method** — iterate all member IDs, call `ComputeAndStoreBadges`, log errors:
```go
func (s *BadgeBackfillService) BackfillAll(ctx context.Context) (*BadgeBackfillReport, error) {
    rows, err := s.db.Query(ctx, `SELECT id FROM members ORDER BY id`)
    if err != nil {
        return nil, fmt.Errorf("backfill badges: list members: %w", err)
    }
    defer rows.Close()

    report := &BadgeBackfillReport{}
    for rows.Next() {
        var memberID int64
        if err := rows.Scan(&memberID); err != nil {
            report.Errors = append(report.Errors, fmt.Sprintf("scan member_id: %v", err))
            continue
        }
        if err := s.badgeService.ComputeAndStoreBadges(ctx, memberID); err != nil {
            report.Errors = append(report.Errors, fmt.Sprintf("member_id=%d: %v", memberID, err))
        }
        report.MembersProcessed++
    }
    if err := rows.Err(); err != nil {
        return report, fmt.Errorf("backfill badges: iterate: %w", err)
    }
    return report, nil
}
```

---

### `backend/cmd/migrate/main.go` (CLI, batch — EXTEND)

**Analog:** self — read fully above (186 lines)

**Switch extension** (line 32–36, add case before `default`):
```go
case "backfill-badges":
    runBackfillBadges(os.Args[2:])
```

**Usage extension** (line 183):
```
fmt.Fprintf(os.Stderr, "  migrate backfill-badges [-database-url url]\n")
```

**New function — copy `runBackfillPhaseAMetadata` pattern** (lines 108–151):
```go
func runBackfillBadges(args []string) {
    fs := flag.NewFlagSet("backfill-badges", flag.ExitOnError)
    databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
    _ = fs.Parse(args)

    cfg := config.Load()
    if *databaseURL == "" {
        *databaseURL = cfg.DatabaseURL
    }
    if *databaseURL == "" {
        log.Fatal("DATABASE_URL is required. Set env var or pass -database-url.")
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()

    dbPool, err := database.NewPool(ctx, *databaseURL)
    if err != nil {
        log.Fatalf("database init failed: %v", err)
    }
    defer dbPool.Close()

    badgeRepo := repository.NewBadgeRepository(dbPool)
    badgeSvc := services.NewBadgeService(dbPool, badgeRepo)
    backfillSvc := services.NewBadgeBackfillService(dbPool, badgeSvc)

    report, err := backfillSvc.BackfillAll(ctx)
    if err != nil {
        log.Fatalf("badge backfill failed: %v", err)
    }

    log.Printf("badge backfill complete: members_processed=%d errors=%d",
        report.MembersProcessed, len(report.Errors))
    for _, e := range report.Errors {
        log.Printf("badge backfill warning: %s", e)
    }
}
```

---

### `backend/internal/handlers/fansub_anime_contributions_handler.go` (handler, request-response — EXTEND)

**Analog:** self — read fully above (428 lines)

**Struct extension** — add `badgeService` field:
```go
type FansubAnimeContributionsHandler struct {
    contributionsRepo *repository.AnimeContributionsRepository
    rolesRepo         *repository.HistGroupMemberRolesRepository
    permissionSvc     *permissions.Service
    auditLogRepo      *repository.AuditLogRepository
    badgeService      *services.BadgeService  // Phase 68: Badge-Recompute
}
```

**Constructor extension:**
```go
func NewFansubAnimeContributionsHandler(
    contributionsRepo *repository.AnimeContributionsRepository,
    rolesRepo *repository.HistGroupMemberRolesRepository,
    permissionSvc *permissions.Service,
    auditLogRepo *repository.AuditLogRepository,
) *FansubAnimeContributionsHandler { ... }

// WithBadgeService ergänzt den Badge-Recompute-Trigger (Phase 68).
func (h *FansubAnimeContributionsHandler) WithBadgeService(svc *services.BadgeService) *FansubAnimeContributionsHandler {
    h.badgeService = svc
    return h
}
```

**Recompute-Trigger nach Create/Update** (add after the audit log Write in `CreateAnimeContribution` and `UpdateAnimeContribution`):
```go
// Badge-Recompute: nicht kritischer Pfad — Fehler werden geloggt.
if h.badgeService != nil {
    _ = h.badgeService.ComputeAndStoreBadgesByMembership(
        c.Request.Context(), item.FansubGroupMemberID)
}
```

**Recompute-Trigger für Delete** — member_id BEFORE delete (Pitfall 2 from RESEARCH.md):
```go
// member_id VOR dem Delete sichern (Contribution ist danach weg).
var memberIDForBadge int64
if h.badgeService != nil {
    if mid, err := h.contributionsRepo.GetMemberIDForContribution(
        c.Request.Context(), contributionID); err == nil {
        memberIDForBadge = mid
    }
}

if err := h.contributionsRepo.Delete(c.Request.Context(), contributionID); ... { }

// Recompute nach Delete:
if memberIDForBadge > 0 && h.badgeService != nil {
    _ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), memberIDForBadge)
}
```

**Existing Delete pattern** (lines 366–427) — permission check, audit, `c.Status(http.StatusNoContent)`.

---

### `backend/internal/handlers/fansub_group_history_handler.go` (handler, request-response — EXTEND)

**Analog:** self — read fully above (196 lines)

**Missing DeleteGroupHistory — copy from `UpdateGroupHistory` pattern** (lines 133–195):
```go
// DeleteGroupHistory löscht einen Historieneintrag.
// DELETE /admin/fansubs/:id/history/:historyId
func (h *FansubGroupHistoryHandler) DeleteGroupHistory(c *gin.Context) {
    fansubID, err := parseFansubID(c.Param("id"))
    if err != nil {
        badRequest(c, "ungültige fansub id")
        return
    }

    historyID, err := strconv.ParseInt(c.Param("historyId"), 10, 64)
    if err != nil || historyID <= 0 {
        badRequest(c, "ungültige history id")
        return
    }

    if err := h.historyRepo.Delete(c.Request.Context(), historyID); err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
            return
        }
        log.Printf("group history delete: repo error (fansub_id=%d, history_id=%d): %v", fansubID, historyID, err)
        internalError(c, "interner serverfehler")
        return
    }

    c.Status(http.StatusNoContent)
}
```

**Route wiring** (in `admin_routes.go`, after line 162):
```go
v1.DELETE("/admin/fansubs/:id/history/:historyId", auth, deps.groupHistoryHandler.DeleteGroupHistory)
```

**Leader-status override:** In `CreateGroupHistory` (line 95), `normalizeHistoricalContributionStatus` defaults to `"historical"`. For Leader-CRUD, override: accept the request status field but if no status sent, default to `"confirmed"` (D-11). Pattern: check `req.Status == ""` and set `"confirmed"` directly instead of calling `normalizeHistoricalContributionStatus`.

**Permission check pattern** — copy from `FansubAnimeContributionsHandler` (lines 110–119):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
    permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    writePermissionDenied(c, result)
    return
}
```

Note: `FansubGroupHistoryHandler` currently has no `permissionSvc` field — it must be added along with `permissionActorFromContext` call pattern (used in contributions handler line 52).

---

### `backend/internal/handlers/member_archive_handler.go` (handler, request-response — NEW)

**Analog:** `backend/internal/handlers/member_badges_handler.go` (141 lines, read above)

**Imports pattern:**
```go
package handlers

import (
    "log"
    "net/http"
    "strconv"

    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)
```

**Struct + constructor:**
```go
type MemberArchiveHandler struct {
    archiveRepo *repository.MemberArchiveRepository
}

func NewMemberArchiveHandler(repo *repository.MemberArchiveRepository) *MemberArchiveHandler {
    return &MemberArchiveHandler{archiveRepo: repo}
}
```

**Query-param extraction + handler pattern** (no auth — public route):
```go
// SearchArchive handles GET /api/v1/archiv
// Gibt öffentliche Member-Profile paginiert zurück. Kein Auth-Gate.
func (h *MemberArchiveHandler) SearchArchive(c *gin.Context) {
    roleCode := c.Query("rolle")
    gruppe := c.Query("gruppe")
    vonStr := c.Query("von")
    bisStr := c.Query("bis")
    pageStr := c.DefaultQuery("page", "1")

    page, err := strconv.Atoi(pageStr)
    if err != nil || page < 1 {
        page = 1
    }

    var fansubGroupID int64
    if gruppe != "" {
        fansubGroupID, _ = strconv.ParseInt(gruppe, 10, 64)
    }
    var yearFrom, yearUntil int
    if vonStr != "" { yearFrom, _ = strconv.Atoi(vonStr) }
    if bisStr != "" { yearUntil, _ = strconv.Atoi(bisStr) }

    filters := repository.ArchiveSearchFilters{
        RoleCode:      roleCode,
        FansubGroupID: fansubGroupID,
        YearFrom:      yearFrom,
        YearUntil:     yearUntil,
    }

    result, err := h.archiveRepo.SearchMembers(c.Request.Context(), filters, page)
    if err != nil {
        log.Printf("archive search: repo error: %v", err)
        internalError(c, "interner serverfehler")
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data":  result.Members,
        "total": result.Total,
        "page":  page,
    })
}
```

**Error handling pattern:** `internalError(c, "interner serverfehler")` — shared helper used throughout all handlers (see `member_badges_handler.go` line 56).

**Route registration** (in `main.go`, among public v1 routes, NO `authMiddleware`):
```go
archiveRepo := repository.NewMemberArchiveRepository(dbPool)
archiveHandler := handlers.NewMemberArchiveHandler(archiveRepo)
v1.GET("/archiv", archiveHandler.SearchArchive)
```

---

### `backend/internal/repository/member_archive_repository.go` (repository, CRUD — NEW)

**Analog:** `backend/internal/repository/anime_contributions_public_repository.go` (401 lines, read above)

**Imports pattern:**
```go
package repository

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Struct + constructor:**
```go
type MemberArchiveRepository struct {
    db *pgxpool.Pool
}

func NewMemberArchiveRepository(db *pgxpool.Pool) *MemberArchiveRepository {
    return &MemberArchiveRepository{db: db}
}
```

**Filter struct + result types:**
```go
type ArchiveSearchFilters struct {
    RoleCode      string
    FansubGroupID int64
    YearFrom      int
    YearUntil     int
}

type ArchiveMemberRow struct {
    ID          int64    `json:"id"`
    Nickname    string   `json:"nickname"`
    DisplayName string   `json:"display_name"`
    Slug        *string  `json:"slug"`
    AvatarPath  *string  `json:"avatar_path"`
    IsVerified  bool     `json:"is_verified"`
    TopRoles    []string `json:"top_roles"`
    Groups      []string `json:"groups"`
}

type ArchiveSearchResult struct {
    Members []ArchiveMemberRow
    Total   int
}
```

**Sichtbarkeits-Bedingungen** (from `anime_contributions_public_repository.go` lines 119, 122, 347):
- `ac.is_public_on_member_profile = true`
- `hfgm.visibility = 'public'`
- `m.profile_visibility = 'public'`

**Pagination pattern** (from RESEARCH.md Befund 4 and existing admin list pattern):
```go
const archivePageSize = 20

func (r *MemberArchiveRepository) SearchMembers(
    ctx context.Context,
    filters ArchiveSearchFilters,
    page int,
) (*ArchiveSearchResult, error) {
    offset := (page - 1) * archivePageSize
    // ... build query with EXISTS subqueries for optional filters ...
    // See RESEARCH.md Befund 4 for full SQL
}
```

**Key SQL pattern** — reuse `memberSlugExpr` and `memberDisplayExpr` constants defined in `anime_contributions_public_repository.go` lines 14–18:
```go
// memberSlugExpr and memberDisplayExpr are package-level constants in the repository package.
// Use them directly: fmt.Sprintf(memberSlugExpr, "m.nickname")
```

---

### `database/migrations/0092_archive_search_indexes.up.sql` (migration — NEW)

**Analog:** `database/migrations/0086_anime_contributions.up.sql` — index creation style

**Pattern** (two new indexes):
```sql
-- Index für Archiv-Suche: members.profile_visibility Filter
CREATE INDEX IF NOT EXISTS idx_members_profile_visibility
    ON members (profile_visibility);

-- Index für verified-Badge-Subquery in der Archiv-Suche
CREATE INDEX IF NOT EXISTS idx_member_claims_member_claim_status
    ON member_claims (member_id, claim_status);
```

Rollback file `0092_archive_search_indexes.down.sql`:
```sql
DROP INDEX IF EXISTS idx_members_profile_visibility;
DROP INDEX IF EXISTS idx_member_claims_member_claim_status;
```

---

### `frontend/src/app/archiv/page.tsx` (Server Component, request-response — NEW)

**Analog:** `frontend/src/app/anime/page.tsx` (public Server Component with searchParams, dynamic rendering)

**Imports pattern** (from `anime/page.tsx` lines 1–10 and `members/[slug]/page.tsx` lines 1–28):
```typescript
import type { Metadata } from 'next'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { MemberSearchCard } from '@/components/archive/MemberSearchCard'
import { searchArchive, getFansubs } from '@/lib/api'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
```

**searchParams destructuring** (from `anime/page.tsx` lines 17–46):
```typescript
interface ArchivePageProps {
  searchParams:
    | Promise<{
        rolle?: string
        gruppe?: string
        von?: string
        bis?: string
        page?: string
      }>
    | { ... }
    | undefined
}
```

**Server Component data-fetch pattern** (from `members/[slug]/page.tsx` lines 86–102):
```typescript
export default async function ArchivPage({ searchParams }: ArchivePageProps) {
  const resolved = ((await searchParams) ?? {}) as ResolvedArchiveParams

  let result = null
  let fetchError: string | null = null

  try {
    result = await searchArchive({
      rolle: resolved.rolle,
      gruppe: resolved.gruppe,
      von: resolved.von,
      bis: resolved.bis,
      page: Number(resolved.page ?? '1') || 1,
    })
  } catch {
    fetchError = 'Archiv konnte nicht geladen werden'
  }

  return (
    <main className={styles.archivPage} aria-label="Archiv — Fansub-Mitwirkende entdecken">
      ...
    </main>
  )
}
```

**Colocated CSS module:** `frontend/src/app/archiv/page.module.css`

---

### `frontend/src/components/archive/MemberSearchCard.tsx` (component — NEW)

**Analog:** `frontend/src/components/profile/VerifiedBadge.tsx` (style/structure pattern) + inline avatar+name patterns from `members/[slug]/page.tsx`

**Imports pattern:**
```typescript
import Link from 'next/link'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import styles from './archive.module.css'
```

**Props type:**
```typescript
type MemberSearchCardProps = {
  id: number
  nickname: string
  displayName: string
  slug: string | null
  avatarPath: string | null
  isVerified: boolean
  topRoles: string[]
  groups: string[]
}
```

**Component structure** (from UI-SPEC.md Surface 1, MemberSearchCard-Komponente):
```typescript
export function MemberSearchCard({ ... }: MemberSearchCardProps) {
  return (
    <article className={styles.memberSearchCard}>
      <div className={styles.cardHeader}>
        <img
          src={avatarPath ?? '/placeholder-avatar.png'}
          alt={displayName}
          className={styles.cardAvatar}
          width={48}
          height={48}
        />
        <div className={styles.cardMeta}>
          <strong className={styles.cardName}>{displayName}</strong>
          {isVerified && <VerifiedBadge />}
        </div>
      </div>
      <div className={styles.cardRoles}>
        {topRoles.slice(0, 3).map((role) => (
          <span key={role} className={styles.roleChip}>{role}</span>
        ))}
        {topRoles.length > 3 && (
          <span className={styles.roleChip}>+{topRoles.length - 3} weitere</span>
        )}
      </div>
      <div className={styles.cardGroups}>
        {groups.slice(0, 2).join(', ')}
        {groups.length > 2 && ` + ${groups.length - 2} weitere`}
      </div>
      {slug && (
        <Link href={`/members/${slug}`} className={styles.cardLink}>
          Profil ansehen
        </Link>
      )}
    </article>
  )
}
```

**CSS module:** `frontend/src/components/archive/archive.module.css`

Spacing from UI-SPEC.md (4-Punkt-konform):
- `.memberSearchCard { padding: 16px; display: grid; gap: 8px; }`
- `.cardHeader { display: grid; grid-template-columns: 48px 1fr; gap: 8px; align-items: center; }`
- `.cardAvatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }`
- `.roleChip { font-size: 13px; font-weight: 700; background: rgba(95,132,221,0.1); border: 1px solid rgba(95,132,221,0.25); border-radius: 999px; padding: 4px 8px; }`

---

### `frontend/src/components/groups/GroupHistorySection.tsx` (component, CRUD — NEW)

**Analog:** `frontend/src/app/admin/my-groups/[id]/page.tsx` — Client Component pattern with `useState`, `useCallback`, `useEffect`, Card/SectionHeader/Button/EmptyState/ErrorState from `@/components/ui`

**Imports pattern** (from `admin/my-groups/[id]/page.tsx` lines 1–32):
```typescript
'use client'

import { useState, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Button, Card, EmptyState, ErrorState, Modal, SectionHeader, Toolbar,
} from '@/components/ui'
import {
  listGroupHistory, createGroupHistory, updateGroupHistory, deleteGroupHistory,
} from '@/lib/api'
import styles from '../../components/groups/groups.module.css'
```

**State pattern** (from `admin/my-groups/[id]/page.tsx` lines 70–73):
```typescript
const [entries, setEntries] = useState<GroupHistoryRow[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [isExpanded, setIsExpanded] = useState(false)
const [editTarget, setEditTarget] = useState<GroupHistoryRow | null>(null)
const [isFormOpen, setIsFormOpen] = useState(false)
const [deleteTarget, setDeleteTarget] = useState<GroupHistoryRow | null>(null)
```

**COLLAPSE_THRESHOLD = 5** (from UI-SPEC.md):
```typescript
const COLLAPSE_THRESHOLD = 5
const visibleEntries = isExpanded ? entries : entries.slice(0, COLLAPSE_THRESHOLD)
```

**Error handling pattern** (from `admin/my-groups/[id]/page.tsx` lines 39–43):
```typescript
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```

**Delete confirmation:** `Modal` from `@/components/ui` (pattern from UI-SPEC.md Surface 2, Löschen-Bestätigung).

**Toast pattern:** `MessageToast` from `@/app/admin/anime/components/` if available; otherwise inline 3-second success message.

**CSS module:** `frontend/src/components/groups/groups.module.css`

Spacing from UI-SPEC.md (documented exceptions apply):
- `.historyRow { display: flex; gap: 12px; align-items: flex-start; padding: 8px 12px; }` (12px = `--space-3`, bestehender Codebase-Token)
- `.historyForm { padding: 16px; display: grid; gap: 12px; }` (12px = `--space-3`)
- `.historyFormRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }`
- `.historyRowActions { display: flex; gap: 8px; }`

---

### `frontend/src/components/profile/MemberBadgeChips.tsx` (component — EXTEND)

**Analog:** self — read fully above (97 lines)

**Extend BADGE_LABELS map** (line 10–14, add below existing entries):
```typescript
const BADGE_LABELS: Record<string, string> = {
  founding_member:   '★ Gründungsmitglied',
  historical_leader: '♦ Historischer Leader',
  long_term_member:  '◆ 5+ Jahre Mitglied',
  // Phase 68:
  first_contribution: '✦ Erster Beitrag',
  productive_bronze:  '◈ Produktiv · 10+ Anime',
  productive_silver:  '◈ Produktiv · 25+ Anime',
  productive_gold:    '◈ Produktiv · 50+ Anime',
  all_rounder:        '⬡ Allrounder',
  verified:           '✓ Verifiziert',
}
```

No CSS changes required — `.badgeChip` in `profile.module.css` applies automatically to all entries. No new component needed.

---

### `frontend/src/lib/api.ts` (utility — EXTEND)

**Analog:** self — public fetch pattern (lines 7732–7756), authorized fetch pattern (lines 1201–1250), and `getMyFansubGroupDetail` (lines 2884–2882)

**New public fetch — `searchArchive`** (copy `getMemberContributions` pattern, lines 7732–7757):
```typescript
export async function searchArchive(params: {
  rolle?: string
  gruppe?: string
  von?: string
  bis?: string
  page?: number
}): Promise<ArchiveSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.rolle) query.set('rolle', params.rolle)
  if (params.gruppe) query.set('gruppe', params.gruppe)
  if (params.von) query.set('von', String(params.von))
  if (params.bis) query.set('bis', String(params.bis))
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/archiv?${query.toString()}`,
    { next: { revalidate: 30 } },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<ArchiveSearchResponse>
}
```

**New authorized fetches — group history CRUD** (copy `getMyFansubGroupDetail` pattern, lines 2884–2890 + delete contribution pattern):
```typescript
// listGroupHistory — bestehend (GET)
export async function listGroupHistory(fansubGroupId: number, authToken?: string): Promise<...>

// createGroupHistory — bestehend (POST)
export async function createGroupHistory(fansubGroupId: number, body: ..., authToken?: string): Promise<...>

// updateGroupHistory — bestehend (PATCH)
export async function updateGroupHistory(fansubGroupId: number, historyId: number, body: ..., authToken?: string): Promise<...>

// deleteGroupHistory — NEU (DELETE, gibt void zurück wie andere Delete-Funktionen)
export async function deleteGroupHistory(
  fansubGroupId: number,
  historyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    { method: 'DELETE', authToken },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Fehler beim Löschen des Meilensteineintrags.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}
```

---

## Shared Patterns

### Permission Check (Leader / Admin)
**Source:** `backend/internal/handlers/fansub_anime_contributions_handler.go` lines 110–119
**Apply to:** `fansub_group_history_handler.go` DeleteGroupHistory (and Create/Update if Leader-scoped)
```go
identity, actor, ok := permissionActorFromContext(c)
if !ok { return }

result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
    permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    writePermissionDenied(c, result)
    return
}
```

### Badge-Non-Critical-Path Error Pattern
**Source:** `backend/internal/services/badge_service.go` lines 69–74
**Apply to:** All new `computeX` functions in `badge_service.go`
```go
if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
        _ = s.repo.RevokeMemberBadge(ctx, memberID, "badge_code")
        return
    }
    log.Printf("badge_service: X query error (member_id=%d): %v", memberID, err)
    return
}
```

### Upsert/Revoke Idempotency
**Source:** `backend/internal/repository/badge_repository.go` lines 61–73
**Apply to:** All new badge compute functions — always either Upsert (condition met) or Revoke (condition not met).

### Public Route without Auth
**Source:** `backend/cmd/server/main.go` lines 332–336 (`v1.GET("/fansubs", ...)`)
**Apply to:** `member_archive_handler.go` registration
```go
v1.GET("/archiv", archiveHandler.SearchArchive)  // kein authMiddleware
```

### Sichtbarkeits-WHERE-Klausel für öffentliche Queries
**Source:** `backend/internal/repository/anime_contributions_public_repository.go` lines 117–122
**Apply to:** `member_archive_repository.go` SearchMembers
```sql
WHERE ac.is_public_on_member_profile = true
  AND hfgm.visibility = 'public'
  AND m.profile_visibility = 'public'
```

### German Error Strings / Response Messages
**Source:** All handlers — e.g. `fansub_group_history_handler.go` lines 53, 65
**Apply to:** All new Go handlers
```go
badRequest(c, "ungültige fansub id")
internalError(c, "interner serverfehler")
c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "historieneintrag nicht gefunden"}})
```

### CSS Module Colocated Pattern
**Source:** `frontend/src/app/members/[slug]/page.module.css` (colocated with page), `frontend/src/components/profile/profile.module.css` (colocated with components)
**Apply to:** `archiv/page.module.css`, `components/archive/archive.module.css`, `components/groups/groups.module.css`

### `VerifiedBadge` Einbindung
**Source:** `frontend/src/components/profile/VerifiedBadge.tsx` (26 lines, read fully)
**Apply to:** `MemberSearchCard.tsx` — conditional `<VerifiedBadge />` when `is_verified=true`
```typescript
{isVerified && <VerifiedBadge />}
// VerifiedBadge erwartet keine Props außer optionalem label.
// aria-label="Verifiziertes Mitglied" ist in der Komponente bereits eingebaut.
```

---

## No Analog Found

Alle Phase-68-Dateien haben passende Analogs im Codebase. Keine ungeklärten Fälle.

---

## Metadata

**Analog search scope:** `backend/internal/services/`, `backend/internal/repository/`, `backend/internal/handlers/`, `backend/cmd/`, `frontend/src/app/`, `frontend/src/components/`, `frontend/src/lib/`
**Files scanned:** 20+
**Pattern extraction date:** 2026-06-02
