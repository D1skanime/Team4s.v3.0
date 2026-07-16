// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { AccentRule } from './AccentRule'

describe('AccentRule', () => {
  it('rendert eine dekorative Wine-Linie', () => {
    const { container } = render(<AccentRule />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.firstElementChild?.className).toMatch(/accentRule/)
  })

  it('unterstützt verschiedene Linienstärken', () => {
    const { container } = render(<AccentRule thickness="strong" />)

    expect(container.firstElementChild?.className).toMatch(/accentRuleStrong/)
  })
})
