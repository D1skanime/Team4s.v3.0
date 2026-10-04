# Phase 174: Modularisierung & Wartbarkeits-Refactoring - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 12 hotspot candidates (from CONTEXT.md D-08/D-13/D-14/D-15/D-16/D-18 + RESEARCH.md's extended candidate list)
**Analogs found:** 12 / 12 (every candidate has an existing in-repo precedent for "how this codebase already splits a god-module" — none require inventing a new pattern)

**Framing note (important for the planner):** This is a behavior-preserving refactor, not new-feature work. The question this document answers is not "what does a new X look like" but "how has this exact codebase already solved the problem of splitting a large file into siblings while keeping callers unaffected?" Every analog below is a file (or file family) that is **already live in production today**, already compiles/passes tests, and already demonstrates the exact seam type (barrel re-export, same-struct multi-file split, facade+impl hook split, scoped CSS module) that the corresponding Welle needs. Copy the *shape*, not any unrelated business logic.

## File Classification

| New/Modified File (or new module directory) | Role | Data Flow | Closest Analog (existing, already in prod) | Match Quality |
|---|---|---|---|---|
| `frontend/src/lib/api.ts` → `frontend/src/lib/api/*.ts` + barrel `frontend/src/lib/api.ts` (or `index.ts`) | utility / client (shared infra + domain API functions) | request-response | `frontend/src/components/ui/index.ts` (barrel: `export * from './X'` × 28 files) | exact (barrel mechanics) — domain boundary itself has no analog, must be derived fresh per D-08 |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | hook / controller | request-response + form-state | `frontend/src/app/admin/anime/hooks/useEpisodeManager.ts` + `.../internal/useEpisodeManagerImpl.ts` + `.../internal/episode-manager/{types,shared,useEpisodeManagerBulkMutations,useEpisodeManagerEditMutations}.ts` | exact (facade + impl + composed sub-hooks, same directory family) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` | component | request-response + CRUD (media review actions) | `frontend/src/app/admin/anime/hooks/internal/episode-manager/` split (hook-side) for logic extraction; `frontend/src/app/admin/fansubs/[id]/edit/CoverageMatrix.tsx` + `CoverageMatrix.module.css` for the "component owns its own CSS module" shape | role-match (no 1400-line TSX component is already split in-repo; closest precedent is the sibling CSS-module-per-component pattern plus the hook-splitting shape for the logic side) |
| `frontend/src/app/admin/fansubs/create/page.tsx` | component (page) | request-response + form-state | `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx` + its sibling section components (`FansubOpEdSection.tsx`, `ContributionsReviewSection.tsx`, etc.), each with its own scoped `.module.css` and a shared `../../../admin.module.css` | role-match (page-as-orchestrator delegating to named section components is the established shape in the sibling `[id]/edit` directory) |
| `backend/internal/repository/fansub_repository.go` → split into same-package sibling files | repository | CRUD | `backend/internal/repository/anime.go` + `anime_relations.go` + `anime_source_links.go` + `anime_schema.go` + `anime_v2.go` (all `package repository`, several share the `*AnimeRepository` receiver, same file-per-domain split) | exact (same package, same struct receiver, split by domain file) |
| `backend/internal/repository/admin_content_anime_themes.go` → split (Theme CRUD vs. Segment cluster) | repository | CRUD | Same as above — `anime.go`/`anime_relations.go` family; also `backend/internal/repository/anime_metadata.go` (shares `*AnimeRepository` AND `*AdminContentRepository` receivers in one file, showing cross-struct helper files are an accepted shape too) | exact |
| `backend/internal/repository/anime_assets.go` → split by asset type (Cover/Banner/Logo/Background, each incl. legacy+V2 pair) | repository | CRUD | Same `anime.go` family (same-package, same-struct `*AnimeAssetRepository` split by file) | exact |
| `backend/internal/handlers/admin_content_anime_themes.go` (HTTP handlers for themes/segments, if any live there) | handler | request-response | `backend/internal/handlers/admin_content_release_version_media.go` + its 6 sibling files (`_category.go`, `_display.go`, `_highlight.go`, `_reorder.go`, `_replace.go`, `_replace_display.go`) — all `package handlers`, all using the `AdminContentHandler` receiver, split by HTTP sub-concern with a shared `rvm`-prefix naming convention | exact |
| `backend/internal/handlers/admin_content_release_version_media.go` | handler | request-response | Its own existing siblings (`_category.go`, `_display.go`, `_highlight.go`, `_reorder.go`, `_replace.go`) — i.e. this file is **already partially split**; remaining work is extending the same pattern to the 1358-line core file | exact (self-referential precedent) |
| `backend/internal/permissions/permissions.go` | middleware/utility (central permission logic) | request-response | No split precedent exists for this *specific* file family (`authz_permissions.go`/`authz_permissions_batch.go` are already separate files beside it) — treat `anime.go`-family same-package split as the generic analog if D-06 prioritizes it at all | role-match / **flag: likely P2/P3, high coupling risk per RESEARCH.md** |
| `frontend/src/types/admin.ts` | model/types | — | `frontend/src/types/fansub.ts` is the next-largest types file (765 lines) but is **not yet split** either; no existing split-types-file analog found — closest shape is the backend `anime_metadata.go`/`anime_schema.go` convention of pulling cohesive sub-groups of types+interfaces into their own file within the same logical unit | partial (no frontend-types-split precedent exists; backend repository-split shape is the nearest transferable idea) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` → split along component boundaries | CSS module | — | Already-split siblings in the **same directory**: `CoverageMatrix.module.css` (151L), `ClaimManagementPanel.module.css` (120L), `FansubOpEdSection.module.css` (123L), `ContributionsReviewSection.module.css` (70L), `ReleaseVersionMediaReviewSection.module.css` (68L), `AnimeProjectTimelineSection.module.css` (21L), `GroupMediaReviewSection.module.css` (785L, imported ONLY by its own `.tsx`) | exact (same directory already demonstrates per-component CSS modules; `FansubEdit.module.css` itself is the one file that stayed a shared catch-all because many components still import `fansubEditStyles` from it) |
| `frontend/src/components/ui/ui.module.css` | CSS module (design-system primitives) | — | `frontend/src/components/ui/index.ts` barrel shows the directory is already organized per-primitive (`Button.tsx`, `Modal.tsx`, …); 3 CSS modules already exist in that directory per the scan — use those per-primitive `.module.css` files as the split unit | role-match |

