import Image from 'next/image'
import Link from 'next/link'

import { EmptyState, ErrorState, getErrorStateCopy, initials, PageHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { getFansubList, resolveApiUrl } from '@/lib/api'

import styles from './page.module.css'

// Diese Route haengt vom vollstaendigen Fansub-Gruppen-Bestand ab -- kein SSG-Caching.
export const dynamic = 'force-dynamic'

/**
 * Öffentliche Fansub-Gruppen-Übersicht (D-02): listet alle Fansub-Gruppen in
 * einer Tabelle, sortiert nach release_versions_count absteigend mit
 * Gruppenname aufsteigend als Tie-Break (D-05). Konsumiert getFansubList()
 * einmalig mit per_page=500, um den Backend-Default von 24 nicht still
 * abzuschneiden -- kein Pro-Zeile-API-Fächer.
 */
export default async function FansubsPage() {
  let result: Awaited<ReturnType<typeof getFansubList>> | null = null
  let fetchError: unknown = null

  try {
    result = await getFansubList({ per_page: 500 })
  } catch (error) {
    fetchError = error
  }

  const sorted = result
    ? [...result.data].sort((a, b) => b.release_versions_count - a.release_versions_count || a.name.localeCompare(b.name, 'de'))
    : []

  return (
    <main className={styles.page} aria-label="Fansub-Gruppen">
      <PageHeader
        title="Fansub-Gruppen"
        description="Alle Fansub-Gruppen im Überblick — sortiert nach aktivsten Gruppen zuerst."
      />

      {fetchError ? (
        <ErrorState
          {...getErrorStateCopy(fetchError, {
            defaultTitle: 'Fehler beim Laden',
            defaultDescription: 'Die Fansub-Gruppen konnten nicht geladen werden.',
          })}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Noch keine Fansub-Gruppen"
          description="Sobald Fansub-Gruppen angelegt sind, erscheinen sie hier in der Übersicht."
        />
      ) : (
        <Table variant="selectable">
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">Fansub-Gruppe</TableHeaderCell>
              <TableHeaderCell scope="col">Anime-Projekte</TableHeaderCell>
              <TableHeaderCell scope="col">Release-Versionen</TableHeaderCell>
              <TableHeaderCell scope="col">Mitglieder</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <span className={styles.logoCell}>
                    {group.logo_url ? (
                      <Image
                        src={resolveApiUrl(group.logo_url)}
                        alt=""
                        width={32}
                        height={32}
                        className={styles.logoImage}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.logoInitials} aria-hidden="true">{initials(group.name)}</span>
                    )}
                    <Link href={`/fansubs/${group.slug}`}>{group.name}</Link>
                  </span>
                </TableCell>
                <TableCell>{group.projects_count}</TableCell>
                <TableCell>{group.release_versions_count}</TableCell>
                <TableCell>{group.members_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
