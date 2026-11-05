import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Permanenter, ausnahmeloser Rückfall-Wächter für die neun zusammengesetzten Komposit-Dateien der
 * fünf Pilot-Bausteine der öffentlichen Anime-Detailseite (Anime-Kopf, Episoden-Bereich,
 * Gruppenkarte/-auswahl, Release-Zeile, Randnavigation): keiner von ihnen darf eigenes
 * `display:flex`/`display:grid`/`grid-template`/`gap:`/`padding:`/`margin`/`border`/
 * `border-radius`/`background`/`box-shadow`/eine feste `width`/`height` deklarieren oder eine
 * private Grundbaustein-Variable fremd setzen -- genau dafür existieren die generischen
 * Grundbausteine `Stack`/`Cluster`/`Card`s `padding`-/`seamless`-Prop/`Avatar`s `bordered`-Prop/
 * `ResponsiveImage`s `roundedThumbnail`-Prop. `detailStyleSystem.guard.test.ts` prüft
 * ausschließlich die Seiten-CSS (`page.module.css`/`page.episodes.module.css`s Seiten-Anordnung),
 * nie diese Baustein-Dateien selbst -- dieser Wächter schließt genau diese Lücke, nur für die
 * neun hier gelisteten Dateien (kein repo-weiter Sweep).
 *
 * Diese Prüfung kannte früher eine selektor-genaue Ausnahmeliste für Fälle, die ein
 * Grundbaustein angeblich nicht abbilden konnte. Eine genauere Prüfung stellte fest, dass
 * jede dieser Ausnahmen tatsächlich eine fehlende, nachrüstbare Grundbaustein-Fähigkeit war --
 * seitdem wurden alle betroffenen Fälle auf echte `Stack`/`Cluster`/`Card`-Erweiterungen
 * zurückgeführt (Rhythmus-Array-Modus, Haltepunkt-Umkehr, Schwebe-Overlay-Modus, Zweck-benannte
 * Polsterungs-Rezepte). Die Ausnahmeliste selbst ist damit ersatzlos entfallen: ein Treffer eines
 * verbotenen Musters ist IMMER ein Verstoß, ohne jede Rückfallmöglichkeit auf eine dokumentierte
 * Einzelfall-Duldung. Der Wächter deckt alle neun real existierenden Komposit-Dateien der
 * fünf Pilot-Bausteine ab (nicht nur eine Teilmenge) und alle real vorkommenden Eigenschaften
 * (Rand/Rundung/Fläche/Schatten/feste Größe neben `display:flex`/`display:grid`).
 *
 * WICHTIG: `Stack.module.css`/`Cluster.module.css`/`SplitLayout.module.css`/`Divider.module.css`
 * werden hier bewusst NICHT geprüft -- das SIND die Grundbausteine, ihr eigenes Layout-CSS ist
 * genau ihr Daseinszweck, kein Verstoß. Ebenfalls bewusst NICHT geprüft (und NICHT hinzugefügt):
 * `StatusBadge.module.css`/`AnimeRelations.module.css` (werden zusätzlich außerhalb der fünf
 * Pilot-Bausteine im Admin-/Profil-Bereich verwendet, eine Migration würde die Grenze "andere
 * Seiten nicht in diesem Auftrag umbauen" verletzen) sowie `AnimeBackdropRotator.module.css`
 * (rendert den Banner-Hintergrund, ist kein Teil eines der fünf benannten Pilot-Komposite).
 *
 * Erkennung erfolgt zeilenweise über einen einfachen Selektor-Stack (keine vollständige
 * CSS-Parser-Abhängigkeit): jede Zeile, die eine Selektor-/@media-Kopfzeile öffnet (endet auf
 * `{`), wird auf den Stack gelegt; `}` allein auf einer Zeile poppt ihn. Mehrzeilige
 * Komma-Selektoren (z. B. `.description,\n.tagsSection {`) werden über einen Zwischenpuffer
 * zusammengefügt. Der Selektor selbst wird nur noch für die Fehlermeldung mitgeführt (welcher
 * Selektor genau verstößt), nicht mehr für eine Ausnahme-Prüfung.
 */

interface GuardedFile {
  /** Kurzer, stabiler Schlüssel -- nur noch für die Fehlermeldung in `Violation.file` relevant. */
  key: string
  path: string
}

const GUARDED_COMPOSITE_FILES: GuardedFile[] = [
  { key: 'AnimeDetailHero', path: join(process.cwd(), 'src/app/anime/[id]/AnimeDetailHero.module.css') },
  { key: 'ReleasePreviewRow', path: join(process.cwd(), 'src/components/fansubs/ReleasePreviewRow.module.css') },
  { key: 'EpisodeGlassCard', path: join(process.cwd(), 'src/components/fansubs/EpisodeGlassCard.module.css') },
  { key: 'AnimeEdgeNavigation', path: join(process.cwd(), 'src/components/anime/AnimeEdgeNavigation.module.css') },
  { key: 'FansubVersionBrowser', path: join(process.cwd(), 'src/components/fansubs/FansubVersionBrowser.module.css') },
  { key: 'FansubGroupContext', path: join(process.cwd(), 'src/components/fansubs/FansubGroupContext.module.css') },
  { key: 'FansubGroupPicker', path: join(process.cwd(), 'src/components/fansubs/FansubGroupPicker.module.css') },
  { key: 'PageEpisodes', path: join(process.cwd(), 'src/app/anime/[id]/page.episodes.module.css') },
  { key: 'WatchlistAddButton', path: join(process.cwd(), 'src/components/watchlist/WatchlistAddButton.module.css') },
  // Deliberately NOT Stack/Cluster/SplitLayout/Divider.module.css -- those ARE the
  // Grundbausteine and are allowed to declare their own layout CSS. Deliberately NOT
  // StatusBadge/AnimeRelations/AnimeBackdropRotator.module.css -- siehe Modulkommentar oben
  // (Fremdverwendung außerhalb der fünf Pilot-Bausteine bzw. kein Teil eines Pilot-Komposits).
]

/** Entfernt /* ... *‍/-Blockkommentare, ersetzt dabei jedes Zeichen außer Zeilenumbrüchen durch
 *  ein Leerzeichen -- Zeilennummern bleiben dadurch für Fehlermeldungen exakt erhalten, UND
 *  Kommentartext (der ausgiebig über genau die hier verbotenen Eigenschaften -- "padding:",
 *  "display:flex" usw. -- REDET, ohne sie zu deklarieren) kann nie fälschlich als Verstoß zählen. */
function stripBlockComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
}

