// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stack } from './Stack'

describe('Stack', () => {
  it('rendert als div mit der Grundklasse und setzt den Standard-Abstand/-Ausrichtung', () => {
    const { container } = render(<Stack>Inhalt</Stack>)

    const node = container.firstElementChild as HTMLElement
    expect(node.tagName).toBe('DIV')
    expect(node.className).toMatch(/stack/)
    expect(node.style.getPropertyValue('--stack-gap')).toBe('var(--space-section)')
    expect(node.style.getPropertyValue('--stack-align')).toBe('stretch')
  })

  it('setzt jeden dokumentierten gap-Zweck als eigene CSS-Variable', () => {
    const { container: container2 } = render(<Stack gap="tight">Inhalt</Stack>)
    expect((container2.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-tight)')
  })

  it('unterstützt die beiden align-Extreme', () => {
    const { container: startContainer } = render(<Stack align="start">Inhalt</Stack>)
    expect((startContainer.firstElementChild as HTMLElement).style.getPropertyValue('--stack-align')).toBe('start')

    const { container: endContainer } = render(<Stack align="end">Inhalt</Stack>)
    expect((endContainer.firstElementChild as HTMLElement).style.getPropertyValue('--stack-align')).toBe('end')
  })

  it('rendert ein anderes Element über die as-Prop und reicht unbekannte Props (z. B. role) an den DOM-Knoten durch', () => {
    render(
      <Stack as="section" role="group" aria-label="Gruppe" data-testid="stack-section">
        Inhalt
      </Stack>,
    )

    const node = screen.getByTestId('stack-section')
    expect(node.tagName).toBe('SECTION')
    expect(node.getAttribute('role')).toBe('group')
    expect(node.getAttribute('aria-label')).toBe('Gruppe')
  })
})
