---
task: 261102-hlg
title: Team4S Schritt 3 -- LinkChip, BannerSection, öffentliche Card-Glas-Varianten (Tokens) + Design-System-Pflichtnutzung für /anime und /anime/[id]
type: quick-full
autonomous: true
files_modified:
  - frontend/src/components/ui/LinkChip.tsx
  - frontend/src/components/ui/LinkChip.module.css
  - frontend/src/components/ui/LinkChip.stories.tsx
  - frontend/src/components/ui/BannerSection.tsx
  - frontend/src/components/ui/BannerSection.module.css
  - frontend/src/components/ui/BannerSection.stories.tsx
  - frontend/src/components/ui/Card.tsx
  - frontend/src/components/ui/Card.module.css
  - frontend/src/components/ui/Card.stories.tsx
  - frontend/src/components/ui/index.ts
  - frontend/src/styles/tokens/components.css
  - frontend/src/app/anime/[id]/page.module.css
  - frontend/src/app/anime/[id]/page.poster.module.css
  - frontend/src/app/anime/[id]/page.infoCard.module.css
  - frontend/src/app/anime/[id]/page.episodes.module.css
  - frontend/src/app/anime/[id]/AnimeDetailView.styles.ts
  - frontend/src/app/anime/[id]/AnimeDetailView.tsx
  - frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx
  - frontend/src/app/anime/[id]/page.test.tsx
  - frontend/src/app/anime/[id]/page.performance.test.ts
  - frontend/src/app/anime/AnimeListView.tsx
  - frontend/src/app/anime/AnimeListLoading.tsx
  - frontend/src/app/anime/AnimeListView.stories.tsx
  - frontend/src/app/anime/page.module.css
  - frontend/src/components/fansubs/EpisodeGlassCard.tsx
  - frontend/src/components/fansubs/EpisodeGlassCard.module.css
  - frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx
  - frontend/src/components/fansubs/ReleasePreviewRow.tsx
  - frontend/src/components/fansubs/ReleasePreviewRow.module.css
  - frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.tsx
  - CLAUDE.md
  - docs/FRONTEND_ARCHITEKTUR.md
  - .planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md
must_haves:
  truths:
    - "Besucher sehen auf /anime keinen Entwicklertext mehr (\"P0 MVP\", \"... mit A-Z Filter und Pagination\"); stattdessen einen fachlichen Titel \"Anime\" mit lokalisierter Trefferzahl über PageHeader."
    - "Besucher sehen auf /anime/<id> die Episodenzahl als Badge (onMedia) auf dem Poster (\"12 Folgen\"/\"1 Folge\"); bei 0/unbekannt ist kein Badge sichtbar."
    - "Genres und Tags auf /anime/<id> sind klickbare LinkChips (ein gemeinsamer Grundbaustein, tone=glass bzw. scrim), die ihre bisherige, unterschiedliche Optik behalten."
    - "Der Bannerhintergrund wird über BannerSection gerendert, AnimeBackdropRotator ist darin komponiert."
    - "Die Info-Karte der Detailseite und die Episodenkarten sind KEINE seiteneigenen/feature-lokalen Glasflächen mehr, sondern nutzen offizielle Card-Varianten (glass/glassStrong) mit Tönungs-Hook, deren Werte ausschließlich aus globalen Tokens in styles/tokens stammen -- foreignVariableOverrides.regression.test.ts bleibt grün (keine Fremd-Overrides)."
    - "Die vier Episoden-Tönungen (canon/filler/mixed/recap) sind globale Tokens, nicht mehr feature-lokale --glass-*-rgba/hsl-Literale in EpisodeGlassCard.module.css."
    - "ReleasePreviewRow zeigt bei fehlendem Gruppenlogo ein Avatar-Kürzel statt nichts (echte, von der Entscheidung verlangte Ergänzung)."
    - "FansubVersionBrowser bleibt verhaltensgleich: alle vier bestehenden Testdateien (.test.tsx, .filterSwitch.test.tsx, .groupSwitch.test.tsx, .windowing.test.tsx) bleiben grün."
    - "Storybook zeigt alle drei Ebenen: Grundbaustein (Card glass/glassStrong/Tönungen auf Bannerhintergrund), Zusammengesetzte Bausteine (EpisodenKarte/ReleaseZeile mit allen Zuständen, 'Besteht aus'), Im Einsatz (komplette /anime- und /anime/[id]-Seiten, ausgeloggt und eingeloggt)."
    - "261102-cb2-EINORDNUNG.md klassifiziert alle migrierten Seitenteile nach dem tatsächlichen finalen Code, inkl. der neuen Card-Glas-Varianten und der weiteren öffentlichen Seiten, die dieselbe Optik haben und künftig folgen."
  artifacts:
    - path: "frontend/src/components/ui/LinkChip.tsx"
      provides: "Neuer Grundbaustein: Link in Chip-Form, tone=glass|scrim, ohne Import anderer katalogisierter components/ui-Komponenten"
    - path: "frontend/src/components/ui/BannerSection.tsx"
      provides: "Neuer zusammengesetzter Baustein: Bannerbild-Hintergrund mit Blur-Fallback + Scrim + Composition-Slot"
    - path: "frontend/src/components/ui/Card.tsx"
      provides: "Erweitert um Varianten glass/glassStrong + generischen Tönungs-Hook, komplett tokenbasiert"
    - path: "frontend/src/styles/tokens/components.css"
      provides: "Neue globale Tokens: Card-Glas-Fläche/-Rand/-Text (zwei Stufen), vier Episoden-Tönungen (Fläche+Rand je canon/filler/mixed/recap), Border-auf-dunkler-Fläche-Token"
    - path: "frontend/src/components/fansubs/EpisodeGlassCard.tsx"
      provides: "Nutzt Card variant=glass + Tönungs-Hook statt feature-lokaler --glass-*-Literale; DisclosureTrigger statt Eigenbau-Button"
    - path: "frontend/src/components/fansubs/ReleasePreviewRow.tsx"
      provides: "Nutzt Card variant=glassStrong, Avatar mit Kürzel-Fallback, Text statt roher <p>-Tags"
    - path: ".planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md"
      provides: "Finale Antwort auf die ursprüngliche Rückfrage inkl. aller Nachträge"
  key_links:
    - from: "frontend/src/components/fansubs/EpisodeGlassCard.module.css"
      to: "frontend/src/components/ui/Card.module.css"
      via: "beide referenzieren ausschließlich var(--card-glass-*)/var(--card-tint-*)-Tokens aus styles/tokens, keine rgba-/hsl-Literale mehr"
      pattern: "var(--card-glass"
    - from: "frontend/src/app/anime/[id]/AnimeDetailView.tsx"
      to: "frontend/src/components/ui/Card.tsx"
      via: "Info-Card nutzt Card variant=\"glass\" statt seiteneigenem .infoCard-CSS"
      pattern: "Card variant=\"glass\""
    - from: "frontend/src/components/fansubs/ReleasePreviewRow.tsx"
      to: "frontend/src/components/ui/Avatar.tsx"
      via: "fehlendes Gruppenlogo rendert Avatar-Kürzel statt nichts"
      pattern: "<Avatar"
    - from: ".planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md"
      to: "frontend/src/components/ui/Card.tsx"
      via: "Datei:Zeile-Beleg gegen den finalen Code dieses Auftrags"
      pattern: "Card variant"
---

<objective>
Setzt Schritt 3 vollständig um: zwei neue globale Bausteine (`LinkChip`, `BannerSection`),
Episodenzahl als `Badge variant="onMedia"`, Design-System-Pflichtnutzung auf `/anime` und
`/anime/[id]` (`PageHeader`/`Heading`/`Text`/`Button`/`MediaFrame`+`ResponsiveImage`/`ErrorState`)
UND die vier Nachträge der Entscheidung: öffentliche Glas-/Dunkel-Kartenoptik wird zu offiziellen
`Card`-Varianten (`glass`/`glassStrong`) mit einem generischen Tönungs-Hook, alle Werte (Flächen,
Ränder, Blur, die vier Episoden-Tönungen canon/filler/mixed/recap) wandern als globale Tokens nach
`styles/tokens`, `EpisodeGlassCard`/`ReleasePreviewRow` werden inhaltlich auf Grundbausteine
umgestellt, `FansubVersionBrowser` bleibt verhaltensgleich. Drei Storybook-Ebenen (Grundbaustein,
Zusammengesetzte Bausteine, Im Einsatz) bilden das Ergebnis vollständig ab. Beantwortet damit
`261102-cb2-EINORDNUNG.md` und führt sie am Ende nach.

