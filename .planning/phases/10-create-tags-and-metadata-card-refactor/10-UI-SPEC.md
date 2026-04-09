---
phase: 10
slug: create-tags-and-metadata-card-refactor
status: approved
shadcn_initialized: false
preset: not applicable
created: 2026-04-08
---

# Phase 10 - UI Design Contract

> Visual and interaction contract for the create-route tags work. Generated before planning so the implementation keeps the current admin language, adds tags deliberately, and avoids more page-level drift.

---

## Purpose

Phase 10 extends the existing `/admin/anime/create` workspace with a dedicated tags surface and uses that work as the forcing function to refactor the metadata area into smaller, easier-to-maintain pieces.

The UI must feel like a natural continuation of the current manual create route:

- calm admin workspace, not a marketing-style redesign
- strong visual continuity with the existing genre control
- clearer metadata grouping than the current mixed "Genre und Beschreibung" section
- explicit support for manual operator input plus provider-hydrated suggestions

This contract does not introduce a new design language. It narrows and clarifies the current one.

---

## Scope

This contract applies to:

- the metadata section inside `/admin/anime/create`
- the new dedicated tags card
- the relationship between genre card, tags card, and description field
- responsive stacking and spacing for the create metadata area
- copy, empty states, inline hints, and error treatment for tag editing

This contract does not cover:

- AniSearch edit enrichment
- a public tags experience
- full-page create route redesign outside the metadata area
- a generalized reusable taxonomy editor for future metadata types

---

## Locked Product Decisions

These come from [10-CONTEXT.md](/C:/Users/admin/Documents/Team4sV2/.planning/phases/10-create-tags-and-metadata-card-refactor/10-CONTEXT.md) and are fixed for planning:

- Tags are a first-class field on create, not a hidden payload detail.
- Tags live in their own visible card.
- Manual entry and suggestion-based filling both remain supported.
- Provider-imported tags hydrate into the same visible token state as manual tags.
- Tags should visually relate to genres without collapsing both into one shared field.
- No single page component should exceed 700 lines after the refactor.
- New sections and non-obvious helpers need short purpose comments.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | existing app primitives only; no new icon dependency required |
| Font | existing admin font stack |

The implementation must preserve the current admin CSS module approach and existing surface tokens in [admin.module.css](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/admin.module.css) and [ManualCreateWorkspace.module.css](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.module.css).

---

## Layout Contract

### Metadata Section Structure

The current "Genre und Beschreibung" card must become a clearer metadata cluster with three distinct subareas:

1. Genre card
2. Tags card
3. Description card

Genre and tags should sit as sibling cards in the same content band. Description remains visually related but should not be mistaken for another token field.

Preferred structure:

- section eyebrow: `Metadaten`
- section title: `Genre, Tags und Beschreibung`
- section text explains that genres and tags improve findability, while the description stays editorial and concise

### Grid Behavior

Desktop:

- metadata content uses a two-column grid
- left column: genre card and tags card stacked vertically
- right column: description card

Tablet:

- two-column layout may remain if space allows and token wrapping still reads comfortably

Mobile:

- all three cards stack to one column
- no horizontal scrolling

### Card Equality

Genre and tags cards must use the same shell family:

- same border radius
- same border treatment
- same interior padding
- same label and hint hierarchy

They must still remain visibly distinct through title, helper copy, aria labels, and token semantics.

---

## Spacing Scale

Declared values must stay inside the existing admin rhythm:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Small label-to-meta separation |
| sm | 8px | Compact hint and inline status gaps |
| md | 16px | Standard field and card interior spacing |
| lg | 20px | Section card padding in create workspace |
| xl | 24px | Gap between major metadata groups |
| 2xl | 32px | Vertical breathing room between large create sections |
| 3xl | 48px | Not introduced in this phase |

Exceptions: none

Additional layout rules:

- token rows should wrap with 8px horizontal and vertical rhythm
- tag suggestion box must not exceed the current suggestion-box density of the genre control
- description card should keep its larger textarea footprint without forcing the tags card to stretch unnaturally

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 13px to 14px | 400 | 1.5 to 1.55 |
| Label | 12px to 13px | 600 to 700 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | existing page title only; no new display tier | existing | existing |

Typography rules:

- preserve current `sectionTitle`, `sectionText`, and field-label hierarchy
- no all-caps card titles
- suggestion counts and helper text stay low emphasis
- token text remains compact and readable at current chip scale

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` and existing app neutrals | card surfaces and workspace background |
| Secondary (30%) | `#f4f6f8`, `#667085`, existing neutral borders | muted cards, helper text, chip containers |
| Accent (10%) | existing `accent-primary` mix and current warm eyebrow tone `#8a5b49` | active token chips, focused interactive states, section identity accents |
| Destructive | existing error palette derived from `#ef4444` / `#b42318` | remove actions, validation, failures only |

Accent reserved for:

