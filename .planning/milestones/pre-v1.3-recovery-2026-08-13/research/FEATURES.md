# Feature Landscape

**Domain:** Internal admin workflow for anime intake, edit, Jellyfin preview/resync, asset provenance, and relation CRUD
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM

## Executive Position

This phase should be treated as an internal content-operations surface, not a full CMS rebuild. Table stakes are the capabilities that let an admin safely create or correct one anime record at a time, understand where data came from, re-run Jellyfin enrichment without destroying manual work, manage the small approved relation set, and debug failures immediately. If those are missing, the workflow will feel unreliable and operators will fall back to ad hoc database or filesystem work.

The differentiator for this specific workflow is not automation volume. It is controlled import: Jellyfin can accelerate data entry, but the admin stays in charge before save and after save. That makes explicit provenance, removable imported assets, and safe re-sync rules more important than advanced bulk tooling in v1.

For roadmap purposes, v1 should bias toward correctness, reversibility, and operator comprehension. Features that add automation or history depth but also increase state complexity should be deferred until the first manual-plus-Jellyfin workflow is stable in production.

## Table Stakes for V1

Features users will expect in the first usable internal admin workflow. Missing these means the workflow is not trustworthy enough for day-to-day ops.

### 1. Intake and Editing Workflow

| Feature | Why It Is Table Stakes | Complexity | Notes |
|---------|------------------------|------------|-------|
| Explicit mode choice: `Manual` vs `Jellyfin-assisted` | The operator needs to declare source intent up front because the downstream behavior differs. | Low | Matches the local project brief and keeps import semantics understandable. |
| Review/edit form before any create | Preview-before-save is the minimum safe pattern for assisted intake. | Medium | Jellyfin should prefill fields, not create records immediately. |
| Minimal required fields: `title` and `cover` | Internal content teams need a low-friction path to create incomplete-but-valid records. | Low | Anything stricter will block common rescue/edit flows. |
| Manual creation with no Jellyfin linkage | Editors need a complete fallback path when Jellyfin is missing, wrong, or irrelevant. | Low | Must be a first-class path, not an exception path. |
| Edit existing anime with source-aware fields | Create-only support is insufficient; correction is part of the normal workflow. | Medium | Editing must preserve source ownership semantics. |
| Visible Jellyfin identity and path metadata in create and edit flows | Operators need enough context to confirm they picked the right library item/folder. | Low | Show human-readable path plus stable Jellyfin ID. |

### 2. Jellyfin Preview and Safe Re-sync

| Feature | Why It Is Table Stakes | Complexity | Notes |
|---------|------------------------|------------|-------|
| Search/select Jellyfin items before import | Assisted intake is not useful without confident source selection. | Medium | Include item label, folder/path, and identifier. |
| Field-level prefill from Jellyfin into editable form | The point of Jellyfin assistance is faster data entry, not black-box sync. | Medium | Prefill description, year, AniDB ID, genres/tags, and available media references. |
| Explicit `Save` / `Cancel` preview state | Operators need reversibility before a record exists. | Low | Cancel must leave no partially-created anime. |
| Re-sync action on existing anime | Once linked, operators will expect a way to retry enrichment after Jellyfin changes. | Medium | Necessary for poster/banner/logo/background refresh and metadata completion. |
| Safe re-sync rule: fill empty fields only, never overwrite non-empty manual values | This is the core trust boundary of the workflow. | Medium | Jellyfin's refresh APIs support aggressive replacement, so Team4s should intentionally implement the safer policy above them. |
| Clear source badges on Jellyfin-backed fields/assets | Operators need to know what a re-sync can touch and what was curated manually. | Medium | Provenance must be visible in the edit UI, not hidden in backend state. |

### 3. Asset Provenance and Removal

| Feature | Why It Is Table Stakes | Complexity | Notes |
|---------|------------------------|------------|-------|
| Per-asset provenance: `manual upload` vs `Jellyfin import` | Without provenance, admins cannot reason about replacement or cleanup safely. | Medium | Apply to poster, logo, banner, background, background video where present. |
| Remove imported Jellyfin asset without deleting the anime | Admins need to discard bad imported media and replace it later. | Medium | Removal should target the asset/linkage, not the anime record. |
| Replace Jellyfin-derived asset with manual asset | This is the normal correction path once a better asset exists. | Medium | After replacement, manual asset becomes authoritative. |
| Empty-state handling for removed assets | Operators need the record to remain editable after asset removal. | Low | Especially important because only cover upload is fully productionized today. |
| Operator-safe errors around missing/invalid asset references | Imported media is inherently brittle; failures must be understandable. | Medium | Do not silently drop broken references. |

