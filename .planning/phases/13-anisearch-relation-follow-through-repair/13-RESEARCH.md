# Phase 13: AniSearch Relation Follow-Through Repair - Research

**Researched:** 2026-04-10
**Domain:** AniSearch create-time relation persistence and operator feedback repair
**Confidence:** HIGH

## User Constraints

No phase `13-CONTEXT.md` exists yet.

Locked scope from the phase prompt:
- Tight repair phase only.
- Focus on AniSearch relation persistence and follow-through gaps after create.
- Do not reopen unrelated create UI work.
- Build on the verified Phase 12 create-intake seam and the verified Phase 11 relation/edit seam.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENR-05 | AniSearch relation import writes only locally resolvable approved relations, skips unresolved relations, and leaves the draft usable when enrichment fails. | Existing `AnimeCreateEnrichmentService.resolveRelations` already filters approved labels and returns only resolvable local relations; Phase 13 should preserve that resolved list through create submit instead of dropping it. |
| ENR-10 | Create and edit flows persist AniSearch provenance as `source='anisearch:{id}'`, and create persists resolved AniSearch relations best-effort after anime creation with operator-visible warning metadata when relation follow-through fails. | Edit already persists relations through `ApplyAdminAnimeEnrichmentRelationsDetailed`; create already has a follow-through seam in `CreateAnime`, but the current frontend create contract drops `relations` and the current success helper can mislabel clean `skipped_existing` outcomes as warnings. |

## Summary

Phase 13 is a repair, not a redesign. The backend already has the intended create-side follow-through seam: `CreateAnime` accepts `relations`, then calls `applyAniSearchCreateFollowThrough`, which in turn uses the shared idempotent repository method `ApplyAdminAnimeEnrichmentRelationsDetailed`. The create enrichment service also already resolves only approved, locally resolvable AniSearch relations and places them in the draft payload. The break is in the handoff between those two verified halves.

The current create frontend keeps AniSearch draft state, source linkage, and summary messaging, but it never serializes `draft.relations` into the final `POST /api/v1/admin/anime` payload. That means resolvable relations can be visible in the draft stage yet never reach the create handler for persistence. Separately, the success helper currently treats `relations_attempted > relations_applied` as a warning even when the remainder is entirely `relations_skipped_existing`, so operator feedback can imply failure when the system actually behaved correctly and idempotently.

**Primary recommendation:** Keep the existing create POST and shared repository apply path; repair the create request contract to carry AniSearch-resolved `relations`, and change success-warning math to treat `applied + skipped_existing == attempted` as clean unless explicit warnings are present.

## Project Constraints (from CLAUDE.md)

- Improve the existing brownfield backend/frontend/admin code instead of replacing working surfaces.
- Preserve Team4s stack, routes, and database evolution model.
- Manual data remains authoritative over imported data.
- Admin workflow changes must stay understandable to operators, not just technically correct.
- Production code files should stay at or below 450 lines; split before they become monolithic.
- Shared API calls should stay centralized in `frontend/src/lib/api.ts` or the existing intake helper seam rather than scattered raw fetch calls.
- Use documented APIs and avoid undocumented behavior.
- Do not edit outside a GSD workflow unless explicitly asked.

## Standard Stack

### Core

| Library / Surface | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| Go | repo `go 1.25.0`, local `go1.26.1` | Backend handler/service/repository repair | Existing backend stack and tests already cover the AniSearch flow. |
| Gin | `github.com/gin-gonic/gin v1.10.0` | Admin HTTP handlers | Existing create/edit admin routes are already implemented here. |
| pgx | `github.com/jackc/pgx/v5 v5.7.1` | DB persistence | Existing relation repository and tests already use it. |
| Next.js App Router | `next 16.1.6` | Admin create UI/controller | Existing AniSearch create seam lives here. |
| React | `18.3.1` | Create controller state and summary UX | Current create route already stores AniSearch draft state here. |

### Supporting

