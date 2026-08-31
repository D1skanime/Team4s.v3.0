// @vitest-environment jsdom

import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listReleaseReviews: vi.fn(),
  getReleaseReviewCounts: vi.fn(),
  getReleaseReview: vi.fn(),
  decideReleaseReview: vi.fn(),
  getCurrentUser: vi.fn(),
}))

const navigation = vi.hoisted(() => ({
  params: { id: '88', reviewId: 'review-image' },
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ...api,
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(status: number, message: string, _retry: null = null, code: string | null = null) {
      super(message)
      void _retry
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    hasAccessToken: false,
    hasRefreshToken: true,
    isClientInitialized: true,
    displayName: 'Review Lead',
    authToken: '',
  }),
}))

vi.mock('next/navigation', () => ({
  useParams: () => navigation.params,
  usePathname: () => '/admin/fansubs/88/edit',
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: navigation.refresh,
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

import { ReleaseReviewsSection } from './[id]/edit/ReleaseReviewsSection'
import ReleaseReviewPage from './[id]/reviews/[reviewId]/page'
import { MAIN_TABS, parseMainTab } from './[id]/edit/mainTabRouting'

const item = {
  id: 'review-image',
  source_revision: 2,
  type: 'image' as const,
  category: 'typesetting_karaoke' as const,
  status: 'pending' as const,
  fansub_group_id: 88,
  anime_id: 42,
  anime_title: 'Frieren',
  episode_id: 7,
  episode_number: '1',
  release_id: 5,
  release_version_id: 62,
  release_version: 'v1',
  submitter_app_user_id: 11,
  submitter_member_id: 12,
  submitter_display_name: 'Akari',
  submitted_at: '2026-07-23T12:00:00Z',
  last_activity_at: '2026-07-23T12:05:00Z',
  decided_at: null,
}

const counts = {
  data: {
    text: 1,
    image: 4,
    contribution: 0,
    allowed_types: ['text', 'image'] as const,
    image_categories: {
      screenshot: 1,
      typesetting_karaoke: 1,
      fun_outtake: 1,
      other: 1,
    },
  },
}

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('max-width: 639px') ? width < 640 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
}

beforeEach(() => {
  setViewport(1200)
  window.history.replaceState({}, '', '/admin/fansubs/88/edit?tab=pruefungen')
  api.listReleaseReviews.mockResolvedValue({ data: { items: [item], next_cursor: null } })
  api.getReleaseReviewCounts.mockResolvedValue(counts)
  api.getReleaseReview.mockResolvedValue({
    data: {
      ...item,
      image: {
        caption: 'Karaoke-Vorschau',
        thumbnail_url: '/media/thumb.webp',
        original_url: '/media/original.png',
      },
      can_edit_release: false,
    },
  })
  api.getCurrentUser.mockResolvedValue({
    data: { app_user_id: 99, is_platform_admin: false },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('canonical release review routing and queue', () => {
  it('normalizes the legacy proposals tab into one Prüfungen tab', () => {
    expect(parseMainTab('vorschlaege')).toBe('pruefungen')
    expect(parseMainTab('pruefungen')).toBe('pruefungen')
    expect(MAIN_TABS.filter((tab) => tab.key === 'pruefungen')).toHaveLength(1)
    expect(MAIN_TABS.some((tab) => tab.key === 'vorschlaege')).toBe(false)
  })

  it('renders counters, every image category and the bounded accessible queue', async () => {
    render(<ReleaseReviewsSection fansubId={88} />)

    expect(await screen.findByRole('heading', { name: 'Prüfungen' })).toBeTruthy()
    expect(screen.getByText('Texte 1')).toBeTruthy()
    expect(screen.getByText('Bilder 4')).toBeTruthy()
    expect(screen.queryByText(/Mitwirkungen/)).toBeNull()
    expect(screen.getByRole('table', { name: 'Offene Prüfungen der Fansubgruppe' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Screenshot' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Typesetting / Karaoke' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Fun / Outtake' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Sonstiges' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Öffnen' }).getAttribute('href')).toContain(
      '/admin/fansubs/88/reviews/review-image',
    )
  })

  it('backs view/filter/search state by URL and debounces search for 300ms', async () => {
    vi.useFakeTimers()
    render(<ReleaseReviewsSection fansubId={88} />)
    await act(async () => { await Promise.resolve() })

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: '  Akari  ' } })
    expect(api.listReleaseReviews).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining('search=Akari'), { scroll: false })
    expect(api.listReleaseReviews).toHaveBeenLastCalledWith(88, expect.objectContaining({
      search: 'Akari',
      limit: 50,
    }))
  })

  it('deduplicates cursor pages and never restores a stale page', async () => {
    api.listReleaseReviews
      .mockResolvedValueOnce({ data: { items: [item], next_cursor: 'next' } })
      .mockResolvedValueOnce({ data: { items: [item, { ...item, id: 'review-2' }], next_cursor: null } })
    render(<ReleaseReviewsSection fansubId={88} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Weitere Prüfungen laden' }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Öffnen' })).toHaveLength(2))
  })

  it('shows only the larger-workspace message below 640px', async () => {
    setViewport(639)
    render(<ReleaseReviewsSection fansubId={88} />)

    expect(screen.getByRole('heading', { name: 'Prüfungen benötigen mehr Platz' })).toBeTruthy()
    expect(screen.getByText('Öffne diesen Bereich auf einem Tablet oder Computer, um Beiträge sicher zu prüfen.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: /Bestätigen|Ablehnen/ })).toBeNull()
    expect(api.listReleaseReviews).not.toHaveBeenCalled()
  })
	it('shows the review workspace at the 745px tablet browser width', async () => {
		setViewport(745)
		render(<ReleaseReviewsSection fansubId={88} />)

		await screen.findByRole('heading', { name: 'Pr\u00fcfungen' })
		expect(screen.queryByText('Pr\u00fcfungen ben\u00f6tigen mehr Platz')).toBeNull()
	})

  it('omits the Typ FormField entirely when allowed_types has exactly one entry (D10)', async () => {
    api.getReleaseReviewCounts.mockResolvedValue({
      data: { ...counts.data, allowed_types: ['image'] as const },
    })
    render(<ReleaseReviewsSection fansubId={88} />)

    await screen.findByRole('heading', { name: 'Prüfungen' })
    expect(screen.queryByLabelText('Typ')).toBeNull()
    expect(screen.queryByRole('option', { name: 'Texte' })).toBeNull()
    expect(screen.getByLabelText('Bildkategorie')).toBeTruthy()
  })

  it('renders both Typ options when allowed_types has both entries', async () => {
    render(<ReleaseReviewsSection fansubId={88} />)

    await screen.findByRole('heading', { name: 'Prüfungen' })
    const typeSelect = screen.getByLabelText('Typ')
    expect(typeSelect).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Texte' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Bilder' })).toBeTruthy()
  })

  it('shows the neutral no-filter empty-state copy when the queue is genuinely empty (D13)', async () => {
    api.listReleaseReviews.mockResolvedValue({ data: { items: [], next_cursor: null } })
    render(<ReleaseReviewsSection fansubId={88} />)

    expect(await screen.findByText('Aktuell keine Prüfungen für dich offen.')).toBeTruthy()
    expect(screen.queryByText(/Passe die Filter an/)).toBeNull()
  })

  it('shows the filters-active empty-state copy when a filter narrows an otherwise non-empty set (D13)', async () => {
    window.history.replaceState({}, '', '/admin/fansubs/88/edit?tab=pruefungen&type=text')
    api.listReleaseReviews.mockResolvedValue({ data: { items: [], next_cursor: null } })
    render(<ReleaseReviewsSection fansubId={88} />)

    expect(await screen.findByText(
      'Für die gewählten Filter sind aktuell keine Prüfungen offen. Passe die Filter an oder setze sie zurück.',
    )).toBeTruthy()
    expect(screen.queryByText('Aktuell keine Prüfungen für dich offen.')).toBeNull()
  })
})

