'use client'

import { Accordion, Badge, Card } from '@/components/ui'

import styles from '../page.module.css'

export function AccordionShowcase() {
  return (
    <Card variant="flat" title="Accordion-Primitiv" description="Aufklappbare Kategorien — unabhängig schaltbar, Touch-Ziel >= 44 px, kein horizontaler Scroll.">
      <Accordion
        items={[
          {
            id: 'uebers',
            title: 'Übersetzung',
            children: (
              <div className={styles.stack}>
                <Badge variant="success">Aktiv</Badge>
                <p>Dieser Bereich zeigt Capability-Switches für die Übersetzungsrolle.</p>
              </div>
            ),
          },
          {
            id: 'bearb',
            title: 'Bearbeitung & Qualitätssicherung',
            children: (
              <div className={styles.stack}>
                <Badge variant="info">Geplant</Badge>
                <p>Bearbeitungs- und QS-Berechtigungen werden hier gesteuert.</p>
              </div>
            ),
          },
          {
            id: 'veroefl',
            title: 'Veröffentlichung',
            children: (
              <div className={styles.stack}>
                <Badge variant="warning">Eingeschränkt</Badge>
                <p>Veröffentlichungs-Capabilities sind nur für zuweisbare Rollen aktiv.</p>
              </div>
            ),
          },
        ]}
      />
    </Card>
  )
}