| Library / Surface | Version | Purpose | When to Use |
|-------------------|---------|---------|-------------|
| Vitest | `3.2.4` | Frontend regression coverage | For controller, helper, and API payload serialization tests. |
| `backend/internal/services/anime_create_enrichment.go` | repo-local | AniSearch relation resolution | Reuse for approved-label filtering and source-first/title-fallback matching. |
| `backend/internal/repository/anime_relations_admin.go` | repo-local | Idempotent relation apply | Reuse for create follow-through; do not duplicate persistence logic in handlers. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `POST /api/v1/admin/anime` with optional `relations` | New dedicated create-follow-through endpoint | Unnecessary surface area; current handler already accepts `relations` and already builds the summary envelope. |
| Sending the resolved draft relation list on submit | Re-fetch AniSearch on save | Violates the verified explicit-load model, risks extra AniSearch traffic/rate-limit issues, and can drift from the reviewed draft. |
| Reusing `ApplyAdminAnimeEnrichmentRelationsDetailed` | Custom create-only insert loop | Would duplicate idempotency and count semantics already implemented and tested. |

**Installation:**
```bash
# No new packages recommended for this phase.
```

## Architecture Patterns

### Recommended Project Structure

```text
backend/internal/handlers/
  admin_content_anime.go              # create follow-through entrypoint
  admin_content_handler.go            # create request contract

backend/internal/repository/
  anime_relations_admin.go            # idempotent relation apply

backend/internal/services/
  anime_create_enrichment.go          # relation resolution and summary builder

frontend/src/app/admin/anime/create/
  useAdminAnimeCreateController.ts    # final create payload assembly
  createPageHelpers.ts                # success/warning copy
  *.test.ts(x)                        # controller/helper regressions

frontend/src/types/
  admin.ts                            # shared create request contract

frontend/src/lib/
  api.ts
  api/admin-anime-intake.ts           # create POST and AniSearch intake helpers
```

### Pattern 1: Carry Resolved AniSearch Relations Through the Existing Create POST

**What:** Treat the AniSearch draft result as the authoritative source of create-time resolved relations and serialize that optional list into the existing create request.

**When to use:** Only when an active AniSearch draft result exists and its `source` is still the selected create source.

**Example:**
```typescript
// Source: frontend create controller + backend create handler
const payload = appendCreateSourceLinkageToPayload(basePayload, {
  aniSearchDraftResult,
  jellyfinPreview,
})

if (aniSearchDraftResult?.draft.relations?.length) {
  payload.relations = aniSearchDraftResult.draft.relations
}
```

```go
// Source: backend/internal/handlers/admin_content_anime.go
aniSearchSummary := h.applyAniSearchCreateFollowThrough(c, item.ID, req.Source, req.Relations)
```

### Pattern 2: Warning State Must Follow Accounting, Not Partial Counts

**What:** A clean best-effort outcome is `relations_attempted == relations_applied + relations_skipped_existing` with no explicit warnings.

**When to use:** In create success copy and redirect-delay summary logic.

**Example:**
```typescript
// Source: frontend/src/app/admin/anime/create/createPageHelpers.ts
const accountedFor =
  summary.relations_applied + summary.relations_skipped_existing

const hasWarning =
  (summary.warnings ?? []).length > 0 ||
  summary.relations_attempted > accountedFor
```

### Pattern 3: Keep Relation Resolution Single-Sourced in the Enrichment Service

**What:** Use `AnimeCreateEnrichmentService.resolveRelations` as the only place that filters approved labels and resolves source-first/title-fallback matches.

**When to use:** For both create and edit AniSearch flows.

**Example:**
```go
// Source: backend/internal/services/anime_create_enrichment.go
resolvedRelations, _, _, err := s.resolveRelations(ctx, aniSearchAnime.Relations)
draft.Relations = append([]models.AdminAnimeRelation(nil), resolvedRelations...)
```

### Anti-Patterns to Avoid

- **Re-fetch AniSearch during create submit:** The reviewed draft already contains the resolved relation list. Re-fetching adds a second provider call and can produce a different result than the operator reviewed.
- **Create-only relation SQL in the handler:** The repository already owns dedupe and `ON CONFLICT DO NOTHING` semantics.
- **Treating `skipped_existing` as failure:** That breaks operator trust by labeling idempotent success as a warning.
- **Broadening scope into unrelated create UI changes:** This phase is a seam repair, not another create-page feature pass.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AniSearch relation resolution | A second matcher in controller or handler | `AnimeCreateEnrichmentService.resolveRelations` | Approved-label filtering and source/title matching already live there. |
| Create relation persistence | Manual insert loop in create handler | `ApplyAdminAnimeEnrichmentRelationsDetailed` | Already returns attempted/applied/skipped counts and is idempotent. |
| Duplicate relation handling | Client-side dedupe heuristics only | Repository `ON CONFLICT DO NOTHING` + existing dedupe | DB-backed idempotency is already implemented. |
| Operator feedback channel | New banner or modal system | Existing create success message seam in `createPageHelpers.ts` | Current redirect-delay UX is already verified and sufficient for the repair. |

