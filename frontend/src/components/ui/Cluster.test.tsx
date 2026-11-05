// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Cluster } from './Cluster'

describe('Cluster', () => {
  it('rendert als div mit der Grundklasse und setzt die Standardwerte', () => {
    const { container } = render(<Cluster>Inhalt</Cluster>)

    const node = container.firstElementChild as HTMLElement
    expect(node.tagName).toBe('DIV')
    expect(node.className).toMatch(/cluster/)
    expect(node.style.getPropertyValue('--cluster-gap')).toBe('var(--space-badge-row)')
    expect(node.style.getPropertyValue('--cluster-align')).toBe('center')
    expect(node.style.getPropertyValue('--cluster-justify')).toBe('flex-start')
    expect(node.style.getPropertyValue('--cluster-wrap')).toBe('wrap')
  })

  it('setzt jeden dokumentierten gap-Zweck als eigene CSS-Variable', () => {
    const { container: contentPair } = render(<Cluster gap="contentPair">Inhalt</Cluster>)
    expect((contentPair.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-content-pair)')

    const { container: actionRow } = render(<Cluster gap="actionRow">Inhalt</Cluster>)
    expect((actionRow.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-action-row)')

    const { container: interactiveChipRow } = render(<Cluster gap="interactiveChipRow">Inhalt</Cluster>)
    expect((interactiveChipRow.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-interactive-chip-row)')

    const { container: labelWithTrailingMeta } = render(<Cluster gap="labelWithTrailingMeta">Inhalt</Cluster>)
    expect((labelWithTrailingMeta.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-label-with-trailing-meta)')

    const { container: mediaCaption } = render(<Cluster gap="mediaCaption">Inhalt</Cluster>)
    expect((mediaCaption.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-media-caption)')
  })

  it('übersetzt justify in das reale CSS-Schlüsselwort', () => {
    const { container: between } = render(<Cluster justify="between">Inhalt</Cluster>)
    expect((between.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-justify')).toBe('space-between')

    const { container: start } = render(<Cluster justify="start">Inhalt</Cluster>)
    expect((start.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-justify')).toBe('flex-start')
  })

  it('schaltet wrap zwischen wrap/nowrap um', () => {
    const { container: noWrap } = render(<Cluster wrap={false}>Inhalt</Cluster>)
    expect((noWrap.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-wrap')).toBe('nowrap')
  })

  it('reicht unbekannte Props (role/aria-label) an den DOM-Knoten durch', () => {
    render(
      <Cluster role="group" aria-label="Fansub-Gruppe" data-testid="cluster-group">
        Inhalt
      </Cluster>,
    )

    const node = screen.getByTestId('cluster-group')
    expect(node.getAttribute('role')).toBe('group')
    expect(node.getAttribute('aria-label')).toBe('Fansub-Gruppe')
  })

  it('setzt den neuen Zweck "independentBlocks" (geteilt mit Stack) als eigene CSS-Variable', () => {
    const { container } = render(<Cluster gap="independentBlocks">Inhalt</Cluster>)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe(
      'var(--space-independent-blocks)',
    )
  })

  it('setzt den neuen Zweck "secondaryActionRow" (dichte, rechtsbündige Sekundär-Aktions-Reihe, fünfte Gap-Closure-Runde) als eigene CSS-Variable', () => {
    const { container } = render(<Cluster gap="secondaryActionRow">Inhalt</Cluster>)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe(
      'var(--space-secondary-action-row)',
    )
  })

  it('bleibt ohne collapseBelow/float ein einzelnes, unveraendertes Element (Zero-Pixel-Diff fuer jeden bestehenden Aufrufer)', () => {
    const { container } = render(<Cluster>Inhalt</Cluster>)
    const node = container.firstElementChild as HTMLElement
    expect(node.className).toMatch(/cluster/)
    expect(node.className).not.toMatch(/clusterQueryContainer/)
    expect(node.firstElementChild).toBeNull()
    expect(node.textContent).toBe('Inhalt')
  })

  describe('collapseBelow/gapCollapsed (Haltepunkt-Umkehr)', () => {
    it('rendert einen zweistufigen Container-Query-Wrapper, wenn collapseBelow gesetzt ist', () => {
      const { container } = render(
        <Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks">
          Inhalt
        </Cluster>,
      )

      const outer = container.firstElementChild as HTMLElement
      expect(outer.className).toMatch(/clusterQueryContainer/)

      const inner = outer.firstElementChild as HTMLElement
      expect(inner.className).toMatch(/cluster/)
      expect(inner.textContent).toBe('Inhalt')
    })

    it('loest gapCollapsed auf ein eigenes, von gap verschiedenes Zweck-Token auf', () => {
      const { container } = render(
        <Cluster collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks">
          Inhalt
        </Cluster>,
      )

      const outer = container.firstElementChild as HTMLElement
      expect(outer.style.getPropertyValue('--cluster-gap')).toBe('var(--space-content-pair)')
      expect(outer.style.getPropertyValue('--cluster-gap-collapsed')).toBe('var(--space-independent-blocks)')
    })

    it('setzt --cluster-gap-collapsed NICHT, wenn gapCollapsed nicht uebergeben wird (CSS-Fallback auf gap greift)', () => {
      const { container } = render(
        <Cluster collapseBelow="md" gap="contentPair">
          Inhalt
        </Cluster>,
      )

      const outer = container.firstElementChild as HTMLElement
      expect(outer.style.getPropertyValue('--cluster-gap-collapsed')).toBe('')
    })
  })

  describe('float (Schwebe-Overlay-Modus)', () => {
    it('rendert den zweistufigen Container-Query-Wrapper mit der Schwebe-Modifikatorklasse, wenn float gesetzt ist', () => {
      const { container } = render(
        <Cluster float="controlBand" gap="contentPair" justify="center">
          Inhalt
        </Cluster>,
      )

      const outer = container.firstElementChild as HTMLElement
      expect(outer.className).toMatch(/clusterQueryContainer/)

      const inner = outer.firstElementChild as HTMLElement
      expect(inner.className).toMatch(/cluster/)
      expect(inner.className).toMatch(/floatControlBand/)
      expect(inner.textContent).toBe('Inhalt')
    })

    it('bleibt ohne float eine normale Cluster-Zeile ohne die Schwebe-Modifikatorklasse', () => {
      const { container } = render(<Cluster gap="contentPair">Inhalt</Cluster>)
      const node = container.firstElementChild as HTMLElement
      expect(node.className).not.toMatch(/floatControlBand/)
      expect(node.className).not.toMatch(/clusterQueryContainer/)
    })

    it('collapseBelow und float koennen unabhaengig voneinander gesetzt sein (beide loesen denselben Wrapper aus)', () => {
      const { container } = render(
        <Cluster collapseBelow="md" float="controlBand">
          Inhalt
        </Cluster>,
      )
      const outer = container.firstElementChild as HTMLElement
      const inner = outer.firstElementChild as HTMLElement
      expect(inner.className).toMatch(/collapsibleMd/)
      expect(inner.className).toMatch(/floatControlBand/)
    })

    it('setzt die Schwebe-Positionierungs-Modifikatorklasse auf dem AEUSSEREN Wurzelelement, nicht nur dem inneren Flex-Kind (sonst bliebe das Wurzelelement bei einem umgebenden Flex-/Grid-"gap" ein teilnehmendes, 0px hohes Element)', () => {
      const { container } = render(
        <Cluster float="controlBand" gap="contentPair" justify="center">
          Inhalt
        </Cluster>,
      )

      const outer = container.firstElementChild as HTMLElement
      expect(outer.className).toMatch(/floatControlBandRoot/)
    })

    it('setzt die Schwebe-Positionierungs-Modifikatorklasse NICHT auf dem Wurzelelement, wenn float nicht gesetzt ist (auch nicht bei gesetztem collapseBelow)', () => {
      const { container } = render(
        <Cluster collapseBelow="md" gap="contentPair">
          Inhalt
        </Cluster>,
      )
      const outer = container.firstElementChild as HTMLElement
      expect(outer.className).not.toMatch(/floatControlBandRoot/)
    })
  })

  describe('Cluster.module.css (float="controlBand" Positionierungs-Architektur)', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/Cluster.module.css'), 'utf8')

    it('setzt position:absolute/z-index/pointer-events auf .floatControlBandRoot ueber eine normale @media-Abfrage, NICHT ueber @container (ein Container darf laut Spezifikation nie das eigene Wurzelelement selbst umordnen)', () => {
      const mediaBlockStart = css.indexOf('@media (min-width: 768px)')
      expect(mediaBlockStart).toBeGreaterThan(-1)
      const rule = css.slice(mediaBlockStart).match(/\.floatControlBandRoot\s*\{([^}]+)\}/)?.[1]
      expect(rule, '.floatControlBandRoot must exist inside the @media (min-width: 768px) block').toBeTruthy()
      expect(rule).toMatch(/position:\s*absolute;/)
      expect(rule).toMatch(/z-index:\s*var\(--z-dropdown\);/)
      expect(rule).toMatch(/pointer-events:\s*none;/)
      // Keine echte @container-Regel (nicht nur eine Kommentarerwaehnung des Worts) darf
      // .floatControlBandRoot selbst umordnen -- Kommentare werden vor der Prüfung entfernt,
      // damit Fließtext ueber "@container" (wie in Cluster.tsx's eigener float-Doku) nicht
      // fälschlich als Verstoß zählt.
      const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(cssWithoutComments).not.toMatch(/@container\s+cluster[^{]*\{[^}]*\.floatControlBandRoot/)
    })

    it('reicht pointer-events:auto an das direkte Kind von .floatControlBandRoot weiter', () => {
      const mediaBlockStart = css.indexOf('@media (min-width: 768px)')
      const rule = css.slice(mediaBlockStart).match(/\.floatControlBandRoot\s*>\s*\*\s*\{([^}]+)\}/)?.[1]
      expect(rule, '.floatControlBandRoot > * must exist').toBeTruthy()
      expect(rule).toMatch(/pointer-events:\s*auto;/)
    })

    it('setzt den seitlichen/unteren Mobil-Innenabstand auf .floatControlBand (dem inneren Flex-Element) innerhalb @media (max-width: 767px)', () => {
      const mobileBlockStart = css.indexOf('@media (max-width: 767px)')
      expect(mobileBlockStart).toBeGreaterThan(-1)
      const rule = css.slice(mobileBlockStart).match(/\.floatControlBand\s*\{([^}]+)\}/)?.[1]
      expect(rule, '.floatControlBand must have a mobile padding override').toBeTruthy()
      expect(rule).toMatch(/padding:\s*var\(--overlay-padding-control-band-mobile\);/)
    })
  })
})
