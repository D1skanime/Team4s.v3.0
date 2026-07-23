# Phase 107: Bestätigung, Delegation und Ablehnungslebenszyklus – Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 22 wahrscheinliche neue/geänderte Dateien
**Analogs found:** 22 / 22

## Scope-Hinweis

Phase 107 sollte den generischen Lifecycle plus den vorhandenen `anime_contributions`-Vertikalschnitt liefern. Release-Text- und Release-Version-Media-Adapter gehören nur ins Dateiset, wenn der Plan eine bereits reale Review-Seam nachweist; Phase 108 darf nicht vorweggenommen werden. Media bleibt strikt ownership-spezifisch: Release-Version-Prozessmedia läuft über `release_version_media`, `media_assets` und `media_files` mit echter `release_version_id`.

## File Classification

| Neue/geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Qualität |
|---|---|---|---|---|
| `database/migrations/0134_review_lifecycle.up.sql` | migration | CRUD / event-driven | `database/migrations/0131_member_point_foundation.up.sql` | exakt |
| `database/migrations/0134_review_lifecycle.down.sql` | migration | CRUD | `database/migrations/0131_member_point_foundation.down.sql` | exakt |
| `backend/internal/permissions/permissions.go` | config / model | request-response | bestehende Action-Registry in derselben Datei | exakt |
| `backend/internal/repository/authz_permissions.go` | repository | CRUD / request-response | bestehende Group-Role-/Capability-Queries in derselben Datei | exakt |
| `backend/internal/repository/review_delegations_repository.go` | repository | CRUD | `backend/internal/repository/authz_permissions.go` | Rollenmatch |
| `backend/internal/repository/review_lifecycle_repository.go` | repository | CRUD / event-driven | `backend/internal/repository/anime_contributions_proposal_repository.go` | Rollenmatch |
| `backend/internal/services/review_lifecycle_service.go` | service | request-response / event-driven | `backend/internal/services/point_service.go` | Rollenmatch |
| `backend/internal/repository/review_cleanup_repository.go` | repository | batch / file-I/O | `backend/internal/repository/release_version_media_cleanup.go` | Rollenmatch |
| `backend/internal/services/review_cleanup.go` | service / worker | batch / file-I/O | `backend/internal/services/release_version_media_cleanup.go` | exakt |
| `backend/internal/handlers/contribution_review_handler.go` | controller | request-response | bestehende Handler in derselben Datei | exakt |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | repository / adapter | CRUD | bestehende Confirm-/Reject-Seam derselben Datei | exakt |
| `backend/internal/services/review_lifecycle_service_test.go` | test | request-response / event-driven | `backend/internal/services/point_service_credit_test.go` | Rollenmatch |
| `backend/internal/repository/review_lifecycle_repository_test.go` | test | CRUD / concurrency | `backend/internal/repository/point_ledger_repository_test.go` | Rollenmatch |
| `backend/internal/repository/review_cleanup_repository_test.go` | test | batch / concurrency | `backend/internal/repository/release_version_media_cleanup_test.go` | exakt |
| `backend/internal/handlers/contribution_review_handler_test.go` | test | request-response | bestehende Tests derselben Datei | exakt |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` | component | request-response | bestehende Komponente derselben Datei | exakt |
| `frontend/src/app/admin/fansubs/[id]/edit/ReviewDelegationsSection.tsx` | component | CRUD / request-response | `ContributionsReviewSection.tsx` | Rollenmatch |
| `frontend/src/app/admin/fansubs/[id]/edit/ReviewDecisionDialog.tsx` | component | request-response | Reject-Expansion in `ContributionsReviewSection.tsx` | Rollenmatch |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` | test | request-response | bestehende Tests derselben Datei | exakt |
| `frontend/src/types/contributions.ts` und `frontend/src/types/fansub.ts` | model | transform | vorhandene `GroupProposalRow`-/Capability-Typen | exakt |
| `frontend/src/lib/api.ts` | service / utility | request-response | Contribution-Proposal-Helper in derselben Datei | exakt |
| `shared/contracts/openapi.yaml` und `shared/contracts/admin-content.yaml` | config | request-response | bestehende Contribution-Review-Pfade/-Schemas | exakt |

> `0134` ist der nächste derzeit sichtbare Migrationsslot nach `0133`; der Executor muss vor Erstellung erneut `git status` und die Migration-Chain prüfen.

