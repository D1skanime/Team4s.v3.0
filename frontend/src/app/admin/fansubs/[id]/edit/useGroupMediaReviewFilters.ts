import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import {
  FansubGroupMediaCategory,
  FansubGroupMediaItem,
  FansubMediaReviewStatus,
  FansubMediaVisibility,
} from '@/lib/api'
import { formatDateDeOrEmpty } from '@/lib/formatDate'
import { matchesSearch } from '@/lib/textFilter'

export type CategoryFilter = 'all' | FansubGroupMediaCategory
export type ReviewStatusFilter = 'all' | FansubMediaReviewStatus
export type VisibilityFilter = 'all' | FansubMediaVisibility
export type SortMode = 'sort_order' | 'created_desc' | 'created_asc'

export const INITIAL_VISIBLE_MEDIA_COUNT = 40
export const LOAD_MORE_MEDIA_COUNT = 40

interface FilterMatchFields {
  visibility: FansubMediaVisibility
  review_status: FansubMediaReviewStatus
  category: FansubGroupMediaCategory
}

function itemToFilterFields(item: FansubGroupMediaItem): FilterMatchFields {
  return {
    visibility: item.visibility ?? 'intern',
    review_status: item.review_status ?? 'in_pruefung',
    category: item.category ?? 'other',
  }
}

function getMediaDisplayTitle(item: FansubGroupMediaItem): string {
  const title = item.title?.trim()
  if (title) return title

  const date = formatDateDeOrEmpty(item.created_at)
  const suffix = date ? ` vom ${date}` : ''

  switch (item.category) {
    case 'artwork_fanart':
      return `Artwork${suffix}`
    case 'event_meeting':
      return `Treffen${suffix}`
    case 'forum':
      return `Forenbild${suffix}`
    case 'history_screenshot':
      return `Historischer Screenshot${suffix}`
    case 'irc_chat':
      return `Chatbild${suffix}`
    case 'old_website':
      return `Webseitenbild${suffix}`
    case 'gallery':
      return `Galeriebild${suffix}`
    default:
      return `Gruppenbild${suffix}`
  }
}

export interface UseGroupMediaReviewFiltersResult {
  categoryFilter: CategoryFilter
  setCategoryFilter: Dispatch<SetStateAction<CategoryFilter>>
  statusFilter: ReviewStatusFilter
  setStatusFilter: Dispatch<SetStateAction<ReviewStatusFilter>>
  visibilityFilter: VisibilityFilter
  setVisibilityFilter: Dispatch<SetStateAction<VisibilityFilter>>
  sortMode: SortMode
  setSortMode: Dispatch<SetStateAction<SortMode>>
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  visibleLimit: number
  setVisibleLimit: Dispatch<SetStateAction<number>>
  filteredMediaItems: FansubGroupMediaItem[]
  visibleMediaItems: FansubGroupMediaItem[]
  filteredMediaIdSet: Set<number>
  remainingMediaCount: number
  activeFilterCount: number
  isCanonicalReorderView: boolean
  selectedMediaIds: Set<number>
  setSelectedMediaIds: Dispatch<SetStateAction<Set<number>>>
  bulkSavingStatus: FansubMediaReviewStatus | null
  setBulkSavingStatus: Dispatch<SetStateAction<FansubMediaReviewStatus | null>>
  bulkError: string | null
  setBulkError: Dispatch<SetStateAction<string | null>>
  allFilteredSelected: boolean
  resetFilters: () => void
  toggleMediaSelection: (mediaId: number) => void
  clearSelection: () => void
  toggleAllFilteredSelection: () => void
}

/**
 * Buendelt Filter-, Sortier-, Such-, Pagination- und Auswahlzustand fuer die
 * Gruppenmedien-Pruefung. Reine Extraktion aus GroupMediaReviewSection.tsx
 * (Phase 180-06) ohne Verhaltensaenderung.
 */
