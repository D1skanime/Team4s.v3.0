# Phase 82: Mitwirkende projektweit zuordnen + Projekt-Cockpit — Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql` | migration | batch | `database/migrations/0082_historical_fansub_group_members.up.sql` | role-match |
| `database/migrations/0105_anime_contributions_member_id.up.sql` | migration | batch | `database/migrations/0086_anime_contributions.up.sql` | role-match |
| `database/migrations/0106_fansub_group_member_roles_fk.up.sql` | migration | batch | `database/migrations/0074_expand_fansub_group_member_roles.up.sql` | exact |
| `database/migrations/0107_fansub_group_default_crew.up.sql` | migration | CRUD | `database/migrations/0082_historical_fansub_group_members.up.sql` | role-match |
| `backend/internal/repository/anime_contributions_repository.go` | repository | CRUD | self (modify existing) | exact |
| `backend/internal/repository/anime_contributions_upsert_repository.go` | repository | CRUD | self (modify existing) | exact |
| `backend/internal/repository/hist_group_members_repository.go` | repository | request-response | self (modify existing — add UnifiedList) | exact |
| `backend/internal/handlers/fansub_anime_contributions_handler.go` | handler | request-response | self (modify existing) | exact |
| `backend/internal/handlers/fansub_contributions_validation.go` | utility | request-response | self (modify existing) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | component | request-response | self (modify existing) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | component | request-response | self (modify existing) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` | component | request-response | self (modify existing — UI-Primitives-Fix) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.tsx` | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx` | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` | exact |

---

## Pattern Assignments

### `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql` (migration, batch)

**Analog:** `database/migrations/0082_historical_fansub_group_members.up.sql`

**Migration header pattern** (lines 1–3):
```sql
-- Migration 0104: <description>
-- <why>
-- <ordering dependency note>
```

**ADD COLUMN + BACKFILL + NOT NULL pattern** (modeled on 0086 + RESEARCH.md recommendation):
```sql
-- Step A: neue Spalte member_id nullable zu fansub_group_members hinzufügen
ALTER TABLE fansub_group_members
  ADD COLUMN IF NOT EXISTS member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT;

-- Step B: Backfill via member_claims (verified) oder members.user_id (legacy)
UPDATE fansub_group_members fgm
SET member_id = COALESCE(mc.member_id, m_legacy.id)
FROM ...
WHERE fgm.member_id IS NULL;

-- Step C: Index anlegen
CREATE INDEX IF NOT EXISTS idx_fansub_group_members_member_id
  ON fansub_group_members(member_id) WHERE member_id IS NOT NULL;
```

**Neue members-Zeilen anlegen** (RESEARCH.md Z. 268–284):
```sql
-- Für App-Member ohne members-Zeile: INSERT INTO members (nickname, ...) ...
-- dann fansub_group_members.member_id setzen
INSERT INTO members (nickname, created_at, updated_at)
SELECT au.display_name, NOW(), NOW()
FROM fansub_group_members fgm
JOIN app_users au ON au.id = fgm.app_user_id
WHERE ... -- mc.member_id IS NULL AND m_legacy.id IS NULL
RETURNING id;
```

---

### `database/migrations/0105_anime_contributions_member_id.up.sql` (migration, batch)

**Analog:** `database/migrations/0086_anime_contributions.up.sql`

**Existing schema reference** (0086 lines 8):
```sql
fansub_group_member_id     BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE RESTRICT
```

**New column + backfill + constraint pattern** (RESEARCH.md Z. 238–256):
```sql
-- Schritt A: neue Spalte member_id nullable
ALTER TABLE anime_contributions
  ADD COLUMN IF NOT EXISTS member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT;

-- Schritt B: Backfill via JOIN auf hist_fansub_group_members.member_id
UPDATE anime_contributions ac
SET member_id = hfgm.member_id
FROM hist_fansub_group_members hfgm
WHERE hfgm.id = ac.fansub_group_member_id;

-- Schritt C: NOT NULL setzen
ALTER TABLE anime_contributions ALTER COLUMN member_id SET NOT NULL;

-- Schritt D: Neuer Unique-Key auf member_id
ALTER TABLE anime_contributions DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
  ADD CONSTRAINT uq_anime_contribution_member
  UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, member_id, release_version_id);

-- Schritt E: alten fansub_group_member_id NOT-NULL-Constraint ablösen (nullable machen)
ALTER TABLE anime_contributions ALTER COLUMN fansub_group_member_id DROP NOT NULL;
```