**Key insight:** The system already has the right backend primitives. Phase 13 should repair the broken contract between the verified AniSearch draft state and the verified create follow-through seam, not add another relation system.

## Common Pitfalls

### Pitfall 1: Dropping `relations` Between Draft Load and Create Submit

**What goes wrong:** AniSearch draft load resolves relations, but the final create request sends only metadata plus `source`.

**Why it happens:** `AdminAnimeCreateRequest` in the frontend lacks `relations`, and `useAdminAnimeCreateController` never appends `aniSearchDraftResult.draft.relations`.

**How to avoid:** Add optional `relations` to the shared create request contract and serialize it only when an AniSearch draft result is active.

**Warning signs:** Draft summary shows local relation matches, create succeeds, but the new anime opens without any persisted relations.

### Pitfall 2: False Warning Copy for Idempotent Outcomes

**What goes wrong:** The UI warns whenever `attempted > applied`, even if the remainder is entirely `skipped_existing`.

**Why it happens:** `createPageHelpers.ts` ignores `relations_skipped_existing` in warning detection.

**How to avoid:** Compute warning state from `attempted > applied + skipped_existing` or explicit warnings.

**Warning signs:** Operators see warning copy even when the only non-applied relations were already present locally.

### Pitfall 3: Re-Scraping AniSearch on Save

**What goes wrong:** Save-time behavior no longer matches the draft the operator reviewed, and it risks extra AniSearch traffic.

**Why it happens:** It can seem easier to re-resolve after the anime gets an ID.

**How to avoid:** Persist the already resolved draft relation list; do not introduce a second AniSearch fetch.

**Warning signs:** New save-time code touches AniSearch client/fetcher instead of the create payload and existing repository apply seam.

### Pitfall 4: Testing Only Copy, Not the Broken Payload Handoff

**What goes wrong:** Tests pass for summary text and response parsing while the actual create POST still omits `relations`.

**Why it happens:** Existing coverage is strong around helper copy and response DTOs but thin around the final create request body.

**How to avoid:** Add request-body assertions in frontend controller/API tests and a create-handler follow-through regression in backend tests.

**Warning signs:** No test fails if `relations` disappears from the create request.

## Code Examples

Verified patterns from the current codebase:

### Existing Create Follow-Through Seam

```go
// Source: backend/internal/handlers/admin_content_anime.go
aniSearchSummary := h.applyAniSearchCreateFollowThrough(c, item.ID, req.Source, req.Relations)
c.JSON(http.StatusCreated, buildAdminAnimeUpsertResponse(item, aniSearchSummary))
```

### Existing Shared Idempotent Apply Path

```go
// Source: backend/internal/repository/anime_relations_admin.go
INSERT INTO anime_relations (source_anime_id, target_anime_id, relation_type_id)
SELECT $1, $2, rt.id
FROM relation_types rt
WHERE rt.name = $3
ON CONFLICT (source_anime_id, target_anime_id, relation_type_id) DO NOTHING
```

### Current Broken Warning Heuristic to Replace

