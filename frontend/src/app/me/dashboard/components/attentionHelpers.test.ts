import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ATTENTION_WINDOW_DAYS, isRecentlyAssigned, resolveWorkspaceHref } from './attentionHelpers'

describe('attentionHelpers (Phase 116, D-02)', () => {
  it('ATTENTION_WINDOW_DAYS ist 14', () => {
    expect(ATTENTION_WINDOW_DAYS).toBe(14)
  })

  describe('isRecentlyAssigned', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-28T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('gibt true zurueck fuer eine 8 Tage alte Zuweisung (innerhalb des Fensters)', () => {
      expect(isRecentlyAssigned('2026-07-20T00:00:00Z', 14)).toBe(true)
    })

    it('gibt false zurueck fuer eine 27 Tage alte Zuweisung (ausserhalb des Fensters)', () => {
      expect(isRecentlyAssigned('2026-07-01T00:00:00Z', 14)).toBe(false)
    })
  })

  describe('resolveWorkspaceHref', () => {
    it('verlinkt auf die Release-Version-Arbeitsflaeche wenn release_version_id gesetzt ist', () => {
      expect(
        resolveWorkspaceHref({ release_version_id: 62, anime_id: 5, fansub_group_id: 9 }),
      ).toBe('/me/releases/62/workspace')
    })

    it('verlinkt auf die Projekt-Arbeitsflaeche wenn release_version_id null ist', () => {
      expect(
        resolveWorkspaceHref({ release_version_id: null, anime_id: 5, fansub_group_id: 9 }),
      ).toBe('/me/projects/5/group/9')
    })
  })
})
