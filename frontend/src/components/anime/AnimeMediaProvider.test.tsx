// @vitest-environment jsdom

import { StrictMode, type ImgHTMLAttributes } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnimeBackdropResponse } from '@/types/anime'

import { AnimeBackdropRotator } from './AnimeBackdropRotator'
import { AnimeInfoBanner, AnimeMediaProvider, AnimeTitleLogo } from './AnimeMediaProvider'

const getAnimeBackdropsMock = vi.fn()

vi.mock('@/lib/api', () => ({
  getAnimeBackdrops: (...args: unknown[]) => getAnimeBackdropsMock(...args),
}))

vi.mock('next/image', () => ({
  default: ({ unoptimized, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

afterEach(() => {
  cleanup()
  getAnimeBackdropsMock.mockReset()
})

describe('AnimeMediaProvider', () => {
  it('zeigt zuerst das Cover und startet das Theme-Video automatisch, sobald das Manifest bereit ist', async () => {
    let resolveManifest!: (value: AnimeBackdropResponse) => void
    getAnimeBackdropsMock.mockReturnValue(
      new Promise<AnimeBackdropResponse>((resolve) => {
        resolveManifest = resolve
      }),
    )

    const { container } = render(
      <AnimeMediaProvider animeID={1}>
        <AnimeBackdropRotator coverImage="/cover.jpg" />
        <AnimeTitleLogo title="Viper's Creed" />
        <AnimeInfoBanner />
      </AnimeMediaProvider>,
    )

    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByAltText("Viper's Creed Logo")).toBeNull()
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    expect(getAnimeBackdropsMock).toHaveBeenCalledWith(1)

    resolveManifest({
      data: {
        anime_id: 1,
        provider: 'jellyfin',
        backdrops: ['/backdrop.jpg'],
        theme_videos: ['/theme.mp4'],
        logo_url: '/logo.png',
        banner_url: '/banner.jpg',
      },
    })

    await waitFor(() => expect(container.querySelector('video')).not.toBeNull())

    const video = container.querySelector('video')
    expect(video?.autoplay).toBe(true)
    expect(video?.muted).toBe(true)
    expect(video?.playsInline).toBe(true)
    expect(video?.preload).toBe('auto')
    expect(video?.getAttribute('src')).toContain('/theme.mp4')
    expect(screen.getByAltText("Viper's Creed Logo")).toBeTruthy()
    expect(container.querySelectorAll('img')).toHaveLength(2)
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
  })

  it('dedupliziert den Manifest-Request auch bei doppelten Development-Effects', async () => {
    getAnimeBackdropsMock.mockResolvedValue({
      data: {
        anime_id: 2,
        provider: 'jellyfin',
        backdrops: [],
        theme_videos: [],
        logo_url: '/logo-2.png',
        banner_url: undefined,
      },
    } satisfies AnimeBackdropResponse)

    render(
      <StrictMode>
        <AnimeMediaProvider animeID={2}>
          <AnimeTitleLogo title="Anime 2" />
        </AnimeMediaProvider>
      </StrictMode>,
    )

    await screen.findByAltText('Anime 2 Logo')
    expect(getAnimeBackdropsMock).toHaveBeenCalledTimes(1)
    expect(getAnimeBackdropsMock).toHaveBeenCalledWith(2)
  })
})
