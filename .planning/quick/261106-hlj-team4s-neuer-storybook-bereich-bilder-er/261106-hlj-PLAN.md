---
task: 261106-hlj
title: Team4S Storybook-Hauptbereich "Bilder" + erster Eintrag "Bilder/Anime-Cover"
type: quick-full
autonomous: true
execution_mode: ki-run (autonom, kein Mensch live während des Laufs -- menschliche Prüfung ist
  die abschließende Live-UAT per `ki-run uat`/`ki-run accept`, siehe CLAUDE.md "Autonome Aufträge")
files_modified:
  - frontend/public/storybook-bilder/anime-cover-freezing.jpg
  - frontend/src/lib/storybookBildKatalog.ts
  - frontend/src/components/showcases/BildKatalogShowcase.tsx
  - frontend/src/components/showcases/BildKatalogShowcase.module.css
  - frontend/src/components/showcases/BildKatalogShowcase.stories.tsx
  - docs/FRONTEND_ARCHITEKTUR.md
must_haves:
  truths:
    - "Die Storybook-Seitenleiste zeigt einen neuen Hauptbereich 'Bilder' neben Grundlagen/Grundbausteine/Zusammengesetzte Bausteine/Im Einsatz/Admin."
    - "Unter 'Bilder' existiert der Eintrag 'Anime-Cover': er zeigt das echte Freezing-Cover roh -- ohne MediaFrame, Rahmen, Rundung, Schatten oder Verlauf -- mit der Typbezeichnung 'Anime-Cover' darunter."
    - "Die Story funktioniert ohne laufende Jellyfin-Verbindung, weil das Bild als feste Kopie im Repo liegt statt live von Jellyfin geladen zu werden."
    - "Eine künftige Grundbaustein- oder Zusammengesetzte-Bausteine-Story kann denselben Bildpfad über einen einzigen zentralen Import bekommen, ohne den Pfad erneut hart zu codieren."
    - "docs/FRONTEND_ARCHITEKTUR.md Abschnitt 8 erklärt den Zweck der neuen Kategorie 'Bilder/*' kurz mit."
  artifacts:
    - path: "frontend/public/storybook-bilder/anime-cover-freezing.jpg"
      provides: "feste, byte-identische Kopie des echten Jellyfin-Primärbilds von Freezing (Anime 13), damit die Story ohne Jellyfin-Zugriff funktioniert"
    - path: "frontend/src/lib/storybookBildKatalog.ts"
      provides: "zentraler, typisierter Katalog-Eintrag (Pfad/Alt-Text/Bezeichnung) für das Anime-Cover-Referenzbild, importierbar von künftigen Stories"
    - path: "frontend/src/components/showcases/BildKatalogShowcase.tsx"
      provides: "generische Komponente, die GENAU EIN Bildkatalog-Eintrag roh (natives <img>, keine Rahmen/Rundung/Schatten/Verlauf-CSS) plus Typbezeichnung darunter rendert"
    - path: "frontend/src/components/showcases/BildKatalogShowcase.stories.tsx"
      provides: "Story mit title: 'Bilder/Anime-Cover'"
    - path: "docs/FRONTEND_ARCHITEKTUR.md"
      provides: "kurzer Absatz zur fünften Storybook-Kategorie 'Bilder/*' in Abschnitt 8"
  key_links:
    - from: "frontend/src/components/showcases/BildKatalogShowcase.stories.tsx"
      to: "frontend/src/lib/storybookBildKatalog.ts"
      via: "Import des Katalog-Eintrags ANIME_COVER_BILD statt eines hartcodierten Pfad-Strings"
      pattern: "from '@/lib/storybookBildKatalog'"
    - from: "frontend/src/components/showcases/BildKatalogShowcase.tsx"
      to: "frontend/public/storybook-bilder/anime-cover-freezing.jpg"
      via: "rohes <img src=...> ohne ResponsiveImage/MediaFrame-Wrapper"
      pattern: "storybook-bilder/anime-cover-freezing.jpg"
---

