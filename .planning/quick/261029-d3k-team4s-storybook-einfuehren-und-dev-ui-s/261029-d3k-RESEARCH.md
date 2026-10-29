# Quick Task 261029-d3k: Storybook einführen, `/dev/ui-system` ablösen – Research

**Researched:** 2026-10-29
**Domain:** Storybook 10 + `@storybook/nextjs` (Webpack) in einem Docker-first Next.js-16/React-18-Monorepo
**Confidence:** MEDIUM (Kernpakete/Peer-Deps VERIFIED gegen npm-Registry; Konfig-Syntax CITED gegen offizielle Storybook-Docs; keine Konfiguration in diesem Repo tatsächlich ausgeführt/getestet)

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Bereits entschieden (bindend, nicht erneut diskutieren)
- Storybook ERSETZT `/dev/ui-system` komplett; die Route inkl. gesamtem Showcase-Code unter
  `frontend/src/app/dev/ui-system/` (und `frontend/src/app/admin/dev/ui-system/`) wird entfernt.
- Start mit den globalen Primitives aus `@/components/ui`; domänenspezifische Showcases werden
  1:1 migriert (Sichtbarkeit erhalten), ohne neue Zustands-Varianten zu erfinden.
- Paket-Wahl: `storybook@^10.6.5` + `@storybook/nextjs` (Webpack-Adapter, NICHT `nextjs-vite`),
  zusätzlich `@storybook/addon-themes`, `@storybook/addon-a11y`, `@storybook/addon-docs`.
  Essentials/Viewport/Actions/Controls sind in Storybook-10-Core bereits enthalten.
- Installation läuft NICHT auf dem Host, sondern über den Frontend-Container (`docker compose
  exec`/Rebuild-Zyklus), analog zu bestehenden npm-Scripts. `package-lock.json` wird im selben
  Commit mitgezogen.
- Kein eigenes Dark-Theme in `globals.css` vorhanden → Hell/Dunkel-Umschalter wird über die
  Storybook-eigene `backgrounds`/`addon-themes`-Vorschau realisiert (heller/dunkler
  Bühnenhintergrund), nicht über ein neu erfundenes Produkt-Farbthema.
- ALLE bisherigen `/dev/ui-system`-Inhalte (Primitives + domänenspezifische Showcases,
  Achievement-Badge-Galerie) werden migriert; Organisation in zwei Kategorien `UI/*` (volle
  Zustandsabdeckung) und `Showcases/*` (1:1-Übernahme).
- Storybook läuft im Frontend-Container, Port intern UND extern `6006`.
- `npm run build-storybook` wird als neues Script ergänzt und in die Root-Prüfungen
  aufgenommen, wo `lint`/`typecheck`/`test`/`build` für `frontend/` bereits laufen.
- `docs/frontend/ui-system.md` (fehlende Datei) und
  `frontend/scripts/capture-phase151-badge-evidence.mjs` (historisches Evidence-Skript gegen
  `/dev/ui-system/achievements`) bleiben außerhalb des Scopes — nur dokumentieren, nicht fixen.

### Claude's Discretion (bereits in CONTEXT.md ausgeübt, hier nur referenziert)
- Konkrete Docker-Prozess-Topologie für Port 6006 (eigener Service vs. Exec-Prozess) ist in
  CONTEXT.md NICHT abschließend festgelegt — siehe `## Open Questions` unten.

### Deferred Ideas (AUSSER SCOPE)
- Eigenes Produkt-Dark-Theme (neue `--color-*-dark`-Tokens, `data-theme`-Mechanismus).
- Interaction-Tests mit `@storybook/test`/`storybook/test` (veraltetes `@storybook/test@8.6.15`
  wird nicht benötigt, kein Scope hier).
- `docs/frontend/ui-system.md` anlegen; `capture-phase151-badge-evidence.mjs` reparieren.
</user_constraints>

## Summary

Die Paket- und Versionsentscheidung ist bereits getroffen und per npm-Registry-Check bestätigt
(`storybook`, `@storybook/nextjs`, `@storybook/addon-themes`, `@storybook/addon-a11y`,
`@storybook/addon-docs` alle `10.6.5`, alle aus `github.com/storybookjs/storybook`, ältester
Eintrag `storybook` seit 2016 — starkes Legitimitätssignal). Offen für die Planung sind primär
drei technische Fragen: (1) wie der Install-/Scaffold-Schritt ohne Host-npm und ohne das
unvorhersehbare `storybook init`-Wizard-Verhalten ablaufen soll, (2) wie Storybook als zweiter
Dev-Prozess neben dem bereits laufenden `npm run dev -- --webpack`-Containerprozess auf Port 6006
exponiert wird (CONTEXT.md legt nur den Port fest, nicht die Prozess-/Service-Topologie), und (3)
wie die Story-Dateien pro Primitive unter 450 Zeilen bleiben, ohne beim Aufteilen in die bekannte
Storybook-Falle "zwei Docs-Seiten mit demselben Namen" zu laufen.

