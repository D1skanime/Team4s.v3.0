import { NextResponse } from 'next/server'

import { AUTH_DISPLAY_NAME_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, AUTH_TOKEN_COOKIE_NAME } from '@/lib/api'

/** Typalias für eine fetch-ähnliche Funktion, die eine HTTP-Anfrage durchführt. */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/**
 * Rohdaten der Token-Refresh-Antwort aus der API.
 * Alle Felder sind optional, da die API-Antwort unvollständig sein kann.
 */
interface TokenRefreshResponseData {
  access_token?: string
  access_token_expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  display_name?: string
}

/**
 * Wrapper-Struktur der Token-Refresh-API-Antwort.
 */
interface TokenRefreshResponse {
  data?: TokenRefreshResponseData
}

/**
 * Repräsentiert eine erfolgreich erneuerte Auth-Session mit allen Token-Daten.
 * Wird nach einem Token-Refresh zurückgegeben und zum Setzen neuer Cookies verwendet.
 */
export interface RefreshedAuthSession {
  accessToken: string
  accessTokenExpiresIn: number
  refreshToken: string
  refreshTokenExpiresIn: number
  displayName: string
}

/**
 * Ergebnis eines Grant-Token-Anfrage-Versuchs.
 * Enthält das Grant-Token (leer bei Fehler) und eine Kennzeichnung, ob der Fehler ein 401 war.
 */
interface GrantAttemptResult {
  grantToken: string
  unauthorized: boolean
}

/**
 * Eingabeparameter für die Stream-Relay-Ziel-Auflösung.
 * Fasst alle nötigen Token, URLs und den optionalen fetch-Ersatz zusammen.
 */
interface ResolveStreamRelayTargetArgs {
  apiBaseURL: string
  streamPath: string
  grantPath: string
  providedGrant: string
  accessToken: string
  fallbackAccessToken?: string
  refreshToken: string
  fetchImpl?: FetchLike
}

/**
 * Ergebnis der Stream-Relay-Ziel-Auflösung.
 * Enthält die endgültige Ziel-URL, den Authorization-Header-Wert und
 * eine ggf. erneuerte Session für Cookie-Updates.
 */
export interface ResolveStreamRelayTargetResult {
  targetURL: string
  authorizationToken: string
  refreshedSession: RefreshedAuthSession | null
}

/**
 * Normalisiert einen numerischen Wert zu einer positiven ganzen Zahl.
 * Gibt 0 zurück, wenn der Wert nicht endlich oder nicht positiv ist.
 *
 * @param value - Beliebiger Eingabewert
 * @returns Positive ganze Zahl oder 0
 */
function normalizePositiveInt(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 0
  }
  return Math.floor(numberValue)
}

/**
 * Fordert ein kurzlebiges Grant-Token vom Backend an.
 * Das Grant-Token wird verwendet, um den Stream-Relay-Zugriff zu autorisieren,
 * ohne den Bearer-Token direkt im Stream-Request mitzuschicken.
 *
 * @param apiBaseURL - Basis-URL der API
 * @param grantPath - API-Pfad für den Grant-Token-Endpunkt
 * @param accessToken - Gültiger Access-Token für die Authentifizierung
 * @param fetchImpl - Fetch-Implementierung (Standard: globales fetch)
 * @returns Grant-Token und Kennzeichnung ob ein 401-Fehler aufgetreten ist
 */
async function requestGrantToken(
  apiBaseURL: string,
  grantPath: string,
  accessToken: string,
  fetchImpl: FetchLike,
): Promise<GrantAttemptResult> {
  if (!accessToken) {
    return { grantToken: '', unauthorized: false }
  }

  let response: Response
  try {
    response = await fetchImpl(`${apiBaseURL}${grantPath}`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
      cache: 'no-store',
    })
  } catch {
    return { grantToken: '', unauthorized: false }
  }

  if (!response.ok) {
    return {
      grantToken: '',
      unauthorized: response.status === 401,
    }
  }

  try {
    const body = (await response.json()) as {
      data?: {
        grant_token?: string
      }
    }
    const grantToken = (body.data?.grant_token || '').trim()
    return {
      grantToken,
      unauthorized: false,
    }
  } catch {
    return { grantToken: '', unauthorized: false }
  }
}

/**
 * Erneuert die Auth-Session über das Refresh-Token.
 * Sendet einen POST-Request an den Token-Refresh-Endpunkt und gibt bei Erfolg
 * eine neue Session mit rotiertem Access- und Refresh-Token zurück.
 *
 * @param apiBaseURL - Basis-URL der API
 * @param refreshToken - Gültiges Refresh-Token
 * @param fetchImpl - Fetch-Implementierung (Standard: globales fetch)
 * @returns Erneuerte Auth-Session oder null bei Fehler
 */
