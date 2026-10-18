'use client'

import { useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { jellyfinSourceKey } from '@/lib/jellyfinSourceIdentity'

import type {
  EpisodeImportMappingRow,
  EpisodeImportSelectedFansubGroup,
} from '@/types/episodeImport'

import {
  addMappingFansubGroup,
  applyFansubGroupFromEpisodeDown,
  applyFansubGroupToEpisodeRows,
  removeMappingFansubGroup,
  setMappingFansubGroups,
} from './episodeImportMapping'

interface UseEpisodeImportFansubGroupActionsOptions {
  setMappings: Dispatch<SetStateAction<EpisodeImportMappingRow[]>>
}

/**
 * Second split out of useEpisodeImportBuilder.ts (CLAUDE.md 450-line rule). The first split
 * (commit df9175314, episodeImportBuilderHelpers.ts) extracted the pure non-hook helpers; this
 * one extracts the fansub-group mutator CALLBACKS together with the D-01 one-step-back baseline
 * ref they share, since the regression-fix commit (06b39a2f5, "Ab hier" two-step chip-change fix)
 * added that ref and its bookkeeping without re-checking the line count. Pure refactor, no
 * behavior change -- mirrors how useAnimeEditAssetRemoval/useAnimeEditAssetSearch were split out
 * of AnimeEditWorkspace.tsx (an options object carrying the state setter the callbacks need).
 */
export function useEpisodeImportFansubGroupActions({
  setMappings,
}: UseEpisodeImportFansubGroupActionsOptions) {
  // D-01: one-step-back memory of each row's fansub groups immediately BEFORE
  // the current edit SEQUENCE started, so "Ab hier" can derive the correct
  // oldFansubGroups baseline instead of reading a stale page-load snapshot.
  // See fix_1. A chip change on an existing chip is structurally always TWO
  // mutator calls in this UI (remove old chip, then add/set the new one) --
  // so the FIRST mutator call since the last consumption wins (sets the ref
  // only if absent), not the last. applyFansubGroupFromEpisode deletes the
  // entry once consumed so the next independent edit sequence starts fresh.
  // See ab-hier-two-step-chip-change-regression.md.
  const rowGroupsBeforeLastEditRef = useRef<Map<string, EpisodeImportSelectedFansubGroup[]>>(new Map())

  function setSelectedFansubGroups(sourceKey: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) {
    setMappings((current) => {
      const existing = current.find((row) => jellyfinSourceKey(row) === sourceKey)
      if (existing && !rowGroupsBeforeLastEditRef.current.has(sourceKey)) {
        rowGroupsBeforeLastEditRef.current.set(sourceKey, existing.fansub_groups ?? [])
      }
      return setMappingFansubGroups(current, sourceKey, fansubGroups)
    })
  }

  function addSelectedFansubGroup(sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) {
    setMappings((current) => {
      const existing = current.find((row) => jellyfinSourceKey(row) === sourceKey)
      if (existing && !rowGroupsBeforeLastEditRef.current.has(sourceKey)) {
        rowGroupsBeforeLastEditRef.current.set(sourceKey, existing.fansub_groups ?? [])
      }
      return addMappingFansubGroup(current, sourceKey, fansubGroup)
    })
  }

  function removeSelectedFansubGroup(sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) {
    setMappings((current) => {
      const existing = current.find((row) => jellyfinSourceKey(row) === sourceKey)
      if (existing && !rowGroupsBeforeLastEditRef.current.has(sourceKey)) {
        rowGroupsBeforeLastEditRef.current.set(sourceKey, existing.fansub_groups ?? [])
      }
      return removeMappingFansubGroup(current, sourceKey, fansubGroup)
    })
  }

  function applyFansubGroupToEpisode(episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) {
    setMappings((current) => applyFansubGroupToEpisodeRows(current, episodeNumber, fansubGroups))
  }

  function applyFansubGroupFromEpisode(sourceKey: string, newFansubGroups: EpisodeImportSelectedFansubGroup[]) {
    setMappings((current) => {
      const startIndex = current.findIndex((row) => jellyfinSourceKey(row) === sourceKey)
      if (startIndex === -1) return current
      // D-01: "Ab hier" (non-empty newFansubGroups) needs the one-step-back baseline
      // captured just before this row's last chip edit -- the row's CURRENT value by
      // click time already equals newFansubGroups, so the live value can't be used as
      // oldFansubGroups. "Ab hier entfernen" (empty newFansubGroups) has no preceding
      // edit, so the row's live value IS already the correct baseline.
      const liveGroups = current[startIndex].fansub_groups ?? []
      const oldFansubGroups =
        newFansubGroups.length > 0
          ? rowGroupsBeforeLastEditRef.current.get(sourceKey) ?? liveGroups
          : liveGroups
      // Consume + clear the baseline now that it has been read, regardless of which
      // branch ("Ab hier" or "Ab hier entfernen") was taken -- the next independent
      // edit sequence on this row must start fresh from its then-current value.
      rowGroupsBeforeLastEditRef.current.delete(sourceKey)
      return applyFansubGroupFromEpisodeDown(current, startIndex, oldFansubGroups, newFansubGroups)
    })
  }

  return {
    setSelectedFansubGroups,
    addSelectedFansubGroup,
    removeSelectedFansubGroup,
    applyFansubGroupToEpisode,
    applyFansubGroupFromEpisode,
  }
}
