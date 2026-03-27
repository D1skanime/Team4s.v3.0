# Phase 04 Context - Provenance, Assets, And Safe Resync

## Goal

Phase 04 extends the completed Jellyfin-assisted intake flow into the persisted anime edit workflow. The operator must be able to understand where persisted data came from, inspect what can be refreshed from Jellyfin, and update linked metadata without silently overwriting trusted manual edits.

## Scope

This phase is limited to persisted anime maintenance on `/admin/anime/[id]/edit`.

In scope:
- surface persisted provenance for linked anime
- show linked Jellyfin identity in operator-readable form
- add preview-first metadata resync for persisted anime
- define fill-only resync semantics for metadata fields
- expose asset provenance and slot-level replace/remove actions
- preserve explicit manual overrides during later resync

Out of scope:
- new anime creation flow changes
- AniSearch sourcing
- bulk multi-anime resync
- relation editing
- generic gallery/media-library management
- broad playback/runtime hardening unrelated to admin metadata maintenance

## Locked Decisions

- The edit route remains the primary surface for persisted-source maintenance.
- Persisted Jellyfin identity is represented through existing `source` and `folder_name` storage.
- Operators must be able to see enough provenance to decide whether a resync is safe before applying it.
- Metadata resync is preview-first, then explicit apply.
- Default metadata apply policy is fill-only.
- Fields intentionally cleared by operators may be refilled by a later explicit resync.
- Asset handling is slot-scoped, not a generic media management system.
- Manual replacements must remain protected from later automated refreshes unless the operator explicitly replaces them again.
- Anime image assets move to a DB-backed persistence model rather than remaining loose provider URLs.
- Covered persisted image slots are `cover`, `banner`, and `backgrounds`.
- `banner` and `backgrounds` are part of the same persistence rollout, not separate future slices.
- Persisted anime assets always win at runtime; Jellyfin is fallback-only when no persisted asset exists for that slot.
- Manual anime assets always win over provider assets until the manual asset is explicitly removed or replaced.
- Provider-owned assets may refresh during explicit Jellyfin resync only when the slot is still provider-owned.
- New provider-owned backgrounds may be added on resync, but they must not displace manual backgrounds.
- Background/theme videos remain provider-only via Jellyfin and are not part of the local persistence model in this phase.
- User-facing admin feedback stays in German.

## Why This Phase Exists

Phase 03 solved intake and explicit-save creation. After creation, linked anime still lacks an operator-grade maintenance story:

- the edit route does not surface linked source context clearly enough
- existing ownership messaging is too coarse for real maintenance decisions
- metadata resync logic exists only partially in backend seams
- asset replacement/removal needs provenance-aware operator controls

Without this phase, linked anime becomes progressively harder to trust and maintain.

## Expected Outcome

At the end of Phase 04, an operator can open a linked anime in the admin edit route, understand whether it is linked or manual, preview metadata changes from Jellyfin, apply only the explicit previewed changes, and manage core media slots without losing track of which values are manual versus provider-backed.

For asset behavior, the runtime result is deterministic:
- persisted manual `cover`, `banner`, and `backgrounds` are shown first
- persisted provider-owned assets remain refreshable
- Jellyfin fills only uncovered slots and never overrides persisted manual image assets
- background videos continue to stream from Jellyfin only

## Deferred Risks

- Full parity for every artwork type may need follow-up work after slot-level cover/backdrop/banner behavior is proven.
- Source conflict handling for malformed or stale `source` values is intentionally kept narrow in this phase.
- Bulk maintenance ergonomics are deferred until single-record maintenance is stable.
- Logo persistence for anime is deferred; the current decision set explicitly covers `cover`, `banner`, and `backgrounds` first.
