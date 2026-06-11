// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AnimeContribution, UnifiedGroupMember } from '@/types/fansub'

const deleteAnimeContributionMock = vi.fn()
const upsertAnimeContributionMock = vi.fn()

vi.mock('@/lib/api', () => ({
  deleteAnimeContribution: (...args: unknown[]) => deleteAnimeContributionMock(...args),
  upsertAnimeContribution: (...args: unknown[]) => upsertAnimeContributionMock(...args),
}))

import AnimeContributionModal from './AnimeContributionModal'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const TEST_MEMBERS: UnifiedGroupMember[] = [
  {
    member_id: 12,
    display_name: 'Naru-Fan',
    source: 'app',
    has_app_account: true,
    group_roles: ['translator'],
  },
]

const EXISTING_TRANSLATOR_CONTRIBUTION: AnimeContribution = {
  id: 77,
  member_id: 12,
  member_display_name: 'Naru-Fan',
  anime_id: 13,
  role_codes: ['translator'],
  started_year: null,
  ended_year: null,
  note: null,
  is_public_on_anime_page: false,
  is_public_on_member_profile: false,
  status: 'confirmed',
  release_version_id: null,
  created_at: '2026-06-11T00:00:00Z',
}

describe('AnimeContributionModal', () => {
  it('zeigt nur Fansub-Member und Rollen statt Status, Sichtbarkeit oder Release-Version', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByText('Naru-Fan')).not.toBeNull()
    expect(screen.getByText('Übersetzung')).not.toBeNull()
    expect(screen.queryByText('Sichtbarkeit')).toBeNull()
    expect(screen.queryByText('Status')).toBeNull()
    expect(screen.queryByText(/Release-Version/)).toBeNull()

    fireEvent.click(screen.getByLabelText('Übersetzung'))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 12,
        role_codes: ['translator'],
        status: 'confirmed',
        is_public_on_anime_page: false,
        is_public_on_member_profile: false,
        release_version_id: null,
      }))
    })
  })

  it('öffnet rollenfokussiert und erhält bestehende andere Rollen', async () => {
    upsertAnimeContributionMock.mockResolvedValue({ data: {} })

    render(
      <AnimeContributionModal
        fansubId={1}
        animeId={13}
        animeTitle="Naruto"
        members={TEST_MEMBERS}
        existingContributions={[EXISTING_TRANSLATOR_CONTRIBUTION]}
        focusedRoleCode="timer"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Timing für „Naruto“ zuweisen' })).not.toBeNull()
    expect(screen.queryByText('Übersetzung')).toBeNull()
    expect(screen.getByText('Noch niemand zugewiesen.')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Member hinzufügen'), {
      target: { value: '12' },
    })
    expect(screen.getByText('Naru-Fan')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(upsertAnimeContributionMock).toHaveBeenCalledWith(1, 13, expect.objectContaining({
        member_id: 12,
        role_codes: ['translator', 'timer'],
      }))
    })
  })
})
