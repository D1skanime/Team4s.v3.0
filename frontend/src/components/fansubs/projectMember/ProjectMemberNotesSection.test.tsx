// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberNote } from '@/types/projectMember'
import type { CursorPage } from '@/types/releaseDetail'

const getProjectMemberNotes = vi.fn()
vi.mock('@/lib/api', () => ({
  getProjectMemberNotes: (...args: unknown[]) => getProjectMemberNotes(...args),
}))

import { ProjectMemberNoteCard } from './ProjectMemberNoteCard'
import { ProjectMemberNotesSection } from './ProjectMemberNotesSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const note = (overrides: Partial<ProjectMemberNote> = {}): ProjectMemberNote => ({
  id: 1,
  title: null,
  body_html: '',
  body_text: 'kurz',
  role_label: 'Qualitätsprüfung',
  role_code: 'quality_checker',
  episode_label: '08',
  release_version_label: 'v1',
  release_version_id: 41,
  created_at: '2024-04-12T00:00:00Z',
  ...overrides,
})

const page = (
  items: ProjectMemberNote[],
  next: string | null,
  more: boolean,
): CursorPage<ProjectMemberNote> => ({ items, next_cursor: next, has_more: more })

describe('ProjectMemberNoteCard', () => {
  it('shows the role as heading, the episode line and the release link', () => {
    render(
      <ProjectMemberNoteCard
        note={note()}
        projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
      />,
    )
    expect(screen.getByText('Qualitätsprüfung')).not.toBeNull()
    expect(screen.getByText('Notiz zu Folge 08')).not.toBeNull()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/vipers-creed/releases/41',
    )
  })

  it('toggles Mehr/Weniger anzeigen for long text', () => {
    render(<ProjectMemberNoteCard note={note({ body_text: 'x'.repeat(300) })} projectPath="/p" />)
    fireEvent.click(screen.getByText('Mehr anzeigen'))
    expect(screen.getByText('Weniger anzeigen')).not.toBeNull()
  })

  it('renders the optional title when present', () => {
    render(<ProjectMemberNoteCard note={note({ title: 'Ending-Timing' })} projectPath="/p" />)
    expect(screen.getByText('Ending-Timing')).not.toBeNull()
  })
})

describe('ProjectMemberNotesSection', () => {
  it('loads the initial page and appends more without duplicates', async () => {
    const first = Array.from({ length: 15 }, (_, i) => note({ id: i + 1 }))
    // Zweiter Block enthält absichtlich id 15 erneut (Cursor-Overlap) + 9 neue -> Dedup.
    const second = Array.from({ length: 10 }, (_, i) => note({ id: i + 15 }))
    getProjectMemberNotes
      .mockResolvedValueOnce(page(first, 'c1', true))
      .mockResolvedValueOnce(page(second, null, false))

    render(
      <ProjectMemberNotesSection
        animeID={10}
        groupID={20}
        memberSlug="csubs-leader"
        projectPath="/p"
        count={24}
      />,
    )

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(15))
    fireEvent.click(screen.getByText('Weitere Beiträge laden'))
    // 15 + 10 - 1 Duplikat (id 15) = 24
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(24))
  })
})
