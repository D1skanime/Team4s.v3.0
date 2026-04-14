/** Basis-URL der Emby-Web-Oberfläche auf dem Team4s-Server. */
const EMBY_WEB_BASE_URL = 'https://anime.team4s.de/web/index.html'

/** Feste Server-ID des Team4s-Emby-Servers, wird für Deep-Links benötigt. */
const EMBY_SERVER_ID = '8bc8ae6fe2d946fcbd21cb341832072d'

/**
 * Testmapping von internen Anime-IDs auf die zugehörigen Emby-Series-IDs.
 * Wird als Fallback verwendet, wenn keine expliziten Stream-Links vorhanden sind.
 */
const TEST_EMBY_SERIES_BY_ANIME_ID: Record<number, string> = {
  22: '2112',
}

/**
 * Baut einen direkten Deep-Link zur Emby-Detailseite einer Serie auf.
 *
 * @param itemID - Interne Emby-Item-ID der Serie
 * @returns Vollständige URL zur Emby-Web-Oberfläche für diesen Eintrag
 */
function buildEmbyItemUrl(itemID: string): string {
  const query = new URLSearchParams({
    id: itemID,
    serverId: EMBY_SERVER_ID,
    context: 'tvshows',
  })
  return `${EMBY_WEB_BASE_URL}#!\/item?${query.toString()}`
}

/**
 * Gibt die Emby-Serien-URL für einen Anime zurück, sofern eine Zuordnung bekannt ist.
 * Gibt null zurück, wenn keine Emby-Series-ID für die angegebene Anime-ID hinterlegt ist.
 *
 * @param animeID - Interne Anime-ID des Team4s-Systems
 * @returns Emby-Deep-Link oder null
 */
export function getEmbySeriesUrlForAnime(animeID: number): string | null {
  const seriesID = TEST_EMBY_SERIES_BY_ANIME_ID[animeID]
  if (!seriesID) {
    return null
  }

  return buildEmbyItemUrl(seriesID)
}

/**
 * Ermittelt die bevorzugte Emby-Episode-URL für einen Anime.
 * Bevorzugt explizite Stream-Links aus der Datenbank; fällt auf die Serien-URL zurück,
 * wenn keine expliziten Links vorhanden sind.
 *
 * @param animeID - Interne Anime-ID des Team4s-Systems
 * @param streamLinks - Optionale Liste manuell hinterlegter Stream-URLs
 * @returns Bevorzugte Stream-URL oder null
 */
export function getPreferredEmbyEpisodeUrl(animeID: number, streamLinks?: string[]): string | null {
  const explicitLink = (streamLinks || []).map((item) => item.trim()).find((item) => item.length > 0)
  if (explicitLink) {
    return explicitLink
  }

  return getEmbySeriesUrlForAnime(animeID)
}