<objective>
Fügt Storybook einen fünften Hauptbereich "Bilder" hinzu: eine roh dargestellte Bildersammlung,
in der jedes Bild für einen Bildtyp aus Team4S steht (Bild + Typbezeichnung darunter, ohne
MediaFrame/Rahmen/Rundung/Schatten/Verlauf). Erster und einziger Eintrag in diesem Auftrag ist
"Bilder/Anime-Cover" mit dem echten, bereits heruntergeladenen Jellyfin-Primärbild von Freezing
(Anime-ID 13) als Beispielbild, das als feste Kopie im Repo liegt (kein Live-Jellyfin-Abruf).
Bild und Pfad liegen dabei zentral in einem eigenen, typisierten Katalog-Modul, damit künftige
Grundbaustein- und Zusammengesetzte-Bausteine-Stories denselben Eintrag später importieren
können, ohne den Pfad erneut zu erfinden -- diese Wiederverwendung in anderen Stories ist NICHT
Teil dieses Auftrags, nur die zentrale Ablage selbst.

Purpose: Schafft eine stabile, Jellyfin-unabhängige Referenzquelle für das echte Anime-Cover-Bild
und eine neue, klar abgegrenzte Storybook-Taxonomie-Kategorie für rohe Bildtyp-Beispiele.
Output: Neuer öffentlicher Bild-Asset-Pfad, zentrales Katalog-Modul, generische rohe
Bild-Showcase-Komponente, Story "Bilder/Anime-Cover", aktualisierte Architektur-Dokumentation.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md

<note>
Dieser Auftrag läuft als `ki-run`-Job (siehe CLAUDE.md "Autonome Aufträge"): KEINE
`checkpoint:human-verify`-Tasks mitten im Lauf -- die menschliche Prüfung ist die abschließende
Live-UAT per `ki-run uat`/`ki-run accept`. Vor der Live-Abnahme werden laut Auftrag KEINE neuen
Tests geschrieben; die automatisierte Absicherung in diesem Plan besteht ausschließlich aus
Typecheck/Lint plus einem Registrierungs-Nachweis gegen den bereits laufenden
`team4sv30-storybook`-Dienst (kein neues Test-File).

Das echte Jellyfin-Primärbild von Freezing liegt bereits unter `/tmp/freezing-cover-original.jpg`
(JPEG, 225x316px, 53768 Bytes) -- byte-identisch per `cp` in das Repo übernehmen, NICHT erneut
von Jellyfin laden (Jellyfin ist nicht in jeder Umgebung erreichbar).
</note>
</context>

<interfaces>
<!-- Referenzmuster für eine "Grundlagen/*"-Showcase-Komponente + zugehörige Story-Datei, siehe
     frontend/src/components/showcases/DesignTokensShowcase.tsx (SectionHeader/Text aus
     @/components/ui, lazy-state Pattern) und
     frontend/src/components/showcases/DesignTokensShowcase.stories.tsx
     (title: 'Grundlagen/Design-Tokens', tags: ['autodocs'], export const Standard: Story = {}). -->

Aus frontend/src/components/ui/SectionHeader.tsx:
```typescript
export interface SectionHeaderProps {
  eyebrow?: string
  title: string
  level?: 2 | 3
  description?: string
  actions?: ReactNode
  underline?: boolean
  icon?: ReactNode
  counter?: ReactNode
  titleClassName?: string
}
export function SectionHeader(props: SectionHeaderProps): JSX.Element
```

Aus frontend/src/components/ui/Text.tsx:
```typescript
export type TextVariant = 'body' | 'soft' | 'meta' | 'small' | 'eyebrow' | 'strong'
export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  tone?: 'default' | 'onScrim' | 'error'
  as?: 'p' | 'span'
  tracking?: 'normal' | 'wide'
}
export function Text(props: TextProps): JSX.Element
```

