// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getWatchlistEntry: vi.fn(),
  addWatchlistEntry: vi.fn(),
  removeWatchlistEntry: vi.fn(),
}))

import { AUTH_SESSION_CHANGED_EVENT, ApiError, addWatchlistEntry, clearAuthSession, getWatchlistEntry, persistAuthSession, removeWatchlistEntry } from '@/lib/api'
import type { WatchlistCreateResponse } from '@/types/watchlist'
import { WatchlistAddButton } from './WatchlistAddButton'

const entry: WatchlistCreateResponse = { data: { anime_id: 1, title: 'Anime', type: 'tv', status: 'ongoing', added_at: '2026-09-13' } }
const missing = () => new ApiError(404, 'watchlist-eintrag nicht gefunden')
function seed(account = 11, access = 'access', refresh = 'refresh') {
  persistAuthSession({
    token_type: 'Bearer', access_token: access, access_token_expires_at: 9999999999,
    access_token_expires_in: 3600, refresh_token: refresh, refresh_token_expires_at: 9999999999,
    refresh_token_expires_in: 7200, user_id: account, app_user_id: account, display_name: 'Gleicher Name',
  })
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function disabled(name: RegExp) {
  expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true)
}
async function known(name: RegExp) {
  const button = await screen.findByRole('button', { name })
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  return button
}

beforeEach(() => {
  clearAuthSession()
  seed()
  vi.mocked(getWatchlistEntry).mockReset().mockRejectedValue(missing())
  vi.mocked(addWatchlistEntry).mockReset().mockResolvedValue(entry)
  vi.mocked(removeWatchlistEntry).mockReset().mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); clearAuthSession() })

describe('watchlist client status ownership', () => {
  it('blocks both actions until status resolves, ignoring the old SSR hint', async () => {
    const pending = deferred<WatchlistCreateResponse>()
    vi.mocked(getWatchlistEntry).mockReturnValue(pending.promise)
    render(<WatchlistAddButton animeID={1} initiallyInWatchlist />)
    disabled(/Watchlist wird geprüft/)
    fireEvent.click(screen.getByRole('button'))
    expect(addWatchlistEntry).not.toHaveBeenCalled()
    expect(removeWatchlistEntry).not.toHaveBeenCalled()
    await act(async () => pending.reject(missing()))
    fireEvent.click(await known(/Zur Watchlist/))
    await screen.findByText('Zur Watchlist hinzugefügt.')
    expect(addWatchlistEntry).toHaveBeenCalledWith(1)
  })

  it('recognizes an existing entry with refresh only and deletes through the central helper', async () => {
    seed(11, '', 'refresh')
    vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
    render(<WatchlistAddButton animeID={1} />)
    fireEvent.click(await known(/In Watchlist/))
    await screen.findByText('Aus Watchlist entfernt.')
    expect(removeWatchlistEntry).toHaveBeenCalledWith(1)
    expect(addWatchlistEntry).not.toHaveBeenCalled()
  })

  it.each([new ApiError(401, 'Nicht angemeldet'), new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler')])(
    'keeps unknown status fail-closed after %s and supports retry', async (error) => {
      vi.mocked(getWatchlistEntry).mockRejectedValueOnce(error)
      render(<WatchlistAddButton animeID={1} className="custom" />)
      await screen.findByRole('alert')
      disabled(/Watchliststatus unbekannt/)
      fireEvent.click(screen.getByRole('button', { name: /Watchliststatus unbekannt/ }))
      expect(addWatchlistEntry).not.toHaveBeenCalled()
      expect(removeWatchlistEntry).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: /Erneut prüfen/ }))
      await known(/Zur Watchlist/)
      expect(getWatchlistEntry).toHaveBeenCalledTimes(2)
    },
  )

  it.each(['add', 'delete'])('shows %s failures with custom styling and retains known status', async (action) => {
    if (action === 'delete') vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
    const mutate = action === 'delete' ? removeWatchlistEntry : addWatchlistEntry
    vi.mocked(mutate).mockRejectedValue(new ApiError(500, 'Änderung fehlgeschlagen.'))
    render(<WatchlistAddButton animeID={1} className="custom" activeClassName="active" />)
    const name = action === 'delete' ? /In Watchlist/ : /Zur Watchlist/
    fireEvent.click(await known(name))
    expect((await screen.findByRole('alert')).textContent).toContain('Änderung fehlgeschlagen.')
    expect((await known(name)).className).toContain('custom')
    if (action === 'delete') expect((await known(name)).className).toContain('active')
  })

  it('reacts to login/logout after mount and skips reads without either token', async () => {
    clearAuthSession()
    render(<WatchlistAddButton animeID={1} />)
    disabled(/Anmeldung erforderlich/)
    expect(getWatchlistEntry).not.toHaveBeenCalled()
    act(() => seed(22, '', 'refresh'))
    await known(/Zur Watchlist/)
    act(() => clearAuthSession())
    disabled(/Anmeldung erforderlich/)
  })

  it('does not reload on focus or token rotation of a known account', async () => {
    render(<WatchlistAddButton animeID={1} />)
    await known(/Zur Watchlist/)
    act(() => {
      seed(11, 'rotated-access', 'rotated-refresh')
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(getWatchlistEntry).toHaveBeenCalledTimes(1)
  })

  for (const change of ['anime', 'account', 'logout', 'missing-meta', 'blocked-meta']) {
    for (const operation of ['status', 'mutation']) {
      it.each(['success', 'failure'])(`ignores old ${operation} %s after ${change}`, async (outcome) => {
        if (change === 'missing-meta') window.localStorage.removeItem('team4s.auth.session_meta')
        if (change === 'blocked-meta') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
        const pending = deferred<WatchlistCreateResponse>()
        if (operation === 'status') vi.mocked(getWatchlistEntry).mockReturnValueOnce(pending.promise)
        else vi.mocked(addWatchlistEntry).mockReturnValueOnce(pending.promise)
        const { rerender } = render(<WatchlistAddButton animeID={1} />)
        if (operation === 'mutation') fireEvent.click(await known(/Zur Watchlist/))
        await waitFor(() => expect(operation === 'status' ? getWatchlistEntry : addWatchlistEntry).toHaveBeenCalledTimes(1))

        act(() => {
          if (change === 'anime') rerender(<WatchlistAddButton animeID={2} />)
          else if (change === 'logout') clearAuthSession()
          else if (change === 'missing-meta') window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
          else seed(22)
        })
        if (change === 'logout') disabled(/Anmeldung erforderlich/)
        else await known(/Zur Watchlist/)
        await act(async () => {
          if (outcome === 'success') pending.resolve(entry)
          else pending.reject(new ApiError(500, 'Fehler der alten Sitzung'))
        })
        expect(screen.queryByText(/Fehler der alten Sitzung|hinzugefügt/)).toBeNull()
        if (change === 'logout') disabled(/Anmeldung erforderlich/)
        else await known(/Zur Watchlist/)
      })
    }
  }

  it('does not let an old mutation finally enable a new pending mutation', async () => {
    const old = deferred<WatchlistCreateResponse>()
    const next = deferred<WatchlistCreateResponse>()
    vi.mocked(addWatchlistEntry).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
    render(<WatchlistAddButton animeID={1} />)
    fireEvent.click(await known(/Zur Watchlist/))
    act(() => seed(22))
    fireEvent.click(await known(/Zur Watchlist/))
    await act(async () => old.resolve(entry))
    disabled(/Speichern/)
    await act(async () => next.resolve(entry))
    await known(/In Watchlist/)
  })
})
