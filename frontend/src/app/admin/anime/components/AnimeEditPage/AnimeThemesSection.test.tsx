import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AdminAnimeTheme, AdminThemeType } from '@/types/admin'

import type { UseAdminAnimeThemesModel } from '../../hooks/useAdminAnimeThemes'
import { AnimeThemesSection } from './AnimeThemesSection'

const THEME_TYPES: AdminThemeType[] = [
  { id: 1, name: 'OP1' },
  { id: 2, name: 'ED1' },
]

const SAMPLE_THEME: AdminAnimeTheme = {
  id: 10,
  anime_id: 7,
  theme_type_id: 1,
  theme_type_name: 'OP1',
  title: 'Again',
  created_at: '2026-01-01T00:00:00Z',
}

function createModel(overrides: Partial<UseAdminAnimeThemesModel> = {}): UseAdminAnimeThemesModel {
  return {
    themes: [],
    themeTypes: THEME_TYPES,
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    inlineError: null,
    newTypeID: 1,
    newTitle: '',
    setNewTypeID: vi.fn(),
    setNewTitle: vi.fn(),
    createTheme: vi.fn(async () => {}),
    deleteTheme: vi.fn(async () => {}),
    editingThemeID: null,
    editingTypeID: 1,
    editingTitle: '',
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    setEditingTypeID: vi.fn(),
    setEditingTitle: vi.fn(),
    saveEditing: vi.fn(async () => {}),
    segments: new Map(),
    loadSegments: vi.fn(async () => {}),
    createSegment: vi.fn(async () => {}),
    deleteSegment: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('AnimeThemesSection', () => {
  it('renders empty state when no themes', () => {
    const markup = renderToStaticMarkup(
      <AnimeThemesSection animeID={7} authToken="token" defaultOpen modelOverride={createModel()} />,
    )

    expect(markup).toContain('Noch keine Themes vorhanden.')
  })

  it('renders theme_type_name for each theme in the list', () => {
    const markup = renderToStaticMarkup(
      <AnimeThemesSection
        animeID={7}
        authToken="token"
        defaultOpen
        modelOverride={createModel({
          themes: [SAMPLE_THEME, { ...SAMPLE_THEME, id: 11, theme_type_id: 2, theme_type_name: 'ED1', title: 'Exit' }],
        })}
      />,
    )

    expect(markup).toContain('OP1')
    expect(markup).toContain('ED1')
  })

  it('renders create button label', () => {
    const markup = renderToStaticMarkup(
      <AnimeThemesSection animeID={7} authToken="token" defaultOpen modelOverride={createModel()} />,
    )

    expect(markup).toContain('Theme speichern')
  })

  it('renders error message when errorMessage is set', () => {
    const markup = renderToStaticMarkup(
      <AnimeThemesSection
        animeID={7}
        authToken="token"
        defaultOpen
        modelOverride={createModel({ errorMessage: 'Theme konnte nicht geladen werden.' })}
      />,
    )

    expect(markup).toContain('Theme konnte nicht geladen werden.')
  })

  it('shows loading indicator when isLoading is true', () => {
    const markup = renderToStaticMarkup(
      <AnimeThemesSection
        animeID={7}
        authToken="token"
        defaultOpen
        modelOverride={createModel({ isLoading: true })}
      />,
    )

    expect(markup).toContain('Lade...')
  })
})
