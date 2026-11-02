// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MediaFrame } from './MediaFrame'

describe('MediaFrame', () => {
  it('setzt das aspectRatio als Inline-Stil', () => {
    render(<MediaFrame aspectRatio={16 / 9} data-testid="frame" />)
    const frame = screen.getByTestId('frame')
    expect(frame.style.aspectRatio).toBe(String(16 / 9))
  })

  it('rendert Eck- und Fuß-Abzeichen, wenn übergeben', () => {
    render(<MediaFrame cornerBadge={<span>Ecke</span>} bottomBadge={<span>Unten</span>} />)
    expect(screen.getByText('Ecke')).not.toBeNull()
    expect(screen.getByText('Unten')).not.toBeNull()
  })

  it('stellt die Poster-Auslauf-Variante mit einem transparenten Rahmen bereit', () => {
    render(<MediaFrame variant="posterFade" backdropImage="/covers/demo.jpg" data-testid="frame" />)
    const frame = screen.getByTestId('frame')
    expect(frame.className).toMatch(/mediaFramePosterFade/)
    expect(frame.style.getPropertyValue('--media-frame-backdrop-image')).toBe('url("/covers/demo.jpg")')
  })
})
