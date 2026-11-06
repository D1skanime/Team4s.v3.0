---
phase: quick-261106-jco
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/lib/storybookBildKatalog.test.ts
  - frontend/src/components/showcases/BildKatalogShowcase.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Der Katalog-Eintrag ANIME_COVER_BILD und STORYBOOK_BILD_KATALOG sind durch einen Test gegen Regression an Feldwerten/Länge abgesichert"
    - "Die gerenderte BildKatalogShowcase zeigt genau ein Bild mit korrektem src/alt und den Typnamen genau einmal, ohne Überschrift und ohne den entfernten Entwicklertext"
    - "Die Story-Meta von BildKatalogShowcase hat weiterhin table.disable=true für den eintrag-Prop und den Titel 'Bilder/Anime-Cover'"
  artifacts:
    - path: "frontend/src/lib/storybookBildKatalog.test.ts"
      provides: "Verhaltens-Tests für den Bild-Katalog (Datenmodul)"
    - path: "frontend/src/components/showcases/BildKatalogShowcase.test.tsx"
      provides: "Verhaltens-Tests für Komponente und Story-Meta von Bilder/Anime-Cover, inkl. Regressionsschutz gegen die drei behobenen Live-UAT-Befunde"
  key_links:
    - from: "frontend/src/components/showcases/BildKatalogShowcase.test.tsx"
      to: "frontend/src/components/showcases/BildKatalogShowcase.tsx"
      via: "render() aus @testing-library/react"
      pattern: "render\\(<BildKatalogShowcase"
    - from: "frontend/src/components/showcases/BildKatalogShowcase.test.tsx"
      to: "frontend/src/components/showcases/BildKatalogShowcase.stories.tsx"
      via: "direkter Import des default-Exports meta"
      pattern: "import meta from '\\./BildKatalogShowcase\\.stories'"
---

<objective>
Tests für das bereits per Live-UAT freigegebene Verhalten der Storybook-Kategorie
"Bilder/Anime-Cover" nachziehen -- sowohl für das Katalog-Datenmodul
(`storybookBildKatalog.ts`) als auch für die Showcase-Komponente und deren Story-Meta
(`BildKatalogShowcase.tsx` / `BildKatalogShowcase.stories.tsx`).

Purpose: Diese drei Produktdateien sind bereits live abgenommen (inkl. Nachbesserung aus
261106-i7g: SectionHeader entfernt, `argTypes.eintrag.table.disable` ergänzt). Die bindende
REIHENFOLGE-Vorgabe des Menschen verlangt, dass Tests für dieses Verhalten erst NACH der
Freigabe nachgezogen werden -- genau das leistet dieser Auftrag, ohne eine einzige Zeile
Produktcode zu ändern.

Output: Zwei neue Testdateien, die das freigegebene Verhalten fixieren und speziell gegen die
drei in 261106-i7g behobenen UAT-Befunde (doppelter Titel, Entwicklertext, Steuerungstabelle)
regressionssichern.

**Offener Punkt (keine Produktänderung in diesem Auftrag):** Keiner festgestellt -- alle drei
zu testenden Dateien (`storybookBildKatalog.ts`, `BildKatalogShowcase.tsx`,
`BildKatalogShowcase.stories.tsx`) sind bereits ohne jede Änderung vollständig testbar (reine
Exportwerte, reine Funktionskomponente, reines Meta-Objekt). Falls beim Ausführen doch eine
Lücke auffällt, die nur durch eine Produktcode-Änderung testbar würde, wird das hier als Hinweis
vermerkt statt die Änderung vorzunehmen: aktuell nicht der Fall.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md

<!-- Vorbild-Testmuster: render() + echte DOM-Abfragen, keine Snapshots, keine Klicks -->
@frontend/src/components/showcases/EffectsShowcase.test.tsx

<!-- Zu testende Produktdateien (byte-genau unverändert lassen) -->
@frontend/src/lib/storybookBildKatalog.ts
@frontend/src/components/showcases/BildKatalogShowcase.tsx
@frontend/src/components/showcases/BildKatalogShowcase.stories.tsx
@frontend/src/components/showcases/BildKatalogShowcase.module.css

