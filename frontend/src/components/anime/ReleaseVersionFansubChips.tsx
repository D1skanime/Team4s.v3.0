'use client'

import { Badge } from '@/components/ui'
import type { FansubGroupSummary } from '@/types/fansub'

import styles from './ReleaseVersionFansubChips.module.css'

interface ReleaseVersionFansubChipsProps {
  groups: FansubGroupSummary[]
}

export default function ReleaseVersionFansubChips({
  groups,
}: ReleaseVersionFansubChipsProps) {
  if (!groups || groups.length === 0) {
    return null
  }

  const sorted = [...groups].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    if (nameCompare !== 0) return nameCompare
    return a.id - b.id
  })

  return (
    <div className={styles.fansubChips}>
      {sorted.map((group) => (
        <Badge key={group.id} variant="neutral" role="status">
          {group.name}
        </Badge>
      ))}
    </div>
  )
}
