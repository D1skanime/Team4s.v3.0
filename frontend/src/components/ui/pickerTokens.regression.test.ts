import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regressionsnachweis für die Picker-Token-Umstellung von DatePicker/YearPicker sowie für
 * IconButtons offizielle field-/tile-Varianten (DatePickers Kachel-/Feld-Grundrezept): liest die
 * realen CSS-Texte per `fs` (kein Rendering, Muster analog zu
 * typography.regression.test.ts/catalogTaxonomy.test.ts) und beweist: (1) globals.css deklariert
 * die geteilten --picker-*-Tokens; (2) DatePicker.module.css/YearPicker.module.css referenzieren
 * diese Tokens statt eigener Farb-/Radius-/Verlaufs-Literale; (3) die Tages-/Monats-/Jahres-
 * Kacheln und der Feld-Auslöser beziehen ihre Grundfläche/-form/-radius/-hover/-"ausgewählt"-
 * Optik aus IconButtons offiziellen field-/tile-Varianten statt aus einem externen Element+
 * Klasse-/!important-Override dieser Dateien; (4) keine der beiden Dateien enthält mehr
 * !important.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

function readUiFile(file: string): string {
  return fs.readFileSync(path.join(UI_DIR, file), 'utf8')
}

function readGlobalsCss(): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')
}

/** Entfernt CSS-Kommentare, damit ein Textcheck (z. B. "kein !important mehr") nicht an einem
 *  erklärenden Kommentar scheitert, der das Wort selbst nur ERWÄHNT. */
function stripCssComments(cssText: string): string {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Fasst ALLE Deklarationsblöcke eines Selektors in einer CSS-Datei zusammen (manche Dateien
 *  deklarieren denselben Selektor bewusst in mehreren, thematisch getrennten Blöcken). */
function mergedBlocks(cssText: string, selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, '\\$&')
  const regex = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g')
  const blocks = [...cssText.matchAll(regex)].map((match) => match[1])
  expect(blocks.length, `${selector} must exist in the stylesheet`).toBeGreaterThan(0)
  return blocks.join('\n')
}

