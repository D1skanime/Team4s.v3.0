// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { boundedColorKey } from '@/lib/roleCatalog'
import type { ProjectMemberNote } from '@/types/projectMember'
import type { CursorPage } from '@/types/releaseDetail'

const getProjectMemberNotes = vi.fn()
vi.mock('@/lib/api', () => ({
  getProjectMemberNotes: (...args: unknown[]) => getProjectMemberNotes(...args),
}))

import { ProjectMemberNoteEntry } from './ProjectMemberNoteEntry'
import { ProjectMemberNotesSection } from './ProjectMemberNotesSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const note = (overrides: Partial<ProjectMemberNote> = {}): ProjectMemberNote => ({
  id: 1,
  title: null,
  body_html: '',
  body_text: 'kurz',
  role_label: 'Qualitätsprüfung',
  role_code: 'quality_checker',
  role_color_key: '#6b7f2a',
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

// GAP-01-Matrix-Punkt "Contribution ohne Zielroute" (157-UAT.md) hat KEINEN entsprechenden
// Codepfad: `ProjectMemberNote.release_version_id` ist laut `frontend/src/types/projectMember.ts`
// ein nicht-nullbares `number`-Feld. Es gibt keine href-lose Variante zu testen, ohne eine
// optionale/nullbare Prop zu erfinden -- das ist bewusst NICHT Teil dieses Gap-Closure-Plans
// (Backend-/Datenmodell-Beobachtung, dokumentiert in 157-10-SUMMARY.md, nicht hier umgesetzt).
describe('ProjectMemberNoteEntry', () => {
  it('hides the role name but keeps the release link when hasMultipleRoles is false (single-role member)', () => {
    render(
      <ProjectMemberNoteEntry
        note={note()}
        projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.queryByText('Qualitätsprüfung')).toBeNull()
    expect(screen.queryByText('Notiz zu Folge 08')).toBeNull()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/vipers-creed/releases/41',
    )
    // P157-13: role COLOR remains mandatory even though the role NAME is hidden.
    expect(link.getAttribute('data-color-key')).toBe(boundedColorKey('#6b7f2a'))
  })

  it('shows the role name chip when hasMultipleRoles is true, with the identical role color as the single-role case', () => {
    render(
      <ProjectMemberNoteEntry
        note={note()}
        projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
        hasMultipleRoles
      />,
    )
    expect(screen.getByText('Qualitätsprüfung')).not.toBeNull()
    const link = screen.getByRole('link')
    expect(link.getAttribute('data-color-key')).toBe(boundedColorKey('#6b7f2a'))
  })

  it('toggles Mehr/Weniger anzeigen for overflowing text', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(240)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(106)
    render(
      <ProjectMemberNoteEntry
        note={note({ body_text: 'x'.repeat(300) })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    fireEvent.click(screen.getByText('Mehr anzeigen'))
    expect(screen.getByText('Weniger anzeigen')).not.toBeNull()
    fireEvent.click(screen.getByText('Weniger anzeigen'))
    expect(screen.getByRole('button', { name: 'Mehr anzeigen' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('allows a short multi-paragraph body to expand when its rendered height exceeds the preview', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(106)
    render(<ProjectMemberNoteEntry note={note({ body_text: 'Eins Zwei Drei Vier Fünf', body_html: '<p>Eins</p><p>Zwei</p><p>Drei</p><p>Vier</p><p>Fünf</p>' })} projectPath="/p" hasMultipleRoles={false} />)
    expect(screen.getByRole('button', { name: 'Mehr anzeigen' })).toBeTruthy()
    expect(screen.getByText('Fünf')).toBeTruthy()
  })

  it('does not show a redundant expand control for text that fits on a wider screen', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(53)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(53)
    render(<ProjectMemberNoteEntry note={note({ body_text: 'Wort '.repeat(50) })} projectPath="/p" hasMultipleRoles={false} />)
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).toBeNull()
  })

  it('rechecks the preview after a width change and keeps collapse available while expanded', () => {
    const height = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(80)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(106)
    render(<ProjectMemberNoteEntry note={note({ body_text: 'Ein Text mit Umbrüchen.' })} projectPath="/p" hasMultipleRoles={false} />)
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).toBeNull()
    height.mockReturnValue(160)
    fireEvent(window, new Event('resize'))
    fireEvent.click(screen.getByRole('button', { name: 'Mehr anzeigen' }))
    height.mockReturnValue(80)
    fireEvent(window, new Event('resize'))
    fireEvent.click(screen.getByRole('button', { name: 'Weniger anzeigen' }))
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).toBeNull()
  })

  it('renders the optional title when present', () => {
    render(
      <ProjectMemberNoteEntry
        note={note({ title: 'Ending-Timing' })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.getByText('Ending-Timing')).not.toBeNull()
  })

  // Nachtrag 2 (2026-09-12, 157-CONTEXT.md "Pflicht-Acceptance-Test"): a mixed-role list must
  // never let one entry's colour leak from page/summary context onto another entry — each row's
  // data-color-key must trace back to ITS OWN note.role_color_key.
  it('P157-13 Nachtrag 2: a mixed-role list keeps each entry\'s own role color distinct and shows both role-name chips, without reintroducing a large role header', () => {
    const typesetterNote = note({
      id: 101,
      role_label: 'Typesetting',
      role_code: 'typesetter',
      role_color_key: '#7b3c4e',
      release_version_id: 41,
    })
    const translatorNote = note({
      id: 102,
      role_label: 'Übersetzung',
      role_code: 'translator',
      role_color_key: '#27664f',
      release_version_id: 42,
    })

    render(
      <div>
        <ProjectMemberNoteEntry note={typesetterNote} projectPath="/p" hasMultipleRoles />
        <ProjectMemberNoteEntry note={translatorNote} projectPath="/p" hasMultipleRoles />
      </div>,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    // Distinct colors, each traced to its OWN note's role_color_key — not a shared/page value.
    expect(links[0].getAttribute('data-color-key')).toBe(boundedColorKey('#7b3c4e'))
    expect(links[1].getAttribute('data-color-key')).toBe(boundedColorKey('#27664f'))
    expect(links[0].getAttribute('data-color-key')).not.toBe(links[1].getAttribute('data-color-key'))

    // Both entries show their small role-name chip, because hasMultipleRoles is true.
    expect(screen.getByText('Typesetting')).not.toBeNull()
    expect(screen.getByText('Übersetzung')).not.toBeNull()

    // No large, fully-colored role header appears — the role name is never rendered as a heading.
    expect(screen.queryByRole('heading', { name: 'Typesetting' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Übersetzung' })).toBeNull()
    expect(screen.queryByText('Notiz zu Folge')).toBeNull()
  })

  it('renders no nested interactive markup even when the body contains a link', () => {
    const { container } = render(
      <ProjectMemberNoteEntry
        note={note({
          body_html: '<p>Text mit <a href="https://example.com">Link</a></p>',
          body_text: 'Text mit Link',
        })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    const anchors = container.querySelectorAll('a')
    anchors.forEach((anchor) => {
      expect(anchor.querySelector('a, button')).toBeNull()
    })
    expect(container.querySelectorAll('a button').length).toBe(0)
    expect(container.querySelectorAll('a a').length).toBe(0)
  })

  it('keeps the body link independently clickable and does not trigger navigation through it', () => {
    render(
      <ProjectMemberNoteEntry
        note={note({
          body_html: '<p>Text mit <a href="https://example.com">Link</a></p>',
          body_text: 'Text mit Link',
        })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    const bodyLink = screen.getByRole('link', { name: 'Link' })
    const entryLink = screen.getByRole('link', { name: /Beitrag ansehen/ })
    expect(bodyLink).not.toBe(entryLink)
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('renders a very short entry compactly', () => {
    render(
      <ProjectMemberNoteEntry
        note={note({ body_text: 'kurz zehn.' })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.getByRole('article').getAttribute('data-compact')).toBe('true')
  })

  it('renders a very long entry without the compact flag', () => {
    render(
      <ProjectMemberNoteEntry
        note={note({ body_text: 'x'.repeat(500) })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.getByRole('article').getAttribute('data-compact')).toBeNull()
  })

  it('shows no expand control exactly at the clamp boundary', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(79)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(79)
    render(
      <ProjectMemberNoteEntry
        note={note({ body_text: 'x'.repeat(200) })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Mehr anzeigen' })).toBeNull()
  })

  it('shows the expand control one pixel past the clamp boundary', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(80)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(79)
    render(
      <ProjectMemberNoteEntry
        note={note({ body_text: 'x'.repeat(200) })}
        projectPath="/p"
        hasMultipleRoles={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Mehr anzeigen' })).not.toBeNull()
  })

  it('renders multiple entries in sequence with independent expand/collapse state', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(79)
    render(
      <div>
        <ProjectMemberNoteEntry
          note={note({ id: 201, body_text: 'x'.repeat(200) })}
          projectPath="/p"
          hasMultipleRoles={false}
        />
        <ProjectMemberNoteEntry
          note={note({ id: 202, body_text: 'y'.repeat(200) })}
          projectPath="/p"
          hasMultipleRoles={false}
        />
      </div>,
    )
    const toggles = screen.getAllByRole('button', { name: 'Mehr anzeigen' })
    expect(toggles).toHaveLength(2)
    fireEvent.click(toggles[0])
    const expandedToggles = screen
      .getAllByRole('button')
      .filter((toggle) => toggle.getAttribute('aria-expanded') === 'true')
    expect(expandedToggles).toHaveLength(1)
  })

  it('supports keyboard activation of the whole-card link', () => {
    render(<ProjectMemberNoteEntry note={note()} projectPath="/p" hasMultipleRoles={false} />)
    const entryLink = screen.getByRole('link', { name: /Beitrag ansehen/ })
    entryLink.focus()
    expect(document.activeElement).toBe(entryLink)
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
        hasMultipleRoles={false}
      />,
    )

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(15))
    // 24 total, 15 shown -> next batch is min(PAGE_LIMIT=10, 24-15=9) = 9.
    fireEvent.click(screen.getByText('Weitere 9 Beiträge anzeigen'))
    // 15 + 10 - 1 Duplikat (id 15) = 24
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(24))
  })

  it('renders the section header through the global SectionHeader primitive with underline (V2, 157-UAT GAP-02)', async () => {
    getProjectMemberNotes.mockResolvedValueOnce(page([note()], null, false))

    const { container } = render(
      <ProjectMemberNotesSection
        animeID={10}
        groupID={20}
        memberSlug="csubs-leader"
        projectPath="/p"
        count={1}
        hasMultipleRoles={false}
      />,
    )

    await screen.findByRole('heading', { name: 'Texte & Notizen' })
    expect(container.querySelector('[class*="sectionHeaderUnderline"]')).not.toBeNull()
  })

  it('renders no redundant "Alle N angezeigt" pager text once every contribution is loaded (V5, 157-UAT GAP-02)', async () => {
    const items = Array.from({ length: 3 }, (_, i) => note({ id: i + 1 }))
    getProjectMemberNotes.mockResolvedValueOnce(page(items, null, false))

    render(
      <ProjectMemberNotesSection
        animeID={10}
        groupID={20}
        memberSlug="csubs-leader"
        projectPath="/p"
        count={3}
        hasMultipleRoles={false}
      />,
    )

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3))
    expect(screen.queryByText(/Alle \d+ angezeigt/)).toBeNull()
  })
})
