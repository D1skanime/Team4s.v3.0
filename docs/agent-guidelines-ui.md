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
