// @vitest-environment jsdom
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

  it('bleibt ohne collapseBelow/float ein einzelnes, unveraendertes Element (Zero-Pixel-Diff fuer jeden bestehenden Aufrufer)', () => {
    const { container } = render(<Cluster>Inhalt</Cluster>)
    const node = container.firstElementChild as HTMLElement
    expect(node.className).toMatch(/cluster/)
    expect(node.className).not.toMatch(/clusterQueryContainer/)
    expect(node.firstElementChild).toBeNull()
    expect(node.textContent).toBe('Inhalt')
  })

  describe('collapseBelow/gapCollapsed (Haltepunkt-Umkehr, Review-Befund 1 Erweiterung B)', () => {
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

  describe('float (Schwebe-Overlay-Modus, Review-Befund 1 Erweiterung C)', () => {
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
  })
})
