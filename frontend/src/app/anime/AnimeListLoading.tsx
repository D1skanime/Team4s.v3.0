import { LoadingState, PageHeader } from '@/components/ui'

import styles from './page.module.css'

/**
 * Ladezustand für die Anime-Listenseite.
 * Wird während des asynchronen Listeninhalts in einer expliziten Suspense angezeigt.
 */
export default function AnimeListLoading() {
  return (
    <main className={styles.page}>
      <PageHeader title="Anime" />
      <LoadingState title="Anime wird geladen" description="Bitte einen Moment warten." />
    </main>
  )
}
