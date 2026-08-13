# Phase 97: Rollen-Lifecycle — Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 12 neue/geänderte Dateien
**Analogs found:** 12 / 12

---

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Nächstes Analog | Match-Qualität |
|---|---|---|---|---|
| `database/migrations/0114_hist_roles_date_migration.up.sql` | migration | transform | `database/migrations/0112_role_model_cleanup.up.sql` | exact |
| `database/migrations/0114_hist_roles_date_migration.down.sql` | migration | transform | `database/migrations/0112_role_model_cleanup.up.sql` | role-match |
| `database/migrations/0115_active_roles_tenure_date.up.sql` | migration | transform | `database/migrations/0083_hist_group_member_roles.up.sql` | role-match |
| `database/migrations/0115_active_roles_tenure_date.down.sql` | migration | transform | `database/migrations/0083_hist_group_member_roles.up.sql` | role-match |
| `backend/internal/repository/hist_group_member_roles_repository.go` | repository | CRUD | (self — modify) | exact |
| `backend/internal/repository/hist_group_members_repository.go` | repository | CRUD | (self — modify) | exact |
| `backend/internal/repository/fansub_group_app_members_repository.go` | repository | CRUD | (self — modify, D-10-Archiv + SetRole) | exact |
| `backend/internal/repository/member_claims_repository.go` | repository | request-response | (self — modify, VerifyClaim erweitern) | exact |
| `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` | handler | request-response | (self — modify DTOs) | exact |
| `backend/internal/handlers/fansub_hist_group_members_handler.go` | handler | request-response | (self — modify DTOs) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` | component | request-response | (self — modify YearPicker→Input) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx` | component | request-response | (self — modify YearPicker→Input) | exact |
| `frontend/src/types/fansub.ts` | type | — | (self — modify year→date Felder) | exact |

---

## Pattern Assignments

### `database/migrations/0114_hist_roles_date_migration.up.sql` (migration, transform)

**Analog:** `database/migrations/0112_role_model_cleanup.up.sql`

**Struktur-Muster** (0112, Zeilen 1–41):
```sql
-- Kritische Reihenfolge: Constraints droppen VOR Spalten-Drop.
-- CHECK-Constraints, die Spalten referenzieren, erst via DROP CONSTRAINT entfernen.
BEGIN;

-- Schritt N: Operation beschreiben
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;

-- Schritt N+1: Bestandsdaten transformieren
UPDATE ... SET neue_spalte = MAKE_DATE(alte_spalte, 1, 1) WHERE alte_spalte IS NOT NULL;

-- Schritt N+2: Alten Constraint droppen, neuen anlegen
ALTER TABLE ...
    DROP CONSTRAINT IF EXISTS chk_..._years,
    ADD CONSTRAINT chk_..._dates CHECK (...);

-- Schritt N+3: Alte Spalten droppen (erst nach Constraint-Drop)
ALTER TABLE ... DROP COLUMN IF EXISTS ...;

COMMIT;
```

**Constraint-Namen aus 0082/0083** (gelesen direkt):
- `hist_group_member_roles`: `chk_hist_group_member_roles_years` (Zeile 20 in 0083)
- `hist_fansub_group_members`: `chk_hist_fansub_group_members_years` (Zeile 18 in 0082)