**Primary recommendation:** Pakete manuell in `frontend/package.json` als `devDependencies`
eintragen (kein `npx storybook init`), per `docker compose exec team4sv30-frontend npm install`
in den laufenden Dev-Container installieren (Bind-Mount hält `package.json`/`package-lock.json`
synchron zum Host), `.storybook/main.ts`+`preview.tsx` von Hand schreiben, und Storybook als
zusätzlichen Compose-Service (gleiche Build-Context/gleiches Image wie `team4sv30-frontend`,
eigener `command: npm run storybook`, `ports: ["6006:6006"]`) statt als zweiten Prozess im
bestehenden Frontend-Container laufen lassen.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Storybook-Dev-Server (Port 6006) | Lokales Dev-Tooling (Docker-Container, nicht Produktionspfad) | — | Reiner Entwicklungs-/Dokumentationsdienst, liefert keine Produkt-Requests, läuft nie im `runner`-Stage-Image |
| Story-Build (`build-storybook`) | CI/Root-Prüfungsskripte | Dev-Tooling | Statischer Build als Qualitäts-Gate, kein Laufzeitpfad der App |
| Design-Tokens/`globals.css` | Browser/Client (CSS) | Storybook-Preview (konsumiert dieselbe Datei) | Storybook importiert die bestehende Quelle, erzeugt keine zweite Token-Quelle |
| `/dev/ui-system`-Route (bisher) | Frontend-Server (Next.js App Router) | — | Wird komplett entfernt, Verantwortung wandert vollständig zu Storybook |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `storybook` | `10.6.5` [VERIFIED: npm registry, offizieller Storybook-Monorepo-Release] | CLI, Core-Runtime, Viewport/Backgrounds/Controls/Actions (im Core enthalten) | Aktuelle stabile Major-Version zum Rechercheze itpunkt |
| `@storybook/nextjs` | `10.6.5` | Framework-Adapter für Next.js mit Webpack-Builder; automatisches `next/image`, `next/font`, tsconfig-Pfadalias-Handling | Offiziell von storybookjs gepflegter Next.js-Adapter |
| `@storybook/addon-themes` | `10.6.5` | Theme-/Hintergrund-Umschalter-Decorator (`withThemeByClassName`/`withThemeByDataAttribute`) | Offizielles Addon für Hell/Dunkel-Toggle |
| `@storybook/addon-a11y` | `10.6.5` | A11y-Panel (axe-core) pro Story, deckt Fokus-/Kontrast-Zustandsprüfung ab | Offizielles Addon, Standard für A11y-Checks in Storybook |
| `@storybook/addon-docs` | `10.6.5` | Autodocs-Seiten pro Komponente | Offizielles Addon für generierte Doku |

**Installation (im laufenden Dev-Container, NICHT auf dem Host):**
```bash
docker compose exec team4sv30-frontend npm install \
  --save-dev \
  storybook@^10.6.5 \
  @storybook/nextjs@^10.6.5 \
  @storybook/addon-themes@^10.6.5 \
  @storybook/addon-a11y@^10.6.5 \
  @storybook/addon-docs@^10.6.5
```
`frontend:/app` ist per `docker-compose.override.yml` ein Bind-Mount — Änderungen an
`package.json`/`package-lock.json` innerhalb des Containers erscheinen sofort auf dem Host und
können direkt committet werden. `node_modules` liegt im benannten Volume `frontend_node_modules`
(nicht im Bind-Mount), daher ist der Container-`npm install`-Schritt verpflichtend, ein reiner
Host-Edit von `package.json` würde `node_modules` nicht aktualisieren.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manuelles Config-Schreiben | `npx storybook@10.6.5 init` | Init-Wizard ist interaktiv, legt eigene Beispiel-Stories unter `src/stories/` an (müssten wieder gelöscht werden) und wählt bei Next.js-Projekten in neueren Major-Versionen tendenziell den Vite-Builder als Default [ASSUMED — nicht in dieser Session gegen die exakte 10.6.5-CLI verifiziert], was der bereits gesperrten Webpack-Entscheidung widerspräche. Manuelles Schreiben ist vorhersehbarer und passt zu den expliziten, handgebauten Konventionen des Projekts. |

