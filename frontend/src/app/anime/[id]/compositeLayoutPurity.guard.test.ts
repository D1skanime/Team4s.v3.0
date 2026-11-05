import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Permanenter Rückfall-Wächter für Befund B (Phase 192, Runde 3, Plan 192-15): die vier
 * zusammengesetzten Pilot-Bausteine der öffentlichen Anime-Detailseite enthielten über mehrere
 * Review-Runden hinweg ihr eigenes `display:flex`/`grid-template`/`gap:`/`padding:`/`margin`,
 * obwohl die generischen Grundbausteine `Stack`/`Cluster`/`Card`s `padding`-Prop genau dafür
 * existieren -- `detailStyleSystem.guard.test.ts` prüfte bislang ausschließlich die Seiten-CSS
 * (`page.module.css`/`page.episodes.module.css`), nie diese Baustein-Dateien selbst. Dieser
 * Wächter schließt exakt diese Lücke, nur für die vier bereits in Plan 192-13/192-14 bereinigten
 * Dateien (kein repo-weiter Sweep).
 *
 * WICHTIG: `Stack.module.css`/`Cluster.module.css`/`SplitLayout.module.css`/`Divider.module.css`
 * werden hier bewusst NICHT geprüft -- das SIND die Grundbausteine, ihr eigenes Layout-CSS ist
 * genau ihr Daseinszweck, kein Verstoß.
 *
 * Erkennung erfolgt zeilenweise über einen einfachen Selektor-Stack (keine vollständige
 * CSS-Parser-Abhängigkeit): jede Zeile, die eine Selektor-/@media-Kopfzeile öffnet (endet auf
 * `{`), wird auf den Stack gelegt; `}` allein auf einer Zeile poppt ihn. Mehrzeilige
 * Komma-Selektoren (z. B. `.description,\n.tagsSection {`) werden über einen Zwischenpuffer
 * zusammengefügt. So lässt sich jede gefundene Deklaration ihrem tatsächlichen Selektor
 * zuordnen, und eine dokumentierte Ausnahme kann pro Selektor statt nur pro Datei gelten.
 */

