# Phase 181: Release-Bearbeitung zusammenführen (F-13) - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** 27 (grouped; see "Entry-Point / Import-Only Files" for the remaining
mechanical edits that need no pattern excerpt)
**Analogs found:** 24 / 27 with a strong in-repo analog, 3 with no analog (new pure modules)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/next.config.mjs` (MODIFY — add `redirects()`) | config | request-response (routing) | current file itself (extend, don't replace) + Next.js docs example in RESEARCH.md Pattern 1 | no in-repo analog (first `redirects()` use in this repo) |
| `frontend/src/lib/releaseEditorRedirects.ts` (NEW) | utility | transform (pure data → `RedirectRule[]`) | `frontend/src/app/admin/role-capabilities/page.tsx` (closest *intent* analog: old-URL → new-URL mapping) — mechanism differs (Server-Component `redirect()` vs. config array) | role-match, mechanism differs |
| `frontend/src/lib/releaseEditorRedirects.test.ts` (NEW) | test | — | `frontend/src/app/admin/role-capabilities/page.test.tsx` | role-match (pure-function assertion style) |
| `frontend/src/app/releases/[versionId]/edit/page.tsx` (NEW) | route | request-response | `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx` (5-line thin entry) | exact |
| `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx` (NEW) | component (orchestrator) | CRUD (load context + capabilities + patch) | `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` | exact (primitive-conformant skeleton already) |
| `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts` (NEW) | utility | transform (pure) | `EpisodeVersionEditorPage.tsx:71-93` (`getSafeReturnPath`) + `workspaceHelpers.ts:26-30` (`getProjectReturnPath`) | exact (both existing implementations merge into this file) |
| `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.test.ts` (NEW) | test | — | `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts` (pure-logic Vitest style, no DOM needed for the routing functions) | role-match |
| `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts` (NEW) | utility | transform (pure, capability→`TabItem[]` ids) | `workspace/page.tsx:280-359` (`tabItems.push(...)` blocks) | role-match (formalizes existing inline logic into a pure function) |
| `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.test.ts` (NEW) | test | — | `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` (pure function unit-test style) | role-match |
| `frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts` (NEW) | hook (facade) | request-response (wraps 2 existing data sources) | `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts` (facade-over-fetch shape) + `workspace/page.tsx:189-229` (project-neighbor `useEffect`) | role-match (both wrapped, not copied) |
| `frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.ts` (NEW, adapted) | hook | CRUD | `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` (rename/port, already 416 lines — do not add logic) | exact (direct rename/port) |
| `frontend/src/app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx` (NEW) | component | CRUD | `workspace/page.tsx:282-310` (`metadata` tab block, form + save) combined with `EpisodeVersionEditorPage.tsx:744-862` (admin-only classification/storage/group-assignment sub-blocks) | exact |
| `frontend/src/app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx` (NEW) | component | file-I/O (Jellyfin scan stub) | `EpisodeVersionEditorPage.tsx:598-741` (Dateien-Tab content) | exact (admin-only, content unchanged, only chrome migrates) |
| `frontend/src/app/releases/[versionId]/edit/ReleaseEditorChangelogTab.tsx` (NEW) | component | request-response (placeholder) | `EpisodeVersionEditorPage.tsx` changelog-stub block (admin-only placeholder) | exact |
| `frontend/src/components/releaseEditor/ReleaseVersionMediaSection.tsx` (+ Grid/Drawer/Upload helpers) (MOVE) | component | CRUD + file-I/O | itself, unmoved, at `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | exact (pure relocation, no behavior change) |
| `frontend/src/components/releaseEditor/ReleaseVersionNotesTab.tsx` (MOVE) | component | CRUD | itself, unmoved (743 lines — explicitly NOT to be split in this phase, see RESEARCH.md "Ausdrücklich NICHT in dieser Phase zu bearbeiten") | exact (relocation only) |
| `frontend/src/components/releaseEditor/SegmenteTab.tsx` (+ helpers) (MOVE) | component | CRUD | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/ReleaseVersionMetadataFields.tsx` (MOVE) | component (form fields) | CRUD | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/EpisodeClassificationSection.tsx` (MOVE) | component | CRUD | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/useReleaseVersionMedia.ts` (MOVE) | hook | CRUD/file-I/O | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/useReleaseSegments.ts` (MOVE) | hook | CRUD | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/episodeVersionEditorUtils.ts` (MOVE) | utility | transform | itself, unmoved | exact (relocation only) |
| `frontend/src/components/releaseEditor/JellyfinEnrichmentNotice.tsx` (MOVE) | component | — | itself, unmoved | exact (relocation only) |
| `frontend/src/app/releases/[versionId]/edit/useEpisodeNeighborNavigation.ts` + `episodeNeighborNavigation.ts` (MOVE, logic unchanged) | hook + utility | request-response / transform | itself, unmoved, at old admin-editor path | exact (relocation only; no external importers today besides the admin editor itself — VERIFIED by RESEARCH.md grep) |
| `backend/internal/repository/anime_contributions_member_project_repository.go` (MODIFY: `JOIN own_roles ON true` → `LEFT JOIN`) | model/repository | CRUD | **same file**, sibling function `listMemberProjectReleaseVersions` (lines 185-205), which already uses `LEFT JOIN LATERAL (...) own ON true` correctly | exact (in-file sibling pattern) |
| `backend/internal/handlers/contributions_me_project_handler.go` (MODIFY: D-05 graceful sentinel) | controller/handler | request-response | `backend/internal/handlers/dashboard_me_handler.go:94-125` (`GetOwnDashboard`, the "D-09-Kontrast" graceful pattern) + `backend/internal/handlers/me_identity_helpers.go` (`resolveVerifiedMemberIDForAppUser`) | exact |
| `backend/internal/handlers/contributions_me_project_handler_test.go` (NEW) | test | — | `backend/internal/handlers/dashboard_me_handler_test.go` (`TestDashboardMeHandlerGracefulEmptyStateInsteadOf403`, `TestGetOwnDashboardRequiresAuth`) | exact |
| `backend/internal/repository/anime_contributions_member_project_repository_test.go` (NEW) | test | — | sibling Postgres-fixture integration tests in `dashboard_me_handler_test.go` (`testsupport.OpenPhase107Postgres`) | role-match |
| `shared/contracts/contributions.yaml` + `shared/contracts/openapi.yaml` (MODIFY: 404-doc text only) | config/docs | — | itself (text-only precision edit, no schema change) | exact |

### Entry-Point / Import-Only Files (no pattern excerpt needed — mechanical edits)

These 11 files change only a link `href`/target string or an import path. No new pattern to copy;
just repoint to `/releases/[versionId]/edit` (links) or `frontend/src/components/releaseEditor/...`
(imports). See RESEARCH.md "Einstiegspunkte"-tables and Pitfall 4 for the exact line numbers:

| File | Change |
|---|---|
| `frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx:123` | link target → new route |
| `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx:663` | link target → new route |
| `frontend/src/app/admin/users/tabs/UserMediaTab.tsx:116` | link target → new route |
| `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:287` | link target → new route |
| `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts:185` (`releaseVersionToolsTarget`) | link target → new route |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx:92` | link target → new route; also import path fix (`useReleaseVersionMedia` from `components/releaseEditor/`) |
| `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:351` | link target → new route |
| `frontend/src/app/me/dashboard/components/AttentionSection.tsx:172` | link target → new route |
| `frontend/src/app/me/dashboard/components/attentionHelpers.ts:38` (`resolveWorkspaceHref`) | link target → new route |
| `frontend/src/components/contributions/ContributionCard.tsx:100` | link target → new route |
| `frontend/src/components/contributions/AnimeGroupCard.tsx:280` | link target → new route |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx:7` | import path fix only (`ReleaseVersionMediaSection` from `components/releaseEditor/`), NOT a navigation link |
| `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx:7,150` | import path fix only (`useReleaseVersionMedia` type + mock) |
| `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx:10` | import path fix only (`EpisodeClassificationSection`) |
| `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx:289` | confirmed dead code (RESEARCH.md Pitfall 1) — delete, no link update needed |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/*` (old route, after redirects live) | delete `page.tsx`, `page.test.tsx`, `EpisodeVersionEditorPage.tsx`, `useEpisodeVersionEditor.ts`(+test) — anything NOT relocated to `components/releaseEditor/` |
| `frontend/src/app/me/releases/[versionId]/workspace/*` (old route, after redirects live) | delete `page.tsx`, `page.test.tsx`, `workspaceHelpers.ts`, `workspace.module.css` |

