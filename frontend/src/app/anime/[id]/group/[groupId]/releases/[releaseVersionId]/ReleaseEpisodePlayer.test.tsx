// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const session = vi.hoisted(() => ({ value: { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true } }))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => session.value }))
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick }: { children: unknown; onClick: () => void }) => <button onClick={onClick}>{children as string}</button>,
  Modal: ({ open, onClose, children }: { open: boolean; onClose: () => void; children: unknown }) => open ? <div role="dialog">{children as ReactNode}<button onClick={onClose}>Schließen</button></div> : null,
}))

import { ReleaseEpisodePlayer } from './ReleaseEpisodePlayer'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ReleaseEpisodePlayer', () => {
  it('stays hidden when entitlement or source readiness is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { can_play: true, stream_ready: false } }))))
    render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByText('Episode abspielen')).toBeNull()
  })

  it('supports refresh-only sessions and unloads the video on close', async () => {
    session.value = { hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { can_play: true, stream_ready: true } }))))
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    render(<ReleaseEpisodePlayer releaseVersionID={12} title="Episode" />)
    fireEvent.click(await screen.findByText('Episode abspielen'))
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/releases/12/stream')
    fireEvent.click(screen.getByText('Schließen'))
    expect(pause).toHaveBeenCalled(); expect(load).toHaveBeenCalled()
  })
})
