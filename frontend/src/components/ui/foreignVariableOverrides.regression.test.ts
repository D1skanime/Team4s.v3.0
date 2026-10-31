import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Verhindert den Rückfall in "private Variable eines fremden Bausteins von außen setzen" statt
 * einer offiziellen Prop/Variante: `Text` dokumentiert sein `--text-<variante>-size`/`-color`-
 * Muster als eigenen internen Mechanismus (Text.module.css) -- ein ANDERER Baustein, der diese
 * Variable in SEINER EIGENEN CSS-Datei setzt, umgeht Texts öffentliche API (den `variant`-Prop)
 * und hängt von der CSS-Modul-Bündel-Reihenfolge ab, statt eine zuverlässige, typgeprüfte
 * Komponenten-Schnittstelle zu nutzen. Dieser Test liest die realen CSS-Texte per `fs` (kein
 * Rendering, Muster analog zu catalogTaxonomy.test.ts) und schlägt bei jedem nicht dokumentierten
 * Fall mit Datei+Variable fehl.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

/** Textsvariablen-Familie: nur SETZEN (":"-Zuweisung), nicht bloßes LESEN mit Fallback
 *  (`var(--text-x, fallback)`) gilt als Verstoß -- Lesen mit eigenem Fallback ist eine lose,
 *  unidirektionale Konvention ohne Rückwirkung auf Text selbst. */
const FOREIGN_TEXT_VARIABLE_PATTERN = /--text-(?:body|soft|meta|small|eyebrow)-(?:size|color)\s*:/g

/** Datei, die eine Textvariable SELBST definiert/besitzt -- dort ist das Setzen per Definition
 *  kein Fremdzugriff. */
const OWNING_FILE = 'Text.module.css'

/** Bereits bestehende, bewusst NICHT in dieser Runde migrierte Fälle, jeweils mit Begründung.
 *  Jeder NEUE Fall (nicht in dieser Liste) lässt den Test fehlschlagen, statt stillschweigend
 *  durchzugehen. */
const EXCEPTIONS: Record<string, string[]> = {
  // .cardDescription: bereits von typography.regression.test.ts als bewusster, getesteter
  // Sonderfall geführt (0.92rem passt zu keiner bestehenden Text-Variante exakt) -- nicht Teil
  // dieser Runde, da im Befund nicht genannt.
  'Card.module.css': ['--text-soft-size'],
  // .promptLabel (UploadDropzone, @container-Regel): verkleinert die Schrift unterhalb der
  // Inline-Layout-Schwelle -- nicht Teil dieser Runde (Befund nennt nur MediaSlot/UploadDropzone-
  // Kommentare, keine CSS-Architektur).
  'UploadDropzone.module.css': ['--text-body-size'],
}

function listCssFiles(): string[] {
  return fs
    .readdirSync(UI_DIR)
    .filter((file) => file.endsWith('.module.css'))
    .sort()
}

function findSetVariables(cssText: string): string[] {
  const matches = [...cssText.matchAll(FOREIGN_TEXT_VARIABLE_PATTERN)]
  return matches.map((match) => match[0].replace(/\s*:$/, ''))
}

describe('Keine fremden Text-Variablen-Overrides in components/ui-CSS-Modulen', () => {
  const cssFiles = listCssFiles().filter((file) => file !== OWNING_FILE)

  for (const file of cssFiles) {
    it(`${file}: setzt keine undokumentierte --text-*-size/-color-Variable von außen`, () => {
      const content = fs.readFileSync(path.join(UI_DIR, file), 'utf8')
      const setVariables = findSetVariables(content)
      const allowed = new Set(EXCEPTIONS[file] ?? [])
      const violations = setVariables.filter((variable) => !allowed.has(variable))

      expect(
        violations,
        `${file} setzt Texts private Variable(n) von außen: ${violations.join(', ')} -- offizielle Text-Variante/Prop nutzen statt die Variable zu setzen, oder (falls bewusst) in EXCEPTIONS mit Begründung eintragen.`,
      ).toEqual([])
    })
  }

  it('EXCEPTIONS verweist nur auf Dateien, die tatsächlich existieren und die Variable tatsächlich setzen', () => {
    for (const [file, variables] of Object.entries(EXCEPTIONS)) {
      const filePath = path.join(UI_DIR, file)
      expect(fs.existsSync(filePath), `${file} aus EXCEPTIONS existiert nicht mehr -- Eintrag entfernen`).toBe(true)
      const content = fs.readFileSync(filePath, 'utf8')
      const setVariables = new Set(findSetVariables(content))
      for (const variable of variables) {
        expect(setVariables.has(variable), `${file} setzt ${variable} nicht (mehr) -- EXCEPTIONS-Eintrag entfernen`).toBe(true)
      }
    }
  })
})
