---
phase: 106
reviewers: [codex]
reviewed_at: 2026-07-22
plans_reviewed:
  - 106-01-PLAN.md
  - 106-02-PLAN.md
  - 106-03-PLAN.md
  - 106-04-PLAN.md
  - 106-05-PLAN.md
  - 106-07-PLAN.md
  - 106-08-PLAN.md
  - 106-09-PLAN.md
  - 106-10-PLAN.md
verdict: revisions_required
---

# Cross-AI Plan Review — Phase 106

## Reviewer availability

Only **Codex** (`@openai/codex`) was available on this machine. `gemini`, `claude`, `opencode`,
`qwen`, `cursor` and `coderabbit` are not installed, and no local OpenAI-compatible model server
(Ollama / LM Studio / llama.cpp) was running. The runtime is Claude Desktop, so `claude` would have
been skipped as a self-review regardless.

Codex initially failed: the installed CLI (0.116.0) could not use the account's model
(`gpt-5.6-sol`), and eight alternative models were rejected as unsupported for a ChatGPT account.
The CLI was upgraded to 0.145.0 (PO-approved) and the review then ran successfully.

**Consequence:** this is a **single-reviewer** review. There is no cross-model consensus to lean on —
each finding stands on its own evidence. The orchestrator therefore verified the top finding
directly against the codebase (see below).

---

## Codex Review

### 1. Summary

The plan set is substantially improved and broadly capable of achieving SC1–SC4, but it is not yet
execution-safe. A fifth instance of the recurring defect class remains: Plan 106-07 deletes the live
orphan-cover cleanup path (`deleteUploadedCoverFile`) without providing a replacement. In addition,
the schema gates do not fully prove the "exact schema" required by SC1, the empty-database
migration-chain proof is underspecified, and several wave-parallel checks inspect the shared working
tree globally, making otherwise independent Wave-2 plans nondeterministic. Overall assessment:
revisions required before execution.

### 2. Strengths

- Wave ordering is conceptually sound: migration 0131 is authored in Wave 1, code readers and writers
  are migrated in Waves 2–4, and the destructive `DROP COLUMN` is applied only in Wave 5.
- D-07, D-08 and D-09 are consistently propagated. The plans positively guard `release_media`,
  `release_version_media`, `media_assets`, `media_files` and `asset_lifecycle` rather than merely
  excluding them from removal searches.
- Research findings P-1 … P-8 are mostly incorporated precisely: `UploadMediaAsset.ID` remains intact;
  `runtime_authority_test.go` is updated with narrowly defined ownership; OpenAPI cleanup accompanies
  route removal; CamelCase `EpisodeVersionImage` replaces the ineffective snake-case search; `/covers/`
  removal is verified by file absence rather than a meaningless HTTP 404.
- The `anime.cover_image` transition has good sequencing and coverage: readers enumerated, canonical
  replacement expression reused, `GROUP BY` case explicitly handled, DTO field distinguished from the
  physical column, live checks over the affected public surfaces.
- The central authentication refresh seam is preserved and the required missing/expired-access-token
  upload regressions are added.
- Static gates use explicit scan roots and validate root existence, reducing "zero files scanned"
  false passes.
- Destructive SQL scope is narrow: only `anime.cover_image` is dropped; active legacy-era media
  infrastructure remains untouched.

### 3. Concerns

- **HIGH — Fifth live-consumer deletion: orphan-cover cleanup is removed without replacement.**
  Plan 106-07 calls `deleteUploadedCoverFile` the only `upload-cover` client, but the function is
  demonstrably live: `AdminAnimeOverviewClient` calls it after `deleteAdminAnime` returns
  `orphaned_local_cover_image`. Removing both the function and caller silently changes anime deletion
  from "delete DB record and clean the orphaned file" to "delete DB record and leave the file behind."
  Plan 106-10 deliberately retains the orphan-path DTO and backend resolution, confirming that this
  seam is not dead. No Phase-106 replacement performs controlled filesystem cleanup.

- **HIGH — SC1's "exact schema" is not actually proven.** The migration content test checks selected
  substrings, while the live contract check validates only a subset of columns and constraints. It
  could pass with: missing permitted columns (`original_filename`, `mime_type`, dimensions, duration,
  credit, rights note); extra unlisted columns not among the five forbidden names; incorrect
  nullability, defaults, types or owner FK delete behaviour; or a unique constraint/index on
  `content_hash`.