Purpose: Schließt Schritt 3 des Storybook-"ganze Seiten"-Vorhabens ab. Die öffentliche Optik ist
keine Ausnahme/Fehler, sondern eine zweite offizielle Erscheinung derselben globalen Bausteine --
künftige Seiten (Fansub/Release) können `Card variant="glass"`/`LinkChip`/`BannerSection` direkt
wiederverwenden, ohne erneut rgba-Literale zu erfinden.

Output: `LinkChip`, `BannerSection`, `Card`-Erweiterung (+Tokens), vier aufgeteilte CSS-Module für
`[id]/page.module.css`, migrierte `AnimeDetailView.tsx`/`AnimeListView.tsx`/`AnimeListLoading.tsx`/
`EpisodeGlassCard.tsx`/`ReleasePreviewRow.tsx`, strukturell angepasstes (verhaltensgleiches)
`FansubVersionBrowser.tsx`, aktualisierte Tests, drei Storybook-Ebenen, aktualisierte Doku,
aktualisierte `261102-cb2-EINORDNUNG.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md
@.planning/quick/261102-hlg-team4s-schritt-3-pilot-bausteine-fuer-an/261102-hlg-CONTEXT.md
@.planning/quick/261102-hlg-team4s-schritt-3-pilot-bausteine-fuer-an/261102-hlg-RESEARCH.md
@.planning/quick/261102-hlg-team4s-schritt-3-pilot-bausteine-fuer-an/261102-hlg-RESEARCH-CARD.md
@.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md

<note>
Alle acht Decisions in 261102-hlg-CONTEXT.md (inkl. aller vier Nachträge) und alle "Empfehlungen"
in BEIDEN RESEARCH-Dateien sind LOCKED -- insbesondere die Architekturentscheidung aus
RESEARCH-CARD.md Abschnitt 10 (Card-Erweiterung statt neuer Baustein, generischer Tönungs-Hook
statt vier Fachnamen direkt in Card, `<li>`-Problem per Wrapper außerhalb von Card). Decision 8
ERSETZT die engere Umbau-Grenze aus Decision 7 ("nur Kartenfläche"): `EpisodeGlassCard.tsx` UND
`ReleasePreviewRow.tsx` werden inhaltlich umgebaut, `FansubVersionBrowser.tsx` bleibt
verhaltensgleich, darf aber strukturell angefasst werden.

Dieser Auftrag läuft als `ki-run`-Job (CLAUDE.md "Autonome Aufträge"): KEIN
`checkpoint:human-verify` irgendwo im Plan -- jede Verifikation ist `type="auto"` mit
automatisierten `<verify>`-Blöcken; die menschliche Prüfung ist die abschließende Live-UAT nach
diesem gesamten Auftrag, kein Zwischenschritt.
</note>

<interfaces>
LinkChip (frontend/src/components/ui/LinkChip.tsx, NEU):
```
export interface LinkChipProps {
  href: string
  children: ReactNode
  icon?: ReactNode
  count?: number
  tone?: 'glass' | 'scrim'  // default 'glass' (= heutige .genreChip-Optik); 'scrim' = .tagChip
  className?: string
}
```

BannerSection (frontend/src/components/ui/BannerSection.tsx, NEU):
```
export interface BannerSectionProps {
  imageUrl: string | null | undefined
  imageAlt: string
  withTextScrim?: boolean
  badge?: ReactNode
  children?: ReactNode   // z. B. AnimeBackdropRotator -- rendert IMMER, unabhängig von imageUrl
  className?: string
}
```

Card-Erweiterung (frontend/src/components/ui/Card.tsx, GEÄNDERT):
```
type CardVariant = 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat'
  | 'nested' | 'nestedFlat' | 'glass' | 'glassStrong'   // zwei NEUE Varianten
