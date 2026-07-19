// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ContributorsRow } from './ContributorsRow'

afterEach(cleanup)

describe('ContributorsRow', () => {
  it('aggregates one release card per group and member with unique roles', () => {
    render(<ContributorsRow contributors={[
      { fansub_group_id: 4, member_id: 1, name: 'Mika', role_label: 'Karaoke', avatar_url: null },
      { fansub_group_id: 4, member_id: 1, name: 'Mika', role_label: 'Karaoke', avatar_url: null },
      { fansub_group_id: 4, member_id: 1, name: 'Mika', role_label: 'Typesetting', avatar_url: null },
      { fansub_group_id: 5, member_id: 1, name: 'Mika', role_label: 'Timing', avatar_url: null },
    ]} />)

    expect(screen.getAllByText('Mika')).toHaveLength(2)
    expect(screen.getAllByText('Karaoke')).toHaveLength(1)
    expect(screen.getAllByText('Typesetting')).toHaveLength(1)
    expect(screen.getAllByText('Timing')).toHaveLength(1)
    expect(document.querySelectorAll('article')).toHaveLength(2)
  })

  it('uses only supplied release contributors and omits an empty section', () => {
    const { rerender } = render(<ContributorsRow contributors={[
      { fansub_group_id: 4, member_id: 1, name: 'Mika', role_label: 'Karaoke', avatar_url: null },
    ]} />)
    expect(screen.getByText('Mika')).toBeTruthy()
    expect(screen.queryByText('Projektmitglieder')).toBeNull()
    rerender(<ContributorsRow contributors={[]} />)
    expect(screen.queryByRole('heading', { name: 'An diesem Release beteiligt' })).toBeNull()
  })
})