**Vollständiges Migrations-Muster für 0114 up** (aus RESEARCH.md Pattern 1, VERIFIED):
```sql
BEGIN;

-- 1. Neue DATE-Spalten in hist_group_member_roles
ALTER TABLE hist_group_member_roles
    ADD COLUMN IF NOT EXISTS started_date DATE NULL,
    ADD COLUMN IF NOT EXISTS ended_date   DATE NULL;

UPDATE hist_group_member_roles
SET started_date = MAKE_DATE(started_year, 1, 1)
WHERE started_year IS NOT NULL;

UPDATE hist_group_member_roles
SET ended_date = MAKE_DATE(ended_year, 1, 1)
WHERE ended_year IS NOT NULL;

ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_years,
    ADD CONSTRAINT chk_hist_group_member_roles_dates
        CHECK (ended_date IS NULL OR started_date IS NULL OR ended_date >= started_date);

ALTER TABLE hist_group_member_roles
    DROP COLUMN IF EXISTS started_year,
    DROP COLUMN IF EXISTS ended_year;

-- 2. Neue DATE-Spalten in hist_fansub_group_members
ALTER TABLE hist_fansub_group_members
    ADD COLUMN IF NOT EXISTS joined_date DATE NULL,
    ADD COLUMN IF NOT EXISTS left_date   DATE NULL;

UPDATE hist_fansub_group_members
SET joined_date = MAKE_DATE(joined_year, 1, 1) WHERE joined_year IS NOT NULL;

UPDATE hist_fansub_group_members
SET left_date = MAKE_DATE(left_year, 1, 1) WHERE left_year IS NOT NULL;

ALTER TABLE hist_fansub_group_members
    DROP CONSTRAINT IF EXISTS chk_hist_fansub_group_members_years,
    ADD CONSTRAINT chk_hist_fansub_group_members_dates
        CHECK (left_date IS NULL OR joined_date IS NULL OR left_date >= joined_date);

ALTER TABLE hist_fansub_group_members
    DROP COLUMN IF EXISTS joined_year,
    DROP COLUMN IF EXISTS left_year;

COMMIT;
```

**Down-Migration-Muster** (Rückkonvertierung via EXTRACT):
```sql
BEGIN;
ALTER TABLE hist_group_member_roles
    ADD COLUMN IF NOT EXISTS started_year INT NULL,
    ADD COLUMN IF NOT EXISTS ended_year   INT NULL;
UPDATE hist_group_member_roles
    SET started_year = EXTRACT(YEAR FROM started_date)::INT WHERE started_date IS NOT NULL;
UPDATE hist_group_member_roles
    SET ended_year   = EXTRACT(YEAR FROM ended_date)::INT   WHERE ended_date   IS NOT NULL;
ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_dates,
    ADD CONSTRAINT chk_hist_group_member_roles_years
        CHECK (ended_year IS NULL OR started_year IS NULL OR ended_year >= started_year);
ALTER TABLE hist_group_member_roles
    DROP COLUMN IF EXISTS started_date,
    DROP COLUMN IF EXISTS ended_date;
-- analog für hist_fansub_group_members ...
COMMIT;
```

---

### `database/migrations/0115_active_roles_tenure_date.up.sql` (migration, transform)

**Analog:** `database/migrations/0083_hist_group_member_roles.up.sql` (additive ALTER TABLE)

**Muster** (RESEARCH.md Pattern 2):
```sql
-- Migration 0115: tenure_started_on DATE NULL in fansub_group_member_roles.
-- NULL für Bestandszeilen; neue Zeilen werden beim SetRole-Schreibpfad befüllt.
ALTER TABLE fansub_group_member_roles
    ADD COLUMN IF NOT EXISTS tenure_started_on DATE NULL;
```

**Down:**
```sql
ALTER TABLE fansub_group_member_roles
    DROP COLUMN IF EXISTS tenure_started_on;
```

---

### `backend/internal/repository/hist_group_member_roles_repository.go` (repository, CRUD)

**Analog:** self (bestehende Datei)

**Aktueller Struct** (Zeilen 14–28, zu ändern):
```go
type HistGroupMemberRoleRow struct {
    ID                      int64
    HistFansubGroupMemberID int64
    RoleCode                string
    StartedYear             *int       // → *time.Time (StartedDate)
    EndedYear               *int       // → *time.Time (EndedDate)
    Status                  string
    Visibility              string
    ConfirmedBy             *int64
    ConfirmedAt             *time.Time
    SourceNote              *string
    CreatedBy               *int64
    CreatedAt               time.Time
    UpdatedAt               time.Time
}
```

