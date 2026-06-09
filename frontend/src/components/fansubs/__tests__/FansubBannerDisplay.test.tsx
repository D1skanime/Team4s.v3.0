// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { FansubBannerDisplay } from '../FansubBannerDisplay'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean }>(({
    alt,
    unoptimized,
    priority,
    ...props
  }, ref) => {
    void unoptimized
    void priority
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(() => {
  cleanup()
})

describe('FansubBannerDisplay', () => {
  it('renders the banner as one proportional full-width image without side fills', () => {
    const { container } = render(<FansubBannerDisplay bannerURL="/media/banner.png" altText="Banner" />)

    expect(screen.getByAltText('Banner').getAttribute('src')).toBe('/media/banner.png')
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })
})
