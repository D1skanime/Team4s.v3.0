// @vitest-environment jsdom

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicReleaseSegment } from '@/types/releaseDetail'

import styles from './ThemeTimeline.module.css'

const session = vi.hoisted(() => ({
  value: { hasAccessToken: false, hasRefreshToken: false, isClientInitialized: true },
}))

vi.mock('@/lib/useAuthSession', () => ({ useAuthSession: () => session.value }))
vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; fullWidth?: boolean; leftIcon?: ReactNode; variant?: string }) => {
    const { href, fullWidth, leftIcon, variant, ...buttonProps } = props
    void fullWidth
    void variant
    return href
      ? <a href={href}>{leftIcon}{children}</a>
      : <button {...buttonProps}>{leftIcon}{children}</button>
  },
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}))

import { ThemeTimeline } from './ThemeTimeline'

const segments: PublicReleaseSegment[] = [{
  theme_segment_id: 7,
  name: 'Moonlight OP',
  type: 'OP',
  start_seconds: 30,
  end_seconds: 120,
  duration_seconds: 90,
  readiness: 'ready' as const,
  participants: [{ member_id: 41, name: 'Mia', role_label: 'Karaoke', avatar_url: null }],
  preview_url: null,
}, {
  theme_segment_id: 8,
  name: 'Starlight ED',
  type: 'ED',
  start_seconds: 1_200,
  end_seconds: 1_290,
  duration_seconds: 90,
  readiness: 'ready' as const,
  participants: [{ member_id: 42, name: 'Noah', role_label: 'Typesetting', avatar_url: null }],
  preview_url: null,
}, {
  theme_segment_id: 9,
  name: 'Silent Insert',
  type: 'IN',
  start_seconds: 600,
  end_seconds: 630,
  duration_seconds: 30,
  readiness: 'unavailable' as const,
  participants: [],
  preview_url: null,
}]

function setSession(hasAccessToken: boolean, hasRefreshToken: boolean, isClientInitialized = true) {
  session.value = { hasAccessToken, hasRefreshToken, isClientInitialized }
}

function renderTimeline(overrides: Partial<ComponentProps<typeof ThemeTimeline>> = {}) {
  return render(
    <ThemeTimeline
      releaseVersionID={12}
      episodeDurationSeconds={1_400}
      segments={segments}
      {...overrides}
    />,
  )
}

function playbackActions() {
  return screen.getAllByRole('button', { name: /^(?:Kara )?abspielen$/i })
}

