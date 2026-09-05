// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import { formatReleaseNoteDate, ReleaseNotesList, selectInitialReleaseNotes } from './ReleaseNotesList'

afterEach(cleanup)

describe('ReleaseNotesList', () => {
  it('shows one initial note per source group before filling to three', () => {
    const notes = [
      {id:1,fansub_group_id:1,member_id:1,member_name:'A',member_avatar_url:null,role_label:'Timing',role_code:'timer',role_color_key:'#0f766e',body_html:'<p>A</p>',created_at:'2026-01-01'},
      {id:2,fansub_group_id:1,member_id:2,member_name:'B',member_avatar_url:null,role_label:'Timing',role_code:'timer',role_color_key:'#0f766e',body_html:'<p>B</p>',created_at:'2026-01-02'},
      {id:3,fansub_group_id:2,member_id:3,member_name:'C',member_avatar_url:null,role_label:'Karaoke',role_code:'karaoke_fx',role_color_key:'#0f766e',body_html:'<p>C</p>',created_at:'2026-01-03'},
      {id:4,fansub_group_id:null,member_id:4,member_name:'D',member_avatar_url:null,role_label:'Editing',role_code:'editor',role_color_key:'#0f766e',body_html:'<p>D</p>',created_at:'2026-01-04'},
    ]
    expect(selectInitialReleaseNotes(notes).map(note => note.id)).toEqual([1, 3, 4])
  })

  it('progressively discloses eight texts instead of rendering eight full cards initially', () => {
    const loadNotes = vi.spyOn(api, 'getGroupReleaseNotes')
    const notes = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      fansub_group_id: 2,
      member_id: index + 1,
      member_name: `Mitglied ${index + 1}`,
      member_avatar_url: null,
      role_label: 'Timing',
      role_code:'timer',role_color_key:'#0f766e',
      body_html: `<p>Teamtext ${index + 1}</p>`,
      created_at: '2026-01-01',
    }))

    render(<ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={8} initialNotes={notes} />)

    expect(screen.getByRole('heading', { name: 'Stimmen aus dem Team' })).toBeTruthy()
    expect(screen.queryByText('8 Texte, nach Rollen geordnet')).toBeNull()
    expect(screen.getAllByText(/Teamtext \d/)).toHaveLength(3)
    expect(screen.queryByText('Teamtext 4')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 5 Texte anzeigen' }))
    expect(screen.getAllByText(/Teamtext \d/)).toHaveLength(8)
    expect(loadNotes).not.toHaveBeenCalled()
    loadNotes.mockRestore()
  })

  it('groups whole role blocks in the responsive role grid', () => {
    render(<ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={2} initialNotes={[{id:1,member_id:1,member_name:'Anna',member_avatar_url:null,role_label:'Übersetzung',role_code:'translator',role_color_key:'#0f766e',body_html:'<p>Text A</p>',created_at:'2026-01-02'},{id:2,member_id:2,member_name:'Mika',member_avatar_url:null,role_label:'Karaoke',role_code:'karaoke_fx',role_color_key:'#0f766e',body_html:'<p>Text B</p>',created_at:'2026-01-03'}]} />)
    const grid = document.querySelector('[data-role-grid="responsive"]')
    expect(grid?.children).toHaveLength(2)
    // Rollen-Bucket-Header entfernt: Rolle steht nur noch in der Karten-Meta, nicht als Heading.
    expect(screen.queryByRole('heading', { name: 'Übersetzung' })).toBeNull()
    expect(screen.getByText(/Übersetzung/)).toBeTruthy()
  })

  it('keeps non-empty source groups bucketed by release role', () => {
    render(<ReleaseNotesList
      animeID={1}
      groupID={2}
      releaseVersionID={3}
      totalCount={2}
      groups={[{ id: 2, slug: 'c-subs', name: 'C-Subs', logo_url: null }, { id: 3, slug: 'd-subs', name: 'D-Subs', logo_url: null }]}
      initialNotes={[
        { id: 11, fansub_group_id: 2, member_id: 1, member_name: 'Anna', member_avatar_url: null, role_label:'Übersetzung',role_code:'translator',role_color_key:'#0f766e', body_html: '<p>Text A</p>', created_at: '2026-01-02' },
        { id: 12, fansub_group_id: 3, member_id: 2, member_name: 'Mika', member_avatar_url: null, role_label:'Karaoke',role_code:'karaoke_fx',role_color_key:'#0f766e', body_html: '<p>Text B</p>', created_at: '2026-01-03' },
      ]}
    />)

    expect(screen.getByText(/Übersetzung/)).toBeTruthy()
    expect(screen.getByText(/Karaoke/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'C-Subs' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'D-Subs' })).toBeNull()
    expect(screen.queryByText('Herkunftsgruppe')).toBeNull()
    expect(screen.getByText(/C-Subs/)).toBeTruthy()
    expect(screen.getByText(/D-Subs/)).toBeTruthy()
  })

  it('expands only the selected stable note ID and preserves it across a cursor merge', async () => {
    const longAnnaText = `Annas langer Text ${'mit weiteren Details '.repeat(24)}`
    const longMikaText = `Mikas langer Text ${'mit weiteren Details '.repeat(24)}`
    vi.spyOn(api, 'getGroupReleaseNotes').mockResolvedValue({
      items: [{ id: 23, fansub_group_id: 2, member_id: 3, member_name: 'Noah', member_avatar_url: null, role_label:'Timing',role_code:'timer',role_color_key:'#0f766e', body_html: '<p>Cursor-Text</p>', created_at: '2026-01-04' }],
      next_cursor: null,
      has_more: false,
    })
    render(<ReleaseNotesList
      animeID={1}
      groupID={2}
      releaseVersionID={3}
      totalCount={3}
      initialNotes={[
        { id: 21, fansub_group_id: 2, member_id: 1, member_name: 'Anna', member_avatar_url: null, role_label:'Übersetzung',role_code:'translator',role_color_key:'#0f766e', body_html: `<p>${longAnnaText}</p>`, created_at: '2026-01-02' },
        { id: 22, fansub_group_id: 2, member_id: 2, member_name: 'Mika', member_avatar_url: null, role_label:'Karaoke',role_code:'karaoke_fx',role_color_key:'#0f766e', body_html: `<p>${longMikaText}</p>`, created_at: '2026-01-03' },
      ]}
    />)

    const annaCard = screen.getByText(/Annas langer Text/).closest('section') as HTMLElement
    const mikaCard = screen.getByText(/Mikas langer Text/).closest('section') as HTMLElement
    const annaToggle = within(annaCard).getByRole('button', { name: 'Weiterlesen' })
    expect(annaToggle.getAttribute('aria-expanded')).toBe('false')
    expect(annaToggle.getAttribute('aria-controls')).toBe('release-note-body-21')
    fireEvent.click(annaToggle)
    expect(within(annaCard).getByRole('button', { name: 'Weniger anzeigen' }).getAttribute('aria-expanded')).toBe('true')
    expect(within(mikaCard).getByRole('button', { name: 'Weiterlesen' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Weitere 1 Texte anzeigen/ }))
    await waitFor(() => expect(screen.getByText('Cursor-Text')).toBeTruthy())
    expect(within(screen.getByText(/Annas langer Text/).closest('section') as HTMLElement).getByRole('button', { name: 'Weniger anzeigen' })).toBeTruthy()
    expect(api.getGroupReleaseNotes).toHaveBeenCalledWith(1, 2, 3, { cursor: undefined, limit: 20 })
  })

  it('keeps existing notes visible when cursor loading fails', async () => {
    vi.spyOn(api, 'getGroupReleaseNotes').mockRejectedValue(new Error('offline'))
    render(<ReleaseNotesList
      animeID={1}
      groupID={2}
      releaseVersionID={3}
      totalCount={2}
      initialNotes={[{ id: 31, member_id: 1, member_name: 'Anna', member_avatar_url: null, role_label:'Übersetzung',role_code:'translator',role_color_key:'#0f766e', body_html: '<p>Bestehender Text</p>', created_at: '2026-01-02' }]}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Weitere 1 Texte anzeigen/ }))
    await waitFor(() => expect(screen.getByText('Weitere Texte konnten nicht geladen werden. Bitte versuche es erneut.')).toBeTruthy())
    expect(screen.getByText('Bestehender Text')).toBeTruthy()
  })

  it('hydrates the timezone-sensitive German date without a mismatch', async () => {
    const timestamp = '2026-07-06T22:30:00.000Z'
    const notes = [{id:3,member_id:3,member_name:'Sheppert',member_avatar_url:null,role_label:'Timing',role_code:'timer',role_color_key:'#0f766e',body_html:'<p>Grenzfall</p>',created_at:timestamp}]
    const previousTZ = process.env.TZ
    process.env.TZ = 'UTC'
    const serverHTML = renderToString(<ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={1} initialNotes={notes} />)
    expect(serverHTML).toContain('6. Juli 2026')

    process.env.TZ = 'Pacific/Kiritimati'
    const container = document.createElement('div')
    container.innerHTML = serverHTML
    document.body.appendChild(container)
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { errors.push(args) }
    let root: ReturnType<typeof hydrateRoot> | null = null
    try {
      await act(async () => {
        root = hydrateRoot(container, <ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={1} initialNotes={notes} />)
        await Promise.resolve()
      })
      expect(container.textContent).toContain('6. Juli 2026')
      expect(errors.filter((args) => args.some((arg) => String(arg).toLowerCase().includes('hydration')))).toEqual([])
      expect(formatReleaseNoteDate(timestamp)).toBe('6. Juli 2026')
    } finally {
      console.error = originalError
      if (root) await act(async () => root?.unmount())
      container.remove()
      process.env.TZ = previousTZ
    }
  })
})