**Nach Migration — Zielmuster:**
```go
type HistGroupMemberRoleRow struct {
    ID                      int64
    HistFansubGroupMemberID int64
    RoleCode                string
    StartedDate             *time.Time  // war StartedYear *int
    EndedDate               *time.Time  // war EndedYear *int
    Status                  string
    Visibility              string
    ConfirmedBy             *int64
    ConfirmedAt             *time.Time
    SourceNote              *string
    CreatedBy               *int64
    CreatedAt               time.Time
    UpdatedAt               time.Time
}
```

**Input-Struct** (Zeilen 30–39, analog anpassen):
```go
type HistGroupMemberRoleInput struct {
    HistFansubGroupMemberID int64
    RoleCode                string
    StartedDate             *time.Time  // war StartedYear *int
    EndedDate               *time.Time  // war EndedYear *int
    Status                  string
    Visibility              string
    SourceNote              *string
    CreatedBy               *int64
}
```

**Patch-Struct** (Zeilen 41–47, doppelter Pointer bleibt, nur Typen):
```go
type HistGroupMemberRolePatchInput struct {
    StartedDate **time.Time  // war **int
    EndedDate   **time.Time  // war **int
    Status      *string
    Visibility  *string
    SourceNote  **string
}
```

**Display-Struct** (Zeilen 59–70, JSON-Tags auf date umbenennen):
```go
type HistGroupMemberRoleDisplayRow struct {
    ID                  int64      `json:"id"`
    FansubGroupMemberID int64      `json:"fansub_group_member_id"`
    MemberDisplayName   string     `json:"member_display_name"`
    RoleCode            string     `json:"role_code"`
    RoleLabel           *string    `json:"role_label"`
    StartedDate         *time.Time `json:"started_date"`   // war started_year
    EndedDate           *time.Time `json:"ended_date"`     // war ended_year
    Note                *string    `json:"note"`
    Status              string     `json:"status"`
    CreatedAt           time.Time  `json:"created_at"`
}
```

**SQL-Muster für Queries** — alle SELECT/INSERT/RETURNING anpassen (Zeilen 74–113, 116–182, 187–229, 345–368, 413–441):
- `started_year` → `started_date`
- `ended_year` → `ended_date`
- `ORDER BY COALESCE(r.started_year, 9999)` → `ORDER BY COALESCE(r.started_date, '9999-01-01'::date)`

