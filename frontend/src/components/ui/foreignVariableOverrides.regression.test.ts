import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Verallgemeinerter Wächter gegen zwei verwandte Rückfälle, die sich seit mehreren Review-Runden
 * immer wieder in neuen Dateien wiederholt haben, statt behoben zu bleiben:
 *
 * 1. "Private Variable eines fremden Bausteins von außen setzen" statt einer offiziellen Prop/
 *    Variante -- z. B. Card, das frueher Texts `--text-soft-size` direkt setzte, oder ArtworkHero,
 *    das Avatars `--avatar-bg`/`--avatar-fg` direkt setzte. Erkennung über zwei sich ergänzende
 *    Mechanismen: (a) JEDE Custom Property, die in mehr als EINER `.module.css`-Datei unter
 *    `components/ui` gesetzt wird, ist verdächtig -- eine echte eigene Variable eines Bausteins
 *    wird ausschließlich innerhalb seiner eigenen Datei gesetzt (alle Varianten-Klassen leben dort
 *    zusammen); (b) eine explizite Registrierung der bekannten "Override-Hook"-Variablen (Baustein
 *    liest sie per `var(--x, Standardwert)`, OHNE sie selbst zu setzen, und erwartet das Setzen
 *    bewusst von außen -- z. B. Avatars `--avatar-bg`) deckt genau den Fall ab, den (a) allein
 *    nicht erkennen würde (ein einzelner fremder Setzer bliebe sonst unter der Zwei-Dateien-
 *    Schwelle unentdeckt).
 * 2. Feste px-/rem-Größen, Hex-Farben oder rgba-Literale direkt in einer `components/ui`-CSS-
 *    Datei statt eines globalen, in `src/styles/tokens/*.css` definierten Tokens. Zulässig bleiben
 *    ausschließlich `0`, `1px`-Haarlinien und Prozentwerte -- sowie Literale innerhalb einer
 *    `@media`/`@container`-BEDINGUNG (Haltepunkte), da CSS dort keine `var()`-Referenzen erlaubt.
 *
 * Beide Prüfungen laufen über den echten Dateiinhalt (kein Rendering, Muster wie
 * catalogTaxonomy.test.ts) und schlagen bei jedem nicht dokumentierten Fall mit Datei+Fundstelle
 * fehl, statt stillschweigend durchzugehen.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

function stripComments(cssText: string): string {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, '')
}

function listCssFiles(): string[] {
  return fs
    .readdirSync(UI_DIR)
    .filter((file) => file.endsWith('.module.css'))
    .sort()
}

// -----------------------------------------------------------------------------------------------
// 1. Fremde private Baustein-Variablen
// -----------------------------------------------------------------------------------------------

/** Matcht eine Custom-Property-DEKLARATION ("--name: wert;") -- die EIGENSCHAFT selbst beginnt mit
 *  "--", nicht bloß eine var()-Referenz auf diese Variable als Wert irgendeiner anderen
 *  Eigenschaft. */
