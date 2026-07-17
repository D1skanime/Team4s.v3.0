// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ value: { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true } }))
vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => session.value }))
vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: unknown }) => <span>{children as string}</span>,
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

import { ThemeTimeline } from './ThemeTimeline'

const segments = [{
  theme_segment_id: 7, name: 'Moonlight OP', type: 'OP', start_seconds: 30, end_seconds: 120,
  duration_seconds: 90, readiness: 'ready' as const, participants: [], preview_url: null,
}, {
  theme_segment_id: 8, name: 'Ending', type: 'ED', start_seconds: 1200, end_seconds: 1290,
  duration_seconds: 90, readiness: 'unavailable' as const, participants: [], preview_url: null,
}]

afterEach(() => { cleanup(); session.value = { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true } })

describe('ThemeTimeline', () => {
  it('shows Kara information to guests without playback or login prompt', () => {
    render(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    expect(screen.getByText('Moonlight OP')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Abspielen' })).toBeNull()
    expect(screen.queryByText(/anmeld/i)).toBeNull()
    expect(screen.getByText('Noch nicht abspielbar')).not.toBeNull()
  })

  it.each([
    { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true },
    { hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true },
  ])('plays through the bounded relay for an active session', activeSession => {
    session.value = activeSession
    render(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abspielen' }))
    const video = document.querySelector('video')
    expect(video?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
  })

  it('keeps public segment titles across guest, access-token and refresh-only rerenders', () => {
    const view = render(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    expect(screen.getByText('Moonlight OP')).not.toBeNull()
    session.value = { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true }
    view.rerender(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    expect(screen.getByText('Moonlight OP')).not.toBeNull()
    session.value = { hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true }
    view.rerender(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    expect(screen.getByText('Moonlight OP')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Abspielen' })).not.toBeNull()
  })

  it.each([
    { hasAccessToken: true, hasRefreshToken: false, isClientInitialized: true },
    { hasAccessToken: false, hasRefreshToken: true, isClientInitialized: true },
  ])('startet den gültigen Deep-Link für eine aktive Session automatisch', async activeSession => {
    session.value = activeSession
    render(
      <ThemeTimeline
        releaseVersionID={12}
        episodeDurationSeconds={1400}
        segments={segments}
        initialSegmentID={7}
        autoPlayInitial
      />,
    )
    await waitFor(() => {
      expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
    })
  })

  it('startet Deep-Links für Gäste oder unfertige Segmente nicht', () => {
    render(
      <ThemeTimeline
        releaseVersionID={12}
        episodeDurationSeconds={1400}
        segments={segments}
        initialSegmentID={8}
        autoPlayInitial
      />,
    )
    expect(document.querySelector('video')).toBeNull()
  })
})
