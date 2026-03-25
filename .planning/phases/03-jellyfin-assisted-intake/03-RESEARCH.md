# Phase 03: Jellyfin-Assisted Intake - Research

**Researched:** 2026-03-25
**Domain:** Jellyfin-assisted admin intake on the existing shared anime create flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Jellyfin trigger model
- **D-01:** The create draft keeps the anime-name input as the anchor field and exposes two adjacent source actions: `Jellyfin Sync` and `AniSearch Sync`.
- **D-02:** Both source buttons are disabled until the admin has typed something meaningful into the anime-name field.
- **D-03:** In Phase 3, `AniSearch Sync` is only a prepared button/placeholder. The real AniSearch fetch logic comes later.

### Jellyfin source selection
- **D-04:** Jellyfin candidate selection starts from a lightweight dropdown-style first choice rather than a separate heavy search surface.
- **D-05:** The admin uses the folder/order name as the primary match signal for picking the right Jellyfin source.
- **D-06:** Exact or stronger matches should be shown first when helpful, but the admin still chooses the final candidate manually.

### Candidate evidence and selection UI
- **D-07:** Jellyfin candidates should be presented as a clean, card-based UI rather than a plain list/table because visual confidence is essential here.
- **D-08:** Each candidate must show enough evidence to verify the match: title, Jellyfin ID, full path, library or parent-order context, and type hints.
- **D-09:** Candidate cards must include visual previews for poster, banner, logo, and background so the admin can judge the source quality before import.

### Draft handoff and asset handling
- **D-10:** After the admin chooses a Jellyfin candidate, the existing shared draft screen opens immediately and is already prefilled.
- **D-11:** Asset inclusion/exclusion does not happen on the candidate card. All available Jellyfin assets can flow into the prefilled draft first, and the admin removes unwanted assets there.
- **D-12:** The central save bar from earlier phases remains the only save model for Jellyfin-assisted create as well.

### Type suggestion and cross-source hints
- **D-13:** Jellyfin-derived anime type remains a suggestion only, never a hard assignment.
- **D-14:** The suggested type should include a visible explanation based on path or naming context so the admin understands why it was proposed.
- **D-15:** When multiple sources later disagree, the UI should show the competing source hints while leaving the actual field fully editable by the admin.

### the agent's Discretion
- Exact visual layout of the Jellyfin candidate cards, as long as the evidence and preview density stay high and the interaction remains clear.
- Whether the first-step chooser is implemented as a lightweight dropdown, command palette, or similar compact picker, as long as it still feeds into the richer candidate review and draft handoff.
- Exact ranking rules for stronger vs weaker Jellyfin matches, as long as the admin still has explicit manual control over the final choice.

### Deferred Ideas (OUT OF SCOPE)
- Real AniSearch fetch and merge behavior - deferred to a later phase even though the trigger button should appear now.
- Full source provenance UI and fill-only resync logic - Phase 4.
- Full manual upload parity for non-cover assets - later phase.
- Broader source conflict resolution rules between Jellyfin and AniSearch beyond visible hints - later phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTK-03 | Admin can cancel a Jellyfin-assisted draft without creating a Team4s anime record. | Reuse the existing unsaved create draft route and `useAnimeEditor` save-bar contract; do not persist anything before explicit create. |
| JFIN-01 | Admin can search or browse Jellyfin candidates before creating an anime from Jellyfin. | Extend the current create route with a title-anchored source picker that calls a draft-safe Jellyfin search endpoint. |
| JFIN-02 | Admin can see Jellyfin item identity and path during source selection. | Expand candidate payloads to include Jellyfin ID, full path, and library/parent context, then surface them on card UI. |
| JFIN-04 | Admin can import a Jellyfin candidate into an editable draft that prefills available metadata before save. | Add a new intake preview contract that returns draft field values and asset candidates for the shared create workspace. |
| JFIN-05 | Admin can review Jellyfin-provided description, year, genres or tags, AniDB ID, cover, logo, banner, background, and background video in the draft before deciding to save. | The draft preview payload must include normalized metadata plus per-slot asset candidates, with deselection/editing happening in the draft. |
| JFIN-06 | Admin can accept or override a suggested anime type derived from Jellyfin folder structure or naming context. | Generate a non-authoritative type hint with visible reasoning from Jellyfin path/name conventions; keep the `type` field fully editable. |
</phase_requirements>

