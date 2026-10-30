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
})
