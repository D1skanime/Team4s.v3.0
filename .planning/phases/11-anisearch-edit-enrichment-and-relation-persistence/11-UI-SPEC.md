---
phase: 11
slug: anisearch-edit-enrichment-and-relation-persistence
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-09
---

# Phase 11 - UI Design Contract

> Visual and interaction contract for AniSearch edit enrichment and create-time relation persistence. Generated before planning so the implementation extends the existing admin editor without resetting its visual language.

---

## Purpose

Phase 11 adds an explicit AniSearch enrichment tool to the existing edit route and makes resolved AniSearch relations durable during create. The UI work is primarily on `/admin/anime/[id]/edit`; create-route relation persistence stays mostly invisible unless the operator needs status feedback.

The phase must feel like a continuation of the current admin studio:

- card-based edit workspace, not a new intake flow
- explicit operator-controlled enrichment, never background auto-overwrite
- visible but compact protection controls for fields that should not be overwritten
- soft-fail relation persistence and enrichment messaging that does not destabilize the page
- no redesign of the surrounding header, save flow, Jellyfin panel, or developer panel

This contract preserves the current custom CSS-module system and the established orange-accent admin surface.

---

## Scope

This contract applies to:

- the AniSearch entry point inside the edit workspace
- the placement and behavior of AniSearch load actions
- field-protection affordances for AniSearch overwrite mode
- success, warning, and error messaging after enrichment
- relation feedback tied to AniSearch loads
- create-route messaging for persisted AniSearch relations when an enriched draft is saved

This contract does not cover:

- free AniSearch search or browse UX
- a redesign of the create page beyond replacing the disabled `AniSearch spaeter` state in a later implementation step
- a redesign of the existing relation editor card
- public-facing source attribution or relation display
- new admin design tokens or external component libraries

---

## Locked Product Decisions

These come from [11-CONTEXT.md](/C:/Users/admin/Documents/Team4s/.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-CONTEXT.md) and the phase prompt and are fixed for planning:

- Edit-route AniSearch uses override mode.
- Locked fields are never overwritten by AniSearch.
- AniSearch changes land in draft state first; the operator still saves explicitly.
- Manual changes made after an AniSearch load remain authoritative until the operator intentionally unlocks and reloads.
- Provisional lookup text typed only to find a source candidate is not protected manual content; once AniSearch enrichment is loaded, the AniSearch title replaces that provisional text unless the field is locked afterwards.
- Relations resolved from AniSearch during edit are auto-applied when enrichment succeeds.
- Existing relations are not duplicated.
- Unresolvable relations are skipped silently and never block normal save.
- Relation matching keeps `anisearch:{id}` lookup first, then title fallback.
- The edit route already has a structured card-based workspace and a developer panel; both remain.
- The admin surface must keep its current design language rather than being redesigned from scratch.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | existing app primitives only; no new icon dependency required |
| Font | existing admin font stack |

Implementation must preserve the existing admin CSS-module approach and align with [AdminStudio.module.css](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/AdminStudio.module.css), [AnimeEditWorkspace.module.css](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.module.css), and existing edit/create card patterns in [AnimeEditWorkspace.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx) and [ManualCreateWorkspace.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx).

---

## Layout Contract

### AniSearch Placement

The AniSearch controls belong inside the edit workspace, not in the page header and not inside the developer panel.

Required placement:

1. insert a dedicated `AniSearch` section card after `Basisdaten`
2. keep it above `Titel und Struktur` so overwrite expectations are established before the operator reviews downstream title fields
3. keep the existing developer panel as a separate late-page section for raw request and response inspection

The AniSearch card should share the same shell family as the existing edit cards:

- white or near-white surface
- subtle neutral border
- 12px to 14px radius
- 18px to 24px interior padding
- 16px to 20px content gaps

### AniSearch Card Structure

Desktop and tablet structure:

- top row: section title, short overwrite summary, current load state
- middle row: AniSearch ID input plus primary action button
- lower area: field-protection controls and result summary

The protection controls and result summary may stack vertically, but they must stay in the same card so the operator reads "load, protect, review" as one action cluster.

### Relation Placement

Do not create a second relation card for AniSearch. Reuse the existing relation workspace and reflect AniSearch-applied results through status copy inside the AniSearch card, while persisted relations continue to appear in the existing relations section once the anime data refreshes.

### Create Route Touchpoint

The current disabled `AniSearch spaeter` button on the create page stays part of the broader AniSearch affordance family. When Phase 11 implementation touches create messaging, it should:

- keep the button in the existing title action area
- preserve current button hierarchy
- avoid introducing a new full-width AniSearch panel on create