```typescript
// Source: frontend/src/app/admin/anime/create/createPageHelpers.ts
if ((summary.warnings ?? []).length > 0) return true;
return summary.relations_attempted > summary.relations_applied;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Draft resolves relations but create submit only carries `source`/metadata | Create submit should carry optional resolved `relations` through the existing POST | Broken state observed after Phase 12 verification on 2026-04-10 | Without this repair, create-time relation follow-through cannot actually persist anything. |
| Warning when `attempted > applied` | Warning only when explicit warnings exist or `attempted > applied + skipped_existing` | Needed for Phase 13 repair | Prevents false failure messaging for idempotent skips. |
| Re-resolve at submit (tempting fix) | Reuse the reviewed draft relation list | Recommended for Phase 13 | Preserves explicit-load semantics and avoids extra AniSearch traffic. |

**Deprecated/outdated:**
- Treating create-side AniSearch relation success as a frontend copy problem only. The real defect is the request-contract handoff.

## Open Questions

1. **Should create submit serialize `relations` only from `aniSearchDraftResult`, or also from any other draft snapshot state?**
   - What we know: The active AniSearch draft result already contains the resolved relation list and is the only verified AniSearch create state holder.
   - What's unclear: Whether any secondary local state mirrors relations today.
   - Recommendation: Use `aniSearchDraftResult.draft.relations` only. Keep the source of truth singular.

2. **Should create response warnings stay generic or become more specific for partial follow-through?**
   - What we know: The current envelope already supports counts plus warnings; helper copy is already operator-visible before redirect.
   - What's unclear: Whether richer unresolved/skipped wording is needed for v1.1.
   - Recommendation: Fix accounting first. Only add richer wording if the repair still leaves ambiguous operator feedback.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go | Backend handler/service/repository tests | yes | `go1.26.1` | none |
| Node.js | Frontend tests/build | yes | `v24.14.0` | none |
| npm | Frontend Vitest runs | yes | `11.9.0` | none |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Go test + Vitest 3.2.4 |
| Config file | [frontend/vitest.config.ts](/C:/Users/admin/Documents/Team4s/frontend/vitest.config.ts) |
| Quick run command | `cd backend && go test ./internal/handlers ./internal/services ./internal/repository -count=1` |
| Full suite command | `cd backend && go test ./... -count=1` and `cd frontend && npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENR-05 | Create submit preserves only already-resolved approved AniSearch relations and unresolved relations remain skipped/non-blocking | unit + handler regression | `cd backend && go test ./internal/services ./internal/handlers -count=1` | yes, augment existing |
| ENR-10 | Create response summary matches real follow-through outcomes, including idempotent `skipped_existing` and warning cases | frontend helper + API + handler regression | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/lib/api.admin-anime.test.ts` | yes, augment existing |

### Sampling Rate

- **Per task commit:** targeted backend `go test` plus targeted frontend `npm test -- ...create...`
- **Per wave merge:** `cd backend && go test ./... -count=1` and `cd frontend && npm test`
- **Phase gate:** Full targeted backend/frontend regressions green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] [frontend/src/types/admin.ts](/C:/Users/admin/Documents/Team4s/frontend/src/types/admin.ts) and create API tests need a regression proving `AdminAnimeCreateRequest` can carry optional `relations`.
- [ ] [frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts) needs a case asserting final create submit includes `aniSearchDraftResult.draft.relations`.
- [ ] [frontend/src/app/admin/anime/create/page.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/create/page.test.tsx) needs a clean-path assertion where `attempted == applied + skipped_existing` does not show warning copy.
- [ ] [backend/internal/handlers/admin_content_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_test.go) needs a create-handler regression asserting `req.Relations` drives follow-through counts in the response envelope.

## Sources

### Primary (HIGH confidence)

- Repo source: `backend/internal/handlers/admin_content_anime.go` - create follow-through seam and summary envelope.
- Repo source: `backend/internal/handlers/admin_content_handler.go` - backend create request contract already includes `relations`.
- Repo source: `backend/internal/services/anime_create_enrichment.go` - approved-label filtering, source-first/title-fallback resolution, and create summary builder.
- Repo source: `backend/internal/repository/anime_relations_admin.go` - idempotent relation apply and counter semantics.
- Repo source: `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - final create payload assembly currently omits `relations`.
- Repo source: `frontend/src/app/admin/anime/create/createPageHelpers.ts` - current warning heuristic and success copy seam.
- Repo source: `frontend/src/types/admin.ts` - frontend create request contract currently lacks `relations`.
- Repo source: Phase verification docs `11-VERIFICATION.md` and `12-VERIFICATION.md` - confirmed verified seams and remaining repair scope.

### Secondary (MEDIUM confidence)

- Repo tests: `backend/internal/services/anime_create_enrichment_test.go` - proves approved/resolvable relation filtering and source-first matching.
- Repo tests: `backend/internal/repository/anime_relations_admin_test.go` - proves duplicate apply no-ops safely.
- Repo tests: `frontend/src/app/admin/anime/create/page.test.tsx` and `frontend/src/lib/api.admin-anime.test.ts` - proves current summary parsing/copy coverage, but not payload handoff.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing project stack and versions are directly visible in `backend/go.mod`, `frontend/package.json`, and local runtime probes.
- Architecture: HIGH - the create/edit AniSearch flow, relation repo, and current contract gap are explicit in the current code.
- Pitfalls: HIGH - both primary failure modes are visible in live code paths, not inferred from stale docs.

**Research date:** 2026-04-10
**Valid until:** 2026-05-10
