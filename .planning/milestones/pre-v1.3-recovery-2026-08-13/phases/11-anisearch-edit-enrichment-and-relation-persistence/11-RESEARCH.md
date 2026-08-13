# Phase 11: AniSearch Edit Enrichment And Relation Persistence - Research

**Researched:** 2026-04-09
**Domain:** AniSearch admin enrichment, edit-route draft orchestration, and anime relation persistence
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### AniSearch Edit Enrichment
- **D-01:** AniSearch in the edit route uses override mode. Existing values are overwritten unless the admin explicitly protects them.
- **D-02:** Locked fields remain untouched during edit-route AniSearch loads.
- **D-03:** Field changes from AniSearch enrichment update the edit draft first. The admin still saves explicitly through the existing save flow.
- **D-04:** The existing source priority rule continues to apply: values manually changed after an AniSearch load are not overwritten again by a later AniSearch load unless the admin intentionally unlocks and reloads them.
- **D-05:** Temporary lookup text used to find a source candidate (for example a partial manual title typed only to search Jellyfin or AniSearch) does not count as a protected manual value. Once the admin selects a source and loads AniSearch enrichment, the AniSearch title should replace that provisional search text unless the field is explicitly locked afterwards.

### AniSearch Relation Persistence
- **D-06:** Relations resolved from AniSearch during edit are auto-applied to `anime_relations` immediately when the enrichment request succeeds.
- **D-07:** Existing relations are not duplicated.
- **D-08:** Unresolvable AniSearch relations are skipped silently.
- **D-09:** Relation matching continues to prefer `source = anisearch:{id}` first, then title-based fallback.
- **D-10:** The dedicated edit endpoint remains `POST /admin/anime/:id/enrichment/anisearch`.
- **D-11:** The create flow must also persist resolved AniSearch relations after anime creation instead of leaving them as draft-only data.

### API And Reuse Strategy
- **D-12:** The already existing AniSearch backend service stack (`AniSearchClient` plus `AnimeCreateEnrichmentService`) is the reuse baseline for this phase, not a new crawler implementation.
- **D-13:** Relation persistence should reuse the same AniSearch source lookup and approved-relation filtering rules already established in the create enrichment service.

### Code Quality Guardrails
- **D-14:** No single page component should exceed 700 lines after this phase. If needed, logic must be split into focused components, hooks, or helper modules.
- **D-15:** New or substantially touched code should include short explanatory comments for major sections and non-obvious helper functions so future maintainers understand purpose, not just mechanics.
- **D-16:** Frontend work for this phase must include a lightweight UI contract before implementation details sprawl. The planner should treat that contract as required input for the edit-page AniSearch placement and result presentation.

### Claude's Discretion
- Exact lock-model representation for edit-field protections as long as the override semantics stay clear
- Exact helper text wording and placement of the edit-route AniSearch controls
- Exact distribution of responsibilities between edit page, local hooks, and enrichment helper modules as long as the 700-line page limit is respected

### Deferred Ideas (OUT OF SCOPE)
- Free AniSearch search or browse UX on create or edit - still out of scope
- Public-facing AniSearch source display or browse tools - separate phase
- Broader metadata taxonomy expansion beyond the approved relation and enrichment use cases
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Improve the existing brownfield backend/frontend/admin surfaces instead of replacing them.
- Keep manual edits authoritative over imported data.
- Keep the workflow explicit; imported data must still pass through an editable form before save.
- Keep admin UX understandable, not backend-correct-only.
- Production code files should stay at or below 450 lines; split larger touched files before they become more monolithic.
- Shared API calls should continue to flow through `frontend/src/lib/api.ts` or existing colocated API helper modules.
- Backend handler construction stays explicit and centralized; do not introduce a DI container.
- Database evolution remains append-only through SQL migrations.
- Follow repo documentation discipline and keep debatable decisions durable in `DECISIONS.md`.
- Prefer documented APIs and avoid undocumented behavior.

## Summary

Phase 11 is not a simple UI add-on. The live repo already has a solid AniSearch fetch-and-resolve backend stack in `backend/internal/services/anisearch_client.go` and `backend/internal/services/anime_create_enrichment.go`, but it currently stops at create-time draft enrichment. The edit route only knows how to build and save a plain metadata PATCH, and the create endpoint still cannot accept or report relation persistence state.

The main planning fact is that Phase 11 must bridge three seams at once: an edit-only explicit enrichment endpoint, an idempotent relation persistence path, and a request/response contract extension for create-time follow-through. The safest approach is to reuse the AniSearch service and relation lookup logic, add an edit-specific override merge layer with protected fields, and keep create-time relation writes best-effort after anime creation so relation failures never block a successful create.

