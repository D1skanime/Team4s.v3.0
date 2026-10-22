// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PublicHeaderBackdrop } from './PublicHeaderBackdrop'

afterEach(cleanup)

describe('PublicHeaderBackdrop', () => {
  it('renders nothing when imageUrl is null', () => {
    const { container } = render(<PublicHeaderBackdrop imageUrl={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when imageUrl is an empty string', () => {
    const { container } = render(<PublicHeaderBackdrop imageUrl="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders an aria-hidden backdrop div with the background image and passed className', () => {
    render(<PublicHeaderBackdrop imageUrl="https://example.test/banner.webp" className="customTuning" />)
    const el = screen.getByTestId('public-header-backdrop')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.backgroundImage).toContain('https://example.test/banner.webp')
    expect(el.className).toContain('customTuning')
  })
})
