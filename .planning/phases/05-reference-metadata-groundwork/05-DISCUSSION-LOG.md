# Phase 5: Relations And Reliability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in `05-CONTEXT.md`.

**Date:** 2026-04-01
**Phase:** 05-relations-and-reliability
**Mode:** discuss

## Questions And Decisions

### Admin Surface
- **Question:** Where should anime relations be managed?
  - Existing anime edit screen as a relations block
  - Own tab/sub-area of the anime edit screen
  - Separate relations screen per anime
  - Other
- **User choice:** Own tab/sub-area feeling, clarified as an "aufklappbarer Bereich" in the existing anime edit screen.

- **Question:** Should the relations area start collapsed or expanded?
  - Collapsed by default
  - Expanded by default
  - Context-dependent
- **User choice:** Collapsed by default.

### Relation Semantics
- **Question:** When editing anime `A`, what does `Fortsetzung` mean?
  - Target anime `B` is the sequel to `A`
  - `A` is the sequel to `B`
  - UI should phrase both sides explicitly
  - Other
- **User choice:** Target anime `B` is the sequel to the currently edited anime `A`.

### Target Selection
- **Question:** How should the target anime be selected?
  - Search field with live results
  - Explicit search button flow
  - Raw numeric anime ID
  - Other
- **User choice:** Search field with live results.

### Editing Behavior
- **Question:** How should existing relations be maintained?
  - Inline list with edit and delete per item
  - Delete inline, edit via recreate
  - Delete only
  - Other
- **User choice:** Inline list with edit and delete per item.

### Validation And Reliability
- **Question:** How should validation and backend errors be surfaced?
  - Inline validation plus persistent error box in the relations section
  - Page-global error box only
  - Minimal toast/browser style feedback
  - Other
- **User choice:** Inline validation plus a persistent error box in the relations section.

## Historical Context Noted

- The existing directory `05-reference-metadata-groundwork` contains legacy Phase 5 material for metadata normalization, not the current relations phase.
- That legacy material was inspected and explicitly treated as historical residue rather than current-scope input.
