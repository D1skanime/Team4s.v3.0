import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  letter?: string
  perPage?: number
  contentType?: string
  status?: string
  baseUrl?: string
}

function pageHref(
  page: number,
  params: { letter?: string; perPage?: number; contentType?: string; status?: string; baseUrl?: string },
): string {
  const query = new URLSearchParams()
  query.set('page', String(page))
  if (params.letter) query.set('letter', params.letter)
  if (params.perPage) query.set('per_page', String(params.perPage))
  if (params.contentType) query.set('content_type', params.contentType)
  if (params.status) query.set('status', params.status)
  const base = params.baseUrl ?? '/anime'
  return `${base}?${query.toString()}`
}

export function Pagination({ currentPage, totalPages, letter, perPage, contentType, status, baseUrl }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const from = Math.max(1, currentPage - 2)
  const to = Math.min(totalPages, currentPage + 2)
  const pages: number[] = []

  for (let page = from; page <= to; page += 1) {
    pages.push(page)
  }

  return (
    <nav className={styles.nav} aria-label="Seitennavigation">
      <Link
        href={pageHref(Math.max(1, currentPage - 1), { letter, perPage, contentType, status, baseUrl })}
        className={styles.button}
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft size={16} />
        Zurueck
      </Link>

      <div className={styles.pages}>
        {pages.map((page) => (
          <Link
            key={page}
            href={pageHref(page, { letter, perPage, contentType, status, baseUrl })}
            className={`${styles.page} ${page === currentPage ? styles.active : ''}`}
          >
            {page}
          </Link>
        ))}
      </div>

      <Link
        href={pageHref(Math.min(totalPages, currentPage + 1), { letter, perPage, contentType, status, baseUrl })}
        className={styles.button}
        aria-disabled={currentPage === totalPages}
      >
        Weiter
        <ChevronRight size={16} />
      </Link>
    </nav>
  )
}