/** Prüft, ob jeder Werte-Token einer padding/margin-Deklaration auf 0 reduziert ("0", "0px",
 *  "0rem", "0%") -- ein reiner Rücksetzer (z. B. eine <ul>-Browser-Standardpolsterung oder ein
 *  <p>-ähnliches Standard-margin für -webkit-line-clamp) ist kein "eigenes Layout-CSS", das einen
 *  Grundbaustein dupliziert, sondern hebt nur einen ungewollten UA-Standard auf. */
function isAllZeroDeclaration(declText: string, propertyBase: 'padding' | 'margin'): boolean {
  const pattern = new RegExp(`\\b${propertyBase}(?:-top|-right|-bottom|-left)?\\s*:\\s*([^;}]+)`, 'g')
  let match: RegExpExecArray | null
  let found = false
  while ((match = pattern.exec(declText))) {
    found = true
    const tokens = match[1].trim().split(/\s+/)
    const allZero = tokens.every((token) => /^0(?:px|rem|%)?$/.test(token))
    if (!allZero) return false
  }
  return found
}

/** Generalisiert `isAllZeroDeclaration` auf Eigenschaften mit eigenen, von "0" abweichenden
 *  Reset-Werten (z. B. "transparent" bei Rand-/Flächenfarbe, "none" bei Schatten): prüft, ob JEDES
 *  Vorkommen der durch `propertyPattern` beschriebenen Eigenschaft in `declText` einen Wert trägt,
 *  den `isExemptValue` als harmlosen Rücksetzer akzeptiert -- nur dann gilt die gesamte
 *  Deklaration als legitimer Reset statt als eigenes Layout-CSS. */