Bereits etabliertes Muster für ein bewusst rohes `<img>` (kein ESLint-Verstoß, native
`<img>`/`<select>`/`<input>`/`<textarea>`/`<button>`-Guards in `eslint.config.mjs` verbieten NUR
select/input/textarea (repoweit) + button (nur `components/ui/**`) + table (nur `src/app/**`) --
`<img>` ist in keinem dieser Guards gelistet):
Aus frontend/src/app/me/profile/components/RecentMediaSection.tsx:24-25:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img src={item.thumbnail_url} alt="" loading="lazy" />
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Zentrale Bildablage + typisiertes Bildkatalog-Modul</name>
  <files>
    frontend/public/storybook-bilder/anime-cover-freezing.jpg,
    frontend/src/lib/storybookBildKatalog.ts
  </files>
  <action>
    Lege den neuen Ordner `frontend/public/storybook-bilder/` an (bewusst getrennt von
    `frontend/public/covers/`, das echte/Platzhalter-Admin-Cover-Assets enthält -- dieses Bild
    ist ausschließlich Referenzmaterial für den Storybook-Katalog, keine Produktionsdaten) und
    kopiere `/tmp/freezing-cover-original.jpg` per `cp` (byte-identisch, NICHT erneut von
    Jellyfin laden) nach `frontend/public/storybook-bilder/anime-cover-freezing.jpg`. `.storybook/main.ts`
    hat bereits `staticDirs: ['../public']` -- keine Konfigurationsänderung nötig.

    Lege `frontend/src/lib/storybookBildKatalog.ts` neu an: exportiere ein Interface
    `StorybookBildEintrag { id: string; bezeichnung: string; pfad: string; altText: string }`
    sowie die Konstante `ANIME_COVER_BILD: StorybookBildEintrag` mit `id: 'anime-cover'`,
    `bezeichnung: 'Anime-Cover'`, `pfad: '/storybook-bilder/anime-cover-freezing.jpg'`,
    `altText: 'Cover des Anime Freezing, als Jellyfin-Bild bezogen'`. Ergänze zusätzlich
    `export const STORYBOOK_BILD_KATALOG: readonly StorybookBildEintrag[] = [ANIME_COVER_BILD]`
    als Sammelstelle für künftig weitere Einträge. Kommentiere fachlich und deutsch (korrekte
    Umlaute), dass dies die EINE zentrale Stelle ist, aus der jede künftige Grundbaustein- oder
    Zusammengesetzte-Bausteine-Story dieses echte Referenzbild importieren soll, statt den Pfad
    erneut hart zu codieren -- diese Wiederverwendung selbst ist nicht Teil dieses Auftrags.
  </action>
  <verify>
    <automated>
      test -f frontend/public/storybook-bilder/anime-cover-freezing.jpg &&
      cmp -s /tmp/freezing-cover-original.jpg frontend/public/storybook-bilder/anime-cover-freezing.jpg &&
      docker compose exec team4sv30-frontend npm run typecheck
    </automated>
  </verify>
  <done>
    `frontend/public/storybook-bilder/anime-cover-freezing.jpg` existiert und ist byte-identisch
    zu `/tmp/freezing-cover-original.jpg`; `storybookBildKatalog.ts` exportiert
    `StorybookBildEintrag`, `ANIME_COVER_BILD` und `STORYBOOK_BILD_KATALOG`; `tsc --noEmit` ist grün.
  </done>
</task>