### 4. Relation Management

| Feature | Why It Is Table Stakes | Complexity | Notes |
|---------|------------------------|------------|-------|
| CRUD for anime relations from admin UI | Relations already exist conceptually and in storage; lacking CRUD leaves the workflow incomplete. | Medium | Create, edit relation type, and remove link. |
| Restricted v1 relation type set | Narrowing the vocabulary keeps first-release semantics consistent. | Low | Only `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, `Zusammenfassung`. |
| Search/select existing anime when linking relations | Relation entry without search is error-prone and slow. | Medium | Must prevent accidental linking to wrong records. |
| Display existing relations on edit screen | Operators need to understand current graph state before changing it. | Low | Include relation label and target anime identity. |
| Validation against self-links/obvious duplicates | Prevents easy data corruption. | Low | At minimum reject self-reference and duplicate identical relation rows. |

### 5. Validation, Audit, and Debugging

| Feature | Why It Is Table Stakes | Complexity | Notes |
|---------|------------------------|------------|-------|
| Inline validation with field-specific errors | Internal tools still need precise correction guidance. | Low | Especially for required fields and malformed imported values. |
| Clear Jellyfin fetch/search/re-sync failure messages | Integration failures are expected operational events, not edge cases. | Medium | Show enough detail for fast triage without needing server access. |
| Audit log entry with acting user ID for create/edit/re-sync/relation changes | Internal admin tools need accountability for traceability and rollback investigation. | Medium | User/action/timestamp/target is the minimum useful set. |
| Non-durable but visible error/debug context in UI | V1 does not need full incident history, but operators do need immediate debugging clues. | Low | Surface request outcome, affected source item, and short failure reason. |

## Useful but Deferrable Capabilities

These would improve throughput or polish, but they are not required to make v1 operationally credible.

### 1. Workflow Acceleration

| Feature | Value Proposition | Complexity | Why Defer |
|---------|-------------------|------------|-----------|
| Bulk create/import from multiple Jellyfin items | Speeds large backfills. | High | Multiplies ambiguity, collision handling, and error states before single-item workflow is proven. |
| Bulk re-sync across many anime | Useful after library-wide metadata fixes. | High | Needs queueing, progress reporting, and stronger failure handling. |
| Duplicate detection suggestions during create | Reduces accidental duplicate anime records. | Medium | Helpful, but not required if operators are few and informed. |
| Presets/templates for common field defaults | Speeds repetitive intake. | Low | Nice productivity gain once the base form stabilizes. |

### 2. Deeper Provenance and History

| Feature | Value Proposition | Complexity | Why Defer |
|---------|-------------------|------------|-----------|
| Field-level provenance history over time | Helps explain exactly when a field changed source. | High | High state complexity for limited initial value. |
| Before/after diff for Jellyfin re-sync preview | Lets operators inspect proposed changes before applying them. | High | Valuable later, but v1 can rely on fill-empty-only semantics instead. |
| Soft-delete or restore for removed imported assets | Safer undo for media cleanup. | Medium | Can wait until asset surfaces beyond cover are more mature. |
| Durable integration error history | Better long-term debugging and ops analytics. | Medium | The project brief explicitly says durable error history is not needed in v1. |

### 3. Richer Relation Tooling

| Feature | Value Proposition | Complexity | Why Defer |
|---------|-------------------|------------|-----------|
| Broader relation taxonomy | Supports finer editorial nuance. | Medium | Current phase intentionally limits labels to four. |
| Bidirectional relation editing helpers | Reduces manual graph maintenance. | Medium | Helpful once relation semantics are stable in practice. |
| Graph visualization of franchise relations | Improves editorial overview. | Medium | Useful for dense catalogs, not required for first CRUD release. |

### 4. Ops and UX Enhancements

| Feature | Value Proposition | Complexity | Why Defer |
|---------|-------------------|------------|-----------|
| Retry buttons for failed Jellyfin calls in-place | Speeds recovery from transient failures. | Low | Useful but not blocking if the action is easy to rerun manually. |
| Health/status panel for Jellyfin connectivity | Faster diagnosis of environment issues. | Medium | More operational polish than core feature. |
| Keyboard-heavy editing shortcuts | Improves admin throughput. | Low | Worth adding after the flow settles. |

## Anti-Scope for This Phase

These add complexity without improving the primary v1 goal of safe, understandable admin intake.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fully automatic record creation directly from Jellyfin search results | Removes human review at the exact point where source mistakes are most dangerous. | Keep Jellyfin as preview/prefill only until explicit save. |
| Automatic overwrite of manual values on re-sync | Destroys operator trust and makes manual curation pointless. | Restrict re-sync to filling empty fields only in v1. |
| Broad relation type support on day one | Expands editorial ambiguity and UI complexity before the narrow workflow is validated. | Ship only the four approved labels. |
| General-purpose DAM/media library redesign | Too large for the problem being solved and disconnected from current upload maturity. | Implement provenance/removal only for anime assets touched by this workflow. |
| Workflow engine, approvals, or multi-step review states | Overbuilt for an internal admin-only surface with a small operator set. | Use direct save/cancel plus audit logging. |
| Background auto-sync from Jellyfin | Creates hidden mutations and hard-to-debug ownership conflicts. | Keep sync user-initiated and explicit. |
| Full revision history UI for every field | High complexity relative to immediate operational need. | Start with action audit logs and visible provenance. |
| Cross-system taxonomy normalization automation beyond current fields | Likely to trigger hidden rules and cleanup work. | Let admins edit imported values manually in the review form. |

## Categories and Dependencies

```text
Mode choice -> Review/edit form -> Save anime
Jellyfin search/select -> Prefill preview -> Save or cancel
Saved Jellyfin-linked anime -> Safe re-sync
Saved anime -> Asset provenance visibility -> Asset removal/replacement
Saved anime -> Relation CRUD
All write actions -> Validation + audit attribution + operator-visible errors
```

## MVP Recommendation

Prioritize:
1. Intake/edit foundation: manual vs Jellyfin-assisted entry, preview-before-save, editable form, minimal required fields.
2. Safe ownership model: visible Jellyfin identity/path, field and asset provenance, fill-empty-only re-sync, removable imported assets.
3. Relation/admin safety layer: relation CRUD for the four approved labels, strong validation, audit attribution, and clear operator-facing errors.

Defer:
- Bulk workflows: too much state and error fan-out before single-record trust is established.
- Deep history/versioning: provenance visibility and audit logs are enough for v1.
- Broader relation semantics and automation: first prove the constrained editorial model works.

## Sources

- Local project brief: [`.planning/PROJECT.md`](/C:/Users/admin/Documents/Team4s/.planning/PROJECT.md) - HIGH confidence for project-specific requirements and constraints.
- Jellyfin OpenAPI index showing current stable/unstable API specs, including the current stable spec dated 2025-12-15: https://api.jellyfin.org/openapi/ - MEDIUM confidence for current API surface availability.
- Jellyfin TypeScript SDK `refreshItem` parameters (`replaceAllMetadata`, `replaceAllImages`, refresh modes), showing Jellyfin supports more aggressive refresh behavior than Team4s should expose in v1: https://typescript-sdk.jellyfin.org/functions/generated-client.ItemRefreshApiAxiosParamCreator.html - HIGH confidence.
- Directus accountability docs describing activity feed fields such as user, action, timestamp, collection, and item: https://directus.io/docs/guides/auth/accountability - MEDIUM confidence for internal-admin audit expectations.
- Strapi Media Library docs showing asset search, folder organization, replace-media, and delete flows as standard admin media-management expectations: https://docs.strapi.io/cms/features/media-library - MEDIUM confidence for comparable admin UX expectations.

## Confidence Notes

- **High confidence:** preview-before-save, manual-authoritative ownership, safe re-sync boundaries, relation CRUD need, and operator-visible errors. These are directly supported by the local project brief.
- **Medium confidence:** audit-log depth and asset-management expectations as table stakes. These are consistent with mature admin/CMS tools, but Team4s is narrower than a full CMS and should implement only the smallest useful subset.
- **Low confidence areas not promoted to requirements:** bulk workflows, diff previews, advanced graph tooling, and durable error history. These are useful later but not well justified for this phase.
