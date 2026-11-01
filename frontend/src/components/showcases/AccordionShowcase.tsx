'use client'

import { Accordion, AvatarStack, Badge, Card, Text } from '@/components/ui'

import styles from './showcases.shared.module.css'

/**
 * Zeigt die Capability-Kategorien einer Fansub-Rolle als aufklappbare Kategorien (Accordion) --
 * jede Kategorie unabhängig schaltbar, Touch-Ziel >= 44 px, kein horizontaler Scroll. Der
 * AvatarStack über dem Accordion ordnet die Capability-Übersicht sichtbar den Rollenträgern zu,
 * die diese Rechte aktuell innehaben, statt als unverbundener Block darunter zu stehen.
 */
export function AccordionShowcase() {
  return (
    <Card variant="flat" title="Capability-Übersicht je Rolle" description="Aufklappbare Kategorien — unabhängig schaltbar, Touch-Ziel >= 44 px, kein horizontaler Scroll.">
      <div className={styles.stack}>
        <Text variant="meta">Zuständige Rollenträger</Text>
        <AvatarStack
          items={[
            { id: 1, label: 'C-Subs' },
            { id: 2, label: 'Honto' },
            { id: 3, label: 'Anime no Fansub' },
            { id: 4, label: 'Fansub 4' },
          ]}
        />
      </div>
      <Accordion
        items={[
          {
            id: 'uebers',
            title: 'Übersetzung',
            children: (
              <div className={styles.stack}>
                <Badge variant="success">Aktiv</Badge>
                <Text variant="body">Dieser Bereich zeigt Capability-Switches für die Übersetzungsrolle.</Text>
              </div>
            ),
          },
          {
            id: 'bearb',
            title: 'Bearbeitung & Qualitätssicherung',
            children: (
              <div className={styles.stack}>
                <Badge variant="info">Geplant</Badge>
                <Text variant="body">Bearbeitungs- und QS-Berechtigungen werden hier gesteuert.</Text>
              </div>
            ),
          },
          {
            id: 'veroefl',
            title: 'Veröffentlichung',
            children: (
              <div className={styles.stack}>
                <Badge variant="warning">Eingeschränkt</Badge>
                <Text variant="body">Veröffentlichungs-Capabilities sind nur für zuweisbare Rollen aktiv.</Text>
              </div>
            ),
          },
        ]}
      />
    </Card>
  )
}
