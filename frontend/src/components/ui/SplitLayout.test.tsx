// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
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

  it('loest gap="none" auf das Zweck-Token --split-layout-gap-none auf, nur wenn gap tatsaechlich uebergeben wird', () => {
    const { container: withGap } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} gap="none" />,
    )
    expect((withGap.firstChild as HTMLElement).style.getPropertyValue('--split-gap')).toBe('var(--split-layout-gap-none)')

    const { container: withoutGap } = render(
      <SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />,
    )
    expect((withoutGap.firstChild as HTMLElement).style.getPropertyValue('--split-gap')).toBe('')
  })

  it('setzt --split-align immer, mit dem dokumentierten Standardwert "start"', () => {
    const { container } = render(<SplitLayout firstColumn={<span>A</span>} secondColumn={<span>B</span>} />)
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--split-align')).toBe('start')
  })
})

/*
 * jsdom berechnet kein echtes Pixel-Layout -- ob firstColumn/secondColumn ihr jeweils einziges
 * Kind tatsaechlich auf die per align="stretch" ausgeglichene Spaltenhoehe strecken, laesst sich
 * deshalb nur ueber die zugrunde liegende CSS-Regel selbst pruefen (identisches Muster wie die
 * Cluster.module.css/BannerSection.module.css-Deklarations-Tests in diesem Projekt), nicht ueber
 * eine Render-Assertion.
 */
describe('SplitLayout.module.css (Spalten-Hoehenweitergabe)', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/SplitLayout.module.css'), 'utf8')

  it('firstColumn/secondColumn sind display:flex;flex-direction:column, damit sie ihre eigene Hoehe an ihr jeweils einziges Kind weiterreichen', () => {
    const rule = css.match(/\.firstColumn,\s*\n\.secondColumn\s*\{([^}]+)\}/)?.[1]
    expect(rule, '.firstColumn,.secondColumn rule must exist').toBeTruthy()
    expect(rule).toMatch(/display:\s*flex;/)
    expect(rule).toMatch(/flex-direction:\s*column;/)
  })

  it('das jeweils einzige Kind von firstColumn/secondColumn bekommt flex:1, um die Spaltenhoehe tatsaechlich auszufuellen', () => {
    const rule = css.match(/\.firstColumn\s*>\s*\*,\s*\n\.secondColumn\s*>\s*\*\s*\{([^}]+)\}/)?.[1]
    expect(rule, '.firstColumn > *,.secondColumn > * rule must exist').toBeTruthy()
    expect(rule).toMatch(/flex:\s*1;/)
  })
})
