# Phase 1: Ownership Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-24T09:54:00.2153550+01:00
**Phase:** 01-ownership-foundations
**Areas discussed:** Shared editor scope, Ownership baseline, Audit attribution, Save model

---

## Shared editor scope

| Option | Description | Selected |
|--------|-------------|----------|
| Harden existing edit workspace only | Keep Phase 1 focused on the current edit screen and let future create flows become separate surfaces later. | |
| Shared editor foundation for edit and future create flows | Lock in one common anime editor basis that later serves edit, manual create, and Jellyfin-backed drafts. | x |

**User's choice:** Shared editor foundation for edit and future create flows
**Notes:** The user chose the variant where edit, manual create, and Jellyfin draft should share the same editor surface and differ only by context.

---

## Ownership baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Technical foundation only | Build ownership plumbing now and delay visible ownership cues until Phase 4. | |
| Lightweight visibility | Show simple manual versus external/source hints in Phase 1, while full provenance behavior comes later. | x |
| Full visibility now | Build full field and asset provenance visibility already in Phase 1. | |

**User's choice:** Lightweight visibility
**Notes:** The user wants early ownership visibility in the UI, but not the full provenance and resync experience yet.

---

## Audit attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Only normal anime saves | Attribute only basic anime create/update field saves. | |
| Saves plus cover actions | Attribute basic saves and cover-specific actions. | |
| All editor-borne anime mutations | Attribute all anime-related mutations exposed on the shared editor foundation. | x |

**User's choice:** All editor-borne anime mutations
**Notes:** The user wants the Phase 1 foundation to be broadly attributable, not narrowly limited to one save endpoint.

---

## Save model

| Option | Description | Selected |
|--------|-------------|----------|
| One central save bar | Keep the editor as one coherent draft surface with a single primary save action. | x |
| Multiple isolated save sections | Split the editor into separately saved subsections. | |

**User's choice:** One central save bar
**Notes:** The user prefers a single save flow because it fits the shared editor idea for edit, manual create, and later Jellyfin draft handling.

---

## the agent's Discretion

- Final UI placement and presentation style of lightweight ownership indicators.
- Internal component and hook refactors required to keep the shared editor modular.
- Concrete audit event structure so long as acting admin attribution is durable.

## Deferred Ideas

- Full manual intake flow
- Jellyfin-assisted draft creation flow
- Full provenance and safe resync UX
- Relation CRUD workflow
