// @vitest-environment jsdom
//
// 191-09: useFansubGroupHintsListFilters synchronisiert status/fansub_group_id/from/to/offset
// über die URL — analog zu useDiscoveryLibraryFilters.test.ts's URL-Rundreise-Tests. Zusätzlich
// beweist dieser Test explizit, dass die zurückgegebene Params-Form KEIN `app_user_id`- und KEIN
// `claim_type`-Feld enthält (191-UI-SPEC.md Component Contract C3: diese Liste hat keinen
// Benutzer-ID-Filter und kein Claim-Typ-Konzept, jede Zeile IST bereits eine
// fansub_lead-Anfrage).

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockReplace = vi.hoisted(() => vi.fn())
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const mockUsePathname = vi.hoisted(() => vi.fn(() => '/admin/fansub-group-hints'))
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ replace: mockReplace })))

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}))

import { useFansubGroupHintsListFilters } from './useFansubGroupHintsListFilters'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
})

function lastReplaceCallURL(): string {
  const calls = mockReplace.mock.calls
  return String(calls[calls.length - 1]?.[0] ?? '')
}

describe('useFansubGroupHintsListFilters', () => {
  it('liefert leere/undefined Filterwerte, wenn keine URL-Parameter gesetzt sind', () => {
    const { result } = renderHook(() => useFansubGroupHintsListFilters())
    expect(result.current.params.status).toBeUndefined()
    expect(result.current.params.fansub_group_id).toBeUndefined()
    expect(result.current.params.from).toBeUndefined()
    expect(result.current.params.to).toBeUndefined()
    expect(result.current.params.offset).toBe(0)
  })

  it('die zurückgegebene Params-Form besitzt kein app_user_id- und kein claim_type-Feld', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('status=open&fansub_group_id=5'))
    const { result } = renderHook(() => useFansubGroupHintsListFilters())
    expect('app_user_id' in result.current.params).toBe(false)
    expect('claim_type' in result.current.params).toBe(false)
  })

  it('handleStatusChange schreibt den Status-Parameter und setzt den Offset zurück', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('offset=50'))
    const { result } = renderHook(() => useFansubGroupHintsListFilters())

    act(() => {
      result.current.handleStatusChange('open')
    })

    const url = lastReplaceCallURL()
    expect(url).toContain('status=open')
    expect(url).not.toContain('offset=50')
  })

  it('handleGroupChange schreibt die Zielgruppen-ID', () => {
    const { result } = renderHook(() => useFansubGroupHintsListFilters())

    act(() => {
      result.current.handleGroupChange('7')
    })

    expect(lastReplaceCallURL()).toContain('fansub_group_id=7')
  })

  it('handleDateRangeChange schreibt from/to gemeinsam', () => {
    const { result } = renderHook(() => useFansubGroupHintsListFilters())

    act(() => {
      result.current.handleDateRangeChange('2026-01-01', '2026-01-31')
    })

    const url = lastReplaceCallURL()
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-01-31')
  })

  it('handlePageChange schreibt den Offset OHNE andere Filter zurückzusetzen', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('status=open'))
    const { result } = renderHook(() => useFansubGroupHintsListFilters())

    act(() => {
      result.current.handlePageChange(3)
    })

    const url = lastReplaceCallURL()
    expect(url).toContain('offset=50')
    expect(url).toContain('status=open')
  })

  it('hält die params-Objektreferenz über Re-Renders mit unveränderten URL-Parametern stabil', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('status=open'))
    const { result, rerender } = renderHook(() => useFansubGroupHintsListFilters())
    const first = result.current.params
    rerender()
    const second = result.current.params
    expect(first).toBe(second)
  })
})