<interfaces>
<!-- Vollständiger Inhalt der drei zu testenden Dateien liegt bereits oben unter <context> --
    keine weitere Codebase-Exploration nötig. Exporte zur direkten Verwendung in den Tests: -->

Aus `frontend/src/lib/storybookBildKatalog.ts`:
```typescript
export interface StorybookBildEintrag {
  id: string
  bezeichnung: string
  pfad: string
  altText: string
}
export const ANIME_COVER_BILD: StorybookBildEintrag
export const STORYBOOK_BILD_KATALOG: readonly StorybookBildEintrag[]
```

Aus `frontend/src/components/showcases/BildKatalogShowcase.tsx`:
```tsx
export function BildKatalogShowcase({ eintrag }: { eintrag: StorybookBildEintrag }): JSX.Element
```
Rendert `<figure><img src={eintrag.pfad} alt={eintrag.altText} /><figcaption><Text variant="strong">{eintrag.bezeichnung}</Text></figcaption></figure>`.
Kein `SectionHeader`, keine Überschrift, kein Einleitungssatz.

Aus `frontend/src/components/showcases/BildKatalogShowcase.stories.tsx`:
```tsx
const meta = {
  title: 'Bilder/Anime-Cover',
  component: BildKatalogShowcase,
  tags: ['autodocs'],
  argTypes: { eintrag: { table: { disable: true } } },
} satisfies Meta<typeof BildKatalogShowcase>
export default meta
export const Standard: Story  // args: { eintrag: ANIME_COVER_BILD }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Verhaltens-Tests für Bild-Katalog, Showcase-Komponente und Story-Meta anlegen</name>
  <files>frontend/src/lib/storybookBildKatalog.test.ts, frontend/src/components/showcases/BildKatalogShowcase.test.tsx</files>
  <behavior>
    Datei `storybookBildKatalog.test.ts`:
    - Test: `ANIME_COVER_BILD` hat exakt `id: 'anime-cover'`, `bezeichnung: 'Anime-Cover'`,
      `pfad: '/storybook-bilder/anime-cover-freezing.jpg'`; `altText` enthält den Teilstring
      `'Freezing'`.
    - Test: `STORYBOOK_BILD_KATALOG` hat `length === 1` und `STORYBOOK_BILD_KATALOG[0]` ist
      (Deep-Equal oder Referenzgleich) `ANIME_COVER_BILD`.

    Datei `BildKatalogShowcase.test.tsx` (`@vitest-environment jsdom` am Dateikopf, analog
    `EffectsShowcase.test.tsx`):
    - Test A (Render-Grundzustand): `render(<BildKatalogShowcase eintrag={ANIME_COVER_BILD} />)`
      -- genau ein `img`-Element im Container (`container.querySelectorAll('img')`, `length === 1`),
      dessen `src`-Attribut exakt `ANIME_COVER_BILD.pfad` und `alt`-Attribut exakt
      `ANIME_COVER_BILD.altText` ist (`getAttribute`, nicht nur `toBeInTheDocument`, da jsdom
      `src` sonst zur vollen URL normalisiert -- `getAttribute('src')` liefert den rohen Wert).
    - Test B (Regression doppelter Titel, Befund aus 261106-i7g): Der Text `'Anime-Cover'`
      erscheint im gerenderten Container GENAU EINMAL (`screen.getAllByText('Anime-Cover').length`
      `=== 1`).
    - Test C (Regression Entwickler-Einleitungssatz, Befund aus 261106-i7g):
      `container.textContent` enthält NICHT den Teilstring `'Rohes Beispielbild'`.
    - Test D (Regression wiederauftauchender SectionHeader): Es existiert kein Überschriften-Tag
      (`container.querySelector('h1, h2, h3, h4, h5, h6')` ist `null`).
    - Test E (Story-Meta, Befund aus 261106-i7g "Steuerungstabelle"): direkter Import
      `import meta from './BildKatalogShowcase.stories'` -- `meta.title === 'Bilder/Anime-Cover'`
      und `meta.argTypes?.eintrag?.table?.disable === true`.

    Keine Klick-/Maus-Simulation, kein Snapshot-Test. Deutsche `describe`/`it`-Beschreibungen mit
    korrekten Umlauten, fachlich formuliert (z. B. "zeigt den Typnamen nur einmal, nicht doppelt
    wie vor der Live-UAT-Nachbesserung" statt technischem Jargon wie "Mock"/"Fixture" im
    sichtbaren Testnamen).
  </behavior>
  <action>
    Beide Testdateien per Write-Tool neu anlegen (keine Produktdatei anfassen). Für die
    Komponenten-/Story-Tests `render`, `screen` aus `@testing-library/react` sowie `describe`,
    `expect`, `it` aus `vitest` importieren (Muster: `EffectsShowcase.test.tsx`). Für den
    Story-Meta-Import den relativen Pfad `./BildKatalogShowcase.stories` verwenden (kein
    Storybook-Testrunner nötig -- `meta` ist ein reines Objekt, das Vitest direkt auswerten kann).
    Alle Testnamen und Kommentare auf Deutsch mit korrekten Umlauten.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend npm run test -- storybookBildKatalog.test.ts BildKatalogShowcase.test.tsx catalogTaxonomy.test.ts</automated>
  </verify>
  <done>
    Beide neuen Testdateien existieren, alle Tests darin sind grün, der bestehende
    `catalogTaxonomy.test.ts` bleibt unverändert grün (keine Produktcode-Datei wurde angefasst),
    und `tsc --noEmit` sowie `eslint` auf den beiden neuen Dateien melden keine Fehler.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| keine neue | Reine Testdateien ohne Laufzeit-Eingabe von außen, kein neuer Trust-Boundary-Übergang. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick261106jco-01 | Tampering | Testdateien könnten versehentlich Produktcode mitändern | accept | Harte Vorgabe im Plan (`files_modified` enthält nur die zwei Testdateien), Verifikation per `git status`/Diff vor Commit, keine Produktdatei in `<files>` der Task gelistet. |
</threat_model>

<verification>
1. `docker compose exec -T team4sv30-frontend npm run test -- storybookBildKatalog.test.ts BildKatalogShowcase.test.tsx catalogTaxonomy.test.ts` -- alle Tests grün.
2. `docker compose exec -T team4sv30-frontend npm run typecheck` ODER gezielt `tsc --noEmit` -- keine neuen Typfehler durch die zwei neuen Dateien.
3. `docker compose exec -T team4sv30-frontend npx eslint src/lib/storybookBildKatalog.test.ts src/components/showcases/BildKatalogShowcase.test.tsx` -- keine Lint-Fehler.
4. `git status --short` zeigt ausschließlich die zwei neuen Testdateien (plus ggf. dieses PLAN/SUMMARY) als Änderung -- `storybookBildKatalog.ts`, `BildKatalogShowcase.tsx`, `BildKatalogShowcase.stories.tsx`, `BildKatalogShowcase.module.css` und das Bild bleiben unverändert.
</verification>

<success_criteria>
- Zwei neue Testdateien decken das vollständige, in `<behavior_to_test>` vorgegebene Verhalten ab (Katalog-Feldwerte, Katalog-Länge, Bild-Attribute, Einmaligkeit des Typnamens, Fehlen der Überschrift, Fehlen des Entwicklertexts, `argTypes.table.disable`, Story-Titel).
- Alle neuen und betroffenen Nachbar-Tests laufen grün, kein Produktcode wurde verändert.
- Testbeschreibungen sind Deutsch, fachlich, mit korrekten Umlauten.
</success_criteria>

<output>
Create `.planning/quick/261106-jco-tests-fuer-das-freigegebene-verhalten-de/261106-jco-SUMMARY.md` when done
</output>
