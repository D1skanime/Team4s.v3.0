---
phase: 27
researched: 2026-04-28
status: complete
---

# Phase 27 Research: Segment Library Identity And Reuse

## Research Objective

Answer: What do we need to know to plan Phase 27 well so segment reuse survives anime delete/reimport without reopening broad media-library scope?

## Current Runtime Facts

### 1. Segment assets already have a usable file/media seam

Phase 26 stores segment uploads as real Team4s media assets behind:
- `theme_segments.source_type`
- `theme_segments.source_ref`
- `theme_segments.source_label`

This means Phase 27 does **not** need a second upload stack.
The missing piece is identity and lifecycle ownership, not raw upload plumbing.

### 2. Anime delete still treats anime-owned media as hard-owned by local anime identity

`backend/internal/repository/admin_content_anime_delete.go` currently:
- deletes anime associations,
- removes unreferenced media rows,
- additionally deletes `/media/anime/{id}/...` assets by path prefix,
- and performs orphan cleanup after anime delete.

This is good for locally owned anime media, but dangerous for reusable OP/ED data if that data remains discoverable only through local anime linkage.

### 3. Reimport-safe anime identity already exists conceptually

The repo already treats AniSearch provenance as durable identity in multiple places:
- `source='anisearch:{id}'`
- `anime_source_links`
- duplicate prevention and relation lookup based on AniSearch identity

Phase 27 should reuse that existing authority instead of inventing title-based heuristics.

### 4. Segment definitions are still too close to anime-local storage

The current model is workable for live editing, but not sufficient for reuse after delete/recreate because:
- `themes` still anchor directly on local `anime.id`
- `theme_segments` reach their owning anime through `themes`
- local anime deletion cascades through theme/segment structures

So even if a file survives physically, the semantic segment definition can disappear with the deleted anime.

## Planning Implications

### Recommended Identity Model

Use stable external/source identity for the anime:
- `provider = 'anisearch'`
- `external_id = <AniSearch-ID>`

Use stable local authority for the group:
- `fansub_group_id`

Use normalized segment identity fields:
- `segment_kind`
- optional `segment_name`

Recommended logical uniqueness:

`(anime_provider, anime_external_id, fansub_group_id, segment_kind, normalized_segment_name)`

`normalized_segment_name` can be nullable/empty for simple one-OP cases, but should participate when multiple OP/ED cuts exist.

### Recommended Ownership Split

Do not let one local anime row remain the owning parent of reusable segment definitions.

Instead:
- local anime usage/attachment may come and go,
- reusable segment definitions should survive as long as their stable source identity remains valid,
- concrete media assets should be deleted only when no reusable definition or assignment still references them.

### Recommended Migration Strategy

Prefer additive migration over destructive replacement:

1. introduce stable segment-definition identity fields/tables,
2. backfill current segment definitions from existing anime source data,
3. keep the existing release-context editor operating while reads/writes are gradually redirected,
4. only then narrow delete semantics.

This reduces risk compared with rewriting the whole segment stack in one step.

## Candidate Architecture Options

### Option A: Add stable identity fields directly onto existing theme/theme_segment tables

Pros:
- smaller schema delta
- fewer joins
- easier incremental rollout

Cons:
- old anime-owned structure remains semantically muddy
- delete boundaries stay harder to reason about
- mixing reusable identity and local usage in one table risks future confusion

### Option B: Introduce dedicated reusable segment-definition and asset-link tables

Pros:
- clean separation of identity vs usage vs file
- simpler delete semantics
- easier future fansub self-service and asset history

Cons:
- larger migration and query work
- more adapter code in current edit flows

### Recommended Choice

Hybrid leaning toward Option B:
- create a dedicated reusable definition layer,
- keep the current editor/release flow as the operator-facing entry point,
- adapt existing reads so they can surface reusable definitions through the current UI.

This keeps Phase 27 narrow enough to ship while fixing the real lifecycle mistake.

## Delete Boundary Recommendations

### Safe Rule

Anime delete should:
- remove local anime row and its local associations,
- detach local assignments to reusable segment definitions,
- preserve reusable definitions and their assets when they still have stable AniSearch/group identity,
- delete only assets/definitions that are truly unreferenced and marked as local-only leftovers.

### Unsafe Rule to Avoid

Do **not** delete a segment asset only because:
- the local anime row disappeared, or
- the old local `anime.id` no longer exists.

That rule destroys reimport safety.

## UI/Operator Research Notes

The UI should not force admins to understand the full schema.
They need a small decision surface:
- reuse existing OP/ED
- upload new asset
- replace active asset
- inspect provenance

Search text can help discoverability, but the actual backend match must stay ID-based.

## Validation Architecture

Phase 27 needs feedback across three layers:

1. **Repository/migration verification**
   - new stable-identity writes
   - backfill behavior
   - delete-detach vs delete-destroy rules

2. **Handler/API verification**
   - reuse lookup endpoint
   - attach/detach/upload flows
   - no duplicate-library creation for same stable identity unless explicitly allowed

3. **Live/UAT verification**
   - upload OP/ED to anime A
   - delete anime A
   - recreate/reimport same AniSearch anime
   - verify existing segment definition/asset is offered for reuse

## Risks To Plan Around

1. **Anime without AniSearch provenance**
   - Reuse logic must define what happens when no stable external identity exists.
   - Recommendation: library reuse is authoritative only for anime with confirmed AniSearch identity; non-AniSearch cases may stay local-only for now.

2. **Multiple OPs with same type**
   - `segment_kind` alone is not enough.
   - Need optional normalized display name in the identity contract.

3. **Legacy rows without enough metadata**
   - Backfill may need a conservative fallback status like `local_only` or `unverified_identity`.

4. **Accidental aggressive cleanup**
   - Delete logic must be repository-tested before live use.

## Research Conclusion

Phase 27 should not be framed as "make names work better."
It should be framed as:

> move segment identity from fragile local anime ownership to stable source-backed library identity, then expose that library through the existing release/segment editor.

That gives Team4s the needed reuse behavior without abandoning the verified Phase-24/25/26 operator surface.
