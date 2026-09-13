// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(), getAnimeContributions: vi.fn(),
}))
import { ApiError, getAnimeContributions } from '@/lib/api'
import type { PublicAnimeContributionsResponse } from '@/types/contributions'
import { AnimeContributionsSection } from './AnimeContributionsSection'

const payload: PublicAnimeContributionsResponse = { groups: [{
  fansub_group_id: 11, fansub_group_name: 'Gruppe mit Beiträgen', fansub_group_slug: 'gruppe',
  active_from_year: 2001, active_until_year: null, contributors: [], hidden_contributor_count: 0,
}] }
function deferred() {
  let resolve!: (value: PublicAnimeContributionsResponse) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<PublicAnimeContributionsResponse>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
beforeEach(() => vi.mocked(getAnimeContributions).mockReset())
afterEach(cleanup)

describe('anime contributions loading, empty and failure states', () => {
  it('shows loading until a successful empty response', async () => {
    const pending = deferred()
    vi.mocked(getAnimeContributions).mockReturnValue(pending.promise)
    render(<AnimeContributionsSection animeID={1} />)
    expect(screen.getByRole('heading', { name: 'Mitwirkende Gruppen' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('werden geladen')
    expect(screen.queryByText('Noch keine Mitwirkenden eingetragen.')).toBeNull()
    await act(async () => pending.resolve({ groups: [] }))
    expect(screen.getByRole('status').textContent).toBe('Noch keine Mitwirkenden eingetragen.')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([new ApiError(401, 'Nicht angemeldet'), new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler')])(
    'shows %s as a retryable error, never as empty', async (error) => {
      vi.mocked(getAnimeContributions).mockRejectedValueOnce(error).mockResolvedValueOnce(payload)
      render(<AnimeContributionsSection animeID={1} />)
      expect((await screen.findByRole('alert')).textContent).toContain('konnten nicht geladen werden')
      expect(screen.queryByText('Noch keine Mitwirkenden eingetragen.')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
      await screen.findByText('Gruppe mit Beiträgen')
      expect(screen.queryByRole('alert')).toBeNull()
      expect(getAnimeContributions).toHaveBeenCalledTimes(2)
    },
  )

  it.each(['success', 'failure'])('ignores an old anime %s while the next anime loads', async (outcome) => {
    const old = deferred()
    const next = deferred()
    vi.mocked(getAnimeContributions).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
    const { rerender } = render(<AnimeContributionsSection animeID={1} />)
    rerender(<AnimeContributionsSection animeID={2} />)
    await act(async () => {
      if (outcome === 'success') old.resolve(payload)
      else old.reject(new Error('old'))
    })
    expect(screen.getByRole('status').textContent).toContain('werden geladen')
    expect(screen.queryByText('Gruppe mit Beiträgen')).toBeNull()
    await act(async () => next.resolve({ groups: [] }))
    expect(screen.getByRole('status').textContent).toBe('Noch keine Mitwirkenden eingetragen.')
  })

  it('clears loaded groups when a different anime starts loading', async () => {
    vi.mocked(getAnimeContributions).mockResolvedValueOnce(payload).mockReturnValueOnce(new Promise(() => {}))
    const { rerender } = render(<AnimeContributionsSection animeID={1} />)
    await screen.findByText('Gruppe mit Beiträgen')
    rerender(<AnimeContributionsSection animeID={2} />)
    expect(screen.queryByText('Gruppe mit Beiträgen')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('werden geladen')
  })

  it('uses the existing light token on the dark page for its heading and status', () => {
    const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'AnimeContributionsSection.module.css'), 'utf8')
    // jsdom cannot compute CSS variables; live computed-color proof belongs to 158-04.
    expect(css.match(/\.heading\s*\{([^}]+)\}/)?.[1]).toContain('var(--color-white)')
    expect(css.match(/\.status\s*\{([^}]+)\}/)?.[1]).toContain('var(--color-white)')
  })
})
