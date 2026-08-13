---
phase: 14
slug: create-provider-search-separation-and-result-selection
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-12
---

# Phase 14 — UI Design Contract

> Visual and interaction contract for frontend phases. Generated for Phase 14 and aligned to the existing create route.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | existing app icons only; no new icon dependency required |
| Font | existing app sans stack |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline badge gaps, metadata separators |
| sm | 8px | Label-to-input spacing, compact helper stacks |
| md | 16px | Default control spacing inside provider cards |
| lg | 24px | Card padding and section separation inside one surface |
| xl | 32px | Gap between create-page major surfaces |
| 2xl | 48px | Major page break between workspace and secondary panels |
| 3xl | 64px | Reserved only for full-page top/bottom breathing room |

Exceptions: none

**Layout rules**
- Provider cards use `lg` internal padding and `md` vertical gaps.
- The AniSearch result popup uses `lg` outer padding, `md` row gaps, and `sm` metadata spacing.
- No ad-hoc 18px / 14px / 12px spacing values for layout structure in new Phase 14 UI work.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.4 |
| Heading | 20px | 700 | 1.2 |
| Display | 28px | 700 | 1.1 |

**Type rules**
- No viewport-scaled type for new Phase 14 surfaces.
- Letter spacing stays `0` for headings, labels, buttons, and metadata.
- Provider eyebrow text may use uppercase, but not negative tracking.
- Helper text and unsaved-state text stay at body or label size; no tiny disclaimer typography.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` | Page background and main cards |
| Secondary (30%) | `#f4f6f8` | Nested control groups, popup row hover-ready surfaces, muted panels |
| Accent (10%) | `#ff6a3d` | Primary provider actions, active selection edge, focused source step only |
| Destructive | `#b42318` | Error state and destructive messaging only |

Accent reserved for: primary source actions, selected AniSearch candidate state, selected Jellyfin review state, keyboard focus accents on provider search controls

**Color rules**
- Jellyfin and AniSearch are differentiated primarily by labels and structure, not by giving each source its own competing accent color.
- Success and warning states keep the existing admin status-pill family, but provider cards themselves stay neutral.
- Popup candidate rows use neutral surfaces by default and accent only for the chosen row.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Treffer laden` / `AniSearch laden` / `Jellyfin suchen` |
| Empty state heading | `Noch kein Treffer gewaehlt` |
| Empty state body | `Suche in der Quelle, waehle einen Eintrag und uebernimm ihn dann in den Entwurf.` |
| Error state | `Suche fehlgeschlagen. Pruefe Suchbegriff oder Verbindung und versuche es erneut.` |
| Destructive confirmation | not applicable in this phase |

**Copy rules**
- Source-local copy must always name the source: `Jellyfin`, `AniSearch`, `Entwurf`.
- The unsaved reminder must remain explicit after every successful provider load: `Noch nichts gespeichert.`
- Search inputs are described as source actions, never as the final title field.
- Candidate-selection copy must state the step order clearly: search -> select -> load into draft.

---

## Interaction Contract

### Page Structure
- The final anime title field remains in the `Basisdaten` section and represents the actual draft title only.
- Provider search lives in two separate surfaces inside the existing title-action area:
  - `AniSearch` card first
  - `Jellyfin` card second
- Both cards align to the same width and vertical rhythm.

### Jellyfin Card
- Contains a dedicated Jellyfin search input at the top of the card.
- Keeps the existing result review and preview-loading behavior.
- Search input and action button are one compact row on desktop and stacked on mobile.
- The current external result panel may remain below the workspace if that best preserves the existing review seam.

### AniSearch Card
- Keeps the exact-ID input and `AniSearch laden` direct path.
- Adds a separate title-search input in the same card.
- Title-search results open in a popup/modal chooser, not a permanently expanded inline results block.
- The popup must show one candidate row per result with:
  - title
  - type
  - year
  - AniSearch ID

### AniSearch Popup
- Modal width: constrained content width, not full-screen card sprawl
- Candidate rows are button-like list items with fixed metadata slots so the layout does not jump
- One selected row at a time
- Primary popup action: `Treffer laden`
- Secondary action: `Abbrechen`
- Selecting a candidate triggers the existing ID-based AniSearch load path in the background using that candidate's ID

### Draft Handoff
- After a source result is chosen, the draft updates directly without a second confirmation screen.
- Success feedback remains card-local and states that the draft changed but is not saved.
- The resolved provider title writes into the actual title field after load.
- Temporary provider queries remain in provider-local inputs and do not persist into the final title field unless manually copied by the operator.

### Mobile Behavior
- Provider cards stack vertically
- Search input and CTA stack vertically within each card
- Popup uses full-height mobile sheet behavior only if needed for readability; otherwise prefer centered modal
- Candidate rows remain tap-safe with minimum 44px interactive height

---

## Shape and Surface Rules

- Buttons, inputs, rows, popup container, and cards must use border radius **8px or less**
- Do not introduce pill-shaped provider cards or oversized rounded panels
- No card-inside-card styling for the main provider surfaces
- The popup is functional chrome, not a decorative floating glass panel

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party | none | not allowed in this phase without explicit re-review |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-12
