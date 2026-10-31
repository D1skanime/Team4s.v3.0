import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regressionsnachweis dafür, dass PageHeader/SectionHeader/DialogHeader/Card ihre Typografie
 * vollständig über die geteilten Heading/Text-Bausteine beziehen, statt eigene font-size-/
 * color-Literale zu deklarieren: liest die realen CSS-Texte per `fs` (kein Rendering, Muster
 * analog zu catalogTaxonomy.test.ts/roleCatalog.accessibility.test.ts). Besonders kritisch:
 * SectionHeaders .sectionDescription muss die VOLLE margin-Shorthand setzen (nicht nur
 * margin-top) -- Text.module.css nimmt bewusst KEINEN eigenen margin-Reset vor, ein
 * unvollständiger Reset würde den Browser-Standard-Absatzabstand unten/seitlich wieder
 * durchschlagen lassen.
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

  it('Heading liefert standardmaessig die Farbe ueber --text-strong -- Konsumenten brauchen dafuer keine eigene color-Deklaration mehr', () => {
    const headingRule = mergedBlocks(readUiFile('Heading.module.css'), '.heading')
    expect(headingRule).toMatch(/color:\s*var\(--text-strong\);/)
  })

  describe('PageHeader', () => {
    const pageHeaderCss = readUiFile('PageHeader.module.css')
    const pageHeaderTsx = readUiFile('PageHeader.tsx')

    it('rendert den Titel ueber Heading level=1 statt eines eigenen h1', () => {
      expect(pageHeaderTsx).toMatch(/<Heading\s+level=\{1\}/)
    })

    it('Titel: font-size clamp(2rem, 3vw, 2.75rem) (ueber Heading .headingSize1), color var(--text-strong) (ueber Headings Standardfarbe), line-height 0.98, letter-spacing -0.035em, margin 0 -- kein eigenes font-size/color mehr', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize1\s*\{\s*font-size:\s*var\(--font-size-h1\);\s*\}/)

      const titleRule = mergedBlocks(pageHeaderCss, '.pageTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/line-height:\s*0\.98;/)
      expect(titleRule).toMatch(/letter-spacing:\s*-0\.035em;/)
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/color:/)
    })

    it('Beschreibung: Text("meta")-Standardgroesse/-farbe ohne eigene Ueberschreibung, margin ueber --space-2-Token', () => {
      expect(pageHeaderTsx).toMatch(/<Text\s+variant="meta"/)
      const descriptionRule = mergedBlocks(pageHeaderCss, '.pageDescription')
      expect(descriptionRule).toMatch(/margin:\s*var\(--space-2\) 0 0;/)
      expect(descriptionRule).not.toMatch(/--text-meta-size:/)
      expect(descriptionRule).not.toMatch(/--text-meta-color:/)
    })

    it('Eyebrow: rendert ueber Text(variant="eyebrow") statt eines eigenen <p>', () => {
      expect(pageHeaderTsx).toMatch(/<Text\s+variant="eyebrow"/)
    })
  })

  describe('SectionHeader', () => {
    const sectionHeaderCss = readUiFile('SectionHeader.module.css')
    const sectionHeaderTsx = readUiFile('SectionHeader.tsx')

    it('rendert den Titel ueber Heading size=3 statt der lokalen Heading-Variable', () => {
      expect(sectionHeaderTsx).toMatch(/<Heading\s+level=\{level\}\s+size=\{3\}/)
    })

    it('Titel: font-size 1rem (ueber Heading .headingSize3), color var(--text-strong) (ueber Headings Standardfarbe), line-height 1.15, letter-spacing -0.015em, margin 0', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize3\s*\{\s*font-size:\s*var\(--font-size-h3\);\s*\}/)

      const titleRule = mergedBlocks(sectionHeaderCss, '.sectionTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/line-height:\s*1\.15;/)
      expect(titleRule).toMatch(/letter-spacing:\s*-0\.015em;/)
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/color:/)
    })

    it('Beschreibung: Text("meta")-Standardgroesse/-farbe (0.875rem, --text-soft) ohne eigene Ueberschreibung, UND die VOLLE margin-Shorthand ueber --space-2-Token (nicht nur margin-top)', () => {
      expect(sectionHeaderTsx).toMatch(/<Text\s+variant="meta"/)
      const descriptionRule = mergedBlocks(sectionHeaderCss, '.sectionDescription')
      // Kritisch: volle Shorthand, NICHT nur margin-top -- Text setzt keinen eigenen Reset,
      // ein unvollständiger Reset ließe den Browser-Standard-Absatzabstand unten/seitlich
      // durchschlagen.
      expect(descriptionRule).toMatch(/margin:\s*var\(--space-2\) 0 0;/)
      expect(descriptionRule).not.toMatch(/margin-top:/)
      expect(descriptionRule).not.toMatch(/--text-soft-size:/)
      expect(descriptionRule).not.toMatch(/--text-soft-color:/)
      expect(descriptionRule).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    })

    it('Eyebrow: rendert ueber Text(variant="eyebrow") statt eines eigenen <p>', () => {
      expect(sectionHeaderTsx).toMatch(/<Text\s+variant="eyebrow"/)
    })
  })

  describe('DialogHeader', () => {
    const dialogHeaderCss = readUiFile('DialogHeader.module.css')
    const dialogHeaderTsx = readUiFile('DialogHeader.tsx')

    it('rendert den Titel ueber Heading level=3 size=2 (semantisches h3, visuell wie H2) statt eines eigenen h3', () => {
      expect(dialogHeaderTsx).toMatch(/<Heading\s+level=\{3\}\s+size=\{2\}/)
    })

    it('Titel: font-size 1.25rem (ueber Heading .headingSize2), color var(--text-strong) (ueber Headings Standardfarbe), margin 0', () => {
      const headingCss = readUiFile('Heading.module.css')
      expect(headingCss).toMatch(/\.headingSize2\s*\{\s*font-size:\s*var\(--font-size-h2\);\s*\}/)

      const titleRule = mergedBlocks(dialogHeaderCss, '.dialogTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/color:/)
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

  // Live-UAT Runde 4, Befund 5 (allgemeine Prüfung): EmptyState/ErrorState/LoadingState teilten
  // sich bereits VOR dieser Umstellung dieselben .stateTitle/.stateDescription-Regeln in
  // ui.module.css -- ein eigener h3/p statt Heading/Text, mit denselben hartkodierten Werten.
  describe('EmptyState/ErrorState/LoadingState (geteilte .stateTitle/.stateDescription)', () => {
    const uiSharedCss = readUiFile('ui.module.css')

    it('rendern den Titel über Heading level=3 size=3 statt eines eigenen h3', () => {
      expect(readUiFile('EmptyState.tsx')).toMatch(/<Heading\s+level=\{3\}\s+size=\{3\}/)
      expect(readUiFile('ErrorState.tsx')).toMatch(/<Heading\s+level=\{3\}\s+size=\{3\}/)
      expect(readUiFile('LoadingState.tsx')).toMatch(/<Heading\s+level=\{3\}\s+size=\{3\}/)
    })

    it('rendern die Beschreibung über Text variant="soft" statt eines eigenen p', () => {
      expect(readUiFile('EmptyState.tsx')).toMatch(/<Text\s+variant="soft"/)
      expect(readUiFile('ErrorState.tsx')).toMatch(/<Text\s+variant="soft"/)
      expect(readUiFile('LoadingState.tsx')).toMatch(/<Text\s+variant="soft"/)
    })

    it('.stateTitle: line-height 1.25, margin 0 -- kein eigenes font-size/color mehr (Heading liefert beides)', () => {
      const titleRule = mergedBlocks(uiSharedCss, '.stateTitle')
      expect(titleRule).toMatch(/margin:\s*0;/)
      expect(titleRule).toMatch(/line-height:\s*1\.25;/)
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/color:/)
    })

    it('.stateDescription: line-height 1.55, margin 0 -- kein eigenes color mehr (Text "soft" liefert denselben var(--text-soft)-Wert)', () => {
      const descriptionRule = mergedBlocks(uiSharedCss, '.stateDescription')
      expect(descriptionRule).toMatch(/margin:\s*0;/)
      expect(descriptionRule).toMatch(/line-height:\s*1\.55;/)
      expect(descriptionRule).not.toMatch(/color:/)
    })
  })

  // ArtworkHero rendert Titel/Kontextzeile über Heading/Text statt eines eigenen h1/p. Der Titel
  // nutzt Headings size="hero"-Stufe -- dadurch braucht ArtworkHero kein eigenes font-size/
  // color/margin/font-weight mehr, auch keinen eigenen Element+Klasse-Override.
  describe('ArtworkHero', () => {
    const artworkHeroCss = readUiFile('ArtworkHero.module.css')
    const artworkHeroTsx = readUiFile('ArtworkHero.tsx')

    it('rendert den Titel über Heading level=1 size="hero" statt eines eigenen h1', () => {
      expect(artworkHeroTsx).toMatch(/<Heading\s+level=\{1\}\s+size="hero"/)
    })

    it('Titel: kein eigenes font-size/color/margin/font-weight mehr (Heading liefert alles über size="hero")', () => {
      const titleRule = mergedBlocks(artworkHeroCss, '.title')
      expect(titleRule).not.toMatch(/font-size:/)
      expect(titleRule).not.toMatch(/margin:/)
      expect(titleRule).not.toMatch(/font-weight:/)
      expect(titleRule).not.toMatch(/color:/)
    })

    it('rendert die Kontextzeile über Text variant="meta" statt eines eigenen p', () => {
      expect(artworkHeroTsx).toMatch(/<Text\s+variant="meta"/)
    })

    it('Kontextzeile: Text("meta")-Standardgroesse/-farbe (0.875rem, --text-soft) ohne eigene Ueberschreibung', () => {
      const contextRule = mergedBlocks(artworkHeroCss, '.context')
      expect(contextRule).not.toMatch(/--text-soft-size:/)
      expect(contextRule).not.toMatch(/color:/)
    })
  })
})
