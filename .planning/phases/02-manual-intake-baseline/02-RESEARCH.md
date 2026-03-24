# Phase 2: Manual Intake Baseline - Research

**Researched:** 2026-03-24
**Domain:** Manual anime intake flow on the shared admin editor surface
**Confidence:** HIGH

## User Constraints

No phase-local `02-CONTEXT.md` exists yet. The planner should treat the following as locked input from the user prompt, Phase 1 carry-forward decisions, the Phase 2 UI spec, and project constraints:

### Locked Decisions
- Preserve the Phase 1 shared editor shell and central save bar across create and edit.
- Manual create must become a true preview-before-save draft flow. No anime record may be created before explicit save.
- Phase 2 scope is manual intake only. Jellyfin selection, provenance controls, and relation UI remain out of scope.
- Minimum save contract for Phase 2 is `title + cover`.
- Existing cover upload behavior must remain usable in intake and edit, but this phase must not expand into broader asset-system work.
- Manual create must redirect into the existing editor/studio context after success so ongoing maintenance stays on the shared surface.

### Claude's Discretion
- Exact component splits needed to keep files under the 450-line limit.
- Exact placement of draft preview, validation summary, and success handoff within the shared shell.
- Whether minimum-contract enforcement is UI-only or also server-enforced; recommendation below is to enforce both.

### Deferred Ideas (OUT OF SCOPE)
- Jellyfin-assisted intake preview and source selection.
- Provenance UI, ownership per field/asset slot, and safe re-sync behavior.
- Non-cover upload parity for other asset types.
- Relation CRUD.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTK-01 | Admin can start anime creation by choosing either a manual flow or a Jellyfin-assisted flow. | Add an intake choice entry at `/admin/anime`; Phase 2 implements the manual branch and reserves the Jellyfin branch placeholder without shipping Jellyfin behavior. |
| INTK-02 | Admin can review and edit all proposed anime values in a draft form before any anime record is created. | Convert `/admin/anime/create` from immediate persistence to client-side draft state with inline preview and disabled save until minimum contract is met. |
| INTK-04 | Admin can save a new anime when only `title` and `cover` are present. | Enforce `title + cover` in create UI and backend create validation; keep other fields optional. |
| INTK-05 | Admin can create and maintain an anime without any Jellyfin linkage. | Keep manual create payload/source free of Jellyfin-specific fields and redirect to existing edit route after create. |
| ASST-04 | Admin can continue using the existing cover upload flow inside the new anime intake and edit workflow. | Keep create using the current local draft upload route and keep edit using the persisted admin upload path; do not generalize asset uploads in this phase. |

## Summary

Phase 2 should be planned as an evolution of the current manual create route, not as a new parallel product surface. Phase 1 already delivered the right backbone: `AnimeEditorShell` plus `useAnimeEditor` give create and edit one save-bar contract, and `AnimeEditWorkspace` already shows the target composition pattern for the shared editor. The current problem is not missing structure; it is that `/admin/anime/create` still behaves like a direct create form and only pretends to be a draft.

The biggest functional conflicts are concrete. The current create page persists immediately on submit, only validates `title`, allows `cover_image` to be omitted all the way through the backend create handler, and redirects to `/admin/anime?context={id}` even though the current studio page does not consume that query param. The edit cover flow also cannot be reused directly for pre-save create because `uploadAndSetCover` requires an existing anime ID and immediately patches the persisted record.

**Primary recommendation:** Keep one shared editor shell, introduce a create-specific draft workspace adapter, enforce `title + cover` on both client and create handler, keep the current intake cover upload route for draft state, and redirect successful manual create to `/admin/anime/{id}/edit`.

## Project Constraints (from CLAUDE.md)