**Create-SQL** (Zeile 348, zu ändern):
```go
err := r.db.QueryRow(ctx, `
    INSERT INTO hist_group_member_roles
        (hist_fansub_group_member_id, role_code, started_date, ended_date, status, visibility, source_note, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, hist_fansub_group_member_id, role_code, started_date, ended_date,
              status, visibility, confirmed_by, confirmed_at, source_note, created_by, created_at, updated_at
`, ...)
```

**Dynamisches Update** (Zeilen 371–441) — dasselbe String-Interpolations-Muster, nur Feldnamen:
```go
if input.StartedDate != nil {
    setClauses = append(setClauses, fmt.Sprintf("started_date = $%d", argIdx))
    args = append(args, *input.StartedDate)
    argIdx++
}
```

---

### `backend/internal/repository/hist_group_members_repository.go` (repository, CRUD)

**Analog:** self (bestehende Datei)

**Aktueller Struct** (Zeilen 14–27, zu ändern):
```go
type HistGroupMemberRow struct {
    ID            int64
    FansubGroupID int64
    MemberID      int64
    JoinedYear    *int       // → *time.Time (JoinedDate)
    LeftYear      *int       // → *time.Time (LeftDate)
    ...
}
```

**Patch-Struct** (Zeilen 40–47):
```go
type HistGroupMemberPatchInput struct {
    JoinedDate  **time.Time  // war **int
    LeftDate    **time.Time  // war **int
    Status      *string
    Visibility  *string
    ConfirmedBy *int64
}
```

**Display-Struct** (Zeilen 58–72) JSON-Tags:
```go
JoinedDate  *time.Time `json:"joined_date"`   // war joined_year number
LeftDate    *time.Time `json:"left_date"`      // war left_year number
```

**Alle SQL-Strings**: `joined_year`→`joined_date`, `left_year`→`left_date`, `COALESCE(hfgm.joined_year, 9999)`→`COALESCE(hfgm.joined_date, '9999-01-01'::date)`.

**CreateWithAutoMember** (Zeilen 339–418) — Transaction-Muster bleibt erhalten, nur Feldnamen tauschen:
```go
// INSERT-Werte für joined_date / left_date statt joined_year / left_year
input.JoinedDate,  // *time.Time — pgx v5 scannt time.Time direkt auf DATE
input.LeftDate,
```

---

### `backend/internal/repository/fansub_group_app_members_repository.go` (repository, CRUD)

**Analog:** self (bestehende Datei, D-10 Auto-Archivierung anpassen)

**Aktueller D-10-Archivierungs-INSERT** (Zeilen 438–443, zu ändern):
```go
_, _ = r.db.Exec(ctx,
    `INSERT INTO hist_group_member_roles
     (hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
     VALUES ($1, $2, $3, $4, 'ended', 'internal')
     ON CONFLICT DO NOTHING`,
    histMemberID, role, roleCreatedAt.Year(), time.Now().Year())
```

**Ziel-Muster nach Migration** (DATE statt INT):
```go
startedDate := roleCreatedAt.Truncate(24 * time.Hour)
endedDate   := time.Now().UTC().Truncate(24 * time.Hour)
_, _ = r.db.Exec(ctx,
    `INSERT INTO hist_group_member_roles
     (hist_fansub_group_member_id, role_code, started_date, ended_date, status, visibility)
     VALUES ($1, $2, $3, $4, 'ended', 'internal')
     ON CONFLICT DO NOTHING`,
    histMemberID, role, startedDate, endedDate)
```

**SetRole Enable-INSERT** (Zeilen 399–405) — neu: tenure_started_on befüllen:
```go
if _, err := r.db.Exec(ctx, `
    INSERT INTO fansub_group_member_roles
        (fansub_group_member_id, role, created_by_app_user_id, tenure_started_on, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (fansub_group_member_id, role) DO NOTHING
`, memberID, role, input.CreatedByAppUserID, time.Now().UTC().Truncate(24*time.Hour)); err != nil { ... }
```

---

### `backend/internal/repository/member_claims_repository.go` (repository, request-response)

**Analog:** self (VerifyClaim erweitern)

**Bestehende VerifyClaim-Signatur** (Zeile 175):
```go
func (r *MemberClaimsRepository) VerifyClaim(ctx context.Context, fansubGroupID int64, claimID int64, verifiedByAppUserID int64) error {
```

**Bestehende Transaktion** (Zeilen 180–238): BeginTx → SELECT FOR UPDATE (memberID) → alreadyVerified-Check → UPDATE member_claims → UPDATE members.noindex → Commit.

**Neue Methode einzufügen** (nach Commit oder als separater tx-Schritt, Einstiegspunkt Z. 234):
```go
// ResolvePendingRolesToActive liest hist_group_member_roles ohne ended_date
// für einen member und schreibt aktive fansub_group_member_roles.
// Wird nach erfolgreichem VerifyClaim-Commit aufgerufen (D-05).
// fansub_lead und founder sind AUSGENOMMEN (Pitfall 8 + Assumption A1/A2).
func (r *MemberClaimsRepository) ResolvePendingRolesToActive(
    ctx context.Context,
    memberID int64,
    fansubGroupID int64,
    actorAppUserID int64,
) error {
    rows, err := r.db.Query(ctx, `
        SELECT r.role_code, hfgm.fansub_group_id
        FROM hist_group_member_roles r
        JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
        WHERE hfgm.member_id = $1
          AND hfgm.fansub_group_id = $2
          AND r.ended_date IS NULL
          AND r.role_code <> ALL(ARRAY['fansub_lead', 'founder'])
    `, memberID, fansubGroupID)
    // → für jede Zeile: INSERT INTO fansub_group_member_roles ON CONFLICT DO NOTHING
    // analog zum SetRole Enable-Muster (fansub_group_app_members_repository.go Z. 399-405)
```

**Fehlerbehandlungs-Muster** (kopieren von VerifyClaim, Zeilen 201–213):
```go
if alreadyVerified {
    return &ClaimMutationError{Code: "...", Message: "...", HTTPStatus: 409}
}
```

---

### `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` (handler, request-response)

**Analog:** self (bestehende Datei, DTOs anpassen)

**Bestehender Create-Request-Struct** (Zeilen 53–61, zu ändern):
```go
type histGroupMemberRoleCreateRequest struct {
    HistFansubGroupMemberID int64   `json:"hist_fansub_group_member_id"`
    RoleCode                string  `json:"role_code"`
    StartedYear             *int    `json:"started_year"`   // → StartedDate *string
    EndedYear               *int    `json:"ended_year"`     // → EndedDate *string
    Status                  string  `json:"status"`
    Visibility              string  `json:"visibility"`
    SourceNote              *string `json:"source_note"`
}
```

**Ziel:**
```go
type histGroupMemberRoleCreateRequest struct {
    HistFansubGroupMemberID int64   `json:"hist_fansub_group_member_id"`
    RoleCode                string  `json:"role_code"`
    StartedDate             *string `json:"started_date"`  // ISO 8601 "YYYY-MM-DD"
    EndedDate               *string `json:"ended_date"`    // ISO 8601 "YYYY-MM-DD"
    Status                  string  `json:"status"`
    Visibility              string  `json:"visibility"`
    SourceNote              *string `json:"source_note"`
}
```

**Date-Parsing-Muster** (neu, vor Repository-Call):
```go
// time.Parse schlägt bei invaliden Datums-Strings fehl → 400 BadRequest
var startedDate *time.Time
if req.StartedDate != nil && *req.StartedDate != "" {
    t, err := time.Parse("2006-01-02", *req.StartedDate)
    if err != nil {
        badRequest(c, "ungültiges started_date — Format YYYY-MM-DD erwartet")
        return
    }
    startedDate = &t
}
```

**Patch-Request** (Zeilen 63–69, analog):
```go
type histGroupMemberRolePatchRequest struct {
    StartedDate **string `json:"started_date"`
    EndedDate   **string `json:"ended_date"`
    Status      *string  `json:"status"`
    Visibility  *string  `json:"visibility"`
    SourceNote  **string `json:"source_note"`
}
```

**Permission-Guard-Muster** (Zeilen 89–113, unverändert kopieren):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "...", ...)
    writePermissionDenied(c, result)
    return
}
```

---

### `backend/internal/handlers/fansub_hist_group_members_handler.go` (handler, request-response)

**Analog:** self (bestehende Datei)

**Bestehender Create-Request** (Zeilen 51–58):
```go
type histGroupMemberCreateRequest struct {
    MemberID    int64  `json:"member_id"`
    DisplayName string `json:"display_name"`
    JoinedYear  *int   `json:"joined_year"`   // → JoinedDate *string
    LeftYear    *int   `json:"left_year"`     // → LeftDate *string
    Status      string `json:"status"`
    Visibility  string `json:"visibility"`
}
```

**Patch-Request** (Zeilen 60–65):
```go
type histGroupMemberPatchRequest struct {
    JoinedDate **string `json:"joined_date"`  // war JoinedYear **int
    LeftDate   **string `json:"left_date"`    // war LeftYear **int
    Status     *string  `json:"status"`
    Visibility *string  `json:"visibility"`
}
```

**Date-Parsing** — identisches Muster wie im Roles-Handler.

---

### `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` (component, request-response)

**Analog:** self (bestehende Datei)

**Bestehende Import-Zeile** (Zeile 1–11, zu ändern):
```tsx
import {
  Button,
  ErrorState,
  FormField,
  Modal,
  Select,
  Textarea,
  YearPicker,       // ← entfernen
} from '@/components/ui'
```

**Ziel-Import** (YearPicker raus, Input rein):
```tsx
import {
  Button,
  ErrorState,
  FormField,
  Input,            // ← neu
  Modal,
  Select,
  Textarea,
} from '@/components/ui'
```

**Bestehende Form-Fields** (Zeilen 20–26):
```ts
export type RoleFormFields = {
  memberId: string
  roleCode: string
  startedYear: string   // → startedDate: string (ISO)
  endedYear: string     // → endedDate: string (ISO)
  note: string
}
```

**Ziel:**
```ts
export type RoleFormFields = {
  memberId: string
  roleCode: string
  startedDate: string   // ISO "YYYY-MM-DD" oder ""
  endedDate: string     // ISO "YYYY-MM-DD" oder ""
  note: string
}
```

**Bestehende YearPicker-Blöcke** (Zeilen 131–151, zu ersetzen):
```tsx
<FormField label="Rolle von" htmlFor="member-role-started-year">
  <YearPicker ... />
</FormField>
<FormField label="Rolle bis" htmlFor="member-role-ended-year">
  <YearPicker ... />
</FormField>
```

**Zielmuster** (`<Input type="date" />` aus `@/components/ui` — Pflicht per CLAUDE.md):
```tsx
<FormField label="Rolle von" htmlFor="member-role-started-date">
  <Input
    id="member-role-started-date"
    type="date"
    value={roleForm.startedDate}
    onChange={(e) => setRoleForm((f) => ({ ...f, startedDate: e.target.value }))}
    aria-label="Rolle von"
  />
</FormField>
<FormField
  label="Rolle bis"
  htmlFor="member-role-ended-date"
  hint="Leer lassen, wenn die Person weiterhin aktiv in dieser Funktion ist."
>
  <Input
    id="member-role-ended-date"
    type="date"
    value={roleForm.endedDate}
    onChange={(e) => setRoleForm((f) => ({ ...f, endedDate: e.target.value }))}
    aria-label="Rolle bis"
  />
</FormField>
```

**Rollenauswahl-Muster** (Zeilen 115–129, unverändert beibehalten):
```tsx
<FormField label="Frühere Funktion in der Gruppe" htmlFor="member-role-role" required>
  <Select
    id="member-role-role"
    value={roleForm.roleCode}
    onChange={(e) => setRoleForm((f) => ({ ...f, roleCode: e.target.value }))}
    aria-label="Frühere Funktion auswählen"
  >
    {historyRoleOptions.map((option) => (
      <option key={option.code} value={option.code}>{option.label_de}</option>
    ))}
  </Select>
</FormField>
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx` (component, request-response)

**Analog:** self (bestehende Datei)

**Bestehende Import-Zeile** (Zeile 1–11, YearPicker entfernen):
```tsx
import { Button, ErrorState, FormField, Input, Modal, Select, YearPicker } from '@/components/ui'
// → YearPicker entfernen
```

**Bestehende MemberFormFields** (Zeile 19–24):
```ts
export type MemberFormFields = {
  displayName: string
  joinedYear: string   // → joinedDate: string (ISO)
  leftYear: string     // → leftDate: string (ISO)
  visibility: HistoricalContributionVisibility
}
```

**Ziel:**
```ts
export type MemberFormFields = {
  displayName: string
  joinedDate: string   // ISO "YYYY-MM-DD" oder ""
  leftDate: string     // ISO "YYYY-MM-DD" oder ""
  visibility: HistoricalContributionVisibility
}
```

**Bestehende YearPicker-Blöcke** (Zeilen 119–139, ersetzen):
```tsx
<YearPicker id="hist-member-joined-year" ... />
<YearPicker id="hist-member-left-year"  ... />
```

**Zielmuster** (identisch zu GroupHistRoleDialog, `Input type="date"`):
```tsx
<FormField label="Beitrittsdatum" htmlFor="hist-member-joined-date"
  hint="Optionaler Startpunkt der Mitgliedschaft.">
  <Input
    id="hist-member-joined-date"
    type="date"
    value={form.joinedDate}
    onChange={(e) => setForm((f) => ({ ...f, joinedDate: e.target.value }))}
    aria-label="Beitrittsdatum"
  />
</FormField>
<FormField label="Austrittsdatum" htmlFor="hist-member-left-date"
  hint="Leer lassen, wenn die Person weiterhin aktiv ist.">
  <Input
    id="hist-member-left-date"
    type="date"
    value={form.leftDate}
    onChange={(e) => setForm((f) => ({ ...f, leftDate: e.target.value }))}
    aria-label="Austrittsdatum"
  />
</FormField>
```

---

### `frontend/src/types/fansub.ts` (type, —)

**Analog:** self (bestehende Datei)

**Zu ändernde Interfaces** (Zeilen 563–644):

```ts
// HistFansubGroupMember (Z. 563–578)
joined_year: number | null  →  joined_date: string | null   // ISO 8601
left_year: number | null    →  left_date: string | null

// CreateGroupMemberRequest (Z. 588–594)
joined_year: number | null  →  joined_date: string | null
left_year: number | null    →  left_date: string | null

// UpdateGroupMemberRequest (Z. 596–602)
joined_year?: number | null →  joined_date?: string | null
left_year?: number | null   →  left_date?: string | null

// HistGroupMemberRole (Z. 606–617)
started_year: number | null →  started_date: string | null
ended_year: number | null   →  ended_date: string | null

// CreateMemberRoleRequest (Z. 627–635)
started_year: number | null →  started_date: string | null
ended_year: number | null   →  ended_date: string | null

// UpdateMemberRoleRequest (Z. 637–644)
started_year?: number | null →  started_date?: string | null
ended_year?: number | null   →  ended_date?: string | null
```

Ebenfalls betroffen (separate Typen-Dateien, als Teil dieser Wave anpassen):
- `frontend/src/types/domain-projection.ts` Zeilen 34–35, 50–51
- `frontend/src/types/contributions.ts` (started_year/ended_year in Contribution-Interfaces)

---

## Shared Patterns

### Permissions-Guard
**Quelle:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` Zeilen 89–113
**Anwenden auf:** alle Handler-Methoden, die Schreiboperationen ausführen
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "...", &fansubID, "...", nil, permissions.ActionFansubGroupMembersManage, result)
    writePermissionDenied(c, result)
    return
}
```

### Audit-Log-Muster
**Quelle:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` Zeilen 306–316
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "hist_group_member_role.created",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "hist_fansub_group_member_role",
    TargetID:       &item.ID,
    Action:         string(permissions.ActionFansubGroupMembersManage),
    Outcome:        "allowed",
    Payload:        map[string]any{"role_code": req.RoleCode},
})
```

### Fehlerbehandlung Repository → Handler
**Quelle:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` Zeilen 293–304
```go
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "..."}})
    return
}
if err != nil {
    log.Printf("...: repo error (...): %v", ...)
    internalError(c, "interner serverfehler")
    return
}
```