<task type="auto">
  <name>Task 2: Generische rohe Bild-Showcase-Komponente + Story "Bilder/Anime-Cover"</name>
  <files>
    frontend/src/components/showcases/BildKatalogShowcase.tsx,
    frontend/src/components/showcases/BildKatalogShowcase.module.css,
    frontend/src/components/showcases/BildKatalogShowcase.stories.tsx
  </files>
  <action>
    Lege `BildKatalogShowcase.tsx` an: eine Komponente `BildKatalogShowcase({ eintrag }: { eintrag:
    StorybookBildEintrag })` (Typ-Import aus `@/lib/storybookBildKatalog`), die oben
    `<SectionHeader eyebrow="Bilder" title={eintrag.bezeichnung} description="Rohes Beispielbild
    ohne Rahmen, Rundung, Schatten oder Verlauf -- steht für einen Bildtyp aus Team4S." />` rendert
    und darunter ein `<figure>` mit einem nativen `<img src={eintrag.pfad} alt={eintrag.altText}
    className={styles.image} />` (mit `// eslint-disable-next-line @next/next/no-img-element`
    direkt darüber, analog zu `RecentMediaSection.tsx` -- bewusst KEIN `ResponsiveImage`/
    `MediaFrame`-Wrapper, da die Kategorie genau das unveränderte Rohbild zeigen soll) sowie einer
    `<figcaption>` mit `<Text variant="strong">{eintrag.bezeichnung}</Text>` darunter. Kommentiere
    fachlich und deutsch, warum die Komponente generisch über EINEN Katalog-Eintrag gehalten ist
    (künftige weitere Bildtypen können dieselbe Komponente mit einem anderen Eintrag
    wiederverwenden, ohne eine zweite fast identische Showcase-Komponente zu bauen) und warum sie
    bewusst KEIN `ResponsiveImage`/`MediaFrame` nutzt.

    Lege `BildKatalogShowcase.module.css` an: NUR Seiten-Layout (z. B. `.page { display: flex;
    flex-direction: column; gap: var(--space-4); }`, `.figure { margin: 0; display: inline-flex;
    flex-direction: column; align-items: flex-start; gap: var(--space-2); }`, `.image { display:
    block; max-width: 320px; height: auto; }`) -- KEINE `border`, `border-radius`, `box-shadow`
    oder `background`/`gradient`-Regel auf `.image` oder `.figure`, das wäre genau die verbotene
    Rahmen/Rundung/Schatten/Verlauf-Gestaltung, die diese Kategorie bewusst vermeidet.

    Lege `BildKatalogShowcase.stories.tsx` an: importiere `ANIME_COVER_BILD` aus
    `@/lib/storybookBildKatalog`, `meta = { title: 'Bilder/Anime-Cover', component:
    BildKatalogShowcase, tags: ['autodocs'] } satisfies Meta<typeof BildKatalogShowcase>`, und
    `export const Standard: Story = { args: { eintrag: ANIME_COVER_BILD } }` (Muster identisch zu
    `DesignTokensShowcase.stories.tsx`). `catalogTaxonomy.test.ts` prüft ausschließlich Titel, die
    mit `'Grundbausteine/'` bzw. `'Im Einsatz/'` beginnen -- `'Bilder/Anime-Cover'` ist davon nicht
    betroffen, keine Testanpassung nötig. `.storybook/main.ts`-Glob
    `../src/components/showcases/**/*.stories.@(ts|tsx)` deckt die neue Datei bereits ab.
  </action>
  <verify>
    <automated>
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx eslint src/components/showcases/BildKatalogShowcase.tsx src/components/showcases/BildKatalogShowcase.stories.tsx &&
      ! grep -Ei "border|box-shadow|background|gradient" frontend/src/components/showcases/BildKatalogShowcase.module.css
    </automated>
  </verify>
  <done>
    `BildKatalogShowcase.tsx` rendert das Bild roh (natives `<img>`, keine Rahmen/Rundung/Schatten/
    Verlauf-Klassen) mit der Typbezeichnung als `<figcaption>` darunter; die Story-Datei setzt
    `title: 'Bilder/Anime-Cover'`; `tsc --noEmit` und `eslint` auf beiden neuen Dateien sind grün;
    `BildKatalogShowcase.module.css` enthält keine `border`/`box-shadow`/`background`/`gradient`-Regel
    (der `grep -Ei`-Check liefert genau deshalb keinen Treffer, Exit-Code 1, von `!` zu Erfolg
    invertiert).
  </done>
</task>

