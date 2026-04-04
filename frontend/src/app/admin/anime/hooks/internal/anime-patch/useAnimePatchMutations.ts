import { Dispatch, SetStateAction, useCallback } from 'react'

import {
  addAdminAnimeBackgroundAsset,
  ApiError,
  assignAdminAnimeCoverAsset,
  assignAdminAnimeLogoAsset,
  assignAdminAnimeBannerAsset,
  assignAdminAnimeBackgroundVideoAsset,
  getAnimeByID,
  updateAdminAnime,
  uploadAdminAnimeMedia,
} from '@/lib/api'
import { AdminAnimeAssetKind, AdminAnimePatchRequest, AdminAnimeUploadAssetType, AnimeType } from '@/types/admin'
import { AnimeDetail, AnimeStatus, ContentType } from '@/types/anime'

import { AnimePatchClearFlags, AnimePatchValues } from '../../../types/admin-anime'
import { normalizeOptionalString, parsePositiveInt } from '../../../utils/anime-helpers'
import { formatAdminError } from '../../../utils/studio-helpers'

interface UseAnimePatchMutationsParams {
  authToken: string
  hasAuthToken: boolean
  values: AnimePatchValues
  clearFlags: AnimePatchClearFlags
  onSuccess: (anime: AnimeDetail) => void
  onError: (msg: string) => void
  options: { onRequest?: (value: string | null) => void; onResponse?: (value: string | null) => void }
  setIsSubmitting: Dispatch<SetStateAction<boolean>>
  setIsUploadingCover: Dispatch<SetStateAction<boolean>>
  setValues: Dispatch<SetStateAction<AnimePatchValues>>
  setClearFlags: Dispatch<SetStateAction<AnimePatchClearFlags>>
}

interface AnimeAssetMutationConfig {
  uploadAssetType: AdminAnimeUploadAssetType
  linkAsset: (animeID: number, mediaID: string, authToken: string) => Promise<unknown>
  errorMessage: string
}

const ANIME_ASSET_MUTATION_CONFIG: Record<AdminAnimeAssetKind, AnimeAssetMutationConfig> = {
  cover: {
    uploadAssetType: 'poster',
    linkAsset: assignAdminAnimeCoverAsset,
    errorMessage: 'Cover Upload fehlgeschlagen.',
  },
  banner: {
    uploadAssetType: 'banner',
    linkAsset: assignAdminAnimeBannerAsset,
    errorMessage: 'Banner Upload fehlgeschlagen.',
  },
  logo: {
    uploadAssetType: 'logo',
    linkAsset: assignAdminAnimeLogoAsset,
    errorMessage: 'Logo Upload fehlgeschlagen.',
  },
  background: {
    uploadAssetType: 'background',
    linkAsset: addAdminAnimeBackgroundAsset,
    errorMessage: 'Background Upload fehlgeschlagen.',
  },
  background_video: {
    uploadAssetType: 'background_video',
    linkAsset: assignAdminAnimeBackgroundVideoAsset,
    errorMessage: 'Background-Video Upload fehlgeschlagen.',
  },
}

async function uploadAndLinkAnimeAsset(
  file: File,
  animeID: number,
  authToken: string,
  assetKind: AdminAnimeAssetKind,
): Promise<string> {
  const config = ANIME_ASSET_MUTATION_CONFIG[assetKind]
  const upload = await uploadAdminAnimeMedia({
    animeID,
    assetType: config.uploadAssetType,
    file,
    authToken,
  })

  await config.linkAsset(animeID, upload.id, authToken)
  return upload.id
}

