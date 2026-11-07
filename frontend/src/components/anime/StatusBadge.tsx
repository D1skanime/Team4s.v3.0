import { CheckCircle2, Clock, EyeOff, Shield, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui'
import { AnimeStatus } from '@/types/anime'

type AnimeStatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface StatusBadgeProps {
  status: AnimeStatus
}

/**
 * Ordnet jedem Anime-Status eine Badge-Variante und ein Icon zu.
 * Dieselbe Farbsemantik wie beim öffentlichen Fansub-Projektstatus
 * (laufend gelb, abgeschlossen grün, abgebrochen/archiviert rot) --
 * einheitliche Zuordnung, nur an dieser Stelle gepflegt.
 */
export const ANIME_STATUS_BADGE: Record<AnimeStatus, { label: string; variant: AnimeStatusBadgeVariant; icon: typeof Clock }> = {
  ongoing: { label: 'Laufend', variant: 'warning', icon: Clock },
  done: { label: 'Abgeschlossen', variant: 'success', icon: CheckCircle2 },
  aborted: { label: 'Abgebrochen', variant: 'danger', icon: XCircle },
  licensed: { label: 'Lizenziert', variant: 'info', icon: Shield },
  disabled: { label: 'Deaktiviert', variant: 'muted', icon: EyeOff },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant, icon: Icon } = ANIME_STATUS_BADGE[status]

  return (
    <Badge variant={variant}>
      <Icon size={14} />
      {label}
    </Badge>
  )
}
