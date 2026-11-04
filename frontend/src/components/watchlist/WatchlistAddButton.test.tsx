// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
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
import { useWatchlistAction } from './useWatchlistAction'

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
// Referenzstabil (kein Inline-Literal pro Render) -- useWatchlistAction hängt checkStatus über
// useCallback an isCurrentSession, eine bei jedem Render neu erzeugte Funktion würde den
// Mount-Effekt in eine Render-Schleife treiben.
const alwaysCurrentSession = () => true
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

  it('recognizes an existing entry with refresh only and deletes through the central helper (direkter Hook-Aufruf statt Klick-Simulation, Befund 25)', async () => {
    vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
    const { result } = renderHook(() => useWatchlistAction({ animeID: 1, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
    await act(async () => { await result.current.checkStatus() })
    expect(result.current.status).toBe('present')
    await act(async () => { await result.current.handleToggle() })
    expect(removeWatchlistEntry).toHaveBeenCalledExactlyOnceWith(1)
    expect(addWatchlistEntry).not.toHaveBeenCalled()
    expect(result.current.status).toBe('absent')
    expect(result.current.message).toBe('Aus Watchlist entfernt.')
  })

  it.each([new ApiError(401, 'Nicht angemeldet'), new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler')])(
    'keeps unknown status fail-closed after %s and supports retry', async (error) => {
      vi.mocked(getWatchlistEntry).mockRejectedValueOnce(error)
      render(<WatchlistAddButton animeID={1} />)
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

  it.each(['add', 'delete'])('shows %s failures with the global watchlist state and retains known status (direkter Hook-Aufruf statt Klick-Simulation, Befund 25)', async (action) => {
    if (action === 'delete') vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
    const mutate = action === 'delete' ? removeWatchlistEntry : addWatchlistEntry
    vi.mocked(mutate).mockRejectedValue(new ApiError(500, 'Änderung fehlgeschlagen.'))
    const { result } = renderHook(() => useWatchlistAction({ animeID: 1, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
    await act(async () => { await result.current.checkStatus() })
    expect(result.current.status).toBe(action === 'delete' ? 'present' : 'absent')
    await act(async () => { await result.current.handleToggle() })
    expect(result.current.isError).toBe(true)
    expect(result.current.message).toBe('Änderung fehlgeschlagen.')
    // Ein fehlgeschlagener Aufruf ändert den zuletzt bekannten Status NICHT (D-xx: der Nutzer
    // bleibt auf dem vorherigen, bekannten Zustand stehen, statt in ein unbekanntes Limbo zu fallen).
    expect(result.current.status).toBe(action === 'delete' ? 'present' : 'absent')
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

// Befund 25: handleToggle/checkStatus enthalten die eigentliche Fachlogik des Watchlist-
// Hinzufügen/Entfernen-Ablaufs -- diese Tests rufen sie DIREKT per `renderHook`/`act` auf,
// statt einen Klick zu simulieren und auf ein Re-Render zu warten. Der echte DOM-Klick-zu-
// Rerender-Ablauf bleibt Live-UAT-Sache (siehe `192-CONTEXT.md`s Befund-25-Entscheidung).
describe('useWatchlistAction: direkte Logiktests ohne Rendering/fireEvent (Befund 25)', () => {
  describe('checkStatus', () => {
    it('setzt status=present bei einem vorhandenen Eintrag', async () => {
      vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
      const { result } = renderHook(() => useWatchlistAction({ animeID: 1, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('present')
    })

    it('setzt status=absent bei einem 404 (kein Eintrag vorhanden)', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(missing())
      const { result } = renderHook(() => useWatchlistAction({ animeID: 1, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('absent')
    })

    it('setzt status=error mit fester Meldung und isError=true bei jedem anderen Fehler', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(new ApiError(500, 'Serverfehler'))
      const { result } = renderHook(() => useWatchlistAction({ animeID: 1, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe('Watchliststatus konnte nicht geladen werden. Bitte erneut prüfen.')
    })
  })

  describe('handleToggle', () => {
    it('ruft bei status=absent addWatchlistEntry auf und setzt status=present mit fester Meldung', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(missing())
      const { result } = renderHook(() => useWatchlistAction({ animeID: 7, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('absent')
      await act(async () => { await result.current.handleToggle() })
      expect(addWatchlistEntry).toHaveBeenCalledExactlyOnceWith(7)
      expect(result.current.status).toBe('present')
      expect(result.current.message).toBe('Zur Watchlist hinzugefügt.')
    })

    it('ruft bei status=present removeWatchlistEntry auf und setzt status=absent mit fester Meldung', async () => {
      vi.mocked(getWatchlistEntry).mockResolvedValue(entry)
      const { result } = renderHook(() => useWatchlistAction({ animeID: 7, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('present')
      await act(async () => { await result.current.handleToggle() })
      expect(removeWatchlistEntry).toHaveBeenCalledExactlyOnceWith(7)
      expect(result.current.status).toBe('absent')
      expect(result.current.message).toBe('Aus Watchlist entfernt.')
    })

    it('setzt isError und eine Meldung bei einem fehlgeschlagenen Aufruf, ohne den zuletzt bekannten Status zu ändern', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(missing())
      vi.mocked(addWatchlistEntry).mockRejectedValue(new ApiError(500, 'Änderung fehlgeschlagen.'))
      const { result } = renderHook(() => useWatchlistAction({ animeID: 7, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      await act(async () => { await result.current.handleToggle() })
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe('Änderung fehlgeschlagen.')
      expect(result.current.status).toBe('absent')
    })

    it('ist ein No-Op, solange bereits eine Anfrage läuft (isSubmitting)', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(missing())
      const pending = deferred<WatchlistCreateResponse>()
      vi.mocked(addWatchlistEntry).mockReturnValue(pending.promise)
      const { result } = renderHook(() => useWatchlistAction({ animeID: 7, hasAuthSession: true, isCurrentSession: alwaysCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      act(() => { void result.current.handleToggle() }) // erste Anfrage startet, isSubmitting wird synchron true
      expect(result.current.isSubmitting).toBe(true)
      act(() => { void result.current.handleToggle() }) // zweiter Aufruf, während die erste noch pendent ist
      expect(addWatchlistEntry).toHaveBeenCalledTimes(1)
      await act(async () => { pending.resolve(entry) })
    })

    it('ist ein No-Op, wenn isCurrentSession() false liefert (veraltete-Besitzer-Schutz)', async () => {
      vi.mocked(getWatchlistEntry).mockRejectedValue(missing())
      let isCurrent = true
      // Referenzstabil (wie alwaysCurrentSession oben) -- liest den äußeren mutierbaren
      // isCurrent-Wert bei jedem Aufruf neu, ohne dass sich die Funktionsreferenz selbst ändert.
      const isCurrentSession = () => isCurrent
      const { result } = renderHook(() => useWatchlistAction({ animeID: 7, hasAuthSession: true, isCurrentSession }))
      await act(async () => { await result.current.checkStatus() })
      expect(result.current.status).toBe('absent')
      isCurrent = false
      await act(async () => { await result.current.handleToggle() })
      expect(addWatchlistEntry).not.toHaveBeenCalled()
      expect(removeWatchlistEntry).not.toHaveBeenCalled()
      expect(result.current.status).toBe('absent')
    })
  })
})
