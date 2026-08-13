# Phase 12: Create AniSearch Intake Reintroduction And Draft Merge Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 12-create-anisearch-intake-reintroduction-and-draft-merge-control
**Areas discussed:** Create entry surface, draft merge priority, duplicate handling, operator feedback, deferred AniSearch search UX

---

## Create Entry Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Above Jellyfin action | AniSearch sits directly above the current Jellyfin action seam with its own controls | ✓ |
| Separate create section | AniSearch appears elsewhere on the create page as a distinct block | |
| Hidden/deferred path | AniSearch stays absent or behind a secondary flow | |

**User's choice:** AniSearch belongs directly above the `Jellyfin suchen` button with an AniSearch ID field and a dedicated trigger button next to it.
**Notes:** The user wants AniSearch to be first-class and immediately reachable in the current create UI.

---

## Draft Merge Priority

| Option | Description | Selected |
|--------|-------------|----------|
| `manual > AniSearch > Jellyfin` | AniSearch always overrides Jellyfin, while manual values remain authoritative | ✓ |
| `manual > Jellyfin > AniSearch` | Jellyfin stays stronger once loaded | |
| Order-dependent provider merge | Whichever provider loads last wins | |

**User's choice:** AniSearch must always override Jellyfin values.
**Notes:** This must hold in both directions: Jellyfin then AniSearch, and AniSearch then Jellyfin.

---

## Duplicate Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate create-to-edit switch | Duplicate AniSearch ID jumps directly to the existing anime edit route | ✓ |
| Stay on create with conflict card | Create remains open and shows conflict metadata inline | |
| Block with generic error | Show an error and make the user resolve it manually | |

**User's choice:** If an AniSearch ID already exists, switch directly to that anime in edit mode.
**Notes:** Edit itself should not be expanded in this phase; the redirect is enough.

---

## Operator Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Silent field change | Only the draft changes, without extra status summary | |
| Compact success note | Small status message summarizing the load result | |
| Visible summary block | Clear summary with updated fields, relation notes, and not-saved-yet reminder | ✓ |

**User's choice:** A visible summary block after AniSearch load.
**Notes:** The summary must clearly say what changed and that the anime is still not saved.

---

## Deferred Ideas

| Option | Description | Selected |
|--------|-------------|----------|
| Keep ID-only in Phase 12 | Restore explicit AniSearch ID flow first, defer title search | ✓ |
| Add title search now | Build AniSearch search-by-title popup into the same phase | |

**User's choice:** Search-by-title was proposed as a good future direction, but should be deferred so Phase 12 can focus on restoring the ID-driven create flow.
**Notes:** The deferred idea is a popup that lists matching anime titles and IDs after typing a title like `Bleach`.

## the agent's Discretion

- Exact wording and layout details of the AniSearch summary block
- Exact helper/module split for the reintroduced create AniSearch UI

