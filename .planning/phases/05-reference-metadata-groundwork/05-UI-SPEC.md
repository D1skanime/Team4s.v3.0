# Phase 5: Relations And Reliability - UI Design Contract

**Created:** 2026-04-01  
**Status:** Approved for planning  
**Phase:** 5 - Relations And Reliability

## Purpose

This UI contract defines how anime relation management must appear and behave inside the existing admin anime edit route. The goal is not to invent a separate relation tool, but to add a clear, operator-safe maintenance surface that fits the established edit-screen architecture and keeps the narrow V1 relation taxonomy understandable.

The new relation management UI must feel like an intentional extension of the current edit route, not a bolted-on debug panel and not a second workflow competing with the main edit surface.

## Scope

This contract applies to:

- the relation-management section inside `/admin/anime/{id}/edit`
- relation creation, inline edit, and delete affordances
- live search and selection of the target anime
- inline validation and persistent save/error feedback inside the relation section

This contract does not cover:

- a separate relation administration route
- broader relation taxonomy beyond the four locked V1 labels
- public-facing relation card redesign
- graph visualizations, bulk editing, drag-and-drop ordering, or relation-management dashboards

## Locked Product Decisions

These are fixed from `05-CONTEXT.md` and must not be changed during planning:

- Relations are managed inside the existing admin anime edit screen.
- The UI is a dedicated, collapsible relation section.
- The section starts collapsed by default.
- Relation type selection is directional from the perspective of the currently edited anime.
- The target anime is selected through live search results.
- Existing relations are maintained inline with edit and delete actions.
- Validation is shown inline, and backend/save failures remain visibly persistent inside the relations section.
- The only allowed labels are `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, and `Zusammenfassung`.

## Screen Placement And Hierarchy

### Placement

The relations section belongs inside the existing admin anime edit route, after the core metadata editor and before lower-priority technical/developer-only panels. It must not appear above the provenance block and must not displace the existing primary edit responsibilities.

Preferred order inside `/admin/anime/{id}/edit`:

1. Header / breadcrumbs / page feedback
2. Jellyfin provenance and asset maintenance
3. Main anime edit workspace
4. **Relations management section**
5. Episode sync / other auxiliary maintenance areas
6. Developer-only diagnostics

### Section Framing

The relations area should be visually equal to other major maintenance sections:

- same card-shell family as other admin edit sections
- clear section title and short explanatory subtitle
- enough visual separation that operators understand they are changing links between anime records, not editing metadata fields of the current anime

Required section title:

- `Relationen`

Required subtitle tone:

- short
- operational
- explicit that relations connect this anime with other existing anime

Example direction:

- `Verknuepfungen zu anderen bestehenden Anime pflegen. Typen gelten aus Sicht dieses Anime.`

## Collapse Behavior

### Default State

The relations section starts collapsed by default.

### Summary Row Requirements

The collapsed summary must still convey whether relation work is needed. It should show:

- relation count
- whether there are existing relations
- whether unsaved changes exist inside the section
- whether a validation/save error is currently active

The collapsed row must not be a vague "more settings" disclosure. It should read as a purposeful operational handle.

Recommended collapsed summary pattern:

- left: section title + small count badge
- right: state badge(s) + chevron

Examples:

- `Relationen` + `0 Eintraege`
- `Relationen` + `3 Eintraege`
- `Relationen` + `1 Fehler`
- `Relationen` + `Ungespeicherte Aenderungen`

### Expanded State

When expanded, the section reveals:

- create/search controls
- inline relation list
- section-scoped validation and save feedback

The expand/collapse animation should be modest and fast. No dramatic motion.

## Visual Direction

### Overall Tone

The relation UI should feel:

- editorial
- structured
- maintenance-oriented
- clearer than the current public relation carousel

The public [`AnimeRelations.tsx`](C:/Users/admin/Documents/Team4s/frontend/src/components/anime/AnimeRelations.tsx) component uses a glossy, cinematic card carousel. That visual language should **not** be copied into the admin relation editor. The admin editor needs a calmer, denser, form-centric treatment.

### Card / Row Treatment

Use a restrained admin-surface language:

- soft bordered cards or rows
- muted backgrounds
- status emphasis through badges and small accent blocks, not oversized hero cards
- clear row segmentation between current relation data and available actions

### Color

Stay inside the existing admin edit palette already used by `AdminStudio.module.css` and the current edit route:

- neutral surfaces first
- accent color reserved for:
  - focused search result
  - open/active section state
  - primary relation save action
- warning/error tones reserved for:
  - duplicate/self-link validation
  - delete confirmation/destructive actions
  - backend failure feedback

Do not introduce a new relation-specific color system.

### Typography

Use the same admin edit hierarchy already established in Phase 4:

- section title: same scale as other major edit sections
- helper copy: same `sectionMeta` / helper-text family
- inline row labels: compact, highly legible
- relation badges and taxonomy labels: medium emphasis, not all-caps shouting

The relation label itself should be visually clear and easy to scan in a list of multiple relations.

## Content And Copywriting

### Language

All operator-facing admin copy must be German.

The public relation component currently uses English labels such as `Related`, `Sequel`, `Summary`. Phase 5 admin UI must not reuse those strings directly.

### Taxonomy Labels

The admin relation editor must use exactly these labels:

- `Hauptgeschichte`
- `Nebengeschichte`
- `Fortsetzung`
- `Zusammenfassung`

If internal values differ, the mapping must remain invisible to the operator.

### Directional Helper Copy

Because relation semantics are directional, the create/edit controls must remind the operator of that perspective in-place. This must not be hidden only in docs or tooltips.

Required concept:

- the selected type describes what the target anime is relative to the anime currently being edited

Recommended helper line near the type selector:

- `Der Typ beschreibt das ausgewaehlte Ziel aus Sicht dieses Anime.`

### Empty State Copy

When no relations exist:

- no blamey language
- no generic placeholder like "Nothing here yet"
- explicitly invite relation creation

Recommended direction:

- `Noch keine Relationen gepflegt. Suche einen bestehenden Anime und waehle den passenden Bezug.`

### Search Copy

Search UI should sound operational and unambiguous:

- input label: `Ziel-Anime suchen`
- placeholder should mention title search, not ID-only thinking

Recommended placeholder:

- `Titel eingeben, um bestehende Anime zu finden`

### Error Copy

Validation and backend failures must be short, explicit, and fixable.

Required explicit cases:

- self-link
- duplicate relation
- target not found
- save failed
- delete failed

Example directions:

- `Dieses Anime kann nicht mit sich selbst verknuepft werden.`
- `Diese Relation existiert bereits.`
- `Das ausgewaehlte Ziel konnte nicht geladen werden.`
- `Relation konnte nicht gespeichert werden.`
- `Relation konnte nicht entfernt werden.`

## Search And Selection UX

### Input Pattern

The target anime search is a live-search input with result list.

It must behave like an inline selection seam, not like a full search page:

- search field inside the relations section
- debounced result updates
- compact result list below the field
- keyboard-safe and mouse-safe

### Search Result Content

Each result row must provide enough context to avoid accidental linking:

- anime title
- anime ID
- optional year
- optional type

If a cover thumbnail is inexpensive to reuse and stays visually calm, it may be included, but it is optional. Text clarity is more important than media density here.

### Selection State

After selection:

- the chosen target becomes visibly locked into the draft relation row
- the operator should not wonder whether the click "took"
- the search field may clear or collapse into a selected-target chip/row, but the chosen target must remain obvious

Recommended pattern:

- a selected target summary row directly above the type selector with title, ID, and small "change" affordance

### Result List Behavior

- show no more than a manageable short list at once
- scrolling within results is acceptable
- no full-page takeover
- no mixed search + current-relations clutter without spacing separation

## Create Flow

The create relation flow inside the section should read top-to-bottom:

1. open relations section
2. search target anime
3. choose one target
4. choose relation type
5. save relation

The flow must not require the operator to understand database direction or reverse mappings.

### Primary Create Controls

The create area should have:

- target search input
- target result list / selected target summary
- type selector
- section-level primary action button

Recommended primary action label:

- `Relation speichern`

Do not use vague labels like `Speichern` without context when multiple save surfaces are already present on the page.

## Existing Relation List

### Row Layout

Each existing relation appears as a compact inline row/card with:

- target anime title
- relation label
- supporting metadata such as ID, year, or type
- edit action
- delete action

### Edit Mode

Inline edit mode must be clearly distinct from read mode.

When editing a row:

- the row should expand or switch into clear edit state
- the current target remains visible
- the operator can change at least the relation type, and if planning chooses, also reselect the target
- save/cancel controls must be local to that row

Do not mix multiple open edit rows if that creates ambiguity. Planning may choose one-open-row-at-a-time behavior.

### Delete Action

Delete must be visually destructive but not dominant.

Requirements:

- destructive styling consistent with existing admin danger actions
- confirmation step required before irreversible delete commit

The confirmation can be inline or modal/lightweight confirm, but it must avoid accidental deletion.

## Validation And Reliability UX

### Validation Layers

Use two layers:

1. inline field validation for operator-fixable input issues
2. persistent section-level error box for backend/save/delete failures

### Inline Validation

Inline validation should appear:

- directly beneath the relevant field or row
- before the operator tries to leave the section guessing what is wrong

Cases:

- no target selected
- no relation type selected
- self-link
- duplicate relation

### Section-Level Error Box

The section-level error box persists within the relations area until:

- the user retries successfully
- the user dismisses it, if dismissible behavior is chosen
- state changes make it obsolete

It must not disappear too quickly and must not rely only on a global page feedback area, because the section may be collapsed or far below the fold.

### Success Feedback

Success feedback may be shown both:

- inside the section for local confidence
- and via existing page-level success handling if the route already uses it

But the local section must still make the completed action obvious. A relation row appearing immediately after save is a better success cue than a transient toast alone.

## Layout And Spacing

### Section Spacing

The relation section should respect the same base vertical rhythm as other edit cards:

- 24px outer section separation from neighboring cards
- 16px to 20px internal block spacing
- tighter 12px spacing inside inline rows and result items

### Internal Grouping

Keep three clearly separated subareas:

1. section header / collapsed summary
2. create relation controls
3. existing relation list

Do not visually merge the search results into the existing relation list.

### Mobile And Narrow Width

The edit route already has substantial content. On narrower screens:

- action clusters may stack vertically
- search result rows may become two-line layouts
- edit/delete buttons may move below metadata
- collapse behavior becomes even more important

The section must remain fully usable without horizontal scrolling.

## Accessibility And Interaction

### Keyboard

The live-search result list must be keyboard-usable:

- arrow navigation if a listbox pattern is used
- enter to confirm result
- escape to dismiss results if applicable

### Focus

When the section expands:

- focus should remain predictable
- after selecting a target, focus should move naturally to the type selector or save control

### Disclosure Semantics

The collapsible section must use accessible disclosure semantics with a real interactive header/button.

### Confirmation

Delete confirmation must be keyboard-accessible and screen-reader understandable.

## Constraints For Planning

The planner must preserve these structural constraints:

- no separate relation management route in Phase 5
- no graph editor or visual node map
- no freeform relation labels
- no dependence on the public carousel styling
- no hidden semantic inversion that makes the chosen label mean something different in storage than in operator understanding

The planner may decide:

- whether the collapsible shell uses `details/summary` or a custom disclosure
- whether inline edit changes only type or both type and target
- whether search results include thumbnails
- whether row edit uses expand-in-place or row replacement

## Acceptance Gates For UI Implementation

The implemented UI must satisfy all of these:

1. A relations section exists inside the existing anime edit route.
2. That section is collapsed by default.
3. The section clearly explains that relation type is chosen from the perspective of the current anime.
4. Target anime selection uses live search results, not raw ID entry as the primary workflow.
5. Existing relations are visible and maintainable inline with edit and delete actions.
6. Validation is shown inline for operator-fixable issues.
7. Save/delete/backend failures remain visible inside the relations section until clearly resolved.
8. Only the four approved V1 relation labels are exposed in operator-facing copy.

## Handoff Summary

Phase 5 UI should add a calm, collapsible maintenance block to the anime edit route. It must make directional relation editing understandable, searchable, and safe, without creating a second admin workflow or borrowing the glossy visual language of the public relation carousel.