- **HIGH — The `content_hash` non-uniqueness guard is syntactically weak.** Searching only for
  `UNIQUE (content_hash)` does not reject `UNIQUE(content_hash)`, a differently formatted named table
  constraint, or `CREATE UNIQUE INDEX ... ON media(content_hash)`. The live contract check also does
  not inspect unique constraints or indexes for this column.

- **HIGH — The empty-database 1→n proof is underspecified.** The checkpoint says to establish a fresh
  database via the "local reset workflow" but provides no exact isolation, reset, precondition or
  migration-history check. Running `migrate up` against an already-migrated database proves only a
  no-op or tail migration, not a clean 1→n chain. It also risks destructive action against the
  ordinary development database.

- **HIGH — Wave-2 plans are not safely parallel under a shared working tree.** The wave graph declares
  106-03, 106-04, 106-05 and 106-07 parallel, but several acceptance checks inspect unrelated global
  diffs: 106-03 requires `git diff --name-only frontend/` to be empty while 106-07 edits `frontend/`;
  106-05 uses an unscoped `git diff --name-only`; 106-07 uses working-tree diff statistics for
  `api.ts`. With shared filesystem / main-branch execution, another Wave-2 plan's legitimate
  uncommitted work can fail these gates.

- **MEDIUM — The Release Images route removal still knowingly leaves a live consumer.** The current
  500 and future 404 reach the same visible branch today, but this remains a real server-contract
  change with no replacement. Status code, logs, monitoring, caching and generated clients change even
  if the component's text does not. A manual visual check proves only presentation equivalence.

- **MEDIUM — The contract check mixes database-contract validation with source-tree guards.**
  `media-core-contract-check.ps1` is described as a live schema contract check but also asserts
  source-file existence and exact OpenAPI occurrence counts for `asset_lifecycle`. This makes the gate
  brittle to harmless contract refactoring and obscures whether a failure is schema drift or source
  drift.

- **MEDIUM — Exact occurrence counts are fragile guards.** Assertions such as exactly two
  `asset_lifecycle` strings in OpenAPI prove textual layout, not semantic contract preservation. A
  harmless description or additional documented error example would fail; conversely, two irrelevant
  occurrences could pass after the actual contract was removed.

- **MEDIUM — The migration rollback is structural, not operationally reversible.** The down migration
  recreates an empty `cover_image` column after the code supporting its legacy semantics has been
  deleted. Acceptable under the reset / no-data-migration decision, but it should be explicitly
  labelled "schema rollback only; values and old behaviour are not restored."

- **MEDIUM — Plan 106-09 introduces alias interpolation without a contract on allowed aliases.**
  Current callers use literals, so immediate injection risk is low, but the helper accepts arbitrary
  strings and inserts them into SQL. It should either remain deliberately private with literal-only
  documentation/tests, or validate identifiers.

- **LOW — Some checks depend on line counts and exact diff sizes.** Requiring 20–26 removed lines from
  `api.ts`, or exactly one removed diff line, is sensitive to formatting and unrelated pre-existing
  edits. Semantic assertions provide stronger evidence.

- **LOW — The plans are heavily over-specified.** The repetition of locked decisions and historical
  revisions makes executor-critical instructions harder to distinguish from rationale, increasing the
  chance a necessary invariant is missed despite the documentation volume.

### 4. Suggestions

- **Revise 106-07 before execution:** do not remove `deleteUploadedCoverFile` or its caller until a
  project-owned replacement cleanup seam exists; alternatively move orphan-file deletion into the
  backend anime-delete lifecycle in this phase, but only if that controlled filesystem behaviour is
  already designed and in scope; if neither is appropriate, defer the route/client/caller removal
  together to the phase that replaces cover storage. Add a regression proving that deleting an anime
  does not leave an orphaned local cover.
- **Strengthen SC1 with catalog-level assertions:** compare the complete column inventory for both
  tables; assert PostgreSQL types, nullability, defaults, FKs and `ON DELETE` actions; assert no
  additional columns exist; inspect `pg_constraint` and `pg_index` to prove `content_hash` has no
  unique constraint or unique index; assert the intended non-unique indexes.
- **Make SC3 reproducible and safe:** use a dedicated temporary/test database or disposable Compose
  volume; assert zero migration-history rows and absence of target tables before `migrate up`; run the
  complete chain, contract check and optionally down/up for 0131 there; never describe the normal
  development database merely as "fresh/leere DB" without a validated reset target and explicit
  confirmation.
