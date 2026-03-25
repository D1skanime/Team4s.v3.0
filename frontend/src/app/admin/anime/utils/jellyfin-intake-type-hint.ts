import type { AdminJellyfinIntakeTypeHint, JellyfinIntakeConfidence } from '@/types/admin'

function typeLabel(value?: string): string {
  switch (value) {
    case 'tv':
      return 'TV'
    case 'film':
      return 'Film'
    case 'ova':
      return 'OVA'
    case 'ona':
      return 'ONA'
    case 'special':
      return 'Special'
    case 'bonus':
      return 'Bonus'
    default:
      return 'Offen'
  }
}

export function formatJellyfinTypeHintLabel(typeHint: AdminJellyfinIntakeTypeHint): string {
  return `Typ-Vorschlag: ${typeLabel(typeHint.suggested_type)}`
}

export function formatJellyfinTypeHintConfidence(confidence: JellyfinIntakeConfidence): string {
  switch (confidence) {
    case 'high':
      return 'hoch'
    case 'medium':
      return 'mittel'
    default:
      return 'niedrig'
  }
}

export function formatJellyfinTypeHintReasoning(typeHint: AdminJellyfinIntakeTypeHint): string {
  const reasons = typeHint.reasons.filter((reason) => reason.trim().length > 0)
  if (reasons.length === 0) {
    return 'Begruendung: Kein klares Pfad- oder Namenssignal gefunden.'
  }

  return `Begruendung: ${reasons.join(' ')}`
}