async function refreshSession(
  apiBaseURL: string,
  refreshToken: string,
  fetchImpl: FetchLike,
): Promise<RefreshedAuthSession | null> {
  if (!refreshToken) {
    return null
  }

  let response: Response
  try {
    response = await fetchImpl(`${apiBaseURL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      cache: 'no-store',
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  let payload: TokenRefreshResponse
  try {
    payload = (await response.json()) as TokenRefreshResponse
  } catch {
    return null
  }

  const data = payload.data || {}
  const accessToken = (data.access_token || '').trim()
  const rotatedRefreshToken = (data.refresh_token || '').trim()
  const displayName = (data.display_name || '').trim()
  const accessTokenExpiresIn = normalizePositiveInt(data.access_token_expires_in)
  const refreshTokenExpiresIn = normalizePositiveInt(data.refresh_token_expires_in)

  if (!accessToken || !rotatedRefreshToken || accessTokenExpiresIn === 0 || refreshTokenExpiresIn === 0) {
    return null
  }

  return {
    accessToken,
    accessTokenExpiresIn,
    refreshToken: rotatedRefreshToken,
    refreshTokenExpiresIn,
    displayName,
  }
}

/**
 * Baut die Stream-Ziel-URL mit einem angehängten Grant-Token auf.
 * Gibt die Stream-URL unverändert zurück, wenn kein Grant-Token vorhanden ist.
 *
 * @param streamURL - Basis-URL des Streams
 * @param grantToken - Einmaliges Grant-Token zur Autorisierung
 * @returns Stream-URL mit angehängtem `grant`-Parameter oder unveränderter URL
 */
function buildGrantTarget(streamURL: string, grantToken: string): string {
  if (!grantToken) return streamURL
  return `${streamURL}?grant=${encodeURIComponent(grantToken)}`
}

/**
 * Löst das Stream-Relay-Ziel auf und ermittelt die beste Authentifizierungsmethode.
 *
 * Strategie (in dieser Reihenfolge):
 * 1. Wenn ein vorhandenes Grant-Token mitgegeben wird, wird es direkt verwendet.
 * 2. Falls kein Access-Token vorhanden, wird das Fallback-Token oder ein Refresh versucht.
 * 3. Ein Grant-Token wird angefordert; bei 401 wird die Session refresht und nochmals versucht.
 * 4. Schlägt alles fehl, wird der Stream-URL mit Bearer-Token im Authorization-Header zurückgegeben.
 *
 * @param args - Alle nötigen URLs, Tokens und optionaler fetch-Ersatz
 * @returns Aufgelöste Ziel-URL, optionaler Authorization-Token und ggf. erneuerte Session
 */
export async function resolveStreamRelayTarget(
  args: ResolveStreamRelayTargetArgs,
): Promise<ResolveStreamRelayTargetResult> {
  const fetchImpl = args.fetchImpl || fetch
  const streamURL = `${args.apiBaseURL}${args.streamPath}`
  const providedGrant = args.providedGrant.trim()
  if (providedGrant) {
    return {
      targetURL: buildGrantTarget(streamURL, providedGrant),
      authorizationToken: '',
      refreshedSession: null,
    }
  }

  let refreshedSession: RefreshedAuthSession | null = null
  let activeAccessToken = args.accessToken.trim()
  const fallbackAccessToken = (args.fallbackAccessToken || '').trim()
  const activeRefreshToken = args.refreshToken.trim()
  let usingFallbackAccessToken = false

  if (!activeAccessToken && fallbackAccessToken) {
    activeAccessToken = fallbackAccessToken
    usingFallbackAccessToken = true
  }

  if (!activeAccessToken && activeRefreshToken) {
    refreshedSession = await refreshSession(args.apiBaseURL, activeRefreshToken, fetchImpl)
    if (refreshedSession) {
      activeAccessToken = refreshedSession.accessToken
      usingFallbackAccessToken = false
    }
  }

  let grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)

  if (!grantAttempt.grantToken && grantAttempt.unauthorized && activeRefreshToken) {
    if (!refreshedSession) {
      refreshedSession = await refreshSession(args.apiBaseURL, activeRefreshToken, fetchImpl)
      if (refreshedSession) {
        activeAccessToken = refreshedSession.accessToken
        usingFallbackAccessToken = false
      }
    }
    grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)
  }

  if (!grantAttempt.grantToken && grantAttempt.unauthorized && !usingFallbackAccessToken && fallbackAccessToken) {
    activeAccessToken = fallbackAccessToken
    usingFallbackAccessToken = true
    grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)
  }

  if (grantAttempt.grantToken) {
    return {
      targetURL: buildGrantTarget(streamURL, grantAttempt.grantToken),
      authorizationToken: '',
      refreshedSession,
    }
  }

  return {
    targetURL: streamURL,
    authorizationToken: activeAccessToken,
    refreshedSession,
  }
}

/**
 * Schreibt die erneuerten Auth-Cookies in die NextResponse, falls eine neue Session vorliegt.
 * Setzt Access-Token, Refresh-Token und optional den Anzeigenamen als Cookies.
 * Hat keine Wirkung, wenn `session` null ist.
 *
 * @param response - Next.js-Response-Objekt, in das die Cookies geschrieben werden
 * @param session - Erneuerte Auth-Session oder null
 */
export function applyRefreshedAuthCookies(response: NextResponse, session: RefreshedAuthSession | null): void {
  if (!session) {
    return
  }

  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, session.accessToken, {
    path: '/',
    sameSite: 'lax',
    maxAge: session.accessTokenExpiresIn,
  })
  response.cookies.set(AUTH_REFRESH_COOKIE_NAME, session.refreshToken, {
    path: '/',
    sameSite: 'lax',
    maxAge: session.refreshTokenExpiresIn,
  })
  if (session.displayName) {
    response.cookies.set(AUTH_DISPLAY_NAME_COOKIE_NAME, session.displayName, {
      path: '/',
      sameSite: 'lax',
      maxAge: session.refreshTokenExpiresIn,
    })
  }
}
