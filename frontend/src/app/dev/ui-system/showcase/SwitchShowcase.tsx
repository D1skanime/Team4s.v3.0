'use client'

import { useState } from 'react'

import { Card, Switch } from '@/components/ui'

import styles from '../page.module.css'

export function SwitchShowcase() {
  const [switchBenachrichtigungen, setSwitchBenachrichtigungen] = useState(true)
  const [switchSichtbar, setSwitchSichtbar] = useState(false)

  return (
    <Card variant="flat" title="Switch-Primitiv" description="Globales Toggle-Primitiv mit role=switch und korrekten ARIA-Attributen.">
      <div className={styles.stack}>
        <Switch
          checked={switchBenachrichtigungen}
          onCheckedChange={setSwitchBenachrichtigungen}
          label="Benachrichtigungen aktiviert"
          aria-label="Benachrichtigungen umschalten"
        />
        <Switch
          checked={switchSichtbar}
          onCheckedChange={setSwitchSichtbar}
          label="Öffentlich sichtbar"
          aria-label="Öffentliche Sichtbarkeit umschalten"
        />
        <Switch
          checked={false}
          onCheckedChange={() => {}}
          label="Gesperrte Option"
          aria-label="Gesperrte Option"
          disabled
        />
      </div>
    </Card>
  )
}