export function useGroupMediaReviewFilters(mediaItems: FansubGroupMediaItem[]): UseGroupMediaReviewFiltersResult {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('sort_order')
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_MEDIA_COUNT)
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(() => new Set())
  const [bulkSavingStatus, setBulkSavingStatus] = useState<FansubMediaReviewStatus | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const filteredMediaItems = useMemo(() => {
    return mediaItems
      .filter((item) => {
        const fields = itemToFilterFields(item)
        const matchesCategory = categoryFilter === 'all' || fields.category === categoryFilter
        const matchesStatus = statusFilter === 'all' || fields.review_status === statusFilter
        const matchesVisibility = visibilityFilter === 'all' || fields.visibility === visibilityFilter
        const isSearchMatch = matchesSearch([
          getMediaDisplayTitle(item),
          item.description,
          item.alt_text,
          item.uploaded_by_display_name,
        ], searchTerm)

        return matchesCategory && matchesStatus && matchesVisibility && isSearchMatch
      })
      .sort((left, right) => {
        const leftDate = Date.parse(left.created_at ?? '') || 0
        const rightDate = Date.parse(right.created_at ?? '') || 0
        if (sortMode === 'sort_order') {
          return (left.sort_order ?? 0) - (right.sort_order ?? 0) || leftDate - rightDate || left.id - right.id
        }
        return sortMode === 'created_asc' ? leftDate - rightDate : rightDate - leftDate
      })
  }, [categoryFilter, mediaItems, searchTerm, sortMode, statusFilter, visibilityFilter])

  useEffect(() => {
    // Setzt das Ladelimit bei Filteraenderung zurueck auf den Anfangswert.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleLimit(INITIAL_VISIBLE_MEDIA_COUNT)
  }, [categoryFilter, searchTerm, sortMode, statusFilter, visibilityFilter])

  const visibleMediaItems = useMemo(
    () => filteredMediaItems.slice(0, visibleLimit),
    [filteredMediaItems, visibleLimit],
  )
  const filteredMediaIdSet = useMemo(
    () => new Set(filteredMediaItems.map((item) => item.id)),
    [filteredMediaItems],
  )

  const remainingMediaCount = Math.max(filteredMediaItems.length - visibleMediaItems.length, 0)
  const activeFilterCount = [
    categoryFilter !== 'all',
    statusFilter !== 'all',
    visibilityFilter !== 'all',
    searchTerm.trim().length > 0,
    sortMode !== 'sort_order',
  ].filter(Boolean).length
  const isCanonicalReorderView =
    categoryFilter === 'all' &&
    statusFilter === 'all' &&
    visibilityFilter === 'all' &&
    searchTerm.trim().length === 0 &&
    sortMode === 'sort_order'
  const allFilteredSelected =
    filteredMediaItems.length > 0 && filteredMediaItems.every((item) => selectedMediaIds.has(item.id))

  useEffect(() => {
    // Entfernt Auswahl-IDs, die nach einer Filteraenderung nicht mehr sichtbar sind.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMediaIds((current) => {
      const next = new Set(Array.from(current).filter((id) => filteredMediaIdSet.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredMediaIdSet])

  function resetFilters() {
    setCategoryFilter('all')
    setStatusFilter('all')
    setVisibilityFilter('all')
    setSortMode('sort_order')
    setSearchTerm('')
  }

  function toggleMediaSelection(mediaId: number) {
    setBulkError(null)
    setSelectedMediaIds((current) => {
      const next = new Set(current)
      if (next.has(mediaId)) {
        next.delete(mediaId)
      } else {
        next.add(mediaId)
      }
      return next
    })
  }

  function clearSelection() {
    setBulkError(null)
    setSelectedMediaIds(new Set())
  }

  function toggleAllFilteredSelection() {
    setBulkError(null)
    if (allFilteredSelected) {
      setSelectedMediaIds(new Set())
      return
    }
    setSelectedMediaIds(new Set(filteredMediaItems.map((item) => item.id)))
  }

  return {
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    visibilityFilter,
    setVisibilityFilter,
    sortMode,
    setSortMode,
    searchTerm,
    setSearchTerm,
    visibleLimit,
    setVisibleLimit,
    filteredMediaItems,
    visibleMediaItems,
    filteredMediaIdSet,
    remainingMediaCount,
    activeFilterCount,
    isCanonicalReorderView,
    selectedMediaIds,
    setSelectedMediaIds,
    bulkSavingStatus,
    setBulkSavingStatus,
    bulkError,
    setBulkError,
    allFilteredSelected,
    resetFilters,
    toggleMediaSelection,
    clearSelection,
    toggleAllFilteredSelection,
  }
}
