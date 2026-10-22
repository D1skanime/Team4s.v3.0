// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'

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

  it('regression guard (quick-261022-i0i): .backdrop declares z-index: -1, never z-index: 0, so it always paints behind plain static page content', () => {
    const cssPath = path.join(__dirname, 'PublicHeaderBackdrop.module.css')
    const css = fs.readFileSync(cssPath, 'utf8')
    expect(css).toContain('z-index: -1;')
    expect(css).not.toContain('z-index: 0;')
  })
})
