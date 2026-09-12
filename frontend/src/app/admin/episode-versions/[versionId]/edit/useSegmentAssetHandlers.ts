'use client'

import { useEffect, useState } from 'react'

import {
  attachSegmentLibraryAsset,
  deleteSegmentAsset,
  getSegmentLibraryCandidates,
  uploadSegmentAsset,
} from '@/lib/api'
import type { AdminSegmentLibraryCandidate, AdminThemeSegment } from '@/types/admin'
import type { FormState } from './SegmentEditPanel'

interface UseSegmentAssetHandlersOptions {
  animeId: number | null
  groupId: number | null
  releaseVariantId?: number | null
  hasAuthSession: boolean
  panelOpen: boolean
  editingSegment: AdminThemeSegment | null
  formState: FormState
  setEditingSegment: (updater: AdminThemeSegment | ((prev: AdminThemeSegment | null) => AdminThemeSegment | null) | null) => void
  setFormState: (updater: FormState | ((prev: FormState) => FormState)) => void
  reload: () => Promise<void>
}

/**
 * Kapselt Upload-/Reuse-State + Handler fuer die Segment-Asset-Sektion außerhalb von
 * SegmenteTab.tsx, mirroring useSegmentOverrideHandlers's Form (Phase 156, Plan 156-14,
 * Dateigroessen-Vorgabe aus 156-UAT.md). Eigene Datei, da SegmenteTab.helpers.tsx bereits
 * nahe der Budgetgrenze liegt.
 */
export function useSegmentAssetHandlers({
  animeId,
  groupId,
  releaseVariantId,
  hasAuthSession,
  panelOpen,
  editingSegment,
  formState,
  setEditingSegment,
  setFormState,
  reload,
}: UseSegmentAssetHandlersOptions) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDeletingAsset, setIsDeletingAsset] = useState(false)
  const [reuseCandidates, setReuseCandidates] = useState<AdminSegmentLibraryCandidate[]>([])
  const [isLoadingReuseCandidates, setIsLoadingReuseCandidates] = useState(false)
  const [reuseError, setReuseError] = useState<string | null>(null)
  const [isAttachingReuse, setIsAttachingReuse] = useState(false)

  useEffect(() => {
    if (!panelOpen || !editingSegment || !animeId || !groupId || !hasAuthSession) {
      setReuseCandidates([])
      return
    }

    if (formState.sourceType !== 'release_asset' || !formState.themeKind.trim()) {
      setReuseCandidates([])
      return
    }

    setIsLoadingReuseCandidates(true)
    setReuseError(null)
    getSegmentLibraryCandidates(
      animeId,
      groupId,
      formState.themeKind,
      formState.themeTitle,
      undefined,
      releaseVariantId,
    )
      .then((res) => {
        setReuseCandidates(
          res.data.filter((candidate) => {
            if (!editingSegment.source_ref?.trim()) return true
            return candidate.source_ref !== editingSegment.source_ref
          }),
        )
      })
      .catch((error) => {
        setReuseCandidates([])
        setReuseError(error instanceof Error ? error.message : 'Library-Kandidaten konnten nicht geladen werden.')
      })
      .finally(() => {
        setIsLoadingReuseCandidates(false)
      })
  }, [animeId, editingSegment, formState.sourceType, formState.themeKind, formState.themeTitle, groupId, hasAuthSession, panelOpen, releaseVariantId])

  async function handleAssetUpload(file: File) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const res = await uploadSegmentAsset(animeId, editingSegment.id, file, undefined, releaseVariantId)
      // Reload so table + panel get fresh data
      await reload()
      // Refresh the editing segment from reloaded list
      setEditingSegment(res.data)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleAssetDelete() {
    if (!animeId || !editingSegment || !hasAuthSession) return
    const confirmed = window.confirm('Segment-Datei wirklich entfernen? Die Quelldaten werden auf "Keine Quelle" zurückgesetzt.')
    if (!confirmed) return
    setIsDeletingAsset(true)
    setUploadError(null)
    try {
      await deleteSegmentAsset(animeId, editingSegment.id, undefined, releaseVariantId)
      await reload()
      // Update panel to reflect cleared asset
      setEditingSegment((prev) =>
        prev ? { ...prev, source_type: 'none', source_ref: null, source_label: null } : prev
      )
      setFormState((s) => ({ ...s, sourceType: 'none', sourceRef: '', sourceLabel: '' }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Datei konnte nicht entfernt werden.')
    } finally {
      setIsDeletingAsset(false)
    }
  }

  async function handleAttachReuseCandidate(candidate: AdminSegmentLibraryCandidate) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsAttachingReuse(true)
    setReuseError(null)
    try {
      const res = await attachSegmentLibraryAsset(
        animeId,
        editingSegment.id,
        { asset_id: candidate.asset_id },
        undefined,
        releaseVariantId,
      )
      await reload()
      setEditingSegment(res.data)
      setFormState((current) => ({
        ...current,
        sourceType: 'release_asset',
        sourceRef: res.data.source_ref ?? '',
        sourceLabel: res.data.source_label ?? '',
      }))
    } catch (error) {
      setReuseError(error instanceof Error ? error.message : 'Library-Datei konnte nicht verknüpft werden.')
    } finally {
      setIsAttachingReuse(false)
    }
  }

  return {
    isUploading,
    uploadError,
    isDeletingAsset,
    reuseCandidates,
    isLoadingReuseCandidates,
    reuseError,
    isAttachingReuse,
    handleAssetUpload,
    handleAssetDelete,
    handleAttachReuseCandidate,
  }
}