---

## Interaction Contract

### AniSearch Entry

Edit-route AniSearch remains explicit and ID-driven:

1. operator enters an AniSearch ID
2. operator clicks the primary action
3. the draft updates from AniSearch
4. locked fields remain unchanged
5. resolved relations apply automatically on success
6. operator still clicks the existing save action to persist draft metadata changes

No auto-load on blur, paste, or page open.

### Field Protection Model

Protection is a compact checklist inside the AniSearch card, not a per-field redesign across the whole editor.

Required behavior:

- include only fields that AniSearch can materially overwrite in this phase: `Titel`, `Titel DE`, `Titel EN`, `Jahr`, `Max. Episoden`, `Beschreibung`, and `Genres` if those are part of the actual backend payload
- each item uses a standard checkbox or toggle-row control with label plus one-line helper
- unchecked means AniSearch may overwrite
- checked means protect from overwrite
- lock state persists for the current edit session and remains visible before each load

The control language must make override mode obvious. Avoid ambiguous terms like `sync` or `merge`.

### Provisional Text Rule

If the title field currently contains provisional lookup text used only to identify a source candidate, the first successful AniSearch load should replace it with the AniSearch title unless the operator explicitly protected the title before loading.

The UI should communicate this with helper copy in the AniSearch card, not with a blocking modal.

### Post-Load Review

After a successful load, the AniSearch card shows a compact summary block with:

- loaded AniSearch ID
- count of updated fields
- count of protected fields skipped
- count of locally resolved relations applied

Do not list unresolved relations. They are intentionally silent.

### Save Relationship

AniSearch loading never replaces the existing save bar semantics:

- enrichment success updates draft state only
- the save bar remains the only metadata persistence action
- the save bar copy should not change color or hierarchy because AniSearch was loaded

### Failure Behavior

AniSearch errors are non-destructive:

- keep current draft values unchanged
- preserve current lock selections
- show error copy inside the AniSearch card and, if needed, via the existing page-level error box only for request-level failures that matter across the page
- never disable manual editing after a failed load

### Relation Persistence Feedback

Edit route:

- show relation success only as a count in the AniSearch result summary
- if zero relations resolved, do not frame that as failure

Create route:

- after saving an enriched draft, relation persistence feedback should be folded into the existing success messaging
- unresolved relations remain silent
- relation-persistence failure must not block anime creation if the core create succeeds, but should surface as a warning-level note when technically possible

---

## Spacing Scale

Declared values must stay inside the existing admin rhythm:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline icon or status separation |
| sm | 8px | Compact helper and checkbox gaps |
| md | 16px | Standard field and action spacing |
| lg | 24px | Card internals and section padding |
| xl | 32px | Vertical spacing between major edit sections |
| 2xl | 48px | Page-level section breaks already used by the route shell |
| 3xl | 64px | Not introduced in this phase |

Exceptions:

- interactive inputs and buttons remain at the established 44px minimum touch height from the current admin form controls
- compact lock rows may use 12px internal padding if they keep the 44px tap target

Additional rules:

- AniSearch input and primary action should sit in one row on desktop if space permits
- on narrower widths, the action stacks below the input before any horizontal overflow appears
- result summary items should use 8px to 12px internal gaps and 12px to 16px card-to-card separation

---

## Typography

Use the existing admin type scale already visible in the edit route:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 14px | 500 | 1.4 |
| Heading | 20px | 600 | 1.3 |
| Display | 28px | 700 | 1.2 |

Typography rules:

- all new helper and status copy should align with the current `sectionMeta`, `helperText`, and field-label hierarchy
- no new display tier beyond the existing page title
- lock-row labels use standard label weight, not heading weight
- result-summary numbers may use semibold emphasis but must not read like badges

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` | Base page and card surfaces |
| Secondary (30%) | `#f9f9f9`, `#e1e1e6`, `#6b6b70` | Secondary panels, borders, helper text, muted states |
| Accent (10%) | `#ff6a3d` | Primary load action, focused inputs, active protection controls, positive AniSearch emphasis |
| Destructive | `#dc3545` | Relation delete, destructive warnings, hard errors only |

Accent reserved for:

- the primary `AniSearch laden` action
- input focus state on AniSearch controls
- selected or active protection controls
- active summary emphasis when a load succeeded

Accent must not be used for:

- entire card backgrounds
- passive helper text
- general success boxes that already use the route's existing success treatment
- unresolved-relation messaging, because unresolved relations stay silent

---

## Copywriting Contract

All operator-facing copy remains German and should match the concise tone already used in admin.

