# Phase 183: Status-/Label-Konsolidierung (Fachaufgabe 11) - Pattern Map

**Mapped:** 2026-10-15
**Files analyzed:** 8 (2 new, 6 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/lib/appUserStatusLabels.ts` (NEU) | utility (label helper) | transform | `frontend/src/lib/fansub-labels.ts` | exact (structural) |
| `frontend/src/lib/__tests__/appUserStatusLabels.test.ts` (NEU, implied by D-04) | test | transform | `frontend/src/lib/__tests__/fansub-labels.test.ts` | exact |
| `frontend/src/lib/claimStatusLabels.ts` (NEU) | utility (label helper) | transform | `frontend/src/lib/fansub-labels.ts` | exact (structural) |
| `frontend/src/lib/__tests__/claimStatusLabels.test.ts` (NEU, implied by D-04) | test | transform | `frontend/src/lib/__tests__/fansub-labels.test.ts` | exact |
| `frontend/src/app/admin/users/AdminUsersClient.tsx` (ÄNDERN) | component (client table) | request-response | `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` | exact (same duplication group) |
| `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (ÄNDERN) | component (client detail page) | request-response | — (canonical source, becomes consumer) | exact |
| `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (ÄNDERN) | component (tab) | request-response | `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` | exact (same duplication group) |
| `frontend/src/app/admin/roles/RoleHoldersTable.tsx` (ÄNDERN) | component (table) | request-response | `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` | exact (same duplication group) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx` (ÄNDERN) | component (grid) | request-response | `frontend/src/lib/fansub-labels.ts` (consumer side: `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx`) | exact |
| `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` (ÄNDERN) | component (tab) | request-response | `frontend/src/app/admin/claims/ClaimsClient.tsx` | exact (same duplication group) |
| `frontend/src/app/admin/claims/ClaimsClient.tsx` (ÄNDERN) | component (client workspace) | request-response | `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` | exact (same duplication group) |

## Pattern Assignments

### `frontend/src/lib/appUserStatusLabels.ts` (NEU — utility, transform)

**Structural analog:** `frontend/src/lib/fansub-labels.ts` (lines 1-53) — this is the project's
established shape for a "centralized German label helper": a `Record<string, string>` constant
(documented with a one-line doc comment referencing the originating decision), plus a thin
`get*Label(value): string` function that does `MAP[value] ?? fallback`. Follow this shape exactly
for both new files; do **not** invent a different structure (e.g. no class, no switch-based
module-level function as the *only* export — the switch pattern in the source files is exactly
what is being eliminated).

**Content source (verbatim D-01 canonical pick):** `UserDetailPageClient.tsx:57-81` (full switch
logic below, to be moved verbatim into the new file, then converted to the map+fallback shape or
kept as two functions — CONTEXT.md names the two required exported functions explicitly):

```typescript
// frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:57-81 (current duplicate, canonical pick)
function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'disabled':
      return 'danger'
    default:
      return 'neutral'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'pending':
      return 'Ausstehend'
    case 'disabled':
      return 'Deaktiviert'
    default:
      return status
  }
}
```

**Required exported names (per CONTEXT.md D-01):** `appUserStatusVariant`, `appUserStatusLabel`
(both take the raw `app_users.status` string). Variant return type matches `BadgeProps['variant']`
subset: `'success' | 'warning' | 'danger' | 'neutral'` — no `@/components/ui` import needed in this
file itself (the helper only returns the variant string, the JSX call sites still import `Badge`
from `@/components/ui`).

**Fallback behavior (must match exactly, unchanged per D-04):** unknown status -> variant
`'neutral'`, label -> raw value (NOT `fansub-labels.ts`'s pattern of a fixed fallback word like
`'Sonstiges'` — App-User status explicitly falls back to the **raw value**, same as
`getFansubLinkTypeLabel` in `fansub-labels.ts:32-34`, not like `getFansubMediaCategoryLabel`).

**Export style reference** (`frontend/src/lib/fansub-labels.ts:4-13, 27-29`):
```typescript
export const FANSUB_MEDIA_CATEGORY_LABELS: Record<string, string> = {
  gallery: 'Galerie',
  // ...
}

export function getFansubMediaCategoryLabel(category: string): string {
  return FANSUB_MEDIA_CATEGORY_LABELS[category] ?? FANSUB_MEDIA_CATEGORY_FALLBACK
}
```
Apply the same shape, but since the App-User helper needs two parallel outputs (variant AND
label) for the same input, model it closely on the two-function switch pair already in
`UserDetailPageClient.tsx` (shown above) rather than forcing a single map — this matches what
all 4 existing duplicate call sites already expect (`statusVariant(x)` / `statusLabel(x)` called
independently, not as a single combined lookup).

---

### `frontend/src/lib/claimStatusLabels.ts` (NEU — utility, transform)

**Structural analog:** same as above, `frontend/src/lib/fansub-labels.ts`.

**Content source (CONTEXT.md D-03 — merge of both existing variants, broader UserClaimsTab alias
coverage + ClaimsClient's word choice "Genehmigt"):**

```typescript
// frontend/src/app/admin/users/tabs/UserClaimsTab.tsx:41-71 (current, widest alias coverage — basis for aliases)
function claimStatusLabel(status: string): string {
  switch (status) {
    case 'active':
    case 'verified':
      return 'Verifiziert'   // <- D-03: replace with 'Genehmigt' (ClaimsClient.tsx's word)
    case 'open':
    case 'pending':
      return 'Offen'
    case 'rejected':
    case 'denied':
      return 'Abgelehnt'
    default:
      return status
  }
}

function claimStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
    case 'verified':
      return 'success'
    case 'open':
    case 'pending':
      return 'warning'
    case 'rejected':
    case 'denied':
      return 'danger'
    default:
      return 'neutral'
  }
}
```

```typescript
// frontend/src/app/admin/claims/ClaimsClient.tsx:56-80 (current, narrower aliases — source of the word "Genehmigt")
/** D-23: reale Status-Vokabeln, keine erfundenen Status. */
function claimStatusLabel(status: string): string {
  switch (status) {
    case 'verified':
      return 'Genehmigt'
    case 'rejected':
      return 'Abgelehnt'
    case 'pending':
      return 'Offen'
    default:
      return status
  }
}
```

**Required exported names (per CONTEXT.md D-03):** `claimStatusVariant`, `claimStatusLabel`
(input: `claim.claim_status`). Final mapping (locked):
`verified`/`active` -> `'Genehmigt'` / `success`; `pending`/`open` -> `'Offen'` / `warning`;
`rejected`/`denied` -> `'Abgelehnt'` / `danger`; unknown -> raw value / `neutral`.

---

### `frontend/src/app/admin/users/AdminUsersClient.tsx` (ÄNDERN — component, request-response)

**Current local copy to remove** (lines 40-52):
```typescript
function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'disabled') return 'danger'
  return 'neutral'
}

function getStatusLabel(status: string): string {
  if (status === 'active') return 'Aktiv'
  if (status === 'pending') return 'Ausstehend'
  if (status === 'disabled') return 'Deaktiviert'
  return status
}
```

**Call site to update** (line 259):
```typescript
<Badge variant={getStatusVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
```
becomes `<Badge variant={appUserStatusVariant(item.status)}>{appUserStatusLabel(item.status)}</Badge>`.

**Import block to extend** (lines 6-22, `@/components/ui` named import already present — just
add a new import line for the helper, follow existing alphabetized-ish grouping convention seen
across the 4 files, e.g. place right after the `@/lib/api` import):
```typescript
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import { ApiError, listAdminUsersPage } from '@/lib/api'
import type { AdminUserListItem } from '@/types/admin-users'
```
Add: `import { appUserStatusLabel, appUserStatusVariant } from '@/lib/appUserStatusLabels'`.

---

### `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (ÄNDERN — canonical source, becomes consumer)

Lines 57-81 (the `statusVariant`/`statusLabel` functions shown above) are deleted here too — this
file is the content *source* for the new helper but still needs the same import+replace treatment
as the other three consumers once the helper exists. Call site at line 218:
```typescript
<Badge variant={statusVariant(overview.status)}>{statusLabel(overview.status)}</Badge>
```
becomes `<Badge variant={appUserStatusVariant(overview.status)}>{appUserStatusLabel(overview.status)}</Badge>`.

Existing import block (lines 1-10) already imports `Badge` from `@/components/ui`; add the new
helper import alongside the `@/lib/api` import on line 9.

---

### `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (ÄNDERN — component, request-response)

Local copy to remove (lines 39-63, identical switch pair). Two call sites to update:
- line 291-293: `<Badge variant={statusVariant(data.status)}>...{statusLabel(data.status)}...</Badge>`
  -> `appUserStatusVariant`/`appUserStatusLabel`.
- line 210-212 uses a **hardcoded** `<Badge variant="warning">` for a different concept
  (unrelated banner, not the account status) — do **not** touch this one, it is out of scope.

Import block (lines 5-15) already imports `Badge` from `@/components/ui`; add helper import.

---

### `frontend/src/app/admin/roles/RoleHoldersTable.tsx` (ÄNDERN — component, request-response)

Local copy to remove (lines 45-69, identical switch pair, with a doc comment at lines 40-43
explicitly calling out the duplication — delete that comment too since the duplication it
describes no longer exists). Two call sites (duplicated for desktop/mobile layout) at lines
118-120 and 165-167:
```typescript
<Badge variant={statusVariant(holder.membership_status)}>
  {statusLabel(holder.membership_status)}
</Badge>
```
-> `appUserStatusVariant(holder.membership_status)` / `appUserStatusLabel(holder.membership_status)`.

Note: the second `<Badge variant={holder.has_overrides ? 'info' : 'muted'}>` at lines 121-123 /
170-172 is an unrelated concept (override flag) — do not touch.

Import block (lines 6-17) already imports `Badge` from `@/components/ui`; add helper import.

---

### `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx` (ÄNDERN — component, request-response)

**Local copy to remove** (lines 28-37, 64-66):
```typescript
const CATEGORY_OPTIONS: Array<{ value: FansubGroupMediaCategory; label: string }> = [
  { value: 'gallery', label: 'Galerie' },
  { value: 'history_screenshot', label: 'Historische Screenshots' },
  { value: 'old_website', label: 'Alte Webseite' },
  { value: 'forum', label: 'Forum' },
  { value: 'irc_chat', label: 'IRC / Chat' },
  { value: 'event_meeting', label: 'Event / Treffen' },
  { value: 'artwork_fanart', label: 'Artwork / Fanart' },
  { value: 'other', label: 'Sonstiges' },
]
// ...
function getCategoryLabel(value: FansubGroupMediaCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? 'Sonstiges'
}
```

**Call site to update** (line 313):
```typescript
<Badge variant="neutral">{getCategoryLabel(persisted.category)}</Badge>
```
becomes `<Badge variant="neutral">{getFansubMediaCategoryLabel(persisted.category)}</Badge>`.

**Analog for the replacement import — canonical public-galerie consumer:**
`frontend/src/lib/fansub-labels.ts` exports `getFansubMediaCategoryLabel(category: string): string`
(lines 27-29, shown above in the Gruppe-4 section's structural analog). Note: `CATEGORY_OPTIONS`
is still needed in this file for the admin edit dropdown's **option list** (value+label pairs for
a select) — only the *label lookup function* `getCategoryLabel` is replaced by
`getFansubMediaCategoryLabel`; if `CATEGORY_OPTIONS` is only used to build the label lookup (not
also feeding a `<Select>` elsewhere in this file) check call sites before deleting the whole array
— `getReviewStatusOption` at line 68 independently iterates `REVIEW_STATUS_OPTIONS`, suggesting
`CATEGORY_OPTIONS` may have a second consumer for rendering select options; grep for
`CATEGORY_OPTIONS` usages beyond line 65 before removing the array entirely.

**Import block to extend** (lines 1-13, `@/components/ui` and `@/lib/api` both already imported):
```typescript
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'
import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
  resolveApiUrl,
} from '@/lib/api'
```
Add: `import { getFansubMediaCategoryLabel } from '@/lib/fansub-labels'`.

---

### `frontend/src/app/admin/users/tabs/UserClaimsTab.tsx` (ÄNDERN — component, request-response)

Local copy to remove (lines 41-71, the wide-alias-coverage switch pair shown above — this is the
*content source* for the new `claimStatusLabels.ts`, but after extraction this file becomes a
consumer like the others). Call site (lines 122-124):
```typescript
<Badge variant={claimStatusVariant(claim.claim_status)}>
  {claimStatusLabel(claim.claim_status)}
</Badge>
```
-> import `claimStatusVariant`/`claimStatusLabel` from `@/lib/claimStatusLabels` instead of the
local functions. Unrelated hardcoded badges at lines 91 and 93 (`Gedenkprofil` / memorial-profile
badge, `Aktiv` membership badge) stay untouched — different concept (member profile flags, not
claim status).

Import block (lines 5-17) already imports `Badge` from `@/components/ui`; add helper import
after the `@/lib/api` import (line 18).

---

### `frontend/src/app/admin/claims/ClaimsClient.tsx` (ÄNDERN — component, request-response)

Local copy to remove (lines 56-80, narrow-alias D-23 switch pair). Three call sites to update:
- lines 284-286: `<Badge variant={claimStatusVariant(claim.claim_status)}>{claimStatusLabel(claim.claim_status)}</Badge>`
- line 389: same pattern, single-line form
- line 356: `<Badge variant="success">Bereits aktives Mitglied</Badge>` is a **different, unrelated**
  hardcoded badge (membership state, not claim status) — leave untouched.

All three `claimStatusVariant`/`claimStatusLabel` call sites switch to the import from
`@/lib/claimStatusLabels`. Import block (lines 6-23) already imports `Badge` from `@/components/ui`;
add helper import after the `@/lib/api` import (line 24).

---

## Shared Patterns

### Badge usage (unchanged, apply to all 6 modified component files)
**Source:** `frontend/src/components/ui/Badge.tsx:1-30`
```typescript
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}
```
All 6 modified files already import `Badge` from `@/components/ui` and call it as
`<Badge variant={helperVariantFn(rawValue)}>{helperLabelFn(rawValue)}</Badge>` or the two-line
form. No change to the `Badge` import itself is needed anywhere — only the functions feeding
`variant`/children move from local file scope to the shared `@/lib/*Labels.ts` helper. The
`BadgeVariant` type (`'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'`) is a
superset of what both new helpers return (`'success' | 'warning' | 'danger' | 'neutral'`) — no
type mismatch when the helper's return type is assigned to `variant`.

### Centralized German label helper shape (apply to both new files)
**Source:** `frontend/src/lib/fansub-labels.ts` (whole file, 53 lines)
**Apply to:** `frontend/src/lib/appUserStatusLabels.ts`, `frontend/src/lib/claimStatusLabels.ts`
```typescript
/** <one-line doc comment, e.g. referencing the Phase/Decision that created this> */
export const SOME_LABELS: Record<string, string> = { /* raw value -> German label */ }

export function getSomeLabel(value: string): string {
  return SOME_LABELS[value] ?? FALLBACK
}
```
This is the project's one established convention for "N duplicate switch statements -> 1 shared
lib file" (already proven by Gruppe 2's own canonical source and by the `FANSUB_STATUS_LABELS`
addition in the same file for a prior consolidation, 176-EXTRA Scope Addition 3). Both new files
should follow it structurally, while keeping the two-function-per-concern shape (`*Variant` +
`*Label`) that the switch-based originals already use, since both status label and badge variant
are needed by every call site independently.

### Logic-only test style (apply to both new `__tests__/*.test.ts` files, per D-04)
**Source:** `frontend/src/lib/__tests__/fansub-labels.test.ts` (whole file, 45 lines)
```typescript
import { describe, expect, it } from 'vitest'

import { getFansubMediaCategoryLabel } from '../fansub-labels'

describe('getFansubMediaCategoryLabel', () => {
  it('übersetzt alle bekannten Medien-Kategorien ins Deutsche', () => {
    expect(getFansubMediaCategoryLabel('gallery')).toBe('Galerie')
    // ... one expect per known value
  })

  it('fällt bei unbekannten Kategorien auf Sonstiges zurück', () => {
    expect(getFansubMediaCategoryLabel('unbekannt')).toBe('Sonstiges')
  })
})
```
Per CONTEXT.md D-04 and the project's Teststil rule (CLAUDE.md), tests for the two new helpers
must be pure logic tests covering every input value (including all aliases, e.g. both `verified`
and `active` for claim status) plus one unknown-value case — no render simulation, no
`httptest`-style request execution (not applicable to a pure `lib/` helper), and no reading of
the helper's own source file to assert a substring.

## No Analog Found

None — all 8 files have a strong existing analog in the same codebase area (`fansub-labels.ts`
for helper shape, the duplication group's own sibling files for call-site mechanics).

## Metadata

**Analog search scope:** `frontend/src/lib/`, `frontend/src/lib/__tests__/`,
`frontend/src/app/admin/users/`, `frontend/src/app/admin/roles/`,
`frontend/src/app/admin/claims/`, `frontend/src/app/admin/fansubs/[id]/edit/`,
`frontend/src/components/ui/Badge.tsx`
**Files scanned:** 11 (4 Gruppe-4 duplicates, 2 Gruppe-3 duplicates, 1 Gruppe-2 admin file, 1
Gruppe-2 canonical source, 1 Gruppe-6 analog for structural reference, `Badge.tsx`, 1 existing
test file)
**Pattern extraction date:** 2026-10-15
