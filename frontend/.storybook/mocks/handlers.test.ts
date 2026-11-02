import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { animeBackdropManifestFixture, animeNavigationFixture } from './animeFixtures'
import { defaultHandlers } from './handlers'

const server = setupServer(...defaultHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('zentrale Storybook-Handler', () => {
  it('fängt das Backdrop-Manifest der Anime-Detailseite ab', async () => {
    const response = await fetch('http://storybook.test/api/v1/anime/13/backdrops')

    expect(response.ok).toBe(true)
    await expect(response.json()).resolves.toEqual({
      data: { ...animeBackdropManifestFixture.data, anime_id: 13 },
    })
  })

  it('liefert die Nachbarn für die interaktive Randnavigation', async () => {
    const response = await fetch('http://storybook.test/api/v1/anime?page=1&per_page=24')

    expect(response.ok).toBe(true)
    await expect(response.json()).resolves.toEqual(animeNavigationFixture)
  })
})
