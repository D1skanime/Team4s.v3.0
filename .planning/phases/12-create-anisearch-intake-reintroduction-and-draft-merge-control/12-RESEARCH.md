# Phase 12: Create AniSearch Intake Reintroduction And Draft Merge Control - Research

**Researched:** 2026-04-10
**Domain:** AniSearch create-route reintegration on the existing Team4s admin anime intake stack
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Create AniSearch Entry Surface
- **D-01:** AniSearch must be visible again in the current create route instead of being absent from the live UI.
- **D-02:** The AniSearch create controls sit directly above the current `Jellyfin suchen` button area.
- **D-03:** The create AniSearch surface contains an explicit AniSearch ID input and a dedicated action button to trigger the crawl/load.
- **D-04:** AniSearch is a first-class create action, not a hidden debug path and not a deferred placeholder.

### Create Draft Merge Priority
- **D-05:** AniSearch always overrides Jellyfin-derived values in the create draft.
- **D-06:** The merge priority for Phase 12 is `manual > AniSearch > Jellyfin`.
- **D-07:** If AniSearch is loaded first and Jellyfin is loaded later, the AniSearch values must survive.
- **D-08:** If Jellyfin is loaded first and AniSearch is loaded later, the AniSearch values must overwrite the Jellyfin values.
- **D-09:** Provisional lookup text typed only to find a source is not an authoritative manual value and may be replaced by AniSearch data.

### Duplicate Handling
- **D-10:** If the entered AniSearch ID already exists on a local anime, the create flow should switch directly to that anime's edit route.
- **D-11:** Phase 12 should reuse the existing duplicate-detection seam instead of inventing a second duplicate policy just for create.
- **D-12:** After redirecting into edit, no broader edit refactor is part of this phase.

### Operator Feedback
- **D-13:** After AniSearch loads in create, the operator should see a clearly visible summary instead of only silent field changes.
- **D-14:** That summary should include which fields were updated, relation-related notes, and a clear reminder that nothing is saved yet.
- **D-15:** The AniSearch loading result should feel operator-safe and explicit, not automatic or hidden.

### Reuse Strategy
- **D-16:** Phase 12 should reuse the already-implemented AniSearch crawl/fetch backend path instead of rebuilding crawler behavior.
- **D-17:** Phase 12 should reuse the existing AniSearch provenance format `source='anisearch:{id}'`.
- **D-18:** Phase 12 should reuse the existing source-first relation resolution and best-effort relation follow-through logic where possible.
- **D-19:** The current create route structure should be extended, not replaced with a separate page or a major workflow reset.

### Claude's Discretion
- Exact copy wording of the create AniSearch card, as long as the summary clearly says the draft is not saved yet
- Exact component split between create page, controller, and helper modules, as long as the create route stays modular
- Exact visual emphasis of AniSearch vs Jellyfin actions, as long as AniSearch is clearly present above the Jellyfin action seam

### Deferred Ideas (OUT OF SCOPE)
- AniSearch title search with result popup and selectable IDs - valuable product direction, but a separate capability beyond the Phase 12 ID-based reintroduction
- Broader edit-route redesign after duplicate redirect lands - intentionally deferred to a later edit-focused phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENR-01 | Admin can load AniSearch create-time enrichment only by entering an explicit AniSearch ID before local anime creation. | Reuse the existing create enrichment backend contract and add a visible create-side ID input/button plus typed helper. |
| ENR-02 | AniSearch access is centrally limited to one request at a time with at least two seconds between requests, with no free search or crawl endpoints. | Keep the existing `AniSearchClient` and create enrichment service unchanged; do not add browse/search UI or new backend routes. |
| ENR-03 | If an AniSearch ID already maps to an existing local anime, the flow redirects to that anime instead of creating a duplicate record. | Reuse the existing redirect result from `AnimeCreateEnrichmentService.Enrich(...)` and surface it as a create conflict card with direct edit navigation. |
| ENR-04 | Create-time merge priority is strict `manual > AniSearch > Jellysync`, including fill-only handling for metadata and media. | Add explicit draft-layer ownership/snapshot rules in the create controller so AniSearch can overwrite Jellyfin-derived values without overwriting manual edits. |
| ENR-05 | AniSearch relation import writes only locally resolvable approved relations, skips unresolved relations, and leaves the draft usable when enrichment fails. | Keep the backend relation resolution/follow-through path as-is and expose relation counts/warnings in the create summary card before save. |
</phase_requirements>

## Summary

