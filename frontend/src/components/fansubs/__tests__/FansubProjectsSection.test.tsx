import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubProjectsSection } from '../FansubProjectsSection'
import type { PublicFansubProject } from '@/types/fansub'

const project: PublicFansubProject = {
  id: 123,
  title: 'Projekt Anime',
  type: 'TV',
  status: 'ongoing',
  year: 2012,
}

describe('FansubProjectsSection', () => {
  it('Projektkarten verlinken auf /anime/[id]/group/[groupId]', () => {
    const html = renderToStaticMarkup(<FansubProjectsSection projects={[project]} groupId={77} />)

    expect(html).toContain('/anime/123/group/77')
    expect(html).not.toContain('href="/anime/123"')
  })

  it('rendert keinen Abschnitt wenn keine Projekte geliefert werden', () => {
    const html = renderToStaticMarkup(<FansubProjectsSection projects={[]} groupId={77} />)

    expect(html).toBe('')
  })
})
