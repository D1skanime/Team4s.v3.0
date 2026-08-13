# Phase 1: Ownership Foundations - Research

**Researched:** 2026-03-24
**Domain:** Admin anime edit foundation, ownership visibility, audit attribution, and brownfield modularization
**Confidence:** MEDIUM-HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 1 should lock in a single shared anime editor foundation that is reused for existing anime edit, later manual create, and later Jellyfin-backed draft flows.
- **D-02:** The UI should differ by context and prefilling state, not by maintaining separate edit and create screens with diverging form logic.
- **D-03:** Phase 1 should already show lightweight ownership visibility in the editor, such as simple manual versus external/source hints.
- **D-04:** Full provenance, per-slot asset behavior, and resync-specific ownership detail remain deferred to Phase 4.
- **D-05:** All anime-related mutations that belong to the shared editor foundation in Phase 1 must be attributable to the acting admin user ID.
- **D-06:** Audit attribution should cover more than plain field saves; it should include all editor-borne mutations that Phase 1 exposes on the anime ownership surface.
- **D-07:** The shared editor should use one central save model with a primary save bar for the whole anime draft/context rather than multiple isolated save sections.
- **D-08:** The unified save model should remain compatible with both existing-anime editing and future preview-before-save draft creation flows.

### the agent's Discretion
- Exact placement and styling of lightweight ownership badges or labels within the shared editor.
- Precise audit event shape and storage details, as long as acting admin attribution is durable.
- Internal component boundaries and hook splits needed to keep the foundation modular and below the project file-size limit.

### Deferred Ideas (OUT OF SCOPE)
- Full manual create workflow and preview-before-save creation behavior - covered in Phase 2.
- Jellyfin source selection, draft prefilling, and type suggestion behavior - covered in Phase 3.
- Full provenance UI, per-slot asset ownership, and fill-only resync behavior - covered in Phase 4.
- Relation CRUD and relation validation surface - covered in Phase 5.

## Project Constraints (from AGENTS.md)

- Keep decisions durable in `DECISIONS.md` when they may be debated again.
- Keep handoff files current at end of day: `DAYLOG.md`, `YYYY-MM-DD - day-summary.md`, `CONTEXT.md`, `WORKING_NOTES.md`, `RISKS.md`, `TOMORROW.md`, `STATUS.md`.
- Prefer documented APIs; avoid relying on undocumented behavior.
- For filesystem changes on media hosts, use project-owned controlled automation.
- Changes should be reproducible from repo docs.
- Build/test commands in `STATUS.md` must remain valid.
- First task in `TOMORROW.md` must be concrete and <=15 minutes.

## Summary

The existing edit route is already a practical seed for Phase 1. The current edit page, workspace, and patch hook already express the one-surface, sectioned editor plus central save bar that this phase wants. That strongly favors extraction and hardening over replacement.

The main risks are structural, not cosmetic:
- there is no durable audit write path for anime mutations yet
- auth for some admin anime and upload routes is currently bypassed in code
- anime edit writes target legacy `anime` columns while reads can be overlaid by normalized metadata tables

The planning backbone should therefore lock three things early:
1. authoritative editable data source
2. durable audit storage contract
3. shared editor extraction boundary

Lightweight ownership UI can then sit on top of that backbone.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTK-06 | Admin can edit an existing anime through the same ownership-aware admin surface used by intake. | Existing edit workspace and patch hook can become the shared foundation, but create/edit cover flows are currently divergent and need consolidation. |
| RLY-03 | Admin-triggered create, update, resync, asset removal, upload, and relation-change actions are durably attributable to the acting admin user ID. | Current code only logs `user_id`; no durable audit write exists for anime mutations, and some relevant routes still bypass auth. |
| RLY-04 | Admin-facing workflow changes keep implementation modular so production code files do not grow beyond the 450-line project limit. | Frontend already uses route-local components/hooks and backend uses feature files; Phase 1 should preserve this by extracting shared editor primitives rather than expanding route files. |

## Standard Stack

### Core

| Area | Existing Standard | Purpose | Planning Guidance |
|------|-------------------|---------|-------------------|
| Frontend app | Next.js `16.1.6` + React `18.3.1` | Admin UI | Reuse the existing App Router admin route structure; do not introduce a parallel frontend pattern. |
| Frontend API layer | `frontend/src/lib/api.ts` | Typed admin API access | Keep all anime editor calls centralized here. |
| Backend HTTP | Gin `1.10.0` | Admin endpoints | Extend existing handler files; keep auth and validation explicit. |
| Backend DB access | pgx/v5 `5.7.1` | Repository layer | Put durable attribution in repository-backed persistence, not only handler logs. |
| Authz | existing auth middleware + role repo | Acting-admin resolution | Remove dev bypasses from relevant routes before claiming durable attribution. |
| Testing | Go `testing` + Vitest `3.2.4` | Regression coverage | Add backend tests first for attribution and data-authority decisions. |

### Supporting

