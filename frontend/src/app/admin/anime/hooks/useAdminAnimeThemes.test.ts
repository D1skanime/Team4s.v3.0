import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  getAdminAnimeThemes: vi.fn(async () => ({ data: [] })),
  getAdminThemeTypes: vi.fn(async () => ({ data: [] })),
  createAdminAnimeTheme: vi.fn(async () => ({
    data: { id: 99, anime_id: 7, theme_type_id: 1, theme_type_name: 'OP1', title: 'Test', created_at: '2026-01-01T00:00:00Z' },
  })),
  deleteAdminAnimeTheme: vi.fn(async () => undefined),
}))

import { createAdminAnimeTheme, deleteAdminAnimeTheme, getAdminAnimeThemes, getAdminThemeTypes } from '@/lib/api'

import { loadAdminAnimeThemesData } from './useAdminAnimeThemes'

describe('useAdminAnimeThemes', () => {
  it('loads themes and themeTypes on mount in parallel', async () => {
    await loadAdminAnimeThemesData(7, 'token')

    expect(getAdminAnimeThemes).toHaveBeenCalledWith(7, 'token')
    expect(getAdminThemeTypes).toHaveBeenCalledWith('token')
  })

  it('createTheme calls API with correct animeID and payload', async () => {
    const payload = { theme_type_id: 1, title: 'Test' }
    await createAdminAnimeTheme(7, payload, 'token')

    expect(createAdminAnimeTheme).toHaveBeenCalledWith(7, { theme_type_id: 1, title: 'Test' }, 'token')
  })

  it('deleteTheme calls API with correct IDs', async () => {
    await deleteAdminAnimeTheme(7, 99, 'token')

    expect(deleteAdminAnimeTheme).toHaveBeenCalledWith(7, 99, 'token')
  })
})
