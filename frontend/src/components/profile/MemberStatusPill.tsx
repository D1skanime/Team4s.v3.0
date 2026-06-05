import { Badge } from '@/components/ui'

export type MemberStatus = 'active' | 'historical' | 'unclaimed' | 'claimed' | 'memorial'

interface MemberStatusPillProps {
  status: MemberStatus
}

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; tooltip: string; variant: 'success' | 'muted' | 'warning' | 'info' | 'danger' }
> = {
  active: {
    label: 'Aktiv',
    tooltip: 'Dieses Mitglied ist aktuell aktiv in der Fansub-Szene.',
    variant: 'success',
  },
  historical: {
    label: 'Historisch',
    tooltip: 'Dieses Profil ist ein historisches Archivprofil (nicht mehr aktiv).',
    variant: 'muted',
  },
  unclaimed: {
    label: 'Nicht beansprucht',
    tooltip: 'Dieses Profil wurde noch nicht von einem registrierten Nutzer beansprucht.',
    variant: 'warning',
  },
  claimed: {
    label: 'Beansprucht',
    tooltip: 'Dieses Profil ist einem registrierten Nutzer zugeordnet.',
    variant: 'info',
  },
  memorial: {
    label: 'Gedenkprofil',
    tooltip:
      'Dieses Profil wird als historisches Gedenkprofil geführt und kann nicht beansprucht werden.',
    variant: 'muted',
  },
}

export function MemberStatusPill({ status }: MemberStatusPillProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} title={config.tooltip}>
      {config.label}
    </Badge>
  )
}
