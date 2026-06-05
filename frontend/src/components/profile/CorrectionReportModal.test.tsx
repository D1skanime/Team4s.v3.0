import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Mocks müssen vor dem Import der Komponente registriert werden
vi.mock('@/lib/api', () => ({
  submitMemberCorrection: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}))

// Modal-Primitive ist 'use client' und clientseitig — für Static-Render-Test direkt einbinden
vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  return {
    ...actual,
  }
})

import { useAuthSession } from '@/lib/useAuthSession'
import { CorrectionReportModal } from './CorrectionReportModal'

const mockUseAuthSession = vi.mocked(useAuthSession)

describe('CorrectionReportModal — Sichtbarkeits-Gate (D-18)', () => {
  it('zeigt den Trigger-Button für eingeloggte User (hasAccessToken=true)', () => {
    mockUseAuthSession.mockReturnValue({
      hasAccessToken: true,
      hasRefreshToken: false,
      authToken: '',
      displayName: 'Testuser',
      isClientInitialized: true,
    })

    const markup = renderToStaticMarkup(
      <CorrectionReportModal memberId={42} memberName="TestMember" />,
    )

    expect(markup).toContain('Korrektur melden')
  })

  it('zeigt den Trigger-Button auch wenn nur hasRefreshToken=true', () => {
    mockUseAuthSession.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: true,
      authToken: '',
      displayName: 'Testuser',
      isClientInitialized: true,
    })

    const markup = renderToStaticMarkup(
      <CorrectionReportModal memberId={42} />,
    )

    expect(markup).toContain('Korrektur melden')
  })

  it('blendet den Trigger-Button für anonyme Besucher aus (hasAccessToken=false, hasRefreshToken=false)', () => {
    mockUseAuthSession.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: false,
      authToken: '',
      displayName: '',
      isClientInitialized: true,
    })

    const markup = renderToStaticMarkup(
      <CorrectionReportModal memberId={42} />,
    )

    // Anonyme Besucher sehen den Trigger nicht
    expect(markup).toBe('')
  })
})
