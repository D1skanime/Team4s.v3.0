// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { Switch } from './Switch'

describe('Switch', () => {
  it('rendert ein Element mit role="switch" und aria-checked entsprechend dem checked-Prop', () => {
    const { rerender } = render(
      <Switch checked={false} onCheckedChange={() => {}} label="Benachrichtigungen" />,
    )
    const btn = screen.getByRole('switch')
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-checked')).toBe('false')

    rerender(<Switch checked={true} onCheckedChange={() => {}} label="Benachrichtigungen" />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('Klick ruft onCheckedChange mit dem invertierten Wert auf', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onCheckedChange={onChange} label="Aktiv" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)

    const onChange2 = vi.fn()
    render(<Switch checked={true} onCheckedChange={onChange2} label="Aktiv" />)
    fireEvent.click(screen.getAllByRole('switch')[1])
    expect(onChange2).toHaveBeenCalledWith(false)
  })

  it('disabled=true setzt aria-disabled und unterdrückt onCheckedChange', () => {
    const onChange = vi.fn()
    render(
      <Switch checked={false} onCheckedChange={onChange} disabled label="Gesperrt" />,
    )
    const btn = screen.getByRole('switch')
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(btn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('aria-label / label-Prop ist gesetzt (Accessibility)', () => {
    render(
      <Switch
        checked={true}
        onCheckedChange={() => {}}
        label="Sichtbar für alle"
        aria-label="Sichtbarkeit umschalten"
      />,
    )
    const btn = screen.getByRole('switch')
    expect(btn.getAttribute('aria-label')).toBe('Sichtbarkeit umschalten')
  })
})
