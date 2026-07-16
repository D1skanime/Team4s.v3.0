// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const session = vi.hoisted(() => ({ value: { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true } }))
const playbackAccess = vi.hoisted(() => vi.fn())
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => session.value }))
vi.mock('@/lib/api', () => ({ getReleasePlaybackAccess: playbackAccess }))
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick }: { children: unknown; onClick: () => void }) => <button onClick={onClick}>{children as string}</button>,
  Modal: ({ open, onClose, children }: { open: boolean; onClose: () => void; children: unknown }) => open ? <div role="dialog">{children as ReactNode}<button onClick={onClose}>Schließen</button></div> : null,
}))

import { ReleaseEpisodePlayer } from './ReleaseEpisodePlayer'

afterEach(() => { cleanup(); vi.restoreAllMocks(); playbackAccess.mockReset(); session.value = { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true } })

describe('ReleaseEpisodePlayer', () => {
  it('stays hidden when entitlement or source readiness is absent', async () => {
    playbackAccess.mockResolvedValue({ can_play: true, stream_ready: false })
    render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    await waitFor(() => expect(playbackAccess).toHaveBeenCalledWith(12))
    expect(screen.queryByText('Episode abspielen')).toBeNull()
  })

  it('supports refresh-only sessions and unloads the video on close', async () => {
    session.value = { hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }
    playbackAccess.mockResolvedValue({ can_play: true, stream_ready: true })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    fireEvent.click(await screen.findByText('Episode abspielen'))
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/releases/12/stream')
    fireEvent.click(screen.getByText('Schließen'))
    expect(pause).toHaveBeenCalled(); expect(load).toHaveBeenCalled()
  })

  it('does not resolve protected access before initialization or without a session', () => {
    session.value = { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: false }
    const view = render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    expect(playbackAccess).not.toHaveBeenCalled()
    session.value = { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true }
    view.rerender(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    expect(playbackAccess).not.toHaveBeenCalled()
  })

  it('keeps access failures local and test-observable', async () => {
    playbackAccess.mockRejectedValue(new Error('unauthorized'))
    render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    await waitFor(() => expect(document.querySelector('[data-playback-access-error="true"]')).not.toBeNull())
    expect(screen.queryByText('Episode abspielen')).toBeNull()
  })
})