## Package Legitimacy Audit

`slopcheck` konnte in dieser Umgebung nicht installiert werden (`pip`/`pip3` ist auf diesem
Host nicht vorhanden). Ersatzprüfung manuell via `npm view <pkg> repository.url time.created`:

| Package | Registry | Age (laut `time.created`) | Source Repo | slopcheck | Disposition |
|---------|----------|---------------------------|--------------|-----------|-------------|
| `storybook` | npm | seit 2016-04-04 | github.com/storybookjs/storybook | nicht verfügbar | Approved — hohe Reputation, alle 5 Pakete selbes Repo |
| `@storybook/nextjs` | npm | seit 2022-10-21 | github.com/storybookjs/storybook | nicht verfügbar | Approved |
| `@storybook/addon-themes` | npm | seit 2023-07-26 | github.com/storybookjs/storybook | nicht verfügbar | Approved |
| `@storybook/addon-a11y` | npm | seit 2017-11-16 | github.com/storybookjs/storybook | nicht verfügbar | Approved |
| `@storybook/addon-docs` | npm | seit 2019-04-29 | github.com/storybookjs/storybook | nicht verfügbar | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none (Tool nicht verfügbar — siehe unten)
**Packages flagged as suspicious [SUS]:** none

*`slopcheck` war zur Recherchezeit nicht installierbar (kein `pip` im Host-PATH). Alle fünf
Pakete sind dennoch mit erhöhter Zuversicht eingestuft, weil (a) sie bereits in CONTEXT.md per
npm-Registry-Check vom Menschen/Agenten am 2026-10-29 bestätigt wurden, (b) alle fünf exakt
dieselbe `repository.url` (offizielles storybookjs-Monorepo) tragen, und (c) das älteste Paket
seit 2016 existiert. Trotzdem gilt formal: ohne slopcheck-Lauf bleibt die Einstufung
`[ASSUMED]` statt `[VERIFIED]` — der Planer sollte den Install-Schritt dennoch nicht hinter
einem `checkpoint:human-verify` blockieren, da dieser ki-run-Auftrag laut CLAUDE.md keine
Zwischen-Checkpoints setzen darf (Live-UAT am Ende deckt das ab).*

## Architecture Patterns

### Empfohlene `.storybook/`-Struktur
```
frontend/
├── .storybook/
│   ├── main.ts          # Framework, Stories-Glob, Addons, staticDirs
│   └── preview.tsx       # globals.css-Import, Decorators, Viewport/Background-Parameter
├── src/
│   └── components/ui/
│       ├── Button.tsx
│       ├── Button.stories.tsx          # CSF3: Meta + StoryObj für Standard-Zustände
│       └── Button.states.stories.tsx   # nur falls 450-Zeilen-Limit sonst gerissen würde
```

### `.storybook/main.ts` (Minimalkonfiguration)
```typescript
// Quelle: offizielle Storybook-Docs „Storybook for Next.js with Webpack“ [CITED: storybook.js.org/docs/get-started/frameworks/nextjs]
import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../src/components/ui/**/*.stories.@(ts|tsx)', '../src/app/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  addons: ['@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-docs'],
  staticDirs: ['../public'],
}

export default config
```
TypeScript-Pfadalias `@/*` aus `frontend/tsconfig.json` wird von `@storybook/nextjs` automatisch
aus `baseUrl`/`paths` übernommen — kein zusätzliches `webpackFinal`/`resolve.alias` nötig
[CITED: storybook.js.org/docs/get-started/frameworks/nextjs].