function isAllExemptDeclaration(
  declText: string,
  propertyPattern: string,
  isExemptValue: (value: string) => boolean,
): boolean {
  const pattern = new RegExp(`${propertyPattern}\\s*:\\s*([^;}]+)`, 'g')
  let match: RegExpExecArray | null
  let found = false
  while ((match = pattern.exec(declText))) {
    found = true
    if (!isExemptValue(match[1].trim())) return false
  }
  return found
}

/** `border`/`border-top`/`border-right`/`border-bottom`/`border-left` gilt als harmloser
 *  Rücksetzer, wenn der Wert exakt "none" ist, ODER jedes Werte-Token nullwertig ist (reine
 *  Breiten-Kurzform ohne Stil/Farbe, z. B. "0"), ODER eines der Werte-Token "transparent" lautet
 *  (z. B. "1px solid transparent" -- ein sichtbarer Rahmen mit unsichtbarer Farbe nimmt visuell
 *  dieselbe Reset-Rolle ein wie ein reines "none"). Bewusst NICHT geprüft: `border-width`/
 *  `border-color`/`border-style` (Unter-Eigenschaften) -- das optionale Richtungs-Suffix der
 *  Haupt-Regex deckt nur `-top|-right|-bottom|-left` ab, "border-width:" erfüllt dieses Suffix
 *  nicht und wird von der `border`-Kategorie dadurch naturgemäß gar nicht erst erfasst. */
function isBorderResetValue(value: string): boolean {
  if (/^none$/i.test(value)) return true
  const tokens = value.split(/\s+/)
  if (tokens.every((token) => /^0(?:px|rem|%)?$/.test(token))) return true
  return tokens.some((token) => /^transparent$/i.test(token))
}

/** `background`/`background-color`/`background-image` gilt als harmloser Rücksetzer bei genau
 *  "transparent"/"none"/"inherit" -- jeder andere Wert (auch ein Grundbaustein-`var()`-Verweis)
 *  ist eine echte Flächen-Entscheidung, die laut Addendum 2026-11-05b in den Grundbaustein gehört,
 *  nicht in eine Komposit-Datei. */
function isBackgroundResetValue(value: string): boolean {
  return /^(transparent|none|inherit)$/i.test(value)
}

/** `box-shadow` gilt als harmloser Rücksetzer ausschließlich bei genau "none". */
function isBoxShadowResetValue(value: string): boolean {
  return /^none$/i.test(value)
}

/** `width`/`height` gelten als layoutneutral, wenn der Wert ein echter Rücksetzer ist (`auto`,
 *  nullwertig, intrinsische Inhaltsgröße) ODER eine REINE `var(...)`-Lesereferenz auf ein bereits
 *  existierendes Grundbaustein-Token ist (ohne `calc()`, ohne Fallback-Wert, ohne Kombination mit
 *  einem Literal). `100%` gilt bewusst NICHT als Rücksetzer (anders als `auto`): eine Komposit-
 *  Datei, die eine volle Breite/Höhe erzwingt, trifft dieselbe Größen-ENTSCHEIDUNG wie ein festes
 *  Pixel-Literal, nur relativ statt absolut -- beides gehört in den Grundbaustein (z. B. Clusters
 *  `align="stretch"` oder Cards `widthPurpose`-Prop), nicht in die Komposit-Datei. Jedes fest
 *  codierte Literal oder eine komplexere Funktion (z. B. `min(100%, 260px)`) ist der eigentliche
 *  Verstoß. */
function isSizeResetValue(value: string): boolean {
  if (['auto', '0', '0px', 'min-content', 'max-content'].includes(value)) return true
  return /^var\(--[\w-]+\)$/.test(value)
}