## Pattern Assignments

### `frontend/src/lib/api.ts` → `frontend/src/lib/api/*` (barrel) — Welle 2

**Analog:** `frontend/src/components/ui/index.ts`

**Full barrel file** (28 lines, this IS the whole pattern):
```typescript
export * from './Accordion'
export * from './AvatarStack'
export * from './ActionBar'
export * from './AccentRule'
export * from './AdjacentNavigation'
export * from './ActivationStatusIndicator'
export * from './Badge'
export * from './Button'
// ... one line per domain module, order is insertion-order / not alphabetical
```

**Apply to D-08/D-09/D-10 as:**
- Keep `frontend/src/lib/api.ts` as the barrel file (not `api/index.ts`, since D-10 requires `@/lib/api` to resolve unchanged — check whether Next.js/TS resolves `api.ts` vs `api/index.ts` identically when `api/` also exists; if both would collide, the barrel must physically become `frontend/src/lib/api/index.ts` and the old `api.ts` must be deleted — confirm this collision risk as a Welle-2 Task-1 check, the `ui` analog does not face this because there is no sibling `ui.ts` file).
- Shared infra (D-09: `resolveApiUrl`, `ApiError`, `apiClientFetch`, auth-header building, base-URL branching) goes in one `frontend/src/lib/api/client.ts`, imported (not re-exported with `export *`, to avoid ambiguous-export collisions) by domain modules, and re-exported once from the barrel like any other domain module.
- Concrete shared-infra excerpts to relocate verbatim (copy, do not rewrite):

**`resolveApiUrl`** (`frontend/src/lib/api.ts:383-403`):
```typescript
export function resolveApiUrl(value?: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const loopbackMediaUrl = resolveLoopbackMediaUrl(trimmed);
    if (loopbackMediaUrl) {
      return loopbackMediaUrl;
    }

    return trimmed;
  }

  if (trimmed.startsWith("/api/")) {
    return resolvePublicApiUrl(trimmed);
  }

  return trimmed;
}
```