**Existing UNIQUE NULLS NOT DISTINCT pattern** (0091 reference from RESEARCH.md):
```sql
UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)
```

---

### `database/migrations/0106_fansub_group_member_roles_fk.up.sql` (migration, batch)

**Analog:** `database/migrations/0074_expand_fansub_group_member_roles.up.sql`

**Existing CHECK constraint to drop** (0074 lines 1–19):
```sql
ALTER TABLE fansub_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_fansub_group_member_roles_role;
```

**New FK pattern** (RESEARCH.md Z. 303–307):
```sql
-- Typ angleichen: role VARCHAR(40) → TEXT (zukunftssicher)
ALTER TABLE fansub_group_member_roles ALTER COLUMN role TYPE TEXT;

-- FK auf role_definitions(code) statt hartkodiertem CHECK
ALTER TABLE fansub_group_member_roles
  ADD CONSTRAINT fk_fansub_group_member_roles_role_code
  FOREIGN KEY (role) REFERENCES role_definitions(code) ON DELETE RESTRICT;
```

---

### `database/migrations/0107_fansub_group_default_crew.up.sql` (migration, CRUD)

**Analog:** `database/migrations/0082_historical_fansub_group_members.up.sql` (lines 1–28)

**Neue Tabelle — CREATE TABLE pattern** (0082 lines 4–19):
```sql
CREATE TABLE IF NOT EXISTS fansub_group_default_crew (
    id               BIGSERIAL PRIMARY KEY,
    fansub_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id        BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_code        TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    created_by       BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_default_crew UNIQUE (fansub_group_id, member_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_default_crew_group
    ON fansub_group_default_crew(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_default_crew_member
    ON fansub_group_default_crew(member_id);
```

---

### `backend/internal/repository/anime_contributions_repository.go` (repository, CRUD — modify)

**Analog:** self

**Existing DisplayRow struct** (lines 18–31) — `FansubGroupMemberID` muss auf `MemberID` umgestellt werden:
```go
// ALT (lines 18-31):
type AnimeContributionDisplayRow struct {
    ID                  int64  `json:"id"`
    FansubGroupMemberID int64  `json:"fansub_group_member_id"`
    MemberDisplayName   string `json:"member_display_name"`
    // ...
}

// NEU: FansubGroupMemberID → MemberID (Breaking Change — Frontend-Typ analog migrieren)
type AnimeContributionDisplayRow struct {
    ID                  int64  `json:"id"`
    MemberID            int64  `json:"member_id"`
    MemberDisplayName   string `json:"member_display_name"`
    // ...
}
```

**Existing MemberBelongsToFansub** (lines 44–57) — erweitern auf App-Member:
```go
// ALT: nur hist_fansub_group_members prüfen
SELECT EXISTS(
    SELECT 1 FROM hist_fansub_group_members
    WHERE id = $1 AND fansub_group_id = $2
)

// NEU: member_id aus members gegen beide Quellen prüfen
SELECT EXISTS(
    SELECT 1 FROM hist_fansub_group_members
    WHERE member_id = $1 AND fansub_group_id = $2
    UNION ALL
    SELECT 1 FROM fansub_group_members
    WHERE member_id = $1 AND fansub_group_id = $2
)
```

**Existing JOIN-Pattern für DisplayRow** (lines 87–117) — nach Migration auf member_id umstellen:
```go
// ALT JOIN (line 93-95):
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
JOIN members m ON m.id = hfgm.member_id

// NEU: direkt über ac.member_id
JOIN members m ON m.id = ac.member_id
```

