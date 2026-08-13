# Phase 78: Leader Workspace – Review & Pflege - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` (MODIFY — D-07-Filter) | component (review section) | CRUD / request-response | self (in-place extend) | exact (self) |
| `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx` (NEW — ersetzt/wrappt ReviewQueue) | component (review section) | CRUD / request-response | `ClaimManagementPanel.tsx` (struktur) + `ReviewQueue.tsx` (datenpipeline) | exact |
| `frontend/src/components/contributions/ReviewQueue.tsx` (MODIFY — UI-Primitives-Migration) | component (review section) | CRUD / request-response | `ClaimManagementPanel.tsx` | exact (same role) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` (NEW — Sichtbarkeit/Reviewstatus) | component (review section) | CRUD / request-response | `ClaimManagementPanel.tsx` | role-match |
| `backend/internal/handlers/fansub_media_review_handler.go` (NEW — PATCH visibility/review_status) | handler (controller) | request-response / mutate | `contribution_review_handler.go` | exact |
| `backend/internal/handlers/admin_content_release_version_media.go` (MODIFY — visibility/review_status-Felder) | handler (controller) | request-response / mutate | self (`PatchReleaseVersionMedia`) + `contribution_review_handler.go` (audit) | exact (self) |
| `frontend/src/lib/api.ts` (MODIFY — neue Media-Review-Helfer) | api-client (utility) | request-response | bestehende Helfer (`patchReleaseVersionMediaItem`, `confirmProposal`) | exact |
| `*.test.tsx` / `*_test.go` (NEW — Wave-0-Tests) | test | — | `ClaimManagementPanel.test.tsx`, `contribution_review_handler_test.go` | exact |

**Phase-76-Eingang (D-03/D-04):** Phase 76 ist NICHT implementiert (Research Befund 5). Phase-76-Vorschlagsslots werden als `<EmptyState>`-Platzhalter in den Domänen-Tabs eingebaut — kein eigener Analog, nutzt das `EmptyState`-Primitive (siehe ClaimManagementPanel.tsx:268). Vollständige Verdrahtung als Follow-Up-Wave nach Phase 76. Siehe "No Analog Found".

## Pattern Assignments

### `ContributionsReviewSection.tsx` (component, CRUD/request-response) — NEU

**Primär-Analog (Struktur + UI-Primitives):** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx`
**Sekundär-Analog (Datenpipeline):** `frontend/src/components/contributions/ReviewQueue.tsx`

> **WICHTIG (CLAUDE.md-Pflicht überstimmt closest-analog):** `ReviewQueue.tsx` ist die nächstliegende Datenpipeline, ABER seine UI ist Anti-Pattern (native `<button>`/`<textarea>`, Inline-Styles — Research Befund 1, Fallstrick 2). Die neue Komponente MUSS dem **UI-Primitives-Stil von `ClaimManagementPanel.tsx`** folgen, NICHT dem von `ReviewQueue.tsx`. Daten/API-Aufrufe von ReviewQueue übernehmen, Markup von ClaimManagementPanel.

**Imports-Pattern** — von ClaimManagementPanel.tsx (Zeilen 1–42) kopieren, Datenhelfer von ReviewQueue (Zeile 5):
```typescript
'use client'
import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState, SectionHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Toolbar } from '@/components/ui'
import { ApiError, confirmProposal, listGroupProposals, rejectProposal } from '@/lib/api'
import type { GroupProposalRow } from '@/types/contributions'
import type { FansubGroupCapabilities } from '@/types/fansub'
```

**Capability-Gating-Props-Pattern** — Research Pattern 1 (D-08); Gate aus `can_manage_members` (Research Befund 3):
```typescript
interface ContributionsReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities
}
export function ContributionsReviewSection({ fansubId, capabilities }: ContributionsReviewSectionProps) {
  if (!capabilities.can_manage_members) return null
  // ...
}
```

**Lade-/Fehler-Pattern** — von ReviewQueue.tsx (Zeilen 38–55) übernehmen (`useCallback` + `try/finally` + `readErrorMessage`):
```typescript
const loadProposals = useCallback(async () => {
  try { setIsLoading(true); setError(null)
    const resp = await listGroupProposals(fansubId); setProposals(resp.data)
  } catch (err) { setError(readErrorMessage(err, 'Die Vorschläge konnten nicht geladen werden.')) }
  finally { setIsLoading(false) }
}, [fansubId])
```