### `.storybook/preview.tsx` (Minimalkonfiguration)
```tsx
// Quelle: offizielle Storybook-Docs (Viewport, Themes) [CITED: storybook.js.org/docs/essentials/viewport,
// storybook.js.org Theme-Switcher-Addon-Doku]
import type { Preview } from '@storybook/nextjs'
import { withThemeByClassName } from '@storybook/addon-themes'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'

// Design-Tokens/globale Styles der App — identische Quelle wie die Produkt-UI,
// keine zweite Token-Definition für Storybook.
import '../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    viewport: {
      options: {
        ...MINIMAL_VIEWPORTS,
        mobile390: { name: 'Mobile 390×844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        tablet768: { name: 'Tablet 768×1024', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop1440: { name: 'Desktop 1440×900', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
      },
    },
  },
  initialGlobals: {
    viewport: { value: 'mobile390', isRotated: false },
  },
  decorators: [
    // Team4s hat KEIN eigenes Dark-Theme (siehe CONTEXT.md) — die beiden Klassen setzen
    // ausschließlich einen Bühnenhintergrund (hell/dunkel) hinter der Komponente, um Kontrast
    // zu prüfen; sie überschreiben keine Produkt-Tokens.
    withThemeByClassName({
      themes: { Hell: '', Dunkel: 'sb-stage-dark' },
      defaultTheme: 'Hell',
    }),
  ],
}

export default preview
```
`.storybook/preview.tsx` braucht zusätzlich eine kleine CSS-Datei (z. B. `.storybook/preview.css`,
dort importiert) mit `.sb-stage-dark { background: #1c1c1e; }` — rein Storybook-lokal, landet
NICHT in `src/styles/globals.css`, damit kein Eindruck eines echten Produkt-Dark-Themes entsteht.

### CSS-Module-Handling
`@storybook/nextjs` übernimmt die gleiche Next.js-CSS-Pipeline (globale CSS-Datei-Import in
`preview.tsx`, CSS-Modules via `*.module.css`-Imports in Komponenten) ohne Zusatzkonfiguration
unter dem Webpack-Builder [CITED: storybook.js.org Styling-&-CSS-Doku]. Da praktisch alle
`@/components/ui`-Primitives bereits `*.module.css` nutzen (z. B. `Table.tsx`,
`AdjacentNavigation.tsx`, `AvatarStack.tsx`), ist hier kein Sonderfall zu erwarten — aber nicht in
diesem Repo tatsächlich gegen `npm run storybook` getestet (MEDIUM, nicht HIGH, da ungeprüft).

### Hell/Dunkel-/Hintergrund-Umschalter — konkrete Entscheidung
Reiner `parameters.backgrounds`-Swatch-Ansatz (Core, kein Addon) wäre technisch ausreichend,
erfüllt aber nicht wörtlich die CONTEXT.md-Vorgabe "addon-themes installieren und nutzen". Die
oben gezeigte `withThemeByClassName`-Lösung mit zwei leeren/synthetischen CSS-Klassen erfüllt
beides: addon-themes ist aktiv genutzt (Toolbar-Dropdown "Hell/Dunkel"), aber es wird kein neues
Produkt-Farbschema simuliert — nur der Bühnenhintergrund wechselt.

### Viewport — bestätigt Core-Feature, kein Addon nötig
`storybook/viewport` ist ein Bare-Import aus dem Storybook-10-Core-Paket (nicht
`@storybook/addon-viewport`, das Paket existiert als separates npm-Paket nicht mehr aktiv
gepflegt für v8+) [CITED: storybook.js.org/docs/essentials/viewport]. `width`/`height` MÜSSEN
Einheiten tragen (`'390px'`, nicht `390`).

### Story-Datei-Konventionen (CSF3)
CSF3 (`Meta<typeof Component>` + `StoryObj<typeof Component>`) ist der TypeScript-Standard für
Storybook 10. Beispiel:
```tsx
import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Button>

export const Standard: Story = { args: { children: 'Speichern' } }
export const Disabled: Story = { args: { children: 'Speichern', disabled: true } }
```

**450-Zeilen-Aufteilung — konkrete Strategie, in Prioritätsreihenfolge:**
1. Zuerst lange Literal-Daten (lange Mock-Texte, Options-Listen für "lange Inhalte"/"leer"-
   Zustände) in eine separate `ComponentName.fixtures.ts` auslagern — reduziert die Story-Datei
   selbst am stärksten, ohne die Sidebar-Struktur zu verändern.