Phase 12 is not a new AniSearch backend phase. The repo already contains the controlled AniSearch fetcher, duplicate detection, `anisearch:{id}` provenance, source-first relation resolution, and create-time follow-through summary machinery. The missing piece is the create-route frontend seam: the live create page currently exposes only Jellyfin actions even though the backend and DTOs still support AniSearch create enrichment.

Planning should therefore treat Phase 12 as a focused reintegration and precedence-clarification phase. The safest path is to keep the existing backend contract, add a create-specific AniSearch helper alongside the current Jellyfin intake helpers, and extend `useAdminAnimeCreateController.ts` with explicit source-state tracking so the draft can distinguish manual values from Jellyfin-hydrated values before AniSearch loads.

The highest-risk area is not transport or crawling. It is draft ownership drift inside the create controller: today the controller has a `jellyfinDraftSnapshot` restore baseline and fill-only Jellyfin hydration, but it has no parallel AniSearch result state, no create-side duplicate redirect handling, and no field-origin model strong enough to explain `manual > AniSearch > Jellyfin` in both load orders. The plan should front-load that state model and targeted regression tests.

**Primary recommendation:** Reuse the existing create AniSearch backend contract unchanged, add a dedicated create-side AniSearch card/helper/state slice, and formalize field-origin precedence in the create controller before touching visual polish.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Admin create-route UI and App Router page composition | Already owns the create route and existing admin page structure. |
| React | 18.3.1 | Controller-driven local draft state and operator feedback rendering | Existing create/edit surfaces already use hook-based state without extra state libraries. |
| TypeScript | 5.7.2 | Shared DTO typing and frontend helper contracts | Current create/edit API seams and route helpers are type-driven. |
| Gin | 1.10.0 | Admin HTTP handlers for create/edit enrichment | Existing AniSearch endpoints and admin create flow are already Gin handlers. |
| Go | 1.25.0 in repo (`go.mod`) | AniSearch enrichment service, validation, relation follow-through | Existing AniSearch service/repository seams are in Go and already verified. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 | Frontend regression coverage for create page, helper state, and API helper behavior | Use for create-route state/markup/helper regressions. |
| testify | 1.9.0 | Backend unit/handler regression coverage | Use for backend regression extensions only if Phase 12 needs contract-touching backend adjustments. |
| lucide-react | 0.469.0 | Existing icon set for admin UI | Use only if the create AniSearch card needs a small status glyph; otherwise avoid adding noise. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend `useAdminAnimeCreateController.ts` with focused helpers/state slices | New global state library or a parallel create page | Unnecessary complexity; the repo already uses controller-local orchestration for create. |
| Add create AniSearch helper in `frontend/src/lib/api/admin-anime-intake.ts` | Put create AniSearch helper in `frontend/src/lib/api.ts` | The intake helper file is already the create-route API seam; keeping AniSearch there preserves locality. |
| Reuse `AnimeCreateEnrichmentService.Enrich(...)` redirect/draft modes | Add a create-specific duplicate policy in frontend only | Would split business rules across layers and risk drift from Phase 09/11 behavior. |

**Installation:**
```bash
# No new packages recommended for Phase 12.
```

**Version verification:** Phase 12 should use the checked-in repo stack. No new dependency installation is required or recommended.

## Architecture Patterns

### Recommended Project Structure
```text
frontend/src/app/admin/anime/create/
├── page.tsx                              # Keep page composition thin
├── useAdminAnimeCreateController.ts      # Extend with AniSearch state/orchestration
├── createPageHelpers.ts                  # Create AniSearch summary/copy helpers
├── anisearchCreate*.ts(x)                # New focused helper/hook/card modules
└── CreateJellyfinResultsPanel.tsx        # Keep Jellyfin review panel separate

frontend/src/lib/api/
└── admin-anime-intake.ts                 # Add create AniSearch request helper here
```

### Pattern 1: Reuse The Existing Create Enrichment Contract
**What:** Keep the existing backend create AniSearch endpoint and DTO shape as the only create enrichment contract.
**When to use:** Always. Phase 12 should not add a new AniSearch backend route or a browser-only draft-merging policy.
**Example:**
```typescript
// Source: backend/internal/services/anime_create_enrichment.go
// The service already returns either a draft payload or redirect metadata.
// Planning should treat this as locked backend behavior, not a redesign target.
```

