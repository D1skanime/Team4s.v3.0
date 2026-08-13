# Phase 83: Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit — Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 11 neue/geänderte Dateien
**Analogs found:** 10 / 11 (1 ohne direktes Analog: `ContributorAvatar.tsx`)

---

## File Classification

| Neue/geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `backend/internal/permissions/permissions.go` | permissions-service | request-response | *(gleiche Datei — Umbau)* | exact |
| `backend/internal/repository/authz_permissions.go` | repository | request-response | *(gleiche Datei — Erweiterung)* | exact |
| `backend/internal/repository/release_version_notes_repository.go` | repository | CRUD | *(gleiche Datei — Umbau)* | exact |
| `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` | repository | CRUD | `backend/internal/repository/anime_contributions_repository.go` | role-match |
| `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` | handler | request-response | `backend/internal/handlers/admin_content_release_version_notes.go` | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` | test | — | `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` | component | — | *(kein Avatar-Primitive vorhanden)* | none |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | component (migrate) | request-response | *(gleiche Datei — D-14-Migration)* | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | page/controller | event-driven | *(gleiche Datei — Erweiterung)* | exact |
| `frontend/src/lib/api.ts` | utility/api-client | request-response | `listUnifiedGroupMembers` / `upsertAnimeContribution` in gleicher Datei | exact |
| `shared/contracts/admin-content.yaml` | config/contract | — | bestehende `admin-release-version-media-list`-Einträge | exact |

---

## Pattern Assignments

### `backend/internal/permissions/permissions.go` (permissions-service, Umbau)

**Analog:** gleiche Datei — gezielte Erweiterung von `CanForReleaseVersion` und `Resolver`-Interface

**Imports-Pattern** (Zeilen 1–8):
```go
package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
)
```

**Resolver-Interface — neue Methode anhängen** (Zeilen 181–187):
```go
type Resolver interface {
	ResolveFansubGroup(ctx context.Context, fansubGroupID int64) (*Context, error)
	ResolveRelease(ctx context.Context, releaseID int64) (*Context, error)
	ResolveReleaseVersion(ctx context.Context, releaseVersionID int64) (*Context, error)
	ResolveReleaseVersionMedia(ctx context.Context, relationID int64) (*Context, error)
	ListActorGroupRoles(ctx context.Context, appUserID int64, fansubGroupID int64) ([]string, error)
	// NEU — Phase 83:
	// ListActorContributionRolesForVersion gibt die role_codes des Actors für eine Release-Version zurück.
	// ListActorContributionRolesForVersion(ctx context.Context, appUserID int64, releaseVersionID int64) ([]string, error)
}
```

**CanForReleaseVersion — Umbau-Muster** (Zeilen 240–244, ersetzen durch neues Muster):

Aktuelle Implementierung (zu ersetzen):
```go
func (s *Service) CanForReleaseVersion(ctx context.Context, actor Actor, action Action, releaseVersionID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	})
}
```

Neues Muster (eigenständige Methode, kein `canForContext`-Delegation für operative Rollen):
```go
func (s *Service) CanForReleaseVersion(ctx context.Context, actor Actor, action Action, releaseVersionID int64) (Result, error) {
	// Schritt 0: Basis-Checks (wie canForContext)
	if s == nil || s.resolver == nil {
		return denied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if actor.IsPlatformAdmin {
		return Result{Allowed: true, ReasonCode: ReasonPlatformAdmin, ...}, nil
	}

	// Schritt 1: Leader-Check ZUERST (D-05, Pitfall 1)
	resourceCtx, err := s.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	if err != nil { return Result{}, err }
	if resourceCtx == nil || len(resourceCtx.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}
	for _, fansubGroupID := range resourceCtx.FansubGroupIDs {
		groupRoles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
		if err != nil { return Result{}, err }
		for _, role := range groupRoles {
			if role == RoleFansubLead || role == RoleProjectLead {
				if roleAllows(role, action) {
					return Result{Allowed: true, ReasonCode: ReasonAllowed, MatchedRole: role, ...}, nil
				}
			}
		}
	}

	// Schritt 2: Contribution-Auflösung (D-01..D-04)
	roleCodes, err := s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID)
	if err != nil { return Result{}, err }
	for _, code := range roleCodes {
		if roleAllows(code, action) {
			return Result{Allowed: true, ReasonCode: ReasonAllowed, MatchedRole: code, ...}, nil
		}
	}
	if len(roleCodes) > 0 {
		return denied(ReasonInsufficientRole, "contribution vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine contribution für diese release-version"), nil
}
```

**roleAllows / denied — unverändert wiederverwenden** (Zeilen 334–345):
```go
func roleAllows(role string, action Action) bool {
	allowed := roleMatrix[strings.TrimSpace(role)]
	return slices.Contains(allowed, action)
}

func denied(code string, reason string) Result {
	return Result{
		Allowed:    false,
		ReasonCode: code,
		Reason:     reason,
	}
}
```

**Modularitäts-Check:** 346 Zeilen aktuell. Umbau fügt ~40–60 Zeilen hinzu → bleibt unter 450. Kein Split nötig.

---

### `backend/internal/repository/authz_permissions.go` (repository, Erweiterung)

**Analog:** gleiche Datei — neue Methode `ListActorContributionRolesForVersion` nach `ListActorGroupRoles`-Muster

**Imports-Pattern** (Zeilen 1–9):
```go
package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)
```

**ListActorGroupRoles — Copy-Basis** (Zeilen 156–188):
```go
func (r *AuthzRepository) ListActorGroupRoles(ctx context.Context, appUserID int64, fansubGroupID int64) ([]string, error) {
	if appUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT fgr.role
		FROM fansub_group_members fgm
		JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
		WHERE fgm.app_user_id = $1
		  AND fgm.fansub_group_id = $2
		  AND fgm.status = 'active'
		ORDER BY fgr.role
	`, appUserID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	defer rows.Close()

	roles := make([]string, 0)
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("list actor group roles ...: scan: %w", err)
		}
		roles = append(roles, strings.TrimSpace(role))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list actor group roles ...: iterate: %w", err)
	}
	return roles, nil
}
```

**Neue Methode — zu bauendes Muster** (nach Zeile 188 einfügen):
```go
// ListActorContributionRolesForVersion gibt die role_codes zurück, die dem Actor
// für eine Release-Version zustehen.
// Auflösungsreihenfolge (D-02):
//  1. versions-spezifische anime_contributions (release_version_id = versionID)
//  2. Fallback: anime-weite Contributions (release_version_id IS NULL, anime_id aus Release ermittelt)
//
// Gibt leere Liste zurück wenn keine Contribution existiert (→ D-04: kein Recht).
func (r *AuthzRepository) ListActorContributionRolesForVersion(
	ctx context.Context,
	appUserID int64,
	releaseVersionID int64,
) ([]string, error) {
	if appUserID <= 0 || releaseVersionID <= 0 {
		return nil, nil
	}
	// Schritt 1: versions-spezifische Contributions
	// (analog zu ListActorGroupRoles: Query → rows.Close() → Scan-Loop → rows.Err())
	// ...
	// Schritt 2 (nur wenn Schritt 1 leer): anime-weite Contributions
	// ...
}
```

**Modularitäts-Check:** 189 Zeilen aktuell. Neue Methode ~40 Zeilen → bleibt unter 450.

---

### `backend/internal/repository/release_version_notes_repository.go` (repository, Umbau D-13)

**Analog:** gleiche Datei — `GetMemberRolesForVersion` und `loadValidMemberRoleKeysForVersion` ersetzen

**Zu ersetzende Query** (Zeilen 121–131 — Legacy `release_member_roles`):
```go
// ERSETZEN — liest aus release_member_roles (Phase-44-Legacy-Tabelle)
rows, err := r.db.Query(ctx, `
	SELECT rmr.member_id, m.nickname AS member_name,
	       rmr.role_id, cr.name AS role_name, cr.label AS role_label
	FROM release_member_roles rmr
	JOIN members m ON m.id = rmr.member_id
	JOIN contributor_roles cr ON cr.id = rmr.role_id
	JOIN release_versions rv ON rv.release_id = rmr.release_id
	WHERE rv.id = $1
	ORDER BY cr.name ASC, m.nickname ASC
`, releaseVersionID)
```

**Neues Query-Muster** (analog zu `ListByFansubAndAnimeWithDisplay` in `anime_contributions_repository.go`):
```go
// NEU — liest aus anime_contributions + anime_contribution_roles (D-13)
// Schritt 1: versions-spezifischer Satz
rows, err := r.db.Query(ctx, `
	SELECT DISTINCT ac.member_id, m.nickname AS member_name,
	       acr.role_code, rd.label_de AS role_label
	FROM anime_contributions ac
	JOIN members m ON m.id = ac.member_id
	JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
	JOIN role_definitions rd ON rd.code = acr.role_code
	WHERE ac.release_version_id = $1
	  AND ac.fansub_group_id IN (
	      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
	  )
	ORDER BY rd.label_de ASC, m.nickname ASC
`, releaseVersionID)
// Schritt 2 (nur wenn leer): anime-weiten Fallback laden
```

**Scan-Muster bleibt analog** (Zeilen 136–149):
```go
var items []MemberRoleForVersion
for rows.Next() {
	var mr MemberRoleForVersion
	if err := rows.Scan(
		&mr.MemberID, &mr.MemberName,
		&mr.RoleID, &mr.RoleName, &mr.RoleLabel,
	); err != nil {
		return nil, fmt.Errorf("scan member_roles_for_version row: %w", err)
	}
	items = append(items, mr)
}
if err := rows.Err(); err != nil {
	return nil, fmt.Errorf("iterate member_roles_for_version rows: %w", err)
}
return items, nil
```

**Hinweis:** `MemberRoleForVersion`-Struct (Zeilen 38–44) muss angepasst werden: `RoleID int64` / `RoleName string` werden durch `RoleCode string` ersetzt, da `anime_contribution_roles` role_code (string) statt role_id (int64) speichert. `loadValidMemberRoleKeysForVersion` und `releaseVersionMemberRoleKey` müssen auf `(memberID, roleCode)` umgestellt werden.

**Modularitäts-Check:** ~280 Zeilen. Umbau bleibt unter 450.

---

### `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` (NEU, repository, CRUD)

**Analog:** `backend/internal/repository/anime_contributions_repository.go`

**Datei-Struktur-Muster** (aus `anime_contributions_repository.go` Zeilen 1–50):
```go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EffectiveContributionRow ist die aufgelöste Mitwirkenden-Ansicht für eine Release-Version.
// Entweder versions-spezifischer Override (is_override=true) oder Projekt-Default (is_override=false).
type EffectiveContributionRow struct {
	ContributionID  int64    `json:"contribution_id"`
	MemberID        int64    `json:"member_id"`
	MemberName      string   `json:"member_display_name"`
	MemberAvatarURL *string  `json:"member_avatar_url,omitempty"`
	RoleCodes       []string `json:"role_codes"`
}

type EffectiveContributionsResult struct {
	Rows       []EffectiveContributionRow `json:"data"`
	IsOverride bool                       `json:"is_override"`
	Source     string                     `json:"source"` // "release_version" | "anime_default"
}

// FansubReleasesContributionsRepository enthält Queries für den aufgelösten Mitwirkenden-Satz.
type FansubReleasesContributionsRepository struct {
	db *pgxpool.Pool
}

func NewFansubReleasesContributionsRepository(db *pgxpool.Pool) *FansubReleasesContributionsRepository {
	return &FansubReleasesContributionsRepository{db: db}
}
```

**Core-Query-Muster** (aus `ListByFansubAndAnimeWithDisplay` Zeilen 134–158):
```go
// ListEffectiveContributionsForVersion löst den Mitwirkenden-Satz auf:
// 1. Versions-spezifische Entries (release_version_id = versionID)
// 2. Fallback: anime-weite Entries (release_version_id IS NULL)
func (r *FansubReleasesContributionsRepository) ListEffectiveContributionsForVersion(
	ctx context.Context,
	releaseVersionID int64,
	fansubGroupID int64,
) (*EffectiveContributionsResult, error) {
	// Schritt 1: Versions-spezifische Contributions
	rows, err := r.db.Query(ctx, `
		SELECT ac.id, ac.member_id, m.nickname,
		       COALESCE(ma.file_path, '') AS avatar_path,
		       COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.release_version_id = $1
		  AND ac.fansub_group_id = $2
		GROUP BY ac.id, m.nickname, ma.file_path
		ORDER BY m.nickname
	`, releaseVersionID, fansubGroupID)
	// ...rows.Close() defer; Scan-Loop (wie ListByFansubAndAnimeWithDisplay Z.149-158)
	// Schritt 2 (nur wenn result leer): anime-weite Query mit anime_id aus Release
}
```

**Error-Handling-Muster** (aus `CreateOrUpdate` Zeilen 95–99):
```go
if err != nil {
	if isForeignKeyViolation(err) {
		return nil, ErrNotFound
	}
	return nil, fmt.Errorf("list effective contributions version=%d: %w", releaseVersionID, err)
}
```

**Modularitäts-Check:** Neue Datei ~120–160 Zeilen. Klar unter 450.

---

### `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` (NEU, handler, request-response)

**Analog:** `backend/internal/handlers/admin_content_release_version_notes.go`

**Imports-Pattern** (Zeilen 1–14 aus `admin_content_release_version_notes.go`):
```go
package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```

**Auth-Pattern — requireReadAccess-Helper** (Zeilen 44–68 aus `admin_content_release_version_notes.go`):
```go
func (h *AdminContentHandler) requireReleaseVersionNoteReadAccess(c *gin.Context) (int64, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return 0, false
	}
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return 0, false
	}
	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Version-Berechtigung konnte nicht geprüft werden.")
		return 0, false
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return 0, false
	}
	return versionID, true
}
```

**Core-Handler-Pattern** (Zeilen 85–100, `ListReleaseVersionNotes`):
```go
func (h *AdminContentHandler) ListReleaseVersionNotes(c *gin.Context) {
	versionID, ok := h.requireReleaseVersionNoteReadAccess(c)
	if !ok {
		return
	}
	notes, err := h.releaseVersionNotesRepo.ListReleaseVersionNotes(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version-Notizen konnten nicht geladen werden.")
		return
	}
	if notes == nil {
		notes = []repository.ReleaseVersionNote{}
	}
	c.JSON(http.StatusOK, gin.H{"data": notes})
}
```

**Neuer Handler** (zu bauendes Muster, analog zu obigem):
```go
// GetEffectiveContributionsForVersion verarbeitet
// GET /api/v1/admin/release-versions/:versionId/contributions/effective?fansub_group_id=N
func (h *AdminContentHandler) GetEffectiveContributionsForVersion(c *gin.Context) {
	versionID, ok := h.requireReleaseVersionViewAccess(c) // analog requireReleaseVersionNoteReadAccess
	if !ok {
		return
	}
	fansubGroupID, err := strconv.ParseInt(c.Query("fansub_group_id"), 10, 64)
	if err != nil || fansubGroupID <= 0 {
		badRequest(c, "fansub_group_id fehlt oder ungültig")
		return
	}
	result, err := h.fansubReleasesContributionsRepo.ListEffectiveContributionsForVersion(
		c.Request.Context(), versionID, fansubGroupID,
	)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release-version nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Mitwirkende konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": result.Rows,
		"meta": gin.H{"is_override": result.IsOverride, "source": result.Source},
	})
}
```

**QueryParam-Pattern** (aus `admin_content_fansub_releases_handlers.go` Zeilen 49–61):
```go
page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
if err != nil {
	badRequest(c, "ungültiger page parameter")
	return
}
```

**Modularitäts-Check:** Neue Datei ~80–120 Zeilen. Klar unter 450.

---

### `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` (NEU, component, request-response)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`

**Imports-Pattern** (aus `AnimeContributionModal.tsx` Zeilen 1–16):
```tsx
'use client'

import { useEffect, useState } from 'react'
import { Trash2, MoreHorizontal, Plus } from 'lucide-react'

import { Button, Drawer, EmptyState, LoadingState, ErrorState, Select, FormField } from '@/components/ui'
import {
  upsertAnimeContribution,
  deleteAnimeContribution,
  listUnifiedGroupMembers,
} from '@/lib/api'
import type { AnimeContribution, UnifiedGroupMember } from '@/types/fansub'

import type { ContributionDrawerRow } from './ReleaseContributionDrawer'
import { ContributorAvatar } from './ContributorAvatar'
import styles from './FansubEdit.module.css'
```

**Drawer-Öffnungs-Pattern** (aus `page.tsx` Zeilen 1865–1886, `openAnimeContributions`):
```tsx
// Paralleles Laden von Members + effektiven Contributions beim Öffnen:
const handleOpen = async (releaseVersionId: number, releaseTitle: string) => {
  setLoading(true)
  setError(null)
  try {
    const [membersResult, contributionsResult] = await Promise.all([
      listUnifiedGroupMembers(fansubId),
      listEffectiveContributionsForVersion(releaseVersionId, fansubId),
    ])
    setMembers(membersResult ?? [])
    setStagedRows(contributionsResult.data ?? [])
    setIsOverride(contributionsResult.meta.is_override)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
  } finally {
    setLoading(false)
  }
}
```

**Drawer-Wrapper-Pattern** (aus `frontend/src/components/ui/Drawer.tsx` Zeilen 18–44):
```tsx
// Drawer mit footer-Slot (staged Speichern/Abbrechen — C-STAGED):
<Drawer
  open={open}
  onClose={handleClose}
  title="Mitwirkende"
  description={`Rollen für ${releaseTitle}`}
  footer={
    <>
      <Button variant="ghost" onClick={handleClose} disabled={saving}>
        Abbrechen
      </Button>
      <Button variant="primary" onClick={handleSave} loading={saving}>
        Speichern
      </Button>
    </>
  }
>
  {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : (
    /* Rollen-Liste hier */
  )}
</Drawer>
```

**Staged-State-Pattern** (aus `AnimeContributionModal.tsx` Zeilen 44–47, 135–187):
```tsx
// Staged State — kein Auto-Save (D-06, C-STAGED):
const [stagedRows, setStagedRows] = useState<ContributionDrawerRow[]>([])
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)

async function handleSave() {
  setSaving(true)
  setError(null)
  try {
    // DELETE für entfernte Entries (mit contribution_id, nur release_version_id-spezifische!)
    await Promise.all(removedRows.map((row) => deleteAnimeContribution(fansubId, animeId, row.contribution_id)))
    // POST/upsert für neue/geänderte Entries (release_version_id gesetzt)
    await Promise.all(addedRows.map((row) => upsertAnimeContribution(fansubId, animeId, {
      member_id: row.member_id,
      role_codes: row.role_codes,
      release_version_id: releaseVersionId,
      // weitere Felder...
    })))
    onSaved()
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
  } finally {
    setSaving(false)
  }
}
```

**Zeilen-Aktionen-Pattern** (aus UI-SPEC — zu bauen):
```tsx
// Pro Zeile: [Rolle-Icon] {Rolle} · [Avatar] {Person} · [⋯ Rolle ändern] [Trash2 Entfernen]
<div className={styles.contributionRow}>
  <span className={styles.roleLabel}>{row.role_code}</span>
  <ContributorAvatar name={row.member_display_name} avatarUrl={row.member_avatar_url} />
  <span className={styles.memberName}>{row.member_display_name}</span>
  <div className={styles.rowActions}>
    <Button
      variant="ghost"
      iconOnly
      size="sm"
      aria-label="Rolle ändern"
      onClick={() => handleEditRole(row)}
    >
      <MoreHorizontal size={18} />
    </Button>
    <Button
      variant="danger"
      iconOnly
      size="sm"
      aria-label="Mitwirkende entfernen"
      onClick={() => handleRemove(row)}
    >
      <Trash2 size={18} />
    </Button>
  </div>
</div>
```

**Modularitäts-Check:** `page.tsx` ist bereits >3200 Zeilen — Drawer MUSS als eigene Datei bleiben. Ziel-Größe: ~200–300 Zeilen.

---

### `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` (NEU, Mini-Komponente)

**Analog:** Kein Avatar-Primitive in `@/components/ui` vorhanden (verifiziert in RESEARCH.md). Lokales Inline-Komponent ist die genehmigte Lösung (UI-SPEC Zeile 59).

**Token-Muster** (aus UI-SPEC Zeilen 171–173):
```tsx
// Tokens: --surface-sunken (Hintergrund), --text-soft (Initialen), --radius-md (Rundung)
// Maß: 32px Kreis (2rem), 12px Initialen (caption-Größe aus UI-SPEC)
export function ContributorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={styles.contributorAvatar} />
  }

  return (
    <span className={styles.contributorAvatarInitials} aria-label={name}>
      {initials}
    </span>
  )
}
```

**CSS-Token-Referenz** (aus UI-SPEC + `globals.css`-Konventionen):
```css
.contributorAvatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  object-fit: cover;
}
.contributorAvatarInitials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 400;
  user-select: none;
}
```

**Modularitäts-Check:** ~30 Zeilen. Klar unter 450.

---

### `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (Migration D-14)

**Analog:** gleiche Datei — nur das native `<select>` in der Focused-Role-Ansicht ersetzen

**Zu ersetzendes natives `<select>`** (Zeilen 230–253):
```tsx
// ERSETZEN — natives <select> (D-14 Verstoß):
<Select
  value={focusedMemberSelectValue}
  onChange={(event) => {
    const memberId = Number(event.currentTarget.value)
    setFocusedMemberSelectValue(event.currentTarget.value)
    if (Number.isFinite(memberId) && memberId > 0) {
      addFocusedRole(memberId)
    }
  }}
  aria-label="Member hinzufügen"
  disabled={focusedAvailableMembers.length === 0}
>
  <option value="">
    {focusedAvailableMembers.length === 0 ? 'Alle Member zugewiesen' : 'Member auswählen'}
  </option>
  {focusedAvailableMembers.map((member) => (
    <option key={member.member_id} value={member.member_id}>
      {member.display_name}
    </option>
  ))}
</Select>
```

**Neues Muster** (mit `FormField` Wrapper — D-14):
```tsx
// NEU — mit FormField-Label (D-14):
<FormField label="Person">
  <Select
    value={focusedMemberSelectValue}
    onChange={(event) => {
      const memberId = Number(event.currentTarget.value)
      setFocusedMemberSelectValue(event.currentTarget.value)
      if (Number.isFinite(memberId) && memberId > 0) {
        addFocusedRole(memberId)
      }
    }}
    disabled={focusedAvailableMembers.length === 0}
  >
    <option value="">
      {focusedAvailableMembers.length === 0 ? 'Alle Member zugewiesen' : 'Member auswählen'}
    </option>
    {focusedAvailableMembers.map((member) => (
      <option key={member.member_id} value={member.member_id}>
        {member.display_name}
      </option>
    ))}
  </Select>
</FormField>
```

**Hinweis:** `Select`-Primitive aus `@/components/ui` kapselt bereits ein natives `<select>` — `<option>`-Kinder sind erlaubt (kein CLAUDE.md-Verstoß). Das Problem war das separate `<Select>` ohne `FormField`-Wrapper.

---

### `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (Erweiterung — Einstiegspunkt)

**Analog:** gleiche Datei — `openAnimeContributions`-Pattern (Zeilen 1865–1886) als Vorlage für `openContributionDrawer`

**State-Pattern** (aus Zeilen 1120–1131):
```tsx
// Neuer State analog zu releaseDrawerOpen / drawerRelease:
const [contributionDrawerOpen, setContributionDrawerOpen] = useState(false)
const [contributionDrawerVersionId, setContributionDrawerVersionId] = useState<number | null>(null)
const [contributionDrawerTitle, setContributionDrawerTitle] = useState<string>('')
```

**Open-Handler-Pattern** (aus Zeilen 1865–1886):
```tsx
// Analog zu openAnimeContributions — paralleles Laden beim Öffnen:
const openContributionDrawer = (versionId: number, title: string) => {
  setContributionDrawerVersionId(versionId)
  setContributionDrawerTitle(title)
  setContributionDrawerOpen(true)
}
```

**Drawer-Mount-Pattern** (aus Zeilen 3550+):
```tsx
// Drawer außerhalb der Tabellen-DOM-Struktur, conditional mount:
{contributionDrawerOpen && contributionDrawerVersionId ? (
  <ReleaseContributionDrawer
    open={contributionDrawerOpen}
    fansubId={fansubID}
    releaseVersionId={contributionDrawerVersionId}
    releaseTitle={contributionDrawerTitle}
    onClose={() => setContributionDrawerOpen(false)}
    onSaved={() => { void refreshAnimeReleases(); }}
  />
) : null}
```

---

### `frontend/src/lib/api.ts` (Erweiterung — neuer Helper)

**Analog:** `listUnifiedGroupMembers` (Zeilen 7284–7310) und `upsertAnimeContribution` (Zeilen 7802–7833)

**JSDoc + Signatur-Pattern** (aus Zeilen 7282–7284):
```typescript
/** Aufgelöste Mitwirkenden-Satz für eine Release-Version (Override oder Projekt-Default, D-02).
 * Endpoint: GET /api/v1/admin/release-versions/:versionId/contributions/effective */
export async function listEffectiveContributionsForVersion(
  releaseVersionId: number,
  fansubGroupId: number,
  authToken?: string,
): Promise<EffectiveContributionsResponse> {
```

**Fetch-Pattern** (aus `listUnifiedGroupMembers` Zeilen 7288–7309):
```typescript
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${releaseVersionId}/contributions/effective?fansub_group_id=${fansubGroupId}`,
    { authToken },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<EffectiveContributionsResponse>;
```

**Typ-Deklaration** (in `frontend/src/types/fansub.ts` analog zu `AnimeContributionDisplayRow`):
```typescript
export interface EffectiveContributionRow {
  contribution_id: number
  member_id: number
  member_display_name: string
  member_avatar_url?: string | null
  role_codes: string[]
}

export interface EffectiveContributionsResponse {
  data: EffectiveContributionRow[]
  meta: {
    is_override: boolean
    source: 'release_version' | 'anime_default'
  }
}
```

---

### `shared/contracts/admin-content.yaml` (Contract-Ergänzung)

**Analog:** `admin-release-version-media-list` (Zeilen 397–411)

**Einzufügender Eintrag** (nach bestehendem `admin-release-version-notes-*`-Block):
```yaml
  - name: admin-release-version-contributions-effective
    method: GET
    path: /api/v1/admin/release-versions/:versionId/contributions/effective
    auth:
      required: true
      permission: release_version.view für die adressierte Release-Version
      header:
        name: Authorization
        format: Bearer <signed token>
      unauthenticated_status: 401
      forbidden_status: 403
    path_params:
      - name: versionId
        type: int64
        minimum: 1
    query_params:
      - name: fansub_group_id
        type: int64
        required: true
        minimum: 1
    response:
      status: 200
      type: EffectiveContributionsResponse
    notes:
      - Liefert den aufgelösten Mitwirkenden-Satz (Override oder Projekt-Default, D-02).
      - meta.is_override=true wenn versions-spezifische Contributions existieren.
      - meta.source entweder "release_version" oder "anime_default".
      - contribution_id ist enthalten, damit das Frontend beim Speichern exakt die richtigen IDs löscht (Pitfall 4).
```

---

## Shared Patterns

### Pattern A: Permission-Check-Helper (Auth-Guard)

**Quelle:** `backend/internal/handlers/admin_content_release_version_notes.go` Zeilen 18–42
**Anwenden auf:** `admin_content_fansub_releases_contributions_handlers.go`

```go
// Muster für requireXxxAccess-Methoden:
func (h *AdminContentHandler) requireReleaseVersionNoteWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return middleware.AuthIdentity{}, false
	}
	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Notiz-Berechtigung konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(...)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}