- Improve existing backend/frontend/admin code; do not replace the stack.
- Keep compatibility with the existing routes, DB evolution model, and brownfield stack.
- Manual edits remain authoritative over Jellyfin imports.
- Jellyfin import must always pass through an editable form before save.
- V1 remains admin-only.
- Admin actions need audit attribution by user ID; operational errors must be visible in the UI.
- Production files should stay at or below 450 lines.
- UX work is part of the phase, not optional polish.
- Only cover upload is productionized today; do not expand asset scope here.
- Jellyfin access depends on env-backed connectivity; Phase 2 should not deepen that dependency.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (repo pin) | Admin routes, route handlers, App Router UI | Already powers the admin surface; Phase 2 is an in-place route evolution. |
| React | 18.3.1 (repo pin) | Client draft state and shared editor composition | Existing admin editor code is already built around client components and hooks. |
| TypeScript | 5.7.2 (repo pin) | Shared request/state typing | Existing admin types already describe create/edit payloads and editor contracts. |
| Go + Gin | Go 1.25.0 in `go.mod`, Gin 1.10.0 | Admin create validation and persistence endpoint | Existing `CreateAnime` handler and repository already own the authoritative write path. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 (repo pin) | Frontend component/hook regression tests | For save-bar states, create draft behavior, and route-level UI tests. |
| `testify` | 1.9.0 | Backend validation/repository tests | For create contract and handler validation coverage. |
| `lucide-react` | 0.469.0 (repo pin) | Existing icon set | Only if the intake choice UI needs lightweight icons; no new icon system. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared create/edit shell | Separate create screen | Faster short-term, but breaks the Phase 1 decision and duplicates save-state logic. |
| Client-side draft before create | Pre-create empty anime row then patch | Simplifies edit reuse, but violates preview-before-save and creates orphan records. |
| Keep current create payload rules | UI-only `title + cover` enforcement | Lower churn, but backend would still accept invalid Phase 2 creates from any caller. |
| Unify create/edit upload implementations now | Temporary asset abstraction | Drags Phase 2 into Phase 4-style asset design without a real need. |

**Installation:**
```bash
npm install
go mod download
```

**Version verification:** Current repo pins were verified against the npm registry on 2026-03-24. Newer versions exist, but upgrading is not part of this phase:
- `next`: repo `16.1.6`; latest `16.2.1` published 2026-03-20
- `react`: repo `18.3.1`; latest `19.2.4` published 2026-01-26
- `vitest`: repo `3.2.4`; latest `4.1.1` published 2026-03-23
- `lucide-react`: repo `0.469.0`; latest `1.0.1` published 2026-03-23

## Architecture Patterns

### Recommended Project Structure
```text
frontend/src/app/admin/anime/
├── page.tsx                              # intake entry point with manual/Jellyfin choice
├── create/page.tsx                       # route shell + create draft wiring
├── components/shared/AnimeEditorShell.tsx
├── components/AnimeEditPage/             # existing edit workspace/reference sections
├── components/ManualCreate/              # new create-specific draft/preview sections
├── hooks/useAnimeEditor.ts
├── hooks/useManualAnimeDraft.ts          # new create draft state adapter
└── utils/

backend/internal/handlers/
├── admin_content_anime.go
└── admin_content_anime_validation.go
```

### Pattern 1: Shared Shell, Context-Specific Workspace
**What:** Keep `AnimeEditorShell` and `useAnimeEditor` as the single save-bar contract. Put create-specific fields, preview state, and validation in a create draft workspace rather than in the shell.
**When to use:** Always for Phase 2. Create/edit should differ by starting context, not by owning different save infrastructure.
**Example:**
```tsx
const editor = useAnimeEditor('create', {
  isDirty: draft.hasMeaningfulInput,
  isSubmitting: draft.isSubmitting,
  formID: 'manual-anime-create-form',
  submitButtonType: 'submit',
  savedStateTitle: draft.saveState.title,
  savedStateMessage: draft.saveState.message,
  dirtyStateTitle: draft.saveState.title,
  dirtyStateMessage: draft.saveState.message,
  submitLabel: draft.isSubmitting ? 'Anime wird erstellt...' : 'Anime erstellen',
})

return (
  <AnimeEditorShell editor={editor}>
    <ManualCreateWorkspace draft={draft} />
  </AnimeEditorShell>
)
```
Source: local pattern from `frontend/src/app/admin/anime/hooks/useAnimeEditor.ts` and `frontend/src/app/admin/anime/components/shared/AnimeEditorShell.tsx`

### Pattern 2: Explicit Draft State Machine
**What:** Represent Phase 2 save readiness with explicit derived states, not just a boolean dirty flag:
1. no draft
2. draft incomplete
3. draft ready