## Pattern Assignments

### Lifecycle-Migration und Migrationstests

**Analog:** `database/migrations/0131_member_point_foundation.up.sql`

**Transaktion, Constraints und semantische Unique Keys** (Zeilen 1–55):

```sql
BEGIN;

CREATE TABLE point_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_code TEXT NOT NULL,
    rule_version INTEGER NOT NULL CHECK (rule_version > 0),
    ...
    UNIQUE (rule_code, rule_version)
);

CREATE TABLE point_ledger_entries (
    ...
    idempotency_key TEXT NOT NULL CHECK (btrim(idempotency_key) <> ''),
    UNIQUE (idempotency_key),
    CONSTRAINT chk_point_ledger_entry_shape CHECK (...)
);

CREATE UNIQUE INDEX uq_point_ledger_direct_reversal
ON point_ledger_entries (reversal_of_entry_id)
WHERE reversal_of_entry_id IS NOT NULL;
```

Übertragen auf Delegationen, offene Assignments, immutable Decisions, Tombstones und Datei-Cleanup-Aufträge. Wirksame Decision pro Submission-Cycle und offene Assignment pro Submission müssen DB-seitig eindeutig sein. Reject-Kategorie/Decision-Art als stabile Codes speichern; deutsche Labels bleiben DTO/UI.

**Reversibles Down-Muster** (`0131_member_point_foundation.down.sql`, Zeilen 1–14):

```sql
BEGIN;
DROP TRIGGER IF EXISTS point_ledger_guard_mutation ON point_ledger_entries;
DROP FUNCTION IF EXISTS guard_point_ledger_mutation();
DROP INDEX IF EXISTS uq_point_ledger_direct_reversal;
DROP TABLE IF EXISTS point_ledger_entries;
...
COMMIT;
```

Abhängigkeiten in umgekehrter Reihenfolge entfernen. Keine historische Migration ändern.

### `review_lifecycle_service.go`

**Analog:** `backend/internal/services/point_service.go`

**Tx-bindbare Service-Seam** (Zeilen 43–68):

```go
type PointTxStarter interface {
    Begin(context.Context) (pgx.Tx, error)
}

func (s *PointService) CreditInTx(
    ctx context.Context,
    db repository.DBTX,
    cmd CreditCommand,
) (*repository.PointLedgerEntry, error) {
    if err := validateCreditCommand(db, cmd); err != nil {
        return nil, err
    }
    ...
    return entry, nil
}
```

Der Review-Service soll denselben Aufbau verwenden: typisierte Commands, validierte positive IDs/stabile Tokens, eine äußere Transaktion und intern `CreditInTx`/`ReverseInTx`. Handler und Adapter bestimmen weder Punktwert noch Idempotency-Key.

**Commit-/Rollback-Muster** (Zeilen 70–87):

```go
tx, err := s.starter.Begin(ctx)
if err != nil { ... }
entry, err := s.CreditInTx(ctx, tx, cmd)
if err != nil {
    _ = tx.Rollback(ctx)
    return nil, err
}
if err = tx.Commit(ctx); err != nil {
    _ = tx.Rollback(ctx)
    return nil, fmt.Errorf("credit points commit: %w", err)
}
```

**Exactly-once und Reversal** (Zeilen 90–124):

```go
return "v1|" + string(cmd.Source.RewardKind) + "|" + cmd.Source.Type + "|" +
    cmd.Source.Key + "|beneficiary:" + strconv.FormatInt(cmd.MemberID, 10) +
    "|slot:" + cmd.Source.Slot

original, err := ledger.GetForUpdate(ctx, cmd.AwardEntryID)
...
entry, err := ledger.InsertReversal(ctx, repository.PointReversalInput{
    OriginalEntryID: cmd.AwardEntryID,
    IdempotencyKey: "v1|reversal|award:" + strconv.FormatInt(cmd.AwardEntryID, 10),
    ...
})
```

Work- und Review-Credit brauchen getrennte Slots auf stabiler Decision-/Submission-Cycle-Identität. Self-Override ruft keinen Review-Credit auf.

### `review_lifecycle_repository.go` und Contribution-Adapter

**Analog:** `backend/internal/repository/anime_contributions_proposal_repository.go`

**Projektübliche Transaktion und Fehlerübersetzung** (Zeilen 46–62, 119–146):

