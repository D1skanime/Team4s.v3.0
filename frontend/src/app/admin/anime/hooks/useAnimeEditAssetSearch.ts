'use client'

import { useState } from 'react'

import { searchAdminAnimeCreateAssetCandidates } from '@/lib/api/admin-anime-intake'
import type { AdminAnimeAssetKind } from '@/types/admin'

import { stageRemoteCreateAssetCandidate } from '../create/createAssetUploadPlan'
import { formatAdminError } from '../utils/studio-helpers'

type SearchableAssetKind = Extract<AdminAnimeAssetKind, 'cover' | 'banner' | 'logo' | 'background'>

// Schmale Teilmenge von useAnimePatch's Rückgabewert -- nur die eine Methode, die diese Extraktion
// tatsächlich braucht. Hält den Hook unabhängig von useAnimePatch testbar (kein voller Patch-State
// nötig), während der reale AnimeEditWorkspace.tsx-Aufrufer weiterhin einfach sein vorhandenes
// `patch`-Objekt durchreicht.
interface AnimeEditAssetSearchPatch {
  uploadAndLinkAsset: (file: File, assetKind: AdminAnimeAssetKind, animeID?: number | null) => Promise<void>
}

interface UseAnimeEditAssetSearchOptions {
  patch: AnimeEditAssetSearchPatch
  animeID: number
  onError: (message: string) => void
  refreshAssetContext: () => Promise<void>
}

/**
 * Task 2 (quick-261018-l5r), reiner Umbau ohne Verhaltensänderung: extrahiert den
 * Asset-Kandidaten-Suchstate + die zugehörigen vier Handler aus AnimeEditWorkspace.tsx (CLAUDE.md
 * 450-Zeilen-Regel), damit die neue AniSearch-Verknüpfungs-Karte (Task 3) in der Host-Datei Platz
 * hat. Gibt exakt dieselben Werte/Funktionsnamen zurück, die AnimeEditWorkspace.tsx vorher lokal
 * deklarierte, damit das restliche JSX unverändert bleibt.
 */
export function useAnimeEditAssetSearch({ patch, animeID, onError, refreshAssetContext }: UseAnimeEditAssetSearchOptions) {
  const [activeAssetSearchKind, setActiveAssetSearchKind] = useState<SearchableAssetKind | null>(null)
  const [assetSearchQuery, setAssetSearchQuery] = useState('')
  const [assetSearchCandidates, setAssetSearchCandidates] = useState<
    Awaited<ReturnType<typeof searchAdminAnimeCreateAssetCandidates>>['data']
  >([])
  const [assetSearchSelectedIDs, setAssetSearchSelectedIDs] = useState<string[]>([])
  const [assetSearchErrorMessage, setAssetSearchErrorMessage] = useState<string | null>(null)
  const [assetSearchHasMore, setAssetSearchHasMore] = useState(false)
  const [assetSearchPage, setAssetSearchPage] = useState(1)
  const [isSearchingAssetCandidates, setIsSearchingAssetCandidates] = useState(false)
  const [isApplyingAssetCandidates, setIsApplyingAssetCandidates] = useState(false)

  function closeAssetSearch() {
    setActiveAssetSearchKind(null)
    setAssetSearchCandidates([])
    setAssetSearchSelectedIDs([])
    setAssetSearchErrorMessage(null)
    setAssetSearchHasMore(false)
    setAssetSearchPage(1)
  }

  async function handleAssetCandidateSearch() {
    if (!activeAssetSearchKind) {
      setAssetSearchErrorMessage('Bitte zuerst einen Asset-Slot wählen.')
      return
    }
    if (!assetSearchQuery.trim()) {
      setAssetSearchErrorMessage('Bitte zuerst einen Suchbegriff eingeben.')
      return
    }

    try {
      setIsSearchingAssetCandidates(true)
      setAssetSearchErrorMessage(null)
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query: assetSearchQuery.trim(),
          limit: activeAssetSearchKind === 'background' ? 12 : 8,
          page: 1,
        },
      )
      setAssetSearchPage(1)
      setAssetSearchCandidates(response.data)
      setAssetSearchSelectedIDs([])
      setAssetSearchHasMore(response.data.length >= (activeAssetSearchKind === 'background' ? 12 : 8))
    } catch (error) {
      onError(formatAdminError(error, 'Asset-Suche fehlgeschlagen.'))
    } finally {
      setIsSearchingAssetCandidates(false)
    }
  }

  async function handleLoadMoreAssets() {
    if (!activeAssetSearchKind || isSearchingAssetCandidates) return

    try {
      setIsSearchingAssetCandidates(true)
      const nextPage = assetSearchPage + 1
      const limit = activeAssetSearchKind === 'background' ? 12 : 8
      const response = await searchAdminAnimeCreateAssetCandidates(
        {
          asset_kind: activeAssetSearchKind,
          query: assetSearchQuery.trim(),
          limit,
          page: nextPage,
        },
      )
      setAssetSearchPage(nextPage)
      setAssetSearchCandidates((current) => [...current, ...response.data])
      setAssetSearchHasMore(response.data.length >= limit)
    } catch (error) {
      onError(formatAdminError(error, 'Weitere Assets konnten nicht geladen werden.'))
    } finally {
      setIsSearchingAssetCandidates(false)
    }
  }

  function toggleAssetCandidateSelection(candidateID: string) {
    if (activeAssetSearchKind === 'background') {
      setAssetSearchSelectedIDs((current) =>
        current.includes(candidateID)
          ? current.filter((id) => id !== candidateID)
          : [...current, candidateID],
      )
      return
    }
    setAssetSearchSelectedIDs((current) => (current[0] === candidateID ? [] : [candidateID]))
  }

  async function handleAssetCandidateAdoption() {
    if (!activeAssetSearchKind) return
    const selected = assetSearchCandidates.filter((candidate) =>
      assetSearchSelectedIDs.includes(candidate.id),
    )
    if (selected.length === 0) {
      setAssetSearchErrorMessage('Bitte zuerst mindestens ein Asset auswählen.')
      return
    }

    try {
      setIsApplyingAssetCandidates(true)
      for (const candidate of selected) {
        const staged = await stageRemoteCreateAssetCandidate(candidate)
        await patch.uploadAndLinkAsset(staged.file, activeAssetSearchKind, animeID)
      }
      await refreshAssetContext()
      closeAssetSearch()
    } catch (error) {
      onError(formatAdminError(error, 'Ausgewählte Assets konnten nicht übernommen werden.'))
    } finally {
      setIsApplyingAssetCandidates(false)
    }
  }

  return {
    activeAssetSearchKind,
    setActiveAssetSearchKind,
    assetSearchQuery,
    setAssetSearchQuery,
    assetSearchCandidates,
    assetSearchSelectedIDs,
    assetSearchErrorMessage,
    assetSearchHasMore,
    isSearchingAssetCandidates,
    isApplyingAssetCandidates,
    closeAssetSearch,
    handleAssetCandidateSearch,
    handleLoadMoreAssets,
    toggleAssetCandidateSelection,
    handleAssetCandidateAdoption,
  }
}
