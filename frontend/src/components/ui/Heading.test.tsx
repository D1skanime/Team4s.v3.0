// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Heading } from './Heading'

describe('Heading', () => {
  it('rendert level=1 ohne size als h1 mit der zur Stufe passenden Groessen-Klasse', () => {
    const { container } = render(<Heading level={1}>Naruto</Heading>)

    const element = container.firstElementChild as HTMLElement
    expect(element.tagName).toBe('H1')
    expect(element.className).toMatch(/headingSize1/)
  })

  it('entkoppelt semantisches Tag (level) und visuelle Groesse (size): level=3 size=2 rendert ein h3-Tag mit der H2-Groessen-Klasse', () => {
    const { container } = render(
      <Heading level={3} size={2}>
        Semantisch h3, visuell wie H2
      </Heading>,
    )

    const element = container.firstElementChild as HTMLElement
    expect(element.tagName).toBe('H3')
    expect(element.className).toMatch(/headingSize2/)
    expect(element.className).not.toMatch(/headingSize3/)
  })

  it('rendert size="hero" als h1-Tag mit der Hero-Groessen-Klasse', () => {
    const { container } = render(
      <Heading level={1} size="hero">
        Fansub-Gruppe C-Subs
      </Heading>,
    )

    const element = container.firstElementChild as HTMLElement
    expect(element.tagName).toBe('H1')
    expect(element.className).toMatch(/headingSizeHero/)
  })

  it('rendert tone="accent" mit der Akzentfarben-Klasse, Standardton ohne zusaetzliche Klasse', () => {
    const { container, rerender } = render(<Heading level={2} tone="accent">42</Heading>)
    expect((container.firstElementChild as HTMLElement).className).toMatch(/headingToneAccent/)

    rerender(<Heading level={2}>42</Heading>)
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/headingToneAccent/)
  })

  it('rendert tone="onScrim" mit der Scrim-Farben-Klasse (lesbar auf dunklem Hintergrund)', () => {
    const { container } = render(<Heading level={2} tone="onScrim">42</Heading>)
    expect((container.firstElementChild as HTMLElement).className).toMatch(/headingToneOnScrim/)
  })

  it('reicht id und weitere native Attribute durch (z. B. fuer DialogHeaders titleId-Bedarf)', () => {
    const { container } = render(
      <Heading level={2} id="dialog-title">
        Anime bearbeiten
      </Heading>,
    )

    const element = container.firstElementChild as HTMLElement
    expect(element.id).toBe('dialog-title')
  })
})