### Additive SQL-Migration (Bestandsdaten-Mapping)
**Quelle:** `database/migrations/0112_role_model_cleanup.up.sql` Zeilen 1–41 (kritische Reihenfolge-Kommentare)
**Regel:** Constraints droppen VOR Spalten-Drop. Bestandsdaten mit WHERE IS NOT NULL mappen.

### ClaimMutationError-Muster
**Quelle:** `backend/internal/repository/member_claims_repository.go` Zeilen 15–34, 144–148
```go
return nil, &ClaimMutationError{
    Code:       "...",
    Message:    "...",
    HTTPStatus: 409,
}
// Im Handler:
if mutationErr, ok := repository.AsClaimMutationError(err); ok {
    c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
    return true
}
```

### Transaktion (pgx.BeginTx) mit defer Rollback
**Quelle:** `backend/internal/repository/member_claims_repository.go` Zeilen 180–184
```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil {
    return fmt.Errorf("...: begin tx: %w", err)
}
defer tx.Rollback(ctx)
// ... Operationen ...
return tx.Commit(ctx)
```

### Fail-open Insert (D-10-Muster)
**Quelle:** `backend/internal/repository/fansub_group_app_members_repository.go` Zeilen 427–445
```go
// Kein Fehler-Return wenn Lookup fehlschlägt — der Haupt-Schreibpfad war erfolgreich.
if !someCondition.IsZero() {
    var histID int64
    err := r.db.QueryRow(ctx, `...`).Scan(&histID)
    if err == nil && histID > 0 {
        _, _ = r.db.Exec(ctx, `INSERT INTO ... ON CONFLICT DO NOTHING`, ...)
    }
}
```

