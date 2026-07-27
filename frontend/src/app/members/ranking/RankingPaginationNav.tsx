'use client'

import { useRouter } from 'next/navigation'

import { Pagination } from '@/components/ui'

export interface RankingPaginationNavProps {
  currentPage: number
  totalPages: number
}

/**
 * Wrapt die callback-basierte @/components/ui Pagination als Router-Navigation
 * für die SSR-Rangliste (`/members/ranking`) — Seite 1 hat keinen Query-String,
 * alle weiteren Seiten navigieren via `?page={n}` (D-01, kein Client-Fetch).
 */
export function RankingPaginationNav({ currentPage, totalPages }: RankingPaginationNavProps) {
  const router = useRouter()

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={(page) => router.push(page > 1 ? `/members/ranking?page=${page}` : '/members/ranking')}
    />
  )
}
