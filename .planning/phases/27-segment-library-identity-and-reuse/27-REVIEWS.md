---
phase: 27
reviewers: [codex]
reviewed_at: 2026-04-28T08:05:00Z
plans_reviewed:
  - 27-01-PLAN.md
  - 27-02-PLAN.md
  - 27-03-PLAN.md
---

# Cross-AI Plan Review — Phase 27

## Codex Review

### Plan 01 (Wave 1: Schema + Delete Boundary)

**Summary**
This is the right first wave. It targets the actual domain hinge for the phase: moving segment identity off local `anime.id` and establishing delete semantics before higher-level reuse flows are built. The main weakness is that the plan still describes identity mostly as extra fields on current segment definitions, but it does not yet make the Definition / Asset / Assignment split explicit enough at the schema and repository level. If that split stays implicit, later waves will likely leak anime-local assumptions back into the model.

**Strengths**
- Starts with schema and delete boundary, which is the correct dependency order.
- Uses AniSearch provider + external ID rather than titles or filenames, which matches the phase decisions and reduces fuzzy matching risk.
- Calls out additive migration and legacy fallback state, which is essential in a brownfield system.
- Separates reusable-library delete behavior from existing anime-owned art cleanup, which limits blast radius.
- Mentions auditable repository seams and tests around delete behavior, which is where regressions are most likely.

**Concerns**
- `HIGH` The three-layer model is not explicit enough. Adding identity fields to "segment definitions" alone may still leave asset linkage and assignment semantics entangled in existing anime-local rows.
- `HIGH` The uniqueness rule is underspecified around `optional segment name`. A normalized nullable-name strategy is needed, otherwise NULL, empty string, and casing differences can create duplicate "same identity" rows.
- `HIGH` Legacy-row handling is too vague. "Cannot yet prove stable identity" needs concrete behavior for lookup exclusion, delete behavior, and upgrade paths, or deletions may incorrectly preserve or destroy rows.
- `MEDIUM` `identity_status / ownership_scope` sounds like two overlapping concepts. If not sharply defined, later code will branch inconsistently on them.
- `MEDIUM` Delete semantics mention "detach" and "orphaned local-only leftovers," but not the exact condition for asset cleanup. If a reusable definition points to a shared asset with zero current assignments, should the asset remain as library inventory or be deleted?
- `MEDIUM` Migration safety is incomplete unless the down migration clearly reverses constraints/indexes without data-loss surprises.
- `LOW` No explicit mention of backfill strategy for rows that do have recoverable AniSearch identity via existing joins.

**Suggestions**
- Make the schema express the three layers directly, even if only partially in this phase (Definition = stable identity row, Asset = concrete file/media row linked to definition, Assignment = current release/editor usage row).
- Replace the vague status model with explicit semantics: `identity_status: verified | legacy_unverified`; `ownership_scope: reusable | local_only`.
- Define normalization rules in the migration and model docs: segment kind canonicalization, segment name trimming/casing/null handling, whether `fansub_group_id` can be null and how that affects uniqueness.
- Specify delete truth tables before implementation (reusable definition + active assignments, reusable definition + zero assignments, local-only definition + zero assignments, local-only definition + asset shared/not shared).
- Add a safe legacy policy: legacy unverified rows excluded from reuse lookup; delete preserves them only when explicitly marked reusable; optional follow-up backfill can promote them later.
- Ensure the migration adds lookup indexes, not just uniqueness constraints.

**Risk: `MEDIUM-HIGH`** — This wave defines the phase's core invariants. If the schema stops at "more columns on current rows" instead of enforcing Definition / Asset / Assignment boundaries, Waves 2 and 3 can appear to work while still preserving the old anime-local coupling.

---

### Plan 02 (Wave 2: Backend Reuse Lookup and Attachment)

**Summary**
This wave is directionally sound: it introduces reusable lookup and explicit attach flows without overloading the existing upload API. The main risk is that "attachment" is still described in functional terms rather than precise persistence semantics. Without a clear assignment model, the backend may end up copying or mutating reusable definitions/assets to fit current editor context, which would undermine the whole phase.

**Strengths**
- Correctly places reusable lookup behind repository seams keyed by stable AniSearch identity.
- Explicitly avoids duplicating `media_assets`, which aligns with reuse goals.
- Keeps reuse discovery and rebind as dedicated routes instead of smuggling behavior into upload.
- Carries provenance through DTOs, which is important for admin trust and later debugging.
- Uses existing segment editor route family, which keeps scope contained.

**Concerns**
- `HIGH` "Attach into current release-context segment" is too ambiguous. The plan must say exactly what row is created or updated: assignment only, definition only, or both.
- `HIGH` Concurrency and uniqueness behavior are missing. Two admins could attempt to create or attach the same stable identity simultaneously, causing duplicate definitions unless repository logic is idempotent.
- `HIGH` Error handling for identity mismatch is not covered. Example: current anime's AniSearch identity differs from candidate definition identity, or group/kind/name mismatch due to stale UI state.
- `MEDIUM` Provenance DTOs are good, but the plan does not state whether provenance is derived from immutable persisted fields versus transient handler logic. If transient, UI truth can drift.
- `MEDIUM` No plan for lookup behavior on legacy rows. If legacy unverified data leaks into candidate lists, admins may reattach unstable or duplicate rows.
- `MEDIUM` No mention of authorization/audit trail for attach operations.
- `LOW` Route design says GET/POST pair, but not whether candidate lookup is scoped enough to avoid returning noisy cross-library results.

