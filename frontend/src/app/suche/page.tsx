import { EmptyState, PageHeader } from '@/components/ui'

import { SearchField } from './SearchField'
import styles from './page.module.css'

// Die Suche haengt vollstaendig von Query-Parametern ab (q/type/Filter/page).
// Daher wird Next.js gezwungen, die Seite nicht statisch vorzurendern.
export const dynamic = 'force-dynamic'

/** Roh-Suchparameter der Route (Next.js liefert sie als Promise-fähigen Wert). */
type RawSearchParams = Record<string, string | string[] | undefined>

/** Props der Suchseite mit optionalen, Promise-fähigen URL-Suchparametern. */
interface SearchPageProps {
  searchParams: Promise<RawSearchParams> | RawSearchParams | undefined
}

/** Liefert den ersten String-Wert eines evtl. mehrwertigen Query-Parameters. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/**
 * Globale Suchseite `/suche` — schlanke Route-Shell.
 *
 * Bootstrappt den URL-Suchzustand (q/type/Filter/page) als Initialwert und bettet das
 * interaktive Suchfeld (visueller Anker der Seite) samt gruppierter Vorschlagsliste ein.
 * Der Ergebnis-/Filterbereich wird in Plan 115-07 ergänzt — hier steht bewusst nur der
 * Initial-Leerzustand als Slot (kein toter Markup).
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = ((await searchParams) ?? {}) as RawSearchParams
  const initialQuery = firstValue(resolved.q).trim()

  return (
    <main className={styles.page}>
      <PageHeader
        title="Suche"
        description="Finde Anime und Fansubgruppen in einer gemeinsamen Suche."
      />

      <section className={styles.searchAnchor} aria-label="Suchfeld">
        <SearchField />
      </section>

      {/* Ergebnis-/Filterbereich folgt in Plan 115-07 (erweitert diese Seite). */}
      {initialQuery.length === 0 ? (
        <div className={styles.resultsSlot}>
          <EmptyState
            title="Wonach suchst du?"
            description="Gib einen Anime-Titel oder eine Fansubgruppe ein, um loszulegen."
          />
        </div>
      ) : null}
    </main>
  )
}