**`ApiError` class** (`frontend/src/lib/api.ts:434-462`):
```typescript
export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  code: string | null;
  details: string | null;
  conflict:
    | AdminAnimeAniSearchEditConflictResult
    | AdminAnimeAniSearchCreateConflictResult
    | null;

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null = null,
    code: string | null = null,
    details: string | null = null,
    conflict:
      | AdminAnimeAniSearchEditConflictResult
      | AdminAnimeAniSearchCreateConflictResult
      | null = null,
  ) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.code = code;
    this.details = details;
    this.conflict = conflict;
  }
}
```
Note: `ApiError`'s `conflict` field type references `AdminAnimeAniSearchEditConflictResult`/`AdminAnimeAniSearchCreateConflictResult` — these are admin-anime-domain types imported into what should be domain-agnostic shared infra (D-11 violation risk already present in the *current* code). Welle 2 must decide: either keep this exact signature (behavior-preserving, D-01) by importing those two types into `client.ts`, or loosen the field to a generic type. D-01 says preserve behavior — keep the exact signature; do not "fix" this as part of 174.

**`apiClientFetch`** (`frontend/src/lib/api.ts:1565-1575`):
```typescript
export async function apiClientFetch(
  pathOrUrl: string,
  options: AuthorizedRequestOptions = {},
): Promise<Response> {
  const input =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `${getApiBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  return authorizedFetch(input, options);
}
```

**Vitest mock compatibility (D-10):** both `vi.mock('@/lib/api', () => ({...}))` (126 files, full literal factory) and `vi.mock('@/lib/api', async () => { const actual = await vi.importActual(...) })` (7 files) target the import specifier `@/lib/api`, not any internal path — as long as the barrel file is physically reachable at that resolved specifier, both patterns are expected to keep working unchanged. Add the canary test RESEARCH.md recommends (a new trivial test importing 2-3 real, non-mocked functions through the barrel) before deleting any of the monolithic file's content.

---

### `useAdminAnimeCreateController.ts` — Welle 3 (D-13)

**Analog:** `frontend/src/app/admin/anime/hooks/useEpisodeManager.ts` (facade) + `frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts` (impl) + `frontend/src/app/admin/anime/hooks/internal/episode-manager/{types.ts,shared.ts,useEpisodeManagerBulkMutations.ts,useEpisodeManagerEditMutations.ts}` (composed sub-hooks)

This is the exact shape D-13 asks for: pure/mapping helpers already extracted (seen in both the analog and the target file), one oversized hook body remaining, split by responsibility into sibling sub-hooks that are composed back together.

**Facade file** (`frontend/src/app/admin/anime/hooks/useEpisodeManager.ts`, full 1-line file):
```typescript
export { useEpisodeManager } from './internal/useEpisodeManagerImpl'
```
Apply the same shape: `useAdminAnimeCreateController.ts` becomes a 1-line facade re-exporting from `internal/useAdminAnimeCreateControllerImpl.ts`. **Caller import path (`from '.../useAdminAnimeCreateController'`) stays unchanged** — this is the mechanism that satisfies D-01/D-10-equivalent compatibility for hooks.

**Impl file composing sub-hooks** (`frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts:1-18`):
```typescript
import { useEffect, useMemo, useState } from 'react'

import { EpisodeListItem, EpisodeStatus } from '@/types/anime'
import { useAuthSession } from '@/lib/useAuthSession'

import { EpisodeManagerState } from '../../types/admin-anime'
import { buildEpisodePatchPayload, UseEpisodeManagerOptions } from './episode-manager/shared'
import { useEpisodeManagerBulkMutations } from './episode-manager/useEpisodeManagerBulkMutations'
import { useEpisodeManagerEditMutations } from './episode-manager/useEpisodeManagerEditMutations'
import { EpisodeManagerActions } from './episode-manager/types'

