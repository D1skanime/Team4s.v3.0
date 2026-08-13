---
phase: 04
slug: provenance-assets-and-safe-resync
status: approved
shadcn_initialized: false
preset: none
created: 2026-03-31
---

# Phase 04 - UI Design Contract

> Visual and interaction contract for the persisted Jellyfin maintenance flow on `/admin/anime/[id]/edit`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | existing CSS modules + app-local primitives |
| Icon library | none required |
| Font | existing admin stack |

### Design Direction

The screen stays inside the existing Team4s admin shell and does not introduce a new visual language. Phase 04 should make the edit route feel more operational and trustworthy, not more decorative.

The visual hierarchy for the page is fixed:

1. Page header with anime identity and global success/error feedback
2. Jellyfin provenance and metadata resync section
3. Shared anime metadata editor
4. Jellyfin season-sync panel
5. Developer details panel

The provenance section is the new decision surface. It should read as an operator console, not as a marketing card stack.

---

## Layout Contract

### Page Structure

- The existing single-column page flow stays intact.
- `AnimeJellyfinMetadataSection` sits directly above `AnimeEditWorkspace`.
- The lightweight `Jellyfin-Kontext` notice under the provenance section is redundant once the provenance section exposes the same identity clearly; Phase 04 should remove or absorb that duplicate summary instead of showing the same source information twice.
- `JellyfinSyncPanel` remains visually separate from metadata resync. Episode sync and metadata resync must not be merged into one combined action area.

### Section Semantics

- Provenance section:
  - purpose: answer "what is linked, what is protected, what can safely refresh?"
  - default state: readable without running preview
- Metadata preview section:
  - purpose: compare current values with incoming Jellyfin values before apply
  - only appears after a preview request
- Asset provenance section:
  - purpose: manage slot ownership and slot actions for `cover`, `banner`, `backgrounds`
  - always scoped per slot, never as a gallery manager

### Responsive Behavior

- Desktop:
  - provenance summary fields and asset cards may use 2-column grids
  - preview diff cards may use 2-column layout
- Mobile:
  - all cards collapse to a single column
  - action rows wrap instead of shrinking buttons below readable size
  - long Jellyfin path values must wrap safely instead of overflowing

---

## Spacing Scale

Declared values must follow the existing admin rhythm and stay multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline badge gaps, tiny label offsets |
| sm | 8px | Compact field spacing, checkbox spacing |
| md | 16px | Default card content spacing |
| lg | 24px | Section/card padding |
| xl | 32px | Gaps between major cards |
| 2xl | 48px | Page-level separation after header |
| 3xl | 64px | Not required in this phase |

Exceptions: none

### Spacing Rules

- Every operator card uses one dominant internal rhythm. Do not mix dense 8px stacks with loose 24px gaps inside the same card.
- Badges, helper copy, and actions should read as grouped clusters:
  - badge row -> `xs`/`sm`
  - helper text below state -> `sm`
  - action row below helper -> `md`
- Preview diff cards and asset cards should have the same outer padding so the section reads as one system.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.4 |
| Heading | 18px | 700 | 1.3 |
| Display | 28px | 700 | 1.2 |

### Typography Rules

- German operator copy should stay short and concrete.
- Field labels in the admin editor should be normalized to German over time; the provenance slice must not introduce new English labels.
- Long explanatory text belongs in helper paragraphs, not in headings or buttons.
- Paths, source tags, and IDs should render in a visually quieter style than the section title so the page does not feel like raw debug output.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | existing admin neutral surface | Page background, card background |
| Secondary (30%) | existing muted neutral/outline palette | Disabled fields, helper surfaces, passive badges |
| Accent (10%) | existing success/warning/info badge palette | Linked state, protected state, actionable preview state |
| Destructive | existing admin danger red | Remove actions only |

Accent reserved for:
- linked Jellyfin state
- "preview available" / "changes available"
- protected/manual ownership cues
- provider slot availability cues

Do not use accent styling for every button. Primary/secondary/danger hierarchy from the current admin shell remains the base contract.

### Tone Mapping