const CUSTOM_PROPERTY_SET_PATTERN = /(?:^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g

function findSetVariables(cssText: string): string[] {
  return [...stripComments(cssText).matchAll(CUSTOM_PROPERTY_SET_PATTERN)].map((match) => match[1])
}

/** Bekannte "Override-Hook"-Variablen, die ihr besitzender Baustein NUR per `var(--x, Standard)`
 *  liest (nie selbst setzt) und deren Setzen bewusst von außen erwartet wird -- der generische
 *  Zwei-Dateien-Mechanismus unten würde einen EINZELNEN fremden Setzer hier nicht erkennen, da die
 *  eigene Datei die Variable nie selbst setzt. */
const KNOWN_OVERRIDE_HOOK_OWNERS: Record<string, string> = {
  '--avatar-bg': 'Avatar.module.css',
  '--avatar-fg': 'Avatar.module.css',
  '--focal-item-size': 'FocalCarousel.module.css',
  '--grid-scroll-item-size': 'FocalCarousel.module.css',
  '--text-body-size': 'Text.module.css',
  '--text-body-color': 'Text.module.css',
  '--text-soft-size': 'Text.module.css',
  '--text-soft-color': 'Text.module.css',
  '--text-meta-size': 'Text.module.css',
  '--text-meta-color': 'Text.module.css',
  '--text-small-size': 'Text.module.css',
  '--text-small-color': 'Text.module.css',
  '--text-eyebrow-size': 'Text.module.css',
  '--text-eyebrow-color': 'Text.module.css',
}

/** Bereits bestehende, bewusst zugelassene Fälle, jeweils mit fachlicher Begründung. Jeder NEUE
 *  Fall (nicht hier eingetragen) lässt den Test fehlschlagen, statt stillschweigend durchzugehen. */
const FOREIGN_VARIABLE_EXCEPTIONS: Record<string, string[]> = {}

describe('Keine fremden privaten Baustein-Variablen in components/ui-CSS-Modulen', () => {
  const files = listCssFiles()
  const fileContents = new Map(files.map((file) => [file, fs.readFileSync(path.join(UI_DIR, file), 'utf8')]))

  const setsByVariable = new Map<string, Set<string>>()
  for (const [file, content] of fileContents) {
    for (const variable of findSetVariables(content)) {
      if (!setsByVariable.has(variable)) setsByVariable.set(variable, new Set())
      setsByVariable.get(variable)!.add(file)
    }
  }

  const variablesToCheck = new Set<string>([...setsByVariable.keys(), ...Object.keys(KNOWN_OVERRIDE_HOOK_OWNERS)])

  for (const variable of [...variablesToCheck].sort()) {
    const settingFiles = setsByVariable.get(variable) ?? new Set<string>()
    const registeredOwner = KNOWN_OVERRIDE_HOOK_OWNERS[variable]
    const foreignSetters = [...settingFiles].filter((file) => file !== registeredOwner)

    // Generischer Fall: eine Variable, die von mehr als einer Datei gesetzt wird, UND (falls
    // registriert) jede Datei außer dem eingetragenen Besitzer.
    const isSuspicious = registeredOwner ? foreignSetters.length > 0 : settingFiles.size > 1

    if (!isSuspicious) continue

    it(`${variable}: wird unerwartet von mehreren/fremden Dateien gesetzt (${[...settingFiles].sort().join(', ')}) -- nur mit begründeter Eintragung in FOREIGN_VARIABLE_EXCEPTIONS zulässig`, () => {
      const allowedFiles = new Set(FOREIGN_VARIABLE_EXCEPTIONS[variable] ?? [])
      const unexpectedFiles = [...settingFiles].filter((file) => file !== registeredOwner && !allowedFiles.has(file))

      expect(
        unexpectedFiles,
        `${variable} wird unerwartet von ${unexpectedFiles.join(', ')} gesetzt${registeredOwner ? ` (Besitzer: ${registeredOwner})` : ''} -- offizielle Prop/Variante der besitzenden Komponente nutzen statt ihre private Variable von außen zu setzen, oder (falls bewusst) in FOREIGN_VARIABLE_EXCEPTIONS mit Begründung eintragen.`,
      ).toEqual([])
    })
  }

  it('FOREIGN_VARIABLE_EXCEPTIONS verweist nur auf Dateien, die tatsächlich existieren und die Variable tatsächlich setzen', () => {
    for (const [variable, files_] of Object.entries(FOREIGN_VARIABLE_EXCEPTIONS)) {
      for (const file of files_) {
        const filePath = path.join(UI_DIR, file)
        expect(fs.existsSync(filePath), `${file} aus FOREIGN_VARIABLE_EXCEPTIONS existiert nicht mehr -- Eintrag entfernen`).toBe(true)
        const setVariables = new Set(findSetVariables(fileContents.get(file) ?? fs.readFileSync(filePath, 'utf8')))
        expect(setVariables.has(variable), `${file} setzt ${variable} nicht (mehr) -- FOREIGN_VARIABLE_EXCEPTIONS-Eintrag entfernen`).toBe(true)
      }
    }
  })

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Scanner selbst nicht stillschweigend bricht', () => {
    const sample = '.cardDescription {\n  --text-soft-size: 0.92rem;\n}'
    expect(findSetVariables(sample)).toEqual(['--text-soft-size'])
  })
})

