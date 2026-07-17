// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

afterEach(() => { cleanup() })

describe('ThemeTimeline', () => {
  it('offers bounded Kara playback to guests without a login prompt', () => {
    render(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abspielen' }))
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
    expect(screen.queryByText(/anmeld/i)).toBeNull()
    expect(screen.getByText('Noch nicht abspielbar')).not.toBeNull()
  })

  it('keeps unavailable segments disabled', () => {
    render(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1400} segments={segments} />)
    const endingMark = screen.getByRole('button', { name: /Ending/ })
    expect(endingMark).toHaveProperty('disabled', true)
    expect(screen.getAllByRole('button', { name: 'Abspielen' })).toHaveLength(1)
  })

  it('starts a valid public Deep-Link automatically', async () => {
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

  it.each([8, 999])('does not start unavailable or foreign Deep-Link %s', initialSegmentID => {
    render(
      <ThemeTimeline
        releaseVersionID={12}
        episodeDurationSeconds={1400}
        segments={segments}
        initialSegmentID={initialSegmentID}
        autoPlayInitial
      />,
    )
    expect(document.querySelector('video')).toBeNull()
  })
})
