// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FansubMediaLightbox, type PublicImageLightboxItem } from './FansubMediaLightbox'

const media: PublicImageLightboxItem[] = [
  { id: 1, media_type: 'Bild', title: 'Erstes Bild', description: 'Vollständiger Text', original_url: '/original-1.jpg' },
  { id: 2, media_type: 'Bild', title: 'Zweites Bild', original_url: '/original-2.jpg' },
]

describe('FansubMediaLightbox', () => {
  it('rendert die Bild-Bühne und das Metadaten-Panel mit dem aktuellen Item, wenn geöffnet', () => {
    render(<FansubMediaLightbox media={media} index={0} onClose={vi.fn()} onNavigate={vi.fn()} />)

    expect(screen.getByText('1 / 2')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Erstes Bild' })).toBeTruthy()
    expect(screen.getByText('Vollständiger Text')).toBeTruthy()
  })

  it('rendert nichts, wenn index null ist', () => {
    render(<FansubMediaLightbox media={media} index={null} onClose={vi.fn()} onNavigate={vi.fn()} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
