const EMBY_WEB_BASE_URL = 'https://anime.team4s.de/web/index.html'
const EMBY_SERVER_ID = '8bc8ae6fe2d946fcbd21cb341832072d'

const TEST_EMBY_SERIES_BY_ANIME_ID: Record<number, string> = {
  22: '2112',
}

function buildEmbyItemUrl(itemID: string): string {
  const query = new URLSearchParams({
    id: itemID,
    serverId: EMBY_SERVER_ID,
    context: 'tvshows',
  })
  return `${EMBY_WEB_BASE_URL}#!\/item?${query.toString()}`
}

export function getEmbySeriesUrlForAnime(animeID: number): string | null {
  const seriesID = TEST_EMBY_SERIES_BY_ANIME_ID[animeID]
  if (!seriesID) {
    return null
  }

  return buildEmbyItemUrl(seriesID)
}

export function getPreferredEmbyEpisodeUrl(animeID: number, streamLinks?: string[]): string | null {
  const explicitLink = (streamLinks || []).map((item) => item.trim()).find((item) => item.length > 0)
  if (explicitLink) {
    return explicitLink
  }

  return getEmbySeriesUrlForAnime(animeID)
}
