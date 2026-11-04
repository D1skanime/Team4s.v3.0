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
    expect(node.style.getPropertyValue('--cluster-gap')).toBe('var(--space-2)')
    expect(node.style.getPropertyValue('--cluster-align')).toBe('center')
    expect(node.style.getPropertyValue('--cluster-justify')).toBe('flex-start')
    expect(node.style.getPropertyValue('--cluster-wrap')).toBe('wrap')
  })

  it('setzt jeden dokumentierten gap-Wert als eigene CSS-Variable', () => {
    const { container: gap4 } = render(<Cluster gap="4">Inhalt</Cluster>)
    expect((gap4.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-4)')

    const { container: gap5 } = render(<Cluster gap="5">Inhalt</Cluster>)
    expect((gap5.firstElementChild as HTMLElement).style.getPropertyValue('--cluster-gap')).toBe('var(--space-5)')
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