| Existing module | Why it matters in Phase 1 |
|-----------------|---------------------------|
| `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts` | Central save/upload mutation seam, but currently not ownership-aware and not auth-safe. |
| `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx` | Shows how ownership hints can stay lightweight in Phase 1 while full provenance remains deferred. |
| `backend/internal/handlers/admin_content_anime_validation.go` | Defines current editable field contract and null/clear semantics. |
| `backend/internal/models/admin_content.go` | Optional patch fields already support explicit clear vs unchanged, which is a good base for ownership-aware saves later. |

**Recommendation:** Phase 1 does not need a new library. It needs a cleaner contract around existing frontend hooks, backend handlers, repository writes, and audit persistence.

## Architecture Patterns

### Pattern 1: Keep one editor surface, vary only context
Use the current edit workspace as the base editor shell, then make future create/manual/Jellyfin flows supply different initial state and action labels instead of separate form implementations.

Evidence:
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` already provides section layout plus one save bar.
- `frontend/src/app/admin/anime/create/page.tsx` is currently a separate implementation with duplicated fields, genre logic, and cover handling.

### Pattern 2: Centralize editable anime state in a hook, not in route pages
`useAnimePatch` is the right seam for shared state, dirty tracking, clear flags, and mutation orchestration. Phase 1 should extend that seam with ownership metadata rather than duplicating field state elsewhere.

### Pattern 3: Keep handler validation explicit and request-shaped
The backend already validates create/patch payloads explicitly and uses nullable optional fields for patch semantics. Any new ownership/audit data should preserve this style instead of hiding logic in generic middleware magic.

### Pattern 4: Put durable attribution adjacent to the mutation write
The acting admin ID is resolved in handlers today, but that value is discarded after logging. Phase 1 should pass actor identity into a repository/service that writes both the domain mutation and its audit record in the same logical operation.

### Pattern 5: Ownership visibility should be cheap in Phase 1
The lowest-risk Phase 1 ownership signal is record-level and field-group-level source visibility derived from existing data, especially `anime.source` / Jellyfin linkage, not a full per-field provenance system.

## Brownfield Findings That Matter For Planning

### 1. The edit foundation already exists
The current edit route already has the shape Phase 1 wants:
- one route for existing anime edit
- one global save bar
- sectioned editing
- reusable hook-backed patch state
- separate Jellyfin panel that can stay attached to the same context

This strongly supports building Phase 1 by extraction and hardening, not by replacement.

### 2. Create and edit are already diverging
The create route duplicates field parsing, genre token logic, and cover behavior instead of reusing the edit foundation. That directly conflicts with `D-01` and `D-02`. Phase 1 should at least extract shared editor primitives even if full create workflow stays Phase 2.

### 3. Durable attribution is missing today
Current state:
- anime create/update handlers log `identity.UserID`
- no anime audit table or audit repository was found
- no `created_by`, `updated_by`, or mutation history schema was found in migrations
- no anime mutation response includes audit state

This means `RLY-03` requires new persistence design, not just UI work.

### 4. Relevant routes still bypass auth
Current blockers:
- `backend/cmd/server/main.go` comments out auth middleware for `POST /api/v1/admin/anime` and `PATCH /api/v1/admin/anime/:id`
- `/api/v1/admin/upload` also has auth disabled
- `backend/internal/handlers/admin_content_authz.go` uses a dev-mode fallback identity if auth context is missing

As written, the system can accept admin mutations without a real authenticated actor. That is incompatible with “durably attributable.”

### 5. The cover flow is inconsistent across create vs edit
- create page uploads via `/api/admin/upload-cover` into frontend-local cover handling
- edit page uploads via backend `/api/v1/admin/upload` and then patches `cover_image`
- edit mutation helper currently ignores auth token in the upload request despite having it available

This is one of the clearest seams to unify under the shared foundation.

### 6. Read authority and write authority are misaligned
`AnimeRepository.GetByID` loads raw `anime` columns, then overlays title/title_de/title_en/genres from normalized metadata tables when present. But `AdminContentRepository.UpdateAnime` only updates raw `anime` columns.

Implication:
- the editor can save a raw title or genre
- later reads may still show normalized values from `anime_titles` / `anime_genres`
- the admin may believe the save “did not stick” or may unintentionally edit a non-authoritative representation

This needs an explicit Phase 1 decision:
1. raw `anime` table remains authoritative for editable fields in Phase 1
2. editor writes must also update normalized metadata tables
3. editor must clearly scope which fields are legacy/base vs normalized

### 7. Genre suggestions also lean on the legacy column
`ListGenreTokens` reads and tokenizes `anime.genre` strings from the base table, not normalized genres tables. That reinforces the same authority mismatch for ownership foundations.

### 8. Jellyfin linkage already gives a lightweight ownership hook
`GetAnimeSyncSource` and `ApplyJellyfinSyncMetadata` already use `anime.source` plus DB-first metadata filling. That is enough to support a lightweight Phase 1 hint like:
- `Manual`
- `Linked to Jellyfin`
- `Jellyfin-linked, manual edits preserved`

That stays within the locked scope and does not require full provenance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared edit foundation | A second create form with copied logic | Extract from `useAnimePatch` and existing workspace | The repo already shows duplication pain. |
| Attribution | “Audit” via log lines only | Durable DB-backed audit records tied to actor ID | Logs are not durable product attribution. |
| Ownership UI | Full provenance system in Phase 1 | Lightweight source/ownership hints from existing linkage | Full provenance is explicitly deferred. |
| Save model | Per-section save buttons | One central patch/save bar | Already chosen in context and already partially implemented. |
| Auth recovery | Silent dev fallback in production-like paths | Real auth middleware + explicit failure | `RLY-03` depends on trusted actor identity. |

## Common Pitfalls

### Pitfall 1: Shipping UI reuse without data-authority reuse
What goes wrong: the team unifies components but leaves create/edit writing different backends or different cover flows.

How to avoid: plan a shared editor contract first: initial values, save capability, cover capability, ownership hints, actor context.

### Pitfall 2: Calling logs “durable attribution”
What goes wrong: handlers log `user_id`, but the mutation itself has no lasting actor record.

How to avoid: require an audit persistence design before implementation starts.

### Pitfall 3: Ignoring the normalized metadata overlay
What goes wrong: admins edit fields that are later overwritten in reads by normalized tables.

How to avoid: make authoritative ownership of editable anime fields a Wave 0 planning decision.

### Pitfall 4: Treating auth bypass TODOs as harmless dev debt
What goes wrong: create/update/upload flows remain actor-ambiguous while Phase 1 claims `RLY-03`.

How to avoid: include auth restoration or explicit environment gating as part of the phase plan, not as cleanup.

### Pitfall 5: Letting Phase 1 absorb Phase 4 provenance scope
What goes wrong: the team overbuilds per-field and per-asset provenance now.

How to avoid: keep Phase 1 ownership visibility lightweight and reuse existing `source`-level seams.

## Code Examples / Implementation Seams

### Shared editor seam
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`

