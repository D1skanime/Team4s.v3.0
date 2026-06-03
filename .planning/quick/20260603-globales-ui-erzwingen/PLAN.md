---
type: quick
slug: globales-ui-erzwingen
created: 2026-06-03
---

# Quick: Globale-UI-Nutzung in künftigen Agent-Läufen erzwingen

## Ziel
Verhindern, dass Agents (Planner/Executor/UI-Researcher) handgebautes natives Markup
statt der globalen Primitives aus `@/components/ui` bauen — Konsequenz aus Phase 67
(Release-Version-Dropdown als natives `<select>`).

## Tasks
1. **CLAUDE.md** — Hartregel-Abschnitt „Frontend-UI (globales Design-System)" unter
   Conventions: Pflicht zur Nutzung von `@/components/ui`, Verbot von nativem
   `<select>/<input>/<textarea>/<button>` für vorhandene Primitiv-Typen, „closest-analog
   darf globales UI nicht überstimmen", Verweis auf ESLint-Guard + `/dev/ui-system`.
2. **frontend/eslint.config.mjs** — `no-restricted-syntax`-Guard (JSX `<select>/<input>/
   <textarea>`) als `warn`, mit Override-Ausnahme für `src/components/ui/**`.
   Start als `warn` (nicht `error`), da ~17 Altfälle bestehen → würde sonst Lint/Build
   für die parallele main-Session brechen. Promotion auf `error` nach Migration (UI-Phase).
