# Agent Guidelines: UI Implementation

Detaillierte Regeln für Agenten bei UI-Aufgaben. Werden nur bei visuellen Implementierungsaufgaben angewendet.

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