interface GuardedFile {
  /** Kurzer, stabiler Schlüssel -- referenziert in DOCUMENTED_LAYOUT_EXCEPTIONS statt des vollen
   *  Pfads, damit die Ausnahmeliste unten lesbar bleibt. */
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

/** Eine dokumentierte, eng begründete Ausnahme -- gilt für GENAU einen Selektor in GENAU einer
 *  Datei, nie dateiweit. `selector` matcht gegen den zusammengefügten Selektor-Kopftext (Kommas/
 *  Zeilenumbrüche durch Leerzeichen ersetzt), nicht gegen rohen Dateiinhalt -- ein Treffer in
 *  einem Kommentar kann diese Regex also nie fälschlich befriedigen (Kommentare werden vor der
 *  Prüfung entfernt, siehe stripBlockComments). */
interface LayoutException {
  file: string
  selector: RegExp
  reason: string
}

/** Jeder Eintrag zitiert den Plan, der die Ausnahme ursprünglich begründet hat, plus die
 *  Kurzfassung der fachlichen Begründung -- siehe die jeweilige *-SUMMARY.md für die vollständige,
 *  per Playwright empirisch bestätigte Herleitung. KEINE dieser Ausnahmen lockert ein Regex-Muster
 *  dateiweit auf -- jede gilt ausschließlich für ihren eigenen, hier benannten Selektor. */
const DOCUMENTED_LAYOUT_EXCEPTIONS: LayoutException[] = [
  // --- AnimeDetailHero.module.css ---------------------------------------------------------
  // Alle sechs vormaligen Ausnahme-Einträge dieser Datei (.infoCardBody/.posterMetaCard/.badges/
  // .statsRow/.relatedSection/.edgeNavigationOverlay) entfallen seit den Plänen 192-24/192-25:
  // .infoCardBody/.badges/.statsRow/.relatedSection deklarieren seit 192-24s Stack-Rhythmus-Array-
  // Umbau nur noch nicht-verbotene Restdeklarationen (text-align/justify-content/align-items,
  // keine davon in FORBIDDEN_PATTERNS); .posterMetaCard ist seit 192-25s Card bleedBelowMd-Umbau
  // auf eine reine border-width:0-Größenkorrektur reduziert (ebenfalls nicht verboten);
  // .edgeNavigationOverlay kommt seit 192-25s Cluster float="controlBand"-Umbau im Stylesheet gar
  // nicht mehr vor. Damit hat diese Datei seit 192-25 ZERO verbleibende Ausnahmen (siehe
  // 192-CONTEXT.md addendum_2026-11-05a, "Guard-Verschärfung": Hauptprüfung muss mit LEERER
  // Verstoßliste grün sein).

  // --- ReleasePreviewRow.module.css --------------------------------------------------------
  // .row (vormals 192-14): entfällt seit Plan 192-26 -- die haltepunktabhängige Zeile-zu-Spalte-
  // Umkehr kommt jetzt über Cluster collapseBelow="md"/gapCollapsed ab, .row selbst deklariert
  // kein eigenes Layout-CSS mehr.

  // --- EpisodeGlassCard.module.css ---------------------------------------------------------
  // .versionList (vormals 192-14, asymmetrisches padding): seit Plan 192-26 eine echte,
  // verschachtelte Card variant="flat" padding="dividedSection" -- das verbliebene
  // border-width:0/border-radius:0/background:transparent dort ist KEINE der vom Guard
  // verbotenen Kategorien (display/flex-direction/grid-template/gap/padding/margin), braucht
  // deshalb keinen Ausnahme-Eintrag mehr.

  // --- AnimeEdgeNavigation.module.css -------------------------------------------------------
  // .previewType (vormals 192-15): entfällt seit Plan 192-26 -- der 4px-Zeilenabstand zwischen
  // Titel- und Typ-Text kommt jetzt aus Stacks eigenem "captionLines"-Zweck (Plan 192-21), keine
  // margin-top-Deklaration mehr vorhanden.
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
  /** Jeder tatsächlich geöffnete Selektor-Kopftext dieser Datei -- für den Ausnahmelisten-
   *  Existenz-Selbsttest unten (eine Ausnahme, deren Selektor nirgends mehr geöffnet wird, ist tot). */
  selectors: string[]
}

/** Zeilenweiser Scanner mit einfachem Selektor-Stack (siehe Modulkommentar oben für die
 *  Gesamtbegründung). `fileKey` identifiziert die Datei ausschließlich für die Ausnahme-Prüfung
 *  (DOCUMENTED_LAYOUT_EXCEPTIONS) -- ein unbekannter Schlüssel (z. B. im Selbsttest unten) lässt
 *  schlicht keine Ausnahme greifen. */
function scanContent(content: string, fileKey: string): ScanResult {
  const violations: Violation[] = []
  const selectors: string[] = []
  const lines = stripBlockComments(content).split('\n')
  const stack: string[] = []
  let pendingSelector = ''

  function isAllowed(selector: string): boolean {
    return DOCUMENTED_LAYOUT_EXCEPTIONS.some((exception) => exception.file === fileKey && exception.selector.test(selector))
  }

  function checkDeclarations(text: string, selector: string, lineNumber: number): void {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(text) && !isAllowed(selector)) {
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
      selectors.push(fullSelector)

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

  return { violations, selectors }
}

function scanFile(file: GuardedFile): ScanResult {
  const content = readFileSync(file.path, 'utf8')
  return scanContent(content, file.key)
}

describe('Anime-Detail/Fansub-Bausteine: zusammengesetzte Dateien deklarieren kein eigenes Layout-CSS', () => {
  it('verbietet display:flex/flex-direction/grid-template/gap:/padding:/margin und fremde Grundbaustein-Variablen-Deklarationen außerhalb der dokumentierten Ausnahmen', () => {
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
    // selbst eine "gap:"-Eigenschaft zu deklarieren -- kein Verstoß, auch ohne Ausnahme-Eintrag.
    const sample = '.foo {\n  margin-left: calc(-1 * var(--split-gap));\n}'
    const { violations } = scanContent(sample, 'SelfTest')
    expect(violations.some((v) => v.category === 'gap')).toBe(false)
  })

  it('DOCUMENTED_LAYOUT_EXCEPTIONS verweist nur auf Selektoren, die in der jeweiligen Datei tatsächlich noch geöffnet werden', () => {
    const selectorsByFile = new Map(GUARDED_COMPOSITE_FILES.map((file) => [file.key, scanFile(file).selectors]))

    for (const exception of DOCUMENTED_LAYOUT_EXCEPTIONS) {
      const selectors = selectorsByFile.get(exception.file)
      expect(selectors, `${exception.file} ist keine der bewachten Dateien -- Ausnahme-Eintrag korrigieren`).toBeDefined()
      const stillExists = (selectors ?? []).some((selector) => exception.selector.test(selector))
      expect(
        stillExists,
        `${exception.file}: Selektor-Muster ${exception.selector} trifft auf keinen noch vorhandenen Selektor mehr -- veralteten Ausnahme-Eintrag entfernen (Begründung war: ${exception.reason})`,
      ).toBe(true)
    }
  })
})