export function useEpisodeManager(
  episodes: EpisodeListItem[],
  onRefresh: () => Promise<void>,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void,
  options: UseEpisodeManagerOptions = {},
): EpisodeManagerState & EpisodeManagerActions {
  // local useState calls for state D-13 calls "Form State" ...
```
The impl keeps ALL local `useState` declarations (state ownership stays centralized — do not scatter state across sub-hooks) and delegates specific *mutation logic* (bulk operations, edit submission) to imported sub-hooks, then spreads/merges their returned action objects into one combined return value matching `EpisodeManagerState & EpisodeManagerActions`.

**Shared action-type contract** (`frontend/src/app/admin/anime/hooks/internal/episode-manager/types.ts`, full 27 lines):
```typescript
import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../../types/admin-anime'
import { BulkFansubGroupAssignment } from '../../../utils/episode-bulk-fansub-group'

export interface EpisodeManagerActions {
  setQuery: (q: string) => void
  setStatusFilter: (s: EpisodeStatus | 'all') => void
  // ... one signature per externally-visible action, grouped by sub-hook origin
  applyBulkStatus: (status: EpisodeStatus) => Promise<void>
  removeSelected: (animeID: number) => Promise<void>
  applyBulkFansubGroup: (assignments: BulkFansubGroupAssignment[], skippedEpisodeCount: number) => Promise<void>
}
```
**Apply to `useAdminAnimeCreateController.ts`:** define one `UseAdminAnimeCreateControllerActions` (or similarly named) interface in an `internal/admin-anime-create/types.ts`, matching D-13's named axes (form state / API interaction / validation / episodes / media / mapping / submit) — each axis that genuinely has its own async mutation logic (not just local `useState`) becomes one sub-hook file, mirroring `useEpisodeManagerBulkMutations.ts` / `useEpisodeManagerEditMutations.ts`.

**Test precedent:** `useEpisodeManagerBulkMutations.test.ts` (77 lines) exists alongside its hook, proving sub-hooks are independently unit-testable post-split — this directly derisks D-20's Characterization Test requirement for `useAdminAnimeCreateController.ts` IF you extract into a sub-hook before changing behavior (write the sub-hook's test against the OLD monolith's observable behavior first if feasible, or immediately after extraction with no logic changes).

---

### `GroupMediaReviewSection.tsx` / `admin/fansubs/create/page.tsx` — Welle 3 (D-14)

**Analog (CSS-side, already done for GroupMediaReviewSection):** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx:40`
```typescript
import styles from './GroupMediaReviewSection.module.css'
```
This component's CSS is **already** scoped to itself (verified: no other `.tsx` in the directory imports `GroupMediaReviewSection.module.css`) — D-18's CSS work for this specific file is therefore already satisfied; Welle 3's job here is purely the *component logic* split (list/item/actions/dialog/hook per D-14), not CSS.

**Analog (component decomposition shape):** `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx` (orchestrator) delegating to named, independently-imported section components:
```typescript
import sharedStyles from "../../../admin.module.css";
import fansubEditStyles from "./FansubEdit.module.css";
```
Sibling pattern across the directory: `CoverageMatrix.tsx` → `CoverageMatrix.module.css` (own file), `FansubOpEdSection.tsx` → `FansubOpEdSection.module.css` (own file), `ContributionsReviewSection.tsx` → `ContributionsReviewSection.module.css` (own file) — each is a focused, independently-testable section component with its own styles, imported by the parent orchestrator. This is the target shape for decomposing `GroupMediaReviewSection.tsx`'s 1222-line inner body (List/Item/Actions/Dialog units) and for `admin/fansubs/create/page.tsx`'s 872-line `AdminFansubCreateContent` body.

**Constraint reminder from D-14 (verify before any extraction):** check each new child component file for `"use client"` — none of these sibling section files should introduce a NEW client boundary where today there is one shared boundary; confirm via `grep -n '"use client"' <file>` before and after.

---

### `fansub_repository.go` / `admin_content_anime_themes.go` / `anime_assets.go` — Welle 4 (D-15)

**Analog:** `backend/internal/repository/anime.go` + `anime_relations.go` + `anime_source_links.go` + `anime_schema.go` + `anime_v2.go` — five files, one package, shared receiver type.

**Struct + constructor, defined once in `anime.go`** (`backend/internal/repository/anime.go:1-26`):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound                    = errors.New("not found")
	ErrAnimeAssetMediaTypeMismatch = errors.New("anime asset media type mismatch")
)

type AnimeRepository struct {
	db *pgxpool.Pool
}

