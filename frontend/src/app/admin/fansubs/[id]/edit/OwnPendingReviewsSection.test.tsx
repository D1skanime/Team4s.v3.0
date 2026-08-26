// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listReleaseReviews: vi.fn(),
  getReleaseReviewCounts: vi.fn(),
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

vi.mock('../../useReleaseReviewMobileGate', () => ({
  useReleaseReviewMobileGate: () => false,
}))

import { OwnPendingReviewsSection } from './OwnPendingReviewsSection'

const item = {
  id: 'own-review-1',
  source_revision: 1,
  type: 'text' as const,
  category: null,
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
    image: 0,
    contribution: 0,
    allowed_types: ['text', 'image'],
    image_categories: {
      screenshot: 0,
      typesetting_karaoke: 0,
      fun_outtake: 0,
      other: 0,
    },
  },
}

beforeEach(() => {
  window.history.replaceState({}, '', '/admin/fansubs/88/edit?tab=pruefungen')
  api.listReleaseReviews.mockResolvedValue({ data: { items: [item], next_cursor: null } })
  api.getReleaseReviewCounts.mockResolvedValue(counts)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OwnPendingReviewsSection', () => {
  it('renders own-pending items in a read-only 5-column table with no decision or submitter column', async () => {
    render(<OwnPendingReviewsSection fansubId={88} />)

    expect(await screen.findByRole('heading', { name: 'Wartet auf Fremdprüfung' })).toBeTruthy()
    expect(api.listReleaseReviews).toHaveBeenCalledWith(88, expect.objectContaining({ view: 'own' }))

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Eingereicht', 'Projekt', 'Episode / Release', 'Typ', 'Status'])
    expect(screen.queryByRole('columnheader', { name: 'Aktion' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Einreicher' })).toBeNull()

    expect(screen.getByRole('cell', { name: 'Frieren' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'Episode 1 · v1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Bestätigen|Ablehnen/ })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Öffnen' })).toBeNull()
  })

  it('shows the locked empty-state title and description when there are no own-pending items', async () => {
    api.listReleaseReviews.mockResolvedValue({ data: { items: [], next_cursor: null } })
    render(<OwnPendingReviewsSection fansubId={88} />)

    expect(await screen.findByText('Keine offenen Einreichungen')).toBeTruthy()
    expect(
      screen.getByText('Du hast aktuell keine eigenen Einreichungen, die auf Prüfung warten.'),
    ).toBeTruthy()
  })

  it('reveals no reviewer identity, reviewer count, or assignment information', async () => {
    render(<OwnPendingReviewsSection fansubId={88} />)
    await screen.findByRole('heading', { name: 'Wartet auf Fremdprüfung' })

    expect(screen.queryByText(/Akari/)).toBeNull()
    expect(screen.queryByText(/Prüfer/i)).toBeNull()
    expect(screen.queryByText(/zugewiesen/i)).toBeNull()
    expect(screen.queryByText(/Personen können das prüfen/i)).toBeNull()
  })
})