interface CardProps {
  variant?: CardVariant
  tintHue?: number   // NEU, generisch (0-360, CSS-Variable --card-tint-hue) -- NUR bei glass/glassStrong
                      // wirksam; EpisodeGlassCard übernimmt die canon=222/filler=2/mixed=272/recap=42-
                      // Zuordnung SELBST, Card selbst kennt keine Episodentyp-Namen.
  // title/description/header/footer/...HTMLAttributes<HTMLDivElement> unverändert
}
```
Das `<li>`-Problem von `EpisodeGlassCard` wird NICHT über einen `as`-Prop an `Card` gelöst,
sondern über einen dünnen, unstyled `<li>`-Wrapper AUSSERHALB von `Card`
(`<li style={{ listStyle: 'none' }}><Card variant="glass" tintHue={222}>...</Card></li>`).

Neue Tokens (frontend/src/styles/tokens/components.css, NEU, Werte 1:1 aus RESEARCH-CARD.md
Abschnitt 4 übernommen, NICHT neu erfunden):
```
--card-glass-surface: rgba(255, 255, 255, 0.06);
--card-glass-surface-strong: rgba(255, 255, 255, 0.10);
--card-glass-border: rgba(255, 255, 255, 0.14);
--card-glass-border-strong: rgba(255, 255, 255, 0.22);
--card-glass-text: rgba(255, 255, 255, 0.92);
--card-glass-text-muted: rgba(255, 255, 255, 0.60);
--card-glass-radius: 12px;
--card-glass-radius-strong: 6px;
--card-tint-canon-surface: hsl(222 70% 62% / 12%);
--card-tint-canon-border: hsl(222 70% 62% / 32%);
--card-tint-filler-surface: hsl(2 70% 62% / 12%);
--card-tint-filler-border: hsl(2 70% 62% / 32%);
--card-tint-mixed-surface: hsl(272 60% 64% / 12%);
--card-tint-mixed-border: hsl(272 60% 64% / 32%);
--card-tint-recap-surface: hsl(42 75% 58% / 14%);
--card-tint-recap-border: hsl(42 75% 58% / 34%);
--border-on-media: rgba(255, 255, 255, 0.15);         /* für .posterDivider-artige Trenner */
--border-on-media-strong: rgba(255, 255, 255, 0.25);  /* für .divider-artige Trenner */
```
Diese Namen sind Vorschläge aus der Recherche -- der ausführende Task darf sie bei Bedarf an
bestehende Namenskonventionen in `components.css` anpassen, MUSS aber alle Werte 1:1 aus
RESEARCH-CARD.md Abschnitt 4 (EpisodeGlassCard/ReleasePreviewRow-Fundwerte) übernehmen, keine neu
erfundenen Opazitäten.

Read_first (zentrale Vorbilder/Fundstellen, bereits recherchiert -- siehe BEIDE RESEARCH-Dateien
für exakte Zeilen/Werte):
- `261102-hlg-RESEARCH.md`: Badge/onMedia, ErrorState/PageHeader/MediaFrame+ResponsiveImage,
  FansubHeroSection-Scrim-Mechanismus, Test-Bruchstellen page.test.tsx/page.performance.test.ts.
- `261102-hlg-RESEARCH-CARD.md`: Card-Bestand (Abschnitt 1), Token-Landschaft (2),
  foreignVariableOverrides-Mechanik (3), EpisodeGlassCard komplett (4), ReleasePreviewRow komplett
  (5), FansubVersionBrowser-Struktur+Tests (6), weitere Kartenflächen auf /anime/[id] inkl. totem
  CSS (7), Admin-Card-vs-Glas-Werte (8), Architektur-Begründung (10).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: LinkChip-Grundbaustein erstellen</name>
  <files>
    frontend/src/components/ui/LinkChip.tsx, frontend/src/components/ui/LinkChip.module.css,
    frontend/src/components/ui/LinkChip.stories.tsx, frontend/src/components/ui/index.ts
  </files>
  <action>
    D-01: Lege `LinkChip.tsx` an mit der in `&lt;interfaces&gt;` festgelegten `LinkChipProps`.
    `Link` aus `next/link` direkt, `classNames` aus `./classNames` -- KEIN Import einer anderen
    katalogisierten `components/ui`-Komponente (sonst `catalogTaxonomy.test.ts` rot). `icon`/
    `count` als reine `&lt;span&gt;`s im eigenen Markup.

    CSS: gemeinsame Basis aus `genreChip`/`tagChip` (`frontend/src/app/anime/[id]/page.module.css:
    301-321`/`425-454`) -- `padding: 8px 14px`, `border-radius: 14px`, `font-size: 13px`,
    `font-weight: 500`, `box-shadow: var(--focus-ring)` bei `:focus-visible`. `tone="glass"`
    (Default) reproduziert `genreChip` 1:1, `tone="scrim"` reproduziert `tagChip` 1:1 (exakte
    rgba-Werte siehe RESEARCH.md). Diese beiden Chip-Töne selbst dürfen -- anders als `Card` --
    weiterhin direkt in `LinkChip.module.css` als Literale stehen, da `LinkChip` kein bereits
    bestehendes Token-Duplikat ist wie die Card-Flächen (RESEARCH.md referenziert KEINEN
    bestehenden globalen Token dafür); falls im Zuge von Task 3 (neue Tokens) ohnehin passende
    Border-Tokens entstehen (`--border-on-media`), DIESE für `tone="glass"`s Rand verwenden statt
    eines weiteren Literals.

    `index.ts`: `export * from './LinkChip'`.

    `LinkChip.stories.tsx`: `title: 'Grundbausteine/LinkChip'`, deutsche Args. Stories: `Standard`
    (glass), `DunklerScrim` (scrim), `MitZaehler`, `MitIcon`, `LangerText`.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/ui/catalogTaxonomy.test.ts
    </automated>
  </verify>
  <done>
    `LinkChip.tsx` existiert, exportiert aus `index.ts`, `catalogTaxonomy.test.ts` grün ohne neuen
    `EXCEPTIONS`-Eintrag, Storybook zeigt 5 Zustands-Stories.
  </done>
</task>

<task type="auto">
  <name>Task 2: BannerSection-Zusammengesetzten-Baustein erstellen</name>
  <files>
    frontend/src/components/ui/BannerSection.tsx, frontend/src/components/ui/BannerSection.module.css,
    frontend/src/components/ui/BannerSection.stories.tsx, frontend/src/components/ui/index.ts
  </files>
  <action>
    D-02: Lege `BannerSection.tsx` an mit der in `&lt;interfaces&gt;` festgelegten
    `BannerSectionProps`. Bild+Scrim rendern NUR wenn `imageUrl` gesetzt ist; `children` rendert
    IMMER. Hintergrund: `ResponsiveImage` (`fill`+`sizes="100vw"`) in `aria-hidden`-Wrapper, Filter
    `blur(34px) brightness(0.72) saturate(1.25)` + `transform: scale(1.15)` (analog
    `FansubHeroSection`s `heroBackdropTuning`, `frontend/src/app/fansubs/[slug]/page.module.css:
    44-51`) -- bewusst NICHT `PublicHeaderBackdrop` wiederverwenden (anderes
    Full-Bleed-Positionierungsmodell, würde `.heroContainer`/`.page`-Overflow-Vertrag gefährden;
    kurzer deutscher Kommentar dazu). Scrim: flächiger Overlay-`div`, `withTextScrim=false`
    moderate Deckkraft, `withTextScrim=true` nutzt `rgba(10,8,14,0.88)`-Rezept
    (`frontend/src/app/fansubs/[slug]/page.module.css:116-124`). `badge` in eigener
    `position:relative`-Schicht über dem Scrim. Übernimmt die Positionierungsrolle der heutigen
    `.heroBanner`-Box (`position:absolute; top:0; left:0; right:0; height:200px; overflow:clip;
    z-index:0`, mobil `height:100px`).

    `index.ts`: `export * from './BannerSection'`.

    `BannerSection.stories.tsx`: `title: 'Zusammengesetzte Bausteine/BannerSection'`,
    "Besteht aus:"-Beschreibung via `storybookDocsLink()` (Vorbild `ArtworkHero.stories.tsx:
    17-27`) -- verlinkt `Grundbausteine/ResponsiveImage`. Stories: `Standard`, `OhneBild`,
    `MitStarkemScrimUndBadge`.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/ui/storybookDescriptionLinks.regression.test.ts src/components/ui/catalogTaxonomy.test.ts
    </automated>
  </verify>
  <done>
    `BannerSection.tsx` existiert, exportiert, Storybook zeigt "Zusammengesetzte
    Bausteine/BannerSection" mit "Besteht aus"-Verlinkung, Regressions-Tests grün.
  </done>
</task>

<task type="auto">
  <name>Task 3: Neue globale Tokens für Card-Glas-Varianten, Tönungen und Border-auf-dunkler-Fläche anlegen</name>
  <files>frontend/src/styles/tokens/components.css</files>
  <action>
    D-05/D-06/D-07 (RESEARCH-CARD.md Abschnitt 2/4/10): Ergänze in `components.css` eine neue
    Sektion "Card -- öffentliche Glas-Varianten" mit allen in `&lt;interfaces&gt;` oben gelisteten
    Tokens, Werte 1:1 aus `EpisodeGlassCard.module.css:5-19` und `ReleasePreviewRow.module.css:
    2-5` übernommen (keine neu erfundenen Opazitäten/Farbtöne). Kommentiere fachlich, dass dies
    die globale Form der bisher feature-lokalen `--glass-*`-Variablen ist und WARUM zwei
    Deckkraft-Stufen existieren (EpisodeGlassCard 6% vs. ReleasePreviewRow 10% im Bestand).
    `--border-on-media`/`--border-on-media-strong`: Werte aus den heutigen `.posterDivider`
    (`rgba(255,255,255,0.15)`) / `.divider` (`rgba(255,255,255,0.25)`)-Trennern
    (`page.module.css:157-162`/`522-527`) übernommen -- Grundsatz D-06 (zweite offizielle
    Erscheinung, nicht Admin-Weinrot `--ui-line` ersetzen).
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/ui/foreignVariableOverrides.regression.test.ts
    </automated>
  </verify>
  <done>
    Alle in `&lt;interfaces&gt;` gelisteten Tokens existieren in `components.css` mit den exakt aus
    dem Bestand übernommenen Werten; `foreignVariableOverrides.regression.test.ts` bleibt grün
    (reine Token-Anlage, noch kein Verbraucher).
  </done>
</task>

<task type="auto">
  <name>Task 4: Card.tsx um glass/glassStrong-Varianten + Tönungs-Hook erweitern</name>
  <files>
    frontend/src/components/ui/Card.tsx, frontend/src/components/ui/Card.module.css,
    frontend/src/components/ui/Card.stories.tsx
  </files>
  <action>
    D-05/D-07 (RESEARCH-CARD.md Abschnitt 10, LOCKED Architekturentscheidung -- Card-Erweiterung,
    KEIN neuer Baustein): Erweitere `CardVariant`-Union um `'glass'`/`'glassStrong'`, `CardProps`
    um `tintHue?: number`. `glass`/`glassStrong` überschreiben Hintergrund/Rand/Radius/Text-Farbe
    per `var(--card-glass-*)` aus Task 3 (NICHT `--card-bg`/`--card-border-color` der Admin-
    Varianten anfassen). `glassStrong` nutzt die `-strong`-Tokens + `--card-glass-radius-strong`
    (6px), `glass` die Basis-Tokens + `--card-glass-radius` (12px) -- reproduziert den im Bestand
    bereits existierenden Zwei-Stufen-Unterschied (EpisodeGlassCard vs. ReleasePreviewRow) 1:1.
    `tintHue` setzt NUR bei `variant="glass"`/`"glassStrong"` eine CSS-Variable (z. B.
    `--card-tint-hue`), die `Card.module.css` optional für eine farbige Tönungsschicht nutzt --
    Card selbst kennt KEINE Episodentyp-Namen (canon/filler/mixed/recap bleiben
    `EpisodeGlassCard`-Domänenwissen, siehe Task 8). `backdrop-filter: blur(14px) saturate(1.15)`
    (glass) bzw. `blur(9px) saturate(1.65)` (glassStrong) aus dem Bestand übernehmen (RESEARCH-
    CARD.md Abschnitt 4/5). JEDER neue Wert in `Card.module.css` MUSS `var(--...)` sein (keine
    rgba-/hsl-/px-Literale), sonst verletzt `foreignVariableOverrides.regression.test.ts`.

    `Card.stories.tsx`: ergänze Stories für beide neuen Varianten, gerendert INNERHALB von
    `BannerSection` (aus Task 2, als Bannerhintergrund-Kontext) -- Desktop/Mobil-Viewport-
    Varianten. Ergänze eine Story "Glas auf Hintergrund" mit allen vier Tönungen
    (`tintHue={222}`/`{2}`/`{272}`/`{42}`) nebeneinander, deutsche Beschriftung (Haupthandlung,
    Filler, Gemischt, Rückblick) -- Abnahme-Pflicht D-07.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/ui/foreignVariableOverrides.regression.test.ts src/components/ui/catalogTaxonomy.test.ts &&
      docker compose exec team4sv30-storybook npm run build-storybook
    </automated>
  </verify>
  <done>
    `Card` rendert `variant="glass"`/`"glassStrong"` ausschließlich über `var(--card-glass-*)`-
    Tokens; `tintHue` färbt die Fläche/den Rand bei allen vier Testwerten sichtbar; beide
    Regressions-Wächter bleiben grün; Storybook zeigt die neuen Varianten inkl. "Glas auf
    Hintergrund" mit allen vier Tönungen.
  </done>
</task>

<task type="auto">
  <name>Task 5: 450-Zeilen-Split von [id]/page.module.css (reiner Umbau, keine Verhaltensänderung)</name>
  <files>
    frontend/src/app/anime/[id]/page.module.css, frontend/src/app/anime/[id]/page.poster.module.css,
    frontend/src/app/anime/[id]/page.infoCard.module.css,
    frontend/src/app/anime/[id]/page.episodes.module.css,
    frontend/src/app/anime/[id]/AnimeDetailView.styles.ts, frontend/src/app/anime/[id]/AnimeDetailView.tsx,
    frontend/src/app/anime/[id]/page.test.tsx
  </files>
  <action>
    CLAUDE.md/AGENTS.md "Übergroße Dateien beim Anfassen aufteilen": `page.module.css` wird in
    Task 6/7 inhaltlich geändert, MUSS deshalb vorher als reiner Umbau aufgeteilt werden (Vorbild:
    `EpisodeVersionEditor.styles.ts`-Muster, DECISIONS.md 2026-10-23 D-27).

    Verschiebe (pixelgleich, inkl. zugehöriger `@media`-Blöcke):
    - Bleibt Shell (`page.module.css`): `.page`, `.errorPage`, `.backLink`(+`a`,+`a:hover`),
      `.errorBox`, `.heroBanner`, `.bannerImage`, `.bannerOverlay`, `.breadcrumbsWrapper`,
      `.heroWrapper`, `.heroContainer`(+`@supports`), `.contentArea`.
    - NEU `page.poster.module.css`: `.posterColumn`, `.posterMeta`, `.posterDivider`,
      `.genresSection`, `.genresLabel`, `.posterWrapper`, `.poster`, `.posterWrapper::after`,
      `.posterStats`, `.posterEpisodes`, `.watchlistButton`, `.watchlistButtonActive`, `.genres`,
      `.genreChip`.
    - NEU `page.infoCard.module.css`: `.infoCard`, `.titleRow`, `.title`, `.titleLogo`, `.badges`,
      `.badge`, `.description`, `.tagsSection`, `.tagsLabel`, `.tagsList`, `.tagChip`, `.statsRow`,
      `.embyLink`, `.infoBanner`, `.relatedSection`, `.edgeNavigationOverlay`, `.divider`.
      **Entferne direkt beim Verschieben** (RESEARCH-CARD.md Abschnitt 7, totes CSS, 0 Treffer in
      `AnimeDetailView.tsx`): `.relatedRailWrapper`, `.relatedRailSection`.
    - NEU `page.episodes.module.css`: `.episodesSection`(+`h2`), `.emptyEpisodes`.
      **Entferne direkt beim Verschieben** (totes CSS, 0 Treffer): `.episodeList`, `.episodeItem`,
      `.episodeNumber`, `.episodeTitle`, `.episodeMeta`, `.episodeActions`, `.actionButton`.

    Lege `AnimeDetailView.styles.ts` an: importiert alle vier Module, `export default` eines per
    `mergeCssModules` (aus `@/lib/mergeCssModules`) verschachtelten `styles`-Objekts, exakt nach
    dem `EpisodeVersionEditor.styles.ts`-Muster. `AnimeDetailView.tsx` wechselt den Import auf
    `./AnimeDetailView.styles`. `AnimeDetailLoading.tsx` bleibt UNVERÄNDERT (nutzt nur `.page`/
    `.errorBox`, die in der Shell bleiben).

    `page.test.tsx`: Abwesenheits-Test für die toten Klassen (`.relatedRailSection`/
    `.episodeList` u. a.) erweitern, sodass er ALLE VIER Dateien liest/prüft, nicht nur
    `page.module.css`.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/page.performance.test.ts" &&
      wc -l src/app/anime/[id]/page.module.css src/app/anime/[id]/page.poster.module.css src/app/anime/[id]/page.infoCard.module.css src/app/anime/[id]/page.episodes.module.css
    </automated>
  </verify>
  <done>
    Alle vier CSS-Module ≤450 Zeilen; totes CSS (`.relatedRailSection`, `.episodeList` u. a.)
    entfernt; `AnimeDetailView.tsx` rendert pixelgleich; Tests grün; `AnimeDetailLoading.tsx`
    unverändert.
  </done>
</task>

<task type="auto">
  <name>Task 6: AnimeDetailView.tsx -- Banner- und Poster-Migration</name>
  <files>
    frontend/src/app/anime/[id]/AnimeDetailView.tsx, frontend/src/app/anime/[id]/page.module.css,
    frontend/src/app/anime/[id]/page.poster.module.css, frontend/src/app/anime/[id]/page.test.tsx,
    frontend/src/app/anime/[id]/page.performance.test.ts
  </files>
  <action>
    D-02: Ersetze `AnimeBackdropRotator` + den `.heroBanner`/`.bannerImage`/`.bannerOverlay`-Block
    durch `&lt;BannerSection imageUrl={coverUrl} imageAlt={anime.title + ' Hintergrundbild'}&gt;
    &lt;AnimeBackdropRotator fallbackImageURL={coverUrl} /&gt;&lt;/BannerSection&gt;` (aus
    `@/components/ui`). Entferne `.heroBanner`/`.bannerImage`/`.bannerOverlay` aus der Shell-Datei.

    D-03/D-04 (RESEARCH.md "Primäre Empfehlung"): Ersetze `&lt;Image&gt;` +
    `.posterStats`/`.posterEpisodes`-Overlay durch `&lt;MediaFrame aspectRatio={2/3}
    bottomBadge={episodeBadge} className={styles.poster}&gt;&lt;ResponsiveImage src={coverUrl}
    alt={anime.title} fill sizes="(max-width: 767px) 160px, (max-width: 1023px) 220px, 260px"
    priority unoptimized /&gt;&lt;/MediaFrame&gt;`. `episodeBadge`: `anime.max_episodes` truthy
    `&gt; 0` → `&lt;Badge variant="onMedia"&gt;` mit `'1 Folge'` bei Zählerwert `1`, sonst
    `` `${count} Folgen` ``; sonst `null`. Entferne `.posterStats`/`.posterEpisodes`. Bestehende
    `.poster`-Klasse (Rundung/Mask) als `className` an `MediaFrame` durchreichen.

    D-01: Genres-Liste → je Genre `&lt;LinkChip href={buildFilterHref('genre', genre)}&gt;
    {genre}&lt;/LinkChip&gt;` (Default `tone="glass"`). Leerfall-Platzhalter bleibt rohes
    `&lt;span&gt;` außerhalb von `LinkChip` mit neuer `.genrePlaceholder`-Klasse (statische Glas-
    Optik, kein Fokus/Hover). Entferne `.genreChip` aus `page.poster.module.css`.

    Testanpassungen `page.performance.test.ts` (RESEARCH.md Abschnitt 7): `poster`-Suche
    `element.type === Image` → `element.type === ResponsiveImage`; `hero`-Suche
    (`style?.backgroundImage`) → Suche nach `element.type === BannerSection`, prüft
    `element.props.imageUrl`; `reflection`-Suche (`.posterWrapper`) unverändert.

    Testanpassungen `page.test.tsx`: `.heroBanner`-CSS-Regex-Test liest jetzt
    `BannerSection.module.css` für den `.bannerSection`-Block; "12 Episodes" → "12 Folgen" +
    neuer Singular-Testfall (`max_episodes: 1` → "1 Folge", NICHT "1 Folgen") + neuer
    Ausblend-Testfall (`max_episodes: 0`/fehlend → kein Badge/Text). Genre-Chip-Assertionen von
    `item.type === Link` auf `item.type === LinkChip`.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/page.performance.test.ts"
    </automated>
  </verify>
  <done>
    `AnimeDetailView.tsx` rendert Banner/Poster/Genres über `BannerSection`/`MediaFrame`+
    `ResponsiveImage`/`Badge`/`LinkChip`; alte Klassen existieren in keiner CSS-Datei mehr; Tests
    grün inkl. neuer Singular-/Null-Fälle.
  </done>
</task>

<task type="auto">
  <name>Task 7: AnimeDetailView.tsx -- Info-Card-Migration auf Card variant="glass"</name>
  <files>
    frontend/src/app/anime/[id]/AnimeDetailView.tsx, frontend/src/app/anime/[id]/page.infoCard.module.css,
    frontend/src/app/anime/[id]/page.episodes.module.css, frontend/src/app/anime/[id]/page.test.tsx,
    frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx
  </files>
  <action>
    D-05 (ERSETZT den ursprünglich für diesen Task geplanten CSS-Variablen-Override-Ansatz
    vollständig -- NICHT per Override umsetzen): Die Info-Card (`&lt;div className={styles.
    infoCard}&gt;`) wird zu `&lt;Card variant="glass" className={styles.infoCard}&gt;` (aus
    `@/components/ui`, Task 4). Entferne die Hintergrund-/Rand-/Radius-/Blur-Deklarationen aus
    `.infoCard` in `page.infoCard.module.css` -- die verbleibende `.infoCard`-Klasse liefert nur
    noch Layout-Overrides (Grid-Position, Padding-Feinschliff falls nötig), die visuelle Fläche
    kommt jetzt von `Card`. Lesbarkeit mobil löst sich automatisch über die offizielle
    `glass`-Variante (keine CSS-Variablen-Fremd-Overrides mehr nötig).

    D-04: `&lt;h1&gt;` → `&lt;Heading level={1} className={styles.title}&gt;`; Beschreibung →
    `&lt;Text className={styles.description}&gt;`. Drei Pillen (Typ/Content-Type/Jahr) → je
    `&lt;Badge variant="neutral"&gt;`; entferne `.badge`-Regel (Basis + `@media`-Override)
    vollständig aus `page.infoCard.module.css` (kein Override-Muster mehr nötig). Kurzer
    deutscher Kommentar, warum `StatusBadge` bewusst NICHT auf `Badge` umgestellt wird
    (Scope-Grenze, beide bleiben getrennte "Badge-Familien"-Mitglieder).

    D-01: Tags-Liste → je Tag `&lt;LinkChip href={buildFilterHref('tag', tag)} tone="scrim"&gt;`.
    Entferne `.tagChip`.

    D-04: Emby-Link → `&lt;Button href={embySeriesUrl} target="_blank"
    rel="noopener noreferrer" variant="text" size="sm" leftIcon={&lt;ExternalLink size={14}
    aria-hidden="true" /&gt;}&gt;Emby&lt;/Button&gt;`. Entferne `.embyLink`.

    D-04: Episoden-Fehlerzustand → `&lt;ErrorState compact title="Episoden konnten nicht geladen
    werden" description="Die Episodenliste ist derzeit nicht verfügbar. Bitte laden Sie die Seite
    neu." /&gt;`. Entferne `.emptyEpisodes`.

    Testanpassungen `page.test.tsx`: Emby-Link-Test von `item.type === 'a'` auf
    `item.type === Button`; Tag-Chip-Tests von `item.type === Link` auf `item.type === LinkChip`;
    neuer Test, der prüft, dass die Info-Card über `item.type === Card` mit `props.variant ===
    'glass'` zu finden ist (statt der bisherigen reinen `className`-Suche).

    Abnahme-Pflicht: ergänze in `AnimeDetailView.stories.tsx` eine Story `OhneGenresUndTags`
    (`args: { anime: buildAnimeDetailFixture({ genres: [], tags: [] }) }`).
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run "src/app/anime/[id]/page.test.tsx" src/components/ui/foreignVariableOverrides.regression.test.ts
    </automated>
  </verify>
  <done>
    Info-Card nutzt `Card variant="glass"` statt seiteneigenem CSS; keine CSS-Variablen-Fremd-
    Overrides irgendwo; `Heading`/`Text`/`Badge`/`LinkChip`/`Button`/`ErrorState` statt
    Eigenbau-Markup; Tests grün; neue Story "Ohne Genres und Tags" rendert fehlerfrei.
  </done>
