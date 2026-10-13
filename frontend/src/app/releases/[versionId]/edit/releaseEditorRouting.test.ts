// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  formatEpisodeLabel,
  formatEpisodeNumber,
  getProjectReturnPath,
  getSafeReturnPath,
  parsePositiveInt,
  readErrorMessage,
  resolveNavigationContext,
} from './releaseEditorRouting'

describe('getSafeReturnPath', () => {
  it('erlaubt den Admin-Fansub-Workspace-Pfad', () => {
    expect(getSafeReturnPath('/admin/fansubs/5/edit')).toBe('/admin/fansubs/5/edit')
  })

  it('erlaubt den Mitglieder-Projekt-Workspace-Pfad', () => {
    expect(getSafeReturnPath('/me/projects/5/group/3')).toBe('/me/projects/5/group/3')
  })

  it('lehnt absolute externe URLs ab', () => {
    expect(getSafeReturnPath('https://evil.test/x')).toBeNull()
  })

  it('lehnt protokoll-relative URLs ab', () => {
    expect(getSafeReturnPath('//evil.test')).toBeNull()
  })

  it('lehnt nicht erlaubte Pfade ab', () => {
    expect(getSafeReturnPath('/unrelated/path')).toBeNull()
  })
})

describe('getProjectReturnPath', () => {
  it('gibt den Eingabestring bei exakter Uebereinstimmung zurueck', () => {
    expect(getProjectReturnPath('/me/projects/5/group/3', 5, 3)).toBe('/me/projects/5/group/3')
  })

  it('lehnt eine abweichende animeId ab', () => {
    expect(getProjectReturnPath('/me/projects/9/group/3', 5, 3)).toBeNull()
  })

  it('lehnt einen fehlenden raw-Wert ab', () => {
    expect(getProjectReturnPath(null, 5, 3)).toBeNull()
  })
})

describe('parsePositiveInt', () => {
  it('parst eine einzelne Zeichenkette', () => {
    expect(parsePositiveInt('42')).toBe(42)
  })

  it('parst das erste Element eines Arrays', () => {
    expect(parsePositiveInt(['42', '7'])).toBe(42)
  })

  it('lehnt 0 ab', () => {
    expect(parsePositiveInt('0')).toBeNull()
  })

  it('lehnt undefined ab', () => {
    expect(parsePositiveInt(undefined)).toBeNull()
  })
})

describe('resolveNavigationContext', () => {
  it("liefert 'project' fuer einen Projekt-return_to", () => {
    expect(
      resolveNavigationContext({
        returnTo: '/me/projects/5/group/3',
        animeIdQuery: null,
        episodeIdQuery: null,
      }),
    ).toBe('project')
  })

  it("liefert 'episode' fuer einen Admin-Fansub-return_to", () => {
    expect(
      resolveNavigationContext({
        returnTo: '/admin/fansubs/5/edit',
        animeIdQuery: null,
        episodeIdQuery: null,
      }),
    ).toBe('episode')
  })

  it("liefert 'episode' bei vorhandenen animeId/episodeId-Query-Parametern", () => {
    expect(
      resolveNavigationContext({
        returnTo: null,
        animeIdQuery: 10,
        episodeIdQuery: 20,
      }),
    ).toBe('episode')
  })

  it("liefert 'project' als konservativen Fallback ohne jeglichen Kontext (RESEARCH.md Assumption A1)", () => {
    expect(
      resolveNavigationContext({
        returnTo: null,
        animeIdQuery: null,
        episodeIdQuery: null,
      }),
    ).toBe('project')
  })
})

describe('formatEpisodeNumber', () => {
  it('formatiert eine gueltige Episodennummer', () => {
    expect(formatEpisodeNumber(7)).toBe('Episode 07')
  })

  it('faellt bei fehlender Nummer auf "Episode" zurueck', () => {
    expect(formatEpisodeNumber(null)).toBe('Episode')
  })
})

describe('readErrorMessage', () => {
  it('liest die Message aus einem echten Error-Objekt', () => {
    expect(readErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('faellt bei einem Nicht-Error-Wert auf den Fallback zurueck', () => {
    expect(readErrorMessage('not an error', 'fallback')).toBe('fallback')
  })
})

describe('formatEpisodeLabel', () => {
  it('bevorzugt einen vorhandenen Titel', () => {
    expect(formatEpisodeLabel(7, 'Der große Kampf')).toBe('Der große Kampf')
  })

  it('faellt ohne Titel auf die formatierte Episodennummer zurueck', () => {
    expect(formatEpisodeLabel(7, null)).toBe('Episode 07')
  })
})
