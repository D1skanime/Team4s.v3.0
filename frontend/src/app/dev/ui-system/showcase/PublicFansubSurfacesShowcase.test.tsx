// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PublicFansubSurfacesShowcase } from './PublicFansubSurfacesShowcase'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<
    HTMLImageElement,
    ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean; fill?: boolean }
  >(({ alt, unoptimized, priority, fill, ...props }, ref) => {
    void unoptimized
    void priority
    void fill
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(() => {
  cleanup()
})

describe('PublicFansubSurfacesShowcase', () => {
  it('rendert die echten Public-Fansub-Flächen als UI-dev-Referenz', () => {
    render(<PublicFansubSurfacesShowcase />)

    expect(screen.getByRole('heading', { name: 'Public Fansub Surfaces' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: 'C-Subs' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Projekte' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Geschichte' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Historie & Erfolge' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Medien' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Team & Mitglieder' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Alle 24 Projekte anzeigen' })).toBeTruthy()
  })
})