## Summary

Phase 3 should be planned as an extension of the existing manual create draft, not as a new product surface. The current `/admin/anime/create` page already owns unsaved draft state, save-bar readiness, cover upload, and redirect-after-create behavior. The current Jellyfin code does exist, but it is built for syncing episodes into an already persisted anime and therefore cannot be reused directly for intake-prefill without introducing incorrect assumptions.

The main planning work is a new draft-only Jellyfin intake contract across backend and frontend. Search can reuse the existing Jellyfin transport seam, but the current search payload is too thin for the required evidence and the current preview endpoint is tied to `anime_id`, season sync, and episode statistics. Phase 3 needs a separate intake preview that resolves one Jellyfin candidate into editable anime draft fields plus image/media evidence, then hydrates the same shared create workspace immediately.

There is one important architectural decision to make up front. The current create payload is manual-only and does not persist Jellyfin linkage. Inference from the Phase 4 roadmap and existing `anime.source` / sync repository seams: if future-safe Jellyfin provenance is required, Phase 3 should probably add optional source-link persistence now even if the Phase 4 UI for showing it is deferred.

**Primary recommendation:** Keep `/admin/anime/create` as the only create screen, add a dedicated Jellyfin intake preview contract for draft hydration, and avoid reusing the persisted-anime sync preview as intake infrastructure.

## Project Constraints (from CLAUDE.md)

- Improve the brownfield backend/frontend/admin code instead of replacing working surfaces.
- Keep existing Team4s stack, routes, and database evolution model intact.
- Manual edits must remain authoritative over Jellyfin imports.
- Jellyfin import must always pass through an editable form before save.
- V1 remains admin-only.
- Admin actions need audit attribution by user ID; operational errors must be visible immediately in the UI.
- Production code files should stay at or below 450 lines.
- Admin workflow changes require explicit UX attention, not backend-only correctness.
- Only cover upload is currently productionized; other anime media upload surfaces need planning and follow-up work.
- Jellyfin access depends on `.env` configuration and API connectivity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 in repo, registry latest 16.2.1 on 2026-03-24 | Admin create route, App Router UI, route composition | Already powers the admin surface; no reason to introduce another UI layer for this phase. |
| React | 18.3.1 in repo, registry latest 19.2.4 on 2026-03-24 | Draft state, candidate selection state, shared create UX | Existing admin create flow already uses React state successfully; stay consistent. |
| TypeScript | 5.7.2 in repo, registry latest 6.0.2 on 2026-03-24 | Shared request/response types and draft contracts | Current admin code and tests are already typed around these seams. |
| Vitest | 3.2.4 in repo, registry latest 4.1.1 on 2026-03-23 | Frontend behavior tests for create flow and utilities | Existing admin create and draft-state tests already use it. |
| Go HTTP handlers + repository layer | Go 1.26.1 installed locally; repo architecture unchanged | Admin Jellyfin search/preview/create wiring | Current backend already exposes Jellyfin admin endpoints and repository seams. |
| Jellyfin HTTP API | Stable OpenAPI snapshot published 2025-12-15 | Upstream source lookup and image/media metadata | Official Jellyfin supports item search, item fields, and standard image types needed for evidence. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `frontend/src/lib/api.ts` fetch client seam | repo-local | Frontend API calls | Use for all admin requests instead of adding raw `fetch` calls in route components. |
| CSS modules in admin routes | repo-local | Candidate card and draft UI styling | Use for the polished Phase 3 surface while staying within existing styling patterns. |
| Existing Jellyfin hook seam | repo-local | Shared feedback/loading/error patterns | Reuse patterns from `useJellyfinSync`, but do not force the existing persisted-anime state model onto intake. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `api.ts` client seam | `@jellyfin/sdk` 0.13.0 | Adds dependency and mapping overhead for little Phase 3 value; current repo already uses backend proxy handlers and typed fetch wrappers. |
| Shared create page extension | Separate Jellyfin wizard route | Violates the established "one shared editor shell" direction and increases divergence immediately before Phase 4. |
| Backend-mediated image/media URLs | Browser-direct Jellyfin calls | Would expose API-key and auth concerns in the browser; unsafe and contrary to current documented API preference. |