beforeEach(() => {
  setSession(false, false)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ThemeTimeline Phase 105 session matrix', () => {
  it('shows public Kara information plus a locked login path to guests without playback or autoplay', async () => {
    renderTimeline({ initialSegmentID: 7, autoPlayInitial: true })

    expect(document.querySelector('#op-ed-middle')?.getAttribute('data-release-atmosphere-band')).toBe('true')
    expect(screen.getAllByText('Moonlight OP').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Opening').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/0:30/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Mia.*Karaoke/)).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Kara abspielen/i })).toBeNull()
    expect(screen.queryAllByRole('button', { name: /^Abspielen$/i })).toHaveLength(0)
    expect(screen.getAllByRole('link', { name: 'Anmelden zum Abspielen' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Anmelden zum Abspielen' }).every(link => link.getAttribute('href') === '/login')).toBe(true)
    expect(screen.getByTestId('kara-login-lock-7')).toBeTruthy()
    expect(screen.getByTestId('kara-login-lock-8')).toBeTruthy()
    expect(screen.getByText('Noch nicht abspielbar')).toBeTruthy()
    await waitFor(() => expect(document.querySelector('video')).toBeNull())
  })

  it('offers ready Kara playback to an access-token session', () => {
    setSession(true, false)
    renderTimeline()
    expect(screen.getAllByRole('button', { name: 'Kara abspielen' })).toHaveLength(2)
  })

  it('offers ready Kara playback to a refresh-only session', () => {
    setSession(false, true)
    renderTimeline()
    expect(screen.getAllByRole('button', { name: 'Kara abspielen' })).toHaveLength(2)
    fireEvent.click(playbackActions()[0])
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
  })

  it('does not expose playback before the client session snapshot is initialized', () => {
    setSession(true, true, false)
    renderTimeline()
    expect(screen.queryByRole('button', { name: 'Kara abspielen' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Anmelden zum Abspielen' })).toBeNull()
    expect(document.querySelector('video')).toBeNull()
  })

  it('shows an unavailable segment as static session copy without a disabled button', () => {
    setSession(true, false)
    renderTimeline()
    expect(screen.getByText('Noch nicht abspielbar')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Silent Insert/ })).toBeNull()
  })
})

describe('ThemeTimeline Phase 105 geometry and selection', () => {
  it('uses exact proportional segment geometry without a visible minimum width', () => {
    renderTimeline({
      segments: [{ ...segments[0], theme_segment_id: 17, start_seconds: 1, end_seconds: 2, duration_seconds: 1 }],
    })

    const geometry = screen.getByTestId('kara-segment-geometry-17')
    expect(geometry.style.left).toBe(`${1 / 1_400 * 100}%`)
    expect(geometry.style.width).toBe(`${1 / 1_400 * 100}%`)
  })

  it('maps live OP Kara and ED Kara variants to distinct card and geometry colors', () => {
    renderTimeline({
      segments: [
        { ...segments[0], type: 'OP Kara' },
        { ...segments[1], type: 'ED Kara' },
        { ...segments[2], type: 'Fansub Special' },
      ],
    })

    expect(screen.getByTestId('kara-segment-geometry-7').classList.contains(styles.typeOp)).toBe(true)
    expect(screen.getByTestId('kara-segment-geometry-8').classList.contains(styles.typeEd)).toBe(true)
    expect(screen.getByTestId('kara-segment-geometry-9').classList.contains(styles.typeOther)).toBe(true)
    expect(document.querySelectorAll(`.${styles.segmentCard}.${styles.typeOp}`)).toHaveLength(1)
    expect(document.querySelectorAll(`.${styles.segmentCard}.${styles.typeEd}`)).toHaveLength(1)
    expect(document.querySelectorAll(`.${styles.segmentCard}.${styles.typeOther}`)).toHaveLength(1)
  })

  it('keeps the 44 by 44 hit target structurally separate from visible geometry', () => {
    setSession(true, false)
    renderTimeline()
    const geometry = screen.getByTestId('kara-segment-geometry-7')
    const hitTarget = screen.getByTestId('kara-hit-target-7')
    expect(hitTarget).not.toBe(geometry)
    expect(hitTarget.style.minWidth).toBe('44px')
    expect(hitTarget.style.minHeight).toBe('44px')
  })

  it('anchors the complete episode track with meaningful start and end times only', () => {
    renderTimeline()
    const anchors = screen.getAllByTestId('kara-timeline-anchor')
    expect(anchors.map(anchor => anchor.getAttribute('data-edge'))).toEqual(['start', 'end'])
    expect(anchors[0].textContent).toContain('Start00:00')
    expect(anchors[1].textContent).toContain('Ende23:20')
    expect(screen.queryByText('05:50')).toBeNull()
  })

  it('allocates four close segment labels to separate lanes and keeps their time ranges visible', () => {
    renderTimeline({
      segments: [
        { ...segments[0], theme_segment_id: 20, type: 'OP', start_seconds: 10, end_seconds: 20 },
        { ...segments[1], theme_segment_id: 21, type: 'ED', start_seconds: 21, end_seconds: 30 },
        { ...segments[2], theme_segment_id: 22, type: 'IN', start_seconds: 31, end_seconds: 40 },
        { ...segments[0], theme_segment_id: 23, type: 'KARA', start_seconds: 41, end_seconds: 50 },
      ],
    })

    const labels = [20, 21, 22, 23].map(id => screen.getByTestId(`kara-outside-label-${id}`))
    expect(labels.map(label => label.getAttribute('data-lane'))).toEqual(['0', '1', '2', '3'])
    expect(labels.map(label => label.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Opening · 00:10–00:20'),
      expect.stringContaining('Ending · 00:21–00:30'),
      expect.stringContaining('Insert · 00:31–00:40'),
      expect.stringContaining('Karaoke · 00:41–00:50'),
    ]))
    expect(document.querySelectorAll(`.${styles.segmentCard}`)).toHaveLength(4)
  })

  it('does not render segment preview images into either responsive Kara representation', () => {
    renderTimeline({ segments: [{ ...segments[0], preview_url: '/preview.jpg' }] })
    expect(document.querySelector('img')).toBeNull()
  })

  it('keeps exactly one selected segment and announces it politely', () => {
    setSession(true, false)
    renderTimeline()
    fireEvent.click(playbackActions()[0])

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.getByText('Kara Moonlight OP ausgewählt').getAttribute('aria-live')).toBe('polite')
  })

  it('highlights a Deep-Link independently from autoplay', async () => {
    setSession(true, false)
    renderTimeline({ initialSegmentID: 7, autoPlayInitial: false })

    await waitFor(() => expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1))
    expect(document.querySelector('video')).toBeNull()
  })
})

describe('ThemeTimeline Phase 105 streaming and cleanup', () => {
  it('uses the server-bound segment and release URL without browser supplied bounds', () => {
    setSession(true, false)
    renderTimeline()
    fireEvent.click(playbackActions()[0])
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
  })

  it('shows a local playback error and allows retrying the same segment', () => {
    setSession(true, false)
    renderTimeline()
    fireEvent.click(playbackActions()[0])
    fireEvent.error(document.querySelector('video') as HTMLVideoElement)

    expect(screen.getByText('Dieses Kara-Segment konnte nicht abgespielt werden. Bitte versuche es erneut.')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/7/stream?release_version_id=12')
  })

  it('pauses, clears, and reloads the old source before a quick segment switch', () => {
    setSession(true, false)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const removeAttribute = vi.spyOn(HTMLMediaElement.prototype, 'removeAttribute')
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    renderTimeline()

    const actions = playbackActions()
    fireEvent.click(actions[0])
    fireEvent.click(actions[1])

    expect(pause).toHaveBeenCalled()
    expect(removeAttribute).toHaveBeenCalledWith('src')
    expect(load).toHaveBeenCalled()
    expect(pause.mock.invocationCallOrder.at(-1)).toBeLessThan(removeAttribute.mock.invocationCallOrder.at(-1) as number)
    expect(removeAttribute.mock.invocationCallOrder.at(-1)).toBeLessThan(load.mock.invocationCallOrder.at(-1) as number)
    expect(document.querySelector('video')?.getAttribute('src')).toBe('/api/segments/8/stream?release_version_id=12')
  })

  it('cleans up playback when the session disappears and again on unmount', () => {
    setSession(true, false)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const removeAttribute = vi.spyOn(HTMLMediaElement.prototype, 'removeAttribute')
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    const view = renderTimeline()
    fireEvent.click(playbackActions()[0])

    setSession(false, false)
    view.rerender(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1_400} segments={segments} />)
    expect(document.querySelector('video')).toBeNull()
    expect(pause).toHaveBeenCalled()
    expect(removeAttribute).toHaveBeenCalledWith('src')
    expect(load).toHaveBeenCalled()

    setSession(true, false)
    view.rerender(<ThemeTimeline releaseVersionID={12} episodeDurationSeconds={1_400} segments={segments} />)
    fireEvent.click(playbackActions()[0])
    pause.mockClear()
    removeAttribute.mockClear()
    load.mockClear()
    view.unmount()
    expect(pause).toHaveBeenCalled()
    expect(removeAttribute).toHaveBeenCalledWith('src')
    expect(load).toHaveBeenCalled()
  })
})