**Primary recommendation:** Build Phase 11 as a contract-extension phase around the existing AniSearch service: add `POST /admin/anime/:id/enrichment/anisearch`, add an idempotent relation-apply helper, and extend create/edit response shapes so AniSearch relation outcomes can be surfaced without changing the explicit save flow.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `backend/internal/services/AniSearchClient` | repo-local | Exact-ID AniSearch fetch, throttling, HTML parsing, relation extraction | Already implements the controlled AniSearch access model required by Phase 11 |
| `backend/internal/services/AnimeCreateEnrichmentService` | repo-local | AniSearch draft shaping, source-first relation resolution, create-flow merge rules | Already contains the relation matching and provenance rules the phase must reuse |
| `backend/internal/repository/AdminContentRepository` | repo-local | Anime create/update persistence plus relation repository APIs | Existing authoritative persistence seam for anime metadata and relations |
| `next` | 16.1.6 in repo, 16.2.3 latest verified 2026-04-08 | Admin App Router surface | Existing frontend runtime; preserve current stack instead of introducing new UI infrastructure |
| `react` | 18.3.1 in repo, 19.2.5 latest verified 2026-04-08 | Edit/create route client components and local state | Existing runtime; Phase 11 should stay within current React patterns already used by the repo |
| `go` | 1.25.0 in `go.mod`, 1.26.1 runtime available | Backend handler/service/repository implementation | Existing backend runtime; no new backend framework is needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 3.2.4 in repo, 4.1.4 latest verified 2026-04-09 | Frontend route/component/API helper tests | Use for edit-route card rendering, request-building, and create success/warning messaging tests |
| `eslint` | 9.39.2 in repo, 10.2.0 latest verified 2026-04-03 | Frontend linting | Use after UI/hook extraction to catch contract and JSX drift |
| `github.com/gin-gonic/gin` | 1.10.0 in repo, 1.12.0 latest available | HTTP routing/handlers | Reuse for the new edit enrichment endpoint |
| `github.com/jackc/pgx/v5` | 5.7.1 in repo, 5.9.1 latest available | SQL access | Reuse for relation persistence helpers and any response-shape support queries |
| `github.com/stretchr/testify` | 1.9.0 in repo, 1.11.1 latest available | Go assertions in tests | Existing backend test helper library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `AniSearchClient` + enrichment service | New crawler/service | Wrong direction; duplicates proven logic and risks breaking Phase 09 rate-limit and relation rules |
| Existing CSS modules/admin primitives | shadcn or a new component kit | Conflicts with locked UI contract and project constraint to preserve current admin design system |
| Post-create best-effort relation apply | In-transaction hard-fail relation writes | Stronger atomicity, but contradicts the locked soft-fail create behavior |

**Installation:**
```bash
cd frontend && npm install
cd ../backend && go mod download
```

**Version verification:** verified via `npm view` for `next`, `react`, `vitest`, and `eslint`, plus `go list -m -versions` for `gin`, `pgx/v5`, `go-redis/v9`, and `testify` on 2026-04-09.

## Architecture Patterns

### Recommended Project Structure
```text
backend/
- internal/handlers/admin_content_anime_enrichment_edit.go   # New edit-route AniSearch HTTP contract
- internal/services/anime_edit_enrichment.go                 # Override-mode merge + response shaping
- internal/services/anime_create_enrichment.go               # Shared AniSearch fetch/relation resolution helpers
- internal/repository/anime_relations_admin.go               # Idempotent relation apply helper

frontend/
- src/types/admin.ts                                         # Edit/create AniSearch request/response types
- src/lib/api.ts                                             # Edit-route AniSearch API helper
- src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx
- src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts
- src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx
```

### Pattern 1: Edit Enrichment Is Draft-First, Not PATCH-First
**What:** The edit AniSearch endpoint should accept current draft values plus an explicit protected-field list, return the next draft, and persist relations separately. It should not directly call `PATCH /admin/anime/:id` or bypass the save bar.
**When to use:** Every AniSearch load from `/admin/anime/[id]/edit`.
**Example:**
```typescript
// Source: repo pattern adapted from useAnimePatch + create AniSearch draft hydration
type AniSearchEditRequest = {
  anisearch_id: string
  draft: {
    title: string
    title_de?: string
    title_en?: string
    year?: number
    max_episodes?: number
    genre?: string
    description?: string
    source?: string
  }
  protected_fields: string[]
}
```

