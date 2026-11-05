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
    expect(node.style.getPropertyValue('--stack-gap')).toBe('var(--space-independent-blocks)')
    expect(node.style.getPropertyValue('--stack-align')).toBe('stretch')
  })

  it('setzt jeden dokumentierten gap-Zweck als eigene CSS-Variable', () => {
    const { container: container2 } = render(<Stack gap="relatedContent">Inhalt</Stack>)
    expect((container2.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-related-content)')
  })

  it('unterstützt den Zweck "captionLines" für eine enge Zwei-Zeilen-Bildunterschrift', () => {
    const { container } = render(<Stack gap="captionLines">Inhalt</Stack>)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-caption-lines)')
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

  it('rendert im Rhythmus-Array-Modus pro Lücke genau einen schlanken Abstandshalter mit dem passenden Zweck-Wert und setzt --stack-gap auf 0', () => {
    const { container } = render(
      <Stack gap={['independentBlocks', 'relatedContent']}>
        <span>Erste</span>
        <span>Zweite</span>
        <span>Dritte</span>
      </Stack>,
    )

    const stackNode = container.firstElementChild as HTMLElement
    expect(stackNode.style.getPropertyValue('--stack-gap')).toBe('0')

    const directChildren = Array.from(stackNode.children)
    expect(directChildren).toHaveLength(3)
    // Erstes Kind bleibt unverpackt (kein Wrapper vor dem ersten Element).
    expect(directChildren[0].tagName).toBe('SPAN')
    expect(directChildren[0].textContent).toBe('Erste')

    // Kinder ab Index 1 stecken in einem schlanken Wrapper, der NUR marginTop trägt.
    expect(directChildren[1].tagName).toBe('DIV')
    expect((directChildren[1] as HTMLElement).style.marginTop).toBe('var(--space-independent-blocks)')
    expect(directChildren[1].className).toBe('')
    expect(directChildren[1].textContent).toBe('Zweite')

    expect(directChildren[2].tagName).toBe('DIV')
    expect((directChildren[2] as HTMLElement).style.marginTop).toBe('var(--space-related-content)')
    expect(directChildren[2].className).toBe('')
    expect(directChildren[2].textContent).toBe('Dritte')
  })

  it('unterstützt die drei neuen, am Anime-Kopf-Rhythmus gemessenen Zweck-Werte', () => {
    const { container: heading } = render(<Stack gap="headingToBadges">Inhalt</Stack>)
    expect((heading.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-heading-to-badges)')

    const { container: primary } = render(<Stack gap="primaryContentBlocks">Inhalt</Stack>)
    expect((primary.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-primary-content-blocks)')

    const { container: leadIn } = render(<Stack gap="dividedSectionLeadIn">Inhalt</Stack>)
    expect((leadIn.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-divided-section-lead-in)')

    const { container: dividerToContent } = render(<Stack gap="dividerToContent">Inhalt</Stack>)
    expect((dividerToContent.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-divider-to-content)')
  })

  it('unterstützt "contentToControlBand" für den Abstand zwischen Hero-Hauptinhalt und einer darunterliegenden, schwebenden Steuerelement-Reihe', () => {
    const { container } = render(<Stack gap="contentToControlBand">Inhalt</Stack>)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('var(--space-content-to-control-band)')
  })

  it('löst den Zweck "none" auf den Literalwert 0 auf (kein eigenes Zweck-Token) -- sowohl im Einzelwert- als auch im Rhythmus-Array-Modus', () => {
    const { container: single } = render(<Stack gap="none">Inhalt</Stack>)
    expect((single.firstElementChild as HTMLElement).style.getPropertyValue('--stack-gap')).toBe('0')

    const { container: arrayMode } = render(
      <Stack gap={['none', 'relatedContent']}>
        <span>Erste</span>
        <span>Zweite</span>
        <span>Dritte</span>
      </Stack>,
    )
    const directChildren = Array.from((arrayMode.firstElementChild as HTMLElement).children)
    expect((directChildren[1] as HTMLElement).style.marginTop).toBe('0px')
  })

  it('wirft bei einer falschen Rhythmus-Array-Länge einen beschreibenden deutschen Fehler vor jedem Render', () => {
    expect(() =>
      render(
        <Stack gap={['independentBlocks']}>
          <span>Erste</span>
          <span>Zweite</span>
          <span>Dritte</span>
        </Stack>,
      ),
    ).toThrow(/erwartet genau 2.*erhielt aber 1/s)
  })
})
