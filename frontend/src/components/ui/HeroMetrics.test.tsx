// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HeroMetrics } from './HeroMetrics'
import styles from './ui.module.css'

describe('HeroMetrics', () => {
  it('ordnet Bezeichnungen vor den hervorgehobenen Werten an', () => {
    render(
      <HeroMetrics
        ariaLabel="Kennzahlen"
        items={[
          { label: 'Dauer', value: '23:45 Min.' },
          { label: 'Codec', value: 'H.264' },
        ]}
      />,
    )

    const metrics = screen.getByLabelText('Kennzahlen')
    expect(metrics.textContent).toBe('Dauer23:45 Min.CodecH.264')
  })
  it('renders inline metrics while preserving label/value semantics', () => {
    const { container } = render(<HeroMetrics ariaLabel="Inline" variant="inline" items={[{label:'Folgen',value:13}]} />)
    expect(screen.getByLabelText('Inline').querySelector('dd')?.textContent).toBe('13 Folgen')
    expect(container.querySelector('dt')?.textContent).toBe('Folgen')
    expect(container.querySelector('dd span')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders an item with onActivate as a real Button (variant="text"), clickable and keyboard-focusable', () => {
    const onActivate = vi.fn()
    render(
      <HeroMetrics
        ariaLabel="Sprung"
        variant="inline"
        items={[{ label: 'Beiträge', value: 12, onActivate, activateLabel: 'Zu Beiträge springen' }]}
      />,
    )

    const button = screen.getByRole('button', { name: 'Zu Beiträge springen' })
    fireEvent.click(button)
    expect(onActivate).toHaveBeenCalledTimes(1)

    button.focus()
    expect(document.activeElement).toBe(button)

    expect(button.classList.contains(styles.button)).toBe(true)
    expect(button.classList.contains(styles.buttonText)).toBe(true)
  })

  it('renders an item without onActivate as plain text, no button at all', () => {
    render(
      <HeroMetrics
        ariaLabel="Kein Sprung"
        variant="inline"
        items={[{ label: 'Folgen', value: 13 }]}
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  // 157-15 (GAP-03 F2): jsdom cannot compute real pseudo-class styles (no live :hover/
  // :focus-visible rendering), so this CSS-source assertion is the sanctioned way to prove the
  // hero-metric text-button affordance is permanent (base rule, not hover-gated) and carries a
  // visible keyboard focus ring. The live, real-browser proof of the same affordance runs in
  // shot-projectmember.mjs.
  it('gives .buttonText a permanent (non-hover-only) underline affordance and a focus-visible ring (F2)', () => {
    const css = readFileSync('src/components/ui/ui.module.css', 'utf8')
    const baseRule = css.match(/\.buttonText\s*\{[^}]+\}/)?.[0]
    const focusVisibleRule = css.match(/\.buttonText:focus-visible\s*\{[^}]+\}/)?.[0]

    expect(baseRule).toContain('text-decoration')
    expect(focusVisibleRule).not.toBeUndefined()
    expect(focusVisibleRule).toContain('var(--focus-ring)')
  })
})
