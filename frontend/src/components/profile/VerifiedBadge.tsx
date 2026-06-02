import { CheckCircle } from 'lucide-react'

type VerifiedBadgeProps = {
  label?: string
}

export function VerifiedBadge({ label = 'Verifiziert' }: VerifiedBadgeProps) {
  return (
    <span
      aria-label="Verifiziertes Mitglied"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--color-success, #15803d)',
        fontSize: '14px',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      <CheckCircle size={18} color="var(--color-success, #15803d)" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