interface ForbiddenPattern {
  category: string
  /** Liefert true, wenn der übergebene Deklarationstext (eine Zeile oder ein Inline-Regelkörper)
   *  ein verbotenes, "eigenes Layout-CSS" enthält. */
  test: (declText: string) => boolean
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // Beide Display-Werte teilen sich eine gemeinsame Kategorie, da sowohl "display:flex" als
  // auch "display:grid" (z. B. ein eigenes Grid-Layout) denselben Verstoß darstellen: ein
  // Komposit, das sein eigenes Kind-Layout bestimmt, statt einen Grundbaustein zu nutzen.
  { category: 'display', test: (t) => /display\s*:\s*(?:flex|grid)\b/.test(t) },
  { category: 'flex-direction', test: (t) => /flex-direction\s*:/.test(t) },
  { category: 'grid-template', test: (t) => /grid-template/.test(t) },
  // Negatives Lookbehind auf "-" schließt private Grundbaustein-Variablen wie --stack-gap:/
  // --cluster-gap: aus (die werden separat über foreign-grundbaustein-variable erfasst) -- eine
  // echte "gap:"-Eigenschaftsdeklaration ist nie von einem Bindestrich direkt davor eingeleitet.
  { category: 'gap', test: (t) => /(?<!-)\bgap\s*:/.test(t) },
  {
    category: 'padding',
    test: (t) => /\bpadding(?:-top|-right|-bottom|-left)?\s*:/.test(t) && !isAllZeroDeclaration(t, 'padding'),
  },
  {
    category: 'margin',
    test: (t) => /\bmargin(?:-top|-right|-bottom|-left)?\s*:/.test(t) && !isAllZeroDeclaration(t, 'margin'),
  },
  {
    category: 'foreign-grundbaustein-variable',
    test: (t) =>
      /--(?:stack|cluster|split)-(?:gap|align|justify|wrap|first-col)\s*:/.test(t) ||
      /--card-(?:padding|radius)-override\s*:/.test(t),
  },
  {
    category: 'border',
    test: (t) =>
      /\bborder(?:-top|-right|-bottom|-left)?\s*:/.test(t) &&
      !isAllExemptDeclaration(t, 'border(?:-top|-right|-bottom|-left)?', isBorderResetValue),
  },
  {
    // Rundung ist laut Addendum 2026-11-05b IMMER ein Grundbaustein-Entscheid, kein bloßer
    // Rohwert-Reset -- anders als border/background/box-shadow gibt es hier bewusst KEINE
    // Ausnahme, auch nicht für "border-radius: 0".
    category: 'border-radius',
    test: (t) => /\bborder-radius\s*:/.test(t),
  },
  {
    category: 'background',
    test: (t) =>
      /\bbackground(?:-color|-image)?\s*:/.test(t) &&
      !isAllExemptDeclaration(t, 'background(?:-color|-image)?', isBackgroundResetValue),
  },
  {
    category: 'box-shadow',
    test: (t) => /\bbox-shadow\s*:/.test(t) && !isAllExemptDeclaration(t, 'box-shadow', isBoxShadowResetValue),
  },
  {
    // min-width/max-width/min-height/max-height drücken flexible GRENZEN aus, keine feste Größe
    // -- das negative Lookbehind schließt sie bewusst aus (z. B. FansubGroupPicker.module.css's
    // `.chip { max-width: min(100%, 260px); }`, eine häufige, bereits konforme Breiten-GRENZE).
    category: 'width-height',
    test: (t) =>
      /(?<!min-)(?<!max-)\b(?:width|height)\s*:/.test(t) &&
      !isAllExemptDeclaration(t, '(?<!min-)(?<!max-)\\b(?:width|height)', isSizeResetValue),
  },
]

interface Violation {
  file: string
  line: number
  selector: string
  category: string
  text: string
}

interface ScanResult {
  violations: Violation[]
}

/** Zeilenweiser, unbedingter Scanner mit einfachem Selektor-Stack (siehe Modulkommentar oben für
 *  die Gesamtbegründung). `fileKey` identifiziert die Datei ausschließlich für die Fehlermeldung
 *  in `Violation.file` -- es existiert keine Ausnahmeliste mehr, die einen Treffer unterdrücken
 *  könnte: jeder gefundene verbotene Deklarationstyp zählt immer als Verstoß. */
