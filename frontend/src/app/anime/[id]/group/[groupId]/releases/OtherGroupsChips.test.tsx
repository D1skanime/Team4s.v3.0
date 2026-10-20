// @vitest-environment jsdom

import type { ImgHTMLAttributes } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { OtherGroupsChips } from './OtherGroupsChips'

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

// D-07: /anime/2/group/26/releases crashed because this chip rendered legacy
// /api/v1/media/files/... logo URLs through raw next/image, which throws
// E426/E231 for src values outside images.localPatterns. ResponsiveImage must
// be used instead so the legacy shape renders unoptimized rather than crashing.
it('D-07: rendert ein legacy /api/v1/media/files/... Logo unoptimiert statt abzustuerzen', () => {
  render(
    <OtherGroupsChips
      animeID={2}
      otherGroups={[
        {
          id: 26,
          name: 'Strawhat Subs',
          slug: 'strawhat-subs',
          logo_url: '/api/v1/media/files/logo_1789627959614_example.png',
        },
      ]}
    />,
  )

  const image = screen.getByRole('img', { name: 'Strawhat Subs' })
  expect(image.getAttribute('data-unoptimized')).toBe('true')
})
