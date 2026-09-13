// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectMemberSummary } from '@/types/projectMember'
import { ProjectMemberHero } from './ProjectMemberHero'

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: [], error: null }),
}))
afterEach(cleanup)
const summary: ProjectMemberSummary = {
  member_id: 1, member_slug: 'example', member_display_name: 'Example Member',
  member_avatar_url: null, is_verified: true, role_labels: ['Typesetting'],
  counts: { roles: 1, episodes: 13, notes: 12, media: 2 },
}
const props = {
  summary, memberSlug: 'example', groupName: 'Andere Gruppe', animeTitle: 'Anderes Projekt',
  projectPath: '/fansubs/andere/fansubprojekt/anderes',
}

describe('ProjectMemberHero', () => {
  it('places project contribution counts and both actions in the hero without a release count', () => {
    render(<ProjectMemberHero {...props} />)
    const metrics = screen.getByLabelText('Projektbeiträge')
    expect(metrics.textContent).toContain('13 Folgen')
    expect(metrics.textContent).toContain('12 Beiträge')
    expect(metrics.textContent).toContain('2 Medien')
    expect(metrics.textContent).not.toContain('Releases')
    expect(screen.getByRole('link', { name: /Vollständiges Memberprofil/ }).getAttribute('href')).toBe('/members/example')
    expect(screen.getByRole('link', { name: /Zurück zum Projekt/ }).getAttribute('href')).toBe(props.projectPath)
  })
  it('uses the supplied banner before the supplied cover', () => {
    const { container } = render(<ProjectMemberHero {...props} bannerUrl="/media/anime/42/banner.webp" coverImage="/covers/example.jpg" />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('banner.webp')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })
  it('falls back from a broken banner to the cover, then to a neutral surface', () => {
    const { container } = render(<ProjectMemberHero {...props} bannerUrl="/media/anime/42/banner.webp" coverImage="/covers/example.jpg" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('example.jpg')
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Example Member' })).toBeTruthy()
  })
  it('uses the shared cover resolver when there is no banner', () => {
    const { container } = render(<ProjectMemberHero {...props} coverImage="example.jpg" />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain(encodeURIComponent('/covers/example.jpg'))
  })
  it('has no image slot or placeholder without artwork and keeps missing-avatar initials', () => {
    const { container } = render(<ProjectMemberHero {...props} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('EM')).toBeTruthy()
    expect(screen.getByText('Typesetting')).toBeTruthy()
    expect(screen.getByText('Verifiziert')).toBeTruthy()
  })
  it('preserves multiple roles, an existing avatar and the unverified state', () => {
    const { container } = render(<ProjectMemberHero {...props} summary={{...summary, member_avatar_url: '/media/profile/avatar.webp', is_verified: false, role_labels: ['Timing', 'Übersetzung']}} />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('avatar.webp')
    expect(screen.queryByText('Verifiziert')).toBeNull()
    expect(screen.getByText('Timing')).toBeTruthy()
    expect(screen.getByText('Übersetzung')).toBeTruthy()
  })
  it.each([
    [{roles:0,episodes:0,notes:0,media:0}, ['0 Folgen','0 Beiträge','0 Medien']],
    [{roles:1,episodes:1,notes:1,media:1}, ['1 Folge','1 Beitrag','1 Medium']],
    [{roles:1,episodes:12345,notes:123456,media:1234}, ['12.345 Folgen','123.456 Beiträge','1.234 Medien']],
  ])('keeps zero, singular and large counts semantically separate', (counts, labels) => {
    render(<ProjectMemberHero {...props} summary={{...summary,counts}} />)
    const text = screen.getByLabelText('Projektbeiträge').textContent
    for (const label of labels) expect(text).toContain(label)
    expect(text).not.toContain('Release')
  })
})