**Installation:**
```bash
npm install
```

**Version verification:** Verified via `frontend/package.json` for repo-pinned versions and `npm view` for current registry versions on 2026-03-25. No dependency upgrade is recommended for this phase.

## Architecture Patterns

### Recommended Project Structure
```text
frontend/src/app/admin/anime/
|- create/page.tsx                          # single shared create entry, now with source actions
|- components/ManualCreate/                 # existing shared draft workspace
|- components/JellyfinIntake/               # new compact picker + candidate review UI
|- hooks/useJellyfinIntake.ts               # draft-safe intake hook
|- hooks/internal/useJellyfinIntakeImpl.ts  # search + candidate preview orchestration
|- utils/jellyfin-intake-*.ts               # ranking, type-hint reasoning, payload mapping
`- ...

backend/internal/handlers/
|- jellyfin_search.go                       # keep for candidate lookup, expand payload carefully
|- jellyfin_intake_preview.go               # new draft-prefill contract
`- admin_content_anime*.go                  # optional create payload/linkage extension if approved
```

### Pattern 1: Shared Draft Surface, Source-Specific Prefill
**What:** Keep the current create draft as the only editing surface, and let Jellyfin selection only hydrate draft state.
**When to use:** For all Phase 3 entry and review behavior.
**Example:**
```tsx
const manualDraftState = resolveManualCreateState({
  title: createTitle,
  cover_image: createCoverImage,
  year: createYear,
  max_episodes: createMaxEpisodes,
  title_de: createTitleDE,
  title_en: createTitleEN,
  genre: createGenreTokens,
  description: createDescription,
})
```
Source: local project pattern in `frontend/src/app/admin/anime/create/page.tsx`

### Pattern 2: Thin Frontend Client, Backend-Side Jellyfin Knowledge
**What:** Keep Jellyfin API details in backend handlers, and expose only Team4s-specific draft/search payloads to the frontend.
**When to use:** For candidate evidence, asset URLs, type hints, and any Jellyfin image lookup.
**Example:**
```ts
export async function searchAdminJellyfinSeries(
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminJellyfinSeriesSearchResponse> {
  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) {
    search.set('limit', String(params.limit))
  }
  return fetch(/* Team4s backend endpoint */) as Promise<AdminJellyfinSeriesSearchResponse>
}
```
Source: local project pattern in `frontend/src/lib/api.ts`

### Pattern 3: Type Hint, Not Type Assignment
**What:** Derive a suggested anime type from Jellyfin naming/path evidence and show the reasoning next to the editable field.
**When to use:** Whenever the Jellyfin intake preview returns a proposed `type`.
**Example:**
```ts
type JellyfinTypeHint = {
  suggestedType: AnimeType | null
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
}
```
Source: recommended Phase 3 contract derived from current `AnimeType` model plus context decisions

