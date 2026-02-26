import { EpisodeListItem, EpisodeStatus } from '@/types/anime'

import { EpisodeManagerState } from '../../../types/admin-anime'

export interface EpisodeManagerActions {
  setQuery: (q: string) => void
  setStatusFilter: (s: EpisodeStatus | 'all') => void
  setDensity: (d: 'compact' | 'comfortable') => void
  selectEpisode: (episode: EpisodeListItem) => void
  toggleSelected: (id: number) => void
  toggleAllVisible: (visibleIDs: number[]) => void
  clearSelection: () => void
  beginInlineEdit: (episode: EpisodeListItem) => void
  cancelInlineEdit: () => void
  setInlineField: (field: keyof EpisodeManagerState['inlineEditValues'], value: string | boolean) => void
  saveInlineEdit: () => Promise<void>
  setEditField: (field: keyof EpisodeManagerState['editFormValues'], value: string) => void
  setEditClearFlag: (field: keyof EpisodeManagerState['editFormClearFlags'], value: boolean) => void
  submitEdit: () => Promise<void>
  setCreateField: (field: keyof EpisodeManagerState['createFormValues'], value: string) => void
  submitCreate: (animeID: number) => Promise<void>
  applyBulkStatus: (status: EpisodeStatus) => Promise<void>
  removeSelected: (animeID: number) => Promise<void>
  removeEpisode: (episode: EpisodeListItem, animeID: number) => Promise<void>
}

