// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MetricList } from './MetricList'
import styles from './Button.module.css'

describe('MetricList', () => {
  it('ordnet Bezeichnungen vor den hervorgehobenen Werten an', () => {
    render(
      <MetricList
        ariaLabel="Kennzahlen"
        valueHeadingLevel={2}
        items={[
          { label: 'Dauer', value: '23:45 Min.' },
          { label: 'Codec', value: 'H.264' },
        ]}
      />,
    )

    const metrics = screen.getByLabelText('Kennzahlen')
    expect(metrics.textContent).toBe('Dauer23:45 Min.CodecH.264')
  })

  it('rendert den nicht klickbaren Wert über Heading mit dem übergebenen valueHeadingLevel, nicht über einen eigenen span', () => {
    render(
      <MetricList
        ariaLabel="Kennzahlen"
        valueHeadingLevel={3}
        items={[{ label: 'Punkte', value: 42 }]}
      />,
    )

    const heading = screen.getByRole('heading', { level: 3, name: '42' })
    expect(heading.tagName).toBe('H3')
  })

  it('rendert die Inline-Variante mit erhaltener Bezeichnung-Wert-Semantik', () => {
    const { container } = render(<MetricList ariaLabel="Inline" variant="inline" valueHeadingLevel={2} items={[{ label: 'Folgen', value: 13 }]} />)
    expect(screen.getByLabelText('Inline').querySelector('dd')?.textContent).toBe('13 Folgen')
    expect(container.querySelector('dt')?.textContent).toBe('Folgen')
    expect(container.querySelector('dd span')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('rendert eine Kennzahl mit onActivate als echten, klickbaren und tastaturfokussierbaren Button', () => {
    const onActivate = vi.fn()
    render(
      <MetricList
        ariaLabel="Sprung"
        variant="inline"
        valueHeadingLevel={2}
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

  it('rendert eine Kennzahl ohne onActivate als reinen Text, ganz ohne Button', () => {
    render(
      <MetricList
        ariaLabel="Kein Sprung"
        variant="inline"
        valueHeadingLevel={2}
        items={[{ label: 'Folgen', value: 13 }]}
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  // jsdom kann echte Pseudoklassen-Stile nicht berechnen (kein echtes :hover/:focus-visible-
  // Rendering) -- diese CSS-Quelltext-Prüfung belegt deshalb stattdessen, dass die
  // Text-Button-Unterstreichung dauerhaft sichtbar ist (Basisregel, nicht nur bei Hover) und
  // einen sichtbaren Tastatur-Fokusring hat.
  it('gibt .buttonText eine dauerhafte Unterstreichung und einen sichtbaren Fokusring', () => {
    const css = readFileSync('src/components/ui/Button.module.css', 'utf8')
    const baseRule = css.match(/\.buttonText\s*\{[^}]+\}/)?.[0]
    const focusVisibleRule = css.match(/\.buttonText:focus-visible\s*\{[^}]+\}/)?.[0]

    expect(baseRule).toContain('text-decoration')
    expect(focusVisibleRule).not.toBeUndefined()
    expect(focusVisibleRule).toContain('var(--focus-ring)')
  })
})