2. Reicht das nicht, zweite `.stories.tsx`-Datei mit IDENTISCHEM `title` anlegen (z. B.
   `Button.stories.tsx` + `Button.states.stories.tsx`, beide `title: 'UI/Button'`). Storybook
   merged Dateien mit gleichem `title` in einen Sidebar-Knoten [CITED: Storybook-Doku
   „sidebar-and-urls“, durch GitHub-Diskussion bestätigt].
   - **Export-Namen müssen über alle Dateien mit demselben `title` eindeutig sein** — gleiche
     Export-Namen in zwei Dateien kollidieren stillschweigend, die zuletzt geladene Datei
     gewinnt [CITED: storybookjs/storybook Diskussion zu Sidebar-Merging].
   - **`tags: ['autodocs']` nur in GENAU EINER der Dateien setzen.** Zwei Dateien mit
     gleichem `title` und beide `autodocs` erzeugen den bekannten Fehler „You have two component
     docs pages with the same name“ [CITED: storybookjs/storybook Issue #21373].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Viewport-Umschalter in der Showcase | Eigene Buttons/Dropdown für 390×844/768×1024/1440×900 (die alte `/dev/ui-system/page.tsx` hatte ohnehin keinen eigenen Viewport-/Theme-Switcher — es ist eine NEUE Fähigkeit, kein Ersatz für Bestehendes) | `parameters.viewport.options` (Core) | Bereits vollständig in Storybook enthalten, inkl. Toolbar-UI |
| Hell/Dunkel-Bühnenhintergrund | Eigener Toggle-State + bedingtes Styling in Showcase-Komponenten | `@storybook/addon-themes` (`withThemeByClassName`) | Addon liefert Toolbar-Toggle + Decorator, keine eigene State-Verwaltung nötig |
| Fokus-/Kontrast-Prüfung | Manuelle Tab-Order-/Kontrast-Checks pro Komponente | `@storybook/addon-a11y` (axe-core-Panel pro Story) | Automatisierte, konsistente Prüfung statt Ad-hoc-Review |
| Komponenten-Dokumentation | Handgeschriebene MDX-Seiten pro Primitive | `@storybook/addon-docs` mit `tags: ['autodocs']` | Generiert Props-Tabellen/Beispiele automatisch aus den Stories |

**Key insight:** Alle vier geforderten Showcase-Fähigkeiten (Viewport, Hell/Dunkel, Fokus,
Doku) sind bereits durch die drei entschiedenen Addons + Core abgedeckt — es gibt in diesem
Scope nichts, wofür eine Eigenbau-Lösung gerechtfertigt wäre.

## Common Pitfalls

### Pitfall 1: `storybook init` widerspricht der Webpack-Entscheidung
**What goes wrong:** Der interaktive Init-Wizard könnte bei einem Next.js-16-Projekt den
Vite-Builder vorschlagen/wählen und Beispiel-Stories unter `src/stories/` anlegen.
**Why it happens:** Neuere Storybook-Majors bevorzugen in ihren Auto-Detect-Heuristiken
zunehmend Vite-Builder für neue Next.js-Setups [ASSUMED, nicht gegen die exakte CLI-Version
verifiziert].
**How to avoid:** Pakete manuell in `package.json` eintragen, Config-Dateien von Hand
schreiben, `init` nicht ausführen.
**Warning signs:** Nach einem versehentlichen `init`-Lauf taucht `@storybook/nextjs-vite` in
`package.json` oder `vite.config.*` unter `.storybook/` auf.

### Pitfall 2: Zwei Docs-Seiten mit demselben Namen
**What goes wrong:** Beim Aufteilen einer Komponente in zwei `.stories.tsx`-Dateien mit
gleichem `title` erzeugt Storybook den Fehler „You have two component docs pages with the same
name“, wenn beide Dateien `tags: ['autodocs']` setzen.
**Why it happens:** Jede Datei mit `autodocs` erzeugt eine eigene generierte Docs-Seite;
Storybook erwartet pro Titel nur eine.
**How to avoid:** `autodocs`-Tag nur in der "primären" Datei pro Komponente setzen.
**Warning signs:** Storybook-Build/Dev-Server bricht mit genau dieser Fehlermeldung ab.

### Pitfall 3: Devdependencies landen vollständig im Produktions-Image
**What goes wrong:** `frontend/Dockerfile`s `runner`-Stage kopiert `node_modules` unverändert
aus der `builder`-Stage (`COPY --from=builder /app/node_modules ./node_modules`), die ihrerseits
alle `devDependencies` enthält (bereits heute der Fall für `@playwright/test`, `jsdom` etc.).
Storybook + alle vier Addons vergrößern dieses bereits bestehende Verhalten weiter, OHNE dass
Storybook selbst je im Produktions-Pfad läuft.
**Why it happens:** Kein `--omit=dev`/Multi-Stage-Pruning zwischen `builder` und `runner`.
**How to avoid:** Für diesen Auftrag: akzeptieren und im Abschlussbericht als bekannte,
bereits vor diesem Auftrag bestehende Einschränkung nennen (kein neues Problem, nur
Weiterführung eines bestehenden Musters) — ein echtes Pruning wäre ein eigenständiger,
größerer Dockerfile-Umbau außerhalb dieses Scopes.
**Warning signs:** Produktions-Image-Größe wächst messbar; `.storybook/` oder Story-Dateien
tauchen versehentlich im Runner-Image auf (prüfbar über `docker compose exec
team4sv30-frontend find /app -maxdepth 1 -name .storybook` im Runner-Kontext — aktuell wird
`.storybook/` ohnehin nicht in den Runner kopiert, nur `node_modules`/`.next`/`public`/einzelne
Dateien laut Dockerfile-`COPY`-Liste).

### Pitfall 4: Storybook-Dev-Server konkurriert mit dem bestehenden Next-Dev-Prozess
**What goes wrong:** `docker-compose.override.yml`s `team4sv30-frontend`-Service hat bereits
einen fixen Vordergrund-`command: npm run dev -- --webpack` auf Port 3000. Ein zweiter
Vordergrundprozess (Storybook auf 6006) lässt sich nicht einfach im selben laufenden Container
„nebenbei“ starten, ohne das Compose-Prozessmodell (ein Hauptprozess pro Service) zu verletzen.
**Why it happens:** `docker compose up` startet genau einen Befehl pro Service als PID 1.
**How to avoid:** Siehe `## Open Questions` — empfohlen wird ein zusätzlicher Compose-Service,
der dieselbe Build-Context/denselben Build nutzt, aber `command: npm run storybook` und
`ports: ["6006:6006"]` setzt, plus denselben Bind-Mount (`./frontend:/app`) und dasselbe
`frontend_node_modules`-Volume wie `team4sv30-frontend`, damit installierte Pakete sichtbar sind.
**Warning signs:** `docker compose exec team4sv30-frontend npm run storybook` blockiert/schlägt
fehl, weil Port 6006 nicht nach außen exponiert ist (kein `ports`-Mapping für einen Exec-Prozess
in einem bereits laufenden Service möglich).

### Pitfall 5: `build-storybook` prüft keine A11y-Verstöße
**What goes wrong:** Team könnte annehmen, dass `npm run build-storybook` in den
Root-Prüfungen automatisch auch alle `addon-a11y`-Verstöße als CI-Fehler meldet.
**Why it happens:** `addon-a11y` zeigt Verstöße im laufenden Dev-UI-Panel an; ein reiner
statischer `storybook build` prüft nur, ob alle Stories fehlerfrei rendern/kompilieren, führt
aber standardmäßig KEINEN axe-core-Testlauf mit Exit-Code-Fehler aus (das wäre erst mit dem
separaten `@storybook/test-runner`/`storybook test` möglich, der hier nicht im Scope ist).
**How to avoid:** Im Abschlussbericht/CLAUDE.md-Update klar benennen, dass
`build-storybook` ein reines Kompilier-/Render-Gate ist, kein A11y-Gate.
**Warning signs:** Jemand verlässt sich auf grünen `build-storybook` als A11y-Nachweis.

## Code Examples

### `npm`-Scripts-Ergänzung (`frontend/package.json`)
```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### Next.js-App-Router-Hooks in Stories (nur falls künftig benötigt)
```tsx
// Quelle: offizielle @storybook/nextjs-Doku zu App-Router-Mocking
// [CITED: storybook.js.org/docs/get-started/frameworks/nextjs]
const meta: Meta<typeof SomeComponent> = {
  component: SomeComponent,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/admin/anime/create' },
    },
  },
}
```
**Befund in diesem Repo:** Keine der aktuellen Showcase-Komponenten unter
`frontend/src/app/dev/ui-system/` ruft `useRouter`/`usePathname`/`useSearchParams` selbst auf
(nur die begleitenden `*.test.tsx`-Dateien mocken `next/navigation` für Tests). Für die
Erstmigration ist dieser Parameter voraussichtlich NICHT nötig — als Kontingenz dokumentiert,
falls künftige domänenspezifische Stories solche Hooks brauchen.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx storybook init` würde bei diesem Next-16-Setup tendenziell den Vite-Builder statt Webpack vorschlagen | Architecture Patterns / Pitfall 1 | Gering — Empfehlung ist ohnehin, `init` NICHT zu nutzen; falls die Annahme falsch ist, wäre `init` sogar unproblematischer als hier dargestellt |
| A2 | CSS-Module funktionieren unter `@storybook/nextjs` (Webpack) ohne Zusatzkonfiguration genauso wie im Next-Build | Architecture Patterns / CSS-Module-Handling | Mittel — falls falsch, würden UI-Primitive-Stories ungestylt rendern; sofort sichtbar beim ersten `npm run storybook`-Start, kein stiller Fehler |
| A3 | Alle fünf Storybook-Pakete sind legitim trotz fehlendem slopcheck-Lauf | Package Legitimacy Audit | Gering — Mehrfachbestätigung über identisches offizielles Repo + 10 Jahre altes Hauptpaket + bereits vom Menschen separat per Registry-Check bestätigt (CONTEXT.md) |