function scanContent(content: string, fileKey: string): ScanResult {
  const violations: Violation[] = []
  const lines = stripBlockComments(content).split('\n')
  const stack: string[] = []
  let pendingSelector = ''

  function checkDeclarations(text: string, selector: string, lineNumber: number): void {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        violations.push({ file: fileKey, line: lineNumber, selector, category: pattern.category, text: text.trim() })
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue

    if (line === '}') {
      stack.pop()
      continue
    }

    const braceIndex = line.indexOf('{')
    if (braceIndex !== -1) {
      const beforeBrace = line.slice(0, braceIndex).trim()
      const afterBrace = line.slice(braceIndex + 1).trim()
      const fullSelector = (pendingSelector ? `${pendingSelector} ` : '') + beforeBrace
      pendingSelector = ''

      const closingIndex = afterBrace.lastIndexOf('}')
      if (closingIndex !== -1) {
        // Einzeiliger Regelkörper ("SELEKTOR { deklaration; }") -- wird sofort geprüft, landet
        // nicht auf dem Stack (ist bereits geschlossen).
        checkDeclarations(afterBrace.slice(0, closingIndex), fullSelector, i + 1)
      } else {
        stack.push(fullSelector)
      }
      continue
    }

    if (line.endsWith(',')) {
      // Fortsetzungszeile eines mehrzeiligen Komma-Selektors (z. B. ".description,\n.tagsSection {").
      pendingSelector = (pendingSelector ? `${pendingSelector} ` : '') + line
      continue
    }

    const currentSelector = stack[stack.length - 1] ?? ''
    checkDeclarations(line, currentSelector, i + 1)
  }

  return { violations }
}

function scanFile(file: GuardedFile): ScanResult {
  const content = readFileSync(file.path, 'utf8')
  return scanContent(content, file.key)
}

