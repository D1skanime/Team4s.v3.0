// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/me/profile/page', () => ({
  default: () => <main><h1>Mein Profil</h1><p>neutraler Profil-Hub</p></main>,
}))

import AdminProfileTransitionPage from './page'

describe('AdminProfileTransitionPage', () => {
  it('renders the neutral /me/profile implementation as transition wrapper', () => {
    render(<AdminProfileTransitionPage />)

    expect(screen.getByRole('heading', { name: 'Mein Profil' })).not.toBeNull()
    expect(screen.getByText('neutraler Profil-Hub')).not.toBeNull()
    expect(screen.queryByText(/AdminProfilePage/i)).toBeNull()
  })
})