<task type="auto">
  <name>Task 3: Dokumentation der neuen Kategorie + Registrierungs-Nachweis im laufenden Storybook</name>
  <files>docs/FRONTEND_ARCHITEKTUR.md</files>
  <action>
    Ergänze in `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 8 (direkt nach dem Absatz, der mit
    "**Showcase/Referenz:**" beginnt und die vier bestehenden Kategorien beschreibt, ca. Zeile 221)
    einen kurzen neuen Absatz zur fünften Kategorie: `Bilder/*` ist eine roh dargestellte
    Bildersammlung -- jeder Eintrag steht für einen Bildtyp aus Team4S und zeigt das Bild OHNE
    MediaFrame, Rahmen, Rundung, Schatten oder Verlauf, nur mit der Typbezeichnung darunter.
    Erster Eintrag ist `Bilder/Anime-Cover` (Fachbegriff im Code: Cover) mit dem echten,
    Jellyfin-bezogenen Primärbild von Freezing, als feste Kopie unter
    `frontend/public/storybook-bilder/` abgelegt (funktioniert ohne Jellyfin-Zugriff) und über den
    zentralen, typisierten Katalog `frontend/src/lib/storybookBildKatalog.ts` referenziert, damit
    künftige Grundbaustein- oder Zusammengesetzte-Bausteine-Stories denselben Eintrag importieren
    können, statt den Pfad erneut hart zu codieren. Halte den bestehenden Satz zur
    Katalogprüfung (`catalogTaxonomy.test.ts`) unverändert, da diese Kategorie davon nicht
    betroffen ist.

    Führe anschließend den laut Auftrag vorgesehenen Nachweis (KEIN neues Test-File) gegen den
    bereits laufenden `team4sv30-storybook`-Dienst (Port 6006, Tunnel 127.0.0.1:6007) aus: der
    Dev-Server lädt Story-Änderungen automatisch neu (HMR); frage dessen Story-Index-Endpunkt ab,
    um zu belegen, dass Storybook die neue Story tatsächlich registriert hat.
  </action>
  <verify>
    <automated>
      grep -c "Bilder/\*" docs/FRONTEND_ARCHITEKTUR.md &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npm run lint &&
      curl -s http://192.168.235.196:6006/index.json | grep -c '"Bilder/Anime-Cover"'
    </automated>
  </verify>
  <done>
    docs/FRONTEND_ARCHITEKTUR.md beschreibt die neue Kategorie "Bilder/*" inkl. des Eintrags
    "Anime-Cover" und der zentralen Katalog-Ablage; `tsc --noEmit` und `npm run lint` sind
    repo-weit grün; der laufende `team4sv30-storybook`-Dienst listet "Bilder/Anime-Cover" in
    seinem Story-Index (Nachweis für die Sichtprüfung, kein neues Test-File).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Storybook-Static-Assets <-> Browser | `frontend/public/storybook-bilder/anime-cover-freezing.jpg` wird über `staticDirs: ['../public']` unverändert als statische Datei ausgeliefert -- keine neue Server-Logik, kein neuer Eingabepfad. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|--------------|------------------|
| T-261106hlj-01 | Information Disclosure | `frontend/public/storybook-bilder/anime-cover-freezing.jpg` | accept | Reines öffentliches Cover-Bild eines bereits öffentlich sichtbaren Anime-Datensatzes (Freezing, Anime-ID 13) -- keine personenbezogenen oder vertraulichen Daten, identisch zu bereits öffentlich servierten Cover-Bildern unter `public/covers/`. |
| T-261106hlj-02 | Tampering | `frontend/src/lib/storybookBildKatalog.ts` | accept | Reines, statisches Literal-Modul ohne Nutzereingabe-Interpolation; kein neuer Angriffspfad gegenüber bestehenden Fixture-Modulen wie `AchievementBadgeShowcase.sourceFiles.fixture.ts`. |
</threat_model>

<verification>
Nach Abschluss aller drei Tasks:
- `docker compose exec team4sv30-frontend npm run typecheck && npm run lint` ist repo-weit grün.
- `frontend/public/storybook-bilder/anime-cover-freezing.jpg` ist byte-identisch zu
  `/tmp/freezing-cover-original.jpg` (`cmp -s`).
- Der laufende `team4sv30-storybook`-Dienst listet `"Bilder/Anime-Cover"` in seinem
  Story-Index (`curl http://192.168.235.196:6006/index.json`).
- `docs/FRONTEND_ARCHITEKTUR.md` enthält den neuen Absatz zu `Bilder/*`.
- `BildKatalogShowcase.module.css` enthält keine `border`/`box-shadow`/`background`/`gradient`-Regel.
</verification>

<success_criteria>
- Storybook zeigt den neuen Hauptbereich "Bilder" mit dem Eintrag "Anime-Cover", der das echte
  Freezing-Cover roh (ohne Rahmen/Rundung/Schatten/Verlauf) mit der Typbezeichnung darunter zeigt.
- Das Bild liegt als feste, Jellyfin-unabhängige Kopie im Repo und ist über ein zentrales,
  typisiertes Modul importierbar.
- docs/FRONTEND_ARCHITEKTUR.md beschreibt die neue Kategorie.
- Kein bestehender Test oder bestehende Katalogprüfung ist gebrochen; keine neuen Test-Dateien
  wurden angelegt.
</success_criteria>

<output>
Erzeuge `.planning/quick/261106-hlj-team4s-neuer-storybook-bereich-bilder-er/261106-hlj-SUMMARY.md`
nach Abschluss aller Tasks (Standard-GSD-Executor-Output).
</output>
</content>
