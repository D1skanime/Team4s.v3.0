/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getFansubs: vi.fn(),
  listRoleDefinitions: vi.fn(),
  searchArchive: vi.fn(),
}))

vi.mock('@/lib/api', () => apiMocks)
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('@/components/archive/MemberSearchCard', () => ({ MemberSearchCard: () => <div>Mitglied</div> }))

import ArchivPage from './page'

describe('ArchivPage', () => {
  beforeEach(() => {
    apiMocks.getFansubs.mockResolvedValue({ data: [] })
    apiMocks.searchArchive.mockResolvedValue({ data: [], total: 0 })
    apiMocks.listRoleDefinitions.mockImplementation(async (context: string) => context === 'anime_contribution'
      ? [{ code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 45 }]
      : [])
  })

  it('builds role filters from the public context catalogs', async () => {
    render(await ArchivPage({ searchParams: {} }))
    expect(screen.getByRole('option', { name: 'Karaoke-FX' })).toBeDefined()
    expect(apiMocks.listRoleDefinitions).toHaveBeenCalledWith('anime_contribution')
    expect(apiMocks.listRoleDefinitions).toHaveBeenCalledWith('group_history')
  })

  it('shows no static role choices when catalog loading fails', async () => {
    apiMocks.listRoleDefinitions.mockRejectedValue(new Error('offline'))
    render(await ArchivPage({ searchParams: {} }))
    expect(screen.queryByRole('option', { name: 'Übersetzung' })).toBeNull()
    expect(screen.getByText('Rollenfilter konnten nicht geladen werden')).toBeDefined()
  })
})
