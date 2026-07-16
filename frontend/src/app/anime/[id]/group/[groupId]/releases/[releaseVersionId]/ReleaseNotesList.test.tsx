// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReleaseNotesList } from './ReleaseNotesList'
afterEach(cleanup)

describe('ReleaseNotesList', () => {
  it('groups whole role blocks in the responsive role grid', () => {
    render(<ReleaseNotesList animeID={1} groupID={2} releaseVersionID={3} totalCount={2} initialNotes={[{id:1,member_id:1,member_name:'Anna',member_avatar_url:null,role_label:'Übersetzung',body_html:'<p>Text A</p>',created_at:'2026-01-02'},{id:2,member_id:2,member_name:'Mika',member_avatar_url:null,role_label:'Karaoke',body_html:'<p>Text B</p>',created_at:'2026-01-03'}]} />)
    const grid = document.querySelector('[data-role-grid="responsive"]')
    expect(grid?.children).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Übersetzung' }).closest('section')?.parentElement).toBe(grid)
    expect(screen.getByText('Anna')).toBeTruthy()
  })
})
