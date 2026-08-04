// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('renders an h2 by default for existing consumers', () => {
    render(<SectionHeader title="Aktuelle Projekte" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Aktuelle Projekte' })).toBeTruthy()
  })

  it('renders the same global header styling with an h3 when requested', () => {
    const { rerender } = render(<SectionHeader title="Fansub-Geschichte" underline />)
    const defaultHeading = screen.getByRole('heading', { level: 2, name: 'Fansub-Geschichte' })

    rerender(<SectionHeader title="Fansub-Geschichte" level={3} underline />)

    const nestedHeading = screen.getByRole('heading', { level: 3, name: 'Fansub-Geschichte' })
    expect(nestedHeading.className).toBe(defaultHeading.className)
  })

  it('keeps the underline color owned by the global ui-line token', () => {
    const css = readFileSync('src/components/ui/ui.module.css', 'utf8')
    const underlineRule = css.match(/\.sectionHeaderUnderline\s*\{[^}]+\}/)?.[0]

    expect(underlineRule).toContain('border-bottom: 2px solid var(--ui-line)')
    expect(underlineRule).not.toContain('#82122c')
  })
})