### Pattern 2: Put Create AniSearch UI Inside `ManualCreateWorkspace.titleActions`
**What:** Inject the AniSearch controls into the existing title action seam rather than creating a second page section or modal workflow.
**When to use:** For the AniSearch ID input/button row and the immediate success/error/conflict summary card.
**Example:**
```tsx
// Source: frontend/src/app/admin/anime/create/page.tsx
<ManualCreateWorkspace
  titleActions={/* AniSearch card above Jellyfin action row */}
  titleHint={/* merge rule and unsaved-draft helper */}
/>
```

### Pattern 3: Track Draft Origin Explicitly In The Create Controller
**What:** Add a small origin model or paired snapshots so create state can tell manual edits from Jellyfin-hydrated values and AniSearch-applied values.
**When to use:** Before implementing load-order behavior. This is the only reliable way to enforce `manual > AniSearch > Jellyfin`.
**Example:**
```typescript
// Source pattern: frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
// Current create state already keeps `jellyfinDraftSnapshot` and fill-only hydration.
// Phase 12 should extend that pattern with AniSearch-aware state, not ad-hoc field overwrites.
```

### Pattern 4: Keep Success Feedback Local To The Source Controls
**What:** Render create AniSearch success/error/conflict state next to the AniSearch/Jellyfin actions, while still preserving the post-create success banner for persisted follow-through warnings.
**When to use:** For draft-time AniSearch feedback. Do not bury create AniSearch feedback in the generic top-of-page success box alone.
**Example:**
```tsx
// Source pattern: frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx
// Reuse the edit card's `aria-live="polite"` status branch pattern for create.
```

### Anti-Patterns to Avoid
- **Rebuilding AniSearch crawling or duplicate logic:** The verified backend service already handles it.
- **Treating provisional lookup text as manual-authoritative:** Locked decision D-09 explicitly forbids this.
- **Using only the page-level success toast/box for create AniSearch results:** Phase 12 requires an inline summary card near the source controls.
- **Letting Jellyfin overwrite AniSearch after AniSearch has loaded:** This would regress the Phase 09 UAT guarantee and violate D-07/D-08.
- **Pushing create AniSearch conflict handling into generic `errorMessage` text only:** Duplicate redirects need an explicit conflict card with action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AniSearch fetch/rate limit | New scraper, search UI, or second endpoint | `AniSearchClient` + `AnimeCreateEnrichmentService.Enrich(...)` | The existing path already enforces explicit-ID fetches and global throttling. |
| Duplicate AniSearch ownership policy | Frontend-only duplicate detection | Existing redirect result from backend create enrichment | Backend source lookup is the canonical ownership check. |
| Relation resolution | Client-side title matching | Existing source-first/title-fallback service resolution | Relation matching already handles approved labels and source-first preference. |
| Field-precedence heuristics | One-off `if` chains per field in JSX | Controller-level origin/snapshot helpers | Hand-rolled field exceptions will drift and break load-order rules. |
| Create feedback card behavior | A second ad-hoc status component far from create state | Reuse the edit-route AniSearch card structure/patterns | The edit route already solved accessibility and conflict/success branching. |

**Key insight:** Phase 12 should hand-roll only the missing create-route state composition, not AniSearch business rules.

## Common Pitfalls

### Pitfall 1: Treating Jellyfin-Hydrated Values As Manual Values
**What goes wrong:** AniSearch respects Jellyfin-filled fields as if they were manual, so AniSearch no longer beats Jellyfin.
**Why it happens:** The current create controller only has a Jellyfin restore snapshot, not a durable field-origin model.
**How to avoid:** Add explicit draft-origin tracking or parallel baseline snapshots before wiring the AniSearch load button.
**Warning signs:** `jellyfin -> anisearch` loads leave Jellyfin title/description/year untouched when AniSearch returns different values.

### Pitfall 2: Breaking The Reverse Load Order
**What goes wrong:** AniSearch loads first, then a later Jellyfin preview silently overwrites AniSearch fields.
**Why it happens:** `hydrateManualDraftFromJellyfinPreview(...)` is reused without guarding AniSearch-owned fields.
**How to avoid:** Make Jellyfin hydration explicitly fill-only relative to AniSearch-owned values, not just manual ones.
**Warning signs:** `anisearch -> jellyfin` tests change `source`, title, description, or year away from AniSearch data.

### Pitfall 3: Hiding Duplicate Redirects In Generic Error State
**What goes wrong:** Operators see a 409-style error message but no direct way to jump to the existing anime.
**Why it happens:** The create route currently has only `errorMessage` and `successMessage` top-level boxes.
**How to avoid:** Mirror the edit-route conflict branch with structured conflict state and a visible redirect action.
**Warning signs:** The UI shows “already linked” text without a button/link to the edit route.