```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil {
    return nil, fmt.Errorf("vorschlag erstellen: transaktion starten: %w", err)
}
defer tx.Rollback(ctx)
...
if isUniqueViolation(err) {
    return nil, fmt.Errorf("...: %w", ErrConflict)
}
...
if err := tx.Commit(ctx); err != nil {
    return nil, fmt.Errorf("... commit: %w", err)
}
```

**Bestehender Status-Guard** (Zeilen 207–245):

```go
UPDATE anime_contributions
SET status = 'confirmed', ...
WHERE id = $1 AND status = 'proposed'

UPDATE anime_contributions
SET status = 'disputed', review_note = $2, updated_at = NOW()
WHERE id = $1 AND status = 'proposed'
```

Das ist der richtige Domain-Adapter, aber für Phase 107 allein nicht konkurrenz- und auditfest genug. Der Lifecycle-Kern muss die Submission mit Group-Scope und Typ `FOR UPDATE` laden, Transition validieren und Decision, Status, `last_activity_at`, Punkte und Assignment-Auflösung vor demselben Commit schreiben. Konfligierende gültige Transitionen werden deterministisch `ErrConflict`/HTTP 409, nicht als 404 verschleiert.

### Permissions und Delegationen

**Analog:** `backend/internal/repository/authz_permissions.go`

**Kanonische Group-Scope-Auflösung** (Zeilen 11–29):

```go
if fansubGroupID <= 0 {
    return nil, nil
}
...
return &permissions.Context{
    ScopeType: permissions.ScopeTypeGroup,
    FansubGroupIDs: []int64{fansubGroupID},
}, nil
```

**Aktive Membership serverseitig prüfen** (Zeilen 161–192):

```sql
SELECT fgr.role
FROM fansub_group_members fgm
JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
WHERE fgm.app_user_id = $1
  AND fgm.fansub_group_id = $2
  AND fgm.status = 'active'
ORDER BY fgr.role
```

**Datengetriebene Capability-Registry** (Zeilen 205–227):

```go
rows, err := r.db.Query(ctx, `
    SELECT role_code, action_code
    FROM role_capabilities
    ORDER BY role_code, action_code
`)
...
result[role] = append(result[role], permissions.Action(action))
```

Neue typisierte Actions in `permissions.go` registrieren und über bestehende Permission Engine evaluieren. Delegierte dürfen nicht delegieren; Grant/Revoke ist eine separate Management-Autorisierung. Bestätigte Membership wird beim Grant geprüft und bleibt historisch bestehen; Inaktivität oder fehlende Logins ändern nichts automatisch. Eine offene Assignment-Zeile speichert Delegationsbezug, Audit und Ownership, damit ausdrücklicher Revoke alle offenen Zuweisungen atomar an die Gruppenqueue zurückgeben und den früheren Delegierten sperren kann; sie ist kein Membership-Autorisierungssnapshot.

### Handler und HTTP-Vertrag

**Analog:** `backend/internal/handlers/contribution_review_handler.go`

**Auth-Actor, Parametervalidierung und Permission-Fehler** (Zeilen 103–130):

```go
identity, actor, ok := permissionActorFromContext(c)
if !ok { return }

fansubID, err := parseFansubID(c.Param("id"))
...
contributionID, err := strconv.ParseInt(c.Param("cid"), 10, 64)
if err != nil || contributionID <= 0 {
    badRequest(c, "ungültige vorschlags-id")
    return
}
result, err := h.permissionSvc.CanForFansubGroup(...)
...
writePermissionDenied(c, result)
```

**Fehlerform und Response** (Zeilen 132–153):

```go
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{
        "error": gin.H{"message": "vorschlag nicht gefunden oder bereits bearbeitet"},
    })
    return
}
...
c.JSON(http.StatusOK, gin.H{"message": "Vorschlag wurde bestätigt."})
```

Das Parsing-/Auth-/Error-Envelope-Muster wiederverwenden. Reject benötigt nun strukturierte Kategorie plus Pflichtfreitext; Override benötigt explizites Flag plus Pflichtgrund. Actor ausschließlich aus Auth-Context. Route-`fansubID` muss in den Service-Command und gegen die gelockte Submission geprüft werden.

**Wichtiges Anti-Muster** (Zeilen 132–151 und 203–223): Die aktuelle Mutation erfolgt zuerst, Audit danach best-effort via `_ = h.auditLogRepo.Write(...)`. Dieses Muster nicht kopieren; Decision-Audit gehört in dieselbe DB-Transaktion wie Status und Punkte.