describe('read-only release review detail and decisions', () => {
  it('renders the original media view without editor, upload, bulk action or beneficiary', async () => {
    render(<ReleaseReviewPage />)

    expect(await screen.findByRole('heading', { name: 'Prüfung' })).toBeTruthy()
    expect(screen.getByAltText('Bildbeitrag für Frieren, Episode 1')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Original öffnen/ }).getAttribute('target')).toBe('_blank')
    expect(screen.queryByText(/Punkteempfänger/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Hochladen|Bearbeiten|Alle bestätigen/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Release bearbeiten/i })).toBeNull()
  })

  it('validates rejection, announces the error and sends the exact structured reason', async () => {
    api.decideReleaseReview.mockResolvedValue({
      data: { review_id: item.id, decision: 'reject', next: null },
    })
    render(<ReleaseReviewPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ablehnen' }))
    fireEvent.change(screen.getByLabelText('Ablehnungsgrund'), {
      target: { value: 'quality.insufficient' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Beitrag ablehnen' }))

    expect(screen.getByRole('alert').textContent).toContain('mindestens 10 Zeichen')

    fireEvent.change(screen.getByLabelText('Begründung'), {
      target: { value: 'Das Bild ist deutlich zu unscharf.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Beitrag ablehnen' }))

    await waitFor(() => expect(api.decideReleaseReview).toHaveBeenCalledWith(88, item.id, {
      decision: 'reject',
      expected_revision: 2,
      rejection_category: 'quality.insufficient',
      rejection_reason: 'Das Bild ist deutlich zu unscharf.',
    }))
    expect(await screen.findByText('Beitrag abgelehnt. Der Einreicher kann ihn bearbeiten und erneut einreichen.')).toBeTruthy()
  })

  it('replaces mutation controls with the stable concurrent-decision state', async () => {
    const error = Object.assign(new Error('conflict'), {
      status: 409,
      code: 'REVIEW_ALREADY_DECIDED',
    })
    api.decideReleaseReview.mockRejectedValue(error)
    render(<ReleaseReviewPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigen und veröffentlichen' }))

    expect(await screen.findByText('Diese Prüfung wurde bereits von einer anderen Person entschieden.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aktuellen Stand laden' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Bestätigen und veröffentlichen' })).toBeNull()
  })

  it('explains that another authorized person must review an own pending contribution', async () => {
    api.getCurrentUser.mockResolvedValue({
      data: { app_user_id: item.submitter_app_user_id, is_platform_admin: false },
    })
    render(<ReleaseReviewPage />)

    expect(await screen.findByText(
      'Das ist dein eigener Beitrag. Eine andere berechtigte Person muss ihn prüfen.',
    )).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Bestätigen und veröffentlichen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ablehnen' })).toBeNull()
  })

  it('lets a platform admin review another users contribution without a self-review override', async () => {
    api.getCurrentUser.mockResolvedValue({
      data: { app_user_id: 99, is_platform_admin: true },
    })
    api.decideReleaseReview.mockResolvedValue({
      data: { review_id: item.id, decision: 'confirm', next: null },
    })
    render(<ReleaseReviewPage />)

    expect(await screen.findByRole('button', { name: 'Bestätigen und veröffentlichen' })).toBeTruthy()
    expect(screen.queryByText(/Du entscheidest als Plattform-Admin/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen und veröffentlichen' }))

    await waitFor(() => expect(api.decideReleaseReview).toHaveBeenCalledWith(88, item.id, {
      decision: 'confirm',
      expected_revision: 2,
    }))
  })

  it('requires a platform-admin override reason for an own contribution', async () => {
    api.getCurrentUser.mockResolvedValue({
      data: { app_user_id: item.submitter_app_user_id, is_platform_admin: true },
    })
    render(<ReleaseReviewPage />)

    expect(await screen.findByText(/Du entscheidest als Plattform-Admin/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen und veröffentlichen' }))
    expect(screen.getByRole('alert').textContent).toContain('Override-Grund')
    expect(screen.queryByText(/Prüfpunkt vergeben$/)).toBeNull()
  })
})
