import { notFound } from 'next/navigation'
import { parseReleaseDetailIDs, parseReleaseDetailSearchParams, ReleaseDetailPageContent } from './releaseDetailPageData'

interface Props {
  params: Promise<{ id: string; groupId: string; releaseVersionId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReleaseDetailCompatibilityPage({ params, searchParams }: Props) {
  const ids = parseReleaseDetailIDs(await params)
  if (!ids) return notFound()
  const deepLink = parseReleaseDetailSearchParams((await searchParams) ?? {})
  return <ReleaseDetailPageContent {...ids} {...deepLink} />
}