**When to use:** For save-bar copy, button disabled state, validation summary visibility, and redirect-ready submit logic.
**Example:**
```ts
function resolveManualCreateState(values: DraftValues) {
  const hasAnyInput = Boolean(
    values.title.trim() ||
    values.coverImage.trim() ||
    values.description.trim() ||
    values.genreTokens.length ||
    values.year.trim(),
  )
  const hasMinimumContract = Boolean(values.title.trim() && values.coverImage.trim())

  if (!hasAnyInput) return { key: 'empty', title: 'Noch kein manueller Entwurf', canSubmit: false }
  if (!hasMinimumContract) return { key: 'incomplete', title: 'Entwurf unvollstaendig', canSubmit: false }
  return { key: 'ready', title: 'Entwurf bereit zum Anlegen', canSubmit: true }
}
```
Source: required by `02-UI-SPEC.md`; current shell/button behavior in `frontend/src/app/admin/anime/components/shared/AnimeEditorShell.tsx`

### Pattern 3: Separate Create Mutation Adapter, Shared Field Sections
**What:** Reuse field sections and styling language where possible, but do not reuse `useAnimePatchMutations` for create. That hook assumes a persisted anime ID for cover upload and patches immediately after upload.
**When to use:** For planning task boundaries. Create needs a draft adapter; edit keeps the existing patch adapter.
**Example:**
```ts
// Do not call uploadAndSetCover before create:
if (!animeID) {
  onError('Anime-ID fehlt. Bitte zuerst einen Anime-Kontext laden.')
  return
}
```
Source: `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`

### Anti-Patterns to Avoid
- **Pre-creating empty anime rows:** Violates preview-before-save and creates cleanup problems.
- **Putting create-specific state logic into `AnimeEditorShell`:** The shell should stay dumb and reusable.
- **Introducing Jellyfin placeholders into the create draft form:** Keep the form strictly manual in Phase 2.
- **Generalizing all asset uploads now:** Only cover behavior belongs in this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared save bar behavior | A second create-only save bar | `AnimeEditorShell` + `useAnimeEditor` | Phase 1 already solved this; duplicating it invites divergence. |
| Persisted cover upload for existing anime | New uploader for edit | Existing `uploadAndSetCover` edit path | It already patches persisted anime cover state correctly. |
| Draft cover preview URL logic | Another cover URL formatter | `resolveCoverUrl` | Handles placeholder, legacy filename, and path URLs already. |
| Create payload typing | Inline ad-hoc objects | `AdminAnimeCreateRequest` plus a create draft adapter | Keeps frontend/backend contract changes explicit. |
| Backend create persistence | New endpoint | Existing `POST /api/v1/admin/anime` with tightened validation | Audit and metadata writes are already in this path. |

**Key insight:** Phase 2 needs a new draft adapter, not a new platform. Most of the stack already exists; the missing part is create-state orchestration and minimum-contract enforcement.

## Common Pitfalls

### Pitfall 1: Treating Dirty As Ready
**What goes wrong:** The save bar enables whenever there are unsaved changes, even if the draft is missing `title` or `cover`.
**Why it happens:** `AnimeEditorShell` currently disables only on `!editor.isDirty`, and `useAnimeEditor` only exposes binary saved/dirty copy.
**How to avoid:** Add an explicit `canSubmit`/state layer for manual create and pass that to shell/button behavior.
**Warning signs:** Save button becomes active after typing only a title, or save-bar copy never shows the “incomplete” state.

### Pitfall 2: Reusing Edit Cover Mutation Before Create
**What goes wrong:** Draft cover upload fails with “Anime-ID fehlt” or accidentally assumes a persisted record.
**Why it happens:** `uploadAndSetCover` requires an anime ID and patches the live record after upload.
**How to avoid:** Keep draft upload on `/api/admin/upload-cover` until the record exists; use persisted upload only after redirect to edit.
**Warning signs:** Create flow needs a synthetic anime ID, or draft cover upload triggers backend anime patch calls.

### Pitfall 3: Redirecting Back To A Studio Query Param That Does Nothing
**What goes wrong:** Successful create lands on `/admin/anime?context={id}` but the page ignores the query and does not preload the new record.
**Why it happens:** The current studio page has no `context` query handling.
**How to avoid:** Redirect directly to `/admin/anime/{id}/edit`.
**Warning signs:** Success copy says “Weiterleitung ins Studio...” but the created anime is not actually open.

