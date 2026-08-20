/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RoleCatalogProvider, type RoleCatalogLoads } from '@/providers/RoleCatalogProvider'
import { MemberSearchCard } from './MemberSearchCard'

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('@/components/profile/VerifiedBadge', () => ({ VerifiedBadge: () => <span>Verifiziert</span> }))

const loads: RoleCatalogLoads = {
  fansub_group: { rows: [], error: null },
  anime_contribution: {
    rows: [{ code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 45 }],
    error: null,
  },
  group_history: { rows: [], error: null },
}

describe('MemberSearchCard', () => {
  it('renders catalog labels and a readable neutral unknown fallback', () => {
    render(
      <RoleCatalogProvider loads={loads}>
        <MemberSearchCard
          id={1}
          nickname="sorata"
          displayName="Sorata"
          slug="sorata"
          avatarPath={null}
          isVerified={false}
          topRoles={['karaoke_fx', 'future_scene_role']}
          groups={['ExampleSubs']}
        />
      </RoleCatalogProvider>,
    )

    expect(screen.getByText('Karaoke-FX')).toBeDefined()
    expect(screen.getByText('Future Scene Role')).toBeDefined()
  })
})
