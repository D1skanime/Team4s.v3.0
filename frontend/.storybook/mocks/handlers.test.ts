import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'

import { animeBackdropManifestFixture, animeNavigationFixture } from './animeFixtures'
import { defaultHandlers, resetWatchlistStoryState } from './handlers'

const server = setupServer(...defaultHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetWatchlistStoryState()
})
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

  it('fängt den vollständigen Merklisten-Toggle mit POST, GET und DELETE ab', async () => {
    const absent = await fetch('http://storybook.test/api/v1/watchlist/13')
    expect(absent.status).toBe(404)

    const created = await fetch('http://storybook.test/api/v1/watchlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anime_id: 13 }),
    })
    expect(created.status).toBe(201)
    await expect(created.json()).resolves.toMatchObject({ data: { anime_id: 13 } })

    const present = await fetch('http://storybook.test/api/v1/watchlist/13')
    expect(present.ok).toBe(true)

    const removed = await fetch('http://storybook.test/api/v1/watchlist/13', { method: 'DELETE' })
    expect(removed.status).toBe(204)
    expect((await fetch('http://storybook.test/api/v1/watchlist/13')).status).toBe(404)
  })
})
