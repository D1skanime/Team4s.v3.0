'use client'

import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Button, Card, SectionHeader } from '@/components/ui'

type ShellDemoMode = 'anonymous' | 'authenticated'

const demoUserWithAvatar = {
  displayName: 'Demo Nutzer',
  email: 'demo@team4s.de',
  avatarUrl: 'https://picsum.photos/seed/team4s/36/36',
}

const demoUserWithoutAvatar = {
  displayName: 'Demo Nutzer',
  email: 'demo@team4s.de',
}

export function AppShellDrawerDemoSection() {
  const [shellDemoMode, setShellDemoMode] = useState<ShellDemoMode>('authenticated')
  const [shellDemoAvatar, setShellDemoAvatar] = useState(true)

  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="09"
        title="Nav Drawer - Globale Shell"
        description="AppShell mit Slide-over Drawer, Dual-State (anonym/eingeloggt), Edge-Strip und Glassmorphism."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Button
          variant={shellDemoMode === 'anonymous' ? 'primary' : 'secondary'}
          onClick={() => setShellDemoMode('anonymous')}
        >
          Anonym anzeigen
        </Button>
        <Button
          variant={shellDemoMode === 'authenticated' ? 'primary' : 'secondary'}
          onClick={() => setShellDemoMode('authenticated')}
        >
          Eingeloggt anzeigen
        </Button>
        <Button variant="secondary" onClick={() => setShellDemoAvatar((current) => !current)}>
          Avatar-Bild {shellDemoAvatar ? 'an' : 'aus'}
        </Button>
      </div>

      <div
        style={{
          position: 'relative',
          height: 500,
          overflow: 'hidden',
          border: '1px solid var(--color-border, rgba(100, 116, 139, 0.22))',
          borderRadius: 12,
          transform: 'translateZ(0)',
        }}
      >
        <AppShell
          mode={shellDemoMode}
          currentPath="/anime"
          user={
            shellDemoMode === 'authenticated'
              ? shellDemoAvatar
                ? demoUserWithAvatar
                : demoUserWithoutAvatar
              : null
          }
          canAccessAdmin={false}
        >
          <div
            style={{
              minHeight: 500,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-text-muted, #64748b)',
              fontWeight: 700,
            }}
          >
            Seiteninhalt hier
          </div>
        </AppShell>
      </div>
    </Card>
  )
}
