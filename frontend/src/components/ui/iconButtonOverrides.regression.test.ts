import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Verhindert den Rückfall in "<button>-Element-Typ-Selektor + lokale Klasse" als Spezifitäts-
 * Trick (Spezifität 0,1,1), um IconButtons/Buttons eigene Stile (Spezifität 0,1,0) von außen zu
 * überschreiben, statt eine offizielle Prop/Variante zu nutzen -- genau das Muster, das YearPicker
 * (`button.yearPickerTrigger`/`button.yearPickerYear`), DatePicker (`button.datePickerClearButton`,
 * Tages-/Monats-/Jahres-Kacheln, Footer) und AvatarStack (`button.avatarStackOverflowButton`) vor
 * dieser Runde nutzten. Dieser Test liest die realen CSS-Texte per `fs` (kein Rendering, Muster
 * analog zu foreignVariableOverrides.regression.test.ts) und schlägt bei jedem `button.<klasse>`-
 * Selektor außerhalb der beiden besitzenden Dateien fehl -- die benötigte Optik muss stattdessen
 * über eine offizielle Prop/Variante von IconButton oder Button kommen (siehe IconButton.tsx/
 * Button.tsx: weight, minHeight, tileFill, dimmed, highlighted, overlap, tone).
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

/** Dateien, die den Element-Typ-Selektor `button` selbst legitim besitzen (Button/IconButton
 *  definieren dort ihre eigene Basis-Optik, kein Fremdzugriff). */
const OWNING_FILES = new Set(['Button.module.css', 'IconButton.module.css'])

/** Nur echte Selektoren zählen, keine bloßen Erwähnungen in erklärenden Kommentaren. */
function stripCssComments(cssText: string): string {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Matcht `button.irgendeineKlasse` als Selektor-Start (nach Komma, Zeilenumbruch oder
 *  öffnender Klammer) -- genau das Muster, das durch die höhere Spezifität (0,1,1 statt 0,1,0
 *  einer einzelnen Klasse) eine fremde Komponente von außen überschreibt. */
const BUTTON_ELEMENT_SELECTOR_PATTERN = /(?:^|[,\s{])button\.[a-zA-Z][\w-]*/g

function listCssFiles(): string[] {
  return fs
    .readdirSync(UI_DIR)
    .filter((file) => file.endsWith('.module.css'))
    .sort()
}

function findButtonElementSelectors(cssText: string): string[] {
  const stripped = stripCssComments(cssText)
  return [...stripped.matchAll(BUTTON_ELEMENT_SELECTOR_PATTERN)].map((match) => match[0].replace(/^[,\s{]/, ''))
}

describe('Keine button.<Klasse>-Spezifitäts-Overrides von IconButton/Button außerhalb ihrer eigenen Dateien', () => {
  const cssFiles = listCssFiles().filter((file) => !OWNING_FILES.has(file))

  for (const file of cssFiles) {
    it(`${file}: überschreibt IconButton/Button nicht per button.<Klasse>-Element-Selektor`, () => {
      const content = fs.readFileSync(path.join(UI_DIR, file), 'utf8')
      const matches = findButtonElementSelectors(content)

      expect(
        matches,
        `${file} überschreibt IconButton/Button per Element+Klasse-Selektor: ${matches.join(', ')} -- offizielle Prop/Variante auf IconButton/Button nutzen (weight/minHeight/tileFill/dimmed/highlighted/overlap/tone) statt Spezifität zu erzwingen.`,
      ).toEqual([])
    })
  }

  it('erfasst das historische Verstoßmuster (Beispiel-String), damit der Regex selbst nicht stillschweigend bricht', () => {
    const sample = 'button.yearPickerTrigger {\n  font-weight: 700;\n}'
    expect(findButtonElementSelectors(sample)).toEqual(['button.yearPickerTrigger'])
  })
})
