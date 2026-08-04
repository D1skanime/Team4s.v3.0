// @vitest-environment jsdom

import { existsSync } from 'node:fs'
import type { ImgHTMLAttributes } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

const { nextImageRenderMock } = vi.hoisted(() => ({
  nextImageRenderMock: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    nextImageRenderMock({ alt, unoptimized, ...props })
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

it('Phase 120 RED: falls back exactly once to display original without geometry change', async () => {
  const componentPath = 'src/components/ui/ResponsiveImage.tsx'
  expect(
    existsSync(componentPath),
    'ResponsiveImage unoptimized one-shot display-original fallback is missing',
  ).toBe(true)

  const { ResponsiveImage } = await vi.importActual<typeof import('./ResponsiveImage')>(
    './ResponsiveImage',
  )
  render(
    <ResponsiveImage
      src="/media/profile/3/avatar/current/display.png"
      alt="Ballelboy Avatar"
      width={140}
      height={140}
      sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
      loading="eager"
    />,
  )

  const image = screen.getByRole('img', { name: 'Ballelboy Avatar' })
  expect(image.getAttribute('src')).toBe('/media/profile/3/avatar/current/display.png')
  expect(image.getAttribute('data-unoptimized')).toBe('false')
  expect(image.getAttribute('width')).toBe('140')
  expect(image.getAttribute('height')).toBe('140')
  expect(image.getAttribute('sizes')).toBe(
    '(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px',
  )

  fireEvent.error(image)

  expect(image.getAttribute('src')).toBe('/media/profile/3/avatar/current/display.png')
  expect(image.getAttribute('data-unoptimized')).toBe('true')
  expect(image.getAttribute('width')).toBe('140')
  expect(image.getAttribute('height')).toBe('140')
  expect(image.getAttribute('sizes')).toBe(
    '(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px',
  )
  expect(nextImageRenderMock).toHaveBeenCalledTimes(2)

  fireEvent.error(image)

  expect(nextImageRenderMock).toHaveBeenCalledTimes(2)
  expect(image.getAttribute('src')).not.toContain('source_original_url')
})