### Cleanup-Repository und Worker

**Analoga:** `backend/internal/repository/release_version_media_cleanup.go`, `backend/internal/services/release_version_media_cleanup.go`

**Ownership-spezifische Kandidatenauswahl** (`release_version_media_cleanup.go`, Zeilen 116–166):

```sql
FROM release_version_media rvm
LEFT JOIN media_files mf_orig
  ON mf_orig.media_id = rvm.media_asset_id AND mf_orig.variant = 'original'
...
WHERE rvm.deleted_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM release_version_media other
    WHERE other.media_asset_id = rvm.media_asset_id
      AND other.id != rvm.id
      AND other.deleted_at IS NULL
  )
```

Die Ownership-Joins sind das zu kopierende Sicherheitsprinzip, nicht ein generischer Client-Pfad. Für Phase 107 werden fällige rejected Submissions mit injiziertem Cutoff und `FOR UPDATE SKIP LOCKED` geclaimt; Tombstone, Content-Scrub und persistente Datei-Aufträge entstehen atomar.

**Testbarer Store und best-effort Worker** (`release_version_media_cleanup.go`, Zeilen 24–64):

```go
type RVMCleanupStore interface {
    SelectSoftDeleteRVMCleanupCandidates(ctx context.Context) (...)
    ...
}

type RVMCleanupService struct {
    store RVMCleanupStore
    storageDir string
}

func (s *RVMCleanupService) RunOnce(ctx context.Context) {
    s.passStaleProcessing(ctx)
    s.passMissingFiles(ctx)
    s.passSoftDelete(ctx)
}
```

**Pfad- und Referenzschutz** (Zeilen 124–153):

```go
referenced, err := s.store.IsMediaAssetReferencedByOtherRVM(...)
if err != nil { ...; continue }
if referenced { ...; continue }
if !s.removeManagedFileQuietly(c.OriginalFilePath) { ...; continue }
```

Phase 107 weicht bewusst in der Reihenfolge ab: Tombstone/DB-Scrub darf trotz Dateifehler committen; die Datei wird über einen persistenten, idempotent claimbaren Nachlauf erneut versucht. Die bestehende managed-storage/path-safety-Logik wiederverwenden, aber keine universelle Media-Löschung erfinden.

### Admin-UI, Decision-Dialog und Delegationssektion

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx`

**Imports und kanonische UI-Primitives** (Zeilen 1–21):

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, Card, EmptyState, ErrorState,
  LoadingState, SectionHeader, Toolbar, Textarea,
} from '@/components/ui'
import { ApiError, confirmProposal, listGroupProposals, rejectProposal } from '@/lib/api'
```

**Gruppenscope und entity-lokale Zustände** (Zeilen 54–76):

```tsx
const [proposals, setProposals] = useState<ProposalWithStatus[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [cardErrors, setCardErrors] = useState<Record<number, string>>({})

const loadProposals = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const resp = await listGroupProposals(fansubId, undefined)
    setProposals(resp.data)
  } finally {
    setIsLoading(false)
  }
}, [fansubId])
```

**Scoped mutation errors** (Zeilen 82–107):

```tsx
try {
  await confirmProposal(fansubId, id, undefined)
  setProposals((prev) => prev.filter((p) => p.id !== id))
} catch (err) {
  setCardErrors((prev) => ({
    ...prev,
    [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  }))
}
```

Review bleibt in `/admin/fansubs/[id]/edit`. Für Reject-Kategorie ein `Select`/Radio statt Freitext verwenden; Freitext bleibt Pflicht-`Textarea`. Self-Override als deutlich gewarnter, explizit bestätigter Dialog mit Pflichtgrund. Delegationen progressiv als eigene Card/Accordion-Sektion, nicht in `/admin/my-groups/[id]`.

Die aktuelle UI prüft `can_manage_members` (Zeilen 48–51); Phase 107 muss stattdessen neue typisierte Backend-Capability-Booleans verwenden. Keine Frontend-Rollenlogik.

### Frontend API, DTOs und Contracts

**Analog:** `frontend/src/lib/api.ts`, Zeilen 8872–8955

