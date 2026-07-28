import { PageHeader } from '@/components/ui'

import { SearchField } from './SearchField'
import { SearchFilterDrawer } from './SearchFilterDrawer'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import styles from './page.module.css'

// Die Suche haengt vollstaendig von Query-Parametern ab (q/type/Filter/page). Zusammen mit
// den client-seitigen useSearchParams-Instanzen erzwingt das dynamisches Rendering.
export const dynamic = 'force-dynamic'

/**
 * Globale Suchseite `/suche` — Route-Shell + Komposition der Such-Oberfläche.
 *
 * Oben der visuelle Anker (`SearchField` mit Vorschlägen), darunter die Ergebnis- und
 * Filterfläche: Desktop-Filter (`SearchFilters`) bzw. mobiler `SearchFilterDrawer` über den
 * URL-gebundenen Ergebnis-Tabs (`SearchResults`). Alle Teilkomponenten teilen sich den
 * Suchzustand (q/type/Filter/page) über die URL (`useDebouncedSearch`), sind also per Link
 * teilbar und reload-fest. Die Unterscheidung Initial-Leerzustand vs. „keine Treffer" liegt
 * in `SearchResults` (abhängig von der Suchbegriff-Länge) — die Filterleiste bleibt dabei
 * flächenstabil (kein Layout-Shift zwischen Lade- und Ergebniszustand).
 */
export default function SearchPage() {
  return (
    <main className={styles.page}>
      <PageHeader
        title="Suche"
        description="Finde Anime und Fansubgruppen in einer gemeinsamen Suche."
      />

      <section className={styles.searchAnchor} aria-label="Suchfeld">
        <SearchField />
      </section>

      <section className={styles.resultsRegion} aria-label="Suchergebnisse">
        <div className={styles.filterBar}>
          <div className={styles.filterDesktop}>
            <SearchFilters />
          </div>
          <div className={styles.filterMobile}>
            <SearchFilterDrawer />
          </div>
        </div>

        <SearchResults />
      </section>
    </main>
  )
}
