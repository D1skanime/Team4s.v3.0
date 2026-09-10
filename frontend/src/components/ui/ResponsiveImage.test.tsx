// @vitest-environment jsdom

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

// 154-03/P154-06: closes RCA-06's ResponsiveImage optimizer-error fallback finding.
// The previous fallback unconditionally re-requested the unmodified src with
// unoptimized={true}, transferring the raw original file uncapped. The fix removes that
// escape hatch entirely -- there is no bounded same-origin derivative to retry through
// (frontend/scripts/audit-public-member-performance.mjs's AUDIT_FAIL_BADGES=1 mode blocks
// the WHOLE /_next/image route for the affected prefix, not one width).

it('154-03/P154-06: renders the SAME <Image> element, className and props spread before and after a simulated optimizer error', async () => {
  const { ResponsiveImage } = await vi.importActual<typeof import('./ResponsiveImage')>(
    './ResponsiveImage',
  )
  render(
    <ResponsiveImage
      src="/media/profile/3/avatar/current/display.png"
      alt="Ballelboy Avatar"
      className="heroAvatarImage"
      width={140}
      height={140}
      sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
      loading="eager"
    />,
  )

  const image = screen.getByRole('img', { name: 'Ballelboy Avatar' })
  expect(image.tagName).toBe('IMG')
  expect(image.className).toBe('heroAvatarImage')
  expect(image.getAttribute('src')).toBe('/media/profile/3/avatar/current/display.png')

  // onError is intentionally excluded from the comparison below -- the component
  // (correctly) creates a new closure over it each render; that identity churn is not
  // part of the "{...props} spread untouched" contract, which concerns the other,
  // stable props (src, sizing, unoptimized, className, etc.).
  const { onError: _beforeOnError, ...beforeErrorProps } = nextImageRenderMock.mock.calls.at(-1)?.[0] ?? {}

  fireEvent.error(image)

  // Still the SAME element -- no span/div placeholder substitute was introduced.
  const afterErrorImage = screen.getByRole('img', { name: 'Ballelboy Avatar' })
  expect(afterErrorImage).toBe(image)
  expect(afterErrorImage.tagName).toBe('IMG')
  expect(afterErrorImage.className).toBe('heroAvatarImage')

  const { onError: _afterOnError, ...afterErrorProps } = nextImageRenderMock.mock.calls.at(-1)?.[0] ?? {}
  // {...props} spread is untouched: the only fields the fallback is allowed to change are
  // src and/or unoptimized/sizing -- and per the bound below, this component changes NONE
  // of them, so the two render calls' props are identical (excluding the onError closure).
  expect(afterErrorProps).toEqual(beforeErrorProps)
})

it('154-03/P154-06: keeps identical geometry (width/height, no fill/class change) across a simulated optimizer error', async () => {
  const { ResponsiveImage } = await vi.importActual<typeof import('./ResponsiveImage')>(
    './ResponsiveImage',
  )
  render(
    <ResponsiveImage
      src="/media/profile/3/avatar/current/display.png"
      alt="Ballelboy Avatar"
      className="heroAvatarImage"
      width={140}
      height={140}
      sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
      loading="eager"
    />,
  )

  const image = screen.getByRole('img', { name: 'Ballelboy Avatar' })
  expect(image.getAttribute('width')).toBe('140')
  expect(image.getAttribute('height')).toBe('140')
  expect(image.className).toBe('heroAvatarImage')

  fireEvent.error(image)

  expect(image.getAttribute('width')).toBe('140')
  expect(image.getAttribute('height')).toBe('140')
  expect(image.className).toBe('heroAvatarImage')
  expect(image.getAttribute('sizes')).toBe(
    '(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px',
  )
})

it('154-03/P154-06: never bypasses to the raw unbounded original via unoptimized=true -- fallback bytes stay bounded at or below the normal optimized path', async () => {
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
  expect(image.getAttribute('data-unoptimized')).toBe('false')
  expect(nextImageRenderMock.mock.calls.at(-1)?.[0]?.unoptimized).toBe(false)

  fireEvent.error(image)

  // The bound: unoptimized never flips to true, so there is no request for raw,
  // full-size original bytes -- the fallback path stays within the SAME
  // deviceSizes/imageSizes-bounded optimizer path the success case already uses.
  expect(image.getAttribute('data-unoptimized')).toBe('false')
  expect(nextImageRenderMock.mock.calls.at(-1)?.[0]?.unoptimized).toBe(false)
  expect(image.getAttribute('src')).toBe('/media/profile/3/avatar/current/display.png')
})

it('154-03/P154-06: a second onError does not change behavior further -- no retry loop, state stabilizes after the first transition', async () => {
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

  fireEvent.error(image)
  const propsAfterFirstError = nextImageRenderMock.mock.calls.at(-1)?.[0]

  fireEvent.error(image)
  const propsAfterSecondError = nextImageRenderMock.mock.calls.at(-1)?.[0]

  expect(propsAfterSecondError).toEqual(propsAfterFirstError)
  expect(image.getAttribute('data-unoptimized')).toBe('false')
  expect(image.getAttribute('src')).toBe('/media/profile/3/avatar/current/display.png')
  expect(image.getAttribute('src')).not.toContain('source_original_url')
})