```

### Pattern B: Error-Handling im Handler

**Quelle:** `backend/internal/handlers/admin_content_fansub_releases_handlers.go` Zeilen 64–70
**Anwenden auf:** alle neuen Handler

```go
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "ressource nicht gefunden"}})
	return
}
if err != nil {
	writeInternalErrorResponse(c, "interner serverfehler", err, "Benutzerfreundliche Fehlermeldung.")
	return
}
```

### Pattern C: Repository Rows-Loop

**Quelle:** `backend/internal/repository/authz_permissions.go` Zeilen 170–187
**Anwenden auf:** alle neuen Repository-Methoden

```go
rows := make([]string, 0)
for rows.Next() {
	var val string
	if err := rows.Scan(&val); err != nil {
		return nil, fmt.Errorf("...: scan: %w", err)
	}
	rows = append(rows, val)
}
if err := rows.Err(); err != nil {
	return nil, fmt.Errorf("...: iterate: %w", err)
}
return rows, nil
```

### Pattern D: Staged-Component Fehlerbehandlung (Frontend)

**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` Zeilen 182–187
**Anwenden auf:** `ReleaseContributionDrawer.tsx`

```tsx
} catch (err) {
  setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
} finally {
  setSaving(false)
}
```

### Pattern E: authorizedFetch in api.ts

