import { describe, expect, it } from 'vitest'

import { applyEinteilerTitlePrefill, isPlaceholderEpisodeTitle } from './episodeImportEinteilerTitle'

describe('isPlaceholderEpisodeTitle (GAP-10)', () => {
  it('matches common German/English placeholder spellings', () => {
    expect(isPlaceholderEpisodeTitle('Episode 1', 1)).toBe(true)
    expect(isPlaceholderEpisodeTitle('Folge 01', 1)).toBe(true)
    expect(isPlaceholderEpisodeTitle('Ep. 1', 1)).toBe(true)
    expect(isPlaceholderEpisodeTitle('Episode', 1)).toBe(true)
  })

  it('rejects a placeholder form with a mismatched episode number', () => {
    expect(isPlaceholderEpisodeTitle('Episode 2', 1)).toBe(false)
  })

  it('rejects a real episode title', () => {
    expect(isPlaceholderEpisodeTitle('Parody Mode', 1)).toBe(false)
  })
})

describe('applyEinteilerTitlePrefill (GAP-10)', () => {
  it('prefills a placeholder title with the anime title for an Einteiler', () => {
    const result = applyEinteilerTitlePrefill(
      [{ episode_number: 1, title: 'Episode 1' }],
      true,
      '.hack//G.U. Returner',
    )

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('.hack//G.U. Returner')
    expect(result[0].titles_by_language).toEqual({ de: '.hack//G.U. Returner' })
  })

  it('leaves series (isEinteiler = false) unchanged', () => {
    const result = applyEinteilerTitlePrefill(
      [{ episode_number: 1, title: 'Episode 1' }],
      false,
      '.hack//G.U. Returner',
    )

    expect(result[0].title).toBe('Episode 1')
  })

  it('never overwrites an already-real title', () => {
    const result = applyEinteilerTitlePrefill(
      [{ episode_number: 1, title: 'Parody Mode' }],
      true,
      '.hack//G.U. Returner',
    )

    expect(result[0].title).toBe('Parody Mode')
  })

  it('does not prefill with a whitespace-only anime title', () => {
    const result = applyEinteilerTitlePrefill(
      [{ episode_number: 1, title: 'Episode 1' }],
      true,
      '   ',
    )

    expect(result[0].title).toBe('Episode 1')
  })
})
