import { Card, EmptyState } from '@/components/ui'
import type { FansubGroup } from '@/types/fansub'
import type { MediaOwnershipRow } from '@/types/media-ownership'

interface FansubGroupMediaBlockProps {
  mediaRows: MediaOwnershipRow[]
  group: Pick<FansubGroup, 'id'>
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
      r.owner_type === 'fansub_group' &&
      r.visibility === 'public' &&
      r.review_status === 'approved',
  )

  if (publicGroupMedia.length > 0) {
    return renderMediaRows(publicGroupMedia)
  }

  return (
    <EmptyState
      variant="compact"
      title="Noch keine Medien hinterlegt"
      description="Diese Gruppe hat bisher keine öffentlichen Medien bereitgestellt."
    />
  )
}
