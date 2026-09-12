import { FileText, Image as ImageIcon, type LucideIcon, Package, Users } from 'lucide-react'

import type { ProjectMemberCounts } from '@/types/projectMember'

import styles from './ProjectMemberSummary.module.css'

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

const SUMMARY_ENTRIES: {
  key: keyof ProjectMemberCounts
  icon: LucideIcon
  singular: string
  plural: string
}[] = [
  { key: 'roles', icon: Users, singular: 'Rolle', plural: 'Rollen' },
  { key: 'notes', icon: FileText, singular: 'Beitrag', plural: 'Beiträge' },
  { key: 'media', icon: ImageIcon, singular: 'Medium', plural: 'Medien' },
  { key: 'releases', icon: Package, singular: 'Release', plural: 'Releases' },
]

// Kompakte Statistikleiste (Referenzdesign 157-02, Workstream B): EINE Karte mit vier
// Icon+Zahl+Label-Einträgen in der Reihenfolge Rolle(n)/Beiträge/Medien/Releases, korrektes
// deutsches Singular/Plural (0 und >1 nutzen jeweils die Pluralform).
export function ProjectMemberSummaryBar({ counts }: { counts: ProjectMemberCounts }) {
  return (
    <div className={styles.summary}>
      {SUMMARY_ENTRIES.map((entry) => {
        const Icon = entry.icon
        const value = counts[entry.key]
        const label = pluralize(value, entry.singular, entry.plural)
        return (
          <div key={entry.key} className={styles.summaryEntry}>
            <span className={styles.summaryIcon} aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className={styles.summaryText}>
              <div className={styles.summaryValue}>{value}</div>
              <div className={styles.summaryLabel}>{label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