| Element | Copy |
|---------|------|
| AniSearch card title | `AniSearch Enrichment` |
| AniSearch card meta | `AniSearch ueberschreibt bestehende Werte, ausser du schuetzt Felder vor dem Laden.` |
| AniSearch ID label | `AniSearch ID` |
| AniSearch ID placeholder | `z. B. 12345` |
| Primary CTA | `AniSearch laden` |
| Protection group label | `Felder schuetzen` |
| Provisional-title helper | `Vorlaeufiger Suchtext gilt nicht als geschuetzter Titel. Nach dem Laden wird der AniSearch-Titel uebernommen, bis du das Feld bewusst schuetzt.` |
| Empty state heading | `Noch keine AniSearch-Daten geladen.` |
| Empty state body | `Trage eine AniSearch ID ein und lade die Daten, um den Entwurf gezielt zu aktualisieren.` |
| Success summary | `AniSearch geladen. {fieldCount} Felder aktualisiert, {lockedCount} geschuetzt, {relationCount} Relationen uebernommen.` |
| Zero-relation summary | `AniSearch geladen. Keine lokale Relation uebernommen.` |
| Error state | `AniSearch konnte nicht geladen werden. Pruefe die ID oder versuche es spaeter erneut. Dein aktueller Entwurf bleibt unveraendert.` |
| Create success note | `AniSearch-Relationen wurden beim Erstellen mitgespeichert, soweit sie lokal zugeordnet werden konnten.` |
| Destructive confirmation | `Relation loeschen`: `Relation wirklich loeschen?` |

Copy rules:

- use `laden`, not `importieren`, because the operator still saves explicitly afterwards
- use `schuetzen` consistently for lock semantics
- avoid `automatisch aktualisiert` wording that implies background persistence
- relation persistence copy should describe local resolution, not external sync confidence

---

## Component Contract

Preferred implementation pieces:

- one dedicated AniSearch section component inside the edit workspace
- one small helper module for protection state and load-result formatting if needed
- reuse existing `styles.card`, `styles.input`, `styles.buttonPrimary`, `styles.buttonSecondary`, and existing workspace grid primitives where possible

Do not:

- add the full AniSearch UI inline to the page-level route component
- move raw request and response details into the operator-facing AniSearch card
- build a second standalone relation-management surface for AniSearch results

The existing relation card in [AnimeRelationsSection.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx) remains the canonical manual relation editor.

---

## Responsive And Accessibility Contract

### Responsive Rules

Desktop:

- AniSearch ID input and primary action share one row
- protection controls may render as a two-column checklist if labels remain readable

Tablet:

- input row may stay horizontal if the button label does not wrap awkwardly
- summary metrics may wrap to multiple lines without truncation

Mobile:

- AniSearch input, action, protection controls, and summary stack to one column
- no horizontal scrolling inside cards
- lock controls must remain finger-tappable at 44px minimum height

### Accessibility

Required baseline:

- real label on the AniSearch ID field
- protection controls grouped in a fieldset with a visible legend
- status summary exposed in a live region after load completes
- loading action announces busy state on the trigger button
- helper text linked to the AniSearch ID field when it explains provisional-title behavior

Recommended labels:

- summary live region: `AniSearch Ergebnis`
- protection fieldset legend: `Felder schuetzen`

### Error Treatment

- inline AniSearch error is non-blocking and lives inside the AniSearch card
- page-level error box is reserved for broader route-impacting failures
- warning-style relation notes on create must use neutral or warning treatment, not destructive red, unless the API reports a true failure state

---

## Acceptance Gates For Implementation

The implemented UI must satisfy all of these:

1. `/admin/anime/[id]/edit` shows a dedicated AniSearch section in the existing card-based workspace.
2. AniSearch is loaded only from an explicit AniSearch ID and explicit click.
3. The AniSearch card clearly communicates overwrite mode and field-protection behavior before loading.
4. Locked fields remain unchanged on AniSearch load.
5. Provisional lookup text is replacable by AniSearch until the operator explicitly protects the field.
6. Success feedback reports updated-field, protected-field, and relation counts without listing unresolved relations.
7. AniSearch failures do not wipe the draft or block manual editing.
8. Existing relations remain editable through the current relation card and are not duplicated by AniSearch auto-apply behavior.
9. The current developer panel remains available for raw request and response inspection.
10. No touched page-level component exceeds the 700-line guardrail from the phase context.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| custom local CSS modules | existing admin cards, buttons, inputs, relation details panel | current local system preserved; no external registry introduced - 2026-04-09 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
