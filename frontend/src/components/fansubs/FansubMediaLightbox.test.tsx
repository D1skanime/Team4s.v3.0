// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FansubMediaLightbox, type PublicImageLightboxItem } from './FansubMediaLightbox'

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => {
  const imageProps = { ...props }
  delete imageProps.fill
  delete imageProps.unoptimized
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...imageProps} />
} }))

const media: PublicImageLightboxItem[] = [
  { id: 1, media_type: 'Bild', title: 'Erstes Bild', description: 'Vollständiger Text', original_url: '/original-1.jpg' },
  { id: 2, media_type: 'Bild', title: 'Zweites Bild', original_url: '/original-2.jpg' },
]

describe('FansubMediaLightbox', () => {
  it('renders original, full description, counter and keyboard navigation', () => {
    const onNavigate = vi.fn()
    render(<FansubMediaLightbox media={media} index={0} onClose={vi.fn()} onNavigate={onNavigate} />)
    expect(screen.getByAltText('Erstes Bild').getAttribute('src')).toContain('/original-1.jpg')
    expect(screen.getByText('Vollständiger Text')).toBeTruthy()
    expect(screen.getByText('1 / 2')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onNavigate).toHaveBeenCalledWith(1)
  })
})