**Suggestions**
- Define persistence semantics explicitly: lookup returns Definitions with current preferred Asset and usage metadata; attach creates or updates Assignment rows only; reusable Definitions/Assets are never rewritten just to satisfy one local editor context.
- Make repository operations idempotent: `find_or_create_definition_by_identity`, `attach_definition_to_assignment`, with DB uniqueness and conflict handling.
- Add concrete failure cases to the plan (missing AniSearch source link, multiple/invalid source links, candidate no longer exists, candidate asset's media_asset is deleted/unavailable).
- Persist provenance as data, not just response decoration (attach source, ownership scope, created-vs-reused reason).
- Exclude `legacy_unverified` definitions from reuse candidates unless explicitly promoted.
- Add tests for concurrent attach/create, repeated attach not duplicating assignment/media, mismatched AniSearch identity rejected.

**Risk: `MEDIUM`** — Route and seam design is reasonable, but this wave can easily fail the phase goal if "attach" is implemented as hidden duplication or mutation instead of a strict assignment-to-library model.

---

### Plan 03 (Wave 3: Frontend UX + Live Verification)

**Summary**
This wave is appropriately narrow on paper: expose reuse honestly in the segment editor, then close with live delete/reimport verification. The UX portion is acceptable, but the verification plan is too thin relative to the risk profile of the phase. One live scenario is not enough to validate delete-detach semantics, legacy handling, and provenance integrity.

**Strengths**
- Keeps UX inside the existing segment editor rather than creating a side management surface.
- Explicit upload-vs-reuse decision supports the product's core value: admins stay in control.
- Provenance display is aligned with the fixed decisions and helps operators trust what happened.
- Includes real end-to-end verification against delete and reimport flows, which is essential for this phase.

**Concerns**
- `HIGH` Verification scope is too narrow. One happy-path scenario does not sufficiently cover delete-detach semantics across reusable vs local-only data.
- `HIGH` The plan does not say how the UI behaves when no stable AniSearch identity is available or when only legacy unverified rows exist.
- `MEDIUM` "Upload-vs-reuse decision" risks UI complexity if upload and attach share incomplete state or ambiguous save behavior. Plan should specify whether selection is optimistic, staged, or persisted immediately.
- `MEDIUM` Provenance/status text is mentioned, but not the exact states. If backend supports more states than UI renders, operators will get misleading signals.
- `MEDIUM` No explicit coverage of the core scenario: "delete local anime but keep reusable library asset unused for a period."
- `LOW` Updating STATUS.md and TOMORROW.md is good process hygiene, but does not substitute for repeatable verification steps.

**Suggestions**
- Expand verification into a small matrix (reusable asset attached then anime deleted then same AniSearch reimported → asset reusable; local-only segment deleted → orphan cleanup occurs; legacy unverified segment does not appear as reusable candidate; same AniSearch anime recreated locally without import path → behavior clearly defined).
- Define explicit UI states: no reusable candidates found, stable identity unavailable, legacy-only data exists but cannot be reused automatically, reused existing asset, uploaded new asset into reusable library, local-only attachment.
- Specify save semantics in the editor: when a candidate is chosen, what is saved immediately vs on final editor save; how stale candidate selections are handled.
- Add at least one reproducible automated test or manual checklist alongside the live check.
- Record provenance wording up front so UI and backend use the same state model.

**Risk: `MEDIUM`** if implemented with stronger verification, **`HIGH`** if left as a single live happy-path test.

---

## Consensus Summary

Only one external reviewer (Codex) was available. Claude CLI and Gemini CLI were not found.

### Key Strengths (identified by Codex)

- Good sequencing: schema/delete boundary first, reuse seams second, UX/verification third.
- Scope remains admin-focused and avoids unrelated library/general-media expansion.
- Stable AniSearch identity is consistently treated as the anchor across all three plans.
- Provenance is considered across backend and frontend, not bolted on at the end.
- Additive migration approach is correct for brownfield.

### Top Concerns (by priority)

1. **[HIGH] Three-layer model not concretely enforced** — Definition / Asset / Assignment must exist as a real persistence model, not just conceptual language. Without this, waves 2 and 3 can appear to work while still preserving anime-local coupling.

2. **[HIGH] Legacy-row policy too vague** — "Cannot yet prove stable identity" needs concrete behaviors: excluded from reuse lookup, preserved on delete unless explicitly marked reusable, optional follow-up backfill to promote.

3. **[HIGH] Delete-detach truth table missing** — A complete matrix is needed: reusable + active assignments, reusable + zero assignments, local-only + zero assignments, local-only + asset shared/not shared. Without it, delete semantics will be inconsistent.

4. **[HIGH] "Attach" semantics underspecified (Plan 02)** — Must state exactly which rows are created/updated (assignment only vs definition vs both), and operations must be idempotent at the DB level.

5. **[HIGH] Verification too narrow (Plan 03)** — One happy-path is not enough. A small scenario matrix covering reusable, local-only, and legacy cases is needed.

6. **[MEDIUM] `identity_status` vs `ownership_scope` overlap** — Sharply define both concepts before implementation or code will branch inconsistently.

7. **[MEDIUM] Uniqueness rule for optional segment name** — Needs normalized nullable-name strategy (trimmed, lowercased, NULL vs empty string treatment) in the migration itself.

8. **[MEDIUM] Concurrency/idempotency absent from Plan 02** — `find_or_create_definition_by_identity` and `attach_definition_to_assignment` need DB-backed conflict handling, not just handler checks.

### Recommended Pre-Implementation Addition

Before execution, add a short design appendix to CONTEXT.md or VALIDATION.md defining:
- Canonical entities and ownership
- Allowed transitions (Assignment → Definition → Asset)
- Delete truth table (all four states)
- Legacy-row policy

This would reduce overall phase risk from `MEDIUM-HIGH` to `MEDIUM`.
