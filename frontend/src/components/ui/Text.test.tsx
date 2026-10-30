// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Text } from './Text'

describe('Text', () => {
  it('rendert ohne variant als p-Element mit der body-Variantenklasse (Standard)', () => {
    const { container } = render(<Text>Fließtext</Text>)

    const element = container.firstElementChild as HTMLElement
    expect(element.tagName).toBe('P')
    expect(element.className).toMatch(/textBody/)
  })

  it('rendert variant="meta" mit der meta-Variantenklasse statt der body-Klasse', () => {
    const { container } = render(<Text variant="meta">Kurzer Metatext</Text>)

    const element = container.firstElementChild as HTMLElement
    expect(element.className).toMatch(/textMeta/)
    expect(element.className).not.toMatch(/textBody/)
  })

  it('rendert variant="soft" und variant="small" mit jeweils eigener Klasse', () => {
    const { container: softContainer } = render(<Text variant="soft">Leise</Text>)
    const { container: smallContainer } = render(<Text variant="small">Klein</Text>)

    expect((softContainer.firstElementChild as HTMLElement).className).toMatch(/textSoft/)
    expect((smallContainer.firstElementChild as HTMLElement).className).toMatch(/textSmall/)
  })

  it('rendert variant="eyebrow" mit der eyebrow-Variantenklasse', () => {
    const { container } = render(<Text variant="eyebrow">Fansub-Gruppe</Text>)
    expect((container.firstElementChild as HTMLElement).className).toMatch(/textEyebrow/)
  })
})
