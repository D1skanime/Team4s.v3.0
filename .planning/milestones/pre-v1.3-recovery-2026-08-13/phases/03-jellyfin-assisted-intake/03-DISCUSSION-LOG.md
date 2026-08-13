# Phase 3: Jellyfin-Assisted Intake - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-jellyfin-assisted-intake
**Areas discussed:** trigger model, candidate evidence, draft handoff, asset handling, match handoff visibility, title seed, type hints

---

## Trigger model

| Option | Description | Selected |
|--------|-------------|----------|
| Separate create modes | Manual and Jellyfin start on separate surfaces | |
| Shared draft with source buttons | Keep one draft and expose source actions next to the name field | x |
| Source selection before any draft | Force source choice before the draft exists | |

**User's choice:** Shared draft with `Jellyfin Sync` and `AniSearch Sync` buttons next to the anime-name field.
**Notes:** Both buttons stay disabled until the admin has typed a meaningful anime name.

---

## Candidate evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Plain search list | Text-only list with item names | |
| Data table | Technical evidence in rows and columns | |
| Visual cards | Show metadata plus media previews on cards | x |

**User's choice:** Visual cards.
**Notes:** The user explicitly wants poster, banner, logo, and background previews so the correct match is obvious before import. Clean UX is especially important here.

---

## Draft handoff

| Option | Description | Selected |
|--------|-------------|----------|
| Import confirmation screen | Separate verification step before entering the draft | |
| Immediate prefilled draft | Open the same draft screen immediately with imported values | x |
| Background prefill with auto-save | Prefill silently without an explicit review step | |

**User's choice:** Immediate prefilled draft.
**Notes:** Jellyfin remains preview-only until final save; no hidden record creation is allowed.

---

## Asset handling

| Option | Description | Selected |
|--------|-------------|----------|
| Choose assets on the candidate card | Select poster, banner, logo, and background before opening the draft | |
| Import first, remove in draft | Prefill draft with assets and let the admin deselect there | x |
| Auto-accept all assets | No asset choice before save | |

**User's choice:** Import first, then deselect in the draft.
**Notes:** The candidate card is for match confidence; asset acceptance or rejection belongs in the draft editor.

---

## Match handoff visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all matches visible | Continue showing the competing Jellyfin results after takeover | |
| Collapse to chosen match | After takeover, continue only with the selected Jellyfin source | x |
| Hide alternates behind a toggle | Preserve alternates, but keep them out of the main view | |

**User's choice:** Collapse to chosen match.
**Notes:** Once the admin clicks to take over a Jellyfin match, the other matches should no longer be displayed.

---

## Title seed

| Option | Description | Selected |
|--------|-------------|----------|
| Jellyfin display title | Use the Jellyfin item title as the initial draft title | |
| Folder name as editable seed | Initialize the draft title from the folder name, but keep it editable | x |
| Ask during takeover | Force the admin to choose a title source before hydration | |

**User's choice:** Folder name as editable seed.
**Notes:** The admin can still adjust the title manually after takeover.

---

## Type hints and source conflicts

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-set type from Jellyfin | Type follows folder logic automatically | |
| Suggest with explanation | Show a type hint with path or name reasoning, but keep the field editable | x |
| Ignore source hints | No automatic type help at all | |

**User's choice:** Suggest with explanation.
**Notes:** Later, AniSearch can help correct Jellyfin interpretation for OVAs, specials, sequels, and similar cases. When sources disagree, both should be shown as hints while the admin remains the final authority.

---

## Deferred Ideas

- Real AniSearch data import and correction logic - button only in Phase 3, real behavior later.
- Full provenance UI and resync ownership rules - later phase.
- Per-asset manual upload buttons with contract-driven folder or file naming based on anime ID - later asset phase.
