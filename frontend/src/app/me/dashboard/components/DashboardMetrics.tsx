import { HeroMetrics, SectionHeader } from '@/components/ui'
import type { OwnDashboardData } from '@/types/dashboard'

export interface DashboardMetricsProps {
  data: OwnDashboardData
}

/**
 * "Deine Zahlen" (D-03): fuenf feste Kennzahlen-Kacheln, ausschliesslich aus
 * OwnDashboardData gespeist (niemals getMyBadges() oder previous_contributions_count,
 * RESEARCH Pitfalls 1/2). Jeder Wert hat per Vertrag einen Default von 0 -- kein
 * Empty-State-Zweig noetig.
 */
export function DashboardMetrics({ data }: DashboardMetricsProps) {
  return (
    <section>
      <SectionHeader title="Deine Zahlen" />
      <HeroMetrics
        ariaLabel="Deine Kennzahlen"
        items={[
          { label: 'Punkte', value: data.total_points.toLocaleString('de-DE') },
          { label: 'Badges', value: data.badges_count },
          { label: 'Projekte', value: data.projects_count },
          { label: 'Hochgeladene Bilder', value: data.images_count },
          { label: 'Geschriebene Beiträge', value: data.contributions_count },
        ]}
      />
    </section>
  )
}
