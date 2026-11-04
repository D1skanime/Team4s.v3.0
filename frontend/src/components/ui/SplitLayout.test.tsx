// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SplitLayout } from './SplitLayout'

describe('SplitLayout', () => {
  it('rendert firstColumn und secondColumn als echte DOM-Knoten', () => {
    render(<SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />)

    expect(screen.getByText('A')).not.toBeNull()
    expect(screen.getByText('B')).not.toBeNull()
  })

  it('setzt --split-first-col nur, wenn firstColumnWidth tatsaechlich uebergeben wird', () => {
    const { container: withWidth } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} firstColumnWidth="200px" />,
    )
    expect((withWidth.firstChild as HTMLElement).style.getPropertyValue('--split-first-col')).toBe('200px')

    const { container: withoutWidth } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />,
    )
    expect((withoutWidth.firstChild as HTMLElement).style.getPropertyValue('--split-first-col')).toBe('')
  })

  it('setzt --split-gap nur, wenn gap tatsaechlich uebergeben wird', () => {
    const { container: withGap } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} gap="2" />,
    )
    expect((withGap.firstChild as HTMLElement).style.getPropertyValue('--split-gap')).toBe('var(--space-2)')

    const { container: withoutGap } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />,
    )
    expect((withoutGap.firstChild as HTMLElement).style.getPropertyValue('--split-gap')).toBe('')
  })

  it('setzt --split-align immer, mit dem dokumentierten Standardwert "start"', () => {
    const { container } = render(<SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />)
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--split-align')).toBe('start')
  })

  it('setzt die breakpointLg-Klasse nur bei breakpoint="lg"', () => {
    const { container: md } = render(<SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />)
    expect((md.firstChild as HTMLElement).className).not.toMatch(/breakpointLg/)

    const { container: lg } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} breakpoint="lg" />,
    )
    expect((lg.firstChild as HTMLElement).className).toMatch(/breakpointLg/)
  })
})