### Pitfall 4: Losing The Unsaved-Draft Safety Message
**What goes wrong:** Operators assume AniSearch already persisted changes because fields changed immediately.
**Why it happens:** Draft enrichment updates form state before save and can look automatic if the summary is weak.
**How to avoid:** Put “nothing is saved yet” in the summary header/body every time AniSearch succeeds.
**Warning signs:** Success copy mentions updated fields but never mentions `Anime erstellen` or unsaved state.

### Pitfall 5: Moving Too Much Logic Into `page.tsx`
**What goes wrong:** The create page becomes another oversized orchestration file.
**Why it happens:** It is tempting to inline the AniSearch card, summary formatting, and redirect handling where the title actions render.
**How to avoid:** Keep the page declarative and move AniSearch helper/state/copy into focused modules.
**Warning signs:** `page.tsx` grows into controller logic or conditional branches for draft precedence.

## Code Examples

Verified patterns from repo sources:

### Create Route Insertion Seam
```tsx
// Source: frontend/src/app/admin/anime/create/page.tsx
<ManualCreateWorkspace
  titleActions={/* current source-action seam */}
  titleHint={<p className={styles.hint}>{manualDraft.sourceActionState.helperText}</p>}
/>
```

### Create Redirect And AniSearch Follow-Through Summary
```typescript
// Source: frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
setSuccessMessage(buildCreateSuccessMessage(response))
createRedirectTimeoutRef.current = window.setTimeout(() => {
  window.location.href = buildManualCreateRedirectPath(response.data.id)
}, CREATE_REDIRECT_DELAY_MS)
```

### Backend Duplicate Redirect And Draft Reuse
```go
// Source: backend/internal/services/anime_create_enrichment.go
if duplicate, err := s.repo.FindAnimeBySource(ctx, sourceTag); err != nil {
  return nil, err
} else if duplicate != nil {
  return models.AdminAnimeAniSearchEnrichmentRedirectResult{Mode: "redirect"}, nil
}
```

