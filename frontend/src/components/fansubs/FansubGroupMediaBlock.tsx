import Image from 'next/image'

import { Card, EmptyState } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'
import type { MediaOwnershipRow } from '@/types/media-ownership'

interface FansubGroupMediaBlockProps {
  mediaRows: MediaOwnershipRow[]
  group: Pick<FansubGroup, 'id' | 'logo_url' | 'banner_url'>
}

function renderMediaRows(mediaRows: MediaOwnershipRow[]) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {mediaRows.map((row) => (
        <Card key={`${row.owner_type}-${row.owner_id}-${row.media_category}`} variant="section">
          <strong>{row.media_category}</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Freigegebenes Gruppenmedium</span>
        </Card>
      ))}
    </div>
  )
}

export function FansubGroupMediaBlock({ mediaRows, group }: FansubGroupMediaBlockProps) {
  const publicGroupMedia = mediaRows.filter(
    (r) =>
      (r.owner_type === 'group' || r.owner_type === 'fansub_group') &&
      r.visibility === 'public' &&
      r.review_status === 'approved',
  )

  if (publicGroupMedia.length > 0) {
    return renderMediaRows(publicGroupMedia)
  }

  if (publicGroupMedia.length === 0 && (group.logo_url || group.banner_url)) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {group.logo_url ? (
          <Image src={group.logo_url} alt="Gruppenlogo" width={160} height={160} unoptimized />
        ) : null}
        {group.banner_url ? (
          <Image src={group.banner_url} alt="Gruppenbanner" width={480} height={180} unoptimized />
        ) : null}
      </div>
    )
  }

  return (
    <EmptyState
      variant="compact"
      title="Noch keine Medien hinterlegt"
      description="Diese Gruppe hat bisher keine öffentlichen Medien bereitgestellt."
    />
  )
}
