import { Card, SectionHeader } from '@/components/ui'
import type { PublicFansubHistory } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubHistorySectionProps {
  history: PublicFansubHistory[]
}

function historyTitle(item: PublicFansubHistory): string {
  return item.title?.trim() || item.event_type
}

export function FansubHistorySection({ history }: FansubHistorySectionProps) {
  if (history.length === 0) {
    return null
  }

  return (
    <section id="erfolge">
      <SectionHeader title="Historie & Erfolge" />
      <ol className={styles.historyList}>
        {history.map((item) => (
          <li key={item.id}>
            <Card variant="flat" className={styles.milestoneEntry}>
              <div className={styles.historyEntry}>
                {item.year ? (
                  <strong className={styles.historyYear}>{item.year}</strong>
                ) : null}
                <div>
                  <strong>{historyTitle(item)}</strong>
                  {item.note ? (
                    <p className={styles.historyNote}>{item.note}</p>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  )
}