**Neuer UnifiedGroupMember-List-Method** (analog zu HistGroupMembersRepository.ListByFansub):
```go
type UnifiedGroupMember struct {
    MemberID      int64    `json:"member_id"`
    DisplayName   string   `json:"display_name"`
    Source        string   `json:"source"`        // "hist" | "app"
    HasAppAccount bool     `json:"has_app_account"`
    GroupRoles    []string `json:"group_roles"`
}

func (r *HistGroupMembersRepository) ListUnifiedByFansub(
    ctx context.Context, fansubGroupID int64,
) ([]UnifiedGroupMember, error) {
    // UNION ALL: hist_fansub_group_members + fansub_group_members → beide via members.id
}
```

---

### `backend/internal/repository/anime_contributions_upsert_repository.go` (repository, CRUD — modify)

**Analog:** self

**Existing Upsert INSERT** (lines 54–94) — `fansub_group_member_id` durch `member_id` ersetzen:
```go
// ALT INSERT-Spalten (lines 56-70):
INSERT INTO anime_contributions (
    fansub_group_id,
    anime_id,
    fansub_group_member_id,  -- ← ALT
    ...
)
ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)

// NEU:
INSERT INTO anime_contributions (
    fansub_group_id,
    anime_id,
    member_id,               -- ← NEU
    ...
)
ON CONFLICT (fansub_group_id, anime_id, member_id, release_version_id)
```

**Existing Transaction pattern** (lines 47–128) — unverändert übernehmen:
```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil { return nil, fmt.Errorf("...: begin tx: %w", err) }
defer tx.Rollback(ctx)
// ... upsert → delete roles → insert roles ...
if err := tx.Commit(ctx); err != nil { return nil, fmt.Errorf("...: commit: %w", err) }
return r.GetByIDWithDisplay(ctx, newID)
```

---

### `backend/internal/handlers/fansub_anime_contributions_handler.go` (handler, request-response — modify)

**Analog:** self + `backend/internal/handlers/fansub_hist_group_members_handler.go`

**Handler-Struct pattern** (lines 18–38) — Neuen `defaultCrewRepo` Parameter ergänzen falls Standard-Team-Endpoint im selben Handler:
```go
type FansubAnimeContributionsHandler struct {
    contributionsRepo *repository.AnimeContributionsRepository
    rolesRepo         *repository.HistGroupMemberRolesRepository
    permissionSvc     *permissions.Service
    auditLogRepo      *repository.AuditLogRepository
    badgeService      *services.BadgeService
}
```

**Permission-Guard pattern** (lines 50–76) — unverändert kopieren:
```go
identity, actor, ok := permissionActorFromContext(c)
if !ok { return }

fansubID, err := parseFansubID(c.Param("id"))
if err != nil { badRequest(c, "ungültige fansub id"); return }

result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "...", &fansubID, "...", nil, permissions.ActionFansubGroupMembersView, result)
    writePermissionDenied(c, result)
    return
}
```

**Cross-group guard NACH Migration** (lines 131–144):
```go
// ALT: prüft hist_fansub_group_members.id = req.FansubGroupMemberID
belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.FansubGroupMemberID, fansubID)

// NEU: prüft members.id = req.MemberID via UNION (hist + app)
belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.MemberID, fansubID)
```

**Audit-Log pattern** (lines 218–228) — unverändert:
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "anime_contribution.created",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "anime_contribution",
    TargetID:       &item.ID,
    Action:         string(permissions.ActionFansubGroupMembersManage),
    Outcome:        "allowed",
    Payload:        map[string]any{"status": status},
})
```

**Neuer `ListUnifiedGroupMembers`-Handler** (analog zu ListAnimeContributions, lines 49–86):
```go
// GET /admin/fansubs/:id/unified-members
func (h *FansubAnimeContributionsHandler) ListUnifiedGroupMembers(c *gin.Context) {
    identity, actor, ok := permissionActorFromContext(c)
    if !ok { return }
    fansubID, err := parseFansubID(c.Param("id"))
    if err != nil { badRequest(c, "ungültige fansub id"); return }
    // CanForFansubGroup(MembersView) ...
    items, err := h.histMembersRepo.ListUnifiedByFansub(c.Request.Context(), fansubID)
    // ...
    c.JSON(http.StatusOK, gin.H{"data": items})
}
```

---

### `backend/internal/handlers/fansub_contributions_validation.go` (utility, request-response — modify)

**Analog:** self

**Request-DTO pattern** (lines 31–41) — `FansubGroupMemberID` → `MemberID`:
```go
// ALT (line 32):
type animeContributionCreateRequest struct {
    FansubGroupMemberID     int64    `json:"fansub_group_member_id"`
    ...
}

