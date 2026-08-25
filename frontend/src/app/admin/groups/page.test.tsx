// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/auth/PlatformAdminGate', () => ({
  PlatformAdminGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./AdminGroupsClient', () => ({
  AdminGroupsClient: () => <div>Gruppen-Rechteansicht</div>,
}))

import AdminGroupsPage from './page'

describe('AdminGroupsPage', () => {
  it('rendert die neue Gruppen-Rechtefläche unter dem Admin-Gate', () => {
    render(<AdminGroupsPage />)

    expect(screen.getByText('Gruppen-Rechteansicht')).not.toBeNull()
  })
})
