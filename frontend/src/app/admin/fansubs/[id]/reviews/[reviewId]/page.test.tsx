// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getReleaseReview: vi.fn(),
  decideReleaseReview: vi.fn(),
  getCurrentUser: vi.fn(),
  getNextReleaseReview: vi.fn(),
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
  usePathname: () => '/admin/fansubs/88/reviews/review-image',
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

import { ApiError } from '@/lib/api'

import ReleaseReviewPage from './page'

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

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('max-width: 767px') ? width < 768 : false,
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
  api.getCurrentUser.mockResolvedValue({
    data: { app_user_id: 99, is_platform_admin: false },
  })
  api.getReleaseReview.mockResolvedValue({
    data: {
      ...item,
      text: null,
      image: {
        caption: null,
        thumbnail_url: 'https://example.test/thumb.jpg',
        original_url: 'https://example.test/original.jpg',
      },
      can_edit_release: false,
    },
  })
  api.decideReleaseReview.mockReset()
  api.getNextReleaseReview.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('review detail load failures (D04)', () => {
  it('renders the locked 403 panel with a working return-to-list link and no decision buttons', async () => {
    api.getReleaseReview.mockRejectedValue(
      new ApiError(403, 'forbidden', null, 'REVIEW_FORBIDDEN'),
    )
    render(<ReleaseReviewPage />)

    expect(await screen.findByText('Nicht entscheidbar für dich')).toBeTruthy()
    expect(screen.getByText(
      'Diese Prüfung ist entweder dein eigener Beitrag oder du hast aktuell keine Berechtigung dafür.',
    )).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Zurück zur Prüfliste' })
      .getAttribute('href')).toBe('/admin/fansubs/88/edit?tab=pruefungen')
    expect(screen.queryByRole('button', { name: 'Bestätigen und veröffentlichen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ablehnen' })).toBeNull()
  })

  it('renders the existing generic message for a 404, unchanged', async () => {
    api.getReleaseReview.mockRejectedValue(
      new ApiError(404, 'not found', null, 'NOT_FOUND'),
    )
    render(<ReleaseReviewPage />)

    expect(await screen.findByText(
      'Diese Prüfung konnte nicht geladen werden. Kehre zur Prüfliste zurück und versuche es erneut.',
    )).toBeTruthy()
    expect(screen.queryByText('Nicht entscheidbar für dich')).toBeNull()
  })
})

describe('409 conflict mapping covers both already-decided and not-pending (D11)', () => {
  it('renders the existing conflict panel for REVIEW_ALREADY_DECIDED without new branching', async () => {
    api.decideReleaseReview.mockRejectedValue(
      new ApiError(409, 'conflict', null, 'REVIEW_ALREADY_DECIDED'),
    )
    render(<ReleaseReviewPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigen und veröffentlichen' }))

    await waitFor(() => expect(screen.getByText(
      'Diese Prüfung wurde bereits von einer anderen Person entschieden.',
    )).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Aktuellen Stand laden' })).toBeTruthy()
  })
})

describe('resubmission badge and prior-rejection context line (144-07)', () => {
  it('renders the "Überarbeitet" badge and a context line naming the reviewer\'s own prior rejection', async () => {
    api.getReleaseReview.mockResolvedValue({
      data: {
        ...item,
        text: null,
        image: {
          caption: null,
          thumbnail_url: 'https://example.test/thumb.jpg',
          original_url: 'https://example.test/original.jpg',
        },
        can_edit_release: false,
        prior_rejection: {
          rejected_at: '2026-07-20T09:00:00Z',
          rejection_category: 'quality.insufficient',
          rejection_reason: 'Auflösung zu niedrig.',
          reviewer_display_name: 'Review Lead',
          rejected_by_current_actor: true,
        },
      },
    })
    render(<ReleaseReviewPage />)

    expect(await screen.findByText('Überarbeitet')).toBeTruthy()
    expect(screen.getByText((content) => content.includes('deiner eigenen Ablehnung') && content.includes('Auflösung zu niedrig.'))).toBeTruthy()
  })

  it('renders a context line naming the other reviewer who rejected the prior revision', async () => {
    api.getReleaseReview.mockResolvedValue({
      data: {
        ...item,
        text: null,
        image: {
          caption: null,
          thumbnail_url: 'https://example.test/thumb.jpg',
          original_url: 'https://example.test/original.jpg',
        },
        can_edit_release: false,
        prior_rejection: {
          rejected_at: '2026-07-20T09:00:00Z',
          rejection_category: 'content.incorrect',
          rejection_reason: 'Falsche Szene.',
          reviewer_display_name: 'Mika',
          rejected_by_current_actor: false,
        },
      },
    })
    render(<ReleaseReviewPage />)

    expect(await screen.findByText('Überarbeitet')).toBeTruthy()
    expect(screen.getByText((content) => content.includes('zuvor von Mika abgelehnt') && content.includes('Falsche Szene.'))).toBeTruthy()
  })

  it('renders neither the badge nor a context line when prior_rejection is absent', async () => {
    render(<ReleaseReviewPage />)

    await screen.findByText('In Prüfung')
    expect(screen.queryByText('Überarbeitet')).toBeNull()
    expect(screen.queryByText((content) => content.includes('Überarbeitete Fassung'))).toBeNull()
  })
})

describe('header status Badge reflects the decision (UAT-01)', () => {
  it('updates the header Badge to "Bestätigt / Öffentlich" immediately after a confirm decision', async () => {
    api.decideReleaseReview.mockResolvedValue({
      data: { review_id: 'review-image', decision: 'confirm', next: null },
    })
    render(<ReleaseReviewPage />)

    await screen.findByText('In Prüfung')

    fireEvent.click(await screen.findByRole('button', { name: 'Bestätigen und veröffentlichen' }))

    await waitFor(() => {
      expect(screen.getByText('Bestätigt / Öffentlich')).toBeTruthy()
      expect(screen.queryByText('In Prüfung')).toBeNull()
    })
  })

  it('updates the header Badge to "Abgelehnt" immediately after a reject decision', async () => {
    api.decideReleaseReview.mockResolvedValue({
      data: { review_id: 'review-image', decision: 'reject', next: null },
    })
    render(<ReleaseReviewPage />)

    await screen.findByText('In Prüfung')

    fireEvent.click(await screen.findByRole('button', { name: 'Ablehnen' }))

    fireEvent.change(await screen.findByLabelText('Ablehnungsgrund'), {
      target: { value: 'quality.insufficient' },
    })
    fireEvent.change(screen.getByLabelText('Begründung'), {
      target: { value: 'Bitte Qualität vor der Neueinreichung deutlich verbessern.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Beitrag ablehnen' }))

    await waitFor(() => {
      expect(screen.getByText('Abgelehnt')).toBeTruthy()
      expect(screen.queryByText('In Prüfung')).toBeNull()
    })
  })
})