// NEU:
type animeContributionCreateRequest struct {
    MemberID                int64    `json:"member_id"`
    ...
}
```

**Validation-map pattern** (lines 23–29) — unverändert:
```go
var validContributionStatuses = map[string]struct{}{
    "draft":     {},
    "proposed":  {},
    "confirmed": {},
    "disputed":  {},
    "hidden":    {},
}
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (component, request-response — modify)

**Analog:** self

**MAIN_TABS-Pattern** (page.tsx lines 190–199) — `anime-projekte` entfernen:
```typescript
// ALT:
const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  ...
  { key: "anime-projekte", label: "Anime-Einblicke" },  // ← ENTFERNEN
  ...
]

// NEU: ohne anime-projekte; SectionKey Union-Typ ebenfalls bereinigen
```

**parseMainTab — Legacy-Redirect pattern** (lines 201–204):
```typescript
function parseMainTab(value: string | null): MainTab {
  if (value === "rollen" || value === "mitglieder" || value === "claims") return "collaboration";
  if (value === "anime-projekte") return "releases";  // ← NEU ergänzen (D-13)
  return MAIN_TABS.some((tab) => tab.key === value) ? (value as MainTab) : "basic";
}
```

**Tab-Navigation pattern** (lines 1147–1165) — für handleMainTabChange unverändert:
```typescript
const handleMainTabChange = useCallback(
  (tab: MainTab) => {
    if (!canUseMainTab(tab, isPlatformAdmin, capabilities)) return;
    setActiveMainTab(tab);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (tab === "basic") { nextSearchParams.delete("tab"); }
    else { nextSearchParams.set("tab", tab); }
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [capabilities, isPlatformAdmin, pathname, router, searchParams],
);
```

**Projektkarte-Render-Pattern** (page.tsx lines 2706–3279):
```typescript
// Bestehende Struktur (additiv erweitern, nicht ersetzen):
<article key={releaseGroup.key} className={fansubEditAnimeReleaseCard}>
  <div className={fansubEditAnimeReleaseHeaderRow}>
    <button>  {/* Klapptrigger */}
      <Image /> <h3>{title}</h3> <span>{releaseCountLabel}</span>
    </button>
    {/* NEU: Status-Badges-Komponente additiv */}
    <ProjectCockpitBadges contributions={contributions} note={note} />
    {canOpenReleaseContributors ? <Button>Mitwirkende</Button> : null}
    {/* NEU: Einblick-Button additiv */}
  </div>
  {animeExpanded && (
    <>
      {/* NEU: AnimeProjectNoteWorkspace vor Releases-Liste */}
      <AnimeProjectNoteWorkspace fansubId={fansubId} animeId={animeId} />
      {/* bestehende Releases-Liste */}
    </>
  )}
</article>
```

