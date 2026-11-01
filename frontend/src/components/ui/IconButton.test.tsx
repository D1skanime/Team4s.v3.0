// @vitest-environment jsdom
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { X } from 'lucide-react'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('rendert einen button mit erzwungenem aria-label', () => {
    render(<IconButton icon={<X size={18} />} aria-label="Schließen" />)

    expect(screen.getByRole('button', { name: 'Schließen' })).not.toBeNull()
  })

  it('reicht Klicks und disabled unverändert durch', () => {
    const onClick = vi.fn()
    render(<IconButton icon={<X size={18} />} aria-label="Schließen" onClick={onClick} disabled />)

    const button = screen.getByRole('button', { name: 'Schließen' }) as HTMLButtonElement
    fireEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
    expect(button.disabled).toBe(true)
  })

  it('leitet einen Ref auf das native button-Element weiter', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<IconButton ref={ref} icon={<X size={18} />} aria-label="Schließen" />)

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('unterstützt floating-Positionierung und Größen unabhängig voneinander', () => {
    const { container } = render(
      <IconButton icon={<X size={18} />} aria-label="Schließen" floating size="lg" />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toMatch(/iconButtonFloating/)
    expect(button?.className).toMatch(/iconButtonLg/)
  })

  it('unterstützt die runde Form und die Pfeil-Tonalität', () => {
    const { container } = render(
      <IconButton icon={<X size={18} />} aria-label="Weiter" shape="round" tone="arrow" />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toMatch(/iconButtonRound/)
    expect(button?.className).toMatch(/iconButtonToneArrow/)
  })

  it('unterstützt die onImage-Variante für Icon-Buttons auf Bildern', () => {
    const { container } = render(
      <IconButton icon={<X size={18} />} aria-label="Schließen" variant="onImage" />,
    )

    expect(container.querySelector('button')?.className).toMatch(/iconButtonOnImage/)
  })

  it('verdrahtet die ghost-Variante tatsächlich in die Klassenliste (Basis für NavArrow)', () => {
    const { container } = render(
      <IconButton icon={<X size={18} />} aria-label="Schließen" variant="ghost" />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toMatch(/iconButtonGhost/)
  })

  it('unterstützt die field-Variante für einen Auslöser innerhalb einer Feld-Zeile (Basis für DatePicker)', () => {
    const { container } = render(
      <IconButton icon={<X size={18} />} aria-label="Datum auswählen" variant="field" size="fill" />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toMatch(/iconButtonField/)
    expect(button?.className).toMatch(/iconButtonFill/)
  })

  it('unterstützt die accent-Variante für einen gefüllten Zähler-/Überlauf-Knopf (Basis für AvatarStack)', () => {
    const { container } = render(
      <IconButton icon="+3" aria-label="3 weitere anzeigen" variant="accent" shape="round" />,
    )

    expect(container.querySelector('button')?.className).toMatch(/iconButtonAccent/)
  })

  it('unterstützt die tile-Variante mit ausgewähltem Zustand über aria-current, ohne !important', () => {
    const { container } = render(
      <IconButton icon="12" aria-label="12" variant="tile" size="fill" aria-current="true" />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toMatch(/iconButtonTile/)
    expect(button?.className).toMatch(/iconButtonFill/)
    expect(button?.getAttribute('aria-current')).toBe('true')
  })
})
