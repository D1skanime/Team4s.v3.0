import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Permanenter, ausnahmeloser Rückfall-Wächter für die vier zusammengesetzten Pilot-Bausteine der
 * öffentlichen Anime-Detailseite: keiner von ihnen darf eigenes `display:flex`/`grid-template`/
 * `gap:`/`padding:`/`margin` deklarieren oder eine private Grundbaustein-Variable fremd setzen --
 * genau dafür existieren die generischen Grundbausteine `Stack`/`Cluster`/`Card`s `padding`-Prop.
 * `detailStyleSystem.guard.test.ts` prüft ausschließlich die Seiten-CSS (`page.module.css`/
 * `page.episodes.module.css`), nie diese Baustein-Dateien selbst -- dieser Wächter schließt genau
 * diese Lücke, nur für die vier hier gelisteten Dateien (kein repo-weiter Sweep).
 *
 * Diese Prüfung kannte in früheren Phasen-Runden eine selektor-genaue Ausnahmeliste für Fälle, die
 * ein Grundbaustein angeblich nicht abbilden konnte. Ein unabhängiger Review stellte fest, dass
 * jede dieser Ausnahmen tatsächlich eine fehlende, nachrüstbare Grundbaustein-Fähigkeit war --
 * seitdem wurden alle betroffenen Fälle auf echte `Stack`/`Cluster`/`Card`-Erweiterungen
 * zurückgeführt (Rhythmus-Array-Modus, Haltepunkt-Umkehr, Schwebe-Overlay-Modus, Zweck-benannte
 * Polsterungs-Rezepte). Die Ausnahmeliste selbst ist damit ersatzlos entfallen: ein Treffer eines
 * verbotenen Musters ist IMMER ein Verstoß, ohne jede Rückfallmöglichkeit auf eine dokumentierte
 * Einzelfall-Duldung.
 *
 * WICHTIG: `Stack.module.css`/`Cluster.module.css`/`SplitLayout.module.css`/`Divider.module.css`
 * werden hier bewusst NICHT geprüft -- das SIND die Grundbausteine, ihr eigenes Layout-CSS ist
 * genau ihr Daseinszweck, kein Verstoß.
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
  // Deliberately NOT Stack/Cluster/SplitLayout/Divider.module.css -- those ARE the
  // Grundbausteine and are allowed to declare their own layout CSS.
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

interface ForbiddenPattern {
  category: string
  /** Liefert true, wenn der übergebene Deklarationstext (eine Zeile oder ein Inline-Regelkörper)
   *  ein verbotenes, "eigenes Layout-CSS" enthält. */
  test: (declText: string) => boolean
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  { category: 'display:flex', test: (t) => /display\s*:\s*flex\b/.test(t) },
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
  it('verbietet display:flex/flex-direction/grid-template/gap:/padding:/margin und fremde Grundbaustein-Variablen-Deklarationen unbedingt, ohne jede Ausnahme', () => {
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
    ].join('\n')

    const { violations } = scanContent(sample, 'SelfTest')
    const categories = new Set(violations.map((v) => v.category))

    expect(categories).toContain('display:flex')
    expect(categories).toContain('flex-direction')
    expect(categories).toContain('gap')
    expect(categories).toContain('padding')
    expect(categories).toContain('margin')
    expect(categories).toContain('foreign-grundbaustein-variable')
    expect(categories).toContain('grid-template')
  })

  it('erkennt reine Null-Rücksetzer (padding:0/margin:0, z. B. ein <ul>-Reset) NICHT als Verstoß', () => {
    const sample = '.listReset {\n  padding: 0;\n  margin: 0 0 0 0;\n  list-style: none;\n}'
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations).toEqual([])
  })

  it('erkennt eine var(...)-Lesereferenz auf eine fremde gap-Variable NICHT als eigene gap:-Deklaration', () => {
    // Beispiel: eine Mobil-Korrektur, die EINEN anderen Baustein-Wert per calc()/var() liest, ohne
    // selbst eine "gap:"-Eigenschaft zu deklarieren -- kein Verstoß.
    const sample = '.foo {\n  margin-left: calc(-1 * var(--split-gap));\n}'
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations.some((v) => v.category === 'gap')).toBe(false)
  })
})
