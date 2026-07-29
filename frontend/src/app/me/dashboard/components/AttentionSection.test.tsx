// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution } from '@/types/contributions'

import { AttentionSection } from './AttentionSection'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

afterEach(() => {
  cleanup()
})

function makeContribution(overrides: Partial<MeAnimeContribution> = {}): MeAnimeContribution {
  return {
    id: 1,
    anime_id: 5,
    anime_title: 'Testanime',
    fansub_group_id: 9,
    fansub_group_member_id: 2,
    status: 'confirmed',
    role_codes: ['translation'],
    started_year: 2026,
    ended_year: null,
    is_public_on_anime_page: true,
    is_public_on_member_profile: true,
    note: null,
    release_version_id: null,
    is_own_proposal: false,
    created_at: '2026-07-28T00:00:00Z',
    ...overrides,
  }
}

describe('AttentionSection (Phase 116, D-02)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-29T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rendert die exakte Empty-State-Copy und keine Cards, wenn contributions leer ist', () => {
    const { container } = render(<AttentionSection contributions={[]} />)

    expect(screen.getByText('Nichts Neues im Moment')).not.toBeNull()
    expect(
      screen.getByText(
        'Du hast in den letzten 14 Tagen keine neuen Projekt- oder Release-Zuweisungen erhalten.',
      ),
    ).not.toBeNull()
    expect(container.querySelectorAll('section[class*="cardInteractive"]')).toHaveLength(0)
  })

  it('sortiert absteigend nach created_at und zeigt die "Neu"-Badge nur innerhalb des 14-Tage-Fensters', () => {
    const oldItem = makeContribution({
      id: 1,
      anime_title: 'Altes Projekt',
      created_at: '2026-06-01T00:00:00Z', // > 14 Tage alt
    })
    const newItem = makeContribution({
      id: 2,
      anime_title: 'Neues Projekt',
      created_at: '2026-07-27T00:00:00Z', // 2 Tage alt
    })

    render(<AttentionSection contributions={[oldItem, newItem]} />)

    const titles = screen.getAllByRole('link').map((link) => link.textContent)
    expect(titles[0]).toContain('Neues Projekt')
    expect(titles[1]).toContain('Altes Projekt')

    const badges = screen.getAllByText('Neu')
    expect(badges).toHaveLength(1)
    expect(badges[0].closest('a')?.textContent).toContain('Neues Projekt')
  })

  it('verlinkt jede Zeile exakt auf resolveWorkspaceHref(item) fuer beide Href-Zweige', () => {
    const withRelease = makeContribution({
      id: 3,
      anime_title: 'Release-Zuweisung',
      release_version_id: 62,
      created_at: '2026-07-28T00:00:00Z',
    })
    const withoutRelease = makeContribution({
      id: 4,
      anime_title: 'Projekt-Zuweisung',
      release_version_id: null,
      anime_id: 5,
      fansub_group_id: 9,
      created_at: '2026-07-20T00:00:00Z',
    })

    render(<AttentionSection contributions={[withRelease, withoutRelease]} />)

    expect(screen.getByRole('link', { name: /Release-Zuweisung/i }).getAttribute('href')).toBe(
      '/me/releases/62/workspace',
    )
    expect(screen.getByRole('link', { name: /Projekt-Zuweisung/i }).getAttribute('href')).toBe(
      '/me/projects/5/group/9',
    )
  })

  it('rendert das dekorative ArrowRight-Icon mit aria-hidden', () => {
    const { container } = render(<AttentionSection contributions={[makeContribution()]} />)

    const icon = container.querySelector('svg[aria-hidden="true"]')
    expect(icon).not.toBeNull()
  })
})