```ts
export async function listGroupProposals(fansubId: number): Promise<GroupProposalsResponse> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansubs/${fansubId}/contribution-proposals`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<GroupProposalsResponse>
}
```

Bestehende Helper erweitern; keine ad-hoc `fetch`-/Bearer-Logik. Neue Payloads und Responses gemeinsam in beiden YAML-Verträgen (soweit der Pfad dort geführt wird), Backend-DTOs, `frontend/src/types/*` und `api.ts` ändern. `409` als Lifecycle-Konflikt dokumentieren und testen. Normale UI-Signaturen sollen keine neuen Tokenparameter bekommen; Refresh-only Session muss über den zentralen Client funktionieren.

### Tests

**Analog:** `ContributionsReviewSection.test.tsx`, Zeilen 5–41 und 146–157

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
const confirmProposal = vi.fn()
vi.mock('@/lib/api', () => ({
  confirmProposal: (...args: unknown[]) => confirmProposal(...args),
}))
...
fireEvent.click(await screen.findByRole('button', { name: /Vorschlag bestätigen/ }))
await waitFor(() => {
  expect(confirmProposal).toHaveBeenCalledWith(88, 1, undefined)
})
```

Backend-Tests sollen dieselben Interface-Seams stubben und echte PostgreSQL-Integration für Parallelität nutzen. Pflichtfälle: doppeltes Confirm, Confirm-vs-Reject, Cleanup-vs-Resubmit, doppelter Cleanup/File-Retry, doppeltes Override-Reversal, Inaktivität/fehlender Login ohne Zustandsänderung sowie Revoke-vs-Completion mit deterministischer Lock-Reihenfolge und genau einem gültigen Ergebnis. Frontend: Kategorie/Freitext-Pflicht, Override-Warnung, typisierte Capability, card-lokaler Fehler und Refresh-only Session.

## Shared Patterns

### Auth und Autorisierung

- Actor ausschließlich via `permissionActorFromContext`.
- Backend Permission Engine ist Autorität; UI-Capabilities dienen nur Darstellung.
- Globaler Plattform-Admin und gruppengebundene Delegation bleiben getrennte Autorisierungswege.
- Bestätigte Membership für Grant; danach keine automatische Änderung durch Inaktivität oder fehlende Logins. Nur expliziter Revoke beendet die delegierte Autorität und gibt offene Assignments ohne Punkte zurück.

### Transaktion und Fehler

- Lock → Scope/Status/Self-Review prüfen → Decision append → Status/Aktivität → PointService → Assignment-Auflösung → Commit.
- `ErrValidation` → 400, Permission denied → 403, echte Abwesenheit → 404, verlorene/ungültige Transition → 409.
- Audit niemals nach Commit als best effort.

### Zeit und Cleanup

- Clock in Service/Repository injizieren; Produktion 90 Tage, lokal 5 Stunden.
- `last_activity_at` nur bei fachlicher Bearbeitung/Resubmit ändern.
- DB-Tombstone/Content-Scrub unabhängig vom physischen Dateierfolg abschließen.
- Datei-Aufträge persistent mit Attempts/Fehlerstatus und stabilem Ownership-Key.

### Domain- und Media-Grenzen

- Anime/Episode neutral.
- Release-Version-Media nie direkt an Episode oder `release_media`.
- Bestehende ownership-spezifische Repositories und managed-path-Prüfung verwenden.
- Tombstone speichert IDs, Typ, Beteiligte, Zeiten, Statusfolge, Kategorie und Decision – keine Inhalte, Freitexte oder Dateien.

## No Analog Found

Keine Datei ist völlig ohne Analog. Es gibt jedoch **kein** bestehendes korrektes Komplettmuster für atomare Review-Decision + Audit + zwei Punktebuchungen + Tombstone/File-Outbox. Diese Orchestrierung muss aus den oben genannten PointService-, Permission-, Contribution- und Cleanup-Seams zusammengesetzt werden; die aktuelle best-effort Audit-Reihenfolge darf nicht übernommen werden.

## Metadata

**Analog search scope:** `backend/internal/{handlers,services,repository,permissions}`, `database/migrations`, `frontend/src/app/admin/fansubs/[id]/edit`, `frontend/src/lib`, `frontend/src/types`, `shared/contracts`
**Starke Analoga vollständig/gezielt gelesen:** 8 Dateien plus bestehende Tests und Vertrags-/Projektregeln
**Pattern extraction date:** 2026-07-23
