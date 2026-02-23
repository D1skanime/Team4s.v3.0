import Link from 'next/link'
import { cookies } from 'next/headers'

import { WatchlistList } from '@/components/watchlist/WatchlistList'
import { ApiError, AUTH_BEARER_TOKEN, AUTH_TOKEN_COOKIE_NAME, getWatchlist } from '@/lib/api'
import { toNumber } from '@/lib/utils'

import styles from './page.module.css'

interface WatchlistPageProps {
  searchParams: {
    page?: string | string[]
    per_page?: string | string[]
  }
}

export default async function WatchlistPage({ searchParams }: WatchlistPageProps) {
  const cookieStore = await cookies()
  const authTokenFromCookie = (cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value || '').trim()
  const authToken = authTokenFromCookie || AUTH_BEARER_TOKEN

  if (!authToken) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <header className={styles.header}>
          <h1 className={styles.title}>Watchlist</h1>
          <p className={styles.subtitle}>
            Anmeldung erforderlich. Erstelle ein Token auf <Link href="/auth">/auth</Link>.
          </p>
        </header>
      </main>
    )
  }

  const page = toNumber(searchParams.page, 1)
  const perPage = Math.max(1, Math.min(toNumber(searchParams.per_page, 20), 100))

  let response: Awaited<ReturnType<typeof getWatchlist>> | null = null
  let errorMessage: string | null = null
  try {
    response = await getWatchlist({ page, per_page: perPage }, authToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      errorMessage = 'Anmeldung abgelaufen oder ungueltig. Bitte auf /auth erneut anmelden.'
    } else if (error instanceof ApiError) {
      errorMessage = error.message
    } else {
      errorMessage = 'Watchlist konnte aktuell nicht geladen werden.'
    }
  }

  if (!response) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <div className={styles.errorBox}>
          <p>{errorMessage ?? 'Watchlist konnte aktuell nicht geladen werden.'}</p>
          <p>
            <Link href={`/watchlist?page=${page}&per_page=${perPage}`}>Erneut versuchen</Link>
            <span> | </span>
            <Link href="/auth">Zu /auth</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLink}>
        <Link href="/anime">Zur Anime-Liste</Link>
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>Watchlist</h1>
      </header>
      <WatchlistList items={response.data} meta={response.meta} page={page} perPage={perPage} />
    </main>
  )
}
