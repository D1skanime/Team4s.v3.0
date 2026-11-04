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
})
