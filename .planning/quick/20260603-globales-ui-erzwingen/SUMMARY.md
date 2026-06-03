---
type: quick
slug: globales-ui-erzwingen
status: complete
completed: 2026-06-03
---

# Summary: Globale-UI-Nutzung erzwingen

## Umgesetzt

1. **CLAUDE.md** — neuer Conventions-Abschnitt „Frontend-UI (globales Design-System)":
   Pflicht zur Nutzung von `@/components/ui`; Verbot handgebauter nativer
   `<select>/<input>/<textarea>/<button>` für vorhandene Primitiv-Typen; explizit
   „closest-analog-Regel darf globales UI nicht überstimmen"; Verweis auf ESLint-Guard,
   UI-SPEC-Pflichtconstraint und `/dev/ui-system`. Wird von Planner/Executor/UI-Researcher
   gelesen → primärer Verhaltens-Hebel.
2. **frontend/eslint.config.mjs** — `no-restricted-syntax`-Guard (JSX `<select>`,
   `<input>`, `<textarea>`) mit deutschen Hinweis-Messages; Override-Ausnahme für
   `src/components/ui/**`.

## Entscheidung: warn statt error (begründet)
Bestandsaufnahme ergab **~17 Altfälle** außerhalb `components/ui` (7× `<select>`, 8× `<input>`,
2× `<textarea>`). Ein `error`-Level hätte Lint/Build sofort gebrochen — auch für die parallel
auf `main` laufende Session. Regel startet daher als **`warn`** (sichtbar in Lint-Ausgabe,
nicht-brechend). **Promotion auf `error`** nach Migration der Altfälle in der UI-Phase
(siehe Todo `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md`).

## Verifikation
- `npx eslint src/components/contributions/ProposalForm.tsx` → 5 warnings, **0 errors, exit 0**
  (Regel feuert, bricht nichts).
- `npx eslint src/components/ui/Select.tsx` → keine `no-restricted-syntax`-Meldung
  (Ausnahme greift).

## Git-Disziplin
Nur eigene Dateien per expliziten Pfad gestaged (kein `git add -A`); kein `git stash`/`reset`;
parallele uncommittete Fremdänderungen (Phase 66) unangetastet.
