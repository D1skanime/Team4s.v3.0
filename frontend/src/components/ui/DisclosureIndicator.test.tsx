// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { DisclosureIndicator } from './DisclosureIndicator'

describe('DisclosureIndicator', () => {
  it('rendert als dekoratives Öffner-Symbol', () => {
    const { container } = render(<DisclosureIndicator />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  it('unterstützt Button- und Größenvarianten', () => {
    const { container } = render(<DisclosureIndicator open size="lg" variant="button" />)

    expect(container.firstElementChild?.className).toMatch(/disclosureIndicatorLg/)
    expect(container.firstElementChild?.className).toMatch(/disclosureIndicatorButton/)
  })
})