### Edit-Route Status/Conflict Card Pattern To Reuse
```tsx
// Source: frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx
<div id={statusID} className={workspaceStyles.aniSearchStatus} aria-live="polite">
  {/* conflict, error, success, empty branches */}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create AniSearch placeholder or absent UI | Explicit edit-route AniSearch card plus latent create backend contract | Phase 11 gap closure completed on 2026-04-09 | Phase 12 can copy a proven UI/state pattern instead of inventing one. |
| Implicit field precedence assumptions | Verified `manual > AniSearch > Jellyfin` behavior from Phase 09 UAT and Phase 11 gap fixes | Phase 09 verified on 2026-04-07; Phase 11 follow-up fixes on 2026-04-09 | Planning must preserve both load orders, not just one happy path. |
| Create relation summary only after save | Draft-time AniSearch UI already proven on edit route; post-save follow-through summary retained on create | Phase 11 | Phase 12 should show draft-time feedback near controls and keep post-save follow-through warnings unchanged. |

**Deprecated/outdated:**
- Create-route AniSearch placeholder messaging: removed in Phase 11 and should not be restored as dead copy.
- Any plan to add AniSearch title search in this phase: explicitly deferred by context.

## Open Questions

1. **What is the smallest reliable draft-origin model for create?**
   - What we know: `jellyfinDraftSnapshot` already exists, but it only supports revert/fill-only flow for Jellyfin.
   - What's unclear: whether a field-origin map or paired baseline snapshots will be simpler against the current controller.
   - Recommendation: Decide this in planning up front; do not start with per-field special cases.

2. **Should create AniSearch API parsing live in `admin-anime-intake.ts` or reuse `api.ts` conflict parsing helpers?**
   - What we know: create-route network helpers already live in `frontend/src/lib/api/admin-anime-intake.ts`, while edit conflict parsing is implemented in `frontend/src/lib/api.ts`.
   - What's unclear: whether to duplicate a narrow redirect parser or extract a shared AniSearch conflict parser.
   - Recommendation: Prefer a narrow shared parser/helper only if both create and edit can reuse it without broadening `api.ts` further.

3. **How much of the edit-route card should be reused directly versus recreated for create?**
   - What we know: edit already has the right a11y/status branching; create has different copy and no protected-field checkboxes.
   - What's unclear: whether a shared presentational component would stay simpler than two focused components.
   - Recommendation: Reuse the interaction pattern, not necessarily the same component, unless the shared surface stays clearly simpler.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend tests/build | ✓ | 24.14.0 | — |
| npm | Frontend test runner | ✓ | 11.9.0 | — |
| Go | Backend tests | ✓ | 1.26.1 installed; repo targets 1.25.0 | Use repo `go.mod` target as compatibility floor |

**Missing dependencies with no fallback:**
- None found for planning/research.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 and Go `testing` with testify 1.9.0 |
| Config file | `frontend/vitest.config.ts`; backend uses `go test` with package-local tests |
| Quick run command | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/lib/api.admin-anime.test.ts` |
| Full suite command | `cd frontend && npm test && cd ../backend && go test ./internal/services ./internal/handlers -count=1` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENR-01 | Create route shows explicit AniSearch ID input/button and draft-time status card | frontend unit/render | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx` | ✅ |
| ENR-02 | Create route keeps exact-ID AniSearch contract and no search/browse expansion | frontend API + backend service | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService -count=1` | ✅ |
| ENR-03 | Duplicate AniSearch ID returns redirect metadata and renders a direct redirect action on create | frontend API/render + backend service | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/create/page.test.tsx && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService_ReturnsRedirectForDuplicateAniSearchID -count=1` | ⚠️ Wave 0 for create UI assertions |
| ENR-04 | `manual > AniSearch > Jellyfin` holds in both load orders | frontend controller/unit + backend service regression | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService_PreservesManualValuesAndAppliesFillOnlyFollowup -count=1` | ⚠️ Wave 0 for create controller coverage |
| ENR-05 | Relation counts/warnings stay operator-visible and create remains usable after enrichment issues | frontend helper/unit + backend handler/service | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/lib/api.admin-anime.test.ts && cd ../backend && go test ./internal/handlers -run TestBuildAdminAnimeUpsertResponse_IncludesAniSearchWarningSummary -count=1` | ✅ |

### Sampling Rate
- **Per task commit:** `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/lib/api.admin-anime.test.ts`
- **Per wave merge:** `cd backend && go test ./internal/services ./internal/handlers -count=1`
- **Phase gate:** Frontend targeted create AniSearch regressions plus backend AniSearch service/handler regressions green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` or equivalent focused helper test file — covers load-order precedence and duplicate/conflict state transitions for ENR-03 and ENR-04.
- [ ] `frontend/src/lib/api/admin-anime-intake.test.ts` — covers create AniSearch request helper and redirect/draft response parsing if the helper is added there.
- [ ] Create-side summary/helper tests for updated fields, overwritten Jellyfin values, preserved manual values, and “not saved yet” copy if those move out of `page.test.tsx`.

## Sources

### Primary (HIGH confidence)
- Local phase context and UI contract:
  - `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-CONTEXT.md`
  - `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-UI-SPEC.md`
- Prior verified phase artifacts:
  - `.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-UAT.md`
  - `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-VERIFICATION.md`
- Current implementation seams:
  - `frontend/src/app/admin/anime/create/page.tsx`
  - `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`
  - `frontend/src/app/admin/anime/create/createPageHelpers.ts`
  - `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx`
  - `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx`
  - `frontend/src/lib/api/admin-anime-intake.ts`
  - `frontend/src/lib/api.ts`
  - `frontend/src/types/admin.ts`
  - `backend/internal/services/anime_create_enrichment.go`
  - `backend/internal/handlers/admin_content_anime.go`
  - `backend/internal/handlers/admin_content_anime_enrichment_edit.go`
  - `backend/internal/handlers/admin_content_anime_validation.go`
  - `backend/internal/models/admin_content.go`

### Secondary (MEDIUM confidence)
- Repo-level planning and workflow docs:
  - `.planning/REQUIREMENTS.md`
  - `.planning/STATE.md`
  - `.planning/ROADMAP.md`
  - `.planning/PROJECT.md`
  - `AGENTS.md`

### Tertiary (LOW confidence)
- None. No critical recommendations rely on unverified external sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses checked-in repo dependencies and existing phase-verified seams; no new library selection is required.
- Architecture: HIGH - Recommendations are derived directly from the current create/edit controller structure and verified backend contracts.
- Pitfalls: HIGH - Pitfalls are grounded in prior Phase 09/11 regressions and the current missing create-side state model.

**Research date:** 2026-04-10
**Valid until:** 2026-05-10
