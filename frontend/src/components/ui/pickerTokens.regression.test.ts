import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regressionsnachweis für die Picker-Token-Umstellung von DatePicker/YearPicker (Review-Runde 1,
 * 2026-10-30): liest die realen CSS-Texte per `fs` (kein Rendering, Muster analog zu
 * typography.regression.test.ts/catalogTaxonomy.test.ts) und beweist zweierlei: (1) globals.css
 * deklariert die neuen, geteilten --picker-*-Tokens; (2) DatePicker.module.css und
 * YearPicker.module.css referenzieren diese Tokens, statt weiterhin eigene Farb-/Radius-/
 * Verlaufs-Literale (Hex, rgba(), color-mix() mit eigenem Prozentsatz, bare px-Radien in den
 * betroffenen Regeln) zu deklarieren.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

function readUiFile(file: string): string {
  return fs.readFileSync(path.join(UI_DIR, file), 'utf8')
}

function readGlobalsCss(): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')
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

describe('Picker-Token-Regression nach Review-Runde 1 (DatePicker/YearPicker)', () => {
  const globalsCss = readGlobalsCss()
  const datePickerCss = readUiFile('DatePicker.module.css')
  const yearPickerCss = readUiFile('YearPicker.module.css')

  it('globals.css deklariert die geteilten --picker-*-Tokens für Panel-Radius, Kachel-Radius/-Hover/-Heute/-Gedämpft und Auslöser-Hinweistext', () => {
    expect(globalsCss).toMatch(/--picker-panel-radius:\s*14px;/)
    expect(globalsCss).toMatch(/--picker-hint-color:\s*#748097;/)
    expect(globalsCss).toMatch(/--picker-tile-radius:\s*7px;/)
    expect(globalsCss).toMatch(/--picker-tile-hover-border-color:\s*color-mix\(in srgb, var\(--accent-primary\) 20%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-hover-bg:\s*color-mix\(in srgb, var\(--accent-primary\) 8%, #fff\);/)
    expect(globalsCss).toMatch(/--picker-tile-today-border-color:\s*color-mix\(in srgb, var\(--accent-primary\) 34%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-muted-border-color:\s*color-mix\(in srgb, var\(--text-secondary\) 12%, transparent\);/)
    expect(globalsCss).toMatch(/--picker-tile-muted-bg:\s*color-mix\(in srgb, #fff 84%, var\(--bg-secondary\)\);/)
  })

  it('DatePickers Panel bezieht Radius aus --picker-panel-radius statt eines eigenen Literals', () => {
    const panelRule = mergedBlocks(datePickerCss, '.datePickerPanel')
    expect(panelRule).toMatch(/border-radius:\s*var\(--picker-panel-radius\);/)
  })

  it('DatePickers Tages-/Monats-/Jahres-Kacheln beziehen Radius aus --picker-tile-radius statt eines eigenen Literals', () => {
    expect(datePickerCss).toMatch(/border-radius:\s*var\(--picker-tile-radius\);/)
  })

  it('DatePickers Hover-/Heute-/Gedämpft-Zustände beziehen Farben aus den --picker-tile-*-Tokens statt eigener color-mix()-Literale', () => {
    expect(datePickerCss).toMatch(/border-color:\s*var\(--picker-tile-hover-border-color\);/)
    expect(datePickerCss).toMatch(/background:\s*var\(--picker-tile-hover-bg\);/)
    expect(datePickerCss).toMatch(/border-color:\s*var\(--picker-tile-today-border-color\);/)
    expect(datePickerCss).toMatch(/border-color:\s*var\(--picker-tile-muted-border-color\);/)
    expect(datePickerCss).toMatch(/background:\s*var\(--picker-tile-muted-bg\);/)
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
