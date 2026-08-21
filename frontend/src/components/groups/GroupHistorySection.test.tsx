// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupHistorySection } from './GroupHistorySection'
const api = vi.hoisted(() => ({ listGroupHistory: vi.fn(), createGroupHistory: vi.fn(), updateGroupHistory: vi.fn(), deleteGroupHistory: vi.fn() }))
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), ...api }))
const founding = { id: 1, fansub_group_id: 7, year: 2004, event_type: 'founding', title: 'Gründung', note: null, status: 'confirmed', created_at: '2026-08-21T00:00:00Z', updated_at: '2026-08-21T00:00:00Z' }
const award = { ...founding, id: 2, event_type: 'award', title: 'Auszeichnung' }
describe('GroupHistorySection founding-only mode', () => {
  beforeEach(() => { vi.clearAllMocks(); api.listGroupHistory.mockResolvedValue([founding, award]) })
  it('shows all entries but exposes edit only for founding and never delete', async () => {
    render(<GroupHistorySection fansubGroupId={7} foundedYear={2004} foundingOnly />)
    expect(await screen.findByText('Gründung')).toBeInTheDocument()
    expect(screen.getByText('Auszeichnung')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Eintrag bearbeiten' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Eintrag löschen' })).not.toBeInTheDocument()
  })
  it('locks the founding event type while editing', async () => {
    render(<GroupHistorySection fansubGroupId={7} foundedYear={2004} foundingOnly />)
    await screen.findByText('Gründung')
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag bearbeiten' }))
    expect(screen.getByRole('combobox', { name: /Ereignistyp/i })).toHaveValue('founding')
    expect(screen.getByRole('combobox', { name: /Ereignistyp/i })).toBeDisabled()
  })
})