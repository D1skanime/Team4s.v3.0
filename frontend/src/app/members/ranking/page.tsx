import Link from 'next/link'

import { EmptyState, ErrorState, getErrorStateCopy, PageHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { getMemberPointRanking } from '@/lib/api'
import { toNumber } from '@/lib/utils'

import { RankingPaginationNav } from './RankingPaginationNav'
import styles from './page.module.css'

// Backend-Seitengröße ist fix (member_point_totals_repository.go, memberRankingPageSize = 50).
const RANKING_PAGE_SIZE = 50

// Diese Route haengt vom page-Query-Parameter ab -- kein SSG-Caching.
export const dynamic = 'force-dynamic'

interface RankingPageProps {
  searchParams?: Promise<{ page?: string | string[] }>
}

interface ResolvedRankingSearchParams {
  page?: string | string[]
}

/**
 * Öffentliche Rangliste (D-01): Member -> Netto-Gesamtpunkte, absteigend sortiert.
 * Konsumiert die bereits paginierte Phase-109-Projektion getMemberPointRanking()
 * ohne Pro-Zeile-API-Fächer (SC-4). Der `page`-Parameter aus der URL ist nur der
 * angeforderte Wert; die verbindliche Begrenzung (<1->1, >1000->1000,
 * nicht-numerisch->1) lebt serverseitig in
 * MemberPointRankingHandler.GetMemberPointRanking (T-110-01). Für Rang-Nummern und
 * Pagination wird daher der vom Backend zurückgegebene, geklammerte `result.page`
 * verwendet — niemals der ungeklammerte URL-Wert (CR-01).
 */
export default async function MemberRankingPage({ searchParams }: RankingPageProps) {
  const resolved = ((await searchParams) ?? {}) as ResolvedRankingSearchParams
  const requestedPage = toNumber(resolved.page, 1)

  let result: Awaited<ReturnType<typeof getMemberPointRanking>> | null = null
  let fetchError: unknown = null

  try {
    result = await getMemberPointRanking(requestedPage)
  } catch (error) {
    fetchError = error
  }

  return (
    <main className={styles.page} aria-label="Rangliste">
      <PageHeader eyebrow="Community" title="Rangliste" />

      {fetchError ? (
        <ErrorState
          {...getErrorStateCopy(fetchError, {
            defaultTitle: 'Rangliste konnte nicht geladen werden',
            defaultDescription: 'Bitte versuche es später erneut.',
          })}
        />
      ) : result && result.data.length === 0 ? (
        <EmptyState
          title="Noch keine Punkte vergeben"
          description="Sobald Mitwirkende für akzeptierte Beiträge Punkte erhalten, erscheinen sie hier in der Rangliste."
        />
      ) : result ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Rang</TableHeaderCell>
                <TableHeaderCell scope="col">Name</TableHeaderCell>
                <TableHeaderCell scope="col">Punkte</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.data.map((row, index) => (
                <TableRow key={row.member_id}>
                  <TableCell>{(result.page - 1) * RANKING_PAGE_SIZE + index + 1}</TableCell>
                  <TableCell>
                    {row.slug !== null ? (
                      <Link href={`/members/${row.slug}`}>{row.display_name}</Link>
                    ) : (
                      <span>{row.display_name}</span>
                    )}
                  </TableCell>
                  <TableCell className={styles.pointsCell}>{row.total_points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <RankingPaginationNav currentPage={result.page} totalPages={Math.ceil(result.total / RANKING_PAGE_SIZE)} />
        </>
      ) : null}
    </main>
  )
}
