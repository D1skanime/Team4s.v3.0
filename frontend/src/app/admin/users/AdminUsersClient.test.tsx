// @vitest-environment jsdom
//
// Plan 111-03 (D-06): AdminUsersClient synchronisiert q/status/role über die URL
// (useSearchParams/router.replace) statt über rein lokalen State. Diese Tests prüfen
// den Round-Trip in beide Richtungen (Schreiben bei Filteränderung, Lesen beim Mount).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { AdminUsersClient } from './AdminUsersClient'

const mockPush = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/users'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: mockPush, replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

vi.mock('@/lib/api', () => ({
  listAdminUsersPage: vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, limit: 25, offset: 0 },
  }),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
    }
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

describe('AdminUsersClient — URL filter round-trip (D-06)', () => {
  it('url filter roundtrip — write: Status-Wechsel schreibt status in die URL via router.replace', async () => {
    render(<AdminUsersClient />)

    const statusSelect = await screen.findByLabelText('Accountstatus')
    fireEvent.change(statusSelect, { target: { value: 'disabled' } })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled()
    })

    const calledWith = mockReplace.mock.calls.map((call) => String(call[0])).join(' | ')
    expect(calledWith).toContain('status=disabled')
  })

  it('url filter roundtrip — read: vorbelegte URL-Parameter spiegeln sich in den Select-Werten', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('role=content_admin&status=active'))

    render(<AdminUsersClient />)

    const statusSelect = await screen.findByLabelText('Accountstatus') as HTMLSelectElement
    const roleSelect = screen.getByLabelText('Globale Rolle') as HTMLSelectElement

    expect(statusSelect.value).toBe('active')
    expect(roleSelect.value).toBe('content_admin')
  })
})
