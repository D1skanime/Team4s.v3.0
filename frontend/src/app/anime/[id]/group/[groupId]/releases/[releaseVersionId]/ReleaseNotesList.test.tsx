// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { formatReleaseNoteDate, ReleaseNotesList, selectInitialReleaseNotes } from './ReleaseNotesList'

afterEach(cleanup)

describe('ReleaseNotesList', () => {
  it('shows one initial note per source group before filling to three', () => {
    const notes = [
      {id:1,fansub_group_id:1,member_id:1,member_name:'A',member_avatar_url:null,role_label:'Timing',body_html:'<p>A</p>',created_at:'2026-01-01'},
      {id:2,fansub_group_id:1,member_id:2,member_name:'B',member_avatar_url:null,role_label:'Timing',body_html:'<p>B</p>',created_at:'2026-01-02'},
      {id:3,fansub_group_id:2,member_id:3,member_name:'C',member_avatar_url:null,role_label:'Karaoke',body_html:'<p>C</p>',created_at:'2026-01-03'},
      {id:4,fansub_group_id:null,member_id:4,member_name:'D',member_avatar_url:null,role_label:'Editing',body_html:'<p>D</p>',created_at:'2026-01-04'},
    ]
    expect(selectInitialReleaseNotes(notes).map(note => note.id)).toEqual([1, 3, 4])
  })
  it('groups whole role blocks in the responsive role grid', () => {
    render(<ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={2} initialNotes={[{id:1,member_id:1,member_name:'Anna',member_avatar_url:null,role_label:'Übersetzung',body_html:'<p>Text A</p>',created_at:'2026-01-02'},{id:2,member_id:2,member_name:'Mika',member_avatar_url:null,role_label:'Karaoke',body_html:'<p>Text B</p>',created_at:'2026-01-03'}]} />)
    const grid = document.querySelector('[data-role-grid="responsive"]')
    expect(grid?.children).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Übersetzung' }).closest('section')?.parentElement).toBe(grid)
  })

  it('hydrates the timezone-sensitive German date without a mismatch', async () => {
    const timestamp = '2026-07-06T22:30:00.000Z'
    const notes = [{id:3,member_id:3,member_name:'Sheppert',member_avatar_url:null,role_label:'Timing',body_html:'<p>Grenzfall</p>',created_at:timestamp}]
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
