import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { UseAdminAnimeRelationsModel } from '../../hooks/useAdminAnimeRelations'
import { buildRelationsSummary } from '../../hooks/useAdminAnimeRelations'
import { AnimeRelationsSection } from './AnimeRelationsSection'

function createModel(overrides: Partial<UseAdminAnimeRelationsModel> = {}): UseAdminAnimeRelationsModel {
  return {
    relations: [],
    isLoading: false,
    isSearching: false,
    isSaving: false,
    query: '',
    targets: [],
    selectedTarget: null,
    relationLabel: 'Fortsetzung',
    editingTargetID: null,
    editingLabel: 'Fortsetzung',
    inlineError: null,
    errorMessage: null,
    setQuery: vi.fn(),
    selectTarget: vi.fn(),
    setRelationLabel: vi.fn(),
    createRelation: vi.fn(async () => {}),
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    setEditingLabel: vi.fn(),
    saveEditing: vi.fn(async () => {}),
    deleteRelation: vi.fn(async () => {}),
    clearMessages: vi.fn(),
    ...overrides,
  }
}

describe('AnimeRelationsSection', () => {
  it('starts collapsed by default', () => {
    const markup = renderToStaticMarkup(
      <AnimeRelationsSection animeID={7} authToken="token" modelOverride={createModel()} />,
    )

    expect(markup).toContain('Relationen')
    expect(markup).not.toContain(' open=""')
  })

  it('renders directional helper copy, live search, and the four allowed labels when expanded', () => {
    const markup = renderToStaticMarkup(
      <AnimeRelationsSection
        animeID={7}
        authToken="token"
        defaultOpen
        modelOverride={createModel({
          query: 'Naruto',
          targets: [
            {
              anime_id: 12,
              title: 'Naruto Shippuden',
              type: 'tv',
              status: 'done',
              year: 2007,
            },
          ],
        })}
      />,
    )

    expect(markup).toContain('Der ausgewaehlte Typ beschreibt immer das Ziel-Anime')
    expect(markup).toContain('Ziel-Anime suchen')
    expect(markup).toContain('Naruto Shippuden')
    expect(markup).toContain('Hauptgeschichte')
    expect(markup).toContain('Nebengeschichte')
    expect(markup).toContain('Fortsetzung')
    expect(markup).toContain('Zusammenfassung')
  })

  it('renders persistent section errors and inline edit/delete controls for existing relations', () => {
    const markup = renderToStaticMarkup(
      <AnimeRelationsSection
        animeID={7}
        authToken="token"
        defaultOpen
        modelOverride={createModel({
          errorMessage: 'Relation existiert bereits oder ist ungueltig',
          relations: [
            {
              target_anime_id: 12,
              relation_label: 'Fortsetzung',
              target_title: 'Naruto Shippuden',
              target_type: 'tv',
              target_status: 'done',
              target_year: 2007,
            },
          ],
        })}
      />,
    )

    expect(markup).toContain('Relation existiert bereits oder ist ungueltig')
    expect(markup).toContain('Bestehende Relationen')
    expect(markup).toContain('Bearbeiten')
    expect(markup).toContain('Loeschen')
  })
})

describe('buildRelationsSummary', () => {
  it('includes error state when section failures are present', () => {
    expect(buildRelationsSummary([], null)).toBe('0 Relationen')
    expect(buildRelationsSummary([{ target_anime_id: 1 } as never], 'Fehler')).toBe('1 Relation | Fehler vorhanden')
  })
})
