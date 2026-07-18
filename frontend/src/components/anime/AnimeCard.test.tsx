// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnimeCard } from './AnimeCard'

vi.mock('next/link', () => ({
  default: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
    <a data-prefetch={String(prefetch)} {...props} />
  ),
}))

vi.mock('next/image', () => ({
  default: ({ unoptimized, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

afterEach(() => cleanup())

describe('AnimeCard', () => {
  it('lädt die schwere Anime-Detailroute nicht vor dem tatsächlichen Klick vor', () => {
    render(
      <AnimeCard
        anime={{
          id: 1,
          title: "Viper's Creed",
          type: 'TV',
          status: 'done',
          year: 2009,
          max_episodes: 12,
          cover_image: '/cover.jpg',
        }}
        gridQuery="page=1&per_page=24"
      />,
    )

    const link = screen.getByRole('link', { name: /Viper's Creed/ })
    expect(link.getAttribute('data-prefetch')).toBe('false')
    expect(link.getAttribute('href')).toContain('/anime/1')
  })
})