- selected token chips
- focused input state
- active or emphasized metadata interactions

Accent must not be used to color the full tags card differently from the genre card. The distinction comes from content and copy, not a second color system.

---

## Copywriting Contract

All operator-facing copy remains German.

| Element | Copy |
|---------|------|
| Metadata section title | `Genre, Tags und Beschreibung` |
| Tags card title | `Tags` |
| Tags empty state | `Noch keine Tags gesetzt.` |
| Tags add button | `Hinzufuegen` |
| Tags input placeholder | `z. B. Klassiker, Mecha, Schulalltag` |
| Tags helper copy | `Tip: Komma getrennt eingeben; Klick auf Vorschlag fuegt den Tag hinzu.` |
| Tags suggestion status | `Vorschlaege: {visible}/{total} (geladen: {loaded})` |
| Tags loading state | `Tag-Vorschlaege werden geladen...` |
| Tags error state | `Hinweis: Tag-Vorschlaege konnten nicht vollstaendig geladen werden.` |

Copy rules:

- genres describe broad classification
- tags describe searchable descriptors, themes, vibes, or niche findability cues
- helper text must not imply strict taxonomy governance
- no placeholder copy should mention AniSearch in Phase 10

Recommended supporting line under the tags title:

- `Ergaenze frei waehlbare Schlagwoerter fuer Suche, Einordnung und spaetere Pflege.`

Recommended section text:

- `Genres ordnen den Titel grob ein. Tags helfen bei Suche, Themen und spaeterer Pflege.`

---

## Interaction Contract

### Tag Entry

The tags card must support three input paths that converge into one token list:

1. manual free-text entry
2. comma-separated paste or typing
3. click on suggestions

All three paths produce the same selected-token chip treatment.

### Token Behavior

Selected tags:

- render as active chips
- remove on chip click
- dedupe silently
- trim surrounding whitespace before insertion
- preserve the normalized display name chosen by the app

The UI must never show duplicate tags, even if they came from mixed manual and provider input.

### Suggestions

Suggestion treatment should mirror genre behavior closely:

- suggestion chips or rows live below the entry row
- click adds the tag immediately
- suggestions already selected should either disappear or become non-primary to avoid confusion
- `Mehr` / `Weniger` behavior may remain parallel to genres if the same loading model is reused

### Provider Hydration

If Jellyfin or another create-time provider supplies tags, the tags card should appear already populated.

The operator must be able to:

- see imported tags immediately
- remove imported tags the same way as manual tags
- add new tags without switching modes

No separate "imported tags" visual language is required in this phase.

---

## Responsive And Accessibility Contract

### Responsive Rules

At narrow widths:

- metadata cards stack vertically
- input row may remain two-column only if the button does not truncate
- if needed, add button stacks beneath the input instead of causing overflow
- token chips wrap naturally with no clipped labels

### Accessibility

The tags card must preserve the current accessibility baseline:

- real `label` bound to the input
- selected chip region announced with a distinct `aria-label`
- suggestions region announced with a distinct `aria-label`
- keyboard enter adds draft tag
- interactive chips remain keyboard reachable

Recommended labels:

- selected chip row: `Ausgewaehlte Tags`
- suggestion region: `Tag Vorschlaege`

### Error Treatment

Tag-loading failures are advisory, not blocking:

- show inline muted warning text inside the tags card
- do not disable manual tag entry because suggestions failed
- do not escalate suggestion-load problems to a page-level blocking error

---

## Refactor Contract

Phase 10 is not only a field addition. The implementation must reduce create-page sprawl.

The UI contract requires:

- the metadata area to be decomposed into focused pieces rather than expanded inline
- genre and tags controls to share patterns intentionally, not through copy-paste drift
- section and helper purpose comments on extracted components or hooks where intent would otherwise be unclear

Allowed implementation shapes:

- a shared token-card primitive plus genre/tag wrappers
- sibling `AnimeCreateGenreField` and `AnimeCreateTagField` components with small shared helpers

Not allowed:

- adding the tag UI directly into the page component as another large inline block
- leaving one oversized page component above the agreed line-count limit

---

## Acceptance Gates For Implementation

The implemented UI must satisfy all of these:

1. `/admin/anime/create` shows a dedicated tags card in the metadata section.
2. Genre and tags are visibly separate concepts with their own card headings.
3. The tags card supports manual entry, comma-separated input, and click-based suggestion filling.
4. Imported provider tags hydrate into the same visible token list used for manual tags.
5. Description remains visually separate from tag tokens and does not collapse into the same control style.
6. The metadata layout remains usable on mobile without horizontal scrolling.
7. The create-page refactor keeps page-level files under the 700-line guardrail.
8. New sections and non-obvious helpers touched for this UI include short purpose comments.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| custom local CSS modules | create metadata cards, chips, suggestion controls | preserve existing admin patterns; no new external registry |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-08
