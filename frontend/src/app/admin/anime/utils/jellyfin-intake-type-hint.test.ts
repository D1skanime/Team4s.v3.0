import { describe, expect, it } from 'vitest'

import {
  formatJellyfinTypeHintConfidence,
  formatJellyfinTypeHintLabel,
  formatJellyfinTypeHintReasoning,
} from './jellyfin-intake-type-hint'

describe('jellyfin intake type hint helpers', () => {
  it('renders advisory label, confidence, and path/name reasoning copy', () => {
    const typeHint = {
      confidence: 'high' as const,
      suggested_type: 'ova' as const,
      reasons: ['"Season 00" im Pfad erkannt.', '"OVA" im Ordnernamen erkannt.'],
    }

    expect(formatJellyfinTypeHintLabel(typeHint)).toBe('Typ-Vorschlag: OVA')
    expect(formatJellyfinTypeHintConfidence(typeHint.confidence)).toBe('hoch')
    expect(formatJellyfinTypeHintReasoning(typeHint)).toContain('Begruendung:')
    expect(formatJellyfinTypeHintReasoning(typeHint)).toContain('"Season 00" im Pfad erkannt.')
  })

  it('falls back to explicit open wording when no suggestion is available', () => {
    expect(
      formatJellyfinTypeHintLabel({
        confidence: 'low',
        reasons: [],
      }),
    ).toBe('Typ-Vorschlag: Offen')
  })
})