**openAnimeContributions-Flow** (page.tsx lines 1736–1752) — `listGroupMembers` auf neuen Endpoint umstellen:
```typescript
// ALT: listGroupMembers(fansubID) → HistFansubGroupMember[] (nur hist)
// NEU: listUnifiedGroupMembers(fansubID) → UnifiedGroupMember[] (hist + app)
const [membersResult, contributionsResult] = await Promise.all([
  listUnifiedGroupMembers(fansubID),
  listAnimeContributions(fansubID, animeId),
])
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (component, request-response — modify)

**Analog:** self

**Imports pattern** (lines 1–19) — unverändert:
```typescript
import { Badge, Button, Card, EmptyState, FormField, Modal, Select } from '@/components/ui'
import { ApiError, deleteAnimeContribution, ... } from '@/lib/api'
import type { AnimeContribution, HistFansubGroupMember } from '@/types/fansub'
```

**State-Initialisierung aus existingContributions** (lines 76–92):
```typescript
// ALT: ids.add(contribution.fansub_group_member_id)
// NEU: ids.add(contribution.member_id)
for (const contribution of existingContributions) {
  ids.add(contribution.member_id)  // ← member_id statt fansub_group_member_id
  roles[contribution.member_id] = contribution.role_codes ?? []
  ...
}
```

**Member-Prop-Typ** (line 37) — `HistFansubGroupMember[]` → `UnifiedGroupMember[]`:
```typescript
// ALT: members: HistFansubGroupMember[]
// NEU: members: UnifiedGroupMember[]  (member_id als key statt id)
type Props = {
  ...
  members: UnifiedGroupMember[]
  ...
}
```

**Upsert-Call** (line 187–197) — `fansub_group_member_id` → `member_id`:
```typescript
await upsertAnimeContribution(fansubId, animeId, {
  member_id: memberId,  // ← NEU
  role_codes: rolesByMemberId[memberId] ?? [],
  ...
})
```

**Modal + FormField + Select pattern** (lines 229–357) — als Vorlage für neue Komponenten:
```typescript
<Modal open onClose={onClose} title="..." footer={...}>
  <div className={styles.memberList}>
    {members.map((member) => (
      <Card key={member.member_id} variant={isSelected ? 'nested' : 'nestedFlat'}>
        <FormField label="Status">
          <Select value={...} onChange={...}>
            <option value="draft">Entwurf</option>
          </Select>
        </FormField>
      </Card>
    ))}
  </div>
</Modal>
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` (component, request-response — migrate + refactor)

**Analog:** self

**PFLICHT-MIGRATION: native → UI-Primitives** (lines 116–125 und 216–240):
```typescript
// ALT (lines 115, 121 — native button):
<button type="button" className={styles.button} onClick={onEdit}>
  <Pencil size={14} />Bearbeiten
</button>
<button type="button" onClick={onDelete}>
  <Trash2 size={14} />{deleting ? 'Löschen...' : 'Löschen'}
</button>

// NEU — Button aus @/components/ui:
<Button variant="ghost" size="sm" onClick={onEdit} disabled={deleting}>
  <Pencil size={14} />Bearbeiten
</Button>
<Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
  <Trash2 size={14} />{deleting ? 'Löschen...' : 'Löschen'}
</Button>
```

```typescript
// ALT (lines 216–238 — native select):
<select value={form.visibility} onChange={...}>
  <option value="internal">Intern</option>
  <option value="public">Öffentlich</option>
</select>
<select value={form.status} onChange={...}>
  <option value="draft">Entwurf</option>
  ...
</select>

// NEU — Select + FormField aus @/components/ui:
<FormField label="Sichtbarkeit">
  <Select value={form.visibility} onChange={(e) => setForm((c) => ({ ...c, visibility: e.target.value as NoteVisibility }))}>
    <option value="internal">Intern</option>
    <option value="public">Öffentlich</option>
  </Select>
</FormField>
<FormField label="Status">
  <Select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as NoteStatus }))}>
    <option value="draft">Entwurf</option>
    <option value="published">Veröffentlicht</option>
    <option value="archived">Archiviert</option>
    <option value="deleted">Gelöscht</option>
  </Select>
</FormField>
```

**RichTextEditor + RichTextRenderer pattern** (lines 4, 109, 195–200):
```typescript
import { RichTextEditor, RichTextRenderer } from '@/components/editor'

// Rendern:
{note.bodyHtml?.trim() ? <RichTextRenderer bodyHtml={note.bodyHtml} /> : null}