### Pattern 2: Reuse Source-First Relation Resolution, Then Apply Idempotently
**What:** Keep the existing relation target lookup order from `AnimeCreateEnrichmentService`: `anisearch:{id}` source match first, title fallback second. After resolution, apply relations with an idempotent repository helper that does not duplicate existing rows.
**When to use:** Edit-route relation auto-apply and create-time persisted follow-through.
**Example:**
```go
// Source: backend/internal/services/anime_create_enrichment.go
if relation.AniSearchID != "" {
	target, ok = matchBySource[normalizeLookupKey("anisearch:"+strings.TrimSpace(relation.AniSearchID))]
}
if !ok {
	target, ok = matchByTitle[normalizeLookupKey(relation.Title)]
}
```

### Pattern 3: Create-Time Relation Persistence Should Be Best-Effort After Anime Creation
**What:** Persist the anime first, then apply resolved AniSearch relations in a follow-through step that can emit warnings without rolling back the create.
**When to use:** Any create request that carries resolved AniSearch relations or AniSearch provenance.
**Example:**
```text
1. Create anime via existing authoritative create path.
2. If request carries resolved AniSearch relations, apply them with idempotent helper(s).
3. Return 201 with the anime plus optional AniSearch relation persistence summary/warnings.
```

### Anti-Patterns to Avoid
- **Reusing fill-only create merge for edit:** Edit is override mode with locks, not create fill-only semantics.
- **Treating provisional search text as a protected manual title:** This violates locked decision D-05.
- **Calling `CreateAdminAnimeRelation` in a loop for edit auto-apply:** Duplicate conflicts will surface as false failures unless relation application is made idempotent.
- **Hiding AniSearch logic inside `page.tsx` or `useAdminAnimeCreateController.ts`:** The current create controller is already 751 lines and over the repo-local 450-line constraint.
- **Adding new design-system dependencies:** Locked out by the UI contract and project guidance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AniSearch scraping | A second crawler or search workflow | Existing `AniSearchClient` | Already rate-limited, exact-ID only, and relation-aware |
| Relation target matching | New fuzzy relation resolver | Existing source-first/title-fallback logic in `AnimeCreateEnrichmentService` | Preserves approved-label and provenance behavior already established in Phase 09 |
| Edit save orchestration | A new save bar or parallel patch system | Existing `useAnimePatch` + `useAnimeEditor` flow | Keeps D-03 intact: AniSearch changes draft first, save remains explicit |
| UI shell/components | shadcn or ad-hoc visual redesign | Existing CSS-module admin cards, buttons, inputs, and section rhythm | Required by the approved UI contract |
| Accessibility grouping for lock controls | Custom div soup | Real `fieldset` + `legend` + live region status | Matches the UI contract and standard HTML accessibility patterns |

**Key insight:** Most of Phase 11 is integration glue between already-correct subsystems. The highest-risk work is not fetching AniSearch; it is preserving explicit operator control while making relation persistence durable and idempotent.

## Common Pitfalls

### Pitfall 1: Contract Drift Between Old Phase Docs And Live Code
**What goes wrong:** Plans assume a live create AniSearch helper or endpoint wiring that no longer exists in the codebase.
**Why it happens:** Phase 09 docs and UAT describe shipped behavior, but the current frontend still renders `AniSearch spaeter` and the create enrichment API helper/types are absent from live code.
**How to avoid:** Treat repo code as the source of truth for current implementation, and use Phase 09 docs only for reuse rules and locked semantics.
**Warning signs:** A referenced file path does not exist, or a plan assumes an AniSearch create button that the live create page does not render.

### Pitfall 2: Losing `anisearch:{id}` Provenance On Edit
**What goes wrong:** Edit enrichment updates titles and description, but the anime never stores the AniSearch source needed for future duplicate detection and source-first relation matching.
**Why it happens:** Current edit PATCH contracts do not carry `source`, `folder_name`, `alt_titles`, or `relations`.
**How to avoid:** Decide up front whether Phase 11 extends the PATCH contract or persists source through the enrichment endpoint itself.
**Warning signs:** The edit response summary looks correct, but later reloads cannot match by `source = anisearch:{id}`.

### Pitfall 3: Duplicate Relation Conflicts Break Edit Enrichment
**What goes wrong:** A successful AniSearch fetch returns 409/500 because one target relation already exists.
**Why it happens:** Current relation creation APIs are conflict-based manual APIs, not idempotent enrichment helpers.
**How to avoid:** Add a repository-level apply helper that no-ops existing `(source_anime_id, target_anime_id)` rows instead of surfacing duplicate errors.
**Warning signs:** The first AniSearch load works, the second identical load fails even though nothing functionally changed.