func NewAnimeRepository(db *pgxpool.Pool) *AnimeRepository {
	return &AnimeRepository{db: db}
}
```

**Sibling file reusing the SAME receiver, no new struct, no new constructor** (`backend/internal/repository/anime_relations.go:1-40`, confirmed via grep):
```go
package repository
// ... imports ...
type AnimeRelation struct { /* ... */ }

func (r *AnimeRepository) GetAnimeRelations(ctx context.Context, animeID int64) ([]AnimeRelation, error) {
	// ...
}
```

**Sibling file with a package-private helper type + free function (not a method) for cross-cutting write logic** (`backend/internal/repository/anime_source_links.go:1-19`):
```go
package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

type animeSourceLinkQueryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func syncAnimeSourceLinks(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	primary *string,
	extra []string,
) error {
	// ... called from multiple structs' methods (both AnimeRepository and AdminContentRepository use helpers like this) ...
}
```

**Apply to `fansub_repository.go`:** keep `type FansubRepository struct` and `func NewFansubRepository(...)` in whichever file retains the "core"/entry-point role (likely a slimmed `fansub_repository.go` or a new `fansub_repository_core.go`), then split by the domain seams RESEARCH.md already identified (Groups/Aliases/Links/Members/public-profile cluster/Merge), each sibling file declaring `func (r *FansubRepository) MethodName(...)` with NO new struct and NO new constructor — exactly like `anime_relations.go`/`anime_source_links.go` do today.

**Apply to `admin_content_anime_themes.go`:** split into a Theme-CRUD file and a Segment-cluster file, both `func (r *AdminContentRepository) ...` methods — `AdminContentRepository`'s struct/constructor already lives in `admin_content.go:15-27` and multiple other files already attach methods to it from elsewhere in the package (confirmed: `anime_source_links.go`'s `LinkAdditionalJellyfinSource`/`RemoveAnimeSourceLink` already do this), so this is a proven, not hypothetical, cross-file attachment pattern.

**Apply to `anime_assets.go`:** split by asset type (Cover/Banner/Logo/Background, each file keeping its legacy+V2 method pair together per RESEARCH.md Pitfall 4's explicit warning against splitting by legacy-vs-V2). `AnimeAssetRepository`'s receiver is used consistently (`func (r *AnimeAssetRepository) AssignManualCover`, confirmed) — same no-new-struct rule applies.

---

### `admin_content_release_version_media.go` / anime-themes HTTP handlers — Welle 4 (D-16)

**Analog:** `backend/internal/handlers/admin_content_release_version_media_category.go`, `_display.go`, `_highlight.go`, `_reorder.go`, `_replace.go` — all `package handlers`, all attaching to the existing `AdminContentHandler` struct, this file family is **already a live, partial precedent for splitting the very file in question**.

**Pure-function sibling file, no receiver, package-scoped helper naming (`rvm` prefix)** (`backend/internal/handlers/admin_content_release_version_media_category.go`, full 24-line excerpt):
```go
package handlers

// rvmCategoryPatchResult is the parsed outcome of an optional "category" field
// on a release-version-media PATCH request body.
type rvmCategoryPatchResult struct {
	Category *string
	Invalid  bool
}

func parseRVMCategoryPatchField(rawBody map[string]interface{}) rvmCategoryPatchResult {
	rawCategory, hasCategory := rawBody["category"]
	if !hasCategory {
		return rvmCategoryPatchResult{}
	}
	value, ok := rawCategory.(string)
	if !ok || !rvmValidCategories[value] {
		return rvmCategoryPatchResult{Invalid: true}
	}
	return rvmCategoryPatchResult{Category: &value}
}
```

**Receiver-method sibling file, same struct, HTTP-handler-shaped** (`backend/internal/handlers/admin_content_release_version_media_highlight.go:1-27`):
```go
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func parseReleaseVersionMediaMutationIDs(c *gin.Context) (int64, int64, bool) {
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return 0, 0, false
	}
	// ...
	return versionID, relationID, true
}

