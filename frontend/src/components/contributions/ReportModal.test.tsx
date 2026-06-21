// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReportModal, type SuggestionType } from './ReportModal'
import type { ReportTargetOption } from './reportTargets'
import type { MembershipEntry } from '@/types/contributions'

const apiMocks = vi.hoisted(() => ({
  createContributionProposal: vi.fn(),
  getAdminFansubAnime: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
  createContributionProposal: apiMocks.createContributionProposal,
  getAdminFansubAnime: apiMocks.getAdminFansubAnime,
}))

const TARGET_OPTIONS: ReportTargetOption[] = [
  { type: 'anime', id: 3, label: 'Naruto' },
  { type: 'fansub_group', id: 88, label: 'AnimeOwnage' },
  {
    type: 'contribution',
    id: 41,
    label: 'Naruto · AnimeOwnage · Übersetzung',
    description: 'Hinweis #41',
  },
]

const OWN_GROUPS: MembershipEntry[] = [
  { fansub_group_member_id: 19, fansub_group_id: 88, group_name: 'AnimeOwnage' },
]

const ROLE_DEFINITIONS = [
  { code: 'translator', label_de: 'Übersetzung' },
]

function renderModal(prefillType: SuggestionType, targetOptions = TARGET_OPTIONS) {
  return renderToStaticMarkup(
    <ReportModal
      open
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      prefillType={prefillType}
      targetOptions={targetOptions}
    />,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReportModal target context', () => {
  it('does not expose Claim as a peer option in the contributions modal', () => {
    const markup = renderToStaticMarkup(
      <ReportModal
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        targetOptions={TARGET_OPTIONS}
      />,
    )

    expect(markup).toContain('Ich war in einem Projekt dabei')
    expect(markup).not.toContain('Profil beanspruchen')
    expect(markup).not.toContain('/me/claim')
  })

  it('shows loaded anime targets in the story form', () => {
    const markup = renderModal('story')

    expect(markup).toContain('report-form-story')
    expect(markup).toContain('Naruto')
    expect(markup).toContain('value="3"')
  })

  it('shows loaded anime targets in the media form', () => {
    const markup = renderModal('medien')

    expect(markup).toContain('report-form-media')
    expect(markup).toContain('Naruto')
    expect(markup).toContain('value="3"')
  })

  it('keeps a prefilled contribution target selectable in the error form', () => {
    const markup = renderToStaticMarkup(
      <ReportModal
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        prefillType="fehler"
        prefillContributionId={77}
        targetOptions={[]}
      />,
    )

    expect(markup).toContain('Hinweis #77')
    expect(markup).toContain('value="77"')
  })

  it('falls back to a numeric target input when no known targets exist', () => {
    const markup = renderModal('story', [])

    expect(markup).toContain('type="number"')
    expect(markup).toContain('Ziel-ID manuell eingeben')
  })

  it('resets the contribution sub-form after a successful submit', async () => {
    apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [{ id: 3, title: 'Naruto' }] })
    apiMocks.createContributionProposal.mockResolvedValue(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <ReportModal
        open
        onClose={onClose}
        onSuccess={onSuccess}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Ich war in einem Projekt dabei/ }))
    fireEvent.click(screen.getByRole('button', { name: /Projekt insgesamt/ }))
    fireEvent.change(screen.getByLabelText(/Welche Gruppe soll prüfen/), { target: { value: '19' } })

    await waitFor(() => {
      expect(apiMocks.getAdminFansubAnime).toHaveBeenCalledWith(88)
    })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Naruto' })).not.toBeNull()
    })

    fireEvent.change(screen.getByLabelText(/Bei welchem Anime\/Projekt/), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /Übersetzung/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Hinweis senden$/ }))

    await waitFor(() => {
      expect(apiMocks.createContributionProposal).toHaveBeenCalledWith({
        fansub_group_id: 88,
        anime_id: 3,
        fansub_group_member_id: 19,
        role_codes: ['translator'],
        note: null,
        started_year: null,
        ended_year: null,
      })
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Ich war in diesem Projekt dabei')).toBeNull()
  })
})