**Mutations-Pattern (optimistisch entfernen)** — von ReviewQueue.tsx (Zeilen 57–83) + ClaimManagementPanel.tsx (Zeilen 210–229):
```typescript
async function handleConfirm(id: number) {
  try { await confirmProposal(fansubId, id)
    setProposals((prev) => prev.filter((p) => p.id !== id))
  } catch (err) { setCardErrors((prev) => ({ ...prev, [id]: readErrorMessage(err, 'Aktion fehlgeschlagen.') })) }
}
```

**Markup/„Offen zuerst"-Pattern (D-07)** — `Card variant="section"` + `SectionHeader` mit Zähler + `Table variant="withActions"` mit Bestätigen/Ablehnen-`Button`s aus ClaimManagementPanel.tsx (Zeilen 312–328). Zähler im Titel: `title={\`Offene Vorschläge (${proposals.length})\`}`. `EmptyState` (Zeile 313–314) für leere Liste.

---

### `ClaimManagementPanel.tsx` (component, CRUD) — MODIFY (D-07-Filter)

**Analog:** self — inkrementell erweitern, KEIN Neubau (Research Befund 2; 349 Zeilen, Spielraum bis 450).

**Bestehendes „nur offen"-Verhalten:** `pendingClaims` (Zeilen 312–328) zeigt bereits nur offene Claims (`listPendingMemberClaims` liefert nur pending). D-07 ergänzt einen sichtbaren **„Nur Offene"-Toggle** für die Members-Tabelle (offen vs. erledigt gruppieren) als `useState<boolean>`.

**Toggle-Pattern** — `Toolbar` (bereits importiert, Zeile 19) + `Button variant="secondary" size="sm"` wie Zeile 280; State analog zu `copyStates`/`approveNicknames`-`useState`-Mustern (Zeilen 79–80).

**Audit:** Mutationen laufen bereits über bestehende API-Helfer (`verifyMemberClaim`/`rejectMemberClaim`) mit Backend-Audit — kein neuer Frontend-Code für D-09.

---

### `ReviewQueue.tsx` (component, CRUD) — MODIFY (UI-Primitives-Migration, CLAUDE.md-Pflicht)

**Analog (Ziel-Stil):** `ClaimManagementPanel.tsx`

**Migrations-Pflicht (Research Fallstrick 2, CLAUDE.md):** native `<textarea>` (Zeile 239), native `<button>` (Zeilen 255–284, 302–340) und alle Inline-Styles ersetzen durch `@/components/ui`-Primitives:
- `<textarea>` → `Textarea` aus `@/components/ui`
- `<button>` → `Button` (variant `success` für Bestätigen, `danger` für Ablehnen — vgl. ClaimManagementPanel.tsx:324)
- Card-Markup → `Card variant="nested"` (vgl. ClaimManagementPanel.tsx:276)
- Status-Chip → `Badge variant="muted"` (vgl. ClaimManagementPanel.tsx:266)