</task>

<task type="auto">
  <name>Task 8: EpisodeGlassCard -- Card variant="glass" + Tönungs-Hook + Grundbaustein-Umstellung</name>
  <files>
    frontend/src/components/fansubs/EpisodeGlassCard.tsx, frontend/src/components/fansubs/EpisodeGlassCard.module.css,
    frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx
  </files>
  <action>
    D-07/D-08 (RESEARCH-CARD.md Abschnitt 4/10): Ersetze die feature-lokalen `--glass-*`-
    Variablen-Deklarationen in `.card` durch `&lt;Card variant="glass" tintHue={tintHueFor(episode.
    filler_type)}&gt;` (aus `@/components/ui`), wobei `tintHueFor` eine neue, lokale Funktion in
    `EpisodeGlassCard.tsx` ist, die die Episodentyp→Hue-Zuordnung (canon=222, filler=2, mixed=272,
    recap=42, `unknown`→`undefined`/keine Tönung) hält -- GENAU diese Domänenzuordnung bleibt
    HIER, nicht in `Card`. Das äußere `&lt;li&gt;` bleibt als dünner, unstyled Wrapper AUSSERHALB
    von `Card` bestehen (`data-classification` wandert auf das `&lt;li&gt;`, `Card` bekommt KEIN
    `as`-Prop).

    Native Eigenbau-Elemente auf Grundbausteine (RESEARCH-CARD.md Abschnitt 4, exakte Zuordnung):
    `&lt;button&gt;`-Header → `DisclosureTrigger` (aus `@/components/ui`) -- `title`-Inhalt wird
    selbst ein `display:flex; justify-content:space-between`-Block aus Episodentitel-Text +
    Versionszähler-`Text`, damit `DisclosureTrigger`s eigener Pfeil ganz rechts bleibt (optisch
    identisch zum heutigen Layout, `DisclosureTrigger` setzt `aria-expanded` bereits selbst).
    Entferne den direkten `DisclosureIndicator`-Import (kommt jetzt über `DisclosureTrigger`).
    Drei `&lt;p&gt;`-Zeilen (Episodennummer/Titel/Klassifikation) → `Text`/`Heading` (Episodentitel
    als `Heading level={3}` falls fachlich passend, sonst `Text` -- gegen den tatsächlichen Code
    bei der Umsetzung entscheiden, keine Annahme vorwegnehmen). Versionszähler-`&lt;span&gt;` →
    `Text as="span"`.

    `EpisodeGlassCard.module.css`: nach dem Umbau bleiben nur noch Layout-Regeln (Innenabstand,
    Flex-Anordnung der Kopfzeile) -- alle Flächen-/Rand-/Blur-/Tönungswerte sind jetzt in `Card`
    (Task 4) + globalen Tokens (Task 3), nicht mehr hier. KEINE rgba-/hsl-Literale mehr in dieser
    Datei.

    `EpisodeGlassCard.stories.tsx` (NEU, Ebene 2 "Zusammengesetzte Bausteine", D-08): `title:
    'Zusammengesetzte Bausteine/EpisodenKarte'` (oder passender deutscher Name), "Besteht aus:"
    via `storybookDocsLink()` (`Grundbausteine/Card`, `Grundbausteine/DisclosureTrigger`,
    `Grundbausteine/Text`). Stories: je Episodenart (`Canon`/`Filler`/`Gemischt`/`Rueckblick`/
    `OhneKlassifikation`), `Aufgeklappt`/`Zugeklappt`, `EineVersion`/`MehrereVersionen`,
    `LangerTitel` -- gerendert auf Bannerhintergrund (`BannerSection` aus Task 2, konsistent mit
    Ebene-1-Stories).
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.windowing.test.tsx src/components/ui/foreignVariableOverrides.regression.test.ts &&
      docker compose exec team4sv30-storybook npm run build-storybook
    </automated>
  </verify>
  <done>
    `EpisodeGlassCard` nutzt `Card variant="glass"` + `tintHue`, keine feature-lokalen
    `--glass-*`-Literale mehr; `DisclosureTrigger` statt Eigenbau-Button; alle vier
    `FansubVersionBrowser*.test.tsx`-Dateien bleiben grün (Verhalten unverändert); neue Story-Datei
    zeigt alle Episodenarten/Zustände auf Bannerhintergrund.
  </done>
