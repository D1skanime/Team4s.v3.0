import { Card, EmptyState } from '@/components/ui'
import type { MediaOwnershipRow } from '@/types/media-ownership'

interface FansubMemberMediaBlockProps {
  mediaRows: MediaOwnershipRow[]
}

export function FansubMemberMediaBlock({ mediaRows }: FansubMemberMediaBlockProps) {
  const publicMemberMedia = mediaRows.filter(
    (r) => r.owner_type === 'member' && r.visibility === 'public' && r.review_status === 'approved',
  )

  if (publicMemberMedia.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Noch keine Medien hinterlegt"
        description="Diese Gruppe hat bisher keine öffentlichen Medien bereitgestellt."
      />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {publicMemberMedia.map((row) => (
        <Card key={`${row.owner_type}-${row.owner_id}-${row.media_category}`} variant="section">
          <strong>{row.media_category}</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Freigegebene Team-Erinnerung</span>
        </Card>
      ))}
    </div>
  )
}
