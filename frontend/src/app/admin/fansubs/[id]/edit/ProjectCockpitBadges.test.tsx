// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

import { ProjectCockpitBadges } from './ProjectCockpitBadges'

afterEach(() => {
  cleanup()
})

function makeNote(overrides: Partial<AnimeFansubProjectNote> = {}): AnimeFansubProjectNote {
  return {
    id: 1,
    animeId: 10,
    fansubGroupId: 5,
    title: 'Projekttext',
    bodyMarkdown: 'Text',
    bodyHtml: '<p>Text</p>',
    bodyJson: { type: 'doc', content: [] },
    bodyText: 'Text',
    editorType: 'tiptap',
    contentSchemaVersion: 1,
    visibility: 'internal',
    status: 'draft',
    sortOrder: 0,
    createdByUserId: 1,
    updatedByUserId: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('ProjectCockpitBadges', () => {
  it('zeigt keinen Mitwirkenden-Badge wenn contributionCount=null (noch nicht geladen, D-12)', () => {
    render(<ProjectCockpitBadges contributionCount={null} note={undefined} />)
    expect(screen.queryByText('Mitwirkende fehlen')).toBeNull()
    expect(screen.queryByText(/Mitwirkende \(/)).toBeNull()
  })

  it('zeigt "Mitwirkende fehlen"-Badge (danger) wenn contributionCount=0', () => {
    render(<ProjectCockpitBadges contributionCount={0} note={undefined} />)
    expect(screen.getByText('Mitwirkende fehlen')).not.toBeNull()
    expect(screen.queryByText(/Mitwirkende \(/)).toBeNull()
  })

  it('zeigt "Mitwirkende (N)"-Badge (neutral) wenn contributionCount > 0', () => {
    render(<ProjectCockpitBadges contributionCount={3} note={undefined} />)
    expect(screen.getByText('Mitwirkende (3)')).not.toBeNull()
    expect(screen.queryByText('Mitwirkende fehlen')).toBeNull()
  })

  it('zeigt "Einblick fehlt"-Badge (warning) wenn note=null (geladen, fehlt)', () => {
    render(<ProjectCockpitBadges contributionCount={0} note={null} />)
    expect(screen.getByText('Einblick fehlt')).not.toBeNull()
    expect(screen.queryByText('Einblick vorhanden')).toBeNull()
  })

  it('zeigt "Einblick vorhanden"-Badge (success) wenn note vorhanden', () => {
    render(<ProjectCockpitBadges contributionCount={1} note={makeNote()} />)
    expect(screen.getByText('Einblick vorhanden')).not.toBeNull()
    expect(screen.queryByText('Einblick fehlt')).toBeNull()
  })

  it('zeigt kein Einblick-Badge wenn note=undefined (noch nicht geladen)', () => {
    render(<ProjectCockpitBadges contributionCount={0} note={undefined} />)
    expect(screen.queryByText('Einblick vorhanden')).toBeNull()
    expect(screen.queryByText('Einblick fehlt')).toBeNull()
  })

  // D-12: kein episodeCount-Prop — kein "N Folgen"-Badge
  it('hat kein episodeCount-Prop und rendert daher keinen Folgen-Badge', () => {
    const { container } = render(<ProjectCockpitBadges contributionCount={0} note={undefined} />)
    expect(container.textContent).not.toMatch(/Folgen/)
  })
})