**Falls diese Tabelle für die Planung kritisch ist:** A2 sollte im Plan als früher
Verifikationsschritt (erstes `npm run storybook` nach Basis-Setup, visuell gegen eine
Table.tsx-/AvatarStack.tsx-Story prüfen) auftauchen, nicht erst am Ende der Migration.

## Open Questions

1. **Storybook-Prozess-Topologie im Compose-Setup (Port 6006)**
   - What we know: CONTEXT.md legt Port `6006` intern+extern fest und sagt "läuft im
     Frontend-Container"; `docker-compose.override.yml` hat für `team4sv30-frontend` bereits
     einen fixen Vordergrundbefehl (`npm run dev -- --webpack`) belegt.
   - What's unclear: Ob "im Frontend-Container" wörtlich denselben laufenden Container/Prozess
     meint (technisch nicht sauber neben dem Next-Dev-Server möglich) oder nur "aus demselben
     Image/Build-Context, Teil der Frontend-Tooling-Familie".
   - Recommendation: Zusätzlicher Compose-Service (z. B. `team4sv30-storybook`), gleicher
     `build.context: ./frontend`, gleicher Bind-Mount + `frontend_node_modules`-Volume,
     `command: npm run storybook`, `ports: ["6006:6006"]`. Das erfüllt Port-Vorgabe und
     "gehört zum Frontend" ohne Prozesskonflikt. Der Planer sollte das vor der Umsetzung kurz
     bestätigen, da es eine neue Compose-Service-Definition ist, keine reine Script-Ergänzung.