---

## Pattern Assignments

### `frontend/src/lib/releaseEditorRedirects.ts` (utility, transform) + `next.config.mjs`

**Analog:** no exact precedent (`redirects()` is new to this repo); closest *intent* analog is the
existing Server-Component old-URL→new-URL redirect at `frontend/src/app/admin/role-capabilities/page.tsx`
(different mechanism, same "keep bookmarks alive" purpose). Use the RESEARCH.md-cited Next.js 16
`redirects()` contract for the mechanism itself.

**Existing config shape to extend** (`frontend/next.config.mjs:13-55`, read in full — 56 lines, no
`redirects` key exists yet):
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { /* ...unchanged... */ },
  turbopack: { root: path.resolve(__dirname) },
}

export default nextConfig
```

**Target shape** (per RESEARCH.md Pattern 1 — extract the rule list into a separate, testable
module so Vitest never needs to load `next.config.mjs` itself):
```js
// frontend/src/lib/releaseEditorRedirects.ts (NEW)
export interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
}

export function buildReleaseEditorRedirects(): RedirectRule[] {
  return [
    { source: '/admin/episode-versions/:versionId/edit', destination: '/releases/:versionId/edit', permanent: true },
    { source: '/me/releases/:versionId/workspace', destination: '/releases/:versionId/edit', permanent: true },
  ]
}
```
```js
// frontend/next.config.mjs (MODIFY — add alongside existing `images`/`turbopack` keys)
import { buildReleaseEditorRedirects } from './src/lib/releaseEditorRedirects.ts'
// ...
const nextConfig = {
  images: { /* unchanged */ },
  turbopack: { /* unchanged */ },
  redirects: async () => buildReleaseEditorRedirects(),
}
```
Query-parameter pass-through (`return_to`, `tab`, `animeId`, `episodeId`) is automatic per the
Next.js 16 docs cited in RESEARCH.md Pattern 1 — do not hand-roll `URLSearchParams` rebuilding
(see existing cautionary comment at `role-capabilities/page.tsx:13-16` about `+` vs. `%20`
encoding, which is exactly the kind of bug config-redirects avoids).

**Test pattern to copy** (`frontend/src/app/admin/role-capabilities/page.test.tsx:1-36`, full
file): plain `describe`/`it` assertions on the function's return value, `@vitest-environment node`,
no rendering. Adapt by asserting on `buildReleaseEditorRedirects()`'s returned array shape instead
of a `redirect()` mock call:
```ts
// frontend/src/lib/releaseEditorRedirects.test.ts (NEW) — pattern from page.test.tsx:9-13
import { describe, expect, it } from 'vitest'
import { buildReleaseEditorRedirects } from './releaseEditorRedirects'

