// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { DefaultCrewEntry, UnifiedGroupMember } from '@/types/fansub'

const applyDefaultCrewMock = vi.fn()
const listDefaultCrewMock = vi.fn()
const upsertDefaultCrewEntryMock = vi.fn()
const deleteDefaultCrewEntryMock = vi.fn()

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
  applyDefaultCrew: (...args: unknown[]) => applyDefaultCrewMock(...args),
  listDefaultCrew: (...args: unknown[]) => listDefaultCrewMock(...args),
  upsertDefaultCrewEntry: (...args: unknown[]) => upsertDefaultCrewEntryMock(...args),
  deleteDefaultCrewEntry: (...args: unknown[]) => deleteDefaultCrewEntryMock(...args),
}))

import { DefaultCrewManager } from './DefaultCrewManager'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const TEST_MEMBERS: UnifiedGroupMember[] = [
  {
    member_id: 1,
    display_name: 'Alice',
    source: 'app',
    has_app_account: true,
    group_roles: ['translator'],
  },
]

const TEST_CREW_ENTRY: DefaultCrewEntry = {
  id: 1,
  fansub_group_id: 5,
  member_id: 1,
  role_code: 'translator',
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('DefaultCrewManager', () => {
  it('zeigt EmptyState wenn keine Crew konfiguriert ist', async () => {
    listDefaultCrewMock.mockResolvedValue([])

    render(<DefaultCrewManager fansubId={5} members={TEST_MEMBERS} />)

    expect(await screen.findByText('Noch kein Standard-Team konfiguriert')).not.toBeNull()
  })

  it('zeigt "Standard-Team übernehmen"-Button', async () => {
    listDefaultCrewMock.mockResolvedValue([])

    render(<DefaultCrewManager fansubId={5} members={TEST_MEMBERS} />)

    await screen.findByText('Noch kein Standard-Team konfiguriert')
    const btn = screen.getByRole('button', { name: 'Standard-Team übernehmen' })
    expect(btn).not.toBeNull()
    // Button ist deaktiviert wenn keine Crew vorhanden (D-04: kein toter Button — deaktiviert ≠ tot)
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('ruft applyDefaultCrew auf und zeigt Ergebnis-Feedback nach Klick', async () => {
    listDefaultCrewMock.mockResolvedValue([TEST_CREW_ENTRY])
    applyDefaultCrewMock.mockResolvedValue({ applied_count: 2 })

    render(<DefaultCrewManager fansubId={5} members={TEST_MEMBERS} />)

    const btn = await screen.findByRole('button', { name: 'Standard-Team übernehmen' })
    expect((btn as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(btn)

    await waitFor(() => {
      expect(applyDefaultCrewMock).toHaveBeenCalledWith(5)
      expect(screen.getByText('2 Contributions angelegt.')).not.toBeNull()
    })
  })

  it('zeigt Crew-Einträge nach dem Laden', async () => {
    listDefaultCrewMock.mockResolvedValue([TEST_CREW_ENTRY])

    render(<DefaultCrewManager fansubId={5} members={TEST_MEMBERS} />)

    expect(await screen.findByText('Alice')).not.toBeNull()
  })
})
