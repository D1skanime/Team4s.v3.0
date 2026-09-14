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

  it('renders byte-identical DOM shape for existing consumers who pass no icon/counter (F1)', () => {
    const { container } = render(<SectionHeader title="X" />)
    const { container: containerWithExtras } = render(
      <SectionHeader title="X" underline actions={<span>1</span>} />,
    )

    for (const root of [container, containerWithExtras]) {
      expect(root.querySelector('[class*="sectionHeaderTitleRow"]')).toBeNull()
      expect(root.querySelector('[class*="sectionHeaderIcon"]')).toBeNull()
      expect(root.querySelector('[class*="sectionHeaderCounter"]')).toBeNull()
    }

    const contentEl = container.querySelector('[class*="sectionHeaderContent"]')
    expect(contentEl?.firstElementChild?.tagName).toBe('H2')
  })

  it('renders the icon immediately before the heading inside one sectionHeaderTitleRow, with the underline still on the outer element (F1)', () => {
    const { container } = render(
      <SectionHeader title="Texte & Notizen" underline icon={<svg data-testid="icon" />} />,
    )

    const outer = container.firstElementChild
    expect(outer?.className).toContain('sectionHeaderUnderline')

    const titleRow = container.querySelector('[class*="sectionHeaderTitleRow"]')
    expect(titleRow).not.toBeNull()
    const icon = screen.getByTestId('icon')
    expect(titleRow?.contains(icon)).toBe(true)
    const heading = screen.getByRole('heading', { level: 2, name: 'Texte & Notizen' })
    expect(titleRow?.contains(heading)).toBe(true)
    // icon precedes heading in document order, both inside the title row.
    expect(icon.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the counter immediately after the heading inside the same sectionHeaderTitleRow, not inside sectionHeaderActions (F1)', () => {
    const { container } = render(
      <SectionHeader title="X" underline counter={<span data-testid="counter">12</span>} />,
    )

    const titleRow = container.querySelector('[class*="sectionHeaderTitleRow"]')
    expect(titleRow).not.toBeNull()
    const counter = screen.getByTestId('counter')
    expect(titleRow?.contains(counter)).toBe(true)
    const heading = screen.getByRole('heading', { level: 2, name: 'X' })
    // heading precedes counter in document order, both inside the title row.
    expect(heading.compareDocumentPosition(counter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const actionsEl = container.querySelector('[class*="sectionHeaderActions"]')
    expect(actionsEl).toBeNull()
  })
})
