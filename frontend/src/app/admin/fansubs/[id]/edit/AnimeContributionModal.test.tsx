// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { UnifiedGroupMember } from '@/types/fansub'

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
})