### Pitfall 4: Hard-Failing Create On Relation Persistence Errors
**What goes wrong:** Anime creation fails even though the anime row itself was valid and saved correctly.
**Why it happens:** Relation writes are forced into the same success/failure path as the core create.
**How to avoid:** Keep relation persistence best-effort and return warnings or summary metadata instead of turning relation issues into create failures.
**Warning signs:** Create returns 500 after the anime row is already visible in the database.

### Pitfall 5: Dirty-State Heuristics Accidentally Protect Provisional Lookup Text
**What goes wrong:** A search seed title stays in the draft even after AniSearch load, contradicting D-05.
**Why it happens:** The planner treats "field has text" or "field was edited once" as equivalent to "field is protected".
**How to avoid:** Make protection an explicit AniSearch lock state, separate from generic dirty state.
**Warning signs:** The first AniSearch load leaves the temporary lookup title unchanged even with no title lock active.

## Code Examples

Verified patterns from existing code and official docs:

### Source-First Relation Resolution
```go
// Source: /C:/Users/admin/Documents/Team4s/backend/internal/services/anime_create_enrichment.go
if relation.AniSearchID != "" {
	target, ok = matchBySource[normalizeLookupKey("anisearch:"+strings.TrimSpace(relation.AniSearchID))]
}
if !ok {
	target, ok = matchByTitle[normalizeLookupKey(relation.Title)]
}
if !ok {
	continue
}
```

### Existing Explicit Save Pattern On Edit
```typescript
// Source: /C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx
const editor = useAnimeEditor('edit', {
  isDirty: patch.isDirty,
  isSubmitting: patch.isSubmitting,
  onSubmit: () => {
    onRequest?.(null)
    onResponse?.(null)
    void patch.submit(anime.id)
  },
})
```