### Frontend-Datumseingabe (globales Design-System — PFLICHT)
**Quelle:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx` Zeilen 107–116 (Input type="text" als Referenz-Pattern)
**Regel:** `<Input type="date" ... />` aus `@/components/ui` — KEIN natives `<input type="date">` direkt.
```tsx
import { Input } from '@/components/ui'

<Input
  id="..."
  type="date"
  value={form.someDate}
  onChange={(e) => setForm((f) => ({ ...f, someDate: e.target.value }))}
  aria-label="..."
/>
```

---

## Kein Analog gefunden

Alle Dateien haben direkte Analoga im Codebase.

| Datei | Rolle | Datenfluss | Bemerkung |
|---|---|---|---|
| — | — | — | Kein „no analog"-Fall in Phase 97 |

---

## Kritische Pitfalls (für Planner)

| # | Pitfall | Betroffene Datei | Prävention |
|---|---|---|---|
| P1 | D-10-Auto-Archivierung nutzt `started_year`/`ended_year` (Z. 443) → kompiliert, läuft aber zur Laufzeit auf Fehler nach Migration | `fansub_group_app_members_repository.go` | Atomarer Change: Migration 0114 + Repo-Fix gleichzeitig deployen |
| P2 | `chk_hist_group_member_roles_years` und `chk_hist_fansub_group_members_years` müssen VOR DROP COLUMN entfernt werden | Migration 0114 | `DROP CONSTRAINT IF EXISTS` vor `DROP COLUMN` |
| P3 | `MAKE_DATE(NULL, ...)` → NULL (kein Fehler) nur wenn WHERE `IS NOT NULL` korrekt | Migration 0114 | `WHERE started_year IS NOT NULL` in allen UPDATE-Statements |
| P4 | Claim-Aktivierung für `fansub_lead` ohne Enddatum → Last-Active-Lead-Invariante | `member_claims_repository.go` | `fansub_lead` + `founder` aus automatischem Claim-Flow ausschließen |
| P5 | Frontend: `started_year: number \| null` verteilt in 4+ Typ-Dateien | `fansub.ts`, `domain-projection.ts`, `contributions.ts` | Alle TypeScript-Typen in derselben Wave wie Backend-DTOs umstellen; `tsc --noEmit` als Gate |
| P6 | Docker-Rebuild-Pflicht: neue Spalten erst nach `docker compose up -d --build team4sv30-backend` | alle Go-Änderungen | Jede Wave mit Rebuild abschließen |

---

## Metadata

**Analog-Suchbereich:** `backend/internal/repository/`, `backend/internal/handlers/`, `database/migrations/`, `frontend/src/app/admin/fansubs/`, `frontend/src/types/`
**Gelesene Dateien:** 14
**Pattern-Mapping-Datum:** 2026-07-01