// -----------------------------------------------------------------------------------------------
// 2. Feste px-/rem-Größen, Hex-Farben und rgba-Literale statt globaler Tokens
// -----------------------------------------------------------------------------------------------

interface LiteralViolation {
  line: number
  text: string
}

/** Matcht px-/rem-Längen (außer der Haarlinien-Ausnahme `1px`/`-1px`), Hex-Farben und rgb()/
 *  rgba()-Funktionsaufrufe -- die drei per Auftrag verbotenen Literal-Arten. Prozentwerte und `0`
 *  matchen bewusst NICHT (beide bleiben zulässig). */
const LITERAL_VALUE_PATTERN = /(?<![\w#])(-?\d*\.?\d+)(px|rem)\b|#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g

/** Eine `@media`/`@container`/`@supports`-BEDINGUNGSZEILE darf Literale enthalten (Haltepunkte,
 *  Feature-Queries) -- CSS erlaubt dort keine `var()`-Referenzen, das ist eine echte technische
 *  Grenze, keine Nachlässigkeit. Nur die Bedingungszeile selbst wird ausgenommen, nicht der
 *  gesamte Block-Körper darunter. */
const AT_RULE_CONDITION_LINE_PATTERN = /^\s*@(media|container|supports)\b/

function findLiteralViolations(cssText: string): LiteralViolation[] {
  const lines = stripComments(cssText).split('\n')
  const violations: LiteralViolation[] = []

  lines.forEach((line, index) => {
    if (AT_RULE_CONDITION_LINE_PATTERN.test(line)) return

    for (const match of line.matchAll(LITERAL_VALUE_PATTERN)) {
      const text = match[0]
      if (/^-?1px$/.test(text)) continue
      violations.push({ line: index + 1, text })
    }
  })

  return violations
}

/** Bereits bestehende, bewusst zugelassene Literale, jeweils mit fachlicher Begründung. Jeder NEUE
 *  Fall (nicht hier eingetragen) lässt den Test fehlschlagen, statt stillschweigend durchzugehen. */
const LITERAL_VALUE_EXCEPTIONS: Record<string, string[]> = {}

describe('Keine festen px-/rem-Größen, Hex-Farben oder rgba-Literale in components/ui-CSS-Modulen', () => {
  const files = listCssFiles()

  for (const file of files) {
    it(`${file}: enthält keine undokumentierten px-/rem-/Hex-/rgba-Literale außerhalb von @media/@container-Bedingungen`, () => {
      const content = fs.readFileSync(path.join(UI_DIR, file), 'utf8')
      const violations = findLiteralViolations(content)
      const allowed = new Set(LITERAL_VALUE_EXCEPTIONS[file] ?? [])
      const unexpected = violations.filter((violation) => !allowed.has(violation.text))

      expect(
        unexpected,
        `${file} enthält rohe Literale statt globaler Tokens:\n${unexpected.map((v) => `  Zeile ${v.line}: ${v.text}`).join('\n')}\n-- als globalen Token in src/styles/tokens/*.css definieren und per var(...) referenzieren, oder (falls bewusst) in LITERAL_VALUE_EXCEPTIONS mit Begründung eintragen.`,
      ).toEqual([])
    })
  }

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Scanner selbst nicht stillschweigend bricht', () => {
    const sample = '.iconButton {\n  width: 40px;\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);\n}'
    const violations = findLiteralViolations(sample)
    expect(violations.map((v) => v.text)).toEqual(['40px', 'rgba(255, 255, 255, 0.7)'])
  })

  it('lässt Literale innerhalb einer @media/@container-Bedingungszeile unangetastet (technische CSS-Grenze, keine Nachlässigkeit)', () => {
    const sample = '@media (max-width: 767px) {\n  .foo {\n    color: var(--text-strong);\n  }\n}'
    expect(findLiteralViolations(sample)).toEqual([])
  })

  it('LITERAL_VALUE_EXCEPTIONS verweist nur auf Dateien, die tatsächlich existieren', () => {
    for (const file of Object.keys(LITERAL_VALUE_EXCEPTIONS)) {
      expect(fs.existsSync(path.join(UI_DIR, file)), `${file} aus LITERAL_VALUE_EXCEPTIONS existiert nicht mehr -- Eintrag entfernen`).toBe(true)
    }
  })
})
