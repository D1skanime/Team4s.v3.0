---
phase: 22-anime-edit-on-create-flow-foundation
verified: 2026-04-23T12:00:00Z
status: planned
score: pending
---

# Phase 22: Anime Edit On Create-Flow Foundation Verification Intent

## Goal-Backward Verification Targets

Phase 22 is only successful if anime edit no longer behaves like a separate stale product. Verification must prove that the edit route now runs on the same core foundation as create, while still respecting the identity rules that differ for an existing anime.

## Must-Have Truths

1. `/admin/anime/[id]/edit` renders through the shared create/edit editor foundation rather than the old standalone edit workspace.
2. Existing anime values load into the shared editor so operators can change the same core data they expect from the create-style surface.
3. AniSearch identity is visible but not freely rewritable when an AniSearch link already exists.
4. Jellyfin relink or resync actions remain explicit and do not silently replace manual authority.
5. The old edit-only main form implementation is removed or reduced to a thin compatibility shell.

## Expected Automated Verification

- Frontend build passes for the create route and the edit route after the shared foundation lands.
- Any route-level tests or component-level checks touched by the phase prove edit hydration and edit save through the shared workspace.
- Any touched AniSearch/Jellyfin logic has regression coverage for the guarded edit rules.

## Expected Human UAT

1. Open `/admin/anime/{id}/edit` for an existing anime and confirm the page now feels like the create-style workspace rather than the old edit cards.
2. Confirm existing values are prefilled across basis data, metadata, and asset sections.
3. Confirm an anime with existing AniSearch linkage shows that identity clearly but does not offer a casual freeform remap path.
4. Confirm Jellyfin can still be explicitly re-searched or re-synced from edit.
5. Save a changed edit draft and reload to confirm the shared workspace reflects persisted values.