### Existing divergence to eliminate
- `frontend/src/app/admin/anime/create/page.tsx`

### Backend mutation seam
- `backend/internal/handlers/admin_content_anime.go`
- `backend/internal/repository/admin_content.go`

### Auth and attribution blocker
- `backend/internal/handlers/admin_content_authz.go`
- `backend/cmd/server/main.go`

### Data authority mismatch seam
- `backend/internal/repository/anime.go`

## Open Questions

1. Which data store is authoritative for editable anime titles/genres in Phase 1?
2. What is the durable audit target for anime mutations?
3. Does Phase 1 include cover upload attribution as part of `RLY-03`?
4. How much of create-page refactor belongs in Phase 1 vs Phase 2?

## Environment Availability

No new external dependency was identified for Phase 1 beyond the repo's existing frontend/backend/Postgres/Redis stack. This phase is primarily code-contract and schema work.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend | Go `testing` via `go test` |
| Frontend | Vitest `3.2.4` |
| Frontend config | `frontend/vitest.config.ts` |
| Quick backend run | `go test ./internal/handlers ./internal/repository` |
| Full backend run | `go test ./...` |
| Quick frontend run | `npm run test -- src/app/admin/anime/utils` |
| Full frontend run | `npm run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTK-06 | Existing anime edit uses reusable ownership-aware surface | frontend unit/integration + manual UI smoke | `npm run test` | Partial |
| RLY-03 | Admin create/update/upload/sync actions persist actor attribution | backend handler/repository tests | `go test ./internal/handlers ./internal/repository` | Partial |
| RLY-04 | Changes stay modular and under file-size guardrail | manual review + CI size check if added | manual-only today | No |

### Wave 0 Gaps
- Add backend tests that fail if anime mutation handlers accept unauthenticated actor-less writes in non-dev paths.
- Add backend tests for audit persistence once the schema/contract is chosen.
- Add frontend tests around shared editor state extraction if create/edit are moved onto one foundation.
- Add a small manual smoke path for cover upload + save + reload because current flows are split.

## Sources

- `.planning/phases/01-ownership-foundations/01-CONTEXT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `AGENTS.md`
- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`
- `frontend/src/app/admin/anime/create/page.tsx`
- `frontend/src/lib/api.ts`
- `backend/internal/handlers/admin_content_anime.go`
- `backend/internal/handlers/admin_content_anime_validation.go`
- `backend/internal/handlers/admin_content_authz.go`
- `backend/internal/repository/admin_content.go`
- `backend/internal/repository/anime.go`
- `backend/internal/models/admin_content.go`
- `backend/cmd/server/main.go`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/TESTING.md`

## Metadata

**Confidence breakdown:**
- Shared editor foundation: HIGH
- Audit attribution gap: HIGH
- Data-authority mismatch risk: HIGH
- Exact best audit schema: MEDIUM
- Phase boundary with create refactor: MEDIUM

**Valid until:** 2026-04-23 unless the anime admin architecture changes materially.

## RESEARCH COMPLETE