> **Hinweis:** Falls Planner `ContributionsReviewSection.tsx` als Ersatz baut (Claude's Discretion, Research Befund 1), kann `ReviewQueue.tsx` entfernt statt migriert werden. Beide Optionen erfüllen die Primitives-Pflicht.

---

### `GroupMediaReviewSection.tsx` (component, CRUD) — NEU

**Analog:** `ClaimManagementPanel.tsx` (Struktur, Gating, UI-Primitives)

**Gating (D-08):** `capabilities.can_edit_group` (Research Befund 3 — heute Gate des `media`-Tabs).

**Struktur:** `Card variant="section"` + `SectionHeader` + `Table variant="withActions"`; Sichtbarkeit/Reviewstatus über `Select`-Primitive (Werte aus D-05: intern / in Prüfung / öffentlich / abgelehnt / archiviert / entfernt). `Select`-Nutzung siehe AnimeContributionModal.tsx:5.

**API:** neuer Helfer in `api.ts` (siehe unten); ruft den neuen `PATCH /admin/fansubs/:id/media/:mediaId`-Endpoint.

**Owner-Korrektheit (D-05):** nur als `Badge`/Hinweis flaggen — KEIN Owner-Umhängen (Anti-Pattern, Phase 79).

---

### `fansub_media_review_handler.go` (handler, request-response/mutate) — NEU

**Analog:** `backend/internal/handlers/contribution_review_handler.go` (Struktur + Audit), `fansub_media_upload.go` (Permission-Action + Scope).

**Handler-Struktur-Pattern** — von contribution_review_handler.go (Zeilen 31–49): Interface-getriebenes Repo (`ReviewRepository`) + `reviewPermissionChecker` + `auditLogWriter` für Stub-Tests.

**Permission-Pattern** — von fansub_media_upload.go (Zeilen 17–37): `permissionActorFromContext(c)` → `parseFansubID(c.Param("id"))` → `CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, fansubID)` → bei Deny `auditPermissionDenied(...)` + `writePermissionDenied(c, result)`.

**Body-Parse + Enum-Validierung (V5 Input Validation):** Sichtbarkeits-/Reviewstatus-Enum gegen erlaubte Werte prüfen (vgl. release_version_media `category`-Ablehnung admin_content_release_version_media.go:600–606).

**Audit-Pattern (D-09, PFLICHT)** — von contribution_review_handler.go (Zeilen 142–151):
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "fansub_group_media.visibility_updated",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "fansub_group_media",
    TargetID:       &mediaID,
    Action:         string(permissions.ActionFansubGroupEdit),
    Outcome:        "allowed",
})
```

---

### `admin_content_release_version_media.go` (handler) — MODIFY (visibility/review_status)

**Analog:** self (`PatchReleaseVersionMedia`, Zeilen 548–646) — additive Body-Felder.

**Erweiterung:** bestehendes `rawBody map[string]interface{}`-Parsing (Zeile 595) um `visibility` + `review_status` ergänzen (analog zu `is_preview_candidate`-Parse, Zeilen 613–618). `ReleaseVersionMediaPatchInput` (Zeile 630) um Felder erweitern.

**Audit:** EventType `release_version_media.visibility_updated` nach erfolgreicher Mutation (Pattern wie oben). Bestehender Deny-Audit `release_version_media.update.denied` (Zeile 576) bleibt.

**Permission:** bestehend `CanForReleaseVersionMedia(..., ActionReleaseVersionMediaUpdate, relationID)` (Zeile 570) wiederverwenden — kein neues Gate.

---

### `frontend/src/lib/api.ts` (api-client) — MODIFY (Lock K)

**Analog:** bestehende Helfer `patchReleaseVersionMediaItem` (Zeile 6050), `confirmProposal` (Zeile 7620), `verifyMemberClaim` (Zeile 3473).

**Pattern:** typisierter Helfer mit `getApiBaseUrl()` + `authToken?`-Param + `ApiError`. Neue Helfer: `patchFansubMediaReview(fansubId, mediaId, patch)`; Erweiterung von `patchReleaseVersionMediaItem` um visibility/review_status im `ReleaseVersionMediaPatchRequest`-Typ.

**Lock-K-Sequenz (Research Pattern 3, PFLICHT-Reihenfolge):** OpenAPI/admin-content YAML → Handler-DTO → Repository-Methode → `api.ts`-Helfer → Frontend-Typ. Kein ad-hoc-`fetch`.

---

### Test-Dateien (test) — NEU (Wave 0)

**Analog Frontend:** `ClaimManagementPanel.test.tsx` (Zeilen 1–45) — `// @vitest-environment jsdom`, `vi.mock('@/lib/api', () => ({...}))` mit Funktions-Spies, `@testing-library/react` (`render`/`screen`/`fireEvent`/`waitFor`), `afterEach(() => { cleanup(); vi.clearAllMocks() })`.

**Analog Backend:** `contribution_review_handler_test.go` — Stub-Repo + Stub-Permission-Checker über die Interfaces (`ReviewRepository`, `reviewPermissionChecker`), Audit-Writer-Stub; verifiziert Audit-Eintrag bei erfolgreicher Mutation (D-09).

**Wave-0-Lücken (aus Research Validierungsarchitektur):**
- `ContributionsReviewSection.test.tsx` — SC1, SC4
- `GroupMediaReviewSection.test.tsx` — SC3
- `backend/internal/handlers/fansub_media_review_handler_test.go` — SC3, D-09

## Shared Patterns

