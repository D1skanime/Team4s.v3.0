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

  it('setzt --split-first-col inline nur fuer firstColumnWidth="auto"', () => {
    const { container: withAuto } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} firstColumnWidth="auto" />,
    )
    expect((withAuto.firstChild as HTMLElement).style.getPropertyValue('--split-first-col')).toBe('auto')
  })

  it('setzt firstColumnWidth="poster" als Modifikatorklasse statt als Inline-Stil', () => {
    const { container: withPoster } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} firstColumnWidth="poster" />,
    )
    const node = withPoster.firstChild as HTMLElement
    expect(node.className).toMatch(/columnPoster/)
    expect(node.style.getPropertyValue('--split-first-col')).toBe('')
  })

  it('setzt weder Klasse noch Inline-Stil, wenn firstColumnWidth gar nicht uebergeben wird', () => {
    const { container: withoutWidth } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />,
    )
    const node = withoutWidth.firstChild as HTMLElement
    expect(node.className).not.toMatch(/columnPoster/)
    expect(node.style.getPropertyValue('--split-first-col')).toBe('')
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
