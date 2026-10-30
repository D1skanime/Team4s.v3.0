import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Pixel-Regressionsnachweis für die interne Heading/Text-Umstellung von PageHeader/
 * SectionHeader/DialogHeader/Card (UAT-Befund 5): liest die realen CSS-Texte per `fs` (kein
 * Rendering, Muster analog zu catalogTaxonomy.test.ts/roleCatalog.accessibility.test.ts) und
 * beweist, dass jede Komponente nach der Umstellung auf die geteilten Heading/Text-Bausteine
 * BYTE-IDENTISCHE effektive font-size/color/line-height/letter-spacing/margin-Werte behält wie
 * vor der Umstellung. Besonders kritisch: SectionHeaders .sectionDescription muss die VOLLE
 * margin-Shorthand setzen (nicht nur margin-top) -- Text.module.css nimmt bewusst KEINEN
 * eigenen margin-Reset vor, ein unvollständiger Reset würde den Browser-Standard-Absatzabstand
 * unten/seitlich wieder durchschlagen lassen.
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

describe('Typografie-Pixel-Regression nach Heading/Text-Umstellung', () => {
  const globalsCss = readGlobalsCss()

  it('globals.css deklariert die Typografie-Skala, von der die Heading-Groessen abgeleitet werden', () => {
    expect(globalsCss).toMatch(/--font-size-h1:\s*clamp\(2rem,\s*3vw,\s*2\.75rem\);/)
    expect(globalsCss).toMatch(/--font-size-h2:\s*1\.25rem;/)
    expect(globalsCss).toMatch(/--font-size-h3:\s*1rem;/)
  })

  describe('PageHeader', () => {
    const pageHeaderCss = readUiFile('PageHeader.module.css')
    const pageHeaderTsx = readUiFile('PageHeader.tsx')

    it('rendert den Titel ueber Heading level=1 statt eines eigenen h1', () => {
      expect(pageHeaderTsx).toMatch(/<Heading\s+level=\{1\}/)
    })

    it('Titel: font-size clamp(2rem, 3vw, 2.75rem) (ueber Heading .headingSize1), color var(--text-strong), line-height 0.98, letter-spacing -0.035em, margin 0 -- kein eigenes font-size mehr', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize1\s*\{\s*font-size:\s*var\(--font-size-h1\);\s*\}/)

      const titleRule = mergedBlocks(pageHeaderCss, '.pageTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/color:\s*var\(--text-strong\);/)
      expect(titleRule).toMatch(/line-height:\s*0\.98;/)
      expect(titleRule).toMatch(/letter-spacing:\s*-0\.035em;/)
      expect(titleRule).not.toMatch(/font-size:/)
    })

    it('Beschreibung: font-size 1rem / color #657086 ueber --text-meta-size/-color-Overrides, margin 8px 0 0', () => {
      expect(pageHeaderTsx).toMatch(/<Text\s+variant="meta"/)
      const descriptionRule = mergedBlocks(pageHeaderCss, '.pageDescription')
      expect(descriptionRule).toMatch(/margin:\s*8px 0 0;/)
      expect(descriptionRule).toMatch(/--text-meta-size:\s*1rem;/)
      expect(descriptionRule).toMatch(/--text-meta-color:\s*#657086;/)
    })
  })

  describe('SectionHeader', () => {
    const sectionHeaderCss = readUiFile('SectionHeader.module.css')
    const sectionHeaderTsx = readUiFile('SectionHeader.tsx')

    it('rendert den Titel ueber Heading size=3 statt der lokalen Heading-Variable', () => {
      expect(sectionHeaderTsx).toMatch(/<Heading\s+level=\{level\}\s+size=\{3\}/)
    })

    it('Titel: font-size 1rem (ueber Heading .headingSize3), color var(--text-strong), line-height 1.15, letter-spacing -0.015em, margin 0', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize3\s*\{\s*font-size:\s*var\(--font-size-h3\);\s*\}/)

      const titleRule = mergedBlocks(sectionHeaderCss, '.sectionTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/color:\s*var\(--text-strong\);/)
      expect(titleRule).toMatch(/line-height:\s*1\.15;/)
      expect(titleRule).toMatch(/letter-spacing:\s*-0\.015em;/)
      expect(titleRule).not.toMatch(/font-size:/)
    })

    it('Beschreibung: font-size 0.92rem / color #657086 ueber --text-soft-size/-color-Overrides, UND die VOLLE margin-Shorthand margin 6px 0 0 (nicht nur margin-top)', () => {
      expect(sectionHeaderTsx).toMatch(/<Text\s+variant="soft"/)
      const descriptionRule = mergedBlocks(sectionHeaderCss, '.sectionDescription')
      // Kritisch: volle Shorthand, NICHT nur margin-top -- Text setzt keinen eigenen Reset,
      // ein unvollständiger Reset ließe den Browser-Standard-Absatzabstand unten/seitlich
      // durchschlagen.
      expect(descriptionRule).toMatch(/margin:\s*6px 0 0;/)
      expect(descriptionRule).not.toMatch(/margin-top:\s*6px;/)
      expect(descriptionRule).toMatch(/--text-soft-size:\s*0\.92rem;/)
      expect(descriptionRule).toMatch(/--text-soft-color:\s*#657086;/)
    })
  })

  describe('DialogHeader', () => {
    const dialogHeaderCss = readUiFile('DialogHeader.module.css')
    const dialogHeaderTsx = readUiFile('DialogHeader.tsx')

    it('rendert den Titel ueber Heading level=3 size=2 (semantisches h3, visuell wie H2) statt eines eigenen h3', () => {
      expect(dialogHeaderTsx).toMatch(/<Heading\s+level=\{3\}\s+size=\{2\}/)
    })

    it('Titel: font-size 1.25rem (ueber Heading .headingSize2), color var(--text-strong), margin 0', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize2\s*\{\s*font-size:\s*var\(--font-size-h2\);\s*\}/)

      const titleRule = mergedBlocks(dialogHeaderCss, '.dialogTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/color:\s*var\(--text-strong\);/)
      expect(titleRule).not.toMatch(/font-size:/)
    })

    it('Beschreibung: font-size 1rem / color var(--text-soft) entsprechen bereits dem Text-"soft"-Default -- keine CSS-Variablen-Ueberschreibung noetig, nur margin 6px 0 0 bleibt', () => {
      expect(dialogHeaderTsx).toMatch(/<Text\s+variant="soft"/)
      const descriptionRule = mergedBlocks(dialogHeaderCss, '.dialogDescription')
      expect(descriptionRule).toMatch(/margin:\s*6px 0 0;/)
      expect(descriptionRule).not.toMatch(/color:/)
    })
  })

  describe('Card', () => {
    const cardCss = readUiFile('Card.module.css')
    const cardTsx = readUiFile('Card.tsx')

    it('rendert den Titel ueber Heading level=3 size=3 statt eines eigenen h3', () => {
      expect(cardTsx).toMatch(/<Heading\s+level=\{3\}\s+size=\{3\}/)
    })

    it('Titel: font-size 1rem (ueber Heading .headingSize3) OHNE eigene color-Deklaration (bleibt bewusst vererbt), line-height 1.3, margin 0', () => {
      const titleRule = mergedBlocks(cardCss, '.cardTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/line-height:\s*1\.3;/)
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/color:/)
    })

    it('Beschreibung: font-size 0.92rem ueber --text-soft-size-Override (color-Override nicht noetig, var(--text-soft) ist bereits der Text-"soft"-Default), margin 4px 0 0', () => {
      expect(cardTsx).toMatch(/<Text\s+variant="soft"/)
      const descriptionRule = mergedBlocks(cardCss, '.cardDescription')
      expect(descriptionRule).toMatch(/margin:\s*4px 0 0;/)
      expect(descriptionRule).toMatch(/--text-soft-size:\s*0\.92rem;/)
      expect(descriptionRule).not.toMatch(/color:/)
    })
  })
})
