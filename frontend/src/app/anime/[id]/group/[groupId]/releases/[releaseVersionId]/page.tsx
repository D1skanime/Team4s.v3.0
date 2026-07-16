import { notFound } from 'next/navigation'
import { parseReleaseDetailIDs, ReleaseDetailPageContent } from './releaseDetailPageData'

interface Props { params: { id: string; groupId: string; releaseVersionId: string } | Promise<{ id: string; groupId: string; releaseVersionId: string }> }

export default async function ReleaseDetailCompatibilityPage({ params }: Props) {
  const ids = parseReleaseDetailIDs(await params)
  if (!ids) return notFound()
  return <ReleaseDetailPageContent {...ids} />
}
