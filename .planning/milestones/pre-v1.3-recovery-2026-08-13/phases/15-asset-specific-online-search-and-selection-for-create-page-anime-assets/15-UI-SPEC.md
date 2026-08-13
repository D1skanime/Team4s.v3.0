---
phase: 15
slug: asset-specific-online-search-and-selection-for-create-page-anime-assets
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-13
---

# Phase 15 - UI Design Contract

> Visual and interaction contract for create-page asset search dialogs and per-slot source selection.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | existing app icons only |
| Font | existing app sans stack |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tiny metadata gaps |
| sm | 8px | Label/input spacing |
| md | 16px | Default control spacing |
| lg | 24px | Card and modal padding |
| xl | 32px | Separation between major create-page surfaces |

**Layout rules**
- Each asset slot keeps one compact action row for upload plus online search.
- Search dialogs use `lg` padding with `md` gaps between search controls and result regions.
- Result grids keep stable tile sizes so loading or metadata changes do not cause jumpy layout.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.4 |
| Heading | 20px | 700 | 1.2 |

**Type rules**
- No viewport-scaled type.
- Letter spacing remains `0`.
- Source badges and metadata stay readable; no tiny disclaimer typography.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant | `#ffffff` | Main background and cards |
| Secondary | `#f4f6f8` | Result tiles and muted panels |
| Accent | `#ff6a3d` | Primary actions, selected state, active loading focus |
| Destructive | `#b42318` | Error and destructive messaging only |

**Color rules**
- Different sources are distinguished by text labels and badges, not by giving every website its own full accent palette.
- Loading and selection may use the existing accent color, but idle result tiles remain neutral.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Open search CTA | `Online suchen` |
| Single-select confirm | `Asset uebernehmen` |
| Multi-select confirm | `Auswahl uebernehmen` |
| Loading text | `Suche laeuft...` |
| Empty state heading | `Keine Treffer gefunden` |
| Empty state body | `Versuche einen anderen Suchbegriff oder eine andere Quelle.` |

**Copy rules**
- Every result must name its source.
- Search dialogs should name the active asset slot (`Cover`, `Banner`, `Logo`, `Background`).
- Unsaved-state reminders remain explicit after adoption into the draft.

---

## Interaction Contract

### Entry Points
- Every supported asset slot exposes `Online suchen` beside the existing upload/preparation action.
- Opening the search keeps the operator on the create page and opens a focused dialog/sheet.

### Search Dialog
- Dialog includes a search field, search action, loading state, and result area.
- Results from several sources may appear in one list/grid, but every result carries a visible source badge.
- Optional filtering by source is allowed, but source visibility is mandatory even without filters.

### Selection Behavior
- `Cover`, `Banner`, and `Logo` allow only one selected result at a time.
- `Background` supports selecting multiple results before confirming.
- Selected state is visually obvious and stable.

### Loading Behavior
- While search is in progress, the primary search action is disabled.
- A visible loading indicator remains present until the current search completes or errors.
- The dialog must not look frozen while long-running source searches are active.

### Result Content
- Each result tile or row shows:
  - preview image
  - source name
  - at least one secondary metadata item when available, such as resolution or type
- Result tiles keep stable dimensions across loading and loaded states.

### Mobile Behavior
- Dialog content stacks vertically.
- Result tiles remain tap-safe with minimum 44px controls.
- Multi-select background flow remains usable without hover.

---

## Shape and Surface Rules

- Buttons, inputs, cards, result tiles, and dialog shells use border radius `8px` or less.
- No decorative nested-card look for the main create surface.
- The dialog is functional product chrome, not a floating showcase panel.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-13