// Bearbeiten:
<RichTextEditor
  value={ensureRichTextValue(form.bodyJson)}
  onChange={(next) => setForm((c) => ({ ...c, bodyJson: next }))}
  placeholder={ANIME_PROJECT_NOTE_PLACEHOLDER}
  mode="longform"
  minHeight={240}
/>
```

**API-Helper-Pattern** (lines 8–14):
```typescript
import {
  getAnimeFansubProjectNote,
  upsertAnimeFansubProjectNote,
  deleteAnimeFansubProjectNote,
} from '@/lib/api'
```

**Zustandsmaschine** (lines 140–165):
```typescript
// NICHT_GELADEN → LADEN → VORHANDEN | FEHLT | FEHLER
const [saving, setSaving] = useState(false)
const [saveError, setSaveError] = useState<string | null>(null)

async function handleSave() {
  setSaving(true)
  setSaveError(null)
  try {
    const saved = await upsertAnimeFansubProjectNote(fansubId, anime.id, payload)
    onSaved(saved)
  } catch (err) {
    setSaveError(err instanceof ApiError ? err.message : 'Fehler beim Speichern.')
  } finally {
    setSaving(false)
  }
}
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.tsx` (component, request-response — NEU)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (imports-Pattern) + ReadinessTab.tsx (Badge-Pattern)

**Imports pattern** (von AnimeContributionModal.tsx lines 1–5):
```typescript
'use client'

import { Badge } from '@/components/ui'
import type { AnimeContribution } from '@/types/fansub'
import type { AnimeFansubProjectNote } from '@/types/fansubNotes'
```

**Badge-Variant-Mapping** (UI-SPEC Badge-Farben):
```typescript
// Analog zu ReadinessTab.tsx Badge-Usage (ReadinessTab.tsx lines 8-14)
import { Badge } from '@/components/ui'

// Projekt-Status-Badges:
// Einblick vorhanden: <Badge variant="success">Einblick vorhanden</Badge>
// Einblick fehlt: <Badge variant="warning">Einblick fehlt</Badge>
// Mitwirkende > 0: <Badge variant="neutral">Mitwirkende ({n})</Badge>
// Mitwirkende = 0: <Badge variant="danger">Mitwirkende fehlen</Badge>
// Folgen: <Badge variant="muted">{n} Folgen</Badge>
```

**Props-Interface** (< 450 Zeilen, abgeleitet aus AnimeContributionModal Props-Pattern):
```typescript
type Props = {
  contributionCount: number
  note: AnimeFansubProjectNote | null | undefined  // undefined = noch nicht geladen (lazy)
  episodeCount?: number
}

export function ProjectCockpitBadges({ contributionCount, note, episodeCount }: Props) {
  return (
    <div className={styles.chipRow}>  {/* FansubEdit.module.css .chipRow */}
      {episodeCount !== undefined ? <Badge variant="muted">{episodeCount} Folgen</Badge> : null}
      {contributionCount > 0
        ? <Badge variant="neutral">Mitwirkende ({contributionCount})</Badge>
        : <Badge variant="danger">Mitwirkende fehlen</Badge>}
      {note !== undefined && (
        note !== null
          ? <Badge variant="success">Einblick vorhanden</Badge>
          : <Badge variant="warning">Einblick fehlt</Badge>
      )}
    </div>
  )
}
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx` (component, request-response — NEU)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` (VOLLSTÄNDIG als Vorlage)

**Imports pattern** (AnimeProjectNotesSection.tsx lines 1–19):
```typescript
'use client'

import { useEffect, useState } from 'react'
import { Pencil, Save, Trash2 } from 'lucide-react'

import { RichTextEditor, RichTextRenderer } from '@/components/editor'
import { Button, Card, EmptyState, ErrorState, FormField, SectionHeader, Select } from '@/components/ui'
import {
  ApiError,
  getAnimeFansubProjectNote,
  upsertAnimeFansubProjectNote,
} from '@/lib/api'
import type { AnimeFansubProjectNote, UpsertAnimeFansubProjectNoteRequest } from '@/types/fansubNotes'

import styles from './FansubEdit.module.css'
```