func (h *AdminContentHandler) SetReleaseVersionMediaHighlight(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	// ... business logic + persistence + response, all in the handler method itself
	// (confirms D-16: this codebase does NOT introduce a service layer for
	// request-shaped handler logic unless one already exists)
}
```

**`AdminContentHandler` struct, defined once** (`backend/internal/handlers/admin_content_handler.go:198-213`):
```go
// AdminContentHandler ist der zentrale Handler für alle Admin-Content-Operationen:
// Anime anlegen/bearbeiten/löschen, Episoden, Assets, Relationen und Jellyfin-Integration.
type AdminContentHandler struct {
	repo               *repository.AdminContentRepository
	relationRepo       adminContentRelationRepository
	themeRepo          adminThemeRepository
	animeAssetRepo     *repository.AnimeAssetRepository
	fansubRepo         *repository.FansubRepository
	episodeVersionRepo *repository.EpisodeVersionRepository
	episodeImportRepo  adminEpisodeImportRepository
	authzRepo          adminRoleChecker
	mediaRepo          *repository.MediaRepository
	aniSearchRepo      adminAniSearchRepository
	// ...
}
```

**Apply to `admin_content_release_version_media.go` and theme/segment handlers:** extend the existing `rvm`-prefix / sub-concern-per-file convention; no new struct, no new service layer — D-16 explicitly says only promote logic to a service "if it genuinely belongs there and a matching service pattern already exists" (none does for this core file per RESEARCH.md, so keep logic in handler methods, split by HTTP sub-concern, exactly like the 6 existing siblings already do).

---

### CSS: `FansubEdit.module.css` / `ui.module.css` — Welle 5 (D-18)

**Analog:** the `frontend/src/app/admin/fansubs/[id]/edit/` directory itself, which already contains 8 CSS module files, 7 of which are component-scoped and 1 (`FansubEdit.module.css`, 4568 lines) which remains a shared catch-all.

**Already-split, single-owner example** (`CoverageMatrix.tsx:8`):
```typescript
import styles from './CoverageMatrix.module.css'
```
No other file in the directory imports `CoverageMatrix.module.css` — this is the clean, single-consumer case D-18 wants more of.

**Multi-consumer shared-file example (the actual splitting challenge)** — confirmed via grep, these ALL import `FansubEdit.module.css` as `fansubEditStyles` or `styles` alongside their own local styles or the directory-wide `admin.module.css`:
```
AnimeContributionModal.tsx, AnimeProjectNotesSection.tsx, AnimeProjectNoteForm.tsx,
AnimeReleasesFilterBar.tsx, FansubAppMemberEditorPanel.tsx, ContributorAvatar.tsx,
FansubEditClient.tsx, FansubAppMembersOverview.tsx, GroupHistRoleDialog.tsx,
GroupMemberFormModals.tsx, FansubAppMemberAddModal.tsx, GroupMembersTab.tsx,
FansubAppMembersSection.tsx (and more)
```
**Implication for D-18:** `FansubEdit.module.css` cannot be split 1:1 by component the way `CoverageMatrix.module.css` was, because many of its class rules are genuinely shared across ~13+ consumer components (layout shell, shared form rows, shared button groups). D-18's instruction — "split only where JSX already has logically separated components/features" — means: (1) first group `FansubEdit.module.css`'s class rules by which components actually reference each class name (grep each `styles.xxx`/`fansubEditStyles.xxx` usage site), (2) classes used by exactly ONE `.tsx` file become that file's own new module (same shape as `CoverageMatrix.module.css`), (3) classes used by many files stay in a (possibly renamed/slimmed) shared file — do not force a split where the directory's own prior CSS-splitting history (7 single-owner files already extracted, 1 shared file deliberately kept) shows the maintainers already drew that exact line.

**Apply to `ui.module.css`:** `frontend/src/components/ui/` already has 3 `.module.css` files alongside the one large `ui.module.css` and a per-primitive `.tsx` file for each component (`Button.tsx`, `Modal.tsx`, etc., all re-exported via `index.ts`) — use the same class-usage-site grep to find primitives whose classes are single-owner and extract those into `<Primitive>.module.css`, leaving genuinely shared design-token-adjacent rules in `ui.module.css`.

## Shared Patterns

### Same-package, same-struct file split (backend repositories AND handlers)
**Source:** `backend/internal/repository/anime.go` + 4 siblings; `backend/internal/handlers/admin_content_release_version_media.go` + 6 siblings
**Apply to:** `fansub_repository.go`, `admin_content_anime_themes.go`, `anime_assets.go` (repository splits, D-15) and `admin_content_release_version_media.go` + theme/segment handlers (D-16)
**Rule:** struct type + constructor (`NewXRepository`/handler struct) stay in exactly one file. Every sibling file is `package repository`/`package handlers`, declares NO new struct, NO new constructor, and attaches methods via `func (r *ExistingType) MethodName(...)` or defines package-private helper types/functions (lowercase name, e.g. `animeSourceLinkQueryer`, `rvmCategoryPatchResult`) scoped to that file's concern. This guarantees zero import-cycle risk (same compilation unit) and zero signature changes for callers (D-01).

### Barrel re-export for a compatible public import surface (frontend)
**Source:** `frontend/src/components/ui/index.ts`
**Apply to:** `frontend/src/lib/api.ts` → `frontend/src/lib/api/*` (D-10)
```typescript
export * from './Accordion'
export * from './Button'
// ... one line per split-out module
```
**Rule:** the barrel file lives at the exact path callers already import (`@/components/ui`, analogously `@/lib/api`); each exported module is a single-responsibility file; no re-exported module imports back from a "higher" layer (D-11's no-new-cycles rule — verify with `madge` after each domain-group commit, per D-12).

### Facade + impl + composed sub-hooks (frontend large hooks)
**Source:** `frontend/src/app/admin/anime/hooks/useEpisodeManager.ts` (1-line facade) → `internal/useEpisodeManagerImpl.ts` (state owner + composition) → `internal/episode-manager/{types,shared,useEpisodeManagerBulkMutations,useEpisodeManagerEditMutations}.ts` (extracted mutation logic, independently unit-tested)
**Apply to:** `useAdminAnimeCreateController.ts` (D-13)
**Rule:** the original file path becomes a 1-line re-export so NOTHING changes for any caller; all `useState` ownership stays in one impl file (do not split state across hooks — that changes re-render behavior, which D-14/D-21 forbid); only extract the self-contained async mutation/validation logic into sibling files with their own test files.

### Component-scoped CSS module, single-owner (frontend)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/CoverageMatrix.tsx` + `CoverageMatrix.module.css` (also `FansubOpEdSection`, `ContributionsReviewSection`, `GroupMediaReviewSection` in the same directory)
**Apply to:** any class-name cluster inside `FansubEdit.module.css` / `ui.module.css` that greps to exactly one consuming `.tsx` file (D-18)
**Rule:** extract only when a class is used by exactly one component file today; verify via grep of the class name across the whole directory before moving it — do not guess from visual proximity in the source file.

## No Analog Found / Partial Analog (flag for planner)

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/types/admin.ts` (1169 lines) | model/types | — | No existing "split a large `types/*.ts` file into siblings" precedent exists anywhere in `frontend/src/types/`; `frontend/src/types/fansub.ts` (765 lines) is the next-largest and is also unsplit. Planner should decide module boundaries fresh (e.g. by the same domain buckets used for `api.ts`, since types and API functions are likely to share domain lines) rather than following a copied shape. |
| `backend/internal/permissions/permissions.go` (968 lines) | middleware/utility | request-response | No in-repo precedent for splitting a central cross-cutting permission file; RESEARCH.md explicitly flags this as "a different risk profile than D-07 anticipated" and a likely P2/P3 candidate — if Welle 1 promotes it to P1 anyway, the generic same-package-split rule above is the fallback, but expect this to need its own characterization-test-first treatment per D-20's "Rights" risk area, with no shortcut available from an existing split. |

## Metadata

**Analog search scope:** `frontend/src/components/ui/`, `frontend/src/app/admin/anime/hooks/` (incl. `internal/`), `frontend/src/app/admin/fansubs/[id]/edit/`, `backend/internal/repository/` (anime.go family), `backend/internal/handlers/` (admin_content_release_version_media family)
**Files scanned:** ~40 files read/grepped directly (repository anime-family: 6 files; handler release-version-media family: 9 files; frontend hooks episode-manager family: 7 files; fansub-edit directory: CSS + import grep across 33 `.tsx` files; `components/ui/index.ts` + directory listing; `frontend/src/lib/api.ts` targeted excerpts at lines 1-30, 383-408, 434-478, 1565-1605)
**Pattern extraction date:** 2026-10-04