</task>

<task type="auto">
  <name>Task 9: ReleasePreviewRow -- Card variant="glassStrong" + Avatar-Fallback + Grundbaustein-Umstellung</name>
  <files>
    frontend/src/components/fansubs/ReleasePreviewRow.tsx, frontend/src/components/fansubs/ReleasePreviewRow.module.css,
    frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx
  </files>
  <action>
    D-08 (RESEARCH-CARD.md Abschnitt 5): Ersetze die feature-lokalen `--glass-*`-Variablen durch
    `&lt;Card variant="glassStrong"&gt;` (aus `@/components/ui`, Task 4). Pro-Gruppe-Bild →
    `&lt;Avatar src={logoURL} label={group.name} size="sm"&gt;` (aus `@/components/ui`) statt
    `&lt;Image&gt;` -- löst GLEICHZEITIG die laut Decision verlangte "ohne Logo (Kürzel/Avatar)"-
    Darstellung: `Avatar` zeigt bei fehlendem `src` automatisch Initialen aus `label` (RESEARCH-
    CARD.md Abschnitt 5/Assumption A3 -- dies ist eine echte, von der Decision VERLANGTE
    Verhaltenserweiterung, kein Bug: heute wird bei fehlendem Logo gar nichts gerendert).

    Fünf `&lt;p&gt;`-Zeilen (`groupName`/`releaseName`/`techLine`/`extrasLine`/`dateLine`) →
    `Text` (Variante gegen den tatsächlichen visuellen Bedarf bei der Umsetzung wählen,
    `groupName` hat laut Recherche keine exakt passende bestehende Variante -- `variant="body"`
    plus bewusste, dokumentierte Abweichung ist akzeptabel, siehe RESEARCH-CARD.md Open Question
    3). `&lt;span&gt;` (`coopLabel`) → `Text as="span"` (bewusst KEIN `Badge`, der bestehende
    Kommentar in `ReleasePreviewRow.module.css:68` sagt ausdrücklich "reiner Text, kein
    Chip/Badge/Rahmen" -- das bleibt erhalten). `&lt;Button href=...&gt;` bleibt unverändert
    (bereits globaler Baustein).

    `ReleasePreviewRow.module.css`: nach dem Umbau nur noch Layout-Regeln, KEINE rgba-Literale
    mehr.

    `ReleasePreviewRow.stories.tsx` (NEU, Ebene 2, D-08): `title: 'Zusammengesetzte
    Bausteine/Release-Versionszeile'` (oder passender Name), "Besteht aus:" via
    `storybookDocsLink()` (`Grundbausteine/Card`, `Grundbausteine/Avatar`, `Grundbausteine/Text`,
    `Zusammengesetzte Bausteine/Button`). Stories: `MitGruppenlogo`, `OhneLogo` (zeigt das neue
    Avatar-Kürzel), `Koop` (≥2 Gruppen), `MitAllenExtras` (Bilder+Notizen+Karaoke),
    `OhneTechnikUndDatum` -- auf Bannerhintergrund.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.windowing.test.tsx src/components/ui/foreignVariableOverrides.regression.test.ts &&
      docker compose exec team4sv30-storybook npm run build-storybook
    </automated>
  </verify>
  <done>
    `ReleasePreviewRow` nutzt `Card variant="glassStrong"` + `Avatar` (mit echtem Kürzel-Fallback
    bei fehlendem Logo) + `Text`, keine feature-lokalen Glas-Literale mehr; alle vier
    `FansubVersionBrowser*.test.tsx`-Dateien bleiben grün; neue Story-Datei deckt alle im Code
    vorkommenden Zustände ab.
  </done>
</task>

<task type="auto">
  <name>Task 10: FansubVersionBrowser -- strukturelle Korrektur (verhaltensgleich)</name>
  <files>frontend/src/components/fansubs/FansubVersionBrowser.tsx</files>
  <action>
    D-08 (RESEARCH-CARD.md Abschnitt 6): Ersetze das rohe `&lt;h2&gt;Episoden ({windowing.
    episodeCount})&lt;/h2&gt;` (Zeile ~299) durch `&lt;Heading level={2}&gt;` (aus
    `@/components/ui`). Keine weitere strukturelle Änderung -- Filter-/Gruppenwechsel-/Windowing-
    Logik, `ErrorState`/`EmptyState`/`LoadingState`-Einsatzstellen und alle Props/State bleiben
    UNVERÄNDERT (Decision: "FansubVersionBrowser bleibt verhaltensgleich"). Zähle die Datei nach
    dieser Änderung real neu (CLAUDE.md 450-Zeilen-Pflicht) -- bei `EpisodeGlassCard`/
    `ReleasePreviewRow`-Props-Änderungen aus Task 8/9 ggf. nötige Aufrufstellen-Anpassungen hier
    nachziehen (z. B. falls `tintHueFor`/neue Props andere Importe in `FansubVersionBrowser.tsx`
    selbst nötig machen).
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx src/components/fansubs/FansubVersionBrowser.windowing.test.tsx &&
      wc -l src/components/fansubs/FansubVersionBrowser.tsx
    </automated>
  </verify>
  <done>
    `FansubVersionBrowser.tsx` ≤450 Zeilen, nutzt `Heading` für die Episoden-Überschrift, alle vier
    Testdateien grün (Filter/Gruppenwechsel/Windowing unverändert).
  </done>
</task>

<task type="auto">
  <name>Task 11: AnimeListView.tsx + AnimeListLoading.tsx -- Design-System-Pflichtnutzung</name>
  <files>
    frontend/src/app/anime/AnimeListView.tsx, frontend/src/app/anime/AnimeListLoading.tsx,
    frontend/src/app/anime/page.module.css
  </files>
  <action>
    D-04: Ersetze in BEIDEN Zweigen von `AnimeListView.tsx` den `kicker`/`title`/`subtitle`-Block
    durch `PageHeader` (aus `@/components/ui`). Erfolgsfall: `&lt;PageHeader title="Anime"
    description={response.meta.total.toLocaleString('de-DE') + ' Einträge'} /&gt;` (entfernt
    "P0 MVP" und den Entwicklertext vollständig). Fehlerfall: `&lt;PageHeader title="Anime" /&gt;`
    gefolgt von `&lt;ErrorState title="Liste konnte nicht geladen werden" description="Die
    Anime-Liste konnte aktuell nicht geladen werden. Bitte laden Sie die Seite neu." /&gt;`
    (ersetzt `.errorBox`).

    `AnimeListLoading.tsx` (teilt dieselben CSS-Klassen): `&lt;PageHeader title="Anime" /&gt;` +
    `&lt;LoadingState title="Anime wird geladen" description="Bitte einen Moment warten." /&gt;`.

    Entferne `.header`/`.kicker`/`.title`/`.subtitle`/`.errorBox` aus `page.module.css` (Liste) --
    danach bleibt nur `.page` übrig.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-storybook npm run build-storybook
    </automated>
  </verify>
  <done>
    `AnimeListView.tsx`/`AnimeListLoading.tsx` rendern `PageHeader`+`ErrorState`/`LoadingState`;
    "P0 MVP" existiert nirgends mehr; `page.module.css` (Liste) enthält nur noch `.page`.
  </done>
</task>

<task type="auto">
  <name>Task 12: Drei-Ebenen-Storybook -- "Im Einsatz" Seiten-Stories aktualisieren (ausgeloggt/eingeloggt, Desktop/Mobil)</name>
  <files>
    frontend/src/app/anime/AnimeListView.stories.tsx, frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx
  </files>
  <action>
    D-08 Ebene 3: Ergänze in BEIDEN bestehenden Pilot-Story-Dateien (aus Quick-Task 261102-cb2)
    je eine eingeloggte Variante zusätzlich zu den bestehenden Fixture-Stories -- nutzt den
    bereits vorhandenen Rollen-Umschalter (`frontend/.storybook/mocks/roleSimulation.ts`,
    `team4sRole`-Global aus dem Vorgänger-Auftrag). Für `AnimeDetailView.stories.tsx`: da der
    Rollen-Umschalter bereits global in `preview.tsx` aktiv ist, reicht eine kurze
    Dokumentations-Ergänzung in der Autodocs-Beschreibung, dass der Toolbar-Rollenregler
    "Eingeloggt ansehen" demonstriert (`WatchlistAddButton`-Zustand ändert sich bereits sichtbar);
    KEINE neue Story nötig, wenn der Umschalter global wirkt -- NUR falls die Recherche/Umsetzung
    zeigt, dass eine explizite zweite Story-Variante nötig ist (z. B. weil Storybook-Parameter pro
    Story statt global greifen), diese ergänzen. Stelle sicher, dass Desktop/Mobil-Viewports
    (bereits vorhandene `TEAM4S_VIEWPORTS`) für mindestens die `Normal`-Story beider Seiten in der
    Autodocs-Beschreibung als geprüfte Kombination dokumentiert sind.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-storybook npm run build-storybook &&
      docker compose exec team4sv30-storybook npx test-storybook --url http://127.0.0.1:6006 -- -t "Anime-Liste|Anime-Detail"
    </automated>
  </verify>
  <done>
    Beide Pilot-Seiten-Stories demonstrieren ausgeloggten UND eingeloggten Zustand (via
    Rollen-Umschalter), Desktop/Mobil-Abdeckung dokumentiert; Render-Smoke-Test grün.
  </done>
</task>

<task type="auto">
  <name>Task 13: Dokumentation -- CLAUDE.md + docs/FRONTEND_ARCHITEKTUR.md nachführen</name>
  <files>CLAUDE.md, docs/FRONTEND_ARCHITEKTUR.md</files>
  <action>
    Zähle nach Abschluss der Tasks 1-12 die tatsächliche Story-Anzahl neu (`grep -c "title:
    'Grundbausteine/"`/`"title: 'Zusammengesetzte Bausteine/"` über
    `frontend/src/components/ui/*.stories.tsx` UND `frontend/src/components/fansubs/*.stories.tsx`
    -- NICHT die alte Zahl aus dem Vorgänger-Auftrag übernehmen). `CLAUDE.md` und
    `docs/FRONTEND_ARCHITEKTUR.md`: korrigiere beide Zähler auf denselben, tatsächlich
    nachgezählten Wert (behebt die bereits vor diesem Auftrag bestehende Diskrepanz zwischen
    beiden Dateien im selben Zug) und ergänze `LinkChip`/`BannerSection` (mit Zweckbeschreibung)
    sowie die neuen `Card`-Varianten `glass`/`glassStrong` und die beiden neuen
    "Zusammengesetzte Bausteine"-Einträge (EpisodenKarte/Release-Versionszeile aus
    `components/fansubs/`). Ergänze einen Satz zum neuen Grundsatz "öffentliche Optik ist eine
    zweite offizielle Erscheinung, kein Admin-Abweichler" (D-06) im Abschnitt zum Design-System.
  </action>
  <verify>
    <automated>
      cd frontend &&
      grep -c "LinkChip\|BannerSection" ../CLAUDE.md ../docs/FRONTEND_ARCHITEKTUR.md &&
      grep -c "glass" ../CLAUDE.md ../docs/FRONTEND_ARCHITEKTUR.md
    </automated>
  </verify>
  <done>
    `CLAUDE.md` und `docs/FRONTEND_ARCHITEKTUR.md` nennen identische, nachgezählte Story-Zahlen
    und erwähnen alle neuen Bausteine/Varianten sowie den öffentliche-Optik-Grundsatz.
  </done>
</task>

<task type="auto">
  <name>Task 14: Vollständige Verifikation + Live-Nachweis /anime und /anime/[id] (automatisiert, kein Zwischen-Checkpoint)</name>
  <files>(keine neuen Datei-Änderungen erwartet)</files>
  <action>
    Voller Regressionslauf (`npm run typecheck && npm run lint && npm test` im
    `team4sv30-frontend`-Container), `npx vitest run src/components/ui/catalogTaxonomy.test.ts
    src/components/ui/storybookDescriptionLinks.regression.test.ts
    src/components/ui/foreignVariableOverrides.regression.test.ts`, `npm run build-storybook` +
    `npx test-storybook --url http://127.0.0.1:6006 --ci` im `team4sv30-storybook`-Container.
    450-Zeilen-Check (`wc -l`) auf jede inhaltlich geänderte `.ts`/`.tsx`/`.css`-Datei aus
    `files_modified` (Ausnahme `*.stories.tsx`/`*.fixtures.ts`/`*.test.ts(x)`). Grep-Sweep: `grep
    -rn "P0 MVP\|Episodes\b" frontend/src/app/anime` (0 Treffer erwartet außerhalb Historie/
    Kommentare), `grep -rn "rgba(\|hsl(" frontend/src/components/fansubs/EpisodeGlassCard.module.css
    frontend/src/components/fansubs/ReleasePreviewRow.module.css frontend/src/components/ui/
    Card.module.css` (0 Treffer erwartet -- alle Werte jetzt Tokens).

    Ermittle eine echte, vorhandene Anime-ID über die laufende API (NICHT blind `id=1` annehmen).
    `curl -s -o /dev/null -w "%{http_code}"` gegen `http://192.168.235.196:3000/anime` und
    `http://192.168.235.196:3000/anime/&lt;echte-id&gt;` (beide erwartet 200). Zusätzlich `curl -s
    http://192.168.235.196:3000/anime/&lt;echte-id&gt;` und per `grep` prüfen, dass die Antwort
    "Folge"/"Folgen" enthält (sofern die Test-Anime Episoden hat) und KEIN "P0 MVP" enthält.
  </action>
  <verify>
    <automated>
      cd frontend &&
      docker compose exec team4sv30-frontend npm run typecheck &&
      docker compose exec team4sv30-frontend npm run lint &&
      docker compose exec team4sv30-frontend npm test &&
      docker compose exec team4sv30-storybook npm run build-storybook &&
      docker compose exec team4sv30-storybook npx test-storybook --url http://127.0.0.1:6006 --ci
    </automated>
  </verify>
  <done>
    Automatisierter Vollregressionslauf grün, 450-Zeilen-Check ohne Befund, Grep-Sweep ohne
    unerwartete Treffer, `curl`-Nachweis für `/anime` und eine echte `/anime/&lt;id&gt;` (HTTP 200,
    erwartete Marker vorhanden/abwesend). Rein visuelle Punkte (optischer Eindruck, mobiler
    Kontrast, Tönungsfarben) werden im SUMMARY als Checkliste für die abschließende menschliche
    Live-UAT dokumentiert -- kein blockierender Zwischenschritt in diesem autonomen Lauf.
  </done>
</task>

<task type="auto">
  <name>Task 15 (letzter Task): 261102-cb2-EINORDNUNG.md vollständig nachführen</name>
  <files>.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md</files>
  <action>
    Aktualisiere die bestehenden Tabellenzeilen auf den TATSÄCHLICHEN finalen Code dieses
    gesamten Auftrags (261102-hlg) -- vor dem Schreiben `grep -n` gegen die finalen `AnimeListView.
    tsx`/`AnimeListLoading.tsx`/`AnimeDetailView.tsx`/`Card.tsx`/`EpisodeGlassCard.tsx`/
    `ReleasePreviewRow.tsx` fahren (NICHT Zwischenstände übernehmen).

    `/anime`-Tabelle: "Header/Kicker-Text" → "vorhandener zusammengesetzter Baustein (`PageHeader`)".
    "Fehlerzustand" → "vorhandener zusammengesetzter Baustein (`ErrorState`)".

    `/anime/[id]`-Tabelle: "Banner-Hintergrund" → "neuer zusammengesetzter Baustein
    (`BannerSection`)". "Poster-Bild" → "vorhandene Grundbausteine (`MediaFrame`+
    `ResponsiveImage`)". "Poster-Statistik-Overlay" → "vorhandener Grundbaustein (`Badge`,
    `onMedia`)". "Genres-Chip-Liste"/"Tags-Liste" → "neuer Grundbaustein (`LinkChip`)".
    "Status-/Typ-/Jahr-Badges" → `StatusBadge` bleibt Fachbaustein, die drei übrigen nutzen
    `Badge variant="neutral"`. "Titel + Logo" → `&lt;h1&gt;`-Teil wird "vorhandener Grundbaustein
    (`Heading`)". "Beschreibung" → "vorhandener Grundbaustein (`Text`)". "Emby-Link" →
    "vorhandener Grundbaustein (`Button`, Link-Modus)". "Episoden-Fehlerzustand" → "vorhandener
    zusammengesetzter Baustein (`ErrorState`, kompakt)". **NEU hinzufügen:** eine Zeile
    "Info-Karte (Flächenoptik)" → "neue Card-Variante (`Card variant=\"glass\"`)", mit Datei:Zeile
    des finalen `&lt;Card variant="glass"&gt;`-Aufrufs.

    Ergänze einen NEUEN Abschnitt "Weitere öffentliche Karten-/Glas-Flächen außerhalb dieses
    Auftrags" (D-05-Abnahme-Pflicht: andere Seiten mit derselben Optik, die künftig folgen) mit
    mindestens: `FansubHeroSection`/`/fansubs/[slug]`-Scrim-Mechanismus (Datei:Zeile), sowie jede
    weitere im Verlauf dieses Auftrags per Grep gefundene Glas-/Dunkel-Fläche außerhalb von
    `/anime`/`/anime/[id]`, die NICHT umgestellt wurde (z. B. `/archiv`/`/members/ranking`, falls
    die Recherche dort etwas fand -- gegen `261102-hlg-RESEARCH-CARD.md` prüfen, welche Seiten
    bereits grob erfasst wurden; falls keine vertiefte Prüfung vorlag, das explizit als "nicht
    tiefenanalysiert, nur als Kandidat vermerkt" kennzeichnen statt eine Vollständigkeit zu
    behaupten, die nicht belegt ist).

    Ersetze den Kopfzeilen-Satz "Trifft KEINE Entscheidung über neue Bausteine ..." durch einen
    Hinweis, dass Schritt 3 (261102-hlg) die Rückfrage vollständig beantwortet hat. Ergänze
    unterhalb des bestehenden Abschnitts "Rückfrage an den Menschen" (NICHT löschen) einen neuen
    Abschnitt "Antwort umgesetzt (261102-hlg)" mit allen Auflösungen: (1) Status-/Typ-/Jahr-Badges
    → teilweise übernommen; (2) Poster-Statistik-Overlay → `Badge`+`MediaFrame`; (3) Genres-/Tags-
    Chip-Listen → `LinkChip`; (4) öffentliche Karten-/Glas-Optik → `Card variant="glass"/
    "glassStrong"` + globale Tokens, `EpisodeGlassCard`/`ReleasePreviewRow` darauf umgestellt.
  </action>
  <verify>
    <automated>
      test -f .planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md &&
      grep -c "LinkChip\|BannerSection\|Card variant\|glassStrong" .planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md &&
      grep -c "Antwort umgesetzt" .planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md
    </automated>
  </verify>
  <done>
    `261102-cb2-EINORDNUNG.md` spiegelt den finalen Code dieses gesamten Auftrags wider (Datei:
    Zeile gegen den tatsächlichen finalen Stand geprüft); neuer Abschnitt "Antwort umgesetzt
    (261102-hlg)" dokumentiert alle vier Auflösungen; neuer Abschnitt zu weiteren öffentlichen
    Karten-Flächen außerhalb des Scopes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Browser ↔ öffentliche Anime-Seiten | Rein lesende, öffentliche Seiten -- dieser Auftrag ändert nur die Darstellungsschicht, keine neue Datenquelle. |
| LinkChip/Avatar-Href ↔ `/suche`-Route | `buildFilterHref` baut weiterhin über `URLSearchParams` dieselbe Such-URL -- `LinkChip` reicht `href`/`children` nur 1:1 durch. |
| Emby-Link (`target="_blank"`) ↔ externe Domain | Reverse-Tabnabbing-Angriffsfläche bei externen `target="_blank"`-Links ohne `rel="noopener noreferrer"`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|--------------|------------------|
| T-261102hlg-01 | Tampering | `Button`-Link-Modus für den Emby-Link | mitigate | `target="_blank"`/`rel="noopener noreferrer"` werden 1:1 an `Button`s natives `<a>` durchgereicht; Task 7s `<verify>` prüft den Emby-Link-Test. |
| T-261102hlg-02 | Information Disclosure | `LinkChip`-Href (Genre-/Tag-Namen) | accept | Identisch zum bisherigen Verhalten, dieselbe `URLSearchParams`-Kodierung. |
| T-261102hlg-03 | Tampering (Supply Chain) | `npm install` | accept | Keine neuen Pakete, reine Wiederverwendung vorhandener Abhängigkeiten. |
| T-261102hlg-04 | Denial of Service | CSS-Modul-Split (Task 5) | accept | Reiner Build-/Bundling-Vorgang, `mergeCssModules` bereits produktiv etabliert. |
| T-261102hlg-05 | Information Disclosure | `Avatar`-Kürzel-Fallback (`ReleasePreviewRow`, Task 9) | accept | `label` stammt aus bereits öffentlich sichtbaren Gruppennamen (keine neue Datenquelle), `Avatar` ist bereits für diesen Zweck etabliert. |
</threat_model>

<verification>
Nach Abschluss aller 15 Tasks:
- `docker compose exec team4sv30-frontend npm run typecheck && npm run lint && npm test` (voller
  Lauf) ist grün.
- `docker compose exec team4sv30-storybook npm run build-storybook && npx test-storybook --url
  http://127.0.0.1:6006 --ci` ist grün (voller Story-Katalog inkl. `LinkChip`/`BannerSection`/
  `Card`-Glas-Varianten/`EpisodeGlassCard`/`ReleasePreviewRow`-Stories).
- `npx vitest run src/components/ui/catalogTaxonomy.test.ts
  src/components/ui/storybookDescriptionLinks.regression.test.ts
  src/components/ui/foreignVariableOverrides.regression.test.ts` ist grün.
- Jede inhaltlich geänderte Produktionsdatei ≤450 Zeilen.
- `grep -rn "P0 MVP" frontend/src/app/anime` liefert keinen Treffer mehr.
- `grep -rn "rgba(\|hsl(" frontend/src/components/fansubs/EpisodeGlassCard.module.css
  frontend/src/components/fansubs/ReleasePreviewRow.module.css` liefert keinen Treffer mehr.
- Live-Nachweis gegen den laufenden Dev-Server für `/anime` und `/anime/<echte-id>` im SUMMARY.md
  dokumentiert.
- `261102-cb2-EINORDNUNG.md` ist aktualisiert, enthält "Antwort umgesetzt (261102-hlg)".
</verification>

<success_criteria>
- `LinkChip`, `BannerSection` existieren; `Card` hat zwei neue Glas-Varianten + Tönungs-Hook; alle
  Werte stammen aus globalen Tokens in `styles/tokens` (keine rgba-/hsl-Literale mehr in
  `Card.module.css`/`EpisodeGlassCard.module.css`/`ReleasePreviewRow.module.css`).
- `/anime` und `/anime/[id]` enthalten keinen Eigenbau-Header/-Fehlerbox/-Badge/-Chip/-Karte mehr,
  wo ein globaler Baustein existiert.
- `EpisodeGlassCard`/`ReleasePreviewRow` sind auf Grundbausteine umgestellt, `ReleasePreviewRow`
  zeigt einen Avatar-Kürzel-Fallback bei fehlendem Logo. `FansubVersionBrowser` bleibt
  verhaltensgleich (alle vier Testdateien grün).
- Drei Storybook-Ebenen sind sichtbar: Grundbaustein (Card-Glas-Varianten+Tönungen auf
  Bannerhintergrund), Zusammengesetzte Bausteine (EpisodenKarte/Release-Versionszeile mit allen
  Zuständen), Im Einsatz (komplette Pilot-Seiten, ausgeloggt/eingeloggt).
- `261102-cb2-EINORDNUNG.md` beantwortet die ursprüngliche Rückfrage vollständig, inkl. der vier
  Nachträge, mit dem tatsächlichen finalen Code.
</success_criteria>

<output>
Erzeuge `.planning/quick/261102-hlg-team4s-schritt-3-pilot-bausteine-fuer-an/261102-hlg-SUMMARY.md`
nach Abschluss aller Tasks (Standard-GSD-Executor-Output).
</output>

    