**Lazy-Load-Pattern beim Aufklappen** (anzuwenden auf onExpand):
```typescript
// Lazy: laden erst wenn aufgeklappt (D-12, UI-SPEC Z. 229-231)
useEffect(() => {
  if (!expanded) return
  let cancelled = false
  setNoteState('loading')
  getAnimeFansubProjectNote(fansubId, animeId)
    .then((note) => { if (!cancelled) setNote(note); setNoteState(note ? 'present' : 'missing') })
    .catch(() => { if (!cancelled) setNoteState('error') })
  return () => { cancelled = true }
}, [expanded, fansubId, animeId])
```

**Zustandsmaschine-States** (UI-SPEC Z. 236–253):
```typescript
type NoteLoadState = 'idle' | 'loading' | 'present' | 'missing' | 'editing' | 'error'
```

**EmptyState-Pattern** (analog zu AnimeContributionModal lines 247–249):
```typescript
<EmptyState
  title="Projekt-Einblick fehlt"
  description="Noch kein Einblick für dieses Projekt vorhanden."
  action={<Button variant="primary" size="sm" onClick={() => setNoteState('editing')}>Einblick hinzufügen</Button>}
/>
```

**SectionHeader-Pattern** (von ReadinessTab.tsx import):
```typescript
<SectionHeader>Projekt-Einblick</SectionHeader>
```

---

## Shared Patterns

### Permission-Guard (alle Backend-Handler)
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go` lines 50–76
```go
identity, actor, ok := permissionActorFromContext(c)
if !ok { return }

fansubID, err := parseFansubID(c.Param("id"))
if err != nil { badRequest(c, "ungültige fansub id"); return }

result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
    permissions.ActionFansubGroupMembersView, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed {
    auditPermissionDenied(...)
    writePermissionDenied(c, result)
    return
}
```

### Audit-Log-Write (alle mutierenden Backend-Handler)
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go` lines 218–228
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "anime_contribution.created",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "anime_contribution",
    TargetID:       &item.ID,
    Action:         string(permissions.ActionFansubGroupMembersManage),
    Outcome:        "allowed",
    Payload:        map[string]any{},
})
```

### Error-Handling Backend (alle Handler)
**Quelle:** `backend/internal/handlers/fansub_anime_contributions_handler.go` lines 196–215
```go
if errors.Is(err, repository.ErrConflict) {
    c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "..."}})
    return
}
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "..."}})
    return
}
if err != nil {
    log.Printf("...: repo error: %v", err)
    internalError(c, "interner serverfehler")
    return
}
```

### authorizedFetch + ApiError-Pattern (alle Frontend-API-Calls)
**Quelle:** `frontend/src/lib/api.ts` lines 7241–7266 (`listGroupMembers`)
```typescript
export async function listUnifiedGroupMembers(fansubId: number, authToken?: string) {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/unified-members`,
    { authToken },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json()
}
```

### Tab-Navigation (alle Frontend-Tab-Redirect-Logik)
**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx` lines 51–59
```typescript
function useTabNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (tab: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', tab)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
}
```

### UI-Primitives Import (alle neuen/modifizierten Frontend-Komponenten)
**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` line 5
```typescript
import { Badge, Button, Card, EmptyState, ErrorState, FormField, Modal, SectionHeader, Select } from '@/components/ui'
```

### CSS-Klassen aus FansubEdit.module.css (Layout)
**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` lines 22–23
```typescript
import fansubEditStyles from './FansubEdit.module.css'
const styles = { ...sharedStyles, ...fansubEditStyles }
// Relevante Klassen: .chipRow, .fansubEditAnimeReleaseHeaderRow, .fansubEditAnimeReleaseCard
```

---

## No Analog Found

Alle Dateien haben Analogs. Keine Datei ohne Analog.

---

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`, `database/migrations/`, `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/lib/api.ts`, `frontend/src/types/`
**Files scanned:** 18
**Pattern extraction date:** 2026-06-11