describe('Picker-Token-Regression (DatePicker/YearPicker/IconButton)', () => {
  const globalsCss = readGlobalsCss()
  const datePickerCss = readUiFile('DatePicker.module.css')
  const yearPickerCss = readUiFile('YearPicker.module.css')
  const iconButtonCss = readUiFile('IconButton.module.css')

  it('globals.css deklariert die geteilten --picker-*-Tokens für Panel-Radius/-Maße, Kachel-Radius/-Hover/-Heute/-Gedämpft und Auslöser-Hinweistext', () => {
    expect(globalsCss).toMatch(/--picker-panel-radius:\s*14px;/)
    expect(globalsCss).toMatch(/--picker-hint-color:\s*#748097;/)
    expect(globalsCss).toMatch(/--picker-tile-radius:\s*7px;/)
    expect(globalsCss).toMatch(/--picker-tile-hover-border-color:\s*color-mix\(in srgb, var\(--accent-primary\) 20%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-hover-bg:\s*color-mix\(in srgb, var\(--accent-primary\) 8%, #fff\);/)
    expect(globalsCss).toMatch(/--picker-tile-today-border-color:\s*color-mix\(in srgb, var\(--accent-primary\) 34%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-muted-border-color:\s*color-mix\(in srgb, var\(--text-secondary\) 12%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-muted-bg:\s*color-mix\(in srgb, #fff 84%, var\(--bg-secondary\)\);/)
    expect(globalsCss).toMatch(/--picker-panel-width:\s*334px;/)
    expect(globalsCss).toMatch(/--picker-panel-width-mobile:\s*318px;/)
    expect(globalsCss).toMatch(/--picker-panel-max-height:\s*430px;/)
    expect(globalsCss).toMatch(/--picker-panel-max-height-mobile:\s*390px;/)
  })

  it('DatePickers Panel bezieht Radius/Maße aus --picker-panel-*-Tokens statt eigener Literale', () => {
    const panelRule = mergedBlocks(datePickerCss, '.datePickerPanel')
    expect(panelRule).toMatch(/border-radius:\s*var\(--picker-panel-radius\);/)
    expect(panelRule).toMatch(/var\(--picker-panel-width\)/)
    expect(panelRule).toMatch(/var\(--picker-panel-max-height\)/)
  })

  it('IconButtons tile-Variante (Basis für DatePickers Tages-/Monats-/Jahres-Kacheln) bezieht Radius/Hover aus den --picker-tile-*-Tokens statt DatePicker selbst', () => {
    const tileRule = mergedBlocks(iconButtonCss, '.iconButtonTile')
    expect(tileRule).toMatch(/border-radius:\s*var\(--picker-tile-radius\);/)

    const tileHoverRule = mergedBlocks(iconButtonCss, '.iconButtonTile:hover:not\\(:disabled\\)')
    expect(tileHoverRule).toMatch(/border-color:\s*var\(--picker-tile-hover-border-color\);/)
    expect(tileHoverRule).toMatch(/background:\s*var\(--picker-tile-hover-bg\);/)

    // DatePicker selbst referenziert diese beiden Hover-Tokens nicht mehr -- sie leben jetzt
    // ausschließlich in IconButtons eigener tile-Variante.
    expect(datePickerCss).not.toMatch(/--picker-tile-hover-border-color/)
    expect(datePickerCss).not.toMatch(/--picker-tile-hover-bg/)
  })

  it('IconButtons tile-Variante markiert "ausgewählt" über aria-current/aria-pressed statt einer externen Klasse mit !important', () => {
    const selectedRuleMatch = iconButtonCss.match(
      /\.iconButtonTile\[aria-current\]:not\(\[aria-current="false"\]\),\s*\n\.iconButtonTile\[aria-pressed="true"\]\s*\{([^}]*)\}/,
    )
    expect(selectedRuleMatch, 'selected-state rule for .iconButtonTile must exist').not.toBeNull()
    const selectedRule = selectedRuleMatch![1]
    expect(selectedRule).toMatch(/border-color:\s*var\(--selection-tile-border-color\);/)
    expect(selectedRule).toMatch(/background:\s*var\(--selection-tile-gradient\);/)
    expect(selectedRule).not.toMatch(/!important/)
  })

  it('DatePickers "heute"/"gedämpft"-Akzente bleiben lokal und beziehen Farben aus den --picker-tile-*-Tokens statt eigener color-mix()-Literale', () => {
    expect(datePickerCss).toMatch(/border-color:\s*var\(--picker-tile-today-border-color\);/)
    expect(datePickerCss).toMatch(/border-color:\s*var\(--picker-tile-muted-border-color\);/)
    expect(datePickerCss).toMatch(/background:\s*var\(--picker-tile-muted-bg\);/)
  })

  it('DatePicker.module.css und IconButton.module.css enthalten kein !important mehr (außerhalb erklärender Kommentare)', () => {
    expect(stripCssComments(datePickerCss)).not.toMatch(/!important/)
    expect(stripCssComments(iconButtonCss)).not.toMatch(/!important/)
  })

  it('YearPickers Auslöser-Hinweistext bezieht die Farbe aus --picker-hint-color statt eines eigenen Hex-Literals', () => {
    const hintRule = mergedBlocks(yearPickerCss, '.yearPickerHint')
    expect(hintRule).toMatch(/color:\s*var\(--picker-hint-color\);/)
  })

  it('YearPickers Panel bezieht Rahmen/Hintergrund/Radius aus --field-border-color/--field-bg-hover/--picker-panel-radius statt eigener Literale', () => {
    const panelRule = mergedBlocks(yearPickerCss, '.yearPickerPanel')
    expect(panelRule).toMatch(/border:\s*1px solid var\(--field-border-color\);/)
    expect(panelRule).toMatch(/border-radius:\s*var\(--picker-panel-radius\);/)
    expect(panelRule).toMatch(/background:\s*var\(--field-bg-hover\);/)
  })

  it('DatePicker.module.css und YearPicker.module.css enthalten keine rgba()/color-mix()-Literale mehr', () => {
    expect(datePickerCss).not.toMatch(/rgba\(/)
    expect(datePickerCss).not.toMatch(/color-mix\(in srgb, var\(--accent-primary\) \d/)
    expect(datePickerCss).not.toMatch(/color-mix\(in srgb, var\(--text-secondary\) \d/)
    expect(datePickerCss).not.toMatch(/color-mix\(in srgb, #fff \d/)
    expect(yearPickerCss).not.toMatch(/rgba\(/)
  })

  it('YearPicker.module.css enthält kein eigenes Hex-Literal mehr außerhalb der ausgewählten --selection-tile-*-Tokens', () => {
    const hexLiterals = yearPickerCss.match(/#[0-9a-fA-F]{3,8}/g) ?? []
    expect(hexLiterals).toEqual([])
  })
})