- **Make Wave-2 checks concurrency-safe:** replace global `git diff`/`git status` assertions with
  path-scoped checks; do not assert that whole directories such as `frontend/` are unchanged when
  another plan in the same wave owns files there; if global cleanliness is required, serialize those
  plans instead.
- **Separate gate responsibilities:** keep the DB contract script focused on database state; move
  source-file, OpenAPI and retained-service guards into the static legacy script or a dedicated
  source-contract script; prefer parsing OpenAPI and asserting paths/schemas/properties over counting
  raw strings.
- **For the Release Images seam,** add an explicit contract test documenting the intended temporary
  state — better still, defer route deletion until `ScreenshotGallery` is removed or redirected, so
  client and server contract change atomically.
- **Add unit tests for the generated cover SQL:** assert literal aliases produce the expected LATERAL
  and expression fragments; document that alias arguments are internal compile-time literals, or
  introduce a constrained identifier type/helper.
- **Add an explicit execution preflight immediately before Wave 1:** `git status --short
  database/migrations`, a migration-number collision check, and a re-run of the focused reference
  inventory for every deletion target — especially `deleteUploadedCoverFile` and the Release Images
  route.

### 5. Risk Assessment

**Overall risk: HIGH until revised.** The wave ordering and most preservation guards are strong, but
the plans still contain a confirmed live-behaviour deletion: orphan-cover filesystem cleanup is
removed with no replacement — the requested fifth instance of the recurring "declared legacy despite
live consumer" defect class. Separately, SC1 and SC3 can currently false-pass because the schema
contract is incomplete and the clean-database chain procedure is not rigorous. The Wave-2 diff gates
also conflict with parallel execution on a shared working tree.

After preserving or replacing the orphan cleanup seam, strengthening catalog-level schema assertions,
defining an isolated clean-DB procedure and scoping the parallel-wave diff checks, the residual risk
should fall to **MEDIUM**.

---

## Orchestrator verification

With only one reviewer there is no consensus signal, so the top finding was verified directly against
the codebase.

### CONFIRMED — orphan-cover cleanup is live (Codex concern #1)

The full chain exists and is reachable in production:

| Step | Evidence |
|---|---|
| Admin triggers delete | `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx:134` `deleteAdminAnime(anime.id)` |
| Backend resolves the orphan | `backend/internal/repository/admin_content_anime_delete.go:49` `resolveOrphanedLocalCoverImage(...)` → `:53` assigns `result.OrphanedLocalCoverImage` |
| Contract carries it | `backend/internal/models/admin_content.go:332` `OrphanedLocalCoverImage *string json:"orphaned_local_cover_image,omitempty"`; `frontend/src/types/admin.ts:323` |
| Frontend cleans the file | `AdminAnimeOverviewClient.tsx:136-138` reads `response.data.orphaned_local_cover_image` and calls `deleteUploadedCoverFile(orphanedCoverImage)` |
| The function itself | `frontend/src/lib/api.ts:5936` |

Plan 106-07 removes both `deleteUploadedCoverFile` and its caller, while plan 106-10 deliberately
**retains** the backend orphan resolution (`resolveOrphanedLocalCoverImageV2`). The resulting state is
incoherent: the backend keeps computing an orphaned filename that no client acts on, and deleted anime
leave their cover files on disk indefinitely. This is a silent behaviour regression, not a cleanup.

**This is the fifth confirmed instance** of the defect class recorded in CONTEXT.md D-09 — after
`release_media` (D-07), `anime.cover_image`, `asset_lifecycle` (D-08) and `ScreenshotGallery`. The
internal plan-checker did not catch it, which is itself a signal about how far the "is this actually
dead?" audit needs to reach: it must follow the consumer chain across the backend/frontend boundary,
not only within a layer.

### Not independently verified

The remaining findings (SC1 catalog-level assertions, `content_hash` uniqueness regex strength,
clean-DB procedure rigour, Wave-2 global-diff scoping, and the MEDIUM/LOW items) were not
re-verified at code level in this pass. They are internally consistent and specific, and the
Wave-2 concern in particular matches a known project constraint: execution runs sequentially on
`main` with `workflow.use_worktrees: false`, and concurrent GSD writers on `main` are a recorded
hazard — so global `git diff` assertions are genuinely fragile here regardless of wave parallelism.

---

## Next step

```
/gsd:plan-phase 106 --reviews
```

This replans incorporating the feedback above. At minimum, the HIGH findings must be resolved before
Phase 106 may execute.
