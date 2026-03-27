import { getAnimeByID } from '@/lib/api'

import { AdminAnimeEditPageClient } from '../../components/AnimeEditPage/AdminAnimeEditPageClient'
import { formatAdminError } from '../../utils/studio-helpers'

interface AdminAnimeEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminAnimeEditPage({ params }: AdminAnimeEditPageProps) {
  const { id } = await params
  const animeID = Number.parseInt(id, 10)

  if (!Number.isFinite(animeID) || animeID <= 0) {
    return (
      <AdminAnimeEditPageClient
        animeID={null}
        initialAnime={null}
        initialError="Ungueltige Anime-ID."
      />
    )
  }

  try {
    const response = await getAnimeByID(animeID, { include_disabled: true })
    return <AdminAnimeEditPageClient animeID={animeID} initialAnime={response.data} initialError={null} />
  } catch (error) {
    return (
      <AdminAnimeEditPageClient
        animeID={animeID}
        initialAnime={null}
        initialError={formatAdminError(error, 'Anime konnte nicht geladen werden.')}
      />
    )
  }
}