### Pitfall 4: Leaving Cover Optional In The Backend
**What goes wrong:** UI behaves like `title + cover` are required, but any caller can still create title-only anime through the API.
**Why it happens:** Current create validation only requires `title`.
**How to avoid:** Tighten `validateAdminAnimeCreateRequest` for Phase 2 or explicitly accept that the API remains broader and document the exception. Recommendation: tighten it.
**Warning signs:** Backend tests still pass without `cover_image`, or manual creates succeed without a cover through API-only calls.

### Pitfall 5: Growing Create Page Into Another Monolith
**What goes wrong:** `/admin/anime/create/page.tsx` absorbs draft state, preview, validation, and entry logic and exceeds the project size limit.
**Why it happens:** The current page already mixes route concerns, field state, upload handling, and submit logic.
**How to avoid:** Split draft state into a hook and move view sections into `components/ManualCreate/`.
**Warning signs:** Create page exceeds 450 lines or starts duplicating `AnimeEditWorkspace` logic.

## Code Examples

Verified patterns from the current codebase:

### Shared Save Shell
```tsx
<AnimeEditorShell editor={editor} header={<AnimeOwnershipBadge ownership={ownership} />}>
  {/* workspace sections */}
</AnimeEditorShell>
```
Source: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`

### Backend Create Path Already Handles Audit + Metadata
```go
item, err := h.repo.CreateAnime(c.Request.Context(), input, identity.UserID)
```
```go
if err := syncAuthoritativeAnimeMetadata(ctx, tx, item.ID, buildAuthoritativeAnimeMetadataCreate(input)); err != nil { ... }
if err := insertAdminAnimeAuditEntry(ctx, tx, auditEntry); err != nil { ... }
```
Source: `backend/internal/handlers/admin_content_anime.go`, `backend/internal/repository/admin_content_anime_metadata.go`

### Current Draft Upload Route For Unsaved Create
```ts
const response = await fetch('/api/admin/upload-cover', {
  method: 'POST',
  body: form,
})
```
Source: `frontend/src/app/admin/anime/create/page.tsx`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate edit-specific admin composition | Shared create/edit shell via `AnimeEditorShell` + `useAnimeEditor` | Phase 1, 2026-03-24 | Phase 2 should extend the shared contract, not replace it. |
| Direct create route with immediate persistence | Required Phase 2 draft-before-save manual intake | Planned for Phase 2 | Create needs a client-side draft adapter and save-state machine. |
| Binary save-state copy (`saved` vs `dirty`) | Required ternary create copy (`empty`, `incomplete`, `ready`) | Planned for Phase 2 | `useAnimeEditor` input/caller logic must become more expressive for create. |

**Deprecated/outdated:**
- Current redirect to `/admin/anime?context={id}` is effectively outdated for Phase 2 because the studio page does not consume `context`.
- Current title-only create validation is outdated against the Phase 2 minimum save contract.

## Open Questions

1. **Should backend create strictly require `cover_image` in Phase 2?**
   - What we know: UI spec and requirements treat `title + cover` as the minimum contract; backend currently requires only `title`.
   - What's unclear: Whether any non-UI caller still relies on title-only creates.
   - Recommendation: Plan backend enforcement unless an explicit caller is found.

2. **Should the intake entry ship the Jellyfin option as disabled/placeholder in Phase 2?**
   - What we know: `INTK-01` requires mode choice, but Jellyfin behavior belongs to Phase 3.
   - What's unclear: Whether the Phase 2 planner wants a visible placeholder CTA or just a reserved layout seam.
   - Recommendation: Add the choice UI now, wire only the manual CTA, and label Jellyfin as “folgt” or route-gated.

3. **Should draft cover upload remain local-only in non-local profiles?**
   - What we know: `/api/admin/upload-cover` is intentionally local/dev-only.
   - What's unclear: Whether the Phase 2 verification environment is always local/dev.
   - Recommendation: Keep the current behavior for Phase 2 and document non-local limitations explicitly in verification steps.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js admin UI, Vitest | ✓ | v24.14.0 | — |
| npm | Frontend package/test commands | ✓ | 11.9.0 | — |
| Go | Backend handler/repository tests | ✓ | go1.26.1 | — |
| Docker | Full local stack verification | ✓ | 29.2.1 | Manual frontend/backend commands if Docker is unnecessary |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 for frontend, Go test + testify for backend |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test -- src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx` |
| Full suite command | `cd frontend && npm test` and `cd backend && go test ./internal/handlers ./internal/repository` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTK-01 | Intake entry exposes manual and Jellyfin-start choices | frontend component | `cd frontend && npm test -- src/app/admin/anime/page.test.tsx` | ❌ Wave 0 |
| INTK-02 | Manual create remains draft-only until explicit save | frontend route/component | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx` | ❌ Wave 0 |
| INTK-04 | Manual create succeeds with only `title + cover` | frontend + backend | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx` and `cd backend && go test ./internal/handlers -run TestValidateAdminAnimeCreateRequest_RequiresCover` | ❌ Wave 0 |
| INTK-05 | Manual create does not depend on Jellyfin linkage | backend validation/integration | `cd backend && go test ./internal/handlers -run TestCreateAnime_ManualPayloadHasNoJellyfinDependency` | ❌ Wave 0 |
| ASST-04 | Cover upload remains usable in create and edit | frontend component/hook | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest or Go test for the touched seam
- **Per wave merge:** `cd frontend && npm test` and `cd backend && go test ./internal/handlers ./internal/repository`
- **Phase gate:** both suites green plus a manual create smoke run in local dev

