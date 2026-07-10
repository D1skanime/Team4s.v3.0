import { SectionHeader } from '@/components/ui'
import type { PublicFansubHistory } from '@/types/fansub'

import styles from './FansubPublicSections.module.css'

interface FansubHistorySectionProps {
  history: PublicFansubHistory[]
}

interface AchievementStyle {
  className: string
  icon: string
}

/**
 * AO8: Erfolge als Medaillen-Karten. Der event_type bestimmt Farbe + Icon
 * (milestone = Gold-Trophaee als "echter Erfolg", founding = Jubilaeum usw.).
 * Icons sind bewusst per Key gemappt, damit sie spaeter datengetrieben
 * (Backend liefert einen icon_key) austauschbar sind.
 */
const ACHIEVEMENT_BY_EVENT: Record<string, AchievementStyle> = {
  milestone: { className: 'achGold', icon: '🏆' },
  founding: { className: 'achPink', icon: '🎉' },
  rebranding: { className: 'achAccent', icon: '✨' },
  hiatus: { className: 'achMuted', icon: '⏸️' },
  disbanding: { className: 'achMuted', icon: '🕊️' },
  other: { className: 'achAccent', icon: '⭐' },
}

function achievementStyle(eventType: string): AchievementStyle {
  return ACHIEVEMENT_BY_EVENT[eventType] ?? ACHIEVEMENT_BY_EVENT.other
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
      <SectionHeader title="Historie & Erfolge" underline />
      <ol className={styles.achGrid}>
        {history.map((item) => {
          const style = achievementStyle(item.event_type)
          return (
            <li key={item.id} className={`${styles.ach} ${styles[style.className]}`}>
              <span className={styles.medal} aria-hidden="true">
                {style.icon}
              </span>
              <span className={styles.achBody}>
                <strong>{historyTitle(item)}</strong>
                {item.note ? <span className={styles.achNote}>{item.note}</span> : null}
              </span>
              {item.year ? <span className={styles.achYear}>{item.year}</span> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
