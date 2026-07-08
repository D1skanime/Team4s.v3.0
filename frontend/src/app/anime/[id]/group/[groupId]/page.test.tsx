import { describe, expect, it } from 'vitest'

import { buildEmptyAreaLabels, hasStoryContent } from './page'

describe('hasStoryContent (AO4-13)', () => {
  it('Test 1: returns false when both story and projectNotesHtml are empty/null', () => {
    expect(hasStoryContent(null, null)).toBe(false)
    expect(hasStoryContent(undefined, undefined)).toBe(false)
    expect(hasStoryContent('   ', '')).toBe(false)
  })

  it('Test 2: projectNotesHtml takes precedence over story when both are present', () => {
    expect(hasStoryContent('Legacy-Story', '<p>Projektnotiz</p>')).toBe(true)
  })

  it('Test 3: falls back to story when projectNotesHtml is null', () => {
    expect(hasStoryContent('Legacy-Story', null)).toBe(true)
  })
})

describe('buildEmptyAreaLabels (AO4-07)', () => {
  it('Test 4: returns no labels when every area has content', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: true, hasStory: true, hasReleases: true, hasThemes: true, hasMedia: true,
    })
    expect(labels).toEqual([])
  })

  it('Test 5: collects a label per empty area, in the declared order', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: false, hasStory: false, hasReleases: false, hasThemes: false, hasMedia: false,
    })
    expect(labels).toEqual(['Beteiligte am Projekt', 'Geschichte', 'Releases', 'OP/ED/Middle', 'Release-Einblicke'])
  })

  it('Test 6: only the genuinely empty areas are collected', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: true, hasStory: false, hasReleases: true, hasThemes: false, hasMedia: true,
    })
    expect(labels).toEqual(['Geschichte', 'OP/ED/Middle'])
  })
})