### Anti-Patterns to Avoid
- **Reusing the existing `/admin/anime/{id}/jellyfin/preview` contract for create:** It requires a persisted anime, resolves against existing anime titles/source, and returns episode-sync statistics instead of draft fields and assets.
- **Creating a second create/edit shell for Jellyfin:** Breaks the Phase 1 and Phase 2 shared-editor direction.
- **Putting per-asset accept/reject controls on candidate cards:** Conflicts with locked decision D-11 and duplicates the draft review step.
- **Treating Jellyfin season structure as canonical anime product truth:** Official Jellyfin show organization encourages `Season 00` specials and season grouping, which often does not match anime catalog entities one-to-one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Create workflow branching | A separate persisted Jellyfin wizard | The existing shared create page + `ManualCreateWorkspace` | Prevents divergence and preserves the save-bar/cancel contract. |
| Jellyfin browser auth | Direct browser calls to Jellyfin with handcrafted URLs | Backend handlers returning Team4s-safe payloads and proxied asset URLs | Keeps API keys and upstream quirks out of the browser. |
| Source ranking | A complex fuzzy-search engine | Simple title/path strength ranking on top of current search results | User still chooses manually; heavy ranking is unnecessary in Phase 3. |
| Asset review | Candidate-card asset toggles | Draft-level asset slot review | Matches the phase decisions and avoids preview-state duplication. |
| Type detection | Hidden hard-coded assignment | Visible hint object with reasons | JFIN-06 requires overrideable suggestion behavior, not automation. |

**Key insight:** Phase 3 is mostly contract shaping and workflow integration, not algorithm invention. The repo already has the hard parts for auth, save-bar UX, create, and Jellyfin transport.

## Common Pitfalls

### Pitfall 1: Reusing Sync Preview For Intake
**What goes wrong:** Planning assumes the current Jellyfin preview endpoint can prefill a new anime draft.
**Why it happens:** The names look close: "preview," "search," "sync," and Jellyfin already exists in the admin area.
**How to avoid:** Add a separate intake preview contract keyed by Jellyfin candidate, not `anime_id`.
**Warning signs:** Payload discussion revolves around episodes, season numbers, `allow_mismatch`, or existing anime lookup instead of draft metadata and assets.

### Pitfall 2: Losing The Shared Create Surface
**What goes wrong:** Jellyfin intake becomes a parallel create flow with its own save/cancel semantics.
**Why it happens:** Candidate review UI feels substantial enough to become its own page.
**How to avoid:** Treat candidate review as a prefill step only; hand off immediately into the existing draft workspace.
**Warning signs:** New route names, second save bar, or duplicate field editors appear in the plan.

### Pitfall 3: Overtrusting Jellyfin Type Inference
**What goes wrong:** Specials, OVAs, bonus content, or sequel folders are persisted as the wrong anime type.
**Why it happens:** Jellyfin's show model is season/folder oriented, not anime-product oriented.
**How to avoid:** Keep `type` editable and show reasoning such as `Season 00`, `OVA`, `Special`, `Bonus`, or folder tokens as evidence only.
**Warning signs:** The planner describes type inference as "automatic," "authoritative," or "final."

### Pitfall 4: Under-Specifying Asset Evidence
**What goes wrong:** Candidate cards look nice but do not provide enough confidence to choose correctly.
**Why it happens:** Current search payload only exposes `name`, `production_year`, and `path`.
**How to avoid:** Require preview-ready asset evidence in the candidate or candidate-detail contract: poster, banner, logo, background, plus full path and parent/library context.
**Warning signs:** The plan only mentions a title dropdown and metadata text.

### Pitfall 5: Forgetting Future Jellyfin Linkage
**What goes wrong:** Phase 3 creates apparently Jellyfin-assisted anime that Phase 4 cannot safely re-sync or show provenance for.
**Why it happens:** JFIN-03 and provenance UI are deferred, so it is tempting to delay persistence entirely.
**How to avoid:** Decide explicitly whether optional source linkage is persisted during create in Phase 3.
**Warning signs:** Create payload and backend insert path remain unchanged while the plan still assumes Phase 4 resync will "just work."

## Code Examples

Verified patterns from official sources and the current codebase:

### Shared Draft Readiness Pattern
```ts
export function resolveManualCreateState(input: ManualAnimeDraftInput): ManualAnimeDraftState {
  const hasMeaningfulInput = Object.values(input).some((value) => hasMeaningfulValue(value))
  const hasRequiredTitle = hasMeaningfulValue(input.title)
  const hasRequiredCover = hasMeaningfulValue(input.cover_image)

  if (!hasMeaningfulInput) return { key: 'empty', canSubmit: false }
  if (!hasRequiredTitle || !hasRequiredCover) return { key: 'incomplete', canSubmit: false }
  return { key: 'ready', canSubmit: true }
}
```
Source: local project pattern in `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts`

