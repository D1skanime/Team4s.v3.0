// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReleaseNavigation } from './ReleaseNavigation'

afterEach(cleanup)

describe('ReleaseNavigation', () => {
  it('preserves canonical group context and omits a missing edge', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} canonicalProjectPath="/fansubs/c-subs/fansubprojekt/vipers-creed" previous={null} next={{ release_version_id: 88, episode_number: '8', episode_title: null, version: '2', group_id: 99 }} />)
    expect(screen.getByRole('link', { name: /Nächster Release/ }).getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/vipers-creed/releases/88')
    expect(screen.queryByText(/Vorheriger Release/)).toBeNull()
  })

  it('retains the technical compatibility href without canonical context', () => {
    render(<ReleaseNavigation animeID={9} groupID={4} previous={null} next={{ release_version_id: 88, episode_number: '8', episode_title: null, version: '2', group_id: 4 }} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/anime/9/group/4/releases/88')
  })
})
