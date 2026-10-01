'use client'

import { useEffect, useRef, useState } from 'react'

import {
  ApiError,
  attachSegmentPreviewImage,
  getSegmentPreviewImageCandidates,
  resetSegmentPreviewImage,
  uploadSegmentPreviewImage,
} from '@/lib/api'
import type { AdminSegmentPreviewImageCandidate, AdminThemeSegment } from '@/types/admin'

const SUCCESS_MESSAGE_TIMEOUT_MS = 4000

const FORBIDDEN_MESSAGE = 'Du hast keine Berechtigung, das Vorschaubild dieses Segments zu ändern.'

interface UseSegmentPreviewImageHandlersOptions {
  animeId: number | null
  releaseVariantId?: number | null
  hasAuthSession: boolean
  editingSegment: AdminThemeSegment | null
  setEditingSegment: (
    updater: AdminThemeSegment | ((prev: AdminThemeSegment | null) => AdminThemeSegment | null) | null,
  ) => void
  reload: () => Promise<void>
}

/** Baut die Fehlermeldung aus dem UI-SPEC Copywriting Contract: 403 ist immer der feste
 * Berechtigungstext, sonst der generische Präfix plus optionales Serverdetail. */
function resolveErrorMessage(err: unknown, genericPrefix: string): string {
  if (err instanceof ApiError && err.status === 403) {
    return FORBIDDEN_MESSAGE
  }
  if (err instanceof Error && err.message.trim()) {
    return `${genericPrefix} ${err.message}`
  }
  return genericPrefix
}

/**
 * Kapselt State + Handler für die D-11-Vorschaubild-Sektion (Upload, Release-Bild-Picker,
 * Attach, Reset-auf-Automatisch) außerhalb von SegmenteTab.tsx, mirroring
 * useSegmentAssetHandlers' Form (Phase 172, Plan 172-08). Eigene Datei, analog zum
 * bestehenden Asset-Handler-Hook.
 */
export function useSegmentPreviewImageHandlers({
  animeId,
  releaseVariantId,
  hasAuthSession,
  editingSegment,
  setEditingSegment,
  reload,
}: UseSegmentPreviewImageHandlersOptions) {
  const [isUploadingPreview, setIsUploadingPreview] = useState(false)
  const [previewUploadError, setPreviewUploadError] = useState<string | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerCandidates, setPickerCandidates] = useState<AdminSegmentPreviewImageCandidate[]>([])
  const [isLoadingPickerCandidates, setIsLoadingPickerCandidates] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [isAttachingPreview, setIsAttachingPreview] = useState(false)
  const [isResettingPreview, setIsResettingPreview] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  function showSuccessMessage(text: string) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMessage(text)
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_TIMEOUT_MS)
  }

  async function handlePreviewUpload(file: File) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsUploadingPreview(true)
    setPreviewUploadError(null)
    try {
      const res = await uploadSegmentPreviewImage(animeId, editingSegment.id, file, undefined, releaseVariantId)
      await reload()
      setEditingSegment(res.data)
      showSuccessMessage('Vorschaubild hochgeladen und übernommen.')
    } catch (err) {
      setPreviewUploadError(resolveErrorMessage(err, 'Vorschaubild konnte nicht hochgeladen werden.'))
    } finally {
      setIsUploadingPreview(false)
    }
  }

  async function handleOpenPreviewPicker() {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsPickerOpen(true)
    setIsLoadingPickerCandidates(true)
    setPickerError(null)
    try {
      const res = await getSegmentPreviewImageCandidates(animeId, editingSegment.id, undefined, releaseVariantId)
      setPickerCandidates(res.data)
    } catch (err) {
      setPickerCandidates([])
      setPickerError(resolveErrorMessage(err, 'Release-Bilder konnten nicht geladen werden.'))
    } finally {
      setIsLoadingPickerCandidates(false)
    }
  }

  function handleClosePreviewPicker() {
    setIsPickerOpen(false)
  }

  async function handleAttachPreviewCandidate(candidate: AdminSegmentPreviewImageCandidate) {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsAttachingPreview(true)
    setPickerError(null)
    try {
      const res = await attachSegmentPreviewImage(
        animeId,
        editingSegment.id,
        { media_asset_id: candidate.media_asset_id },
        undefined,
        releaseVariantId,
      )
      await reload()
      setEditingSegment(res.data)
      setIsPickerOpen(false)
      showSuccessMessage('Vorschaubild aus Release-Bild übernommen.')
    } catch (err) {
      setPickerError(resolveErrorMessage(err, 'Release-Bild konnte nicht übernommen werden.'))
    } finally {
      setIsAttachingPreview(false)
    }
  }

  async function handleResetPreview() {
    if (!animeId || !editingSegment || !hasAuthSession) return
    setIsResettingPreview(true)
    setPreviewUploadError(null)
    try {
      const res = await resetSegmentPreviewImage(animeId, editingSegment.id, undefined, releaseVariantId)
      await reload()
      setEditingSegment(res.data)
      showSuccessMessage('Automatisches Vorschaubild wird wieder verwendet.')
    } catch (err) {
      setPreviewUploadError(resolveErrorMessage(err, 'Automatisches Bild konnte nicht wiederhergestellt werden.'))
    } finally {
      setIsResettingPreview(false)
    }
  }

  return {
    isUploadingPreview,
    previewUploadError,
    isPickerOpen,
    pickerCandidates,
    isLoadingPickerCandidates,
    pickerError,
    isAttachingPreview,
    isResettingPreview,
    successMessage,
    handlePreviewUpload,
    handleOpenPreviewPicker,
    handleClosePreviewPicker,
    handleAttachPreviewCandidate,
    handleResetPreview,
  }
}