### Capability-Gating (D-08)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (Zeilen 216–250, `canUseMainTab`)
**Apply to:** Alle neuen Review-Komponenten (props `capabilities: FansubGroupCapabilities`)
**Mapping (kein neues Contract-Feld, Lock K — Research Befund 3):**
- Claim-Review → `can_create_invitation` / claims-Gate (page.tsx:235–239)
- Contribution-Review → `can_manage_members` (page.tsx:240–241)
- Gruppenmedien-Review → `can_edit_group` (page.tsx:226–227)
- Release-Drawer-Medien → `can_upload_release_media` / `can_view_release_media`
```typescript
// Komponenten-Gate-Stil (Research Pattern 1)
if (!capabilities.can_manage_members) return null
```

### Audit (D-09, Lock I/K)
**Source:** `backend/internal/handlers/contribution_review_handler.go` (Zeilen 142–151)
**Apply to:** Jeder neue Backend-Mutation-Handler — Pflicht-`auditLogRepo.Write` nach erfolgreicher Mutation, plus `auditPermissionDenied(...)` bei Deny (Zeilen 79, 127, 185). Kein Frontend-Bypass.

### Backend Permission-Check
**Source:** `fansub_media_upload.go` (Zeilen 17–37) / `contribution_review_handler.go` (Zeilen 61–82)
**Apply to:** Alle neuen/erweiterten Handler — `permissionActorFromContext` → `parseFansubID` → `CanForFansubGroup` → Deny-Audit + `writePermissionDenied`. Nie eigene Rollenprüfung (Research "Nicht selbst bauen").

### UI-Primitives (CLAUDE.md-PFLICHT, überstimmt closest-analog)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` (gesamte Datei — Referenz-Stil)
**Apply to:** Alle neuen/migrierten Frontend-Komponenten — `Button`, `Card`, `Badge`, `Table`, `EmptyState`, `SectionHeader`, `Toolbar`, `Input`, `Select`, `FormField`, `Modal`, `Textarea` aus `@/components/ui`. Native `<select>/<input>/<textarea>/<button>` und Inline-Styles verboten. `ReviewQueue.tsx` ist hier Gegenbeispiel/Migrationsziel, KEINE Vorlage.

### Modularität (≤450 Zeilen)
**Source:** CLAUDE.md Constraint; `page.tsx` ist ~3.800 Zeilen (Anti-Pattern, Research Fallstrick 1)
**Apply to:** Alle neuen Review-Flächen als eigene Komponentendateien; `page.tsx` importiert + rendert per Tab-Bedingung. Keine neue Review-Logik direkt in `page.tsx`.

### `?tab=`-Routing / Readiness-Deep-Links
**Source:** `page.tsx` (Zeilen 199–214 `MAIN_TABS`/`parseMainTab`; 261–268 `resolveMainTabForAccess`)
**Apply to:** Phase-77-Sprungmarken — bestehende `?tab=`-Navigation nutzen, nicht duplizieren. Optionaler `?tab=X&filter=open`-Deep-Link nur additiv (Claude's Discretion, Research Befund 7).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Phase-76-Vorschlagseingang (Routing-Slots, D-03/D-04) | component | event-driven / inbound | Phase 76 NICHT implementiert (Research Befund 5): kein Backend-Modell/Tabelle/API für Typ-Vorschläge. Nur `EmptyState`-Platzhalter einbaubar (Analog: ClaimManagementPanel.tsx:268). Vollständige Verdrahtung = Follow-Up-Wave nach Phase 76 ODER Phase 76 als Vorbedingung. |
| `fansub_group_media` PATCH-Repository-Methode | repository | mutate | Kein bestehender Visibility/Review-Update auf `fansub_group_media` (Research Befund 4). Neue Repo-Methode nötig; Phase-72-Schema-Felder (`media_assets.status`, `visibilities`-Lookup) müssen vor Implementierung per Schema-Query verifiziert werden (Annahme A1, offen). |

> **Blockierende Abhängigkeiten (Research Umgebungsverfügbarkeit):**
> - **Phase 72** (Status-Fundament) muss vor der Medienprüfungs-Implementierung executed sein — sonst fehlen `visibility`/`review_status`-Spalten.
> - **Phase 76** für vollständige D-03/D-04-Verdrahtung; sonst Stub-Ansatz.

## Metadata

**Analog search scope:** `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/components/contributions/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `backend/internal/handlers/`
**Files scanned:** 8 Analoge gelesen (ClaimManagementPanel, ReviewQueue, AnimeContributionModal, page.tsx-Auszug, contribution_review_handler, fansub_media_upload, admin_content_release_version_media-Auszug, ClaimManagementPanel.test) + api.ts-Grep
**Pattern extraction date:** 2026-06-05