2. **Reihenfolge Primitive- vs. Showcase-Migration für `build-storybook`-Gate-Aktivierung**
   - What we know: CONTEXT.md verlangt volle Zustandsabdeckung nur für `@/components/ui`,
     1:1-Übernahme für Showcases; beides muss vor dem endgültigen Löschen von `/dev/ui-system`
     fertig sein.
   - What's unclear: Ob `build-storybook` in den Root-Prüfungen schon aktiviert wird, während
     die Migration noch läuft (würde bei unvollständigen Stories keinen Sinn ergeben), oder
     erst nach Abschluss der kompletten Migration.
   - Recommendation: `build-storybook`-Root-Check erst als letzter Task aktivieren, nachdem
     alle `UI/*`- und `Showcases/*`-Stories existieren und `/dev/ui-system` entfernt ist.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine + Compose | gesamter Auftrag (keine Host-npm-Installation erlaubt) | ✓ (laut CLAUDE.md kanonische Umgebung) | — | — |
| `node`/`npm` im Frontend-Container | Storybook-Install/-Betrieb | ✓ (Image `node:20-bookworm-slim`, bereits für bestehende Scripts genutzt) | Node 20 | — |
| Host-`npm`/`node` | NICHT genutzt (Projektregel) | — | — | — |
| `pip`/`slopcheck` auf dem Research-Host | Package-Legitimacy-Protokoll | ✗ | — | Manuelle `npm view`-Metadaten-Prüfung (siehe Package Legitimacy Audit) |