describe('buildReleaseEditorRedirects (D-01/D-04)', () => {
  it('leitet die alte Admin-Adresse dauerhaft auf die neue Release-Route weiter', () => {
    const rules = buildReleaseEditorRedirects()
    expect(rules).toContainEqual({
      source: '/admin/episode-versions/:versionId/edit',
      destination: '/releases/:versionId/edit',
      permanent: true,
    })
  })
})
```

---

### `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx` (component, CRUD)

**Analog:** `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` (full file, 448 lines,
already primitive-conformant — this is the winning visual/structural skeleton per UI-SPEC).

**Imports pattern** (`workspace/page.tsx:1-49`):
```ts
'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AdjacentNavigation, Badge, Button, Card, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import {
  getAnimeFansubProjectTimeline,
  getEpisodeVersionEditorContext,
  getMyProjectDetail,
  getOwnProfile,
  getReleaseVersionCapabilities,
  updateEpisodeVersion,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
```
This is the import style the new page MUST use — **not** the legacy relative-import style of
`EpisodeVersionEditorPage.tsx:1-36` (`import { Button } from "@/components/ui/Button"` per-component
imports, double-quoted strings, no barrel import). The workspace file already demonstrates the
required global-primitive barrel import (`@/components/ui`).

**Core composition pattern — PageHeader + AdjacentNavigation + Tabs** (`workspace/page.tsx:361-444`):
```tsx
return (
  <main className={styles.page}>
    <div className={styles.shell}>
      <PageHeader breadcrumbs={...} eyebrow="Release-Projektbereich" title={context.anime_title}
        description={`${episodeLabel} · ${groupName} · ${releaseVersionLabel}`} actions={...} />
      {!hasAnyWorkspaceAccess ? (
        <ErrorState title="Kein Zugriff auf diesen Projektbereich" ... />
      ) : (
        <>
          {isNavigationLoading ? <p role="status">Release-Navigation wird geladen.</p>
            : navigationError ? <p role="status">Release-Navigation konnte nicht geladen werden.</p>
            : adjacentReleases ? <AdjacentNavigation ... /> : null}
          <Tabs items={tabItems} defaultTabId={...} activeId={...} onActiveIdChange={...} />
        </>
      )}
    </div>
  </main>
)
```
Replace the `isPlatformAdmin`-vs.-capabilities branching additively (per D-02/Pattern 3): instead of
only `canEditMetadata` gating the `metadata` tab push (`workspace/page.tsx:282`), use
`isPlatformAdmin || canEditMetadata`, and add `isPlatformAdmin`-only pushes for `files`/`changelog`
(content from `EpisodeVersionEditorPage.tsx:598-741` and the changelog stub).

**Error/loading state pattern** (`workspace/page.tsx:231-261`):
```tsx
if (!isClientInitialized) {
  return <LoadingState title="Projektbereich wird geladen" description="Team4s lädt deine Release-Version." />
}
if (routeErrorMessage) {
  return <main className={styles.page}><ErrorState title="Projektbereich nicht verfügbar" description={routeErrorMessage}
    action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>} /></main>
}
```
Per UI-SPEC Copywriting Contract, the merged page's generic load-failure title becomes rollenneutral
("Release-Version nicht verfügbar" / "Diese Release-Version konnte nicht geladen werden."), and the
action button's href/label must branch on `isPlatformAdmin` vs. member (see UI-SPEC §Copywriting
Contract row "Error state — Laden fehlgeschlagen").

---

### `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts` (utility, transform)

**Analog:** both existing implementations, to be merged (per RESEARCH.md Code Examples section,
already pre-merged there):

`EpisodeVersionEditorPage.tsx:71-93` (`getSafeReturnPath`, accepts admin-fansub OR member-project
patterns):
```ts
function getSafeReturnPath(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://")) return null;
  try {
    const parsed = new URL(trimmed, "http://team4s.local");
    if (parsed.origin !== "http://team4s.local") return null;
    const isAdminFansubWorkspace = /^\/admin\/fansubs\/\d+\/edit$/.test(parsed.pathname);
    const isMemberProjectWorkspace = /^\/me\/projects\/\d+\/group\/\d+$/.test(parsed.pathname);
    if (!isAdminFansubWorkspace && !isMemberProjectWorkspace) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
```

`workspaceHelpers.ts:26-30` (`getProjectReturnPath`, stricter — exact match only):
```ts
export function getProjectReturnPath(raw: string | null, animeId: number, fansubGroupId?: number | null): string | null {
  if (!raw || !fansubGroupId) return null
  const expected = `/me/projects/${animeId}/group/${fansubGroupId}`
  return raw === expected ? raw : null
}
```

Also port `parsePositiveInt` from both (`EpisodeVersionEditorPage.tsx:56-63` vs.
`workspaceHelpers.ts:4-9` — nearly identical, pick the `workspaceHelpers.ts` variant since it also
handles `string[]` route params). Add the new `resolveNavigationContext` function per RESEARCH.md
Pattern 2 (the only genuinely new logic in this file — both existing regexes feed into it):
```ts
export type NavigationContext = 'project' | 'episode'

export function resolveNavigationContext(params: {
  returnTo: string | null
  animeIdQuery: number | null
  episodeIdQuery: number | null
}): NavigationContext {
  if (params.returnTo && /^\/me\/projects\/\d+\/group\/\d+$/.test(params.returnTo)) return 'project'
  if (params.returnTo && /^\/admin\/fansubs\/\d+\/edit$/.test(params.returnTo)) return 'episode'
  if (params.animeIdQuery != null && params.episodeIdQuery != null) return 'episode'
  return 'project' // conservative default, see RESEARCH.md Assumption A1
}
```

---

### `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts` (utility, transform)

**Analog:** `workspace/page.tsx:280-359` — today this logic is inline `tabItems.push(...)` calls
guarded by `if (canEditMetadata && metadataForm)` etc. Extract the *visibility decision* (not the
JSX) into a pure function per RESEARCH.md Pattern 3:
```ts
export interface ReleaseEditorTabInputs {
  isPlatformAdmin: boolean
  canEditMetadata: boolean
  canManageSegments: boolean
  canUseMedia: boolean
  canUseNotes: boolean
}

export function buildReleaseEditorTabIds(input: ReleaseEditorTabInputs): string[] {
  const ids: string[] = []
  if (input.isPlatformAdmin || input.canEditMetadata) ids.push('metadata')
  if (input.isPlatformAdmin) ids.push('files')
  if (input.isPlatformAdmin || input.canManageSegments) ids.push('segments')
  if (input.isPlatformAdmin || input.canUseMedia) ids.push('media')
  if (input.isPlatformAdmin) ids.push('changelog')
  if (input.isPlatformAdmin || input.canUseNotes) ids.push('notes')
  return ids
}
```
The capability-derivation lines to port verbatim from `workspace/page.tsx:270-274`:
```ts
const canUseMedia = capabilities.can_view_media
const canUseNotes = capabilities.can_edit_notes && memberId != null
const canUseSegments = capabilities.can_manage_segments
const canEditMetadata = capabilities.can_edit_metadata === true
```

**Test pattern:** `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts`
— plain pure-function assertions, no DOM/jsdom needed (verify by running
`wc -l`/`head` if deeper detail needed; same style as `useEpisodeNeighborNavigation.test.ts`'s
non-hook assertions).

---

### `frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts` (hook, facade)

**Analog 1 (episode context):** `useEpisodeNeighborNavigation.ts` (full file, 97 lines) — facade
shape to imitate: `enabled`-style gating via `canFetch`, `useCancellableSlugState` for the actual
fetch, "adjust state during render" comment pattern (lines 58-87) instead of a `useEffect`, returns
`{isLoading, error, ...EMPTY_TARGETS-shaped navigation}`.

**Analog 2 (project context):** `workspace/page.tsx:189-229` — `useEffect` that calls
`getMyProjectDetail(animeId, selectedGroupId)`, finds `currentIndex`, derives `previous`/`next` via
`[currentIndex - 1]`/`[currentIndex + 1]`, tracked via a `key` string + `NavigationState` union
(`'ready' | 'error'`) to avoid stale-response races (see `contextGeneration`/`cancelled` guard
pattern at lines 86-122 for the same race-condition defense, reusable verbatim).

Per RESEARCH.md Pattern 2: wrap **both** unchanged, gate each with its own `enabled` flag so only
one ever fires a request:
```ts
export type NavigationContext = 'project' | 'episode'
// pseudocode composition — do not merge data shapes, see RESEARCH.md "Don't Hand-Roll"
function useReleaseEditorNavigation(context: NavigationContext, params: {...}) {
  const episode = useEpisodeNeighborNavigation({ ...params, enabled: context === 'episode' })
  const project = useProjectNeighborNavigation({ ...params, enabled: context === 'project' }) // extracted from workspace/page.tsx:189-229
  return context === 'episode' ? episode : project
}
```

---

### `frontend/src/app/releases/[versionId]/edit/useReleaseEditorData.ts` (hook, CRUD)

**Analog:** `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`
(full file, 416 lines) — direct rename/port per RESEARCH.md file-split table. Already encapsulates
load/form/save/scan/group-search. **Do not add new logic here** — it is already at 416/450 lines;
any new behavior belongs in a sibling file (`releaseEditorRouting.ts`, `releaseEditorTabs.ts`, or a
tab component).

---

### D-05 Backend Fix

#### `backend/internal/repository/anime_contributions_member_project_repository.go` (MODIFY)

**Analog:** the sibling function in the **same file**, `listMemberProjectReleaseVersions`
(lines 123-209), which already solves this exact problem correctly:
```sql
-- lines 185-205, the CORRECT pattern already in this file:
LEFT JOIN LATERAL (
    SELECT
        COALESCE(ARRAY_AGG(ordered_role.role_code ORDER BY ordered_role.sort_order, ordered_role.role_code), ARRAY[]::text[]) AS role_codes,
        ...
        COUNT(ordered_role.role_code) > 0 AS has_own_contribution
    FROM (...) ordered_role
) own ON true
```
The broken call site (`GetMemberProjectDetail`, lines 81-93) uses `JOIN own_roles ON true` instead
of `LEFT JOIN` on a 0-or-1-row CTE — a `memberID` with no matching `own_roles` row (e.g. sentinel
`0`) makes the whole query return 0 rows. Minimal fix (per RESEARCH.md Pattern 4):
```diff
   FROM anime a
   JOIN fansub_groups fg ON fg.id = $3
-  JOIN own_roles ON true
+  LEFT JOIN own_roles ON true
   WHERE a.id = $2
```

#### `backend/internal/handlers/contributions_me_project_handler.go` (MODIFY)

**Analog:** `backend/internal/handlers/dashboard_me_handler.go:83-125` (`GetOwnDashboard`, the
documented "D-09-Kontrast" graceful pattern) — graceful-vs-404 branching on
`errors.Is(err, repository.ErrNotFound)`:
```go
// dashboard_me_handler.go:100-121 — the pattern to replicate
memberID, err := resolveVerifiedMemberIDForAppUser(c.Request.Context(), h.db, identity.AppUserID)
if errors.Is(err, repository.ErrNotFound) {
    data := emptyOwnDashboardData()
    // ...attach attention sections with memberID=0-equivalent empty state...
    c.JSON(http.StatusOK, gin.H{"data": data})
    return
}
if err != nil {
    internalError(c, "interner serverfehler")
    return
}
```
Current blocked code to replace (`contributions_me_project_handler.go:31-35`, full file read —
58 lines):
```go
memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
    return
}
```
Target (per RESEARCH.md Pattern 4 diff — use sentinel `memberID = 0` instead of early-return 404,
documented as safe by `members.id BIGSERIAL` starting at 1):
```go
memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
if errors.Is(err, repository.ErrNotFound) {
    memberID = 0 // Sentinel: members.id ist BIGSERIAL, startet bei 1 — 0 matcht garantiert
                  // keinen echten Member (D-09-analoges Graceful-Verhalten, siehe dashboard_me_handler.go).
} else if err != nil {
    internalError(c, "interner serverfehler")
    return
}
```
The shared ownership-gate resolver itself (`resolveVerifiedMemberIDForAppUser`,
`me_identity_helpers.go:23-38`) is unchanged — both handlers already delegate to it.

#### Backend test analogs

**Analog:** `backend/internal/handlers/dashboard_me_handler_test.go` — three directly transferable
test shapes:
1. `TestGetOwnDashboardRequiresAuth` (lines 55-68) — 401-without-identity, no DB needed, pattern for
   a new `TestGetMyProjectDetailRequiresAuth`.
2. `TestDashboardMeHandlerGracefulEmptyStateInsteadOf403` (lines 120-154) — the exact D-05 shape:
   real Postgres fixture via `testsupport.OpenPhase107Postgres(t)`, deliberately NO `member_claims`
   row inserted, real `httptest` GET request, asserts `http.StatusOK` (not 404) plus the graceful
   payload shape. Direct template for
   `TestGetMyProjectDetailGracefulWithoutMemberProfile` (RESEARCH.md Decision→Test Map).
3. Fixture insert pattern (lines 93-99) for the positive/negative member-claim cases:
   ```go
   pool := testsupport.OpenPhase107Postgres(t)
   _, err := pool.Exec(ctx, `
       INSERT INTO members(id) VALUES (501);
       INSERT INTO app_users(id, status) VALUES (55, 'active');
       INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
       VALUES (1, 501, 55, 'verified', now());
   `)
   ```
For the repository-level SQL regression (`anime_contributions_member_project_repository_test.go`),
use the same `testsupport.OpenPhase107Postgres(t)` fixture family, call
`GetMemberProjectDetail(ctx, memberID=0, appUserID, animeID, fansubGroupID)` directly against real
inserted `anime`/`fansub_groups` rows (no `own_roles` match), and assert `err == nil` with
`role_codes == []` — this is the test that would have caught Pitfall 2 (a handler-only test with a
fake repository cannot see the `JOIN own_roles ON true` bug).

---

## Shared Patterns

### Global UI Primitives (mandatory, CLAUDE.md)
**Source:** `frontend/src/components/ui/Tabs.tsx`, `PageHeader.tsx`, `AdjacentNavigation.tsx` (all
read in full — 107/30/63 lines respectively)
**Apply to:** `ReleaseEditorPage.tsx` and every tab component. `Tabs` takes `items: TabItem[]`,
optional controlled `activeId`/`onActiveIdChange`; `AdjacentNavigation` takes `previous`/`next: {href,
label, ariaLabel} | null` and renders `null` when both are null (this IS the required D-05 empty
state per UI-SPEC — "previous=null, next=null" needs no extra markup, `AdjacentNavigation.tsx:28-30`
already handles it):
```tsx
export function AdjacentNavigation({ previous, next, ariaLabel = 'Benachbarte Inhalte', variant = 'inline', className }: AdjacentNavigationProps) {
  if (!previous && !next) {
    return null
  }
  // ...
}
```

### Race-condition guard for async context loads
**Source:** `workspace/page.tsx:64, 86-122` (`contextGeneration` ref + `cancelled` flag)
**Apply to:** `ReleaseEditorPage.tsx` and `useReleaseEditorData.ts` — every `Promise.all([...]).then()`
must check both a `cancelled` closure flag (for unmount) and a `generation`/`key` counter (for
stale-but-still-resolving requests when `versionId` changes), exactly as `saveMetadata` (lines
163-186) checks `generation !== contextGeneration.current` before committing a result.

### Error message extraction
**Source:** `workspaceHelpers.ts:11-15` (`readErrorMessage`)
```ts
export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```
**Apply to:** every `.catch()` block in `ReleaseEditorPage.tsx`/`useReleaseEditorData.ts`.

### Ownership-gate resolver (backend)
**Source:** `backend/internal/handlers/me_identity_helpers.go` (full file, 38 lines) —
`resolveVerifiedMemberIDForAppUser(ctx, db, appUserID)`, the single shared seam for ALL `/me/*`
handlers needing a verified member. **Apply to:** no change needed here — `D-05` only changes how
`contributions_me_project_handler.go` reacts to this resolver's `ErrNotFound`, not the resolver
itself.

### Graceful-vs-404 branch (backend)
**Source:** `dashboard_me_handler.go:90-93` (comment) + lines 100-121 (code) — the ONLY other `/me`
handler using this pattern in the repo. **Apply to:** `contributions_me_project_handler.go` only
(per D-05 scope — the other 9 `/me` handlers listed in CONTEXT.md stay on the 404 path, explicitly
out of scope).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/lib/releaseEditorRedirects.ts` | utility | transform | First use of Next.js `redirects()` in this repo — no prior config-level redirect array exists; nearest analog (`role-capabilities/page.tsx`) uses a different mechanism (Server-Component `redirect()`). Use RESEARCH.md Pattern 1's cited Next.js 16 docs as the authority instead of an in-repo analog. |
| `frontend/next.config.mjs` `redirects()` key | config | request-response | Same reason — no existing `redirects` key in the file to pattern-match against; extend the existing `nextConfig` object shape (images/turbopack) additively. |
| `frontend/src/app/releases/[versionId]/edit/useReleaseEditorNavigation.ts` | hook (facade) | request-response | No existing hook in the repo wraps two mutually-exclusive data sources behind one runtime-selected interface — this is genuinely new composition logic (though both wrapped sources are unchanged, well-tested analogs, see Pattern Assignments above). |

---

## Metadata

**Analog search scope:** `frontend/src/app/admin/episode-versions/[versionId]/edit/`,
`frontend/src/app/me/releases/[versionId]/workspace/`, `frontend/src/components/ui/`,
`frontend/src/app/admin/role-capabilities/`, `backend/internal/handlers/`,
`backend/internal/repository/`
**Files read in full:** `EpisodeVersionEditorPage.tsx` (partial — imports + targeted sections per
RESEARCH.md's own line-range inventory), `useEpisodeVersionEditor.ts` (via RESEARCH.md citations),
`workspace/page.tsx` (full, 448 lines), `workspaceHelpers.ts` (full, 57 lines),
`contributions_me_project_handler.go` (full, 58 lines), `dashboard_me_handler.go` (targeted,
lines 80-139), `me_identity_helpers.go` (full, 38 lines),
`anime_contributions_member_project_repository.go` (full, 241 lines), `Tabs.tsx` (full, 107 lines),
`PageHeader.tsx` (full, 30 lines), `AdjacentNavigation.tsx` (full, 63 lines),
`role-capabilities/page.tsx` (full, 26 lines), `role-capabilities/page.test.tsx` (full, 36 lines),
`EpisodeNavigationControls.tsx` (full, 72 lines), `useEpisodeNeighborNavigation.ts` (full, 97 lines),
`dashboard_me_handler_test.go` (targeted, lines 1-185), `next.config.mjs` (full, 56 lines)
**Pattern extraction date:** 2026-10-13
