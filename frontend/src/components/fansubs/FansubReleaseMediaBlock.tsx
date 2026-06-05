import { Card, EmptyState } from '@/components/ui'
import type { MediaOwnershipRow } from '@/types/media-ownership'

interface FansubReleaseMediaBlockProps {
  mediaRows: MediaOwnershipRow[]
}

export function FansubReleaseMediaBlock({ mediaRows }: FansubReleaseMediaBlockProps) {
  const publicReleaseMedia = mediaRows.filter(
    (r) => r.owner_type === 'release_version' && r.visibility === 'public' && r.review_status === 'approved',
  )

  if (publicReleaseMedia.length === 0) {
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
      {publicReleaseMedia.map((row) => (
        <Card key={`${row.owner_type}-${row.owner_id}-${row.media_category}`} variant="section">
          <strong>{row.media_category}</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Freigegebener Release-Einblick</span>
        </Card>
      ))}
    </div>
  )
}
