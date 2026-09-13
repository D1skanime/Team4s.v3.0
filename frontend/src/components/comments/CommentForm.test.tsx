// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  createAnimeComment: vi.fn(),
}))

import { AUTH_SESSION_CHANGED_EVENT, ApiError, clearAuthSession, createAnimeComment, persistAuthSession } from '@/lib/api'
import type { CommentCreateResponse } from '@/types/comment'
import { CommentForm } from './CommentForm'

const response: CommentCreateResponse = { data: { id: 1, anime_id: 1, author_name: 'Anna', content: 'Kommentar', created_at: '2026-09-13' } }
function seed(account = 11, access = 'access', displayName = 'Anna') {
  persistAuthSession({
    token_type: 'Bearer', access_token: access, access_token_expires_at: 9999999999,
    access_token_expires_in: 3600, refresh_token: 'refresh', refresh_token_expires_at: 9999999999,
    refresh_token_expires_in: 7200, user_id: account, app_user_id: account, display_name: displayName,
  })
}
function deferred() {
  let resolve!: (value: CommentCreateResponse) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<CommentCreateResponse>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function submit(content = 'Ein Kommentar') {
  fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: content } })
  fireEvent.click(screen.getByRole('button', { name: /Kommentar absenden/ }))
}

beforeEach(() => {
  clearAuthSession()
  seed()
  refresh.mockReset()
  vi.mocked(createAnimeComment).mockReset().mockResolvedValue(response)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); clearAuthSession() })

describe('comment active-session boundary', () => {
  it('submits with refresh only and delivers the current owner callback', async () => {
    seed(11, '')
    const created = vi.fn()
    render(<CommentForm animeID={1} onCommentCreated={created} />)
    expect(screen.getByText('Angemeldet als: Anna')).toBeTruthy()
    submit('  Ein Kommentar  ')
    await screen.findByText('Kommentar gespeichert.')
    expect(createAnimeComment).toHaveBeenCalledWith(1, { content: 'Ein Kommentar' })
    expect(created).toHaveBeenCalledWith(response.data)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('follows logout and login after mount, including display name and submit gate', async () => {
    render(<CommentForm animeID={1} />)
    act(() => clearAuthSession())
    expect(screen.getByRole('button', { name: /Anmeldung erforderlich/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Angemeldet als: nicht angemeldet')).toBeTruthy()
    fireEvent.submit(screen.getByLabelText('Kommentar').closest('form')!)
    expect(createAnimeComment).not.toHaveBeenCalled()
    act(() => seed(22, '', 'Bea'))
    expect(screen.getByText('Angemeldet als: Bea')).toBeTruthy()
    submit()
    await screen.findByText('Kommentar gespeichert.')
  })

  it.each([new ApiError(401, 'Anmeldung prüfen'), new ApiError(500, 'Serverfehler'), new TypeError('Netzwerkfehler'), new ApiError(429, 'Limit', 12)])(
    'shows submit failure without success or callback: %s', async (error) => {
      vi.mocked(createAnimeComment).mockRejectedValue(error)
      const created = vi.fn()
      render(<CommentForm animeID={1} onCommentCreated={created} />)
      submit()
      const alert = await screen.findByRole('alert')
      expect(alert.textContent).toContain(error instanceof ApiError
        ? error.status === 429 ? '12 Sekunden' : error.message
        : 'Kommentar konnte nicht gespeichert werden.')
      expect(created).not.toHaveBeenCalled()
      expect(refresh).not.toHaveBeenCalled()
      expect((screen.getByLabelText('Kommentar') as HTMLTextAreaElement).value).toBe('Ein Kommentar')
    },
  )

  for (const change of ['anime', 'account', 'logout', 'missing-meta', 'blocked-meta']) {
    it.each(['success', 'failure'])(`ignores old submit %s after ${change}`, async (outcome) => {
      if (change === 'missing-meta') window.localStorage.removeItem('team4s.auth.session_meta')
      if (change === 'blocked-meta') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
      const pending = deferred()
      vi.mocked(createAnimeComment).mockReturnValue(pending.promise)
      const oldCreated = vi.fn()
      const nextCreated = vi.fn()
      const { rerender } = render(<CommentForm animeID={1} onCommentCreated={oldCreated} />)
      submit()
      act(() => {
        if (change === 'logout') clearAuthSession()
        else if (change === 'missing-meta') window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
        else if (change !== 'anime') seed(22)
        rerender(<CommentForm animeID={change === 'anime' ? 2 : 1} onCommentCreated={nextCreated} />)
      })
      if (change !== 'logout') {
        fireEvent.change(screen.getByLabelText('Kommentar'), { target: { value: 'Neuer Entwurf' } })
      }
      await act(async () => {
        if (outcome === 'success') pending.resolve(response)
        else pending.reject(new ApiError(500, 'Alter Fehler'))
      })
      expect(oldCreated).not.toHaveBeenCalled()
      expect(nextCreated).not.toHaveBeenCalled()
      expect(refresh).not.toHaveBeenCalled()
      expect(screen.queryByText(/Kommentar gespeichert|Alter Fehler/)).toBeNull()
      if (change !== 'logout') expect((screen.getByLabelText('Kommentar') as HTMLTextAreaElement).value).toBe('Neuer Entwurf')
    })
  }

  it('keeps the current draft and pending result through same-account rotation and focus', async () => {
    const pending = deferred()
    vi.mocked(createAnimeComment).mockReturnValue(pending.promise)
    const created = vi.fn()
    render(<CommentForm animeID={1} onCommentCreated={created} />)
    submit()
    act(() => { seed(11, 'rotated'); window.dispatchEvent(new Event('focus')) })
    expect((screen.getByLabelText('Kommentar') as HTMLTextAreaElement).value).toBe('Ein Kommentar')
    await act(async () => pending.resolve(response))
    expect(created).toHaveBeenCalledWith(response.data)
  })

  it('ignores callbacks after unmount', async () => {
    const pending = deferred()
    vi.mocked(createAnimeComment).mockReturnValue(pending.promise)
    const created = vi.fn()
    const { unmount } = render(<CommentForm animeID={1} onCommentCreated={created} />)
    submit()
    unmount()
    await act(async () => pending.resolve(response))
    expect(created).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
