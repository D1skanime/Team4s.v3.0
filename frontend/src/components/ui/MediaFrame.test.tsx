// @vitest-environment jsdom

import { readFileSync } from 'node:fs'

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

  it('hält die Poster-Farbverlängerung im lokalen Ebenenkontext hinter dem Bild sichtbar', () => {
    const css = readFileSync('src/components/ui/MediaFrame.module.css', 'utf8')

    expect(css).toMatch(/\.mediaFramePosterFade\s*\{[^}]*isolation:\s*isolate;[^}]*z-index:\s*0;/s)
    expect(css).toMatch(/\.mediaFramePosterFade::before\s*\{[^}]*z-index:\s*0;/s)
    expect(css).toMatch(/\.mediaFramePosterFade :global\(img\)\s*\{[^}]*z-index:\s*1;/s)
  })

  it('schaltet Farbverlängerung und Bild-Maske unterhalb 767px vollständig ab, statt sie nur zu clippen', () => {
    const css = readFileSync('src/components/ui/MediaFrame.module.css', 'utf8')
    const mobileBlockStart = css.indexOf('@media (max-width: 767px)')
    expect(mobileBlockStart).toBeGreaterThan(-1)
    const mobileBlock = css.slice(mobileBlockStart)

    // Ohne die Verlängerung dahinter würde der zum Rand transparente Bildausschnitt die dunkle
    // Seitenfläche durchscheinen lassen (Regressions-Fund) -- beide Effekte müssen deshalb
    // explizit deaktiviert sein, nicht nur vom äußeren overflow:hidden geclippt werden.
    expect(mobileBlock).toMatch(/\.mediaFramePosterFade::before\s*\{[^}]*display:\s*none;/s)
    expect(mobileBlock).toMatch(/\.mediaFramePosterFade :global\(img\)\s*\{[^}]*mask-image:\s*none;[^}]*-webkit-mask-image:\s*none;/s)
  })
})