### Accessible Lock Grouping
```html
<!-- Source: MDN fieldset + UI contract requirement -->
<fieldset>
  <legend>Felder schuetzen</legend>
  <label><input type="checkbox" /> Titel</label>
  <label><input type="checkbox" /> Beschreibung</label>
</fieldset>
<p role="status" aria-live="polite">AniSearch Ergebnis</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic route files accumulate new behavior inline | Extract route logic into focused components/hooks/helpers | Phase 10 and ongoing | Phase 11 should add a dedicated AniSearch section component and hook, not inflate existing route/controller files |
| Provider sync acts like a hidden import | Explicit operator-driven enrichment with preview/draft semantics | Phase 09 baseline | Edit AniSearch must preserve explicit load and explicit save |
| Relation creation is manual and conflict-based | Enrichment relation apply should be idempotent and source-aware | Needed for Phase 11 | Planner must include a new helper instead of reusing only the manual create API |
| Create AniSearch was documented as live | Current repo has backend reuse pieces but frontend create UI is placeholder-only | Drift visible on 2026-04-09 | Planner must not assume finished Phase 09 frontend behavior exists |

**Deprecated/outdated:**
- Old canonical ref `frontend/src/app/admin/anime/create/anisearchCreateEnrichment.ts`: not present in the live repo.
- Any plan that assumes AniSearch create relation persistence already happens in `POST /api/v1/admin/anime`: false in the current request/response models.

## Open Questions

1. **How should edit enrichment handle an AniSearch ID already claimed by another local anime?**
   - What we know: Create enrichment already returns redirect metadata on duplicate `source='anisearch:{id}'`. The edit path has no current duplicate policy.
   - What's unclear: Whether edit should error, redirect, or allow source reassignment.
   - Recommendation: Make this an explicit planning decision before implementation. Default to `409 conflict` plus redirect metadata to avoid silent provenance collisions.

2. **Where should persisted AniSearch source live for edit saves?**
   - What we know: Edit PATCH cannot persist `source`, but relation lookup rules depend on `anisearch:{id}` provenance.
   - What's unclear: Whether Phase 11 extends PATCH models or persists source inside the edit enrichment endpoint.
   - Recommendation: Resolve this in Wave 0. Do not plan field locks/UI work without first deciding the source persistence seam.

3. **How should create success warnings be shaped?**
   - What we know: The current create response is just `{ data: item }`, while the UI contract expects create success notes and warning-level relation persistence feedback when possible.
   - What's unclear: Whether to extend the response envelope, create a parallel warning header, or keep warnings frontend-local.
   - Recommendation: Extend the create response envelope with optional AniSearch metadata. It is the cleanest way to support success notes without guessing on the client.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend tests and package tooling | Yes | 24.14.0 | None |
| npm | Frontend package/version checks | Yes | 11.9.0 | None |
| Go | Backend implementation and tests | Yes | 1.26.1 runtime | None |
| Docker | Manual full-stack UAT if needed | Yes | 29.2.1 | Use targeted `go test` and `vitest` when full stack is unnecessary |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 for frontend, `go test` + `testify` for backend |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- src/app/admin/anime/[id]/edit/page.test.tsx src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.test.tsx && cd ../backend && go test ./internal/services ./internal/handlers ./internal/repository -run "TestAnimeCreateEnrichment|TestCreateAnimeRelation|TestMapAdminRelation" -count=1` |
| Full suite command | `cd frontend && npm test && cd ../backend && go test ./...` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| `P11-EDIT-ENRICH-01` | Edit route loads AniSearch by explicit ID, updates draft only, preserves save-bar semantics | frontend unit + backend handler | `cd frontend && npm test -- src/app/admin/anime/[id]/edit/page.test.tsx` plus backend handler test | No - Wave 0 |
| `P11-EDIT-LOCK-02` | Protected fields are skipped; provisional title is replaceable until locked | frontend hook/component + backend service | `cd frontend && npm test -- src/app/admin/anime/hooks/useManualAnimeDraft.test.ts` plus new backend service test | No - Wave 0 |
| `P11-REL-EDIT-03` | Edit enrichment auto-applies resolvable relations without duplicates | backend repository/handler | `cd backend && go test ./internal/handlers ./internal/repository -run "Test.*Relation.*AniSearch" -count=1` | No - Wave 0 |
| `P11-REL-CREATE-04` | Create persists AniSearch relations after anime creation and returns warning metadata on soft failure | backend handler/repository + frontend API helper | `cd backend && go test ./internal/handlers ./internal/repository -run "TestCreateAnime.*AniSearch" -count=1` | No - Wave 0 |
| `P11-UI-A11Y-05` | AniSearch card uses fieldset/legend and live-region result summary | frontend component | `cd frontend && npm test -- src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest + targeted `go test` command for touched seam
- **Per wave merge:** `cd frontend && npm test && cd ../backend && go test ./internal/services ./internal/handlers ./internal/repository -count=1`
- **Phase gate:** full frontend suite and backend `go test ./...` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx` - edit AniSearch card rendering, copy, and accessibility
- [ ] `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts` - lock/provisional-title/request-building behavior
- [ ] `backend/internal/handlers/admin_content_anime_enrichment_edit_test.go` - edit endpoint contract and relation summary responses
- [ ] `backend/internal/repository/anime_relations_admin_test.go` additions - idempotent AniSearch relation apply helper coverage
- [ ] `frontend/src/lib/api.admin-anime.test.ts` additions - create/edit AniSearch response metadata propagation

## Sources

### Primary (HIGH confidence)
- Repo code:
  - `/C:/Users/admin/Documents/Team4s/backend/internal/services/anisearch_client.go`
  - `/C:/Users/admin/Documents/Team4s/backend/internal/services/anime_create_enrichment.go`
  - `/C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anisearch.go`
  - `/C:/Users/admin/Documents/Team4s/backend/internal/repository/anime_relations_admin.go`
  - `/C:/Users/admin/Documents/Team4s/backend/internal/repository/admin_content_anime_metadata.go`
  - `/C:/Users/admin/Documents/Team4s/backend/cmd/server/admin_routes.go`
  - `/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
  - `/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`
  - `/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts`
  - `/C:/Users/admin/Documents/Team4s/frontend/src/lib/api.ts`
- Official docs:
  - https://nextjs.org/docs
  - https://vitest.dev/guide/
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/fieldset
  - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- Official package registries/pages, versions verified with local commands:
  - https://www.npmjs.com/package/next
  - https://www.npmjs.com/package/react
  - https://www.npmjs.com/package/vitest
  - https://www.npmjs.com/package/eslint

### Secondary (MEDIUM confidence)
- Phase docs used only for locked semantics and baseline intent:
  - `/C:/Users/admin/Documents/Team4s/.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-01-PLAN.md`
  - `/C:/Users/admin/Documents/Team4s/.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-02-PLAN.md`
  - `/C:/Users/admin/Documents/Team4s/.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-UAT.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - mostly verified from live repo manifests and package/module registries
- Architecture: MEDIUM - core reuse seams are clear, but edit/create contract extensions are not implemented yet
- Pitfalls: HIGH - directly supported by current code gaps, stale path drift, and existing API/test boundaries

**Research date:** 2026-04-09
**Valid until:** 2026-04-16
