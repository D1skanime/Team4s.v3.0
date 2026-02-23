import { CheckCircle, Clock, EyeOff, Shield, XCircle } from 'lucide-react'

import { AnimeStatus } from '@/types/anime'

import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  status: AnimeStatus
}

const statusConfig: Record<
  AnimeStatus,
  {
    label: string
    className: string
    icon: typeof Clock
  }
> = {
  disabled: {
    label: 'Deaktiviert',
    className: styles.disabled,
    icon: EyeOff,
  },
  ongoing: {
    label: 'Laufend',
    className: styles.ongoing,
    icon: Clock,
  },
  done: {
    label: 'Abgeschlossen',
    className: styles.done,
    icon: CheckCircle,
  },
  aborted: {
    label: 'Abgebrochen',
    className: styles.aborted,
    icon: XCircle,
  },
  licensed: {
    label: 'Lizenziert',
    className: styles.licensed,
    icon: Shield,
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={`${styles.badge} ${config.className}`}>
      <Icon size={14} />
      {config.label}
    </span>
  )
}