describe('Anime-Detail/Fansub-Bausteine: zusammengesetzte Dateien deklarieren kein eigenes Layout-CSS', () => {
  it('verbietet display:flex/grid, flex-direction, grid-template, gap:, padding:, margin, border, border-radius, background, box-shadow, feste width/height und fremde Grundbaustein-Variablen-Deklarationen unbedingt, ohne jede Ausnahme', () => {
    const allViolations = GUARDED_COMPOSITE_FILES.flatMap((file) => scanFile(file).violations)

    expect(
      allViolations,
      allViolations
        .map((v) => `${v.file}:${v.line} [${v.category}] selector="${v.selector}" :: ${v.text}`)
        .join('\n'),
    ).toEqual([])
  })

  it('scannt NICHT die Grundbausteine selbst (Stack/Cluster/SplitLayout/Divider besitzen ihr eigenes Layout-CSS legitim)', () => {
    const guardedPaths = GUARDED_COMPOSITE_FILES.map((f) => f.path)
    expect(guardedPaths.some((p) => p.endsWith('Stack.module.css'))).toBe(false)
    expect(guardedPaths.some((p) => p.endsWith('Cluster.module.css'))).toBe(false)
    expect(guardedPaths.some((p) => p.endsWith('SplitLayout.module.css'))).toBe(false)
    expect(guardedPaths.some((p) => p.endsWith('Divider.module.css'))).toBe(false)
  })

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Guard selbst nicht stillschweigend bricht', () => {
    const sample = [
      '.foo {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '  padding: 4px;',
      '  margin: 4px;',
      '}',
      '.bar {',
      '  --stack-gap: 4px;',
      '}',
      '.baz {',
      '  grid-template-columns: 1fr 1fr;',
      '}',
      '.grid {',
      '  display: grid;',
      '}',
      '.border {',
      '  border: 1px solid var(--border-on-media);',
      '}',
      '.radius {',
      '  border-radius: 0;',
      '}',
      '.bg {',
      '  background: var(--surface-canvas);',
      '}',
      '.shadow {',
      '  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);',
      '}',
      '.fixed {',
      '  width: 260px;',
      '}',
    ].join('\n')

    const { violations } = scanContent(sample, 'SelfTest')
    const categories = new Set(violations.map((v) => v.category))

    expect(categories).toContain('display')
    expect(categories).toContain('flex-direction')
    expect(categories).toContain('gap')
    expect(categories).toContain('padding')
    expect(categories).toContain('margin')
    expect(categories).toContain('foreign-grundbaustein-variable')
    expect(categories).toContain('grid-template')
    expect(categories).toContain('border')
    // border-radius hat laut Addendum 2026-11-05b bewusst KEINE Ausnahme -- auch "0" verstößt.
    expect(categories).toContain('border-radius')
    expect(categories).toContain('background')
    expect(categories).toContain('box-shadow')
    expect(categories).toContain('width-height')
  })

  it('erkennt reine Null-/Transparenz-Rücksetzer (padding:0/margin:0/border:none/background:transparent/box-shadow:none/height:auto, z. B. ein <ul>-Reset oder ein bewusst randloser Zustand) NICHT als Verstoß', () => {
    const sample = [
      '.listReset {',
      '  padding: 0;',
      '  margin: 0 0 0 0;',
      '  list-style: none;',
      '}',
      '.borderReset {',
      '  border: none;',
      '}',
      '.borderReset2 {',
      '  border: 0;',
      '}',
      '.borderReset3 {',
      '  border: 1px solid transparent;',
      '}',
      '.borderWidthReset {',
      // Reproduziert AnimeDetailHero.module.css's weiterhin legitime Korrektur: "border-width:"
      // ist eine Unter-Eigenschaft, die von der "border"-Kategorie naturgemäß gar nicht erst
      // erfasst wird (siehe isBorderResetValue-Kommentar); der Wert "0" ist zusätzlich auch für
      // die width-height-Kategorie exempt.
      '  border-width: 0;',
      '}',
      '.bgReset {',
      '  background: transparent;',
      '}',
      '.shadowReset {',
      '  box-shadow: none;',
      '}',
      '.sizeReset {',
      '  height: auto;',
      '  min-width: 0;',
      '  max-width: min(100%, 260px);',
      '}',
    ].join('\n')
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations).toEqual([])
  })

  it('erkennt width: 100% jetzt als echten width-height-Verstoß (keine Ausnahme mehr für relative Vollbreite)', () => {
    const sample = ['.fullWidth {', '  width: 100%;', '}'].join('\n')
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations.some((v) => v.category === 'width-height')).toBe(true)
  })

  it('erkennt eine var(...)-Lesereferenz auf eine fremde gap-Variable NICHT als eigene gap:-Deklaration', () => {
    // Beispiel: eine Mobil-Korrektur, die EINEN anderen Baustein-Wert per calc()/var() liest, ohne
    // selbst eine "gap:"-Eigenschaft zu deklarieren -- kein Verstoß.
    const sample = '.foo {\n  margin-left: calc(-1 * var(--split-gap));\n}'
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations.some((v) => v.category === 'gap')).toBe(false)
  })

  it('erkennt eine reine var(...)-Lesereferenz bei width/height als legitimen Grundbaustein-Token-Verweis, aber ein kombiniertes/fest codiertes Literal als echten Verstoß', () => {
    const exemptSample = '.foo {\n  width: var(--media-frame-poster-width);\n}'
    const { violations: exemptViolations } = scanContent(exemptSample, 'SelfTest')
    expect(exemptViolations.some((v) => v.category === 'width-height')).toBe(false)

    const violatingSample = '.foo {\n  height: calc(var(--media-frame-poster-width) + 4px);\n}'
    const { violations: violatingViolations } = scanContent(violatingSample, 'SelfTest')
    expect(violatingViolations.some((v) => v.category === 'width-height')).toBe(true)
  })

  // Erzwingt dauerhaft die vollständige Dateiabdeckung: ohne diesen Test könnte
  // GUARDED_COMPOSITE_FILES unbemerkt auf eine Teilmenge der neun real existierenden
  // Komposit-Dateien zurückfallen, ohne dass ein anderer Test das bemerken würde.
  it('bewacht alle neun real existierenden Komposit-Dateien der fünf Pilot-Bausteine, nicht nur eine Teilmenge', () => {
    const guardedKeys = new Set(GUARDED_COMPOSITE_FILES.map((f) => f.key))
    expect(guardedKeys).toEqual(
      new Set([
        'AnimeDetailHero',
        'ReleasePreviewRow',
        'EpisodeGlassCard',
        'AnimeEdgeNavigation',
        'FansubVersionBrowser',
        'FansubGroupContext',
        'FansubGroupPicker',
        'PageEpisodes',
        'WatchlistAddButton',
      ]),
    )
  })
})