**Quelle:** `frontend/src/lib/api.ts` Zeilen 7288–7309
**Anwenden auf:** neuen `listEffectiveContributionsForVersion`-Helper

```typescript
const API_BASE_URL = getApiBaseUrl();
const response = await authorizedFetch(`${API_BASE_URL}/...`, { authToken });
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
}
return response.json() as Promise<T>;
```

### Pattern F: UI-Primitives (D-14 Hard Constraint)

**Quelle:** `frontend/src/components/ui/Drawer.tsx` (vollständig gelesen)
**Anwenden auf:** alle neuen Frontend-Komponenten

- `Drawer` (Props: `open`, `onClose`, `title`, `description?`, `children`, `footer?`) — kein eigenes `<aside>`/Overlay bauen
- `Button variant="primary|ghost|danger|secondary"` — kein natives `<button>`
- `Select` + `FormField` — kein natives `<select>`
- `EmptyState`, `LoadingState`, `ErrorState` — kein Custom-Markup für diese Zustände

---

## Keine Analoga gefunden

| Datei | Rolle | Datenfluss | Grund |
|-------|-------|-----------|-------|
| `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` | component | — | Kein `Avatar`-Primitive in `@/components/ui` vorhanden (verifiziert). Lokales Inline-Komponent ist die genehmigte Lösung laut UI-SPEC und RESEARCH.md. |

---

## Modularitäts-Warnungen (≤450 Zeilen CLAUDE.md)

| Datei | Aktuell | Status |
|-------|---------|--------|
| `backend/internal/permissions/permissions.go` | 346 Zeilen | Sicher (+~50 → ~396) |
| `backend/internal/repository/authz_permissions.go` | 189 Zeilen | Sicher (+~40 → ~229) |
| `backend/internal/repository/release_version_notes_repository.go` | ~280 Zeilen | Sicher (Umbau, kein Netto-Wachstum) |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | **>3200 Zeilen** | **BEREITS ÜBERSCHRITTEN** — `ReleaseContributionDrawer.tsx` MUSS als eigene Datei bleiben; in `page.tsx` nur Einstiegspunkt (Button + State + Handler, ~30 neue Zeilen) |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | 318 Zeilen | Sicher (minimale Migration) |

---

## Metadata

**Analog-Suchbereich:** `backend/internal/permissions/`, `backend/internal/repository/`, `backend/internal/handlers/`, `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/lib/`, `frontend/src/components/ui/`, `shared/contracts/`
**Gescannte Dateien:** 18
**Pattern-Extraktionsdatum:** 2026-06-11