### Wave 0 Gaps
- [ ] `frontend/src/app/admin/anime/page.test.tsx` — covers INTK-01
- [ ] `frontend/src/app/admin/anime/create/page.test.tsx` — covers INTK-02, INTK-04, ASST-04
- [ ] `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.test.ts` — covers ternary save-state logic
- [ ] `backend/internal/handlers/admin_content_create_phase2_test.go` — covers minimum-contract validation and manual-only create assumptions
- [ ] `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts` — guards edit-cover behavior while Phase 2 changes create

## Sources

### Primary (HIGH confidence)
- Local code: `frontend/src/app/admin/anime/create/page.tsx` - current manual create flow, draft/upload/save conflicts
- Local code: `frontend/src/app/admin/anime/components/shared/AnimeEditorShell.tsx` - shared save-bar behavior
- Local code: `frontend/src/app/admin/anime/hooks/useAnimeEditor.ts` - create/edit shell copy contract
- Local code: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - shared editor composition pattern
- Local code: `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts` - persisted cover upload limitation
- Local code: `frontend/src/app/api/admin/upload-cover/route.ts` - unsaved create cover upload route and constraints
- Local code: `frontend/src/app/admin/anime/page.tsx` - current intake entry point behavior
- Local code: `backend/internal/handlers/admin_content_anime.go` - existing create handler
- Local code: `backend/internal/handlers/admin_content_anime_validation.go` - current create validation
- Local code: `backend/internal/repository/admin_content_anime_metadata.go` - authoritative create persistence and audit wiring
- Local code: `backend/internal/handlers/admin_content_test.go` - current handler validation coverage
- Local code: `frontend/package.json`, `frontend/vitest.config.ts`, `backend/go.mod` - current stack and test framework
- npm registry: `npm view next time --json`, `npm view react time --json`, `npm view vitest time --json`, `npm view lucide-react time --json` - current published versions and dates checked on 2026-03-24

### Secondary (MEDIUM confidence)
- `.planning/phases/02-manual-intake-baseline/02-UI-SPEC.md` - phase-specific UX contract
- `.planning/REQUIREMENTS.md` - requirement mapping and scope boundary
- `.planning/ROADMAP.md` - phase goal and success criteria
- `.planning/PROJECT.md` - product and scope constraints
- `.planning/phases/01-ownership-foundations/01-CONTEXT.md` - carry-forward architecture decisions
- `CLAUDE.md` and `AGENTS.md` - project workflow and quality constraints

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - entirely based on repo state plus registry verification
- Architecture: HIGH - driven by current code seams and explicit Phase 1/2 constraints
- Pitfalls: HIGH - based on concrete current behavior conflicts already present in the repo

**Research date:** 2026-03-24
**Valid until:** 2026-04-23