function buildAnimePatchPayload(values: AnimePatchValues, clearFlags: AnimePatchClearFlags, onError: (msg: string) => void): AdminAnimePatchRequest | null {
  const payload: AdminAnimePatchRequest = {}
  const title = normalizeOptionalString(values.title)
  if (title) payload.title = title
  if (values.type) payload.type = values.type as AnimeType
  if (values.contentType) payload.content_type = values.contentType as ContentType
  if (values.status) payload.status = values.status as AnimeStatus

  if (clearFlags.year) payload.year = null
  else if (values.year.trim()) {
    const year = parsePositiveInt(values.year)
    if (!year) {
      onError('year muss groesser als 0 sein')
      return null
    }
    payload.year = year
  }

  if (clearFlags.maxEpisodes) payload.max_episodes = null
  else if (values.maxEpisodes.trim()) {
    const maxEpisodes = parsePositiveInt(values.maxEpisodes)
    if (!maxEpisodes) {
      onError('max_episodes muss groesser als 0 sein')
      return null
    }
    payload.max_episodes = maxEpisodes
  }

  const titleDE = normalizeOptionalString(values.titleDE)
  const titleEN = normalizeOptionalString(values.titleEN)
  const genre = normalizeOptionalString(values.genreTokens.join(', '))
  const description = normalizeOptionalString(values.description)
  const coverImage = normalizeOptionalString(values.coverImage)

  if (clearFlags.titleDE) payload.title_de = null
  else if (titleDE) payload.title_de = titleDE

  if (clearFlags.titleEN) payload.title_en = null
  else if (titleEN) payload.title_en = titleEN

  if (clearFlags.genre) payload.genre = null
  else if (genre) payload.genre = genre

  if (clearFlags.description) payload.description = null
  else if (description) payload.description = description

  if (clearFlags.coverImage) payload.cover_image = null
  else if (coverImage) payload.cover_image = coverImage

  if (Object.keys(payload).length === 0) {
    onError('Mindestens ein Feld fuer das Update ausfuellen.')
    return null
  }

  return payload
}

export function useAnimePatchMutations({
  authToken,
  hasAuthToken,
  values,
  clearFlags,
  onSuccess,
  onError,
  options,
  setIsSubmitting,
  setIsUploadingCover,
  setValues,
  setClearFlags,
}: UseAnimePatchMutationsParams) {
  const submit = useCallback(
    async (animeID: number) => {
      // TODO: Re-enable auth check before production
      // if (!hasAuthToken) {
      //   onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      //   return
      // }

      const payload = buildAnimePatchPayload(values, clearFlags, onError)
      if (!payload) return

      try {
        setIsSubmitting(true)
        options.onRequest?.(JSON.stringify(payload, null, 2))
        const response = await updateAdminAnime(animeID, payload, authToken)
        options.onResponse?.(JSON.stringify(response, null, 2))
        const refreshed = await getAnimeByID(animeID, { include_disabled: true })
        onSuccess(refreshed.data)
      } catch (error) {
        if (error instanceof ApiError) onError(formatAdminError(error, 'Anime konnte nicht aktualisiert werden.'))
        else if (error instanceof Error) onError(error.message)
        else onError('Anime konnte nicht aktualisiert werden.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [authToken, clearFlags, hasAuthToken, onError, onSuccess, options, setIsSubmitting, values],
  )

  const uploadAndLinkAsset = useCallback(
    async (file: File, assetKind: AdminAnimeAssetKind, animeID?: number | null) => {
      if (!animeID) {
        onError('Anime-ID fehlt. Bitte zuerst einen Anime-Kontext laden.')
        return
      }

      const config = ANIME_ASSET_MUTATION_CONFIG[assetKind]

      try {
        setIsUploadingCover(true)
        const uploadedMediaID = await uploadAndLinkAnimeAsset(file, animeID, authToken, assetKind)
        if (assetKind === 'cover') {
          setValues((current) => ({ ...current, coverImage: uploadedMediaID }))
          setClearFlags((current) => ({ ...current, coverImage: false }))
        }

        const refreshed = await getAnimeByID(animeID, { include_disabled: true })
        onSuccess(refreshed.data)
      } catch (error) {
        if (error instanceof ApiError) {
          onError(formatAdminError(error, config.errorMessage))
        } else if (error instanceof Error) {
          onError(error.message)
        } else {
          onError(config.errorMessage)
        }
      } finally {
        setIsUploadingCover(false)
      }
    },
    [authToken, hasAuthToken, onError, onSuccess, setClearFlags, setIsUploadingCover, setValues],
  )

  const uploadAndSetCover = useCallback(
    async (file: File, animeID?: number | null) => {
      await uploadAndLinkAsset(file, 'cover', animeID)
    },
    [uploadAndLinkAsset],
  )

  return {
    submit,
    uploadAndLinkAsset,
    uploadAndSetCover,
  }
}

