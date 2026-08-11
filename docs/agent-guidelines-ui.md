# Agent Guidelines: UI Implementation

Detaillierte Regeln für Agenten bei UI-Aufgaben. Werden nur bei visuellen Implementierungsaufgaben angewendet.

---

## Before Coding UI

Before implementing a new UI surface or editing an existing persisted-data UI:

1. Read `docs/engineering/implementation-contract.md`.
2. Read `docs/frontend/ui-system.md`.
3. Inspect `frontend/src/components/ui` for existing global components.
4. Inspect nearby pages/components for the current local composition pattern.
5. Map every API/DB-backed field to a semantic control before writing code.
6. Reuse or extend existing global components before adding page-local styles.
7. Keep loading, error, and empty states scoped to the entity being edited or displayed.
8. If the UI depends on API response shape or status behavior, read `docs/api/api-contracts.md` and the relevant frontend API helper before coding.
9. Classify every responsive layout decision as either page/app-shell or reusable/embedded before choosing a viewport or container query, following `docs/frontend/ui-system.md`.
10. Record the minimum viable geometry for every larger composition, including columns, gaps, controls, media, and longest required content. Name transitions by purpose or geometry, never by device.
11. Inspect the actual flex, grid, media, or text owner of overflow before adding wrapping, clipping, or scrolling.
12. Apply the incremental adoption boundary: new UI complies; touched existing components are modernized only when responsive behavior is in scope or demonstrably problematic; stable legacy UI is not migrated wholesale.

Required field mapping:

| Field meaning | Required control direction |
|---------------|----------------------------|
| year | year picker or constrained year control |
| date/datetime | date or datetime control |
| enum/status | select, segmented control, radio group, or badge/action pattern |
| boolean | switch or checkbox |
| relation id | select/combobox with readable labels |
| media asset | existing media component and domain-specific media API |
| number | constrained number input, stepper, slider, or select |
| free text | input or textarea only when the value is genuinely free-form |

Do not ship minimalist placeholder UI for real persisted data. If the proper semantic control does not exist, either reuse an existing project pattern or add the smallest shared primitive that fits the global UI system.

---

## Responsive Implementation and Verification

Implementation follows the responsive ownership defined in `docs/frontend/ui-system.md`:

- Use mobile-first base styles.
- Use viewport queries only for page or app-shell composition.
- For reusable or embedded components, establish a suitable containment boundary with `container-type: inline-size` and query the component's available inline size. Use a purpose-based `container-name` when it improves clarity.
- Activate a larger composition only at its recorded minimum viable geometry. Do not use device lists or universal pixel breakpoints.
- Protect shrinking flex/grid children with `min-width: 0` and potentially oversized media with `max-width: 100%` where applicable.
- Fix overflow locally at its owner. Do not normalize a global `overflow-wrap: anywhere` workaround.

For every changed UI, verification evidence must cover:

1. A narrow size.
2. An intermediate size.
3. The exact transition boundary, immediately below and above when practical.
4. A wide size.
5. Realistic long German labels and text with correct umlauts.
6. Browser zoom high enough to expose reflow, overlap, and clipping faults.
7. An explicit assertion or live inspection that the document has no horizontal overflow.
8. For reusable components, nested or embedded rendering that proves behavior follows container width rather than viewport assumptions.

Focused CSS/component tests and headless checks may support this evidence. When user-facing flow, navigation, discoverability, or product fit matters, retain the live-browser review required by `AGENTS.md`; headless checks do not replace it.

---

## Screenshot-to-UI Rules

When implementing from a screenshot:

1. Treat the screenshot as the target, not as loose inspiration.
2. First extract a visual design specification:
   - layout
   - card structure
   - colors
   - spacing
   - typography
   - borders, radius, shadows
   - buttons and badges
3. Then implement against that specification.
4. Do not freely redesign unless explicitly asked.
5. Do not add visible UI elements not present in the target unless required by existing data or accessibility.
6. If possible, compare the result visually and list deviations.

---

## Formatting and Diff Rules

- Keep diffs small and scoped.
- Do not run broad formatting commands on large dirty files unless explicitly requested.
- If a file already has unrelated formatting changes, avoid `prettier --write` on the entire file.
- Prefer targeted edits.
- Do not include unrelated refactors.
- If existing unrelated warnings/errors appear, document them separately.