**Missing dependencies with no fallback:** keine (slopcheck hat einen dokumentierten Fallback).
**Missing dependencies with fallback:** `slopcheck` → manuelle Registry-/Repo-Metadaten-Prüfung.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` → Abschnitt enthalten, schlank.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (bestehend) | Vitest 3 (`frontend/vitest.config.ts`), Playwright 1.55 (E2E) |
| Neu durch diesen Auftrag | Storybook 10 — kein Test-Framework im klassischen Sinn, sondern ein Render-/Doku-Gate (`storybook build` kompiliert+rendert alle Stories) |
| Quick run command | `docker compose exec team4sv30-frontend npm run storybook` (manuelle visuelle Prüfung) |
| Full suite command | `docker compose exec team4sv30-frontend npm run build-storybook` |

### Phase Requirements → Test Map
Dieser Quick-Task hat keine formalen `REQ-XX`-IDs (kein Requirements-Dokument übergeben). Das
funktionale Äquivalent ist: Jede migrierte Primitive/Showcase MUSS als Story existieren UND
`npm run build-storybook` MUSS fehlerfrei durchlaufen, bevor `/dev/ui-system` gelöscht wird.

### Sampling Rate
- **Pro migrierter Komponente:** `npm run storybook` lokal im Browser prüfen (visuell, inkl.
  Hell/Dunkel-Hintergrund + drei Viewports).
- **Vor Entfernen von `/dev/ui-system`:** `npm run build-storybook` muss grün sein.
- **Danach dauerhaft:** `build-storybook` wird fester Bestandteil der Root-Prüfungen, analog zu
  `lint`/`typecheck`/`test`/`build`.

### Wave 0 Gaps
- [ ] `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview.css` existieren noch
  nicht — müssen vor der ersten Story angelegt werden.
- [ ] `storybook`/`build-storybook`-Scripts fehlen noch in `frontend/package.json`.
- [ ] Kein Compose-Service für Port 6006 vorhanden (siehe Open Question 1).

## Sources

### Primary (HIGH confidence)
- npm-Registry (`npm view <pkg> version|repository.url|time.created`) für alle fünf Pakete,
  ausgeführt am 2026-10-29 in dieser Session — bestätigt Version `10.6.5` und gemeinsames
  offizielles Repo für alle fünf Pakete.
- `frontend/package.json`, `frontend/Dockerfile`, `docker-compose.yml`,
  `docker-compose.override.yml`, `frontend/tsconfig.json`, `frontend/vitest.config.ts`,
  `frontend/src/components/ui/index.ts`, `frontend/src/styles/globals.css`,
  `frontend/eslint.config.mjs`, `frontend/src/app/dev/ui-system/**` — direkt im Repo gelesen.

### Secondary (MEDIUM confidence)
- storybook.js.org „Storybook for Next.js with Webpack" — Framework-Config, Pfadalias-Handling,
  `next/image`-Verhalten, App-Router-Navigation-Mocking (`parameters.nextjs.appDirectory`).
- storybook.js.org „Essentials: Viewport" — Core-Viewport-Syntax, `storybook/viewport`-Bare-Import.
- storybook.js.org Theme-Switcher-Addon-Dokumentation — `withThemeByClassName`/
  `withThemeByDataAttribute`-Beispiele.
- storybook.js.org „Styling and CSS" / GitHub-Issue-Diskussionen — globale CSS-Importe in
  `preview.tsx`, CSS-Modules-Unterstützung unter Next.js-Framework.

### Tertiary (LOW confidence)
- GitHub-Issues/Discussions zu CSF-Datei-Merging bei gleichem `title` (#21373 „two component
  docs pages", Sidebar-Merge-Diskussion #24700) — Verhalten plausibel und mehrfach bestätigt,
  aber nicht in diesem Repo nachgestellt.
- Annahme zu `storybook init`-Default-Builder-Wahl bei Next.js 16 (A1) — nicht gegen die exakte
  CLI-Version in dieser Session verifiziert, daher als Grund für "init vermeiden" verwendet statt
  als Tatsachenbehauptung.

## Metadata

**Confidence breakdown:**
- Standard Stack (Versionen/Pakete): HIGH — direkt per npm-Registry verifiziert, deckt sich mit
  CONTEXT.md's eigenem, bereits durchgeführtem Check.
- Architecture/Config-Syntax (`main.ts`/`preview.tsx`/Viewport/Themes): MEDIUM — aus offiziellen
  Docs zitiert, aber nicht in diesem konkreten Repo-Setup lauffähig getestet.
- Docker-Prozess-Topologie für Port 6006: LOW/offene Frage — CONTEXT.md legt nur den Port fest,
  nicht die Service-Struktur; hier eine begründete Empfehlung, kein bestätigter Fakt.
- Pitfalls (450-Zeilen-Story-Split, Docs-Duplikat, Devdeps-im-Runner-Image): MEDIUM-HIGH — teils
  direkt aus Repo-Code (Dockerfile) abgeleitet, teils aus mehrfach bestätigten GitHub-Quellen.

**Research date:** 2026-10-29
**Valid until:** ca. 2026-11-28 (30 Tage) — Storybook-Major-Versionen und deren
Next.js-Adapter-Verhalten ändern sich schneller als die meisten Team4s-Abhängigkeiten; vor
tatsächlicher Umsetzung erneut `npm view storybook version` prüfen, falls diese Recherche älter
als wenige Wochen ist.