- `manual/protected`: warning-like accent, because it signals "handle carefully", not failure
- `provider/refreshable`: success/info accent, because it signals "safe to update explicitly"
- `unavailable/none`: muted tone
- `remove`: destructive only on the actual destructive button, not on the entire card

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Preview anwenden` |
| Preview trigger | `Metadaten-Preview laden` |
| Empty state heading | `Kein Jellyfin-Link aktiv` |
| Empty state body | `Dieser Anime wird aktuell manuell gepflegt. Ohne persistierten Jellyfin-Link stehen hier keine Provider-Aktionen zur Verfuegung.` |
| Error state | `Aktion fehlgeschlagen. Bitte Meldung pruefen und den Schritt gezielt wiederholen.` |
| Destructive confirmation | `Asset entfernen`: `Das Asset wird aus dem persistierten Slot entfernt. Wenn kein manuelles Asset mehr aktiv ist, darf Jellyfin fuer diesen Slot wieder als Fallback dienen.` |

### Copy Rules

- All user-facing admin copy stays in German.
- Prefer operational phrasing:
  - good: `Manuelles Cover bleibt geschuetzt`
  - bad: `Cover sync state updated`
- Avoid vague "provider-only" wording without consequence. Every protected or missing state should answer:
  - what is active now?
  - what is blocked?
  - what can the operator do next?
- Distinguish clearly between:
  - `Preview laden`
  - `Preview anwenden`
  - `hochladen`
  - `entfernen`

---

## Interaction Contract

### Provenance Summary

The first visible Jellyfin block must expose these facts without any preview call:

- linked vs manual
- source kind
- Jellyfin series identity
- folder/path identity
- currently active cover ownership
- available provider asset families

This block should feel scan-friendly. The operator should understand the record state in under 10 seconds.

### Metadata Preview

- Preview is explicit. No auto-preview on page load.
- Preview result must show:
  - fillable fields
  - protected fields
  - no-op fields
- Diff cards must label current and incoming values clearly.
- If there are no field diffs, the UI must still explain that slot actions for banner/backgrounds remain available below.

### Apply Rules

- `Preview anwenden` stays disabled until at least one field or asset action is selected/applicable.
- Cover, banner, and backgrounds use explicit opt-in controls in the preview area.
- Apply result should not leave stale preview state visible; the section resets to fresh persisted context after success.

### Asset Slot Actions

- `cover`, `banner`, and `backgrounds` each need:
  - current persisted state
  - ownership label
  - open/view action when a persisted asset exists
  - upload action
  - remove action when a persisted asset exists
- `background_video` is visible only as provider context, not as a local persistence action.
- `logo` may be visible as provider availability, but it must not imply local persistence support in this phase.

### Backgrounds

- Background list remains ordered and visibly numbered.
- Each background row must show:
  - preview
  - ownership
  - order/sort label
  - open action
  - remove action
- Manual backgrounds must visually communicate that later Jellyfin resync will not silently replace them.

### Busy and Feedback States

- Upload, preview, apply, and remove states must all surface local in-place feedback.
- Busy copy should state what is happening now, not just show a spinner.
- Success messages remain at page level through the existing success box pattern.
- Errors remain at page level through the existing error box pattern, but the triggering section should still keep enough local state so the operator can recover.

---

## Accessibility Contract

- All actionable controls must remain reachable by keyboard in DOM order.
- Hidden file inputs must always have a visible trigger button.
- Disabled actions must still be explained with adjacent helper copy.
- Long path/source values must be selectable or readable without hover-only affordances.
- Badge color must never be the only state signal; the text label must carry the meaning.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | existing local components only | not required |

No new registry imports are required for this phase. The contract assumes continued use of existing CSS modules, shared admin buttons, badges, and card patterns.

---

## File Targets

This UI-SPEC applies primarily to:

- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/utils/anime-editor-ownership.ts`
- related CSS module files under `frontend/src/app/admin/anime/components/AnimeEditPage/`

---

## Verification Notes

UI work for Phase 04 should prove these visible outcomes:

- a linked anime shows provenance without duplicated summary noise
- metadata preview states are clearly different from apply states
- manual vs provider ownership reads consistently across cover, banner, and backgrounds
- mobile layout keeps action rows readable and path text non-breaking
- German copy remains consistent across preview, apply, upload, remove, and blocked states

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-03-31