### Existing Jellyfin Search Pattern
```go
values := url.Values{}
values.Set("IncludeItemTypes", "Series")
values.Set("Recursive", "true")
values.Set("SearchTerm", strings.TrimSpace(title))
values.Set("Limit", strconv.Itoa(limit))
values.Set("Fields", "Path,ProductionYear,Overview")
```
Source: local project pattern in `backend/internal/handlers/jellyfin_client.go`

### Official Jellyfin Show Organization Rule
```text
Shows
`- Series Name A (2010)
    |- Season 00
    |- Season 01
    `- Season 02
```
Source: official Jellyfin TV Shows documentation, https://jellyfin.org/docs/general/server/media/shows/

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Intake landing page reserves Jellyfin with placeholder copy only | Add title-adjacent `Jellyfin Sync` and placeholder `AniSearch Sync` actions inside the shared create draft | Planned for Phase 3 after Phase 2 completion on 2026-03-24 | Keeps one draft surface while exposing assistive sources. |
| Persisted-anime Jellyfin sync preview (`anime_id` + season sync) | Draft-prefill intake preview keyed by Jellyfin candidate | Needed now | Correct payload shape for JFIN-04/JFIN-05/JFIN-06. |
| Manual-only create payload | Optional source-aware create payload if future linkage is preserved now | Decision needed in Phase 3 planning | Determines whether Phase 4 provenance/resync can build directly on Phase 3 records. |

**Deprecated/outdated:**
- Using the current Jellyfin sync panel as the implementation model for create intake: it is built for episode sync into existing anime.
- A separate Jellyfin create route: it conflicts with the existing shared-shell direction.

## Open Questions

1. **Should Phase 3 persist Jellyfin source linkage on create, even though provenance UI is deferred?**
   - What we know: existing anime records already have `source`/`folder_name` seams and Phase 4 depends on provenance/resync.
   - What's unclear: whether Phase 3 should extend `createAdminAnime` now or intentionally remain prefill-only.
   - Recommendation: decide this explicitly during planning; my recommendation is to add optional linkage now if backend scope is acceptable.

2. **Where should candidate asset previews come from?**
   - What we know: official Jellyfin supports standard image types (`Primary`, `Backdrop`, `Banner`, `Logo`), but the current Team4s backend/frontend does not expose an intake image proxy yet.
   - What's unclear: whether to return signed/proxied image URLs from backend or add a dedicated route for image retrieval.
   - Recommendation: keep this backend-mediated; do not let the browser talk to Jellyfin directly.

3. **How much candidate evidence belongs in search results versus a second preview call?**
   - What we know: current search payload is intentionally thin, while the UX requires rich card evidence.
   - What's unclear: whether search should return compact cards immediately or whether search results should be followed by a candidate-detail preview.
   - Recommendation: keep search compact-first, then fetch richer candidate detail on selection or hover/open state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend tests/build | yes | 24.14.0 | none |
| npm | Frontend package scripts | yes | 11.9.0 | none |
| Go | Backend handler/repository tests | yes | 1.26.1 | none |
| Docker | Full-stack local runtime | yes | 29.2.1 | Optional for code-only planning |
| Jellyfin upstream server | Live search/intake verification | Unknown | Env-gated via `JELLYFIN_BASE_URL` + `JELLYFIN_API_KEY` | Mocked tests plus handler-level unit coverage |

**Missing dependencies with no fallback:**
- None confirmed at research time.

