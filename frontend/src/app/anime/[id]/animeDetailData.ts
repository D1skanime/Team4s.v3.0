import { cache } from 'react'
import { notFound } from 'next/navigation'

import { ApiError, getAnimeByID } from '@/lib/api'

// Page and metadata share the same public resource snapshot for this server render.
const getCachedAnimeByID = cache(getAnimeByID)

export async function loadAnimeDetail(rawID: string) {
  if (!/^[0-9]+$/.test(rawID)) notFound()
  const animeID = Number(rawID)
  if (!Number.isSafeInteger(animeID) || animeID <= 0) notFound()

  try {
    return (await getCachedAnimeByID(animeID)).data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}