**Missing dependencies with fallback:**
- Live Jellyfin connectivity is not verified here; planner should rely on mock coverage plus explicit manual smoke steps against a configured environment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 for frontend + `go test` on Go 1.26.1 for backend |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/page.test.tsx` |
| Full suite command | `cd frontend && npm test` and `cd backend && go test ./internal/handlers ./internal/repository` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTK-03 | Jellyfin-assisted draft cancels without persistence | frontend unit/integration | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx` | no - Wave 0 |
| JFIN-01 | Admin can search/browse Jellyfin candidates from create | frontend + backend | `cd frontend && npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/create/page.test.tsx` and `cd backend && go test ./internal/handlers -run 'Test.*Jellyfin.*Intake.*Search'` | no - Wave 0 |
| JFIN-02 | Candidate shows Jellyfin ID and path evidence | frontend + backend | `cd frontend && npm test -- src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx` and `cd backend && go test ./internal/handlers -run 'Test.*Jellyfin.*Search.*'` | no - Wave 0 |
| JFIN-04 | Candidate selection hydrates editable draft before save | frontend + backend | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/hooks/useJellyfinIntake.test.ts` and `cd backend && go test ./internal/handlers -run 'Test.*Jellyfin.*IntakePreview'` | no - Wave 0 |
| JFIN-05 | Draft shows imported metadata and asset candidates before save | frontend + backend | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/components/JellyfinIntake/JellyfinDraftAssets.test.tsx` and `cd backend && go test ./internal/handlers -run 'Test.*Jellyfin.*IntakePreview.*Assets'` | no - Wave 0 |
| JFIN-06 | Type hint is visible, reasoned, and overrideable | frontend unit | `cd frontend && npm test -- src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts src/app/admin/anime/create/page.test.tsx` | no - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest file set plus the relevant `go test ./internal/handlers -run ...` slice
- **Per wave merge:** `cd frontend && npm test` plus `cd backend && go test ./internal/handlers ./internal/repository`
- **Phase gate:** full suite green, with note that backend package-wide verification currently has an external compile blocker in `backend/internal/services/anime_metadata_backfill.go`

### Wave 0 Gaps
- [ ] `frontend/src/app/admin/anime/hooks/useJellyfinIntake.test.ts` - covers JFIN-01 and JFIN-04
- [ ] `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx` - covers JFIN-02
- [ ] `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinDraftAssets.test.tsx` - covers JFIN-05
- [ ] `frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts` - covers JFIN-06
- [ ] `backend/internal/handlers/jellyfin_intake_preview_test.go` - covers JFIN-04, JFIN-05, and type-hint payload rules
- [ ] `backend/internal/handlers/jellyfin_search_test.go` or equivalent route-level additions - covers JFIN-01 and JFIN-02 beyond current validation-only tests

## Sources

### Primary (HIGH confidence)
- Local codebase: `frontend/src/app/admin/anime/create/page.tsx` - current shared create draft behavior
- Local codebase: `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - reusable create workspace composition
- Local codebase: `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts` - current draft readiness contract
- Local codebase: `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx` - current persisted-anime Jellyfin UX seam
- Local codebase: `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts` - current Jellyfin sync state model
- Local codebase: `frontend/src/lib/api.ts` - existing admin Jellyfin and create client seams
- Local codebase: `backend/internal/handlers/jellyfin_search.go` - current admin Jellyfin search route
- Local codebase: `backend/internal/handlers/jellyfin_preview.go` - current preview route shape and persisted-anime dependency
- Local codebase: `backend/internal/handlers/jellyfin_client.go` - upstream Jellyfin search fields and transport behavior
- Official Jellyfin TV Shows docs - media organization, specials, and image types: https://jellyfin.org/docs/general/server/media/shows/
- Official Jellyfin OpenAPI index - current stable API snapshot availability: https://api.jellyfin.org/openapi/

### Secondary (MEDIUM confidence)
- `frontend/package.json` plus `npm view` on 2026-03-25 - repo-pinned vs current package versions
- `.env.example` and `backend/internal/config/config.go` - Jellyfin env/config dependency surface

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack is explicit and sufficient; no speculative library swap is needed.
- Architecture: HIGH - the shared create surface and current Jellyfin sync seams are directly visible in code.
- Pitfalls: MEDIUM - most are strongly supported by code and official Jellyfin docs, but the source-link persistence recommendation is still an architectural inference.

**Research date:** 2026-03-25
**Valid until:** 2026-04-24
